// Proves the test harness can only ever work on its own temporary databases.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { REPO_ROOT, DEV_DB_PATH, assertSafeDbPath, createTempDb } = require('../test-utils/env');
const { startServer } = require('../test-utils/server');
const { openDb, createLegacyDb } = require('../test-utils/db');

describe('test isolation', () => {
  const tmpRoot = fs.realpathSync(os.tmpdir());

  describe('assertSafeDbPath', () => {
    it('accepts a database inside a hw-test-* directory under the OS temp directory', () => {
      const tmp = createTempDb();
      try {
        assert.equal(assertSafeDbPath(tmp.dbPath), tmp.dbPath);
        assert.ok(tmp.dbPath.startsWith(tmpRoot + path.sep));
        assert.ok(path.basename(tmp.dir).startsWith('hw-test-'));
      } finally {
        tmp.cleanup();
      }
    });

    const unsafe = [
      ['the development database', DEV_DB_PATH],
      ['any path inside the repository', path.join(REPO_ROOT, 'data', 'other.db')],
      ['a relative path', path.join('data', 'wishes.db')],
      ['an empty path', ''],
      ['undefined', undefined],
      ['a file directly in the temp directory', path.join(tmpRoot, 'x.db')],
      ['a temp directory without the hw-test- prefix', path.join(tmpRoot, 'other-dir', 'x.db')],
      ['a path that escapes with ..', path.join(tmpRoot, 'hw-test-x', '..', '..', 'x.db')]
    ];
    for (const [label, candidate] of unsafe) {
      it(`rejects ${label}`, () => {
        assert.throws(() => assertSafeDbPath(candidate), /Refusing to run/);
      });
    }
  });

  describe('helpers refuse unsafe targets instead of falling back', () => {
    it('startServer will not start against the development database', async () => {
      await assert.rejects(startServer(DEV_DB_PATH), /Refusing to run/);
    });

    it('startServer will not start without a path', async () => {
      await assert.rejects(startServer(undefined), /Refusing to run/);
      await assert.rejects(startServer(''), /Refusing to run/);
    });

    it('openDb and createLegacyDb will not touch the development database', async () => {
      assert.throws(() => openDb(DEV_DB_PATH), /Refusing to run/);
      await assert.rejects(createLegacyDb(DEV_DB_PATH), /Refusing to run/);
    });
  });

  describe('createTempDb cleanup', () => {
    it('removes only its own directory and leaves neighbouring files alone', () => {
      const sentinelDir = fs.mkdtempSync(path.join(tmpRoot, 'hw-sentinel-'));
      const sentinel = path.join(sentinelDir, 'keep.txt');
      fs.writeFileSync(sentinel, 'keep me');

      const tmp = createTempDb();
      fs.writeFileSync(tmp.dbPath, 'x');
      tmp.cleanup();

      try {
        assert.ok(!fs.existsSync(tmp.dir), 'its own directory is gone');
        assert.ok(fs.existsSync(sentinel), 'a neighbouring directory is untouched');
      } finally {
        fs.rmSync(sentinelDir, { recursive: true, force: true });
      }
    });
  });
});
