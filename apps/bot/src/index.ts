import { Telegraf, Markup } from 'telegraf';
import { PrismaClient } from '@prisma/client';
import { MILESTONE_LABELS } from '@speaking-coach/shared';
import type { MilestoneType } from '@speaking-coach/shared';

const BOT_TOKEN = process.env['TELEGRAM_BOT_TOKEN'];
if (!BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is not set');

const WEB_APP_URL = process.env['WEB_APP_URL'] ?? 'https://your-app.vercel.app';
const WEBHOOK_URL = process.env['TELEGRAM_WEBHOOK_URL'];

const bot = new Telegraf(BOT_TOKEN);
const prisma = new PrismaClient();

// ─── Helper: get or create user by telegramId ─────────────────
async function getUser(telegramId: string) {
  return prisma.user.findUnique({ where: { telegramId } });
}

// ─── /start ───────────────────────────────────────────────────
bot.command('start', async (ctx) => {
  const telegramId = String(ctx.from.id);
  const username = ctx.from.username;
  const firstName = ctx.from.first_name;

  // Create user if new
  let user = await getUser(telegramId);
  if (!user) {
    user = await prisma.user.create({
      data: {
        telegramId,
        telegramUsername: username ?? null,
        name: firstName ?? 'Learner',
      },
    });
  }

  await ctx.reply(
    `👋 Welcome${firstName ? `, ${firstName}` : ''}!\n\n` +
      `I'm your *English Speaking Coach* powered by AI 🎙\n\n` +
      `Practice speaking, get instant corrections, and track your fluency progress.\n\n` +
      `📱 Open the app to start your first session:`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.webApp('🎙 Open SpeakAI', WEB_APP_URL)],
      ]),
    },
  );
});

// ─── /streak ──────────────────────────────────────────────────
bot.command('streak', async (ctx) => {
  const telegramId = String(ctx.from.id);
  const user = await getUser(telegramId);
  if (!user) {
    return ctx.reply('Please use /start first to register.');
  }

  const streak = await prisma.streakData.findUnique({ where: { userId: user.id } });

  if (!streak || streak.currentStreak === 0) {
    return ctx.reply(
      '🔥 No streak yet!\n\nStart your first session to begin building your streak.',
      Markup.inlineKeyboard([[Markup.button.webApp('Practice Now', WEB_APP_URL)]]),
    );
  }

  const emoji = streak.currentStreak >= 30 ? '🏆' : streak.currentStreak >= 7 ? '🔥' : '✨';

  return ctx.reply(
    `${emoji} *${streak.currentStreak}-day streak!*\n\n` +
      `Best streak: ${streak.longestStreak} days\n` +
      `Total sessions: ${streak.totalSessions}\n` +
      `Total practice: ${streak.totalMinutes} minutes`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.webApp('Continue Streak', WEB_APP_URL)]]),
    },
  );
});

// ─── /tip ─────────────────────────────────────────────────────
bot.command('tip', async (ctx) => {
  const telegramId = String(ctx.from.id);
  const user = await getUser(telegramId);
  if (!user) return ctx.reply('Please use /start first.');

  const patterns = await prisma.errorPattern.findMany({
    where: { userId: user.id, resolved: false },
    orderBy: { occurrences: 'desc' },
    take: 5,
  });

  if (patterns.length === 0) {
    return ctx.reply(
      '💡 Complete a few sessions first and I\'ll give you personalised grammar tips!',
    );
  }

  // Pick a random one from top 5
  const pick = patterns[Math.floor(Math.random() * patterns.length)];
  if (!pick) return ctx.reply('No tips yet!');

  return ctx.reply(
    `💡 *Grammar Tip for you*\n\n` +
      `You often make mistakes with: *${pick.pattern}*\n` +
      `(${pick.occurrences} time${pick.occurrences !== 1 ? 's' : ''} in your sessions)\n\n` +
      `Practice this in your next speaking session!`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.webApp('Practice Now', WEB_APP_URL)]]),
    },
  );
});

// ─── /report ──────────────────────────────────────────────────
bot.command('report', async (ctx) => {
  const telegramId = String(ctx.from.id);
  const user = await getUser(telegramId);
  if (!user) return ctx.reply('Please use /start first.');

  const report = await prisma.weeklyReport.findFirst({
    where: { userId: user.id },
    orderBy: { sentAt: 'desc' },
  });

  if (!report) {
    return ctx.reply('📊 No weekly report yet. Complete sessions throughout the week to get your report!');
  }

  const topErrors = (report.topErrors as any) as { pattern: string; occurrences: number }[];
  const topText = topErrors.map((e: any, i: number) => `${i + 1}. ${e.pattern} (${e.occurrences}×)`).join('\n');

  return ctx.reply(
    `📊 *Last Weekly Report* (${new Date(report.weekStart).toLocaleDateString()})\n\n` +
      `Sessions: *${report.sessionsCount}*\n` +
      `Avg Fluency: *${Math.round(report.avgFluency)}*\n\n` +
      (topText ? `🔴 Top mistakes:\n${topText}` : ''),
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.webApp('View Progress', WEB_APP_URL)]]),
    },
  );
});

// ─── Milestone notifications helper ──────────────────────────
export async function sendMilestoneNotification(telegramId: string, milestoneType: MilestoneType) {
  const label = MILESTONE_LABELS[milestoneType] ?? milestoneType;
  try {
    await bot.telegram.sendMessage(
      telegramId,
      `🎉 *Achievement Unlocked!*\n\n${label}\n\nKeep up the great work!`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.webApp('🏆 View Achievements', `${WEB_APP_URL}/milestones`)],
          [Markup.button.webApp('🎙 Keep Practicing', WEB_APP_URL)],
        ]),
      },
    );
  } catch (err) {
    console.error('Failed to send milestone notification:', err);
  }
}

// ─── Launch ───────────────────────────────────────────────────
async function main() {
  if (WEBHOOK_URL && process.env['NODE_ENV'] === 'production') {
    // Production: webhook
    await bot.telegram.setWebhook(`${WEBHOOK_URL}`);
    console.log(`Bot webhook set to ${WEBHOOK_URL}`);

    // Start webhook-based update receiving
    const { createServer } = await import('http');
    const server = createServer(await bot.webhookCallback('/bot/webhook'));
    const port = Number(process.env['BOT_PORT'] ?? 3002);
    server.listen(port, () => console.log(`Bot webhook server on port ${port}`));
  } else {
    // Development: long polling
    await bot.telegram.deleteWebhook();
    void bot.launch();
    console.log('Bot started in long-polling mode');
  }

  // Graceful shutdown
  process.once('SIGINT', () => {
    bot.stop('SIGINT');
    void prisma.$disconnect();
  });
  process.once('SIGTERM', () => {
    bot.stop('SIGTERM');
    void prisma.$disconnect();
  });
}

main().catch((err) => {
  console.error('Bot startup failed:', err);
  process.exit(1);
});
