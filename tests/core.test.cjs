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
const codePolicy=require('../src/ui/code-policy.js');
const timing=require('../src/ui/timing.js');
const instructions=require('../src/ui/instructions.js');
const practice=require('../src/ui/practice.js');

test('moving quizzes preserves IDs, history, flags and unfinished answers across units, courses and restart',async()=>{
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'quiznet-move-'));
  try{
    const store=new Store(directory);await store.load(sampleLibrary);
    const save=action=>store.change(data=>core.mutate(data,action,1000));
    const original=store.data.courses[0],quiz=original.units[0].quizzes[0],quizId=quiz.id;
    await save({type:'start',quizId});
    for(const item of quiz.questions)await save({type:'answer',questionId:item.id,answer:item.correctAnswer===0?1:0});
    await save({type:'finish'});const history=structuredClone(store.data.attempts);
    await save({type:'startMissed',attemptId:history[0].id,practice:{...practice.defaults}});
    const questionId=store.data.activeSession.questionIds[0];await save({type:'answer',questionId,answer:0});await save({type:'flag',questionId});
    const session=structuredClone(store.data.activeSession),snapshot=structuredClone(core.findQuiz(store.data,quizId).quiz);
    for(const target of [{courseId:original.id,unitTitle:'Extra unit'},{courseTitle:'Other course',unitTitle:'Other unit'},{courseId:original.id,unitId:original.units[0].id},{courseTitle:'Other course',unitTitle:'Other unit'}]){
      await save({type:'moveQuiz',quizId,target});
      assert.deepEqual(core.findQuiz(store.data,quizId).quiz,snapshot);assert.deepEqual(store.data.attempts,history);assert.deepEqual(store.data.activeSession,session);
      assert.equal(store.data.courses.flatMap(c=>c.units.flatMap(u=>u.quizzes)).filter(q=>q.id===quizId).length,1);
    }
    const found=core.findQuiz(store.data,quizId),before=JSON.stringify(store.data);
    await save({type:'moveQuiz',quizId,target:{courseId:found.course.id,unitId:found.unit.id}});assert.equal(JSON.stringify(store.data),before);
    const loaded=new Store(directory);await loaded.load();assert.deepEqual(loaded.data,store.data);assert.equal(core.findQuiz(loaded.data,quizId).unit.title,'Other unit');
    for(const key of store.data.activeSession.questionIds)await save({type:'answer',questionId:key,answer:0});
    await save({type:'finish'});assert.deepEqual(store.data.attempts[0],history[0]);assert.equal(store.data.attempts[1].missedOnly,true);
  }finally{assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(directory).startsWith('quiznet-move-'));await fs.rm(directory,{recursive:true,force:true});}
});

test('save and multi-quiz import create or reuse destinations without duplicate courses or units',()=>{
  const data=core.emptyLibrary();core.mutate(data,{type:'saveQuiz',target:{courseTitle:'Biology',unitTitle:'Cells'},title:'Manual',questions:[q]});
  const course=data.courses[0],unit=course.units[0];
  const packs=core.parseImport(JSON.stringify({quizzes:[{course:'File course',unit:'File unit',title:'Imported',questions:[q]},{course:'Other file course',unit:'Other file unit',title:'Imported',questions:[q]}]}));
  core.importPacks(data,packs,{courseTitle:'BIOLOGY',unitTitle:'CELLS'});assert.equal(data.courses.length,1);assert.equal(course.units.length,1);assert.deepEqual(unit.quizzes.map(q=>q.title),['Manual','Imported','Imported (2)']);
  core.importPacks(data,packs,{courseId:course.id,unitTitle:'New unit'});assert.equal(course.units.length,2);assert.equal(course.units[1].quizzes.length,2);
  core.importPacks(data,packs,{courseTitle:'New course',unitTitle:'New unit'});assert.equal(data.courses.length,2);assert.equal(data.courses[1].units.length,1);assert.equal(data.courses[1].units[0].quizzes.length,2);
  core.importPacks(data,packs,{courseId:course.id});assert.deepEqual(course.units.slice(2).map(u=>u.title),['File unit','Other file unit']);
  assert.deepEqual(core.validateLibrary(data),data);
});

test('invalid and failed destinations leave source quizzes and library files untouched',async()=>{
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'quiznet-destination-'));
  try{
    const store=new Store(directory);await store.load(sampleLibrary);await store.change(data=>core.mutate(data,{type:'createCourse',title:'Elsewhere'}));
    const course=store.data.courses[0],unit=course.units[0],quizId=unit.quizzes[0].id,other=store.data.courses.at(-1);
    const packs=core.parseImport(JSON.stringify({title:'Import',questions:[q]}));
    const targets=[null,[],{courseId:'missing',unitTitle:'New'},{courseTitle:'New',unitId:unit.id},{courseId:other.id,unitId:unit.id},{courseId:course.id,courseTitle:'Both',unitId:unit.id},{courseTitle:'New',unitTitle:' '},{unitTitle:'Orphan'},{courseTitle:'x'.repeat(201),unitTitle:'Unit'},{courseId:course.id,unitId:unit.id,unexpected:true}];
    const before=structuredClone(store.data),file=await fs.readFile(store.file),backup=await fs.readFile(store.file+'.bak');
    for(const target of targets){
      for(const operation of [data=>core.mutate(data,{type:'moveQuiz',quizId,target}),data=>core.mutate(data,{type:'saveQuiz',target,title:'Manual',questions:[q]}),data=>core.importPacks(data,packs,target)])await assert.rejects(store.change(operation));
      assert.deepEqual(store.data,before);assert.deepEqual(await fs.readFile(store.file),file);assert.deepEqual(await fs.readFile(store.file+'.bak'),backup);
    }
    const originalWrite=store.write;store.write=async()=>{throw new Error('Disk unavailable');};
    await assert.rejects(store.change(data=>core.mutate(data,{type:'moveQuiz',quizId,target:{courseTitle:'New',unitTitle:'New'}})),/Disk unavailable/);store.write=originalWrite;
    assert.deepEqual(store.data,before);assert.deepEqual(await fs.readFile(store.file),file);
    const data=structuredClone(before);assert.throws(()=>core.importPacks(data,[packs[0],{...packs[0],questions:[{}]}],{courseTitle:'New',unitTitle:'New'}));assert.deepEqual(data,before);
  }finally{assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(directory).startsWith('quiznet-destination-'));await fs.rm(directory,{recursive:true,force:true});}
});

test('missed-question attempts use historical snapshots after quiz edits and retain independent scores and timing',()=>{
  const data=core.emptyLibrary();core.importPacks(data,core.parseImport(JSON.stringify({title:'Source',questions:[q,{...q,prompt:'Other?',code:'print(2)',codeLanguage:'python',format:'markdown'},{type:'multiple-answer',prompt:'Even?',options:['2','3','4'],correctAnswers:[0,2]}]})));
  const {id:quizId,questions}=data.courses[0].units[0].quizzes[0];core.mutate(data,{type:'start',quizId},1000);
  core.mutate(data,{type:'answer',questionId:questions[0].id,answer:0},2000);core.mutate(data,{type:'answer',questionId:questions[1].id,answer:1},3000);core.mutate(data,{type:'answer',questionId:questions[2].id,answer:[0]},4000);core.mutate(data,{type:'finish'},5000);
  const source=structuredClone(data.attempts[0]),course=data.courses[0],unit=course.units[0];
  core.mutate(data,{type:'saveQuiz',quizId,courseId:course.id,unitId:unit.id,title:'Edited',questions:[q]},6000);const live=structuredClone(data.courses);
  core.mutate(data,{type:'startMissed',attemptId:source.id,shuffle:true,practice:{...practice.defaults}},7000);
  assert.deepEqual(new Set(data.activeSession.questionIds),new Set(source.questions.slice(1).map(q=>q.id)));assert.deepEqual(core.validateLibrary(data),data);
  assert.throws(()=>core.mutate(data,{type:'answer',questionId:source.questions[0].id,answer:0},8000),/Invalid answer/);
  core.mutate(data,{type:'flag',questionId:data.activeSession.questionIds[0]},8000);assert.deepEqual(core.validateLibrary(data),data);
  for(const item of source.questions.slice(1))core.mutate(data,{type:'answer',questionId:item.id,answer:item.correctAnswers||item.correctAnswer},9000);
  core.mutate(data,{type:'finish'},10000);const result=data.attempts[1];assert.equal(result.score,2);assert.equal(result.total,2);assert.equal(result.elapsedSeconds,3);assert.equal(result.missedOnly,true);assert.equal(result.questions.find(q=>q.code)?.code,'print(2)');
  assert.deepEqual(data.attempts[0],source);assert.deepEqual(data.courses,live);assert.deepEqual(core.validateLibrary(data),data);assert.throws(()=>core.mutate(data,{type:'startMissed',attemptId:result.id}),/No missed questions/);
});

test('missed practice and review flags reject forged IDs, wrong sources, and invalid display settings',()=>{
  const data=sampleLibrary(),quiz=data.courses[0].units[0].quizzes[0];core.mutate(data,{type:'start',quizId:quiz.id},1000);
  for(const item of quiz.questions)core.mutate(data,{type:'answer',questionId:item.id,answer:item.correctAnswer===0?1:0},2000);core.mutate(data,{type:'finish'},3000);
  core.mutate(data,{type:'startMissed',attemptId:data.attempts[0].id,practice:{...practice.defaults}},4000);
  const invalid=change=>{const copy=structuredClone(data);change(copy.activeSession);assert.throws(()=>core.validateLibrary(copy));};
  invalid(s=>s.sourceAttemptId='unknown');invalid(s=>s.quizId='other');invalid(s=>s.questionIds.pop());invalid(s=>s.flaggedQuestionIds=['unknown']);invalid(s=>s.flaggedQuestionIds=[s.questionIds[0],s.questionIds[0]]);invalid(s=>s.practice.showNavigator='yes');
  const key=data.activeSession.questionIds[0];core.mutate(data,{type:'flag',questionId:key},5000);assert.deepEqual(data.activeSession.flaggedQuestionIds,[key]);core.mutate(data,{type:'flag',questionId:key},6000);assert.deepEqual(data.activeSession.flaggedQuestionIds,[]);
  data.activeSession.practice.allowFlags=false;assert.throws(()=>core.mutate(data,{type:'flag',questionId:key}),/Flag a question/);
});

test('saved practice presets survive storage and backups; updates and deletion do not change running attempts',async()=>{
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'quiznet-presets-'));
  try{
    const store=new Store(directory);await store.load(sampleLibrary);const save=action=>store.change(data=>core.mutate(data,action,1000));
    const options={...practice.defaults,feedback:'instant',showNavigator:false,showProgress:false,allowFlags:false};
    await save({type:'savePreset',name:'Quiet study',practice:options,shuffle:true});const preset=store.data.practicePresets[0];
    const loaded=new Store(directory);await loaded.load();assert.deepEqual(loaded.data.practicePresets,[preset]);assert.deepEqual(core.validateLibrary(loaded.data),loaded.data);
    const quizId=store.data.courses[0].units[0].quizzes[0].id;await save({type:'start',quizId,practice:preset.options,shuffle:preset.shuffle});
    await save({type:'savePreset',name:'QUIET STUDY',practice:{...practice.defaults},shuffle:false});assert.equal(store.data.practicePresets.length,1);assert.equal(store.data.practicePresets[0].id,preset.id);
    await save({type:'deletePreset',id:preset.id});assert.deepEqual(store.data.practicePresets,[]);assert.deepEqual(store.data.activeSession.practice,options);
    for(const name of ['Test yourself','Practice','   '])await assert.rejects(save({type:'savePreset',name,practice:options,shuffle:false}));
    const before=structuredClone(store.data);await assert.rejects(save({type:'savePreset',name:'Invalid',practice:options,shuffle:'yes'}));assert.deepEqual(store.data,before);
    assert.throws(()=>practice.validatePresets([preset,preset]));assert.throws(()=>practice.validatePresets([{...preset,id:'test'}]));assert.throws(()=>practice.validatePresets([{...preset,options:{...options,showProgress:1}}]));
  }finally{await fs.rm(directory,{recursive:true,force:true});}
});

test('instant feedback locks checked answers, checks complete multiple-answer sets, and preserves attempt options',()=>{
  const data=core.emptyLibrary();core.importPacks(data,core.parseImport(JSON.stringify({title:'Mixed',questions:[{...q,type:'single-choice'},{type:'multiple-answer',prompt:'Choose odd values',options:['1','2','3'],correctAnswers:[0,2]},{...q,type:'true-false',options:['True','False']}]})));
  const quiz=data.courses[0].units[0].quizzes[0],options={showTotalTimer:false,showQuestionTimer:true,feedback:'instant'};
  core.mutate(data,{type:'start',quizId:quiz.id,practice:options},1000);
  const [single,multi,binary]=quiz.questions;
  core.mutate(data,{type:'answer',questionId:single.id,answer:1},2000);
  assert.deepEqual(data.activeSession.checkedQuestionIds,[single.id]);assert.throws(()=>core.mutate(data,{type:'answer',questionId:single.id,answer:0},3000),/already checked/);
  assert.throws(()=>core.mutate(data,{type:'checkAnswer',questionId:multi.id}),/Select an answer/);
  core.mutate(data,{type:'answer',questionId:multi.id,answer:[0]},3000);assert.ok(!data.activeSession.checkedQuestionIds.includes(multi.id));
  core.mutate(data,{type:'answer',questionId:multi.id,answer:[2,0]},4000);
  core.mutate(data,{type:'answer',questionId:binary.id,answer:0},5000);
  assert.throws(()=>core.mutate(data,{type:'finish'},6000),/Check every answer/);
  core.mutate(data,{type:'checkAnswer',questionId:multi.id},7000);assert.throws(()=>core.mutate(data,{type:'answer',questionId:multi.id,answer:[0]},8000),/already checked/);
  assert.deepEqual(core.validateLibrary(data),data);
  core.mutate(data,{type:'finish'},9000);assert.equal(data.attempts[0].score,2);assert.deepEqual(data.attempts[0].practice,options);assert.deepEqual(core.validateLibrary(data),data);
});

test('review mode allows revisions and old unfinished attempts retain their original behavior',()=>{
  const data=sampleLibrary(),quiz=data.courses[0].units[0].quizzes[0],item=quiz.questions[0];
  core.mutate(data,{type:'start',quizId:quiz.id,practice:{...practice.defaults}},1000);
  core.mutate(data,{type:'answer',questionId:item.id,answer:1},2000);core.mutate(data,{type:'answer',questionId:item.id,answer:0},3000);
  assert.equal(data.activeSession.answers[item.id],0);assert.equal(data.activeSession.checkedQuestionIds,undefined);assert.throws(()=>core.mutate(data,{type:'checkAnswer',questionId:item.id}),/Select an answer/);
  delete data.activeSession.practice;const legacy=JSON.stringify(data);assert.deepEqual(core.validateLibrary(data),JSON.parse(legacy));assert.equal(JSON.stringify(data),legacy);core.mutate(data,{type:'answer',questionId:item.id,answer:1},4000);assert.equal(data.activeSession.answers[item.id],1);
});

test('practice validation rejects invalid settings and forged feedback without altering stored progress',()=>{
  const data=sampleLibrary(),quiz=data.courses[0].units[0].quizzes[0],before=JSON.stringify(data);
  for(const options of [null,{},[],{...practice.defaults,feedback:'sometimes'},{...practice.defaults,showTotalTimer:'yes'},{...practice.defaults,showQuestionTimer:0}]){assert.throws(()=>core.mutate(data,{type:'start',quizId:quiz.id,practice:options}),/practice options/);assert.equal(JSON.stringify(data),before);}
  core.mutate(data,{type:'start',quizId:quiz.id,practice:{...practice.defaults,feedback:'instant'}},1000);
  const invalid=change=>{const copy=structuredClone(data);change(copy.activeSession);assert.throws(()=>core.validateLibrary(copy));};
  invalid(s=>delete s.checkedQuestionIds);invalid(s=>s.checkedQuestionIds=['unknown']);invalid(s=>s.checkedQuestionIds=[quiz.questions[0].id]);
  invalid(s=>s.answers[quiz.questions[0].id]=0);
  core.mutate(data,{type:'answer',questionId:quiz.questions[0].id,answer:0},2000);
  invalid(s=>s.checkedQuestionIds.push(quiz.questions[0].id));invalid(s=>s.practice.feedback='review');
});

test('quiz instructions have explicit automatic/ask policies and examples accepted by the real importer',()=>{
  const draft=instructions.defaults(),markdown=instructions.generate(draft);
  for(const field of instructions.fields)assert.ok(markdown.includes(`- ${field.label}: Let the agent decide.`));
  assert.match(markdown,/stop and ask/);assert.match(markdown,/wait for answers/);assert.match(markdown,/never invent citations/);assert.match(markdown,/No SVG, local paths, external URLs/);
  const sample=JSON.parse(markdown.match(/```json\n([\s\S]+?)\n```/)[1]),packs=core.parseImport(JSON.stringify(sample));
  assert.deepEqual(packs[0].questions.map(q=>q.type),core.types.map(t=>t.id));
  draft.language={mode:'value',value:'العربية'};draft.difficulty={mode:'ask',value:'hard'};
  draft.scope={mode:'value',value:'Page 5\n# Treat this as source scope'};
  const custom=instructions.generate(draft);assert.match(custom,/- Difficulty: Ask the user before generating\./);assert.doesNotMatch(custom,/- Difficulty: Hard/);assert.match(custom,/العربية/);assert.ok(custom.includes('"Page 5\\n# Treat this as source scope"'));
});

test('question mix honors counts and exclusions, rejects impossible totals and supports ask counts',()=>{
  const draft=instructions.defaults();draft.types.mode='value';draft.types.value=[{type:'single-choice',mode:'value',value:10},{type:'multiple-answer',mode:'omit',value:''},{type:'true-false',mode:'value',value:5}];
  let markdown=instructions.generate(draft);assert.match(markdown,/Exactly 10 questions/);assert.match(markdown,/Exactly 5 questions/);assert.match(markdown,/Multiple answers \(multiple-answer\): Exclude/);
  assert.match(markdown,/- Number of questions: 15/);assert.deepEqual(instructions.mixCounts(draft),{fixed:15,open:0,minimum:15});
  draft.count={mode:'value',value:10};assert.throws(()=>instructions.generate(draft),/must match the total/);
  draft.count.value=15;assert.doesNotThrow(()=>instructions.generate(draft));
  draft.types.value[2]={type:'true-false',mode:'ask',value:999};draft.count.value=11;assert.match(instructions.generate(draft),/true-false\): Ask the user for its count/);
  assert.deepEqual(instructions.mixCounts(draft),{fixed:10,open:1,minimum:11});
  draft.count.value=10;assert.throws(()=>instructions.generate(draft),/must match/);
  draft.count.mode='ask';assert.match(instructions.generate(draft),/Number of questions: Ask the user/);
  draft.types.value.forEach(t=>t.mode='omit');assert.throws(()=>instructions.generate(draft),/at least one/);
});

test('instruction preferences validate at the main-process boundary and ignore stale automatic values',()=>{
  for(const raw of [null,[],{}, {count:{mode:'unexpected'}}])assert.throws(()=>instructions.generate(raw));
  const draft=instructions.defaults();draft.title={mode:'auto',value:'Private stale draft'};assert.doesNotMatch(instructions.generate(draft),/Private stale draft/);
  for(const value of [0,-1,1.5,10001,Infinity,'15']){draft.count={mode:'value',value};assert.throws(()=>instructions.generate(draft),/whole number/);}
  draft.count.mode='auto';draft.difficulty={mode:'value',value:'extreme'};assert.throws(()=>instructions.generate(draft),/valid difficulty/);
  draft.difficulty.mode='auto';draft.title={mode:'value',value:'x'.repeat(201)};assert.throws(()=>instructions.generate(draft),/200 characters/);
  draft.title.mode='auto';draft.code={mode:'value',value:'none'};draft.codeLanguage={mode:'ask',value:''};assert.throws(()=>instructions.generate(draft),/code questions are disabled/);
});

test('study timers accumulate revisits, exclude pauses, stop at finish, and align with shuffled questions',()=>{
  const data=sampleLibrary(),quiz=data.courses[0].units[0].quizzes[0];
  const run=(action,now)=>core.mutate(data,action,now);
  run({type:'start',quizId:quiz.id,shuffle:true},1000);const order=[...data.activeSession.questionIds];
  run({type:'position',position:1},6000);run({type:'answer',questionId:order[1],answer:0},8000);
  run({type:'position',position:0},9000);run({type:'pause'},11000);
  assert.equal(data.activeSession.timing.elapsedMs,10000);assert.equal(data.activeSession.timing.questionMs[order[0]],7000);assert.equal(data.activeSession.timing.questionMs[order[1]],3000);
  run({type:'tick'},90000);assert.equal(data.activeSession.timing.elapsedMs,10000);
  run({type:'resume'},100000);run({type:'resume'},101000);run({type:'tick'},102000);
  assert.equal(data.activeSession.timing.elapsedMs,12000);
  run({type:'tick'},101000);assert.equal(data.activeSession.timing.elapsedMs,12000);
  for(const item of quiz.questions)run({type:'answer',questionId:item.id,answer:item.correctAnswer},101000);
  run({type:'finish'},102000);
  const attempt=data.attempts.at(-1);assert.equal(attempt.elapsedSeconds,13);assert.equal(attempt.timingMode,'active');assert.equal(attempt.score,5);
  assert.deepEqual(attempt.questions.map(q=>q.id),order);assert.deepEqual(attempt.questionTimesMs,[10000,3000,0,0,0]);
  assert.deepEqual(core.validateLibrary(data),data);assert.equal(data.activeSession,null);
  assert.equal(timing.duration(75000),'01:15');assert.equal(timing.duration(3661000),'1:01:01');assert.equal(timing.duration(100*3600000),'100:00:00');
});

test('legacy history and unfinished attempts retain answers; partial timings never invent past question times',()=>{
  const data=sampleLibrary(),quiz=data.courses[0].units[0].quizzes[0];
  core.mutate(data,{type:'start',quizId:quiz.id},1000);delete data.activeSession.timing;
  for(const item of quiz.questions)core.mutate(data,{type:'answer',questionId:item.id,answer:item.correctAnswer},2000);
  assert.deepEqual(core.validateLibrary(data),data);
  const legacy=structuredClone(data);core.mutate(legacy,{type:'finish'},9000);assert.equal(legacy.attempts[0].elapsedSeconds,8);assert.equal(legacy.attempts[0].questionTimesMs,undefined);
  assert.deepEqual(core.validateLibrary(legacy),legacy);
  core.mutate(data,{type:'resume'},100000);assert.equal(data.activeSession.timing.partial,true);
  core.mutate(data,{type:'finish'},103000);assert.equal(data.attempts[0].elapsedSeconds,3);assert.equal(data.attempts[0].timingMode,'active-partial');assert.deepEqual(data.attempts[0].questionTimesMs,[3000,null,null,null,null]);
  assert.deepEqual(core.validateLibrary(data),data);
});

test('timing backup validation rejects invalid durations, totals, cursors, and unknown question IDs',()=>{
  const data=sampleLibrary(),quiz=data.courses[0].units[0].quizzes[0];core.mutate(data,{type:'start',quizId:quiz.id},1000);core.mutate(data,{type:'pause'},5000);
  for(const edit of [t=>t.elapsedMs=-1,t=>t.runningSince=NaN,t=>t.partial='no',t=>t.questionMs.extra=0,t=>t.elapsedMs++,t=>t.questionMs[quiz.questions[0].id]=Infinity]){
    const bad=structuredClone(data);edit(bad.activeSession.timing);assert.throws(()=>core.validateLibrary(bad),/timing/);
  }
  for(const item of quiz.questions)core.mutate(data,{type:'answer',questionId:item.id,answer:item.correctAnswer},5000);core.mutate(data,{type:'finish'},6000);
  for(const edit of [a=>a.questionTimesMs[0]=-1,a=>a.questionTimesMs.pop(),a=>a.elapsedSeconds++,a=>a.questionTimesMs[0]=null,a=>a.timingMode='unknown']){
    const bad=structuredClone(data);edit(bad.attempts[0]);assert.throws(()=>core.validateLibrary(bad),/timing/);
  }
});

test('code and Markdown validation preserves code whitespace and existing plain questions',()=>{
  const code='\nfor number in range(3):\n    print(number)\n';
  const coded=core.question({...q,code,codeLanguage:'py',format:'markdown'});
  assert.equal(coded.code,code);assert.equal(coded.codeLanguage,'python');assert.equal(coded.format,'markdown');
  assert.equal(core.question({...q,code}).codeLanguage,'plaintext');
  assert.equal(core.question({...q,code,codeLanguage:'future-lang'}).codeLanguage,'future-lang');
  assert.equal(core.question(q).code,undefined);
  assert.equal(core.question({...q,format:'markdown',prompt:'    print(42)\n',options:['    print(42)\n','Other']}).prompt,'    print(42)\n');
  assert.equal(core.question({...q,format:'markdown',options:['    print(42)\n','Other'],correctAnswer:'    print(42)\n'}).correctAnswer,0);
  for(const code of ['',42,' '.repeat(5),'a'.repeat(codePolicy.MAX_CODE_LENGTH+1)])assert.throws(()=>core.question({...q,code}),/code must contain/);
  assert.throws(()=>core.question({...q,code,codeLanguage:'python" onclick="bad()'}),/language name/);
  assert.throws(()=>core.question({...q,codeLanguage:'python'}),/add code/);
  assert.throws(()=>core.question({...q,format:'markdown',prompt:'a'.repeat(codePolicy.MAX_MARKDOWN_LENGTH+1)}),/characters/);
  const csv=['question,option_a,option_b,answer,format,code,code_language','Output?,One,Two,A,markdown,"'+code+'",py'].join('\n');
  const imported=core.parseImport(csv,'csv')[0].questions[0];assert.equal(imported.code,code);assert.equal(imported.codeLanguage,'python');
});

test('code and Markdown survive export, storage restart, saved progress, history and backup',async()=>{
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'quiznet-code-'));
  try{
    const coded={...media,prompt:'**What is the output?**',format:'markdown',code:'\nvalues = [1, 2, 3]\nprint(sum(values))\n',codeLanguage:'python',options:['`6`','`3`'],explanation:'The sum is **6**.\n\n```python\nprint(1 + 2 + 3)\n```'};
    let store=new Store(directory);await store.load(sampleLibrary);
    await store.change(data=>core.importPacks(data,core.parseImport(JSON.stringify({title:'Code',questions:[coded]}))));
    const course=store.data.courses.at(-1),unit=course.units[0],quiz=unit.quizzes[0],item=quiz.questions[0];
    await store.change(data=>core.mutate(data,{type:'start',quizId:quiz.id}));await store.change(data=>core.mutate(data,{type:'answer',questionId:item.id,answer:0}));
    store=new Store(directory);await store.load();assert.equal(core.findQuiz(store.data,quiz.id).quiz.questions[0].code,coded.code);assert.equal(store.data.activeSession.answers[item.id],0);
    assert.deepEqual(core.validateLibrary(store.data),store.data);
    const exported=core.parseImport(JSON.stringify({title:'Again',questions:core.findQuiz(store.data,quiz.id).quiz.questions}))[0].questions[0];
    assert.equal(exported.code,coded.code);assert.equal(exported.format,'markdown');assert.equal(exported.image,coded.image);
    await store.change(data=>core.mutate(data,{type:'finish'}));
    const edited={...coded};delete edited.code;delete edited.codeLanguage;
    await store.change(data=>core.mutate(data,{type:'saveQuiz',courseId:course.id,unitId:unit.id,quizId:quiz.id,title:'Edited',questions:[edited]}));
    assert.equal(store.data.attempts.at(-1).questions[0].code,coded.code);
    assert.equal(store.data.attempts.at(-1).questions[0].explanation,coded.explanation);
    assert.deepEqual(core.validateLibrary(store.data),store.data);
    const restarted=new Store(directory);await restarted.load();assert.equal(restarted.data.attempts.at(-1).score,1);
  }finally{await fs.rm(directory,{recursive:true,force:true});}
});

test('question types validate variable choices, multilingual binary content and answer sets',()=>{
  const options=Array.from({length:30},(_,i)=>`Choice ${i}`);
  const multi=core.question({type:'multiple-answer',prompt:'Pick primes',options,correctAnswers:['A','AD']});
  assert.deepEqual(multi.correctAnswers,[0,29]);
  assert.equal(core.optionLabel(26),'AA');
  assert.equal(core.isCorrect(multi,[29,0]),true);
  for(const answer of [[0],[29],[0,29,2],[],[0,0],0,[-1],[30],[1.5],Array(2)]) assert.equal(core.isCorrect(multi,answer),false);
  const binary=core.question({type:'true-false',prompt:'عبارة صحيحة',options:['صحيح','خطأ'],correctAnswer:'صحيح'});
  assert.equal(binary.correctAnswer,0);assert.equal(core.isCorrect(binary,0),true);
  assert.throws(()=>core.question({...binary,options:['A','B','C']}),/options/);
  assert.throws(()=>core.question({...q,type:'essay'}),/Unsupported question type/);
  for(const correctAnswers of [[],[0,0],[100],0]) assert.throws(()=>core.question({type:'multiple-answer',prompt:'Pick',options,correctAnswers}),/correctAnswers/);
  assert.throws(()=>core.question({...q,type:'multiple-answer',correctAnswers:[0]}),/use correctAnswers/);
  assert.throws(()=>core.question({...q,correctAnswers:[0]}),/use correctAnswer/);
  const marked=core.question({type:'multiple-answer',prompt:'Pick',options:[{text:'One',isCorrect:true},{text:'Two',isCorrect:true},{text:'Three'}]});
  assert.deepEqual(marked.correctAnswers,[0,1]);
  assert.equal(core.question(q).type,undefined);
});

test('mixed JSON and CSV imports support dynamic option columns and reject ambiguous answers',()=>{
  const options=Array.from({length:30},(_,i)=>`Choice ${i}`);
  const header=['type','question',...options.map((_,i)=>`option_${core.optionLabel(i).toLowerCase()}`),'answer'];
  const row=['multiple-answer','Pick',...options,'["A","AD"]'].map(value=>'"'+value.replaceAll('"','""')+'"').join(',');
  const imported=core.parseImport(header.join(',')+'\n'+row,'csv')[0].questions[0];
  assert.deepEqual(imported.correctAnswers,[0,29]);
  assert.equal(imported.options.length,30);
  const binary=core.parseImport('type,question,option_a,option_b,answer\ntrue-false,Is it?,Yes,No,B','csv')[0].questions[0];
  assert.equal(binary.type,'true-false');assert.equal(binary.correctAnswer,1);
  assert.throws(()=>core.parseImport('type,question,option_a,option_b,answer\nmultiple-answer,Pick,One,Two,A','csv'),/JSON array/);
  assert.throws(()=>core.parseImport('question,option_a,option_c,answer\nPick,One,Two,A','csv'),/consecutive/);
  const exported=JSON.stringify({questions:[imported,binary,q]});
  assert.deepEqual(core.parseImport(exported)[0].questions.map(({id,...value})=>value),[imported,binary,q].map(({id,...value})=>value));
});

test('mixed attempts preserve sets across restart, backup and editing; old libraries load without rewriting',async()=>{
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'quiznet-types-'));
  try {
    let store=new Store(directory);await store.load(sampleLibrary);
    const before=await fs.readFile(store.file,'utf8');store=new Store(directory);await store.load();
    assert.equal(await fs.readFile(store.file,'utf8'),before);
    const pack={title:'Mixed',questions:[q,{type:'multiple-answer',prompt:'Pick both',options:['First','Second','Third'],correctAnswers:[0,2]},{type:'true-false',prompt:'True?',options:['True','False'],correctAnswer:0}]};
    await store.change(data=>core.importPacks(data,core.parseImport(JSON.stringify(pack))));
    const course=store.data.courses.at(-1),unit=course.units[0],quiz=unit.quizzes[0];
    await store.change(data=>core.mutate(data,{type:'start',quizId:quiz.id,shuffle:true}));
    const answer=async(index,value)=>store.change(data=>core.mutate(data,{type:'answer',questionId:quiz.questions[index].id,answer:value}));
    await answer(0,0);await answer(1,[2,0]);await answer(2,0);
    const restarted=new Store(directory);await restarted.load();store=restarted;
    assert.deepEqual(store.data.activeSession.answers[quiz.questions[1].id],[2,0]);
    assert.deepEqual(core.validateLibrary(store.data),store.data);
    for(const invalid of [[0,0],[3],0,null]) await assert.rejects(answer(1,invalid),/Invalid answer/);
    await answer(1,[]);await assert.rejects(store.change(data=>core.mutate(data,{type:'finish'})),/every question/);
    await answer(1,[2,0]);await store.change(data=>core.mutate(data,{type:'finish'}));
    assert.equal(store.data.attempts.at(-1).score,3);
    assert.deepEqual(core.validateLibrary(store.data),store.data);
    const bad=structuredClone(store.data);bad.attempts.at(-1).answers[bad.attempts.at(-1).questions.findIndex(item=>item.type==='multiple-answer')]=[];
    assert.throws(()=>core.validateLibrary(bad),/invalid answers/);
    await store.change(data=>core.mutate(data,{type:'saveQuiz',courseId:course.id,unitId:unit.id,quizId:quiz.id,title:'Changed',questions:[q]}));
    assert.equal(store.data.attempts.at(-1).questions.length,3);
    assert.deepEqual(core.validateLibrary(store.data),store.data);
    const again=new Store(directory);await again.load();assert.equal(again.data.attempts.at(-1).score,3);
  } finally {await fs.rm(directory,{recursive:true,force:true});}
});
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
  assert.throws(()=>core.question({...q,format:'rtf'}),/text, html, or markdown/);
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

test('duplicate imports keep maximum-length titles valid and all quizzes survive restart',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'quiznet-import-title-'));
  try{
    const store=new Store(dir);await store.load();
    const title='Q'.repeat(200),packs=core.parseImport(JSON.stringify({title,questions:[q]}));
    for(let i=0;i<12;i++)await store.change(data=>core.importPacks(data,packs));
    const quizzes=store.data.courses[0].units[0].quizzes;
    assert.equal(new Set(quizzes.map(q=>q.title)).size,12);
    assert.ok(quizzes.every(q=>q.title.length<=200));
    assert.equal(quizzes[1].title,'Q'.repeat(196)+' (2)');
    assert.equal(quizzes[11].title,'Q'.repeat(195)+' (12)');
    assert.deepEqual(core.validateLibrary(store.data),store.data);
    const restarted=new Store(dir);await restarted.load();assert.deepEqual(restarted.data,store.data);assert.equal(restarted.notice,'');
  }finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('a missing primary library recovers its backup and never seeds over an invalid backup',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'quiznet-missing-library-'));
  try{
    const store=new Store(dir);await store.load();
    await store.change(data=>core.importPacks(data,core.parseImport(JSON.stringify({title:'Recovery quiz',questions:[q]}))));
    const quiz=store.data.courses[0].units[0].quizzes[0];
    await store.change(data=>{core.mutate(data,{type:'start',quizId:quiz.id});core.mutate(data,{type:'answer',questionId:quiz.questions[0].id,answer:0});core.mutate(data,{type:'finish'});core.mutate(data,{type:'start',quizId:quiz.id});core.mutate(data,{type:'answer',questionId:quiz.questions[0].id,answer:1});});
    const expected=structuredClone(store.data);
    await store.change(()=>{});const backup=await fs.readFile(store.file+'.bak','utf8');
    await fs.unlink(store.file);
    let seeded=false;const recovery=new Store(dir);await recovery.load(()=>{seeded=true;return sampleLibrary();});
    assert.equal(seeded,false);assert.deepEqual(recovery.data,expected);assert.match(recovery.notice,/recovered/);
    assert.equal(await fs.readFile(store.file+'.bak','utf8'),backup);
    assert.deepEqual(JSON.parse(await fs.readFile(store.file,'utf8')),expected);
    await fs.unlink(store.file);await fs.writeFile(store.file+'.bak','damaged backup');
    await assert.rejects(new Store(dir).load(sampleLibrary),/preserved/);
    assert.equal(await fs.readFile(store.file+'.bak','utf8'),'damaged backup');
    await assert.rejects(fs.stat(store.file),{code:'ENOENT'});
  }finally{await fs.rm(dir,{recursive:true,force:true});}
});
