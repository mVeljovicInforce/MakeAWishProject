// `npm test` entry point: runs the whole suite with Node's built-in test runner and then verifies that
// the development database (data/wishes.db) was not touched by the run.
const crypto = require('crypto');
const fs = require('fs');
const { spawnSync } = require('child_process');
const { REPO_ROOT, DEV_DB_PATH } = require('./env');

function snapshotDevDb() {
  if (!fs.existsSync(DEV_DB_PATH)) return null;
  const stat = fs.statSync(DEV_DB_PATH);
  return {
    sha256: crypto.createHash('sha256').update(fs.readFileSync(DEV_DB_PATH)).digest('hex'),
    size: stat.size,
    mtimeMs: stat.mtimeMs
  };
}

const before = snapshotDevDb();

const result = spawnSync(process.execPath, ['--no-warnings', '--test', 'test/'], {
  cwd: REPO_ROOT,
  stdio: 'inherit'
});

const after = snapshotDevDb();
const unchanged =
  (before === null && after === null) ||
  (before !== null && after !== null &&
    before.sha256 === after.sha256 && before.size === after.size && before.mtimeMs === after.mtimeMs);

if (before === null && after === null) {
  console.log('\nDevelopment database: not present (nothing to protect).');
} else if (unchanged) {
  console.log(`\nDevelopment database unchanged by the test run (sha256 ${before.sha256}).`);
} else {
  console.error(
    '\nERROR: data/wishes.db changed during the test run.\n' +
      'Tests only use temporary databases, so either a test is not isolated or the dev server was\n' +
      'used while the tests ran. Stop the dev server and re-run; if it still fails, treat it as a bug.'
  );
}

if (result.error) console.error(result.error);
process.exit(result.status !== 0 ? result.status || 1 : unchanged ? 0 : 1);
