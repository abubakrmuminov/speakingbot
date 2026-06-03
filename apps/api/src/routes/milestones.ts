import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { MILESTONE_LABELS } from '@speaking-coach/shared';
import type { MilestoneType } from '@speaking-coach/shared';

export async function milestoneRoutes(fastify: FastifyInstance) {
  const authenticate = fastify.authenticate;

  // ─── GET /milestones ─────────────────────────────────────────
  fastify.get('/milestones', { preHandler: [authenticate] }, async (request, reply) => {
    const milestones = await prisma.userMilestone.findMany({
      where: { userId: request.user.id },
      orderBy: { achievedAt: 'desc' },
    });

    return reply.send({
      milestones: milestones.map((m: any) => ({
        id: m.id,
        type: m.type,
        label: MILESTONE_LABELS[m.type as MilestoneType] ?? m.type,
        achievedAt: m.achievedAt.toISOString(),
        sharedCard: m.sharedCard,
      })),
    });
  });

  // ─── GET /milestones/:id/card ─────────────────────────────────
  // Returns metadata for the shareable achievement card (rendered on frontend)
  fastify.get<{ Params: { id: string } }>(
    '/milestones/:id/card',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const milestone = await prisma.userMilestone.findFirst({
        where: { id: request.params.id, userId: request.user.id },
        include: { user: { select: { name: true } } },
      });

      if (!milestone) return reply.status(404).send({ error: 'Milestone not found.' });

      await prisma.userMilestone.update({
        where: { id: milestone.id },
        data: { sharedCard: true },
      });

      return reply.send({
        type: milestone.type,
        label: MILESTONE_LABELS[milestone.type as MilestoneType] ?? milestone.type,
        achievedAt: milestone.achievedAt.toISOString(),
        userName: milestone.user.name ?? 'A learner',
      });
    },
  );
}
