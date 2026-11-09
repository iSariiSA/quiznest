const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const core=require('../src/core.cjs'),practice=require('../src/ui/practice.js'),prefs=require('../src/display-preferences.cjs'),history=require('../src/history-management.cjs'),{Store}=require('../src/store.cjs'),{Recovery}=require('../src/recovery.cjs');
async function profile(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'quiznet-settings-'));t.after(async()=>{if(!path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep)||!path.basename(dir).startsWith('quiznet-settings-'))throw new Error('Unexpected test profile');await fs.rm(dir,{recursive:true,force:true});});return dir;}
function seed(){const d=core.emptyLibrary();core.importPacks(d,core.parseImport(JSON.stringify({course:'=SUM(1)',unit:'Unit',title:'Quiz',questions:[{prompt:'Private synthetic question body',options:['Correct','Wrong','Third','Fourth'],correctAnswer:0},{type:'multiple-answer',prompt:'Choose both',options:['A','B','C'],correctAnswers:[0,2]}]})));return d;}
function completed(d,correct=false){const q=d.courses[0].units[0].quizzes[0];core.mutate(d,{type:'start',quizId:q.id});for(const item of q.questions)core.mutate(d,{type:'answer',questionId:item.id,answer:item.type==='multiple-answer'?(correct?[0,2]:[1]):correct?0:1});core.mutate(d,{type:'finish'});return d.attempts.at(-1);}
test('old display files acquire additive defaults and reject unsupported appearance, study, history and retention choices',()=>{
 const old={version:1,libraryView:'names',rememberView:true,interfaceScale:115},next=prefs.validate(old);assert.equal(next.libraryView,'names');assert.equal(next.theme,'dark');assert.equal(next.recoveryCount,7);
 for(const patch of [{theme:'remote'},{accent:'url(x)'},{textScale:1000},{density:'unlimited'},{recoveryCount:0},{recoveryMiB:0},{study:{...next.study,shuffleAnswers:'yes'}},{historyGroup:'bad'},{historyFilter:{period:'custom',from:'2026-02-30'}}])assert.throws(()=>prefs.validate({...next,...patch}));
 const saved=prefs.validate({...next,rememberHistory:true,historyFilter:{period:'30',courseId:'course'},theme:'system',accent:'blue',recoveryCount:14});assert.equal(saved.historyFilter.courseId,'course');assert.equal(saved.theme,'system');assert.equal(prefs.validate({...saved,rememberHistory:false}).historyFilter.courseId,'');
});
test('answer shuffling survives validation and restart while grading original answers and keeping live questions intact',async t=>{
 const dir=await profile(t),store=new Store(dir);await store.load(seed);const q=store.data.courses[0].units[0].quizzes[0],before=structuredClone(q),random=Math.random;Math.random=()=>0;
 try{await store.change(d=>core.mutate(d,{type:'start',quizId:q.id,practice:{...practice.defaults,shuffleAnswers:true}}));}finally{Math.random=random;}
 const orders=structuredClone(store.data.activeSession.optionOrders);assert.notDeepEqual(orders[q.questions[0].id],[0,1,2,3]);assert.deepEqual(core.validateLibrary(store.data).activeSession.optionOrders,orders);
 const bad=structuredClone(store.data);bad.activeSession.optionOrders[q.questions[0].id]=[0,0,1,2];assert.throws(()=>core.validateLibrary(bad),/answer order/);
 const again=new Store(dir);await again.load();assert.deepEqual(again.data.activeSession.optionOrders,orders);
 for(const item of q.questions)await again.change(d=>core.mutate(d,{type:'answer',questionId:item.id,answer:item.type==='multiple-answer'?[0,2]:0}));await again.change(d=>core.mutate(d,{type:'finish'}));assert.equal(again.data.attempts[0].score,2);assert.deepEqual(again.data.courses[0].units[0].quizzes[0],before);assert.deepEqual(core.validateLibrary(again.data),again.data);
});
test('history export is bounded, escaped and read-only; removal protects unfinished practice and preserves study objects',()=>{
 const d=seed(),a=completed(d),b=completed(d,true),before=structuredClone(d),csv=history.csv(d,[a.id,b.id]);assert.match(csv,/"'=SUM\(1\)"/);assert.ok(!csv.includes('Private synthetic question body'));assert.deepEqual(d,before);
 for(const ids of [[],[a.id,a.id],['missing'],Array(10001).fill(a.id)])assert.throws(()=>history.selection(d,ids));
 core.mutate(d,{type:'startMissed',attemptId:a.id,practice:{...practice.defaults}});const session=structuredClone(d.activeSession);assert.throws(()=>history.remove(d,[a.id]),/unfinished/);history.remove(d,[b.id]);assert.deepEqual(d.activeSession,session);assert.deepEqual(d.courses,before.courses);assert.equal(d.attempts.length,1);assert.deepEqual(core.validateLibrary(d),d);
});
test('failed history removal preserves both committed files; recovery point restores removed records',async t=>{
 const dir=await profile(t),store=new Store(dir);await store.load(()=>{const d=seed();completed(d);completed(d);return d;});const before=structuredClone(store.data),bytes=await fs.readFile(store.file),write=store.write;store.write=async()=>{throw new Error('Synthetic disk failure');};
 await assert.rejects(store.change(d=>history.remove(d,[d.attempts[0].id]),{snapshotReason:'delete'}),/disk failure/);assert.deepEqual(store.data,before);assert.deepEqual(await fs.readFile(store.file),bytes);store.write=write;
 await store.change(d=>history.remove(d,[d.attempts[0].id]),{snapshotReason:'delete'});assert.equal(store.data.attempts.length,1);const snapshots=await store.recovery.list();assert.ok(snapshots.some(s=>s.reason==='delete'));const point=await store.recovery.readSnapshot(snapshots[0].id);assert.equal(point.attempts.length,2);assert.deepEqual(point.courses,before.courses);
});
test('recovery limits prune only on the next snapshot and always retain the newest point',async t=>{
 const dir=await profile(t),r=new Recovery(dir),d=seed();for(let i=0;i<5;i++)await r.snapshot(d,'manual',1700000000000+i);assert.equal((await r.list()).length,5);r.setLimits(3,64);assert.equal((await r.list()).length,5);await r.snapshot(d,'manual',1700000000010);const items=await r.list();assert.equal(items.length,3);assert.ok(items[0].id.startsWith('1700000000010'));assert.throws(()=>r.setLimits(0,0));
});
