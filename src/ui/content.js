/* Rebuild inert HTML using only study-formatting elements and embedded raster images. */
(function(root) {
  'use strict';
  const policy=root.QuiznetContentPolicy;
  const allowed=new Set('p div span br hr strong b em i u s sub sup mark ul ol li blockquote pre code h1 h2 h3 h4 h5 h6 table caption thead tbody tfoot tr th td img'.split(' '));
  const dropped=new Set('script style iframe object embed svg math template noscript head title base link meta form input textarea select button audio video source canvas'.split(' '));
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function sanitize(source) {
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
      let target=parent;
      if (allowed.has(tag)) {
        target=document.createElement(tag);
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
    return output.innerHTML;
  }
  function render(source,format) { return format==='html'?sanitize(source):escape(source); }
  function plain(source,format) {
    if (format!=='html') return String(source??'');
    const template=document.createElement('template');template.innerHTML=sanitize(source);
    return template.content.textContent;
  }
  function image(question) {
    if (!question.image) return '';
    try { return `<img class="question-image" src="${escape(policy.imageData(question.image))}" alt="${escape(question.imageAlt||'Question image')}" draggable="false">`; }
    catch { return ''; }
  }
  root.QuiznetContent=Object.freeze({sanitize,render,plain,image});
})(globalThis);
