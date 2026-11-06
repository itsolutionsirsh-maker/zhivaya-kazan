// Торговые центры Казани. Адреса с OSM. Внутри галерея, витрины и второй этаж с кино.
const MALL_GOODS={
  clothes:{name:'Одежда',price:2900,kind:'clothes',mood:10,line:'Свитер и куртка на вешалке. Примерочная за шторой, касса сразу.'},
  beauty:{name:'Косметика',price:1400,kind:'beauty',mood:6,line:'Крем и помада в закрытых коробках.'},
  tech:{name:'Техника',price:4200,kind:'tech',mood:4,line:'Наушники и зарядка. Телефон остаётся в коробке.'},
  kids:{name:'Детское',price:1600,kind:'kids',mood:5,line:'Игрушки и куртки. Касса у выхода из отдела.'},
  sport:{name:'Спорт',price:2400,kind:'sport',mood:4,energy:6,line:'Кроссовки и мяч. Можно уйти в них по городу — в игре это пакет.'},
  grocery:{name:'Гипермаркет',price:650,kind:'grocery',food:18,pantry:2,line:'Пакет продуктов домой: хлеб, чай и фрукты.'},
  home:{name:'Для дома',price:1800,kind:'home',mood:5,line:'Плед и две чашки. В пакет, не в квартиру само.'},
  books:{name:'Книги',price:700,kind:'books',mood:6,line:'Романы и открытки с Казанью.'},
  jewel:{name:'Украшения',price:3200,kind:'jewel',mood:8,line:'Серьги под стеклом. Коробка маленькая.'}
};
const MALL_AISLE={
  family:['clothes','beauty','tech','kids','sport','grocery'],
  fashion:['clothes','beauty','jewel','tech','sport','home'],
  classic:['clothes','books','tech','kids','home','beauty'],
  quiet:['clothes','beauty','home','books','jewel','tech']
};
const MALLS=[
  {id:'mega',n:'Мега',aka:['мега','мега казань'],addr:'проспект Победы, 141',ll:[55.7807875,49.2130164],aisle:'family',k:1,note:'Самый большой. Галерея, гипермаркет и фуд-корт. На втором этаже кино.'},
  {id:'kazanmall',n:'KazanMall',aka:['казань молл','kazanmall','казанмолл'],addr:'улица Павлюхина, 91',ll:[55.768875,49.1485024],aisle:'fashion',k:1.2,note:'Новый центр у Павлюхина. Светлая галерея и кино наверху.'},
  {id:'tandem',n:'Тандем',aka:['тандем','трц тандем'],addr:'проспект Ибрагимова, 56',ll:[55.8212386,49.0935162],aisle:'family',k:1,note:'Большой Тандем: магазины внизу, кино на втором.'},
  {id:'yuzhny',n:'Южный',aka:['южный','трц южный'],addr:'проспект Победы, 91',ll:[55.769314,49.2166868],aisle:'family',k:0.95,note:'Стеклянный Южный. Семьям удобно: еда, детское и кино.'},
  {id:'koltso',n:'ТРК «Кольцо»',aka:['кольцо','трц кольцо','трк кольцо'],addr:'у метро «Площадь Тукая»',ll:[55.78654,49.12415],aisle:'fashion',k:1.25,note:'Центр города. Одежда и витрины, наверху тихий зал кино.'},
  {id:'park',n:'Парк Хаус',aka:['парк хаус','парк-хаус'],addr:'проспект Ямашева, 46',ll:[55.8296018,49.118511],aisle:'family',k:1,note:'На Ямашева. Галерея, фуд-корт и кино.'},
  {id:'korston',n:'Корстон',aka:['корстон'],addr:'улица Николая Ершова, 1А',ll:[55.7933482,49.1505864],aisle:'quiet',k:1.15,note:'Галерея при гостинице. Тише, чем в больших центрах.'},
  {id:'piramida',n:'Пирамида',aka:['пирамида'],addr:'Московская улица, 3',ll:[55.7948,49.1030731],aisle:'classic',k:0.8,note:'Старый центр у вокзала. Цены спокойнее, кино всё равно наверху.'},
  {id:'tsum',n:'ЦУМ',aka:['цум','центральный универмаг'],addr:'Московская улица',ll:[55.7931289,49.1026961],aisle:'classic',k:0.9,note:'Универмаг: отделы по кругу, а не одна полка. Второй этаж — кино и книги.'},
  {id:'gorki',n:'ГоркиПарк',aka:['горкипарк','горки парк'],addr:'улица Рихарда Зорге, 11Б',ll:[55.7648676,49.1850172],aisle:'family',k:0.95,note:'Горки. Магазины, продукты и кино на втором этаже.'},
  {id:'suvar',n:'Сувар Плаза',aka:['сувар','сувар плаза'],addr:'Спартаковская улица, 6',ll:[55.7784697,49.1294858],aisle:'quiet',k:1.1,note:'Деловая галерея. Меньше суеты, те же витрины и фуд-корт.'}
];
const MALL_INK={clothes:'#C4554A',beauty:'#C48BB0',tech:'#3E6EA5',kids:'#E0A23A',sport:'#3E8C62',grocery:'#D07A32',home:'#8C6A4A',books:'#6A5344',jewel:'#C6A15A',cinema:'#2C2438',snack:'#C46A3A'};
if(typeof KIND_RU==='object'&&KIND_RU)KIND_RU.mall='торговый центр';
function mallNorm(s){return String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[«»"'.,!?]/g,'').replace(/\s+/g,' ').trim();}
function mallByName(name){const n=mallNorm(name).replace(/ · [12] этаж/,'');if(!n)return null;
  return MALLS.find(m=>mallNorm(m.n)===n||(m.aka||[]).some(a=>a===n)||n.includes(mallNorm(m.n)))||null;}
function mallDoorName(p,m){const n=mallNorm(p&&p.n);if(!n)return false;
  const names=[mallNorm(m.n)].concat((m.aka||[]).map(mallNorm)).filter(a=>a.length>=4);
  return names.some(a=>n===a||n.startsWith(a+' ')||n.endsWith(' '+a)||n.includes(' '+a+' '));}
function mallGood(m,key){const g=MALL_GOODS[key];if(!g)return null;const k=m&&m.k||1;return Object.assign({},g,{price:Math.round(g.price*k/10)*10,mall:m});}
function mallFloorGoods(m,floor){if(floor)return [mallGood(m,'books'),mallGood(m,'jewel'),mallGood(m,'sport')];
  return (MALL_AISLE[m.aisle]||MALL_AISLE.family).map(k=>mallGood(m,k));}
function mallHere(){return interior&&interior.kind==='mall'?(interior.mallRef||mallByName(interior.name)):null;}
function mallBag(){return interior&&(interior.mallBag||(interior.mallBag={}));}
function mallNpc(it,x,y,job,female){if(typeof makePersona!=='function')return null;
  const p=makePersona('staff');p.job=job;p.female=!!female;p.bag=null;p.role='staff';
  p.name=female?['Алсу','Гузель','Лейсан','Наиля','Диана'][it.npcs.length%5]:['Ильдар','Ринат','Булат','Марат','Айрат'][it.npcs.length%5];
  p.clothes=female?'#E7D7C3':'#3E4A44';p.pants='#2C2824';
  const n={p,x,y,hx:0,hy:1,seated:false,phase:it.npcs.length,role:'staff',isInterior:true,state:'idle',memory:p.memory,wander:job==='покупатель'};
  it.npcs.push(n);return n;}
function makeMallRoom(name,key){
  const parsed=mallByName(name)||MALLS[0];
  const floor=/2 этаж/.test(String(name||''))?1:0;
  const it={kind:'mall',name:parsed.n+' · '+(floor?'2 этаж':'1 этаж'),key,w:22,h:15,furn:[],npcs:[],door:{x:11,y:15},floor:'tiles',mallRef:parsed,mallFloor:floor,spawn:{x:11,y:14.15,hx:0,hy:-1}};
  const F=(t,x,y,w,h,extra)=>{const f=Object.assign({t,x,y,w,h},extra||{});it.furn.push(f);return f;};
  F('window',4,0.2,2.4,0.28);F('window',11,0.2,3.2,0.28);F('window',18,0.2,2.4,0.28);
  if(!floor){
    F('counter',11,1.55,5.2,1,{spot:'info'});
    const goods=mallFloorGoods(parsed,0);
    const slots=[{x:3.3,y:3.6},{x:3.3,y:6.8},{x:3.3,y:10},{x:18.7,y:3.6},{x:18.7,y:6.8},{x:18.7,y:10}];
    goods.forEach((g,i)=>{const s=slots[i];if(g&&s)F('front',s.x,s.y,4.6,1.45,{spot:'shop',shop:g,ink:MALL_INK[g.kind]});});
    F('fountain',11,7.15,2.3,2.3);
    F('table',8.2,12.15,1.25,1.25,{spot:'food',round:true});
    F('table',13.8,12.15,1.25,1.25,{spot:'food',round:true});
    F('chair',8.2,11.15,0.5,0.5,{ang:Math.PI/2});
    F('chair',13.8,11.15,0.5,0.5,{ang:Math.PI/2});
    F('escalator',11,13.15,2.6,1.15,{spot:'up',walkable:true});
    mallNpc(it,11,2.45,'консультант',true);
    mallNpc(it,15.6,13.7,'охранник торгового центра',false);
    mallNpc(it,8.4,5.2,'покупатель',true);
    mallNpc(it,14.2,9.2,'покупатель',false);
  }else{
    F('screen',11,1.45,12,0.7,{});
    for(let r=0;r<2;r++)for(let i=0;i<6;i++){if(i===2||i===3)continue;F('seat',7.2+i*1.45,4.2+r*1.5,0.85,0.7);}
    const goods=mallFloorGoods(parsed,1);
    [{x:3.3,y:4.3},{x:3.3,y:8.4},{x:18.7,y:8.6}].forEach((s,i)=>{const g=goods[i];if(g)F('front',s.x,s.y,4.6,1.45,{spot:'shop',shop:g,ink:MALL_INK[g.kind]});});
    F('front',18.7,4.3,4.6,1.45,{spot:'cinema',ink:MALL_INK.cinema,shop:{name:'Касса кино',kind:'cinema',price:500,line:'Билет на сеанс. Зал рядом, это не прямая трансляция.'}});
    F('front',18.7,12.05,4.6,1.35,{spot:'snack',ink:MALL_INK.snack,shop:{name:'Попкорн',kind:'snack',price:280,food:12,mood:4,line:'Попкорн и лимонад.'}});
    F('escalator',11,13.2,2.6,1.15,{spot:'down',walkable:true});
    mallNpc(it,16.2,4.3,'кассир кино',true);
    mallNpc(it,8,10.5,'покупатель',false);
  }
  F('plant',1.1,14.2,0.7,0.7);F('plant',20.9,14.2,0.7,0.7);
  return it;
}
function mallSpend(price,fn){if(typeof spend==='function')return spend(price,fn);if(player.money<price){setHint('Нужно '+price+' ₽');return;}player.money-=price;fn();}
function mallTake(shop){if(!shop)return;
  const bag=mallBag();if(!bag)return;
  if(bag[shop.kind]){setHint('В этот заход вы это уже брали. Можно пройтись дальше.');return;}
  mallSpend(shop.price,()=>{
    bag[shop.kind]=1;
    if(shop.food)player.food=clamp(player.food+shop.food,0,100);
    if(shop.mood)player.mood=clamp(player.mood+shop.mood,0,100);
    if(shop.energy)player.energy=clamp(player.energy+shop.energy,0,100);
    if(shop.pantry)player.pantry=(player.pantry||0)+shop.pantry;
    if(typeof spendTime==='function')spendTime(shop.kind==='cinema'?70:12);
    addEvent('«'+(mallHere()&&mallHere().n||'ТЦ')+'», '+shop.name+': −'+fmtMoney(shop.price)+'. '+shop.line,'say');
    setHint(shop.line);
    if(typeof saveState==='function')saveState();
  });
}
function mallFood(){const bag=mallBag();if(bag&&bag.food>1){setHint('Наелись. Хватит на этот заход.');return;}
  mallSpend(420,()=>{if(bag)bag.food=(bag.food||0)+1;player.food=clamp(player.food+40,0,100);player.mood=clamp(player.mood+6,0,100);if(typeof spendTime==='function')spendTime(25);addEvent('Фуд-корт. Сытость +40.','say');setHint('Поели. Можно ещё в один отдел или на второй этаж.');if(typeof saveState==='function')saveState();});}
function mallFloorGo(up){const m=mallHere();if(!m||!interior)return;
  const floor=up?1:0;const bag=interior.mallBag||{};const ret=interior.ret||{x:player.x,y:player.y};
  enterInterior({kind:'mall',name:m.n+' · '+(floor?'2 этаж':'1 этаж'),key:'mall:'+m.id+':'+floor,x:ret.x,y:ret.y,venueAt:interior.venueAt||{x:ret.x,y:ret.y},mall:m,floor,keepBag:bag});
}
function mallDraw(f,t){const x=f.x-f.w/2,y=f.y-f.h/2;
  if(f.t==='front'){ctx.fillStyle='rgba(0,0,0,.16)';ctx.fillRect(x+0.08,y+0.1,f.w,f.h);
    ctx.fillStyle='#F4F1EA';if(typeof rrect==='function'){rrect(ctx,x,y,f.w,f.h,0.12);ctx.fill();}else ctx.fillRect(x,y,f.w,f.h);
    ctx.fillStyle=f.ink||'#3E6EA5';ctx.fillRect(x,y,f.w,0.42);
    ctx.fillStyle='#fff';ctx.font='0.28px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText((f.shop&&f.shop.name)||'МАГАЗИН',f.x,y+0.22,f.w-0.3);
    ctx.fillStyle='#5C5348';ctx.font='0.2px system-ui';ctx.fillText(fmtMoney(f.shop&&f.shop.price||0),f.x,y+0.85,f.w-0.4);return;}
  if(f.t==='fountain'){ctx.fillStyle='#D5DBE0';ctx.beginPath();ctx.ellipse(f.x,f.y,f.w/2,f.h/2,0,0,Math.PI*2);ctx.fill();
    const s=0.55+0.04*Math.sin((t||0)*2);ctx.fillStyle='#7EB6D6';ctx.beginPath();ctx.ellipse(f.x,f.y,(f.w/2)*s,(f.h/2)*s*0.72,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.65)';ctx.beginPath();ctx.arc(f.x,f.y-0.15,0.12,0,Math.PI*2);ctx.fill();return;}
  if(f.t==='escalator'){ctx.fillStyle='#2C3138';ctx.fillRect(x,y,f.w,f.h);
    ctx.strokeStyle='#E6C56A';ctx.lineWidth=0.06;const drift=((t||0)*0.35)%0.35;
    for(let i=-1;i<8;i++){ctx.beginPath();ctx.moveTo(x+0.2+i*0.35+drift,y+0.12);ctx.lineTo(x+0.45+i*0.35+drift,y+f.h-0.12);ctx.stroke();}
    ctx.fillStyle='#fff';ctx.font='0.22px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(f.spot==='down'?'ВНИЗ':'НАВЕРХ',f.x,f.y,f.w-0.2);return;}
  if(f.t==='screen'){ctx.fillStyle='#141820';ctx.fillRect(x,y,f.w,f.h);ctx.fillStyle='#9EC4E8';ctx.fillRect(x+0.15,y+0.12,f.w-0.3,f.h-0.24);
    ctx.fillStyle='#1C2430';ctx.font='0.22px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('КИНО',f.x,f.y);}}
function mallReply(w){if(!(interior&&interior.kind==='mall')||!w||!w.p)return null;
  const job=w.p.job||'';if(!/консультант|охран|кассир|покупатель/.test(job))return null;
  const m=mallHere();const where=m?m.n:'центр';
  const line=/охран/.test(job)?pick(['Проходите. Пакеты не ставьте у эскалатора.','Камеры в галерее, я просто стою у выхода.','На втором этаж кино. В зал со своей едой не надо.']):
    /кассир/.test(job)?pick(['Сеанс через десять минут. Зал тёмный, места свободные.','Билет в кассе. Это обычный фильм, не трансляция.','Попкорн рядом, если голодные.']):
    /покупатель/.test(job)?pick(['В «'+where+'» сегодня людно, но к витринам пройти можно.','Я за книгами. Наверху тише.','Фуд-корт вон там, если проголодались.']):
    pick(['Витрина слева — одежда, справа техника. Цены на вывеске.','Фуд-корт у эскалатора. Второй этаж — кино.','Могу подсказать отдел. Покупать — у самой витрины, клавиша E.']);
  return {reply:line,action:'none',place:''};}
function mallMount(){if(typeof world==='undefined'||!world||!world.pois||typeof llToXY!=='function'||mallMount.done)return;mallMount.done=true;
  for(const m of MALLS){const xy=llToXY(m.ll);let near=null,bd=80;
    for(const p of world.pois){const d=Math.hypot(p.x-xy[0],p.y-xy[1]);if(d<bd&&mallDoorName(p,m)){near=p;bd=d;}}
    if(near){near.t='mall';near.n=m.n;m.x=near.x;m.y=near.y;}
    else{const o={x:xy[0],y:xy[1],t:'mall',n:m.n,st:'',i:(world.pseq=(world.pseq||0)+1)};world.pois.push(o);m.x=o.x;m.y=o.y;}}}
function openMallList(){let box=document.getElementById('mallModal');
  if(!box){box=document.createElement('div');box.className='modal';box.id='mallModal';
    box.innerHTML='<div class="box"><div class="ui-sheet-head"><span class="ui-sheet-grip"></span><h2>Торговые центры</h2><button class="btn ui-sheet-close" type="button" aria-label="Закрыть">×</button></div><div class="ui-sheet-body"><p>Одиннадцать центров по городу. Внизу витрины и фуд-корт, эскалатор ведёт в кино. С 10:00 до 22:00. Иконка 🏬 слева от компаса.</p><div class="order-list"></div></div><div class="ui-sheet-foot"><div class="row"><button class="btn" type="button">Закрыть</button></div></div></div>';
    document.body.append(box);
    const shut=()=>{box.hidden=true;if(player)player.busy=false;};
    box.querySelector('.ui-sheet-close').onclick=shut;
    box.querySelector('.ui-sheet-foot .btn').onclick=shut;
    box.addEventListener('click',e=>{if(e.target===box)shut();});}
  const list=box.querySelector('.order-list');list.innerHTML='';
  for(const m of MALLS){const b=document.createElement('button');b.type='button';b.className='order-item';
    const left=document.createElement('div');const title=document.createElement('span');title.textContent=m.n;
    const i=document.createElement('i');i.textContent=m.addr+' · '+m.note;left.append(title,i);
    const go=document.createElement('b');go.textContent='Идти';b.append(left,go);
    b.onclick=()=>{box.hidden=true;if(player)player.busy=false;
      if(!isFinite(m.x)){setHint('Карта ещё собирается. Секунду.');return;}
      if(typeof scene!=='undefined'&&(scene!=='city'||player.inside||player.vehicle||player.bus)){setHint('Сначала на улицу, пешком.');return;}
      if(typeof startWalkNav==='function')startWalkNav({n:m.n,x:m.x,y:m.y});else setHint(m.addr);};
    list.append(b);}
  box.hidden=false;if(player)player.busy=true;}
function mountMallButton(){if(document.getElementById('mallBtn'))return;
  const host=document.getElementById('routeBtn')||document.getElementById('menuBtn');
  if(!host||!host.parentElement)return;
  const b=document.createElement('button');b.className='btn';b.id='mallBtn';b.type='button';b.title='Торговые центры';b.textContent='🏬';b.style.fontSize='16px';
  b.onclick=openMallList;host.parentElement.insertBefore(b,host);}
if(typeof buildWorld==='function'){const mallWorld0=buildWorld;buildWorld=function(d){const r=mallWorld0(d);mallMount.done=false;mallMount();return r;};}
if(typeof makeInterior==='function'){const mallMake0=makeInterior;makeInterior=function(kind,name,key,room){if(kind==='mall')return makeMallRoom(name,key);return mallMake0(kind,name,key,room);};}
if(typeof poiAction==='function'){const mallPoi0=poiAction;poiAction=function(poi){
  if(poi&&poi.t==='mall'){const m=mallByName(poi.n)||{id:'mall',n:poi.n||'Торговый центр',k:1,aisle:'family',x:poi.x,y:poi.y};
    const ca=typeof closedAction==='function'?closedAction(poi,typeof poiKey==='function'?poiKey(poi):'mall'):null;if(ca)return ca;
    return {label:'Зайти в «'+m.n+'»',run:()=>enterInterior({kind:'mall',name:m.n+' · 1 этаж',key:'mall:'+(m.id||mallNorm(m.n))+':0',x:player.x,y:player.y,venueAt:{x:poi.x,y:poi.y},mall:m,floor:0})};}
  return mallPoi0(poi);};}
if(typeof spotAction==='function'){const mallSpot0=spotAction;spotAction=function(f,it){
  if(it&&it.kind==='mall'&&f){
    if(f.spot==='shop'||f.spot==='cinema'||f.spot==='snack'){const s=f.shop||{name:'Отдел',price:0,kind:f.spot,line:''};return {label:s.name+' · '+fmtMoney(s.price),run:()=>mallTake(s)};}
    if(f.spot==='food')return {label:'Фуд-корт · 420 ₽',run:mallFood};
    if(f.spot==='up')return {label:'Эскалатор на 2 этаж · кино',run:()=>mallFloorGo(true)};
    if(f.spot==='down')return {label:'Эскалатор на 1 этаж · магазины',run:()=>mallFloorGo(false)};
    if(f.spot==='info'){const m=mallHere();return {label:'Стойка справочной',run:()=>setHint(m?m.note+' Витрины — E, эскалатор — кино.':'Галерея. Витрины открываются клавишей E.')};}
  }
  return mallSpot0(f,it);};}
if(typeof drawFurniture==='function'){const mallDraw0=drawFurniture;drawFurniture=function(f,it,t){
  if(it&&it.kind==='mall'&&f&&(f.t==='front'||f.t==='fountain'||f.t==='escalator'||f.t==='screen')){mallDraw(f,t);return;}
  return mallDraw0(f,it,t);};}
if(typeof enterInterior==='function'){const mallIn0=enterInterior;enterInterior=function(src){const r=mallIn0(src);
  if(interior&&src&&src.kind==='mall'){interior.mallRef=src.mall||mallByName(src.name)||interior.mallRef;interior.mallFloor=src.floor||0;interior.venueAt=src.venueAt||interior.venueAt;interior.mallBag=src.keepBag||{};
    setHint(interior.mallFloor?'Второй этаж: касса кино, книги и эскалатор вниз.':'Первый этаж: витрины и фуд-корт. Эскалатор — на кино.');}
  return r;};}
if(typeof poiHours==='function'){const mallHours0=poiHours;poiHours=function(p){if(p&&p.t==='mall')return {a:10,b:22};return mallHours0(p);};}
if(typeof scriptedThink==='function'){const mallSay0=scriptedThink;scriptedThink=function(w,text){const own=mallReply(w);if(own)return own;return mallSay0(w,text);};}
if(typeof npcThink==='function'){const mallThink0=npcThink;npcThink=async function(w){const own=mallReply(w);if(own)return own;return mallThink0.apply(this,arguments);};}
if(!document.getElementById('mallCss')){const st=document.createElement('style');st.id='mallCss';st.textContent='#mallModal .order-list{max-height:46vh;overflow:auto}#mallModal .order-item i{display:block;font-style:normal;color:#8FA3AE;font-size:12px;font-weight:400}';document.head.appendChild(st);}
mountMallButton();
setTimeout(mallMount,1900);
setTimeout(mountMallButton,2000);
