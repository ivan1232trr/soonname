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
  const authenticate = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Verify the JWT signature and expiry; throws if invalid, populates request.user on success
    try {
      await request.jwtVerify();
    } catch {
      // Send 401 with a generic message; do not reveal whether the token is missing vs expired
      return reply.status(401).send({ error: "Unauthorized" });
    }

    // Check that the session still exists in Redis; it may have been deleted by logout
    const key = sessionKey(request.user.jti);
    // GET returns null if the key does not exist (expired or revoked)
    const sessionUserId = await fastify.redis.get(key);

    // If the Redis key is gone, the session was revoked — reject the request
    if (sessionUserId === null) {
      // Return 401 so the client knows it must re-authenticate
      return reply.status(401).send({ error: "Session expired or revoked" });
    }
  };

  // Decorate the Fastify instance so routes can reference fastify.authenticate in preHandler arrays
  fastify.decorate("authenticate", authenticate);
}

// Export wrapped with fp so the decoration is not encapsulated and is visible to all route plugins
export default fp(authPlugin, {
  // Declare dependencies so Fastify registers prisma and redis plugins before this one
  dependencies: ["redis"],
  // Plugin name for clearer error messages in dependency graphs
  name: "auth",
});
