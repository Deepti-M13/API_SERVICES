import { FieldValue } from 'firebase-admin/firestore';
import { firestoreAdmin } from './firebase.js';
export function serializeFirestoreData(value) {
    if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
            return value.map((item) => serializeFirestoreData(item));
        }
        if ('toDate' in value && typeof value.toDate === 'function') {
            return new Date(value.toDate());
        }
        return Object.fromEntries(Object.entries(value).map(([key, nestedValue]) => [key, serializeFirestoreData(nestedValue)]));
    }
    return value;
}
export function getCollectionRef(collectionName) {
    return firestoreAdmin.collection(collectionName);
}
export async function createDocument(collectionName, data) {
    const ref = getCollectionRef(collectionName).doc();
    const payload = {
        ...data,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    };
    await ref.set(payload);
    const snapshot = await ref.get();
    return { id: ref.id, ...serializeFirestoreData(snapshot.data()) };
}
export async function getDocumentById(collectionName, id) {
    const snapshot = await getCollectionRef(collectionName).doc(id).get();
    if (!snapshot.exists)
        return null;
    return { id: snapshot.id, ...serializeFirestoreData(snapshot.data()) };
}
export async function listDocuments(collectionName, filters = []) {
    let query = getCollectionRef(collectionName);
    for (const filter of filters) {
        query = query.where(filter.field, filter.operator, filter.value);
    }
    const snapshot = await query.get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...serializeFirestoreData(doc.data()) }));
}
export async function updateDocument(collectionName, id, data) {
    const ref = getCollectionRef(collectionName).doc(id);
    await ref.update({
        ...data,
        updatedAt: FieldValue.serverTimestamp(),
    });
    const snapshot = await ref.get();
    return { id: snapshot.id, ...serializeFirestoreData(snapshot.data()) };
}
export async function deleteDocument(collectionName, id) {
    await getCollectionRef(collectionName).doc(id).delete();
}
export async function queryDocuments(collectionName, queryBuilder) {
    const snapshot = await queryBuilder(getCollectionRef(collectionName)).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...serializeFirestoreData(doc.data()) }));
}
export async function upsertDocument(collectionName, id, data) {
    const ref = getCollectionRef(collectionName).doc(id);
    const payload = {
        ...data,
        updatedAt: FieldValue.serverTimestamp(),
    };
    await ref.set(payload, { merge: true });
    const snapshot = await ref.get();
    return { id: snapshot.id, ...serializeFirestoreData(snapshot.data()) };
}
//# sourceMappingURL=firestore.js.map