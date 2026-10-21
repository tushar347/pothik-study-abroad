const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createDatabase } = require('../src/db');
const seed = require('../src/seed');
const { absoluteUrl, inferDeadline, isTrustedSourceHost, refreshScholarships } = require('../src/opportunities');

test('seeded content is idempotent and persists across database reopen', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pothik-test-'));
  const databasePath = path.join(directory, 'pothik.sqlite');
  let db;
  t.after(() => {
    db?.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  db = await createDatabase(databasePath);
  seed(db);
  const firstCounts = {
    countries: db.prepare('SELECT COUNT(*) AS n FROM countries').get().n,
    resources: db.prepare('SELECT COUNT(*) AS n FROM resources').get().n,
    exercises: db.prepare('SELECT COUNT(*) AS n FROM ielts_exercises').get().n,
    opportunities: db.prepare('SELECT COUNT(*) AS n FROM scholarship_opportunities').get().n
  };

  assert.equal(firstCounts.countries, 5);
  assert.ok(firstCounts.resources > 0);
  assert.ok(firstCounts.exercises > 0);
  assert.equal(firstCounts.opportunities, require('../src/opportunities').CURATED.length);

  seed(db);
  assert.deepEqual({
    countries: db.prepare('SELECT COUNT(*) AS n FROM countries').get().n,
    resources: db.prepare('SELECT COUNT(*) AS n FROM resources').get().n,
    exercises: db.prepare('SELECT COUNT(*) AS n FROM ielts_exercises').get().n,
    opportunities: db.prepare('SELECT COUNT(*) AS n FROM scholarship_opportunities').get().n
  }, firstCounts);

  db.close();
  db = await createDatabase(databasePath);
  assert.deepEqual({
    countries: db.prepare('SELECT COUNT(*) AS n FROM countries').get().n,
    resources: db.prepare('SELECT COUNT(*) AS n FROM resources').get().n,
    exercises: db.prepare('SELECT COUNT(*) AS n FROM ielts_exercises').get().n,
    opportunities: db.prepare('SELECT COUNT(*) AS n FROM scholarship_opportunities').get().n
  }, firstCounts);
});

test('scholarship source links reject unsafe schemes and lookalike hosts', () => {
  assert.equal(absoluteUrl('/scholarships', 'https://example.org/index'), 'https://example.org/scholarships');
  assert.equal(absoluteUrl('javascript:alert(1)', 'https://example.org/index'), null);
  assert.equal(isTrustedSourceHost('https://www.manchester.ac.uk/scholarships', 'https://www.manchester.ac.uk/index'), true);
  assert.equal(isTrustedSourceHost('https://manchester.ac.uk.attacker.example/scholarships', 'https://www.manchester.ac.uk/index'), false);
});

test('deadline parsing classifies past dates and ignores invalid dates', () => {
  assert.equal(inferDeadline('Deadline: 2000-01-01').status, 'closed');
  assert.equal(inferDeadline('Deadline: 2099-01-01').status, 'upcoming');
  assert.equal(inferDeadline('Deadline: 2099-99-99'), null);
});

test('a failed source refresh preserves curated scholarship records', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pothik-refresh-test-'));
  let db;
  const originalFetch = global.fetch;
  t.after(() => {
    global.fetch = originalFetch;
    db?.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  db = await createDatabase(path.join(directory, 'pothik.sqlite'));
  const existing = require('../content/scholarship-opportunities.json')[0];
  global.fetch = async () => { throw new Error('simulated source outage'); };
  const report = await refreshScholarships(db, {
    sources: [{ name: 'Test source', url: existing.official_url }],
    timeoutMs: 100
  });

  assert.equal(report.checked, 1);
  assert.equal(report.failed.length, 1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM scholarship_opportunities WHERE official_url=?').get(existing.official_url).n, 1);
});

test('Gemini provider sends system prompt and history, and returns the answer text', async t => {
  const originalFetch = global.fetch;
  const originalEnv = { GEMINI_API_KEY: process.env.GEMINI_API_KEY, GEMINI_MODEL: process.env.GEMINI_MODEL };
  t.after(() => {
    global.fetch = originalFetch;
    for (const [k, v] of Object.entries(originalEnv)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  });
  process.env.GEMINI_API_KEY = 'test-key';
  process.env.GEMINI_MODEL = 'gemini-test';
  const ai = require('../src/ai');
  let request;
  global.fetch = async (url, init) => {
    request = { url, headers: init.headers, body: JSON.parse(init.body) };
    return { ok: true, status: 200, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'thinking', thought: true }, { text: 'Hello from Gemini' }] } }] }) };
  };

  assert.equal(ai.provider(), 'gemini');
  const answer = await ai.generate({ system: 'Be helpful', history: [{ role: 'user', content: 'Hi' }, { role: 'assistant', content: 'Hello' }], question: 'Germany costs?' });
  assert.equal(answer, 'Hello from Gemini');
  assert.match(request.url, /models\/gemini-test:generateContent$/);
  assert.equal(request.headers['x-goog-api-key'], 'test-key');
  assert.equal(request.body.systemInstruction.parts[0].text, 'Be helpful');
  assert.deepEqual(request.body.contents.map(c => c.role), ['user', 'model', 'user']);

  global.fetch = async () => ({ ok: false, status: 400, statusText: 'Bad Request', json: async () => ({ error: { message: 'API key not valid' } }) });
  await assert.rejects(ai.generate({ system: 's', question: 'q' }), /Gemini 400: API key not valid/);

  // An overloaded main model falls through to the next configured model.
  process.env.GEMINI_FALLBACK_MODEL = 'gemini-backup';
  t.after(() => { delete process.env.GEMINI_FALLBACK_MODEL; });
  const tried = [];
  global.fetch = async url => {
    tried.push(url.match(/models\/([^:]+):/)[1]);
    if (tried.length === 1) return { ok: false, status: 503, statusText: 'Unavailable', json: async () => ({ error: { message: 'high demand' } }) };
    return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'Backup answer' }] } }] }) };
  };
  assert.equal(await ai.generate({ system: 's', question: 'q' }), 'Backup answer');
  assert.deepEqual(tried, ['gemini-test', 'gemini-backup']);
});

test('database initialization refuses duplicate legacy rows without rewriting the file', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pothik-migration-test-'));
  const databasePath = path.join(directory, 'pothik.sqlite');
  let db;
  t.after(() => {
    db?.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  db = await createDatabase(databasePath);
  db.raw.exec('DROP INDEX idx_resources_title_source');
  const insert = db.prepare('INSERT INTO resources(title,category,body,source_url,source_name,verified_at) VALUES(?,?,?,?,?,?)');
  insert.run('Legacy duplicate', 'Test', 'First copy', 'https://example.invalid/resource', 'Test', 'Not verified');
  insert.run('Legacy duplicate', 'Test', 'Second copy', 'https://example.invalid/resource', 'Test', 'Not verified');
  db.close();
  db = null;

  const original = fs.readFileSync(databasePath);
  await assert.rejects(createDatabase(databasePath), /duplicate seed rows exist in resources/);
  assert.deepEqual(fs.readFileSync(databasePath), original);
});
