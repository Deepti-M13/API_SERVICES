// =============================================================
// Life OS — Express Application
// Firebase Firestore for persistent storage
// =============================================================
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler } from './core/middleware/error.middleware.js';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
const app = express();
// Initialize Firebase Admin
let db = null;
if (env.FIREBASE_PROJECT_ID && env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
        initializeApp({
            credential: cert(serviceAccount),
            projectId: env.FIREBASE_PROJECT_ID,
        });
        db = getFirestore();
        console.log('✅ Firebase Firestore initialized');
    }
    catch (error) {
        console.warn('⚠️ Firebase initialization failed:', error.message);
        console.warn('API will work without Firebase persistence');
    }
}
// ---- Global Middleware ----
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
    origin: env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
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
        firebaseEnabled: !!db,
    });
});
app.get('/api/status', (_req, res) => {
    res.json({ status: 'running', message: 'Life OS API is running' });
});
// ---- Authentication Endpoints ----
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
app.get('/api/auth/me', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } });
    }
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
// ---- Task Endpoints (Firebase) ----
app.get('/api/tasks', async (_req, res) => {
    try {
        if (!db)
            return res.json([]);
        const snapshot = await db.collection('tasks').orderBy('createdAt', 'desc').get();
        const tasks = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        res.json(tasks);
    }
    catch (error) {
        console.error('Error fetching tasks:', error?.message);
        res.json([]);
    }
});
app.post('/api/tasks', async (req, res) => {
    try {
        const { title, description, status = 'TODO', priority = 'NONE', dueDate } = req.body;
        if (!title)
            return res.status(400).json({ error: 'Title is required' });
        if (!db)
            return res.status(500).json({ error: 'Firebase not initialized' });
        const taskData = {
            title,
            description: description || null,
            status,
            priority,
            dueDate: dueDate ? new Date(dueDate) : null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const docRef = await db.collection('tasks').add(taskData);
        return res.status(201).json({ id: docRef.id, ...taskData });
    }
    catch (error) {
        console.error('Error creating task:', error?.message);
        return res.status(500).json({ error: 'Failed to create task' });
    }
});
// ---- Goals Endpoints (Firebase) ----
app.get('/api/goals', async (_req, res) => {
    try {
        if (!db)
            return res.json([]);
        const snapshot = await db.collection('goals').orderBy('createdAt', 'desc').get();
        const goals = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        res.json(goals);
    }
    catch (error) {
        console.error('Error fetching goals:', error?.message);
        res.json([]);
    }
});
app.post('/api/goals', async (req, res) => {
    try {
        const { title, description, status = 'NOT_STARTED', targetDate, progress = 0 } = req.body;
        if (!title)
            return res.status(400).json({ error: 'Title is required' });
        if (!db)
            return res.status(500).json({ error: 'Firebase not initialized' });
        const goalData = {
            title,
            description: description || null,
            status,
            targetDate: targetDate ? new Date(targetDate) : null,
            progress,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const docRef = await db.collection('goals').add(goalData);
        return res.status(201).json({ id: docRef.id, ...goalData });
    }
    catch (error) {
        console.error('Error creating goal:', error?.message);
        return res.status(500).json({ error: 'Failed to create goal' });
    }
});
// ---- Habits Endpoints (Firebase) ----
app.get('/api/habits', async (_req, res) => {
    try {
        if (!db)
            return res.json([]);
        const snapshot = await db.collection('habits').orderBy('createdAt', 'desc').get();
        const habits = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        res.json(habits);
    }
    catch (error) {
        console.error('Error fetching habits:', error?.message);
        res.json([]);
    }
});
app.post('/api/habits', async (req, res) => {
    try {
        const { name, description, frequency = 'DAILY', isActive = true } = req.body;
        if (!name)
            return res.status(400).json({ error: 'Name is required' });
        if (!db)
            return res.status(500).json({ error: 'Firebase not initialized' });
        const habitData = {
            name,
            description: description || null,
            frequency,
            isActive,
            currentStreak: 0,
            longestStreak: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const docRef = await db.collection('habits').add(habitData);
        return res.status(201).json({ id: docRef.id, ...habitData });
    }
    catch (error) {
        console.error('Error creating habit:', error?.message);
        return res.status(500).json({ error: 'Failed to create habit' });
    }
});
// ---- Notes Endpoints (Firebase) ----
app.get('/api/notes', async (_req, res) => {
    try {
        if (!db)
            return res.json([]);
        const snapshot = await db.collection('notes').orderBy('createdAt', 'desc').get();
        const notes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        res.json(notes);
    }
    catch (error) {
        console.error('Error fetching notes:', error?.message);
        res.json([]);
    }
});
app.post('/api/notes', async (req, res) => {
    try {
        const { title, plainText, content, isPinned = false, isFavorite = false } = req.body;
        if (!title)
            return res.status(400).json({ error: 'Title is required' });
        if (!db)
            return res.status(500).json({ error: 'Firebase not initialized' });
        const noteData = {
            title,
            plainText: plainText || null,
            content: content || null,
            isPinned,
            isFavorite,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const docRef = await db.collection('notes').add(noteData);
        return res.status(201).json({ id: docRef.id, ...noteData });
    }
    catch (error) {
        console.error('Error creating note:', error?.message);
        return res.status(500).json({ error: 'Failed to create note' });
    }
});
// ---- Projects Endpoints (Firebase) ----
app.get('/api/projects', async (_req, res) => {
    try {
        if (!db)
            return res.json([]);
        const snapshot = await db.collection('projects').orderBy('createdAt', 'desc').get();
        const projects = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        res.json(projects);
    }
    catch (error) {
        console.error('Error fetching projects:', error?.message);
        res.json([]);
    }
});
// ---- Workspaces Endpoints (Firebase) ----
app.get('/api/workspaces', async (_req, res) => {
    try {
        if (!db)
            return res.json([]);
        const snapshot = await db.collection('workspaces').orderBy('createdAt', 'desc').get();
        const workspaces = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        res.json(workspaces);
    }
    catch (error) {
        console.error('Error fetching workspaces:', error?.message);
        res.json([]);
    }
});
// ---- Analytics Endpoint ----
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
// ---- Error Handling ----
app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
});
app.use(errorHandler);
export default app;
//# sourceMappingURL=app.js.map