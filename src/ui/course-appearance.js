(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.QuiznetAppearance=api;})(globalThis,()=>{
 const icons=Object.freeze([
  ['book','Book','<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15"/>'],
  ['robot','Robotics','<rect x="4" y="7" width="16" height="14" rx="3"/><path d="M12 3v4M2 12v5m20-5v5M8 17h8"/><circle cx="8" cy="12" r="1"/><circle cx="16" cy="12" r="1"/>'],
  ['brain','AI & learning','<path d="M9 4a3 3 0 0 0-5 3 4 4 0 0 0-1 7 4 4 0 0 0 6 6m6-16a3 3 0 0 1 5 3 4 4 0 0 1 1 7 4 4 0 0 1-6 6M9 3v18m6-18v18M5 9l4 2m6 3 4-2"/>'],
  ['code','Code','<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18"/>'],
  ['chip','Computing','<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4"/>'],
  ['database','Data','<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/>'],
  ['math','Mathematics','<path d="M4 4h16M4 20h16M7 4l7 8-7 8m10-12h4m-2-2v4"/>'],
  ['flask','Science','<path d="M9 3h6m-5 0v7L4 19q-1 2 2 2h12q3 0 2-2l-6-9V3M7 15h10"/>'],
  ['globe','Languages & world','<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 6h14M5 18h14"/>'],
  ['design','Design','<path d="m4 17 11-11 3 3L7 20H4v-3Zm9-9 3 3M4 4h5m-5 0v5m16 11h-5m5 0v-5"/>'],
  ['chart','Statistics','<path d="M4 3v18h17M8 16v-5m5 5V6m5 10V9"/>'],
  ['graduation','University','<path d="m2 9 10-5 10 5-10 5L2 9Zm4 2v6q6 5 12 0v-6m4-2v9"/>'],
  ['folder','Folder','<path d="M3 7V4h7l3 3h8v13H3V7Z"/>'],
  ['spark','Ideas','<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>'],
  ['music','Music','<path d="M9 18V5l11-2v13M9 9l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/>'],
  ['leaf','Nature','<path d="M20 3C7 2 2 9 5 16c4 5 13 2 15-13ZM4 21l10-11"/>'],
  ['custom','Emoji or symbol','']
 ].map(([id,label,svg])=>Object.freeze({id,label,svg})));
 const palette=Object.freeze({sage:'#9fb589',peach:'#c69b82',lavender:'#ae9dc5',blue:'#8eaebe',sand:'#bcac84'});
 function validate(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||!icons.some(i=>i.id===raw.icon))throw new Error('Choose a valid icon.');
  const result={icon:raw.icon,iconColor:raw.iconColor??'',nameColor:raw.nameColor??''};
  for(const k of ['iconColor','nameColor'])if(typeof result[k]!=='string'||(result[k]&&!/^#[a-f0-9]{6}$/i.test(result[k])))throw new Error('Choose a valid icon and name color.');
  if(raw.icon==='custom'){if(typeof raw.symbol!=='string'||!raw.symbol.trim()||Array.from(raw.symbol).length>12||/[\x00-\x1f\x7f<>]/.test(raw.symbol))throw new Error('Use an emoji or short symbol (up to 12 characters).');result.symbol=raw.symbol.trim();}
  return result;
 }
 function of(item,fallback='book'){return {icon:fallback,iconColor:'',nameColor:'',...item?.appearance,effectiveIconColor:item?.appearance?.iconColor||palette[item?.color]||palette.sage,effectiveNameColor:item?.appearance?.nameColor||'var(--text)'};}
 return {icons,palette,validate,of};
});
