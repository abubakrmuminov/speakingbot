import { z } from 'zod';
import { ERROR_CATEGORIES, SCENARIOS } from './constants.js';

// ─── Auth ──────────────────────────────────────────────────────────────────

export const TelegramAuthSchema = z.object({
  initData: z.string().min(1),
});

export const EmailAuthSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string().nullable(),
    telegramUsername: z.string().nullable(),
  }),
});

// ─── Sessions ──────────────────────────────────────────────────────────────

export const ErrorItemSchema = z.object({
  original: z.string(),
  corrected: z.string(),
  explanation: z.string(),
  category: z.enum(ERROR_CATEGORIES),
  pattern: z.string(),
});

export const GeminiAnalysisResponseSchema = z.object({
  transcript: z.string(),
  wordsPerMinute: z.number().int().nonnegative(),
  pauseCount: z.number().int().nonnegative(),
  confidenceLevel: z.number().int().min(1).max(5),
  errors: z.array(ErrorItemSchema).max(4),
  dialogueReply: z.string(),
  grammarTip: z.string(),
  topicFeedback: z.string(),
});

export const SessionStartResponseSchema = z.object({
  topic: z.string(),
  scenario: z.enum(SCENARIOS),
  openingLine: z.string(),
  difficulty: z.string(),
});

export const SessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  topic: z.string(),
  scenario: z.enum(SCENARIOS),
  audioUrl: z.string().nullable(),
  transcript: z.string(),
  errorAnalysis: z.array(ErrorItemSchema),
  dialogueReply: z.string(),
  grammarTip: z.string(),
  topicFeedback: z.string(),
  fluencyScore: z.number().int().min(0).max(100),
  wordsPerMinute: z.number().nullable(),
  pauseCount: z.number().nullable(),
  errorCount: z.number().int().nonnegative(),
  confidenceLevel: z.number().int().min(1).max(5),
  createdAt: z.string(),
});

export const SessionListResponseSchema = z.object({
  sessions: z.array(SessionSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

export const SessionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

// ─── Progress ──────────────────────────────────────────────────────────────

export const StreakDataSchema = z.object({
  currentStreak: z.number().int().nonnegative(),
  longestStreak: z.number().int().nonnegative(),
  lastActiveDate: z.string().nullable(),
  totalSessions: z.number().int().nonnegative(),
  totalMinutes: z.number().int().nonnegative(),
});

export const ProgressStatsSchema = z.object({
  streak: StreakDataSchema,
  avgFluencyLast7Days: z.number(),
  totalSessions: z.number().int(),
  totalMinutes: z.number().int(),
  recentSessions: z.array(
    SessionSchema.pick({
      id: true,
      topic: true,
      scenario: true,
      fluencyScore: true,
      createdAt: true,
    }),
  ),
});

export const HeatmapDaySchema = z.object({
  date: z.string(),
  count: z.number().int().nonnegative(),
});

export const FluencyPointSchema = z.object({
  date: z.string(),
  score: z.number(),
});

export const ErrorPatternSchema = z.object({
  id: z.string(),
  category: z.enum(ERROR_CATEGORIES),
  pattern: z.string(),
  occurrences: z.number().int().nonnegative(),
  lastSeen: z.string(),
  resolved: z.boolean(),
});

// ─── Milestones ────────────────────────────────────────────────────────────

export const MilestoneSchema = z.object({
  id: z.string(),
  type: z.string(),
  achievedAt: z.string(),
  sharedCard: z.boolean(),
});

// ─── Reading ──────────────────────────────────────────────────────────────

export const GenerateReadingSchema = z.object({
  difficulty: z.enum(['B2', 'C1']).optional(),
});

export const SubmitReadingSchema = z.object({
  sessionId: z.string(),
  answers: z.array(
    z.object({
      questionId: z.string(),
      answer: z.string(),
    }),
  ),
});

export const ReadingSessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  passage: z.string(),
  topic: z.string(),
  difficulty: z.string(),
  totalQuestions: z.number().int(),
  correctAnswers: z.number().int(),
  readingScore: z.number().int(),
  timeSpentSeconds: z.number().int().nullable(),
  createdAt: z.string(),
});

// Type exports derived from schemas
export type TelegramAuth = z.infer<typeof TelegramAuthSchema>;
export type EmailAuth = z.infer<typeof EmailAuthSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type SessionStartResponse = z.infer<typeof SessionStartResponseSchema>;
export type SessionListQuery = z.infer<typeof SessionListQuerySchema>;
export type GenerateReadingRequest = z.infer<typeof GenerateReadingSchema>;
export type SubmitReadingRequest = z.infer<typeof SubmitReadingSchema>;
export type ReadingSessionResponse = z.infer<typeof ReadingSessionSchema>;
