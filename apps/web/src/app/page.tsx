// AI-GENERATED
// Tool: Claude (claude-sonnet-4-6)
// Date: 2026-03-14
// Prompt summary: Next.js 15 App Router feed page placeholder for the CityPulse web app
// Reviewed by: unreviewed

// ── Imports ───────────────────────────────────────────────────────────────────

// ICity type imported from shared types package — used in the city info display block
import type { ICity } from "@citypulse/types";

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Static seed data for Kingston, Jamaica.
 * Used as the default city until user authentication and preferences are implemented.
 * Coordinates match the seed city in the Prisma schema and .env.example comments.
 */
// Hardcoded for the prototype; will be replaced by a database fetch in a future iteration
const LAUNCH_CITY: Pick<ICity, "name" | "country" | "latitude" | "longitude" | "timezone"> = {
  // Display name shown in the page header
  name: "Kingston",
  // Country for the subtitle line
  country: "Jamaica",
  // WGS-84 latitude of Kingston city centre; matches prisma seed data
  latitude: 17.997,
  // WGS-84 longitude of Kingston city centre; matches prisma seed data
  longitude: -76.7936,
  // IANA timezone identifier for Kingston; UTC-5 (no daylight saving)
  timezone: "America/Jamaica",
};

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Feed page — the home screen of the CityPulse web app.
 * This is a placeholder component for the scaffold phase.
 * It renders the city name, coordinates, and a status message confirming the stack is wired up.
 * Real feed content (event cards, map, filters) will be added in subsequent iterations.
 *
 * @returns - A server-rendered React element containing the placeholder feed UI
 * @sideEffects - None; this is a pure server component with no data fetching yet
 */
export default function FeedPage() {
  return (
    // Outer container: centres content and adds comfortable padding on all sides
    <main
      style={{
        // Limit the readable line width to prevent the content from stretching across wide screens
        maxWidth: "640px",
        // Auto horizontal margins centre the container in the viewport
        margin: "0 auto",
        // Vertical and horizontal padding keeps content away from the viewport edges
        padding: "48px 24px",
      }}
    >
      {/* Page header: app name and launch city */}
      <header style={{ marginBottom: "32px" }}>
        {/* Application name — the primary brand identity headline */}
        <h1 style={{ fontSize: "2rem", fontWeight: 700, margin: "0 0 4px" }}>
          CityPulse
        </h1>
        {/* Current city subtitle — confirms which city's events will be shown in the feed */}
        <p style={{ fontSize: "1rem", color: "#666", margin: 0 }}>
          {/* Render the city and country from the seed constant */}
          {LAUNCH_CITY.name}, {LAUNCH_CITY.country}
        </p>
      </header>

      {/* Status section: lets developers confirm the app compiled and routed correctly */}
      <section
        style={{
          // Light background distinguishes this status block from the eventual event cards
          background: "#f4f4f5",
          // Rounded corners match the card style defined in UI_REQUIREMENTS.md
          borderRadius: "12px",
          // Internal padding keeps text away from the box edges
          padding: "24px",
          // Spacing from the header above
          marginBottom: "24px",
        }}
      >
        {/* Section label: describes what this block represents */}
        <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 12px" }}>
          Scaffold status
        </h2>

        {/* Confirmation that the page rendered successfully */}
        <p style={{ margin: "0 0 8px", color: "#18181b" }}>
          {/* Green checkmark prefix signals success to developers scanning the page */}
          ✓ Next.js 15 App Router is working
        </p>

        {/* Confirmation that the shared types package resolved correctly */}
        <p style={{ margin: "0 0 8px", color: "#18181b" }}>
          {/* Confirms the workspace:* dependency resolution is functioning */}
          ✓ @citypulse/types package linked via pnpm workspace
        </p>

        {/* Placeholder text signalling where the live event feed will be rendered */}
        <p style={{ margin: 0, color: "#71717a" }}>
          {/* Italic style signals that this is a placeholder, not a real UI element */}
          <em>Event feed will be rendered here once the API and auth layers are connected.</em>
        </p>
      </section>

      {/* City metadata block: confirms launch city coordinates are accessible */}
      <section>
        {/* Section label */}
        <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 8px" }}>
          Launch city
        </h2>

        {/* Display each city field on its own line for easy visual scanning */}
        <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 16px" }}>
          {/* City name field */}
          <dt style={{ fontWeight: 500, color: "#71717a" }}>City</dt>
          {/* Render the city name from the constant */}
          <dd style={{ margin: 0 }}>{LAUNCH_CITY.name}</dd>

          {/* Latitude field */}
          <dt style={{ fontWeight: 500, color: "#71717a" }}>Latitude</dt>
          {/* Display latitude rounded to 4 decimal places for readability */}
          <dd style={{ margin: 0 }}>{LAUNCH_CITY.latitude.toFixed(4)}</dd>

          {/* Longitude field */}
          <dt style={{ fontWeight: 500, color: "#71717a" }}>Longitude</dt>
          {/* Display longitude rounded to 4 decimal places for readability */}
          <dd style={{ margin: 0 }}>{LAUNCH_CITY.longitude.toFixed(4)}</dd>

          {/* Timezone field */}
          <dt style={{ fontWeight: 500, color: "#71717a" }}>Timezone</dt>
          {/* Display the IANA timezone identifier */}
          <dd style={{ margin: 0 }}>{LAUNCH_CITY.timezone}</dd>
        </dl>
      </section>
    </main>
  );
}
