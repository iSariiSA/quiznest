const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const core=require('../src/core.cjs'),{Store}=require('../src/store.cjs'),{Recovery,validateDraft}=require('../src/recovery.cjs');
const {importReport,importQuestion}=require('../src/import-report.cjs'),brief=require('../src/ui/instructions.js');
const sample={prompt:'Choose 2.',options:['2','3'],correctAnswer:0,explanation:''};
const draft=()=>({title:'Unfinished',destination:{course:'new',unit:'new',courseTitle:'Draft course',unitTitle:''},questions:[{...core.blankQuestion(),code:'\n  x = 1\n',codeLanguage:'python'}]});
async function fixture(run){const directory=await fs.mkdtemp(path.join(os.tmpdir(),'quiznet-recovery-'));try{const store=new Store(directory);await store.load();await run(store,store.recovery);}finally{const resolved=path.resolve(directory);assert.ok(resolved.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(resolved).startsWith('quiznet-recovery-'));await fs.rm(resolved,{recursive:true,force:true});}}
test('incomplete editor drafts preserve whitespace and destinations across restart without changing the library',()=>fixture(async(store,recovery)=>{
  const before=await fs.readFile(store.file,'utf8'),original=draft();await recovery.saveDraft(original);
  const loaded=await new Recovery(store.directory).draft();assert.equal(loaded.editor.questions[0].prompt,'');assert.equal(loaded.editor.questions[0].code,original.questions[0].code);assert.deepEqual(loaded.editor.destination,original.destination);assert.equal(await fs.readFile(store.file,'utf8'),before);
  await recovery.saveDraft(null);assert.equal(await recovery.draft(),null);
}));
test('draft write failures and malformed drafts preserve the last acknowledged draft and can retry',()=>fixture(async(store,recovery)=>{
  await recovery.saveDraft(draft());const before=await fs.readFile(recovery.draftFile,'utf8'),rename=fs.rename;
  try{fs.rename=async(...args)=>{if(args[1]===recovery.draftFile)throw Object.assign(new Error('Synthetic full disk'),{code:'ENOSPC'});return rename(...args);};await assert.rejects(async()=>recovery.saveDraft({...draft(),title:'Not saved'}),/full disk/);}finally{fs.rename=rename;}
  assert.equal(await fs.readFile(recovery.draftFile,'utf8'),before);
  for(const invalid of [{...draft(),questions:new Array(2)},{...draft(),title:'x'.repeat(201)},{...draft(),questions:[{...core.blankQuestion(),image:'https://invalid/image.png'}]}])await assert.rejects(async()=>recovery.saveDraft(invalid));
  assert.equal(await fs.readFile(recovery.draftFile,'utf8'),before);await recovery.saveDraft({...draft(),title:'Retry'});assert.equal((await recovery.draft()).editor.title,'Retry');
  await fs.writeFile(recovery.draftFile,'damaged');await assert.rejects(recovery.draft(),/preserved/);assert.equal(await fs.readFile(recovery.draftFile,'utf8'),'damaged');
}));
test('draft limits accept 10,000 incomplete questions and reject oversized content without truncation',()=>{
  const raw={version:1,savedAt:new Date().toISOString(),editor:{...draft(),questions:Array.from({length:10000},()=>core.blankQuestion())}};
  assert.equal(validateDraft(raw).editor.questions.length,10000);assert.throws(()=>validateDraft({...raw,editor:{...raw.editor,questions:[...raw.editor.questions,core.blankQuestion()]}}),/count/);
  assert.throws(()=>validateDraft({...raw,editor:{...raw.editor,questions:Array.from({length:2500},()=>({...core.blankQuestion(),prompt:'x'.repeat(10000)}))}}),/20 MB/);
});
test('daily backups precede mutations once per day; history restores preserve answers and snapshots',()=>fixture(async(store,recovery)=>{
  await store.change(d=>core.importPacks(d,core.parseImport(JSON.stringify({title:'Recovery quiz',questions:[sample]}))));
  const quiz=store.data.courses[0].units[0].quizzes[0];await store.change(d=>core.mutate(d,{type:'start',quizId:quiz.id}));await store.change(d=>core.mutate(d,{type:'answer',questionId:quiz.questions[0].id,answer:0}));
  assert.equal((await recovery.list()).length,1);const id=await store.inspect(data=>recovery.snapshot(data));
  await store.change(d=>core.mutate(d,{type:'discard'}));await store.replace(await recovery.readSnapshot(id));
  assert.equal(store.data.activeSession.answers[quiz.questions[0].id],0);assert.equal((await recovery.list()).length,3);
  assert.equal((await new Store(store.directory).load()).activeSession.quizId,quiz.id);
}));
test('backup retention bounds count and bytes and never deletes unrelated files',()=>fixture(async(store,recovery)=>{
  const start=Date.now()-20*86400000;for(let i=0;i<10;i++)await recovery.snapshot(store.data,'manual',start+i*86400000);
  assert.equal((await recovery.list()).length,7);await fs.writeFile(path.join(recovery.historyDirectory,'keep-me.json'),'unrelated');
  const stat=fs.stat;try{fs.stat=async(file,...args)=>{const result=await stat(file,...args);if(path.dirname(file)===recovery.historyDirectory&&path.basename(file)!=='keep-me.json')result.size=40*1024*1024;return result;};await recovery.snapshot(store.data,'manual');assert.equal((await recovery.list()).length,3);}finally{fs.stat=stat;}
  assert.equal(await fs.readFile(path.join(recovery.historyDirectory,'keep-me.json'),'utf8'),'unrelated');
}));
test('read-only checks report corruption; damaged or forged history cannot replace the current library',()=>fixture(async(store,recovery)=>{
  await store.change(d=>core.mutate(d,{type:'createCourse',title:'Keep me'}));const before=await fs.readFile(store.file,'utf8'),backup=await fs.readFile(store.file+'.bak','utf8');
  const checked=await store.inspect(()=>recovery.check(store.file));assert.deepEqual(checked.map(c=>c.status),['valid','valid']);await recovery.list();assert.equal(await fs.readFile(store.file,'utf8'),before);assert.equal(await fs.readFile(store.file+'.bak','utf8'),backup);
  const id=await recovery.snapshot(store.data);await fs.writeFile(path.join(recovery.historyDirectory,id),'broken');await assert.rejects(recovery.readSnapshot(id));await assert.rejects(recovery.readSnapshot('../library.json'));assert.equal(await fs.readFile(store.file,'utf8'),before);
  await fs.writeFile(store.file+'.bak','broken');assert.equal((await recovery.check(store.file))[1].status,'damaged');assert.equal(await fs.readFile(store.file+'.bak','utf8'),'broken');
}));
test('failed recovery-point writes prevent destructive changes and leave the library available for retry',()=>fixture(async(store,recovery)=>{
  await store.change(d=>core.mutate(d,{type:'createCourse',title:'Keep me'}));const before=await fs.readFile(store.file,'utf8'),rename=fs.rename;
  try{fs.rename=async(...args)=>{if(path.dirname(args[1])===recovery.historyDirectory)throw Object.assign(new Error('Synthetic backup failure'),{code:'ENOSPC'});return rename(...args);};await assert.rejects(store.change(d=>core.mutate(d,{type:'delete',courseId:d.courses[0].id}),{snapshotReason:'delete'}),/backup failure/);}finally{fs.rename=rename;}
  assert.equal(await fs.readFile(store.file,'utf8'),before);assert.equal(store.data.courses.length,1);await store.change(d=>core.mutate(d,{type:'delete',courseId:d.courses[0].id}),{snapshotReason:'delete'});assert.equal(store.data.courses.length,0);
}));
test('import reports identify exact duplicates, type counts and brief mismatches without dropping questions',()=>{
  const data=core.emptyLibrary(),packs=core.parseImport(JSON.stringify({questions:[sample,sample,{...sample,type:'true-false',options:['True','False']}]}));core.importPacks(data,[{...packs[0],questions:[packs[0].questions[0]]}]);
  const preferences=brief.defaults();preferences.count={mode:'value',value:5};preferences.types={mode:'value',value:core.types.map(t=>({type:t.id,mode:t.id==='multiple-answer'?'value':t.id==='true-false'?'omit':'auto',value:2}))};
  const before=JSON.stringify({data,packs});const report=importReport(packs,data,preferences);assert.equal(report.total,3);assert.equal(report.repeated,1);assert.equal(report.alreadyInLibrary,2);assert.equal(report.withoutExplanation,3);assert.equal(report.counts['true-false'],1);assert.ok(report.warnings.some(w=>w.includes('requests 5')));assert.ok(report.warnings.some(w=>w.includes('excluded')));assert.equal(JSON.stringify({data,packs}),before);
  core.importPacks(data,packs);assert.equal(data.courses[0].units[0].quizzes[1].questions.length,3);assert.equal(importReport(packs,data).comparedWithBrief,false);
});
test('import review identifies conflicting keys and distinct contexts without changing the questions',()=>{
  const packs=core.parseImport(JSON.stringify({quizzes:[{title:'First set',questions:[{...sample,explanation:'First key.'},{...sample,correctAnswer:1,explanation:'Different key.'}]},{title:'Second set',questions:[{...sample,explanation:'First key.'},{...sample,code:'x = 1',codeLanguage:'python',explanation:'Different context.'}]}]}));
  const before=JSON.stringify(packs),report=importReport(packs,core.emptyLibrary());assert.equal(report.repeated,1);assert.equal(report.flagged,3);assert.deepEqual(report.reviewIndices,[[0,1],[0]]);assert.ok(report.questionIssues[0][0].some(i=>i.code==='conflicting-answer'));assert.ok(report.questionIssues[0][1].some(i=>i.code==='conflicting-answer'));assert.deepEqual(report.questionIssues[1][1],[]);assert.equal(JSON.stringify(packs),before);
});
test('local quality checks flag spacing, placeholders, all-correct keys and unlabelled images as review notes',()=>{
  const image=require('../examples/images-html.json').questions[0].image;
  const packs=core.parseImport(JSON.stringify({questions:[{prompt:'Choose a spelling.',options:['New York','New  York'],correctAnswer:0,explanation:'Review spacing.'},{prompt:'Your question',options:['Option A','Option B'],correctAnswer:0,explanation:'Unfinished.'},{type:'multiple-answer',prompt:'Select even numbers.',options:['2','4'],correctAnswers:[0,1],explanation:'Both are even.'},{prompt:'Identify the diagram.',options:['Cell','Rock'],correctAnswer:0,explanation:'Study the image.',image}]}));
  const report=importReport(packs,core.emptyLibrary());for(const [i,code] of ['similar-options','placeholder','all-correct','image-description'].entries())assert.ok(report.questionIssues[0][i].some(issue=>issue.code===code));assert.equal(report.flagged,4);assert.equal(packs[0].questions[2].correctAnswers.length,2);
});
test('question preview validates its selection and returns isolated content and notes',()=>{
  const packs=core.parseImport(JSON.stringify({questions:[sample,{...sample,correctAnswer:1}]})),report=importReport(packs,core.emptyLibrary()),item={type:'import',packs,report};
  const preview=importQuestion(item,0,1);assert.equal(preview.question.correctAnswer,1);preview.question.prompt='Changed in preview';preview.issues.length=0;assert.equal(packs[0].questions[1].prompt,sample.prompt);assert.ok(report.questionIssues[0][1].length);
  for(const [p,q] of [[-1,0],[1,0],[0,-1],[0,2],[0,0.5],[NaN,0],['0',0]])assert.throws(()=>importQuestion(item,p,q),/Choose a question/);assert.throws(()=>importQuestion(null,0,0),/Choose the import file/);
});
test('10,000-question review stays bounded even with thousands of distinct conflicting answer sets',()=>{
  const options=Array.from({length:14},(_,i)=>`Number ${i}`),packs=core.parseImport(JSON.stringify({questions:Array.from({length:10000},(_,i)=>({type:'multiple-answer',prompt:'Select the required values.',options,correctAnswers:options.flatMap((_,bit)=>(i+1)&(1<<bit)?[bit]:[]),explanation:'Compare the supplied answer key.'}))}));
  const report=importReport(packs,core.emptyLibrary());assert.equal(report.flagged,10000);assert.equal(report.questionIssues[0].length,10000);assert.ok(report.questionIssues[0].every(list=>list.some(i=>i.code==='conflicting-answer')));assert.equal(importQuestion({type:'import',packs,report},0,9999).question.prompt,'Select the required values.');assert.equal(packs[0].questions.length,10000);
});
