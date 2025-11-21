import type { Request, Response } from 'express';
import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseApp } from '../config/firebase.js';
import axios from 'axios';

export class AdminController {
  // Cadastro de administrador (apenas outro admin pode cadastrar)
  static async cadastrar(req: Request, res: Response) {
    try {
      const { nome, email, senha } = req.body;
      if (!nome || !email || !senha) {
        return res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' });
      }

      // Verifica se já existe admin com esse email
      const db = getFirestore(firebaseApp);
      const adminSnap = await db.collection('administradores').where('email', '==', email).get();
      if (!adminSnap.empty) {
        return res.status(409).json({ error: 'Já existe um administrador com esse email.' });
      }

      // Cria usuário no Firebase Auth
      const userRecord = await getAuth(firebaseApp).createUser({
        email,
        password: senha,
        displayName: nome,
      });

      // Salva na coleção administradores
      await db.collection('administradores').doc(userRecord.uid).set({
        uid: userRecord.uid,
        nome,
        email,
        criadoEm: new Date().toISOString(),
      });

      return res.status(201).json({ message: 'Administrador cadastrado com sucesso.', uid: userRecord.uid });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Erro ao cadastrar administrador.' });
    }
  }

  // Cadastro de plano vinculado ao Rapidoc
  static async cadastrarPlano(req: Request, res: Response) {
    try {
      // Extrai campos obrigatórios e todos os demais campos extras
      const {
        tipo, periodicidade, descricao, especialidades, preco, uuidRapidocPlano, paymentType,
        ...rest
      } = req.body;
      if (!tipo || !periodicidade || !descricao || !Array.isArray(especialidades) || !preco || !uuidRapidocPlano || !paymentType) {
        return res.status(400).json({ error: 'Campos obrigatórios: tipo, periodicidade, descricao, especialidades (array), preco, uuidRapidocPlano, paymentType.' });
      }

      // Consulta planos Rapidoc e valida UUID e paymentType
      const { listarRapidocPlanos } = await import('../services/rapidoc.service.js');
      const planosRapidoc = await listarRapidocPlanos();
      // Corrige busca: uuid está em p.plan.uuid
      const planoRemoto = planosRapidoc.find((p: any) => p.plan?.uuid === uuidRapidocPlano);
      if (!planoRemoto) {
        return res.status(404).json({ error: 'Plano Rapidoc não encontrado para o uuidRapidocPlano fornecido.' });
      }
      const remotePaymentType = planoRemoto.paymentType;
      const enviado = String(paymentType).toUpperCase();
      // Regra: se remotePaymentType = 'L', aceita S/A/L; senão, exige igual
      if (remotePaymentType === 'L') {
        if (!['S', 'A', 'L'].includes(enviado)) {
          return res.status(400).json({ error: 'paymentType inválido: permitido S, A ou L quando remotePaymentType=L.' });
        }
      } else if (remotePaymentType && enviado !== remotePaymentType) {
        return res.status(400).json({ error: `paymentType diferente do plano Rapidoc (${remotePaymentType}).` });
      }
      // Se quiser salvar nome/descrição do plano Rapidoc junto, pode usar planoRemoto.plan.name etc.

      const db = getFirestore(firebaseApp);
      // Evita duplicidade pelo uuidRapidocPlano
      const existentesSnap = await db.collection('planos').where('uuidRapidocPlano', '==', uuidRapidocPlano).get();
      if (!existentesSnap.empty) {
        return res.status(409).json({ error: 'Já existe plano local vinculado a este uuidRapidocPlano.' });
      }

      // Salva todos os campos recebidos, inclusive extras, junto com vínculo Rapidoc e data
      const planoData = {
        tipo,
        periodicidade,
        descricao,
        especialidades,
        preco,
        uuidRapidocPlano,
        paymentType: enviado,
        remotePaymentType,
        criadoEm: new Date().toISOString(),
        ...rest
      };
      const planoRef = await db.collection('planos').add(planoData);
      return res.status(201).json({ message: 'Plano cadastrado com sucesso.', id: planoRef.id });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Erro ao cadastrar plano.' });
    }
  }

  // Dashboard administrativo com métricas gerais
  static async dashboard(req: Request, res: Response) {
    try {
      const db = getFirestore(firebaseApp);

      // Totais básicos (Firestore)
      const [usuariosSnap, assinSnap, ativasSnap, canceladasSnap, pendentesSnap, planosSnap] = await Promise.all([
        db.collection('usuarios').get(),
        db.collection('assinaturas').get(),
        db.collection('assinaturas').where('status', '==', 'ATIVA').get(),
        db.collection('assinaturas').where('status', 'in', ['CANCELADA', 'CANCELADO']).get().catch(() => ({ size: 0 } as any)),
        db.collection('assinaturas').where('status', 'in', ['PENDENTE', 'PENDING']).get().catch(() => ({ size: 0 } as any)),
        db.collection('planos').get(),
      ]);

      const totais = {
        usuarios: (usuariosSnap as any).size ?? 0,
        assinaturas: (assinSnap as any).size ?? 0,
        assinaturasAtivas: (ativasSnap as any).size ?? 0,
        assinaturasCanceladas: (canceladasSnap as any).size ?? 0,
        assinaturasPendentes: (pendentesSnap as any).size ?? 0,
      };

      // Número de planos e média de valor dos planos
      let numeroPlanos = (planosSnap as any).size ?? 0;
      let mediaValorPlanos = 0;
      let planosDetalhados: Array<{
        id: string;
        nome: string;
        valor: number;
        assinantes: number;
        valorTotal: number;
      }> = [];
      let novosAssinantes: Array<{
        nome: string;
        plano: string;
        data: string;
        status: string;
      }> = [];
      if (numeroPlanos > 0) {
        let soma = 0;
        let count = 0;
        const planosArr: any[] = [];
        (planosSnap as any).forEach((doc: any) => {
          const data = doc.data();
          planosArr.push({ id: doc.id, ...data });
          const preco = Number(data.preco);
          if (!isNaN(preco)) {
            soma += preco;
            count++;
          }
        });
        if (count > 0) mediaValorPlanos = soma / count;

        // Buscar assinaturas agrupadas por plano
        const assinaturasSnap = await db.collection('assinaturas').get();
        const assinaturasPorPlano: Record<string, number> = {};
        (assinaturasSnap as any).forEach((doc: any) => {
          const data = doc.data();
          const planoId = data.planoId;
          if (planoId) {
            assinaturasPorPlano[planoId] = (assinaturasPorPlano[planoId] || 0) + 1;
          }
        });

        planosDetalhados = planosArr.map((plano) => {
          const valor = Number(plano.preco) || 0;
          const assinantes = assinaturasPorPlano[plano.id] || 0;
          return {
            id: plano.id,
            nome: plano.tipo || plano.descricao || plano.nome || plano.id,
            valor,
            assinantes,
            valorTotal: valor * assinantes,
          };
        });

        // Novos assinantes dos últimos 7 dias (máx 5)
        const usuariosSnap = await db.collection('usuarios').get();
        const usuariosArr: any[] = [];
        (usuariosSnap as any).forEach((doc: any) => {
          const data = doc.data();
          usuariosArr.push({ id: doc.id, ...data });
        });
        const agora = new Date();
        const seteDiasAtras = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
        const assinantesRecentes = usuariosArr
          .filter(u => u.idAssinaturaAtual && u.criadoEm && new Date(u.criadoEm) >= seteDiasAtras)
          .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime())
          .slice(0, 5);
        novosAssinantes = assinantesRecentes.map(u => {
          let nome = u.nome || u.email || 'Desconhecido';
          let email = u.email || '';
          let plano = u.idAssinaturaAtual;
          let status = 'success';
          // Data amigável
          let data = '-';
          if (u.criadoEm) {
            const criado = new Date(u.criadoEm);
            let diff = Math.floor((agora.getTime() - criado.getTime()) / (1000 * 60 * 60 * 24));
            if (diff != 0) diff = diff * -1;
            if (diff === 0) data = 'Hoje';
            else if (diff === 1) data = 'Ontem';
            else data = `Há ${diff} dias`;
          }
          return { nome, email, plano, data, status };
        });
      }

      // Faturamento (Asaas) - melhor esforço, primeira página
      const ASAAS_API_URL = process.env.ASAAS_BASE_URL || 'https://sandbox.asaas.com/api/v3';
      const ASAAS_API_KEY = process.env.ASAAS_API_KEY as string | undefined;
      let faturamento = { mesAtual: 0, ultimos30Dias: 0, pendencias: 0 };
      if (ASAAS_API_KEY) {
        try {
          const paymentsResp = await axios.get(`${ASAAS_API_URL}/payments`, {
            headers: { access_token: ASAAS_API_KEY },
            params: { limit: 100 },
          });
          const payments: any[] = paymentsResp.data?.data || [];
          const hoje = new Date();
          const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
          const trintaDiasAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);

          let mesAtual = 0;
          let ultimos30 = 0;
          let pendencias = 0;
          for (const p of payments) {
            const status = String(p?.status || '').toUpperCase();
            if (status === 'PENDING' || status === 'OVERDUE') pendencias += 1;
            const pago = status === 'RECEIVED';
            const dataPag = p.paymentDate || p.receivedDate || p.dueDate;
            if (!dataPag) continue;
            const data = new Date(dataPag);
            if (pago && data >= inicioMes) mesAtual += Number(p.value || 0);
            if (pago && data >= trintaDiasAtras) ultimos30 += Number(p.value || 0);
          }
          faturamento = { mesAtual, ultimos30Dias: ultimos30, pendencias };
        } catch {}
      }

      return res.status(200).json({
        totais,
        faturamento,
        planos: {
          numeroPlanos,
          mediaValorPlanos,
          detalhados: planosDetalhados
        },
        novosAssinantes
      });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Erro ao montar dashboard administrativo.' });
    }
  }

  // Buscar beneficiários do Rapidoc sem conta de usuário e sem cobrança no Asaas
  static async beneficiariosSemConta(req: Request, res: Response) {
    try {
      const db = getFirestore(firebaseApp);
      const auth = getAuth(firebaseApp);
      const { listarBeneficiariosRapidoc } = await import('../services/rapidoc.service.js');
      const { verificarAssinaturaPorCpf } = await import('../services/asaas.service.js');

      // 1. Buscar todos os beneficiários do Rapidoc
      console.log('[AdminController] Buscando beneficiários do Rapidoc...');
      const beneficiariosRapidoc = await listarBeneficiariosRapidoc();
      console.log(`[AdminController] Encontrados ${beneficiariosRapidoc.length} beneficiários no Rapidoc`);
      
      // Normalizar estrutura (pode vir como array de objetos ou objetos com beneficiary)
      const beneficiariosNormalizados = beneficiariosRapidoc
        .map((b: any) => {
          // Tenta diferentes estruturas possíveis
          const beneficiario = b.beneficiary || b.data || b;
          if (!beneficiario) return null;
          
          return {
            uuid: beneficiario.uuid || beneficiario.id,
            nome: beneficiario.name || beneficiario.nome || 'Nome não informado',
            cpf: beneficiario.cpf || beneficiario.document || null,
            email: beneficiario.email || null,
            isActive: beneficiario.isActive !== false && beneficiario.active !== false && beneficiario.status !== 'INACTIVE',
          };
        })
        .filter((b: any) => b && b.cpf && b.isActive); // Apenas ativos com CPF válido

      // 2. Buscar todos os usuários do Firestore
      const usuariosSnap = await db.collection('usuarios').get();
      const usuariosPorCpf = new Map<string, any>();
      usuariosSnap.forEach((doc: any) => {
        const data = doc.data();
        if (data.cpf) {
          usuariosPorCpf.set(data.cpf, data);
        }
      });

      // 3. Verificar quais beneficiários não têm conta de usuário
      const beneficiariosSemConta: Array<{
        uuid: string;
        nome: string;
        cpf: string;
        email: string;
        temUsuarioFirestore: boolean;
        temUsuarioAuth: boolean;
        temAssinaturaAsaas: boolean;
      }> = [];

      for (const beneficiario of beneficiariosNormalizados) {
        const usuarioFirestore = usuariosPorCpf.get(beneficiario.cpf);
        const temUsuarioFirestore = !!usuarioFirestore;

        // Verificar se tem usuário no Firebase Auth
        let temUsuarioAuth = false;
        try {
          if (beneficiario.email) {
            await auth.getUserByEmail(beneficiario.email);
            temUsuarioAuth = true;
          }
        } catch (error: any) {
          // Usuário não existe no Auth (erro auth/user-not-found é esperado)
          if (error?.code !== 'auth/user-not-found') {
            console.error(`Erro ao verificar usuário Auth para ${beneficiario.email}:`, error);
          }
          temUsuarioAuth = false;
        }

        // Verificar se tem assinatura ativa no Asaas
        let temAssinaturaAsaas = false;
        try {
          const asaasCheck = await verificarAssinaturaPorCpf(beneficiario.cpf);
          temAssinaturaAsaas = asaasCheck.assinaturaOk;
        } catch {
          // Erro ao verificar, considera como não tendo
          temAssinaturaAsaas = false;
        }

        // Incluir apenas os que não têm conta completa (sem usuário no Firestore OU sem usuário no Auth) E não têm assinatura no Asaas
        if ((!temUsuarioFirestore || !temUsuarioAuth) && !temAssinaturaAsaas) {
          beneficiariosSemConta.push({
            uuid: beneficiario.uuid,
            nome: beneficiario.nome || 'Nome não informado',
            cpf: beneficiario.cpf,
            email: beneficiario.email || 'Email não informado',
            temUsuarioFirestore,
            temUsuarioAuth,
            temAssinaturaAsaas,
          });
        }
      }

      return res.status(200).json({
        total: beneficiariosSemConta.length,
        beneficiarios: beneficiariosSemConta,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Erro ao buscar beneficiários sem conta.' });
    }
  }

  // Criar usuário completo para beneficiário do Rapidoc
  static async criarUsuarioCompleto(req: Request, res: Response) {
    try {
      const {
        beneficiarioUuid,
        cpf,
        nome,
        email,
        telefone,
        birthday,
        planoId,
        billingType = 'BOLETO',
        ciclo = 'MONTHLY',
      } = req.body;

      if (!cpf || !nome || !email || !planoId) {
        return res.status(400).json({ error: 'CPF, nome, email e planoId são obrigatórios.' });
      }

      // Buscar dados completos do beneficiário no Rapidoc se necessário
      let dadosCompletos: any = { nome, email, cpf, telefone, birthday };
      if (beneficiarioUuid || cpf) {
        try {
          const { buscarBeneficiarioRapidocPorCpf } = await import('../services/rapidoc.service.js');
          const rapidocData = await buscarBeneficiarioRapidocPorCpf(cpf);
          const beneficiario = rapidocData?.beneficiary || rapidocData;
          if (beneficiario) {
            dadosCompletos = {
              nome: beneficiario.name || nome,
              email: beneficiario.email || email,
              cpf: beneficiario.cpf || cpf,
              telefone: beneficiario.phone || telefone,
              birthday: beneficiario.birthday || birthday,
            };
          }
        } catch (error: any) {
          console.warn('[AdminController] Erro ao buscar dados do Rapidoc (usando dados fornecidos):', error?.message);
          // Continua com os dados fornecidos
        }
      }

      const db = getFirestore(firebaseApp);
      const auth = getAuth(firebaseApp);
      const { criarClienteAsaas, criarAssinaturaAsaas } = await import('../services/asaas.service.js');
      const { buscarBeneficiarioRapidocPorCpf, atualizarBeneficiarioRapidoc } = await import('../services/rapidoc.service.js');
      const axios = (await import('axios')).default;

      // 1. Buscar dados do plano
      const planoDoc = await db.collection('planos').doc(planoId).get();
      if (!planoDoc.exists) {
        return res.status(404).json({ error: 'Plano não encontrado.' });
      }
      const plano = planoDoc.data();
      const valor = Number(plano?.preco);
      if (!valor || isNaN(valor) || valor <= 0) {
        return res.status(400).json({ error: 'Plano sem valor válido.' });
      }

      // 2. Verificar/Criar cliente no Asaas
      let clienteAsaas: any;
      try {
        const clientesResp = await axios.get(`${process.env.ASAAS_BASE_URL || 'https://sandbox.asaas.com/api/v3'}/customers`, {
          params: { cpfCnpj: dadosCompletos.cpf },
          headers: { access_token: process.env.ASAAS_API_KEY },
        });
        const clientes = clientesResp.data?.data || [];
        if (clientes.length > 0) {
          clienteAsaas = clientes[0];
          console.log('[AdminController] Cliente Asaas já existe:', clienteAsaas.id);
        } else {
          clienteAsaas = await criarClienteAsaas({ 
            nome: dadosCompletos.nome, 
            email: dadosCompletos.email, 
            cpf: dadosCompletos.cpf, 
            telefone: dadosCompletos.telefone 
          });
          console.log('[AdminController] Cliente Asaas criado:', clienteAsaas.id);
        }
      } catch (error: any) {
        console.error('[AdminController] Erro ao criar/buscar cliente Asaas:', error);
        return res.status(500).json({ error: 'Erro ao criar cliente no Asaas: ' + (error?.message || 'Erro desconhecido') });
      }

      // 3. Criar assinatura no Asaas
      let assinaturaAsaas: any;
      try {
        const description = `Assinatura ${plano?.tipo || 'Plano'} - ${plano?.descricao || 'Consulta Médicos Online'}`;
        assinaturaAsaas = await criarAssinaturaAsaas({
          customer: clienteAsaas.id,
          value: valor,
          cycle: ciclo,
          billingType,
          description,
        });
        console.log('[AdminController] Assinatura Asaas criada:', assinaturaAsaas.id);
      } catch (error: any) {
        console.error('[AdminController] Erro ao criar assinatura Asaas:', error);
        return res.status(500).json({ error: 'Erro ao criar assinatura no Asaas: ' + (error?.message || 'Erro desconhecido') });
      }

      // 4. Criar/Atualizar usuário no Firestore
      const usuarioRef = db.collection('usuarios').doc(dadosCompletos.cpf);
      const usuarioDoc = await usuarioRef.get();
      const userData: any = {
        cpf: dadosCompletos.cpf,
        nome: dadosCompletos.nome,
        email: dadosCompletos.email,
        tipo: 'subscriber',
        criadoEm: new Date().toISOString(),
      };
      if (dadosCompletos.telefone) userData.telefone = dadosCompletos.telefone;
      if (dadosCompletos.birthday) userData.dataNascimento = dadosCompletos.birthday;
      if (beneficiarioUuid) userData.rapidocBeneficiaryUuid = beneficiarioUuid;

      if (!usuarioDoc.exists) {
        await usuarioRef.set(userData);
        console.log('[AdminController] Usuário Firestore criado');
      } else {
        await usuarioRef.update(userData);
        console.log('[AdminController] Usuário Firestore atualizado');
      }

      // 5. Criar usuário no Firebase Auth (se não existir)
      let usuarioAuthExiste = false;
      try {
        if (email) {
          await auth.getUserByEmail(email);
          usuarioAuthExiste = true;
          console.log('[AdminController] Usuário Auth já existe');
        }
      } catch (error: any) {
        if (error?.code === 'auth/user-not-found') {
          // Criar usuário no Auth
          try {
            const senhaTemporaria = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase() + '1!';
            await auth.createUser({
              uid: dadosCompletos.cpf,
              email: dadosCompletos.email,
              password: senhaTemporaria,
              displayName: dadosCompletos.nome,
            });
            console.log('[AdminController] Usuário Auth criado');
            // Marcar primeiro acesso como false para que o usuário possa fazer primeiro acesso
            await usuarioRef.update({ primeiroAcesso: false });
          } catch (authError: any) {
            console.error('[AdminController] Erro ao criar usuário Auth:', authError);
            // Não bloqueia o processo se falhar
          }
        }
      }

      // 6. Criar assinatura no Firestore
      const assinaturaRef = db.collection('assinaturas').doc(assinaturaAsaas.id);
      const assinaturaData: any = {
        idAssinatura: assinaturaAsaas.id,
        cpfUsuario: dadosCompletos.cpf,
        planoId,
        planoTipo: plano?.tipo,
        planoDescricao: plano?.descricao,
        planoPreco: valor,
        status: 'ATIVA',
        dataInicio: new Date().toISOString().substring(0, 10),
        ciclo,
        formaPagamento: billingType,
        criadoEm: new Date().toISOString(),
      };
      await assinaturaRef.set(assinaturaData, { merge: true });
      console.log('[AdminController] Assinatura Firestore criada');

      // 7. Atualizar beneficiário no Rapidoc (vincular ao plano se necessário)
      try {
        if (beneficiarioUuid && plano?.uuidRapidocPlano) {
          const beneficiarioRapidoc = await buscarBeneficiarioRapidocPorCpf(dadosCompletos.cpf);
          const beneficiario = beneficiarioRapidoc?.beneficiary || beneficiarioRapidoc;
          if (beneficiario) {
            // Verificar se já tem o plano vinculado
            const temPlano = beneficiario.plans?.some((p: any) => p.plan?.uuid === plano.uuidRapidocPlano);
            if (!temPlano) {
              const plans = beneficiario.plans || [];
              plans.push({
                paymentType: plano.paymentType || 'S',
                plan: { uuid: plano.uuidRapidocPlano },
              });
              await atualizarBeneficiarioRapidoc(beneficiarioUuid, {
                plans,
              });
              console.log('[AdminController] Beneficiário Rapidoc atualizado com plano');
            }
          }
        }
      } catch (error: any) {
        console.warn('[AdminController] Erro ao atualizar beneficiário Rapidoc (não bloqueia):', error?.message);
        // Não bloqueia o processo
      }

      return res.status(201).json({
        message: 'Usuário criado com sucesso.',
        usuario: {
          cpf: dadosCompletos.cpf,
          nome: dadosCompletos.nome,
          email: dadosCompletos.email,
        },
        assinatura: {
          id: assinaturaAsaas.id,
          clienteId: clienteAsaas.id,
          valor,
          status: assinaturaAsaas.status,
        },
        plano: {
          id: planoId,
          tipo: plano?.tipo,
          valor,
        },
      });
    } catch (error: any) {
      console.error('[AdminController] Erro ao criar usuário completo:', error);
      return res.status(500).json({ error: error?.message || 'Erro ao criar usuário completo.' });
    }
  }

  // Gerar nova senha para um cliente
  static async gerarNovaSenha(req: Request, res: Response) {
    try {
      const { cpf, email } = req.body;

      if (!cpf && !email) {
        return res.status(400).json({ error: 'CPF ou email é obrigatório.' });
      }

      const db = getFirestore(firebaseApp);
      const auth = getAuth(firebaseApp);

      // Buscar usuário no Firestore
      let usuarioDoc: any = null;
      let usuarioData: any = null;

      if (cpf) {
        usuarioDoc = await db.collection('usuarios').doc(cpf).get();
        if (usuarioDoc.exists) {
          usuarioData = usuarioDoc.data();
        }
      }

      if (!usuarioData && email) {
        const usuariosSnap = await db.collection('usuarios').where('email', '==', email).limit(1).get();
        if (!usuariosSnap.empty) {
          usuarioDoc = usuariosSnap.docs[0];
          usuarioData = usuarioDoc.data();
        }
      }

      if (!usuarioData) {
        return res.status(404).json({ error: 'Usuário não encontrado no sistema.' });
      }

      const usuarioCpf = usuarioData.cpf || usuarioDoc.id;
      const usuarioEmail = usuarioData.email;

      if (!usuarioEmail) {
        return res.status(400).json({ error: 'Usuário não possui email cadastrado.' });
      }

      // Gerar senha temporária
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
      let senhaTemporaria = '';
      for (let i = 0; i < 12; i++) {
        senhaTemporaria += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // Atualizar senha no Firebase Auth
      try {
        // Buscar usuário no Auth pelo email ou UID
        let userRecord;
        try {
          userRecord = await auth.getUserByEmail(usuarioEmail);
        } catch (error: any) {
          if (error?.code === 'auth/user-not-found') {
            // Tentar pelo UID (CPF)
            try {
              userRecord = await auth.getUser(usuarioCpf);
            } catch {
              return res.status(404).json({ error: 'Usuário não encontrado no Firebase Auth.' });
            }
          } else {
            throw error;
          }
        }

        // Atualizar senha
        await auth.updateUser(userRecord.uid, {
          password: senhaTemporaria,
        });

        console.log(`[AdminController] Nova senha gerada para usuário ${usuarioCpf} (${usuarioEmail})`);

        return res.status(200).json({
          message: 'Nova senha gerada com sucesso.',
          usuario: {
            cpf: usuarioCpf,
            nome: usuarioData.nome,
            email: usuarioEmail,
          },
          senhaTemporaria,
          aviso: 'Esta senha deve ser compartilhada com o cliente de forma segura. Recomenda-se que o cliente altere a senha após o primeiro login.',
        });
      } catch (error: any) {
        console.error('[AdminController] Erro ao gerar nova senha:', error);
        return res.status(500).json({ 
          error: 'Erro ao gerar nova senha: ' + (error?.message || 'Erro desconhecido') 
        });
      }
    } catch (error: any) {
      console.error('[AdminController] Erro ao gerar nova senha:', error);
      return res.status(500).json({ error: error?.message || 'Erro ao gerar nova senha.' });
    }
  }
}
