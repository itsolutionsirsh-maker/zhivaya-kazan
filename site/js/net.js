// откуда пришёл игрок — для цифр на сервере: Телега, ссылка друга, метка в адресе (?from=vk) или сайт-источник
function netSrc(){try{if(typeof TG!=='undefined'&&TG.on)return /^ref_/.test(TG.startParam)?'ref':(TG.startParam?('tg:'+TG.startParam).slice(0,24):'tg');
  const q=new URLSearchParams(location.search),u=q.get('from')||q.get('utm_source');if(u)return ('web:'+u).slice(0,24);
  const r=document.referrer?new URL(document.referrer).hostname:'';return r&&r!==location.hostname?('web:'+r).slice(0,24):'web';}catch(e){return 'web';}}
// ===== Сеть: комната claude.ai или свой сервер (api.php) =====
// Режимы: 'room' — внутри claude.ai; 'http' — на своём сайте; 'off' — одиночная игра.
const Net={mode:'off',me:null,peers:[],llm:false};
let myCid=null;try{myCid=localStorage.getItem('zk.cid');}catch(e){}
// zk.cid — секрет игрока, уходит только серверу; в чате и в мире у игрока публичный номер (pid), его присылает сервер
function myPid(){return (typeof Net!=='undefined'&&Net.pid)||myCid;}
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
  try{const body={a:'sync',id:myCid,p:buildPresence(),out:httpOut.splice(0),since:httpSince,src:netSrc()};
    const r=await fetch('api.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});const j=await r.json();
    if(Array.isArray(j.players)){Net.peers=j.players.filter(pl=>pl&&pl.p&&typeof pl.p.x==='number').map(pl=>({peer:pl.id,presence:pl.p}));syncPeers(Net.peers);}
    if(j.pid)Net.pid=j.pid;if(Array.isArray(j.msgs)){for(const m of j.msgs){if(m.from===myPid()){if(httpFirst)chatDeliver('me',player.name,m.to?'dm':'city',m.t,true,m.to);continue;}if(m.to&&m.to!==myPid())continue;chatDeliver(m.from,m.n||'Игрок',m.to?'dm':'city',m.t,httpFirst);}}
    if(typeof j.seq==='number')httpSince=j.seq;httpFirst=false;setNetStatus(true);
  }catch(e){setNetStatus(false);}
  await new Promise(r=>setTimeout(r,document.hidden?3000:800));}}

function makeHttpSample(){
  const call=async(input,json)=>{const msgs=typeof input==='string'?[{role:'user',content:input}]:input;const r=await fetch('api.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({a:'llm',id:myCid,messages:msgs,json:!!json}),cache:'no-store'});const j=await r.json();if(!j.text){if((j.err==='quota'||j.err==='budget')&&!Net.quotaTold){Net.quotaTold=true;setHint(j.err==='quota'?'Лимит живых ответов на сегодня исчерпан — жители отвечают по-простому':'Жители сегодня наговорились — отвечают по-простому');}throw {code:j.err||'upstream_error'};}return j.text;};
  const f=async(input,opts)=>({text:await call(input,false)});
  f.json=async(input,opts)=>{const t=await call(input,true);let v=null;try{v=JSON.parse(t);}catch(e){const m=t.match(/[\[{][\s\S]*[\]}]/);if(m)try{v=JSON.parse(m[0]);}catch(_){}}
    if(v===null)throw {code:'invalid_json',text:t};if(v&&!Array.isArray(v)&&typeof v==='object'){const ks=Object.keys(v);if(ks.length===1&&Array.isArray(v[ks[0]]))return v[ks[0]];}return v;};
  return f;}

function setNetStatus(ok){const el=$('#netLbl');if(!el)return;const n=Net.online||Net.peers.length+1;el.textContent=Net.mode==='off'?'одиночная игра':ok?`онлайн: ${n.toLocaleString('ru-RU')}`:'нет связи с сервером';}

// ---------- WebSocket (свой сервер на VPS): мгновенные позиции и чат ----------
// Сервер присылает только соседей: {t:'w', p:[[sid,x10,y10,hx100,hy100,b]], m:[[sid,id,meta]], g:[sid], c:[[cx,cy,n]], n:онлайн}
let wsSock=null,wsFails=0,wsLastPush=0,wsLastMeta='';const wsPeers=new Map();
function wsPush(){const t=performance.now();if(!wsSock||wsSock.readyState!==1||t-wsLastPush<140)return;wsLastPush=t;const p=buildPresence();
  wsSock.send(JSON.stringify({t:'p',x:p.x,y:p.y,hx:p.hx,hy:p.hy,b:p.b}));
  const m={n:p.n,r:p.r,c:p.c,v:p.v,vc:p.vc,sy:p.sy,g:p.g,a:p.a};const ms=JSON.stringify(m);if(ms!==wsLastMeta){wsLastMeta=ms;wsSock.send(JSON.stringify({t:'m',m}));}}
function wsApply(d){
  if(d.m)for(const [sid,id,meta] of d.m){let e=wsPeers.get(sid);if(!e){e={peer:id,presence:{x:0,y:0,hx:0,hy:1,b:0}};wsPeers.set(sid,e);}e.peer=id;Object.assign(e.presence,meta);}
  if(d.p)for(const [sid,x,y,hx,hy,b] of d.p){const e=wsPeers.get(sid);if(!e)continue;e.presence.x=x/10;e.presence.y=y/10;e.presence.hx=hx/100;e.presence.hy=hy/100;e.presence.b=b;}
  if(d.g)for(const sid of d.g)wsPeers.delete(sid);
  if(d.c){Net.crowd=d.c;}if(typeof d.n==='number')Net.online=d.n;
  Net.peers=[...wsPeers.values()];syncPeers(Net.peers);setNetStatus(true);}
function wsConnect(){const url=(location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws';let opened=false;
  try{wsSock=new WebSocket(url);}catch(e){wsFallback();return;}
  wsSock.onopen=()=>{opened=true;wsFails=0;Net.mode='ws';wsPeers.clear();wsLastMeta='';const p=buildPresence();wsSock.send(JSON.stringify({t:'hello',id:myCid,p,src:netSrc()}));wsLastMeta=JSON.stringify({n:p.n,r:p.r,c:p.c,v:p.v,vc:p.vc,sy:p.sy,g:p.g,a:p.a});setNetStatus(true);};
  wsSock.onmessage=ev=>{let d;try{d=JSON.parse(ev.data);}catch(e){return;}
    if(d.t==='w')wsApply(d);
    else if(d.t==='msg'){const m=d.m;if(m.from===myPid())return;if(m.to&&m.to!==myPid())return;chatDeliver(m.from,m.n||'Игрок',m.to?'dm':'city',m.t,false);}
    else if(d.t==='hist'){if(d.pid)Net.pid=d.pid;for(const m of d.msgs||[]){if(m.from===myPid())chatDeliver('me',player.name,m.to?'dm':'city',m.t,true,m.to);else chatDeliver(m.from,m.n||'Игрок',m.to?'dm':'city',m.t,true);}}
    else if(d.t==='err')setHint({busy:'В общем чате сейчас слишком много сообщений — попробуйте через пару секунд',muted:'Общий чат для вас временно отключён: на ваши сообщения пожаловались',banned:'Модератор закрыл вам чат за нарушение правил',dup:'Это сообщение вы только что отправили'}[d.e]||'Не так часто: подождите пару секунд');};
  wsSock.onclose=()=>{setNetStatus(false);wsSock=null;if(!opened)wsFails++;if(wsFails>=3){wsFallback();return;}setTimeout(wsConnect,opened?1500:3000);};
  wsSock.onerror=()=>{};}
function wsFallback(){if(Net.mode==='http')return;Net.mode='http';httpLoop();}
// толпа сверх показанных игроков: сервер шлёт только сколько человек в каждой клетке 10×10 м
function drawCrowd(toS,z){const c=Net.crowd;if(!c||!c.length||scene!=='city')return;ctx.save();
  const seen=new Map();for(const e of wsPeers.values()){const k=Math.floor(e.presence.x/10)+','+Math.floor(e.presence.y/10);seen.set(k,(seen.get(k)||0)+1);}{const k=Math.floor(player.x/10)+','+Math.floor(player.y/10);seen.set(k,(seen.get(k)||0)+1);}
  for(const [cx,cy,n0] of c){const n=n0-(seen.get(cx+','+cy)||0);if(n<=0)continue;const x0=cx*10,y0=cy*10;const [sx,sy]=toS(x0+5,y0+5);if(sx<-40||sx>W+40||sy<-40||sy>H+40)continue;
    if(z<1.3){ctx.fillStyle=`rgba(74,144,226,${Math.min(0.55,0.1+n*0.03)})`;const s=Math.max(3,10*z);ctx.fillRect(sx-s/2,sy-s/2,s,s);continue;}
    const k=Math.min(n,36);for(let i=0;i<k;i++){const h=((cx*73856093)^(cy*19349663)^(i*83492791))>>>0;const px=x0+(h%1000)/100,py=y0+((h>>10)%1000)/100;const [qx,qy]=toS(px,py);
      ctx.fillStyle=['#4A90E2','#D64545','#2BB062','#E0A030','#8E44AD','#3A3F47'][h%6];ctx.beginPath();ctx.arc(qx,qy,Math.max(1.5,0.32*z),0,TAU);ctx.fill();}}
  ctx.restore();}

// ---------- аккаунт на сервере: имя + PIN, прогресс хранится на сервере ----------
let acct=null;try{acct=JSON.parse(localStorage.getItem('zk.acct')||'null');}catch(e){}
// Синхронизация между устройствами. zk.syncRev — версия сервера (updated), которую это устройство видело последней.
// При запуске: на сервере версия новее — туда сохраняло другое устройство, берём игру с сервера; иначе продолжаем свою.
// До этого решения на сервер не сохраняем (раньше первый же кадр делал свою копию «новее» и затирал чужой прогресс).
// Каждое сохранение несёт base=zk.syncRev: устарела (другое устройство, старая вкладка, «Начать заново») — сервер отказывает, берём его копию.
let syncRev=0;try{syncRev=+localStorage.getItem('zk.syncRev')||0;}catch(e){}
const bootLocalT=(()=>{try{return (JSON.parse(localStorage.getItem('zk.state')||'null')||{}).t||0;}catch(e){return 0;}})();   // до первого кадра
function setRev(u){syncRev=+u||0;try{localStorage.setItem('zk.syncRev',String(syncRev));}catch(e){}}
function acctServerNewer(j){if(syncRev)return (j.updated||0)>syncRev+0.001;return !!(j.state&&(j.state.t||0)>bootLocalT+5000);}   // старым сохранениям без zk.syncRev — по времени до первого кадра
// решение при запуске (сайт — acctSyncOnBoot, Телега — tgAfter): true — берём серверную копию и перезапускаемся
function acctBootSync(j){if(acctServerNewer(j)&&(j.state||syncRev)){acctApply(j);return true;}setRev(j.updated||0);Net.syncReady=true;acctSave();return false;}
async function acctCall(a,body){const r=await fetch('api.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign({a},body)),cache:'no-store'});return r.json();}
function acctSnapshot(){if(window.zkNoSave)return null;try{saveState();}catch(e){}let state=null,profile=null,city=null;try{state=JSON.parse(localStorage.getItem('zk.state')||'null');const prog=JSON.parse(localStorage.getItem('zk.prog')||'null');if(state&&prog)state=Object.assign({},state,{prog});profile=JSON.parse(localStorage.getItem('zk.profile')||'null');city=JSON.parse(localStorage.getItem('zk.citylife')||'null');}catch(e){}if(profile&&profile.photo&&profile.photo.length>9000)profile=Object.assign({},profile,{photo:null});return {state,profile,city};}
async function acctSave(){if(!acct||window.zkNoSave)return;if(!Net.syncReady){if(Net.acct&&!(typeof TG!=='undefined'&&TG.on))acctSyncOnBoot();return;}const snap=acctSnapshot();if(!snap||!snap.state)return;
  try{const j=await acctCall('save',Object.assign({token:acct.token,base:syncRev||undefined},snap));if(j.ok){if(j.updated)setRev(j.updated);return;}
    if(j.err==='conflict'){acctConflict();return;}   // на сервере новее: игра открыта на другом устройстве (или там «Начать заново»)
    if(j.err==='too_big'&&!Net.bigTold){Net.bigTold=true;setHint('Сохранение слишком большое — на сервер не уходит. Напишите нам');}
    if(j.err==='auth'){acct=null;try{localStorage.removeItem('zk.acct');}catch(e){}renderAcct();}}catch(e){}}
async function acctLogin(name,pin){const j=await acctCall('login',{name,pin}).catch(()=>({err:'net'}));
  const E={name:'Имя — от 2 букв',pin:'PIN — от 4 до 8 цифр',wrong_pin:'Неверный PIN для этого имени',locked:'Слишком много попыток. Подождите 15 минут',rate_limited:'Слишком часто. Попробуйте через минуту',net:'Нет связи с сервером'};
  if(j.err){$('#acctMsg').textContent=E[j.err]||'Не получилось';return;}
  if(!j.created&&j.state&&localHasGame()&&!confirm('У этого игрока на сервере уже есть игра — загрузить её? Прогресс этого браузера заменится.')){$('#acctMsg').textContent='Вход отменён: остаётся игра этого браузера';return;}
  acct={token:j.token,name:j.name};try{localStorage.setItem('zk.acct',JSON.stringify(acct));}catch(e){}
  if(!j.created&&j.state){acctApply(j);return;}
  setRev(j.updated||0);Net.syncReady=true;await acctSave();$('#acctMsg').textContent=j.created?'Аккаунт создан. Прогресс сохраняется на сервере':'Вошли. Прогресс сохраняется на сервере';renderAcct();}
function renderAcct(){const box=$('#acctBox');if(!box)return;box.hidden=!Net.acct;if(!Net.acct)return;const inForm=$('#acctForm'),out=$('#acctOut');
  const tg=acct&&acct.tg;const p=inForm.querySelector('p');const go=$('#acctGo');const ob=$('#acctOutBtn');
  const inTg=typeof TG!=='undefined'&&TG.on;const tr=$('#acctTgRow');if(tr)tr.hidden=!Net.tg||inTg||!!acct;const pr=$('#pTgRow');if(pr)pr.hidden=!Net.tg||inTg||!!acct;
  if(tg){inForm.hidden=false;out.hidden=false;$('#acctWho').textContent=acct.name+' (Телеграм)';if(p)p.textContent='Уже играли на сайте под именем с PIN? Введите их — Телеграм будет открывать того игрока.';if(go)go.textContent='Привязать';if(ob)ob.hidden=inTg;return;}
  if(p)p.textContent='Войдите — деньги, работа и репутация будут храниться на сервере и откроются с любого устройства. Нового игрока создаст первый вход.';if(go)go.textContent='Войти';if(ob)ob.hidden=false;
  if(acct){inForm.hidden=true;out.hidden=false;$('#acctWho').textContent=acct.name;}else{inForm.hidden=false;out.hidden=true;}}
if($('#acctGo'))$('#acctGo').addEventListener('click',()=>acct&&acct.tg&&typeof tgLink==='function'?tgLink($('#acctName').value,$('#acctPin').value):acctLogin($('#acctName').value,$('#acctPin').value));
if($('#acctOutBtn'))$('#acctOutBtn').addEventListener('click',async()=>{await acctSave();acct=null;try{localStorage.removeItem('zk.acct');}catch(e){}$('#acctMsg').textContent='Вы вышли. Прогресс остался на сервере';renderAcct();});
setInterval(acctSave,30000);
window.addEventListener('pagehide',()=>{if(!acct||!navigator.sendBeacon||window.zkNoSave||!Net.syncReady)return;const snap=acctSnapshot();if(!snap||!snap.state)return;try{navigator.sendBeacon('api.php',new Blob([JSON.stringify(Object.assign({a:'save',token:acct.token,base:syncRev||undefined},snap))],{type:'application/json'}));}catch(e){}});
// ---------- вход на сайте через Телеграм: тот же аккаунт и прогресс, что в мини-приложении ----------
// сервер даёт ссылку на бота с одноразовым кодом; игрок жмёт в боте «Да, войти»; сайт ждёт по своему секрету (до 5 минут)
const TGW={poll:null,timer:null,until:0,link:''};
function tgwMsg(t){const m=$('#acctMsg');if(m)m.textContent=t;if(!$('#profileModal').hidden)setHint(t);}
async function acctTgStart(){if(TGW.poll&&performance.now()<TGW.until){if(TGW.link)window.open(TGW.link,'_blank');return;}
  const j=await acctCall('tgweb',{}).catch(()=>({err:'net'}));
  if(!j.ok){tgwMsg(j.err==='rate_limited'?'Слишком часто. Попробуйте через пару минут':j.err==='no_tg'?'Вход через Телеграм ещё не настроен на сервере':'Нет связи с сервером');return;}
  TGW.poll=j.poll;TGW.link=j.link;TGW.until=performance.now()+(j.ttl||300)*1000;window.open(j.link,'_blank');
  tgwMsg('Откройте Телеграм: в чате с ботом нажмите «Запустить», потом «Да, войти». Ждём…');clearTimeout(TGW.timer);TGW.timer=setTimeout(tgwPoll,2500);}
async function tgwPoll(){if(!TGW.poll)return;if(performance.now()>TGW.until){TGW.poll=null;tgwMsg('Время на вход вышло. Нажмите «Войти через Телеграм» ещё раз');return;}
  let j=null;try{j=await acctCall('tgwebpoll',{poll:TGW.poll});}catch(e){}
  if(!j||j.wait){TGW.timer=setTimeout(tgwPoll,document.hidden?5000:2000);return;}
  TGW.poll=null;if(!j.ok){tgwMsg(j.err==='denied'?'Вход отменён в Телеге':'Ссылка устарела. Нажмите «Войти через Телеграм» ещё раз');return;}
  // в Телеге уже есть игра — загрузится она (как при входе по имени и PIN); новый аккаунт — положим туда то, что уже есть в браузере
  if(!j.created&&j.state){let local=null;try{local=JSON.parse(localStorage.getItem('zk.state')||'null');}catch(e){}
    // спрашиваем, только если в браузере уже своя игра: персонаж создан и деньги или время ушли от стартовых
    const mine=localHasGame();
    if(mine&&!confirm('В Телеге у вас уже есть игра — загрузить её? Прогресс этого браузера заменится.')){tgwMsg('Вход отменён: остаётся игра этого браузера');return;}}
  acct={token:j.token,name:j.name,tg:true,tgId:j.tgId};try{localStorage.setItem('zk.acct',JSON.stringify(acct));}catch(e){}
  if(!j.created&&j.state){acctApply(j);return;}
  setRev(j.updated||0);Net.syncReady=true;await acctSave();tgwMsg('Вы вошли через Телеграм. Прогресс сохраняется на сервере и открывается и в Телеге, и здесь');renderAcct();}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&TGW.poll){clearTimeout(TGW.timer);tgwPoll();}});
for(const id of ['#acctTgBtn','#pTgBtn'])if($(id))$(id).addEventListener('click',acctTgStart);
// загрузить прогресс с сервера и перезапустить (локальные сохранения на это время выключены)
function acctApply(j){window.zkNoSave=true;try{setRev(j.updated||0);localStorage.setItem('zk.state',JSON.stringify(j.state));if(j.state&&j.state.prog)localStorage.setItem('zk.prog',JSON.stringify(j.state.prog));if(j.profile)localStorage.setItem('zk.profile',JSON.stringify(j.profile));if(j.city)localStorage.setItem('zk.citylife',JSON.stringify(j.city));else localStorage.removeItem('zk.citylife');}catch(e){}const m=$('#acctMsg');if(m)m.textContent='Прогресс загружен с сервера — перезапускаем…';location.reload();}
// при запуске: если на сервере сохранение новее (играли с другого устройства) — взять его
async function acctSyncOnBoot(){if(!acct||Net.syncing||Net.syncReady)return;if(acct.tg&&typeof TG!=='undefined'&&TG.on)return;   // в Телеге вход и загрузку делает tg.js
  Net.syncing=true;try{const j=await acctCall('load',{token:acct.token});if(j.err==='auth'){acct=null;localStorage.removeItem('zk.acct');renderAcct();return;}
  if(j.ok)acctBootSync(j);}catch(e){}finally{Net.syncing=false;}}
// Игра открыта на другом устройстве и оно сохранилось позже: здесь пауза и ни одного сохранения, пока игрок не выберет «Играть здесь»
// (тогда берём свежую копию с сервера). Побеждает устройство, открытое последним, — без перезагрузок туда-сюда каждые 30 секунд.
function acctConflict(){Net.syncReady=false;const m=$('#otherDevModal');if(!m||!m.hidden)return;m.hidden=false;player.busy=true;}
if($('#otherDevGo'))$('#otherDevGo').addEventListener('click',async()=>{$('#otherDevGo').disabled=true;try{const j=await acctCall('load',{token:acct.token});if(j.ok){acctApply(j);return;}}catch(e){}$('#otherDevGo').disabled=false;setHint('Нет связи с сервером — попробуйте ещё раз');});
// своя игра в браузере: персонаж создан и деньги или время ушли от стартовых
function localHasGame(){let local=null;try{local=JSON.parse(localStorage.getItem('zk.state')||'null');}catch(e){}return !!localStorage.getItem('zk.profile')&&!!local&&(local.money!==3000||(local.minutes||0)>10*60);}

async function netInit(){
  if(window.claude&&window.claude.use){
    window.claude.use('sample').then(s=>{if(s)sampleFn=s;}).catch(()=>{});
    const r=await window.claude.use('room').catch(()=>null);
    if(r){roomNs=r;Net.mode='room';r.onPeers(()=>{const list=roomPeers();Net.peers=list;syncPeers(list);readRoomMsgs(list);setNetStatus(true);},()=>{roomNs=null;Net.mode='off';peerRender.clear();setNetStatus(false);});pushPresence();setNetStatus(true);return;}}
  if(location.protocol.startsWith('http')&&!/claude\.ai|claudeusercontent/.test(location.hostname)){
    try{const r=await fetch('api.php?a=ping',{cache:'no-store'});if(r.ok){const j=await r.json();if(j&&j.ok){Net.llm=!!j.llm;Net.acct=!!j.acct;Net.tg=!!j.tg;renderAcct();if(Net.acct)acctSyncOnBoot();if(j.llm)sampleFn=makeHttpSample();if(j.ws&&'WebSocket' in window){Net.mode='ws';wsConnect();}else{Net.mode='http';setNetStatus(true);httpLoop();}return;}}}catch(e){}}
  Net.mode='off';setNetStatus(false);}
