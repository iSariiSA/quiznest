// Prepared for the owner's final feature-batch validation. Not run per feature.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const core=require('../src/core.cjs'),history=require('../src/ui/history-model.js'),{Store}=require('../src/store.cjs');
const now=new Date(2026,10,3,12).getTime();
function fixture(){
 const d=core.emptyLibrary();
 for(const [course,unit,title,count] of [['Robotics','Python','Loops',2],['Robotics','Planning','Search',2],['University requirement','Interface','Layouts',3]])core.importPacks(d,core.parseImport(JSON.stringify({course,unit,title,questions:Array.from({length:count},(_,i)=>({prompt:title+' '+i,options:['Yes','No'],correctAnswer:0}))})));
 core.mutate(d,{type:'courseStudyFocus',courseId:d.courses[0].id,focus:'long-term'});core.mutate(d,{type:'courseStudyFocus',courseId:d.courses[1].id,focus:'for-now'});
 const a=d.courses[0].units[0].quizzes[0],b=d.courses[1].units[0].quizzes[0];
 const complete=(quiz,correct,day,seconds)=>{const t=new Date(2026,10,day,12).getTime();core.mutate(d,{type:'start',quizId:quiz.id},t);for(const [i,q] of quiz.questions.entries())core.mutate(d,{type:'answer',questionId:q.id,answer:i<correct?0:1},t);core.mutate(d,{type:'finish'},t+seconds*1000);};
 complete(a,1,1,10);complete(a,2,2,20);complete(b,0,3,30);delete d.attempts[2].timingMode;delete d.attempts[2].questionTimesMs;d.attempts[2].elapsedSeconds=9999;
 core.mutate(d,{type:'startMissed',attemptId:d.attempts[0].id},now);const q=d.attempts[0].questions[1];core.mutate(d,{type:'answer',questionId:q.id,answer:0},now);core.mutate(d,{type:'finish'},now+5000);d.attempts[3].timingMode='active-partial';
 return d;
}
test('dashboard aggregates answers, local days, current hierarchy and full-quiz scores read-only',()=>{
 const d=fixture(),before=structuredClone(d),r=history.analyze(d,{},now);
 assert.deepEqual(r.stats,{sessions:4,correct:4,answers:8,accuracy:50,activeMs:35000,fullTime:2,partialTime:1,untracked:1,missed:1,days:3});
 const q=r.quizzes.find(q=>q.title==='Loops');assert.equal(q.bestFull,100);assert.equal(history.percent(q.latestFull),100);assert.equal(q.latest.missedOnly,true);
 const c=r.courses.find(c=>c.title==='Robotics');assert.equal(c.practised,1);assert.equal(c.available,2);assert.equal(r.focus.find(f=>f.id==='long-term').stats.sessions,3);assert.deepEqual(d,before);
});
test('history course/unit/quiz/focus/date/mode filters agree and retain unlinked attempts',()=>{
 const d=fixture(),c=d.courses[0],u=c.units[0],q=u.quizzes[0];
 assert.equal(history.analyze(d,{courseId:c.id,unitId:u.id,quizId:q.id,focus:'long-term',mode:'full'},now).entries.length,2);
 assert.equal(history.analyze(d,{period:'custom',from:'2026-11-02',to:'2026-11-02'},now).stats.sessions,1);
 assert.equal(history.analyze(d,{focus:'for-now'},now).stats.untracked,1);
 assert.equal(history.analyze(d,{mode:'missed'},now).entries.length,1);
 assert.equal(history.analyze(d,{courseId:c.id,unitId:d.courses[1].units[0].id},now).entries.length,0);
 assert.equal(history.analyze(d,{period:'7'},new Date(2026,10,20).getTime()).stats.sessions,0);
 for(const f of [{unitId:u.id},{quizId:q.id},{focus:'wrong'},{mode:'bad'},{period:'custom',from:'2026-02-30'},{period:'custom',from:'2026-11-03',to:'2026-11-01'}])assert.throws(()=>history.analyze(d,f,now));
 d.attempts[0].quizId='deleted-legacy-quiz';assert.equal(history.analyze(d,{unlinked:true},now).entries.length,1);
 assert.equal(history.analyze(d,{unlinked:true},now).entries[0].focus,'unset');
});
test('course focus validates, survives backups, changes no attempt/session, and rolls back failed writes',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'quiznet-history-'));try{
  const store=new Store(dir);await store.load(fixture);
  await store.change(d=>{const q=d.courses[0].units[0].quizzes[0];core.mutate(d,{type:'start',quizId:q.id},now);core.mutate(d,{type:'answer',questionId:q.questions[0].id,answer:0},now);});
  const before=structuredClone(store.data),courseId=before.courses[0].id;
  const write=store.write,bytes=await fs.readFile(store.file);store.write=async()=>{throw new Error('Synthetic disk failure');};
  await assert.rejects(store.change(d=>core.mutate(d,{type:'courseStudyFocus',courseId,focus:'low'})),/disk failure/);assert.deepEqual(store.data,before);assert.deepEqual(await fs.readFile(store.file),bytes);store.write=write;
  await store.change(d=>core.mutate(d,{type:'courseStudyFocus',courseId,focus:'low'}));const reopened=new Store(dir);await reopened.load();assert.equal(reopened.data.courses[0].studyFocus,'low');assert.deepEqual(reopened.data.attempts,before.attempts);assert.deepEqual(reopened.data.activeSession,before.activeSession);
  core.mutate(reopened.data,{type:'courseStudyFocus',courseId,focus:'unset'});assert.equal(Object.hasOwn(reopened.data.courses[0],'studyFocus'),false);
  assert.throws(()=>core.mutate(reopened.data,{type:'courseStudyFocus',courseId,focus:'bad'}));const bad=structuredClone(before);bad.courses[0].studyFocus={};assert.throws(()=>core.validateLibrary(bad));
 }finally{if(!path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep))throw new Error('Unexpected profile');await fs.rm(dir,{recursive:true,force:true});}
});
