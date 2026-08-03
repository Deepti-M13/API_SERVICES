// =============================================================
// Life OS — Express Application
// Main app configuration with all middleware and routes
// =============================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './core/middleware/error.middleware.js';
import { apiLimiter } from './core/middleware/rate-limit.middleware.js';

// Import routes
import authRoutes from './features/auth/auth.routes.js';
import taskRoutes from './features/tasks/task.routes.js';
import projectRoutes from './features/projects/project.routes.js';
import noteRoutes from './features/notes/note.routes.js';
import habitRoutes from './features/habits/habit.routes.js';
import goalRoutes from './features/goals/goal.routes.js';
import calendarRoutes from './features/calendar/calendar.routes.js';
import analyticsRoutes from './features/analytics/analytics.routes.js';
import aiRoutes from './features/ai/ai.routes.js';
import gamificationRoutes from './features/gamification/gamification.routes.js';
import tagRoutes from './features/tags/tag.routes.js';

const app = express();

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
app.use(cookieParser());

// Logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
}

// Rate limiting
app.use('/api/', apiLimiter);

// ---- Health Check ----

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: env.NODE_ENV,
  });
});

// ---- API Routes ----

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/tags', tagRoutes);

// ---- Error Handling ----

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
