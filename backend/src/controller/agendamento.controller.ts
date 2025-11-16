import type { Request, Response } from 'express';
import { buscarBeneficiarioRapidocPorCpf, agendarConsultaRapidoc, lerAgendamentoRapidoc, cancelarAgendamentoRapidoc, listarRapidocEspecialidades, obterDetalhesPlanoRapidoc, atualizarBeneficiarioRapidoc, atualizarPlanoRapidoc, listarAgendamentosRapidoc } from '../services/rapidoc.service.js';
import { firebaseApp } from '../config/firebase.js';
import { getFirestore } from 'firebase-admin/firestore';

export class AgendamentoController {
  static async criar(req: Request, res: Response) {
    try {
      const { cpf, date, from, to, specialtyUuid, notes, durationMinutes } = req.body || {};
            // Validar specialtyUuid contra lista disponível
            let especialidades: any[] = [];
            try {
              especialidades = await listarRapidocEspecialidades();
            } catch {}
            if (especialidades.length) {
              const exists = especialidades.some((s: any) => s?.uuid === specialtyUuid || s?.id === specialtyUuid);
              if (!exists) {
                return res.status(422).json({
                  error: 'Especialidade não disponível para o cliente.',
                  specialtyUuid,
                  availableSpecialties: especialidades.map((s: any) => ({ uuid: s.uuid, name: s.name }))
                });
              }
            }
      if (!cpf || !date || (!from && !to && !req.body.time)) {
        return res.status(400).json({ error: 'Campos obrigatórios: cpf, date (yyyy-MM-dd), from(HH:mm) e to(HH:mm) ou time + durationMinutes.' });
      }

      // Derivar from/to se vier time + durationMinutes
      let finalFrom = from;
      let finalTo = to;
      if (!finalFrom && req.body.time) finalFrom = req.body.time;
      if (!finalTo && finalFrom && durationMinutes && Number(durationMinutes) > 0) {
        const [h, m] = finalFrom.split(':');
        const startDate = new Date(0, 0, 0, Number(h), Number(m));
        const endDate = new Date(startDate.getTime() + Number(durationMinutes) * 60000);
        const eh = String(endDate.getHours()).padStart(2, '0');
        const em = String(endDate.getMinutes()).padStart(2, '0');
        finalTo = `${eh}:${em}`;
      }
      if (!finalFrom || !finalTo) {
        return res.status(400).json({ error: 'Informe from e to ou time + durationMinutes.' });
      }

      // Converter data para dd/MM/yyyy
      let dateFormatted = date;
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [Y, M, D] = date.split('-');
        dateFormatted = `${D}/${M}/${Y}`;
      }

      const beneficiarioResp = await buscarBeneficiarioRapidocPorCpf(cpf);
      const beneficiario = beneficiarioResp?.beneficiary;
      if (!beneficiario || !beneficiario.uuid) {
        return res.status(404).json({ error: 'Beneficiário não encontrado no Rapidoc para o CPF informado.' });
      }

      // Verificar especialidades do beneficiário (arrays possíveis)
      const benefSpecialtiesRaw: any[] = Array.isArray(beneficiario.specialties) ? beneficiario.specialties : [];
      const availableSpecialtiesRaw: any[] = Array.isArray(beneficiario.availableSpecialties) ? beneficiario.availableSpecialties : [];
      let planSpecialtiesRaw: any[] = [];
      if (Array.isArray(beneficiario.plans) && beneficiario.plans.length) {
        for (const p of beneficiario.plans) {
          if (Array.isArray(p?.specialties) && p.specialties.length) {
            planSpecialtiesRaw.push(...p.specialties);
          } else if (p?.uuid) {
            try {
              const detalhesPlano = await obterDetalhesPlanoRapidoc(p.uuid);
              if (Array.isArray(detalhesPlano?.specialties)) {
                planSpecialtiesRaw.push(...detalhesPlano.specialties);
              }
            } catch {}
          }
        }
      }
      const allBenefSpecialties = [...benefSpecialtiesRaw, ...availableSpecialtiesRaw, ...planSpecialtiesRaw];
      const normalizedBenefSpecialties = allBenefSpecialties.map(s => ({
        uuid: s?.uuid || s?.id,
        name: s?.name || s?.description || s?.title
      })).filter(s => s.uuid);
      if (normalizedBenefSpecialties.length) {
        if (!specialtyUuid) {
          return res.status(400).json({
            error: 'specialtyUuid é obrigatório para beneficiário que possui especialidades associadas.',
            beneficiaryUuid: beneficiario.uuid,
            availableBeneficiarySpecialties: normalizedBenefSpecialties
          });
        }
        const hasSpecialty = normalizedBenefSpecialties.some(s => s.uuid === specialtyUuid);
        if (!hasSpecialty) {
          return res.status(422).json({
            error: 'Especialidade não associada ao beneficiário/plano.',
            specialtyUuid,
            beneficiaryUuid: beneficiario.uuid,
            availableBeneficiarySpecialties: normalizedBenefSpecialties
          });
        }
      }
      // Fallback desativado: não associamos especialidade automaticamente via código
      const semEspecialidadesAssociadas = normalizedBenefSpecialties.length === 0;
      if (semEspecialidadesAssociadas) {
        if (!specialtyUuid) {
          let globais: any[] = [];
          try { globais = await listarRapidocEspecialidades(); } catch {}
          const suggestions = (globais || [])
            .map((s: any) => ({ uuid: s?.uuid || s?.id, name: (s?.name || s?.description || s?.title || '').toString() }))
            .filter((s: any) => s.uuid);
          return res.status(422).json({
            error: 'Beneficiário não possui especialidades associadas e o fallback de generalista está desativado. Informe specialtyUuid ou associe via Rapidoc.',
            beneficiaryUuid: beneficiario.uuid,
            suggestions
          });
        }
        // Se specialtyUuid foi informado, seguimos adiante e deixamos a API validar.
      }

      const bodyRapidoc: Record<string, any> = {
        beneficiary: { uuid: beneficiario.uuid, cpf },
        specialty: { uuid: specialtyUuid },
        detail: { date: dateFormatted, from: finalFrom, to: finalTo }
      };
      // Incluir plano se houver
      if (Array.isArray(beneficiario.plans) && beneficiario.plans.length && beneficiario.plans[0]?.uuid) {
        bodyRapidoc.plan = { uuid: beneficiario.plans[0].uuid };
      }
      // Incluir paymentType / serviceType se presentes
      if (beneficiario.paymentType) bodyRapidoc.paymentType = beneficiario.paymentType;
      if (beneficiario.serviceType) bodyRapidoc.serviceType = beneficiario.serviceType;
      if (notes) bodyRapidoc.notes = notes;

      try {
        const resp = await agendarConsultaRapidoc(bodyRapidoc);
        if (!resp || resp.success === false) {
          return res.status(400).json({ error: resp?.message || 'Falha ao agendar no Rapidoc.', detail: resp });
        }
        return res.status(201).json(resp);
      } catch (e: any) {
        return res.status(400).json({
          error: 'Erro ao agendar no Rapidoc.',
          status: e?.response?.status,
          detail: e?.response?.data,
          sent: bodyRapidoc,
          beneficiarioDebug: beneficiarioResp
        });
      }
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Erro ao agendar consulta.' });
    }
  }

  static async ler(req: Request, res: Response) {
    try {
      const { uuid } = req.params;
      if (!uuid) return res.status(400).json({ error: 'uuid é obrigatório.' });
      const data = await lerAgendamentoRapidoc(uuid);
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Erro ao ler agendamento.' });
    }
  }

  static async cancelar(req: Request, res: Response) {
    try {
      const { uuid } = req.params;
      if (!uuid) return res.status(400).json({ error: 'uuid é obrigatório.' });
      const resp = await cancelarAgendamentoRapidoc(uuid);
      if (resp.status === 204) return res.status(204).send();
      return res.status(200).json({ cancelled: true, status: resp.status });
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 404) return res.status(404).json({ error: 'Agendamento não encontrado.' });
      return res.status(500).json({ error: error?.message || 'Erro ao cancelar agendamento.' });
    }
  }

  // POST /api/agendamentos/imediato - cria solicitação de consulta imediata (fila/triagem)
  static async solicitarImediato(req: Request, res: Response) {
    try {
      const db = getFirestore(firebaseApp);
      const { cpf: cpfBody, specialtyUuid, notes } = req.body || {};
      const cpf = (req.user && (req.user as any).cpf) || cpfBody;
      if (!cpf) return res.status(400).json({ error: 'Informe o CPF no token ou no corpo da requisição.' });

      // Verifica beneficiário no Rapidoc
      const beneficiarioResp = await buscarBeneficiarioRapidocPorCpf(cpf);
      const beneficiario = beneficiarioResp?.beneficiary;
      if (!beneficiario || !beneficiario.uuid) {
        return res.status(404).json({ error: 'Beneficiário não encontrado no Rapidoc para o CPF informado.' });
      }

      // Coleta especialidades disponíveis do beneficiário/plano
      const benefSpecialtiesRaw: any[] = Array.isArray(beneficiario.specialties) ? beneficiario.specialties : [];
      const availableSpecialtiesRaw: any[] = Array.isArray(beneficiario.availableSpecialties) ? beneficiario.availableSpecialties : [];
      let planSpecialtiesRaw: any[] = [];
      if (Array.isArray(beneficiario.plans) && beneficiario.plans.length) {
        for (const p of beneficiario.plans) {
          if (Array.isArray(p?.specialties) && p.specialties.length) {
            planSpecialtiesRaw.push(...p.specialties);
          } else if (p?.uuid) {
            try {
              const detalhesPlano = await obterDetalhesPlanoRapidoc(p.uuid);
              if (Array.isArray(detalhesPlano?.specialties)) planSpecialtiesRaw.push(...detalhesPlano.specialties);
            } catch {}
          }
        }
      }
      const normalizedBenefSpecialties = [...benefSpecialtiesRaw, ...availableSpecialtiesRaw, ...planSpecialtiesRaw]
        .map(s => ({ uuid: s?.uuid || s?.id, name: s?.name || s?.description || s?.title }))
        .filter(s => s.uuid);

      if (!specialtyUuid && normalizedBenefSpecialties.length) {
        return res.status(400).json({
          error: 'Informe specialtyUuid para a consulta imediata.',
          availableBeneficiarySpecialties: normalizedBenefSpecialties
        });
      }
      if (!specialtyUuid && normalizedBenefSpecialties.length === 0) {
        // Sem especialidades associadas: manter consistência com regra geral (sem auto-associação)
        let globais: any[] = [];
        try { globais = await listarRapidocEspecialidades(); } catch {}
        const suggestions = (globais || [])
          .map((s: any) => ({ uuid: s?.uuid || s?.id, name: (s?.name || s?.description || s?.title || '').toString() }))
          .filter((s: any) => s.uuid);
        return res.status(422).json({
          error: 'Beneficiário não possui especialidades associadas. Informe specialtyUuid para solicitar consulta imediata.',
          suggestions
        });
      }

      // Cria solicitação em fila
      const ref = db.collection('immediate_requests').doc();
      const payload: any = {
        id: ref.id,
        cpf,
        beneficiaryUuid: beneficiario.uuid,
        specialtyUuid: specialtyUuid || null,
        notes: notes || null,
        status: 'pending', // pending | scheduled | canceled | failed
        attemptCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Tenta agendar automaticamente se habilitado e specialtyUuid informado
      const auto = (process.env.RAPIDOC_IMMEDIATE_AUTO || '').toLowerCase() === 'true';
      if (auto && specialtyUuid) {
        try {
          // Monta janela de agora até +30 minutos
          const now = new Date();
          const end = new Date(now.getTime() + 30 * 60000);
          const dd = String(now.getDate()).padStart(2, '0');
          const mm = String(now.getMonth() + 1).padStart(2, '0');
          const yyyy = now.getFullYear();
          const dateFormatted = `${dd}/${mm}/${yyyy}`;
          const from = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          const to = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;

          const bodyRapidoc: Record<string, any> = {
            beneficiary: { uuid: beneficiario.uuid, cpf },
            specialty: { uuid: specialtyUuid },
            detail: { date: dateFormatted, from, to }
          };
          if (Array.isArray(beneficiario.plans) && beneficiario.plans.length && beneficiario.plans[0]?.uuid) {
            bodyRapidoc.plan = { uuid: beneficiario.plans[0].uuid };
          }
          if (beneficiario.paymentType) bodyRapidoc.paymentType = beneficiario.paymentType;
          if (beneficiario.serviceType) bodyRapidoc.serviceType = beneficiario.serviceType;
          if (notes) bodyRapidoc.notes = notes;

          const resp = await agendarConsultaRapidoc(bodyRapidoc);
          if (resp && resp.success !== false) {
            payload.status = 'scheduled';
            payload.attemptCount = 1;
            payload.updatedAt = new Date().toISOString();
            payload.appointment = resp;
          } else {
            payload.status = 'pending';
            payload.attemptCount = 1;
            payload.lastError = resp?.message || 'Falha ao agendar automaticamente';
            payload.updatedAt = new Date().toISOString();
          }
        } catch (e: any) {
          payload.status = 'pending';
          payload.attemptCount = 1;
          payload.lastError = e?.response?.data || e?.message || 'Erro ao tentar agendar automaticamente';
          payload.updatedAt = new Date().toISOString();
        }
      }

      await ref.set(payload);
      const statusCode = payload.status === 'scheduled' ? 201 : 202; // 201 se conseguiu agendar, 202 aceito em fila
      return res.status(statusCode).json(payload);
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Erro ao criar solicitação de consulta imediata.' });
    }
  }

  // GET /api/agendamentos/imediato/:id - status da solicitação de consulta imediata
  static async statusImediato(req: Request, res: Response) {
    try {
      const db = getFirestore(firebaseApp);
      const { id } = req.params;
      if (!id) return res.status(400).json({ error: 'id é obrigatório.' });
      const doc = await db.collection('immediate_requests').doc(id).get();
      if (!doc.exists) return res.status(404).json({ error: 'Solicitação não encontrada.' });
      return res.status(200).json({ id: doc.id, ...doc.data() });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Erro ao consultar status da solicitação.' });
    }
  }

  // DELETE /api/agendamentos/imediato/:id - cancela a solicitação (e o agendamento se houver)
  static async cancelarSolicitacaoImediato(req: Request, res: Response) {
    try {
      const db = getFirestore(firebaseApp);
      const { id } = req.params;
      if (!id) return res.status(400).json({ error: 'id é obrigatório.' });
      const ref = db.collection('immediate_requests').doc(id);
      const doc = await ref.get();
      if (!doc.exists) return res.status(404).json({ error: 'Solicitação não encontrada.' });
      const data: any = doc.data() || {};

      // Se já houver appointment e ainda não cancelado, tenta cancelar no Rapidoc
      try {
        const apptUuid = data?.appointment?.uuid || data?.appointment?.appointment?.uuid;
        if (apptUuid) {
          await cancelarAgendamentoRapidoc(apptUuid);
        }
      } catch {}

      await ref.set({ status: 'canceled', updatedAt: new Date().toISOString() }, { merge: true });
      return res.status(200).json({ id, canceled: true });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Erro ao cancelar solicitação.' });
    }
  }

  // GET /api/agendamentos - lista agendamentos por CPF ou beneficiaryUuid
  static async listar(req: Request, res: Response) {
    try {
      // origem do CPF: token > query ?cpf=
      let cpf: string | undefined = (req.user as any)?.cpf;
      if (!cpf && typeof req.query.cpf === 'string') cpf = (req.query.cpf as string).trim();

      const beneficiaryUuid = typeof req.query.beneficiaryUuid === 'string' ? (req.query.beneficiaryUuid as string).trim() : undefined;
      const status = typeof req.query.status === 'string' ? (req.query.status as string).trim() : undefined;
      const date = typeof req.query.date === 'string' ? (req.query.date as string).trim() : undefined;

      let finalBenefUuid = beneficiaryUuid;
      if (!finalBenefUuid) {
        if (!cpf) return res.status(400).json({ error: 'Informe cpf (query) ou envie o token com cpf.' });
        const beneficiarioResp = await buscarBeneficiarioRapidocPorCpf(cpf);
        const beneficiario = beneficiarioResp?.beneficiary;
        if (!beneficiario || !beneficiario.uuid) return res.status(404).json({ error: 'Beneficiário não encontrado no Rapidoc.' });
        finalBenefUuid = beneficiario.uuid;
      }

      const params: Record<string, any> = { beneficiary: finalBenefUuid };
      if (status) params.status = status;
      if (date) params.date = date; // formato dd/MM/yyyy esperado pela API (não convertendo aqui)

      const itens = await listarAgendamentosRapidoc(params);
      const mapped = (Array.isArray(itens) ? itens : []).map((a: any) => ({
        uuid: a?.uuid || a?.id || null,
        status: a?.status || null,
        date: a?.detail?.date || a?.date || null,
        from: a?.detail?.from || a?.from || null,
        to: a?.detail?.to || a?.to || null,
        specialty: a?.specialty?.name || a?.specialty?.description || a?.specialty?.title || null,
      }));
      return res.status(200).json({ count: mapped.length, appointments: mapped });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Erro ao listar agendamentos.' });
    }
  }

  // GET /api/agendamentos/:uuid/join - retorna informações para entrar na consulta
  static async join(req: Request, res: Response) {
    try {
      const { uuid } = req.params;
      if (!uuid) return res.status(400).json({ error: 'uuid é obrigatório.' });
      const data = await lerAgendamentoRapidoc(uuid);

      const appt = data?.appointment || data;
      const candidateKeys = [
        'joinUrl', 'meetingUrl', 'url', 'roomUrl', 'videoUrl', 'telemedUrl',
        'video_link', 'videoLink', 'accessUrl'
      ];
      let joinUrl: string | null = null;
      for (const k of candidateKeys) {
        if (appt?.[k]) { joinUrl = appt[k]; break; }
        if (appt?.detail?.[k]) { joinUrl = appt.detail[k]; break; }
      }

      const payload: any = {
        uuid: appt?.uuid || uuid,
        status: appt?.status || null,
        date: appt?.detail?.date || appt?.date || null,
        from: appt?.detail?.from || appt?.from || null,
        to: appt?.detail?.to || appt?.to || null,
        joinUrl,
      };
      if (!joinUrl) payload.message = 'Link de acesso não disponível na resposta do Rapidoc.';
      return res.status(200).json(payload);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 404) return res.status(404).json({ error: 'Agendamento não encontrado.' });
      return res.status(500).json({ error: error?.message || 'Erro ao obter link de acesso.' });
    }
  }

  // GET /api/agendamentos/imediato/:id/join - retorna link da consulta para solicitação imediata já agendada
  static async joinImediato(req: Request, res: Response) {
    try {
      const db = getFirestore(firebaseApp);
      const { id } = req.params;
      if (!id) return res.status(400).json({ error: 'id é obrigatório.' });
      const doc = await db.collection('immediate_requests').doc(id).get();
      if (!doc.exists) return res.status(404).json({ error: 'Solicitação não encontrada.' });
      const data: any = doc.data() || {};
      if (data.status !== 'scheduled') {
        return res.status(409).json({ error: 'Solicitação ainda não agendada.', status: data.status });
      }
      const apptUuid = data?.appointment?.uuid || data?.appointment?.appointment?.uuid;
      if (!apptUuid) {
        // tenta aproveitar link direto salvo, se houver
        const candidateKeys = ['joinUrl', 'meetingUrl', 'url', 'roomUrl', 'videoUrl', 'telemedUrl'];
        for (const k of candidateKeys) {
          if (data?.appointment?.[k]) {
            return res.status(200).json({ joinUrl: data.appointment[k], via: 'stored' });
          }
        }
        return res.status(404).json({ error: 'UUID do agendamento não encontrado na solicitação.' });
      }
      // reusa a lógica do join
      req.params.uuid = apptUuid;
      return await AgendamentoController.join(req, res);
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Erro ao obter link da consulta imediata.' });
    }
  }
}
