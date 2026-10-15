// Starts the real application (`node server.js`, the same entry point as `npm start`) as a child
// process against a temporary test database, and offers small HTTP helpers.
const { spawn } = require('child_process');
const net = require('net');
const path = require('path');
const { REPO_ROOT, assertSafeDbPath } = require('./env');

const START_TIMEOUT_MS = 30000;

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(baseUrl, child, logs) {
  const deadline = Date.now() + START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Server exited early (code ${child.exitCode}):\n${logs.join('')}`);
    }
    try {
      const res = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(1000) });
      if (res.ok) return;
    } catch (err) {
      // not listening yet
    }
    await sleep(100);
  }
  throw new Error(`Server did not become healthy in ${START_TIMEOUT_MS}ms:\n${logs.join('')}`);
}

async function spawnOnce(dbPath) {
  const port = await freePort();
  const logs = [];
  const child = spawn(process.execPath, [path.join(REPO_ROOT, 'server.js')], {
    cwd: REPO_ROOT,
    // DB_PATH is always set explicitly to the verified temporary database.
    env: { ...process.env, DB_PATH: dbPath, PORT: String(port), NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout.on('data', (d) => logs.push(String(d)));
  child.stderr.on('data', (d) => logs.push(String(d)));

  const baseUrl = `http://127.0.0.1:${port}`;

  async function stop() {
    if (child.exitCode !== null) return;
    const exited = new Promise((resolve) => child.once('exit', resolve));
    child.kill();
    await Promise.race([exited, sleep(5000)]);
    if (child.exitCode === null) child.kill('SIGKILL');
  }

  try {
    await waitForHealth(baseUrl, child, logs);
  } catch (err) {
    await stop();
    throw err;
  }
  return { baseUrl, port, logs, stop };
}

// Starts the server against `dbPath`, which must be inside a hw-test-* temp directory.
// Retries once or twice if the randomly chosen port was taken in the meantime.
async function startServer(dbPath) {
  const safePath = assertSafeDbPath(dbPath);
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await spawnOnce(safePath);
    } catch (err) {
      lastError = err;
      if (!/EADDRINUSE/.test(String(err.message))) break;
    }
  }
  throw lastError;
}

// Minimal HTTP client: returns { status, headers, text, json } (json is null when the body isn't JSON).
async function request(baseUrl, method, urlPath, { json, body, headers } = {}) {
  const init = { method, headers: { ...(headers || {}) } };
  if (json !== undefined) {
    init.body = JSON.stringify(json);
    init.headers['Content-Type'] = 'application/json';
  } else if (body !== undefined) {
    init.body = body;
  }
  const res = await fetch(baseUrl + urlPath, init);
  const text = await res.text();
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    // not JSON
  }
  return { status: res.status, headers: res.headers, text, json: parsed };
}

module.exports = { startServer, request };
