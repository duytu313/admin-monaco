import * as admin from 'firebase-admin';

let adminApp: admin.app.App | null = null;

export function getAdminApp(): admin.app.App {
  if (!adminApp) {
    if (admin.apps.length > 0) {
      adminApp = admin.apps[0]!;
    } else {
      let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
      privateKey = privateKey.replace(/\\n/g, '\n');
      privateKey = privateKey.replace(/^["']|["']$/g, '');

      adminApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      });
    }
  }
  return adminApp;
}

export function getAdminRTDB(): admin.database.Database {
  return getAdminApp().database();
}