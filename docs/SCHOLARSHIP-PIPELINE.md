# Scholarship discovery and review

## Sources and seeded records

- `content/scholarship-sources.json` defines 11 official index/start pages with country slug, provider/name and a short description.
- `content/scholarship-opportunities.json` contains 11 curated monitoring records across Germany, Canada, the United States, the United Kingdom and Australia.
- `src/opportunities.js` seeds/upserts curated items by `official_url`. `/api/opportunities` also performs this idempotent seed on read so older databases acquire missing curated entries.

These are official starting points and some specific-cycle listings, not an exhaustive scholarship database. Eligibility, award size, current opening state, exclusions and deadlines must be verified on the destination page.

## Refresh lifecycle

When `SCHOLARSHIP_AUTO_REFRESH` is not `"false"`, the server schedules a check about 15 seconds after listening and then every 24 hours. An administrator can request `POST /api/admin/opportunities/refresh`; the command-line script is `npm run refresh:scholarships`. Do not run the standalone script while the server is writing the same database.

For each configured URL, refresh:

1. Fetches HTML over HTTPS with a short timeout, a user-agent and a 350 ms delay between successful pages.
2. Parses a bounded set of matching anchors from the fetched page; it does not bypass login, CAPTCHA or access controls.
3. Accepts only HTTPS destinations whose host is the source host or in the explicit trusted domain allowlist.
4. Requires scholarship-related words in the title/URL, skips common unrelated destinations, strips markup and limits stored snippets.
5. Attempts to parse a date from nearby page text. A parsed future/past date produces `upcoming`/`closed`; an unparsed result remains `needs-review`. The parser is heuristic and can extract the wrong date.
6. Skips URLs already in the database and inserts new links with `source_kind='scraped-candidate'` and `review_required=1`.
7. Returns per-source failures in the report and does not delete existing records when a page fails.

The refresh report has `checked`, `candidates`, `failed` and `inserted` fields. `source_checked_at` is updated for a source only when an opportunity row has the same official URL, and candidates get their source check timestamp when inserted. This means the current UI's “latest source check” reflects available opportunity timestamps, not a full per-source audit ledger.

## Status and editorial review

| Status | Meaning in the app |
|---|---|
| `open` | Manually curated positive state; do not infer from page existence |
| `upcoming` | Recorded deadline is in the future; verify cycle and eligibility |
| `closed` | Confirmed closed or date has passed; monitor next cycle |
| `check-source` | Official index/monitoring link; current call needs human verification |
| `needs-review` | Newly discovered candidate, not verified |

The UI labels review candidates and current-call verification needs. An admin can trigger refresh but there is no record-approval/editorial workflow to promote candidates in the browser. Edit `content/scholarship-opportunities.json` only after checking the official page and keep status, deadline label, URL, summary, and review flag truthful.

## Known limitations

- HTML parsing is simple and site structure dependent; dynamic pages may produce no results or misleading snippets.
- A parsed date does not prove that it belongs to the scholarship deadline.
- There is no per-source status/audit table, automatic eligibility parser, exhaustive listing, alert delivery or formal approval/versioning flow.
- The only supported current-source outcomes are opportunistic page checks and candidates, not guaranteed real-time monitoring.
