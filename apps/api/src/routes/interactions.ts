// AI-GENERATED
// Tool: Claude (claude-sonnet-4-6)
// Date: 2026-03-14
// Prompt summary: Fastify route plugin implementing POST /interactions for recording user–event engagement signals
// Reviewed by: unreviewed

// ── Imports ───────────────────────────────────────────────────────────────────

// Fastify types for the plugin, request, and reply objects
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
// Zod for runtime request body validation
import { z } from "zod";
// Prisma-generated enum for interaction type validation
import { UserInteractionType } from "@prisma/client";

// ── Validation schema ─────────────────────────────────────────────────────────

/**
 * Zod schema for the POST /interactions request body.
 * userId is derived from the authenticated session — the client does not supply it.
 */
// Validate interaction payloads before writing to the database
const createInteractionBodySchema = z.object({
  // UUID of the event the interaction is being recorded on
  eventId: z.string().uuid("eventId must be a valid UUID"),
  // The type of interaction; must be one of the defined enum values
  type: z.nativeEnum(UserInteractionType, { errorMap: () => ({ message: "Invalid interaction type" }) }),
});

// ── Route plugin ──────────────────────────────────────────────────────────────

/**
 * Registers POST /interactions on the provided Fastify instance.
 * Records a user interaction (VIEW, SAVE, FLAG, SHARE) against an event.
 *
 * SAVE is toggled: if a SAVE record already exists for (userId, eventId), it is deleted instead
 * of creating a duplicate. This matches the Interested button toggle behaviour in the UI.
 *
 * All other interaction types (VIEW, FLAG, SHARE) always create a new record.
 *
 * @param fastify - The Fastify server instance (must have prisma and auth plugins registered)
 * @returns       - A Promise that resolves once the route is registered
 * @sideEffects   - Writes to or deletes from the user_interactions table via Prisma
 */
export async function interactionRoutes(fastify: FastifyInstance): Promise<void> {
  // Register POST /interactions; the /api/v1 prefix is applied in index.ts
  fastify.post(
    "/interactions",
    // Require a valid JWT so we know which user is performing the interaction
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Parse and validate the request body against the schema
      const parseResult = createInteractionBodySchema.safeParse(request.body);

      // Return 400 with field-level errors if validation fails
      if (!parseResult.success) {
        // Map Zod errors to the consistent field/message format used across the API
        const details = parseResult.error.errors.map((e) => ({
          // JSON path to the invalid field (e.g. "eventId")
          field: e.path.join("."),
          // Human-readable description of the validation failure
          message: e.message,
        }));
        // Return the structured 400 so the client can handle field-level errors
        return reply.status(400).send({ error: "Validation failed", details });
      }

      // Destructure the validated fields for use in the database operation
      const { eventId, type } = parseResult.data;
      // The authenticated user's ID comes from the verified JWT — not from the request body
      const userId = request.user.userId;

      // Handle the SAVE toggle separately from other interaction types
      if (type === UserInteractionType.SAVE) {
        // Check whether a SAVE record already exists for this (user, event) pair
        const existing = await fastify.prisma.userInteraction.findFirst({
          // Scope the lookup to this specific user–event–type combination
          where: { userId, eventId, type: UserInteractionType.SAVE },
          // We only need the id field to delete the record if found
          select: { id: true },
        });

        // If a SAVE already exists, delete it — the user is un-saving the event
        if (existing !== null) {
          // Delete the existing SAVE record by its primary key
          await fastify.prisma.userInteraction.delete({
            // Use the id from the lookup above to delete the exact record
            where: { id: existing.id },
          });
          // Return 200 with a status indicating the event was un-saved
          return reply.status(200).send({ status: "unsaved" });
        }
        // If no SAVE exists, fall through to the create path below to add a new SAVE record
      }

      // Create a new interaction record for VIEW, FLAG, SHARE, and new SAVE interactions
      try {
        const interaction = await fastify.prisma.userInteraction.create({
          data: {
            // Resolved from the JWT; ensures the interaction is always attributed correctly
            userId,
            // The event this interaction is being recorded on
            eventId,
            // The type of interaction (VIEW, SAVE, FLAG, SHARE)
            type,
          },
        });
        // Return 201 Created with the new interaction record
        return reply.status(201).send(interaction);
      } catch (error: unknown) {
        // Check for a foreign key constraint violation — the eventId does not exist
        const prismaError = error as { code?: string };
        if (prismaError.code === "P2003") {
          // Return 404 so the client knows the event does not exist
          return reply.status(404).send({ error: "Event not found" });
        }
        // Log and return 500 for other unexpected database errors
        fastify.log.error({ error }, "Failed to create interaction");
        return reply.status(500).send({ error: "Failed to record interaction" });
      }
    }
  );
}
