// AI-GENERATED
// Tool: Claude (claude-sonnet-4-6)
// Date: 2026-03-14
// Prompt summary: Fastify route plugin implementing GET /cities for the CityPulse onboarding city picker
// Reviewed by: unreviewed

// ── Imports ───────────────────────────────────────────────────────────────────

// Fastify types for the route plugin and handler signatures
import type { FastifyInstance } from "fastify";

// ── Route plugin ──────────────────────────────────────────────────────────────

/**
 * Registers GET /cities on the provided Fastify instance.
 * Returns the full list of CityPulse-supported cities, ordered alphabetically.
 * Used by the onboarding Step 1 (city picker) and the city selector in the profile screen.
 * This route is public — no authentication required.
 *
 * @param fastify - The Fastify server instance (must have prismaPlugin registered)
 * @returns       - A Promise that resolves once the route is registered
 * @sideEffects   - GET /cities reads from the PostgreSQL cities table via Prisma
 */
export async function cityRoutes(fastify: FastifyInstance): Promise<void> {
  // Register GET /cities; the prefix /api/v1 is applied when this plugin is registered in index.ts
  fastify.get("/cities", async (_request, reply) => {
    // Wrap the database query in try/catch so Prisma errors become structured 500 responses
    try {
      // Fetch all city records; the table is small (seeded list) so no pagination is needed in MVP
      const cities = await fastify.prisma.city.findMany({
        // Sort alphabetically so the city picker list is predictable and easy to scan
        orderBy: { name: "asc" },
        // Select only the fields the client needs; excludes nothing here — the full record is small
        select: {
          // Unique identifier used as preferredCityId in UserProfile and as a filter in GET /events
          id: true,
          // Human-readable name shown in the city picker dropdown
          name: true,
          // Country name shown alongside the city name in the picker
          country: true,
          // City centre coordinates; used as the default map viewport origin
          latitude: true,
          // City centre longitude
          longitude: true,
          // IANA timezone string; used by the web client to display event times in local time
          timezone: true,
          // Record creation timestamp; included for completeness
          createdAt: true,
        },
      });

      // Return 200 with the city array; an empty array is valid if no cities are seeded yet
      return reply.status(200).send(cities);
    } catch (error) {
      // Log the Prisma error server-side so it is visible in Coolify logs
      fastify.log.error({ error }, "Failed to fetch cities");
      // Return a generic 500; do not expose database error details to the client
      return reply.status(500).send({ error: "Failed to fetch cities" });
    }
  });
}
