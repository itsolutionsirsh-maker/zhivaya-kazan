// Бары и пабы Казани. Вход только с 18: охрана спрашивает каждый раз, пока не подтвердили.
const BARS=[
  {n:'БирШтрассе',ll:[55.791577,49.115256],style:'pub',aka:['бирштрассе','бирштрассе'],note:'Немецкий паб на Профсоюзной. Краны вдоль стойки, свет тёплый.'},
  {n:'Top Hop',ll:[55.792949,49.109892],style:'pub',aka:['top hop','топ хоп','топхоп'],note:'На Баумана. Крафт на кранах, высокие столы.'},
  {n:'Дублин',ll:[55.786647,49.119683],style:'pub',aka:['дублин','dublin'],note:'Ирландский паб на Островского. Дерево и медные краны.'},
  {n:"Harat's Pub",ll:[55.819812,49.104039],style:'pub',aka:['harat','харат','харатс'],note:'На Чистопольской. Паб, экраны тихие, если нет матча.'},
  {n:'Cernovar',ll:[55.79095,49.11655],style:'pub',aka:['cernovar','черновар','церновар'],note:'На Профсоюзной, рядом с «Солью». Пивной зал.'},
  {n:'Бирхаус',ll:[55.789226,49.116111],style:'pub',aka:['бирхаус','beerhouse'],note:'На Астрономической. Длинная стойка и тёплый свет.'},
  {n:'Brew Barrel',ll:[55.789015,49.114093],style:'pub',aka:['brew barrel','брю баррел','брюбаррел'],note:'На Островского. Бочки, краны, без спешки.'},
  {n:'Старый Амбар',ll:[55.826512,49.099086],style:'pub',aka:['старый амбар','ямшева'],note:'На Ямашева. Простой паб: дерево и стойка.'},
  {n:'Старый Амбар на Кутуя',ll:[55.786513,49.170382],style:'pub',aka:['амбар на кутуя','кутуя'],note:'Второй «Амбар», на Аделя Кутуя. Тот же дух, другой район.'},
  {n:'5 Green Bottles',ll:[55.813405,49.136269],style:'pub',aka:['5 green','green bottles','козина'],note:'На Козина. Крафт и кухня, зал светлый.'},
  {n:'5 Green Bottles · Ахмерова',ll:[55.797544,49.180303],style:'pub',aka:['ахмерова','грин ботлс ахмер'],note:'Второй зал сети, на Разведчика Ахмерова.'},
  {n:'Гадкий Койот',ll:[55.791990,49.112851],style:'cocktail',aka:['койот','coyote'],note:'На Баумана. Тёмный зал, стойка и неон.'},
  {n:'More',ll:[55.797642,49.111412],style:'cocktail',aka:['more','мор бар','мор'],note:'На Карла Маркса. Коктейли, низкий свет, работает допоздна.'},
  {n:'Штофъ',ll:[55.792725,49.111324],style:'cocktail',aka:['штоф','штофъ'],note:'На Баумана. Короткая стойка и полки с бутылками.'},
  {n:'ReLab',ll:[55.792917,49.112000],style:'cocktail',aka:['relab','релаб'],note:'Рядом со «Штофомъ». Коктейльный зал, тихо говорят.'},
  {n:'Гудини',ll:[55.792026,49.111771],style:'cocktail',aka:['гудини','houdini'],note:'На Баумана. Барная стойка и приглушённый свет.'},
  {n:'Культ',ll:[55.781246,49.115465],style:'cocktail',aka:['культ','cult'],note:'На Каюма Насыри. Небольшой зал, стойка у стены.'},
  {n:'ТупоБар',ll:[55.794776,49.125623],style:'cocktail',aka:['тупобар','typo','тупо бар'],note:'На Пушкина. Коктейли, без ресторанной суеты.'},
  {n:'Kommunalka',ll:[55.792391,49.113296],style:'cocktail',aka:['kommunalka','коммуналка'],note:'На Профсоюзной. Общий стол и стойка.'},
  {n:'Соль',ll:[55.791221,49.116037],style:'cocktail',aka:['соль бар','бар соль'],note:'На Профсоюзной. Вечером здесь бар, не столовая.'},
  {n:'Цех',ll:[55.795275,49.123019],style:'cocktail',aka:['цех бар','бар цех'],note:'На Дзержинского. Тёмный зал, как мастерская.'},
  {n:'Wine Me',ll:[55.792075,49.109578],style:'wine',aka:['wine me','вайн ми','винми'],note:'На Чернышевского. Вино, тихие столы, без крика.'},
  {n:'Приют Холостяка',ll:[55.790633,49.107354],style:'lounge',aka:['приют холостяка','приют'],note:'На Чернышевского. Низкие диваны и тёплый свет.'},
  {n:'Shab Lounge',ll:[55.779198,49.135910],style:'lounge',aka:['shab','шаб'],note:'На Туфана Миннуллина. Лаунж: диваны, не стойка у входа.'},
  {n:'Тринити',ll:[55.790671,49.110306],style:'lounge',aka:['тринити','trinity'],note:'У Мусы Джалиля. Вечерний зал, свет низкий.'},
  {n:'Марусовка',ll:[55.792186,49.132702],style:'lounge',aka:['марусовка'],note:'На Щапова. Тише, чем паб: диваны и маленькие столы.'},
  {n:'Бар «Корстон»',ll:[55.793839,49.149547],style:'lounge',aka:['корстон'],note:'В «Корстоне» на Ершова. Лаунж отеля, город за окном.'},
  {n:'Бар «Ривьера»',ll:[55.814839,49.131003],style:'lounge',aka:['ривьера бар','бар ривьера'],note:'В комплексе «Ривьера». Диваны и вечерний свет.'},
  {n:'Бар на «Казань Арене»',ll:[55.823123,49.164024],style:'sport',aka:['казань арена','арена бар','фан-бар'],note:'У стадиона. Экраны на матч, длинные столы.'},
  {n:'Мангал',ll:[55.747213,49.200942],style:'pub',aka:['мангал'],note:'Гриль-бар на проспекте Победы. Вечером здесь как в пабе.'}
];
const BAR_STILL={pub:'img/bars/pub.jpg',cocktail:'img/bars/cocktail.jpg',lounge:'img/bars/lounge.jpg',sport:'img/bars/sport.jpg',wine:'img/bars/wine.jpg'};
const barImg={};
function barNorm(s){return String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[«»"'’.,!?·]/g,'').replace(/\s+/g,' ').trim();}
function barByName(name){const n=barNorm(name);if(!n)return null;
  return BARS.find(b=>barNorm(b.n)===n||(barNorm(b.n).length>=5&&n.includes(barNorm(b.n)))||(b.aka||[]).some(a=>{const x=barNorm(a);return x.length>=4&&n.includes(x);}))||null;}
function barStyleOf(name){const b=barByName(name);if(b)return b.style;
  const n=barNorm(name);
  if(/спорт|футбол|арен|фан/.test(n))return 'sport';
  if(/вино|wine|штоф|релаб|relab|койот|гудини|культ|тупо|коммунал|вайн/.test(n))return n.includes('лаунж')?'lounge':'cocktail';
  if(/лаунж|lounge|приют|марусов|тринити|корстон|ривьер/.test(n))return 'lounge';
  const h=typeof hashStr==='function'?hashStr(String(name||'')):String(name||'').length;
  return ['pub','cocktail','lounge','wine'][Math.abs(h)%4];}
function barAdult(){try{return localStorage.getItem('zk.bar18')==='1';}catch(e){return false;}}
function barRemember(){try{localStorage.setItem('zk.bar18','1');}catch(e){}}
function barPaint(it,style){const im=barImg[style]||barImg.pub;if(!it||!im)return;
  const draw=()=>{if(!im.width||interior!==it)return;const c=document.createElement('canvas');c.width=1280;c.height=720;const g=c.getContext('2d');
    const s=Math.max(1280/im.width,720/im.height),dw=im.width*s,dh=im.height*s;g.drawImage(im,(1280-dw)/2,(720-dh)/2,dw,dh);
    g.fillStyle='rgba(10,12,14,.22)';g.fillRect(0,0,1280,720);it.photoImg=c;if(typeof placeChatLook==='function')placeChatLook();};
  if(im.complete&&im.width)draw();else im.addEventListener('load',draw,{once:true});}
function barAsk(src,go){
  const name=src&&src.name?src.name:'Бар';
  sitCard({icon:'🍸',title:'На входе спрашивают',text:`«${name}». Вам точно есть 18 лет? Если нет — внутрь нельзя.`,ttl:0,choices:[
    {t:'Да, есть 18',primary:true,run:()=>{barRemember();go();}},
    {t:'Нет, нет 18',run:()=>{setHint('Без 18 лет в бар не пускают.');addEvent(`«${name}»: охрана не пустила — нет 18.`,'say');}}
  ]});}
function barEnter(src){barIn0(src);if(!(interior&&src&&src.kind==='bar'))return;
  barPaint(interior,barStyleOf(src.name));const b=barByName(src.name);if(b&&b.note)setHint(b.note);}
function barMount(){if(typeof world==='undefined'||!world||!world.meta||!world.pois||barMount.done)return;barMount.done=true;
  for(const b of BARS){const xy=llToXY(b.ll);let near=null;
    for(const p of world.pois){if(Math.hypot(p.x-xy[0],p.y-xy[1])<80&&barByName(p.n)===b)near=p;}
    const adopt=near&&(near.t==='bar'||near.t==='pub'||!near.t);
    if(adopt){near.t='bar';near.n=b.n;b.x=near.x;b.y=near.y;}
    else{const o={x:xy[0]+(near?10:0),y:xy[1],t:'bar',n:b.n,st:'',i:(world.pseq=(world.pseq||0)+1)};world.pois.push(o);b.x=o.x;b.y=o.y;}}}
if(typeof buildWorld==='function'){const barWorld0=buildWorld;buildWorld=function(d){const r=barWorld0(d);barMount.done=false;barMount();return r;};}
let barIn0=function(){};
if(typeof enterInterior==='function'){barIn0=enterInterior;enterInterior=function(src){
  if(src&&src.kind==='bar'&&!barAdult()){barAsk(src,()=>barEnter(src));return;}
  barEnter(src);};}
if(typeof poiAction==='function'){const barPoi0=poiAction;poiAction=function(poi){
  const a=barPoi0(poi);
  if(poi&&poi.t==='bar'&&a&&!barAdult()&&!/закрыт/i.test(a.label||''))a.label+=' · с 18 лет';
  return a;};}
(function barPics(){const L=document.getElementById('loading');if(L&&!L.hidden){setTimeout(barPics,800);return;}
  setTimeout(()=>{for(const k in BAR_STILL){const im=new Image();im.src=BAR_STILL[k];barImg[k]=im;}},600);})();
setTimeout(barMount,1600);
