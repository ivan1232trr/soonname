// AI-GENERATED
// Tool: Claude (claude-sonnet-4-6)
// Date: 2026-03-14
// Prompt summary: password hashing utilities and Redis session key helpers for CityPulse auth
// Reviewed by: unreviewed

// ── Imports ───────────────────────────────────────────────────────────────────

// bcryptjs provides pure-JS password hashing; no native binaries required
import bcrypt from "bcryptjs";
// Node.js crypto module used to generate a random UUID for the JWT ID (jti claim)
import { randomUUID } from "node:crypto";
// Validated config; provides the NODE_ENV string used to namespace Redis keys
import { config } from "../config.js";

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * bcrypt cost factor (work factor).
 * 12 rounds is the recommended minimum for 2024+; increases hashing time to ~250ms.
 * Higher values slow brute-force attacks proportionally.
 */
// 12 rounds balances security and registration latency; raise to 13-14 for higher-value accounts
const BCRYPT_ROUNDS = 12;

/**
 * JWT session TTL in seconds.
 * Tokens expire after 7 days; matching TTL is set on the Redis session key.
 * Increasing this value requires a corresponding change to the JWT expiresIn option in auth.ts plugin.
 */
// 7 days expressed in seconds; used as the Redis key TTL and matches the JWT exp claim
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

// ── Password utilities ────────────────────────────────────────────────────────

/**
 * Hashes a plaintext password using bcrypt.
 * The result is stored in User.passwordHash; the plaintext is discarded immediately.
 *
 * @param password - Plaintext password string from the registration request body
 * @returns        - A Promise resolving to the bcrypt hash string (60 chars)
 * @sideEffects    - CPU-intensive for the configured number of rounds; no I/O
 */
export async function hashPassword(password: string): Promise<string> {
  // Hash the password with the configured cost factor; bcrypt includes a random salt automatically
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Compares a plaintext password against a stored bcrypt hash.
 * Used during login to verify the supplied password matches the stored hash.
 *
 * @param password - Plaintext password from the login request body
 * @param hash     - The bcrypt hash stored in User.passwordHash
 * @returns        - A Promise resolving to true if the password matches, false otherwise
 * @sideEffects    - CPU-intensive; no I/O
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // bcrypt.compare extracts the salt from the hash and re-hashes the password for comparison
  return bcrypt.compare(password, hash);
}

// ── Session utilities ─────────────────────────────────────────────────────────

/**
 * Generates a new UUID to use as the JWT ID (jti claim).
 * Each login gets a unique jti so individual sessions can be revoked by deleting
 * the corresponding Redis key without invalidating all other sessions for the same user.
 *
 * @returns - A random UUID string (e.g. "550e8400-e29b-41d4-a716-446655440000")
 * @sideEffects - None; uses the Node.js crypto module's random number generator
 */
export function generateJti(): string {
  // randomUUID uses the OS CSPRNG; safe for use as a cryptographic token identifier
  return randomUUID();
}

/**
 * Builds the namespaced Redis key used to store and look up a session by its JWT ID.
 * Following the key format from TD-005 R2: citypulse:{environment}:{service}:{identifier}
 *
 * @param jti - The JWT ID (jti claim) uniquely identifying this session
 * @returns   - The Redis key string (e.g. "citypulse:development:session:abc123")
 * @sideEffects - None; pure string construction
 */
export function sessionKey(jti: string): string {
  // Prefix with environment so development and production sessions never collide on a shared Redis
  return `citypulse:${config.nodeEnv}:session:${jti}`;
}
