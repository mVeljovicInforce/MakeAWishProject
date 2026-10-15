# Hidden Wishes Project

## Overview
A Node.js + Express backend with SQLite3 database and a static HTML/CSS/JS frontend. Visitors anonymously leave wishes, read random wishes, and quietly send "a little light" (a private shooting-star reaction) to wishes that touch them.

## Source of truth
- **`REQUIREMENT.md`** — required behavior (v2).- **`DESIGN.md`** — visual direction, tone, interaction design.
- Read both before changing product behavior; update `REQUIREMENT.md` when behavior intentionally changes.

## Status
v2 (multi-page redesign) is **implemented**. Automatic wish rotation on the landing page and reaction-based featured-wish selection are intentionally deferred.

## Quick Start
```bash
npm install          # install dependencies
npm start            # starts server on http://localhost:3000
node seed.js         # optional manual run of the same idempotent seed
```

The server migrates the schema and seeds an empty database automatically on startup (FR-008); `node seed.js` is an idempotent manual script using the same `seedData.js`.

To use a different port:
- PowerShell: `$env:PORT=4000; npm start`
- bash: `PORT=4000 npm start`

## Project Structure
- **`server.js`** — Entry point. Express app serving `public/` and defining API routes. Initializes the database on startup.
- **`database.js`** — SQLite3 helper. Additive schema migration, `wishes` (+ `is_featured`), `wish_reactions`, featured wish, seed-on-empty, reaction hashing. Database file: `data/wishes.db`.
- **`seedData.js`** — Seed wishes and the featured wish text.
- **`seed.js`** — Standalone, idempotent seed script.
- **`public/`** — `index.html`, `wishes.html`, `make-a-wish.html`, `about.html`, `404.html`, `styles.css`, `favicon.svg`, `js/` (`common.js` + per-page scripts).
- **`REQUIREMENT.md`, `DESIGN.md`, `README.md`, `AGENTS.md`** — documentation.
- `gap_analysis.md`, `IMPLEMENTATION_SUMMARY.md` — historical, superseded; do not treat as current.

## Routes
`/` landing, `/wishes` explore, `/make-a-wish`, `/about`; unknown non-API routes → custom 404 page.

## API Routes
- `GET /api/health` — health check (`{ status, wishCount }`)
- `GET /api/wishes/random?count=N&exclude=ID` — random wishes (`{ wishes: [...] }`, count clamped 1–10, default 3, optional `exclude`)
- `POST /api/wishes` — submit a wish (request body: `{ "text": "..." }`, **not** `wish`; responds `201 { success, wish }`)
- `GET /api/wishes/featured` — the single featured wish (`{ wish }` or `{ wish: null }`)
- `POST /api/wishes/:id/react` — body `{ "visitorKey": "..." }` → `{ "success": true }`; 404 unknown wish; duplicates idempotent

**Never expose reaction totals** in any API response or UI.

## Environment
- No `.env` file or environment variables required.
- Optional `PORT` env var (defaults to `3000`).

## Database
SQLite file at `data/wishes.db`, auto-created on server startup if missing. The committed file contains seed wishes plus development test rows. Do not delete, clean, or untrack it without explicit approval. Schema changes must be additive (see `REQUIREMENT.md` §6); back up first (`data/backups/` is git-ignored).

## Testing
No automated tests in the repo. Start the server, then:
- Open `http://localhost:3000` in a browser for the UI
- Test API endpoints with curl or an HTTP client
