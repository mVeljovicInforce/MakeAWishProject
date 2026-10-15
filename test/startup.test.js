const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { REPO_ROOT, createTempDb } = require('../test-utils/env');
const { startServer, request } = require('../test-utils/server');
const { openDb, createLegacyDb } = require('../test-utils/db');
const { FEATURED_WISH, sampleWishes } = require('../seedData');

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe('startup, seeding, migration and persistence (real server process, temporary databases)', () => {
  // Each test registers what it opened so afterEach can always close/stop/delete it.
  let cleanups = [];
  const track = (fn) => cleanups.push(fn);

  afterEach(async () => {
    const pending = cleanups.reverse();
    cleanups = [];
    for (const fn of pending) await fn();
  });

  function newTempDb() {
    const tmp = createTempDb();
    track(() => tmp.cleanup());
    return tmp;
  }

  async function boot(tmp) {
    const server = await startServer(tmp.dbPath);
    track(() => server.stop());
    return server;
  }

  function inspect(tmp) {
    const db = openDb(tmp.dbPath);
    track(() => db.close());
    return db;
  }

  it('a fresh database is seeded automatically, with varied timestamps and one featured wish', async () => {
    const tmp = newTempDb();
    await boot(tmp);
    const db = inspect(tmp);

    assert.equal((await db.get('SELECT COUNT(*) AS c FROM wishes')).c, sampleWishes.length);
    assert.ok(sampleWishes.length >= 15 && sampleWishes.length <= 25, 'FR-008: roughly 15-25 seed wishes');
    assert.ok((await db.get('SELECT COUNT(DISTINCT created_at) AS c FROM wishes')).c > 10, 'timestamps are varied');
    const featured = await db.all('SELECT text FROM wishes WHERE is_featured = 1');
    assert.deepEqual(featured.map((r) => r.text), [FEATURED_WISH]);
  });

  it('restarting does not reseed or duplicate anything, and data persists', async () => {
    const tmp = newTempDb();
    let server = await boot(tmp);
    const db = inspect(tmp);

    const created = await request(server.baseUrl, 'POST', '/api/wishes', { json: { text: 'Remember me after a restart.' } });
    assert.equal(created.status, 201);
    assert.equal((await request(server.baseUrl, 'POST', `/api/wishes/${created.json.wish.id}/react`, { json: { visitorKey: 'persist-key-0001' } })).status, 200);
    const countBefore = (await db.get('SELECT COUNT(*) AS c FROM wishes')).c;

    await server.stop();
    server = await boot(tmp);

    assert.equal((await db.get('SELECT COUNT(*) AS c FROM wishes')).c, countBefore);
    assert.equal((await db.all('SELECT text FROM wishes GROUP BY text HAVING COUNT(*) > 1')).length, 0, 'no duplicates');
    assert.ok(await db.get('SELECT id FROM wishes WHERE text = ?', ['Remember me after a restart.']));
    assert.equal((await db.get('SELECT COUNT(*) AS c FROM wish_reactions')).c, 1, 'the reaction persisted');
    assert.equal((await request(server.baseUrl, 'GET', '/api/health')).json.wishCount, countBefore);
  });

  it('an existing MVP-schema database is migrated additively without losing or changing rows', async () => {
    const tmp = newTempDb();
    const legacyRows = await createLegacyDb(tmp.dbPath);
    const server = await boot(tmp);
    const db = inspect(tmp);

    const columns = (await db.all('PRAGMA table_info(wishes)')).map((c) => c.name);
    assert.ok(columns.includes('is_featured'));
    assert.ok(await db.get("SELECT name FROM sqlite_master WHERE name = 'wish_reactions'"));

    const legacy = await db.all('SELECT text, created_at, is_featured FROM wishes WHERE id <= ? ORDER BY id', [legacyRows]);
    assert.deepEqual(legacy, [
      { text: 'I hope my dog lives forever.', created_at: '2026-09-08 10:42:09', is_featured: 0 },
      { text: '<script>alert("legacy")</script>', created_at: '2026-09-11 18:36:23', is_featured: 0 },
      { text: 'hey', created_at: '2026-09-25 21:07:48', is_featured: 0 }
    ]);

    // Non-empty database: no sample wishes are added; only the initial featured wish is inserted.
    assert.equal((await db.get('SELECT COUNT(*) AS c FROM wishes')).c, legacyRows + 1);
    const featured = await db.all('SELECT text FROM wishes WHERE is_featured = 1');
    assert.deepEqual(featured.map((r) => r.text), [FEATURED_WISH]);

    // Legacy "YYYY-MM-DD HH:MM:SS" timestamps are served as ISO 8601 UTC.
    const res = await request(server.baseUrl, 'GET', '/api/wishes/random?count=10');
    assert.equal(res.json.wishes.length, legacyRows + 1);
    assert.ok(res.json.wishes.every((w) => ISO_UTC.test(w.created_at)));
  });

  it('migrating twice (a restart) changes nothing more', async () => {
    const tmp = newTempDb();
    const legacyRows = await createLegacyDb(tmp.dbPath);
    let server = await boot(tmp);
    const db = inspect(tmp);
    const snapshot = await db.all('SELECT id, text, created_at, is_featured FROM wishes ORDER BY id');

    await server.stop();
    server = await boot(tmp);

    assert.deepEqual(await db.all('SELECT id, text, created_at, is_featured FROM wishes ORDER BY id'), snapshot);
    assert.equal(snapshot.length, legacyRows + 1);
  });

  it('a legacy database that already contains the initial wish just flags it (no duplicate)', async () => {
    const tmp = newTempDb();
    await createLegacyDb(tmp.dbPath);
    const setup = openDb(tmp.dbPath);
    await setup.run('INSERT INTO wishes (text, created_at) VALUES (?, ?)', [FEATURED_WISH, '2026-09-12 09:00:00']);
    await setup.close();

    await boot(tmp);
    const db = inspect(tmp);

    const rows = await db.all('SELECT is_featured FROM wishes WHERE text = ?', [FEATURED_WISH]);
    assert.deepEqual(rows, [{ is_featured: 1 }]);
    assert.equal((await db.get('SELECT COUNT(*) AS c FROM wishes')).c, 4);
  });

  it('node seed.js is idempotent and uses DB_PATH', () => {
    const tmp = newTempDb();
    const run = () =>
      spawnSync(process.execPath, [path.join(REPO_ROOT, 'seed.js')], {
        cwd: REPO_ROOT,
        env: { ...process.env, DB_PATH: tmp.dbPath },
        encoding: 'utf8',
        timeout: 60000
      });

    const first = run();
    assert.equal(first.status, 0, first.stderr);
    assert.match(first.stdout, new RegExp(`Added ${sampleWishes.length} wishes`));

    const second = run();
    assert.equal(second.status, 0, second.stderr);
    assert.match(second.stdout, /Skipping seed/);
  });

  it('a blank or whitespace DB_PATH is a hard error, never a fallback to the default database', () => {
    // Only requires database.js (opens no default database because it throws first for whitespace).
    const result = spawnSync(process.execPath, ['-e', "require('./database')"], {
      cwd: REPO_ROOT,
      env: { ...process.env, DB_PATH: '   ' },
      encoding: 'utf8',
      timeout: 60000
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /DB_PATH is set but empty/);
  });
});
