# Hidden Wishes Project

## Start here
Read **`PROJECT_STATE.md`** first (concise current state), then `REQUIREMENT.md` (required behavior), `DESIGN.md` (visual/interaction direction) and `ROADMAP.md` (plans, not scope). Inspect the current code before suggesting changes. `gap_analysis.md` and `IMPLEMENTATION_SUMMARY.md` are historical (old MVP) and must not be used to infer requirements.

## Overview
A Node.js + Express backend with a SQLite3 database and a static HTML/CSS/JS frontend. Visitors anonymously leave wishes, read random wishes, and quietly send "a little light" (a private shooting-star reaction) to wishes that touch them. Calm, quiet, anonymous; not a social network.

## Status
Hidden Wishes **v2 is implemented and visually polished** (stable development milestone). Deferred on purpose: automatic landing-page wish rotation, and reaction-based featured-wish selection. Not built yet: moderation/reporting, rate limiting, admin UI, production hosting/domain. Personal Wish Walls (event walls with QR codes) is a future idea in `ROADMAP.md`, **not** current scope.

## Quick Start
```bash
npm install          # install dependencies
npm start            # starts server on http://localhost:3000
npm test             # automated regression tests (temporary databases only)
node seed.js         # optional manual run of the same idempotent seed
```
The server migrates the schema and seeds an empty database automatically on startup (FR-008). To change the port: PowerShell `$env:PORT=4000; npm start`; bash `PORT=4000 npm start`.

## Project Structure
- **`server.js`** — Express app: page routes, API routes, validation, JSON/HTML 404s, generic error handler. Initializes the database before listening.
- **`database.js`** — SQLite3 helper: `DB_PATH` resolution, additive migration, `wishes` (+ `is_featured`), `wish_reactions`, featured wish, seed-on-empty, reaction hashing.
- **`seedData.js`** — Seed wishes and the initial featured wish text. **`seed.js`** — manual idempotent seed script.
- **`public/`** — `index.html`, `wishes.html`, `make-a-wish.html`, `about.html`, `404.html`, `styles.css`, `favicon.svg`, `js/` (`common.js` + `landing.js`, `explore.js`, `make-a-wish.js`).
- **`test/`** — 8 `node:test` files. **`test-utils/`** — isolation helpers (`env.js`, `server.js`, `db.js`) and the `npm test` runner (`run-tests.js`).
- Docs: `PROJECT_STATE.md`, `REQUIREMENT.md`, `DESIGN.md`, `ROADMAP.md`, `README.md`, `AGENTS.md`.

## Routes
`/` landing, `/wishes` explore (6 random wishes), `/make-a-wish`, `/about`; unknown non-API routes → custom 404 page.

## API Routes
- `GET /api/health` — `{ status: "ok", wishCount }` (errors: `{ status: "error" }`)
- `GET /api/wishes/random?count=N&exclude=ID` — `{ wishes: [...] }`; count defaults to 3 (also when non-numeric), below 1 → 1, above 10 → 10; optional `exclude`
- `POST /api/wishes` — body `{ "text": "..." }` (**not** `wish`); trimmed, 1–500 chars; `201 { success, wish }`
- `GET /api/wishes/featured` — `{ wish }` or `{ wish: null }`
- `POST /api/wishes/:id/react` — body `{ "visitorKey": "..." }` → `{ "success": true }`; 404 unknown wish, 400 invalid input, duplicates idempotent
- Unknown `/api/*` → JSON 404 `{ error: "Not found" }`

**Never expose reaction totals** in any API response or UI.

## Environment
- Optional `PORT` (default `3000`).
- Optional `DB_PATH`: SQLite file to use (default `data/wishes.db`, the local development database). Blank is an error, never a fallback. Production will supply its own path.
- No `.env` file.

## Database
`data/wishes.db` is the local development database: git-ignored (`data/*.db`, journal/WAL files, `data/backups/`), auto-created and seeded on first start, and it may contain test/junk wishes. Do not delete, clean, move, or overwrite it without explicit approval. Schema changes must be additive and non-destructive; back up first. Earlier Git commits still contain a previously tracked copy of the database; Git history has **not** been rewritten and must be reviewed before the repository is made public or broadly shared. Never rewrite history without an explicit request.

## Testing
`npm test` runs the suite with Node's built-in runner (Node 18+, no dependencies): **162 test cases across 8 files, 570 assertions, all passing.** Node 18 prints `# tests 8` because it reports each file as one subprocess result; that is not the case count. `node test/<file>.test.js` shows individual cases.
- Every test file starts the real `node server.js` as a child process on its own temporary database (`<os temp>/hw-test-*`); `test-utils/` refuses any other path and never falls back to `data/wishes.db`. Tests that corrupt or sabotage a database do so only on their own temp database.
- `npm test` verifies `data/wishes.db` is unchanged (hash/size/mtime) after the run; using the dev server while tests run can make it report a false failure.
- Keep helpers outside `test/` (Node 18 executes every file in that folder). Tests are HTTP/database/unit-style; browser-level end-to-end tests are a future optional layer.
- Run `npm test` after meaningful backend changes.

## Development notes
- The test suite once exposed a real robustness bug: `addWish()` used a prepared-statement path whose failure emitted an unhandled error and could crash the server on a failed insert. It now uses `db.run()` with callback error handling, so database failures produce the normal generic HTTP 500. Keep database calls on callback-handled APIs (`run`/`get`/`all` helpers); do not reintroduce unhandled `prepare()` usage.
- The reaction visitor-key hash is plain SHA-256 today (no server-side salt yet).

## Known limitations
No rate limiting, moderation/reporting, or admin UI; reaction deduplication is per anonymous browser and can be bypassed (clearing local storage, sending another identifier); no end-to-end browser tests; no production hosting/domain; the dev DB may contain junk wishes.
