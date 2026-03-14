# CityPulse — Technical Decisions

**Version:** 1.0
**Status:** Active
**Date:** March 2026
**Purpose:** Records architectural and technology decisions that shape how this product is built. Every entry explains what was chosen, why, and what rules follow from that choice.

This document is the authoritative record of decisions that are not obvious from the code itself. Developers must read the relevant section before working on any feature area covered here.

---

## Decision Index

| # | Area | Decision | Status |
|---|---|---|---|
| TD-001 | Geospatial / Maps | Use Uber H3 hexagonal geospatial indexing | Confirmed |

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

*CityPulse Technical Decisions v1.0 — March 2026 — Confidential*
*This document must be updated whenever a covered decision is revised or a new architectural decision is made.*
