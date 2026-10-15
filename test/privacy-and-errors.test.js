const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createTempDb } = require('../test-utils/env');
const { startServer, request } = require('../test-utils/server');
const { openDb } = require('../test-utils/db');

// Anything that looks like an internal detail must never reach a client.
const INTERNALS = /SQLITE|no such table|wish_reactions|visitor_key|constraint|Error:|\bat\s+\S+\s+\(|node_modules|\.js:\d+|[A-Za-z]:\\|\/Users\/|\/home\//i;

// Every object key anywhere in a JSON value (wish text is data, not a field name).
function collectKeys(value) {
  if (Array.isArray(value)) return value.flatMap(collectKeys);
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, inner]) => [key, ...collectKeys(inner)]);
  }
  return [];
}

describe('privacy: no reaction counts or internals leak from any public response', () => {
  let tmp, server, db;
  const get = (p) => request(server.baseUrl, 'GET', p);
  const post = (p, json) => request(server.baseUrl, 'POST', p, { json });

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

  describe('response shapes (exact key sets, so no count/total/score/is_featured can appear)', () => {
    it('GET /api/wishes/random', async () => {
      const res = await get('/api/wishes/random?count=10');
      assert.deepEqual(Object.keys(res.json), ['wishes']);
      for (const wish of res.json.wishes) assert.deepEqual(Object.keys(wish).sort(), ['created_at', 'id', 'text']);
    });

    it('GET /api/wishes/featured', async () => {
      const res = await get('/api/wishes/featured');
      assert.deepEqual(Object.keys(res.json), ['wish']);
      assert.deepEqual(Object.keys(res.json.wish).sort(), ['created_at', 'id', 'text']);
    });

    it('POST /api/wishes', async () => {
      const res = await post('/api/wishes', { text: 'shape check' });
      assert.deepEqual(Object.keys(res.json).sort(), ['success', 'wish']);
      assert.deepEqual(Object.keys(res.json.wish).sort(), ['created_at', 'id', 'text']);
    });

    it('POST /api/wishes/:id/react', async () => {
      const res = await post('/api/wishes/1/react', { visitorKey: 'privacy-key-0001' });
      assert.deepEqual(res.json, { success: true });
    });

    it('GET /api/health reports only status and the number of wishes', async () => {
      const res = await get('/api/health');
      assert.deepEqual(Object.keys(res.json).sort(), ['status', 'wishCount']);
      assert.equal(res.json.status, 'ok');
      assert.equal(typeof res.json.wishCount, 'number');
    });

    it('error responses carry only an error message', async () => {
      for (const res of [
        await post('/api/wishes', { text: '' }),
        await post('/api/wishes/999999/react', { visitorKey: 'privacy-key-0001' }),
        await post('/api/wishes/1/react', {}),
        await get('/api/nope')
      ]) {
        assert.deepEqual(Object.keys(res.json), ['error']);
        assert.equal(typeof res.json.error, 'string');
      }
    });
  });

  it('reacting does not change what any public endpoint reveals or how many wishes exist', async () => {
    const countBefore = (await get('/api/health')).json.wishCount;
    for (let i = 0; i < 12; i++) {
      await post(`/api/wishes/${(i % 5) + 1}/react`, { visitorKey: `visitor-key-${String(i).padStart(4, '0')}` });
    }
    assert.equal((await get('/api/health')).json.wishCount, countBefore);
    const wishes = (await get('/api/wishes/random?count=10')).json.wishes;
    assert.ok(wishes.every((w) => Object.keys(w).length === 3));
    const reactions = (await db.get('SELECT COUNT(*) AS c FROM wish_reactions')).c;
    assert.ok(reactions >= 12, 'reactions exist internally');
    for (const res of [await get('/api/wishes/featured'), await get('/api/wishes/random?count=10'), await get('/api/health')]) {
      for (const key of collectKeys(res.json)) {
        assert.ok(!/react|likes?|popular|trending|score|rank|total/i.test(key), `unexpected field "${key}"`);
      }
    }
  });

  describe('safe error responses', () => {
    it('malformed JSON gives a generic 400 with no stack trace', async () => {
      const res = await request(server.baseUrl, 'POST', '/api/wishes', {
        body: '{"text": ',
        headers: { 'Content-Type': 'application/json' }
      });
      assert.equal(res.status, 400);
      assert.deepEqual(res.json, { error: 'Invalid request body' });
      assert.ok(!INTERNALS.test(res.text));
    });

    it('a malformed URL gives the normal 404 page with no stack trace or file path', async () => {
      const res = await get('/%E0%A4%A');
      assert.equal(res.status, 404);
      assert.ok(!INTERNALS.test(res.text), res.text);
      assert.ok(!/URIError|decode/i.test(res.text), res.text);
      assert.equal((await get('/api/health')).status, 200, 'the server is still healthy');
    });

    it('a failing database yields generic 500s that reveal nothing, and the server keeps running', async () => {
      // This test sabotages ONLY this file's own temporary database.
      await db.run('DROP TABLE wish_reactions');
      let res = await post('/api/wishes/1/react', { visitorKey: 'sabotage-key-0001' });
      assert.equal(res.status, 500);
      assert.deepEqual(res.json, { error: 'Failed to record reaction' });
      assert.ok(!INTERNALS.test(res.text));

      await db.run('ALTER TABLE wishes RENAME TO wishes_sabotaged');

      res = await get('/api/wishes/random');
      assert.equal(res.status, 500);
      assert.deepEqual(res.json, { error: 'Failed to fetch wishes' });
      assert.ok(!INTERNALS.test(res.text));

      res = await get('/api/wishes/featured');
      assert.equal(res.status, 500);
      assert.deepEqual(res.json, { error: 'Failed to fetch wish' });
      assert.ok(!INTERNALS.test(res.text));

      res = await post('/api/wishes', { text: 'will fail' });
      assert.equal(res.status, 500);
      assert.deepEqual(res.json, { error: 'Failed to add wish' });
      assert.ok(!INTERNALS.test(res.text));

      res = await get('/api/health');
      assert.equal(res.status, 500);
      assert.deepEqual(res.json, { status: 'error' }, 'health must not echo the internal error message');

      // The process survived all of that and recovers once the table is back.
      await db.run('ALTER TABLE wishes_sabotaged RENAME TO wishes');
      res = await get('/api/health');
      assert.equal(res.status, 200);
      assert.equal(res.json.status, 'ok');
    });
  });
});
