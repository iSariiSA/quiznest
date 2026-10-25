const {contextBridge,ipcRenderer}=require('electron');
const invoke=async(name,...args)=>{
  const result=await ipcRenderer.invoke(`quiznet:${name}`,...args);
  if(!result.ok)throw new Error(result.error);
  return result.value;
};
contextBridge.exposeInMainWorld('quiznet',Object.freeze({
  onNotice:callback=>{const listener=(_event,message)=>callback(message);ipcRenderer.on('quiznet:notice',listener);return ()=>ipcRenderer.removeListener('quiznet:notice',listener);},
  onBeforeClose:callback=>{const listener=async(_event,token)=>{let error=null;try{await callback();}catch(e){error=e.message;}await invoke('flushDone',token,error);};ipcRenderer.on('quiznet:before-close',listener);return ()=>ipcRenderer.removeListener('quiznet:before-close',listener);},
  get:()=>invoke('get'), change:action=>invoke('change',action),
  onUpdates:callback=>{const listener=(_event,state)=>callback(state);ipcRenderer.on('quiznet:updates',listener);return ()=>ipcRenderer.removeListener('quiznet:updates',listener);},
  getUpdates:()=>invoke('getUpdates'),checkUpdates:()=>invoke('checkUpdates'),setUpdateAutomatic:enabled=>invoke('setUpdateAutomatic',enabled),remindUpdate:(action,version)=>invoke('remindUpdate',action,version),openUpdate:version=>invoke('openUpdate',version),
  readDraft:()=>invoke('readDraft'),saveDraft:draft=>invoke('saveDraft',draft),
  backupHistory:()=>invoke('backupHistory'),createSnapshot:()=>invoke('createSnapshot'),checkLibrary:()=>invoke('checkLibrary'),snapshotPreview:id=>invoke('snapshotPreview',id),
  importPreview:preferences=>invoke('importPreview',preferences), importConfirm:(token,target)=>invoke('importConfirm',token,target),
  importQuestion:(token,packIndex,questionIndex)=>invoke('importQuestion',token,packIndex,questionIndex),cancelImport:token=>invoke('cancelImport',token),
  exportQuiz:id=>invoke('exportQuiz',id), backup:()=>invoke('backup'),
  studyReportInfo:id=>invoke('studyReportInfo',id),exportStudyReport:(id,scope)=>invoke('exportStudyReport',id,scope),
  selectImage:()=>invoke('selectImage'),
  instructions:(action,preferences)=>invoke('instructions',action,preferences),
  restorePreview:()=>invoke('restorePreview'),restoreConfirm:token=>invoke('restoreConfirm',token),
  openData:()=>invoke('openData'),window:action=>invoke('window',action)
}));
