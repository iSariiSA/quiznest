const {test,expect,_electron:electron}=require('@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const core=require('../src/core.cjs');
let app,page,directory,seed,clipboard;
const question={prompt:'Which value is even?',options:['2','3'],correctAnswer:0};
const shots=process.env.QUIZNET_SCREENSHOTS||path.resolve(__dirname,'../test-results/screenshots');
async function launch(){const env={...process.env,QUIZNET_TEST_DATA:directory};delete env.ELECTRON_RUN_AS_NODE;app=await electron.launch({executablePath:process.env.QUIZNET_ELECTRON_PATH||undefined,args:[path.resolve(__dirname,'..')],env});page=await app.firstWindow();await expect(page.locator('.brand')).toBeVisible();}
const library=()=>page.evaluate(async()=>(await window.quiznet.get()).library);
async function enterUnit(){await page.getByRole('button',{name:'Mathematics',exact:true}).click();await page.getByRole('button',{name:'Basics',exact:true}).click();}
async function chooseFile(){const file=path.join(directory,'returned.json');await fs.writeFile(file,JSON.stringify({course:'Wrong file course',unit:'Wrong file unit',title:'Returned quiz',questions:[question]}));await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},file);}
test.beforeEach(async()=>{
  directory=await fs.mkdtemp(path.join(os.tmpdir(),'quiznet-organization-'));await fs.mkdir(path.join(directory,'data'));await fs.mkdir(shots,{recursive:true});
  seed=core.emptyLibrary();core.importPacks(seed,core.parseImport(JSON.stringify({quizzes:[{course:'Mathematics',unit:'Basics',title:'Even values',questions:[question]},{course:'Physics',unit:'Motion',title:'Speed',questions:[question]}]})));
  await fs.writeFile(path.join(directory,'data/library.json'),JSON.stringify(seed,null,2));await launch();clipboard=await app.evaluate(({clipboard})=>clipboard.readText());
});
test.afterEach(async()=>{if(app){await app.evaluate(({clipboard},text)=>clipboard.writeText(text),clipboard||'');await app.close();}const resolved=path.resolve(directory);if(!resolved.startsWith(path.resolve(os.tmpdir())+path.sep)||!path.basename(resolved).startsWith('quiznet-organization-'))throw new Error('Unexpected test directory');await fs.rm(resolved,{recursive:true,force:true});});

test('manual creation chooses a new course or an existing course and new unit, without creating canceled folders',async()=>{
  const before=await fs.readFile(path.join(directory,'data/library.json'),'utf8');
  await page.getByRole('button',{name:'App menu'}).click();await page.getByRole('menuitem',{name:'New quiz…',exact:true}).click();await page.getByRole('button',{name:'Write manually',exact:true}).click();
  await page.getByLabel('New course name',{exact:true}).fill('Biology <lab>');await page.getByLabel('New unit name',{exact:true}).fill('Cells');await page.getByRole('button',{name:'Cancel',exact:true}).click();expect(await fs.readFile(path.join(directory,'data/library.json'),'utf8')).toBe(before);
  await enterUnit();await page.getByRole('button',{name:'New quiz',exact:true}).click();await page.getByRole('button',{name:'Write manually',exact:true}).click();
  await expect(page.getByLabel('Course',{exact:true})).toHaveValue(seed.courses[0].id);await expect(page.getByLabel('Unit',{exact:true})).toHaveValue(seed.courses[0].units[0].id);
  await page.getByLabel('Course',{exact:true}).selectOption('new');await page.getByLabel('New course name',{exact:true}).fill('Biology <lab>');await page.getByLabel('New unit name',{exact:true}).fill('Cells');
  await page.getByLabel('Quiz title',{exact:true}).fill('Cell basics');await page.locator('[data-editor=prompt]').fill('Where is DNA?');
  for(const [i,input] of (await page.locator('[data-editor=option]').all()).entries())await input.fill(['Nucleus','Ribosome','Membrane','Wall'][i]);
  // Rebuilding question controls must keep the destination draft.
  await page.getByLabel('Question format',{exact:true}).selectOption('markdown');await expect(page.getByLabel('New course name',{exact:true})).toHaveValue('Biology <lab>');
  await page.locator('.modal-body').evaluate(el=>el.scrollTop=0);await page.screenshot({path:path.join(shots,'Quiznet-quiz-destination.png')});await page.getByRole('button',{name:'Save quiz',exact:true}).click();await expect(page.locator('.quiz-row')).toContainText('Cell basics');
  let data=await library();const added=data.courses.find(c=>c.title==='Biology <lab>');expect(added.units[0].title).toBe('Cells');expect(data.courses).toHaveLength(3);
  await page.getByRole('button',{name:'New quiz',exact:true}).click();await page.getByRole('button',{name:'Write manually',exact:true}).click();await page.getByLabel('Course',{exact:true}).selectOption(seed.courses[1].id);await page.getByLabel('New unit name',{exact:true}).fill('Waves');
  await page.getByLabel('Quiz title',{exact:true}).fill('Wave basics');await page.locator('[data-editor=prompt]').fill(question.prompt);for(const [i,input] of (await page.locator('[data-editor=option]').all()).entries())await input.fill(`Choice ${i+1}`);
  await page.getByRole('button',{name:'Save quiz',exact:true}).click();await expect(page.locator('.quiz-row')).toContainText('Wave basics');data=await library();expect(data.courses.find(c=>c.id===seed.courses[1].id).units.map(u=>u.title)).toEqual(['Motion','Waves']);
});

test('move crosses courses, retains unfinished answers, and resumes after reopening',async()=>{
  await enterUnit();await page.getByRole('button',{name:'Start Even values',exact:true}).click();await page.getByRole('button',{name:'Start quiz',exact:true}).click();await page.locator('[data-action=answer][data-index="0"]').click();await page.getByRole('button',{name:'Exit',exact:true}).click();
  const before=await library(),quiz=before.courses[0].units[0].quizzes[0];
  await page.getByRole('button',{name:'Options for Even values',exact:true}).click();await page.getByRole('menuitem',{name:'Move…',exact:true}).click();await page.getByLabel('Course',{exact:true}).selectOption(seed.courses[1].id);await page.getByLabel('Unit',{exact:true}).selectOption(seed.courses[1].units[0].id);
  await page.getByRole('button',{name:'Cancel',exact:true}).click();expect(await library()).toEqual(before);
  await page.getByRole('button',{name:'Options for Even values',exact:true}).click();await page.getByRole('menuitem',{name:'Move…',exact:true}).click();await page.getByLabel('Course',{exact:true}).selectOption(seed.courses[1].id);await page.getByLabel('Unit',{exact:true}).selectOption(seed.courses[1].units[0].id);await page.screenshot({path:path.join(shots,'Quiznet-move-quiz.png')});await page.getByRole('button',{name:'Move quiz',exact:true}).click();
  await expect(page.locator('.quiz-row')).toContainText(['Speed','Even values']);const after=await library();expect(after.activeSession).toEqual(before.activeSession);expect(after.courses[0].units[0].quizzes).toHaveLength(0);expect(after.courses[1].units[0].quizzes[1]).toEqual(quiz);
  await app.close();await launch();await page.getByRole('button',{name:'Resume',exact:true}).click();await expect(page.locator('[data-action=answer][data-index="0"]')).toHaveAttribute('aria-pressed','true');await page.getByRole('button',{name:'Finish',exact:true}).click();await expect(page.locator('.score-value')).toHaveText('100%');expect((await library()).attempts[0].quizId).toBe(quiz.id);
});

test('agent instructions include the chosen destination and returned imports can create or override it',async()=>{
  const before=await fs.readFile(path.join(directory,'data/library.json'),'utf8');await enterUnit();await page.getByRole('button',{name:'Prepare a quiz',exact:true}).click();await expect(page.getByLabel('Course',{exact:true})).toHaveValue(seed.courses[0].id);await expect(page.getByLabel('Unit',{exact:true})).toHaveValue(seed.courses[0].units[0].id);
  await page.getByLabel('Course',{exact:true}).selectOption('new');await page.getByLabel('New course name',{exact:true}).fill('Biology <lab>');await page.getByLabel('Unit',{exact:true}).selectOption('new');await page.getByLabel('New unit name',{exact:true}).fill('Cells');
  await page.getByRole('button',{name:'Copy instructions',exact:true}).click();await expect(page.locator('#toast')).toHaveText('Instructions copied.');const markdown=await app.evaluate(({clipboard})=>clipboard.readText());expect(markdown).toContain('- Course name: "Biology <lab>"');expect(markdown).toContain('- Unit name: "Cells"');expect(await fs.readFile(path.join(directory,'data/library.json'),'utf8')).toBe(before);
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(760,560));await page.locator('#main').evaluate(el=>el.scrollTop=0);await page.screenshot({path:path.join(shots,'Quiznet-agent-destination.png')});expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  await chooseFile();await page.getByRole('button',{name:'Import quiz…',exact:true}).click();await expect(page.getByRole('dialog').getByLabel('New course name',{exact:true})).toHaveValue('Biology <lab>');await expect(page.getByRole('dialog').getByLabel('New unit name',{exact:true})).toHaveValue('Cells');await page.getByRole('button',{name:'Cancel',exact:true}).click();expect(await fs.readFile(path.join(directory,'data/library.json'),'utf8')).toBe(before);
  await page.getByRole('button',{name:'Import quiz…',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Import',exact:true}).click();await expect(page.locator('.quiz-row')).toContainText('Returned quiz');let data=await library();expect(data.courses.at(-1).title).toBe('Biology <lab>');expect(data.courses.at(-1).units[0].title).toBe('Cells');expect(data.courses).toHaveLength(3);
  // The preview remains editable even when a destination was prepared earlier.
  await page.getByRole('button',{name:'App menu'}).click();await page.getByRole('menuitem',{name:'Import…',exact:true}).click();await page.getByLabel('Course',{exact:true}).selectOption(seed.courses[1].id);await page.getByLabel('Unit',{exact:true}).selectOption('new');await page.getByLabel('New unit name',{exact:true}).fill('Waves');await page.getByRole('dialog').getByRole('button',{name:'Import',exact:true}).click();await expect(page.locator('.quiz-row')).toContainText('Returned quiz');data=await library();expect(data.courses[1].units.at(-1).title).toBe('Waves');
});
