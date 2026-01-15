import type { Request, Response } from 'express';
import admin from 'firebase-admin';
import { inativarBeneficiarioRapidoc, reativarBeneficiarioRapidoc } from '../services/rapidoc.service.js';

export class WebhookController {
  
  static async handleAsaasWebhook(req: Request, res: Response) {
    try {
      const { event, payment } = req.body;
      const asaasToken = req.headers['asaas-access-token'];

      // Validação de segurança simples se você configurou um token no Asaas
      if (process.env.ASAAS_WEBHOOK_TOKEN && asaasToken !== process.env.ASAAS_WEBHOOK_TOKEN) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      console.log(`[Webhook Asaas] Evento recebido: ${event} | Cliente: ${payment?.customer}`);

      if (!payment || !payment.customer) {
        return res.status(200).json({ message: 'Ignorado: sem dados de pagamento/cliente' });
      }

      const db = admin.firestore();
      
      // 1. Encontrar o usuário dono desse Customer ID do Asaas
      const usersRef = db.collection('usuarios');
      const snapshot = await usersRef.where('asaasId', '==', payment.customer).limit(1).get();

      if (snapshot.empty) {
        console.warn(`[Webhook] Usuário não encontrado para o CustomerID: ${payment.customer}`);
        return res.status(200).json({ message: 'Cliente não encontrado no sistema' });
      }

      const userDoc = snapshot.docs[0]!;
      const userData = userDoc.data();
      const userCpf = userData.cpf;

      // Ações baseadas no tipo de evento
      switch (event) {
        case 'PAYMENT_OVERDUE': // Venceu e não pagou
        case 'SUBSCRIPTION_SUSPENDED': // Assinatura suspensa
          console.log(`[Webhook] Bloqueando usuário ${userCpf} por inadimplência...`);
          await WebhookController.bloquearAcesso(userDoc.ref, userCpf, 'suspenso');
          break;

        case 'PAYMENT_CONFIRMED': // Pagou
        case 'PAYMENT_RECEIVED':
          console.log(`[Webhook] Liberando usuário ${userCpf} (Pagamento Confirmado)...`);
          await WebhookController.liberarAcesso(userDoc.ref, userCpf);
          break;
          
        case 'PAYMENT_REFUNDED': // Estornado
          console.log(`[Webhook] Bloqueando usuário ${userCpf} (Estorno)...`);
          await WebhookController.bloquearAcesso(userDoc.ref, userCpf, 'cancelado');
          break;

        default:
          console.log(`[Webhook] Evento ${event} ignorado.`);
      }

      return res.status(200).json({ received: true });

    } catch (error: any) {
      console.error('[Webhook Error]', error);
      // Retornar 500 faz o Asaas tentar enviar de novo. 
      // Se for erro de lógica nossa, melhor retornar 200 para não travar a fila do Asaas.
      return res.status(200).json({ error: error.message }); 
    }
  }

  // --- Métodos Auxiliares ---

  private static async bloquearAcesso(userRef: FirebaseFirestore.DocumentReference, cpfTitular: string, status: string) {
    const db = admin.firestore();
    
    // 1. Atualiza status no banco local (Usuário e Assinatura)
    await userRef.update({ statusAssinatura: status });
    
    // Atualiza coleção de assinaturas também, se existir
    const subSnap = await db.collection('assinaturas').where('cpf', '==', cpfTitular).get();
    subSnap.forEach(doc => doc.ref.update({ status: status }));

    // 2. Inativar na Rapidoc (Titular + Dependentes)
    // Busca todos os beneficiários vinculados a este titular (inclusive ele mesmo se estiver salvo lá)
    const beneficiariosSnap = await db.collection('beneficiarios').where('holder', '==', cpfTitular).get();
    
    const promises = beneficiariosSnap.docs.map(async (doc) => {
        const data = doc.data();
        if (data.rapidocUuid) {
            try {
                console.log(`[Webhook] Inativando Rapidoc UUID: ${data.rapidocUuid}`);
                // Chama a função existente do seu service
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

    // 1. Atualiza status no banco local
    await userRef.update({ statusAssinatura: 'ativo' });
    
    const subSnap = await db.collection('assinaturas').where('cpf', '==', cpfTitular).get();
    subSnap.forEach(doc => doc.ref.update({ status: 'ativo' }));

    // 2. Reativar na Rapidoc (opcional, se a regra for automática)
    
    const beneficiariosSnap = await db.collection('beneficiarios').where('holder', '==', cpfTitular).get();
    const promises = beneficiariosSnap.docs.map(async (doc) => {
        const data = doc.data();
        if (data.rapidocUuid) {
            reativarBeneficiarioRapidoc(data.rapidocUuid); 
        }
    });
    await Promise.all(promises);
  }
}