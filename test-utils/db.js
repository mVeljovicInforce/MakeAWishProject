// Direct database access for tests. Both helpers refuse to touch anything except a database inside a
// hw-test-* temporary directory, so a test can inspect or deliberately corrupt only its own database.
const sqlite3 = require('sqlite3');
const { assertSafeDbPath } = require('./env');

// Opens an existing-or-new test database. Returns promise-based run/all/get/close.
function openDb(dbPath) {
  const safePath = assertSafeDbPath(dbPath);
  const db = new sqlite3.Database(safePath);
  db.configure('busyTimeout', 10000);
  return {
    run: (sql, params = []) =>
      new Promise((resolve, reject) => db.run(sql, params, (err) => (err ? reject(err) : resolve()))),
    all: (sql, params = []) =>
      new Promise((resolve, reject) => db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))),
    get: (sql, params = []) =>
      new Promise((resolve, reject) => db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)))),
    close: () => new Promise((resolve, reject) => db.close((err) => (err ? reject(err) : resolve())))
  };
}

// Builds a database with the original MVP schema (no is_featured column, no wish_reactions table)
// and a few rows, to test the additive migration. Nothing is committed to the repository for this.
async function createLegacyDb(dbPath) {
  const db = openDb(dbPath);
  try {
    await db.run(
      `CREATE TABLE wishes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    );
    const rows = [
      ['I hope my dog lives forever.', '2026-09-08 10:42:09'],
      ['<script>alert("legacy")</script>', '2026-09-11 18:36:23'],
      ['hey', '2026-09-25 21:07:48']
    ];
    for (const [text, createdAt] of rows) {
      await db.run('INSERT INTO wishes (text, created_at) VALUES (?, ?)', [text, createdAt]);
    }
    return rows.length;
  } finally {
    await db.close();
  }
}

module.exports = { openDb, createLegacyDb };
