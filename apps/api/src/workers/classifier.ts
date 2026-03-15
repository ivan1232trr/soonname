// AI-GENERATED
// Tool: Claude (claude-sonnet-4-6)
// Date: 2026-03-14
// Prompt summary: BullMQ worker that calls the Anthropic Claude API to classify CityPulse events and writes category and tags back to the database
// Reviewed by: unreviewed

// ── Imports ───────────────────────────────────────────────────────────────────

// Worker from BullMQ consumes jobs from the Redis-backed classifier queue
import { Worker } from "bullmq";
// Anthropic SDK client for calling the Claude AI model
import Anthropic from "@anthropic-ai/sdk";
// PrismaClient gives type-safe access to the events and tags tables
import { PrismaClient, EventCategory, EventStatus } from "@prisma/client";
// The job data shape shared between the producer (events route) and this consumer
import type { ClassifierJobData } from "../lib/classifier-queue.js";
// Validated config provides the Redis URL and Anthropic API key
import { config } from "../config.js";
import { publishSpatialIndexDocument } from "../lib/spatial-index-storage.js";

// ── Clients ───────────────────────────────────────────────────────────────────

// Standalone Prisma client for the worker process; separate from the server's instance
// The worker runs in the same Node.js process but manages its own connection pool
const prisma = new PrismaClient();

// Anthropic SDK client authenticated with the API key from config
const anthropic = new Anthropic({
  // API key read from the validated config object; never hard-coded or logged
  apiKey: config.anthropicApiKey,
});

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * The valid EventCategory values as an array of strings.
 * Used to validate the AI model's response before writing it to the database.
 */
// All possible categories the classifier can return; must match the Prisma enum exactly
const VALID_CATEGORIES: string[] = Object.values(EventCategory);

/**
 * The Claude model used for event classification.
 * Haiku is chosen for cost efficiency on high-volume classification tasks.
 * Model ID pinned in this constant per TD-010 R4 so a single change updates all call sites.
 */
// claude-haiku-4-5 is the fastest and cheapest model; appropriate for structured classification
const CLASSIFIER_MODEL = "claude-haiku-4-5-20251001";

// ── Classification logic ──────────────────────────────────────────────────────

/**
 * The expected shape of the JSON response from the Claude classifier.
 * Claude is instructed to return exactly this structure.
 */
interface ClassifierResponse {
  // One of the seven EventCategory enum values
  category: string;
  // Array of 2–8 lowercase tag slugs (e.g. ["live-music", "free", "outdoor"])
  tags: string[];
}

/**
 * Calls the Claude API to classify an event and returns the parsed category and tags.
 * The prompt instructs Claude to respond with a strict JSON object.
 *
 * @param title       - The event title submitted by the user
 * @param description - The event description submitted by the user
 * @returns           - A Promise resolving to { category, tags } from the AI model
 * @sideEffects       - Makes an HTTP request to the Anthropic API; incurs API usage costs
 */
async function classifyEvent(title: string, description: string): Promise<ClassifierResponse> {
  // Build the classification prompt; the description is the primary signal for category and tags
  const prompt = `You are a city events classifier. Classify the following event and return ONLY a JSON object with no other text.

Event Title: ${title}
Event Description: ${description}

Return a JSON object with exactly these two fields:
- "category": one of exactly these values: NIGHTLIFE, SPORTS, EDUCATION, FOOD, WELLNESS, CULTURE, ENTERTAINMENT
- "tags": an array of 2 to 8 lowercase slug strings describing the event (e.g. "live-music", "free", "outdoor", "family-friendly", "18-plus", "fitness", "art")

Example response:
{"category":"ENTERTAINMENT","tags":["live-music","free","outdoor"]}

Respond with only the JSON object. No explanation, no markdown, no code blocks.`;

  // Call the Claude API with the classification prompt
  const message = await anthropic.messages.create({
    // Use the pinned Haiku model for cost-efficient classification
    model: CLASSIFIER_MODEL,
    // 256 tokens is sufficient for the compact JSON response we expect
    max_tokens: 256,
    // Single user message containing the event details and classification instructions
    messages: [{ role: "user", content: prompt }],
  });

  // Extract the text content from the first content block of the response
  const firstBlock = message.content[0];
  // Verify the response is a text block; guard against unexpected content types
  if (firstBlock === undefined || firstBlock.type !== "text") {
    // Throw so the BullMQ retry logic can attempt the job again
    throw new Error("Classifier returned no text content");
  }

  // Parse the JSON response from the model; throws if the response is not valid JSON
  let parsed: unknown;
  try {
    // Trim whitespace in case the model included leading/trailing spaces
    parsed = JSON.parse(firstBlock.text.trim());
  } catch {
    // Throw with the raw response so the error is visible in the job failure log
    throw new Error(`Classifier returned invalid JSON: ${firstBlock.text}`);
  }

  // Validate that the parsed response has the expected shape
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("category" in parsed) ||
    !("tags" in parsed) ||
    typeof (parsed as Record<string, unknown>)["category"] !== "string" ||
    !Array.isArray((parsed as Record<string, unknown>)["tags"])
  ) {
    // Throw so the job is retried; the model occasionally returns malformed output
    throw new Error(`Classifier response has unexpected shape: ${JSON.stringify(parsed)}`);
  }

  // Cast to the expected response type after structural validation
  return parsed as ClassifierResponse;
}

// ── Worker ────────────────────────────────────────────────────────────────────

/**
 * Creates and starts the BullMQ worker that processes AI classification jobs.
 * Each job receives an eventId, fetches the event from the database, calls Claude,
 * writes the category and tags back, and flips the event status to ACTIVE.
 *
 * @returns - The running Worker instance (can be closed on graceful shutdown)
 * @sideEffects - Connects to Redis (BullMQ); writes to PostgreSQL (Prisma) on each job
 */
export function startClassifierWorker(): Worker<ClassifierJobData> {
  // Create the worker consuming from the same queue name used by the producer
  const worker = new Worker<ClassifierJobData>(
    // Queue name must exactly match the name used in classifier-queue.ts
    "citypulse-classifier",
    // Job processor function: receives a Job and returns a Promise
    async (job) => {
      // Extract the eventId from the job data; this is all the worker needs to start
      const { eventId } = job.data;

      // Log the start of each classification job for observability
      console.log(`[classifier] Processing event ${eventId} (job ${job.id ?? "unknown"})`);

      // Fetch the event from the database to get the title and description for classification
      const event = await prisma.event.findUnique({
        // Look up by primary key; events are always found here unless deleted between submission and classification
        where: { id: eventId },
        // Only fetch the fields the classifier needs; avoids loading large unused data
        select: {
          // Event UUID for the update query after classification
          id: true,
          // Short title included in the classification prompt as a context signal
          title: true,
          // Full description is the primary input for category and tag assignment
          description: true,
          // Current status; skip if already ACTIVE to avoid re-classifying
          status: true,
        },
      });

      // If the event was deleted before the worker processed the job, skip silently
      if (event === null) {
        // Log the skip so it is visible in monitoring without failing the job
        console.log(`[classifier] Event ${eventId} not found — skipping`);
        return;
      }

      // If the event is already ACTIVE (classified by a previous retry), skip to avoid overwriting
      if (event.status === EventStatus.ACTIVE) {
        // Log the skip for visibility; this can happen when a retry runs after a partial success
        console.log(`[classifier] Event ${eventId} already ACTIVE — skipping`);
        return;
      }

      // Call the Claude API to get the category and tag suggestions
      const classification = await classifyEvent(event.title, event.description);

      // Validate the returned category against the known enum values
      if (!VALID_CATEGORIES.includes(classification.category)) {
        // Throw so BullMQ retries the job; the model may have hallucinated an invalid category
        throw new Error(`Invalid category from classifier: ${classification.category}`);
      }

      // Cast the validated category string to the Prisma enum type
      const category = classification.category as EventCategory;

      // Resolve tag IDs: find existing tags by slug, create any new ones that do not exist yet
      const tagRecords = await Promise.all(
        // Map each slug from the classifier response to a database tag record
        classification.tags.map((slug) =>
          prisma.tag.upsert({
            // Match on the tag slug; the name field is unique on the Tag model
            where: { name: slug.toLowerCase() },
            // If the tag already exists, no update needed — the name is the only field
            update: {},
            // If the tag does not exist, create it with the classifier-provided slug
            create: { name: slug.toLowerCase() },
          })
        )
      );

      // Update the event record with the classification results and flip to ACTIVE
      const updatedEvent = await prisma.event.update({
        // Target the specific event being classified
        where: { id: eventId },
        data: {
          // Write the AI-assigned category; replaces the null set at submission time
          category,
          // Connect the resolved tag records to the event via the implicit join table
          tags: {
            // set replaces all existing tags so re-classification produces a clean result
            set: tagRecords.map((tag) => ({ id: tag.id })),
          },
          // Flip the event status to ACTIVE so it appears in the public feed
          status: EventStatus.ACTIVE,
        },
        include: {
          tags: true,
        },
      });

      await publishSpatialIndexDocument({
        id: updatedEvent.id,
        cityId: updatedEvent.cityId,
        title: updatedEvent.title,
        description: updatedEvent.description,
        locationName: updatedEvent.locationName,
        latitude: updatedEvent.latitude,
        longitude: updatedEvent.longitude,
        h3R7: updatedEvent.h3R7,
        h3R9: updatedEvent.h3R9,
        h3R11: updatedEvent.h3R11,
        category: updatedEvent.category,
        status: updatedEvent.status,
        tags: updatedEvent.tags.map((tag) => tag.name),
        eventDate: updatedEvent.eventDate,
        startTime: updatedEvent.startTime,
        endTime: updatedEvent.endTime,
        updatedAt: updatedEvent.updatedAt,
      });

      // Log successful classification for monitoring and debugging
      console.log(`[classifier] Event ${eventId} classified as ${category} with ${tagRecords.length} tags`);
    },
    // Worker configuration
    {
      // BullMQ connection: same Redis instance as the queue producer
      connection: { url: config.redisUrl },
      // Process jobs one at a time; avoids overwhelming the Anthropic API rate limit
      concurrency: 1,
    }
  );

  // Log worker errors to the server console; BullMQ handles retries automatically
  worker.on("failed", (job, error) => {
    // Log the job ID and error message so failures are visible in the Coolify log viewer
    console.error(`[classifier] Job ${job?.id ?? "unknown"} failed:`, error.message);
  });

  // Return the worker instance so the server can close it gracefully on SIGTERM
  return worker;
}
