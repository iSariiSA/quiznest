const { app, BrowserWindow, ipcMain, dialog, session, shell, Menu } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { pathToFileURL } = require('node:url');
const { Store } = require('./store.cjs');
const core = require('./core.cjs');
const { sampleLibrary } = require('./sample.cjs');
app.setName('Quiznet');
if (process.env.QUIZNET_TEST_DATA && !app.isPackaged) app.setPath('userData',path.resolve(process.env.QUIZNET_TEST_DATA));
app.commandLine.appendSwitch('disable-background-networking');
const entry=pathToFileURL(path.join(__dirname,'ui/index.html')).href;
let window, store;
const pending=new Map();
const safeName=name=>name.replace(/[<>:"/\\|?*\x00-\x1F]/g,'_').slice(0,100);
const meta=()=>({dataPath:store.file,notice:store.notice,version:app.getVersion()});
function handle(name,fn) {
  ipcMain.handle(`quiznet:${name}`,async(event,...args)=>{
    try {
      if (event.sender!==window.webContents || event.senderFrame?.url!==entry) throw new Error('Untrusted request.');
      return {ok:true,value:await fn(...args)};
    } catch(e) { return {ok:false,error:e.message || 'Something went wrong.'}; }
  });
}
async function readSelected(filters) {
  const result=await dialog.showOpenDialog(window,{title:'Open a local file',properties:['openFile'],filters});
  if(result.canceled) return null;
  const file=result.filePaths[0]; const stat=await fs.stat(file);
  if(stat.size>20*1024*1024) throw new Error('Files must be smaller than 20 MB.');
  return {file,source:await fs.readFile(file,'utf8')};
}
async function saveFile(defaultPath,content) {
  const result=await dialog.showSaveDialog(window,{defaultPath,filters:[{name:'JSON file',extensions:['json']}],title:'Save a local file'});
  if(result.canceled) return false;
  await fs.writeFile(result.filePath,content,'utf8'); return true;
}
function addPending(value) { pending.clear(); const token=core.id(); pending.set(token,value); return token; }
app.whenReady().then(async()=>{
  Menu.setApplicationMenu(null);
  store=new Store(path.join(app.getPath('userData'),'data'));
  try { await store.load(sampleLibrary); }
  catch(e) { await dialog.showMessageBox({type:'error',title:'Quiznet — library needs attention',message:e.message}); app.quit(); return; }
  session.defaultSession.setPermissionRequestHandler((_,__,callback)=>callback(false));
  session.defaultSession.setPermissionCheckHandler(()=>false);
  session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*','ws://*/*','wss://*/*','ftp://*/*']},(_,callback)=>callback({cancel:true}));
  window=new BrowserWindow({width:1360,height:900,minWidth:980,minHeight:650,show:false,frame:false,backgroundColor:'#f7f8f2',title:'Quiznet',icon:path.join(__dirname,'../assets/icon.png'),webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,spellcheck:false}});
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',event=>event.preventDefault());
  window.webContents.on('will-attach-webview',event=>event.preventDefault());
  handle('get',async()=>{await store.queue;return {library:structuredClone(store.data),meta:meta()};});
  handle('change',action=>store.change(data=>core.mutate(data,action)));
  handle('importPreview',async()=>{
    const selected=await readSelected([{name:'Quiz questions',extensions:['json','csv']}]); if(!selected)return null;
    const packs=core.parseImport(selected.source,path.extname(selected.file).slice(1),path.basename(selected.file,path.extname(selected.file)));
    const token=addPending({type:'import',packs});
    return {token,filename:path.basename(selected.file),packs:packs.map(p=>({course:p.course,unit:p.unit,title:p.title,count:p.questions.length}))};
  });
  handle('importConfirm',async(token,target)=>{
    const item=pending.get(token); if(item?.type!=='import')throw new Error('Choose the import file again.');
    const result=await store.change(data=>core.importPacks(data,item.packs,target)); pending.delete(token);return result;
  });
  handle('exportQuiz',async quizId=>{
    await store.queue;const found=core.findQuiz(store.data,quizId);if(!found)throw new Error('Quiz not found.');
    const {course,unit,quiz}=found;
    return saveFile(safeName(quiz.title)+'.json',JSON.stringify({course:course.title,unit:unit.title,title:quiz.title,questions:quiz.questions.map(({id,...q})=>q)},null,2));
  });
  handle('backup',async()=>{await store.queue;return saveFile(`Quiznet-backup-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(store.data,null,2));});
  handle('restorePreview',async()=>{
    const selected=await readSelected([{name:'Quiznet backup',extensions:['json']}]); if(!selected)return null;
    let raw;try{raw=JSON.parse(selected.source);}catch{throw new Error('This file is not valid JSON.');}
    const library=core.validateLibrary(raw), token=addPending({type:'restore',library});
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
}).catch(async e=>{await dialog.showMessageBox({type:'error',title:'Quiznet',message:e.message});app.quit();});
app.on('window-all-closed',()=>app.quit());
let readyToQuit=false;
app.on('before-quit',event=>{
  if(store && !readyToQuit) { event.preventDefault(); store.queue.finally(()=>{readyToQuit=true;app.quit();}); }
});
