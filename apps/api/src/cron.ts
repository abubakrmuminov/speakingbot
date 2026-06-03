import cron from 'node-cron';
import { prisma } from './lib/prisma.js';
import type { FastifyBaseLogger } from 'fastify';

/**
 * Starts all scheduled jobs. Called once after the server is ready.
 */
export function startCronJobs(log: FastifyBaseLogger) {
  // ─── Daily at 19:00 — streak reminder ─────────────────────────
  cron.schedule('0 19 * * *', async () => {
    log.info('Running daily streak reminder job...');

    const botToken = process.env['TELEGRAM_BOT_TOKEN'];
    if (!botToken) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find users who haven't practiced today and have a non-zero streak
    const at_risk = await prisma.streakData.findMany({
      where: {
        currentStreak: { gt: 0 },
        OR: [
          { lastActiveDate: null },
          { lastActiveDate: { lt: today } },
        ],
      },
      include: { user: { select: { telegramId: true } } },
    });

    for (const record of at_risk) {
      const telegramId = record.user.telegramId;
      if (!telegramId) continue;

      const webAppUrl = process.env['WEB_APP_URL'] ?? 'https://your-app.vercel.app';

      const payload = {
        chat_id: telegramId,
        text:
          `🔥 Your ${record.currentStreak}-day streak is at risk!\n` +
          `You haven't practiced today. Keep it going 👇`,
        reply_markup: {
          inline_keyboard: [[
            { text: '🎙 Practice now', web_app: { url: webAppUrl } },
          ]],
        },
      };

      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        log.warn({ err, telegramId }, 'Failed to send streak reminder');
      }
    }

    log.info(`Streak reminders sent to ${at_risk.length} users`);
  });

  // ─── Every Sunday at 10:00 — weekly report ────────────────────
  cron.schedule('0 10 * * 0', async () => {
    log.info('Running weekly report job...');

    const botToken = process.env['TELEGRAM_BOT_TOKEN'];
    if (!botToken) return;

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const users = await prisma.user.findMany({
      where: { telegramId: { not: null } },
      select: { id: true, telegramId: true, name: true },
    });

    for (const user of users) {
      if (!user.telegramId) continue;

      const [sessions, topErrors] = await Promise.all([
        prisma.session.findMany({
          where: { userId: user.id, createdAt: { gte: weekStart } },
          select: { fluencyScore: true },
        }),
        prisma.errorPattern.findMany({
          where: { userId: user.id, resolved: false },
          orderBy: { occurrences: 'desc' },
          take: 3,
          select: { pattern: true, occurrences: true },
        }),
      ]);

      if (sessions.length === 0) continue;

      const avg = Math.round(
        sessions.reduce((a: number, s: any) => a + s.fluencyScore, 0) / sessions.length,
      );

      const topText = topErrors.map((e: any, i: number) => `${i + 1}. ${e.pattern} (${e.occurrences}×)`).join('\n');

      const text =
        `📊 *Your week in English, ${user.name ?? 'learner'}!*\n\n` +
        `Sessions: *${sessions.length}* | Avg Fluency: *${avg}*\n\n` +
        (topText ? `🔴 Top mistakes:\n${topText}\n\n` : '') +
        `Keep going, you're improving! 💪`;

      // Save report
      await prisma.weeklyReport.create({
        data: {
          userId: user.id,
          weekStart,
          topErrors: topErrors,
          avgFluency: avg,
          sessionsCount: sessions.length,
        },
      });

      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: user.telegramId,
            text,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [[
                { text: '🎙 Keep practicing', web_app: { url: process.env['WEB_APP_URL'] ?? '' } },
              ]],
            },
          }),
        });
      } catch (err) {
        log.warn({ err, userId: user.id }, 'Failed to send weekly report');
      }
    }

    log.info(`Weekly reports processed for ${users.length} users`);
  });

  log.info('Cron jobs registered: daily streak reminder (19:00), weekly report (Sun 10:00)');
}
