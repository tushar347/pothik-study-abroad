# HTTP API

All API routes are same-origin under `/api`. JSON request bodies are limited to 60 KB; URL-encoded forms are limited to 20 KB. `/api` requests use a general rate limit; auth and tutor routes also have narrower limits. State-changing requests pass the configured origin guard. Responses below are representative shapes; validation and common errors are summarized at the end.

## Public and account routes

| Method and path | Auth | Request | Response / behavior |
|---|---|---|---|
| `GET /api/health` | No | — | `{ status, app, database, aiConfigured, embeddingsConfigured }` |
| `GET /api/me` | No | — | `{ user: safeUser \| null }` |
| `POST /api/auth/signup` | No | `{ name, email, password }` | `201`; user/session in local unverified-email mode, or verification message when email confirmation is required |
| `GET /api/auth/verify?token=...` | No | — | Validates a single-use, 24-hour token, verifies account, creates session and redirects to `/?verified=1` |
| `POST /api/auth/login` | No | `{ email, password }` | `{ user }`; rejects unverified accounts |
| `POST /api/auth/logout` | No | — | Revokes current session and clears cookie; `{ ok: true }` |
| `POST /api/auth/forgot-password` | No | `{ email }` | Generic response to avoid account enumeration; development may return a local reset URL |
| `POST /api/auth/reset-password` | No | `{ token, password }` | Consumes reset token, updates hash and revokes all account sessions |
| `GET /api/site-content` | No | — | Current `content/site-content.json` object |
| `GET /site-content.json` | No | — | Alternate same-origin response to the same configuration for frontend fallback |
| `GET /api/dashboard` | Optional | — | `{ countries, stats }`; roadmap count is for the signed-in user |
| `GET /api/countries/:slug` | No | — | `{ country, resources, programs, scholarships }`; unknown slug returns 404 |
| `GET /api/resources?q=&category=` | No | Optional query filters | `{ resources }`, capped at 60 filtered or 100 unfiltered rows |
| `GET /api/programs` | No | — | `{ programs }` |
| `GET /api/scholarships` | No | — | `{ scholarships }` |
| `GET /api/opportunities?country=&status=&q=` | No | Optional query filters | `{ opportunities, total, lastSourceCheck }`; aliases such as `US` and `United Kingdom` normalize to slugs |
| `POST /api/reports` | Optional | `{ category, description, evidence_note? }` | `201 { reference, message }`; do not submit identity documents |

`safeUser` exposes only id, name, email, role, language and verification state. It never includes password hashes or tokens.

## Roadmaps and IELTS

| Method and path | Auth | Request | Response / behavior |
|---|---|---|---|
| `GET /api/roadmaps` | Required | — | `{ roadmaps }`, filtered to current user; parsed profile/tasks included |
| `POST /api/roadmaps` | Required | `{ title, country_slug, intake, degree?, subject?, cgpa?, budget? }` | `201 { id }`; server validates the destination and creates a starter checklist |
| `PATCH /api/roadmaps/:id` | Required | `{ tasks: [{ title, done }] }` | `{ ok: true }`; update predicate includes current user ID |
| `DELETE /api/roadmaps/:id` | Required | — | `{ ok: true }`; non-owned/nonexistent record returns 404 |
| `GET /api/ielts` | No | — | `{ exercises, count, originalContent }`; answer keys are not returned |
| `GET /api/ielts/resources` | No | — | `{ resources, count }` for IELTS lessons and official links |
| `POST /api/ielts/submit` | Optional | `{ quiz_type, answers: { exerciseId: integer } }` | `{ score, total, feedback }`; authenticated attempts are stored |
| `POST /api/tutor` | No | `{ question, language?: "en"\|"bn", mode?: "study-abroad"\|"ielts" }` | `{ answer, sources, aiEnabled, retrievalCount, cached }` |

## Admin routes

| Method and path | Auth | Request | Response / behavior |
|---|---|---|---|
| `GET /api/admin/summary` | Admin | — | Counts for users, roadmaps, reports by status and resources |
| `GET /api/admin/site-content` | Admin | — | Current site content |
| `PUT /api/admin/site-content` | Admin | Site content JSON | `{ ok, message }`; validates top-level arrays, item counts, image path prefixes and country slug/name |
| `POST /api/admin/assets` | Admin | Multipart field `image` | `201 { url, name, size }`; PNG/JPEG/WebP, max 6 MB |
| `POST /api/admin/opportunities/refresh` | Admin | `{}` | `{ ok, report }`; per-source failures are included in `report.failed` |

## Errors and security

- `400`: invalid input or invalid token; response includes a short `{ error }`.
- `401`: sign-in required or invalid credentials.
- `403`: insufficient role, unverified account, or rejected origin.
- `404`: missing API endpoint, destination or user-owned roadmap.
- `409`: duplicate signup email.
- `429`: rate limit exceeded.
- `500`/`503`: generic unexpected, mail or production configuration failure; server avoids returning stack traces.

Auth uses the `pothik.sid` HttpOnly cookie. Production requires a strong `SESSION_SECRET` and `APP_ORIGIN`. `originGuard` checks `Origin` for state-changing `/api` requests; verify reverse-proxy behavior in the actual deployment. See [SECURITY.md](../SECURITY.md).
