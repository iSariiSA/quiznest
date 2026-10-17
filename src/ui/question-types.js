// Shared question behavior for the main process and the offline renderer.
// IDs are storage contracts; display text and default content can be translated separately.
(function (root, factory) {
  const model = factory();
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.QuiznetQuestions = model;
})(globalThis, () => {
  const choiceLimits = { minOptions: 2, maxOptions: 100 };
  const types = [
    { id: 'single-choice', label: 'Single answer', instruction: 'Choose one answer.', selection: 'single', ...choiceLimits },
    { id: 'multiple-answer', label: 'Multiple answers', instruction: 'Choose all correct answers. All correct choices and no others are required.', selection: 'multiple', ...choiceLimits },
    { id: 'true-false', label: 'True / false', instruction: 'Choose one answer.', selection: 'single', defaultOptions: ['True', 'False'], minOptions: 2, maxOptions: 2 }
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
  function correctIndices(q) { return typeOf(q).selection === 'multiple' ? q.correctAnswers : [q.correctAnswer]; }
  function selectedIndices(q, answer) { return typeOf(q).selection === 'multiple' ? (Array.isArray(answer) ? answer : []) : (Number.isInteger(answer) ? [answer] : []); }
  function validAnswer(q, answer, allowEmpty = false) {
    const multiple = typeOf(q).selection === 'multiple';
    if (multiple ? !Array.isArray(answer) : !Number.isInteger(answer)) return false;
    const values = multiple ? Array.from(answer) : [answer];
    return (values.length > 0 || (multiple && allowEmpty)) && new Set(values).size === values.length && values.every(i => Number.isInteger(i) && i >= 0 && i < q.options.length);
  }
  function isCorrect(q, answer) {
    if (!validAnswer(q, answer)) return false;
    const selected = selectedIndices(q, answer), correct = correctIndices(q);
    return selected.length === correct.length && correct.every(i => selected.includes(i));
  }
  function toggleAnswer(q, answer, index) {
    if (typeOf(q).selection !== 'multiple') return index;
    const selected = selectedIndices(q, answer);
    return (selected.includes(index) ? selected.filter(i => i !== index) : [...selected, index]).sort((a, b) => a - b);
  }
  function blankQuestion(typeId = types[0].id) {
    const type = typeOf({ type: typeId });
    return { type: type.id, prompt: '', options: type.defaultOptions ? [...type.defaultOptions] : Array(type.minOptions).fill(''), ...(type.selection === 'multiple' ? { correctAnswers: [] } : { correctAnswer: 0 }), explanation: '' };
  }
  return { types, typeOf, optionLabel, correctIndices, selectedIndices, validAnswer, isCorrect, toggleAnswer, blankQuestion };
});
