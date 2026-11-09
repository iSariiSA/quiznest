const fs=require('node:fs/promises'),path=require('node:path');
const {writeAtomic}=require('./local-files.cjs');
const practice=require('./ui/practice.js'),history=require('./ui/history-model.js');
const quizAppearance=require('./ui/quiz-appearance.js');
const languages=require('./ui/languages.js');
const defaults=()=>({version:1,language:'en',libraryView:'cards',rememberView:true,interfaceScale:100,theme:'dark',accent:'sage',textScale:100,density:'comfortable',quizAppearance:quizAppearance.defaults(),study:{...practice.defaults,shuffleAnswers:false,shuffleQuestions:false},rememberHistory:false,historyFilter:history.defaults(),historyTab:'overview',historyGroup:'none',recoveryCount:7,recoveryMiB:128});
function validate(raw){
 if(!raw||raw.version!==1)throw new Error('Choose valid display preferences.');
 const s={...defaults(),...raw};
 if(!languages.some(item=>item.id===s.language))throw new Error('Choose a supported interface language.');
 if(!['cards','names','details'].includes(s.libraryView)||typeof s.rememberView!=='boolean'||![90,100,115,125].includes(s.interfaceScale)||!['dark','light','system'].includes(s.theme)||!['sage','blue','violet','amber'].includes(s.accent)||![100,115,130].includes(s.textScale)||!['compact','comfortable'].includes(s.density)||typeof s.rememberHistory!=='boolean'||!['overview','sessions','quizzes'].includes(s.historyTab)||!['none','course','collection'].includes(s.historyGroup)||![3,7,14,30].includes(s.recoveryCount)||![64,128,256,512].includes(s.recoveryMiB))throw new Error('Choose valid display preferences.');
 const study=practice.validate(s.study);if(typeof s.study.shuffleQuestions!=='boolean'||typeof s.study.shuffleAnswers!=='boolean')throw new Error('Choose valid study defaults.');
 const filter=history.filters(s.historyFilter);for(const key of ['courseId','unitId','quizId','from','to'])if(filter[key].length>200)throw new Error('Choose valid history filters.');
 return {version:1,language:s.language,libraryView:s.rememberView?s.libraryView:'cards',rememberView:s.rememberView,interfaceScale:s.interfaceScale,theme:s.theme,accent:s.accent,textScale:s.textScale,density:s.density,quizAppearance:quizAppearance.validate(s.quizAppearance),study:{...study,shuffleQuestions:s.study.shuffleQuestions,shuffleAnswers:s.study.shuffleAnswers},rememberHistory:s.rememberHistory,historyFilter:s.rememberHistory?Object.fromEntries(Object.keys(history.defaults()).map(k=>[k,filter[k]])):history.defaults(),historyTab:s.historyTab,historyGroup:s.historyGroup,recoveryCount:s.recoveryCount,recoveryMiB:s.recoveryMiB};
}
class DisplayPreferences{
 constructor(directory){this.file=path.join(directory,'display.json');this.state=defaults();this.queue=Promise.resolve();this.warning='';this.damaged=false;}
 async load(){
  try{if((await fs.stat(this.file)).size>16384)throw new Error('Oversized display preferences.');const raw=JSON.parse(await fs.readFile(this.file,'utf8')),unavailable=typeof raw.language==='string'&&!languages.some(item=>item.id===raw.language);this.state=validate(unavailable?{...raw,language:'en'}:raw);if(unavailable)this.warning='The language file could not be loaded. English is in use; your preferences are preserved.';}
  catch(error){if(error.code!=='ENOENT'){this.damaged=true;this.warning='Display preferences could not be read. Defaults are in use; your file is preserved.';}}
  return this.snapshot();
 }
 snapshot(){return {...this.state,warning:this.warning};}
 change(patch){
  const operation=this.queue.then(async()=>{
   if(!patch||typeof patch!=='object'||Array.isArray(patch)||Object.keys(patch).some(k=>!Object.hasOwn(defaults(),k)||k==='version'))throw new Error('Choose valid display preferences.');
   const next=validate({...this.state,...patch});
   if(this.damaged)await fs.copyFile(this.file,this.file+`.damaged-${Date.now()}`);
   await fs.mkdir(path.dirname(this.file),{recursive:true});await writeAtomic(this.file,JSON.stringify(next));
   this.state=next;this.warning='';this.damaged=false;return this.snapshot();
  });
  this.queue=operation.catch(()=>{});return operation;
 }
}
module.exports={DisplayPreferences,defaults,validate};
