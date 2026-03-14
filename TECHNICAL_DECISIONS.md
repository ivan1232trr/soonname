# CityPulse — Technical Decisions

**Version:** 1.1
**Status:** Active
**Date:** March 2026
**Purpose:** Records architectural and technology decisions that shape how this product is built. Every entry explains what was chosen, why, and what rules follow from that choice.

This document is the authoritative record of decisions that are not obvious from the code itself. Developers must read the relevant section before working on any feature area covered here.

---

## Decision Index

| # | Area | Decision | Status |
|---|---|---|---|
| TD-001 | Geospatial / Maps | Use Uber H3 hexagonal geospatial indexing | Confirmed |
| TD-002 | Infrastructure / Hosting | Hetzner dedicated/cloud server | Confirmed |
| TD-003 | Deployment | Coolify self-hosted PaaS on Hetzner | Confirmed |
| TD-004 | Primary Database | PostgreSQL with Prisma ORM | Confirmed |
| TD-005 | Caching Layer | Redis | Confirmed |
| TD-006 | Media / Object Storage | MinIO or Garage (S3-compatible, self-hosted) | Decision pending — one to be selected |

---

## TD-001 — Geospatial Indexing: Uber H3

**Date:** March 2026
**Status:** Confirmed
**Applies to:** Map view, event storage, proximity queries, feed ranking distance penalty, pin clustering

---

### What Was Decided

CityPulse will use **Uber's H3 hexagonal hierarchical geospatial indexing system** as the foundation for all location-based operations. Every event stored in the database will be assigned one or more H3 cell indexes. All proximity lookups, distance scoring, map clustering, and area-based queries will be performed against H3 indexes rather than raw latitude/longitude arithmetic.

H3 is open source (Apache 2.0). Official repository: [github.com/uber/h3](https://github.com/uber/h3).

---

### What H3 Is

H3 divides the entire surface of the Earth into a hierarchy of hexagonal cells at 16 resolution levels (0 = continent-scale, 15 = ~1 square centimeter). Each cell has a unique 64-bit integer identifier.

Key properties relevant to CityPulse:

| Property | Relevance |
|---|---|
| **Hexagonal cells** | Hexagons have equal distance from center to all six neighbors. This eliminates the directional bias present in square grid systems and makes "nearby" queries uniform in all directions. |
| **Hierarchical resolutions** | A cell at resolution 7 (~5 km²) contains cells at resolution 8 (~0.7 km²), which contain cells at resolution 9 (~0.1 km²). This hierarchy is used to zoom between city-level and street-level precision. |
| **Parent/child relationships** | Any cell can be compacted to its parent or expanded to its children. This is used to build the clustering system on the map view. |
| **Ring and disk queries** | H3 can return all cells within N rings of a target cell in constant time, regardless of resolution. This replaces radius queries that would otherwise require a bounding box + distance filter. |
| **Compact cell sets** | A geographic region (e.g. a city boundary) can be represented as a minimal set of H3 cells. These can be stored and indexed efficiently in the database. |

---

### Why H3 Was Chosen

**Over raw lat/lng arithmetic:**
- Radius queries using `ST_DWithin` or Haversine distance on raw coordinates require either a geospatial database extension (PostGIS) or expensive per-row calculations. H3 index lookups are integer comparisons.
- H3 cells can be indexed with a standard B-tree database index. No specialized geospatial index type is required to get fast proximity queries.

**Over Geohash:**
- Geohash uses rectangular cells. Rectangle neighbors are inconsistent in distance — diagonal neighbors are farther than edge neighbors. H3 hexagons are equidistant.
- Geohash boundary artifacts cause events near a cell edge to be missed by a query targeting the adjacent cell. H3's hierarchical compaction handles this more cleanly.

**Over S2 (Google):**
- S2 uses spherical geometry with square cells projected onto a cube. Accurate but significantly more complex to reason about and implement.
- H3 has first-class JavaScript/TypeScript and Python bindings, matching CityPulse's planned stack.
- H3 is purpose-built for application-layer geospatial indexing, not just geometry operations.

**For this product specifically:**
- The map clustering feature (grouping nearby pins at low zoom) maps directly to H3's parent cell hierarchy — no separate clustering algorithm is needed.
- The feed ranking distance penalty (events further away score lower) becomes a ring-distance lookup: how many H3 rings away is the event's cell from the user's cell? Integer arithmetic, no trigonometry.
- Future features (neighborhood-level filtering, heatmaps of activity, area-based notifications) are natural extensions of the H3 model with no schema changes.

---

### Resolution Levels Used in CityPulse

CityPulse will use three H3 resolution levels, each serving a distinct purpose:

| Resolution | Approx. Cell Area | Use in CityPulse |
|---|---|---|
| **7** | ~5.16 km² | City-level clustering on the map at low zoom. A city of 500,000 people covers roughly 50–200 cells at this resolution. Used to show density heatmap layers (future). |
| **9** | ~0.105 km² | Neighborhood-level proximity. The primary resolution for feed distance scoring. "Is this event near me?" is answered at resolution 9. |
| **11** | ~0.000895 km² (~895 m²) | Venue/street-level precision. Used to place the event pin on the map accurately. Stored alongside the event's raw lat/lng for display. |

**Rule:** When an event is submitted, all three resolution indexes (r7, r9, r11) are computed from the event's lat/lng and stored in the database at write time. Queries never compute H3 indexes on the fly from raw coordinates.

---

### Data Model Rules

These rules govern how H3 is integrated into the database schema. They are requirements, not suggestions.

**R1 — Every event stores three H3 cell indexes.**
The events table must include columns for `h3_r7`, `h3_r9`, and `h3_r11`. These are populated by the backend at event creation time. They are never null on a saved event.

**R2 — H3 indexes are stored as strings, not integers.**
H3 cell IDs are 64-bit integers, which exceed safe integer limits in JavaScript. They are stored and transmitted as hexadecimal strings (e.g. `"872830828ffffff"`). All application code treats them as opaque string identifiers.

**R3 — Raw lat/lng is always stored alongside H3 indexes.**
H3 is used for indexing and querying. The raw `latitude` and `longitude` (floating point) are always stored and used for: accurate pin placement on the map, display in the event detail view, and fallback if H3 resolution changes in the future.

**R4 — Database indexes must exist on h3_r9 and h3_r7.**
Proximity queries at the feed level run against `h3_r9`. Clustering queries run against `h3_r7`. Both columns require a standard B-tree index. `h3_r11` is used for display only and does not need a query index.

**R5 — The user's current H3 cell is computed at query time, not stored.**
The user's location (or their selected city center) is converted to an H3 cell index at the moment a feed or map query runs. It is not stored in the user profile. This prevents stale location data from affecting rankings.

---

### Query Patterns

The following query patterns are the only approved ways to perform location-based lookups. Ad hoc lat/lng distance calculations in application code are not permitted.

**Pattern 1 — Feed proximity query (resolution 9)**
To find all events near a user, compute the user's H3 cell at resolution 9, then query for events whose `h3_r9` value is within K rings of that cell.

```
userCell = h3.latLngToCell(userLat, userLng, resolution=9)
nearbyCells = h3.gridDisk(userCell, k=3)  // returns all cells within 3 rings (~1km radius)
events = db.query("SELECT * FROM events WHERE h3_r9 IN (?)", nearbyCells)
```

Ring radius guide at resolution 9:

| Rings (k) | Approx. Radius |
|---|---|
| 1 | ~350m |
| 2 | ~700m |
| 3 | ~1.05km |
| 5 | ~1.75km |
| 10 | ~3.5km |

**Pattern 2 — Distance penalty in ranking (resolution 9)**
The number of H3 rings between the user's cell and an event's cell is the distance input to the ranking engine's distance penalty. Do not compute physical distance in kilometers; use ring distance.

```
ringDistance = h3.gridDistance(userCell, event.h3_r9)
distancePenalty = ringDistance * PENALTY_PER_RING
```

**Pattern 3 — Map clustering (resolution 7)**
To build the clustered pin view, group events by their `h3_r7` value. Events sharing an `h3_r7` cell are in the same cluster at low zoom.

```
clusters = groupBy(events, event => event.h3_r7)
// each cluster renders as one numbered pin on the map at low zoom
```

**Pattern 4 — Zoom-level clustering (resolution transition)**
As the user zooms in on the map:
- Zoom level < 11: cluster by `h3_r7`
- Zoom level 11–13: cluster by `h3_r9`
- Zoom level > 13: show individual pins using `h3_r11` / raw lat/lng

This eliminates the need for a separate client-side clustering library.

---

### What H3 Does Not Handle

H3 is a spatial indexing tool. It does not replace:

| Concern | Handled By |
|---|---|
| Rendering maps and tiles | Map provider (TBD: Mapbox, Google Maps, or MapLibre) |
| Routing or directions | Not in MVP scope |
| Reverse geocoding (lat/lng → address) | Map provider geocoding API |
| City boundary definitions | Stored separately as a bounding polygon or set of H3 cells per city |
| Address search / autocomplete | Map provider places API |

---

### Dependencies

When development begins, the following libraries will be evaluated for the H3 integration:

| Environment | Library | Notes |
|---|---|---|
| JavaScript / TypeScript (server) | `h3-js` | Official Uber JS port. Full resolution support. |
| JavaScript / TypeScript (client) | `h3-js` | Same library, works in browser. Consider bundle size impact. |
| Python (if used for AI/data pipeline) | `h3` (PyPI) | Official Python bindings. |
| Database (if native support needed) | `h3-pg` (PostgreSQL extension) | Allows H3 operations inside SQL queries. Evaluate if needed. |

No library is pinned yet. Library selection and version locking happens at project scaffold time.

---

### Open Questions

| Question | Impact |
|---|---|
| What radius (in rings at r9) defines "nearby" for the default feed query? | Affects how many events a user in a dense vs. sparse area sees |
| Should the city boundary be stored as a compact H3 cell set? | Affects how city-scoping queries are written |
| Is `h3-pg` needed, or will all H3 operations run in application code? | Affects database setup complexity |
| How do we handle events with imprecise locations (e.g. "Downtown")? | May need a geocoding step before H3 indexing |

---

---

## TD-002 — Infrastructure / Hosting: Hetzner

**Date:** March 2026
**Status:** Confirmed
**Applies to:** All production and staging environments

### What Was Decided

CityPulse's production infrastructure runs on **Hetzner** servers. Hetzner is a German cloud and dedicated server provider with data centers in Europe and the US.

### Why Hetzner

- Significantly lower cost per CPU/RAM/storage than AWS, GCP, or Azure for equivalent specs — important at the early stage where infrastructure costs must stay lean.
- Hetzner dedicated and cloud (CCX) servers offer predictable pricing with no egress fees between servers in the same data center.
- Strong reputation for reliability and uptime among self-hosted infrastructure operators.
- Compatible with Coolify (TD-003), which is the deployment layer running on top of it.
- Data residency in Europe supports GDPR compliance posture.

### Rules

**R1 — All production services run on Hetzner.** No production workloads are deployed to other cloud providers without a documented decision update.

**R2 — Server sizing is reviewed before launch.** The initial server spec is chosen based on projected MVP load. A resize or additional node plan must be documented before the product goes public.

**R3 — Hetzner Firewall rules are configured at the server level.** No server port is open to the public internet unless explicitly required. All service-to-service communication stays on the private network.

**R4 — Backups are enabled on all Hetzner volumes** containing database data. Hetzner's built-in snapshot/backup feature is the minimum baseline; additional backup strategy is defined alongside the database decision (TD-004).

### Open Questions

| Question | Impact |
|---|---|
| Which Hetzner region? (Falkenstein, Nuremberg, Helsinki, Ashburn) | Affects latency for the launch city's users |
| Dedicated server or Hetzner Cloud (CCX)? | Dedicated = better price/performance at scale; Cloud = easier to resize |
| How many servers at launch? (single node vs. separate DB node) | Affects Coolify setup and backup strategy |

---

## TD-003 — Deployment: Coolify

**Date:** March 2026
**Status:** Confirmed
**Applies to:** All service deployments, environment management, CI/CD

### What Was Decided

**Coolify** is the self-hosted Platform-as-a-Service layer used to deploy, manage, and monitor all CityPulse services on the Hetzner server. Coolify runs on the Hetzner server and manages the lifecycle of all application containers.

Coolify is open source (Apache 2.0). It provides a Heroku/Render-like experience on self-hosted infrastructure.

### What Coolify Manages

| Concern | How Coolify Handles It |
|---|---|
| Application deployment | Git-connected deployments. Push to a branch triggers a build and deploy. |
| Environment variables | Managed per-service through the Coolify UI. Never committed to the repository. |
| SSL / HTTPS | Automatic Let's Encrypt certificate provisioning and renewal. |
| Reverse proxy | Traefik-based routing. No manual nginx config required. |
| Service orchestration | Docker Compose or standalone container deployment per service. |
| Database management | Coolify can provision and manage PostgreSQL and Redis instances directly. |
| Logs | Centralized log viewing per service in the Coolify UI. |

### Rules

**R1 — All environment variables are set in Coolify, never in committed files.** `.env` files must not be committed to the repository under any circumstances. The repository contains `.env.example` with keys and no values.

**R2 — Every environment (production, staging) is a separate Coolify project.** Staging and production must never share environment variables, databases, or services.

**R3 — Deployments to production require a passing build on staging first.** The deploy pipeline is: merge to `main` → auto-deploy to staging → manual promote to production. Direct deploys to production without staging validation are not permitted except in documented emergencies.

**R4 — No SSH access to the server for routine operations.** Deployments, log access, environment variable changes, and service restarts all happen through the Coolify UI or API. SSH is reserved for infrastructure emergencies only.

**R5 — Coolify itself must be pinned to a specific version.** Auto-updates on the Coolify instance are disabled. Updates are applied deliberately, reviewed against the changelog, and applied to a staging environment first.

### Open Questions

| Question | Impact |
|---|---|
| Will Coolify manage the PostgreSQL and Redis instances, or will those run as separate manually-configured containers? | Affects backup control and upgrade paths for databases |
| What is the staging environment setup? (separate Hetzner server or isolated project on the same server?) | Cost vs. isolation trade-off |

---

## TD-004 — Primary Database: PostgreSQL + Prisma

**Date:** March 2026
**Status:** Confirmed
**Applies to:** All persistent application data — events, users, profiles, tags

### What Was Decided

**PostgreSQL** is the primary relational database. **Prisma** is the ORM used for all database access from the application layer. No raw SQL queries are written in application code unless Prisma cannot express the operation.

### Why PostgreSQL

- Relational model fits the CityPulse data: events have tags, users have profiles, profiles relate to interaction history. Foreign keys and joins are the right tool.
- Full-text search (for the event search feature) is built into PostgreSQL via `tsvector` / `tsquery`. No separate search service is needed in MVP.
- H3 indexes (TD-001) are stored as indexed text columns — PostgreSQL handles this efficiently with a standard B-tree index.
- Widely supported by Coolify for managed provisioning and backup.
- Prisma has first-class PostgreSQL support.

### Why Prisma

- Type-safe database client — all queries return typed objects matching the schema. No runtime type mismatches between the database and application layer.
- Schema-as-code via `schema.prisma` — the database schema lives in the repository and is version-controlled. Migrations are generated and tracked automatically.
- Prisma Migrate handles schema evolution without manual SQL migration files.
- Prisma Studio provides a visual database browser during development.

### Rules

**R1 — The Prisma schema is the single source of truth for the database structure.** Database schema changes are made by editing `schema.prisma` and running `prisma migrate`. Direct DDL changes to the database (ALTER TABLE, etc.) outside of Prisma migrations are not permitted.

**R2 — All database access in application code goes through the Prisma client.** Raw SQL via `prisma.$queryRaw` is permitted only when a query cannot be expressed in Prisma's query API, and must be documented with a comment explaining why raw SQL was necessary.

**R3 — The Prisma client is instantiated once and shared.** A single Prisma client instance is created at application startup and exported. It is not instantiated per-request.

**R4 — Migrations are never run manually in production.** Production migrations run as part of the deployment pipeline (a `prisma migrate deploy` step before the application starts). Ad hoc migrations run directly against the production database are not permitted.

**R5 — The production database is never accessed directly by developer machines.** All development and debugging uses local or staging databases. Production database access requires a documented incident reason and Coolify-managed tunnel.

**R6 — H3 index columns (h3_r7, h3_r9, h3_r11) are defined in the Prisma schema as `String` type** with `@db.VarChar(15)`. Database-level indexes on `h3_r7` and `h3_r9` are applied via `@@index` in the schema.

**R7 — Daily automated backups are required on the production database.** Backup strategy (Hetzner snapshots, pg_dump via Coolify, or a dedicated backup tool) is confirmed before the production environment is created.

### Core Schema Areas (to be detailed at implementation time)

| Model | Purpose |
|---|---|
| `Event` | Core event record including title, description, location, lat/lng, H3 indexes, category, tags, date/time, submitter |
| `User` | Account record with city, display name, vibe preference, time preferences |
| `UserProfile` | AI tag profile — weighted interest tags, updated by behavioral signals |
| `UserInteraction` | Log of click, skip, and Interested signals — input to the ranking engine |
| `Tag` | Tag taxonomy table — canonical list of all tags used by the AI classifier |
| `City` | City records with name, center lat/lng, and bounding H3 cell set |

---

## TD-005 — Caching Layer: Redis

**Date:** March 2026
**Status:** Confirmed
**Applies to:** Feed ranking results, session data, rate limiting, AI classification job queue

### What Was Decided

**Redis** is the in-memory data store used for caching, session management, rate limiting, and as the job queue backend for background AI processing tasks.

### What Redis Is Used For

| Use Case | Details |
|---|---|
| **Feed cache** | Ranked event feed results are cached per user (keyed by user ID + city + filter state). Cache TTL is short (2–5 minutes) to ensure new events appear promptly. |
| **Session / auth tokens** | User session tokens are stored in Redis with an expiry matching the session lifetime. This allows instant session revocation. |
| **Rate limiting** | Event submission rate limits (to prevent spam) are tracked in Redis using a sliding window counter per user ID. |
| **AI classifier job queue** | When an event is submitted, the AI classification task is pushed to a Redis-backed queue (e.g. BullMQ). The worker process pulls from this queue and updates the event record when classification completes. |
| **H3 cell → events index** | Frequently queried H3 cells (high-traffic city areas) may have their event lists cached in Redis to avoid repeated database hits during peak load. Evaluated at scale, not a day-one requirement. |

### Rules

**R1 — Redis is a cache and queue, not a database.** No data that cannot be reconstructed from PostgreSQL is stored only in Redis. If Redis is flushed or restarted, the application must continue to function correctly (with degraded performance, not data loss).

**R2 — All Redis keys use a namespaced prefix.** Key format: `citypulse:{environment}:{service}:{identifier}`. Example: `citypulse:prod:feed:user_abc123`. This prevents key collisions if multiple services share a Redis instance.

**R3 — Every Redis key that is set must have an explicit TTL.** Keys without expiry are not permitted. The TTL must be defined in a central configuration file, not hardcoded at the call site.

**R4 — Sensitive data is not stored in Redis without encryption.** Session tokens may be stored as opaque identifiers. User PII (name, email, behavioral data) is not stored in Redis.

**R5 — The AI job queue (Redis-backed) is the only permitted mechanism for triggering background AI work.** Direct synchronous calls to the AI classifier from the HTTP request path are not permitted in production — they block the request and make the API brittle.

### Open Questions

| Question | Impact |
|---|---|
| Is Redis provisioned by Coolify or as a separate container? | Affects operational setup |
| Is a single Redis instance shared between feed cache, sessions, and the job queue, or are they separated? | Single instance is simpler; separation allows independent scaling and tuning |
| What is the feed cache TTL? | Too long = stale feed; too short = high DB load |

---

## TD-006 — Media / Object Storage: MinIO or Garage

**Date:** March 2026
**Status:** Decision pending — MinIO or Garage to be selected before implementation

**Applies to:** Any user-uploaded media (event images if supported), AI-generated assets, exports

### What Was Decided

All binary media files are stored in a **self-hosted S3-compatible object storage system** running on the Hetzner server, managed by Coolify. Two candidates are being evaluated:

| Candidate | Description |
|---|---|
| **MinIO** | High-performance S3-compatible object storage. Single-node or distributed. Widely used, mature, excellent documentation, strong ecosystem. |
| **Garage** | Lightweight distributed object storage designed for geo-distributed self-hosted setups. Lower resource footprint than MinIO. Simpler operationally for a single-node setup. |

Both are S3-compatible. Application code interacts with the storage layer via the **S3 API** regardless of which is chosen. The choice between MinIO and Garage is an operational decision and does not affect application code.

### Why Self-Hosted Object Storage

- Avoids per-GB egress and storage fees from AWS S3 or Cloudflare R2.
- All data stays on the Hetzner server — consistent with the self-hosted infrastructure posture.
- S3-compatible API means the application is not locked to either tool. Switching between MinIO and Garage, or to a hosted S3-compatible provider in the future, requires only a configuration change.

### Rules (apply regardless of which tool is chosen)

**R1 — The application interacts with object storage exclusively through the S3 API.** No tool-specific SDK or admin API is used in application code. Use an S3-compatible client library (e.g. `@aws-sdk/client-s3` configured with a custom endpoint).

**R2 — Media files are never served directly from the storage origin.** All media URLs served to clients go through a CDN or reverse proxy layer. Direct storage bucket URLs are not exposed publicly.

**R3 — Uploaded files are validated before storage.** File type, size limits, and content safety checks run before a file is written to the bucket. The bucket itself is not a trust boundary.

**R4 — Buckets are private by default.** No bucket has public read access. Pre-signed URLs are used to grant time-limited read access to specific objects.

**R5 — Storage is scoped to the features that need it.** In MVP, event images are not in scope per the PRD. Object storage is provisioned but may not be actively used until a feature requires it. Do not store data in object storage that belongs in PostgreSQL.

### Decision Criteria for MinIO vs. Garage

The following will determine the final choice:

| Factor | MinIO | Garage |
|---|---|---|
| Resource usage on a single node | Higher | Lower |
| Operational maturity | Very high | Moderate |
| Coolify integration | Well-documented | Less common |
| Multi-node / future scaling | Strong | Designed for it |
| Community & documentation | Large | Smaller but active |

**This decision must be made and this entry updated before the infrastructure setup phase begins.**

---

*CityPulse Technical Decisions v1.1 — March 2026 — Confidential*
*This document must be updated whenever a covered decision is revised or a new architectural decision is made.*
