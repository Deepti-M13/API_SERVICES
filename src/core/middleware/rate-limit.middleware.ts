// =============================================================
// Life OS — Rate Limiting Middleware
// Express-rate-limit with Redis store fallback
// =============================================================

import rateLimit from 'express-rate-limit';

// General API rate limit
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
    },
  },
});

// Strict rate limit for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: 'Too many authentication attempts, please try again later',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      statusCode: 429,
    },
  },
});

// AI endpoint rate limit (OpenAI costs)
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: 'AI request limit reached, please wait',
      code: 'AI_RATE_LIMIT_EXCEEDED',
      statusCode: 429,
    },
  },
});
