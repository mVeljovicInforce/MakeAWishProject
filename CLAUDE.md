# Hidden Wishes Project

## Overview
A Node.js + Express backend with SQLite3 database and a static HTML/CSS/JS frontend. Users can submit and view wishes randomly.

## Quick Start
```bash
npm install          # install dependencies
node seed.js         # optional: seeds 20 sample wishes if DB is empty
npm start            # starts server on http://localhost:3000
```

To use a different port:
- PowerShell: `$env:PORT=4000; npm start`
- bash: `PORT=4000 npm start`

## Project Structure
- **`server.js`** — Entry point. Express app serving `public/` statically and defining API routes. Initializes database on startup.
- **`database.js`** — SQLite3 database helper. Creates/manages `wishes` table. Database file: `data/wishes.db`.
- **`seed.js`** — Optional standalone script. Inserts 20 sample wishes if table is empty; skips if already seeded.
- **`public/`** — Static frontend (HTML, CSS, JS).
- **`README.md`** — Full documentation including API endpoint details.

## API Routes
- `GET /` — Frontend UI
- `GET /api/health` — Health check
- `GET /api/wishes/random` — Random wish from database
- `POST /api/wishes` — Submit a new wish (request body: `{ "wish": "..." }`)

## Environment
- No `.env` file or environment variables required.
- Optional `PORT` env var (defaults to `3000`).

## Database
SQLite file at `data/wishes.db`, auto-created on server startup if missing. Already seeded from previous runs.

## Testing
Start the server, then:
- Open `http://localhost:3000` in a browser for the UI
- Test API endpoints with curl or an HTTP client
