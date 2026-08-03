// =============================================================
// Life OS — Habits Feature
// Habit tracking with streak management
// =============================================================

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../config/database.js';
import { authenticate } from '../../core/middleware/auth.middleware.js';
import { validate } from '../../core/middleware/validate.middleware.js';
import { NotFoundError } from '../../core/errors/index.js';
import { getUserId } from '../../core/utils/index.js';

// ---- Schemas ----

const createHabitSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  icon: z.string().default('⭐'),
  color: z.string().default('#6366f1'),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM']).default('DAILY'),
  targetCount: z.number().int().min(1).default(1),
  customDays: z.array(z.number().int().min(0).max(6)).default([]),
});

const updateHabitSchema = createHabitSchema.partial().extend({
  isActive: z.boolean().optional(),
});

const completeHabitSchema = z.object({
  count: z.number().int().min(1).default(1),
  note: z.string().max(500).nullable().optional(),
  date: z.string().optional(), // ISO date string, defaults to today
});

// ---- Controller ----

async function listHabits(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const habits = await prisma.habit.findMany({
      where: { userId, isActive: true },
      include: {
        completions: {
          where: { date: { gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) } },
          orderBy: { date: 'desc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Add today's completion status
    const habitsWithStatus = habits.map((habit) => {
      const todayCompletion = habit.completions.find(
        (c) => c.date.toISOString().split('T')[0] === today.toISOString().split('T')[0],
      );

      return {
        ...habit,
        completedToday: !!todayCompletion,
        todayCount: todayCompletion?.count || 0,
      };
    });

    res.json(habitsWithStatus);
  } catch (error) { next(error); }
}

async function createHabit(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const data = { ...req.body };
    if (Array.isArray(data.customDays)) {
      data.customDays = JSON.stringify(data.customDays);
    }
    const habit = await prisma.habit.create({
      data: { ...data, userId },
    });
    res.status(201).json({ ...habit, completedToday: false, todayCount: 0 });
  } catch (error) { next(error); }
}

async function updateHabit(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const existing = await prisma.habit.findFirst({
      where: { id: req.params.id, userId },
    });
    if (!existing) throw new NotFoundError('Habit');

    const data = { ...req.body };
    if (Array.isArray(data.customDays)) {
      data.customDays = JSON.stringify(data.customDays);
    }

    const habit = await prisma.habit.update({
      where: { id: req.params.id },
      data,
    });
    res.json(habit);
  } catch (error) { next(error); }
}

async function deleteHabit(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const existing = await prisma.habit.findFirst({
      where: { id: req.params.id, userId },
    });
    if (!existing) throw new NotFoundError('Habit');

    await prisma.habit.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) { next(error); }
}

async function completeHabit(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const { count, note, date } = req.body;

    const habit = await prisma.habit.findFirst({
      where: { id: req.params.id, userId },
    });
    if (!habit) throw new NotFoundError('Habit');

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    // Upsert completion for this date
    const completion = await prisma.habitCompletion.upsert({
      where: { habitId_date: { habitId: habit.id, date: targetDate } },
      create: {
        habitId: habit.id,
        count,
        note,
        date: targetDate,
      },
      update: {
        count: { increment: count },
        note,
      },
    });

    // Update streak
    const yesterday = new Date(targetDate);
    yesterday.setDate(yesterday.getDate() - 1);

    const yesterdayCompletion = await prisma.habitCompletion.findUnique({
      where: { habitId_date: { habitId: habit.id, date: yesterday } },
    });

    let newStreak = habit.currentStreak;
    if (yesterdayCompletion || habit.currentStreak === 0) {
      newStreak = habit.currentStreak + 1;
    } else {
      newStreak = 1;
    }

    const updatedHabit = await prisma.habit.update({
      where: { id: habit.id },
      data: {
        currentStreak: newStreak,
        longestStreak: Math.max(habit.longestStreak, newStreak),
      },
    });

    // Award XP for habit completion
    await prisma.userStats.upsert({
      where: { userId },
      create: { userId, xp: 15, coins: 3, level: 1 },
      update: {
        xp: { increment: 15 },
        coins: { increment: 3 },
        lastActiveDate: new Date(),
      },
    });

    res.json({ completion, habit: updatedHabit });
  } catch (error) { next(error); }
}

// ---- Routes ----

const router = Router();
router.use(authenticate);
router.get('/', listHabits);
router.post('/', validate({ body: createHabitSchema }), createHabit);
router.patch('/:id', validate({ body: updateHabitSchema }), updateHabit);
router.delete('/:id', deleteHabit);
router.post('/:id/complete', validate({ body: completeHabitSchema }), completeHabit);

export default router;
