// A small, deterministic spaced-review scheduler. All mutations run in the main process.
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./question-types.js'));
  else root.QuiznetDailyReview=factory(root.QuiznetQuestions);
})(globalThis,questions=>{
  const MAX_CARDS=100000;
  const defaults=()=>({version:1,limit:20,quizIds:[],cards:[],days:[],active:null});
  function dayKey(now){const d=new Date(now);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function catalog(data){const all=[];for(const course of data.courses)for(const unit of course.units)for(const quiz of unit.quizzes)for(const question of quiz.questions)all.push({course,unit,quiz,question});return all;}
  function intervals(card){const n=card?.interval||0;return {again:0,hard:Math.min(365,Math.max(1,Math.ceil(n*1.2))),good:Math.min(365,Math.max(3,Math.ceil(n*2.5))),easy:Math.min(365,Math.max(7,Math.ceil(n*3.5)))};}
  function dueAt(now,days){if(!days)return now+600000;const d=new Date(now);d.setDate(d.getDate()+days);d.setHours(0,0,0,0);return d.getTime();}
  function summary(data,now=Date.now()){
    const state=data.dailyReview||defaults(),selected=new Set(state.quizIds),cards=new Map(state.cards.map(c=>[c.questionId,c]));
    const items=catalog(data).filter(item=>selected.has(item.quiz.id)),due=[],fresh=[];let nextDue=null;
    for(const item of items){const card=cards.get(item.question.id);if(!card)fresh.push(item);else if(card.due<=now)due.push({...item,due:card.due});else nextDue=nextDue===null?card.due:Math.min(nextDue,card.due);}
    due.sort((a,b)=>a.due-b.due);
    const done=state.days.find(d=>d.date===dayKey(now))?.count||0;
    return {state,done,remaining:Math.max(0,state.limit-done),due:due.length,fresh:fresh.length,total:items.length,next:due[0]||fresh[0]||null,nextDue};
  }
  function current(data){const a=data.dailyReview?.active;return a?catalog(data).find(i=>i.quiz.id===a.quizId&&i.question.id===a.questionId):null;}
  function reconcile(data){
    const s=data.dailyReview;if(!s)return;
    const all=catalog(data),ids=new Set(all.map(i=>i.question.id)),quizzes=new Set(data.courses.flatMap(c=>c.units.flatMap(u=>u.quizzes.map(q=>q.id))));
    s.quizIds=s.quizIds.filter(id=>quizzes.has(id));s.cards=s.cards.filter(c=>ids.has(c.questionId));
    if(s.active&&(!ids.has(s.active.questionId)||!s.quizIds.includes(s.active.quizId)))s.active=null;
  }
  function remapQuiz(data,previous,next){
    const s=data.dailyReview;if(!s)return;
    // The existing editor issues new question IDs on save. Match identical content
    // one-to-one so a title edit or reordering does not erase learning progress.
    const signature=q=>JSON.stringify(Object.fromEntries(Object.entries(q).filter(([key])=>key!=='id').sort(([a],[b])=>a.localeCompare(b))));
    const buckets=new Map();for(const q of next){const key=signature(q);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(q.id);}
    const mapped=new Map();for(const q of previous){const id=buckets.get(signature(q))?.shift();if(id)mapped.set(q.id,id);}
    for(const c of s.cards)if(mapped.has(c.questionId))c.questionId=mapped.get(c.questionId);
    if(s.active&&mapped.has(s.active.questionId))s.active.questionId=mapped.get(s.active.questionId);
  }
  function validate(raw,data){
    const fail=()=>{throw new Error('Backup contains invalid daily review progress.');};
    const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
    if(!raw||raw.version!==1||!integer(raw.limit,1,1000)||!Array.isArray(raw.quizIds)||!Array.isArray(raw.cards)||raw.cards.length>MAX_CARDS||!Array.isArray(raw.days)||raw.days.length>366)fail();
    const quizzes=new Set(data.courses.flatMap(c=>c.units.flatMap(u=>u.quizzes.map(q=>q.id)))),byId=new Map(catalog(data).map(i=>[i.question.id,i]));
    if(new Set(raw.quizIds).size!==raw.quizIds.length||raw.quizIds.some(id=>!quizzes.has(id)))fail();
    const seen=new Set(),dates=new Set();
    const cards=raw.cards.map(c=>{if(!c||!byId.has(c.questionId)||seen.has(c.questionId)||!integer(c.due,0,8640000000000000)||!integer(c.interval,0,365)||!integer(c.reviews,1,1000000000)||!['again','hard','good','easy'].includes(c.rating))fail();seen.add(c.questionId);return {questionId:c.questionId,due:c.due,interval:c.interval,reviews:c.reviews,rating:c.rating};});
    const days=raw.days.map(d=>{if(!d||typeof d.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d.date)||!Number.isFinite(Date.parse(d.date))||dates.has(d.date)||!integer(d.count,0,1000000000))fail();dates.add(d.date);return {date:d.date,count:d.count};});
    let active=null;
    if(raw.active!==null){const a=raw.active,item=a&&byId.get(a.questionId);if(!item||item.quiz.id!==a.quizId||!raw.quizIds.includes(a.quizId)||typeof a.token!=='string'||!a.token||a.token.length>100||typeof a.checked!=='boolean'||(a.answer!==null&&!questions.validAnswer(item.question,a.answer,true))||(a.checked&&!questions.validAnswer(item.question,a.answer)))fail();active={token:a.token,quizId:a.quizId,questionId:a.questionId,answer:structuredClone(a.answer),checked:a.checked};}
    return {version:1,limit:raw.limit,quizIds:[...raw.quizIds],cards,days,active};
  }
  function mutate(data,action,now,newId){
    const s=data.dailyReview||defaults();
    if(action.type==='reviewSettings'){
      if(!Number.isInteger(action.limit)||action.limit<1||action.limit>1000)throw new Error('Choose a daily limit from 1 to 1,000.');
      const valid=new Set(data.courses.flatMap(c=>c.units.flatMap(u=>u.quizzes.map(q=>q.id))));
      if(!Array.isArray(action.quizIds)||new Set(action.quizIds).size!==action.quizIds.length||action.quizIds.some(id=>!valid.has(id)))throw new Error('Choose existing quizzes for review.');
      s.limit=action.limit;s.quizIds=[...action.quizIds];if(s.active&&!s.quizIds.includes(s.active.quizId))s.active=null;
      data.dailyReview=s;return;
    }
    data.dailyReview=s;
    const info=summary(data,now);
    if(action.type==='reviewBegin'){
      if(!info.remaining)throw new Error('Daily limit reached. Come back tomorrow or change your limit.');
      if(s.active)return;
      if(!info.next)throw new Error('Nothing is due right now.');
      if(s.cards.length>=MAX_CARDS&&!s.cards.some(c=>c.questionId===info.next.question.id))throw new Error('Daily review supports up to 100,000 scheduled questions.');
      s.active={token:newId(),quizId:info.next.quiz.id,questionId:info.next.question.id,answer:null,checked:false};return;
    }
    const a=s.active,item=current(data);
    if(!a||!item||a.token!==action.token)throw new Error('This review has changed. Open Daily review again.');
    if(!info.remaining)throw new Error('Daily limit reached. Come back tomorrow or change your limit.');
    if(action.type==='reviewAnswer'){
      if(a.checked)throw new Error('This answer is already checked.');
      if(!questions.validAnswer(item.question,action.answer,true))throw new Error('Choose a valid answer.');
      a.answer=structuredClone(action.answer);return;
    }
    if(action.type==='reviewCheck'){
      if(!questions.validAnswer(item.question,a.answer))throw new Error('Choose an answer before checking.');
      a.checked=true;return;
    }
    if(action.type==='reviewRate'){
      if(!a.checked)throw new Error('Check your answer before rating it.');
      if(!['again','hard','good','easy'].includes(action.rating))throw new Error('Choose Again, Hard, Good, or Easy.');
      if(!questions.isCorrect(item.question,a.answer)&&action.rating!=='again')throw new Error('Use Again for an incorrect answer.');
      const old=s.cards.find(c=>c.questionId===a.questionId),interval=intervals(old)[action.rating];
      const card={questionId:a.questionId,due:dueAt(now,interval),interval,reviews:(old?.reviews||0)+1,rating:action.rating};
      if(old)Object.assign(old,card);else {if(s.cards.length>=MAX_CARDS)throw new Error('Daily review supports up to 100,000 scheduled questions.');s.cards.push(card);}
      const date=dayKey(now),day=s.days.find(d=>d.date===date);if(day)day.count++;else s.days.push({date,count:1});s.days=s.days.slice(-366);s.active=null;return;
    }
    throw new Error('Unknown review action.');
  }
  return {defaults,dayKey,intervals,dueAt,summary,current,reconcile,remapQuiz,validate,mutate};
});
