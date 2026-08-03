// =============================================================
// Life OS — AI Feature
// OpenAI-powered task intelligence
// =============================================================
import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../config/database.js';
import { authenticate } from '../../core/middleware/auth.middleware.js';
import { validate } from '../../core/middleware/validate.middleware.js';
import { aiLimiter } from '../../core/middleware/rate-limit.middleware.js';
import { getUserId, startOfDay, endOfDay, daysAgo } from '../../core/utils/index.js';
import { env } from '../../config/env.js';
import { BadRequestError } from '../../core/errors/index.js';
// ---- Schemas ----
const naturalLanguageSchema = z.object({
    input: z.string().min(1).max(1000),
});
const subtaskSchema = z.object({
    taskTitle: z.string().min(1).max(500),
    taskDescription: z.string().max(2000).nullable().optional(),
});
const prioritizeSchema = z.object({
    taskIds: z.array(z.string().uuid()).min(1).max(50),
});
// ---- OpenAI Helper ----
async function callOpenAI(systemPrompt, userPrompt) {
    if (!env.OPENAI_API_KEY) {
        throw new BadRequestError('OpenAI API key not configured');
    }
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
        model: env.OPENAI_MODEL,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1000,
    });
    return response.choices[0]?.message?.content || '';
}
// ---- Controllers ----
async function parseNaturalLanguage(req, res, next) {
    try {
        const { input } = req.body;
        const systemPrompt = `You are a task parser. Extract task details from natural language input.
Return a JSON object with these fields:
- title: string (the task name)
- dueDate: string | null (ISO date, resolve "tomorrow", "next Monday", etc. relative to today: ${new Date().toISOString().split('T')[0]})
- dueTime: string | null (HH:mm format, 24-hour)
- priority: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "URGENT" (look for keywords like "important", "urgent", "!high", "!low")
- tags: string[] (words preceded by # or contextual tags like "work", "personal")
- projectName: string | null (if mentioned)
- description: string | null (any additional context)
- estimatedMinutes: number | null (if duration mentioned)
Return ONLY valid JSON, no markdown formatting.`;
        const result = await callOpenAI(systemPrompt, input);
        try {
            const parsed = JSON.parse(result);
            res.json(parsed);
        }
        catch {
            // Fallback: basic parsing without AI
            res.json({
                title: input.replace(/#\w+/g, '').replace(/!\w+/g, '').trim(),
                dueDate: null,
                dueTime: null,
                priority: 'NONE',
                tags: (input.match(/#(\w+)/g) || []).map((t) => t.slice(1)),
                projectName: null,
                description: null,
                estimatedMinutes: null,
            });
        }
    }
    catch (error) {
        next(error);
    }
}
async function suggestSubtasks(req, res, next) {
    try {
        const { taskTitle, taskDescription } = req.body;
        const systemPrompt = `You are a productivity assistant. Break down a task into actionable subtasks.
Return a JSON array of objects, each with:
- title: string (concise, actionable subtask)
- estimatedMinutes: number (realistic time estimate)
- sortOrder: number (logical ordering)
Return 3-7 subtasks. Return ONLY valid JSON array, no markdown formatting.`;
        const userPrompt = `Task: ${taskTitle}${taskDescription ? `\nDescription: ${taskDescription}` : ''}`;
        const result = await callOpenAI(systemPrompt, userPrompt);
        try {
            const subtasks = JSON.parse(result);
            res.json(subtasks);
        }
        catch {
            res.json([
                { title: `Research ${taskTitle}`, estimatedMinutes: 15, sortOrder: 0 },
                { title: `Plan approach for ${taskTitle}`, estimatedMinutes: 10, sortOrder: 1 },
                { title: `Execute ${taskTitle}`, estimatedMinutes: 30, sortOrder: 2 },
                { title: `Review and finalize`, estimatedMinutes: 10, sortOrder: 3 },
            ]);
        }
    }
    catch (error) {
        next(error);
    }
}
async function prioritizeTasks(req, res, next) {
    try {
        const userId = getUserId(req);
        const { taskIds } = req.body;
        const tasks = await prisma.task.findMany({
            where: { id: { in: taskIds }, userId },
            select: {
                id: true,
                title: true,
                priority: true,
                dueDate: true,
                estimatedMinutes: true,
                status: true,
            },
        });
        const systemPrompt = `You are a productivity expert. Prioritize these tasks using the Eisenhower Matrix (Urgent/Important).
Consider due dates, existing priorities, and task complexity.
Return a JSON array of objects with:
- id: string (task id)
- suggestedPriority: "URGENT" | "HIGH" | "MEDIUM" | "LOW"
- reasoning: string (brief explanation)
- suggestedOrder: number (execution order)
Return ONLY valid JSON array, no markdown formatting.`;
        const userPrompt = `Tasks to prioritize:\n${tasks.map((t) => `- ID: ${t.id}, Title: "${t.title}", Current Priority: ${t.priority}, Due: ${t.dueDate?.toISOString() || 'none'}, Est: ${t.estimatedMinutes || 'unknown'} min`).join('\n')}`;
        const result = await callOpenAI(systemPrompt, userPrompt);
        try {
            const prioritized = JSON.parse(result);
            res.json(prioritized);
        }
        catch {
            res.json(tasks.map((t, i) => ({
                id: t.id,
                suggestedPriority: t.priority,
                reasoning: 'AI unavailable — keeping current priority',
                suggestedOrder: i,
            })));
        }
    }
    catch (error) {
        next(error);
    }
}
async function getDailySummary(req, res, next) {
    try {
        const userId = getUserId(req);
        const today = startOfDay();
        const todayEnd = endOfDay();
        const yesterday = daysAgo(1);
        const [completed, pending, overdue, yesterdayCompleted] = await Promise.all([
            prisma.task.count({
                where: { userId, status: 'DONE', completedAt: { gte: today, lte: todayEnd } },
            }),
            prisma.task.count({
                where: {
                    userId, deletedAt: null,
                    status: { notIn: ['DONE', 'ARCHIVED', 'CANCELLED'] },
                    dueDate: { gte: today, lte: todayEnd },
                },
            }),
            prisma.task.count({
                where: {
                    userId, deletedAt: null,
                    status: { notIn: ['DONE', 'ARCHIVED', 'CANCELLED'] },
                    dueDate: { lt: today },
                },
            }),
            prisma.task.count({
                where: { userId, status: 'DONE', completedAt: { gte: yesterday, lt: today } },
            }),
        ]);
        const stats = await prisma.userStats.findUnique({ where: { userId } });
        const hour = new Date().getHours();
        let greeting = 'Good morning';
        if (hour >= 12 && hour < 17)
            greeting = 'Good afternoon';
        else if (hour >= 17)
            greeting = 'Good evening';
        const insights = [];
        if (completed > yesterdayCompleted) {
            insights.push(`You're ahead of yesterday — ${completed} tasks completed vs ${yesterdayCompleted}.`);
        }
        if (overdue > 0) {
            insights.push(`You have ${overdue} overdue task${overdue > 1 ? 's' : ''}. Consider rescheduling or breaking them down.`);
        }
        if (stats && stats.currentStreak > 3) {
            insights.push(`Amazing ${stats.currentStreak}-day streak! Keep the momentum going.`);
        }
        if (pending === 0 && completed > 0) {
            insights.push('All tasks for today are done — great work! 🎉');
        }
        const suggestions = [];
        if (pending > 5) {
            suggestions.push('Consider prioritizing your top 3 tasks and deferring the rest.');
        }
        if (overdue > 3) {
            suggestions.push('Review overdue tasks — some might no longer be relevant.');
        }
        const quotes = [
            "The secret of getting ahead is getting started. — Mark Twain",
            "Focus on being productive instead of busy. — Tim Ferriss",
            "It's not about having time, it's about making time. — Unknown",
            "Do the hard jobs first. The easy jobs will take care of themselves. — Dale Carnegie",
            "You don't have to see the whole staircase, just take the first step. — MLK Jr.",
        ];
        res.json({
            greeting,
            completedTasks: completed,
            pendingTasks: pending,
            overdueTasks: overdue,
            insights,
            suggestions,
            motivationalQuote: quotes[Math.floor(Math.random() * quotes.length)],
        });
    }
    catch (error) {
        next(error);
    }
}
// ---- Routes ----
const router = Router();
router.use(authenticate);
router.use(aiLimiter);
router.post('/parse-natural-language', validate({ body: naturalLanguageSchema }), parseNaturalLanguage);
router.post('/suggest-subtasks', validate({ body: subtaskSchema }), suggestSubtasks);
router.post('/prioritize', validate({ body: prioritizeSchema }), prioritizeTasks);
router.get('/daily-summary', getDailySummary);
export default router;
//# sourceMappingURL=ai.routes.js.map