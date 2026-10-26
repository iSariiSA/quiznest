const {test,expect,_electron:electron}=require('@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const core=require('../src/core.cjs');
let app,page,directory;
test.beforeEach(async()=>{
  directory=await fs.mkdtemp(path.join(os.tmpdir(),'quiznet-stability-'));
  const data=core.emptyLibrary();core.importPacks(data,core.parseImport(JSON.stringify({title:'Stability quiz',questions:[{prompt:'Is two even?',options:['Yes','No'],correctAnswer:0}]})));
  await fs.mkdir(path.join(directory,'data'));await fs.writeFile(path.join(directory,'data/library.json'),JSON.stringify(data));
  const env={...process.env,QUIZNET_TEST_DATA:directory};delete env.ELECTRON_RUN_AS_NODE;
  app=await electron.launch({args:[path.resolve(__dirname,'..')],env});page=await app.firstWindow();
  await page.locator('.course-row button').click();await page.locator('[data-action=start]').click();await page.getByRole('button',{name:'Start quiz',exact:true}).click();
  await page.locator('[data-action=answer][data-index="0"]').click();
  await expect(page.locator('[data-action=answer][data-index="0"]')).toHaveAttribute('aria-pressed','true');
});
test.afterEach(async()=>{
  await app?.close();const resolved=path.resolve(directory);if(!resolved.startsWith(path.resolve(os.tmpdir())+path.sep)||!path.basename(resolved).startsWith('quiznet-stability-'))throw new Error('Unexpected test directory');await fs.rm(resolved,{recursive:true,force:true});
});
test('a failed close-time save keeps the window alive and allows retry',async()=>{
  await app.evaluate(({dialog})=>{globalThis.closeErrors=[];dialog.showMessageBox=async(_window,options)=>{globalThis.closeErrors.push((options||_window).message);return {response:0};};const files=process.getBuiltinModule('fs/promises'),rename=files.rename;let first=true;files.rename=async(...args)=>{if(first){first=false;const error=new Error('Synthetic full disk');error.code='ENOSPC';throw error;}return rename(...args);};});
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].close());
  await expect.poll(()=>app.evaluate(()=>globalThis.closeErrors.length)).toBe(1);
  expect(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().length)).toBe(1);
  await expect(page.locator('[data-action=answer][data-index="0"]')).toHaveAttribute('aria-pressed','true');
  const closed=app.waitForEvent('close');await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].close()).catch(()=>{});await closed;app=null;
  const saved=JSON.parse(await fs.readFile(path.join(directory,'data/library.json'),'utf8'));expect(saved.activeSession.answers[saved.activeSession.questionIds[0]]).toBe(0);expect(saved.activeSession.timing.runningSince).toBeNull();
});
test('a crashed display can reopen and resume saved answers without restarting the app',async()=>{
  await app.evaluate(({dialog,BrowserWindow})=>{dialog.showMessageBox=async()=>({response:0});globalThis.displayReloaded=false;BrowserWindow.getAllWindows()[0].webContents.once('did-finish-load',()=>globalThis.displayReloaded=true);});
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.forcefullyCrashRenderer());
  await expect.poll(()=>app.evaluate(()=>globalThis.displayReloaded)).toBe(true);
  // A renderer crash invalidates Playwright's old Page target; inspect the reopened
  // display through its surviving Electron webContents instead.
  const display=script=>app.evaluate(({BrowserWindow},script)=>BrowserWindow.getAllWindows()[0].webContents.executeJavaScript(script),script);
  await expect.poll(()=>display('document.querySelector("#toast")?.textContent')).toContain('reopened after a display problem');
  expect(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().length)).toBe(1);
  const paused=await display('(async()=>(await window.quiznet.get()).library.activeSession)()');expect(paused.timing.runningSince).toBeNull();
  await display('document.querySelector("[data-action=resume]").click()');
  await expect.poll(()=>display('document.querySelector("[data-action=answer][data-index=\\"0\\"]")?.getAttribute("aria-pressed")')).toBe('true');
  await display('document.querySelector("[data-action=finish]").click()');await expect.poll(()=>display('document.querySelector(".score-value")?.textContent')).toBe('100%');
});
test('failed background checkpoints are reported while answers and the app remain usable',async()=>{
  await app.evaluate(()=>{const files=process.getBuiltinModule('fs/promises'),rename=files.rename;let first=true;files.rename=async(...args)=>{if(first){first=false;const error=new Error('Synthetic checkpoint disk failure');error.code='ENOSPC';throw error;}return rename(...args);};});
  await expect(page.locator('#toast')).toContainText('Autosave could not complete',{timeout:20000});
  await expect(page.locator('[data-action=answer][data-index="0"]')).toHaveAttribute('aria-pressed','true');await page.getByRole('button',{name:'Exit',exact:true}).click();await expect(page.getByRole('button',{name:'Resume',exact:true})).toBeVisible();
  const saved=JSON.parse(await fs.readFile(path.join(directory,'data/library.json'),'utf8'));expect(saved.activeSession.timing.runningSince).toBeNull();expect(saved.activeSession.answers[saved.activeSession.questionIds[0]]).toBe(0);
});
test('10,000-question quizzes can be edited, reviewed, navigated, saved and resumed in the real desktop app',async()=>{
  test.setTimeout(90000);await app.close();
  const data=core.emptyLibrary();core.importPacks(data,core.parseImport(JSON.stringify({title:'Large desktop quiz',questions:Array.from({length:10000},(_,i)=>({prompt:`Question ${i+1}: is two even?`,options:['Yes','No'],correctAnswer:0,explanation:'Two is divisible by two.'}))})));
  const quiz=data.courses[0].units[0].quizzes[0];core.mutate(data,{type:'start',quizId:quiz.id});for(const q of quiz.questions)data.activeSession.answers[q.id]=0;core.mutate(data,{type:'finish'});
  quiz.questions[9999].code='\nprint(2)\n';quiz.questions[9999].codeLanguage='python';
  await fs.writeFile(path.join(directory,'data/library.json'),JSON.stringify(data));
  const launch=async()=>{const env={...process.env,QUIZNET_TEST_DATA:directory};delete env.ELECTRON_RUN_AS_NODE;app=await electron.launch({args:[path.resolve(__dirname,'..')],env});page=await app.firstWindow();await expect(page.locator('.brand')).toBeVisible();};
  await launch();const failures=[];page.on('pageerror',error=>failures.push(error.message));
  await page.getByRole('button',{name:'History',exact:true}).click();await page.locator('.history-row').click();await expect(page.locator('.review-card')).toHaveCount(50);await page.getByLabel('Review questions',{exact:true}).selectOption('199');await expect(page.locator('.review-card').last()).toContainText('Question 10000:');
  await page.getByRole('button',{name:'Library',exact:true}).first().click();await page.locator('.course-row button').click();
  await page.getByRole('button',{name:'Options for Large desktop quiz',exact:true}).click();await page.getByRole('menuitem',{name:'Edit…',exact:true}).click();await expect(page.locator('.editor-question')).toHaveCount(25);await page.getByLabel('Edit questions',{exact:true}).selectOption('399');await expect(page.locator('.editor-question').last()).toContainText('QUESTION 10000');
  await expect(page.locator('[data-editor=code]')).toHaveValue('\nprint(2)\n');await page.locator('[data-editor=prompt][data-index="9999"]').fill('Question 10000: is two still even?');await page.getByLabel('Edit questions',{exact:true}).selectOption('0');await page.getByLabel('Edit questions',{exact:true}).selectOption('399');await expect(page.locator('[data-editor=prompt][data-index="9999"]')).toHaveValue('Question 10000: is two still even?');
  const originalFile=await fs.readFile(path.join(directory,'data/library.json'),'utf8');await page.getByLabel('Edit questions',{exact:true}).selectOption('1');await page.locator('[data-editor=prompt][data-index="25"]').fill('');await page.getByLabel('Edit questions',{exact:true}).selectOption('0');await page.getByRole('button',{name:'Save quiz',exact:true}).click();await expect(page.locator('.form-error')).toContainText('Question 26');await expect(page.getByLabel('Edit questions',{exact:true})).toHaveValue('1');expect(await fs.readFile(path.join(directory,'data/library.json'),'utf8')).toBe(originalFile);await page.locator('[data-editor=prompt][data-index="25"]').fill('Question 26: is two even?');await page.getByLabel('Edit questions',{exact:true}).selectOption('399');
  const shots=path.resolve(__dirname,'../test-results/screenshots');await fs.mkdir(shots,{recursive:true});await page.locator('.modal-body').evaluate(el=>el.scrollTop=0);await page.screenshot({path:path.join(shots,'Quiznet-large-quiz-editor.png')});
  await page.getByRole('button',{name:'Save quiz',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);expect((await page.evaluate(async()=>(await window.quiznet.get()).library)).courses[0].units[0].quizzes[0].questions).toHaveLength(10000);
  await page.getByRole('button',{name:'Start Large desktop quiz',exact:true}).click();await page.getByRole('button',{name:'Start quiz',exact:true}).click();
  await expect(page.locator('.question-square')).toHaveCount(100);await page.getByLabel('Go to question',{exact:true}).selectOption('9999');await expect(page.locator('.question-prompt')).toContainText('Question 10000:');
  await page.locator('[data-action=answer][data-index="0"]').click();await expect(page.locator('[data-action=answer][data-index="0"]')).toHaveAttribute('aria-pressed','true');
  await app.close();await launch();await page.getByRole('button',{name:'Resume',exact:true}).click();await expect(page.getByLabel('Go to question',{exact:true})).toHaveValue('9999');await expect(page.locator('[data-action=answer][data-index="0"]')).toHaveAttribute('aria-pressed','true');expect(failures).toEqual([]);
});
