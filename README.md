# Hidden Wishes

A peaceful web application where visitors can share wishes, hopes, dreams, and thoughts without creating an account or giving their name.

> **Status:** v2 (multi-page redesign) is implemented and visually polished: landing with a featured wish, Explore, Make a Wish, About, custom 404, and the private shooting-star reaction. Behavior is specified in [REQUIREMENT.md](REQUIREMENT.md) and [DESIGN.md](DESIGN.md); a concise current-state summary for new contributors and AI agents is in [PROJECT_STATE.md](PROJECT_STATE.md); plans are in [ROADMAP.md](ROADMAP.md). This is a development milestone: no production hosting, moderation, or rate limiting exists yet.

## Features

- **Anonymous sharing**: No accounts, usernames, or profiles required
- **Privacy-minded**: The app does not ask for or intentionally collect identity fields such as name, email, profile, or account information. The text of each submitted wish is stored, and a visitor may voluntarily include identifying information in what they write, so stored wish content must never be assumed to be free of it
- **Random wish discovery**: View random wishes submitted by others
- **Simple submission**: Submit wishes up to 500 characters
- **Responsive design**: Works on desktop and mobile
- **Minimal interface**: Clean, atmospheric design with smooth animations
- **Send a little light**: one private shooting-star reaction per wish; reaction counts are stored internally and never shown or returned by the API
- **Automated regression tests**: `npm test` (no extra dependencies) runs against isolated temporary databases

## Project Structure

```
hidden-wishes/
├── package.json
├── server.js             # Express server and API endpoints
├── database.js           # SQLite database module
├── seedData.js           # Seed wishes (incl. the featured wish)
├── seed.js               # Manual, idempotent seed script
├── test/                 # Automated regression tests (node:test)
├── test-utils/           # Test isolation helpers and the `npm test` runner
├── PROJECT_STATE.md      # Start here: concise current-state summary
├── ROADMAP.md            # Product and engineering roadmap
├── .gitignore            # Ignores database files and backups
├── REQUIREMENT.md        # Required behavior (source of truth)
├── DESIGN.md             # Visual/interaction design
├── README.md
├── CLAUDE.md / AGENTS.md # Guidance for coding agents
├── public/
│   ├── index.html        # Landing (/)
│   ├── wishes.html       # Explore (/wishes)
│   ├── make-a-wish.html  # (/make-a-wish)
│   ├── about.html        # (/about)
│   ├── 404.html
│   ├── favicon.svg
│   ├── styles.css
│   └── js/               # common.js + one script per page
└── data/
    ├── wishes.db         # Local development database (git-ignored, created at runtime)
    └── backups/          # Local backups (git-ignored)
```

Routes: `/` landing, `/wishes` explore (6 random wishes), `/make-a-wish`, `/about`; unknown routes show the custom 404 page.

## Technical Stack

- **Backend**: Node.js + Express.js
- **Database**: SQLite3
- **Frontend**: Vanilla HTML, CSS, and JavaScript
- **Security**: Backend validation, parameterized SQL queries, and safe DOM rendering

## Prerequisites

Before you can run Hidden Wishes, ensure you have the following installed:

- **Node.js**: 18.0.0 or higher (the test suite uses Node's built-in test runner and `fetch`)
- **npm**: 8.0.0 or higher (bundled with Node 18)

You can check your versions by running:

```bash
node --version
npm --version
```

## Installation

1. **Clone or navigate to the project directory**:

   ```bash
   cd hidden-wishes
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Seeding is automatic.** On startup the server creates/migrates the schema and, if the `wishes` table is empty, inserts the sample wishes (including the featured wish). `node seed.js` runs the same idempotent logic manually; it never inserts when wishes already exist.

## Running the Application

Start the server:

```bash
npm start
```

The application will be available at **http://localhost:3000**

You should see output like (the wish count depends on your database):

```
✨ Hidden Wishes app running at http://localhost:3000
📚 Database contains <N> wishes
```

## API Endpoints

### GET /api/wishes/random

Fetch random wishes from the database.

**Query Parameters:**

- `count` (optional): Number of wishes to return. Default 3 when omitted or non-numeric; values below 1 become 1 and values above 10 become 10.
- `exclude` (optional): A wish id to leave out of the result (invalid values are ignored).

**Response:**

```json
{
  "wishes": [
    {
      "id": 1,
      "text": "I wish my father knew how much I appreciate him.",
      "created_at": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

### POST /api/wishes

Submit a new wish.

**Request Body:**

```json
{
  "text": "I wish to travel the world someday."
}
```

**Requirements:**

- Text is required and must be a non-empty string
- Maximum 500 characters
- Whitespace is trimmed
- Text is trimmed before storage; the frontend renders it as plain text

**Response (201 Created):**

```json
{
  "success": true,
  "wish": {
    "id": 21,
    "text": "I wish to travel the world someday.",
    "created_at": "2025-01-15T14:45:00.000Z"
  }
}
```

### Additional endpoints

- `GET /api/wishes/featured` → `{ "wish": { id, text, created_at } }` or `{ "wish": null }`
- `GET /api/wishes/random?count=N&exclude=ID` — optional `exclude` omits one wish
- `POST /api/wishes/:id/react` with body `{ "visitorKey": "<random anonymous browser id>" }` → `{ "success": true }`. Returns 404 for an unknown wish; a duplicate reaction from the same browser is accepted without adding a second one. No endpoint ever returns reaction counts.

### GET /api/health

Health check endpoint.

**Response:**

```json
{
  "status": "ok",
  "wishCount": 20
}
```

## Database Schema

### wishes table

| Column     | Type                  | Description                     |
| ---------- | --------------------- | ------------------------------- |
| id         | INTEGER (PRIMARY KEY) | Auto-incrementing wish ID       |
| text       | TEXT                  | The original trimmed wish text  |
| created_at | DATETIME              | Timestamp when wish was created |

Additive v2 changes: `wishes.is_featured INTEGER NOT NULL DEFAULT 0` (at most one featured wish, enforced by application logic and a partial unique index) and a new `wish_reactions(id, wish_id, visitor_key_hash, created_at, UNIQUE(wish_id, visitor_key_hash))` table. Only a hash of the anonymous browser identifier is stored.

### Migration approach and git tracking

- On every startup the schema is migrated non-destructively: `CREATE TABLE IF NOT EXISTS wish_reactions …`; `wishes.is_featured` is added only if `PRAGMA table_info(wishes)` shows it missing; a partial unique index allows at most one featured wish. Existing rows are never deleted or rewritten. If a wish is already featured it is left alone on every startup; only when none is featured is the initial featured wish text flagged (or inserted first if missing).
- Back up `data/wishes.db` before upgrading an existing install (this repo's database was backed up to `data/backups/` before the v2 migration; that folder is git-ignored).
- `data/wishes.db` is the local development database and is **not tracked by git** (`data/*.db` is in `.gitignore`); fresh clones create and seed their own. Your local file may contain development test rows (XSS inputs, "AAAA…", etc.) to clean before any public deployment. The database existed in earlier Git history, which has not been rewritten (see ROADMAP.md, "Repository history review").
- If you are updating a checkout that still tracked `data/wishes.db`, back the file up before pulling the commit that untracks it: Git removes a file that a pulled commit deletes from the repository. Switching to an older commit or branch that still tracks the file can likewise overwrite your local copy.

## Security Features

- **Input validation**: All input is validated on the backend
- **Safe rendering**: Wish content is rendered with `textContent`, so markup is displayed as plain text
- **Parameterized queries**: SQL is protected against injection attacks
- **Safe errors**: Failures return generic messages and HTTP status codes, never stack traces, file paths, or database details
- **No identity fields**: The application does not ask for or intentionally collect names, emails, profiles, or account information. Wish text itself is stored as written and may contain identifying information if the visitor chooses to include it

## Design Philosophy

- **Minimal**: No unnecessary features or distractions
- **Peaceful**: Soft colors, plenty of whitespace, smooth animations
- **Anonymous by design**: No identity is requested for wish submission (this does not stop a visitor from typing identifying details into their wish)
- **Responsive**: Works seamlessly on any device
- **Accessible**: Clear typography, good contrast, semantic HTML

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `DB_PATH` | `data/wishes.db` | SQLite database file. The default is the local development database. Set it to use another file (production, experiments). The parent folder is created if needed. A blank value is an error, never a silent fallback. |

```bash
DB_PATH=/var/lib/hidden-wishes/wishes.db PORT=8080 npm start
```

PowerShell: `$env:DB_PATH="D:\data\wishes.db"; npm start`

A fresh clone needs no database file: `npm install && npm start` creates `data/wishes.db` and seeds it from `seedData.js`.

## Testing

```bash
npm test
```

The suite uses only Node's built-in test runner (Node 18+); there are no test dependencies. At the time of writing it has **162 automated test cases across 8 test files, with 570 assertions, all passing.** On Node 18, `npm test` prints `# tests 8` because it reports each of the 8 test files as one subprocess result; that is not the number of test cases.

It covers wish creation and validation (including the 500/501-character boundary), `count` default/min/max and `exclude` behavior, XSS and SQL-injection handling, the featured wish (including that an existing featured wish survives restarts), reaction hashing, deduplication and "no reaction counts anywhere", page routes, API routes and 404s, safe error responses, startup seeding, additive migration of an older database, persistence across restarts, isolation of the test databases, and the browser-free frontend helpers. The tests are HTTP/database/unit-style; they do not drive a real browser.

- **Isolation:** every test starts the real server (`node server.js`) as a child process against its own temporary database (`<os temp>/hw-test-*/test.db`) and deletes it afterwards. The helpers refuse to run against any other path, so tests cannot touch `data/wishes.db`. `npm test` also checks that the development database's SHA-256, size and modified time are identical before and after the run.
- **Details of one file:** `node test/wishes.test.js` prints every individual test case (`npm test` reports one result per file).
- **Do not use the dev server during a run:** if `data/wishes.db` changes while `npm test` runs (for example you submit a wish in a running dev server), the runner reports a failure even though the tests only used temporary databases.
- Browser-level (end-to-end) tests are not part of `npm test` yet; see ROADMAP.md.

## Customization

### Change the port

Set the `PORT` environment variable:

```bash
PORT=4000 npm start
```

### Modify styling

Edit `public/styles.css` to customize colors, fonts, and animations.

### Add more sample wishes

Edit the `sampleWishes` array in `seedData.js`. Seeding only happens when the database has no wishes, so use a new database (for example `DB_PATH=data/experiment.db npm start`) to see changes.

## Limitations & Future Improvements

### Current Limitations

- No moderation or reporting system (wishes are published immediately)
- No rate limiting or spam protection
- No admin UI, and no way to edit or delete wishes after submission
- Reaction deduplication is per anonymous browser: clearing local storage, or deliberately sending another identifier, creates another reaction (counts are internal only)
- The reaction visitor-key hash is plain SHA-256 (no server-side salt yet)
- Reaction-based featured-wish selection and automatic landing-page wish rotation are deferred
- Browser-level end-to-end tests are a future optional layer
- Your local development database may contain test/junk wishes; it is not part of the repository
- Earlier Git commits still contain a previously tracked copy of the database; history has not been rewritten and must be reviewed before the repository is ever made public or broadly shared (see ROADMAP.md)
- No production hosting, domain, or backup strategy is configured yet
- Database stored locally (not suitable for multi-server deployments)

### Recommendations for Production

1. **Add moderation**: Implement a review queue or keyword filtering for inappropriate wishes
2. **Add rate limiting**: Use middleware like `express-rate-limit` to prevent abuse
3. **Add authentication for admin**: Implement admin panel for moderation/deletion
4. **Move to managed database**: Use PostgreSQL, MySQL, or cloud database for scalability
5. **Add caching**: Implement Redis to cache frequently accessed wishes
6. **Add monitoring**: Set up error logging (e.g., Sentry) and analytics
7. **Add HTTPS**: Require SSL/TLS in production
8. **Add data cleanup**: Implement automatic deletion of very old wishes
9. **Add captcha**: Use reCAPTCHA to prevent bot spam
10. **Add browser-level tests and CI**: HTTP/database/unit-style tests already exist (`npm test`); add end-to-end browser tests and a CI pipeline

## License

MIT

## Author

Created as a peaceful platform for anonymous wishes.
