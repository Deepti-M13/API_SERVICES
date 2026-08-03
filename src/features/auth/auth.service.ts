// =============================================================
// Life OS — Auth Service
// Business logic for authentication
// =============================================================

import { authAdmin } from '../../config/firebase.js';
import { createDocument, getDocumentById, listDocuments, updateDocument } from '../../config/firestore.js';
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
  const existingUsers = await listDocuments<any>('users');
  if (existingUsers.some((user) => user.email?.toLowerCase() === input.email.toLowerCase())) {
    throw new ConflictError('A user with this email already exists');
  }

  const firebaseUser = await authAdmin.createUser({
    email: input.email,
    password: input.password,
    displayName: input.name,
  });

  const userDoc = await createDocument('users', {
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
  });

  const accessToken = await authAdmin.createCustomToken(firebaseUser.uid);

  return {
    user: toUserResponse(userDoc),
    tokens: {
      accessToken,
      refreshToken: accessToken,
    },
  };
}

export async function login(input: LoginInput) {
  const users = await listDocuments<any>('users');
  const existing = users.find((user) => user.email?.toLowerCase() === input.email.toLowerCase() || user.name?.toLowerCase() === input.email.toLowerCase());

  if (!existing) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const accessToken = await authAdmin.createCustomToken(existing.uid);

  return {
    user: toUserResponse(existing),
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
  const user = await getDocumentById<any>('users', userId);

  if (!user) {
    throw new NotFoundError('User');
  }

  return toUserResponse(user);
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const existing = await getDocumentById<any>('users', userId);
  if (!existing) {
    throw new NotFoundError('User');
  }

  const user = await updateDocument('users', userId, input);
  return toUserResponse(user);
}
