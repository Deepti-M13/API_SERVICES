// =============================================================
// Life OS — Express Application
// Minimal app configuration for deployment
// Last Updated: August 3, 2026 - All endpoints active
// Uses Prisma + SQLite for persistent storage
// =============================================================
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler } from './core/middleware/error.middleware.js';
import { PrismaClient } from '@prisma/client';
const app = express();
const prisma = new PrismaClient();
// ---- Global Middleware ----
// Security headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
// CORS
app.use(cors({
    origin: env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
// Logging
if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
}
// ---- Health Check ----
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: env.NODE_ENV,
    });
});
// ---- Basic API Endpoints ----
app.get('/api/status', (_req, res) => {
    res.json({ status: 'running', message: 'Life OS API is running' });
});
app.post('/api/auth/register', (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
        return res.status(400).json({
            error: {
                message: 'Missing required fields',
                code: 'INVALID_INPUT'
            }
        });
    }
    const user = {
        id: email.split('@')[0],
        email,
        name,
        avatarUrl: null,
        timezone: 'UTC',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    return res.status(201).json({
        user,
        tokens: {
            accessToken: `token-${email}`,
            refreshToken: `refresh-${email}`,
        },
    });
});
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({
            error: {
                message: 'Missing email or password',
                code: 'INVALID_CREDENTIALS'
            }
        });
    }
    const user = {
        id: email.split('@')[0],
        email,
        name: email.split('@')[0],
        avatarUrl: null,
        timezone: 'UTC',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    return res.json({
        user,
        tokens: {
            accessToken: `token-${email}`,
            refreshToken: `refresh-${email}`,
        },
    });
});
// ---- Error Handling ----
app.get('/api/auth/me', (req, res) => {
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } });
    }
    // Extract email from token (token format: "token-email@example.com")
    const email = token.replace('token-', '');
    const user = {
        id: email.split('@')[0],
        email,
        name: email.split('@')[0],
        avatarUrl: null,
        timezone: 'UTC',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    return res.json(user);
});
// ---- Task Endpoints with Database Persistence ----
app.get('/api/tasks', async (_req, res) => {
    try {
        // Get tasks from database
        // For now, get all tasks without user filtering (MVP)
        const tasks = await prisma.task.findMany({
            select: {
                id: true,
                title: true,
                description: true,
                status: true,
                priority: true,
                dueDate: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(tasks);
    }
    catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});
app.post('/api/tasks', async (req, res) => {
    try {
        const { title, description, status = 'TODO', priority = 'NONE', dueDate } = req.body;
        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }
        // Create task in database
        const task = await prisma.task.create({
            data: {
                title,
                description,
                status,
                priority,
                dueDate: dueDate ? new Date(dueDate) : null,
                userId: 'default-user', // MVP: use default user
            },
            select: {
                id: true,
                title: true,
                description: true,
                status: true,
                priority: true,
                dueDate: true,
                createdAt: true,
                updatedAt: true,
            }
        });
        return res.status(201).json(task);
    }
    catch (error) {
        console.error('Error creating task:', error);
        return res.status(500).json({ error: 'Failed to create task' });
    }
});
// ---- Projects Endpoints ----
app.get('/api/projects', async (_req, res) => {
    try {
        const projects = await prisma.project.findMany({
            select: {
                id: true,
                name: true,
                description: true,
                color: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(projects);
    }
    catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});
// ---- Workspaces Endpoints ----
app.get('/api/workspaces', async (_req, res) => {
    try {
        const workspaces = await prisma.workspace.findMany({
            select: {
                id: true,
                name: true,
                description: true,
                isPersonal: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(workspaces);
    }
    catch (error) {
        console.error('Error fetching workspaces:', error);
        res.status(500).json({ error: 'Failed to fetch workspaces' });
    }
});
app.get('/api/analytics/dashboard', (_req, res) => {
    res.json({
        tasksToday: 0,
        tasksCompleted: 0,
        tasksOverdue: 0,
        currentStreak: 0,
        focusMinutesToday: 0,
        xp: 0,
        level: 1,
        productivityScore: 0,
    });
});
// ---- Goals Endpoints ----
app.get('/api/goals', async (_req, res) => {
    try {
        const goals = await prisma.goal.findMany({
            select: {
                id: true,
                title: true,
                description: true,
                status: true,
                targetDate: true,
                progress: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(goals);
    }
    catch (error) {
        console.error('Error fetching goals:', error);
        res.status(500).json({ error: 'Failed to fetch goals' });
    }
});
app.post('/api/goals', async (req, res) => {
    try {
        const { title, description, status = 'NOT_STARTED', targetDate, progress = 0 } = req.body;
        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }
        const goal = await prisma.goal.create({
            data: {
                title,
                description,
                status,
                targetDate: targetDate ? new Date(targetDate) : null,
                progress,
                userId: 'default-user',
            },
            select: {
                id: true,
                title: true,
                description: true,
                status: true,
                targetDate: true,
                progress: true,
                createdAt: true,
                updatedAt: true,
            }
        });
        return res.status(201).json(goal);
    }
    catch (error) {
        console.error('Error creating goal:', error);
        return res.status(500).json({ error: 'Failed to create goal' });
    }
});
// ---- Habits Endpoints ----
app.get('/api/habits', async (_req, res) => {
    try {
        const habits = await prisma.habit.findMany({
            select: {
                id: true,
                name: true,
                description: true,
                frequency: true,
                currentStreak: true,
                longestStreak: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(habits);
    }
    catch (error) {
        console.error('Error fetching habits:', error);
        res.status(500).json({ error: 'Failed to fetch habits' });
    }
});
app.post('/api/habits', async (req, res) => {
    try {
        const { name, description, frequency = 'DAILY', isActive = true } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }
        const habit = await prisma.habit.create({
            data: {
                name,
                description,
                frequency,
                isActive,
                userId: 'default-user',
            },
            select: {
                id: true,
                name: true,
                description: true,
                frequency: true,
                currentStreak: true,
                longestStreak: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            }
        });
        return res.status(201).json(habit);
    }
    catch (error) {
        console.error('Error creating habit:', error);
        return res.status(500).json({ error: 'Failed to create habit' });
    }
});
// ---- Notes Endpoints ----
app.get('/api/notes', async (_req, res) => {
    try {
        const notes = await prisma.note.findMany({
            select: {
                id: true,
                title: true,
                plainText: true,
                isPinned: true,
                isFavorite: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(notes);
    }
    catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});
app.post('/api/notes', async (req, res) => {
    try {
        const { title, plainText, content, isPinned = false, isFavorite = false } = req.body;
        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }
        const note = await prisma.note.create({
            data: {
                title,
                plainText,
                content,
                isPinned,
                isFavorite,
                userId: 'default-user',
            },
            select: {
                id: true,
                title: true,
                plainText: true,
                isPinned: true,
                isFavorite: true,
                createdAt: true,
                updatedAt: true,
            }
        });
        return res.status(201).json(note);
    }
    catch (error) {
        console.error('Error creating note:', error);
        return res.status(500).json({ error: 'Failed to create note' });
    }
});
app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
});
app.use(errorHandler);
export default app;
//# sourceMappingURL=app.js.map