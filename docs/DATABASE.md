# Database guide

## Storage and lifecycle

Pothik uses `sql.js` (SQLite compiled to WebAssembly), not a native SQLite binding. `src/db.js` loads `data/pothik.sqlite` by default, creates the schema with `CREATE TABLE IF NOT EXISTS`, applies additive compatibility changes, and writes the exported database to a temporary sibling file before renaming it over the database file. Set `DATABASE_PATH` to an absolute path to use a different local database.

The adapter persists after each write and supports synchronous transactions. It is a single-process, single-writer design; do not run multiple app instances or the refresh script against the same file concurrently.

## Tables and relationships

Columns below reflect the schema currently declared in `src/db.js`.

| Table | Columns |
|---|---|
| `users` | `id`, `name`, `email`, `password_hash`, `role`, `preferred_language`, `email_verified`, `created_at` |
| `sessions` | `token_hash`, `user_id`, `expires_at`, `created_at` |
| `verification_tokens` | `token_hash`, `user_id`, `purpose`, `expires_at`, `created_at` |
| `countries` | `id`, `slug`, `name`, `flag`, `summary`, `tuition`, `living`, `language`, `official_url`, `last_verified`, `status` |
| `resources` | `id`, `title`, `category`, `country_slug`, `body`, `source_url`, `source_name`, `verified_at`, `language`, `published`, `embedding_json` |
| `programs` | `id`, `university`, `program`, `country_slug`, `level`, `language`, `tuition_note`, `official_url`, `verified_at` |
| `scholarships` | `id`, `name`, `country_slug`, `level`, `overview`, `official_url`, `deadline_note` |
| `scholarship_opportunities` | `id`, `country_slug`, `country_name`, `provider`, `title`, `summary`, `level`, `deadline_date`, `deadline_label`, `status`, `official_url`, `source_url`, `source_checked_at`, `source_kind`, `review_required`, `created_at`, `updated_at` |
| `ielts_exercises` | `exercise_id`, `skill`, `difficulty`, `minutes`, `title`, `prompt`, `options_json`, `answer`, `explanation`, `audio_text`, `published`, `created_at` |
| `tutor_cache` | `cache_key`, `mode`, `language`, `answer`, `sources_json`, `expires_at`, `created_at` |
| `roadmaps` | `id`, `user_id`, `title`, `country_slug`, `intake`, `profile_json`, `tasks_json`, `created_at`, `updated_at` |
| `reports` | `id`, `user_id`, `category`, `description`, `evidence_note`, `status`, `created_at` |
| `quiz_attempts` | `id`, `user_id`, `quiz_type`, `score`, `total`, `answers_json`, `created_at` |
| `chat_logs` | `id`, `user_id`, `question`, `answer`, `sources_json`, `created_at` |

Foreign keys: `sessions.user_id`, `verification_tokens.user_id`, and `roadmaps.user_id` reference `users.id` with cascade delete; `reports.user_id` references `users.id` with `SET NULL`; `quiz_attempts.user_id` and legacy `chat_logs.user_id` cascade on user deletion. SQLite foreign-key enforcement is enabled. Catalogue `country_slug` values are not declared as foreign keys.

Indexes cover session/token expiry, opportunity country/status, IELTS skill/difficulty, tutor-cache expiry, resource category/country, roadmap owner, and unique seed identities for resources, programs and scholarships. `ielts_exercises.exercise_id`, user email, scholarship official URL and token/cache keys are unique primary/unique keys.

## Migrations and seeding

The current inline compatibility migration adds `users.email_verified` and `resources.embedding_json` when absent. It then detects duplicate seed identities before adding unique indexes. If duplicates are present, database initialization stops with a message naming the tables; it does not automatically delete rows. Back up the file and review duplicates before resolving them.

`src/seed.js` is repeatable: country and base catalogue rows are insert-if-missing; IELTS resources, lessons and exercise rows are updated by stable identity; curated scholarship opportunities are upserted by official URL. The server runs seeding at startup, and `npm run seed` runs it manually. Neither command drops/recreates the database.

## Backup and restore

1. Stop the server and any script using the database.
2. Copy the database to a protected location outside the repository:

   ```powershell
   Copy-Item .\data\pothik.sqlite "$env:USERPROFILE\pothik-backup.sqlite"
   ```

3. To restore, stop the server, preserve the current file separately, then copy the verified backup to `data/pothik.sqlite`.
4. Start the application and verify `/api/health` and the expected catalogues.

Treat backups as personal data: the database may contain accounts, roadmaps, reports and quiz attempts. Never commit it.

## Production constraint

SQLite-WASM persists to one local file and is not a horizontally scalable database or shared session store. For multi-instance production, design a separately tested migration to a managed relational database and durable session storage; do not point multiple processes at the same SQLite file.
