// Real HTTP API, disposable local accounts only. No fake chapter state or money rewards.
'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),D=require('../../site/js/yard-story-data');
const url=new URL(process.argv[2]||'http://127.0.0.1:8807');
if(url.protocol!=='http:'||url.hostname!=='127.0.0.1')throw Error('Disposable loopback DATA_DIR required');
const api=async b=>{const r=await fetch(new URL('api.php',url),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});assert.equal(r.status,200);return r.json();};
let checks=0;function check(v,msg){assert.ok(v,msg);checks++;console.log('PASS',msg);}
(async()=>{
  check((await api({a:'ping'})).yardStory===1,'chapter capability');
  const m=await (await fetch(new URL('kazan.json',url))).json(),meta=m.meta;
  check((await api({a:'territory',op:'story',step:'invite',choice:'accept'})).err==='auth','guests cannot mutate chapter');
  for(const ending of ['home','away','bridge']){
    const id=crypto.randomBytes(12).toString('hex'),name='yard-'+ending+'-'+Date.now().toString(36);
    const login=await api({a:'login',name,pin:'763819'});assert.ok(login.token);const token=login.token;let state={rev:0};
    const call=async(op,more={})=>{const r=await api({a:'territory',token,id,op,rev:state.rev,request:crypto.randomBytes(12).toString('hex'),...more});if(r.state)state=r.state;return r;};
    const pose=async(place,extra={})=>api({a:'sync',id,p:{...D.point(place,meta),b:0,v:null,...extra}});
    await call('status');check((await call('story',{step:'invite',choice:'accept'})).ok,'accept '+ending);
    check((await call('story',{step:'promise',choice:'open'})).err==='story_place','no presence rejects '+ending);
    for(const choice of ['open','mix','listen','net',ending]){
      const step=state.story.stage;await pose(D.step(state.story).place);
      const r=await call('story',{step,choice});assert.equal(r.ok,1,JSON.stringify(r));
    }
    await api({a:'save',token,state:{story:{stage:'done',ending:'away'},territory:{member:'sovetsky'}}});
    await call('status');check(state.story.stage==='finale'&&state.story.ending===ending,'client save cannot replace chapter '+ending);
    const place=D.step(state.story).place;await pose(place,{v:'taxi'});
    check((await call('story',{step:'finale',choice:ending==='bridge'?'independent':'join'})).err==='story_place','must exit transport '+ending);
    await pose(place);const request=crypto.randomBytes(12).toString('hex'),rev=state.rev,choice=ending==='bridge'?'independent':'join';
    let r=await call('story',{step:'finale',choice,request});check(r.ok&&state.story.stage==='done','finish '+ending);
    r=await call('story',{step:'finale',choice,request,rev});check(r.ok&&state.story.log.length===7,'idempotent final '+ending);
    await pose('court');r=await call('story',{step:'visit',person:'ruslan'});check(r.ok&&state.story.visits.ruslan,'return to remembered person '+ending);
    await api({a:'reset',token});await call('status');check(!state.story&&!state.member,'account reset includes chapter '+ending);
  }
  console.log(JSON.stringify({passed:checks,server:url.origin}));
})().catch(e=>{console.error(e);process.exitCode=1;});
