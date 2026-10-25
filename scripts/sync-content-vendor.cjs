// Copy pinned browser builds into the offline app. No runtime downloads or CDN requests.
const fs=require('node:fs');
const path=require('node:path');
const {languages}=require('../src/ui/code-policy.js');
const root=path.resolve(__dirname,'..'),destination=path.join(root,'src/ui/vendor');
const check=process.argv.includes('--check');
if(!check)fs.mkdirSync(destination,{recursive:true});
function output(name,source,binary=false){
  const target=path.join(destination,name),contents=Buffer.isBuffer(source)?source:Buffer.from(source);
  if(check){const actual=fs.readFileSync(target);if(binary?!actual.equals(contents):actual.toString('utf8').replace(/\r\n/g,'\n')!==contents.toString('utf8').replace(/\r\n/g,'\n'))throw new Error(`Regenerate ${name} with npm run assets:content.`);}
  else{fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,contents);}
}
const highlighting=path.join(root,'node_modules/@highlightjs/cdn-assets');
const files=['highlight.min.js',...languages.filter(item=>item.id!=='plaintext').map(item=>`languages/${item.id}.min.js`)];
output('highlight.min.js',files.map(file=>fs.readFileSync(path.join(highlighting,file),'utf8')).join('\n'));
output('highlight.LICENSE',fs.readFileSync(path.join(highlighting,'LICENSE')));
output('markdown-it.min.js',fs.readFileSync(path.join(root,'node_modules/markdown-it/dist/browser/markdown-it.umd.min.js')));
output('markdown-it.LICENSE',fs.readFileSync(path.join(root,'node_modules/markdown-it/LICENSE')));
const katex=path.join(root,'node_modules/katex');
for(const name of ['katex.min.js','katex.min.css'])output(name,fs.readFileSync(path.join(katex,'dist',name)));
output('katex.LICENSE',fs.readFileSync(path.join(katex,'LICENSE')));
for(const name of fs.readdirSync(path.join(katex,'dist/fonts')))if(/\.(?:woff2?|ttf)$/.test(name))output(`fonts/${name}`,fs.readFileSync(path.join(katex,'dist/fonts',name)),true);
console.log(check?'Offline content assets match pinned packages.':'Pinned Markdown, code-highlighting, and math assets copied into the offline app.');
