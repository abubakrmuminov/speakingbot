// Shared constants used across API, Web and Bot

export const SCENARIOS = [
  'debate',
  'job_interview',
  'cafe',
  'travel',
  'presentation',
  'small_talk',
  'negotiation',
] as const;

export type Scenario = (typeof SCENARIOS)[number];

export const ERROR_CATEGORIES = ['grammar', 'vocabulary', 'pronunciation'] as const;
export type ErrorCategory = (typeof ERROR_CATEGORIES)[number];

export const MILESTONE_TYPES = {
  STREAK_7: 'streak_7',
  STREAK_30: 'streak_30',
  SESSIONS_10: 'sessions_10',
  SESSIONS_50: 'sessions_50',
  FLUENCY_80: 'fluency_80',
  FLUENCY_90: 'fluency_90',
  TOTAL_HOURS_5: 'total_hours_5',
} as const;

export type MilestoneType = (typeof MILESTONE_TYPES)[keyof typeof MILESTONE_TYPES];

export const MILESTONE_LABELS: Record<MilestoneType, string> = {
  streak_7: '7-Day Streak 🔥',
  streak_30: '30-Day Streak 🏆',
  sessions_10: '10 Sessions Completed 🎯',
  sessions_50: '50 Sessions Completed 💪',
  fluency_80: 'Fluency Score 80+ 📈',
  fluency_90: 'Fluency Score 90+ 🌟',
  total_hours_5: '5 Hours of Practice ⏱️',
};

// Fluency score weights
export const FLUENCY_WEIGHTS = {
  BASE: 60,
  CONFIDENCE_MULTIPLIER: 4,
  SPEED_BONUS_CAP: 20,
  SPEED_BASELINE_WPM: 80,
  ERROR_PENALTY: 4,
  PAUSE_PENALTY: 2,
} as const;

// Rate limiting
export const RATE_LIMITS = {
  /** max sessions per hour per user */
  SESSIONS_PER_HOUR: 20,
  /** window in milliseconds */
  WINDOW_MS: 60 * 60 * 1000,
} as const;

export const DIFFICULTY_LABELS: Record<string, string> = {
  A2: 'Beginner',
  B1: 'Intermediate',
  B2: 'Upper Intermediate',
  C1: 'Advanced',
};
