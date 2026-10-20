# Contributing

## Local setup

Use Node.js 20 or newer. On Windows PowerShell:

```powershell
Copy-Item .env.example .env
npm ci
npm run check
npm test
npm start
```

Use a unique local `SESSION_SECRET`. Do not put production credentials in examples, fixtures, content or commits. Keep the local database and `.env` untouched by tests; tests must use disposable temp paths.

## Changes and review

- Preserve the existing Express/vanilla-JS/SQLite-WASM design unless a separately justified migration is approved.
- Keep content edits in the relevant JSON files; author original IELTS material and verify scholarship claims against official sources.
- Validate server inputs, use parameterized database operations, preserve user ownership checks, and keep errors useful without exposing internals.
- Add or update focused tests for behavior changes. Run `npm run check`, `npm test` and `npm audit`.
- Update the docs that describe changed routes, schema, content or behavior.
- Inspect `git diff` and staged files before committing. Never include `.env`, runtime database files, private uploads, logs, `node_modules` or personal data.
- Use a feature branch and a focused pull request. Never force-push or rewrite shared history.

## Content verification

For country, programme and scholarship information, prefer the official provider/government page. Record uncertainty honestly, do not invent cost/eligibility/deadline values, and do not mark scraper candidates as verified. Do not copy copyrighted IELTS books, tests, audio or paid course material.

## Security and privacy

Do not collect passport scans, bank statements or national ID scans. Never log credentials, tokens or API keys. Report vulnerabilities privately to the repository owner rather than publishing exploit details or user data.

## Commit messages

Use concise Conventional Commit prefixes where practical, such as `fix:`, `docs:`, `test:`, `feat:` or `chore:`. Each commit should represent a coherent, reviewable change.
