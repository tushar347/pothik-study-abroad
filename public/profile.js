/* Student signup wizard and profile page.
   Uses $, esc, api, toast, state, loadRoadmaps, updateUserUI and toggleLogin from app.js at call time. */
(() => {
  // Small stroke icons for the student card (inherit currentColor).
  const icon = d => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICONS = {
    camera: icon('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
    phone: icon('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>'),
    mail: icon('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
    plane: icon('<path d="M2 16l20-7-4-2-6 2-6-4-2 1 4 5-4 2-2-1-1 1z"/><path d="M3 21h18"/>'),
    globe: icon('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
    pin: icon('<path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>'),
    cap: icon('<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>'),
    calendar: icon('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
    check: icon('<path d="m5 12 5 5 9-10"/>'),
    card: icon('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2.2"/><path d="M5.8 16c.6-1.6 1.8-2.4 3.2-2.4s2.6.8 3.2 2.4M14 10h4M14 13h3"/>'),
    user: icon('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'),
    target: icon('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'),
    book: icon('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h7"/>'),
    lock: icon('<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'),
    arrow: icon('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    back: icon('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
    chart: icon('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
    upload: icon('<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>'),
    link: icon('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
    refresh: icon('<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>'),
    trash: icon('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
    x: icon('<path d="M6 6l12 12M18 6 6 18"/>'),
    alert: icon('<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>'),
    clock: icon('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    help: icon('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01"/>'),
    info: icon('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>'),
    scan: icon('<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><rect x="8" y="8" width="8" height="8" rx="1"/>')
  };
  let OPTS = null;
  const loadOptions = async () => OPTS || (OPTS = (await api('/api/profile/options')).options);
  const thisYear = new Date().getFullYear();

  // Visibility rules, mirroring src/profile.js.
  const postgrad = v => v.targetDegree === 'master' || v.targetDegree === 'phd';
  const hasBachelor = v => postgrad(v) || ['undergrad-student', 'bachelor-completed', 'master-student', 'master-completed', 'working'].includes(v.currentStatus);
  const hasMaster = v => v.targetDegree === 'phd' || ['master-student', 'master-completed'].includes(v.currentStatus);
  const englishMedium = v => v.secondarySystem === 'english-medium';
  const isIelts = v => /^ielts/.test(v.englishTest || '');
  const tookEnglish = v => v.englishTest && !['moi', 'none'].includes(v.englishTest);
  const undergradTarget = v => ['bachelor', 'foundation', 'diploma'].includes(v.targetDegree);

  // Field catalogue. width: full | half | third | quarter. `options` is a key from /api/profile/options or an inline list.
  const FIELDS = {
    name: { label: 'Full name', type: 'text', required: true, autocomplete: 'name', minlength: 2, maxlength: 80, placeholder: 'As on your passport or certificates', width: 'full' },
    email: { label: 'Email address', type: 'email', required: true, autocomplete: 'email', maxlength: 180, placeholder: 'you@example.com', width: 'full' },
    password: { label: 'Password', type: 'password', required: true, maxlength: 72, autocomplete: 'new-password', placeholder: 'A short sentence works well', width: 'full' },
    phone: { label: 'Mobile / WhatsApp number', type: 'tel', required: true, autocomplete: 'tel', placeholder: '+880 1XXX-XXXXXX', pattern: '\\+?[0-9 \\(\\)\\-]{7,20}' }, // escaped for the `v` regex flag browsers use for pattern=
    preferred_language: { label: 'Preferred language', type: 'select', required: true, options: [['en', 'English'], ['bn', 'বাংলা (Bangla)']], hint: 'The AI Counsellor replies in this language.' },

    dateOfBirth: { label: 'Date of birth', type: 'date', autocomplete: 'bday', max: new Date().toISOString().slice(0, 10) },
    gender: { label: 'Gender', type: 'select', options: 'gender' },
    nationality: { label: 'Nationality', type: 'text', maxlength: 60, placeholder: 'e.g. Bangladeshi', initial: 'Bangladeshi' },
    city: { label: 'Current city', type: 'text', maxlength: 80, autocomplete: 'address-level2', placeholder: 'e.g. Dhaka, Chattogram, Sylhet' },
    hasPassport: { label: 'Do you have a valid passport?', type: 'select', options: [['yes', 'Yes'], ['applied', 'Applied / renewing'], ['no', 'Not yet']], hint: 'We never ask for your passport number.' },

    targetDegree: { label: 'Degree you want to study', type: 'select', required: true, options: 'targetDegree' },
    fieldOfStudy: { label: 'Subject / field of study', type: 'text', required: true, maxlength: 120, placeholder: 'e.g. Computer Science, Public Health, MBA' },
    preferredCountries: { label: 'Preferred countries', type: 'chips', required: true, options: 'countries', hint: 'Choose up to 6.', max: 6, width: 'full' },
    intakeSeason: { label: 'Target intake', type: 'select', required: true, options: 'intakeSeason' },
    intakeYear: { label: 'Intake year', type: 'select', required: true, options: Array.from({ length: 6 }, (_, i) => [String(thisYear + i), String(thisYear + i)]) },
    budget: { label: 'Yearly budget (tuition + living)', type: 'select', options: 'budget' },
    fundingSource: { label: 'Main funding source', type: 'select', options: 'fundingSource' },
    needsScholarship: { label: 'Do you need a scholarship?', type: 'select', options: [['yes', 'Yes, essential'], ['maybe', 'Helpful but not essential'], ['no', 'No']] },

    currentStatus: { label: 'Current education status', type: 'select', required: true, options: 'currentStatus' },
    secondarySystem: { label: 'School curriculum', type: 'select', options: 'secondarySystem' },
    hSecondary: { type: 'heading', text: 'Secondary & higher secondary' },
    sscGpa: { label: 'SSC / Dakhil GPA (out of 5)', type: 'number', min: 0, max: 5, step: 0.01, placeholder: 'e.g. 5.00', width: 'quarter', showIf: v => !englishMedium(v) },
    sscYear: { label: 'SSC year', type: 'number', min: 1980, max: thisYear, step: 1, placeholder: 'e.g. 2019', width: 'quarter', showIf: v => !englishMedium(v) },
    hscGpa: { label: 'HSC / Alim / Diploma GPA (out of 5)', type: 'number', min: 0, max: 5, step: 0.01, placeholder: 'e.g. 4.83', width: 'quarter', showIf: v => !englishMedium(v) },
    hscYear: { label: 'HSC year', type: 'number', min: 1980, max: thisYear + 2, step: 1, placeholder: 'e.g. 2021', width: 'quarter', showIf: v => !englishMedium(v) },
    oLevelResult: { label: 'O Level results', type: 'text', maxlength: 160, placeholder: 'e.g. 5 A*, 3 A', showIf: englishMedium },
    aLevelResult: { label: 'A Level results', type: 'text', maxlength: 160, placeholder: 'e.g. A*AB — Maths, Physics, Chemistry', showIf: englishMedium },
    hBachelor: { type: 'heading', text: "Bachelor's degree", showIf: hasBachelor },
    bachelorInstitution: { label: 'University', type: 'text', maxlength: 160, placeholder: 'e.g. North South University', showIf: hasBachelor },
    bachelorSubject: { label: 'Subject', type: 'text', maxlength: 120, placeholder: 'e.g. Computer Science & Engineering', showIf: hasBachelor },
    bachelorCgpa: { label: 'CGPA / result', type: 'number', min: 0, max: 100, step: 0.01, placeholder: 'e.g. 3.45', width: 'third', showIf: hasBachelor },
    bachelorScale: { label: 'Grading scale', type: 'select', options: 'cgpaScale', initial: '4', width: 'third', showIf: hasBachelor },
    bachelorYear: { label: 'Graduation year (or expected)', type: 'number', min: 1980, max: thisYear + 6, step: 1, placeholder: String(thisYear), width: 'third', showIf: hasBachelor },
    hMaster: { type: 'heading', text: "Master's degree", showIf: hasMaster },
    masterInstitution: { label: 'University', type: 'text', maxlength: 160, showIf: hasMaster },
    masterSubject: { label: 'Subject', type: 'text', maxlength: 120, showIf: hasMaster },
    masterCgpa: { label: 'CGPA / result', type: 'number', min: 0, max: 100, step: 0.01, width: 'third', showIf: hasMaster },
    masterScale: { label: 'Grading scale', type: 'select', options: 'cgpaScale', initial: '4', width: 'third', showIf: hasMaster },
    masterYear: { label: 'Graduation year (or expected)', type: 'number', min: 1980, max: thisYear + 6, step: 1, width: 'third', showIf: hasMaster },
    hExperience: { type: 'heading', text: 'Experience' },
    studyGapYears: { label: 'Study gap (years)', type: 'number', min: 0, max: 30, step: 1, placeholder: '0', width: 'third', hint: 'Years since your last study.' },
    workExperienceMonths: { label: 'Work experience (months)', type: 'number', min: 0, max: 600, step: 1, placeholder: '0', width: 'third' },
    workRole: { label: 'Job title / field', type: 'text', maxlength: 120, placeholder: 'e.g. Software Engineer', width: 'third' },
    publications: { label: 'Research publications', type: 'number', min: 0, max: 200, step: 1, placeholder: '0', width: 'third', showIf: postgrad },
    researchInterest: { label: 'Research interest', type: 'textarea', maxlength: 600, placeholder: 'A few lines about the area you want to research', width: 'full', showIf: v => v.targetDegree === 'phd' },

    englishTest: { label: 'English proficiency test', type: 'select', options: 'englishTest', hint: 'Some universities accept an English-medium (MOI) letter instead of a test — check each programme.', width: 'full' },
    englishTestDate: { label: 'Test date (taken or planned)', type: 'date', showIf: v => tookEnglish(v) },
    ieltsOverall: { label: 'IELTS overall band', type: 'number', min: 0, max: 9, step: 0.5, placeholder: 'e.g. 7.0', showIf: isIelts },
    ieltsListening: { label: 'Listening', type: 'number', min: 0, max: 9, step: 0.5, width: 'quarter', showIf: isIelts },
    ieltsReading: { label: 'Reading', type: 'number', min: 0, max: 9, step: 0.5, width: 'quarter', showIf: isIelts },
    ieltsWriting: { label: 'Writing', type: 'number', min: 0, max: 9, step: 0.5, width: 'quarter', showIf: isIelts },
    ieltsSpeaking: { label: 'Speaking', type: 'number', min: 0, max: 9, step: 0.5, width: 'quarter', showIf: isIelts },
    toeflScale: { label: 'TOEFL score scale', type: 'select', options: 'toeflScale', initial: 'new', showIf: v => v.englishTest === 'toefl-ibt', hint: 'TOEFL iBT moved to a 1–6 band scale on 21 January 2026.' },
    toeflTotal: { label: 'TOEFL total / overall', type: 'number', min: 0, max: 120, step: 0.5, showIf: v => v.englishTest === 'toefl-ibt', scale: 'total' },
    toeflReading: { label: 'Reading', type: 'number', min: 0, max: 30, step: 0.5, width: 'quarter', showIf: v => v.englishTest === 'toefl-ibt', scale: 'section' },
    toeflListening: { label: 'Listening', type: 'number', min: 0, max: 30, step: 0.5, width: 'quarter', showIf: v => v.englishTest === 'toefl-ibt', scale: 'section' },
    toeflSpeaking: { label: 'Speaking', type: 'number', min: 0, max: 30, step: 0.5, width: 'quarter', showIf: v => v.englishTest === 'toefl-ibt', scale: 'section' },
    toeflWriting: { label: 'Writing', type: 'number', min: 0, max: 30, step: 0.5, width: 'quarter', showIf: v => v.englishTest === 'toefl-ibt', scale: 'section' },
    pteOverall: { label: 'PTE Academic overall (10–90)', type: 'number', min: 10, max: 90, step: 1, showIf: v => v.englishTest === 'pte-academic' },
    duolingoOverall: { label: 'Duolingo overall (10–160)', type: 'number', min: 10, max: 160, step: 5, showIf: v => v.englishTest === 'duolingo' },
    hGraduate: { type: 'heading', text: "Graduate admissions tests (master's / PhD)", showIf: postgrad },
    graduateTest: { label: 'GRE / GMAT', type: 'select', options: 'graduateTest', hint: 'Many programmes waive these; most PhDs and top US programmes may ask for them.', width: 'full', showIf: postgrad },
    greVerbal: { label: 'GRE Verbal (130–170)', type: 'number', min: 130, max: 170, step: 1, width: 'third', showIf: v => postgrad(v) && v.graduateTest === 'gre' },
    greQuant: { label: 'GRE Quant (130–170)', type: 'number', min: 130, max: 170, step: 1, width: 'third', showIf: v => postgrad(v) && v.graduateTest === 'gre' },
    greWriting: { label: 'GRE Writing (0–6)', type: 'number', min: 0, max: 6, step: 0.5, width: 'third', showIf: v => postgrad(v) && v.graduateTest === 'gre' },
    gmatTotal: { label: 'GMAT Focus total (205–805)', type: 'number', min: 205, max: 805, step: 10, showIf: v => postgrad(v) && v.graduateTest === 'gmat' },
    graduateTestDate: { label: 'Test date (taken or planned)', type: 'date', showIf: v => postgrad(v) && ['gre', 'gmat', 'planned'].includes(v.graduateTest) },
    hUndergrad: { type: 'heading', text: 'Undergraduate admissions test', showIf: undergradTarget },
    satTotal: { label: 'SAT total (400–1600, optional)', type: 'number', min: 400, max: 1600, step: 10, hint: 'Mainly for US universities.', showIf: undergradTarget },

    acceptTerms: { label: 'I confirm this information is accurate and agree to Pothik storing it to personalise my guidance.', type: 'checkbox', required: true, width: 'full' }
  };
  const GROUPS = {
    account: ['name', 'email', 'password', 'phone', 'preferred_language'],
    goals: ['targetDegree', 'fieldOfStudy', 'preferredCountries', 'intakeSeason', 'intakeYear', 'budget', 'fundingSource', 'needsScholarship'],
    academic: ['currentStatus', 'secondarySystem', 'hSecondary', 'sscGpa', 'sscYear', 'hscGpa', 'hscYear', 'oLevelResult', 'aLevelResult', 'hBachelor', 'bachelorInstitution', 'bachelorSubject', 'bachelorCgpa', 'bachelorScale', 'bachelorYear', 'hMaster', 'masterInstitution', 'masterSubject', 'masterCgpa', 'masterScale', 'masterYear', 'hExperience', 'studyGapYears', 'workExperienceMonths', 'workRole', 'publications', 'researchInterest'],
    tests: ['englishTest', 'englishTestDate', 'ieltsOverall', 'ieltsListening', 'ieltsReading', 'ieltsWriting', 'ieltsSpeaking', 'toeflScale', 'toeflTotal', 'toeflReading', 'toeflListening', 'toeflSpeaking', 'toeflWriting', 'pteOverall', 'duolingoOverall', 'hGraduate', 'graduateTest', 'greVerbal', 'greQuant', 'greWriting', 'gmatTotal', 'graduateTestDate', 'hUndergrad', 'satTotal'],
    personal: ['dateOfBirth', 'gender', 'nationality', 'city', 'hasPassport']
  };
  const ACCOUNT_KEYS = new Set(['name', 'email', 'password', 'preferred_language', 'acceptTerms']);
  const STEPS = [
    { title: 'Create your account', sub: 'Your private Pothik workspace. Takes about 3 minutes.', fields: GROUPS.account },
    { title: 'Your study goals', sub: 'Where, what and when you want to study.', fields: GROUPS.goals },
    { title: 'Academic background', sub: 'Results as they appear on your certificates. Leave blank anything that does not apply.', fields: GROUPS.academic },
    { title: 'English & admission tests', sub: 'Not taken a test yet? Choose "Not taken yet" — you can add scores later from your profile.', fields: GROUPS.tests },
    { title: 'A little about you', sub: 'Optional details that help with visa and scholarship guidance.', fields: [...GROUPS.personal, 'acceptTerms'] }
  ];

  const optionList = f => (typeof f.options === 'string' ? OPTS[f.options] : f.options) || [];
  function fieldHtml(name, value) {
    const f = FIELDS[name];
    if (f.type === 'heading') return `<h4 class="pf-heading" data-item="${name}">${esc(f.text)}</h4>`;
    const id = `pf-${name}-${Math.random().toString(36).slice(2, 7)}`;
    const v = value ?? f.initial ?? '';
    const attrs = ['required', 'minlength', 'maxlength', 'min', 'max', 'step', 'pattern', 'placeholder', 'autocomplete']
      .filter(a => f[a] !== undefined && f[a] !== false).map(a => (a === 'required' ? 'required' : `${a}="${esc(f[a])}"`)).join(' ');
    let control;
    if (f.type === 'select') control = `<select id="${id}" name="${name}" ${f.required ? 'required' : ''}><option value="">Select…</option>${optionList(f).map(([o, l]) => `<option value="${esc(o)}" ${String(v) === o ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    else if (f.type === 'chips') control = `<div class="pf-chips" role="group" aria-labelledby="${id}">${optionList(f).map(([o, l]) => `<label class="pf-chip"><input type="checkbox" name="${name}" value="${esc(o)}" ${(v || []).includes(o) ? 'checked' : ''}><span>${f.options === 'countries' && FLAG_CODES[o] ? flagHtml(o) : ''}${esc(l)}</span></label>`).join('')}</div>`;
    else if (f.type === 'textarea') control = `<textarea id="${id}" name="${name}" rows="3" ${attrs}>${esc(v)}</textarea>`;
    else if (f.type === 'checkbox') return `<label class="pf-field pf-full pf-check" data-item="${name}"><input type="checkbox" name="${name}" ${f.required ? 'required' : ''} ${v === true ? 'checked' : ''}><span>${esc(f.label)}</span><small class="pf-error" aria-live="polite"></small></label>`;
    else control = `<input id="${id}" name="${name}" type="${f.type}" ${f.type === 'number' ? 'inputmode="decimal"' : ''} value="${esc(v)}" ${attrs}>`;
    const tag = f.type === 'chips' ? 'div' : 'label';
    return `<${tag} class="pf-field pf-${f.width || 'half'}" data-item="${name}" ${tag === 'label' ? `for="${id}"` : ''}><span class="pf-label" id="${f.type === 'chips' ? id : ''}">${esc(f.label)}${f.required ? ' <em aria-hidden="true">*</em>' : ''}</span>${control}${f.hint ? `<small class="pf-hint">${esc(f.hint)}</small>` : ''}<small class="pf-error" aria-live="polite"></small></${tag}>`;
  }
  const fieldsHtml = (names, values = {}) => `<div class="pf-grid">${names.map(n => fieldHtml(n, values[n])).join('')}</div>`;

  // Reads enabled fields into a plain object; empty values are omitted.
  function readValues(form) {
    const out = {};
    form.querySelectorAll('[data-item]').forEach(el => {
      const name = el.dataset.item, f = FIELDS[name];
      if (!f || f.type === 'heading' || el.classList.contains('pf-off')) return;
      if (f.type === 'chips') { const v = [...el.querySelectorAll('input:checked')].map(i => i.value); if (v.length) out[name] = v; return; }
      if (f.type === 'checkbox') { out[name] = el.querySelector('input').checked; return; }
      const input = el.querySelector('input,select,textarea'); if (!input || input.readOnly) return;
      const v = input.value.trim(); if (v === '') return;
      out[name] = f.type === 'number' ? Number(v) : v;
    });
    return out;
  }
  // Shows/hides conditional fields and disables hidden ones so they are neither validated nor saved.
  function applyConditions(form) {
    let values = readValues(form);
    form.querySelectorAll('[data-item]').forEach(el => {
      const f = FIELDS[el.dataset.item]; if (!f?.showIf) return;
      const off = !f.showIf(values);
      el.classList.toggle('pf-off', off); el.hidden = off;
      el.querySelectorAll('input,select,textarea').forEach(i => { i.disabled = off; });
    });
    values = readValues(form);
    const newToefl = values.toeflScale === 'new';
    form.querySelectorAll('[data-item^="toefl"]').forEach(el => {
      const f = FIELDS[el.dataset.item]; const input = el.querySelector('input'); if (!input || !f.scale) return;
      input.min = newToefl ? 1 : 0; input.max = newToefl ? 6 : (f.scale === 'total' ? 120 : 30);
      input.step = newToefl ? 0.5 : 1; input.placeholder = newToefl ? 'e.g. 4.5' : (f.scale === 'total' ? 'e.g. 95' : 'e.g. 24');
    });
  }
  function bindForm(form) {
    applyConditions(form);
    form.addEventListener('change', e => {
      const chip = e.target.closest('.pf-chips');
      if (chip) {
        const f = FIELDS[e.target.name]; const checked = chip.querySelectorAll('input:checked');
        if (f.max && checked.length > f.max) { e.target.checked = false; toast(`Choose up to ${f.max}.`); }
      }
      e.target.closest('[data-item]')?.classList.remove('pf-invalid');
      applyConditions(form);
    });
  }
  function clearErrors(form) { form.querySelectorAll('.pf-invalid').forEach(el => el.classList.remove('pf-invalid')); form.querySelectorAll('.pf-error').forEach(el => { el.textContent = ''; }); }
  function showErrors(form, errors = {}) {
    let first = null;
    Object.entries(errors).forEach(([name, message]) => {
      const el = form.querySelector(`[data-item="${CSS.escape(name)}"]`); if (!el) return;
      el.classList.add('pf-invalid'); const box = el.querySelector('.pf-error'); if (box) box.textContent = message;
      first = first || el;
    });
    return first;
  }
  // Native validation for the enabled controls in `scope`, plus "at least one" for required chip groups.
  function validate(scope) {
    for (const el of scope.querySelectorAll('[data-item]:not(.pf-off)')) {
      const f = FIELDS[el.dataset.item];
      if (f?.type === 'chips' && f.required && !el.querySelector('input:checked')) {
        el.classList.add('pf-invalid'); el.querySelector('.pf-error').textContent = 'Choose at least one'; el.scrollIntoView({ block: 'center', behavior: 'smooth' }); return false;
      }
      for (const input of el.querySelectorAll('input,select,textarea')) {
        if (input.disabled || input.checkValidity()) continue;
        // Password fields with a strength meter explain themselves inline rather than in a browser bubble.
        if (input._meter) { el.classList.add('pf-invalid'); el.querySelector('.pf-error').textContent = input.value ? 'Not strong enough yet — the checklist above shows what to change.' : 'Choose a password to protect your account.'; input.focus(); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); return false; }
        input.reportValidity(); return false;
      }
    }
    return true;
  }

  // ---------- Signup wizard (back face of the auth card in index.html) ----------
  let step = 0;
  function signupMarkup() {
    const face = $('#signupFace'); if (face.childElementCount) return;
    face.innerHTML = `<div class="auth-face-inner">
      <button class="nm-close" type="button" data-close-auth aria-label="Close">×</button>
      <div class="nm-logo nm-logo-sm">${ICONS.user}</div>
      <div class="pf-progress"><div class="pf-progress-meta"><span id="signupStepLabel"></span></div><div class="pf-progress-bar"><span id="signupProgress"></span></div></div>
      <h2 id="signupTitle"></h2><p class="auth-subtitle" id="signupSub"></p>
      <form id="signupForm" novalidate></form>
      <div class="nm-switch"><span>Already have an account? Log in</span><button type="button" class="nm-switch-btn" data-flip="login" aria-label="Back to log in">${ICONS.back}</button></div>
      <div class="auth-legal">Never enter passport, NID or bank account numbers. Pothik only stores what you see here, and you can delete your account at any time from your profile.</div>
    </div>`;
  }
  function renderStep() {
    const form = $('#signupForm');
    form.querySelectorAll('fieldset[data-step]').forEach(fs => { fs.hidden = Number(fs.dataset.step) !== step; });
    $('#signupTitle').textContent = STEPS[step].title; $('#signupSub').textContent = STEPS[step].sub;
    $('#signupStepLabel').textContent = `Step ${step + 1} of ${STEPS.length}`;
    $('#signupProgress').style.width = `${((step + 1) / STEPS.length) * 100}%`;
    $('#signupBack').hidden = step === 0;
    $('#signupNext').textContent = step === STEPS.length - 1 ? 'Create account' : 'Continue';
    $('#signupFace').scrollTop = 0;
    focusStep();
  }
  const focusStep = () => $('#signupForm').querySelector(`fieldset[data-step="${step}"] input:not([type=checkbox]),fieldset[data-step="${step}"] select`)?.focus({ preventScroll: true });
  async function openSignup() {
    try { await loadOptions(); } catch (e) { toast('Could not load the signup form. Check that the server is running.'); return; }
    signupMarkup();
    const form = $('#signupForm');
    form.innerHTML = STEPS.map((s, i) => `<fieldset data-step="${i}" hidden>${fieldsHtml(s.fields)}</fieldset>`).join('')
      + `<div class="pf-actions"><button type="button" class="nm-button nm-button-quiet" id="signupBack">← Back</button><button type="submit" class="nm-button" id="signupNext"></button></div><div id="signupMessage" class="form-message" role="status"></div>`;
    // Same show/hide eye as the log-in face (handled by the auth modal's click listener in app.js).
    const password = form.querySelector('[name=password]'); const wrap = document.createElement('span');
    wrap.className = 'nm-control'; password.before(wrap); wrap.append(password);
    wrap.insertAdjacentHTML('beforeend', `<button type="button" class="nm-eye" data-toggle-password aria-label="Show password" aria-pressed="false">${$('#loginFace .nm-eye').innerHTML}</button>`);
    const nameInput = form.querySelector('[name=name]'), emailInput = form.querySelector('[name=email]');
    attachPasswordMeter(password, () => ({ name: nameInput.value, email: emailInput.value }), [nameInput, emailInput]);
    bindForm(form);
    $('#signupBack').addEventListener('click', () => { step = Math.max(0, step - 1); renderStep(); });
    form.onsubmit = submitSignup;
    const wasOpen = !$('#authModal').hidden;
    step = 0; renderStep(); openAuthModal();
    await setAuthFace('signup', wasOpen); focusStep();
  }
  const closeSignup = () => closeAuth();
  const stepOf = name => STEPS.findIndex(s => s.fields.includes(name));
  async function submitSignup(e) {
    e.preventDefault();
    const form = e.currentTarget; const fs = form.querySelector(`fieldset[data-step="${step}"]`);
    $('#signupMessage').textContent = '';
    if (!validate(fs)) return;
    if (step < STEPS.length - 1) { step++; renderStep(); return; }
    const values = readValues(form); const account = {}; const profile = {};
    Object.entries(values).forEach(([k, v]) => { (ACCOUNT_KEYS.has(k) ? account : profile)[k] = v; });
    const button = $('#signupNext'); button.disabled = true; clearErrors(form);
    try {
      const data = await api('/api/auth/signup', { method: 'POST', body: JSON.stringify({ ...account, profile }) });
      if (data.verificationRequired) {
        $('#signupMessage').innerHTML = esc(data.message) + (data.developmentVerificationUrl ? `<br><a class="text-link" href="${esc(data.developmentVerificationUrl)}">Verify this development account ↗</a>` : '');
        return;
      }
      state.user = data.user; updateUserUI(); closeSignup(); loadRoadmaps().catch(() => {});
      greetUser(state.user, 'signup');
    } catch (err) {
      $('#signupMessage').textContent = err.message;
      const errors = err.data?.fieldErrors || {};
      const firstStep = Math.min(...Object.keys(errors).map(stepOf).filter(i => i >= 0));
      if (Number.isFinite(firstStep)) { step = firstStep; renderStep(); }
      showErrors(form, errors)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    } finally { button.disabled = false; }
  }

  // ---------- Profile page ----------
  const SECTIONS = [
    { id: 'account', title: 'Account', fields: ['name', 'email', 'phone', 'preferred_language'] },
    { id: 'goals', title: 'Study goals', fields: GROUPS.goals },
    { id: 'academic', title: 'Academic background', fields: GROUPS.academic },
    { id: 'tests', title: 'English & admission tests', fields: GROUPS.tests },
    { id: 'personal', title: 'Personal details', fields: GROUPS.personal }
  ];
  // Each profile page is its own view; the account menu opens them directly.
  const VIEWS = [
    { id: 'overview', title: 'Overview', heading: 'My student card', desc: 'Your Pothik student pass, profile progress and scores at a glance.', icon: 'card' },
    { id: 'chances', title: 'Admission chances', desc: 'Check any university programme: we read its official requirements and compare them with your profile.', icon: 'chart' },
    { id: 'documents', title: 'Upload documents', desc: 'Let the AI read your transcripts and certificates to fill in your results. Files are never stored.', icon: 'upload' },
    { id: 'account', title: 'Account details', desc: 'Your name, contact number and preferred language.', icon: 'user' },
    { id: 'goals', title: 'Study goals', desc: 'Where, what and when you want to study — this shapes every recommendation.', icon: 'target' },
    { id: 'academic', title: 'Academic background', desc: 'Your results as they appear on your certificates.', icon: 'book' },
    { id: 'tests', title: 'Test scores', desc: 'English proficiency and admissions tests such as IELTS, TOEFL, GRE and GMAT.', icon: 'cap' },
    { id: 'personal', title: 'Personal details', desc: 'Optional details that help with visa and scholarship guidance.', icon: 'pin' },
    { id: 'security', title: 'Password & security', desc: 'Change your password, or delete your account and data.', icon: 'lock' }
  ];
  const FORM_VIEWS = new Set(SECTIONS.map(s => s.id));
  const viewOfField = name => SECTIONS.find(s => s.fields.includes(name))?.id;
  let currentView = 'overview';
  let dirty = false;
  const optLabel = (key, v) => OPTS[key]?.find(([x]) => x === String(v))?.[1] || v;
  function profileMarkup() {
    if ($('#profilePanel')) return;
    document.body.insertAdjacentHTML('beforeend', `<section class="profile-panel" id="profilePanel" hidden aria-labelledby="profileViewTitle">
      <div class="admin-panel-head"><div><div class="eyebrow" id="profileEyebrow">MY PROFILE</div><h2 id="profileViewTitle"></h2><p id="profileViewDesc"></p></div>
        <div class="pf-head-actions"><button type="button" class="button pf-back" id="profileSignOut">Sign out</button><button class="icon-button" type="button" id="closeProfile" aria-label="Close profile">×</button></div></div>
      <div class="pf-layout">
        <nav class="pf-tabs" role="tablist" aria-label="Profile pages" aria-orientation="vertical">${VIEWS.map(v => `<button type="button" role="tab" id="pf-tab-${v.id}" aria-controls="pf-view-${v.id}" aria-selected="false" tabindex="-1" data-view="${v.id}">${ICONS[v.icon]}<span>${esc(v.title)}</span></button>`).join('')}</nav>
        <div class="pf-main">
          <section class="pf-view pf-overview" id="pf-view-overview" role="tabpanel" aria-labelledby="pf-tab-overview" hidden>
           <div class="pf-overview-card">
          <article class="id-card" aria-label="Pothik student card">
            <svg class="id-net" viewBox="0 0 400 560" aria-hidden="true" preserveAspectRatio="none"><g><line x1="330" y1="60" x2="400" y2="210"/><line x1="330" y1="60" x2="270" y2="190"/><line x1="270" y1="190" x2="400" y2="320"/><line x1="230" y1="420" x2="400" y2="360"/><line x1="0" y1="300" x2="120" y2="380"/></g><g><circle cx="330" cy="60" r="4"/><circle cx="270" cy="190" r="3"/><circle cx="400" cy="320" r="3"/><circle cx="230" cy="420" r="3"/></g></svg>
            <header class="id-top"><span class="id-logo"><img src="/assets/brand/pothik-logo-card.png" alt="Pothik — Your path to a brighter tomorrow" width="360" height="182"></span><span class="id-pass"><b>Student pass</b><small>Study abroad</small></span><span class="id-chip" aria-hidden="true"></span></header>
            <div class="id-hero">
              <div class="id-photo"><button type="button" class="pf-avatar" id="profileAvatar" aria-label="Change profile photo"></button><span class="id-online" title="Active member"></span>
                <button type="button" class="id-photo-btn" id="photoChange">${ICONS.camera}<span>Upload photo</span></button></div>
              <div class="id-who"><div class="id-eyebrow">Student identity</div><h3 id="cardName"></h3><p id="cardGoal"></p><div class="id-badges" id="cardBadges"></div></div>
            </div>
            <dl class="id-grid" id="cardGrid"></dl>
            <footer class="id-foot"><div><span class="id-label">Card no.</span><b id="cardNumber"></b><small>${ICONS.scan} Scan to open profile</small></div><img class="id-qr" id="cardQr" alt="QR code that opens your Pothik profile" width="120" height="120"></footer>
          </article>
          <input type="file" id="photoInput" accept="image/png,image/jpeg,image/webp" hidden>
          <div class="id-photo-tools"><small>PNG, JPEG or WebP — zoom and position it after choosing.</small><button type="button" class="text-link pf-photo-remove" id="photoRemove" hidden>Remove photo</button></div>
           </div>
           <div class="pf-overview-side">
            <div class="id-status" id="cardStatus"></div>
            <div class="pf-next" id="profileNext"></div>
            <div class="pf-facts" id="profileFacts"></div>
           </div>
          </section>
          <section class="pf-view" id="pf-view-chances" role="tabpanel" aria-labelledby="pf-tab-chances" hidden>
            <form class="admin-box pf-card" id="chanceForm" novalidate>
              <ol class="ch-steps" aria-label="Steps"><li data-step="country">Country</li><li data-step="degree">Degree</li><li data-step="university">University</li><li data-step="program">Programme</li></ol>
              <div class="pf-grid">
                <label class="pf-field pf-half" data-item="country"><span class="pf-label">1 · Country <em>*</em></span><input name="country" required maxlength="60" placeholder="Search a country…"><small class="pf-hint" id="countryHint"></small><small class="pf-error"></small></label>
                <label class="pf-field pf-half" data-item="degree"><span class="pf-label">2 · Degree level <em>*</em></span><select name="degree" required><option value="master">Master's</option><option value="phd">PhD / doctorate</option><option value="bachelor">Bachelor's</option><option value="foundation">Foundation / pathway</option><option value="diploma">Diploma</option></select><small class="pf-hint">Universities are filtered to those that offer this level.</small></label>
                <label class="pf-field pf-half" data-item="university"><span class="pf-label">3 · University <em>*</em></span><input name="university" required minlength="2" maxlength="120" placeholder="Choose a country first" disabled><small class="pf-hint" id="universityHint" aria-live="polite"></small><small class="pf-error"></small></label>
                <label class="pf-field pf-half" data-item="program"><span class="pf-label">4 · Programme <em>*</em></span><input name="program" required minlength="2" maxlength="160" placeholder="Choose a university first" disabled><small class="pf-hint ch-program-hint" id="programHint" aria-live="polite"></small><small class="pf-error"></small></label>
              </div>
              <div class="ch-submit"><button type="submit" class="button button-primary" id="chanceSubmit">${ICONS.chart}<span>Check my chances</span></button><small>The first check of a programme takes about 20–40 seconds while we read its official pages. Results are cached for 7 days.</small></div>
              <div class="form-message" id="chanceMessage" role="status"></div>
            </form>
            <div class="ch-progress" id="chanceProgress" hidden aria-live="polite"><span class="ch-spinner" aria-hidden="true"></span><div><b id="chanceStep"></b><small>You can keep using Pothik — this page will update when it is ready.</small></div></div>
            <div id="chanceResult"></div>
            <section class="admin-box pf-card"><div class="ch-list-head"><h3>My shortlist</h3><small id="chanceCount"></small></div><div id="chanceList"></div></section>
          </section>
          <section class="pf-view" id="pf-view-documents" role="tabpanel" aria-labelledby="pf-tab-documents" hidden>
            <div class="admin-box pf-card">
              <div class="doc-privacy">${ICONS.lock}<p><b>Private by design.</b> Upload each certificate in its own card. The AI reads your results from it, then the file is discarded — Pothik never saves it. Nothing changes in your profile until you confirm. Do not upload your passport, NID or bank documents.</p></div>
              <div class="doc-slots" id="docSlots"></div>
              <details class="doc-other"><summary>Other documents — TOEFL, PTE, Duolingo, GMAT, Master's transcript</summary>
                <label class="doc-drop" id="docDrop">
                  <input type="file" id="docInput" accept="application/pdf,image/png,image/jpeg,image/webp">
                  ${ICONS.upload}<b>Choose another certificate or score report</b><small>PDF, JPEG, PNG or WebP · up to 10 MB</small>
                </label>
              </details>
              <div class="ch-progress" id="docProgress" hidden><span class="ch-spinner" aria-hidden="true"></span><div><b id="docProgressTitle">Reading your document…</b><small>This usually takes 10–20 seconds.</small></div></div>
              <div class="form-message" id="docMessage" role="status"></div>
              <div id="docResult"></div>
            </div>
          </section>
          <form id="profileForm" novalidate></form>
          <section class="admin-box pf-card pf-view" id="pf-view-security" role="tabpanel" aria-labelledby="pf-tab-security" hidden><h3>Change password</h3>
            <form id="passwordForm" novalidate><div class="pf-grid">${['currentPassword', 'newPassword'].map(n => `<label class="pf-field pf-half" data-item="${n}"><span class="pf-label">${n === 'currentPassword' ? 'Current password' : 'New password'}</span><input type="password" name="${n}" required ${n === 'newPassword' ? 'autocomplete="new-password"' : 'autocomplete="current-password"'} maxlength="72"><small class="pf-error"></small></label>`).join('')}</div>
              <button type="submit" class="button button-primary">Change password</button><div class="form-message" id="passwordMessage" role="status"></div></form>
            <details class="pf-danger"><summary>Delete my account</summary><p>This permanently deletes your account, profile and saved roadmaps. It cannot be undone.</p>
              <form id="deleteForm"><label class="pf-field"><span class="pf-label">Confirm with your password</span><input type="password" name="password" required autocomplete="current-password" maxlength="72"></label><button type="submit" class="button pf-delete">Delete account permanently</button><div class="form-message" id="deleteMessage" role="status"></div></form></details>
          </section>
        </div>
      </div></section>`);
    $('#closeProfile').addEventListener('click', closeProfile);
    $('#profileSignOut').addEventListener('click', async () => { closeProfile(); if ($('#profilePanel').hidden && state.user) await toggleLogin(); });
    $('#profileAvatar').addEventListener('click', () => $('#photoInput').click());
    $('#photoChange').addEventListener('click', () => $('#photoInput').click());
    $('#photoInput').addEventListener('change', e => { const file = e.target.files[0]; e.target.value = ''; if (file) openCropper(file); });
    $('#photoRemove').addEventListener('click', removePhoto);
    $('#passwordForm').addEventListener('submit', changePassword);
    attachPasswordMeter($('#passwordForm [name=newPassword]'), () => ({ name: state.user?.name, email: state.user?.email }));
    $('#deleteForm').addEventListener('submit', deleteAccount);
    $('#profileForm').addEventListener('input', markDirty); $('#profileForm').addEventListener('change', markDirty);
    const tabs = $('#profilePanel .pf-tabs');
    tabs.addEventListener('click', e => { const t = e.target.closest('[role=tab]'); if (t) showView(t.dataset.view); });
    // Arrow keys move between pages (vertical tab list on desktop, horizontal row on phones).
    tabs.addEventListener('keydown', e => {
      const all = [...tabs.querySelectorAll('[role=tab]')]; const i = all.indexOf(document.activeElement); if (i < 0) return;
      const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      const to = step ? all[(i + step + all.length) % all.length] : e.key === 'Home' ? all[0] : e.key === 'End' ? all.at(-1) : null;
      if (to) { e.preventDefault(); showView(to.dataset.view); to.focus(); }
    });
    $('#profileNext').addEventListener('click', e => { const b = e.target.closest('[data-goto]'); if (b) showView(b.dataset.goto, { focusField: b.dataset.field }); });
    $('#chanceForm').addEventListener('submit', submitChance);
    $('#chanceForm [name=degree]').addEventListener('change', e => { e.target.dataset.touched = '1'; renderUniversityItems(); renderProgramOptions(); updateSteps(); });
    setupChanceDropdowns();
    $('#chanceList').addEventListener('click', onCheckAction);
    $('#chanceResult').addEventListener('click', onCheckAction);
    $('#docInput').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; uploadDocument(f, 'other'); });
    // Certificate cards: each has its own upload (click or drag a file onto the card).
    const slotsEl = $('#docSlots');
    slotsEl.addEventListener('change', e => { const input = e.target.closest('[data-slot-input]'); if (!input) return; const f = input.files[0]; input.value = ''; uploadDocument(f, input.dataset.slotInput); });
    slotsEl.addEventListener('dragover', e => { const card = e.target.closest('[data-slot]'); if (card) { e.preventDefault(); card.classList.add('dragging'); } });
    slotsEl.addEventListener('dragleave', e => e.target.closest('[data-slot]')?.classList.remove('dragging'));
    slotsEl.addEventListener('drop', e => { const card = e.target.closest('[data-slot]'); if (!card) return; e.preventDefault(); card.classList.remove('dragging'); uploadDocument(e.dataTransfer.files[0], card.dataset.slot); });
    const drop = $('#docDrop');
    ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('dragging'); }));
    ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, () => drop.classList.remove('dragging')));
    drop.addEventListener('drop', e => { e.preventDefault(); uploadDocument(e.dataTransfer.files[0]); });
    $('#docResult').addEventListener('click', e => { if (e.target.closest('#docApply')) applyDocument(); });
  }
  function showView(id, { focusField } = {}) {
    const view = VIEWS.find(v => v.id === id) || VIEWS[0]; currentView = view.id;
    $$('#profilePanel .pf-view').forEach(el => { el.hidden = el.id !== `pf-view-${view.id}`; });
    $$('#profilePanel [role=tab]').forEach(t => { const on = t.dataset.view === view.id; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
    $('#profileViewTitle').textContent = view.heading || view.title; $('#profileViewDesc').textContent = view.desc;
    $('#profilePanel .pf-savebar').hidden = !FORM_VIEWS.has(view.id);
    $('#profilePanel').scrollTop = 0;
    const panel = $(`#pf-view-${view.id}`);
    if (view.id === 'documents') loadDocSlots();
    if (view.id === 'chances') {
      if (!checksLoaded) loadChecks();
      orderCountries();
      const deg = $('#chanceForm [name=degree]'); if (!deg.dataset.touched && lastProfile.targetDegree && [...deg.options].some(o => o.value === lastProfile.targetDegree)) deg.value = lastProfile.targetDegree;
    }
    const field = focusField && panel.querySelector(`[data-item="${CSS.escape(focusField)}"] input,[data-item="${CSS.escape(focusField)}"] select,[data-item="${CSS.escape(focusField)}"] textarea`);
    if (field) { field.focus({ preventScroll: true }); field.scrollIntoView({ block: 'center' }); }
  }
  let lastCard = null; let lastProfile = {};
  const formatDate = iso => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };
  function englishScore(p) {
    if (/^ielts/.test(p.englishTest || '') && p.ieltsOverall !== undefined) return `IELTS ${Number(p.ieltsOverall).toFixed(1)}`;
    if (p.englishTest === 'toefl-ibt' && p.toeflTotal !== undefined) return `TOEFL ${p.toeflTotal}`;
    if (p.englishTest === 'pte-academic' && p.pteOverall !== undefined) return `PTE ${p.pteOverall}`;
    if (p.englishTest === 'duolingo' && p.duolingoOverall !== undefined) return `Duolingo ${p.duolingoOverall}`;
    if (p.englishTest === 'moi') return 'MOI letter';
    if (p.englishTest === 'planned') return 'Test planned';
    return '';
  }
  function renderCard(user, p, completeness, card) {
    $('#cardName').textContent = user.name;
    const degree = p.targetDegree ? `${optLabel('targetDegree', p.targetDegree).replace(' / doctorate', '').replace(' / pathway', '')} applicant` : 'Future student';
    $('#cardGoal').textContent = [degree, p.fieldOfStudy].filter(Boolean).join(' · ');
    const badges = [[user.role === 'admin' ? 'Admin' : 'Student', 'role'], [user.email_verified ? 'Active' : 'Unverified', user.email_verified ? 'ok' : 'warn']];
    $('#cardBadges').innerHTML = badges.map(([t, k]) => `<span class="id-badge id-badge-${k}">${k === 'ok' ? ICONS.check : ''}${esc(t)}</span>`).join('');
    const intake = p.intakeSeason ? `${optLabel('intakeSeason', p.intakeSeason).split(' (')[0]} ${p.intakeYear || ''}`.trim() : '';
    const countries = (p.preferredCountries || []).map(c => optLabel('countries', c));
    const cells = [
      ['phone', 'Phone', p.phone, p.phone ? `tel:${p.phone.replace(/[^+\d]/g, '')}` : ''],
      ['mail', 'E-mail', user.email, `mailto:${user.email}`],
      ['plane', 'Target intake', intake],
      ['globe', 'Destinations', countries.length > 2 ? `${countries.slice(0, 2).join(', ')} +${countries.length - 2}` : countries.join(', ')],
      ['pin', 'City', p.city],
      ['cap', 'English', englishScore(p)],
      ['calendar', 'Member since', card?.memberSince ? formatDate(card.memberSince) : '']
    ];
    $('#cardGrid').innerHTML = cells.map(([icon, label, value, href]) => `<div><dt>${ICONS[icon]}${esc(label)}</dt><dd>${value ? (href ? `<a href="${esc(href)}">${esc(value)}</a>` : esc(value)) : '<span class="id-empty">Not added</span>'}</dd></div>`).join('');
    $('#cardNumber').textContent = card?.number || '—';
    if (!$('#cardQr').getAttribute('src')) $('#cardQr').src = '/api/profile/qr.svg';
    const missing = completeness.missing.map(k => FIELDS[k]?.label).filter(Boolean);
    $('#cardStatus').className = `id-status ${missing.length ? 'id-status-todo' : 'id-status-done'}`;
    $('#cardStatus').innerHTML = missing.length
      ? `<div class="id-status-top"><b>Profile ${completeness.percent}% complete</b><span>${missing.length} to add</span></div><div class="pf-progress-bar"><span style="width:${completeness.percent}%"></span></div><p>Add: ${esc(missing.slice(0, 3).join(', '))}${missing.length > 3 ? ` and ${missing.length - 3} more` : ''}.</p>`
      : `${ICONS.check}<b>Profile complete</b>`;
  }
  function renderSummary(user, profile, completeness, card = lastCard) {
    lastCard = card; lastProfile = profile;
    $('#profileEyebrow').textContent = `MY PROFILE · ${user.name.toUpperCase()}`;
    renderAvatar(user); renderCard(user, profile, completeness, card);
    // Next steps: each missing detail links straight to the page where it is entered.
    const steps = completeness.missing.map(k => ({ k, label: FIELDS[k]?.label, view: viewOfField(k) })).filter(s => s.label && s.view);
    $('#profileNext').innerHTML = steps.length
      ? `<h4>Next steps</h4>${steps.slice(0, 5).map(s => `<button type="button" data-goto="${s.view}" data-field="${esc(s.k)}"><span><b>${esc(s.label)}</b><small>Add in ${esc(VIEWS.find(v => v.id === s.view).title)}</small></span>${ICONS.arrow}</button>`).join('')}${steps.length > 5 ? `<p>${steps.length - 5} more after these.</p>` : ''}`
      : '';
    $('#profileNext').hidden = !steps.length;
    // Scores at a glance; goals, intake and destinations are on the card itself.
    const p = profile; const facts = [];
    const band = v => (v === undefined ? '–' : Number(v).toFixed(1));
    const gpa = v => Number(v).toFixed(2);
    if (/^ielts/.test(p.englishTest || '') && p.ieltsOverall !== undefined) facts.push(['IELTS', [`Overall ${band(p.ieltsOverall)}`, p.ieltsListening !== undefined ? `L ${band(p.ieltsListening)} · R ${band(p.ieltsReading)} · W ${band(p.ieltsWriting)} · S ${band(p.ieltsSpeaking)}` : ''].filter(Boolean).join(' · '), 'ieltsOverall']);
    if (p.englishTest === 'toefl-ibt' && p.toeflTotal !== undefined) facts.push(['TOEFL', p.toeflTotal, 'toeflTotal']);
    if (p.englishTest === 'pte-academic' && p.pteOverall !== undefined) facts.push(['PTE', p.pteOverall, 'pteOverall']);
    if (p.englishTest === 'duolingo' && p.duolingoOverall !== undefined) facts.push(['Duolingo', p.duolingoOverall, 'duolingoOverall']);
    if (p.graduateTest === 'gre' && p.greQuant) facts.push(['GRE', `V${p.greVerbal ?? '–'} Q${p.greQuant}`, 'greQuant']);
    if (p.graduateTest === 'gmat' && p.gmatTotal) facts.push(['GMAT', p.gmatTotal, 'gmatTotal']);
    if (p.graduateTest === 'gre' && p.greQuant) facts[facts.length - 1][1] += ` · AWA ${p.greWriting ?? '–'}`;
    // SSC and HSC are separate certificates (Dakhil/Alim for Madrasah; Diploma for polytechnic students).
    const secondaryName = p.secondarySystem === 'madrasah' ? 'Dakhil' : 'SSC';
    const higherName = p.secondarySystem === 'madrasah' ? 'Alim' : p.secondarySystem === 'polytechnic' ? 'Diploma' : 'HSC';
    if (p.sscGpa !== undefined) facts.push([secondaryName, `GPA ${gpa(p.sscGpa)} out of 5${p.sscYear ? ` (${p.sscYear})` : ''}`, 'sscGpa']);
    if (p.hscGpa !== undefined) facts.push([higherName, `GPA ${gpa(p.hscGpa)} out of 5${p.hscYear ? ` (${p.hscYear})` : ''}`, 'hscGpa']);
    if (p.oLevelResult) facts.push(['O Level', p.oLevelResult, 'oLevelResult']);
    if (p.aLevelResult) facts.push(['A Level', p.aLevelResult, 'aLevelResult']);
    const cgpa = (v, scale, year) => `${scale === '100' ? `${v}%` : `CGPA ${gpa(v)}${scale ? ` out of ${Number(scale).toFixed(scale === '10' ? 0 : 2)}` : ''}`}${year ? ` (${year})` : ''}`;
    if (p.bachelorCgpa !== undefined) facts.push(["Bachelor's", cgpa(p.bachelorCgpa, p.bachelorScale, p.bachelorYear), 'bachelorCgpa']);
    if (p.masterCgpa !== undefined) facts.push(["Master's", cgpa(p.masterCgpa, p.masterScale, p.masterYear), 'masterCgpa']);
    $('#profileFacts').innerHTML = facts.length
      ? `<h4>Scores at a glance</h4>${facts.map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}<p class="pf-verify-note">Upload your certificates in <button type="button" class="text-link" data-goto="documents">Upload documents</button> to fill these in automatically.</p>`
      : '<h4>Scores at a glance</h4><div><span>Tip</span><b>Add your results and test scores below.</b></div>';
    $('#profileFacts').querySelector('[data-goto]')?.addEventListener('click', () => showView('documents'));
  }
  // view: which profile page to show — overview (default), account, goals, academic, tests, personal or security.
  async function openProfile(view = 'overview') {
    if (!state.user) return showAuth('login');
    if (typeof view !== 'string') view = 'overview';
    // Re-opening while open with unsaved edits just switches page, keeping the edits.
    if ($('#profilePanel') && !$('#profilePanel').hidden && dirty) { showView(view); $(`#pf-tab-${currentView}`).focus(); return; }
    let data;
    try { await loadOptions(); data = await api('/api/profile'); } catch (e) { toast(e.message); return; }
    profileMarkup();
    const values = { ...data.profile, name: data.user.name, email: data.user.email, preferred_language: data.user.preferred_language };
    const form = $('#profileForm');
    form.innerHTML = SECTIONS.map(s => `<section class="admin-box pf-card pf-view" id="pf-view-${s.id}" role="tabpanel" aria-labelledby="pf-tab-${s.id}" hidden>${fieldsHtml(s.fields, values)}</section>`).join('')
      + `<div class="pf-savebar" hidden><span id="profileMessage" class="form-message" role="status"></span><button type="submit" class="button button-primary" id="profileSave">Save changes</button></div>`;
    const email = form.querySelector('[name=email]'); email.readOnly = true; email.closest('[data-item]').querySelector('.pf-hint')?.remove();
    email.insertAdjacentHTML('afterend', '<small class="pf-hint">Email cannot be changed here.</small>');
    form.querySelector('[data-item="phone"] input').required = false;
    bindForm(form); form.onsubmit = saveProfile;
    dirty = false;
    renderSummary(data.user, data.profile, data.completeness, data.card);
    $('#profilePanel').hidden = false; document.body.classList.add('drawer-open');
    state.profileCompleteness = data.completeness.percent;
    showView(view);
    $(`#pf-tab-${currentView}`).focus({ preventScroll: true });
  }
  function markDirty() { if (dirty) return; dirty = true; $('#profileMessage').textContent = 'You have unsaved changes.'; }
  function closeProfile() {
    const p = $('#profilePanel'); if (!p || p.hidden) return;
    if (dirty && !confirm('You have unsaved profile changes. Close without saving?')) return;
    dirty = false; p.hidden = true; document.body.classList.remove('drawer-open');
  }
  async function saveProfile(e) {
    e.preventDefault(); const form = e.currentTarget; clearErrors(form); $('#profileMessage').textContent = '';
    if (!validate($(`#pf-view-${currentView}`) || form)) return;
    const values = readValues(form); const profile = {};
    Object.entries(values).forEach(([k, v]) => { if (!ACCOUNT_KEYS.has(k) && k !== 'email') profile[k] = v; });
    const button = $('#profileSave'); button.disabled = true;
    try {
      const data = await api('/api/profile', { method: 'PUT', body: JSON.stringify({ name: values.name, preferred_language: values.preferred_language, profile }) });
      state.user = data.user; state.profileCompleteness = data.completeness.percent; updateUserUI(); renderSummary(data.user, data.profile, data.completeness);
      dirty = false; $('#profileMessage').textContent = data.message; toast('Profile saved.');
    } catch (err) {
      $('#profileMessage').textContent = err.message;
      // An error may belong to another page: switch to it before highlighting.
      const first = Object.keys(err.data?.fieldErrors || {})[0]; const view = first && viewOfField(first);
      if (view && view !== currentView) showView(view);
      showErrors(form, err.data?.fieldErrors)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    finally { button.disabled = false; }
  }
  async function changePassword(e) {
    e.preventDefault(); const form = e.currentTarget; clearErrors(form); $('#passwordMessage').textContent = '';
    if (!validate(form)) return;
    try {
      const data = await api('/api/profile/password', { method: 'POST', body: JSON.stringify({ currentPassword: form.currentPassword.value, newPassword: form.newPassword.value }) });
      form.reset(); form.newPassword._meter?.update(); $('#passwordMessage').textContent = data.message;
    } catch (err) { $('#passwordMessage').textContent = err.message; showErrors(form, err.data?.fieldErrors); }
  }
  async function deleteAccount(e) {
    e.preventDefault(); const form = e.currentTarget;
    if (!confirm('Delete your Pothik account and all saved data permanently?')) return;
    try {
      const data = await api('/api/profile', { method: 'DELETE', body: JSON.stringify({ password: form.password.value }) });
      dirty = false; closeProfile(); state.user = null; state.roadmaps = []; state.chatHistory = []; updateUserUI(); toast(data.message);
    } catch (err) { $('#deleteMessage').textContent = err.message; }
  }

  // ---------- Admission chances ----------
  let checks = []; let checksLoaded = false;
  // ---------- Step-by-step picker: Country → University → Degree → Programme ----------
  let countryBox = null; let uniBox = null; let progBox = null; let countries = []; let uniRequest = 0;
  const initials = name => esc(String(name).split(/[\s-]+/).filter(w => w && !/^(of|the|and|for|de|di|der|du|la|le)$/i.test(w)).slice(0, 3).map(w => w[0]).join('').toUpperCase() || '?');
  const logoHtml = (domain, name) => `<span class="cb-logo">${domain ? `<img src="/api/logos/${encodeURIComponent(domain)}" alt="" loading="lazy" width="28" height="28">` : ''}<span class="cb-initials">${initials(name)}</span></span>`;
  const countryIcon = code => `<span class="cb-flag" aria-hidden="true">${flagHtml(String(code).toLowerCase(), code)}</span>`;
  function updateSteps() {
    const done = { country: Boolean(countryBox?.selected), degree: Boolean(countryBox?.selected && $('#chanceForm [name=degree]').value), university: Boolean(uniBox?.value), program: Boolean(progBox?.value) };
    $$('#chanceForm .ch-steps li').forEach(li => { li.classList.toggle('is-done', done[li.dataset.step]); });
  }
  async function setupChanceDropdowns() {
    countryBox = Combobox({ input: $('#chanceForm [name=country]'), emptyText: 'No country matches', groupOrder: ['Your preferred countries', 'All destinations'], onSelect: c => { onCountry(c); updateSteps(); } });
    uniBox = Combobox({ input: $('#chanceForm [name=university]'), allowFree: true, freeLabel: q => `Use “${q}” (not in the list)`, groupOrder: ['Popular choices', 'All universities'], onSelect: u => { onUniversity(u); updateSteps(); } });
    progBox = Combobox({ input: $('#chanceForm [name=program]'), allowFree: true, freeLabel: q => `Use “${q}”`, groupOrder: ['On the official website', 'Suggested by AI — not verified'], onSelect: () => updateSteps() });
    try { countries = (await api('/api/countries')).countries; } catch { countries = []; }
    orderCountries();
  }
  // The student's preferred countries (from their profile) come first.
  function orderCountries() {
    if (!countryBox || !countries.length) return;
    const preferred = new Set(lastProfile.preferredCountries || []);
    countryBox.setItems([...countries].sort((a, b) => (preferred.has(b.slug) - preferred.has(a.slug)) || a.name.localeCompare(b.name)).map(c => ({
      value: c.slug, label: c.name, icon: countryIcon(c.code), keywords: [c.code, c.slug], group: preferred.has(c.slug) ? 'Your preferred countries' : 'All destinations'
    })), { keepValue: true });
    $('#countryHint').textContent = preferred.size ? 'Your preferred countries are listed first.' : '';
  }
  async function onCountry(c) {
    uniBox.clear(); progBox.clear(); progBox.setItems([]); progBox.setDisabled(true, 'Choose a university first'); $('#programHint').textContent = ''; catalog = null; catalogFor = '';
    allUniversities = [];
    if (!c) { uniBox.setItems([]); uniBox.setDisabled(true, 'Choose a country first'); $('#universityHint').textContent = ''; return; }
    if (c.free) { uniBox.setItems([]); uniBox.setDisabled(false, 'Type the university name'); $('#universityHint').textContent = 'Type the university name.'; return; }
    const ticket = ++uniRequest;
    const where = /^(United States|United Kingdom|Netherlands)$/.test(c.label) ? `the ${c.label}` : c.label;
    uniBox.setDisabled(true, `Loading universities in ${where}…`);
    $('#universityHint').innerHTML = `<span class="ch-spinner ch-spinner-sm" aria-hidden="true"></span> Loading universities in ${esc(where)}…`;
    try {
      const d = await api(`/api/universities?country=${encodeURIComponent(c.value)}`);
      if (ticket !== uniRequest) return;
      allUniversities = d.universities; universityWhere = where;
      uniBox.setDisabled(false);
      renderUniversityItems();
      setTimeout(() => uniBox.input.focus(), 0);
    } catch (err) { if (ticket === uniRequest) { allUniversities = []; uniBox.setItems([]); uniBox.setDisabled(false, 'Type the university name'); $('#universityHint').textContent = err.message; } }
  }
  // Only universities that can offer the chosen degree level. A known programme list beats the name-based guess.
  let allUniversities = []; let universityWhere = '';
  // Programme lists cover bachelor's and master's only (doctorates are rarely listed as programmes),
  // so for other levels rely on the institution type.
  const LISTED_LEVELS = ['bachelor', 'master'];
  // No level data (e.g. an older cached response) → assume it may offer every level rather than hiding it.
  const offers = (u, degree) => (u.programmeCounts && LISTED_LEVELS.includes(degree) ? (u.programmeCounts[degree] || 0) > 0 : (!Array.isArray(u.levels) || u.levels.includes(degree)));
  function renderUniversityItems() {
    if (!uniBox || !allUniversities.length) return;
    const degree = $('#chanceForm [name=degree]').value; const label = DEGREE_LABEL[degree] || degree;
    const fits = allUniversities.filter(u => offers(u, degree));
    uniBox.setItems(fits.map(u => {
      const count = u.programmeCounts?.[degree];
      return {
        value: u.name, label: u.name, sub: [u.abbr, u.aka, u.region, u.domain].filter(Boolean).join(' · '), icon: logoHtml(u.domain, u.name),
        badge: count ? `${count} ${label}` : '', badgeTone: 'ok',
        keywords: [u.abbr, u.aka, u.domain].filter(Boolean), group: u.featured ? 'Popular choices' : 'All universities', data: u
      };
    }), { keepValue: true });
    // If the chosen university does not offer this level, clear it (and the programme).
    const chosen = uniBox.selected;
    if (chosen && !chosen.free && !fits.some(u => u.name === chosen.value)) { uniBox.clear(); onUniversity(null); toast(`${chosen.label} is not listed for ${label} programmes — please choose another university.`); }
    const hidden = allUniversities.length - fits.length;
    uniBox.setDisabled(false, `Search ${fits.length.toLocaleString('en')} universities in ${universityWhere}…`);
    $('#universityHint').textContent = `${fits.length.toLocaleString('en')} universities in ${universityWhere} offer ${label} programmes${hidden ? ` (${hidden.toLocaleString('en')} hidden, e.g. ${degree === 'phd' ? 'universities of applied sciences and colleges' : 'community and technical colleges'})` : ''}. Search by name or abbreviation${allUniversities.find(u => u.abbr) ? ` (e.g. ${allUniversities.find(u => u.abbr).abbr})` : ''}.`;
    updateSteps();
  }
  function onUniversity(u) {
    progBox.clear(); catalog = null; catalogFor = '';
    if (!u) { progBox.setItems([]); progBox.setDisabled(true, 'Choose a university first'); $('#programHint').textContent = ''; return; }
    loadCatalog(u.value, u.data?.domain || '');
  }
  // Programme catalogue for the chosen university (from /api/admissions/programs, refreshed daily on the server).
  let catalog = null; let catalogFor = ''; let catalogRequest = 0;
  async function loadCatalog(name, domain = '') {
    name = String(name || '').trim();
    if (name.length < 3 || name.toLowerCase() === catalogFor.toLowerCase()) return;
    catalogFor = name; catalog = null; const ticket = ++catalogRequest;
    progBox.setItems([]); progBox.setDisabled(true, 'Loading programmes…');
    $('#programHint').innerHTML = `<span class="ch-spinner ch-spinner-sm" aria-hidden="true"></span> Loading programmes at ${esc(name)} from the web… the first time can take about 30 seconds.`;
    try {
      const d = await api(`/api/admissions/programs?university=${encodeURIComponent(name)}${domain ? `&domain=${encodeURIComponent(domain)}` : ''}`);
      if (ticket !== catalogRequest) return; // a newer university was chosen meanwhile
      catalog = d; progBox.setDisabled(false, 'Search programmes…'); renderProgramOptions();
      setTimeout(() => progBox.input.focus(), 0);
    } catch (err) { if (ticket === catalogRequest) { progBox.setDisabled(false, 'Type the programme name'); $('#programHint').textContent = `${err.message}`; catalogFor = ''; } }
  }
  function renderProgramOptions() {
    if (!catalog || !progBox) return;
    const degree = $('#chanceForm [name=degree]').value;
    const all = catalog.programs || [];
    const matching = all.filter(p => p.degree === degree);
    // Remember real counts so the university list can show / filter by them.
    const degreeCounts = {}; all.forEach(p => { degreeCounts[p.degree] = (degreeCounts[p.degree] || 0) + 1; });
    const uni = allUniversities.find(u => u.name === uniBox?.value); if (uni && all.length) uni.programmeCounts = degreeCounts;
    // No programmes at the chosen level: say so plainly instead of listing other degrees.
    if (all.length && !matching.length && degree === 'phd') {
      progBox.setItems([], { keepValue: true });
      $('#programHint').innerHTML = `<span class="ch-warn ch-info">${ICONS.info}<span><b>Doctorates are usually arranged with a supervisor rather than chosen from a programme list.</b> Type your research area or doctoral programme (e.g. "PhD in Informatics"), then check your chances.</span></span>`;
      return;
    }
    if (all.length && !matching.length) {
      const label = DEGREE_LABEL[degree] || degree;
      const other = Object.entries(degreeCounts).map(([d, n]) => `${n} ${DEGREE_LABEL[d] || d}`).join(', ');
      progBox.setItems([], { keepValue: true });
      $('#programHint').innerHTML = `<span class="ch-warn">${ICONS.alert}<span><b>No ${esc(label)} programmes found at ${esc(catalog.university)}.</b> Its list has ${esc(other)}. Choose another university, change the degree level, or type the programme if you know it exists.</span></span>`;
      return;
    }
    const shown = matching;
    // Verified (read from the official site) first, then AI suggestions clearly marked.
    progBox.setItems(shown.map(p => ({
      value: p.name, label: p.name, sub: [DEGREE_LABEL[p.degree] || '', p.language].filter(Boolean).join(' · '),
      badge: p.verified === false ? 'AI suggestion' : 'Official', badgeTone: p.verified === false ? 'warn' : 'ok',
      group: p.verified === false ? 'Suggested by AI — not verified' : 'On the official website', keywords: [p.language]
    })), { keepValue: true });
    const verifiedCount = shown.filter(p => p.verified !== false).length; const suggestedCount = shown.length - verifiedCount;
    const source = catalog.sources?.[0];
    const where = { 'web-search': 'via Google Search', 'official-pages': 'from the official website', 'official-pages+ai': 'from the official website', 'ai-knowledge': '' }[catalog.mode] ?? '';
    const counts = catalog.mode === 'ai-knowledge'
      ? `${shown.length} programme${shown.length === 1 ? '' : 's'} suggested by AI (not verified — the official site could not be read)`
      : `${verifiedCount} verified ${where}${suggestedCount ? ` + ${suggestedCount} suggested by AI (not verified)` : ''}`;
    $('#programHint').innerHTML = all.length
      ? `${matching.length ? `${esc(DEGREE_LABEL[degree] || degree)} programmes` : 'Programmes'} at ${esc(catalog.university)}: ${esc(counts)}. Start typing or pick from the list. Updated ${esc(formatDate(catalog.fetchedAt))}${source ? ` · <a href="${esc(source.uri)}" target="_blank" rel="noopener noreferrer">official list</a>` : ''}${catalog.refreshing ? ' · refreshing today’s list' : ''}.${!matching.length ? ` No ${esc(DEGREE_LABEL[degree] || degree)} programmes were found, so all are shown.` : ''}`
      : `No programme list found for ${esc(catalog.university)} — type the programme name instead.`;
  }
  const BAND_CLASS = { Strong: 'strong', Possible: 'possible', Reach: 'reach', Unlikely: 'unlikely', 'Not yet eligible': 'pending' };
  const BAND_ORDER = ['Strong', 'Possible', 'Reach', 'Not yet eligible', 'Unlikely'];
  const STATUS_ICON = { meets: ['check', 'ok', 'Meets'], above: ['check', 'ok', 'Above'], below: ['x', 'bad', 'Below'], missing: ['alert', 'warn', 'Missing'], pending: ['clock', 'warn', 'Pending'], unknown: ['help', 'muted', 'Unknown'], caution: ['alert', 'warn', 'Note'], info: ['info', 'muted', 'Info'] };
  const MODE_LABEL = { 'web-search': ['ok', 'Checked with Google Search'], 'official-pages': ['ok', "Read from the university's official pages"], 'ai-knowledge': ['warn', 'Not verified — AI general knowledge only'] };
  const DEGREE_LABEL = { master: "Master's", phd: 'PhD', bachelor: "Bachelor's", foundation: 'Foundation', diploma: 'Diploma' };
  const STEPS_TEXT = ['Finding the official programme pages…', 'Reading the admission requirements…', 'Comparing them with your profile…', 'Writing your personal summary…'];
  const bandChip = a => `<span class="ch-band ch-band-${BAND_CLASS[a.band] || 'pending'}">${esc(a.band)}</span>`;
  function nextDeadline(req) {
    const today = new Date().toISOString().slice(0, 10);
    const d = (req.deadlines || []).filter(x => x.date && x.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
    return d ? `${formatDate(d.date)}${d.intake ? ` · ${d.intake}` : ''}` : '';
  }
  async function loadChecks() {
    try { checks = (await api('/api/admissions')).checks; checksLoaded = true; renderChecks(); }
    catch (e) { $('#chanceList').innerHTML = `<p class="ch-empty">${esc(e.message)}</p>`; }
  }
  function renderChecks() {
    $('#chanceCount').textContent = checks.length ? `${checks.length} programme${checks.length === 1 ? '' : 's'}` : '';
    if (!checks.length) { $('#chanceList').innerHTML = '<p class="ch-empty">No programmes checked yet. Search for one above — every result is saved here so you can compare them.</p>'; return; }
    const sorted = [...checks].sort((a, b) => BAND_ORDER.indexOf(a.assessment.band) - BAND_ORDER.indexOf(b.assessment.band));
    $('#chanceList').innerHTML = `<table class="ch-table"><thead><tr><th>Programme</th><th>Chance</th><th>Next deadline</th><th>Checked</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>${sorted.map(c => `<tr>
      <td data-label="Programme"><b>${esc(c.university)}</b><small>${esc(c.program)} · ${esc(DEGREE_LABEL[c.degree] || c.degree)}</small></td>
      <td data-label="Chance">${bandChip(c.assessment)}<small>${esc(c.assessment.potential ? `then ${c.assessment.potential.band.toLowerCase()} (${c.assessment.potential.range})` : c.assessment.range)}</small></td>
      <td data-label="Next deadline">${esc(nextDeadline(c.requirements) || '—')}</td>
      <td data-label="Checked">${esc(formatDate(c.fetchedAt))}</td>
      <td class="ch-row-actions"><button type="button" class="text-link" data-view-check="${c.id}">View</button><button type="button" class="icon-button" data-recheck="${c.id}" title="Re-check from the web" aria-label="Re-check ${esc(c.university)}">${ICONS.refresh}</button><button type="button" class="icon-button" data-remove-check="${c.id}" title="Remove from shortlist" aria-label="Remove ${esc(c.university)}">${ICONS.trash}</button></td>
    </tr>`).join('')}</tbody></table>`;
  }
  function requirementRows(r, a) {
    const ac = r.academic || {}; const en = r.english || {};
    const grade = ac.german_grade_max ? `German grade ${ac.german_grade_max} or better` : ac.min_gpa ? `${ac.min_gpa}${ac.gpa_scale ? ` out of ${ac.gpa_scale}` : ''}` : ac.min_percentage ? `${ac.min_percentage}%` : '';
    const english = [en.ielts_overall && `IELTS ${en.ielts_overall}${en.ielts_min_band ? ` (each section ${en.ielts_min_band}+)` : ''}`, en.toefl_ibt && `TOEFL iBT ${en.toefl_ibt}`, en.pte && `PTE ${en.pte}`, en.duolingo && `Duolingo ${en.duolingo}`, en.moi_accepted === true && 'MOI letter accepted', en.moi_accepted === false && 'MOI letter not accepted'].filter(Boolean).join(' · ');
    const testText = (name, g) => g?.status && g.status !== 'unknown' ? `${name} ${g.status.replace('_', ' ')}${[g.min_quant && `Quant ${g.min_quant}+`, g.min_verbal && `Verbal ${g.min_verbal}+`, g.min_writing && `Writing ${g.min_writing}+`].filter(Boolean).map((t, i) => `${i ? ', ' : ' — '}${t}`).join('')}` : '';
    const tuition = r.tuition?.amount ? `${Number(r.tuition.amount).toLocaleString('en')} ${r.tuition.currency || ''}${r.tuition.period ? ` ${/^per /.test(r.tuition.period) ? r.tuition.period : `per ${r.tuition.period}`}` : ''}` : '';
    const rows = [
      ['Minimum grade', grade, ac.notes, a.germanEquivalent ? `Your result ≈ German grade ${a.germanEquivalent} (Modified Bavarian formula)` : ''],
      ['English', english, en.notes],
      ['GRE / GMAT', [testText('GRE', r.gre), testText('GMAT', r.gmat)].filter(Boolean).join(' · '), [r.gre?.notes, r.gmat?.notes].filter(Boolean).join(' ')],
      ['Work experience', r.work_experience_months ? `${r.work_experience_months} months` : ''],
      ['Deadlines', (r.deadlines || []).filter(d => d.date || d.label).map(d => `${d.intake ? `${d.intake}: ` : ''}${d.date ? formatDate(d.date) : ''}${d.label ? ` (${d.label})` : ''}`).join('\n')],
      ['Tuition', tuition, r.tuition?.notes],
      ['Apply via', r.application_portal],
      ['Teaching language', r.language_of_instruction],
      ['Other requirements', (r.other_requirements || []).join('\n')]
    ];
    return rows.filter(([, v, n]) => v || n).map(([k, v, n, hint]) => `<div><dt>${esc(k)}</dt><dd>${v ? `<b>${esc(v)}</b>` : '<span class="id-empty">Not published</span>'}${n ? `<small>${esc(n)}</small>` : ''}${hint ? `<small class="ch-hint">${esc(hint)}</small>` : ''}</dd></div>`).join('');
  }
  function renderResult(c) {
    const a = c.assessment; const r = c.requirements; const mode = MODE_LABEL[r.research_mode] || MODE_LABEL['official-pages'];
    const stale = c.summaryAssessment && c.summaryAssessment !== a.band;
    $('#chanceResult').innerHTML = `<article class="admin-box pf-card ch-result" aria-label="Admission estimate for ${esc(c.university)}">
      <header class="ch-head"><div><div class="ch-eyebrow">${esc(DEGREE_LABEL[c.degree] || c.degree)}${r.country ? ` · ${esc(r.country)}` : ''}${r.city ? ` · ${esc(r.city)}` : ''}</div><h3>${esc(c.university)}</h3><p>${esc(c.program)}</p></div>
        <div class="ch-head-actions">${r.official_url ? `<a class="button pf-back" href="${esc(r.official_url)}" target="_blank" rel="noopener noreferrer">${ICONS.link}<span>Official page</span></a>` : ''}<button type="button" class="button pf-back" data-recheck="${c.id}">${ICONS.refresh}<span>Re-check</span></button></div></header>
      <div class="ch-meta"><span class="ch-mode ch-mode-${mode[0]}">${ICONS[mode[0] === 'ok' ? 'check' : 'alert']}${esc(mode[1])}</span><span>Requirements checked ${esc(formatDate(c.fetchedAt))}</span><span>Confidence: ${esc(a.confidence)}</span></div>
      <div class="ch-verdict ch-verdict-${BAND_CLASS[a.band] || 'pending'}"><div class="ch-verdict-main"><span>Estimated chance</span><b>${esc(a.band)}</b><em>${esc(a.range)}</em></div>${a.potential ? `<div class="ch-potential"><span>${esc(a.potential.label)}</span><b>${esc(a.potential.band)}</b><em>${esc(a.potential.range)}</em></div>` : ''}</div>
      <div class="ch-cols">
        <section><h4>How you compare</h4><ul class="ch-factors">${a.factors.map(f => { const [ic, tone, word] = STATUS_ICON[f.status] || STATUS_ICON.info; return `<li class="ch-f-${tone}"><span class="ch-f-icon" title="${word}">${ICONS[ic]}</span><div><b>${esc(f.label)}</b><p>${esc(f.detail)}</p></div></li>`; }).join('')}</ul></section>
        <section><h4>What to do next</h4>${a.actions.length ? `<ol class="ch-actions">${a.actions.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : '<p class="ch-empty">You meet everything we could check. Prepare a strong statement of purpose and references, and apply before the deadline.</p>'}</section>
      </div>
      <section><h4>Requirements</h4><dl class="ch-req">${requirementRows(r, a)}</dl></section>
      ${c.summary ? `<section class="ch-summary"><h4>Counsellor summary</h4><div id="chanceSummary"></div>${stale ? '<p class="ch-stale">Your profile has changed since this summary was written. Re-check for an updated summary — the estimate above is already up to date.</p>' : ''}</section>` : ''}
      <section><h4>Sources</h4>${c.sources?.length ? `<ul class="ch-sources">${c.sources.map(s => `<li><a href="${esc(s.uri)}" target="_blank" rel="noopener noreferrer">${ICONS.link}${esc(s.title || s.uri)}</a></li>`).join('')}</ul>` : '<p class="ch-empty">No web sources were available for this check — confirm everything on the official page.</p>'}</section>
      <p class="ch-disclaimer">This is an estimate from the programme's published requirements and your self-reported profile. It is not an admission decision and is not based on historical admission data. Always confirm requirements on the official page before applying.</p>
    </article>`;
    if (c.summary) renderRichText($('#chanceSummary'), c.summary);
  }
  async function runCheck(body) {
    const button = $('#chanceSubmit'); button.disabled = true; $('#chanceMessage').textContent = '';
    let i = 0; $('#chanceStep').textContent = STEPS_TEXT[0]; $('#chanceProgress').hidden = false;
    const timer = setInterval(() => { i = Math.min(i + 1, STEPS_TEXT.length - 1); $('#chanceStep').textContent = STEPS_TEXT[i]; }, 7000);
    try {
      const d = await api('/api/admissions/check', { method: 'POST', body: JSON.stringify(body) });
      if (d.notFound) { $('#chanceMessage').textContent = d.message; return; }
      checks = [d, ...checks.filter(c => c.id !== d.id)]; checksLoaded = true;
      renderChecks(); renderResult(d); $('#chanceResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) { $('#chanceMessage').textContent = err.message; showErrors($('#chanceForm'), err.data?.fieldErrors); }
    finally { clearInterval(timer); $('#chanceProgress').hidden = true; button.disabled = false; }
  }
  function submitChance(e) {
    e.preventDefault(); const form = e.currentTarget; clearErrors(form);
    // Steps are filled in order; point to the first one that is missing.
    const missing = !countryBox?.value ? ['country', 'Choose a country'] : !uniBox?.value ? ['university', 'Choose or type a university'] : !progBox?.value ? ['program', 'Choose or type a programme'] : null;
    if (missing) { showErrors(form, { [missing[0]]: missing[1] }); form.querySelector(`[name=${missing[0]}]`).focus(); return; }
    if (!validate(form)) return;
    const country = countryBox.selected?.free ? countryBox.value : (countries.find(c => c.slug === countryBox.value)?.name || countryBox.value);
    runCheck({ university: uniBox.value, program: progBox.value, degree: form.degree.value, country });
  }
  async function onCheckAction(e) {
    const view = e.target.closest('[data-view-check]'); const recheck = e.target.closest('[data-recheck]'); const remove = e.target.closest('[data-remove-check]');
    const find = id => checks.find(c => String(c.id) === String(id));
    if (view) { renderResult(find(view.dataset.viewCheck)); $('#chanceResult').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    if (recheck) { const c = find(recheck.dataset.recheck); if (c) runCheck({ ...c.query, refresh: true }); }
    if (remove) {
      const c = find(remove.dataset.removeCheck); if (!c || !confirm(`Remove ${c.university} — ${c.program} from your shortlist?`)) return;
      try { await api(`/api/admissions/${c.id}`, { method: 'DELETE' }); checks = checks.filter(x => x.id !== c.id); renderChecks(); if ($('#chanceResult .ch-result') && $('#chanceResult [data-recheck]')?.dataset.recheck === String(c.id)) $('#chanceResult').innerHTML = ''; }
      catch (err) { toast(err.message); }
    }
  }

  // ---------- Document reading ----------
  const DOC_LABEL = { ssc: 'SSC certificate', hsc: 'HSC certificate', dakhil: 'Dakhil certificate', alim: 'Alim certificate', diploma: 'Polytechnic diploma', o_level: 'O Level results', a_level: 'A Level results', bachelor_transcript: "Bachelor's transcript", master_transcript: "Master's transcript", ielts: 'IELTS test report', toefl: 'TOEFL score report', pte: 'PTE score report', duolingo: 'Duolingo results', gre: 'GRE score report', gmat: 'GMAT score report', other: 'Document' };
  let docSuggestions = {};
  const displayValue = (k, v) => {
    if (v === undefined || v === null || v === '') return '';
    const f = FIELDS[k]; if (f?.type === 'select') return optionList(f).find(([o]) => o === String(v))?.[1] || String(v);
    return Array.isArray(v) ? v.join(', ') : String(v);
  };
  // ---------- One card per certificate ----------
  const DOC_SLOTS = [
    { id: 'ssc', title: 'SSC', sub: 'Secondary School Certificate · Dakhil · O Level', what: 'Board certificate, marksheet or academic transcript', icon: 'book',
      reads: 'GPA and passing year' },
    { id: 'hsc', title: 'HSC', sub: 'Higher Secondary Certificate · Alim · Diploma · A Level', what: 'Board certificate, marksheet or academic transcript', icon: 'book',
      reads: 'GPA and passing year' },
    { id: 'bachelor', title: "Bachelor's degree", sub: 'Degree certificate or academic transcript', what: 'Final transcript or degree certificate', icon: 'cap',
      reads: 'CGPA, grading scale, university and graduation year' },
    { id: 'ielts', title: 'IELTS', sub: 'Test Report Form (TRF)', what: 'The TRF PDF from the test centre, or a clear scan', icon: 'chart',
      reads: 'Overall band, section bands, module and test date' },
    { id: 'gre', title: 'GRE', sub: 'GRE General Test score report', what: 'The official score report PDF from your ETS account', icon: 'target',
      reads: 'Verbal, Quantitative and Analytical Writing scores' }
  ];
  const SLOT_SUMMARY = {
    ssc: v => [v.sscGpa !== undefined && `GPA ${Number(v.sscGpa).toFixed(2)}`, v.sscYear, v.oLevelResult].filter(Boolean).join(' · '),
    hsc: v => [v.hscGpa !== undefined && `GPA ${Number(v.hscGpa).toFixed(2)}`, v.hscYear, v.aLevelResult].filter(Boolean).join(' · '),
    bachelor: v => [v.bachelorCgpa !== undefined && `CGPA ${v.bachelorCgpa}${v.bachelorScale ? ` / ${v.bachelorScale}` : ''}`, v.bachelorInstitution, v.bachelorYear].filter(Boolean).join(' · '),
    ielts: v => [v.ieltsOverall !== undefined && `Overall ${Number(v.ieltsOverall).toFixed(1)}`, v.englishTest === 'ielts-general' ? 'General Training' : v.englishTest ? 'Academic' : '', v.englishTestDate].filter(Boolean).join(' · '),
    gre: v => [v.greVerbal && `V ${v.greVerbal}`, v.greQuant && `Q ${v.greQuant}`, v.greWriting !== undefined && `AWA ${v.greWriting}`].filter(Boolean).join(' · ')
  };
  let docSlots = {};
  async function loadDocSlots() {
    try { docSlots = (await api('/api/documents')).slots || {}; } catch { docSlots = {}; }
    renderDocSlots();
  }
  function renderDocSlots() {
    $('#docSlots').innerHTML = DOC_SLOTS.map(s => {
      const r = docSlots[s.id]; const tone = r ? 'ok' : 'none';
      const summary = r ? SLOT_SUMMARY[s.id]?.(r.values || {}) : '';
      return `<article class="doc-slot doc-slot-${tone}" data-slot="${s.id}">
        <header><span class="doc-slot-icon">${ICONS[s.icon]}</span><div><h4>${esc(s.title)}</h4><small>${esc(s.sub)}</small></div><span class="doc-slot-status">${r ? ICONS.check : ''}${r ? 'Uploaded' : 'Not uploaded'}</span></header>
        ${r ? `<p class="doc-slot-values">${esc(summary || 'Results read')}</p><p class="doc-slot-meta">Uploaded ${esc(formatDate(r.uploadedAt))}</p>`
          : `<p class="doc-slot-what">${esc(s.what)}</p><p class="doc-slot-meta">We read: ${esc(s.reads)}</p>`}
        <div class="doc-slot-actions">
          <label class="button ${r ? 'pf-back' : 'button-primary'} doc-slot-upload"><input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" data-slot-input="${s.id}">${ICONS.upload}<span>${r ? 'Replace' : 'Upload'}</span></label>
        </div>
      </article>`;
    }).join('');
  }
  async function uploadDocument(file, slot = 'other') {
    if (!file) return;
    $('#docMessage').textContent = ''; $('#docResult').innerHTML = '';
    if (!['application/pdf', 'image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { $('#docMessage').textContent = 'Upload a PDF, JPEG, PNG or WebP file.'; return; }
    if (file.size > 10 * 1024 * 1024) { $('#docMessage').textContent = 'The file must be under 10 MB.'; return; }
    const fd = new FormData(); fd.append('document', file);
    const title = DOC_SLOTS.find(s => s.id === slot)?.title;
    $('#docProgressTitle').textContent = title ? `Reading your ${title} document…` : 'Reading your document…';
    $('#docProgress').hidden = false; $('#docProgress').scrollIntoView({ behavior: 'smooth', block: 'center' });
    try { renderDocResult(await api(`/api/documents/read?slot=${encodeURIComponent(slot)}`, { method: 'POST', body: fd }), slot); loadDocSlots(); }
    catch (err) { $('#docMessage').textContent = err.message; }
    finally { $('#docProgress').hidden = true; }
  }
  function renderDocResult(d) {
    docSuggestions = d.suggestions || {};
    const doc = d.document || {}; const keys = Object.keys(docSuggestions);
    $('#docResult').innerHTML = `<div class="doc-found"><div class="doc-found-head">${ICONS.check}<div><b>${esc(DOC_LABEL[doc.document_type] || 'Document')}${doc.institution ? ` — ${esc(doc.institution)}` : ''}</b><small>${esc(d.message || '')}${doc.confidence ? ` Reading confidence: ${esc(doc.confidence)}.` : ''}</small></div></div>
      ${d.nameWarning ? `<p class="doc-warning">${ICONS.alert}${esc(d.nameWarning)}</p>` : ''}
      ${doc.notes ? `<p class="doc-note">${esc(doc.notes)}</p>` : ''}
      ${keys.length ? `<p class="doc-instruct">Tick the results to add to your profile. Check each value against your document first.</p>
      <table class="ch-table doc-table"><thead><tr><th><span class="sr-only">Apply</span></th><th>Field</th><th>Currently in profile</th><th>Found in document</th></tr></thead><tbody>${keys.map(k => `<tr><td><input type="checkbox" data-doc-key="${esc(k)}" checked aria-label="Apply ${esc(FIELDS[k]?.label || k)}"></td><td data-label="Field">${esc(FIELDS[k]?.label || k)}</td><td data-label="Currently">${esc(displayValue(k, lastProfile[k])) || '<span class="id-empty">Empty</span>'}</td><td data-label="Found"><b>${esc(displayValue(k, docSuggestions[k]))}</b></td></tr>`).join('')}</tbody></table>
      <button type="button" class="button button-primary" id="docApply">${ICONS.check}<span>Add selected to my profile</span></button>` : '<p class="ch-empty">We could not find results to add from this document. Try a clearer scan, or enter your results on the Academic background or Test scores page.</p>'}</div>`;
  }
  async function applyDocument() {
    if (dirty) { $('#docMessage').textContent = 'Save or discard your unsaved profile changes first.'; return; }
    const chosen = {}; $$('#docResult [data-doc-key]:checked').forEach(cb => { chosen[cb.dataset.docKey] = docSuggestions[cb.dataset.docKey]; });
    if (!Object.keys(chosen).length) { $('#docMessage').textContent = 'Tick at least one result to add.'; return; }
    try {
      await api('/api/profile', { method: 'PUT', body: JSON.stringify({ name: state.user.name, preferred_language: state.user.preferred_language || 'en', profile: { ...lastProfile, ...chosen } }) });
      await openProfile('documents');
      $('#docResult').innerHTML = ''; $('#docMessage').textContent = `Added ${Object.keys(chosen).length} result${Object.keys(chosen).length === 1 ? '' : 's'} to your profile. Your admission estimates update automatically.`;
      checksLoaded = false; loadDocSlots(); toast('Profile updated from your document.');
    } catch (err) { $('#docMessage').textContent = err.message; }
  }

  // ---------- Profile photo: zoom / reposition, then upload a 512px square ----------
  function renderAvatar(user) {
    const el = $('#profileAvatar'); const letter = user.name.trim()[0]?.toUpperCase() || 'P';
    if (user.avatar_url) { const img = document.createElement('img'); img.src = user.avatar_url; img.alt = `${user.name}'s profile photo`; img.onerror = () => { el.textContent = letter; }; el.replaceChildren(img); }
    else el.textContent = letter;
    $('#photoChange span').textContent = user.avatar_url ? 'Change photo' : 'Upload photo';
    $('#photoRemove').hidden = !user.avatar_url;
  }
  const VIEW = 300, OUTPUT = 512, MAX_ZOOM = 4;
  const crop = { bmp: null, base: 1, zoom: 1, x: 0, y: 0 };
  function cropperMarkup() {
    if ($('#cropModal')) return;
    document.body.insertAdjacentHTML('beforeend', `<div class="modal-backdrop pf-crop-backdrop" id="cropModal" hidden><section class="auth-modal pf-crop" role="dialog" aria-modal="true" aria-labelledby="cropTitle">
      <button class="modal-close" type="button" data-close-crop aria-label="Close">×</button>
      <h2 id="cropTitle">Adjust your photo</h2><p class="auth-subtitle">Drag to reposition. Use the slider, the +/− buttons or your mouse wheel to change the size.</p>
      <div class="pf-crop-stage"><canvas id="cropCanvas" width="${VIEW}" height="${VIEW}" tabindex="0" aria-label="Photo preview. Use arrow keys to move and + or − to zoom."></canvas></div>
      <div class="pf-zoom"><button type="button" class="icon-button" data-zoom="-1" aria-label="Make smaller">−</button>
        <input type="range" id="cropZoom" min="1" max="${MAX_ZOOM}" step="0.01" value="1" aria-label="Photo size"><button type="button" class="icon-button" data-zoom="1" aria-label="Make larger">+</button><span id="cropZoomLabel">100%</span></div>
      <div class="pf-actions"><button type="button" class="button pf-back" id="cropReset">Reset</button><button type="button" class="button button-primary" id="cropSave">Save photo</button></div>
      <div class="form-message" id="cropMessage" role="status"></div></section></div>`);
    const canvas = $('#cropCanvas');
    $('#cropModal').addEventListener('click', e => { if (e.target.id === 'cropModal' || e.target.closest('[data-close-crop]')) closeCropper(); });
    $('#cropZoom').addEventListener('input', e => setZoom(Number(e.target.value)));
    $('#cropModal').querySelectorAll('[data-zoom]').forEach(b => b.addEventListener('click', () => setZoom(crop.zoom + Number(b.dataset.zoom) * 0.2)));
    $('#cropReset').addEventListener('click', () => { crop.x = crop.y = 0; setZoom(1); });
    $('#cropSave').addEventListener('click', savePhoto);
    canvas.addEventListener('wheel', e => { e.preventDefault(); setZoom(crop.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08)); }, { passive: false });
    let drag = null;
    canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, ox: crop.x, oy: crop.y }; canvas.setPointerCapture(e.pointerId); canvas.classList.add('dragging'); });
    canvas.addEventListener('pointermove', e => {
      if (!drag) return; const k = VIEW / canvas.getBoundingClientRect().width;
      crop.x = drag.ox + (e.clientX - drag.x) * k; crop.y = drag.oy + (e.clientY - drag.y) * k; drawCrop();
    });
    const end = () => { drag = null; canvas.classList.remove('dragging'); };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('keydown', e => {
      const moves = { ArrowLeft: [-8, 0], ArrowRight: [8, 0], ArrowUp: [0, -8], ArrowDown: [0, 8] };
      if (moves[e.key]) { e.preventDefault(); crop.x += moves[e.key][0]; crop.y += moves[e.key][1]; drawCrop(); }
      if (e.key === '+' || e.key === '=') setZoom(crop.zoom + 0.1);
      if (e.key === '-') setZoom(crop.zoom - 0.1);
    });
  }
  // Keep the image covering the whole circle: limit how far it can be moved at the current size.
  function clampCrop() {
    const s = crop.base * crop.zoom; const mx = Math.max(0, (crop.bmp.width * s - VIEW) / 2); const my = Math.max(0, (crop.bmp.height * s - VIEW) / 2);
    crop.x = Math.min(mx, Math.max(-mx, crop.x)); crop.y = Math.min(my, Math.max(-my, crop.y));
  }
  function paint(ctx, size) {
    const k = size / VIEW; const s = crop.base * crop.zoom * k; const w = crop.bmp.width * s; const h = crop.bmp.height * s;
    ctx.clearRect(0, 0, size, size); ctx.fillStyle = '#f7f2e9'; ctx.fillRect(0, 0, size, size);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(crop.bmp, size / 2 + crop.x * k - w / 2, size / 2 + crop.y * k - h / 2, w, h);
  }
  function drawCrop() { clampCrop(); paint($('#cropCanvas').getContext('2d'), VIEW); }
  function setZoom(z) {
    crop.zoom = Math.min(MAX_ZOOM, Math.max(1, z));
    $('#cropZoom').value = crop.zoom; $('#cropZoomLabel').textContent = `${Math.round(crop.zoom * 100)}%`; drawCrop();
  }
  async function openCropper(file) {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return toast('Choose a PNG, JPEG or WebP image.');
    if (file.size > 15 * 1024 * 1024) return toast('That image is over 15 MB. Choose a smaller one.');
    try { crop.bmp = await createImageBitmap(file); } catch { return toast('Could not read that image. Try another file.'); }
    cropperMarkup();
    // Sharp preview on high-density screens; the drawing coordinates stay in VIEW units.
    const canvas = $('#cropCanvas'); const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = canvas.height = VIEW * dpr; canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    crop.base = Math.max(VIEW / crop.bmp.width, VIEW / crop.bmp.height); crop.x = crop.y = 0;
    $('#cropMessage').textContent = ''; $('#cropModal').hidden = false; setZoom(1); canvas.focus();
  }
  function closeCropper() { const m = $('#cropModal'); if (m) m.hidden = true; crop.bmp?.close?.(); crop.bmp = null; }
  async function savePhoto() {
    const out = document.createElement('canvas'); out.width = out.height = OUTPUT; paint(out.getContext('2d'), OUTPUT);
    const blob = await new Promise(r => out.toBlob(r, 'image/webp', 0.9)) || await new Promise(r => out.toBlob(r, 'image/jpeg', 0.9));
    if (!blob) { $('#cropMessage').textContent = 'Could not prepare the photo. Try again.'; return; }
    const fd = new FormData(); fd.append('photo', blob, `avatar.${blob.type === 'image/webp' ? 'webp' : 'jpg'}`);
    const button = $('#cropSave'); button.disabled = true; $('#cropMessage').textContent = 'Uploading…';
    try {
      const data = await api('/api/profile/photo', { method: 'POST', body: fd });
      state.user = data.user; updateUserUI(); renderAvatar(data.user); closeCropper(); toast(data.message);
    } catch (err) { $('#cropMessage').textContent = err.message; }
    finally { button.disabled = false; }
  }
  async function removePhoto() {
    if (!confirm('Remove your profile photo?')) return;
    try { const data = await api('/api/profile/photo', { method: 'DELETE' }); state.user = data.user; updateUserUI(); renderAvatar(data.user); toast(data.message); }
    catch (err) { toast(err.message); }
  }

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    // Let a searchable dropdown handle Esc first (close its list, then clear it).
    const t = e.target;
    if (t?.getAttribute?.('role') === 'combobox' && (t.getAttribute('aria-expanded') === 'true' || t.value)) return;
    // Close only the top-most layer: the photo editor sits above the profile page.
    if ($('#cropModal') && !$('#cropModal').hidden) { closeCropper(); e.stopImmediatePropagation(); return; }
    closeSignup(); closeProfile();
  }, true);
  Object.assign(window, { openSignup, closeSignup, openProfile, closeProfile });
})();
