const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const core=require('../src/core.cjs'),saved=require('../src/saved-questions.cjs'),notebook=require('../src/mistake-notebook.cjs'),{Store}=require('../src/store.cjs');
const image=require('./fixtures/image-types.json').png;
const now=new Date(2026,9,29,12).getTime();
function fixture(count=3){
  const d=core.emptyLibrary();core.importPacks(d,core.parseImport(JSON.stringify({title:'Saved examples',questions:Array.from({length:count},(_,i)=>i===1?{type:'multiple-answer',prompt:'Choose even values.',options:['2','3','4'],correctAnswers:[0,2],explanation:'Two and four are even.'}:{format:'markdown',prompt:`Question ${i+1}: $2+2$?`,options:['4','5'],correctAnswer:0,explanation:'Two pairs make four.',...(i===0?{code:'print(2 + 2)',codeLanguage:'python',image,imageAlt:'Synthetic diagram'}:{})})})));
  const quiz=d.courses[0].units[0].quizzes[0];core.mutate(d,{type:'start',quizId:quiz.id},now);for(const q of quiz.questions)core.mutate(d,{type:'answer',questionId:q.id,answer:q.correctAnswers?[0]:1},now);core.mutate(d,{type:'finish'},now);
  return d;
}
function add(d,index=0){core.mutate(d,{type:'savedAdd',source:{source:'result',attemptId:d.attempts[0].id,questionIndex:index}},now);}
function finishSaved(d){while(d.savedQuestions.session){const s=d.savedQuestions.session,q=saved.current(d).question;core.mutate(d,{type:'savedAnswer',token:s.token,answer:q.correctAnswers||q.correctAnswer},now);core.mutate(d,{type:'savedCheck',token:s.token},now);core.mutate(d,{type:'savedNext',token:s.token},now);}}
test('old libraries load unchanged; stars are idempotent snapshots and preserve quiz answers, scores, and schedules',()=>{
 const d=fixture();assert.equal(core.validateLibrary(d).savedQuestions,undefined);const before=structuredClone(d);add(d);add(d);
 assert.equal(d.savedQuestions.items.length,1);const item=d.savedQuestions.items[0];assert.equal(item.question.image,image);assert.equal(item.question.code,'print(2 + 2)');assert.equal(item.question.explanation,'Two pairs make four.');assert.equal(item.question.id,item.key);
 const {savedQuestions,...rest}=d;assert.deepEqual(rest,before);assert.deepEqual(core.validateLibrary(d),d);
 core.mutate(d,{type:'savedRemove',key:item.key},now);core.mutate(d,{type:'savedRemove',key:item.key},now);assert.equal(d.savedQuestions.items.length,0);assert.deepEqual(d.attempts,before.attempts);
});
test('each source resolves in the main model and stale/forged references cannot inject question content',()=>{
 const d=fixture(),quiz=d.courses[0].units[0].quizzes[0];core.mutate(d,{type:'start',quizId:quiz.id},now);
 core.mutate(d,{type:'savedAdd',source:{source:'quiz',questionId:quiz.questions[0].id},question:{prompt:'forged'}},now);assert.match(d.savedQuestions.items[0].question.prompt,/Question 1/);
 for(const source of [null,[],{source:'quiz',questionId:quiz.questions[1].id},{source:'result',attemptId:d.attempts[0].id,questionIndex:-1},{source:'result',attemptId:d.attempts[0].id,questionIndex:'0'},{source:'result',attemptId:'missing',questionIndex:0},{source:'daily'},{source:'mistake'},{source:'saved',key:'__proto__'},{source:'savedPractice'},{source:'file',path:'C:/private'}])assert.throws(()=>core.mutate(d,{type:'savedAdd',source},now),/Open this question/);
 core.mutate(d,{type:'reviewSettings',limit:5,quizIds:[quiz.id]},now);core.mutate(d,{type:'reviewBegin'},now);const token=d.dailyReview.active.token;
 assert.throws(()=>core.mutate(d,{type:'savedAdd',source:{source:'daily',token:'old',questionId:quiz.questions[0].id}},now));
 core.mutate(d,{type:'savedAdd',source:{source:'daily',token,questionId:quiz.questions[0].id}},now);assert.equal(d.dailyReview.active.answer,null);assert.equal(d.dailyReview.days.length,0);
 const key=notebook.page(d).items.find(e=>e.question.id===quiz.questions[1].id).key;core.mutate(d,{type:'savedAdd',source:{source:'notebook',key}},now);core.mutate(d,{type:'mistakeStart'},now);core.mutate(d,{type:'savedAdd',source:{source:'mistake',token:d.mistakeNotebook.session.token}},now);
 const first=d.savedQuestions.items[0];core.mutate(d,{type:'savedAdd',source:{source:'saved',key:first.key}},now);assert.deepEqual(core.validateLibrary(d),d);
});
test('writing the default question type explicitly does not create a duplicate star after an edit',()=>{
 const d=fixture();add(d);const course=d.courses[0],unit=course.units[0],quiz=unit.quizzes[0];
 core.mutate(d,{type:'saveQuiz',courseId:course.id,unitId:unit.id,quizId:quiz.id,title:quiz.title,questions:quiz.questions.map((q,i)=>i?q:{...q,type:'single-choice'})},now);
 core.mutate(d,{type:'start',quizId:quiz.id},now);core.mutate(d,{type:'savedAdd',source:{source:'quiz',questionId:quiz.questions[0].id}},now);
 assert.equal(d.savedQuestions.items.length,1);assert.deepEqual(core.validateLibrary(d),d);
});
test('saved copies survive moves, edits, deletion, and changed content receives its own identity',()=>{
 const d=fixture(),quiz=d.courses[0].units[0].quizzes[0],original=structuredClone(quiz.questions[0]);add(d);const key=d.savedQuestions.items[0].key;
 core.mutate(d,{type:'rename',quizId:quiz.id,title:'Renamed quiz'},now);core.mutate(d,{type:'moveQuiz',quizId:quiz.id,target:{courseTitle:'Other course',unitTitle:'Other unit'}},now);
 const place=core.findQuiz(d,quiz.id);core.mutate(d,{type:'saveQuiz',courseId:place.course.id,unitId:place.unit.id,quizId:quiz.id,title:'Edited quiz',questions:quiz.questions},now);
 core.mutate(d,{type:'start',quizId:quiz.id},now);core.mutate(d,{type:'savedAdd',source:{source:'quiz',questionId:quiz.questions[0].id}},now);assert.equal(d.savedQuestions.items.length,1);core.mutate(d,{type:'discard'},now);
 core.mutate(d,{type:'saveQuiz',courseId:place.course.id,unitId:place.unit.id,quizId:quiz.id,title:quiz.title,questions:quiz.questions.map((q,i)=>i? q:{...q,prompt:'Changed question',correctAnswer:1})},now);core.mutate(d,{type:'start',quizId:quiz.id},now);core.mutate(d,{type:'savedAdd',source:{source:'quiz',questionId:quiz.questions[0].id}},now);core.mutate(d,{type:'discard'},now);
 assert.equal(d.savedQuestions.items.length,2);core.mutate(d,{type:'delete',quizId:quiz.id},now);assert.equal(d.savedQuestions.items.find(e=>e.key===key).question.prompt,original.prompt);assert.deepEqual(core.validateLibrary(d),d);
 core.mutate(d,{type:'savedStart',limit:100},now);finishSaved(d);assert.equal(d.savedQuestions.lastResult.total,2);
});
test('random saved practice contains only saved questions once each and persists checked exact-set answers',()=>{
 let d=fixture();add(d,1);const before=structuredClone(d.attempts);core.mutate(d,{type:'savedStart',limit:20},now);let s=d.savedQuestions.session;
 assert.equal(s.keys.length,1);assert.throws(()=>core.mutate(d,{type:'savedCheck',token:s.token},now),/Choose an answer/);assert.throws(()=>core.mutate(d,{type:'savedNext',token:s.token},now),/Check/);
 core.mutate(d,{type:'savedAnswer',token:s.token,answer:[0]},now);core.mutate(d,{type:'savedCheck',token:s.token},now);d=core.validateLibrary(d);s=d.savedQuestions.session;assert.deepEqual(s.answer,[0]);assert.equal(s.checked,true);
 assert.throws(()=>core.mutate(d,{type:'savedAnswer',token:s.token,answer:[0,2]},now),/already checked/);assert.throws(()=>core.mutate(d,{type:'savedRemove',key:s.keys[0]},now),/Finish or end/);core.mutate(d,{type:'savedNext',token:s.token},now);assert.equal(d.savedQuestions.lastResult.correct,0);assert.throws(()=>core.mutate(d,{type:'savedNext',token:s.token},now),/changed/);
 add(d,0);add(d,2);core.mutate(d,{type:'savedStart',limit:2},now);assert.equal(new Set(d.savedQuestions.session.keys).size,2);assert.ok(d.savedQuestions.session.keys.every(key=>d.savedQuestions.items.some(item=>item.key===key)));core.mutate(d,{type:'savedAdd',source:{source:'savedPractice',token:d.savedQuestions.session.token}},now);finishSaved(d);assert.equal(d.savedQuestions.lastResult.correct,2);assert.deepEqual(d.attempts,before);assert.equal(d.dailyReview,undefined);assert.equal(d.mistakeNotebook,undefined);
});
test('discarding practice frees the stars without removing questions; invalid state and bounds fail closed',()=>{
 const d=fixture();add(d);for(const limit of [0,101,1.2,'20',Infinity])assert.throws(()=>core.mutate(d,{type:'savedStart',limit},now));
 core.mutate(d,{type:'savedStart',limit:1},now);const token=d.savedQuestions.session.token;core.mutate(d,{type:'savedDiscard',token},now);assert.equal(d.savedQuestions.session,null);assert.equal(d.savedQuestions.items.length,1);assert.equal(d.savedQuestions.lastResult,undefined);
 for(const index of [-1,0.5,Infinity,'0'])assert.throws(()=>saved.page(d,index));assert.equal(saved.page(d,999).page,0);
 for(const change of [s=>s.version=2,s=>s.items.push(s.items[0]),s=>s.items[0].key='bad',s=>s.items[0].question.correctAnswer=1,s=>s.items[0].savedAt=0,s=>s.items[0].title='',s=>s.items[0].question.id='',s=>s.session={},s=>s.lastResult={correct:2,total:1,completedAt:new Date(now).toISOString()},s=>s.items=Array(saved.MAX_ITEMS+1).fill(s.items[0])]){const copy=structuredClone(d);change(copy.savedQuestions);assert.throws(()=>core.validateLibrary(copy));}
 core.mutate(d,{type:'savedStart',limit:1},now);for(const change of [s=>s.session.keys.push(s.session.keys[0]),s=>s.session.correct=1,s=>s.session.position=-1,s=>s.session.checked=true,s=>s.session.answer=99,s=>s.session.token='']){const copy=structuredClone(d);change(copy.savedQuestions);assert.throws(()=>core.validateLibrary(copy));}
});
test('saved collection paging is bounded and uses newest saved copies first',()=>{
 const d=fixture(25);for(let i=0;i<25;i++)add(d,i);assert.equal(saved.page(d).items.length,20);assert.equal(saved.page(d).pages,2);assert.match(saved.page(d).items[0].question.prompt,/Question 25/);assert.equal(saved.page(d,1).items.length,5);assert.deepEqual(core.validateLibrary(d),d);
});
test('serialized concurrent stars, failed saves and removal, restart, and backup restore preserve previous state',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'quiznet-saved-'));try{
  const store=new Store(dir);await store.load(fixture);const source={source:'result',attemptId:store.data.attempts[0].id,questionIndex:0},action={type:'savedAdd',source};
  const write=store.write,initial=await fs.readFile(store.file);store.write=async()=>{throw new Error('Disk full');};await assert.rejects(store.change(d=>core.mutate(d,action,now)),/Disk full/);assert.deepEqual(await fs.readFile(store.file),initial);assert.equal(store.data.savedQuestions,undefined);store.write=write;
  await Promise.all([store.change(d=>core.mutate(d,action,now)),store.change(d=>core.mutate(d,action,now))]);assert.equal(store.data.savedQuestions.items.length,1);await store.change(d=>core.mutate(d,{type:'savedStart',limit:1},now));const backup=structuredClone(store.data),opened=new Store(dir);await opened.load();assert.deepEqual(opened.data,backup);
  await opened.change(d=>core.mutate(d,{type:'savedDiscard',token:d.savedQuestions.session.token},now));const prior=await fs.readFile(opened.file),key=opened.data.savedQuestions.items[0].key;opened.write=async()=>{throw new Error('Disk full');};await assert.rejects(opened.change(d=>core.mutate(d,{type:'savedRemove',key},now),{snapshotReason:'delete'}),/Disk full/);assert.deepEqual(await fs.readFile(opened.file),prior);assert.equal(opened.data.savedQuestions.items.length,1);opened.write=write;
  await opened.change(d=>core.mutate(d,{type:'savedRemove',key},now),{snapshotReason:'delete'});assert.equal(opened.data.savedQuestions.items.length,0);assert.ok((await opened.recovery.list()).some(item=>item.reason==='delete'));await opened.replace(backup);assert.deepEqual(opened.data,backup);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
