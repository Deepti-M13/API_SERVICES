// =============================================================
// Life OS — Error Handling Middleware
// Centralized error handler for consistent API responses
// =============================================================

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/index.js';
import { env } from '../../config/env.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Log error
  if (env.NODE_ENV === 'development') {
    console.error('❌ Error:', err);
  } else {
    console.error('❌ Error:', err.message);
  }

  // Operational errors (expected, thrown by our code)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code,
        statusCode: err.statusCode,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  // Prisma known errors
  if (err.constructor?.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as unknown as { code?: string; meta?: { target?: string[] } };
    if (prismaError.code === 'P2002') {
      res.status(409).json({
        error: {
          message: 'A record with that value already exists',
          code: 'UNIQUE_CONSTRAINT_VIOLATION',
          statusCode: 409,
          details: prismaError.meta?.target,
        },
      });
      return;
    }
    if (prismaError.code === 'P2025') {
      res.status(404).json({
        error: {
          message: 'Record not found',
          code: 'NOT_FOUND',
          statusCode: 404,
        },
      });
      return;
    }
  }

  // Unexpected errors
  res.status(500).json({
    error: {
      message: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      code: 'INTERNAL_ERROR',
      statusCode: 500,
    },
  });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    error: {
      message: 'Route not found',
      code: 'ROUTE_NOT_FOUND',
      statusCode: 404,
    },
  });
}
