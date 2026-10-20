# Verification report

**Recorded:** 2026-10-20
**Environment:** Windows, Node.js v24.15.0, npm 11.12.1
**Database safety:** Automated tests and HTTP smoke tests used temporary databases; the existing `data/pothik.sqlite` was not opened or changed.

## Passed

| Check | Result |
|---|---|
| `npm ci` | Passed from the committed lockfile; 101 packages installed; 0 audit findings during install. npm emitted a deprecation warning for transitive `node-domexception@1.0.0`. |
| `npm run check` | Passed; all configured JavaScript entry points parsed. |
| `npm test` | Passed: 5 tests covering seed idempotency, persistence after database reopen, duplicate-row migration safety, URL trust/scheme checks, deadline parsing, and retention of curated opportunities after a simulated refresh failure. |
| Content JSON parsing | Passed for all JSON files under `content/`. |
| `npm audit` | Passed; 0 vulnerabilities after upgrading Nodemailer to `^10.1.7`. |
| HTTP API smoke | Passed on an isolated local server: health, five country rows, 36 IELTS exercises, 11 scholarship opportunities, five configured countries via `/site-content.json`, retrieval-only tutor result, development signup, roadmap create/read, admin denial, invalid-login rejection, logout and cross-account roadmap isolation (non-owner updates/deletes return 404). |
| Browser smoke | Passed: desktop homepage, Germany-to-Canada tab switch, Reading practice open, and scholarship cards; at 390×844 the page had no horizontal overflow, the mobile menu toggled and all loaded images had nonzero dimensions. Forced `/api/site-content` and `/api/opportunities` request failures confirmed the configuration fallback, unaffected section rendering and section-specific toast/logging. |
| Documentation/content validation | Passed: all content JSON parsed and project-relative Markdown links resolved. |

## Not run / still required

- There is no committed automated browser/E2E test suite; browser checks above were an integrated manual smoke run.
- No external SMTP delivery or OpenAI generation/embedding call was made; no credentials were used.
- No real scholarship-source refresh was run, avoiding unnecessary network requests and external-source variability.
- Automated HTTP tests do not yet cover password-reset/verification mail, upload file content validation, or full admin content editing.
- No production reverse-proxy, HTTPS, mobile-device, accessibility, deployment, backup/restore or load testing was performed.

## Limitations

Passing syntax, unit and smoke checks does not constitute a security audit or establish production readiness. See [SECURITY.md](../SECURITY.md) and [docs/ROADMAP.md](./ROADMAP.md).
