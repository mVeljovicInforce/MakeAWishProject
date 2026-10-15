# Hidden Wishes

A peaceful web application where visitors can share wishes, hopes, dreams, and thoughts without creating an account or giving their name.

> **Status:** v2 (multi-page redesign) is implemented: landing with a featured wish, Explore, Make a Wish, About, custom 404, and the private shooting-star reaction. Behavior is specified in [REQUIREMENT.md](REQUIREMENT.md) and [DESIGN.md](DESIGN.md).

## Features

- **Anonymous sharing**: No accounts, usernames, or profiles required
- **Privacy-minded**: The app does not ask for or intentionally collect identity fields such as name, email, profile, or account information. The text of each submitted wish is stored, and a visitor may voluntarily include identifying information in what they write, so stored wish content must never be assumed to be free of it
- **Random wish discovery**: View random wishes submitted by others
- **Simple submission**: Submit wishes up to 500 characters
- **Responsive design**: Works on desktop and mobile
- **Minimal interface**: Clean, atmospheric design with smooth animations
- **Send a little light**: one private shooting-star reaction per wish; reaction counts are stored internally and never shown or returned by the API

## Project Structure

```
hidden-wishes/
├── package.json
├── server.js             # Express server and API endpoints
├── database.js           # SQLite database module
├── seedData.js           # Seed wishes (incl. the featured wish)
├── seed.js               # Manual, idempotent seed script
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
    └── wishes.db         # SQLite database (created at runtime)
```

Routes: `/` landing, `/wishes` explore (6 random wishes), `/make-a-wish`, `/about`; unknown routes show the custom 404 page.

## Technical Stack

- **Backend**: Node.js + Express.js
- **Database**: SQLite3
- **Frontend**: Vanilla HTML, CSS, and JavaScript
- **Security**: Backend validation, parameterized SQL queries, and safe DOM rendering

## Prerequisites

Before you can run Hidden Wishes, ensure you have the following installed:

- **Node.js**: 14.0.0 or higher
- **npm**: 6.0.0 or higher

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

- `count` (optional): Number of wishes to return (1-10, default: 3)

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

Additive v2 changes: `wishes.is_featured INTEGER NOT NULL DEFAULT 0` (at most one featured wish, enforced in application code) and a new `wish_reactions(id, wish_id, visitor_key_hash, created_at, UNIQUE(wish_id, visitor_key_hash))` table. Only a hash of the anonymous browser identifier is stored.

### Migration approach and git tracking

- On every startup the schema is migrated non-destructively: `CREATE TABLE IF NOT EXISTS wish_reactions …`; `wishes.is_featured` is added only if `PRAGMA table_info(wishes)` shows it missing; a partial unique index allows at most one featured wish. Existing rows are never deleted or rewritten. The exact featured wish text is flagged if present, otherwise inserted.
- Back up `data/wishes.db` before upgrading an existing install (this repo's database was backed up to `data/backups/` before the v2 migration; that folder is git-ignored).
- `data/wishes.db` is still tracked by git and contains development test rows (XSS inputs, "AAAA…", etc.) to clean before any public deployment. Recommended: stop tracking it (`data/*.db` in `.gitignore`), since fresh clones now seed themselves. Not yet done; requires approval.

## Security Features

- **Input validation**: All input is validated on the backend
- **Safe rendering**: Wish content is rendered with `textContent`, so markup is displayed as plain text
- **Parameterized queries**: SQL is protected against injection attacks
- **No identity fields**: The application does not ask for or intentionally collect names, emails, profiles, or account information. Wish text itself is stored as written and may contain identifying information if the visitor chooses to include it

## Design Philosophy

- **Minimal**: No unnecessary features or distractions
- **Peaceful**: Soft colors, plenty of whitespace, smooth animations
- **Anonymous by design**: No identity is requested for wish submission (this does not stop a visitor from typing identifying details into their wish)
- **Responsive**: Works seamlessly on any device
- **Accessible**: Clear typography, good contrast, semantic HTML

## Customization

### Change the port

Set the `PORT` environment variable:

```bash
PORT=4000 npm start
```

### Modify styling

Edit `public/styles.css` to customize colors, fonts, and animations.

### Add more sample wishes

Edit the `sampleWishes` array in `seed.js` and run `node seed.js` again.

## Limitations & Future Improvements

### Current Limitations

- No moderation system (wishes are published immediately)
- No way to edit or delete wishes after submission
- Database stored locally (not suitable for multi-server deployments)
- No rate limiting (vulnerable to spam/abuse in production)
- Limited wish lifespan management

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
10. **Add testing**: Create unit and integration tests

## License

MIT

## Author

Created as a peaceful platform for anonymous wishes.
