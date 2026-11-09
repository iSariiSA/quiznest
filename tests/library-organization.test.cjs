const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const core=require('../src/core.cjs'),org=require('../src/library-organization.cjs'),{Store}=require('../src/store.cjs');
const style={icon:'robot',iconColor:'#abcdef',nameColor:'#bfd5aa'};
function fixture(){const d=core.emptyLibrary();for(const course of ['Python','Robotics','University'])core.importPacks(d,core.parseImport(JSON.stringify({course,unit:'Basics',title:'Practice',questions:[{prompt:'Is two even?',options:['Yes','No'],correctAnswer:0}]})));const quiz=d.courses[0].units[0].quizzes[0];core.mutate(d,{type:'start',quizId:quiz.id});core.mutate(d,{type:'answer',questionId:quiz.questions[0].id,answer:0});return d;}
test('legacy libraries stay unchanged; course colors/icons, collections and deletion retain study IDs and progress',()=>{
 const d=fixture();assert.deepEqual(core.validateLibrary(d),d);const original=structuredClone(d);core.mutate(d,{type:'collectionCreate',title:'AI & Robotics',appearance:{...style,icon:'folder'}});const group=d.collections[0];
 core.mutate(d,{type:'courseCustomize',courseId:d.courses[0].id,collectionId:group.id,appearance:style});assert.deepEqual(core.validateLibrary(d),d);assert.equal(d.courses[0].id,original.courses[0].id);assert.deepEqual(d.activeSession,original.activeSession);assert.deepEqual(d.courses[0].units,original.courses[0].units);
 core.mutate(d,{type:'collectionDelete',collectionId:group.id});assert.equal(d.courses[0].collectionId,undefined);assert.equal(d.courses.length,3);assert.deepEqual(d.activeSession,original.activeSession);assert.deepEqual(core.validateLibrary(d),d);
});
test('pinning, collection moves and manual ordering are stable and isolated from other groups',()=>{
 const d=fixture(),[a,b,c]=d.courses;core.mutate(d,{type:'collectionCreate',title:'Interest'});const g=d.collections[0];core.mutate(d,{type:'courseCustomize',courseId:c.id,collectionId:g.id,appearance:style});
 core.mutate(d,{type:'courseOrder',courseId:a.id,direction:'down'});assert.deepEqual(d.courses.map(c=>c.id),[b.id,a.id,c.id]);
 core.mutate(d,{type:'courseOrder',courseId:c.id,direction:'up'});assert.deepEqual(d.courses.map(c=>c.id),[b.id,a.id,c.id]);
 for(const courseId of [a.id,c.id])core.mutate(d,{type:'coursePin',courseId,pinned:true});assert.deepEqual(org.ordered(d.courses).map(c=>c.id),[a.id,c.id,b.id]);
 core.mutate(d,{type:'courseOrder',courseId:c.id,direction:'up'});assert.deepEqual(org.ordered(d.courses).map(c=>c.id),[c.id,a.id,b.id]);
 core.mutate(d,{type:'collectionCreate',title:'University'});const second=d.collections[1];core.mutate(d,{type:'collectionOrder',collectionId:second.id,direction:'up'});assert.equal(d.collections[0].id,second.id);core.mutate(d,{type:'collectionPin',collectionId:g.id,pinned:true});assert.equal(org.ordered(d.collections)[0].id,g.id);assert.deepEqual(core.validateLibrary(d),d);
});
test('unknown icons, unsafe colors, invalid references and duplicate collection names fail without altering data',()=>{
 const d=fixture(),before=structuredClone(d),courseId=d.courses[0].id;
 for(const appearance of [{...style,icon:'script'},{...style,iconColor:'url(https://bad)'},{...style,nameColor:'red;display:none'},{...style,icon:'custom',symbol:'<script>'}])assert.throws(()=>core.mutate(d,{type:'courseCustomize',courseId,appearance,collectionId:''}));
 assert.throws(()=>core.mutate(d,{type:'courseCustomize',courseId,appearance:style,collectionId:'missing'}));assert.deepEqual(d,before);
 core.mutate(d,{type:'collectionCreate',title:'Group'});assert.throws(()=>core.mutate(d,{type:'collectionCreate',title:'group'}));
 for(const edit of [d=>d.collections[0].id=d.courses[0].id,d=>d.courses[0].collectionId='missing',d=>d.courses[0].pinned='yes',d=>d.collections[0].appearance={...style,iconColor:'bad'}]){const copy=structuredClone(d);edit(copy);assert.throws(()=>core.validateLibrary(copy));}
});
test('custom emoji and arrangement metadata survive restart/restore; failed removal rolls back the entire change',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'quiznet-collections-'));try{
  const store=new Store(dir);await store.load(fixture);await store.change(d=>core.mutate(d,{type:'collectionCreate',title:'AI'}));const group=store.data.collections[0],courseId=store.data.courses[0].id;
  await store.change(d=>core.mutate(d,{type:'courseCustomize',courseId,collectionId:group.id,appearance:{...style,icon:'custom',symbol:'🤖'}}));await store.change(d=>core.mutate(d,{type:'coursePin',courseId,pinned:true}));
  const backup=structuredClone(store.data),open=new Store(dir);await open.load();assert.deepEqual(open.data,backup);
  const write=open.write,bytes=await fs.readFile(open.file);open.write=async()=>{throw new Error('Synthetic disk failure');};await assert.rejects(open.change(d=>core.mutate(d,{type:'collectionDelete',collectionId:group.id}),{snapshotReason:'delete'}));assert.deepEqual(open.data,backup);assert.deepEqual(await fs.readFile(open.file),bytes);open.write=write;
  await open.change(d=>core.mutate(d,{type:'collectionDelete',collectionId:group.id}),{snapshotReason:'delete'});assert.equal(open.data.courses[0].collectionId,undefined);await open.replace(backup);assert.deepEqual(open.data,backup);
 }finally{if(!path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep))throw new Error('Unexpected test profile');await fs.rm(dir,{recursive:true,force:true});}
});
