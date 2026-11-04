// Бани и термы Казани: настоящие адреса, пар, бассейн и чай входят в визит.
const BATHS=[
  {n:'Термы «Пляж»',ll:[55.7248,49.1943],price:2800,style:'pool',aka:['пляж','термы пляж'],note:'Большие термы: несколько парных и бассейны. Всё это входит во вход.'},
  {n:'Распарье',ll:[55.7884545,49.1075746],price:2200,style:'steam',aka:['распарье'],note:'Дровяной пар в центре. Веник, бассейн и чай входят.'},
  {n:'Деревенька',ll:[55.7887356,49.1146507],price:1600,style:'steam',aka:['деревенька'],note:'Общественная баня высшего разряда. Мужское и женское отделения, чай входит.'},
  {n:'Рыжий берег',ll:[55.7806328,49.2341288],price:1500,style:'lounge',aka:['рыжий берег','рыжий'],note:'После пара — халаты и чай у окна. Бассейн входит.'},
  {n:'Казанский банный комплекс',ll:[55.8470182,49.1399327],price:1800,style:'hammam',aka:['казанский банный','кадышев'],note:'Русская парная и хаммам. Чай с мёдом уже налит.'},
  {n:'Баня №7',ll:[55.7757118,49.1364613],price:900,style:'steam',aka:['баня №7','баня n7','павлюхин'],note:'Городская баня на Павлюхина. Недорого, пар настоящий.'},
  {n:'Баня №5',ll:[55.812026,49.064234],price:700,style:'steam',aka:['баня №5','баня n5','первого мая','1 мая'],note:'Общественная на Первого Мая. Пар, душ и чай входят.'},
  {n:'Латыши',ll:[55.756082,49.165819],price:1800,style:'steam',aka:['латыши'],note:'Дрова, берёзовый веник и тихий бассейн.'},
  {n:'Деревяшки',ll:[55.817253,49.078409],price:1900,style:'steam',aka:['деревяшки'],note:'Всё из дерева: полки, стены, запах липы. Чай входит.'},
  {n:'Жемчужина',ll:[55.757226,49.206876],price:2200,style:'pool',aka:['жемчужина'],note:'Тёплый бассейн и парная. После жара сюда, не спеша.'},
  {n:'Дельфин',ll:[55.747417,49.211213],price:2000,style:'pool',aka:['дельфин'],note:'Бассейн сразу от входа. Пар и чай входят.'},
  {n:'Царицыно',ll:[55.809734,49.208207],price:3200,style:'lounge',aka:['царицыно'],note:'Тихий зал, халаты и крепкий чай. Пар и бассейн входят.'},
  {n:'Магнат',ll:[55.767399,49.176369],price:2800,style:'lounge',aka:['магнат','гвардейская'],note:'На Гвардейской. Мягкий свет, пар и бассейн уже оплачены входом.'},
  {n:'Фараон',ll:[55.751758,49.187363],price:2600,style:'hammam',aka:['фараон'],note:'Тёплый камень и хаммам, не жёсткий русский жар. Чай входит.'},
  {n:'Жара',ll:[55.813161,49.086195],price:1700,style:'steam',aka:['жара','проточная'],note:'На Проточной. Пар крепкий, потом бассейн и мёд.'},
  {n:'Парная №1',ll:[55.813089,49.196188],price:1100,style:'steam',aka:['парная №1','парная номер 1','ново-азинская'],note:'Простая городская парная. Веник можно взять у банщика.'},
  {n:'Клеопатра',ll:[55.778821,49.114924],price:2400,style:'hammam',aka:['клеопатра'],note:'На Тукая. Хаммам, тёплые полки и чай в медных пиалах.'},
  {n:'Курбановские бани',ll:[55.790736,49.256730],price:1600,style:'steam',aka:['курбановские','курбанов'],note:'Семейный пар на дровах. Бассейн небольшой, чай с травами.'},
  {n:'Аквазона',ll:[55.787164,49.162444],price:2100,style:'pool',aka:['аквазона','красная позиция'],note:'На Красной Позиции. Сначала пар, потом вода.'},
  {n:'Нега',ll:[55.829355,49.132027],price:2500,style:'lounge',aka:['нега'],note:'Тихо, халаты и низкий свет. Пар, бассейн и чай входят.'},
  {n:'Айс Пар',ll:[55.767824,49.254358],price:2300,style:'pool',aka:['айс пар','айс'],note:'Горячий пар и прохладный бассейн рядом. Чай входит.'}
];
const BATH_STILL={steam:'img/baths/steam.jpg',pool:'img/baths/pool.jpg',hammam:'img/baths/hammam.jpg',lounge:'img/baths/lounge.jpg'};
const BATH_LOOK={
  steam:{src:'img/baths/steam.gif',title:'Парная',text:'Дубовые полки, берёзовый веник и тёплый пар. Халат на лавке. Можно посидеть и никуда не спешить.'},
  pool:{src:'img/baths/pool.gif',title:'Термальный бассейн',text:'Вечер, пар над водой, город далеко. После жара сюда. Люди спокойные, без суеты.'},
  hammam:{src:'img/baths/hammam.jpg',title:'Хаммам',text:'Тёплый камень, медные чаши и чай с мёдом. Здесь жарко мягко, не как в русской парилке.'},
  lounge:{src:'img/baths/lounge.jpg',title:'После пара',text:'Халаты, чай и окно на ночной город. Сил уже больше, чем когда заходили.'},
  tea:{src:'img/baths/hammam.jpg',title:'Чай с мёдом',text:'Чай уже налит. Мёд в розетке. Это входит в визит, отдельно не платят.'}
};
const bathImg={};
for(const k in BATH_STILL){const im=new Image();im.src=BATH_STILL[k];bathImg[k]=im;}
function bathNorm(s){return String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[«»"'.,!?]/g,'').trim();}
function bathByName(name){const n=bathNorm(name);if(!n)return null;
  return BATHS.find(b=>bathNorm(b.n)===n||n.includes(bathNorm(b.n))||bathNorm(b.n).includes(n)||(b.aka||[]).some(a=>n.includes(bathNorm(a))))||null;}
function bathPaid(b){return !!(b&&player.bathAt===b.n&&player.bathTill>clock.minutes);}
function bathPay(b){if(!b)return false;if(bathPaid(b))return true;if(player.money<b.price){setHint(`Нужно ${fmtMoney(b.price)}`);return false;}
  player.money-=b.price;player.bathAt=b.n;player.bathTill=clock.minutes+150;player.bathUse={};addEvent(`«${b.n}»: −${fmtMoney(b.price)}. ${b.note||'Пар, бассейн и чай входят.'}`,'say');if(typeof saveState==='function')saveState();return true;}
function bathPaint(it,b){const style=(b&&b.style)||'steam';const im=bathImg[style]||bathImg.steam;if(!it||!im)return;
  const draw=()=>{if(!im.width)return;const c=document.createElement('canvas');c.width=1280;c.height=720;const g=c.getContext('2d');
    const s=Math.max(1280/im.width,720/im.height),dw=im.width*s,dh=im.height*s;g.drawImage(im,(1280-dw)/2,(720-dh)/2,dw,dh);
    g.fillStyle='rgba(12,10,8,.18)';g.fillRect(0,0,1280,720);it.photoImg=c;it.bathRef=b||null;if(typeof placeChatLook==='function')placeChatLook();};
  if(im.complete&&im.width)draw();else im.addEventListener('load',draw,{once:true});}
function bathLook(key){const s=BATH_LOOK[key]||BATH_LOOK.steam;if(typeof openStreetLook==='function')openStreetLook(s);}
function bathHere(){if(!(interior&&interior.kind==='bath'))return null;return bathByName(interior.name);}
function bathDo(kind){const b=bathHere();const labels={steam:'Попариться',pool:'В бассейн',tea:'Чай с мёдом'};
  return {label:labels[kind]||'Отдых',run:()=>{
    if(!b){setHint('Это не баня');return;}
    if(!bathPaid(b)){setHint('Сначала оплатите вход');return;}
    const use=player.bathUse||(player.bathUse={});
    if(use[kind]){bathLook(kind==='tea'?'tea':(b.style||kind));setHint('В этот заход вы это уже брали. Можно просто посидеть.');return;}
    use[kind]=1;
    if(kind==='steam'){player.energy=clamp(player.energy+28,0,100);player.mood=clamp(player.mood+14,0,100);player.cold=false;addEvent('Попарились. Силы вернулись, простуда отступает.','say');bathLook('steam');}
    else if(kind==='pool'){player.energy=clamp(player.energy+10,0,100);player.mood=clamp(player.mood+12,0,100);addEvent('Бассейн после пара. Настроение лучше.','say');bathLook(b.style==='pool'?'pool':'pool');}
    else {player.food=clamp(player.food+18,0,100);player.mood=clamp(player.mood+8,0,100);addEvent('Чай с мёдом. Входит в визит.','say');bathLook('tea');}
    if(typeof saveState==='function')saveState();
  }};}
function bathNearest(x,y){let best=null,bd=1e12;for(const b of BATHS){if(!isFinite(b.x))continue;const d=Math.hypot(b.x-x,b.y-y);if(d<bd){bd=d;best=b;}}return best;}
function bathMatchText(text){const t=bathNorm(text);if(!t)return null;if(!/(бан|терм|саун|попар|в парн|хамам)/.test(t))return null;
  for(const b of BATHS){if(t.includes(bathNorm(b.n))||(b.aka||[]).some(a=>t.includes(bathNorm(a))))return b;}
  return 'near';}
function bathBlock(w){const who=w&&(w.companionOf||w);if(!who||!who.p)return 'no';
  if(who.p.age&&who.p.age<18)return 'young';
  if(/police|guard/.test(who.role||'')||/участков|полиц/.test(who.p.job||''))return 'duty';
  if(who.role==='staff'||/банщик|админ|ресепш|официант|бармен/.test(bathNorm(who.p.job)))return 'staff';
  return '';}
function beginBathTrip(who,b){if(!who||!b||!isFinite(b.x)){setHint('Баня сейчас не находится');return;}
  if(typeof startCompanion!=='function')return;
  if(companion&&companion.w!==who)stopCompanion(true);
  if(!companion||companion.w!==who)startCompanion(who,'follow',null,true);
  const c=companion;if(!c)return;
  c.mode='follow';c.dest={x:b.x,y:b.y,n:b.n,bath:true};c.homeVisit=true;c.bath=b;c.bathVisit=true;c.arrived=false;c.route=null;
  if(typeof closeChat==='function'&&typeof chatNpc!=='undefined'&&chatNpc)closeChat();
  addEvent(`🪵 ${who.p.name} едет с вами в «${b.n}». Вход ${fmtMoney(b.price)}`,'say');
  if(dist(player.x,player.y,b.x,b.y)>28&&typeof openRouteModal==='function')openRouteModal(c.dest);
  else maybeEnterBath();
  if(typeof updateCompBox==='function')updateCompBox();}
function enterBathTogether(c){const b=c.bath;if(!bathPay(b)){c.bathVisit=false;c.homeVisit=false;c.arrived=true;return;}
  c.bathVisit=false;c.homeVisit=false;c.arrived=true;c.inRoom=true;
  enterInterior({kind:'bath',name:b.n,key:'bath:'+b.n,x:b.x,y:b.y,together:true,bath:b});
  addEvent(`Вы в «${b.n}». Пар, бассейн и чай уже ваши.`,'say');}
function maybeEnterBath(){const c=companion;if(!c||!c.bathVisit||!c.bath||!c.dest||player.inside||player.vehicle||player.bus)return false;
  if(dist(player.x,player.y,c.dest.x,c.dest.y)>28)return false;enterBathTogether(c);return true;}
function bathReply(w,text){const raw=text!=null?text:(function(){const mem=w&&w.p&&w.p.memory||[];for(let i=mem.length-1;i>=0;i--)if(mem[i].role==='user')return mem[i].content||'';return '';})();
  const hit=bathMatchText(raw);if(!hit)return null;
  const block=bathBlock(w);const she=!!(w.p&&w.p.female);
  if(block==='young')return {reply:'Мне в баню рано.',action:'none',place:''};
  if(block==='duty')return {reply:she?'Я на службе. В баню не пойду.':'Я на службе. В баню не пойду.',action:'none',place:''};
  if(block==='staff')return {reply:'Я тут работаю. Позовите знакомого с улицы.',action:'none',place:''};
  const b=hit==='near'?bathNearest(player.x,player.y):hit;if(!b)return null;
  const who=w.companionOf||w;
  setTimeout(()=>beginBathTrip(who,b),40);
  return {reply:she?`В «${b.n}»? Да. Халат, чай и не спешим. Вход ${fmtMoney(b.price)}, дальше пар и бассейн уже внутри.`:`В «${b.n}» можно. Попаримся и чай. Вход ${fmtMoney(b.price)}.`,action:'none',place:''};}
function bathSync(){const btn=document.getElementById('chatBath');if(!btn)return;const w=typeof chatNpc!=='undefined'?chatNpc:null;const who=w&&(w.companionOf||w);
  btn.hidden=!(who&&who.p&&!bathBlock(who)&&bathNearest(player.x,player.y));}
function bathMount(){if(typeof world==='undefined'||!world||!world.meta||!world.pois||bathMount.done)return;bathMount.done=true;
  for(const b of BATHS){const xy=llToXY(b.ll);let near=null;
    for(const p of world.pois){if(Math.hypot(p.x-xy[0],p.y-xy[1])<90&&bathByName(p.n)===b)near=p;}
    if(near){near.t='bath';near.n=b.n;b.x=near.x;b.y=near.y;}
    else {const o={x:xy[0],y:xy[1],t:'bath',n:b.n,st:'',i:(world.pseq=(world.pseq||0)+1)};world.pois.push(o);b.x=o.x;b.y=o.y;}}}
if(typeof buildWorld==='function'){const bathWorld0=buildWorld;buildWorld=function(d){const r=bathWorld0(d);bathMount.done=false;bathMount();return r;};}
if(typeof poiAction==='function'){const bathPoi0=poiAction;poiAction=function(poi){
  if(poi&&poi.t==='bath'){const b=bathByName(poi.n)||{n:poi.n||'Баня',price:1500,style:'steam',x:poi.x,y:poi.y};
    const ca=typeof closedAction==='function'?closedAction(poi,typeof poiKey==='function'?poiKey(poi):'bath'):null;if(ca)return ca;
    const paid=bathPaid(b);return {label:paid?`В «${b.n}» — оплачено`:`Зайти в «${b.n}» · ${fmtMoney(b.price)}`,run:()=>{if(!bathPay(b))return;enterInterior({kind:'bath',name:b.n,key:typeof poiKey==='function'?poiKey(poi):'bath:'+b.n,x:player.x,y:player.y,venueAt:{x:poi.x,y:poi.y},bath:b});}};}
  return bathPoi0(poi);};}
if(typeof enterInterior==='function'){const bathIn0=enterInterior;enterInterior=function(src){bathIn0(src);if(interior&&src&&src.kind==='bath')bathPaint(interior,src.bath||bathByName(src.name));};}
if(typeof updateCompanion==='function'){const bathGo0=updateCompanion;updateCompanion=function(dt){bathGo0(dt);maybeEnterBath();};}
if(typeof scriptedThink==='function'){const bathSay0=scriptedThink;scriptedThink=function(w,text){const own=bathReply(w,text);if(own)return own;return bathSay0(w,text);};}
if(typeof npcThink==='function'){const bathThink0=npcThink;npcThink=async function(w){const own=bathReply(w,null);if(own)return own;return bathThink0.apply(this,arguments);};}
if(typeof openChat==='function'){const bathOpen0=openChat;openChat=function(w){bathOpen0(w);bathSync();};}
if(typeof closeChat==='function'){const bathClose0=closeChat;closeChat=function(){const r=bathClose0();bathSync();return r;};}
const chatBathBtn=document.getElementById('chatBath');if(chatBathBtn)chatBathBtn.addEventListener('click',()=>{const w=typeof chatNpc!=='undefined'&&chatNpc&&(chatNpc.companionOf||chatNpc);const b=bathNearest(player.x,player.y);if(w&&b)beginBathTrip(w,b);});
setTimeout(bathMount,1500);
