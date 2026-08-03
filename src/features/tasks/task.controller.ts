// =============================================================
// Life OS — Task Controller
// HTTP request handling for tasks
// =============================================================

import { Request, Response, NextFunction } from 'express';
import * as taskService from './task.service.js';
import { getUserId } from '../../core/utils/index.js';

function getTaskId(req: Request) {
  return Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
}

export async function listTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const result = await taskService.listTasks(userId, req.query as any);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getTask(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const task = await taskService.getTask(userId, getTaskId(req));
    res.json(task);
  } catch (error) {
    next(error);
  }
}

export async function createTask(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const task = await taskService.createTask(userId, req.body);
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
}

export async function updateTask(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const task = await taskService.updateTask(userId, getTaskId(req), req.body);
    res.json(task);
  } catch (error) {
    next(error);
  }
}

export async function deleteTask(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    await taskService.deleteTask(userId, getTaskId(req));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function archiveTask(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const task = await taskService.archiveTask(userId, getTaskId(req));
    res.json(task);
  } catch (error) {
    next(error);
  }
}

export async function restoreTask(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const task = await taskService.restoreTask(userId, getTaskId(req));
    res.json(task);
  } catch (error) {
    next(error);
  }
}

export async function duplicateTask(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const task = await taskService.duplicateTask(userId, getTaskId(req));
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
}

export async function reorderTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    await taskService.reorderTasks(userId, req.body);
    res.json({ message: 'Tasks reordered' });
  } catch (error) {
    next(error);
  }
}

export async function createSubtask(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const subtask = await taskService.createSubtask(userId, getTaskId(req), req.body);
    res.status(201).json(subtask);
  } catch (error) {
    next(error);
  }
}

export async function getComments(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const comments = await taskService.getComments(userId, getTaskId(req));
    res.json(comments);
  } catch (error) {
    next(error);
  }
}

export async function addComment(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const comment = await taskService.addComment(userId, getTaskId(req), req.body.content);
    res.status(201).json(comment);
  } catch (error) {
    next(error);
  }
}
