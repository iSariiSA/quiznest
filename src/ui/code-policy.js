/* Shared code-display metadata; unknown languages remain readable as plain text. */
(function(root){
  const languages=[
    ['plaintext','Plain text',['text','txt']],['python','Python',['py']],['javascript','JavaScript',['js']],
    ['typescript','TypeScript',['ts']],['java','Java',[]],['c','C',[]],['cpp','C++',['c++']],
    ['csharp','C#',['cs','c#']],['sql','SQL',[]],['json','JSON',[]],['xml','HTML / XML',['html','xml']],
    ['css','CSS',[]],['bash','Shell / Bash',['sh','shell']],['markdown','Markdown',['md']]
  ].map(([id,label,aliases])=>Object.freeze({id,label,aliases}));
  const MAX_CODE_LENGTH=50000,MAX_MARKDOWN_LENGTH=100000,MAX_HIGHLIGHT_LENGTH=12000;
  function language(value='plaintext'){
    if(typeof value!=='string'||value.length>50||!/^[\w+#.-]+$/.test(value))throw new Error('Use a short code language name, such as python or javascript.');
    const key=value.toLowerCase();return languages.find(item=>item.id===key||item.aliases.includes(key))?.id||key;
  }
  const policy=Object.freeze({languages,language,MAX_CODE_LENGTH,MAX_MARKDOWN_LENGTH,MAX_HIGHLIGHT_LENGTH});
  if(typeof module==='object'&&module.exports)module.exports=policy;else root.QuiznetCodePolicy=policy;
})(globalThis);
