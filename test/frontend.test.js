// Browser-free checks of the frontend code: pure helpers run in a node:vm sandbox, plus static scans.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

// Loads public/js/common.js with a stubbed `window` and returns window.HW.
function loadCommon({ storage, cryptoImpl } = {}) {
  const store = new Map();
  const localStorage = storage || {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value))
  };
  const window = {
    matchMedia: () => ({ matches: false }),
    localStorage,
    crypto: cryptoImpl || { randomUUID: () => crypto.randomUUID(), getRandomValues: (a) => crypto.webcrypto.getRandomValues(a) }
  };
  const context = vm.createContext({ window, setTimeout, Uint8Array });
  vm.runInContext(fs.readFileSync(path.join(PUBLIC_DIR, 'js', 'common.js'), 'utf8'), context);
  return { HW: window.HW, store };
}

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full) : [full];
  });
}

describe('HW.formatDate (relative time)', () => {
  const { HW } = loadCommon();
  const ago = (ms) => HW.formatDate(new Date(Date.now() - ms).toISOString());

  const cases = [
    [0, 'just now'], [30 * 1000, 'just now'], [-5 * MIN, 'just now'],
    [MIN, '1m ago'], [5 * MIN, '5m ago'], [59 * MIN, '59m ago'],
    [HOUR, '1h ago'], [2 * HOUR, '2h ago'], [23 * HOUR, '23h ago'],
    [DAY, 'yesterday'], [30 * HOUR, 'yesterday'],
    [2 * DAY, '2 days ago'], [4 * DAY, '4 days ago'], [6 * DAY, '6 days ago'],
    [7 * DAY, '1 week ago'], [13 * DAY, '1 week ago'], [14 * DAY, '2 weeks ago'], [21 * DAY, '3 weeks ago'], [29 * DAY, '4 weeks ago'],
    [30 * DAY, 'about a month ago'], [44 * DAY, 'about a month ago'],
    [45 * DAY, '2 months ago'], [70 * DAY, '2 months ago'], [95 * DAY, '3 months ago'], [200 * DAY, '7 months ago'], [364 * DAY, '11 months ago'],
    [365 * DAY, '1 year ago'], [729 * DAY, '1 year ago'], [730 * DAY, '2 years ago']
  ];
  for (const [ms, expected] of cases) {
    it(`${ms / MIN} minutes ago -> "${expected}"`, () => assert.equal(ago(ms), expected));
  }

  it('returns an empty string for invalid input', () => {
    for (const bad of ['garbage', '', undefined]) assert.equal(HW.formatDate(bad), '');
  });

  it('never produces a database-looking date', () => {
    for (const ms of [0, DAY, 40 * DAY, 400 * DAY, 4000 * DAY]) assert.ok(!/\d+\/\d+\/\d+|\d{4}-\d{2}-\d{2}/.test(ago(ms)));
  });
});

describe('HW visitor key and reacted-wish memory', () => {
  const KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

  it('creates a random key on first use, stores it, and reuses it', () => {
    const { HW, store } = loadCommon();
    const key = HW.getVisitorKey();
    assert.match(key, KEY_PATTERN);
    assert.equal(store.get('hw_visitor_key'), key);
    assert.equal(HW.getVisitorKey(), key);
  });

  it('replaces a stored key that has an invalid shape', () => {
    const { HW, store } = loadCommon();
    store.set('hw_visitor_key', 'bad key!');
    const key = HW.getVisitorKey();
    assert.match(key, KEY_PATTERN);
    assert.notEqual(key, 'bad key!');
  });

  it('works when localStorage throws (keeps one key for the page view)', () => {
    const throwing = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); }
    };
    const { HW } = loadCommon({ storage: throwing });
    const key = HW.getVisitorKey();
    assert.match(key, KEY_PATTERN);
    assert.equal(HW.getVisitorKey(), key);
    HW.rememberReacted(7);
    assert.deepEqual([...HW.getReactedIds()], [7]); // spread: the array comes from the vm realm
  });

  it('falls back to getRandomValues when randomUUID is unavailable', () => {
    const { HW } = loadCommon({ cryptoImpl: { getRandomValues: (a) => crypto.webcrypto.getRandomValues(a) } });
    assert.match(HW.getVisitorKey(), KEY_PATTERN);
  });

  it('remembers reacted wish ids without duplicates and survives corrupted storage', () => {
    const { HW, store } = loadCommon();
    HW.rememberReacted(3);
    HW.rememberReacted(3);
    HW.rememberReacted(9);
    assert.deepEqual([...HW.getReactedIds()], [3, 9]);
    store.set('hw_reacted', '{not json');
    assert.deepEqual([...HW.getReactedIds()], []);
  });
});

describe('static guards on the frontend sources', () => {
  const sources = listFiles(PUBLIC_DIR);

  it('never inserts markup from strings (SR-001: wishes are rendered with textContent only)', () => {
    const forbidden = /\binnerHTML\b|\bouterHTML\b|insertAdjacentHTML|document\.write\b|\beval\(|new Function\(/;
    for (const file of sources.filter((f) => f.endsWith('.js'))) {
      assert.ok(!forbidden.test(fs.readFileSync(file, 'utf8')), `${path.relative(PUBLIC_DIR, file)} uses an unsafe DOM API`);
    }
  });

  it('loads nothing from other origins (no CDN, no external fonts, no trackers)', () => {
    for (const file of sources.filter((f) => /\.(html|css|js|svg)$/.test(f))) {
      const external = (fs.readFileSync(file, 'utf8').match(/https?:\/\/[^\s"')]+/g) || [])
        .filter((url) => !url.startsWith('http://www.w3.org/'));
      assert.deepEqual(external, [], `${path.relative(PUBLIC_DIR, file)} references ${external.join(', ')}`);
    }
  });

  it('does not use "Like" wording in user-facing page text', () => {
    // The landing page says "No likes to chase." as a promise; the reaction itself is never a Like.
    for (const file of sources.filter((f) => /\.(js)$/.test(f))) {
      assert.ok(!/['"`][^'"`]*\bLike\b[^'"`]*['"`]/.test(fs.readFileSync(file, 'utf8')), `${path.basename(file)} has a "Like" label`);
    }
  });
});
