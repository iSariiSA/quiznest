/* Rebuild inert HTML using only study-formatting elements and embedded raster images. */
(function(root) {
  'use strict';
  const policy=root.QuiznetContentPolicy;
  const allowed=new Set('p div span br hr strong b em i u s sub sup mark ul ol li blockquote pre code h1 h2 h3 h4 h5 h6 table caption thead tbody tfoot tr th td img'.split(' '));
  const dropped=new Set('script style iframe object embed svg math template noscript head title base link meta form input textarea select button audio video source canvas'.split(' '));
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const codePolicy=root.QuiznetCodePolicy;
  const math=root.QuiznetMath;
  const markdown=root.markdownit({html:false,linkify:false,typographer:false,maxNesting:30});
  math.install(markdown);
  function codeBlock(source,requested='plaintext') {
    let language;try{language=codePolicy.language(requested);}catch{language='plaintext';}
    const label=codePolicy.languages.find(item=>item.id===language)?.label||language;
    let highlighted=escape(source);
    if(source.length<=codePolicy.MAX_HIGHLIGHT_LENGTH&&root.hljs.getLanguage(language)) {
      try{highlighted=root.hljs.highlight(source,{language,ignoreIllegals:true}).value;}catch{/* Plain text remains readable. */}
    }
    return `<div class="code-block" dir="ltr"><div class="code-language">${escape(label)}</div><pre tabindex="0" aria-label="${escape(label)} code"><code class="hljs language-${escape(language)}">${highlighted}</code></pre></div>`;
  }
  function sanitize(source,expressions=[]) {
    const template=document.createElement('template');
    template.innerHTML=String(source??'').slice(0,policy.MAX_HTML_LENGTH);
    const output=document.createElement('div');
    let count=0;
    function copy(node,parent,depth) {
      if (++count>20000 || depth>60) return;
      if (node.nodeType===Node.TEXT_NODE) { parent.append(document.createTextNode(node.textContent));return; }
      if (node.nodeType!==Node.ELEMENT_NODE || node.namespaceURI!=='http://www.w3.org/1999/xhtml') return;
      const tag=node.localName;
      if (dropped.has(tag)) return;
      const marker=node.getAttribute('data-quiznet-math');
      if(tag==='span'&&/^(0|[1-9]\d*)$/.test(marker??'')&&expressions[Number(marker)]){
        const expression=expressions[Number(marker)],fragment=document.createElement('template');
        fragment.innerHTML=math.render(expression.source,expression.display);parent.append(fragment.content);return;
      }
      let target=parent;
      if (allowed.has(tag)) {
        target=document.createElement(tag);
        if(tag==='code'&&node.parentElement?.localName==='pre'){
          const language=/(?:^|\s)language-([\w+#.-]{1,50})(?:\s|$)/.exec(node.getAttribute('class')||'');
          if(language)target.dataset.language=language[1];
        }
        if (['auto','ltr','rtl'].includes(node.getAttribute('dir'))) target.setAttribute('dir',node.getAttribute('dir'));
        if (tag==='img') {
          try { target.setAttribute('src',policy.imageData(node.getAttribute('src'))); } catch { return; }
          target.setAttribute('alt',(node.getAttribute('alt')||'Question image').slice(0,500));
          target.setAttribute('draggable','false');
        }
        if (['th','td'].includes(tag)) for (const attr of ['colspan','rowspan']) {
          const value=node.getAttribute(attr);if (/^[1-9]\d?$/.test(value)) target.setAttribute(attr,value);
        }
        parent.append(target);
      }
      for (const child of node.childNodes) copy(child,target,depth+1);
    }
    for (const node of template.content.childNodes) copy(node,output,0);
    for(const code of output.querySelectorAll('pre > code'))code.parentElement.outerHTML=codeBlock(code.textContent,code.dataset.language||'plaintext');
    return output.innerHTML;
  }
  function render(source,format) {
    if(format==='html')return sanitize(source);
    if(format==='markdown'){const env={};return sanitize(markdown.render(String(source??'').slice(0,codePolicy.MAX_MARKDOWN_LENGTH),env),env.quiznetMath);}
    return escape(source);
  }
  function plain(source,format) {
    if (!['html','markdown'].includes(format)) return String(source??'');
    const template=document.createElement('template');template.innerHTML=render(source,format);
    for(const expression of template.content.querySelectorAll('.math-expression'))expression.replaceWith(document.createTextNode(expression.dataset.mathSource));
    return template.content.textContent;
  }
  function image(question) {
    if (!question.image) return '';
    try { return `<img class="question-image" src="${escape(policy.imageData(question.image))}" alt="${escape(question.imageAlt||'Question image')}" draggable="false">`; }
    catch { return ''; }
  }
  function code(question){return question.code?codeBlock(question.code,question.codeLanguage):'';}
  root.QuiznetContent=Object.freeze({sanitize,render,plain,image,code});
})(globalThis);
