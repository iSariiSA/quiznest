// Preserve source math/Markdown and readable HTML when pasting into another app.
function questionClipboard(q){
  let hasImages=false;
  const imageNote=alt=>{hasImages=true;return `[Image: ${alt||'diagram'} — attach the image separately]`;};
  function field(source){
    if(q.format==='markdown')return String(source).replace(/!\[([^\]]*)\]\((?:[^()\n]|\([^()\n]*\))*\)/g,(_match,alt)=>imageNote(alt));
    if(q.format!=='html')return String(source);
    const template=document.createElement('template');template.innerHTML=content.render(source,'html');
    for(const image of template.content.querySelectorAll('img'))image.replaceWith(document.createTextNode(imageNote(image.getAttribute('alt'))));
    const walk=node=>{if(node.nodeType===Node.TEXT_NODE)return node.textContent;if(node.nodeType!==Node.ELEMENT_NODE&&node.nodeType!==Node.DOCUMENT_FRAGMENT_NODE)return '';const tag=node.localName;if(tag==='br')return '\n';const text=[...node.childNodes].map(walk).join('');return ['p','div','pre','blockquote','li','h1','h2','h3','h4','h5','h6','tr'].includes(tag)?`\n${text}\n`:['td','th'].includes(tag)?text+'\t':text;};
    return walk(template.content).replace(/\n{3,}/g,'\n\n').trim();
  }
  const pieces=[field(q.prompt)];
  if(q.image)pieces.push(imageNote(q.imageAlt));
  if(q.code){const fence='`'.repeat(Math.max(3,...(q.code.match(/`+/g)||[]).map(run=>run.length+1)));pieces.push(`${fence}${q.codeLanguage||''}\n${q.code}\n${fence}`);}
  pieces.push(questionModel.typeOf(q).instruction);
  pieces.push(q.options.map((option,i)=>`${optionLabel(i)}. ${field(option)}`).join('\n\n'));
  return {text:pieces.join('\n\n'),hasImages};
}
function copyQuestionButton(attrs='',q){return `<div class="question-actions">${button('Copy question','copyQuestion','text',attrs)}${q?savedQuestionButton(attrs,q):''}</div>`;}
function questionFromButton(button){
  const source=button.dataset.copySource;let q;
  if(source==='quiz'){const s=data.activeSession;q=sessionQuiz()?.questions.find(q=>q.id===s?.questionIds[s.position]);}
  else if(source==='result')q=data.attempts.find(a=>a.id===button.dataset.attempt)?.questions[Number(button.dataset.index)];
  else if(source==='daily')q=window.QuiznetDailyReview.current(data)?.question;
  else if(source==='notebook')q=notebookState.items.find(e=>e.key===button.dataset.key)?.question;
  else if(source==='mistake')q=notebookState.session?.item.question;
  else if(source==='saved')q=savedQuestionsState.items.find(e=>e.key===button.dataset.key)?.question;
  else if(source==='savedPractice')q=savedPracticeItem()?.question;
  return q;
}
function questionSourceFrom(button){
  const source=button.dataset.copySource;
  if(source==='quiz')return {source,questionId:questionFromButton(button)?.id};
  if(source==='result')return {source,attemptId:button.dataset.attempt,questionIndex:Number(button.dataset.index)};
  if(source==='daily')return {source,token:data.dailyReview?.active?.token,questionId:questionFromButton(button)?.id};
  if(source==='mistake')return {source,token:data.mistakeNotebook?.session?.token};
  if(source==='savedPractice')return {source,token:data.savedQuestions?.session?.token};
  return {source,key:button.dataset.key};
}
async function copyQuestionFrom(button){
  const q=questionFromButton(button);
  if(!q)throw new Error('Open the question again before copying.');
  const copied=questionClipboard(q);await api.copyQuestion(copied.text);
  toast(copied.hasImages?'Question and choices copied. Attach any diagrams separately in your chat.':'Question and choices copied. Paste them into your chat.');
}
