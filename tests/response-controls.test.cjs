const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const questionModel=require('../src/ui/question-types.js');
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const context={questionModel,esc,tr:(text,params={})=>text.replace(/\{([^}]+)\}/g,(match,key)=>params[key]??match),optionLabel:questionModel.optionLabel,rich:(text)=>'<div>'+esc(text)+'</div>'};
vm.createContext(context);vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../src/ui/response-controls.js'),'utf8'),context);
const written={id:'written-demo',type:'written-answer',prompt:'Write the answer',acceptedAnswers:['PRIVATE KEY','A different key'],caseSensitive:false};
const matching={id:'match-demo',type:'matching',prompt:'Match',pairs:[{left:'<button data-action="delete">Item</button>',right:'<img src=x onerror=bad>'},{left:'Second',right:'Safe second'},{left:'Third',right:'Safe third'}]};
test('browsing and blank response controls do not expose written answer keys; typed content stays inert',()=>{
 for(const html of [context.questionChoicesContent(written),context.responseControls(written,undefined,{context:'saved'})]){assert.equal(html.includes('PRIVATE KEY'),false);assert.equal(html.includes('A different key'),false);}
 const html=context.responseControls(written,'</textarea><button data-action="delete">',{context:'quiz'});assert.equal(html.includes('</textarea><button'),false);assert.match(html,/&lt;\/textarea&gt;&lt;button/);assert.match(html,/data-response-context="quiz"/);assert.match(context.responseCorrectContent(written),/PRIVATE KEY/);assert.match(context.responseContent(written,'original \u0625\u062c\u0627\u0628\u0629'),/original \u0625\u062c\u0627\u0628\u0629/);
});
test('matching controls preserve stable shuffled indices, escape both banks and compose unique partial responses',()=>{
 const html=context.responseControls(matching,[null,2,null],{context:'daily'});assert.equal(html.includes('<button data-action="delete">Item'),false);assert.equal(html.includes('<img src=x'),false);assert.match(html,/&lt;img src=x onerror=bad&gt;/);assert.match(html,/value="2" selected/);assert.deepEqual(Array.from(context.responseValue(matching,[null,2,null],{value:'2',dataset:{responseRow:'0'}})),[2,null,null]);assert.deepEqual(Array.from(context.responseValue(matching,[2,null,0],{value:'',dataset:{responseRow:'2'}})),[2,null,null]);assert.throws(()=>context.responseValue(matching,[null,null,null],{value:'3',dataset:{responseRow:'0'}}),/valid match/);
 const reference=context.questionChoicesContent(matching);assert.match(reference,/matching-reference/);assert.equal(reference.includes('matching-solution'),false);assert.match(context.responseContent(matching,[null,2,0]),/Not matched/);assert.equal(context.responseContent(matching,[null,2,0]).includes('<img'),false);
 const order=questionModel.matchingOrder(matching);const values=[...html.matchAll(/<option value="(\d+)"/g)].slice(0,matching.pairs.length).map(match=>Number(match[1]));assert.deepEqual(values,order);
});
