// Shared question behavior for the main process and the offline renderer.
// IDs are storage contracts; display text and default content can be translated separately.
(function (root, factory) {
  const model = factory();
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.QuiznetQuestions = model;
})(globalThis, () => {
  const choiceLimits = { minOptions: 2, maxOptions: 100 };
  const responseLimits=Object.freeze({maxWrittenLength:2000,maxAcceptedAnswers:20,maxPairs:20,maxPairLength:1000});
  const types = [
    { id: 'single-choice', label: 'Single answer', instruction: 'Choose one answer.', selection: 'single', ...choiceLimits },
    { id: 'multiple-answer', label: 'Multiple answers', instruction: 'Choose all correct answers. All correct choices and no others are required.', selection: 'multiple', ...choiceLimits },
    { id: 'true-false', label: 'True / false', instruction: 'Choose one answer.', selection: 'single', defaultOptions: ['True', 'False'], minOptions: 2, maxOptions: 2 },
    { id: 'written-answer', label: 'Written answer', instruction: 'Write your answer, then check it.', selection: 'text' },
    { id: 'matching', label: 'Matching', instruction: 'Match each item with one answer. Use every answer once.', selection: 'matching' }
  ].map(type => Object.freeze(type));
  Object.freeze(types);
  function typeOf(q) {
    const type = types.find(type => type.id === (q.type ?? 'single-choice'));
    if (!type) throw new Error('Unsupported question type.');
    return type;
  }
  function optionLabel(index) {
    let label = '';
    for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) label = String.fromCharCode(65 + (n - 1) % 26) + label;
    return label;
  }
  const isChoice=q=>['single','multiple'].includes(typeOf(q).selection);
  const normalizeWritten=(value,caseSensitive=false)=>{const normalized=value.normalize('NFKC').trim().replace(/\s+/gu,' ');return caseSensitive?normalized:normalized.toLowerCase();};
  function correctIndices(q) { const selection=typeOf(q).selection;return selection==='multiple'?q.correctAnswers:selection==='single'?[q.correctAnswer]:selection==='matching'?q.pairs.map((_,i)=>i):[]; }
  function selectedIndices(q, answer) { const selection=typeOf(q).selection;return selection==='text'?[]:selection==='multiple'||selection==='matching'?(Array.isArray(answer)?answer.filter(Number.isInteger):[]):(Number.isInteger(answer)?[answer]:[]); }
  const correctValue=q=>typeOf(q).selection==='text'?q.acceptedAnswers[0]:typeOf(q).selection==='single'?q.correctAnswer:[...correctIndices(q)];
  const answerFields=q=>isChoice(q)?q.options:typeOf(q).selection==='matching'?q.pairs.flatMap(pair=>[pair.left,pair.right]):[];
  const answerKey=q=>typeOf(q).selection==='text'?{acceptedAnswers:q.acceptedAnswers.map(value=>normalizeWritten(value,q.caseSensitive)).sort(),caseSensitive:q.caseSensitive===true}:typeOf(q).selection==='multiple'?[...correctIndices(q)].sort((a,b)=>a-b):correctIndices(q);
  function matchingOrder(q){
    if(typeOf(q).selection!=='matching')return [];
    let seed=2166136261;for(const char of q.id||JSON.stringify(q.pairs)){seed=Math.imul(seed^char.charCodeAt(0),16777619)>>>0;}
    const order=q.pairs.map((_,i)=>i);
    // Sattolo's shuffle has no fixed positions, while a stable seed keeps the
    // right column unchanged during typing, resizing, recovery and copying.
    for(let i=order.length-1;i>0;i--){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;const j=(seed>>>0)%i;[order[i],order[j]]=[order[j],order[i]];}
    return order;
  }
  function validAnswer(q, answer, allowEmpty = false) {
    const selection=typeOf(q).selection;
    if(selection==='text')return typeof answer==='string'&&answer.length<=responseLimits.maxWrittenLength&&(allowEmpty||Boolean(normalizeWritten(answer,q.caseSensitive)));
    if(selection==='matching'){
      if(!Array.isArray(answer)||answer.length!==q.pairs.length)return false;
      const values=Array.from(answer),chosen=values.filter(value=>value!==null);
      return (allowEmpty||chosen.length===values.length)&&new Set(chosen).size===chosen.length&&values.every(value=>allowEmpty&&value===null||Number.isInteger(value)&&value>=0&&value<q.pairs.length);
    }
    const multiple = selection === 'multiple';
    if (multiple ? !Array.isArray(answer) : !Number.isInteger(answer)) return false;
    const values = multiple ? Array.from(answer) : [answer];
    return (values.length > 0 || (multiple && allowEmpty)) && new Set(values).size === values.length && values.every(i => Number.isInteger(i) && i >= 0 && i < q.options.length);
  }
  function isCorrect(q, answer) {
    if (!validAnswer(q, answer)) return false;
    const selection=typeOf(q).selection;
    if(selection==='text')return q.acceptedAnswers.some(value=>normalizeWritten(value,q.caseSensitive)===normalizeWritten(answer,q.caseSensitive));
    if(selection==='matching')return answer.every((value,index)=>value===index);
    const selected = selectedIndices(q, answer), correct = correctIndices(q);
    return selected.length === correct.length && correct.every(i => selected.includes(i));
  }
  function toggleAnswer(q, answer, index) {
    if(!isChoice(q))throw new Error('Use a response field for this question.');
    if (typeOf(q).selection !== 'multiple') return index;
    const selected = selectedIndices(q, answer);
    return (selected.includes(index) ? selected.filter(i => i !== index) : [...selected, index]).sort((a, b) => a - b);
  }
  function blankQuestion(typeId = types[0].id) {
    const type = typeOf({ type: typeId });
    if(type.selection==='text')return {type:type.id,prompt:'',acceptedAnswers:[''],caseSensitive:false,explanation:''};
    if(type.selection==='matching')return {type:type.id,prompt:'',pairs:[{left:'',right:''},{left:'',right:''}],explanation:''};
    return { type: type.id, prompt: '', options: type.defaultOptions ? [...type.defaultOptions] : Array(type.minOptions).fill(''), ...(type.selection === 'multiple' ? { correctAnswers: [] } : { correctAnswer: 0 }), explanation: '' };
  }
  return { types, typeOf, isChoice, normalizeWritten, responseLimits, answerFields, answerKey, correctValue, matchingOrder, optionLabel, correctIndices, selectedIndices, validAnswer, isCorrect, toggleAnswer, blankQuestion };
});
