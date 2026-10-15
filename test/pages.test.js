const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createTempDb } = require('../test-utils/env');
const { startServer, request } = require('../test-utils/server');

describe('pages and routing', () => {
  let tmp, server;
  const get = (p) => request(server.baseUrl, 'GET', p);

  before(async () => {
    tmp = createTempDb();
    server = await startServer(tmp.dbPath);
  });

  after(async () => {
    if (server) await server.stop();
    if (tmp) tmp.cleanup();
  });

  const pages = [
    ['/', '<title>Hidden Wishes</title>', ['What do you wish for when nobody is listening?', 'Read another wish', 'Explore wishes', 'Leave a wish']],
    ['/wishes', '<title>Explore wishes — Hidden Wishes</title>', ['Show me different wishes', 'id="wishGrid"']],
    ['/make-a-wish', '<title>Leave a wish — Hidden Wishes</title>', ['Release my wish', 'placeholder="I wish..."', 'maxlength="500"', "It's out there now.", 'Somewhere, someone may read it.']],
    ['/about', '<title>About — Hidden Wishes</title>', ["Hidden Wishes is a place for things we don't always say out loud.", "We don't ask for your name, email, or profile."]]
  ];

  for (const [route, title, copy] of pages) {
    it(`GET ${route} serves the page`, async () => {
      const res = await get(route);
      assert.equal(res.status, 200);
      assert.match(res.headers.get('content-type'), /^text\/html/);
      assert.ok(res.text.includes(title), `missing title ${title}`);
      for (const text of copy) assert.ok(res.text.includes(text), `missing copy: ${text}`);
      assert.ok(res.text.includes('href="/wishes"') && res.text.includes('href="/make-a-wish"'), 'main navigation present');
    });
  }

  it('the landing page has no submission form (FR-001)', async () => {
    const res = await get('/');
    assert.ok(!/<form/i.test(res.text));
    assert.ok(!/<textarea/i.test(res.text));
  });

  it('the make-a-wish page contains the form and a labelled textarea', async () => {
    const res = await get('/make-a-wish');
    assert.ok(/<form/i.test(res.text));
    assert.ok(/<label[^>]*for="wishInput"/i.test(res.text));
  });

  for (const route of ['/nope', '/a/b/c', '/wishes.txt']) {
    it(`unknown website route ${route} shows the custom 404 page`, async () => {
      const res = await get(route);
      assert.equal(res.status, 404);
      assert.match(res.headers.get('content-type'), /^text\/html/);
      assert.ok(res.text.includes('Nothing was left here.'));
      assert.ok(res.text.includes('href="/"'));
    });
  }

  for (const method of ['GET', 'POST', 'PUT', 'DELETE']) {
    it(`unknown API route (${method} /api/nope) answers JSON 404`, async () => {
      const res = await request(server.baseUrl, method, '/api/nope', method === 'GET' ? {} : { json: {} });
      assert.equal(res.status, 404);
      assert.match(res.headers.get('content-type'), /^application\/json/);
      assert.deepEqual(res.json, { error: 'Not found' });
    });
  }

  for (const secret of ['/data/wishes.db', '/server.js', '/database.js', '/seedData.js', '/package.json', '/test/wishes.test.js', '/.gitignore']) {
    it(`does not serve project files (${secret})`, async () => {
      const res = await get(secret);
      assert.equal(res.status, 404);
      assert.ok(!res.text.includes('SQLite format'));
      assert.ok(!res.text.includes("require('"));
    });
  }

  it('serves the stylesheet and page scripts', async () => {
    const css = await get('/styles.css');
    assert.equal(css.status, 200);
    assert.match(css.headers.get('content-type'), /^text\/css/);
    for (const script of ['/js/common.js', '/js/landing.js', '/js/explore.js', '/js/make-a-wish.js']) {
      const res = await get(script);
      assert.equal(res.status, 200, script);
      assert.match(res.headers.get('content-type'), /javascript/);
    }
  });

  it('API responses are not cacheable', async () => {
    const res = await get('/api/health');
    assert.equal(res.headers.get('cache-control'), 'no-store');
  });
});
