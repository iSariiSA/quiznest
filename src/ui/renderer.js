const api=window.quiznet;
const content=window.QuiznetContent;
const questionModel=window.QuiznetQuestions;
const timing=window.QuiznetTiming;
const practice=window.QuiznetPractice;
const brief=window.QuiznetInstructions;
let instructionDraft=brief.defaults(),instructionDestination=null,startDraft=null;
const optionLabel=questionModel.optionLabel;
const EDITOR_PAGE_SIZE=25,REVIEW_PAGE_SIZE=50;
const $=selector=>document.querySelector(selector);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rich=(source,q)=>`<div class="rich-content ${['html','markdown'].includes(q.format)?'html-content':'text-content'}" dir="auto">${content.render(source,q.format)}</div>`;
const promptBody=q=>`${rich(q.prompt,q)}${content.image(q)}${content.code(q)}`;
const icon=(name,cls='')=>`<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${({grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',book:'<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',settings:'<path d="m9 3-1 3-3 1-2 3 2 2-1 3 2 3 3-1 2 3h3l1-3 3-1 2-3-2-2 1-3-2-3-3 1-2-2Z"/><circle cx="12" cy="12" r="3"/>',plus:'<path d="M12 5v14M5 12h14"/>',arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',chevron:'<path d="m9 5 7 7-7 7"/>',down:'<path d="m6 9 6 6 6-6"/>',upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5"/>',download:'<path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',check:'<path d="m5 12 4 4L19 6"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',leaf:'<path d="M20 3C7 2 2 9 5 16c4 5 13 2 15-13ZM4 21l10-11"/>',shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',edit:'<path d="m4 16 12-12 4 4L8 20H4v-4ZM14 6l4 4"/>',trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5"/>',spark:'<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>',play:'<path d="m8 4 12 8-12 8V4Z"/>',folder:'<path d="M3 7V4h7l3 3h8v13H3V7Z"/>',help:'<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4M12 17h.01"/>',back:'<path d="M20 12H4m6-6-6 6 6 6"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',flag:'<path d="M5 21V4m0 0c4-4 9 4 14 0v10c-5 4-10-4-14 0"/>',more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>'})[name]||''}</svg>`;
let data,meta,view={page:'library',courseId:null,unitId:null},busy=false,modal=null,previousFocus=null,editor=null;
let updateState=null,updateShown=null;
let navigationHidden=false,focusNavigationExpanded=false;
function updateNavigation(){
  const focused=view.page==='quiz';
  document.body.classList.toggle('navigation-hidden',navigationHidden);
  document.body.classList.toggle('navigation-compact',focused&&!focusNavigationExpanded&&!navigationHidden);
  document.body.dataset.page=view.page;
  const toggle=$('#navigation-toggle');
  toggle.setAttribute('aria-expanded',String(!navigationHidden&&(!focused||focusNavigationExpanded)));
  toggle.setAttribute('aria-label',navigationHidden||focused&&!focusNavigationExpanded?'Show navigation':'Hide navigation');
}
function toggleNavigation(){
  if(view.page==='quiz'&&!navigationHidden&&!focusNavigationExpanded)focusNavigationExpanded=true;
  else {navigationHidden=!navigationHidden;if(view.page==='quiz')focusNavigationExpanded=!navigationHidden;}
  updateNavigation();
}
let draftTimer=null,draftOperation=Promise.resolve(),draftRevision=0,pendingDraft=null;
function draftStatus(message){const status=$('#draft-status');if(status)status.textContent=message;}
function scheduleDraft(){if(!editor)return;editor.dirty=true;draftRevision++;draftStatus('Saving draft…');clearTimeout(draftTimer);draftTimer=setTimeout(()=>flushDraft().catch(error=>toast(error.message)),500);}
function flushDraft(){
  clearTimeout(draftTimer);
  if(!editor?.dirty&&!pendingDraft)return draftOperation;
  const current=editor,revision=draftRevision;
  if(current?.dirty)pendingDraft=Object.fromEntries(['quizId','courseId','unitId','destination','title','questions','page'].filter(k=>current[k]!==undefined).map(k=>[k,structuredClone(current[k])]));
  const payload=pendingDraft;
  draftOperation=draftOperation.catch(()=>{}).then(()=>api.saveDraft(payload)).then(saved=>{meta.draft=saved;if(pendingDraft===payload)pendingDraft=null;if(current&&editor===current&&draftRevision===revision){current.dirty=false;draftStatus('Draft saved on this device');}return saved;}).catch(error=>{draftStatus('Draft not saved — retry by editing or closing');throw error;});
  return draftOperation;
}
async function clearDraft(){clearTimeout(draftTimer);await draftOperation.catch(()=>{});await api.saveDraft(null);pendingDraft=null;draftOperation=Promise.resolve();meta.draft=null;meta.draftError='';if(editor)editor.dirty=false;}
async function recoverDraft(){await flushDraft();const saved=await api.readDraft();if(!saved){meta.draft=null;render();return;}editor=saved.editor;if(editor.quizId&&!find(editor.quizId)){delete editor.quizId;delete editor.courseId;delete editor.unitId;toast('The original quiz is unavailable. Save this draft as a new quiz.');}renderEditor();}
function draftBanner(){return meta.draft?`<div class="resume-banner draft-banner"><span>${esc(meta.draft.title||'Untitled quiz')} <small>· Editor draft</small></span><div class="button-row">${button('Recover draft','recoverDraft','secondary')}${button('Discard draft','discardDraft','text')}</div></div>`:meta.draftError?`<p class="muted">${esc(meta.draftError)}</p>`:'';}
api.onBeforeClose(flushDraft);
const flatten=()=>data.courses.flatMap(course=>course.units.flatMap(unit=>unit.quizzes.map(quiz=>({course,unit,quiz}))));
const find=id=>flatten().find(item=>item.quiz.id===id);
const courseBy=id=>data.courses.find(c=>c.id===id);
function destinationDraft(courseId,unitId,automatic=false){return {course:courseId|| (automatic?'':'new'),unit:unitId||(automatic?'':'new'),courseTitle:'',unitTitle:''};}
function destinationTarget(d){return !d.course?undefined:{...(d.course==='new'?{courseTitle:d.courseTitle.trim()}:{courseId:d.course}),...(d.unit==='new'?{unitTitle:d.unitTitle.trim()}:d.unit?{unitId:d.unit}:{})};}
function destinationNames(d){const c=courseBy(d.course);return {course:d.course==='new'?d.courseTitle.trim():c?.title,unit:d.unit==='new'?d.unitTitle.trim():c?.units.find(u=>u.id===d.unit)?.title};}
function destinationFields(d,kind,automatic=false){
  if(d.course!=='new'&&d.course&&!courseBy(d.course)){d.course=automatic?'':'new';d.unit=automatic?'':'new';}
  if(d.unit&&d.unit!=='new'&&!courseBy(d.course)?.units.some(u=>u.id===d.unit))d.unit=automatic?'':'new';
  const c=courseBy(d.course),auto=kind==='instructions'?'Let the agent decide':'From file';
  return `<fieldset class="quiz-destination" data-destination="${kind}" data-automatic="${automatic}"><legend>${kind==='move'?'Move to':'Save in'}</legend><div class="destination-grid"><div><label>Course<select aria-label="Course" data-place="course" ${kind==='import'?'id="import-target" name="target"':''}>${automatic?`<option value="" ${!d.course?'selected':''}>${auto}</option>`:''}<option value="new" ${d.course==='new'?'selected':''}>New course…</option>${data.courses.map(c=>`<option value="${esc(c.id)}" ${d.course===c.id?'selected':''}>${esc(c.title)}</option>`).join('')}</select></label>${d.course==='new'?`<label>New course name<input data-place="courseTitle" value="${esc(d.courseTitle)}" maxlength="200" required placeholder="Course name"></label>`:''}</div>${d.course?`<div><label>Unit<select name="unit" aria-label="Unit" data-place="unit">${automatic?`<option value="" ${!d.unit?'selected':''}>${auto}</option>`:''}<option value="new" ${d.unit==='new'?'selected':''}>New unit…</option>${(c?.units||[]).map(u=>`<option value="${esc(u.id)}" ${d.unit===u.id?'selected':''}>${esc(u.title)}</option>`).join('')}</select></label>${d.unit==='new'?`<label>New unit name<input data-place="unitTitle" value="${esc(d.unitTitle)}" maxlength="200" required placeholder="Unit name"></label>`:''}</div>`:''}</div><p class="destination-summary" aria-live="polite">${destinationSummary(d,kind)}</p></fieldset>`;
}
function destinationSummary(d,kind){const names=destinationNames(d);return d.course?`${esc(names.course||'New course')} → ${esc(names.unit||(d.unit==='new'?'New unit':kind==='instructions'?'Agent chooses unit':'Units from file'))}`:kind==='instructions'?'The agent will choose course and unit names from your material.':'Use the course and unit names in the file.';}
function updateDestination(el){
  const group=el.closest('[data-destination]');if(!group)return false;
  const kind=group.dataset.destination,d=kind==='instructions'?instructionDestination:modal?.destination;if(!d)return false;
  d[el.dataset.place]=el.value;
  if(el.dataset.place==='course')d.unit=group.dataset.automatic==='true'?'':'new';
  if(el.tagName==='SELECT'){const key=el.dataset.place;group.outerHTML=destinationFields(d,kind,group.dataset.automatic==='true');$(`[data-destination="${kind}"] [data-place="${key}"]`)?.focus();}
  else group.querySelector('.destination-summary').innerHTML=destinationSummary(d,kind);
  if(kind==='editor')scheduleDraft();
  if(kind==='instructions')updateBriefSummary();
  return true;
}
async function navigateTarget(target){const c=target?.courseId?courseBy(target.courseId):data.courses.find(c=>c.title.toLowerCase()===target?.courseTitle?.toLowerCase());const u=c?.units.find(u=>target?.unitId?u.id===target.unitId:u.title.toLowerCase()===target?.unitTitle?.toLowerCase());await navigate('library',c?.id,u?.id);}
async function prepareInstructions(courseId,unitId){if(courseId)instructionDestination=destinationDraft(courseId,unitId,true);instructionDestination??=destinationDraft(null,null,true);await navigate('instructions',courseId,unitId);}
const sessionQuiz=()=>practice.sessionQuiz(data,data.activeSession);
const stats=c=>({units:c.units.length,quizzes:c.units.reduce((n,u)=>n+u.quizzes.length,0),questions:c.units.reduce((n,u)=>n+u.quizzes.reduce((s,q)=>s+q.questions.length,0),0)});
const plural=(n,s)=>`${n} ${s}${n===1?'':'s'}`;
const pct=a=>Math.round(a.score/a.total*100);
const date=s=>new Date(s).toLocaleDateString(undefined,{month:'short',day:'numeric'});
const act=(name,attrs='')=>`data-action="${name}" ${attrs}`;
const button=(label,action,cls='secondary',attrs='')=>`<button type="button" class="btn ${cls}" ${act(action,attrs)}>${label}</button>`;
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('visible'),4500);}
api.onNotice(message=>toast(message));
function receiveUpdates(state){updateState=state;const section=$('#update-settings');if(section)section.innerHTML=updateSettings();setTimeout(maybeShowUpdate,0);}
api.onUpdates(receiveUpdates);
function updateSettings(){const s=updateState;if(!s)return '<p class="muted">Update settings are loading.</p>';return `<div class="update-heading"><h2>Updates</h2>${button(s.checking?'Checking…':'Check for updates','checkUpdates','secondary',s.checking?'disabled':'')}</div><label class="update-preference"><input id="automatic-updates" type="checkbox" ${s.automatic?'checked':''}> Check automatically every two days</label><p class="muted">Optional internet access to GitHub for public release information. Study material stays on this computer. Automatic checking is off until you choose it.</p><p class="update-status" role="status">${esc(s.message)}${s.lastChecked?` Last successful check: ${esc(new Date(s.lastChecked).toLocaleString())}.`:''}</p>${s.warning?`<p class="muted">${esc(s.warning)}</p>`:''}${s.available?button(`View update ${esc(s.available.version)}`,'viewUpdate','text'):''}`;}
function showUpdate(){if(!updateState?.available)return;const v=updateState.available.version;updateShown=v;showModal('Update available',`<p>Version <strong>${esc(v)}</strong> is available. Installed version: ${esc(meta.version)}.</p><p>Download opens the Quiznet release page on GitHub in your browser. Run <strong>Quiznet-Setup.exe</strong> when you are ready; it updates the existing app and preserves your study data.</p><p class="muted">The installer is currently unsigned. Installation is your choice and never starts automatically.</p>`,`${button('Skip this version','skipUpdate','text',`data-version="${esc(v)}"`)}${button('Later','laterUpdate','secondary',`data-version="${esc(v)}"`)}${button('Download update','downloadUpdate','primary',`data-version="${esc(v)}"`)}`);modal.updateVersion=v;}
function maybeShowUpdate(){if(!data||!updateState?.notify||updateState.checking||updateShown===updateState.available?.version||busy||modal||editor||!['library','settings'].includes(view.page)||data.activeSession?.timing?.runningSince!=null)return;showUpdate();}
async function checkForUpdates(){receiveUpdates({...updateState,checking:true,message:'Checking GitHub for updates…'});try{const state=await api.checkUpdates();receiveUpdates(state);if(view.page==='settings'){if(state.available&&state.status==='available'&&!modal&&!editor&&!busy)showUpdate();else if(!state.available||state.status!=='available')toast(state.message);}}catch(error){try{receiveUpdates(await api.getUpdates());}catch{}if(view.page==='settings')toast(error.message);}}
function postponeUpdateDialog(){if(!modal?.updateVersion)return;const v=modal.updateVersion;modal.updateVersion=null;if(updateState)updateState.notify=false;api.remindUpdate('later',v).then(state=>{updateShown=null;receiveUpdates(state);}).catch(error=>toast(error.message));}
async function change(action){
  const main=$('#main'),controls=view.page==='quiz'?[...document.querySelectorAll('button[data-action], #question-jump')].filter(control=>!control.disabled):[];
  if(controls.length){main.setAttribute('aria-busy','true');for(const control of controls)control.disabled=true;}
  try{data=await api.change(action);return data;}
  finally{if(controls.length){for(const control of controls)if(control.isConnected)control.disabled=false;main.removeAttribute('aria-busy');}}
}
async function navigate(page,courseId=null,unitId=null){if(view.page==='quiz'&&page!=='quiz'&&data.activeSession)await change({type:'pause'});view={page,courseId,unitId};closeModal();render();$('#main').scrollTop=0;}
function render(){
  closeMenu();
  updateNavigation();
  $('#sidebar').innerHTML=`<button class="brand" ${act('home')} aria-label="Quiznet home"><img src="../../assets/brand/mark.svg" alt="" class="brand-mark"><span>Quiznet</span></button><nav class="app-nav" aria-label="Navigation">${[['home','Library','book',['library','instructions'].includes(view.page)],['history','History','clock',['history','result'].includes(view.page)],['explore','Explore','grid',view.page==='explore']].map(([action,label,mark,active])=>`<button class="nav-item ${active?'active':''}" ${act(action)} aria-label="${label}" title="${label}" ${active?'aria-current="page"':''}>${icon(mark)}<span>${label}${action==='explore'?'<small>Coming soon</small>':''}</span></button>`).join('')}</nav><div class="sidebar-bottom"><button class="nav-item ${view.page==='settings'?'active':''}" ${act('settings')} aria-label="Settings" title="Settings" ${view.page==='settings'?'aria-current="page"':''}>${icon('settings')}<span>Settings</span></button></div>`;

  const c=courseBy(view.courseId),u=c?.units.find(item=>item.id===view.unitId);
  const crumb=view.page==='library'?(c?`<button ${act('home')}>Courses</button>${icon('chevron')}<button ${act('course',`data-id="${c.id}"`)}>${esc(c.title)}</button>${u?`${icon('chevron')}<span>${esc(u.title)}</span>`:''}`:'<span>Courses</span>'):view.page==='instructions'?'<span>Quiz instructions</span>':view.page==='explore'?'<span>Explore</span>':view.page==='history'?'<span>History</span>':view.page==='settings'?'<span>Settings</span>':view.page==='quiz'?'<span>Quiz</span>':'<span>Results</span>';
  const tools=view.page==='library'?`${!c?'<label class="course-search"><span class="sr-only">Search courses</span><input id="library-search" type="search" placeholder="Search courses…" autocomplete="off"></label>':''}${button('Prepare a quiz','instructions','secondary')}${button(icon('search'),'search','icon-button secondary','aria-label="Search" title="Search (Ctrl+K)"')}${button(icon('plus')+' '+(u?'New quiz':c?'New unit':'New course'),u?'newQuiz':c?'newUnit':'newCourse','primary',`${c?`data-course="${c.id}"`:''} ${u?`data-unit="${u.id}"`:''}`)}${c?button(icon('more'),u?'unitMenu':'courseMenu','icon-button secondary',`data-course="${c.id}" ${u?`data-unit="${u.id}"`:''} aria-label="${u?'Unit':'Course'} menu" aria-haspopup="menu" aria-expanded="false"`):''}`:'';
  $('#main').innerHTML=`<header class="topbar"><div class="breadcrumbs">${crumb}</div><div class="top-actions">${tools}<button class="icon-button app-menu" ${act('appMenu')} aria-label="App menu" aria-haspopup="menu" aria-expanded="false">${icon('more')}</button></div></header><div class="main-content" id="content">${pageHeading(c,u)}${view.page==='quiz'?quizView():view.page==='result'?resultView():view.page==='history'?historyView():view.page==='settings'?settingsView():view.page==='explore'?exploreView():view.page==='instructions'?instructionsView():c?courseView(c,u):libraryView()}</div>`;
  updateTimer();
  setTimeout(maybeShowUpdate,0);
}
function pageHeading(c,u){
  const titles={library:u?.title||c?.title||'Courses',history:'History',settings:'Settings'};
  const title=titles[view.page];if(!title)return '';
  const description=view.page==='library'?(u?plural(u.quizzes.length,'quiz'):c?plural(c.units.length,'unit')+' · '+plural(stats(c).quizzes,'quiz'):plural(data.courses.length,'course')+' · '+plural(flatten().length,'quiz')):view.page==='settings'?'Manage this device.':'Your completed study sessions.';
  return `<div class="page-heading"><h1>${esc(title)}</h1><p>${esc(description)}</p></div>`;
}
function updateTimer(){
  const s=data?.activeSession,t=s?.timing,now=Date.now(),el=$('#quiz-timer'),question=$('#question-timer');
  if(el){el.textContent=t?timing.duration(timing.elapsed(t,now)):'00:00';el.title=t?.partial?'Time recorded since this older attempt was resumed':'Time spent in this quiz';}
  if(question)question.textContent=`Question ${timing.duration(t?(t.questionMs[s.questionIds[s.position]]||0)+timing.elapsed(t,now)-t.elapsedMs:0)}`;
}
setInterval(updateTimer,500);
function exploreView(){return '<section class="explore-placeholder" aria-labelledby="explore-title"><h1 id="explore-title">Explore</h1><p>Coming soon.</p></section>';}
function instructionField(f){
  const p=instructionDraft[f.id],selected=p.mode==='value'?(f.choices?p.value:'value'):p.mode;
  const disabled=f.id==='codeLanguage'&&instructionDraft.code.mode==='value'&&instructionDraft.code.value==='none';
  const choices=[['auto','Let the agent decide'],['ask','Ask me'],...(f.choices||[['value',f.kind==='number'?'Set a number':'Specify…']])];
  return `<div class="instruction-field"><label for="brief-${f.id}">${esc(f.label)}</label><select id="brief-${f.id}" data-brief-mode="${f.id}" ${disabled?'disabled':''}>${choices.map(([id,label])=>`<option value="${id}" ${id===selected?'selected':''}>${esc(label)}</option>`).join('')}</select>${!f.choices?`<input id="brief-value-${f.id}" data-brief-value="${f.id}" aria-label="${esc(f.label)} value" type="${f.kind==='number'?'number':'text'}" ${f.kind==='number'?`min="${f.min||1}" max="${f.max}" step="1"`:`maxlength="${f.max||2000}"`} value="${esc(p.value)}" placeholder="${esc(f.placeholder||f.label)}" ${p.mode==='value'&&!disabled?'required':'hidden disabled'}>`:''}${f.id==='count'?`<p class="muted instruction-count-summary" aria-live="polite">${esc(instructionCountSummary())}</p>`:''}</div>`;
}
function instructionCountSummary(){
  const mix=brief.mixCounts(instructionDraft);
  if(!mix)return '';
  return mix.open?`Mix minimum: ${plural(mix.minimum,'question')}. Counts for ${plural(mix.open,'type')} are still undecided.`:`Mix total: ${plural(mix.fixed,'question')}.`;
}
function instructionsView(){
  const types=instructionDraft.types;
  return `<section class="instructions-page"><h1>Prepare a quiz</h1><p class="instructions-intro">Choose what matters to you. Give the instructions and your study material to an agent, then import the quiz file it returns.</p><div class="instructions-layout"><form id="instructions-form">${destinationFields(instructionDestination,'instructions',true)}<div class="instruction-section"><div class="instruction-field"><label for="brief-types">Question types</label><select id="brief-types" data-brief-mode="types">${[['auto','Let the agent decide'],['ask','Ask me'],['value','Choose my mix']].map(([id,label])=>`<option value="${id}" ${types.mode===id?'selected':''}>${label}</option>`).join('')}</select></div><div class="instruction-mix" ${types.mode==='value'?'':'hidden'}>${questionModel.types.map(t=>{const p=types.value.find(v=>v.type===t.id);return `<div class="instruction-type"><label for="brief-type-${t.id}">${esc(brief.typeLabel(t))}</label><select id="brief-type-${t.id}" data-brief-type="${t.id}">${[['auto','Include · agent decides count'],['value','Exact count'],['ask','Ask me for the count'],['omit','Exclude']].map(([id,label])=>`<option value="${id}" ${p.mode===id?'selected':''}>${label}</option>`).join('')}</select><input type="number" min="1" max="${brief.MAX_QUESTIONS}" step="1" data-brief-count="${t.id}" aria-label="${esc(brief.typeLabel(t))} count" value="${esc(p.value)}" ${p.mode==='value'?(types.mode==='value'?'required':'disabled'):'hidden disabled'}></div>`;}).join('')}</div>${brief.fields.filter(f=>f.basic).map(instructionField).join('')}</div><details class="instruction-advanced"><summary>Advanced <span>Difficulty, language, images, feedback, and names</span></summary><p class="muted">Every setting is optional. Choose “Ask me” to have the agent ask before writing questions.</p><div class="instruction-grid">${brief.fields.filter(f=>!f.basic&&!['course','unit'].includes(f.id)).map(instructionField).join('')}</div></details><p class="instruction-error" role="alert"></p><div class="instruction-actions">${button(`${icon('download')} Save Markdown`,'saveInstructions','primary')}${button('Copy instructions','copyInstructions')}${button('Preview','previewInstructions','text')}</div></form><aside class="brief-summary" id="brief-summary" aria-label="Your brief">${instructionSummary()}</aside></div><p class="muted instruction-next">Attach the saved .md file and your chapter or notes to your preferred agent. After it creates quiznet-quiz.json, ${button('Import quiz…','import','text')}<br>Quiznet does not send your material anywhere. Your choices stay in this draft while the app is open.</p></section>`;
}
function instructionSummary(){
  const names=destinationNames(instructionDestination),count=instructionDraft.count,types=instructionDraft.types;
  const countText=count.mode==='value'?plural(count.value,'question'):count.mode==='ask'?'Ask me for the count':'Agent chooses the count';
  const typeText=types.mode==='value'?types.value.filter(t=>t.mode!=='omit').map(t=>questionModel.types.find(item=>item.id===t.type)?.label).join(', '):types.mode==='ask'?'Ask me for question types':'Agent chooses question types';
  return `<h2>Your brief</h2><p class="muted">A summary of your instructions.</p><ul><li>${esc(names.course||'Agent chooses the course')}</li><li>${esc(names.unit||'Agent chooses the unit')}</li><li>${esc(countText)}</li><li>${esc(typeText)}</li></ul><h3>Next steps</h3><ol><li><strong>Prepare instructions</strong><span>Save or copy your brief.</span></li><li><strong>Use with your agent</strong><span>Attach your instructions and material.</span></li><li><strong>Import quiz</strong><span>Review the returned quiz file.</span></li></ol><p class="muted">Your material stays local. You choose what to share.</p>`;
}
function updateBriefSummary(){const summary=$('#brief-summary');if(summary)summary.innerHTML=instructionSummary();}
function updateInstructionControl(el){
  if(el.dataset.briefMode){
    const id=el.dataset.briefMode,f=brief.fields.find(f=>f.id===id),p=instructionDraft[id];
    p.mode=['auto','ask'].includes(el.value)?el.value:'value';
    if(f?.choices&&p.mode==='value')p.value=el.value;
    const extra=id==='types'?$('.instruction-mix'):$(`#brief-value-${id}`);
    if(extra){extra.hidden=p.mode!=='value';if(extra.tagName==='INPUT'){extra.disabled=extra.hidden;extra.required=!extra.hidden;}else for(const input of extra.querySelectorAll('input')){input.disabled=extra.hidden||input.hidden;input.required=!input.disabled;}}
  }
  if(el.dataset.briefValue){const f=brief.fields.find(f=>f.id===el.dataset.briefValue);instructionDraft[f.id].value=f.kind==='number'?Number(el.value):el.value;}
  if(el.dataset.briefType){const p=instructionDraft.types.value.find(v=>v.type===el.dataset.briefType);p.mode=el.value;const input=el.parentElement.querySelector('input');input.hidden=p.mode!=='value';input.disabled=input.hidden;input.required=!input.hidden;}
  if(el.dataset.briefCount)instructionDraft.types.value.find(v=>v.type===el.dataset.briefCount).value=Number(el.value);
  if(el.dataset.briefType||el.dataset.briefCount||el.dataset.briefMode==='types'){
    const mix=brief.mixCounts(instructionDraft),count=instructionDraft.count;
    if(mix&&count.mode!=='ask'){
      if(!mix.open)instructionDraft.count={mode:'value',value:mix.fixed};
      else if(count.mode==='value'&&Number.isInteger(count.value)&&count.value<mix.minimum)count.value=mix.minimum;
      $('#brief-count').closest('.instruction-field').outerHTML=instructionField(brief.fields.find(f=>f.id==='count'));
    }
  }
  if(el.dataset.briefMode==='code'){
    if(instructionDraft.code.mode==='value'&&instructionDraft.code.value==='none')instructionDraft.codeLanguage={mode:'auto',value:''};
    $('#brief-codeLanguage').closest('.instruction-field').outerHTML=instructionField(brief.fields.find(f=>f.id==='codeLanguage'));
  }
  $('.instruction-count-summary').textContent=instructionCountSummary();
  const error=$('.instruction-error');if(error)error.textContent='';
  updateBriefSummary();
}
async function exportInstructions(action){
  const form=$('#instructions-form');if(!form.reportValidity())return;
  try{
    const preferences=structuredClone(instructionDraft),names=destinationNames(instructionDestination);
    for(const key of ['course','unit'])preferences[key]=names[key]?{mode:'value',value:names[key]}:{mode:'auto',value:''};
    const markdown=brief.generate(preferences);
    if(action==='previewInstructions'){showModal('Quiz instructions',`<label>Markdown instructions<textarea class="instruction-preview" aria-label="Markdown instructions" readonly>${esc(markdown)}</textarea></label>`,button('Close','closeModal','primary'),null,true);return;}
    if(await api.instructions(action==='saveInstructions'?'save':'copy',preferences))toast(action==='saveInstructions'?'Instructions saved. Attach them with your study material.':'Instructions copied.');
  }catch(error){$('.instruction-error').textContent=error.message;$('.instruction-error').scrollIntoView({block:'nearest'});}
}
function attemptComparison(a){
  const ids=new Set(a.questions.map(q=>q.id));
  const previous=data.attempts.slice(0,data.attempts.findIndex(item=>item.id===a.id)).findLast(item=>item.quizId===a.quizId&&Boolean(item.missedOnly)===Boolean(a.missedOnly)&&(item.practice?.feedback||'review')===(a.practice?.feedback||'review')&&item.questions.length===ids.size&&item.questions.every(q=>ids.has(q.id)));
  if(!previous)return '';
  const difference=pct(a)-pct(previous),score=difference?`${Math.abs(difference)} points ${difference>0?'higher':'lower'}`:'Same score';
  const comparable=a.timingMode==='active'&&previous.timingMode==='active',delta=a.elapsedSeconds-previous.elapsedSeconds;
  return `<p class="attempt-comparison">Previous: ${pct(previous)}%${comparable?` · ${timing.duration(previous.elapsedSeconds*1000)}`:''}. ${score}${comparable?` · ${delta?`${timing.duration(Math.abs(delta)*1000)} ${delta<0?'faster':'slower'}`:'Same time'}`:''}.</p>`;
}
function libraryView(){
  return `${resumeBanner()}${data.courses.length?`<table class="library-table"><thead><tr><th>Course</th><th>Units</th><th>Quizzes</th></tr></thead><tbody>${data.courses.map(c=>{const s=stats(c);return `<tr class="course-row"><td><button class="row-link" ${act('course',`data-id="${c.id}"`)}><span class="color-dot ${c.color}"></span>${esc(c.title)}</button></td><td>${s.units}</td><td>${s.quizzes}</td></tr>`;}).join('')}</tbody></table><p id="course-search-empty" class="empty-message" hidden role="status">No matching courses.</p>`:empty('No courses yet.','newCourse','New course')}`;
}
function resumeBanner(){return draftBanner()+(data.activeSession?`<div class="resume-banner"><span>${esc(sessionQuiz()?.title)} <small>· In progress</small></span>${button('Resume','resume','secondary')}</div>`:'');}
function courseView(c,selectedUnit){
  const units=selectedUnit?[selectedUnit]:c.units;
  return `${resumeBanner()}${units.map(u=>`<section class="unit-section"><div class="unit-heading">${selectedUnit?`<h2>Quizzes</h2>`:`<button class="unit-link" ${act('unit',`data-course="${c.id}" data-id="${u.id}"`)}>${esc(u.title)}${icon('chevron')}</button>`}${!selectedUnit?'<div class="button-row">'+button(icon('plus')+' New quiz','newQuiz','text',`data-course="${c.id}" data-unit="${u.id}" aria-label="New quiz in ${esc(u.title)}"`)+button(icon('more'),'unitMenu','icon-button text',`data-course="${c.id}" data-unit="${u.id}" aria-label="Manage ${esc(u.title)}" aria-haspopup="menu" aria-expanded="false"`)+'</div>':''}</div><div class="quiz-list">${u.quizzes.map(q=>quizRow(q,c,u)).join('')}${!u.quizzes.length?'<div class="empty-unit">No quizzes.</div>':''}</div></section>`).join('')}${!units.length?empty('No units yet.'):''}`;
}
function quizRow(q,c,u){
  const attempts=data.attempts.filter(a=>a.quizId===q.id&&!a.missedOnly),best=attempts.length?attempts.reduce((best,a)=>Math.max(best,pct(a)),0):null;
  return `<article class="quiz-row"><div class="quiz-info"><h3>${esc(q.title)}</h3><span>${plural(q.questions.length,'question')}${best!==null?` · Best ${best}%`:''}</span></div>${button('Start','start','secondary',`data-id="${q.id}" aria-label="Start ${esc(q.title)}"`)}${button(icon('more'),'quizMenu','icon-button text',`data-course="${c.id}" data-unit="${u.id}" data-id="${q.id}" aria-label="Options for ${esc(q.title)}" aria-haspopup="menu" aria-expanded="false"`)}</article>`;
}
function quizNavigation(s,questions,options){
  if(!options.showNavigator&&!options.showProgress&&!options.allowFlags)return '';
  const answered=questions.filter(q=>practice.answered(s,q)).length,flags=s.flaggedQuestionIds||[],pageSize=100,start=Math.floor(s.position/pageSize)*pageSize,end=Math.min(start+pageSize,questions.length),flagged=flags.includes(s.questionIds[s.position]);
  const tools=`${options.allowFlags?button(`${icon('flag')} ${flagged?'Flagged':'Flag'}`,'flagQuestion',`secondary flag-question ${flagged?'is-flagged':''}`,`aria-label="Flag for review" aria-pressed="${flagged}" title="${flagged?'Remove flag':'Flag this question for review'}"`):''}${options.allowFlags&&flags.length?button(`Review flags (${flags.length})`,'reviewFlags','text'):''}${options.showNavigator?button(icon('info'),'navigationHelp','text icon-button','aria-label="Question status help" title="Question status help"'):''}`;
  return `<section class="quiz-navigation" aria-label="Quiz navigation"><div class="quiz-progress-label">${options.showNavigator||options.showProgress?`<span>Question ${s.position+1} of ${questions.length} <span class="muted">· ${answered} answered</span></span>`:''}<div class="navigation-tools">${tools}</div></div>${options.showProgress?`<div class="quiz-progress" role="progressbar" aria-label="Question position" aria-valuemin="0" aria-valuemax="${questions.length}" aria-valuenow="${s.position+1}" aria-valuetext="Question ${s.position+1} of ${questions.length}"><span style="width:${(s.position+1)/questions.length*100}%"></span></div>`:''}${options.showNavigator?`<nav class="question-squares" aria-label="Questions">${questions.slice(start,end).map((q,j)=>{const i=start+j,done=practice.answered(s,q),flagged=flags.includes(q.id),current=i===s.position,label=`Question ${i+1}, ${done?'answered':'unanswered'}${flagged?', flagged':''}${current?', current':''}`;return `<button class="question-square ${flagged?'flagged':done?'answered':'unanswered'} ${current?'current':''}" ${act('position',`data-index="${i}"`)} aria-label="${label}" title="${label}" ${current?'aria-current="step"':''}>${i+1}${flagged?'<span class="flag-dot" aria-hidden="true"></span>':''}</button>`;}).join('')}</nav>${questions.length>pageSize?`<div class="palette-pages">${button('Previous','position','text',`data-index="${Math.max(0,start-pageSize)}" ${start===0?'disabled':''} aria-label="Previous question group"`)}<span>${start+1}–${end}</span>${button('Next','position','text',`data-index="${end}" ${end===questions.length?'disabled':''} aria-label="Next question group"`)}</div>`:''}`:''}</section>`;
}
function navigationHelp(){showModal('Question colors',`<div class="status-key">${[['current','Blue · Current'],['answered','Green · Answered'],['flagged','Orange · Flagged'],['unanswered','Red · Unanswered']].map(([state,label])=>`<div><span class="question-square ${state}" aria-hidden="true">1</span><span>${label}</span></div>`).join('')}</div><p class="muted">Colors show progress, not correctness.</p>`,button('Close','closeModal','primary'),null);}
function quizView(){
  const s=data.activeSession;if(!s){view.page='library';return libraryView();}
  const quiz=sessionQuiz(),byId=new Map(quiz.questions.map(q=>[q.id,q])),questions=s.questionIds.map(id=>byId.get(id)),q=questions[s.position];
  const type=questionModel.typeOf(q),selected=questionModel.selectedIndices(q,s.answers[q.id]),options={...practice.defaults,...s.practice};
  const checked=options.feedback==='instant'&&s.checkedQuestionIds.includes(q.id),correct=checked&&questionModel.isCorrect(q,s.answers[q.id]);
  return `<div class="quiz-header"><button class="back-link" ${act('pause')}>${icon('back')} Exit</button><h1>${esc(quiz.title)}</h1>${options.showTotalTimer?'<span class="quiz-timer" id="quiz-timer" role="timer" aria-label="Quiz elapsed time" title="Time spent in this quiz"></span>':''}<select class="question-jump" id="question-jump" aria-label="Go to question">${questions.map((item,i)=>`<option value="${i}" ${s.position===i?'selected':''}>${i+1} / ${questions.length}${(options.feedback==='instant'?s.checkedQuestionIds.includes(item.id):questionModel.validAnswer(item,s.answers[item.id]))?' ✓':''}</option>`).join('')}</select></div>${quizNavigation(s,questions,options)}<section class="question-panel"><div class="quiz-question-column"><div class="question-prompt" role="heading" aria-level="2">${promptBody(q)}</div><div class="question-meta"><p class="question-instruction" id="answer-instruction">${esc(type.label)}</p>${options.showQuestionTimer?'<span class="quiz-timer" id="question-timer" role="timer" aria-label="Time spent on this question" title="Includes previous visits to this question"></span>':''}</div></div><div class="quiz-answer-column"><div class="answer-options" role="group" aria-describedby="answer-instruction" aria-label="Answer choices">${q.options.map((o,i)=>`<button dir="auto" class="answer-option ${selected.includes(i)?'chosen':''} ${checked?(questionModel.correctIndices(q).includes(i)?'feedback-right':selected.includes(i)?'feedback-wrong':''):''}" ${act('answer',`data-question="${esc(q.id)}" data-index="${i}"`)} aria-pressed="${selected.includes(i)}" ${checked?'disabled':''}><span class="option-letter">${optionLabel(i)}</span><div class="answer-content">${rich(o,q)}</div><span class="option-radio ${type.selection==='multiple'?'option-checkbox':''}">${checked?(questionModel.correctIndices(q).includes(i)?icon('check'):selected.includes(i)?icon('close'):''):selected.includes(i)?icon('check'):''}</span></button>`).join('')}</div>${checked?`<div class="answer-feedback ${correct?'right':'wrong'}" role="status" aria-live="polite" aria-atomic="true"><strong>${icon(correct?'check':'close')} ${correct?'Correct':'Incorrect'}</strong>${!correct?`<div class="feedback-solution"><span>Correct answer${type.selection==='multiple'?'s':''}</span>${questionModel.correctIndices(q).map(i=>rich(q.options[i],q)).join('')}</div>`:''}${q.explanation?`<div class="feedback-explanation">${rich(q.explanation,q)}</div>`:''}</div>`:''}</div><div class="question-controls">${button(`${icon('back')} Previous`,'position','secondary',`data-index="${s.position-1}" ${s.position===0?'disabled':''}`)}${s.position===questions.length-1?button(options.feedback==='instant'&&type.selection==='multiple'&&!checked?'Next':'Finish','finish','primary'):button(`${checked&&type.selection==='multiple'?'Continue':'Next'} ${icon('arrow')}`,'advance','primary',`data-index="${s.position+1}"`)}</div></section>`;
}
function questionPager(total,size,page,kind){
  if(total<=size)return '';
  const pages=Math.ceil(total/size),label=kind==='editor'?'Edit questions':'Review questions';
  return `<div class="question-pages"><label for="${kind}-page">${label}<select id="${kind}-page" aria-label="${label}">${Array.from({length:pages},(_,index)=>`<option value="${index}" ${index===page?'selected':''}>${index*size+1}–${Math.min((index+1)*size,total)} of ${total}</option>`).join('')}</select></label><div class="button-row">${button('Previous questions',kind+'Page','secondary',`data-index="${page-1}" ${page===0?'disabled':''}`)}${button('Next questions',kind+'Page','secondary',`data-index="${page+1}" ${page===pages-1?'disabled':''}`)}</div></div>`;
}
function resultView(){
  const a=data.attempts.find(a=>a.id===view.attemptId)||data.attempts.at(-1);if(!a)return empty('No results yet.','home','Library');
  const page=view.reviewPage||0,start=page*REVIEW_PAGE_SIZE;
  const reviewQuestions=a.questions.map((q,i)=>({q,i})).filter(({q,i})=>!view.incorrectOnly||!questionModel.isCorrect(q,a.answers[i]));
  const answerContent=(q,indices)=>indices.map(index=>rich(q.options[index],q)).join('');
  return `<p class="eyebrow">Quiz complete</p><section class="result-summary"><div><h1>${esc(a.title)}</h1><span>${a.score} / ${a.total} correct${a.practice?.feedback==='instant'?' · Instant feedback':''} · ${a.timingMode==='active-partial'?'Tracked time':'Time'} ${timing.duration(a.elapsedSeconds*1000)}</span>${attemptComparison(a)}</div><strong class="score-value">${pct(a)}%</strong><div class="button-row">${button(icon('download')+' Export study report','studyReport','secondary',`data-id="${esc(a.id)}"`)}${practice.missed(a).length?button('Practice missed questions','startMissed','primary',`data-id="${a.id}"`):''}${find(a.quizId)?button('Retry','start','secondary',`data-id="${a.quizId}"`):''}${button('Library','home','secondary')}</div></section><div class="review-filters" role="group" aria-label="Review filter">${button('All questions','filterReview',view.incorrectOnly?'secondary':'secondary selected',`data-filter="all" aria-pressed="${!view.incorrectOnly}"`)}${button(`Incorrect (${a.total-a.score})`,'filterReview',view.incorrectOnly?'secondary selected':'secondary',`data-filter="incorrect" aria-pressed="${Boolean(view.incorrectOnly)}"`)}</div>${questionPager(reviewQuestions.length,REVIEW_PAGE_SIZE,page,'review')}<div class="review-list">${reviewQuestions.slice(start,start+REVIEW_PAGE_SIZE).map(({q,i})=>{const correct=questionModel.isCorrect(q,a.answers[i]);return `<article class="review-card"><div class="review-top"><span class="review-number">${i+1}.</span><div class="review-question" role="heading" aria-level="2">${promptBody(q)}</div><span class="review-badge ${correct?'right':'wrong'}">${icon(correct?'check':'close')} ${correct?'Correct':'Incorrect'}</span></div>${a.questionTimesMs?.[i]!=null?`<p class="question-time">Time spent ${timing.duration(a.questionTimesMs[i])}${a.timingMode==='active-partial'?' · Since resuming':''}</p>`:''}<div class="review-answers"><div class="${correct?'right-answer':'wrong-answer'}"><span>Your answer</span>${answerContent(q,questionModel.selectedIndices(q,a.answers[i]))}</div>${!correct?`<div class="right-answer"><span>Correct answer</span>${answerContent(q,questionModel.correctIndices(q))}</div>`:''}</div>${q.explanation?`<div class="explanation">${rich(q.explanation,q)}</div>`:''}</article>`;}).join('')}${!reviewQuestions.length?'<p class="empty-message">No incorrect answers in this attempt.</p>':''}</div>`;
}
function historyView(){return data.attempts.length?`<p class="muted">Open an attempt to review it or export a study report for an agent.</p><div class="history-list">${[...data.attempts].reverse().map(a=>`<button class="history-row" ${act('result',`data-id="${a.id}"`)}><div><strong>${esc(a.title)}</strong><span>${date(a.completedAt)} · ${a.score} / ${a.total} correct${a.practice?.feedback==='instant'?' · Instant feedback':''} · ${timing.duration(a.elapsedSeconds*1000)}</span></div><span class="history-score">${pct(a)}%</span>${icon('chevron')}</button>`).join('')}</div>`:'<p class="empty-message">No completed quizzes.</p>';}
async function studyReportDialog(id){
  const info=await api.studyReportInfo(id);
  const timeNote=info.coverage==='legacy'?'This older attempt has no per-question timing. Missing times will be labelled.':info.coverage==='partial'?'Timing is partial. The report labels recorded time and leaves missing times unknown.':'Recorded times include revisits and exclude pauses and time outside the app.';
  showModal('Study report',`<p class="modal-intro"><strong>${esc(info.title)}</strong><br>${plural(info.total,'question')} · ${info.incorrect} incorrect</p><p>Save one Markdown file to attach to another agent. It includes questions, choices, your answers, the saved answer key and explanations, code, embedded diagrams, timings, and tutor instructions.</p><label>Include<select name="scope" id="study-report-scope" aria-label="Include"><option value="all">All questions</option><option value="focus" ${info.focus?'':'disabled'}>Mistakes and most time spent</option></select></label><p id="study-report-count" class="muted">${plural(info.total,'question')} will be included, across all result pages.</p><p class="muted">Time highlights use the top 20% with positive recorded time, up to five questions. Time alone does not indicate a mistake.</p><p class="muted">${timeNote}</p><p class="muted">Saved locally. You choose whether to share the file. Embedded diagrams require an agent that can read image data from files.</p>`,modalButtons('Save Markdown'),async values=>{const current=modal;if(await api.exportStudyReport(id,values.get('scope'))){if(modal===current)closeModal();toast('Study report saved.');}});
  modal.studyReport=info;
}
function settingsView(){
  const row=(title,description,label,action)=>`<div class="settings-row"><div><h3>${title}</h3><p class="muted">${description}</p></div>${button(label,action,'secondary')}</div>`;
  return `${draftBanner()}<div class="settings-list"><section class="settings-group"><h2>Library & recovery</h2>${row('Save a backup','Export your entire library to a file.','Save backup','backup')}${row('Restore a backup','Review a saved library before restoring it.','Restore','restore')}${row('Backup history','Browse local recovery points.','Backup history','backupHistory')}${row('Library health','Check stored structure without changing your data.','Check library','checkLibrary')}</section><section class="settings-group update-settings" id="update-settings">${updateSettings()}</section><section class="settings-group"><h2>Storage</h2>${row('Data folder','Open the folder where your study material is stored.','Open folder','openData')}<details class="storage-details"><summary>Storage location</summary><code>${esc(meta.dataPath)}</code></details></section></div><p class="version-label">Quiznet ${esc(meta.version)}</p>`;
}
async function backupHistory(){const snapshots=await api.backupHistory();showModal('Backup history',`<p class="muted">A backup is kept before the first library change each day, and before imports, deletions, and restores. Up to 7 backups / 128 MB; a larger newest backup is kept on its own. Keep exported backups on another drive too.</p><div class="import-preview">${snapshots.length?snapshots.map(s=>`<div class="snapshot-row"><span><strong>${esc(new Date(s.createdAt).toLocaleString())}</strong><small>${esc(s.reason)} · ${(s.bytes/1024/1024).toFixed(2)} MB</small></span>${button('Restore…','restoreSnapshot','secondary',`data-id="${esc(s.id)}"`)}</div>`).join(''):'<p>No saved backups yet.</p>'}</div>`,`${button('Close','closeModal','secondary')}${button('Create backup now','createSnapshot','primary')}`);}
function restoreConfirmation(p){showModal('Restore this library?',`<p><strong>${esc(p.filename)}</strong> contains ${plural(p.courses,'course')} and ${plural(p.quizzes,'quiz')}.</p><p>This will replace your current library. A separate copy of it will be kept in the data folder and backup history.</p>`,modalButtons('Restore'),async()=>{data=await api.restoreConfirm(p.token);await navigate('library');toast('Restored.');});}
function empty(title){return `<p class="empty-message">${title}</p>`;}
let menu=null;
function closeMenu(){if(menu?.trigger?.isConnected){menu.trigger.setAttribute('aria-expanded','false');if($('#menu-root').contains(document.activeElement))menu.trigger.focus();}menu=null;$('#menu-root').innerHTML='';}
function showMenu(trigger,items){
  closeMenu();menu={trigger};trigger.setAttribute('aria-expanded','true');
  $('#menu-root').innerHTML=`<div class="popover-menu" role="menu">${items.map(([label,action,attrs='',danger=false])=>button(label,action,`menu-item${danger?' menu-danger':''}`,`role="menuitem" ${attrs}`)).join('')}</div>`;
  const el=$('.popover-menu'),rect=trigger.getBoundingClientRect();
  el.style.left=`${Math.max(8,Math.min(innerWidth-el.offsetWidth-8,rect.right-el.offsetWidth))}px`;
  el.style.top=`${Math.max(32,Math.min(innerHeight-el.offsetHeight-8,rect.bottom+5))}px`;
  el.querySelector('button')?.focus();
}
function appMenu(trigger){
  const items=[['New quiz…','newQuiz'],['Prepare a quiz…','instructions'],['Import…','import'],['Search…','search'],['Settings','settings'],['Help','help']];
  if(data.activeSession)items.push(['Resume quiz','resume'],['Discard attempt…','discard','',true]);
  showMenu(trigger,items);
}
function itemMenu(trigger,type){
  const courseId=trigger.dataset.course,unitId=trigger.dataset.unit,quizId=trigger.dataset.id;
  const attrs=`data-course="${courseId}"${unitId?` data-unit="${unitId}"`:''}${quizId?` data-id="${quizId}"`:''}`;
  const items=type==='quiz'?[['Edit…','editQuiz',attrs],['Move…','moveQuiz',attrs],['Shuffle & start','shuffleStart',attrs],['Export…','exportQuiz',attrs]]:type==='unit'?[['New quiz…','newQuiz',attrs],['Rename…','rename',attrs]]:[['Rename…','rename',attrs]];
  items.push(['Delete…','delete',attrs,true]);showMenu(trigger,items);
}
function showModal(title,body,footer,onSubmit,wide=false,isEditor=false,isImport=false){
  if(!isImport)releaseImportPreview();
  closeMenu();
  postponeUpdateDialog();
  if(editor&&!isEditor){flushDraft().catch(error=>toast(error.message));editor=null;}
  if(!modal)previousFocus=document.activeElement;
  modal={onSubmit};
  $('.app-shell').inert=true;$('#navigation-toggle').disabled=true;
  $('#modal-root').innerHTML=`<div class="modal-backdrop ${isEditor||isImport?'workspace-backdrop':''}"><section class="modal ${isEditor?'editor-workspace':isImport?'import-workspace':''} ${wide?'wide':''}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-heading"><h2 id="modal-title">${title}</h2><button class="tiny-button" ${act('closeModal')} aria-label="Close dialog">${icon('close')}</button></div><form id="modal-form"><div class="modal-body">${body}</div><p class="form-error" role="alert"></p><div class="modal-footer">${footer||button('Cancel','closeModal','secondary')}</div></form></section></div>`;
  $('#modal-form').addEventListener('submit',async e=>{
    e.preventDefault();if(!modal?.onSubmit||busy)return;busy=true;const values=new FormData(e.target),controls=(editor?[...e.target.elements]:[e.submitter]).filter(el=>el&&!el.disabled);for(const control of controls)control.disabled=true;
    try{await modal.onSubmit(values);}catch(error){const errorBox=$('.form-error');if(errorBox)errorBox.textContent=error.message;else toast(error.message);}finally{busy=false;for(const control of controls)if(control.isConnected)control.disabled=false;}
  });
  setTimeout(()=>($('.modal-body input:not([disabled]):not([type="radio"]):not([type="hidden"]), .modal-body textarea:not([disabled]), .modal-body select:not([disabled])')||$('.modal button:not([disabled])'))?.focus(),0);
}
function closeModal(){releaseImportPreview();postponeUpdateDialog();if(editor)flushDraft().then(()=>{if(!editor&&view.page==='library')render();}).catch(error=>toast(error.message));modal=null;editor=null;$('#modal-root').innerHTML='';$('.app-shell').inert=false;$('#navigation-toggle').disabled=false;if(previousFocus?.isConnected)previousFocus.focus();previousFocus=null;setTimeout(maybeShowUpdate,0);}
const submit=(label,cls='primary')=>`<button class="btn ${cls}" type="submit">${label}</button>`;
const modalButtons=label=>`${button('Cancel','closeModal','secondary')}${submit(label)}`;
function newCourse(){showModal('New course',`<label>Course name<input name="title" placeholder="Biology" maxlength="200" required></label>`,modalButtons('Create'),async f=>{await change({type:'createCourse',title:f.get('title')});await navigate('library',data.courses.at(-1).id);});}
function newUnit(courseId){if(!courseId){newCourse();return;}showModal('New unit',`<label>Unit name<input name="title" placeholder="Unit 1: Cells" maxlength="200" required></label>`,modalButtons('Create'),async f=>{await change({type:'createUnit',courseId,title:f.get('title')});const u=courseBy(courseId).units.at(-1);await navigate('library',courseId,u.id);});}
function newQuiz(courseId,unitId){
  const attrs=`data-course="${esc(courseId)}" data-unit="${esc(unitId)}"`;
  showModal('New quiz',`<p class="modal-intro">Choose how to create it, then confirm its course and unit.</p><div class="quiz-create-choices">${[["Write manually",'newManual','edit'],['Import file','newImport','upload'],['Prepare with an agent','prepareAgent','spark']].map(([label,action,mark])=>button(`${icon(mark)}<span>${label}</span>${icon('chevron')}`,action,'secondary quiz-create-choice',attrs)).join('')}</div>`,button('Cancel','closeModal'),null);
}
async function editQuiz(quizId,courseId,unitId){await flushDraft();if(meta.draft||meta.draftError){showModal('Saved editor draft',`<p>Recover or discard the saved draft before starting another editor session.</p>`,`${button('Cancel','closeModal','secondary')}${button('Discard draft','discardDraft','secondary')}${meta.draft?button('Recover draft','recoverDraft','primary'):''}`);return;}const found=quizId?find(quizId):null;editor={quizId,courseId:found?.course.id||courseId,unitId:found?.unit.id||unitId,destination:destinationDraft(found?.course.id||courseId,found?.unit.id||unitId),title:found?.quiz.title||'',questions:found?structuredClone(found.quiz.questions):[blankQuestion()]};renderEditor();}
function blankQuestion(){return questionModel.blankQuestion();}
function editorQuestion(q,i,total) {
  const html=q.format==='html',formatted=['html','markdown'].includes(q.format),limit=html?window.QuiznetContentPolicy.MAX_HTML_LENGTH:q.format==='markdown'?window.QuiznetCodePolicy.MAX_MARKDOWN_LENGTH:10000;
  const type=questionModel.typeOf(q);
  return `<section class="editor-question" data-question-index="${i}">
    <div class="editor-question-heading"><strong>QUESTION ${i+1}</strong><div class="editor-tools"><label class="format-switch">Format<select data-editor="format" data-index="${i}" aria-label="Question format">${[['text','Text'],['html','HTML'],['markdown','Markdown']].map(([id,label])=>`<option value="${id}" ${(q.format||'text')===id?'selected':''}>${label}</option>`).join('')}</select></label>${q.code===undefined?button('Add code','addCode','text',`data-index="${i}"`):''}${button(q.image?'Replace image':'Add image','addImage','text',`data-index="${i}"`)}${total>1?button(icon('trash'),'removeQuestion','text icon-button',`data-index="${i}" aria-label="Remove question ${i+1}"`):''}</div></div>
    <div class="editor-columns"><div class="editor-writing"><label>Question type<select data-editor="type" data-index="${i}">${questionModel.types.map(t=>`<option value="${t.id}" ${type.id===t.id?'selected':''}>${esc(t.label)}</option>`).join('')}</select></label>
    <label>Question<textarea data-editor="prompt" data-index="${i}" required maxlength="${limit}" rows="2" dir="auto" placeholder="${html?'<p>Your question</p>':'Question'}">${esc(q.prompt)}</textarea></label>
    ${q.format==='markdown'?'<p class="muted math-hint">Math: $x^2$ inline or $$...$$ on separate lines. Works in choices and explanations too. Use Add image for a prepared diagram.</p>':''}
    ${q.image?`<div class="editor-image">${content.image(q)}${button(icon('close'),'removeImage','text icon-button',`data-index="${i}" aria-label="Remove image from question ${i+1}"`)}<label>Image description<input data-editor="imageAlt" data-index="${i}" value="${esc(q.imageAlt)}" maxlength="500" placeholder="Describe the image"></label></div>`:''}
    ${q.code!==undefined?`<div class="editor-code"><div class="editor-code-heading"><label>Code language<select data-editor="codeLanguage" data-index="${i}" aria-label="Code language">${window.QuiznetCodePolicy.languages.map(language=>`<option value="${language.id}" ${(q.codeLanguage||'plaintext')===language.id?'selected':''}>${esc(language.label)}</option>`).join('')}${!window.QuiznetCodePolicy.languages.some(language=>language.id===q.codeLanguage)&&q.codeLanguage?`<option selected value="${esc(q.codeLanguage)}">${esc(q.codeLanguage)} (plain text)</option>`:''}</select></label>${button('Remove code','removeCode','text',`data-index="${i}"`)}</div><label>Code<textarea class="code-source" data-editor="code" data-index="${i}" maxlength="${window.QuiznetCodePolicy.MAX_CODE_LENGTH}" rows="6" dir="ltr" spellcheck="false" required placeholder="Paste code here">${esc(q.code)}</textarea></label></div>`:''}
    </div><div class="editor-answer-column"><h3>Answer options</h3><div class="editor-options">${q.options.map((o,j)=>`<label><span>${optionLabel(j)}</span><textarea data-editor="option" data-index="${i}" data-option="${j}" maxlength="${formatted?limit:5000}" required rows="1" dir="auto" aria-label="Option ${optionLabel(j)} for question ${i+1}" placeholder="Answer option">${esc(o)}</textarea>${q.options.length>type.minOptions?button(icon('close'),'removeOption','text icon-button',`data-index="${i}" data-option="${j}" aria-label="Remove option ${optionLabel(j)}"`):''}</label>`).join('')}</div>
    ${q.options.length<type.maxOptions?button(`${icon('plus')} Add option`,'addOption','text',`data-index="${i}"`):''}
    <div class="editor-answer">${type.selection==='multiple'?`<fieldset class="correct-choices"><legend>Correct answers</legend>${q.options.map((_,j)=>`<label><input type="checkbox" data-editor="correctAnswers" data-index="${i}" data-option="${j}" ${q.correctAnswers.includes(j)?'checked':''}> Option ${optionLabel(j)}</label>`).join('')}<span class="muted">Select at least one.</span></fieldset>`:`<label>Correct answer<select data-editor="correctAnswer" data-index="${i}">${q.options.map((_,j)=>`<option value="${j}" ${q.correctAnswer===j?'selected':''}>Option ${optionLabel(j)}</option>`).join('')}</select></label>`}<label>Explanation <span class="muted">(optional)</span><textarea data-editor="explanation" data-index="${i}" maxlength="${limit}" rows="2" placeholder="Explanation" dir="auto">${esc(q.explanation)}</textarea></label></div>
    </div></div><details class="editor-preview" data-preview="${i}"><summary>Preview</summary><div class="preview-content">${previewQuestion(q)}</div></details>
  </section>`;
}
function previewQuestion(q) { return `<div class="preview-prompt">${promptBody(q)}</div><p class="question-instruction">${esc(questionModel.typeOf(q).instruction)}</p><div class="preview-options">${q.options.map((o,j)=>`<div><span class="option-letter">${optionLabel(j)}</span>${rich(o,q)}</div>`).join('')}</div>${q.explanation?`<div class="explanation">${rich(q.explanation,q)}</div>`:''}`; }
function renderEditor(resetScroll=false){
  const e=editor;
  e.page=Math.max(0,Math.min(e.page||0,Math.ceil(e.questions.length/EDITOR_PAGE_SIZE)-1));
  const start=e.page*EDITOR_PAGE_SIZE;
  const scroll=resetScroll?0:$('.modal-body')?.scrollTop||0,open=[...document.querySelectorAll('.editor-preview[open]')].map(el=>el.dataset.preview);
  showModal(e.quizId?'Edit quiz':'New quiz',`${e.quizId?`<p class="modal-intro">${esc(courseBy(e.courseId)?.title)} → ${esc(courseBy(e.courseId)?.units.find(u=>u.id===e.unitId)?.title)}</p>`:destinationFields(e.destination,'editor')}<label>Quiz title<input data-editor="title" value="${esc(e.title)}" placeholder="Quiz 1" required maxlength="200"></label>${questionPager(e.questions.length,EDITOR_PAGE_SIZE,e.page,'editor')}<div class="editor-layout"><nav class="editor-outline" aria-label="Editor questions"><strong>Questions</strong>${e.questions.slice(start,start+EDITOR_PAGE_SIZE).map((q,i)=>button(`${start+i+1}. ${esc(content.plain(q.prompt,q.format).slice(0,55)||'New question')}`,'editorJump','text',`data-index="${start+i}"`)).join('')}</nav><div class="editor-questions">${e.questions.slice(start,start+EDITOR_PAGE_SIZE).map((q,i)=>editorQuestion(q,start+i,e.questions.length)).join('')}</div></div>${button(`${icon('plus')} Add question`,'addQuestion','secondary')}<p class="muted" id="draft-status" role="status">${e.dirty?'Saving draft…':meta.draft?'Draft saved on this device':'Changes will be saved as a recovery draft.'}</p><p class="muted">Close keeps this draft. Cancel discards it.</p>`,`${button('Cancel','cancelEditor','secondary','title="Discard this editor draft"')}${submit('Save quiz')}`,async()=>{const {quizId,courseId,unitId,title,questions,destination}=editor;const target=destinationTarget(destination);try{await flushDraft();await change({type:'saveQuiz',quizId,courseId,unitId,title,questions,...(!quizId?{target}:{})});}catch(error){const question=error.message.match(/Question (\d+)/);if(question){editor.page=Math.floor((Number(question[1])-1)/EDITOR_PAGE_SIZE);renderEditor();}throw error;}editor=null;let warning='';try{await clearDraft();}catch(error){warning=' The quiz was saved, but the recovery draft could not be removed: '+error.message;}await navigateTarget(quizId?{courseId,unitId}:target);toast('Saved.'+warning);},true,true);
  modal.destination=e.destination;
  for (const index of open) $(`.editor-preview[data-preview="${index}"]`)?.setAttribute('open','');
  for(let index=start;index<Math.min(start+EDITOR_PAGE_SIZE,e.questions.length);index++){const q=e.questions[index];if(q.code!==undefined)$(`[data-editor="code"][data-index="${index}"]`).value=q.code;}
  setTimeout(()=>{$('.modal-body')?.scrollTo(0,scroll);},0);
}
async function startQuiz(quizId,shuffle=false,attemptId=null){
  if(data.activeSession){showModal('Unfinished quiz',`<p>${esc(sessionQuiz()?.title)}</p>`,`${button('Resume','resume','primary')}${button('Discard…','discard','secondary')}`,null);return;}
  const source=attemptId?data.attempts.find(a=>a.id===attemptId):null;
  const quiz=attemptId?(source?practice.sessionQuiz(data,{quizId:source.quizId,sourceAttemptId:source.id}):null):find(quizId)?.quiz;
  if(!quiz?.questions.length)return;
  const preset=practice.builtins.find(p=>p.id===(attemptId?'practice':'test'));
  startDraft={quizId:quiz.id,attemptId,title:quiz.title,count:quiz.questions.length,profileId:preset.id,options:{...preset.options},shuffle:shuffle||preset.shuffle};
  if(shuffle)startDraft.profileId='custom';
  renderStart();
}
function readStart(){
  const f=new FormData($('#modal-form'));startDraft.options={feedback:f.get('feedback'),...Object.fromEntries(practice.displays.map(([key])=>[key,f.has(key)]))};startDraft.shuffle=f.has('shuffle');
}
function renderStart(){
  const d=startDraft,profiles=[...practice.builtins,...(data.practicePresets||[])],custom=data.practicePresets?.some(p=>p.id===d.profileId);
  showModal('Before you start',`<p class="modal-intro">${esc(d.title)} · ${plural(d.count,'question')}</p><div class="preset-row"><label>Preset<select id="start-preset" aria-label="Preset">${profiles.map(p=>`<option value="${esc(p.id)}" ${p.id===d.profileId?'selected':''}>${esc(p.name)}</option>`).join('')}<option value="custom" ${d.profileId==='custom'?'selected':''}>Custom</option></select></label>${button('Save as…','showPresetSave','text')}${custom?button(icon('trash'),'deletePreset','text icon-button','aria-label="Delete preset"'):''}</div><div class="preset-save" hidden><input id="preset-name" aria-label="Preset name" maxlength="60" placeholder="Preset name" disabled>${button('Save preset','savePreset','secondary')}</div><label>Answer feedback<select name="feedback" aria-label="Answer feedback"><option value="review" ${d.options.feedback==='review'?'selected':''}>Review after finishing</option><option value="instant" ${d.options.feedback==='instant'?'selected':''}>Instant feedback</option></select></label><div class="practice-options">${practice.displays.map(([key,label])=>`<label><input type="checkbox" name="${key}" data-practice ${d.options[key]?'checked':''}> ${label}</label>`).join('')}<label><input type="checkbox" name="shuffle" data-practice ${d.shuffle?'checked':''}> Shuffle questions</label></div><p class="muted start-note">${d.options.feedback==='instant'?'Answers lock on feedback. For multiple answers, use Next.':'Answers stay editable until you finish.'} Timers record even when hidden.</p>`,modalButtons('Start quiz'),async()=>{
    readStart();await change({type:d.attemptId?'startMissed':'start',quizId:d.quizId,attemptId:d.attemptId,shuffle:d.shuffle,practice:d.options});await navigate('quiz');
  });
}
async function completeQuiz(){await change({type:'finish'});view={page:'result',attemptId:data.attempts.at(-1).id};closeModal();render();$('#main').scrollTop=0;}
async function revealCurrent(){
  const s=data.activeSession,q=sessionQuiz()?.questions.find(q=>q.id===s?.questionIds[s.position]);
  if(s?.practice?.feedback!=='instant'||!q||questionModel.typeOf(q).selection!=='multiple'||s.checkedQuestionIds.includes(q.id))return false;
  if(!questionModel.validAnswer(q,s.answers[q.id])){toast('Select an answer.');return true;}
  await change({type:'checkAnswer',questionId:q.id});render();$('.answer-feedback')?.scrollIntoView({block:'nearest'});return true;
}
function manage(action,b){
  const quizId=b.dataset.id,courseId=b.dataset.course,unitId=b.dataset.unit;
  const c=courseBy(courseId),u=c?.units.find(u=>u.id===unitId),q=quizId?find(quizId)?.quiz:null,item=q||u||c;
  if(!item)return;
  if(action==='rename')showModal('Rename',`<label>Name<input name="title" value="${esc(item.title)}" required maxlength="200"></label>`,modalButtons('Save'),async f=>{await change({type:'rename',courseId,unitId,quizId,title:f.get('title')});closeModal();render();});
  else showModal(`Delete this ${q?'quiz':u?'unit':'course'}?`,`<p><strong>${esc(item.title)}</strong> will be removed along with ${q?'its practice history':u?'its quizzes and practice history':'its units, quizzes, and practice history'}.</p>`,`${button('Cancel','closeModal','secondary')}${submit('Delete','danger')}`,async()=>{await change({type:'delete',courseId,unitId,quizId});if(!courseBy(view.courseId))await navigate('library');else if(view.unitId&&!courseBy(view.courseId)?.units.some(u=>u.id===view.unitId))await navigate('library',view.courseId);else{closeModal();render();}toast('Deleted.');});
}
function moveQuiz(quizId){
  const found=find(quizId);if(!found)return;
  const destination=destinationDraft(found.course.id,found.unit.id);
  showModal('Move quiz',`<p class="modal-intro"><strong>${esc(found.quiz.title)}</strong><br>From ${esc(found.course.title)} → ${esc(found.unit.title)}</p>${destinationFields(destination,'move')}<p class="muted">History and unfinished progress stay with this quiz.</p>`,modalButtons('Move quiz'),async()=>{const target=destinationTarget(destination);await change({type:'moveQuiz',quizId,target});await navigateTarget(target);toast('Quiz moved.');});
  modal.destination=destination;
}
function releaseImportPreview(){const draft=modal?.importPreview;if(draft){modal.importPreview=null;api.cancelImport(draft.token).catch(()=>{});}}
function importIssue(issue,answerRevealed){
  const messages={'repeated':'Identical content appears elsewhere in this file.','existing':'Identical content already exists in your library.','explanation':'No explanation provided (optional).','conflicting-answer':'Matching question content has a different answer key. Check both questions.','similar-options':'Some choices differ only in letter case or spacing. Check that they are distinct.','placeholder':'Some text looks like an unfinished placeholder.','all-correct':answerRevealed?'Every choice is marked correct. Check that this is intended.':'Review the answer-key selection.','image-description':'The image has no description (optional).','visible-prompt':'The question text is empty after safe formatting.','visible-options':`Choice ${(issue.options||[]).join(', ')} has no visible text after safe formatting.`};
  return `${esc(messages[issue.code]||'Review this question.')}${issue.related?` ${button(`View quiz ${issue.related.packIndex+1}, question ${issue.related.questionIndex+1}`,'relatedImportQuestion','text',`data-pack="${issue.related.packIndex}" data-index="${issue.related.questionIndex}"`)}`:''}`;
}
function importIndices(draft){return draft.onlyIssues?draft.report.reviewIndices[draft.packIndex]:Array.from({length:draft.packs[draft.packIndex].count},(_,i)=>i);}
function inspectVisibleImportQuestion(draft,packIndex,questionIndex,current){
  const q=current.question;
  if(!content.plain(q.prompt,q.format).trim())current.issues.push({code:'visible-prompt'});
  const options=q.options.flatMap((o,i)=>!content.plain(o,q.format).trim()?[optionLabel(i)]:[]);
  if(options.length)current.issues.push({code:'visible-options',options});
  const indices=draft.report.reviewIndices[packIndex];
  if(current.issues.length&&!indices.includes(questionIndex)){const position=indices.findIndex(i=>i>questionIndex);indices.splice(position<0?indices.length:position,0,questionIndex);draft.report.flagged++;}
  return current;
}
function importQuestionView(draft){
  const pack=draft.packs[draft.packIndex],current=draft.current,indices=importIndices(draft),position=indices.indexOf(draft.questionIndex),disabled=draft.loading?'disabled':'';
  return `<div class="import-question-controls"><label>Quiz<select id="import-pack" ${disabled}>${draft.packs.map((p,i)=>`<option value="${i}" ${i===draft.packIndex?'selected':''}>${esc(p.title)} · ${plural(p.count,'question')}</option>`).join('')}</select></label><label>Show<select id="import-review-filter" ${disabled}><option value="all" ${!draft.onlyIssues?'selected':''}>All questions</option><option value="issues" ${draft.onlyIssues?'selected':''}>Needs review (${draft.report.reviewIndices[draft.packIndex].length})</option></select></label></div><p class="muted">${esc(pack.course)} → ${esc(pack.unit)}</p>${draft.loading?'<p class="muted" role="status">Loading question…</p>':''}${!current?'<p class="muted">No questions were flagged in this quiz. Choose All questions to inspect it.</p>':(()=>{
    const q=current.question,correct=draft.answerRevealed?questionModel.correctIndices(q):[],warnings=current.issues;
    return `<div class="import-question-navigation"><label>Question number<input id="import-question-number" inputmode="numeric" maxlength="5" value="${draft.questionIndex+1}" aria-label="Question number" ${disabled}></label><span class="muted">of ${pack.count}${draft.onlyIssues?` · ${position+1} of ${indices.length} flagged`:''}</span><div class="button-row">${button('Previous question','previousImportQuestion','secondary',position<=0||draft.loading?'disabled':'')}${button('Next question','nextImportQuestion','secondary',position===indices.length-1||draft.loading?'disabled':'')}</div></div><article class="import-question-card" aria-label="Question ${draft.questionIndex+1} preview"><div class="import-question-meta"><strong>Question ${draft.questionIndex+1} of ${pack.count}</strong><span>${esc(questionModel.typeOf(q).label)}</span></div>${warnings.length?`<aside class="import-question-issues" aria-label="Question review notes"><strong>Review notes</strong><ul>${warnings.map(w=>`<li>${importIssue(w,draft.answerRevealed)}</li>`).join('')}</ul></aside>`:'<p class="muted">No automatic review notes for this question.</p>'}<div class="import-columns"><div class="import-prompt-column"><div class="import-question-prompt">${promptBody(q)}</div><p class="question-instruction">${esc(questionModel.typeOf(q).instruction)}</p></div><div class="import-answer-column"><h3>Answer options</h3><div class="import-question-choices">${q.options.map((option,i)=>`<div class="import-choice ${correct.includes(i)?'is-correct':''}"><span class="option-letter">${optionLabel(i)}</span>${rich(option,q)}${correct.includes(i)?'<span class="import-correct-label">Correct answer</span>':''}</div>`).join('')}</div>${button(draft.answerRevealed?'Hide correct answer':'Show correct answer','toggleImportAnswer','secondary',`aria-expanded="${draft.answerRevealed}" ${disabled}`)}${draft.answerRevealed?(q.explanation?`<div class="explanation"><strong>Explanation</strong>${rich(q.explanation,q)}</div>`:'<p class="muted">No explanation provided.</p>'):''}</div></div></article>`;
  })()}`;
}
function paintImportQuestion(draft,restoreFocus=null){
  if(modal?.importPreview!==draft)return;
  const root=$('#import-question-preview'),active=document.activeElement,focus=restoreFocus||(root.contains(active)?{id:active.id,action:active.dataset.action}:null);
  root.innerHTML=importQuestionView(draft);root.setAttribute('aria-busy',String(draft.loading));
  $('#import-flagged-count').textContent=plural(draft.report.flagged,'question')+' flagged for review';
  $('#modal-form button[type="submit"]').disabled=draft.loading;
  if(focus&&!draft.loading){const target=focus.id?document.getElementById(focus.id):root.querySelector(`[data-action="${focus.action}"]:not([disabled])`);(target||$('#import-question-number'))?.focus({preventScroll:true});}
}
async function loadImportQuestion(draft,packIndex,questionIndex){
  const root=$('#import-question-preview'),active=document.activeElement,focus=root.contains(active)?{id:active.id,action:active.dataset.action}:null;
  const request=++draft.request;draft.loading=true;draft.answerRevealed=false;paintImportQuestion(draft);
  try{const current=questionIndex==null?null:await api.importQuestion(draft.token,packIndex,questionIndex);if(modal?.importPreview!==draft||request!==draft.request)return;draft.packIndex=packIndex;draft.questionIndex=questionIndex??0;draft.current=current?inspectVisibleImportQuestion(draft,packIndex,questionIndex,current):null;}
  catch(error){if(modal?.importPreview===draft)toast(error.message);}
  finally{if(modal?.importPreview===draft&&request===draft.request){draft.loading=false;paintImportQuestion(draft,document.activeElement===document.body||root.contains(document.activeElement)?focus:null);}}
}
async function importQuestions(){
  const destination=view.page==='instructions'?structuredClone(instructionDestination):destinationDraft(view.courseId,view.unitId,true);
  let preferences;try{if(view.page==='instructions')preferences=brief.validate(instructionDraft);}catch{}
  const preview=await api.importPreview(preferences);if(!preview)return;
  try{
    const draft={...preview,destination,packIndex:0,questionIndex:0,onlyIssues:false,answerRevealed:false,loading:false,request:0,current:await api.importQuestion(preview.token,0,0)};
    inspectVisibleImportQuestion(draft,0,0,draft.current);
    clearTimeout(toast.timer);$('#toast').classList.remove('visible');
    showModal('Import',`<p class="modal-intro">${esc(preview.filename)} · ${plural(preview.report.total,'question')} · ${plural(preview.packs.length,'quiz')}</p><details class="import-file-summary"><summary>File summary · <span id="import-flagged-count">${plural(preview.report.flagged,'question')} flagged for review</span></summary><div class="import-preview">${preview.packs.map(p=>`<div><strong>${esc(p.title)}</strong><span>${esc(p.course)} → ${esc(p.unit)} · ${p.count} questions</span></div>`).join('')}</div><p class="muted">${questionModel.types.map(t=>`${esc(t.label)}: ${preview.report.counts[t.id]}`).join(' · ')}</p></details>${preview.report.warnings.length?`<aside class="import-warnings"><strong>Review before importing</strong><ul>${preview.report.warnings.map(w=>`<li>${esc(w)}</li>`).join('')}</ul></aside>`:''}<p class="muted">${preview.report.comparedWithBrief?'Compared with the current quiz brief. ':''}All questions will be imported. These local checks do not verify factual correctness or source references.</p><section class="import-inspection" aria-label="Import question preview"><h3>Question preview</h3><div id="import-question-preview">${importQuestionView(draft)}</div></section>${destinationFields(destination,'import',true)}`,modalButtons('Import'),async()=>{if(draft.loading)throw new Error('Wait for the question preview to finish loading.');const target=destinationTarget(destination);data=await api.importConfirm(preview.token,target);await navigateTarget(target);toast('Imported.');},true,false,true);
    modal.destination=destination;modal.importPreview=draft;
  }catch(error){await api.cancelImport(preview.token).catch(()=>{});throw error;}
}
function help(){showModal('Help',`<p>Organize <strong>Courses → Units → Quizzes</strong>. Create questions in the editor or import a JSON or CSV file.</p><p>Choose <strong>Prepare a quiz</strong> to save or copy Markdown instructions for another agent. Attach your study material with the instructions, answer any preferences marked <strong>Ask me</strong>, then import the complete JSON quiz it returns. Optional choices are under <strong>Advanced</strong>.</p><p>Choose a <strong>Question type</strong> for each question: single answer, multiple answers, or true/false. Mix types in one quiz. Use <strong>Add option</strong> for more choices; true/false has two editable labels. Multiple-answer questions require all correct choices and no others.</p><p>Use <strong>Add image</strong> for local PNG, JPEG, GIF, or WebP images (up to 2 MB). Choose <strong>HTML</strong> or <strong>Markdown</strong> in the Format selector for formatting, and open <strong>Preview</strong> to check it. Images are included in exports and backups.</p><p>Choose <strong>Add code</strong>, select its language, and paste your snippet. Code is displayed with syntax highlighting and preserved indentation; it is never run. In Markdown, use fenced code blocks: three backticks, a language name such as python, your code on the following lines, and three closing backticks. Markdown also works in choices and explanations.</p><h3>JSON · one quiz</h3><pre>{
  "course": "Biology",
  "unit": "Unit 1: Cells",
  "title": "Quiz 1",
  "questions": [{
    "prompt": "Where is most DNA stored?",
    "options": ["Nucleus", "Ribosome"],
    "correctAnswer": 0,
    "explanation": "Most DNA is in the nucleus."
  }]
}</pre><p class="muted"><strong>correctAnswer</strong> is zero-based: 0 = A, 1 = B. Letters or exact answer text work too. Set <code>"type": "multiple-answer"</code> with <code>"correctAnswers": [0, 2]</code> for multiple answers. Use <code>"type": "true-false"</code> with two options and one <code>correctAnswer</code> for true/false. Omit type for single answer. A questions array alone is accepted; multiple quizzes use <code>{ "quizzes": [ … ] }</code>.</p><h3>CSV · one question per row</h3><pre>course,unit,title,question,option_a,option_b,answer,explanation
Biology,Cells,Quiz 1,Where is most DNA?,Nucleus,Ribosome,A,Inside the nucleus.</pre><p class="muted">Use consecutive option_a, option_b, …, option_z, option_aa columns. Choice questions support ${questionModel.types[0].minOptions}–${questionModel.types[0].maxOptions} options. CSV answers use letters or exact option text. For multiple answers, add a type column containing multiple-answer and quote a JSON array in the answer cell: <code>"[0,2]"</code>. Use true-false for binary questions. Optional code and code_language columns attach a snippet; use format=markdown for Markdown content. Quote fields containing commas or line breaks. Files up to 20 MB and 10,000 questions per import.</p><p>Keyboard: <kbd>Ctrl K</kbd> searches your library. In a quiz, <kbd>1</kbd>–<kbd>9</kbd> selects or toggles the corresponding answer and arrow keys move between questions. All choices are reachable with Tab.</p>`,button('Close','closeModal','primary'),null,true);}
function search(){showModal('Search',`<div class="search-input-wrap">${icon('search')}<input id="search-input" placeholder="Search…" autocomplete="off" aria-label="Search your library"></div><div id="search-results"></div>`,button('Close','closeModal','secondary'),null,true);renderSearch('');}
function renderSearch(query){query=query.trim().toLowerCase();const courses=data.courses.filter(c=>c.title.toLowerCase().includes(query)),quizzes=flatten().filter(({course,unit,quiz})=>`${course.title} ${unit.title} ${quiz.title} ${quiz.questions.map(q=>content.plain(q.prompt,q.format)).join(' ')}`.toLowerCase().includes(query));$('#search-results').innerHTML=`${courses.map(c=>`<button class="search-result" ${act('course',`data-id="${c.id}"`)}>${icon('folder')}<div><strong>${esc(c.title)}</strong><span>Course · ${plural(stats(c).quizzes,'quiz')}</span></div>${icon('arrow')}</button>`).join('')}${quizzes.slice(0,50).map(({course,unit,quiz})=>`<button class="search-result" ${act('start',`data-id="${quiz.id}"`)}>${icon('book')}<div><strong>${esc(quiz.title)}</strong><span>${esc(course.title)} → ${esc(unit.title)}</span></div>${icon('arrow')}</button>`).join('')}${!courses.length&&!quizzes.length?'<p class="muted search-empty">No matches.</p>':''}${quizzes.length>50?'<p class="muted">Showing the first 50 quizzes. Refine your search to see more.</p>':''}`;}
document.addEventListener('input',e=>{
  if(e.target.id==='library-search'){
    const query=e.target.value.trim().toLocaleLowerCase();let matches=0;
    for(const row of document.querySelectorAll('.course-row')){row.hidden=!row.querySelector('.row-link').textContent.toLocaleLowerCase().includes(query);if(!row.hidden)matches++;}
    const empty=$('#course-search-empty');if(empty)empty.hidden=matches>0;return;
  }
  if(e.target.matches('input[data-place]')){updateDestination(e.target);return;}
  if(e.target.matches('[data-brief-value],[data-brief-count]'))updateInstructionControl(e.target);
  if(e.target.id==='search-input')renderSearch(e.target.value);
  const el=e.target;if(!el.dataset.editor||!editor)return;
  const key=el.dataset.editor,i=Number(el.dataset.index);
  if(['format','type','correctAnswers'].includes(key))return;
  if(key==='title')editor.title=el.value;
  else if(key==='option')editor.questions[i].options[Number(el.dataset.option)]=el.value;
  else editor.questions[i][key]=key==='correctAnswer'?Number(el.value):el.value;
  scheduleDraft();
  if(key==='prompt'){const item=$('.editor-outline [data-index="'+i+'"]');if(item)item.textContent=`${i+1}. ${content.plain(editor.questions[i].prompt,editor.questions[i].format).slice(0,55)||'New question'}`;}
  if(key!=='title') {
    clearTimeout(previewQuestion.timer);
    previewQuestion.timer=setTimeout(()=>{if(editor){const preview=$(`.editor-preview[data-preview="${i}"][open] .preview-content`);if(preview)preview.innerHTML=previewQuestion(editor.questions[i]);}},120);
  }
});
document.addEventListener('focusin',e=>{
  const section=e.target.closest('.editor-question');if(!section)return;
  for(const item of document.querySelectorAll('.editor-outline button')){
    const active=item.dataset.index===section.dataset.questionIndex;
    item.classList.toggle('active',active);if(active)item.setAttribute('aria-current','location');else item.removeAttribute('aria-current');
  }
});
document.addEventListener('submit',e=>{if(e.target.id==='instructions-form'){e.preventDefault();if(!busy)$('[data-action="saveInstructions"]').click();}});
document.addEventListener('toggle',e=>{if(e.target.matches('.editor-preview[open]')&&editor)e.target.querySelector('.preview-content').innerHTML=previewQuestion(editor.questions[Number(e.target.dataset.preview)]);},true);
document.addEventListener('change',async e=>{
  if(e.target.id==='study-report-scope'&&modal?.studyReport){const info=modal.studyReport;$('#study-report-count').textContent=`${plural(e.target.value==='focus'?info.focus:info.total,'question')} will be included, across all result pages.`;return;}
  if(['import-pack','import-review-filter','import-question-number'].includes(e.target.id)){
    const draft=modal?.importPreview;if(!draft||draft.loading)return;
    if(e.target.id==='import-pack'){const packIndex=Number(e.target.value),indices=draft.onlyIssues?draft.report.reviewIndices[packIndex]:[0];await loadImportQuestion(draft,packIndex,indices[0]??null);}
    else if(e.target.id==='import-review-filter'){draft.onlyIssues=e.target.value==='issues';const indices=importIndices(draft);await loadImportQuestion(draft,draft.packIndex,indices.includes(draft.questionIndex)?draft.questionIndex:indices[0]??null);}
    else{const number=Number(e.target.value);if(!/^\d+$/.test(e.target.value)||!Number.isInteger(number)||number<1||number>draft.packs[draft.packIndex].count){e.target.value=String(draft.questionIndex+1);toast('Choose a question number in this quiz.');return;}draft.onlyIssues=false;await loadImportQuestion(draft,draft.packIndex,number-1);}
    return;
  }
  if(e.target.id==='automatic-updates'){const enabled=e.target.checked;e.target.disabled=true;try{receiveUpdates(await api.setUpdateAutomatic(enabled));}catch(error){receiveUpdates(await api.getUpdates());toast(error.message);}return;}
  if(e.target.id==='editor-page'&&editor&&!busy){editor.page=Number(e.target.value);renderEditor(true);return;}
  if(e.target.id==='review-page'&&!busy){view.reviewPage=Number(e.target.value);render();$('#main').scrollTop=0;return;}
  if(e.target.id==='start-preset'){const preset=[...practice.builtins,...(data.practicePresets||[])].find(p=>p.id===e.target.value);if(preset){startDraft.profileId=preset.id;startDraft.options={...practice.defaults,...preset.options};startDraft.shuffle=preset.shuffle;renderStart();}else{readStart();startDraft.profileId='custom';const remove=$('[data-action=deletePreset]');if(remove)remove.hidden=true;}return;}
  if(startDraft&&e.target.matches('[data-practice],select[name=feedback]')){readStart();startDraft.profileId='custom';$('#start-preset').value='custom';const remove=$('[data-action=deletePreset]');if(remove)remove.hidden=true;$('.start-note').textContent=`${startDraft.options.feedback==='instant'?'Answers lock on feedback. For multiple answers, use Next.':'Answers stay editable until you finish.'} Timers record even when hidden.`;}
  if(e.target.matches('[data-brief-mode],[data-brief-type]'))updateInstructionControl(e.target);
  if(e.target.dataset.editor==='type'&&editor){
    const q=editor.questions[Number(e.target.dataset.index)],oldType=questionModel.typeOf(q),next=questionModel.typeOf({type:e.target.value});
    const correct=questionModel.correctIndices(q);
    // Keep the longer choice draft when temporarily switching to a binary question.
    if(next.defaultOptions&&!oldType.defaultOptions){editor.choiceDrafts??=new Map();editor.choiceDrafts.set(q,{options:[...q.options],correct:[...correct]});q.options=[...next.defaultOptions];}
    else if(oldType.defaultOptions&&!next.defaultOptions){const draft=editor.choiceDrafts?.get(q);if(draft){q.options=draft.options;correct.splice(0,correct.length,...draft.correct);}}
    q.type=next.id;delete q.correctAnswer;delete q.correctAnswers;
    const valid=correct.filter(index=>index<q.options.length);
    if(next.selection==='multiple')q.correctAnswers=valid;else q.correctAnswer=valid[0]??0;
    scheduleDraft();renderEditor();return;
  }
  if(e.target.dataset.editor==='correctAnswers'&&editor){const q=editor.questions[Number(e.target.dataset.index)];q.correctAnswers=questionModel.toggleAnswer(q,q.correctAnswers,Number(e.target.dataset.option));scheduleDraft();return;}
  if(e.target.dataset.editor==='format'&&editor){const i=Number(e.target.dataset.index);editor.questions[i].format=e.target.value;scheduleDraft();renderEditor();setTimeout(()=>$(`[data-editor="format"][data-index="${i}"]`)?.focus({preventScroll:true}),0);}
  if(e.target.matches('select[data-place]')){updateDestination(e.target);return;}
  if(e.target.id==='question-jump'&&!busy){busy=true;try{await change({type:'position',position:Number(e.target.value)});render();}catch(error){toast(error.message);}finally{busy=false;}}
});
document.addEventListener('click',async e=>{
  const w=e.target.closest('[data-window]');if(w){await api.window(w.dataset.window);return;}
  const b=e.target.closest('[data-action]');
  const menuClick=e.target.closest('.popover-menu');
  if(menu&&!menuClick&&!e.target.closest('[aria-haspopup="menu"]'))closeMenu();
  if(!b||b.disabled||busy)return;
  if(menuClick)closeMenu();
  const a=b.dataset.action;busy=true;
  try{
    switch(a){
      case 'toggleNavigation':toggleNavigation();break;
      case 'filterReview':{const filter=b.dataset.filter;view.incorrectOnly=filter==='incorrect';view.reviewPage=0;render();$(`[data-action="filterReview"][data-filter="${filter}"]`)?.focus();break;}
      case 'editorJump':{const section=$('.editor-question[data-question-index="'+Number(b.dataset.index)+'"]');section?.scrollIntoView({block:'start'});section?.querySelector('[data-editor="prompt"]')?.focus({preventScroll:true});break;}
      case 'previousImportQuestion':case 'nextImportQuestion':{const draft=modal?.importPreview;if(!draft||draft.loading)break;const indices=importIndices(draft),position=indices.indexOf(draft.questionIndex)+(a==='nextImportQuestion'?1:-1);if(position>=0&&position<indices.length)await loadImportQuestion(draft,draft.packIndex,indices[position]);break;}
      case 'relatedImportQuestion':{const draft=modal?.importPreview;if(draft&&!draft.loading){draft.onlyIssues=false;await loadImportQuestion(draft,Number(b.dataset.pack),Number(b.dataset.index));}break;}
      case 'toggleImportAnswer':{const draft=modal?.importPreview;if(draft&&!draft.loading){draft.answerRevealed=!draft.answerRevealed;paintImportQuestion(draft);}break;}
      case 'checkUpdates':checkForUpdates();break;
      case 'viewUpdate':showUpdate();break;
      case 'laterUpdate':case 'skipUpdate':{receiveUpdates(await api.remindUpdate(a==='skipUpdate'?'skip':'later',b.dataset.version));updateShown=null;if(modal)modal.updateVersion=null;closeModal();break;}
      case 'downloadUpdate':{receiveUpdates(await api.openUpdate(b.dataset.version));updateShown=null;if(modal)modal.updateVersion=null;closeModal();toast('Release page opened in your browser.');break;}
      case 'home':await navigate('library');break;case 'course':await navigate('library',b.dataset.id);break;case 'unit':await navigate('library',b.dataset.course,b.dataset.id);break;
      case 'instructions':await prepareInstructions(view.page==='library'?view.courseId:null,view.page==='library'?view.unitId:null);break;case 'history':await navigate('history');break;case 'explore':await navigate('explore');break;case 'settings':await navigate('settings');break;case 'help':help();break;case 'search':search();break;
      case 'closeModal':closeModal();break;
      case 'cancelEditor':await clearDraft();editor=null;closeModal();render();break;
      case 'recoverDraft':await recoverDraft();break;
      case 'discardDraft':await clearDraft();editor=null;closeModal();render();toast('Draft discarded.');break;case 'newCourse':newCourse();break;case 'newUnit':newUnit(b.dataset.course||view.courseId);break;
      case 'newQuiz':newQuiz(b.dataset.course||view.courseId,b.dataset.unit||view.unitId);break;
      case 'newManual':await editQuiz(null,b.dataset.course,b.dataset.unit);break;
      case 'newImport':await navigate('library',b.dataset.course,b.dataset.unit);await importQuestions();break;
      case 'prepareAgent':await prepareInstructions(b.dataset.course,b.dataset.unit);break;case 'editQuiz':await editQuiz(b.dataset.id);break;
      case 'moveQuiz':moveQuiz(b.dataset.id);break;
      case 'rename':case 'delete':manage(a,b);break;
      case 'appMenu':appMenu(b);break;case 'courseMenu':itemMenu(b,'course');break;case 'unitMenu':itemMenu(b,'unit');break;case 'quizMenu':itemMenu(b,'quiz');break;
      case 'startMissed':await startQuiz(null,false,b.dataset.id);break;case 'start':await startQuiz(b.dataset.id);break;case 'shuffleStart':await startQuiz(b.dataset.id,true);break;case 'resume':await change({type:'resume'});await navigate('quiz');break;
      case 'pause':{const f=find(data.activeSession?.quizId);await navigate('library',f?.course.id,f?.unit.id);break;}
      case 'answer':{const s=data.activeSession,q=sessionQuiz().questions.find(q=>q.id===b.dataset.question);await change({type:'answer',questionId:q.id,answer:questionModel.toggleAnswer(q,s.answers[q.id],Number(b.dataset.index))});render();$(`[data-action="answer"][data-index="${b.dataset.index}"]`)?.focus();break;}
      case 'navigationHelp':navigationHelp();break;
      case 'advance':if(!await revealCurrent()){await change({type:'position',position:Number(b.dataset.index)});render();}break;
      case 'flagQuestion':await change({type:'flag',questionId:data.activeSession.questionIds[data.activeSession.position]});render();break;
      case 'reviewFlags':{const s=data.activeSession,flags=s.flaggedQuestionIds||[],next=flags.find(id=>s.questionIds.indexOf(id)>s.position)||flags[0];if(next){closeModal();await change({type:'position',position:s.questionIds.indexOf(next)});render();}break;}
      case 'showPresetSave':$('.preset-save').hidden=false;$('#preset-name').disabled=false;$('#preset-name').focus();break;
      case 'savePreset':{readStart();const name=$('#preset-name').value;await change({type:'savePreset',name,practice:startDraft.options,shuffle:startDraft.shuffle});startDraft.profileId=data.practicePresets.find(p=>p.name.toLowerCase()===name.trim().toLowerCase()).id;renderStart();toast('Preset saved.');break;}
      case 'deletePreset':{readStart();await change({type:'deletePreset',id:startDraft.profileId});startDraft.profileId='custom';renderStart();break;}
      case 'position':await change({type:'position',position:Number(b.dataset.index)});render();break;
      case 'finish':{if(await revealCurrent())break;const s=data.activeSession,quiz=sessionQuiz(),missing=s.questionIds.findIndex(id=>!questionModel.validAnswer(quiz.questions.find(q=>q.id===id),s.answers[id])||(s.practice?.feedback==='instant'&&!s.checkedQuestionIds.includes(id)));if(missing>=0){await change({type:'position',position:missing});render();toast(s.practice?.feedback==='instant'?'Answer every question and use Next to view feedback.':'Answer every question.');}else if(s.flaggedQuestionIds?.length){showModal('Flagged questions',`<p>${plural(s.flaggedQuestionIds.length,'question')} flagged for review.</p>`,`${button('Review flags','reviewFlags','secondary')}${submit('Finish quiz')}`,completeQuiz);}else await completeQuiz();break;}
      case 'discard':showModal('Discard attempt?',`<p>Your saved answers for <strong>${esc(sessionQuiz()?.title)}</strong> will be discarded. The quiz stays in your library.</p>`,`${button('Cancel','closeModal','secondary')}${submit('Discard attempt','danger')}`,async()=>{await change({type:'discard'});await navigate('library');});break;
      case 'result':view={page:'result',attemptId:b.dataset.id};render();break;
      case 'studyReport':await studyReportDialog(b.dataset.id);break;
      case 'saveInstructions':case 'copyInstructions':case 'previewInstructions':await exportInstructions(a);break;
      case 'import':await importQuestions();break;case 'exportQuiz':if(await api.exportQuiz(b.dataset.id))toast('Exported.');break;
      case 'backup':if(await api.backup())toast('Backup saved.');break;
      case 'openData':await api.openData();break;
      case 'restore':{const p=await api.restorePreview();if(p)restoreConfirmation(p);break;}
      case 'backupHistory':await backupHistory();break;
      case 'createSnapshot':await api.createSnapshot();await backupHistory();toast('Recovery backup saved.');break;
      case 'restoreSnapshot':restoreConfirmation(await api.snapshotPreview(b.dataset.id));break;
      case 'checkLibrary':{const checks=await api.checkLibrary();showModal('Library check',`<p class="muted">This reads the current library and rolling backup without changing either file. It checks stored structure, references, and attempts; it does not test disk hardware or verify answers.</p><div class="import-preview">${checks.map(c=>`<div><strong>${esc(c.name)} · ${esc(c.status)}</strong><span>${c.status==='valid'?`${plural(c.courses,'course')} · ${plural(c.quizzes,'quiz')} · ${plural(c.questions,'question')} · ${plural(c.attempts,'saved attempt')}`:esc(c.detail)}</span></div>`).join('')}</div>`,button('Close','closeModal','primary'));break;}
      case 'editorPage':editor.page=Number(b.dataset.index);renderEditor(true);break;
      case 'reviewPage':view.reviewPage=Number(b.dataset.index);render();$('#main').scrollTop=0;break;
      case 'addQuestion':if(editor.questions.length>=brief.MAX_QUESTIONS){toast('A quiz can contain up to 10,000 questions.');break;}editor.questions.push(blankQuestion());editor.page=Math.floor((editor.questions.length-1)/EDITOR_PAGE_SIZE);renderEditor();$('.editor-question:last-child textarea')?.focus();break;
      case 'addCode':{const i=Number(b.dataset.index),q=editor.questions[i];q.code='';q.codeLanguage='python';renderEditor();$(`[data-editor="code"][data-index="${i}"]`)?.focus();break;}
      case 'removeCode':{const q=editor.questions[Number(b.dataset.index)];delete q.code;delete q.codeLanguage;renderEditor();break;}
      case 'addImage':{
        const current=editor,i=Number(b.dataset.index),selected=await api.selectImage();
        if(selected&&editor===current){const image=new Image();image.src=selected.image;try{await image.decode();}catch{throw new Error('This image could not be opened. Choose a valid PNG, JPEG, GIF, or WebP.');}editor.questions[i].image=selected.image;editor.questions[i].imageAlt=editor.questions[i].imageAlt||'';renderEditor();}break;
      }
      case 'removeImage':{const q=editor.questions[Number(b.dataset.index)];delete q.image;delete q.imageAlt;renderEditor();break;}
      case 'removeQuestion':editor.questions.splice(Number(b.dataset.index),1);renderEditor();break;
      case 'addOption':{const q=editor.questions[Number(b.dataset.index)];if(q.options.length<questionModel.typeOf(q).maxOptions)q.options.push('');renderEditor();break;}
      case 'removeOption':{const q=editor.questions[Number(b.dataset.index)],j=Number(b.dataset.option);if(q.options.length<=questionModel.typeOf(q).minOptions)break;q.options.splice(j,1);if(questionModel.typeOf(q).selection==='multiple')q.correctAnswers=q.correctAnswers.filter(index=>index!==j).map(index=>index>j?index-1:index);else if(q.correctAnswer===j)q.correctAnswer=0;else if(q.correctAnswer>j)q.correctAnswer--;renderEditor();break;}
    }
    if(editor&&['addQuestion','removeQuestion','addCode','removeCode','addImage','removeImage','addOption','removeOption'].includes(a))scheduleDraft();
  }catch(error){toast(error.message);}finally{busy=false;setTimeout(maybeShowUpdate,0);}
});
document.addEventListener('keydown',e=>{
  if(e.ctrlKey&&e.key.toLowerCase()==='k'){e.preventDefault();if(!busy&&!modal)search();return;}
  if(menu){
    if(e.key==='Escape'){const trigger=menu.trigger;closeMenu();trigger?.focus();e.preventDefault();return;}
    const items=[...document.querySelectorAll('.popover-menu button')],index=items.indexOf(document.activeElement);
    if(['ArrowDown','ArrowUp'].includes(e.key)){items[(index+(e.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus();e.preventDefault();return;}
    if(e.key==='Tab')closeMenu();
  }
  if(modal){
    if(e.key==='Escape'&&!busy)closeModal();
    if(e.key==='Tab'){const items=[...document.querySelectorAll('.modal button, .modal input, .modal textarea, .modal select, .modal a[href], .modal [tabindex]')].filter(el=>!el.disabled&&el.tabIndex>=0&&el.offsetParent!==null);const first=items[0],last=items.at(-1);if(e.shiftKey&&(document.activeElement===first||!items.includes(document.activeElement))){last?.focus();e.preventDefault();}else if(!e.shiftKey&&(document.activeElement===last||!items.includes(document.activeElement))){first?.focus();e.preventDefault();}}return;
  }
  if(view.page==='quiz'&&!busy&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&!['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)){
    if(/^[1-9]$/.test(e.key)){const b=document.querySelector(`[data-action="answer"][data-index="${Number(e.key)-1}"]`);if(b){e.preventDefault();b.click();}}
    if(['ArrowRight','ArrowLeft'].includes(e.key)){const position=data.activeSession.position+(e.key==='ArrowRight'?1:-1);if(position>=0&&position<data.activeSession.questionIds.length){e.preventDefault();const selector=$('#question-jump');selector.value=String(position);selector.dispatchEvent(new Event('change',{bubbles:true}));}}
  }
});
api.get().then(result=>{data=result.library;meta=result.meta;updateState=meta.updates;render();if(meta.notice)toast(meta.notice);}).catch(error=>{$('#main').innerHTML=`<div class="empty-state"><h1>We couldn’t open your library.</h1><p>${esc(error.message)}</p></div>`;});
