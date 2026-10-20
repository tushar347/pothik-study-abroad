# Engineering roadmap

Status is based on the current source and test evidence, not a guarantee of production readiness.

## Implemented in the current codebase

- Responsive study-abroad and IELTS frontend with five destinations and local image assets.
- Express APIs, bcrypt password hashing, opaque database-backed sessions, verification/reset email flows and admin authorization.
- User-scoped persistent roadmaps, report intake, IELTS exercises and lesson/resource listings.
- SQLite-WASM local persistence and repeatable starter content seeding.
- Retrieval-only counsellor plus optional OpenAI generation/embeddings and time-sensitive cache bypass.
- Curated scholarship index, optional refresh, candidate flags and admin refresh endpoint.
- Partial frontend section rendering, core persistence/source tests, API/database/security documentation.

## In progress / evidence not yet complete

- A desktop/mobile browser smoke check passed, but full browser journeys and admin workflows are not automated in the repository test suite.
- Scholarship refresh currently reports only the latest available opportunity timestamps; it lacks a dedicated per-source health/audit table.
- Admin editing has no content revision history, draft/approval process or complete nested schema validator.

## Highest-priority next work

1. Add HTTP integration tests for authentication, origin checks, roadmaps, tutor retrieval and admin authorization against disposable databases.
2. Add a per-source scholarship check record and an authenticated human review/approval workflow before status promotion.
3. Add image content-signature validation, upload retention/deletion and separate-origin considerations.
4. Define privacy retention/deletion and account export/deletion workflows; review legacy `chat_logs` data.
5. Add operational backups, restore drills, health/monitoring, log redaction and production email verification checks.
6. Design a durable multi-instance database/session migration only if production topology requires it.

## Deferred

- Payments, guarantees of admission/visa outcomes, comprehensive scholarship scraping, broad automated immigration advice, and multi-instance production architecture are not implemented.
- Automated scholarship eligibility/deadline verification is deferred to human review and official source checks.
