// ===== Игрок, ввод, HUD, диалоги, цикл =====
const TIME_SCALES=[8,30,1];
const player={x:0,y:0,hx:0,hy:1,phase:0,name:'Гость',desc:'',role:'resident',avatar:null,avatarImg:null,thumb:null,clothes:'#2F9E6B',skin:'#F1D3B5',hair:'#2B1B12',energy:92,food:80,mood:70,money:3000,pantry:0,waypoints:null,home:null,bus:null,waitingStop:null,exitNext:false,busy:false,state:'ok',vehicle:null,talkTarget:null,inside:false,ix:0,iy:0,ihx:0,ihy:-1,iwp:null,hasCar:true,carColor:'#C62828',hurtT:0};
const clock={minutes:8*60+30,scale:8,day:1};
const weather={kind:'clear',ttl:400,rain:[]};
const cam={x:0,y:0,z:5.5,zt:5.5,free:false};let LOD=1;
const keys={};const flags={};
let roomNs=null,sampleFn=null,peers=[],peerRender=new Map();
const feedEl=$('#feed');const feed=[];const FEED_LIFE=7000;
function addEvent(text,kind){const t=fmtTime();feed.unshift({t,text,kind,at:performance.now()});if(feed.length>40)feed.pop();renderFeed();$('#logBtn').classList.add('ping');}
function evEl(e){const d=document.createElement('div');d.className='ev'+(e.kind==='alert'?' alert':e.kind==='rally'?' rally':e.kind==='say'?' say':'');const tm=document.createElement('span');tm.className='tm';tm.textContent=e.t;const tx=document.createElement('span');tx.textContent=e.text;d.append(tm,tx);return d;}
function renderFeed(){const now=performance.now();feedEl.innerHTML='';feed.filter(e=>now-e.at<FEED_LIFE).slice(0,2).forEach(e=>feedEl.append(evEl(e)));if(!$('#logModal').hidden){const l=$('#logList');l.innerHTML='';feed.forEach(e=>l.append(evEl(e)));}}
setInterval(()=>{if(feedEl.childElementCount)renderFeed();},1000);
$('#logBtn').addEventListener('click',()=>{$('#logBtn').classList.remove('ping');$('#logModal').hidden=false;player.busy=true;renderFeed();});
$('#logClose').addEventListener('click',()=>{$('#logModal').hidden=true;player.busy=false;});
function fmtTime(){const h=Math.floor(clock.minutes/60)%24,m=Math.floor(clock.minutes%60);return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');}
let hintTtl=0;function setHint(t){const h=$('#hint');h.textContent=t;h.hidden=false;hintTtl=5;}

// ---------- старт мира ----------
function spawnAll(){
  const bb=world.bbox;const cx=(bb[0]+bb[2])/2,cy=(bb[1]+bb[3])/2;
  const bauman=world.roads.filter(r=>/Баумана/i.test(r.n)&&r.c===9).sort((a,b)=>(b.bb[2]-b.bb[0])+(b.bb[3]-b.bb[1])-((a.bb[2]-a.bb[0])+(a.bb[3]-a.bb[1])));const br=bauman.length?bauman[0]:null;
  let spawn=[cx,cy];if(br){let tot=0;const cum=[0];for(let i=0;i<br.p.length-1;i++){const a=world.nodes[br.p[i]],b=world.nodes[br.p[i+1]];tot+=dist(a[0],a[1],b[0],b[1]);cum.push(tot);}let k=0;while(k<cum.length-1&&cum[k]<tot/2)k++;spawn=world.nodes[br.p[k]];}
  player.x=spawn[0];player.y=spawn[1];cam.x=player.x;cam.y=player.y;
  spawnPopulation(spawn);
  const homes=world.buildings.filter(b=>(b.t===''||b.t==='apartments'||b.t==='residential')&&b.h>=3&&dist(b.cx,b.cy,player.x,player.y)<400);player.home=homes.length?pick(homes):null;
  spawnRentals(player.x,player.y);}

// ---------- автобус ----------
function boardBus(bus,stop){player.bus=bus;player.waitingStop=null;player.exitNext=false;addEvent(`Вы сели в ${busWord(bus.route.type).toLowerCase()} ${bus.route.ref} на «${stop.n}»`);const nx=bus.upcoming();setHint(`Следующая: «${nx?nx.n:'конечная'}» · E — выйти`);}
function leaveBus(stop){const b=player.bus;player.bus=null;player.exitNext=false;player.x=b.x-b.hy*4;player.y=b.y+b.hx*4;addEvent(`Вы вышли на «${stop.n}»`);}

// ---------- действия ----------
let currentAction=null;
function findAction(){
  if(scene==='interior')return findActionInterior();
  if(player.state==='hurt')return null;
  if(player.bus)return {label:'Выйти на следующей остановке',run:()=>{player.exitNext=true;setHint('Выйдем на следующей остановке');}};
  if(player.vehicle){const v=player.vehicle;if(v.damaged>0)return {label:`Ждём ГИБДД… ${Math.ceil(v.damaged)} с`,run:()=>{}};
    if(v.kind==='own'&&player.home&&dist(player.home.cx,player.home.cy,v.x,v.y)<40)return {label:'Припарковать у дома и выйти',run:exitVehicle};
    return {label:v.kind==='scooter'?'Оставить самокат здесь':'Припарковать и выйти',run:exitVehicle};}
  if(player.waitingStop)return {label:`Ждём транспорт на «${player.waitingStop.n}» · отменить`,run:()=>{player.waitingStop=null;setHint('Вы передумали ехать');}};
  const ra=rallyAction();if(ra&&!/^Собрать/.test(ra.label))return ra;
  let best=null,bd=1e9;
  for(const w of walkers){if(w.bus||w.state==='hurt'||w.inside)continue;const d=dist(w.x,w.y,player.x,player.y);if(d<5&&d<bd){bd=d;best={label:`Поговорить: ${w.p.name}, ${w.role==='police'?'полиция':w.role==='guard'?'охранник':w.role==='courier'?'курьер':w.p.job}`,run:()=>openChat(w)};}}
  if(best)return best;
  for(const r of rentals){const d=dist(r.x,r.y,player.x,player.y);if(d<4&&d<bd){bd=d;best=r.kind==='scooter'?{label:'Взять самокат · 50 ₽ + 6 ₽/мин',run:()=>enterVehicle(r)}:{label:'Взять каршеринг · 200 ₽ + 10 ₽/мин',run:()=>enterVehicle(r)};}}
  if(ownCar&&ownCar.parked){const d=dist(ownCar.x,ownCar.y,player.x,player.y);if(d<4.5&&d<bd){bd=d;best={label:'Сесть в свою машину',run:()=>enterVehicle(ownCar)};}}
  if(best)return best;
  for(const s of world.stops){const d=dist(s.x,s.y,player.x,player.y);if(d<9&&d<bd){const rts=routesAtStop(s);if(!rts.length)continue;bd=d;best={label:`Остановка «${s.n}»: ждать ${rts.map(r=>r.ref).join(', ')}`,run:()=>{player.waitingStop=s;player.x=s.x;player.y=s.y;setHint('Ждём транспорт… первый подошедший — ваш');}};}}
  if(best)return best;
  for(const poi of world.pois){const d=dist(poi.x,poi.y,player.x,player.y);if(d<11&&d<bd){const a=poiAction(poi);if(!a)continue;bd=d;best=a;}}
  if(best)return best;
  if(ra)return ra;
  if(player.home&&dist(player.home.cx,player.home.cy,player.x,player.y)<Math.max(24,(player.home.bb[2]-player.home.bb[0])/2+8,(player.home.bb[3]-player.home.bb[1])/2+8)){return {label:'Зайти домой',run:()=>enterInterior({kind:'home',name:'Ваша квартира',key:'home',x:player.x,y:player.y})};}
  for(const ac of accidents){if(dist(ac.x,ac.y,player.x,player.y)<14&&!ac.reported&&!ac.playerCar){return {label:'Помочь на месте ДТП',run:()=>{ac.reported=true;player.mood=clamp(player.mood+12,0,100);addEvent('Вы помогли пострадавшим и дали показания. Настроение +12');}};}}
  const b=inBuildingNear(player.x,player.y);if(b&&b.n)return {label:`Зайти в «${b.n}»`,run:()=>enterInterior({kind:kindFromBuilding(b),name:b.n,key:'b'+b.i,x:player.x,y:player.y})};
  return null;}
function kindFromBuilding(b){const t=b.t;if(/church|mosque|cathedral|worship/.test(t))return 'worship';if(/retail|shop|commercial|mall|supermarket/.test(t))return 'shop';if(/office/.test(t))return 'office';if(/university|college/.test(t))return 'university';if(/school/.test(t))return 'school';if(/hospital|clinic/.test(t))return 'hospital';if(/hotel/.test(t))return 'hotel';if(/theatre|cinema/.test(t))return 'theatre';if(/museum/.test(t))return 'museum';if(/police/.test(t))return 'police';return 'default';}
function inBuildingNear(x,y){let hit=null;world.bgrid.query(x-6,y-6,x+6,y+6,b=>{if(hit||!b.n)return;if(dist(b.cx,b.cy,x,y)<Math.max(14,(b.bb[2]-b.bb[0])/2+6))hit=b;});return hit;}
function routesAtStop(s){return world.routes.filter(r=>r.stops.some(st=>{const p=routePoint(r,st.s);return dist(p[0],p[1],s.x,s.y)<32;}));}
function routePoint(r,s){let i=0;while(i<r.cum.length-2&&r.cum[i+1]<s)i++;const L=r.cum[i+1]-r.cum[i]||1;const t=(s-r.cum[i])/L;return [r.pts[i][0]+(r.pts[i+1][0]-r.pts[i][0])*t,r.pts[i][1]+(r.pts[i+1][1]-r.pts[i][1])*t];}
const ENTERABLE=/^(cafe|bar|shop|bank|office|theatre|museum|hotel|pharmacy|hospital|university|library|worship|police|market|school)$/;
function poiAction(poi){const n=poi.n?`«${poi.n}»`:'';
  if(ENTERABLE.test(poi.t)){if(poi.t==='office'&&!poi.n)return null;const nm=poi.n||KIND_RU[poi.t];return {label:`Зайти в ${poi.n?n:KIND_RU[poi.t]}`,run:()=>enterInterior({kind:poi.t,name:nm,key:'poi'+poi.i,x:player.x,y:player.y})};}
  switch(poi.t){
    case 'atm':return {label:`Снять наличные ${n}`,run:()=>setHint('Выдали наличные. Баланс тот же')};
    case 'sight':return {label:`Осмотреть ${n||'достопримечательность'}`,run:()=>{clock.minutes+=30;player.mood=clamp(player.mood+8,0,100);addEvent(`Вы осмотрели ${n||'достопримечательность'}. Настроение +8`);}};
    case 'fuel':return player.vehicle&&player.vehicle.kind==='own'?{label:`Заправиться ${n} · 2 500 ₽`,run:()=>spend(2500,()=>addEvent('Полный бак'))}:null;
    default:return null;}}
function spend(amount,fn){if(player.money<amount){setHint(`Не хватает денег: нужно ${amount} ₽`);return;}player.money-=amount;fn();}
function sleep(h){const before=Math.floor(clock.minutes/1440);clock.minutes+=h*60;player.energy=100;player.food=clamp(player.food-25,0,100);player.mood=clamp(player.mood+5,0,100);const after=Math.floor(clock.minutes/1440);if(after>before)addEvent(`Доброе утро! Наступил день ${after+1}`);else addEvent('Вы выспались');}

// ---------- диалог ----------
let chatNpc=null,chatBusy=false;
const SCRIPTED={police:['Проходите, не задерживайтесь. Всё под контролем.','Документы при себе? Шучу. Хорошего дня.','Если видели ДТП — сообщите, пригодится.'],guard:['Сюда нельзя, пропуск нужен.','Стою тут с восьми. Погода ничего.','Камеры всё видят, имейте в виду.'],courier:['Извините, заказ стынет, бегу!','Весь день на самокате — ноги уже не чувствую.','На Баумана опять не проехать…'],staff:['Что будете заказывать?','Сегодня свежие эчпочмаки, рекомендую.','Минутку, сейчас подойду.'],resident:['Исәнмесез! Как сами?','Говорят, на Кольце пробка. Опять.','Вы не знаете, где тут нормальный кофе? Хотя я сама знаю, пойдёмте покажу.','Казань — лучший город, не спорьте.','Автобус десятый уже полчаса жду.','Рәхмәт за беседу, но я спешу.','Слышали, на набережной вечером салют?']};
function openChat(w){chatNpc=w;player.busy=true;$('#chatModal').hidden=false;const f=$('#npcFace');f.style.background=w.p.clothes;f.textContent=w.p.name[0];$('#npcName').textContent=w.p.name+', '+w.p.age;$('#npcJob').textContent=w.p.job+' · настроение '+w.p.mood;const log=$('#chatLog');log.innerHTML='';
  if(w.p.memory.length){for(const m of w.p.memory)appendMsg(m.role==='user'?'me':'npc',m.content);}else{appendMsg('sys',`${w.p.name} ${w.seated?'поднимает глаза':'останавливается и смотрит на вас'}`);}
  $('#brainLbl').textContent=sampleFn?'думает сам: мозги на Claude':'реплики по сценарию (без ИИ)';
  if(!w.isInterior&&!w.companion){w.state='idle';w.ttl=9e9;w.path=null;}setTimeout(()=>$('#chatInput').focus(),50);}
function closeChat(){if(!chatNpc)return;if(!chatNpc.isInterior&&!chatNpc.companion)chatNpc.ttl=rnd(2,6);chatNpc=null;player.busy=false;$('#chatModal').hidden=true;}
function appendMsg(cls,text){const log=$('#chatLog');const d=document.createElement('div');d.className='m '+cls;d.textContent=text;log.append(d);log.scrollTop=log.scrollHeight;return d;}
async function sendChat(){const inp=$('#chatInput');const text=inp.value.trim();if(!text||chatBusy||!chatNpc)return;inp.value='';const w=chatNpc;appendMsg('me',text);w.p.memory.push({role:'user',content:text});chatBusy=true;let reply=null;
  let act=null;
  if(sampleFn){const bubble=appendMsg('npc','…');try{const r=await npcThink(w);reply=r.reply;bubble.textContent=reply;act=r;}catch(e){bubble.remove();if(e&&e.code==='not_granted'){sampleFn=null;$('#brainLbl').textContent='реплики по сценарию (ИИ не разрешён)';}}}
  if(!reply){const s=scriptedThink(w,text);reply=s?s.reply:pick(SCRIPTED[w.role]||SCRIPTED.resident);act=s;await new Promise(r=>setTimeout(r,400));appendMsg('npc',reply);}
  if(act){const note=applyNpcAction(w,act);if(note)appendMsg('sys',note);}
  w.p.memory.push({role:'assistant',content:reply});if(w.p.memory.length>16)w.p.memory.splice(0,w.p.memory.length-16);chatBusy=false;}
function contextForNpc(w){let place;if(w.isInterior&&interior)place=`внутри «${interior.name}» (${KIND_RU[interior.kind]||'помещение'})`;else{const near=world.pois.filter(p=>p.n&&dist(p.x,p.y,w.x,w.y)<80).slice(0,4).map(p=>p.n).join(', ');const road=nearestRoadName(w.x,w.y);place=`${road?'на улице '+road:'в центре'}${near?', рядом: '+near:''}`;}
  const rl=contextRallies(w.x||player.x,w.y||player.y);const ev=feed.slice(0,3).map(e=>e.text).join('; ')+(rl?'; '+rl:'');const pv=player.vehicle?(player.vehicle.kind==='scooter'?', подъехал на самокате':', подъехал на машине'):'';
  return `Ты — житель Казани в городской игре-симуляции. Тебя зовут ${w.p.name}, ${w.p.age} лет, ${w.p.job}. Характер: ${w.p.trait}. Настроение: ${w.p.mood}. Сейчас ${fmtTime()}, день ${clock.day}, погода: ${weatherText()}. Ты находишься ${place}. Последние события в городе: ${ev||'ничего особенного'}. С тобой заговорил ${player.name} (${player.role==='tourist'?'турист':player.role==='courier'?'курьер':player.role==='student'?'студент':'местный житель'}${pv})${player.desc?': «'+player.desc+'»':''}. Отвечай как живой человек, 1–2 коротких предложения, по-русски, можно татарское словечко. Не выходи из роли и не говори, что ты ИИ. Отвечай на реплику ниже.`;}
function weatherText(){return weather.kind==='rain'?'дождь':weather.kind==='cloudy'?'пасмурно':'ясно';}

// ---------- профиль ----------
function loadProfile(){try{return JSON.parse(localStorage.getItem('zk.profile')||'null');}catch(e){return null;}}
function saveProfile(p){try{localStorage.setItem('zk.profile',JSON.stringify(p));}catch(e){}}
function applyProfile(p){player.name=p.name||'Гость';player.desc=p.desc||'';player.role=p.role||'resident';player.avatar=p.avatar||null;player.thumb=p.thumb||null;player.clothes=p.clothes||'#2F9E6B';player.hasCar=p.hasCar!==false;player.carColor=p.carColor||'#C62828';player.avatarImg=null;if(player.avatar){const im=new Image();im.onload=()=>{player.avatarImg=im;};im.src=player.avatar;}$('#nameLbl').textContent=player.name;
  if(ownCar){ownCar.color=player.carColor;if(!player.hasCar){ownCar=null;}}else if(player.hasCar&&world)placeOwnCar();}
let pendingAvatar=null,pendingThumb=null;
$('#avFile').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{const im=new Image();im.onload=()=>{pendingAvatar=cropSquare(im,128,0.86);pendingThumb=cropSquare(im,36,0.55);const pv=$('#avPreview');pv.style.backgroundImage=`url(${pendingAvatar})`;pv.textContent='';};im.src=rd.result;};rd.readAsDataURL(f);});
function cropSquare(im,size,q){const c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d');const s=Math.min(im.width,im.height);x.drawImage(im,(im.width-s)/2,(im.height-s)/2,s,s,0,0,size,size);return c.toDataURL('image/jpeg',q);}
function showProfile(){const p=loadProfile()||{};$('#pName').value=p.name||'';$('#pDesc').value=p.desc||'';$('#pRole').value=p.role||'resident';$('#pCar').checked=p.hasCar!==false;$('#pCarColor').value=p.carColor||'#C62828';pendingAvatar=p.avatar||null;pendingThumb=p.thumb||null;const pv=$('#avPreview');if(pendingAvatar){pv.style.backgroundImage=`url(${pendingAvatar})`;pv.textContent='';}else{pv.style.backgroundImage='';pv.textContent='?';}
  document.querySelectorAll('#clothes .sw').forEach(el=>el.classList.toggle('on',el.dataset.c===(p.clothes||'#2F9E6B')));$('#profileModal').hidden=false;player.busy=true;setTimeout(()=>$('#pName').focus(),50);}
document.querySelectorAll('#clothes .sw').forEach(el=>el.addEventListener('click',()=>{document.querySelectorAll('#clothes .sw').forEach(q=>q.classList.remove('on'));el.classList.add('on');}));
$('#startBtn').addEventListener('click',()=>{const sw=document.querySelector('#clothes .sw.on');const first=!loadProfile();const p={name:($('#pName').value.trim()||'Гость').slice(0,24),desc:$('#pDesc').value.trim().slice(0,160),role:$('#pRole').value,avatar:pendingAvatar,thumb:pendingThumb,clothes:sw?sw.dataset.c:'#2F9E6B',hasCar:$('#pCar').checked,carColor:$('#pCarColor').value};saveProfile(p);applyProfile(p);$('#profileModal').hidden=true;player.busy=false;addEvent(`${player.name} вышел в город на улицу Баумана`);if(first||!flags.howtoSeen)showHowto();});
$('#pName').addEventListener('keydown',e=>{if(e.key==='Enter')$('#startBtn').click();});
function showHowto(){$('#howtoModal').hidden=false;player.busy=true;}
$('#howtoClose').addEventListener('click',()=>{$('#howtoModal').hidden=true;player.busy=false;flags.howtoSeen=true;try{localStorage.setItem('zk.howto','1');}catch(e){}});

// ---------- сохранение ----------
function saveState(){try{const v=player.vehicle;localStorage.setItem('zk.state',JSON.stringify({x:player.x,y:player.y,energy:player.energy,food:player.food,mood:player.mood,money:player.money,pantry:player.pantry,minutes:clock.minutes,z:cam.zt,own:ownCar&&ownCar.parked?{x:ownCar.x,y:ownCar.y,hx:ownCar.hx,hy:ownCar.hy}:(v&&v.kind==='own'?{x:v.x,y:v.y,hx:v.hx,hy:v.hy}:null)}));}catch(e){}}
function loadState(){try{const s=JSON.parse(localStorage.getItem('zk.state')||'null');if(!s)return;if(isFinite(s.x)&&isFinite(s.y)&&!inBuilding(s.x,s.y)){player.x=s.x;player.y=s.y;cam.x=s.x;cam.y=s.y;}player.energy=s.energy??player.energy;player.food=s.food??player.food;player.mood=s.mood??player.mood;player.money=s.money??player.money;player.pantry=s.pantry||0;clock.minutes=s.minutes??clock.minutes;if(s.z){cam.z=clamp(s.z,0.8,16);cam.zt=cam.z;}if(s.own&&ownCar){ownCar.x=s.own.x;ownCar.y=s.own.y;ownCar.hx=s.own.hx;ownCar.hy=s.own.hy;}flags.howtoSeen=!!localStorage.getItem('zk.howto');}catch(e){}}

// ---------- ввод ----------
window.addEventListener('keydown',e=>{if(e.target&&(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.tagName==='SELECT')){if(e.key==='Escape')e.target.blur();return;}
  keys[e.key.toLowerCase()]=true;keys[e.code]=true;
  if(e.key==='Escape'){if(!$('#chatModal').hidden)closeChat();if(!$('#menuModal').hidden){$('#menuModal').hidden=true;player.busy=false;}if(!$('#howtoModal').hidden)$('#howtoClose').click();if(!$('#rallyModal').hidden)closeRallyModal();if(!$('#speechModal').hidden)closeSpeech();if(!$('#logModal').hidden)$('#logClose').click();}
  if(e.key==='Enter'&&!player.busy&&$('#sayBar').hidden){e.preventDefault();openSayBar();return;}
  if((e.key==='e'||e.key==='E'||e.key==='у'||e.key==='У')&&!player.busy){if(currentAction){currentAction.run();e.preventDefault();}}
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();});
window.addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;keys[e.code]=false;});
$('#actBtn').addEventListener('click',()=>{if(currentAction&&!player.busy)currentAction.run();});
$('#chatSend').addEventListener('click',sendChat);$('#chatInput').addEventListener('keydown',e=>{if(e.key==='Enter')sendChat();});
$('#chatClose').addEventListener('click',closeChat);
$('#menuBtn').addEventListener('click',()=>{$('#menuModal').hidden=false;player.busy=true;$('#statsLbl').textContent=`Жителей: ${walkers.length} · машин: ${cars.length} · транспорта на линии: ${buses.length} · зданий: ${world.buildings.length} · улиц: ${world.roads.length} · переходов: ${world.crossings.length}${roomNs?' · игроков онлайн: '+(peers.length+1):''}`;});
$('#menuClose').addEventListener('click',()=>{$('#menuModal').hidden=true;player.busy=false;});
$('#howtoBtn').addEventListener('click',()=>{$('#menuModal').hidden=true;showHowto();});
$('#changeChar').addEventListener('click',()=>{$('#menuModal').hidden=true;showProfile();});
$('#resetBtn').addEventListener('click',()=>{try{localStorage.removeItem('zk.state');localStorage.removeItem('zk.profile');localStorage.removeItem('zk.howto');}catch(e){}location.reload();});
$('#speedBtn').addEventListener('click',()=>{const i=(TIME_SCALES.indexOf(clock.scale)+1)%TIME_SCALES.length;clock.scale=TIME_SCALES[i];$('#speedBtn').textContent='×'+clock.scale;});
$('#centerBtn').addEventListener('click',followPlayer);
mini.addEventListener('click',e=>{if(scene!=='city')return;const rc=mini.getBoundingClientRect();const mx=(e.clientX-rc.left)*mini.width/rc.width,my=(e.clientY-rc.top)*mini.height/rc.height;const bb=world.bbox;const s=Math.min(mini.width/(bb[2]-bb[0]),mini.height/(bb[3]-bb[1]));const ox=(mini.width-(bb[2]-bb[0])*s)/2,oy=(mini.height-(bb[3]-bb[1])*s)/2;cam.x=(mx-ox)/s+bb[0];cam.y=(my-oy)/s+bb[1];cam.free=true;$('#centerBtn').hidden=false;clampCam();});
$('#zin').addEventListener('click',()=>{cam.zt=clamp(cam.zt*1.3,0.8,16);});$('#zout').addEventListener('click',()=>{cam.zt=clamp(cam.zt/1.3,0.8,16);});
canvas.addEventListener('wheel',e=>{e.preventDefault();const nz=clamp(cam.zt*(e.deltaY<0?1.12:0.89),0.8,16);if(scene==='city'&&cam.free){const wx=cam.x+(e.clientX-W/2)/cam.z,wy=cam.y+(e.clientY-H/2)/cam.z;cam.z=cam.zt=nz;cam.x=wx-(e.clientX-W/2)/nz;cam.y=wy-(e.clientY-H/2)/nz;}else cam.zt=nz;},{passive:false});
let pdown=null,dragging=false,pinch=null;const ptrs=new Map();
function followPlayer(){cam.free=false;$('#centerBtn').hidden=true;}
function clampCam(){const bb=world.bbox;cam.x=clamp(cam.x,bb[0],bb[2]);cam.y=clamp(cam.y,bb[1],bb[3]);}
canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'&&e.clientX<180&&e.clientY>innerHeight-200)return;try{canvas.setPointerCapture(e.pointerId);}catch(_){}ptrs.set(e.pointerId,[e.clientX,e.clientY]);
  if(ptrs.size===2){const [a,b]=[...ptrs.values()];pinch={d:Math.hypot(a[0]-b[0],a[1]-b[1])||1,z:cam.zt};pdown=null;dragging=false;return;}
  pdown={x:e.clientX,y:e.clientY,lx:e.clientX,ly:e.clientY,t:performance.now()};dragging=false;});
canvas.addEventListener('pointermove',e=>{if(!ptrs.has(e.pointerId))return;ptrs.set(e.pointerId,[e.clientX,e.clientY]);
  if(pinch&&ptrs.size>=2){const [a,b]=[...ptrs.values()];cam.zt=cam.z=clamp(pinch.z*Math.hypot(a[0]-b[0],a[1]-b[1])/pinch.d,0.8,16);return;}
  if(!pdown||scene!=='city')return;if(!dragging&&Math.hypot(e.clientX-pdown.x,e.clientY-pdown.y)>6){dragging=true;cam.free=true;$('#centerBtn').hidden=false;canvas.style.cursor='grabbing';}
  if(dragging){cam.x-=(e.clientX-pdown.lx)/cam.z;cam.y-=(e.clientY-pdown.ly)/cam.z;pdown.lx=e.clientX;pdown.ly=e.clientY;clampCam();}});
canvas.addEventListener('pointercancel',e=>{ptrs.delete(e.pointerId);pinch=null;pdown=null;dragging=false;canvas.style.cursor='';});
canvas.addEventListener('pointerup',e=>{ptrs.delete(e.pointerId);if(pinch){if(ptrs.size<2)pinch=null;pdown=null;return;}if(!pdown)return;if(dragging){dragging=false;pdown=null;canvas.style.cursor='';return;}const moved=Math.hypot(e.clientX-pdown.x,e.clientY-pdown.y);pdown=null;if(moved>8||player.busy||player.bus||player.state==='hurt')return;
  if(scene==='interior'){const it=interior;player.iwp=[(e.clientX-it.ox)/it.iz,(e.clientY-it.oy)/it.iz];return;}
  const wx=cam.x+(e.clientX-innerWidth/2)/cam.z,wy=cam.y+(e.clientY-innerHeight/2)/cam.z;
  followPlayer();
  if(player.vehicle){driveTo(wx,wy);return;}
  for(const pr of peerRender.values()){if(pr.b)continue;if(dist(pr.x,pr.y,wx,wy)<Math.max(2.5,16/cam.z)){walkTo(pr.x,pr.y,true);openSayBar(pr.name+', ');setHint(`Подходим к ${pr.name}. Напишите — услышат все рядом`);return;}}
  let hitW=null,hd=Math.max(2.2,14/cam.z);for(const w of walkers){if(w.bus||w.state==='hurt')continue;const d=dist(w.x,w.y,wx,wy);if(d<hd){hd=d;hitW=w;}}
  if(hitW){player.talkTarget=hitW;hitW.state='idle';hitW.ttl=Math.max(hitW.ttl,dist(hitW.x,hitW.y,player.x,player.y)/2.5+4);hitW.path=null;setHint(`Идём к ${hitW.p.name}`);walkTo(hitW.x,hitW.y,true);return;}
  player.talkTarget=null;walkTo(wx,wy);});
function walkTo(wx,wy,keepTarget){if(!keepTarget&&inBuilding(wx,wy)){setHint('Туда не пройти: это здание');return;}const s=nearestNode(player.x,player.y,world.pedAdj,120),g=nearestNode(wx,wy,world.pedAdj,120);if(s<0||g<0)return;player.waitingStop=null;
  const path=astar(world.pedAdj,s,g,pedCost);const wps=pathToWaypoints(path,world.pedAdj,'ped');wps.push([wx,wy]);player.waypoints=wps;}
const joy=$('#joy'),joyKnob=joy.querySelector('i');let joyVec=[0,0],joyId=null,joyOrigin=null;
joy.addEventListener('pointerdown',e=>{joyId=e.pointerId;joyOrigin=[e.clientX,e.clientY];joy.setPointerCapture(e.pointerId);});
joy.addEventListener('pointermove',e=>{if(e.pointerId!==joyId)return;let dx=e.clientX-joyOrigin[0],dy=e.clientY-joyOrigin[1];const m=Math.hypot(dx,dy);if(m>44){dx*=44/m;dy*=44/m;}joyVec=[dx/44,dy/44];joyKnob.style.transform=`translate(${dx}px,${dy}px)`;});
const joyEnd=e=>{if(e.pointerId!==joyId)return;joyId=null;joyVec=[0,0];joyKnob.style.transform='';};joy.addEventListener('pointerup',joyEnd);joy.addEventListener('pointercancel',joyEnd);

// ---------- обновление игрока ----------
function updatePlayer(dt){
  if(player.state==='hurt'){player.hurtT+=dt;return;}
  if(player.bus){player.x=player.bus.x;player.y=player.bus.y;return;}
  if(player.vehicle){updateVehicle(dt);return;}
  if(player.talkTarget){const t=player.talkTarget;if(t.bus||player.busy||t.state==='hurt'){player.talkTarget=null;}else if(dist(t.x,t.y,player.x,player.y)<5){player.talkTarget=null;player.waypoints=null;openChat(t);return;}}
  let mx=0,my=0;if(!player.busy){if(keys.w||keys['ц']||keys.ArrowUp)my-=1;if(keys.s||keys['ы']||keys.ArrowDown)my+=1;if(keys.a||keys['ф']||keys.ArrowLeft)mx-=1;if(keys.d||keys['в']||keys.ArrowRight)mx+=1;mx+=joyVec[0];my+=joyVec[1];}
  const m=Math.hypot(mx,my);const run=keys.shift||keys.ShiftLeft;
  if(m>0.05){if(cam.free)followPlayer();player.waypoints=null;player.waitingStop=null;player.talkTarget=null;mx/=m;my/=m;const sp=(run?5.5:3.0)*Math.min(1,m)*(player.energy<10?0.6:1);tryMove(mx*sp*dt,my*sp*dt);player.hx=mx;player.hy=my;player.phase+=dt*(run?11:8);if(run)player.energy=clamp(player.energy-dt*0.12,0,100);}
  else if(player.waypoints&&player.waypoints.length){const w=player.waypoints[0];const d=dist(w[0],w[1],player.x,player.y);if(d<0.6){player.waypoints.shift();if(!player.waypoints.length)player.waypoints=null;}else{const sp=3.0*dt;const dx=(w[0]-player.x)/d,dy=(w[1]-player.y)/d;const step=Math.min(sp,d);player.x+=dx*step;player.y+=dy*step;player.hx=dx;player.hy=dy;player.phase+=dt*8;}}}
function tryMove(dx,dy){const bb=world.bbox;let nx=clamp(player.x+dx,bb[0]+5,bb[2]-5),ny=clamp(player.y+dy,bb[1]+5,bb[3]-5);const ok=(x,y)=>!inBuilding(x,y)&&!wallBlocks(player.x,player.y,x,y);if(ok(nx,ny)){player.x=nx;player.y=ny;return;}if(ok(nx,player.y)){player.x=nx;return;}if(ok(player.x,ny)){player.y=ny;}}
function checkPlayerHit(){if(player.inside||player.state==='hurt'||cine||player.bus)return;if(player.vehicle&&player.vehicle.kind!=='scooter')return;
  for(const v of cars.concat(buses)){if(v.crashed||v.speed<2.2||v.remove)continue;const ox=player.x-v.x,oy=player.y-v.y;if(Math.abs(ox)>9||Math.abs(oy)>9)continue;const f=ox*v.hx+oy*v.hy;const s=Math.abs(-ox*v.hy+oy*v.hx);if(Math.abs(f)<v.len*0.5+0.35&&s<v.wid*0.5+0.5){playerHitByCar(v);return;}}}
function updateNeeds(gameMin){player.energy=clamp(player.energy-gameMin*0.085,0,100);player.food=clamp(player.food-gameMin*0.12,0,100);let target=55;if(player.food<25)target-=20;if(player.energy<20)target-=20;if(weather.kind==='rain')target-=5;player.mood=lerp(player.mood,target,Math.min(1,gameMin*0.004));}
let dayPhaseAnnounced={};
function updateClock(dt){const gm=dt*clock.scale/60;const before=clock.minutes;clock.minutes+=gm;updateNeeds(gm);const d=Math.floor(clock.minutes/1440)+1;if(d!==clock.day){clock.day=d;dayPhaseAnnounced={};}
  const h=(clock.minutes/60)%24;const key=Math.floor(h);const marks={6:'Рассвет над Казанкой. Город просыпается',8:'Утренний час пик: на Кольце и Татарстан плотно',12:'Обед. Кафе на Баумана заполняются',17:'Вечерний час пик',20:'Зажглись фонари',23:'Ночь. Остались только таксисты и полиция'};
  if(marks[key]&&!dayPhaseAnnounced[key]&&Math.floor(before/60)%24!==key){dayPhaseAnnounced[key]=true;addEvent(marks[key]);}}
function updateWeather(dt){weather.ttl-=dt;if(weather.ttl<=0){const r=Math.random();const k=r<0.5?'clear':r<0.8?'cloudy':'rain';if(k!==weather.kind){weather.kind=k;addEvent(k==='rain'?'Пошёл дождь. Пешеходы ускорились, водители — наоборот':k==='cloudy'?'Небо затянуло':'Распогодилось');}weather.ttl=rnd(180,420);}
  if(weather.kind==='rain'&&!reduceMotion&&scene==='city'){while(weather.rain.length<160)weather.rain.push([Math.random(),Math.random(),rnd(0.5,1)]);for(const r of weather.rain){r[1]+=dt*1.2*r[2];r[0]+=dt*0.15*r[2];if(r[1]>1.05){r[1]=-0.05;r[0]=Math.random();}}}else weather.rain.length=0;}

let last=performance.now(),hudTimer=0,saveTimer=0,presTimer=0;
function frame(now){const rdt=Math.min(0.05,(now-last)/1000);last=now;
  if(world){const dt=cine?rdt*0.18:rdt;
    updateClock(dt);updateWeather(dt);processPaths(6);updateRoadPeds();
    const vehicles=cars.concat(buses);if(player.vehicle&&!player.inside)vehicles.push(vehProxy(player.vehicle));
    for(const w of walkers)w.update(dt);
    for(let i=cars.length-1;i>=0;i--){const c=cars[i];c.update(dt,vehicles);if(c.remove)cars.splice(i,1);}
    for(const b of buses)b.update(dt,vehicles);
    accidentTimer-=dt;if(accidentTimer<=0){accidentTimer=rnd(90,180);if(accidents.length<3)spawnRandomAccident();}
    updateAccidents(dt);updateRallies(dt);updateSay(rdt);updatePopulation(dt);updateRentals(dt);updateCine(rdt);
    if(scene==='interior')updateInterior(dt);else{updatePlayer(dt);checkPlayerHit();}updateCompanion(dt);
    cam.z=lerp(cam.z,cam.zt,Math.min(1,rdt*5));if(scene==='city'&&(cam.free&&(player.vehicle||player.bus||cine||player.state==='hurt')))followPlayer();if(scene==='city'&&!cam.free){cam.x=lerp(cam.x,player.x,Math.min(1,rdt*6));cam.y=lerp(cam.y,player.y,Math.min(1,rdt*6));}
    hudTimer-=rdt;if(hudTimer<=0){hudTimer=0.25;updateHud();}
    saveTimer-=rdt;if(saveTimer<=0){saveTimer=3;saveState();}
    presTimer-=rdt;if(presTimer<=0){presTimer=0.12;pushPresence();}
    if(hintTtl>0){hintTtl-=rdt;if(hintTtl<=0)$('#hint').hidden=true;}
    if(scene==='interior')renderInterior();else render();}
  requestAnimationFrame(frame);}
function updateHud(){$('#clock').textContent=fmtTime();$('#dayLbl').textContent='день '+clock.day;$('#weatherLbl').textContent=(weather.kind==='rain'?'🌧 дождь':weather.kind==='cloudy'?'☁️ пасмурно':isNight()?'🌙 ясно':'☀️ ясно');
  setBar('#bEnergy',player.energy);setBar('#bFood',player.food);setBar('#bMood',player.mood);$('#moneyLbl').textContent=fmtMoney(player.money);
  const v=player.vehicle;const vb=$('#vehBox');if(v){vb.hidden=false;const kmh=Math.round(Math.abs(v.speed)*3.6);const mins=Math.max(0,clock.minutes-v.startMin);$('#vehLbl').textContent=`${v.kind==='scooter'?'🛴':'🚗'} ${v.spec.label} · ${kmh} км/ч${v.spec.perMin?' · '+Math.round(mins)+' мин · '+Math.round(v.spec.start+mins*v.spec.perMin)+' ₽':''}${v.onRoad===false&&v.kind!=='scooter'?' · вне дороги':''}${v.auto?' · автопилот':''}`;}else vb.hidden=true;
  currentAction=player.busy?null:findAction();const ab=$('#actBtn');if(currentAction){ab.hidden=false;ab.innerHTML='';const k=document.createElement('kbd');k.textContent='E';ab.append(k,document.createTextNode(currentAction.label));}else ab.hidden=true;}
function setBar(sel,v){const b=$(sel);b.querySelector('i').style.width=clamp(v,0,100)+'%';b.classList.toggle('low',v<22);}

// ---------- мультиплеер ----------
function pushPresence(){if(!roomNs)return;const p={x:Math.round(player.x*10)/10,y:Math.round(player.y*10)/10,n:player.name.slice(0,24),r:player.role,hx:Math.round(player.hx*100)/100,hy:Math.round(player.hy*100)/100,b:(player.bus||player.inside)?1:0,c:player.clothes,v:player.vehicle?player.vehicle.kind:null,vc:player.vehicle?player.vehicle.color:null};p.sy=saySent;p.g=player.rally?{s:player.rally.sq.i,k:player.rally.kind,t:player.rally.title}:null;if(player.thumb&&player.thumb.length<3000)p.a=player.thumb;roomNs.presence(p).catch(()=>{});}
function syncPeers(){peers=roomNs.peers().filter(p=>!p.isMe&&p.kind==='viewer'&&p.presence&&typeof p.presence.x==='number');const seen=new Set();
  for(const p of peers){seen.add(p.peer);let pr=peerRender.get(p.peer);if(!pr){pr={x:p.presence.x,y:p.presence.y,tx:0,ty:0,name:'',img:null,imgSrc:null,hx:0,hy:1,b:0,c:'#4A90E2',veh:null};peerRender.set(p.peer,pr);}
    pr.tx=p.presence.x;pr.ty=p.presence.y;pr.name=String(p.presence.n||'Игрок').slice(0,24);pr.hx=+p.presence.hx||0;pr.hy=+p.presence.hy||0;pr.b=p.presence.b?1:0;pr.c=/^#[0-9A-Fa-f]{6}$/.test(p.presence.c||'')?p.presence.c:'#4A90E2';pr.veh=p.presence.v?{kind:String(p.presence.v),color:/^#[0-9A-Fa-f]{6}$/.test(p.presence.vc||'')?p.presence.vc:'#2E9BD6'}:null;
    onPeerSay(pr,p.presence.sy);
    const g=p.presence.g;if(g&&typeof g==='object'&&world.squares[g.s]&&RALLY_KIND[g.k]){const sq=world.squares[g.s];let r=rallyAt(sq);if(!r)r=startRally(sq,g.k,String(g.t||'').slice(0,60),'peer');if(r&&r.by==='peer')r.seen=performance.now();}
    const a=typeof p.presence.a==='string'&&p.presence.a.startsWith('data:image/')?p.presence.a:null;if(a&&a!==pr.imgSrc){pr.imgSrc=a;const im=new Image();im.onload=()=>{pr.img=im;};im.src=a;}if(!a){pr.img=null;pr.imgSrc=null;}}
  for(const k of peerRender.keys())if(!seen.has(k))peerRender.delete(k);}
function tickPeers(){for(const pr of peerRender.values()){pr.x=lerp(pr.x,pr.tx,0.25);pr.y=lerp(pr.y,pr.ty,0.25);}}
setInterval(tickPeers,33);
function initCaps(){try{const u=window.claude&&window.claude.use;if(!u)return;
  window.claude.use('room').then(r=>{if(!r)return;roomNs=r;r.onPeers(()=>{syncPeers();},()=>{roomNs=null;peerRender.clear();});pushPresence();}).catch(()=>{});
  window.claude.use('sample').then(s=>{if(s)sampleFn=s;}).catch(()=>{});}catch(e){}}

// ---------- старт ----------
async function boot(){
  try{
    const res=await fetch('kazan.json');if(!res.ok)throw new Error('нет данных карты ('+res.status+')');
    $('#loadMsg').textContent='Строим улицы и дома…';const data=await res.json();
    await new Promise(r=>setTimeout(r,30));buildWorld(data);
    $('#loadMsg').textContent='Выпускаем жителей и транспорт…';await new Promise(r=>setTimeout(r,30));
    spawnAll();const prof=loadProfile();if(prof)applyProfile(prof);loadState();
    const rl=$('#routesLbl');rl.innerHTML='';for(const r of world.routes){const c=document.createElement('span');c.className='chip '+r.type;c.textContent=(r.type==='tram'?'Т':r.type==='trolleybus'?'Тб':'А')+' '+r.ref;c.title=r.name;rl.append(c);}
    $('#loading').hidden=true;
    if(prof){addEvent(`${player.name} снова в городе`);if(!flags.howtoSeen)showHowto();}else showProfile();
    addEvent('Центр Казани: '+world.buildings.length.toLocaleString('ru-RU')+' зданий, '+world.roads.length.toLocaleString('ru-RU')+' улиц, '+world.crossings.length+' переходов');
    initCaps();requestAnimationFrame(frame);
  }catch(e){$('#loadMsg').textContent='Не удалось загрузить карту: '+e.message;const pr=document.querySelector('#loading .pr');if(pr)pr.hidden=true;console.error(e);}
}
boot();
