const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(__dirname, 'data', 'wishes.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

db.configure('busyTimeout', 10000);

function normalizeTimestamp(timestamp) {
  if (!timestamp) return null;
  if (timestamp.includes('T')) return timestamp;
  return timestamp.replace(' ', 'T') + '.000Z';
}

function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(
        `CREATE TABLE IF NOT EXISTS wishes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          text TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  });
}

function addWish(text, createdAt = null) {
  return new Promise((resolve, reject) => {
    const isoTimestamp = new Date().toISOString();
    const stmt = createdAt
      ? db.prepare('INSERT INTO wishes (text, created_at) VALUES (?, ?)')
      : db.prepare('INSERT INTO wishes (text) VALUES (?)');

    const params = createdAt ? [text, createdAt] : [text];
    stmt.run(...params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, text, created_at: isoTimestamp });
    });
    stmt.finalize();
  });
}

function getRandomWishes(count = 3) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT id, text, created_at FROM wishes ORDER BY RANDOM() LIMIT ?',
      [count],
      (err, rows) => {
        if (err) reject(err);
        else {
          const normalized = (rows || []).map(row => ({
            ...row,
            created_at: normalizeTimestamp(row.created_at)
          }));
          resolve(normalized);
        }
      }
    );
  });
}

function getWishCount() {
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) as count FROM wishes', (err, row) => {
      if (err) reject(err);
      else resolve(row ? row.count : 0);
    });
  });
}

module.exports = {
  db,
  initializeDatabase,
  addWish,
  getRandomWishes,
  getWishCount
};
