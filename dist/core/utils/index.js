// =============================================================
// Life OS — Utility Functions
// Shared helpers used across the API
// =============================================================
import { z } from 'zod';
// ---- Pagination ----
export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    search: z.string().optional(),
});
export function getPaginationParams(query) {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;
    return { page, limit, skip };
}
export function buildPaginatedResponse(data, total, page, limit) {
    const totalPages = Math.ceil(total / limit);
    return {
        data,
        meta: {
            total,
            page,
            limit,
            totalPages,
            hasMore: page < totalPages,
        },
    };
}
// ---- Auth Helpers ----
export function getUserId(req) {
    if (!req.user?.userId) {
        throw new Error('User not authenticated');
    }
    return req.user.userId;
}
// ---- Date Helpers ----
export function startOfDay(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}
export function endOfDay(date = new Date()) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}
export function daysAgo(days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(0, 0, 0, 0);
    return d;
}
export function startOfWeek(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
}
export function startOfMonth(date = new Date()) {
    const d = new Date(date);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
}
//# sourceMappingURL=index.js.map