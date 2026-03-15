// AI-GENERATED
// Tool: Claude (claude-sonnet-4-6)
// Date: 2026-03-14
// Prompt summary: Fastify server entry point that wires plugins, routes, and starts listening
// Reviewed by: unreviewed

// ── Imports ───────────────────────────────────────────────────────────────────

// Node.js process module used for graceful shutdown signal handling
import process from "node:process";
// Fastify factory function; creates the core HTTP server instance
import Fastify from "fastify";
// CORS plugin: allows the Next.js web app on a different port to call this API
import cors from "@fastify/cors";
// Prisma plugin: registers the database client on the Fastify instance
import prismaPlugin from "./plugins/prisma.js";
// Redis plugin: registers the Redis client on the Fastify instance
import redisPlugin from "./plugins/redis.js";
// Auth plugin: registers JWT verification and Redis-backed session checks
import authPlugin from "./plugins/auth.js";
// Auth routes: register/login/logout
import { authRoutes } from "./routes/auth.js";
// User/account routes
import { userRoutes } from "./routes/users.js";
// Public city catalogue routes
import { cityRoutes } from "./routes/cities.js";
// Public tag taxonomy routes
import { tagRoutes } from "./routes/tags.js";
// Interaction recording routes
import { interactionRoutes } from "./routes/interactions.js";
// Health route: GET /health liveness endpoint
import { healthRoutes } from "./routes/health.js";
// Events routes: GET /events and POST /events
import { eventRoutes } from "./routes/events.js";
// Announcement routes: GET /announcements
import { announcementRoutes } from "./routes/announcements.js";
// Validated config: port, host, and environment flags
import { config } from "./config.js";
// Classifier worker bootstraps the queue consumer inside the API process
import { startClassifierWorker } from "./workers/classifier.js";

// ── Server factory ────────────────────────────────────────────────────────────

/**
 * Builds and configures the Fastify server instance.
 * Registers plugins and routes without starting the listener.
 * Separating build from start enables easier integration testing.
 *
 * @returns - A configured FastifyInstance ready to call listen()
 * @sideEffects - Connects to PostgreSQL (via prismaPlugin) and Redis (via redisPlugin)
 */
async function buildServer() {
  const allowedOrigins =
    config.corsOrigin === "*"
      ? true
      : config.corsOrigin
          .split(",")
          .map((origin) => origin.trim())
          .filter((origin) => origin !== "");

  // Create the Fastify instance with appropriate logger settings for the environment
  const fastify = Fastify({
    // Use pretty-printed logs in development for human readability; JSON in production for log aggregators
    logger: config.isDev
      ? { transport: { target: "pino-pretty", options: { colorize: true } } }
      : true,
  });

  // ── Plugins ───────────────────────────────────────────────────────────────

  // Register CORS before any routes so preflight requests are handled globally
  await fastify.register(cors, {
    // Allow requests from the configured web origins; "*" is useful for local development
    origin: allowedOrigins,
    // Permit the HTTP methods used by the event routes
    methods: ["GET", "POST", "PUT", "OPTIONS"],
  });

  // Register the Prisma plugin; this opens the DB connection pool at startup
  await fastify.register(prismaPlugin);

  // Register the Redis plugin; this opens the Redis TCP connection at startup
  await fastify.register(redisPlugin);
  // Register auth after Redis so protected routes can verify JWTs and session revocation
  await fastify.register(authPlugin);

  // ── Routes ────────────────────────────────────────────────────────────────

  // Register the /health endpoint; no prefix so it is reachable at the root
  await fastify.register(healthRoutes);

  // Register the /events endpoints; prefix with /api/v1 for versioning
  await fastify.register(authRoutes, { prefix: "/api/v1" });
  await fastify.register(userRoutes, { prefix: "/api/v1" });
  await fastify.register(cityRoutes, { prefix: "/api/v1" });
  await fastify.register(tagRoutes, { prefix: "/api/v1" });
  await fastify.register(eventRoutes, { prefix: "/api/v1" });
  await fastify.register(interactionRoutes, { prefix: "/api/v1" });
  await fastify.register(announcementRoutes, { prefix: "/api/v1" });

  // Return the fully configured server so the caller can invoke listen()
  return fastify;
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

/**
 * Entry point: builds the server, starts listening, and wires OS signal handlers.
 * Calls process.exit(1) if startup fails so the container orchestrator can restart.
 *
 * @returns - A Promise that resolves when the server is listening
 * @sideEffects - Binds a TCP port; registers SIGINT/SIGTERM handlers for graceful shutdown
 */
async function main(): Promise<void> {
  // Build the server instance with all plugins and routes registered
  const server = await buildServer();
  // Start the in-process classification worker only when Anthropic credentials are available
  const classifierWorker = config.hasAnthropicApiKey ? startClassifierWorker() : null;

  if (classifierWorker === null) {
    server.log.warn("ANTHROPIC_API_KEY not set; new events will skip AI classification");
  }

  // Wire graceful shutdown: when Kubernetes or the terminal sends SIGTERM, close cleanly
  const shutdown = async (signal: string): Promise<void> => {
    // Log which signal triggered the shutdown for debugging deployment issues
    server.log.info(`Received ${signal}; shutting down gracefully`);
    if (classifierWorker !== null) {
      await classifierWorker.close();
    }
    // Close the Fastify server: stops accepting new requests, drains in-flight ones
    await server.close();
    // Exit with 0 to signal a clean shutdown to the process manager
    process.exit(0);
  };

  // Register SIGTERM handler — sent by Docker/Kubernetes on container stop
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  // Register SIGINT handler — sent when the developer presses Ctrl+C in the terminal
  process.on("SIGINT", () => void shutdown("SIGINT"));

  // Start the HTTP listener on the configured host and port
  try {
    // listen() resolves with the address string once the server is bound
    const address = await server.listen({ port: config.port, host: config.host });
    // Log the bound address so developers know where to send requests
    server.log.info(`CityPulse API listening at ${address}`);
  } catch (error) {
    // Log the startup error before exiting so operators know what failed
    server.log.error(error, "Server failed to start");
    // Exit with code 1 so container orchestrators mark the pod as failed and restart it
    process.exit(1);
  }
}

// Invoke the entry point and attach a top-level rejection handler
// The void operator explicitly discards the Promise to satisfy ESLint's no-floating-promises rule
void main().catch((error: unknown) => {
  // Use console.error as the Fastify logger may not be initialised yet at this stage
  console.error("Unhandled startup error:", error);
  // Exit with 1 so the process manager knows something went wrong
  process.exit(1);
});
