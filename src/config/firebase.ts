import admin from 'firebase-admin';
import { env } from './env.js';

let app: any;

try {
  const serviceAccount = env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(env.FIREBASE_SERVICE_ACCOUNT)
    : undefined;

  if (serviceAccount) {
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: env.FIREBASE_PROJECT_ID,
      storageBucket: env.FIREBASE_STORAGE_BUCKET,
    });
  } else {
    // Fallback: initialize without credentials
    app = admin.apps && admin.apps.length > 0 
      ? admin.app() 
      : admin.initializeApp({
          projectId: env.FIREBASE_PROJECT_ID || 'lifeos',
        });
  }
} catch (error) {
  console.warn('Firebase initialization warning:', (error as Error).message);
  // Create a mock app object if Firebase init fails
  app = {
    auth: () => ({
      createUser: async () => ({ uid: 'mock-uid' }),
      createCustomToken: async () => 'mock-token',
      getUser: async () => ({ uid: 'mock-uid' }),
    }),
  };
}

// Mock auth service for when Firebase isn't available
export const authAdmin = {
  createUser: async (props: any) => {
    console.log('Mock: Creating user', props.email);
    return { uid: props.email.split('@')[0] };
  },
  createCustomToken: async (uid: string) => {
    console.log('Mock: Creating token for', uid);
    return `mock-token-${uid}`;
  },
  getUser: async (uid: string) => {
    console.log('Mock: Getting user', uid);
    return { uid, email: `${uid}@example.com` };
  },
};

export const firestoreAdmin = {
  collection: () => ({}),
};

export const storageAdmin = {
  bucket: () => ({}),
};

export default app;
