import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
const runtimeEnv = import.meta.env ?? process.env;
const firebaseConfig = {
    apiKey: runtimeEnv.VITE_FIREBASE_API_KEY ?? '',
    authDomain: runtimeEnv.VITE_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: runtimeEnv.VITE_FIREBASE_PROJECT_ID ?? '',
    storageBucket: runtimeEnv.VITE_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: runtimeEnv.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: runtimeEnv.VITE_FIREBASE_APP_ID ?? '',
};
export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firebaseDb = getFirestore(firebaseApp);
export const firebaseStorage = getStorage(firebaseApp);
//# sourceMappingURL=firebase-web.js.map