const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const appearance=require('../src/ui/quiz-appearance.js'),{DisplayPreferences,validate}=require('../src/display-preferences.cjs');
async function profile(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'quiznet-quiz-look-'));t.after(async()=>{if(!path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep)||!path.basename(dir).startsWith('quiznet-quiz-look-'))throw new Error('Unexpected test profile');await fs.rm(dir,{recursive:true,force:true});});return dir;}
test('legacy preferences acquire unchanged quiz/editor defaults, and reject unsupported styling input',()=>{
 const old={version:1,libraryView:'names',rememberView:true,interfaceScale:115};assert.deepEqual(validate(old).quizAppearance,appearance.defaults());
 for(const raw of [null,[],{questionSize:999},{questionSize:'30'},{readingFont:'url(x)'},{markerShape:'triangle'},{markerSize:-1},{editorBackground:'red'},{questionColor:'#fff'},{questionColor:'url(https://example.com)'},{codeWrap:1},{codeFont:'script'},{css:'body{display:none}'},JSON.parse('{"__proto__":{"polluted":true}}')])assert.throws(()=>appearance.validate(raw));
 const next=appearance.validate({questionColor:'#Aa33Ff',editorSize:20,markerShape:'circle',codeWrap:true});assert.equal(next.questionColor,'#Aa33Ff');assert.equal(next.answerSize,0);
});
test('large text and group reset retain unrelated choices and emit only bounded local CSS values',()=>{
 const selected=appearance.validate({questionColor:'#123456',editorColor:'#abcdef',markerShape:'circle'}),large=appearance.validate({...selected,...appearance.preset('large')});assert.equal(large.questionColor,selected.questionColor);assert.equal(large.markerShape,'circle');assert.equal(large.questionSize,34);
 const reset={...large};for(const key of appearance.groups.markers)reset[key]=appearance.defaults()[key];assert.equal(appearance.validate(reset).markerShape,'app');assert.equal(reset.editorColor,'#abcdef');
 const css=appearance.variables(large);assert.equal(css['--qa-question-color'],'#123456');assert.match(css['--qa-question-size'],/34px/);assert.ok(Object.entries(css).every(([key,value])=>key.startsWith('--qa-')&&!/url\(|https:|javascript:|;|[{}]/i.test(value)));assert.equal(appearance.variables(appearance.defaults())['--qa-question-size'],undefined);assert.throws(()=>appearance.preset('remote'));
});

test('review styles add independent defaults to existing quiz preferences and reject unsupported values',()=>{
 const legacy=appearance.validate({questionSize:30,markerShape:'circle',editorSize:20});assert.equal(legacy.reviewQuestionSize,0);assert.equal(legacy.reviewFont,'app');
 const review=appearance.validate({...legacy,reviewQuestionSize:26,reviewAnswerSize:20,reviewFont:'serif',reviewLine:1.8,reviewBackground:'#203040',reviewCorners:'rounded',reviewWidth:'focused',reviewSpacing:'roomy',reviewCorrectColor:'#66bb88'});
 assert.equal(review.questionSize,30);assert.equal(review.editorSize,20);assert.equal(appearance.variables(review)['--qa-review-question-size'],'calc(26px * var(--text-factor))');assert.equal(appearance.variables(review)['--qa-review-background'],'#203040');
 for(const bad of [{reviewQuestionSize:999},{reviewLine:'1.8'},{reviewFont:'remote'},{reviewBackground:'url(x)'},{reviewCorners:'triangle'},{reviewWidth:'100vw'},{reviewSpacing:-1}])assert.throws(()=>appearance.validate(bad));
 const reset={...review};for(const key of appearance.groups.review)reset[key]=appearance.defaults()[key];assert.equal(appearance.validate(reset).questionSize,30);assert.equal(reset.markerShape,'circle');assert.equal(reset.reviewBackground,'');
});
test('quiz styling is device-only, persists through restart and rolls back a failed preference write',async t=>{
 const dir=await profile(t),prefs=new DisplayPreferences(dir),old={version:1,libraryView:'details',rememberView:true,interfaceScale:100};await fs.writeFile(prefs.file,JSON.stringify(old));const oldBytes=await fs.readFile(prefs.file,'utf8');await prefs.load();assert.equal(await fs.readFile(prefs.file,'utf8'),oldBytes);
 await prefs.change({quizAppearance:{markerShape:'circle',editorSize:24,questionColor:'#cc55aa',codeWrap:true}});const saved=await fs.readFile(prefs.file,'utf8'),again=new DisplayPreferences(dir);await again.load();assert.equal(again.state.quizAppearance.markerShape,'circle');assert.equal(again.state.libraryView,'details');assert.equal((await fs.readdir(dir)).includes('data'),false);
 await fs.mkdir(prefs.file+'.tmp');await assert.rejects(prefs.change({quizAppearance:{...prefs.state.quizAppearance,editorSize:13}}));assert.equal(prefs.state.quizAppearance.editorSize,24);assert.equal(await fs.readFile(prefs.file,'utf8'),saved);await fs.rmdir(prefs.file+'.tmp');await prefs.change({quizAppearance:appearance.defaults()});assert.deepEqual(prefs.state.quizAppearance,appearance.defaults());assert.equal(prefs.state.libraryView,'details');
});
