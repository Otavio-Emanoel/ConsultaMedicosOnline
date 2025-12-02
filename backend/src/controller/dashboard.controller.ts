import type { Request, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseApp } from '../config/firebase.js';
import axios from 'axios';
import { buscarBeneficiarioRapidocPorCpf, listarAgendamentosBeneficiarioRapidoc } from '../services/rapidoc.service.js';

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
      const ASAAS_API_URL = process.env.ASAAS_BASE_URL;
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

      // OTIMIZAÇÃO 3: Removida busca de agendamentos do dashboard
      // Agendamentos agora são carregados separadamente no frontend via /agendamentos
      // Isso evita que o dashboard trave esperando a API do Rapidoc (que pode demorar 50+ segundos)

      // OTIMIZAÇÃO 4: Buscar apenas faturas (consultas removidas)
      const faturas = await asaasPromise;

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
        consultas: [], // Removido: consultas agora são carregadas separadamente via /agendamentos
        faturas,
        statusAssinatura,
        proximaCobranca,
        numeroDependentes
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Erro ao buscar dashboard.' });
    }
  }

  // GET /api/dashboard/agendamentos - próximas consultas do usuário logado
  static async getProximosAgendamentos(req: Request, res: Response) {
    try {
      const uid = (req.user?.uid || req.user?.sub) as string | undefined;
      const cpfFromToken = (req.user as any)?.cpf as string | undefined;
      const email = (req.user as any)?.email as string | undefined;

      if (!uid && !cpfFromToken) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }

      const db = getFirestore(firebaseApp);

      // Descobrir CPF com fallbacks
      let cpf: string | undefined;
      let usuario: any = null;

      if (uid) {
        try {
          const docByUid = await db.collection('usuarios').doc(uid).get();
          if (docByUid.exists) {
            usuario = docByUid.data();
            cpf = (usuario?.cpf as string) || ( /^\d{11}$/.test(uid) ? uid : undefined );
          }
        } catch {}
      }

      if (!cpf && cpfFromToken) cpf = cpfFromToken;
      if (!cpf && uid && /^\d{11}$/.test(uid)) cpf = uid;

      if (!cpf && email) {
        try {
          const snap = await db.collection('usuarios').where('email', '==', email).limit(1).get();
          if (!snap.empty) {
            const first = snap.docs[0]!;
            usuario = first.data();
            const firstId = first.id as string;
            cpf = (usuario?.cpf as string) || ( /^\d{11}$/.test(firstId) ? firstId : undefined );
          }
        } catch {}
      }

      if (!cpf) {
        return res.status(404).json({ error: 'Não foi possível identificar o CPF do usuário.' });
      }

      // Buscar beneficiário no Rapidoc
      const rapidocResp = await buscarBeneficiarioRapidocPorCpf(cpf).catch(() => null);
      const beneficiario = rapidocResp?.beneficiary;
      if (!beneficiario || !beneficiario.uuid) {
        return res.status(404).json({ error: 'Beneficiário não encontrado no Rapidoc para o CPF informado.' });
      }

      // Buscar agendamentos do beneficiário
      const appts = await listarAgendamentosBeneficiarioRapidoc(beneficiario.uuid).catch(() => []);

      // Utilitários para parse de data/hora
      const parseDateTime = (d?: string, t?: string) => {
        if (!d) return null;
        const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (!m) return null;
        const day = parseInt(m[1]!, 10);
        const mon = parseInt(m[2]!, 10) - 1;
        const yr = parseInt(m[3]!, 10);
        let hh = 0, mm = 0;
        const mt = t ? t.match(/^(\d{2}):(\d{2})$/) : null;
        if (mt) {
          hh = parseInt(mt[1]!, 10);
          mm = parseInt(mt[2]!, 10);
        }
        return new Date(yr, mon, day, hh, mm, 0, 0);
      };

      const now = new Date();
      const mapped = (Array.isArray(appts) ? appts : []).map((a: any) => ({
        uuid: a?.uuid || a?.id || null,
        status: a?.status || null,
        date: a?.detail?.date || a?.date || null,
        from: a?.detail?.from || a?.from || null,
        to: a?.detail?.to || a?.to || null,
        specialty: a?.specialty?.name || a?.specialty?.description || a?.specialty?.title || null,
        specialtyUuid: a?.specialty?.uuid || null,
        specialtyObject: a?.specialty || null,
      }));

      const futuros = mapped.filter((m: any) => {
        const dt = parseDateTime(m.date, m.from);
        if (!dt) return false;
        const st = String(m.status || '').toUpperCase();
        if (['CANCELED', 'CANCELLED'].includes(st)) return false;
        return dt.getTime() >= now.getTime();
      });

      const limit = Math.max(1, Math.min(20, Number(req.query.limit) || 5));
      const proximos = futuros
        .sort((a: any, b: any) => {
          const da = parseDateTime(a.date, a.from)?.getTime() || 0;
          const dbt = parseDateTime(b.date, b.from)?.getTime() || 0;
          return da - dbt;
        })
        .slice(0, limit);

      return res.status(200).json({
        beneficiaryUuid: beneficiario.uuid,
        count: proximos.length,
        appointments: proximos,
      });
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        return res.status(401).json({ error: 'Autorização inválida no Rapidoc.' });
      }
      return res.status(500).json({ error: error?.message || 'Erro ao buscar próximos agendamentos.' });
    }
  }
}
