const {test,expect,_electron:electron}=require('@playwright/test');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const core=require('../src/core.cjs');
let app,page,directory;
async function launch(){const env={...process.env,QUIZNET_TEST_DATA:directory};delete env.ELECTRON_RUN_AS_NODE;app=await electron.launch({executablePath:process.env.QUIZNET_ELECTRON_PATH||undefined,args:[path.resolve(__dirname,'..')],env});page=await app.firstWindow();await expect(page.locator('.brand')).toBeVisible();}
async function now(value){await app.evaluate((_,value)=>{Date.now=()=>value;},value);await page.evaluate(value=>{Date.now=()=>value;},value);}
async function library(){return page.evaluate(async()=>(await window.quiznet.get()).library);}
test.beforeAll(async()=>{
  directory=await fs.mkdtemp(path.join(os.tmpdir(),'quiznet-timing-'));await fs.mkdir(path.join(directory,'data'));
  const data=core.emptyLibrary();core.importPacks(data,core.parseImport(JSON.stringify({course:'Mathematics',unit:'Basics',title:'Quick practice',questions:[{prompt:'Which value equals 2 + 2?',options:['4','5'],correctAnswer:0},{type:'multiple-answer',prompt:'Choose the even numbers.',options:['2','3','4'],correctAnswers:[0,2]}]})));
  await fs.writeFile(path.join(directory,'data/library.json'),JSON.stringify(data,null,2));await launch();
});
test.afterAll(async()=>{await app?.close();await fs.rm(directory,{recursive:true,force:true});});

test('small stopwatch, hidden question timing, revisits, Explore, restart, restore and previous-attempt comparison',async()=>{
  const errors=[];const track=()=>page.on('pageerror',error=>errors.push(error.message));track();
  const outputs=process.env.QUIZNET_SCREENSHOTS||path.resolve(__dirname,'../test-results/screenshots');await fs.mkdir(outputs,{recursive:true});
  const base=Date.now(),day=86400000;
  await page.getByRole('button',{name:'Explore',exact:true}).click();await expect(page.getByRole('heading',{name:'Explore',exact:true})).toBeVisible();await expect(page.locator('.explore-placeholder')).toHaveText('ExploreComing soon.');
  await page.screenshot({path:path.join(outputs,'Quiznet-explore.png')});
  await page.getByRole('button',{name:'Library',exact:true}).first().click();await page.locator('.course-row').getByRole('button').click();
  await now(base);await page.getByRole('button',{name:'Start Quick practice',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Start quiz',exact:true}).click();await expect(page.getByRole('timer')).toHaveText('00:00');
  await now(base+5000);await expect(page.getByRole('timer')).toHaveText('00:05');await expect(page.locator('.question-time')).toHaveCount(0);
  await page.screenshot({path:path.join(outputs,'Quiznet-small-timer.png')});
  await page.locator('[data-action="answer"][data-index="1"]').click();await page.getByRole('button',{name:'Next',exact:true}).click();
  await now(base+9000);await page.locator('[data-action="answer"][data-index="0"]').click();await page.locator('[data-action="answer"][data-index="2"]').click();await page.getByRole('button',{name:'Previous',exact:true}).click();
  await now(base+11000);await page.getByRole('button',{name:'Explore',exact:true}).click();
  let saved=await library();expect(saved.activeSession.timing.elapsedMs).toBe(11000);expect(saved.activeSession.timing.runningSince).toBeNull();
  // A restored active cursor belongs to its previous process, so downtime is excluded.
  const restoreFile=path.join(directory,'active-backup.json');saved.activeSession.timing.runningSince=base;await fs.writeFile(restoreFile,JSON.stringify(saved));
  await now(base+day);await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},restoreFile);
  await page.getByRole('button',{name:'App menu'}).click();await page.getByRole('menuitem',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'Restore',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Restore',exact:true}).click();
  saved=await library();expect(saved.activeSession.timing.elapsedMs).toBe(11000);expect(saved.activeSession.timing.runningSince).toBeNull();
  await page.getByRole('button',{name:'Resume',exact:true}).click();await expect(page.getByRole('timer')).toHaveText('00:11');await page.getByRole('button',{name:'Next',exact:true}).click();
  await now(base+day+2000);await app.close();
  const file=path.join(directory,'data/library.json'),before=await fs.readFile(file,'utf8');saved=JSON.parse(before);expect(saved.activeSession.timing.elapsedMs).toBe(13000);expect(saved.activeSession.timing.runningSince).toBeNull();
  await launch();track();expect(await fs.readFile(file,'utf8')).toBe(before);
  await now(base+day*2);await page.getByRole('button',{name:'Resume',exact:true}).click();await expect(page.getByRole('timer')).toHaveText('00:13');await expect(page.locator('.answer-option.chosen')).toHaveCount(2);
  await now(base+day*2+2000);await page.getByRole('button',{name:'Finish',exact:true}).click();await expect(page.locator('.score-value')).toHaveText('50%');
  await expect(page.locator('.question-time')).toHaveText(['Time spent 00:07','Time spent 00:08']);await expect(page.locator('.result-summary')).toContainText('Time 00:15');await expect(page.locator('.attempt-comparison')).toHaveCount(0);
  saved=await library();expect(saved.attempts[0].questionTimesMs).toEqual([7000,8000]);
  const retry=base+day*2+100000;await now(retry);await page.getByRole('button',{name:'Retry',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Start quiz',exact:true}).click();
  await now(retry+3000);await page.locator('[data-action="answer"][data-index="0"]').click();await page.getByRole('button',{name:'Next',exact:true}).click();
  await now(retry+8000);await page.locator('[data-action="answer"][data-index="0"]').click();await page.locator('[data-action="answer"][data-index="2"]').click();await page.getByRole('button',{name:'Finish',exact:true}).click();
  await expect(page.locator('.attempt-comparison')).toContainText('Previous: 50% · 00:15. 50 points higher · 00:07 faster.');await expect(page.locator('.question-time')).toHaveText(['Time spent 00:03','Time spent 00:05']);
  await page.screenshot({path:path.join(outputs,'Quiznet-timed-results.png')});
  const backup=path.join(directory,'results-backup.json');await app.evaluate(({dialog},file)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:file});},backup);
  await page.getByRole('button',{name:'App menu'}).click();await page.getByRole('menuitem',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'Save backup',exact:true}).click();await expect(page.locator('#toast')).toContainText('Backup saved');
  await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},backup);await page.getByRole('button',{name:'Restore',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Restore',exact:true}).click();
  await page.getByRole('button',{name:'History',exact:true}).click();await expect(page.locator('.history-row').first()).toContainText('00:08');await page.locator('.history-row').first().click();await expect(page.locator('.question-time')).toHaveCount(2);await expect(page.locator('.attempt-comparison')).toContainText('00:07 faster');
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setBounds({width:760,height:560}));expect(await page.evaluate(()=>document.querySelector('#main').scrollWidth<=document.querySelector('#main').clientWidth)).toBe(true);
  expect(errors).toEqual([]);
});
