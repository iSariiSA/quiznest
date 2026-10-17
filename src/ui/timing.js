/* Shared study-time accounting. Timestamps are cursors; only accumulated time survives restart. */
(function(root){
  const duration=value=>{const seconds=Math.max(0,Math.floor(value/1000)),hours=Math.floor(seconds/3600),minutes=Math.floor(seconds/60)%60;return `${hours?`${hours}:`:''}${String(hours?minutes:Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;};
  const validMs=value=>Number.isSafeInteger(value)&&value>=0;
  function begin(session,now,partial=false){
    session.timing={elapsedMs:0,questionMs:partial?{[session.questionIds[session.position]]:0}:Object.fromEntries(session.questionIds.map(id=>[id,0])),runningSince:now,partial};
  }
  function elapsed(timing,now){return Math.min(Number.MAX_SAFE_INTEGER,timing.elapsedMs+(timing.runningSince===null?0:Math.max(0,now-timing.runningSince)));}
  function settle(session,now){
    const t=session?.timing;if(!t||t.runningSince===null)return;
    const delta=Math.min(Number.MAX_SAFE_INTEGER-t.elapsedMs,Math.max(0,now-t.runningSince)),key=session.questionIds[session.position];
    t.elapsedMs+=delta;t.questionMs[key]=(t.questionMs[key]||0)+delta;t.runningSince=now;
  }
  function validate(t,ids){
    if(!t||!validMs(t.elapsedMs)||!(t.runningSince===null||validMs(t.runningSince))||typeof t.partial!=='boolean'||!t.questionMs||Array.isArray(t.questionMs)||typeof t.questionMs!=='object')throw new Error('Backup has invalid quiz timing.');
    const entries=Object.entries(t.questionMs);
    if(entries.some(([id,value])=>!ids.includes(id)||!validMs(value))||(!t.partial&&entries.length!==ids.length)||entries.reduce((sum,[,value])=>sum+value,0)!==t.elapsedMs)throw new Error('Backup has invalid question timing.');
    return {elapsedMs:t.elapsedMs,questionMs:{...t.questionMs},runningSince:t.runningSince,partial:t.partial};
  }
  function attemptFields(session){
    if(!session.timing)return {};
    return {timingMode:session.timing.partial?'active-partial':'active',questionTimesMs:session.questionIds.map(id=>session.timing.questionMs[id]??null)};
  }
  function validateAttempt(attempt,count){
    if(attempt.timingMode===undefined&&attempt.questionTimesMs===undefined)return {};
    const {timingMode,questionTimesMs}=attempt;
    if(!['active','active-partial'].includes(timingMode)||!Array.isArray(questionTimesMs)||questionTimesMs.length!==count||Array.from(questionTimesMs).some(value=>!(validMs(value)||(timingMode==='active-partial'&&value===null)))||!validMs(questionTimesMs.reduce((sum,value)=>sum+(value||0),0))||Math.round(questionTimesMs.reduce((sum,value)=>sum+(value||0),0)/1000)!==attempt.elapsedSeconds)throw new Error('Backup contains invalid attempt timing.');
    return {timingMode,questionTimesMs:[...questionTimesMs]};
  }
  const api={duration,validMs,begin,elapsed,settle,validate,attemptFields,validateAttempt};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.QuiznetTiming=api;
})(globalThis);
