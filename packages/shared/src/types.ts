import type { ErrorCategory, MilestoneType, Scenario } from './constants.js';

// ─── User ──────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string | null;
  telegramId: string | null;
  telegramUsername: string | null;
  name: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Session ───────────────────────────────────────────────────────────────

export interface ErrorItem {
  original: string;
  corrected: string;
  explanation: string;
  category: ErrorCategory;
  pattern: string;
}

export interface Session {
  id: string;
  userId: string;
  topic: string;
  scenario: Scenario;
  audioUrl: string | null;
  transcript: string;
  errorAnalysis: ErrorItem[];
  dialogueReply: string;
  grammarTip: string;
  topicFeedback: string;
  fluencyScore: number;
  wordsPerMinute: number | null;
  pauseCount: number | null;
  errorCount: number;
  confidenceLevel: number;
  createdAt: string;
}

// ─── Error Pattern ─────────────────────────────────────────────────────────

export interface ErrorPattern {
  id: string;
  userId: string;
  category: ErrorCategory;
  pattern: string;
  occurrences: number;
  lastSeen: string;
  resolved: boolean;
}

// ─── Streak / Progress ─────────────────────────────────────────────────────

export interface StreakData {
  id: string;
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  totalSessions: number;
  totalMinutes: number;
}

export interface ProgressStats {
  streak: StreakData;
  avgFluencyLast7Days: number;
  totalSessions: number;
  totalMinutes: number;
  recentSessions: Pick<Session, 'id' | 'topic' | 'scenario' | 'fluencyScore' | 'createdAt'>[];
}

export interface HeatmapDay {
  date: string; // ISO date YYYY-MM-DD
  count: number;
}

export interface FluencyPoint {
  date: string;
  score: number;
}

// ─── Milestone ─────────────────────────────────────────────────────────────

export interface UserMilestone {
  id: string;
  userId: string;
  type: MilestoneType;
  achievedAt: string;
  sharedCard: boolean;
}

// ─── Topic Generation ──────────────────────────────────────────────────────

export interface GeneratedTopic {
  topic: string;
  scenario: Scenario;
  openingLine: string;
  difficulty: string;
}

// ─── Gemini Raw Response ───────────────────────────────────────────────────

export interface GeminiAnalysisResponse {
  transcript: string;
  wordsPerMinute: number;
  pauseCount: number;
  confidenceLevel: number;
  errors: ErrorItem[];
  dialogueReply: string;
  grammarTip: string;
  topicFeedback: string;
}
// ─── Reading ──────────────────────────────────────────────────────────────

export type QuestionType = 'multiple_choice' | 'true_false_ng' | 'open';

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export interface UserAnswer {
  questionId: string;
  answer: string;
  isCorrect: boolean;
  aiExplanation?: string;
}

export interface ReadingPassage {
  passage: string;
  topic: string;
  difficulty: 'B2' | 'C1';
  questions: Question[];
}

export interface ReadingResult {
  sessionId: string;
  totalQuestions: number;
  correctAnswers: number;
  readingScore: number;
  answers: UserAnswer[];
}

export interface ReadingSession {
  id: string;
  userId: string;
  passage: string;
  topic: string;
  difficulty: string;
  questions: Question[];
  userAnswers: UserAnswer[];
  totalQuestions: number;
  correctAnswers: number;
  readingScore: number;
  timeSpentSeconds: number | null;
  createdAt: string;
}
