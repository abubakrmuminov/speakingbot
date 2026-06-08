import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { generateReading, evaluateOpenAnswer } from '../lib/gemini.js';
import { GenerateReadingSchema, SubmitReadingSchema } from '@speaking-coach/shared';
import type { UserAnswer, Question, ReadingResult } from '@speaking-coach/shared';

export async function readingRoutes(fastify: FastifyInstance) {
  // ─── POST /generate ──────────────────────────────────────────
  fastify.post('/generate', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userId = (request.user as any).id;
    const { difficulty } = GenerateReadingSchema.parse(request.body);

    // Get top error patterns for targeting
    const errorPatterns = await prisma.errorPattern.findMany({
      where: { userId, resolved: false },
      orderBy: { occurrences: 'desc' },
      take: 5,
    });

    const readingPassage = await generateReading(errorPatterns, (difficulty as any) || 'B2');

    // Create session in DB
    const session = await prisma.readingSession.create({
      data: {
        userId,
        passage: readingPassage.passage,
        topic: readingPassage.topic,
        difficulty: readingPassage.difficulty,
        questions: readingPassage.questions as any,
        userAnswers: [] as any,
        totalQuestions: readingPassage.questions.length,
        correctAnswers: 0,
        readingScore: 0,
      },
    });

    // Return passage and questions WITHOUT correct answers
    const safeQuestions = readingPassage.questions.map(({ correctAnswer: _ca, explanation: _ex, ...rest }: any) => rest);

    return reply.send({
      sessionId: session.id,
      passage: session.passage,
      topic: session.topic,
      difficulty: session.difficulty,
      questions: safeQuestions,
    });
  });

  // ─── POST /submit ─────────────────────────────────────────────
  fastify.post('/submit', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userId = (request.user as any).id;
    const { sessionId, answers: userAnswersRequest } = SubmitReadingSchema.parse(request.body);

    const session = await prisma.readingSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) return reply.status(404).send({ error: 'Session not found' });

    const questions = session.questions as unknown as Question[];
    const evaluatedAnswers: UserAnswer[] = [];
    let correctCount = 0;

    for (const q of questions) {
      const userAns = userAnswersRequest.find((a) => a.questionId === q.id);
      const answerText = userAns?.answer || '';

      if (q.type === 'multiple_choice' || q.type === 'true_false_ng') {
        const isCorrect = answerText.trim().toLowerCase() === (q.correctAnswer || '').trim().toLowerCase();
        if (isCorrect) correctCount++;
        evaluatedAnswers.push({
          questionId: q.id,
          answer: answerText,
          isCorrect,
        });
      } else if (q.type === 'open') {
        const evaluation = await evaluateOpenAnswer(q.question, q.correctAnswer, answerText);
        if (evaluation.isCorrect) {
          correctCount += evaluation.score === 2 ? 1 : 0.5;
        }
        evaluatedAnswers.push({
          questionId: q.id,
          answer: answerText,
          isCorrect: evaluation.isCorrect,
          aiExplanation: evaluation.aiExplanation,
        });
      }
    }

    const readingScore = Math.round((correctCount / questions.length) * 100);

    // Update session in DB
    await prisma.readingSession.update({
      where: { id: sessionId },
      data: {
        userAnswers: evaluatedAnswers as any,
        correctAnswers: Math.floor(correctCount), // Prisma field is Int
        readingScore,
      },
    });

    // Return full result including correct answers and explanations
    return reply.send({
      sessionId,
      totalQuestions: questions.length,
      correctAnswers: correctCount,
      readingScore,
      answers: evaluatedAnswers.map((ea) => {
        const q = questions.find((quest) => quest.id === ea.questionId);
        return {
          ...ea,
          correctAnswer: q?.correctAnswer,
          explanation: q?.explanation,
        };
      }),
    });
  });

  // ─── GET /history ─────────────────────────────────────────────
  fastify.get('/history', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userId = (request.user as any).id;
    const history = await prisma.readingSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return reply.send(history);
  });

  // ─── GET /stats ───────────────────────────────────────────────
  fastify.get('/stats', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userId = (request.user as any).id;
    const sessions = await prisma.readingSession.findMany({
      where: { userId },
      select: { readingScore: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    if (sessions.length === 0) {
      return reply.send({ avgReadingScore: 0, totalSessions: 0, trend: 0 });
    }

    const avgScore = sessions.reduce((acc: number, s: any) => acc + s.readingScore, 0) / sessions.length;
    
    // Trend: compare current avg with avg excluding the most recent session
    let trend = 0;
    if (sessions.length > 1) {
      const prevAvg = sessions.slice(1).reduce((acc: number, s: any) => acc + s.readingScore, 0) / (sessions.length - 1);
      trend = Math.round(avgScore - prevAvg);
    }

    return reply.send({
      avgReadingScore: Math.round(avgScore),
      totalSessions: sessions.length,
      trend,
    });
  });
}
