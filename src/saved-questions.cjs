const {createHash,randomUUID}=require('node:crypto');
const questions=require('./ui/question-types.js');
const {signature}=require('./ui/question-identity.js');
const practice=require('./ui/practice.js');
const daily=require('./ui/daily-review.js');
const notebook=require('./mistake-notebook.cjs');
const MAX_ITEMS=20000,MAX_BYTES=64*1024*1024,MAX_PRACTICE=100,PAGE_SIZE=20;
const empty=()=>({version:1,items:[],session:null});
const keyFor=q=>createHash('sha256').update(signature(q)).digest('hex');
const validKey=key=>typeof key==='string'&&/^[a-f0-9]{64}$/.test(key);
function bounded(state){
  if(state.items.length>MAX_ITEMS||Buffer.byteLength(JSON.stringify(state))>MAX_BYTES)throw new Error('Saved questions is full (20,000 questions / 64 MB). Remove a saved question before saving another.');
}
function current(data){const state=data.savedQuestions,s=state?.session;return s?state.items.find(item=>item.key===s.keys[s.position]):null;}
function filterValue(raw={}){
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!['courseId','unitId','quizId','unlinked'].includes(k)))throw new Error('Choose valid saved-question filters.');
  const f={courseId:raw.courseId??'',unitId:raw.unitId??'',quizId:raw.quizId??'',unlinked:raw.unlinked??false};
  if(['courseId','unitId','quizId'].some(k=>typeof f[k]!=='string'||f[k].length>MAX_BYTES)||typeof f.unlinked!=='boolean'||(f.unitId&&!f.courseId)||(f.quizId&&!f.unitId)||(f.unlinked&&(f.courseId||f.unitId||f.quizId)))throw new Error('Choose valid saved-question filters.');
  return f;
}
// Resolve old copies without rewriting them. Stored origins retain edited/deleted
// sources; live content and historical snapshots also link identical copies.
function sourceIndex(data,items){
  const byQuiz=new Map(),links=new Map(items.map(item=>[item.key,new Map()]));
  const add=(q,place)=>{const sources=links.get(keyFor(q));if(sources)sources.set(place.quizId,place);};
  if(!items.length)return links;
  for(const c of data.courses)for(const u of c.units)for(const q of u.quizzes){
    const place={courseId:c.id,unitId:u.id,quizId:q.id,courseTitle:c.title,unitTitle:u.title,quizTitle:q.title};byQuiz.set(q.id,place);
    for(const question of q.questions)add(question,place);
  }
  for(const a of data.attempts){const place=byQuiz.get(a.quizId);if(place)for(const q of a.questions)add(q,place);}
  for(const item of items)if(item.origin){const place=byQuiz.get(item.origin.quizId)||item.origin;links.get(item.key).set(place.quizId,place);}
  return links;
}
function matchingSources(sources,f){return [...sources.values()].filter(p=>(!f.courseId||p.courseId===f.courseId)&&(!f.unitId||p.unitId===f.unitId)&&(!f.quizId||p.quizId===f.quizId));}
function selection(data,raw){
  const filter=filterValue(raw),all=data.savedQuestions?.items||[],links=sourceIndex(data,all);
  const items=all.filter(item=>filter.unlinked?!links.get(item.key).size:matchingSources(links.get(item.key),filter).length||(!filter.courseId&&!links.get(item.key).size));
  return {filter,all,links,items};
}
const studyAids=require('./ui/study-aids.js');
function sourceQuestion(data,source){
  let q,title,quizId;
  if(!source||typeof source!=='object'||Array.isArray(source))throw new Error('Open this question again before saving it.');
  if(source.source==='quiz'){
    const s=data.activeSession,quiz=s&&practice.sessionQuiz(data,s);
    if(s&&s.questionIds[s.position]===source.questionId){q=quiz?.questions.find(q=>q.id===source.questionId);if(q)q=studyAids.capture(q,quiz);title=quiz?.title;quizId=s.quizId;}
  }else if(source.source==='result'){
    const attempt=data.attempts.find(a=>a.id===source.attemptId);
    if(attempt&&Number.isInteger(source.questionIndex)&&source.questionIndex>=0){q=attempt.questions[source.questionIndex];if(q)q=studyAids.capture(q,attempt);title=attempt.title;quizId=attempt.quizId;}
  }else if(source.source==='daily'){
    const s=data.dailyReview?.active,item=daily.current(data);
    if(s&&s.token===source.token&&item?.question.id===source.questionId){q=studyAids.capture(item.question,item.quiz);title=item.quiz.title;quizId=item.quiz.id;}
  }else if(source.source==='notebook'&&validKey(source.key)){
    const item=notebook.collect(data).find(e=>e.key===source.key);q=item?.question;title=item?.title;
  }else if(source.source==='mistake'){
    const s=data.mistakeNotebook?.session;
    if(s&&s.token===source.token){const item=data.mistakeNotebook.entries.find(e=>e.key===s.keys[s.position]);q=item?.question;title=item?.title;}
  }else if(source.source==='saved'&&validKey(source.key)){
    const item=data.savedQuestions?.items.find(e=>e.key===source.key);q=item?.question;title=item?.title;
  }else if(source.source==='savedPractice'){
    if(data.savedQuestions?.session&&data.savedQuestions.session.token===source.token){const item=current(data);q=item?.question;title=item?.title;}
  }
  if(!q||typeof title!=='string')throw new Error('Open this question again before saving it.');
  return {question:q,title,quizId};
}
function page(data,index=0,raw){
  if(!Number.isSafeInteger(index)||index<0)throw new Error('Choose a valid saved-questions page.');
  const {filter,all,links,items}=selection(data,raw),pages=Math.max(1,Math.ceil(items.length/PAGE_SIZE)),p=Math.min(index,pages-1);
  const ordered=[...items].reverse();
  const courses=new Map(),units=new Map(),quizzes=new Map();let unlinkedCount=0;
  for(const item of all){const sources=links.get(item.key);if(!sources.size)unlinkedCount++;for(const place of sources.values()){
    courses.set(place.courseId,{id:place.courseId,title:place.courseTitle});
    if(place.courseId===filter.courseId){units.set(place.unitId,{id:place.unitId,title:place.unitTitle});if(place.unitId===filter.unitId)quizzes.set(place.quizId,{id:place.quizId,title:place.quizTitle});}
  }}
  const sort=map=>[...map.values()].sort((a,b)=>a.title.localeCompare(b.title)||a.id.localeCompare(b.id));
  return {total:items.length,collectionTotal:all.length,page:p,pages,filter,options:{courses:sort(courses),units:sort(units),quizzes:sort(quizzes)},unlinkedCount,items:ordered.slice(p*PAGE_SIZE,(p+1)*PAGE_SIZE).map(item=>{
    const place=matchingSources(links.get(item.key),filter)[0];return {...structuredClone(item),sourceLabel:place?`${place.courseTitle} / ${place.unitTitle} / ${place.quizTitle}`:'Unlinked question'};
  })};
}
function mutate(data,action,now,normalizeQuestion){
  if(action.type==='savedAdd'){
    const source=sourceQuestion(data,action.source),q=normalizeQuestion(source.question),key=keyFor(q);
    const state=data.savedQuestions||empty();
    if(state.items.some(item=>item.key===key))return;
    q.id=key; // Snapshot IDs are independent of source IDs and survive source edits.
    const sources=[...sourceIndex(data,[{key}]).get(key).values()],origin=sources.find(p=>p.quizId===source.quizId)||(sources.length===1?sources[0]:null);
    state.items.push({key,question:q,title:source.title,savedAt:new Date(now).toISOString(),...(origin?{origin:{...origin}}:{})});
    bounded(state);data.savedQuestions=state;return;
  }
  if(action.type==='savedRemove'){
    if(!validKey(action.key))throw new Error('Choose a saved question to remove.');
    const state=data.savedQuestions;
    if(state?.session?.keys.includes(action.key))throw new Error('Finish or end your saved practice before removing this question.');
    if(state)state.items=state.items.filter(item=>item.key!==action.key);
    return;
  }
  if(action.type==='savedStart'){
    const state=data.savedQuestions;
    if(state?.session)return;
    if(!Number.isInteger(action.limit)||action.limit<1||action.limit>MAX_PRACTICE)throw new Error('Choose 1–100 questions for this practice.');
    if(!state?.items.length)throw new Error('Star a question before starting saved practice.');
    const keys=selection(data,action.filter).items.map(item=>item.key);
    if(!keys.length)throw new Error('No saved questions match these filters. Clear or change the filters first.');
    for(let i=keys.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[keys[i],keys[j]]=[keys[j],keys[i]];}
    state.session={token:randomUUID(),keys:keys.slice(0,action.limit),position:0,answer:null,checked:false,correct:0};bounded(state);return;
  }
  const s=data.savedQuestions?.session,item=current(data);
  if(!s||!item||s.token!==action.token)throw new Error('This saved practice has changed. Open Saved questions again.');
  if(action.type==='savedDiscard'){data.savedQuestions.session=null;return;}
  if(action.type==='savedAnswer'){
    if(s.checked)throw new Error('This answer is already checked.');
    if(!questions.validAnswer(item.question,action.answer,true))throw new Error('Choose a valid answer.');
    s.answer=structuredClone(action.answer);bounded(data.savedQuestions);return;
  }
  if(action.type==='savedCheck'){
    if(!questions.validAnswer(item.question,s.answer))throw new Error('Choose an answer before checking.');
    s.checked=true;bounded(data.savedQuestions);return;
  }
  if(action.type==='savedNext'){
    if(!s.checked)throw new Error('Check your answer before continuing.');
    if(questions.reviewedCorrect(item.question,s.answer,s.selfCorrected))s.correct++;
    if(s.position===s.keys.length-1){data.savedQuestions.lastResult={correct:s.correct,total:s.keys.length,completedAt:new Date(now).toISOString()};data.savedQuestions.session=null;}
    else{s.position++;s.token=randomUUID();s.answer=null;s.checked=false;delete s.selfCorrected;}
    bounded(data.savedQuestions);return;
  }
  throw new Error('Unknown saved-question action.');
}
function validate(raw,normalizeQuestion){
  const fail=()=>{throw new Error('Backup contains invalid saved questions or practice progress.');};
  const integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
  const timestamp=value=>typeof value==='string'&&value.length<=100&&Number.isFinite(Date.parse(value));
  if(!raw||raw.version!==1||!Array.isArray(raw.items)||raw.items.length>MAX_ITEMS)fail();
  const keys=new Set(),items=raw.items.map(item=>{
    if(!item||!validKey(item.key)||keys.has(item.key)||typeof item.title!=='string'||!item.title.trim()||item.title.length>200||!timestamp(item.savedAt)||typeof item.question?.id!=='string'||!item.question.id||item.question.id.length>200)fail();
    const q=normalizeQuestion(item.question);if(keyFor(q)!==item.key)fail();keys.add(item.key);
    let origin;
    if(item.origin!==undefined){
      const o=item.origin,fields=['courseId','unitId','quizId','courseTitle','unitTitle','quizTitle'];
      if(!o||typeof o!=='object'||Array.isArray(o)||fields.some(k=>typeof o[k]!=='string'||!o[k]||(!k.endsWith('Id')&&!o[k].trim())||o[k].length>(k.endsWith('Id')?MAX_BYTES:200)))fail();
      origin=Object.fromEntries(fields.map(k=>[k,o[k]]));
    }
    return {key:item.key,question:q,title:item.title,savedAt:item.savedAt,...(origin?{origin}:{})};
  });
  const result={version:1,items,session:null};
  if(raw.session!==null){
    const s=raw.session;
    if(!s||!Array.isArray(s.keys)||!integer(s.keys.length,1,MAX_PRACTICE)||new Set(s.keys).size!==s.keys.length||s.keys.some(key=>!keys.has(key))||!integer(s.position,0,s.keys.length-1)||typeof s.token!=='string'||!s.token||s.token.length>100||typeof s.checked!=='boolean'||!integer(s.correct,0,s.position))fail();
    const q=items.find(item=>item.key===s.keys[s.position]).question;
    if((s.answer!==null&&!questions.validAnswer(q,s.answer,true))||(s.checked&&!questions.validAnswer(q,s.answer)))fail();
    result.session={token:s.token,keys:[...s.keys],position:s.position,answer:structuredClone(s.answer),checked:s.checked,...(questions.selfCorrectionFlag(s.selfCorrected,q,s.answer,s.checked)?{selfCorrected:true}:{}),correct:s.correct};
  }
  if(raw.lastResult!==undefined){const r=raw.lastResult;if(!r||!integer(r.total,1,MAX_PRACTICE)||!integer(r.correct,0,r.total)||!timestamp(r.completedAt))fail();result.lastResult={correct:r.correct,total:r.total,completedAt:r.completedAt};}
  bounded(result);return result;
}
module.exports={keyFor,sourceQuestion,page,current,mutate,validate,MAX_ITEMS,MAX_BYTES,MAX_PRACTICE};
