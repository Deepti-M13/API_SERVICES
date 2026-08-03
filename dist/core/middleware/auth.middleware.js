// =============================================================
// Life OS — Authentication Middleware
// JWT token verification and user extraction
// =============================================================
import { authAdmin } from '../../config/firebase.js';
import { UnauthorizedError } from '../errors/index.js';
export async function authenticate(req, _res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedError('Missing or invalid authorization header');
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            throw new UnauthorizedError('Token not provided');
        }
        const decoded = await authAdmin.verifyIdToken(token);
        req.user = {
            userId: decoded.uid,
            email: decoded.email || '',
            iat: decoded.iat,
            exp: decoded.exp,
        };
        next();
    }
    catch (error) {
        next(error instanceof Error ? error : new UnauthorizedError('Invalid token'));
    }
}
export async function optionalAuth(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }
    try {
        const token = authHeader.split(' ')[1];
        if (token) {
            const decoded = await authAdmin.verifyIdToken(token);
            req.user = {
                userId: decoded.uid,
                email: decoded.email || '',
                iat: decoded.iat,
                exp: decoded.exp,
            };
        }
    }
    catch {
        // Optional auth — just continue without user
    }
    next();
}
//# sourceMappingURL=auth.middleware.js.map