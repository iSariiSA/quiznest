const test=require('node:test'),assert=require('node:assert/strict');
const markdown=require('markdown-it')({html:false}),math=require('../src/ui/math.js');
const core=require('../src/core.cjs');
math.install(markdown);
function parse(source){const env={};const html=markdown.render(source,env);return {html,expressions:env.quiznetMath||[]};}
test('Markdown preserves fractions, matrices, integrals and all supported math delimiters before escaping',()=>{
  for(const source of [String.raw`A $\frac{1}{2}$ value.`,String.raw`A \(\frac{1}{2}\) value.`,String.raw`$$\frac{1}{2}$$`,String.raw`\[\frac{1}{2}\]`])assert.equal(parse(source).expressions[0].source,String.raw`\frac{1}{2}`);
  const matrix=String.raw`\begin{bmatrix}1 & 2 \\ 3 & 4\end{bmatrix}`;
  assert.deepEqual(parse('$$\n'+matrix+'\n$$').expressions,[{source:matrix,display:true}]);
  assert.deepEqual(parse('```math\n'+matrix+'\n```').expressions,[{source:matrix,display:true}]);
  const integral=String.raw`\int_0^1 x^2\,dx`;
  assert.ok(math.render(integral,true).includes('class="katex"'));
  assert.ok(math.render(matrix,true).includes('<mtable'));
  assert.equal(parse('Before\n\n$$\nx^2\n$$\n\nAfter').expressions.length,1);
  assert.equal(parse('> $$\n> x^2\n> $$').expressions.length,1);
});
test('ordinary text, currency, escaped dollars and code retain their meaning',()=>{
  for(const source of ['Prices are $5 and $10.',String.raw`Escaped \$x\$`, '`$x^2$`', '```python\nprint("$x^2$")\n```','    $x^2$','Unclosed $x and text.'])assert.equal(parse(source).expressions.length,0,source);
  assert.equal(parse('`literal $x$` and $y$').expressions[0].source,'y');
  assert.ok(parse('<span data-quiznet-math="0">fake</span>').html.includes('&lt;span'));
});
test('malformed, oversized and recursive math falls back to escaped readable source',()=>{
  for(const source of [String.raw`\frac{1}{`,String.raw`\def\a{\a}\a`,'x'.repeat(math.MAX_LENGTH+1)])assert.ok(math.render(source).includes('Check formula'));
  const malicious=String.raw`\unknown{<img src=x onerror="alert(1)">}`;
  assert.ok(math.render(malicious).includes('&lt;img'));assert.ok(!math.render(malicious).includes('<img'));
  assert.ok(math.render(String.raw`\gdef\own{123}\own`).includes('class="katex"'));
  assert.ok(math.render(String.raw`\own`).includes('Check formula'));
});
test('formula count, total source, dimensions and macro expansion have bounded rendering',()=>{
  const many=parse('$x$ '.repeat(math.MAX_EXPRESSIONS+1));assert.equal(many.expressions.length,math.MAX_EXPRESSIONS);assert.ok(many.html.includes('Formula display limit reached'));
  const long=parse(('$'+'x'.repeat(3500)+'$\n\n').repeat(6));assert.ok(long.expressions.reduce((n,e)=>n+e.source.length,0)<=math.MAX_TOTAL_LENGTH);assert.ok(long.html.includes('Formula display limit reached'));
  assert.doesNotMatch(math.render(String.raw`\rule{999999em}{999999em}`),/style="[^"]*999999/);
  assert.ok(!math.render(String.raw`\includegraphics{https://example.com/tracker.png}`).includes('<img'));
  assert.doesNotMatch(math.render(String.raw`\href{javascript:alert(1)}{click}`),/<a(?:\s|>)/);
});
test('large malformed delimiter sequences retain readable content without repeated whole-field scans',()=>{
  const open=String.raw`\[`+'\n',source=open.repeat(12000)+String.raw`\] extra`;
  assert.equal(parse(source).expressions.length,0);
  const closed=parse(open.repeat(12000)+String.raw`\]`);assert.equal(closed.expressions.length,0);assert.ok(closed.html.includes('Formula display limit reached'));
  assert.equal(parse(String.raw`\( `.repeat(25000)).expressions.length,0);
});
test('math and embedded diagram imports keep their source through exports, attempts and backup validation',()=>{
  const pack=require('../examples/math-diagrams.json'),data=core.emptyLibrary();
  core.importPacks(data,core.parseImport(JSON.stringify(pack)));const quiz=data.courses[0].units[0].quizzes[0];
  const exported=core.parseImport(core.exportQuiz(core.findQuiz(data,quiz.id)))[0];
  for(const [i,q] of quiz.questions.entries()){assert.equal(exported.questions[i].prompt,q.prompt);assert.deepEqual(exported.questions[i].options,q.options);assert.equal(exported.questions[i].explanation,q.explanation);assert.equal(exported.questions[i].image,q.image);}
  core.mutate(data,{type:'start',quizId:quiz.id});
  for(const q of quiz.questions)core.mutate(data,{type:'answer',questionId:q.id,answer:q.correctAnswer});
  core.mutate(data,{type:'finish'});
  const restored=core.validateLibrary(JSON.parse(JSON.stringify(data)));assert.equal(restored.attempts[0].questions[0].image,pack.questions[0].image);assert.deepEqual(restored.attempts[0].questions.map(q=>q.prompt),quiz.questions.map(q=>q.prompt));
});
