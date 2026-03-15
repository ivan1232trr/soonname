// AI-GENERATED
// Tool: Claude (claude-sonnet-4-6)
// Date: 2026-03-14
// Prompt summary: seed script that inserts the Kingston city record and the initial CityPulse tag taxonomy
// Reviewed by: unreviewed

// ── Imports ───────────────────────────────────────────────────────────────────

// PrismaClient gives us type-safe access to all database tables for seed operations
import { PrismaClient } from "@prisma/client";

// ── Client ────────────────────────────────────────────────────────────────────

// Instantiate a standalone Prisma client for the seed script; not shared with the server
const prisma = new PrismaClient();

// ── Seed data ─────────────────────────────────────────────────────────────────

/**
 * The initial set of cities added to the database.
 * Only Kingston, Jamaica is seeded for MVP (TD-011).
 */
// Kingston seed record — the launch city; coordinates from TD-011
const CITIES = [
  {
    // Human-readable name shown in the city picker dropdown
    name: "Kingston",
    // Country displayed alongside the city name
    country: "Jamaica",
    // Decimal latitude of Kingston city centre (TD-011: lat 17.9970)
    latitude: 17.997,
    // Decimal longitude of Kingston city centre (TD-011: lng -76.7936)
    longitude: -76.7936,
    // IANA timezone for Jamaica; UTC-5, no daylight saving (TD-011)
    timezone: "America/Jamaica",
  },
];

/**
 * The initial tag taxonomy used by the AI classifier and shown in the onboarding Interest Tags step.
 * Tags are lowercase slugs; the UI renders them as human-readable chips.
 * These come directly from the interest tags listed in UI Requirements §4.1.4.
 */
// Tags seeded from the UI requirements interest tag examples plus common descriptive tags
const TAGS = [
  // ── Category-level tags (broad event types) ──────────────────────────────
  "music",           // Live music, concerts, DJ sets
  "art",             // Visual art, exhibitions, galleries
  "food-and-drink",  // Restaurants, food festivals, tastings
  "fitness",         // Workouts, runs, sports activities
  "nightlife",       // Bars, clubs, late-night events
  "outdoors",        // Parks, hikes, outdoor activities
  "tech",            // Tech meetups, hackathons, demos
  "comedy",          // Stand-up, improv, comedy shows
  "film",            // Screenings, film festivals, cinema
  "wellness",        // Yoga, meditation, mental health events
  "markets",         // Craft markets, farmers markets, pop-ups
  "sports",          // Spectator sports, matches, tournaments
  "community",       // Neighbourhood events, volunteering, civic

  // ── Descriptive / attribute tags (event characteristics) ─────────────────
  "free",            // No ticket price required
  "18-plus",         // Age-restricted venue or event
  "family-friendly", // Suitable for children
  "outdoor",         // Takes place outdoors (duplicate intent from "outdoors" — kept as a shorter form)
  "live-music",      // Features live musical performance
  "weekend",         // Scheduled on a Saturday or Sunday
  "daytime",         // Occurs primarily during daylight hours
  "networking",      // Professional networking component
  "pop-up",          // Temporary or one-off event
];

// ── Main seed function ─────────────────────────────────────────────────────────

/**
 * Seeds the database with the initial city and tag records.
 * Uses upsert so the script is idempotent — safe to run multiple times without duplicating rows.
 *
 * @returns - A Promise that resolves when all records have been written
 * @sideEffects - Writes to the cities and tags tables in PostgreSQL
 */
async function main(): Promise<void> {
  // Log the start of seeding so operators know the script is running
  console.log("Seeding database...");

  // ── Seed cities ───────────────────────────────────────────────────────────

  // Iterate over each city definition and upsert to avoid duplicates on re-runs
  for (const city of CITIES) {
    // upsert: update if a city with this name exists, otherwise create a new record
    const upserted = await prisma.city.upsert({
      // Match on the city name; this is the natural unique key for city records
      where: { name: city.name },
      // If the record exists, update all fields in case coordinates or timezone changed
      update: {
        // Refresh country in case of data corrections
        country: city.country,
        // Refresh coordinates in case of precision updates
        latitude: city.latitude,
        // Refresh coordinates in case of precision updates
        longitude: city.longitude,
        // Refresh timezone string in case of IANA database updates
        timezone: city.timezone,
      },
      // If no record exists, insert a full new city row
      create: city,
    });
    // Log the upserted city so seed runs are auditable in CI logs
    console.log(`  City: ${upserted.name} (${upserted.id})`);
  }

  // ── Seed tags ─────────────────────────────────────────────────────────────

  // Iterate over each tag slug and upsert to keep the taxonomy idempotent
  for (const tagName of TAGS) {
    // upsert: skip creation if a tag with this slug already exists
    const upserted = await prisma.tag.upsert({
      // Match on the slug; name is the unique key on the Tag model
      where: { name: tagName },
      // If the tag already exists, no fields need updating — name is the only column
      update: {},
      // If no tag exists yet, create a new record with this slug
      create: { name: tagName },
    });
    // Log each tag so the seed run output shows the full taxonomy
    console.log(`  Tag: ${upserted.name} (${upserted.id})`);
  }

  // Log completion so operators know the seed finished without errors
  console.log("Seeding complete.");
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

// Invoke main and ensure the Prisma client is always disconnected, even on failure
main()
  .catch((error: unknown) => {
    // Log the seed error to stderr so CI pipelines mark the step as failed
    console.error("Seed failed:", error);
    // Exit with code 1 so the calling process knows the seed did not succeed
    process.exit(1);
  })
  .finally(() => {
    // Always disconnect the Prisma client to release the database connection pool
    void prisma.$disconnect();
  });
