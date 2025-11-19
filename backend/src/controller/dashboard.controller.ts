import type { Request, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseApp } from '../config/firebase.js';
import axios from 'axios';
import { buscarBeneficiarioRapidocPorCpf, listarAgendamentosRapidoc } from '../services/rapidoc.service.js';

export class DashboardController {
  static async getDashboard(req: Request, res: Response) {
    try {
      const uid = req.user?.uid || req.user?.sub;
      if (!uid) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }
      // Busca dados do usuário
      const usuarioRef = getFirestore(firebaseApp).collection('usuarios').doc(uid);
      const usuarioDoc = await usuarioRef.get();
      if (!usuarioDoc.exists) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }
      const usuario = usuarioDoc.data();
      // Busca assinaturas
      const assinaturasSnap = await getFirestore(firebaseApp).collection('assinaturas').where('cpfUsuario', '==', uid).get();
      const assinaturas = assinaturasSnap.docs.map(doc => doc.data());
      // Busca beneficiários
      const beneficiariosSnap = await getFirestore(firebaseApp).collection('beneficiarios').where('holder', '==', uid).get();
      const beneficiarios = beneficiariosSnap.docs.map(doc => doc.data());

      // Rapidoc: beneficiário principal
      let rapidoc: any = null;
      try {
        const r = await buscarBeneficiarioRapidocPorCpf(uid);
        rapidoc = r?.beneficiary || null;
      } catch {}

      // Consultas (Rapidoc)
      let consultas: any[] = [];
      try {
        if (rapidoc?.uuid) {
          consultas = await listarAgendamentosRapidoc({ beneficiary: rapidoc.uuid });
        }
        if ((!consultas || consultas.length === 0) && uid) {
          const alt = await listarAgendamentosRapidoc({ cpf: uid });
          if (Array.isArray(alt)) consultas = alt;
        }
      } catch {}
      const consultasMapeadas = Array.isArray(consultas) ? consultas.map((a: any) => ({
        uuid: a?.uuid || a?.id || null,
        status: a?.status || null,
        date: a?.detail?.date || a?.date || null,
        from: a?.detail?.from || a?.from || null,
        to: a?.detail?.to || a?.to || null,
        specialty: a?.specialty?.name || a?.specialty?.description || a?.specialty?.title || null
      })) : [];

      // Faturas (Asaas)
      const ASAAS_API_URL = process.env.ASAAS_BASE_URL || 'https://sandbox.asaas.com/api/v3';
      const ASAAS_API_KEY = process.env.ASAAS_API_KEY as string | undefined;
      let faturas: any[] = [];
      if (ASAAS_API_KEY) {
        try {
          const clientesResp = await axios.get(`${ASAAS_API_URL}/customers`, {
            params: { cpfCnpj: uid },
            headers: { access_token: ASAAS_API_KEY },
          });
          const clientes = clientesResp.data?.data || [];
          if (clientes.length) {
            const customerId = clientes[0].id;
            const paymentsResp = await axios.get(`${ASAAS_API_URL}/payments`, {
              params: { customer: customerId },
              headers: { access_token: ASAAS_API_KEY },
            });
            const payments: any[] = paymentsResp.data?.data || [];
            faturas = payments.map((p: any) => ({
              id: p.id,
              status: p.status,
              value: p.value,
              dueDate: p.dueDate,
              paymentDate: p.paymentDate || p.receivedDate || null,
              billingType: p.billingType,
              bankSlipUrl: p.bankSlipUrl || null,
              invoiceUrl: p.invoiceUrl || null,
              description: p.description || null,
            }));
          }
        } catch {}
      }

      // Status da assinatura (ativa/inativa)
      let statusAssinatura = 'inativa';
      let assinaturaAtiva = null;
      if (assinaturas && assinaturas.length > 0) {
        assinaturaAtiva = assinaturas.find(a => (a.status === 'ACTIVE' || a.status === 'ATIVA' || a.status === 'ativo' || a.status === 'active')) || assinaturas[0];
        statusAssinatura = assinaturaAtiva?.status || 'inativa';
      }

      // Data da próxima cobrança (menor dueDate de fatura pendente)
      let proximaCobranca = null;
      if (faturas && faturas.length > 0) {
        const pendentes = faturas.filter(f => f.status === 'PENDING');
        if (pendentes.length > 0) {
          proximaCobranca = pendentes.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0].dueDate;
        }
      }

      // Número de dependentes
      const numeroDependentes = beneficiarios?.length || 0;

      return res.status(200).json({
        usuario,
        assinaturas,
        beneficiarios,
        rapidoc,
        consultas: consultasMapeadas,
        faturas,
        statusAssinatura,
        proximaCobranca,
        numeroDependentes
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Erro ao buscar dashboard.' });
    }
  }
}
