import type { Request, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseApp } from '../config/firebase.js';

export class PlanosDashboardController {
  static async dashboard(req: Request, res: Response) {
    try {
      const db = getFirestore(firebaseApp);
      const planosSnap = await db.collection('planos').get();
      const assinaturasSnap = await db.collection('assinaturas').get();
      // Agrupa assinaturas por id do plano
      const assinaturasPorPlano: Record<string, number> = {};
      assinaturasSnap.forEach((doc: any) => {
        const data = doc.data();
        const planoId = data.planoId;
        if (planoId) {
          assinaturasPorPlano[planoId] = (assinaturasPorPlano[planoId] || 0) + 1;
        }
      });

      const planos = planosSnap.docs.map(doc => {
        const data = doc.data();
        // Copia todos os campos do plano
        const plano = {
          id: doc.id,
          ...data,
          assinantes: assinaturasPorPlano[doc.id] || 0
        };
        return plano;
      });
      return res.status(200).json({ planos });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Erro ao buscar dashboard de planos.' });
    }
  }
}
