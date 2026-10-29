'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {select}=require('../../site/js/objectives'),D=require('../../site/js/yard-story-data');
test('only the highest available goal wins; guest tutorial survives missing chapter',()=>{
  const tutorial={id:'walk'},chapter={id:'repair'};
  assert.equal(select([{priority:10,read:()=>tutorial},{priority:100,read:()=>null}]),tutorial);
  assert.equal(select([{priority:10,read:()=>tutorial},{priority:100,read:()=>chapter}]),chapter);
  assert.equal(select([]),null);
});
test('every unfinished stage derives its real destination, without restarting a chapter',()=>{
  for(const stage of ['promise','kit','welcome','repair','call','finale']){
    const s={stage,ending:'home',choices:{kit:'mix'}};
    const goal=D.objective(s);assert.equal(goal.place,D.step(s).place);assert.ok(goal.title);
  }
  assert.equal(D.objective(null).id,'invite');
});
test('completed saves get their own contact; sequel result is finite and honours both choices',()=>{
  for(const [ending,person] of [['home','timur'],['away','artur'],['bridge','leysan']]){
    const s={stage:'done',ending,bonds:{},choices:{kit:'mix',repair:'rookie'}};
    assert.equal(D.objective(s).person,person);assert.equal(D.reunion(s).place,D.people[person].place);
    for(const choice of ['pairs','warmup']){s.reunion={choice,at:1};assert.equal(D.objective(s),null);assert.ok(D.reunion(s).result.includes('Ильдар'));}
  }
});
