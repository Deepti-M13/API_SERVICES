// =============================================================
// Life OS — Tags Feature
// Tag management (shared across tasks and notes)
// =============================================================
import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../config/database.js';
import { authenticate } from '../../core/middleware/auth.middleware.js';
import { validate } from '../../core/middleware/validate.middleware.js';
import { getUserId } from '../../core/utils/index.js';
const createTagSchema = z.object({
    name: z.string().min(1).max(50),
    color: z.string().default('#6366f1'),
});
async function listTags(req, res, next) {
    try {
        const userId = getUserId(req);
        const tags = await prisma.tag.findMany({
            where: { userId },
            include: { _count: { select: { tasks: true, noteTags: true } } },
            orderBy: { name: 'asc' },
        });
        res.json(tags);
    }
    catch (error) {
        next(error);
    }
}
async function createTag(req, res, next) {
    try {
        const userId = getUserId(req);
        const tag = await prisma.tag.create({
            data: { ...req.body, userId },
        });
        res.status(201).json(tag);
    }
    catch (error) {
        next(error);
    }
}
async function deleteTag(req, res, next) {
    try {
        const userId = getUserId(req);
        await prisma.tag.deleteMany({
            where: { id: req.params.id, userId },
        });
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
}
const router = Router();
router.use(authenticate);
router.get('/', listTags);
router.post('/', validate({ body: createTagSchema }), createTag);
router.delete('/:id', deleteTag);
export default router;
//# sourceMappingURL=tag.routes.js.map