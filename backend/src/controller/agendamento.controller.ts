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
      const { 
        availabilityUuid, 
        specialtyUuid, 
        beneficiaryMedicalReferralUuid,
        approveAdditionalPayment,
        cpfSelecionado, // CPF do paciente selecionado (opcional, para dependentes)
        // Formato antigo (mantido para compatibilidade)
        date, from, to, time, durationMinutes, notes
      } = req.body || {};

      // Obter CPF e beneficiário: se cpfSelecionado vier no body, usar esse; senão, usar o do usuário logado
      let cpf: string;
      let beneficiario: any;
      let beneficiarioUuid: string;

      if (cpfSelecionado) {
        // Buscar beneficiário pelo CPF selecionado (para dependentes)
        const beneficiarioResp = await buscarBeneficiarioRapidocPorCpf(cpfSelecionado);
        const beneficiarioData = beneficiarioResp?.beneficiary;
        if (!beneficiarioData || !beneficiarioData.uuid) {
          return res.status(404).json({ error: 'Beneficiário não encontrado no Rapidoc para o CPF selecionado.' });
        }
        cpf = cpfSelecionado;
        beneficiario = beneficiarioData;
        beneficiarioUuid = beneficiarioData.uuid;
      } else {
        // Usar beneficiário do usuário logado (comportamento padrão)
        const result = await AgendamentoController.obterBeneficiarioDoUsuarioLogado(req);
        cpf = result.cpf;
        beneficiario = result.beneficiario;
        beneficiarioUuid = result.beneficiarioUuid;
      }
      
      // NOVO FORMATO: Usando availabilityUuid (preferencial)
      if (availabilityUuid && specialtyUuid) {
        const bodyRapidoc: Record<string, any> = {
          beneficiaryUuid: beneficiarioUuid,
          availabilityUuid,
          specialtyUuid,
        };
        
        // Para especialidades que requerem encaminhamento
        if (beneficiaryMedicalReferralUuid) {
          bodyRapidoc.beneficiaryMedicalReferralUuid = beneficiaryMedicalReferralUuid;
        }
        
        // Para nutrição e psicologia (sem encaminhamento)
        if (approveAdditionalPayment !== undefined) {
          bodyRapidoc.approveAdditionalPayment = approveAdditionalPayment;
        }
        
        try {
          console.log('[AgendamentoController] Enviando para Rapidoc:', JSON.stringify(bodyRapidoc, null, 2));
          const resp = await agendarConsultaRapidoc(bodyRapidoc);
          console.log('[AgendamentoController] Resposta do Rapidoc:', JSON.stringify(resp, null, 2));
          
          if (!resp || resp.success === false) {
            return res.status(400).json({ 
              error: resp?.message || 'Falha ao agendar no Rapidoc.', 
              detail: resp,
              sent: bodyRapidoc
            });
          }
          return res.status(201).json(resp);
        } catch (e: any) {
          console.error('[AgendamentoController] Erro ao agendar:', {
            status: e?.response?.status,
            statusText: e?.response?.statusText,
            data: e?.response?.data,
            sent: bodyRapidoc
          });
          
          return res.status(400).json({
            error: 'Erro ao agendar no Rapidoc.',
            status: e?.response?.status,
            statusText: e?.response?.statusText,
            detail: e?.response?.data,
            sent: bodyRapidoc
          });
        }
      }
      
      // FORMATO ANTIGO: Usando date/from/to (mantido para compatibilidade)
      if (!date || (!from && !to && !time)) {
        return res.status(400).json({ 
          error: 'Campos obrigatórios: availabilityUuid e specialtyUuid (novo formato) ou date, from/to/time (formato antigo).' 
        });
      }

      // Validar specialtyUuid contra lista disponível
      let especialidades: any[] = [];
      try {
        especialidades = await listarRapidocEspecialidades();
      } catch {}
      if (especialidades.length && specialtyUuid) {
        const exists = especialidades.some((s: any) => s?.uuid === specialtyUuid || s?.id === specialtyUuid);
        if (!exists) {
          return res.status(422).json({
            error: 'Especialidade não disponível para o cliente.',
            specialtyUuid,
            availableSpecialties: especialidades.map((s: any) => ({ uuid: s.uuid, name: s.name }))
          });
        }
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
        beneficiary: { uuid: beneficiarioUuid, cpf },
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
          sent: bodyRapidoc
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
  static async solicitarImediato(req: Request, res: Response) {
    try {
      // CPF selecionado pode vir no body (para dependentes) ou usar o do usuário logado
      const { cpfSelecionado } = req.body || {};
      
      let beneficiarioUuid: string;
      
      if (cpfSelecionado) {
        // Se veio CPF selecionado, busca o beneficiário desse CPF
        const beneficiarioResp = await buscarBeneficiarioRapidocPorCpf(cpfSelecionado);
        const beneficiario = beneficiarioResp?.beneficiary;
        if (!beneficiario || !beneficiario.uuid) {
          return res.status(404).json({ error: 'Beneficiário não encontrado no Rapidoc para o CPF selecionado.' });
        }
        beneficiarioUuid = beneficiario.uuid;
      } else {
        // Senão, usa o beneficiário do usuário logado
        const { beneficiarioUuid: uuidLogado } = await AgendamentoController.obterBeneficiarioDoUsuarioLogado(req);
        beneficiarioUuid = uuidLogado;
      }
      
      // Chamar endpoint request-appointment do Rapidoc
      const resposta = await solicitarConsultaImediataRapidoc(beneficiarioUuid);
      
      // Extrair link da resposta (formato da API Rapidoc: { success: true, message: "...", url: "..." })
      let linkConsulta: string | null = null;
      
      // O Rapidoc retorna { success: true, message: "...", url: "..." }
      if (resposta?.url) {
        linkConsulta = resposta.url;
      } else if (resposta?.link) {
        linkConsulta = resposta.link;
      } else if (resposta?.data?.url) {
        linkConsulta = resposta.data.url;
      }
      
      if (!linkConsulta) {
        // Se não encontrou link, retorna a resposta completa para debug
        return res.status(200).json({
          success: false,
          beneficiaryUuid: beneficiarioUuid,
          message: 'Link não encontrado na resposta do Rapidoc.',
          rawResponse: resposta
        });
      }
      
      return res.status(200).json({
        success: true,
        beneficiaryUuid: beneficiarioUuid,
        url: linkConsulta,
        link: linkConsulta, // Alias para compatibilidade
        joinUrl: linkConsulta, // Alias para compatibilidade
        appointmentUrl: linkConsulta // Alias para compatibilidade
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
      return res.status(500).json({ error: error?.message || 'Erro ao solicitar consulta imediata.' });
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
