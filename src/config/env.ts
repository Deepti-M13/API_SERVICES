// =============================================================
// Life OS — Environment Configuration
// Validates and exports all environment variables
// =============================================================

import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().default(4000),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  API_URL: z.string().default('http://localhost:4000'),

  REDIS_URL: z.string().default('redis://localhost:6379'),

  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_STORAGE_BUCKET: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT: z.string().optional(),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
});

function validateEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }

  return parsed.data;
}

export const env = validateEnv();
export type Env = z.infer<typeof envSchema>;
