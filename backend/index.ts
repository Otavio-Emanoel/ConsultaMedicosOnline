import 'dotenv/config';
import { db, firebaseApp } from './src/config/firebase.js';
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

// Health detalhado
app.get('/api/health', async (_req, res) => {
  const requiredEnv = ['FIREBASE_CREDENTIALS_FILE'];
  const present = requiredEnv.filter((v) => !!process.env[v]);
  const missing = requiredEnv.filter((v) => !process.env[v]);
  const usingFile = !!process.env.FIREBASE_CREDENTIALS_FILE;
  const usingADC = !usingFile && missing.length > 0 && !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
  try {
  const collections = await db.listCollections();
    return res.status(200).json({
      ok: true,
      firebase: true,
      projectId: firebaseApp.options.projectId || null,
  collections: collections.map((c: any) => c.id),
      env: { present, missing, usingFile, usingADC, googleAppCred: process.env.GOOGLE_APPLICATION_CREDENTIALS || null },
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      firebase: false,
      error: (e as Error).message,
      env: { present, missing, usingFile, usingADC, googleAppCred: process.env.GOOGLE_APPLICATION_CREDENTIALS || null },
    });
  }
});

app.listen(PORT, () => {
  console.log(`o servidor ta rodando http://localhost:${PORT}`);
});