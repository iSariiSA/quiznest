// Shared content identity for saved questions. IDs describe a source location;
// the remaining normalized fields describe the version the learner saved.
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.QuiznetQuestionIdentity=api;
})(globalThis,()=>({
  signature:q=>JSON.stringify(Object.fromEntries(Object.entries({...q,type:q.type??'single-choice',format:q.format??'text'}).filter(([key])=>key!=='id').sort(([a],[b])=>a.localeCompare(b))))
}));
