// =============================================================
// Life OS — Auth Routes
// Route definitions for authentication endpoints
// =============================================================

import { Router } from 'express';
import * as authController from './auth.controller.js';
import { validate } from '../../core/middleware/validate.middleware.js';
import { authenticate } from '../../core/middleware/auth.middleware.js';
import { authLimiter } from '../../core/middleware/rate-limit.middleware.js';
import { registerSchema, loginSchema, refreshSchema, updateProfileSchema } from './auth.schema.js';

const router = Router();

// Public routes (rate limited)
router.post('/register', authLimiter, validate({ body: registerSchema }), authController.register);
router.post('/login', authLimiter, validate({ body: loginSchema }), authController.login);
router.post('/refresh', validate({ body: refreshSchema }), authController.refresh);
router.post('/logout', authController.logout);

// Protected routes
router.get('/me', authenticate, authController.getProfile);
router.patch('/me', authenticate, validate({ body: updateProfileSchema }), authController.updateProfile);

export default router;
