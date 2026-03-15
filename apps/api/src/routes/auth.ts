// AI-GENERATED
// Tool: Claude (claude-sonnet-4-6)
// Date: 2026-03-14
// Prompt summary: Fastify route plugin implementing POST /auth/register and POST /auth/login with JWT + Redis sessions
// Reviewed by: unreviewed

// ── Imports ───────────────────────────────────────────────────────────────────

// Fastify types for the plugin, request, and reply objects
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
// Zod for runtime request body validation with typed parse results
import { z } from "zod";
// Password hashing utilities and session key builder
import { hashPassword, verifyPassword, generateJti, sessionKey, SESSION_TTL_SECONDS } from "../lib/auth.js";

// ── Validation schemas ────────────────────────────────────────────────────────

/**
 * Zod schema for the POST /auth/register request body.
 * Validates email format, password length, and display name.
 */
// Validate registration payloads before touching the database
const registerBodySchema = z.object({
  // Email must be a valid format; stored uniquely and used as the login identifier
  email: z.string().email("Must be a valid email address"),
  // Password minimum of 8 characters; the hash is stored, not the plaintext
  password: z.string().min(8, "Password must be at least 8 characters"),
  // Display name must be at least 2 characters to avoid trivially empty names
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be 100 characters or fewer"),
});

/**
 * Zod schema for the POST /auth/login request body.
 * Validates that both fields are non-empty strings.
 */
// Validate login payloads before querying the database
const loginBodySchema = z.object({
  // Email of the account to authenticate
  email: z.string().email("Must be a valid email address"),
  // Plaintext password to compare against the stored hash
  password: z.string().min(1, "Password is required"),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Parses and validates a request body against a Zod schema.
 * Returns the typed data on success or sends a 400 response and returns null.
 *
 * @param schema - The Zod schema to validate against
 * @param body   - The raw request body from Fastify
 * @param reply  - Used to send a 400 response if validation fails
 * @returns      - The typed parsed data, or null if validation failed
 * @sideEffects  - Sends a 400 reply if validation fails
 */
async function parseBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown,
  reply: FastifyReply
): Promise<T | null> {
  // Run Zod's safe parse so we get an error object rather than a thrown exception
  const result = schema.safeParse(body);
  // If validation failed, format the errors and send a 400 response
  if (!result.success) {
    // Map Zod errors to a consistent field/message format matching the rest of the API
    const details = result.error.errors.map((e) => ({
      // JSON path to the invalid field (e.g. "email")
      field: e.path.join("."),
      // Human-readable description of why the field is invalid
      message: e.message,
    }));
    // Send the structured 400 response so the client can show field-level feedback
    await reply.status(400).send({ error: "Validation failed", details });
    // Return null to signal to the caller that a response has already been sent
    return null;
  }
  // Return the fully validated and typed data for use in the route handler
  return result.data;
}

// ── Route plugin ──────────────────────────────────────────────────────────────

/**
 * Registers POST /auth/register and POST /auth/login on the provided Fastify instance.
 *
 * POST /auth/register: creates a new User, stores a hashed password, issues a JWT, stores the session in Redis.
 * POST /auth/login: verifies credentials, issues a JWT, stores the session in Redis.
 *
 * @param fastify - The Fastify server instance (must have prisma, redis, and auth plugins registered)
 * @returns       - A Promise that resolves once both routes are registered
 * @sideEffects   - Writes to the PostgreSQL users table; writes session keys to Redis
 */
export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // ── POST /auth/register ───────────────────────────────────────────────────

  fastify.post(
    "/auth/register",
    // Handler: validate body, hash password, create user, issue JWT
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Parse and validate the request body; returns null and sends 400 if invalid
      const body = await parseBody(registerBodySchema, request.body, reply);
      // If validation failed, parseBody already sent the response — return early
      if (body === null) return;

      // Hash the password before any database operations so plaintext never touches the DB
      const passwordHash = await hashPassword(body.password);

      // Wrap the database write in try/catch to handle unique email conflicts gracefully
      let user;
      try {
        // Insert the new user record with the hashed password
        user = await fastify.prisma.user.create({
          data: {
            // Store the email in lowercase to normalise comparisons at login time
            email: body.email.toLowerCase(),
            // Store the display name as entered by the user
            name: body.name,
            // Store only the bcrypt hash; the plaintext password is never written to the DB
            passwordHash,
          },
          // Select only the public fields for the response; exclude passwordHash
          select: {
            // User UUID included in the JWT payload and returned to the client
            id: true,
            // Email returned so the client can display the current account's email
            email: true,
            // Display name returned for the profile screen
            name: true,
            // Timestamps included to match the IUser interface
            createdAt: true,
            // Timestamp of the most recent account update
            updatedAt: true,
          },
        });
      } catch (error: unknown) {
        // Check if the error is a Prisma unique constraint violation (email already registered)
        const prismaError = error as { code?: string };
        if (prismaError.code === "P2002") {
          // Return 409 Conflict so the client can show "email already in use" feedback
          return reply.status(409).send({ error: "Email already registered" });
        }
        // For any other error, log it and return a generic 500
        fastify.log.error({ error }, "Failed to create user");
        return reply.status(500).send({ error: "Registration failed" });
      }

      // Generate a unique JWT ID for this session so it can be individually revoked
      const jti = generateJti();

      // Sign the JWT with the user's ID and the unique session identifier
      const token = fastify.jwt.sign({ userId: user.id, jti });

      // Store the session in Redis with the configured TTL for revocation support
      const key = sessionKey(jti);
      // The value is the userId; used in the authenticate preHandler to confirm the session is valid
      await fastify.redis.set(key, user.id, "EX", SESSION_TTL_SECONDS);

      // Return 201 Created with the token and public user data
      return reply.status(201).send({ token, user });
    }
  );

  // ── POST /auth/login ──────────────────────────────────────────────────────

  fastify.post(
    "/auth/login",
    // Handler: validate body, verify credentials, issue JWT
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Parse and validate the request body
      const body = await parseBody(loginBodySchema, request.body, reply);
      // Return early if validation failed (response already sent)
      if (body === null) return;

      // Look up the user by email; normalise to lowercase to match stored emails
      const user = await fastify.prisma.user.findUnique({
        // Match on the normalised email address
        where: { email: body.email.toLowerCase() },
        // Select the password hash so we can verify it; include public fields for the response
        select: {
          // UUID needed in the JWT payload
          id: true,
          // Email returned to the client in the auth response
          email: true,
          // Display name returned to the client
          name: true,
          // Password hash used for credential verification; not sent in the response
          passwordHash: true,
          // Timestamps for the IUser response shape
          createdAt: true,
          // Timestamp of last account update
          updatedAt: true,
        },
      });

      // If no user exists with this email, return 401 with a generic message
      // Using the same message for wrong email and wrong password prevents user enumeration
      if (user === null) {
        // Generic 401 so attackers cannot determine whether the email is registered
        return reply.status(401).send({ error: "Invalid email or password" });
      }

      // Compare the submitted plaintext password against the stored bcrypt hash
      const passwordValid = await verifyPassword(body.password, user.passwordHash);

      // If the password does not match, return 401 with the same generic message
      if (!passwordValid) {
        // Same message as the "user not found" case to prevent user enumeration
        return reply.status(401).send({ error: "Invalid email or password" });
      }

      // Generate a fresh JWT ID for this new session
      const jti = generateJti();

      // Sign the JWT with the user ID and session identifier
      const token = fastify.jwt.sign({ userId: user.id, jti });

      // Store the new session in Redis so it can be revoked on logout
      const key = sessionKey(jti);
      // Value is the userId; confirms which user this session belongs to during auth checks
      await fastify.redis.set(key, user.id, "EX", SESSION_TTL_SECONDS);

      // Build the response user object without the password hash
      const { passwordHash: _hash, ...publicUser } = user;
      // Suppress the unused variable warning; the destructure is intentional to exclude the hash
      void _hash;

      // Return 200 with the token and public user data
      return reply.status(200).send({ token, user: publicUser });
    }
  );

  // ── POST /auth/logout ─────────────────────────────────────────────────────

  fastify.post(
    "/auth/logout",
    // Require authentication so we know which session to revoke
    { preHandler: [fastify.authenticate] },
    // Handler: delete the session key from Redis so the JWT is immediately invalid
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Build the Redis key for the current session using the jti from the verified JWT
      const key = sessionKey(request.user.jti);
      // Delete the session key; subsequent requests with this token will get 401
      await fastify.redis.del(key);
      // Return 204 No Content — standard response for a successful logout with no body
      return reply.status(204).send();
    }
  );
}
