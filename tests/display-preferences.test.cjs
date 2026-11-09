const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {DisplayPreferences,defaults,validate}=require('../src/display-preferences.cjs');
async function cleanup(dir){if(!path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep)||!path.basename(dir).startsWith('quiznet-display-'))throw new Error('Unexpected test profile');await fs.rm(dir,{recursive:true,force:true});}
test('display preferences validate only shipped layouts and bounded scales',()=>{
 assert.deepEqual(validate(defaults()),defaults());
 for(const patch of [{libraryView:'html'},{interfaceScale:999},{interfaceScale:'115'},{rememberView:'yes'},{version:2}])assert.throws(()=>validate({...defaults(),...patch}),/valid display/);
 assert.equal(validate({...defaults(),rememberView:false,libraryView:'details'}).libraryView,'cards');
});
test('display changes serialize, restart independently of the library, and roll back failed writes',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'quiznet-display-'));t.after(()=>cleanup(dir));
 const prefs=new DisplayPreferences(dir);await prefs.load();assert.deepEqual(await fs.readdir(dir),[]);
 await Promise.all([prefs.change({libraryView:'names'}),prefs.change({interfaceScale:115})]);
 const saved=await fs.readFile(prefs.file,'utf8'),again=new DisplayPreferences(dir);await again.load();assert.equal(again.state.libraryView,'names');assert.equal(again.state.interfaceScale,115);
 await assert.rejects(prefs.change({source:'outside'}),/valid display/);await assert.rejects(prefs.change({libraryView:'other'}),/valid display/);
 await fs.mkdir(prefs.file+'.tmp');await assert.rejects(prefs.change({libraryView:'details'}));assert.equal(prefs.state.libraryView,'names');assert.equal(await fs.readFile(prefs.file,'utf8'),saved);await fs.rmdir(prefs.file+'.tmp');
 await prefs.change({rememberView:false});const forgotten=new DisplayPreferences(dir);await forgotten.load();assert.equal(forgotten.state.libraryView,'cards');assert.equal(forgotten.state.interfaceScale,115);
 assert.equal((await fs.readdir(dir)).includes('data'),false);
});
test('damaged display preferences are preserved before replacing them with a user choice',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'quiznet-display-'));t.after(()=>cleanup(dir));
 const prefs=new DisplayPreferences(dir);await fs.writeFile(prefs.file,'invalid JSON');await prefs.load();assert.match(prefs.warning,/preserved/);assert.equal(await fs.readFile(prefs.file,'utf8'),'invalid JSON');
 await prefs.change({libraryView:'details'});const backup=(await fs.readdir(dir)).find(f=>f.startsWith('display.json.damaged-'));assert.ok(backup);assert.equal(await fs.readFile(path.join(dir,backup),'utf8'),'invalid JSON');assert.equal(prefs.warning,'');
});
