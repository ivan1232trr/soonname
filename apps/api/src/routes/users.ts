// AI-GENERATED
// Tool: Claude (claude-sonnet-4-6)
// Date: 2026-03-14
// Prompt summary: Fastify route plugin implementing GET/PUT /users/me and POST/GET/PUT /users/me/profile
// Reviewed by: unreviewed

// ── Imports ───────────────────────────────────────────────────────────────────

// Fastify types for the plugin, request, and reply objects
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
// Zod for runtime body validation with typed results
import { z } from "zod";
// Prisma-generated Vibe and TimeSlot enums for profile field validation
import { Vibe, TimeSlot } from "@prisma/client";

// ── Validation schemas ────────────────────────────────────────────────────────

/**
 * Zod schema for PUT /users/me — updates the user's display name.
 */
// Only the display name is editable on the base user record; email changes are out of MVP scope
const updateUserBodySchema = z.object({
  // Display name must be 2–100 characters, same constraints as registration
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be 100 characters or fewer"),
});

/**
 * Zod schema for POST /users/me/profile — creates the initial profile after onboarding.
 * All fields are required because this is called at onboarding completion.
 */
// All fields required on first profile creation; the user has completed all onboarding steps
const createProfileBodySchema = z.object({
  // UUID of the city selected in onboarding Step 1
  preferredCityId: z.string().uuid("preferredCityId must be a valid UUID"),
  // Vibe preference selected in onboarding Step 2
  vibe: z.nativeEnum(Vibe),
  // Time preferences selected in onboarding Step 3; at least one required
  timePreferences: z.array(z.nativeEnum(TimeSlot)).min(1, "Select at least one time preference"),
  // Interest tags selected in onboarding Step 4; minimum 3 required per UI requirements
  interestedTags: z.array(z.string()).min(3, "Select at least 3 interest tags"),
});

/**
 * Zod schema for PUT /users/me/profile — updates an existing profile.
 * All fields are optional so the client can patch individual preferences.
 */
// All fields optional so a partial update only touches the supplied fields
const updateProfileBodySchema = z.object({
  // Optional city update; UUID must be valid if provided
  preferredCityId: z.string().uuid("preferredCityId must be a valid UUID").optional(),
  // Optional vibe update; must be a valid enum value if provided
  vibe: z.nativeEnum(Vibe).optional(),
  // Optional time preferences update; if provided, must contain at least one value
  timePreferences: z.array(z.nativeEnum(TimeSlot)).min(1, "Select at least one time preference").optional(),
  // Optional interest tags update; if provided, must contain at least 3
  interestedTags: z.array(z.string()).min(3, "Select at least 3 interest tags").optional(),
});

// ── Route plugin ──────────────────────────────────────────────────────────────

/**
 * Registers the /users/me and /users/me/profile endpoints on the provided Fastify instance.
 * All routes require authentication via the fastify.authenticate preHandler.
 *
 * GET  /users/me            — return the authenticated user's public account data
 * PUT  /users/me            — update the authenticated user's display name
 * GET  /users/me/profile    — return the authenticated user's preference profile
 * POST /users/me/profile    — create the profile (called once at onboarding completion)
 * PUT  /users/me/profile    — update profile fields (called from profile edit screen)
 *
 * @param fastify - The Fastify server instance (must have prisma and auth plugins registered)
 * @returns       - A Promise that resolves once all routes are registered
 * @sideEffects   - Reads and writes to the users and user_profiles tables via Prisma
 */
export async function userRoutes(fastify: FastifyInstance): Promise<void> {
  // ── GET /users/me/events ────────────────────────────────────────────────

  fastify.get(
    "/users/me/events",
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const events = await fastify.prisma.event.findMany({
          where: { submittedById: request.user.userId },
          include: {
            tags: true,
            city: true,
          },
          orderBy: { createdAt: "desc" },
        });
        return reply.status(200).send(events);
      } catch (error) {
        fastify.log.error({ error }, "Failed to fetch user events");
        return reply.status(500).send({ error: "Failed to fetch your events" });
      }
    }
  );

  // ── GET /users/me ─────────────────────────────────────────────────────────

  fastify.get(
    "/users/me",
    // Require a valid JWT; request.user.userId is populated by the preHandler
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Fetch the authenticated user's public record; exclude passwordHash
      const user = await fastify.prisma.user.findUnique({
        // Look up by the userId from the verified JWT payload
        where: { id: request.user.userId },
        // Select only the public fields; passwordHash must never appear in API responses
        select: {
          // UUID used for the profile response and downstream API calls
          id: true,
          // Email shown in the account settings area
          email: true,
          // Display name shown on the profile screen
          name: true,
          // When the account was created; shown in the profile for context
          createdAt: true,
          // When the account was last modified
          updatedAt: true,
        },
      });

      // If the user record is gone (deleted between token issue and this request), return 404
      if (user === null) {
        // Session is valid but the user was deleted; return 404 rather than 401
        return reply.status(404).send({ error: "User not found" });
      }

      // Return 200 with the public user record
      return reply.status(200).send(user);
    }
  );

  // ── PUT /users/me ─────────────────────────────────────────────────────────

  fastify.put(
    "/users/me",
    // Require a valid JWT to identify which user is being updated
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Parse and validate the update body
      const parseResult = updateUserBodySchema.safeParse(request.body);
      // Return 400 with field errors if validation fails
      if (!parseResult.success) {
        // Map Zod errors to a consistent field/message format
        const details = parseResult.error.errors.map((e) => ({
          // JSON path to the invalid field
          field: e.path.join("."),
          // Human-readable error message
          message: e.message,
        }));
        // Send the 400 response with validation details
        return reply.status(400).send({ error: "Validation failed", details });
      }

      // Update the user record with the new display name
      try {
        const updated = await fastify.prisma.user.update({
          // Identify the record to update by the authenticated user's ID
          where: { id: request.user.userId },
          // Apply only the name change; Prisma's updatedAt is auto-managed
          data: { name: parseResult.data.name },
          // Return public fields; exclude passwordHash from the response
          select: {
            // Updated UUID for confirmation
            id: true,
            // Email unchanged; returned for consistency with the IUser shape
            email: true,
            // The newly updated display name
            name: true,
            // Creation timestamp for the IUser shape
            createdAt: true,
            // Auto-updated by Prisma to the current timestamp
            updatedAt: true,
          },
        });
        // Return 200 with the updated user record
        return reply.status(200).send(updated);
      } catch (error) {
        // Log and return 500 for unexpected database errors
        fastify.log.error({ error }, "Failed to update user");
        return reply.status(500).send({ error: "Failed to update user" });
      }
    }
  );

  // ── GET /users/me/profile ─────────────────────────────────────────────────

  fastify.get(
    "/users/me/profile",
    // Require a valid JWT to identify whose profile to return
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Fetch the profile linked to the authenticated user
      const profile = await fastify.prisma.userProfile.findUnique({
        // Look up the profile by the userId FK; one profile per user
        where: { userId: request.user.userId },
      });

      // If no profile exists yet (user registered but has not completed onboarding), return 404
      if (profile === null) {
        // 404 signals the client to redirect to the onboarding flow
        return reply.status(404).send({ error: "Profile not found — complete onboarding first" });
      }

      // Return 200 with the full profile record
      return reply.status(200).send(profile);
    }
  );

  // ── POST /users/me/profile ────────────────────────────────────────────────

  fastify.post(
    "/users/me/profile",
    // Require a valid JWT to associate the new profile with the correct user
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Parse and validate the full profile creation body from onboarding
      const parseResult = createProfileBodySchema.safeParse(request.body);
      // Return 400 with field errors if any required onboarding field is missing or invalid
      if (!parseResult.success) {
        // Format Zod errors into the consistent field/message structure
        const details = parseResult.error.errors.map((e) => ({
          // JSON path to the offending field (e.g. "vibe")
          field: e.path.join("."),
          // Human-readable validation failure message
          message: e.message,
        }));
        // Send 400 so the onboarding UI can show per-field errors
        return reply.status(400).send({ error: "Validation failed", details });
      }

      // Extract the validated profile fields from the parse result
      const data = parseResult.data;

      // Create the profile record linked to the authenticated user
      try {
        const profile = await fastify.prisma.userProfile.create({
          data: {
            // Link the profile to the authenticated user via the userId FK
            userId: request.user.userId,
            // City selected in onboarding Step 1
            preferredCityId: data.preferredCityId,
            // Vibe preference selected in onboarding Step 2
            vibe: data.vibe,
            // Time preferences selected in onboarding Step 3
            timePreferences: data.timePreferences,
            // Interest tags selected in onboarding Step 4
            interestedTags: data.interestedTags,
          },
        });
        // Return 201 Created with the newly created profile record
        return reply.status(201).send(profile);
      } catch (error: unknown) {
        // Check for a unique constraint violation — profile already exists for this user
        const prismaError = error as { code?: string };
        if (prismaError.code === "P2002") {
          // Return 409 Conflict so the client knows to use PUT instead
          return reply.status(409).send({ error: "Profile already exists — use PUT to update" });
        }
        // Log and return 500 for any other database error
        fastify.log.error({ error }, "Failed to create user profile");
        return reply.status(500).send({ error: "Failed to create profile" });
      }
    }
  );

  // ── PUT /users/me/profile ─────────────────────────────────────────────────

  fastify.put(
    "/users/me/profile",
    // Require a valid JWT to identify whose profile is being updated
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Parse and validate the partial profile update body
      const parseResult = updateProfileBodySchema.safeParse(request.body);
      // Return 400 if any supplied field fails validation
      if (!parseResult.success) {
        // Format Zod errors for field-level feedback in the profile edit screen
        const details = parseResult.error.errors.map((e) => ({
          // JSON path to the invalid field
          field: e.path.join("."),
          // Description of why the value is invalid
          message: e.message,
        }));
        // Send 400 with the validation error details
        return reply.status(400).send({ error: "Validation failed", details });
      }

      // Filter out undefined fields so Prisma only updates what was actually supplied
      const data = parseResult.data;
      // Build a partial update object containing only the provided fields
      const updateData: Record<string, unknown> = {};
      // Conditionally include preferredCityId if the client sent it
      if (data.preferredCityId !== undefined) updateData["preferredCityId"] = data.preferredCityId;
      // Conditionally include vibe if the client sent it
      if (data.vibe !== undefined) updateData["vibe"] = data.vibe;
      // Conditionally include timePreferences if the client sent it
      if (data.timePreferences !== undefined) updateData["timePreferences"] = data.timePreferences;
      // Conditionally include interestedTags if the client sent it
      if (data.interestedTags !== undefined) updateData["interestedTags"] = data.interestedTags;

      // Update the profile record for the authenticated user
      try {
        const updated = await fastify.prisma.userProfile.update({
          // Match on the userId FK rather than the profile id so callers need only know their userId
          where: { userId: request.user.userId },
          // Apply only the fields that were supplied in the request body
          data: updateData,
        });
        // Return 200 with the fully updated profile record
        return reply.status(200).send(updated);
      } catch (error: unknown) {
        // Check for "record not found" — user tried to update a profile that does not exist yet
        const prismaError = error as { code?: string };
        if (prismaError.code === "P2025") {
          // Return 404 so the client knows to use POST first to create the profile
          return reply.status(404).send({ error: "Profile not found — complete onboarding first" });
        }
        // Log and return 500 for other database errors
        fastify.log.error({ error }, "Failed to update user profile");
        return reply.status(500).send({ error: "Failed to update profile" });
      }
    }
  );
}
