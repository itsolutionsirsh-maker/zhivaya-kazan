// Бани: пар, бассейн и карточка «фото / гифка». Театры Камала, Качалова и оперы: касса, зал, афиша, занавес.
const HALLS=[
  {id:'kamal',n:'Театр Камала',aka:['театр камала'],ll:[55.77079,49.12935],addr:'Хади Такташа',play:'«Голубая шаль»',look:'kamal',note:'Татарский театр Камала. Касса, зал и занавес.'},
  {id:'kachalov',n:'Театр Качалова',aka:['большой драматический театр имени в. и. качалова'],ll:[55.79107,49.11287],addr:'Баумана',play:'«Ревизор»',look:'kachalov',note:'Драма Качалова. Классический зал и бархатный занавес.'},
  {id:'opera',n:'Театр оперы и балета',aka:['татарский театр оперы и балета им. мусы джалиля'],ll:[55.79537,49.12464],addr:'площадь Свободы',play:'«Жизель»',look:'opera',note:'Опера и балет имени Мусы Джалиля. Золотой зал.'}
];
const HALL_STILL={steam:'img/baths/steam.jpg',pool:'img/baths/pool.jpg',kamal:'img/halls/kamal.jpg',kachalov:'img/halls/kachalov.jpg',opera:'img/halls/opera.jpg'};
const HALL_CLIP={steam:'img/baths/steam.mp4',pool:'img/baths/pool.mp4',kamal:'img/halls/kamal.mp4',kachalov:'img/halls/kachalov.mp4',opera:'img/halls/opera.mp4'};
const HALL_IMG={};
function hallNorm(s){return String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[«»"'’]/g,'').replace(/\s+/g,' ').trim();}
function hallByName(name){const n=hallNorm(name);if(!n)return null;return HALLS.find(h=>hallNorm(h.n)===n||(h.aka||[]).some(a=>hallNorm(a)===n))||null;}
function hallById(id){return HALLS.find(h=>h.id===id)||null;}
function hallShow(mode){
  const img=document.getElementById('hallLookImg');
  const vid=document.getElementById('hallLookVid');
  if(mode==='gif'&&hallShow.clip&&vid){
    if(img)img.style.display='none';
    vid.style.display='block';vid.muted=true;
    if(vid.getAttribute('src')!==hallShow.clip)vid.src=hallShow.clip;
    vid.play().catch(()=>{});
  }else if(img){
    if(vid){vid.pause();vid.style.display='none';}
    img.style.display='block';img.src=hallShow.photo||'';
  }
}
function openHallCard(o){
  hallShow.photo=o.photo;hallShow.clip=o.clip;
  let box=document.getElementById('hallLook');
  if(!box){
    box=document.createElement('div');box.className='modal';box.id='hallLook';
    box.innerHTML='<div class="box" style="max-width:560px"><div class="ui-sheet-head"><span class="ui-sheet-grip"></span><h2 id="hallLookTitle">Карточка</h2><button class="btn ui-sheet-close" id="hallLookX" type="button" aria-label="Закрыть">×</button></div><div class="ui-sheet-body"><div style="border-radius:14px;overflow:hidden;background:#140e0c;aspect-ratio:16/9"><img id="hallLookImg" alt="" style="width:100%;height:100%;object-fit:cover;display:block"><video id="hallLookVid" muted loop playsinline style="width:100%;height:100%;object-fit:cover;display:none"></video></div><p id="hallLookText"></p></div><div class="ui-sheet-foot"><div class="row"><button class="btn" id="hallLookPhoto" type="button">Фото</button><button class="btn primary" id="hallLookGif" type="button">Гифка</button><button class="btn" id="hallLookClose" type="button">Закрыть</button></div></div></div>';
    document.body.append(box);
    const shut=closeHallCard;
    box.querySelector('#hallLookX').onclick=shut;
    box.querySelector('#hallLookClose').onclick=shut;
    box.querySelector('#hallLookPhoto').onclick=()=>hallShow('photo');
    box.querySelector('#hallLookGif').onclick=()=>hallShow('gif');
    box.addEventListener('click',e=>{if(e.target===box)shut();});
  }
  const title=document.getElementById('hallLookTitle');if(title)title.textContent=o.title||'Карточка';
  const text=document.getElementById('hallLookText');if(text)text.textContent=o.text||'';
  box.hidden=false;
  if(typeof player!=='undefined')player.busy=true;
  hallShow('gif');
}
function closeHallCard(){
  const box=document.getElementById('hallLook');
  const vid=document.getElementById('hallLookVid');
  if(vid)vid.pause();
  if(box)box.hidden=true;
  if(typeof player!=='undefined'&&(typeof chatNpc==='undefined'||!chatNpc))player.busy=false;
}
function bathCard(pool){
  openHallCard({
    title:pool?'Бассейн':'Парная',
    photo:pool?HALL_STILL.pool:HALL_STILL.steam,
    clip:pool?HALL_CLIP.pool:HALL_CLIP.steam,
    text:pool
      ?'Тёплая вода, пар над чашей, полотенца на скамье. Раздевалки крупным планом нет.'
      :'Полки, веник и пар. На лавке стопка полотенец. Тепло, без раздевалки.'
  });
}
if(typeof bathLook==='function'){bathLook=function(key){
  if(key==='tea'){
    openHallCard({title:'Чай с мёдом',photo:HALL_STILL.steam,clip:HALL_CLIP.steam,text:'Чай уже налит, мёд в розетке. На лавке полотенца. Это тепло зала, не раздевалка.'});
    return;
  }
  bathCard(key==='pool');
};}
function hallDressBath(it){
  if(!it||it._hallBath)return;
  it._hallBath=1;
  const steam=it.furn.find(f=>f.spot==='steam');
  if(steam)steam.t='bench';
  it.furn.push({t:'frame',x:it.w/2+1.35,y:it.h-1.55,w:1.05,h:0.72,spot:'bathlens',walkable:true});
}
function makeShowRoom(name,key){
  const h=hallByName(name)||HALLS[0];
  const it={kind:'theatre',name:h.n,key,w:20,h:14,furn:[],npcs:[],door:{x:10,y:14},floor:'dark',hallLook:h.look,spawn:{x:10,y:12.55,hx:0,hy:-1}};
  const F=(t,x,y,w,hh,extra)=>{const f=Object.assign({t,x,y,w,h:hh},extra||{});it.furn.push(f);return f;};
  F('apron',10,1.65,17.2,2.15);
  F('curtain',10,3.35,12.2,1.15,{spot:'curtain',walkable:true});
  for(let r=0;r<2;r++){
    for(let i=0;i<8;i++){
      if(i===3||i===4)continue;
      const x=2.15+i*2.2,y=8.15+r*1.6;
      F('seat',x,y,0.78,0.72);
      if(r===1&&i%2===0){
        const n=plusNpcSafe(it,x,y,'зритель',r%2?'#6b2430':'#243028',i%2===0,{seated:true,hx:0,hy:-1,role:'resident'});
        if(n){n.p.role='resident';n.role='resident';n.p.job='в зале';}
      }
    }
  }
  F('counter',3.15,12.25,3.2,0.9,{spot:'boxoffice'});
  plusNpcSafe(it,3.15,10.7,'кассир','#3a2428',true,{hx:0,hy:1,role:'staff'});
  F('poster',16.85,11.85,2.35,1.45,{spot:'poster'});
  F('plant',1.0,12.7,0.7,0.7);
  return it;
}
function plusNpcSafe(it,x,y,job,clothes,female,o){
  if(typeof makePersona!=='function')return null;
  const p=makePersona((o&&o.role)||'staff');
  p.job=job;p.clothes=clothes;p.pants='#1c1816';p.female=!!female;p.bag=null;
  p.name=female?['Зухра','Наиля','Алсу','Гульшат'][it.npcs.length%4]:['Ильдар','Ринат','Булат','Марат'][it.npcs.length%4];
  const n=Object.assign({p,x,y,hx:0,hy:1,seated:false,phase:Math.random()*6,role:p.role,isInterior:true,state:'idle',memory:p.memory},o||{});
  it.npcs.push(n);return n;
}
function hallPaint(it,look){
  const im=HALL_IMG[look]||HALL_IMG.kamal;if(!it||!im)return;
  const draw=()=>{if(!im.width||interior!==it)return;const c=document.createElement('canvas');c.width=1280;c.height=720;const g=c.getContext('2d');
    const s=Math.max(1280/im.width,720/im.height),dw=im.width*s,dh=im.height*s;g.drawImage(im,(1280-dw)/2,(720-dh)/2,dw,dh);
    g.fillStyle='rgba(10,6,8,.42)';g.fillRect(0,0,1280,720);it.photoImg=c;};
  if(im.complete&&im.width)draw();else im.addEventListener('load',draw,{once:true});
}
function hallDraw(f,it,t){
  const opera=!!(hallByName(it&&it.name)&&hallByName(it.name).look==='opera');
  if(f.t==='apron'){
    const x=f.x-f.w/2,y=f.y-f.h/2;
    ctx.fillStyle=opera?'#1c3058':'#6b1e1e';ctx.fillRect(x,y,f.w,0.42);
    ctx.fillStyle=opera?'#c6a15e':'#8e2a2a';
    for(let i=0;i<f.w;i+=0.55)ctx.fillRect(x+i,y,0.28,0.42);
    ctx.fillStyle='#3b2416';ctx.fillRect(x,y+0.42,f.w,f.h-0.42);
    ctx.fillStyle='rgba(255,230,160,.28)';ctx.beginPath();ctx.ellipse(f.x,y+1.35,2.4,0.45,0,0,Math.PI*2);ctx.fill();
    return;
  }
  if(f.t==='curtain'){
    const sway=0.03*Math.sin((t||0)*1.2);
    ctx.fillStyle='rgba(0,0,0,.28)';ctx.fillRect(f.x-f.w/2+0.08,f.y-f.h/2+0.08,f.w,f.h);
    ctx.fillStyle=opera?'#1d3f86':'#7a1d2b';ctx.fillRect(f.x-f.w/2,f.y-f.h/2,f.w/2+0.06,f.h);
    ctx.fillStyle=opera?'#142c62':'#5c1220';ctx.fillRect(f.x-0.06+sway,f.y-f.h/2,f.w/2+0.06,f.h);
    ctx.fillStyle='#e6c56a';ctx.fillRect(f.x-f.w/2,f.y-f.h/2,f.w,0.1);
    ctx.fillStyle='#fff6e8';ctx.font='0.28px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('ЗАНАВЕС',f.x,f.y+0.05);
    return;
  }
  if(f.t==='poster'){
    const h=hallByName(it&&it.name);
    ctx.fillStyle='#1a120c';ctx.fillRect(f.x-f.w/2,f.y-f.h/2,f.w,f.h);
    ctx.fillStyle='#f3e6c4';ctx.fillRect(f.x-f.w/2+0.08,f.y-f.h/2+0.08,f.w-0.16,f.h-0.16);
    ctx.fillStyle='#6b1e2a';ctx.font='0.22px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('АФИША',f.x,f.y-0.18);
    ctx.fillStyle='#2a1c14';ctx.font='0.16px system-ui';
    ctx.fillText(h?h.play:'спектакль',f.x,f.y+0.18);
  }
}
function hallBench(f,t){
  ctx.fillStyle='rgba(0,0,0,.22)';ctx.fillRect(f.x-f.w/2+0.08,f.y-f.h/2+0.1,f.w,f.h);
  ctx.fillStyle='#7a4a28';if(typeof rrect==='function'){rrect(ctx,f.x-f.w/2,f.y-f.h/2,f.w,f.h,0.12);ctx.fill();}else ctx.fillRect(f.x-f.w/2,f.y-f.h/2,f.w,f.h);
  ctx.fillStyle='#c4a574';
  for(let i=0;i<4;i++)ctx.fillRect(f.x-f.w/2+0.12,f.y-f.h/2+0.1+i*(f.h/4.6),f.w-0.24,0.07);
  hallMist(f,t);
}
function hallFrame(f){
  ctx.fillStyle='rgba(0,0,0,.28)';ctx.fillRect(f.x-f.w/2+0.05,f.y-f.h/2+0.06,f.w,f.h);
  ctx.fillStyle='#6b3a22';if(typeof rrect==='function'){rrect(ctx,f.x-f.w/2,f.y-f.h/2,f.w,f.h,0.08);ctx.fill();}else ctx.fillRect(f.x-f.w/2,f.y-f.h/2,f.w,f.h);
  ctx.fillStyle='#f4e7d4';ctx.fillRect(f.x-f.w/2+0.08,f.y-f.h/2+0.08,f.w-0.16,f.h-0.16);
  ctx.fillStyle='rgba(232,168,96,.55)';ctx.fillRect(f.x-f.w/2+0.14,f.y-f.h/2+0.14,f.w-0.28,f.h-0.34);
  ctx.fillStyle='#fff6e8';ctx.font='0.2px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('ЗАЛ',f.x,f.y);
}
function hallMist(f,t){
  const a=0.62+0.2*Math.sin((t||0)*1.5+f.x);
  ctx.fillStyle=`rgba(255,255,255,${a})`;
  ctx.beginPath();ctx.ellipse(f.x-0.35,f.y-1.05,1.2,0.72,0,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(f.x+0.55,f.y-1.35,0.75,0.48,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.fillRect(f.x+1.05,f.y-0.95,1.05,0.78);
  ctx.fillStyle='#e7e0d6';ctx.fillRect(f.x+1.14,f.y-1.28,0.86,0.38);
}
function hallRipple(f,t){
  const s=0.72+0.06*Math.sin((t||0)*2.2);
  ctx.strokeStyle='rgba(230,248,255,.7)';ctx.lineWidth=0.045;
  ctx.beginPath();ctx.ellipse(f.x,f.y,(f.w/2)*s,(f.h/2)*s*0.72,0,0,Math.PI*2);ctx.stroke();
}
function hallTicket(it){
  const h=hallByName(it&&it.name);
  if(it._ticket){setHint('Билет уже есть. Занавес — фото и гифка зала.');return;}
  spend(1200,()=>{
    it._ticket=1;
    player.mood=clamp(player.mood+24,0,100);
    addEvent(`«${it.name}»: билет. На афише дома ${h?h.play:'спектакль'}.`);
    setHint(h?`Место ваше. На афише дома ${h.play}. Это не прямая трансляция.`:'Билет у вас.');
  });
}
function hallCurtain(it){
  const h=hallByName(it&&it.name)||HALLS[0];
  openHallCard({
    title:h.n,
    photo:HALL_STILL[h.look],
    clip:HALL_CLIP[h.look],
    text:h.note+' Кадр и гифка занавеса — как выглядит зал, не прямая трансляция спектакля. На афише дома '+h.play+'.'
  });
}
function hallMount(){
  if(typeof world==='undefined'||!world||!world.pois||typeof llToXY!=='function'||hallMount.done)return;
  hallMount.done=true;
  for(const h of HALLS){
    const xy=llToXY(h.ll);
    let best=null,bd=70;
    for(const p of world.pois){
      if(p._zkHall)continue;
      if(p.t!=='theatre'&&p.t!=='sight')continue;
      const n=hallNorm(p.n);
      if(n!==hallNorm(h.n)&&!(h.aka||[]).some(a=>hallNorm(a)===n))continue;
      const d=Math.hypot(p.x-xy[0],p.y-xy[1]);
      if(d<bd){bd=d;best=p;}
    }
    if(!best){
      best={x:xy[0],y:xy[1],t:'theatre',n:h.n,i:(world.pseq=(world.pseq||0)+1)};
      world.pois.push(best);
    }
    best.t='theatre';best.n=h.n;best._zkHall=h.id;h.x=best.x;h.y=best.y;
  }
}
if(typeof buildWorld==='function'){const hallWorld0=buildWorld;buildWorld=function(d){const r=hallWorld0(d);hallMount.done=false;hallMount();return r;};}
if(typeof makeInterior==='function'){const hallMake0=makeInterior;makeInterior=function(kind,name,key,room){
  if(kind==='theatre'&&hallByName(name))return makeShowRoom(name,key);
  const it=hallMake0(kind,name,key,room);
  if(it&&kind==='bath')hallDressBath(it);
  return it;
};}
if(typeof drawFurniture==='function'){const hallDraw0=drawFurniture;drawFurniture=function(f,it,t){
  if(f&&(f.t==='curtain'||f.t==='poster'||f.t==='apron')){hallDraw(f,it,t);return;}
  if(it&&it.kind==='bath'&&f&&f.t==='frame'){hallFrame(f);return;}
  if(it&&it.kind==='bath'&&f&&f.spot==='steam'){hallBench(f,t);return;}
  const r=hallDraw0(f,it,t);
  if(it&&it.kind==='bath'&&f&&f.t==='pool')hallRipple(f,t);
  return r;
};}
if(typeof spotAction==='function'){const hallSpot0=spotAction;spotAction=function(f,it){
  if(it&&it.kind==='bath'&&f&&f.spot==='bathlens'){
    const b=typeof bathHere==='function'?bathHere():null;
    return {label:'Фото и гифка зала',run:()=>bathCard(!!(b&&b.style==='pool'))};
  }
  if(it&&it.kind==='theatre'&&hallByName(it.name)&&f&&f.spot==='curtain')return {label:'Фото и гифка занавеса',run:()=>hallCurtain(it)};
  if(it&&it.kind==='theatre'&&hallByName(it.name)&&f&&f.spot==='boxoffice')return {label:'Касса · билет 1 200 ₽',run:()=>hallTicket(it)};
  if(it&&it.kind==='theatre'&&hallByName(it.name)&&f&&f.spot==='poster'){const h=hallByName(it.name);return {label:h?'Афиша: '+h.play:'Афиша',run:()=>setHint(h?'На афише дома '+h.play+'. Это репертуар зала, не прямая трансляция.':'Афиша пуста.')};}
  return hallSpot0(f,it);
};}
if(typeof poiHours==='function'){const hallHours0=poiHours;poiHours=function(p){
  if(p&&p.t==='bath')return {a:8,b:26};
  if(p&&p._zkHall)return {a:11,b:24};
  return hallHours0(p);
};}
if(typeof findActionInterior==='function'){const hallFind0=findActionInterior;findActionInterior=function(){
  const it=interior;
  if(it&&typeof player!=='undefined'&&(it.kind==='bath'||(it.kind==='theatre'&&hallByName(it.name)))){
    const px=player.ix,py=player.iy,want=it.kind==='bath'?['bathlens']:['curtain','boxoffice','poster'];
    let best=null,bd=0.95;
    for(const f of it.furn){
      if(!f.spot||want.indexOf(f.spot)<0)continue;
      const d=Math.max(Math.abs(px-f.x)-f.w/2,Math.abs(py-f.y)-f.h/2);
      if(d<bd){const a=spotAction(f,it);if(a){bd=d;best=actTarget(a,f,'spot');}}
    }
    if(best)return best;
  }
  return hallFind0();
};}
if(typeof enterInterior==='function'){const hallIn0=enterInterior;enterInterior=function(src){
  const r=hallIn0(src);
  if(interior&&src&&src.kind==='bath')setHint('Пар на лежаке, бассейн в зале. Рамка у выхода — фото и гифка: тепло и полотенца.');
  if(interior&&src&&src.kind==='theatre'&&hallByName(src.name)){const h=hallByName(src.name);hallPaint(interior,h.look);setHint(h.note+' Занавес — фото и гифка.');}
  return r;
};}
function hallGo(row){
  if(!row||(!row.x&&row.x!==0)){setHint('Карта ещё собирается. Секунду.');return;}
  if(typeof scene!=='undefined'&&(scene!=='city'||player.inside||player.vehicle||player.bus)){setHint('Сначала на улицу, пешком.');return;}
  if(typeof startWalkNav==='function')startWalkNav({n:row.n,x:row.x,y:row.y});
  else setHint(row.addr||row.n);
}
function hallFill(list,rows,sub){
  list.innerHTML='';
  for(const row of rows){
    const b=document.createElement('button');b.type='button';b.className='order-item';
    const left=document.createElement('div');
    const title=document.createElement('span');title.textContent=row.n;
    const i=document.createElement('i');i.textContent=sub(row);
    left.append(title,i);
    const go=document.createElement('b');go.textContent='Идти';
    b.append(left,go);
    b.onclick=()=>{const host=b.closest('.modal');if(host)host.hidden=true;if(player)player.busy=false;hallGo(row);};
    list.append(b);
  }
}
function openHallList(kind){
  const id=kind==='bath'?'bathModal':'showModal';
  let box=document.getElementById(id);
  if(!box){
    box=document.createElement('div');box.className='modal';box.id=id;
    const title=kind==='bath'?'Бани':'Театры';
    const lead=kind==='bath'
      ?'Пар, бассейн и чай входят во вход. У выхода рамка: фото и гифка, тепло и полотенца, без раздевалки. С 8:00 до 2:00.'
      :'Камал, Качалов и опера. Касса, зал, афиша. На занавесе — фото и гифка зала, не прямая трансляция. С 11:00 до полуночи.';
    box.innerHTML=`<div class="box"><div class="ui-sheet-head"><span class="ui-sheet-grip"></span><h2>${title}</h2><button class="btn ui-sheet-close" type="button" aria-label="Закрыть">×</button></div><div class="ui-sheet-body"><p>${lead}</p><div class="order-list"></div></div><div class="ui-sheet-foot"><div class="row"><button class="btn" type="button">Закрыть</button></div></div></div>`;
    document.body.append(box);
    const shut=()=>{box.hidden=true;if(player)player.busy=false;};
    box.querySelector('.ui-sheet-close').onclick=shut;
    box.querySelector('.ui-sheet-foot .btn').onclick=shut;
    box.addEventListener('click',e=>{if(e.target===box)shut();});
  }
  const list=box.querySelector('.order-list');
  if(kind==='bath'&&typeof BATHS!=='undefined')hallFill(list,BATHS,b=>'вход '+fmtMoney(b.price)+' · пар и бассейн');
  else hallFill(list,HALLS,h=>h.addr+' · на афише '+h.play);
  box.hidden=false;if(player)player.busy=true;
}
function mountHallButtons(){
  if(document.getElementById('bathBtn')&&document.getElementById('showBtn'))return;
  const host=document.getElementById('bazaarBtn')||document.getElementById('arenaBtn')||document.getElementById('clubBtn')||document.getElementById('motoBtn')||document.getElementById('routeBtn');
  if(!host||!host.parentElement)return;
  const add=(id,emoji,title,fn)=>{
    if(document.getElementById(id))return;
    const b=document.createElement('button');b.className='btn';b.id=id;b.type='button';b.title=title;b.textContent=emoji;b.style.fontSize='16px';
    b.onclick=fn;host.parentElement.insertBefore(b,host);
  };
  add('bathBtn','♨️','Бани',()=>openHallList('bath'));
  add('showBtn','🎭','Театры',()=>openHallList('show'));
}
if(!document.getElementById('hallCss')){const s=document.createElement('style');s.id='hallCss';s.textContent='@media (min-width:641px){#bathModal .ui-sheet-grip,#bathModal .ui-sheet-close,#showModal .ui-sheet-grip,#showModal .ui-sheet-close,#hallLook .ui-sheet-grip,#hallLook .ui-sheet-close{display:none}#bathModal .order-list,#showModal .order-list{max-height:46vh;overflow:auto}}';document.head.appendChild(s);}
(function hallPics(){const L=document.getElementById('loading');if(L&&!L.hidden){setTimeout(hallPics,800);return;}
  setTimeout(()=>{for(const k in HALL_STILL){const im=new Image();im.src=HALL_STILL[k];HALL_IMG[k]=im;}},600);})();
mountHallButtons();
setTimeout(hallMount,2300);
setTimeout(mountHallButtons,1600);
