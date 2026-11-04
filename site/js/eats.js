// Рестораны Казани. Это не бары: 18 не спрашивают, кухня с 11 до 23.
const RESTS=[
  {n:'Чирэм',ll:[55.798639,49.106657],style:'tatar',aka:['чирэм','чирем'],note:'На Шейнкмана. Современная татарская кухня, светлый зал.'},
  {n:'Умай',ll:[55.798786,49.110233],style:'tatar',aka:['умай'],note:'На Большой Красной. Татарская кухня, без сувенирной избы.'},
  {n:'Туган авылым',ll:[55.779728,49.134769],style:'tatar',aka:['туган авылым','туган'],note:'На Туфана Миннуллина. Эчпочмаки и длинные столы.'},
  {n:'Татарская усадьба',ll:[55.781096,49.116958],style:'tatar',aka:['татарская усадьба'],note:'На Марджани, 8. Татарский зал, окна на слободу.'},
  {n:'Биляр',ll:[55.784155,49.124752],style:'tatar',aka:['биляр'],note:'На Островского. Горячее и выпечка, зал спокойный.'},
  {n:'Дом чая',ll:[55.783394,49.114820],style:'tatar',aka:['дом чая'],note:'На Парижской Коммуны. Чай и сладкое, столы у окна.'},
  {n:'Пир',ll:[55.774427,49.127250],style:'tatar',aka:['ресторан пир','пир такташ'],note:'На Хади Такташа. Большой зал, подают на компанию.'},
  {n:'Булгар',ll:[55.789187,49.152638],style:'tatar',aka:['булгар'],note:'На Вишневского. Татарская кухня, не в самом центре.'},
  {n:'Кыстыбый',ll:[55.801587,49.133198],style:'tatar',aka:['кыстыбый'],note:'На Подлужной. Кыстыбый и чай, зал небольшой.'},
  {n:'Эчпочмак',ll:[55.779892,49.136201],style:'tatar',aka:['эчпочмак'],note:'На Петербургской. Треугольники с мясом, очередь к обеду.'},
  {n:'Ногай',ll:[55.791470,49.115100],style:'tatar',aka:['ногай'],note:'На Профсоюзной. Татарское горячее, рядом пивной зал — это другой вход.'},
  {n:'Древняя Бухара',ll:[55.792848,49.107602],style:'geo',aka:['древняя бухара','бухара'],note:'На Право-Булачной. Плов и лагман, тёплый зал.'},
  {n:'Рубаи',ll:[55.788762,49.122037],style:'geo',aka:['рубаи'],note:'На Профсоюзной, 23. Восточная кухня, низкий свет.'},
  {n:'Дадиани',ll:[55.792125,49.113969],style:'geo',aka:['дадиани'],note:'На Профсоюзной. Грузинский зал: хинкали и зелень.'},
  {n:'Хинкальная',ll:[55.789107,49.122524],style:'geo',aka:['хинкальная'],note:'На Университетской. Хинкали, без банкета.'},
  {n:'Чайхана Мархаба',ll:[55.793280,49.109990],style:'geo',aka:['мархаба','чайхана мархаба'],note:'На Баумана. Чайхана: плов, чай, общие столы.'},
  {n:'Чайхона №1',ll:[55.768757,49.148385],style:'geo',aka:['чайхона','чайхона 1'],note:'На Газовой, южнее центра. Плов и самса.'},
  {n:'Малабар',ll:[55.799664,49.127951],style:'euro',aka:['малабар','malabar'],note:'На Малой Красной. Индийская кухня, белые скатерти.'},
  {n:'Утка в котелке',ll:[55.795733,49.116750],style:'euro',aka:['утка в котелке'],note:'На Дзержинского. Авторская кухня, тихий зал.'},
  {n:'Hemingway',ll:[55.793248,49.109377],style:'euro',aka:['hemingway','хемингуэй','хемингуэй'],note:'На Баумана. Европейский ужин, свет низкий.'},
  {n:'Branch',ll:[55.795510,49.113190],style:'euro',aka:['branch','бранч'],note:'На Дзержинского, 6Б. Завтраки до обеда и ужин вечером.'},
  {n:'Olio',ll:[55.780008,49.129777],style:'euro',aka:['olio','олио'],note:'На Спартаковской. Итальянское бистро, паста и светлые столы.'},
  {n:'Mathilde',ll:[55.790239,49.106041],style:'euro',aka:['mathilde','матильда'],note:'На Чернышевского. Европейский зал, без крика.'},
  {n:'Панорама',ll:[55.800040,49.133041],style:'euro',aka:['панорама ресторан','ресторан панорама'],note:'На Подлужной. Столы у окон, город виден.'},
  {n:'Рёберная',ll:[55.792481,49.111648],style:'grill',aka:['реберная','рёберная'],note:'На Баумана. Мясо с огня, открытая кухня.'},
  {n:'Шашлыкоff',ll:[55.791683,49.112534],style:'grill',aka:['шашлыкоff','шашлыкофф','шашлыкoff'],note:'На Баумана. Шашлык и горячее, зал простой.'},
  {n:'Горыныч',ll:[55.796267,49.175586],style:'grill',aka:['горыныч'],note:'На Ершова, 62Б. Мясной ресторан, не в пешеходном центре.'},
  {n:'Пельмения',ll:[55.790554,49.114862],style:'day',aka:['пельмения'],note:'На Баумана. Пельмени и бульон, светлый зал.'},
  {n:'Сказка',ll:[55.790336,49.115307],style:'day',aka:['сказка баумана','ресторан сказка'],note:'На Баумана. Семейный зал у окна на улицу.'},
  {n:'Самса',ll:[55.799163,49.250334],style:'day',aka:['самса азино','самса мамадыш'],note:'На Мамадышском тракте, Азино. Самса и чай, без белых скатертей.'}
];
const REST_STILL={tatar:'img/eats/tatar.jpg',grill:'img/eats/grill.jpg',euro:'img/eats/euro.jpg',geo:'img/eats/geo.jpg',day:'img/eats/day.jpg'};
const restImg={};
function restNorm(s){return String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[«»"'’.,!?·]/g,'').replace(/\s+/g,' ').trim();}
function restByName(name){const n=restNorm(name);if(!n)return null;
  return RESTS.find(b=>restNorm(b.n)===n||(restNorm(b.n).length>=5&&n.includes(restNorm(b.n)))||(b.aka||[]).some(a=>{const x=restNorm(a);return x.length>=4&&n.includes(x);}))||null;}
function restStyleOf(name){const r=restByName(name);return r?r.style:'';}
function restPaint(it,style){const im=restImg[style]||restImg.tatar;if(!it||!im)return;
  const draw=()=>{if(!im.width||interior!==it)return;const c=document.createElement('canvas');c.width=1280;c.height=720;const g=c.getContext('2d');
    const s=Math.max(1280/im.width,720/im.height),dw=im.width*s,dh=im.height*s;g.drawImage(im,(1280-dw)/2,(720-dh)/2,dw,dh);
    g.fillStyle='rgba(16,18,16,.16)';g.fillRect(0,0,1280,720);it.photoImg=c;if(typeof placeChatLook==='function')placeChatLook();};
  if(im.complete&&im.width)draw();else im.addEventListener('load',draw,{once:true});}
function restMount(){if(typeof world==='undefined'||!world||!world.meta||!world.pois||restMount.done)return;restMount.done=true;
  for(const b of RESTS){const xy=llToXY(b.ll);let near=null;
    for(const p of world.pois){if(Math.hypot(p.x-xy[0],p.y-xy[1])<70&&restByName(p.n)===b)near=p;}
    const adopt=near&&(near.t==='cafe'||near.t==='restaurant'||!near.t);
    if(adopt){near.t='cafe';near.n=b.n;b.x=near.x;b.y=near.y;}
    else{const o={x:xy[0]+(near?12:0),y:xy[1],t:'cafe',n:b.n,st:'',i:(world.pseq=(world.pseq||0)+1)};world.pois.push(o);b.x=o.x;b.y=o.y;}}}
if(typeof buildWorld==='function'){const restWorld0=buildWorld;buildWorld=function(d){const r=restWorld0(d);restMount.done=false;restMount();return r;};}
if(typeof poiHours==='function'){const restHours0=poiHours;poiHours=function(p){if(p&&p.t==='cafe'&&restByName(p.n))return {a:11,b:23};return restHours0(p);};}
if(typeof enterInterior==='function'){const restIn0=enterInterior;enterInterior=function(src){restIn0(src);
  if(!(interior&&src&&src.kind==='cafe'))return;const s=restStyleOf(src.name);if(!s)return;
  restPaint(interior,s);const b=restByName(src.name);if(b&&b.note)setHint(b.note);};}
(function restPics(){const L=document.getElementById('loading');if(L&&!L.hidden){setTimeout(restPics,800);return;}
  setTimeout(()=>{for(const k in REST_STILL){const im=new Image();im.src=REST_STILL[k];restImg[k]=im;}},700);})();
setTimeout(restMount,1800);
