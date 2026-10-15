const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const { createTempDb } = require('../test-utils/env');
const { startServer, request } = require('../test-utils/server');
const { openDb } = require('../test-utils/db');

const KEY_A = 'a1b2c3d4-0000-4000-8000-000000000001';
const KEY_B = 'a1b2c3d4-0000-4000-8000-000000000002';
const sha256 = (value) => crypto.createHash('sha256').update(value, 'utf8').digest('hex');

describe('shooting-star reactions (POST /api/wishes/:id/react)', () => {
  let tmp, server, db;
  const react = (id, json) => request(server.baseUrl, 'POST', `/api/wishes/${id}/react`, { json });
  const reactionCount = async () => (await db.get('SELECT COUNT(*) AS c FROM wish_reactions')).c;

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

  it('records a valid reaction and answers exactly { success: true }', async () => {
    const res = await react(1, { visitorKey: KEY_A });
    assert.equal(res.status, 200);
    assert.deepEqual(res.json, { success: true });
    const rows = await db.all('SELECT wish_id FROM wish_reactions');
    assert.deepEqual(rows.map((r) => r.wish_id), [1]);
  });

  it('a duplicate reaction (same wish, same visitor) succeeds but adds nothing', async () => {
    const res = await react(1, { visitorKey: KEY_A });
    assert.equal(res.status, 200);
    assert.deepEqual(res.json, { success: true });
    assert.equal(await reactionCount(), 1);
  });

  it('ten simultaneous duplicate requests still produce exactly one row', async () => {
    const results = await Promise.all(Array.from({ length: 10 }, () => react(2, { visitorKey: KEY_A })));
    assert.ok(results.every((r) => r.status === 200 && r.json.success === true));
    const rows = await db.all('SELECT id FROM wish_reactions WHERE wish_id = 2');
    assert.equal(rows.length, 1);
  });

  it('a different visitor, or the same visitor on another wish, is a separate reaction', async () => {
    const before = await reactionCount();
    assert.equal((await react(1, { visitorKey: KEY_B })).status, 200);
    assert.equal((await react(3, { visitorKey: KEY_A })).status, 200);
    assert.equal(await reactionCount(), before + 2);
  });

  it('stores only the SHA-256 hash of the visitor key, never the raw key', async () => {
    const rows = await db.all('SELECT * FROM wish_reactions');
    assert.ok(rows.length > 0);
    for (const row of rows) {
      assert.match(row.visitor_key_hash, /^[0-9a-f]{64}$/);
      assert.notEqual(row.visitor_key_hash, KEY_A);
      assert.notEqual(row.visitor_key_hash, KEY_B);
    }
    const hashes = rows.map((r) => r.visitor_key_hash);
    assert.ok(hashes.includes(sha256(KEY_A)));
    assert.ok(hashes.includes(sha256(KEY_B)));

    // The raw key must not appear in any column, in the database file, or in the server log.
    assert.ok(!JSON.stringify(rows).includes(KEY_A));
    assert.ok(!fs.readFileSync(tmp.dbPath).includes(Buffer.from(KEY_A)));
    assert.ok(!fs.readFileSync(tmp.dbPath).includes(Buffer.from(KEY_B)));
    assert.ok(!server.logs.join('').includes(KEY_A));
  });

  it('answers 404 for a wish that does not exist and records nothing', async () => {
    const before = await reactionCount();
    const res = await react(999999, { visitorKey: KEY_A });
    assert.equal(res.status, 404);
    assert.deepEqual(Object.keys(res.json), ['error']);
    assert.equal(await reactionCount(), before);
  });

  for (const badId of ['abc', '0', '-1', '1.5', '1e3', '1%3BDROP%20TABLE%20wishes', '%20']) {
    it(`answers 400 for an invalid wish id (${JSON.stringify(decodeURIComponent(badId))})`, async () => {
      const before = await reactionCount();
      const res = await react(badId, { visitorKey: KEY_A });
      assert.equal(res.status, 400);
      assert.equal(await reactionCount(), before);
      assert.ok(await db.get('SELECT 1 AS ok FROM wishes LIMIT 1'), 'wishes table must be intact');
    });
  }

  const badKeys = [
    ['missing', {}],
    ['empty', { visitorKey: '' }],
    ['too short (7 characters)', { visitorKey: 'abcdefg' }],
    ['too long (129 characters)', { visitorKey: 'a'.repeat(129) }],
    ['containing spaces', { visitorKey: 'abcd efgh ijkl' }],
    ['containing SQL characters', { visitorKey: "x'; DROP TABLE wishes;--" }],
    ['containing unicode', { visitorKey: 'ключ-посетителя-0001' }],
    ['a number', { visitorKey: 123456789 }],
    ['an object', { visitorKey: { a: 1 } }],
    ['null', { visitorKey: null }]
  ];
  for (const [label, body] of badKeys) {
    it(`answers 400 when the visitor key is ${label}`, async () => {
      const before = await reactionCount();
      const res = await react(1, body);
      assert.equal(res.status, 400);
      assert.deepEqual(Object.keys(res.json), ['error']);
      assert.equal(await reactionCount(), before);
    });
  }

  it('accepts visitor keys of exactly 8 and 128 characters', async () => {
    assert.equal((await react(4, { visitorKey: 'abcd1234' })).status, 200);
    assert.equal((await react(4, { visitorKey: 'k'.repeat(128) })).status, 200);
  });

  it('answers 400 when the body is not JSON', async () => {
    const res = await request(server.baseUrl, 'POST', '/api/wishes/1/react', {
      body: 'visitorKey=abc',
      headers: { 'Content-Type': 'text/plain' }
    });
    assert.equal(res.status, 400);
  });

  it('answers 400 when no body is sent', async () => {
    const res = await request(server.baseUrl, 'POST', '/api/wishes/1/react');
    assert.equal(res.status, 400);
  });
});
