const {command}=require('./ui-actions.cjs');
const {test,expect,_electron:electron}=require('@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const core=require('../src/core.cjs');
let app,page,directory,file,original;
test.beforeEach(async()=>{
  directory=await fs.mkdtemp(path.join(os.tmpdir(),'quiznet-header-'));
  await fs.mkdir(path.join(directory,'data'));
  const library=core.emptyLibrary();
  core.importPacks(library,core.parseImport(JSON.stringify({course:'Biology',unit:'Cells',title:'Cell practice',questions:[{prompt:'Where is the nucleus?',options:['Inside the cell','Outside the cell'],correctAnswer:0}]})));
  library.courses[0].units.push({id:'empty-unit',title:'<b>Unstarted unit</b>',quizzes:[]});
  file=path.join(directory,'data/library.json');original=JSON.stringify(library,null,2);await fs.writeFile(file,original);
  const env={...process.env,QUIZNET_TEST_DATA:directory};delete env.ELECTRON_RUN_AS_NODE;
  app=await electron.launch({args:[path.resolve(__dirname,'..')],env});page=await app.firstWindow();
  await expect(page.locator('.brand')).toBeVisible();
});
test.afterEach(async()=>{
  await app?.close();
  if(!path.resolve(directory).startsWith(path.resolve(os.tmpdir())+path.sep)||!path.basename(directory).startsWith('quiznet-header-'))throw new Error('Unexpected test directory');
  await fs.rm(directory,{recursive:true,force:true});
});
const searchButton=()=>page.getByRole('button',{name:'Search library',exact:true});
const searchInput=()=>page.getByRole('searchbox',{name:'Search your library',exact:true});
test('one library search finds courses, empty units and question text, with keyboard focus restored',async()=>{
  await expect(searchButton()).toHaveCount(1);await searchButton().click();await expect(searchInput()).toBeFocused();
  await searchInput().fill('bIoLoGy');await page.locator('.search-result[data-action="course"]').click();
  await expect(page.getByRole('heading',{name:'Biology',exact:true})).toBeVisible();await expect(searchButton()).toHaveCount(1);
  await searchButton().click();await searchInput().fill('unstarted');
  await expect(page.locator('.search-result')).toHaveCount(1);await expect(page.locator('.search-result b')).toHaveCount(0);
  await page.locator('.search-result').click();await expect(page.getByRole('heading',{name:'<b>Unstarted unit</b>',exact:true})).toBeVisible();
  await searchButton().focus();await page.keyboard.press('Control+k');await expect(searchInput()).toBeFocused();
  await searchInput().fill('no matching topic');await expect(page.getByRole('status').filter({hasText:'No matches.'})).toBeVisible();
  await page.keyboard.press('Escape');await expect(searchButton()).toBeFocused();
  await searchButton().click();await searchInput().fill('nucleus');await expect(page.locator('.search-result')).toHaveCount(1);
  await page.locator('.search-result').click();await expect(page.getByRole('dialog')).toHaveAccessibleName('Before you start');
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  expect(await fs.readFile(file,'utf8')).toBe(original);
});
test('named page actions stay separate from App, with correct destinations and compact layouts',async()=>{
  await page.getByRole('button',{name:'Library',exact:true}).click();
  await expect(page.getByRole('button',{name:'Library actions',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Add to library',exact:true})).toHaveCount(1);
  await page.locator('.course-row .row-link').click();
  const courseActions=page.getByRole('button',{name:'Course actions',exact:true});
  await courseActions.click();await page.getByRole('menuitem',{name:'Rename…',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveAccessibleName('Rename');await expect(page.getByRole('textbox')).toHaveValue('Biology');
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.locator('.unit-link').first().click();
  const unitActions=page.getByRole('button',{name:'Unit actions',exact:true});
  await unitActions.click();await expect(unitActions).toHaveAttribute('aria-expanded','true');
  await page.keyboard.press('Escape');await expect(unitActions).toBeFocused();
  await page.getByRole('button',{name:'New quiz',exact:true}).click();await page.getByRole('button',{name:'Write manually',exact:true}).click();
  await expect(page.getByLabel('Course',{exact:true}).locator('option:checked')).toHaveText('Biology');
  await expect(page.getByLabel('Unit',{exact:true}).locator('option:checked')).toHaveText('Cells');
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await command(page,'Prepare a quiz…');
  await expect(page.getByLabel('Unit',{exact:true}).locator('option:checked')).toHaveText('Cells');
  await page.getByRole('button',{name:'Library',exact:true}).click();
  // Long titles and hidden navigation must not push the global controls off-screen.
  await page.evaluate(()=>{data.courses[0].title='Long course title '.repeat(20);data.courses[0].units[0].title='Long unit title '.repeat(20);});
  await page.locator('.course-row .row-link').click();await page.locator('.unit-link').first().click();
  for(const width of [1440,760]){
    await app.evaluate(({BrowserWindow},width)=>BrowserWindow.getAllWindows()[0].setBounds({width,height:560}),width);
    await expect.poll(()=>page.evaluate(()=>innerWidth)).toBe(width);
    expect(await page.locator('#main').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
    await expect(searchButton()).toBeInViewport();await expect(page.getByRole('button',{name:'New quiz',exact:true})).toBeInViewport();
  }
  await page.locator('#navigation-toggle').click();await expect(page.locator('#sidebar')).toBeHidden();
  await expect(page.getByRole('button',{name:'App menu',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByRole('button',{name:'Help settings',exact:true}).click();await page.getByRole('button',{name:'Open help',exact:true}).click();await expect(page.getByRole('dialog')).toHaveAccessibleName('Help');
  await page.keyboard.press('Escape');await page.keyboard.press('Control+k');await expect(searchInput()).toBeFocused();
  expect(await fs.readFile(file,'utf8')).toBe(original);
});

test('browsing pages share one creation entry and Help belongs to Settings',async()=>{
  for(const name of ['Home','Library','Daily review','History','Settings','Explore']){
    await page.getByRole('button',{name,exact:true}).click();
    await expect(page.getByRole('button',{name:name==='Library'?'Add to library':'New quiz',exact:true})).toHaveCount(['Settings','Explore'].includes(name)?0:1);
    await expect(page.getByRole('button',{name:'Prepare a quiz',exact:true})).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Import quiz',exact:true})).toHaveCount(0);
    await expect(page.locator('[data-action="appMenu"]')).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Open help',exact:true})).toHaveCount(0);
    if(['Settings','Explore'].includes(name))continue;
    await command(page,'New quiz…');
    await expect(page.getByRole('dialog').getByRole('button').filter({hasText:/Write manually|Prepare with an agent|Import file/})).toHaveCount(3);
    await page.keyboard.press('Escape');
  }
  await page.getByRole('button',{name:'Home',exact:true}).click();await page.getByRole('button',{name:'Saved questions',exact:true}).click();
  await expect(page.locator('.breadcrumbs')).toContainText('Home');await expect(page.getByRole('button',{name:'New quiz',exact:true})).toHaveCount(1);
  await page.getByRole('button',{name:'Back to Home',exact:true}).click();
  await page.getByRole('button',{name:'Daily review',exact:true}).click();await page.getByRole('button',{name:'Mistake notebook',exact:true}).click();
  await expect(page.locator('.breadcrumbs')).toContainText('Mistake notebook');await expect(page.getByRole('button',{name:'New quiz',exact:true})).toHaveCount(1);
  await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'Help settings',exact:true}).click();await page.getByRole('button',{name:'Open help',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveAccessibleName('Help');await page.keyboard.press('Escape');
  await expect(page.getByRole('button',{name:'Open help',exact:true})).toBeFocused();
  expect(await fs.readFile(file,'utf8')).toBe(original);
});

test('study controls hide creation and keep discard local, cancellable and separate from Help',async()=>{
  await page.getByRole('button',{name:'Library',exact:true}).click();await page.locator('.course-row .row-link').click();
  await page.getByRole('button',{name:'Start Cell practice',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Start quiz',exact:true}).click();
  await expect(page.getByRole('button',{name:'New quiz',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Quiz actions',exact:true}).click();await page.getByRole('menuitem',{name:'Discard attempt…',exact:true}).click();
  await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(page.locator('.question-panel')).toBeVisible();
  await page.getByRole('button',{name:'Exit',exact:true}).click();
  await page.getByRole('button',{name:'Unfinished quiz actions',exact:true}).click();await expect(page.getByRole('menuitem',{name:'Discard attempt…',exact:true})).toBeVisible();
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'Resume',exact:true}).click();
  await expect(page.locator('.question-panel')).toBeVisible();await page.getByRole('button',{name:'Exit',exact:true}).click();
  await command(page,'Prepare a quiz…');await expect(page.getByRole('button',{name:'New quiz',exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Import quiz…',exact:true})).toHaveCount(1);
});
