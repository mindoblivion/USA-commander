import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, Firestore } from 'firebase/firestore';

// Default configuration with environment variables fallback
const rawConfig = {
  projectId: "platinum-mystery-c2ts5",
  appId: "1:964131598578:web:53af8e8d8e6f159103e06b",
  apiKey: "AIzaSyA4XS5boU5fyyu_UVcF4tQTrllDKRD_TfI",
  authDomain: "platinum-mystery-c2ts5.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-commanderstrikeg-36d94168-1359-404b-8e2d-6f2981393289",
  storageBucket: "platinum-mystery-c2ts5.firebasestorage.app",
  messagingSenderId: "964131598578"
};

// Override with Vite standard environment variables if defined
export const firebaseConfig = {
  apiKey: (import.meta as { env?: Record<string, string> }).env?.VITE_FIREBASE_API_KEY || rawConfig.apiKey,
  authDomain: (import.meta as { env?: Record<string, string> }).env?.VITE_FIREBASE_AUTH_DOMAIN || rawConfig.authDomain,
  projectId: (import.meta as { env?: Record<string, string> }).env?.VITE_FIREBASE_PROJECT_ID || rawConfig.projectId,
  storageBucket: (import.meta as { env?: Record<string, string> }).env?.VITE_FIREBASE_STORAGE_BUCKET || rawConfig.storageBucket,
  messagingSenderId: (import.meta as { env?: Record<string, string> }).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || rawConfig.messagingSenderId,
  appId: (import.meta as { env?: Record<string, string> }).env?.VITE_FIREBASE_APP_ID || rawConfig.appId,
  firestoreDatabaseId: (import.meta as { env?: Record<string, string> }).env?.VITE_FIREBASE_DATABASE_ID || rawConfig.firestoreDatabaseId
};

let appInstance: FirebaseApp;
let firestoreInstance: Firestore;
let authInstance: Auth;

try {
  appInstance = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  // CRITICAL: The app uses custom database ID
  firestoreInstance = getFirestore(appInstance, firebaseConfig.firestoreDatabaseId);
  authInstance = getAuth(appInstance);
} catch (e) {
  console.warn('Firebase initialization note (running in local mode):', e);
  appInstance = {} as FirebaseApp;
  firestoreInstance = {} as Firestore;
  authInstance = {} as Auth;
}

export const app = appInstance;
export const db = firestoreInstance;
export const auth = authInstance;
export const googleProvider = new GoogleAuthProvider();

export async function testConnection(): Promise<boolean> {
  try {
    if (!db || typeof db !== 'object' || !('type' in db)) return false;
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firebase is in offline mode or network is unreachable.");
    }
    return false;
  }
}

