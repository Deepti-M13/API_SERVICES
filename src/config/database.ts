// =============================================================
// Life OS — Firestore-backed compatibility layer
// Keeps the existing Prisma-style API shape while using Firestore
// =============================================================

import { firestoreAdmin } from './firebase.js';

const COLLECTIONS: Record<string, string> = {
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

function getCollectionRef(name: string) {
  return firestoreAdmin.collection(COLLECTIONS[name] || name);
}

function toPlainObject(data: Record<string, unknown>) {
  return data as Record<string, unknown>;
}

function getValue(record: Record<string, unknown>, field: string) {
  return record[field];
}

function matchesCondition(record: Record<string, unknown>, field: string, condition: unknown) {
  const value = getValue(record, field);

  if (condition === null || condition === undefined) {
    return value === condition;
  }

  if (typeof condition === 'object' && !Array.isArray(condition)) {
    const conditionObj = condition as Record<string, unknown>;

    if ('gte' in conditionObj && value !== undefined && value !== null && value >= conditionObj.gte) return true;
    if ('lte' in conditionObj && value !== undefined && value !== null && value <= conditionObj.lte) return true;
    if ('lt' in conditionObj && value !== undefined && value !== null && value < conditionObj.lt) return true;
    if ('gt' in conditionObj && value !== undefined && value !== null && value > conditionObj.gt) return true;
    if ('in' in conditionObj && Array.isArray(conditionObj.in)) return conditionObj.in.includes(value);
    if ('notIn' in conditionObj && Array.isArray(conditionObj.notIn)) return !conditionObj.notIn.includes(value);
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

function matchesWhere(record: Record<string, unknown>, where: Record<string, unknown> | undefined) {
  if (!where) return true;

  for (const [key, condition] of Object.entries(where)) {
    if (key === 'OR' && Array.isArray(condition)) {
      const matchesAny = condition.some((entry) => matchesWhere(record, entry as Record<string, unknown>));
      if (!matchesAny) return false;
      continue;
    }

    if (key === 'AND' && Array.isArray(condition)) {
      const matchesAll = condition.every((entry) => matchesWhere(record, entry as Record<string, unknown>));
      if (!matchesAll) return false;
      continue;
    }

    if (typeof condition === 'object' && condition !== null && !Array.isArray(condition)) {
      if (!matchesCondition(record, key, condition)) return false;
    } else if (!matchesCondition(record, key, condition)) {
      return false;
    }
  }

  return true;
}

function applySelect(data: Record<string, unknown>, select: Record<string, unknown> | undefined) {
  if (!select) return data;
  const output: Record<string, unknown> = {};
  for (const [key, include] of Object.entries(select)) {
    if (include) output[key] = data[key];
  }
  return output;
}

function applyInclude(data: Record<string, unknown>, include: Record<string, unknown> | undefined) {
  if (!include) return data;

  if (include._count && typeof include._count === 'object') {
    const countSelect = (include._count as Record<string, unknown>).select as Record<string, unknown> | undefined;
    const counts: Record<string, number> = {};
    if (countSelect) {
      for (const [key] of Object.entries(countSelect)) {
        counts[key] = 0;
      }
    }
    return { ...data, _count: counts };
  }

  return data;
}

function sortRecords(records: Array<Record<string, unknown> & { id?: string }>, orderBy: unknown) {
  if (!orderBy) return records;

  const entries = Array.isArray(orderBy) ? orderBy : [orderBy];
  const sorted = [...records];

  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index] as Record<string, unknown>;
    const [field, config] = Object.entries(entry)[0] || [];
    if (!field) continue;

    sorted.sort((a, b) => {
      const left = a[field as string];
      const right = b[field as string];
      const direction = typeof config === 'string' ? config : (config as Record<string, unknown>).sort;
      const nullsLast = typeof config === 'object' && config !== null && (config as Record<string, unknown>).nulls === 'last';

      if (left == null && right == null) return 0;
      if (left == null) return nullsLast ? 1 : -1;
      if (right == null) return nullsLast ? -1 : 1;

      if (left < right) return direction === 'desc' ? 1 : -1;
      if (left > right) return direction === 'desc' ? -1 : 1;
      return 0;
    });
  }

  return sorted;
}

async function getAllDocs(name: string) {
  const snapshot = await getCollectionRef(name).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...toPlainObject(doc.data() as Record<string, unknown>) }));
}

async function findMatchingDocs(modelName: string, options: Record<string, unknown> = {}) {
  const { where, orderBy, skip = 0, take, include, select } = options;
  let docs = await getAllDocs(COLLECTIONS[modelName] || modelName);

  if (where) {
    docs = docs.filter((doc) => matchesWhere(doc, where as Record<string, unknown>));
  }

  docs = sortRecords(docs as Record<string, unknown>[], orderBy as unknown) as any[];

  if (typeof skip === 'number') docs = docs.slice(skip);
  if (typeof take === 'number') docs = docs.slice(0, take);

  return docs.map((doc: any) => {
    const withInclude = applyInclude(doc, include as Record<string, unknown> | undefined);
    return applySelect(withInclude, select as Record<string, unknown> | undefined);
  });
}

function buildPayload(data: Record<string, unknown>) {
  return {
    ...data,
    createdAt: data.createdAt ?? new Date(),
    updatedAt: data.updatedAt ?? new Date(),
  };
}

function createModel(name: string) {
  return {
    async findMany(options: Record<string, unknown> = {}) {
      return findMatchingDocs(name, options);
    },
    async findFirst(options: Record<string, unknown> = {}) {
      const docs = await findMatchingDocs(name, options);
      return docs[0] ?? null;
    },
    async findUnique(options: Record<string, unknown> = {}) {
      const where = options.where as Record<string, unknown> | undefined;
      if (where && typeof where === 'object' && !Array.isArray(where)) {
        const entries = Object.entries(where);
        if (entries.length === 1 && typeof entries[0][1] !== 'object') {
          const [field, value] = entries[0];
          const docs = await findMatchingDocs(name, { where: { [field]: value } as Record<string, unknown> });
          return docs[0] ?? null;
        }
      }
      const docs = await findMatchingDocs(name, options);
      return docs[0] ?? null;
    },
    async create({ data, include, select }: Record<string, unknown> = {}) {
      const payload = buildPayload(data as Record<string, unknown>);
      const ref = getCollectionRef(COLLECTIONS[name] || name).doc();
      await ref.set(payload);
      const snapshot = await ref.get();
      const record = { id: ref.id, ...toPlainObject(snapshot.data() as Record<string, unknown>) };
      const withInclude = applyInclude(record, include as Record<string, unknown> | undefined);
      return applySelect(withInclude, select as Record<string, unknown> | undefined);
    },
    async update({ where, data }: Record<string, unknown> = {}) {
      const docs = await findMatchingDocs(name, { where: where as Record<string, unknown> });
      const target = docs[0];
      if (!target) return null;
      const ref = getCollectionRef(COLLECTIONS[name] || name).doc(String(target.id));
      const payload = { ...(data as Record<string, unknown>), updatedAt: new Date() };
      await ref.update(payload);
      const snapshot = await ref.get();
      return { id: snapshot.id, ...toPlainObject(snapshot.data() as Record<string, unknown>) };
    },
    async delete({ where }: Record<string, unknown> = {}) {
      const docs = await findMatchingDocs(name, { where: where as Record<string, unknown> });
      for (const doc of docs) {
        await getCollectionRef(COLLECTIONS[name] || name).doc(String(doc.id)).delete();
      }
      return undefined;
    },
    async deleteMany({ where }: Record<string, unknown> = {}) {
      const docs = await findMatchingDocs(name, { where: where as Record<string, unknown> });
      for (const doc of docs) {
        await getCollectionRef(COLLECTIONS[name] || name).doc(String(doc.id)).delete();
      }
      return { count: docs.length };
    },
    async updateMany({ where, data }: Record<string, unknown> = {}) {
      const docs = await findMatchingDocs(name, { where: where as Record<string, unknown> });
      for (const doc of docs) {
        const ref = getCollectionRef(COLLECTIONS[name] || name).doc(String(doc.id));
        await ref.update({ ...(data as Record<string, unknown>), updatedAt: new Date() });
      }
      return { count: docs.length };
    },
    async count({ where }: Record<string, unknown> = {}) {
      const docs = await findMatchingDocs(name, { where: where as Record<string, unknown> });
      return docs.length;
    },
    async aggregate({ where, _max, _sum }: Record<string, unknown> = {}) {
      const docs = await findMatchingDocs(name, { where: where as Record<string, unknown> });
      const result: Record<string, unknown> = {};
      if (_max && typeof _max === 'object') {
        for (const [field] of Object.entries(_max as Record<string, unknown>)) {
          const values = docs.map((doc) => doc[field] as number | Date | null).filter((value) => value !== null && value !== undefined);
          result._max = { [field]: values.length ? Math.max(...values.map((value) => Number(value))) : null };
        }
      }
      if (_sum && typeof _sum === 'object') {
        for (const [field] of Object.entries(_sum as Record<string, unknown>)) {
          const total = docs.reduce((sum, doc) => sum + Number(doc[field] || 0), 0);
          result._sum = { [field]: total };
        }
      }
      return result;
    },
    async createMany({ data }: Record<string, unknown> = {}) {
      const rows = Array.isArray(data) ? data : [];
      for (const row of rows) {
        await this.create({ data: row });
      }
      return { count: rows.length };
    },
    async upsert({ where, create, update }: Record<string, unknown> = {}) {
      const existing = await this.findFirst({ where });
      if (existing) {
        return this.update({ where, data: update });
      }
      return this.create({ data: create });
    },
    async groupBy({ by, where }: Record<string, unknown> = {}) {
      const docs = await findMatchingDocs(name, { where: where as Record<string, unknown> });
      const groups = new Map<string, number>();
      for (const doc of docs) {
        const key = String(doc[by[0] as string] ?? 'null');
        groups.set(key, (groups.get(key) || 0) + 1);
      }
      return Array.from(groups.entries()).map(([projectId, _count]) => ({ [by[0] as string]: projectId, _count }));
    },
    async $transaction(operations: Array<Promise<unknown>>) {
      for (const operation of operations) {
        await operation;
      }
      return undefined;
    },
  };
}

const prisma: any = new Proxy({}, {
  get(_target, prop: string) {
    if (prop === '$transaction') {
      return async (operations: Array<Promise<unknown>>) => {
        for (const operation of operations) await operation;
      };
    }
    return createModel(prop);
  },
});

export const firestore = prisma;
export default prisma;
