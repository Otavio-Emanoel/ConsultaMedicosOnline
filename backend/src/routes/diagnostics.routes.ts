import { Router } from 'express';
import { db } from '../config/firebase.js';

const router = Router();

// Mantém mesma funcionalidade da antiga /api/firestore-test
router.post('/firestore-test', async (_req, res) => {
  try {
    const ref = db.collection('initial_checks').doc();
    const payload = { createdAt: new Date().toISOString(), status: 'ok' };
    await ref.set(payload);
    return res.status(201).json({ id: ref.id, ...payload });
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
