// AI-GENERATED
// Tool: Claude (claude-sonnet-4-6)
// Date: 2026-03-14
// Prompt summary: BullMQ queue instance for the CityPulse AI event classifier pipeline
// Reviewed by: unreviewed

// ── Imports ───────────────────────────────────────────────────────────────────

// Queue from BullMQ manages the producer side of the job pipeline
import { Queue } from "bullmq";
// Validated config provides the Redis URL for BullMQ's internal connection
import { config } from "../config.js";

// ── Job data type ─────────────────────────────────────────────────────────────

/**
 * Shape of the data payload for each classification job.
 * The worker uses the eventId to fetch the full event from PostgreSQL before calling Claude.
 *
 * @param eventId - UUID of the Event record to classify
 */
// Exported so both the queue producer (events route) and consumer (worker) share the same type
export interface ClassifierJobData {
  // UUID of the Event row that needs AI classification; used to fetch the event in the worker
  eventId: string;
}

// ── Queue instance ────────────────────────────────────────────────────────────

/**
 * Singleton BullMQ Queue for AI event classification jobs.
 * Producers (POST /events route) call classifierQueue.add() after inserting a new event.
 * The worker (src/workers/classifier.ts) consumes jobs from this queue asynchronously.
 *
 * BullMQ manages its own Redis connection pool internally; it does not share the ioredis
 * client decorated onto the Fastify instance.
 */
// Instantiate once at module load; the Queue holds its own Redis connection internally
export const classifierQueue = new Queue<ClassifierJobData>("citypulse:classifier", {
  // BullMQ connection config: pass the Redis URL directly so it manages its own pool
  connection: {
    // Use the same Redis instance as the rest of the application
    url: config.redisUrl,
  },
  // Default job options applied to every add() call unless overridden at call site
  defaultJobOptions: {
    // Retry a failed classification job up to 3 times before marking it as permanently failed
    attempts: 3,
    // Exponential backoff between retries: 2s, 4s, 8s — avoids hammering the AI API on transient errors
    backoff: { type: "exponential", delay: 2000 },
    // Remove completed jobs after 1 hour to keep the Redis queue clean
    removeOnComplete: { age: 3600 },
    // Keep failed jobs for 24 hours so they can be inspected for debugging
    removeOnFail: { age: 86400 },
  },
});
