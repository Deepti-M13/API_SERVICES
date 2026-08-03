// =============================================================
// Life OS — Task Routes
// Route definitions for task endpoints
// =============================================================

import { Router } from 'express';
import * as taskController from './task.controller.js';
import { validate } from '../../core/middleware/validate.middleware.js';
import { authenticate } from '../../core/middleware/auth.middleware.js';
import { createTaskSchema, updateTaskSchema, taskQuerySchema, createSubtaskSchema, reorderTasksSchema } from './task.schema.js';
import { z } from 'zod';

const router = Router();

// All task routes require authentication
router.use(authenticate);

// Task CRUD
router.get('/', validate({ query: taskQuerySchema }), taskController.listTasks);
router.post('/', validate({ body: createTaskSchema }), taskController.createTask);
router.get('/:id', taskController.getTask);
router.patch('/:id', validate({ body: updateTaskSchema }), taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

// Task actions
router.post('/:id/archive', taskController.archiveTask);
router.post('/:id/restore', taskController.restoreTask);
router.post('/:id/duplicate', taskController.duplicateTask);

// Batch operations
router.post('/reorder', validate({ body: reorderTasksSchema }), taskController.reorderTasks);

// Subtasks
router.post('/:id/subtasks', validate({ body: createSubtaskSchema }), taskController.createSubtask);

// Comments
router.get('/:id/comments', taskController.getComments);
router.post('/:id/comments', validate({ body: z.object({ content: z.string().min(1).max(5000) }) }), taskController.addComment);

export default router;
