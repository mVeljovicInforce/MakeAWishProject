# Hidden Wishes — Roadmap

This roadmap describes where the product is and where it may go. It is **not** a requirements document.
`REQUIREMENT.md` remains the source of truth for what is built and required today, and `DESIGN.md` for how it should feel. Nothing below the "Current product" section is committed scope until it is moved into `REQUIREMENT.md`.

Guiding principle (unchanged): *a quiet place where a stranger can leave a wish, and another stranger can send it a little light.* No public counts, rankings, comments, profiles, or engagement mechanics.

---

## 1. Current product — Hidden Wishes v2 (complete)

- Four pages: landing (`/`), Explore (`/wishes`), Make a Wish (`/make-a-wish`), About (`/about`), plus a custom 404.
- One manually featured wish on the landing page (`is_featured`), "Read another wish" for random wishes.
- Explore shows 6 random wishes at a time, with "Show me different wishes" and no infinite scroll.
- Anonymous wish submission (500 characters, validated on client and server).
- Private shooting-star reaction ("Send a little light"): one per wish per browser, hashed anonymous visitor key, counts stored internally and never exposed.
- Dark nocturnal visual identity, system fonts only, reduced-motion support, keyboard accessible, responsive down to 320px.
- Node.js + Express + SQLite, vanilla HTML/CSS/JS, additive and non-destructive migrations, automatic seeding of an empty database.
- Configurable database path (`DB_PATH`); the default `data/wishes.db` is a git-ignored local development database.
- Automated regression suite: 162 test cases across 8 test files (570 assertions), all passing, run against isolated temporary databases.

Intentionally deferred from v2: automatic landing-page wish rotation, and reaction-based featured-wish selection (internal only, never shown publicly).

---

## 2. Near-term engineering work

Goal: make the codebase safe to change and ready to be run by someone other than the author.

- **Automated regression tests in the repository.** *Done (API level):* `npm test` runs a dependency-free suite on Node's built-in runner covering API contracts, validation, XSS and SQL-injection handling, duplicate reactions, no reaction counts in any response, featured-wish rules, safe errors, migration, persistence, routing and 404s, and the frontend helpers. *Still open:* opt-in browser-level tests (keyboard, reduced motion, 320–1280px layout, star state surviving a reload, XSS rendering in a real browser), which need a browser and a dev dependency, so they stay a separate later step.
- **Development vs production database separation.** *Done:* `DB_PATH` selects the database file (default `data/wishes.db` is the local development database); tests use only temporary databases and `npm test` verifies the development database is untouched. *Still open:* choosing and documenting the production path as part of deployment.
- **Clean development data.** *Partly done:* `data/wishes.db` is no longer tracked by git (it is git-ignored, and fresh clones seed themselves). *Still open:* remove the test rows (XSS inputs, repeated characters, "hey", etc.) from the local development database before any public deployment. This needs an explicit decision.
- **Production configuration and environment handling.** Explicit environment variables (port, database path, salt for reaction hashing, environment name), sensible defaults, documented in the README.
- **Small known gaps.** Reaction anti-abuse beyond browser storage (deduplication can be bypassed by clearing local storage or sending another identifier); a server-side salt for the reaction visitor-key hash (currently plain SHA-256); review the weeks/months wording and any remaining UI copy before launch.
- **Deferred product features.** Automatic landing-page wish rotation and reaction-based featured-wish selection (internal only, never displayed publicly) remain deferred; there is no admin UI.

---

## 3. Public beta readiness

Goal: a small, real audience can use Hidden Wishes safely.

- **Content moderation and reporting strategy.** Decide how harmful, abusive, or personally identifying wishes are handled: reporting path, review process, removal, and what the product promises visitors. Wish text is stored as written and may contain identifying details, so this must be clear in the product and the About copy.
- **Rate limiting and spam protection.** Limits on wish submission and reactions; basic bot protection. Must respect the anonymity principle (no IP addresses stored in the application database unless explicitly decided otherwise).
- **Repository history review.** The SQLite database (`data/wishes.db`) has existed in Git history, including development and test wishes (for example XSS test strings and personal-sounding sample text). Git history has intentionally **not** been rewritten. Before the repository is ever made public or broadly shared, review whether the historical database commits contain personal or test content. If cleanup is needed, it will be a separate, explicit operation (never done automatically), with a backup first.
- **Database backup strategy.** Scheduled, tested backups and a documented restore procedure.
- **Deployment.** Hosting choice, process management, HTTPS, logging and error monitoring that does not capture visitor identity. No production hosting is configured yet.
- **Domain setup.** Domain, DNS, and TLS. No domain is configured yet.
- **Public beta testing.** Invite a limited group, collect feedback on tone, moderation load, and performance, and fix issues before a wider launch.

---

## 4. Future product expansion (exploratory, not scheduled)

### Personal Wish Walls

*Not part of v2. Not in `REQUIREMENT.md`. Not to be implemented without a separate product decision.*

**Idea.** Let people create private or semi-private wish walls for real-world occasions, such as:

- weddings and engagements
- birthdays and anniversaries
- graduations
- memorials
- company or team events
- other personal occasions

**Core experience.** A physical invitation can carry a QR code. A guest scans it and lands directly on that event's wish wall, where they can leave a wish immediately, with no unnecessary navigation. The visitor experience should keep the same quiet, personal feel as Hidden Wishes.

**Potential capabilities** (to be evaluated, not committed):

- unique wall URL / slug
- QR code generation
- custom title and event name
- customizable visual theme
- public or private wall
- moderation by the wall owner
- event expiration and archive
- export of wishes
- downloadable memory book / PDF
- owner account and wall management
- later subscription or paid tiers

**Open questions for when this is picked up.**

- How do owner accounts fit with a product whose core promise is "no accounts, no profiles"? Guests should remain anonymous; only wall owners would need an account.
- How are privacy, moderation responsibility, and data retention handled for private walls and memorials?
- How are the anonymity and "no popularity metrics" principles preserved on a wall (for example, reactions and any owner-facing views)?
- Which parts are free and which are paid?

### Other ideas worth revisiting later

- Reaction-based featured-wish selection (internal only, with minimum age, exclusion of recently featured wishes, and manual override).
- Optional slow landing-page wish rotation, if it can respect reading time and reduced motion.
- Languages and wish categories.
- Shareable anonymous wish links.
