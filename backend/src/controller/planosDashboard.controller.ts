import type { Request, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseApp } from '../config/firebase.js';

export class PlanosDashboardController {
  static async dashboard(req: Request, res: Response) {
    try {
      const db = getFirestore(firebaseApp);
      const planosSnap = await db.collection('planos').get();
      const planos = planosSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          nome: data.nome || '',
          descricao: data.descricao || '',
          valor: data.valor || 0,
          assinantes: data.assinantes || 0,
          status: data.status || 'ativo',
          beneficios: data.beneficios || [],
          tipo: data.tipo || '',
        };
      });
      return res.status(200).json({ planos });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Erro ao buscar dashboard de planos.' });
    }
  }
}
