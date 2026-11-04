// Сетевые магазины, которые уже стоят на карте. Свой зал и своя касса, без новых точек.
const CHAIN_STILL={
  pyat:'img/chains/pyat.jpg',magnit:'img/chains/magnit.jpg',hyper:'img/chains/hyper.jpg',green:'img/chains/green.jpg',
  disc:'img/chains/disc.jpg',fix:'img/chains/fix.jpg',fresh:'img/chains/fresh.jpg',alco:'img/chains/alco.jpg',
  beauty:'img/chains/beauty.jpg',electro:'img/chains/electro.jpg',diy:'img/chains/diy.jpg',
  parcel:'img/chains/parcel.jpg',parcely:'img/chains/parcely.jpg',parcelb:'img/chains/parcelb.jpg',
  toys:'img/chains/toys.jpg',phones:'img/chains/phones.jpg',sport:'img/chains/sport.jpg',shoes:'img/chains/shoes.jpg',beds:'img/chains/beds.jpg'
};
const CHAIN_LOOK={
  pyat:'pyat',fasol:'pyat',magnit:'magnit',monetka:'magnit',
  lenta:'hyper',auchan:'hyper',metro:'hyper',
  perek:'green',euro:'green',verny:'green',
  chizhik:'disc',svet:'disc',fix:'fix',vkus:'fresh',lavka:'fresh',
  kb:'alco',bristol:'alco',alco:'alco',
  mcos:'beauty',beauty:'beauty',perfume:'beauty',
  dns:'electro',mvideo:'electro',eldorado:'electro',citilink:'electro',
  diy:'diy',tools:'diy',
  ozon:'parcelb',wb:'parcel',box:'parcel',lamoda:'parcel',avito:'parcel',mmarket:'parcel',yamarket:'parcely',
  detmir:'toys',sport:'sport',kari:'shoes',phones:'phones',beds:'beds'
};
const CHAIN_H={
  pyat:[8,23],magnit:[8,23],fasol:[8,23],verny:[8,23],perek:[8,23],euro:[8,23],monetka:[8,22],
  lenta:[8,23],auchan:[8,23],metro:[7,23],
  chizhik:[9,22],svet:[9,22],fix:[9,22],vkus:[8,22],lavka:[8,23],
  kb:[10,23],bristol:[10,23],alco:[10,23],
  mcos:[9,22],beauty:[10,21],perfume:[10,22],
  dns:[10,22],mvideo:[10,22],eldorado:[10,22],citilink:[10,22],
  diy:[8,22],tools:[9,21],beds:[10,22],
  ozon:[9,21],wb:[9,21],yamarket:[9,21],box:[9,21],lamoda:[10,22],avito:[10,20],mmarket:[9,21],
  detmir:[10,22],sport:[10,22],kari:[10,22],phones:[10,21]
};
const CHAIN_NOTE={
  pyat:'Пятёрочка. Хлеб у кассы, молоко в холодильнике. Обычно до 23:00.',
  magnit:'Магнит. Зал тесный, касса в конце ряда.',
  lenta:'Лента. Гипермаркет: широкие ряды, вода на палете у входа.',
  auchan:'Ашан. Большой зал, тележку берите сразу.',
  metro:'METRO. Складской зал, палеты и высокие стеллажи.',
  perek:'Перекрёсток. Выпечка у входа, полки пошире, чем в «у дома».',
  euro:'Eurospar. Обычный супермаркет, зелёный зал и хлеб.',
  verny:'Верный. Продукты у дома, касса одна.',
  fasol:'Фасоль. Маленький зал, хлеб и молоко.',
  chizhik:'Чижик. Жёлтые ящики, цены без витрины.',
  svet:'Светофор. Товар на палетах, касса — стол у стены.',
  fix:'Fix Price. Жёлтый зал, мелочь с полки.',
  vkus:'ВкусВилл. Короткий зал, овощи и готовая еда.',
  lavka:'Яндекс.Лавка. Холодильник с готовым, не большой магазин.',
  kb:'Красное & Белое. Бутылки до потолка. Только с 18.',
  bristol:'Бристоль. Пиво и вино с полки. Только с 18.',
  alco:'Алкомаркет. Только с 18.',
  mcos:'Магнит Косметик. Шампунь и крем, не продукты.',
  beauty:'Улыбка радуги. Косметика, касса у зеркала.',
  perfume:'Парфюм. Витрина с флаконами, свет тише.',
  dns:'DNS. Телефоны на столах, кабель у кассы.',
  mvideo:'М.Видео. Стена экранов и столы с техникой.',
  eldorado:'Эльдорадо. Техника в зале, мелочь у кассы.',
  citilink:'Ситилинк. Компьютеры и кабели.',
  diy:'Строительный зал. Доски, краска, крепёж.',
  tools:'Инструменты. Лампочки и крепёж у кассы.',
  ozon:'Ozon. Полки с коробками, выдача по коду.',
  wb:'Wildberries. Коробки на стеллаже, окно выдачи.',
  yamarket:'Яндекс.Маркет. Жёлтые полки, пакет по номеру.',
  box:'Boxberry. Небольшой пункт, коробки у стены.',
  lamoda:'Lamoda. Выдача и возврат, не продуктовый.',
  avito:'Авито. Стойка выдачи, не полки с едой.',
  mmarket:'Магнит Маркет. Пункт выдачи, не продуктовый зал.',
  detmir:'Детский мир. Игрушки, касса у выхода.',
  sport:'Спортмастер. Обувь на стене, мячи на стойке.',
  kari:'Kari. Обувь по стенам, примерка у скамьи.',
  phones:'Салон связи. Телефоны на стойках, чехол у консультанта.',
  beds:'Askona. Кровати в ряд, можно взять подушку.',
  monetka:'Монетка. Короткий продуктовый зал.'
};
const chainImg={};
function chainNorm(s){return String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[«»"'’]/g,' ').replace(/\s+/g,' ').trim();}
function chainOf(name){
  const n=chainNorm(name);if(!n)return null;
  if(/магнит маркет/.test(n))return 'mmarket';
  if(/магнит космет/.test(n))return 'mcos';
  if(/пятерочк/.test(n))return 'pyat';
  if(/чижик/.test(n))return 'chizhik';
  if(/(^|[^а-я])светофор([^а-я]|$)/.test(n))return 'svet';
  if(/fix[\s-]*price|фикс[\s-]*прайс/.test(n))return 'fix';
  if(/вкусвилл|vkusvill/.test(n))return 'vkus';
  if(/перекрест/.test(n))return 'perek';
  if(/eurospar/.test(n)||n==='spar')return 'euro';
  if(/дом лента/.test(n))return 'diy';
  if(/лента зоо/.test(n))return null;
  if(/(^|[^а-я])лента([^а-я]|$)/.test(n))return 'lenta';
  if(/лемана|леруа/.test(n))return 'diy';
  if(/максидом/.test(n))return 'diy';
  if(/всеинструмент/.test(n))return 'tools';
  if(/askona|аскона/.test(n))return 'beds';
  if(/красное\s*&\s*бел/.test(n)||/красное\s+и\s+бел/.test(n)||n==='красное &')return 'kb';
  if(/бристоль/.test(n))return 'bristol';
  if(/пивоман/.test(n))return 'alco';
  if(/алкодьюти/.test(n))return 'alco';
  if(/бирхофф/.test(n))return 'alco';
  if(/улыбка радуг/.test(n))return 'beauty';
  if(/лэтуаль|л этуаль|л'этуаль/.test(n))return 'perfume';
  if(/рив гош/.test(n))return 'perfume';
  if(/золотое яблоко/.test(n))return 'perfume';
  if(/(^|[^a-z])dns([^a-z]|$)/.test(n)||/(^|[^а-я])днс([^а-я]|$)/.test(n))return 'dns';
  if(/м\.?\s*видео|мвидео/.test(n))return 'mvideo';
  if(/эльдорадо/.test(n))return 'eldorado';
  if(/ситилинк/.test(n))return 'citilink';
  if(/детский мир/.test(n))return 'detmir';
  if(/спортмастер/.test(n))return 'sport';
  if(n==='kari'||n==='кари')return 'kari';
  if(n==='ozon'||/(^|[^a-z])ozon([^a-z]|$)/.test(n))return 'ozon';
  if(n==='wildberries'||/вайлдберриз/.test(n))return 'wb';
  if(/яндекс\.?\s*лавка/.test(n))return 'lavka';
  if(/яндекс\.?\s*маркет/.test(n))return 'yamarket';
  if(/boxberry|боксберри/.test(n))return 'box';
  if(n==='lamoda'||/(^|[^а-я])ламода([^а-я]|$)/.test(n))return 'lamoda';
  if(n==='авито'||/^avito\b/.test(n))return 'avito';
  if(/(^|[^а-я])мтс([^а-я]|$)/.test(n))return 'phones';
  if(/(^|[^а-я])билайн([^а-я]|$)/.test(n))return 'phones';
  if(/(^|[^а-я])мегафон([^а-я]|$)/.test(n))return 'phones';
  if(/теле2|tele2/.test(n)||n==='т2')return 'phones';
  if(/магнит у дома|магнит моя цена/.test(n)||n==='магнит'||/(^|[^а-я])магнит([^а-я]|$)/.test(n))return 'magnit';
  if(/верный друг/.test(n))return null;
  if(n==='верный'||n==='верный универсам')return 'verny';
  if(n==='фасоль')return 'fasol';
  if(/монетк/.test(n))return 'monetka';
  if(n==='ашан'||/(^|[^а-я])ашан([^а-я]|$)/.test(n))return 'auchan';
  if(n==='metro')return 'metro';
  return null;
}
function chainAdultShop(name){const id=chainOf(name);return id==='kb'||id==='bristol'||id==='alco';}
function chainGrown(){if(typeof barAdult==='function')return barAdult();try{return localStorage.getItem('zk.bar18')==='1';}catch(e){return false;}}
function chainRemember(){if(typeof barRemember==='function'){barRemember();return;}try{localStorage.setItem('zk.bar18','1');}catch(e){}}
function chainAsk(src,go){
  if(typeof sitCard!=='function'){go();return;}
  const name=src&&src.name?src.name:'Магазин';
  sitCard({icon:'🛒',title:'На входе спрашивают',text:`«${name}». Сюда только с 18 лет. Вам точно есть?`,ttl:0,choices:[
    {t:'Да, есть 18',primary:true,run:()=>{chainRemember();go();}},
    {t:'Нет, нет 18',run:()=>{setHint('Без 18 лет в этот магазин не пускают.');addEvent(`«${name}»: не пустили — нет 18.`,'say');}}
  ]});}
function chainPaint(it,id){const style=CHAIN_LOOK[id];const im=style&&chainImg[style];if(!it||!im)return;
  const draw=()=>{if(!im.width||interior!==it)return;const c=document.createElement('canvas');c.width=1280;c.height=720;const g=c.getContext('2d');
    const s=Math.max(1280/im.width,720/im.height),dw=im.width*s,dh=im.height*s;g.drawImage(im,(1280-dw)/2,(720-dh)/2,dw,dh);
    g.fillStyle='rgba(16,18,16,.16)';g.fillRect(0,0,1280,720);it.photoImg=c;if(typeof placeChatLook==='function')placeChatLook();};
  if(im.complete&&im.width)draw();else im.addEventListener('load',draw,{once:true});}
function chainEnter(src){chainIn0(src);
  if(!(interior&&src&&src.kind==='shop'))return;
  const id=chainOf(src.name);if(!id||!CHAIN_LOOK[id])return;
  chainPaint(interior,id);if(CHAIN_NOTE[id])setHint(CHAIN_NOTE[id]);}
let chainIn0=function(){};
if(typeof enterInterior==='function'){chainIn0=enterInterior;enterInterior=function(src){
  if(src&&src.kind==='shop'&&chainAdultShop(src.name)&&!chainGrown()){chainAsk(src,()=>chainEnter(src));return;}
  chainEnter(src);};}
if(typeof poiHours==='function'){const chainHours0=poiHours;poiHours=function(p){
  const id=p&&p.t==='shop'?chainOf(p.n):null;const h=id&&CHAIN_H[id];
  if(h){if((id==='pyat'||id==='magnit')&&((p.i||0)%8===0))return {a:0,b:24};return {a:h[0],b:h[1]};}
  return chainHours0(p);};}
if(typeof poiAction==='function'){const chainPoi0=poiAction;poiAction=function(poi){
  const a=chainPoi0(poi);
  if(poi&&poi.t==='shop'&&a&&chainAdultShop(poi.n)&&!chainGrown()&&!/закрыт/i.test(a.label||''))a.label+=' · с 18 лет';
  return a;};}
function chainItem(id,title,short,price,keys,extra){
  return Object.assign({id,title,short,price,def:false,kind:'bag',keys,food:0,mood:0,en:0,min:8},extra||{});}
function chainOffers(id){
  const gro=()=>[
    chainItem('bread','хлеб и молоко','Хлеб и молоко',140,['хлеб','молок'],{def:true,food:12,pantry:1}),
    chainItem('bag','продукты домой','Продукты',280,['продукт','пакет','еда'],{food:22,pantry:1}),
    chainItem('ready','готовая еда','Готовая еда',190,['готов','обед'],{food:28,mood:2,min:10}),
    chainItem('water','вода','Вода',70,['вода'],{en:4,min:4})
  ];
  if(id==='pyat'||id==='magnit'||id==='fasol'||id==='verny'||id==='monetka'||id==='perek'||id==='euro')return gro();
  if(id==='lenta'||id==='auchan'||id==='metro')return [
    chainItem('bread','хлеб и молоко','Хлеб и молоко',130,['хлеб','молок'],{def:true,food:12,pantry:1}),
    chainItem('big','большая закупка','Большая закупка',760,['закуп','тележ','больш'],{food:34,pantry:2,min:20}),
    chainItem('veg','овощи','Овощи',210,['овощ','фрукт'],{food:12,mood:2}),
    chainItem('water','ящик воды','Ящик воды',240,['вода','ящик'],{en:8,min:6})
  ];
  if(id==='chizhik'||id==='svet')return [
    chainItem('bread','хлеб','Хлеб',80,['хлеб'],{def:true,food:10,pantry:1}),
    chainItem('grain','крупа и масло','Крупа и масло',150,['круп','масл'],{food:14,pantry:1}),
    chainItem('box','коробка продуктов','Коробка',190,['короб','продукт','набор'],{food:20,pantry:1}),
    chainItem('water','вода','Вода',55,['вода'],{en:4,min:4})
  ];
  if(id==='fix')return [
    chainItem('a','мелочь с полки','Мелочь',99,['мелоч','99'],{def:true,mood:2}),
    chainItem('b','товар с полки','С полки',149,['полк','149'],{mood:2,food:4}),
    chainItem('c','жёлтая корзина','Корзина',249,['корзин','249'],{food:8,mood:3,pantry:1}),
    chainItem('d','бытовая мелочь','Для дома',199,['дом','быт'],{mood:2})
  ];
  if(id==='vkus'||id==='lavka')return [
    chainItem('veg','овощи и зелень','Овощи',240,['овощ','зелен'],{def:true,food:14,mood:3}),
    chainItem('meal','готовое блюдо','Готовое',320,['готов','блюдо','еда'],{food:32,mood:4,min:12}),
    chainItem('milk','молоко','Молоко',140,['молок'],{food:8,pantry:1}),
    chainItem('water','вода','Вода',80,['вода'],{en:4,min:4})
  ];
  if(id==='kb'||id==='bristol'||id==='alco')return [
    chainItem('beer','пиво','Пиво',190,['пиво'],{def:true,alc:16,mood:6,min:10}),
    chainItem('wine','вино','Вино',540,['вино'],{alc:22,mood:8,min:15}),
    chainItem('snack','снеки','Снеки',140,['снек','чипс','рыбк'],{food:8,mood:2}),
    chainItem('water','вода','Вода',70,['вода'],{en:4,min:4})
  ];
  if(id==='mcos'||id==='beauty'||id==='perfume')return [
    chainItem('sham','шампунь','Шампунь',280,['шампун'],{def:true,mood:3}),
    chainItem('cream','крем','Крем',420,['крем'],{mood:4}),
    chainItem('lip','помада','Помада',360,['помад'],{mood:4}),
    chainItem('scent','туалетная вода','Туалетная вода',890,['духи','туалет','аромат'],{mood:6,min:6})
  ];
  if(id==='dns'||id==='mvideo'||id==='eldorado'||id==='citilink')return [
    chainItem('cable','кабель','Кабель',290,['кабел','заряд'],{def:true,mood:2}),
    chainItem('case','чехол','Чехол',490,['чехол'],{mood:2}),
    chainItem('head','наушники','Наушники',1590,['наушник'],{mood:6,min:6}),
    chainItem('mouse','мышь','Мышь',790,['мыш'],{mood:3})
  ];
  if(id==='diy'||id==='tools')return [
    chainItem('bulb','лампочка','Лампочка',160,['ламп'],{def:true,mood:2}),
    chainItem('fix','скотч и крепёж','Крепёж',240,['скотч','креп','гвозд','саморез'],{mood:2}),
    chainItem('paint','банка краски','Краска',690,['крас'],{mood:4,min:10}),
    chainItem('tape','изолента','Изолента',90,['изолен'],{mood:1,min:4})
  ];
  if(id==='ozon'||id==='wb'||id==='yamarket'||id==='box'||id==='lamoda'||id==='avito'||id==='mmarket')return [
    chainItem('pick','забрать посылку','Забрать посылку',0,['посыл','забр','код','выдач'],{def:true,mood:4,min:6}),
    chainItem('back','сдать возврат','Возврат',0,['возврат','сдать'],{mood:2,min:8}),
    chainItem('pack','пакет','Пакет',15,['пакет'],{mood:1,min:2})
  ];
  if(id==='detmir')return [
    chainItem('book','раскраска','Раскраска',180,['раскрас','книж'],{def:true,mood:4}),
    chainItem('plush','мягкая игрушка','Игрушка',590,['игруш','мягк'],{mood:8}),
    chainItem('block','конструктор','Конструктор',890,['конструк'],{mood:8,min:6})
  ];
  if(id==='sport')return [
    chainItem('sock','носки и бутылка','Носки и бутылка',490,['носк','бутыл'],{def:true,mood:3,en:4}),
    chainItem('ball','мяч','Мяч',890,['мяч'],{mood:6}),
    chainItem('shirt','футболка','Футболка',1290,['футболк'],{mood:5})
  ];
  if(id==='kari')return [
    chainItem('insole','стельки','Стельки',250,['стельк'],{def:true,mood:2}),
    chainItem('shoe','кроссовки','Кроссовки',2590,['кроссов','обув','туфл'],{mood:8,min:12})
  ];
  if(id==='phones')return [
    chainItem('glass','стекло и чехол','Стекло и чехол',590,['стекл','чехол'],{def:true,mood:3}),
    chainItem('sim','сим-карта','Сим-карта',150,['сим','тариф'],{mood:2,min:10}),
    chainItem('head','наушники','Наушники',990,['наушник'],{mood:4})
  ];
  if(id==='beds')return [
    chainItem('pillow','подушка','Подушка',1290,['подуш'],{def:true,mood:6,min:6}),
    chainItem('cover','наматрасник','Наматрасник',1990,['наматрас','матрас'],{mood:6,min:8})
  ];
  return null;
}
if(typeof counterPlace==='function'){const chainPlace0=counterPlace;counterPlace=function(){
  const p=chainPlace0();if(p&&p.kind==='shop'){const id=chainOf(p.name);if(id)p.chain=id;}return p;};}
if(typeof counterOffers==='function'){const chainOff0=counterOffers;counterOffers=function(place){
  if(place&&place.chain){const list=chainOffers(place.chain);if(list)return list;}
  return chainOff0(place);};}
(function chainPics(){const L=document.getElementById('loading');if(L&&!L.hidden){setTimeout(chainPics,800);return;}
  setTimeout(()=>{for(const k in CHAIN_STILL){const im=new Image();im.src=CHAIN_STILL[k];chainImg[k]=im;}},900);})();
