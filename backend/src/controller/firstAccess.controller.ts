import { configDotenv } from 'dotenv';
import type { Request, Response } from 'express';
import { firebaseApp } from '../config/firebase.js';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
configDotenv();

export class FirstAccessController {
  static async validateCpf(req: Request, res: Response) {
    const { cpf } = req.body;
    if (!cpf || typeof cpf !== 'string') {
      return res.status(400).json({ error: 'CPF é obrigatório e deve ser uma string.' });
    }

    try {
      // Consultar Asaas por assinatura
      const { verificarAssinaturaPorCpf } = await import('../services/asaas.service.js');
      const resultado = await verificarAssinaturaPorCpf(cpf);
      if (!resultado.assinaturaOk) {
        return res.status(200).json({
          podeCadastrar: true,
          message: 'CPF não validado. Você pode se cadastrar para iniciar sua assinatura.'
        });
      }

      return res.status(200).json({
        message: 'CPF validado com sucesso.',
        usuario: resultado.cliente,
      });
    } catch (error) {
      return res.status(500).json({ error: 'Erro interno ao validar CPF.' });
    }
  }
  static gerarSenhaTemporaria(tamanho = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let senha = '';
    for (let i = 0; i < tamanho; i++) {
      senha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return senha;
  }

  static async primeiroAcesso(req: Request, res: Response) {
    try {
      const { cpf } = req.body;
      if (!cpf) {
        return res.status(400).json({ error: 'CPF é obrigatório.' });
      }

      const db = getFirestore(firebaseApp);
      const usuarioRef = db.collection('usuarios').doc(cpf);
      let usuarioDoc = await usuarioRef.get();
      let usuario = usuarioDoc.exists ? usuarioDoc.data() : null;

      // Se usuário não existe, tentar completar onboarding automaticamente
      if (!usuarioDoc.exists) {
        console.log('[primeiro-acesso] Usuário não encontrado, tentando completar onboarding...');
        try {
          // Verificar se tem assinatura paga e criar usuário automaticamente
          const { verificarAssinaturaPorCpf } = await import('../services/asaas.service.js');
          const { verificarPrimeiroPagamentoAssinatura } = await import('../services/asaas.service.js');
          const axios = (await import('axios')).default;
          const admin = (await import('firebase-admin')).default;

          // 1) Verificar assinatura no Asaas
          const asaas = await verificarAssinaturaPorCpf(cpf);
          if (!asaas.assinaturaOk || !asaas.cliente?.id) {
            return res.status(404).json({ 
              error: 'Nenhuma assinatura ativa encontrada. Verifique se o pagamento foi confirmado.' 
            });
          }

          // 2) Buscar assinaturaId
          const ASAAS_API_URL = process.env.ASAAS_BASE_URL || 'https://sandbox.asaas.com/api/v3';
          const ASAAS_API_KEY = process.env.ASAAS_API_KEY as string;
          const assinaturasResp = await axios.get(`${ASAAS_API_URL}/subscriptions`, {
            params: { customer: asaas.cliente.id },
            headers: { access_token: ASAAS_API_KEY },
          });
          const assinaturas = assinaturasResp.data?.data || [];
          const assinaturaAtiva = assinaturas.filter((a: any) => a.status === 'ACTIVE')
            .sort((a: any, b: any) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime())[0];
          
          if (!assinaturaAtiva) {
            return res.status(404).json({ error: 'Assinatura ativa não encontrada.' });
          }

          // 3) Verificar se pagamento foi confirmado
          const pagamento = await verificarPrimeiroPagamentoAssinatura(assinaturaAtiva.id);
          if (!pagamento.pago) {
            return res.status(402).json({ 
              error: 'Assinatura ainda não está paga. Aguarde a confirmação do pagamento.' 
            });
          }

          // 4) Buscar dados do cliente no Asaas
          const clientesResp = await axios.get(`${ASAAS_API_URL}/customers/${asaas.cliente.id}`, {
            headers: { access_token: ASAAS_API_KEY },
          });
          const cliente = clientesResp.data || {};
          
          const nome = cliente?.name;
          const email = cliente?.email;
          const telefone = cliente?.phone || cliente?.mobilePhone;
          const zipCode = cliente?.postalCode;

          if (!nome || !email) {
            return res.status(400).json({ 
              error: 'Dados incompletos no cadastro. Entre em contato com o suporte.' 
            });
          }

          // 5) Criar usuário no Firestore
          const userData: Record<string, any> = {
            cpf,
            nome,
            email,
            criadoEm: new Date().toISOString(),
          };
          if (telefone) userData.telefone = telefone;
          
          await usuarioRef.set(userData, { merge: true });
          console.log('[primeiro-acesso] Usuário criado automaticamente no Firestore');
          
          // 6) Criar assinatura no Firestore se não existir
          const assinaturaRef = db.collection('assinaturas').doc(assinaturaAtiva.id);
          const assinaturaDoc = await assinaturaRef.get();
          if (!assinaturaDoc.exists) {
            await assinaturaRef.set({
              idAssinatura: assinaturaAtiva.id,
              cpfUsuario: cpf,
              status: 'ATIVA',
              dataInicio: (pagamento.pagamento?.paymentDate || pagamento.pagamento?.receivedDate || new Date().toISOString()).substring(0, 10),
              criadoEm: new Date().toISOString(),
            }, { merge: true });
          }

          // Buscar usuário novamente
          usuarioDoc = await usuarioRef.get();
          usuario = usuarioDoc.exists ? usuarioDoc.data() : null;
          
          if (!usuario) {
            return res.status(500).json({ error: 'Erro ao criar usuário.' });
          }
        } catch (onboardingError: any) {
          console.error('[primeiro-acesso] Erro ao completar onboarding:', onboardingError);
          // Se o erro for que falta pagamento, retornar mensagem específica
          if (onboardingError.message?.includes('não está paga') || onboardingError.response?.status === 402) {
            return res.status(402).json({ 
              error: 'Assinatura ainda não está paga. Aguarde a confirmação do pagamento.' 
            });
          }
          // Se não conseguir completar onboarding, retornar erro genérico
          return res.status(404).json({ 
            error: 'Usuário não encontrado. Verifique se o pagamento foi confirmado e tente novamente em alguns instantes.' 
          });
        }
      }

      if (!usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      if (usuario?.primeiroAcesso) {
        // Usuário já realizou o primeiro acesso
        return res.status(409).json({ error: 'Usuário já realizou o primeiro acesso.' });
      }

      // Gera senha temporária
      const senhaTemporaria = FirstAccessController.gerarSenhaTemporaria();
      // Cria usuário no Firebase Auth
      const email = usuario?.email;
      try {
        // Tentando criar usuário no Firebase Auth
        await getAuth(firebaseApp).createUser({
          uid: cpf,
          email,
          password: senhaTemporaria,
          displayName: usuario?.nome || undefined,
        });
        // Usuário criado no Firebase Auth com sucesso
      } catch (error: any) {
        // Erro ao criar usuário no Firebase Auth
        if (error.code === 'auth/email-already-exists' || error.code === 'auth/uid-already-exists') {
          return res.status(409).json({ error: 'Usuário já existe no sistema de autenticação.' });
        }
        throw error;
      }
      // Marca primeiro acesso no banco
      await usuarioRef.update({ primeiroAcesso: true });
      // Primeiro acesso marcado no Firestore
      return res.status(201).json({
        message: 'Primeiro acesso realizado com sucesso.',
        cpf,
        email,
        senhaTemporaria
      });
    } catch (error: any) {
      // Erro geral
      console.error('[primeiro-acesso] Erro:', error);
      return res.status(500).json({ error: error.message || 'Erro no primeiro acesso.' });
    }
  }
}
