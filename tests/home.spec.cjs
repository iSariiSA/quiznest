const {command}=require('./ui-actions.cjs');
const {test,expect,_electron:electron}=require('@playwright/test');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const core=require('../src/core.cjs');
let app,page,directory;const errors=[];
async function launch(data){directory=await fs.mkdtemp(path.join(os.tmpdir(),'quiznet-home-'));await fs.mkdir(path.join(directory,'data'));await fs.writeFile(path.join(directory,'data/library.json'),JSON.stringify(data));const env={...process.env,QUIZNET_TEST_DATA:directory};delete env.ELECTRON_RUN_AS_NODE;app=await electron.launch({args:[path.resolve(__dirname,'..')],env});page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));await expect(page.getByRole('heading',{name:'Home',exact:true})).toBeVisible();}
function fixture(){const d=core.emptyLibrary();core.importPacks(d,core.parseImport(JSON.stringify({course:'Mathematics',unit:'Foundations',title:'Addition <example>',questions:[{prompt:'Two plus two?',options:['4','5'],correctAnswer:0,explanation:'Two pairs make four.'},{prompt:'One plus one?',options:['2','3'],correctAnswer:0}]})));return d;}
function finish(d,answer=1){const quiz=d.courses[0].units[0].quizzes[0];core.mutate(d,{type:'start',quizId:quiz.id});for(const q of quiz.questions)core.mutate(d,{type:'answer',questionId:q.id,answer});core.mutate(d,{type:'finish'});}
test.afterEach(async()=>{await app?.close();if(directory)await fs.rm(directory,{recursive:true,force:true});expect(errors.splice(0)).toEqual([]);});
test('Home opens by default, stays read-only, works empty, and offers create/import/library actions',async()=>{
 await launch(core.emptyLibrary());const file=path.join(directory,'data/library.json'),before=await fs.readFile(file,'utf8');await expect(page.locator('.home-recent')).toContainText('after you finish an attempt');await expect(page.getByRole('button',{name:'Home',exact:true})).toHaveAttribute('aria-current','page');
 await page.getByRole('button',{name:'New quiz',exact:true}).click();await expect(page.getByRole('dialog')).toHaveAccessibleName('New quiz');await page.getByRole('button',{name:'Write manually',exact:true}).click();await expect(page.getByLabel('New course name',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Close dialog'}).click();
 await app.evaluate(({dialog})=>{dialog.showOpenDialog=async()=>({canceled:true,filePaths:[]});});await command(page,'Import…');await expect(page.getByRole('heading',{name:'Home',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Library',exact:true}).click();await expect(page.getByRole('heading',{name:'Courses',exact:true})).toBeVisible();await page.getByRole('button',{name:'Quiznet home',exact:true}).click();await expect(page.getByRole('heading',{name:'Home',exact:true})).toBeVisible();expect(await fs.readFile(file,'utf8')).toBe(before);
 await page.getByRole('button',{name:'Set up daily review',exact:true}).click();await expect(page.getByRole('heading',{name:'A little review, every day'})).toBeVisible();
});
test('Home resumes saved quiz answers and pauses active timing when returning from the runner',async()=>{
 const d=fixture(),quiz=d.courses[0].units[0].quizzes[0];core.mutate(d,{type:'start',quizId:quiz.id});core.mutate(d,{type:'answer',questionId:quiz.questions[0].id,answer:1});await launch(d);
 await expect(page.locator('.home-continue')).toContainText('Addition <example>');await expect(page.locator('.home-continue example')).toHaveCount(0);await page.getByRole('button',{name:'Resume quiz',exact:true}).click();await expect(page.locator('[data-action=answer][data-index="1"]')).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'Quiznet home',exact:true}).click();const saved=await page.evaluate(async()=>(await window.quiznet.get()).library);expect(saved.activeSession.timing.runningSince).toBeNull();expect(saved.activeSession.answers[quiz.questions[0].id]).toBe(1);
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setBounds({width:760,height:560}));expect(await page.locator('#main').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
});

test('Home offers daily review once, with settings as a distinct secondary action',async()=>{
 const d=fixture(),quiz=d.courses[0].units[0].quizzes[0];core.mutate(d,{type:'reviewSettings',limit:20,quizIds:[quiz.id]});await launch(d);
 await expect(page.locator('button[data-action="reviewBegin"]')).toHaveCount(1);
 const file=path.join(directory,'data/library.json'),before=await fs.readFile(file,'utf8');
 await page.getByRole('button',{name:'Review settings',exact:true}).click();await expect(page.getByRole('dialog')).toHaveAccessibleName('Daily review settings');
 await page.getByRole('button',{name:'Cancel',exact:true}).click();expect(await fs.readFile(file,'utf8')).toBe(before);
 await page.evaluate(async()=>{await change({type:'reviewBegin'});await change({type:'start',quizId:flatten()[0].quiz.id});await navigate('home');});
 await expect(page.getByRole('button',{name:'Resume quiz',exact:true})).toBeVisible();
 await expect(page.locator('button[data-action="reviewBegin"]')).toHaveCount(1);
});
test('Home shows unique recent quizzes, daily progress, notebook resume, and refreshes a new day',async()=>{
 const d=fixture();finish(d);d.attempts[0].completedAt=new Date(Date.now()-86400000).toISOString();finish(d,0);const quiz=d.courses[0].units[0].quizzes[0];core.mutate(d,{type:'reviewSettings',limit:1,quizIds:[quiz.id]});core.mutate(d,{type:'reviewBegin'});const token=d.dailyReview.active.token;core.mutate(d,{type:'reviewAnswer',token,answer:0});core.mutate(d,{type:'reviewCheck',token});core.mutate(d,{type:'reviewRate',token,rating:'good'});core.mutate(d,{type:'mistakeStart'});await launch(d);
 const file=path.join(directory,'data/library.json');let before=await fs.readFile(file,'utf8');await expect(page.locator('.home-recent-row')).toHaveCount(1);await expect(page.locator('.home-review')).toContainText('Daily limit complete');await expect(page.locator('.home-review-count')).toContainText('1');await expect(page.getByRole('button',{name:'Continue mistake review',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Continue mistake review',exact:true}).click();await expect(page.locator('.daily-session')).toContainText('Mistake review');await page.getByRole('button',{name:'Home',exact:true}).click();
 before=await fs.readFile(file,'utf8');await page.getByRole('button',{name:'View result for Addition <example>',exact:true}).click();await expect(page.locator('.score-value')).toHaveText('100%');await page.getByRole('button',{name:'Home',exact:true}).click();await page.getByRole('button',{name:'Practice Addition <example>',exact:true}).click();await expect(page.getByRole('dialog')).toHaveAccessibleName('Before you start');await page.getByRole('button',{name:'Cancel',exact:true}).click();expect(await fs.readFile(file,'utf8')).toBe(before);
 const tomorrow=Date.now()+86400000;await page.evaluate(now=>{Date.now=()=>now;},tomorrow);await expect(page.locator('.home-review-count strong')).toHaveText('0',{timeout:20000});await expect(page.getByRole('button',{name:'Start daily review',exact:true})).toBeVisible();
 const screenshots=path.resolve(__dirname,'../test-results/screenshots');await fs.mkdir(screenshots,{recursive:true});await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setBounds({width:1280,height:1000}));await page.locator('#main').evaluate(el=>el.scrollTop=0);await page.screenshot({path:path.join(screenshots,'Quiznet-home.png')});await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setBounds({width:760,height:560}));expect(await page.locator('#main').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await page.getByRole('button',{name:'Open mistake notebook',exact:true}).click();await expect(page.getByRole('heading',{name:'Mistake notebook',exact:true})).toBeVisible();
});
