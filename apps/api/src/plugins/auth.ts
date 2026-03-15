// AI-GENERATED
// Tool: Claude (claude-sonnet-4-6)
// Date: 2026-03-14
// Prompt summary: Fastify JWT auth plugin with Redis session revocation and authenticate preHandler decorator
// Reviewed by: unreviewed

// ── Imports ───────────────────────────────────────────────────────────────────

// fastify-plugin prevents scope encapsulation so the decorator is visible to all routes
import fp from "fastify-plugin";
// @fastify/jwt handles JWT signing and request verification
import fastifyJwt from "@fastify/jwt";
// Fastify types for the plugin, request, and reply objects
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
// Validated config provides the JWT secret
import { config } from "../config.js";
// Session key builder and TTL constant for Redis-backed revocation checks
import { sessionKey, SESSION_TTL_SECONDS } from "../lib/auth.js";

// ── Module augmentation ───────────────────────────────────────────────────────

// Tell @fastify/jwt what shape the decoded JWT payload has
declare module "@fastify/jwt" {
  interface FastifyJWT {
    // Payload embedded in the JWT at signing time
    payload: {
      // UUID of the authenticated user; used to look up the User record in route handlers
      userId: string;
      // Unique token identifier; stored in Redis so individual sessions can be revoked
      jti: string;
    };
    // user is the decoded payload attached to the request after jwtVerify()
    user: {
      // Same as payload.userId; available as request.user.userId in route handlers
      userId: string;
      // Same as payload.jti; used to check and delete the Redis session key
      jti: string;
    };
  }
}

// Extend FastifyInstance so the authenticate decorator is typed throughout the codebase
declare module "fastify" {
  interface FastifyInstance {
    // Prehandler function that verifies the JWT and checks Redis before allowing route access
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    // Best-effort auth for public routes that can optionally personalize a response
    tryAuthenticate: (request: FastifyRequest) => Promise<boolean>;
  }
}

// ── Plugin ────────────────────────────────────────────────────────────────────

/**
 * Fastify plugin that registers @fastify/jwt for token signing/verification
 * and adds an authenticate preHandler that also checks Redis for session revocation.
 *
 * Usage in routes: { preHandler: [fastify.authenticate] }
 *
 * @param fastify - The Fastify server instance (must have redisPlugin registered first)
 * @returns       - A Promise that resolves once JWT and the decorator are registered
 * @sideEffects   - Registers @fastify/jwt; decorates fastify.authenticate
 */
async function authPlugin(fastify: FastifyInstance): Promise<void> {
  // Register @fastify/jwt with the secret from config; this adds fastify.jwt and request.jwtVerify()
  await fastify.register(fastifyJwt, {
    // The secret used to sign and verify tokens; must match across all API instances
    secret: config.jwtSecret,
    // Set the token expiry to 7 days, matching the Redis session TTL
    sign: { expiresIn: SESSION_TTL_SECONDS },
  });

  /**
   * Prehandler that gates access to protected routes.
   * Steps: 1) verify JWT signature and expiry, 2) confirm session exists in Redis.
   * If either check fails the request is rejected with 401.
   *
   * @param request - Fastify request; request.user is populated on success
   * @param reply   - Fastify reply; used to send 401 responses on failure
   * @returns       - A Promise; resolves silently on success, sends 401 on failure
   * @sideEffects   - Reads from Redis to check session existence
   */
  const verifyAuthenticatedSession = async (request: FastifyRequest): Promise<void> => {
    await request.jwtVerify();

    const key = sessionKey(request.user.jti);
    const sessionUserId = await fastify.redis.get(key);

    if (sessionUserId === null || sessionUserId !== request.user.userId) {
      throw new Error("Session expired or revoked");
    }
  };

  const authenticate = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      await verifyAuthenticatedSession(request);
    } catch (error) {
      const message =
        error instanceof Error && error.message === "Session expired or revoked"
          ? "Session expired or revoked"
          : "Unauthorized";

      return reply.status(401).send({ error: message });
    }
  };

  const tryAuthenticate = async (request: FastifyRequest): Promise<boolean> => {
    try {
      await verifyAuthenticatedSession(request);
      return true;
    } catch {
      return false;
    }
  };

  // Decorate the Fastify instance so routes can reference fastify.authenticate in preHandler arrays
  fastify.decorate("authenticate", authenticate);
  fastify.decorate("tryAuthenticate", tryAuthenticate);
}

// Export wrapped with fp so the decoration is not encapsulated and is visible to all route plugins
export default fp(authPlugin, {
  // Declare dependencies so Fastify registers prisma and redis plugins before this one
  dependencies: ["redis"],
  // Plugin name for clearer error messages in dependency graphs
  name: "auth",
});
