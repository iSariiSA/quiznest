const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const core=require('../src/core.cjs'),{sampleLibrary}=require('../src/sample.cjs'),{Store}=require('../src/store.cjs');
const showcase=require('../src/showcase.json');

test('fresh showcase is one collection/course/unit/quiz with every response type and embedded study formats',()=>{
 const source=JSON.stringify(showcase),data=sampleLibrary();assert.equal(data.collections.length,1);assert.equal(data.courses.length,1);const course=data.courses[0];assert.equal(course.collectionId,data.collections[0].id);assert.equal(course.units.length,1);assert.equal(course.units[0].quizzes.length,1);
 const quiz=course.units[0].quizzes[0];assert.equal(quiz.questions.length,10);assert.deepEqual(new Set(quiz.questions.map(q=>q.type)),new Set(core.types.map(type=>type.id)));assert.ok(quiz.questions.every(q=>q.explanation.trim()));assert.ok(quiz.questions.some(q=>q.image?.startsWith('data:image/png;base64,')&&q.imageAlt));assert.ok(quiz.questions.some(q=>q.code&&q.codeLanguage==='python'));assert.ok(quiz.questions.some(q=>q.format==='markdown'&&q.prompt.includes('$$')));assert.ok(quiz.questions.some(q=>q.format==='html'&&q.prompt.includes('<table>')));
 assert.equal(data.attempts.length,0);assert.equal(data.activeSession,null);assert.deepEqual(core.validateLibrary(data),data);assert.equal(JSON.stringify(showcase),source);assert.notEqual(sampleLibrary().courses[0].id,course.id);
 const portable=core.parseImport(core.exportQuiz({course,unit:course.units[0],quiz}))[0];assert.equal(portable.questions.length,10);assert.deepEqual(portable.questions.map(q=>q.type),quiz.questions.map(q=>q.type));
});

test('every showcase response is answerable and the completed mixed attempt survives validation',()=>{
 const data=sampleLibrary(),quiz=data.courses[0].units[0].quizzes[0];core.mutate(data,{type:'start',quizId:quiz.id},1000);for(const q of quiz.questions)core.mutate(data,{type:'answer',questionId:q.id,answer:core.correctValue(q)},2000);core.mutate(data,{type:'finish'},3000);assert.equal(data.attempts[0].score,10);assert.deepEqual(core.validateLibrary(data),data);
});

test('showcase seeds only new profiles and never rewrites or repopulates an existing empty library',async t=>{
 const temporaryRoot=path.resolve(__dirname,'../work/test-profiles');await fs.mkdir(temporaryRoot,{recursive:true});const dir=await fs.mkdtemp(path.join(temporaryRoot,'quiznet-showcase-'));t.after(async()=>{assert.ok(path.resolve(dir).startsWith(temporaryRoot+path.sep)&&path.basename(dir).startsWith('quiznet-showcase-'));await fs.rm(dir,{recursive:true,force:true});});
 const fresh=new Store(path.join(dir,'fresh'));await fresh.load(sampleLibrary);assert.equal(fresh.data.courses.length,1);assert.equal(fresh.data.collections.length,1);
 const existing=path.join(dir,'existing');await fs.mkdir(existing);const file=path.join(existing,'library.json'),bytes=JSON.stringify(core.emptyLibrary(),null,1);await fs.writeFile(file,bytes);let seeded=false;const store=new Store(existing);await store.load(()=>{seeded=true;return sampleLibrary();});assert.equal(seeded,false);assert.equal(store.data.courses.length,0);assert.equal(await fs.readFile(file,'utf8'),bytes);assert.equal((await fs.readdir(existing)).includes('library.json.bak'),false);
 // An existing rolling backup is recovery material, not a reason to seed a tour.
 const backup=path.join(dir,'backup');await fs.mkdir(backup);await fs.writeFile(path.join(backup,'library.json.bak'),bytes);const restored=new Store(backup);await restored.load(()=>{throw Error('A backup must not be replaced by the tour');});assert.equal(restored.data.courses.length,0);assert.equal(await fs.readFile(path.join(backup,'library.json.bak'),'utf8'),bytes);
});
