// Explicit self-grading is separate from automatic answer matching and question identity.
(function(root,factory){
 const api=factory(typeof module==='object'&&module.exports?require('./question-types.js'):root.QuiznetQuestions,typeof module==='object'&&module.exports?require('./practice.js'):root.QuiznetPractice,typeof module==='object'&&module.exports?require('./question-identity.js'):root.QuiznetQuestionIdentity);
 if(typeof module==='object'&&module.exports)module.exports=api;else root.QuiznetWrittenReview=api;
})(globalThis,(questions,practice,identity)=>{
 const fail=()=>{throw new Error('Check this written answer before reviewing it.');};
 function resolve(data,source){
  if(!source||typeof source!=='object'||Array.isArray(source))return fail();let state,q,answer,index,quizId,checked;
  if(source.source==='quiz'){
   state=data.activeSession;index=state?.position;const id=state?.questionIds[index];q=practice.sessionQuiz(data,state)?.questions.find(q=>q.id===id);
   if(!q||id!==source.questionId)return fail();answer=state.answers[id];checked=state.practice?.feedback==='instant'&&state.checkedQuestionIds?.includes(id);quizId=state.quizId;
  }else if(source.source==='result'){
   state=data.attempts.find(a=>a.id===source.attemptId);index=source.index;
   if(!state||!Number.isInteger(index)||index<0||index>=state.questions.length)return fail();q=state.questions[index];answer=state.answers[index];checked=true;quizId=state.quizId;
  }else if(source.source==='daily'){
   state=data.dailyReview?.active;quizId=state?.quizId;
   for(const c of data.courses)for(const u of c.units)for(const quiz of u.quizzes)if(quiz.id===quizId)q=quiz.questions.find(q=>q.id===state.questionId);
  }else if(source.source==='saved'){
   state=data.savedQuestions?.session;const item=data.savedQuestions?.items.find(item=>item.key===state?.keys[state.position]);q=item?.question;quizId=item?.origin?.quizId;
  }else if(source.source==='mistake'){
   state=data.mistakeNotebook?.session;q=data.mistakeNotebook?.entries.find(item=>item.key===state?.keys[state.position])?.question;
  }else return fail();
  if(['daily','saved','mistake'].includes(source.source)){if(!state||state.token!==source.token)return fail();answer=state.answer;checked=state.checked;}
  if(!q||questions.typeOf(q).id!=='written-answer'||!checked||!questions.validAnswer(q,answer))return fail();
  const corrected=index===undefined?state.selfCorrected===true:state.selfCorrectedIndices?.includes(index)===true;
  return {q,answer,state,index,quizId,corrected,source:source.source};
 }
 function original(data,review){
  const signature=identity.signature(review.q),matches=[];
  for(const c of data.courses)for(const u of c.units)for(const quiz of u.quizzes){if(review.quizId&&quiz.id!==review.quizId)continue;for(const q of quiz.questions)if(identity.signature(q)===signature)matches.push(q);}
  const sameId=matches.filter(q=>q.id===review.q.id);return sameId.length===1?sameId[0]:matches.length===1?matches[0]:null;
 }
 function mutate(data,action){
  if(typeof action.correct!=='boolean'||typeof action.remember!=='boolean'||action.remember&&!action.correct)throw new Error('Choose a valid written-answer review.');
  const r=resolve(data,action.source);
  if(r.source==='result'&&data.activeSession?.sourceAttemptId===r.state.id)throw new Error('Finish or discard the missed-question attempt before changing this result.');
  const live=action.remember?original(data,r):null;
  if(action.remember&&!live)throw new Error('The original question is unavailable or has changed. Mark this response correct without saving an accepted answer.');
  const addAnswer=live&&!questions.isCorrect(live,r.answer);
  if(addAnswer&&live.acceptedAnswers.length>=questions.responseLimits.maxAcceptedAnswers)throw new Error('This question already has 20 accepted answers. Edit its accepted answers before adding another.');
  const beforeQuestion=structuredClone(r.q),wasCorrect=questions.reviewedCorrect(r.q,r.answer,r.corrected);
  if(addAnswer)live.acceptedAnswers.push(r.answer.trim());
  if(r.index===undefined){if(action.correct)r.state.selfCorrected=true;else delete r.state.selfCorrected;}
  else{const indices=new Set(r.state.selfCorrectedIndices||[]);if(action.correct)indices.add(r.index);else indices.delete(r.index);if(indices.size)r.state.selfCorrectedIndices=[...indices].sort((a,b)=>a-b);else delete r.state.selfCorrectedIndices;}
  if(r.source==='result')r.state.score=r.state.questions.filter((q,i)=>questions.resultCorrect(r.state,i)).length;
  return {...r,beforeQuestion,wasCorrect,correct:questions.reviewedCorrect(r.q,r.answer,action.correct)};
 }
 return {resolve,original,mutate};
});
