import { configDotenv } from 'dotenv';
import 'dotenv/config';
import { initializeApp, applicationDefault, cert, getApps, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore, CollectionReference, type DocumentData } from 'firebase-admin/firestore';
configDotenv();

const unquote = (val?: string) => (val ? val.replace(/^['"]|['"]$/g, '') : undefined);
const parsePrivateKey = (key?: string) => (key ? key.replace(/\\n/g, '\n') : undefined);

const buildCredentialFromEnv = () => {
  const project_id = unquote(process.env.FIREBASE_PROJECT_ID);
  const client_email = unquote(process.env.FIREBASE_CLIENT_EMAIL);
  const private_key = parsePrivateKey(unquote(process.env.FIREBASE_PRIVATE_KEY));

  if (!project_id || !client_email || !private_key) return undefined;

  return {
    type: unquote(process.env.FIREBASE_TYPE) ?? 'service_account',
    project_id,
    private_key_id: unquote(process.env.FIREBASE_PRIVATE_KEY_ID),
    private_key,
    client_email,
    client_id: unquote(process.env.FIREBASE_CLIENT_ID),
    auth_uri: unquote(process.env.FIREBASE_AUTH_URI),
    token_uri: unquote(process.env.FIREBASE_TOKEN_URI),
    auth_provider_x509_cert_url: unquote(process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL),
    client_x509_cert_url: unquote(process.env.FIREBASE_CLIENT_X509_CERT_URL),
    universe_domain: unquote(process.env.FIREBASE_UNIVERSE_DOMAIN),
  };
};

function initFirebase(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const credentialFromEnv = buildCredentialFromEnv();
  if (credentialFromEnv) {
    return initializeApp({
      credential: cert(credentialFromEnv as any),
      projectId: credentialFromEnv.project_id,
    });
  }

  return initializeApp({ credential: applicationDefault() });
}

export const firebaseApp: App = initFirebase();
export const auth: Auth = getAuth(firebaseApp);
export const db: Firestore = getFirestore(firebaseApp);

export const col = <T = DocumentData>(name: string): CollectionReference<T> =>
  db.collection(name) as CollectionReference<T>;
