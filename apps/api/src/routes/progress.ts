import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';

export async function progressRoutes(fastify: FastifyInstance) {
  const authenticate = fastify.authenticate;

  // ─── GET /progress/stats ────────────────────────────────────
  fastify.get('/progress/stats', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user.id;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [streak, recentSessions, last7Sessions] = await Promise.all([
      prisma.streakData.findUnique({ where: { userId } }),
      prisma.session.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, topic: true, scenario: true, fluencyScore: true, createdAt: true },
      }),
      prisma.session.findMany({
        where: { userId, createdAt: { gte: sevenDaysAgo } },
        select: { fluencyScore: true },
      }),
    ]);

    const avgFluencyLast7Days =
      last7Sessions.length > 0
        ? last7Sessions.reduce((acc: number, s: any) => acc + s.fluencyScore, 0) / last7Sessions.length
        : 0;

    return reply.send({
      streak: streak ?? {
        currentStreak: 0, longestStreak: 0, lastActiveDate: null,
        totalSessions: 0, totalMinutes: 0,
      },
      avgFluencyLast7Days: Math.round(avgFluencyLast7Days),
      totalSessions: streak?.totalSessions ?? 0,
      totalMinutes: streak?.totalMinutes ?? 0,
      recentSessions: recentSessions.map((s: any) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
      })),
    });
  });

  // ─── GET /progress/heatmap ───────────────────────────────────
  fastify.get('/progress/heatmap', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user.id;

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const sessions = await prisma.session.findMany({
      where: { userId, createdAt: { gte: oneYearAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date (YYYY-MM-DD)
    const countByDate = new Map<string, number>();
    for (const s of sessions) {
      const date = s.createdAt.toISOString().slice(0, 10);
      countByDate.set(date, (countByDate.get(date) ?? 0) + 1);
    }

    const heatmap = Array.from(countByDate.entries()).map(([date, count]) => ({ date, count }));
    return reply.send({ heatmap });
  });

  // ─── GET /progress/error-patterns ────────────────────────────
  fastify.get('/progress/error-patterns', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user.id;

    const patterns = await prisma.errorPattern.findMany({
      where: { userId },
      orderBy: [{ resolved: 'asc' }, { occurrences: 'desc' }],
    });

    return reply.send({
      patterns: patterns.map((p: any) => ({
        ...p,
        lastSeen: p.lastSeen.toISOString(),
      })),
    });
  });

  // ─── GET /progress/fluency-chart ─────────────────────────────
  fastify.get<{ Querystring: { days?: string } }>(
    '/progress/fluency-chart',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user.id;
      const days = Math.min(Number(request.query.days ?? 30), 90);

      const since = new Date();
      since.setDate(since.getDate() - days);

      const sessions = await prisma.session.findMany({
        where: { userId, createdAt: { gte: since } },
        select: { fluencyScore: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      });

      // One point per session (use daily average if multiple sessions per day)
      const byDate = new Map<string, number[]>();
      for (const s of sessions) {
        const date = s.createdAt.toISOString().slice(0, 10);
        const arr = byDate.get(date) ?? [];
        arr.push(s.fluencyScore);
        byDate.set(date, arr);
      }

      const points = Array.from(byDate.entries()).map(([date, scores]) => ({
        date,
        score: Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length),
      }));

      return reply.send({ points });
    },
  );
}
