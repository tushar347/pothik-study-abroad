# Changelog

## Unreleased — 2026-10-20

### Fixed
- Frontend startup now loads independent API sections with partial-failure behavior and section-specific diagnostics.
- Site configuration can be retrieved from `/site-content.json` as an alternate same-origin route.
- Database initialization no longer deletes duplicate resource/program/scholarship rows to create unique indexes; it stops and names affected tables instead.
- New counsellor interactions are no longer written to the legacy chat log table.

### Security and maintenance
- Upgraded Nodemailer to `^10.1.7` to resolve the dependency advisory reported by `npm audit`.
- Added core Node tests for database persistence, idempotent seeding, URL host checks, deadline parsing and scholarship refresh failure preservation.
- Added the `DATABASE_PATH` override for isolated local/test databases.

### Documentation
- Added API, database, RAG, scholarship pipeline, LLM handoff, development history, roadmap, test report and contribution guides; refreshed architecture, setup and security documentation.
