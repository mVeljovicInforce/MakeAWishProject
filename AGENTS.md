# Agent Instructions

## Project

Hidden Wishes is a small CommonJS Node.js application with an Express backend, SQLite3 persistence, and a vanilla HTML/CSS/JavaScript frontend. See [README.md](README.md) for the complete user-facing documentation and [CLAUDE.md](CLAUDE.md) for the project overview.

## Source of truth

[REQUIREMENT.md](REQUIREMENT.md) defines required behavior (v2, multi-page redesign); [DESIGN.md](DESIGN.md) defines visual direction and tone. v2 is implemented. Automatic landing rotation and reaction-based featuring are deferred.

## Commands

- Install dependencies: `npm install`
- Start the server: `npm start`
- Run the equivalent development command: `npm run dev`
- Seed an empty database: `node seed.js`
- Default URL: `http://localhost:3000`
- PowerShell alternate port: `$env:PORT=4000; npm start`

There is currently no automated test, lint, or formatting command. Validate changes manually through the browser and the documented API endpoints.

## Architecture

- [server.js](server.js) owns Express setup, page routes, API routes, request validation, 404 handling, and startup (initializes the database before listening).
- [database.js](database.js) owns the SQLite connection, additive migration, featured wish, reactions (hashed visitor keys), seed-on-empty, and reads. Keep SQL and data-access logic here.
- [seedData.js](seedData.js) holds the seed wishes and the featured wish text; [seed.js](seed.js) is the idempotent manual seed script.
- `public/*.html` are the four pages plus `404.html`; `public/js/common.js` has shared helpers and each page has its own script (`landing.js`, `explore.js`, `make-a-wish.js`).
- [public/styles.css](public/styles.css) owns the dark theme tokens, layout, the shooting-star styles, and reduced-motion rules.
- Runtime data is stored in `data/wishes.db`.

## Conventions

- Use CommonJS modules with `require` and `module.exports`.
- Keep the database helper's Promise-based API when changing database operations.
- Preserve parameterized SQL queries.
- Preserve safe DOM rendering with `textContent`; do not insert wish content with `innerHTML`.
- Keep backend validation even when equivalent browser constraints exist.
- Follow the existing CSS custom-property, class-based, and responsive-media-query patterns.

## API Contracts

- `GET /api/wishes/random` accepts an optional `count` and clamps it to 1-10, defaulting to 3.
- `POST /api/wishes` expects `{ "text": "..." }`, not `{ "wish": "..." }`.
- Wish text is trimmed and limited to 500 characters by the backend.
- `GET /api/health` reports server status and the current wish count.

Also: `GET /api/wishes/featured`; optional `exclude` on `GET /api/wishes/random`; `POST /api/wishes/:id/react` with `{ "visitorKey": "..." }` returning `{ "success": true }` (404 unknown wish, 400 invalid input, duplicates ignored). Unknown `/api/*` routes return JSON 404.

## Hard Rules (v2)

- Never expose reaction totals or reaction-derived data in any API response or UI. No likes, comments, rankings, trending, profiles, followers, engagement scores, or infinite scroll.
- The reaction is never called a "Like"; its copy is "Send a little light".
- Store only a hash of the anonymous visitor key (`wish_reactions.visitor_key_hash`), never the raw key, IP address, or user agent.
- Database schema changes must be additive and non-destructive. Do not delete, clean, or untrack `data/wishes.db` without explicit approval.
- Dark by default; system fonts only (no external font dependencies).

## Known Limitations

There is no moderation, rate limiting, authentication, deletion workflow, or automated test coverage. Treat these as separate improvements and keep unrelated refactors out of focused changes.
