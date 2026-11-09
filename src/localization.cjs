const i18n=require('./ui/i18n.js');
function text(language,message,params={}){const id=i18n.supported(language)?language:'en';if(!i18n.has('en'))i18n.register('en',require('./ui/locales/en.json'));if(!i18n.has(id))i18n.register(id,require('./ui/locales/'+id+'.json'));return i18n.text(message,params,id);}
function dialogOptions(language,options,kind){return {...options,...(options.title?{title:text(language,options.title)}:{}),buttonLabel:text(language,options.buttonLabel||(kind==='showOpenDialog'?'Open':'Save')),...(options.filters?{filters:options.filters.map(filter=>({...filter,name:text(language,filter.name)}))}:{})};}
module.exports={text,dialogOptions};
