import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { analyzeAudio, generateTopic } from '../lib/gemini.js';
import { calculateFluencyScore } from '../lib/fluency.js';
import { updateStreak } from '../lib/streak.js';
import { checkMilestones } from '../lib/milestones.js';
import { SessionListQuerySchema } from '@speaking-coach/shared';
import type { MultipartFile } from '@fastify/multipart';

export async function sessionRoutes(fastify: FastifyInstance) {
  // ─── POST /sessions/start ─────────────────────────────────────
  fastify.post('/sessions/start', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userId = request.user.id;

    const topErrors = await prisma.errorPattern.findMany({
      where: { userId, resolved: false },
      orderBy: { occurrences: 'desc' },
      take: 3,
    });

    try {
      const topic = await generateTopic(topErrors);
      return reply.send(topic);
    } catch (err) {
      fastify.log.error(err, 'Failed to generate topic');
      return reply.status(503).send({
        error: 'AI service temporarily unavailable. Please try again in a moment.',
      });
    }
  });

  // ─── POST /sessions/process ───────────────────────────────────
  fastify.post('/sessions/process', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userId = request.user.id;

    let file: MultipartFile | undefined;
    let topic = '';
    let scenario = '';

    try {
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === 'file' && part.fieldname === 'audio') {
          file = part;
        } else if (part.type === 'field') {
          if (part.fieldname === 'topic') topic = String(part.value);
          if (part.fieldname === 'scenario') scenario = String(part.value);
        }
      }
    } catch {
      return reply.status(400).send({ error: 'Failed to parse multipart form data.' });
    }

    if (!file) return reply.status(400).send({ error: 'Audio file is required.' });
    if (!topic || !scenario) return reply.status(400).send({ error: 'topic and scenario fields are required.' });

    // Read audio into buffer (and immediately release)
    const chunks: Buffer[] = [];
    for await (const chunk of file.file) {
      chunks.push(chunk as Buffer);
    }
    const audioBuffer = Buffer.concat(chunks);
    const mimeType = file.mimetype || 'audio/webm';

    // Call Gemini
    let analysis;
    try {
      analysis = await analyzeAudio(audioBuffer, mimeType);
    } catch (err) {
      fastify.log.error(err, 'Gemini analysis failed');
      return reply.status(503).send({
        error: 'AI analysis failed. Please check your audio and try again.',
      });
    }

    const errorCount = analysis.errors.length;
    const fluencyScore = calculateFluencyScore({
      wordsPerMinute: analysis.wordsPerMinute,
      pauseCount: analysis.pauseCount,
      errorCount,
      confidenceLevel: analysis.confidenceLevel,
    });

    // Estimate session duration from WPM (rough: avg 130 wpm → ~5 min)
    const estimatedMinutes = Math.max(1, Math.round(analysis.wordsPerMinute > 0
      ? (analysis.transcript.split(/\s+/).length / analysis.wordsPerMinute)
      : 3));

    // Persist everything in parallel
    const [session] = await Promise.all([
      prisma.session.create({
        data: {
          userId,
          topic,
          scenario,
          transcript: analysis.transcript,
          errorAnalysis: analysis.errors as any,
          dialogueReply: analysis.dialogueReply,
          grammarTip: analysis.grammarTip,
          topicFeedback: analysis.topicFeedback,
          fluencyScore,
          wordsPerMinute: analysis.wordsPerMinute,
          pauseCount: analysis.pauseCount,
          errorCount,
          confidenceLevel: analysis.confidenceLevel,
        },
      }),
      // Upsert each error pattern
      ...analysis.errors.map((e) =>
        prisma.errorPattern.upsert({
          where: { userId_pattern: { userId, pattern: e.pattern } },
          create: {
            userId,
            category: e.category,
            pattern: e.pattern,
            occurrences: 1,
          },
          update: {
            occurrences: { increment: 1 },
            lastSeen: new Date(),
            resolved: false,
          },
        }),
      ),
      updateStreak(userId, estimatedMinutes),
    ]);

    // Check milestones (non-blocking)
    const newMilestones = await checkMilestones(userId).catch((err) => {
      fastify.log.warn(err, 'Milestone check failed — non-fatal');
      return [] as string[];
    });

    return reply.send({
      session: {
        ...session,
        createdAt: session.createdAt.toISOString(),
      },
      newMilestones,
    });
  });

  // ─── GET /sessions ────────────────────────────────────────────
  fastify.get('/sessions', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const query = SessionListQuerySchema.safeParse(request.query);
    if (!query.success) return reply.status(400).send({ error: query.error.flatten() });

    const { page, pageSize } = query.data;
    const skip = (page - 1) * pageSize;

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where: { userId: request.user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          topic: true,
          scenario: true,
          fluencyScore: true,
          errorCount: true,
          createdAt: true,
        },
      }),
      prisma.session.count({ where: { userId: request.user.id } }),
    ]);

    return reply.send({
      sessions: sessions.map((s: any) => ({ ...s, createdAt: s.createdAt.toISOString() })),
      total,
      page,
      pageSize,
    });
  });

  // ─── GET /sessions/:id ────────────────────────────────────────
  fastify.get<{ Params: { id: string } }>('/sessions/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const session = await prisma.session.findFirst({
      where: { id: request.params.id, userId: request.user.id },
    });

    if (!session) return reply.status(404).send({ error: 'Session not found.' });

    return reply.send({ ...session, createdAt: session.createdAt.toISOString() });
  });
}
