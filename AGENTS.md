# Agent Instructions

## Project

Hidden Wishes is a small CommonJS Node.js application with an Express backend, SQLite3 persistence, and a vanilla HTML/CSS/JavaScript frontend. See [README.md](README.md) for the complete user-facing documentation and [CLAUDE.md](CLAUDE.md) for the project overview.

## Commands

- Install dependencies: `npm install`
- Start the server: `npm start`
- Run the equivalent development command: `npm run dev`
- Seed an empty database: `node seed.js`
- Default URL: `http://localhost:3000`
- PowerShell alternate port: `$env:PORT=4000; npm start`

There is currently no automated test, lint, or formatting command. Validate changes manually through the browser and the documented API endpoints.

## Architecture

- [server.js](server.js) owns Express setup, middleware, static hosting, API routes, request validation, and startup.
- [database.js](database.js) owns the SQLite connection, schema initialization, inserts, random reads, and counts. Keep SQL and data-access logic here.
- [seed.js](seed.js) is an idempotent standalone seed script that inserts sample wishes only when the table is empty.
- [public/index.html](public/index.html) owns semantic page structure.
- [public/app.js](public/app.js) owns browser state, fetch calls, form handling, rendering, and animations.
- [public/styles.css](public/styles.css) owns presentation, responsive behavior, and theme variables.
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

## Known Limitations

There is no moderation, rate limiting, authentication, deletion workflow, or automated test coverage. Treat these as separate improvements and keep unrelated refactors out of focused changes.
