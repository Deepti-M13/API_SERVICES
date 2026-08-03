// =============================================================
// Life OS — Auth Schemas
// Zod validation schemas for authentication endpoints
// =============================================================

import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase, one lowercase, and one number',
    ),
});

export const loginSchema = z.object({
  email: z.string().min(1, 'Email or Name is required'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  username: z.string().min(2).max(50).optional(),
  phone: z.string().optional(),
  bio: z.string().max(500).optional(),
  birthday: z.string().optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
  country: z.string().optional(),
  occupation: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  socialLinks: z.record(z.string()).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  twoFactorEnabled: z.boolean().optional(),
  appearance: z.record(z.unknown()).optional(),
  settings: z.record(z.unknown()).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
