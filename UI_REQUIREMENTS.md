# CityPulse — UI Requirements Document

**Version:** 1.0
**Status:** Draft
**Date:** March 2026
**Platform:** Web (responsive, mobile-first) → Native iOS/Android in v1.1
**Scope:** MVP only (P0 features)
**Companion to:** PRD v1.0

---

## 1. Design Principles

These principles govern every screen in the product. Designers should apply them as a filter when making any layout or interaction decision.

| Principle | Description |
|---|---|
| **Personalization is felt, not announced** | The UI should never say "AI-powered" unless necessary. The experience of relevance should speak for itself. |
| **Speed of discovery** | Users should reach a relevant event within 2 taps from app open. No onboarding walls, no friction. |
| **Content over chrome** | Event cards and map pins are the product. Navigation, headers, and controls should stay minimal and recede. |
| **Mobile-first** | Every screen is designed for a 390px wide mobile viewport first. Desktop is a responsive adaptation, not a separate design. |
| **Calm information density** | Young urban users are visually literate. Cards can carry more information than traditional "simple" design guidelines suggest — but whitespace and hierarchy must be preserved. |

---

## 2. Design System Foundations

### 2.1 Color System

| Token | Role | Notes |
|---|---|---|
| `--color-bg` | App background | Near-black or deep navy for night-mode-first feel |
| `--color-surface` | Card / panel background | Slightly lighter than bg |
| `--color-primary` | Primary actions, active states | Single brand accent |
| `--color-text-primary` | Body text | High contrast |
| `--color-text-secondary` | Labels, metadata | Reduced contrast |
| `--color-border` | Dividers, card outlines | Subtle |

**Event Category Colors** — each category has a dedicated color token used for map pins, card accents, and filter chips:

| Category | Token |
|---|---|
| Nightlife | `--cat-nightlife` |
| Sports | `--cat-sports` |
| Education | `--cat-education` |
| Food | `--cat-food` |
| Wellness | `--cat-wellness` |
| Culture | `--cat-culture` |
| Entertainment | `--cat-entertainment` |

Category colors must meet WCAG AA contrast when displayed over `--color-surface`.

### 2.2 Typography Scale

| Level | Usage |
|---|---|
| Display (28–32px) | Screen titles, onboarding headers |
| Heading (20–24px) | Event card titles, section headers |
| Body (15–16px) | Descriptions, body copy |
| Label (12–13px) | Tags, metadata, timestamps |
| Micro (10–11px) | Map pin labels (if used) |

Font family TBD by brand. System fallback: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`.

### 2.3 Spacing

Base unit: `4px`. All spacing values are multiples of 4 (4, 8, 12, 16, 24, 32, 48).

### 2.4 Iconography

Use a single consistent icon library (e.g. Phosphor, Lucide, or custom). Icons used in MVP:

- Map pin / location
- Search (magnifier)
- Filter / sliders
- Calendar / clock
- Category icons (one per category)
- Plus / add (event submission)
- User / profile
- Chevron (navigation)
- Heart / star (Interested action)
- Flag (future: community flagging)
- Close / X

---

## 3. Navigation Structure

### 3.1 Bottom Navigation Bar (Mobile)

Persistent across all main screens. Four tabs:

| Tab | Icon | Destination |
|---|---|---|
| Feed | List icon | Personalized Feed |
| Map | Map pin | Map View |
| Post | Plus (prominent, center) | Event Submission |
| Profile | User icon | User Profile |

The Post tab should be visually distinct (larger, filled, brand color) to encourage posting.

### 3.2 Top Bar

Consistent across Feed and Map screens:

- Left: CityPulse wordmark or logo
- Right: Search icon (opens search overlay)

No hamburger menus in MVP. Navigation is flat.

---

## 4. Screen Specifications

---

### Screen 1 — Onboarding

**Purpose:** Collect the minimum data needed to generate an initial AI tag profile before the user sees the feed.

**Entry point:** First app open (unauthenticated or new account)
**Exit point:** Personalized Feed

#### 4.1.1 Step 1 — City Selection

**Layout:**
- Full-screen with centered content
- Large heading: "What city are you in?"
- Search input (auto-focus) with city suggestions below
- Or: auto-detect location with permission prompt

**Interactions:**
- Typing filters city list in real time
- Tapping a city advances to Step 2
- Location permission: if granted, pre-selects closest city with a confirm tap

**States:**
- Default: empty input, no suggestions
- Active: suggestions list visible (max 5 at a time, scrollable)
- Selected: city name confirmed, proceed CTA active

---

#### 4.1.2 Step 2 — Vibe Preference

**Purpose:** Capture social energy preference (used as a core profile dimension).

**Layout:**
- Progress indicator: Step 1 of 3 (dots or bar)
- Heading: "What's your vibe?"
- Two large tappable cards, side by side or stacked:
  - **Chill** — icon, short description ("Low-key hangouts, small gatherings, quiet spots")
  - **Social** — icon, short description ("Parties, big events, meeting new people")
- "Both / Depends" option below the cards (smaller, text link style)

**Interactions:**
- Single select. Selected card gets a filled/highlighted state.
- Advance CTA becomes active once a selection is made.
- Selection can be changed before advancing.

---

#### 4.1.3 Step 3 — Time Preference

**Purpose:** Capture when the user is typically active.

**Layout:**
- Progress indicator: Step 2 of 3
- Heading: "When do you usually go out?"
- Four time slots as tappable chips or cards:
  - Morning (6am–12pm)
  - Afternoon (12pm–5pm)
  - Evening (5pm–10pm)
  - Late Night (10pm+)
- Multi-select allowed

**Interactions:**
- Tapping a chip toggles selection. Selected chips are filled.
- At least one selection required to advance.

---

#### 4.1.4 Step 4 — Interest Tags

**Purpose:** Capture category-level interests.

**Layout:**
- Progress indicator: Step 3 of 3
- Heading: "What are you into?"
- Grid of interest tags (all 7 event categories + additional granular tags)
- Tags displayed as rounded chip buttons
- "Pick at least 3" instruction below heading

**Tag examples:**
`Music` `Art` `Food & Drink` `Fitness` `Nightlife` `Outdoors` `Tech` `Comedy` `Film` `Wellness` `Markets` `Sports` `Free Events` `Community`

**Interactions:**
- Tapping a tag toggles selection (filled = selected)
- Minimum 3 required. CTA activates once threshold met.
- No maximum — users can select all.

---

#### 4.1.5 Step 5 — Profile Generated

**Layout:**
- Transition screen (brief, 1–2 seconds or tap-to-continue)
- Heading: "Your feed is ready."
- Sub-copy: Short sentence confirming personalization (e.g. "We'll show you [City] events that match your vibe.")
- CTA: "Let's go" → navigates to Feed

**States:**
- Loading: brief spinner or animation while AI generates initial tag profile
- Ready: CTA appears

---

### Screen 2 — Personalized Feed

**Purpose:** The primary discovery surface. Shows AI-ranked events as a scrollable card list.

**Entry point:** Bottom nav Feed tab; post-onboarding
**Exit point:** Event Detail (tap card), Map View (nav), Search (tap icon)

#### 4.2.1 Layout

```
┌─────────────────────────────┐
│ [Logo]              [Search]│  ← Top bar
├─────────────────────────────┤
│ [All] [Music] [Food] [...]  │  ← Category filter chips (horizontal scroll)
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ Event Card              │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Event Card              │ │
│ └─────────────────────────┘ │
│           ...               │
└─────────────────────────────┘
│ [Feed] [Map] [+] [Profile]  │  ← Bottom nav
```

#### 4.2.2 Category Filter Bar

- Horizontal scrollable chip row, sticky below top bar
- Chips: All (default selected) + one per event category
- Each chip displays the category color accent when selected
- Tapping a chip filters the feed. "All" clears the filter.
- Only one category filter active at a time in MVP.

#### 4.2.3 Event Card

Each card in the feed represents one event.

**Card anatomy:**

| Element | Description |
|---|---|
| Category color bar | Left border or top accent strip using category color token |
| Event title | Heading weight, 2-line max with ellipsis |
| Date + Time | Label style — e.g. "Saturday, Mar 22 · 8pm" |
| Location | Label style — neighborhood or venue name |
| Tags | Up to 3 tag chips visible (e.g. `#free` `#outdoor` `#18+`) |
| Interested button | Heart or star icon, right-aligned. Tap = mark Interested. |

**Card states:**
- Default
- Pressed / active (scale down slightly)
- Interested (filled heart icon)

**Card interaction:**
- Tap anywhere on card (except Interested button) → opens Event Detail View
- Tap Interested → toggles state, sends positive signal to AI profile (no navigation)

**Feed states:**
- Loading: skeleton cards (same card shape, shimmer fill)
- Empty (no events match filter): illustration + "No events found. Try a different category." + reset filter link
- Error: "Couldn't load events. Pull to refresh."
- End of list: "That's everything nearby." + "Post an event" CTA

#### 4.2.4 Pull to Refresh

Standard pull-to-refresh gesture re-fetches and re-ranks the feed.

---

### Screen 3 — Map View

**Purpose:** Spatial discovery — let users see where events are happening across the city on an interactive map.

**Entry point:** Bottom nav Map tab
**Exit point:** Event Detail (tap pin or card), Feed (nav)

#### 4.3.1 Layout

```
┌─────────────────────────────┐
│ [Logo]              [Search]│
├─────────────────────────────┤
│                             │
│       [City Map]            │  ← Full-screen map
│   [pin] [pin]   [pin]       │
│       [pin]                 │
│                             │
├─────────────────────────────┤
│ [Event Card — bottom sheet] │  ← Appears when pin is tapped
└─────────────────────────────┘
│ [Feed] [Map] [+] [Profile]  │
```

#### 4.3.2 Map

- Full-screen map fills the content area behind the nav bars
- Map style: dark/muted base map to ensure pins are visible (e.g. dark Mapbox or Google Maps style)
- Initial zoom: city-level, centered on user's selected city
- User location dot shown if location permission granted

#### 4.3.3 Map Pins

Each event is represented by a pin on the map.

| Pin property | Behavior |
|---|---|
| Color | Category color token |
| Shape | Circle or teardrop — consistent size at default zoom |
| Cluster | Events within close proximity cluster into a numbered badge at low zoom levels |
| Tap | Opens event preview at bottom of screen |

**Cluster tap:** Opens a scrollable list of clustered events in a bottom sheet.

#### 4.3.4 Event Preview (Bottom Sheet)

When a pin is tapped, a compact event preview slides up from the bottom:

- Same card layout as Feed card (abbreviated)
- "View Details" CTA → navigates to Event Detail View
- Swipe down or tap outside to dismiss

**States:**
- Hidden (default)
- Visible: one event preview
- Cluster: list of events, scrollable within sheet

#### 4.3.5 Category Filter on Map

- Same horizontal chip row as Feed, displayed above the map or overlaid at top
- Filtering hides/shows pins by category in real time

---

### Screen 4 — Event Detail View

**Purpose:** Full information view for a single event. The user arrives here to decide whether to attend.

**Entry point:** Tap any event card (Feed or Map)
**Exit point:** Back to previous screen (Feed or Map), Interested action

#### 4.4.1 Layout

```
┌─────────────────────────────┐
│ [← Back]                    │  ← Navigation back
├─────────────────────────────┤
│ [Category color header bar] │
│ Event Title                 │
│ Date · Time                 │
│ 📍 Location                 │
├─────────────────────────────┤
│ Description (full text)     │
│                             │
├─────────────────────────────┤
│ Tags: [#free][#outdoor]...  │
├─────────────────────────────┤
│ [Mini map — location]       │
├─────────────────────────────┤
│ Posted by: [username]       │
│ Posted: [relative date]     │
└─────────────────────────────┘
│ [Interested]   [Share]      │  ← Sticky footer actions
```

#### 4.4.2 Fields

| Field | Notes |
|---|---|
| Title | Full event title, no truncation |
| Date & Time | Full formatted date + start time. End time if provided. |
| Location | Address or venue name. Tappable — opens native maps app. |
| Description | Full free-text description as submitted. No character limit enforced on display. |
| Tags | All AI-assigned tags displayed as chips |
| Category | Displayed as colored label |
| Mini Map | Static map snippet showing event pin location. Tappable — opens full map or native maps. |
| Posted by | Username (anonymous display name in MVP, no profile links) |
| Posted date | Relative time (e.g. "2 hours ago") |

#### 4.4.3 Actions (Sticky Footer)

| Action | Behavior |
|---|---|
| Interested | Marks event. Icon fills. Sends strong positive signal to AI profile. Toggling off removes signal. |
| Share | Opens native share sheet with event title + deep link. |

#### 4.4.4 States

- Loading: skeleton layout while fetching
- Loaded: full content
- Error: "Couldn't load event." + retry

---

### Screen 5 — Event Submission

**Purpose:** Let any user post a new event. The AI classifier processes the submission in the background after posting.

**Entry point:** Bottom nav + (Post) button
**Exit point:** Feed (post-submission), or cancel back to previous screen

#### 4.5.1 Layout

Standard form screen with a sticky submit footer.

#### 4.5.2 Form Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| Event Title | Text input | Yes | Max 100 characters. Character counter shown. |
| Description | Textarea | Yes | Min 20 characters. Free text. This is the primary input the AI classifier reads. |
| Location | Text input + location picker | Yes | Freeform address or place name. Optional: map pin picker. |
| Date | Date picker | Yes | Single date. Future dates only. |
| Time | Time picker | Yes | Start time. End time optional. |
| Category | Optional dropdown | No | If left blank, AI assigns. If provided, used as a hint. |

#### 4.5.3 AI Preview (Optional Step)

After filling the description, a subtle CTA appears below the textarea:

> "Analyze with AI" → shows a preview panel:
> - Suggested category
> - Suggested tags (up to 10)
> - User can accept as-is or edit tags before submitting

This is optional and non-blocking. If the user skips it, AI classification runs in background after submit.

**AI Preview States:**
- Idle: "Analyze with AI" button visible
- Loading: spinner inside the preview panel
- Result: category + tag chips displayed, editable
- Error: "Couldn't analyze. Your event will still be classified after posting."

#### 4.5.4 Submission

- Primary CTA: "Post Event" (sticky at bottom of screen)
- Disabled until required fields are filled
- On submit: optimistic UI — event appears immediately in feed with a "Pending classification" badge
- AI classification resolves in background; badge is removed once tags are assigned

**States:**
- Idle: form empty, CTA disabled
- In progress: at least one field filled, CTA enabled when required fields complete
- Submitting: CTA shows loading state, form locked
- Success: brief confirmation toast ("Event posted!") + navigate to Feed
- Error: inline error message, form remains filled

#### 4.5.5 Validation

| Rule | Message |
|---|---|
| Title empty | "Give your event a title." |
| Description too short | "Add a little more detail (at least 20 characters)." |
| Location empty | "Where is this happening?" |
| Date in the past | "Pick a date in the future." |
| No date selected | "When is this event?" |

---

### Screen 6 — User Profile

**Purpose:** Let users view and edit their interest profile. Transparency into how the AI sees them.

**Entry point:** Bottom nav Profile tab
**Exit point:** Back to Feed/Map

#### 4.6.1 Layout

```
┌─────────────────────────────┐
│ Profile                     │
├─────────────────────────────┤
│ [Avatar placeholder]        │
│ Username / Display name     │
│ City                        │
├─────────────────────────────┤
│ Your Vibe                   │
│ [Chill / Social / Both]     │
├─────────────────────────────┤
│ When you go out             │
│ [Morning][Evening][Night]   │
├─────────────────────────────┤
│ Your Interests              │
│ [Tag][Tag][Tag][+12 more]   │
├─────────────────────────────┤
│ [Edit Profile]              │
│ [Reset Interest Profile]    │
├─────────────────────────────┤
│ Privacy                     │
│ [View my data]              │
│ [Delete my data]            │
└─────────────────────────────┘
```

#### 4.6.2 Interest Tag Display

- Tags shown as read-only chips in default state
- "Edit Profile" transitions the screen to edit mode:
  - Vibe preference becomes selectable again
  - Time preferences become toggleable again
  - Interest tags become an editable chip grid (same UI as onboarding Step 4)
- "Reset Interest Profile" — clears all behavioral data and returns profile to onboarding defaults. Requires a confirmation dialog.

#### 4.6.3 Privacy Controls

| Control | Behavior |
|---|---|
| View my data | Opens a summary modal of what data is stored (profile tags, interaction history count — no raw event data) |
| Delete my data | Initiates data deletion request. Confirmation dialog. Account is deactivated. |

---

### Screen 7 — Search

**Purpose:** Full-text search across event titles, locations, and AI-assigned tags.

**Entry point:** Search icon in top bar (Feed or Map screens)
**Exit point:** Tap result → Event Detail; dismiss → return to previous screen

#### 4.7.1 Layout

- Search input takes focus immediately on open (keyboard up)
- Below input: recent searches (if any)
- As user types: live results appear below (debounced, ~300ms)

#### 4.7.2 Search Results

- Same event card format as Feed
- Results show which field matched (title, location, or tag) — optional, v1 detail
- No results state: "No events found for '[query]'." + suggestion to post an event

#### 4.7.3 States

| State | Display |
|---|---|
| Empty (just opened) | Recent searches list |
| Typing | Results update live |
| No results | Empty state message |
| Loading | Skeleton cards |
| Error | "Search unavailable. Try again." |

---

## 5. AI-Specific UI Patterns

These patterns apply wherever AI classification or ranking is surfaced in the UI.

### 5.1 Tag Chips

Used across: Event cards, Event Detail, User Profile, AI Preview in Submission.

- Rounded pill shape
- Category tags use category color
- Descriptive tags (e.g. `#free`, `#outdoor`) use neutral color
- Editable tags (in submission preview or profile edit) show a remove (×) affordance

### 5.2 AI Classification Badge

Used on: event cards during "Pending classification" state.

- Small label, secondary text style: "Classifying…" with a subtle animated dot
- Disappears once tags are assigned
- Does not block interaction with the card

### 5.3 Match Score (Internal, Not Displayed)

The AI ranking score is **not shown to the user** in MVP. Feed order is the implicit signal. Avoid any UI that communicates a percentage match, score, or "Recommended for you" label — these reduce trust if the recommendations are wrong. Let the quality of the ranking speak for itself.

---

## 6. Empty States

Every screen that can be empty must have a designed empty state. Do not show blank screens.

| Screen | Empty State Message | CTA |
|---|---|---|
| Feed — no events | "Nothing nearby yet. Be the first to post." | Post Event |
| Feed — category filter, no results | "No [Category] events right now." | Clear filter |
| Map — no pins | Same as feed empty state, shown as overlay | Post Event |
| Search — no results | "No events found for '[query]'." | Post an event |
| Profile — no tags yet | Should not occur (onboarding ensures at least 3 tags) | — |

---

## 7. Loading States

All data-fetching screens must show a skeleton/placeholder state, not a spinner, where possible.

| Screen | Loading Pattern |
|---|---|
| Feed | 3–4 skeleton event cards (same card shape, shimmer) |
| Map | Map loads immediately; pins fade in as data arrives |
| Event Detail | Skeleton layout matching the screen structure |
| Search | Skeleton cards below search input |
| Onboarding AI step | Small spinner centered on screen |

---

## 8. Error States

| Error Type | Display Pattern |
|---|---|
| Network failure (feed/map) | Inline banner: "No connection. Pull to retry." |
| Server error (feed/map) | Same banner with "Retry" button |
| Submission failure | Toast: "Couldn't post event. Try again." Form data preserved. |
| AI classification failure | Silent — event posts without tags; tags added when service recovers |
| Search failure | Inline: "Search unavailable." |

---

## 9. Interaction & Animation Guidelines

| Pattern | Spec |
|---|---|
| Screen transitions | Slide in from right (push), slide out to right (pop) — standard native navigation |
| Bottom sheet | Slide up from bottom, 300ms ease-out |
| Card tap | Subtle scale-down (0.97) on press, release to navigate |
| Tag toggle | Fill/unfill with 150ms color transition |
| Interested button | Spring animation on toggle — communicate delight without being excessive |
| Pull to refresh | Standard platform spinner behavior |
| Toast notifications | Slide in from bottom above nav bar; auto-dismiss after 3 seconds |
| Skeleton shimmer | Left-to-right gradient animation, 1.5s loop |

---

## 10. Responsive Behavior (Web)

CityPulse is mobile-first. On wider viewports:

| Breakpoint | Behavior |
|---|---|
| < 640px | Single column, bottom nav |
| 640–1024px | Single column, wider card max-width, bottom nav or top nav |
| > 1024px | Two-column layout: feed left, map right (side by side). Top nav replaces bottom nav. Post button in nav bar. |

The two-column desktop layout is the primary differentiator from mobile — the map and feed are always visible simultaneously on desktop, removing the need to switch tabs.

---

## 11. Accessibility Requirements

- All interactive elements must have visible focus states (keyboard navigation)
- Color must not be the sole indicator of category — use icons or labels alongside color
- Minimum tap target size: 44×44px on mobile
- All images and icons require `alt` text or `aria-label`
- Form fields require visible labels (not placeholder-only)
- Map pins must have accessible alternatives (the category-filtered list view serves as the map's accessible equivalent)
- WCAG AA contrast minimum for all text against their backgrounds

---

## 12. Out of Scope for MVP UI

The following features appear in the PRD but are **not** in scope for MVP design:

| Feature | PRD Priority | Notes |
|---|---|---|
| AI Chat interface | P1 | Design after MVP ships |
| Behavioral profiling UI | P1 | Backend-only in MVP; no visible UI |
| Community flagging | P1 | Flag icon can be reserved/ghosted in MVP |
| Push notifications | P2 | — |
| Organizer profiles | P2 | — |
| Past events archive | P2 | — |
| Guest / incognito mode | P1 | Evaluate post-MVP |

---

## 13. Open Design Questions

These require decisions before high-fidelity design begins:

1. **Dark mode only, light mode only, or both?** — PRD implies a night-out use case; dark-first is recommended but needs confirmation.
2. **Anonymous vs. named users** — Does MVP require account creation or allow anonymous browsing? Affects onboarding flow length.
3. **Event image uploads** — PRD does not mention images. Should event cards support an optional image? Significant impact on card layout.
4. **Map provider** — Mapbox, Google Maps, or Apple Maps? Affects pin customization options and cost.
5. **Display name / avatar** — What does the user profile show if no social login is used?
6. **Category icon set** — Confirm or commission icons for all 7 categories.

---

*CityPulse UI Requirements v1.0 — March 2026 — Confidential*
*To be used alongside PRD v1.0. This document does not replace the PRD — it translates it for design execution.*
