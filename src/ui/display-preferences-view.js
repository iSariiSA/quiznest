let displayPrefs={libraryView:'cards',rememberView:true,interfaceScale:100},libraryMode='cards';
function libraryModes(){return [['cards',tr("Cards"),'grid'],['names',tr("Names only"),'list'],['details',tr("Details"),'table']];}
function receiveDisplayPreferences(value,initialize=false){displayPrefs=value;if(initialize){libraryMode=value.libraryView;historyState.tab=value.historyTab;historyState.filter=structuredClone(value.historyFilter);}applyLanguage();applyAppearance();}
async function saveDisplayPreferences(patch){
 const controls=[...document.querySelectorAll('.settings-workspace input,.settings-workspace select,.settings-workspace button')].filter(c=>!c.disabled);controls.forEach(c=>c.disabled=true);
 try{receiveDisplayPreferences(await api.setDisplayPreferences(patch));}finally{controls.forEach(c=>{if(c.isConnected)c.disabled=false;});}
}
async function setLibraryMode(mode){
 if(!libraryModes().some(([id])=>id===mode))throw new Error(tr("Choose a library view."));
 if(displayPrefs.rememberView)await saveDisplayPreferences({libraryView:mode});
 libraryMode=mode;render();document.querySelector('[data-action="libraryViewMenu"]')?.focus();
}
function libraryViewMenu(trigger){showMenu(trigger,[...libraryModes().map(([id,label,mark])=>[`${icon(mark)}<span>${label}</span>${libraryMode===id?icon('check'):''}`,'setLibraryView',`data-mode="${id}" aria-checked="${libraryMode===id}"`]),[tr("Display settings…"),'displaySettings']]);}
function displaySettings(){
 return `<section class="settings-group display-settings" id="display-settings"><h2>${trHtml("Display",{})}</h2><div class="display-setting"><label for="library-view-preference">${trHtml("Library view",{})}</label><select id="library-view-preference">${libraryModes().map(([id,label])=>`<option value="${id}" ${libraryMode===id?'selected':''}>${label}</option>`).join('')}</select></div><label class="display-remember"><input id="remember-library-view" type="checkbox" ${displayPrefs.rememberView?'checked':''}>${trHtml("Remember my library view",{})}</label><div class="display-setting"><label for="interface-scale">${trHtml("Interface size",{})}</label><select id="interface-scale">${[[90,tr("Compact · 90%")],[100,tr("Default · 100%")],[115,tr("Large · 115%")],[125,tr("Larger · 125%")]].map(([value,label])=>`<option value="${value}" ${displayPrefs.interfaceScale===value?'selected':''}>${label}</option>`).join('')}</select></div><p class="muted">${trHtml("Changes text and controls throughout the app. Saved only on this device.",{})}</p>${displayPrefs.warning?`<p role="status">${esc(displayPrefs.warning)}</p>`:''}${button(tr("Reset display"),'resetDisplay','text')}</section>`;
}
document.addEventListener('change',async e=>{
 if(!['library-view-preference','remember-library-view','interface-scale'].includes(e.target.id)||busy)return;
 const control=e.target,id=control.id;busy=true;control.disabled=true;
 try{
  if(id==='library-view-preference'){const mode=control.value;if(displayPrefs.rememberView)await saveDisplayPreferences({libraryView:mode});libraryMode=mode;}
  else if(id==='remember-library-view')await saveDisplayPreferences({rememberView:control.checked,libraryView:libraryMode});
  else await saveDisplayPreferences({interfaceScale:Number(control.value)});
  render();document.getElementById(id)?.focus();
 }catch(error){render();document.getElementById(id)?.focus();toast(error.message);}
 finally{busy=false;if(control.isConnected)control.disabled=false;}
});

