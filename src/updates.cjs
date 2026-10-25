const https=require('node:https'),fs=require('node:fs/promises'),path=require('node:path');
const {writeAtomic}=require('./local-files.cjs');
const REPOSITORY='iSariiSA/quiznest',API_ROOT=`https://api.github.com/repos/${REPOSITORY}/releases`,WEB_ROOT=`https://github.com/${REPOSITORY}/releases`;
const INTERVAL=48*60*60*1000,RETRY=2*60*60*1000,MIN_CHECK=60*1000,MAX_BYTES=2*1024*1024,MAX_PAGES=5,PAGE_SIZE=20;
function version(value){
  if(typeof value!=='string'||value.length>100)return null;
  const match=value.match(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/);
  if(!match||match[0]!==value||match.slice(1,4).some(v=>!Number.isSafeInteger(Number(v))))return null;
  const pre=match[4]?.split('.')||[];if(pre.some(v=>/^\d+$/.test(v)&&(v.length>1&&v[0]==='0'||!Number.isSafeInteger(Number(v)))))return null;
  return {numbers:match.slice(1,4).map(Number),pre};
}
function compare(a,b){const x=version(a),y=version(b);if(!x||!y)throw new Error('Invalid update version.');for(let i=0;i<3;i++)if(x.numbers[i]!==y.numbers[i])return x.numbers[i]>y.numbers[i]?1:-1;if(!x.pre.length||!y.pre.length)return x.pre.length===y.pre.length?0:x.pre.length?-1:1;for(let i=0;i<Math.max(x.pre.length,y.pre.length);i++){const p=x.pre[i],q=y.pre[i];if(p===q)continue;if(p===undefined||q===undefined)return p===undefined?-1:1;const pn=/^\d+$/.test(p),qn=/^\d+$/.test(q);if(pn&&qn)return Number(p)>Number(q)?1:-1;if(pn!==qn)return pn?-1:1;return p>q?1:-1;}return 0;}
function releasePage(tag){if(typeof tag!=='string'||!tag.startsWith('v')||!version(tag.slice(1)))throw new Error('Invalid release tag.');return `${WEB_ROOT}/tag/${encodeURIComponent(tag)}`;}
function candidate(release){
  if(!release||release.draft!==false||typeof release.prerelease!=='boolean'||!Number.isFinite(Date.parse(release.published_at))||!Array.isArray(release.assets))return null;
  const tag=release.tag_name;if(typeof tag!=='string'||!tag.startsWith('v')||!version(tag.slice(1)))return null;
  const url=releasePage(tag);if(release.html_url!==url)return null;
  const assets=release.assets.filter(a=>a?.name==='Quiznet-Setup.exe');
  if(assets.length!==1)return null;
  const asset=assets[0];if(asset.state!=='uploaded'||!Number.isSafeInteger(asset.size)||asset.size<=0||asset.browser_download_url!==`${WEB_ROOT}/download/${encodeURIComponent(tag)}/Quiznet-Setup.exe`)return null;
  return {version:tag.slice(1),tag};
}
function defaults(){return {version:1,automatic:false,lastAttempt:0,lastChecked:0,nextCheckAt:0,retryAt:0,skippedVersion:null,remindAfter:0,available:null};}
function validateState(raw){
  if(!raw||raw.version!==1||typeof raw.automatic!=='boolean')throw new Error('Invalid update preferences.');
  const s=defaults();s.automatic=raw.automatic;
  for(const key of ['lastAttempt','lastChecked','nextCheckAt','retryAt','remindAfter']){if(!Number.isSafeInteger(raw[key])||raw[key]<0||raw[key]>8640000000000000)throw new Error('Invalid update timestamp.');s[key]=raw[key];}
  if(raw.skippedVersion!==null&&!version(raw.skippedVersion))throw new Error('Invalid skipped version.');s.skippedVersion=raw.skippedVersion;
  if(raw.available!==null){if(!version(raw.available?.version)||raw.available.tag!==`v${raw.available.version}`)throw new Error('Invalid cached update.');s.available={version:raw.available.version,tag:raw.available.tag};}
  return s;
}
function retryTime(headers,now){
  const after=String(headers['retry-after']||''),seconds=Number(after),reset=Number(headers['x-ratelimit-reset']);
  const delay=after?Number.isFinite(seconds)?now+Math.max(0,seconds)*1000:Date.parse(after):0;
  return Math.min(8640000000000000,Math.max(now+MIN_CHECK,Number.isFinite(delay)?delay:0,headers['x-ratelimit-remaining']==='0'&&Number.isFinite(reset)?reset*1000:0));
}
function fetchPage(page,signal){
  if(!Number.isInteger(page)||page<1||page>MAX_PAGES)return Promise.reject(new Error('Invalid update page.'));
  return new Promise((resolve,reject)=>{
    const request=https.get(`${API_ROOT}?per_page=${PAGE_SIZE}&page=${page}`,{signal,headers:{Accept:'application/vnd.github+json','User-Agent':'Quiznet-update-check','X-GitHub-Api-Version':'2026-03-10'}},response=>{
      // Node HTTPS does not follow redirects or share the renderer's cookies/session.
      let bytes=0;const chunks=[];
      response.on('error',reject);response.on('aborted',()=>reject(new Error('The update response was interrupted.')));
      response.on('data',chunk=>{bytes+=chunk.length;if(bytes>MAX_BYTES){request.destroy(new Error('The update response exceeded its size limit.'));return;}chunks.push(chunk);});
      response.on('end',()=>resolve({status:response.statusCode,headers:response.headers,body:Buffer.concat(chunks).toString('utf8')}));
    });
    request.on('error',reject);
  });
}
class UpdateService{
  constructor(directory,currentVersion,onChange=()=>{}){if(!version(currentVersion))throw new Error('Invalid installed version.');this.file=path.join(directory,'updates.json');this.currentVersion=currentVersion;this.onChange=onChange;this.state=defaults();this.queue=Promise.resolve();this.pending=null;this.status='idle';this.message='No update check yet.';this.closed=false;this.warning='';}
  now(){return Date.now();}
  fetchPage(page,signal){return fetchPage(page,signal);}
  async load(){try{if((await fs.stat(this.file)).size>16384)throw new Error('Oversized preferences.');this.state=validateState(JSON.parse(await fs.readFile(this.file,'utf8')));this.status=this.snapshot().available?'available':this.state.lastChecked?'current':'idle';if(this.state.lastChecked)this.message=this.status==='available'?`Version ${this.state.available.version} was available at the last successful check.`:'No newer installer was found at the last successful check.';}catch(error){if(error.code!=='ENOENT'){this.warning='Update preferences could not be read. Automatic checking is off; the file is preserved.';this.damaged=true;}}return this.snapshot();}
  snapshot(){const available=this.state.available&&compare(this.state.available.version,this.currentVersion)>0?this.state.available:null;return {automatic:this.state.automatic,lastChecked:this.state.lastChecked,retryAt:this.state.retryAt,checking:!!this.pending,status:this.status,message:this.message,warning:this.warning,available,notify:!!(available&&this.status==='available'&&this.state.automatic&&this.state.skippedVersion!==available.version&&this.now()>=this.state.remindAfter)};}
  emit(){try{this.onChange(this.snapshot());}catch{/* A disappearing display must not fail an update check or preference write. */}}
  change(fn){const operation=this.queue.then(async()=>{const next=structuredClone(this.state);fn(next);validateState(next);if(this.damaged){await fs.copyFile(this.file,this.file+`.damaged-${this.now()}`);this.damaged=false;}await writeAtomic(this.file,JSON.stringify(next));this.state=next;this.warning='';this.emit();return this.snapshot();});this.queue=operation.catch(()=>{});return operation;}
  async setAutomatic(enabled){if(typeof enabled!=='boolean')throw new Error('Choose whether to check automatically.');const result=await this.change(s=>{s.automatic=enabled;});if(!enabled&&this.origin==='automatic')this.controller?.abort();return result;}
  due(){return !this.closed&&this.state.automatic&&!this.pending&&this.now()>=Math.max(this.state.nextCheckAt,this.state.retryAt);}
  check(origin='manual'){
    if(!['manual','automatic'].includes(origin))return Promise.reject(new Error('Invalid update check.'));
    if(this.pending)return this.pending;
    if(this.closed||origin==='automatic'&&!this.due())return Promise.resolve(this.snapshot());
    if(this.now()<this.state.retryAt){this.message='Please wait before checking again.';return Promise.resolve(this.snapshot());}
    this.origin=origin;this.status='checking';this.message='Checking GitHub for updates…';
    this.pending=this.run().finally(()=>{this.pending=null;this.emit();}).then(()=>this.snapshot());this.emit();return this.pending;
  }
  async run(){
    const started=this.now();this.controller=new AbortController();const timer=setTimeout(()=>this.controller.abort(),8000);
    try{
      await this.change(s=>{s.lastAttempt=started;s.nextCheckAt=started+INTERVAL;s.retryAt=started+MIN_CHECK;});
      let newest=null;
      for(let page=1;page<=MAX_PAGES;page++){
        const response=await this.fetchPage(page,this.controller.signal);
        if(response.status===403||response.status===429){const error=new Error('GitHub has temporarily limited update checks. Try again later.');error.retryAt=retryTime(response.headers,this.now());error.kind='rate-limited';throw error;}
        if(response.status===404)throw Object.assign(new Error('The public release source is unavailable. Try again later.'),{kind:'error'});
        if(response.status!==200)throw Object.assign(new Error('GitHub could not complete the update check. Try again later.'),{kind:'error'});
        if(Buffer.byteLength(response.body)>MAX_BYTES)throw new Error('The update response exceeded its size limit.');
        let releases;try{releases=JSON.parse(response.body);}catch{throw new Error('GitHub returned unreadable release data.');}
        if(!Array.isArray(releases)||releases.length>PAGE_SIZE)throw new Error('GitHub returned invalid release data.');
        for(const release of releases){const found=candidate(release);if(found&&compare(found.version,this.currentVersion)>0&&(!newest||compare(found.version,newest.version)>0))newest=found;}
        const more=/<[^>]+>;\s*rel="next"/.test(String(response.headers.link||''));
        if(!more)break;
        if(page===MAX_PAGES)throw new Error('The release list exceeded the check limit. View GitHub releases or try again later.');
        // Construct each page locally; never follow a URL supplied by a response.
      }
      if(this.closed)return this.snapshot();
      await this.change(s=>{if(newest?.version!==s.available?.version)s.remindAfter=0;s.available=newest;s.lastChecked=this.now();});
      this.status=newest?'available':'current';this.message=newest?`Version ${newest.version} is available.`:'No newer published installer is available.';
    }catch(error){
      if(this.closed)return this.snapshot();
      this.status=error.kind||'unavailable';this.message=error.kind?error.message:'The update check could not complete. Check your connection and try again.';
      if(this.controller.signal.aborted)this.message='The update check was cancelled or timed out. Studying is still available.';
      try{await this.change(s=>{s.nextCheckAt=this.now()+RETRY;if(error.retryAt){s.retryAt=error.retryAt;s.nextCheckAt=Math.max(s.nextCheckAt,error.retryAt);}});}catch{this.message='Update preferences could not be saved. Your study library is unaffected.';}
    }finally{clearTimeout(timer);this.controller=null;}
    return this.snapshot();
  }
  async remind(action,selected){const available=this.snapshot().available;if(!available||selected!==available.version||!['later','skip'].includes(action))throw new Error('Check the available update again.');return this.change(s=>{if(action==='skip'){s.skippedVersion=selected;s.remindAfter=0;}else s.remindAfter=this.now()+24*60*60*1000;});}
  openPage(selected){const available=this.snapshot().available;if(!available||selected!==available.version)throw new Error('Check the available update again.');return releasePage(available.tag);}
  async close(){this.closed=true;this.controller?.abort();await this.pending;await this.queue;}
}
module.exports={UpdateService,version,compare,candidate,releasePage,fetchPage,validateState,defaults,INTERVAL,RETRY,MIN_CHECK,MAX_BYTES,MAX_PAGES,PAGE_SIZE,API_ROOT};
