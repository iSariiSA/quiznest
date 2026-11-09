const {createHash,randomUUID}=require('node:crypto');
const questions=require('./ui/question-types.js'),studyAids=require('./ui/study-aids.js');
const empty=()=>({version:1,entries:[],session:null});
const keyFor=q=>createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.entries(q).filter(([k])=>k!=='id'&&k!=='studyReference').sort(([a],[b])=>a.localeCompare(b))))).digest('hex');
function collect(data){
  const map=new Map();
  const add=(entry,count)=>{const old=map.get(entry.key);if(!old)map.set(entry.key,{...structuredClone(entry),count});else{old.count+=count;if(Date.parse(entry.lastAt)>Date.parse(old.lastAt))Object.assign(old,{question:structuredClone(entry.question),answer:structuredClone(entry.answer),title:entry.title,lastAt:entry.lastAt});}};
  for(const a of data.attempts)for(let i=0;i<a.questions.length;i++){const q=a.questions[i];if(!questions.isCorrect(q,a.answers[i]))add({key:keyFor(q),question:studyAids.capture(q,a),answer:a.answers[i],title:a.title,lastAt:a.completedAt,note:''},1);}
  for(const e of data.mistakeNotebook?.entries||[]){add(e,e.dailyCount);map.get(e.key).note=e.note;}
  return [...map.values()].sort((a,b)=>Date.parse(b.lastAt)-Date.parse(a.lastAt)||a.key.localeCompare(b.key));
}
function bounded(s){if(s.entries.length>20000||Buffer.byteLength(JSON.stringify(s))>64*1024*1024)throw new Error('Mistake notebook storage is full (20,000 saved entries / 64 MB). Save a backup, then remove saved copies from the notebook to free space.');}
function pin(data,item){const s=data.mistakeNotebook??=empty();let e=s.entries.find(e=>e.key===item.key);if(!e){e={key:item.key,question:structuredClone(item.question),answer:structuredClone(item.answer),title:item.title,lastAt:item.lastAt,dailyCount:0,note:''};s.entries.push(e);}return e;}
function record(data,q,answer,title,now){if(questions.isCorrect(q,answer))return;const item={key:keyFor(q),question:q,answer,title,lastAt:new Date(now).toISOString()},e=pin(data,item);Object.assign(e,item);e.dailyCount++;bounded(data.mistakeNotebook);}
function page(data,index=0){if(!Number.isInteger(index)||index<0)throw new Error('Choose a valid notebook page.');const items=collect(data),pages=Math.max(1,Math.ceil(items.length/20)),p=Math.min(index,pages-1);return {total:items.length,page:p,pages,items:items.slice(p*20,p*20+20),session:sessionView(data)};}
function sessionView(data){const s=data.mistakeNotebook?.session;if(!s)return null;const e=data.mistakeNotebook.entries.find(e=>e.key===s.keys[s.position]);return {...structuredClone(s),item:structuredClone(e)};}
function mutate(data,a){
  if(a.type==='mistakeRemove'){
    const s=data.mistakeNotebook;if(!s?.entries.some(e=>e.key===a.key))throw new Error('This question has no saved notebook copy.');
    if(s.session?.keys.includes(a.key))throw new Error('Finish your focused review before removing this saved copy.');
    s.entries=s.entries.filter(e=>e.key!==a.key);return;
  }
  if(a.type==='mistakeNote'){
    if(typeof a.note!=='string'||a.note.length>5000)throw new Error('Keep your note within 5,000 characters.');
    const item=collect(data).find(e=>e.key===a.key);if(!item)throw new Error('This mistake is no longer available.');pin(data,item).note=a.note;bounded(data.mistakeNotebook);return;
  }
  if(a.type==='mistakeStart'){
    const s=data.mistakeNotebook??=empty();if(s.session)return;
    const items=collect(data).slice(0,20);if(!items.length)throw new Error('No mistakes to review yet.');for(const e of items)pin(data,e);
    s.session={token:randomUUID(),keys:items.map(e=>e.key),position:0,answer:null,checked:false,correct:0};bounded(s);return;
  }
  const s=data.mistakeNotebook?.session,item=sessionView(data)?.item;
  if(!s||!item||s.token!==a.token)throw new Error('This practice question has changed. Reopen the notebook.');
  if(a.type==='mistakeAnswer'){if(s.checked)throw new Error('This answer is already checked.');if(!questions.validAnswer(item.question,a.answer,true))throw new Error('Choose a valid answer.');s.answer=structuredClone(a.answer);return;}
  if(a.type==='mistakeCheck'){if(!questions.validAnswer(item.question,s.answer))throw new Error('Choose an answer first.');s.checked=true;return;}
  if(a.type==='mistakeNext'){
    if(!s.checked)throw new Error('Check your answer first.');if(questions.isCorrect(item.question,s.answer))s.correct++;
    if(s.position===s.keys.length-1){data.mistakeNotebook.lastResult={correct:s.correct,total:s.keys.length};data.mistakeNotebook.session=null;}
    else{s.position++;s.token=randomUUID();s.answer=null;s.checked=false;}return;
  }
  throw new Error('Unknown notebook action.');
}
function validate(raw,question){
  const fail=()=>{throw new Error('Backup contains invalid mistake notebook data.');};
  if(!raw||raw.version!==1||!Array.isArray(raw.entries)||raw.entries.length>20000)fail();const keys=new Set();
  const entries=raw.entries.map(e=>{if(!e||typeof e.key!=='string'||keys.has(e.key)||typeof e.note!=='string'||e.note.length>5000||typeof e.title!=='string'||e.title.length>200||typeof e.lastAt!=='string'||e.lastAt.length>100||!Number.isFinite(Date.parse(e.lastAt))||!Number.isSafeInteger(e.dailyCount)||e.dailyCount<0)fail();const q=question(e.question);if(keyFor(q)!==e.key||!questions.validAnswer(q,e.answer)||questions.isCorrect(q,e.answer))fail();keys.add(e.key);return {key:e.key,question:q,answer:structuredClone(e.answer),title:e.title,lastAt:e.lastAt,dailyCount:e.dailyCount,note:e.note};});
  const result={version:1,entries,session:null};
  if(raw.session!==null){const s=raw.session;if(!s||!Array.isArray(s.keys)||!s.keys.length||s.keys.length>20||new Set(s.keys).size!==s.keys.length||s.keys.some(k=>!keys.has(k))||!Number.isInteger(s.position)||s.position<0||s.position>=s.keys.length||typeof s.token!=='string'||!s.token||s.token.length>100||typeof s.checked!=='boolean'||!Number.isInteger(s.correct)||s.correct<0||s.correct>s.position)fail();const q=entries.find(e=>e.key===s.keys[s.position]).question;if(s.answer!==null&&!questions.validAnswer(q,s.answer,true)||s.checked&&!questions.validAnswer(q,s.answer))fail();result.session={token:s.token,keys:[...s.keys],position:s.position,answer:structuredClone(s.answer),checked:s.checked,correct:s.correct};}
  if(raw.lastResult!==undefined){const r=raw.lastResult;if(!r||!Number.isInteger(r.total)||r.total<1||r.total>20||!Number.isInteger(r.correct)||r.correct<0||r.correct>r.total)fail();result.lastResult={correct:r.correct,total:r.total};}
  bounded(result);return result;
}
module.exports={collect,page,record,mutate,validate};
