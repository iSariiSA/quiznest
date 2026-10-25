/* Markdown math only. Trusted KaTeX output is created after ordinary HTML sanitization. */
(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('katex'):root.katex);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.QuiznetMath=api;
})(globalThis,katex=>{
  'use strict';
  const MAX_LENGTH=4000,MAX_EXPRESSIONS=64,MAX_TOTAL_LENGTH=16000;
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cache=new Map();let cachedLength=0;
  function render(source,display=false){
    const key=JSON.stringify([source,display]);
    if(cache.has(key)){const html=cache.get(key);cache.delete(key);cache.set(key,html);return html;}
    let body;
    try{
      if(source.length>MAX_LENGTH)throw new Error('Formula too long');
      body=katex.renderToString(source,{displayMode:display,output:'htmlAndMathml',throwOnError:true,trust:false,strict:'ignore',maxExpand:500,maxSize:10,macros:{}});
      if(body.length>100000)throw new Error('Formula output too large');
    }catch{body=`<span class="math-fallback"><span>Check formula</span> <code>${escape(source)}</code></span>`;}
    const html=`<span class="math-expression ${display?'math-block':'math-inline'}" dir="ltr" data-math-source="${escape(source)}">${body}</span>`;
    if(key.length+html.length<=256000){
      cache.set(key,html);cachedLength+=key.length+html.length;
      while(cache.size>64||cachedLength>256000){const oldest=cache.keys().next().value;cachedLength-=oldest.length+cache.get(oldest).length;cache.delete(oldest);}
    }
    return html;
  }
  function placeholder(source,display,env){
    env.quiznetMath??=[];env.quiznetMathLength??=0;
    if(env.quiznetMath.length>=MAX_EXPRESSIONS||env.quiznetMathLength+source.length>MAX_TOTAL_LENGTH)return escape('[Formula display limit reached] '+source);
    const index=env.quiznetMath.length;env.quiznetMath.push({source,display});env.quiznetMathLength+=source.length;
    return `<span data-quiznet-math="${index}"></span>`;
  }
  function escaped(source,index){let slashes=0;while(index>0&&source[--index]==='\\')slashes++;return slashes%2===1;}
  function install(md){
    md.inline.ruler.before('escape','quiznet_math',(state,silent)=>{
      const start=state.pos,src=state.src;
      let open,close,display=false;
      if(src.startsWith('\\(',start)){open='\\(';close='\\)';}
      else if(src.startsWith('\\[',start)){open='\\[';close='\\]';display=true;}
      else if(src[start]==='$'){display=src[start+1]==='$';open=close=display?'$$':'$';}
      else return false;
      const begin=start+open.length;
      state.quiznetMathMisses??={};if(state.quiznetMathMisses[close]!==undefined&&begin>=state.quiznetMathMisses[close])return false;
      if(!display&&open==='$'&&(/\s/.test(src[begin]||' ')||src[begin]==='$'))return false;
      let end=begin;const lineEnd=display?-1:src.indexOf('\n',begin);
      for(;;){
        end=src.indexOf(close,end);if(end<0){state.quiznetMathMisses[close]=begin;return false;}if(end>=state.posMax)return false;
        if(lineEnd>=0&&end>lineEnd)return false;
        if(escaped(src,end)){end+=close.length;continue;}
        if(open==='$'&&(src[end+1]==='$'||/\s/.test(src[end-1])||/\d/.test(src[end+1]||'')))return false;
        break;
      }
      if(end===begin)return false;
      if(!silent){const token=state.push('quiznet_math','',0);token.content=src.slice(begin,end);token.meta={display};}
      state.pos=end+close.length;return true;
    });
    md.block.ruler.before('fence','quiznet_math_block',(state,start,end,silent)=>{
      if(state.sCount[start]-state.blkIndent>=4)return false;
      const first=state.src.slice(state.bMarks[start]+state.tShift[start],state.eMarks[start]);
      const open=first.startsWith('$$')?'$$':first.startsWith('\\[')?'\\[':null;if(!open)return false;
      const close=open==='$$'?'$$':'\\]',parts=[];
      state.quiznetMathLast??={};
      if(state.quiznetMathLast[close]===undefined){
        let last=state.src.lastIndexOf(close);
        while(last>=0){const nextLine=state.src.indexOf('\n',last+close.length);if(!escaped(state.src,last)&&!state.src.slice(last+close.length,nextLine<0?state.src.length:nextLine).trim())break;last=state.src.lastIndexOf(close,last-1);}
        state.quiznetMathLast[close]=last;
      }
      if(state.quiznetMathLast[close]<=state.bMarks[start]+state.tShift[start])return false;
      for(let line=start;line<end;line++){
        if(line>start&&state.sCount[line]<state.blkIndent&&!state.isEmpty(line))return false;
        const text=line===start?first.slice(open.length):state.getLines(line,line+1,state.blkIndent,false);
        let pos=-1,from=0;while((pos=text.indexOf(close,from))>=0&&escaped(text,pos))from=pos+close.length;
        if(pos>=0&&!text.slice(pos+close.length).trim()){
          parts.push(text.slice(0,pos));if(!parts.join('\n').trim())return false;if(silent)return true;
          const token=state.push('quiznet_math','',0);token.block=true;token.content=parts.join('\n').trim();token.meta={display:true};token.map=[start,line+1];state.line=line+1;return true;
        }
        parts.push(text);
      }
      return false;
    },{alt:['paragraph','reference','blockquote','list']});
    md.renderer.rules.quiznet_math=(tokens,index,options,env)=>placeholder(tokens[index].content,tokens[index].meta.display,env);
    const fence=md.renderer.rules.fence;
    md.renderer.rules.fence=(tokens,index,options,env,self)=>tokens[index].info.trim()==='math'?placeholder(tokens[index].content.trim(),true,env):fence(tokens,index,options,env,self);
  }
  return Object.freeze({install,render,MAX_LENGTH,MAX_EXPRESSIONS,MAX_TOTAL_LENGTH});
});
