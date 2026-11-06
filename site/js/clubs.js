// Десять ночных клубов центра. Вход: каждый раз «есть 18», потом фейс.
// Жребий один на игрока: 0 и 1 из 0–9 — охрана не пускает ни в один клуб.
const CLUBS=[
  {n:'RV Club',ll:[55.78770,49.12070],style:'neon',addr:'Баумана, 82 · Свита Холл',note:'Ретро-зал на Баумана. Стойка, танцпол и свет как в девяностых.'},
  {n:'Extra Lounge',ll:[55.79355,49.14990],style:'velvet',addr:'Ершова, 1А · Корстон',note:'Лаунж в «Корстоне». Бархат, низкий свет, длинная стойка.'},
  {n:'Эндорфин',ll:[55.78855,49.10735],style:'velvet',addr:'Тази Гиззата, 6',note:'Шоу-бар у Тази Гиззата. Сцена, шесты и бар у стены.'},
  {n:'Nebar',ll:[55.79390,49.12515],style:'neon',addr:'Пушкина, 46',note:'Клуб на Пушкина. Неон, танцпол, коктейли до утра.'},
  {n:'Jungle',ll:[55.78020,49.12900],style:'jungle',addr:'Спартаковская, 2',aka:['the jungle','джангл'],note:'Зелёный зал на Спартаковской. Растения, медь и танцпол.'},
  {n:'Ravez',ll:[55.79020,49.12450],style:'neon',addr:'Пушкина, 29А',note:'Диджейский зал на Пушкина. Свет плотный, бар справа от входа.'},
  {n:'Bazzar',ll:[55.78840,49.12220],style:'neon',addr:'Профсоюзная, 26',note:'Центр, у площади Тукая. Длинный бар и танцпол.'},
  {n:'Библиотека',ll:[55.79120,49.12180],style:'velvet',addr:'Кремлёвская, 21',note:'Вечерний зал на Кремлёвской. Тише у диванов, громче у сцены.'},
  {n:'Idol',ll:[55.79415,49.12545],style:'velvet',addr:'Пушкина, 46',note:'Второй вход на Пушкина, 46. Отдельный зал, свой фейс на двери.'},
  {n:'Werk',ll:[55.77200,49.12100],style:'neon',addr:'Тукая, 115',note:'Клуб на Тукая. Стойка, шесты на танцполе, охрана у двери.'}
];
const CLUB_STILL={neon:'img/clubs/neon.jpg',velvet:'img/clubs/velvet.jpg',jungle:'img/clubs/jungle.jpg'};
const CLUB_CLIP={neon:'img/clubs/neon.mp4',velvet:'img/clubs/velvet.mp4',jungle:'img/clubs/jungle.mp4'};
const clubImg={};
const CLUB_W=['Алина','Диляра','Карина','Ляйсан','Регина','Милана','Алсу','Гузель','Лиля','Алия'];
const CLUB_M=['Рамиль','Марат','Ильдар','Тимур','Булат','Артур','Рустем','Камиль'];
if(typeof VENUE_STYLES!=='undefined'){
  VENUE_STYLES.clubneon={wall:'#241c28',trim:'#3a2a22',counter:'#2a242c',top:'#c6a15a',wood:'#3a2a24',seat:'#1a1420',accent:'#d4a24a',floor:['#2a2428','#221c22'],motif:'panels'};
  VENUE_STYLES.clubvelvet={wall:'#3a1820',trim:'#5a3030',counter:'#3a2420',top:'#e0b070',wood:'#4a2820',seat:'#2a1418',accent:'#e8c48a',floor:['#3a2824','#2e201c'],motif:'panels'};
  VENUE_STYLES.clubjungle={wall:'#1c2a22',trim:'#3a4a32',counter:'#3a3020',top:'#c4a060',wood:'#2a3828',seat:'#1a2820',accent:'#7dcea0',floor:['#24302a','#1c2620'],motif:'panels'};
}
if(typeof KIND_RU!=='undefined')KIND_RU.club='ночной клуб';
if(typeof POI_PRIO!=='undefined')POI_PRIO.club=3;
if(typeof POI_GLYPH!=='undefined')POI_GLYPH.club='🎧';
if(typeof MENU!=='undefined')MENU.club=[
  {e:'🍋',n:'Лимонад',p:280,food:4,mood:6,en:3,min:12},
  {e:'🥤',n:'Кола со льдом',p:250,food:2,mood:4,en:4,min:8},
  {e:'🍸',n:'Клубный коктейль',p:650,food:3,mood:14,en:-3,min:20,alc:18},
  {e:'🥃',n:'Виски с колой',p:700,food:2,mood:12,en:-4,min:20,alc:28},
  {e:'🍟',n:'Картошка к бару',p:420,food:28,mood:6,en:2,min:15}
];
function clubNorm(s){return String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[«»"'’.,!?·]/g,'').replace(/\s+/g,' ').trim();}
function clubByName(name){const n=clubNorm(name);if(!n)return null;return CLUBS.find(c=>clubNorm(c.n)===n)||null;}
function clubStyleOf(name){const c=clubByName(name);return c?c.style:'neon';}
function clubFace(){try{let v=localStorage.getItem('zk.clubface');if(v==null||!/^\d$/.test(v)){v=String(Math.floor(Math.random()*10));localStorage.setItem('zk.clubface',v);}return Number(v);}catch(e){return 7;}}
function clubRefused(){return clubFace()<2;}
function clubPersona(it,job,clothes,female){
  const p=makePersona(job==='охранник'?'guard':'staff');
  p.job=job;p.clothes=clothes;p.pants='#141414';p.female=!!female;p.bag=null;
  p.age=female?21+(it.npcs.length%7):26+(it.npcs.length%10);
  p.hairStyle=female?1:0;
  p.name=female?CLUB_W[it.npcs.length%CLUB_W.length]:CLUB_M[it.npcs.length%CLUB_M.length];
  p.role=job==='охранник'?'guard':'staff';
  return p;
}
function clubNpc(it,x,y,job,clothes,female,o){
  const p=clubPersona(it,job,clothes,female);
  const n=Object.assign({p,x,y,hx:0,hy:1,seated:false,phase:Math.random()*6,role:p.role,isInterior:true,state:'idle',memory:p.memory},o||{});
  it.npcs.push(n);return n;
}
function makeClubRoom(name,key){
  const it={kind:'club',name,key,w:18,h:12,furn:[],npcs:[],door:{x:9,y:12},floor:'dark',clubLook:clubStyleOf(name)==='jungle'?'clubjungle':clubStyleOf(name)==='velvet'?'clubvelvet':'clubneon',spawn:{x:9,y:10.5,hx:0,hy:-1}};
  const F=(t,x,y,w,h,extra)=>{const f=Object.assign({t,x,y,w,h},extra||{});it.furn.push(f);return f;};
  F('counter',4.2,1.35,6.4,1.25,{spot:'counter'});
  F('board',4.2,0.38,3.4,0.32);
  F('stage',14.2,2.15,6.2,2.4);
  F('booth',16.2,1.15,1.4,0.85);
  F('pole',11.5,5.15,0.34,0.34);
  F('pole',14.7,5.15,0.34,0.34);
  F('neon',9,0.42,5.4,0.42,{walkable:true});
  F('rug',13,6.35,5.4,2.5,{spot:'dance',walkable:true});
  for(const [x,y] of [[3.1,4.7],[3.2,7.7],[6.5,6.15]]){
    F('table',x,y,1.15,1.15,{spot:'table',round:true});
    F('chair',x,y-1.05,0.5,0.5,{ang:Math.PI/2});
    F('chair',x,y+1.05,0.5,0.5,{ang:-Math.PI/2});
    F('chair',x-1.05,y,0.5,0.5,{ang:0});
    F('chair',x+1.05,y,0.5,0.5,{ang:Math.PI});
  }
  F('sofa',6.8,9.35,3.1,1.05,{spot:'sofa'});
  F('frame',9.4,10.45,1.05,0.72,{spot:'lens',walkable:true});
  F('plant',0.85,1.15,0.8,0.8);
  F('plant',17.15,10.5,0.8,0.8);
  clubNpc(it,4.2,0.55,'бармен','#2c241c',false,{hx:0,hy:1});
  clubNpc(it,2.2,5.6,'официантка','#1a1020',true,{wander:true,hx:1,hy:0});
  clubNpc(it,6.9,8.15,'официантка','#6b1e3a',true,{wander:true,hx:-1,hy:0});
  clubNpc(it,11.3,10.15,'охранник','#14181c',false,{hx:0,hy:1});
  const g1=clubNpc(it,2.05,4.7,'гость','#3e4a62',false,{seated:true,hx:1,hy:0,role:'resident'});g1.p.role='resident';g1.role='resident';
  const g2=clubNpc(it,4.15,4.7,'гость','#7a3048',true,{seated:true,hx:-1,hy:0,role:'resident'});g2.p.role='resident';g2.role='resident';g2.p.job='в зале';
  const g3=clubNpc(it,6.5,5.1,'гость','#243028',false,{seated:true,hx:0,hy:1,role:'resident'});g3.p.role='resident';g3.role='resident';g3.p.job='в зале';
  g1.p.job='в зале';
  return it;
}
function clubPaint(it,style){
  const im=clubImg[style]||clubImg.neon;if(!it||!im)return;
  const draw=()=>{if(!im.width||interior!==it)return;const c=document.createElement('canvas');c.width=1280;c.height=720;const g=c.getContext('2d');
    const s=Math.max(1280/im.width,720/im.height),dw=im.width*s,dh=im.height*s;g.drawImage(im,(1280-dw)/2,(720-dh)/2,dw,dh);
    g.fillStyle='rgba(8,6,14,.48)';g.fillRect(0,0,1280,720);it.photoImg=c;if(typeof placeChatLook==='function')placeChatLook();};
  if(im.complete&&im.width)draw();else im.addEventListener('load',draw,{once:true});
}
function clubEnter(src){
  clubIn0(src);
  if(!(interior&&src&&src.kind==='club'))return;
  clubPaint(interior,clubStyleOf(src.name));
  const c=clubByName(src.name);
  if(c&&c.note)setHint(c.note+' Рамка у выхода — фото и гифка зала.');
}
function clubGate(src){
  const name=src&&src.name?src.name:'Клуб';
  sitCard({icon:'🚪',title:'На входе',text:`«${name}». Охрана смотрит паспорт: «Есть 18?» Без этого внутрь не пускают.`,ttl:0,choices:[
    {t:'Да, есть 18',primary:true,run:()=>{
      if(clubRefused()){
        addEvent(`«${name}»: фейс-контроль не пропустил.`,'say');
        sitCard({icon:'🕶️',title:'Охрана не пускает',text:`У двери «${name}» качают головой: «Сегодня не ваш вечер». Это не одна дверь — в остальные клубы тоже не пройдёте.`,ttl:0,choices:[{t:'Понятно',primary:true,run:()=>setHint('Фейс не прошёл. Клубы сегодня закрыты для вас.')}]});
        return;
      }
      clubEnter(src);
    }},
    {t:'Нет, нет 18',run:()=>{setHint('Без 18 лет в клуб не пускают.');addEvent(`«${name}»: охрана не пустила — нет 18.`,'say');}}
  ]});
}
function clubDrawProp(f,it,t){
  if(f.t==='pole'){
    ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(f.x+0.06,f.y+0.16,0.28,0.12,0,0,Math.PI*2);ctx.fill();
    const glow=0.35+0.25*Math.sin((t||0)*2+f.x);
    ctx.fillStyle=`rgba(210,140,255,${0.16+glow*0.2})`;ctx.beginPath();ctx.arc(f.x,f.y-0.35,0.42,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#e6ebf2';ctx.lineWidth=0.09;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(f.x,f.y-1.25);ctx.lineTo(f.x,f.y+0.12);ctx.stroke();
    ctx.strokeStyle='rgba(255,210,120,.85)';ctx.lineWidth=0.035;ctx.beginPath();ctx.moveTo(f.x,f.y-1.25);ctx.lineTo(f.x,f.y+0.12);ctx.stroke();
    ctx.fillStyle='#d5dbe4';ctx.beginPath();ctx.ellipse(f.x,f.y+0.12,0.2,0.08,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(f.x,f.y-1.25,0.09,0,Math.PI*2);ctx.fill();
    return;
  }
  if(f.t==='neon'){
    ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(f.x-f.w/2,f.y-f.h/2,f.w,f.h);
    ctx.strokeStyle=`hsl(${(t*30)%360},80%,62%)`;ctx.lineWidth=0.06;ctx.strokeRect(f.x-f.w/2,f.y-f.h/2,f.w,f.h);
    ctx.fillStyle='#f4e8ff';ctx.font='0.28px "Unbounded",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(String(it&&it.name||'КЛУБ').slice(0,16),f.x,f.y);
    return;
  }
  if(f.t==='booth'){
    ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(f.x-f.w/2+0.06,f.y-f.h/2+0.08,f.w,f.h);
    ctx.fillStyle='#1a1420';if(typeof rrect==='function'){rrect(ctx,f.x-f.w/2,f.y-f.h/2,f.w,f.h,0.08);ctx.fill();}else ctx.fillRect(f.x-f.w/2,f.y-f.h/2,f.w,f.h);
    ctx.fillStyle=`hsl(${200+(Math.sin(t*3)*40)},70%,55%)`;ctx.fillRect(f.x-0.28,f.y-0.12,0.55,0.22);
    ctx.fillStyle='#c9a36a';ctx.font='0.16px system-ui';ctx.textAlign='center';ctx.fillText('DJ',f.x,f.y+0.22);
    return;
  }
  if(f.t==='frame'){
    ctx.fillStyle='rgba(0,0,0,.3)';ctx.fillRect(f.x-f.w/2+0.05,f.y-f.h/2+0.06,f.w,f.h);
    ctx.fillStyle='#1a120c';if(typeof rrect==='function'){rrect(ctx,f.x-f.w/2,f.y-f.h/2,f.w,f.h,0.08);ctx.fill();}else ctx.fillRect(f.x-f.w/2,f.y-f.h/2,f.w,f.h);
    ctx.fillStyle='#c6a15a';ctx.fillRect(f.x-f.w/2+0.08,f.y-f.h/2+0.08,f.w-0.16,f.h-0.16);
    const pulse=0.45+0.35*Math.sin((t||0)*2);
    ctx.fillStyle=`rgba(120,40,180,${0.25+pulse*0.35})`;ctx.fillRect(f.x-f.w/2+0.14,f.y-f.h/2+0.14,f.w-0.28,f.h-0.36);
    ctx.fillStyle='#fff6e8';ctx.font='0.2px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('ФОТО',f.x,f.y-0.02);
  }
}
function clubSame(p,c){const n=clubNorm(p&&p.n);if(!n)return false;if(n===clubNorm(c.n))return true;return (c.aka||[]).some(a=>clubNorm(a)===n);}
function clubMount(){
  if(typeof world==='undefined'||!world||!world.meta||!world.pois||typeof llToXY!=='function'||clubMount.done)return;
  clubMount.done=true;
  for(const c of CLUBS){
    const xy=llToXY(c.ll);
    let adopt=null,ad=1e9;
    for(const p of world.pois){
      if(p._zkClub||!clubSame(p,c))continue;
      if(p.t!=='bar'&&p.t!=='cafe'&&p.t!=='pub')continue;
      const d=Math.hypot(p.x-xy[0],p.y-xy[1]);
      if(d<ad){adopt=p;ad=d;}
    }
    if(adopt){adopt.t='club';adopt.n=c.n;adopt._zkClub=1;c.x=adopt.x;c.y=adopt.y;}
    else{const o={x:xy[0],y:xy[1],t:'club',n:c.n,st:c.addr,_zkClub:1,i:(world.pseq=(world.pseq||0)+1)};world.pois.push(o);c.x=o.x;c.y=o.y;}
  }
  for(let i=world.pois.length-1;i>=0;i--){const p=world.pois[i];if(p.t!=='club')continue;const c=CLUBS.find(x=>clubNorm(x.n)===clubNorm(p.n));if(!c||Math.hypot(p.x-c.x,p.y-c.y)<=3)continue;world.pois.splice(i,1);}
}
if(typeof buildWorld==='function'){const clubWorld0=buildWorld;buildWorld=function(d){const r=clubWorld0(d);clubMount.done=false;clubMount();return r;};}
if(typeof makeInterior==='function'){const clubMake0=makeInterior;makeInterior=function(kind,name,key,room){if(kind==='club')return makeClubRoom(name,key);return clubMake0(kind,name,key,room);};}
if(typeof venueStyleId==='function'){const clubStyleId0=venueStyleId;venueStyleId=function(it){if(it&&it.kind==='club')return it.clubLook||'clubneon';return clubStyleId0(it);};}
if(typeof drawFurniture==='function'){const clubDraw0=drawFurniture;drawFurniture=function(f,it,t){if(f&&(f.t==='pole'||f.t==='neon'||f.t==='booth'||f.t==='frame')){clubDrawProp(f,it,t);return;}return clubDraw0(f,it,t);};}
if(typeof spotAction==='function'){const clubSpot0=spotAction;spotAction=function(f,it){
  if(it&&it.kind==='club'&&f&&f.spot==='counter')return {label:'Бар: коктейли и закуски',run:()=>openOrder(f,it)};
  if(it&&it.kind==='club'&&f&&f.spot==='dance')return {label:'Потанцевать',run:()=>{player.mood=clamp(player.mood+12,0,100);player.energy=clamp(player.energy-8,0,100);spendTime(25);setHint('Танцпол. Настроение +12');addEvent(`Потанцевали в «${it.name}». Настроение +12`);}};
  if(it&&it.kind==='club'&&f&&f.spot==='lens')return {label:'Фото и гифка зала',run:()=>openClubLook(it)};
  return clubSpot0(f,it);};}
if(typeof placeOrder==='function'){const clubOrder0=placeOrder;placeOrder=function(m,treat){const f=orderCtx&&orderCtx.f;const before=player.money;clubOrder0(m,treat);
  if(f&&f.spot==='counter'&&interior&&interior.kind==='club'&&player.money!==before){player.ix=f.x;player.iy=f.y+f.h/2+0.75;player.ihx=0;player.ihy=-1;}};}
if(typeof poiHours==='function'){const clubHours0=poiHours;poiHours=function(p){if(p&&p.t==='club')return {a:17,b:30};return clubHours0(p);};}
if(typeof venueBusy==='function'){const clubBusy0=venueBusy;venueBusy=function(kind,h){if(kind==='club'){h=h==null?cityHour():h;if(h>=22||h<2)return 1;if(h>=17||h<6)return 0.75;return 0.15;}return clubBusy0(kind,h);};}
let clubIn0=function(){};
if(typeof enterInterior==='function'){clubIn0=enterInterior;enterInterior=function(src){if(src&&src.kind==='club'){clubGate(src);return;}return clubIn0(src);};}
if(typeof poiAction==='function'){const clubPoi0=poiAction;poiAction=function(poi){
  if(poi&&poi.t==='club'){const closed=typeof closedAction==='function'?closedAction(poi,poiKey(poi)):null;if(closed)return closed;
    const nm=poi.n||'Ночной клуб';const src={kind:'club',name:nm,key:poiKey(poi),x:player.x,y:player.y,venueAt:{x:poi.x,y:poi.y}};
    return {label:`Зайти в «${nm}» · 18+ и фейс`,run:()=>enterInterior(src)};}
  return clubPoi0(poi);};}
function clubShow(mode){
  const img=document.getElementById('clubLookImg');
  const vid=document.getElementById('clubLookVid');
  const photo=clubShow.photo,clip=clubShow.clip;
  if(mode==='gif'&&clip&&vid){
    if(img)img.style.display='none';
    vid.style.display='block';
    if(vid.getAttribute('src')!==clip)vid.src=clip;
    vid.play().catch(()=>{});
  }else if(img){
    if(vid){vid.pause();vid.style.display='none';}
    img.style.display='block';
    img.src=photo||'';
  }
}
function openClubLook(it){
  const style=clubStyleOf(it&&it.name);
  const c=clubByName(it&&it.name);
  clubShow.photo=CLUB_STILL[style]||CLUB_STILL.neon;
  clubShow.clip=CLUB_CLIP[style]||CLUB_CLIP.neon;
  let box=document.getElementById('clubLook');
  if(!box){
    box=document.createElement('div');box.className='modal';box.id='clubLook';
    box.innerHTML='<div class="box" style="max-width:560px"><div class="ui-sheet-head"><span class="ui-sheet-grip"></span><h2 id="clubLookTitle">Зал</h2><button class="btn ui-sheet-close" id="clubLookX" type="button" aria-label="Закрыть">×</button></div><div class="ui-sheet-body"><div style="border-radius:14px;overflow:hidden;background:#120c16;aspect-ratio:16/9"><img id="clubLookImg" alt="" style="width:100%;height:100%;object-fit:cover;display:block"><video id="clubLookVid" muted loop playsinline style="width:100%;height:100%;object-fit:cover;display:none"></video></div><p id="clubLookText"></p></div><div class="ui-sheet-foot"><div class="row"><button class="btn" id="clubLookPhoto" type="button">Фото</button><button class="btn primary" id="clubLookGif" type="button">Гифка</button><button class="btn" id="clubLookClose" type="button">Закрыть</button></div></div></div>';
    document.body.append(box);
    const shut=closeClubLook;
    box.querySelector('#clubLookX').onclick=shut;
    box.querySelector('#clubLookClose').onclick=shut;
    box.querySelector('#clubLookPhoto').onclick=()=>clubShow('photo');
    box.querySelector('#clubLookGif').onclick=()=>clubShow('gif');
    box.addEventListener('click',e=>{if(e.target===box)shut();});
  }
  const title=document.getElementById('clubLookTitle');
  if(title)title.textContent=it&&it.name?it.name:'Зал';
  const text=document.getElementById('clubLookText');
  if(text)text.textContent=(c&&c.note?c.note+' ':'')+'Свет и стойка. Гифка крутится по кругу.';
  box.hidden=false;
  if(typeof player!=='undefined')player.busy=true;
  clubShow('gif');
}
function closeClubLook(){
  const box=document.getElementById('clubLook');
  const vid=document.getElementById('clubLookVid');
  if(vid)vid.pause();
  if(box)box.hidden=true;
  if(typeof player!=='undefined'&&(typeof chatNpc==='undefined'||!chatNpc))player.busy=false;
}
function clubListHtml(){
  const box=document.getElementById('clubList');if(!box)return;box.innerHTML='';
  for(const c of CLUBS){
    const b=document.createElement('button');b.type='button';b.className='order-item';
    const left=document.createElement('div');
    const title=document.createElement('span');title.textContent=c.n;
    const sub=document.createElement('i');sub.textContent=c.addr+' · 17:00–06:00';
    left.append(title,sub);
    const go=document.createElement('b');go.textContent='Идти';
    b.append(left,go);
    b.onclick=()=>{
      document.getElementById('clubModal').hidden=true;if(player)player.busy=false;
      if(!c.x&&c.x!==0){setHint('Карта ещё собирается. Секунду.');return;}
      if(typeof scene!=='undefined'&&(scene!=='city'||player.inside||player.vehicle||player.bus)){setHint('Сначала на улицу, пешком.');return;}
      if(typeof startWalkNav==='function')startWalkNav({n:c.n,x:c.x,y:c.y});
      else setHint(c.addr);
    };
    box.append(b);
  }
}
function openClubList(){
  let box=document.getElementById('clubModal');
  if(!box){
    if(!document.getElementById('clubCss')){const s=document.createElement('style');s.id='clubCss';s.textContent='@media (min-width:641px){#clubModal .ui-sheet-grip,#clubModal .ui-sheet-close{display:none}#clubList{max-height:46vh;overflow:auto}}';document.head.appendChild(s);}
    box=document.createElement('div');box.className='modal';box.id='clubModal';
    box.innerHTML='<div class="box"><div class="ui-sheet-head"><span class="ui-sheet-grip"></span><h2>Ночные клубы</h2><button class="btn ui-sheet-close" id="clubClose" type="button" aria-label="Закрыть">×</button></div><div class="ui-sheet-body"><p>Десять залов в центре. На двери каждый раз жмут «есть 18». Фейс один на игрока: двоих из десяти охрана не пускает ни в один клуб. Двери с 17:00 до 6:00.</p><div id="clubList" class="order-list"></div></div><div class="ui-sheet-foot"><div class="row"><button class="btn" id="clubClose2" type="button">Закрыть</button></div></div></div>';
    document.body.append(box);
    const shut=()=>{box.hidden=true;if(player)player.busy=false;};
    box.querySelector('#clubClose').onclick=shut;
    box.querySelector('#clubClose2').onclick=shut;
    box.addEventListener('click',e=>{if(e.target===box)shut();});
  }
  clubListHtml();box.hidden=false;if(player)player.busy=true;
}
function mountClubButton(){
  if(document.getElementById('clubBtn'))return;
  const host=document.getElementById('motoBtn')||document.getElementById('routeBtn');
  if(!host||!host.parentElement)return;
  const b=document.createElement('button');b.className='btn';b.id='clubBtn';b.type='button';b.title='Ночные клубы';b.textContent='🎧';b.style.fontSize='16px';
  b.onclick=openClubList;host.parentElement.insertBefore(b,host);
}
(function clubPics(){const L=document.getElementById('loading');if(L&&!L.hidden){setTimeout(clubPics,800);return;}
  setTimeout(()=>{for(const k in CLUB_STILL){const im=new Image();im.src=CLUB_STILL[k];clubImg[k]=im;}
    try{if(!localStorage.getItem('zk.clubhint')){localStorage.setItem('zk.clubhint','1');setHint('Ночные клубы на карте. Кнопка 🎧 — список. С 17:00, на входе 18 и фейс.');}}catch(e){}
  },700);})();
mountClubButton();
setTimeout(clubMount,1800);
setTimeout(mountClubButton,1200);
