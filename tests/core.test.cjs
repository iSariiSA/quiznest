const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const core=require('../src/core.cjs');
const {Store}=require('../src/store.cjs');
const {sampleLibrary}=require('../src/sample.cjs');
const q={prompt:'A question?',options:['One','Two'],correctAnswer:0,explanation:'Because.'};
const media=require('../examples/images-html.json').questions[0];
const policy=require('../src/ui/content-policy.js');
test('rich questions survive JSON, CSV, backup, saved attempts, and storage restart',async()=>{
  const imported=core.parseImport(JSON.stringify({title:'Media',questions:[media,q]}));
  assert.equal(imported[0].questions[0].format,'html');
  assert.equal(imported[0].questions[0].image,media.image);
  assert.equal(imported[0].questions[1].format,undefined);
  const csv='question,option_a,option_b,answer,format,image,image_alt\n<p>Pick</p>,<b>One</b>,Two,A,html,"'+media.image+'",Cell diagram';
  const csvQuestion=core.parseImport(csv,'csv')[0].questions[0];
  assert.equal(csvQuestion.image,media.image);assert.equal(csvQuestion.imageAlt,'Cell diagram');
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'quiznet-rich-'));
  try {
    const store=new Store(directory);await store.load();
    await store.change(data=>core.importPacks(data,imported));
    const quiz=store.data.courses[0].units[0].quizzes[0];
    await store.change(data=>core.mutate(data,{type:'start',quizId:quiz.id}));
    for (const question of quiz.questions) await store.change(data=>core.mutate(data,{type:'answer',questionId:question.id,answer:0}));
    await store.change(data=>core.mutate(data,{type:'finish'}));
    assert.deepEqual(core.validateLibrary(store.data),store.data);
    const edited=structuredClone(quiz.questions);delete edited[0].image;delete edited[0].imageAlt;
    const course=store.data.courses[0],unit=course.units[0];
    await store.change(data=>core.mutate(data,{type:'saveQuiz',courseId:course.id,unitId:unit.id,quizId:quiz.id,title:quiz.title,questions:edited}));
    assert.equal(store.data.attempts[0].questions[0].image,media.image);
    const restarted=new Store(directory);await restarted.load();
    assert.equal(restarted.data.courses[0].units[0].quizzes[0].questions[0].image,undefined);
    assert.equal(restarted.data.attempts[0].questions[0].image,media.image);
    assert.equal(restarted.data.attempts[0].questions[0].format,'html');
  } finally { await fs.rm(directory,{recursive:true,force:true}); }
});
test('rejects unsupported formats, nonlocal images, MIME spoofing, and oversized media',()=>{
  for (const image of Object.values(require('./fixtures/image-types.json'))) assert.equal(core.question({...q,image}).image,image);
  assert.throws(()=>core.question({...q,format:'markdown'}),/text or html/);
  for(const image of ['https://example.com/picture.png','file:///C:/private.png','data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=']) assert.throws(()=>core.question({...q,image}),/embedded/);
  assert.throws(()=>core.question({...q,image:media.image.replace('image/png','image/jpeg')}),/file type/);
  assert.throws(()=>core.question({...q,image:media.image,imageAlt:'x'.repeat(501)}),/description/);
  const tooLarge=Buffer.alloc(policy.MAX_IMAGE_BYTES+1);Buffer.from(media.image.split(',')[1],'base64').copy(tooLarge);
  assert.throws(()=>policy.imageData('data:image/png;base64,'+tooLarge.toString('base64')),/2 MB/);
  assert.throws(()=>core.question({...q,format:'html',prompt:'x'.repeat(policy.MAX_HTML_LENGTH+1)}),/characters/);
  assert.equal(core.question(q).prompt,q.prompt);
});
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
