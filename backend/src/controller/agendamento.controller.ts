import type { Request, Response } from 'express';
import { buscarBeneficiarioRapidocPorCpf, agendarConsultaRapidoc, lerAgendamentoRapidoc, cancelarAgendamentoRapidoc, listarRapidocEspecialidades, obterDetalhesPlanoRapidoc, atualizarBeneficiarioRapidoc, atualizarPlanoRapidoc, listarAgendamentosRapidoc, buscarDisponibilidadeEspecialidade, solicitarConsultaImediataRapidoc } from '../services/rapidoc.service.js';
import { firebaseApp } from '../config/firebase.js';
import { getFirestore } from 'firebase-admin/firestore';

export class AgendamentoController {
  /**
   * Helper: Obtém o CPF do usuário logado e busca o beneficiário no Rapidoc
   * Retorna { cpf, beneficiario, beneficiarioUuid } ou lança erro
   */
  private static async obterBeneficiarioDoUsuarioLogado(req: Request): Promise<{ cpf: string; beneficiario: any; beneficiarioUuid: string }> {
    // Obter UID do usuário logado
    const uid = req.user?.uid || req.user?.sub;
    if (!uid) {
      throw new Error('Usuário não autenticado.');
    }

    // Buscar CPF do usuário no Firestore
    const db = getFirestore(firebaseApp);
    const usuarioRef = db.collection('usuarios').doc(uid);
    const usuarioDoc = await usuarioRef.get();
    let cpf: string | undefined;

    if (usuarioDoc.exists) {
      const usuarioData = usuarioDoc.data();
      cpf = usuarioData?.cpf;
    }
    // Se não encontrou CPF no Firestore, usa o UID (que pode ser o CPF)
    if (!cpf) {
      cpf = (req.user as any)?.cpf || uid;
    }

    if (!cpf) {
      throw new Error('CPF do usuário não encontrado.');
    }

    // Buscar beneficiário no Rapidoc pelo CPF (usando o endpoint /beneficiaries/:cpf)
    const beneficiarioResp = await buscarBeneficiarioRapidocPorCpf(cpf);
    const beneficiario = beneficiarioResp?.beneficiary;
    if (!beneficiario || !beneficiario.uuid) {
      throw new Error('Beneficiário não encontrado no Rapidoc para o usuário logado.');
    }

    return { cpf, beneficiario, beneficiarioUuid: beneficiario.uuid };
  }
  static async criar(req: Request, res: Response) {
    try {
      const { cpf, date, from, to, specialtyUuid, notes, durationMinutes, time } = req.body || {};
            
      // Validar specialtyUuid contra lista disponível (sem travar se falhar a listagem)
      let especialidades: any[] = [];
      try {
        especialidades = await listarRapidocEspecialidades();
      } catch {}
      
      if (especialidades.length && specialtyUuid) {
        const exists = especialidades.some((s: any) => s?.uuid === specialtyUuid || s?.id === specialtyUuid);
        if (!exists) {
          return res.status(422).json({
            error: 'Especialidade não disponível na lista global da Rapidoc.',
            specialtyUuid,
            availableSpecialties: especialidades.map((s: any) => ({ uuid: s.uuid, name: s.name }))
          });
        }
      }

      if (!cpf || !date || (!from && !to && !time)) {
        return res.status(400).json({ error: 'Campos obrigatórios: cpf, date (yyyy-MM-dd), from(HH:mm) e to(HH:mm) ou time + durationMinutes.' });
      }

      // Derivar from/to se vier time + durationMinutes
      let finalFrom = from;
      let finalTo = to;
      if (!finalFrom && time) finalFrom = time;
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

      // --- LÓGICA DE PREPARAÇÃO (SIMPLIFICADA) ---
      // Identificar qual deveria ser o ServiceType e Plano corretos baseados no cadastro
      let targetServiceType = beneficiario.serviceType; 
      let targetPlanUuid: string | undefined;

      if (Array.isArray(beneficiario.plans) && beneficiario.plans.length > 0) {
          const p = beneficiario.plans[0];
          if (p.plan) {
              if (p.plan.serviceType) targetServiceType = p.plan.serviceType;
              if (p.plan.uuid) targetPlanUuid = p.plan.uuid;
          } else {
              if (p.serviceType) targetServiceType = p.serviceType;
              if (p.uuid) targetPlanUuid = p.uuid;
          }
      }

      // AUTOCORREÇÃO: Se o usuário está com tipo errado no banco (ex: G) mas tem plano (ex: GS), atualiza agora.
      if (targetServiceType && beneficiario.serviceType !== targetServiceType) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Agendamento] Atualizando beneficiário ${cpf} de ${beneficiario.serviceType} para ${targetServiceType}...`);
        }
        try {
            await atualizarBeneficiarioRapidoc(beneficiario.uuid, { serviceType: targetServiceType });
        } catch (err: any) {
            // Log apenas em desenvolvimento para não poluir logs em produção
            if (process.env.NODE_ENV === 'development') {
              console.error('[Agendamento] Erro na autocorreção:', err.message);
            }
        }
      }

      // --- CONSTUÇÃO DO BODY DO AGENDAMENTO ---
      // IMPORTANTE: Não enviamos 'plan' nem 'serviceType' aqui se o usuário já estiver correto.
      // Enviar esses campos parcialmente pode fazer a API sobrescrever as regras do usuário com um objeto vazio.
      const bodyRapidoc: Record<string, any> = {
        beneficiary: { uuid: beneficiario.uuid, cpf },
        specialty: { uuid: specialtyUuid },
        detail: { date: dateFormatted, from: finalFrom, to: finalTo }
      };
      
      if (beneficiario.paymentType) bodyRapidoc.paymentType = beneficiario.paymentType;
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
          beneficiarioDebug: beneficiarioResp // Retorna os dados originais para debug
        });
      }
    } catch (error: any) {
      if (error?.message === 'Usuário não autenticado.' || error?.message?.includes('CPF')) {
        return res.status(400).json({ error: error.message });
      }
      if (error?.message?.includes('Beneficiário não encontrado')) {
        return res.status(404).json({ error: error.message });
      }
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

  // POST /api/agendamentos/imediato - solicita consulta imediata usando request-appointment
  // Chama diretamente a API do Rapidoc e retorna o link imediatamente
  static async solicitarImediato(req: Request, res: Response) {
    try {
      const { cpf: cpfBody } = req.body || {};
      const cpf = (req.user && (req.user as any).cpf) || cpfBody;
      if (!cpf) return res.status(400).json({ error: 'Informe o CPF no token ou no corpo da requisição.' });

      // Buscar beneficiário no Rapidoc para obter UUID
      const beneficiarioResp = await buscarBeneficiarioRapidocPorCpf(cpf);
      const beneficiario = beneficiarioResp?.beneficiary;
      if (!beneficiario || !beneficiario.uuid) {
        return res.status(404).json({ error: 'Beneficiário não encontrado no Rapidoc para o CPF informado.' });
      }

      // Chamar diretamente a API do Rapidoc para solicitar atendimento imediato
      // GET /beneficiaries/:uuid/request-appointment - retorna link imediatamente
      const rapidocResponse = await solicitarConsultaImediataRapidoc(beneficiario.uuid);
      
      // Extrair link da resposta do Rapidoc
      // A resposta pode vir em diferentes formatos, então tentamos várias chaves possíveis
      const candidateKeys = [
        'url', 'link', 'joinUrl', 'appointmentUrl', 'meetingUrl', 
        'roomUrl', 'videoUrl', 'telemedUrl', 'video_link', 'videoLink', 'accessUrl'
      ];
      
      let linkConsulta: string | null = null;
      
      // Tentar encontrar link na resposta direta
      for (const key of candidateKeys) {
        if (rapidocResponse?.[key]) {
          linkConsulta = rapidocResponse[key];
          break;
        }
      }
      
      // Se não encontrou na raiz, tentar em appointment ou data
      if (!linkConsulta && rapidocResponse?.appointment) {
        for (const key of candidateKeys) {
          if (rapidocResponse.appointment[key]) {
            linkConsulta = rapidocResponse.appointment[key];
            break;
          }
        }
      }
      
      if (!linkConsulta && rapidocResponse?.data) {
        for (const key of candidateKeys) {
          if (rapidocResponse.data[key]) {
            linkConsulta = rapidocResponse.data[key];
            break;
          }
        }
      }

      // Retornar resposta com link (se encontrado)
      return res.status(200).json({
        success: true,
        url: linkConsulta,
        link: linkConsulta,
        joinUrl: linkConsulta,
        appointmentUrl: linkConsulta,
        rapidocResponse: linkConsulta ? undefined : rapidocResponse, // Incluir resposta raw apenas se não encontrou link
        beneficiaryUuid: beneficiario.uuid,
        cpf: cpf
      });
    } catch (error: any) {
      if (error?.message === 'Usuário não autenticado.' || error?.message?.includes('CPF')) {
        return res.status(400).json({ error: error.message });
      }
      if (error?.message?.includes('Beneficiário não encontrado')) {
        return res.status(404).json({ error: error.message });
      }
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        return res.status(401).json({ error: 'Autorização inválida no Rapidoc.' });
      }
      return res.status(500).json({ 
        error: error?.message || 'Erro ao solicitar consulta imediata.',
        details: error?.response?.data || undefined
      });
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

  // GET /api/agendamentos/disponibilidade - busca disponibilidade de especialidades para o usuário logado
  static async buscarDisponibilidade(req: Request, res: Response) {
    try {
      // Obter CPF e beneficiário do usuário logado automaticamente
      const { beneficiarioUuid } = await AgendamentoController.obterBeneficiarioDoUsuarioLogado(req);

      // Obter parâmetros da query
      const { specialtyUuid, dateInitial, dateFinal } = req.query;
      if (!specialtyUuid || typeof specialtyUuid !== 'string') {
        return res.status(400).json({ error: 'specialtyUuid é obrigatório.' });
      }
      if (!dateInitial || typeof dateInitial !== 'string') {
        return res.status(400).json({ error: 'dateInitial é obrigatório (formato: dd/MM/yyyy).' });
      }
      if (!dateFinal || typeof dateFinal !== 'string') {
        return res.status(400).json({ error: 'dateFinal é obrigatório (formato: dd/MM/yyyy).' });
      }

      // Buscar disponibilidade usando o beneficiaryUuid do usuário logado automaticamente
      const disponibilidade = await buscarDisponibilidadeEspecialidade({
        specialtyUuid: specialtyUuid.trim(),
        beneficiaryUuid: beneficiarioUuid, // Usa o beneficiaryUuid do usuário logado automaticamente
        dateInitial: dateInitial.trim(),
        dateFinal: dateFinal.trim(),
      });

      return res.status(200).json({
        beneficiaryUuid: beneficiarioUuid,
        specialtyUuid: specialtyUuid.trim(),
        dateInitial: dateInitial.trim(),
        dateFinal: dateFinal.trim(),
        disponibilidade
      });
    } catch (error: any) {
      if (error?.message === 'Usuário não autenticado.' || error?.message?.includes('CPF')) {
        return res.status(400).json({ error: error.message });
      }
      if (error?.message?.includes('Beneficiário não encontrado')) {
        return res.status(404).json({ error: error.message });
      }
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        return res.status(401).json({ error: 'Autorização inválida no Rapidoc.' });
      }
      return res.status(500).json({ error: error?.message || 'Erro ao buscar disponibilidade de especialidades.' });
    }
  }

  // GET /api/agendamentos - lista agendamentos por CPF ou beneficiaryUuid
  static async listar(req: Request, res: Response) {
    try {
      const beneficiaryUuid = typeof req.query.beneficiaryUuid === 'string' ? (req.query.beneficiaryUuid as string).trim() : undefined;
      const status = typeof req.query.status === 'string' ? (req.query.status as string).trim() : undefined;
      const date = typeof req.query.date === 'string' ? (req.query.date as string).trim() : undefined;

      // Se não veio beneficiaryUuid na query, obtém automaticamente do usuário logado
      let finalBenefUuid = beneficiaryUuid;
      if (!finalBenefUuid) {
        const { beneficiarioUuid } = await AgendamentoController.obterBeneficiarioDoUsuarioLogado(req);
        finalBenefUuid = beneficiarioUuid;
      }

      const params: Record<string, any> = { beneficiary: finalBenefUuid };
      if (status) params.status = status;
      if (date) params.date = date;

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
      if (error?.message === 'Usuário não autenticado.' || error?.message?.includes('CPF')) {
        return res.status(400).json({ error: error.message });
      }
      if (error?.message?.includes('Beneficiário não encontrado')) {
        return res.status(404).json({ error: error.message });
      }
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

  // GET /api/agendamentos/imediato/:id/join
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
        const candidateKeys = ['joinUrl', 'meetingUrl', 'url', 'roomUrl', 'videoUrl', 'telemedUrl'];
        for (const k of candidateKeys) {
          if (data?.appointment?.[k]) {
            return res.status(200).json({ joinUrl: data.appointment[k], via: 'stored' });
          }
        }
        return res.status(404).json({ error: 'UUID do agendamento não encontrado na solicitação.' });
      }
      req.params.uuid = apptUuid;
      return await AgendamentoController.join(req, res);
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Erro ao obter link da consulta imediata.' });
    }
  }
}