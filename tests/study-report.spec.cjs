const {test,expect,_electron:electron}=require('@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const core=require('../src/core.cjs'),examples=require('../examples/math-diagrams.json');
let app,page,directory,profile,targetId;
test.beforeEach(async()=>{app=null;directory=await fs.mkdtemp(path.join(os.tmpdir(),'quiznet-study-report-'));profile=path.join(directory,'profile');});
test.afterEach(async()=>{await app?.close();const resolved=path.resolve(directory);if(!resolved.startsWith(path.resolve(os.tmpdir())+path.sep)||!path.basename(resolved).startsWith('quiznet-study-report-'))throw new Error('Unexpected test directory');await fs.rm(resolved,{recursive:true,force:true});});
const libraryFile=()=>path.join(profile,'data/library.json');
async function start({large=false}={}){
  const data=core.emptyLibrary(),questions=large?Array.from({length:60},(_,i)=>({prompt:`Historical item ${i+1}`,options:['Correct choice','Wrong choice'],correctAnswer:0,explanation:'Saved reasoning.'})):[
    structuredClone(examples.questions[0]),
    {type:'multiple-answer',format:'markdown',prompt:'Select all even numbers.',options:['$2$','$3$','$4$'],correctAnswers:[0,2],explanation:'Two and four are even.'},
    {type:'true-false',format:'html',prompt:'<strong>Four is even.</strong>',options:['True','False'],correctAnswer:0,explanation:'Four is divisible by two.'},
    structuredClone(examples.questions[1]),
    {prompt:'What does this print?',code:'\n    print(2)\n',codeLanguage:'python',options:['2','3'],correctAnswer:0,explanation:'It prints two.'},
    {prompt:'Is three odd or even?',options:['Odd','Even'],correctAnswer:0,explanation:'Three is odd.'}
  ];
  core.importPacks(data,core.parseImport(JSON.stringify({title:'Current live quiz',questions})));
  const quiz=data.courses[0].units[0].quizzes[0],base=Date.parse('2026-10-25T10:00:00.000Z');
  core.mutate(data,{type:'start',quizId:quiz.id},base);
  for(const [index,q] of quiz.questions.entries())core.mutate(data,{type:'answer',questionId:q.id,answer:large?(index===50?1:0):index===0?1:index===1?[0]:0},base);
  core.mutate(data,{type:'finish'},base+457000);const a=data.attempts[0];a.title='Historical visual quiz';targetId=a.id;
  a.questionTimesMs=large?Array.from({length:60},(_,i)=>i===50?200000:1000):[20000,200000,50000,180000,3000,4000];a.elapsedSeconds=a.questionTimesMs.reduce((n,value)=>n+value,0)/1000;
  const legacy={...structuredClone(a),id:core.id(),title:'Older quiz attempt'};delete legacy.timingMode;delete legacy.questionTimesMs;data.attempts.push(legacy);
  quiz.questions[0].prompt='Edited live question that must not replace history.';
  await fs.mkdir(path.join(profile,'data'),{recursive:true});await fs.writeFile(libraryFile(),JSON.stringify(core.validateLibrary(data),null,2));
  const env={...process.env,QUIZNET_TEST_DATA:profile};delete env.ELECTRON_RUN_AS_NODE;app=await electron.launch({args:[path.resolve(__dirname,'..')],env});page=await app.firstWindow();await expect(page.locator('.brand')).toBeVisible();
  await page.getByRole('button',{name:'History',exact:true}).click();await page.locator(`.history-row[data-id="${targetId}"]`).click();
}
async function saveTo(file){await app.evaluate(({dialog},file)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:file});},file);}
async function openReport(){await page.getByRole('button',{name:'Export study report',exact:true}).click();await expect(page.getByRole('dialog')).toHaveAccessibleName('Study report');}
test('History exports a complete agent report from the historical snapshot while retaining the active review filter and library',async()=>{
  await start();const before=await fs.readFile(libraryFile(),'utf8');
  await page.getByRole('button',{name:'Incorrect (2)',exact:true}).click();await expect(page.locator('.review-card')).toHaveCount(2);await openReport();
  await expect(page.getByLabel('Include',{exact:true})).toHaveValue('all');await expect(page.locator('#study-report-count')).toContainText('6 questions');
  await fs.mkdir(path.resolve(__dirname,'../outputs'),{recursive:true});await page.screenshot({path:path.resolve(__dirname,'../outputs/Study-report.png')});
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setBounds({width:760,height:560}));expect(await page.getByRole('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await expect(page.getByRole('button',{name:'Save Markdown',exact:true})).toBeVisible();
  const file=path.join(directory,'review.md');await saveTo(file);await page.getByRole('button',{name:'Save Markdown',exact:true}).click();await expect(page.locator('#toast')).toContainText('Study report saved.');
  const text=await fs.readFile(file,'utf8');expect(text).toContain('Instructions for the tutor agent');expect(text).toContain('### Question 6');expect(text).toContain('Your answer: A\n- Saved correct answer: A, C');expect(text).toContain('200000 ms');expect(text).toContain('Most time spent (longest first): Q2, Q4');expect(text).toContain('<strong>Four is even.</strong>');expect(text).toContain('\n    print(2)\n');expect(text).not.toContain('Edited live question');expect(text.split(examples.questions[0].image)).toHaveLength(2);expect(text).toContain('Embedded diagrams');expect(text).toContain('saved answer key/explanation as a reference to verify');
  await fs.copyFile(file,path.resolve(__dirname,'../outputs/Study-report-example.md'));await expect(page.locator('.review-card')).toHaveCount(2);expect(await fs.readFile(libraryFile(),'utf8')).toBe(before);
});
test('focused export preserves question numbers; native cancellation, invalid destinations and failed writes allow safe retry',async()=>{
  await start();const before=await fs.readFile(libraryFile(),'utf8');await openReport();await page.getByLabel('Include',{exact:true}).selectOption('focus');await expect(page.locator('#study-report-count')).toContainText('3 questions');
  await app.evaluate(({dialog})=>{dialog.showSaveDialog=async()=>({canceled:true,filePath:undefined});});await page.getByRole('button',{name:'Save Markdown',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();
  const wrongExtension=path.join(directory,'review.txt');await saveTo(wrongExtension);await page.getByRole('button',{name:'Save Markdown',exact:true}).click();await expect(page.locator('.form-error')).toContainText('Markdown (.md)');await expect(fs.access(wrongExtension)).rejects.toThrow();
  const blocked=path.join(profile,'data','blocked.md');await saveTo(blocked);await page.getByRole('button',{name:'Save Markdown',exact:true}).click();await expect(page.locator('.form-error')).toContainText('outside Quiznet');await expect(fs.access(blocked)).rejects.toThrow();
  const file=path.join(directory,'focused.md');await fs.writeFile(file,'Previous report');await saveTo(file);
  await app.evaluate((_,file)=>{const f=process.getBuiltinModule('fs/promises');global.__reportRename=f.rename;f.rename=async(...args)=>{if(args[1]===file)throw Object.assign(new Error('Synthetic full disk'),{code:'ENOSPC'});return global.__reportRename(...args);};},file);
  await page.getByRole('button',{name:'Save Markdown',exact:true}).click();await expect(page.locator('.form-error')).toContainText('full disk');expect(await fs.readFile(file,'utf8')).toBe('Previous report');expect((await fs.readdir(directory)).some(name=>name.startsWith('.quiznet-report-'))).toBe(false);
  await app.evaluate(()=>{process.getBuiltinModule('fs/promises').rename=global.__reportRename;delete global.__reportRename;});await page.getByRole('button',{name:'Save Markdown',exact:true}).click();await expect(page.locator('#toast')).toContainText('Study report saved.');
  const text=await fs.readFile(file,'utf8');expect((text.match(/^### Question /gm)||[])).toHaveLength(3);expect(text).toContain('### Question 4 — Correct · Most time spent');expect(text).not.toContain('### Question 3');expect(await fs.readFile(libraryFile(),'utf8')).toBe(before);
});
test('older attempts label unavailable question timing; invalid or concurrent IPC requests cannot write a report',async()=>{
  await start();await page.getByRole('button',{name:'History',exact:true}).click();await page.locator('.history-row').filter({hasText:'Older quiz attempt'}).click();const before=await fs.readFile(libraryFile(),'utf8');await openReport();await expect(page.getByRole('dialog')).toContainText('no per-question timing');
  const file=path.join(directory,'legacy.md');await saveTo(file);await page.getByRole('button',{name:'Save Markdown',exact:true}).click();await expect(page.locator('#toast')).toContainText('Study report saved.');const text=await fs.readFile(file,'utf8');expect((text.match(/Recorded question time: Not recorded/g)||[])).toHaveLength(6);
  await expect(page.evaluate(()=>window.quiznet.studyReportInfo({id:'unknown'}))).rejects.toThrow('Choose a completed quiz');await expect(page.evaluate(()=>window.quiznet.exportStudyReport('unknown','all'))).rejects.toThrow('Completed quiz not found');await expect(page.evaluate(id=>window.quiznet.exportStudyReport(id,'invalid'),targetId)).rejects.toThrow('Choose all questions');
  await app.evaluate(({dialog})=>{dialog.showSaveDialog=()=>new Promise(resolve=>{global.__cancelReport=()=>resolve({canceled:true});});});
  const pending=page.evaluate(id=>window.quiznet.exportStudyReport(id,'all'),targetId);await expect.poll(()=>app.evaluate(()=>typeof global.__cancelReport)).toBe('function');await expect(page.evaluate(id=>window.quiznet.exportStudyReport(id,'all'),targetId)).rejects.toThrow('Wait for the current study report');await app.evaluate(()=>global.__cancelReport());expect(await pending).toBe(false);expect(await fs.readFile(libraryFile(),'utf8')).toBe(before);
});
test('paged result review exports all historical questions regardless of the visible page',async()=>{
  await start({large:true});const before=await fs.readFile(libraryFile(),'utf8');await page.getByLabel('Review questions',{exact:true}).selectOption('1');await expect(page.locator('.review-number').first()).toHaveText('51.');await openReport();const file=path.join(directory,'all-pages.md');await saveTo(file);await page.getByRole('button',{name:'Save Markdown',exact:true}).click();await expect(page.locator('#toast')).toContainText('Study report saved.');const text=await fs.readFile(file,'utf8');expect((text.match(/^### Question /gm)||[])).toHaveLength(60);expect(text).toContain('### Question 1');expect(text).toContain('### Question 60');expect(text).toContain('### Question 51 — Incorrect · Most time spent');await expect(page.locator('.review-number').first()).toHaveText('51.');expect(await fs.readFile(libraryFile(),'utf8')).toBe(before);
});
