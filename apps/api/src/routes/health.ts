// AI-GENERATED
// Tool: Claude (claude-sonnet-4-6)
// Date: 2026-03-14
// Prompt summary: Fastify route plugin for the GET /health liveness check endpoint
// Reviewed by: unreviewed

// ── Imports ───────────────────────────────────────────────────────────────────

// Fastify types for the route plugin function signature
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

// ── Route plugin ──────────────────────────────────────────────────────────────

/**
 * Registers the GET /health endpoint on the provided Fastify instance.
 * Used by load balancers and uptime monitors to verify the server is alive.
 * Does not check database or Redis connectivity — that is a separate readiness check.
 *
 * @param fastify - The Fastify server instance to register the route on
 * @returns       - A Promise that resolves once the route is registered
 * @sideEffects   - None beyond registering the route handler
 */
export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  // Register a GET handler at the /health path
  fastify.get(
    "/health",
    // Inline JSON Schema for the response shape; Fastify uses this to validate and serialise
    {
      schema: {
        // Declare the 200 response shape so Fastify can fast-serialise the JSON output
        response: {
          200: {
            type: "object",
            // Both fields are required so the schema rejects partial responses at compile time
            required: ["status", "timestamp"],
            properties: {
              // String literal "ok" signals to monitoring tools that the server is healthy
              status: { type: "string" },
              // ISO 8601 timestamp lets monitors track response latency drift over time
              timestamp: { type: "string" },
            },
          },
        },
      },
    },
    // Route handler: builds and returns the health payload
    async (_request: FastifyRequest, reply: FastifyReply) => {
      // Capture the current server time as an ISO string for the response body
      const timestamp = new Date().toISOString();

      // Send 200 with the health payload; Fastify serialises the object using the schema above
      return reply.status(200).send({
        // Fixed string "ok" so health check scripts can do a simple equality test
        status: "ok",
        // Server wall-clock time; useful for detecting timezone drift in containerised envs
        timestamp,
      });
    }
  );
}
