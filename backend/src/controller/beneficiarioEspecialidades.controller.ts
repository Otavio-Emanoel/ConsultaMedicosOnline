import type { Request, Response } from 'express';
import { buscarBeneficiarioRapidocPorCpf, obterDetalhesPlanoRapidoc } from '../services/rapidoc.service.js';

export class BeneficiarioEspecialidadesController {
  static async listarEspecialidades(req: Request, res: Response) {
    try {
      const { cpf } = req.params;
      if (!cpf) return res.status(400).json({ error: 'CPF é obrigatório.' });

      const beneficiarioResp = await buscarBeneficiarioRapidocPorCpf(cpf);
      const beneficiario = beneficiarioResp?.beneficiary;
      if (!beneficiario || !beneficiario.uuid) {
        return res.status(404).json({ error: 'Beneficiário não encontrado no Rapidoc.' });
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

      // specialties dos planos (fetch detalhes se necessário)
      if (Array.isArray(beneficiario.plans)) {
        for (const p of beneficiario.plans) {
          const planObj = p?.plan || p; // estrutura observada
          let planSpecialties = Array.isArray(planObj?.specialties) ? planObj.specialties : [];
          if (!planSpecialties.length && planObj?.uuid) {
            try {
              const detalhes = await obterDetalhesPlanoRapidoc(planObj.uuid);
              if (Array.isArray(detalhes?.specialties)) planSpecialties = detalhes.specialties;
            } catch {}
          }
          for (const s of planSpecialties) {
            const uuid = s?.uuid || s?.id; if (!uuid) continue;
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
}
