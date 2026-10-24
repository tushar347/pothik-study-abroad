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

test('student profile validation accepts real score formats and rejects impossible ones', () => {
  const { profileSchema, completeness, summarize } = require('../src/profile');
  const ok = profileSchema.safeParse({
    phone: '+880 1711-000000', targetDegree: 'master', fieldOfStudy: 'Computer Science', preferredCountries: ['germany', 'canada'],
    intakeSeason: 'fall', intakeYear: '2027', currentStatus: 'bachelor-completed', sscGpa: '5', hscGpa: 4.83,
    bachelorCgpa: 3.45, bachelorScale: '4', englishTest: 'ielts-academic', ieltsOverall: 7.5, ieltsWriting: 6.5,
    graduateTest: 'gre', greVerbal: 155, greQuant: 165, greWriting: 4, unknownField: 'dropped'
  });
  assert.equal(ok.success, true, JSON.stringify(ok.error?.issues));
  assert.equal(ok.data.intakeYear, 2027);
  assert.equal(ok.data.unknownField, undefined);
  const summary = summarize(ok.data, 'Rahim Uddin');
  assert.match(summary, /IELTS Academic — overall 7.5/);
  assert.match(summary, /- SSC GPA: 5 out of 5\n- HSC GPA: 4.83 out of 5/);
  assert.ok(completeness(ok.data).missing.includes('budget'));

  const errorsFor = input => profileSchema.safeParse(input).error?.issues.map(i => i.path[0]) || [];
  assert.deepEqual(errorsFor({ ieltsOverall: 7.25 }), ['ieltsOverall']);
  assert.deepEqual(errorsFor({ greQuant: 171 }), ['greQuant']);
  assert.deepEqual(errorsFor({ bachelorCgpa: 3.9, bachelorScale: '4' }), []);
  assert.deepEqual(errorsFor({ bachelorCgpa: 4.5, bachelorScale: '4' }), ['bachelorCgpa']);
  assert.deepEqual(errorsFor({ toeflScale: 'new', toeflTotal: 95 }), ['toeflTotal']);
  assert.deepEqual(errorsFor({ toeflScale: 'old', toeflTotal: 95 }), []);
  assert.deepEqual(errorsFor({ gmatTotal: 650 }), ['gmatTotal']);
  assert.deepEqual(errorsFor({ gmatTotal: 655 }), []);
  assert.deepEqual(errorsFor({ preferredCountries: ['atlantis'] }), ['preferredCountries']);
});

test('admission estimate separates eligibility from chance and compares minimums', () => {
  const { assessChances, germanGrade } = require('../src/admissions');
  const tum = { academic: {}, english: {}, gre: { status: 'required', min_quant: 164, min_writing: 4 }, selectivity: 'very_high' };
  const base = { bachelorCgpa: 3.3, bachelorScale: '4', englishTest: 'ielts-academic', ieltsOverall: 7.5 };

  const noGre = assessChances(base, tum, 'master');
  assert.equal(noGre.eligibility, 'missing-requirements');
  assert.equal(noGre.band, 'Not yet eligible');
  assert.deepEqual(noGre.missing, ['GRE']);
  assert.ok(noGre.potential?.band);

  assert.equal(assessChances({ ...base, graduateTest: 'gre', greQuant: 166, greWriting: 4.5 }, tum, 'master').eligibility, 'eligible');
  const low = assessChances({ ...base, graduateTest: 'gre', greQuant: 160, greWriting: 3.5 }, tum, 'master');
  assert.equal(low.eligibility, 'below-minimum');
  assert.equal(low.band, 'Unlikely');

  // A strong student against a moderate programme with published minimums.
  const moderate = { academic: { min_gpa: 3.0, gpa_scale: 4 }, english: { ielts_overall: 6.5 }, gre: { status: 'not_required' }, selectivity: 'moderate' };
  const strong = assessChances({ ...base, bachelorCgpa: 3.8, ieltsListening: 7, ieltsReading: 7, ieltsWriting: 7, ieltsSpeaking: 7 }, moderate, 'master');
  assert.equal(strong.eligibility, 'eligible');
  assert.equal(strong.band, 'Strong');
  assert.equal(assessChances({ ...base, bachelorCgpa: 2.6 }, moderate, 'master').band, 'Unlikely');
  assert.equal(assessChances({ ...base, ieltsOverall: 6.0 }, moderate, 'master').eligibility, 'below-minimum');

  // Modified Bavarian formula on the 4.00 scale with 2.00 as pass: 3.5 → 1.75, 4.0 → 1.0.
  assert.equal(germanGrade(3.5, 4), 1.75);
  assert.equal(germanGrade(4, 4), 1);
});

test('admissions helpers block private addresses and parse model replies leniently', () => {
  const { isPrivateAddress, requirementSchema, suggestionsFrom, docSchema } = require('../src/admissions');
  const ai = require('../src/ai');
  for (const ip of ['127.0.0.1', '10.0.0.5', '192.168.1.1', '172.20.0.1', '169.254.169.254', '::1', 'fd00::1', '::ffff:127.0.0.1']) assert.equal(isPrivateAddress(ip), true, ip);
  for (const ip of ['8.8.8.8', '129.187.255.109', '2a00:1450:4001::200e']) assert.equal(isPrivateAddress(ip), false, ip);

  assert.deepEqual(ai.parseJson('Here you go:\n```json\n{"a":1}\n```'), { a: 1 });
  const req = requirementSchema.parse({ academic: { min_gpa: '3.0 out of 4', gpa_scale: 'N/A' }, english: { ielts_overall: '6.5' }, selectivity: 'extreme', deadlines: 'soon' });
  assert.equal(req.academic.min_gpa, 3);
  assert.equal(req.academic.gpa_scale, null);
  assert.equal(req.english.ielts_overall, 6.5);
  assert.equal(req.selectivity, 'unknown');
  assert.deepEqual(req.deadlines, []);

  const hsc = suggestionsFrom(docSchema.parse({ document_type: 'alim', gpa: 4.92, gpa_scale: 5, year: 2019 }));
  assert.deepEqual(hsc, { hscGpa: 4.92, hscYear: 2019, secondarySystem: 'madrasah' });
  const ielts = suggestionsFrom(docSchema.parse({ document_type: 'ielts', ielts: { overall: 7.5, listening: 8, reading: 7.5, writing: 6.5, speaking: 7, module: 'Academic', test_date: '2026-09-12' } }));
  assert.equal(ielts.englishTest, 'ielts-academic');
  assert.equal(ielts.ieltsWriting, 6.5);
  // Invalid values (e.g. an impossible IELTS band) are dropped, not saved.
  assert.equal(suggestionsFrom(docSchema.parse({ document_type: 'ielts', ielts: { overall: 7.3 } })).ieltsOverall, undefined);
});

test('university names map to the degree levels they can usually award', () => {
  const { levelsFor } = require('../src/universities');
  assert.ok(!levelsFor('Massachusetts Bay Community College').includes('master'));
  assert.ok(!levelsFor('Lehigh Carbon Community College').includes('phd'));
  assert.ok(!levelsFor('Maricopa Community Colleges').includes('master'));
  assert.ok(!levelsFor('University of Arkansas Community College-Hope').includes('master'));
  const uas = levelsFor('Hochschule München University of Applied Sciences');
  assert.ok(uas.includes('master') && !uas.includes('phd'));
  assert.ok(!levelsFor('Fachhochschule Aachen').includes('phd'));
  // Real universities keep every level, even when "college" or "polytechnic" appears in the name.
  for (const name of ['Technische Universität München', 'Imperial College London', 'Boston College', 'Rensselaer Polytechnic Institute', 'Hong Kong Polytechnic University']) {
    assert.ok(levelsFor(name).includes('phd'), name);
  }
});

test('programme lists are built from official listing links, ignoring navigation and footers', () => {
  const { programmesFromLinks, cleanProgrammeName, degreeOf } = require('../src/admissions');
  const chrome = Array.from({ length: 12 }, (_, i) => ({ text: `Footer link ${i}`, href: `https://www.example-uni.de/en/about/page-${i}`, chrome: true }));
  // TUM-style: one folder, programme name in the link text.
  const tum = ['Informatics - Master of Science (M.Sc.)', 'Informatics - Bachelor of Science (B.Sc.)', 'Data Engineering and Analytics - Master of Science (M.Sc.)', 'Aerospace - Bachelor of Science (B.Sc.)', 'Architecture - Master of Arts (M.A.)', 'Management - Master of Science (M.Sc.)', 'Physics - Bachelor of Science (B.Sc.)', 'Chemistry - Master of Science (M.Sc.)', 'Lehramt Sport - State Exam Program']
    .map(t => ({ text: t, href: `https://www.example-uni.de/en/studies/degree-programs/detail/${t.toLowerCase().replace(/[^a-z]+/g, '-')}`, context: '' }));
  const a = programmesFromLinks([...chrome, ...tum, { text: 'Admission', href: 'https://www.example-uni.de/en/studies/admission' }], 'https://www.example-uni.de/en/studies/degree-programs');
  assert.equal(a.length, 9);
  assert.ok(a.some(p => p.name === 'Data Engineering and Analytics' && p.degree === 'master'));
  assert.ok(a.some(p => p.name === 'Informatics' && p.degree === 'bachelor'));
  assert.ok(!a.some(p => /footer/i.test(p.name)));
  // RWTH-style: each programme in its own folder, "read more" style labels resolved to headings by the browser.
  const rwth = ['Informatik M.Sc.', 'Informatik B.Sc.', 'Maschinenbau M.Sc.', 'Elektrotechnik B.Sc.', 'Physik M.Sc.', 'Chemie B.Sc.', 'Biologie M.Sc.', 'Architektur B.Sc.']
    .map((t, i) => ({ text: t, href: `https://www.rwth.example.de/cms/root/studium/Liste/Studiengangbeschreibung/~id${i}/${t.replace(/[ .]+/g, '-')}/lidx/1/` }));
  const b = programmesFromLinks([...chrome, ...rwth], 'https://www.rwth.example.de/cms/root/studium/Liste/lidx/1/');
  assert.equal(b.length, 8);
  assert.equal(b.filter(p => p.degree === 'master').length, 4);
  assert.equal(cleanProgrammeName('Informatics - Master of Science (M.Sc.)'), 'Informatics');
  assert.equal(degreeOf('Some Programme', 'some-programme-master-of-science-msc', ''), 'master');
});

test('uploaded documents are filed under the matching certificate card', () => {
  const { slotFor, DOCUMENT_SLOTS } = require('../src/admissions');
  assert.equal(slotFor('dakhil'), 'ssc');
  assert.equal(slotFor('a_level'), 'hsc');
  assert.equal(slotFor('bachelor_transcript'), 'bachelor');
  assert.equal(slotFor('ielts'), 'ielts');
  assert.equal(slotFor('gre'), 'gre');
  assert.equal(slotFor('toefl'), 'other');
  assert.deepEqual(Object.keys(DOCUMENT_SLOTS), ['ssc', 'hsc', 'bachelor', 'ielts', 'gre', 'other']);
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
