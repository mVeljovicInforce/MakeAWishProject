// Test isolation helpers.
//
// Every test works on its own temporary database inside its own temporary directory under
// os.tmpdir(). Nothing here ever resolves to, opens, or deletes anything outside that directory,
// and every helper fails loudly (throws) instead of falling back to the development database.
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const DEV_DB_PATH = path.join(REPO_ROOT, 'data', 'wishes.db');
const TEMP_PREFIX = 'hw-test-';

function realTmpDir() {
  return fs.realpathSync(os.tmpdir());
}

function isInside(parent, child) {
  const rel = path.relative(parent, child);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

// Throws unless `dbPath` is an absolute path to a file inside a test directory
// (<os temp>/hw-test-*/...), and never the development database or anything in the repository.
function assertSafeDbPath(dbPath) {
  if (typeof dbPath !== 'string' || dbPath.trim() === '') {
    throw new Error('Refusing to run: test database path is missing or empty');
  }
  if (!path.isAbsolute(dbPath)) {
    throw new Error(`Refusing to run: test database path is not absolute: ${dbPath}`);
  }

  const resolved = path.resolve(dbPath);
  const tmp = realTmpDir();
  const dir = path.dirname(resolved);
  const relToTmp = path.relative(tmp, resolved);
  const firstSegment = relToTmp.split(path.sep)[0];

  if (
    !isInside(tmp, resolved) ||
    !firstSegment.startsWith(TEMP_PREFIX) ||
    resolved === DEV_DB_PATH ||
    isInside(REPO_ROOT, resolved) ||
    dir === tmp
  ) {
    throw new Error(`Refusing to run: ${resolved} is not inside a ${TEMP_PREFIX}* temporary test directory`);
  }
  return resolved;
}

// Creates <os temp>/hw-test-XXXXXX/ and returns the database path inside it plus a cleanup()
// that removes only that directory.
function createTempDb(name = 'test.db') {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(realTmpDir(), TEMP_PREFIX)));
  const dbPath = assertSafeDbPath(path.join(dir, name));

  function cleanup() {
    // Re-check before deleting: only ever remove our own hw-test-* directory directly under the temp dir.
    const tmp = realTmpDir();
    if (path.dirname(dir) !== tmp || !path.basename(dir).startsWith(TEMP_PREFIX)) {
      throw new Error(`Refusing to delete ${dir}: not a test directory`);
    }
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
  }

  return { dir, dbPath, cleanup };
}

module.exports = { REPO_ROOT, DEV_DB_PATH, assertSafeDbPath, createTempDb };
