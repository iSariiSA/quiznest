let savedQuestionsState={total:0,page:0,pages:1,items:[]};
let savedQuestionFilter={courseId:'',unitId:'',quizId:'',unlinked:false};
function savedFilterControls(){
  const list=savedQuestionsState,f=savedQuestionFilter,options=list.options;
  const select=(field,label,all,items,disabled=false)=>`<label>${label}<select data-saved-filter="${field}" ${disabled?'disabled':''}><option value="">${all}</option>${items.map(item=>`<option value="${esc(item.id)}" ${f[field]===item.id?'selected':''}>${esc(item.title)}</option>`).join('')}${f[field]&&!items.some(item=>item.id===f[field])?`<option value="${esc(f[field])}" selected>${trHtml("No saved questions",{})}</option>`:''}${field==='courseId'&&(list.unlinkedCount||f.unlinked)?`<option value="@unlinked" data-unlinked="true" ${f.unlinked?'selected':''}>${trHtml("Unlinked questions ({value1})",{value1:list.unlinkedCount})}</option>`:''}</select></label>`;
  const active=f.courseId||f.unlinked;
  return `<section class="saved-filters" aria-label="${trHtml("Filter saved questions",{})}"><div class="saved-filter-fields">${select('courseId',tr("Course"),tr("All courses"),options.courses)}${select('unitId',tr("Unit"),tr("All units"),options.units,!f.courseId)}${select('quizId',tr("Quiz"),tr("All quizzes"),options.quizzes,!f.unitId)}${active?button(tr("Clear filters"),'savedClearFilters','text'):''}</div><p class="muted" role="status">${trHtml("Showing {value4} of {value5} saved questions. {value6}",{value4:list.total,value5:list.collectionTotal,value6:active?tr("New practice uses these filters."):tr("Choose a course, then narrow to a unit or quiz.")})}</p>${f.unlinked?`<p class="muted">${trHtml("These older copies have no identifiable source. Their saved content is still available.",{})}</p>`:''}</section>`;
}
async function updateSavedFilter(field,value,unlinked=false){
  const next=field==='clear'?{courseId:'',unitId:'',quizId:'',unlinked:false}:{...savedQuestionFilter};
  if(field==='courseId'){next.courseId=unlinked?'':value;next.unlinked=unlinked;next.unitId='';next.quizId='';}
  if(field==='unitId'){next.unitId=value;next.quizId='';}
  if(field==='quizId')next.quizId=value;
  const list=await api.savedQuestions(0,next);savedQuestionFilter=next;savedQuestionsState=list;view.savedReveals=new Set();render();document.querySelector(`[data-saved-filter="${field==='clear'?'courseId':field}"]`)?.focus();
}
document.addEventListener('change',async e=>{
  const field=e.target.dataset.savedFilter;if(!field||busy)return;
  busy=true;const controls=[...document.querySelectorAll('button[data-action],select[data-saved-filter]')].filter(el=>!el.disabled);for(const el of controls)el.disabled=true;
  try{await updateSavedFilter(field,e.target.value,Boolean(e.target.selectedOptions[0]?.dataset.unlinked));}catch(error){render();toast(error.message);}finally{for(const el of controls)if(el.isConnected)el.disabled=false;busy=false;}
});
let savedIndexCache={owner:null,index:new Map()};
function savedEntryFor(q){
  const owner=data.savedQuestions;
  if(savedIndexCache.owner!==owner){savedIndexCache={owner,index:new Map((owner?.items||[]).map(item=>[window.QuiznetQuestionIdentity.signature(item.question),item]))};}
  return savedIndexCache.index.get(window.QuiznetQuestionIdentity.signature(q));
}
function savedPracticeItem(){const s=data.savedQuestions?.session;return s?data.savedQuestions.items.find(item=>item.key===s.keys[s.position]):null;}
function savedQuestionButton(attrs,q){
  const item=savedEntryFor(q),locked=Boolean(item&&data.savedQuestions?.session?.keys.includes(item.key));
  const mark=`<svg class="icon" viewBox="0 0 24 24" fill="${item?'currentColor':'none'}" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/></svg>`;
  return button(`${mark}<span>${item?tr("Saved"):tr("Save question")}</span>`,'saveQuestion',`text question-save ${item?'is-saved':''}`,`${attrs} data-question-id="${esc(q.id)}" aria-label="${item?tr("Unsave question"):tr("Save question")}" aria-pressed="${Boolean(item)}" title="${locked?tr("Finish or end saved practice before removing this question"):item?tr("Remove from Saved questions"):tr("Save this question for later")}" ${locked?'disabled':''}`);
}
async function refreshSavedQuestions(index=savedQuestionsState.page){savedQuestionsState=await api.savedQuestions(index,savedQuestionFilter);}
async function openSavedQuestions(index=0){await refreshSavedQuestions(index);await navigate('savedQuestions');}
async function saveQuestionFrom(b){
  const q=questionFromButton(b);if(!q)throw new Error(tr("Open this question again before saving it."));
  const existing=savedEntryFor(q),source=questionSourceFrom(b),questionId=q.id,copySource=b.dataset.copySource;
  const apply=async()=>{
    const controls=[...document.querySelectorAll('button[data-action],select[data-saved-filter]')].filter(el=>!el.disabled);
    for(const control of controls)control.disabled=true;
    document.querySelector('#main').setAttribute('aria-busy','true');
    try{
      await change(existing?{type:'savedRemove',key:existing.key}:{type:'savedAdd',source});
      if(view.page==='savedQuestions')await refreshSavedQuestions();
      closeModal();render();
      [...document.querySelectorAll('[data-action="saveQuestion"]')].find(el=>el.dataset.questionId===questionId&&el.dataset.copySource===copySource)?.focus();
      toast(existing?tr("Question removed from Saved questions."):tr("Question saved. Open Saved questions from Home."));
    }finally{for(const control of controls)if(control.isConnected)control.disabled=false;document.querySelector('#main').removeAttribute('aria-busy');}
  };
  if(existing&&view.page==='savedQuestions')showModal(tr("Remove this saved question?"), `<p>${trHtml("This removes the saved copy. The original quiz, results, and Mistake Notebook notes stay available. A recovery snapshot is saved first.",{})}</p>`,modalButtons(tr("Remove saved question")),apply);
  else await apply();
}
function savedAnswerContent(q,answer){return responseContent(q,answer);}
function savedQuestionsView(){
  const list=savedQuestionsState,session=data.savedQuestions?.session,last=data.savedQuestions?.lastResult,revealed=view.savedReveals||new Set();
  return `<section class="saved-questions"><p class="eyebrow">${trHtml("Your collection",{})}</p><h1>${trHtml("Saved questions",{})}</h1><p class="muted">${trHtml("{value0} kept for later. Each saved copy keeps the wording, choices, diagrams, code, and answer from when you starred it.",{value0:plural(list.total,'question')})}</p>${savedFilterControls()}<div class="button-row">${session||list.total?button(session?tr("Continue saved practice"):tr("Practise saved questions"),'savedStart','primary'):''}${session?button(tr("End saved practice…"),'savedDiscard','secondary'):''}</div>${session?`<p class="muted">${trHtml("Your unfinished round keeps its original questions. Filters apply when you start a new round.",{})}</p>`:''}${last?`<p class="saved-result" role="status">${trHtml("Last saved practice: {value0} / {value1} correct · {value2}",{value0:last.correct,value1:last.total,value2:esc(date(last.completedAt))})}</p>`:''}${!list.collectionTotal?`<div class="saved-empty"><h2>${trHtml("Keep a question worth revisiting",{})}</h2><p class="muted">${trHtml("Use the star beside Copy question in a quiz or review, even when you answered correctly.",{})}</p></div>`:!list.total?`<div class="saved-empty"><h2>${trHtml("No saved questions match",{})}</h2><p class="muted">${trHtml("Change or clear the filters to see more saved questions.",{})}</p></div>`:''}${list.items.map(item=>{const q=item.question,show=revealed.has(item.key);return `<article class="review-card saved-question-card"><p class="muted saved-source">${trHtml("{value0} · Saved {value1}",{value0:esc(item.sourceLabel),value1:esc(date(item.savedAt))})}</p><div class="saved-question-prompt" role="heading" aria-level="2">${promptBody(q)}</div>${copyQuestionButton(`data-copy-source="saved" data-key="${esc(item.key)}"`,q)}<div class="saved-choices">${questionChoicesContent(q)}</div>${button(show?tr("Hide answer"):tr("Show answer and explanation"),'savedReveal','secondary',`data-key="${esc(item.key)}" aria-expanded="${show}"`)}${show?`<div class="saved-solution"><h3>${trHtml("Correct answer",{})}</h3>${responseCorrectContent(q)}${q.explanation?`<div class="explanation">${rich(q.explanation,q)}</div>`:`<p class="muted">${trHtml("No explanation was provided.",{})}</p>`}</div>`:''}</article>`;}).join('')}${list.pages>1?`<div class="button-row saved-pagination">${button(tr("Previous saved questions"),'savedQuestions','secondary',`data-page="${list.page-1}" ${list.page===0?'disabled':''}`)}<span>${trHtml("Page {value1} / {value2}",{value1:list.page+1,value2:list.pages})}</span>${button(tr("Next saved questions"),'savedQuestions','secondary',`data-page="${list.page+1}" ${list.page===list.pages-1?'disabled':''}`)}</div>`:''}<p class="muted saved-footnote">${trHtml("Saved copies stay available after the original quiz changes or is deleted. They are included in your library backups. Unchanged copies share one star; changed question content can be saved separately.",{})}</p></section>`;
}
async function startSavedPractice(){
  if(data.savedQuestions?.session){await navigate('savedPractice');return;}
  const total=savedQuestionsState.total;
  if(!total){await openSavedQuestions();return;}
  const max=Math.min(100,total);
  const filter={...savedQuestionFilter};
  showModal(tr("Practise saved questions"),`<p>${trHtml("Choose a random selection from the {value0} matching your current filters. Each question appears once in the round.",{value0:plural(total,'saved question')})}</p><label>${trHtml("Questions this round",{})}<input name="limit" type="number" min="1" max="${max}" step="1" required value="${Math.min(20,max)}"></label><p class="muted">${trHtml("Up to 100 per round. Answers and your place save automatically. This practice has its own score and does not use your daily review allowance or change your review schedule.",{})}</p>`,modalButtons(tr("Start saved practice")),async values=>{await change({type:'savedStart',limit:Number(values.get('limit')),filter});await navigate('savedPractice');});
}
function endSavedPractice(){
  const token=data.savedQuestions?.session?.token;if(!token)return;
  showModal(tr("End saved practice?"), `<p>${trHtml("Clear this unfinished round? Your saved questions stay in the collection. No score will be recorded for this round.",{})}</p>`,modalButtons(tr("End practice")),async()=>{await change({type:'savedDiscard',token});await openSavedQuestions();});
}
function savedPracticeView(){
  const s=data.savedQuestions?.session,item=savedPracticeItem();if(!s||!item)return `<p class="empty-message">${trHtml("Open Saved questions to start another round.",{})}</p>`;
  const q=item.question,selected=questionModel.isChoice(q)?questionModel.selectedIndices(q,s.answer):[],correct=s.checked&&questionModel.reviewedCorrect(q,s.answer,s.selfCorrected);
  return `<section class="daily-session saved-practice"><div class="daily-session-top"><p class="eyebrow">${trHtml("Saved practice · {value0} / {value1}",{value0:s.position+1,value1:s.keys.length})}</p>${button(tr("Pause saved practice"),'savedQuestions','secondary')}</div><p class="muted saved-source">${esc(item.title)}</p><article class="daily-question"><h1 class="sr-only">${trHtml("Practise a saved question",{})}</h1>${copyQuestionButton('data-copy-source="savedPractice"',q)}<div class="question-prompt" tabindex="-1">${promptBody(q)}</div><p class="question-instruction">${esc(tr(questionModel.typeOf(q).instruction))}</p><div class="answer-options">${questionModel.isChoice(q)?q.options.map((option,i)=>button(`<span class="option-letter">${optionLabel(i)}</span>${rich(option,q)}`,'savedChoice',`answer-option ${selected.includes(i)?'chosen':''}`,`data-index="${i}" aria-pressed="${selected.includes(i)}" ${s.checked?'disabled':''}`)).join(''):responseControls(q,s.answer,{context:'saved',disabled:s.checked})}</div></article>${s.checked?`<section class="daily-feedback" aria-label="${trHtml("Saved practice feedback",{})}"><h2 class="${correct?'right-answer':'wrong-answer'}">${correct?tr("Correct"):tr("Incorrect")}</h2><h3>${trHtml("Correct answer",{})}</h3>${responseCorrectContent(q)}${writtenReviewControls(q,s.answer,{source:"saved",token:s.token},s.selfCorrected)}${q.explanation?`<div class="explanation">${rich(q.explanation,q)}</div>`:''}${button(s.position===s.keys.length-1?tr("Finish saved practice"):tr("Next saved question"),'savedNext','primary')}</section>`:`<div class="daily-check">${button(tr("Check answer"),'savedCheck','primary',questionModel.validAnswer(q,s.answer)?'':'disabled')}<span class="muted">${questionModel.isChoice(q)?trHtml("Choose first. Check when you’re ready.",{}):trHtml("Answer first. Check when you’re ready.",{})}</span></div>`}</section>`;
}
document.addEventListener('keydown',e=>{
  if(view.page!=='savedPractice'||busy||modal||menu||e.ctrlKey||e.altKey||e.metaKey||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)||data.savedQuestions?.session?.checked)return;
  if(i18n.digit(e.key)){const el=document.querySelector(`[data-action="savedChoice"][data-index="${i18n.digit(e.key)-1}"]`);if(el){e.preventDefault();el.click();}}
});

