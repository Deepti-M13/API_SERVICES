import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { env } from './env.js';
const adminAny = admin;
function initializeAdminApp() {
    if (adminAny.apps?.length > 0) {
        return adminAny.app();
    }
    const serviceAccount = env.FIREBASE_SERVICE_ACCOUNT
        ? JSON.parse(env.FIREBASE_SERVICE_ACCOUNT)
        : undefined;
    if (serviceAccount) {
        return adminAny.initializeApp({
            credential: adminAny.credential.cert(serviceAccount),
            projectId: env.FIREBASE_PROJECT_ID,
            storageBucket: env.FIREBASE_STORAGE_BUCKET,
        });
    }
    if (env.FIREBASE_PROJECT_ID) {
        return adminAny.initializeApp({
            projectId: env.FIREBASE_PROJECT_ID,
            storageBucket: env.FIREBASE_STORAGE_BUCKET,
        });
    }
    return adminAny.initializeApp();
}
const app = initializeAdminApp();
export const firestoreAdmin = getFirestore(app);
export const storageAdmin = getStorage(app);
export const authAdmin = adminAny.auth();
export default app;
//# sourceMappingURL=firebase.js.map