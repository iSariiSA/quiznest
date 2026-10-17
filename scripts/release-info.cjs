const {releaseInfo}=require('./release.cjs');
const release=releaseInfo();
console.log(`${release.name} (installer build ${release.internalVersion})`);
