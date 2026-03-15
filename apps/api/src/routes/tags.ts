// AI-GENERATED
// Tool: Claude (claude-sonnet-4-6)
// Date: 2026-03-14
// Prompt summary: Fastify route plugin implementing GET /tags for the CityPulse onboarding interest picker
// Reviewed by: unreviewed

// ── Imports ───────────────────────────────────────────────────────────────────

// Fastify types for the route plugin and handler signatures
import type { FastifyInstance } from "fastify";

// ── Route plugin ──────────────────────────────────────────────────────────────

/**
 * Registers GET /tags on the provided Fastify instance.
 * Returns the full tag taxonomy ordered alphabetically.
 * Used by onboarding Step 4 (interest tags picker) and the profile edit screen.
 * This route is public — no authentication required.
 *
 * @param fastify - The Fastify server instance (must have prismaPlugin registered)
 * @returns       - A Promise that resolves once the route is registered
 * @sideEffects   - GET /tags reads from the PostgreSQL tags table via Prisma
 */
export async function tagRoutes(fastify: FastifyInstance): Promise<void> {
  // Register GET /tags; the /api/v1 prefix is applied when this plugin is registered in index.ts
  fastify.get("/tags", async (_request, reply) => {
    // Wrap the database query in try/catch so Prisma errors become structured 500 responses
    try {
      // Fetch all tag records; the taxonomy is a fixed seed list so pagination is not needed
      const tags = await fastify.prisma.tag.findMany({
        // Sort alphabetically so the interest tag grid renders in a consistent order
        orderBy: { name: "asc" },
        // Select only the two fields the client needs; the tag model has only id and name
        select: {
          // UUID used as the reference in UserProfile.interestedTags and event tag associations
          id: true,
          // Lowercase slug displayed as a chip in the onboarding interest picker
          name: true,
        },
      });

      // Return 200 with the full tag array; empty array is valid before the seed runs
      return reply.status(200).send(tags);
    } catch (error) {
      // Log the error server-side for debugging without exposing internals to the client
      fastify.log.error({ error }, "Failed to fetch tags");
      // Return a generic 500 response
      return reply.status(500).send({ error: "Failed to fetch tags" });
    }
  });
}
