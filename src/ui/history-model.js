// Read-only summaries of completed quiz attempts. Saved/daily practice has no
// ordinary attempt records, so it is deliberately not estimated here.
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./course-focus.js'):root.QuiznetCourseFocus);if(typeof module==='object'&&module.exports)module.exports=api;else root.QuiznetHistory=api;})(globalThis,focus=>{
  const defaults=()=>({courseId:'',unitId:'',quizId:'',focus:'',period:'all',from:'',to:'',mode:'all',unlinked:false});
  const percent=a=>a&&a.total?Math.round(a.score/a.total*100):null;
  const dayKey=value=>{const d=new Date(value);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  function dateStart(value){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error('Choose a valid date.');
    const d=new Date(value+'T00:00:00');if(!Number.isFinite(d.getTime())||dayKey(d)!==value)throw new Error('Choose a valid date.');return d;
  }
  function filters(raw={}){
    const f={...defaults(),...raw};
    if(['courseId','unitId','quizId','focus','period','from','to','mode'].some(k=>typeof f[k]!=='string')||typeof f.unlinked!=='boolean'||(f.unitId&&!f.courseId)||(f.quizId&&!f.unitId)||(f.unlinked&&(f.courseId||f.unitId||f.quizId))||!['all','7','30','90','custom'].includes(f.period)||!['all','full','missed'].includes(f.mode))throw new Error('Choose valid history filters.');
    if(f.focus)focus.validate(f.focus);
    if(f.period==='custom'){if(f.from)dateStart(f.from);if(f.to)dateStart(f.to);if(f.from&&f.to&&f.from>f.to)throw new Error('The start date must come before the end date.');}
    return f;
  }
  function bounds(f,now){
    if(f.period==='all')return [-Infinity,Infinity];
    if(f.period==='custom'){
      const end=f.to?dateStart(f.to):null;if(end)end.setDate(end.getDate()+1);
      return [f.from?dateStart(f.from).getTime():-Infinity,end?end.getTime():Infinity];
    }
    const start=new Date(now);start.setHours(0,0,0,0);start.setDate(start.getDate()-Number(f.period)+1);
    const end=new Date(now);end.setHours(0,0,0,0);end.setDate(end.getDate()+1);return [start.getTime(),end.getTime()];
  }
  const timed=a=>a.timingMode==='active'||a.timingMode==='active-partial';
  function summary(entries){
    let correct=0,answers=0,activeMs=0,fullTime=0,partialTime=0,untracked=0,missed=0;const days=new Set();
    for(const e of entries){const a=e.attempt;correct+=a.score;answers+=a.total;days.add(dayKey(a.completedAt));if(a.missedOnly)missed++;
      if(timed(a)){activeMs+=a.elapsedSeconds*1000;if(a.timingMode==='active')fullTime++;else partialTime++;}else untracked++;
    }
    return {sessions:entries.length,correct,answers,accuracy:answers?Math.round(correct/answers*100):null,activeMs,fullTime,partialTime,untracked,missed,days:days.size};
  }
  function analyze(data,raw={},now=Date.now()){
    const f=filters(raw),[start,end]=bounds(f,now),byQuiz=new Map(),courseRows=new Map(),quizRows=new Map(),units=new Map(),quizzes=new Map();
    const eligibleCourse=c=>(!f.courseId||f.courseId===c.id)&&(!f.focus||focus.of(c).id===f.focus)&&!f.unlinked;
    const options={courses:data.courses.map(c=>({id:c.id,title:c.title})),units:[],quizzes:[]};
    for(const c of data.courses){
      if(c.id===f.courseId)for(const u of c.units){units.set(u.id,{id:u.id,title:u.title});if(u.id===f.unitId)for(const q of u.quizzes)quizzes.set(q.id,{id:q.id,title:q.title});}
      if(eligibleCourse(c))courseRows.set(c.id,{courseId:c.id,title:c.title,focus:focus.of(c).id,entries:[],available:0,practised:new Set()});
      for(const u of c.units)for(const q of u.quizzes){
        const place={course:c,unit:u,quiz:q};byQuiz.set(q.id,place);
        if(eligibleCourse(c)&&(!f.unitId||u.id===f.unitId)&&(!f.quizId||q.id===f.quizId)){
          courseRows.get(c.id).available++;quizRows.set(q.id,{quizId:q.id,courseId:c.id,unitId:u.id,title:q.title,courseTitle:c.title,unitTitle:u.title,focus:focus.of(c).id,entries:[]});
        }
      }
    }
    const sortOptions=values=>[...values].sort((a,b)=>a.title.localeCompare(b.title)||a.id.localeCompare(b.id));
    options.courses=sortOptions(options.courses);options.units=sortOptions(units.values());options.quizzes=sortOptions(quizzes.values());
    const entries=[];let unlinkedCount=0;
    data.attempts.forEach((attempt,index)=>{
      const place=byQuiz.get(attempt.quizId);if(!place)unlinkedCount++;
      if(f.unlinked?Boolean(place):((f.courseId&&place?.course.id!==f.courseId)||(f.unitId&&place?.unit.id!==f.unitId)||(f.quizId&&attempt.quizId!==f.quizId)))return;
      const focusId=focus.of(place?.course).id,timestamp=Date.parse(attempt.completedAt);
      if((f.focus&&focusId!==f.focus)||timestamp<start||timestamp>=end||(f.mode==='full'&&attempt.missedOnly)||(f.mode==='missed'&&!attempt.missedOnly))return;
      entries.push({attempt,index,place,focus:focusId});
    });
    entries.sort((a,b)=>Date.parse(b.attempt.completedAt)-Date.parse(a.attempt.completedAt)||b.index-a.index);
    for(const e of entries){const c=courseRows.get(e.place?.course.id),q=quizRows.get(e.attempt.quizId);if(c){c.entries.push(e);if(!e.attempt.missedOnly)c.practised.add(e.attempt.quizId);}if(q)q.entries.push(e);}
    const courses=[...courseRows.values()].map(c=>({...c,stats:summary(c.entries),practised:c.practised.size}));
    courses.sort((a,b)=>focus.choices.findIndex(f=>f.id===a.focus)-focus.choices.findIndex(f=>f.id===b.focus)||a.title.localeCompare(b.title));
    const quizDetails=[...quizRows.values()].map(q=>{const full=q.entries.filter(e=>!e.attempt.missedOnly);return {...q,stats:summary(q.entries),latest:q.entries[0]?.attempt||null,latestFull:full[0]?.attempt||null,bestFull:full.length?full.reduce((best,e)=>Math.max(best,percent(e.attempt)),0):null};});
    quizDetails.sort((a,b)=>a.courseTitle.localeCompare(b.courseTitle)||a.unitTitle.localeCompare(b.unitTitle)||a.title.localeCompare(b.title));
    return {filter:f,options,unlinkedCount,entries,total:data.attempts.length,stats:summary(entries),courses,quizzes:quizDetails,trend:entries.slice(0,12).reverse(),focus:focus.choices.map(c=>({...c,stats:summary(entries.filter(e=>e.focus===c.id))}))};
  }
  return {defaults,filters,analyze,summary,percent,dayKey};
});
