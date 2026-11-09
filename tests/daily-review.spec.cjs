const {test,expect,_electron:electron}=require('@playwright/test');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const core=require('../src/core.cjs');
let app,page,directory;const errors=[];
async function launch(){const env={...process.env,QUIZNET_TEST_DATA:directory};delete env.ELECTRON_RUN_AS_NODE;app=await electron.launch({args:[path.resolve(__dirname,'..')],env});page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));await expect(page.locator('.brand')).toBeVisible();await page.getByRole('button',{name:'Library',exact:true}).click();}
async function library(){return page.evaluate(async()=>(await window.quiznet.get()).library);}
test.beforeAll(async()=>{
  directory=await fs.mkdtemp(path.join(os.tmpdir(),'quiznet-daily-ui-'));await fs.mkdir(path.join(directory,'data'));
  const d=core.emptyLibrary();core.importPacks(d,core.parseImport(JSON.stringify({course:'Mathematics',unit:'Foundations',title:'Everyday mathematics',questions:[{prompt:'What is $2 + 2$?',format:'markdown',options:['4','5'],correctAnswer:0,explanation:'Adding two pairs gives **four**.'},{type:'multiple-answer',prompt:'Select the even numbers.',options:['2','3','4'],correctAnswers:[0,2],explanation:'Two and four are even.'},{prompt:'Is zero even?',options:['Yes','No'],correctAnswer:0}]})));
  await fs.writeFile(path.join(directory,'data/library.json'),JSON.stringify(d));await launch();
});
test.afterAll(async()=>{await app?.close();await fs.rm(directory,{recursive:true,force:true});});
test('configure daily review, answer and rate, resume, enforce cap, restore, and unlock next day',async()=>{
  await page.getByRole('button',{name:'Daily review',exact:true}).click();await page.getByRole('button',{name:'Choose quizzes',exact:true}).click();
  await page.getByLabel('Daily review limit',{exact:true}).fill('2');await page.getByRole('checkbox',{name:/Everyday mathematics/}).check();await page.getByRole('button',{name:'Save settings',exact:true}).click();
  await expect(page.locator('.daily-stats')).toContainText('New questions');await page.getByRole('button',{name:'Start review',exact:true}).click();
  await expect(page.locator('.katex')).toHaveCount(1);await expect(page.getByRole('button',{name:'Check answer',exact:true})).toBeDisabled();
  await expect(page.locator('.daily-feedback')).toHaveCount(0);await page.locator('[data-action=reviewChoice][data-index="0"]').click();await page.getByRole('button',{name:'Check answer',exact:true}).click();
  await expect(page.locator('.daily-feedback')).toContainText('Correct');await expect(page.locator('.daily-feedback')).toContainText('Adding two pairs');
  await expect(page.locator('[data-rating=good]')).toContainText('3 days');await expect(page.locator('[data-rating=easy]')).toContainText('7 days');
  await app.close();await launch();await page.getByRole('button',{name:'Daily review',exact:true}).click();await page.getByRole('button',{name:'Continue review',exact:true}).click();
  await expect(page.locator('.daily-feedback')).toContainText('Correct');await expect(page.locator('[data-action=reviewChoice]').first()).toBeDisabled();
  const outputs=path.resolve(__dirname,'../test-results/screenshots');await fs.mkdir(outputs,{recursive:true});
  await page.screenshot({path:path.join(outputs,'Quiznet-daily-review-answer.png')});
  await page.locator('[data-rating=good]').click();await expect(page.locator('.question-prompt')).toContainText('Select the even numbers');
  await page.locator('[data-action=reviewChoice][data-index="0"]').click();await page.getByRole('button',{name:'Check answer',exact:true}).click();
  await expect(page.locator('.daily-feedback')).toContainText('Incorrect');await expect(page.locator('[data-rating=hard]')).toBeDisabled();
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setBounds({width:760,height:620}));
  expect(await page.evaluate(()=>document.querySelector('#main').scrollWidth<=document.querySelector('#main').clientWidth)).toBe(true);
  await page.locator('[data-rating=again]').click();await expect(page.getByRole('heading',{name:'Your daily limit is complete'})).toBeVisible();
  const d=await library();expect(d.dailyReview.days.at(-1).count).toBe(2);expect(d.attempts).toEqual([]);expect(d.activeSession).toBeNull();
  await page.screenshot({path:path.join(outputs,'Quiznet-daily-review-complete.png')});
  expect(await page.evaluate(async()=>{try{await window.quiznet.change({type:'reviewBegin'});return false;}catch{return true;}})).toBe(true);
  const backup=path.join(directory,'backup.json');await app.evaluate(({dialog},file)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:file});dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},backup);
  await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'Data & recovery settings',exact:true}).click();await page.getByRole('button',{name:'Save backup',exact:true}).click();await expect(page.locator('#toast')).toContainText('Backup saved');
  const saved=JSON.parse(await fs.readFile(backup));expect(saved.dailyReview).toEqual(d.dailyReview);
  await page.getByRole('button',{name:'Restore',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Restore',exact:true}).click();expect((await library()).dailyReview).toEqual(d.dailyReview);
  const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);tomorrow.setHours(12,0,0,0);
  await app.evaluate((_,now)=>{Date.now=()=>now;},tomorrow.getTime());await page.evaluate(now=>{Date.now=()=>now;},tomorrow.getTime());
  await page.getByRole('button',{name:'Daily review',exact:true}).click();await page.getByRole('button',{name:'Start review',exact:true}).click();
  await expect(page.locator('.question-prompt')).toContainText('Select the even numbers');await page.locator('[data-action=reviewChoice][data-index="0"]').click();await page.locator('[data-action=reviewChoice][data-index="2"]').click();await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.locator('.daily-feedback')).toContainText('Correct');
  expect(errors).toEqual([]);
});
