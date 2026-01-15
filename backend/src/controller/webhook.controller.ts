import type { Request, Response } from 'express';
import admin from 'firebase-admin';
import axios from 'axios'; // <--- Importante adicionar axios
import { inativarBeneficiarioRapidoc } from '../services/rapidoc.service.js';

export class WebhookController {
  
  static async handleAsaasWebhook(req: Request, res: Response) {
    try {
      const { event, payment } = req.body;
      const db = admin.firestore();

      console.log(`[Webhook Asaas] Evento: ${event} | Cliente: ${payment?.customer}`);

      if (!payment || !payment.customer) {
        return res.status(200).json({ message: 'Ignorado: sem dados de pagamento.' });
      }

      // 1. Tenta buscar usuário pelo asaasId (Método Rápido)
      const usersRef = db.collection('usuarios');
      let snapshot = await usersRef.where('asaasId', '==', payment.customer).limit(1).get();
      let userDoc: FirebaseFirestore.QueryDocumentSnapshot | null = snapshot.docs[0] ?? null;

      // 2. ESTRATÉGIA DE RECUPERAÇÃO (FALLBACK)
      // Se não achou pelo ID, vamos perguntar ao Asaas quem é esse cliente (pelo CPF)
      if (!userDoc) {
          console.warn(`[Webhook] asaasId não encontrado localmente. Consultando API do Asaas para recuperar CPF...`);
          
          try {
              const asaasUrl = process.env.ASAAS_BASE_URL; // Ajuste se for prod
              const asaasToken = process.env.ASAAS_API_KEY || process.env.ASAAS_ACCESS_TOKEN; // Ajuste conforme seu .env

              // Busca dados do cliente no Asaas
              const clienteResp = await axios.get(`${asaasUrl}/customers/${payment.customer}`, {
                  headers: { access_token: asaasToken }
              });

              const cpfNoAsaas = clienteResp.data.cpfCnpj; // Pega o CPF
              
              if (cpfNoAsaas) {
                  console.log(`[Webhook] CPF recuperado do Asaas: ${cpfNoAsaas}. Buscando no banco local...`);
                  // Remove formatação do CPF para garantir match
                  const cpfLimpo = cpfNoAsaas.replace(/\D/g, '');
                  
                  // Busca por CPF
                  const snapshotCpf = await usersRef.where('cpf', '==', cpfLimpo).limit(1).get();
                  
                  if (!snapshotCpf.empty) {
                      userDoc = snapshotCpf.docs[0] ?? null;
                      // AUTO-CORREÇÃO: Salva o asaasId agora para não precisar buscar na API na próxima
                      if (userDoc) {
                          console.log(`[Webhook] Usuário encontrado! Vinculando asaasId ${payment.customer} ao CPF ${cpfLimpo}...`);
                          await userDoc.ref.update({ asaasId: payment.customer });
                      }
                  }
              }
          } catch (err: any) {
              console.error('[Webhook] Falha ao consultar API do Asaas:', err.message);
          }
      }

      if (!userDoc) {
        console.error(`[Webhook] ERRO CRÍTICO: Cliente ${payment.customer} não encontrado em lugar nenhum.`);
        return res.status(200).json({ message: 'Cliente não localizado no sistema.' });
      }

      // Se chegou aqui, achamos o usuário!
      const userData = userDoc.data();
      const userCpf = userData.cpf;

      console.log(`[Webhook] Processando para o usuário: ${userData.nome} (${userCpf})`);

      // Ações baseadas no tipo de evento
      switch (event) {
        case 'PAYMENT_OVERDUE': 
        case 'SUBSCRIPTION_SUSPENDED':
          console.log(`[Webhook] 🔴 Bloqueando usuário ${userCpf} por inadimplência...`);
          await WebhookController.bloquearAcesso(userDoc.ref, userCpf, 'overdue');
          break;

        case 'PAYMENT_CONFIRMED': 
        case 'PAYMENT_RECEIVED':
          console.log(`[Webhook] 🟢 Liberando usuário ${userCpf} (Pagamento Confirmado)...`);
          await WebhookController.liberarAcesso(userDoc.ref, userCpf);
          break;
          
        case 'PAYMENT_REFUNDED': 
          console.log(`[Webhook] 🔴 Bloqueando usuário ${userCpf} (Estorno)...`);
          await WebhookController.bloquearAcesso(userDoc.ref, userCpf, 'cancelado');
          break;
      }

      return res.status(200).json({ received: true });

    } catch (error: any) {
      console.error('[Webhook Error]', error);
      return res.status(200).json({ error: error.message }); 
    }
  }

  // --- Métodos Auxiliares (Mantidos Iguais) ---

  private static async bloquearAcesso(userRef: FirebaseFirestore.DocumentReference, cpfTitular: string, status: string) {
    const db = admin.firestore();
    
    // Atualiza Usuário
    await userRef.update({ statusAssinatura: status });
    
    // Atualiza Assinaturas
    const subSnap = await db.collection('assinaturas').where('cpf', '==', cpfTitular).get();
    subSnap.forEach(doc => doc.ref.update({ status: status }));

    // Inativa na Rapidoc
    const beneficiariosSnap = await db.collection('beneficiarios').where('holder', '==', cpfTitular).get();
    
    const promises = beneficiariosSnap.docs.map(async (doc) => {
        const data = doc.data();
        if (data.rapidocUuid) {
            try {
                console.log(`[Webhook] Inativando na Rapidoc UUID: ${data.rapidocUuid}`);
                await inativarBeneficiarioRapidoc(data.rapidocUuid);
            } catch (err) {
                console.error(`Erro ao inativar ${data.nome}:`, err);
            }
        }
    });

    await Promise.all(promises);
  }

  private static async liberarAcesso(userRef: FirebaseFirestore.DocumentReference, cpfTitular: string) {
    const db = admin.firestore();

    await userRef.update({ statusAssinatura: 'ativo' });
    
    const subSnap = await db.collection('assinaturas').where('cpf', '==', cpfTitular).get();
    subSnap.forEach(doc => doc.ref.update({ status: 'ativo' }));
    
    // Lógica de reativação na Rapidoc (se necessário)
    console.log('[Webhook] Acesso liberado no banco de dados.');
  }
}