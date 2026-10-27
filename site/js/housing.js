// Жильё получше и с видом. Данные — cityFlats (flats.js, второй программист): настоящие дома Казани.
// good — только аренда за игровые деньги; view — аренда или покупка; top — только покупка.
// Покупка за звёзды появится вместе с оплатой: где cityPlatform.canPay ложь, её не показываем вовсе,
// а квартиры только для покупки (top) не выводим. Купленные (PROG.flatsOwned) живут без аренды.
// Сила за деньги не продаётся: вид из окна — только текст и приятная минута, как у дивана.
const HOUSING={open:false,lookDay:-1,t:0};
function flatList(){return Array.isArray(window.cityFlats)?window.cityFlats:[];}
function flatById(id){return id?flatList().find(f=>f.id===id)||null:null;}
function housingFlat(){return flatById(player.flat);}
function housingOwned(id){return Array.isArray(PROG.flatsOwned)&&PROG.flatsOwned.includes(id);}
function housingCanBuy(){return !!(window.cityPlatform&&window.cityPlatform.canPay);}
// аренда текущего жилья в неделю: обычная квартира — RENT, своя (купленная) — 0
function housingRent(){const f=housingFlat();if(!f)return RENT;if(housingOwned(f.id))return 0;return f.rentWeek>0?f.rentWeek:RENT;}
function housingDistrictName(f){const ds=window.cityDistricts||[];const d=ds.find(x=>x.id===f.district);if(!d)return '';const p=d.parent?ds.find(x=>x.id===d.parent):null;return p?`${d.name} · ${p.name}`:d.name;}
const HOUSING_TIER={good:'Получше',view:'С видом',top:'Лучший вид'};

// дом по точке входа из OSM: контур, на котором или рядом с которым стоит вход (до 6 м)
function housingBuilding(f){if(!f||!Array.isArray(f.ll)||!world||!world.meta)return null;const q=llToXY(f.ll);let best=null,bd=6;
  world.bgrid.query(q[0]-8,q[1]-8,q[0]+8,q[1]+8,b=>{if(!b.p||b.pass)return;
    if(q[0]>=b.bb[0]&&q[0]<=b.bb[2]&&q[1]>=b.bb[1]&&q[1]<=b.bb[3]&&pointInPoly(b.p,q[0],q[1])){best=b;bd=0;return false;}
    for(let i=0;i<b.p.length;i+=2){const j=(i+2)%b.p.length,ax=b.p[i],ay=b.p[i+1],dx=b.p[j]-ax,dy=b.p[j+1]-ay,L2=dx*dx+dy*dy||1;
      const u=clamp(((q[0]-ax)*dx+(q[1]-ay)*dy)/L2,0,1),d=Math.hypot(ax+u*dx-q[0],ay+u*dy-q[1]);if(d<bd){bd=d;best=b;}}});
  return best;}
// квартира в районе, который ещё не подгрузился: держим точку входа, дом найдётся, когда придёт кусок карты
function housingResolve(){const f=housingFlat();if(!f||!world||!world.meta)return;
  if(player.home&&player.home._flat===f.id)return;const b=housingBuilding(f);if(!b)return;
  b._flat=f.id;player.home=b;player.homeAt=null;if(typeof folkReanchor==='function')folkReanchor();}
defWatch(dt=>{if(!player.flat||(player.home&&player.home._flat===player.flat))return;HOUSING.t=(HOUSING.t||0)-(dt||0.016);if(HOUSING.t>0)return;HOUSING.t=1;housingResolve();});

function housingMove(f,how){
  if(!f)return false;
  if(player.flat===f.id){setHint('Вы уже живёте здесь');return false;}
  if(player.vehicle||player.bus||scene!=='city'){setHint('Переезд — когда выйдете на улицу');return false;}
  if((player.debt||0)>0){setHint(`Сначала закройте долг за квартиру: ${fmtMoney(player.debt)}`);return false;}
  const owned=housingOwned(f.id);
  if(how!=='own'&&!owned){if(!(f.rentWeek>0)){setHint('Эту квартиру можно только купить');return false;}
    if(player.money<f.rentWeek){setHint(`Нужно ${fmtMoney(f.rentWeek)} за первую неделю`);return false;}
    sitMoney(-f.rentWeek,`🏠 Аренда: ${f.address}, первая неделя`);}
  else if(!owned){setHint('Эта квартира ещё не куплена');return false;}
  player.flat=f.id;player.home=null;const q=llToXY(f.ll);player.homeAt=[q[0],q[1]];
  bills.rent=Math.max(lastDue(0,10),clock.day);player.delayAsked=false;
  for(const k of [...interiorCache.keys()])if(k==='home'||k.startsWith('home:'))interiorCache.delete(k);
  housingResolve();
  mark(null,'home',player.home?player.home.cx:q[0],player.home?player.home.cy:q[1],'🏠',f.title,{arrow:true,color:'#2BB062'});
  addEvent(owned?`🏠 Вы переехали в свою квартиру: ${f.address}`:`🏠 Вы сняли квартиру: ${f.address} · ${fmtMoney(f.rentWeek)} в неделю`,'say');
  if(typeof sitMood==='function')sitMood(f.tier==='good'?4:8);
  if(typeof saveState==='function')saveState();return true;}

// внутри: имя и ключ интерьера, пол по ремонту, окно, если есть вид
function housingHomeName(){const f=housingFlat();return f?f.title:'Ваша квартира';}
function housingHomeKey(){return player.flat?'home:'+player.flat:'home';}
const HOUSING_FLOOR={soviet:'wood',old:'dark',modern:'tiles',loft:'granite'};
{const _mk=makeInterior;makeInterior=function(kind,name,key){const it=_mk(kind,name,key);
  if(kind==='home'&&typeof key==='string'&&key.startsWith('home:')){const f=flatById(key.slice(5));if(f){it.floor=HOUSING_FLOOR[f.style]||it.floor;it.flat=f.id;}}
  return it;};}
// вид из окна: раз в игровой день при входе домой — короткая карточка и приятная минута (+2 настроения)
defEnter(it=>{if(it.kind!=='home'||!it.flat)return;const f=flatById(it.flat);if(!f||!f.view||f.view.kind==='yard'||HOUSING.lookDay===clock.day)return;
  HOUSING.lookDay=clock.day;setTimeout(()=>{if(interior!==it||SIT.card)return;if(typeof sitMood==='function')sitMood(2);
    sitCard({icon:'🪟',title:'Вид из окна',text:`${f.view.text}.${isNight()?' Ночью город светится по-другому.':''}`,ttl:10,choices:[{t:'Красиво',primary:true,run:()=>{}}]});},900);});

// окно «Работа и жильё»: список квартир под карточкой своего жилья
function housingCard(f){const c=document.createElement('div');c.className='rt-card';
  const own=housingOwned(f.id),here=player.flat===f.id;
  const b=document.createElement('b');b.textContent=`${here?'🏠 ':''}${f.title}`;
  const s1=document.createElement('span');s1.textContent=`${HOUSING_TIER[f.tier]||''} · ${f.address} · ${housingDistrictName(f)}`;
  const s2=document.createElement('span');s2.textContent=`${f.floor} этаж из ${f.levels} · ${f.rooms} комн. · ${f.area} м² · ${f.view&&f.view.text||''}`;
  const s3=document.createElement('span');s3.textContent=f.text||'';
  const row=document.createElement('div');row.className='row';
  const show=document.createElement('button');show.className='btn';show.textContent='📍 На карте';
  show.addEventListener('click',()=>{const q=llToXY(f.ll);mark(null,'flat:look',q[0],q[1],'🏙',f.address,{arrow:true,color:'#5E7F9E'});closeJobs();});row.append(show);
  if(here){const t=document.createElement('span');t.textContent=own?'Ваша квартира, аренды нет':`Вы здесь живёте · ${fmtMoney(f.rentWeek)} в неделю`;row.append(t);}
  else{
    if(own){const go=document.createElement('button');go.className='btn primary';go.textContent='Переехать';go.addEventListener('click',()=>{if(housingMove(f,'own'))renderJobs();});row.append(go);}
    else if(f.rentWeek>0){const r=document.createElement('button');r.className='btn primary';r.textContent=`Снять · ${fmtMoney(f.rentWeek)}/нед`;r.disabled=player.money<f.rentWeek;r.title=r.disabled?'Нужна сумма за первую неделю':'';
      r.addEventListener('click',()=>{if(housingMove(f,'rent'))renderJobs();});row.append(r);}
    if(f.buy&&housingCanBuy()&&!own&&typeof housingBuy==='function'){const k=document.createElement('button');k.className='btn';k.textContent=`Купить · ${f.buy.stars} ⭐`;k.addEventListener('click',()=>housingBuy(f));row.append(k);}
  }
  c.append(b,s1,s2,s3,row);return c;}
function housingRenderList(box){
  const list=flatList().filter(f=>f.tier!=='top'||housingCanBuy()||housingOwned(f.id)||player.flat===f.id);if(!list.length)return;
  const head=document.createElement('div');head.className='rt-card';const hb=document.createElement('b');hb.textContent='🏙 Квартиры получше';
  const hs=document.createElement('span');hs.textContent=`Настоящие дома Казани: ${list.length}. Аренда за игровые деньги, вперёд за неделю. Переехать можно в любой момент, если нет долга.`;
  const hr=document.createElement('div');hr.className='row';const tg=document.createElement('button');tg.className='btn';tg.textContent=HOUSING.open?'Свернуть':'Посмотреть варианты';
  tg.addEventListener('click',()=>{HOUSING.open=!HOUSING.open;renderJobs();});hr.append(tg);
  if(player.flat){const back=document.createElement('button');back.className='btn';back.textContent=`Обычная квартира · ${fmtMoney(RENT)}/нед`;
    back.addEventListener('click',()=>{if((player.debt||0)>0){setHint('Сначала закройте долг за квартиру');return;}const was=player.flat;player.flat=null;player.home=null;player.homeAt=null;rentNewHome();if(!player.home){player.flat=was;housingResolve();}else{saveState();}renderJobs();});hr.append(back);}
  head.append(hb,hs,hr);box.append(head);
  if(!HOUSING.open)return;
  const order={good:0,view:1,top:2};const here=(f)=>{const q=llToXY(f.ll);return dist(q[0],q[1],player.x,player.y);};
  const sorted=list.slice().sort((a,b)=>order[a.tier]-order[b.tier]||here(a)-here(b));
  for(const f of sorted)box.append(housingCard(f));}
