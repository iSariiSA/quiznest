const api=window.quiznet;
const content=window.QuiznetContent;
const $=selector=>document.querySelector(selector);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rich=(source,q)=>`<div class="rich-content ${q.format==='html'?'html-content':'text-content'}" dir="auto">${content.render(source,q.format)}</div>`;
const promptBody=q=>`${rich(q.prompt,q)}${content.image(q)}`;
const icon=(name,cls='')=>`<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${({grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',book:'<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',settings:'<path d="m9 3-1 3-3 1-2 3 2 2-1 3 2 3 3-1 2 3h3l1-3 3-1 2-3-2-2 1-3-2-3-3 1-2-2Z"/><circle cx="12" cy="12" r="3"/>',plus:'<path d="M12 5v14M5 12h14"/>',arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',chevron:'<path d="m9 5 7 7-7 7"/>',down:'<path d="m6 9 6 6 6-6"/>',upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5"/>',download:'<path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',check:'<path d="m5 12 4 4L19 6"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',leaf:'<path d="M20 3C7 2 2 9 5 16c4 5 13 2 15-13ZM4 21l10-11"/>',shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',edit:'<path d="m4 16 12-12 4 4L8 20H4v-4ZM14 6l4 4"/>',trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5"/>',spark:'<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>',play:'<path d="m8 4 12 8-12 8V4Z"/>',folder:'<path d="M3 7V4h7l3 3h8v13H3V7Z"/>',help:'<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4M12 17h.01"/>',back:'<path d="M20 12H4m6-6-6 6 6 6"/>',more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>'})[name]||''}</svg>`;
let data,meta,view={page:'library',courseId:null,unitId:null},busy=false,modal=null,previousFocus=null,editor=null;
const flatten=()=>data.courses.flatMap(course=>course.units.flatMap(unit=>unit.quizzes.map(quiz=>({course,unit,quiz}))));
const find=id=>flatten().find(item=>item.quiz.id===id);
const courseBy=id=>data.courses.find(c=>c.id===id);
const stats=c=>({units:c.units.length,quizzes:c.units.reduce((n,u)=>n+u.quizzes.length,0),questions:c.units.reduce((n,u)=>n+u.quizzes.reduce((s,q)=>s+q.questions.length,0),0)});
const plural=(n,s)=>`${n} ${s}${n===1?'':'s'}`;
const pct=a=>Math.round(a.score/a.total*100);
const date=s=>new Date(s).toLocaleDateString(undefined,{month:'short',day:'numeric'});
const act=(name,attrs='')=>`data-action="${name}" ${attrs}`;
const button=(label,action,cls='secondary',attrs='')=>`<button type="button" class="btn ${cls}" ${act(action,attrs)}>${label}</button>`;
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('visible'),4500);}
async function change(action){data=await api.change(action);return data;}
function navigate(page,courseId=null,unitId=null){view={page,courseId,unitId};closeModal();render();$('#main').scrollTop=0;}
function render(){
  closeMenu();
  $('#sidebar').innerHTML=`<button class="brand" ${act('home')} aria-label="Quiznet home">${icon('spark')}<span>Quiznet</span></button><nav class="app-nav" aria-label="Navigation"><button class="nav-item ${view.page==='library'?'active':''}" ${act('home')}>Library</button><button class="nav-item ${['history','result'].includes(view.page)?'active':''}" ${act('history')}>History</button></nav><button class="icon-button app-menu" ${act('appMenu')} aria-label="App menu" aria-haspopup="menu" aria-expanded="false">${icon('more')}</button>`;
  const c=courseBy(view.courseId),u=c?.units.find(item=>item.id===view.unitId);
  const crumb=view.page==='library'?(c?`<button ${act('home')}>Courses</button>${icon('chevron')}<button ${act('course',`data-id="${c.id}"`)}>${esc(c.title)}</button>${u?`${icon('chevron')}<span>${esc(u.title)}</span>`:''}`:'<span>Courses</span>'):view.page==='history'?'<span>History</span>':view.page==='settings'?'<span>Settings</span>':view.page==='quiz'?'<span>Quiz</span>':'<span>Results</span>';
  const tools=view.page==='library'?`${button(icon('search'),'search','icon-button secondary','aria-label="Search" title="Search (Ctrl+K)"')}${button(icon('plus')+' '+(u?'New quiz':c?'New unit':'New course'),u?'newQuiz':c?'newUnit':'newCourse','primary',`${c?`data-course="${c.id}"`:''} ${u?`data-unit="${u.id}"`:''}`)}${c?button(icon('more'),u?'unitMenu':'courseMenu','icon-button secondary',`data-course="${c.id}" ${u?`data-unit="${u.id}"`:''} aria-label="${u?'Unit':'Course'} menu" aria-haspopup="menu" aria-expanded="false"`):''}`:'';
  $('#main').innerHTML=`<header class="topbar"><div class="breadcrumbs">${crumb}</div><div class="top-actions">${tools}</div></header><div class="main-content" id="content">${view.page==='quiz'?quizView():view.page==='result'?resultView():view.page==='history'?historyView():view.page==='settings'?settingsView():c?courseView(c,u):libraryView()}</div>`;
}
function libraryView(){
  return `${resumeBanner()}${data.courses.length?`<table class="library-table"><thead><tr><th>Course</th><th>Units</th><th>Quizzes</th></tr></thead><tbody>${data.courses.map(c=>{const s=stats(c);return `<tr class="course-row"><td><button class="row-link" ${act('course',`data-id="${c.id}"`)}><span class="color-dot ${c.color}"></span>${esc(c.title)}</button></td><td>${s.units}</td><td>${s.quizzes}</td></tr>`;}).join('')}</tbody></table>`:empty('No courses yet.','newCourse','New course')}`;
}
function resumeBanner(){return data.activeSession?`<div class="resume-banner"><span>${esc(find(data.activeSession.quizId)?.quiz.title)} <small>· In progress</small></span>${button('Resume','resume','secondary')}</div>`:'';}
function courseView(c,selectedUnit){
  const units=selectedUnit?[selectedUnit]:c.units;
  return `${resumeBanner()}${units.map(u=>`<section class="unit-section"><div class="unit-heading">${selectedUnit?`<h2>Quizzes</h2>`:`<button class="unit-link" ${act('unit',`data-course="${c.id}" data-id="${u.id}"`)}>${esc(u.title)}${icon('chevron')}</button>`}${!selectedUnit?button(icon('more'),'unitMenu','icon-button text',`data-course="${c.id}" data-unit="${u.id}" aria-label="Manage ${esc(u.title)}" aria-haspopup="menu" aria-expanded="false"`):''}</div><div class="quiz-list">${u.quizzes.map(q=>quizRow(q,c,u)).join('')}${!u.quizzes.length?'<div class="empty-unit">No quizzes.</div>':''}</div></section>`).join('')}${!units.length?empty('No units yet.'):''}`;
}
function quizRow(q,c,u){
  const attempts=data.attempts.filter(a=>a.quizId===q.id),best=attempts.length?Math.max(...attempts.map(pct)):null;
  return `<article class="quiz-row"><div class="quiz-info"><h3>${esc(q.title)}</h3><span>${plural(q.questions.length,'question')}${best!==null?` · Best ${best}%`:''}</span></div>${button('Start','start','secondary',`data-id="${q.id}" aria-label="Start ${esc(q.title)}"`)}${button(icon('more'),'quizMenu','icon-button text',`data-course="${c.id}" data-unit="${u.id}" data-id="${q.id}" aria-label="Options for ${esc(q.title)}" aria-haspopup="menu" aria-expanded="false"`)}</article>`;
}
function quizView(){
  const s=data.activeSession;if(!s){view.page='library';return libraryView();}
  const {quiz}=find(s.quizId),questions=s.questionIds.map(id=>quiz.questions.find(q=>q.id===id)),q=questions[s.position];
  return `<div class="quiz-header"><button class="back-link" ${act('pause')}>${icon('back')} Exit</button><h1>${esc(quiz.title)}</h1><select class="question-jump" id="question-jump" aria-label="Go to question">${questions.map((item,i)=>`<option value="${i}" ${s.position===i?'selected':''}>${i+1} / ${questions.length}${Number.isInteger(s.answers[item.id])?' ✓':''}</option>`).join('')}</select></div><section class="question-panel"><div class="question-prompt" role="heading" aria-level="2">${promptBody(q)}</div><div class="answer-options">${q.options.map((o,i)=>`<button dir="auto" class="answer-option ${s.answers[q.id]===i?'chosen':''}" ${act('answer',`data-question="${q.id}" data-index="${i}"`)} aria-pressed="${s.answers[q.id]===i}"><span class="option-letter">${String.fromCharCode(65+i)}</span><div class="answer-content">${rich(o,q)}</div><span class="option-radio">${s.answers[q.id]===i?icon('check'):''}</span></button>`).join('')}</div><div class="question-controls">${button(`${icon('back')} Previous`,'position','secondary',`data-index="${s.position-1}" ${s.position===0?'disabled':''}`)}${s.position===questions.length-1?button('Finish','finish','primary'):button(`Next ${icon('arrow')}`,'position','primary',`data-index="${s.position+1}"`)}</div></section>`;
}
function resultView(){
  const a=data.attempts.find(a=>a.id===view.attemptId)||data.attempts.at(-1);if(!a)return empty('No results yet.','home','Library');
  return `<section class="result-summary"><div><h1>${esc(a.title)}</h1><span>${a.score} / ${a.total} correct</span></div><strong class="score-value">${pct(a)}%</strong><div class="button-row">${find(a.quizId)?button('Retry','start','primary',`data-id="${a.quizId}"`):''}${button('Library','home','secondary')}</div></section><div class="review-list">${a.questions.map((q,i)=>{const correct=a.answers[i]===q.correctAnswer;return `<article class="review-card"><div class="review-top"><span class="review-number">${i+1}.</span><div class="review-question" role="heading" aria-level="2">${promptBody(q)}</div><span class="review-badge ${correct?'right':'wrong'}">${icon(correct?'check':'close')} ${correct?'Correct':'Incorrect'}</span></div><div class="review-answers"><div class="${correct?'right-answer':'wrong-answer'}"><span>Your answer</span>${rich(q.options[a.answers[i]],q)}</div>${!correct?`<div class="right-answer"><span>Correct answer</span>${rich(q.options[q.correctAnswer],q)}</div>`:''}</div>${q.explanation?`<div class="explanation">${rich(q.explanation,q)}</div>`:''}</article>`;}).join('')}</div>`;
}
function historyView(){return data.attempts.length?`<div class="history-list">${[...data.attempts].reverse().map(a=>`<button class="history-row" ${act('result',`data-id="${a.id}"`)}><div><strong>${esc(a.title)}</strong><span>${date(a.completedAt)} · ${a.score} / ${a.total} correct</span></div><span class="history-score">${pct(a)}%</span>${icon('chevron')}</button>`).join('')}</div>`:'<p class="empty-message">No completed quizzes.</p>';}
function settingsView(){return `<div class="settings-list"><section class="settings-row"><div><h2>Backup</h2></div><div class="button-row">${button('Save backup','backup','secondary')}${button('Restore','restore','secondary')}</div></section><section class="settings-row"><h2>Data folder</h2>${button('Open folder','openData','secondary')}</section><details class="storage-details"><summary>Storage location</summary><code>${esc(meta.dataPath)}</code></details></div><p class="version-label">Quiznet ${esc(meta.version)}</p>`;}
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
  const items=[['Import…','import'],['Search…','search'],['Settings','settings'],['Help','help']];
  if(data.activeSession)items.push(['Resume quiz','resume'],['Discard attempt…','discard','',true]);
  showMenu(trigger,items);
}
function itemMenu(trigger,type){
  const courseId=trigger.dataset.course,unitId=trigger.dataset.unit,quizId=trigger.dataset.id;
  const attrs=`data-course="${courseId}"${unitId?` data-unit="${unitId}"`:''}${quizId?` data-id="${quizId}"`:''}`;
  const items=type==='quiz'?[['Edit…','editQuiz',attrs],['Shuffle & start','shuffleStart',attrs],['Export…','exportQuiz',attrs]]:type==='unit'?[['New quiz…','newQuiz',attrs],['Rename…','rename',attrs]]:[['Rename…','rename',attrs]];
  items.push(['Delete…','delete',attrs,true]);showMenu(trigger,items);
}
function showModal(title,body,footer,onSubmit,wide=false){
  closeMenu();
  if(!modal)previousFocus=document.activeElement;
  modal={onSubmit};
  $('#modal-root').innerHTML=`<div class="modal-backdrop"><section class="modal ${wide?'wide':''}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-heading"><h2 id="modal-title">${title}</h2><button class="tiny-button" ${act('closeModal')} aria-label="Close dialog">${icon('close')}</button></div><form id="modal-form"><div class="modal-body">${body}</div><p class="form-error" role="alert"></p><div class="modal-footer">${footer||button('Cancel','closeModal','secondary')}</div></form></section></div>`;
  $('#modal-form').addEventListener('submit',async e=>{
    e.preventDefault();if(!modal?.onSubmit||busy)return;busy=true;const submit=e.submitter;if(submit)submit.disabled=true;
    try{await modal.onSubmit(new FormData(e.target));}catch(error){const errorBox=$('.form-error');if(errorBox)errorBox.textContent=error.message;else toast(error.message);}finally{busy=false;if(submit?.isConnected)submit.disabled=false;}
  });
  setTimeout(()=>$('.modal input:not([type="radio"]), .modal textarea, .modal select, .modal button')?.focus(),0);
}
function closeModal(){modal=null;editor=null;$('#modal-root').innerHTML='';if(previousFocus?.isConnected)previousFocus.focus();previousFocus=null;}
const submit=(label,cls='primary')=>`<button class="btn ${cls}" type="submit">${label}</button>`;
const modalButtons=label=>`${button('Cancel','closeModal','secondary')}${submit(label)}`;
function newCourse(){showModal('New course',`<label>Course name<input name="title" placeholder="Biology" maxlength="200" required></label>`,modalButtons('Create'),async f=>{await change({type:'createCourse',title:f.get('title')});navigate('library',data.courses.at(-1).id);});}
function newUnit(courseId){if(!courseId){newCourse();return;}showModal('New unit',`<label>Unit name<input name="title" placeholder="Unit 1: Cells" maxlength="200" required></label>`,modalButtons('Create'),async f=>{await change({type:'createUnit',courseId,title:f.get('title')});const u=courseBy(courseId).units.at(-1);navigate('library',courseId,u.id);});}
function editQuiz(quizId,courseId,unitId){const found=quizId?find(quizId):null;editor={quizId,courseId:found?.course.id||courseId,unitId:found?.unit.id||unitId,title:found?.quiz.title||'',questions:found?structuredClone(found.quiz.questions):[blankQuestion()]};renderEditor();}
function blankQuestion(){return {prompt:'',options:['','','',''],correctAnswer:0,explanation:''};}
function editorQuestion(q,i,total) {
  const html=q.format==='html',limit=html?window.QuiznetContentPolicy.MAX_HTML_LENGTH:10000;
  return `<section class="editor-question" data-question-index="${i}">
    <div class="editor-question-heading"><strong>QUESTION ${i+1}</strong><div class="editor-tools"><label class="html-switch"><input type="checkbox" data-editor="format" data-index="${i}" ${html?'checked':''}> HTML</label>${button(q.image?'Replace image':'Add image','addImage','text',`data-index="${i}"`)}${total>1?button(icon('trash'),'removeQuestion','text icon-button',`data-index="${i}" aria-label="Remove question ${i+1}"`):''}</div></div>
    <label>Question<textarea data-editor="prompt" data-index="${i}" required maxlength="${limit}" rows="2" dir="auto" placeholder="${html?'<p>Your question</p>':'Question'}">${esc(q.prompt)}</textarea></label>
    ${q.image?`<div class="editor-image">${content.image(q)}${button(icon('close'),'removeImage','text icon-button',`data-index="${i}" aria-label="Remove image from question ${i+1}"`)}<label>Image description<input data-editor="imageAlt" data-index="${i}" value="${esc(q.imageAlt)}" maxlength="500" placeholder="Describe the image"></label></div>`:''}
    <div class="editor-options">${q.options.map((o,j)=>`<label><span>${String.fromCharCode(65+j)}</span><textarea data-editor="option" data-index="${i}" data-option="${j}" maxlength="${html?limit:5000}" required rows="1" dir="auto" aria-label="Option ${String.fromCharCode(65+j)} for question ${i+1}" placeholder="Answer option">${esc(o)}</textarea>${q.options.length>2?button(icon('close'),'removeOption','text icon-button',`data-index="${i}" data-option="${j}" aria-label="Remove option ${String.fromCharCode(65+j)}"`):''}</label>`).join('')}</div>
    ${q.options.length<8?button(`${icon('plus')} Add option`,'addOption','text',`data-index="${i}"`):''}
    <div class="editor-answer"><label>Correct answer<select data-editor="correctAnswer" data-index="${i}">${q.options.map((_,j)=>`<option value="${j}" ${q.correctAnswer===j?'selected':''}>Option ${String.fromCharCode(65+j)}</option>`).join('')}</select></label><label>Explanation <span class="muted">(optional)</span><textarea data-editor="explanation" data-index="${i}" maxlength="${limit}" rows="2" placeholder="Explanation" dir="auto">${esc(q.explanation)}</textarea></label></div>
    <details class="editor-preview" data-preview="${i}"><summary>Preview</summary><div class="preview-content">${previewQuestion(q)}</div></details>
  </section>`;
}
function previewQuestion(q) { return `<div class="preview-prompt">${promptBody(q)}</div><div class="preview-options">${q.options.map((o,j)=>`<div><span class="option-letter">${String.fromCharCode(65+j)}</span>${rich(o,q)}</div>`).join('')}</div>${q.explanation?`<div class="explanation">${rich(q.explanation,q)}</div>`:''}`; }
function renderEditor(){
  const e=editor;
  const scroll=$('.modal-body')?.scrollTop||0,open=[...document.querySelectorAll('.editor-preview[open]')].map(el=>el.dataset.preview);
  showModal(e.quizId?'Edit quiz':'New quiz',`<label>Quiz title<input data-editor="title" value="${esc(e.title)}" placeholder="Quiz 1" required maxlength="200"></label><div class="editor-questions">${e.questions.map((q,i)=>editorQuestion(q,i,e.questions.length)).join('')}</div>${button(`${icon('plus')} Add question`,'addQuestion','secondary')}`,modalButtons('Save quiz'),async()=>{await change({type:'saveQuiz',...editor});navigate('library',e.courseId,e.unitId);toast('Saved.');},true);
  for (const index of open) $(`.editor-preview[data-preview="${index}"]`)?.setAttribute('open','');
  setTimeout(()=>{$('.modal-body')?.scrollTo(0,scroll);},0);
}
async function startQuiz(quizId,shuffle=false){
  if(data.activeSession){showModal('Unfinished quiz',`<p>${esc(find(data.activeSession.quizId)?.quiz.title)}</p>`,`${button('Resume','resume','primary')}${button('Discard…','discard','secondary')}`,null);return;}
  if(!find(quizId))return;
  await change({type:'start',quizId,shuffle});navigate('quiz');
}
function manage(action,b){
  const quizId=b.dataset.id,courseId=b.dataset.course,unitId=b.dataset.unit;
  const c=courseBy(courseId),u=c?.units.find(u=>u.id===unitId),q=quizId?find(quizId)?.quiz:null,item=q||u||c;
  if(!item)return;
  if(action==='rename')showModal('Rename',`<label>Name<input name="title" value="${esc(item.title)}" required maxlength="200"></label>`,modalButtons('Save'),async f=>{await change({type:'rename',courseId,unitId,quizId,title:f.get('title')});closeModal();render();});
  else showModal(`Delete this ${q?'quiz':u?'unit':'course'}?`,`<p><strong>${esc(item.title)}</strong> will be removed along with ${q?'its practice history':u?'its quizzes and practice history':'its units, quizzes, and practice history'}.</p>`,`${button('Cancel','closeModal','secondary')}${submit('Delete','danger')}`,async()=>{await change({type:'delete',courseId,unitId,quizId});if(!courseBy(view.courseId))navigate('library');else if(view.unitId&&!courseBy(view.courseId)?.units.some(u=>u.id===view.unitId))navigate('library',view.courseId);else{closeModal();render();}toast('Deleted.');});
}
async function importQuestions(){
  const preview=await api.importPreview();if(!preview)return;
  showModal('Import',`<p class="modal-intro">${esc(preview.filename)} · ${plural(preview.packs.reduce((n,p)=>n+p.count,0),'question')}</p><div class="import-preview">${preview.packs.map(p=>`<div><strong>${esc(p.title)}</strong><span>${esc(p.course)} → ${esc(p.unit)} · ${p.count} questions</span></div>`).join('')}</div><label>Course<select name="target" id="import-target"><option value="">From file</option>${data.courses.map(c=>`<option value="${c.id}" ${view.courseId===c.id?'selected':''}>${esc(c.title)}</option>`).join('')}</select></label><div id="import-unit-slot"></div>`,modalButtons('Import'),async f=>{const courseId=f.get('target'),unitId=f.get('unit');data=await api.importConfirm(preview.token,courseId?{courseId,unitId:unitId||undefined}:undefined);navigate('library',courseId||null,unitId||null);toast('Imported.');});
  updateImportUnit();
}
function updateImportUnit(){const courseId=$('#import-target')?.value,c=courseBy(courseId);$('#import-unit-slot').innerHTML=c?`<label>Unit<select name="unit"><option value="">From file</option>${c.units.map(u=>`<option value="${u.id}" ${view.unitId===u.id?'selected':''}>${esc(u.title)}</option>`).join('')}</select></label>`:'';}
function help(){showModal('Help',`<p>Organize <strong>Courses → Units → Quizzes</strong>. Create questions in the editor or import a JSON or CSV file.</p><p>Use <strong>Add image</strong> for local PNG, JPEG, GIF, or WebP images (up to 2 MB). Turn on <strong>HTML</strong> for formatting and open <strong>Preview</strong> to check it. Images are included in exports and backups.</p><h3>JSON · one quiz</h3><pre>{
  "course": "Biology",
  "unit": "Unit 1: Cells",
  "title": "Quiz 1",
  "questions": [{
    "prompt": "Where is most DNA stored?",
    "options": ["Nucleus", "Ribosome"],
    "correctAnswer": 0,
    "explanation": "Most DNA is in the nucleus."
  }]
}</pre><p class="muted"><strong>correctAnswer</strong> is zero-based: 0 = A, 1 = B. Letters or exact answer text work too. A questions array alone is accepted; multiple quizzes use <code>{ "quizzes": [ … ] }</code>.</p><h3>CSV · one question per row</h3><pre>course,unit,title,question,option_a,option_b,answer,explanation
Biology,Cells,Quiz 1,Where is most DNA?,Nucleus,Ribosome,A,Inside the nucleus.</pre><p class="muted">Use 2–8 options, with columns option_a through option_h. CSV answers use letters A–H or exact option text. Quote fields containing commas or line breaks. Files up to 20 MB and 10,000 questions per import.</p><p>Keyboard: <kbd>Ctrl K</kbd> searches your library. In a quiz, <kbd>1</kbd>–<kbd>8</kbd> selects an answer and arrow keys move between questions.</p>`,button('Close','closeModal','primary'),null,true);}
function search(){showModal('Search',`<div class="search-input-wrap">${icon('search')}<input id="search-input" placeholder="Search…" autocomplete="off" aria-label="Search your library"></div><div id="search-results"></div>`,button('Close','closeModal','secondary'),null,true);renderSearch('');}
function renderSearch(query){query=query.trim().toLowerCase();const courses=data.courses.filter(c=>c.title.toLowerCase().includes(query)),quizzes=flatten().filter(({course,unit,quiz})=>`${course.title} ${unit.title} ${quiz.title} ${quiz.questions.map(q=>content.plain(q.prompt,q.format)).join(' ')}`.toLowerCase().includes(query));$('#search-results').innerHTML=`${courses.map(c=>`<button class="search-result" ${act('course',`data-id="${c.id}"`)}>${icon('folder')}<div><strong>${esc(c.title)}</strong><span>Course · ${plural(stats(c).quizzes,'quiz')}</span></div>${icon('arrow')}</button>`).join('')}${quizzes.slice(0,50).map(({course,unit,quiz})=>`<button class="search-result" ${act('start',`data-id="${quiz.id}"`)}>${icon('book')}<div><strong>${esc(quiz.title)}</strong><span>${esc(course.title)} → ${esc(unit.title)}</span></div>${icon('arrow')}</button>`).join('')}${!courses.length&&!quizzes.length?'<p class="muted search-empty">No matches.</p>':''}${quizzes.length>50?'<p class="muted">Showing the first 50 quizzes. Refine your search to see more.</p>':''}`;}
document.addEventListener('input',e=>{
  if(e.target.id==='search-input')renderSearch(e.target.value);
  const el=e.target;if(!el.dataset.editor||!editor)return;
  const key=el.dataset.editor,i=Number(el.dataset.index);
  if(key==='format')return;
  if(key==='title')editor.title=el.value;
  else if(key==='option')editor.questions[i].options[Number(el.dataset.option)]=el.value;
  else editor.questions[i][key]=key==='correctAnswer'?Number(el.value):el.value;
  if(key!=='title') {
    clearTimeout(previewQuestion.timer);
    previewQuestion.timer=setTimeout(()=>{if(editor){const preview=$(`.editor-preview[data-preview="${i}"][open] .preview-content`);if(preview)preview.innerHTML=previewQuestion(editor.questions[i]);}},120);
  }
});
document.addEventListener('toggle',e=>{if(e.target.matches('.editor-preview[open]')&&editor)e.target.querySelector('.preview-content').innerHTML=previewQuestion(editor.questions[Number(e.target.dataset.preview)]);},true);
document.addEventListener('change',async e=>{
  if(e.target.dataset.editor==='format'&&editor){const i=Number(e.target.dataset.index);editor.questions[i].format=e.target.checked?'html':'text';renderEditor();setTimeout(()=>$(`[data-editor="format"][data-index="${i}"]`)?.focus({preventScroll:true}),0);}
  if(e.target.id==='import-target')updateImportUnit();
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
      case 'home':navigate('library');break;case 'course':navigate('library',b.dataset.id);break;case 'unit':navigate('library',b.dataset.course,b.dataset.id);break;
      case 'history':navigate('history');break;case 'settings':navigate('settings');break;case 'help':help();break;case 'search':search();break;
      case 'closeModal':closeModal();break;case 'newCourse':newCourse();break;case 'newUnit':newUnit(b.dataset.course||view.courseId);break;
      case 'newQuiz':editQuiz(null,b.dataset.course,b.dataset.unit);break;case 'editQuiz':editQuiz(b.dataset.id);break;
      case 'rename':case 'delete':manage(a,b);break;
      case 'appMenu':appMenu(b);break;case 'courseMenu':itemMenu(b,'course');break;case 'unitMenu':itemMenu(b,'unit');break;case 'quizMenu':itemMenu(b,'quiz');break;
      case 'start':await startQuiz(b.dataset.id);break;case 'shuffleStart':await startQuiz(b.dataset.id,true);break;case 'resume':navigate('quiz');break;
      case 'pause':{const f=find(data.activeSession?.quizId);navigate('library',f?.course.id,f?.unit.id);break;}
      case 'answer':await change({type:'answer',questionId:b.dataset.question,answer:Number(b.dataset.index)});render();break;
      case 'position':await change({type:'position',position:Number(b.dataset.index)});render();break;
      case 'finish':{const s=data.activeSession,missing=s.questionIds.findIndex(id=>!Number.isInteger(s.answers[id]));if(missing>=0){await change({type:'position',position:missing});render();toast('Answer every question.');}else{await change({type:'finish'});view={page:'result',attemptId:data.attempts.at(-1).id};render();$('#main').scrollTop=0;}break;}
      case 'discard':showModal('Discard attempt?',`<p>Your saved answers for <strong>${esc(find(data.activeSession?.quizId)?.quiz.title)}</strong> will be discarded. The quiz stays in your library.</p>`,`${button('Cancel','closeModal','secondary')}${submit('Discard attempt','danger')}`,async()=>{await change({type:'discard'});navigate('library');});break;
      case 'result':view={page:'result',attemptId:b.dataset.id};render();break;
      case 'import':await importQuestions();break;case 'exportQuiz':if(await api.exportQuiz(b.dataset.id))toast('Exported.');break;
      case 'backup':if(await api.backup())toast('Backup saved.');break;
      case 'openData':await api.openData();break;
      case 'restore':{const p=await api.restorePreview();if(p)showModal('Restore this library?',`<p><strong>${esc(p.filename)}</strong> contains ${plural(p.courses,'course')} and ${plural(p.quizzes,'quiz')}.</p><p>This will replace your current library. A separate copy of it will be kept in the data folder.</p>`,modalButtons('Restore'),async()=>{data=await api.restoreConfirm(p.token);navigate('library');toast('Restored.');});break;}
      case 'addQuestion':editor.questions.push(blankQuestion());renderEditor();$('.editor-question:last-child textarea')?.focus();break;
      case 'addImage':{
        const current=editor,i=Number(b.dataset.index),selected=await api.selectImage();
        if(selected&&editor===current){const image=new Image();image.src=selected.image;try{await image.decode();}catch{throw new Error('This image could not be opened. Choose a valid PNG, JPEG, GIF, or WebP.');}editor.questions[i].image=selected.image;editor.questions[i].imageAlt=editor.questions[i].imageAlt||'';renderEditor();}break;
      }
      case 'removeImage':{const q=editor.questions[Number(b.dataset.index)];delete q.image;delete q.imageAlt;renderEditor();break;}
      case 'removeQuestion':editor.questions.splice(Number(b.dataset.index),1);renderEditor();break;
      case 'addOption':editor.questions[Number(b.dataset.index)].options.push('');renderEditor();break;
      case 'removeOption':{const q=editor.questions[Number(b.dataset.index)],j=Number(b.dataset.option);q.options.splice(j,1);if(q.correctAnswer===j)q.correctAnswer=0;else if(q.correctAnswer>j)q.correctAnswer--;renderEditor();break;}
    }
  }catch(error){toast(error.message);}finally{busy=false;}
});
document.addEventListener('keydown',e=>{
  if(e.ctrlKey&&e.key.toLowerCase()==='k'){e.preventDefault();if(!busy)search();return;}
  if(menu){
    if(e.key==='Escape'){const trigger=menu.trigger;closeMenu();trigger?.focus();e.preventDefault();return;}
    const items=[...document.querySelectorAll('.popover-menu button')],index=items.indexOf(document.activeElement);
    if(['ArrowDown','ArrowUp'].includes(e.key)){items[(index+(e.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus();e.preventDefault();return;}
    if(e.key==='Tab')closeMenu();
  }
  if(modal){
    if(e.key==='Escape'&&!busy)closeModal();
    if(e.key==='Tab'){const items=[...document.querySelectorAll('.modal button:not([disabled]), .modal input, .modal textarea, .modal select')].filter(el=>el.offsetParent!==null);const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){last?.focus();e.preventDefault();}else if(!e.shiftKey&&document.activeElement===last){first?.focus();e.preventDefault();}}return;
  }
  if(view.page==='quiz'&&!busy&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&!['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)){
    if(/^[1-8]$/.test(e.key)){const b=document.querySelector(`[data-action="answer"][data-index="${Number(e.key)-1}"]`);if(b){e.preventDefault();b.click();}}
    if(['ArrowRight','ArrowLeft'].includes(e.key)){const position=data.activeSession.position+(e.key==='ArrowRight'?1:-1);if(position>=0&&position<data.activeSession.questionIds.length){e.preventDefault();const selector=$('#question-jump');selector.value=String(position);selector.dispatchEvent(new Event('change',{bubbles:true}));}}
  }
});
api.get().then(result=>{data=result.library;meta=result.meta;render();if(meta.notice)toast(meta.notice);}).catch(error=>{$('#main').innerHTML=`<div class="empty-state"><h1>We couldn’t open your library.</h1><p>${esc(error.message)}</p></div>`;});
