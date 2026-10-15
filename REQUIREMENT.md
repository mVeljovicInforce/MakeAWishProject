# Hidden Wishes — Requirements

> **Version:** v2 (multi-page redesign). This document is the source of truth for required behavior.
> `DESIGN.md` is the source of truth for visual direction, tone, and interaction feel.
> v2 is implemented. Behavior that existed in the MVP (wish validation, GET/POST wish contracts, XSS/SQL protections) must be preserved.

## 1. Purpose

Hidden Wishes is a small anonymous full-stack web application where visitors can share private wishes, hopes, dreams, thoughts, or short confessions without creating an account.

The application should feel calm, personal, minimal, and slightly mysterious: less like a social network, more like finding anonymous notes left by strangers in a quiet room.

The primary experience:

1. A visitor opens the website and sees one carefully chosen wish.
2. The visitor may read another wish, or explore a group of random wishes.
3. The visitor may quietly send "a little light" to a wish that touched them.
4. The visitor may anonymously leave a wish of their own.
5. The submitted wish is stored and may later appear to other visitors.

---

## 2. Technology

- Node.js
- Express
- SQLite
- Vanilla HTML
- Vanilla CSS
- Vanilla JavaScript

The project should remain simple and understandable. Additional frameworks or dependencies must not be introduced unless there is a clear technical reason. No external font, CDN, or tracking dependencies.

---

## 3. Architecture

A simple client-server architecture.

### Frontend

- Four static pages (see FR-011), sharing one stylesheet and common script(s), each page with its own page script.
- Calls the backend API using `fetch()`.
- Updates the UI without full page reloads where the interaction is in-page (loading wishes, submitting, reacting).
- Performs basic client-side validation.
- Must not throw errors on pages that lack elements used by other pages (scripts are per-page or defensive).

### Backend

- Serves the pages and static assets.
- Provides REST API endpoints.
- Validates all submitted data.
- Reads and writes wishes and reactions in SQLite.
- Returns appropriate HTTP status codes and JSON responses.
- Handles unexpected errors safely.

### Database

SQLite for persistent storage. No separate database server.

---

## 4. Functional Requirements

### FR-001 — Landing Page `/`

The landing page must display:

- The hero title (see `DESIGN.md` §5.2).
- **One** featured wish (FR-012).
- A **Read another wish** control.
- An **Explore wishes** link to `/wishes`.
- A **Leave a wish** link to `/make-a-wish`.

The landing page must **not** contain the wish submission form, and the featured wish must **not** contain a reaction control.

The page must work without authentication.

Below the hero, short copy and a **Leave a wish** call to action (see `DESIGN.md` §5.5).

Optional slow auto-rotation is governed by `DESIGN.md` §5.4; manual control must always remain available.

---

### FR-002 — Display Random Wishes

Wishes are retrieved at random from the backend without a full page reload.

**Explore page `/wishes`**

- Initially displays **6** random wishes.
- **Show me different wishes** loads another set of 6.
- No infinite scroll, no pagination counters, no "load more" feed behavior.

**Landing page "Read another wish"**

- After the initial featured wish, loads one random wish from the normal wish collection.
- Excludes the currently displayed wish where practical (e.g. via the optional `exclude` query parameter, or by retrying once on the client).
- There is no separate curated pool.

**General**

- If fewer wishes exist than requested, return and display the available wishes.
- The frontend handles duplicates gracefully when the database is small.
- An empty database shows the empty state in FR-016.

---

### FR-003 — Submit a Wish

Submission happens on `/make-a-wish` (FR-011). A visitor submits a wish using a text area.

Rules:

- At least one non-whitespace character.
- Leading and trailing whitespace removed.
- Maximum length: 500 characters.
- Anonymous: no name, username, email address, or profile information required.
- The application must not intentionally store personally identifying information.

Submission uses JavaScript and `fetch()` (no full reload).

---

### FR-004 — Character Counter

The wish input displays characters **used** out of the limit, e.g. `84 / 500`.

- The counter is quiet and must not visually compete with the wish.
- The form prevents submission of content that exceeds the limit.
- Backend validation enforces the same rule independently.

---

### FR-005 — Successful Submission

After a valid wish is submitted:

- The backend stores it in SQLite.
- The form gently transitions away and is cleared (including the counter).
- Primary message: **"It's out there now."**
- Supporting message: **"Somewhere, someone may read it."**
- Offered next steps: **Read someone else's wish** (links to `/wishes`) and, optionally, **Leave another** (resets the form).
- The success state must not push the visitor to create more content.

---

### FR-006 — Invalid Submission

Invalid input is not stored. Examples: empty input; only spaces, tabs, or line breaks; input over 500 characters.

- The backend returns an appropriate client error (400).
- The frontend shows a clear, calm, non-technical message.
- If submission fails for a server/network reason: "Your wish couldn't be released just now. Please try again."

---

### FR-007 — Persistence

Submitted wishes remain stored after browser refresh, browser close/reopen, and Node.js server restart. SQLite is the source of persistence.

---

### FR-008 — Seed Data and First-Run Initialization

A fresh project/database must receive seed wishes as part of a defined, automatic initialization flow:

- On server startup, after the schema is ensured, **if the `wishes` table is empty, the seed wishes are inserted automatically**.
- `node seed.js` remains available as a manual, idempotent script using the same seed data and the same "only if empty" rule.
- Seeding never runs when wishes already exist, and never duplicates wishes on restart.
- Approximately 15–25 wishes; a mixture of serious, hopeful, funny, romantic, family-related, ambitious, and ordinary wishes; natural rather than polished.
- Varied `created_at` timestamps (spread over past days).
- The seed set includes the intentionally chosen featured wish (FR-012), flagged `is_featured`.
- Documentation (README, CLAUDE.md, AGENTS.md) must describe exactly this flow.

---

### FR-009 — Wish Age / Timestamp

Each wish stores its creation timestamp. API responses return ISO 8601 UTC (`YYYY-MM-DDTHH:MM:SS.sssZ`).

The UI shows subtle, human-friendly relative time on Explore cards, in a semantic `<time datetime="…">` element, never as a database-style date. Progression: "just now", "5m ago", "2h ago", "yesterday", "4 days ago", "3 weeks ago", "about a month ago", "2 months ago", "1 year ago" (singular/plural forms respected). Display only; stored timestamps are unchanged.

---

### FR-010 — Shooting-Star Reaction ("Send a little light")

**In scope.** Exactly **one** supportive reaction type exists. It is **not** called a Like and must never be presented as one.

Meaning: *this touched me.*

#### UI

- A small shooting-star control (star, short trail, tiny star-dust points) near the lower-right of a wish card on `/wishes`.
- Interaction copy: **Send a little light**.
- Subtle default state; soft glow/star-dust activation animation of roughly 500–900 ms; settles into a softly illuminated active state (see `DESIGN.md` §7).
- No confetti, no sound, no bounce.
- The featured wish on the landing page has no reaction control.
- **No reaction count, total, ranking, score, badge, or popularity indicator is ever shown, in any UI.**

#### Visitor identity (anonymous deduplication)

- On first use, the browser generates a random anonymous identifier (e.g. `crypto.randomUUID()`) and stores it in `localStorage`.
- The identifier is sent with each reaction request and is used **only** to prevent duplicate reactions to the same wish.
- The backend hashes the identifier (SHA-256, optionally with a server-side salt) and stores **only the hash** in `visitor_key_hash`. The raw identifier is never stored or logged.
- The browser may also remember reacted wish IDs in `localStorage` to restore UI state.
- The mechanism must not collect or store names, accounts, email addresses, IP addresses, user-agent strings, or other identifying information.
- This is an MVP convenience, not strong abuse prevention: clearing browser storage or scripted requests can create additional reactions. A more robust approach may be considered before a larger public launch.

#### API

`POST /api/wishes/:id/react`

Request body:

```json
{ "visitorKey": "<anonymous random browser identifier>" }
```

Success response (200):

```json
{ "success": true }
```

Rules:

- The wish must exist; otherwise 404.
- `:id` must be a positive integer and `visitorKey` a non-empty string of bounded length (e.g. ≤ 128 chars); otherwise 400.
- A duplicate reaction (same wish + same visitor key hash) is accepted idempotently: it returns `{ "success": true }` and **does not** create another reaction row or increase any count.
- The response never contains reaction totals or any reaction data.

#### Privacy of counts

- Reaction totals exist **only internally** (derivable from `wish_reactions`).
- No API response (`GET /api/wishes/random`, `GET /api/wishes/featured`, `POST /api/wishes`, `POST /api/wishes/:id/react`, `GET /api/health`) may include reaction counts or reaction-derived values.
- Reactions must not change the ordering or visibility of wishes in a way that exposes popularity.
- Reaction-based featured-wish selection is **deferred (Phase 2)** and is not part of v2.

#### Accessibility

The control is a real `<button>`; keyboard accessible; visible focus state; accessible label **"Send a little light to this wish"**; does not depend on hover; respects `prefers-reduced-motion`.

---

### FR-011 — Site Structure and Routes

| Route | Page |
|---|---|
| `/` | Landing page (FR-001) |
| `/wishes` | Explore wishes (FR-002, FR-010) |
| `/make-a-wish` | Write and release a wish (FR-003–FR-006) |
| `/about` | About Hidden Wishes (FR-014) |

- The backend serves these routes explicitly (no `.html` suffix needed in the URL).
- `/api/*` remains reserved for the API.
- **Unknown website routes** (non-`/api`) return a simple custom 404 page in the site's visual style, with a link home. Unknown `/api/*` routes return a JSON 404.
- **Global navigation** is minimal and quiet: `Hidden Wishes` (home link), `Explore` (`/wishes`), `Leave a Wish` (`/make-a-wish`). `About` lives in the footer. No hamburger menu unless necessary.

---

### FR-012 — Featured Wish

- The landing page's first wish is a manually selected featured wish, chosen to establish the site's emotional tone (see `DESIGN.md` §5.3).
- Stored via an `is_featured` flag on the `wishes` table (`INTEGER NOT NULL DEFAULT 0`).
- Application logic ensures **at most one** wish is featured at any time (setting a featured wish clears the flag on all others, in one transaction).
- No admin UI in v2. The featured wish is set by seed/initialization or a one-off script.
- `GET /api/wishes/featured` returns `{ "wish": { "id", "text", "created_at" } }`, or `{ "wish": null }` if none is flagged. The featured flag itself is not part of public wish responses.
- If no featured wish exists, the landing page falls back to a random wish; if the database is empty, it shows the empty state.
- Initialization must ensure a featured wish exists on a fresh database (via FR-008). How an *existing* database obtains its featured wish is defined in the migration strategy (README / implementation plan) and requires approval before any data change.
- Phase 2 (reaction-based featuring) is deferred.

---

### FR-013 — Visual Direction, Theme, and Typography

- Hidden Wishes v2 is **dark by default** and follows the nocturnal direction in `DESIGN.md` §10. The main visual identity does **not** switch based on OS light/dark preference.
- Wish text uses a good **system serif** stack (e.g. `Georgia, 'Iowan Old Style', 'Palatino Linotype', Palatino, serif`).
- Interface text uses a **system sans-serif** stack (e.g. `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`).
- No Google Fonts or other external font dependencies.
- Motion follows `DESIGN.md` §12, and all non-essential animation respects `prefers-reduced-motion`.
- Responsive: desktop, tablet, mobile; no horizontal scrolling; layout per `DESIGN.md` §14.

---

### FR-014 — About Page `/about`

Short and human, using the copy in `DESIGN.md` §9, including the privacy note ("We don't ask for your name, email, or profile."). No corporate mission statements, founder biographies, or long legal text.

---

### FR-015 — Explore Layout

On `/wishes`, wishes are shown in a loose, masonry-like arrangement built with native CSS (no masonry library), collapsing to one column on small screens. A wish card contains only wish text, subtle relative time, and the shooting-star control — no username, avatar, count, comment, share, ranking, score, or badge.

---

### FR-016 — Empty and Error States

- Empty (no wishes): "No wishes are here yet." / "You could leave the first one." with a **Leave a wish** link.
- Load failure: "Something went wrong. Please try again."
- Submission failure: "Your wish couldn't be released just now. Please try again."
- Technical details are never shown in the UI.

---

## 5. API Requirements

Existing contracts are preserved unchanged unless stated below.

### GET `/api/wishes/random`

```http
GET /api/wishes/random?count=3
GET /api/wishes/random?count=1&exclude=12
```

```json
{
  "wishes": [
    { "id": 12, "text": "I hope my dog lives forever.", "created_at": "2026-09-25T12:30:00.000Z" }
  ]
}
```

- `count` defaults to 3; clamped to 1–10 (Explore requests 6).
- Optional `exclude` (positive integer wish id) omits that wish from results; an invalid `exclude` is ignored.
- Invalid values handled safely. Responses contain no reaction data and no `is_featured`.

### GET `/api/wishes/featured`

See FR-012.

### POST `/api/wishes`

Request (the field is `text`, not `wish`):

```json
{ "text": "I want to finally learn how to play guitar." }
```

Success (201):

```json
{
  "success": true,
  "wish": { "id": 42, "text": "I want to finally learn how to play guitar.", "created_at": "2026-09-25T15:00:00.000Z" }
}
```

- Validate `text`; trim; reject empty and > 500 characters (400); parameterized SQL.
- A submitted wish is never featured automatically.

### POST `/api/wishes/:id/react`

See FR-010.

### GET `/api/health`

`{ "status": "ok", "wishCount": 20 }`. On error returns a generic message, not internal error text.

---

## 6. Database Requirements

### `wishes`

```sql
CREATE TABLE wishes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_featured INTEGER NOT NULL DEFAULT 0
);
```

Note: the existing live table was created with `created_at DATETIME DEFAULT CURRENT_TIMESTAMP` (without `NOT NULL`). This drift is tolerated; no table rebuild is required.

### `wish_reactions`

```sql
CREATE TABLE IF NOT EXISTS wish_reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wish_id INTEGER NOT NULL REFERENCES wishes(id),
    visitor_key_hash TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (wish_id, visitor_key_hash)
);
```

Reaction totals are never stored on `wishes` and never exposed publicly.

### Location and migration

- Database file: `data/wishes.db`, auto-created on startup if missing.
- Schema changes must be **additive and non-destructive**: `CREATE TABLE IF NOT EXISTS wish_reactions`, and add `wishes.is_featured` only if absent (check `PRAGMA table_info(wishes)`, then `ALTER TABLE … ADD COLUMN`). Back up `data/wishes.db` before the first migration. No existing rows are deleted or modified by migration.
- Recommended: stop tracking `data/wishes.db` in git (add `data/*.db` to `.gitignore`). It contains user-submitted and development-test data, and fresh clones are covered by automatic seeding (FR-008). **This must not be done until separately approved.**

---

## 7. Security Requirements

- **SR-001 XSS** — wishes are never interpreted as HTML/JS; insert with `textContent`, never `innerHTML`.
- **SR-002 SQL injection** — all queries with user-provided values are parameterized (including `:id`, `exclude`, `visitorKey`).
- **SR-003 Backend validation** — every input rule is enforced on the backend independently of the frontend.
- **SR-004 Error exposure** — no stack traces, file paths, database internals, secrets, or raw `err.message` in responses (including `/api/health`).
- **SR-005 Reaction privacy** — raw visitor keys are never stored or logged; no reaction totals in any response.

---

## 8. Privacy Requirements

The application does not require or intentionally collect: names, usernames, email addresses, phone numbers, profiles, account credentials, location, or IP addresses in the application database.

The reaction mechanism stores only a hash of a random, anonymous, browser-generated identifier (FR-010). The UI clearly communicates that wishes are anonymous, but must not claim that wish text can never contain identifying information (visitors may type it themselves).

---

## 9. UI / UX Requirements

Visual and interaction direction is defined in `DESIGN.md` and FR-013. In summary: calm, quiet, nocturnal, warm, minimal, human, responsive. Copy follows the tone of voice in `DESIGN.md` §13.

---

## 10. Error Handling

The UI gracefully handles API failure, database failure, invalid submission, empty database, slow responses, and unexpected server errors with calm, non-technical messages (FR-016). Failures are never silent.

---

## 11. Accessibility

- Form controls have labels or accessible names.
- All interactive controls (including the shooting-star button, nav, and CTAs) are keyboard usable with visible focus states.
- Text has sufficient contrast on the dark palette.
- Important interactions do not depend only on animation or hover.
- `prefers-reduced-motion` is respected; auto-rotation (if implemented) is disabled under reduced motion and paused on interaction/focus.

---

## 12. Project Structure

Target v2 structure:

```text
/
├── package.json
├── server.js
├── database.js
├── seed.js
├── REQUIREMENT.md
├── DESIGN.md
├── README.md
├── CLAUDE.md
├── AGENTS.md
├── public/
│   ├── index.html          (landing)
│   ├── wishes.html         (explore)
│   ├── make-a-wish.html
│   ├── about.html
│   ├── 404.html
│   ├── styles.css
│   └── js/                 (shared + per-page scripts)
└── data/
    └── wishes.db           (created at runtime)
```

The exact file split may differ if it stays simple and clearly organized.

---

## 13. README Requirements

The README explains: what Hidden Wishes is; technology; project structure; prerequisites; installation; running locally; default URL; pages/routes; API endpoints; database location, schema and migration approach; first-run seeding behavior; known limitations. It must agree with this document and the code.

---

## 14. Acceptance Criteria

v2 is complete when all of the following are true:

1. `npm install` and `npm start` work on a fresh clone.
2. A fresh database is seeded automatically on first start; restarts do not duplicate seed data.
3. `/`, `/wishes`, `/make-a-wish`, `/about` load; unknown routes show the custom 404; unknown `/api/*` routes return JSON 404.
4. The landing page shows exactly one featured wish, no submission form, no reaction control, and the three links/controls in FR-001.
5. "Read another wish" shows a different random wish without a reload.
6. `/wishes` initially shows 6 random wishes; "Show me different wishes" loads another 6; there is no infinite scroll.
7. A valid anonymous wish can be submitted on `/make-a-wish` and shows "It's out there now." / "Somewhere, someone may read it."
8. The counter shows `n / 500`.
9. Empty, whitespace-only, and > 500-character wishes are rejected (frontend and backend).
10. Submitted wishes persist after server restart.
11. HTML/script input never executes.
12. All database queries are parameterized.
13. A visitor can send one shooting-star reaction per wish; a repeat from the same browser does not add a second reaction row.
14. `POST /api/wishes/:id/react` returns `{ "success": true }`; a non-existent wish returns 404; invalid input returns 400.
15. No API response and no UI element exposes reaction totals or reaction-derived data.
16. Only one wish can be featured at any time.
17. The raw visitor identifier is never stored; only its hash.
18. The shooting-star control is keyboard accessible, labeled, focus-visible, and respects reduced motion.
19. The site is dark by default, uses only system fonts, and works on desktop and mobile with no horizontal scroll.
20. Existing `GET /api/wishes/random` and `POST /api/wishes` contracts still work.
21. README, CLAUDE.md, and AGENTS.md match the implementation.

---

## 15. Out of Scope

Explicitly excluded (and prohibited unless a new product decision is made):

- Public reaction counts, likes, popularity metrics, engagement scores
- Rankings, leaderboards, "top"/"most liked"/trending sections, popularity badges
- Comments, replies, direct messaging
- User accounts, login, authentication, profiles, avatars, public usernames, followers
- Infinite scroll or other engagement loops, streaks, engagement notifications
- Editing wishes; deleting wishes through the public UI
- Social media integration, public user history
- Admin dashboard / admin UI (including for featured wishes)
- AI-generated wishes, cloud deployment, push notifications
- Multiple reaction types

The shooting-star reaction (FR-010) is **in scope**; it is a single, private, non-public reaction and not a "like".

---

## 16. Future Enhancements

Possible later improvements (not part of v2):

- Phase 2 reaction-based featured-wish selection (internal only; never displayed publicly): minimum age, minimum reactions, exclude recently featured, manual override.
- Stronger server-side reaction abuse prevention.
- Content reporting, moderation tools, rate limiting, spam protection, harmful-content filtering.
- Wish categories, languages, search, shareable anonymous wish links.
- Production hosting/database, backups, automated tests, CI/CD, monitoring.

---

## 17. Development Principles

- Prefer simple solutions over unnecessary abstractions.
- Do not add dependencies without a clear need.
- Preserve anonymity as a core product principle.
- Keep frontend and backend validation consistent.
- Preserve working backend and database behavior; make schema changes additive.
- Never expose reaction totals; never add social mechanics listed in §15.
- Test existing behavior after meaningful changes.
- Update this document when product behavior intentionally changes.
