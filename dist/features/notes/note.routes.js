// =============================================================
// Life OS — Notes Feature
// Rich-text note management with TipTap JSON storage
// =============================================================
import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../config/database.js';
import { authenticate } from '../../core/middleware/auth.middleware.js';
import { validate } from '../../core/middleware/validate.middleware.js';
import { NotFoundError } from '../../core/errors/index.js';
import { getUserId, buildPaginatedResponse } from '../../core/utils/index.js';
// ---- Schemas ----
const createNoteSchema = z.object({
    title: z.string().min(1).max(500),
    content: z.unknown().nullable().optional(),
    plainText: z.string().nullable().optional(),
    isPinned: z.boolean().default(false),
    isFavorite: z.boolean().default(false),
    projectId: z.string().uuid().nullable().optional(),
    tagNames: z.array(z.string()).optional(),
});
const updateNoteSchema = createNoteSchema.partial();
const noteQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    projectId: z.string().uuid().optional(),
    isPinned: z.coerce.boolean().optional(),
    isFavorite: z.coerce.boolean().optional(),
    sortBy: z.enum(['createdAt', 'updatedAt', 'title']).default('updatedAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
// ---- Controller ----
async function listNotes(req, res, next) {
    try {
        const userId = getUserId(req);
        const { page, limit, search, projectId, isPinned, isFavorite, sortBy, sortOrder } = req.query;
        const skip = (page - 1) * limit;
        const where = { userId, deletedAt: null };
        if (projectId)
            where.projectId = projectId;
        if (isPinned !== undefined)
            where.isPinned = isPinned;
        if (isFavorite !== undefined)
            where.isFavorite = isFavorite;
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { plainText: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [notes, total] = await Promise.all([
            prisma.note.findMany({
                where,
                include: {
                    project: { select: { id: true, name: true, color: true } },
                    tags: { include: { tag: true } },
                },
                orderBy: [{ isPinned: 'desc' }, { [sortBy]: sortOrder }],
                skip,
                take: limit,
            }),
            prisma.note.count({ where }),
        ]);
        const transformed = notes.map((n) => ({
            ...n,
            tags: n.tags.map((t) => t.tag),
        }));
        res.json(buildPaginatedResponse(transformed, total, page, limit));
    }
    catch (error) {
        next(error);
    }
}
async function getNote(req, res, next) {
    try {
        const userId = getUserId(req);
        const note = await prisma.note.findFirst({
            where: { id: req.params.id, userId, deletedAt: null },
            include: {
                project: { select: { id: true, name: true, color: true } },
                tags: { include: { tag: true } },
            },
        });
        if (!note)
            throw new NotFoundError('Note');
        const noteAny = note;
        res.json({ ...note, tags: noteAny.tags?.map((t) => t.tag) ?? [] });
    }
    catch (error) {
        next(error);
    }
}
async function createNote(req, res, next) {
    try {
        const userId = getUserId(req);
        const { tagNames, ...data } = req.body;
        const note = await prisma.note.create({
            data: { ...data, userId },
            include: {
                project: { select: { id: true, name: true, color: true } },
                tags: { include: { tag: true } },
            },
        });
        if (tagNames?.length) {
            for (const name of tagNames) {
                const tag = await prisma.tag.upsert({
                    where: { userId_name: { userId, name } },
                    create: { name, userId },
                    update: {},
                });
                await prisma.noteTag.create({ data: { noteId: note.id, tagId: tag.id } });
            }
        }
        res.status(201).json({ ...note, tags: note.tags?.map((t) => t.tag) ?? [] });
    }
    catch (error) {
        next(error);
    }
}
async function updateNote(req, res, next) {
    try {
        const userId = getUserId(req);
        const existing = await prisma.note.findFirst({
            where: { id: req.params.id, userId, deletedAt: null },
        });
        if (!existing)
            throw new NotFoundError('Note');
        const { tagNames, ...data } = req.body;
        const note = await prisma.note.update({
            where: { id: req.params.id },
            data,
            include: {
                project: { select: { id: true, name: true, color: true } },
                tags: { include: { tag: true } },
            },
        });
        res.json({ ...note, tags: note.tags?.map((t) => t.tag) ?? [] });
    }
    catch (error) {
        next(error);
    }
}
async function deleteNote(req, res, next) {
    try {
        const userId = getUserId(req);
        const existing = await prisma.note.findFirst({
            where: { id: req.params.id, userId, deletedAt: null },
        });
        if (!existing)
            throw new NotFoundError('Note');
        await prisma.note.update({
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
router.get('/', validate({ query: noteQuerySchema }), listNotes);
router.post('/', validate({ body: createNoteSchema }), createNote);
router.get('/:id', getNote);
router.patch('/:id', validate({ body: updateNoteSchema }), updateNote);
router.delete('/:id', deleteNote);
export default router;
//# sourceMappingURL=note.routes.js.map