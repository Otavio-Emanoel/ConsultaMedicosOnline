import type { Request, Response } from 'express';
import admin from 'firebase-admin';
import { buscarBeneficiarioRapidocPorCpf, inativarBeneficiarioRapidoc } from '../services/rapidoc.service.js';

export class BeneficiarioController {
  // Inativar beneficiário no Rapidoc via CPF
  static async inativarRapidoc(req: Request, res: Response) {
    try {
      const { cpf } = req.params as { cpf?: string };
      if (!cpf) return res.status(400).json({ error: 'CPF é obrigatório.' });

      const r = await buscarBeneficiarioRapidocPorCpf(cpf);
      const beneficiario = r?.beneficiary;
      if (!beneficiario || !beneficiario.uuid) {
        return res.status(404).json({ error: 'Beneficiário não encontrado no Rapidoc.' });
      }

      try {
        const resp = await inativarBeneficiarioRapidoc(beneficiario.uuid);
        if (!resp || resp.success === false) {
          return res.status(400).json({ error: resp?.message || 'Falha ao inativar beneficiário no Rapidoc.', detail: resp });
        }
        return res.status(200).json({ ok: true, beneficiaryUuid: beneficiario.uuid });
      } catch (e: any) {
        return res.status(400).json({ error: 'Erro ao inativar beneficiário no Rapidoc.', detail: e?.response?.data || e?.message });
      }
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Erro ao inativar beneficiário.' });
    }
  }

  // Remover titular e dependentes do Firestore
  static async removerDoBanco(req: Request, res: Response) {
    try {
      const { cpf } = req.params as { cpf?: string };
      if (!cpf) return res.status(400).json({ error: 'CPF é obrigatório.' });

      const db = admin.firestore();
      const batch = db.batch();

      // 1) usuarios (titular)
      const usuarioRef = db.collection('usuarios').doc(cpf);
      const usuarioDoc = await usuarioRef.get();
      if (usuarioDoc.exists) batch.delete(usuarioRef);

      // 2) assinaturas do titular
      const assinSnap = await db.collection('assinaturas').where('cpfUsuario', '==', cpf).get();
      assinSnap.forEach(doc => batch.delete(doc.ref));

      // 3) dependentes vinculados ao titular
      const depsSnap = await db.collection('beneficiarios').where('holder', '==', cpf).get();
      depsSnap.forEach(doc => batch.delete(doc.ref));

      await batch.commit();

      return res.status(200).json({ ok: true, removed: {
        usuario: usuarioDoc.exists,
        assinaturas: assinSnap.size,
        dependentes: depsSnap.size
      }});
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Erro ao remover do banco de dados.' });
    }
  }
}
