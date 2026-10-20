require('dotenv').config();
const { createDatabase } = require('../src/db');
const { refreshScholarships } = require('../src/opportunities');
(async () => {
  const db = await createDatabase();
  try {
    const result = await refreshScholarships(db);
    console.log(`Checked ${result.checked} official index pages.`);
    console.log(`Added ${result.candidates} new scholarship link candidates for human review.`);
    for (const item of result.inserted) console.log(`  [${item.status}] ${item.country}: ${item.title}\n    ${item.url}`);
    if (result.failed.length) {
      console.log('\nSources that could not be checked:');
      for (const item of result.failed) console.log(`  ${item.url} — ${item.error}`);
    }
    console.log('\nNewly discovered items are candidates, not verified open scholarships. Confirm dates and eligibility on each official page.');
  } finally { db.close(); }
})().catch(err => { console.error(err); process.exit(1); });
