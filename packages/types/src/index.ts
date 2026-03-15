// AI-GENERATED
// Tool: Claude (claude-sonnet-4-6)
// Date: 2026-03-14
// Prompt summary: shared TypeScript interfaces and enums matching the Prisma schema for CityPulse — added Vibe, TimeSlot, updated UserProfile
// Reviewed by: unreviewed

// ── Enums ──────────────────────────────────────────────────────────────────────

/**
 * Classifies the thematic category of an event.
 * Used by the AI classifier and as a filter in the feed query.
 *
 * @remarks Values must stay in sync with the EventCategory enum in prisma/schema.prisma.
 */
// Mirror of the Prisma EventCategory enum; used across API and web
export enum EventCategory {
  // Late-night bars, clubs, and social venues
  NIGHTLIFE = "NIGHTLIFE",
  // Competitive and recreational sporting events
  SPORTS = "SPORTS",
  // Workshops, lectures, seminars, and classes
  EDUCATION = "EDUCATION",
  // Restaurants, markets, culinary festivals
  FOOD = "FOOD",
  // Fitness, meditation, and health-focused activities
  WELLNESS = "WELLNESS",
  // Arts, heritage, and community cultural events
  CULTURE = "CULTURE",
  // Concerts, comedy shows, and general entertainment
  ENTERTAINMENT = "ENTERTAINMENT",
}

/**
 * Lifecycle status of an event record.
 * Controls visibility: only ACTIVE events appear in the public feed.
 *
 * @remarks Values must stay in sync with the EventStatus enum in prisma/schema.prisma.
 */
// Mirror of the Prisma EventStatus enum; drives feed visibility logic
export enum EventStatus {
  // Newly submitted — awaiting AI classification before being shown
  PENDING_CLASSIFICATION = "PENDING_CLASSIFICATION",
  // Classified and approved — visible in the public feed
  ACTIVE = "ACTIVE",
  // Removed from feed pending manual review due to reports or policy violation
  FLAGGED = "FLAGGED",
}

/**
 * Enumerates the types of interactions a user can have with an event.
 * Stored as a string enum so values are human-readable in the database.
 */
// Mirrors the UserInteractionType enum in prisma/schema.prisma
export enum UserInteractionType {
  // User opened the event detail screen; lightweight engagement signal
  VIEW = "VIEW",
  // User tapped "Interested" / saved to their list
  SAVE = "SAVE",
  // User reported the event for review
  FLAG = "FLAG",
  // User shared the event externally
  SHARE = "SHARE",
}

/**
 * Social energy preference captured during onboarding.
 * Biases the AI ranking toward matching event sizes and atmospheres.
 *
 * @remarks Values must stay in sync with the Vibe enum in prisma/schema.prisma.
 */
// Mirror of the Prisma Vibe enum; used in onboarding and profile screens
export enum Vibe {
  // Low-key hangouts, small gatherings, quiet spots
  CHILL = "CHILL",
  // Parties, big events, meeting new people
  SOCIAL = "SOCIAL",
  // No strong preference; the user is open to either
  BOTH = "BOTH",
}

/**
 * Time-of-day preference captured during onboarding.
 * Stored as an array so users can select multiple windows.
 *
 * @remarks Values must stay in sync with the TimeSlot enum in prisma/schema.prisma.
 */
// Mirror of the Prisma TimeSlot enum; used in onboarding Step 3
export enum TimeSlot {
  // 6am – 12pm morning events
  MORNING = "MORNING",
  // 12pm – 5pm afternoon events
  AFTERNOON = "AFTERNOON",
  // 5pm – 10pm evening events
  EVENING = "EVENING",
  // 10pm and later late-night events
  LATE_NIGHT = "LATE_NIGHT",
}

// ── Core entity interfaces ─────────────────────────────────────────────────────

/**
 * Represents a supported city in CityPulse.
 * Each city is a geographic anchor for event search and H3 indexing.
 *
 * @param id          - UUID primary key
 * @param name        - Human-readable city name (e.g. "Kingston")
 * @param country     - ISO country name or code (e.g. "Jamaica")
 * @param latitude    - WGS-84 decimal latitude of the city center
 * @param longitude   - WGS-84 decimal longitude of the city center
 * @param timezone    - IANA timezone identifier (e.g. "America/Jamaica")
 * @param createdAt   - ISO timestamp when the record was created
 */
export interface ICity {
  // Unique identifier for the city record
  id: string;
  // Display name shown in the UI
  name: string;
  // Country the city belongs to
  country: string;
  // Decimal latitude of the city center, used as default map origin
  latitude: number;
  // Decimal longitude of the city center, used as default map origin
  longitude: number;
  // IANA timezone string; used for rendering local event times
  timezone: string;
  // Record creation timestamp
  createdAt: Date;
}

/**
 * A descriptive tag that can be attached to events for fine-grained filtering.
 *
 * @param id    - UUID primary key
 * @param name  - Lowercase tag slug (e.g. "live-music", "family-friendly")
 */
export interface ITag {
  // Unique identifier for the tag
  id: string;
  // Normalised tag label displayed in the UI and used in search
  name: string;
}

/**
 * A registered CityPulse user account.
 *
 * @param id        - UUID primary key
 * @param email     - Unique email address used for authentication
 * @param name      - Display name shown on submissions and interactions
 * @param createdAt - ISO timestamp when the account was created
 * @param updatedAt - ISO timestamp of the most recent account change
 */
export interface IUser {
  // Unique identifier for the user
  id: string;
  // Email used for login; must be unique across all users
  email: string;
  // Publicly visible display name
  name: string;
  // When the user account was first created
  createdAt: Date;
  // When the user account was last modified
  updatedAt: Date;
}

/**
 * Extended preference and interest data attached to a user account.
 * Powers the AI ranking engine's personalisation layer.
 *
 * @param id                - UUID primary key
 * @param userId            - Foreign key referencing IUser.id
 * @param preferredCityId   - FK referencing ICity.id; the city shown on first open
 * @param interestedTags    - Tags the user has explicitly expressed interest in
 * @param vibe              - Social energy preference from onboarding Step 2
 * @param timePreferences   - Time-of-day preferences from onboarding Step 3
 * @param updatedAt         - ISO timestamp of the most recent profile change
 */
export interface IUserProfile {
  // Unique identifier for the profile record
  id: string;
  // Links this profile to its owner in the users table
  userId: string;
  // The city the user primarily browses; defaults to Kingston on sign-up
  preferredCityId: string;
  // Ordered list of tag slugs reflecting the user's stated interests
  interestedTags: string[];
  // Social energy preference selected during onboarding; defaults to BOTH
  vibe: Vibe;
  // Time-of-day windows the user is typically active; multi-select from onboarding
  timePreferences: TimeSlot[];
  // When the profile preferences were last saved
  updatedAt: Date;
}

/**
 * A CityPulse event submitted by a user or scraped from a partner source.
 * Includes H3 geohash indexes at three resolutions for spatial ranking.
 *
 * @param id                   - UUID primary key
 * @param title                - Short human-readable event title
 * @param description          - Full event description; may be AI-enriched
 * @param locationName         - Venue or area name as entered by the submitter
 * @param latitude             - WGS-84 decimal latitude of the event location
 * @param longitude            - WGS-84 decimal longitude of the event location
 * @param h3R7                 - H3 cell index at resolution 7 (~5 km² city district)
 * @param h3R9                 - H3 cell index at resolution 9 (~0.1 km² neighbourhood)
 * @param h3R11                - H3 cell index at resolution 11 (~0.001 km² venue level)
 * @param category             - Thematic category assigned by AI classifier; null until classified
 * @param tags                 - Array of associated ITag objects
 * @param eventDate            - Calendar date the event occurs (ISO date string)
 * @param startTime            - Local start time as an ISO datetime string
 * @param endTime              - Optional local end time
 * @param status               - Lifecycle status controlling feed visibility
 * @param cityId               - FK referencing ICity.id
 * @param submittedById        - FK referencing IUser.id
 * @param createdAt            - Record creation timestamp
 * @param updatedAt            - Record last-updated timestamp
 */
export interface IEvent {
  // Unique identifier for the event record
  id: string;
  // Short title displayed in feed cards and map pins
  title: string;
  // Full event description shown on the detail screen
  description: string;
  // Venue or area name as entered by the submitter
  locationName: string;
  // Decimal latitude; used to render the map pin
  latitude: number;
  // Decimal longitude; used to render the map pin
  longitude: number;
  // H3 cell at resolution 7 — city-district granularity for broad area grouping
  h3R7: string;
  // H3 cell at resolution 9 — neighbourhood granularity used for proximity ranking
  h3R9: string;
  // H3 cell at resolution 11 — venue-level granularity for precise co-location
  h3R11: string;
  // AI-assigned thematic category; null while PENDING_CLASSIFICATION, set before ACTIVE
  category: EventCategory | null;
  // Tags attached to this event for fine-grained matching
  tags: ITag[];
  // ISO date string for the day the event takes place
  eventDate: string;
  // ISO datetime string for when doors open or the event starts
  startTime: string;
  // ISO datetime string for end time; null if open-ended
  endTime: string | null;
  // Lifecycle state; only ACTIVE events appear in the public feed
  status: EventStatus;
  // Which city this event belongs to; scopes all feed queries
  cityId: string;
  // Who submitted this event; used for attribution and moderation
  submittedById: string;
  // When the event record was first created
  createdAt: Date;
  // When the event record was last modified
  updatedAt: Date;
}

/**
 * Tracks a single user interaction with an event (view, save, flag, etc.).
 * Used to personalise the feed and surface reports to moderators.
 *
 * @param id          - UUID primary key
 * @param userId      - FK referencing IUser.id
 * @param eventId     - FK referencing IEvent.id
 * @param type        - The kind of interaction performed
 * @param createdAt   - When the interaction was recorded
 */
export interface IUserInteraction {
  // Unique identifier for this interaction record
  id: string;
  // The user who performed the interaction
  userId: string;
  // The event the interaction was performed on
  eventId: string;
  // Categorises the action taken (e.g. "VIEW", "SAVE", "FLAG")
  type: UserInteractionType;
  // Timestamp of the interaction; used for recency signals in ranking
  createdAt: Date;
}

// ── API I/O shapes ─────────────────────────────────────────────────────────────

/**
 * Request body accepted by POST /events.
 * The API derives h3R7/r9/r11 from latitude and longitude — callers do not supply them.
 * submittedById is derived from the authenticated session — callers do not supply it.
 *
 * @param title         - Short event title (required)
 * @param description   - Full description (required)
 * @param locationName  - Venue name (required)
 * @param latitude      - WGS-84 latitude (required)
 * @param longitude     - WGS-84 longitude (required)
 * @param eventDate     - ISO date string "YYYY-MM-DD" (required)
 * @param startTime     - ISO datetime string for start (required)
 * @param endTime       - ISO datetime string for end (optional)
 * @param cityId        - UUID of the city this event belongs to (required)
 */
export interface CreateEventInput {
  // Short human-readable event title; shown as the card headline
  title: string;
  // Full event description that may be enriched by the AI classifier later
  description: string;
  // Venue or area name as entered; used for display, not geocoding
  locationName: string;
  // Decimal latitude of the event location; required for H3 indexing
  latitude: number;
  // Decimal longitude of the event location; required for H3 indexing
  longitude: number;
  // Calendar date the event takes place; ISO format "YYYY-MM-DD"
  eventDate: string;
  // Local start time as ISO datetime; shown on event cards
  startTime: string;
  // Optional end time; omit if the event has no fixed end
  endTime?: string;
  // Which city the event belongs to; used to scope feed queries
  cityId: string;
}

/**
 * Query parameters accepted by GET /events.
 * cityId is the only required parameter; all others are optional filters or ranking inputs.
 *
 * @param cityId    - UUID of the city to fetch events for (required)
 * @param category  - Optional category filter; omit to return all categories
 * @param lat       - User's current latitude; enables proximity ranking when paired with lng
 * @param lng       - User's current longitude; enables proximity ranking when paired with lat
 */
export interface GetEventsQuery {
  // Which city to fetch events for; all queries are scoped to one city
  cityId: string;
  // Optional thematic filter; when supplied only events in this category are returned
  category?: EventCategory;
  // User's current latitude; when provided alongside lng, enables H3 proximity ranking
  lat?: number;
  // User's current longitude; when provided alongside lat, enables H3 proximity ranking
  lng?: number;
}

/**
 * Request body for POST /auth/register.
 *
 * @param email    - Email address for the new account
 * @param password - Plaintext password; hashed server-side before storage
 * @param name     - Display name shown publicly on event submissions
 */
export interface RegisterInput {
  // Email used for login; must be unique across all accounts
  email: string;
  // Plaintext password supplied by the user; never stored — only the hash is kept
  password: string;
  // Publicly visible display name
  name: string;
}

/**
 * Request body for POST /auth/login.
 *
 * @param email    - Registered email address
 * @param password - Plaintext password to verify against the stored hash
 */
export interface LoginInput {
  // Email identifying the account to authenticate
  email: string;
  // Plaintext password to verify against the stored hash
  password: string;
}

/**
 * Response body for POST /auth/login and POST /auth/register.
 * Contains the JWT token and the authenticated user's public data.
 *
 * @param token - JWT bearer token to include in subsequent API requests
 * @param user  - Public user record for the authenticated account
 */
export interface AuthResponse {
  // JWT bearer token; include as "Authorization: Bearer <token>" in subsequent requests
  token: string;
  // Public user data so the client can populate the profile screen without a second request
  user: IUser;
}
