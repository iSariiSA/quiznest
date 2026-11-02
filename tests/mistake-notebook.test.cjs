const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const core=require('../src/core.cjs'),book=require('../src/mistake-notebook.cjs'),{Store}=require('../src/store.cjs');
function fixture(){const d=core.emptyLibrary();core.importPacks(d,core.parseImport(JSON.stringify({title:'Numbers',questions:[{prompt:'Two plus two?',options:['4','5'],correctAnswer:0,explanation:'Two pairs make four.'},{type:'multiple-answer',prompt:'Even values?',options:['2','3','4'],correctAnswers:[0,2]}]})));const quiz=d.courses[0].units[0].quizzes[0];core.mutate(d,{type:'start',quizId:quiz.id});for(const q of quiz.questions)core.mutate(d,{type:'answer',questionId:q.id,answer:q.correctAnswers?[0]:1});core.mutate(d,{type:'finish'});return d;}
test('historical and daily mistakes group by exact content, with latest wrong answer and durable notes',()=>{
 const d=fixture(),attempt=structuredClone(d.attempts[0]);attempt.id=core.id();d.attempts.push(attempt);assert.equal(book.page(d).total,2);assert.equal(book.page(d).items[0].count,2);
 const item=book.page(d).items[0];core.mutate(d,{type:'mistakeNote',key:item.key,note:'<script>My own explanation</script>'});book.record(d,item.question,item.answer,'Numbers',Date.now());assert.equal(book.collect(d).find(e=>e.key===item.key).count,3);
 assert.deepEqual(core.validateLibrary(d),d);const before=structuredClone(d.attempts);d.courses=[];d.attempts=[];assert.equal(book.page(d).total,1);assert.equal(book.page(d).items[0].note,'<script>My own explanation</script>');assert.equal(before.length,2);
});
test('focused session persists checked answers, rejects replay and preserves ordinary scores/schedule',()=>{
 let d=fixture();const attempts=structuredClone(d.attempts);core.mutate(d,{type:'mistakeStart'});let s=book.page(d).session;
 assert.throws(()=>core.mutate(d,{type:'mistakeNext',token:s.token}),/Check/);
 const q=s.item.question;core.mutate(d,{type:'mistakeAnswer',token:s.token,answer:q.correctAnswers||q.correctAnswer});core.mutate(d,{type:'mistakeCheck',token:s.token});d=core.validateLibrary(d);
 assert.equal(book.page(d).session.checked,true);assert.throws(()=>core.mutate(d,{type:'mistakeAnswer',token:s.token,answer:1}),/already checked/);core.mutate(d,{type:'mistakeNext',token:s.token});assert.throws(()=>core.mutate(d,{type:'mistakeNext',token:s.token}),/changed/);
 s=book.page(d).session;core.mutate(d,{type:'mistakeAnswer',token:s.token,answer:s.item.question.correctAnswers||s.item.question.correctAnswer});core.mutate(d,{type:'mistakeCheck',token:s.token});core.mutate(d,{type:'mistakeNext',token:s.token});assert.deepEqual(d.mistakeNotebook.lastResult,{correct:2,total:2});assert.equal(d.dailyReview,undefined);assert.deepEqual(d.attempts,attempts);
});
test('daily checks capture mistakes exactly once and backup validation rejects corrupt notebook data',()=>{
 const d=fixture(),quiz=d.courses[0].units[0].quizzes[0];d.attempts=[];core.mutate(d,{type:'reviewSettings',limit:20,quizIds:[quiz.id]});core.mutate(d,{type:'reviewBegin'});const token=d.dailyReview.active.token;
 core.mutate(d,{type:'reviewAnswer',token,answer:1});core.mutate(d,{type:'reviewCheck',token});core.mutate(d,{type:'reviewCheck',token});assert.equal(book.page(d).items[0].count,1);assert.deepEqual(core.validateLibrary(d),d);
 const key=book.page(d).items[0].key;assert.throws(()=>core.mutate(d,{type:'mistakeNote',key,note:'x'.repeat(5001)}),/5,000/);assert.throws(()=>core.mutate(d,{type:'mistakeNote',key:'missing',note:'x'}),/no longer/);
 for(const modify of [s=>s.entries[0].key='bad',s=>s.entries[0].answer=0,s=>s.entries[0].note=3,s=>s.session={keys:[]},s=>s.entries.push(s.entries[0])]){const copy=structuredClone(d);modify(copy.mistakeNotebook);assert.throws(()=>core.validateLibrary(copy));}
});
test('failed note saves preserve the previous file and retry; notes/session survive restart and restore',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'quiznet-notebook-'));try{const store=new Store(dir);await store.load(fixture);const key=book.page(store.data).items[0].key,write=store.write;store.write=async()=>{throw new Error('Disk full');};await assert.rejects(store.change(d=>core.mutate(d,{type:'mistakeNote',key,note:'Remember pairs'})),/Disk full/);assert.equal(store.data.mistakeNotebook,undefined);store.write=write;await store.change(d=>core.mutate(d,{type:'mistakeNote',key,note:'Remember pairs'}));await store.change(d=>core.mutate(d,{type:'mistakeStart'}));const opened=new Store(dir);await opened.load();assert.equal(book.collect(opened.data).find(e=>e.key===key).note,'Remember pairs');await opened.replace(structuredClone(opened.data));assert.deepEqual(opened.data,store.data);}finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('removing a saved copy preserves original attempts and is blocked during its focused session',()=>{
 const d=fixture(),before=structuredClone(d.attempts),key=book.page(d).items[0].key;
 core.mutate(d,{type:'mistakeNote',key,note:'A saved thought'});core.mutate(d,{type:'mistakeStart'});
 assert.throws(()=>core.mutate(d,{type:'mistakeRemove',key}),/Finish/);d.mistakeNotebook.session=null;
 core.mutate(d,{type:'mistakeRemove',key});assert.deepEqual(d.attempts,before);assert.equal(book.page(d).items.find(e=>e.key===key).note,'');assert.deepEqual(core.validateLibrary(d),d);
});
