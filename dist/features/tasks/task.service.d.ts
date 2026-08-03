import type { CreateTaskInput, UpdateTaskInput, TaskQuery, CreateSubtaskInput, ReorderTasksInput } from './task.schema.js';
export declare function listTasks(userId: string, query: TaskQuery): Promise<{
    data: unknown[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasMore: boolean;
    };
}>;
export declare function getTask(userId: string, taskId: string): Promise<any>;
export declare function createTask(userId: string, input: CreateTaskInput): Promise<any>;
export declare function updateTask(userId: string, taskId: string, input: UpdateTaskInput): Promise<any>;
export declare function deleteTask(userId: string, taskId: string): Promise<void>;
export declare function archiveTask(userId: string, taskId: string): Promise<any>;
export declare function restoreTask(userId: string, taskId: string): Promise<any>;
export declare function duplicateTask(userId: string, taskId: string): Promise<any>;
export declare function reorderTasks(userId: string, input: ReorderTasksInput): Promise<void>;
export declare function createSubtask(userId: string, parentId: string, input: CreateSubtaskInput): Promise<any>;
export declare function addComment(userId: string, taskId: string, content: string): Promise<any>;
export declare function getComments(userId: string, taskId: string): Promise<any>;
