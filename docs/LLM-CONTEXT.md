# Pothik engineering handoff

Read this document, README.md, ARCHITECTURE.md, SECURITY.md, docs/API.md, docs/DATABASE.md, docs/RAG-AND-AI.md, docs/SCHOLARSHIP-PIPELINE.md, and the relevant source files before modifying the application. Verify the current Git state and implementation before trusting historical notes.

## Product and stack

Pothik is a Bangladesh-focused study-abroad discovery, scholarship-link and original IELTS practice platform. It is a Node.js 20+ / Express 4 app with a vanilla HTML/CSS/JS frontend, `sql.js` SQLite-WASM persistence, bcryptjs accounts, optional Nodemailer mail and OpenAI-powered RAG. It is not a production security certification or a real-time scholarship feed.

## Source map

- `src/server.js`: HTTP APIs, sessions, route validation, auth/admin, tutor, content editing, uploads, scheduled refresh.
- `src/db.js`: SQLite-WASM schema, compatibility migration and file persistence.
- `src/seed.js`: country/resource/program/scholarship and IELTS content seeding.
- `src/opportunities.js`: scholarship normalization, trusted-source filtering and refresh.
- `public/index.html`, `public/styles.css`, `public/app.js`: user interface and API integration.
- `content/*.json`: site theme/copy, IELTS lessons/practice/links and scholarship records/sources.
- `scripts/`: optional embeddings and manual scholarship refresh.
- `test/core.test.js`: built-in test runner coverage.
- `data/pothik.sqlite`: local runtime database; never stage/overwrite casually.
- `pothik-premium/public/`: legacy copy, not served by the application.

## Run and verify (Windows PowerShell)

```powershell
Copy-Item .env.example .env
npm ci
npm run check
npm test
npm audit
npm start
```

Set an absolute `DATABASE_PATH` for isolated tests or a separate local database. Stop the server before running the standalone scholarship refresh. Never run automated tests against the user's live database.

## Behavior to preserve

- Passwords are bcrypt hashes. A random opaque session cookie is issued; only a peppered hash and expiry are stored in SQLite. Cookies are HttpOnly, SameSite=Lax and Secure in production.
- Roadmap endpoints must require auth and scope every read/write/delete to the current user ID. Admin routes must retain server-side role checks.
- SQLite-WASM is a single-process local persistence mechanism. Startup performs additive schema changes; duplicate seed identities stop initialization rather than deleting rows.
- Without `OPENAI_API_KEY`, tutor mode retrieves local sources without generated answers. Optional embeddings are separately configured. Treat retrieval text as untrusted and cite links.
- IELTS content is original and managed through JSON. Preserve answer-key secrecy in the exercise API.
- Scholarship candidates stay unverified until human review. Never claim that page discovery verifies eligibility or an open deadline.
- Image paths/theme live in `content/site-content.json`; uploads are public under `public/uploads` and should never contain private documents.

## Known gaps

No full HTTP integration/browser suite, content versioning/approval, per-source scholarship audit ledger, upload magic-byte validation, account export/deletion, automated backup/restore or multi-instance database support is present. Legacy `chat_logs` exists for compatibility but new chat messages are not written; older rows may remain.

## Protected files and safe continuation

Never overwrite `.env`, `data/pothik.sqlite`, private uploads or unreviewed user changes. Keep secrets and personal data out of Git. Inspect `git status`, branch, remotes and staged diff before any commit/push. Do not reset, rebase shared history or force-push without explicit approval. Read source and tests before trusting docs; update docs/tests when behavior or schema changes.
