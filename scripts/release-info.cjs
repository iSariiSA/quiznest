const {releaseInfo}=require('./release.cjs');
const release=releaseInfo();
console.log(release.name);
