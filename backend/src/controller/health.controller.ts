import type { Request, Response } from 'express';
import { db, firebaseApp } from '../config/firebase.js';

export async function getHealth(_req: Request, res: Response) {
  const requiredEnv = ['FIREBASE_CREDENTIALS_FILE'];
  const present = requiredEnv.filter((v) => !!process.env[v as keyof NodeJS.ProcessEnv]);
  const missing = requiredEnv.filter((v) => !process.env[v as keyof NodeJS.ProcessEnv]);
  const usingFile = !!process.env.FIREBASE_CREDENTIALS_FILE;
  const usingADC = !usingFile && missing.length > 0 && !!process.env.GOOGLE_APPLICATION_CREDENTIALS;

  try {
    const collections = await db.listCollections();
    return res.status(200).json({
      ok: true,
      firebase: true,
      projectId: (firebaseApp.options as any).projectId || null,
      collections: collections.map((c: any) => c.id),
      env: {
        present,
        missing,
        usingFile,
        usingADC,
        googleAppCred: process.env.GOOGLE_APPLICATION_CREDENTIALS || null,
      },
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      firebase: false,
      error: (e as Error).message,
      env: {
        present,
        missing,
        usingFile,
        usingADC,
        googleAppCred: process.env.GOOGLE_APPLICATION_CREDENTIALS || null,
      },
    });
  }
}

export async function getSpeedtest(_req: Request, res: Response) {
  try {
    const start = Date.now();
    const ref = db.collection('speedtest').doc('test');
    await ref.set({ timestamp: new Date().toISOString() });
    const doc = await ref.get();
    const end = Date.now();
    const latency = end - start;

    return res.status(200).json({
      ok: true,
      latencyMs: latency,
      data: doc.exists ? doc.data() : null,
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: (e as Error).message,
    });
  }
}