# Pothik Premium — Study Abroad + IELTS + RAG Counsellor

A customizable, responsive web application for study-abroad discovery and IELTS practice. This package combines the burgundy/cream/pastel Stitch design direction with a real Node.js backend, a persistent SQLite database powered by WebAssembly, account authentication, private roadmaps, source-linked resources and a retrieval-augmented AI counsellor.

## Requirements

- Node.js 20+ (Node.js 24 is supported; this project does not use native C++ database bindings)
- npm
- Optional: OpenAI API key for generated AI answers and vector embeddings
- Optional for production: SMTP credentials for email verification and password reset

## Run on Windows (VS Code PowerShell)

1. Open the project folder in VS Code.
2. Create `.env` only if it does not already exist; keep any existing environment file:

   ```powershell
   if (-not (Test-Path .env)) { Copy-Item .env.example .env }
   ```

3. Set a long random `SESSION_SECRET` in `.env`. For example, generate one with:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

4. Install locked dependencies and run the checks:

   ```powershell
   npm ci
   npm run check
   npm test
   ```

5. Start the server:

   ```powershell
   npm start
   ```

6. Open http://localhost:3000.

The SQLite database is created at `data/pothik.sqlite` on first launch and seeded with starter country guides, resources, programme catalogues and scholarship starting points. The database file persists between restarts.

## Account security

- Passwords are hashed with bcryptjs.
- Sessions use cryptographically random opaque tokens; only token hashes are stored in SQLite.
- Session cookies are HttpOnly and SameSite=Lax; Secure is enabled in production.
- Login, signup, password-reset and counsellor endpoints are rate-limited.
- API input is validated; private roadmap routes are scoped to the authenticated user.
- The app checks request origins for state-changing API calls.
- Production signup should use SMTP email verification. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`.
- For production, set `NODE_ENV=production`, a strong `SESSION_SECRET`, and the exact public `APP_ORIGIN` such as `https://pothik.example`. Serve behind HTTPS.

### Local development accounts

When SMTP is not configured in development, signup creates a local account without email verification so the app can be tested offline. This is not an appropriate production setting. Configure SMTP and production environment variables before accepting real users.

### Optional admin account

Set `ADMIN_EMAIL` and a unique `ADMIN_PASSWORD` in `.env` before the first start. The server creates that admin account if it does not exist. Do not put real credentials in source control. If the database already has an account with that email, this bootstrap does not overwrite its password.

Admin users can open **Admin workspace** in the footer to edit `content/site-content.json` through the browser and upload new images. Uploads are limited to PNG, JPEG and WebP files up to 6 MB. Site image paths and copy are configurable without editing frontend code.

## AI counsellor and RAG

The always-available Pothik counsellor can retrieve local knowledge-base resources even without an API key. Without `OPENAI_API_KEY`, it operates in retrieval-only mode and does not generate a new AI response.

To enable generated answers, add your OpenAI API key to `.env`:

```env
OPENAI_API_KEY=your-key-here
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

Restart the server. API usage may incur charges. To create embeddings for the seeded resource collection, run:

```powershell
npm run embed:resources
```

RAG retrieves relevant resource chunks and includes source links in answers. It is not a guarantee that every answer is correct or current. Verify admissions, funding, tuition and visa requirements on official sources before acting.

## Customize images and content

- Default image and brand paths live in `content/site-content.json`.
- Image files are stored under `public/assets/countries`, `public/assets/ielts`, and `public/assets/brand`.
- Admin workspace can upload replacements and update image paths in the content config.
- Do not commit private uploads, `.env`, API keys or credentials.

The included country and IELTS images are locally bundled assets. You can replace them with appropriately licensed images from the admin workspace.

## Available sections

- Country tabs and destination guides for Germany, Canada, the USA, the UK and Australia
- Country image cards with flag treatments
- IELTS Reading, Writing, Listening and Speaking practice
- Roadmap creation, task tracking and private persistence
- Resource search, programme catalogues and scholarship starting points
- Floating AI counsellor with source links
- Scam/outdated-information report form
- Admin content editor and image upload
- Signup, sign-in, logout, email verification (when SMTP is configured), forgot/reset password

## Useful commands

```powershell
npm run check
npm run seed
npm run embed:resources
npm start
```

`npm run seed` is repeatable: it adds missing country/catalogue rows and updates matching IELTS exercises and lessons. It does not delete the database.

## Important limitations before public launch

This is a functional MVP codebase, not a security-audited production service. Before launch, conduct dependency and penetration testing, configure reliable backups, email delivery, monitoring, privacy/legal review, HTTPS, retention policies, and restore drills. Starter source records are labelled `PENDING REVIEW`; do not represent them as verified until a human has checked each source and recorded the date.

## IELTS Studio and scholarship monitoring (v2.1)

The IELTS Studio includes 36 original practice tasks across Reading, Listening, Writing and Speaking, 24 original skill lessons, and 15 curated links to public official preparation resources. Pothik links to IELTS.org, the British Council and IDP rather than republishing copyrighted test papers, books or audio. Listening exercises use browser speech synthesis for lightweight local playback; this does not require an AI API.

The counsellor retrieves from the local SQLite-WASM database first. Exact repeat questions are cached for 14 days, while questions containing time-sensitive terms (for example, deadlines, current policy or latest calls) bypass the answer cache. Query-embedding API calls are disabled by default; set `RAG_USE_QUERY_EMBEDDINGS=true` only if you want to trade additional API usage for vector retrieval. `OPENAI_API_KEY` is only needed for generated answers, not the local resource library or practice engine.

### Scholarship source index

The application seeds 11 official scholarship-index and country-specific starting points across Germany, Canada, the United States, the United Kingdom and Australia, including the University of Manchester Global Futures Scholarship 2027 Bangladesh page. When `SCHOLARSHIP_AUTO_REFRESH=true` (the default in `.env.example`), it checks configured official index pages in the background after startup and then every 24 hours. Newly found links are stored as `needs-review` candidates unless the page provides a parsable date; candidate records remain visibly flagged for human verification. This is a discovery aid, not an exhaustive scholarship feed, and it does not bypass logins or copy full pages.

To run a check manually, stop the running server first (`Ctrl+C`) so two SQLite-WASM processes do not write the same database file at once:

```powershell
npm run refresh:scholarships
npm start
```

For a full in-app manual refresh button, sign in with an administrator account. The admin account can be bootstrapped by setting `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` before starting the app. Review candidate titles, eligibility and deadlines at the official destination before promoting them. The scraper only stores a short snippet and source link; it does not republish source-page content.

### New database tables

- `ielts_exercises`: original practice tasks and answer keys
- `scholarship_opportunities`: curated opportunity links and reviewable discovery candidates
- `tutor_cache`: short-lived cached tutor answers and their source references

## Development and verification

```powershell
npm run check
npm test
npm audit
```

The tests use temporary databases under the operating-system temp directory. To keep a test or local server away from `data/pothik.sqlite`, set an absolute `DATABASE_PATH` before starting:

```powershell
$env:DATABASE_PATH = Join-Path $env:TEMP 'pothik-local.sqlite'
npm start
```

Unset the variable after stopping the server with `Remove-Item Env:DATABASE_PATH`. Avoid running the server and `npm run refresh:scholarships` concurrently against the same database file.

## Backup, troubleshooting, and deployment

Stop the server before copying `data/pothik.sqlite`; the database adapter persists writes to disk as they occur, and the file is a single-process store. Keep the copy outside the repository and protect it as personal data. For normal setup the server creates the database and seeds starter data automatically.

If one section fails, inspect the browser developer console for `[Pothik UI]` or `[Pothik boot]` messages and use the named endpoint to isolate the failure. `/api/health` reports application/database and AI configuration status. If startup reports duplicate seed keys in an older database, back it up and review the named catalog table; initialization stops rather than deleting rows.

Before deployment, configure HTTPS, production `APP_ORIGIN`, `SESSION_SECRET` of at least 32 characters, SMTP, backups/restore drills, monitoring and a durable database/session design suitable for the deployment topology. The current application is an MVP, not a production security certification.

## Engineering documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [SECURITY.md](./SECURITY.md)
- [docs/API.md](./docs/API.md)
- [docs/DATABASE.md](./docs/DATABASE.md)
- [docs/RAG-AND-AI.md](./docs/RAG-AND-AI.md)
- [docs/SCHOLARSHIP-PIPELINE.md](./docs/SCHOLARSHIP-PIPELINE.md)
- [docs/ASSET-MAP.md](./docs/ASSET-MAP.md)
- [docs/STITCH-DESIGN-SYSTEM.md](./docs/STITCH-DESIGN-SYSTEM.md)
- [content/CONTENT_GUIDE.md](./content/CONTENT_GUIDE.md)
- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [CHANGELOG.md](./CHANGELOG.md)
- [docs/DEVELOPMENT-HISTORY.md](./docs/DEVELOPMENT-HISTORY.md)
- [docs/ROADMAP.md](./docs/ROADMAP.md)
- [docs/LLM-CONTEXT.md](./docs/LLM-CONTEXT.md)
- [docs/TEST-REPORT.md](./docs/TEST-REPORT.md)
