import type { Request, Response } from 'express';

export class PlanosController {
    static async listarPlanos(_req: Request, res: Response) {
        try {
            const { getFirestore } = await import('firebase-admin/firestore');
            const { firebaseApp } = await import('../config/firebase.js');
            const db = getFirestore(firebaseApp);
            const snapshot = await db.collection('planos').get();
            const planos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return res.status(200).json(planos);
        } catch (error: any) {
            return res.status(500).json({ error: error.message || 'Erro ao listar planos.' });
        }
    }

    // GET /api/planos/rapidoc - Lista planos Rapidoc (direto da API)
    static async listarPlanosRapidoc(_req: Request, res: Response) {
        try {
            const { listarRapidocPlanos } = await import('../services/rapidoc.service.js');
            const planos = await listarRapidocPlanos();
            return res.status(200).json(planos);
        } catch (error: any) {
            return res.status(500).json({ error: error.message || 'Erro ao consultar planos Rapidoc.' });
        }
    }
}