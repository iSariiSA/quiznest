const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const core=require('../src/core.cjs'),review=require('../src/ui/daily-review.js');
const {Store}=require('../src/store.cjs');
const base=new Date(2026,9,29,12).getTime();
function fixture(){const data=core.emptyLibrary();core.importPacks(data,core.parseImport(JSON.stringify({title:'Daily test',questions:[{prompt:'Two plus two?',options:['4','5'],correctAnswer:0},{type:'multiple-answer',prompt:'Even numbers?',options:['2','3','4'],correctAnswers:[0,2]}]})));return data;}
function setup(data,limit=20){core.mutate(data,{type:'reviewSettings',limit,quizIds:[data.courses[0].units[0].quizzes[0].id]},base);}
function begin(data,now=base){core.mutate(data,{type:'reviewBegin'},now);return data.dailyReview.active.token;}
function answer(data,token,answer,now=base){core.mutate(data,{type:'reviewAnswer',token,answer},now);core.mutate(data,{type:'reviewCheck',token},now);}
function rate(data,token,rating,now=base){core.mutate(data,{type:'reviewRate',token,rating},now);}
test('old libraries remain unchanged; review settings and progress survive backup validation',()=>{
  const d=fixture();assert.equal(core.validateLibrary(d).dailyReview,undefined);setup(d);const token=begin(d);answer(d,token,0);
  assert.deepEqual(core.validateLibrary(d),d);rate(d,token,'good');assert.deepEqual(core.validateLibrary(d),d);
  assert.equal(d.attempts.length,0);assert.equal(d.activeSession,null);assert.equal(review.summary(d,base).done,1);
});
test('daily cap counts repeated answers, persists across setting changes, and resets at local midnight',()=>{
  const d=fixture();setup(d,1);const token=begin(d);answer(d,token,0);rate(d,token,'again');
  assert.throws(()=>begin(d,base+600000),/limit reached/);setup(d,1);assert.equal(review.summary(d,base).remaining,0);
  const tomorrow=new Date(2026,9,30,0).getTime();assert.equal(review.summary(d,tomorrow).remaining,1);begin(d,tomorrow);
  assert.equal(d.dailyReview.active.questionId,d.dailyReview.cards[0].questionId);assert.equal(review.summary(d,tomorrow).fresh,1);
});
test('ratings have increasing intervals; Again returns after ten minutes and due questions precede new ones',()=>{
  const d=fixture();setup(d);let t=begin(d);answer(d,t,0);rate(d,t,'again');assert.equal(d.dailyReview.cards[0].due,base+600000);
  const later=base+600000;t=begin(d,later);assert.equal(d.dailyReview.active.questionId,d.dailyReview.cards[0].questionId);answer(d,t,0,later);rate(d,t,'hard',later);
  assert.equal(d.dailyReview.cards[0].due,new Date(2026,9,30,0).getTime());assert.deepEqual(review.intervals(),{again:0,hard:1,good:3,easy:7});
  const intervals=review.intervals({interval:10});assert.ok(intervals.hard<intervals.good&&intervals.good<intervals.easy);assert.equal(review.intervals({interval:365}).easy,365);
});
test('unchecked, stale, double, incorrect, and invalid ratings cannot advance progress',()=>{
  const d=fixture();setup(d);const t=begin(d);assert.throws(()=>rate(d,t,'easy'),/Check your answer/);answer(d,t,1);
  assert.throws(()=>core.mutate(d,{type:'reviewAnswer',token:t,answer:0},base),/already checked/);
  assert.throws(()=>rate(d,t,'easy'),/Again/);assert.throws(()=>rate(d,t,'other'),/Choose Again/);assert.throws(()=>rate(d,'stale','again'),/changed/);
  rate(d,t,'again');assert.throws(()=>rate(d,t,'again'),/changed/);assert.equal(review.summary(d,base).done,1);
});
test('multiple-answer review requires the exact set and resumes a checked answer',()=>{
  let d=fixture();setup(d);let t=begin(d);answer(d,t,0);rate(d,t,'good');t=begin(d);answer(d,t,[0]);d=core.validateLibrary(d);
  assert.equal(d.dailyReview.active.checked,true);assert.throws(()=>rate(d,t,'good'),/Again/);rate(d,t,'again');
  t=begin(d,base+600000);answer(d,t,[0,2],base+600000);rate(d,t,'easy',base+600000);assert.equal(d.dailyReview.cards[1].interval,7);
});
test('unselecting preserves schedules; edits and deletion prune old question references',()=>{
  const d=fixture();setup(d);const t=begin(d);answer(d,t,0);rate(d,t,'good');const q=d.courses[0].units[0].quizzes[0];
  core.mutate(d,{type:'reviewSettings',limit:20,quizIds:[]},base);assert.equal(d.dailyReview.cards.length,1);assert.equal(review.summary(d,base).total,0);setup(d);
  begin(d);core.mutate(d,{type:'saveQuiz',courseId:d.courses[0].id,unitId:d.courses[0].units[0].id,quizId:q.id,title:'Renamed quiz',questions:q.questions},base);
  assert.equal(d.dailyReview.cards.length,1);assert.ok(d.dailyReview.active);assert.deepEqual(core.validateLibrary(d),d);
  core.mutate(d,{type:'saveQuiz',courseId:d.courses[0].id,unitId:d.courses[0].units[0].id,quizId:q.id,title:q.title,questions:q.questions.map(item=>({...item,prompt:item.prompt+' Changed.'}))},base);
  assert.equal(d.dailyReview.cards.length,0);assert.equal(d.dailyReview.active,null);assert.equal(review.summary(d,base).fresh,2);assert.deepEqual(core.validateLibrary(d),d);
  core.mutate(d,{type:'delete',quizId:q.id},base);assert.deepEqual(d.dailyReview.quizIds,[]);assert.deepEqual(core.validateLibrary(d),d);
});
test('invalid backups and settings fail validation',()=>{
  const d=fixture();setup(d);for(const limit of [0,1001,1.5,'20',NaN])assert.throws(()=>core.mutate(d,{type:'reviewSettings',limit,quizIds:[]},base));
  assert.throws(()=>core.mutate(d,{type:'reviewSettings',limit:20,quizIds:['missing']},base));
  for(const modify of [s=>s.limit=0,s=>s.quizIds.push('missing'),s=>s.cards.push({questionId:'missing'}),s=>s.days.push({date:'bad',count:1}),s=>s.active={},s=>s.days.push({date:'2026-10-29',count:-1})]){const copy=structuredClone(d);modify(copy.dailyReview);assert.throws(()=>core.validateLibrary(copy),/daily review/);}
});
test('serialized ratings commit once, survive restart and restore, and failed writes preserve retry',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'quiznet-review-'));try{
    const store=new Store(dir);await store.load(fixture);await store.change(d=>setup(d));await store.change(d=>begin(d));const t=store.data.dailyReview.active.token;
    await store.change(d=>answer(d,t,0));const before=JSON.stringify(store.data),write=store.write;store.write=async()=>{throw new Error('Disk full');};
    await assert.rejects(store.change(d=>rate(d,t,'good')),/Disk full/);assert.equal(JSON.stringify(store.data),before);store.write=write;
    const results=await Promise.allSettled([store.change(d=>rate(d,t,'good')),store.change(d=>rate(d,t,'good'))]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    const reopened=new Store(dir);await reopened.load();assert.equal(review.summary(reopened.data,base).done,1);const saved=structuredClone(reopened.data);await reopened.replace(saved);assert.deepEqual(reopened.data,saved);
  }finally{await fs.rm(dir,{recursive:true,force:true});}
});
