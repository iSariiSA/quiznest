const {test,expect,_electron:electron}=require('@playwright/test');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const core=require('../src/core.cjs');
let app,page,directory;
test.beforeEach(async()=>{
  directory=await fs.mkdtemp(path.join(os.tmpdir(),'quiznet-saving-'));
  const data=core.emptyLibrary();core.importPacks(data,core.parseImport(JSON.stringify({title:'Save check',questions:[{prompt:'One plus one?',options:['Two','Three'],correctAnswer:0},{prompt:'Two plus two?',options:['Four','Five'],correctAnswer:0}]})));
  await fs.mkdir(path.join(directory,'data'));await fs.writeFile(path.join(directory,'data/library.json'),JSON.stringify(data));
  const env={...process.env,QUIZNET_TEST_DATA:directory};delete env.ELECTRON_RUN_AS_NODE;
  app=await electron.launch({executablePath:process.env.QUIZNET_ELECTRON_PATH||undefined,args:[path.resolve(__dirname,'..')],env});page=await app.firstWindow();
  await page.locator('.course-row button').click();await page.locator('[data-action="start"]').click();await page.getByRole('button',{name:'Start quiz',exact:true}).click();
  await expect(page.locator('.question-prompt')).toContainText('One plus one?');
});
test.afterEach(async()=>{
  await app?.close();
  const resolved=path.resolve(directory);if(!resolved.startsWith(path.resolve(os.tmpdir())+path.sep)||!path.basename(resolved).startsWith('quiznet-saving-'))throw new Error('Unexpected temporary data path.');
  await fs.rm(resolved,{recursive:true,force:true});
});
test('answer saves keep subsequent Next and Finish actions reliable on a slow disk',async()=>{
  await app.evaluate(()=>{const files=process.getBuiltinModule('fs/promises'),rename=files.rename;files.rename=async(...args)=>{await new Promise(resolve=>setTimeout(resolve,400));return rename(...args);};});
  await page.locator('[data-action="answer"][data-index="0"]').click();await page.getByRole('button',{name:'Next',exact:true}).click();
  await expect(page.locator('.question-prompt')).toContainText('Two plus two?');
  await page.locator('[data-action="answer"][data-index="0"]').click();await page.getByRole('button',{name:'Finish',exact:true}).click();
  await expect(page.locator('.score-value')).toHaveText('100%');
  const {library}=await page.evaluate(()=>window.quiznet.get());expect(library.activeSession).toBeNull();expect(library.attempts).toHaveLength(1);expect(library.attempts[0].answers).toEqual([0,0]);
});
test('a failed save leaves the answer editable and navigation usable for retry',async()=>{
  await app.evaluate(()=>{const files=process.getBuiltinModule('fs/promises'),rename=files.rename;let first=true;files.rename=async(...args)=>{if(first){first=false;throw new Error('Synthetic disk write failure');}return rename(...args);};});
  await page.locator('[data-action="answer"][data-index="0"]').click();await expect(page.locator('#toast')).toHaveText('Synthetic disk write failure');
  await expect(page.locator('[data-action="answer"][data-index="0"]')).toBeEnabled();await expect(page.getByRole('button',{name:'Next',exact:true})).toBeEnabled();
  const {library}=await page.evaluate(()=>window.quiznet.get());expect(library.activeSession.answers).toEqual({});
  await page.locator('[data-action="answer"][data-index="0"]').click();await page.getByRole('button',{name:'Next',exact:true}).click();
  await expect(page.locator('.question-prompt')).toContainText('Two plus two?');
});
