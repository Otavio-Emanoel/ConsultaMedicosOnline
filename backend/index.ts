import 'dotenv/config';
import { db } from './src/config/firebase.js';
import healthRoutes from './src/routes/health.routes.js';
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => { res.send('Hello, World!'); });

// Rota simples para testar escrita no Firestore
app.post('/api/firestore-test', async (_req, res) => {
  try {
    const ref = db.collection('initial_checks').doc();
    const payload = { createdAt: new Date().toISOString(), status: 'ok' };
    await ref.set(payload);
    return res.status(201).json({ id: ref.id, ...payload });
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }
});

// Agrupa rotas /api
app.use('/api', healthRoutes);

app.listen(PORT, () => {
  console.log(`o servidor ta rodando http://localhost:${PORT}`);
});