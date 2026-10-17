// Render the vector master using the project's existing Electron/Playwright runtime.
// The artwork window never loads the application or opens a study library.
if (process.versions.electron) {
  const {app,BrowserWindow}=require('electron');
  app.setName('Quiznet artwork');
  app.whenReady().then(async()=>{
    const window=new BrowserWindow({width:1100,height:1100,show:false,backgroundColor:'#00000000',webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});
    await window.loadURL('about:blank');
  });
  app.on('window-all-closed',()=>app.quit());
} else {
  const fs=require('node:fs/promises');
  const path=require('node:path');
  const {_electron:electron}=require('@playwright/test');
  const root=path.resolve(__dirname,'..');
  async function build(){
    const directory=path.join(root,'assets/brand');
    const pack=path.join(root,'outputs/Quiznet-Identity');
    await fs.mkdir(path.join(pack,'icons'),{recursive:true});
    const master=await fs.readFile(path.join(directory,'mark.svg'),'utf8');
    const mark=master.match(/<g[\s\S]*<\/g>/)[0];
    const icon=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none"><title>Quiznet app icon</title><rect x="8" y="8" width="240" height="240" rx="48" fill="#244a3a"/>${mark}</svg>\n`;
    const wordmark=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 580 160" fill="none"><title>Quiznet</title><g transform="translate(0 3) scale(.6)">${mark}</g><text x="166" y="112" fill="#e8ebf0" font-family="Segoe UI, Arial, sans-serif" font-size="92" font-weight="600" letter-spacing="-2">Quiznet</text></svg>\n`;
    await fs.writeFile(path.join(directory,'icon.svg'),icon);
    await fs.writeFile(path.join(directory,'wordmark.svg'),wordmark);
    const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
    const app=await electron.launch({args:[__filename],env});
    try {
      const page=await app.firstWindow();
      await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:100%;height:100%}</style>${icon}`);
      const sizes=[16,20,24,32,40,48,64,128,256,512,1024];
      const frames=[];
      for(const size of sizes){
        await page.locator('svg').evaluate((node,size)=>{node.style.width=`${size}px`;node.style.height=`${size}px`;},size);
        const png=await page.locator('svg').screenshot({omitBackground:true,animations:'disabled',scale:'css'});
        await fs.writeFile(path.join(pack,'icons',`icon-${size}.png`),png);
        if(size===1024)await fs.writeFile(path.join(root,'assets/icon.png'),png);
        if(size<=256)frames.push({size,png});
      }
      // ICO directory with lossless PNG frames, including actual small-size renders.
      const header=Buffer.alloc(6+16*frames.length);
      header.writeUInt16LE(1,2);header.writeUInt16LE(frames.length,4);
      let offset=header.length;
      frames.forEach(({size,png},index)=>{
        const at=6+index*16;header[at]=size===256?0:size;header[at+1]=size===256?0:size;
        header.writeUInt16LE(1,at+4);header.writeUInt16LE(32,at+6);
        header.writeUInt32LE(png.length,at+8);header.writeUInt32LE(offset,at+12);offset+=png.length;
      });
      await fs.writeFile(path.join(root,'assets/icon.ico'),Buffer.concat([header,...frames.map(frame=>frame.png)]));
      await page.setContent(`<style>body{margin:0;padding:48px;background:#181b20;color:#e8ebf0;font:16px 'Segoe UI',sans-serif}h1{font-size:20px;font-weight:600;margin:0 0 32px}.hero{display:flex;align-items:center;gap:42px}.tile{width:224px;height:224px}.wordmark{width:580px}.sizes{display:flex;align-items:center;gap:28px;margin:32px 0}.sizes svg{display:block}.swatches{display:flex;gap:16px}.swatch{width:150px}.color{height:62px;border:1px solid #38414a;border-radius:6px;margin-bottom:8px}small{display:block;color:#abb4bf;margin-top:4px}</style><h1>Quiznet / Focus identity</h1><div class="hero"><div class="tile">${icon}</div><div class="wordmark">${wordmark}</div></div><div class="sizes">${[16,20,24,32,48,64].map(size=>`<div>${icon.replace('<svg ','<svg width="'+size+'" height="'+size+'" ')}<small>${size}px</small></div>`).join('')}</div><div class="swatches">${[['Background','#181b20'],['Surface','#23282e'],['Forest','#244a3a'],['Sage','#bfd5aa'],['Text','#e8ebf0']].map(([name,color])=>`<div class="swatch"><div class="color" style="background:${color}"></div>${name}<small>${color.toUpperCase()}</small></div>`).join('')}</div>`);
      await page.screenshot({path:path.join(pack,'identity-preview.png'),clip:{x:0,y:0,width:1000,height:650},animations:'disabled'});
    } finally {await app.close();}
    for(const name of ['mark.svg','icon.svg','wordmark.svg'])await fs.copyFile(path.join(directory,name),path.join(pack,name));
    await fs.copyFile(path.join(root,'assets/icon.ico'),path.join(pack,'icon.ico'));
    await fs.copyFile(path.join(root,'docs/BRAND.md'),path.join(pack,'BRAND.md'));
    console.log('Focus vectors, Windows icon, PNG sizes and identity handoff generated.');
  }
  build().catch(error=>{console.error(error);process.exitCode=1;});
}
