// AI-GENERATED
// Tool: Claude (claude-sonnet-4-6)
// Date: 2026-03-14
// Prompt summary: H3 geohash indexing helpers for CityPulse event location encoding and proximity calculation
// Reviewed by: unreviewed

// ── Imports ───────────────────────────────────────────────────────────────────

// h3-js provides the core H3 cell encoding and grid distance functions
import { latLngToCell, gridDistance } from "h3-js";

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * H3 resolution presets used across the CityPulse ranking and indexing pipeline.
 * Higher resolution numbers produce smaller, more precise hexagonal cells.
 *
 * Resolution 7  → ~5.16 km² average cell area  — city district granularity
 * Resolution 9  → ~0.11 km² average cell area  — neighbourhood granularity (primary ranking key)
 * Resolution 11 → ~0.002 km² average cell area — venue-level precision
 */
// Named resolution constants so magic numbers never appear in application code
export const RESOLUTIONS = {
  // City-district granularity; used for broad geographic grouping on the map
  CITY: 7,
  // Neighbourhood granularity; used as the primary ranking dimension for proximity scoring
  NEIGHBORHOOD: 9,
  // Venue-level granularity; used for precise co-location detection
  VENUE: 11,
} as const;

/**
 * Maximum H3 ring distance (in grid rings at resolution 9) used in proximity queries.
 * Events beyond this ring distance are still returned but receive the maximum penalty.
 * At resolution 9, each ring is approximately 0.35 km wide.
 */
// Cap ring distance so ranking never excludes distant events entirely — just deprioritises them
export const DEFAULT_NEARBY_RINGS = 5;

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * The three H3 cell strings computed for a single geographic coordinate.
 * Each field represents the same location at a different level of precision.
 */
export interface H3Indexes {
  // H3 cell at resolution 7; stored in Event.h3R7 in the database
  r7: string;
  // H3 cell at resolution 9; primary proximity-ranking key
  r9: string;
  // H3 cell at resolution 11; venue-level precision for co-location checks
  r11: string;
}

// ── Functions ─────────────────────────────────────────────────────────────────

/**
 * Converts a WGS-84 latitude/longitude coordinate into H3 cell indexes at three resolutions.
 * Called when a new event is submitted to generate the h3R7, h3R9, and h3R11 fields.
 *
 * @param lat - WGS-84 decimal latitude of the event location
 * @param lng - WGS-84 decimal longitude of the event location
 * @returns   - Object containing H3 cell strings at resolutions 7, 9, and 11
 * @sideEffects - None; pure transformation with no I/O
 */
export function getH3Indexes(lat: number, lng: number): H3Indexes {
  // Encode the coordinate at resolution 7 for city-district level grouping
  const r7 = latLngToCell(lat, lng, RESOLUTIONS.CITY);

  // Encode the coordinate at resolution 9 for neighbourhood proximity ranking
  const r9 = latLngToCell(lat, lng, RESOLUTIONS.NEIGHBORHOOD);

  // Encode the coordinate at resolution 11 for venue-level precision
  const r11 = latLngToCell(lat, lng, RESOLUTIONS.VENUE);

  // Return all three as a named object so callers can destructure only what they need
  return { r7, r9, r11 };
}

/**
 * Computes the H3 grid distance (ring count) between two H3 cells at resolution 9.
 * Grid distance measures how many rings separate two cells, not physical kilometres.
 * Used by the ranking engine to calculate the proximity penalty.
 *
 * @param cellA - H3 cell index string at resolution 9 (user's current location)
 * @param cellB - H3 cell index string at resolution 9 (event location)
 * @returns     - Integer ring distance; 0 means same cell, 1 means adjacent ring, etc.
 *               Returns DEFAULT_NEARBY_RINGS as a fallback if the cells cannot be compared
 *               (e.g. cells at different resolutions — callers should always pass r9 cells)
 * @sideEffects - None; pure computation with no I/O
 */
export function getGridDistance(cellA: string, cellB: string): number {
  // gridDistance throws if the cells are at different resolutions or are invalid
  // Wrap in try/catch so a bad input never crashes the ranking pipeline
  try {
    // Delegate to h3-js for the actual grid ring computation
    const distance = gridDistance(cellA, cellB);

    // gridDistance returns null when cells are too far apart to compare in the same base cell
    // Fall back to the maximum ring cap so such events receive the maximum penalty
    if (distance === null) {
      // Return the cap so these events sort below nearby events but are not omitted
      return DEFAULT_NEARBY_RINGS;
    }

    // Return the raw ring distance; the ranking engine applies the penalty formula
    return distance;
  } catch {
    // On any unexpected error (e.g. malformed cell string) return the maximum cap
    // This ensures ranking degrades gracefully rather than throwing 500 errors
    return DEFAULT_NEARBY_RINGS;
  }
}
