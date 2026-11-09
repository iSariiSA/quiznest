let appearanceTab='app',quizAppearanceStyleKeys=[];
const quizAppearanceModel=window.QuiznetQuizAppearance;
function appearanceTabs(){return [['app',tr("App")],['quiz',tr("Quiz")],['review',tr("Review")],['editor',tr("Editor")]];}
function currentQuizAppearance(){return quizAppearanceModel.validate(displayPrefs.quizAppearance||{});}
function applyQuizAppearance(){
 const s=currentQuizAppearance(),root=document.documentElement;for(const key of quizAppearanceStyleKeys)root.style.removeProperty(key);
 const values=quizAppearanceModel.variables(s);quizAppearanceStyleKeys=Object.keys(values);for(const [key,value] of Object.entries(values))root.style.setProperty(key,value);
 for(const [key,value] of Object.entries(s))root.dataset['qa'+key[0].toUpperCase()+key.slice(1)]=quizAppearanceModel.colors.includes(key)?(value?'custom':'app'):String(value);
}
function qaSelect(key,label,choices,description=''){const s=currentQuizAppearance();return settingsRow(label,'qa-'+key,settingsOptions('qa-'+key,choices,s[key],`data-qa-field="${key}"`),description);}
function qaSize(key,label){return qaSelect(key,label,quizAppearanceModel.numbers[key].map(n=>[n,n?`${n} px`:tr("Follow app")]));}
function qaFont(key,label){return qaSelect(key,label,[['app',tr("Follow app")],['sans','Arial'],['serif','Georgia'],['mono','Consolas']]);}
function qaShape(key,label){return qaSelect(key,label,[['app',tr("Follow app")],['square',tr("Squares")],['rounded',tr("Rounded squares")],['circle',tr("Circles")]]);}
function qaLine(key,label){return qaSelect(key,label,quizAppearanceModel.numbers[key].map(n=>[n,n?String(n):tr("Follow app")]));}
function qaColor(key,label){
 const s=currentQuizAppearance(),light=document.documentElement.dataset.theme==='light',theme=getComputedStyle(document.documentElement),fallback={questionColor:theme.getPropertyValue("--text").trim(),answerColor:theme.getPropertyValue("--text").trim(),quizBackground:theme.getPropertyValue("--bg").trim(),answerBackground:theme.getPropertyValue("--surface").trim(),editorColor:theme.getPropertyValue("--text").trim(),editorBackground:light?'#ffffff':"#191e25",currentColor:"#80b7da",answeredColor:'#a0bb89',flaggedColor:'#edbd6e',unansweredColor:'#cd8f99',reviewTextColor:theme.getPropertyValue("--text").trim(),reviewAnswerColor:theme.getPropertyValue("--text").trim(),reviewBackground:theme.getPropertyValue("--surface").trim(),reviewCorrectColor:"#8fbd9a",reviewWrongColor:'#d68e95'};
 return settingsRow(label,'qa-'+key,`<div class="qa-color-control"><input type="color" id="qa-${key}" data-qa-field="${key}" value="${esc(s[key]||fallback[key])}"><label><input type="checkbox" id="qa-${key}-default" data-qa-default="${key}" ${!s[key]?'checked':''}>${trHtml("Use app color",{})}</label></div>`);
}

