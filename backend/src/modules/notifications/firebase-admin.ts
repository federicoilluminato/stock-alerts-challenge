import admin from 'firebase-admin';
import { env } from '../../config/env.js';

let firebaseApp: admin.app.App | null = null;

export const getFirebaseApp = (): admin.app.App => {
  if (firebaseApp) {
    return firebaseApp;
  }

  if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
    console.warn('[firebase] Firebase credentials not configured. FCM notifications will be skipped.');
    firebaseApp = null as unknown as admin.app.App;
    return firebaseApp;
  }

  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    console.info('[firebase] Firebase Admin SDK initialized');
  } catch (error) {
    console.error('[firebase] Failed to initialize Firebase Admin SDK:', error);
    throw error;
  }

  return firebaseApp;
};

export const sendFcmNotification = async (
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> => {
  const app = getFirebaseApp();

  if (!app) {
    console.warn('[firebase] Firebase not initialized, skipping FCM notification');
    return;
  }

  try {
    await admin.messaging().send({
      token,
      notification: { title, body },
      data,
    });
  } catch (error) {
    console.error('[firebase] Failed to send FCM notification:', error);
  }
};
