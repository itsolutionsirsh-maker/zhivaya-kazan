// Run against a DISPOSABLE empty Node server, with MOD_TOKEN supplied in the environment.
// node tools/tests/courtyard-http.js http://127.0.0.1:8992
const assert=require('node:assert/strict'),crypto=require('node:crypto'),D=require('../../site/js/courtyard-data');
const BASE=process.argv[2]||'http://127.0.0.1:8992',secret=process.env.MOD_TOKEN;
const id=()=>crypto.randomBytes(16).toString('hex'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function api(a,b={},mod=false){const r=await fetch(BASE+'/api.php',{method:'POST',headers:{'Content-Type':'application/json',...(mod?{'X-Mod-Token':secret}:{})},body:JSON.stringify({a,...b})});return {status:r.status,...await r.json()};}
(async()=>{
  assert.ok(secret,'MOD_TOKEN for disposable server required');const pub=await fetch(BASE+'/api.php?a=courtyard').then(r=>r.json());assert.equal(Object.keys(pub.state.done).length,0,'use a fresh test database');
  const map=await fetch(BASE+'/kazan.json').then(r=>r.json()),p=D.point(map.meta),users=[];
  for(let i=0;i<3;i++){const name='yard-'+id().slice(0,8),a=await api('login',{name,pin:'763819'});assert.ok(a.token,JSON.stringify(a));users.push({name,token:a.token,id:id()});}
  const presence=()=>Promise.all(users.map(u=>api('sync',{id:u.id,p:{...p,n:u.name}})));
  const call=(u,op,x={})=>api('courtyard',{token:u.token,id:u.id,op,request:id(),...x});
  let receipts=[];
  for(const step of D.yard.steps){
    await presence();const starts=await Promise.all(users.map((u,i)=>call(u,'start',{task:step.id+':'+i,epoch:0})));
    for(const r of starts)assert.equal(r.ok,1,JSON.stringify(r));
    assert.equal((await call(users[0],'finish',{work:starts[0].state.me.work.token})).err,'wait');
    await sleep(8100);await presence();
    const bodies=starts.map(r=>({work:r.state.me.work.token,request:id()}));
    const ends=await Promise.all(users.map((u,i)=>call(u,'finish',bodies[i])));for(const r of ends)assert.equal(r.ok,1,JSON.stringify(r));
    assert.equal((await call(users[0],'finish',bodies[0])).replayed,true);receipts=bodies;
  }
  for(const u of users){const r=await call(u,'status');assert.equal(Object.keys(r.state.done).length,9);assert.equal(r.state.me.today,3);assert.equal(r.state.contributors.length,3);}
  const unauth=await api('courtyard',{op:'rollback'});assert.equal(unauth.status,403);
  const before=await api('courtyard',{op:'modStatus'},true),body={op:'rollback',stage:'light',rev:before.state.rev,reason:'Проверка модерации',request:id()};
  const rollback=await api('courtyard',body,true);assert.equal(Object.keys(rollback.state.done).length,3);assert.deepEqual(rollback.state.epochs,[0,1,1]);
  assert.equal((await api('courtyard',body,true)).replayed,true);
  await presence();assert.equal((await call(users[0],'start',{task:'light:0',epoch:1})).err,'daily');
  assert.equal((await call(users[0],'finish',receipts[0])).replayed,true);assert.equal(Object.keys((await call(users[0],'status')).state.done).length,3);
  console.log('PASS: real HTTP server, 3 accounts, 9 jobs, shared state, retry, daily cap and moderator rollback');
})().catch(e=>{console.error(e);process.exitCode=1;});
