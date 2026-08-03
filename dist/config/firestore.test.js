import { describe, expect, it } from 'vitest';
import { serializeFirestoreData } from './firestore.js';
describe('serializeFirestoreData', () => {
    it('converts Firestore timestamps to Dates', () => {
        const input = {
            id: 'task-1',
            createdAt: { toDate: () => new Date('2024-01-01T00:00:00.000Z') },
            nested: {
                updatedAt: { toDate: () => new Date('2024-01-02T00:00:00.000Z') },
            },
        };
        const result = serializeFirestoreData(input);
        expect(result.id).toBe('task-1');
        expect(result.createdAt).toBeInstanceOf(Date);
        expect(result.nested.updatedAt).toBeInstanceOf(Date);
    });
});
//# sourceMappingURL=firestore.test.js.map