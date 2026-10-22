// University directory by country (open "university-domains-list" dataset, MIT licence), refreshed daily,
// plus cached university logos. No AI calls are used here.
const fs = require('fs');
const path = require('path');

const DATASET_URL = 'https://raw.githubusercontent.com/Hipo/university-domains-list/master/world_universities_and_domains.json';
const DATA_DIR = path.join(__dirname, '..', 'data');
const DATASET_FILE = path.join(DATA_DIR, 'universities.json');
const LOGO_DIR = path.join(DATA_DIR, 'logos');
const REFRESH_MS = 24 * 3600e3;
const LOGO_MAX_AGE_MS = 30 * 24 * 3600e3;

// Destination countries (same slugs as the student profile) → name used in the dataset.
const COUNTRIES = {
  germany: { name: 'Germany', code: 'DE' }, canada: { name: 'Canada', code: 'CA' }, usa: { name: 'United States', code: 'US' },
  uk: { name: 'United Kingdom', code: 'GB' }, australia: { name: 'Australia', code: 'AU' }, ireland: { name: 'Ireland', code: 'IE' },
  netherlands: { name: 'Netherlands', code: 'NL' }, sweden: { name: 'Sweden', code: 'SE' }, finland: { name: 'Finland', code: 'FI' },
  france: { name: 'France', code: 'FR' }, italy: { name: 'Italy', code: 'IT' }, hungary: { name: 'Hungary', code: 'HU' },
  japan: { name: 'Japan', code: 'JP' }, 'south-korea': { name: 'South Korea', code: 'KR', dataset: 'Korea, Republic of' },
  malaysia: { name: 'Malaysia', code: 'MY' }, 'new-zealand': { name: 'New Zealand', code: 'NZ' }, china: { name: 'China', code: 'CN' }
};

// Well-known universities shown first, with English names and common abbreviations for search.
const FEATURED = {
  germany: [['Technical University of Munich', 'tum.de', 'TUM'], ['RWTH Aachen University', 'rwth-aachen.de', 'RWTH'], ['Ludwig Maximilian University of Munich', 'lmu.de', 'LMU'], ['Karlsruhe Institute of Technology', 'kit.edu', 'KIT'], ['Technische Universität Berlin', 'tu-berlin.de', 'TU Berlin'], ['TU Dresden', 'tu-dresden.de', 'TUD'], ['Heidelberg University', 'uni-heidelberg.de'], ['Humboldt University of Berlin', 'hu-berlin.de', 'HU Berlin'], ['University of Stuttgart', 'uni-stuttgart.de'], ['Technical University of Darmstadt', 'tu-darmstadt.de', 'TU Darmstadt'], ['University of Bonn', 'uni-bonn.de'], ['FAU Erlangen-Nürnberg', 'fau.de', 'FAU']],
  canada: [['University of Toronto', 'utoronto.ca', 'UofT'], ['University of British Columbia', 'ubc.ca', 'UBC'], ['McGill University', 'mcgill.ca'], ['University of Waterloo', 'uwaterloo.ca'], ['University of Alberta', 'ualberta.ca'], ['McMaster University', 'mcmaster.ca'], ['Concordia University', 'concordia.ca'], ['Dalhousie University', 'dal.ca']],
  usa: [['Massachusetts Institute of Technology', 'mit.edu', 'MIT'], ['Stanford University', 'stanford.edu'], ['Georgia Institute of Technology', 'gatech.edu', 'Georgia Tech'], ['Purdue University', 'purdue.edu'], ['Arizona State University', 'asu.edu', 'ASU'], ['Northeastern University', 'northeastern.edu'], ['Texas A&M University', 'tamu.edu', 'TAMU'], ['The University of Texas at Dallas', 'utdallas.edu', 'UTD']],
  uk: [['University of Oxford', 'ox.ac.uk', 'Oxford'], ['University of Cambridge', 'cam.ac.uk', 'Cambridge'], ['Imperial College London', 'imperial.ac.uk', 'Imperial'], ['University College London', 'ucl.ac.uk', 'UCL'], ['University of Manchester', 'manchester.ac.uk'], ['University of Edinburgh', 'ed.ac.uk'], ["King's College London", 'kcl.ac.uk', 'KCL'], ['University of Leeds', 'leeds.ac.uk'], ['University of Birmingham', 'birmingham.ac.uk']],
  australia: [['University of Melbourne', 'unimelb.edu.au'], ['University of Sydney', 'sydney.edu.au', 'USYD'], ['UNSW Sydney', 'unsw.edu.au', 'UNSW'], ['Monash University', 'monash.edu'], ['Australian National University', 'anu.edu.au', 'ANU'], ['University of Queensland', 'uq.edu.au', 'UQ'], ['University of Adelaide', 'adelaide.edu.au']],
  ireland: [['Trinity College Dublin', 'tcd.ie', 'TCD'], ['University College Dublin', 'ucd.ie', 'UCD'], ['University of Galway', 'universityofgalway.ie'], ['University College Cork', 'ucc.ie', 'UCC'], ['Dublin City University', 'dcu.ie', 'DCU']],
  netherlands: [['Delft University of Technology', 'tudelft.nl', 'TU Delft'], ['University of Amsterdam', 'uva.nl', 'UvA'], ['Leiden University', 'leidenuniv.nl'], ['Utrecht University', 'uu.nl'], ['Eindhoven University of Technology', 'tue.nl', 'TU/e'], ['University of Twente', 'utwente.nl'], ['University of Groningen', 'rug.nl']],
  sweden: [['KTH Royal Institute of Technology', 'kth.se', 'KTH'], ['Lund University', 'lu.se'], ['Uppsala University', 'uu.se'], ['Chalmers University of Technology', 'chalmers.se'], ['Stockholm University', 'su.se']],
  finland: [['Aalto University', 'aalto.fi'], ['University of Helsinki', 'helsinki.fi'], ['Tampere University', 'tuni.fi'], ['University of Oulu', 'oulu.fi']],
  france: [['Sorbonne University', 'sorbonne-universite.fr'], ['Université Paris-Saclay', 'universite-paris-saclay.fr'], ['Sciences Po', 'sciencespo.fr'], ['École Polytechnique', 'polytechnique.edu']],
  italy: [['Politecnico di Milano', 'polimi.it', 'PoliMi'], ['University of Bologna', 'unibo.it'], ['Sapienza University of Rome', 'uniroma1.it', 'Sapienza'], ['Politecnico di Torino', 'polito.it', 'PoliTo'], ['University of Padua', 'unipd.it']],
  hungary: [['University of Debrecen', 'unideb.hu'], ['Eötvös Loránd University', 'elte.hu', 'ELTE'], ['Budapest University of Technology and Economics', 'bme.hu', 'BME'], ['University of Szeged', 'u-szeged.hu']],
  japan: [['The University of Tokyo', 'u-tokyo.ac.jp', 'UTokyo'], ['Kyoto University', 'kyoto-u.ac.jp'], ['Osaka University', 'osaka-u.ac.jp'], ['Tohoku University', 'tohoku.ac.jp']],
  'south-korea': [['KAIST', 'kaist.ac.kr'], ['Seoul National University', 'snu.ac.kr', 'SNU'], ['Korea University', 'korea.ac.kr'], ['Yonsei University', 'yonsei.ac.kr'], ['POSTECH', 'postech.ac.kr']],
  malaysia: [['Universiti Malaya', 'um.edu.my', 'UM'], ['Universiti Putra Malaysia', 'upm.edu.my', 'UPM'], ['Universiti Teknologi Malaysia', 'utm.my', 'UTM'], ['Monash University Malaysia', 'monash.edu.my'], ["Taylor's University", 'taylors.edu.my']],
  'new-zealand': [['University of Auckland', 'auckland.ac.nz'], ['University of Otago', 'otago.ac.nz'], ['Victoria University of Wellington', 'wgtn.ac.nz'], ['University of Canterbury', 'canterbury.ac.nz']],
  china: [['Tsinghua University', 'tsinghua.edu.cn'], ['Peking University', 'pku.edu.cn', 'PKU'], ['Zhejiang University', 'zju.edu.cn', 'ZJU'], ['Fudan University', 'fudan.edu.cn'], ['Shanghai Jiao Tong University', 'sjtu.edu.cn', 'SJTU']]
};

let dataset = null; let loadedAt = 0; let refreshing = null;
const knownDomains = new Set(Object.values(FEATURED).flat().map(([, d]) => d));

function readCachedFile() {
  try { const stat = fs.statSync(DATASET_FILE); return { list: JSON.parse(fs.readFileSync(DATASET_FILE, 'utf8')), at: stat.mtimeMs }; } catch { return null; }
}
async function downloadDataset() {
  const res = await fetch(DATASET_URL, { signal: AbortSignal.timeout(30000), headers: { 'User-Agent': 'Pothik/1.0 (+study-abroad guidance)' } });
  if (!res.ok) throw new Error(`Dataset HTTP ${res.status}`);
  const text = await res.text();
  if (text.length > 20e6) throw new Error('Dataset unexpectedly large.');
  const list = JSON.parse(text);
  if (!Array.isArray(list) || list.length < 1000) throw new Error('Dataset looks incomplete.');
  // Keep only what we need; write atomically.
  const slim = list.filter(u => u && typeof u.name === 'string' && typeof u.country === 'string').map(u => ({ name: u.name.trim(), country: u.country, domains: (u.domains || []).filter(d => typeof d === 'string').slice(0, 5), web: (u.web_pages || [])[0] || '', region: u['state-province'] || '' }));
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(`${DATASET_FILE}.tmp`, JSON.stringify(slim)); fs.renameSync(`${DATASET_FILE}.tmp`, DATASET_FILE);
  return slim;
}
function indexDomains(list) { for (const u of list) u.domains.forEach(d => knownDomains.add(d)); }

// Returns the dataset, downloading it if missing and refreshing it in the background once a day.
async function getDataset() {
  if (!dataset) {
    const cached = readCachedFile();
    if (cached) { dataset = cached.list; loadedAt = cached.at; indexDomains(dataset); }
  }
  const stale = !dataset || Date.now() - loadedAt > REFRESH_MS;
  if (stale && !refreshing) {
    refreshing = downloadDataset().then(list => { dataset = list; loadedAt = Date.now(); indexDomains(list); console.log(`University directory updated: ${list.length} universities.`); })
      .catch(e => console.error('University directory download failed:', e.message)).finally(() => { refreshing = null; });
  }
  if (!dataset && refreshing) await refreshing;
  return dataset || [];
}

const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Which degree levels an institution can usually award, judged from its name. Used to hide places
// that cannot offer the level a student wants (e.g. community colleges for a Master's). Not perfect,
// so the programme list (when known) takes priority over this.
const ALL_LEVELS = ['foundation', 'diploma', 'bachelor', 'master', 'phd'];
function levelsFor(name) {
  const n = norm(name);
  // Malaysian "politeknik" award diplomas, not degrees.
  if (/\bpoliteknik\b/.test(n)) return ['foundation', 'diploma'];
  // Community and junior colleges never award master's degrees, even inside a university system
  // ("University of Arkansas Community College-Hope").
  if (/\b(community|junior)\s+colleges?\b/.test(n)) return ['foundation', 'diploma', 'bachelor'];
  if (/\b(technical|career|vocational)\s+colleges?\b|\bcollege of (nursing|technology|beauty)\b|\bbeauty\b|\bbarber\b|\bcosmetology\b|\bseminary\b/.test(n) && !/\buniversity\b/.test(n)) return ['foundation', 'diploma', 'bachelor'];
  // Universities of applied sciences usually award bachelor's and master's, not doctorates.
  if (/fachhochschule|hochschule fur angewandte|university of applied sciences|universities of applied sciences|hogeschool|ammattikorkeakoulu|yrkeshogskola|\bpolytechnic\b(?!\s+(institute|university)\b)(?!.*\buniversity\b)|\bhaute ecole\b/.test(n)) return ['foundation', 'diploma', 'bachelor', 'master'];
  return ALL_LEVELS;
}
async function universitiesIn(slug) {
  const country = COUNTRIES[slug]; if (!country) return null;
  const list = await getDataset();
  const datasetName = country.dataset || country.name;
  const inCountry = list.filter(u => u.country === datasetName);
  const featured = (FEATURED[slug] || []).map(([name, domain, abbr]) => {
    // Prefer the entry whose own domain list contains this exact domain (avoids matching a campus first).
    const match = inCountry.find(u => u.domains.includes(domain)) || inCountry.find(u => u.domains.some(d => d.endsWith(`.${domain}`)));
    return { name, aka: match && norm(match.name) !== norm(name) ? match.name : '', abbr: abbr || '', domain, web: match?.web || `https://www.${domain}/`, featured: true, levels: ALL_LEVELS, matched: match || null };
  });
  const featuredMatches = new Set(featured.map(f => f.matched).filter(Boolean));
  const featuredDomains = new Set(featured.map(f => f.domain));
  const seen = new Set();
  const rest = inCountry.filter(u => !featuredMatches.has(u) && !u.domains.some(d => featuredDomains.has(d)))
    .filter(u => { const k = norm(u.name); if (seen.has(k)) return false; seen.add(k); return true; })
    .map(u => ({ name: u.name, aka: '', abbr: '', domain: u.domains[0] || '', web: u.web, region: u.region, featured: false, levels: levelsFor(u.name) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { country: { slug, ...country }, universities: [...featured.map(({ matched, ...f }) => f), ...rest], updatedAt: loadedAt || null };
}

// ---------- Logos (served through Pothik, cached for 30 days) ----------
const DOMAIN_RE = /^(?=.{3,120}$)([a-z0-9-]+\.)+[a-z]{2,}$/;
function imageType(buf) {
  if (!buf || buf.length < 8) return null;
  if (buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') return 'image/png';
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg';
  if (buf.toString('ascii', 0, 4) === 'GIF8') return 'image/gif';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (buf[0] === 0 && buf[1] === 0 && buf[2] === 1 && buf[3] === 0) return 'image/x-icon';
  return null; // SVG and anything else is refused.
}
async function fetchImage(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000), redirect: 'follow', headers: { 'User-Agent': 'Pothik/1.0 (+study-abroad guidance)' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 300 * 1024) throw new Error('Logo too large.');
  const type = imageType(buf); if (!type) throw new Error('Not a supported image.');
  return { buf, type };
}
const logoJobs = new Map();
// Only domains from the directory can be looked up, so this cannot be used to fetch arbitrary sites.
async function getLogo(domain) {
  domain = String(domain || '').toLowerCase();
  if (!DOMAIN_RE.test(domain)) return null;
  await getDataset();
  if (!knownDomains.has(domain)) return null;
  const file = path.join(LOGO_DIR, `${domain}.img`); const meta = `${file}.type`; const missing = `${file}.missing`;
  try { const stat = fs.statSync(file); if (Date.now() - stat.mtimeMs < LOGO_MAX_AGE_MS) return { buf: fs.readFileSync(file), type: fs.readFileSync(meta, 'utf8') }; } catch { /* not cached */ }
  // Remember logos that could not be found for a week, so we don't look them up on every visit.
  try { if (Date.now() - fs.statSync(missing).mtimeMs < 7 * 24 * 3600e3) return null; } catch { /* not marked missing */ }
  if (!logoJobs.has(domain)) {
    logoJobs.set(domain, (async () => {
      // Google's public favicon service picks the site's best icon; fall back to the site's own favicon.
      let img = null;
      for (const url of [`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`, `https://${domain}/favicon.ico`]) {
        try { img = await fetchImage(url); break; } catch { /* try next */ }
      }
      fs.mkdirSync(LOGO_DIR, { recursive: true });
      if (!img) { fs.writeFileSync(missing, ''); return null; }
      fs.writeFileSync(file, img.buf); fs.writeFileSync(meta, img.type);
      return img;
    })().finally(() => logoJobs.delete(domain)));
  }
  return logoJobs.get(domain);
}

// True only for domains in the university directory (so callers cannot point the server at arbitrary sites).
async function isKnownDomain(domain) { await getDataset(); return knownDomains.has(String(domain || '').toLowerCase()); }

module.exports = { COUNTRIES, FEATURED, universitiesIn, getDataset, getLogo, imageType, levelsFor, isKnownDomain };
