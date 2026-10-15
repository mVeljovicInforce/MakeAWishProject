# Hidden Wishes — Project State

Read this first in every new session. It is a concise snapshot of the repository at the stable **v2 development milestone** (v2 implemented, visually polished, 162 test cases passing). If it disagrees with the code, trust the code and tell the user; if it disagrees with `REQUIREMENT.md`, `REQUIREMENT.md` wins for required behavior.

## 1. Product summary
Hidden Wishes is a calm, anonymous place to leave a short wish and read strangers' wishes: *a quiet place where a stranger can leave a wish, and another stranger can send it a little light.* It is deliberately not a social network: no accounts, profiles, comments, likes, rankings, trending, followers, or public counts. Visitors can read a featured wish, browse random wishes, anonymously submit a wish (max 500 characters), and send one private shooting-star reaction ("Send a little light" / "Light sent") to a wish. Dark nocturnal design, system fonts only, accessible, reduced-motion aware, responsive down to 320px.

## 2. Current architecture
Node.js (18+) + Express 4 + SQLite3, CommonJS, vanilla HTML/CSS/JS, two runtime dependencies (`express`, `sqlite3`), no frameworks, no external fonts/CDNs.
- `server.js` — page routes, API routes, validation, JSON/HTML 404s, generic error handler; initializes the DB before listening.
- `database.js` — `DB_PATH` resolution, additive migration, featured wish, reactions (hashed), seed-on-empty.
- `seedData.js` / `seed.js` — seed wishes (21, including the initial featured wish) / manual idempotent seeder.
- `public/` — 4 pages + `404.html`, `styles.css`, `favicon.svg`, `js/` (`common.js` + one script per page).
- `test/` + `test-utils/` — regression suite and isolation helpers.

## 3. Pages / routes
`/` landing (hero, one featured wish, "Read another wish", links; no form, no reaction control) · `/wishes` Explore (6 random wishes, "Show me different wishes", star reaction on each, no infinite scroll) · `/make-a-wish` (textarea, `n / 500` counter, "Release my wish", success state "It's out there now.") · `/about` · unknown website routes → custom 404 page.

## 4. API endpoints
`GET /api/health` · `GET /api/wishes/random?count=&exclude=` (default 3; <1→1; >10→10; non-numeric→3) · `GET /api/wishes/featured` (`{wish}` or `{wish:null}`) · `POST /api/wishes` (`{text}` → 201 `{success, wish}`) · `POST /api/wishes/:id/react` (`{visitorKey}` → `{success:true}`; 404/400; duplicates idempotent) · unknown `/api/*` → JSON 404. Public responses contain only `id`, `text`, `created_at` (+ `success`/`status`/`wishCount`); never reaction counts or `is_featured`. Errors are generic (no stack traces, paths, or DB details).

## 5. Database strategy
- SQLite file chosen by `DB_PATH`; default `data/wishes.db` = local development database. A blank `DB_PATH` is an error. Production will supply its own path later.
- Schema: `wishes(id, text, created_at, is_featured)` (+ partial unique index: at most one featured wish) and `wish_reactions(id, wish_id, visitor_key_hash, created_at, UNIQUE(wish_id, visitor_key_hash))`. Migrations are additive and run on every startup; an empty DB is seeded automatically.
- Featured wish: if one is already featured it is never changed on startup; only when none is featured is the initial wish flagged (or inserted).
- Reactions: the browser generates `crypto.randomUUID()` in `localStorage`; the server stores only SHA-256 of it (no server-side salt yet), never the raw key, IP, or user agent.
- **Git:** database files and SQLite journal/WAL files are git-ignored and `data/wishes.db` is no longer tracked, but it stays on disk. **Earlier commits still contain a previously tracked copy of the database; history has not been rewritten.** It must be reviewed (test/junk and personal-sounding content) before the repository is ever made public or broadly shared; any cleanup is a separate, explicit operation.
- The local dev DB may contain junk/test wishes; never delete, clean, move, or overwrite it without explicit approval.

## 6. Testing status
`npm test` (Node built-in runner, no dependencies) → **162 test cases in 8 files, 570 assertions, all passing.** Node 18 prints `# tests 8` because it reports each file as one subprocess result; the case count is 162. Run `node test/<file>.test.js` for individual cases. Every file spawns the real `node server.js` against its own temp database (`<os temp>/hw-test-*`); helpers refuse any other path and never fall back to the dev DB; `npm test` also verifies the dev DB is unchanged (using the dev server during a run can cause a false failure). Coverage: wishes/validation/count/exclude, XSS, SQL-injection behavior, featured wish, reaction hashing/dedup/privacy, routes and 404s, safe errors, startup/migration/persistence, isolation, frontend helpers. Tests are HTTP/database/unit-style; **no browser-level end-to-end tests yet**.
Notable: the suite exposed a real bug — `addWish()` used a `db.prepare()` path whose failed insert emitted an unhandled error and could crash the server; it now uses callback-handled `db.run()`, so failures return the generic HTTP 500.

## 7. Important product rules
- Never expose reaction counts (UI or API). One reaction type, never called a "Like".
- No social mechanics: comments, rankings, trending, profiles, followers, engagement scores, infinite scroll.
- Preserve anonymity: no names/emails/accounts/IP storage. Wish text is stored as written and may contain identifying details; never claim it can't.
- Render wishes with `textContent` only; keep SQL parameterized; validate on the backend.
- Quiet tone and motion; respect `prefers-reduced-motion`; dark by default; system fonts only.
- Keep API contracts stable unless `REQUIREMENT.md` is deliberately changed.

## 8. Known limitations
No rate limiting · no moderation/reporting · no admin UI · reaction dedup is per anonymous browser and can be bypassed (clearing local storage or sending another identifier) · plain (unsalted) SHA-256 visitor-key hash · automatic landing rotation deferred · reaction-based featured-wish selection deferred · no browser end-to-end tests · no production hosting, domain, or backup strategy · dev DB may hold junk wishes · historical commits contain the old database.

## 9. Current roadmap priority
`ROADMAP.md` has the detail. Likely order, subject to the user's decision: (1) public-beta safety — moderation/reporting strategy and rate limiting/spam protection; (2) production configuration (environment variables, reaction-hash salt), backups; (3) deployment and domain; (4) review of Git history before any public sharing; (5) optional browser-level tests/CI. **Personal Wish Walls** (private/semi-private walls for weddings, birthdays, memorials, team events, etc., reached by a QR code on a physical invitation, with owner moderation, theming, export/memory book, owner accounts, and possible paid tiers) is a **future direction only — not current scope and not in `REQUIREMENT.md`; do not implement or design toward it without a separate product decision.**

## 10. Sources of truth
1. `REQUIREMENT.md` — required behavior (FR/SR/acceptance criteria).
2. `DESIGN.md` — visual direction, tone, interaction design.
3. `ROADMAP.md` — plans and future ideas (not scope).
4. `PROJECT_STATE.md` (this file), `README.md`, `CLAUDE.md`, `AGENTS.md` — summaries/guidance; keep them consistent with the above.
5. The code and tests — what actually exists. `package.json` for scripts/engines.
`gap_analysis.md` and `IMPLEMENTATION_SUMMARY.md` are **historical/superseded** (old MVP); never infer requirements from them.

## 11. Instructions for a new coding agent
- Read this file first, then `REQUIREMENT.md`, `DESIGN.md`, and `ROADMAP.md`; inspect the current code before suggesting changes; don't infer requirements from stale historical docs.
- Do not expose reaction counts; do not introduce social-media mechanics; preserve anonymity and the quiet product philosophy.
- Do not modify, delete, clean, move, or overwrite the development database, and do not rewrite Git history, without explicit approval; schema changes must be additive.
- Use the isolated test setup (`test-utils/`); never point a test at `data/wishes.db`; keep test helpers outside `test/`.
- Run `npm test` after meaningful backend changes; check UI changes in a browser (desktop and ~375px, keyboard, reduced motion).
- Update `REQUIREMENT.md` (and this file) when behavior intentionally changes; keep unrelated refactors out of focused changes.
