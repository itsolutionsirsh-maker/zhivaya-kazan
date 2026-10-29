'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const R=require('../../site/js/territory-core'),Lib=require('../../server/node/territories');
const centers={vahitovsky:[49.1065,55.7989],aviastroitelny:[49.109,55.855],moskovsky:[49.072,55.827],novosavinovsky:[49.148,55.827],kirovsky:[49.043,55.81],sovetsky:[49.205,55.785],privolzhsky:[49.214,55.746]};
const meta={lon0:49.114,lat0:55.793,mlon:62500,mlat:111320};
test('all seven real polygons classify known places and round-trip both map projections',()=>{
  assert.equal(R.data.districts.length,7);for(const [id,ll] of Object.entries(centers)){
    assert.equal(R.district(...ll).id,id);assert.ok(R.borderDistance(R.get(id),...ll)>20);
    for(const m of [meta,{lon0:49.12,lat0:55.78,mlon:62400,mlat:111000}])assert.equal(R.at((ll[0]-m.lon0)*m.mlon,-(ll[1]-m.lat0)*m.mlat,m).id,id);
  }
  for(const ll of [[0,0],[49,56],[49.5,55.7],[NaN,55],[49,Infinity]])assert.equal(R.district(...ll),null);
  assert.equal(R.at(0,0,{...meta,mlon:0}),null);
});
test('source rings are closed, keep separate pieces and deterministic boundary ownership',()=>{
  assert.equal(R.get('aviastroitelny').outer.length,2);assert.equal(R.get('sovetsky').outer.length,3);
  for(const d of R.data.districts){assert.match(d.source.sha256,/^[a-f0-9]{64}$/);
    for(const ring of d.outer){assert.deepEqual(ring[0],ring.at(-1));assert.ok(ring.length>=4);assert.equal(R.contains(d,...ring[0]),true);
      assert.ok(R.district(...ring[0]));assert.ok(R.borderDistance(d,...ring[0])<.001);}
  }
});
test('holes, islands, edges, invalid values and no nearest-center fallback',()=>{
  const box=(x,y,n)=>[[x,y],[x+n,y],[x+n,y+n],[x,y+n],[x,y]];
  const d={bbox:[0,0,20,20],outer:[box(0,0,10),box(15,15,5)],inner:[box(3,3,2)]};
  assert.ok(R.contains(d,1,1));assert.ok(R.contains(d,17,17));assert.ok(R.contains(d,0,2));
  assert.equal(R.contains(d,4,4),false);assert.equal(R.contains(d,3,4),false);assert.equal(R.contains(d,12,12),false);
});
test('home advantage is 20 percent, foreign/neutral base strength and no guaranteed 1v2 win',()=>{
  assert.equal(R.multiplier('kirovsky','kirovsky'),1.2);assert.equal(R.multiplier('kirovsky','vahitovsky'),1);
  assert.equal(R.multiplier(null,'kirovsky'),1);assert.equal(R.multiplier('fake','fake'),1);
  const home=R.encounterPower('kirovsky','kirovsky'),away=R.encounterPower('kirovsky','vahitovsky');
  assert.ok(home.chance>away.chance&&home.chance<1);assert.equal(away.locals,96);
});
const factories={json:()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'zk-territories-')),file=path.join(dir,'states.json');return {be:Lib.jsonBackend(file,fs),reload:()=>Lib.jsonBackend(file,fs),close:()=>fs.rmSync(dir,{recursive:true,force:true})};}};
try{const {DatabaseSync}=require('node:sqlite');factories.sqlite=()=>{const db=new DatabaseSync(':memory:');return {be:Lib.sqliteBackend(db),reload:()=>Lib.sqliteBackend(db),close:()=>db.close()};};}catch{}
for(const [name,factory] of Object.entries(factories)){
  function setup(t,roll=.2){const b=factory();t.after(b.close);let time=1800000000000,n=0;
    let game=Lib.Territories(b.be,{now:()=>time,random:()=>roll,uid:()=>String(++n)});
    function pose(id='vahitovsky',overrides={}){const ll=centers[id];return {x:(ll[0]-meta.lon0)*meta.mlon,y:-(ll[1]-meta.lat0)*meta.mlat,t:time,...overrides};}
    const status=(key='alice',p=pose())=>game.call(key,{op:'status'},p,meta);
    const call=(op,extra={},p=pose(),key='alice')=>game.call(key,{op,request:(++n).toString(16).padStart(24,'0'),rev:status(key,p).state.rev,...extra},p,meta);
    return {status,call,pose,advance:ms=>{time+=ms;},reload:()=>{game=Lib.Territories(b.reload(),{now:()=>time,random:()=>.99,uid:()=>String(++n)});},reset:()=>game.reset('alice')};
  }
  test(name+': neutral, joining own district, separate accounts and invalid presence',t=>{
    const f=setup(t);assert.equal(f.status().state.member,null);assert.equal(f.call('start').err,'neutral');
    assert.equal(f.call('join',{member:'kirovsky'}).err,'visit_home');
    for(const p of [null,f.pose('vahitovsky',{t:0}),f.pose('vahitovsky',{b:1}),f.pose('vahitovsky',{room:'cafe'}),f.pose('vahitovsky',{vehicle:'taxi'}),f.pose('vahitovsky',{x:NaN})])assert.equal(f.call('join',{member:'vahitovsky'},p).err,'visit_home');
    assert.equal(f.call('join',{member:'__proto__'}).err,'faction');
    assert.equal(f.call('join',{member:'vahitovsky'}).ok,1);assert.equal(f.status('bob').state.member,null);assert.equal(f.call('start').err,'home');
    assert.equal(f.call('join',{member:'kirovsky'},f.pose('kirovsky')).err,'already_member');
  });
  test(name+': full peaceful meeting, persisted result, no double rewards or stale mutation',t=>{
    const f=setup(t);f.call('join',{member:'vahitovsky'});let r=f.call('start',{},f.pose('kirovsky'));const id=r.state.active.id;
    assert.equal(r.state.active.roll,undefined);assert.equal(r.state.active.power.player,70);assert.equal(r.state.active.power.locals,96);
    assert.equal(f.call('choice',{encounter:id,choice:'pass'},f.pose('kirovsky')).err,'choice');
    f.call('choice',{encounter:id,choice:'talk'},f.pose('kirovsky'));f.reload();assert.equal(f.status().state.active.phase,'talk');
    const request='f'.repeat(24),rev=f.status().state.rev;
    r=f.call('choice',{encounter:id,choice:'pass',request,rev},f.pose('kirovsky'));assert.equal(r.state.standing,1);assert.equal(r.state.history[0].result,'peace');
    r=f.call('choice',{encounter:id,choice:'pass',request,rev},f.pose('kirovsky'));assert.equal(r.ok,1);assert.equal(r.state.standing,1);assert.equal(r.state.history.length,1);
    assert.equal(f.call('leave',{rev}).err,'conflict');assert.equal(f.call('leave',{request}).err,'request_reused');
    assert.equal(f.call('start',{},f.pose('kirovsky')).err,'encounter_cooldown');
    f.reload();assert.equal(f.status().state.standing,1);
  });
  test(name+': battle roll frozen across reload, home hopping rejected and loss is complete',t=>{
    const f=setup(t,.9);f.call('join',{member:'vahitovsky'});let e=f.call('start',{},f.pose('kirovsky')).state.active;
    assert.equal(f.call('choice',{encounter:e.id,choice:'stand'},f.pose()).err,'return_to_meeting');
    assert.equal(f.call('choice',{encounter:e.id,choice:'stand'},f.pose('kirovsky',{x:e.x+90})).err,'return_to_meeting');
    f.reload();const r=f.call('choice',{encounter:e.id,choice:'stand'},f.pose('kirovsky'));assert.equal(r.state.history[0].result,'lost');assert.equal(r.state.active,null);
  });
  test(name+': successful challenge, leaving neutral even offline, cooldown and expiry',t=>{
    const f=setup(t,0);f.call('join',{member:'vahitovsky'});let e=f.call('start',{},f.pose('kirovsky')).state.active;
    assert.equal(f.call('choice',{encounter:e.id,choice:'stand'},f.pose('kirovsky')).state.standing,2);
    assert.equal(f.call('leave',{},null).state.member,null);assert.equal(f.call('join',{member:'kirovsky'},f.pose('kirovsky')).err,'switch_cooldown');
    f.advance(Lib.SWITCH_MS+1);f.call('join',{member:'kirovsky'},f.pose('kirovsky'));e=f.call('start').state.active;assert.ok(e);
    f.advance(Lib.EXPIRE_MS+1);assert.equal(f.status().state.history[0].result,'expired');assert.equal(f.status().state.active,null);
    const rev=f.status().state.rev;f.reset();assert.equal(f.status().state.member,null);assert.ok(f.status().state.rev>rev);
  });
  test(name+': leaving an encounter is safe, two tabs cannot fork active encounters',t=>{
    const f=setup(t);f.call('join',{member:'vahitovsky'});const rev=f.status().state.rev;
    const e=f.call('start',{rev},f.pose('kirovsky')).state.active;
    assert.equal(f.call('start',{rev},f.pose('sovetsky')).err,'conflict');
    const r=f.call('choice',{encounter:e.id,choice:'leave'},null);assert.equal(r.state.history[0].result,'left');assert.equal(r.state.member,'vahitovsky');
  });
  test(name+': home training applies player bonus, foreign training rejected, no reputation farming',t=>{
    const f=setup(t,0);f.call('join',{member:'vahitovsky'});
    assert.equal(f.call('start',{mode:'training'},f.pose('kirovsky')).err,'visit_home');
    const e=f.call('start',{mode:'training'}).state.active;
    assert.equal(e.power.player,84);assert.equal(e.power.locals,80);assert.equal(e.training,true);
    const r=f.call('choice',{encounter:e.id,choice:'stand'});assert.equal(r.state.history[0].result,'won');assert.equal(r.state.standing,0);
    assert.equal(f.call('start',{mode:'training'}).err,'encounter_cooldown');
    assert.ok(f.call('start',{},f.pose('kirovsky')).state.active,'practice does not delay the foreign encounter');
  });
}
