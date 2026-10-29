// ===== Общие события рядом: у всех игроков в радиусе одно и то же =====
// ДТП с участием игрока: его браузер сообщает место серверу (server/node/shared-events.js), сервер проверяет и рассылает всем.
// У кого авария в радиусе — та же авария на той же улице: две разбитые машины, полиция и скорая, метка на карте.
// Матчи и праздники общие и так: время и место у всех из одних файлов (fixtures.js, fans.js). Здесь — общие реплики к ним.
// Тексты и радиусы — shared-events.js второго программиста (citySharedEvents). Реплика зависит от стадии события,
// а не от случая: у всех рядом в одно время одна и та же строка.
const SEV={list:[],staged:{},said:{},mine:[],marked:new Set(),hp:{},t:0};
const SEV_ICON={incident:'🚨',match:'🏟',holiday:'🎉'};
function sevData(k){const d=(window.citySharedEvents||{})[k];return d&&typeof d==='object'?d:{};}
function sevRadius(k,def){const r=+sevData(k).radius;return r>0?r:def;}
function sevLine(k,stage){const L=(sevData(k).lines||[]).filter(s=>typeof s==='string'&&s);if(!L.length)return '';return L[Math.max(0,Math.min(L.length-1,stage))];}

// ---------- от сервера: [{id,k,x,y,ped,age,left}], age и left — в секундах ----------
function sevApply(list){if(!Array.isArray(list))return;const t=performance.now();
  SEV.list=list.filter(e=>e&&e.k==='incident'&&Number.isFinite(+e.x)&&Number.isFinite(+e.y)&&+e.left>0).slice(0,40)
    .map(e=>({id:String(e.id).slice(0,24),k:'incident',x:+e.x,y:+e.y,ped:!!e.ped,at:t-Math.max(0,+e.age||0)*1000,until:t+(+e.left)*1000}));}
window.sevApply=sevApply;

// ---------- своё ДТП: за рулём или сбили самого игрока — сообщить серверу ----------
// Через секунду: к этому времени сервер уже знает, где игрок (координаты уходят с WebSocket), и проверит, что авария рядом с ним.
function sevReport(ac){if(!ac||ac.shared||!(ac.playerCar||ac.victim==='player'))return;
  const x=Math.round(ac.x*10)/10,y=Math.round(ac.y*10)/10,ped=ac.kind==='ped';
  SEV.mine.push({x,y,until:performance.now()+12*60e3});   // своя авария у себя и так есть — второй раз её не ставим
  setTimeout(()=>{try{if(typeof wsSock!=='undefined'&&wsSock&&wsSock.readyState===1)wsSock.send(JSON.stringify({t:'sev',k:'incident',x,y,ped}));}catch(e){}},1000);}
(function(){const f=window.createAccident;if(typeof f!=='function')return;
  window.createAccident=function(o){const ac=f.apply(this,arguments);try{sevReport(ac);}catch(e){console.warn('sev',e);}return ac;};})();

// ---------- чужая авария у себя: на ближней дороге, дальше всё как у обычного ДТП (полиция, скорая, зеваки, объезд) ----------
function sevStage(e){if(!world||!world.g)return null;const n=nearestNode(e.x,e.y,world.carAdj,120);if(n<0)return null;const G=world.g,p=world.nodes[n];
  let hx=1,hy=0;for(let k=G.eh[n];k>=0;k=G.en[k]){if(!(G.ef[k]&2))continue;const q=world.nodes[G.et[k]];const L=Math.hypot(q[0]-p[0],q[1]-p[1]);if(L>0.5){hx=(q[0]-p[0])/L;hy=(q[1]-p[1])/L;break;}}
  const a=new Car('car',n);a.hx=hx;a.hy=hy;cars.push(a);crashCar(a);
  // сбили человека — одна машина, сам пострадавший — живой игрок, его видно и так; столкновение — две машины
  if(e.ped)return createAccident({x:a.x,y:a.y,kind:'ped',cars:[a],shared:e.id});
  const b=new Car('car',n);b.x=a.x+hx*5.2;b.y=a.y+hy*5.2;const an=0.6;b.hx=hx*Math.cos(an)-hy*Math.sin(an);b.hy=hx*Math.sin(an)+hy*Math.cos(an);
  cars.push(b);crashCar(b);
  return createAccident({x:(a.x+b.x)/2,y:(a.y+b.y)/2,cars:[a,b],shared:e.id});}

// стадия: аварии — по возрасту (четверть срока на строку), матча — до игры / игра / после, праздника — по времени дня
function sevIncidentStage(e,t){const span=Math.max(60e3,e.until-e.at);return Math.min(3,Math.floor((t-e.at)/(span/4)));}
function sevNowMs(){return Number.isFinite(window.zkTestNow)?window.zkTestNow:Date.now();}   // zkTestNow — как в matchday.js, для проверок
function sevHolidayNow(){const fx=window.cityFixtures||[];if(!fx.length||typeof placeByHints!=='function')return null;
  const msk=new Date(sevNowMs()+3*3600e3),today=msk.toISOString().slice(0,10),h=msk.getUTCHours();if(h<10||h>=22)return null;
  for(const f of fx){if(f.kind!=='holiday'||f.date!==today)continue;
    // место праздника ищется по подсказкам один раз (не нашлось — снова через минуту: кварталы карты подгружаются)
    const key='h:'+f.date+':'+f.title;let c=SEV.hp[key];
    if(!c||!c.pl&&performance.now()-c.t>60e3){let pl=null;for(const hint of f.hints||[]){const q=placeByHints([hint]);if(q&&!q.d){pl=q;break;}}c=SEV.hp[key]={pl,t:performance.now()};}
    if(c.pl)return {f,x:c.pl.x,y:c.pl.y,n:c.pl.n,stage:Math.min(3,Math.floor((h-10)/3)),key};}
  return null;}

function sevSay(key,stage,text){if(!text)return;const k=key+'#'+stage;if(SEV.said[k])return;SEV.said[k]=1;addEvent(text,'say');}

defWatch(dt=>{SEV.t-=dt;if(SEV.t>0||!world||!world.meta||typeof player==='undefined')return;SEV.t=1;const t=performance.now(),inCity=scene==='city';
  // аварии других игроков: метка в радиусе, авария у себя — если ближе 600 м и ей меньше 8 минут, строка — по стадии
  SEV.list=SEV.list.filter(e=>e.until>t);SEV.mine=SEV.mine.filter(m=>m.until>t);
  const want=new Set(),R=sevRadius('incident',900);
  for(const e of SEV.list){if(SEV.mine.some(m=>dist(m.x,m.y,e.x,e.y)<200))continue;const d=dist(player.x,player.y,e.x,e.y);if(d>=R)continue;
    const road=nearestRoadName(e.x,e.y)||'';want.add(e.id);mark(null,'sev:'+e.id,e.x,e.y,'🚨',`ДТП${road?' — '+road:''}`,{color:'#C0392B'});
    if(!inCity)continue;
    if(!SEV.staged[e.id]&&d<600&&t-e.at<8*60e3){SEV.staged[e.id]=1;try{sevStage(e);}catch(err){console.warn('sev stage',err);}}
    const st=sevIncidentStage(e,t);sevSay('i:'+e.id,st,`🚨 ДТП${road?' — '+road:''}. ${sevLine('incident',st)}`);}
  for(const id of SEV.marked)if(!want.has(id))unmark('sev:'+id);SEV.marked=want;
  for(const id of Object.keys(SEV.staged))if(!SEV.list.some(e=>e.id===id))delete SEV.staged[id];
  if(!inCity)return;
  // матч: у арены в радиусе — строка по стадии (до игры две: сначала толпа, за час — пробка на подъезде)
  const m=typeof matchCurrent==='function'?matchCurrent():null;
  if(m){const [gx,gy]=llToXY(m.v.ll);if(dist(player.x,player.y,gx,gy)<sevRadius('match',1800)){
    const st=m.phase==='before'?(sevNowMs()<m.k-60*60000?0:1):m.phase==='game'?2:3;
    sevSay('m:'+m.key,st,`🏟 ${sevLine('match',st)}`);}}
  // праздник: у места праздника в радиусе — строка по времени дня (10–13, 13–16, 16–19, 19–22 по Москве)
  const hd=sevHolidayNow();
  if(hd&&dist(player.x,player.y,hd.x,hd.y)<sevRadius('holiday',2200))sevSay(hd.key,hd.stage,`🎉 ${hd.f.title}. ${sevLine('holiday',hd.stage)}`);});
