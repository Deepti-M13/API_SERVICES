// =============================================================
// Life OS — Auth Controller
// HTTP request handling for authentication
// =============================================================
import * as authService from './auth.service.js';
import { getUserId } from '../../core/utils/index.js';
export async function register(req, res, next) {
    try {
        const result = await authService.register(req.body);
        res.status(201).json(result);
    }
    catch (error) {
        next(error);
    }
}
export async function login(req, res, next) {
    try {
        const result = await authService.login(req.body);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
}
export async function refresh(req, res, next) {
    try {
        const { refreshToken } = req.body;
        const tokens = await authService.refreshTokens(refreshToken);
        res.json(tokens);
    }
    catch (error) {
        next(error);
    }
}
export async function logout(req, res, next) {
    try {
        const { refreshToken } = req.body;
        await authService.logout(refreshToken);
        res.json({ message: 'Logged out successfully' });
    }
    catch (error) {
        next(error);
    }
}
export async function getProfile(req, res, next) {
    try {
        const userId = getUserId(req);
        const user = await authService.getProfile(userId);
        res.json(user);
    }
    catch (error) {
        next(error);
    }
}
export async function updateProfile(req, res, next) {
    try {
        const userId = getUserId(req);
        const user = await authService.updateProfile(userId, req.body);
        res.json(user);
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=auth.controller.js.map