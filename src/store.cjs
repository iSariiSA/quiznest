const fs = require('node:fs/promises');
const path = require('node:path');
const { emptyLibrary, validateLibrary } = require('./core.cjs');
class Store {
  constructor(directory) { this.directory=directory; this.file=path.join(directory,'library.json'); this.data=null; this.queue=Promise.resolve(); this.notice=''; }
  async load(seed) {
    await fs.mkdir(this.directory,{recursive:true});
    let source;
    try { source=await fs.readFile(this.file,'utf8'); }
    catch (e) { if(e.code!=='ENOENT') throw e; this.data=seed?seed():emptyLibrary(); await this.write(this.data,false); return this.data; }
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
    if(backup) await fs.copyFile(this.file,this.file+'.bak');
    const temp=this.file+'.tmp', handle=await fs.open(temp,'w');
    try { await handle.writeFile(JSON.stringify(data,null,2),'utf8'); await handle.sync(); } finally { await handle.close(); }
    await fs.rename(temp,this.file);
  }
  change(fn) {
    const operation=this.queue.then(async()=>{ const next=structuredClone(this.data); await fn(next); await this.write(next); this.data=next; return structuredClone(this.data); });
    this.queue=operation.catch(()=>{}); return operation;
  }
  replace(data) { return this.change(current=>{ const valid=validateLibrary(data); for(const key of Object.keys(current)) delete current[key]; Object.assign(current,valid); }); }
}
module.exports={Store};
