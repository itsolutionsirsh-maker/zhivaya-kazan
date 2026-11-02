// ДТП крупным планом: у каждого случая свой кадр, не одна и та же картинка.
const SCENE_SHOTS=[
  {id:'nose',src:'img/scenes/nose.jpg',day:1,title:'Лоб в лоб',text:'Две легковушки сошлись на широкой улице, на фоне кремлёвской стены. Бамперы всмятку, белая ДПС с синей полосой уже у обочины.'},
  {id:'rear',src:'img/scenes/rear.jpg',day:1,title:'Догнал на светофоре',text:'Чуть не успел затормозить. Стоят между машинами и смотрят на бампер: царапина есть, люди целы.'},
  {id:'night',src:'img/scenes/night.jpg',night:1,title:'Ночная встреча',text:'Мокрый асфальт у стен Кремля. Белая ДПС с синей полосой и скорая с красным крестом, мигалки в лужах. Проезд сузился.'},
  {id:'rain',src:'img/scenes/rain.jpg',rain:1,title:'На мокрой',text:'Дождь, зонты и две машины, которые не поделили полосу. Скорая стоит на всякий случай, пострадавших не видно.'},
  {id:'snow',src:'img/scenes/snow.jpg',snow:1,title:'Гололёд',text:'Машину снесло в снежный вал. Вторая встала рядом. Зима в городе, все живы, оформление на холоде.'},
  {id:'tram',src:'img/scenes/tram.jpg',day:1,title:'Трамвай и легковушка',text:'Легковушка задела трамвай на путях. Вагон стоит, пассажиры смотрят из салона, водитель уже вышел.'},
  {id:'bus',src:'img/scenes/bus.jpg',day:1,title:'Автобус притёрся',text:'На остановке автобус и легковушка не разъехались. Бампер поцарапан, водители говорят спокойно.'},
  {id:'scooter',src:'img/scenes/scooter.jpg',ped:1,title:'Самокат на переходе',text:'Самокат лежит на зебре, парень сидит на бордюре под пледом. Скорая рядом, крови нет, все на ногах.'},
  {id:'ped',src:'img/scenes/ped.jpg',ped:1,title:'Пешехода задели',text:'Машина встала у стены Кремля. Человека усадили на тротуар, врачи в оранжевом проверяют. Скорая с красной полосой, двери открыты. Дышит ровно.'},
  {id:'taxi',src:'img/scenes/taxi.jpg',day:1,title:'Такси и седан',text:'Мелкая встреча бамперов: жёлтое такси и белая машина. Водители с кофе, спора нет, только обмен телефонами.'},
  {id:'dusk',src:'img/scenes/dusk.jpg',night:1,title:'На закате',text:'Фонари только зажглись, стеклянные башни и кремлёвская стена. На перекрёстке белая ДПС и скорая, люди смотрят с той стороны.'},
  {id:'moto',src:'img/scenes/moto.jpg',day:1,title:'Мотоцикл лёг',text:'Мотоцикл на боку после тихого падения. Водитель в шлеме стоит рядом, белая ДПС с синей полосой уже рядом. Обойтись должно.'},
  {id:'gifnight',src:'img/scenes/night.gif',night:1,title:'Мигалки у Кремля',text:'Ночь, мокрый асфальт. Белая полицейская с синей полосой и скорая с красным крестом стоят у башен. Огни бегают по лужам.'},
  {id:'gifday',src:'img/scenes/arrive.gif',day:1,title:'Скорая подъехала',text:'Две машины сошлись нос в нос. Скорая с красной полосой только встала, ДПС уже на месте, люди на тротуаре отошли.'},
  {id:'gifrain',src:'img/scenes/rain.gif',rain:1,title:'Дождь и зонты',text:'Ливень, машины сошлись на мокрой. Зонты на тротуаре, скорая с красным крестом мигает и никуда не спешит: люди целы.'},
  {id:'gifsnow',src:'img/scenes/snow.gif',snow:1,title:'Унесло в сугроб',text:'Гололёд. Машину тихо снесло в снежный вал. Белая ДПС с синей полосой стоит рядом, синий огонь мигает.'},
  {id:'giftram',src:'img/scenes/tram.gif',day:1,title:'Трамвай встал',text:'Легковушка задела трамвай. Вагон стоит, водитель обходит капот, из окон смотрят пассажиры.'},
  {id:'gifbus',src:'img/scenes/bus.gif',day:1,title:'На остановке',text:'Автобус и легковушка притёрлись у остановки. Водители кивают: бампер жив, ругаться не из-за чего.'},
  {id:'gifscoot',src:'img/scenes/scooter.gif',ped:1,title:'Самокат и плед',text:'Самокат лежит на зебре. Парень сидит на бордюре под пледом, врач в оранжевом рядом, скорая мигает.'},
  {id:'giftaxi',src:'img/scenes/taxi.gif',day:1,title:'Такси чиркнуло',text:'Жёлтое такси и белая машина едва коснулись бамперами. Водители с кофе, спора нет.'},
  {id:'gifmoto',src:'img/scenes/moto.gif',day:1,title:'Мотоцикл на боку',text:'Мотоцикл лежит, водитель в шлеме на ногах и говорит с хозяином машины. ДПС с синей полосой подъезжает.'},
  {id:'gifjam',src:'img/scenes/jam.gif',night:1,title:'Пробка из-за ДТП',text:'Синий час. ДПС и скорая перекрыли полосу у кремлёвской стены, остальные машины ползут в объезд.'}
];
function scenePool(ac){const ped=ac.kind==='ped';const all=SCENE_SHOTS.filter(s=>ped?s.ped:!s.ped);if(!all.length)return SCENE_SHOTS;
  const snow=typeof weather!=='undefined'&&(weather.kind==='snow'||weather.ice);
  const rain=typeof weather!=='undefined'&&weather.kind==='rain';
  const night=typeof isNight==='function'&&isNight();
  const fit=all.filter(s=>snow?s.snow:rain?s.rain:night?s.night:s.day);
  return fit.length&&Math.random()<0.55?fit:all;}
function sceneForAccident(ac){if(ac.shot)return ac.shot;const pool=scenePool(ac);ac.shot=pool[Math.floor(Math.random()*pool.length)];return ac.shot;}
function nearAccident(){if(typeof player==='undefined'||scene!=='city'||player.inside)return null;let best=null,bd=20;
  for(const ac of accidents){if(ac.cleared||ac.medical)continue;const d=dist(ac.x,ac.y,player.x,player.y);if(d<bd){bd=d;best=ac;}}return best;}
let sceneLookAc=null;
function openSceneLook(ac){if(!ac)return;const s=sceneForAccident(ac);sceneLookAc=ac;
  const pic=$('#sceneLookPic');pic.style.backgroundImage=`url("${s.src}")`;
  $('#sceneLookTitle').textContent=s.title+(ac.road?' · '+ac.road:'');
  $('#sceneLookText').textContent=s.text+(ac.reported?' Вы уже помогли на месте.':'');
  const help=$('#sceneLookHelp');help.hidden=!!(ac.reported||ac.playerCar);
  $('#sceneLook').hidden=false;player.busy=true;}
function closeSceneLook(){const m=$('#sceneLook');if(m)m.hidden=true;sceneLookAc=null;if(typeof chatNpc==='undefined'||!chatNpc)player.busy=false;}
function openStreetLook(shot){if(!shot)return;sceneLookAc=null;const pic=$('#sceneLookPic');if(pic)pic.style.backgroundImage=`url("${shot.src}")`;
  $('#sceneLookTitle').textContent=shot.title||'';$('#sceneLookText').textContent=shot.text||'';const help=$('#sceneLookHelp');if(help)help.hidden=true;$('#sceneLook').hidden=false;player.busy=true;}
function sceneHelp(){const ac=sceneLookAc;if(!ac||ac.reported||ac.playerCar){closeSceneLook();return;}
  ac.reported=true;player.mood=clamp(player.mood+12,0,100);addEvent('Вы помогли пострадавшим и дали показания. Настроение +12');closeSceneLook();}
function syncSceneLook(){const b=$('#sceneLookBtn');if(!b)return;const ac=nearAccident();
  if(ac){b.hidden=false;b._ac=ac;b._shot=null;return;}
  const shot=typeof streetLookNow==='function'?streetLookNow():null;b.hidden=!shot;b._ac=null;b._shot=shot||null;}
if(typeof frame==='function'){const frame0=frame;frame=function(now){frame0(now);syncSceneLook();};}
document.addEventListener('click',e=>{const t=e.target;if(!t)return;if(t.id==='sceneLookBtn'){if(t._ac)openSceneLook(t._ac);else if(t._shot)openStreetLook(t._shot);}if(t.id==='sceneLookClose')closeSceneLook();if(t.id==='sceneLookHelp')sceneHelp();});
if(typeof createAccident==='function'){const mk=createAccident;createAccident=function(o){const ac=mk.apply(this,arguments);if(ac)sceneForAccident(ac);return ac;};}
