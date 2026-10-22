// ===== Сеть: комната claude.ai или свой сервер (api.php) =====
// Режимы: 'room' — внутри claude.ai; 'http' — на своём сайте; 'off' — одиночная игра.
const Net={mode:'off',me:null,peers:[],llm:false};
let myCid=null;try{myCid=localStorage.getItem('zk.cid');}catch(e){}
if(!myCid||!/^[a-f0-9]{16}$/.test(myCid)){myCid=Array.from(crypto.getRandomValues(new Uint8Array(8))).map(b=>b.toString(16).padStart(2,'0')).join('');try{localStorage.setItem('zk.cid',myCid);}catch(e){}}
let outSeq=0;const outbox=[];        // последние исходящие (для комнаты)
const lastSeen=new Map();             // peer → последний прочитанный номер сообщения
let httpOut=[],httpSince=0,httpFirst=true;

function buildPresence(){const p={x:Math.round(player.x*10)/10,y:Math.round(player.y*10)/10,n:player.name.slice(0,24),r:player.role,hx:Math.round(player.hx*100)/100,hy:Math.round(player.hy*100)/100,b:(player.bus||player.inside)?1:0,c:player.clothes,v:player.vehicle?player.vehicle.kind:null,vc:player.vehicle?player.vehicle.color:null};
  p.sy=saySent;p.g=player.rally?{s:player.rally.sq.i,k:player.rally.kind,t:player.rally.title}:null;
  if(Net.mode==='room')p.m=outbox.slice(-4);
  if(player.thumb&&player.thumb.length<2600)p.a=player.thumb;
  if(Net.mode==='room'){let s=JSON.stringify(p);while(s.length>3900&&p.m&&p.m.length){p.m.shift();s=JSON.stringify(p);}if(s.length>3900){delete p.a;}}
  return p;}
function pushPresence(){if(Net.mode!=='room'||!roomNs)return;roomNs.presence(buildPresence()).catch(()=>{});}

// отправить сообщение: to=null — всем (общий чат), to=ключ игрока — лично
function netSend(to,text){text=String(text).trim().slice(0,240);if(!text)return false;
  if(Net.mode==='room'){outbox.push({i:++outSeq,to:to||null,t:text,ts:Date.now()});while(outbox.length>4)outbox.shift();pushPresence();return true;}
  if(Net.mode==='http'){httpOut.push({to:to||null,t:text});return true;}
  return false;}

function roomPeers(){if(!roomNs)return[];const all=roomNs.peers();const me=all.find(p=>p.isMe&&p.sameTab);if(me)Net.me=me.peer;return all.filter(p=>!p.isMe&&p.kind==='viewer'&&p.presence&&typeof p.presence.x==='number').map(p=>({peer:p.peer,presence:p.presence}));}
function readRoomMsgs(list){for(const p of list){const m=p.presence.m;if(!Array.isArray(m))continue;const seen=lastSeen.get(p.peer);const first=seen===undefined;let max=seen||0;
  for(const x of m){if(!x||typeof x.i!=='number'||typeof x.t!=='string')continue;if(x.i>max)max=x.i;if(first||x.i<=(seen||0))continue;if(x.to&&x.to!==Net.me)continue;
    chatDeliver(p.peer,String(p.presence.n||'Игрок').slice(0,24),x.to?'dm':'city',x.t.slice(0,240),false);}
  lastSeen.set(p.peer,max);}}

async function httpLoop(){for(;;){
  try{const body={a:'sync',id:myCid,p:buildPresence(),out:httpOut.splice(0),since:httpSince};
    const r=await fetch('api.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});const j=await r.json();
    if(Array.isArray(j.players)){Net.peers=j.players.filter(pl=>pl&&pl.p&&typeof pl.p.x==='number').map(pl=>({peer:pl.id,presence:pl.p}));syncPeers(Net.peers);}
    if(Array.isArray(j.msgs)){for(const m of j.msgs){if(m.from===myCid){if(httpFirst)chatDeliver('me',player.name,m.to?'dm':'city',m.t,true,m.to);continue;}if(m.to&&m.to!==myCid)continue;chatDeliver(m.from,m.n||'Игрок',m.to?'dm':'city',m.t,httpFirst);}}
    if(typeof j.seq==='number')httpSince=j.seq;httpFirst=false;setNetStatus(true);
  }catch(e){setNetStatus(false);}
  await new Promise(r=>setTimeout(r,document.hidden?3000:800));}}

function makeHttpSample(){
  const call=async(input,json)=>{const msgs=typeof input==='string'?[{role:'user',content:input}]:input;const r=await fetch('api.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({a:'llm',messages:msgs,json:!!json}),cache:'no-store'});const j=await r.json();if(!j.text)throw {code:j.err||'upstream_error'};return j.text;};
  const f=async(input,opts)=>({text:await call(input,false)});
  f.json=async(input,opts)=>{const t=await call(input,true);let v=null;try{v=JSON.parse(t);}catch(e){const m=t.match(/[\[{][\s\S]*[\]}]/);if(m)try{v=JSON.parse(m[0]);}catch(_){}}
    if(v===null)throw {code:'invalid_json',text:t};if(v&&!Array.isArray(v)&&typeof v==='object'){const ks=Object.keys(v);if(ks.length===1&&Array.isArray(v[ks[0]]))return v[ks[0]];}return v;};
  return f;}

function setNetStatus(ok){const el=$('#netLbl');if(!el)return;el.textContent=Net.mode==='off'?'одиночная игра':ok?`онлайн: ${Net.peers.length+1}`:'нет связи с сервером';}

async function netInit(){
  if(window.claude&&window.claude.use){
    window.claude.use('sample').then(s=>{if(s)sampleFn=s;}).catch(()=>{});
    const r=await window.claude.use('room').catch(()=>null);
    if(r){roomNs=r;Net.mode='room';r.onPeers(()=>{const list=roomPeers();Net.peers=list;syncPeers(list);readRoomMsgs(list);setNetStatus(true);},()=>{roomNs=null;Net.mode='off';peerRender.clear();setNetStatus(false);});pushPresence();setNetStatus(true);return;}}
  if(location.protocol.startsWith('http')&&!/claude\.ai|claudeusercontent/.test(location.hostname)){
    try{const r=await fetch('api.php?a=ping',{cache:'no-store'});if(r.ok){const j=await r.json();if(j&&j.ok){Net.mode='http';Net.llm=!!j.llm;if(j.llm)sampleFn=makeHttpSample();setNetStatus(true);httpLoop();return;}}}catch(e){}}
  Net.mode='off';setNetStatus(false);}
