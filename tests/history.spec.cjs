// Run with the final feature-batch desktop checks.
const {test,expect,_electron:electron}=require('@playwright/test'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),core=require('../src/core.cjs');
let app,page,dir;
test.beforeEach(async()=>{
 dir=await fs.mkdtemp(path.join(os.tmpdir(),'quiznet-history-ui-'));const d=core.emptyLibrary();
 for(const course of ['Robotics <sample>','University requirement'])core.importPacks(d,core.parseImport(JSON.stringify({course,unit:'Unit',title:course+' quiz',questions:[{prompt:'Is two even?',options:['Yes','No'],correctAnswer:0}]})));
 for(const c of d.courses){const q=c.units[0].quizzes[0];core.mutate(d,{type:'start',quizId:q.id});core.mutate(d,{type:'answer',questionId:q.questions[0].id,answer:0});core.mutate(d,{type:'finish'});}
 await fs.mkdir(path.join(dir,'data'));await fs.writeFile(path.join(dir,'data/library.json'),JSON.stringify(d));const env={...process.env,QUIZNET_TEST_DATA:dir};delete env.ELECTRON_RUN_AS_NODE;
 app=await electron.launch({args:[path.resolve(__dirname,'..')],env});page=await app.firstWindow();await page.getByRole('heading',{name:'Home',exact:true}).waitFor();
});
test.afterEach(async()=>{await app?.close();if(!path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep))throw new Error('Unexpected profile');await fs.rm(dir,{recursive:true,force:true});});
test('course focus settings and history dashboard scope, session links and compact layout',async()=>{
 await page.getByRole('button',{name:'Library',exact:true}).click();await page.locator('.course-row').filter({hasText:'Robotics <sample>'}).getByRole('button').click();
 await page.getByRole('button',{name:'Course actions',exact:true}).click();await page.getByRole('menuitem',{name:'Study focus…',exact:true}).click();await page.getByLabel('Importance to me',{exact:true}).selectOption('long-term');await page.getByRole('button',{name:'Save focus',exact:true}).click();await expect(page.locator('.course-focus-banner')).toContainText('Long-term focus');
 await page.getByRole('button',{name:'History',exact:true}).click();const file=path.join(dir,'data/library.json'),before=await fs.readFile(file,'utf8');
 await expect(page.locator('.history-metric').first()).toContainText('2');await page.getByRole('combobox',{name:'Course focus',exact:true}).selectOption('long-term');await expect(page.locator('.history-row')).toHaveCount(1);await expect(page.locator('.history-row')).toContainText('Robotics <sample>');
 const courseId=(await page.evaluate(()=>window.quiznet.get())).library.courses[0].id;await page.getByRole('combobox',{name:'Course',exact:true}).selectOption(courseId);await expect(page.getByRole('combobox',{name:'Unit',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'Quiz details',exact:true}).click();await expect(page.locator('.history-quiz-row')).toHaveCount(1);await page.getByRole('button',{name:'Sessions',exact:true}).click();await page.locator('.history-row').click();await expect(page.locator('.score-value')).toHaveText('100%');
 await page.getByRole('button',{name:'History',exact:true}).click();await page.getByRole('button',{name:'Clear filters',exact:true}).click();await expect(page.locator('.history-row')).toHaveCount(2);expect(await fs.readFile(file,'utf8')).toBe(before);
 await page.getByRole('button',{name:'Overview',exact:true}).click();const shots=path.resolve(__dirname,'../test-results/screenshots');await fs.mkdir(shots,{recursive:true});await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setBounds({width:1100,height:900}));await page.locator('#main').evaluate(el=>el.scrollTop=0);await page.screenshot({path:path.join(shots,'Quiznet-history-dashboard.png')});await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setBounds({width:760,height:560}));expect(await page.locator('#main').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
});
