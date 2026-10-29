'use strict';
const Rules=require('../../site/js/territory-core.js');
const crypto=require('crypto');
const SWITCH_MS=30*60e3,ENCOUNTER_MS=10*60e3,EXPIRE_MS=5*60e3;
const fresh=()=>({rev:0,member:null,standing:0,switchAt:0,nextAt:0,practiceAt:0,active:null,history:[],requests:[]});
const copy=x=>JSON.parse(JSON.stringify(x));

function sqliteBackend(db){
  db.exec('CREATE TABLE IF NOT EXISTS territories (k TEXT PRIMARY KEY, state TEXT NOT NULL)');
  const read=db.prepare('SELECT state FROM territories WHERE k=?');
  const write=db.prepare('INSERT INTO territories(k,state) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET state=excluded.state');
  return {get:k=>{const row=read.get(k);return row?JSON.parse(row.state):null;},put:(k,s)=>write.run(k,JSON.stringify(s))};
}
function jsonBackend(file,fs){
  let rows=Object.create(null);try{rows=Object.assign(Object.create(null),JSON.parse(fs.readFileSync(file,'utf8')));}catch(e){if(e.code!=='ENOENT')throw e;}
  return {get:k=>rows[k]?copy(rows[k]):null,put(k,s){
    const next=Object.assign(Object.create(null),rows,{[k]:copy(s)});
    fs.writeFileSync(file+'.tmp',JSON.stringify(next),{mode:0o600});fs.renameSync(file+'.tmp',file);rows=next;
  }};
}
function Territories(backend,{now=Date.now,random=Math.random,uid=()=>crypto.randomBytes(12).toString('hex')}={}){
  function view(s,loc){const out=copy(s);delete out.requests;if(out.active)delete out.active.roll;
    return {ok:1,state:out,location:loc?loc.id:null,homeBonus:Rules.multiplier(s.member,loc&&loc.id)};
  }
  function finish(s,result,t){const e=s.active;if(!e)return;
    const delta=e.training?0:result==='won'?2:result==='peace'?1:result==='lost'?-1:0;
    s.standing=Math.max(0,Math.min(100,s.standing+delta));
    s.history.unshift({id:e.id,district:e.district,result,training:!!e.training,at:t,standing:s.standing});s.history=s.history.slice(0,8);
    s.active=null;if(e.training)s.practiceAt=t+2*60e3;else s.nextAt=t+ENCOUNTER_MS;
  }
  function call(key,body,pose,meta){
    const t=now(),s=backend.get(key)||fresh();
    const valid=pose&&Number.isFinite(pose.x)&&Number.isFinite(pose.y)&&Number.isFinite(pose.t)&&t-pose.t<15000&&t>=pose.t&&!pose.b&&!pose.room&&!pose.vehicle;
    const loc=valid?Rules.at(pose.x,pose.y,meta):null;
    if(s.active&&t>=s.active.expires){finish(s,'expired',t);s.rev++;backend.put(key,s);}
    const op=body.op||'status',fail=err=>Object.assign(view(s,loc),{ok:0,err});
    if(op==='status')return view(s,loc);
    if(!['join','leave','start','choice'].includes(op))return fail('operation');
    if(typeof body.request!=='string'||!/^[a-f0-9]{24,40}$/.test(body.request))return fail('request');
    const signature=JSON.stringify([op,body.member||null,body.encounter||null,body.choice||null,body.mode||null]);
    const prior=s.requests.find(r=>r.id===body.request);
    if(prior)return prior.signature===signature?view(s,loc):fail('request_reused');
    if(body.rev!==s.rev)return fail('conflict');
    if(op==='join'){
      if(!Rules.get(body.member))return fail('faction');
      if(s.member||s.active)return fail('already_member');
      if(t<s.switchAt)return fail('switch_cooldown');
      if(!loc||loc.id!==body.member)return fail('visit_home');
      s.member=body.member;s.standing=0;s.switchAt=t+SWITCH_MS;
    }else if(op==='leave'){
      // Leaving is always possible, even during a conflict or without a live position.
      if(s.active)finish(s,'left',t);s.member=null;s.standing=0;s.switchAt=Math.max(s.switchAt,t+SWITCH_MS);
    }else if(op==='start'){
      if(!s.member)return fail('neutral');
      if(!loc)return fail('street_only');
      if(s.active)return fail('active');
      const training=body.mode==='training';
      if(training&&loc.id!==s.member)return fail('visit_home');
      if(!training&&loc.id===s.member)return fail('home');
      if(t<(training?s.practiceAt:s.nextAt))return fail('encounter_cooldown');
      const ll=Rules.lonLat(pose.x,pose.y,meta);
      if(Rules.borderDistance(loc,...ll)<20)return fail('border');
      const opponent=training?(loc.id==='kirovsky'?'vahitovsky':'kirovsky'):loc.id;
      s.active={id:uid(),member:s.member,district:loc.id,opponent,training,x:pose.x,y:pose.y,phase:'greeting',
        power:Rules.encounterPower(s.member,loc.id,opponent),roll:random(),expires:t+EXPIRE_MS};
    }else{
      const e=s.active;if(!e||e.id!==body.encounter)return fail('encounter');
      if(!['talk','pass','stand','leave'].includes(body.choice)||(body.choice==='pass'&&e.phase!=='talk')||(body.choice==='talk'&&e.phase!=='greeting'))return fail('choice');
      if(body.choice==='leave')finish(s,'left',t);
      else if(!loc||loc.id!==e.district||Math.hypot(pose.x-e.x,pose.y-e.y)>80)return fail('return_to_meeting');
      else if(body.choice==='talk')e.phase='talk';
      else if(body.choice==='pass')finish(s,'peace',t);
      else finish(s,e.roll<e.power.chance?'won':'lost',t);
    }
    s.rev++;s.requests.push({id:body.request,signature});s.requests=s.requests.slice(-16);backend.put(key,s);
    return view(s,loc);
  }
  // Called inside the account/wallet reset transaction on SQLite. Keep revision monotonic.
  function reset(key){const prev=backend.get(key),s=fresh();s.rev=(prev?prev.rev:0)+1;backend.put(key,s);}
  return {call,reset};
}
module.exports={Territories,sqliteBackend,jsonBackend,SWITCH_MS,ENCOUNTER_MS,EXPIRE_MS};
