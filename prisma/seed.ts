// =============================================================
// Life OS — Database Seed
// Populates initial data for development
// =============================================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo user
  const password = await bcrypt.hash('Password123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'demo@lifeos.app' },
    update: {},
    create: {
      email: 'demo@lifeos.app',
      name: 'Demo User',
      password,
      timezone: 'America/New_York',
      stats: {
        create: {
          xp: 450,
          level: 5,
          coins: 120,
          currentStreak: 7,
          longestStreak: 14,
          tasksCompleted: 42,
          focusMinutes: 380,
          lastActiveDate: new Date(),
        },
      },
    },
  });

  // Create projects
  const projects = await Promise.all([
    prisma.project.create({
      data: { name: 'Life OS Development', color: '#6366f1', icon: '💻', userId: user.id, sortOrder: 0 },
    }),
    prisma.project.create({
      data: { name: 'Personal Growth', color: '#10b981', icon: '🌱', userId: user.id, sortOrder: 1 },
    }),
    prisma.project.create({
      data: { name: 'Health & Fitness', color: '#f43f5e', icon: '💪', userId: user.id, sortOrder: 2 },
    }),
  ]);

  // Create tags
  const tags = await Promise.all([
    prisma.tag.create({ data: { name: 'work', color: '#3b82f6', userId: user.id } }),
    prisma.tag.create({ data: { name: 'personal', color: '#10b981', userId: user.id } }),
    prisma.tag.create({ data: { name: 'urgent', color: '#ef4444', userId: user.id } }),
    prisma.tag.create({ data: { name: 'learning', color: '#8b5cf6', userId: user.id } }),
    prisma.tag.create({ data: { name: 'health', color: '#f43f5e', userId: user.id } }),
  ]);

  // Create tasks
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        title: 'Design the dashboard layout',
        description: 'Create wireframes and mockups for the main dashboard',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        dueDate: tomorrow,
        estimatedMinutes: 120,
        projectId: projects[0].id,
        userId: user.id,
        sortOrder: 0,
        tags: { create: [{ tagId: tags[0].id }] },
      },
    }),
    prisma.task.create({
      data: {
        title: 'Implement authentication flow',
        status: 'DONE',
        priority: 'URGENT',
        completedAt: new Date(now.getTime() - 86400000),
        estimatedMinutes: 180,
        actualMinutes: 150,
        projectId: projects[0].id,
        userId: user.id,
        sortOrder: 1,
        tags: { create: [{ tagId: tags[0].id }] },
      },
    }),
    prisma.task.create({
      data: {
        title: 'Read "Atomic Habits"',
        description: 'Finish chapters 5-8 this week',
        status: 'TODO',
        priority: 'MEDIUM',
        dueDate: nextWeek,
        estimatedMinutes: 60,
        projectId: projects[1].id,
        userId: user.id,
        sortOrder: 0,
        tags: { create: [{ tagId: tags[1].id }, { tagId: tags[3].id }] },
      },
    }),
    prisma.task.create({
      data: {
        title: 'Morning workout routine',
        status: 'TODO',
        priority: 'MEDIUM',
        isRecurring: true,
        recurrencePattern: 'WEEKDAYS',
        dueDate: tomorrow,
        estimatedMinutes: 45,
        projectId: projects[2].id,
        userId: user.id,
        sortOrder: 0,
        tags: { create: [{ tagId: tags[4].id }] },
      },
    }),
    prisma.task.create({
      data: {
        title: 'Weekly grocery shopping',
        status: 'TODO',
        priority: 'LOW',
        dueDate: nextWeek,
        estimatedMinutes: 60,
        userId: user.id,
        sortOrder: 2,
        tags: { create: [{ tagId: tags[1].id }] },
      },
    }),
  ]);

  // Create subtasks
  await prisma.task.createMany({
    data: [
      { title: 'Research dashboard patterns', status: 'DONE', completedAt: now, parentId: tasks[0].id, userId: user.id, sortOrder: 0 },
      { title: 'Create component hierarchy', status: 'IN_PROGRESS', parentId: tasks[0].id, userId: user.id, sortOrder: 1 },
      { title: 'Build stats cards', status: 'TODO', parentId: tasks[0].id, userId: user.id, sortOrder: 2 },
      { title: 'Add productivity charts', status: 'TODO', parentId: tasks[0].id, userId: user.id, sortOrder: 3 },
    ],
  });

  // Create habits
  await Promise.all([
    prisma.habit.create({
      data: { name: 'Meditation', icon: '🧘', color: '#8b5cf6', frequency: 'DAILY', targetCount: 1, currentStreak: 5, longestStreak: 12, userId: user.id },
    }),
    prisma.habit.create({
      data: { name: 'Read 30 minutes', icon: '📚', color: '#3b82f6', frequency: 'DAILY', targetCount: 1, currentStreak: 3, longestStreak: 8, userId: user.id },
    }),
    prisma.habit.create({
      data: { name: 'Exercise', icon: '🏃', color: '#10b981', frequency: 'DAILY', targetCount: 1, currentStreak: 7, longestStreak: 21, userId: user.id },
    }),
    prisma.habit.create({
      data: { name: 'Drink 8 glasses of water', icon: '💧', color: '#06b6d4', frequency: 'DAILY', targetCount: 8, currentStreak: 2, longestStreak: 5, userId: user.id },
    }),
  ]);

  // Create goals
  await prisma.goal.create({
    data: {
      title: 'Launch Life OS v1.0',
      description: 'Complete and deploy the full Life OS productivity platform',
      status: 'IN_PROGRESS',
      targetDate: new Date('2025-03-01'),
      progress: 35,
      color: '#6366f1',
      userId: user.id,
      milestones: {
        create: [
          { title: 'Complete backend API', isCompleted: true, completedAt: now, sortOrder: 0 },
          { title: 'Build frontend UI', isCompleted: false, sortOrder: 1 },
          { title: 'Implement AI features', isCompleted: false, sortOrder: 2 },
          { title: 'Testing & QA', isCompleted: false, sortOrder: 3 },
          { title: 'Deploy to production', isCompleted: false, sortOrder: 4 },
        ],
      },
    },
  });

  // Create notes
  await prisma.note.create({
    data: {
      title: 'Welcome to Life OS',
      content: {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Welcome to Life OS! 🚀' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'This is your personal productivity command center. Use it to manage tasks, track habits, set goals, and stay organized.' }] },
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Quick Tips' }] },
          { type: 'bulletList', content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Press ⌘K to open the Command Palette' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Use natural language to create tasks: "Meet John tomorrow at 5pm"' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Switch between views using the sidebar' }] }] },
          ]},
        ],
      },
      plainText: 'Welcome to Life OS! This is your personal productivity command center.',
      isPinned: true,
      userId: user.id,
    },
  });

  // Seed achievements
  const achievements = [
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

  await prisma.achievement.createMany({
    data: achievements,
  });

  // Unlock some achievements for demo user
  const firstTask = await prisma.achievement.findUnique({ where: { key: 'first_task' } });
  const task10 = await prisma.achievement.findUnique({ where: { key: 'task_10' } });
  const streak3 = await prisma.achievement.findUnique({ where: { key: 'streak_3' } });
  const streak7 = await prisma.achievement.findUnique({ where: { key: 'streak_7' } });

  if (firstTask) {
    await prisma.userAchievement.upsert({
      where: { userId_achievementId: { userId: user.id, achievementId: firstTask.id } },
      create: { userId: user.id, achievementId: firstTask.id },
      update: {},
    });
  }
  if (task10) {
    await prisma.userAchievement.upsert({
      where: { userId_achievementId: { userId: user.id, achievementId: task10.id } },
      create: { userId: user.id, achievementId: task10.id },
      update: {},
    });
  }
  if (streak3) {
    await prisma.userAchievement.upsert({
      where: { userId_achievementId: { userId: user.id, achievementId: streak3.id } },
      create: { userId: user.id, achievementId: streak3.id },
      update: {},
    });
  }
  if (streak7) {
    await prisma.userAchievement.upsert({
      where: { userId_achievementId: { userId: user.id, achievementId: streak7.id } },
      create: { userId: user.id, achievementId: streak7.id },
      update: {},
    });
  }

  console.log('✅ Database seeded successfully!');
  console.log('   Demo account: demo@lifeos.app / Password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
