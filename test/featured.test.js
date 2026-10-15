const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createTempDb } = require('../test-utils/env');
const { startServer, request } = require('../test-utils/server');
const { openDb } = require('../test-utils/db');
const { FEATURED_WISH, sampleWishes } = require('../seedData');

describe('featured wish', () => {
  let tmp, server, db;
  const getFeatured = () => request(server.baseUrl, 'GET', '/api/wishes/featured');
  const featuredRows = () => db.all('SELECT id, text FROM wishes WHERE is_featured = 1');
  const restart = async () => {
    await server.stop();
    server = await startServer(tmp.dbPath);
  };

  before(async () => {
    tmp = createTempDb();
    server = await startServer(tmp.dbPath);
    db = openDb(tmp.dbPath);
  });

  after(async () => {
    if (db) await db.close();
    if (server) await server.stop();
    if (tmp) tmp.cleanup();
  });

  it('a fresh database is seeded and gets the intended initial featured wish', async () => {
    assert.equal((await db.get('SELECT COUNT(*) AS c FROM wishes')).c, sampleWishes.length);
    const rows = await featuredRows();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].text, FEATURED_WISH);
  });

  it('GET /api/wishes/featured returns the featured wish with exactly id, text, created_at', async () => {
    const res = await getFeatured();
    assert.equal(res.status, 200);
    assert.deepEqual(Object.keys(res.json), ['wish']);
    assert.deepEqual(Object.keys(res.json.wish).sort(), ['created_at', 'id', 'text']);
    assert.equal(res.json.wish.text, FEATURED_WISH);
  });

  it('the database allows at most one featured wish', async () => {
    await assert.rejects(
      db.run('UPDATE wishes SET is_featured = 1 WHERE is_featured = 0 AND id = (SELECT MIN(id) FROM wishes WHERE is_featured = 0)'),
      /UNIQUE|constraint/i
    );
    assert.equal((await featuredRows()).length, 1);
  });

  it('a wish submitted by a visitor is never featured', async () => {
    const res = await request(server.baseUrl, 'POST', '/api/wishes', { json: { text: 'A brand new wish.' } });
    assert.equal(res.status, 201);
    const row = await db.get('SELECT is_featured FROM wishes WHERE id = ?', [res.json.wish.id]);
    assert.equal(row.is_featured, 0);
    assert.equal((await featuredRows()).length, 1);
  });

  it('an already-featured wish survives a restart and is not replaced by the initial one', async () => {
    const other = await db.get('SELECT id, text FROM wishes WHERE is_featured = 0 AND text != ? LIMIT 1', [FEATURED_WISH]);
    await db.run('UPDATE wishes SET is_featured = 0 WHERE is_featured = 1');
    await db.run('UPDATE wishes SET is_featured = 1 WHERE id = ?', [other.id]);

    for (let i = 0; i < 2; i++) {
      await restart();
      const rows = await featuredRows();
      assert.equal(rows.length, 1);
      assert.equal(rows[0].id, other.id);
      assert.equal((await getFeatured()).json.wish.text, other.text);
    }
    const original = await db.get('SELECT is_featured FROM wishes WHERE text = ?', [FEATURED_WISH]);
    assert.equal(original.is_featured, 0, 'the initial wish is not forced back into the featured state');
  });

  it('when no wish is featured, the existing initial wish gets flagged (no duplicate created)', async () => {
    await db.run('UPDATE wishes SET is_featured = 0');
    const before = (await db.get('SELECT COUNT(*) AS c FROM wishes')).c;
    await restart();
    const rows = await featuredRows();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].text, FEATURED_WISH);
    assert.equal((await db.get('SELECT COUNT(*) AS c FROM wishes')).c, before);
  });

  it('when no wish is featured and the initial wish is missing, it is inserted and featured', async () => {
    await db.run('DELETE FROM wishes WHERE text = ?', [FEATURED_WISH]);
    const before = (await db.get('SELECT COUNT(*) AS c FROM wishes')).c;
    await restart();
    const rows = await featuredRows();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].text, FEATURED_WISH);
    assert.equal((await db.get('SELECT COUNT(*) AS c FROM wishes')).c, before + 1);
  });

  it('the featured endpoint returns { wish: null } when nothing is featured and the server is running', async () => {
    // Un-feature while the server is running (initialization only runs at startup).
    await db.run('UPDATE wishes SET is_featured = 0');
    const res = await getFeatured();
    assert.equal(res.status, 200);
    assert.deepEqual(res.json, { wish: null });
  });
});
