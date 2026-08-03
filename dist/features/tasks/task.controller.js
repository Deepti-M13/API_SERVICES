// =============================================================
// Life OS — Task Controller
// HTTP request handling for tasks
// =============================================================
import * as taskService from './task.service.js';
import { getUserId } from '../../core/utils/index.js';
function getTaskId(req) {
    return Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
}
export async function listTasks(req, res, next) {
    try {
        const userId = getUserId(req);
        const result = await taskService.listTasks(userId, req.query);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
}
export async function getTask(req, res, next) {
    try {
        const userId = getUserId(req);
        const task = await taskService.getTask(userId, getTaskId(req));
        res.json(task);
    }
    catch (error) {
        next(error);
    }
}
export async function createTask(req, res, next) {
    try {
        const userId = getUserId(req);
        const task = await taskService.createTask(userId, req.body);
        res.status(201).json(task);
    }
    catch (error) {
        next(error);
    }
}
export async function updateTask(req, res, next) {
    try {
        const userId = getUserId(req);
        const task = await taskService.updateTask(userId, getTaskId(req), req.body);
        res.json(task);
    }
    catch (error) {
        next(error);
    }
}
export async function deleteTask(req, res, next) {
    try {
        const userId = getUserId(req);
        await taskService.deleteTask(userId, getTaskId(req));
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
}
export async function archiveTask(req, res, next) {
    try {
        const userId = getUserId(req);
        const task = await taskService.archiveTask(userId, getTaskId(req));
        res.json(task);
    }
    catch (error) {
        next(error);
    }
}
export async function restoreTask(req, res, next) {
    try {
        const userId = getUserId(req);
        const task = await taskService.restoreTask(userId, getTaskId(req));
        res.json(task);
    }
    catch (error) {
        next(error);
    }
}
export async function duplicateTask(req, res, next) {
    try {
        const userId = getUserId(req);
        const task = await taskService.duplicateTask(userId, getTaskId(req));
        res.status(201).json(task);
    }
    catch (error) {
        next(error);
    }
}
export async function reorderTasks(req, res, next) {
    try {
        const userId = getUserId(req);
        await taskService.reorderTasks(userId, req.body);
        res.json({ message: 'Tasks reordered' });
    }
    catch (error) {
        next(error);
    }
}
export async function createSubtask(req, res, next) {
    try {
        const userId = getUserId(req);
        const subtask = await taskService.createSubtask(userId, getTaskId(req), req.body);
        res.status(201).json(subtask);
    }
    catch (error) {
        next(error);
    }
}
export async function getComments(req, res, next) {
    try {
        const userId = getUserId(req);
        const comments = await taskService.getComments(userId, getTaskId(req));
        res.json(comments);
    }
    catch (error) {
        next(error);
    }
}
export async function addComment(req, res, next) {
    try {
        const userId = getUserId(req);
        const comment = await taskService.addComment(userId, getTaskId(req), req.body.content);
        res.status(201).json(comment);
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=task.controller.js.map