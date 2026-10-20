# Security and privacy

This document describes observed implementation controls and known gaps. It is not a penetration-test report or a claim that the application is production-ready.

## Authentication and authorization

- Passwords are hashed with bcryptjs (cost 12); input is length-limited and validated with Zod.
- Login, signup, verification/reset email workflows use opaque random tokens. Only token hashes, peppered with `SESSION_SECRET`, are stored in SQLite. Sessions expire after eight hours and are revoked on logout and password reset.
- The `pothik.sid` cookie is HttpOnly, SameSite=Lax, and Secure in production.
- Private roadmap endpoints enforce sign-in and scope selects/updates/deletes by both roadmap ID and current user ID.
- Admin content, upload and refresh endpoints require `role='admin'` server-side.
- Signup can be unverified in local development when SMTP is not configured. Production signup fails closed when verification is required but SMTP is unavailable; do not set `REQUIRE_EMAIL_VERIFICATION=false` for a public service.

## Request, browser and dependency controls

- Helmet applies a restrictive Content Security Policy and other standard response headers.
- JSON and form bodies are bounded. State-changing `/api` requests use an origin check. Authentication and tutor endpoints are rate-limited; the API also has a general per-IP limiter.
- SQL calls use parameterized statements. Browser text interpolation uses HTML escaping in rendered content and text nodes for assistant messages.
- Dependency audit is run with `npm audit`; see [docs/TEST-REPORT.md](./docs/TEST-REPORT.md) for the latest recorded result.
- `.env`, runtime SQLite files, `node_modules`, logs and private uploads are excluded by `.gitignore`; `.env.example` is the tracked placeholder template.

## Data collected and stored

The database stores account name/email/password hash, session and verification-token hashes/expiry, user roadmaps, optional signed-in quiz attempts, public catalogues/resources, anonymous or signed-in scam/outdated-content reports, and short-lived tutor response cache entries. New chat questions and answers are not written to `chat_logs`; that table remains for compatibility with older databases and may contain historical rows. No API currently exposes chat-log retrieval or deletion.

Do not submit passport or national-ID scans, bank statements, passwords, or other sensitive identity information in the report or counsellor forms. Tutor inputs may be sent to OpenAI when `OPENAI_API_KEY` is configured; configure the provider and privacy disclosures before enabling it for real users. Without a key, local retrieval does not call the generation API.

## Uploads and editable content

Admin image uploads are limited to one 6 MB file with PNG/JPEG/WebP extension and declared MIME type, stored using a generated UUID filename under `public/uploads/`. Content bytes are not independently inspected, so extension/MIME checks are not sufficient for a high-assurance production upload pipeline. Uploaded files are publicly served; do not upload confidential content. Content updates are admin-only and written to `content/site-content.json`; there is no version history or approval step.

## AI and scholarship trust boundaries

- Retrieved resource text is untrusted evidence. The generation prompt instructs the model not to treat it as instructions, to cite sources, and to state when evidence is insufficient; this does not eliminate prompt-injection or hallucination risk.
- Answers and source links can be incomplete or stale. Time-sensitive tutor questions bypass the answer cache, but source pages are not comprehensively monitored.
- Scholarship refresh uses configured official URLs, HTTPS, host filtering, and a low request rate. Parsed links and dates are candidates, not verified opportunities. Human review remains required before claims about eligibility, funding or current status.

## Required production controls and gaps

Before a public launch:

1. Use HTTPS, a strong unique `SESSION_SECRET`, exact `APP_ORIGIN`, SMTP, and production email verification.
2. Use a supported durable database/session architecture for the intended deployment; the current database is single-process and local-file based.
3. Add tested backups, restore drills, monitoring, alerting, log redaction, data retention and account deletion/export.
4. Add upload file-signature inspection and consider serving uploads from a separate origin.
5. Review CSRF/origin behavior behind the actual reverse proxy, rate-limit policy, dependency updates and authorization with dedicated security tests.
6. Obtain privacy, terms, scholarship claims and applicable legal review. Do not guarantee admission, scholarships or visas.

Report suspected vulnerabilities privately to the repository owner. Do not include live credentials, user records or tokens in public issues. There is no dedicated disclosure address configured in this repository.
