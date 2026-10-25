const { app, BrowserWindow, ipcMain, dialog, session, shell, Menu, clipboard } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { pathToFileURL } = require('node:url');
const { Store } = require('./store.cjs');
const core = require('./core.cjs');
const { sampleLibrary } = require('./sample.cjs');
const contentPolicy = require('./ui/content-policy.js');
const instructions = require('./ui/instructions.js');
const {importReport,importQuestion}=require('./import-report.cjs');
const {UpdateService}=require('./updates.cjs');
const studyReport=require('./study-report.cjs');
app.setName('Quiznet');
if (process.env.QUIZNET_TEST_DATA && !app.isPackaged) app.setPath('userData',path.resolve(process.env.QUIZNET_TEST_DATA));
app.setAppUserModelId('com.quiznet.desktop');
const primaryInstance=app.requestSingleInstanceLock();
if (!primaryInstance) app.quit();
app.commandLine.appendSwitch('disable-background-networking');
const entry=pathToFileURL(path.join(__dirname,'ui/index.html')).href;
let window, store,updates;
let readyToQuit=false,quitSaving=false,recoveringRenderer=false;
let runtimeNotice='';
let checkpointPending=false,checkpointErrorShown=false;
let closeFlush=null;
let studyReportOperation=null;
app.on('second-instance',()=>{
  if(window && !window.isDestroyed()) {
    if(window.isMinimized()) window.restore();
    window.show(); window.focus();
    if(window.webContents.isCrashed())recoverRenderer();
  }
});
const pending=new Map();
const safeName=name=>name.replace(/[<>:"/\\|?*\x00-\x1F]/g,'_').slice(0,100);
const meta=()=>({dataPath:store.file,notice:runtimeNotice||store.notice,version:app.getVersion(),updates:updates.snapshot()});
function handle(name,fn) {
  ipcMain.handle(`quiznet:${name}`,async(event,...args)=>{
    try {
      if (event.sender!==window.webContents || event.senderFrame?.url!==entry) throw new Error('Untrusted request.');
      if(quitSaving&&!['get','window','saveDraft','flushDone'].includes(name))throw new Error('Quiznet is saving before closing. Please wait and try again.');
      return {ok:true,value:await fn(...args)};
    } catch(e) { return {ok:false,error:e.message || 'Something went wrong.'}; }
  });
}
async function readSelected(filters, maxBytes=20*1024*1024) {
  const result=await dialog.showOpenDialog(window,{title:'Open a local file',properties:['openFile'],filters});
  if(result.canceled) return null;
  const file=result.filePaths[0]; const stat=await fs.stat(file);
  if(stat.size>maxBytes) throw new Error('Files must be smaller than 20 MB.');
  return {file,source:await fs.readFile(file,'utf8')};
}
async function saveFile(defaultPath,content) {
  const result=await dialog.showSaveDialog(window,{defaultPath,filters:[{name:'JSON file',extensions:['json']}],title:'Save a local file'});
  if(result.canceled) return false;
  await fs.writeFile(result.filePath,content,'utf8'); return true;
}
function addPending(value) { pending.clear(); const token=core.id(); pending.set(token,value); return token; }
if(primaryInstance) app.whenReady().then(async()=>{
  Menu.setApplicationMenu(null);
  store=new Store(path.join(app.getPath('userData'),'data'));
  try { await store.load(sampleLibrary); }
  catch(e) { await dialog.showMessageBox({type:'error',title:'Quiznet — library needs attention',message:e.message}); app.quit(); return; }
  updates=new UpdateService(app.getPath('userData'),app.getVersion(),state=>{if(window&&!window.isDestroyed()&&!window.webContents.isDestroyed()&&!window.webContents.isCrashed())window.webContents.send('quiznet:updates',state);});
  await updates.load();
  // The saved cursor belongs to the previous process. Never count time while the app was closed.
  if(store.data.activeSession?.timing)store.data.activeSession.timing.runningSince=null;
  setInterval(()=>{
    if(readyToQuit||quitSaving||checkpointPending||store.data.activeSession?.timing?.runningSince==null)return;
    checkpointPending=true;
    store.change(data=>core.mutate(data,{type:'tick'}),{returnData:false}).then(()=>{checkpointErrorShown=false;}).catch(error=>{
      if(!checkpointErrorShown&&window&&!window.isDestroyed())window.webContents.send('quiznet:notice',`Autosave could not complete. Your last successful save is preserved. ${error.message}`);
      checkpointErrorShown=true;
    }).finally(()=>{checkpointPending=false;});
  },15000).unref();
  session.defaultSession.setPermissionRequestHandler((_,__,callback)=>callback(false));
  session.defaultSession.setPermissionCheckHandler(()=>false);
  session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*','ws://*/*','wss://*/*','ftp://*/*']},(_,callback)=>callback({cancel:true}));
  window=new BrowserWindow({width:1100,height:740,minWidth:760,minHeight:560,show:false,frame:false,backgroundColor:'#181b20',title:'Quiznet',icon:path.join(__dirname,'../assets/icon.png'),webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,spellcheck:false}});
  window.on('close',event=>{if(!readyToQuit){event.preventDefault();finishQuit();}});
  window.webContents.on('render-process-gone',(_event,details)=>{if(details.reason!=='clean-exit'&&!readyToQuit&&!quitSaving)recoverRenderer();});
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',event=>event.preventDefault());
  window.webContents.on('will-attach-webview',event=>event.preventDefault());
  handle('get',async()=>{await store.queue;await store.recovery.draftQueue;let draft=null,draftError='';try{const saved=await store.recovery.draft();if(saved)draft={title:saved.editor.title,savedAt:saved.savedAt};}catch(error){draftError=error.message;}return {library:structuredClone(store.data),meta:{...meta(),draft,draftError}};});
  handle('getUpdates',()=>updates.snapshot());
  handle('checkUpdates',()=>updates.check('manual'));
  handle('setUpdateAutomatic',async enabled=>{await updates.setAutomatic(enabled);if(enabled)updates.check('automatic').catch(()=>{});return updates.snapshot();});
  handle('remindUpdate',(action,version)=>updates.remind(action,version));
  handle('openUpdate',async version=>{const url=updates.openPage(version);await updates.remind('later',version);await shell.openExternal(url);return updates.snapshot();});
  handle('change',action=>store.change(data=>core.mutate(data,action),{snapshotReason:action?.type==='delete'?'delete':'daily'}));
  handle('readDraft',async()=>{await store.recovery.draftQueue;return store.recovery.draft();});
  handle('saveDraft',draft=>store.recovery.saveDraft(draft));
  handle('flushDone',(token,error)=>{if(closeFlush?.token===token){if(error)closeFlush.reject(new Error(String(error).slice(0,1000)));else closeFlush.resolve();}return true;});
  handle('backupHistory',()=>store.inspect(()=>store.recovery.list()));
  handle('createSnapshot',()=>store.inspect(async data=>{await store.recovery.snapshot(data);return store.recovery.list();}));
  handle('checkLibrary',()=>store.inspect(()=>store.recovery.check(store.file)));
  handle('snapshotPreview',id=>store.inspect(async()=>{const library=await store.recovery.readSnapshot(id);if(library.activeSession?.timing)library.activeSession.timing.runningSince=null;const token=addPending({type:'restore',library});return {token,filename:'Saved backup',courses:library.courses.length,quizzes:library.courses.flatMap(c=>c.units.flatMap(u=>u.quizzes)).length};}));
  handle('instructions',async(action,preferences)=>{
    if(!['save','copy'].includes(action))throw new Error('Choose Save Markdown or Copy instructions.');
    const markdown=instructions.generate(preferences);
    if(action==='copy'){clipboard.writeText(markdown);return true;}
    const result=await dialog.showSaveDialog(window,{defaultPath:'Quiznet-instructions.md',filters:[{name:'Markdown instructions',extensions:['md']}],title:'Save quiz instructions'});
    if(result.canceled)return false;
    await fs.writeFile(result.filePath,markdown,'utf8');return true;
  });
  handle('selectImage',async()=>{
    const result=await dialog.showOpenDialog(window,{title:'Add an image',properties:['openFile'],filters:[{name:'Images',extensions:['png','jpg','jpeg','gif','webp']}]});
    if (result.canceled) return null;
    const file=result.filePaths[0],stat=await fs.stat(file);
    if (!stat.isFile() || stat.size>contentPolicy.MAX_IMAGE_BYTES) throw new Error('Choose an image file up to 2 MB.');
    const bytes=await fs.readFile(file),type=contentPolicy.imageType(bytes);
    if (!type) throw new Error('Choose a PNG, JPEG, GIF, or WebP image.');
    return {image:contentPolicy.imageData(`data:image/${type};base64,${bytes.toString('base64')}`)};
  });
  handle('importPreview',async preferences=>{
    if(preferences!=null)instructions.validate(preferences);
    const selected=await readSelected([{name:'Quiz questions',extensions:['json','csv']}]); if(!selected)return null;
    const packs=core.parseImport(selected.source,path.extname(selected.file).slice(1),path.basename(selected.file,path.extname(selected.file)));
    const report=await store.inspect(data=>importReport(packs,data,preferences));
    const token=addPending({type:'import',packs,report});
    const {questionIssues,...summary}=report;
    return {token,filename:path.basename(selected.file),report:summary,packs:packs.map(p=>({course:p.course,unit:p.unit,title:p.title,count:p.questions.length}))};
  });
  handle('importQuestion',(token,packIndex,questionIndex)=>importQuestion(pending.get(token),packIndex,questionIndex));
  handle('cancelImport',token=>{if(pending.get(token)?.type==='import')pending.delete(token);return true;});
  handle('importConfirm',async(token,target)=>{
    const item=pending.get(token); if(item?.type!=='import')throw new Error('Choose the import file again.');
    const result=await store.change(data=>core.importPacks(data,item.packs,target),{snapshotReason:'import'}); pending.delete(token);return result;
  });
  handle('exportQuiz',async quizId=>{
    await store.queue;const found=core.findQuiz(store.data,quizId);if(!found)throw new Error('Quiz not found.');
    const {course,unit,quiz}=found;
    return saveFile(safeName(quiz.title)+'.json',core.exportQuiz({course,unit,quiz}));
  });
  handle('backup',async()=>{await store.queue;return saveFile(`Quiznet-backup-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(store.data,null,2));});
  const completedAttempt=async id=>{
    if(typeof id!=='string'||!id||id.length>200)throw new Error('Choose a completed quiz from History.');
    await store.queue;const attempt=store.data.attempts.find(item=>item.id===id);
    if(!attempt)throw new Error('Completed quiz not found. Open it from History again.');return attempt;
  };
  handle('studyReportInfo',async id=>studyReport.reportInfo(await completedAttempt(id)));
  handle('exportStudyReport',(id,scope)=>{
    if(studyReportOperation)throw new Error('Wait for the current study report to finish saving.');
    studyReportOperation=(async()=>{
      studyReport.validateScope(scope);
      const attempt=await completedAttempt(id),source=studyReport.markdownReport(attempt,scope);
      const result=await dialog.showSaveDialog(window,{title:'Save study report',defaultPath:`Quiznet-review-${safeName(attempt.title)}-${safeName(String(attempt.completedAt).slice(0,10))}.md`,filters:[{name:'Markdown study report',extensions:['md']}]});
      if(result.canceled)return false;
      if(typeof result.filePath!=='string'||path.extname(result.filePath).toLowerCase()!=='.md')throw new Error('Choose a Markdown (.md) file for the study report.');
      const relative=path.relative(app.getPath('userData'),path.resolve(result.filePath));
      if(!relative||!path.isAbsolute(relative)&&relative!=='..'&&!relative.startsWith('..'+path.sep))throw new Error('Save the report outside Quiznet’s data folder.');
      await studyReport.writeReport(result.filePath,source);return true;
    })().finally(()=>{studyReportOperation=null;});
    return studyReportOperation;
  });
  handle('restorePreview',async()=>{
    // Embedded images and historical attempts can make backups larger than quiz imports.
    const selected=await readSelected([{name:'Quiznet backup',extensions:['json']}],Infinity); if(!selected)return null;
    let raw;try{raw=JSON.parse(selected.source);}catch{throw new Error('This file is not valid JSON.');}
    const library=core.validateLibrary(raw);
    if(library.activeSession?.timing)library.activeSession.timing.runningSince=null;
    const token=addPending({type:'restore',library});
    return {token,filename:path.basename(selected.file),courses:library.courses.length,quizzes:library.courses.flatMap(c=>c.units.flatMap(u=>u.quizzes)).length};
  });
  handle('restoreConfirm',async token=>{
    const item=pending.get(token);if(item?.type!=='restore')throw new Error('Choose the backup again.');
    // Preserve the full current library independently of the rolling backup.
    await store.queue;
    await fs.writeFile(path.join(store.directory,`before-restore-${Date.now()}.json`),JSON.stringify(store.data,null,2),'utf8');
    const result=await store.replace(item.library);pending.delete(token);return result;
  });
  handle('openData',async()=>{const error=await shell.openPath(store.directory);if(error)throw new Error(error);return true;});
  handle('window',action=>{if(action==='minimize')window.minimize();else if(action==='maximize')window.isMaximized()?window.unmaximize():window.maximize();else if(action==='close')window.close();});
  window.once('ready-to-show',()=>window.show());
  await window.loadFile(path.join(__dirname,'ui/index.html'));
  updates.check('automatic').catch(()=>{});
  setInterval(()=>{if(!quitSaving&&!readyToQuit)updates.check('automatic').then(()=>updates.emit()).catch(()=>{});},60000).unref();
}).catch(async e=>{await dialog.showMessageBox({type:'error',title:'Quiznet',message:e.message});app.quit();});
app.on('window-all-closed',()=>app.quit());
async function finishQuit(){
  if(quitSaving||readyToQuit)return;
  quitSaving=true;
  try{
    if(window&&!window.isDestroyed()&&!window.webContents.isCrashed()){
      await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>reject(new Error('The editor did not confirm its draft save. Try closing again.')),5000);
        closeFlush={token:core.id(),resolve:()=>{clearTimeout(timer);resolve();},reject:error=>{clearTimeout(timer);reject(error);}};
        window.webContents.send('quiznet:before-close',closeFlush.token);
      });
      closeFlush=null;
    }
    await store?.recovery.draftQueue;
    await store?.queue;
    await studyReportOperation?.catch(()=>{});
    if(store?.data?.activeSession?.timing?.runningSince!=null)await store.change(data=>core.mutate(data,{type:'pause'}),{returnData:false});
    await updates?.close();
    readyToQuit=true;app.quit();
  }catch(error){
    quitSaving=false;
    if(window&&!window.isDestroyed()){window.show();window.focus();}
    closeFlush=null;
    await dialog.showMessageBox(window,{type:'error',title:'Quiznet',message:`Your latest changes could not be saved. Quiznet will stay open so you can retry. ${error.message}`});
  }
}
async function recoverRenderer(){
  if(recoveringRenderer||!window||window.isDestroyed())return;
  recoveringRenderer=true;
  try{
    const stoppedAt=Date.now();await store.queue;
    if(store.data.activeSession?.timing?.runningSince!=null)await store.change(data=>core.mutate(data,{type:'pause'},stoppedAt),{returnData:false});
    const result=await dialog.showMessageBox(window,{type:'warning',title:'Reopen Quiznet',message:'The display stopped unexpectedly. Your saved library and quiz progress are available. Reopen the display to continue. The library will offer recovery of any saved editor draft; edits after its last save may need to be entered again.',buttons:['Reopen','Close Quiznet'],defaultId:0,cancelId:0});
    if(result.response===1){await finishQuit();return;}
    runtimeNotice='Quiznet reopened after a display problem. Your saved quiz progress is ready to resume. Check the library for a saved editor draft.';
    await window.loadFile(path.join(__dirname,'ui/index.html'));window.show();window.focus();
  }catch(error){
    await dialog.showMessageBox(window,{type:'error',title:'Quiznet',message:`Quiznet could not reopen the display. Your files have been preserved. Try launching Quiznet again. ${error.message}`});
  }finally{recoveringRenderer=false;}
}
app.on('before-quit',event=>{if(!readyToQuit){event.preventDefault();finishQuit();}});
