// =============================================================
// Life OS — Gamification Feature
// XP, levels, achievements, and streaks
// =============================================================
import { Router } from 'express';
import prisma from '../../config/database.js';
import { authenticate } from '../../core/middleware/auth.middleware.js';
import { getUserId } from '../../core/utils/index.js';
// ---- Achievement Definitions ----
const ACHIEVEMENTS = [
    { key: 'first_task', name: 'First Step', description: 'Complete your first task', icon: '🎯', xpReward: 50, coinReward: 10, requirement: 1, category: 'tasks' },
    { key: 'task_10', name: 'Getting Started', description: 'Complete 10 tasks', icon: '🔥', xpReward: 100, coinReward: 25, requirement: 10, category: 'tasks' },
    { key: 'task_50', name: 'Achiever', description: 'Complete 50 tasks', icon: '⭐', xpReward: 250, coinReward: 50, requirement: 50, category: 'tasks' },
    { key: 'task_100', name: 'Centurion', description: 'Complete 100 tasks', icon: '💯', xpReward: 500, coinReward: 100, requirement: 100, category: 'tasks' },
    { key: 'task_500', name: 'Unstoppable', description: 'Complete 500 tasks', icon: '🚀', xpReward: 1000, coinReward: 250, requirement: 500, category: 'tasks' },
    { key: 'streak_3', name: 'Consistent', description: 'Maintain a 3-day streak', icon: '🔗', xpReward: 75, coinReward: 15, requirement: 3, category: 'streaks' },
    { key: 'streak_7', name: 'Weekly Warrior', description: 'Maintain a 7-day streak', icon: '🏆', xpReward: 200, coinReward: 40, requirement: 7, category: 'streaks' },
    { key: 'streak_30', name: 'Monthly Master', description: 'Maintain a 30-day streak', icon: '👑', xpReward: 500, coinReward: 100, requirement: 30, category: 'streaks' },
    { key: 'streak_100', name: 'Legendary', description: 'Maintain a 100-day streak', icon: '🌟', xpReward: 2000, coinReward: 500, requirement: 100, category: 'streaks' },
    { key: 'focus_60', name: 'Deep Focus', description: 'Log 60 minutes of focus time', icon: '🧘', xpReward: 100, coinReward: 20, requirement: 60, category: 'focus' },
    { key: 'focus_600', name: 'Flow State', description: 'Log 10 hours of focus time', icon: '💎', xpReward: 300, coinReward: 60, requirement: 600, category: 'focus' },
    { key: 'level_5', name: 'Rising Star', description: 'Reach level 5', icon: '⬆️', xpReward: 150, coinReward: 30, requirement: 5, category: 'levels' },
    { key: 'level_10', name: 'Veteran', description: 'Reach level 10', icon: '🎖️', xpReward: 300, coinReward: 60, requirement: 10, category: 'levels' },
    { key: 'habit_7', name: 'Habit Former', description: 'Complete a habit for 7 consecutive days', icon: '🌱', xpReward: 150, coinReward: 30, requirement: 7, category: 'habits' },
    { key: 'early_bird', name: 'Early Bird', description: 'Complete a task before 7 AM', icon: '🐦', xpReward: 50, coinReward: 10, requirement: 1, category: 'special' },
    { key: 'night_owl', name: 'Night Owl', description: 'Complete a task after 11 PM', icon: '🦉', xpReward: 50, coinReward: 10, requirement: 1, category: 'special' },
];
// ---- Controllers ----
async function getStats(req, res, next) {
    try {
        const userId = getUserId(req);
        let stats = await prisma.userStats.findUnique({ where: { userId } });
        if (!stats) {
            stats = await prisma.userStats.create({
                data: { userId, xp: 0, level: 1, coins: 0 },
            });
        }
        // Calculate XP for next level
        const xpForNextLevel = stats.level * 100;
        const xpInCurrentLevel = stats.xp - ((stats.level - 1) * 100);
        res.json({
            ...stats,
            xpForNextLevel,
            xpInCurrentLevel,
            xpProgress: Math.round((xpInCurrentLevel / xpForNextLevel) * 100),
        });
    }
    catch (error) {
        next(error);
    }
}
async function getAchievements(req, res, next) {
    try {
        const userId = getUserId(req);
        // Seed achievements if they don't exist
        const existingCount = await prisma.achievement.count();
        if (existingCount === 0) {
            await prisma.achievement.createMany({
                data: ACHIEVEMENTS,
                skipDuplicates: true,
            });
        }
        const achievements = await prisma.achievement.findMany({
            include: {
                users: {
                    where: { userId },
                },
            },
            orderBy: { category: 'asc' },
        });
        const result = achievements.map((a) => ({
            id: a.id,
            key: a.key,
            name: a.name,
            description: a.description,
            icon: a.icon,
            xpReward: a.xpReward,
            coinReward: a.coinReward,
            requirement: a.requirement,
            category: a.category,
            unlocked: a.users.length > 0,
            unlockedAt: a.users[0]?.unlockedAt || null,
        }));
        res.json(result);
    }
    catch (error) {
        next(error);
    }
}
async function checkAchievements(req, res, next) {
    try {
        const userId = getUserId(req);
        const stats = await prisma.userStats.findUnique({ where: { userId } });
        if (!stats)
            return res.json([]);
        const achievements = await prisma.achievement.findMany();
        const unlocked = await prisma.userAchievement.findMany({
            where: { userId },
        });
        const unlockedKeys = new Set(unlocked.map((u) => {
            const achievement = achievements.find((a) => a.id === u.achievementId);
            return achievement?.key;
        }));
        const newlyUnlocked = [];
        for (const achievement of achievements) {
            if (unlockedKeys.has(achievement.key))
                continue;
            let shouldUnlock = false;
            switch (achievement.category) {
                case 'tasks':
                    shouldUnlock = stats.tasksCompleted >= achievement.requirement;
                    break;
                case 'streaks':
                    shouldUnlock = stats.longestStreak >= achievement.requirement;
                    break;
                case 'focus':
                    shouldUnlock = stats.focusMinutes >= achievement.requirement;
                    break;
                case 'levels':
                    shouldUnlock = stats.level >= achievement.requirement;
                    break;
            }
            if (shouldUnlock) {
                await prisma.userAchievement.create({
                    data: { userId, achievementId: achievement.id },
                });
                await prisma.userStats.update({
                    where: { userId },
                    data: {
                        xp: { increment: achievement.xpReward },
                        coins: { increment: achievement.coinReward },
                    },
                });
                newlyUnlocked.push({
                    ...achievement,
                    unlockedAt: new Date(),
                });
            }
        }
        return res.json(newlyUnlocked);
    }
    catch (error) {
        return next(error);
    }
}
async function logPomodoro(req, res, next) {
    try {
        const userId = getUserId(req);
        const { duration, type, taskId } = req.body;
        const log = await prisma.pomodoroLog.create({
            data: {
                duration: duration || 25,
                type: type || 'focus',
                taskId,
                userId,
            },
        });
        // Update focus minutes in stats
        if (type === 'focus' || !type) {
            await prisma.userStats.upsert({
                where: { userId },
                create: { userId, focusMinutes: duration || 25, level: 1 },
                update: { focusMinutes: { increment: duration || 25 } },
            });
        }
        // Update actual minutes on task
        if (taskId) {
            await prisma.task.update({
                where: { id: taskId },
                data: { actualMinutes: { increment: duration || 25 } },
            });
        }
        res.status(201).json(log);
    }
    catch (error) {
        next(error);
    }
}
// ---- Routes ----
const router = Router();
router.use(authenticate);
router.get('/stats', getStats);
router.get('/achievements', getAchievements);
router.post('/check-achievements', checkAchievements);
router.post('/pomodoro', logPomodoro);
export default router;
//# sourceMappingURL=gamification.routes.js.map