const {test}=require('node:test'),assert=require('node:assert/strict');
const {releaseInfo}=require('../scripts/release.cjs');
test('public release names use the app version without promoting the development stage',()=>{
  for(const stage of ['alpha','beta','official']){
    const result=releaseInfo({version:'1.25.0',quiznetRelease:{stage,number:24}});
    assert.equal(result.name,'Quiznet v1.25.0');assert.equal(result.label,'v1.25.0');
    assert.equal(result.stage,stage);assert.equal(result.number,24);
  }
  assert.equal(releaseInfo({version:'1.26.0',quiznetRelease:{stage:'alpha',number:24}}).name,'Quiznet v1.26.0');
});
test('release metadata rejects missing or malformed versions and invalid stage/counter values',()=>{
  for(const version of [undefined,'','Alpha 24','1.25','1.25.0-preview'])assert.throws(()=>releaseInfo({version,quiznetRelease:{stage:'alpha',number:24}}),/numeric app version/);
  for(const quiznetRelease of [undefined,{stage:'stable',number:1},{stage:'alpha',number:0},{stage:'alpha',number:1.5}])assert.throws(()=>releaseInfo({version:'1.25.0',quiznetRelease}),/valid quiznetRelease/);
});
