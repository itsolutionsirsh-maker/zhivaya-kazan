const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {Courtyard,sqliteBackend,jsonBackend,create}=require('../../server/node/courtyard'),D=require('../../site/js/courtyard-data');
function setup(t,kind='json',extra={}){
  let time=Date.UTC(2026,9,29,12),seq=0;const meta={lon0:49,lat0:56,mlon:60000,mlat:111000},p=D.point(meta),poses={};
  for(const k of ['a','b','c'])poses[k]={...p,priv:k,ip:'local',meta:{n:k},positionAt:time/1000,acc:{k}};
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'yard-unit-')),file=path.join(dir,'yard.json');t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  let db;if(kind==='sqlite'){db=new(require('node:sqlite').DatabaseSync)(':memory:');t.after(()=>db.close());}
  const be=kind==='sqlite'?sqliteBackend(db):jsonBackend(file,fs),options={now:()=>time,presence:id=>poses[id],blocked:p=>!!p.blocked,meta:()=>meta,name:(a,p)=>p.meta.n,...extra};
  let yard=Courtyard(be,options);const request=()=> (++seq).toString(16).padStart(32,'0');
  const call=(k,op,x={})=>yard.act({k},k,'local',{op,request:request(),...x});
  const tick=ms=>{time+=ms;for(const p of Object.values(poses))p.positionAt=time/1000;};
  function finish(k,task){const r=call(k,'start',{task,epoch:yard.read(k,k).epochs[D.yard.steps.findIndex(s=>task.startsWith(s.id+':'))]});assert.equal(r.ok,1,JSON.stringify(r));tick(8000);const body={work:r.state.me.work.token,request:request()};const done=call(k,'finish',body);assert.equal(done.ok,1,JSON.stringify(done));return body;}
  return {get yard(){return yard;},be,options,poses,call,tick,finish,request,file,reload(){yard=Courtyard(kind==='json'?jsonBackend(file,fs):be,options);yard.restart();},now:()=>time};
}
for(const kind of ['json','sqlite']){
  test(kind+': three neighbours build nine tasks, persistent shared state and account caps',t=>{
    const f=setup(t,kind);for(const s of D.yard.steps)for(let i=0;i<3;i++)f.finish(['a','b','c'][i],s.id+':'+i);
    assert.equal(Object.keys(f.yard.read().done).length,9);f.reload();
    for(const k of ['a','b','c']){assert.equal(f.yard.read(k,k).me.today,3);assert.equal(f.yard.read(k,k).contributors.find(c=>c.mine).count,3);}
    const state=f.yard.read();assert.equal(state.contributors.length,3);assert.equal(state.me.work,null);
    assert.equal(f.yard.moderate({op:'rollback',stage:'bench',reason:'исправление',rev:state.rev,request:f.request()}).ok,1);
    assert.equal(f.call('a','start',{task:'bench:0',epoch:1}).err,'daily');
    f.tick(86400000);assert.equal(f.call('a','start',{task:'bench:0',epoch:1}).ok,1);
  });
  test(kind+': retries, same-account second device, stage locks and concurrency',t=>{
    const f=setup(t,kind),r=f.request(),start={task:'bench:0',epoch:0,request:r};
    assert.equal(f.call('a','start',{task:'light:0',epoch:0}).err,'task');
    const first=f.call('a','start',start);assert.equal(first.ok,1);const token=first.state.me.work.token;
    assert.equal(f.call('a','start',start).replayed,true);assert.equal(f.call('a','start',{...start,task:'bench:1'}).err,'request_reused');
    assert.equal(f.call('b','start',{task:'bench:0',epoch:0}).err,'occupied');
    assert.equal(f.call('b','finish',{work:token}).err,'work');
    f.poses.other={...f.poses.a,priv:'other'};
    assert.equal(f.yard.act({k:'a'},'other','local',{op:'start',task:'bench:1',epoch:0,request:f.request()}).err,'active');
    assert.equal(f.yard.read('a','other').me.work.here,false);
    assert.equal(f.call('a','finish',{work:token}).err,'wait');f.tick(8000);
    const finish={work:token,request:f.request()};assert.equal(f.call('a','finish',finish).ok,1);assert.equal(f.call('a','finish',finish).replayed,true);
    f.reload();assert.equal(f.call('a','finish',finish).replayed,true);assert.equal(f.yard.read('a').me.today,1);
  });
  test(kind+': moderator rollback is revision guarded, deduplicated and invalidates old work',t=>{
    const f=setup(t,kind);for(let i=0;i<3;i++)f.finish(['a','b','c'][i],'bench:'+i);
    const work=f.call('a','start',{task:'light:0',epoch:0}).state.me.work.token;
    const b={op:'rollback',stage:'bench',reason:'перепроверка',rev:f.yard.read().rev,request:f.request()};
    assert.equal(f.yard.moderate({...b,rev:0}).err,'changed');const r=f.yard.moderate(b);assert.equal(r.ok,1);assert.equal(r.audit[0].removed,3);assert.deepEqual(r.state.epochs,[1,1,1]);
    assert.equal(f.yard.moderate(b).replayed,true);assert.equal(f.yard.moderate({...b,reason:'другое'}).err,'request_reused');
    f.tick(8000);assert.equal(f.call('a','finish',{work}).err,'work');assert.equal(f.call('b','start',{task:'bench:1',epoch:0}).err,'changed');
    assert.equal(f.yard.read('a').me.today,1);f.reload();assert.equal(f.yard.moderate(b).replayed,true);
  });
  test(kind+': restart drops leases, keeps completed tasks, quotas and receipt history',t=>{
    const f=setup(t,kind);const receipt=f.finish('a','bench:0');f.call('b','start',{task:'bench:1',epoch:0});f.reload();
    assert.equal(f.yard.read().busy.length,0);assert.equal(f.yard.read('a').me.today,1);assert.equal(f.call('a','finish',receipt).replayed,true);
  });
}
test('presence must be fresh, on foot, outside, unblocked, same IP and same account',t=>{
  const f=setup(t);for(const change of [{positionAt:0},{b:1},{room:'cafe'},{meta:{v:'car'}},{blocked:true},{ip:'other'},{acc:{k:'b'}},{x:0}]){
    const original={...f.poses.a};Object.assign(f.poses.a,change);const r=f.call('a','start',{task:'bench:0',epoch:0});assert.equal(r.ok,0,JSON.stringify(change));f.poses.a=original;
  }
  const work=f.call('a','start',{task:'bench:0',epoch:0}).state.me.work.token;f.poses.a.x+=100;f.tick(8000);assert.equal(f.call('a','finish',{work}).err,'place');
  assert.equal(f.yard.read().busy.length,0);
});
test('expired work and start-spam cap; successful work count resets exactly at Moscow midnight',t=>{
  const f=setup(t);for(let i=0;i<12;i++){const w=f.call('a','start',{task:'bench:0',epoch:0}).state.me.work.token;assert.equal(f.call('a','cancel',{work:w}).ok,1);}
  assert.equal(f.call('a','start',{task:'bench:0',epoch:0}).err,'starts');
  f.tick(Date.UTC(2026,9,29,21)-f.now()-1);assert.equal(f.yard.read('a').me.starts,12);f.tick(1);assert.equal(f.yard.read('a').me.starts,0);
  const w=f.call('a','start',{task:'bench:0',epoch:0}).state.me.work.token;f.tick(120000);assert.equal(f.call('a','finish',{work:w}).err,'work');
});
test('snapshots never expose account hashes, network identifiers, IPs or other work tokens',t=>{
  const f=setup(t),w=f.call('a','start',{task:'bench:0',epoch:0}).state.me.work.token;
  for(const state of [f.yard.read(),f.yard.read('b','b')]){const json=JSON.stringify(state);assert.ok(!json.includes(w));assert.ok(!json.includes('local'));assert.ok(!json.includes('"by"'));assert.equal(state.me.work,null);}
});
test('JSON failed atomic rename leaves in-memory and persisted state unchanged',t=>{
  const f=setup(t);f.finish('a','bench:0');const original=fs.readFileSync(f.file,'utf8');
  const be=jsonBackend(f.file,{...fs,renameSync(){throw Error('disk');}}),yard=Courtyard(be,f.options);
  assert.throws(()=>yard.act({k:'b'},'b','local',{op:'start',task:'bench:1',epoch:0,request:f.request()}),/disk/);
  assert.equal(fs.readFileSync(f.file,'utf8'),original);assert.equal(yard.read().busy.length,0);
});
test('HTTP adapter requires moderator secret and account auth, handles write failure and rate limits',()=>{
  const base={allow:()=>true,auth:t=>t==='token'?{k:'a'}:null,modToken:()=> 'secret',presence:()=>null,blocked:()=>false,meta:()=>null,log(){}};
  const service=create(base),req={method:'POST',headers:{}};
  assert.equal(service.handle(req,{op:'rollback'},'ip')[0],403);assert.equal(service.handle(req,{op:'start'},'ip')[0],401);
  assert.equal(service.handle({...req,headers:{'x-mod-token':'secret'}},{op:'modStatus'},'ip')[1].ok,1);
  assert.equal(service.handle({method:'GET'},{},'ip')[1].state.version,1);
  assert.equal(create({...base,allow:()=>false}).handle(req,{},'ip')[0],429);
  assert.equal(create({...base,auth(){throw Error('disk');}}).handle(req,{},'ip')[0],503);
});
test('courtyard footprint avoids buildings, traffic, parks and water on the shipped map',()=>{
  const vm=require('node:vm'),input=require('../../site/kazan.json');
  const ctx=vm.createContext({document:{querySelector:()=>({addEventListener(){}})},matchMedia:()=>({matches:false}),initLandmarks(){},input,D});
  for(const f of ['util.js','world.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../site/js',f),'utf8'),ctx);vm.runInContext('buildWorld(input)',ctx);
  assert.equal(vm.runInContext(`(()=>{const p=D.point(world.meta);for(let x=-6;x<=6;x+=2)for(let y=-6;y<=6;y+=2){const a=p.x+x,b=p.y+y,r=nearestRoadSeg(a,b,14);if(inBuilding(a,b)||r&&r.d<r.seg.r.hw+1)return false;}if(world.areas.some(a=>['park','water','forest','pitch'].includes(a.k)&&pointInPoly(a.p,p.x,p.y)))return false;return nearestNode(p.x,p.y,world.pedAdj,30)>=0;})()`,ctx),true);
});

for(const kind of ['json','sqlite'])test(kind+': удалённый аккаунт (privacy.html) — вклад остаётся, имя и связь с аккаунтом убраны',t=>{
  const f=setup(t,kind);f.finish('a','bench:0');f.finish('b','bench:1');
  assert.ok(f.yard.read().contributors.some(c=>c.name==='a'));
  assert.equal(f.yard.forget('a'),2,'аккаунт и одна работа');
  const s=f.yard.read();assert.equal(Object.keys(s.done).length,2,'работы на месте');
  assert.ok(!s.contributors.some(c=>c.name==='a'));assert.ok(s.contributors.some(c=>c.name==='Сосед'&&c.count===1));
  assert.equal(f.yard.read('a','a').me.today,0,'счётчик аккаунта стёрт');assert.equal(f.yard.forget('a'),0,'второй раз — нечего');
});
