const history=require('./ui/history-model.js');
function selection(data,ids){
 if(!Array.isArray(ids)||!ids.length||ids.length>10000||new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string'||!id||id.length>200))throw new Error('Select between 1 and 10,000 history sessions.');
 const byId=new Map(data.attempts.map(a=>[a.id,a]));if(ids.some(id=>!byId.has(id)))throw new Error('History changed. Select the sessions again.');return ids.map(id=>byId.get(id));
}
function removable(data,ids){const attempts=selection(data,ids);if(attempts.some(a=>a.id===data.activeSession?.sourceAttemptId))throw new Error('An unfinished missed-question session needs this result. Finish or discard that session first.');return attempts;}
function remove(data,ids){removable(data,ids);const selected=new Set(ids);data.attempts=data.attempts.filter(a=>!selected.has(a.id));}
function csv(data,ids){
 const rows=selection(data,ids),byQuiz=new Map();for(const c of data.courses)for(const u of c.units)for(const q of u.quizzes)byQuiz.set(q.id,{course:c.title,collection:data.collections?.find(g=>g.id===c.collectionId)?.title||'',unit:u.title});
 const cell=value=>{let text=String(value??'');if(/^[\s]*[=+\-@]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};
 return '\uFEFF'+[['Completed at','Course','Collection','Unit','Quiz','Correct','Questions','Percent','Session type','Recorded active seconds','Timing'],...rows.map(a=>{const p=byQuiz.get(a.quizId);return [a.completedAt,p?.course||'Unlinked',p?.collection,p?.unit,a.title,a.score,a.total,history.percent(a),a.missedOnly?'Missed questions':'Full quiz',['active','active-partial'].includes(a.timingMode)?a.elapsedSeconds:'',a.timingMode||'Untracked'];})].map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
}
module.exports={selection,removable,remove,csv};
