/* Optional per-attempt presentation and feedback choices; legacy attempts use these defaults. */
(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./question-types.js'):root.QuiznetQuestions);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.QuiznetPractice=api;
})(globalThis,questions=>{
  const defaults=Object.freeze({showTotalTimer:true,showQuestionTimer:false,feedback:'review',showNavigator:true,showProgress:true,allowFlags:true});
  const displays=[['showTotalTimer','Show total timer'],['showQuestionTimer','Show question timer'],['showNavigator','Question squares'],['showProgress','Progress bar'],['allowFlags','Flag for review']];
  const builtins=[{id:'test',name:'Test yourself',options:{...defaults},shuffle:false},{id:'practice',name:'Practice',options:{...defaults,feedback:'instant',showTotalTimer:false},shuffle:false}];
  function validate(value){
    if(!value||typeof value!=='object'||Array.isArray(value)||typeof value.showTotalTimer!=='boolean'||typeof value.showQuestionTimer!=='boolean'||!['review','instant'].includes(value.feedback))throw new Error('Choose valid quiz practice options.');
    const result={showTotalTimer:value.showTotalTimer,showQuestionTimer:value.showQuestionTimer,feedback:value.feedback};
    for(const key of ['showNavigator','showProgress','allowFlags'])if(value[key]!==undefined){if(typeof value[key]!=='boolean')throw new Error('Choose valid quiz display options.');result[key]=value[key];}
    return result;
  }
  function validatePresets(value){
    if(!Array.isArray(value)||value.length>50)throw new Error('Save up to 50 practice presets.');
    const ids=new Set(),names=new Set(builtins.map(p=>p.name.toLowerCase()));
    return value.map(p=>{
      if(!p||typeof p.id!=='string'||!p.id||builtins.some(b=>b.id===p.id)||p.id==='custom'||ids.has(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>60||names.has(p.name.trim().toLowerCase())||typeof p.shuffle!=='boolean')throw new Error('Use a unique preset name (up to 60 characters).');
      ids.add(p.id);names.add(p.name.trim().toLowerCase());return {id:p.id,name:p.name.trim(),options:validate(p.options),shuffle:p.shuffle};
    });
  }
  const missed=attempt=>attempt.questions.filter((q,i)=>!questions.isCorrect(q,attempt.answers[i]));
  const missedTitle=title=>`${title.slice(0,180)} · Missed questions`;
  function sessionQuiz(data,s){
    if(!s)return undefined;
    if(s.sourceAttemptId!==undefined){const a=data.attempts.find(a=>a.id===s.sourceAttemptId&&a.quizId===s.quizId);return a?{id:a.quizId,title:missedTitle(a.title),questions:missed(a)}:undefined;}
    for(const c of data.courses)for(const u of c.units){const q=u.quizzes.find(q=>q.id===s.quizId);if(q)return q;}
  }
  const answered=(session,q)=>session.practice?.feedback==='instant'?session.checkedQuestionIds.includes(q.id):questions.validAnswer(q,session.answers[q.id]);
  return {defaults,displays,builtins,validate,validatePresets,missed,missedTitle,sessionQuiz,answered};
});
