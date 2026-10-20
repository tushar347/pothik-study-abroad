# Content authoring and validation

JSON files are the editable content sources. Make a backup before changing content, validate JSON, then restart the server or run the seed command when relevant. `npm run check` validates JavaScript syntax; `npm test` checks database seed persistence and scholarship helper behavior. The runtime currently performs only partial structural validation for admin-edited site content, not a complete schema check for every JSON file.

## Files and update behavior

- `site-content.json`: brand/theme, hero, destination cards, IELTS card metadata and counsellor prompt copy. An administrator can save this through the Admin workspace; the server writes the JSON file using a temporary file and rename.
- `ielts-practice.json`: original practice exercise IDs, skills, difficulty, duration, prompt, options, answer, explanation and optional `audio_text`. Seed startup updates matching `ielts_exercises` rows by ID. Never add copied IELTS papers, books, audio or paid course content without permission.
- `ielts-lessons.json`: original lesson titles and lesson bodies. Seed startup publishes these as IELTS resources.
- `ielts-resources.json`: public official IELTS links with provider, description, access and license note. The application stores link metadata and descriptions rather than copying test resources.
- `scholarship-sources.json`: official index pages that the background refresh checks.
- `scholarship-opportunities.json`: curated official links and current review/status descriptions. These are monitoring records, not a promise that a scholarship is open.

Country slugs should match the `countries.slug` values and current UI configuration (`germany`, `canada`, `usa`, `uk`, `australia`). Preserve stable exercise IDs so user attempts and content updates remain associated with the intended exercise.

## Add or edit IELTS material

1. Author original material and label its skill (`Reading`, `Listening`, `Writing`, or `Speaking`).
2. For automatically scored multiple-choice exercises, use an `options` array and a zero-based integer `answer` within that array; include a concise teaching explanation.
3. Keep writing/speaking practice educational. The platform does not produce an official IELTS score. Browser speech synthesis/recognition are optional browser features; provide text-based practice.
4. Check prompts, answer keys and explanations manually, then run `npm run seed` and `npm test`.

## Add or review scholarship material

Use official government, university, scholarship-provider or education-agency sources. Include a stable HTTPS official URL, destination/provider, clear qualification scope, truthful funding/deadline language, and explicit review status. `upcoming` means an explicitly recorded future deadline; `open` must not be inferred merely because the page exists; use `check-source` when the page is an index or the cycle is unclear; use `closed` when the official source confirms closure; new scraped records remain `needs-review` with `review_required=true`. See [../docs/SCHOLARSHIP-PIPELINE.md](../docs/SCHOLARSHIP-PIPELINE.md).

The automated parser is a discovery aid. Check eligibility, opening/closing dates, funding and exclusions at the official destination page before promoting a candidate or publishing an affirmative claim. Keep an appropriate last-checked note and never invent values.

## Safe editing checklist

```powershell
Get-Content .\content\site-content.json -Raw | ConvertFrom-Json | Out-Null
Get-Content .\content\ielts-practice.json -Raw | ConvertFrom-Json | Out-Null
Get-Content .\content\ielts-lessons.json -Raw | ConvertFrom-Json | Out-Null
Get-Content .\content\ielts-resources.json -Raw | ConvertFrom-Json | Out-Null
Get-Content .\content\scholarship-sources.json -Raw | ConvertFrom-Json | Out-Null
Get-Content .\content\scholarship-opportunities.json -Raw | ConvertFrom-Json | Out-Null
npm run check
npm test
```

Do not put credentials, private user data or API keys in content files.
