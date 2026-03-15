// AI-GENERATED
// Tool: Claude (claude-sonnet-4-6)
// Date: 2026-03-14
// Prompt summary: H3 geohash indexing helpers for CityPulse event location encoding and proximity calculation
// Reviewed by: unreviewed

// ── Imports ───────────────────────────────────────────────────────────────────

// h3-js provides the core H3 cell encoding and grid distance functions
import { latLngToCell, gridDistance, polygonToCells, gridDisk } from "h3-js";

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
  // Coarse clustering granularity (~3.2 km); used for server-side map clustering
  CLUSTER: 6,
  // City-district granularity; used for broad geographic grouping on the map
  CITY: 7,
  // Nearby search granularity (~460 m); used for gridDisk radius queries
  NEARBY: 8,
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

/**
 * Maximum number of H3 cells allowed in a single viewport query.
 * If the viewport produces more cells than this, the resolution is too high for the zoom level.
 */
const MAX_VIEWPORT_CELLS = 500;

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * The three H3 cell strings computed for a single geographic coordinate.
 * Each field represents the same location at a different level of precision.
 */
export interface H3Indexes {
  r6: string;
  r7: string;
  r8: string;
  r9: string;
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
  const r6 = latLngToCell(lat, lng, RESOLUTIONS.CLUSTER);
  const r7 = latLngToCell(lat, lng, RESOLUTIONS.CITY);
  const r8 = latLngToCell(lat, lng, RESOLUTIONS.NEARBY);
  const r9 = latLngToCell(lat, lng, RESOLUTIONS.NEIGHBORHOOD);
  const r11 = latLngToCell(lat, lng, RESOLUTIONS.VENUE);
  return { r6, r7, r8, r9, r11 };
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

/**
 * Maps a Google Maps zoom level to the appropriate H3 resolution for viewport queries.
 * The resolution is chosen so that the number of cells covering the viewport stays manageable.
 *
 * @param zoom - Google Maps zoom level (typically 1–21)
 * @returns    - H3 resolution (7, 9, or 11)
 */
export function zoomToResolution(zoom: number): number {
  if (zoom >= 15) return RESOLUTIONS.VENUE;
  if (zoom >= 11) return RESOLUTIONS.NEIGHBORHOOD;
  return RESOLUTIONS.CITY;
}

/**
 * The H3 field name corresponding to each resolution, for building Prisma WHERE clauses.
 */
export function resolutionToField(resolution: number): "h3R7" | "h3R9" | "h3R11" {
  if (resolution === RESOLUTIONS.VENUE) return "h3R11";
  if (resolution === RESOLUTIONS.NEIGHBORHOOD) return "h3R9";
  return "h3R7";
}

/**
 * Viewport bounds representing the visible map area.
 */
export interface ViewportBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Converts viewport bounds to a set of H3 cell indexes at the appropriate resolution.
 * Used to filter events so only those within the visible map area are returned.
 *
 * @param bounds     - The visible map viewport (north/south/east/west lat/lng)
 * @param resolution - H3 resolution to use (from zoomToResolution)
 * @returns          - Array of H3 cell index strings covering the viewport, or null if too many cells
 */
/**
 * Haversine distance in kilometres between two WGS-84 coordinates.
 */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Converts a radius in km to the k-ring size for H3 resolution 8 (~460m per ring).
 * Capped at 12 to prevent massive gridDisk arrays.
 */
export function radiusToKRing(radiusKm: number): number {
  return Math.min(Math.ceil(radiusKm / 0.46), 12);
}

/**
 * Returns all H3 cells within k rings of a center point at resolution 8.
 */
export function getNearbyCells(lat: number, lng: number, radiusKm: number): string[] {
  const centerCell = latLngToCell(lat, lng, RESOLUTIONS.NEARBY);
  const k = radiusToKRing(radiusKm);
  return gridDisk(centerCell, k);
}

export function getViewportCells(bounds: ViewportBounds, resolution: number): string[] | null {
  const { north, south, east, west } = bounds;

  // Build a polygon from the bounding box corners (h3-js expects [lat, lng] pairs)
  const polygon: [number, number][] = [
    [south, west],
    [north, west],
    [north, east],
    [south, east],
    [south, west],
  ];

  try {
    const cells = polygonToCells(polygon, resolution, false);

    // Safety check: if the viewport generates too many cells, return null to signal fallback
    if (cells.length > MAX_VIEWPORT_CELLS) {
      return null;
    }

    return cells;
  } catch {
    return null;
  }
}
