// Обычные кафе: тюбетей, бахетле, столовые, блинные и пекарни. Не бары и не кофейни.
const CAFES=[
  {n:'Тюбетей · Университетская',ll:[55.790164,49.123583],h:'day',style:'day',aka:['тюбетей университетская'],note:'Университетская, 22. Кыстыбургер и эчпочмак, чек небольшой.'},
  {n:'Тюбетей · Ямашева',ll:[55.829602,49.118511],h:'day',style:'day',aka:['тюбетей ямашева'],note:'Park House, Ямашева. Столики и детский угол, не ресторан.'},
  {n:'Тюбетей · Баумана',ll:[55.788212,49.120500],h:'day',style:'day',aka:['тюбетей баумана'],note:'Баумана, 47. Татарский стритфуд у пешеходной.'},
  {n:'Тюбетей · Кремлёвская',ll:[55.793720,49.116680],h:'day',style:'day',aka:['тюбетей кремлевская'],note:'Кремлёвская, 21. Кафе в пассаже, кофейня — другой вход.'},
  {n:'Тюбетей · Пушкина',ll:[55.786484,49.122383],h:'day',style:'day',aka:['тюбетей пушкина'],note:'Пушкина, 4. У метро «Площадь Тукая».'},
  {n:'Тюбетей · Зорге',ll:[55.747877,49.210365],h:'day',style:'day',aka:['тюбетей зорге'],note:'Зорге, 66, ТЦ «Олимп». Горки, обед без скатерти.'},
  {n:'Бахетле · Спартаковская',ll:[55.774822,49.138226],h:'day',style:'day',aka:['бахетле спартаковская'],note:'Спартаковская. Выпечка и горячее на подносе, можно сесть.'},
  {n:'Бахетле · Ленинградская',ll:[55.863355,49.085100],h:'day',style:'day',aka:['бахетле ленинградская'],note:'Ленинградская, 27. Авиастроительный, татарская выпечка.'},
  {n:'Бахетле · Павлова',ll:[55.863943,49.104445],h:'day',style:'day',aka:['бахетле павлова'],note:'Академика Павлова, 6А. Второй зал сети на севере.'},
  {n:'Бахетле · Победы',ll:[55.781646,49.210978],h:'day',style:'day',aka:['бахетле победы'],note:'Победы, 141. В «Меге», не кофейня у входа.'},
  {n:'Бахетле · Ершова',ll:[55.792170,49.154136],h:'day',style:'day',aka:['бахетле ершова'],note:'Ершова, 8. Чай и треугольники, светлый зал.'},
  {n:'Бахетле · Чистопольская',ll:[55.818840,49.108246],h:'day',style:'day',aka:['бахетле чистопольская'],note:'Чистопольская. Берут домой и садятся у окна.'},
  {n:'Юрюзань',ll:[55.796196,49.172365],h:'day',style:'day',aka:['юрюзань искра'],note:'Улица Искра, 4. Обычное кафе, суп и чай.'},
  {n:'Лепим и варим',ll:[55.780349,49.212777],h:'day',style:'day',aka:['лепим и варим'],note:'Полушкина, Азино. Пельмени, не ресторан «Пельмения».'},
  {n:'Столовая · Толстого',ll:[55.793634,49.138730],h:'table',style:'tray',aka:['столовая толстого'],note:'Толстого, 8. Обед с подноса, до шести вечера.'},
  {n:'Столовая · Бухарская',ll:[55.774778,49.199923],h:'table',style:'tray',aka:['столовая бухарская'],note:'Бухарская, Азино. Суп, котлета, компот.'},
  {n:'Столовая · Спартаковская',ll:[55.774098,49.141841],h:'table',style:'tray',aka:['столовая спартаковская 111'],note:'Спартаковская, 111. Рабочий обед, без меню на десяти страницах.'},
  {n:'Столовая · Кутуя',ll:[55.785742,49.163295],h:'table',style:'tray',aka:['столовая кутуя'],note:'Аделя Кутуя, 2. Клыковка, комплекс до вечера.'},
  {n:'Столовая · Тукая',ll:[55.774605,49.119637],h:'table',style:'tray',aka:['столовая тукая'],note:'Габдуллы Тукая. Ближе к слободе, поднос и хлеб.'},
  {n:'Столовая · Ижевская',ll:[55.863684,49.118928],h:'table',style:'tray',aka:['столовая ижевская'],note:'Ижевская, Соцгород. Северная столовая у заводов.'},
  {n:'Добропек · Кутуя',ll:[55.787622,49.170071],h:'bake',style:'tea',aka:['добропек кутуя'],note:'Кутуя, 7. Свежий хлеб и эчпочмак.'},
  {n:'Колобок',ll:[55.830517,49.093109],h:'bake',style:'tea',aka:['колобок ибрагимова'],note:'Ибрагимова, 43А. Пекарня, пироги к чаю.'},
  {n:'Жар свежар · Татарстан',ll:[55.776141,49.107542],h:'bake',style:'tea',aka:['жар свежар татарстан'],note:'Улица Татарстан. Выпечка с утра, зал маленький.'},
  {n:'Покровские пекарни · Ямашева',ll:[55.827486,49.121604],h:'bake',style:'tea',aka:['покровские ямашева'],note:'Ямашева. Пироги и чай, не паб.'},
  {n:'Царь-пышка',ll:[55.751484,49.209086],h:'bake',style:'tea',aka:['царь-пышка победы','царь пышка'],note:'Проспект Победы, Горки. Пышки и чай.'},
  {n:'Хлебушко · Ямашева',ll:[55.828390,49.135167],h:'bake',style:'tea',aka:['хлебушко ямашева'],note:'Ямашева. Хлеб и сладкое, столик у витрины.'},
  {n:'Блинная · Федосеевская',ll:[55.803328,49.115624],h:'blin',style:'tea',aka:['блинная федосеевская'],note:'Федосеевская. Блины с маслом, мясом и вареньем.'},
  {n:'Блинная · Шахиди',ll:[55.785010,49.107288],h:'blin',style:'tea',aka:['блинная шахиди'],note:'Бурхана Шахиди. Небольшая блинная у слободы.'},
  {n:'Блинная · Петербургская',ll:[55.779482,49.136469],h:'blin',style:'tea',aka:['блинная петербургская'],note:'Петербургская. Чайник и стопка блинов.'},
  {n:'К чаю · Гаврилова',ll:[55.827385,49.154694],h:'bake',style:'tea',aka:['к чаю гаврилова'],note:'Гаврилова, Савиново. Выпечка к чаю, без белых скатертей.'}
];
const CAFE_STILL={day:'img/cafes/day.jpg',tea:'img/cafes/tea.jpg',tray:'img/cafes/tray.jpg'};
const cafeImg={};
function cafeNorm(s){return String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[«»"'’.,!?·#-]/g,'').replace(/\s+/g,' ').trim();}
function cafeByName(name){const n=cafeNorm(name);if(!n)return null;
  return CAFES.find(b=>cafeNorm(b.n)===n||(b.aka||[]).some(a=>{const x=cafeNorm(a);return x.length>=8&&n.includes(x);}))||null;}
function cafePaint(it,style){const im=cafeImg[style]||cafeImg.day;if(!it||!im)return;
  const draw=()=>{if(!im.width||interior!==it)return;const c=document.createElement('canvas');c.width=1280;c.height=720;const g=c.getContext('2d');
    const s=Math.max(1280/im.width,720/im.height),dw=im.width*s,dh=im.height*s;g.drawImage(im,(1280-dw)/2,(720-dh)/2,dw,dh);
    g.fillStyle='rgba(18,16,12,.12)';g.fillRect(0,0,1280,720);it.photoImg=c;if(typeof placeChatLook==='function')placeChatLook();};
  if(im.complete&&im.width)draw();else im.addEventListener('load',draw,{once:true});}
function cafeMount(){if(typeof world==='undefined'||!world||!world.meta||!world.pois||cafeMount.done)return;cafeMount.done=true;
  for(const b of CAFES){const xy=llToXY(b.ll);let near=null;
    for(const p of world.pois){if(Math.hypot(p.x-xy[0],p.y-xy[1])<48&&cafeByName(p.n)===b)near=p;}
    const adopt=near&&(near.t==='cafe'||near.t==='fast_food'||!near.t);
    if(adopt){near.t='cafe';near.n=b.n;b.x=near.x;b.y=near.y;}
    else{const o={x:xy[0]+(near?14:0),y:xy[1],t:'cafe',n:b.n,st:'',i:(world.pseq=(world.pseq||0)+1)};world.pois.push(o);b.x=o.x;b.y=o.y;}}}
if(typeof buildWorld==='function'){const cafeWorld0=buildWorld;buildWorld=function(d){const r=cafeWorld0(d);cafeMount.done=false;cafeMount();return r;};}
if(typeof poiHours==='function'){const cafeHours0=poiHours;poiHours=function(p){const b=p&&cafeByName(p.n);
  if(b)return b.h==='table'?{a:8,b:18}:b.h==='bake'?{a:8,b:21}:{a:9,b:22};
  return cafeHours0(p);};}
if(typeof enterInterior==='function'){const cafeIn0=enterInterior;enterInterior=function(src){cafeIn0(src);
  if(!(interior&&src&&src.kind==='cafe'))return;const b=cafeByName(src.name);if(!b)return;
  cafePaint(interior,b.style);if(b.note)setHint(b.note);};}
(function cafePics(){const L=document.getElementById('loading');if(L&&!L.hidden){setTimeout(cafePics,800);return;}
  setTimeout(()=>{for(const k in CAFE_STILL){const im=new Image();im.src=CAFE_STILL[k];cafeImg[k]=im;}},900);})();
setTimeout(cafeMount,2200);
