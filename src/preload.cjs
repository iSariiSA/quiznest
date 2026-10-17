const {contextBridge,ipcRenderer}=require('electron');
const invoke=async(name,...args)=>{
  const result=await ipcRenderer.invoke(`quiznet:${name}`,...args);
  if(!result.ok)throw new Error(result.error);
  return result.value;
};
contextBridge.exposeInMainWorld('quiznet',Object.freeze({
  get:()=>invoke('get'), change:action=>invoke('change',action),
  importPreview:()=>invoke('importPreview'), importConfirm:(token,target)=>invoke('importConfirm',token,target),
  exportQuiz:id=>invoke('exportQuiz',id), backup:()=>invoke('backup'),
  selectImage:()=>invoke('selectImage'),
  instructions:(action,preferences)=>invoke('instructions',action,preferences),
  restorePreview:()=>invoke('restorePreview'),restoreConfirm:token=>invoke('restoreConfirm',token),
  openData:()=>invoke('openData'),window:action=>invoke('window',action)
}));
