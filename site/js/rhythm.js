// ===== Ритм города: толпа и машины по часам, часы работы заведений, посетители внутри =====
// Часть жителей и машин «уходит домой» (вынимается из walkers/cars в запас) и возвращается по суточной кривой.
// День 1 = 20 июня 2026 (суббота) — та же дата, что в events.js и phone.js.
const RHYTHM={dormW:[],dormC:[],t:0,ready:false,ped:1,car:1};
// доля жителей на улице по часам (0…23): будни и выходные
const PED_WD=[.16,.11,.08,.07,.08,.16,.34,.62,.95,.82,.64,.66,.86,.84,.68,.66,.74,.92,1,.9,.76,.6,.44,.28];
const PED_WE=[.3,.22,.14,.1,.08,.1,.16,.26,.4,.55,.7,.82,.92,.95,.95,.94,.92,.92,.95,.95,.88,.74,.58,.42];
const CAR_WD=[.22,.15,.11,.1,.12,.22,.46,.82,1,.86,.68,.66,.72,.72,.68,.72,.86,1,.98,.8,.62,.5,.4,.3];
const CAR_WE=[.3,.22,.15,.11,.1,.12,.2,.3,.42,.55,.66,.74,.78,.78,.76,.74,.74,.76,.76,.7,.6,.5,.42,.36];
function cityHour(){return ((clock.minutes/60)%24+24)%24;}
function cityWeekday(day){const dt=new Date(Date.UTC(2026,5,20)+((day||clock.day)-1)*86400000);return dt.getUTCDay();}
function isWeekend(day){const w=cityWeekday(day);return w===0||w===6;}
function curveAt(arr,h){const a=Math.floor(h)%24,b=(a+1)%24,f=h-Math.floor(h);return arr[a]*(1-f)+arr[b]*f;}
function pedFactor(h){h=h??cityHour();let f=curveAt(isWeekend()?PED_WE:PED_WD,h);if(weather.kind==='rain')f*=0.72;return f;}
function carFactor(h){h=h??cityHour();let f=curveAt(isWeekend()?CAR_WE:CAR_WD,h);if(weather.kind==='rain')f=Math.min(1,f*1.05);return f;}
function rushHour(){const h=cityHour();return !isWeekend()&&((h>=7.3&&h<9.5)||(h>=17&&h<19.3));}

// ---------- часы работы ----------
const RESTO_RE=/ресторан|чайхан/i;
function poiHours(p){const t=p.t,n=String(p.n||''),i=p.i||0;
  switch(t){
    case 'cafe':if(/24|круглос/i.test(n)||i%17===0)return {a:0,b:24};if(RESTO_RE.test(n))return {a:11,b:24};return [{a:8,b:22},{a:9,b:23},{a:7,b:21}][i%3];
    case 'bar':return {a:16,b:[26,28,30][i%3]};          // до 2, 4 или 6 утра
    case 'shop':if(/24|круглос/i.test(n)||i%5===0)return {a:0,b:24};return [{a:8,b:22},{a:9,b:21},{a:8,b:23}][i%3];
    case 'pharmacy':if(/24|круглос/i.test(n)||i%4===0)return {a:0,b:24,duty:true};return {a:8,b:21};
    case 'market':return {a:7,b:19};
    case 'office':return {a:9,b:18,wd:true};
    case 'bank':return {a:9,b:19,bank:true};
    case 'museum':return {a:10,b:18,mon:true};
    case 'theatre':return {a:11,b:23};
    case 'library':return {a:10,b:20};
    case 'university':case 'school':return {a:8,b:18,wd:true};
    case 'worship':return {a:7,b:21};
    case 'prosecutor':return {a:9,b:19,wd:true};
    default:return null;}}            // гостиница, больница, полиция, дом — всегда
function openAt(p,day,h){const H=poiHours(p);if(!H)return true;const wd=cityWeekday(day);
  let a=H.a,b=H.b;
  if(H.wd&&(wd===0||wd===6))return false;
  if(H.mon&&wd===1)return false;
  if(H.bank){if(wd===0)return false;if(wd===6){a=10;b=16;}}
  if(b<=24)return h>=a&&h<b;
  // работает за полночь: открыт с a до 24 сегодня или до b-24 после полуночи (смена вчерашнего дня)
  if(h>=a)return true;return h<b-24&&openPrevDay(H,day);}
function openPrevDay(H,day){const wd=cityWeekday(Math.max(1,day-1));if(H.wd&&(wd===0||wd===6))return false;return true;}
function poiOpen(p){return openAt(p,clock.day,cityHour());}
function fmtHour(h){h=((h%24)+24)%24;return `${Math.floor(h)}:${String(Math.round((h%1)*60)).padStart(2,'0')}`;}
const WD_ACC=['в воскресенье','в понедельник','во вторник','в среду','в четверг','в пятницу','в субботу'];
function opensText(p){const day0=clock.day,h0=cityHour();
  for(let k=1;k<=24*8;k++){const t=h0+k*0.25;const day=day0+Math.floor(t/24),h=t%24;if(openAt(p,day,h)){const hh=Math.ceil(h*4)/4;if(day===day0)return `откроется в ${fmtHour(hh)}`;if(day===day0+1)return `откроется завтра в ${fmtHour(hh)}`;return `откроется ${WD_ACC[cityWeekday(day)]} в ${fmtHour(hh)}`;}}
  return 'сегодня не работает';}
function hoursLine(p){const H=poiHours(p);if(!H)return 'круглосуточно';if(H.a===0&&H.b===24)return H.duty?'дежурная, круглосуточно':'круглосуточно';return `${fmtHour(H.a)}–${fmtHour(H.b)}`;}
// закрытое заведение: подпись для кнопки E вместо «Зайти»
function closedAction(p,key){if(poiOpen(p))return null;if(player.job&&player.job.key&&player.job.key===key)return null;
  const nm=p.n?`«${p.n}»`:(KIND_RU[p.t]||'Заведение');
  return {label:`${nm} закрыто · ${opensText(p)}`,run:()=>setHint(`${nm}: ${hoursLine(p)}. Сейчас закрыто — ${opensText(p)}`)};}

// ---------- сколько людей внутри ----------
function venueBusy(kind,h){h=h??cityHour();const we=isWeekend();
  switch(kind){
    case 'cafe':return h<7?0.15:h<10?0.55:h<12?0.5:h<15?1:h<18?0.6:h<21.5?0.85:0.4;
    case 'bar':return h<2?0.95:h<4?0.6:h<16?0.2:h<19?0.35:h<22?0.7:1;
    case 'office':case 'university':case 'school':return we?0.1:(h>=9&&h<18?1:0.1);
    case 'theatre':return h>=18&&h<22.5?1:0.15;
    case 'metro':return h<6?0:rushHour()?1:Math.max(0.2,pedFactor(h)*0.75);
    default:return Math.max(0.25,pedFactor(h));}}
function extraPatron(x,y,hx){const p=makePersona('resident');return {p,x,y,hx,hy:0,seated:true,phase:Math.random()*6,role:'resident',isInterior:true,state:'idle',memory:p.memory,extra:true};}
function refreshCrowd(it){if(!it||it.kind==='home')return;
  if(!it.patrons){it.patrons=it.npcs.filter(n=>n.role==='resident'&&!n.companionOf);it.extras=[];
    // в час пик за свободные столики подсаживаются ещё люди
    // (примерно каждый третий столик остаётся свободным — игроку всегда есть куда сесть)
    if(it.kind==='cafe'||it.kind==='bar')for(const f of it.furn){if(f.spot!=='table'||it.patrons.some(n=>n.seated&&dist(n.x,n.y,f.x,f.y)<1.4))continue;if(Math.abs(Math.sin(f.x*12.9898+f.y*78.233))%1<0.34)continue;
      it.extras.push(extraPatron(f.x-1.05,f.y,1));if(Math.random()<0.6)it.extras.push(extraPatron(f.x+1.05,f.y,-1));}}
  const staff=it.npcs.filter(n=>!it.patrons.includes(n)&&!n.extra);
  const busy=venueBusy(it.kind);
  const keep=it.patrons.filter((n,i)=>((i*0.618+0.13)%1)<busy+0.05);    // одни и те же люди при одинаковой загрузке
  const more=it.extras.filter((n,i)=>((i*0.618+0.37)%1)<(busy-0.6)/0.4);
  it.npcs=staff.concat(keep,more);
  for(const f of it.furn)if(f.spot==='table'){f.taken=keep.some(n=>n.seated&&dist(n.x,n.y,f.x,f.y)<1.4);}}

// ---------- кто на улице ----------
function freeWalker(w){return w.role==='resident'&&!w.temp&&!w.keep&&w.sitBy==null&&!w.companion&&!w.rally&&!w.rallySlot&&!w.bus&&!w.inside&&!w.folk&&w!==chatNpc&&(w.state==='idle'||w.state==='walk'||w.state==='routing');}
function freeCar(c){return c.kind==='car'&&!c.crashed&&c.target==null&&!c.keep&&c.sitBy==null&&!c.temp&&c!==player.vehicle&&(c.state==='idle'||c.state==='drive'||c.state==='routing');}
function retireWalker(w){const i=walkers.indexOf(w);if(i<0)return;walkers.splice(i,1);w.path=null;w.goalPoi=null;w.goalStop=null;w.waitStop=null;w.goHome=false;w.state='home';RHYTHM.dormW.push(w);}
function retireCar(c){const i=cars.indexOf(c);if(i<0)return;cars.splice(i,1);c.path=null;c.speed=0;c.state='parked';RHYTHM.dormC.push(c);}
// идёт «домой»: к ближайшему подъезду/заведению, там исчезает
function sendHome(w){w.goHome=true;let best=null,bd=1e9;for(let k=0;k<14;k++){const p=pick(world.pois);const d=dist(p.x,p.y,w.x,w.y);if(d<bd&&d<160){bd=d;best=p;}}
  const goal=best?nearestNode(best.x,best.y,world.pedAdj,120):-1;if(goal<0||w.node==null){w.state='idle';w.ttl=0.5;return;}
  w.goalPoi=best;w.goalStop=null;w.state='routing';requestPath(w,world.pedAdj,w.node,goal,pedCost,path=>{if(w.state!=='routing')return;if(!path||path.length<2){w.state='idle';w.ttl=0.5;return;}w.path=path;w.seg=0;w.t=0;w.state='walk';});}
// где сейчас «жизнь»: у игрока, а если карту отвели и смотрят в другое место — и там (через раз)
function lifeCenter(){return typeof camFar==='function'&&camFar()&&Math.random()<0.5?[cam.x,cam.y]:[player.x,player.y];}
function lifeDist(x,y){const d=dist(x,y,player.x,player.y);return typeof camFar==='function'&&camFar()?Math.min(d,dist(x,y,cam.x,cam.y)):d;}
// выходит из подъезда или заведения недалеко от игрока (или от того места, куда смотрят)
function wakeWalker(){const w=RHYTHM.dormW.pop();if(!w)return false;const [px,py]=lifeCenter();let spot=null;
  // часть людей выходит из метро
  if(typeof metroSpots==='function'&&typeof metroOpen==='function'&&metroOpen()&&Math.random()<0.25){const ms=metroSpots().filter(e=>{const d=dist(e.x,e.y,px,py);return d>30&&d<320;});if(ms.length){const e=pick(ms);spot={x:e.x,y:e.y,t:'metro'};}}
  for(let k=0;k<16&&!spot;k++){const p=pick(world.pois);const d=dist(p.x,p.y,px,py);if(d>40&&d<320&&poiOpen(p))spot=p;}
  let n;if(spot){n=nearestNode(spot.x,spot.y,world.pedAdj,120);}if(n==null||n<0){n=nodeNear(world.pedNodes,[px,py],300);spot=null;}
  w.node=n;if(spot){w.x=spot.x+rnd(-1.5,1.5);w.y=spot.y+rnd(-1.5,1.5);}else{const sp=sidewalkPos(n);w.x=sp[0];w.y=sp[1];}
  w.p=makePersona('resident');w.path=null;w.goalPoi=null;w.goalStop=null;w.waitStop=null;w.goHome=false;w.state='idle';w.ttl=rnd(0,2);w.bus=null;w.rally=null;w.rallySlot=null;
  walkers.push(w);return true;}
function wakeCar(){const c=RHYTHM.dormC.pop();if(!c)return false;const [px,py]=lifeCenter();let n=-1;
  for(let k=0;k<10;k++){const m=nodeNear(world.carNodes,[px,py],650);const p=world.nodes[m];if(dist(p[0],p[1],px,py)>300){n=m;break;}}
  if(n<0)n=nodeNear(world.carNodes,[px,py],650);const p=world.nodes[n];
  c.node=n;c.x=p[0];c.y=p[1];c.path=null;c.speed=0;c.state='idle';c.ttl=rnd(0,1.5);c.creep=null;c.stuck=0;c.waitT=0;c.crashed=false;c.remove=false;
  cars.push(c);return true;}
function updateRhythm(rdt){if(!world||typeof walkers==='undefined')return;
  RHYTHM.t-=rdt;if(RHYTHM.t>0)return;RHYTHM.t=0.5;
  const pf=pedFactor(),cf=carFactor();RHYTHM.ped=pf;RHYTHM.car=cf;
  const px=player.x,py=player.y,first=!RHYTHM.ready;RHYTHM.ready=true;
  // пешеходы
  {const active=walkers.filter(w=>w.role==='resident'&&!w.temp);const pool=active.length+RHYTHM.dormW.length;const target=Math.round(pool*pf);
    const homing=active.filter(w=>w.goHome);let diff=active.length-homing.length-target;
    const lim=first?1e9:Math.max(3,Math.ceil(Math.abs(diff)/12));
    // дошли до подъезда — исчезают
    for(const w of homing){if(w.state==='idle'&&freeWalker(w))retireWalker(w);else if(!freeWalker(w)&&w.state!=='routing'&&w.state!=='walk')w.goHome=false;}
    if(diff>0){let n=0;const cand=active.filter(w=>!w.goHome&&freeWalker(w));
      cand.sort((a,b)=>lifeDist(b.x,b.y)-lifeDist(a.x,a.y));
      for(const w of cand){if(n>=Math.min(diff,lim))break;if(first||lifeDist(w.x,w.y)>170)retireWalker(w);else sendHome(w);n++;}}
    else if(diff<0){let n=0;const need=Math.min(-diff,lim);
      for(const w of homing){if(n>=need)break;w.goHome=false;if(w.state==='walk'||w.state==='routing'){w.goalPoi=null;}n++;}
      while(n<need&&wakeWalker())n++;}}
  // машины (такси, полиция и скорая не уходят — ночью их доля сама растёт)
  {const own=cars.filter(c=>c.kind==='car'&&!c.temp);const pool=own.length+RHYTHM.dormC.length;const target=Math.round(pool*cf);let diff=own.length-target;
    const lim=first?1e9:Math.max(2,Math.ceil(Math.abs(diff)/10));
    if(diff>0){let n=0;const cand=own.filter(freeCar).sort((a,b)=>lifeDist(b.x,b.y)-lifeDist(a.x,a.y));
      for(const c of cand){if(n>=Math.min(diff,lim))break;if(!first&&lifeDist(c.x,c.y)<260)break;retireCar(c);n++;}}
    else if(diff<0){let n=0;const need=Math.min(-diff,lim);while(n<need&&wakeCar())n++;}}}
