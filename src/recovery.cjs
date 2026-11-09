const fs=require('node:fs/promises'),path=require('node:path');
const {randomUUID}=require('node:crypto');
const core=require('./core.cjs'),images=require('./ui/content-policy.js'),aids=require('./ui/study-aids.js');
const {writeAtomic}=require('./local-files.cjs');
const MAX_DRAFT_BYTES=20*1024*1024,MAX_SNAPSHOTS=7,MAX_HISTORY_BYTES=128*1024*1024;
const snapshotName=/^(\d{13})-(daily|manual|import|delete|restore)-([a-f0-9-]{36})\.json$/;
function draftText(value,max){if(typeof value!=='string'||value.length>max)throw new Error('The editor draft contains an invalid or oversized field.');return value;}
function validateDraft(raw){
  if(!raw||raw.version!==1||!Number.isFinite(Date.parse(raw.savedAt))||!raw.editor)throw new Error('This editor draft is unsupported or damaged.');
  const e=raw.editor,d=e.destination;
  if(!d||!Array.isArray(e.questions)||!e.questions.length||e.questions.length>10000)throw new Error('This editor draft has an invalid destination or question count.');
  const editor={title:draftText(e.title,200),destination:Object.fromEntries(['course','unit','courseTitle','unitTitle'].map(k=>[k,draftText(d[k],200)]))};
  for(const key of ['quizId','courseId','unitId'])if(e[key]!=null)editor[key]=draftText(e[key],200);
  if(e.reference!==undefined)editor.reference=aids.reference(e.reference,e.questions.length,true);
  if(e.referenceSelection!==undefined)editor.referenceSelection=draftText(e.referenceSelection,5000);
  editor.page=Number.isInteger(e.page)&&e.page>=0?Math.min(e.page,399):0;
  editor.questions=Array.from(e.questions,q=>{
    if(!q||(q.type!==undefined&&!core.types.some(t=>t.id===q.type))||!['text','html','markdown'].includes(q.format||'text'))throw new Error('This editor draft has an invalid question.');
    const limit=q.format==='html'?images.MAX_HTML_LENGTH:q.format==='markdown'?100000:10000;
    const next={type:q.type||'single-choice',format:q.format||'text',prompt:draftText(q.prompt,limit),explanation:draftText(q.explanation,limit)};
    if(q.type==='written-answer'){
      if(['options','choices','correctAnswer','correctAnswers','pairs'].some(key=>q[key]!==undefined)||!Array.isArray(q.acceptedAnswers)||q.acceptedAnswers.length<1||q.acceptedAnswers.length>core.responseLimits.maxAcceptedAnswers||q.caseSensitive!==undefined&&typeof q.caseSensitive!=='boolean')throw new Error('This editor draft has invalid written answers.');
      next.acceptedAnswers=Array.from(q.acceptedAnswers,value=>draftText(value,core.responseLimits.maxWrittenLength));next.caseSensitive=q.caseSensitive===true;
    }else if(q.type==='matching'){
      if(['options','choices','correctAnswer','correctAnswers','acceptedAnswers','caseSensitive'].some(key=>q[key]!==undefined)||!Array.isArray(q.pairs)||q.pairs.length<2||q.pairs.length>core.responseLimits.maxPairs)throw new Error('This editor draft has invalid matching pairs.');
      next.pairs=Array.from(q.pairs,pair=>{if(!pair||typeof pair!=='object'||Array.isArray(pair)||Object.keys(pair).some(key=>!['left','right'].includes(key)))throw new Error('This editor draft has an invalid matching pair.');return {left:draftText(pair.left,core.responseLimits.maxPairLength),right:draftText(pair.right,core.responseLimits.maxPairLength)};});
    }else{
    if(!Array.isArray(q.options)||q.options.length<2||q.options.length>100||['acceptedAnswers','caseSensitive','pairs'].some(key=>q[key]!==undefined))throw new Error('This editor draft has invalid choices.');
    next.options=Array.from(q.options,v=>draftText(v,q.format==='text'||!q.format?5000:limit));
    if(q.type==='multiple-answer'){
      if(!Array.isArray(q.correctAnswers)||q.correctAnswers.length>100||Array.from(q.correctAnswers).some(i=>!Number.isInteger(i)||i<0||i>=q.options.length)||new Set(q.correctAnswers).size!==q.correctAnswers.length)throw new Error('This editor draft has invalid answers.');
      next.correctAnswers=[...q.correctAnswers];
    }else {if(!Number.isInteger(q.correctAnswer)||q.correctAnswer<0||q.correctAnswer>=q.options.length)throw new Error('This editor draft has an invalid answer.');next.correctAnswer=q.correctAnswer;}
    }
    if(q.hint!==undefined)next.hint=aids.hint(q.hint,true);
    if(q.studyReference!==undefined)next.studyReference=aids.note(q.studyReference,true);
    if(q.image!==undefined){next.image=images.imageData(q.image);next.imageAlt=draftText(q.imageAlt||'',500);}
    if(q.code!==undefined){next.code=draftText(q.code,50000);next.codeLanguage=draftText(q.codeLanguage||'plaintext',50);}
    return next;
  });
  const valid={version:1,savedAt:raw.savedAt,editor};
  if(Buffer.byteLength(JSON.stringify(valid))>MAX_DRAFT_BYTES)throw new Error('The recovery draft exceeds 20 MB. Remove large attachments or save a smaller quiz.');
  return valid;
}
class Recovery{
  constructor(directory){this.directory=directory;this.draftFile=path.join(directory,'editor-draft.json');this.historyDirectory=path.join(directory,'snapshots');this.draftQueue=Promise.resolve();this.dailyDate=null;this.maxSnapshots=MAX_SNAPSHOTS;this.maxBytes=MAX_HISTORY_BYTES;}
  setLimits(count,MiB){if(![3,7,14,30].includes(count)||![64,128,256,512].includes(MiB))throw new Error('Choose valid recovery limits.');this.maxSnapshots=count;this.maxBytes=MiB*1024*1024;}
  async draft(){try{const stat=await fs.stat(this.draftFile);if(stat.size>MAX_DRAFT_BYTES)throw new Error('The editor draft exceeds 20 MB.');return validateDraft(JSON.parse(await fs.readFile(this.draftFile,'utf8')));}catch(error){if(error.code==='ENOENT')return null;throw new Error('The editor draft could not be read. It has been preserved in the data folder. '+error.message);}}
  saveDraft(raw){
    const valid=raw===null?null:validateDraft({version:1,savedAt:new Date().toISOString(),editor:raw});
    const operation=this.draftQueue.then(async()=>{if(valid)await writeAtomic(this.draftFile,JSON.stringify(valid));else await fs.rm(this.draftFile,{force:true});return valid?{savedAt:valid.savedAt,title:valid.editor.title}:null;});
    this.draftQueue=operation.catch(()=>{});return operation;
  }
  async list(){
    let entries;try{entries=await fs.readdir(this.historyDirectory,{withFileTypes:true});}catch(error){if(error.code==='ENOENT')return [];throw error;}
    const result=[];
    for(const entry of entries){const match=entry.isFile()&&entry.name.match(snapshotName);if(!match)continue;const stat=await fs.stat(path.join(this.historyDirectory,entry.name));result.push({id:entry.name,createdAt:new Date(Number(match[1])).toISOString(),reason:match[2],bytes:stat.size});}
    return result.sort((a,b)=>b.id.localeCompare(a.id));
  }
  async snapshot(data,reason='manual',now=Date.now()){
    if(!['daily','manual','import','delete','restore'].includes(reason))throw new Error('Invalid backup reason.');
    const date=new Date(now).toISOString().slice(0,10);
    if(reason==='daily'){
      if(this.dailyDate===date)return;
      if((await this.list()).some(s=>s.createdAt.slice(0,10)===date)){this.dailyDate=date;return;}
    }
    core.validateLibrary(data);
    await fs.mkdir(this.historyDirectory,{recursive:true});
    const id=`${now}-${reason}-${randomUUID()}.json`;
    await writeAtomic(path.join(this.historyDirectory,id),JSON.stringify(data));
    this.dailyDate=date;
    const snapshots=await this.list();let count=snapshots.length,bytes=snapshots.reduce((n,s)=>n+s.bytes,0);
    // Retain the new point even when a single library exceeds the byte budget.
    for(const old of [...snapshots].reverse()){
      if(count<=this.maxSnapshots&&bytes<=this.maxBytes)break;
      if(old.id===id)continue;
      await fs.unlink(path.join(this.historyDirectory,old.id));count--;bytes-=old.bytes;
    }
    return id;
  }
  async readSnapshot(id){
    if(typeof id!=='string'||!snapshotName.test(id))throw new Error('Choose a backup from the history list.');
    const file=path.join(this.historyDirectory,id),stat=await fs.lstat(file);
    if(!stat.isFile()||stat.isSymbolicLink())throw new Error('This backup is not a regular file.');
    return core.validateLibrary(JSON.parse(await fs.readFile(file,'utf8')));
  }
  async check(file){
    const checks=[];
    for(const [name,target] of [['Current library',file],['Rolling backup',file+'.bak']]){
      try{const library=core.validateLibrary(JSON.parse(await fs.readFile(target,'utf8')));const quizzes=library.courses.flatMap(c=>c.units.flatMap(u=>u.quizzes));checks.push({name,status:'valid',courses:library.courses.length,quizzes:quizzes.length,questions:quizzes.reduce((n,q)=>n+q.questions.length,0),attempts:library.attempts.length});}
      catch(error){checks.push({name,status:error.code==='ENOENT'?'missing':'damaged',detail:error.code==='ENOENT'?'No file exists yet.':error.message});}
    }
    return checks;
  }
}
module.exports={Recovery,validateDraft,MAX_DRAFT_BYTES,MAX_SNAPSHOTS,MAX_HISTORY_BYTES};
