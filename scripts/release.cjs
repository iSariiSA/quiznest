// Repository release names are independent of the Windows installer version.
// Stage changes require the owner's explicit approval.
const LABELS=Object.freeze({alpha:'Alpha',beta:'Beta',official:'Official Release'});
function releaseInfo(manifest=require('../package.json')) {
  const {stage,number}=manifest.quiznetRelease||{};
  if (!Object.hasOwn(LABELS,stage)||!Number.isSafeInteger(number)||number<1) throw new Error('Set a valid quiznetRelease stage and positive release number in package.json.');
  const label=stage==='official'&&number===1?LABELS[stage]:`${LABELS[stage]} ${number}`;
  return {stage,number,label,name:`Quiznet ${label}`,internalVersion:manifest.version};
}
module.exports={releaseInfo};
