// =============================================================
// Life OS — Calendar Feature
// Calendar events with task linking
// =============================================================
import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../config/database.js';
import { authenticate } from '../../core/middleware/auth.middleware.js';
import { validate } from '../../core/middleware/validate.middleware.js';
import { NotFoundError } from '../../core/errors/index.js';
import { getUserId } from '../../core/utils/index.js';
// ---- Schemas ----
const createEventSchema = z.object({
    title: z.string().min(1).max(300),
    description: z.string().max(2000).nullable().optional(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    allDay: z.boolean().default(false),
    color: z.string().nullable().optional(),
    location: z.string().max(500).nullable().optional(),
    taskId: z.string().uuid().nullable().optional(),
});
const updateEventSchema = createEventSchema.partial();
const eventQuerySchema = z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
});
// ---- Controller ----
async function listEvents(req, res, next) {
    try {
        const userId = getUserId(req);
        const { start, end } = req.query;
        const events = await prisma.calendarEvent.findMany({
            where: {
                userId,
                startTime: { gte: new Date(start) },
                endTime: { lte: new Date(end) },
            },
            include: {
                task: {
                    select: { id: true, title: true, status: true, priority: true },
                },
            },
            orderBy: { startTime: 'asc' },
        });
        // Also include tasks with due dates in this range (as virtual events)
        const tasksWithDueDates = await prisma.task.findMany({
            where: {
                userId,
                deletedAt: null,
                dueDate: {
                    gte: new Date(start),
                    lte: new Date(end),
                },
                calendarEvent: null, // Not already linked to an event
            },
            select: {
                id: true,
                title: true,
                status: true,
                priority: true,
                dueDate: true,
                dueTime: true,
                estimatedMinutes: true,
                project: { select: { color: true } },
            },
        });
        const taskEvents = tasksWithDueDates.map((task) => ({
            id: `task-${task.id}`,
            title: task.title,
            startTime: task.dueDate,
            endTime: task.dueDate
                ? new Date(task.dueDate.getTime() + (task.estimatedMinutes || 30) * 60000)
                : task.dueDate,
            allDay: !task.dueTime,
            color: task.project?.color || getPriorityColor(task.priority),
            isTask: true,
            taskId: task.id,
            task,
        }));
        res.json([...events, ...taskEvents]);
    }
    catch (error) {
        next(error);
    }
}
async function createEvent(req, res, next) {
    try {
        const userId = getUserId(req);
        const event = await prisma.calendarEvent.create({
            data: {
                ...req.body,
                userId,
                startTime: new Date(req.body.startTime),
                endTime: new Date(req.body.endTime),
            },
            include: { task: { select: { id: true, title: true, status: true } } },
        });
        res.status(201).json(event);
    }
    catch (error) {
        next(error);
    }
}
async function updateEvent(req, res, next) {
    try {
        const userId = getUserId(req);
        const existing = await prisma.calendarEvent.findFirst({
            where: { id: req.params.id, userId },
        });
        if (!existing)
            throw new NotFoundError('Calendar event');
        const data = { ...req.body };
        if (data.startTime)
            data.startTime = new Date(data.startTime);
        if (data.endTime)
            data.endTime = new Date(data.endTime);
        const event = await prisma.calendarEvent.update({
            where: { id: req.params.id },
            data,
            include: { task: { select: { id: true, title: true, status: true } } },
        });
        res.json(event);
    }
    catch (error) {
        next(error);
    }
}
async function deleteEvent(req, res, next) {
    try {
        const userId = getUserId(req);
        const existing = await prisma.calendarEvent.findFirst({
            where: { id: req.params.id, userId },
        });
        if (!existing)
            throw new NotFoundError('Calendar event');
        await prisma.calendarEvent.delete({ where: { id: req.params.id } });
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
}
function getPriorityColor(priority) {
    const colors = {
        URGENT: '#ef4444',
        HIGH: '#f97316',
        MEDIUM: '#eab308',
        LOW: '#22c55e',
        NONE: '#6366f1',
    };
    return colors[priority] || '#6366f1';
}
// ---- Routes ----
const router = Router();
router.use(authenticate);
router.get('/', validate({ query: eventQuerySchema }), listEvents);
router.post('/', validate({ body: createEventSchema }), createEvent);
router.patch('/:id', validate({ body: updateEventSchema }), updateEvent);
router.delete('/:id', deleteEvent);
export default router;
//# sourceMappingURL=calendar.routes.js.map