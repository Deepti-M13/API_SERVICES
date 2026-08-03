// =============================================================
// Life OS — Task Schemas
// Zod validation for task endpoints
// =============================================================

import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().max(5000).nullable().optional(),
  richNotes: z.unknown().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'ARCHIVED', 'CANCELLED']).default('TODO'),
  priority: z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('NONE'),
  energyLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']).nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  dueTime: z.string().nullable().optional(),
  startDate: z.string().datetime().nullable().optional(),
  estimatedMinutes: z.number().int().min(1).nullable().optional(),
  isRecurring: z.boolean().default(false),
  recurrencePattern: z.enum(['DAILY', 'WEEKDAYS', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM']).nullable().optional(),
  recurrenceEndDate: z.string().datetime().nullable().optional(),
  isFavorite: z.boolean().default(false),
  isPinned: z.boolean().default(false),
  kanbanColumn: z.string().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  tagNames: z.array(z.string()).optional(),
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  sortOrder: z.number().int().optional(),
  actualMinutes: z.number().int().min(0).nullable().optional(),
});

export const taskQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'ARCHIVED', 'CANCELLED']).optional(),
  priority: z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  projectId: z.string().uuid().optional(),
  parentId: z.string().uuid().nullable().optional(),
  isFavorite: z.coerce.boolean().optional(),
  isPinned: z.coerce.boolean().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'dueDate', 'priority', 'sortOrder', 'title']).default('sortOrder'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  dueBefore: z.string().datetime().optional(),
  dueAfter: z.string().datetime().optional(),
  includeArchived: z.coerce.boolean().default(false),
  view: z.enum(['list', 'kanban', 'calendar', 'matrix', 'timeline', 'agenda']).default('list'),
});

export const createSubtaskSchema = z.object({
  title: z.string().min(1).max(500),
  priority: z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('NONE'),
  estimatedMinutes: z.number().int().min(1).nullable().optional(),
  sortOrder: z.number().int().default(0),
});

export const reorderTasksSchema = z.object({
  tasks: z.array(z.object({
    id: z.string().uuid(),
    sortOrder: z.number().int(),
    kanbanColumn: z.string().optional(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'ARCHIVED', 'CANCELLED']).optional(),
  })),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskQuery = z.infer<typeof taskQuerySchema>;
export type CreateSubtaskInput = z.infer<typeof createSubtaskSchema>;
export type ReorderTasksInput = z.infer<typeof reorderTasksSchema>;
