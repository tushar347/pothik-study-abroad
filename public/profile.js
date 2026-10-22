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
    email: { label: 'Email address', type: 'email', required: true, autocomplete: 'email', maxlength: 180, placeholder: 'you@example.com' },
    password: { label: 'Password', type: 'password', required: true, minlength: 12, maxlength: 72, autocomplete: 'new-password', placeholder: 'At least 12 characters', hint: 'Use a long, unique password.' },
    phone: { label: 'Mobile / WhatsApp number', type: 'tel', required: true, autocomplete: 'tel', placeholder: '+880 1XXX-XXXXXX', pattern: '\\+?[0-9 \\(\\)\\-]{7,20}' }, // escaped for the `v` regex flag browsers use for pattern=
    preferred_language: { label: 'Preferred language', type: 'select', required: true, options: [['en', 'English'], ['bn', 'বাংলা (Bangla)']], hint: 'The AI counsellor replies in this language.' },

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
    else if (f.type === 'chips') control = `<div class="pf-chips" role="group" aria-labelledby="${id}">${optionList(f).map(([o, l]) => `<label class="pf-chip"><input type="checkbox" name="${name}" value="${esc(o)}" ${(v || []).includes(o) ? 'checked' : ''}><span>${esc(l)}</span></label>`).join('')}</div>`;
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
      for (const input of el.querySelectorAll('input,select,textarea')) if (!input.disabled && !input.checkValidity()) { input.reportValidity(); return false; }
    }
    return true;
  }

  // ---------- Signup wizard ----------
  let step = 0;
  function signupMarkup() {
    if ($('#signupModal')) return;
    document.body.insertAdjacentHTML('beforeend', `<div class="modal-backdrop" id="signupModal" hidden><section class="auth-modal signup-modal" role="dialog" aria-modal="true" aria-labelledby="signupTitle">
      <button class="modal-close" type="button" data-close-signup aria-label="Close">×</button>
      <div class="auth-brand"><img class="auth-logo" src="/assets/brand/pothik-logo-card.png" alt="Pothik — Your path to a brighter tomorrow" width="360" height="182"></div>
      <div class="pf-progress"><div class="pf-progress-meta"><span id="signupStepLabel"></span><button type="button" class="text-link" data-switch-login>Already have an account? Log in</button></div><div class="pf-progress-bar"><span id="signupProgress"></span></div></div>
      <h2 id="signupTitle"></h2><p class="auth-subtitle" id="signupSub"></p>
      <form id="signupForm" novalidate></form>
      <div class="auth-legal">Never enter passport, NID or bank account numbers. Pothik only stores what you see here, and you can delete your account at any time from your profile.</div>
    </section></div>`);
    $('#signupModal').addEventListener('click', e => { if (e.target.id === 'signupModal' || e.target.closest('[data-close-signup]')) closeSignup(); });
    $('[data-switch-login]').addEventListener('click', () => { closeSignup(); showAuth('login'); });
  }
  function renderStep() {
    const form = $('#signupForm');
    form.querySelectorAll('fieldset[data-step]').forEach(fs => { fs.hidden = Number(fs.dataset.step) !== step; });
    $('#signupTitle').textContent = STEPS[step].title; $('#signupSub').textContent = STEPS[step].sub;
    $('#signupStepLabel').textContent = `Step ${step + 1} of ${STEPS.length}`;
    $('#signupProgress').style.width = `${((step + 1) / STEPS.length) * 100}%`;
    $('#signupBack').hidden = step === 0;
    $('#signupShowPassword').closest('label').hidden = step !== 0;
    $('#signupNext').innerHTML = step === STEPS.length - 1 ? 'Create account <span>↗</span>' : 'Continue <span>→</span>';
    $('#signupModal .auth-modal').scrollTop = 0;
    form.querySelector(`fieldset[data-step="${step}"] input:not([type=checkbox]),fieldset[data-step="${step}"] select`)?.focus({ preventScroll: true });
  }
  async function openSignup() {
    try { await loadOptions(); } catch (e) { toast('Could not load the signup form. Check that the server is running.'); return; }
    signupMarkup();
    const form = $('#signupForm');
    form.innerHTML = STEPS.map((s, i) => `<fieldset data-step="${i}" hidden>${fieldsHtml(s.fields)}</fieldset>`).join('')
      + `<label class="remember-label pf-showpass"><input type="checkbox" id="signupShowPassword"> Show password</label>`
      + `<div class="pf-actions"><button type="button" class="button pf-back" id="signupBack">← Back</button><button type="submit" class="button button-primary" id="signupNext"></button></div><div id="signupMessage" class="form-message" role="status"></div>`;
    bindForm(form);
    $('#signupShowPassword').addEventListener('change', e => { form.querySelector('[name=password]').type = e.target.checked ? 'text' : 'password'; });
    $('#signupBack').addEventListener('click', () => { step = Math.max(0, step - 1); renderStep(); });
    form.onsubmit = submitSignup;
    step = 0; $('#signupModal').hidden = false; document.body.classList.add('drawer-open'); renderStep();
  }
  function closeSignup() { const m = $('#signupModal'); if (m) m.hidden = true; document.body.classList.remove('drawer-open'); }
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
      state.user = data.user; await loadRoadmaps(); updateUserUI(); closeSignup();
      toast(`Welcome to Pothik, ${state.user.name.split(' ')[0]}! Your profile is saved.`);
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
          <form id="profileForm" novalidate></form>
          <section class="admin-box pf-card pf-view" id="pf-view-security" role="tabpanel" aria-labelledby="pf-tab-security" hidden><h3>Change password</h3>
            <form id="passwordForm" novalidate><div class="pf-grid">${['currentPassword', 'newPassword'].map(n => `<label class="pf-field pf-half" data-item="${n}"><span class="pf-label">${n === 'currentPassword' ? 'Current password' : 'New password'}</span><input type="password" name="${n}" required ${n === 'newPassword' ? 'minlength="12" autocomplete="new-password"' : 'autocomplete="current-password"'} maxlength="72"><small class="pf-error"></small></label>`).join('')}</div>
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
  }
  function showView(id, { focusField } = {}) {
    const view = VIEWS.find(v => v.id === id) || VIEWS[0]; currentView = view.id;
    $$('#profilePanel .pf-view').forEach(el => { el.hidden = el.id !== `pf-view-${view.id}`; });
    $$('#profilePanel [role=tab]').forEach(t => { const on = t.dataset.view === view.id; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
    $('#profileViewTitle').textContent = view.heading || view.title; $('#profileViewDesc').textContent = view.desc;
    $('#profilePanel .pf-savebar').hidden = !FORM_VIEWS.has(view.id);
    $('#profilePanel').scrollTop = 0;
    const panel = $(`#pf-view-${view.id}`);
    const field = focusField && panel.querySelector(`[data-item="${CSS.escape(focusField)}"] input,[data-item="${CSS.escape(focusField)}"] select,[data-item="${CSS.escape(focusField)}"] textarea`);
    if (field) { field.focus({ preventScroll: true }); field.scrollIntoView({ block: 'center' }); }
  }
  let lastCard = null;
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
    lastCard = card;
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
    if (/^ielts/.test(p.englishTest || '') && p.ieltsOverall !== undefined) facts.push(['IELTS', [p.ieltsOverall, p.ieltsListening !== undefined ? `L${p.ieltsListening} R${p.ieltsReading ?? '–'} W${p.ieltsWriting ?? '–'} S${p.ieltsSpeaking ?? '–'}` : ''].filter(Boolean).join(' · ')]);
    if (p.englishTest === 'toefl-ibt' && p.toeflTotal !== undefined) facts.push(['TOEFL', p.toeflTotal]);
    if (p.englishTest === 'pte-academic' && p.pteOverall !== undefined) facts.push(['PTE', p.pteOverall]);
    if (p.englishTest === 'duolingo' && p.duolingoOverall !== undefined) facts.push(['Duolingo', p.duolingoOverall]);
    if (p.graduateTest === 'gre' && p.greQuant) facts.push(['GRE', `V${p.greVerbal ?? '–'} Q${p.greQuant}`]);
    if (p.graduateTest === 'gmat' && p.gmatTotal) facts.push(['GMAT', p.gmatTotal]);
    if (p.graduateTest === 'gre' && p.greQuant) facts[facts.length - 1][1] += ` · AWA ${p.greWriting ?? '–'}`;
    if (p.sscGpa !== undefined || p.hscGpa !== undefined) facts.push(['SSC / HSC', `${p.sscGpa ?? '–'} / ${p.hscGpa ?? '–'}`]);
    if (p.oLevelResult) facts.push(['O Level', p.oLevelResult]);
    if (p.aLevelResult) facts.push(['A Level', p.aLevelResult]);
    if (p.bachelorCgpa !== undefined) facts.push(["Bachelor's", `${p.bachelorCgpa}${p.bachelorScale ? ` / ${p.bachelorScale}` : ''}`]);
    if (p.masterCgpa !== undefined) facts.push(["Master's", `${p.masterCgpa}${p.masterScale ? ` / ${p.masterScale}` : ''}`]);
    $('#profileFacts').innerHTML = facts.length ? `<h4>Scores at a glance</h4>${facts.map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}` : '<h4>Scores at a glance</h4><div><span>Tip</span><b>Add your results and test scores below.</b></div>';
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
      form.reset(); $('#passwordMessage').textContent = data.message;
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
    // Close only the top-most layer: the photo editor sits above the profile page.
    if ($('#cropModal') && !$('#cropModal').hidden) { closeCropper(); e.stopImmediatePropagation(); return; }
    closeSignup(); closeProfile();
  }, true);
  Object.assign(window, { openSignup, closeSignup, openProfile, closeProfile });
})();
