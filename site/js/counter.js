// Стойка: в диалоге со сменой сразу услуги и оплата. Договорились — купили, без «приходите утром».
function counterNorm(s){return String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9 ]/g,' ').replace(/\s+/g,' ').trim();}
function counterYou(){const n=typeof player!=='undefined'&&player&&player.name?String(player.name).trim().split(/\s+/)[0]:'';return n&&n.length<18?n:'';}
function counterShe(w){return !!(w&&w.p&&w.p.female);}
function counterPlace(){
  if(typeof scene==='undefined'||scene!=='interior'||!interior)return null;
  if(String(interior.key||'').indexOf('story:')===0)return null;
  const k=interior.kind;
  if(!k||k==='home'||k==='guest'||k==='hotelroom'||k==='office'||k==='prosecutor')return null;
  const low=String(interior.name||'').toLowerCase();
  let kind=k;
  if(/парикмах|барбер/.test(low))kind='barber';
  else if(/цветоч/.test(low))kind='flower';
  else if(/фитнес|спортзал|тренаж/.test(low))kind='gym';
  else if(/пекар|булоч/.test(low))kind='bakery';
  else if(/шаурм|донер|döner|doner|кебаб|kebab|ханума|исфара|wаурма|shaurma|тёрка|хочу шаурму/.test(low))kind='shawarma';
  else if(/кофе|coffee|кофейн|skuratov|скуратов|шоколадниц|cofix|бинхарт/.test(low))kind='coffee';
  else if(/чайхан|ресторан/.test(low))kind='restaurant';
  else if(/чайный/.test(low))kind='tea';
  return {kind,name:interior.name||'заведение',it:interior};
}
function counterStaff(w){
  if(!w||!w.p||w.companionOf||w.companion)return null;
  if(w.p.story||w.p.dateHotel)return null;
  if(!w.isInterior)return null;
  const place=counterPlace();if(!place)return null;
  const job=String(w.p.job||'').toLowerCase();
  const role=w.role||'';
  const sell=role==='staff'||role==='police'||(role==='guard'&&place.kind==='museum')
    ||/админ|ресепш|официант|бармен|бариста|продав|кассир|фармацевт|провизор|врач|доктор|парикмах|барбер|тренер|операционист|дежурн|смотрител|библиотекар|служител|учител|преподавател/.test(job);
  return sell?place:null;
}
function counterHotel(name){
  const n=counterNorm(name);let best=null,bl=0;
  const list=typeof HOTELS!=='undefined'?HOTELS:[];
  for(const h of list){
    const keys=[counterNorm(h.n)].concat((h.aka||[]).map(counterNorm));
    for(const k of keys){if(k.length>=4&&n.includes(k)&&k.length>bl){best=h;bl=k.length;}}
  }
  return best||{n:name,price:3500,style:'classic'};
}
function counterDish(n,p,food,mood,en,min,keys,extra){
  return Object.assign({id:counterNorm(n).replace(/ /g,'-'),title:n,short:n,price:p,keys,food:food||0,mood:mood||0,en:en||0,min:min||15,kind:'food'},extra||{});
}
function counterOffers(place){
  const k=place.kind,h=k==='hotel'?counterHotel(place.name):null;
  if(k==='hotel'){
    const base=h.price,st=h.style||'classic';
    const comf=Math.round(base*1.35/100)*100,lux=Math.round(base*1.8/100)*100;
    return [
      {id:'std',title:'стандарт',short:'Стандарт',price:base,style:st,def:true,kind:'stay',keys:['стандарт','обычн','эконом','простой']},
      {id:'comf',title:'комфорт',short:'Комфорт',price:comf,style:st==='suite'?'suite':'modern',kind:'stay',keys:['комфорт','полулюкс','улучшен']},
      {id:'lux',title:'люкс',short:'Люкс',price:lux,style:'suite',kind:'stay',keys:['люкс','сьют','suite','президент']}
    ];
  }
  if(k==='cafe'||k==='tea')return [
    counterDish('Чай с чак-чаком',220,15,6,4,15,['чак-чак','чай'],{def:true}),
    counterDish('Капучино и десерт',350,20,8,12,20,['капучино','кофе','десерт']),
    counterDish('Эчпочмак и айран',280,35,5,5,20,['эчпочмак','айран']),
    counterDish('Обед: суп и горячее',550,60,8,6,35,['обед','суп','горячее'])
  ];
  if(k==='bakery')return [
    counterDish('Эчпочмак',90,14,3,2,8,['эчпочмак'],{def:true}),
    counterDish('Булочка и чай',140,16,4,4,10,['булоч','чай','выпеч']),
    counterDish('Пирог с капустой',160,22,4,2,12,['пирог'])
  ];
  if(k==='shawarma')return [
    counterDish('Шаурма классическая',250,48,6,4,12,['классич','шаурм'],{def:true}),
    counterDish('Шаурма острая',280,48,4,4,12,['остр']),
    counterDish('Донер в тарелке',340,52,5,3,18,['донер','тарелк']),
    counterDish('Айран',90,4,2,3,5,['айран'])
  ];
  if(k==='coffee')return [
    counterDish('Эспрессо',140,0,4,10,8,['эспрессо'],{def:true}),
    counterDish('Капучино',220,4,6,8,12,['капучино','кофе']),
    counterDish('Флэт уайт и круассан',390,22,8,8,18,['флэт','круассан']),
    counterDish('Фильтр и чизкейк',420,24,8,6,20,['фильтр','чизкейк','десерт'])
  ];
  if(k==='restaurant')return [
    counterDish('Суп и чай',420,30,5,3,25,['суп'],{def:true}),
    counterDish('Бешбармак',780,55,10,4,40,['бешбармак','горячее']),
    counterDish('Манты и салат',640,45,8,3,30,['манты','салат']),
    counterDish('Чай на двоих',260,6,6,2,15,['чай'])
  ];
  if(k==='bar')return [
    counterDish('Домашний лимонад',250,5,6,3,12,['лимонад'],{def:true}),
    counterDish('Пиво',400,5,12,-4,25,['пиво'],{alc:24}),
    counterDish('Облепиховая настойка',350,2,14,-3,18,['настойк'],{alc:30}),
    counterDish('Крылышки и гренки',450,35,8,2,25,['крылыш','гренк','закуск'])
  ];
  if(k==='shop')return [
    {id:'gro',title:'продукты домой',short:'Продукты',price:220,def:true,kind:'bag',food:20,pantry:1,keys:['продукт','пакет','еда']},
    {id:'bread',title:'хлеб и молоко',short:'Хлеб и молоко',price:140,kind:'bag',food:12,pantry:1,keys:['хлеб','молок']},
    {id:'water',title:'вода',short:'Вода',price:60,kind:'bag',en:4,keys:['вода']}
  ];
  if(k==='market')return [
    {id:'chak',title:'чак-чак',short:'Чак-чак',price:180,def:true,kind:'bag',food:15,mood:3,keys:['чак']},
    {id:'fruit',title:'фрукты',short:'Фрукты',price:220,kind:'bag',food:18,mood:2,keys:['фрукт','яблок','ягод']},
    {id:'tea',title:'листовой чай',short:'Чай',price:160,kind:'bag',mood:2,pantry:1,keys:['чай']}
  ];
  if(k==='pharmacy')return [
    {id:'vit',title:'витамины',short:'Витамины',price:250,def:true,kind:'med',en:10,keys:['витамин']},
    {id:'cold',title:'от простуды',short:'От простуды',price:320,kind:'med',cold:true,en:8,keys:['простуд','лекар','температур','горло']},
    {id:'band',title:'пластырь и бинт',short:'Бинт',price:180,kind:'med',mood:2,keys:['бинт','пластыр','перевяз']}
  ];
  if(k==='hospital')return [
    {id:'exam',title:'осмотр',short:'Осмотр',price:800,def:true,kind:'med',full:true,keys:['осмотр','врач','прием','приём','здоров']},
    {id:'cold',title:'лечение простуды',short:'Простуда',price:450,kind:'med',cold:true,en:15,keys:['простуд','лекар','таблет']}
  ];
  if(k==='bank')return [
    {id:'win',title:'вклад, кредит, страховка',short:'Окно банка',price:0,def:true,kind:'bank',keys:['вклад','кредит','страхов','осаго','каско','счет','счёт','карт','деньг','снят','полож']}
  ];
  if(k==='barber')return [
    {id:'cut',title:'стрижка',short:'Стрижка',price:700,def:true,kind:'mood',mood:12,min:25,keys:['стриж','волос']},
    {id:'beard',title:'борода',short:'Борода',price:500,kind:'mood',mood:6,min:15,keys:['бород','брить']}
  ];
  if(k==='flower')return [
    {id:'bou',title:'букет',short:'Букет',price:900,def:true,kind:'mood',mood:10,keys:['букет','цвет','роз']}
  ];
  if(k==='gym')return [
    {id:'day',title:'разовый абонемент',short:'Зал на сегодня',price:600,def:true,kind:'mood',en:18,mood:6,min:50,keys:['абонем','зал','трен','разовый']}
  ];
  if(k==='theatre')return [
    {id:'tix',title:'билет на спектакль',short:'Билет',price:1200,def:true,kind:'mood',mood:30,min:90,keys:['билет','спект','мест']}
  ];
  if(k==='museum')return [
    {id:'tix',title:'входной билет',short:'Билет',price:400,def:true,kind:'mood',mood:8,min:40,keys:['билет','вход','экскурс']}
  ];
  if(k==='library'||k==='university'||k==='school')return [
    {id:'read',title:k==='library'?'час с книгой':'послушать занятие',short:k==='library'?'Почитать':'Занятие',price:0,def:true,kind:'mood',mood:4,min:k==='library'?40:50,keys:['читать','книг','занят','лекц','посидеть','урок']}
  ];
  if(k==='worship')return [
    {id:'candle',title:'свеча',short:'Свеча',price:100,def:true,kind:'mood',mood:6,min:10,keys:['свеч','постав','помол']}
  ];
  if(k==='metro')return [
    {id:'map',title:'схема линии',short:'Схема',price:0,def:true,kind:'metro',keys:['схем','станц','как доех','куда еха']},
    {id:'fare',title:'проезд',short:'Проезд',price:0,kind:'metro',keys:['проезд','билет','турник','оплат']}
  ];
  if(k==='police')return [
    {id:'rep',title:'заявление',short:'Заявление',price:0,def:true,kind:'police',keys:['заявлен','дтп','краж','происшеств','сообщ','протокол']}
  ];
  return [
    {id:'ask',title:'услуга',short:'Услуга',price:0,kind:'none',keys:['услуг','помог']}
  ];
}
function counterHit(offers,t){
  let best=null,bl=0;
  for(const o of offers)for(const key of o.keys||[]){if(key.length>=3&&t.includes(key)&&key.length>bl){best=o;bl=key.length;}}
  return best;
}
function counterList(offers){return offers.slice(0,4).map(o=>o.price?`${o.short} — ${fmtMoney(o.price)}`:o.short).join(', ');}
function counterPitch(w,place,offers,t){
  const you=counterYou(),list=counterList(offers),nm=place.name;
  const ask=/(какие|что есть|меню|сколько|стоит|почём|почем|услуг|номер|свобод|прайс|что у вас)/.test(t);
  const hi=/привет|салам|сэлам|салэм|здравств|исэн|исен|добр/.test(t);
  if(place.kind==='hotel'){
    const def=offers.find(o=>o.def);
    const tail=def?` Скажете «беру» или «сейчас нужно» — оформляю ${def.title} за ${fmtMoney(def.price)} и провожаю в номер.`:'';
    if(hi&&!ask)return `${you?you+', ':''}здравствуйте. Я ${w.p.name}, ресепшен «${nm}» работает и ночью. Свободно: ${list}.${tail}`;
    return `Сейчас свободно: ${list}. Ночь не помеха, селим сразу.${tail} Кнопки под полем — нажали и уже оплатили.`;
  }
  if(place.kind==='bank')return `${you?you+', ':''}окно свободно. Вклад, кредит и страховка оформляются здесь же. Нажмите «Окно банка» — открою.`;
  if(place.kind==='police'){
    const a=typeof accidents!=='undefined'&&accidents&&accidents[0];
    const now=a?` Сейчас на линии: ${a.kind==='ped'?'сбили пешехода':'ДТП'}${a.road?', '+a.road:''}.`:' В городе по сводке спокойно.';
    return `Дежурный ${w.p.name}. Заявление приму сразу.${now} Скажите «заявление» или нажмите кнопку.`;
  }
  if(place.kind==='metro')return `Проезд — ${typeof METRO!=='undefined'&&METRO.fare?METRO.fare:46} ₽ на турникете у входа. Схему линии могу открыть прямо сейчас.`;
  if(place.kind==='pharmacy'&&player.cold)return `Вижу, простыли. От простуды — ${fmtMoney(320)}, витамины — ${fmtMoney(250)}. Скажете «беру» — отдам лекарство сразу.`;
  const def=offers.find(o=>o.def);
  const tail=def&&def.price?` Без уточнения принесу «${def.short}» за ${fmtMoney(def.price)}.`:(def?' Скажете «да» — сделаем сразу.':'');
  if(hi&&!ask)return `${you?you+', ':''}здравствуйте. Я ${w.p.name}. Сегодня могу: ${list}.${tail}`;
  return `Могу сразу: ${list}.${tail} Назовите, что берёте, или нажмите кнопку — оплата в этот же момент.`;
}
function counterEffect(o){
  if(o.food)player.food=clamp(player.food+o.food,0,100);
  if(o.mood)player.mood=clamp(player.mood+o.mood,0,100);
  if(o.en)player.energy=clamp(player.energy+o.en,0,100);
  if(o.pantry)player.pantry=(player.pantry||0)+o.pantry;
  if(o.alc&&typeof addDrink==='function')addDrink(o.alc,o.title);
  if(o.cold){player.cold=false;}
  if(o.full)player.energy=100;
  if(o.min&&typeof spendTime==='function')spendTime(o.min);
}
function stayTill(min){const day=Math.floor(min/1440),h=(min/60)%24,noon=day*1440+12*60;return h<12?noon:noon+1440;}
function stayLive(){const s=player.stay;if(!s||!s.name||!(s.until>clock.minutes)){if(s)player.stay=null;return null;}return s;}
function staySame(name){const s=stayLive();if(!s)return false;const a=String(s.name).toLowerCase(),b=String(name||'').toLowerCase();return !!b&&(a===b||a.includes(b)||b.includes(a));}
function stayDoor(name,x,y){if(!staySame(name))return null;const s=stayLive();if(Math.hypot((s.x||0)-x,(s.y||0)-y)>80)return null;return {label:`В свой номер · ${s.name}`,run:()=>openOwnRoom()};}
function rememberStay(it,o){player.stay={name:it&&it.name?it.name:'Гостиница',x:player.x,y:player.y,title:o.title||'номер',id:o.id||'std',style:o.style||'classic',until:stayTill(clock.minutes)};if(typeof saveState==='function')saveState();}
function stayWelcome(){const s=stayLive();if(!s||s.fed)return;s.fed=1;player.food=clamp((player.food||0)+42,0,100);player.mood=clamp((player.mood||0)+12,0,100);player.energy=clamp((player.energy||0)+10,0,100);addEvent('В номер принесли ужин и чай. Это входит в стоимость.','say');if(typeof saveState==='function')saveState();}
function openOwnRoom(){const s=stayLive();if(!s)return;
  if(scene==='interior'&&interior&&interior.kind==='hotelroom'&&staySame(interior.name)){setHint('Вы уже в номере. Кровать — поспать.');return;}
  if(scene==='interior'&&typeof exitInterior==='function')exitInterior();
  if(typeof interiorCache!=='undefined')interiorCache.delete('stay:'+s.name+':'+s.id);
  enterInterior({kind:'hotelroom',name:s.name+' · '+(s.title||'номер'),key:'stay:'+s.name+':'+s.id,x:s.x,y:s.y,together:!!(typeof companion!=='undefined'&&companion&&companion.hotelPaid)});
  if(interior&&typeof paintHotelFaces==='function')paintHotelFaces(interior,{n:s.name,style:s.style||'classic',price:0},(typeof companion!=='undefined'&&companion&&companion.hotelPaid)?companion.w:null);
  stayWelcome();
  setHint('Вы в своём номере. Ужин уже здесь, на столе можно добавки. Знакомого позовите: «пошли в номер».');}
function counterEnterStay(it,o){
  const name=it&&it.name?it.name:'Гостиница';
  rememberStay(it,o);
  openOwnRoom();
  setHint('Номер ваш до 12:00. Ужин входит в стоимость. Если выйдете — ключ останется. Знакомого можно позвать в номер.');
}
let counterLock=0;
function counterFulfill(w,place,o){
  const she=counterShe(w);
  const gate=o.kind==='stay'||o.kind==='bank'||(o.kind==='metro'&&o.id==='map');
  if(gate&&Date.now()<counterLock)return 'Секунду, уже оформляю.';
  if(o.kind==='stay'){
    const it=place.it;
    if(staySame(place.name)||staySame(it&&it.name)){
      setTimeout(()=>{if(typeof closeChat==='function'&&typeof chatNpc!=='undefined'&&chatNpc)closeChat();openOwnRoom();},400);
      return 'Ключ уже у вас, второй раз не беру. Провожаю в номер.';
    }
    if(player.money<o.price)return `«${o.short}» — ${fmtMoney(o.price)}. На карте ${fmtMoney(player.money)}, не хватает ${fmtMoney(o.price-player.money)}. Как будет сумма — скажите «беру», оформлю сразу.`;
    player.money-=o.price;
    counterLock=Date.now()+2000;
    addEvent(`«${place.name}»: ${o.title} −${fmtMoney(o.price)}. На карте ${fmtMoney(player.money)}`,'say');
    setTimeout(()=>{if(typeof closeChat==='function'&&typeof chatNpc!=='undefined'&&chatNpc)closeChat();counterEnterStay(it,o);},650);
    return `${she?'Оформляю':'Оформляю'} ${o.title}, ${fmtMoney(o.price)}. Ключ ваш, провожаю в номер. На карте осталось ${fmtMoney(player.money)}.`;
  }
  if(o.kind==='bank'){
    counterLock=Date.now()+1200;
    setTimeout(()=>{if(typeof closeChat==='function'&&chatNpc)closeChat();if(typeof openBank==='function')openBank('bank');},400);
    return 'Открываю окно. Вклад, кредит и страховка — кнопками, деньги списываются сразу.';
  }
  if(o.kind==='metro'){
    if(o.id==='map'&&typeof metroScheme==='function'){counterLock=Date.now()+1200;setTimeout(()=>{if(typeof closeChat==='function'&&chatNpc)closeChat();metroScheme();},400);}
    if(o.id==='fare')return `Турникет берёт ${typeof METRO!=='undefined'&&METRO.fare?METRO.fare:46} ₽ сам, когда спускаетесь. Отсюда билет не нужен — вы уже на станции.`;
    return 'Схему открываю. Первая линия: от «Авиастроительной» до «Дубравной».';
  }
  if(o.kind==='police'){
    const a=typeof accidents!=='undefined'&&accidents&&accidents[0];
    const line=a?`Записала в журнал: ${a.kind==='ped'?'наезд на пешехода':'ДТП'}${a.road?' на '+a.road:''}. Дежурная группа уже на выезде.`:'Заявление приняла. По сводке сейчас тихо, номер обращения оставлю у дежурного.';
    addEvent('Полиция: заявление принято','say');
    return (she?line:line.replace('Записала','Записал').replace('приняла','принял'));
  }
  if(o.price>0){
    if(player.money<o.price)return `«${o.short}» стоит ${fmtMoney(o.price)}. На карте ${fmtMoney(player.money)} — не хватает ${fmtMoney(o.price-player.money)}.`;
    player.money-=o.price;
  }
  counterEffect(o);
  addEvent(`«${place.name}»: ${o.title}${o.price?' −'+fmtMoney(o.price):''}`,'say');
  const left=o.price?` Списала с карты, осталось ${fmtMoney(player.money)}.`:'';
  const done=o.kind==='food'?'Уже несу.':o.kind==='bag'?'Держите.':o.kind==='med'?(o.cold?'Пейте и ложитесь пораньше.':'Держите.'):'Готово.';
  return `«${o.short}»${o.price?' — '+fmtMoney(o.price):''}. ${done}${she?left:left.replace('Списала','Списал')}`;
}
function counterWants(t){return /(беру|берём|берем|хочу|дайте|давайте|оформ|засел|куплю|покупа|оплач|плачу|этот|эту|пожалуйста|снимай|снимите)/.test(t);}
function counterNow(t){return /^(да|ага|угу|беру|давай|давайте|сейчас|сейчас нужно|надо сейчас|оформляйте|заселяйте|заселите)$/.test(t)||/(заселя|оформите|оформляй|сейчас нужн|мне нужен номер|нужна комнат|любой номер|берите номер)/.test(t);}
function counterAsk(t){return /(сколько|какие|есть ли|почём|почем|что у вас|что есть|меню|прайс|свободн|покажи|подскаж)/.test(t);}
function counterReply(w,text){
  const place=counterStaff(w);if(!place)return null;
  const raw=text!=null?text:(function(){const mem=w.p.memory||[];for(let i=mem.length-1;i>=0;i--)if(mem[i].role==='user')return mem[i].content||'';return '';})();
  const t=counterNorm(raw);if(!t)return null;
  const offers=counterOffers(place);
  const hit=counterHit(offers,t);
  if(/(не надо|не нужно|потом|в другой раз|отмена|передумал)/.test(t)&&!counterWants(t))return {reply:'Хорошо, без покупки. Если надумаете — кнопки под полем, оформлю сразу.',action:'none',place:''};
  if(hit&&hit.price>0&&counterAsk(t)&&!counterWants(t))return {reply:`«${hit.short}» — ${fmtMoney(hit.price)}. Скажете «беру ${hit.title}» — спишу и отдам сразу.`,action:'none',place:''};
  if(hit&&(hit.price===0||counterWants(t)||(t.split(' ').length<=4&&!counterAsk(t))))return {reply:counterFulfill(w,place,hit),action:'none',place:''};
  if(!hit&&counterNow(t)){const def=offers.find(o=>o.def&&o.price>0)||offers.find(o=>o.def);if(def)return {reply:counterFulfill(w,place,def),action:'none',place:''};}
  const off=t&&!counterAsk(t)&&!/привет|здравств|салам|номер|меню/.test(t);
  const line=counterPitch(w,place,offers,t);
  return {reply:off?`Я на смене, другие темы после кассы. ${line}`:line,action:'none',place:''};
}
function counterBar(){
  let el=document.getElementById('chatOffers');
  if(!el){el=document.createElement('div');el.id='chatOffers';el.className='row';el.style.cssText='flex-wrap:wrap;gap:6px;justify-content:flex-start';
    const inp=document.getElementById('chatInput');if(inp&&inp.parentElement)inp.parentElement.before(el);}
  return el;
}
function counterButtons(w){
  const bar=counterBar();if(!bar)return;
  const place=w&&counterStaff(w);
  bar.innerHTML='';
  if(!place){bar.hidden=true;return;}
  bar.hidden=false;
  for(const o of counterOffers(place).slice(0,4)){
    const b=document.createElement('button');b.type='button';b.className='btn'+(o.def?' primary':'');
    b.textContent=o.price?`${o.short} · ${fmtMoney(o.price)}`:o.short;
    b.addEventListener('click',()=>counterPress(w,o));
    bar.append(b);
  }
}
function counterPress(w,o){
  if(typeof chatNpc==='undefined'||chatNpc!==w||typeof chatBusy!=='undefined'&&chatBusy)return;
  const place=counterStaff(w);if(!place)return;
  const said=o.price?`беру ${o.title}`:o.short;
  appendMsg('me',said);
  w.p.memory.push({role:'user',content:said});
  const reply=counterFulfill(w,place,o);
  appendMsg('npc',reply);
  w.p.memory.push({role:'assistant',content:reply,counter:1});
  if(w.p.memory.length>16)w.p.memory.splice(0,w.p.memory.length-16);
  counterButtons(w);
}
function counterOnOpen(w){
  if(typeof document==='undefined')return;
  const place=counterStaff(w);
  if(!place){const bar=document.getElementById('chatOffers');if(bar){bar.hidden=true;bar.innerHTML='';}return;}
  counterButtons(w);
  const lbl=document.getElementById('brainLbl');if(lbl)lbl.textContent='на смене: услуга и оплата сразу';
  const greeted=(w.p.memory||[]).some(m=>m.counter);
  if(!greeted){
    const line=counterPitch(w,place,counterOffers(place),'привет');
    appendMsg('npc',line);
    w.p.memory.push({role:'assistant',content:line,counter:1});
  }
}
function counterInstall(){
  if(typeof scriptedThink==='function'){const prev=scriptedThink;scriptedThink=function(w,text){const own=counterReply(w,text);if(own)return own;return prev(w,text);};}
  if(typeof npcThink==='function'){const prev=npcThink;npcThink=async function(w){const own=counterReply(w,null);if(own)return own;return prev.apply(this,arguments);};}
  if(typeof openChat==='function'){const prev=openChat;openChat=function(w){prev(w);counterOnOpen(w);};}
  if(typeof closeChat==='function'){const prev=closeChat;closeChat=function(){const bar=typeof document!=='undefined'&&document.getElementById('chatOffers');if(bar){bar.hidden=true;bar.innerHTML='';}return prev();};}
  if(typeof spotAction==='function'){const prev=spotAction;spotAction=function(f,it){
    if(f&&it&&f.spot==='reception'&&it.kind==='hotel'&&String(it.key||'').indexOf('story:')!==0){
      if(typeof staySame==='function'&&staySame(it.name))return {label:'В свой номер',run:()=>openOwnRoom()};
      const h=counterHotel(it.name),p=h.price;
      return {label:`Снять стандарт · ${fmtMoney(p)}`,run:()=>{
        if(player.money<p){setHint(`Нужно ${fmtMoney(p)}`);return;}
        player.money-=p;addEvent(`«${it.name}»: стандарт −${fmtMoney(p)}`,'say');
        counterEnterStay(it,{id:'std',title:'стандарт',price:p,style:h.style||'classic'});
      }};
    }
    return prev(f,it);
  };}
}
counterInstall();
