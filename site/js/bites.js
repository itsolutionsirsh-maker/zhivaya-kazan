// Шаурма и кофейни Казани. Кухня своя, залы свои. Это не бары и не рестораны.
const BITES=[
  {n:'Ханума халяль',ll:[55.789115,49.116884],kind:'shaw',style:'spit',aka:['ханума баумана'],note:'Баумана, 68. Шаурма и лепёшка, зал небольшой.'},
  {n:'Wаурма · Баумана',ll:[55.789665,49.117525],kind:'shaw',style:'night',late:1,aka:['wаурма баумана 33'],note:'Баумана, 33а. Круглосуточно, окно на улицу.'},
  {n:'Wаурма · Ямашева, 93',ll:[55.826035,49.148936],kind:'shaw',style:'night',late:1,aka:['wаурма ямашева 93'],note:'Ямашева, 93. Ночная точка, шаурма и закрытая пицца.'},
  {n:'Kebaboss',ll:[55.825350,49.152900],kind:'shaw',style:'spit',aka:['kebaboss','кебабосс'],note:'В «XL» на Ямашева. Кебаб на этаже фудкорта.'},
  {n:'Тёрка',ll:[55.818650,49.090550],kind:'shaw',style:'night',aka:['тёрка декабристов'],note:'Декабристов, 85, первый этаж. Шаурма с собой и за стол.'},
  {n:'Kazan kebab · Декабристов',ll:[55.817680,49.100160],kind:'shaw',style:'spit',aka:['kazan kebab декабристов'],note:'Декабристов, 8. Халяль, вертел у стойки.'},
  {n:'Шаурма от Мирзы',ll:[55.836452,49.081268],kind:'shaw',style:'night',late:1,aka:['мирзы','шаурма от мирзы'],note:'Декабристов, 164а. Круглосуточно, север города.'},
  {n:'Shaurma City',ll:[55.792145,49.124322],kind:'shaw',style:'spit',aka:['shaurma city','шаурма сити пушкина'],note:'Пушкина, 29. Шаурма у окна на улицу.'},
  {n:'Wаурма · Сибирский тракт',ll:[55.805917,49.183516],kind:'shaw',style:'night',late:1,aka:['wаурма сибирский'],note:'Сибирский тракт, 9. Круглосуточно, по дороге из центра.'},
  {n:'Wаурма · Мавлютова',ll:[55.745907,49.191778],kind:'shaw',style:'night',late:1,aka:['wаурма мавлютова'],note:'Мавлютова, 41. Горки, шаурма до утра.'},
  {n:'Wаурма · Чуйкова',ll:[55.835124,49.146035],kind:'shaw',style:'night',late:1,aka:['wаурма чуйкова'],note:'Маршала Чуйкова, 56. Север, свет горит ночью.'},
  {n:'Wаурма · Ямашева, 71',ll:[55.826120,49.134800],kind:'shaw',style:'night',late:1,aka:['wаурма ямашева 71'],note:'Ямашева, 71Б. Другой вход, не точка на 93-м.'},
  {n:'Хочу шаурму',ll:[55.783354,49.224018],kind:'shaw',style:'spit',aka:['хочу шаурму бигичева'],note:'Хайдара Бигичева, Азино. Халяль, самса рядом на витрине.'},
  {n:'Исфара',ll:[55.764137,49.174428],kind:'shaw',style:'spit',aka:['исфара даурская'],note:'Даурская, 38, рынок. Шаурма, плов и лагман.'},
  {n:'Шаурма · Зорге',ll:[55.752187,49.203140],kind:'shaw',style:'night',aka:['шаурма зорге 60'],note:'Зорге, 60. Горки, лепёшка и овощи на стойке.'},
  {n:'Шаурма #1 · Чистопольская',ll:[55.817922,49.099902],kind:'shaw',style:'spit',aka:['шаурма 1 чистопольская'],note:'На Чистопольской. Шаурма на углях, не сеть с Баумана.'},
  {n:'Шаурма #1 · Фучика',ll:[55.745180,49.218175],kind:'shaw',style:'night',aka:['шаурма 1 фучика'],note:'Юлиуса Фучика, Горки-2. Вечерняя точка у дороги.'},
  {n:'Kazan kebab · Татарстан',ll:[55.780437,49.113791],kind:'shaw',style:'spit',aka:['kazan kebab татарстан'],note:'Улица Татарстан, у площади Тукая. Халяль.'},
  {n:'Шаурма · Попова',ll:[55.809540,49.181608],kind:'shaw',style:'night',aka:['шаурма попова'],note:'Александра Попова. Клыковка, стойка и вертел.'},
  {n:'Шаурма · Южно-Промышленная',ll:[55.731490,49.093198],kind:'shaw',style:'night',aka:['шаурма южно'],note:'Южно-Промышленная, юг города. Берут с собой.'},
  {n:'Шаурма · Белинского',ll:[55.854024,49.083222],kind:'shaw',style:'spit',aka:['шаурма белинского'],note:'Белинского, Авиастроительный. Обед у вертела.'},
  {n:'Шаурма · Декабристов, 116',ll:[55.829220,49.082383],kind:'shaw',style:'night',aka:['шаурма декабристов 116'],note:'Декабристов, 116. Не точка на 8-м и не «Тёрка».'},
  {n:'Шаурма · Гладилова',ll:[55.806701,49.070780],kind:'shaw',style:'spit',aka:['шаурма гладилова'],note:'Гладилова, Ягодная слобода. Запад города.'},
  {n:'Шаурма · Рахлина',ll:[55.799495,49.246479],kind:'shaw',style:'night',aka:['шаурма рахлина'],note:'Натана Рахлина, Константиновка. Восточная окраина.'},
  {n:'Шаурма · Мира',ll:[55.862975,49.219443],kind:'shaw',style:'spit',aka:['шаурма мира дербышки'],note:'Улица Мира, Дербышки. Далеко от центра, шаурма та же.'},
  {n:'Шаурма · Назарбаева',ll:[55.772793,49.139063],kind:'shaw',style:'night',aka:['шаурма назарбаева'],note:'Назарбаева, 31. Юл Урам, вечерний свет.'},
  {n:'Шаурма · Урицкого',ll:[55.798218,49.058458],kind:'shaw',style:'spit',aka:['шаурма урицкого'],note:'Урицкого, Адмиралтейская слобода. За рекой.'},
  {n:'Донер сити · Адоратского',ll:[55.839700,49.146952],kind:'shaw',style:'night',aka:['донер сити адоратского'],note:'Адоратского. Донер, очередь к вечеру.'},
  {n:'Döner city · Сибирский',ll:[55.805223,49.183976],kind:'shaw',style:'spit',aka:['doner city сибирский'],note:'Сибирский тракт, 7. Рядом ночная Wаурма — это другой вход.'},
  {n:'Hot döner · Бакалейная',ll:[55.832562,49.051373],kind:'shaw',style:'spit',aka:['hot doner бакалейная'],note:'Бакалейная, Левченко. Запад, донер с собой.'},
  {n:'Surf Coffee · Подлужная',ll:[55.802708,49.146025],kind:'coffee',style:'day',aka:['surf подлужная 56'],note:'Подлужная, 56. Светлый зал, кофе и круассан.'},
  {n:'Surf Coffee · Петербургская',ll:[55.781253,49.133162],kind:'coffee',style:'day',aka:['surf петербургская'],note:'На Петербургской. Стойка у окна.'},
  {n:'Surf Coffee · Козина',ll:[55.813715,49.134801],kind:'coffee',style:'day',aka:['surf козина'],note:'Козина, 2. Кофейня, не паб напротив.'},
  {n:'Surf Coffee · Кремлёвская',ll:[55.793506,49.116391],kind:'coffee',style:'cozy',aka:['surf кремлевская'],note:'Кремлёвская, 21. Вечером свет ламп, не бар.'},
  {n:'Surf Coffee · Столбова',ll:[55.785256,49.114105],kind:'coffee',style:'day',aka:['surf столбова'],note:'Николая Столбова, 1. Эспрессо и витрина.'},
  {n:'Surf Coffee · Баумана',ll:[55.787267,49.121127],kind:'coffee',style:'cozy',aka:['surf баумана 86'],note:'Баумана, 86. Кофе у пешеходной.'},
  {n:'Surf Coffee · Павлюхина',ll:[55.768251,49.147066],kind:'coffee',style:'cup',aka:['surf павлюхина'],note:'Павлюхина, у KazanMall. Кофе на вынос и столики.'},
  {n:'Surf Coffee · Шаляпина',ll:[55.770802,49.140156],kind:'coffee',style:'day',aka:['surf шаляпина'],note:'Шаляпина, 26. Юг центра, светлый зал.'},
  {n:'Surf Coffee · Хакима',ll:[55.816938,49.120107],kind:'coffee',style:'day',aka:['surf хакима'],note:'Сибгата Хакима. Ново-Савиновский, утро с восьми.'},
  {n:'Surf Coffee · Муштари',ll:[55.791689,49.134349],kind:'coffee',style:'cozy',aka:['surf муштари'],note:'Муштари, 19. Тихий стол у окна.'},
  {n:'Surf Coffee · Островского',ll:[55.776882,49.138630],kind:'coffee',style:'day',aka:['surf островского 114'],note:'Островского, 114. Дальше пешеходного центра.'},
  {n:'Surf Coffee · Победы',ll:[55.780622,49.213265],kind:'coffee',style:'cup',aka:['surf победы мега'],note:'Победы, 141, «Мега». Кофе у входа в торговый.'},
  {n:'Surf Coffee · Курынова',ll:[55.799403,49.239189],kind:'coffee',style:'day',aka:['surf курынова'],note:'Курынова, Светлая долина. Восточные спальные.'},
  {n:'Surf Coffee · Насыри',ll:[55.781059,49.115792],kind:'coffee',style:'cozy',aka:['surf насыри'],note:'Каюма Насыри. Кофейня у угла, бар «Культ» — соседний вход.'},
  {n:'Surf Coffee · Салимжанова',ll:[55.778821,49.128053],kind:'coffee',style:'day',aka:['surf салимжанова'],note:'Марселя Салимжанова. Небольшая стойка.'},
  {n:'Skuratov · Петербургская',ll:[55.783495,49.129322],kind:'coffee',style:'cozy',aka:['skuratov петербургская 37'],note:'Петербургская, 37. Открываются рано, почти с семи.'},
  {n:'Skuratov · Ершова',ll:[55.796640,49.175800],kind:'coffee',style:'cozy',aka:['skuratov ершова'],note:'Ершова, 62Б. Кофе в том же доме, где мясной ресторан, другой вход.'},
  {n:'Skuratov · Дзержинского',ll:[55.795920,49.115518],kind:'coffee',style:'cozy',aka:['skuratov дзержинского'],note:'Дзержинского, 11А. Тёмный зал и керамика.'},
  {n:'Skuratov · Щапова',ll:[55.791700,49.131475],kind:'coffee',style:'cozy',aka:['skuratov щапова'],note:'Щапова, 14. Кофе, не ресторан «Марусовка» рядом.'},
  {n:'Skuratov · Пушкина',ll:[55.786599,49.120747],kind:'coffee',style:'day',aka:['skuratov пушкина 5'],note:'Пушкина, 5. Утренний эспрессо.'},
  {n:'Coffee Like · Победы',ll:[55.749395,49.208477],kind:'coffee',style:'cup',aka:['coffee like победы'],note:'Проспект Победы, Горки. Кофе с собой и круассан.'},
  {n:'Coffee Like · Ибрагимова',ll:[55.820467,49.095206],kind:'coffee',style:'cup',aka:['coffee like ибрагимова'],note:'Ибрагимова. Севернее центра, белая стойка.'},
  {n:'Coffee Like · Ершова',ll:[55.793887,49.168138],kind:'coffee',style:'cup',aka:['coffee like ершова 29'],note:'Ершова, 29Б. Не скуратовский зал на 62-м.'},
  {n:'Coffee Like · Вишневского',ll:[55.783870,49.150047],kind:'coffee',style:'cup',aka:['coffee like вишневского'],note:'Вишневского, 51. Кофе у дороги на восток.'},
  {n:'Coffee Like · Закиева',ll:[55.776715,49.221129],kind:'coffee',style:'cup',aka:['coffee like закиева'],note:'Закиева, Азино. Утро перед работой.'},
  {n:'Coffee Like · Беломорская',ll:[55.863519,49.085440],kind:'coffee',style:'cup',aka:['coffee like беломорская'],note:'Беломорская, Авиастроительный. Далеко на север.'},
  {n:'Шоколадница · Павлюхина',ll:[55.768565,49.147037],kind:'coffee',style:'cup',aka:['шоколадница павлюхина'],note:'Павлюхина. Десерт и капучино, столики у окна.'},
  {n:'Шоколадница · Чистопольская',ll:[55.818886,49.113232],kind:'coffee',style:'cup',aka:['шоколадница чистопольская'],note:'Чистопольская. Сеть, но зал нормальный, не киоск.'},
  {n:'Cofix · Баумана',ll:[55.788638,49.118697],kind:'coffee',style:'cup',aka:['cofix баумана'],note:'Баумана. Кофе и десерт без белой скатерти.'},
  {n:'Бинхартс · Островского',ll:[55.785021,49.121961],kind:'coffee',style:'cozy',aka:['бинхартс островского'],note:'Островского. Своя обжарка, зал тише сетевого.'}
];
const BITE_STILL={spit:'img/bites/spit.jpg',night:'img/bites/night.jpg',day:'img/bites/day.jpg',cozy:'img/bites/cozy.jpg',cup:'img/bites/cup.jpg'};
const biteImg={};
function biteNorm(s){return String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[«»"'’.,!?·#]/g,'').replace(/\s+/g,' ').trim();}
function biteByName(name){const n=biteNorm(name);if(!n)return null;
  return BITES.find(b=>biteNorm(b.n)===n||(b.aka||[]).some(a=>{const x=biteNorm(a);return x.length>=8&&n.includes(x);}))||null;}
function bitePaint(it,style){const im=biteImg[style]||biteImg.day;if(!it||!im)return;
  const draw=()=>{if(!im.width||interior!==it)return;const c=document.createElement('canvas');c.width=1280;c.height=720;const g=c.getContext('2d');
    const s=Math.max(1280/im.width,720/im.height),dw=im.width*s,dh=im.height*s;g.drawImage(im,(1280-dw)/2,(720-dh)/2,dw,dh);
    g.fillStyle='rgba(12,14,16,.14)';g.fillRect(0,0,1280,720);it.photoImg=c;if(typeof placeChatLook==='function')placeChatLook();};
  if(im.complete&&im.width)draw();else im.addEventListener('load',draw,{once:true});}
function biteMount(){if(typeof world==='undefined'||!world||!world.meta||!world.pois||biteMount.done)return;biteMount.done=true;
  for(const b of BITES){const xy=llToXY(b.ll);let near=null;
    for(const p of world.pois){if(Math.hypot(p.x-xy[0],p.y-xy[1])<48&&biteByName(p.n)===b)near=p;}
    const adopt=near&&(near.t==='cafe'||near.t==='fast_food'||!near.t);
    if(adopt){near.t='cafe';near.n=b.n;b.x=near.x;b.y=near.y;}
    else{const o={x:xy[0]+(near?14:0),y:xy[1],t:'cafe',n:b.n,st:'',i:(world.pseq=(world.pseq||0)+1)};world.pois.push(o);b.x=o.x;b.y=o.y;}}}
if(typeof buildWorld==='function'){const biteWorld0=buildWorld;buildWorld=function(d){const r=biteWorld0(d);biteMount.done=false;biteMount();return r;};}
if(typeof poiHours==='function'){const biteHours0=poiHours;poiHours=function(p){const b=p&&biteByName(p.n);
  if(b&&b.kind==='shaw')return b.late?{a:0,b:24}:{a:10,b:24};
  if(b&&b.kind==='coffee')return {a:8,b:22};
  return biteHours0(p);};}
if(typeof enterInterior==='function'){const biteIn0=enterInterior;enterInterior=function(src){biteIn0(src);
  if(!(interior&&src&&src.kind==='cafe'))return;const b=biteByName(src.name);if(!b)return;
  bitePaint(interior,b.style);if(b.note)setHint(b.note);};}
(function bitePics(){const L=document.getElementById('loading');if(L&&!L.hidden){setTimeout(bitePics,800);return;}
  setTimeout(()=>{for(const k in BITE_STILL){const im=new Image();im.src=BITE_STILL[k];biteImg[k]=im;}},800);})();
setTimeout(biteMount,2000);
