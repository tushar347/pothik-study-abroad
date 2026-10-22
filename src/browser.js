// Headless-browser reader for official university pages that load their content with JavaScript
// (e.g. programme lists behind a "Load more" button). Uses Playwright's headless Chromium.
// Every request the browser makes is checked: only public http(s) addresses, no images/fonts/media.
const dns = require('dns').promises;
const net = require('net');

let playwright = null;
try { playwright = require('playwright'); } catch { /* optional: feature disabled if not installed */ }

const NAV_TIMEOUT_MS = 30000;
const TOTAL_TIMEOUT_MS = 90000;
const MAX_LOAD_MORE = 40;
const LOAD_MORE = /^(load|show|view|see)\s+(more|all)\b|more\s+(results|programmes|programs|courses)|mehr\s+(laden|anzeigen|ergebnisse)|weitere\s+(laden|anzeigen|ergebnisse|studiengänge)|alle\s+anzeigen|meer\s+(laden|tonen|resultaten)|visa\s+fler|näytä\s+lisää|voir\s+plus|afficher\s+plus|mostra\s+(altri|di\s+più)|carica\s+altri|ver\s+más|cargar\s+más/i;
const REJECT_COOKIES = /^(reject|decline|deny)(\s+all)?$|only\s+(necessary|essential)|necessary\s+only|essential\s+only|nur\s+(notwendige|erforderliche|essenzielle)|ablehnen|alle\s+ablehnen|weigeren|afwijzen|tout\s+refuser|refuser|rifiuta|rechazar/i;

function isPrivateAddress(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v = ip.toLowerCase();
  if (v.startsWith('::ffff:')) return isPrivateAddress(v.slice(7));
  return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || /^fe[89ab]/.test(v);
}
const hostChecks = new Map();
async function isPublicHost(host) {
  if (net.isIP(host)) return false;
  if (!hostChecks.has(host)) hostChecks.set(host, dns.lookup(host, { all: true }).then(a => a.length > 0 && a.every(x => !isPrivateAddress(x.address))).catch(() => false));
  return hostChecks.get(host);
}

// One page at a time, sharing a browser that closes itself when idle.
let browser = null; let idleTimer = null; let queue = Promise.resolve();
async function getBrowser() {
  clearTimeout(idleTimer);
  if (!browser || !browser.isConnected()) browser = await playwright.chromium.launch({ headless: true });
  return browser;
}
function scheduleClose() { clearTimeout(idleTimer); idleTimer = setTimeout(() => { browser?.close().catch(() => {}); browser = null; }, 60000); idleTimer.unref?.(); }

async function renderPage(url) {
  const start = new URL(url);
  if (!['https:', 'http:'].includes(start.protocol) || start.username || start.password || !(await isPublicHost(start.hostname))) throw new Error('Only public web pages can be read.');
  const b = await getBrowser();
  const context = await b.newContext({ userAgent: 'Mozilla/5.0 (compatible; PothikResearch/1.0; +study-abroad guidance)', javaScriptEnabled: true, acceptDownloads: false, viewport: { width: 1280, height: 1600 } });
  const deadline = Date.now() + TOTAL_TIMEOUT_MS;
  try {
    // Block anything that is not a public http(s) request, and skip heavy resources we don't need.
    await context.route('**/*', async route => {
      const req = route.request();
      if (['image', 'media', 'font'].includes(req.resourceType())) return route.abort();
      let u; try { u = new URL(req.url()); } catch { return route.abort(); }
      if (u.protocol === 'data:' || u.protocol === 'blob:') return route.continue();
      if (!['https:', 'http:'].includes(u.protocol) || !(await isPublicHost(u.hostname))) return route.abort();
      return route.continue();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    await page.goto(start.href, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    // Decline non-essential cookies if a banner is in the way.
    const reject = page.getByRole('button', { name: REJECT_COOKIES }).first();
    if (await reject.isVisible().catch(() => false)) await reject.click({ timeout: 3000 }).catch(() => {});
    const linkCount = () => page.evaluate(() => document.querySelectorAll('a[href]').length);
    let clicks = 0; let before = await linkCount();
    // Keep pressing "Load more" (or scrolling) until the list stops growing.
    while (clicks < MAX_LOAD_MORE && Date.now() < deadline) {
      const more = page.locator('button, a, [role=button]').filter({ hasText: LOAD_MORE }).filter({ visible: true }).first();
      if (await more.count() && await more.isEnabled().catch(() => false)) {
        await more.scrollIntoViewIfNeeded().catch(() => {});
        await more.click({ timeout: 5000 }).catch(() => {});
      } else {
        await page.mouse.wheel(0, 20000);
      }
      await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
      await page.waitForTimeout(400);
      const after = await linkCount();
      if (after <= before) break;
      before = after; clicks++;
    }
    const result = await page.evaluate(() => {
      const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
      const generic = /^(read more|more|more info(rmation)?|details?|view details|learn more|find out more|view|explore|show|go|discover|visit|weiterlesen|mehr( erfahren| informationen| infos)?|zum studiengang|lees (meer|verder)|meer informatie|läs mer|lue lisää|en savoir plus|plus d'infos|scopri di più|leer más|más información|›|»|→)$/i;
      // Label each link: its own text, or the heading of the card it sits in ("Read more" links).
      const labelFor = a => {
        const own = clean(a.innerText || a.getAttribute('aria-label') || a.title);
        if (own && !generic.test(own) && own.length <= 160) return own;
        let el = a;
        for (let i = 0; i < 5 && el; i++, el = el.parentElement) {
          const h = el.querySelector('h1,h2,h3,h4,h5,[class*=title],[class*=heading],strong');
          if (h && clean(h.innerText)) return clean(h.innerText).slice(0, 160);
        }
        return own;
      };
      // The link's own card: the largest ancestor that is still small (not the whole results list).
      const cardText = a => {
        let best = a; let el = a.parentElement;
        for (let i = 0; i < 6 && el; i++, el = el.parentElement) { const t = clean(el.innerText); if (t.length > 400) break; best = el; }
        return clean(best.innerText).slice(0, 300);
      };
      // English version of the page: hreflang alternate, or a visible "English" / "EN" language switch.
      const en = [...document.querySelectorAll('link[rel=alternate][hreflang]')].find(l => /^en(-|$)/i.test(l.hreflang))?.href
        || [...document.querySelectorAll('a[hreflang^="en"], a[lang^="en"]')].map(a => a.href)[0]
        || [...document.querySelectorAll('a[href]')].find(a => /^(english|en|eng)$/i.test(clean(a.innerText || a.getAttribute('aria-label'))) && /^https?:/.test(a.href))?.href || '';
      return {
        url: location.href, title: document.title, english: en, lang: document.documentElement.lang || '',
        text: document.body ? document.body.innerText : '',
        // chrome: link sits in site navigation (menus, header, footer) rather than page content.
        links: [...document.querySelectorAll('a[href]')].map(a => ({ text: labelFor(a), href: a.href, context: cardText(a), chrome: Boolean(a.closest('nav, header, footer, [role=navigation], [role=contentinfo], [role=banner]')) })).filter(l => l.text && /^https?:/.test(l.href))
      };
    });
    return { ...result, clicks };
  } finally {
    await context.close().catch(() => {});
    scheduleClose();
  }
}

// Queued so only one page renders at a time.
function readRenderedPage(url) {
  if (!playwright) return Promise.reject(Object.assign(new Error('Headless browser not installed.'), { code: 'NO_BROWSER' }));
  const job = queue.then(() => renderPage(url));
  queue = job.catch(() => {});
  return job;
}

module.exports = { readRenderedPage, available: () => Boolean(playwright), LOAD_MORE, REJECT_COOKIES };
