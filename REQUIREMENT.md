# Hidden Wishes — Requirements

## 1. Purpose

Hidden Wishes is a small anonymous full-stack web application where visitors can share private wishes, hopes, dreams, thoughts, or short confessions without creating an account.

The application should feel calm, personal, minimal, and slightly mysterious.

The primary goal of the first version is to provide a simple experience:

1. A visitor opens the website.
2. The visitor sees several random wishes submitted by other people.
3. The visitor may load another set of random wishes.
4. The visitor may anonymously submit a new wish.
5. The submitted wish is stored and may later appear to other visitors.

This document defines the requirements for the MVP.

---

## 2. Technology

The MVP should use:

- Node.js
- Express
- SQLite
- Vanilla HTML
- Vanilla CSS
- Vanilla JavaScript

The project should remain simple and understandable. Additional frameworks should not be introduced unless there is a clear technical reason.

---

## 3. Architecture

The application should use a simple client-server architecture.

### Frontend

The frontend is responsible for:

- Rendering the landing page.
- Displaying random wishes.
- Allowing the user to request another set of wishes.
- Allowing the user to submit a wish.
- Performing basic client-side validation.
- Calling the backend API using `fetch()`.
- Updating the UI without requiring a full page reload.

### Backend

The backend is responsible for:

- Serving the frontend.
- Providing REST API endpoints.
- Validating all submitted data.
- Reading and writing wishes in SQLite.
- Returning appropriate HTTP status codes and JSON responses.
- Handling unexpected errors safely.

### Database

SQLite should be used for persistent storage.

A separate database server is not required for the MVP.

---

## 4. Functional Requirements

### FR-001 — Landing Page

When a visitor opens the application, the landing page must display:

- The application title: **Hidden Wishes**
- A short introductory subtitle or message.
- Three randomly selected wishes.
- A control for loading another random set of wishes.
- A form or section for submitting a new wish.

The page should work without requiring authentication.

---

### FR-002 — Display Random Wishes

The application must display random wishes retrieved from the backend.

Default behavior:

- Display 3 wishes.
- Wishes should be selected randomly from the database.
- Wishes should not require a full page refresh to change.
- Clicking **Show me other wishes** should request another set from the backend.

If fewer than 3 wishes exist, return and display the available wishes.

The frontend should handle duplicate wishes gracefully if the database contains only a small number of records.

---

### FR-003 — Submit a Wish

A visitor must be able to submit a wish using a text area.

Rules:

- The wish must contain at least one non-whitespace character.
- Leading and trailing whitespace must be removed.
- Maximum length: 500 characters.
- The wish must be submitted anonymously.
- The user must not be required to enter a name, username, email address, or profile information.
- The application must not intentionally store personally identifying information in the application database.

The submission should use JavaScript and `fetch()` so the page does not require a full reload.

---

### FR-004 — Character Counter

The wish input must display a character counter.

The user should be able to see how many characters remain before reaching the 500-character limit.

The form should prevent submission of content that exceeds the limit.

Backend validation must still enforce the same rule independently.

---

### FR-005 — Successful Submission

After a valid wish is submitted:

- The backend must store it in the SQLite database.
- The frontend must display a success message.
- The input field must be cleared.
- The character counter must reset.

A suitable success message may be similar to:

> Your wish is now part of the collection.

The exact wording may change as part of UI refinement.

---

### FR-006 — Invalid Submission

Invalid input must not be stored.

Examples:

- Empty input.
- Input containing only spaces, tabs, or line breaks.
- Input longer than 500 characters.

The backend should return an appropriate client error response.

The frontend should show a clear, non-technical validation message.

---

### FR-007 — Persistence

Submitted wishes must remain stored after:

- Browser refresh.
- Browser close and reopen.
- Node.js server restart.

SQLite is the source of persistence.

---

### FR-008 — Seed Data

When the application is first initialized, the database should contain sample wishes so the page does not appear empty.

Seed requirements:

- Approximately 15–25 wishes.
- A mixture of serious, hopeful, funny, romantic, family-related, ambitious, and ordinary wishes.
- The sample text should sound natural rather than overly polished or artificial.
- Seed data should not be inserted repeatedly every time the server starts.

Example style:

- `I hope my dog lives forever.`
- `I wish I called my dad more often.`
- `I really need some good news this week.`
- `I want to finally finish something I started.`

---

### FR-009 — Wish Age / Timestamp

Each wish should store its creation timestamp.

If the UI displays relative time, examples may include:

- just now
- 5 minutes ago
- 2 hours ago
- yesterday
- 4 days ago

Seed data should use varied timestamps so all sample wishes do not appear to have been created at the same moment.

Exact relative-time wording is a UI decision and may be refined later.

---

## 5. API Requirements

### GET `/api/wishes/random`

Returns random wishes.

Example:

```http
GET /api/wishes/random?count=3
```

Expected response:

```json
{
  "wishes": [
    {
      "id": 12,
      "text": "I hope my dog lives forever.",
      "created_at": "2026-09-25T12:30:00.000Z"
    }
  ]
}
```

Requirements:

- `count` should default to 3 when omitted.
- The backend should apply a reasonable maximum value to prevent excessive requests.
- Invalid query values should be handled safely.

---

### POST `/api/wishes`

Creates a new wish.

Example request:

```json
{
  "text": "I want to finally learn how to play guitar."
}
```

Expected success response:

```json
{
  "success": true,
  "wish": {
    "id": 42,
    "text": "I want to finally learn how to play guitar.",
    "created_at": "2026-09-25T15:00:00.000Z"
  }
}
```

Requirements:

- Validate `text`.
- Trim surrounding whitespace.
- Reject empty input.
- Reject input longer than 500 characters.
- Use parameterized SQL queries.
- Return an appropriate HTTP status code.

---

## 6. Database Requirements

The SQLite database must contain a `wishes` table.

Minimum schema:

```sql
CREATE TABLE wishes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

The database file should be stored inside the project, for example:

```text
/data/wishes.db
```

The actual path may differ if there is a good technical reason.

---

## 7. Security Requirements

### SR-001 — XSS Protection

Submitted wishes must never be interpreted as executable HTML or JavaScript.

For example, this input:

```html
<script>alert('test')</script>
```

must be displayed as text and must not execute.

User-generated content should be inserted into the DOM using safe text-based methods such as `textContent`, not `innerHTML`.

---

### SR-002 — SQL Injection Protection

All database operations involving user-provided values must use parameterized SQL queries.

User input must never be concatenated directly into SQL statements.

---

### SR-003 — Backend Validation

Frontend validation is not sufficient by itself.

All input rules must also be enforced on the backend.

---

### SR-004 — Error Exposure

Unexpected backend errors must not expose:

- stack traces
- local file paths
- database internals
- secrets
- unnecessary implementation details

to the browser.

Detailed errors may still be logged locally for development.

---

## 8. Privacy Requirements

The MVP should not require or intentionally collect:

- Names.
- Usernames.
- Email addresses.
- Phone numbers.
- Profiles.
- Account credentials.
- Location.
- IP addresses in the application database.

The application should clearly communicate that wishes are anonymous.

Because users may voluntarily type personal information into the wish itself, the UI should not claim that submitted text can never contain identifying information.

---

## 9. UI / UX Requirements

The visual style should be:

- Minimal.
- Calm.
- Modern.
- Personal.
- Atmospheric.
- Responsive.

Suggested characteristics:

- Large typography.
- Generous whitespace.
- Soft gradients.
- Subtle animations.
- Smooth transitions.
- Wish cards or floating wish elements.
- Simple interactions.

The site must remain usable on:

- Desktop.
- Tablet.
- Mobile.

External UI frameworks are not required.

---

## 10. Error Handling

The UI should gracefully handle:

- API request failure.
- Database failure.
- Invalid wish submission.
- Empty database.
- Slow response.
- Unexpected server errors.

The application should display a user-friendly message instead of failing silently.

Example:

> Something went wrong. Please try again.

---

## 11. Accessibility

The MVP should follow basic accessibility practices.

Requirements:

- Form controls should have labels or accessible names.
- Buttons should be usable with a keyboard.
- Text must have sufficient contrast.
- Focus states should remain visible.
- Important interactions should not depend only on animation.
- The textarea should be usable without a mouse.

---

## 12. Project Structure

Recommended structure:

```text
/
├── package.json
├── server.js
├── database.js
├── REQUIREMENT.md
├── README.md
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
└── data/
    └── wishes.db
```

The implementation may use a slightly different structure if it remains simple and clearly organized.

---

## 13. README Requirements

The project README should explain:

- What Hidden Wishes is.
- Technology used.
- Project structure.
- Prerequisites.
- Dependency installation.
- How to run the application locally.
- Default localhost URL.
- Available API endpoints.
- SQLite database location.
- Known limitations.

Example local startup flow:

```bash
npm install
npm start
```

Then:

```text
http://localhost:3000
```

---

## 14. Acceptance Criteria

The MVP is considered complete when all of the following are true:

1. The project can be installed using `npm install`.
2. The application can be started locally.
3. The landing page loads successfully.
4. Three random wishes are displayed.
5. The user can request another set of wishes without reloading the page.
6. The user can submit a valid anonymous wish.
7. The new wish is stored in SQLite.
8. The wish remains stored after a server restart.
9. Empty wishes are rejected.
10. Wishes longer than 500 characters are rejected.
11. HTML/script input does not execute in the browser.
12. Database queries use parameterized statements.
13. API errors are handled gracefully.
14. The page works on both desktop and mobile layouts.
15. Seed data is available when the database is first initialized.
16. Seed data is not duplicated on every startup.
17. The README contains enough information for another developer to run the project.

---

## 15. Out of Scope for MVP

The following features are intentionally excluded from the first version:

- User accounts.
- Login or authentication.
- User profiles.
- Likes.
- Comments.
- Replies.
- Followers.
- Direct messaging.
- Editing wishes.
- Deleting wishes through the public UI.
- Social media integration.
- Public user history.
- Admin dashboard.
- AI-generated wishes.
- Cloud deployment.
- Push notifications.

These may be considered later.

---

## 16. Future Enhancements

Possible later improvements include:

- Content reporting.
- Moderation tools.
- Rate limiting.
- Spam protection.
- Profanity or harmful-content filtering.
- Admin moderation dashboard.
- Wish categories.
- Languages.
- Search.
- Shareable anonymous wish links.
- Optional reactions.
- Animated visualizations of wishes.
- Production hosting.
- Production database.
- Automated tests.
- CI/CD pipeline.
- API rate monitoring.
- Database backups.

These are not required for the current MVP.

---

## 17. Development Principles

When modifying the project:

- Prefer simple solutions over unnecessary abstractions.
- Do not add dependencies without a clear need.
- Preserve anonymity as a core product principle.
- Keep frontend and backend validation consistent.
- Avoid changing working functionality unless required.
- Test existing behavior after meaningful changes.
- Update this requirement document when product behavior intentionally changes.

### FR-010 — React to a Wish

A visitor must be able to leave one supportive reaction on a wish.

The reaction represents that the wish touched or resonated with the visitor.

#### Behavior

- The reaction must be represented visually as a shooting-star control.
- The reaction must not be presented as a traditional "Like".
- Suggested interaction text: `Send a little light`.
- A visitor may react only once to a particular wish.
- The reaction count must be stored by the backend.
- The reaction count must never be displayed publicly.
- No ranking, score, popularity badge, or visible reaction total may be shown.
- Reaction data may later be used internally to help select featured wishes for the landing page.

#### Early Visitor Tracking

For the initial implementation, the frontend may use browser `localStorage` to remember which wishes the current browser has already reacted to.

This is an MVP convenience and must not be treated as strong identity or abuse prevention.

A more robust solution may be introduced before public production deployment.

#### Accessibility

The reaction control must:

- be keyboard accessible
- have a visible focus state
- include an accessible label
- not depend only on hover
- respect `prefers-reduced-motion`

Suggested accessible label:

`Send a little light to this wish`

#### Validation / API

The backend must validate the referenced wish before recording a reaction.

Requests for non-existent wishes must fail with an appropriate HTTP status code.

Repeated reactions from the same visitor mechanism should not increase the stored count more than once.