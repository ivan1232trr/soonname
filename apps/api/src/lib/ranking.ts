// AI-GENERATED
// Tool: Claude (claude-sonnet-4-6)
// Date: 2026-03-14
// Prompt summary: event ranking engine that scores and sorts events by proximity and date for the CityPulse feed
// Reviewed by: unreviewed

// ── Imports ───────────────────────────────────────────────────────────────────

// Prisma-generated Event type; represents a row from the events table
import type { Event } from "@prisma/client";
// H3 grid distance helper and the ring cap constant used in the penalty formula
import { getGridDistance, DEFAULT_NEARBY_RINGS } from "./h3.js";

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Starting score assigned to every event before any penalties are applied.
 * A score of 10 gives enough headroom for the distance penalty (max 5) without going negative.
 */
// Base score so the worst-case ranked event still has a positive score value
const BASE_SCORE = 10;

/**
 * Penalty applied per H3 ring of distance at resolution 9.
 * Multiplied by the ring distance to produce the total distance penalty.
 * e.g. 3 rings away → 3 * 0.1 = 0.3 penalty subtracted from the base score.
 */
// Small per-ring penalty keeps nearby events ranked above distant ones without harsh cutoffs
const DISTANCE_PENALTY_PER_RING = 0.1;

/**
 * Maximum distance penalty that can be subtracted from the base score.
 * Caps at 5 so even far-away events always score ≥ 5, keeping them in the feed.
 * Equivalent to DEFAULT_NEARBY_RINGS * DISTANCE_PENALTY_PER_RING * 10.
 */
// Cap prevents infinitely large penalties from burying valid far events
const MAX_DISTANCE_PENALTY = 5;

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * An Event record augmented with a computed ranking score.
 * Used internally within the ranking engine before stripping the score for the API response.
 */
interface ScoredEvent {
  // Original Prisma Event record; all fields preserved for the API response
  event: Event;
  // Computed ranking score; higher is better; used for sort order only
  score: number;
}

// ── Functions ─────────────────────────────────────────────────────────────────

/**
 * Ranks an array of events for the CityPulse feed.
 *
 * When no userCell is provided the events are returned sorted by eventDate ascending
 * so the soonest upcoming events appear first — a sensible default for new users.
 *
 * When userCell is provided each event receives a score starting at BASE_SCORE (10),
 * reduced by (ringDistance * DISTANCE_PENALTY_PER_RING) capped at MAX_DISTANCE_PENALTY (5).
 * Events are then sorted descending by score so the closest relevant events appear first.
 *
 * @param events    - Array of Event records fetched from the database (ACTIVE status only)
 * @param userCell  - Optional H3 cell string at resolution 9 representing the user's location;
 *                    derived from the lat/lng query params in GET /events
 * @returns         - The same events sorted either by date (no cell) or by score descending
 * @sideEffects     - None; pure transformation, no database writes
 */
export function rankEvents(events: Event[], userCell?: string): Event[] {
  // If no location was supplied, fall back to chronological order (soonest first)
  // This is the default view for users who have not granted location permission
  if (userCell === undefined || userCell === "") {
    // Sort ascending by eventDate so the most imminent events appear at the top
    return [...events].sort(
      (a, b) => a.eventDate.getTime() - b.eventDate.getTime()
      // getTime() converts Date to a numeric timestamp for numeric comparison
    );
  }

  // Compute a score for each event based on its H3 ring distance from the user
  const scored: ScoredEvent[] = events.map((event) => {
    // Measure how many H3 rings at resolution 9 separate the user from this event
    const ringDistance = getGridDistance(userCell, event.h3R9);

    // Multiply ring count by the per-ring penalty to get a continuous penalty value
    const rawPenalty = ringDistance * DISTANCE_PENALTY_PER_RING;

    // Cap the penalty so distant events are deprioritised but never completely buried
    const penalty = Math.min(rawPenalty, MAX_DISTANCE_PENALTY);

    // Final score: start at 10, subtract the capped distance penalty
    const score = BASE_SCORE - penalty;

    // Pair the event with its score so we can sort without recomputing
    return { event, score };
  });

  // Sort descending by score — highest scores (closest events) appear first in the feed
  scored.sort((a, b) => b.score - a.score);

  // Strip the score wrapper and return plain Event objects matching the expected API shape
  return scored.map((s) => s.event);
}
