// AI-GENERATED
// Tool: Claude (claude-sonnet-4-6)
// Date: 2026-03-14
// Prompt summary: Fastify plugin that creates a singleton ioredis client and decorates the server instance
// Reviewed by: unreviewed

// ── Imports ───────────────────────────────────────────────────────────────────

// Fastify plugin helper that prevents double-registration in the same scope
import fp from "fastify-plugin";
// ioredis client class; provides a Promise-based Redis interface
import { Redis } from "ioredis";
// Fastify types for the plugin callback signature
import type { FastifyInstance } from "fastify";
// Validated environment config; provides the REDIS_URL without raw process.env access
import { config } from "../config.js";

// ── Module augmentation ───────────────────────────────────────────────────────

// Extend Fastify's type system so `fastify.redis` is typed throughout the codebase
declare module "fastify" {
  // Add the redis property to every FastifyInstance
  interface FastifyInstance {
    // Singleton ioredis client shared across all route handlers
    redis: Redis;
  }
}

// ── Plugin ────────────────────────────────────────────────────────────────────

/**
 * Fastify plugin that creates an ioredis client, connects to Redis,
 * decorates the server instance with the client, and registers a shutdown hook.
 *
 * @param fastify - The Fastify server instance provided by the plugin system
 * @returns       - A Promise that resolves once the plugin is registered
 * @sideEffects   - Opens a TCP connection to Redis; registers an onClose lifecycle hook
 */
async function redisPlugin(fastify: FastifyInstance): Promise<void> {
  // Create the ioredis client using the validated URL from config
  // ioredis will attempt reconnection automatically on transient failures
  const redis = new Redis(config.redisUrl, {
    // Maximum number of reconnection attempts before giving up
    maxRetriesPerRequest: 3,
    // Emit errors as events rather than throwing synchronously; Fastify will log them
    enableReadyCheck: true,
    // Label used in ioredis logs to identify this connection
    connectionName: "citypulse-api",
  });

  // Wait for the Redis connection to be ready before proceeding
  // This surfaces configuration errors (wrong host/port) at startup rather than at first use
  await new Promise<void>((resolve, reject) => {
    // Resolve the promise once ioredis confirms the connection is ready
    redis.once("ready", resolve);
    // Reject so the server startup fails fast if Redis is unreachable
    redis.once("error", reject);
  });

  // Attach the client to the Fastify instance so routes can access it via fastify.redis
  fastify.decorate("redis", redis);

  // Register a shutdown hook: disconnect from Redis when the server is closing
  fastify.addHook("onClose", async () => {
    // Quit gracefully; sends a QUIT command and waits for the server to acknowledge
    await redis.quit();
  });
}

// Export wrapped with fastify-plugin so the decoration is visible outside this scope
export default fp(redisPlugin, {
  // Declare the plugin name for better error messages in dependency graphs
  name: "redis",
});
