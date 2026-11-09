(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.QuiznetCourseFocus=api;})(globalThis,()=>{
  const choices=Object.freeze([
    {id:'long-term',label:'Long-term focus',description:'Something I want to keep learning and building on.'},
    {id:'for-now',label:'For now',description:'Important to finish now, such as a required university course.'},
    {id:'low',label:'Low priority',description:'Something I want to put aside for now.'},
    {id:'unset',label:'Not set',description:'I have not decided yet.'}
  ].map(Object.freeze));
  function validate(value){if(!choices.some(c=>c.id===value))throw new Error('Choose a valid course study focus.');return value;}
  const of=course=>choices.find(c=>c.id===(course?.studyFocus||'unset'))||choices[3];
  return {choices,validate,of};
});
