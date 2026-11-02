// Public names use the app version; the development stage stays internal.
// Stage changes still require the owner's explicit approval.
const STAGES=Object.freeze({alpha:true,beta:true,official:true});
function releaseInfo(manifest=require('../package.json')) {
  const {stage,number}=manifest.quiznetRelease||{};
  if (!Object.hasOwn(STAGES,stage)||!Number.isSafeInteger(number)||number<1) throw new Error('Set a valid quiznetRelease stage and positive release number in package.json.');
  if(typeof manifest.version!=='string'||!/^\d+\.\d+\.\d+$/.test(manifest.version))throw new Error('Set a numeric app version in package.json.');
  const label=`v${manifest.version}`;
  return {stage,number,label,name:`Quiznet ${label}`,internalVersion:manifest.version};
}
module.exports={releaseInfo};
