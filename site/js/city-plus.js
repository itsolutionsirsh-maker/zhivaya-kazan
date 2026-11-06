// Рынки с татарской едой и арены. Карточка — фото и гифка.
// Футбол — один удар у запасных ворот Ак Барс Арены, не отдельный матч.
const BAZAARS=[
  {id:'kolkhoz',n:'Центральный (Колхозный) рынок',ll:[55.78642,49.10860],addr:'центр',note:'Колхозный. Чак-чак горкой, эчпочмаки с противня и чай из самовара.',radius:80},
  {id:'domchak',n:'Дом чак чака',ll:[55.79050,49.11563],addr:'у Кремля',note:'Дом чак-чака. Горка сладостей и пиала чая.',radius:80},
  {id:'pair',n:'Чак чак & эчпочмак',ll:[55.78130,49.11527],addr:'у Петербургской',note:'Лоток с треугольниками и чак-чаком. Чай рядом.',radius:2200,many:2},
  {id:'teastall',n:'Чай и чак-чак',ll:[55.78786,49.12019],addr:'центр',note:'Чай и чак-чак. Самовар на краю прилавка.',radius:80},
  {id:'moscow',n:'Московский рынок',ll:[55.82799,49.08083],addr:'Московский',note:'Московский рынок. Длинный ряд: сладости, треугольники и мёд.',radius:80},
  {id:'novo',n:'Ново-Савиновский рынок',ll:[55.83165,49.14320],addr:'Ново-Савиновский',note:'Ново-Савиновский. Прилавки с выпечкой и чаем до позднего вечера.',radius:80},
  {id:'vostok',n:'Восточный',ll:[55.81972,49.18227],addr:'Восточный',note:'Рынок «Восточный». Горячий ряд и самовар.',radius:50},
  {id:'kompressor',n:'Компрессорный рынок',ll:[55.81982,49.18296],addr:'Компрессорный',note:'Компрессорный рынок. Эчпочмак с пылу и чай.',radius:50},
  {id:'pion',n:'На Пионерской',ll:[55.80602,49.18573],addr:'Пионерская',note:'Рынок на Пионерской. Пиалы, мёд и чак-чак.',radius:80},
  {id:'dauria',n:'Даурия',ll:[55.76404,49.17466],addr:'Даурия',note:'Рынок «Даурия». Тёплый ряд со сладостями и треугольниками.',radius:80}
];
const ARENAS=[
  {id:'akbars-arena',n:'Ак Барс Арена',sport:'football',ll:[55.822447,49.162732],addr:'Ямашева · футбол «Рубин»',note:'Футбольный стадион. Свет, трибуны и один удар у запасных ворот — не отдельный матч. Хоккейный «Ак Барс» играет на Татнефть Арене.'},
  {id:'tatneft-arena',n:'Татнефть Арена',sport:'hockey',ll:[55.817838,49.124852],addr:'Чистопольская · хоккей «Ак Барс»',note:'Дом «Ак Барса». Лёд, свет и толпа в зелёно-белом. Футбольный удар — на Ак Барс Арене.'}
];
const PLUS_STILL={row:'img/bazaar/row.jpg',football:'img/arena/football.jpg',hockey:'img/arena/hockey.jpg'};
const PLUS_CLIP={row:'img/bazaar/tea.mp4',football:'img/arena/football.mp4',hockey:'img/arena/hockey.mp4'};
const PLUS_IMG={};
const PLUS_W=['Гульшат','Зухра','Рашида','Наиля','Альбина','Суфия'];
const PLUS_M=['Фарид','Ильяс','Ринат','Булат','Халил','Марат'];
const BAZAAR_GOODS={
  chak:{label:'Чак-чак · 180 ₽',price:180,food:15,mood:4,en:1,say:'Чак-чак'},
  pie:{label:'Эчпочмак · 90 ₽',price:90,food:22,mood:3,en:1,say:'Эчпочмак'},
  tea:{label:'Чай из самовара · 80 ₽',price:80,food:2,mood:6,en:5,say:'Чай'},
  honey:{label:'Мёд и курага · 160 ₽',price:160,food:10,mood:4,en:2,say:'Мёд'}
};
if(typeof VENUE_STYLES!=='undefined'){
  VENUE_STYLES.bazaar={wall:'#C4A574',trim:'#6B4423',counter:'#8C5A32',top:'#E0B070',wood:'#A8743C',seat:'#6B5344',accent:'#C9894A',floor:['#D8C7A4','#CDB892'],motif:'brick'};
  VENUE_STYLES.arenafoot={wall:'#1c2420',trim:'#243028',counter:'#2a2420',top:'#d4c4a0',wood:'#3a3028',seat:'#9B1B30',accent:'#1F6F3A',floor:['#1e2820','#243028'],motif:'panels'};
  VENUE_STYLES.arenahockey={wall:'#1a2228',trim:'#2a343c',counter:'#243038',top:'#d8e0e4',wood:'#2a3034',seat:'#0B7A3B',accent:'#F7F4EF',floor:['#1c2428','#222a30'],motif:'panels'};
}
if(typeof KIND_RU!=='undefined'){KIND_RU.bazaar='рынок';KIND_RU.arena='арена';}
if(typeof POI_PRIO!=='undefined')POI_PRIO.arena=1;
if(typeof POI_GLYPH!=='undefined')POI_GLYPH.arena='🏟';
function plusNorm(s){return String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[«»"'’]/g,'').replace(/\s+/g,' ').trim();}
function bazaarById(id){return BAZAARS.find(b=>b.id===id)||BAZAARS[0];}
function bazaarByName(name){const n=plusNorm(name);return BAZAARS.find(b=>plusNorm(b.n)===n)||null;}
function arenaByName(name){const n=plusNorm(name);return ARENAS.find(a=>plusNorm(a.n)===n)||ARENAS[0];}
function plusSame(p,b){return plusNorm(p&&p.n)===plusNorm(b.n);}
function plusMatchHere(id){
  const m=typeof matchCurrent==='function'?matchCurrent():null;
  if(!m||!m.v||m.v.id!==id)return null;
  return m;
}
function plusMatchLine(id){
  const m=plusMatchHere(id);
  if(!m)return 'Сейчас матча нет. Можно сесть на трибуну и открыть карточку.';
  const title=m.f.title+(m.f.time?' · '+m.f.time:'');
  if(m.phase==='before')return `Скоро ${title}. У ворот уже толпа, свет греют.`;
  if(m.phase==='game')return `${title}: игра идёт. Трибуны шумят.`;
  let word='ничья';
  if(typeof matchOutcome==='function'){const o=matchOutcome(m.f);word=o==='win'?'наши забрали очки':o==='lose'?'сегодня не наши очки':'ничья';}
  return `${title}: свисток был, ${word}. Люди расходятся.`;
}
function plusNpc(it,x,y,job,clothes,female,o){
  const p=makePersona((o&&o.role)||'staff');
  p.job=job;p.clothes=clothes;p.pants=female?'#3a2a28':'#1c2430';p.female=!!female;p.bag=null;
  p.name=female?PLUS_W[it.npcs.length%PLUS_W.length]:PLUS_M[it.npcs.length%PLUS_M.length];
  const n=Object.assign({p,x,y,hx:0,hy:1,seated:false,phase:Math.random()*6,role:p.role,isInterior:true,state:'idle',memory:p.memory},o||{});
  it.npcs.push(n);return n;
}
function makeBazaarRoom(name,key){
  const it={kind:'bazaar',name,key,w:18,h:12,furn:[],npcs:[],door:{x:9,y:12},floor:'wood',plusLook:'row',spawn:{x:9,y:10.55,hx:0,hy:-1}};
  const F=(t,x,y,w,h,extra)=>{const f=Object.assign({t,x,y,w,h},extra||{});it.furn.push(f);return f;};
  const stalls=[['chak','ЧАК-ЧАК',3.1],['pie','ЭЧПОЧМАК',7.2],['tea','ЧАЙ',11.3],['honey','МЁД',15.2]];
  stalls.forEach((s,i)=>{
    F('stall',s[2],2.05,2.7,1.15,{spot:s[0],goods:s[0],label:s[1]});
    plusNpc(it,s[2],0.62,i%2?'продавец':'продавщица',i%2?'#8C4A2F':'#F3E6C8',i%2===0,{hx:0,hy:1});
  });
  F('table',9,6.3,1.2,1.2,{spot:'table',round:true});
  F('chair',9,5.15,0.5,0.5,{ang:Math.PI/2});
  F('chair',9,7.45,0.5,0.5,{ang:-Math.PI/2});
  const g1=plusNpc(it,7.9,6.3,'гость','#6b3a28',true,{seated:true,hx:1,hy:0,role:'resident'});g1.p.role='resident';g1.role='resident';g1.p.job='за столом';
  const g2=plusNpc(it,10.1,6.3,'гость','#243028',false,{seated:true,hx:-1,hy:0,role:'resident'});g2.p.role='resident';g2.role='resident';g2.p.job='за столом';
  F('frame',9.55,10.42,1.05,0.72,{spot:'lens',walkable:true});
  F('plant',0.7,10.6,0.7,0.7);
  F('plant',17.3,10.6,0.7,0.7);
  return it;
}
function makeArenaRoom(name,key){
  const a=arenaByName(name);
  const foot=a.sport!=='hockey';
  const it={kind:'arena',name:a.n,key,w:20,h:12,furn:[],npcs:[],door:{x:10,y:12},floor:'dark',plusLook:foot?'football':'hockey',arenaId:a.id,arenaSport:a.sport,spawn:{x:10,y:10.55,hx:0,hy:-1}};
  const F=(t,x,y,w,h,extra)=>{const f=Object.assign({t,x,y,w,h},extra||{});it.furn.push(f);return f;};
  F('counter',16.2,1.7,3.2,1.05,{spot:'ticket'});
  plusNpc(it,16.2,0.62,'стюард','#1a2420',false,{hx:0,hy:1});
  const tone=foot?'#9B1B30':'#0B7A3B';
  for(let r=0;r<3;r++)for(let i=0;i<8;i++){
    const x=2.2+i*1.7,y=3.15+r*1.35;
    F('seat',x,y,0.7,0.62,{});
    if((i+r)%2===0){const fan=plusNpc(it,x,y,'болельщик',tone, (i+r)%4===0,{seated:true,hx:0,hy:-1,role:'resident'});fan.p.role='resident';fan.role='resident';fan.p.job='на трибуне';}
  }
  F('frame',10.45,10.42,1.05,0.72,{spot:'lens',walkable:true});
  if(foot)F('goalmini',3.4,8.7,2.5,1.35,{spot:'kick',walkable:true});
  return it;
}
function plusPaint(it,key){
  const im=PLUS_IMG[key];if(!it||!im)return;
  const draw=()=>{if(!im.width||interior!==it)return;const c=document.createElement('canvas');c.width=1280;c.height=720;const g=c.getContext('2d');
    const s=Math.max(1280/im.width,720/im.height),dw=im.width*s,dh=im.height*s;g.drawImage(im,(1280-dw)/2,(720-dh)/2,dw,dh);
    g.fillStyle='rgba(12,10,8,.42)';g.fillRect(0,0,1280,720);it.photoImg=c;if(typeof placeChatLook==='function')placeChatLook();};
  if(im.complete&&im.width)draw();else im.addEventListener('load',draw,{once:true});
}
function plusAfterEnter(src){
  if(!(interior&&src))return;
  if(src.kind==='bazaar'){
    plusPaint(interior,'row');
    const b=bazaarByName(src.name);
    setHint((b&&b.note?b.note+' ':'')+'Рамка у выхода — фото и гифка ряда. У прилавков чак-чак, эчпочмак и чай.');
  }else if(src.kind==='arena'){
    const a=arenaByName(src.name);
    plusPaint(interior,a.sport==='hockey'?'hockey':'football');
    const extra=a.sport==='hockey'?'Рамка — фото и гифка льда.':'Рамка — фото и гифка стадиона. У запасных ворот можно пробить пенальти.';
    setHint(a.note+' '+plusMatchLine(a.id)+' '+extra);
  }
}
function plusDrawProp(f){
  if(f.t==='stall'){
    const x=f.x-f.w/2,y=f.y-f.h/2;
    ctx.fillStyle='rgba(0,0,0,.22)';ctx.fillRect(x+0.08,y+0.1,f.w,f.h);
    ctx.fillStyle='#6b4423';
    if(typeof rrect==='function'){rrect(ctx,x,y,f.w,f.h,0.08);ctx.fill();}else ctx.fillRect(x,y,f.w,f.h);
    ctx.fillStyle='#e7c48a';ctx.fillRect(x+0.08,y+0.08,f.w-0.16,0.34);
    const col=f.goods==='tea'?'#c4a060':f.goods==='honey'?'#d4a017':f.goods==='pie'?'#e0a060':'#e8a317';
    ctx.fillStyle=col;
    for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(f.x-0.9+i*0.55,f.y-0.02,0.16,0,Math.PI*2);ctx.fill();}
    if(f.goods==='tea'){ctx.fillStyle='#c9a227';ctx.beginPath();ctx.arc(f.x+0.85,f.y-0.18,0.28,0,Math.PI*2);ctx.fill();ctx.fillStyle='#8a6a20';ctx.fillRect(f.x+0.78,f.y-0.02,0.14,0.22);}
    ctx.fillStyle='#fff6e4';ctx.font='0.2px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(f.label||'',f.x,f.y+0.32);
    return;
  }
  if(f.t==='goalmini'){
    ctx.fillStyle='rgba(31,111,58,.35)';ctx.fillRect(f.x-f.w/2,f.y-f.h/2,f.w,f.h*0.72);
    ctx.strokeStyle='#f4f7f2';ctx.lineWidth=0.08;ctx.strokeRect(f.x-f.w/2,f.y-f.h/2,f.w,f.h*0.72);
    ctx.strokeStyle='rgba(255,255,255,.4)';ctx.lineWidth=0.02;
    for(let i=1;i<5;i++){ctx.beginPath();ctx.moveTo(f.x-f.w/2+f.w*i/5,f.y-f.h/2);ctx.lineTo(f.x-f.w/2+f.w*i/5,f.y-f.h/2+f.h*0.72);ctx.stroke();}
    ctx.fillStyle='#f7f4ef';ctx.font='0.18px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('ПЕНАЛЬТИ',f.x,f.y+0.42);
  }
}
function bazaarBuy(it,g){
  spend(g.price,()=>{
    player.food=clamp(player.food+g.food,0,100);
    player.mood=clamp(player.mood+g.mood,0,100);
    player.energy=clamp(player.energy+(g.en||0),0,100);
    addEvent(`«${it.name}»: ${g.say}. Сытость +${g.food}`);
    setHint(`${g.say}. Сытость +${g.food}, настроение +${g.mood}`);
  });
}
function arenaTicket(it){
  const live=plusMatchHere(it.arenaId);
  const boost=live&&live.phase==='game'?18:10;
  spend(500,()=>{
    player.mood=clamp(player.mood+boost,0,100);
    addEvent(`Трибуна «${it.name}». Настроение +${boost}`,'say');
    setHint(live&&live.phase==='game'?'Сели к своим. Зал шумит.':plusMatchLine(it.arenaId));
  });
}
function plusMount(){
  if(typeof world==='undefined'||!world||!world.pois||typeof llToXY!=='function'||plusMount.done)return;
  plusMount.done=true;
  for(const b of BAZAARS){
    const xy=llToXY(b.ll);
    const have=world.pois.filter(p=>p._zkBazaar===b.id);
    if(have.length){have.sort((p,q)=>Math.hypot(p.x-xy[0],p.y-xy[1])-Math.hypot(q.x-xy[0],q.y-xy[1]));b.x=have[0].x;b.y=have[0].y;continue;}
    const hits=[];
    for(const p of world.pois){
      if(p._zkBazaar||p._zkClub||p.t==='club'||p.t==='arena')continue;
      if(!plusSame(p,b))continue;
      if(p.t!=='market'&&p.t!=='shop'&&p.t!=='cafe')continue;
      const d=Math.hypot(p.x-xy[0],p.y-xy[1]);
      if(d<(b.radius||80))hits.push({p,d});
    }
    hits.sort((a,c)=>a.d-c.d);
    const take=hits.slice(0,b.many||1);
    if(!take.length){
      const o={x:xy[0],y:xy[1],t:'market',n:b.n,_zkBazaar:b.id,i:(world.pseq=(world.pseq||0)+1)};
      world.pois.push(o);b.x=o.x;b.y=o.y;
    }else{
      for(const h of take){h.p.t='market';h.p.n=b.n;h.p._zkBazaar=b.id;}
      b.x=take[0].p.x;b.y=take[0].p.y;
    }
  }
  for(const a of ARENAS){
    const xy=llToXY(a.ll);
    let pin=world.pois.find(p=>p.t==='arena'&&plusNorm(p.n)===plusNorm(a.n)&&Math.hypot(p.x-xy[0],p.y-xy[1])<40);
    if(!pin){pin={x:xy[0],y:xy[1],t:'arena',n:a.n,_zkArena:a.id,i:(world.pseq=(world.pseq||0)+1)};world.pois.push(pin);}
    else pin._zkArena=a.id;
    a.x=pin.x;a.y=pin.y;
  }
}
if(typeof buildWorld==='function'){const plusWorld0=buildWorld;buildWorld=function(d){const r=plusWorld0(d);plusMount.done=false;plusMount();return r;};}
if(typeof makeInterior==='function'){const plusMake0=makeInterior;makeInterior=function(kind,name,key,room){if(kind==='bazaar')return makeBazaarRoom(name,key);if(kind==='arena')return makeArenaRoom(name,key);return plusMake0(kind,name,key,room);};}
if(typeof venueStyleId==='function'){const plusStyle0=venueStyleId;venueStyleId=function(it){if(it&&it.kind==='bazaar')return 'bazaar';if(it&&it.kind==='arena')return it.arenaSport==='hockey'?'arenahockey':'arenafoot';return plusStyle0(it);};}
if(typeof drawFurniture==='function'){const plusDraw0=drawFurniture;drawFurniture=function(f,it,t){if(f&&(f.t==='stall'||f.t==='goalmini')){plusDrawProp(f);return;}return plusDraw0(f,it,t);};}
if(typeof spotAction==='function'){const plusSpot0=spotAction;spotAction=function(f,it){
  if(it&&it.kind==='bazaar'&&f&&BAZAAR_GOODS[f.spot]){const g=BAZAAR_GOODS[f.spot];return {label:g.label,run:()=>bazaarBuy(it,g)};}
  if(it&&it.kind==='bazaar'&&f&&f.spot==='lens')return {label:'Фото и гифка ряда',run:()=>openCityLook(it)};
  if(it&&it.kind==='bazaar'&&f&&f.spot==='table')return {label:'Сесть к чужому чаю',run:()=>{player.mood=clamp(player.mood+3,0,100);setHint('Кивнули соседям. Чай уже их.');}};
  if(it&&it.kind==='arena'&&f&&f.spot==='lens')return {label:'Фото и гифка стадиона',run:()=>openCityLook(it)};
  if(it&&it.kind==='arena'&&f&&f.spot==='ticket')return {label:'Сесть на трибуну · 500 ₽',run:()=>arenaTicket(it)};
  if(it&&it.kind==='arena'&&f&&f.spot==='kick')return {label:'Пробить пенальти',run:()=>openPenalty()};
  return plusSpot0(f,it);};}
if(typeof poiHours==='function'){const plusHours0=poiHours;poiHours=function(p){if(p&&p._zkBazaar)return {a:8,b:22};if(p&&p.t==='arena')return {a:10,b:23};return plusHours0(p);};}
let plusIn0=function(){};
if(typeof enterInterior==='function'){plusIn0=enterInterior;enterInterior=function(src){const r=plusIn0(src);if(src&&(src.kind==='bazaar'||src.kind==='arena'))plusAfterEnter(src);return r;};}
if(typeof poiAction==='function'){const plusPoi0=poiAction;poiAction=function(poi){
  if(poi&&poi._zkBazaar){const closed=typeof closedAction==='function'?closedAction(poi,poiKey(poi)):null;if(closed)return closed;
    const nm=poi.n||'Рынок';const src={kind:'bazaar',name:nm,key:poiKey(poi),x:player.x,y:player.y,venueAt:{x:poi.x,y:poi.y}};
    return {label:`Зайти на «${nm}»`,run:()=>enterInterior(src)};}
  if(poi&&poi.t==='arena'){const closed=typeof closedAction==='function'?closedAction(poi,poiKey(poi)):null;if(closed)return closed;
    const nm=poi.n||'Арена';const src={kind:'arena',name:nm,key:poiKey(poi),x:player.x,y:player.y,venueAt:{x:poi.x,y:poi.y}};
    return {label:`Зайти на «${nm}»`,run:()=>enterInterior(src)};}
  return plusPoi0(poi);};}
function cityShow(mode){
  const img=document.getElementById('cityLookImg');
  const vid=document.getElementById('cityLookVid');
  const photo=cityShow.photo,clip=cityShow.clip;
  if(mode==='gif'&&clip&&vid){
    if(img)img.style.display='none';
    vid.style.display='block';vid.muted=true;
    if(vid.getAttribute('src')!==clip)vid.src=clip;
    vid.play().catch(()=>{});
  }else if(img){
    if(vid){vid.pause();vid.style.display='none';}
    img.style.display='block';img.src=photo||'';
  }
}
function openCityLook(it){
  const key=it&&it.plusLook||'row';
  const b=it&&it.kind==='bazaar'?bazaarByName(it.name):null;
  const a=it&&it.kind==='arena'?arenaByName(it.name):null;
  cityShow.photo=PLUS_STILL[key]||PLUS_STILL.row;
  cityShow.clip=PLUS_CLIP[key]||PLUS_CLIP.row;
  let box=document.getElementById('cityLook');
  if(!box){
    box=document.createElement('div');box.className='modal';box.id='cityLook';
    box.innerHTML='<div class="box" style="max-width:560px"><div class="ui-sheet-head"><span class="ui-sheet-grip"></span><h2 id="cityLookTitle">Карточка</h2><button class="btn ui-sheet-close" id="cityLookX" type="button" aria-label="Закрыть">×</button></div><div class="ui-sheet-body"><div style="border-radius:14px;overflow:hidden;background:#120c10;aspect-ratio:16/9"><img id="cityLookImg" alt="" style="width:100%;height:100%;object-fit:cover;display:block"><video id="cityLookVid" muted loop playsinline style="width:100%;height:100%;object-fit:cover;display:none"></video></div><p id="cityLookText"></p></div><div class="ui-sheet-foot"><div class="row"><button class="btn" id="cityLookPhoto" type="button">Фото</button><button class="btn primary" id="cityLookGif" type="button">Гифка</button><button class="btn" id="cityLookClose" type="button">Закрыть</button></div></div></div>';
    document.body.append(box);
    const shut=closeCityLook;
    box.querySelector('#cityLookX').onclick=shut;
    box.querySelector('#cityLookClose').onclick=shut;
    box.querySelector('#cityLookPhoto').onclick=()=>cityShow('photo');
    box.querySelector('#cityLookGif').onclick=()=>cityShow('gif');
    box.addEventListener('click',e=>{if(e.target===box)shut();});
  }
  const title=document.getElementById('cityLookTitle');
  if(title)title.textContent=it&&it.name?it.name:'Карточка';
  const text=document.getElementById('cityLookText');
  if(text){
    if(b)text.textContent=b.note+' Гифка — как наливают чай.';
    else if(a)text.textContent=a.note+' '+plusMatchLine(a.id);
    else text.textContent='Гифка крутится по кругу.';
  }
  box.hidden=false;
  if(typeof player!=='undefined')player.busy=true;
  cityShow('gif');
}
function closeCityLook(){
  const box=document.getElementById('cityLook');
  const vid=document.getElementById('cityLookVid');
  if(vid)vid.pause();
  if(box)box.hidden=true;
  if(typeof player!=='undefined'&&(typeof chatNpc==='undefined'||!chatNpc)&&!penOn())player.busy=false;
}
const PEN={on:false,raf:0,t:0,last:0,phase:'aim',aim:0,keeper:0,shot:null,ball:null,result:null};
function penOn(){return PEN.on;}
function penStat(){try{const v=JSON.parse(localStorage.getItem('zk.pens')||'{}');return {g:v.g|0,n:v.n|0};}catch(e){return {g:0,n:0};}}
function penBlurb(){const s=penStat();return `Один удар, не матч. Поймайте момент, когда вратарь не закрывает угол. Ваши пенальти: ${s.g} из ${s.n}.`;}
function penResolve(){
  const aim=PEN.shot?PEN.shot.aim:0,keeper=PEN.shot?PEN.shot.keeper:0;
  let result='goal';
  if(Math.abs(aim)>0.92)result='wide';
  else if(Math.abs(aim-keeper)<0.26)result='save';
  PEN.result=result;PEN.phase='done';
  const s=(()=>{const cur=penStat();cur.n++;if(result==='goal')cur.g++;try{localStorage.setItem('zk.pens',JSON.stringify(cur));}catch(e){}return cur;})();
  const line=result==='goal'?'Гол. Мяч в сетке.':result==='save'?'Вратарь забрал.':'Мимо. Штанга даже не дрогнула.';
  if(result==='goal')player.mood=clamp(player.mood+8,0,100);
  else if(result==='save')player.mood=clamp(player.mood+3,0,100);
  addEvent(`Пенальти на Ак Барс Арене: ${line}`,'say');
  const text=document.getElementById('penText');
  if(text)text.textContent=`${line} Пенальти: ${s.g} из ${s.n}.`;
  const btn=document.getElementById('penGo');
  if(btn){btn.disabled=false;btn.textContent='Ещё удар';}
}
function penDraw(){
  const c=document.getElementById('penCanvas');if(!c)return;
  const g=c.getContext('2d');const w=c.width,h=c.height;
  g.clearRect(0,0,w,h);
  g.fillStyle='#163226';g.fillRect(0,0,w,h);
  g.fillStyle='#1e6b3a';g.fillRect(0,h*0.42,w,h*0.58);
  g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=2;
  g.beginPath();g.moveTo(40,h*0.78);g.lineTo(w-40,h*0.78);g.stroke();
  const gx=w*0.22,gy=36,gw=w*0.56,gh=118;
  g.fillStyle='rgba(8,20,14,.45)';g.fillRect(gx,gy,gw,gh);
  g.strokeStyle='rgba(255,255,255,.28)';g.lineWidth=1;
  for(let i=1;i<7;i++){g.beginPath();g.moveTo(gx+gw*i/7,gy);g.lineTo(gx+gw*i/7,gy+gh);g.stroke();}
  for(let i=1;i<4;i++){g.beginPath();g.moveTo(gx,gy+gh*i/4);g.lineTo(gx+gw,gy+gh*i/4);g.stroke();}
  g.strokeStyle='#f4f7f2';g.lineWidth=6;g.strokeRect(gx,gy,gw,gh);
  const kx=gx+gw/2+(PEN.phase==='fly'||PEN.phase==='done'?PEN.shot.keeper:PEN.keeper)*(gw*0.42);
  const ky=gy+gh*0.62;
  g.fillStyle='#0B7A3B';g.fillRect(kx-16,ky-28,32,36);
  g.fillStyle='#f7f4ef';g.fillRect(kx-16,ky+8,32,10);
  g.fillStyle='#f1d3b5';g.beginPath();g.arc(kx,ky-36,10,0,Math.PI*2);g.fill();
  const aim=PEN.phase==='aim'?PEN.aim:PEN.shot.aim;
  const ax=gx+gw/2+aim*(gw*0.48);
  g.strokeStyle=Math.abs(aim)>0.92?'#e07a5f':'#f2c14e';g.lineWidth=3;
  g.beginPath();g.arc(ax,gy+gh-8,11,0,Math.PI*2);g.stroke();
  let bx=w/2,by=h-36;
  if(PEN.phase==='fly'||PEN.phase==='done'){
    const p=PEN.phase==='done'?1:PEN.ball.p;
    const ease=1-Math.pow(1-p,3);
    bx=w/2+(ax-w/2)*ease;by=(h-36)+(gy+gh*0.45-(h-36))*ease;
  }
  g.fillStyle='#f7f4ef';g.beginPath();g.arc(bx,by,PEN.phase==='aim'?9:7+ (1-(PEN.ball?PEN.ball.p:1))*4,0,Math.PI*2);g.fill();
  g.fillStyle='#111';g.beginPath();g.arc(bx-2,by-1,2,0,Math.PI*2);g.fill();
  if(PEN.result){
    const word=PEN.result==='goal'?'ГОЛ':PEN.result==='save'?'СЕЙВ':'МИМО';
    g.fillStyle='rgba(8,12,10,.55)';g.fillRect(w/2-90,h/2-28,180,56);
    g.fillStyle=PEN.result==='goal'?'#d6f5c8':'#fff6e4';
    g.font='700 32px Unbounded, system-ui, sans-serif';g.textAlign='center';g.textBaseline='middle';
    g.fillText(word,w/2,h/2);
  }
}
function penFrame(ts){
  if(!PEN.on)return;
  const dt=Math.min(0.05,(ts-(PEN.last||ts))/1000);
  PEN.last=ts;PEN.t+=dt;
  if(PEN.phase==='aim'){PEN.keeper=Math.sin(PEN.t*0.93)*0.72;PEN.aim=Math.sin(PEN.t*1.45)*1.05;}
  if(PEN.phase==='fly'&&PEN.ball){PEN.ball.p=Math.min(1,PEN.ball.p+dt/0.55);if(PEN.ball.p>=1)penResolve();}
  penDraw();
  PEN.raf=requestAnimationFrame(penFrame);
}
function penClick(){
  if(!PEN.on)return;
  if(PEN.phase==='aim'){
    PEN.shot={aim:PEN.aim,keeper:PEN.keeper};
    PEN.phase='fly';PEN.ball={p:0};PEN.result=null;
    const btn=document.getElementById('penGo');if(btn)btn.disabled=true;
    return;
  }
  if(PEN.phase==='done'){
    PEN.phase='aim';PEN.result=null;PEN.ball=null;PEN.shot=null;
    const btn=document.getElementById('penGo');if(btn){btn.disabled=false;btn.textContent='Удар';}
    const text=document.getElementById('penText');if(text)text.textContent=penBlurb();
  }
}
function openPenalty(){
  let box=document.getElementById('penModal');
  if(!box){
    box=document.createElement('div');box.className='modal';box.id='penModal';
    box.innerHTML='<div class="box" style="max-width:560px"><div class="ui-sheet-head"><span class="ui-sheet-grip"></span><h2>Пенальти</h2><button class="btn ui-sheet-close" id="penX" type="button" aria-label="Закрыть">×</button></div><div class="ui-sheet-body"><canvas id="penCanvas" width="640" height="360"></canvas><p id="penText"></p></div><div class="ui-sheet-foot"><div class="row"><button class="btn primary" id="penGo" type="button" style="min-height:48px">Удар</button><button class="btn" id="penClose" type="button" style="min-height:48px">Закрыть</button></div></div></div>';
    document.body.append(box);
    box.querySelector('#penX').onclick=closePenalty;
    box.querySelector('#penClose').onclick=closePenalty;
    box.querySelector('#penGo').onclick=penClick;
    box.addEventListener('click',e=>{if(e.target===box)closePenalty();});
    const cv=box.querySelector('#penCanvas');
    cv.addEventListener('pointerdown',e=>{e.preventDefault();penClick();});
  }
  PEN.on=true;PEN.t=0;PEN.last=0;PEN.phase='aim';PEN.result=null;PEN.ball=null;PEN.shot=null;
  const btn=document.getElementById('penGo');if(btn){btn.disabled=false;btn.textContent='Удар';}
  const text=document.getElementById('penText');if(text)text.textContent=penBlurb();
  box.hidden=false;
  if(typeof player!=='undefined')player.busy=true;
  if(PEN.raf)cancelAnimationFrame(PEN.raf);
  PEN.raf=requestAnimationFrame(penFrame);
}
function closePenalty(){
  PEN.on=false;
  if(PEN.raf)cancelAnimationFrame(PEN.raf);
  const box=document.getElementById('penModal');if(box)box.hidden=true;
  if(typeof player!=='undefined'&&(typeof chatNpc==='undefined'||!chatNpc)){
    const look=document.getElementById('cityLook');
    if(!look||look.hidden)player.busy=false;
  }
}
document.addEventListener('keydown',e=>{
  if(!PEN.on)return;
  if(e.target&&(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'))return;
  if(e.code==='Space'||e.code==='Enter'){e.preventDefault();e.stopPropagation();penClick();}
},true);
function plusGo(place){
  if(!place||(place.x!==0&&!place.x)){setHint('Карта ещё собирается. Секунду.');return;}
  if(typeof scene!=='undefined'&&(scene!=='city'||player.inside||player.vehicle||player.bus)){setHint('Сначала на улицу, пешком.');return;}
  if(typeof startWalkNav==='function')startWalkNav({n:place.n,x:place.x,y:place.y});
  else setHint(place.addr||place.n);
}
function plusFill(box,rows,sub){
  box.innerHTML='';
  for(const row of rows){
    const b=document.createElement('button');b.type='button';b.className='order-item';
    const left=document.createElement('div');
    const title=document.createElement('span');title.textContent=row.n;
    const i=document.createElement('i');i.textContent=sub(row);
    left.append(title,i);
    const go=document.createElement('b');go.textContent='Идти';
    b.append(left,go);
    b.onclick=()=>{const host=box.closest('.modal');if(host)host.hidden=true;if(player)player.busy=false;plusGo(row);};
    box.append(b);
  }
}
function openPlusList(kind){
  const id=kind==='arena'?'arenaModal':'bazaarModal';
  let box=document.getElementById(id);
  if(!box){
    box=document.createElement('div');box.className='modal';box.id=id;
    const title=kind==='arena'?'Арены':'Рынки';
    const lead=kind==='arena'
      ?'Ак Барс Арена — футбол «Рубина», внутри карточка и пенальти. Татнефть Арена — хоккей «Ак Барса», свет и толпа. Это не отдельная игра.'
      :'Прилавки с чак-чаком, эчпочмаком и чаем. Ряды с едой с 8:00 до 22:00. У выхода — фото и гифка, как наливают чай.';
    box.innerHTML=`<div class="box"><div class="ui-sheet-head"><span class="ui-sheet-grip"></span><h2>${title}</h2><button class="btn ui-sheet-close" type="button" aria-label="Закрыть">×</button></div><div class="ui-sheet-body"><p>${lead}</p><div class="order-list"></div></div><div class="ui-sheet-foot"><div class="row"><button class="btn" type="button">Закрыть</button></div></div></div>`;
    document.body.append(box);
    const shut=()=>{box.hidden=true;if(player)player.busy=false;};
    box.querySelector('.ui-sheet-close').onclick=shut;
    box.querySelector('.ui-sheet-foot .btn').onclick=shut;
    box.addEventListener('click',e=>{if(e.target===box)shut();});
  }
  const list=box.querySelector('.order-list');
  if(kind==='arena')plusFill(list,ARENAS,a=>a.addr+' · 10:00–23:00');
  else plusFill(list,BAZAARS,b=>b.addr+' · 8:00–22:00');
  box.hidden=false;if(player)player.busy=true;
}
function openBazaarList(){openPlusList('bazaar');}
function openArenaList(){openPlusList('arena');}
function mountPlusButtons(){
  if(document.getElementById('bazaarBtn')&&document.getElementById('arenaBtn'))return;
  const host=document.getElementById('clubBtn')||document.getElementById('motoBtn')||document.getElementById('routeBtn');
  if(!host||!host.parentElement)return;
  const add=(id,emoji,title,fn)=>{
    if(document.getElementById(id))return;
    const b=document.createElement('button');b.className='btn';b.id=id;b.type='button';b.title=title;b.textContent=emoji;b.style.fontSize='16px';
    b.onclick=fn;host.parentElement.insertBefore(b,host);
  };
  add('arenaBtn','🏟','Арены',openArenaList);
  add('bazaarBtn','🧺','Рынки',openBazaarList);
}
if(!document.getElementById('plusCss')){const s=document.createElement('style');s.id='plusCss';s.textContent='#penCanvas{width:100%;height:auto;border-radius:12px;background:#102018;display:block;touch-action:manipulation}#penGo{min-height:48px}@media (min-width:641px){#bazaarModal .ui-sheet-grip,#bazaarModal .ui-sheet-close,#arenaModal .ui-sheet-grip,#arenaModal .ui-sheet-close,#cityLook .ui-sheet-grip,#cityLook .ui-sheet-close,#penModal .ui-sheet-grip,#penModal .ui-sheet-close{display:none}#bazaarModal .order-list,#arenaModal .order-list{max-height:46vh;overflow:auto}}';document.head.appendChild(s);}
(function plusPics(){const L=document.getElementById('loading');if(L&&!L.hidden){setTimeout(plusPics,800);return;}
  setTimeout(()=>{for(const k in PLUS_STILL){const im=new Image();im.src=PLUS_STILL[k];PLUS_IMG[k]=im;}
    try{if(!localStorage.getItem('zk.plusHint')){localStorage.setItem('zk.plusHint','1');setHint('Рынки — кнопка 🧺, арены — 🏟. На рынке чай и эчпочмак, на Ак Барс Арене можно пробить пенальти.');}}catch(e){}
  },700);})();
mountPlusButtons();
setTimeout(plusMount,2000);
setTimeout(mountPlusButtons,1400);
