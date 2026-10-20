# Development history

## Evidence boundary

At the start of the engineering pass, the supplied GitHub repository was empty and the local workspace had no `.git` directory. There was no prior commit history to inspect. The milestone narratives below come from the user-provided engineering brief; they are not independently verifiable from Git commits.

## Reported milestones and current-source confirmation

1. **Initial application (reported):** Node.js/Express, SQLite, account authentication, study-abroad content and basic RAG were introduced. The brief reports the initial `better-sqlite3` Windows installation issue.
2. **Native dependency removal (verified in current source):** `package.json` uses `sql.js`; no `better-sqlite3` dependency is present. `src/db.js` persists SQLite-WASM data to a local file.
3. **Premium brand direction (verified in current source):** `content/site-content.json` and `public/styles.css` use burgundy, cream, ivory and pastel theme tokens.
4. **Bundled image assets (verified in current tree):** local brand, five destination and four IELTS images exist under `public/assets/`.
5. **IELTS/scholarship additions (verified in current source):** JSON-driven lessons/exercises, official IELTS link metadata, curated scholarship opportunities, source refresh, candidate review flags and tutor cache are present.

## Changes made in this release pass

- Corrected startup loading so one rejected API request no longer prevents the rest of the page sections from rendering; endpoint and section names are logged, and site content has an alternate same-origin route.
- Added a configurable database path for isolated local verification.
- Replaced startup-time deletion of duplicate seed rows with a clear initialization error, preserving rows for manual review.
- Stopped writing new counsellor conversations to the legacy `chat_logs` table.
- Added repeatable database/seed, source URL, deadline parsing and refresh failure-preservation tests.
- Upgraded Nodemailer to a patched version and recorded verification.
- Expanded developer, API, database, RAG, scholarship, security, asset, design, history and test documentation.

The exact commit history and push status are recorded by Git after repository initialization; do not infer dates or earlier development commits from this file.
