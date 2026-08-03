import { FieldValue } from 'firebase-admin/firestore';
import { firestoreAdmin } from './firebase.js';

export type FirestoreTimestamp = { toDate: () => Date };

export function serializeFirestoreData<T>(value: T): T {
  if (value && typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.map((item) => serializeFirestoreData(item)) as T;
    }

    if ('toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
      return new Date((value as FirestoreTimestamp).toDate()) as T;
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [key, serializeFirestoreData(nestedValue)]),
    ) as T;
  }

  return value;
}

export function getCollectionRef(collectionName: string) {
  return firestoreAdmin.collection(collectionName);
}

export async function createDocument<T extends Record<string, unknown>>(collectionName: string, data: T) {
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

export async function getDocumentById<T>(collectionName: string, id: string) {
  const snapshot = await getCollectionRef(collectionName).doc(id).get();
  if (!snapshot.exists) return null;
  return { id: snapshot.id, ...serializeFirestoreData(snapshot.data() as T) };
}

export async function listDocuments<T>(collectionName: string, filters: Array<{ field: string; operator: FirebaseFirestore.WhereFilterOp; value: unknown }> = []) {
  let query: FirebaseFirestore.Query = getCollectionRef(collectionName);

  for (const filter of filters) {
    query = query.where(filter.field, filter.operator, filter.value);
  }

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...serializeFirestoreData(doc.data() as T) }));
}

export async function updateDocument<T extends Record<string, unknown>>(collectionName: string, id: string, data: Partial<T>) {
  const ref = getCollectionRef(collectionName).doc(id);
  await ref.update({
    ...data,
    updatedAt: FieldValue.serverTimestamp(),
  });
  const snapshot = await ref.get();
  return { id: snapshot.id, ...serializeFirestoreData(snapshot.data() as T) };
}

export async function deleteDocument(collectionName: string, id: string) {
  await getCollectionRef(collectionName).doc(id).delete();
}

export async function queryDocuments<T>(collectionName: string, queryBuilder: (ref: FirebaseFirestore.CollectionReference) => FirebaseFirestore.Query) {
  const snapshot = await queryBuilder(getCollectionRef(collectionName)).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...serializeFirestoreData(doc.data() as T) }));
}

export async function upsertDocument<T extends Record<string, unknown>>(collectionName: string, id: string, data: Partial<T>) {
  const ref = getCollectionRef(collectionName).doc(id);
  const payload = {
    ...data,
    updatedAt: FieldValue.serverTimestamp(),
  };
  await ref.set(payload, { merge: true });
  const snapshot = await ref.get();
  return { id: snapshot.id, ...serializeFirestoreData(snapshot.data() as T) };
}
