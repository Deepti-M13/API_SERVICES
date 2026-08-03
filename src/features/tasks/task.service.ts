// =============================================================
// Life OS — Task Service
// Core business logic for task management
// =============================================================

import prisma from '../../config/database.js';
import { cacheDel } from '../../config/redis.js';
import { NotFoundError, BadRequestError } from '../../core/errors/index.js';
import { buildPaginatedResponse } from '../../core/utils/index.js';
import type { CreateTaskInput, UpdateTaskInput, TaskQuery, CreateSubtaskInput, ReorderTasksInput } from './task.schema.js';

type TaskWhereInput = Record<string, any>;
type TaskOrderByWithRelationInput = Record<string, any>;
type TaskUpdateInput = Record<string, any>;

// Common include for task queries
const taskInclude = {
  tags: { include: { tag: true } },
  subtasks: {
    where: { deletedAt: null },
    orderBy: { sortOrder: 'asc' as const },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      dueDate: true,
      sortOrder: true,
      completedAt: true,
    },
  },
  project: { select: { id: true, name: true, color: true, icon: true } },
  _count: { select: { subtasks: true, comments: true, attachments: true } },
};

// ---- List Tasks ----

export async function listTasks(userId: string, query: TaskQuery) {
  const { page, limit, status, priority, projectId, parentId, isFavorite, isPinned,
    search, sortBy, sortOrder, dueBefore, dueAfter, includeArchived } = query;

  const skip = (page - 1) * limit;

  // Build where clause
  const where: TaskWhereInput = {
    userId,
    deletedAt: null,
    ...(parentId === null ? { parentId: null } : parentId ? { parentId } : { parentId: null }),
  };

  if (status) where.status = status;
  if (!status && !includeArchived) {
    where.status = { notIn: ['ARCHIVED', 'CANCELLED'] };
  }
  if (priority) where.priority = priority;
  if (projectId) where.projectId = projectId;
  if (isFavorite !== undefined) where.isFavorite = isFavorite;
  if (isPinned !== undefined) where.isPinned = isPinned;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (dueBefore || dueAfter) {
    where.dueDate = {};
    if (dueBefore) where.dueDate.lte = new Date(dueBefore);
    if (dueAfter) where.dueDate.gte = new Date(dueAfter);
  }

  // Build orderBy
  const orderBy: TaskOrderByWithRelationInput[] = [];
  // Pinned items always come first
  orderBy.push({ isPinned: 'desc' });

  if (sortBy === 'priority') {
    // Custom priority ordering
    orderBy.push({ priority: sortOrder });
  } else if (sortBy === 'dueDate') {
    // Null due dates at the end
    orderBy.push({ dueDate: { sort: sortOrder, nulls: 'last' } });
  } else {
    orderBy.push({ [sortBy]: sortOrder });
  }

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: taskInclude,
      orderBy,
      skip,
      take: limit,
    }),
    prisma.task.count({ where }),
  ]);

  // Transform tags
  const transformedTasks = tasks.map(transformTask);

  return buildPaginatedResponse(transformedTasks, total, page, limit);
}

// ---- Get Task ----

export async function getTask(userId: string, taskId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId, deletedAt: null },
    include: {
      ...taskInclude,
      comments: {
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      attachments: true,
      dependencies: { include: { dependency: { select: { id: true, title: true, status: true } } } },
      dependents: { include: { dependent: { select: { id: true, title: true, status: true } } } },
      pomodoroLogs: { orderBy: { completedAt: 'desc' }, take: 10 },
    },
  });

  if (!task) throw new NotFoundError('Task');

  return transformTask(task);
}

// ---- Create Task ----

export async function createTask(userId: string, input: CreateTaskInput) {
  const { tagIds, tagNames, ...taskData } = input;

  // Get max sort order for new task
  const maxOrder = await prisma.task.aggregate({
    where: { userId, parentId: input.parentId || null, deletedAt: null },
    _max: { sortOrder: true },
  });

  const task = await prisma.task.create({
    data: {
      ...taskData,
      richNotes: taskData.richNotes !== undefined ? (taskData.richNotes as any) : undefined,
      userId,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
      startDate: taskData.startDate ? new Date(taskData.startDate) : null,
      recurrenceEndDate: taskData.recurrenceEndDate ? new Date(taskData.recurrenceEndDate) : null,
      tags: tagIds?.length ? {
        create: tagIds.map((tagId) => ({ tagId })),
      } : tagNames?.length ? {
        create: await ensureTags(userId, tagNames),
      } : undefined,
    },
    include: taskInclude,
  });

  await cacheDel(`tasks:${userId}:*`);
  await cacheDel(`analytics:dashboard:${userId}`);

  // Log activity
  await prisma.activityLog.create({
    data: {
      action: 'TASK_CREATED',
      entityType: 'task',
      entityId: task.id,
      userId,
      metadata: { title: task.title },
    },
  });

  return transformTask(task);
}

// ---- Update Task ----

export async function updateTask(userId: string, taskId: string, input: UpdateTaskInput) {
  const existing = await prisma.task.findFirst({
    where: { id: taskId, userId, deletedAt: null },
  });

  if (!existing) throw new NotFoundError('Task');

  const { tagIds, tagNames, ...taskData } = input;

  // Handle completion
  const updateData: TaskUpdateInput = {
    ...taskData,
    richNotes: taskData.richNotes !== undefined ? (taskData.richNotes as any) : undefined,
    dueDate: taskData.dueDate !== undefined
      ? (taskData.dueDate ? new Date(taskData.dueDate) : null)
      : undefined,
    startDate: taskData.startDate !== undefined
      ? (taskData.startDate ? new Date(taskData.startDate) : null)
      : undefined,
    recurrenceEndDate: taskData.recurrenceEndDate !== undefined
      ? (taskData.recurrenceEndDate ? new Date(taskData.recurrenceEndDate) : null)
      : undefined,
  };

  // Auto-set completedAt when status changes to DONE
  if (taskData.status === 'DONE' && existing.status !== 'DONE') {
    updateData.completedAt = new Date();
    // Award XP
    await awardXpForCompletion(userId, existing.priority);
  } else if (taskData.status && taskData.status !== 'DONE' && existing.status === 'DONE') {
    updateData.completedAt = null;
  }

  // Handle tag updates
  if (tagIds !== undefined) {
    await prisma.taskTag.deleteMany({ where: { taskId } });
    if (tagIds.length > 0) {
      await prisma.taskTag.createMany({
        data: tagIds.map((tagId) => ({ taskId, tagId })),
      });
    }
  } else if (tagNames !== undefined) {
    await prisma.taskTag.deleteMany({ where: { taskId } });
    const tags = await ensureTags(userId, tagNames);
    if (tags.length > 0) {
      await prisma.taskTag.createMany({
        data: tags.map((t) => ({ taskId, tagId: t.tagId })),
      });
    }
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
    include: taskInclude,
  });

  await cacheDel(`tasks:${userId}:*`);
  await cacheDel(`analytics:dashboard:${userId}`);

  // Log activity
  await prisma.activityLog.create({
    data: {
      action: 'TASK_UPDATED',
      entityType: 'task',
      entityId: task.id,
      userId,
      metadata: { changes: Object.keys(input) },
    },
  });

  return transformTask(task);
}

// ---- Delete Task (Soft) ----

export async function deleteTask(userId: string, taskId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId, deletedAt: null },
  });

  if (!task) throw new NotFoundError('Task');

  // Soft delete task and subtasks
  await prisma.task.updateMany({
    where: {
      OR: [
        { id: taskId },
        { parentId: taskId },
      ],
      userId,
    },
    data: { deletedAt: new Date() },
  });

  await cacheDel(`tasks:${userId}:*`);
  await cacheDel(`analytics:dashboard:${userId}`);

  await prisma.activityLog.create({
    data: {
      action: 'TASK_DELETED',
      entityType: 'task',
      entityId: taskId,
      userId,
      metadata: { title: task.title },
    },
  });
}

// ---- Archive Task ----

export async function archiveTask(userId: string, taskId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId, deletedAt: null },
  });
  if (!task) throw new NotFoundError('Task');

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { status: 'ARCHIVED' },
    include: taskInclude,
  });

  await cacheDel(`tasks:${userId}:*`);
  await cacheDel(`analytics:dashboard:${userId}`);
  return transformTask(updated);
}

// ---- Restore Task ----

export async function restoreTask(userId: string, taskId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
  });
  if (!task) throw new NotFoundError('Task');

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { status: 'TODO', deletedAt: null },
    include: taskInclude,
  });

  await cacheDel(`tasks:${userId}:*`);
  await cacheDel(`analytics:dashboard:${userId}`);
  return transformTask(updated);
}

// ---- Duplicate Task ----

export async function duplicateTask(userId: string, taskId: string) {
  const original = await prisma.task.findFirst({
    where: { id: taskId, userId, deletedAt: null },
    include: { tags: true },
  });

  if (!original) throw new NotFoundError('Task');

  const duplicate = await prisma.task.create({
    data: {
      title: `${original.title} (copy)`,
      description: original.description,
      richNotes: (original.richNotes as any) || undefined,
      status: 'TODO',
      priority: original.priority,
      energyLevel: original.energyLevel,
      dueDate: original.dueDate,
      dueTime: original.dueTime,
      estimatedMinutes: original.estimatedMinutes,
      isRecurring: original.isRecurring,
      recurrencePattern: original.recurrencePattern,
      projectId: original.projectId,
      parentId: original.parentId,
      userId,
      tags: original.tags.length > 0 ? {
        create: original.tags.map((t) => ({ tagId: t.tagId })),
      } : undefined,
    },
    include: taskInclude,
  });

  await cacheDel(`tasks:${userId}:*`);
  await cacheDel(`analytics:dashboard:${userId}`);
  return transformTask(duplicate);
}

// ---- Reorder Tasks (Drag & Drop) ----

export async function reorderTasks(userId: string, input: ReorderTasksInput) {
  const updates = input.tasks.map((t) =>
    prisma.task.update({
      where: { id: t.id },
      data: {
        sortOrder: t.sortOrder,
        ...(t.kanbanColumn ? { kanbanColumn: t.kanbanColumn } : {}),
        ...(t.status ? { status: t.status } : {}),
      },
    }),
  );

  await prisma.$transaction(updates);
  await cacheDel(`tasks:${userId}:*`);
  await cacheDel(`analytics:dashboard:${userId}`);
}

// ---- Subtasks ----

export async function createSubtask(userId: string, parentId: string, input: CreateSubtaskInput) {
  const parent = await prisma.task.findFirst({
    where: { id: parentId, userId, deletedAt: null },
  });
  if (!parent) throw new NotFoundError('Parent task');

  const task = await prisma.task.create({
    data: {
      title: input.title,
      priority: input.priority,
      estimatedMinutes: input.estimatedMinutes,
      sortOrder: input.sortOrder,
      parentId,
      userId,
    },
    include: taskInclude,
  });

  return transformTask(task);
}

// ---- Comments ----

export async function addComment(userId: string, taskId: string, content: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId, deletedAt: null },
  });
  if (!task) throw new NotFoundError('Task');

  const comment = await prisma.comment.create({
    data: {
      content,
      entityType: 'task',
      entityId: taskId,
      taskId,
      userId,
    },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  return comment;
}

export async function getComments(userId: string, taskId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId, deletedAt: null },
  });
  if (!task) throw new NotFoundError('Task');

  return prisma.comment.findMany({
    where: { taskId },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

// ---- Helper Functions ----

function transformTask(task: any) {
  const { tags, ...rest } = task;
  return {
    ...rest,
    tags: tags?.map((t: any) => t.tag) || [],
  };
}

async function ensureTags(userId: string, tagNames: string[]) {
  const results: { tagId: string }[] = [];

  for (const name of tagNames) {
    const tag = await prisma.tag.upsert({
      where: { userId_name: { userId, name: name.trim() } },
      create: { name: name.trim(), userId },
      update: {},
    });
    results.push({ tagId: tag.id });
  }

  return results;
}

async function awardXpForCompletion(userId: string, priority: string) {
  const xpMap: Record<string, number> = {
    NONE: 10,
    LOW: 15,
    MEDIUM: 25,
    HIGH: 40,
    URGENT: 60,
  };

  const xp = xpMap[priority] || 10;
  const coins = Math.floor(xp / 5);

  await prisma.userStats.upsert({
    where: { userId },
    create: {
      userId,
      xp,
      coins,
      tasksCompleted: 1,
      level: 1,
    },
    update: {
      xp: { increment: xp },
      coins: { increment: coins },
      tasksCompleted: { increment: 1 },
      lastActiveDate: new Date(),
    },
  });

  // Check level up (every 100 XP)
  const stats = await prisma.userStats.findUnique({ where: { userId } });
  if (stats) {
    const newLevel = Math.floor(stats.xp / 100) + 1;
    if (newLevel > stats.level) {
      await prisma.userStats.update({
        where: { userId },
        data: { level: newLevel },
      });
    }
  }
}
