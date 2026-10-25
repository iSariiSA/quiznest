const {test,expect,_electron:electron}=require('@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const example=require('../examples/math-diagrams.json');
let app,page,directory;
async function launch(){const env={...process.env,QUIZNET_TEST_DATA:directory};delete env.ELECTRON_RUN_AS_NODE;app=await electron.launch({args:[path.resolve(__dirname,'..')],env});page=await app.firstWindow();await expect(page.locator('.brand')).toBeVisible();}
test.beforeEach(async()=>{directory=await fs.mkdtemp(path.join(os.tmpdir(),'quiznet-math-'));await launch();});
test.afterEach(async()=>{await app?.close();const resolved=path.resolve(directory);if(!resolved.startsWith(path.resolve(os.tmpdir())+path.sep)||!path.basename(resolved).startsWith('quiznet-math-'))throw new Error('Unexpected test directory');await fs.rm(resolved,{recursive:true,force:true});});
async function menu(item){await page.getByRole('button',{name:'App menu'}).click();await page.getByRole('menuitem',{name:item,exact:true}).click();}
async function pick(file){await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},file);}
async function save(file){await app.evaluate(({dialog},file)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:file});},file);}
async function imageLoaded(locator){await expect.poll(()=>locator.evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);}

test('math and diagrams stay offline through preview, export, resume, results and backup restore',async()=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const library=path.join(directory,'data/library.json'),before=await fs.readFile(library,'utf8');
  await pick(path.resolve(__dirname,'../examples/math-diagrams.json'));await menu('Import…');
  await expect(page.locator('.import-question-prompt .katex')).toHaveCount(1);await expect(page.locator('.import-question-choices .katex')).toHaveCount(4);await imageLoaded(page.locator('.import-question-card .question-image'));
  await expect(page.locator('.import-correct-label, .import-question-card .explanation')).toHaveCount(0);
  await page.getByRole('button',{name:'Show correct answer',exact:true}).click();await expect(page.locator('.import-question-card .explanation .katex')).toHaveCount(1);await imageLoaded(page.locator('.import-question-card .explanation img'));
  await page.getByRole('button',{name:'Next question',exact:true}).click();await expect(page.locator('.import-question-prompt mtable')).toHaveCount(1);await expect(page.locator('.import-question-card .explanation')).toHaveCount(0);
  await page.getByLabel('Question number',{exact:true}).fill('3');await page.getByLabel('Question number',{exact:true}).press('Tab');await expect(page.locator('.import-question-prompt .katex')).toHaveCount(1);expect(await fs.readFile(library,'utf8')).toBe(before);
  await page.getByRole('dialog').getByRole('button',{name:'Import',exact:true}).click();await expect(page.locator('#toast')).toContainText('Imported.');
  await page.locator('.course-row').filter({hasText:'Mathematics'}).getByRole('button').click();
  const exported=path.join(directory,'math-export.json');await save(exported);await page.getByRole('button',{name:'Options for Math & diagrams',exact:true}).click();await page.getByRole('menuitem',{name:'Export…',exact:true}).click();await expect(page.locator('#toast')).toContainText('Exported');
  const pack=JSON.parse(await fs.readFile(exported,'utf8'));for(const [i,q] of pack.questions.entries()){expect(q.prompt).toBe(example.questions[i].prompt);expect(q.explanation).toBe(example.questions[i].explanation);expect(q.image).toBe(example.questions[i].image);}
  await page.getByRole('button',{name:'Start Math & diagrams',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Start quiz',exact:true}).click();await imageLoaded(page.locator('.question-image'));await expect(page.locator('.answer-option .katex')).toHaveCount(4);
  await page.evaluate(()=>document.fonts.ready);expect(await page.evaluate(()=>[...document.fonts].some(f=>f.family==='KaTeX_Main'&&f.status==='loaded'))).toBe(true);
  expect(await page.locator('.answer-option .math-inline').evaluateAll(nodes=>nodes.every(el=>el.scrollWidth<=el.clientWidth+1&&el.scrollHeight<=el.clientHeight+1))).toBe(true);
  await fs.mkdir(path.resolve(__dirname,'../outputs'),{recursive:true});await expect(page.locator('#toast')).not.toHaveClass(/visible/);await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setBounds({width:1100,height:960}));await page.screenshot({path:path.resolve(__dirname,'../outputs/Math-and-diagrams.png')});
  await page.locator('[data-action="answer"][data-index="0"]').click();await page.getByRole('button',{name:'Exit',exact:true}).click();await app.close();await launch();await page.getByRole('button',{name:'Resume',exact:true}).click();await imageLoaded(page.locator('.question-image'));await expect(page.locator('.answer-option.chosen')).toHaveCount(1);
  for(let i=0;i<2;i++){await page.getByRole('button',{name:'Next',exact:true}).click();await expect(page.locator('.question-prompt')).toContainText(i===0?'Find the determinant':'Evaluate the definite integral');await expect(page.locator('#main')).not.toHaveAttribute('aria-busy','true');if(i===0)await page.screenshot({path:path.resolve(__dirname,'../outputs/Math-formulas.png')});expect(await page.locator('.answer-option .math-inline').evaluateAll(nodes=>nodes.every(el=>el.scrollWidth<=el.clientWidth+1&&el.scrollHeight<=el.clientHeight+1))).toBe(true);await page.locator('[data-action="answer"][data-index="0"]').click();}
  await page.getByRole('button',{name:'Finish',exact:true}).click();await expect(page.locator('.score-value')).toHaveText('100%');await expect(page.locator('.review-list .katex')).toHaveCount(11);await imageLoaded(page.locator('.review-list .explanation img'));
  const backup=path.join(directory,'math-backup.json');await menu('Settings');await save(backup);await page.getByRole('button',{name:'Save backup',exact:true}).click();await expect(page.locator('#toast')).toContainText('Backup saved');await pick(backup);await page.getByRole('button',{name:'Restore',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Restore',exact:true}).click();await page.getByRole('button',{name:'History',exact:true}).click();await page.locator('.history-row').first().click();await imageLoaded(page.locator('.review-list .explanation img'));
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setBounds({width:760,height:560}));expect(await page.locator('#main').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);expect(errors).toEqual([]);
});

test('math rendering does not activate HTML, remote resources, controls or code, and invalid formulas remain readable',async()=>{
  const result=await page.evaluate(()=>{
    const c=window.QuiznetContent,box=document.createElement('div');box.id='math-safety-test';
    const source=String.raw`$\includegraphics{https://example.com/tracker.png}$ $\href{javascript:alert(1)}{link}$ $\htmlClass{answer-option chosen}{x}$ $\frac{1}{$`;
    box.innerHTML=c.render(source,'markdown')+c.render('<span class="math-expression" data-math-source="fake" data-quiznet-math="0"><svg onload="alert(1)"></svg><math>fake</math></span>','html');document.body.append(box);
    return {plain:c.plain(String.raw`A $\frac{1}{2}$ value.`,'markdown'),code:c.render('```python\nprint("$x$")\n```','markdown'),literal:c.render('$x$','text'),html:c.render('<p>$x$</p>','html')};
  });
  await expect(page.locator('#math-safety-test .math-fallback')).toHaveCount(1);await expect(page.locator('#math-safety-test img, #math-safety-test a, #math-safety-test script, #math-safety-test button, #math-safety-test [data-action], #math-safety-test [onload], #math-safety-test .chosen')).toHaveCount(0);
  expect(result.plain).toBe(String.raw`A \frac{1}{2} value.\n`.replace(/\\n$/,'\n'));expect(result.code).not.toContain('math-expression');expect(result.literal).toBe('$x$');expect(result.html).not.toContain('katex');
  expect(await page.evaluate(async()=>{try{await fetch('https://example.com');return false;}catch{return true;}})).toBe(true);
  await page.locator('#math-safety-test').evaluate(el=>el.remove());
});

test('manual authoring previews formulas and attached diagrams before saving',async()=>{
  await page.locator('.course-row').filter({hasText:'Mathematics'}).getByRole('button').click();await page.getByRole('button',{name:/Manage/}).first().click();await page.getByRole('menuitem',{name:'New quiz…',exact:true}).click();await page.getByRole('button',{name:'Write manually',exact:true}).click();
  await page.getByLabel('Quiz title').fill('Manual math');const section=page.locator('.editor-question');await section.getByLabel('Question format',{exact:true}).selectOption('markdown');await section.locator('[data-editor="prompt"]').fill('Find $c$ in the triangle.');await section.locator('[data-editor="option"][data-option="0"]').fill('$5$');await section.locator('[data-editor="option"][data-option="1"]').fill('$7$');await section.locator('[data-editor="explanation"]').fill('$$c^2=25$$');
  const png=path.join(directory,'triangle.png');await fs.writeFile(png,Buffer.from(example.questions[0].image.split(',')[1],'base64'));await pick(png);await section.getByRole('button',{name:'Add image',exact:true}).click();await section.locator('.editor-preview summary').click();await expect(section.locator('.preview-content .katex')).toHaveCount(4);await imageLoaded(section.locator('.preview-content img'));await page.getByRole('button',{name:'Save quiz',exact:true}).click();await expect(page.locator('#toast')).toContainText('Saved.');
});
