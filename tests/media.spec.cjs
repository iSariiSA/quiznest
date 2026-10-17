const {test,expect,_electron:electron}=require('@playwright/test');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const example=require('../examples/images-html.json');
let app,page,directory;
async function launch() {
  const env={...process.env,QUIZNET_TEST_DATA:directory};delete env.ELECTRON_RUN_AS_NODE;
  app=await electron.launch({executablePath:process.env.QUIZNET_ELECTRON_PATH||undefined,args:[path.resolve(__dirname,'..')],env});
  page=await app.firstWindow();await expect(page.locator('.brand')).toBeVisible();
}
async function openMenu(item) { await page.getByRole('button',{name:'App menu'}).click();await page.getByRole('menuitem',{name:item,exact:true}).click(); }
async function pick(file) { await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},file); }
async function saveTo(file) { await app.evaluate(({dialog},file)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:file});},file); }
async function loadedImage(locator) { await expect.poll(()=>locator.evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true); }
test.beforeAll(async()=>{directory=await fs.mkdtemp(path.join(os.tmpdir(),'quiznet-media-'));await launch();});
test.afterAll(async()=>{await app?.close();await fs.rm(directory,{recursive:true,force:true});});

test('editor images and HTML survive export, import, restart, review and backup',async()=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const picture=path.join(directory,'cell.png');await fs.writeFile(picture,Buffer.from(example.questions[0].image.split(',')[1],'base64'));
  await page.locator('.course-row').filter({hasText:'Biology'}).getByRole('button').click();
  await page.getByRole('button',{name:'Manage Unit 1: Cells'}).click();await page.getByRole('menuitem',{name:'New quiz…',exact:true}).click();
  await page.getByLabel('Quiz title').fill('Cell image');
  await page.getByRole('checkbox',{name:'HTML',exact:true}).check();
  await page.locator('[data-editor="prompt"]').fill(example.questions[0].prompt);
  while(await page.locator('[data-editor="option"]').count()<example.questions[0].options.length) await page.getByRole('button',{name:'Add option',exact:true}).click();
  for (const [i,option] of example.questions[0].options.entries()) await page.locator(`[data-editor="option"][data-option="${i}"]`).fill(option);
  await page.locator('[data-editor="explanation"]').fill(example.questions[0].explanation);
  await pick(picture);await page.getByRole('button',{name:'Add image',exact:true}).click();
  await loadedImage(page.locator('.editor-image img'));
  await page.getByLabel('Image description').fill('Arrow A points to the nucleus.');
  await page.getByRole('button',{name:'Remove image from question 1'}).click();await expect(page.locator('.editor-image img')).toHaveCount(0);
  await page.getByRole('button',{name:'Add image',exact:true}).click();await loadedImage(page.locator('.editor-image img'));
  await page.getByLabel('Image description').fill('Arrow A points to the nucleus.');
  // A cancelled replacement keeps the attached image and typed content.
  await app.evaluate(({dialog})=>{dialog.showOpenDialog=async()=>({canceled:true,filePaths:[]});});
  await page.getByRole('button',{name:'Replace image',exact:true}).click();await expect(page.locator('.editor-image img')).toHaveCount(1);
  await page.locator('.editor-preview summary').click();
  await expect(page.locator('.preview-prompt strong')).toHaveText('organelle marked A');
  await loadedImage(page.locator('.preview-prompt img'));
  await page.getByRole('button',{name:'Save quiz',exact:true}).click();
  const exported=path.join(directory,'media.json');await saveTo(exported);
  await page.getByRole('button',{name:'Options for Cell image'}).click();await page.getByRole('menuitem',{name:'Export…',exact:true}).click();
  await expect(page.locator('#toast')).toContainText('Exported');
  const saved=JSON.parse(await fs.readFile(exported,'utf8'));
  expect(saved.questions[0].image).toBe(example.questions[0].image);expect(saved.questions[0].format).toBe('html');
  expect(JSON.stringify(saved)).not.toContain(directory);
  // Move the export and remove its original selected file: no filesystem link remains.
  const moved=path.join(directory,'moved.json');await fs.rename(exported,moved);await fs.unlink(picture);
  await pick(moved);await openMenu('Import…');await page.locator('#import-target').selectOption('');await page.getByRole('button',{name:'Import',exact:true}).click();
  await page.locator('.course-row').filter({hasText:'Biology'}).getByRole('button').click();
  await page.getByRole('button',{name:'Start Cell image',exact:true}).click();
  await expect(page.locator('.question-prompt strong')).toHaveText('organelle marked A');await loadedImage(page.locator('.question-prompt img'));
  await expect(page.locator('.answer-option').first().locator('strong')).toHaveText('Nucleus');
  await page.locator('[data-action="answer"][data-index="0"]').click();
  await page.getByRole('button',{name:'Exit',exact:true}).click();await app.close();await launch();
  await page.getByRole('button',{name:'Resume',exact:true}).click();await loadedImage(page.locator('.question-prompt img'));
  await expect(page.locator('.answer-option.chosen')).toHaveCount(1);await page.getByRole('button',{name:'Finish',exact:true}).click();
  await expect(page.locator('.score-value')).toHaveText('100%');await loadedImage(page.locator('.review-question img'));
  await expect(page.locator('.explanation li')).toHaveCount(2);
  const screenshots=process.env.QUIZNET_SCREENSHOTS||path.resolve(__dirname,'../test-results/screenshots');await fs.mkdir(screenshots,{recursive:true});
  await page.screenshot({path:path.join(screenshots,'Quiznet-images-html-review.png')});
  const backup=path.join(directory,'backup.json');await saveTo(backup);await openMenu('Settings');
  await page.getByRole('button',{name:'Save backup',exact:true}).click();await expect(page.locator('#toast')).toContainText('Backup saved');
  const library=JSON.parse(await fs.readFile(backup,'utf8'));expect(library.attempts[0].questions[0].image).toBe(example.questions[0].image);
  await pick(backup);await page.getByRole('button',{name:'Restore',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Restore',exact:true}).click();
  await page.getByRole('button',{name:'History',exact:true}).click();await page.locator('.history-row').first().click();await loadedImage(page.locator('.review-question img'));
  expect(errors).toEqual([]);
});

test('HTML rendering strips active content, event attributes, actions and nonlocal images',async()=>{
  const result=await page.evaluate(image=>{
    window.__executed=false;
    const source=`<p id="modal-form" class="evil" data-action="delete" onclick="window.__executed=true">Safe <b>bold</b></p><script>window.__executed=true</script><style>body{display:none}</style><iframe srcdoc="bad"></iframe><svg><script>bad</script></svg><math><mtext>bad</mtext></math><form><button data-action="delete">Delete</button></form><a href="https://example.com">Link text</a><img src="https://example.com/a.png" onerror="window.__executed=true"><img src="file:///C:/private.png"><img src="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="><img src="${image}" alt="Cell" onload="window.__executed=true"><table><tr><td colspan="2">Cell</td></tr></table>`;
    const target=document.createElement('div');target.id='sanitizer-test';target.innerHTML=window.QuiznetContent.sanitize(source);document.body.append(target);
    return {html:target.innerHTML,text:target.textContent,plain:window.QuiznetContent.render('<b>Literal</b>','text')};
  },example.questions[0].image);
  const target=page.locator('#sanitizer-test');
  await expect(target.locator('script,style,iframe,svg,math,form,button,a,[onclick],[onload],[onerror],[data-action],.evil')).toHaveCount(0);
  await expect(target.locator('img')).toHaveCount(1);await loadedImage(target.locator('img'));
  expect(result.text).toContain('Safe bold');expect(result.text).toContain('Link text');expect(result.plain).toBe('&lt;b&gt;Literal&lt;/b&gt;');
  expect(await page.evaluate(()=>window.__executed)).toBe(false);
  await target.evaluate(el=>el.remove());
  // Malformed nesting must still produce only the allowed reconstructed elements.
  for(const source of ['<svg><foreignObject><p onmouseover="bad()">X</p></foreignObject></svg>', '<math><mtext><table><mglyph><style><!--</style><img src=x onerror=bad()>', '<p><span data-action="finish"><img src=x onerror=bad()></span></p>', '<template><img src=x onerror=bad()></template><b>Visible</b>']) {
    const html=await page.evaluate(source=>window.QuiznetContent.sanitize(source),source);
    expect(html).not.toMatch(/onerror|onmouseover|data-action|<svg|<math|<style|<template|src="x"/);
  }
});

test('rejects invalid image files and supports HTML imports without widening network access',async()=>{
  for (const [type,data] of Object.entries(require('./fixtures/image-types.json'))) {
    const file=path.join(directory,'raster.'+type);await fs.writeFile(file,Buffer.from(data.split(',')[1],'base64'));await pick(file);
    const selected=await page.evaluate(()=>window.quiznet.selectImage());expect(selected.image).toBe(data);
    expect(await page.evaluate(async data=>{const image=new Image();image.src=data;await image.decode();return image.naturalWidth;},data)).toBe(16);
  }
  const bad=path.join(directory,'bad.png');await fs.writeFile(bad,'This is not an image.');await pick(bad);
  await expect(page.evaluate(()=>window.quiznet.selectImage())).rejects.toThrow(/PNG/);
  const huge=path.join(directory,'huge.png');await fs.writeFile(huge,Buffer.alloc(2*1024*1024+1));await pick(huge);
  await expect(page.evaluate(()=>window.quiznet.selectImage())).rejects.toThrow(/2 MB/);
  const exampleFile=path.resolve(__dirname,'../examples/images-html.json');await pick(exampleFile);await openMenu('Import…');
  await page.getByRole('button',{name:'Import',exact:true}).click();
  await page.locator('.course-row').filter({hasText:'Biology'}).getByRole('button').click();await page.getByRole('button',{name:'Start Images & HTML',exact:true}).click();
  await loadedImage(page.locator('.question-prompt img'));await page.getByRole('button',{name:'Next',exact:true}).click();
  await expect(page.locator('.question-prompt table td')).toHaveCount(2);await expect(page.locator('.answer-option sub')).toHaveCount(3);
  expect(await page.evaluate(async()=>{try{await fetch('https://example.com');return false;}catch{return true;}})).toBe(true);
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setBounds({width:760,height:560}));
  await page.waitForFunction(()=>innerWidth===760&&innerHeight===560);
  expect(await page.evaluate(()=>document.querySelector('#main').scrollWidth<=document.querySelector('#main').clientWidth)).toBe(true);
});

test('full image backups larger than the quiz-import limit remain restorable',async()=>{
  const {library}=await page.evaluate(()=>window.quiznet.get());
  const original=library.attempts[0];expect(original).toBeTruthy();
  const pixels=Buffer.from(example.questions[0].image.split(',')[1],'base64');
  const embedded='data:image/png;base64,'+Buffer.concat([pixels,Buffer.alloc(900*1024)]).toString('base64');
  library.attempts=Array.from({length:18},()=>{
    const attempt=structuredClone(original);attempt.id=require('node:crypto').randomUUID();attempt.questions[0].image=embedded;return attempt;
  });
  const backup=path.join(directory,'large-media-backup.json');await fs.writeFile(backup,JSON.stringify(library));
  expect((await fs.stat(backup)).size).toBeGreaterThan(20*1024*1024);
  await pick(backup);await openMenu('Settings');await page.getByRole('button',{name:'Restore',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Restore',exact:true}).click();
  await expect(page.locator('.course-row')).toHaveCount(3);
  const restored=JSON.parse(await fs.readFile(path.join(directory,'data/library.json'),'utf8'));
  expect(restored.attempts).toHaveLength(18);expect(restored.attempts[0].questions[0].image).toBe(embedded);
  const roundTrip=path.join(directory,'large-round-trip.json');await saveTo(roundTrip);await openMenu('Settings');
  await page.getByRole('button',{name:'Save backup',exact:true}).click();await expect(page.locator('#toast')).toContainText('Backup saved');
  expect((await fs.stat(roundTrip)).size).toBeGreaterThan(20*1024*1024);
  await pick(roundTrip);await page.getByRole('button',{name:'Restore',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Restore',exact:true}).click();
  await expect(page.locator('.course-row')).toHaveCount(3);
});
