// Квартира: фон от района и класса жилья. Кнопка «Поехать домой».
// Гость заходит в ту же комнату и видит тот же кадр кухни.
const HOME_LOOKS={
  '01':{line:'Высокий этаж у Казанки: кухня и диван, в окне река и Кремль.'},
  '02':{line:'Высокий этаж на Большой Красной: в окне Кул-Шариф.'},
  '03':{line:'Высокий этаж на Ямашева: в окне чаша Казань Арены.'},
  '04':{line:'Верхний этаж у Горок: кухня светлая, за окном кромка леса.'},
  '05':{line:'Вечерний этаж на Чистопольской: Кремль зажигается на юге.'},
  '06':{line:'Дом 1959 года у Кремля: паркет, деревянный стол, крыши напротив.'},
  '07':{line:'Обычная хорошая квартира: белая кухня, за окном парк.'},
  '08':{line:'Средний этаж: кухня и диван, Кремль далеко над крышами.'},
  '09':{line:'Квартира у арены: стадион виден через деревья.'},
  '10':{line:'У старого русла: за окном узкая вода между домами.'},
  '11':{line:'У Кабана: кухня светлая, озеро на том берегу.'},
  '12':{line:'Старый дом у Баумана: низкое окно, красные крыши, лампа.'},
  '13':{line:'Советская кухня, чайник на столе, за окном парк.'},
  '14':{line:'Окна в зелёный двор, кухня и диван рядом.'},
  '15':{line:'Ниже: парк сразу за соседней низкой крышей.'},
  '16':{line:'Дом 1980-х: бежевая кухня, арена далеко в окне.'},
  '17':{line:'Панельный дом: ламинат, кухня вдоль стены, проспект за окном.'},
  '18':{line:'Окна во двор: тише, чем на проезжей части.'},
  '19':{line:'Кирпичный дом с лифтом: стол, диван, закрытый двор.'},
  '20':{line:'Девятиэтажка: маленькая кухня, холодильник, двор напротив.'},
  '21':{line:'Хрущёвка: тесная кухня на двоих и низкий потолок.'},
  '22':{line:'Брежневка: стенка, чайник, линолеум, двор.'},
  '23':{line:'Новая недорогая студия: светлые стены и молодые деревья во дворе.'},
  '24':{line:'Центр, старый дом: деревянный пол, кирпичный двор, тёплая лампа.'}
};
const HOME_FLAT={
  'kremlin-komsomolskaya':'01','mosque-krasnaya':'02','stadium-yamasheva':'03','park-sozidateley':'04',
  'kremlin-chistopolskaya-14':'05','kremlin-kremlyovskaya':'06',
  'park-yaratkan':'07','kremlin-chistopolskaya-12':'08','stadium-chistopolskaya':'09','kremlin-bulachnaya':'08',
  'stadium-gavrilova':'16','park-yamasheva':'07','kazanka-shirokaya':'10','kaban-taktash':'11',
  'park-koroleva':'15','kaban-safyan':'11','park-ostrovskogo':'15','oldtown-pushkina':'12',
  'park-koshevogo':'13','park-marxa':'14',
  'yard-universiady':'17','yard-chuykova':'18','yard-pobedy':'17','yard-yamasheva-92':'18',
  'yard-lukina':'19','yard-tsetkin':'19','yard-yamasheva-79':'18','yard-mira':'19',
  'yard-dementieva':'20','yard-ilicha':'20'
};
const HOME_POOL={
  starotat:['24','12','06','08'],koza:['01','05','08','10'],gorki:['04','07','23','17'],
  azino:['17','23','18'],ametevo:['17','18','23'],savinovo:['03','09','18','17'],
  sotsgorod:['19','13','21','22'],admiralty:['10','19','22'],sukon:['11','14','18'],
  kizicheskaya:['07','18','17'],levchenko:['15','19','22'],gorky:['13','14','24'],
  derbyshki:['21','22','20'],karavaevo:['20','21','19'],yudino:['20','21','22']
};
const HOME_IMG={};
function homeHash(s){let h=2166136261;s=String(s||'');for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function homeAtOf(b){return b?{x:Math.round(b.cx*10)/10,y:Math.round(b.cy*10)/10}:null;}
function homeDoorOf(b){if(!b)return null;let x=b.cx,y=b.cy;if(typeof inBuilding==='function'&&inBuilding(x,y)&&typeof toSidewalk==='function'){const q=toSidewalk(x,y);if(q){x=q[0];y=q[1];}}return {x,y};}
function homeKeyNow(){
  if(player.flat)return 'home:'+player.flat;
  const b=player.home;if(!b)return 'home';
  return 'home:b:'+Math.round(b.cx)+'_'+Math.round(b.cy);
}
function homeRoomName(key){
  const id=String(key||'');
  if(id.startsWith('home:')&&!id.startsWith('home:b:')){const f=typeof flatById==='function'?flatById(id.slice(5)):null;if(f)return f.title;}
  return 'Квартира';
}
function homeDistrictAt(x,y){
  const ds=window.cityDistricts||[];if(!ds.length||typeof llToXY!=='function')return '';
  let best='',bd=1800;
  for(const d of ds){if(!Array.isArray(d.center)||d.kind==='admin')continue;const q=llToXY(d.center);const dd=Math.hypot(q[0]-x,q[1]-y);if(dd<bd){bd=dd;best=d.id;}}
  return best;
}
function homeLookId(key,at){
  const id=String(key||'');
  if(id.startsWith('home:')&&!id.startsWith('home:b:')){const f=id.slice(5);if(HOME_FLAT[f])return HOME_FLAT[f];}
  const pool=HOME_POOL[homeDistrictAt(at&&at.x,at&&at.y)]||['21','22','23','24','18','19'];
  return pool[homeHash(id)%pool.length];
}
function homePaint(it){
  if(!it||it.kind!=='home')return;
  const at=it.venueAt||(player.home?homeAtOf(player.home):null);
  const id=homeLookId(it.key,at);it.homeLook=id;it.venueAt=at||it.venueAt;
  const im=HOME_IMG[id];
  const apply=()=>{if(!im||!im.naturalWidth)return;it.photoImg=im;if(typeof placeChatLook==='function')placeChatLook();};
  if(im&&im.complete&&im.naturalWidth)apply();
  else if(im)im.addEventListener('load',()=>{if(interior===it)apply();},{once:true});
}
function homeSeat(it,right){
  if(!it)return;
  player.ix=right?4.6:2.2;player.iy=Math.max(1.4,it.h-1.9);player.ihx=right?-1:1;player.ihy=0;
}
function homeEnterOwn(){
  const b=player.home;if(!b||typeof enterInterior!=='function')return;
  const key=homeKeyNow(),at=homeAtOf(b);
  enterInterior({kind:'home',name:homeRoomName(key),key,venueAt:at,x:player.x,y:player.y});
}
function homeGo(){
  if(typeof scene!=='undefined'&&scene!=='city'){setHint('Сначала выйдите на улицу');return;}
  if(player.inside){setHint('Сначала выйдите из здания');return;}
  if(player.flat&&!player.home&&typeof housingResolve==='function')housingResolve();
  if(!player.home){setHint('Своего дома ещё нет. В 💼 «Работа и жильё» можно снять квартиру');return;}
  const door=homeDoorOf(player.home);
  if(dist(player.x,player.y,door.x,door.y)<18||dist(player.x,player.y,player.home.cx,player.home.cy)<Math.max(22,((player.home.bb[2]-player.home.bb[0])||20)/2+8)){homeEnterOwn();return;}
  player.goingHome=true;HOME_TRIP.idle=0;
  const dest={x:door.x,y:door.y,n:'Домой · '+homeRoomName(homeKeyNow())};
  addEvent('Едете домой. У подъезда откроется ваша квартира: кухня и комната.');
  setHint('Пешком, такси, автобус или своя машина — как удобнее');
  if(typeof openRouteModal==='function')openRouteModal(dest);
  else if(typeof startWalkNav==='function')startWalkNav(dest);
}
(function(){const b=document.getElementById('homeBtn');if(b)b.addEventListener('click',()=>{if(typeof homeGo==='function')homeGo();});})();
const HOME_TRIP={idle:0};
function homeNearEnough(){
  const b=player.home;if(!b)return false;
  const door=homeDoorOf(b);
  const half=b.bb?Math.max((b.bb[2]-b.bb[0])/2+10,(b.bb[3]-b.bb[1])/2+10):18;
  return dist(player.x,player.y,door.x,door.y)<18||dist(player.x,player.y,b.cx,b.cy)<Math.max(26,half);
}
function homeTryArrive(dt){
  if(!player.goingHome||!player.home)return;
  if(player.inside){player.goingHome=false;HOME_TRIP.idle=0;return;}
  const traveling=!!(player.navDest||(player.waypoints&&player.waypoints.length)||player.vehicle||player.bus||player.busy);
  if(!homeNearEnough()||player.vehicle||player.bus||player.busy){
    if(traveling)HOME_TRIP.idle=0;else HOME_TRIP.idle+=(typeof dt==='number'?dt:0.016);
    if(HOME_TRIP.idle>28)player.goingHome=false;
    return;
  }
  player.goingHome=false;HOME_TRIP.idle=0;
  if(typeof companion!=='undefined'&&companion&&companion.homeVisit&&typeof maybeEnterHomeTogether==='function'){maybeEnterHomeTogether();if(player.inside)return;}
  homeEnterOwn();
}
let homeSatKey='';
function homeSitWithGuest(){
  if(scene!=='interior'||!interior||interior.kind!=='home'){homeSatKey='';return;}
  if(player.iwp)return;
  const ids=[];
  if(typeof peerRender!=='undefined'&&typeof sharedPeerHere==='function'){
    for(const pr of peerRender.values())if(sharedPeerHere(pr))ids.push(pr.key);
  }
  if(!ids.length){homeSatKey='';return;}
  ids.sort();const key=ids.join(',');
  if(homeSatKey===key)return;
  homeSatKey=key;
  if(interior.guestOf)return;
  homeSeat(interior,false);
  setHint('Гость уже в квартире. Подойдите и нажмите E — написать.');
}
function homeGuestAction(){
  if(typeof peerRender==='undefined'||player.inside||!peerRender)return null;
  const mine=player.home?homeKeyNow():'';
  let best=null,bd=22;
  for(const pr of peerRender.values()){
    if(!pr.ho||!pr.hk||pr.hk===mine)continue;
    const d=dist(pr.ho[0],pr.ho[1],player.x,player.y);
    if(d<bd){bd=d;best=pr;}
  }
  if(!best)return null;
  const nm=best.name||'игрока';
  return {label:`Зайти в гости к ${nm}`,run:()=>{
    enterInterior({kind:'home',name:best.hn||homeRoomName(best.hk),key:best.hk,venueAt:{x:best.ho[0],y:best.ho[1]},guestOf:nm,x:player.x,y:player.y});
  }};
}
function homeInviteAction(){
  if(player.inside||!player.home||typeof peerRender==='undefined')return null;
  let best=null,bd=3.4;
  for(const pr of peerRender.values()){
    if(pr.b||pr.room)continue;
    const d=dist(pr.x,pr.y,player.x,player.y);
    if(d<bd){bd=d;best=pr;}
  }
  if(!best)return null;
  const nm=best.name||'игрока';
  return {label:`Позвать ${nm} в гости`,run:()=>{
    const title=homeRoomName(homeKeyNow());
    const text=`Заходи в гости: ${title}. У подъезда будет «Зайти в гости» — увидишь ту же кухню.`;
    if(typeof netSend==='function'&&best.key)netSend(best.key,text);
    addEvent(`Вы позвали ${nm} домой. В квартире один и тот же кадр, можно сесть рядом и написать.`);
    setHint(`${nm} увидит эту же квартиру`);
  }};
}
function mountHomeButton(){
  if(document.getElementById('homeGoBtn'))return;
  const host=document.getElementById('routeBtn')||document.getElementById('jobsBtn');
  if(!host||!host.parentElement)return;
  const b=document.createElement('button');b.className='btn';b.id='homeGoBtn';b.type='button';b.title='Поехать домой';b.textContent='🏠';b.style.fontSize='16px';
  b.onclick=homeGo;host.parentElement.insertBefore(b,host);
}
if(typeof housingHomeKey==='function'){housingHomeKey=function(){return homeKeyNow();};}
if(typeof enterInterior==='function'){const homeEnter0=enterInterior;enterInterior=function(src){
  if(src&&src.kind==='home'&&!src.guestOf&&player.home){
    const key=src.key&&String(src.key).startsWith('home:')?src.key:homeKeyNow();
    src=Object.assign({},src,{key,name:homeRoomName(key),venueAt:src.venueAt||homeAtOf(player.home)});
  }
  const it0=homeEnter0(src);
  if(interior&&interior.kind==='home'){
    interior.guestOf=src&&src.guestOf||'';
    if(src&&src.venueAt)interior.venueAt=src.venueAt;
    homePaint(interior);
    const together=src&&src.together;
    if(!together)homeSeat(interior,!!interior.guestOf);
    const look=HOME_LOOKS[interior.homeLook]||HOME_LOOKS['21'];
    if(interior.guestOf){setHint(`Квартира ${interior.guestOf}: тот же кадр, что у хозяина. E — написать.`);addEvent(`Вы в гостях. ${look.line}`);}
    else if(!together){setHint('Вы дома. Если позовёте игрока, он увидит эту же квартиру.');addEvent(look.line);}
  }
  return it0;
};}
if(typeof paintHomeTogether==='function'){paintHomeTogether=function(it){homePaint(it||interior);};}
if(typeof buildPresence==='function'){const homePres0=buildPresence;buildPresence=function(){
  const p=homePres0();
  if(player.home){const at=homeAtOf(player.home),key=homeKeyNow();p.hk=key.slice(0,48);p.ho=[at.x,at.y];p.hn=homeRoomName(key).slice(0,80);}
  return p;
};}
if(typeof syncPeers==='function'){const homeSync0=syncPeers;syncPeers=function(list){
  homeSync0(list);
  for(const p of list||[]){const pr=peerRender.get(p.peer);if(!pr||!p.presence)continue;
    pr.hk=typeof p.presence.hk==='string'?p.presence.hk.slice(0,48):'';
    pr.hn=typeof p.presence.hn==='string'?p.presence.hn.slice(0,80):'';
    const ho=p.presence.ho;pr.ho=Array.isArray(ho)&&Number.isFinite(+ho[0])&&Number.isFinite(+ho[1])?[+ho[0],+ho[1]]:null;
  }
};}
if(typeof currentAction==='function'){const homeAct0=currentAction;currentAction=function(){
  const g=homeGuestAction();
  if(g){const mine=player.home?dist(player.home.cx,player.home.cy,player.x,player.y):1e9;if(mine>14)return g;}
  const a=homeAct0();if(a)return a;
  return g||homeInviteAction();
};}
if(typeof defWatch==='function')defWatch(dt=>{homeTryArrive(dt);homeSitWithGuest();});
const homeCancel=document.getElementById('tripCancel');
if(homeCancel)homeCancel.addEventListener('click',()=>{player.goingHome=false;});
(function homePics(){const L=document.getElementById('loading');if(L&&!L.hidden){setTimeout(homePics,800);return;}
  setTimeout(()=>{for(const id of Object.keys(HOME_LOOKS)){const im=new Image();im.src='img/homes/'+id+'.jpg';HOME_IMG[id]=im;}},600);
})();
mountHomeButton();
setTimeout(mountHomeButton,1600);
