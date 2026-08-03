// =============================================================
// Life OS — Firestore-backed compatibility layer
// Keeps the existing Prisma-style API shape while using Firestore
// =============================================================
import { firestoreAdmin } from './firebase.js';
import { serializeFirestoreData } from './firestore.js';
const COLLECTIONS = {
    user: 'users',
    task: 'tasks',
    project: 'projects',
    note: 'notes',
    habit: 'habits',
    calendarEvent: 'calendarEvents',
    tag: 'tags',
    taskTag: 'taskTags',
    noteTag: 'noteTags',
    comment: 'comments',
    attachment: 'attachments',
    activityLog: 'activityLogs',
    userStats: 'userStats',
    achievement: 'achievements',
    userAchievement: 'userAchievements',
    pomodoroLog: 'pomodoroLogs',
    goal: 'goals',
    goalMilestone: 'goalMilestones',
    refreshToken: 'refreshTokens',
    taskDependency: 'taskDependencies',
};
function getCollectionRef(name) {
    return firestoreAdmin.collection(COLLECTIONS[name] || name);
}
function toPlainObject(data) {
    return serializeFirestoreData(data);
}
function getValue(record, field) {
    return record[field];
}
function matchesCondition(record, field, condition) {
    const value = getValue(record, field);
    if (condition === null || condition === undefined) {
        return value === condition;
    }
    if (typeof condition === 'object' && !Array.isArray(condition)) {
        const conditionObj = condition;
        if ('gte' in conditionObj && value !== undefined && value !== null && value >= conditionObj.gte)
            return true;
        if ('lte' in conditionObj && value !== undefined && value !== null && value <= conditionObj.lte)
            return true;
        if ('lt' in conditionObj && value !== undefined && value !== null && value < conditionObj.lt)
            return true;
        if ('gt' in conditionObj && value !== undefined && value !== null && value > conditionObj.gt)
            return true;
        if ('in' in conditionObj && Array.isArray(conditionObj.in))
            return conditionObj.in.includes(value);
        if ('notIn' in conditionObj && Array.isArray(conditionObj.notIn))
            return !conditionObj.notIn.includes(value);
        if ('contains' in conditionObj && typeof value === 'string' && typeof conditionObj.contains === 'string') {
            return value.toLowerCase().includes(conditionObj.contains.toLowerCase());
        }
        if ('startsWith' in conditionObj && typeof value === 'string' && typeof conditionObj.startsWith === 'string') {
            return value.toLowerCase().startsWith(conditionObj.startsWith.toLowerCase());
        }
        if ('endsWith' in conditionObj && typeof value === 'string' && typeof conditionObj.endsWith === 'string') {
            return value.toLowerCase().endsWith(conditionObj.endsWith.toLowerCase());
        }
    }
    return value === condition;
}
function matchesWhere(record, where) {
    if (!where)
        return true;
    for (const [key, condition] of Object.entries(where)) {
        if (key === 'OR' && Array.isArray(condition)) {
            const matchesAny = condition.some((entry) => matchesWhere(record, entry));
            if (!matchesAny)
                return false;
            continue;
        }
        if (key === 'AND' && Array.isArray(condition)) {
            const matchesAll = condition.every((entry) => matchesWhere(record, entry));
            if (!matchesAll)
                return false;
            continue;
        }
        if (typeof condition === 'object' && condition !== null && !Array.isArray(condition)) {
            if (!matchesCondition(record, key, condition))
                return false;
        }
        else if (!matchesCondition(record, key, condition)) {
            return false;
        }
    }
    return true;
}
function applySelect(data, select) {
    if (!select)
        return data;
    const output = {};
    for (const [key, include] of Object.entries(select)) {
        if (include)
            output[key] = data[key];
    }
    return output;
}
function applyInclude(data, include) {
    if (!include)
        return data;
    if (include._count && typeof include._count === 'object') {
        const countSelect = include._count.select;
        const counts = {};
        if (countSelect) {
            for (const [key] of Object.entries(countSelect)) {
                counts[key] = 0;
            }
        }
        return { ...data, _count: counts };
    }
    return data;
}
function sortRecords(records, orderBy) {
    if (!orderBy)
        return records;
    const entries = Array.isArray(orderBy) ? orderBy : [orderBy];
    const sorted = [...records];
    for (let index = entries.length - 1; index >= 0; index -= 1) {
        const entry = entries[index];
        const [field, config] = Object.entries(entry)[0] || [];
        if (!field)
            continue;
        sorted.sort((a, b) => {
            const left = a[field];
            const right = b[field];
            const direction = typeof config === 'string' ? config : config.sort;
            const nullsLast = typeof config === 'object' && config !== null && config.nulls === 'last';
            if (left == null && right == null)
                return 0;
            if (left == null)
                return nullsLast ? 1 : -1;
            if (right == null)
                return nullsLast ? -1 : 1;
            if (left < right)
                return direction === 'desc' ? 1 : -1;
            if (left > right)
                return direction === 'desc' ? -1 : 1;
            return 0;
        });
    }
    return sorted;
}
async function getAllDocs(name) {
    const snapshot = await getCollectionRef(name).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...toPlainObject(doc.data()) }));
}
async function findMatchingDocs(modelName, options = {}) {
    const { where, orderBy, skip = 0, take, include, select } = options;
    let docs = await getAllDocs(COLLECTIONS[modelName] || modelName);
    if (where) {
        docs = docs.filter((doc) => matchesWhere(doc, where));
    }
    docs = sortRecords(docs, orderBy);
    if (typeof skip === 'number')
        docs = docs.slice(skip);
    if (typeof take === 'number')
        docs = docs.slice(0, take);
    return docs.map((doc) => {
        const withInclude = applyInclude(doc, include);
        return applySelect(withInclude, select);
    });
}
function buildPayload(data) {
    return {
        ...data,
        createdAt: data.createdAt ?? new Date(),
        updatedAt: data.updatedAt ?? new Date(),
    };
}
function createModel(name) {
    return {
        async findMany(options = {}) {
            return findMatchingDocs(name, options);
        },
        async findFirst(options = {}) {
            const docs = await findMatchingDocs(name, options);
            return docs[0] ?? null;
        },
        async findUnique(options = {}) {
            const where = options.where;
            if (where && typeof where === 'object' && !Array.isArray(where)) {
                const entries = Object.entries(where);
                if (entries.length === 1 && typeof entries[0][1] !== 'object') {
                    const [field, value] = entries[0];
                    const docs = await findMatchingDocs(name, { where: { [field]: value } });
                    return docs[0] ?? null;
                }
            }
            const docs = await findMatchingDocs(name, options);
            return docs[0] ?? null;
        },
        async create({ data, include, select } = {}) {
            const payload = buildPayload(data);
            const ref = getCollectionRef(COLLECTIONS[name] || name).doc();
            await ref.set(payload);
            const snapshot = await ref.get();
            const record = { id: ref.id, ...toPlainObject(snapshot.data()) };
            const withInclude = applyInclude(record, include);
            return applySelect(withInclude, select);
        },
        async update({ where, data } = {}) {
            const docs = await findMatchingDocs(name, { where: where });
            const target = docs[0];
            if (!target)
                return null;
            const ref = getCollectionRef(COLLECTIONS[name] || name).doc(String(target.id));
            const payload = { ...data, updatedAt: new Date() };
            await ref.update(payload);
            const snapshot = await ref.get();
            return { id: snapshot.id, ...toPlainObject(snapshot.data()) };
        },
        async delete({ where } = {}) {
            const docs = await findMatchingDocs(name, { where: where });
            for (const doc of docs) {
                await getCollectionRef(COLLECTIONS[name] || name).doc(String(doc.id)).delete();
            }
            return undefined;
        },
        async deleteMany({ where } = {}) {
            const docs = await findMatchingDocs(name, { where: where });
            for (const doc of docs) {
                await getCollectionRef(COLLECTIONS[name] || name).doc(String(doc.id)).delete();
            }
            return { count: docs.length };
        },
        async updateMany({ where, data } = {}) {
            const docs = await findMatchingDocs(name, { where: where });
            for (const doc of docs) {
                const ref = getCollectionRef(COLLECTIONS[name] || name).doc(String(doc.id));
                await ref.update({ ...data, updatedAt: new Date() });
            }
            return { count: docs.length };
        },
        async count({ where } = {}) {
            const docs = await findMatchingDocs(name, { where: where });
            return docs.length;
        },
        async aggregate({ where, _max, _sum } = {}) {
            const docs = await findMatchingDocs(name, { where: where });
            const result = {};
            if (_max && typeof _max === 'object') {
                for (const [field] of Object.entries(_max)) {
                    const values = docs.map((doc) => doc[field]).filter((value) => value !== null && value !== undefined);
                    result._max = { [field]: values.length ? Math.max(...values.map((value) => Number(value))) : null };
                }
            }
            if (_sum && typeof _sum === 'object') {
                for (const [field] of Object.entries(_sum)) {
                    const total = docs.reduce((sum, doc) => sum + Number(doc[field] || 0), 0);
                    result._sum = { [field]: total };
                }
            }
            return result;
        },
        async createMany({ data } = {}) {
            const rows = Array.isArray(data) ? data : [];
            for (const row of rows) {
                await this.create({ data: row });
            }
            return { count: rows.length };
        },
        async upsert({ where, create, update } = {}) {
            const existing = await this.findFirst({ where });
            if (existing) {
                return this.update({ where, data: update });
            }
            return this.create({ data: create });
        },
        async groupBy({ by, where } = {}) {
            const docs = await findMatchingDocs(name, { where: where });
            const groups = new Map();
            for (const doc of docs) {
                const key = String(doc[by[0]] ?? 'null');
                groups.set(key, (groups.get(key) || 0) + 1);
            }
            return Array.from(groups.entries()).map(([projectId, _count]) => ({ [by[0]]: projectId, _count }));
        },
        async $transaction(operations) {
            for (const operation of operations) {
                await operation;
            }
            return undefined;
        },
    };
}
const prisma = new Proxy({}, {
    get(_target, prop) {
        if (prop === '$transaction') {
            return async (operations) => {
                for (const operation of operations)
                    await operation;
            };
        }
        return createModel(prop);
    },
});
export const firestore = prisma;
export default prisma;
//# sourceMappingURL=database.js.map