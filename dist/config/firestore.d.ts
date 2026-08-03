export type FirestoreTimestamp = {
    toDate: () => Date;
};
export declare function serializeFirestoreData<T>(value: T): T;
export declare function getCollectionRef(collectionName: string): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData, FirebaseFirestore.DocumentData>;
export declare function createDocument<T extends Record<string, unknown>>(collectionName: string, data: T): Promise<{
    id: string;
}>;
export declare function getDocumentById<T>(collectionName: string, id: string): Promise<{
    id: string;
} & T>;
export declare function listDocuments<T>(collectionName: string, filters?: Array<{
    field: string;
    operator: FirebaseFirestore.WhereFilterOp;
    value: unknown;
}>): Promise<({
    id: string;
} & T)[]>;
export declare function updateDocument<T extends Record<string, unknown>>(collectionName: string, id: string, data: Partial<T>): Promise<{
    id: string;
} & T>;
export declare function deleteDocument(collectionName: string, id: string): Promise<void>;
export declare function queryDocuments<T>(collectionName: string, queryBuilder: (ref: FirebaseFirestore.CollectionReference) => FirebaseFirestore.Query): Promise<({
    id: string;
} & T)[]>;
export declare function upsertDocument<T extends Record<string, unknown>>(collectionName: string, id: string, data: Partial<T>): Promise<{
    id: string;
} & T>;
