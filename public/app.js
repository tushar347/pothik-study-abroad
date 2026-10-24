const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const state = { user: null, site: null, countries: [], resources: [], ieltsResources: [], programs: [], scholarships: [], opportunities: [], exercises: [], roadmaps: [], selectedCountry: 'germany', skill: 'All', authMode: 'login', chatBusy: false, chatHistory: [], adminContent: null };
const esc = (v = '') => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Country flags as SVG images (flag-icons, MIT) — Windows does not draw flag emoji.
const FLAG_CODES = { germany: 'de', canada: 'ca', usa: 'us', uk: 'gb', australia: 'au', ireland: 'ie', netherlands: 'nl', sweden: 'se', finland: 'fi', france: 'fr', italy: 'it', hungary: 'hu', japan: 'jp', 'south-korea': 'kr', malaysia: 'my', 'new-zealand': 'nz', china: 'cn', bangladesh: 'bd' };
function flagHtml(slugOrCode, fallback = '') {
  const code = FLAG_CODES[slugOrCode] || (/^[a-z]{2}$/i.test(slugOrCode || '') && Object.values(FLAG_CODES).includes(String(slugOrCode).toLowerCase()) ? String(slugOrCode).toLowerCase() : '');
  return code ? `<img class="flag-img" src="/assets/flags/${code}.svg" alt="" width="20" height="15">` : esc(fallback);
}
const TOAST_ICONS = {
  sunrise: '<path d="M12 3v3M5.6 7.6 7 9M18.4 7.6 17 9M3 17h18M7 17a5 5 0 0 1 10 0M5 21h14"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  sunset: '<path d="M12 3v6M9 6l3 3 3-3M3 17h18M7 17a5 5 0 0 1 10 0M5 21h14"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  plane: '<path d="M2 16l20-7-4-2-6 2-6-4-2 1 4 5-4 2-2-1-1 1z"/><path d="M3 21h18"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M14 9l2 2"/>'
};
const strokeIcon = d => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
// toast('Saved.') for a one-liner; toast(text, { title, icon }) for a titled card with an icon from TOAST_ICONS.
function toast(message, { title = '', icon = '' } = {}) {
  const t = $('#toast'); t.classList.toggle('toast-rich', !!title);
  if (title) t.innerHTML = `${TOAST_ICONS[icon] ? `<span class="toast-icon">${strokeIcon(TOAST_ICONS[icon])}</span>` : ''}<span class="toast-text"><b>${esc(title)}</b><span>${esc(message)}</span></span>`;
  else t.textContent = message;
  t.classList.add('show'); clearTimeout(window._toastTimer); window._toastTimer = setTimeout(() => t.classList.remove('show'), title ? 5200 : 3500);
}
// Greetings for signing in, joining and signing out — by time of day, in the student's chosen language.
const GREETINGS = {
  en: {
    hello: { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening' },
    night: n => `Still up, ${n}?`,
    welcome: ['Your roadmap is right where you left it.', 'Ready for the next step towards your offer letter?', 'Every great journey is a series of small steps — let’s take today’s.', 'Your study-abroad plans missed you.'],
    nightLine: 'Big plans are often made after midnight. Let’s make yours count.',
    bye: n => `Safe travels, ${n}!`,
    byeLines: ['You’re signed out. Your roadmap and profile are safely saved for your return.', 'Signed out securely. We’ll keep your plans warm until you’re back.', 'See you on the road again soon — everything is saved.'],
    join: n => `Welcome aboard, ${n}!`, joinLine: 'Your profile is saved. Let’s plan your journey abroad, one step at a time.'
  },
  bn: {
    hello: { morning: 'শুভ সকাল', afternoon: 'শুভ দুপুর', evening: 'শুভ সন্ধ্যা' },
    night: n => `এখনও জেগে আছেন, ${n}?`,
    welcome: ['আপনার রোডম্যাপ যেখানে রেখে গিয়েছিলেন, সেখানেই আছে।', 'অফার লেটারের পথে পরের ধাপের জন্য প্রস্তুত?', 'প্রতিটি বড় যাত্রা ছোট ছোট পদক্ষেপে গড়া — চলুন আজকেরটা নিই।'],
    nightLine: 'বড় পরিকল্পনাগুলো প্রায়ই রাত জেগেই হয়। চলুন আপনারটা সফল করি।',
    bye: n => `শুভ যাত্রা, ${n}!`,
    byeLines: ['আপনি সাইন আউট করেছেন। আপনার রোডম্যাপ ও প্রোফাইল নিরাপদে সংরক্ষিত আছে।', 'নিরাপদে সাইন আউট হয়েছে। আপনি ফিরে আসা পর্যন্ত আপনার পরিকল্পনা আমরা যত্নে রাখব।'],
    join: n => `পথিকে স্বাগতম, ${n}!`, joinLine: 'আপনার প্রোফাইল সংরক্ষিত হয়েছে। চলুন, ধাপে ধাপে বিদেশে পড়ার যাত্রা পরিকল্পনা করি।'
  }
};
function greetUser(user, kind) {
  const g = GREETINGS[user?.preferred_language === 'bn' ? 'bn' : 'en'];
  const name = (user?.name || '').trim().split(/\s+/)[0] || 'traveller';
  const pick = list => list[Math.floor(Math.random() * list.length)];
  if (kind === 'logout') return toast(pick(g.byeLines), { title: g.bye(name), icon: 'plane' });
  if (kind === 'signup') return toast(g.joinLine, { title: g.join(name), icon: 'compass' });
  const h = new Date().getHours();
  const part = h < 5 || h >= 22 ? 'night' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  if (part === 'night') return toast(g.nightLine, { title: g.night(name), icon: 'moon' });
  toast(pick(g.welcome), { title: `${g.hello[part]}, ${name}!`, icon: { morning: 'sunrise', afternoon: 'sun', evening: 'sunset' }[part] });
}

// Live strength meter, checklist and passphrase helper under a "new password" field. Rules: password-policy.js.
function attachPasswordMeter(input, context = () => ({}), watch = []) {
  if (input._meter) return input._meter;
  const P = window.PothikPassword; const idle = `${P.MIN_LENGTH}+ characters. A short sentence makes a great password.`;
  const meter = document.createElement('div'); meter.className = 'pw-meter'; meter.dataset.level = '0';
  meter.innerHTML = `<div class="pw-meter-head"><span class="pw-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="pw-verdict"><b aria-live="polite">Start typing</b><small>${esc(idle)}</small></span></div>
    <ul class="pw-checks">${P.assess('').checks.map(c => `<li data-check="${c.id}"><span class="pw-tick" aria-hidden="true"></span><span>${esc(c.label)}</span>${c.progress ? '<small class="pw-count"></small>' : ''}</li>`).join('')}</ul>
    <button type="button" class="pw-suggest">${strokeIcon(TOAST_ICONS.key)}<span>Suggest a strong passphrase</span></button>`;
  (input.closest('.nm-field, .nm-control') || input).after(meter);
  const update = () => {
    if (meter.hidden) { input.setCustomValidity(''); return; }
    const r = P.assess(input.value, context()); const typed = !!input.value;
    meter.dataset.level = typed ? r.level : 0; meter.classList.toggle('is-ok', r.ok);
    meter.querySelector('.pw-verdict b').textContent = typed ? r.name : 'Start typing';
    meter.querySelector('.pw-verdict small').textContent = typed ? (r.ok ? r.hint : r.message) : idle;
    r.checks.forEach(c => { const li = meter.querySelector(`[data-check="${c.id}"]`); li.classList.toggle('ok', typed && c.ok); const n = li.querySelector('.pw-count'); if (n) n.textContent = c.progress; });
    input.setCustomValidity(r.ok ? '' : r.message || 'Choose a stronger password.');
    const field = input.closest('.pf-invalid');
    if (r.ok && field) { field.classList.remove('pf-invalid'); const err = field.querySelector('.pf-error'); if (err) err.textContent = ''; }
  };
  input.addEventListener('input', update); watch.forEach(w => w?.addEventListener('input', update));
  meter.querySelector('.pw-suggest').addEventListener('click', () => {
    input.value = P.suggestPassphrase(); input.type = 'text';
    const eye = input.parentElement.querySelector('[data-toggle-password]');
    if (eye) { eye.setAttribute('aria-pressed', 'true'); eye.setAttribute('aria-label', 'Hide password'); }
    input.dispatchEvent(new Event('input', { bubbles: true })); input.focus();
    toast('Save it in your password manager or somewhere safe — it’s strong and easy to type.', { title: 'Your passphrase is ready', icon: 'key' });
  });
  input._meter = { el: meter, update }; update();
  return input._meter;
}
// Caps Lock warning under any password field (sign in, signup, reset, profile).
function checkCapsLock(e) {
  const input = e.target;
  if (!(input instanceof HTMLInputElement) || !/password$/.test(input.autocomplete || '')) return;
  const on = e.type !== 'focusout' && e.getModifierState('CapsLock');
  if (e.type !== 'focusout') state.capsOn = on;
  const host = input.closest('.nm-field, .nm-control') || input;
  let warn = host.nextElementSibling?.classList.contains('caps-warning') ? host.nextElementSibling : null;
  if (on && !warn) { warn = document.createElement('small'); warn.className = 'caps-warning'; warn.setAttribute('role', 'status'); warn.textContent = '⇪ Caps Lock is on'; host.after(warn); }
  if (warn) warn.hidden = !on;
}
async function api(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData) && options.body !== undefined) headers['Content-Type'] = 'application/json';
  let response;
  try {
    response = await fetch(url, { credentials: 'same-origin', ...options, headers });
  } catch (error) {
    console.error('[Pothik UI] Request failed', { path: url, message: error.message });
    throw error;
  }
  let data = {}; try { data = await response.json(); } catch {}
  if (!response.ok) {
    console.error('[Pothik UI] Request failed', { path: url, status: response.status, message: data.error || response.statusText });
    const error = new Error(data.error || 'The request could not be completed.'); error.status = response.status; error.data = data; throw error;
  }
  return data;
}
function setText(selector, value) { const el = $(selector); if (el && value !== undefined && value !== null) el.textContent = value; }
function currentCountry() { return state.site?.countries?.find(c => c.slug === state.selectedCountry) || state.site?.countries?.[0]; }
function applyBrand() {
  if (!state.site) return;
  const s = state.site;
  const root = document.documentElement;
  const t = s.brand?.theme || {};
  const map = { burgundy: '--burgundy', deepBurgundy: '--burgundy-deep', cream: '--cream', ivory: '--ivory', dustyRose: '--rose', blush: '--blush', sage: '--sage', lavender: '--lavender', champagne: '--champagne', ink: '--ink' };
  Object.entries(map).forEach(([key, css]) => { if (t[key]) root.style.setProperty(css, t[key]); });
  const logo = s.brand?.logo || '/assets/brand/pothik-logo.png';
  ['#brandLogo', '#footerLogo'].forEach(sel => { const el = $(sel); if (el) { el.src = logo; el.onerror = () => { el.style.display = 'none'; $('.brand-fallback')?.style.setProperty('display', 'flex'); }; } });
  setText('#heroEyebrow', s.hero?.eyebrow);
  setText('#heroHeadline', s.hero?.headline);
  const headline = $('#heroHeadline');
  if (headline && !headline.querySelector('em')) {
    const text = headline.textContent.trim();
    const last = text.split(' ').pop();
    headline.innerHTML = `${esc(text.slice(0, text.length - last.length).trim())} <em>${esc(last)}</em>`;
  }
  setText('#heroDescription', s.hero?.description);
  const heroImg = $('#heroImage'); if (heroImg) { heroImg.src = s.hero?.image || ''; heroImg.alt = s.hero?.imageAlt || 'Study abroad destination'; }
  const p = $('#heroPrimary'); if (p) p.textContent = `${s.hero?.primaryCta || 'Build my roadmap'} ↗`;
  const sec = $('#heroSecondary'); if (sec) sec.textContent = `${s.hero?.secondaryCta || 'Explore destinations'} ↓`;
  setText('#assistantGreeting', s.assistant?.greeting);
  renderChatPrompts();
}
function renderCountryTabs() {
  const countries = state.site?.countries || [];
  $('#countryTabs').innerHTML = countries.map((c, i) => `<button type="button" class="country-tab ${c.slug === state.selectedCountry ? 'active' : ''}" role="tab" aria-selected="${c.slug === state.selectedCountry}" data-country-tab="${esc(c.slug)}"><span class="flag">${flagHtml(c.slug, c.flag || '')}</span>${esc(c.name)}</button>`).join('');
  $('#countryTabs').querySelectorAll('[data-country-tab]').forEach(btn => btn.addEventListener('click', () => selectCountry(btn.dataset.countryTab)));
  $('#countryMiniGrid').innerHTML = countries.map((c, i) => `<button type="button" class="country-mini ${c.slug === state.selectedCountry ? 'active' : ''}" data-country-mini="${esc(c.slug)}" aria-label="Explore ${esc(c.name)}"><img src="${esc(c.image)}" alt="${esc(c.imageAlt || c.name)}" loading="lazy"><span class="country-mini-meta"><span class="flag">${flagHtml(c.slug, c.flag || '')}</span><b>${esc(c.name)}</b></span></button>`).join('');
  $('#countryMiniGrid').querySelectorAll('[data-country-mini]').forEach(btn => btn.addEventListener('click', () => selectCountry(btn.dataset.countryMini)));
  const select = $('#roadCountry'); if (select) select.innerHTML = countries.map(c => `<option value="${esc(c.slug)}">${esc(c.name)}</option>`).join('');
  renderSelectedCountry();
}
function selectCountry(slug) { if (!state.site?.countries?.some(c => c.slug === slug)) return; state.selectedCountry = slug; renderCountryTabs(); }
function renderSelectedCountry() {
  const c = currentCountry(); if (!c) return;
  const idx = state.site.countries.findIndex(x => x.slug === c.slug) + 1;
  $('#countryFeatureImage').src = c.image; $('#countryFeatureImage').alt = c.imageAlt || `${c.name} study destination`;
  const featureFlag = $('#countryFeatureFlag'); if (featureFlag) featureFlag.innerHTML = flagHtml(c.slug, c.flag || ''); setText('#countryFeatureName', c.name); setText('#countryTitle', `Study in ${c.name}`);
  setText('#countryKicker', `${c.name.toUpperCase()} · DESTINATION GUIDE`); setText('#countrySummary', c.summary);
  setText('#countryTuition', c.tuition || 'Varies by programme and institution'); setText('#countryLanguage', c.language || 'Check programme language requirements');
  setText('#countryLiving', c.living || 'Check current official cost and visa guidance.');
  setText('#countryImageIndex', `${String(idx).padStart(2, '0')} / ${String(state.site.countries.length).padStart(2, '0')}`);
  const official = $('#countryOfficial'); official.href = c.officialUrl || '#'; official.textContent = `Official ${c.name} study portal ↗`;
  $('#countryTabs').querySelectorAll('[data-country-tab]').forEach(b => { const active = b.dataset.countryTab === c.slug; b.classList.toggle('active', active); b.setAttribute('aria-selected', String(active)); });
  $('#countryMiniGrid').querySelectorAll('[data-country-mini]').forEach(b => b.classList.toggle('active', b.dataset.countryMini === c.slug));
  const heroFlag = $('#heroCountryFlag'); if (heroFlag) heroFlag.innerHTML = flagHtml(c.slug, c.flag || ''); setText('#heroPhotoTitle', `Explore ${c.name}`); setText('#heroPhotoSub', 'Your next chapter starts here');
}
function renderIeltsCards() {
  const skills = state.site?.ielts || [];
  $('#ieltsFeatureGrid').innerHTML = skills.map((s, i) => `<article class="ielts-card" style="--skill-accent:${esc(s.accent || '#F3E3E5')}"><div class="ielts-card-image"><img src="${esc(s.image)}" alt="${esc(s.imageAlt || s.name)}" loading="lazy"><span class="skill-image-label">${esc(s.name)}</span></div><div class="ielts-card-content"><span class="skill-number">0${i + 1} / IELTS SKILL</span><h3>${esc(s.label || s.name)}</h3><p>${esc(s.description)}</p><button type="button" class="ielts-card-link" data-open-skill="${esc(s.name)}">Explore ${esc(s.name)} <span>↗</span></button></div></article>`).join('');
  $('#ieltsFeatureGrid').querySelectorAll('[data-open-skill]').forEach(btn => btn.addEventListener('click', () => openPractice(btn.dataset.openSkill)));
}
function openPractice(skill = 'All') { $('#practicePanel').hidden = false; $('#skillTabs').querySelectorAll('[data-skill]').forEach(b => b.classList.toggle('active', b.dataset.skill === skill)); state.skill = skill; renderExercises(); $('#practicePanel').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
function renderExercises() {
  const list = state.exercises.filter(x => state.skill === 'All' || x.type === state.skill);
  setText('#ieltsExerciseCount', state.exercises.length);
  $('#exerciseGrid').innerHTML = list.map(x => {
    const options = x.options?.length ? `<div class="exercise-options">${x.options.map((o, i) => `<label class="task-line"><input type="radio" name="${esc(x.id)}" value="${i}"><span>${esc(o)}</span></label>`).join('')}</div><button type="button" class="button button-primary" data-check-quiz="${esc(x.id)}">Check answer →</button><div class="form-message" id="feedback-${esc(x.id)}" role="status"></div>` : '';
    const listening = x.type === 'Listening' && x.audio_text ? `<div class="audio-practice"><button type="button" class="button button-outline audio-play" data-play-audio="${esc(x.id)}">▶ Play audio (local voice)</button><span>Uses your browser's speech voice; no API call.</span><details><summary>Reveal transcript after answering</summary><p>${esc(x.audio_text)}</p></details></div>` : '';
    const writing = x.type === 'Writing' ? `<label class="writing-response-label">Your response<textarea class="writing-response" data-writing-response="${esc(x.id)}" rows="7" placeholder="Write your response here. Your draft stays in this browser until you leave this page."></textarea><small><span data-word-count="${esc(x.id)}">0</span> words · target depends on task type</small></label><details class="self-review"><summary>Open self-review checklist</summary><p>${esc(x.explanation || 'Review your answer against the task instructions.')}</p></details>` : '';
    const speaking = x.type === 'Speaking' ? `<label class="writing-response-label">Practice notes or speech transcript<textarea class="writing-response" data-speaking-response="${esc(x.id)}" rows="4" placeholder="Use this space for brief notes or a transcript if you use speech recognition."></textarea></label><div class="speaking-actions"><button type="button" class="button button-outline" data-record-speech="${esc(x.id)}">● Start speech capture</button><button type="button" class="button button-outline" data-practice-tutor="Speaking">Practise with the Counsellor →</button></div><details class="self-review"><summary>Speaking self-review checklist</summary><p>${esc(x.explanation || 'Review fluency, coherence, vocabulary, grammar and pronunciation.')}</p></details>` : '';
    const review = !['Writing','Speaking'].includes(x.type) ? `<details class="self-review"><summary>Review the explanation</summary><p>${esc(x.explanation || 'Review the evidence and why the answer fits.')}</p></details>` : '';
    return `<article class="exercise-card"><div class="exercise-top"><span class="skill-chip ${esc(x.type)}">${esc(x.type)}</span><span class="review-status">${esc(x.difficulty || 'Practice')} · ${Number(x.minutes || 5)} min</span></div><h3>${esc(x.title)}</h3><p class="exercise-prompt">${esc(x.prompt).replace(/\n/g,'<br>')}</p>${listening}${options}${writing}${speaking}${review}${x.type !== 'Speaking' && x.type !== 'Writing' ? `<button type="button" class="button button-outline exercise-tutor" data-practice-tutor="${esc(x.type)}">Ask tutor about this skill →</button>` : ''}</article>`;
  }).join('') || '<div class="empty-state">No practice exercise in this skill yet.</div>';
  $('#exerciseGrid').querySelectorAll('[data-check-quiz]').forEach(btn => btn.addEventListener('click', async () => {
    const item = state.exercises.find(x => x.id === btn.dataset.checkQuiz); const selected = $(`input[name="${item.id}"]:checked`); const feedback = $(`#feedback-${item.id}`);
    if (!selected) { feedback.textContent = 'Choose an answer first.'; return; }
    btn.disabled = true;
    try {
      const result = await api('/api/ielts/submit', { method: 'POST', body: JSON.stringify({ quiz_type: item.type, answers: { [item.id]: Number(selected.value) } }) });
      const f = result.feedback?.find(x => x.id === item.id); feedback.textContent = `${f?.correct ? 'Correct.' : 'Not quite.'} ${f?.explanation || ''}${state.user ? ' Your attempt was saved.' : ''}`;
      feedback.style.color = f?.correct ? '#426b47' : '#8a5360';
    } catch (e) { feedback.textContent = e.message; }
    finally { btn.disabled = false; }
  }));
  $('#exerciseGrid').querySelectorAll('[data-play-audio]').forEach(btn => btn.addEventListener('click', () => {
    const item = state.exercises.find(x => x.id === btn.dataset.playAudio); if (!item?.audio_text) return;
    if (!('speechSynthesis' in window)) { toast('Your browser does not support local speech playback. Use the transcript under the question.'); return; }
    window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(item.audio_text); utterance.lang = 'en-GB'; utterance.rate = 0.92;
    btn.disabled = true; btn.textContent = 'Playing…'; utterance.onend = utterance.onerror = () => { btn.disabled = false; btn.textContent = '▶ Play audio again'; }; window.speechSynthesis.speak(utterance);
  }));
  $('#exerciseGrid').querySelectorAll('[data-writing-response]').forEach(area => area.addEventListener('input', () => { const count = area.value.trim() ? area.value.trim().split(/\s+/).length : 0; setText(`[data-word-count="${area.dataset.writingResponse}"]`, count); }));
  $('#exerciseGrid').querySelectorAll('[data-record-speech]').forEach(btn => btn.addEventListener('click', () => {
    if (btn.dataset.recording === 'true') { try { window._pothikSpeechRecognition?.stop(); } catch {} btn.dataset.recording = 'false'; btn.textContent = '● Start speech capture'; btn.disabled = false; return; }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const target = $(`[data-speaking-response="${btn.dataset.recordSpeech}"]`);
    if (!SpeechRecognition) { toast('Speech capture is not supported by this browser. You can still practise aloud and use the notes box.'); return; }
    const recognition = new SpeechRecognition(); window._pothikSpeechRecognition = recognition; recognition.lang = 'en-GB'; recognition.interimResults = true; recognition.continuous = true;
    btn.dataset.recording = 'true'; btn.textContent = '■ Stop speech capture';
    recognition.onresult = ev => { let text = ''; for (let i=0;i<ev.results.length;i++) text += ev.results[i][0].transcript + (ev.results[i].isFinal ? ' ' : ''); target.value = text.trim(); };
    recognition.onerror = () => { btn.dataset.recording = 'false'; btn.disabled = false; btn.textContent = '● Start speech capture'; toast('Speech capture stopped. You can type notes instead.'); };
    recognition.onend = () => { btn.dataset.recording = 'false'; btn.disabled = false; btn.textContent = '● Start speech capture'; };
    try { recognition.start(); } catch { btn.dataset.recording = 'false'; btn.textContent = '● Start speech capture'; toast('Speech capture could not start. Check browser microphone permission.'); }
  }));
  $('#exerciseGrid').querySelectorAll('[data-practice-tutor]').forEach(btn => btn.addEventListener('click', () => { openCounsellor(); $('#tutorForm [name=mode]').value = 'ielts'; $('#tutorForm [name=question]').value = `Help me practise IELTS ${btn.dataset.practiceTutor}. Give me an original exercise and specific feedback based on IELTS assessment criteria.`; $('#tutorForm [name=question]').focus(); }));
}
function renderIeltsResources() {
  const q = ($('#ieltsResourceSearch')?.value || '').toLowerCase(); const type = $('#ieltsResourceType')?.value || '';
  const rows = state.ieltsResources.filter(r => (!type || r.category === type) && (`${r.title} ${r.body} ${r.source_name} ${r.category}`.toLowerCase().includes(q)));
  setText('#ieltsLessonCount', state.ieltsResources.filter(r => r.category === 'IELTS lesson').length);
  setText('#ieltsResourceCount', state.ieltsResources.filter(r => r.category === 'IELTS resource').length);
  $('#ieltsResourceGrid').innerHTML = rows.map(r => `<article class="ielts-resource-card"><div class="resource-card-top"><span class="resource-category">${r.category === 'IELTS resource' ? 'Official link' : 'Original Pothik lesson'}</span><span class="resource-provider">${esc(r.source_name || 'IELTS resource')}</span></div><h4>${esc(r.title)}</h4><p>${esc(r.body)}</p><div class="ielts-resource-bottom"><span>${r.category === 'IELTS resource' ? 'Public resource · source terms apply' : 'Available locally · no API required'}</span><a href="${esc(r.source_url)}" target="_blank" rel="noopener noreferrer">${r.category === 'IELTS resource' ? 'Open resource ↗' : 'Reference source ↗'}</a></div></article>`).join('') || '<div class="empty-state">No IELTS resources match your search.</div>';
}
function normalizeCountrySlug(value = '') {
  const key = String(value).trim().toLowerCase();
  const aliases = { 'united states':'usa', 'united states of america':'usa', 'us':'usa', 'u.s.':'usa', 'united kingdom':'uk', 'great britain':'uk', 'uk':'uk', 'deutschland':'germany', 'ca':'canada', 'au':'australia' };
  return aliases[key] || key;
}
function renderOpportunities() {
  const q = ($('#opportunitySearch')?.value || '').toLowerCase(); const country = normalizeCountrySlug($('#opportunityCountry')?.value || ''); const status = $('#opportunityStatus')?.value || '';
  const rows = state.opportunities.filter(o => (!country || normalizeCountrySlug(o.country_slug || o.country_name) === country) && (!status || o.status === status) && (`${o.title} ${o.provider} ${o.summary} ${o.country_name}`.toLowerCase().includes(q)));
  const labels = { upcoming:'Upcoming deadline', open:'Open', 'check-source':'Check official source', 'needs-review':'New candidate · review needed', closed:'Closed · monitor next cycle' };
  $('#opportunityGrid').innerHTML = rows.map(o => { const c = state.site?.countries?.find(x => x.slug === o.country_slug); const date = o.deadline_date ? new Date(`${o.deadline_date}T12:00:00`).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : '';
    return `<article class="opportunity-card"><div class="opportunity-card-top"><span class="opportunity-country">${flagHtml(o.country_slug, c?.flag || '')} ${esc(o.country_name)}</span><span class="opportunity-status status-${esc(o.status)}">${esc(labels[o.status] || o.status)}</span></div><div class="opportunity-provider">${esc(o.provider)}</div><h3>${esc(o.title)}</h3><p>${esc(o.summary)}</p><div class="opportunity-deadline"><span>Deadline / status</span><b>${esc(date || o.deadline_label || 'Check official source')}</b></div>${o.review_required ? '<div class="review-warning">Automatically discovered link — review required before publication.</div>' : ''}<div class="opportunity-card-foot"><small>${o.source_checked_at ? `Source checked ${esc(new Date(o.source_checked_at).toLocaleDateString('en-GB'))}` : 'Current call must be verified'}</small><a href="${esc(o.official_url)}" target="_blank" rel="noopener noreferrer">Official details ↗</a></div></article>`;
  }).join('') || `<div class="empty-state"><strong>No opportunities match these filters.</strong><br>Try another destination or status. If you expected results, choose All destinations and refresh the page; official source links are listed below.</div>`;
  setText('#opportunitySummary', `${rows.length} opportunities or official monitoring links · ${state.opportunities.filter(x => x.status === 'upcoming' || x.status === 'open').length} with a published future/open status`);
  const dates = state.opportunities.map(x => x.source_checked_at).filter(Boolean).sort(); setText('#opportunityLastChecked', dates.length ? `Latest source check: ${new Date(dates[dates.length - 1]).toLocaleDateString('en-GB')}` : 'No successful source check recorded yet · official links remain available');
}

function renderResources() {
  const q = ($('#resourceSearch')?.value || '').toLowerCase(); const category = $('#resourceCategory')?.value || '';
  const rows = state.resources.filter(r => (!category || r.category === category) && (`${r.title} ${r.body} ${r.category} ${r.source_name}`.toLowerCase().includes(q)));
  $('#resourceGrid').innerHTML = rows.map(r => `<article class="resource-card"><div class="resource-card-top"><span class="resource-category">${esc(r.category)}</span><span class="review-status">${esc(r.verified_at || 'Review status unavailable')}</span></div><h3>${esc(r.title)}</h3><p>${esc(r.body)}</p><div class="resource-bottom"><small>Source-linked guide</small><a href="${esc(r.source_url)}" target="_blank" rel="noopener noreferrer">${esc(r.source_name || 'Official source')} ↗</a></div></article>`).join('') || '<div class="empty-state">No resources match that search. Try another term.</div>';
}
function renderPrograms() {
  $('#programTable').innerHTML = state.programs.map(p => `<tr><td>${esc(p.university)}</td><td>${esc(p.program)}</td><td>${esc(state.site?.countries?.find(c => c.slug === p.country_slug)?.name || p.country_slug)}</td><td><a href="${esc(p.official_url)}" target="_blank" rel="noopener noreferrer">Open catalogue ↗</a></td></tr>`).join('') || '<tr><td colspan="4">No programme examples are configured yet.</td></tr>';
  setText('#programCount', `${state.programs.length} catalogues`);
}
function renderScholarships() {
  $('#scholarshipList').innerHTML = state.scholarships.map(s => `<div class="scholarship-row"><span class="scholarship-symbol">✳</span><div><b>${esc(s.name)}</b><small>${esc(s.deadline_note)} · ${esc(s.overview)}</small></div><a href="${esc(s.official_url)}" target="_blank" rel="noopener noreferrer">Check ↗</a></div>`).join('') || '<div class="empty-state">No scholarship links configured yet.</div>';
  setText('#scholarshipCount', `${state.scholarships.length} starting points`);
}
function updateUserUI() {
  const u = state.user; const letter = u?.name?.trim()?.[0]?.toUpperCase() || 'G';
  document.body.classList.toggle('signed-in', Boolean(u));
  $('#profileButton').textContent = letter;
  if (u?.avatar_url) { const img = document.createElement('img'); img.src = u.avatar_url; img.alt = ''; img.onerror = () => { $('#profileButton').textContent = letter; }; $('#profileButton').replaceChildren(img); } $('#profileButton').setAttribute('aria-label', u ? `Account menu for ${u.name}` : 'Log in'); $('#profileButton').title = u ? 'Account menu' : 'Log in';
  // Signed in: the avatar is a menu button (WAI-ARIA APG) and "Sign out" lives inside the menu.
  if (u) { $('#profileButton').setAttribute('aria-haspopup', 'menu'); $('#profileButton').setAttribute('aria-controls', 'accountMenu'); $('#profileButton').setAttribute('aria-expanded', String(isAccountMenuOpen())); }
  else { ['aria-haspopup', 'aria-controls', 'aria-expanded'].forEach(a => $('#profileButton').removeAttribute(a)); closeAccountMenu(false); }
  $('#headerLogin').textContent = 'Log in'; $('#headerLogin').hidden = Boolean(u); $('#headerSignup').hidden = Boolean(u);
  $('#footerLogin').textContent = u ? 'Sign out' : 'Log in'; $('#footerSignup').hidden = Boolean(u); $('#footerAdmin').hidden = u?.role !== 'admin'; $('#refreshScholarships').hidden = u?.role !== 'admin';
  setText('#savedRoadmapCount', u ? `${state.roadmaps.length} saved` : 'Sign in to save');
  renderRoadmaps();
}
function renderRoadmaps() {
  if (!state.user) { $('#roadmapList').innerHTML = '<div class="empty-state">Sign in to create and save a private roadmap. Your plans are only available to your account.</div>'; return; }
  if (!state.roadmaps.length) { $('#roadmapList').innerHTML = '<div class="empty-state">No saved roadmaps yet. Create one above to get started.</div>'; return; }
  $('#roadmapList').innerHTML = state.roadmaps.map(r => `<article class="saved-roadmap"><h3>${esc(r.title)}</h3><p>${esc(state.site?.countries?.find(c => c.slug === r.country_slug)?.name || r.country_slug)} · ${esc(r.intake)} · ${r.tasks.filter(t => t.done).length}/${r.tasks.length} complete</p><div>${r.tasks.map((t, i) => `<label class="task-line ${t.done ? 'completed' : ''}"><input type="checkbox" data-roadmap-task="${r.id}" data-task-index="${i}" ${t.done ? 'checked' : ''}><span>${esc(t.title)}</span></label>`).join('')}</div><button type="button" class="delete-roadmap" data-delete-roadmap="${r.id}">Delete roadmap</button></article>`).join('');
  $('#roadmapList').querySelectorAll('[data-roadmap-task]').forEach(input => input.addEventListener('change', async () => {
    const roadmap = state.roadmaps.find(r => r.id === Number(input.dataset.roadmapTask)); if (!roadmap) return;
    roadmap.tasks[Number(input.dataset.taskIndex)].done = input.checked;
    try { await api(`/api/roadmaps/${roadmap.id}`, { method: 'PATCH', body: JSON.stringify({ tasks: roadmap.tasks }) }); renderRoadmaps(); }
    catch (e) { input.checked = !input.checked; toast(e.message); }
  }));
  $('#roadmapList').querySelectorAll('[data-delete-roadmap]').forEach(btn => btn.addEventListener('click', async () => {
    if (!confirm('Delete this roadmap? This cannot be undone.')) return;
    try { await api(`/api/roadmaps/${btn.dataset.deleteRoadmap}`, { method: 'DELETE' }); await loadRoadmaps(); toast('Roadmap deleted.'); }
    catch (e) { toast(e.message); }
  }));
}
async function loadRoadmaps() { if (!state.user) { state.roadmaps = []; renderRoadmaps(); return; } const d = await api('/api/roadmaps'); state.roadmaps = d.roadmaps; renderRoadmaps(); setText('#savedRoadmapCount', `${state.roadmaps.length} saved`); }
// The auth modal is a flip card: log in on the front, the student signup wizard (profile.js) on the back.
function openAuthModal() { $('#authModal').hidden = false; document.body.classList.add('drawer-open'); }
// Only one face is in the page at a time. The flip turns the card edge-on, swaps faces (and size) while it is
// invisible, then springs back — transform-only animations, so nothing is re-laid out or repainted per frame.
let authFlipping = false;
async function setAuthFace(face, animate = false) {
  const card = $('#authCard'); const toSignup = face === 'signup';
  const swap = () => {
    card.classList.toggle('is-signup', toSignup);
    $('#loginFace').hidden = toSignup; $('#signupFace').hidden = !toSignup;
    card.setAttribute('aria-labelledby', toSignup ? 'signupTitle' : 'authTitle');
  };
  if (!animate || card.classList.contains('is-signup') === toSignup || matchMedia('(prefers-reduced-motion: reduce)').matches) { swap(); return; }
  authFlipping = true;
  const turn = deg => `perspective(1600px) rotateY(${deg}deg)`; const dir = toSignup ? 1 : -1;
  try {
    await card.animate([{ transform: turn(0) }, { transform: turn(90 * dir) }], { duration: 170, easing: 'cubic-bezier(.55,0,.85,.35)' }).finished;
    swap();
    await card.animate([{ transform: turn(-90 * dir) }, { transform: turn(0) }], { duration: 340, easing: 'cubic-bezier(.34,1.4,.64,1)' }).finished;
  } finally { authFlipping = false; }
}
function togglePasswordVisibility(button) {
  const input = button.parentElement.querySelector('input'); const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  button.setAttribute('aria-pressed', String(show)); button.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
}
async function showAuth(mode = 'login') {
  // Account creation is the multi-step student signup in profile.js, on the back of the card.
  if (mode === 'signup') { openSignup(); return; }
  const wasOpen = !$('#authModal').hidden;
  state.authMode = mode; openAuthModal(); $('#authMessage').textContent = '';
  const email = $('#authForm [name=email]'), password = $('#authForm [name=password]');
  email.required = mode !== 'reset'; email.closest('.nm-field').hidden = mode === 'reset';
  password.required = mode !== 'forgot'; password.closest('.nm-field').hidden = mode === 'forgot';
  password.autocomplete = mode === 'reset' ? 'new-password' : 'current-password';
  password._meter.el.hidden = mode !== 'reset'; password._meter.update();
  $('.auth-extra').hidden = mode !== 'login';
  $('#authSwitch').hidden = mode !== 'login'; $('#authBackToLogin').hidden = mode !== 'forgot';
  $('#authTitle').textContent = ({ login: 'Welcome back.', forgot: 'Reset your password.', reset: 'Choose a new password.' })[mode] || 'Welcome back.';
  $('#authSubtitle').textContent = ({ login: 'Sign in to access your saved roadmap and practice progress.', forgot: 'We will provide a reset link if the account exists.', reset: 'Choose a strong password you have not used elsewhere.' })[mode] || '';
  $('#authSubmit').textContent = ({ login: 'Log in', forgot: 'Send reset link', reset: 'Update password' })[mode] || 'Continue';
  await setAuthFace('login', wasOpen);
  (mode === 'forgot' ? email : mode === 'reset' || email.value ? password : email).focus({ preventScroll: true });
}
function closeAuth() {
  const modal = $('#authModal'); if (modal.hidden) return;
  modal.hidden = true; document.body.classList.remove('drawer-open');
}
// Messages inside the card instead of browser bubbles. tone: bad | warn | info | ok. action: { mode, label } opens that card mode.
const ALERT_ICONS = {
  bad: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3 20 3M16.5 6.5l3 3M13.8 9.2l2 2"/>',
  warn: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  ok: '<path d="m5 12 5 5 9-10"/>'
};
function authAlert(tone, title, text, { action, html = '' } = {}) {
  $('#authMessage').innerHTML = `<div class="auth-alert auth-alert-${tone}" role="${tone === 'ok' ? 'status' : 'alert'}"><span class="auth-alert-icon">${strokeIcon(ALERT_ICONS[tone])}</span><div><b>${esc(title)}</b><span>${esc(text)}</span>${html}${action ? `<button type="button" class="text-link" data-auth-action="${action.mode}">${esc(action.label)} →</button>` : ''}</div></div>`;
}
const nudge = el => { if (!matchMedia('(prefers-reduced-motion: reduce)').matches) el.animate([0, -7, 7, -4, 4, 0].map(x => ({ transform: `translateX(${x}px)` })), { duration: 380, easing: 'ease-out' }); };
// Checks before sending, so the student sees a friendly line instead of the browser's validation bubble.
function authFormProblem(mode, email, password) {
  if (mode !== 'reset' && !email.value.trim()) return [email, 'info', 'Who’s travelling today?', 'Enter the email address you signed up with.'];
  if (mode !== 'reset' && !email.checkValidity()) return [email, 'info', 'That email looks incomplete', 'It should look like name@example.com.'];
  if (mode === 'login' && !password.value) return [password, 'info', 'Don’t forget your key', 'Enter your password to continue.'];
  if (mode === 'reset') { const r = PothikPassword.assess(password.value); if (!r.ok) return [password, 'warn', 'Not quite strong enough yet', r.message]; }
  return null;
}
function loginFailed(err) {
  const caps = state.capsOn ? ' Caps Lock is on — that may be it.' : '';
  if (!err.status) return authAlert('warn', 'Pothik is out of reach', 'Check your internet connection, then try again.');
  if (err.status === 429) return authAlert('warn', 'Let’s take a short breather', 'Too many sign-in attempts. For your safety, try again in 15 minutes — or reset your password now.', { action: { mode: 'forgot', label: 'Reset my password' } });
  if (err.status === 403) return authAlert('info', 'One last step', err.message);
  if (err.status !== 401) return authAlert('bad', 'Something went wrong', err.message);
  // Never says which of the two was wrong: that would tell an attacker which emails have accounts.
  const n = state.loginFailures = (state.loginFailures || 0) + 1;
  nudge($('#authPassword').closest('.nm-field'));
  if (n === 1) return authAlert('bad', 'That key didn’t turn the lock', `The email or password doesn’t match our records. Passwords are case-sensitive.${caps}`);
  if (n === 2) return authAlert('bad', 'Still not the right key', `Tap the eye to see what you typed, and check the email for typos.${caps}`);
  authAlert('bad', 'Lost your key?', 'It happens to every traveller. We’ll email you a fresh one — it takes a minute.', { action: { mode: 'forgot', label: 'Reset my password' } });
}
async function submitAuth(e) {
  e.preventDefault(); const form = e.currentTarget; const fd = new FormData(form); const button = $('#authSubmit'); $('#authMessage').textContent = '';
  const mode = state.authMode; const problem = authFormProblem(mode, form.email, form.password);
  if (problem) { const [field, ...alert] = problem; authAlert(...alert); nudge(field.closest('.nm-field')); field.focus(); return; }
  button.disabled = true;
  try {
    if (mode === 'forgot') {
      const data = await api('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: fd.get('email') }) });
      authAlert('ok', 'Check your inbox', data.message, { html: data.developmentResetUrl ? `<a class="text-link" href="${esc(data.developmentResetUrl)}">Open development reset link ↗</a>` : '' });
      return;
    }
    if (mode === 'reset') {
      const token = new URLSearchParams(location.search).get('reset') || '';
      const data = await api('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password: fd.get('password') }) });
      history.replaceState({}, '', location.pathname); form.password.value = ''; await showAuth('login');
      authAlert('ok', 'New key, same journey', data.message); return;
    }
    const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: fd.get('email'), password: fd.get('password') }) });
    if (data.verificationRequired) {
      authAlert('info', 'One last step', data.message, { html: data.developmentVerificationUrl ? `<a class="text-link" href="${esc(data.developmentVerificationUrl)}">Verify this development account ↗</a>` : '' });
      return;
    }
    state.user = data.user; state.loginFailures = 0; updateUserUI(); form.reset(); closeAuth(); loadRoadmaps().catch(() => {}); greetUser(state.user, 'login');
    if (state.openProfileAfterLogin) { state.openProfileAfterLogin = false; openProfile(); }
  } catch (err) {
    if (mode === 'login') loginFailed(err);
    else authAlert(err.status === 429 ? 'warn' : 'bad', err.status === 429 ? 'Let’s take a short breather' : 'That didn’t work', err.message);
  } finally { button.disabled = false; }
}
async function toggleLogin() {
  if (!state.user) { showAuth('login'); return; }
  const leaving = state.user;
  try { await api('/api/auth/logout', { method: 'POST', body: '{}' }); state.user = null; state.roadmaps = []; state.profileCompleteness = undefined; updateUserUI(); greetUser(leaving, 'logout'); }
  catch (e) { toast(e.message); }
}
function appendChat(role, text, sources = [], loading = false) {
  const wrap = document.createElement('div'); wrap.className = `chat-message ${role === 'user' ? 'user' : 'assistant'}`;
  if (role !== 'user') { const av = document.createElement('span'); av.className = 'chat-avatar'; av.innerHTML = '<img src="/assets/brand/pothik-mark.png" alt="" width="28" height="28">'; wrap.appendChild(av); }
  const content = document.createElement('div'); content.className = 'message-content';
  if (role !== 'user' && !loading) renderRichText(content, text);
  else { const p = document.createElement('p'); p.textContent = text; if (loading) p.classList.add('loading-text'); content.appendChild(p); }
  if (!loading && role !== 'user') { const small = document.createElement('small'); small.textContent = 'Guidance only. Verify important requirements with official sources.'; content.appendChild(small); }
  if (sources?.length) {
    const links = document.createElement('div'); links.className = 'source-links';
    sources.forEach(source => { if (!/^https?:\/\//i.test(source.url || '')) return; const a = document.createElement('a'); a.href = source.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = `${source.title || source.source || 'Source'} ↗`; a.title = `${source.source || ''}${source.verified_at ? ' · ' + source.verified_at : ''}`; links.appendChild(a); });
    if (links.childElementCount) content.appendChild(links);
  }
  wrap.appendChild(content); $('#chatMessages').appendChild(wrap); $('#chatMessages').scrollTop = $('#chatMessages').scrollHeight; return wrap;
}
// Renders the small markdown subset the counsellor uses (**bold**, "-" and "1." lists) with DOM nodes only, never innerHTML.
function appendInline(el, text) {
  String(text).split(/\*\*(.+?)\*\*/g).forEach((part, i) => { if (!part) return; if (i % 2) { const b = document.createElement('strong'); b.textContent = part; el.appendChild(b); } else el.appendChild(document.createTextNode(part.replace(/^#{1,6}\s+/, ''))); });
}
function renderRichText(container, text) {
  let list = null, para = null;
  String(text || '').split('\n').forEach(line => {
    const item = line.match(/^\s*([-*•]|\d+[.)])\s+(.*)$/);
    if (item) {
      const tag = /\d/.test(item[1]) ? 'OL' : 'UL';
      if (!list || list.tagName !== tag) { list = document.createElement(tag.toLowerCase()); container.appendChild(list); }
      const li = document.createElement('li'); appendInline(li, item[2]); list.appendChild(li); para = null; return;
    }
    list = null;
    if (!line.trim()) { para = null; return; }
    if (para) para.appendChild(document.createTextNode('\n')); else { para = document.createElement('p'); container.appendChild(para); }
    appendInline(para, line);
  });
}
function renderChatPrompts() {
  const prompts = state.site?.assistant?.prompts || [];
  $('#chatPrompts').innerHTML = prompts.map(p => `<button type="button" data-chat-prompt="${esc(p)}">${esc(p)}</button>`).join('');
  $('#chatPrompts').querySelectorAll('[data-chat-prompt]').forEach(btn => btn.addEventListener('click', () => { $('#tutorForm [name=question]').value = btn.dataset.chatPrompt; $('#tutorForm').requestSubmit(); }));
}
function openCounsellor() { $('#counsellorDrawer').classList.add('open'); $('#counsellorDrawer').setAttribute('aria-hidden', 'false'); document.body.classList.add('drawer-open'); $('#counsellorNudge').hidden = true; setTimeout(() => $('#tutorForm [name=question]').focus(), 100); }
function closeCounsellor() { $('#counsellorDrawer').classList.remove('open'); $('#counsellorDrawer').setAttribute('aria-hidden', 'true'); document.body.classList.remove('drawer-open'); }
async function submitTutor(e) {
  e.preventDefault(); if (state.chatBusy) return;
  const form = e.currentTarget; const question = form.question.value.trim(); if (!question) return;
  appendChat('user', question); form.question.value = ''; const wait = appendChat('assistant', 'Looking for relevant guidance and sources…', [], true);
  state.chatBusy = true; const send = form.querySelector('button[type=submit]'); send.disabled = true;
  try {
    const history = state.chatHistory.slice(-10);
    const data = await api('/api/tutor', { method: 'POST', body: JSON.stringify({ question, mode: form.mode.value, language: state.user?.preferred_language === 'bn' ? 'bn' : 'en', history }) });
    wait.remove(); appendChat('assistant', data.answer, data.sources);
    if (data.generated) state.chatHistory.push({ role: 'user', content: question.slice(0, 4000) }, { role: 'assistant', content: String(data.answer).slice(0, 4000) });
  }
  catch (err) { wait.remove(); appendChat('assistant', err.message); }
  finally { state.chatBusy = false; send.disabled = false; }
}
// ---------- Account menu (avatar dropdown), following the WAI-ARIA menu button pattern ----------
const menuIcon = d => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ACCOUNT_ITEMS = [
  { id: 'profile', label: 'My profile & student card', icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>', run: () => openProfile() },
  { id: 'chances', label: 'Admission chances', icon: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', run: () => openProfile('chances') },
  { id: 'documents', label: 'Upload transcripts', icon: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>', run: () => openProfile('documents') },
  { id: 'goals', label: 'Study goals', icon: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>', run: () => openProfile('goals') },
  { id: 'academic', label: 'Academic background', icon: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h7"/>', run: () => openProfile('academic') },
  { id: 'tests', label: 'Test scores', icon: '<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>', run: () => openProfile('tests') },
  { id: 'roadmap', label: 'My roadmaps', icon: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>', run: () => { location.hash = '#roadmap'; $('#roadmap')?.scrollIntoView({ behavior: 'smooth' }); } },
  { id: 'counsellor', label: 'Ask the AI Counsellor', icon: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 10h8M8 13h5"/>', run: () => openCounsellor() },
  { id: 'security', label: 'Password & security', icon: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>', run: () => openProfile('security') },
  { id: 'admin', label: 'Admin workspace', icon: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>', adminOnly: true, run: () => openAdmin() },
  { id: 'signout', label: 'Sign out', icon: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11"/>', danger: true, run: () => toggleLogin() }
];
const isAccountMenuOpen = () => Boolean($('#accountMenu') && !$('#accountMenu').hidden);
function accountMenuItems() { return $$('#accountMenu [role=menuitem]'); }
function ensureAccountMenu() {
  if ($('#accountMenu')) return;
  const wrap = document.createElement('div'); wrap.className = 'account-wrap';
  const button = $('#profileButton'); button.replaceWith(wrap); wrap.append(button);
  wrap.insertAdjacentHTML('beforeend', '<div class="account-menu" id="accountMenu" role="menu" aria-labelledby="profileButton" hidden></div>');
  const menu = $('#accountMenu');
  menu.addEventListener('click', e => { const item = e.target.closest('[role=menuitem]'); if (!item) return; const action = ACCOUNT_ITEMS.find(i => i.id === item.dataset.action); closeAccountMenu(false); action.run(); });
  menu.addEventListener('keydown', e => {
    const items = accountMenuItems(); const i = items.indexOf(document.activeElement);
    const go = n => { e.preventDefault(); items[(n + items.length) % items.length].focus(); };
    if (e.key === 'ArrowDown') go(i + 1); else if (e.key === 'ArrowUp') go(i - 1);
    else if (e.key === 'Home') go(0); else if (e.key === 'End') go(items.length - 1);
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeAccountMenu(true); }
    else if (e.key === 'Tab') closeAccountMenu(false);
    else if (e.key.length === 1 && /\S/.test(e.key)) {
      // Type-ahead: jump to the next item starting with that letter.
      const order = [...items.slice(i + 1), ...items.slice(0, i + 1)];
      const hit = order.find(el => el.textContent.trim().toLowerCase().startsWith(e.key.toLowerCase())); if (hit) { e.preventDefault(); hit.focus(); }
    }
  });
  document.addEventListener('pointerdown', e => { if (isAccountMenuOpen() && !e.target.closest('.account-wrap')) closeAccountMenu(false); });
}
function renderAccountMenu() {
  const u = state.user; const letter = esc(u.name.trim()[0]?.toUpperCase() || 'P');
  const pct = state.profileCompleteness;
  $('#accountMenu').innerHTML = `<div class="account-head" role="none"><span class="account-avatar">${u.avatar_url ? `<img src="${esc(u.avatar_url)}" alt="">` : letter}</span><span class="account-who"><b>${esc(u.name)}</b><small>${esc(u.email)}</small></span></div>
    ${pct === undefined ? '' : `<button type="button" role="menuitem" tabindex="-1" class="account-progress" data-action="profile"><div><span>${pct >= 100 ? 'Profile complete' : `Profile ${pct}% complete`}</span>${pct < 100 ? '<span>Finish it →</span>' : ''}</div><div class="pf-progress-bar"><span style="width:${pct}%"></span></div></button>`}
    <div class="account-sep" role="separator"></div>
    ${ACCOUNT_ITEMS.filter(i => !i.adminOnly || u.role === 'admin').map(i => `${i.id === 'signout' ? '<div class="account-sep" role="separator"></div>' : ''}<button type="button" role="menuitem" tabindex="-1" class="account-item${i.danger ? ' danger' : ''}" data-action="${i.id}">${menuIcon(i.icon)}<span>${esc(i.label)}</span></button>`).join('')}`;
}
function openAccountMenu(focus = 'first') {
  if (!state.user) return;
  ensureAccountMenu(); renderAccountMenu();
  $('#accountMenu').hidden = false; $('#profileButton').setAttribute('aria-expanded', 'true');
  const items = accountMenuItems(); (focus === 'last' ? items.at(-1) : items[0])?.focus();
  // Refresh the completion figure in the background; re-render only if it changed.
  api('/api/profile').then(d => { if (d.completeness?.percent !== state.profileCompleteness) { state.profileCompleteness = d.completeness.percent; if (isAccountMenuOpen()) { const active = document.activeElement?.dataset?.action; renderAccountMenu(); $(`#accountMenu [data-action="${active}"]`)?.focus(); } } }).catch(() => {});
}
function closeAccountMenu(returnFocus = true) {
  if (!$('#accountMenu')) return;
  $('#accountMenu').hidden = true; $('#profileButton')?.setAttribute('aria-expanded', 'false');
  if (returnFocus) $('#profileButton')?.focus();
}
async function openAdmin() {
  if (state.user?.role !== 'admin') return showAuth('login');
  try { state.adminContent = await api('/api/admin/site-content'); $('#contentJson').value = JSON.stringify(state.adminContent, null, 2); $('#adminPanel').hidden = false; }
  catch (e) { toast(e.message); }
}
function assignImage(target, url) {
  const c = state.adminContent; if (!c) return;
  if (target === 'hero') c.hero.image = url;
  else if (target === 'brand.logo') c.brand.logo = url;
  else { const [type, slug] = target.split('.'); const list = type === 'countries' ? c.countries : c.ielts; const row = list.find(x => x.slug === slug); if (row) row.image = url; }
  $('#contentJson').value = JSON.stringify(c, null, 2);
}
function bindEvents() {
  $('#mobileMenu').addEventListener('click', () => { const nav = $('#mainNav'); nav.classList.toggle('open'); $('#mobileMenu').setAttribute('aria-expanded', String(nav.classList.contains('open'))); });
  $('#mainNav').querySelectorAll('a').forEach(a => a.addEventListener('click', () => { $('#mainNav').classList.remove('open'); $('#mobileMenu').setAttribute('aria-expanded', 'false'); }));
  $('#countryRoadmap').addEventListener('click', () => { $('#roadCountry').value = state.selectedCountry; $('#roadmap').scrollIntoView({ behavior: 'smooth' }); $('#roadmapForm [name=title]').focus({ preventScroll: true }); });
  $('#openIeltsPractice').addEventListener('click', () => openPractice('All'));
  $('#closePractice').addEventListener('click', () => { $('#practicePanel').hidden = true; });
  $('#skillTabs').querySelectorAll('[data-skill]').forEach(b => b.addEventListener('click', () => { state.skill = b.dataset.skill; $('#skillTabs').querySelectorAll('[data-skill]').forEach(x => x.classList.toggle('active', x === b)); renderExercises(); }));
  $('#roadmapForm').addEventListener('submit', async e => {
    e.preventDefault(); if (!state.user) { showAuth('signup'); $('#authMessage').textContent = 'Create an account or sign in to save your roadmap privately.'; return; }
    const fd = new FormData(e.currentTarget); const payload = Object.fromEntries(fd.entries()); const msg = $('#roadmapFormMessage'); msg.textContent = '';
    try { await api('/api/roadmaps', { method: 'POST', body: JSON.stringify(payload) }); await loadRoadmaps(); msg.textContent = 'Roadmap created. Your checklist is ready below.'; e.currentTarget.reset(); toast('Roadmap saved to your account.'); }
    catch (err) { msg.textContent = err.message; }
  });
  $('#resourceSearch').addEventListener('input', renderResources); $('#resourceCategory').addEventListener('change', renderResources);
  $('#ieltsResourceSearch').addEventListener('input', renderIeltsResources); $('#ieltsResourceType').addEventListener('change', renderIeltsResources);
  $('#opportunitySearch').addEventListener('input', renderOpportunities); $('#opportunityCountry').addEventListener('change', renderOpportunities); $('#opportunityStatus').addEventListener('change', renderOpportunities);
  $('#refreshScholarships').addEventListener('click', async () => { const btn = $('#refreshScholarships'); btn.disabled = true; btn.textContent = 'Checking official sources…'; try { const d = await api('/api/admin/opportunities/refresh', { method:'POST', body:'{}' }); toast(`Checked ${d.report.checked} sources; added ${d.report.candidates} review candidates.`); const fresh = await api('/api/opportunities'); state.opportunities = fresh.opportunities; renderOpportunities(); } catch(e) { toast(e.message); } finally { btn.disabled = false; btn.textContent = 'Refresh official sources ↻'; } });
  $('#reportForm').addEventListener('submit', async e => { e.preventDefault(); const fd = new FormData(e.currentTarget); const msg = $('#reportMessage'); msg.textContent = ''; try { const data = await api('/api/reports', { method: 'POST', body: JSON.stringify(Object.fromEntries(fd.entries())) }); msg.textContent = `${data.message} Reference: ${data.reference}`; e.currentTarget.reset(); } catch (err) { msg.textContent = err.message; } });
  $('#headerLogin').addEventListener('click', toggleLogin); $('#footerLogin').addEventListener('click', toggleLogin);
  $('#headerSignup').addEventListener('click', () => showAuth('signup')); $('#footerSignup').addEventListener('click', () => showAuth('signup'));
  $('#profileButton').addEventListener('click', () => { if (!state.user) return showAuth('login'); isAccountMenuOpen() ? closeAccountMenu() : openAccountMenu('first'); });
  $('#profileButton').addEventListener('keydown', e => {
    if (!state.user || !['ArrowDown', 'ArrowUp'].includes(e.key)) return;
    e.preventDefault(); openAccountMenu(e.key === 'ArrowUp' ? 'last' : 'first');
  });
  // One listener for both faces of the card: close, flip and show/hide password.
  $('#authModal').addEventListener('click', e => {
    if (e.target.id === 'authModal' || e.target.closest('[data-close-auth]')) { closeAuth(); return; }
    const flip = e.target.closest('[data-flip]'); if (flip) { if (!authFlipping) showAuth(flip.dataset.flip); return; }
    const action = e.target.closest('[data-auth-action]'); if (action) { showAuth(action.dataset.authAction); return; }
    const eye = e.target.closest('[data-toggle-password]'); if (eye) togglePasswordVisibility(eye);
  });
  attachPasswordMeter($('#authPassword')); // shown only when choosing a new password (reset mode)
  ['keydown', 'keyup', 'focusout'].forEach(type => document.addEventListener(type, checkCapsLock, true));
  $('#authForm').addEventListener('submit', submitAuth); $('#forgotPassword').addEventListener('click', () => showAuth('forgot'));
  $('#counsellorLauncher').addEventListener('click', () => $('#counsellorDrawer').classList.contains('open') ? closeCounsellor() : openCounsellor());
  $('#openCounsellor').addEventListener('click', openCounsellor); $('#closeCounsellor').addEventListener('click', closeCounsellor);
  $('#closeNudge').addEventListener('click', () => { $('#counsellorNudge').hidden = true; });
  $('#tutorForm').addEventListener('submit', submitTutor);
  // Enter sends, Shift+Enter adds a new line. Skip while an IME (e.g. Bangla phonetic input) is composing a word.
  $('#tutorForm [name=question]').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); $('#tutorForm').requestSubmit(); } });
  $('#clearChat').addEventListener('click', () => { $('#chatMessages').innerHTML = ''; state.chatHistory = []; appendChat('assistant', 'Conversation cleared. What would you like to work on next?'); });
  $('#footerAdmin').addEventListener('click', openAdmin); $('#closeAdmin').addEventListener('click', () => { $('#adminPanel').hidden = true; });
  $('#assetUploadForm').addEventListener('submit', async e => { e.preventDefault(); const message = $('#assetMessage'); message.textContent = ''; const fd = new FormData(e.currentTarget); try { const result = await api('/api/admin/assets', { method: 'POST', body: fd }); assignImage($('#assetTarget').value, result.url); message.textContent = `Uploaded ${result.name} and assigned ${result.url}. Save the configuration to publish the change.`; } catch (err) { message.textContent = err.message; } });
  $('#contentForm').addEventListener('submit', async e => { e.preventDefault(); const message = $('#contentMessage'); try { const parsed = JSON.parse($('#contentJson').value); const result = await api('/api/admin/site-content', { method: 'PUT', body: JSON.stringify(parsed) }); state.adminContent = parsed; state.site = parsed; applyBrand(); renderCountryTabs(); renderIeltsCards(); message.textContent = result.message; toast('Site configuration saved.'); } catch (err) { message.textContent = err instanceof SyntaxError ? 'Invalid JSON. Check commas, quotes and brackets.' : err.message; } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeCounsellor(); closeAuth(); $('#adminPanel').hidden = true; } });
}
async function init() {
  setText('#yearNow', new Date().getFullYear()); bindEvents();
  const query = new URLSearchParams(location.search);
  if (query.has('verified')) { history.replaceState({}, '', location.pathname); toast('Email verified. Your account is ready.'); }
  if (query.has('reset')) showAuth('reset');
  const endpoints = [
    ['site', () => api('/api/site-content').catch(() => api('/site-content.json')), null],
    ['dashboard', () => api('/api/dashboard'), { countries: [] }],
    ['resources', () => api('/api/resources'), { resources: [] }],
    ['programs', () => api('/api/programs'), { programs: [] }],
    ['scholarships', () => api('/api/scholarships'), { scholarships: [] }],
    ['exercises', () => api('/api/ielts'), { exercises: [] }],
    ['me', () => api('/api/me'), { user: null }],
    ['ieltsResources', () => api('/api/ielts/resources'), { resources: [] }],
    ['opportunities', () => api('/api/opportunities'), { opportunities: [] }]
  ];
  const results = await Promise.allSettled(endpoints.map(([, load]) => load()));
  const failed = [];
  const values = results.map((result, index) => {
    if (result.status === 'fulfilled') return result.value;
    failed.push(endpoints[index][0]);
    console.error('[Pothik boot] Section unavailable', { section: endpoints[index][0], message: result.reason.message });
    return endpoints[index][2];
  });
  const [site, dashboard, resources, programs, scholarships, exercises, me, ieltsResources, opportunities] = values;
  state.site = site; state.countries = dashboard.countries; state.resources = resources.resources; state.programs = programs.programs; state.scholarships = scholarships.scholarships; state.exercises = exercises.exercises; state.ieltsResources = ieltsResources.resources; state.opportunities = opportunities.opportunities; state.user = me.user;
  applyBrand(); renderCountryTabs(); renderIeltsCards(); renderExercises(); renderIeltsResources(); renderOpportunities(); renderResources(); renderPrograms(); renderScholarships(); updateUserUI();
  try { await loadRoadmaps(); }
  catch (error) {
    failed.push('roadmaps');
    console.error('[Pothik boot] Section unavailable', { section: 'roadmaps', message: error.message });
  }
  if (state.user?.role === 'admin') $('#footerAdmin').hidden = false;
  // The student-card QR code links to /?open=profile.
  if (query.get('open') === 'profile') {
    history.replaceState({}, '', location.pathname);
    if (state.user) openProfile(); else { state.openProfileAfterLogin = true; showAuth('login'); }
  }
  if (failed.length) toast(`Some content could not load: ${failed.join(', ')}. See the browser console for details.`);
}
init();
