import { initializeApp, FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported, Analytics } from "firebase/analytics";
import { getDatabase, Database } from 'firebase/database';
import { getAuth, Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app: FirebaseApp = initializeApp(firebaseConfig);

let _db: Database | null = null;
let _auth: Auth | null = null;
let _analytics: Analytics | null = null;

// Chạy ngay trên browser
if (typeof window !== 'undefined') {
  try {
    _db = getDatabase(app);
    _auth = getAuth(app);
  } catch (e) {
    console.error('[Firebase] Init error:', e);
  }
  isSupported().then(supported => {
    if (supported) {
      try { _analytics = getAnalytics(app); } catch (e) { /* ignore */ }
    }
  });
}

export function getDb(): Database | null { return _db; }
export function getFirebaseAuth(): Auth | null { return _auth; }

// Export trực tiếp - các 'use client' component chạy hoàn toàn trên browser
export const db = _db as Database;
export const auth = _auth as Auth;
export const analytics = _analytics;
export { app };