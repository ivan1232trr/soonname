// AI-GENERATED
// Tool: Claude (claude-sonnet-4-6)
// Date: 2026-03-14
// Prompt summary: Fastify route plugin implementing GET /events and POST /events — updated to use auth, nullable category, and BullMQ enqueue
// Reviewed by: unreviewed

// ── Imports ───────────────────────────────────────────────────────────────────

// Fastify types for the route plugin, request, and reply objects
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
// Zod for runtime request validation; provides typed parse results
import { z } from "zod";
// Shared TypeScript types: EventCategory enum for query/body validation
import { EventCategory } from "@citypulse/types";
// H3 helpers: compute three-resolution indexes from a lat/lng coordinate
import { getH3Indexes, getViewportCells, zoomToResolution, resolutionToField } from "../lib/h3.js";
// H3 helper: convert lat/lng to a resolution-9 cell for proximity ranking
import { latLngToCell } from "h3-js";
// Ranking engine: sorts events by proximity or date depending on whether a location is supplied
import { rankEvents } from "../lib/ranking.js";
// Prisma enums for event status and category filtering
import {
  EventStatus,
  EventCategory as PrismaEventCategory,
  type Prisma,
} from "@prisma/client";
// Classifier queue: enqueue classification jobs after a new event is inserted
import { classifierQueue } from "../lib/classifier-queue.js";
import { publishSpatialIndexDocument } from "../lib/spatial-index-storage.js";
import { config } from "../config.js";

// ── Validation schemas ────────────────────────────────────────────────────────

/**
 * Zod schema for the POST /events request body.
 * submittedById is no longer in the body — it is derived from the authenticated session.
 * All other fields match the CreateEventInput interface in @citypulse/types.
 */
// Validate incoming event submission payloads before touching the database
const createEventBodySchema = z.object({
  // Title must be at least 3 characters to prevent empty or trivially short submissions
  title: z.string().min(3, "Title must be at least 3 characters"),
  // Description must be at least 20 characters per the UI requirements validation rules
  description: z.string().min(20, "Description must be at least 20 characters"),
  // Venue or area name; any non-empty string is valid
  locationName: z.string().min(1, "Location name is required"),
  // Latitude must be within the valid WGS-84 range
  latitude: z.number().min(-90).max(90),
  // Longitude must be within the valid WGS-84 range
  longitude: z.number().min(-180).max(180),
  // ISO date string "YYYY-MM-DD" or ISO datetime; coerced to a Date for Prisma
  eventDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  // ISO datetime string for the local start time
  startTime: z.string().datetime({ offset: true }),
  // Optional ISO datetime string for end time; omit if open-ended
  endTime: z.string().datetime({ offset: true }).optional(),
  // UUID of the city this event belongs to
  cityId: z.string().uuid("cityId must be a valid UUID"),
});

/**
 * Zod schema for GET /events query parameters.
 * cityId is required; all other params are optional ranking/filter inputs.
 */
// Validate query parameters before constructing the database query
const getEventsQuerySchema = z.object({
  // The city to scope the feed to; required because all events belong to a city
  cityId: z.string().uuid("cityId must be a valid UUID"),
  // Optional category filter; must be one of the defined enum values if provided
  category: z.nativeEnum(EventCategory).optional(),
  // Optional latitude for proximity ranking; coerced from the query string
  lat: z.coerce.number().min(-90).max(90).optional(),
  // Optional longitude for proximity ranking; coerced from the query string
  lng: z.coerce.number().min(-180).max(180).optional(),
  // Optional full-text search query across title, description, location, and tags
  q: z.string().trim().min(1).optional(),
  // Viewport bounds for H3-based spatial filtering
  north: z.coerce.number().min(-90).max(90).optional(),
  south: z.coerce.number().min(-90).max(90).optional(),
  east: z.coerce.number().min(-180).max(180).optional(),
  west: z.coerce.number().min(-180).max(180).optional(),
  // Google Maps zoom level; determines H3 resolution for viewport queries
  zoom: z.coerce.number().min(1).max(22).optional(),
});

const getEventParamsSchema = z.object({
  id: z.string().uuid("Event id must be a valid UUID"),
});

// ── Route plugin ──────────────────────────────────────────────────────────────

/**
 * Registers GET /events and POST /events on the provided Fastify instance.
 *
 * POST /events: requires auth, validates the body, computes H3 indexes, saves with
 *               PENDING_CLASSIFICATION status, and enqueues an AI classification job.
 * GET /events:  public route; fetches ACTIVE events for a city, optionally filters by category,
 *               and ranks by H3 ring proximity when lat/lng are supplied.
 *
 * @param fastify - The Fastify server instance (must have prisma, redis, and auth plugins registered)
 * @returns       - A Promise that resolves once both routes are registered
 * @sideEffects   - POST /events writes to PostgreSQL and enqueues a BullMQ job
 */
const previewBodySchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
});

export async function eventRoutes(fastify: FastifyInstance): Promise<void> {
  // ── POST /events/preview ──────────────────────────────────────────────────
  // Calls the AI classifier without saving — returns predicted category and tags

  fastify.post(
    "/events/preview",
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parseResult = previewBodySchema.safeParse(request.body);

      if (!parseResult.success) {
        const details = parseResult.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }));
        return reply.status(400).send({ error: "Validation failed", details });
      }

      if (!config.hasAnthropicApiKey) {
        return reply.status(200).send({
          category: null,
          tags: [],
          message: "AI classification is not configured — events will be published without classification.",
        });
      }

      try {
        const { default: Anthropic } = await import("@anthropic-ai/sdk");
        const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });

        const { title, description } = parseResult.data;

        const prompt = `You are a city events classifier. Classify the following event and return ONLY a JSON object with no other text.

Event Title: ${title}
Event Description: ${description}

Return a JSON object with exactly these two fields:
- "category": one of exactly these values: NIGHTLIFE, SPORTS, EDUCATION, FOOD, WELLNESS, CULTURE, ENTERTAINMENT
- "tags": an array of 2 to 8 lowercase slug strings describing the event (e.g. "live-music", "free", "outdoor", "family-friendly", "18-plus", "fitness", "art")

Example response:
{"category":"ENTERTAINMENT","tags":["live-music","free","outdoor"]}

Respond with only the JSON object. No explanation, no markdown, no code blocks.`;

        const message = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 256,
          messages: [{ role: "user", content: prompt }],
        });

        const firstBlock = message.content[0];
        if (firstBlock === undefined || firstBlock.type !== "text") {
          return reply.status(500).send({ error: "AI returned no text content" });
        }

        const parsed = JSON.parse(firstBlock.text.trim()) as { category: string; tags: string[] };
        return reply.status(200).send(parsed);
      } catch (error) {
        fastify.log.error({ error }, "Failed to preview classification");
        return reply.status(500).send({ error: "AI classification preview failed" });
      }
    }
  );

  fastify.get(
    "/events/:id",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parseResult = getEventParamsSchema.safeParse(request.params);

      if (!parseResult.success) {
        const details = parseResult.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }));
        return reply.status(400).send({ error: "Validation failed", details });
      }

      try {
        const isAuthenticated = await fastify.tryAuthenticate(request);
        const userId = isAuthenticated ? request.user?.userId : undefined;

        const event = await fastify.prisma.event.findFirst({
          where: {
            id: parseResult.data.id,
            // Show ACTIVE events to everyone, or any status to the submitter
            OR: [
              { status: EventStatus.ACTIVE },
              ...(userId !== undefined ? [{ submittedById: userId }] : []),
            ],
          },
          include: {
            tags: true,
            city: true,
            submittedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        if (event === null) {
          return reply.status(404).send({ error: "Event not found" });
        }

        return reply.status(200).send(event);
      } catch (error) {
        fastify.log.error({ error }, "Failed to fetch event");
        return reply.status(500).send({ error: "Failed to fetch event" });
      }
    }
  );

  // ── POST /events ──────────────────────────────────────────────────────────

  fastify.post(
    "/events",
    // Require a valid JWT so the submitter is always a known authenticated user
    { preHandler: [fastify.authenticate] },
    // Route handler: validate body, compute H3, persist to database, enqueue classifier job
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Parse and validate the incoming JSON body against the Zod schema
      const parseResult = createEventBodySchema.safeParse(request.body);

      // If validation failed, respond with 400 and the Zod error messages
      if (!parseResult.success) {
        // Format Zod errors into a human-readable list for the API consumer
        const errors = parseResult.error.errors.map((e) => ({
          // JSON path to the offending field (e.g. ["latitude"])
          field: e.path.join("."),
          // Human-readable description of the validation failure
          message: e.message,
        }));
        // Return 400 with structured validation errors so clients can show field-level feedback
        return reply.status(400).send({ error: "Validation failed", details: errors });
      }

      // Destructure validated data so TypeScript knows all fields are present and correctly typed
      const body = parseResult.data;

      // Compute the three H3 cell indexes from the submitted coordinates
      // These are stored on the event for spatial ranking without recomputing at query time
      const { r6, r7, r8, r9, r11 } = getH3Indexes(body.latitude, body.longitude);

      const nextStatus = config.hasAnthropicApiKey
        ? EventStatus.PENDING_CLASSIFICATION
        : EventStatus.ACTIVE;

      // Wrap the database write in a try/catch so Prisma errors become structured 500 responses
      try {
        // Insert the new event into the database; status defaults to PENDING_CLASSIFICATION
        // so it is hidden from the public feed until the AI classifier processes it
        const event = await fastify.prisma.event.create({
          data: {
            // Short display title saved as-is from the submission
            title: body.title,
            // Full description; will be sent to the Claude classifier for tag extraction
            description: body.description,
            // Venue name for display; not used for geocoding
            locationName: body.locationName,
            // Raw coordinate stored for map pin rendering
            latitude: body.latitude,
            // Raw coordinate stored for map pin rendering
            longitude: body.longitude,
            h3R6: r6,
            h3R7: r7,
            h3R8: r8,
            h3R9: r9,
            h3R11: r11,
            // Category is null until the AI classifier processes the job; schema allows nullable
            category: null,
            // Convert the date string to a Date object for Prisma's DateTime field
            eventDate: new Date(body.eventDate),
            // Convert start time string to Date
            startTime: new Date(body.startTime),
            // Convert optional end time; undefined maps to null in Prisma
            endTime: body.endTime !== undefined ? new Date(body.endTime) : null,
            // New events are hidden from the feed until classification completes
            status: nextStatus,
            // Link to the city so feed queries can scope by cityId
            cityId: body.cityId,
            // Resolved from the authenticated JWT; the client does not supply this field
            submittedById: request.user.userId,
          },
          // Include related tags and city so the response is self-contained
          include: {
            // Return the tag objects (empty at creation time; populated after classification)
            tags: true,
            // Return the city so clients know the timezone for rendering times
            city: true,
          },
        });

        await publishSpatialIndexDocument({
          id: event.id,
          cityId: event.cityId,
          title: event.title,
          description: event.description,
          locationName: event.locationName,
          latitude: event.latitude,
          longitude: event.longitude,
          h3R7: event.h3R7,
          h3R9: event.h3R9,
          h3R11: event.h3R11,
          category: event.category,
          status: event.status,
          tags: event.tags.map((tag) => tag.name),
          eventDate: event.eventDate,
          startTime: event.startTime,
          endTime: event.endTime,
          updatedAt: event.updatedAt,
        });

        if (config.hasAnthropicApiKey) {
          await classifierQueue.add("classify-event", { eventId: event.id });
        }

        // Return 201 Created with the full saved event record (status: PENDING_CLASSIFICATION)
        return reply.status(201).send(event);
      } catch (error) {
        // Log the raw error for server-side debugging; do not expose internals to the client
        fastify.log.error({ error }, "Failed to create event");
        // Return a generic 500 so the client knows to retry or report the issue
        return reply.status(500).send({ error: "Failed to create event" });
      }
    }
  );

  // ── GET /events ───────────────────────────────────────────────────────────

  fastify.get(
    "/events",
    // Public route: no authentication required to browse the event feed
    // Route handler: validate query params, fetch active events, rank, return
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Parse and validate the query string against the Zod schema
      const parseResult = getEventsQuerySchema.safeParse(request.query);

      // If validation failed, return 400 with the structured Zod error list
      if (!parseResult.success) {
        // Format errors the same way as POST /events for a consistent API contract
        const errors = parseResult.error.errors.map((e) => ({
          // JSON path to the offending query parameter
          field: e.path.join("."),
          // Human-readable validation failure description
          message: e.message,
        }));
        // Return 400 with validation details so API consumers can correct the query string
        return reply.status(400).send({ error: "Validation failed", details: errors });
      }

      // Destructure validated query params; TypeScript now knows their precise types
      const query = parseResult.data;

      // Build the Prisma where clause; always filter by cityId and ACTIVE status
      // so the feed only shows approved events in the requested city
      const where: Prisma.EventWhereInput = {
        // Restrict to the requested city — all feed queries are city-scoped
        cityId: query.cityId,
        // Only show events that have been classified and approved
        status: EventStatus.ACTIVE,
        // Add the optional category filter only when the query param was supplied
        ...(query.category !== undefined && {
          // Cast to Prisma's generated enum type to satisfy the type checker
          category: query.category as unknown as PrismaEventCategory,
        }),
        ...(query.q !== undefined && {
          OR: [
            { title: { contains: query.q, mode: "insensitive" } },
            { description: { contains: query.q, mode: "insensitive" } },
            { locationName: { contains: query.q, mode: "insensitive" } },
            {
              tags: {
                some: {
                  name: { contains: query.q, mode: "insensitive" },
                },
              },
            },
          ],
        }),
      };

      // H3 viewport filtering: only fetch events within the visible map area
      const hasViewport =
        query.north !== undefined &&
        query.south !== undefined &&
        query.east !== undefined &&
        query.west !== undefined;

      if (hasViewport) {
        const zoom = query.zoom ?? 12;
        const resolution = zoomToResolution(zoom);
        const h3Field = resolutionToField(resolution);
        const cells = getViewportCells(
          {
            north: query.north!,
            south: query.south!,
            east: query.east!,
            west: query.west!,
          },
          resolution
        );

        if (cells !== null && cells.length > 0) {
          // Filter events whose H3 cell at the chosen resolution is within the viewport cells
          where[h3Field] = { in: cells };
        } else {
          // Fallback to bounding box when H3 cell count exceeds safety limit
          where.latitude = { gte: query.south!, lte: query.north! };
          where.longitude = { gte: query.west!, lte: query.east! };
        }
      }

      // Wrap the database read in a try/catch so Prisma errors become structured 500 responses
      try {
        // Fetch all active events matching the filter; includes tags for display and ranking
        const events = await fastify.prisma.event.findMany({
          // Apply city, status, and optional category filters
          where,
          // Include tags so the response is self-contained and clients can filter locally
          include: {
            // Return associated tags for display in the feed card
            tags: true,
            // Return the city record so clients know the timezone
            city: true,
            submittedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        // Determine whether to use proximity ranking or date-based fallback
        // Proximity ranking requires both lat AND lng to be present in the query
        let userCell: string | undefined;
        if (query.lat !== undefined && query.lng !== undefined) {
          // Convert the user's coordinates to an H3 resolution-9 cell for ring distance calc
          userCell = latLngToCell(query.lat, query.lng, 9);
        }

        // Apply the ranking engine: sorts by proximity when userCell is present, by date otherwise
        const rankedEvents = rankEvents(events, userCell);

        // Return 200 with the ranked event array; empty array is valid (no events yet in the city)
        return reply.status(200).send(rankedEvents);
      } catch (error) {
        // Log the raw Prisma error for server-side debugging
        fastify.log.error({ error }, "Failed to fetch events");
        // Return generic 500 so the client knows to retry
        return reply.status(500).send({ error: "Failed to fetch events" });
      }
    }
  );
}
