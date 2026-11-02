// Приглашение в номер: 50 гостиниц с карты, дорога вместе, номер и чат. Уйти может любой.
const HOTELS=[
  {n:'Корстон',price:8900,style:'suite',aka:['корстон','кортстон']},
  {n:'Courtyard by Marriott Kazan Kremlin',price:9800,style:'kremlin',aka:['marriott','мариотт','courtyard']},
  {n:'Grand Hotel Kazan',price:9200,style:'kremlin',aka:['grand hotel','гранд отель']},
  {n:'Шаляпин Палас Отель',price:8600,style:'kremlin',aka:['шаляпин']},
  {n:'Kazan Palace by Tasigo',price:9000,style:'kremlin',aka:['kazan palace','тасиго']},
  {n:'Neo Kazan palace by Tasigo',price:8800,style:'kremlin',aka:['neo kazan']},
  {n:'Ногай',price:7400,style:'kremlin',aka:['ногай']},
  {n:'DoubleTree',price:8200,style:'suite',aka:['doubletree','даблтри']},
  {n:'Ramada Kazan City Center',price:7600,style:'modern',aka:['ramada','рамада']},
  {n:'Cosmos',price:7000,style:'suite',aka:['cosmos','космос']},
  {n:'Azimut отель Бауман Казань',price:7200,style:'modern',aka:['azimut','азимут']},
  {n:'Bilyar Palace',price:8000,style:'kremlin',aka:['bilyar','биляр']},
  {n:'Мираж',price:6800,style:'suite',aka:['мираж']},
  {n:'Ривьера',price:7100,style:'suite',aka:['ривьера']},
  {n:'Luciano',price:6400,style:'modern',aka:['luciano','лучано']},
  {n:'Luciano Residence Kazan',price:6900,style:'modern',aka:['luciano residence']},
  {n:'Регина',price:5200,style:'classic',aka:['регина','regina']},
  {n:'Татарстан',price:4800,style:'classic',aka:['гостиница татарстан']},
  {n:'Сулейман палас',price:6100,style:'kremlin',aka:['сулейман']},
  {n:'Кристалл',price:5400,style:'modern',aka:['кристалл']},
  {n:'Волга',price:4500,style:'classic',aka:['гостиница волга']},
  {n:'Parkhotel',price:5000,style:'modern',aka:['parkhotel','парк отель']},
  {n:'IT-парк отель',price:5600,style:'modern',aka:['it-парк','ит-парк']},
  {n:'Особняк на Театральной',price:6300,style:'classic',aka:['театральной']},
  {n:'Купеческий дом',price:4700,style:'classic',aka:['купеческий']},
  {n:'Ямской посад',price:4400,style:'classic',aka:['ямской']},
  {n:'Азалия на Московской',price:4200,style:'classic',aka:['азалия']},
  {n:'Kazantel',price:5100,style:'modern',aka:['kazantel','казантель']},
  {n:'Булгар',price:4600,style:'classic',aka:['булгар']},
  {n:'Амакс Сафар',price:4900,style:'modern',aka:['амакс','сафар']},
  {n:'Hotel Hills',price:5300,style:'modern',aka:['hotel hills','хиллс']},
  {n:'Relita-Kazan',price:4000,style:'classic',aka:['relita','релита']},
  {n:'Карат',price:4300,style:'classic',aka:['карат']},
  {n:'Ильмар Сити',price:5500,style:'modern',aka:['ильмар']},
  {n:'Давыдов инн',price:4100,style:'classic',aka:['давыдов']},
  {n:'Корона',price:4500,style:'classic',aka:['корона']},
  {n:'Парадиз',price:6000,style:'suite',aka:['парадиз']},
  {n:'Европа',price:4300,style:'classic',aka:['гостиница европа']},
  {n:'ТатарИнн',price:4000,style:'classic',aka:['татаринн']},
  {n:'Этника',price:3900,style:'classic',aka:['этника']},
  {n:'Сафьян',price:4200,style:'classic',aka:['сафьян']},
  {n:'Милена',price:3800,style:'classic',aka:['милена']},
  {n:'Островский',price:4100,style:'classic',aka:['островский']},
  {n:'Фешин',price:4400,style:'classic',aka:['фешин']},
  {n:'Хаял',price:3600,style:'classic',aka:['хаял']},
  {n:'Джузеппе',price:4800,style:'classic',aka:['джузеппе']},
  {n:'Динарт',price:3700,style:'classic',aka:['динарт']},
  {n:'Интермарк резиденс',price:6200,style:'modern',aka:['интермарк']},
  {n:'Астория',price:4600,style:'classic',aka:['астория']},
  {n:'Волжская гавань',price:5000,style:'modern',aka:['волжская гавань']}
];
const HOTEL_ROOMS={kremlin:'img/inside/room-kremlin.jpg',modern:'img/inside/room-modern.jpg',classic:'img/inside/room-classic.jpg',suite:'img/inside/room-suite.jpg'};
const hotelRoomImg={};
for(const k in HOTEL_ROOMS){const im=new Image();im.src=HOTEL_ROOMS[k];hotelRoomImg[k]=im;}
let hotelPickerWho=null;
function hotelNorm(s){return String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[«»"'.,!?]/g,'').trim();}
function hotelOnDuty(w){const p=w&&w.p;if(!p)return false;if(p.age&&p.age<18)return 'young';if(/police|guard/.test(w.role||'')||/участков|полиц/.test(p.job||''))return 'duty';return false;}
function hotelMatch(text){const t=hotelNorm(text);let best=null,bl=0;
  for(const h of HOTELS){const keys=[hotelNorm(h.n)].concat((h.aka||[]).map(hotelNorm));
    for(const k of keys){if(k.length<4)continue;if(t.includes(k)&&k.length>bl){best=h;bl=k.length;}}}
  return best;}
function hotelAskText(text){const t=hotelNorm(text);if(!t)return null;const h=hotelMatch(t);
  const verb=/(пошли|пойдем|пойдем|идем|айда|давай|поехали|заселим|снимем|позови|приглаш|хочу)/.test(t);
  const generic=/(отел|гостиниц|в номер)/.test(t);
  const toward=/(^|\s)в\s/.test(t);
  if(h){const n=hotelNorm(h.n);const aka=(h.aka||[]).map(hotelNorm).filter(a=>a.length>4);
    const hit=t.includes(n)||aka.some(a=>t.includes(a));
    if(hit&&(verb||generic||toward))return h;}
  if(generic&&(verb||toward))return 'pick';
  return null;}
function hotelLastAsk(w){const mem=(w&&w.p&&w.p.memory)||[];for(let i=mem.length-1;i>=0;i--)if(mem[i].role==='user')return hotelAskText(mem[i].content);return null;}
function hotelLine(w,ask){const she=w.p&&w.p.female;if(ask==='young')return 'Мне в гостиницу рано.';
  if(ask==='duty')return 'Я на службе. В гостиницу не пойду.';
  if(ask==='pick')return she?'В гостиницу можно. Выбери, куда: я поеду так же, как ты.':'В гостиницу можно. Выбери, куда. Доедем, как скажешь.';
  w.p.dateHotel=ask;
  return she?`${ask.n}? Идём. Номер на двоих, ${fmtMoney(ask.price)}. Чай, окно на город — и я сяду ближе, не через стол. Как ехать, решай ты.`
    :`${ask.n}? Идём. Номер на двоих, ${fmtMoney(ask.price)}. Чай и окно. Дорогу выбирай ты.`;}
function hotelDateOf(w){const who=w&&(w.companionOf||w);if(!who||!who.p)return null;
  if(typeof companion!=='undefined'&&companion&&companion.w===who&&companion.hotel)return companion.hotel;
  return who.p.dateHotel||null;}
function hotelInRoom(w){const who=w&&(w.companionOf||w);return typeof companion!=='undefined'&&companion&&companion.w===who&&companion.inRoom;}
function hotelFollow(w,text){const h=hotelDateOf(w);if(!h||!h.n)return null;const t=hotelNorm(text);if(!t)return null;
  if(/(не хочу|отстань|передумал|не пойд|в другой раз|отмена|раздумал)/.test(t)){w.p.dateHotel=null;return w.p.female?'Ну ладно. Тогда без номера. Скажешь, если передумаешь.':'Ладно. Без номера. Скажешь, если передумаешь.';}
  const about=/(там|делать|будем|номер|чай|дальше|потом|зачем|чего|хочу|нрав|сяд|окн|поцел|обним|дорого|поедем|пошли|идем|ты как|красив|жало|снимем|корт|отел)/.test(t)||t.length<42;
  if(!about)return null;
  const she=!!w.p.female,room=hotelInRoom(w);
  const pool=room?(she?[
    'Мы уже здесь. Иди сюда, чай стынет. Я на тебя смотрю, не в телефон.',
    'Делать? Сидеть рядом и не спешить. Город за окном, ты ближе.',
    'Куртку я уже на стул. Садись ко мне, хватит стоять в дверях.',
    'Мне с тобой хорошо. Давай без других тем: только этот номер и ты.'
  ]:[ 
    'Мы уже в номере. Садись ближе, чай налит.',
    'Никуда больше не зову. Сидим тут, город за окном.'
  ]):(she?[
    `В «${h.n}» сядем у окна. Чай, я сниму куртку, если жарко, и буду смотреть на тебя.`,
    'Сначала доедем. В номере обниму в дверях и налью чай. Мне этого хочется.',
    `За ${fmtMoney(h.price)} мы вдвоём, без улицы и спешки. Я уже согласна, не тяни.`,
    'Там будем просто вместе. Без ярмарок и дел. Ты, я и окно на город.',
    'Не уходи в сторону. Я сказала да: номер, чай и я рядом. Веди.'
  ]:[ 
    `В «${h.n}» сядем у окна, закажем чай. Я уже согласен.`,
    'Доедем и закроем дверь. Без других дел, только мы.'
  ]);
  let line=pick(pool);if(line===w.p.dateSaid)line=pick(pool.filter(x=>x!==line).concat(pool));w.p.dateSaid=line;return line;}
function hotelPoi(name){if(typeof world==='undefined'||!world.pois)return null;const n=hotelNorm(name);let best=null,bs=0;
  for(const p of world.pois){if(p.t!=='hotel'||!p.n)continue;const pn=hotelNorm(p.n);let s=0;if(pn===n)s=5;else if(pn.includes(n)||n.includes(pn))s=3;if(s>bs){bs=s;best=p;}}return best;}
function hotelDoor(p){let x=p.x,y=p.y;if(typeof inBuilding==='function'&&inBuilding(x,y)&&typeof toSidewalk==='function'){const q=toSidewalk(x,y);if(q){x=q[0];y=q[1];}}return {x,y};}
function beginHotelTrip(who,hotel){const poi=hotelPoi(hotel.n);if(!poi){setHint(`«${hotel.n}» сейчас не находится на карте`);return null;}
  if(!companion||companion.w!==who){if(typeof startCompanion==='function')startCompanion(who,'follow',null,true);}
  const c=companion;if(!c)return null;const d=hotelDoor(poi);
  c.mode='follow';c.dest={x:d.x,y:d.y,n:hotel.n,hotel:true};c.homeVisit=true;c.hotel=hotel;c.hotelVisit=true;c.hotelBroke=false;c.inRoom=false;c.staysInRoom=false;c.arrived=false;c.route=null;c.toldRide=null;player.escort=false;
  addEvent(`🏨 ${who.p.name} едет с вами в «${hotel.n}». Номер ${fmtMoney(hotel.price)}. Выберите, как добраться`,'say');
  setHint('Пешком, самокат, такси или автобус — выбор за вами');
  if(typeof closeChat==='function'&&typeof chatNpc!=='undefined'&&chatNpc)closeChat();
  if(typeof openRouteModal==='function')openRouteModal(c.dest);if(typeof updateCompBox==='function')updateCompBox();
  return `${who.p.name} едет с вами в «${hotel.n}»`;}
function openHotelPicker(who){hotelPickerWho=who;const m=$('#hotelModal');if(!m)return;m.hidden=false;player.busy=true;const q=$('#hotelQ');if(q)q.value='';renderHotelList();setTimeout(()=>{if(q)q.focus();},30);}
function closeHotelPicker(){const m=$('#hotelModal');if(m)m.hidden=true;if(typeof chatNpc==='undefined'||!chatNpc)player.busy=false;hotelPickerWho=null;}
function renderHotelList(){const box=$('#hotelList');if(!box)return;box.innerHTML='';const q=hotelNorm($('#hotelQ')&&$('#hotelQ').value);
  const rows=HOTELS.map(h=>{const p=hotelPoi(h.n);const d=p?dist(p.x,p.y,player.x,player.y):1e12;return {h,d,p};}).filter(r=>!q||hotelNorm(r.h.n).includes(q)||(r.h.aka||[]).some(a=>hotelNorm(a).includes(q)));
  rows.sort((a,b)=>a.d-b.d);
  if(!rows.length){const p=document.createElement('p');p.textContent='Такой гостиницы в списке нет.';box.append(p);return;}
  for(const r of rows){const b=document.createElement('button');b.className='cp-person';const t=document.createElement('b');t.textContent=r.h.n;const s=document.createElement('span');s.textContent=r.p?`${fmtMoney(r.h.price)} · ${typeof fmtDist==='function'?fmtDist(r.d):Math.round(r.d)+' м'}`:`${fmtMoney(r.h.price)} · нет на карте`;b.append(t,s);b.disabled=!r.p;b.addEventListener('click',()=>{const who=hotelPickerWho||(companion&&companion.w);closeHotelPicker();if(who)beginHotelTrip(who,r.h);});box.append(b);}}
function paintHotelFaces(it,hotel,who){const bg=hotelRoomImg[hotel.style]||hotelRoomImg.classic;const c=document.createElement('canvas');c.width=1280;c.height=720;const g=c.getContext('2d');
  if(bg&&bg.complete&&bg.width){const s=Math.max(1280/bg.width,720/bg.height),dw=bg.width*s,dh=bg.height*s;g.drawImage(bg,(1280-dw)/2,(720-dh)/2,dw,dh);}
  else{g.fillStyle='#1c1814';g.fillRect(0,0,1280,720);if(bg&&!bg.complete)bg.addEventListener('load',()=>paintHotelFaces(it,hotel,who),{once:true});}
  g.fillStyle='rgba(12,10,8,.16)';g.fillRect(0,0,1280,720);
  const faces=[{name:player.name||'Вы',img:player.avatarImg}];
  if(who)faces.push({name:who.p.name,img:typeof npcFaceImg==='function'?npcFaceImg(who.p):null});
  faces.forEach((m,i)=>{const x=faces.length===1?640:(i?860:420),y=250,r=faces.length===1?100:92;
    g.save();g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.clip();
    if(m.img&&m.img.width)g.drawImage(m.img,x-r,y-r-6,r*2,r*2);
    else{g.fillStyle=i?'#3a4a68':'#2c6a4e';g.fillRect(x-r,y-r,r*2,r*2);g.fillStyle='#fff';g.font='700 64px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText((m.name||'?')[0],x,y);}
    g.restore();g.strokeStyle='#fff';g.lineWidth=5;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.stroke();
    g.font='600 28px "IBM Plex Sans",sans-serif';g.fillStyle='#fff';g.textAlign='center';g.shadowColor='rgba(0,0,0,.75)';g.shadowBlur=8;g.fillText(m.name,x,y+r+36);g.shadowBlur=0;});
  it.photoImg=c;it.hotelRef=hotel;if(typeof placeChatLook==='function')placeChatLook();}
function enterHotelRoom(c){const hotel=c.hotel,who=c.w;c.inRoom=true;c.staysInRoom=false;
  enterInterior({kind:'hotelroom',name:hotel.n,key:'hotelroom:'+hotel.n,x:player.x,y:player.y,together:true});
  if(interior)paintHotelFaces(interior,hotel,who);
  addEvent(`Вы в номере «${hotel.n}». Можно говорить. Уйти может любой.`,'say');}
function maybeEnterHotelTogether(){const c=companion;if(!c||!c.hotelVisit||!c.hotel||!c.dest||player.inside||player.vehicle||player.bus)return false;
  if(dist(player.x,player.y,c.dest.x,c.dest.y)>26)return false;
  if(!c.hotelPaid){if(player.money<c.hotel.price){if(!c.hotelBroke){c.hotelBroke=true;setHint(`Номер ${fmtMoney(c.hotel.price)} — не хватает`);addEvent(`${c.w.p.name}: номер ${fmtMoney(c.hotel.price)}. Давай, когда будут деньги`,'say');}c.hotelVisit=false;c.homeVisit=false;c.arrived=true;return true;}
    spend(c.hotel.price,()=>{c.hotelPaid=true;addEvent(`Номер в «${c.hotel.n}»: −${fmtMoney(c.hotel.price)}`);});if(!c.hotelPaid)return true;}
  c.hotelVisit=false;c.homeVisit=false;c.arrived=true;enterHotelRoom(c);return true;}
function hotelPlayerLeaves(){const c=companion;if(!c||!c.inRoom)return;if(typeof chatNpc!=='undefined'&&chatNpc)closeChat();
  c.inRoom=false;c.staysInRoom=true;c.homeVisit=false;exitInterior();
  const she=c.w.p.female;addEvent(she?'Вы вышли. Она осталась в номере.':'Вы вышли. Он остался в номере.','say');
  setHint(she?'Она может выйти сама — кнопка рядом':'Он может выйти сам — кнопка рядом');updateCompBox();}
function hotelCompanionLeaves(){const c=companion;if(!c)return;const w=c.w,she=w.p.female,hotel=c.hotel;
  const line=she?'Я пойду. Побудь, если хочешь.':'Я пойду. Побудь, если хочешь.';
  addEvent(`${w.p.name}: ${line}`,'say');
  if(typeof chatNpc!=='undefined'&&chatNpc&&(chatNpc===w||chatNpc.companionOf===w))closeChat();
  if(c.dest){w.x=c.dest.x;w.y=c.dest.y;}w.inside=false;c.inRoom=false;c.staysInRoom=false;
  const it=interior&&interior.kind==='hotelroom'?interior:null;
  stopCompanion(true);
  addEvent(`${w.p.name} ${she?'вышла':'вышел'} из номера`,'say');
  if(it&&player.inside&&interior===it)paintHotelFaces(it,hotel,null);}
function hotelReturn(){const c=companion;if(!c||!c.staysInRoom||!c.dest)return;
  if(dist(player.x,player.y,c.dest.x,c.dest.y)>28){c.hotelVisit=true;c.homeVisit=true;c.arrived=false;c.route=null;openRouteModal(c.dest);setHint('Снова к гостинице — номер уже оплачен');return;}
  enterHotelRoom(c);}
function hotelSyncUi(){const c=typeof companion!=='undefined'?companion:null;const box=$('#compBox');if(!box)return;
  let out=$('#hotelOut'),back=$('#hotelBack');
  if(!out){out=document.createElement('button');out.id='hotelOut';out.className='btn';out.textContent='Выйти из номера';back=document.createElement('button');back.id='hotelBack';back.className='btn';back.textContent='Вернуться в номер';box.append(out,back);out.addEventListener('click',hotelPlayerLeaves);back.addEventListener('click',hotelReturn);}
  const inRoom=!!(c&&c.inRoom&&player.inside&&interior&&interior.kind==='hotelroom');
  const stayed=!!(c&&c.staysInRoom&&!player.inside);
  out.hidden=!inRoom;back.hidden=!stayed;
  if(inRoom){$('#compLbl').textContent=`🏨 Номер · ${interior.name}`;$('#compBye').textContent=c.w.p.female?'Она уходит':'Он уходит';}
  else if(stayed){$('#compLbl').textContent=`🏨 ${c.w.p.name} в номере · ${c.hotel?c.hotel.n:''}`;$('#compBye').textContent=c.w.p.female?'Она выходит':'Он выходит';}
  else if(c&&c.hotelVisit&&c.dest&&!c.arrived){const left=Math.round(dist(player.x,player.y,c.dest.x,c.dest.y));$('#compLbl').textContent=`🏨 ${c.w.p.name} с вами в «${c.hotel.n}» · ${left} м`;}}
if(typeof updateCompBox==='function'){const hotelBox0=updateCompBox;updateCompBox=function(){hotelBox0();hotelSyncUi();};}
if(typeof updateCompanion==='function'){const hotelGo0=updateCompanion;updateCompanion=function(dt){hotelGo0(dt);if(companion&&companion.hotelVisit)maybeEnterHotelTogether();};}
if(typeof scriptedThink==='function'){const hotelSay0=scriptedThink;scriptedThink=function(w,text){const block=hotelOnDuty(w);const ask=hotelAskText(text);if(ask&&block)return {reply:hotelLine(w,block),action:'none',place:''};if(ask)return {reply:hotelLine(w,ask),action:'follow',place:''};const stay=hotelFollow(w,text);if(stay)return {reply:stay,action:'none',place:''};return hotelSay0(w,text);};}
if(typeof npcThink==='function'){const hotelThink0=npcThink;npcThink=async function(w){const block=hotelOnDuty(w);const ask=hotelLastAsk(w);if(ask&&block)return {reply:hotelLine(w,block),action:'none',place:''};if(ask)return {reply:hotelLine(w,ask),action:'follow',place:''};const mem=w.p&&w.p.memory||[];let last='';for(let i=mem.length-1;i>=0;i--)if(mem[i].role==='user'){last=mem[i].content;break;}const stay=hotelFollow(w,last);if(stay)return {reply:stay,action:'none',place:''};return hotelThink0.apply(this,arguments);};}
if(typeof contextForNpc==='function'){const hotelCtx0=contextForNpc;contextForNpc=function(w){let s=hotelCtx0(w);const h=hotelDateOf(w);if(h&&h.n)s+=` Ты уже согласился(ась) ехать в «${h.n}», номер на двоих. Отвечай только про эту договорённость: дорога, номер, чай, сесть ближе, лёгкий флирт. Не зови на ярмарку, работу и другие места. Не меняй тему.`;return s;};}
if(typeof applyNpcAction==='function'){const hotelAct0=applyNpcAction;applyNpcAction=function(w,r){
  const who0=w.companionOf||w;const ask=hotelLastAsk(who0);const block=hotelOnDuty(who0);
  if(ask&&!block&&(!r||r.action!=='stop')){const note=hotelAct0(w,{reply:r&&r.reply,action:'follow',place:''});const who=(companion&&companion.w)||who0;
    if(ask==='pick'){openHotelPicker(who);return 'Выберите гостиницу из списка';}
    return beginHotelTrip(who,ask)||note;}
  return hotelAct0(w,r);};}
const hotelBye=$('#compBye');if(hotelBye)hotelBye.addEventListener('click',e=>{if(!companion)return;if((companion.inRoom&&player.inside)||companion.staysInRoom){e.stopImmediatePropagation();hotelCompanionLeaves();}},true);
const hotelQ=$('#hotelQ');if(hotelQ)hotelQ.addEventListener('input',renderHotelList);
const hotelClose=$('#hotelClose');if(hotelClose)hotelClose.addEventListener('click',closeHotelPicker);
