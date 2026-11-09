const writtenReview=window.QuiznetWrittenReview;
function writtenReviewControls(q,answer,source,corrected){
 if(questionModel.typeOf(q).id!=='written-answer'||!questionModel.validAnswer(q,answer)||questionModel.isCorrect(q,answer)&&!corrected)return '';
 return `<div class="written-review-actions">${corrected?`<span class="self-corrected-label">${icon('check')} ${esc(tr('Marked correct by you'))}</span>`:''}${button(corrected?tr('Review correction'):tr('My answer is correct'),'reviewWrittenAnswer','text',`data-review-source="${esc(JSON.stringify(source))}"`)}</div>`;
}
async function applyWrittenReview(source,correct,remember){
 await change({type:'selfReview',source,correct,remember});
 if(source.source==='mistake'||source.source==='daily')await refreshNotebook();
 closeModal();render();const encoded=JSON.stringify(source),control=[...document.querySelectorAll('[data-review-source]')].find(control=>control.dataset.reviewSource===encoded);
 if(control)control.focus({preventScroll:true});else{const heading=document.querySelector('#main h1,.question-prompt');heading?.setAttribute('tabindex','-1');heading?.focus({preventScroll:true});}
 toast(remember?tr('Answer accepted in the original quiz.'):correct?tr('Response marked correct.'):tr('Self-correction removed.'));
}
function openWrittenReview(control){
 const source=JSON.parse(control.dataset.reviewSource),r=writtenReview.resolve(data,source),live=writtenReview.original(data,r),full=live&&!questionModel.isCorrect(live,r.answer)&&live.acceptedAnswers.length>=questionModel.responseLimits.maxAcceptedAnswers;
 showModal(tr('Review written answer'),`<div class="written-review-comparison"><section><h3>${esc(tr('Your answer'))}</h3>${responseContent(r.q,r.answer)}</section><section><h3>${esc(tr('Accepted answers'))}</h3>${responseCorrectContent(r.q)}</section></div><p class="muted">${esc(tr('Accept a different wording only if it answers the question correctly.'))}</p><label class="written-review-remember"><input type="checkbox" name="remember" ${!live||full?'disabled':''}><span>${esc(tr('Also accept this answer in the original quiz'))}</span></label>${!live?`<p class="muted">${esc(tr('The original question is unavailable or has changed. You can still correct this response.'))}</p>`:full?`<p class="muted">${esc(tr('This question already has 20 accepted answers. You can still correct this response.'))}</p>`:''}<p class="muted">${esc(tr('Other past results and saved question copies keep their original answer keys.'))}</p>`,`${r.corrected?button(tr('Undo correction'),'undoWrittenReview','secondary'):''}${modalButtons(tr('Mark correct'))}`,async values=>applyWrittenReview(source,true,values.has('remember')));
 modal.writtenReviewSource=source;
}
