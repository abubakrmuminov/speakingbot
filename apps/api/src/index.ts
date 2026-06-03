import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { authRoutes } from './routes/auth.js';
import { sessionRoutes } from './routes/sessions.js';
import { progressRoutes } from './routes/progress.js';
import { milestoneRoutes } from './routes/milestones.js';
import { readingRoutes } from './routes/reading.js';
import authPlugin from './plugins/auth.js';
import { startCronJobs } from './cron.js';
import { prisma } from './lib/prisma.js';

const PORT = Number(process.env['API_PORT'] ?? 3001);
const HOST = process.env['API_HOST'] ?? '0.0.0.0';

async function build() {
  const fastify = Fastify({
    logger: {
      level: process.env['NODE_ENV'] === 'production' ? 'warn' : 'info',
      ...(process.env['NODE_ENV'] !== 'production' && {
        transport: { target: 'pino-pretty', options: { colorize: true } },
      }),
    },
  });

  // ─── Plugins ──────────────────────────────────────────────────
  await fastify.register(cors, {
    origin: process.env['NODE_ENV'] === 'production'
      ? [process.env['WEB_APP_URL'] ?? '']
      : true,
    credentials: true,
  });

  await fastify.register(jwt, {
    secret: process.env['JWT_SECRET'] ?? 'dev-secret-change-me',
  });

  await fastify.register(multipart, {
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max audio
  });

  await fastify.register(rateLimit, {
    global: false, // apply per-route via config
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (req: any) => req.user?.id ?? req.ip,
  });

  // ─── Auth decorator ───────────────────────────────────────────
  await fastify.register(authPlugin);

  // ─── Health check ─────────────────────────────────────────────
  fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // ─── Routes ───────────────────────────────────────────────────
  await fastify.register(authRoutes);
  await fastify.register(sessionRoutes, {
    // Per-user rate limit on audio processing: 20/hour
    config: { rateLimit: { max: 20, timeWindow: '1 hour' } },
  });
  await fastify.register(progressRoutes);
  await fastify.register(milestoneRoutes);
  await fastify.register(readingRoutes, { prefix: '/reading' });

  // ─── Graceful shutdown ────────────────────────────────────────
  const shutdown = async () => {
    fastify.log.info('Shutting down...');
    await fastify.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return fastify;
}

// ─── Start ────────────────────────────────────────────────────
build()
  .then(async (fastify) => {
    await fastify.listen({ port: PORT, host: HOST });
    fastify.log.info(`API running on http://${HOST}:${PORT}`);
    startCronJobs(fastify.log);
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
