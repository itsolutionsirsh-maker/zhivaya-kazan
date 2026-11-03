// Приглашение в номер: 50 гостиниц с карты, дорога вместе, номер и чат. Уйти может любой.
const HOTELS=[
  {n:'Корстон',price:8900,style:'suite',aka:['корстон','кортстон','korston']},
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
  const verb=/(пошли|пойдем|пойдем|идем|айда|давай|поехали|заселим|снимем|позови|пригла|хочу)/.test(t);
  const generic=/(отел|гостиниц|в номер)/.test(t);
  const toward=/(^|\s)в\s/.test(t);
  if(h){const n=hotelNorm(h.n);const aka=(h.aka||[]).map(hotelNorm).filter(a=>a.length>4);
    const hit=t.includes(n)||aka.some(a=>t.includes(a));
    if(hit&&(verb||generic||toward))return h;}
  if(generic&&(verb||toward))return 'pick';
  return null;}
function hotelLastAsk(w){const mem=(w&&w.p&&w.p.memory)||[];for(let i=mem.length-1;i>=0;i--)if(mem[i].role==='user')return hotelAskText(mem[i].content);return null;}
function hotelPerson(w){const who=w&&(w.companionOf||w);return (who&&who.p)||(w&&w.p)||null;}
function hotelLastUser(w){const mem=(hotelPerson(w)||{}).memory||(w&&w.p&&w.p.memory)||[];for(let i=mem.length-1;i>=0;i--)if(mem[i].role==='user')return mem[i].content||'';return '';}
function hotelYou(){const n=typeof player!=='undefined'&&player&&player.name?String(player.name).trim().split(/\s+/)[0]:'';return n&&n.length<18?n:'';}
function hotelWarm(){return typeof weather!=='undefined'&&weather&&typeof weather.t==='number'&&weather.t>=16;}
function hotelGoText(text){const t=hotelNorm(text);return /(поехали|погнали|выезжа|как добрат|как ехать|на такси|такси|пешком|автобус|самокат)/.test(t);}
function hotelClearDate(w){const p=hotelPerson(w);if(!p)return;p.dateHotel=null;p.dateArmed=false;}
function hotelLine(w,ask){const she=w.p&&w.p.female;if(ask==='young')return 'Мне в гостиницу рано.';
  if(ask==='duty')return 'Я на службе. В гостиницу не пойду.';
  if(ask==='pick')return she?'В гостиницу можно. Выбери, куда: я поеду так же, как ты.':'В гостиницу можно. Выбери, куда. Доедем, как скажешь.';
  w.p.dateHotel=ask;
  const you=hotelYou();
  return she?`${ask.n}? Да, ${you||'идём'}. Номер на двоих, ${fmtMoney(ask.price)}. Я сяду ближе, не через стол: чай, окно и ты. Скажешь «поехали» — выберем дорогу.`
    :`${ask.n}? Да. Номер на двоих, ${fmtMoney(ask.price)}. Чай и окно. Скажешь «поехали» — выберем дорогу.`;}
function hotelDateOf(w){const who=w&&(w.companionOf||w);if(!who||!who.p)return null;
  if(typeof companion!=='undefined'&&companion&&companion.w===who&&companion.hotel)return companion.hotel;
  return who.p.dateHotel||null;}
function hotelInRoom(w){const who=w&&(w.companionOf||w);return typeof companion!=='undefined'&&companion&&companion.w===who&&companion.inRoom;}
function hotelSay(w,pool){let line=pick(pool);if(line===w.p.dateSaid){const rest=pool.filter(x=>x!==line);line=pick(rest.length?rest:pool);}w.p.dateSaid=line;return line;}
function hotelFollow(w,text){const h=hotelDateOf(w);if(!h||!h.n)return null;const t=hotelNorm(text);if(!t)return null;
  const she=!!(w.p&&w.p.female),room=hotelInRoom(w),you=hotelYou(),warm=hotelWarm();
  if(/(не хочу|отстань|передумал|не пойд|в другой раз|отмена|раздумал|забей на номер|без номера)/.test(t)){hotelClearDate(w);return she?'Ну ладно. Тогда без номера. Скажешь, если передумаешь — я не обижусь.':'Ладно. Без номера. Скажешь, если передумаешь.';}
  if(hotelGoText(t))return she?`Поехали в «${h.n}». Я уже хочу закрыть дверь и сесть к тебе. Дорогу выбирай${you?', '+you:''}.`:`Поехали в «${h.n}». Дорогу выбирай.`;
  const coat=warm?' В номере тепло: сниму куртку и останусь в свитере.':' Куртку сниму, только если внутри жарко.';
  if(/(секс|трах|разден|голая|голый|в постел|раздев|без одеж|лифчик|трус)/.test(t))return she?`Не так быстро${you?', '+you:''}. В номере я сниму только куртку, если тепло, и останусь в свитере. Сяду ближе — этого пока хватит.`:`Не гони. Сначала номер, чай и нормальный разговор.`;
  if(room)return hotelSay(w,she?[
    `Мы уже здесь${you?', '+you:''}. Иди сюда, чай стынет. Я смотрю на тебя, не в телефон.`,
    'Что делать? Сидеть рядом и не спешить. Город за окном, ты ближе.',
    warm?'Куртку я на стул, осталась в свитере. Садись ко мне, хватит стоять в дверях.':'Садись ко мне. Чай налит, город за окном.',
    'Мне с тобой хорошо. Давай без других тем: только этот номер и ты.'
  ]:[
    'Мы уже в номере. Садись ближе, чай налит.',
    'Никуда больше не зову. Сидим тут, город за окном.'
  ]);
  if(/(ярмар|бауман|работ|заказ|новост|кафе|кино|прогул|рынок)/.test(t)&&!/(отел|номер|гостиниц|корстон|кортстон|korston)/.test(t))return hotelSay(w,she?[
    `Не уводи, ${you||'слушай'}. Я уже сказала да на «${h.n}». Ярмарка и заказы подождут — я про номер и тебя.`,
    'Я заигрываю не на площади. Закроем дверь, нальём чай, и я сяду ближе. Другие адреса не предлагай.'
  ]:[
    `Мы уже про «${h.n}». Не в другое место.`,
    'Давай без ярмарок. Номер и чай.'
  ]);
  return hotelSay(w,she?[
    `Там будем мы${you?', '+you:''}. Налью чай и сяду к тебе, не через стол.${coat} Город за окном пусть шумит сам.`,
    `Что делать? Не дела. Будем вдвоём: взгляд, чай, я ближе.${coat}`,
    `В «${h.n}» обниму в дверях и спрошу, как ты. Дальше — как само выйдет, без спешки. Мне это уже нравится.`,
    `Я согласилась не для разговора про улицу. Номер на двоих, ${fmtMoney(h.price)}, и я смотрю на тебя. Скажешь «поехали» — выедем.`
  ]:[
    `В «${h.n}» сядем у окна, закажем чай. Я уже согласен, не уводи в другие дела.`,
    'Доедем и закроем дверь. Без других адресов, только мы.'
  ]);}
function hotelPoi(name){if(typeof world==='undefined'||!world.pois)return null;const n=hotelNorm(name);
  const spec=HOTELS.find(h=>hotelNorm(h.n)===n||(h.aka||[]).some(a=>hotelNorm(a)===n));
  const keys=(spec?[hotelNorm(spec.n)].concat((spec.aka||[]).map(hotelNorm)):[n]).filter(k=>k.length>4);
  let best=null,bs=0;
  for(const p of world.pois){if(p.t!=='hotel'||!p.n)continue;const pn=hotelNorm(p.n);let s=0;
    for(const k of keys){if(pn===k)s=Math.max(s,5);else if(pn.includes(k)||k.includes(pn))s=Math.max(s,3);}if(s>bs){bs=s;best=p;}}return best;}
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
function stayInviteText(t){return /(в номер|ко мне в номер|в мой номер|пошли в номер|пойдём в номер|пойдем в номер|позови в номер|забирайся ко мне)/.test(hotelNorm(t));}
function inviteToMyRoom(w){
  const s=typeof stayLive==='function'?stayLive():null;if(!s){setHint('Сначала снимите номер');return null;}
  const who=w&&(w.companionOf||w);if(!who||!who.p)return null;
  const block=hotelOnDuty(who);
  if(block==='young'){setHint('Им в гостиницу рано');return 'young';}
  if(block==='duty'){setHint(who.p.female?'Она на службе':'Он на службе');return 'duty';}
  if(who.role==='staff'||/админ|ресепш|официант|бармен/.test(String(who.p.job||'').toLowerCase())){setHint('Это персонал. Позовите знакомого с улицы.');return 'staff';}
  if(companion&&companion.w!==who)stopCompanion(true);
  if(!companion||companion.w!==who){if(typeof startCompanion==='function')startCompanion(who,'follow',null,true);}
  const c=companion;if(!c)return null;
  c.mode='follow';c.dest={x:s.x,y:s.y,n:s.name,hotel:true,stayGuest:true};c.homeVisit=true;
  c.hotel={n:s.name,price:0,style:s.style||'classic'};c.hotelVisit=true;c.hotelPaid=true;c.hotelBroke=false;c.inRoom=false;c.staysInRoom=false;c.arrived=false;c.route=null;
  if(typeof closeChat==='function'&&typeof chatNpc!=='undefined'&&chatNpc)closeChat();
  if(player.inside&&interior&&interior.kind==='hotelroom'&&typeof staySame==='function'&&staySame(interior.name)){
    c.hotelVisit=false;c.homeVisit=false;c.arrived=true;c.inRoom=true;
    if(typeof companionEnter==='function')companionEnter(interior);
    if(typeof seatHomeTogether==='function')seatHomeTogether(interior);
    paintHotelFaces(interior,{n:s.name,style:s.style||'classic',price:0},who);
    addEvent(`${who.p.name} заходит в номер.`,'say');
    if(typeof updateCompBox==='function')updateCompBox();
    return 'in';
  }
  addEvent(`🏨 ${who.p.name} едет к вам в «${s.name}». Номер уже оплачен.`,'say');
  if(!player.inside&&dist(player.x,player.y,s.x,s.y)>26&&typeof openRouteModal==='function')openRouteModal(c.dest);
  else if(!player.inside)maybeEnterHotelTogether();
  if(typeof updateCompBox==='function')updateCompBox();
  return 'go';
}
function stayInviteSync(){const b=document.getElementById('chatStay');if(!b)return;const w=typeof chatNpc!=='undefined'?chatNpc:null;const who=w&&(w.companionOf||w);
  const ok=!!(typeof stayLive==='function'&&stayLive()&&who&&who.p&&!hotelOnDuty(who)&&who.role!=='staff'&&!/админ|ресепш/.test(String(who.p.job||'').toLowerCase())&&!(companion&&companion.inRoom&&companion.w===who));
  b.hidden=!ok;}
function hotelReply(w,text){const last=text!=null?text:hotelLastUser(w);const block=hotelOnDuty(w);const ask=hotelAskText(last);const she=!!(w.p&&w.p.female);
  if(typeof stayLive==='function'&&stayLive()&&stayInviteText(last)){if(block)return {reply:hotelLine(w,block),action:'none',place:''};
    const who=w.companionOf||w;const you=hotelYou();setTimeout(()=>inviteToMyRoom(who),40);
    return {reply:she?`В номер? Да${you?', '+you:''}. Чай, диван, я сяду ближе. Второй раз не платим — номер уже твой.`:`В номер можно. Посидим, поесть там входит. Едем.`,action:'none',place:''};}
  if(ask&&block)return {reply:hotelLine(w,block),action:'none',place:''};
  const dated=hotelDateOf(w);
  if(ask==='pick')return {reply:hotelLine(w,'pick'),action:'follow',place:''};
  if(ask&&ask!=='pick'){if((w.p.dateArmed&&dated)||hotelGoText(last)){w.p.dateHotel=ask;w.p.dateArmed=true;const you=hotelYou();
      return {reply:she?`Поехали в «${ask.n}». Номер на двоих, ${fmtMoney(ask.price)}. Я с тобой${you?', '+you:''}: сяду ближе, как дверь закроется. Дорогу выбирай.`:`Поехали в «${ask.n}». Номер ${fmtMoney(ask.price)}. Дорогу выбирай.`,action:'follow',place:''};}
    return {reply:hotelLine(w,ask),action:'none',place:''};}
  if(!dated)return null;
  const stay=hotelFollow(w,last)||(she?'Я уже сказала да. Номер, чай и я ближе. Не уводи разговор.':'Я уже согласен. Давай про номер, не в сторону.');
  return {reply:stay,action:hotelGoText(last)?'follow':'none',place:''};}
if(typeof scriptedThink==='function'){const hotelSay0=scriptedThink;scriptedThink=function(w,text){const own=hotelReply(w,text);if(own)return own;return hotelSay0(w,text);};}
if(typeof npcThink==='function'){const hotelThink0=npcThink;npcThink=async function(w){const own=hotelReply(w,null);if(own)return own;return hotelThink0.apply(this,arguments);};}
if(typeof contextForNpc==='function'){const hotelCtx0=contextForNpc;contextForNpc=function(w){let s=hotelCtx0(w);const h=hotelDateOf(w);if(h&&h.n)s+=` Ты уже согласился(ась) ехать в «${h.n}», номер на двоих. Отвечай только про эту договорённость: дорога, номер, чай, сесть ближе, лёгкий флирт. Не зови на ярмарку, работу и другие места. Не меняй тему.`;return s;};}
if(typeof applyNpcAction==='function'){const hotelAct0=applyNpcAction;applyNpcAction=function(w,r){
  const who0=w.companionOf||w;const p=hotelPerson(who0);const ask=hotelLastAsk(who0);const block=hotelOnDuty(who0);const last=hotelLastUser(who0);
  if(block)return ask?null:hotelAct0(w,r);
  if(ask==='pick'){const who=(companion&&companion.w)||who0;hotelAct0(w,{reply:r&&r.reply,action:'follow',place:''});openHotelPicker(who);return 'Выберите гостиницу из списка';}
  if(ask&&ask!=='pick'&&p&&!p.dateArmed&&!(r&&r.action==='follow')){p.dateArmed=true;return null;}
  if(p&&p.dateHotel&&(hotelGoText(last)||(r&&(r.action==='follow'||r.action==='go')))){p.dateArmed=true;const who=(companion&&companion.w)||who0;hotelAct0(w,{reply:r&&r.reply,action:'follow',place:''});return beginHotelTrip(who,p.dateHotel)||null;}
  if(p&&p.dateHotel)return null;
  return hotelAct0(w,r);};}
if(typeof openChat==='function'){const stayOpen0=openChat;openChat=function(w){stayOpen0(w);stayInviteSync();};}
if(typeof closeChat==='function'){const stayClose0=closeChat;closeChat=function(){const r=stayClose0();stayInviteSync();return r;};}
const chatStayBtn=document.getElementById('chatStay');if(chatStayBtn)chatStayBtn.addEventListener('click',()=>{const w=typeof chatNpc!=='undefined'&&chatNpc&&(chatNpc.companionOf||chatNpc);if(w)inviteToMyRoom(w);});
const hotelBye=$('#compBye');if(hotelBye)hotelBye.addEventListener('click',e=>{if(!companion)return;if((companion.inRoom&&player.inside)||companion.staysInRoom){e.stopImmediatePropagation();hotelCompanionLeaves();}},true);
const hotelQ=$('#hotelQ');if(hotelQ)hotelQ.addEventListener('input',renderHotelList);
const hotelClose=$('#hotelClose');if(hotelClose)hotelClose.addEventListener('click',closeHotelPicker);
