// Ephemeral recreational matches. No money, inventory or story mutation.
'use strict';
const crypto=require('crypto'),D=require('../../site/js/yard-story-data');
function CourtGames({now=Date.now,code=()=>crypto.randomBytes(4).toString('hex')}={}){
 const rooms=new Map(),members=new Map();
 function remove(r,k){r.players=r.players.filter(p=>p.key!==k);members.delete(k);r.charge=null;r.turn=r.players[0]?.key||null;if(!r.players.length)rooms.delete(r.code);}
 function sweep(){for(const r of rooms.values())if(now()-r.at>600000){for(const p of r.players)members.delete(p.key);rooms.delete(r.code);}}
 function view(r,k){return r?{code:r.code,version:r.version,players:r.players.map(p=>({name:p.name,mine:p.key===k,shots:p.shots,score:p.score})),myTurn:r.turn===k,done:r.players.every(p=>p.shots>=3),charged:!!r.charge,chargeAge:r.charge&&r.charge.key===k?now()-r.charge.at:0,at:r.at,last:r.last||null}:null;}
 function call(k,name,b,pose,meta){sweep();let r=rooms.get(members.get(k));const fail=err=>({ok:0,err,game:view(r,k)}),op=b.op||'status';
  if(op==='status')return {ok:1,game:view(r,k)};
  if(op==='leave'){if(r)remove(r,k);return {ok:1,game:null};}
  const q=D.point('court',meta);
  if(!q||!pose||!Number.isFinite(pose.t)||now()-pose.t>15000||pose.t>now()||pose.b||pose.room||pose.vehicle||!Number.isFinite(pose.x)||!Number.isFinite(pose.y)||Math.hypot(pose.x-q.x,pose.y-q.y)>120)return fail('place');
  if(op==='create'||op==='join'){
   if(r)return {ok:1,game:view(r,k)};
   if(op==='join'){r=rooms.get(String(b.code||'').toLowerCase());if(!r)return fail('missing');if(r.players.length>=2||r.charge||r.players.some(p=>p.shots>0))return fail('started');}
   else {if(rooms.size>=1000)return fail('busy');let id=code();while(rooms.has(id))id=code();r={code:id,players:[],turn:k,version:0,at:now(),requests:new Map(),charge:null};rooms.set(id,r);}
   r.players.push({key:k,name:String(name||'Игрок').slice(0,24),shots:0,score:0});members.set(k,r.code);r.version++;r.at=now();return {ok:1,game:view(r,k)};
  }
  if(!r)return fail('missing');
  if(typeof b.request!=='string'||!/^[a-f0-9]{24}$/.test(b.request))return fail('request');
  const signature=JSON.stringify([k,op,b.version]);
  if(r.requests.has(b.request))return r.requests.get(b.request)===signature?{ok:1,game:view(r,k)}:fail('request');
  if(b.version!==r.version)return fail('changed');
  if(op==='continue'){
   const other=r.players.find(p=>p.key!==k);if(other&&now()-r.at<30000)return fail('wait');if(other)remove(r,other.key);
  }else if(op==='cancel'){if(r.charge&&r.charge.key!==k)return fail('turn');r.charge=null;}
  else {
   const p=r.players.find(p=>p.key===k);if(r.turn!==k||p.shots>=3)return fail('turn');
   if(op==='begin'){if(r.charge&&now()-r.charge.at<5000)return fail('charging');r.charge={key:k,at:now()};}
   else if(op==='throw'){
    if(!r.charge||r.charge.key!==k)return fail('charge');const elapsed=now()-r.charge.at,power=(elapsed%1600)/1600;
    const hit=elapsed>=0&&elapsed<5000&&power>=.4&&power<=.65;p.shots++;if(hit)p.score++;
    r.last={name:p.name,hit,at:now(),shot:p.shots};r.charge=null;const next=r.players.find(x=>x.key!==k&&x.shots<3)||r.players.find(x=>x.shots<3);r.turn=next?.key||null;
   }else return fail('operation');
  }
  r.version++;r.at=now();r.requests.set(b.request,signature);while(r.requests.size>32)r.requests.delete(r.requests.keys().next().value);
  return {ok:1,game:view(r,k)};
 }
 return {call};
}
module.exports={CourtGames};
