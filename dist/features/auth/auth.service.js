// =============================================================
// Life OS — Auth Service
// Business logic for authentication
// =============================================================
import { authAdmin } from '../../config/firebase.js';
import { createDocument, getDocumentById, listDocuments, updateDocument } from '../../config/firestore.js';
import { ConflictError, UnauthorizedError, NotFoundError } from '../../core/errors/index.js';
function toUserResponse(doc) {
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
export async function register(input) {
    const existingUsers = await listDocuments('users');
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
export async function login(input) {
    const users = await listDocuments('users');
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
export async function refreshTokens(_refreshToken) {
    return {
        accessToken: _refreshToken,
        refreshToken: _refreshToken,
    };
}
export async function logout(_refreshToken) {
    return undefined;
}
export async function getProfile(userId) {
    const user = await getDocumentById('users', userId);
    if (!user) {
        throw new NotFoundError('User');
    }
    return toUserResponse(user);
}
export async function updateProfile(userId, input) {
    const existing = await getDocumentById('users', userId);
    if (!existing) {
        throw new NotFoundError('User');
    }
    const user = await updateDocument('users', userId, input);
    return toUserResponse(user);
}
//# sourceMappingURL=auth.service.js.map