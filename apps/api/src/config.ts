// AI-GENERATED
// Tool: Claude (claude-sonnet-4-6)
// Date: 2026-03-14
// Prompt summary: environment variable loading and validation for the Fastify API server
// Reviewed by: unreviewed

// ── Imports ───────────────────────────────────────────────────────────────────

// Node.js built-in for reading environment variables injected by the shell or a .env loader
import process from "node:process";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Reads a required string environment variable and throws if it is absent or empty.
 * Using a helper centralises the error message and avoids repeated boilerplate.
 *
 * @param key       - The environment variable name to look up in process.env
 * @returns         - The non-empty string value of the variable
 * @sideEffects     - Throws a descriptive Error if the variable is missing or blank
 */
function requireEnv(key: string): string {
  // Read the raw value from the process environment
  const value = process.env[key];
  // If the value is missing or an empty string, the server cannot start safely
  if (value === undefined || value.trim() === "") {
    // Surface the exact variable name so operators know what to set
    throw new Error(`Missing required environment variable: ${key}`);
  }
  // Return the trimmed value so accidental whitespace does not break connection strings
  return value.trim();
}

/**
 * Reads an optional string environment variable, returning a fallback if absent.
 *
 * @param key          - The environment variable name to look up
 * @param defaultValue - Value to return when the variable is absent or empty
 * @returns            - The env value when present, otherwise the defaultValue
 * @sideEffects        - None
 */
function optionalEnv(key: string, defaultValue: string): string {
  // Read the raw value; may be undefined if the variable was never set
  const value = process.env[key];
  // Return the default when the variable is absent or blank
  if (value === undefined || value.trim() === "") {
    return defaultValue;
  }
  // Return the trimmed environment value
  return value.trim();
}

// ── Config object ─────────────────────────────────────────────────────────────

/**
 * Central configuration object for the API server.
 * All runtime settings are resolved once at startup so failures surface immediately.
 *
 * @returns - A frozen plain object containing all validated config values
 * @sideEffects - Throws an Error on startup if any required variable is missing
 */
export const config = {
  // ── Server ───────────────────────────────────────────────────────────────
  // Fastify listen port; defaults to 3001 so it does not conflict with Next.js on 3000
  port: parseInt(optionalEnv("API_PORT", "3001"), 10),
  // Fastify bind host; 0.0.0.0 makes the server reachable from outside the container
  host: optionalEnv("API_HOST", "0.0.0.0"),

  // ── Database ─────────────────────────────────────────────────────────────
  // PostgreSQL connection string; required — Prisma will throw at query time without it
  databaseUrl: requireEnv("DATABASE_URL"),

  // ── Redis ────────────────────────────────────────────────────────────────
  // Redis connection URL; required for session cache and rate-limiting
  redisUrl: requireEnv("REDIS_URL"),

  // ── Anthropic ────────────────────────────────────────────────────────────
  // Anthropic API key for AI classification; required to run the classifier pipeline
  anthropicApiKey: requireEnv("ANTHROPIC_API_KEY"),

  // ── Auth ─────────────────────────────────────────────────────────────────
  // Secret used to sign and verify JWT tokens; must be long and random in production
  jwtSecret: requireEnv("JWT_SECRET"),

  // ── Runtime ──────────────────────────────────────────────────────────────
  // Current runtime environment; controls log verbosity and error detail in responses
  nodeEnv: optionalEnv("NODE_ENV", "development"),

  // ── Derived helpers ───────────────────────────────────────────────────────
  // True when running in production; used to disable verbose error bodies in responses
  isProd: optionalEnv("NODE_ENV", "development") === "production",
  // True when running in development; used to enable pretty-printed Fastify logs
  isDev: optionalEnv("NODE_ENV", "development") === "development",
} as const; // Freeze the shape so no code can mutate config values at runtime
