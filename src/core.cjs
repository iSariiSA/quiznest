const { randomUUID } = require('node:crypto');
const { MAX_HTML_LENGTH, imageData } = require('./ui/content-policy.js');
const questionModel = require('./ui/question-types.js');
const aids=require('./ui/study-aids.js');
const codePolicy = require('./ui/code-policy.js');
const timing = require('./ui/timing.js');
const practice = require('./ui/practice.js');
const courseFocus = require('./ui/course-focus.js');
const organization=require('./library-organization.cjs');
const notebook=require('./mistake-notebook.cjs');
const savedQuestions=require('./saved-questions.cjs');
const dailyReview = require('./ui/daily-review.js');
const id = () => randomUUID();
const COLORS = ['sage', 'peach', 'lavender', 'blue', 'sand'];
const MAX_IMPORT_BYTES=20*1024*1024;
function text(value, label, max = 200) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required.`);
  if (value.length > max) throw new Error(`${label} must be ${max} characters or fewer.`);
  return value.trim();
}
function question(raw, index = 0) {
  const label = `Question ${index + 1}`;
  if (!raw || typeof raw !== 'object') throw new Error(`${label} must be an object.`);
  const type = questionModel.typeOf(raw);
  const format = raw.format ?? 'text';
  if (!['text','html','markdown'].includes(format)) throw new Error(`${label}: format must be text, html, or markdown.`);
  const contentLimit=format==='html'?MAX_HTML_LENGTH:format==='markdown'?codePolicy.MAX_MARKDOWN_LENGTH:10000;
  const contentText=(value,...args)=>{const checked=text(value,...args);return format==='markdown'?value:checked;};
  const prompt = contentText(raw.prompt ?? raw.question, `${label}: prompt`, contentLimit);
  let fields;
  if(type.selection==='text'||type.selection==='matching'){
    if(['options','choices','correctAnswer','correctAnswers','correctIndex','answer'].some(key=>raw[key]!==undefined))throw new Error(`${label}: use ${type.selection==='text'?'acceptedAnswers':'pairs'} for this question type.`);
    if(type.selection==='text'){
      if(raw.pairs!==undefined||raw.caseSensitive!==undefined&&typeof raw.caseSensitive!=='boolean')throw new Error(`${label}: invalid written-answer settings.`);
      if(!Array.isArray(raw.acceptedAnswers)||raw.acceptedAnswers.length<1||raw.acceptedAnswers.length>questionModel.responseLimits.maxAcceptedAnswers)throw new Error(`${label}: provide 1–20 accepted answers.`);
      const acceptedAnswers=Array.from(raw.acceptedAnswers,(value,i)=>text(value,`${label}: accepted answer ${i+1}`,questionModel.responseLimits.maxWrittenLength)),caseSensitive=raw.caseSensitive===true;
      if(new Set(acceptedAnswers.map(value=>questionModel.normalizeWritten(value,caseSensitive))).size!==acceptedAnswers.length)throw new Error(`${label}: accepted answers must be distinct.`);
      fields={acceptedAnswers,caseSensitive};
    }else{
      if(raw.acceptedAnswers!==undefined||raw.caseSensitive!==undefined)throw new Error(`${label}: invalid matching settings.`);
      if(!Array.isArray(raw.pairs)||raw.pairs.length<2||raw.pairs.length>questionModel.responseLimits.maxPairs)throw new Error(`${label}: provide 2–20 matching pairs.`);
      const pairs=Array.from(raw.pairs,(pair,i)=>{if(!pair||typeof pair!=='object'||Array.isArray(pair)||Object.keys(pair).some(key=>!['left','right'].includes(key)))throw new Error(`${label}: invalid matching pair.`);return {left:text(pair.left,`${label}: left item ${i+1}`,questionModel.responseLimits.maxPairLength),right:text(pair.right,`${label}: right item ${i+1}`,questionModel.responseLimits.maxPairLength)};});
      if(['left','right'].some(side=>new Set(pairs.map(pair=>questionModel.normalizeWritten(pair[side]))).size!==pairs.length))throw new Error(`${label}: matching items must be distinct on each side.`);
      fields={pairs};
    }
  }else{
  if(['acceptedAnswers','caseSensitive','pairs'].some(key=>raw[key]!==undefined))throw new Error(`${label}: use options for this question type.`);
  const choices = raw.options ?? raw.choices;
  if (!Array.isArray(choices) || choices.length < type.minOptions || choices.length > type.maxOptions)
    throw new Error(`${label}: ${type.label} needs ${type.minOptions}–${type.maxOptions} options.`);
  const options = Array.from(choices,(v, i) => contentText(typeof v === 'object' && v ? v.text : v, `${label}: option ${i + 1}`, format==='text'?5000:contentLimit));
  if (new Set(options).size !== options.length) throw new Error(`${label} has duplicate options.`);
  const multiple = type.selection === 'multiple';
  if (multiple ? raw.correctAnswer !== undefined || raw.correctIndex !== undefined : raw.correctAnswers !== undefined)
    throw new Error(`${label}: use ${multiple ? 'correctAnswers' : 'correctAnswer'} for this question type.`);
  let answer = multiple ? raw.correctAnswers ?? raw.answer : raw.correctAnswer ?? raw.answer ?? raw.correctIndex;
  if (answer === undefined && choices.every(v => v && typeof v === 'object')) {
    const marked = choices.map((v, i) => v.isCorrect === true ? i : -1).filter(i => i >= 0);
    answer = multiple ? marked : marked.length === 1 ? marked[0] : undefined;
  }
  const resolve = value => {
    if (typeof value !== 'string') return value;
    const exact = options.indexOf(value)>=0?options.indexOf(value):options.indexOf(value.trim());
    return exact >= 0 ? exact : options.findIndex((_, i) => questionModel.optionLabel(i) === value.trim().toUpperCase());
  };
  answer = multiple && Array.isArray(answer) ? answer.map(resolve) : resolve(answer);
  if (!questionModel.validAnswer({ type:type.id, options }, answer))
    throw new Error(`${label}: ${multiple ? 'correctAnswers must be a nonempty array of distinct' : 'answer must be a'} zero-based option ${multiple ? 'indices, letters, or exact option texts' : 'index, letter, or exact option text'}.`);
  fields={options,...(multiple?{correctAnswers:answer.sort((a,b)=>a-b)}:{correctAnswer:answer})};
  }
  const explanation = raw.explanation ?? '';
  if (typeof explanation !== 'string' || explanation.length > contentLimit) throw new Error(`${label}: invalid explanation.`);
  const result = { id: typeof raw.id === 'string' ? raw.id : id(), prompt, ...fields, explanation };
  if (raw.type !== undefined || type.selection==='multiple') result.type=type.id;
  if (format!=='text') result.format=format;
  if(raw.hint!==undefined){const hint=aids.hint(raw.hint,true);if(hint.trim())result.hint=hint;}
  if(raw.studyReference!==undefined)result.studyReference=aids.note(raw.studyReference);
  if (raw.code!==undefined) {
    if(typeof raw.code!=='string'||!raw.code.trim()||raw.code.length>codePolicy.MAX_CODE_LENGTH)throw new Error(`${label}: code must contain 1–${codePolicy.MAX_CODE_LENGTH.toLocaleString('en-US')} characters.`);
    result.code=raw.code;result.codeLanguage=codePolicy.language(raw.codeLanguage);
  } else if(raw.codeLanguage!==undefined)throw new Error(`${label}: add code before setting its language.`);
  if (raw.image) {
    result.image=imageData(raw.image);
    if (raw.imageAlt !== undefined && (typeof raw.imageAlt!=='string' || raw.imageAlt.length>500)) throw new Error(`${label}: image description must be 500 characters or fewer.`);
    result.imageAlt=raw.imageAlt || '';
  }
  return result;
}
function parseCSV(source) {
  const rows = []; let row = [], cell = '', quoted = false, closed = false;
  source = source.replace(/^\uFEFF/, '');
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (quoted) {
      if (c === '"' && source[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else cell += c;
    } else if (c === '"' && !cell && !closed) quoted = true;
    else if (c === ',' || c === '\n' || c === '\r') {
      row.push(cell); cell = ''; closed = false;
      if (c !== ',') { if (row.some(v => v.trim())) rows.push(row); row = []; if (c === '\r' && source[i + 1] === '\n') i++; }
    } else { if (closed && c.trim()) throw new Error('CSV has text after a closing quote.'); cell += c; }
  }
  if (quoted) throw new Error('CSV has an unclosed quote.');
  row.push(cell); if (row.some(v => v.trim())) rows.push(row);
  if (rows.length < 2) throw new Error('CSV needs a header and at least one question.');
  const headers = rows.shift().map(h => h.trim().toLowerCase());
  if (new Set(headers).size !== headers.length) throw new Error('CSV has duplicate column names.');
  if (!headers.includes('question') || !['answer','accepted_answers','pairs'].some(key=>headers.includes(key))) throw new Error('CSV needs question and answer columns, or accepted_answers/pairs for response questions.');
  return rows.map((r, i) => {
    if (r.length !== headers.length) throw new Error(`CSV row ${i + 2} has ${r.length} cells; expected ${headers.length}.`);
    return Object.fromEntries(headers.map((h, j) => [h, r[j]]));
  });
}
function parseImport(source, extension = 'json', filename = 'Imported quiz') {
  if (typeof source !== 'string' || Buffer.byteLength(source) > MAX_IMPORT_BYTES) throw new Error('Import files must be smaller than 20 MB.');
  let packs;
  if (extension.toLowerCase() === 'csv') {
    const groups = new Map();
    for (const r of parseCSV(source)) {
      const course = r.course?.trim() || 'Imported course', unit = r.unit?.trim() || 'Unit 1', title = r.title?.trim() || filename;
      const key = JSON.stringify([course, unit, title]);
      if (!groups.has(key)) groups.set(key, { course, unit, title, questions: [] });
      const optionColumns=Object.keys(r).filter(key=>/^option_[a-z]+$/.test(key)).sort((a,b)=>a.length-b.length || a.localeCompare(b));
      if (optionColumns.some((key,i)=>key!==`option_${questionModel.optionLabel(i).toLowerCase()}`)) throw new Error('CSV options must be consecutive, starting with option_a.');
      const cells = optionColumns.map(key=>r[key]);
      const last = cells.findLastIndex(v => v?.trim());
      const options = cells.slice(0,last+1);
      if(options.some(v => !v?.trim())) throw new Error('CSV options must be consecutive, starting with option_a.');
      const type=r.type?.trim()||'single-choice';
      let answer=r.answer;
      const selection=questionModel.typeOf({type}).selection;
      if (selection==='multiple') {
        try { answer=JSON.parse(answer); } catch { throw new Error('CSV multiple-answer answers must be a JSON array, such as [0,2] or ["A","C"].'); }
      }
      let fields={options,answer};
      if(selection==='text'||selection==='matching'){
        if(options.length)throw new Error('Written-answer and matching CSV rows cannot contain choice options.');
        if(selection==='text'){
          if(r.pairs?.trim())throw new Error('Written-answer CSV rows cannot contain matching pairs.');
          let acceptedAnswers;if(r.accepted_answers?.trim()){if(r.answer?.trim())throw new Error('Written-answer CSV rows use answer or accepted_answers, not both.');try{acceptedAnswers=JSON.parse(r.accepted_answers);}catch{throw new Error('CSV accepted_answers must be a JSON array of strings.');}}else acceptedAnswers=[r.answer];
          const sensitive=r.case_sensitive?.trim().toLowerCase();if(sensitive&&!['true','false'].includes(sensitive))throw new Error('CSV case_sensitive must be true or false.');
          fields={acceptedAnswers,caseSensitive:sensitive==='true'};
        }else{
          if(r.answer?.trim()||r.accepted_answers?.trim()||r.case_sensitive?.trim())throw new Error('Matching CSV rows use only the pairs answer column.');
          let pairs;try{pairs=JSON.parse(r.pairs);}catch{throw new Error('CSV pairs must be a JSON array of left/right objects.');}fields={pairs};
        }
      }else if(r.accepted_answers?.trim()||r.pairs?.trim()||r.case_sensitive?.trim())throw new Error('Choice CSV rows cannot contain written-answer or matching settings.');
      groups.get(key).questions.push({ type, prompt: r.question, ...fields, explanation: r.explanation || '', format:r.format?.trim()||'text', image:r.image||undefined, imageAlt:r.image_alt||'',...(r.hint?.trim()?{hint:r.hint}:{}), ...(r.code?.trim()?{code:r.code,codeLanguage:r.code_language?.trim()||'plaintext'}:{}) });
    }
    packs = [...groups.values()];
  } else {
    let raw; try { raw = JSON.parse(source.replace(/^\uFEFF/, '')); } catch { throw new Error('This file is not valid JSON. Check commas and quotation marks.'); }
    if (raw?.version && Array.isArray(raw.courses)) throw new Error('This is a library backup. Use Settings → Restore backup.');
    packs = Array.isArray(raw) ? [{ title: filename, questions: raw }] : Array.isArray(raw?.quizzes) ? raw.quizzes : [raw];
  }
  if (!packs.length || packs.length > 1000) throw new Error('Import must contain 1–1,000 quizzes.');
  let count = 0;
  const result = packs.map((p, i) => {
    if (!Array.isArray(p?.questions) || !p.questions.length) throw new Error(`Quiz ${i + 1} needs a questions array.`);
    count += p.questions.length;
    if(count>10000)throw new Error('Import up to 10,000 questions at a time.');
    return {
      course: text(p.course || 'Imported course', 'Course'), unit: text(p.unit || 'Unit 1', 'Unit'),
      title: text(p.title || filename, 'Quiz title'), ...(p.reference!==undefined?{reference:aids.reference(p.reference,p.questions.length)}:{}), questions: p.questions.map((q, n) => ({ ...question(q, n), id: id() }))
    };
  });
  if (count > 10000) throw new Error('Import up to 10,000 questions at a time.');
  return result;
}
function emptyLibrary() { return { version: 1, courses: [], attempts: [], activeSession: null }; }
function exportQuiz({course,unit,quiz}){
  const portable={course:course.title,unit:unit.title,title:quiz.title,...(quiz.reference?{reference:quiz.reference}:{}),questions:quiz.questions.map(({id,...q})=>q)};
  const formatted=JSON.stringify(portable,null,2);
  if(Buffer.byteLength(formatted)<=MAX_IMPORT_BYTES)return formatted;
  const compact=JSON.stringify(portable);
  if(Buffer.byteLength(compact)>MAX_IMPORT_BYTES)throw new Error('This quiz exceeds the 20 MB import limit. Split it into smaller quizzes before exporting.');
  return compact;
}
function validateLibrary(raw) {
  if (!raw || raw.version !== 1 || !Array.isArray(raw.courses) || !Array.isArray(raw.attempts)) throw new Error('Unsupported or damaged Quiznet backup.');
  const ids = new Set();
  const checkedID = value => { if (typeof value !== 'string' || !value || ids.has(value)) throw new Error('Backup contains missing or duplicate IDs.'); ids.add(value); return value; };
  const collections=raw.collections===undefined?undefined:organization.collections(raw.collections,checkedID);
  const courses = raw.courses.map(c => ({
    id: checkedID(c.id), title: text(c.title, 'Course'), description: typeof c.description === 'string' ? c.description.slice(0,1000) : '',
    color: COLORS.includes(c.color) ? c.color : 'sage',
    ...(c.studyFocus!==undefined?{studyFocus:courseFocus.validate(c.studyFocus)}:{}),
    ...organization.metadata(c),
    units: (Array.isArray(c.units) ? c.units : (() => { throw new Error('Course is missing units.'); })()).map(u => ({
      id: checkedID(u.id), title: text(u.title, 'Unit'),
      quizzes: (Array.isArray(u.quizzes) ? u.quizzes : (() => { throw new Error('Unit is missing quizzes.'); })()).map(q => ({
        id: checkedID(q.id), title: text(q.title, 'Quiz'), ...(q.reference!==undefined?{reference:aids.reference(q.reference,q.questions?.length||0)}:{}), createdAt: q.createdAt || new Date().toISOString(),
        questions: (Array.isArray(q.questions) ? q.questions : (() => { throw new Error('Quiz is missing questions.'); })()).map((item, i) => { const n = question(item,i); n.id = checkedID(item.id); return n; })
      }))
    }))
  }));
  const library = { version: 1, courses, attempts: [], activeSession: null };
  if(collections!==undefined)library.collections=collections;
  organization.references(library);
  if(raw.practicePresets!==undefined)library.practicePresets=practice.validatePresets(raw.practicePresets);
  library.attempts = raw.attempts.map(a => {
    if (!a || typeof a.quizId !== 'string' || !Array.isArray(a.questions) || !Array.isArray(a.answers) || !Number.isFinite(a.elapsedSeconds) || a.elapsedSeconds < 0 || !Number.isFinite(Date.parse(a.completedAt))) throw new Error('Backup contains an invalid attempt.');
    const questions = Array.from(a.questions,question);
    if (!questions.length || a.answers.length !== questions.length || Array.from(a.answers).some((v,i) => !questionModel.validAnswer(questions[i],v))) throw new Error('Backup contains invalid answers.');
    if(a.missedOnly!==undefined&&typeof a.missedOnly!=='boolean')throw new Error('Backup has invalid attempt scope.');
    return { id: checkedID(a.id), quizId: a.quizId, title: text(a.title, 'Attempt title'), ...(a.reference?{reference:aids.reference(a.reference,questions.length)}:{}), completedAt: a.completedAt, elapsedSeconds: a.elapsedSeconds, questions, answers: structuredClone(a.answers), total: questions.length, score: questions.filter((q,i)=>questionModel.isCorrect(q,a.answers[i])).length, ...timing.validateAttempt(a,questions.length), ...(a.practice!==undefined?{practice:practice.validate(a.practice)}:{}),...(a.missedOnly!==undefined?{missedOnly:a.missedOnly}:{}) };
  });
  if (raw.activeSession) {
    const s = raw.activeSession, q = practice.sessionQuiz(library,s),byId=new Map(q?.questions.map(item=>[item.id,item])),questionIds=new Set(Array.isArray(s.questionIds)?s.questionIds:[]),checkedIds=new Set(Array.isArray(s.checkedQuestionIds)?s.checkedQuestionIds:[]);
    if (!q || !Array.isArray(s.questionIds) || questionIds.size !== q.questions.length || s.questionIds.length !== q.questions.length || s.questionIds.some(key => !byId.has(key)) || !Number.isInteger(s.position) || s.position < 0 || s.position >= q.questions.length || !Number.isFinite(Date.parse(s.startedAt)) || !s.answers || Array.isArray(s.answers) || typeof s.answers !== 'object') throw new Error('Backup has an invalid unfinished quiz.');
    const answers = {};
    for (const [key,value] of Object.entries(s.answers)) {
      const item = byId.get(key);
      if (!item || !questionModel.validAnswer(item,value,true)) throw new Error('Backup has an invalid saved answer.');
      answers[key] = structuredClone(value);
    }
    library.activeSession = { quizId:s.quizId, questionIds:s.questionIds, answers, position:s.position, startedAt:s.startedAt };
    if(s.optionOrders!==undefined){
      if(!s.optionOrders||typeof s.optionOrders!=='object'||Array.isArray(s.optionOrders)||Object.keys(s.optionOrders).length!==q.questions.filter(questionModel.isChoice).length)throw new Error('Backup has invalid answer order.');
      library.activeSession.optionOrders={};for(const [key,order] of Object.entries(s.optionOrders)){const item=byId.get(key);if(!item||!questionModel.isChoice(item)||!Array.isArray(order)||order.length!==item.options.length||new Set(order).size!==order.length||Array.from(order).some(i=>!Number.isInteger(i)||i<0||i>=item.options.length))throw new Error('Backup has invalid answer order.');Object.defineProperty(library.activeSession.optionOrders,key,{value:[...order],enumerable:true,writable:true,configurable:true});}
    }
    if(s.sourceAttemptId!==undefined){if(typeof s.sourceAttemptId!=='string')throw new Error('Backup has an invalid practice source.');library.activeSession.sourceAttemptId=s.sourceAttemptId;}
    if(s.flaggedQuestionIds!==undefined){if(!Array.isArray(s.flaggedQuestionIds)||new Set(s.flaggedQuestionIds).size!==s.flaggedQuestionIds.length||Array.from(s.flaggedQuestionIds).some(id=>!questionIds.has(id)))throw new Error('Backup has invalid review flags.');library.activeSession.flaggedQuestionIds=[...s.flaggedQuestionIds];}
    if(s.timing!==undefined)library.activeSession.timing=timing.validate(s.timing,s.questionIds);
    if(s.practice!==undefined)library.activeSession.practice=practice.validate(s.practice);
    if(s.checkedQuestionIds!==undefined){
      if(s.practice?.feedback!=='instant'||!Array.isArray(s.checkedQuestionIds)||checkedIds.size!==s.checkedQuestionIds.length||Array.from(s.checkedQuestionIds).some(id=>!questionIds.has(id)||!questionModel.validAnswer(byId.get(id),answers[id])))throw new Error('Backup has invalid checked answers.');
      library.activeSession.checkedQuestionIds=[...s.checkedQuestionIds];
    }
    if(s.practice?.feedback==='instant'&&(!s.checkedQuestionIds||q.questions.some(item=>questionModel.typeOf(item).selection==='single'&&questionModel.validAnswer(item,answers[item.id])&&!checkedIds.has(item.id))))throw new Error('Backup has inconsistent instant feedback.');
  }
  if(raw.dailyReview!==undefined)library.dailyReview=dailyReview.validate(raw.dailyReview,library);
  if(raw.mistakeNotebook!==undefined)library.mistakeNotebook=notebook.validate(raw.mistakeNotebook,question);
  if(raw.savedQuestions!==undefined)library.savedQuestions=savedQuestions.validate(raw.savedQuestions,question);
  return library;
}
function findQuiz(data, quizId) {
  for (const course of data.courses) for (const unit of course.units) {
    const quiz = unit.quizzes.find(q => q.id === quizId);
    if (quiz) return { course, unit, quiz };
  }
  return null;
}
function planDestination(data, target, fallback) {
  if (target !== undefined && (!target || typeof target !== 'object' || Array.isArray(target))) throw new Error('Choose a valid destination.');
  const t=target||{},keys=['courseId','courseTitle','unitId','unitTitle'];
  if(Object.keys(t).some(key=>!keys.includes(key)) || keys.some(key=>t[key]!==undefined&&(typeof t[key]!=='string'||!t[key].trim())) || (t.courseId&&t.courseTitle) || (t.unitId&&t.unitTitle) || (t.unitId&&!t.courseId) || (t.unitTitle&&!t.courseId&&!t.courseTitle)) throw new Error('Choose a valid course and unit.');
  const courseTitle=t.courseTitle?text(t.courseTitle,'Course name'):fallback?.course;
  const unitTitle=t.unitTitle?text(t.unitTitle,'Unit name'):fallback?.unit;
  let course=t.courseId?data.courses.find(c=>c.id===t.courseId):data.courses.find(c=>c.title.toLowerCase()===courseTitle?.toLowerCase());
  if(t.courseId&&!course)throw new Error('Selected course no longer exists.');
  if(!course){if(!courseTitle)throw new Error('Choose a course.');course={id:id(),title:text(courseTitle,'Course name'),description:'',color:COLORS[data.courses.length%COLORS.length],units:[]};}
  let unit=t.unitId?course.units.find(u=>u.id===t.unitId):course.units.find(u=>u.title.toLowerCase()===unitTitle?.toLowerCase());
  if(t.unitId&&!unit)throw new Error('Selected unit does not belong to this course.');
  if(!unit){if(!unitTitle)throw new Error('Choose a unit.');unit={id:id(),title:text(unitTitle,'Unit name'),quizzes:[]};}
  return {course,unit};
}
function commitDestination(data,{course,unit}) {
  if(!data.courses.includes(course))data.courses.push(course);
  if(!course.units.includes(unit))course.units.push(unit);
}
function importPacks(data, packs, target) {
  // Plan every destination before inserting anything, including multi-quiz files.
  const planned={courses:data.courses.map(c=>({...c,units:c.units.map(u=>({...u,quizzes:u.quizzes}))}))};
  const imports=[];
  for (const p of packs) {
    const place=planDestination(planned,target,p);commitDestination(planned,place);
    imports.push({p,target:{courseId:place.course.id,unitId:place.unit.id},questions:p.questions.map((q,i)=>({...question(q,i),id:id()}))});
  }
  for(const course of planned.courses)if(!data.courses.some(c=>c.id===course.id))data.courses.push({...course,units:[]});
  for(const course of planned.courses){const actual=data.courses.find(c=>c.id===course.id);for(const unit of course.units)if(!actual.units.some(u=>u.id===unit.id))actual.units.push({...unit,quizzes:[]});}
  for(const {p,target:place,questions} of imports){
    const {unit}=planDestination(data,place);
    let title = p.title, suffix = 2;
    while (unit.quizzes.some(q => q.title === title)) {
      const ending=` (${suffix++})`;
      title = `${p.title.slice(0,200-ending.length).trimEnd()}${ending}`;
    }
    unit.quizzes.push({ id:id(), title, questions, ...(p.reference?{reference:aids.reference(p.reference,questions.length)}:{}), createdAt:new Date().toISOString() });
  }
}
function mutate(data, action, now=Date.now()) {
  if (!action || typeof action.type !== 'string') throw new Error('Invalid action.');
  if(organization.TYPES.includes(action.type)){organization.mutate(data,action);return data;}
  if(['savedAdd','savedRemove','savedStart','savedAnswer','savedCheck','savedNext','savedDiscard'].includes(action.type)){savedQuestions.mutate(data,action,now,question);return data;}
  if(['mistakeRemove','mistakeNote','mistakeStart','mistakeAnswer','mistakeCheck','mistakeNext'].includes(action.type)){notebook.mutate(data,action);return data;}
  if(['reviewSettings','reviewBegin','reviewAnswer','reviewCheck','reviewRate'].includes(action.type)){const unchecked=action.type==='reviewCheck'&&!data.dailyReview?.active?.checked;dailyReview.mutate(data,action,now,id);if(unchecked){const item=dailyReview.current(data);notebook.record(data,aids.capture(item.question,item.quiz),data.dailyReview.active.answer,item.quiz.title,now);}return data;}
  const course = data.courses.find(c => c.id === action.courseId);
  const unit = course?.units.find(u => u.id === action.unitId);
  const found = action.quizId ? findQuiz(data, action.quizId) : null;
  if(['rename','delete'].includes(action.type)) {
    if(action.quizId && !found) throw new Error('Quiz not found.');
    if(action.unitId && !unit) throw new Error('Unit not found.');
    if(action.courseId && !course) throw new Error('Course not found.');
  }
  switch (action.type) {
    case 'courseStudyFocus': {
      if(!course)throw new Error('Course not found.');
      const focus=courseFocus.validate(action.focus);
      if(focus==='unset')delete course.studyFocus;else course.studyFocus=focus;
      break;
    }
    case 'savePreset': {
      const name=text(action.name,'Preset name',60),presets=data.practicePresets||[],existing=presets.find(p=>p.name.toLowerCase()===name.toLowerCase());
      const next={id:existing?.id||id(),name,options:practice.validate(action.practice),shuffle:action.shuffle};
      data.practicePresets=practice.validatePresets([...presets.filter(p=>p.id!==existing?.id),next]);break;
    }
    case 'deletePreset': {
      if(!data.practicePresets?.some(p=>p.id===action.id))throw new Error('Preset not found.');
      data.practicePresets=data.practicePresets.filter(p=>p.id!==action.id);break;
    }
    case 'createCourse': {const collectionId=organization.destination(data,action.collectionId);data.courses.push({id:id(),title:text(action.title,'Course title'),description:action.description ? text(action.description,'Description',1000):'',color:COLORS.includes(action.color)?action.color:'sage',units:[],...(collectionId?{collectionId}:{})});break;}
    case 'createUnit': if (!course) throw new Error('Course not found.'); course.units.push({id:id(),title:text(action.title,'Unit title'),quizzes:[]}); break;
    case 'saveQuiz': {
      if(action.quizId&&(!found||!unit||found.unit.id!==unit.id))throw new Error('Quiz not found.');
      if(action.quizId&&data.activeSession?.quizId===action.quizId)throw new Error('Finish or discard this quiz attempt before editing it.');
      if (!Array.isArray(action.questions) || !action.questions.length || action.questions.length > 10000) throw new Error('Add at least one question (up to 10,000).');
      const questions = Array.from(action.questions,(q,i)=>({...question(q,i),id:id()}));
      const reference=aids.reference(action.reference,questions.length);
      const title=text(action.title,'Quiz title');
      const place=planDestination(data,action.quizId?{courseId:course.id,unitId:unit.id}:action.target||{courseId:action.courseId,unitId:action.unitId});
      const portable={course:place.course.title,unit:place.unit.title,title,...(reference?{reference}:{}),questions:questions.map(({id,...q})=>q)};
      if (Buffer.byteLength(JSON.stringify(portable,null,2))>19*1024*1024) throw new Error('Keep a quiz below 19 MB so it can be exported and imported. Use smaller images or split it into quizzes.');
      if (action.quizId) {
        dailyReview.remapQuiz(data,found.quiz.questions,questions);
        found.quiz.title = title; found.quiz.questions = questions;if(reference)found.quiz.reference=reference;else delete found.quiz.reference;
      } else {commitDestination(data,place);place.unit.quizzes.push({id:id(),title,questions,...(reference?{reference}:{}),createdAt:new Date().toISOString()});}
      break;
    }
    case 'moveQuiz': {
      if(!found)throw new Error('Quiz not found.');
      const place=planDestination(data,action.target);
      if(place.unit===found.unit)break;
      commitDestination(data,place);
      found.unit.quizzes=found.unit.quizzes.filter(q=>q.id!==found.quiz.id);
      place.unit.quizzes.push(found.quiz);
      break;
    }
    case 'rename': {
      const item = found?.quiz || unit || course;
      if (!item) throw new Error('Item not found.'); item.title = text(action.title,'Title'); break;
    }
    case 'delete': {
      let removed;
      if (found) { removed=[found.quiz.id]; found.unit.quizzes = found.unit.quizzes.filter(q=>q.id!==action.quizId); }
      else if (unit) { removed=unit.quizzes.map(q=>q.id); course.units=course.units.filter(u=>u.id!==unit.id); }
      else if (course) { removed=course.units.flatMap(u=>u.quizzes.map(q=>q.id)); data.courses=data.courses.filter(c=>c.id!==course.id); }
      else throw new Error('Item not found.');
      data.attempts=data.attempts.filter(a=>!removed.includes(a.quizId));
      if (removed.includes(data.activeSession?.quizId)) data.activeSession=null;
      break;
    }
    case 'start':case 'startMissed': {
      const source=action.type==='startMissed'?data.attempts.find(a=>a.id===action.attemptId):null;
      const quiz=action.type==='startMissed'?(source?practice.sessionQuiz(data,{quizId:source.quizId,sourceAttemptId:source.id}):null):found?.quiz;
      if(!quiz||!quiz.questions.length)throw new Error(action.type==='startMissed'?'No missed questions to practice.':'Quiz not found or empty.');
      if(quiz.questions.some(q=>typeof q.id!=='string'||!q.id)||new Set(quiz.questions.map(q=>q.id)).size!==quiz.questions.length)throw new Error('These historical questions have invalid IDs. Import them as a new quiz to practice.');
      if (data.activeSession) throw new Error('Resume or discard your unfinished quiz first.');
      const options=action.practice===undefined?undefined:practice.validate(action.practice);
      const questionIds=quiz.questions.map(q=>q.id);
      if (action.shuffle) for (let i=questionIds.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [questionIds[i],questionIds[j]]=[questionIds[j],questionIds[i]]; }
      const optionOrders=options?.shuffleAnswers?Object.fromEntries(quiz.questions.filter(questionModel.isChoice).map(q=>{const order=q.options.map((_,i)=>i);for(let i=order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}return [q.id,order];})):null;
      data.activeSession={quizId:quiz.id,questionIds,answers:{},position:0,startedAt:new Date(now).toISOString(),...(optionOrders?{optionOrders}:{}),...(source?{sourceAttemptId:source.id}:{}),...(options?{practice:options,...(options.feedback==='instant'?{checkedQuestionIds:[]}: {})}:{})};timing.begin(data.activeSession,now);break;
    }
    case 'answer': {
      const s=data.activeSession; if (!s) throw new Error('No quiz in progress.');
      const q=practice.sessionQuiz(data,s).questions.find(q=>q.id===action.questionId);
      if (!q || !questionModel.validAnswer(q,action.answer,true)) throw new Error('Invalid answer.');
      if(s.checkedQuestionIds?.includes(q.id))throw new Error('This answer is already checked. Start a new attempt to try again.');
      timing.settle(s,now);
      s.answers[q.id]=structuredClone(action.answer);
      if(s.practice?.feedback==='instant'&&questionModel.typeOf(q).selection==='single')s.checkedQuestionIds.push(q.id);
      break;
    }
    case 'checkAnswer': {
      const s=data.activeSession,q=s&&practice.sessionQuiz(data,s).questions.find(q=>q.id===action.questionId);
      if(!s||s.practice?.feedback!=='instant'||!q||!questionModel.validAnswer(q,s.answers[q.id]))throw new Error('Select an answer before checking it.');
      timing.settle(s,now);if(!s.checkedQuestionIds.includes(q.id))s.checkedQuestionIds.push(q.id);break;
    }
    case 'position': {
      const s=data.activeSession;
      if (!s || !Number.isInteger(action.position) || action.position<0 || action.position>=s.questionIds.length) throw new Error('Invalid question position.');
      timing.settle(s,now);s.position=action.position;if(s.timing)s.timing.questionMs[s.questionIds[s.position]]??=0;break;
    }
    case 'flag': {
      const s=data.activeSession;
      if(!s||s.practice?.allowFlags===false||!s.questionIds.includes(action.questionId))throw new Error('Flag a question in this attempt.');
      timing.settle(s,now);const flags=s.flaggedQuestionIds||[];s.flaggedQuestionIds=flags.includes(action.questionId)?flags.filter(id=>id!==action.questionId):[...flags,action.questionId];break;
    }
    case 'resume': {
      const s=data.activeSession;if(!s)throw new Error('No quiz in progress.');
      if(!s.timing)timing.begin(s,now,true);else if(s.timing.runningSince===null)s.timing.runningSince=now;
      break;
    }
    case 'pause':timing.settle(data.activeSession,now);if(data.activeSession?.timing)data.activeSession.timing.runningSince=null;break;
    case 'tick':timing.settle(data.activeSession,now);break;
    case 'discard': data.activeSession=null; break;
    case 'finish': {
      const s=data.activeSession; if (!s) throw new Error('No quiz in progress.');
      const q=practice.sessionQuiz(data,s);
      const byId=new Map(q.questions.map(item=>[item.id,item])),questions=s.questionIds.map(key=>byId.get(key)),checked=new Set(s.checkedQuestionIds);
      if (questions.some(item=>!item||!questionModel.validAnswer(item,s.answers[item.id]))) throw new Error('Answer every question before finishing.');
      if(s.practice?.feedback==='instant'&&s.questionIds.some(key=>!checked.has(key)))throw new Error('Check every answer before finishing.');
      timing.settle(s,now);
      const answers=s.questionIds.map(key=>s.answers[key]);
      data.attempts.push({id:id(),quizId:q.id,title:q.title,questions:structuredClone(questions),...(aids.remap(q.reference,q.questions,questions)?{reference:aids.remap(q.reference,q.questions,questions)}:{}),answers:structuredClone(answers),score:questions.filter((q,i)=>questionModel.isCorrect(q,answers[i])).length,total:questions.length,completedAt:new Date(now).toISOString(),elapsedSeconds:s.timing?Math.round(s.timing.elapsedMs/1000):Math.max(0,Math.round((now-Date.parse(s.startedAt))/1000)),...timing.attemptFields(s),...(s.practice?{practice:{...s.practice}}:{}),...(s.sourceAttemptId?{missedOnly:true}:{})});
      data.activeSession=null; break;
    }
    default: throw new Error('Unknown action.');
  }
  if(['saveQuiz','delete'].includes(action.type))dailyReview.reconcile(data);
  return data;
}
module.exports = { id, COLORS, question, parseCSV, parseImport, exportQuiz, emptyLibrary, validateLibrary, findQuiz, importPacks, mutate, ...questionModel };
