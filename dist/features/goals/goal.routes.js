// =============================================================
// Life OS — Goals Feature
// Long-term goal tracking with milestones
// =============================================================
import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../config/database.js';
import { authenticate } from '../../core/middleware/auth.middleware.js';
import { validate } from '../../core/middleware/validate.middleware.js';
import { NotFoundError } from '../../core/errors/index.js';
import { getUserId } from '../../core/utils/index.js';
// ---- Schemas ----
const createGoalSchema = z.object({
    title: z.string().min(1).max(300),
    description: z.string().max(2000).nullable().optional(),
    targetDate: z.string().datetime().nullable().optional(),
    color: z.string().default('#6366f1'),
    milestones: z.array(z.object({
        title: z.string().min(1).max(300),
        sortOrder: z.number().int().default(0),
    })).optional(),
});
const updateGoalSchema = z.object({
    title: z.string().min(1).max(300).optional(),
    description: z.string().max(2000).nullable().optional(),
    status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED']).optional(),
    targetDate: z.string().datetime().nullable().optional(),
    progress: z.number().min(0).max(100).optional(),
    color: z.string().optional(),
    milestones: z.array(z.object({
        id: z.string().optional(),
        title: z.string().min(1).max(300),
        sortOrder: z.number().int().optional(),
        isCompleted: z.boolean().optional(),
    })).optional(),
});
const milestoneSchema = z.object({
    title: z.string().min(1).max(300),
    sortOrder: z.number().int().default(0),
});
// ---- Controller ----
async function listGoals(req, res, next) {
    try {
        const userId = getUserId(req);
        const goals = await prisma.goal.findMany({
            where: { userId },
            include: {
                milestones: { orderBy: { sortOrder: 'asc' } },
                _count: { select: { linkedTasks: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(goals);
    }
    catch (error) {
        next(error);
    }
}
async function getGoal(req, res, next) {
    try {
        const userId = getUserId(req);
        const goal = await prisma.goal.findFirst({
            where: { id: req.params.id, userId },
            include: {
                milestones: { orderBy: { sortOrder: 'asc' } },
                linkedTasks: {
                    include: {
                        task: { select: { id: true, title: true, status: true, priority: true, dueDate: true } },
                    },
                },
            },
        });
        if (!goal)
            throw new NotFoundError('Goal');
        res.json(goal);
    }
    catch (error) {
        next(error);
    }
}
async function createGoal(req, res, next) {
    try {
        const userId = getUserId(req);
        const { milestones, ...data } = req.body;
        const goal = await prisma.goal.create({
            data: {
                ...data,
                userId,
                targetDate: data.targetDate ? new Date(data.targetDate) : null,
                milestones: milestones?.length ? {
                    create: milestones.map((m, i) => ({
                        title: m.title,
                        sortOrder: m.sortOrder ?? i,
                    })),
                } : undefined,
            },
            include: { milestones: { orderBy: { sortOrder: 'asc' } } },
        });
        res.status(201).json(goal);
    }
    catch (error) {
        next(error);
    }
}
async function updateGoal(req, res, next) {
    try {
        const userId = getUserId(req);
        const existing = await prisma.goal.findFirst({
            where: { id: req.params.id, userId },
        });
        if (!existing)
            throw new NotFoundError('Goal');
        const data = { ...req.body };
        if (data.targetDate)
            data.targetDate = new Date(data.targetDate);
        let progress = data.progress;
        if (data.milestones) {
            const incomingIds = data.milestones.filter((m) => m.id).map((m) => m.id);
            // Delete removed milestones
            await prisma.goalMilestone.deleteMany({
                where: {
                    goalId: req.params.id,
                    id: { notIn: incomingIds }
                }
            });
            // Upsert milestones
            for (let i = 0; i < data.milestones.length; i++) {
                const m = data.milestones[i];
                if (m.id) {
                    await prisma.goalMilestone.update({
                        where: { id: m.id },
                        data: { title: m.title, sortOrder: m.sortOrder ?? i }
                    });
                }
                else {
                    await prisma.goalMilestone.create({
                        data: { title: m.title, sortOrder: m.sortOrder ?? i, goalId: req.params.id }
                    });
                }
            }
            delete data.milestones;
            // Recalculate progress
            const allMilestones = await prisma.goalMilestone.findMany({ where: { goalId: req.params.id } });
            const completed = allMilestones.filter((m) => m.isCompleted);
            progress = allMilestones.length > 0 ? Math.round((completed.length / allMilestones.length) * 100) : 0;
        }
        const goal = await prisma.goal.update({
            where: { id: req.params.id },
            data: { ...data, progress: progress !== undefined ? progress : existing.progress },
            include: { milestones: { orderBy: { sortOrder: 'asc' } } },
        });
        res.json(goal);
    }
    catch (error) {
        next(error);
    }
}
async function deleteGoal(req, res, next) {
    try {
        const userId = getUserId(req);
        const existing = await prisma.goal.findFirst({
            where: { id: req.params.id, userId },
        });
        if (!existing)
            throw new NotFoundError('Goal');
        await prisma.goal.delete({ where: { id: req.params.id } });
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
}
async function addMilestone(req, res, next) {
    try {
        const userId = getUserId(req);
        const goal = await prisma.goal.findFirst({
            where: { id: req.params.id, userId },
        });
        if (!goal)
            throw new NotFoundError('Goal');
        const milestone = await prisma.goalMilestone.create({
            data: {
                ...req.body,
                goalId: req.params.id,
            },
        });
        res.status(201).json(milestone);
    }
    catch (error) {
        next(error);
    }
}
async function toggleMilestone(req, res, next) {
    try {
        const milestone = await prisma.goalMilestone.findUnique({
            where: { id: req.params.milestoneId },
        });
        if (!milestone)
            throw new NotFoundError('Milestone');
        const updated = await prisma.goalMilestone.update({
            where: { id: req.params.milestoneId },
            data: {
                isCompleted: !milestone.isCompleted,
                completedAt: !milestone.isCompleted ? new Date() : null,
            },
        });
        // Recalculate goal progress
        const allMilestones = await prisma.goalMilestone.findMany({
            where: { goalId: milestone.goalId },
        });
        const completed = allMilestones.filter((m) => m.isCompleted || m.id === milestone.id && !milestone.isCompleted);
        const progress = allMilestones.length > 0 ? Math.round((completed.length / allMilestones.length) * 100) : 0;
        await prisma.goal.update({
            where: { id: milestone.goalId },
            data: { progress },
        });
        res.json(updated);
    }
    catch (error) {
        next(error);
    }
}
// ---- Routes ----
const router = Router();
router.use(authenticate);
router.get('/', listGoals);
router.post('/', validate({ body: createGoalSchema }), createGoal);
router.get('/:id', getGoal);
router.patch('/:id', validate({ body: updateGoalSchema }), updateGoal);
router.delete('/:id', deleteGoal);
router.post('/:id/milestones', validate({ body: milestoneSchema }), addMilestone);
router.patch('/:id/milestones/:milestoneId/toggle', toggleMilestone);
export default router;
//# sourceMappingURL=goal.routes.js.map