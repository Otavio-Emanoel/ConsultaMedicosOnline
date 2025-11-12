import type { Request, Response } from 'express';
import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseApp } from '../config/firebase.js';

export class AdminController {
  // Cadastro de administrador (apenas outro admin pode cadastrar)
  static async cadastrar(req: Request, res: Response) {
    try {
      const { nome, email, senha } = req.body;
      if (!nome || !email || !senha) {
        return res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' });
      }

      // Verifica se já existe admin com esse email
      const db = getFirestore(firebaseApp);
      const adminSnap = await db.collection('administradores').where('email', '==', email).get();
      if (!adminSnap.empty) {
        return res.status(409).json({ error: 'Já existe um administrador com esse email.' });
      }

      // Cria usuário no Firebase Auth
      const userRecord = await getAuth(firebaseApp).createUser({
        email,
        password: senha,
        displayName: nome,
      });

      // Salva na coleção administradores
      await db.collection('administradores').doc(userRecord.uid).set({
        uid: userRecord.uid,
        nome,
        email,
        criadoEm: new Date().toISOString(),
      });

      return res.status(201).json({ message: 'Administrador cadastrado com sucesso.', uid: userRecord.uid });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Erro ao cadastrar administrador.' });
    }
  }

  // Cadastro de plano vinculado ao Rapidoc
  static async cadastrarPlano(req: Request, res: Response) {
    try {
      // Extrai campos obrigatórios e todos os demais campos extras
      const {
        tipo, periodicidade, descricao, especialidades, preco, uuidRapidocPlano, paymentType,
        ...rest
      } = req.body;
      if (!tipo || !periodicidade || !descricao || !Array.isArray(especialidades) || !preco || !uuidRapidocPlano || !paymentType) {
        return res.status(400).json({ error: 'Campos obrigatórios: tipo, periodicidade, descricao, especialidades (array), preco, uuidRapidocPlano, paymentType.' });
      }

      // Consulta planos Rapidoc e valida UUID e paymentType
      const { listarRapidocPlanos } = await import('../services/rapidoc.service.js');
      const planosRapidoc = await listarRapidocPlanos();
      // Corrige busca: uuid está em p.plan.uuid
      const planoRemoto = planosRapidoc.find((p: any) => p.plan?.uuid === uuidRapidocPlano);
      if (!planoRemoto) {
        return res.status(404).json({ error: 'Plano Rapidoc não encontrado para o uuidRapidocPlano fornecido.' });
      }
      const remotePaymentType = planoRemoto.paymentType;
      const enviado = String(paymentType).toUpperCase();
      // Regra: se remotePaymentType = 'L', aceita S/A/L; senão, exige igual
      if (remotePaymentType === 'L') {
        if (!['S', 'A', 'L'].includes(enviado)) {
          return res.status(400).json({ error: 'paymentType inválido: permitido S, A ou L quando remotePaymentType=L.' });
        }
      } else if (remotePaymentType && enviado !== remotePaymentType) {
        return res.status(400).json({ error: `paymentType diferente do plano Rapidoc (${remotePaymentType}).` });
      }
      // Se quiser salvar nome/descrição do plano Rapidoc junto, pode usar planoRemoto.plan.name etc.

      const db = getFirestore(firebaseApp);
      // Evita duplicidade pelo uuidRapidocPlano
      const existentesSnap = await db.collection('planos').where('uuidRapidocPlano', '==', uuidRapidocPlano).get();
      if (!existentesSnap.empty) {
        return res.status(409).json({ error: 'Já existe plano local vinculado a este uuidRapidocPlano.' });
      }

      // Salva todos os campos recebidos, inclusive extras, junto com vínculo Rapidoc e data
      const planoData = {
        tipo,
        periodicidade,
        descricao,
        especialidades,
        preco,
        uuidRapidocPlano,
        paymentType: enviado,
        remotePaymentType,
        criadoEm: new Date().toISOString(),
        ...rest
      };
      const planoRef = await db.collection('planos').add(planoData);
      return res.status(201).json({ message: 'Plano cadastrado com sucesso.', id: planoRef.id });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Erro ao cadastrar plano.' });
    }
  }
}
