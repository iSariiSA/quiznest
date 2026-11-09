// Response controls share the question model with scoring. These functions only
// render or compose answers; the owning study workflow persists each change.
function responseControlAttributes(q,context,kind,disabled){return `data-response-context="${esc(context)}" data-response-kind="${kind}" data-response-question="${esc(q.id)}" ${disabled?'disabled':''}`;}
function responseControls(q,answer,{context='quiz',disabled=false}={}){
 const type=questionModel.typeOf(q);
 if(type.id==='written-answer')return `<div class="written-answer-control response-controls" data-response-root="${esc(context)}"><label><span>${esc(tr('Your answer'))}</span><textarea class="written-answer-input" rows="3" maxlength="2000" autocomplete="off" spellcheck="false" dir="auto" placeholder="${esc(tr('Type your answer'))}" ${responseControlAttributes(q,context,'written',disabled)}>${esc(typeof answer==='string'?answer:'')}</textarea></label><p class="response-hint muted">${esc(q.caseSensitive?tr('Use the expected words. Letter case matters.'):tr('Use the expected words. Extra spaces and letter case are ignored.'))}</p><p class="response-save-state" data-response-save-state role="status" aria-live="polite"></p></div>`;
 if(type.id!=='matching')return '';
 const values=Array.isArray(answer)?answer:[],order=questionModel.matchingOrder(q),done=values.filter(value=>Number.isInteger(value)&&value>=0&&value<q.pairs.length).length;
 return `<div class="matching-controls response-controls" data-response-root="${esc(context)}" role="group" aria-label="${esc(tr('Match the pairs'))}"><div class="matching-heading"><span>${esc(tr('Choose a match for each item. Each answer is used once.'))}</span><span class="matching-progress" role="status">${esc(tr('{value0} of {value1} matched',{value0:done,value1:q.pairs.length}))}</span></div><div class="matching-rows">${q.pairs.map((pair,row)=>`<label class="matching-row ${Number.isInteger(values[row])?'has-match':''}"><span class="matching-item"><span class="matching-number" aria-hidden="true">${row+1}</span><span dir="auto">${esc(pair.left)}</span></span><span class="matching-connector" aria-hidden="true">↔</span><select aria-label="${esc(tr('Match for {value0}',{value0:pair.left}))}" data-response-row="${row}" ${responseControlAttributes(q,context,'matching',disabled)}><option value="">${esc(tr('Choose a match…'))}</option>${order.map((right,index)=>`<option value="${right}" ${values[row]===right?'selected':''}>${optionLabel(index)}. ${esc(q.pairs[right].right)}</option>`).join('')}</select></label>`).join('')}</div><p class="response-save-state" data-response-save-state role="status" aria-live="polite"></p></div>`;
}
function responseValue(q,answer,control){
 if(questionModel.typeOf(q).id==='written-answer')return String(control.value).slice(0,2000);
 const values=Array.from({length:q.pairs.length},(_,index)=>Array.isArray(answer)&&Number.isInteger(answer[index])?answer[index]:null),row=Number(control.dataset.responseRow),value=control.value===''?null:Number(control.value);
 if(!Number.isInteger(row)||row<0||row>=values.length||value!==null&&(!Number.isInteger(value)||value<0||value>=values.length))throw new Error(tr('Choose a valid match.'));
 if(value!==null)for(let index=0;index<values.length;index++)if(index!==row&&values[index]===value)values[index]=null;
 values[row]=value;return values;
}
function responseContent(q,answer){
 const type=questionModel.typeOf(q);
 if(type.id==='written-answer')return `<p class="written-response text-content" dir="auto">${esc(typeof answer==='string'&&answer.trim()?answer:tr('No answer'))}</p>`;
 if(type.id==='matching')return `<dl class="matching-solution">${q.pairs.map((pair,index)=>{const right=Array.isArray(answer)&&Number.isInteger(answer[index])?q.pairs[answer[index]]?.right:null;return `<div><dt dir="auto">${esc(pair.left)}</dt><dd><span class="matching-connector" aria-hidden="true">↔</span><span dir="auto" class="${right===null?'muted':''}">${esc(right??tr('Not matched'))}</span></dd></div>`;}).join('')}</dl>`;
 return questionModel.selectedIndices(q,answer).map(index=>rich(q.options[index],q)).join('');
}
function responseCorrectContent(q){
 if(questionModel.typeOf(q).id!=='written-answer')return responseContent(q,questionModel.correctValue(q));
 return `<div class="written-solution">${q.acceptedAnswers.map(answer=>`<p class="written-response text-content" dir="auto">${esc(answer)}</p>`).join('')}</div>${q.acceptedAnswers.length>1?`<p class="response-hint muted">${esc(tr('Any listed answer is accepted.'))}</p>`:''}`;
}
// Read-only browsing must show the task, never a written answer key or paired
// answer rows. Matching banks use the same stable shuffle as live controls/copy.
function questionChoicesContent(q){
 const type=questionModel.typeOf(q);
 if(type.id==='written-answer')return `<p class="response-type-hint muted">${esc(tr('Written answer — type a short answer when you practise.'))}</p>`;
 if(type.id==='matching')return `<div class="matching-reference"><section><h3>${esc(tr('Items'))}</h3><ol>${q.pairs.map(pair=>`<li dir="auto">${esc(pair.left)}</li>`).join('')}</ol></section><section><h3>${esc(tr('Matches'))}</h3><ol type="A">${questionModel.matchingOrder(q).map(index=>`<li dir="auto">${esc(q.pairs[index].right)}</li>`).join('')}</ol></section></div>`;
 return q.options.map((option,index)=>`<div><span class="option-letter">${optionLabel(index)}</span>${rich(option,q)}</div>`).join('');
}
