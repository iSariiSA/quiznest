const {emptyLibrary,importPacks,mutate}=require('./core.cjs');
const showcase=require('./showcase.json');
// Store.load seeds only when both the library and rolling backup are absent.
// Updates and deliberately emptied existing libraries keep their own material.
function sampleLibrary(){
 const data=emptyLibrary();importPacks(data,[showcase]);
 mutate(data,{type:'collectionCreate',title:'Start here',appearance:{icon:'folder',iconColor:'',nameColor:''}});
 const course=data.courses[0];course.collectionId=data.collections[0].id;course.appearance={icon:'robot',iconColor:'',nameColor:''};
 course.description='One friendly, editable tour of every question type, diagrams, code and math. Choose Practice before starting if you would like feedback after each answer.';
 return data;
}
module.exports={sampleLibrary};
