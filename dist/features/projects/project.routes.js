// =============================================================
// Life OS — Projects Feature
// Complete CRUD for project management
// =============================================================
import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../config/database.js';
import { authenticate } from '../../core/middleware/auth.middleware.js';
import { validate } from '../../core/middleware/validate.middleware.js';
import { NotFoundError } from '../../core/errors/index.js';
import { getUserId, buildPaginatedResponse } from '../../core/utils/index.js';
// ---- Schemas ----
const createProjectSchema = z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(2000).nullable().optional(),
    color: z.string().default('#6366f1'),
    icon: z.string().nullable().optional(),
});
const updateProjectSchema = createProjectSchema.partial().extend({
    status: z.enum(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']).optional(),
    sortOrder: z.number().int().optional(),
});
const projectQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    status: z.enum(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']).optional(),
    search: z.string().optional(),
});
// ---- Controller ----
async function listProjects(req, res, next) {
    try {
        const userId = getUserId(req);
        const { page, limit, status, search } = req.query;
        const skip = (page - 1) * limit;
        const where = { userId, deletedAt: null };
        if (status)
            where.status = status;
        if (search)
            where.name = { contains: search, mode: 'insensitive' };
        const [projects, total] = await Promise.all([
            prisma.project.findMany({
                where,
                include: {
                    _count: {
                        select: {
                            tasks: { where: { deletedAt: null } },
                        },
                    },
                },
                orderBy: { sortOrder: 'asc' },
                skip,
                take: limit,
            }),
            prisma.project.count({ where }),
        ]);
        res.json(buildPaginatedResponse(projects, total, page, limit));
    }
    catch (error) {
        next(error);
    }
}
async function getProject(req, res, next) {
    try {
        const userId = getUserId(req);
        const project = await prisma.project.findFirst({
            where: { id: req.params.id, userId, deletedAt: null },
            include: {
                tasks: {
                    where: { deletedAt: null, parentId: null },
                    include: {
                        tags: { include: { tag: true } },
                        subtasks: { where: { deletedAt: null }, select: { id: true, title: true, status: true } },
                    },
                    orderBy: { sortOrder: 'asc' },
                },
                _count: { select: { tasks: { where: { deletedAt: null } } } },
            },
        });
        if (!project)
            throw new NotFoundError('Project');
        res.json(project);
    }
    catch (error) {
        next(error);
    }
}
async function createProject(req, res, next) {
    try {
        const userId = getUserId(req);
        const maxOrder = await prisma.project.aggregate({
            where: { userId },
            _max: { sortOrder: true },
        });
        const project = await prisma.project.create({
            data: {
                ...req.body,
                userId,
                sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
            },
            include: { _count: { select: { tasks: true } } },
        });
        res.status(201).json(project);
    }
    catch (error) {
        next(error);
    }
}
async function updateProject(req, res, next) {
    try {
        const userId = getUserId(req);
        const existing = await prisma.project.findFirst({
            where: { id: req.params.id, userId, deletedAt: null },
        });
        if (!existing)
            throw new NotFoundError('Project');
        const project = await prisma.project.update({
            where: { id: req.params.id },
            data: req.body,
            include: { _count: { select: { tasks: true } } },
        });
        res.json(project);
    }
    catch (error) {
        next(error);
    }
}
async function deleteProject(req, res, next) {
    try {
        const userId = getUserId(req);
        const existing = await prisma.project.findFirst({
            where: { id: req.params.id, userId, deletedAt: null },
        });
        if (!existing)
            throw new NotFoundError('Project');
        await prisma.project.update({
            where: { id: req.params.id },
            data: { deletedAt: new Date() },
        });
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
}
// ---- Routes ----
const router = Router();
router.use(authenticate);
router.get('/', validate({ query: projectQuerySchema }), listProjects);
router.post('/', validate({ body: createProjectSchema }), createProject);
router.get('/:id', getProject);
router.patch('/:id', validate({ body: updateProjectSchema }), updateProject);
router.delete('/:id', deleteProject);
export default router;
//# sourceMappingURL=project.routes.js.map