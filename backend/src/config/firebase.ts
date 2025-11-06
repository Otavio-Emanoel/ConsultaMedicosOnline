import 'dotenv/config';
import { initializeApp, applicationDefault, cert, getApps, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore, CollectionReference, type DocumentData } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'node:fs';

const unquote = (val?: string) => (val ? val.replace(/^['"]|['"]$/g, '') : undefined);
const parsePrivateKey = (key?: string) => (key ? key.replace(/\\n/g, '\n') : undefined);

function initFirebase(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  // 1) Prefer JSON de credenciais via arquivo
  const credFile = unquote(process.env.FIREBASE_CREDENTIALS_FILE);
  if (credFile && existsSync(credFile)) {
    const json = JSON.parse(readFileSync(credFile, 'utf8')) as {
      project_id: string;
      client_email: string;
      private_key: string;
      [k: string]: unknown;
    };
    return initializeApp({
      credential: cert(json as any),
      projectId: json.project_id,
    });
  }

  // 2) Variáveis individuais
  const projectId = unquote(process.env.FIREBASE_PROJECT_ID);
  const clientEmail = unquote(process.env.FIREBASE_CLIENT_EMAIL);
  const privateKey = parsePrivateKey(unquote(process.env.FIREBASE_PRIVATE_KEY));
  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
    });
  }

  // 3) Fallback: GOOGLE_APPLICATION_CREDENTIALS / ADC
  return initializeApp({ credential: applicationDefault() });
}

export const firebaseApp: App = initFirebase();
export const auth: Auth = getAuth(firebaseApp);
export const db: Firestore = getFirestore(firebaseApp);

export const col = <T = DocumentData>(name: string): CollectionReference<T> =>
  db.collection(name) as CollectionReference<T>;
