// =============================================================
// Life OS — Express Application
// Minimal app configuration for deployment
// Last Updated: August 3, 2026 - All endpoints active
// =============================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler } from './core/middleware/error.middleware.js';

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

// Mock endpoints for frontend data
app.get('/api/tasks', (_req, res) => {
  res.json([]);
});

app.post('/api/tasks', (req, res) => {
  res.status(201).json({ id: '1', ...req.body, createdAt: new Date() });
});

app.get('/api/projects', (_req, res) => {
  res.json({ data: [] });
});

app.get('/api/workspaces', (_req, res) => {
  res.json({ data: [] });
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

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(errorHandler);

export default app;
