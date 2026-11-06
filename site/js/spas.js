// Спа и массаж Казани: настоящие адреса, кушетка, джакузи и чай входят в сеанс.
// Залы пустые. Мастера в закрытой форме, без раздевалки крупным планом.
const SPA_FACE={
  1:{n:'Лейсан',age:27,clothes:'#CDB896'},
  2:{n:'Мия',age:25,clothes:'#F4F1EC'},
  3:{n:'Алина',age:32,clothes:'#8FA387'},
  4:{n:'Гузель',age:24,clothes:'#E7D7C3'},
  5:{n:'Камила',age:29,clothes:'#C98B8B'},
  6:{n:'Диана',age:35,clothes:'#4E4744'},
  7:{n:'Ясмина',age:26,clothes:'#F3E6D4'},
  8:{n:'Наиля',age:30,clothes:'#6E7A4E'}
};
const SPAS=[
  {n:'BotanicaSpa',addr:'Аметьевская магистраль, 16',ll:[55.7680868,49.1724125],price:2800,style:'garden',face:3,master:'Лейсан',note:'Ботанический зал: кушетка среди зелени, джакузи и травяной чай входят.'},
  {n:'Crown Thai',addr:'улица Галиаскара Камала, 4А',ll:[55.7869995,49.1123820],price:2400,style:'thai',face:2,master:'Мия',note:'Тайский зал: дерево, орхидеи, кушетка и джакузи.'},
  {n:'Rawai',addr:'улица Достоевского, 40',ll:[55.7880321,49.1486780],price:2200,style:'thai',face:2,master:'Лина',note:'Спа-деревня: низкий деревянный зал, массаж и тёплая чаша.'},
  {n:'Deva Monoi',addr:'улица Горького, 19',ll:[55.7939754,49.1332469],price:2600,style:'candle',face:5,master:'Камила',note:'Масла и свечи. Кушетка, джакузи и чай входят в сеанс.'},
  {n:'Kailas',addr:'Петербургская улица, 72',ll:[55.7784799,49.1386979],price:3200,style:'jacuzzi',face:7,master:'Ясмина',note:'Большая каменная чаша и две кушетки. Сеанс спокойный.'},
  {n:'Magic SPA',addr:'улица Шаляпина, 12',ll:[55.7746530,49.1461180],price:2500,style:'jacuzzi',face:1,master:'Алсу',note:'На Шаляпина: джакузи, простыни и полотенца уже в цене.'},
  {n:'Вай Тай на Баумана',addr:'улица Баумана, 36',ll:[55.7929491,49.1098916],price:2000,style:'thai',face:2,master:'Зухра',note:'Тайский массаж в деревянном зале. Джакузи и чай входят.'},
  {n:'Вай Тай на Чистопольской',addr:'Чистопольская улица, 66',ll:[55.8166338,49.1345983],price:2000,style:'thai',face:8,master:'Наиля',note:'Тот же спокойный тайский зал, другой адрес.'},
  {n:'Лакшми',addr:'Чистопольская улица, 19А',ll:[55.8202473,49.1139929],price:2100,style:'thai',face:5,master:'Сафия',note:'Тихий восточный зал. Массаж спины, джакузи и чай.'},
  {n:'Spina',addr:'улица Муштари, 12',ll:[55.7901414,49.1364048],price:1800,style:'clinic',face:4,master:'Гузель',note:'Зал для спины: светлая кушетка, простыня, потом джакузи.'},
  {n:'Balmywild',addr:'улица Копылова, 1',ll:[55.8511470,49.0835434],price:2300,style:'garden',face:8,master:'Айгуль',note:'Зелёный зал на Копылова. Кушетка, чаша и чай входят.'},
  {n:'Академия красоты',addr:'Чистопольская улица, 20',ll:[55.8179104,49.1112024],price:1900,style:'clinic',face:6,master:'Диана',note:'Светлый зал. Массаж плеч и шеи, джакузи рядом.'},
  {n:'Миск СПА',addr:'улица Баки Урманче, 6',ll:[55.7328561,49.1753166],price:1700,style:'jacuzzi',face:1,master:'Марьям',note:'На юге города. Каменная чаша и кушетка в одном сеансе.'},
  {n:'Матур',addr:'улица Зайни Султана, 19',ll:[55.7795377,49.1142395],price:1500,style:'candle',face:7,master:'Элина',note:'Небольшой зал со свечами. Массаж, чай и джакузи входят.'},
  {n:'Beutem',addr:'Аметьевская магистраль, 18',ll:[55.7666637,49.1733494],price:2100,style:'garden',face:3,master:'Алина',note:'Свой зелёный зал рядом с Botanica. Кушетка и чаша.'},
  {n:'Capsula',addr:'улица Адоратского, 3',ll:[55.8223077,49.1468044],price:2000,style:'clinic',face:4,master:'Регина',note:'Светлый кабинет. Спина и шея под простынёй, потом вода.'},
  {n:'Alter Ego',addr:'улица Николая Ершова, 16',ll:[55.7918575,49.1567601],price:2200,style:'clinic',face:6,master:'Вероника',note:'Спокойный светлый зал. Сеанс на кушетке и джакузи.'},
  {n:'Ничего лишнего',addr:'улица Декабристов, 85Б',ll:[55.8185487,49.0904202],price:1600,style:'clinic',face:8,master:'Ника',note:'Короткий сеанс: спина, плечи, чай и чаша.'},
  {n:'Квант',addr:'улица Гоголя, 10',ll:[55.7946771,49.1330477],price:2400,style:'candle',face:5,master:'Лилия',note:'Свечи и масло. Кушетка, джакузи и чай уже оплачены.'},
  {n:'СПА-центр',addr:'Чистопольская улица, 85',ll:[55.8238119,49.1541795],price:2300,style:'jacuzzi',face:7,master:'Адель',note:'Чаша и две кушетки. Мастер в форме встречает у стойки.'}
];
const SPA_STILL={jacuzzi:'img/spa/jacuzzi.jpg',table:'img/spa/table.jpg',thai:'img/spa/thai.jpg',garden:'img/spa/garden.jpg',clinic:'img/spa/clinic.jpg',candle:'img/spa/candle.jpg'};
const spaImg={},spaFaceImg={};
if(typeof KIND_RU==='object'&&KIND_RU)KIND_RU.spa='спа';
function spaNorm(s){return String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[«»"'.,!?]/g,'').trim();}
function spaByName(name){const n=spaNorm(name);if(!n)return null;
  return SPAS.find(s=>spaNorm(s.n)===n||n.includes(spaNorm(s.n))||spaNorm(s.n).includes(n))||null;}
function spaPaid(s){return !!(s&&player.spaAt===s.n&&player.spaTill>clock.minutes);}
function spaPay(s){if(!s)return false;if(spaPaid(s))return true;if(player.money<s.price){setHint(`Нужно ${fmtMoney(s.price)}`);return false;}
  player.money-=s.price;player.spaAt=s.n;player.spaTill=clock.minutes+120;player.spaUse={};
  addEvent(`«${s.n}»: −${fmtMoney(s.price)}. Кушетка, джакузи и чай входят.`,'say');
  if(typeof saveState==='function')saveState();return true;}
function spaPaint(it,s){const style=(s&&SPA_STILL[s.style])?s.style:'table';const im=spaImg[style];if(!it||!im)return;
  const draw=()=>{if(!im.width||interior!==it)return;const c=document.createElement('canvas');c.width=1280;c.height=720;const g=c.getContext('2d');
    const k=Math.max(1280/im.width,720/im.height),dw=im.width*k,dh=im.height*k;g.drawImage(im,(1280-dw)/2,(720-dh)/2,dw,dh);
    g.fillStyle='rgba(18,14,10,.22)';g.fillRect(0,0,1280,720);it.photoImg=c;it.spaRef=s||null;if(typeof placeChatLook==='function')placeChatLook();};
  if(im.complete&&im.width)draw();else im.addEventListener('load',draw,{once:true});}
function spaCard(s){const style=(s&&s.style)||'table';
  if(typeof openHallCard!=='function'){setHint(s?s.note:'Спа-зал');return;}
  openHallCard({title:s?s.n:'Спа',photo:SPA_STILL[style]||SPA_STILL.table,clip:'img/spa/jacuzzi.mp4',
    text:(s?s.note+' ':'')+'Кадр пустого зала: кушетки, полотенца и чаша. Это не камера. Мастер в закрытой форме у стойки.'});}
function spaHere(){if(!(interior&&interior.kind==='spa'))return null;return interior.spaRef||spaByName(interior.name);}
function spaUse(){const u=player.spaUse||(player.spaUse={});return u;}
function spaDo(kind,f){const s=spaHere();
  return {label:kind==='massage'?'Массаж спины и шеи':kind==='jacuzzi'?'В джакузи':kind==='tea'?'Травяной чай':'Фото зала',run:()=>{
    if(!s){setHint('Это не спа');return;}
    if(!spaPaid(s)){setHint('Сначала оплатите сеанс');return;}
    const use=spaUse();
    if(kind==='lens'){spaCard(s);return;}
    if(use[kind]){setHint('В этот заход вы это уже брали. Можно просто посидеть.');spaCard(s);return;}
    use[kind]=1;
    const who=(interior.npcs[0]&&interior.npcs[0].p&&interior.npcs[0].p.name)||'Мастер';
    if(kind==='massage'){if(f){player.ix=Math.min(interior.w-1,f.x+f.w/2+0.7);player.iy=f.y;player.ihx=-1;player.ihy=0;player.iwp=null;}
      if(typeof spendTime==='function')spendTime(40);
      player.energy=clamp(player.energy+30,0,100);player.mood=clamp(player.mood+16,0,100);player.cold=false;
      addEvent(`${who}: массаж спины и шеи. Халат надет, простыня сверху. Стало легче.`,'say');
      setHint('Сорок минут. Дальше джакузи или чай — уже входят.');}
    else if(kind==='jacuzzi'){if(f){player.ix=f.x;player.iy=f.y;player.ihy=-1;player.iwp=null;}
      if(typeof spendTime==='function')spendTime(20);
      player.energy=clamp(player.energy+8,0,100);player.mood=clamp(player.mood+14,0,100);
      addEvent('Джакузи. Вода тёплая, полотенце на бортике.','say');
      setHint('Посидели в чаше. Раздевалки крупным планом нет.');}
    else {if(typeof spendTime==='function')spendTime(15);
      player.food=clamp(player.food+14,0,100);player.mood=clamp(player.mood+8,0,100);
      addEvent('Травяной чай. Входит в сеанс.','say');
      setHint('Мята и тепло. Отдельно не платят.');}
    if(typeof saveState==='function')saveState();
  }};}
function makeSpaRoom(name,key){const s=spaByName(name)||SPAS[0];
  const it={kind:'spa',name:s.n,key,w:16,h:11,furn:[],npcs:[],door:{x:8,y:11},floor:s.style==='clinic'?'tiles':'wood',spaStyle:s.style,spawn:{x:8,y:9.35,hx:0,hy:-1}};
  const F=(t,x,y,w,h,extra)=>{const f=Object.assign({t,x,y,w,h},extra||{});it.furn.push(f);return f;};
  F('counter',8,1.15,6.4,1.05,{spot:'spadeck'});
  F('mtable',3.5,4.15,2.7,1.25,{spot:'massage'});
  F('mtable',8.15,4.15,2.7,1.25,{spot:'massage'});
  F('pool',13.15,6.15,4.6,2.9,{spot:'jacuzzi',walkable:true});
  F('table',4.15,7.55,1.15,1.15,{spot:'spatea',round:true});
  F('chair',4.15,6.45,0.5,0.5,{ang:Math.PI/2});
  F('plant',1.05,1.25,0.75,0.75);
  F('plant',15.05,1.35,0.75,0.75);
  F('frame',11.15,9.45,1.2,0.78,{spot:'spalens',walkable:true});
  spaStaff(it,s);
  it.spaRef=s;
  return it;}
function spaStaff(it,s){if(typeof makePersona!=='function')return;
  const face=SPA_FACE[s.face]||SPA_FACE[1];
  const p=makePersona('staff');
  p.job='массажист';p.female=true;p.name=s.master||face.n;p.age=face.age;
  p.clothes=face.clothes;p.pants='#2C2824';p.hairStyle=1;p.bag=null;p.role='staff';
  p.photo='img/spa/f'+s.face+'.jpg';p.lookImg=spaFaceImg[s.face]||null;
  if(!p.memory)p.memory=[];
  it.npcs.push({p,x:8,y:2.2,hx:0,hy:1,seated:false,phase:1.2,role:'staff',isInterior:true,state:'idle',memory:p.memory});}
function spaDrawTable(f){const x=f.x-f.w/2,y=f.y-f.h/2;
  ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(x+0.08,y+0.12,f.w,f.h);
  ctx.fillStyle='#8C6440';ctx.fillRect(x,y+f.h*0.72,f.w,f.h*0.28);
  ctx.fillStyle='#F7F1E8';if(typeof rrect==='function'){rrect(ctx,x,y,f.w,f.h*0.78,0.1);ctx.fill();}else ctx.fillRect(x,y,f.w,f.h*0.78);
  ctx.fillStyle='#E6D3BC';ctx.fillRect(x+0.18,y+0.16,f.w-0.36,0.2);
  ctx.fillStyle='#fff';ctx.fillRect(x+0.22,y-0.08,0.48,0.22);}
function spaDrawFrame(f){ctx.fillStyle='#6B4A32';if(typeof rrect==='function'){rrect(ctx,f.x-f.w/2,f.y-f.h/2,f.w,f.h,0.08);ctx.fill();}else ctx.fillRect(f.x-f.w/2,f.y-f.h/2,f.w,f.h);
  ctx.fillStyle='#F4E7D4';ctx.fillRect(f.x-f.w/2+0.08,f.y-f.h/2+0.08,f.w-0.16,f.h-0.16);
  ctx.fillStyle='#8C5A3C';ctx.font='0.2px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('ЗАЛ',f.x,f.y);}
function spaFaces(){if(scene!=='interior'||!interior||interior.kind!=='spa')return;const it=interior;const d=typeof DPR==='number'?DPR:1;
  ctx.save();ctx.setTransform(d,0,0,d,0,0);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='600 12px "IBM Plex Sans",system-ui';
  for(const n of it.npcs){const im=n.p&&n.p.lookImg;if(!im||!im.width)continue;
    const sx=it.ox+n.x*it.iz,sy=it.oy+(n.y-1.05)*it.iz,r=Math.max(18,Math.min(36,it.iz*0.7));
    ctx.save();ctx.beginPath();ctx.arc(sx,sy,r,0,Math.PI*2);ctx.clip();ctx.drawImage(im,sx-r,sy-r-r*0.08,r*2,r*2);ctx.restore();
    ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(sx,sy,r,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#fff';ctx.fillText(n.p.name,sx,sy+r+12);}
  ctx.restore();}
function spaReply(w){if(!(interior&&interior.kind==='spa')||!w||!w.p||!/массаж/.test(w.p.job||''))return null;
  const line=pick([
    'Ложитесь на кушетку лицом вниз. Простыня сверху, халат можно оставить. Спина и шея, минут сорок.',
    'Джакузи тёплая, полотенце на бортике. Если плечи ещё зажаты — скажите, доработаю.',
    'Чай с мятой уже на столе. Он входит в сеанс, отдельно не считаем.',
    'Я в форме и на смене. Здесь кушетки, чаша и тишина. Без суеты.'
  ]);
  return {reply:line,action:'none',place:''};}
function spaMount(){if(typeof world==='undefined'||!world||!world.pois||typeof llToXY!=='function'||spaMount.done)return;spaMount.done=true;
  for(const s of SPAS){const xy=llToXY(s.ll);let near=null;
    for(const p of world.pois){if(Math.hypot(p.x-xy[0],p.y-xy[1])<70&&spaByName(p.n)===s)near=p;}
    if(near){near.t='spa';near.n=s.n;s.x=near.x;s.y=near.y;}
    else{const o={x:xy[0],y:xy[1],t:'spa',n:s.n,st:'',i:(world.pseq=(world.pseq||0)+1)};world.pois.push(o);s.x=o.x;s.y=o.y;}}}
function openSpaList(){let box=document.getElementById('spaModal');
  if(!box){box=document.createElement('div');box.className='modal';box.id='spaModal';
    box.innerHTML='<div class="box"><div class="ui-sheet-head"><span class="ui-sheet-grip"></span><h2>Спа и массаж</h2><button class="btn ui-sheet-close" type="button" aria-label="Закрыть">×</button></div><div class="ui-sheet-body"><p>Двадцать залов по городу. В сеанс входят кушетка, джакузи и чай. Мастера в закрытой форме. С 10:00 до 22:00. Рамка у выхода — фото и гифка пустого зала.</p><div class="order-list"></div></div><div class="ui-sheet-foot"><div class="row"><button class="btn" type="button">Закрыть</button></div></div></div>';
    document.body.append(box);
    const shut=()=>{box.hidden=true;if(player)player.busy=false;};
    box.querySelector('.ui-sheet-close').onclick=shut;
    box.querySelector('.ui-sheet-foot .btn').onclick=shut;
    box.addEventListener('click',e=>{if(e.target===box)shut();});}
  const list=box.querySelector('.order-list');list.innerHTML='';
  for(const s of SPAS){const b=document.createElement('button');b.type='button';b.className='order-item';
    const left=document.createElement('div');const title=document.createElement('span');title.textContent=s.n;
    const i=document.createElement('i');i.textContent=s.addr+' · '+s.master+' · '+fmtMoney(s.price);
    left.append(title,i);const go=document.createElement('b');go.textContent='Идти';b.append(left,go);
    b.onclick=()=>{box.hidden=true;if(player)player.busy=false;
      if(!isFinite(s.x)){setHint('Карта ещё собирается. Секунду.');return;}
      if(typeof scene!=='undefined'&&(scene!=='city'||player.inside||player.vehicle||player.bus)){setHint('Сначала на улицу, пешком.');return;}
      if(typeof startWalkNav==='function')startWalkNav({n:s.n,x:s.x,y:s.y});
      else setHint(s.addr);};
    list.append(b);}
  box.hidden=false;if(player)player.busy=true;}
function mountSpaButton(){if(document.getElementById('spaBtn'))return;
  const host=document.getElementById('bathBtn')||document.getElementById('homeGoBtn')||document.getElementById('routeBtn');
  if(!host||!host.parentElement)return;
  const b=document.createElement('button');b.className='btn';b.id='spaBtn';b.type='button';b.title='Спа и массаж';b.textContent='💆';b.style.fontSize='16px';
  b.onclick=openSpaList;host.parentElement.insertBefore(b,host);}
if(typeof buildWorld==='function'){const spaWorld0=buildWorld;buildWorld=function(d){const r=spaWorld0(d);spaMount.done=false;spaMount();return r;};}
if(typeof makeInterior==='function'){const spaMake0=makeInterior;makeInterior=function(kind,name,key,room){if(kind==='spa')return makeSpaRoom(name,key);return spaMake0(kind,name,key,room);};}
if(typeof poiAction==='function'){const spaPoi0=poiAction;poiAction=function(poi){
  if(poi&&poi.t==='spa'){const s=spaByName(poi.n)||{n:poi.n||'Спа',price:2000,style:'table',x:poi.x,y:poi.y};
    const ca=typeof closedAction==='function'?closedAction(poi,typeof poiKey==='function'?poiKey(poi):'spa'):null;if(ca)return ca;
    const paid=spaPaid(s);
    return {label:paid?`В «${s.n}» — оплачено`:`Сеанс в «${s.n}» · ${fmtMoney(s.price)}`,run:()=>{if(!spaPay(s))return;enterInterior({kind:'spa',name:s.n,key:typeof poiKey==='function'?poiKey(poi):'spa:'+s.n,x:player.x,y:player.y,venueAt:{x:poi.x,y:poi.y},spa:s});}};}
  return spaPoi0(poi);};}
if(typeof spotAction==='function'){const spaSpot0=spotAction;spotAction=function(f,it){
  if(it&&it.kind==='spa'&&f){
    if(f.spot==='massage')return spaDo('massage',f);
    if(f.spot==='jacuzzi')return spaDo('jacuzzi',f);
    if(f.spot==='spatea')return spaDo('tea',f);
    if(f.spot==='spalens')return {label:'Фото и гифка зала',run:()=>spaCard(spaHere()||{style:it.spaStyle,note:'',n:it.name})};
    if(f.spot==='spadeck')return {label:'Стойка: сеанс уже оплачен',run:()=>setHint('Кушетка, джакузи и чай входят. Подойдите к ним и нажмите E.')};
  }
  return spaSpot0(f,it);};}
if(typeof drawFurniture==='function'){const spaDraw0=drawFurniture;drawFurniture=function(f,it,t){
  if(it&&it.kind==='spa'&&f&&f.spot==='massage'){spaDrawTable(f);return;}
  if(it&&it.kind==='spa'&&f&&f.t==='frame'){spaDrawFrame(f);return;}
  const r=spaDraw0(f,it,t);
  if(it&&it.kind==='spa'&&f&&f.spot==='jacuzzi'&&typeof hallRipple==='function')hallRipple(f,t);
  return r;};}
if(typeof renderInterior==='function'){const spaRender0=renderInterior;renderInterior=function(){spaRender0();spaFaces();};}
if(typeof enterInterior==='function'){const spaIn0=enterInterior;enterInterior=function(src){const r=spaIn0(src);
  if(interior&&src&&src.kind==='spa'){spaPaint(interior,src.spa||spaByName(src.name));setHint('Кушетка, джакузи и чай входят. Рамка у выхода — фото и гифка. Мастер в форме.');}
  return r;};}
if(typeof poiHours==='function'){const spaHours0=poiHours;poiHours=function(p){if(p&&p.t==='spa')return {a:10,b:22};return spaHours0(p);};}
if(typeof scriptedThink==='function'){const spaSay0=scriptedThink;scriptedThink=function(w,text){const own=spaReply(w);if(own)return own;return spaSay0(w,text);};}
if(typeof npcThink==='function'){const spaThink0=npcThink;npcThink=async function(w){const own=spaReply(w);if(own)return own;return spaThink0.apply(this,arguments);};}
if(!document.getElementById('spaCss')){const st=document.createElement('style');st.id='spaCss';st.textContent='@media (min-width:641px){#spaModal .ui-sheet-grip,#spaModal .ui-sheet-close{display:none}#spaModal .order-list{max-height:46vh;overflow:auto}}';document.head.appendChild(st);}
(function spaPics(){const L=document.getElementById('loading');if(L&&!L.hidden){setTimeout(spaPics,800);return;}
  setTimeout(()=>{for(const k in SPA_STILL){const im=new Image();im.src=SPA_STILL[k];spaImg[k]=im;}
    for(let i=1;i<=8;i++){const im=new Image();im.src='img/spa/f'+i+'.jpg';spaFaceImg[i]=im;}},400);
})();
mountSpaButton();
setTimeout(spaMount,1700);
setTimeout(mountSpaButton,1800);
