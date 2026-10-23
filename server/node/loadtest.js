// Нагрузочный тест: N ботов ходят по карте, часть толпится на одной площади.
//   WS_CONN_PER_MIN=1000000 node server.js            (на тестовом сервере снять лимит подключений)
//   node loadtest.js ws://127.0.0.1:8080/ws 3000 60 0.6
// аргументы: адрес, число ботов, секунд, доля ботов в толпе на площади
'use strict';
const WebSocket=require('ws');
const [url='ws://127.0.0.1:8080/ws',N0='1000',SEC0='40',CROWD0='0.5']=process.argv.slice(2);
const N=+N0,SEC=+SEC0,CROWD=+CROWD0;
const hex=()=>require('crypto').randomBytes(8).toString('hex');
let recvBytes=0,recvMsgs=0,open=0,maxPeers=0,sumPeers=0,peerSamples=0,crowdCells=0;
const bots=[];
function bot(i){const inCrowd=i<N*CROWD;const b={id:hex(),x:inCrowd?(Math.random()-0.5)*60:(Math.random()-0.5)*4000,y:inCrowd?(Math.random()-0.5)*60:(Math.random()-0.5)*4000,vx:0,vy:0,peers:new Set(),crowd:inCrowd};
  const ws=new WebSocket(url,{perMessageDeflate:false});b.ws=ws;
  ws.on('open',()=>{open++;ws.send(JSON.stringify({t:'hello',id:b.id,p:{x:b.x,y:b.y,hx:1,hy:0,b:0,n:'Бот '+i,c:'#4A90E2'}}));});
  ws.on('message',raw=>{recvBytes+=raw.length;recvMsgs++;let d;try{d=JSON.parse(raw);}catch(e){return;}if(d.t!=='w')return;if(d.m)for(const m of d.m)b.peers.add(m[0]);if(d.g)for(const s of d.g)b.peers.delete(s);if(d.c)crowdCells=Math.max(crowdCells,d.c.length);});
  ws.on('error',()=>{});ws.on('close',()=>{open--;});bots.push(b);}
for(let i=0;i<N;i++)setTimeout(()=>bot(i),i*3);
setInterval(()=>{for(const b of bots){if(!b.ws||b.ws.readyState!==1)continue;b.vx+=(Math.random()-0.5)*0.6;b.vy+=(Math.random()-0.5)*0.6;b.vx*=0.9;b.vy*=0.9;b.x+=b.vx*0.2;b.y+=b.vy*0.2;if(b.crowd){b.x=Math.max(-30,Math.min(30,b.x));b.y=Math.max(-30,Math.min(30,b.y));}
  b.ws.send(JSON.stringify({t:'p',x:b.x,y:b.y,hx:1,hy:0,b:0}));}},200);
const t0=Date.now();let lastB=0,lastT=Date.now();
const rep=setInterval(()=>{const dt=(Date.now()-lastT)/1000;const kb=(recvBytes-lastB)/1024/dt;lastB=recvBytes;lastT=Date.now();sumPeers=0;maxPeers=0;for(const b of bots){sumPeers+=b.peers.size;maxPeers=Math.max(maxPeers,b.peers.size);}
  console.log(`t=${Math.round((Date.now()-t0)/1000)}с подключено ${open}/${N} · всем ботам приходит ${kb.toFixed(0)} КБ/с (${(kb/Math.max(1,open)).toFixed(2)} КБ/с на игрока) · видно соседей: в среднем ${(sumPeers/Math.max(1,bots.length)).toFixed(0)}, максимум ${maxPeers} · клеток толпы ${crowdCells}`);
  if(Date.now()-t0>SEC*1000){clearInterval(rep);for(const b of bots)try{b.ws.close();}catch(e){}setTimeout(()=>process.exit(0),500);}},5000);
