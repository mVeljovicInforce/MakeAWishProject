# Agent Instructions

## Start here

Read [PROJECT_STATE.md](PROJECT_STATE.md) first, then [REQUIREMENT.md](REQUIREMENT.md) (required behavior), [DESIGN.md](DESIGN.md) (visual direction and tone) and [ROADMAP.md](ROADMAP.md) (plans, not scope). See [README.md](README.md) for user-facing docs and [CLAUDE.md](CLAUDE.md) for the project overview. Inspect the current code before proposing changes. `gap_analysis.md` and `IMPLEMENTATION_SUMMARY.md` describe the old MVP only; do not infer requirements from them.

## Project

Hidden Wishes is a small CommonJS Node.js application with an Express backend, SQLite3 persistence, and a vanilla HTML/CSS/JavaScript frontend. v2 (landing, Explore, Make a Wish, About, custom 404, shooting-star reaction, featured wish) is implemented and polished. Automatic landing rotation and reaction-based featuring are deferred. Personal Wish Walls is a future idea in ROADMAP.md, not current scope.

## Commands

- Install dependencies: `npm install`
- Start the server: `npm start` (or `npm run dev`)
- Seed an empty database manually: `node seed.js` (the server also seeds an empty database on startup)
- Run the automated tests: `npm test` (Node 18+, built-in runner, no dependencies)
- See individual test cases of one file: `node test/<file>.test.js`
- Use another database file: `DB_PATH=<file>` (default `data/wishes.db`, the local development database; blank is an error)
- Default URL: `http://localhost:3000`; PowerShell alternate port: `$env:PORT=4000; npm start`

There is no lint or formatting command. Run `npm test` after meaningful backend changes and verify UI changes in a browser.

## Architecture

- [server.js](server.js) owns Express setup, page routes, API routes, request validation, 404 handling, the generic error handler, and startup (initializes the database before listening).
- [database.js](database.js) owns `DB_PATH` resolution, the SQLite connection, additive migration, the featured wish, reactions (hashed visitor keys), seed-on-empty, and reads. Keep SQL and data-access logic here.
- [seedData.js](seedData.js) holds the seed wishes and the initial featured wish text; [seed.js](seed.js) is the idempotent manual seed script.
- `public/*.html` are the four pages plus `404.html`; `public/js/common.js` has shared helpers and each page has its own script (`landing.js`, `explore.js`, `make-a-wish.js`).
- [public/styles.css](public/styles.css) owns the dark theme tokens, layout, the shooting-star styles, and reduced-motion rules.
- `test/` holds 8 regression test files (162 test cases, 570 assertions; Node 18 shows `# tests 8` because it reports files). `test-utils/` holds the isolation helpers and the `npm test` runner. Keep helpers outside `test/` (Node 18 runs every file in that folder as a test).
- Runtime data is stored in `data/wishes.db` by default (override with `DB_PATH`).

## Conventions

- Use CommonJS modules with `require` and `module.exports`.
- Keep the database helper's Promise-based API when changing database operations, and keep failures callback-handled: `addWish()` once used `db.prepare()`, whose failed insert emitted an unhandled error and could crash the server (found by the test suite); it now uses `db.run()` so failures become the generic HTTP 500. Do not reintroduce unhandled `prepare()` paths.
- Preserve parameterized SQL queries.
- Preserve safe DOM rendering with `textContent`; do not insert wish content with `innerHTML` (a test scans `public/js` for unsafe DOM APIs).
- Keep backend validation even when equivalent browser constraints exist.
- Follow the existing CSS custom-property, class-based, and responsive-media-query patterns.

## API Contracts

- `GET /api/wishes/random` accepts optional `count` (default 3 when omitted or non-numeric; below 1 → 1; above 10 → 10) and optional `exclude`.
- `POST /api/wishes` expects `{ "text": "..." }`, not `{ "wish": "..." }`; text is trimmed and limited to 500 characters by the backend.
- `GET /api/wishes/featured` returns `{ wish }` or `{ wish: null }`.
- `POST /api/wishes/:id/react` with `{ "visitorKey": "..." }` returns `{ "success": true }` (404 unknown wish, 400 invalid input, duplicates ignored).
- `GET /api/health` returns `{ status, wishCount }`, or `{ status: "error" }` on failure.
- Unknown `/api/*` routes return JSON 404; unknown website routes return the custom 404 page.

## Testing Rules

- Every test uses its own temporary database (`<os temp>/hw-test-*`) with the real server spawned as a child process; the helpers refuse any other path and never fall back to the development database.
- A test that modifies or corrupts a database may do so only on its own temporary test database; cleanup must only remove its own temporary directory.
- `npm test` checks that `data/wishes.db` is unchanged afterwards; using the dev server while it runs can cause a false failure.
- Tests are HTTP/database/unit-style; browser-level end-to-end tests are a future optional layer.

## Hard Rules

- Never expose reaction totals or reaction-derived data in any API response or UI. No likes, comments, rankings, trending, profiles, followers, engagement scores, or infinite scroll. Keep the quiet, anonymous product philosophy.
- The reaction is never called a "Like"; its copy is "Send a little light" / "Light sent".
- Store only a hash of the anonymous visitor key (`wish_reactions.visitor_key_hash`, plain SHA-256 today), never the raw key, IP address, or user agent.
- Database schema changes must be additive and non-destructive. Do not delete, clean, move, or overwrite `data/wishes.db` (the git-ignored local development database) without explicit approval. Never rewrite Git history without an explicit request; earlier commits still contain a previously tracked database copy, which must be reviewed before the repository is made public.
- Dark by default; system fonts only (no external font dependencies).

## Known Limitations

No rate limiting, moderation/reporting, or admin UI; reaction deduplication is per anonymous browser and can be bypassed; no end-to-end browser tests; no production hosting or domain; the local development database may contain junk wishes. Treat these as separate improvements and keep unrelated refactors out of focused changes.
