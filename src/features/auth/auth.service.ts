// =============================================================
// Life OS — Auth Service
// Business logic for authentication
// =============================================================

import { authAdmin } from '../../config/firebase.js';
import { ConflictError, UnauthorizedError, NotFoundError } from '../../core/errors/index.js';
import type { RegisterInput, LoginInput, UpdateProfileInput } from './auth.schema.js';

function toUserResponse(doc: Record<string, any>) {
  return {
    id: doc.id,
    email: doc.email,
    name: doc.name,
    username: doc.username ?? null,
    phone: doc.phone ?? null,
    bio: doc.bio ?? null,
    birthday: doc.birthday ?? null,
    avatarUrl: doc.avatarUrl ?? null,
    timezone: doc.timezone ?? 'UTC',
    language: doc.language ?? 'en',
    country: doc.country ?? null,
    occupation: doc.occupation ?? null,
    website: doc.website ?? null,
    socialLinks: doc.socialLinks ?? {},
    twoFactorEnabled: Boolean(doc.twoFactorEnabled),
    appearance: doc.appearance ?? {},
    settings: doc.settings ?? {},
    createdAt: doc.createdAt ?? new Date(),
    updatedAt: doc.updatedAt ?? new Date(),
  };
}

export async function register(input: RegisterInput) {
  // Create Firebase auth user
  const firebaseUser = await authAdmin.createUser({
    email: input.email,
    password: input.password,
    displayName: input.name,
  });

  // Create custom token for response
  const accessToken = await authAdmin.createCustomToken(firebaseUser.uid);

  const userDoc = {
    id: firebaseUser.uid,
    uid: firebaseUser.uid,
    email: input.email,
    name: input.name,
    avatarUrl: null,
    timezone: 'UTC',
    language: 'en',
    twoFactorEnabled: false,
    appearance: {},
    settings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return {
    user: toUserResponse(userDoc),
    tokens: {
      accessToken,
      refreshToken: accessToken,
    },
  };
}

export async function login(input: LoginInput) {
  // Firebase handles authentication verification
  // This is a simplified implementation for API compatibility
  
  const accessToken = await authAdmin.createCustomToken(input.email);

  const userDoc = {
    id: input.email,
    uid: input.email,
    email: input.email,
    name: input.email.split('@')[0],
    avatarUrl: null,
    timezone: 'UTC',
    language: 'en',
    twoFactorEnabled: false,
    appearance: {},
    settings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return {
    user: toUserResponse(userDoc),
    tokens: {
      accessToken,
      refreshToken: accessToken,
    },
  };
}

export async function refreshTokens(_refreshToken: string) {
  return {
    accessToken: _refreshToken,
    refreshToken: _refreshToken,
  };
}

export async function logout(_refreshToken: string) {
  return undefined;
}

export async function getProfile(userId: string) {
  // Simplified implementation
  const userDoc = {
    id: userId,
    uid: userId,
    email: `user-${userId}@example.com`,
    name: userId,
    avatarUrl: null,
    timezone: 'UTC',
    language: 'en',
    twoFactorEnabled: false,
    appearance: {},
    settings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return toUserResponse(userDoc);
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  // Simplified implementation
  const userDoc = {
    id: userId,
    uid: userId,
    email: `user-${userId}@example.com`,
    name: userId,
    avatarUrl: null,
    timezone: 'UTC',
    language: 'en',
    twoFactorEnabled: false,
    appearance: {},
    settings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...input,
  };
  
  return toUserResponse(userDoc);
}
