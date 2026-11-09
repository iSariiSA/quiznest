let pendingResponse=null,responseTimer=null,responseOperation=Promise.resolve(),responseRevision=0;
function responseState(context){
 if(context==='quiz'){const s=data.activeSession,q=sessionQuiz()?.questions.find(q=>q.id===s?.questionIds[s.position]);return s&&q?{q,answer:s.answers[q.id],action:'answer',questionId:q.id}:null;}
 if(context==='daily'){const s=data.dailyReview?.active,q=window.QuiznetDailyReview.current(data)?.question;return s&&q?{q,answer:s.answer,action:'reviewAnswer',token:s.token}:null;}
 if(context==='saved'){const s=data.savedQuestions?.session,q=savedPracticeItem()?.question;return s&&q?{q,answer:s.answer,action:'savedAnswer',token:s.token}:null;}
 if(context==='mistake'){const s=notebookState?.session;return s?{q:s.item.question,answer:s.answer,action:'mistakeAnswer',token:s.token}:null;}
 return null;
}
function applyResponseValue(pending){const state=responseState(pending.context);if(!state||state.q.id!==pending.questionId||state.token!==pending.token)return;if(pending.context==='quiz')data.activeSession.answers[state.q.id]=structuredClone(pending.answer);else if(pending.context==='daily')data.dailyReview.active.answer=structuredClone(pending.answer);else if(pending.context==='saved')data.savedQuestions.session.answer=structuredClone(pending.answer);else {notebookState.session.answer=structuredClone(pending.answer);if(data.mistakeNotebook?.session)data.mistakeNotebook.session.answer=structuredClone(pending.answer);}}
function responseStatus(context,message){for(const control of document.querySelectorAll('[data-response-context]'))if(control.dataset.responseContext===context)control.closest('[data-response-root]')?.querySelector('[data-response-save-state]')?.replaceChildren(document.createTextNode(tr(message)));}
function responseCheckState(context,q,answer){const action={daily:'reviewCheck',saved:'savedCheck',mistake:'mistakeCheck'}[context];if(action)for(const control of document.querySelectorAll('[data-action="'+action+'"]'))control.disabled=!questionModel.validAnswer(q,answer);}
function responseNavigation(){if(view.page!=='quiz'||!data.activeSession)return;const s=data.activeSession,quiz=sessionQuiz(),questions=s.questionIds.map(id=>quiz.questions.find(q=>q.id===id)),options={...practice.defaults,...s.practice},navigation=document.querySelector('.quiz-navigation');if(navigation)navigation.outerHTML=quizNavigation(s,questions,options);for(const option of document.querySelectorAll('#question-jump option')){const index=Number(option.value),q=questions[index];option.textContent=`${index+1} / ${questions.length}${practice.answered(s,q)?' ✓':''}`;}}
function flushResponses(){
 clearTimeout(responseTimer);const operation=responseOperation.catch(()=>{}).then(async()=>{while(pendingResponse){const pending=pendingResponse;try{const next=await api.change(pending.action);data=next;if(pendingResponse===pending){pendingResponse=null;responseStatus(pending.context,'Answer saved on this device');}else applyResponseValue(pendingResponse);if(pending.context==='quiz')responseNavigation();}catch(error){responseStatus(pending.context,'Answer not saved. Try again before leaving.');throw error;}}});responseOperation=operation;return operation;
}
function receiveResponseInput(control){
 const context=control.dataset.responseContext;if(context==='preview'){appearanceResponseInput(control);return;}
 const state=responseState(context);if(!state||state.q.id!==control.dataset.responseQuestion||questionModel.isChoice(state.q))return;
 const answer=responseValue(state.q,state.answer,control),action={type:state.action,...(state.token?{token:state.token}:{questionId:state.q.id}),answer:structuredClone(answer)};
 pendingResponse={context,questionId:state.q.id,token:state.token,answer:structuredClone(answer),action,revision:++responseRevision};applyResponseValue(pendingResponse);
 if(control.dataset.responseKind==='matching'){const row=control.dataset.responseRow;render();[...document.querySelectorAll('[data-response-context]')].find(el=>el.dataset.responseContext===context&&el.dataset.responseRow===row)?.focus({preventScroll:true});}
 responseStatus(context,'Saving answer…');responseCheckState(context,state.q,answer);clearTimeout(responseTimer);responseTimer=setTimeout(()=>flushResponses().catch(error=>toast(error.message)),250);
}
document.addEventListener('input',event=>{if(event.target.dataset.responseKind==='written')receiveResponseInput(event.target);});
document.addEventListener('change',event=>{if(event.target.dataset.responseKind==='matching')receiveResponseInput(event.target);});
