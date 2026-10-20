const fs = require('fs');
const path = require('path');

const SOURCES_PATH = path.join(__dirname, '..', 'content', 'scholarship-sources.json');
const CURATED = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content', 'scholarship-opportunities.json'), 'utf8'));

function upsert(db, row) {
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO scholarship_opportunities
    (country_slug,country_name,provider,title,summary,level,deadline_date,deadline_label,status,official_url,source_url,source_checked_at,source_kind,review_required,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(official_url) DO UPDATE SET
      country_slug=excluded.country_slug,country_name=excluded.country_name,provider=excluded.provider,
      title=excluded.title,summary=excluded.summary,level=excluded.level,deadline_date=excluded.deadline_date,
      deadline_label=excluded.deadline_label,status=excluded.status,source_url=excluded.source_url,
      source_checked_at=COALESCE(excluded.source_checked_at, scholarship_opportunities.source_checked_at),source_kind=excluded.source_kind,
      review_required=excluded.review_required,updated_at=excluded.updated_at`).run(
      row.country_slug, row.country_name, row.provider, row.title, row.summary, row.level || 'Varies',
      row.deadline_date || null, row.deadline_label || 'Check official source', row.status || 'check-source',
      row.official_url, row.source_url || row.official_url, row.source_checked_at || null,
      row.source_kind || 'curated', row.review_required ? 1 : 0, now
    );
}
function seedOpportunities(db) { for (const row of CURATED) upsert(db, row); }
function decodeHtml(s='') { return s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&nbsp;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n))); }
function cleanText(s='') { return decodeHtml(s.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ')).trim(); }
function absoluteUrl(href, base) { try { const u = new URL(decodeHtml(href), base); if (u.protocol !== 'https:') return null; u.hash=''; return u.href; } catch { return null; } }
function isTrustedSourceHost(candidate, source) {
  try {
    const host = new URL(candidate).hostname.toLowerCase();
    const base = new URL(source).hostname.toLowerCase();
    const trusted = ['daad.de','study-in-germany.com','educanada.ca','canada.ca','educationusa.state.gov','state.gov','foreign.fulbrightonline.org','chevening.org','study-uk.britishcouncil.org','britishcouncil.org','ugc.gov.bd','manchester.ac.uk','dfat.gov.au','studyaustralia.gov.au'];
    return host === base || trusted.some(domain => host === domain || host.endsWith(`.${domain}`));
  } catch { return false; }
}
function inferDeadline(text) {
  const now = new Date();
  const patterns = [/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})/i, /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(20\d{2})/i, /(\d{4})-(\d{2})-(\d{2})/];
  for (const re of patterns) {
    const m = text.match(re); if (!m) continue;
    let d;
    if (re === patterns[0]) d = new Date(`${m[2]} ${m[1]}, ${m[3]} 23:59:59`);
    else if (re === patterns[1]) d = new Date(`${m[1]} ${m[2]}, ${m[3]} 23:59:59`);
    else d = new Date(`${m[1]}-${m[2]}-${m[3]}T23:59:59`);
    if (!Number.isNaN(d.getTime())) return { date: d.toISOString().slice(0,10), status: d >= now ? 'upcoming' : 'closed', label: `${d >= now ? 'Published deadline' : 'Past deadline'}: ${d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}` };
  }
  return null;
}
async function refreshScholarships(db, options = {}) {
  seedOpportunities(db);
  const sources = options.sources || JSON.parse(fs.readFileSync(SOURCES_PATH,'utf8'));
  const report = { checked: 0, candidates: 0, failed: [], inserted: [] };
  for (const src of sources) {
    report.checked++;
    try {
      const response = await fetch(src.url, { headers: { 'User-Agent': 'PothikScholarshipIndexer/1.0 (source links and short snippets; contact: admin@localhost)', 'Accept': 'text/html,application/xhtml+xml' }, signal: AbortSignal.timeout(options.timeoutMs || 9000), redirect: 'follow' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      const anchorRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
      let match; let pageCount = 0;
      while ((match = anchorRe.exec(html)) && pageCount < 12) {
        const title = cleanText(match[2]);
        if (title.length < 8 || title.length > 140 || !/(scholarship|funding|fellowship|grant|award|financial aid|studentship|bursary|stipend|apply)/i.test(title)) continue;
        const url = absoluteUrl(match[1], response.url);
        if (!url || url === src.url || !isTrustedSourceHost(url, src.url) || /facebook|instagram|linkedin|youtube|twitter|privacy|cookie|accessibility|contact|sitemap|search/i.test(url)) continue;
        if (!/(scholarship|funding|fellowship|grant|award|financial-aid|studentship|bursary|stipend|financialaid)/i.test(url) && !/(scholarship|funding|fellowship|grant|award|financial aid|studentship|bursary|stipend)/i.test(title)) continue;
        const from = Math.max(0, match.index - 500); const to = Math.min(html.length, anchorRe.lastIndex + 700);
        const snippet = cleanText(html.slice(from,to)).slice(0,380);
        const deadline = inferDeadline(snippet);
        const row = {
          country_slug: src.country_slug, country_name: src.country_name, provider: src.provider,
          title, summary: snippet || src.description, level:'Varies', deadline_date: deadline?.date || null,
          deadline_label: deadline?.label || 'Date not reliably extracted — verify on official page',
          status: deadline?.status || 'needs-review', official_url:url, source_url:src.url,
          source_checked_at:new Date().toISOString(), source_kind:'scraped-candidate', review_required:1
        };
        if (db.prepare('SELECT id FROM scholarship_opportunities WHERE official_url=?').get(url)) continue;
        upsert(db,row); report.candidates++; pageCount++; report.inserted.push({ country:src.country_name, title, url, status:row.status });
      }
      // Update the last-checked timestamp for the official source record.
      const existing = db.prepare('SELECT id FROM scholarship_opportunities WHERE official_url=?').get(src.url);
      if (existing) db.prepare('UPDATE scholarship_opportunities SET source_checked_at=?,updated_at=? WHERE official_url=?').run(new Date().toISOString(),new Date().toISOString(),src.url);
      await new Promise(resolve => setTimeout(resolve, 350));
    } catch (e) { report.failed.push({ source:src.name || src.url, url:src.url, error:String(e.message || e).slice(0,180) }); }
  }
  return report;
}
module.exports = { seedOpportunities, refreshScholarships, CURATED, absoluteUrl, isTrustedSourceHost, inferDeadline };
