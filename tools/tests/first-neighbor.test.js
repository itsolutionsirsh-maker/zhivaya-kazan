const {test}=require('node:test'),assert=require('node:assert/strict');
const {advance,ongoing}=require('../../site/js/first-neighbor');
for(const choice of ['photos','board'])test(choice+': choice, help, ending and remembered next-day choice',()=>{
  const original={stage:'invite',home:{x:1,y:2}};
  let s=advance(original,choice,'2026-10-31');assert.equal(original.stage,'invite');assert.ok(ongoing(s));
  assert.equal(advance(s,'thanks','2026-10-31'),s);
  s=advance(s,'help','2026-10-31');assert.equal(s.stage,'return');
  assert.equal(advance(s,'help','2026-10-31'),s);
  s=advance(s,'thanks','2026-10-31');assert.equal(s.choice,choice);assert.ok(!ongoing(s));
  assert.equal(advance(s,'people','2026-10-31'),s);assert.equal(advance(s,'places','2026-10-30'),s);
  s=JSON.parse(JSON.stringify(s));s=advance(s,'places','2026-11-01');assert.equal(s.reunion,'places');
  assert.equal(advance(s,'people','2026-11-02'),s);assert.deepEqual(s.home,original.home);
  assert.ok(!('money' in s));
});
test('decline is final and unknown actions cannot advance',()=>{
  const s={stage:'invite'};assert.equal(advance(s,'help','2026-10-31'),s);
  const skipped=advance(s,'skip','2026-10-31');assert.equal(skipped.stage,'skipped');
  assert.equal(advance(skipped,'photos','2026-11-01'),skipped);assert.ok(!ongoing(skipped));
  assert.equal(advance(null,'photos','2026-11-01'),null);
});
