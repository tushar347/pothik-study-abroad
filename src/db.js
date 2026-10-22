const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

async function createDatabase(databasePath = process.env.DATABASE_PATH) {
  const dataDir = path.join(__dirname, '..', 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = databasePath ? path.resolve(databasePath) : path.join(dataDir, 'pothik.sqlite');
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm');
  const SQL = await initSqlJs({ locateFile: (file) => path.join(path.dirname(wasmPath), file) });
  const raw = fs.existsSync(dbPath) ? new SQL.Database(new Uint8Array(fs.readFileSync(dbPath))) : new SQL.Database();
  let transactionDepth = 0;
  let closed = false;

  const persist = () => {
    if (closed || transactionDepth > 0) return;
    const bytes = raw.export();
    const temp = `${dbPath}.tmp`;
    fs.writeFileSync(temp, Buffer.from(bytes));
    fs.renameSync(temp, dbPath);
  };
  const db = {
    raw,
    exec(sql) { raw.exec(sql); persist(); },
    pragma() { /* sql.js runs in-memory; persistence is explicit after each write. */ },
    prepare(sql) {
      return {
        get(...params) {
          const st = raw.prepare(sql);
          try { st.bind(params); return st.step() ? st.getAsObject() : undefined; }
          finally { st.free(); }
        },
        all(...params) {
          const st = raw.prepare(sql); const rows = [];
          try { st.bind(params); while (st.step()) rows.push(st.getAsObject()); return rows; }
          finally { st.free(); }
        },
        run(...params) {
          raw.run(sql, params);
          const changes = raw.getRowsModified();
          const result = raw.exec('SELECT last_insert_rowid() AS id');
          const lastInsertRowid = result[0]?.values?.[0]?.[0] || 0;
          persist();
          return { changes, lastInsertRowid };
        }
      };
    },
    transaction(fn) {
      return (...args) => {
        raw.run('BEGIN'); transactionDepth++;
        try { const result = fn(...args); transactionDepth--; raw.run('COMMIT'); persist(); return result; }
        catch (e) { transactionDepth--; try { raw.run('ROLLBACK'); } catch {} persist(); throw e; }
      };
    },
    close() { if (closed) return; persist(); raw.close(); closed = true; }
  };

  raw.run('PRAGMA foreign_keys = ON');
  raw.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student' CHECK(role IN ('student','admin')),
      preferred_language TEXT NOT NULL DEFAULT 'en',
      email_verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS student_profiles (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      data_json TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS program_requirements (
      cache_key TEXT PRIMARY KEY,
      university TEXT NOT NULL, program TEXT NOT NULL, degree TEXT NOT NULL,
      data_json TEXT NOT NULL, sources_json TEXT NOT NULL DEFAULT '[]', official_verified INTEGER NOT NULL DEFAULT 0,
      fetched_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS university_catalogs (
      cache_key TEXT PRIMARY KEY,
      university TEXT NOT NULL,
      programs_json TEXT NOT NULL DEFAULT '[]', sources_json TEXT NOT NULL DEFAULT '[]', mode TEXT NOT NULL DEFAULT '',
      fetched_at INTEGER NOT NULL, last_requested_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS admission_checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      cache_key TEXT NOT NULL,
      university TEXT NOT NULL, program TEXT NOT NULL, degree TEXT NOT NULL,
      result_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, cache_key)
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
    CREATE TABLE IF NOT EXISTS verification_tokens (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      purpose TEXT NOT NULL CHECK(purpose IN ('verify','reset')),
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS countries (
      id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
      flag TEXT NOT NULL, summary TEXT NOT NULL, tuition TEXT NOT NULL, living TEXT NOT NULL,
      language TEXT NOT NULL, official_url TEXT NOT NULL, last_verified TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'starter'
    );
    CREATE TABLE IF NOT EXISTS resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, category TEXT NOT NULL,
      country_slug TEXT, body TEXT NOT NULL, source_url TEXT NOT NULL, source_name TEXT NOT NULL,
      verified_at TEXT NOT NULL, language TEXT NOT NULL DEFAULT 'en', published INTEGER NOT NULL DEFAULT 1, embedding_json TEXT
    );
    CREATE TABLE IF NOT EXISTS programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, university TEXT NOT NULL, program TEXT NOT NULL,
      country_slug TEXT NOT NULL, level TEXT NOT NULL, language TEXT NOT NULL, tuition_note TEXT NOT NULL,
      official_url TEXT NOT NULL, verified_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS scholarships (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, country_slug TEXT NOT NULL,
      level TEXT NOT NULL, overview TEXT NOT NULL, official_url TEXT NOT NULL, deadline_note TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS scholarship_opportunities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      country_slug TEXT NOT NULL,
      country_name TEXT NOT NULL,
      provider TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      level TEXT NOT NULL DEFAULT 'Varies',
      deadline_date TEXT,
      deadline_label TEXT NOT NULL DEFAULT 'Check official source',
      status TEXT NOT NULL DEFAULT 'check-source',
      official_url TEXT NOT NULL,
      source_url TEXT NOT NULL,
      source_checked_at TEXT,
      source_kind TEXT NOT NULL DEFAULT 'curated',
      review_required INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(official_url)
    );
    CREATE INDEX IF NOT EXISTS idx_opportunities_country ON scholarship_opportunities(country_slug);
    CREATE INDEX IF NOT EXISTS idx_opportunities_status ON scholarship_opportunities(status);
    CREATE TABLE IF NOT EXISTS ielts_exercises (
      exercise_id TEXT PRIMARY KEY,
      skill TEXT NOT NULL,
      difficulty TEXT NOT NULL DEFAULT 'Foundation',
      minutes INTEGER NOT NULL DEFAULT 5,
      title TEXT NOT NULL,
      prompt TEXT NOT NULL,
      options_json TEXT NOT NULL DEFAULT '[]',
      answer INTEGER,
      explanation TEXT NOT NULL,
      audio_text TEXT,
      published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_ielts_skill ON ielts_exercises(skill, difficulty);
    CREATE TABLE IF NOT EXISTS tutor_cache (
      cache_key TEXT PRIMARY KEY,
      mode TEXT NOT NULL,
      language TEXT NOT NULL,
      answer TEXT NOT NULL,
      sources_json TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_tutor_cache_expiry ON tutor_cache(expires_at);
    CREATE TABLE IF NOT EXISTS roadmaps (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL, country_slug TEXT NOT NULL, intake TEXT NOT NULL, profile_json TEXT NOT NULL,
      tasks_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      category TEXT NOT NULL, description TEXT NOT NULL, evidence_note TEXT, status TEXT NOT NULL DEFAULT 'received',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      quiz_type TEXT NOT NULL, score INTEGER NOT NULL, total INTEGER NOT NULL, answers_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS chat_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      question TEXT NOT NULL, answer TEXT NOT NULL, sources_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category);
    CREATE INDEX IF NOT EXISTS idx_resources_country ON resources(country_slug);
    CREATE INDEX IF NOT EXISTS idx_roadmaps_user ON roadmaps(user_id);
  `);
  // Safe migration for databases created by an earlier version.
  try { raw.run('ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0'); } catch (e) { if (!String(e.message).includes('duplicate column name')) throw e; }
  try { raw.run("ALTER TABLE university_catalogs ADD COLUMN domain TEXT NOT NULL DEFAULT ''"); } catch (e) { if (!String(e.message).includes('duplicate column name')) throw e; }
  try { raw.run('ALTER TABLE users ADD COLUMN avatar_path TEXT'); } catch (e) { if (!String(e.message).includes('duplicate column name')) throw e; }
  try { raw.run('ALTER TABLE resources ADD COLUMN embedding_json TEXT'); } catch (e) { if (!String(e.message).includes('duplicate column name')) throw e; }
  // Preserve legacy rows and stop with a clear error instead of silently deleting duplicates.
  const duplicateGroups = [
    ['resources', 'title, source_url'],
    ['programs', 'university, program, country_slug, official_url'],
    ['scholarships', 'name, country_slug, official_url']
  ].filter(([table, columns]) => raw.exec(`SELECT 1 FROM ${table} GROUP BY ${columns} HAVING COUNT(*) > 1 LIMIT 1`).length);
  if (duplicateGroups.length) {
    throw new Error(`Database initialization stopped because duplicate seed rows exist in ${duplicateGroups.map(([table]) => table).join(', ')}. Back up the database and resolve the duplicate rows before restarting; no rows were deleted.`);
  }
  raw.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_resources_title_source ON resources(title, source_url);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_programs_unique ON programs(university, program, country_slug, official_url);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_scholarships_unique ON scholarships(name, country_slug, official_url);`);
  persist();
  return db;
}

module.exports = { createDatabase };
