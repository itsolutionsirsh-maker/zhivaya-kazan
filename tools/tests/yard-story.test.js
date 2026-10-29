'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const Lib=require('../../server/node/territories'),D=require('../../site/js/yard-story-data'),R=require('../../site/js/territory-core');
const map=require('../../site/kazan.json'),meta=map.meta;
const factories={json:()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'zk-yard-')),file=path.join(dir,'state.json');return {be:()=>Lib.jsonBackend(file,fs),close:()=>fs.rmSync(dir,{recursive:true,force:true})};},sqlite:()=>{const {DatabaseSync}=require('node:sqlite'),db=new DatabaseSync(':memory:');return {be:()=>Lib.sqliteBackend(db),close:()=>db.close()};}};
test('v1 rows without a chapter preserve outstanding request retries across deployment',()=>{
  const id='a'.repeat(24);let row={rev:1,member:'vahitovsky',standing:0,switchAt:100,nextAt:0,practiceAt:0,active:null,history:[],requests:[{id,signature:JSON.stringify(['join','vahitovsky',null,null,null])}]};
  const g=Lib.Territories({get:()=>structuredClone(row),put:(k,s)=>{row=structuredClone(s);}});
  const r=g.call('old',{op:'join',member:'vahitovsky',request:id,rev:0},null,meta);assert.equal(r.ok,1);assert.equal(r.state.rev,1);
  const s=g.call('old',{op:'story',step:'invite',choice:'accept',request:'b'.repeat(24),rev:1},null,meta);assert.equal(s.ok,1);assert.equal(s.state.story.stage,'promise');assert.equal(s.state.member,'vahitovsky');
});
function setup(t,kind){const b=factories[kind]();t.after(b.close);let time=1800000000000,n=0,game;const events=[];
  const reload=()=>{game=Lib.Territories(b.be(),{now:()=>time,onStory:(key,stage)=>events.push([key,stage])});};reload();
  const status=(key='a')=>game.call(key,{op:'status'},null,meta).state;
  const pose=(place='home',extra={})=>({...D.point(place,meta),t:time,...extra});
  const call=(op,body={},p=pose(),key='a')=>game.call(key,{op,rev:status(key).rev,request:(++n).toString(16).padStart(24,'0'),...body},p,meta);
  const choose=(choice,extra={},p)=>{const s=status().story,step=s?s.stage:'invite';return call('story',{step,choice,...extra},p===undefined?pose(s?D.step(s).place||'home':'home'):p);};
  const uptoFinal=(ending='bridge')=>{for(const c of ['accept','open','mix','listen','net',ending])assert.equal(choose(c).ok,1,c);};
  return {status,pose,call,choose,uptoFinal,reload,events,advance:ms=>{time+=ms;},reset:()=>game.reset('a')};
}
test('chapter anchors use the shipped map, correct districts and nearby walkable nodes',()=>{
  const ped=new Set(map.roads.filter(r=>r.c>=4).flatMap(r=>r.p));
  for(const [id,p] of Object.entries(D.places)){
    assert.equal(R.district(...p.ll).id,p.district,id);assert.ok(R.borderDistance(R.get(p.district),...p.ll)>120,id);
    const q=D.point(id,meta);assert.ok([...ped].some(n=>Math.hypot(map.nodes[n][0]/10-q.x,map.nodes[n][1]/10-q.y)<5),id);
  }
});
test('production map decoder and sidewalk placement keep all four characters accessible',()=>{
  const vm=require('node:vm'),ctx=vm.createContext({document:{querySelector:()=>({addEventListener(){}})},matchMedia:()=>({matches:false}),initLandmarks(){},input:map,D});
  for(const f of ['util.js','world.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../site/js',f),'utf8'),ctx);
  vm.runInContext('buildWorld(input)',ctx);
  const result=vm.runInContext(`Object.entries(D.places).map(([id])=>{const p=D.point(id,world.meta),n=nearestNode(p.x,p.y,world.pedAdj,75);if(n<0)return {id,ok:false};
    const samples=Array.from({length:8},()=>{const q=sidewalkPos(n);return {outside:!inBuilding(q[0],q[1]),distance:dist(p.x,p.y,q[0],q[1])};});return {id,ok:samples.every(q=>q.outside&&q.distance<75),samples};})`,ctx);
  for(const p of result)assert.ok(p.ok,JSON.stringify(p));
});
for(const kind of Object.keys(factories)){
  for(const ending of ['home','away','bridge'])test(kind+': complete '+ending+' ending, reload, meaningful contacts and explicit membership',t=>{
    const f=setup(t,kind);f.uptoFinal(ending);const rev=f.status().rev;f.reload();assert.equal(f.status().story.ending,ending);
    assert.equal(f.status().member,null,'story choices never secretly enrol');
    const r=f.choose(ending==='bridge'?'independent':'join');assert.equal(r.ok,1);const s=r.state.story;
    assert.equal(s.stage,'done');assert.equal(s.log.length,7);assert.equal(r.state.rev,rev+1);
    assert.equal(r.state.member,ending==='bridge'?null:D.endings[ending].district);
    assert.equal(D.passage(s,'vahitovsky'),ending!=='away');assert.equal(D.passage(s,'kirovsky'),ending!=='home');
    assert.equal(D.passage(s,'sovetsky'),false);f.reload();assert.deepEqual(f.status().story,s);
    assert.ok(f.events.some(([,stage])=>stage==='end'+ending));assert.equal(f.status('other').story,null);
    for(const id of Object.keys(D.people)){
      assert.match(D.greeting(s,id),/[А-Яа-я]/);assert.equal(f.call('story',{step:'visit',person:id},f.pose(D.people[id].place)).ok,1);
    }
    assert.equal(Object.keys(f.status().story.visits).length,4);assert.equal(f.status().standing,0);
  });
  test(kind+': presence, stage, active encounter and choice guards cannot be bypassed',t=>{
    const f=setup(t,kind);assert.equal(f.choose('home',{step:'call'}).err,'story_stage');f.choose('accept');
    const rev=f.status().rev;
    for(const p of [null,f.pose('away'),f.pose('home',{t:0}),f.pose('home',{room:'cafe'}),f.pose('home',{b:1}),f.pose('home',{vehicle:'car'}),f.pose('home',{x:NaN})])assert.equal(f.choose('open',{},p).err,'story_place');
    assert.equal(f.choose('not-a-choice').err,'choice');assert.equal(f.choose('mix',{step:'kit'}).err,'story_stage');assert.equal(f.status().rev,rev);
    assert.equal(f.call('join',{member:'vahitovsky'}).ok,1);f.call('start',{mode:'training'});assert.equal(f.choose('open').err,'active');
  });
  test(kind+': three endpoints do not bypass membership, cooldown or neutral exit consent',t=>{
    const f=setup(t,kind);f.call('join',{member:'vahitovsky'});f.uptoFinal('away');
    assert.equal(f.choose('join').err,'story_membership');assert.equal(f.status().story.stage,'finale');
    assert.equal(f.choose('guest').state.member,'vahitovsky');
    f.reset();f.call('join',{member:'vahitovsky'});f.uptoFinal('bridge');assert.equal(f.status().member,'vahitovsky');
    assert.equal(f.choose('independent').state.member,null);assert.ok(f.status().switchAt>1800000000000);
    f.reset();f.call('join',{member:'vahitovsky'});f.call('leave');f.uptoFinal('home');
    assert.equal(f.choose('join').err,'switch_cooldown');assert.equal(f.choose('guest').ok,1);assert.equal(f.status().member,null);
  });
  test(kind+': retry and concurrent tab have exactly one transition and one funnel event',t=>{
    const f=setup(t,kind),request='b'.repeat(24),rev=f.status().rev;
    const r=f.choose('accept',{request,rev});assert.equal(r.ok,1);f.reload();
    assert.equal(f.choose('accept',{step:'invite',request,rev}).ok,1);assert.equal(f.status().story.log.length,1);assert.equal(f.events.length,1);
    assert.equal(f.choose('open',{request}).err,'request_reused');assert.equal(f.choose('open',{rev}).err,'conflict');
    assert.equal(f.status().story.stage,'promise');f.reset();assert.equal(f.status().story,null);
  });
  test(kind+': all earlier choices persist and change the reunion dialogue',t=>{
    const f=setup(t,kind);for(const c of ['accept','loyal','captains','direct','rookie','home','guest'])assert.equal(f.choose(c).ok,1,c);
    const s=f.status().story;assert.match(D.greeting(s,'ruslan'),/сам зовёт новичков/);assert.match(D.greeting(s,'leysan'),/Капитаны составы/);
    assert.equal(s.bonds.timur,6);assert.equal(f.status().member,null);
    assert.equal(f.call('story',{step:'visit',person:'__proto__'}).err,'story_stage');
    assert.equal(f.call('story',{step:'visit',person:'artur'},f.pose('home')).err,'story_place');
    f.call('story',{step:'visit',person:'artur'},f.pose('away'));const rev=f.status().rev;
    assert.equal(f.call('story',{step:'visit',person:'artur'},f.pose('away')).err,'story_visited');assert.equal(f.status().rev,rev);
  });
  test(kind+': earned introduction ends a foreign encounter without repeatable rewards',t=>{
    const f=setup(t,kind);f.call('join',{member:'vahitovsky'});let e=f.call('start',{},f.pose('away')).state.active;
    assert.equal(f.call('choice',{encounter:e.id,choice:'friend'},f.pose('away')).err,'choice');
    f.call('choice',{encounter:e.id,choice:'leave'},null);f.uptoFinal('bridge');f.choose('independent');f.advance(31*60e3);
    f.call('join',{member:'vahitovsky'});e=f.call('start',{},f.pose('away')).state.active;
    const r=f.call('choice',{encounter:e.id,choice:'friend'},f.pose('away'));assert.equal(r.ok,1);assert.equal(r.state.history[0].result,'vouched');assert.equal(r.state.standing,0);
    assert.equal(f.call('start',{},f.pose('away')).err,'encounter_cooldown');
    e=f.call('start',{mode:'training'}).state.active;assert.equal(f.call('choice',{encounter:e.id,choice:'friend'}).err,'choice');
  });
}
