// =============================================================
// Life OS — Analytics Feature
// Productivity metrics and dashboard statistics
// =============================================================
import { Router } from 'express';
import prisma from '../../config/database.js';
import { authenticate } from '../../core/middleware/auth.middleware.js';
import { getUserId, startOfDay, endOfDay, daysAgo } from '../../core/utils/index.js';
import { cacheGet, cacheSet } from '../../config/redis.js';
async function getDashboardStats(req, res, next) {
    try {
        const userId = getUserId(req);
        const cacheKey = `analytics:dashboard:${userId}`;
        const cached = await cacheGet(cacheKey);
        if (cached)
            return res.json(cached);
        const today = startOfDay();
        const todayEnd = endOfDay();
        const [tasksToday, tasksCompletedToday, tasksOverdue, stats, focusToday,] = await Promise.all([
            prisma.task.count({
                where: { userId, deletedAt: null, dueDate: { gte: today, lte: todayEnd } },
            }),
            prisma.task.count({
                where: { userId, status: 'DONE', completedAt: { gte: today, lte: todayEnd } },
            }),
            prisma.task.count({
                where: {
                    userId,
                    deletedAt: null,
                    status: { notIn: ['DONE', 'ARCHIVED', 'CANCELLED'] },
                    dueDate: { lt: today },
                },
            }),
            prisma.userStats.findUnique({ where: { userId } }),
            prisma.pomodoroLog.aggregate({
                where: { userId, completedAt: { gte: today }, type: 'focus' },
                _sum: { duration: true },
            }),
        ]);
        // Get last 7 days of completed tasks for the chart
        const sevenDaysAgo = daysAgo(7);
        const weeklyTasks = await prisma.task.findMany({
            where: {
                userId,
                status: 'DONE',
                completedAt: { gte: sevenDaysAgo },
            },
            select: { completedAt: true },
        });
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weeklyActivityTemplate = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return { name: dayNames[d.getDay()], count: 0, dateKey: d.toISOString().split('T')[0] };
        });
        weeklyTasks.forEach((t) => {
            if (t.completedAt) {
                const key = t.completedAt.toISOString().split('T')[0];
                const day = weeklyActivityTemplate.find(d => d.dateKey === key);
                if (day)
                    day.count += 1;
            }
        });
        const result = {
            tasksToday,
            tasksCompleted: tasksCompletedToday,
            tasksOverdue,
            currentStreak: stats?.currentStreak || 0,
            focusMinutesToday: focusToday._sum.duration || 0,
            xp: stats?.xp || 0,
            level: stats?.level || 1,
            coins: stats?.coins || 0,
            productivityScore: Math.min(100, Math.round((tasksCompletedToday / Math.max(tasksToday, 1)) * 100)),
            weeklyActivity: weeklyActivityTemplate.map(({ name, count }) => ({ name, count })),
        };
        await cacheSet(cacheKey, result, 60); // Cache for 1 minute
        return res.json(result);
    }
    catch (error) {
        return next(error);
    }
}
async function getProductivityData(req, res, next) {
    try {
        const userId = getUserId(req);
        const days = parseInt(req.query.days) || 30;
        const since = daysAgo(days);
        // Daily completions
        const completedTasks = await prisma.task.findMany({
            where: {
                userId,
                status: 'DONE',
                completedAt: { gte: since },
            },
            select: { completedAt: true, priority: true },
        });
        const dailyCompletions = {};
        const hourlyBuckets = {};
        completedTasks.forEach((task) => {
            if (task.completedAt) {
                const dateKey = task.completedAt.toISOString().split('T')[0];
                dailyCompletions[dateKey] = (dailyCompletions[dateKey] || 0) + 1;
                const hour = task.completedAt.getHours();
                hourlyBuckets[hour] = (hourlyBuckets[hour] || 0) + 1;
            }
        });
        // Category breakdown (by project)
        const projectCounts = await prisma.task.groupBy({
            by: ['projectId'],
            where: { userId, status: 'DONE', completedAt: { gte: since } },
            _count: true,
        });
        const projects = await prisma.project.findMany({
            where: { userId },
            select: { id: true, name: true, color: true },
        });
        const projectMap = new Map(projects.map((p) => [p.id, p]));
        const categoryBreakdown = projectCounts.map((pc) => {
            const project = pc.projectId ? projectMap.get(pc.projectId) : null;
            return {
                category: project?.name || 'No Project',
                count: pc._count,
                color: project?.color || '#94a3b8',
            };
        });
        // Focus hours
        const pomodoroLogs = await prisma.pomodoroLog.findMany({
            where: { userId, completedAt: { gte: since }, type: 'focus' },
            select: { completedAt: true, duration: true },
        });
        const focusHours = {};
        pomodoroLogs.forEach((log) => {
            const dateKey = log.completedAt.toISOString().split('T')[0];
            focusHours[dateKey] = (focusHours[dateKey] || 0) + log.duration;
        });
        // Heatmap (last 365 days)
        const yearAgo = daysAgo(365);
        const yearTasks = await prisma.task.findMany({
            where: { userId, status: 'DONE', completedAt: { gte: yearAgo } },
            select: { completedAt: true },
        });
        const heatmapData = {};
        yearTasks.forEach((t) => {
            if (t.completedAt) {
                const key = t.completedAt.toISOString().split('T')[0];
                heatmapData[key] = (heatmapData[key] || 0) + 1;
            }
        });
        // Most productive day & hour
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayCounts = {};
        completedTasks.forEach((t) => {
            if (t.completedAt) {
                const day = t.completedAt.getDay();
                dayCounts[day] = (dayCounts[day] || 0) + 1;
            }
        });
        const mostProductiveDay = Object.entries(dayCounts).sort(([, a], [, b]) => b - a)[0];
        const mostProductiveHour = Object.entries(hourlyBuckets).sort(([, a], [, b]) => b - a)[0];
        return res.json({
            dailyCompletions: Object.entries(dailyCompletions).map(([date, count]) => ({ date, count })),
            categoryBreakdown,
            hourlyProductivity: Array.from({ length: 24 }, (_, hour) => ({
                hour,
                count: hourlyBuckets[hour] || 0,
            })),
            heatmapData: Object.entries(heatmapData).map(([date, count]) => ({ date, count })),
            focusHours: Object.entries(focusHours).map(([date, minutes]) => ({ date, minutes })),
            mostProductiveDay: mostProductiveDay ? dayNames[parseInt(mostProductiveDay[0])] : 'N/A',
            mostProductiveHour: mostProductiveHour ? parseInt(mostProductiveHour[0]) : 0,
            totalCompleted: completedTasks.length,
        });
    }
    catch (error) {
        return next(error);
    }
}
// ---- Routes ----
const router = Router();
router.use(authenticate);
router.get('/dashboard', getDashboardStats);
router.get('/productivity', getProductivityData);
export default router;
//# sourceMappingURL=analytics.routes.js.map