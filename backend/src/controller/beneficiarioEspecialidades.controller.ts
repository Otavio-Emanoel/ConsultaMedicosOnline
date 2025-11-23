import type { Request, Response } from 'express';
import { buscarBeneficiarioRapidocPorCpf, obterDetalhesPlanoRapidoc, atualizarBeneficiarioRapidoc, listarRapidocEspecialidades } from '../services/rapidoc.service.js';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseApp } from '../config/firebase.js';

export class BeneficiarioEspecialidadesController {
  static async listarEspecialidades(req: Request, res: Response) {
    try {
      let { cpf } = req.params;
      
      // Se não veio CPF no parâmetro, tenta obter do usuário logado
      if (!cpf) {
        const uid = req.user?.uid || req.user?.sub;
        if (!uid) {
          return res.status(401).json({ error: 'Usuário não autenticado.' });
        }
        
        // Buscar CPF do usuário no Firestore
        const db = getFirestore(firebaseApp);
        const usuarioRef = db.collection('usuarios').doc(uid);
        const usuarioDoc = await usuarioRef.get();
        
        if (usuarioDoc.exists) {
          const usuarioData = usuarioDoc.data();
          cpf = usuarioData?.cpf;
        }
        
        // Se não encontrou CPF no Firestore, usa o UID (que pode ser o CPF)
        if (!cpf) {
          cpf = (req.user as any)?.cpf || uid;
        }
      }
      
      if (!cpf) {
        return res.status(400).json({ error: 'CPF é obrigatório.' });
      }

      const beneficiarioResp = await buscarBeneficiarioRapidocPorCpf(cpf);
      const beneficiario = beneficiarioResp?.beneficiary;
      if (!beneficiario || !beneficiario.uuid) {
        return res.status(404).json({ error: 'Beneficiário não encontrado no Rapidoc para o CPF informado.' });
      }

      const sources: { uuid: string; name?: string; source: string }[] = [];

      // specialties diretas
      if (Array.isArray(beneficiario.specialties)) {
        for (const s of beneficiario.specialties) {
          const uuid = s?.uuid || s?.id; if (!uuid) continue;
          sources.push({ uuid, name: s?.name || s?.description || s?.title, source: 'beneficiary' });
        }
      }

      // availableSpecialties
      if (Array.isArray(beneficiario.availableSpecialties)) {
        for (const s of beneficiario.availableSpecialties) {
          const uuid = s?.uuid || s?.id; if (!uuid) continue;
          sources.push({ uuid, name: s?.name || s?.description || s?.title, source: 'available' });
        }
      }

      // specialties dos planos (OTIMIZAÇÃO: buscar detalhes em paralelo)
      if (Array.isArray(beneficiario.plans)) {
        // Paralelizar busca de detalhes dos planos para evitar chamadas sequenciais
        const planPromises = beneficiario.plans.map(async (p: any) => {
          const planObj = p?.plan || p;
          let planSpecialties = Array.isArray(planObj?.specialties) ? planObj.specialties : [];
          
          // Só busca detalhes se realmente não tiver specialties e tiver UUID
          if (!planSpecialties.length && planObj?.uuid) {
            try {
              const detalhes = await obterDetalhesPlanoRapidoc(planObj.uuid);
              if (Array.isArray(detalhes?.specialties)) planSpecialties = detalhes.specialties;
            } catch {
              // Ignora erro - plano pode não ter especialidades
            }
          }
          
          return planSpecialties;
        });
        
        // Aguardar todas as buscas de planos em paralelo
        const allPlanSpecialties = await Promise.all(planPromises);
        
        // Adicionar todas as especialidades dos planos
        for (const planSpecialties of allPlanSpecialties) {
          for (const s of planSpecialties) {
            const uuid = s?.uuid || s?.id;
            if (!uuid) continue;
            sources.push({ uuid, name: s?.name || s?.description || s?.title, source: 'plan' });
          }
        }
      }

      // Deduplicar por uuid mantendo primeira ocorrência (ordem de prioridade: beneficiary > available > plan)
      const seen = new Set<string>();
      const specialties = [] as typeof sources;
      for (const s of sources) {
        if (!seen.has(s.uuid)) { seen.add(s.uuid); specialties.push(s); }
      }

      return res.status(200).json({
        cpf,
        beneficiaryUuid: beneficiario.uuid,
        count: specialties.length,
        specialties
      });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Erro ao listar especialidades do beneficiário.' });
    }
  }

  static async associarEspecialidade(req: Request, res: Response) {
    try {
      const { cpf } = req.params;
      const { specialtyUuid, specialtyUuids } = req.body || {};
      if (!cpf) return res.status(400).json({ error: 'CPF é obrigatório.' });
      // Normalizar entrada: aceitar specialtyUuid como string ou array, ou specialtyUuids como array
      let uuidsRaw: any = [];
      if (Array.isArray(specialtyUuids)) uuidsRaw = specialtyUuids;
      else if (Array.isArray(specialtyUuid)) uuidsRaw = specialtyUuid;
      else if (typeof specialtyUuid === 'string') uuidsRaw = [specialtyUuid];
      const uuids: string[] = uuidsRaw.filter((u: any) => typeof u === 'string' && u.trim()).map((u: string) => u.trim());
      if (!uuids.length) return res.status(400).json({ error: 'Informe specialtyUuid (string) ou specialtyUuids (array de strings).' });

      const beneficiarioResp = await buscarBeneficiarioRapidocPorCpf(cpf);
      const beneficiario = beneficiarioResp?.beneficiary;
      if (!beneficiario || !beneficiario.uuid) {
        return res.status(404).json({ error: 'Beneficiário não encontrado no Rapidoc.' });
      }

      // Opcional: validar contra especialidades globais
      let globais: any[] = [];
      try { globais = await listarRapidocEspecialidades(); } catch {}
      const globaisSet = new Set(globais.map(g => g.uuid || g.id));
      const invalidos = uuids.filter(u => globaisSet.size && !globaisSet.has(u));
      if (invalidos.length) {
        return res.status(422).json({ error: 'Algumas especialidades não existem.', invalidUuids: invalidos, globaisCount: globaisSet.size });
      }

      const specialties = uuids.map(u => ({ uuid: u }));

      // Tentativa minimal: apenas specialties (evitar validação de email/phone)
      let primeiraTentativaErro: any = null;
      let resp: any = null;
      try {
        resp = await atualizarBeneficiarioRapidoc(beneficiario.uuid, { specialties });
      } catch (e: any) {
        primeiraTentativaErro = {
          status: e?.response?.status,
          data: e?.response?.data,
          sent: { specialties }
        };
      }

      // Se falhou, normalizar telefone e tentar novamente sem email
      if (!resp) {
        const b = beneficiario;
        let phone = b.phone;
        if (typeof phone === 'string') {
          const digits = phone.replace(/\D/g,'');
          // Se começa com 55 e tem > 11 dígitos, remover código país
          if (digits.length > 11 && digits.startsWith('55')) {
            phone = digits.slice(2);
          } else {
            phone = digits;
          }
        }
        let birthday = b.birthday;
        if (typeof birthday === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(birthday)) {
          const [d,m,y] = birthday.split('/');
          birthday = `${y}-${m}-${d}`;
        }
        const allowedPayment = new Set(['S', 'A']);
        const allowedService = new Set(['G', 'P', 'GP', 'GS', 'GSP']);
        let paymentType = String(b.paymentType || process.env.RAPIDOC_DEFAULT_PAYMENT_TYPE || 'S').toUpperCase();
        if (!allowedPayment.has(paymentType)) paymentType = 'S';
        let serviceType = String(b.serviceType || process.env.RAPIDOC_DEFAULT_SERVICE_TYPE || 'G').toUpperCase();
        if (!allowedService.has(serviceType)) serviceType = 'G';
        const updateSecond = {
          cpf: b.cpf,
          birthday,
          phone,
          paymentType,
          serviceType,
          specialties
        };
        let segundaTentativaErro: any = null;
        try {
          resp = await atualizarBeneficiarioRapidoc(beneficiario.uuid, updateSecond);
        } catch (e2: any) {
          segundaTentativaErro = {
            status: e2?.response?.status,
            data: e2?.response?.data,
            sent: updateSecond
          };
        }

        // Fallback via plano se ainda falhar
        if (!resp && Array.isArray(b.plans) && b.plans.length) {
          const plano = b.plans[0].plan || b.plans[0];
          const planUuid = plano?.uuid;
          if (planUuid) {
            const updatePlanOnly = {
              plans: [{ plan: { uuid: planUuid, specialties } }]
            };
            let terceiraTentativaErro: any = null;
            try {
              resp = await atualizarBeneficiarioRapidoc(beneficiario.uuid, updatePlanOnly);
            } catch (e3: any) {
              terceiraTentativaErro = {
                status: e3?.response?.status,
                data: e3?.response?.data,
                sent: updatePlanOnly
              };
            }
            if (!resp) {
              return res.status(400).json({
                error: 'Falha ao associar especialidade (todas as tentativas).',
                primeiraTentativaErro,
                segundaTentativaErro,
                terceiraTentativaErro
              });
            }
            return res.status(200).json({ success: true, beneficiaryUuid: beneficiario.uuid, applied: specialties, via: 'plans-only', result: resp });
          }
          return res.status(400).json({
            error: 'Falha ao associar especialidade (sem uuid de plano).',
            primeiraTentativaErro,
            segundaTentativaErro
          });
        }

        if (!resp) {
          return res.status(400).json({
            error: 'Falha ao associar especialidade.',
            primeiraTentativaErro,
            segundaTentativaErro
          });
        }
        return res.status(200).json({ success: true, beneficiaryUuid: beneficiario.uuid, applied: specialties, via: 'beneficiary-second', result: resp });
      }

      return res.status(200).json({ success: true, beneficiaryUuid: beneficiario.uuid, applied: specialties, via: 'beneficiary-minimal', result: resp });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Erro ao associar especialidade ao beneficiário.' });
    }
  }
}
