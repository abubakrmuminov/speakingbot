import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

// ─── Module augmentation ─────────────────────────────────────────────────
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

// Support both access tokens (id, email) and refresh tokens (id, type)
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: string; email?: string | null; type?: string };
    user: { id: string; email?: string | null; type?: string };
  }
}

async function authPlugin(fastify: FastifyInstance) {
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      await reply.status(401).send({ error: 'Unauthorized' });
    }
  });
}

export default fp(authPlugin);
