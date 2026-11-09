const {randomUUID}=require('node:crypto'),appearance=require('./ui/course-appearance.js');
const TYPES=['courseCustomize','coursePin','courseOrder','collectionCreate','collectionEdit','collectionDelete','collectionPin','collectionOrder'];
function metadata(raw){
 const result={};
 if(raw.appearance!==undefined)result.appearance=appearance.validate(raw.appearance);
 if(raw.pinned!==undefined){if(typeof raw.pinned!=='boolean')throw new Error('Invalid pinned item in backup.');result.pinned=raw.pinned;}
 if(raw.collectionId!==undefined){if(typeof raw.collectionId!=='string'||!raw.collectionId)throw new Error('Invalid course collection in backup.');result.collectionId=raw.collectionId;}
 return result;
}
function collections(raw,checkedID){
 if(!Array.isArray(raw)||raw.length>1000)throw new Error('Use up to 1,000 collections.');const names=new Set();
 return raw.map(c=>{if(!c||typeof c.title!=='string'||!c.title.trim()||c.title.length>200||names.has(c.title.trim().toLowerCase()))throw new Error('Use unique collection names of up to 200 characters.');names.add(c.title.trim().toLowerCase());const m=metadata(c);if(m.collectionId!==undefined)throw new Error('Collections cannot contain other collections.');return {id:checkedID(c.id),title:c.title.trim(),...m};});
}
function destination(data,id){if(id===undefined||id==='')return undefined;if(typeof id!=='string'||!data.collections?.some(c=>c.id===id))throw new Error('Choose an existing collection.');return id;}
function references(data){for(const c of data.courses)if(c.collectionId!==undefined)destination(data,c.collectionId);}
function setPin(item,value){if(typeof value!=='boolean')throw new Error('Choose whether to pin this item.');if(value)item.pinned=true;else delete item.pinned;}
function move(array,item,peers,direction){
 if(!['up','down'].includes(direction))throw new Error('Choose up or down.');const at=peers.indexOf(item),other=peers[at+(direction==='up'?-1:1)];if(!other)return;
 const a=array.indexOf(item),b=array.indexOf(other);[array[a],array[b]]=[array[b],array[a]];
}
function ordered(items){return [...items.filter(c=>c.pinned),...items.filter(c=>!c.pinned)];}
function coursePeers(data,course){return data.courses.filter(c=>course.pinned?c.pinned:!c.pinned&&(c.collectionId||'')===(course.collectionId||''));}
function mutate(data,a){
 const course=data.courses.find(c=>c.id===a.courseId),group=data.collections?.find(c=>c.id===a.collectionId);
 if(a.type.startsWith('course')&&!course)throw new Error('Course not found.');
 if(a.type==='courseCustomize'){
  const style=a.appearance===null?null:appearance.validate(a.appearance),target=destination(data,a.collectionId);
  if(style)course.appearance=style;else delete course.appearance;
  if(target)course.collectionId=target;else delete course.collectionId;return;
 }
 if(a.type==='coursePin'){setPin(course,a.pinned);return;}
 if(a.type==='courseOrder'){move(data.courses,course,coursePeers(data,course),a.direction);return;}
 if(a.type==='collectionCreate'||a.type==='collectionEdit'){
  if(a.type==='collectionEdit'&&!group)throw new Error('Collection not found.');
  if(typeof a.title!=='string'||!a.title.trim()||a.title.length>200)throw new Error('Use a collection name of up to 200 characters.');
  const title=a.title.trim();if(data.collections?.some(c=>c!==group&&c.title.toLowerCase()===title.toLowerCase()))throw new Error('A collection already has that name.');
  const style=a.appearance===undefined?undefined:a.appearance===null?null:appearance.validate(a.appearance);
  if(a.type==='collectionCreate'){if((data.collections?.length||0)>=1000)throw new Error('Use up to 1,000 collections.');(data.collections??=[]).push({id:randomUUID(),title,...(style?{appearance:style}:{})});}
  else {group.title=title;if(style)group.appearance=style;else if(style===null)delete group.appearance;}return;
 }
 if(!group)throw new Error('Collection not found.');
 if(a.type==='collectionPin'){setPin(group,a.pinned);return;}
 if(a.type==='collectionOrder'){move(data.collections,group,data.collections.filter(c=>Boolean(c.pinned)===Boolean(group.pinned)),a.direction);return;}
 if(a.type==='collectionDelete'){for(const c of data.courses)if(c.collectionId===group.id)delete c.collectionId;data.collections=data.collections.filter(c=>c!==group);return;}
 throw new Error('Unknown library organization action.');
}
module.exports={TYPES,metadata,collections,destination,references,mutate,ordered,coursePeers};
