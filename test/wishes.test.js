const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createTempDb } = require('../test-utils/env');
const { startServer, request } = require('../test-utils/server');
const { openDb } = require('../test-utils/db');

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const WISH_KEYS = ['created_at', 'id', 'text'];

describe('wishes API', () => {
  let tmp, server, db;
  const get = (p) => request(server.baseUrl, 'GET', p);
  const post = (p, json) => request(server.baseUrl, 'POST', p, { json });
  const wishCount = async () => (await db.get('SELECT COUNT(*) AS c FROM wishes')).c;

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

  describe('GET /api/wishes/random', () => {
    it('defaults to 3 wishes with exactly id, text, created_at', async () => {
      const res = await get('/api/wishes/random');
      assert.equal(res.status, 200);
      assert.match(res.headers.get('content-type'), /application\/json/);
      assert.deepEqual(Object.keys(res.json), ['wishes']);
      assert.equal(res.json.wishes.length, 3);
      for (const wish of res.json.wishes) {
        assert.deepEqual(Object.keys(wish).sort(), WISH_KEYS);
        assert.match(wish.created_at, ISO_UTC);
      }
    });

    for (const [query, expected] of [
      ['count=1', 1],
      ['count=3', 3],
      ['count=10', 10],
      ['count=0', 1],
      ['count=-1', 1],
      ['count=999', 10],
      ['count=abc', 3],
      ['count=', 3]
    ]) {
      it(`?${query} returns ${expected}`, async () => {
        const res = await get(`/api/wishes/random?${query}`);
        assert.equal(res.status, 200);
        assert.equal(res.json.wishes.length, expected);
      });
    }

    it('never repeats a wish within one response', async () => {
      const res = await get('/api/wishes/random?count=10');
      const ids = res.json.wishes.map((w) => w.id);
      assert.equal(new Set(ids).size, ids.length);
    });

    it('exclude never returns the excluded wish', async () => {
      const excludeId = (await get('/api/wishes/featured')).json.wish.id;
      for (let i = 0; i < 25; i++) {
        const one = await get(`/api/wishes/random?count=1&exclude=${excludeId}`);
        assert.equal(one.json.wishes.length, 1);
        assert.notEqual(one.json.wishes[0].id, excludeId);
      }
      const many = await get(`/api/wishes/random?count=10&exclude=${excludeId}`);
      assert.equal(many.json.wishes.length, 10);
      assert.ok(many.json.wishes.every((w) => w.id !== excludeId));
    });

    for (const bad of ['abc', '-5', '0', '1.5', '', '1%20OR%201%3D1', '1%3BDROP%20TABLE%20wishes']) {
      it(`ignores an invalid exclude value (${JSON.stringify(decodeURIComponent(bad))})`, async () => {
        const before = await wishCount();
        const res = await get(`/api/wishes/random?count=5&exclude=${bad}`);
        assert.equal(res.status, 200);
        assert.equal(res.json.wishes.length, 5);
        assert.equal(await wishCount(), before, 'the wishes table must be untouched');
      });
    }
  });

  describe('POST /api/wishes', () => {
    it('creates a wish, trims whitespace, and returns 201 with the documented shape', async () => {
      const res = await post('/api/wishes', { text: '   I hope tests keep me honest.  \n' });
      assert.equal(res.status, 201);
      assert.deepEqual(Object.keys(res.json).sort(), ['success', 'wish']);
      assert.equal(res.json.success, true);
      assert.deepEqual(Object.keys(res.json.wish).sort(), WISH_KEYS);
      assert.equal(res.json.wish.text, 'I hope tests keep me honest.');
      assert.match(res.json.wish.created_at, ISO_UTC);

      const row = await db.get('SELECT text, is_featured FROM wishes WHERE id = ?', [res.json.wish.id]);
      assert.equal(row.text, 'I hope tests keep me honest.');
      assert.equal(row.is_featured, 0, 'a submitted wish is never featured automatically');
    });

    it('keeps line breaks inside the wish', async () => {
      const res = await post('/api/wishes', { text: 'line one\nline two' });
      assert.equal(res.status, 201);
      assert.equal(res.json.wish.text, 'line one\nline two');
    });

    const rejected = [
      ['an empty string', { text: '' }],
      ['whitespace only (spaces, tabs, newlines)', { text: '  \t \n\r  ' }],
      ['a missing text field', {}],
      ['a null text', { text: null }],
      ['a numeric text', { text: 12345 }],
      ['an array text', { text: ['a'] }],
      ['an object text', { text: { a: 1 } }],
      ['the wrong field name (wish instead of text)', { wish: 'hello' }],
      ['501 characters', { text: 'a'.repeat(501) }],
      ['501 characters after trimming', { text: '  ' + 'a'.repeat(501) + '  ' }]
    ];
    for (const [label, body] of rejected) {
      it(`rejects ${label} with 400 and stores nothing`, async () => {
        const before = await wishCount();
        const res = await post('/api/wishes', body);
        assert.equal(res.status, 400);
        assert.deepEqual(Object.keys(res.json), ['error']);
        assert.equal(await wishCount(), before);
      });
    }

    it('accepts exactly 500 characters', async () => {
      const res = await post('/api/wishes', { text: 'b'.repeat(500) });
      assert.equal(res.status, 201);
      assert.equal(res.json.wish.text.length, 500);
    });

    it('measures the limit after trimming (500 characters plus padding is accepted)', async () => {
      const res = await post('/api/wishes', { text: '   ' + 'c'.repeat(500) + '   ' });
      assert.equal(res.status, 201);
      assert.equal(res.json.wish.text, 'c'.repeat(500));
    });

    it('rejects malformed JSON with a generic 400', async () => {
      const res = await request(server.baseUrl, 'POST', '/api/wishes', {
        body: '{bad json',
        headers: { 'Content-Type': 'application/json' }
      });
      assert.equal(res.status, 400);
      assert.deepEqual(res.json, { error: 'Invalid request body' });
    });

    it('rejects a body that is not JSON', async () => {
      const res = await request(server.baseUrl, 'POST', '/api/wishes', {
        body: 'text=hello',
        headers: { 'Content-Type': 'text/plain' }
      });
      assert.equal(res.status, 400);
    });

    it('rejects an oversized request body with 413', async () => {
      const res = await post('/api/wishes', { text: 'x'.repeat(1.2 * 1024 * 1024) });
      assert.equal(res.status, 413);
      assert.deepEqual(res.json, { error: 'Request too large' });
    });
  });

  describe('XSS and SQL injection', () => {
    it('stores HTML/script input verbatim as data and serves it as JSON, never as HTML', async () => {
      const xss = `<script>alert('x')</script><img src=x onerror="alert(1)">`;
      const res = await post('/api/wishes', { text: xss });
      assert.equal(res.status, 201);
      assert.equal(res.json.wish.text, xss);
      assert.match(res.headers.get('content-type'), /^application\/json/);

      const row = await db.get('SELECT text FROM wishes WHERE id = ?', [res.json.wish.id]);
      assert.equal(row.text, xss, 'stored as-is: escaping happens at render time with textContent');
    });

    it('treats SQL injection attempts in wish text as plain text', async () => {
      const attacks = [`'); DROP TABLE wishes;--`, `Robert'); DELETE FROM wishes;--`, `" OR "1"="1`];
      const before = await wishCount();
      for (const text of attacks) {
        const res = await post('/api/wishes', { text });
        assert.equal(res.status, 201);
        assert.equal(res.json.wish.text, text);
        const row = await db.get('SELECT text FROM wishes WHERE id = ?', [res.json.wish.id]);
        assert.equal(row.text, text);
      }
      assert.equal(await wishCount(), before + attacks.length, 'no rows lost, table intact');
    });
  });
});
