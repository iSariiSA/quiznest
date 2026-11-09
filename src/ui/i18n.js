(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./languages.js'):root.QuiznetLanguages);if(typeof module==='object'&&module.exports)module.exports=api;else root.QuiznetI18n=api;})(globalThis,languages=>{
 const catalogs=new Map(),pluralRules=new Map(),numberFormats=new Map(),sources=new Map();let language='en';
 const supported=id=>languages.some(item=>item.id===id);
 const info=(id=language)=>languages.find(item=>item.id===id)||languages[0];
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function register(id,messages){if(!supported(id)||!messages||typeof messages!=='object'||Array.isArray(messages))throw new Error('Choose a supported interface language.');for(const [key,value] of Object.entries(messages)){if(!key||!(typeof value==='string'&&!/[<>]/.test(value)||value&&typeof value==='object'&&!Array.isArray(value)&&typeof value.other==='string'&&Object.entries(value).every(([category,text])=>['zero','one','two','few','many','other'].includes(category)&&typeof text==='string'&&!/[<>]/.test(text))))throw new Error('Invalid language catalog.');}catalogs.set(id,Object.freeze({...messages}));sources.delete(id);}
 function setLanguage(id){if(!supported(id)||!catalogs.has(id))throw new Error('Choose a supported interface language.');language=id;if(!sources.has(id))sources.set(id,new Map(Object.entries(catalogs.get(id)).filter(([,value])=>typeof value==='string').map(([key,value])=>[value,key])));}
 function pattern(key,params,id){let value=catalogs.get(id)?.[key]??catalogs.get('en')?.[key]??key;if(typeof value==='object'){if(!Number.isFinite(params.count))throw new Error('A plural message needs a numeric count.');if(!pluralRules.has(id))pluralRules.set(id,new Intl.PluralRules(info(id).locale));value=value[pluralRules.get(id).select(params.count)]??value.other;}return value;}
 function text(key,params={},id=language){return String(pattern(key,params,id)).replace(/\{([a-zA-Z0-9_]+)\}/g,(token,name)=>Object.hasOwn(params,name)?String(params[name]):token);}
 // Catalog text is always escaped. Values here are already-rendered fragments from
 // trusted UI templates; study content keeps its existing escaping/sanitization.
 function html(key,params={}){return String(pattern(key,params,language)).split(/(\{[a-zA-Z0-9_]+\})/).map(part=>{const name=part.slice(1,-1);if(!/^\{[a-zA-Z0-9_]+\}$/.test(part)||!Object.hasOwn(params,name))return escape(part);const value=String(params[name]);return value.includes('<')?value:value.replace(/[>"']/g,c=>({'>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}).join('');}
 function number(value,id=language){if(!numberFormats.has(id))numberFormats.set(id,new Intl.NumberFormat(info(id).locale));return numberFormats.get(id).format(value);}
 function count(value,noun){const key='count.'+noun,params={count:value,n:number(value)};if(catalogs.get('en')?.[key])return text(key,params);return `${number(value)} ${noun}${value===1?'':'s'}`;}
 function date(value,options={}){return new Intl.DateTimeFormat(info().locale,{calendar:'gregory',...options}).format(new Date(value));}
 function digit(key){const normalized=String(key).replace(/[٠-٩]/g,value=>String(value.charCodeAt(0)-0x660)).replace(/[۰-۹]/g,value=>String(value.charCodeAt(0)-0x6f0));return /^[1-9]$/.test(normalized)?Number(normalized):null;}
 const searchText=value=>String(value).normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase(info().locale);
 return {languages,supported,info,register,setLanguage,text,html,number,count,date,digit,searchText,source:value=>sources.get(language)?.get(value)||value,has:id=>catalogs.has(id),current:()=>language,direction:()=>info().direction};
});
