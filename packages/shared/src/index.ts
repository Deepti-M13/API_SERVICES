// ============================================================
// Life OS — Shared Types
// Core domain types used across frontend and backend
// ============================================================

// ---- Enums ----

export const TaskStatus = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
  ARCHIVED: 'ARCHIVED',
  CANCELLED: 'CANCELLED',
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const TaskPriority = {
  NONE: 'NONE',
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;
export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];

export const EnergyLevel = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
} as const;
export type EnergyLevel = (typeof EnergyLevel)[keyof typeof EnergyLevel];

export const ProjectStatus = {
  ACTIVE: 'ACTIVE',
  ON_HOLD: 'ON_HOLD',
  COMPLETED: 'COMPLETED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const HabitFrequency = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  CUSTOM: 'CUSTOM',
} as const;
export type HabitFrequency = (typeof HabitFrequency)[keyof typeof HabitFrequency];

export const GoalStatus = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  ABANDONED: 'ABANDONED',
} as const;
export type GoalStatus = (typeof GoalStatus)[keyof typeof GoalStatus];

export const RecurrencePattern = {
  DAILY: 'DAILY',
  WEEKDAYS: 'WEEKDAYS',
  WEEKLY: 'WEEKLY',
  BIWEEKLY: 'BIWEEKLY',
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY',
  CUSTOM: 'CUSTOM',
} as const;
export type RecurrencePattern = (typeof RecurrencePattern)[keyof typeof RecurrencePattern];

export const NotificationType = {
  TASK_DUE: 'TASK_DUE',
  TASK_OVERDUE: 'TASK_OVERDUE',
  HABIT_REMINDER: 'HABIT_REMINDER',
  GOAL_MILESTONE: 'GOAL_MILESTONE',
  ACHIEVEMENT_UNLOCKED: 'ACHIEVEMENT_UNLOCKED',
  STREAK_AT_RISK: 'STREAK_AT_RISK',
  SYSTEM: 'SYSTEM',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

// ---- Core Domain Types ----

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  richNotes: unknown | null;
  status: TaskStatus;
  priority: TaskPriority;
  energyLevel: EnergyLevel | null;
  dueDate: string | null;
  dueTime: string | null;
  startDate: string | null;
  estimatedMinutes: number | null;
  actualMinutes: number | null;
  completedAt: string | null;
  isRecurring: boolean;
  recurrencePattern: RecurrencePattern | null;
  recurrenceEndDate: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  sortOrder: number;
  projectId: string | null;
  parentId: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;

  // Relations (optional, populated via includes)
  project?: Project;
  subtasks?: Task[];
  parent?: Task;
  tags?: Tag[];
  comments?: Comment[];
  attachments?: Attachment[];
  dependencies?: Task[];
  dependents?: Task[];
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  status: ProjectStatus;
  sortOrder: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;

  tasks?: Task[];
  _count?: { tasks: number };
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  userId: string;
}

export interface Comment {
  id: string;
  content: string;
  entityType: string;
  entityId: string;
  userId: string;
  user?: User;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  taskId: string;
  userId: string;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: unknown | null;
  plainText: string | null;
  isPinned: boolean;
  isFavorite: boolean;
  projectId: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;

  project?: Project;
  tags?: Tag[];
}

export interface Habit {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  frequency: HabitFrequency;
  targetCount: number;
  currentStreak: number;
  longestStreak: number;
  isActive: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;

  completions?: HabitCompletion[];
}

export interface HabitCompletion {
  id: string;
  habitId: string;
  completedAt: string;
  count: number;
  note: string | null;
}

export interface Goal {
  id: string;
  title: string;
  description: string | null;
  status: GoalStatus;
  targetDate: string | null;
  progress: number;
  userId: string;
  createdAt: string;
  updatedAt: string;

  milestones?: GoalMilestone[];
  linkedTasks?: Task[];
}

export interface GoalMilestone {
  id: string;
  title: string;
  isCompleted: boolean;
  completedAt: string | null;
  goalId: string;
  sortOrder: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  allDay: boolean;
  color: string | null;
  location: string | null;
  taskId: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;

  task?: Task;
}

export interface UserStats {
  id: string;
  userId: string;
  xp: number;
  level: number;
  coins: number;
  currentStreak: number;
  longestStreak: number;
  tasksCompleted: number;
  focusMinutes: number;
  lastActiveDate: string | null;
}

export interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  coinReward: number;
  requirement: number;
  category: string;
}

export interface UserAchievement {
  userId: string;
  achievementId: string;
  unlockedAt: string;
  achievement?: Achievement;
}

export interface ActivityLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: unknown | null;
  userId: string;
  createdAt: string;
  user?: User;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  entityType: string | null;
  entityId: string | null;
  userId: string;
  createdAt: string;
}

export interface TaskTemplate {
  id: string;
  name: string;
  description: string | null;
  templateData: unknown;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

// ---- API Types ----

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface ApiError {
  message: string;
  code: string;
  statusCode: number;
  details?: unknown;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export interface DashboardStats {
  tasksToday: number;
  tasksCompleted: number;
  tasksOverdue: number;
  currentStreak: number;
  focusMinutesToday: number;
  xp: number;
  level: number;
  productivityScore: number;
}

export interface ProductivityData {
  dailyCompletions: { date: string; count: number }[];
  weeklyCompletions: { week: string; count: number }[];
  categoryBreakdown: { category: string; count: number; color: string }[];
  hourlyProductivity: { hour: number; count: number }[];
  heatmapData: { date: string; count: number }[];
  focusHours: { date: string; minutes: number }[];
  mostProductiveDay: string;
  mostProductiveHour: number;
}

// ---- AI Types ----

export interface NaturalLanguageParseResult {
  title: string;
  dueDate: string | null;
  dueTime: string | null;
  priority: TaskPriority;
  tags: string[];
  projectName: string | null;
  description: string | null;
  estimatedMinutes: number | null;
}

export interface AiSubtaskSuggestion {
  title: string;
  estimatedMinutes: number | null;
  sortOrder: number;
}

export interface AiDailySummary {
  greeting: string;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  insights: string[];
  suggestions: string[];
  motivationalQuote: string;
}

// ---- WebSocket Events ----

export const WS_EVENTS = {
  // Client → Server
  JOIN_WORKSPACE: 'workspace:join',
  LEAVE_WORKSPACE: 'workspace:leave',

  // Server → Client
  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  TASK_DELETED: 'task:deleted',
  NOTIFICATION: 'notification',
  ACHIEVEMENT_UNLOCKED: 'achievement:unlocked',
  STATS_UPDATED: 'stats:updated',
} as const;
