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
const icon=(name,cls='')=>`<svg class="icon ${cls} ${['arrow','back','chevron'].includes(name)?'directional-icon':''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${({refresh:`<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1"/>`,expand:`<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>`,list:`<path d="M4 6h16M4 12h16M4 18h16"/>`,table:`<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 14h18M10 4v16"/>`,pin:`<path d="m9 3 6 0-1 6 4 4v2H6v-2l4-4-1-6Zm3 12v6"/>`,grid:`<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>`,book:`<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15"/>`,clock:`<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`,settings:`<path d="m9 3-1 3-3 1-2 3 2 2-1 3 2 3 3-1 2 3h3l1-3 3-1 2-3-2-2 1-3-2-3-3 1-2-2Z"/><circle cx="12" cy="12" r="3"/>`,plus:`<path d="M12 5v14M5 12h14"/>`,arrow:`<path d="M4 12h16m-6-6 6 6-6 6"/>`,chevron:`<path d="m9 5 7 7-7 7"/>`,down:`<path d="m6 9 6 6 6-6"/>`,upload:`<path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5"/>`,download:`<path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/>`,search:`<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>`,check:`<path d="m5 12 4 4L19 6"/>`,close:`<path d="m6 6 12 12M6 18 18 6"/>`,leaf:`<path d="M20 3C7 2 2 9 5 16c4 5 13 2 15-13ZM4 21l10-11"/>`,shield:`<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>`,edit:`<path d="m4 16 12-12 4 4L8 20H4v-4ZM14 6l4 4"/>`,trash:`<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5"/>`,spark:`<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>`,play:`<path d="m8 4 12 8-12 8V4Z"/>`,folder:`<path d="M3 7V4h7l3 3h8v13H3V7Z"/>`,help:`<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4M12 17h.01"/>`,back:`<path d="M20 12H4m6-6-6 6 6 6"/>`,info:`<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>`,flag:`<path d="M5 21V4m0 0c4-4 9 4 14 0v10c-5 4-10-4-14 0"/>`,more:`<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>`})[name]||''}</svg>`;
let data,meta,view={page:'home',courseId:null,unitId:null},busy=false,modal=null,previousFocus=null,editor=null;
let updateState=null,updateShown=null;
let navigationHidden=false,focusNavigationExpanded=false;
function updateNavigation(){
  const focused=view.page==='quiz';
  document.body.classList.toggle('navigation-hidden',navigationHidden);
  document.body.classList.toggle('navigation-compact',focused&&!focusNavigationExpanded&&!navigationHidden);
  document.body.dataset.page=view.page;
  const toggle=$('#navigation-toggle');
  toggle.setAttribute('aria-expanded',String(!navigationHidden&&(!focused||focusNavigationExpanded)));
  toggle.setAttribute('aria-label',navigationHidden||focused&&!focusNavigationExpanded?tr("Show navigation"):tr("Hide navigation"));
}
function toggleNavigation(){
  if(view.page==='quiz'&&!navigationHidden&&!focusNavigationExpanded)focusNavigationExpanded=true;
  else {navigationHidden=!navigationHidden;if(view.page==='quiz')focusNavigationExpanded=!navigationHidden;}
  updateNavigation();
}
let draftTimer=null,draftOperation=Promise.resolve(),draftRevision=0,pendingDraft=null;
function draftStatus(message){const status=$('#draft-status');if(status)status.textContent=tr(message);}
function scheduleDraft(){if(!editor)return;editor.dirty=true;draftRevision++;draftStatus(tr("Saving draft…"));clearTimeout(draftTimer);draftTimer=setTimeout(()=>flushDraft().catch(error=>toast(error.message)),500);}
function flushDraft(){
  clearTimeout(draftTimer);
  if(!editor?.dirty&&!pendingDraft)return draftOperation;
  const current=editor,revision=draftRevision;
  if(current?.dirty)pendingDraft=Object.fromEntries(['quizId','courseId','unitId','destination','title','questions','page','reference','referenceSelection'].filter(k=>current[k]!==undefined).map(k=>[k,structuredClone(current[k])]));
  const payload=pendingDraft;
  draftOperation=draftOperation.catch(()=>{}).then(()=>api.saveDraft(payload)).then(saved=>{meta.draft=saved;if(pendingDraft===payload)pendingDraft=null;if(current&&editor===current&&draftRevision===revision){current.dirty=false;draftStatus(tr("Draft saved on this device"));}return saved;}).catch(error=>{draftStatus(tr("Draft not saved — retry by editing or closing"));throw error;});
  return draftOperation;
}
async function clearDraft(){clearTimeout(draftTimer);await draftOperation.catch(()=>{});await api.saveDraft(null);pendingDraft=null;draftOperation=Promise.resolve();meta.draft=null;meta.draftError='';if(editor)editor.dirty=false;}
async function recoverDraft(){await flushDraft();const saved=await api.readDraft();if(!saved){meta.draft=null;render();return;}editor=saved.editor;if(editor.quizId&&!find(editor.quizId)){delete editor.quizId;delete editor.courseId;delete editor.unitId;toast(tr("The original quiz is unavailable. Save this draft as a new quiz."));}renderEditor();}
function draftBanner(){return meta.draft?`<div class="resume-banner draft-banner"><span>${esc(meta.draft.title||tr("Untitled quiz"))} <small>${trHtml("· Editor draft",{})}</small></span><div class="button-row">${button(tr("Recover draft"),'recoverDraft','secondary')}${button(tr("Discard draft"),'discardDraft','text')}</div></div>`:meta.draftError?`<p class="muted">${esc(meta.draftError)}</p>`:'';}
api.onBeforeClose(async()=>{const controls=[...document.querySelectorAll('[data-response-context]')].filter(control=>!control.disabled);controls.forEach(control=>control.disabled=true);try{await flushResponses();await flushDraft();}finally{for(const control of controls)if(control.isConnected)control.disabled=false;}});
const flatten=()=>data.courses.flatMap(course=>course.units.flatMap(unit=>unit.quizzes.map(quiz=>({course,unit,quiz}))));
const find=id=>flatten().find(item=>item.quiz.id===id);
const courseBy=id=>data.courses.find(c=>c.id===id);
function destinationDraft(courseId,unitId,automatic=false){return {course:courseId|| (automatic?'':'new'),unit:unitId||(automatic?'':'new'),courseTitle:'',unitTitle:''};}
function destinationTarget(d){return !d.course?undefined:{...(d.course==='new'?{courseTitle:d.courseTitle.trim()}:{courseId:d.course}),...(d.unit==='new'?{unitTitle:d.unitTitle.trim()}:d.unit?{unitId:d.unit}:{})};}
function destinationNames(d){const c=courseBy(d.course);return {course:d.course==='new'?d.courseTitle.trim():c?.title,unit:d.unit==='new'?d.unitTitle.trim():c?.units.find(u=>u.id===d.unit)?.title};}
function destinationFields(d,kind,automatic=false){
  if(d.course!=='new'&&d.course&&!courseBy(d.course)){d.course=automatic?'':'new';d.unit=automatic?'':'new';}
  if(d.unit&&d.unit!=='new'&&!courseBy(d.course)?.units.some(u=>u.id===d.unit))d.unit=automatic?'':'new';
  const c=courseBy(d.course),auto=kind==='instructions'?tr("Let the agent decide"):tr("From file");
  return `<fieldset class="quiz-destination" data-destination="${kind}" data-automatic="${automatic}"><legend>${kind==='move'?tr("Move to"):tr("Save in")}</legend><div class="destination-grid"><div><label>${trHtml("Course",{})}<select aria-label="${trHtml("Course",{})}" data-place="course" ${kind==='import'?'id="import-target" name="target"':''}>${automatic?`<option value="" ${!d.course?'selected':''}>${auto}</option>`:''}<option value="new" ${d.course==='new'?'selected':''}>${trHtml("New course…",{})}</option>${data.courses.map(c=>`<option value="${esc(c.id)}" ${d.course===c.id?'selected':''}>${esc(c.title)}</option>`).join('')}</select></label>${d.course==='new'?`<label>${trHtml("New course name",{})}<input data-place="courseTitle" value="${esc(d.courseTitle)}" maxlength="200" required placeholder="${trHtml("Course name",{})}"></label>`:''}</div>${d.course?`<div><label>${trHtml("Unit",{})}<select name="unit" aria-label="${trHtml("Unit",{})}" data-place="unit">${automatic?`<option value="" ${!d.unit?'selected':''}>${auto}</option>`:''}<option value="new" ${d.unit==='new'?'selected':''}>${trHtml("New unit…",{})}</option>${(c?.units||[]).map(u=>`<option value="${esc(u.id)}" ${d.unit===u.id?'selected':''}>${esc(u.title)}</option>`).join('')}</select></label>${d.unit==='new'?`<label>${trHtml("New unit name",{})}<input data-place="unitTitle" value="${esc(d.unitTitle)}" maxlength="200" required placeholder="${trHtml("Unit name",{})}"></label>`:''}</div>`:''}</div><p class="destination-summary" aria-live="polite">${destinationSummary(d,kind)}</p></fieldset>`;
}
function destinationSummary(d,kind){const names=destinationNames(d);return d.course?`${esc(names.course||tr("New course"))} → ${esc(names.unit||(d.unit==='new'?tr("New unit"):kind==='instructions'?tr("Agent chooses unit"):tr("Units from file")))}`:kind==='instructions'?tr("The agent will choose course and unit names from your material."):tr("Use the course and unit names in the file.");}
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
const plural=(n,s)=>i18n.count(n,s);
const pct=a=>Math.round(a.score/a.total*100);
const date=s=>i18n.date(s,{month:'short',day:'numeric'});
const act=(name,attrs='')=>`data-action="${name}" ${attrs}`;
const button=(label,action,cls='secondary',attrs='')=>`<button type="button" class="btn ${cls}" ${act(action,attrs)}>${label}</button>`;
function toast(message){$('#toast').textContent=tr(message);$('#toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('visible'),4500);}
api.onNotice(message=>toast(message));
function receiveUpdates(state){updateState=state;const section=$('#update-settings');if(section)section.innerHTML=updateSettings();setTimeout(maybeShowUpdate,0);}
api.onUpdates(receiveUpdates);
function updateSettings(){const s=updateState;if(!s)return `<p class="muted">${trHtml("Update settings are loading.",{})}</p>`;return `<div class="update-heading"><h2>${trHtml("Updates",{})}</h2>${button(s.checking?tr("Checking…"):tr("Check for updates"),'checkUpdates','secondary',s.checking?'disabled':'')}</div><label class="update-preference"><input id="automatic-updates" type="checkbox" ${s.automatic?'checked':''}> ${trHtml("Check automatically every two days",{})}</label><p class="muted">${trHtml("Optional internet access to GitHub for public release information. Study material stays on this computer. Automatic checking is off until you choose it.",{})}</p><p class="update-status" role="status">${esc(s.message)}${s.lastChecked?tr(" Last successful check: {value0}.",{value0:esc(i18n.date(s.lastChecked,{dateStyle:"medium",timeStyle:"short"}))}):''}</p>${s.warning?`<p class="muted">${esc(s.warning)}</p>`:''}${s.available?button(tr("View update {value0}",{value0:esc(s.available.version)}),'viewUpdate','text'):''}`;}
function showUpdate(){if(!updateState?.available)return;const v=updateState.available.version;updateShown=v;showModal(tr("Update available"),`<p>${trHtml("Version",{})} <strong>${esc(v)}</strong> ${trHtml("is available. Installed version: {value1}.",{value1:esc(meta.version)})}</p><p>${trHtml("Download opens the Quiznet release page on GitHub in your browser. Run",{})} <strong>${"Quiznet-Setup.exe"}</strong> ${trHtml("when you are ready; it updates the existing app and preserves your study data.",{})}</p><p class="muted">${trHtml("The installer is currently unsigned. Installation is your choice and never starts automatically.",{})}</p>`,`${button(tr("Skip this version"),'skipUpdate','text',`data-version="${esc(v)}"`)}${button(tr("Later"),'laterUpdate','secondary',`data-version="${esc(v)}"`)}${button(tr("Download update"),'downloadUpdate','primary',`data-version="${esc(v)}"`)}`);modal.updateVersion=v;}
function maybeShowUpdate(){if(!data||!updateState?.notify||updateState.checking||updateShown===updateState.available?.version||busy||modal||editor||!['home','library','settings'].includes(view.page)||data.activeSession?.timing?.runningSince!=null)return;showUpdate();}
async function checkForUpdates(){receiveUpdates({...updateState,checking:true,message:tr("Checking GitHub for updates…")});try{const state=await api.checkUpdates();receiveUpdates(state);if(view.page==='settings'){if(state.available&&state.status==='available'&&!modal&&!editor&&!busy)showUpdate();else if(!state.available||state.status!=='available')toast(state.message);}}catch(error){try{receiveUpdates(await api.getUpdates());}catch{}if(view.page==='settings')toast(error.message);}}
function postponeUpdateDialog(){if(!modal?.updateVersion)return;const v=modal.updateVersion;modal.updateVersion=null;if(updateState)updateState.notify=false;api.remindUpdate('later',v).then(state=>{updateShown=null;receiveUpdates(state);}).catch(error=>toast(error.message));}
async function change(action){
  await flushResponses();
  const main=$('#main'),controls=['quiz','reviewQuestion','mistakePractice','savedPractice'].includes(view.page)?[...document.querySelectorAll('button[data-action], #question-jump')].filter(control=>!control.disabled):[];
  if(controls.length){main.setAttribute('aria-busy','true');for(const control of controls)control.disabled=true;}
  try{data=await api.change(action);return data;}
  finally{if(controls.length){for(const control of controls)if(control.isConnected)control.disabled=false;main.removeAttribute('aria-busy');}}
}
async function navigate(page,courseId=null,unitId=null){if(view.page==='quiz'&&page!=='quiz'&&data.activeSession)await change({type:'pause'});view={page,courseId,unitId};closeModal();render();$('#main').scrollTop=0;}
function pageBreadcrumbs(c,u){
  const link=(label,action,name)=>`<button ${act(action)} aria-label="${name}">${label}</button>`,divider=icon('chevron');
  if(['savedQuestions','savedPractice'].includes(view.page))return `${link(tr("Home"),'dashboard',tr("Back to Home"))}${divider}${view.page==='savedPractice'?`${link(tr("Saved questions"),'savedQuestions',tr("Back to Saved questions"))}${divider}<span>${trHtml("Practice",{})}</span>`:`<span>${trHtml("Saved questions",{})}</span>`}`;
  if(['notebook','mistakePractice'].includes(view.page))return `${link(tr("Daily review"),'dailyReview',tr("Back to Daily review"))}${divider}${view.page==='mistakePractice'?`${link(tr("Mistake notebook"),'notebook',tr("Back to Mistake notebook"))}${divider}<span>${trHtml("Practice",{})}</span>`:`<span>${trHtml("Mistake notebook",{})}</span>`}`;
  if(view.page==='reviewQuestion')return `${link(tr("Daily review"),'dailyReview',tr("Back to Daily review"))}${divider}<span>${trHtml("Review",{})}</span>`;
  if(view.page==='result')return `${link(tr("History"),'history',tr("Back to History"))}${divider}<span>${trHtml("Results",{})}</span>`;
  if(view.page==='instructions')return `${link(tr("New quiz"),'newQuiz',tr("Back to New quiz"))}${divider}<span>${trHtml("Prepare with an agent",{})}</span>`;
  if(view.page==='library')return c?`<button ${act('home')}>${trHtml("Courses",{})}</button>${divider}${c.collectionId&&data.collections?.some(g=>g.id===c.collectionId)?`<button ${act('collectionHome',`data-collection="${esc(c.collectionId)}"`)}>${esc(data.collections.find(g=>g.id===c.collectionId).title)}</button>${divider}`:''}<button ${act('course',`data-id="${esc(c.id)}"`)}>${esc(c.title)}</button>${u?`${divider}<span>${esc(u.title)}</span>`:''}`:`<span>${trHtml("Courses",{})}</span>`;
  return `<span>${({home:tr("Home"),dailyReview:tr("Daily review"),history:tr("History"),settings:tr("Settings"),quiz:tr("Quiz"),explore:tr("Explore")})[view.page]||'Quiznet'}</span>`;
}
function render(){
  rememberAppearanceGroups();
  closeMenu();
  updateNavigation();
  document.body.classList.toggle('library-root',view.page==='library'&&!view.courseId);
  $('#sidebar').innerHTML=`<button class="brand" ${act('dashboard')} aria-label="${trHtml("Quiznet home",{})}"><img src="../../assets/brand/mark.svg" alt="" class="brand-mark"><span>Quiznet</span></button><nav class="app-nav" aria-label="${trHtml("Navigation",{})}">${[['dashboard',tr("Home"),'grid',['home','savedQuestions','savedPractice'].includes(view.page)],['home',tr("Library"),'book',['library','instructions'].includes(view.page)],['dailyReview',tr("Daily review"),'clock',['dailyReview','reviewQuestion','notebook','mistakePractice'].includes(view.page)],['history',tr("History"),'clock',['history','result'].includes(view.page)],['explore',tr("Explore"),'grid',view.page==='explore']].map(([action,label,mark,active])=>`<button class="nav-item ${active?'active':''}" ${act(action)} aria-label="${label}" title="${label}" ${active?'aria-current="page"':''}>${icon(mark)}<span>${label}${action==='explore'?`<small>${trHtml("Coming soon",{})}</small>`:''}</span></button>`).join('')}</nav><div class="sidebar-bottom"><button class="nav-item ${view.page==='settings'?'active':''}" ${act('settings')} aria-label="${trHtml("Settings",{})}" title="${trHtml("Settings",{})}" ${view.page==='settings'?'aria-current="page"':''}>${icon('settings')}<span>${trHtml("Settings",{})}</span></button></div>`;

  const c=courseBy(view.courseId),u=c?.units.find(item=>item.id===view.unitId);
  const crumb=pageBreadcrumbs(c,u);
  const creating=view.page==='instructions',studying=['quiz','reviewQuestion','mistakePractice','savedPractice'].includes(view.page);
  $('#main').innerHTML=`${view.page==='library'&&!c?libraryToolbar():`<header class="topbar"><div class="breadcrumbs">${crumb}</div><div class="top-actions">${view.page!=='settings'?button(`${icon('search')}`,'search','secondary library-search library-icon-button',`aria-label="${trHtml("Search library",{})}" aria-keyshortcuts="Control+k" title="${trHtml("Search library (Ctrl+K)",{})}"`):''}${!creating&&!studying&&!['settings','explore'].includes(view.page)?button(tr("{value0} New quiz",{value0:icon('plus')}),'newQuiz','primary',`${c?`data-course="${c.id}"`:''} ${u?`data-unit="${u.id}"`:''}`):''}${button(tr("{value0} Settings",{value0:icon('settings')}),'settings','text header-settings')}</div></header>`}<div class="main-content" id="content">${pageHeading(c,u)}${view.page==='savedQuestions'?savedQuestionsView():view.page==='savedPractice'?savedPracticeView():view.page==='home'?homeView():view.page==='notebook'?notebookView():view.page==='mistakePractice'?mistakePracticeView():view.page==='dailyReview'?dailyReviewView():view.page==='reviewQuestion'?dailyReviewQuestion():view.page==='quiz'?quizView():view.page==='result'?resultView():view.page==='history'?historyView():view.page==='settings'?settingsView():view.page==='explore'?exploreView():view.page==='instructions'?instructionsView():c?courseView(c,u):libraryView()}</div>`;
  updateTimer();
  setTimeout(maybeShowUpdate,0);
}
function pageHeading(c,u){
  if(view.page==='settings'||view.page==='library'&&!c)return '';
  const titles={library:u?.title||c?.title||libraryScopeTitle(),history:tr("History"),settings:tr("Settings")};
  const title=titles[view.page];if(!title)return '';
  const description=view.page==='library'?(u?plural(u.quizzes.length,'quiz'):c?plural(c.units.length,'unit')+' · '+plural(stats(c).quizzes,'quiz'):plural(data.courses.length,'course')+' · '+plural(flatten().length,'quiz')):view.page==='settings'?tr("Manage this device."):tr("See your progress and make room for what matters to you.");
  const actions=view.page==='library'?`<div class="page-actions">${button(`${u?tr("Unit"):c?tr("Course"):tr("Library")} actions ${icon('down')}`,u?'unitMenu':c?'courseMenu':'libraryMenu','secondary',`${c?`data-course="${c.id}"`:''} ${u?`data-unit="${u.id}"`:''} aria-haspopup="menu" aria-expanded="false"`)}</div>`:'';
  return `<div class="page-heading"><div class="page-title">${view.page==='library'?libraryHeading(c,u,title):`<h1>`+esc(title)+`</h1>`}<p>${esc(description)}</p></div>${actions}</div>`;
}
function updateTimer(){
  const s=data?.activeSession,t=s?.timing,now=Date.now(),el=$('#quiz-timer'),question=$('#question-timer');
  if(el){el.textContent=t?timing.duration(timing.elapsed(t,now)):'00:00';el.title=t?.partial?tr("Time recorded since this older attempt was resumed"):tr("Time spent in this quiz");}
  if(question)question.textContent=tr("Question {value0}",{value0:timing.duration(t?(t.questionMs[s.questionIds[s.position]]||0)+timing.elapsed(t,now)-t.elapsedMs:0)});
}
setInterval(updateTimer,500);
function exploreView(){return `<section class="explore-placeholder" aria-labelledby="explore-title"><h1 id="explore-title">${trHtml("Explore",{})}</h1><p>${trHtml("Coming soon.",{})}</p></section>`;}
function instructionField(f){
  const p=instructionDraft[f.id],selected=p.mode==='value'?(f.choices?p.value:'value'):p.mode;
  const disabled=f.id==='codeLanguage'&&instructionDraft.code.mode==='value'&&instructionDraft.code.value==='none';
  const choices=[['auto',tr("Let the agent decide")],['ask',tr("Ask me")],...(f.choices||[['value',f.kind==='number'?tr("Set a number"):tr("Specify…")]])];
  return `<div class="instruction-field"><label for="brief-${f.id}">${esc(tr(f.label))}</label><select id="brief-${f.id}" data-brief-mode="${f.id}" ${disabled?'disabled':''}>${choices.map(([id,label])=>`<option value="${id}" ${id===selected?'selected':''}>${esc(tr(label))}</option>`).join('')}</select>${!f.choices?`<input id="brief-value-${f.id}" data-brief-value="${f.id}" aria-label="${trHtml("{value2} value",{value2:esc(tr(f.label))})}" type="${f.kind==='number'?'number':'text'}" ${f.kind==='number'?`min="${f.min||1}" max="${f.max}" step="1"`:`maxlength="${f.max||2000}"`} value="${esc(p.value)}" placeholder="${esc(tr(f.placeholder||f.label))}" ${p.mode==='value'&&!disabled?'required':'hidden disabled'}>`:''}${f.id==='count'?`<p class="muted instruction-count-summary" aria-live="polite">${esc(instructionCountSummary())}</p>`:''}</div>`;
}
function instructionCountSummary(){
  const mix=brief.mixCounts(instructionDraft);
  if(!mix)return '';
  return mix.open?tr("Mix minimum: {value0}. Counts for {value1} are still undecided.",{value0:plural(mix.minimum,'question'),value1:plural(mix.open,'type')}):tr("Mix total: {value0}.",{value0:plural(mix.fixed,'question')});
}
function instructionsView(){
  const types=instructionDraft.types;
  return `<section class="instructions-page"><h1>${trHtml("Prepare a quiz",{})}</h1><p class="instructions-intro">${trHtml("Choose what matters to you. Give the instructions and your study material to an agent, then import the quiz file it returns.",{})}</p><div class="instructions-layout"><form id="instructions-form">${destinationFields(instructionDestination,'instructions',true)}<div class="instruction-section"><div class="instruction-field"><label for="brief-types">${trHtml("Question types",{})}</label><select id="brief-types" data-brief-mode="types">${[['auto',tr("Let the agent decide")],['ask',tr("Ask me")],['value',tr("Choose my mix")]].map(([id,label])=>`<option value="${id}" ${types.mode===id?'selected':''}>${label}</option>`).join('')}</select></div><div class="instruction-mix" ${types.mode==='value'?'':'hidden'}>${questionModel.types.map(t=>{const p=types.value.find(v=>v.type===t.id);return `<div class="instruction-type"><label for="brief-type-${t.id}">${esc(tr(brief.typeLabel(t)))}</label><select id="brief-type-${t.id}" data-brief-type="${t.id}">${[['auto',tr("Include · agent decides count")],['value',tr("Exact count")],['ask',tr("Ask me for the count")],['omit',tr("Exclude")]].map(([id,label])=>`<option value="${id}" ${p.mode===id?'selected':''}>${label}</option>`).join('')}</select><input type="number" min="1" max="${brief.MAX_QUESTIONS}" step="1" data-brief-count="${t.id}" aria-label="${trHtml("{value7} count",{value7:esc(tr(brief.typeLabel(t)))})}" value="${esc(p.value)}" ${p.mode==='value'?(types.mode==='value'?'required':'disabled'):'hidden disabled'}></div>`;}).join('')}</div>${brief.fields.filter(f=>f.basic).map(instructionField).join('')}</div><details class="instruction-advanced"><summary>${trHtml("Advanced",{})} <span>${trHtml("Difficulty, language, images, feedback, and names",{})}</span></summary><p class="muted">${trHtml("Every setting is optional. Choose “Ask me” to have the agent ask before writing questions.",{})}</p><div class="instruction-grid">${brief.fields.filter(f=>!f.basic&&!['course','unit'].includes(f.id)).map(instructionField).join('')}</div></details><p class="instruction-error" role="alert"></p><div class="instruction-actions">${button(tr("{value0} Save Markdown",{value0:icon('download')}),'saveInstructions','primary')}${button(tr("Copy instructions"),'copyInstructions')}${button(tr("Preview"),'previewInstructions','text')}</div></form><aside class="brief-summary" id="brief-summary" aria-label="${trHtml("Your brief",{})}">${instructionSummary()}</aside></div><p class="muted instruction-next">${trHtml("Attach the saved .md file and your chapter or notes to your preferred agent. After it creates quiznet-quiz.json, {value10}",{value10:button(tr("Import quiz…"),'import','text')})}<br>${trHtml("Quiznet does not send your material anywhere. Your choices stay in this draft while the app is open.",{})}</p></section>`;
}
function instructionSummary(){
  const names=destinationNames(instructionDestination),count=instructionDraft.count,types=instructionDraft.types;
  const countText=count.mode==='value'?plural(count.value,'question'):count.mode==='ask'?tr("Ask me for the count"):tr("Agent chooses the count");
  const typeText=types.mode==='value'?types.value.filter(t=>t.mode!=='omit').map(t=>questionModel.types.find(item=>item.id===t.type)?.label).join(', '):types.mode==='ask'?tr("Ask me for question types"):tr("Agent chooses question types");
  return `<h2>${trHtml("Your brief",{})}</h2><p class="muted">${trHtml("A summary of your instructions.",{})}</p><ul><li>${esc(names.course||tr("Agent chooses the course"))}</li><li>${esc(names.unit||tr("Agent chooses the unit"))}</li><li>${esc(countText)}</li><li>${esc(typeText)}</li></ul><h3>${trHtml("Next steps",{})}</h3><ol><li><strong>${trHtml("Prepare instructions",{})}</strong><span>${trHtml("Save or copy your brief.",{})}</span></li><li><strong>${trHtml("Use with your agent",{})}</strong><span>${trHtml("Attach your instructions and material.",{})}</span></li><li><strong>${trHtml("Import quiz",{})}</strong><span>${trHtml("Review the returned quiz file.",{})}</span></li></ol><p class="muted">${trHtml("Your material stays local. You choose what to share.",{})}</p>`;
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
    if(action==='previewInstructions'){showModal(tr("Quiz instructions"),`<label>${trHtml("Markdown instructions",{})}<textarea class="instruction-preview" aria-label="${trHtml("Markdown instructions",{})}" readonly>${esc(markdown)}</textarea></label>`,button(tr("Close"),'closeModal','primary'),null,true);return;}
    if(await api.instructions(action==='saveInstructions'?'save':'copy',preferences))toast(action==='saveInstructions'?tr("Instructions saved. Attach them with your study material."):tr("Instructions copied."));
  }catch(error){$('.instruction-error').textContent=error.message;$('.instruction-error').scrollIntoView({block:'nearest'});}
}
function attemptComparison(a){
  const ids=new Set(a.questions.map(q=>q.id));
  const previous=data.attempts.slice(0,data.attempts.findIndex(item=>item.id===a.id)).findLast(item=>item.quizId===a.quizId&&Boolean(item.missedOnly)===Boolean(a.missedOnly)&&(item.practice?.feedback||'review')===(a.practice?.feedback||'review')&&item.questions.length===ids.size&&item.questions.every(q=>ids.has(q.id)));
  if(!previous)return '';
  const difference=pct(a)-pct(previous),score=difference?tr(difference>0?'{points} higher':'{points} lower',{points:i18n.count(Math.abs(difference),'point')}):tr("Same score");
  const comparable=a.timingMode==='active'&&previous.timingMode==='active',delta=a.elapsedSeconds-previous.elapsedSeconds;
  return `<p class="attempt-comparison">${trHtml("Previous: {value0}%{value1}. {value2}{value3}.",{value0:pct(previous),value1:comparable?` · ${timing.duration(previous.elapsedSeconds*1000)}`:'',value2:score,value3:comparable?` · ${delta?tr(delta<0?'{duration} faster':'{duration} slower',{duration:timing.duration(Math.abs(delta)*1000)}):tr("Same time")}`:''})}</p>`;
}
function resumeBanner(){return draftBanner()+(data.activeSession?`<div class="resume-banner"><span>${esc(sessionQuiz()?.title)} <small>${trHtml("· In progress",{})}</small></span><div class="button-row">${button(tr("Resume"),'resume','secondary')}${button(icon('more'),'attemptMenu','icon-button text',`aria-label="${trHtml("Unfinished quiz actions",{})}" aria-haspopup="menu" aria-expanded="false"`)}</div></div>`:'');}
function courseView(c,selectedUnit){
  const units=selectedUnit?[selectedUnit]:c.units;
  return `${resumeBanner()}${courseFocusBanner(c)}${units.map(u=>`<section class="unit-section"><div class="unit-heading">${selectedUnit?`<h2>${trHtml("Quizzes",{})}</h2>`:`<button class="unit-link" ${act('unit',`data-course="${c.id}" data-id="${u.id}"`)}>${esc(u.title)}${icon('chevron')}</button>`}${!selectedUnit?`<div class="button-row">`+button(tr("Unit actions {value0}",{value0:icon('down')}),'unitMenu','text',`data-course="${c.id}" data-unit="${u.id}" aria-label="${trHtml("Manage {value2}",{value2:esc(u.title)})}" aria-haspopup="menu" aria-expanded="false"`)+`</div>`:''}</div><div class="quiz-list">${u.quizzes.map(q=>quizRow(q,c,u)).join('')}${!u.quizzes.length?`<div class="empty-unit">${trHtml("No quizzes.",{})}</div>`:''}</div></section>`).join('')}${!units.length?empty(tr("No units yet.")):''}`;
}
function quizRow(q,c,u){
  const attempts=data.attempts.filter(a=>a.quizId===q.id&&!a.missedOnly),best=attempts.length?attempts.reduce((best,a)=>Math.max(best,pct(a)),0):null;
  return `<article class="quiz-row"><div class="quiz-info"><h3>${esc(q.title)}</h3><span>${plural(q.questions.length,'question')}${best!==null?tr(" · Best {value0}%",{value0:best}):''}</span></div>${button(tr("Start"),'start','secondary',`data-id="${q.id}" aria-label="${trHtml("Start {value1}",{value1:esc(q.title)})}"`)}${button(icon('more'),'quizMenu','icon-button text',`data-course="${c.id}" data-unit="${u.id}" data-id="${q.id}" aria-label="${trHtml("Options for {value3}",{value3:esc(q.title)})}" aria-haspopup="menu" aria-expanded="false"`)}</article>`;
}
function quizNavigation(s,questions,options){
  if(!options.showNavigator&&!options.showProgress&&!options.allowFlags)return '';
  const answered=questions.filter(q=>practice.answered(s,q)).length,flags=s.flaggedQuestionIds||[],pageSize=100,start=Math.floor(s.position/pageSize)*pageSize,end=Math.min(start+pageSize,questions.length),flagged=flags.includes(s.questionIds[s.position]);
  const tools=`${options.allowFlags?button(`${icon('flag')} ${flagged?tr("Flagged"):tr("Flag")}`,'flagQuestion',`secondary flag-question ${flagged?'is-flagged':''}`,`aria-label="${trHtml("Flag for review",{})}" aria-pressed="${flagged}" title="${flagged?tr("Remove flag"):tr("Flag this question for review")}"`):''}${options.allowFlags&&flags.length?button(tr("Review flags ({value0})",{value0:flags.length}),'reviewFlags','text'):''}${options.showNavigator?button(icon('info'),'navigationHelp','text icon-button',`aria-label="${trHtml("Question status help",{})}" title="${trHtml("Question status help",{})}"`):''}`;
  return `<section class="quiz-navigation" aria-label="${trHtml("Quiz navigation",{})}"><div class="quiz-progress-label">${options.showNavigator||options.showProgress?`<span>${trHtml("Question {value0} of {value1}",{value0:s.position+1,value1:questions.length})} <span class="muted">${trHtml("· {value2} answered",{value2:answered})}</span></span>`:''}<div class="navigation-tools">${tools}</div></div>${options.showProgress?`<div class="quiz-progress" role="progressbar" aria-label="${trHtml("Question position",{})}" aria-valuemin="0" aria-valuemax="${questions.length}" aria-valuenow="${s.position+1}" aria-valuetext="${trHtml("Question {value2} of {value3}",{value2:s.position+1,value3:questions.length})}"><span style="width:${(s.position+1)/questions.length*100}%"></span></div>`:''}${options.showNavigator?`<nav class="question-squares" aria-label="${trHtml("Questions",{})}">${questions.slice(start,end).map((q,j)=>{const i=start+j,done=practice.answered(s,q),flagged=flags.includes(q.id),current=i===s.position,label=tr("Question {value0}, {value1}{value2}{value3}",{value0:i+1,value1:tr(done?'answered':'unanswered'),value2:flagged?tr(", flagged"):'',value3:current?tr(", current"):''});return `<button class="question-square ${flagged?'flagged':done?'answered':'unanswered'} ${current?'current':''}" ${act('position',`data-index="${i}"`)} aria-label="${label}" title="${label}" ${current?'aria-current="step"':''}>${i+1}${flagged?`<span class="flag-dot" aria-hidden="true"></span>`:''}</button>`;}).join('')}</nav>${questions.length>pageSize?`<div class="palette-pages">${button(tr("Previous"),'position','text',`data-index="${Math.max(0,start-pageSize)}" ${start===0?'disabled':''} aria-label="${trHtml("Previous question group",{})}"`)}<span>${start+1}–${end}</span>${button(tr("Next"),'position','text',`data-index="${end}" ${end===questions.length?'disabled':''} aria-label="${trHtml("Next question group",{})}"`)}</div>`:''}`:''}</section>`;
}
function navigationHelp(){const qa=currentQuizAppearance();showModal(tr("Question colors"),`<div class="status-key">${[['current',qa.currentColor?tr("Current"):tr("Blue · Current")],['answered',qa.answeredColor?tr("Answered"):tr("Green · Answered")],['flagged',qa.flaggedColor?tr("Flagged"):tr("Orange · Flagged")],['unanswered',qa.unansweredColor?tr("Unanswered"):tr("Red · Unanswered")]].map(([state,label])=>`<div><span class="question-square ${state}" aria-hidden="true">1</span><span>${label}</span></div>`).join('')}</div><p class="muted">${trHtml("Colors show progress, not correctness.",{})}</p>`,button(tr("Close"),'closeModal','primary'),null);}
function quizView(){
  const s=data.activeSession;if(!s){view.page='library';return libraryView();}
  const quiz=sessionQuiz(),byId=new Map(quiz.questions.map(q=>[q.id,q])),questions=s.questionIds.map(id=>byId.get(id));
  return quizSurface(quiz,questions,s);
}
function quizSurface(quiz,questions,s){
  const q=questions[s.position],type=questionModel.typeOf(q),selected=questionModel.selectedIndices(q,s.answers[q.id]),options={...practice.defaults,...s.practice};
  const checked=options.feedback==='instant'&&s.checkedQuestionIds.includes(q.id),correct=checked&&questionModel.reviewedCorrect(q,s.answers[q.id],s.selfCorrectedIndices?.includes(s.position));
  const orderedOptions=(questionModel.isChoice(q)?(s.optionOrders?.[q.id]||q.options.map((_,i)=>i)):[]).map((i,position)=>({i,position,o:q.options[i]}));
  return `<div class="quiz-header"><button class="back-link" ${act('pause')}>${trHtml("{value1} Exit",{value1:icon('back')})}</button><h1>${esc(quiz.title)}</h1>${options.showTotalTimer?`<span class="quiz-timer" id="quiz-timer" role="timer" aria-label="${trHtml("Quiz elapsed time",{})}" title="${trHtml("Time spent in this quiz",{})}"></span>`:''}<select class="question-jump" id="question-jump" aria-label="${trHtml("Go to question",{})}">${questions.map((item,i)=>`<option value="${i}" ${s.position===i?'selected':''}>${i+1} / ${questions.length}${(options.feedback==='instant'?s.checkedQuestionIds.includes(item.id):questionModel.validAnswer(item,s.answers[item.id]))?' ✓':''}</option>`).join('')}</select>${button(tr("Quiz actions {value0}",{value0:icon('down')}),'attemptMenu','text','aria-haspopup="menu" aria-expanded="false"')}</div>${quizNavigation(s,questions,options)}<section class="question-panel"><div class="quiz-question-column"><div class="question-prompt" role="heading" aria-level="2">${promptBody(q)}</div><div class="question-meta">${copyQuestionButton('data-copy-source="quiz"',q)}<p class="question-instruction" id="answer-instruction">${esc(tr(type.label))}</p>${options.showQuestionTimer?`<span class="quiz-timer" id="question-timer" role="timer" aria-label="${trHtml("Time spent on this question",{})}" title="${trHtml("Includes previous visits to this question",{})}"></span>`:''}</div></div><div class="quiz-answer-column">${questionModel.isChoice(q)?`<div class="answer-options" role="group" aria-describedby="answer-instruction" aria-label="${trHtml("Answer choices",{})}">${orderedOptions.map(({o,i,position})=>`<button dir="${i18n.direction()}" class="answer-option ${selected.includes(i)?'chosen':''} ${checked?(questionModel.correctIndices(q).includes(i)?'feedback-right':selected.includes(i)?'feedback-wrong':''):''}" ${act('answer',`data-question="${esc(q.id)}" data-index="${i}"`)} aria-pressed="${selected.includes(i)}" ${checked?'disabled':''}><span class="option-letter">${optionLabel(position)}</span><div class="answer-content">${rich(o,q)}</div><span class="option-radio ${type.selection==='multiple'?'option-checkbox':''}">${checked?(questionModel.correctIndices(q).includes(i)?icon('check'):selected.includes(i)?icon('close'):''):selected.includes(i)?icon('check'):''}</span></button>`).join('')}</div>`:responseControls(q,s.answers[q.id],{context:"quiz",disabled:checked})}${checked?`<div class="answer-feedback ${correct?'right':'wrong'}" role="status" aria-live="polite" aria-atomic="true"><strong>${icon(correct?'check':'close')} ${correct?tr("Correct"):tr("Incorrect")}</strong>${!correct?`<div class="feedback-solution"><span>${trHtml(type.selection==='multiple'?'Correct answers':'Correct answer')}</span>${responseCorrectContent(q)}</div>`:''}${writtenReviewControls(q,s.answers[q.id],{source:"quiz",questionId:q.id},s.selfCorrectedIndices?.includes(s.position))}${q.explanation?`<div class="feedback-explanation">${rich(q.explanation,q)}</div>`:''}</div>`:''}</div><div class="question-controls">${button(tr("{value0} Previous",{value0:icon('back')}),'position','secondary',`data-index="${s.position-1}" ${s.position===0?'disabled':''}`)}${s.position===questions.length-1?button(options.feedback==='instant'&&!questionModel.isChoice(q)&&!checked?tr('Check answer'):options.feedback==='instant'&&type.selection==='multiple'&&!checked?tr("Next"):tr("Finish"),'finish','primary'):button(`${options.feedback==='instant'&&!questionModel.isChoice(q)&&!checked?tr('Check answer'):checked&&type.selection!=='single'?tr("Continue"):tr("Next")} ${icon('arrow')}`,'advance','primary',`data-index="${s.position+1}"`)}</div></section>`;
}
function reviewCard(q,i,a){const correct=questionModel.resultCorrect(a,i,q);return `<article class="review-card"><div class="review-top"><span class="review-number">${i+1}.</span><div class="review-question" role="heading" aria-level="2">${promptBody(q)}</div><span class="review-badge ${correct?'right':'wrong'}">${icon(correct?'check':'close')} ${correct?tr("Correct"):tr("Incorrect")}</span></div>${a.questionTimesMs?.[i]!=null?`<p class="question-time">${trHtml("Time spent {value0}{value1}",{value0:timing.duration(a.questionTimesMs[i]),value1:a.timingMode==='active-partial'?tr(" · Since resuming"):''})}</p>`:''}${copyQuestionButton(`data-copy-source="result" data-attempt="${esc(a.id)}" data-index="${i}"`,q)}<div class="review-answers"><div class="${correct?'right-answer':'wrong-answer'}"><span>${trHtml("Your answer",{})}</span>${responseContent(q,a.answers[i])}</div>${!correct?`<div class="right-answer"><span>${trHtml("Correct answer",{})}</span>${responseCorrectContent(q)}</div>`:''}</div>${writtenReviewControls(q,a.answers[i],{source:"result",attemptId:a.id,index:i},a.selfCorrectedIndices?.includes(i))}${q.explanation?`<div class="explanation">${rich(q.explanation,q)}</div>`:''}</article>`;}
function questionPager(total,size,page,kind){
  if(total<=size)return '';
  const pages=Math.ceil(total/size),label=kind==='editor'?tr("Edit questions"):tr("Review questions");
  return `<div class="question-pages"><label for="${kind}-page">${label}<select id="${kind}-page" aria-label="${label}">${Array.from({length:pages},(_,index)=>`<option value="${index}" ${index===page?'selected':''}>${trHtml("{value2}–{value3} of {value4}",{value2:index*size+1,value3:Math.min((index+1)*size,total),value4:total})}</option>`).join('')}</select></label><div class="button-row">${button(tr("Previous questions"),kind+'Page','secondary',`data-index="${page-1}" ${page===0?'disabled':''}`)}${button(tr("Next questions"),kind+'Page','secondary',`data-index="${page+1}" ${page===pages-1?'disabled':''}`)}</div></div>`;
}
function resultView(){
  const a=data.attempts.find(a=>a.id===view.attemptId)||data.attempts.at(-1);if(!a)return empty(tr("No results yet."),'home',tr("Library"));
  const page=view.reviewPage||0,start=page*REVIEW_PAGE_SIZE;
  const reviewQuestions=a.questions.map((q,i)=>({q,i})).filter(({q,i})=>!view.incorrectOnly||!questionModel.resultCorrect(a,i,q));

  return `<p class="eyebrow">${trHtml("Quiz complete",{})}</p><section class="result-summary"><div><h1>${esc(a.title)}</h1><span>${trHtml("{value1} / {value2} correct{value3} · {value4} {value5}",{value1:a.score,value2:a.total,value3:a.practice?.feedback==='instant'?tr(" · Instant feedback"):'',value4:a.timingMode==='active-partial'?tr("Tracked time"):tr("Time"),value5:timing.duration(a.elapsedSeconds*1000)})}</span>${attemptComparison(a)}</div><strong class="score-value">${pct(a)}%</strong><div class="button-row">${button(icon('download')+' '+tr('Export study report'),'studyReport','secondary',`data-id="${esc(a.id)}"`)}${practice.missed(a).length?button(tr("Practice missed questions"),'startMissed','primary',`data-id="${a.id}"`):''}${find(a.quizId)?button(tr("Retry"),'start','secondary',`data-id="${a.quizId}"`):''}${button(tr("Back to Library"),'home','text')}</div></section><div class="review-filters" role="group" aria-label="${trHtml("Review filter",{})}">${button(tr("All questions"),'filterReview',view.incorrectOnly?'secondary':'secondary selected',`data-filter="all" aria-pressed="${!view.incorrectOnly}"`)}${button(tr("Incorrect ({value0})",{value0:a.total-a.score}),'filterReview',view.incorrectOnly?'secondary selected':'secondary',`data-filter="incorrect" aria-pressed="${Boolean(view.incorrectOnly)}"`)}</div>${questionPager(reviewQuestions.length,REVIEW_PAGE_SIZE,page,'review')}<div class="review-list">${reviewQuestions.slice(start,start+REVIEW_PAGE_SIZE).map(({q,i})=>reviewCard(q,i,a)).join('')}${!reviewQuestions.length?`<p class="empty-message">${trHtml("No incorrect answers in this attempt.",{})}</p>`:''}</div>`;
}
async function studyReportDialog(id){
  const info=await api.studyReportInfo(id);
  const timeNote=info.coverage==='legacy'?tr("This older attempt has no per-question timing. Missing times will be labelled."):info.coverage==='partial'?tr("Timing is partial. The report labels recorded time and leaves missing times unknown."):tr("Recorded times include revisits and exclude pauses and time outside the app.");
  showModal(tr("Study report"),`<p class="modal-intro"><strong>${esc(info.title)}</strong><br>${trHtml("{value1} · {value2} incorrect",{value1:plural(info.total,'question'),value2:info.incorrect})}</p><p>${trHtml("Save one Markdown file to attach to another agent. It includes questions, choices, your answers, the saved answer key and explanations, code, embedded diagrams, timings, and tutor instructions.",{})}</p><label>${trHtml("Include",{})}<select name="scope" id="study-report-scope" aria-label="${trHtml("Include",{})}"><option value="all">${trHtml("All questions",{})}</option><option value="focus" ${info.focus?'':'disabled'}>${trHtml("Mistakes and most time spent",{})}</option></select></label><p id="study-report-count" class="muted">${trHtml("{value4} will be included, across all result pages.",{value4:plural(info.total,'question')})}</p><p class="muted">${trHtml("Time highlights use the top 20% with positive recorded time, up to five questions. Time alone does not indicate a mistake.",{})}</p><p class="muted">${timeNote}</p><p class="muted">${trHtml("Saved locally. You choose whether to share the file. Embedded diagrams require an agent that can read image data from files.",{})}</p>`,modalButtons(tr("Save Markdown")),async values=>{const current=modal;if(await api.exportStudyReport(id,values.get('scope'))){if(modal===current)closeModal();toast(tr("Study report saved."));}});
  modal.studyReport=info;
}
async function backupHistory(){const snapshots=await api.backupHistory();showModal(tr("Backup history"),`<p class="muted">${trHtml("A backup is kept before the first library change each day, and before imports, deletions, and restores. Up to {value0} backups / {value1} MB; a larger newest backup is kept on its own. Keep exported backups on another drive too.",{value0:displayPrefs.recoveryCount,value1:displayPrefs.recoveryMiB})}</p><div class="import-preview">${snapshots.length?snapshots.map(s=>`<div class="snapshot-row"><span><strong>${esc(i18n.date(s.createdAt,{dateStyle:"medium",timeStyle:"short"}))}</strong><small>${trHtml("{value1} · {value2} MB",{value1:esc(s.reason),value2:(s.bytes/1024/1024).toFixed(2)})}</small></span>${button(tr("Restore…"),'restoreSnapshot','secondary',`data-id="${esc(s.id)}"`)}</div>`).join(''):`<p>${trHtml("No saved backups yet.",{})}</p>`}</div>`,`${button(tr("Close"),'closeModal','secondary')}${button(tr("Create backup now"),'createSnapshot','primary')}`);}
function restoreConfirmation(p){showModal(tr("Restore this library?"),`<p><strong>${esc(p.filename)}</strong> ${trHtml("contains {value1} and {value2}.",{value1:plural(p.courses,'course'),value2:plural(p.quizzes,'quiz')})}</p><p>${trHtml("This will replace your current library. A separate copy of it will be kept in the data folder and backup history.",{})}</p>`,modalButtons(tr("Restore")),async()=>{data=await api.restoreConfirm(p.token);await navigate('library');toast(tr("Restored."));});}
function empty(title){return `<p class="empty-message">${title}</p>`;}
let menu=null;
function closeMenu(){if(menu?.trigger?.isConnected){menu.trigger.setAttribute('aria-expanded','false');if($('#menu-root').contains(document.activeElement))menu.trigger.focus();}menu=null;$('#menu-root').innerHTML='';}
function showMenu(trigger,items){
  closeMenu();menu={trigger};trigger.setAttribute('aria-expanded','true');
  $('#menu-root').innerHTML=`<div class="popover-menu" role="menu">${items.map(([label,action,attrs='',danger=false])=>button(label,action,`menu-item${danger?' menu-danger':''}`,`role="${action==='setLibraryView'?'menuitemradio':'menuitem'}" ${attrs}`)).join('')}</div>`;
  const el=$('.popover-menu'),rect=trigger.getBoundingClientRect();
  el.style.left=`${Math.max(8,Math.min(innerWidth-el.offsetWidth-8,(i18n.direction()==='rtl'?rect.left:rect.right-el.offsetWidth)))}px`;
  el.style.top=`${Math.max(32,Math.min(innerHeight-el.offsetHeight-8,rect.bottom+5))}px`;
  el.querySelector('button')?.focus();
}
function attemptMenu(trigger){if(data.activeSession)showMenu(trigger,[[tr("Discard attempt…"),'discard','',true]]);}
function itemMenu(trigger,type){
  const courseId=trigger.dataset.course,unitId=trigger.dataset.unit,quizId=trigger.dataset.id;
  const attrs=`data-course="${esc(courseId)}"${unitId?` data-unit="${esc(unitId)}"`:''}${quizId?` data-id="${esc(quizId)}"`:''}`;
  const items=type==='quiz'?[[tr("Edit…"),'editQuiz',attrs],[tr("Move…"),'moveQuiz',attrs],[tr("Shuffle & start"),'shuffleStart',attrs],[tr("Export…"),'exportQuiz',attrs]]:type==='unit'?[[tr("Rename…"),'rename',attrs]]:[[tr("Appearance & collection…"),'customizeCourse',attrs],[courseBy(courseId)?.pinned?tr("Unpin course"):tr("Pin course"),'pinCourse',attrs+' data-pinned="'+!courseBy(courseId)?.pinned+'"'],[tr("Move up"),'orderCourse',attrs+' data-direction="up"'],[tr("Move down"),'orderCourse',attrs+' data-direction="down"'],[tr("Study focus…"),'courseStudyFocus',attrs],[tr("Course history"),'historyCourse',attrs],[tr("New unit…"),'newUnit',attrs],[tr("Rename…"),'rename',attrs]];
  items.push([tr("Delete…"),'delete',attrs,true]);showMenu(trigger,items);
}
function showModal(title,body,footer,onSubmit,wide=false,isEditor=false,isImport=false){
  if(!isImport)releaseImportPreview();
  closeMenu();
  postponeUpdateDialog();
  if(editor&&!isEditor){flushDraft().catch(error=>toast(error.message));editor=null;}
  if(!modal)previousFocus=document.activeElement;
  modal={onSubmit};
  $('.app-shell').inert=true;$('#navigation-toggle').disabled=true;
  $('#modal-root').innerHTML=`<div class="modal-backdrop ${isEditor||isImport?'workspace-backdrop':''}"><section class="modal ${isEditor?'editor-workspace':isImport?'import-workspace':''} ${wide?'wide':''}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-heading"><h2 id="modal-title">${title}</h2><button class="tiny-button" ${act('closeModal')} aria-label="${trHtml("Close dialog",{})}">${icon('close')}</button></div><form id="modal-form"><div class="modal-body">${body}</div><p class="form-error" role="alert"></p><div class="modal-footer">${footer||button(tr("Cancel"),'closeModal','secondary')}</div></form></section></div>`;
  $('#modal-form').addEventListener('submit',async e=>{
    e.preventDefault();if(!modal?.onSubmit||busy)return;busy=true;const values=new FormData(e.target),controls=(editor?[...e.target.elements]:[e.submitter]).filter(el=>el&&!el.disabled);for(const control of controls)control.disabled=true;
    try{await modal.onSubmit(values);}catch(error){const errorBox=$('.form-error');if(errorBox)errorBox.textContent=error.message;else toast(error.message);}finally{busy=false;for(const control of controls)if(control.isConnected)control.disabled=false;}
  });
  setTimeout(()=>($('.modal-body input:not([disabled]):not([type="radio"]):not([type="hidden"]), .modal-body textarea:not([disabled]), .modal-body select:not([disabled])')||$('.modal button:not([disabled])'))?.focus(),0);
}
function closeModal(){releaseImportPreview();postponeUpdateDialog();if(editor)flushDraft().then(()=>{if(!editor&&view.page==='library')render();}).catch(error=>toast(error.message));modal=null;editor=null;$('#modal-root').innerHTML='';$('.app-shell').inert=false;$('#navigation-toggle').disabled=false;if(previousFocus?.isConnected)previousFocus.focus();previousFocus=null;setTimeout(maybeShowUpdate,0);}
const submit=(label,cls='primary')=>`<button class="btn ${cls}" type="submit">${label}</button>`;
const modalButtons=label=>`${button(tr("Cancel"),'closeModal','secondary')}${submit(label)}`;
function newCourse(){createLibraryCourse();}
function newUnit(courseId){if(!courseId){newCourse();return;}showModal(tr("New unit"),`<label>${trHtml("Unit name",{})}<input name="title" placeholder="${trHtml("Unit 1: Cells",{})}" maxlength="200" required></label>`,modalButtons(tr("Create")),async f=>{await change({type:'createUnit',courseId,title:f.get('title')});const u=courseBy(courseId).units.at(-1);await navigate('library',courseId,u.id);});}
function newQuiz(courseId,unitId){
  const attrs=`data-course="${esc(courseId)}" data-unit="${esc(unitId)}"`;
  showModal(tr("New quiz"),`<p class="modal-intro">${trHtml("Choose one way to add your quiz. All three save to your local library.",{})}</p><div class="quiz-create-choices">${[[tr("Write manually"),'newManual','edit',tr("Write questions and answers in the editor.")],[tr("Prepare with an agent"),'prepareAgent','spark',tr("Build instructions for an agent, then import its quiz file.")],[tr("Import file"),'newImport','upload',tr("Add an existing Quiznet JSON or CSV quiz.")]].map(([label,action,mark,detail])=>button(`${icon(mark)}<span><strong>${label}</strong><small>${detail}</small></span>${icon('chevron')}`,action,'secondary quiz-create-choice',`${attrs} aria-label="${label}"`)).join('')}</div>`,button(tr("Cancel"),'closeModal'),null);
}
async function editQuiz(quizId,courseId,unitId){await flushDraft();if(meta.draft||meta.draftError){showModal(tr("Saved editor draft"),`<p>${trHtml("Recover or discard the saved draft before starting another editor session.",{})}</p>`,`${button(tr("Cancel"),'closeModal','secondary')}${button(tr("Discard draft"),'discardDraft','secondary')}${meta.draft?button(tr("Recover draft"),'recoverDraft','primary'):''}`);return;}const found=quizId?find(quizId):null;editor={quizId,courseId:found?.course.id||courseId,unitId:found?.unit.id||unitId,destination:destinationDraft(found?.course.id||courseId,found?.unit.id||unitId),title:found?.quiz.title||'',...(found?.quiz.reference?{reference:structuredClone(found.quiz.reference)}:{}),questions:found?structuredClone(found.quiz.questions):[blankQuestion()]};renderEditor();}
function blankQuestion(){return questionModel.blankQuestion();}
function editorQuestion(q,i,total) {
  const html=q.format==='html',formatted=['html','markdown'].includes(q.format),limit=html?window.QuiznetContentPolicy.MAX_HTML_LENGTH:q.format==='markdown'?window.QuiznetCodePolicy.MAX_MARKDOWN_LENGTH:10000;
  const type=questionModel.typeOf(q);
  return `<section class="editor-question" data-question-index="${i}">
    <div class="editor-question-heading"><strong>${trHtml("QUESTION",{})} <span class="editor-question-number">${i+1}</span></strong><div class="editor-tools"><label class="format-switch">${trHtml("Format",{})}<select data-editor="format" data-index="${i}" aria-label="${trHtml("Question format",{})}">${[['text',tr("Text")],['html','HTML'],['markdown','Markdown']].map(([id,label])=>`<option value="${id}" ${(q.format||'text')===id?'selected':''}>${label}</option>`).join('')}</select></label>${q.code===undefined?button(tr("Add code"),'addCode','text',`data-index="${i}"`):''}${button(q.image?tr("Replace image"):tr("Add image"),'addImage','text',`data-index="${i}"`)}${total>1?button(icon('trash'),'removeQuestion','text icon-button',`data-index="${i}" aria-label="${trHtml("Remove question {value1}",{value1:i+1})}"`):''}</div></div>
    <div class="editor-columns"><div class="editor-writing"><label>${trHtml("Question type",{})}<select data-editor="type" data-index="${i}">${questionModel.types.map(t=>`<option value="${t.id}" ${type.id===t.id?'selected':''}>${esc(tr(t.label))}</option>`).join('')}</select></label>
    <label>${trHtml("Question",{})}<textarea data-editor="prompt" data-index="${i}" required maxlength="${limit}" rows="2" dir="auto" placeholder="${html?`<p>${trHtml("Your question",{})}</p>`:tr("Question")}">${esc(q.prompt)}</textarea></label>
    ${q.format==='markdown'?`<p class="muted math-hint">${trHtml("Math: $x^2$ inline or $$...$$ on separate lines. Works in choices and explanations too. Use Add image for a prepared diagram.",{})}</p>`:''}
    ${q.image?`<div class="editor-image">${content.image(q)}${button(icon('close'),'removeImage','text icon-button',`data-index="${i}" aria-label="${trHtml("Remove image from question {value1}",{value1:i+1})}"`)}<label>${trHtml("Image description",{})}<input data-editor="imageAlt" data-index="${i}" value="${esc(q.imageAlt)}" maxlength="500" placeholder="${trHtml("Describe the image",{})}"></label></div>`:''}
    ${q.code!==undefined?`<div class="editor-code"><div class="editor-code-heading"><label>${trHtml("Code language",{})}<select data-editor="codeLanguage" data-index="${i}" aria-label="${trHtml("Code language",{})}">${window.QuiznetCodePolicy.languages.map(language=>`<option value="${language.id}" ${(q.codeLanguage||'plaintext')===language.id?'selected':''}>${esc(tr(language.label))}</option>`).join('')}${!window.QuiznetCodePolicy.languages.some(language=>language.id===q.codeLanguage)&&q.codeLanguage?`<option selected value="${esc(q.codeLanguage)}">${trHtml("{value1} (plain text)",{value1:esc(q.codeLanguage)})}</option>`:''}</select></label>${button(tr("Remove code"),'removeCode','text',`data-index="${i}"`)}</div><label>${trHtml("Code",{})}<textarea class="code-source" data-editor="code" data-index="${i}" maxlength="${window.QuiznetCodePolicy.MAX_CODE_LENGTH}" rows="6" dir="ltr" spellcheck="false" required placeholder="${trHtml("Paste code here",{})}">${esc(q.code)}</textarea></label></div>`:''}
    </div><div class="editor-answer-column">${editorAnswerFields(q,i,formatted,limit)}
    </div></div><details class="editor-preview" data-preview="${i}"><summary>${trHtml("Preview",{})}</summary><div class="preview-content">${previewQuestion(q)}</div></details>${questionHintEditor(q,i)}
  </section>`;
}
function previewQuestion(q){return `<div class="preview-prompt">${promptBody(q)}</div><p class="question-instruction">${esc(tr(questionModel.typeOf(q).instruction))}</p>${questionModel.isChoice(q)?`<div class="preview-options">${questionChoicesContent(q)}</div>`:questionChoicesContent(q)}${q.explanation?`<div class="explanation">${rich(q.explanation,q)}</div>`:''}`;}
function renderEditor(resetScroll=false){
  const e=editor;
  e.page=Math.max(0,Math.min(e.page||0,Math.ceil(e.questions.length/EDITOR_PAGE_SIZE)-1));
  const start=e.page*EDITOR_PAGE_SIZE;
  const scroll=resetScroll?0:$('.modal-body')?.scrollTop||0,open=[...document.querySelectorAll('.editor-preview[open]')].map(el=>el.dataset.preview);
  showModal(e.quizId?tr("Edit quiz"):tr("New quiz"),`${e.quizId?`<p class="modal-intro">${esc(courseBy(e.courseId)?.title)} → ${esc(courseBy(e.courseId)?.units.find(u=>u.id===e.unitId)?.title)}</p>`:destinationFields(e.destination,'editor')}<label>${trHtml("Quiz title",{})}<input data-editor="title" value="${esc(e.title)}" placeholder="${trHtml("Quiz 1",{})}" required maxlength="200"></label>${referenceEditor()}${questionPager(e.questions.length,EDITOR_PAGE_SIZE,e.page,'editor')}<div class="editor-layout"><nav class="editor-outline" aria-label="${trHtml("Editor questions",{})}"><strong>${trHtml("Questions",{})}</strong>${e.questions.slice(start,start+EDITOR_PAGE_SIZE).map((q,i)=>button(`${start+i+1}. ${esc(content.plain(q.prompt,q.format).slice(0,55)||tr("New question"))}`,'editorJump','text',`data-index="${start+i}"`)).join('')}</nav><div class="editor-questions">${e.questions.slice(start,start+EDITOR_PAGE_SIZE).map((q,i)=>editorQuestion(q,start+i,e.questions.length)).join('')}</div></div>${button(tr("{value0} Add question",{value0:icon('plus')}),'addQuestion','secondary')}<p class="muted" id="draft-status" role="status">${e.dirty?tr("Saving draft…"):meta.draft?tr("Draft saved on this device"):tr("Changes will be saved as a recovery draft.")}</p><p class="muted">${trHtml("Close keeps this draft. Cancel discards it.",{})}</p>`,`${button(tr("Cancel"),'cancelEditor','secondary',`title="${trHtml("Discard this editor draft",{})}"`)}${submit(tr("Save quiz"))}`,async()=>{const {quizId,courseId,unitId,title,questions,destination}=editor;const target=destinationTarget(destination);try{await flushDraft();await change({type:'saveQuiz',quizId,courseId,unitId,title,questions,reference:editorReference(),...(!quizId?{target}:{})});}catch(error){const question=error.message.match(/Question (\d+)/);if(question){editor.page=Math.floor((Number(question[1])-1)/EDITOR_PAGE_SIZE);renderEditor();}throw error;}editor=null;let warning='';try{await clearDraft();}catch(error){warning=' '+tr('The quiz was saved, but the recovery draft could not be removed: {message}',{message:tr(error.message)});}await navigateTarget(quizId?{courseId,unitId}:target);toast('Saved.'+warning);},true,true);
  modal.destination=e.destination;
  for (const index of open) $(`.editor-preview[data-preview="${index}"]`)?.setAttribute('open','');
  for(let index=start;index<Math.min(start+EDITOR_PAGE_SIZE,e.questions.length);index++){const q=e.questions[index];if(q.code!==undefined)$(`[data-editor="code"][data-index="${index}"]`).value=q.code;}
  setTimeout(()=>{$('.modal-body')?.scrollTo(0,scroll);},0);
}
async function startQuiz(quizId,shuffle=false,attemptId=null){
  if(data.activeSession){showModal(tr("Unfinished quiz"),`<p>${esc(sessionQuiz()?.title)}</p>`,`${button(tr("Resume"),'resume','primary')}${button(tr("Discard…"),'discard','secondary')}`,null);return;}
  const source=attemptId?data.attempts.find(a=>a.id===attemptId):null;
  const quiz=attemptId?(source?practice.sessionQuiz(data,{quizId:source.quizId,sourceAttemptId:source.id}):null):find(quizId)?.quiz;
  if(!quiz?.questions.length)return;
  const preset=practice.builtins.find(p=>p.id===(attemptId?'practice':'test'));
  const defaults=attemptId?preset.options:displayPrefs.study;
  const {shuffleQuestions,...options}=defaults;
  const customized=!attemptId&&(shuffleQuestions||Object.keys(options).some(key=>Boolean(options[key])!==Boolean(preset.options[key])||typeof options[key]==='string'&&options[key]!==preset.options[key]));
  startDraft={quizId:quiz.id,attemptId,title:quiz.title,count:quiz.questions.length,profileId:customized?'custom':preset.id,options:{...preset.options,...options},shuffle:shuffle||Boolean(shuffleQuestions)||preset.shuffle};
  if(shuffle)startDraft.profileId='custom';
  renderStart();
}
function readStart(){
  const f=new FormData($('#modal-form'));startDraft.options={feedback:f.get('feedback'),shuffleAnswers:f.has('shuffleAnswers'),...Object.fromEntries(practice.displays.map(([key])=>[key,f.has(key)]))};startDraft.shuffle=f.has('shuffle');
}
function renderStart(){
  const d=startDraft,profiles=[...practice.builtins,...(data.practicePresets||[])],custom=data.practicePresets?.some(p=>p.id===d.profileId);
  showModal(tr("Before you start"),`<div class="start-summary"><div><p class="eyebrow">${trHtml("Quiz",{})}</p><h3>${esc(d.title)}</h3></div><span>${plural(d.count,'question')}</span></div><div class="start-primary-options"><div class="preset-row"><label>${trHtml("Preset",{})}<select id="start-preset" aria-label="${trHtml("Preset",{})}">${profiles.map(p=>`<option value="${esc(p.id)}" ${p.id===d.profileId?'selected':''}>${esc(practice.builtins.some(item=>item.id===p.id)?tr(p.name):p.name)}</option>`).join('')}<option value="custom" ${d.profileId==='custom'?'selected':''}>${trHtml("Custom",{})}</option></select></label>${button(tr("Save as…"),'showPresetSave','text')}${custom?button(icon('trash'),'deletePreset','text icon-button',`aria-label="${trHtml("Delete preset",{})}"`):''}</div><div class="preset-save" hidden><input id="preset-name" aria-label="${trHtml("Preset name",{})}" maxlength="60" placeholder="${trHtml("Preset name",{})}" disabled>${button(tr("Save preset"),'savePreset','secondary')}</div><label>${trHtml("Answer feedback",{})}<select name="feedback" aria-label="${trHtml("Answer feedback",{})}"><option value="review" ${d.options.feedback==='review'?'selected':''}>${trHtml("Review after finishing",{})}</option><option value="instant" ${d.options.feedback==='instant'?'selected':''}>${trHtml("Instant feedback",{})}</option></select></label></div><fieldset class="start-option-group"><legend>${trHtml("Display & navigation",{})}</legend><div class="practice-options">${practice.displays.map(([key,label])=>`<label><input type="checkbox" name="${key}" data-practice ${d.options[key]?'checked':''}>${esc(tr(label))}</label>`).join('')}</div></fieldset><fieldset class="start-option-group"><legend>${trHtml("Question order",{})}</legend><div class="practice-options"><label><input type="checkbox" name="shuffleAnswers" data-practice ${d.options.shuffleAnswers?'checked':''}>${trHtml("Shuffle answer choices",{})}</label><label><input type="checkbox" name="shuffle" data-practice ${d.shuffle?'checked':''}>${trHtml("Shuffle questions",{})}</label></div></fieldset><p class="muted start-note">${trHtml("{value12} Timers record even when hidden.",{value12:d.options.feedback==='instant'?tr("Answers lock on feedback. For multiple answers, use Next."):tr("Answers stay editable until you finish.")})}</p>`,modalButtons(tr("Start quiz")),async()=>{
    readStart();await change({type:d.attemptId?'startMissed':'start',quizId:d.quizId,attemptId:d.attemptId,shuffle:d.shuffle,practice:d.options});await navigate('quiz');
  });
  document.querySelector('.modal').classList.add('start-options-dialog');
}

async function completeQuiz(){await change({type:'finish'});view={page:'result',attemptId:data.attempts.at(-1).id};closeModal();render();$('#main').scrollTop=0;}
async function revealCurrent(){
  const s=data.activeSession,q=sessionQuiz()?.questions.find(q=>q.id===s?.questionIds[s.position]);
  if(s?.practice?.feedback!=='instant'||!q||questionModel.typeOf(q).selection==='single'||s.checkedQuestionIds.includes(q.id))return false;
  if(!questionModel.validAnswer(q,s.answers[q.id])){toast(tr("Select an answer."));return true;}
  await change({type:'checkAnswer',questionId:q.id});render();$('.answer-feedback')?.scrollIntoView({block:'nearest'});return true;
}
function manage(action,b){
  const quizId=b.dataset.id,courseId=b.dataset.course,unitId=b.dataset.unit;
  const c=courseBy(courseId),u=c?.units.find(u=>u.id===unitId),q=quizId?find(quizId)?.quiz:null,item=q||u||c;
  if(!item)return;
  if(action==='rename')showModal(tr("Rename"),`<label>${trHtml("Name",{})}<input name="title" value="${esc(item.title)}" required maxlength="200"></label>`,modalButtons(tr("Save")),async f=>{await change({type:'rename',courseId,unitId,quizId,title:f.get('title')});closeModal();render();});
  else showModal(tr("Delete this {value0}?",{value0:tr(q?'quiz':u?'unit':'course')}),`<p><strong>${esc(item.title)}</strong> ${trHtml("will be removed along with {value1}.",{value1:q?'its practice history':u?'its quizzes and practice history':tr("its units, quizzes, and practice history")})}</p>`,`${button(tr("Cancel"),'closeModal','secondary')}${submit(tr("Delete"),'danger')}`,async()=>{await change({type:'delete',courseId,unitId,quizId});if(!courseBy(view.courseId))await navigate('library');else if(view.unitId&&!courseBy(view.courseId)?.units.some(u=>u.id===view.unitId))await navigate('library',view.courseId);else{closeModal();render();}toast(tr("Deleted."));});
}
function moveQuiz(quizId){
  const found=find(quizId);if(!found)return;
  const destination=destinationDraft(found.course.id,found.unit.id);
  showModal(tr("Move quiz"),`<p class="modal-intro"><strong>${esc(found.quiz.title)}</strong><br>${trHtml("From {value1} → {value2}",{value1:esc(found.course.title),value2:esc(found.unit.title)})}</p>${destinationFields(destination,'move')}<p class="muted">${trHtml("History and unfinished progress stay with this quiz.",{})}</p>`,modalButtons(tr("Move quiz")),async()=>{const target=destinationTarget(destination);await change({type:'moveQuiz',quizId,target});await navigateTarget(target);toast(tr("Quiz moved."));});
  modal.destination=destination;
}
function releaseImportPreview(){const draft=modal?.importPreview;if(draft){modal.importPreview=null;api.cancelImport(draft.token).catch(()=>{});}}
function importIssue(issue,answerRevealed){
  const messages={'repeated':tr("Identical content appears elsewhere in this file."),'existing':tr("Identical content already exists in your library."),'explanation':tr("No explanation provided (optional)."),'conflicting-answer':tr("Matching question content has a different answer key. Check both questions."),'similar-options':tr("Some choices differ only in letter case or spacing. Check that they are distinct."),'placeholder':tr("Some text looks like an unfinished placeholder."),'all-correct':answerRevealed?tr("Every choice is marked correct. Check that this is intended."):tr("Review the answer-key selection."),'image-description':tr("The image has no description (optional)."),'visible-prompt':tr("The question text is empty after safe formatting."),'visible-options':tr("Choice {value0} has no visible text after safe formatting.",{value0:(issue.options||[]).join(', ')})};
  return `${esc(messages[issue.code]||tr("Review this question."))}${issue.related?` ${button(tr("View quiz {value0}, question {value1}",{value0:issue.related.packIndex+1,value1:issue.related.questionIndex+1}),'relatedImportQuestion','text',`data-pack="${issue.related.packIndex}" data-index="${issue.related.questionIndex}"`)}`:''}`;
}
function importIndices(draft){return draft.onlyIssues?draft.report.reviewIndices[draft.packIndex]:Array.from({length:draft.packs[draft.packIndex].count},(_,i)=>i);}
function inspectVisibleImportQuestion(draft,packIndex,questionIndex,current){
  const q=current.question;
  if(!content.plain(q.prompt,q.format).trim())current.issues.push({code:'visible-prompt'});
  const options=(q.options||[]).flatMap((o,i)=>!content.plain(o,q.format).trim()?[optionLabel(i)]:[]);
  if(options.length)current.issues.push({code:'visible-options',options});
  const indices=draft.report.reviewIndices[packIndex];
  if(current.issues.length&&!indices.includes(questionIndex)){const position=indices.findIndex(i=>i>questionIndex);indices.splice(position<0?indices.length:position,0,questionIndex);draft.report.flagged++;}
  return current;
}
function importQuestionView(draft){
  const pack=draft.packs[draft.packIndex],current=draft.current,indices=importIndices(draft),position=indices.indexOf(draft.questionIndex),disabled=draft.loading?'disabled':'';
  return `<div class="import-question-controls"><label>${trHtml("Quiz",{})}<select id="import-pack" ${disabled}>${draft.packs.map((p,i)=>`<option value="${i}" ${i===draft.packIndex?'selected':''}>${esc(p.title)} · ${plural(p.count,'question')}</option>`).join('')}</select></label><label>${trHtml("Show",{})}<select id="import-review-filter" ${disabled}><option value="all" ${!draft.onlyIssues?'selected':''}>${trHtml("All questions",{})}</option><option value="issues" ${draft.onlyIssues?'selected':''}>${trHtml("Needs review ({value5})",{value5:draft.report.reviewIndices[draft.packIndex].length})}</option></select></label></div><p class="muted">${esc(pack.course)} → ${esc(pack.unit)}</p>${draft.loading?`<p class="muted" role="status">${trHtml("Loading question…",{})}</p>`:''}${!current?`<p class="muted">${trHtml("No questions were flagged in this quiz. Choose All questions to inspect it.",{})}</p>`:(()=>{
    const q=current.question,correct=draft.answerRevealed?questionModel.correctIndices(q):[],warnings=current.issues;
    return `<div class="import-question-navigation"><label>${trHtml("Question number",{})}<input id="import-question-number" inputmode="numeric" maxlength="5" value="${draft.questionIndex+1}" aria-label="${trHtml("Question number",{})}" ${disabled}></label><span class="muted">${trHtml("of {value2}{value3}",{value2:pack.count,value3:draft.onlyIssues?tr(" · {value0} of {value1} flagged",{value0:position+1,value1:indices.length}):''})}</span><div class="button-row">${button(tr("Previous question"),'previousImportQuestion','secondary',position<=0||draft.loading?'disabled':'')}${button(tr("Next question"),'nextImportQuestion','secondary',position===indices.length-1||draft.loading?'disabled':'')}</div></div><article class="import-question-card" aria-label="${trHtml("Question {value6} preview",{value6:draft.questionIndex+1})}"><div class="import-question-meta"><strong>${trHtml("Question {value7} of {value8}",{value7:draft.questionIndex+1,value8:pack.count})}</strong><span>${esc(tr(questionModel.typeOf(q).label))}</span></div>${warnings.length?`<aside class="import-question-issues" aria-label="${trHtml("Question review notes",{})}"><strong>${trHtml("Review notes",{})}</strong><ul>${warnings.map(w=>`<li>${importIssue(w,draft.answerRevealed)}</li>`).join('')}</ul></aside>`:`<p class="muted">${trHtml("No automatic review notes for this question.",{})}</p>`}<div class="import-columns"><div class="import-prompt-column"><div class="import-question-prompt">${promptBody(q)}</div><p class="question-instruction">${esc(tr(questionModel.typeOf(q).instruction))}</p></div><div class="import-answer-column"><h3>${trHtml("Answer options",{})}</h3>${questionModel.isChoice(q)?`<div class="import-question-choices">${q.options.map((option,i)=>`<div class="import-choice ${correct.includes(i)?'is-correct':''}"><span class="option-letter">${optionLabel(i)}</span>${rich(option,q)}${correct.includes(i)?`<span class="import-correct-label">${trHtml("Correct answer",{})}</span>`:''}</div>`).join('')}</div>`:questionChoicesContent(q)}${draft.answerRevealed&&!questionModel.isChoice(q)?`<div class="right-answer">${responseCorrectContent(q)}</div>`:''}${button(draft.answerRevealed?tr("Hide correct answer"):tr("Show correct answer"),'toggleImportAnswer','secondary',`aria-expanded="${draft.answerRevealed}" ${disabled}`)}${draft.answerRevealed?(q.explanation?`<div class="explanation"><strong>${trHtml("Explanation",{})}</strong>${rich(q.explanation,q)}</div>`:`<p class="muted">${trHtml("No explanation provided.",{})}</p>`):''}</div></div></article>`;
  })()}`;
}
function paintImportQuestion(draft,restoreFocus=null){
  if(modal?.importPreview!==draft)return;
  const root=$('#import-question-preview'),active=document.activeElement,focus=restoreFocus||(root.contains(active)?{id:active.id,action:active.dataset.action}:null);
  root.innerHTML=importQuestionView(draft);root.setAttribute('aria-busy',String(draft.loading));
  $('#import-flagged-count').textContent=tr('{questions} flagged for review',{questions:plural(draft.report.flagged,'question')});
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
async function importQuestions(destinationOverride){
  const destination=destinationOverride||(view.page==='instructions'?structuredClone(instructionDestination):destinationDraft(view.courseId,view.unitId,true));
  let preferences;try{if(!destinationOverride&&view.page==='instructions')preferences=brief.validate(instructionDraft);}catch{}
  const preview=await api.importPreview(preferences);if(!preview)return;
  try{
    const draft={...preview,destination,packIndex:0,questionIndex:0,onlyIssues:false,answerRevealed:false,loading:false,request:0,current:await api.importQuestion(preview.token,0,0)};
    inspectVisibleImportQuestion(draft,0,0,draft.current);
    clearTimeout(toast.timer);$('#toast').classList.remove('visible');
    showModal(tr("Import"),`<p class="modal-intro">${esc(preview.filename)} · ${plural(preview.report.total,'question')} · ${plural(preview.packs.length,'quiz')}</p><details class="import-file-summary"><summary>${trHtml("File summary ·",{})} <span id="import-flagged-count">${trHtml("{value3} flagged for review",{value3:plural(preview.report.flagged,'question')})}</span></summary><div class="import-preview">${preview.packs.map(p=>`<div><strong>${esc(p.title)}</strong><span>${trHtml("{value1} → {value2} · {value3} questions",{value1:esc(p.course),value2:esc(p.unit),value3:p.count})}</span></div>`).join('')}</div><p class="muted">${questionModel.types.map(t=>`${esc(tr(t.label))}: ${preview.report.counts[t.id]}`).join(' · ')}</p></details>${preview.report.warnings.length?`<aside class="import-warnings"><strong>${trHtml("Review before importing",{})}</strong><ul>${preview.report.warnings.map(w=>`<li>${esc(w)}</li>`).join('')}</ul></aside>`:''}<p class="muted">${trHtml("{value7}All questions will be imported. These local checks do not verify factual correctness or source references.",{value7:preview.report.comparedWithBrief?tr("Compared with the current quiz brief. "):''})}</p><section class="import-inspection" aria-label="${trHtml("Import question preview",{})}"><h3>${trHtml("Question preview",{})}</h3><div id="import-question-preview">${importQuestionView(draft)}</div></section>${destinationFields(destination,'import',true)}`,modalButtons(tr("Import")),async()=>{if(draft.loading)throw new Error(tr("Wait for the question preview to finish loading."));const target=destinationTarget(destination);data=await api.importConfirm(preview.token,target);await navigateTarget(target);toast(tr("Imported."));},true,false,true);
    modal.destination=destination;modal.importPreview=draft;
  }catch(error){await api.cancelImport(preview.token).catch(()=>{});throw error;}
}
function help(){showModal(tr("Help"),`<h3>${esc(tr("Written answers and matching"))}</h3><p>${esc(tr("Written answers are checked against accepted answers set by the author. Extra spaces are ignored; letter case is optional. Matching questions connect every item with one shuffled answer. Both save your progress and work in quizzes and review."))}</p><p>${trHtml("Organize",{})} <strong>${trHtml("Courses → Units → Quizzes",{})}</strong>${trHtml(". Create questions in the editor or import a JSON or CSV file.",{})}</p><p>${trHtml("Choose",{})} <strong>${trHtml("New quiz → Prepare with an agent",{})}</strong> ${trHtml("to save or copy Markdown instructions for another agent. Attach your study material with the instructions, answer any preferences marked",{})} <strong>${trHtml("Ask me",{})}</strong>${trHtml(", then import the complete JSON quiz it returns. Optional choices are under",{})} <strong>${trHtml("Advanced",{})}</strong>.</p><p>${trHtml("Choose a",{})} <strong>${trHtml("Question type",{})}</strong> ${trHtml("for each question: single answer, multiple answers, or true/false. Mix types in one quiz. Use",{})} <strong>${trHtml("Add option",{})}</strong> ${trHtml("for more choices; true/false has two editable labels. Multiple-answer questions require all correct choices and no others.",{})}</p><p>${trHtml("Use",{})} <strong>${trHtml("Add image",{})}</strong> ${trHtml("for local PNG, JPEG, GIF, or WebP images (up to 2 MB). Choose",{})} <strong>HTML</strong> ${trHtml("or",{})} <strong>Markdown</strong> ${trHtml("in the Format selector for formatting, and open",{})} <strong>${trHtml("Preview",{})}</strong> ${trHtml("to check it. Images are included in exports and backups.",{})}</p><p>${trHtml("Choose",{})} <strong>${trHtml("Add code",{})}</strong>${trHtml(", select its language, and paste your snippet. Code is displayed with syntax highlighting and preserved indentation; it is never run. In Markdown, use fenced code blocks: three backticks, a language name such as python, your code on the following lines, and three closing backticks. Markdown also works in choices and explanations.",{})}</p><h3>${trHtml("JSON · one quiz",{})}</h3><pre>{
  "course": "Biology",
  "unit": "Unit 1: Cells",
  "title": "Quiz 1",
  "questions": [{
    "prompt": "Where is most DNA stored?",
    "options": ["Nucleus", "Ribosome"],
    "correctAnswer": 0,
    "explanation": "Most DNA is in the nucleus."
  }]
}</pre><p class="muted"><strong>${trHtml("correctAnswer",{})}</strong> ${trHtml("is zero-based: 0 = A, 1 = B. Letters or exact answer text work too. Set",{})} <code>"type": "multiple-answer"</code> ${trHtml("with",{})} <code>"correctAnswers": [0, 2]</code> ${trHtml("for multiple answers. Use",{})} <code>"type": "true-false"</code> ${trHtml("with two options and one",{})} <code>correctAnswer</code> ${trHtml("for true/false. Omit type for single answer. A questions array alone is accepted; multiple quizzes use",{})} <code>{ "quizzes": [ … ] }</code>.</p><h3>${trHtml("CSV · one question per row",{})}</h3><pre>course,unit,title,question,option_a,option_b,answer,explanation
Biology,Cells,Quiz 1,Where is most DNA?,Nucleus,Ribosome,A,Inside the nucleus.</pre><p class="muted">${trHtml("Use consecutive option_a, option_b, …, option_z, option_aa columns. Choice questions support {value0}–{value1} options. CSV answers use letters or exact option text. For multiple answers, add a type column containing multiple-answer and quote a JSON array in the answer cell:",{value0:questionModel.types[0].minOptions,value1:questionModel.types[0].maxOptions})} <code>"[0,2]"</code>${trHtml(". Use true-false for binary questions. Optional code and code_language columns attach a snippet; use format=markdown for Markdown content. Quote fields containing commas or line breaks. Files up to 20 MB and 10,000 questions per import.",{})}</p><p>${trHtml("Keyboard:",{})} <kbd>Ctrl K</kbd> ${trHtml("searches your library. In a quiz,",{})} <kbd>1</kbd>–<kbd>9</kbd> ${trHtml("selects or toggles the corresponding answer and arrow keys move between questions. All choices are reachable with Tab.",{})}</p>`,button(tr("Close"),'closeModal','primary'),null,true);}
function search(){showModal(tr("Search"),`<p class="search-scope" id="search-scope">${trHtml("Find courses, units, quizzes, or question text across your library.",{})}</p><div class="search-input-wrap">${icon('search')}<input id="search-input" type="search" placeholder="${trHtml("Search your library…",{})}" autocomplete="off" aria-label="${trHtml("Search your library",{})}" aria-describedby="search-scope"></div><div id="search-results"></div>`,button(tr("Close"),'closeModal','secondary'),null,true);renderSearch('');}
function renderSearch(query){query=query.trim().toLowerCase();const courses=data.courses.filter(c=>c.title.toLowerCase().includes(query)),units=data.courses.flatMap(course=>course.units.filter(unit=>unit.title.toLowerCase().includes(query)).map(unit=>({course,unit}))),quizzes=flatten().filter(({course,unit,quiz})=>`${course.title} ${unit.title} ${quiz.title} ${quiz.questions.map(q=>content.plain(q.prompt,q.format)).join(' ')}`.toLowerCase().includes(query));$('#search-results').innerHTML=`${courses.slice(0,50).map(c=>`<button class="search-result" ${act('course',`data-id="${c.id}"`)}>${icon('folder')}<div><strong>${esc(c.title)}</strong><span>${trHtml("Course · {value3}",{value3:plural(stats(c).quizzes,'quiz')})}</span></div>${icon('arrow')}</button>`).join('')}${units.slice(0,50).map(({course,unit})=>`<button class="search-result" ${act('unit',`data-course="${course.id}" data-id="${unit.id}"`)}>${icon('folder')}<div><strong>${esc(unit.title)}</strong><span>${trHtml("Unit · {value3}",{value3:esc(course.title)})}</span></div>${icon('arrow')}</button>`).join('')}${quizzes.slice(0,50).map(({course,unit,quiz})=>`<button class="search-result" ${act('start',`data-id="${quiz.id}"`)}>${icon('book')}<div><strong>${esc(quiz.title)}</strong><span>${trHtml("Quiz · {value3} → {value4}",{value3:esc(course.title),value4:esc(unit.title)})}</span></div>${icon('arrow')}</button>`).join('')}${!courses.length&&!units.length&&!quizzes.length?`<p class="muted search-empty" role="status">${trHtml("No matches. Try a different name or question text.",{})}</p>`:''}${Math.max(courses.length,units.length,quizzes.length)>50?`<p class="muted">${trHtml("Showing up to 50 matches of each type. Refine your search to see more.",{})}</p>`:''}`;}
document.addEventListener('input',e=>{
  if(e.target.matches('input[data-place]')){updateDestination(e.target);return;}
  if(e.target.matches('[data-brief-value],[data-brief-count]'))updateInstructionControl(e.target);
  if(e.target.id==='search-input')renderSearch(e.target.value);
  const el=e.target;if(!el.dataset.editor||!editor)return;
  const key=el.dataset.editor,i=Number(el.dataset.index);
  if(['format','type','correctAnswers'].includes(key))return;
  if(key==='title')editor.title=el.value;
  else if(key==='option')editor.questions[i].options[Number(el.dataset.option)]=el.value;
  else if(key==='acceptedAnswer')editor.questions[i].acceptedAnswers[Number(el.dataset.answer)]=el.value;
  else if(key==='caseSensitive')editor.questions[i].caseSensitive=el.checked;
  else if(key==='pairLeft'||key==='pairRight')editor.questions[i].pairs[Number(el.dataset.pair)][key==='pairLeft'?'left':'right']=el.value;
  else editor.questions[i][key]=key==='correctAnswer'?Number(el.value):el.value;
  scheduleDraft();
  if(key==='prompt'){const item=$('.editor-outline [data-index="'+i+'"]');if(item)item.textContent=`${i+1}. ${content.plain(editor.questions[i].prompt,editor.questions[i].format).slice(0,55)||tr("New question")}`;}
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
  if(e.target.id==='study-report-scope'&&modal?.studyReport){const info=modal.studyReport;$('#study-report-count').textContent=tr("{value0} will be included, across all result pages.",{value0:plural(e.target.value==='focus'?info.focus:info.total,'question')});return;}
  if(['import-pack','import-review-filter','import-question-number'].includes(e.target.id)){
    const draft=modal?.importPreview;if(!draft||draft.loading)return;
    if(e.target.id==='import-pack'){const packIndex=Number(e.target.value),indices=draft.onlyIssues?draft.report.reviewIndices[packIndex]:[0];await loadImportQuestion(draft,packIndex,indices[0]??null);}
    else if(e.target.id==='import-review-filter'){draft.onlyIssues=e.target.value==='issues';const indices=importIndices(draft);await loadImportQuestion(draft,draft.packIndex,indices.includes(draft.questionIndex)?draft.questionIndex:indices[0]??null);}
    else{const number=Number(e.target.value);if(!/^\d+$/.test(e.target.value)||!Number.isInteger(number)||number<1||number>draft.packs[draft.packIndex].count){e.target.value=String(draft.questionIndex+1);toast(tr("Choose a question number in this quiz."));return;}draft.onlyIssues=false;await loadImportQuestion(draft,draft.packIndex,number-1);}
    return;
  }
  if(e.target.id==='automatic-updates'){const enabled=e.target.checked;e.target.disabled=true;try{receiveUpdates(await api.setUpdateAutomatic(enabled));}catch(error){receiveUpdates(await api.getUpdates());toast(error.message);}return;}
  if(e.target.id==='editor-page'&&editor&&!busy){editor.page=Number(e.target.value);renderEditor(true);return;}
  if(e.target.id==='review-page'&&!busy){view.reviewPage=Number(e.target.value);render();$('#main').scrollTop=0;return;}
  if(e.target.id==='start-preset'){const preset=[...practice.builtins,...(data.practicePresets||[])].find(p=>p.id===e.target.value);if(preset){startDraft.profileId=preset.id;startDraft.options={...practice.defaults,...preset.options};startDraft.shuffle=preset.shuffle;renderStart();}else{readStart();startDraft.profileId='custom';const remove=$('[data-action=deletePreset]');if(remove)remove.hidden=true;}return;}
  if(startDraft&&e.target.matches('[data-practice],select[name=feedback]')){readStart();startDraft.profileId='custom';$('#start-preset').value='custom';const remove=$('[data-action=deletePreset]');if(remove)remove.hidden=true;$('.start-note').textContent=tr("{value0} Timers record even when hidden.",{value0:startDraft.options.feedback==='instant'?tr("Answers lock on feedback. For multiple answers, use Next."):tr("Answers stay editable until you finish.")});}
  if(e.target.matches('[data-brief-mode],[data-brief-type]'))updateInstructionControl(e.target);
  if(e.target.dataset.editor==='type'&&editor){
    const q=editor.questions[Number(e.target.dataset.index)];changeEditorResponseType(q,questionModel.typeOf({type:e.target.value}));
    scheduleDraft();renderEditor();return;
  }
  if(e.target.dataset.editor==='correctAnswers'&&editor){const q=editor.questions[Number(e.target.dataset.index)];q.correctAnswers=questionModel.toggleAnswer(q,q.correctAnswers,Number(e.target.dataset.option));scheduleDraft();return;}
  if(e.target.dataset.editor==='format'&&editor){const i=Number(e.target.dataset.index);editor.questions[i].format=e.target.value;scheduleDraft();renderEditor();setTimeout(()=>$(`[data-editor="format"][data-index="${i}"]`)?.focus({preventScroll:true}),0);}
  if(e.target.matches('select[data-place]')){updateDestination(e.target);return;}
  if(e.target.id==='question-jump'&&!busy){busy=true;const locks=[...document.querySelectorAll('[data-response-context]')].filter(control=>!control.disabled);locks.forEach(control=>control.disabled=true);try{await change({type:'position',position:Number(e.target.value)});render();}catch(error){toast(error.message);}finally{for(const control of locks)if(control.isConnected)control.disabled=false;busy=false;}}
});
document.addEventListener('click',async e=>{
  const w=e.target.closest('[data-window]');if(w){await api.window(w.dataset.window);return;}
  const b=e.target.closest('[data-action]');
  const menuClick=e.target.closest('.popover-menu');
  if(menu&&!menuClick&&!e.target.closest('[aria-haspopup="menu"]'))closeMenu();
  if(!b||b.disabled||busy)return;
  if(menuClick)closeMenu();
  const a=b.dataset.action;busy=true;
  const responseLocks=[...document.querySelectorAll('[data-response-context]:not([data-response-context="preview"])')].filter(control=>!control.disabled);responseLocks.forEach(control=>control.disabled=true);
  try{
    await flushResponses();
    switch(a){
      case 'showStudyAids':openStudyAids(b);break;
      case 'saveQuestion':await saveQuestionFrom(b);break;
      case 'savedQuestions':await openSavedQuestions(Number(b.dataset.page||0));break;
      case 'savedClearFilters':await updateSavedFilter('clear');break;
      case 'savedStart':await startSavedPractice();break;
      case 'savedDiscard':endSavedPractice();break;
      case 'savedReveal':{view.savedReveals??=new Set();const key=b.dataset.key;if(view.savedReveals.has(key))view.savedReveals.delete(key);else view.savedReveals.add(key);render();[...document.querySelectorAll('[data-action=savedReveal]')].find(el=>el.dataset.key===key)?.focus();break;}
      case 'savedChoice':{const s=data.savedQuestions.session,q=savedPracticeItem().question;await change({type:'savedAnswer',token:s.token,answer:questionModel.toggleAnswer(q,s.answer,Number(b.dataset.index))});render();document.querySelector('[data-action=savedChoice][data-index="'+b.dataset.index+'"]')?.focus();break;}
      case 'savedCheck':await change({type:'savedCheck',token:data.savedQuestions.session.token});render();document.querySelector('[data-action=savedNext]')?.focus();break;
      case 'savedNext':await change({type:'savedNext',token:data.savedQuestions.session.token});if(data.savedQuestions.session){await navigate('savedPractice');document.querySelector('.question-prompt')?.focus();}else await openSavedQuestions();break;
      case 'reviewWrittenAnswer':openWrittenReview(b);break;
      case 'undoWrittenReview':if(modal?.writtenReviewSource)await applyWrittenReview(modal.writtenReviewSource,false,false);break;
      case 'copyQuestion':await copyQuestionFrom(b);break;
      case 'toggleNavigation':toggleNavigation();break;
      case 'filterReview':{const filter=b.dataset.filter;view.incorrectOnly=filter==='incorrect';view.reviewPage=0;render();$(`[data-action="filterReview"][data-filter="${filter}"]`)?.focus();break;}
      case 'editorJump':{const section=$('.editor-question[data-question-index="'+Number(b.dataset.index)+'"]');section?.scrollIntoView({block:'start'});section?.querySelector('[data-editor="prompt"]')?.focus({preventScroll:true});break;}
      case 'previousImportQuestion':case 'nextImportQuestion':{const draft=modal?.importPreview;if(!draft||draft.loading)break;const indices=importIndices(draft),position=indices.indexOf(draft.questionIndex)+(a==='nextImportQuestion'?1:-1);if(position>=0&&position<indices.length)await loadImportQuestion(draft,draft.packIndex,indices[position]);break;}
      case 'relatedImportQuestion':{const draft=modal?.importPreview;if(draft&&!draft.loading){draft.onlyIssues=false;await loadImportQuestion(draft,Number(b.dataset.pack),Number(b.dataset.index));}break;}
      case 'toggleImportAnswer':{const draft=modal?.importPreview;if(draft&&!draft.loading){draft.answerRevealed=!draft.answerRevealed;paintImportQuestion(draft);}break;}
      case 'checkUpdates':checkForUpdates();break;
      case 'viewUpdate':showUpdate();break;
      case 'laterUpdate':case 'skipUpdate':{receiveUpdates(await api.remindUpdate(a==='skipUpdate'?'skip':'later',b.dataset.version));updateShown=null;if(modal)modal.updateVersion=null;closeModal();break;}
      case 'downloadUpdate':{receiveUpdates(await api.openUpdate(b.dataset.version));updateShown=null;if(modal)modal.updateVersion=null;closeModal();toast(tr("Release page opened in your browser."));break;}
      case 'notebook':await openNotebook(Number(b.dataset.page||0));break;
      case 'mistakeRemove':removeNotebookCopy(b.dataset.key);break;
      case 'mistakeNote':notebookNote(b.dataset.key);break;
      case 'mistakeStart':await change({type:'mistakeStart'});await refreshNotebook();await navigate('mistakePractice');break;
      case 'mistakeChoice':{const s=notebookState.session;await change({type:'mistakeAnswer',token:s.token,answer:questionModel.toggleAnswer(s.item.question,s.answer,Number(b.dataset.index))});await refreshNotebook();render();break;}
      case 'mistakeCheck':await change({type:'mistakeCheck',token:notebookState.session.token});await refreshNotebook();render();break;
      case 'mistakeNext':await change({type:'mistakeNext',token:notebookState.session.token});await refreshNotebook();await navigate(notebookState.session?'mistakePractice':'notebook');break;
      case 'dailyReview':await navigate('dailyReview');break;
      case 'reviewSettings':dailyReviewSettings();break;
      case 'reviewBegin':await change({type:'reviewBegin'});await navigate('reviewQuestion');break;
      case 'reviewChoice':{const q=window.QuiznetDailyReview.current(data)?.question,a=data.dailyReview?.active;if(q&&a){await change({type:'reviewAnswer',token:a.token,answer:questionModel.toggleAnswer(q,a.answer,Number(b.dataset.index))});render();$('[data-action="reviewChoice"][data-index="'+b.dataset.index+'"]')?.focus();}break;}
      case 'reviewCheck':await change({type:'reviewCheck',token:data.dailyReview?.active?.token});render();$('[data-action="reviewRate"]')?.focus();break;
      case 'reviewRate':await change({type:'reviewRate',token:data.dailyReview?.active?.token,rating:b.dataset.rating});await advanceDailyReview();break;
      case 'dashboard':await navigate('home');break;
      case 'courseStudyFocus':editCourseFocus(b.dataset.course);break;
      case 'setLanguage':await chooseLanguage(b.dataset.language);break;
      case 'settingsTab':openSettingsSection(b.dataset.section,b.dataset.target);break;
      case 'appearanceTab':if(appearanceTabs().some(([id])=>id===b.dataset.tab)){appearanceTab=b.dataset.tab;render();document.querySelector('[data-action="appearanceTab"][data-tab="'+appearanceTab+'"]')?.focus();}break;
      case 'appearancePreview':appearancePreviewAction(b);break;
      case 'expandAppearancePreview':expandAppearancePreview();break;
      case 'resetAppearanceSample':resetAppearanceSample();refreshAppearancePreview(true);break;
      case 'quizAppearancePreset':await updateQuizAppearance(quizAppearanceModel.preset('large'));render();document.querySelector('[data-action="quizAppearancePreset"]')?.focus();toast(tr("Large-text appearance applied."));break;
      case 'resetQuizAppearanceGroup':{const defaults=quizAppearanceModel.defaults(),keys=b.dataset.group?quizAppearanceModel.groups[b.dataset.group]:appearanceTab==='quiz'?[...quizAppearanceModel.groups.quiz,...quizAppearanceModel.groups.markers]:quizAppearanceModel.groups[appearanceTab];await updateQuizAppearance(Object.fromEntries(keys.map(key=>[key,defaults[key]])));render();document.querySelector('[data-action="resetQuizAppearanceGroup"]')?.focus();break;}
      case 'resetQuizAppearance':await saveDisplayPreferences({quizAppearance:quizAppearanceModel.defaults()});render();document.querySelector('[data-action="resetQuizAppearance"]')?.focus();toast(tr("Study appearance reset."));break;
      case 'settingsAccent':await saveDisplayPreferences({accent:b.dataset.accent});render();[...document.querySelectorAll('[data-action="settingsAccent"]')].find(el=>el.dataset.accent===b.dataset.accent)?.focus();break;
      case 'refreshStorage':loadStorage();break;
      case 'openSupport':await api.openSupportPage(b.dataset.page);break;
      case 'manageHistory':openHistoryManager(true);break;
      case 'backToHistorySelection':openHistoryManager();break;
      case 'historyManagePage':historyManager.page=Number(b.dataset.page);refreshHistoryManager();break;
      case 'historySelectMatches':{const matches=historyManagerEntries().filter(e=>e.attempt.id!==data.activeSession?.sourceAttemptId);historyManager.selected=new Set(matches.slice(0,10000).map(e=>e.attempt.id));refreshHistoryManager();if(matches.length>10000)toast(tr("Selected the first 10,000 matching sessions."));break;}
      case 'historyClearSelection':historyManager.selected.clear();refreshHistoryManager();break;
      case 'exportHistorySelection':if(await api.exportHistory([...historyManager.selected]))toast(tr("History summaries exported."));break;
      case 'previewHistoryRemoval':await previewHistoryRemoval();break;
      case 'libraryScope':{const kind=b.dataset.kind,id=b.dataset.collection;if(['all','pinned','unassigned'].includes(kind)||kind==='collection'&&data.collections?.some(g=>g.id===id)){libraryScope={kind,id};render();[...document.querySelectorAll('[data-action="libraryScope"]')].find(el=>el.dataset.kind===kind&&el.dataset.collection===id)?.focus();}break;}
      case 'libraryCreateMenu':showMenu(b,[[tr("New quiz…"),'newQuiz'],[tr("New course…"),'newCourse'],[tr("New collection…"),'newCollection']]);break;
      case 'libraryViewMenu':libraryViewMenu(b);break;
      case 'setLibraryView':await setLibraryMode(b.dataset.mode);break;
      case 'displaySettings':await navigate('settings');openSettingsSection('appearance','library-view-preference');break;
      case 'resetDisplay':await saveDisplayPreferences({libraryView:'cards',rememberView:true,interfaceScale:100,theme:'dark',accent:'sage',textScale:100,density:'comfortable'});libraryMode='cards';render();$('[data-action="resetDisplay"]')?.focus();break;
      case 'customizeCourse':customizeCourse(b.dataset.course);break;
      case 'resetCourseAppearance':{const form=$('#modal-form');await change({type:'courseCustomize',courseId:b.dataset.course,appearance:null,collectionId:form.elements.collectionId.value});closeModal();render();break;}
      case 'newCollection':editCollection();break;
      case 'editCollection':editCollection(b.dataset.collection);break;
      case 'removeCollection':removeCollection(b.dataset.collection);break;
      case 'collectionMenu':collectionMenu(b);break;
      case 'manageCollections':manageCollections(Number(b.dataset.page)||0);break;
      case 'organizeCourses':organizeCourses(Number(b.dataset.page)||0);break;
      case 'pinCourse':case 'orderCourse':case 'pinCollection':case 'orderCollection':await organizeAction(a,b);break;
      case 'collectionHome':libraryScope={kind:'collection',id:b.dataset.collection};await navigate('library');break;
      case 'historyClear':setHistoryFilter('clear');break;
      case 'historyTab':if(['overview','sessions','quizzes'].includes(b.dataset.tab)){historyState.tab=b.dataset.tab;render();persistHistoryView();}break;
      case 'historyPage':case 'historyQuizPage':case 'historyCoursePage':{const key=a==='historyPage'?'page':a==='historyQuizPage'?'quizPage':'coursePage';historyState[key]=Math.max(0,Number(b.dataset.page)||0);render();break;}
      case 'historyCourse':historyState.filter={...(view.page==='history'?historyState.filter:window.QuiznetHistory.defaults()),courseId:b.dataset.course,unitId:'',quizId:'',focus:'',unlinked:false};historyState.page=historyState.quizPage=historyState.coursePage=0;await navigate('history');persistHistoryView();break;
      case 'historyFocus':historyState.filter={...historyState.filter,focus:b.dataset.focus,courseId:'',unitId:'',quizId:'',unlinked:false};historyState.page=historyState.quizPage=historyState.coursePage=0;render();persistHistoryView();break;
      case 'home':libraryScope={kind:'all',id:''};await navigate('library');break;case 'course':await navigate('library',b.dataset.id);break;case 'unit':await navigate('library',b.dataset.course,b.dataset.id);break;
      case 'instructions':await prepareInstructions(view.page==='library'?view.courseId:null,view.page==='library'?view.unitId:null);break;case 'history':await navigate('history');break;case 'explore':await navigate('explore');break;case 'settings':await navigate('settings');break;case 'help':help();break;case 'search':search();break;
      case 'closeModal':closeModal();break;
      case 'cancelEditor':await clearDraft();editor=null;closeModal();render();break;
      case 'recoverDraft':await recoverDraft();break;
      case 'discardDraft':await clearDraft();editor=null;closeModal();render();toast(tr("Draft discarded."));break;case 'newCourse':newCourse();break;case 'newUnit':newUnit(b.dataset.course||view.courseId);break;
      case 'newQuiz':newQuiz(b.dataset.course||view.courseId,b.dataset.unit||view.unitId);break;
      case 'newManual':await editQuiz(null,b.dataset.course,b.dataset.unit);break;
      case 'newImport':closeModal();await importQuestions(destinationDraft(b.dataset.course,b.dataset.unit,true));break;
      case 'prepareAgent':await prepareInstructions(b.dataset.course,b.dataset.unit);break;case 'editQuiz':await editQuiz(b.dataset.id);break;
      case 'moveQuiz':moveQuiz(b.dataset.id);break;
      case 'rename':case 'delete':manage(a,b);break;
      case 'libraryMenu':showMenu(b,[[tr("Organize courses…"),'organizeCourses'],[tr("Manage collections…"),'manageCollections']]);break;case 'attemptMenu':attemptMenu(b);break;case 'courseMenu':itemMenu(b,'course');break;case 'unitMenu':itemMenu(b,'unit');break;case 'quizMenu':itemMenu(b,'quiz');break;
      case 'startMissed':await startQuiz(null,false,b.dataset.id);break;case 'start':await startQuiz(b.dataset.id);break;case 'shuffleStart':await startQuiz(b.dataset.id,true);break;case 'resume':await change({type:'resume'});await navigate('quiz');break;
      case 'pause':{const f=find(data.activeSession?.quizId);await navigate('library',f?.course.id,f?.unit.id);break;}
      case 'answer':{const s=data.activeSession,q=sessionQuiz().questions.find(q=>q.id===b.dataset.question);await change({type:'answer',questionId:q.id,answer:questionModel.toggleAnswer(q,s.answers[q.id],Number(b.dataset.index))});render();$(`[data-action="answer"][data-index="${b.dataset.index}"]`)?.focus();break;}
      case 'navigationHelp':navigationHelp();break;
      case 'advance':if(!await revealCurrent()){await change({type:'position',position:Number(b.dataset.index)});render();}break;
      case 'flagQuestion':await change({type:'flag',questionId:data.activeSession.questionIds[data.activeSession.position]});render();break;
      case 'reviewFlags':{const s=data.activeSession,flags=s.flaggedQuestionIds||[],next=flags.find(id=>s.questionIds.indexOf(id)>s.position)||flags[0];if(next){closeModal();await change({type:'position',position:s.questionIds.indexOf(next)});render();}break;}
      case 'showPresetSave':$('.preset-save').hidden=false;$('#preset-name').disabled=false;$('#preset-name').focus();break;
      case 'savePreset':{readStart();const name=$('#preset-name').value;await change({type:'savePreset',name,practice:startDraft.options,shuffle:startDraft.shuffle});startDraft.profileId=data.practicePresets.find(p=>p.name.toLowerCase()===name.trim().toLowerCase()).id;renderStart();toast(tr("Preset saved."));break;}
      case 'deletePreset':{readStart();await change({type:'deletePreset',id:startDraft.profileId});startDraft.profileId='custom';renderStart();break;}
      case 'position':await change({type:'position',position:Number(b.dataset.index)});render();break;
      case 'finish':{if(await revealCurrent())break;const s=data.activeSession,quiz=sessionQuiz(),missing=s.questionIds.findIndex(id=>!questionModel.validAnswer(quiz.questions.find(q=>q.id===id),s.answers[id])||(s.practice?.feedback==='instant'&&!s.checkedQuestionIds.includes(id)));if(missing>=0){await change({type:'position',position:missing});render();toast(s.practice?.feedback==='instant'?tr("Answer every question and use Next to view feedback."):tr("Answer every question."));}else if(s.flaggedQuestionIds?.length){showModal(tr("Flagged questions"),`<p>${trHtml("{value0} flagged for review.",{value0:plural(s.flaggedQuestionIds.length,'question')})}</p>`,`${button(tr("Review flags"),'reviewFlags','secondary')}${submit(tr("Finish quiz"))}`,completeQuiz);}else await completeQuiz();break;}
      case 'discard':showModal(tr("Discard attempt?"),`<p>${trHtml("Your saved answers for",{})} <strong>${esc(sessionQuiz()?.title)}</strong> ${trHtml("will be discarded. The quiz stays in your library.",{})}</p>`,`${button(tr("Cancel"),'closeModal','secondary')}${submit(tr("Discard attempt"),'danger')}`,async()=>{await change({type:'discard'});await navigate('library');});break;
      case 'result':view={page:'result',attemptId:b.dataset.id};render();break;
      case 'studyReport':await studyReportDialog(b.dataset.id);break;
      case 'saveInstructions':case 'copyInstructions':case 'previewInstructions':await exportInstructions(a);break;
      case 'import':await importQuestions();break;case 'exportQuiz':if(await api.exportQuiz(b.dataset.id))toast(tr("Exported."));break;
      case 'backup':if(await api.backup())toast(tr("Backup saved."));break;
      case 'openData':await api.openData();break;
      case 'restore':{const p=await api.restorePreview();if(p)restoreConfirmation(p);break;}
      case 'backupHistory':await backupHistory();break;
      case 'createSnapshot':await api.createSnapshot();await backupHistory();toast(tr("Recovery backup saved."));break;
      case 'restoreSnapshot':restoreConfirmation(await api.snapshotPreview(b.dataset.id));break;
      case 'checkLibrary':{const checks=await api.checkLibrary();showModal(tr("Library check"),`<p class="muted">${trHtml("This reads the current library and rolling backup without changing either file. It checks stored structure, references, and attempts; it does not test disk hardware or verify answers.",{})}</p><div class="import-preview">${checks.map(c=>`<div><strong>${esc(c.name)} · ${esc(c.status)}</strong><span>${c.status==='valid'?`${plural(c.courses,'course')} · ${plural(c.quizzes,'quiz')} · ${plural(c.questions,'question')} · ${plural(c.attempts,'saved attempt')}`:esc(c.detail)}</span></div>`).join('')}</div>`,button(tr("Close"),'closeModal','primary'));break;}
      case 'editorPage':editor.page=Number(b.dataset.index);renderEditor(true);break;
      case 'reviewPage':view.reviewPage=Number(b.dataset.index);render();$('#main').scrollTop=0;break;
      case 'addQuestion':if(editor.questions.length>=brief.MAX_QUESTIONS){toast(tr("A quiz can contain up to 10,000 questions."));break;}editor.questions.push(blankQuestion());editor.page=Math.floor((editor.questions.length-1)/EDITOR_PAGE_SIZE);renderEditor();$('.editor-question:last-child textarea')?.focus();break;
      case 'addCode':{const i=Number(b.dataset.index),q=editor.questions[i];q.code='';q.codeLanguage='python';renderEditor();$(`[data-editor="code"][data-index="${i}"]`)?.focus();break;}
      case 'removeCode':{const q=editor.questions[Number(b.dataset.index)];delete q.code;delete q.codeLanguage;renderEditor();break;}
      case 'addImage':{
        const current=editor,i=Number(b.dataset.index),selected=await api.selectImage();
        if(selected&&editor===current){const image=new Image();image.src=selected.image;try{await image.decode();}catch{throw new Error(tr("This image could not be opened. Choose a valid PNG, JPEG, GIF, or WebP."));}editor.questions[i].image=selected.image;editor.questions[i].imageAlt=editor.questions[i].imageAlt||'';renderEditor();}break;
      }
      case 'removeImage':{const q=editor.questions[Number(b.dataset.index)];delete q.image;delete q.imageAlt;renderEditor();break;}
      case 'removeQuestion':editor.questions.splice(Number(b.dataset.index),1);removeReferenceQuestion(Number(b.dataset.index));renderEditor();break;
      case 'addAcceptedAnswer':{const q=editor.questions[Number(b.dataset.index)];if(q.acceptedAnswers.length<20)q.acceptedAnswers.push('');renderEditor();break;}
      case 'removeAcceptedAnswer':{const q=editor.questions[Number(b.dataset.index)];if(q.acceptedAnswers.length>1)q.acceptedAnswers.splice(Number(b.dataset.answer),1);renderEditor();break;}
      case 'addMatchingPair':{const q=editor.questions[Number(b.dataset.index)];if(q.pairs.length<20)q.pairs.push({left:'',right:''});renderEditor();break;}
      case 'removeMatchingPair':{const q=editor.questions[Number(b.dataset.index)];if(q.pairs.length>2)q.pairs.splice(Number(b.dataset.pair),1);renderEditor();break;}
      case 'addOption':{const q=editor.questions[Number(b.dataset.index)];if(q.options.length<questionModel.typeOf(q).maxOptions)q.options.push('');renderEditor();break;}
      case 'removeOption':{const q=editor.questions[Number(b.dataset.index)],j=Number(b.dataset.option);if(q.options.length<=questionModel.typeOf(q).minOptions)break;q.options.splice(j,1);if(questionModel.typeOf(q).selection==='multiple')q.correctAnswers=q.correctAnswers.filter(index=>index!==j).map(index=>index>j?index-1:index);else if(q.correctAnswer===j)q.correctAnswer=0;else if(q.correctAnswer>j)q.correctAnswer--;renderEditor();break;}
    }
    if(editor&&['addQuestion','removeQuestion','addCode','removeCode','addImage','removeImage','addOption','removeOption','addAcceptedAnswer','removeAcceptedAnswer','addMatchingPair','removeMatchingPair'].includes(a))scheduleDraft();
  }catch(error){toast(error.message);}finally{for(const control of responseLocks)if(control.isConnected)control.disabled=false;busy=false;setTimeout(maybeShowUpdate,0);}
});
document.addEventListener('keydown',e=>{
  if(e.ctrlKey&&(e.code==='KeyK'||e.key.toLowerCase()==='k')){e.preventDefault();if(!busy&&!modal)search();return;}
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
    if(i18n.digit(e.key)){const b=document.querySelectorAll('[data-action="answer"]')[i18n.digit(e.key)-1];if(b){e.preventDefault();b.click();}}
    if(['ArrowRight','ArrowLeft'].includes(e.key)){const position=data.activeSession.position+(e.key===(i18n.direction()==='rtl'?'ArrowLeft':'ArrowRight')?1:-1);if(position>=0&&position<data.activeSession.questionIds.length){e.preventDefault();const selector=$('#question-jump');selector.value=String(position);selector.dispatchEvent(new Event('change',{bubbles:true}));}}
  }
});
api.get().then(async result=>{data=result.library;meta=result.meta;updateState=meta.updates;let languageNotice='';try{await loadLanguage(meta.display.language||'en');}catch{languageNotice='The language file could not be loaded. English is in use; your preferences are preserved.';}receiveDisplayPreferences(meta.display,true);render();if(languageNotice||meta.notice)toast(languageNotice||meta.notice);}).catch(error=>{$('#main').innerHTML=`<div class="empty-state"><h1>${trHtml("We couldn’t open your library.",{})}</h1><p>${esc(error.message)}</p></div>`;});

