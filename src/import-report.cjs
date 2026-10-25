const {createHash}=require('node:crypto');
const questions=require('./ui/question-types.js'),brief=require('./ui/instructions.js');
function fingerprint(q){
  // IDs and answer-set order do not change question content.
  return createHash('sha256').update(JSON.stringify([q.type||'single-choice',q.format||'text',q.prompt,q.options,q.correctAnswers?[...q.correctAnswers].sort((a,b)=>a-b):q.correctAnswer,q.explanation||'',q.code??null,q.codeLanguage??null,q.image??null,q.imageAlt||''])).digest('hex');
}
function importReport(packs,library,preferences){
  const expected=preferences==null?null:brief.validate(preferences),existing=new Set(),seen=new Map(),stems=new Map();
  const questionIssues=packs.map(p=>p.questions.map(()=>[]));
  const addIssue=(ref,issue)=>{const list=questionIssues[ref.packIndex][ref.questionIndex];if(!list.some(i=>i.code===issue.code))list.push(issue);};
  const normalize=value=>value.trim().replace(/\s+/gu,' ').toLowerCase();
  const placeholder=/^(?:todo|tbd|question(?:\s+\d+)?|your question(?: here)?|insert question(?: here)?|replace with (?:a |your )?question(?: here)?|option\s+[a-z0-9]+|choice\s+\d+|answer option|lorem ipsum[.!]?)$/i;
  for(const course of library.courses)for(const unit of course.units)for(const quiz of unit.quizzes)for(const q of quiz.questions)existing.add(fingerprint(q));
  const counts=Object.fromEntries(questions.types.map(t=>[t.id,0]));let total=0,repeated=0,alreadyInLibrary=0,withoutExplanation=0;
  for(const [packIndex,pack] of packs.entries())for(const [questionIndex,q] of pack.questions.entries()){
    const ref={packIndex,questionIndex},key=fingerprint(q);total++;counts[q.type||'single-choice']++;
    if(seen.has(key)){repeated++;const related=seen.get(key);addIssue(ref,{code:'repeated',related});addIssue(related,{code:'repeated',related:ref});}else seen.set(key,ref);
    if(existing.has(key)){alreadyInLibrary++;addIssue(ref,{code:'existing'});}
    if(!q.explanation?.trim()){withoutExplanation++;addIssue(ref,{code:'explanation'});}
    // These are conservative content checks, not factual or semantic grading.
    if(q.format!=='html'){
      if(new Set(q.options.map(normalize)).size!==q.options.length)addIssue(ref,{code:'similar-options'});
      if([q.prompt,...q.options].some(v=>placeholder.test(v.trim())))addIssue(ref,{code:'placeholder'});
    }
    if(q.type==='multiple-answer'&&q.correctAnswers.length===q.options.length)addIssue(ref,{code:'all-correct'});
    if(q.image&&!q.imageAlt?.trim())addIssue(ref,{code:'image-description'});
    const stem=createHash('sha256').update(JSON.stringify([q.type||'single-choice',q.format||'text',q.prompt,q.options,q.code??null,q.codeLanguage??null,q.image??null,q.imageAlt||''])).digest('hex');
    const answer=JSON.stringify(questions.correctIndices(q).slice().sort((a,b)=>a-b));
    if(!stems.has(stem))stems.set(stem,[]);
    const answers=stems.get(stem),different=answers.find(a=>a.answer!==answer);
    if(different){addIssue(ref,{code:'conflicting-answer',related:different.ref});addIssue(different.ref,{code:'conflicting-answer',related:ref});}
    // Two distinct keys suffice to find a conflicting reference for any later key.
    if(answers.length<2&&!answers.some(a=>a.answer===answer))answers.push({answer,ref});
  }
  const warnings=[];
  if(repeated)warnings.push(`${repeated} repeated question${repeated===1?'':'s'} with identical content in this file.`);
  if(alreadyInLibrary)warnings.push(`${alreadyInLibrary} question${alreadyInLibrary===1?'':'s'} match content already in your library.`);
  if(withoutExplanation)warnings.push(`${withoutExplanation} question${withoutExplanation===1?' has':'s have'} no explanation.`);
  const countIssue=code=>questionIssues.reduce((n,pack)=>n+pack.filter(list=>list.some(i=>i.code===code)).length,0);
  for(const [code,message] of [['conflicting-answer','have matching question content but different answer keys'],['similar-options','have choices that differ only in letter case or spacing'],['placeholder','contain possible unfinished placeholders'],['all-correct','have an answer-key selection worth reviewing'],['image-description','include an image without a description']]){
    const count=countIssue(code);if(count)warnings.push(`${count} question${count===1?'':'s'} ${count===1?message.replace(/^have /,'has ').replace(/^contain /,'contains ').replace(/^mark /,'marks ').replace(/^include /,'includes '):message}.`);
  }
  if(expected){
    if(packs.length!==1)warnings.push('The brief requests one quiz; this file contains multiple quizzes.');
    if(expected.count.mode==='value'&&total!==expected.count.value)warnings.push(`The brief requests ${expected.count.value} questions; the file contains ${total}.`);
    if(expected.types.mode==='value')for(const pref of expected.types.value){const actual=counts[pref.type],label=questions.types.find(t=>t.id===pref.type).label;if(pref.mode==='value'&&actual!==pref.value)warnings.push(`${label}: the brief requests ${pref.value}; the file contains ${actual}.`);else if(pref.mode==='omit'&&actual)warnings.push(`${label} is excluded in the brief, but the file contains ${actual}.`);else if(['auto','ask'].includes(pref.mode)&&actual===0)warnings.push(`${label} is included in the brief, but is missing from the file.`);}
  }
  const reviewIndices=questionIssues.map(pack=>pack.flatMap((list,index)=>list.length?[index]:[]));
  return {total,counts,repeated,alreadyInLibrary,withoutExplanation,comparedWithBrief:!!expected,warnings,questionIssues,reviewIndices,flagged:reviewIndices.reduce((n,list)=>n+list.length,0)};
}
function importQuestion(item,packIndex,questionIndex){
  if(item?.type!=='import')throw new Error('Choose the import file again.');
  if(!Number.isInteger(packIndex)||!Number.isInteger(questionIndex)||packIndex<0||questionIndex<0||packIndex>=item.packs.length||questionIndex>=item.packs[packIndex].questions.length)throw new Error('Choose a question from this import.');
  return {question:structuredClone(item.packs[packIndex].questions[questionIndex]),issues:structuredClone(item.report.questionIssues[packIndex][questionIndex])};
}
module.exports={importReport,fingerprint,importQuestion};
