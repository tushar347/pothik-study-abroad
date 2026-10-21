const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const state = { user: null, site: null, countries: [], resources: [], ieltsResources: [], programs: [], scholarships: [], opportunities: [], exercises: [], roadmaps: [], selectedCountry: 'germany', skill: 'All', authMode: 'login', chatBusy: false, chatHistory: [], adminContent: null };
const esc = (v = '') => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function toast(message) { const t = $('#toast'); t.textContent = message; t.classList.add('show'); clearTimeout(window._toastTimer); window._toastTimer = setTimeout(() => t.classList.remove('show'), 3500); }
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
  $('#countryTabs').innerHTML = countries.map((c, i) => `<button type="button" class="country-tab ${c.slug === state.selectedCountry ? 'active' : ''}" role="tab" aria-selected="${c.slug === state.selectedCountry}" data-country-tab="${esc(c.slug)}"><span class="flag">${esc(c.flag || '')}</span>${esc(c.name)}</button>`).join('');
  $('#countryTabs').querySelectorAll('[data-country-tab]').forEach(btn => btn.addEventListener('click', () => selectCountry(btn.dataset.countryTab)));
  $('#countryMiniGrid').innerHTML = countries.map((c, i) => `<button type="button" class="country-mini ${c.slug === state.selectedCountry ? 'active' : ''}" data-country-mini="${esc(c.slug)}" aria-label="Explore ${esc(c.name)}"><img src="${esc(c.image)}" alt="${esc(c.imageAlt || c.name)}" loading="lazy"><span class="country-mini-meta"><span class="flag">${esc(c.flag || '')}</span><b>${esc(c.name)}</b></span></button>`).join('');
  $('#countryMiniGrid').querySelectorAll('[data-country-mini]').forEach(btn => btn.addEventListener('click', () => selectCountry(btn.dataset.countryMini)));
  const select = $('#roadCountry'); if (select) select.innerHTML = countries.map(c => `<option value="${esc(c.slug)}">${esc(c.name)}</option>`).join('');
  renderSelectedCountry();
}
function selectCountry(slug) { if (!state.site?.countries?.some(c => c.slug === slug)) return; state.selectedCountry = slug; renderCountryTabs(); }
function renderSelectedCountry() {
  const c = currentCountry(); if (!c) return;
  const idx = state.site.countries.findIndex(x => x.slug === c.slug) + 1;
  $('#countryFeatureImage').src = c.image; $('#countryFeatureImage').alt = c.imageAlt || `${c.name} study destination`;
  setText('#countryFeatureFlag', c.flag); setText('#countryFeatureName', c.name); setText('#countryTitle', `Study in ${c.name}`);
  setText('#countryKicker', `${c.name.toUpperCase()} · DESTINATION GUIDE`); setText('#countrySummary', c.summary);
  setText('#countryTuition', c.tuition || 'Varies by programme and institution'); setText('#countryLanguage', c.language || 'Check programme language requirements');
  setText('#countryLiving', c.living || 'Check current official cost and visa guidance.');
  setText('#countryImageIndex', `${String(idx).padStart(2, '0')} / ${String(state.site.countries.length).padStart(2, '0')}`);
  const official = $('#countryOfficial'); official.href = c.officialUrl || '#'; official.textContent = `Official ${c.name} study portal ↗`;
  $('#countryTabs').querySelectorAll('[data-country-tab]').forEach(b => { const active = b.dataset.countryTab === c.slug; b.classList.toggle('active', active); b.setAttribute('aria-selected', String(active)); });
  $('#countryMiniGrid').querySelectorAll('[data-country-mini]').forEach(b => b.classList.toggle('active', b.dataset.countryMini === c.slug));
  setText('#heroCountryFlag', c.flag); setText('#heroPhotoTitle', `Explore ${c.name}`); setText('#heroPhotoSub', 'Your next chapter starts here');
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
    const speaking = x.type === 'Speaking' ? `<label class="writing-response-label">Practice notes or speech transcript<textarea class="writing-response" data-speaking-response="${esc(x.id)}" rows="4" placeholder="Use this space for brief notes or a transcript if you use speech recognition."></textarea></label><div class="speaking-actions"><button type="button" class="button button-outline" data-record-speech="${esc(x.id)}">● Start speech capture</button><button type="button" class="button button-outline" data-practice-tutor="Speaking">Practise with counsellor →</button></div><details class="self-review"><summary>Speaking self-review checklist</summary><p>${esc(x.explanation || 'Review fluency, coherence, vocabulary, grammar and pronunciation.')}</p></details>` : '';
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
    return `<article class="opportunity-card"><div class="opportunity-card-top"><span class="opportunity-country">${esc(c?.flag || '')} ${esc(o.country_name)}</span><span class="opportunity-status status-${esc(o.status)}">${esc(labels[o.status] || o.status)}</span></div><div class="opportunity-provider">${esc(o.provider)}</div><h3>${esc(o.title)}</h3><p>${esc(o.summary)}</p><div class="opportunity-deadline"><span>Deadline / status</span><b>${esc(date || o.deadline_label || 'Check official source')}</b></div>${o.review_required ? '<div class="review-warning">Automatically discovered link — review required before publication.</div>' : ''}<div class="opportunity-card-foot"><small>${o.source_checked_at ? `Source checked ${esc(new Date(o.source_checked_at).toLocaleDateString('en-GB'))}` : 'Current call must be verified'}</small><a href="${esc(o.official_url)}" target="_blank" rel="noopener noreferrer">Official details ↗</a></div></article>`;
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
  if (u?.avatar_url) { const img = document.createElement('img'); img.src = u.avatar_url; img.alt = ''; img.onerror = () => { $('#profileButton').textContent = letter; }; $('#profileButton').replaceChildren(img); } $('#profileButton').setAttribute('aria-label', u ? 'Open my profile' : 'Log in'); $('#profileButton').title = u ? 'My profile' : 'Log in'; $('#headerLogin').textContent = u ? 'Sign out' : 'Log in'; $('#headerSignup').hidden = Boolean(u);
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
function showAuth(mode = 'login') {
  // Account creation is the multi-step student signup in profile.js.
  if (mode === 'signup') { closeAuth(); openSignup(); return; }
  state.authMode = mode; $('#authModal').hidden = false; $('#authMessage').textContent = '';
  $('#authTabs').hidden = !['login', 'signup'].includes(mode); $('#authNameField').hidden = mode !== 'signup'; $('#authNameField input').required = mode === 'signup';
  $('#authForm [name=email]').required = mode !== 'reset';
  $('#authForm [name=email]').closest('label').hidden = mode === 'reset';
  $('#authForm [name=password]').closest('label').hidden = mode === 'forgot';
  $('#authForm [name=password]').required = mode !== 'forgot';
  $('#authExtra');
  $('.auth-extra').hidden = !['login', 'signup'].includes(mode);
  $('#authTitle').textContent = ({ login: 'Welcome back.', signup: 'Create your account.', forgot: 'Reset your password.', reset: 'Choose a new password.' })[mode] || 'Welcome back.';
  $('#authSubtitle').textContent = ({ login: 'Sign in to access your saved roadmap and practice progress.', signup: 'Create a private workspace for your study-abroad plan.', forgot: 'We will provide a reset link if the account exists.', reset: 'Choose a strong password you have not used elsewhere.' })[mode] || '';
  $('#authSubmit').innerHTML = ({ login: 'Log in ↗', signup: 'Create account ↗', forgot: 'Send reset link ↗', reset: 'Update password ↗' })[mode] || 'Continue';
  $('#forgotPassword').hidden = mode !== 'login';
  $('#authForm [name=password]').autocomplete = mode === 'signup' || mode === 'reset' ? 'new-password' : 'current-password';
  if (mode === 'reset') $('#authForm [name=password]').placeholder = 'At least 12 characters';
  else $('#authForm [name=password]').placeholder = 'At least 12 characters';
  const focusName = mode === 'signup' ? 'name' : mode === 'forgot' ? 'email' : 'password';
  $(`#authForm [name="${focusName}"]`)?.focus();
}
function closeAuth() { $('#authModal').hidden = true; }
async function submitAuth(e) {
  e.preventDefault(); const form = e.currentTarget; const fd = new FormData(form); const button = $('#authSubmit'); button.disabled = true; $('#authMessage').textContent = '';
  try {
    if (state.authMode === 'forgot') {
      const data = await api('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: fd.get('email') }) });
      $('#authMessage').textContent = data.message + (data.developmentResetUrl ? `\nDevelopment reset link: ${data.developmentResetUrl}` : '');
      if (data.developmentResetUrl) $('#authMessage').innerHTML = `${esc(data.message)}<br><a class="text-link" href="${esc(data.developmentResetUrl)}">Open development reset link ↗</a>`;
      return;
    }
    if (state.authMode === 'reset') {
      const token = new URLSearchParams(location.search).get('reset') || '';
      const data = await api('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password: fd.get('password') }) });
      history.replaceState({}, '', location.pathname); state.authMode = 'login'; showAuth('login'); $('#authMessage').textContent = data.message; return;
    }
    const payload = { email: fd.get('email'), password: fd.get('password') };
    if (state.authMode === 'signup') payload.name = fd.get('name');
    const data = await api(`/api/auth/${state.authMode === 'signup' ? 'signup' : 'login'}`, { method: 'POST', body: JSON.stringify(payload) });
    if (data.verificationRequired) {
      $('#authMessage').textContent = data.message;
      if (data.developmentVerificationUrl) $('#authMessage').innerHTML = `${esc(data.message)}<br><a class="text-link" href="${esc(data.developmentVerificationUrl)}">Verify this development account ↗</a>`;
      return;
    }
    state.user = data.user; await loadRoadmaps(); updateUserUI(); closeAuth(); toast(`Welcome back${state.user.name ? ', ' + state.user.name.split(' ')[0] : ''}. Open your profile from the avatar at the top.`);
  } catch (err) { $('#authMessage').textContent = err.message; }
  finally { button.disabled = false; }
}
async function toggleLogin() {
  if (!state.user) { showAuth('login'); return; }
  try { await api('/api/auth/logout', { method: 'POST', body: '{}' }); state.user = null; state.roadmaps = []; updateUserUI(); toast('You have signed out.'); }
  catch (e) { toast(e.message); }
}
function appendChat(role, text, sources = [], loading = false) {
  const wrap = document.createElement('div'); wrap.className = `chat-message ${role === 'user' ? 'user' : 'assistant'}`;
  if (role !== 'user') { const av = document.createElement('span'); av.className = 'chat-avatar'; av.textContent = 'প'; wrap.appendChild(av); }
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
  $('#profileButton').addEventListener('click', () => state.user ? openProfile() : showAuth('login'));
  $('#closeAuth').addEventListener('click', closeAuth); $('#authModal').addEventListener('click', e => { if (e.target.id === 'authModal') closeAuth(); });
  $('#authTabs').querySelectorAll('[data-auth-tab]').forEach(b => b.addEventListener('click', () => showAuth(b.dataset.authTab)));
  $('#authForm').addEventListener('submit', submitAuth); $('#forgotPassword').addEventListener('click', () => showAuth('forgot'));
  $('#showPassword').addEventListener('change', e => { $('#authForm [name=password]').type = e.target.checked ? 'text' : 'password'; });
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
  if (failed.length) toast(`Some content could not load: ${failed.join(', ')}. See the browser console for details.`);
}
init();
