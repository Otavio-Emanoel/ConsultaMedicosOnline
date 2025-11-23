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

      const db = getFirestore(firebaseApp);
      
      // OTIMIZAÇÃO 1: Paralelizar todas as chamadas do Firestore que são independentes
      // Isso reduz o tempo total de ~300ms para ~100ms (tempo da chamada mais lenta)
      const [usuarioDoc, assinaturasSnap, beneficiariosSnap] = await Promise.all([
        db.collection('usuarios').doc(uid).get(),
        db.collection('assinaturas').where('cpfUsuario', '==', uid).get(),
        db.collection('beneficiarios').where('holder', '==', uid).get()
      ]);

      if (!usuarioDoc.exists) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }
      
      const usuario = usuarioDoc.data();
      const assinaturas = assinaturasSnap.docs.map(doc => doc.data());
      const beneficiarios = beneficiariosSnap.docs.map(doc => doc.data());
      const numeroDependentes = beneficiarios?.length || 0;
      const idAssinaturaAtual = usuario?.idAssinaturaAtual || usuario?.idAssinatura;

      // OTIMIZAÇÃO 2: Paralelizar chamadas externas (Rapidoc e ASAAS) que são independentes
      // Antes: buscava Rapidoc, depois agendamentos (sequencial)
      // Agora: busca beneficiário e já tenta buscar agendamentos em paralelo
      
      const rapidocPromise = buscarBeneficiarioRapidocPorCpf(uid).catch(() => null);
      
      // Preparar chamada ASAAS em paralelo (se tiver chave configurada)
      const ASAAS_API_URL = process.env.ASAAS_BASE_URL || 'https://sandbox.asaas.com/api/v3';
      const ASAAS_API_KEY = process.env.ASAAS_API_KEY as string | undefined;
      
      let asaasPromise: Promise<any[]> = Promise.resolve([]);
      if (ASAAS_API_KEY) {
        asaasPromise = (async () => {
          try {
            const clientesResp = await axios.get(`${ASAAS_API_URL}/customers`, {
              params: { cpfCnpj: uid },
              headers: { access_token: ASAAS_API_KEY },
              timeout: 60000, // Timeout de 60s para não travar
            });
            const clientes = clientesResp.data?.data || [];
            if (clientes.length) {
              const customerId = clientes[0].id;
              const paymentsResp = await axios.get(`${ASAAS_API_URL}/payments`, {
                params: { customer: customerId },
                headers: { access_token: ASAAS_API_KEY },
                timeout: 60000,
              });
              const payments: any[] = paymentsResp.data?.data || [];
              return payments.map((p: any) => ({
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
          return [];
        })();
      }

      // Aguardar beneficiário do Rapidoc
      const rapidocResp = await rapidocPromise;
      const rapidoc = rapidocResp?.beneficiary || null;

      // OTIMIZAÇÃO 3: Buscar agendamentos apenas uma vez (evitar chamada duplicada)
      // Se tem UUID, usa UUID; caso contrário, tenta por CPF
      let consultasPromise: Promise<any[]> = Promise.resolve([]);
      if (rapidoc?.uuid) {
        consultasPromise = listarAgendamentosRapidoc({ beneficiary: rapidoc.uuid }).catch(() => []);
      } else if (uid) {
        // Fallback apenas se não tiver UUID
        consultasPromise = listarAgendamentosRapidoc({ cpf: uid }).catch(() => []);
      }

      // OTIMIZAÇÃO 4: Paralelizar consultas e faturas (que são independentes)
      const [consultas, faturas] = await Promise.all([
        consultasPromise,
        asaasPromise
      ]);

      const consultasMapeadas = Array.isArray(consultas) ? consultas.map((a: any) => ({
        uuid: a?.uuid || a?.id || null,
        status: a?.status || null,
        date: a?.detail?.date || a?.date || null,
        from: a?.detail?.from || a?.from || null,
        to: a?.detail?.to || a?.to || null,
        specialty: a?.specialty?.name || a?.specialty?.description || a?.specialty?.title || null
      })) : [];

      // Status da assinatura (pode ser otimizado no futuro para chamada interna direta)
      let statusAssinatura = 'inativa';
      if (idAssinaturaAtual) {
        try {
          const baseUrl = process.env.BASE_URL;
          const resp = await axios.get(`${baseUrl}/subscription/check-payment/${idAssinaturaAtual}`, {
            timeout: 60000, // Timeout para não travar
          });
          if (resp.data && resp.data.pago === true) {
            statusAssinatura = 'ativa';
          }
        } catch {
          statusAssinatura = 'inativa';
        }
      }

      // Data da próxima cobrança (menor dueDate de fatura pendente)
      let proximaCobranca = null;
      if (faturas && faturas.length > 0) {
        const pendentes = faturas.filter(f => f.status === 'PENDING');
        if (pendentes.length > 0) {
          proximaCobranca = pendentes.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0].dueDate;
        }
      }

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
