// Student profile: option lists, validation and completeness, shared by signup, the profile page and the counsellor.
const { z } = require('zod');

const OPTIONS = {
  gender: [['female', 'Female'], ['male', 'Male'], ['other', 'Another identity'], ['prefer-not', 'Prefer not to say']],
  targetDegree: [['foundation', 'Foundation / pathway'], ['diploma', 'Diploma'], ['bachelor', "Bachelor's"], ['master', "Master's"], ['phd', 'PhD / doctorate'], ['language', 'Language course']],
  currentStatus: [
    ['hsc-student', 'Studying HSC / A Level'], ['hsc-completed', 'Completed HSC / A Level'],
    ['undergrad-student', "Studying bachelor's"], ['bachelor-completed', "Completed bachelor's"],
    ['master-student', "Studying master's"], ['master-completed', "Completed master's"], ['working', 'Working professional']
  ],
  secondarySystem: [
    ['national-bangla', 'National curriculum (Bangla medium)'], ['national-english', 'National curriculum (English version)'],
    ['english-medium', 'O / A Level (Cambridge / Edexcel)'], ['madrasah', 'Madrasah (Dakhil / Alim)'],
    ['ib', 'International Baccalaureate'], ['polytechnic', 'Polytechnic diploma'], ['other', 'Other']
  ],
  countries: [
    ['germany', 'Germany'], ['canada', 'Canada'], ['usa', 'United States'], ['uk', 'United Kingdom'], ['australia', 'Australia'],
    ['ireland', 'Ireland'], ['netherlands', 'Netherlands'], ['sweden', 'Sweden'], ['finland', 'Finland'], ['france', 'France'],
    ['italy', 'Italy'], ['hungary', 'Hungary'], ['japan', 'Japan'], ['south-korea', 'South Korea'], ['malaysia', 'Malaysia'],
    ['new-zealand', 'New Zealand'], ['china', 'China'], ['undecided', 'Not decided yet']
  ],
  intakeSeason: [['spring', 'Spring (Jan–Apr)'], ['summer', 'Summer (May–Jul)'], ['fall', 'Fall / Autumn (Aug–Oct)'], ['winter', 'Winter (Nov–Dec)']],
  budget: [
    ['under-10l', 'Under 10 lakh BDT / year'], ['10-20l', '10–20 lakh BDT / year'], ['20-35l', '20–35 lakh BDT / year'],
    ['35-50l', '35–50 lakh BDT / year'], ['50l-plus', 'Over 50 lakh BDT / year'], ['scholarship-only', 'Only with a full scholarship']
  ],
  fundingSource: [['family', 'Family / personal savings'], ['scholarship', 'Scholarship or assistantship'], ['loan', 'Education loan'], ['employer', 'Employer sponsorship'], ['mixed', 'A mix of these']],
  cgpaScale: [['4', 'out of 4.00'], ['5', 'out of 5.00'], ['10', 'out of 10'], ['100', 'percentage (100)']],
  englishTest: [
    ['ielts-academic', 'IELTS Academic'], ['ielts-ukvi', 'IELTS for UKVI (Academic)'], ['ielts-general', 'IELTS General Training'],
    ['toefl-ibt', 'TOEFL iBT'], ['pte-academic', 'PTE Academic'], ['duolingo', 'Duolingo English Test'],
    ['moi', 'Medium of Instruction (MOI) letter'], ['planned', 'Not taken yet — planning to'], ['none', 'Not planning a test yet']
  ],
  toeflScale: [['new', 'New 1–6 band scale (tests from 21 Jan 2026)'], ['old', 'Old 0–120 scale']],
  graduateTest: [['gre', 'GRE General'], ['gmat', 'GMAT Focus Edition'], ['planned', 'Not taken yet — planning to'], ['none', 'Not required / not taking']]
};
const values = key => OPTIONS[key].map(([v]) => v);

const blank = v => v === '' || v === null || v === undefined;
const opt = schema => z.preprocess(v => (blank(v) ? undefined : v), schema.optional());
const text = (max = 120) => opt(z.string().trim().max(max));
const choice = key => opt(z.enum(values(key)));
// Accepts numbers or numeric strings from form inputs; `step` enforces e.g. IELTS half bands.
const num = (min, max, step) => opt(z.coerce.number().min(min).max(max).refine(n => !step || Math.abs(n / step - Math.round(n / step)) < 1e-9, { message: `Must be in steps of ${step}` }));
const year = () => num(1980, 2040, 1);
const isoDate = () => opt(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'));

const profileSchema = z.object({
  // Personal
  phone: opt(z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, 'Enter a valid phone number')),
  dateOfBirth: isoDate(),
  gender: choice('gender'),
  nationality: text(60),
  city: text(80),
  hasPassport: opt(z.enum(['yes', 'no', 'applied'])),
  // Study goals
  targetDegree: choice('targetDegree'),
  fieldOfStudy: text(120),
  preferredCountries: opt(z.array(z.enum(values('countries'))).max(6)),
  intakeSeason: choice('intakeSeason'),
  intakeYear: num(2025, 2035, 1),
  budget: choice('budget'),
  fundingSource: choice('fundingSource'),
  needsScholarship: opt(z.enum(['yes', 'no', 'maybe'])),
  // Academic background
  currentStatus: choice('currentStatus'),
  secondarySystem: choice('secondarySystem'),
  sscGpa: num(0, 5, 0.01), sscYear: year(),
  hscGpa: num(0, 5, 0.01), hscYear: year(),
  oLevelResult: text(160), aLevelResult: text(160),
  bachelorInstitution: text(160), bachelorSubject: text(120), bachelorCgpa: num(0, 100, 0.01), bachelorScale: choice('cgpaScale'), bachelorYear: year(),
  masterInstitution: text(160), masterSubject: text(120), masterCgpa: num(0, 100, 0.01), masterScale: choice('cgpaScale'), masterYear: year(),
  studyGapYears: num(0, 30, 1),
  workExperienceMonths: num(0, 600, 1), workRole: text(120),
  publications: num(0, 200, 1), researchInterest: text(600),
  // English test
  englishTest: choice('englishTest'),
  englishTestDate: isoDate(),
  ieltsOverall: num(0, 9, 0.5), ieltsListening: num(0, 9, 0.5), ieltsReading: num(0, 9, 0.5), ieltsWriting: num(0, 9, 0.5), ieltsSpeaking: num(0, 9, 0.5),
  toeflScale: choice('toeflScale'),
  toeflTotal: num(0, 120, 0.5), toeflReading: num(0, 30, 0.5), toeflListening: num(0, 30, 0.5), toeflSpeaking: num(0, 30, 0.5), toeflWriting: num(0, 30, 0.5),
  pteOverall: num(10, 90, 1), duolingoOverall: num(10, 160, 5),
  // Graduate admissions tests (master's / PhD)
  graduateTest: choice('graduateTest'),
  greVerbal: num(130, 170, 1), greQuant: num(130, 170, 1), greWriting: num(0, 6, 0.5),
  gmatTotal: num(205, 805, 5), graduateTestDate: isoDate(),
  // Undergraduate admissions test
  satTotal: num(400, 1600, 10)
}).strip().superRefine((p, ctx) => {
  const issue = (path, message) => ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
  for (const [score, scale] of [['bachelorCgpa', 'bachelorScale'], ['masterCgpa', 'masterScale']]) {
    if (p[score] !== undefined && p[scale] && p[score] > Number(p[scale])) issue(score, `Must not exceed ${p[scale]}`);
  }
  // The TOEFL iBT moved to a 1–6 band scale on 21 January 2026; older 0–120 scores remain valid.
  if (p.toeflScale === 'new') {
    for (const k of ['toeflTotal', 'toeflReading', 'toeflListening', 'toeflSpeaking', 'toeflWriting']) {
      if (p[k] !== undefined && (p[k] < 1 || p[k] > 6)) issue(k, 'New-scale TOEFL scores are between 1 and 6');
    }
  } else if (p.toeflTotal !== undefined && !Number.isInteger(p.toeflTotal)) issue('toeflTotal', 'Old-scale TOEFL totals are whole numbers');
  if (p.gmatTotal !== undefined && p.gmatTotal % 10 !== 5) issue('gmatTotal', 'GMAT Focus totals end in 5 (205–805)');
  if (p.dateOfBirth) {
    const age = (Date.now() - Date.parse(p.dateOfBirth)) / (365.25 * 24 * 3600 * 1000);
    if (!(age >= 13 && age <= 80)) issue('dateOfBirth', 'Enter a valid date of birth');
  }
});

// Fields a student must give when creating an account; everything else can be completed later.
const SIGNUP_REQUIRED = ['phone', 'targetDegree', 'fieldOfStudy', 'preferredCountries', 'intakeSeason', 'intakeYear', 'currentStatus'];

const isPostgrad = p => p.targetDegree === 'master' || p.targetDegree === 'phd';
const hasBachelor = p => isPostgrad(p) || ['undergrad-student', 'bachelor-completed', 'master-student', 'master-completed', 'working'].includes(p.currentStatus);

// Which fields matter for this student, used for the completeness meter and "what's missing" hints.
function relevantFields(p) {
  const f = ['phone', 'dateOfBirth', 'nationality', 'city', 'hasPassport', 'targetDegree', 'fieldOfStudy', 'preferredCountries', 'intakeSeason', 'intakeYear', 'budget', 'fundingSource', 'needsScholarship', 'currentStatus', 'secondarySystem', 'englishTest'];
  if (p.secondarySystem === 'english-medium') f.push('oLevelResult', 'aLevelResult'); else f.push('sscGpa', 'hscGpa');
  if (hasBachelor(p)) f.push('bachelorInstitution', 'bachelorSubject', 'bachelorCgpa', 'bachelorScale', 'bachelorYear');
  if (p.targetDegree === 'phd') f.push('masterInstitution', 'masterCgpa', 'researchInterest');
  if (isPostgrad(p)) f.push('graduateTest');
  if (/^ielts/.test(p.englishTest || '')) f.push('ieltsOverall');
  if (p.englishTest === 'toefl-ibt') f.push('toeflTotal');
  if (p.englishTest === 'pte-academic') f.push('pteOverall');
  if (p.englishTest === 'duolingo') f.push('duolingoOverall');
  if (p.graduateTest === 'gre') f.push('greVerbal', 'greQuant');
  if (p.graduateTest === 'gmat') f.push('gmatTotal');
  return f;
}
const filled = v => (Array.isArray(v) ? v.length > 0 : !blank(v));
function completeness(p = {}) {
  const fields = relevantFields(p);
  const missing = fields.filter(k => !filled(p[k]));
  return { percent: Math.round(((fields.length - missing.length) / fields.length) * 100), missing };
}

const label = (key, v) => OPTIONS[key]?.find(([x]) => x === String(v))?.[1] || v;
// Compact, self-reported summary passed to the AI counsellor so its advice fits the student.
function summarize(p = {}, name = '') {
  const lines = [];
  const add = (title, value) => { if (filled(value)) lines.push(`- ${title}: ${value}`); };
  add('Name', name.split(' ')[0]);
  add('Goal', [label('targetDegree', p.targetDegree), p.fieldOfStudy && `in ${p.fieldOfStudy}`].filter(Boolean).join(' '));
  add('Preferred countries', (p.preferredCountries || []).map(c => label('countries', c)).join(', '));
  add('Target intake', [label('intakeSeason', p.intakeSeason), p.intakeYear].filter(Boolean).join(' '));
  add('Budget', p.budget && label('budget', p.budget));
  add('Needs scholarship', p.needsScholarship);
  add('Current status', p.currentStatus && label('currentStatus', p.currentStatus));
  add('School system', p.secondarySystem && label('secondarySystem', p.secondarySystem));
  add('SSC / HSC GPA', [p.sscGpa, p.hscGpa].some(filled) ? `${p.sscGpa ?? '?'} / ${p.hscGpa ?? '?'} (out of 5)` : '');
  add('O / A Level', [p.oLevelResult, p.aLevelResult].filter(Boolean).join('; '));
  add("Bachelor's", p.bachelorSubject || p.bachelorCgpa ? `${p.bachelorSubject || ''}${p.bachelorInstitution ? ` at ${p.bachelorInstitution}` : ''}${p.bachelorCgpa !== undefined ? `, CGPA ${p.bachelorCgpa}${p.bachelorScale ? `/${p.bachelorScale}` : ''}` : ''}${p.bachelorYear ? ` (${p.bachelorYear})` : ''}` : '');
  add("Master's", p.masterSubject || p.masterCgpa ? `${p.masterSubject || ''}${p.masterCgpa !== undefined ? `, CGPA ${p.masterCgpa}${p.masterScale ? `/${p.masterScale}` : ''}` : ''}` : '');
  add('Study gap (years)', p.studyGapYears);
  add('Work experience', p.workExperienceMonths ? `${p.workExperienceMonths} months${p.workRole ? ` as ${p.workRole}` : ''}` : '');
  add('Publications', p.publications);
  add('Research interest', p.researchInterest);
  const english = p.englishTest && label('englishTest', p.englishTest);
  const englishScore = /^ielts/.test(p.englishTest || '') ? p.ieltsOverall && `overall ${p.ieltsOverall}${[p.ieltsListening, p.ieltsReading, p.ieltsWriting, p.ieltsSpeaking].every(filled) ? ` (L${p.ieltsListening} R${p.ieltsReading} W${p.ieltsWriting} S${p.ieltsSpeaking})` : ''}`
    : p.englishTest === 'toefl-ibt' ? p.toeflTotal && `${p.toeflTotal} on the ${p.toeflScale === 'new' ? '1–6' : '0–120'} scale`
      : p.englishTest === 'pte-academic' ? p.pteOverall : p.englishTest === 'duolingo' ? p.duolingoOverall : '';
  add('English test', english && `${english}${englishScore ? ` — ${englishScore}` : ''}`);
  add('GRE', p.graduateTest === 'gre' && (p.greVerbal || p.greQuant) ? `V${p.greVerbal ?? '?'} Q${p.greQuant ?? '?'} AWA${p.greWriting ?? '?'}` : '');
  add('GMAT', p.graduateTest === 'gmat' ? p.gmatTotal : '');
  add('SAT', p.satTotal);
  return lines.join('\n');
}

module.exports = { OPTIONS, profileSchema, SIGNUP_REQUIRED, completeness, summarize };
