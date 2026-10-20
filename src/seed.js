module.exports = function seed(db) {
const countries = [
 ['germany','Germany','DE','Research-focused study destination; check each institution and programme for current entry rules.','Public-university tuition varies by state and programme; some charge tuition.','Plan for rent, insurance, food, transport and proof-of-funds requirements.','German and English programmes','https://www.study-in-germany.de/en/','PENDING REVIEW'],
 ['canada','Canada','CA','Research programmes, provincial options and institution-specific admissions.','Tuition varies substantially by institution and programme.','Budget for living costs, insurance, travel and official proof-of-funds rules.','English or French','https://www.educanada.ca/','PENDING REVIEW'],
 ['usa','United States','US','Wide range of research universities, assistantships and graduate funding.','Tuition and funding vary by institution and department.','Budget for living costs, insurance, visa and travel expenses.','Mostly English','https://educationusa.state.gov/','PENDING REVIEW'],
 ['uk','United Kingdom','GB','One-year taught masters options and research degrees; check current visa rules.','International tuition varies by programme.','Plan for housing, health-related charges, travel and visa costs.','Mostly English','https://www.study-uk.britishcouncil.org/','PENDING REVIEW'],
 ['australia','Australia','AU','Coursework and research routes with institution-specific entry and funding.','Tuition varies by provider and course.','Include accommodation, insurance, travel and visa-related costs.','Mostly English','https://www.studyaustralia.gov.au/','PENDING REVIEW']
];
const insCountry=db.prepare('INSERT OR IGNORE INTO countries(slug,name,flag,summary,tuition,living,language,official_url,last_verified) VALUES(?,?,?,?,?,?,?,?,?)');
const resources=[
 ['Start with official sources','Study abroad','', 'Use university admissions pages, government immigration pages and official scholarship portals as the final authority. Check the page date and save the URL. Never rely on a social-media post alone.','https://www.study-in-germany.de/en/','Official study portal','PENDING REVIEW','en'],
 ['Germany: application pathway','Country guide','germany','Build a shortlist, verify degree recognition and programme prerequisites, check language requirements, prepare genuine academic documents, apply through the university or its stated application platform, then follow the official visa checklist. Rules differ by institution and applicant.','https://www.study-in-germany.de/en/','Study in Germany','PENDING REVIEW','en'],
 ['Canada: application pathway','Country guide','canada','Select a designated institution and eligible programme, read the university admission page, verify current study permit instructions on the official government site, prepare financial evidence truthfully, and check provincial and institution-specific requirements.','https://www.educanada.ca/','EduCanada','PENDING REVIEW','en'],
 ['USA: graduate study and funding','Country guide','usa','Compare programmes and faculty fit. Ask departments about assistantships, tuition waivers and funding guarantees in writing. Use EducationUSA and official university pages; visa eligibility and procedures must be checked with the official government source.','https://educationusa.state.gov/','EducationUSA','PENDING REVIEW','en'],
 ['UK: postgraduate study','Country guide','uk','Check course entry requirements, tuition, funding, course dates and the official student visa route. Confirm the current financial evidence and work conditions on GOV.UK before making financial commitments.','https://www.study-uk.britishcouncil.org/','British Council Study UK','PENDING REVIEW','en'],
 ['Australia: study planning','Country guide','australia','Compare registered providers and course details, confirm entry and English-language requirements, check official student visa instructions, and calculate tuition plus living expenses before accepting an offer.','https://www.studyaustralia.gov.au/','Study Australia','PENDING REVIEW','en'],
 ['Avoid study-abroad scams','Safety','', 'Red flags include guaranteed visas, pressure to pay immediately, requests to falsify bank statements, unofficial personal payment accounts, fake offer letters and claims of exclusive access. Verify directly with the university or government. Keep receipts and report suspected fraud to appropriate authorities.','https://www.daad.de/en/','DAAD official site','PENDING REVIEW','en'],
 ['Document integrity checklist','Documents','', 'Use genuine transcripts, certificates, passport details and financial evidence. Ask the issuing institution about official attestations and medium-of-instruction letters. Never buy or alter documents. Keep copies of submissions and use the exact checklist issued by the receiving institution.','https://educationusa.state.gov/','EducationUSA','PENDING REVIEW','en'],
 ['IELTS Academic: test overview','IELTS','', 'IELTS Academic assesses Listening, Reading, Writing and Speaking. Each skill receives a band score and an overall band is reported. The required score depends on the institution, course and visa context; verify the exact requirement with the receiving organisation. These practice materials are original learning exercises, not official IELTS test questions.','https://ielts.org/','IELTS official','PENDING REVIEW','en'],
 ['IELTS Writing Task 2 planning','IELTS','', 'Spend a few minutes identifying the question type, stating a clear position and planning two developed main points. Each paragraph should contain a topic sentence, explanation and relevant example. Leave time to check grammar, linking and whether every part of the prompt is answered.','https://ielts.org/','IELTS official','PENDING REVIEW','en'],
 ['IELTS Speaking practice','IELTS','', 'Answer directly, extend with a reason or example, and speak naturally rather than memorising scripts. For Part 2, make short notes about who, where, when, what happened and why it mattered. Record yourself and review fluency, grammar, vocabulary and pronunciation.','https://ielts.org/','IELTS official','PENDING REVIEW','en'],
 ['IELTS Reading strategy','IELTS','', 'Read the task before scanning the passage. Identify keywords and likely paraphrases, then check the relevant lines in context. For True/False/Not Given, distinguish contradiction from missing information. Do not use outside knowledge to answer a passage-based question.','https://ielts.org/','IELTS official','PENDING REVIEW','en'],
 ['IELTS Listening strategy','IELTS','', 'Preview questions before the audio starts, predict the kind of answer required, and listen for paraphrases. Check spelling, singular/plural forms and the stated word limit. Practise with legally available audio and review errors by category.','https://ielts.org/','IELTS official','PENDING REVIEW','en']
];
const insRes=db.prepare('INSERT OR IGNORE INTO resources(title,category,country_slug,body,source_url,source_name,verified_at,language) VALUES(?,?,?,?,?,?,?,?)');
const programs=[
 ['Technical University of Munich','Graduate programme catalogue','germany','Masters','English/German','Tuition and semester contributions vary by programme and student status; verify official course page.','https://www.tum.de/en/studies/degree-programs','PENDING REVIEW'],
 ['University of Toronto','Graduate programs directory','canada','Masters/PhD','English','Funding and tuition are department-specific; verify current department page.','https://www.sgs.utoronto.ca/programs/','PENDING REVIEW'],
 ['Arizona State University','Graduate degree programs','usa','Masters/PhD','English','Costs and assistantships vary by programme; verify official programme page.','https://graduate.asu.edu/degree-programs','PENDING REVIEW'],
 ['University of Manchester','Postgraduate courses','uk','Masters/PhD','English','International tuition and funding vary by course; verify course page.','https://www.manchester.ac.uk/study/masters/courses/','PENDING REVIEW'],
 ['Monash University','Graduate course search','australia','Masters/PhD','English','Fees and scholarships are course-specific; verify official course page.','https://www.monash.edu/study/courses','PENDING REVIEW']
];
const insProg=db.prepare('INSERT OR IGNORE INTO programs(university,program,country_slug,level,language,tuition_note,official_url,verified_at) VALUES(?,?,?,?,?,?,?,?)');
const scholarships=[
 ['DAAD Scholarships','germany','Masters/PhD','Funding options vary by programme, nationality and academic profile. Review eligibility and deadlines on the official database.','https://www.daad.de/en/study-and-research-in-germany/scholarships/','Deadlines vary; check each call'],
 ['Vanier / Canadian graduate funding resources','canada','PhD','Canadian graduate funding has multiple federal, provincial and university routes; confirm current programme availability and eligibility.','https://www.educanada.ca/scholarships-bourses/index.aspx','Calls and availability vary'],
 ['Fulbright Foreign Student Program','usa','Masters/PhD','Programme availability, fields and application processes are country-specific; check the Bangladesh country page and current call.','https://foreign.fulbrightonline.org/','Check current Bangladesh call'],
 ['Chevening Scholarships','uk','Masters','Review the current eligibility rules, eligible courses, work-experience requirements and application window on the official site.','https://www.chevening.org/','Annual cycle; check official dates'],
 ['Australia Awards Scholarships','australia','Masters','Eligibility and participating countries are set by the current country profile; check Bangladesh-specific rules.','https://www.dfat.gov.au/people-to-people/australia-awards','Check Bangladesh profile and current dates']
];
const insSch=db.prepare('INSERT OR IGNORE INTO scholarships(name,country_slug,level,overview,official_url,deadline_note) VALUES(?,?,?,?,?,?)');
const tx=db.transaction(()=>{countries.forEach(x=>insCountry.run(...x)); resources.forEach(x=>insRes.run(...x)); programs.forEach(x=>insProg.run(...x)); scholarships.forEach(x=>insSch.run(...x));});
tx();

// Public links to free official IELTS resources. We index titles and short descriptions only;
// copyrighted practice papers/audio are not copied into this application.
const officialIeltsResources = require('../content/ielts-resources.json');
const ieltsLessons = require('../content/ielts-lessons.json');
const insExtraResource = db.prepare(`INSERT INTO resources(title,category,country_slug,body,source_url,source_name,verified_at,language,published) VALUES(?,?,?,?,?,?,?,?,1) ON CONFLICT(title,source_url) DO UPDATE SET category=excluded.category,country_slug=excluded.country_slug,body=excluded.body,source_name=excluded.source_name,verified_at=excluded.verified_at,language=excluded.language,published=1`);
for (const r of officialIeltsResources) {
  insExtraResource.run(r.title, 'IELTS resource', '', `${r.description} Access: ${r.access}. ${r.license_note}`, r.url, r.provider, 'CURATED SOURCE LINK · CHECK CURRENT PAGE', 'en');
}
for (const lesson of ieltsLessons) {
  insExtraResource.run(lesson.title, 'IELTS lesson', '', lesson.body, 'https://www.ielts.org/take-a-test/preparation-resources', 'Pothik original learning guide', 'ORIGINAL CONTENT · 20 OCT 2026', 'en');
}

const exerciseData = require('../content/ielts-practice.json');
const insExercise = db.prepare(`INSERT INTO ielts_exercises
  (exercise_id,skill,difficulty,minutes,title,prompt,options_json,answer,explanation,audio_text,published)
  VALUES(?,?,?,?,?,?,?,?,?,?,1) ON CONFLICT(exercise_id) DO UPDATE SET skill=excluded.skill,difficulty=excluded.difficulty,minutes=excluded.minutes,title=excluded.title,prompt=excluded.prompt,options_json=excluded.options_json,answer=excluded.answer,explanation=excluded.explanation,audio_text=excluded.audio_text,published=1`);
for (const x of exerciseData) {
  insExercise.run(x.id, x.type, x.difficulty || 'Foundation', x.minutes || 5, x.title, x.prompt,
    JSON.stringify(x.options || []), Number.isInteger(x.answer) ? x.answer : null, x.explanation || '', x.audio_text || null);
}

require('./opportunities').seedOpportunities(db);
console.log(`Seeded country guidance, official IELTS resource links, ${ieltsLessons.length} original lessons, ${exerciseData.length} original IELTS exercises, and scholarship monitoring sources.`);

};

if (require.main === module) {
  const { createDatabase } = require('./db');
  createDatabase().then(db => { module.exports(db); db.close(); }).catch(err => { console.error(err); process.exit(1); });
}
