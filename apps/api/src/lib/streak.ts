import { prisma } from './prisma.js';

/**
 * Updates the user's streak after completing a session.
 * - If they practiced today already → no change to streak count, just totals.
 * - If last active was yesterday → streak continues (+1).
 * - If last active was more than 1 day ago → streak resets to 1.
 */
export async function updateStreak(userId: string, sessionDurationMinutes = 5) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await prisma.streakData.findUnique({ where: { userId } });

  if (!existing) {
    // First session ever
    return prisma.streakData.create({
      data: {
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastActiveDate: new Date(),
        totalSessions: 1,
        totalMinutes: sessionDurationMinutes,
      },
    });
  }

  const lastActive = existing.lastActiveDate ? new Date(existing.lastActiveDate) : null;
  const lastActiveDay = lastActive ? new Date(lastActive) : null;
  if (lastActiveDay) lastActiveDay.setHours(0, 0, 0, 0);

  const todayTime = today.getTime();
  const lastActiveTime = lastActiveDay?.getTime() ?? 0;
  const oneDayMs = 86_400_000;

  let newStreak = existing.currentStreak;

  if (lastActiveTime === todayTime) {
    // Already practiced today — just update totals
  } else if (todayTime - lastActiveTime === oneDayMs) {
    // Practiced yesterday → continue streak
    newStreak += 1;
  } else {
    // Gap > 1 day → reset
    newStreak = 1;
  }

  const newLongest = Math.max(existing.longestStreak, newStreak);

  return prisma.streakData.update({
    where: { userId },
    data: {
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastActiveDate: new Date(),
      totalSessions: { increment: 1 },
      totalMinutes: { increment: sessionDurationMinutes },
    },
  });
}
