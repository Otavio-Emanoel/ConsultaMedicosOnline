import { cadastrarBeneficiarioRapidoc } from '../services/rapidoc.service.js';
import admin from 'firebase-admin';
import type { Request, Response } from 'express';

export class DependenteController {
  static async adicionar(req: Request, res: Response) {
    try {
      const { nome, cpf, birthDate, parentesco, holder, email, phone } = req.body;
      if (!nome || !cpf || !birthDate || !holder) {
        return res.status(400).json({ error: 'Campos obrigatórios não informados.' });
      }

      // 1. Cria no Rapidoc
      const rapidocResp = await cadastrarBeneficiarioRapidoc({
        nome,
        cpf,
        birthday: birthDate,
        holder,
        email,
        phone,
      });
      if (!rapidocResp || rapidocResp.success === false) {
        return res.status(400).json({ error: rapidocResp?.message || 'Erro ao criar dependente no Rapidoc.' });
      }

      // 2. Salva no Firestore
      const docData: any = {
        nome,
        cpf,
        birthDate,
        parentesco,
        holder,
        createdAt: new Date(),
      };
      if (rapidocResp.uuid) {
        docData.rapidocUuid = rapidocResp.uuid;
      }
      await admin.firestore().collection('beneficiarios').add(docData);

      // 3. Retorna lista atualizada
      const snapshot = await admin.firestore().collection('beneficiarios').where('holder', '==', holder).get();
      const dependentes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return res.status(201).json({ dependentes });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Erro ao adicionar dependente.' });
    }
  }

  static async listarPorTitular(req: Request, res: Response) {
    try {
      const { cpf } = req.params;
      const snapshot = await admin.firestore().collection('beneficiarios').where('holder', '==', cpf).get();
      const dependentes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return res.status(200).json({ dependentes });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Erro ao listar dependentes.' });
    }
  }
}