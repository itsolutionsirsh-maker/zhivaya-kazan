// Run against a disposable LOCAL Node server/data directory, never production.
// node tools/tests/territories-network.js http://127.0.0.1:8803
'use strict';
const http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const R=require('../../site/js/territory-core');
const origin=new URL(process.argv[2]||'http://127.0.0.1:8803');
if(!['127.0.0.1','localhost','[::1]'].includes(origin.hostname))throw Error('Disposable localhost server required');
const id=crypto.randomBytes(8).toString('hex');let token,rev=0,checks=0;
function httpCall(route,body){return new Promise((resolve,reject)=>{
  const req=http.request(new URL(route,origin),{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{}},res=>{let text='';res.setEncoding('utf8');res.on('data',s=>text+=s);res.on('end',()=>{try{resolve({status:res.statusCode,json:JSON.parse(text)});}catch(e){reject(e);}});});req.on('error',reject);req.setTimeout(10000,()=>req.destroy(Error('timeout')));req.end(body?JSON.stringify(body):undefined);
});}
const api=async body=>(await httpCall('/api.php',body)).json;
const check=(condition,label)=>{assert.ok(condition,label);checks++;console.log('PASS',label);};
async function territory(op,extra={}){const r=await api({a:'territory',token,id,op,rev,request:crypto.randomBytes(12).toString('hex'),...extra});if(r.state)rev=r.state.rev;return r;}
(async()=>{
  check((await api({a:'ping'})).territories,'capability advertised');
  check((await httpCall('/api.php?a=territory')).status===405,'mutations require POST');
  check((await territory('status')).err==='auth','guest is not silently enrolled');
  const login=await api({a:'login',name:'terr-'+Date.now().toString(36),pin:'763819'});assert.ok(login.token,JSON.stringify(login));token=login.token;
  let map;try{map=(await httpCall('/map/base.json')).json;}catch{}if(!map||!map.meta)map=(await httpCall('/kazan.json')).json;const m=map.meta;
  const pose=async(ll,extra={})=>{const p={x:(ll[0]-m.lon0)*m.mlon,y:-(ll[1]-m.lat0)*m.mlat,b:0,v:null,...extra};await api({a:'sync',id,p});return p;};
  check((await territory('join',{member:'vahitovsky'})).err==='visit_home','no presence cannot join');
  await pose([49.1065,55.7989]);let r=await territory('join',{member:'vahitovsky'});check(r.ok&&r.state.member==='vahitovsky','join verified district');
  check((await territory('start')).err==='home','home has no hostile meeting');
  await api({a:'save',token,state:{money:3000,territory:{member:'kirovsky',standing:100}},profile:{name:'test'}});
  check((await territory('status')).state.member==='vahitovsky','client save cannot replace membership');
  await pose([49.043,55.81],{b:1});check((await territory('start')).err==='street_only','interior excludes meeting');
  await pose([49.043,55.81],{v:'taxi'});check((await territory('start')).err==='street_only','vehicle excludes meeting');
  await pose([49.043,55.81]);r=await territory('start');assert.ok(r.ok,JSON.stringify(r));const encounter=r.state.active.id;
  check(r.state.active.power.locals===96&&!('roll' in r.state.active),'server freezes bonus and hides roll');
  const wrong=await territory('choice',{encounter,choice:'pass'});check(wrong.err==='choice','cannot skip dialogue phase');
  await territory('choice',{encounter,choice:'talk'});const request=crypto.randomBytes(12).toString('hex'),oldRev=rev;
  r=await territory('choice',{encounter,choice:'pass',request});check(r.state.history[0].result==='peace'&&r.state.standing===1,'complete peaceful ending');
  r=await territory('choice',{encounter,choice:'pass',request,rev:oldRev});check(r.ok&&r.state.standing===1&&r.state.history.length===1,'response retry has one outcome');
  check((await territory('start')).err==='encounter_cooldown','no repeated farming');
  let far=null;
  // Probe a known district point beyond the previous 5km networking clamp.
  for(const ll of [[49.3,55.8],[49.3,55.85],[49.109,55.855]])if(R.district(...ll)&&(Math.abs((ll[0]-m.lon0)*m.mlon)>5000||Math.abs((ll[1]-m.lat0)*m.mlat)>5000)){far=ll;break;}
  assert.ok(far);await pose(far);check((await territory('status')).location===R.district(...far).id,'outer district position survives presence protocol');
  check((await territory('status',{token:'invalid-token-value-12345'})).err==='auth','invalid token cannot downgrade or read state');
  await api({a:'reset',token});r=await territory('status');check(r.state.member===null&&r.state.history.length===0,'account reset resets territory state');
  console.log(JSON.stringify({passed:checks,server:origin.origin}));
})().catch(e=>{console.error(e);process.exitCode=1;});
