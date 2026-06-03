import { prisma } from './prisma.js';
import { MILESTONE_TYPES } from '@speaking-coach/shared';
import type { MilestoneType } from '@speaking-coach/shared';

interface MilestoneCondition {
  type: MilestoneType;
  check: (ctx: MilestoneContext) => boolean;
}

interface MilestoneContext {
  totalSessions: number;
  currentStreak: number;
  maxFluencyEver: number;
  totalMinutes: number;
}

const CONDITIONS: MilestoneCondition[] = [
  { type: MILESTONE_TYPES.STREAK_7, check: (ctx) => ctx.currentStreak >= 7 },
  { type: MILESTONE_TYPES.STREAK_30, check: (ctx) => ctx.currentStreak >= 30 },
  { type: MILESTONE_TYPES.SESSIONS_10, check: (ctx) => ctx.totalSessions >= 10 },
  { type: MILESTONE_TYPES.SESSIONS_50, check: (ctx) => ctx.totalSessions >= 50 },
  { type: MILESTONE_TYPES.FLUENCY_80, check: (ctx) => ctx.maxFluencyEver >= 80 },
  { type: MILESTONE_TYPES.FLUENCY_90, check: (ctx) => ctx.maxFluencyEver >= 90 },
  { type: MILESTONE_TYPES.TOTAL_HOURS_5, check: (ctx) => ctx.totalMinutes >= 300 },
];

/**
 * Checks all milestone conditions for a user. Returns newly unlocked milestones.
 * Already-achieved milestones are skipped (unique constraint in DB).
 */
export async function checkMilestones(userId: string): Promise<MilestoneType[]> {
  const [streak, sessions, existing] = await Promise.all([
    prisma.streakData.findUnique({ where: { userId } }),
    prisma.session.aggregate({
      where: { userId },
      _max: { fluencyScore: true },
      _count: true,
    }),
    prisma.userMilestone.findMany({ where: { userId }, select: { type: true } }),
  ]);

  const alreadyUnlocked = new Set(existing.map((m) => m.type));

  const ctx: MilestoneContext = {
    currentStreak: streak?.currentStreak ?? 0,
    totalSessions: sessions._count,
    maxFluencyEver: sessions._max.fluencyScore ?? 0,
    totalMinutes: streak?.totalMinutes ?? 0,
  };

  const newMilestones: MilestoneType[] = CONDITIONS.filter(
    (c) => !alreadyUnlocked.has(c.type) && c.check(ctx),
  ).map((c) => c.type);

  if (newMilestones.length > 0) {
    await prisma.userMilestone.createMany({
      data: newMilestones.map((type) => ({ userId, type })),
      skipDuplicates: true,
    });
  }

  return newMilestones;
}
