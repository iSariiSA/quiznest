const fs=require('node:fs/promises');
async function replaceFile(source,destination){
  for(let attempt=0;;attempt++){
    try{return await fs.rename(source,destination);}
    catch(error){if(!['EPERM','EACCES','EBUSY'].includes(error.code)||attempt===5)throw error;await new Promise(resolve=>setTimeout(resolve,25*2**attempt));}
  }
}
async function writeAtomic(file,source){
  const handle=await fs.open(file+'.tmp','w');
  try{await handle.writeFile(source,'utf8');await handle.sync();}finally{await handle.close();}
  await replaceFile(file+'.tmp',file);
}
module.exports={replaceFile,writeAtomic};
