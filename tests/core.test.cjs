const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const core=require('../src/core.cjs');
const {Store}=require('../src/store.cjs');
const {sampleLibrary}=require('../src/sample.cjs');
const q={prompt:'A question?',options:['One','Two'],correctAnswer:0,explanation:'Because.'};
test('imports canonical JSON, aliases, letters, option text and multiple packs',()=>{
  const packs=core.parseImport(JSON.stringify({quizzes:[{course:'Biology',unit:'Cells',title:'Test',questions:[q,{question:'Pick two',choices:['First','Second'],answer:'B'},{prompt:'Which?',options:['A','B'],answer:'B'}]}]}));
  assert.deepEqual(packs[0].questions.map(q=>q.correctAnswer),[0,1,1]);
  const data=core.emptyLibrary();core.importPacks(data,packs);core.importPacks(data,packs);
  assert.equal(data.courses.length,1);assert.equal(data.courses[0].units.length,1);
  assert.deepEqual(data.courses[0].units[0].quizzes.map(q=>q.title),['Test','Test (2)']);
});
test('rejects malformed JSON, empty quizzes, invalid indices and duplicate options',()=>{
  assert.throws(()=>core.parseImport('{'),/valid JSON/);
  assert.throws(()=>core.parseImport('{"questions":[]}'),/questions array/);
  assert.throws(()=>core.question({...q,correctAnswer:2}),/zero-based/);
  assert.throws(()=>core.question({...q,options:['One','One']}),/duplicate/);
  assert.throws(()=>core.question({...q,options:['One',null]}),/option 2/);
});
test('CSV supports UTF-8 BOM, quotes, commas, newlines and separate quizzes',()=>{
  const csv='\uFEFFcourse,unit,title,question,option_a,option_b,answer,explanation\r\nBiology,Cells,Test,"What, exactly?",One,Two,B,"Line one\nLine ""two"""\r\nChemistry,Atoms,Other,Pick,One,Two,One,Because';
  const packs=core.parseImport(csv,'csv');assert.equal(packs.length,2);
  assert.equal(packs[0].questions[0].explanation,'Line one\nLine "two"');
  assert.equal(packs[0].questions[0].correctAnswer,1);
  assert.throws(()=>core.parseImport('question,answer\n"bad,A','csv'),/unclosed/);
  assert.throws(()=>core.parseImport('question,option_a,option_b,answer\nPick,One,Two,A,extra','csv'),/cells/);
});
test('creates a real hierarchy and prevents editing an active quiz',()=>{
  const data=core.emptyLibrary();core.mutate(data,{type:'createCourse',title:'Physics'});
  const courseId=data.courses[0].id;core.mutate(data,{type:'createUnit',courseId,title:'Waves'});
  const unitId=data.courses[0].units[0].id;core.mutate(data,{type:'saveQuiz',courseId,unitId,title:'Quiz',questions:[q]});
  const quizId=data.courses[0].units[0].quizzes[0].id;core.mutate(data,{type:'start',quizId});
  assert.throws(()=>core.mutate(data,{type:'saveQuiz',courseId,unitId,quizId,title:'Edit',questions:[q]}),/Finish or discard/);
});
test('quiz scores all questions, requires completeness and preserves historical questions',()=>{
  const data=sampleLibrary(),quiz=data.courses[0].units[0].quizzes[0];core.mutate(data,{type:'start',quizId:quiz.id,shuffle:true});
  assert.equal(new Set(data.activeSession.questionIds).size,quiz.questions.length);
  assert.throws(()=>core.mutate(data,{type:'finish'}),/every question/);
  for(const item of quiz.questions)core.mutate(data,{type:'answer',questionId:item.id,answer:item.correctAnswer});
  core.mutate(data,{type:'finish'});assert.equal(data.attempts[0].score,5);assert.equal(data.activeSession,null);
  const original=data.attempts[0].questions[0].prompt;quiz.questions.forEach(q=>q.prompt='Changed');
  assert.equal(data.attempts[0].questions[0].prompt,original);assert.throws(()=>core.mutate(data,{type:'finish'}),/No quiz/);
});
test('deleting a parent cleans up associated attempts and unfinished quizzes',()=>{
  const data=sampleLibrary(),course=data.courses[0],quiz=course.units[0].quizzes[0];core.mutate(data,{type:'start',quizId:quiz.id});
  core.mutate(data,{type:'delete',courseId:course.id});assert.equal(core.findQuiz(data,quiz.id),null);assert.equal(data.activeSession,null);
});
test('backup validation rejects duplicate IDs, broken sessions and invalid history',()=>{
  const data=sampleLibrary();assert.deepEqual(core.validateLibrary(data),data);
  const bad=structuredClone(data);bad.courses[1].id=bad.courses[0].id;assert.throws(()=>core.validateLibrary(bad),/duplicate IDs/);
  core.mutate(data,{type:'start',quizId:data.courses[0].units[0].quizzes[0].id});
  data.activeSession.position=99;assert.throws(()=>core.validateLibrary(data),/unfinished quiz/);
});
test('atomic transactions survive restart, serialize writes and roll back invalid changes',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'quiznet-test-'));
  try{
    const store=new Store(dir);await store.load();
    await Promise.all([store.change(d=>core.mutate(d,{type:'createCourse',title:'One'})),store.change(d=>core.mutate(d,{type:'createCourse',title:'Two'}))]);
    await assert.rejects(store.change(d=>core.mutate(d,{type:'createUnit',courseId:'missing',title:'Oops'})),/not found/);
    assert.equal(store.data.courses.length,2);
    const restarted=new Store(dir);await restarted.load();assert.equal(restarted.data.courses.length,2);
    const before=JSON.parse(await fs.readFile(store.file+'.bak','utf8'));assert.equal(before.courses.length,1);
  }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('corruption recovery preserves the damaged source and never silently resets a library',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'quiznet-test-'));
  try{
    const store=new Store(dir);await store.load(sampleLibrary);await store.change(d=>core.mutate(d,{type:'createCourse',title:'New'}));
    await fs.writeFile(store.file,'damaged');const recovery=new Store(dir);await recovery.load();assert.equal(recovery.data.courses.length,3);assert.match(recovery.notice,/recovered/);
    assert.equal((await fs.readdir(dir)).filter(f=>f.startsWith('library-damaged-')).length,1);
    await fs.writeFile(store.file,'broken');await fs.writeFile(store.file+'.bak','broken');
    await assert.rejects(new Store(dir).load(sampleLibrary),/preserved/);assert.equal(await fs.readFile(store.file,'utf8'),'broken');
  }finally{await fs.rm(dir,{recursive:true,force:true});}
});
