let libraryScope={kind:'all',id:''},courseArrangePage=0,collectionArrangePage=0;
const libraryCollections=()=>[...(data.collections||[]).filter(c=>c.pinned),...(data.collections||[]).filter(c=>!c.pinned)];
function libraryGlyph(item,fallback='book'){
 const a=window.QuiznetAppearance.of(item,fallback),symbol=a.icon==='custom'?esc(a.symbol||'?'):`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${window.QuiznetAppearance.icons.find(i=>i.id===a.icon)?.svg||''}</svg>`;
 const color=item?.appearance?.iconColor?a.effectiveIconColor:`var(--course-icon-${Object.hasOwn(window.QuiznetAppearance.palette,item?.color)?item.color:'sage'},${a.effectiveIconColor})`;
 return `<span class="library-glyph" style="color:${color}" aria-hidden="true">${symbol}</span>`;
}
function libraryName(item,title=item.title){const a=window.QuiznetAppearance.of(item);return `<span class="library-name" style="color:${a.effectiveNameColor}">${esc(title)}</span>`;}
function libraryIdentity(item,fallback='book'){return `${libraryGlyph(item,fallback)}${libraryName(item)}`;}
function currentCollection(){return libraryScope.kind==='collection'?(data.collections||[]).find(c=>c.id===libraryScope.id):null;}
function scopeCourses(){
 if(libraryScope.kind==='collection'&&!currentCollection())libraryScope={kind:'all',id:''};
 const courses=data.courses.filter(c=>libraryScope.kind==='all'||(libraryScope.kind==='pinned'?c.pinned:libraryScope.kind==='unassigned'?!c.collectionId:c.collectionId===libraryScope.id));
 return [...courses.filter(c=>c.pinned),...libraryCollections().flatMap(g=>courses.filter(c=>!c.pinned&&c.collectionId===g.id)),...courses.filter(c=>!c.pinned&&!c.collectionId)];
}
function libraryScopeTitle(){return currentCollection()?.title||(libraryScope.kind==='unassigned'?tr("Unsorted courses"):tr("Courses"));}
function libraryHeading(c,u,title){const item=c&&!u?c:!c?currentCollection():null;return `<h1 class="library-heading-title">${item?libraryIdentity(item,c?'book':'folder'):esc(title)}</h1>`;}
function collectionSelect(name,value='',includeAll=false){return `<select ${name}>${includeAll?`<option value="@all" data-kind="all" ${libraryScope.kind==='all'?'selected':''}>${trHtml("All collections",{})}</option>`:''}<option value="" data-kind="unassigned" ${value===''&&(!includeAll||libraryScope.kind==='unassigned')?'selected':''}>${trHtml("Unsorted courses",{})}</option>${libraryCollections().map(c=>`<option value="${esc(c.id)}" data-kind="collection" ${value===c.id?'selected':''}>${esc(c.title)}</option>`).join('')}</select>`;}
function libraryIconButton(mark,action,label,attrs='',cls='secondary'){return button(icon(mark),action,`library-icon-button ${cls}`,`aria-label="${esc(label)}" title="${esc(label)}" ${attrs}`);}
function libraryToolbar(){
 scopeCourses();
 const tab=(label,kind,id='')=>button(esc(label),'libraryScope','library-tab',`data-kind="${kind}" data-collection="${esc(id)}" aria-pressed="${libraryScope.kind===kind&&(kind!=='collection'||libraryScope.id===id)}"`);
 return `<header class="topbar library-topbar"><nav class="library-collection-tabs" aria-label="${trHtml("Collections",{})}">${tab(tr("All"),'all')}${tab(tr("Pinned"),'pinned')}${libraryCollections().map(g=>tab(g.title,'collection',g.id)).join('')}${(data.collections||[]).length&&data.courses.some(c=>!c.collectionId)?tab(tr("Unsorted"),'unassigned'):''}</nav><div class="top-actions">${libraryIconButton('search','search',tr("Search library"),'aria-keyshortcuts="Control+k"')}${libraryIconButton(libraryModes().find(([id])=>id===libraryMode)[2],'libraryViewMenu',tr("Library view"),'aria-haspopup="menu" aria-expanded="false"')}${libraryIconButton('plus','libraryCreateMenu',tr("Add to library"),'aria-haspopup="menu" aria-expanded="false"','primary')}${libraryIconButton('more','libraryMenu',tr("Library actions"),'aria-haspopup="menu" aria-expanded="false"','text')}${libraryIconButton('settings','settings',tr("Settings"),'','text header-settings')}</div></header>`;
}
function libraryPin(c){return c.pinned?`<span class="course-pin-mark" role="img" aria-label="${trHtml("Pinned",{})}">${icon('pin')}</span>`:'';}
function libraryCourseOptions(c){return libraryIconButton('more','courseMenu',tr("Options for {value0}",{value0:c.title}),`data-course="${esc(c.id)}" aria-haspopup="menu" aria-expanded="false"`,'text course-options');}
function libraryCourseLink(c){return `<div class="course-row"><button class="row-link course-identity" ${act('course',`data-id="${esc(c.id)}"`)} aria-label="${esc(c.title)}">${libraryMode!=='names'?libraryGlyph(c):''}${libraryName(c)}${libraryPin(c)}</button></div>`;}
function courseTable(courses){
 return `<div class="library-detail-scroll" tabindex="0" role="region" aria-label="${trHtml("Course details",{})}"><table class="library-table library-details"><thead><tr><th scope="col">${trHtml("Course",{})}</th><th scope="col">${trHtml("Collection",{})}</th><th scope="col">${trHtml("Study focus",{})}</th><th scope="col">${trHtml("Units",{})}</th><th scope="col">${trHtml("Quizzes",{})}</th><th scope="col"><span class="sr-only">${trHtml("Actions",{})}</span></th></tr></thead><tbody>${courses.map(c=>{const s=stats(c),group=data.collections?.find(g=>g.id===c.collectionId);return `<tr class="library-course"><td>${libraryCourseLink(c)}</td><td>${esc(group?.title||tr("Unsorted"))}</td><td>${esc(tr(window.QuiznetCourseFocus.of(c).label))}</td><td>${s.units}</td><td>${s.quizzes}</td><td>${libraryCourseOptions(c)}</td></tr>`;}).join('')}</tbody></table></div>`;
}
function libraryView(){
 const courses=scopeCourses(),group=currentCollection();
 const heading=group?`<div class="collection-heading library-collection-heading"><h1>${libraryIdentity(group,'folder')}</h1>${libraryIconButton('more','collectionMenu',tr("Collection actions"),`data-collection="${esc(group.id)}" aria-haspopup="menu" aria-expanded="false"`,'text')}</div>`:`<h1 class="sr-only">${trHtml("Courses",{})}</h1>`;
 const body=!courses.length?(libraryScope.kind==='pinned'?`<p class="library-empty muted">${trHtml("Pin a course from its options menu to keep it here.",{})}</p>`:empty(group?tr("No courses in this collection."):tr("No courses here yet."),'newCourse',tr("New course"))):libraryMode==='details'?courseTable(courses):`<div class="library-courses library-${libraryMode}">${courses.map(c=>`<article class="library-course">${libraryCourseLink(c)}${libraryCourseOptions(c)}</article>`).join('')}</div>`;
 return `${resumeBanner()}${heading}${body}`;
}
function appearanceFields(item,fallback='book'){
 const a=window.QuiznetAppearance.of(item,fallback);
 return `<fieldset class="appearance-fields"><legend>${trHtml("Icon and colors",{})}</legend><div class="appearance-preview" aria-label="${trHtml("Appearance preview",{})}">${libraryIdentity({...item,appearance:a})}</div><label>${trHtml("Icon",{})}<select name="icon" aria-label="${trHtml("Icon",{})}" data-appearance>${window.QuiznetAppearance.icons.map(i=>`<option value="${i.id}" ${a.icon===i.id?'selected':''}>${esc(tr(i.label))}</option>`).join('')}</select></label><label class="appearance-symbol" ${a.icon==='custom'?'':'hidden'}>${trHtml("Emoji or symbol",{})}<input name="symbol" data-appearance maxlength="24" value="${esc(a.symbol||'')}" placeholder="🤖"></label><div class="appearance-colors"><div><label>${trHtml("Icon color",{})}<input type="color" name="iconColor" data-appearance value="${a.effectiveIconColor}"></label><label class="appearance-check"><input type="checkbox" name="defaultIconColor" data-appearance ${!a.iconColor?'checked':''}>${trHtml("Use default icon color",{})}</label></div><div><label>${trHtml("Name color",{})}<input type="color" name="nameColor" data-appearance value="${a.nameColor||'#e8ebf0'}"></label><label class="appearance-check"><input type="checkbox" name="defaultNameColor" data-appearance ${!a.nameColor?'checked':''}>${trHtml("Use theme text color",{})}</label></div></div><p class="muted">${trHtml("Emoji use their own colors. Built-in icons use your chosen icon color.",{})}</p></fieldset>`;
}
function readAppearance(values){return {icon:values.get('icon'),symbol:values.get('symbol')||'',iconColor:values.has('defaultIconColor')?'':values.get('iconColor'),nameColor:values.has('defaultNameColor')?'':values.get('nameColor')};}
function updateAppearancePreview(e){
 if(!e.target.matches('[data-appearance]'))return;const form=e.target.closest('form');if(!form)return;
 if(e.target.type==='color')form.elements[e.target.name==='iconColor'?'defaultIconColor':'defaultNameColor'].checked=false;
 const a=readAppearance(new FormData(form));form.querySelector('.appearance-symbol').hidden=a.icon!=='custom';
 const title=form.elements.title?.value||modal?.appearanceTitle||tr("Preview");form.querySelector('.appearance-preview').innerHTML=libraryIdentity({title,color:modal?.appearanceColor,appearance:a});
}
document.addEventListener('input',updateAppearancePreview);document.addEventListener('change',updateAppearancePreview);
function customizeCourse(courseId){
 const c=courseBy(courseId);if(!c)throw new Error(tr("Course not found."));
 showModal(tr("Appearance & collection"),`<p class="modal-intro"><strong>${esc(c.title)}</strong></p><label>${trHtml("Collection{value1}",{value1:collectionSelect('name="collectionId"',c.collectionId||'')})}</label>${appearanceFields(c)}`,`${button(tr("Reset appearance"),'resetCourseAppearance','text',`data-course="${esc(c.id)}"`)}${modalButtons(tr("Save changes"))}`,async values=>{
  await change({type:'courseCustomize',courseId,appearance:readAppearance(values),collectionId:values.get('collectionId')});
  closeModal();render();toast(tr("Course appearance and collection saved."));
 });modal.appearanceTitle=c.title;modal.appearanceColor=c.color;
}
function editCollection(collectionId){
 const c=collectionId?(data.collections||[]).find(c=>c.id===collectionId):null;if(collectionId&&!c)throw new Error(tr("Collection not found."));
 const item=c||{title:tr("New collection"),appearance:{icon:'folder'}};
 showModal(c?tr("Edit collection"):tr("New collection"),`<label>${trHtml("Collection name",{})}<input name="title" required maxlength="200" value="${esc(c?.title||'')}" placeholder="${trHtml("AI & Robotics",{})}"></label>${appearanceFields(item,'folder')}`,modalButtons(c?tr("Save collection"):tr("Create collection")),async values=>{
  await change({type:c?'collectionEdit':'collectionCreate',collectionId,title:values.get('title'),appearance:readAppearance(values)});closeModal();render();toast(c?tr("Collection saved."):tr("Collection created."));
 });modal.appearanceTitle=item.title;
}
function createLibraryCourse(){showModal(tr("New course"),`<label>${trHtml("Course name",{})}<input name="title" placeholder="${trHtml("Biology",{})}" maxlength="200" required></label><label>${trHtml("Collection{value0}",{value0:collectionSelect('name="collectionId"',currentCollection()?.id||'')})}</label>`,modalButtons(tr("Create")),async values=>{await change({type:'createCourse',title:values.get('title'),collectionId:values.get('collectionId')});await navigate('library',data.courses.at(-1).id);});}
function organizationPager(page,total,action){const pages=Math.max(1,Math.ceil(total/20));return pages>1?`<div class="button-row organization-pager">${button(tr("Previous"),action,'secondary',`data-page="${page-1}" ${page===0?'disabled':''}`)}<span>${page+1} / ${pages}</span>${button(tr("Next"),action,'secondary',`data-page="${page+1}" ${page===pages-1?'disabled':''}`)}</div>`:'';}
function organizeCourses(page=courseArrangePage){
 const courses=[...data.courses.filter(c=>c.pinned),...data.courses.filter(c=>!c.pinned)];courseArrangePage=Math.max(0,Math.min(page,Math.ceil(courses.length/20)-1));
 showModal(tr("Organize courses"),`<p class="muted">${trHtml("Pin courses to keep them above collections. Move pinned courses among pinned items; other courses move within their collection.",{})}</p><div class="organization-list">${courses.slice(courseArrangePage*20,courseArrangePage*20+20).map(c=>{
  const peers=data.courses.filter(p=>c.pinned?p.pinned:!p.pinned&&(p.collectionId||'')===(c.collectionId||'')),at=peers.indexOf(c),group=data.collections?.find(g=>g.id===c.collectionId);
  return `<article><div class="organization-identity">${libraryIdentity(c)}<small>${c.pinned?tr("★ Pinned · "):''}${esc(group?.title||tr("Unsorted courses"))}</small></div><div class="button-row">${button('↑','orderCourse','secondary',`data-course="${esc(c.id)}" data-direction="up" aria-label="${trHtml("Move {value1} up",{value1:esc(c.title)})}" ${at===0?'disabled':''}`)}${button('↓','orderCourse','secondary',`data-course="${esc(c.id)}" data-direction="down" aria-label="${trHtml("Move {value1} down",{value1:esc(c.title)})}" ${at===peers.length-1?'disabled':''}`)}${button(c.pinned?tr("Unpin"):tr("Pin"),'pinCourse','secondary',`data-course="${esc(c.id)}" data-pinned="${!c.pinned}"`)}${button(tr("Appearance & collection…"),'customizeCourse','text',`data-course="${esc(c.id)}"`)}</div></article>`;
 }).join('')||`<p>${trHtml("No courses yet.",{})}</p>`}</div>${organizationPager(courseArrangePage,courses.length,'organizeCourses')}`,button(tr("Close"),'closeModal','primary'),null,true);modal.organization='courses';
}
function manageCollections(page=collectionArrangePage){
 const groups=libraryCollections();collectionArrangePage=Math.max(0,Math.min(page,Math.ceil(groups.length/20)-1));
 showModal(tr("Manage collections"),`<p class="muted">${trHtml("Collections hold courses. Removing a collection returns its courses to Unsorted courses.",{})}</p><div class="organization-list">${groups.slice(collectionArrangePage*20,collectionArrangePage*20+20).map(c=>{const peers=(data.collections||[]).filter(p=>Boolean(p.pinned)===Boolean(c.pinned)),at=peers.indexOf(c);return `<article><div class="organization-identity">${libraryIdentity(c,'folder')}<small>${c.pinned?tr("★ Pinned · "):''}${plural(data.courses.filter(q=>q.collectionId===c.id).length,'course')}</small></div><div class="button-row">${button('↑','orderCollection','secondary',`data-collection="${esc(c.id)}" data-direction="up" aria-label="${trHtml("Move {value1} up",{value1:esc(c.title)})}" ${at===0?'disabled':''}`)}${button('↓','orderCollection','secondary',`data-collection="${esc(c.id)}" data-direction="down" aria-label="${trHtml("Move {value1} down",{value1:esc(c.title)})}" ${at===peers.length-1?'disabled':''}`)}${button(c.pinned?tr("Unpin"):tr("Pin"),'pinCollection','secondary',`data-collection="${esc(c.id)}" data-pinned="${!c.pinned}"`)}${button(tr("Edit…"),'editCollection','text',`data-collection="${esc(c.id)}"`)}${button(tr("Remove…"),'removeCollection','text',`data-collection="${esc(c.id)}"`)}</div></article>`;}).join('')||`<p>${trHtml("No collections yet.",{})}</p>`}</div>${organizationPager(collectionArrangePage,groups.length,'manageCollections')}`,`${button(tr("New collection…"),'newCollection','secondary')}${button(tr("Close"),'closeModal','primary')}`,null,true);modal.organization='collections';
}
function removeCollection(id){const c=data.collections?.find(c=>c.id===id);if(!c)return;showModal(tr("Remove collection?"),`<p>${trHtml("Remove",{})} <strong>${esc(c.title)}</strong>${trHtml("? Its courses move to Unsorted courses, keeping all quizzes and progress. A recovery snapshot is saved first.",{})}</p>`,modalButtons(tr("Remove collection")),async()=>{await change({type:'collectionDelete',collectionId:id});closeModal();render();toast(tr("Collection removed. Its courses are preserved."));});}
function collectionMenu(b){const c=data.collections?.find(c=>c.id===b.dataset.collection);if(!c)return;const attrs=`data-collection="${esc(c.id)}"`;showMenu(b,[[tr("Edit collection…"),'editCollection',attrs],[c.pinned?tr("Unpin collection"):tr("Pin collection"),'pinCollection',`${attrs} data-pinned="${!c.pinned}"`],[tr("Organize collections…"),'manageCollections'],[tr("Remove collection…"),'removeCollection',attrs,true]]);}
async function organizeAction(action,b){
 const mode=modal?.organization;
 if(action==='pinCourse')await change({type:'coursePin',courseId:b.dataset.course,pinned:b.dataset.pinned==='true'});
 if(action==='orderCourse')await change({type:'courseOrder',courseId:b.dataset.course,direction:b.dataset.direction});
 if(action==='pinCollection')await change({type:'collectionPin',collectionId:b.dataset.collection,pinned:b.dataset.pinned==='true'});
 if(action==='orderCollection')await change({type:'collectionOrder',collectionId:b.dataset.collection,direction:b.dataset.direction});
 render();if(mode==='courses')organizeCourses();else if(mode==='collections')manageCollections();else [...document.querySelectorAll('[data-action="courseMenu"]')].find(el=>el.dataset.course===b.dataset.course)?.focus();
}

