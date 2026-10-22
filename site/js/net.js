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
function pushPresence(){if(Net.mode==='ws'){wsPush();return;}if(Net.mode!=='room'||!roomNs)return;roomNs.presence(buildPresence()).catch(()=>{});}

// отправить сообщение: to=null — всем (общий чат), to=ключ игрока — лично
function netSend(to,text){text=String(text).trim().slice(0,240);if(!text)return false;
  if(Net.mode==='room'){outbox.push({i:++outSeq,to:to||null,t:text,ts:Date.now()});while(outbox.length>4)outbox.shift();pushPresence();return true;}
  if(Net.mode==='http'){httpOut.push({to:to||null,t:text});return true;}
  if(Net.mode==='ws'){if(!wsSock||wsSock.readyState!==1)return false;wsSock.send(JSON.stringify({t:'msg',to:to||null,text}));return true;}
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

// ---------- WebSocket (свой сервер на VPS): мгновенные позиции и чат ----------
let wsSock=null,wsFails=0,wsLastPush=0;const wsPeers=new Map();
function wsPush(){const t=performance.now();if(!wsSock||wsSock.readyState!==1||t-wsLastPush<140)return;wsLastPush=t;wsSock.send(JSON.stringify({t:'p',p:buildPresence()}));}
function wsConnect(){const url=(location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws';let opened=false;
  try{wsSock=new WebSocket(url);}catch(e){wsFallback();return;}
  wsSock.onopen=()=>{opened=true;wsFails=0;Net.mode='ws';wsSock.send(JSON.stringify({t:'hello',id:myCid,p:buildPresence()}));setNetStatus(true);};
  wsSock.onmessage=ev=>{let d;try{d=JSON.parse(ev.data);}catch(e){return;}
    if(d.t==='peers'){const t=performance.now();if(d.full){const keep=new Set(d.list.map(x=>x.id));for(const k of [...wsPeers.keys()])if(!keep.has(k))wsPeers.delete(k);}
      for(const x of d.list){if(x&&x.p&&typeof x.p.x==='number')wsPeers.set(x.id,{peer:x.id,presence:x.p,t});}
      Net.peers=[...wsPeers.values()];syncPeers(Net.peers);setNetStatus(true);}
    else if(d.t==='msg'){const m=d.m;if(m.from===myCid)return;if(m.to&&m.to!==myCid)return;chatDeliver(m.from,m.n||'Игрок',m.to?'dm':'city',m.t,false);}
    else if(d.t==='hist'){for(const m of d.msgs||[]){if(m.from===myCid)chatDeliver('me',player.name,m.to?'dm':'city',m.t,true,m.to);else chatDeliver(m.from,m.n||'Игрок',m.to?'dm':'city',m.t,true);}}
    else if(d.t==='err'&&d.e==='rate')setHint('Не так часто: не больше 6 сообщений за 10 секунд');};
  wsSock.onclose=()=>{setNetStatus(false);wsSock=null;if(!opened)wsFails++;if(wsFails>=3){wsFallback();return;}setTimeout(wsConnect,opened?1500:3000);};
  wsSock.onerror=()=>{};}
function wsFallback(){if(Net.mode==='http')return;Net.mode='http';httpLoop();}

// ---------- аккаунт на сервере: имя + PIN, прогресс хранится на сервере ----------
let acct=null;try{acct=JSON.parse(localStorage.getItem('zk.acct')||'null');}catch(e){}
async function acctCall(a,body){const r=await fetch('api.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign({a},body)),cache:'no-store'});return r.json();}
function acctSnapshot(){if(window.zkNoSave)return null;try{saveState();}catch(e){}let state=null,profile=null;try{state=JSON.parse(localStorage.getItem('zk.state')||'null');profile=JSON.parse(localStorage.getItem('zk.profile')||'null');}catch(e){}if(profile&&profile.photo&&profile.photo.length>9000)profile=Object.assign({},profile,{photo:null});return {state,profile};}
async function acctSave(){if(!acct||window.zkNoSave)return;const snap=acctSnapshot();if(!snap||!snap.state)return;try{const j=await acctCall('save',Object.assign({token:acct.token},snap));if(j.err==='auth'){acct=null;try{localStorage.removeItem('zk.acct');}catch(e){}renderAcct();}}catch(e){}}
async function acctLogin(name,pin){const j=await acctCall('login',{name,pin}).catch(()=>({err:'net'}));
  const E={name:'Имя — от 2 букв',pin:'PIN — от 4 до 8 цифр',wrong_pin:'Неверный PIN для этого имени',locked:'Слишком много попыток. Подождите 15 минут',rate_limited:'Слишком часто. Попробуйте через минуту',net:'Нет связи с сервером'};
  if(j.err){$('#acctMsg').textContent=E[j.err]||'Не получилось';return;}
  acct={token:j.token,name:j.name};try{localStorage.setItem('zk.acct',JSON.stringify(acct));}catch(e){}
  if(!j.created&&j.state){acctApply(j);return;}
  await acctSave();$('#acctMsg').textContent=j.created?'Аккаунт создан. Прогресс сохраняется на сервере':'Вошли. Прогресс сохраняется на сервере';renderAcct();}
function renderAcct(){const box=$('#acctBox');if(!box)return;box.hidden=!Net.acct;if(!Net.acct)return;const inForm=$('#acctForm'),out=$('#acctOut');
  if(acct){inForm.hidden=true;out.hidden=false;$('#acctWho').textContent=acct.name;}else{inForm.hidden=false;out.hidden=true;}}
if($('#acctGo'))$('#acctGo').addEventListener('click',()=>acctLogin($('#acctName').value,$('#acctPin').value));
if($('#acctOutBtn'))$('#acctOutBtn').addEventListener('click',async()=>{await acctSave();acct=null;try{localStorage.removeItem('zk.acct');}catch(e){}$('#acctMsg').textContent='Вы вышли. Прогресс остался на сервере';renderAcct();});
setInterval(acctSave,30000);
window.addEventListener('pagehide',()=>{if(!acct||!navigator.sendBeacon||window.zkNoSave)return;const snap=acctSnapshot();if(!snap||!snap.state)return;try{navigator.sendBeacon('api.php',new Blob([JSON.stringify(Object.assign({a:'save',token:acct.token},snap))],{type:'application/json'}));}catch(e){}});
// загрузить прогресс с сервера и перезапустить (локальные сохранения на это время выключены)
function acctApply(j){window.zkNoSave=true;try{localStorage.setItem('zk.state',JSON.stringify(j.state));if(j.profile)localStorage.setItem('zk.profile',JSON.stringify(j.profile));}catch(e){}const m=$('#acctMsg');if(m)m.textContent='Прогресс загружен с сервера — перезапускаем…';location.reload();}
// при запуске: если на сервере сохранение новее (играли с другого устройства) — взять его
async function acctSyncOnBoot(){if(!acct)return;try{const j=await acctCall('load',{token:acct.token});if(j.err==='auth'){acct=null;localStorage.removeItem('zk.acct');renderAcct();return;}
  let local=null;try{local=JSON.parse(localStorage.getItem('zk.state')||'null');}catch(e){}if(j.state&&(j.state.t||0)>((local&&local.t)||0)+5000)acctApply(j);}catch(e){}}

async function netInit(){
  if(window.claude&&window.claude.use){
    window.claude.use('sample').then(s=>{if(s)sampleFn=s;}).catch(()=>{});
    const r=await window.claude.use('room').catch(()=>null);
    if(r){roomNs=r;Net.mode='room';r.onPeers(()=>{const list=roomPeers();Net.peers=list;syncPeers(list);readRoomMsgs(list);setNetStatus(true);},()=>{roomNs=null;Net.mode='off';peerRender.clear();setNetStatus(false);});pushPresence();setNetStatus(true);return;}}
  if(location.protocol.startsWith('http')&&!/claude\.ai|claudeusercontent/.test(location.hostname)){
    try{const r=await fetch('api.php?a=ping',{cache:'no-store'});if(r.ok){const j=await r.json();if(j&&j.ok){Net.llm=!!j.llm;Net.acct=!!j.acct;renderAcct();if(Net.acct)acctSyncOnBoot();if(j.llm)sampleFn=makeHttpSample();if(j.ws&&'WebSocket' in window){Net.mode='ws';wsConnect();}else{Net.mode='http';setNetStatus(true);httpLoop();}return;}}}catch(e){}}
  Net.mode='off';setNetStatus(false);}
