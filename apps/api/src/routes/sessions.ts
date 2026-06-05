import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { analyzeAudio, generateTopic } from '../lib/gemini.js';
import { calculateFluencyScore } from '../lib/fluency.js';
import { updateStreak } from '../lib/streak.js';
import { checkMilestones } from '../lib/milestones.js';
import { assessPronunciation, convertToWav } from '../lib/azure-speech.js';
import { SessionListQuerySchema, type PronunciationWord, type PronunciationPhoneme } from '@speaking-coach/shared';
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
    fastify.log.info({ userId }, '[process] Request received');

    let audioBuffer: Buffer | undefined;
    let mimeType = 'audio/webm';
    let topic = '';
    let scenario = '';

    try {
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === 'file' && part.fieldname === 'audio') {
          fastify.log.info({ mimeType: part.mimetype, filename: part.filename }, '[process] Consuming audio part');
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) {
            chunks.push(chunk as Buffer);
          }
          audioBuffer = Buffer.concat(chunks);
          mimeType = part.mimetype || 'audio/webm';
          fastify.log.info({ sizeKB: Math.round(audioBuffer.length / 1024) }, '[process] Audio buffered');
        } else if (part.type === 'field') {
          if (part.fieldname === 'topic') topic = String(part.value);
          if (part.fieldname === 'scenario') scenario = String(part.value);
        }
      }
      fastify.log.info({ hasAudio: !!audioBuffer, topic, scenario }, '[process] Multipart processing finished');
    } catch (err) {
      fastify.log.error({ err }, '[process] Failed to parse multipart');
      return reply.status(400).send({ error: 'Failed to parse multipart form data.' });
    }

    if (!audioBuffer) {
      fastify.log.warn('[process] No audio data received');
      return reply.status(400).send({ error: 'Audio file is required.' });
    }
    if (!topic || !scenario) {
      fastify.log.warn({ topic, scenario }, '[process] Missing fields');
      return reply.status(400).send({ error: 'topic and scenario fields are required.' });
    }

    fastify.log.info(
      { sizeKB: Math.round(audioBuffer.length / 1024), mimeType, topic, scenario },
      '[process] Data ready — starting parallel analysis',
    );

    const t0 = Date.now();
    let wavBuffer: Buffer | undefined;
    try {
      wavBuffer = await convertToWav(audioBuffer);
    } catch (err) {
      fastify.log.warn({ err }, '[process] WAV conversion failed — pronunciation assessment will be skipped');
    }

    // Azure + Gemini in parallel
    const [geminiResult, pronResult] = await Promise.allSettled([
      analyzeAudio(audioBuffer, mimeType),
      wavBuffer ? assessPronunciation(wavBuffer, topic) : Promise.reject(new Error('No wav buffer')),
    ]);

    const analysis = geminiResult.status === 'fulfilled' ? geminiResult.value : null;
    const pronunciation = pronResult.status === 'fulfilled' ? pronResult.value : null;

    if (!analysis && !pronunciation) {
      fastify.log.error({ 
        geminiError: (geminiResult as any).reason,
        azureError: (pronResult as any).reason
      }, '[process] BOTH Gemini and Azure FAILED');
      return reply.status(503).send({
        error: 'Analysis failed. Please try again later.',
      });
    }

    fastify.log.info(
      { 
        ms: Date.now() - t0, 
        geminiOk: !!analysis, 
        azureOk: !!pronunciation 
      },
      '[process] Analysis complete',
    );

    // Fallback if Gemini fails but Azure succeeded
    const finalTranscript = analysis?.transcript || pronunciation?.transcript || '';
    const finalWpm = analysis?.wordsPerMinute || 0;
    const finalPauseCount = analysis?.pauseCount || 0;
    const finalConfidence = analysis?.confidenceLevel || 3;
    const finalErrors = analysis?.errors || [];

    const errorCount = finalErrors.length;
    const fluencyScore = calculateFluencyScore({
      wordsPerMinute: finalWpm,
      pauseCount: finalPauseCount,
      errorCount,
      confidenceLevel: finalConfidence,
      pronunciationScore: pronunciation?.pronunciationScore,
    });

    // Estimate session duration
    const estimatedMinutes = Math.max(1, Math.round(finalWpm > 0
      ? (finalTranscript.split(/\s+/).length / finalWpm)
      : 3));

    const pronErrors = pronunciation?.words
      .filter((w: PronunciationWord) => w.errorType === 'Mispronunciation' && w.accuracyScore < 80)
      .map((w: PronunciationWord) => ({
        category: 'pronunciation' as const,
        pattern: `Pronunciation: "${w.word}" (${
          w.phonemes
            .filter((p: PronunciationPhoneme) => !p.isCorrect)
            .map((p: PronunciationPhoneme) => `/${p.phoneme}/`)
            .join(', ')
        })`,
        original: w.word,
        corrected: w.word,
        explanation: `Azure detected mispronunciation on specific phonemes. Overall word accuracy: ${w.accuracyScore}%`,
      })) ?? [];

    const mergedErrors = [...finalErrors, ...pronErrors];
    const errorCount = mergedErrors.length;

    const fluencyScore = calculateFluencyScore({
      wordsPerMinute: finalWpm,
      pauseCount: finalPauseCount,
      errorCount,
      confidenceLevel: finalConfidence,
      pronunciationScore: pronunciation?.overallScore,
    });

    // Estimate session duration
    const estimatedMinutes = Math.max(1, Math.round(finalWpm > 0
      ? (finalTranscript.split(/\s+/).length / finalWpm)
      : 3));

    // Persist everything in parallel
    const [session] = await Promise.all([
      prisma.session.create({
        data: {
          userId,
          topic,
          scenario,
          transcript: finalTranscript,
          errorAnalysis: mergedErrors as any,
          dialogueReply: analysis?.dialogueReply || "I've analyzed your pronunciation, but I'm currently unable to provide grammar feedback. Please try again in a few minutes.",
          grammarTip: analysis?.grammarTip || "Check back later for grammar tips!",
          topicFeedback: analysis?.topicFeedback || "",
          fluencyScore,
          wordsPerMinute: finalWpm,
          pauseCount: finalPauseCount,
          errorCount,
          confidenceLevel: finalConfidence,
          pronunciationScore: pronunciation?.pronunciationScore ?? null,
          pronunciationData: pronunciation as any ?? null,
        },
      }),
      // Upsert each error pattern
      ...mergedErrors.map((e) =>
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
      // Upsert each Pronunciation error
      ...pronErrors.map((pe: { category: "pronunciation"; pattern: string }) =>
        prisma.errorPattern.upsert({
          where: { userId_pattern: { userId, pattern: pe.pattern } },
          create: {
            userId,
            category: pe.category,
            pattern: pe.pattern,
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

    fastify.log.info({ userId, sessionId: session.id, milestonesCount: newMilestones.length }, '[process] Success — sending response');

    return reply.send({
      session: {
        ...session,
        createdAt: session.createdAt.toISOString(),
      },
      newMilestones,
      pronunciation: pronunciation ?? null,
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
