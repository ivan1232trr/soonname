// AI-GENERATED
// Tool: Claude (claude-sonnet-4-6)
// Date: 2026-03-15
// Prompt summary: Fastify route plugin implementing GET /announcements to fetch system-wide messages
// Reviewed by: unreviewed

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

/**
 * Registers the /announcements endpoints on the provided Fastify instance.
 *
 * GET /announcements — return all active system announcements ordered by priority and recency
 *
 * @param fastify - The Fastify server instance
 * @returns       - A Promise that resolves once routes are registered
 */
export async function announcementRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    "/announcements",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Fetch announcements that are marked as active
        const announcements = await fastify.prisma.announcement.findMany({
          where: { active: true },
          // Order by priority (highest first) and then by creation date (newest first)
          orderBy: [
            { priority: "desc" },
            { createdAt: "desc" },
          ],
        });

        // Return 200 with the list of announcements
        return reply.status(200).send(announcements);
      } catch (error) {
        // Log and return 500 for unexpected database errors
        fastify.log.error({ error }, "Failed to fetch announcements");
        return reply.status(500).send({ error: "Failed to fetch announcements" });
      }
    }
  );
}
