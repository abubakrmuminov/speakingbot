import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { createHmac } from 'crypto';
import { prisma } from '../lib/prisma.js';
import { TelegramAuthSchema, EmailAuthSchema, RefreshTokenSchema } from '@speaking-coach/shared';

export async function authRoutes(fastify: FastifyInstance) {
  // ─── Email Sign-up / Sign-in ──────────────────────────────────
  fastify.post('/auth/email', async (request, reply) => {
    const body = EmailAuthSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const { email, password } = body.data;

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Register
      const hash = await bcrypt.hash(password, 12);
      user = await prisma.user.create({
        data: { email, passwordHash: hash, name: email.split('@')[0], photoUrl: null } as any,
      });
    } else {
      // Login
      if (!user.passwordHash) {
        return reply.status(401).send({ error: 'Use Telegram login for this account.' });
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return reply.status(401).send({ error: 'Invalid credentials.' });
    }

    const accessToken = (fastify.jwt as any).sign({ id: user.id, email: user.email }, { expiresIn: '15m' });
    const refreshToken = (fastify.jwt as any).sign(
      { id: user.id, type: 'refresh' },
      { expiresIn: '30d', secret: process.env['JWT_REFRESH_SECRET'] },
    );

    return reply.send({
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, telegramUsername: user.telegramUsername } as any,
    });
  });

  // ─── Telegram WebApp initData Auth ───────────────────────────
  fastify.post('/auth/telegram', async (request, reply) => {
    const body = TelegramAuthSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const { initData } = body.data;
    const botToken = process.env['TELEGRAM_BOT_TOKEN'] ?? '';

    // Verify HMAC signature
    const params = new URLSearchParams(initData);
    const hash = params.get('hash') ?? '';
    params.delete('hash');

    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
    const expectedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (expectedHash !== hash) {
      return reply.status(401).send({ error: 'Invalid Telegram initData signature.' });
    }

    const userDataRaw = params.get('user');
    if (!userDataRaw) return reply.status(400).send({ error: 'Missing user in initData.' });

    type TgUser = { id: number; first_name?: string; last_name?: string; username?: string; photo_url?: string };
    const tgUser = JSON.parse(userDataRaw) as TgUser;

    const telegramId = String(tgUser.id);
    const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || 'User';
    let user = await prisma.user.findUnique({ where: { telegramId } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramId,
          telegramUsername: tgUser.username ?? null,
          name: fullName,
          photoUrl: tgUser.photo_url ?? null,
        },
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          telegramUsername: tgUser.username ?? user.telegramUsername,
          name: fullName,
          photoUrl: tgUser.photo_url ?? user.photoUrl,
        },
      });
    }

    const accessToken = (fastify.jwt as any).sign({ id: user.id, email: user.email }, { expiresIn: '15m' });
    const refreshToken = (fastify.jwt as any).sign(
      { id: user.id, type: 'refresh' },
      { expiresIn: '30d', secret: process.env['JWT_REFRESH_SECRET'] },
    );

    return reply.send({
      accessToken,
      refreshToken,
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        telegramUsername: user.telegramUsername,
        photoUrl: user.photoUrl 
      } as any,
    });
  });

  // ─── Refresh Token ────────────────────────────────────────────
  fastify.post('/auth/refresh', async (request, reply) => {
    const body = RefreshTokenSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    try {
      const payload = (fastify.jwt as any).verify(
        body.data.refreshToken,
        { secret: process.env['JWT_REFRESH_SECRET'] },
      ) as { id: string; type: string };

      if (payload.type !== 'refresh') throw new Error('Not a refresh token');

      const user = await prisma.user.findUniqueOrThrow({ where: { id: payload.id } });
      const accessToken = (fastify.jwt as any).sign({ id: user.id, email: user.email }, { expiresIn: '15m' });

      return reply.send({ accessToken });
    } catch {
      return reply.status(401).send({ error: 'Invalid or expired refresh token.' });
    }
  });
}
