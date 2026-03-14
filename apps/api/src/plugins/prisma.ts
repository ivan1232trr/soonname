// AI-GENERATED
// Tool: Claude (claude-sonnet-4-6)
// Date: 2026-03-14
// Prompt summary: Fastify plugin that creates a singleton Prisma client and decorates the server instance
// Reviewed by: unreviewed

// ── Imports ───────────────────────────────────────────────────────────────────

// Fastify plugin helper that prevents double-registration in the same scope
import fp from "fastify-plugin";
// Prisma generated client class; provides type-safe database access
import { PrismaClient } from "@prisma/client";
// Fastify types for the plugin callback signature
import type { FastifyInstance } from "fastify";

// ── Module augmentation ───────────────────────────────────────────────────────

// Extend Fastify's type system so `fastify.prisma` is typed throughout the codebase
declare module "fastify" {
  // Add the prisma property to every FastifyInstance
  interface FastifyInstance {
    // Singleton Prisma client shared across all route handlers
    prisma: PrismaClient;
  }
}

// ── Plugin ────────────────────────────────────────────────────────────────────

/**
 * Fastify plugin that instantiates a PrismaClient, decorates the server with it,
 * and registers a shutdown hook to disconnect gracefully on server close.
 *
 * @param fastify - The Fastify server instance provided by the plugin system
 * @returns       - A Promise that resolves once the plugin is registered
 * @sideEffects   - Opens a PostgreSQL connection pool; registers an onClose lifecycle hook
 */
async function prismaPlugin(fastify: FastifyInstance): Promise<void> {
  // Instantiate the Prisma client; connection is lazy — it opens on the first query
  const prisma = new PrismaClient({
    // Enable query logging in development so SQL statements are visible in the terminal
    log: process.env["NODE_ENV"] === "development" ? ["query", "warn", "error"] : ["warn", "error"],
  });

  // Connect eagerly so startup fails fast if the database is unreachable
  await prisma.$connect();

  // Attach the client to the Fastify instance so route handlers can access it via fastify.prisma
  fastify.decorate("prisma", prisma);

  // Register a shutdown hook: close the Prisma connection pool when the server stops
  fastify.addHook("onClose", async (server) => {
    // Disconnect cleanly to flush pending queries and release connection slots
    await server.prisma.$disconnect();
  });
}

// Export the plugin wrapped with fastify-plugin so it is not encapsulated in a child scope
// fp() ensures the decoration is visible to the parent and sibling scopes
export default fp(prismaPlugin, {
  // Declare the plugin name for better error messages in dependency graphs
  name: "prisma",
});
