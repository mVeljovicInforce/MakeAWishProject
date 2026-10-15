const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { FEATURED_WISH, sampleWishes } = require('./seedData');

// Database location: DB_PATH if set, otherwise the local development database data/wishes.db.
// A DB_PATH that is set but blank is an error, never a silent fallback to the default database.
function resolveDbPath() {
  const configured = process.env.DB_PATH;
  if (configured === undefined) return path.join(__dirname, 'data', 'wishes.db');
  if (configured.trim() === '') throw new Error('DB_PATH is set but empty');
  return path.resolve(configured);
}

const dbPath = resolveDbPath();
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

db.configure('busyTimeout', 10000);

// Promise helpers around the callback API
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });
}

function normalizeTimestamp(timestamp) {
  if (!timestamp) return null;
  if (timestamp.includes('T')) return timestamp;
  return timestamp.replace(' ', 'T') + '.000Z';
}

function toPublicWish(row) {
  return { id: row.id, text: row.text, created_at: normalizeTimestamp(row.created_at) };
}

// Additive, non-destructive schema setup / migration. Never drops or rewrites existing data.
async function ensureSchema() {
  await run(
    `CREATE TABLE IF NOT EXISTS wishes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_featured INTEGER NOT NULL DEFAULT 0
    )`
  );

  const columns = await all('PRAGMA table_info(wishes)');
  if (!columns.some((c) => c.name === 'is_featured')) {
    await run('ALTER TABLE wishes ADD COLUMN is_featured INTEGER NOT NULL DEFAULT 0');
  }

  // At most one featured wish, enforced by the database as well as by setFeaturedWish().
  await run(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_wishes_single_featured ON wishes(is_featured) WHERE is_featured = 1'
  );

  await run(
    `CREATE TABLE IF NOT EXISTS wish_reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wish_id INTEGER NOT NULL REFERENCES wishes(id),
      visitor_key_hash TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (wish_id, visitor_key_hash)
    )`
  );
}

// Uses db.run (errors reach the callback) rather than db.prepare: a failing prepare() emits an
// unhandled 'error' event that would crash the whole server instead of producing a 500.
function addWish(text, createdAt = null) {
  const isoTimestamp = createdAt || new Date().toISOString();
  const sql = createdAt
    ? 'INSERT INTO wishes (text, created_at) VALUES (?, ?)'
    : 'INSERT INTO wishes (text) VALUES (?)';
  const params = createdAt ? [text, createdAt] : [text];
  return run(sql, params).then(({ lastID }) => ({ id: lastID, text, created_at: isoTimestamp }));
}

function getRandomWishes(count = 3, excludeId = null) {
  const sql = excludeId
    ? 'SELECT id, text, created_at FROM wishes WHERE id != ? ORDER BY RANDOM() LIMIT ?'
    : 'SELECT id, text, created_at FROM wishes ORDER BY RANDOM() LIMIT ?';
  const params = excludeId ? [excludeId, count] : [count];
  return all(sql, params).then((rows) => rows.map(toPublicWish));
}

function getWishCount() {
  return get('SELECT COUNT(*) as count FROM wishes').then((row) => (row ? row.count : 0));
}

function wishExists(id) {
  return get('SELECT 1 AS found FROM wishes WHERE id = ?', [id]).then(Boolean);
}

// Featured wish ---------------------------------------------------------

function getFeaturedWish() {
  return get('SELECT id, text, created_at FROM wishes WHERE is_featured = 1 LIMIT 1').then((row) =>
    row ? toPublicWish(row) : null
  );
}

// Makes exactly one wish featured: clears every other flag, then sets this one.
async function setFeaturedWish(id) {
  await run('BEGIN IMMEDIATE');
  try {
    await run('UPDATE wishes SET is_featured = 0 WHERE is_featured = 1 AND id != ?', [id]);
    const result = await run('UPDATE wishes SET is_featured = 1 WHERE id = ?', [id]);
    if (result.changes !== 1) throw new Error('Wish to feature does not exist');
    await run('COMMIT');
  } catch (err) {
    await run('ROLLBACK').catch(() => {});
    throw err;
  }
}

// Ensures a featured wish exists. If one is already featured it is left untouched; only when none
// exists is the initial featured wish text flagged (inserted first if missing). Never deletes anything.
async function ensureFeaturedWish() {
  if ((await get('SELECT COUNT(*) AS c FROM wishes WHERE is_featured = 1')).c > 0) return;

  const existing = await get('SELECT id FROM wishes WHERE text = ? ORDER BY id LIMIT 1', [FEATURED_WISH]);
  const id = existing ? existing.id : (await addWish(FEATURED_WISH)).id;
  await setFeaturedWish(id);
}

// Seeding ---------------------------------------------------------------

// Inserts the sample wishes only when the table is empty. Returns how many were inserted.
async function seedIfEmpty() {
  if ((await getWishCount()) > 0) return 0;

  const now = Date.now();
  for (let i = 0; i < sampleWishes.length; i++) {
    const daysAgo = Math.floor(i / 2);
    const timestamp = new Date(now - daysAgo * 24 * 60 * 60 * 1000 - i * 37 * 60 * 1000).toISOString();
    await addWish(sampleWishes[i], timestamp);
  }
  return sampleWishes.length;
}

async function initializeDatabase() {
  await ensureSchema();
  const seeded = await seedIfEmpty();
  await ensureFeaturedWish();
  return { seeded };
}

// Reactions -------------------------------------------------------------
// Reaction rows are internal only. No function here returns reaction totals to callers that build
// public responses.

function hashVisitorKey(visitorKey) {
  return crypto.createHash('sha256').update(visitorKey, 'utf8').digest('hex');
}

// Records one reaction per (wish, visitor). Repeats are ignored.
function addReaction(wishId, visitorKey) {
  return run('INSERT OR IGNORE INTO wish_reactions (wish_id, visitor_key_hash) VALUES (?, ?)', [
    wishId,
    hashVisitorKey(visitorKey)
  ]);
}

module.exports = {
  db,
  dbPath,
  initializeDatabase,
  seedIfEmpty,
  addWish,
  getRandomWishes,
  getWishCount,
  wishExists,
  getFeaturedWish,
  setFeaturedWish,
  addReaction
};
