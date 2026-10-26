const fs = require('node:fs/promises');
const path = require('node:path');
const { emptyLibrary, validateLibrary } = require('./core.cjs');
const {replaceFile}=require('./local-files.cjs');
const {Recovery}=require('./recovery.cjs');
class Store {
  constructor(directory) { this.directory=directory; this.file=path.join(directory,'library.json'); this.data=null; this.queue=Promise.resolve(); this.notice=''; this.recovery=new Recovery(directory); }
  async load(seed) {
    await fs.mkdir(this.directory,{recursive:true});
    let source;
    try { source=await fs.readFile(this.file,'utf8'); }
    catch (e) {
      if(e.code!=='ENOENT') throw e;
      let backup;
      try { backup=await fs.readFile(this.file+'.bak','utf8'); }
      catch (backupError) {
        if(backupError.code!=='ENOENT') throw backupError;
        this.data=seed?seed():emptyLibrary(); await this.write(this.data,false); return this.data;
      }
      try { this.data=validateLibrary(JSON.parse(backup)); }
      catch { throw new Error(`Your library could not be read. Your files have been preserved in ${this.directory}. Restore a valid library.json backup before reopening Quiznet.`); }
      await this.write(this.data,false);
      this.notice='Your missing library file was recovered from its automatic backup. The backup has been preserved in your data folder.';
      return this.data;
    }
    try { this.data=validateLibrary(JSON.parse(source)); }
    catch {
      try { this.data=validateLibrary(JSON.parse(await fs.readFile(this.file+'.bak','utf8'))); }
      catch { throw new Error(`Your library could not be read. Your files have been preserved in ${this.directory}. Restore a valid library.json backup before reopening Quiznet.`); }
      await fs.writeFile(path.join(this.directory,`library-damaged-${Date.now()}.json`),source,'utf8');
      await this.write(this.data,false); this.notice='Your library was recovered from its automatic backup. The damaged file has been preserved in your data folder.';
    }
    return this.data;
  }
  async write(data, backup=true) {
    // Complete and flush the new state before replacing either committed file.
    const temp=this.file+'.tmp', handle=await fs.open(temp,'w');
    try { await handle.writeFile(JSON.stringify(data,null,2),'utf8'); await handle.sync(); } finally { await handle.close(); }
    if(backup){
      const backupTemp=this.file+'.bak.tmp';
      await fs.copyFile(this.file,backupTemp);
      const previous=await fs.open(backupTemp,'r+');try{await previous.sync();}finally{await previous.close();}
      await replaceFile(backupTemp,this.file+'.bak');
    }
    await replaceFile(temp,this.file);
  }
  change(fn,{returnData=true,snapshotReason='daily'}={}) {
    const operation=this.queue.then(async()=>{ const next=structuredClone(this.data); await fn(next); await this.recovery.snapshot(this.data,snapshotReason); await this.write(next); this.data=next; return returnData?structuredClone(this.data):undefined; });
    this.queue=operation.catch(()=>{}); return operation;
  }
  inspect(fn){const operation=this.queue.then(()=>fn(this.data));this.queue=operation.catch(()=>{});return operation;}
  replace(data) { return this.change(current=>{ const valid=validateLibrary(data); for(const key of Object.keys(current)) delete current[key]; Object.assign(current,valid); },{snapshotReason:'restore'}); }
}
module.exports={Store};
