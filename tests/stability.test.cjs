const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const core=require('../src/core.cjs'),{Store}=require('../src/store.cjs');
const q={prompt:'Choose two.',options:['2','3'],correctAnswer:0,explanation:''};
async function fixture(run){
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'quiznet-storage-stress-'));
  try{const store=new Store(directory);await store.load();await store.change(d=>core.mutate(d,{type:'createCourse',title:'Original'}));await run(store);}
  finally{const resolved=path.resolve(directory);assert.ok(resolved.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(resolved).startsWith('quiznet-storage-stress-'));await fs.rm(resolved,{recursive:true,force:true});}
}
test('transient Windows replacement locks are retried without losing the queued change',()=>fixture(async store=>{
  const rename=fs.rename;let attempts=0;
  try{fs.rename=async(...args)=>{if(args[1]===store.file&&attempts++<2){const error=new Error('Synthetic file lock');error.code='EPERM';throw error;}return rename(...args);};await store.change(d=>core.mutate(d,{type:'createCourse',title:'After lock'}));assert.equal(attempts,3);}
  finally{fs.rename=rename;}
  assert.deepEqual((await new Store(store.directory).load()).courses.map(c=>c.title),['Original','After lock']);
}));
test('a partial backup copy preserves both committed files and the next transaction can retry',()=>fixture(async store=>{
  const before=await fs.readFile(store.file,'utf8'),backup=await fs.readFile(store.file+'.bak','utf8'),copyFile=fs.copyFile;
  try{fs.copyFile=async(_source,target)=>{await fs.writeFile(target,'partial backup');const error=new Error('Synthetic full disk');error.code='ENOSPC';throw error;};await assert.rejects(store.change(d=>core.mutate(d,{type:'createCourse',title:'Rejected'})),/full disk/);}
  finally{fs.copyFile=copyFile;}
  assert.equal(await fs.readFile(store.file,'utf8'),before);assert.equal(await fs.readFile(store.file+'.bak','utf8'),backup);assert.equal(store.data.courses.length,1);
  await store.change(d=>core.mutate(d,{type:'createCourse',title:'Retry'}));assert.equal((await new Store(store.directory).load()).courses.length,2);
}));
test('permanent file locks fail within a bounded time and leave a valid library for retry',()=>fixture(async store=>{
  const rename=fs.rename,before=await fs.readFile(store.file,'utf8');let attempts=0;
  try{fs.rename=async(...args)=>{if(args[1]===store.file){attempts++;const error=new Error('Synthetic permanent lock');error.code='EBUSY';throw error;}return rename(...args);};await assert.rejects(store.change(d=>core.mutate(d,{type:'createCourse',title:'Rejected'})),/permanent lock/);assert.equal(attempts,6);}
  finally{fs.rename=rename;}
  assert.equal(await fs.readFile(store.file,'utf8'),before);assert.equal(store.data.courses.length,1);assert.deepEqual(core.validateLibrary(JSON.parse(await fs.readFile(store.file+'.bak','utf8'))),store.data);
  await store.change(d=>core.mutate(d,{type:'createCourse',title:'Retry'}));
}));
test('100 queued valid and invalid operations preserve ordering and all acknowledged writes',()=>fixture(async store=>{
  const results=await Promise.allSettled(Array.from({length:100},(_,i)=>store.change(d=>core.mutate(d,i%2?{type:'createUnit',courseId:'missing',title:'Rejected'}:{type:'createCourse',title:`Accepted ${i}`}))));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,50);assert.equal(results.filter(r=>r.status==='rejected').length,50);
  const expected=['Original',...Array.from({length:50},(_,i)=>`Accepted ${i*2}`)];assert.deepEqual((await new Store(store.directory).load()).courses.map(c=>c.title),expected);
}));
test('10,000 questions and 100 choices work; out-of-range inputs and sparse edits are rejected',()=>{
  for(const count of [100,1000,10000]){
    const data=core.emptyLibrary();core.importPacks(data,core.parseImport(JSON.stringify({title:'Scale',questions:Array.from({length:count},()=>q)})));const quiz=data.courses[0].units[0].quizzes[0];
    core.mutate(data,{type:'start',quizId:quiz.id,shuffle:true});for(const q of quiz.questions)data.activeSession.answers[q.id]=0;
    assert.deepEqual(core.validateLibrary(data),data);core.mutate(data,{type:'finish'});assert.equal(data.attempts[0].score,count);assert.equal(data.attempts[0].questions.length,count);
  }
  assert.throws(()=>core.parseImport(JSON.stringify({questions:Array.from({length:10001},()=>null)})),/10,000/);
  const options=Array.from({length:100},(_,i)=>`Choice ${i}`);assert.equal(core.question({...q,options,correctAnswer:99}).options.length,100);assert.throws(()=>core.question({...q,options:[...options,'101']}),/options/);
  const data=core.emptyLibrary();assert.throws(()=>core.mutate(data,{type:'saveQuiz',title:'Sparse',target:{courseTitle:'Course',unitTitle:'Unit'},questions:new Array(2)}),/object/);assert.equal(data.courses.length,0);
});
test('large quiz exports stay within the real import byte limit and preserve all question content',()=>{
  const source=JSON.stringify({title:'Large export',questions:Array.from({length:10000},()=>({...q,prompt:'x'.repeat(1980)}))});assert.ok(Buffer.byteLength(source)<20*1024*1024);
  const data=core.emptyLibrary();core.importPacks(data,core.parseImport(source));const course=data.courses[0],unit=course.units[0],quiz=unit.quizzes[0];
  assert.ok(Buffer.byteLength(JSON.stringify({course:course.title,unit:unit.title,title:quiz.title,questions:quiz.questions.map(({id,...q})=>q)},null,2))>20*1024*1024);
  const exported=core.exportQuiz({course,unit,quiz});assert.ok(Buffer.byteLength(exported)<=20*1024*1024);assert.equal(core.parseImport(exported)[0].questions.length,10000);assert.equal(JSON.parse(exported).questions[9999].prompt,'x'.repeat(1980));
});
