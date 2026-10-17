const { randomUUID } = require('node:crypto');
const { MAX_HTML_LENGTH, imageData } = require('./ui/content-policy.js');
const questionModel = require('./ui/question-types.js');
const codePolicy = require('./ui/code-policy.js');
const timing = require('./ui/timing.js');
const id = () => randomUUID();
const COLORS = ['sage', 'peach', 'lavender', 'blue', 'sand'];
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
  const choices = raw.options ?? raw.choices;
  if (!Array.isArray(choices) || choices.length < type.minOptions || choices.length > type.maxOptions)
    throw new Error(`${label}: ${type.label} needs ${type.minOptions}–${type.maxOptions} options.`);
  const options = choices.map((v, i) => contentText(typeof v === 'object' && v ? v.text : v, `${label}: option ${i + 1}`, format==='text'?5000:contentLimit));
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
  const explanation = raw.explanation ?? '';
  if (typeof explanation !== 'string' || explanation.length > contentLimit) throw new Error(`${label}: invalid explanation.`);
  const result = { id: typeof raw.id === 'string' ? raw.id : id(), prompt, options, ...(multiple ? { correctAnswers:answer.sort((a,b)=>a-b) } : { correctAnswer:answer }), explanation };
  if (raw.type !== undefined || multiple) result.type=type.id;
  if (format!=='text') result.format=format;
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
  if (!headers.includes('question') || !headers.includes('answer')) throw new Error('CSV needs question and answer columns.');
  return rows.map((r, i) => {
    if (r.length !== headers.length) throw new Error(`CSV row ${i + 2} has ${r.length} cells; expected ${headers.length}.`);
    return Object.fromEntries(headers.map((h, j) => [h, r[j]]));
  });
}
function parseImport(source, extension = 'json', filename = 'Imported quiz') {
  if (typeof source !== 'string' || Buffer.byteLength(source) > 20 * 1024 * 1024) throw new Error('Import files must be smaller than 20 MB.');
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
      if (questionModel.typeOf({type}).selection==='multiple') {
        try { answer=JSON.parse(answer); } catch { throw new Error('CSV multiple-answer answers must be a JSON array, such as [0,2] or ["A","C"].'); }
      }
      groups.get(key).questions.push({ type, prompt: r.question, options, answer, explanation: r.explanation || '', format:r.format?.trim()||'text', image:r.image||undefined, imageAlt:r.image_alt||'', ...(r.code?.trim()?{code:r.code,codeLanguage:r.code_language?.trim()||'plaintext'}:{}) });
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
    return {
      course: text(p.course || 'Imported course', 'Course'), unit: text(p.unit || 'Unit 1', 'Unit'),
      title: text(p.title || filename, 'Quiz title'), questions: p.questions.map((q, n) => ({ ...question(q, n), id: id() }))
    };
  });
  if (count > 10000) throw new Error('Import up to 10,000 questions at a time.');
  return result;
}
function emptyLibrary() { return { version: 1, courses: [], attempts: [], activeSession: null }; }
function validateLibrary(raw) {
  if (!raw || raw.version !== 1 || !Array.isArray(raw.courses) || !Array.isArray(raw.attempts)) throw new Error('Unsupported or damaged Quiznet backup.');
  const ids = new Set();
  const checkedID = value => { if (typeof value !== 'string' || !value || ids.has(value)) throw new Error('Backup contains missing or duplicate IDs.'); ids.add(value); return value; };
  const courses = raw.courses.map(c => ({
    id: checkedID(c.id), title: text(c.title, 'Course'), description: typeof c.description === 'string' ? c.description.slice(0,1000) : '',
    color: COLORS.includes(c.color) ? c.color : 'sage',
    units: (Array.isArray(c.units) ? c.units : (() => { throw new Error('Course is missing units.'); })()).map(u => ({
      id: checkedID(u.id), title: text(u.title, 'Unit'),
      quizzes: (Array.isArray(u.quizzes) ? u.quizzes : (() => { throw new Error('Unit is missing quizzes.'); })()).map(q => ({
        id: checkedID(q.id), title: text(q.title, 'Quiz'), createdAt: q.createdAt || new Date().toISOString(),
        questions: (Array.isArray(q.questions) ? q.questions : (() => { throw new Error('Quiz is missing questions.'); })()).map((item, i) => { const n = question(item,i); n.id = checkedID(item.id); return n; })
      }))
    }))
  }));
  const library = { version: 1, courses, attempts: [], activeSession: null };
  library.attempts = raw.attempts.map(a => {
    if (!a || typeof a.quizId !== 'string' || !Array.isArray(a.questions) || !Array.isArray(a.answers) || !Number.isFinite(a.elapsedSeconds) || a.elapsedSeconds < 0 || !Number.isFinite(Date.parse(a.completedAt))) throw new Error('Backup contains an invalid attempt.');
    const questions = a.questions.map(question);
    if (!questions.length || a.answers.length !== questions.length || a.answers.some((v,i) => !questionModel.validAnswer(questions[i],v))) throw new Error('Backup contains invalid answers.');
    return { id: checkedID(a.id), quizId: a.quizId, title: text(a.title, 'Attempt title'), completedAt: a.completedAt, elapsedSeconds: a.elapsedSeconds, questions, answers: structuredClone(a.answers), total: questions.length, score: questions.filter((q,i)=>questionModel.isCorrect(q,a.answers[i])).length, ...timing.validateAttempt(a,questions.length) };
  });
  if (raw.activeSession) {
    const s = raw.activeSession, q = findQuiz(library,s.quizId)?.quiz;
    if (!q || !Array.isArray(s.questionIds) || new Set(s.questionIds).size !== q.questions.length || s.questionIds.length !== q.questions.length || s.questionIds.some(key => !q.questions.some(item => item.id === key)) || !Number.isInteger(s.position) || s.position < 0 || s.position >= q.questions.length || !Number.isFinite(Date.parse(s.startedAt)) || !s.answers || typeof s.answers !== 'object') throw new Error('Backup has an invalid unfinished quiz.');
    const answers = {};
    for (const [key,value] of Object.entries(s.answers)) {
      const item = q.questions.find(item=>item.id===key);
      if (!item || !questionModel.validAnswer(item,value,true)) throw new Error('Backup has an invalid saved answer.');
      answers[key] = structuredClone(value);
    }
    library.activeSession = { quizId:s.quizId, questionIds:s.questionIds, answers, position:s.position, startedAt:s.startedAt };
    if(s.timing!==undefined)library.activeSession.timing=timing.validate(s.timing,s.questionIds);
  }
  return library;
}
function findQuiz(data, quizId) {
  for (const course of data.courses) for (const unit of course.units) {
    const quiz = unit.quizzes.find(q => q.id === quizId);
    if (quiz) return { course, unit, quiz };
  }
  return null;
}
function importPacks(data, packs, target) {
  for (const p of packs) {
    let course = target?.courseId ? data.courses.find(c => c.id === target.courseId) : data.courses.find(c => c.title.toLowerCase() === p.course.toLowerCase());
    if (target?.courseId && !course) throw new Error('Selected course no longer exists.');
    if (!course) { course = { id:id(), title:p.course, description:'', color:COLORS[data.courses.length % COLORS.length], units:[] }; data.courses.push(course); }
    let unit = target?.unitId ? course.units.find(u => u.id === target.unitId) : course.units.find(u => u.title.toLowerCase() === p.unit.toLowerCase());
    if (target?.unitId && !unit) throw new Error('Selected unit no longer exists.');
    if (!unit) { unit = { id:id(), title:p.unit, quizzes:[] }; course.units.push(unit); }
    let title = p.title, suffix = 2;
    while (unit.quizzes.some(q => q.title === title)) title = `${p.title} (${suffix++})`;
    unit.quizzes.push({ id:id(), title, questions:p.questions.map((q,i)=>({...question(q,i),id:id()})), createdAt:new Date().toISOString() });
  }
}
function mutate(data, action, now=Date.now()) {
  if (!action || typeof action.type !== 'string') throw new Error('Invalid action.');
  const course = data.courses.find(c => c.id === action.courseId);
  const unit = course?.units.find(u => u.id === action.unitId);
  const found = action.quizId ? findQuiz(data, action.quizId) : null;
  if(['rename','delete'].includes(action.type)) {
    if(action.quizId && !found) throw new Error('Quiz not found.');
    if(action.unitId && !unit) throw new Error('Unit not found.');
    if(action.courseId && !course) throw new Error('Course not found.');
  }
  switch (action.type) {
    case 'createCourse': data.courses.push({id:id(),title:text(action.title,'Course title'),description:action.description ? text(action.description,'Description',1000):'',color:COLORS.includes(action.color)?action.color:'sage',units:[]}); break;
    case 'createUnit': if (!course) throw new Error('Course not found.'); course.units.push({id:id(),title:text(action.title,'Unit title'),quizzes:[]}); break;
    case 'saveQuiz': {
      if (!unit) throw new Error('Unit not found.');
      if (!Array.isArray(action.questions) || !action.questions.length || action.questions.length > 10000) throw new Error('Add at least one question (up to 10,000).');
      const questions = action.questions.map((q,i)=>({...question(q,i),id:id()}));
      const title=text(action.title,'Quiz title');
      const portable={course:course.title,unit:unit.title,title,questions:questions.map(({id,...q})=>q)};
      if (Buffer.byteLength(JSON.stringify(portable,null,2))>19*1024*1024) throw new Error('Keep a quiz below 19 MB so it can be exported and imported. Use smaller images or split it into quizzes.');
      if (action.quizId) {
        if (!found || found.unit.id !== unit.id) throw new Error('Quiz not found.');
        if (data.activeSession?.quizId === action.quizId) throw new Error('Finish or discard this quiz attempt before editing it.');
        found.quiz.title = title; found.quiz.questions = questions;
      } else unit.quizzes.push({id:id(),title,questions,createdAt:new Date().toISOString()});
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
    case 'start': {
      if (!found || !found.quiz.questions.length) throw new Error('Quiz not found or empty.');
      if (data.activeSession) throw new Error('Resume or discard your unfinished quiz first.');
      const questionIds=found.quiz.questions.map(q=>q.id);
      if (action.shuffle) for (let i=questionIds.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [questionIds[i],questionIds[j]]=[questionIds[j],questionIds[i]]; }
      data.activeSession={quizId:found.quiz.id,questionIds,answers:{},position:0,startedAt:new Date(now).toISOString()};timing.begin(data.activeSession,now);break;
    }
    case 'answer': {
      const s=data.activeSession; if (!s) throw new Error('No quiz in progress.');
      const q=findQuiz(data,s.quizId).quiz.questions.find(q=>q.id===action.questionId);
      if (!q || !questionModel.validAnswer(q,action.answer,true)) throw new Error('Invalid answer.');
      timing.settle(s,now);
      s.answers[q.id]=structuredClone(action.answer); break;
    }
    case 'position': {
      const s=data.activeSession;
      if (!s || !Number.isInteger(action.position) || action.position<0 || action.position>=s.questionIds.length) throw new Error('Invalid question position.');
      timing.settle(s,now);s.position=action.position;if(s.timing)s.timing.questionMs[s.questionIds[s.position]]??=0;break;
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
      const q=findQuiz(data,s.quizId).quiz;
      if (s.questionIds.some(key=>!questionModel.validAnswer(q.questions.find(item=>item.id===key),s.answers[key]))) throw new Error('Answer every question before finishing.');
      timing.settle(s,now);
      const questions=s.questionIds.map(key=>q.questions.find(q=>q.id===key)), answers=s.questionIds.map(key=>s.answers[key]);
      data.attempts.push({id:id(),quizId:q.id,title:q.title,questions:structuredClone(questions),answers:structuredClone(answers),score:questions.filter((q,i)=>questionModel.isCorrect(q,answers[i])).length,total:questions.length,completedAt:new Date(now).toISOString(),elapsedSeconds:s.timing?Math.round(s.timing.elapsedMs/1000):Math.max(0,Math.round((now-Date.parse(s.startedAt))/1000)),...timing.attemptFields(s)});
      data.activeSession=null; break;
    }
    default: throw new Error('Unknown action.');
  }
  return data;
}
module.exports = { id, COLORS, question, parseCSV, parseImport, emptyLibrary, validateLibrary, findQuiz, importPacks, mutate, ...questionModel };
