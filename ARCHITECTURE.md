# Architecture

## Verified source tree

```text
.
|-- content/                 Editable JSON content and content guide
|-- data/                    Local runtime SQLite-WASM database (ignored by Git)
|-- docs/                    Design references and engineering documentation
|-- public/
|   |-- assets/              Bundled brand, destination and IELTS images
|   |-- uploads/             Admin-managed image uploads (ignored by Git)
|   |-- app.js               Browser behavior and API integration
|   |-- index.html           Semantic page structure
|   `-- styles.css           Responsive visual system
|-- scripts/
|   |-- embed-resources.js   Optional OpenAI embedding generator
|   `-- refresh-scholarships.js
|-- src/
|   |-- db.js                SQLite-WASM adapter and schema initialization
|   |-- opportunities.js     Curated/upsert and official-index discovery logic
|   |-- seed.js              Repeatable country, resource and IELTS content seed
|   `-- server.js            Express application, APIs and startup
|-- test/
|   `-- core.test.js         Built-in Node test runner checks
|-- .env.example             Environment variable template
|-- package.json             Runtime scripts and dependencies
`-- package-lock.json        Locked dependency graph
```

The `pothik-premium/public/` directory is a legacy copy and is not served by `src/server.js`. The application serves the root `public/` directory. `data/pothik.sqlite`, `.env`, `node_modules/` and private files under `public/uploads/` must remain untracked.

## Runtime responsibilities

- **Browser:** `public/index.html` supplies page structure; `public/styles.css` implements the burgundy/cream design; `public/app.js` loads content, renders sections, handles forms and calls same-origin APIs. Independent endpoint failures are reported separately so working sections can still render.
- **Express:** `src/server.js` loads environment variables, applies Helmet, request-size limits, rate limiting and the state-changing request origin guard; it owns authentication, authorization, API validation, content editing, uploads and RAG orchestration.
- **Database:** `src/db.js` loads `sql.js`, creates/migrates the SQLite schema, and persists the in-memory database file after writes using a temporary file and rename. See [docs/DATABASE.md](./docs/DATABASE.md).
- **Content:** `content/site-content.json`, IELTS JSON files and scholarship JSON files are the editable sources; `src/seed.js` loads seedable content into the local database.
- **Background/manual jobs:** the server schedules scholarship refreshes when enabled; `scripts/refresh-scholarships.js` is the standalone refresh command and should not run against the same database concurrently with the server.

## Request and session flow

```mermaid
sequenceDiagram
  participant Browser
  participant Express
  participant SQLite as SQLite-WASM
  Browser->>Express: GET page and same-origin API requests
  Express->>SQLite: Read catalogues / user-scoped data
  SQLite-->>Express: Rows
  Express-->>Browser: JSON and static assets
  Browser->>Express: POST login credentials
  Express->>SQLite: Verify bcrypt hash; persist session-token hash
  Express-->>Browser: HttpOnly pothik.sid cookie
  Browser->>Express: Authenticated requests with cookie
  Express->>SQLite: Resolve hash and enforce ownership/role
```

Sessions use 32-byte random opaque tokens. Only a peppered SHA-256 hash is stored in `sessions`; the cookie is HttpOnly and SameSite=Lax, Secure in production, and expires after eight hours. Passwords use bcryptjs with cost 12. Roadmap reads and writes include the authenticated user ID in their SQL predicate.

## API and data flow

The browser loads site content, dashboard counts, resources, programs, scholarships, IELTS exercises/resources, the current user and scholarship opportunities independently. `/site-content.json` is an alternate route to the same `content/site-content.json` file. See [docs/API.md](./docs/API.md) for the current route inventory and validation.

The IELTS content pipeline is:

1. JSON lessons and original exercises are loaded by `src/seed.js`.
2. Lessons and official IELTS link metadata become published `resources`; exercises become `ielts_exercises`.
3. `/api/ielts` returns practice prompts and answer explanations, but not answer keys.
4. `/api/ielts/submit` scores submitted answerable questions against the stored answer key. Signed-in quiz attempts are persisted.

## RAG pipeline

The tutor tokenizes an English/Bangla query, ranks published local resources using lexical overlap, and may combine that score with cosine similarity when stored embeddings and `RAG_USE_QUERY_EMBEDDINGS=true` are available. At most five results are passed as context. With no OpenAI key, it returns retrieved local material and links without claiming a generated answer. With a key, the model receives untrusted evidence and explicit grounding/safety instructions. Non-time-sensitive exact normalized questions are cached for 14 days; configured time-sensitive terms bypass the cache. See [docs/RAG-AND-AI.md](./docs/RAG-AND-AI.md).

## Scholarship pipeline

`content/scholarship-opportunities.json` holds curated monitoring records; `content/scholarship-sources.json` defines official index pages to check. The refresh process only discovers candidate links from pages reachable without access controls, limits snippets, filters destinations to HTTPS and trusted hosts, and marks new records `needs-review`. It does not verify eligibility or guarantee that a call is open. Failures are returned in the report; existing records are not deleted. See [docs/SCHOLARSHIP-PIPELINE.md](./docs/SCHOLARSHIP-PIPELINE.md).

## Configuration, assets and errors

The site JSON controls the brand/theme, hero copy, destination content/images, IELTS card images and assistant copy. The admin API validates the required top-level structure and image-path prefixes before replacing the JSON file atomically. It does not provide revision history, preview, approval, or full nested-schema validation. Admin image uploads accept PNG/JPEG/WebP by extension and declared MIME type, with a 6 MB limit and generated filenames; magic-byte validation is not implemented.

API validation errors use JSON messages and appropriate 4xx status codes. Unexpected Express errors return a generic 500 response; server-side errors are logged without a stack trace in the response. Frontend endpoint errors are logged with path/status and shown as section-specific notices. Scholarship source errors are isolated per source and included in the refresh report.

## Constraints

- SQLite-WASM is a local single-writer persistence design; do not run multiple processes against one database file or scale it horizontally.
- There is no migration framework. Schema changes are additive SQL in `src/db.js`; duplicate seed keys stop initialization rather than deleting data.
- SMTP, OpenAI generation and embeddings require external credentials and incur external service dependencies/costs.
- No deployment, production monitoring, database backup automation, account deletion/export workflow, or formal content approval system is included.
