// ===== Поездки: куда поехать — пешком, автобусом, на такси =====
const TAXI={base:99,km:22};const BUS_FARE=40;
let rtDest=null,pickingDest=false,taxiCall=null;

function destCandidates(q){const n=norm(q);const out=[];const seen=new Set();
  const add=(x,y,name,kind,score)=>{const k=name+'|'+Math.round(x/40)+'|'+Math.round(y/40);if(seen.has(k))return;seen.add(k);out.push({x,y,n:name,kind,score,d:dist(x,y,player.x,player.y)});};
  if(player.home&&(!n||'дом'.includes(n)||n.includes('дом')))add(player.home.cx,player.home.cy,'Дом','дом',3);
  if(world.kremlin&&(!n||'казанский кремль'.includes(n)||norm('Казанский Кремль').includes(n)))add(world.kremlin.x,world.kremlin.y,'Казанский Кремль','достопримечательность',2.5);
  for(const s of world.squares){const sn=norm(s.n);if(!n||sn.includes(n))add(s.x,s.y,s.n,'площадь',sn.startsWith(n)?2:1.5);}
  if(n.length>=2)for(const p of world.pois){if(!p.n)continue;const pn=norm(p.n);if(!pn.includes(n))continue;add(p.x,p.y,p.n,POI_RU[p.t]||'место',pn.startsWith(n)?2:1);}
  // ориентиры, как их называют в жизни (landmarks.js): «Кольцо», «Мега», «Ак Барс Арена»…
  const LMK={mall:'торговый центр',station:'вокзал, станция',park:'парк',stadium:'стадион, арена',sight:'достопримечательность',univ:'университет',hospital:'больница',market:'рынок'};
  if(n.length>=2&&world)for(const l of window.cityLandmarks||[]){const names=[l.name].concat(l.alias||[]).map(norm);if(!names.some(x=>x.includes(n)))continue;const m=world.meta;
    add((l.ll[1]-m.lon0)*m.mlon,-(l.ll[0]-m.lat0)*m.mlat,l.name,LMK[l.kind]||'место',names.some(x=>x.startsWith(n))?2.6:2.2);}
  // места по всему городу (map/places.json): кафе и магазины в кварталах, которые сейчас не загружены
  if(n.length>=2&&PLACES.list){let k=0;for(const p of PLACES.list){const pn=norm(p[0]);if(!pn.includes(n))continue;add(p[2]/10,p[3]/10,p[0],POI_RU[p[1]]||'место',pn.startsWith(n)?1.9:0.9);if(++k>60)break;}}
  if(n.length>=3){const best=new Map();for(const r of world.roads){if(!r.n||r.c>8)continue;const rn=norm(r.n);if(!rn.includes(n))continue;const mid=world.nodes[r.p[r.p.length>>1]];const d=dist(mid[0],mid[1],player.x,player.y);const o=best.get(r.n);if(!o||d<o.d)best.set(r.n,{x:mid[0],y:mid[1],d});}
    for(const [name,o] of best){const sc=norm(name).startsWith(n)?1.8:1.2;add(o.x,o.y,name,'улица',sc);if(out.length>40)break;}}
  else if(!n){for(const p of placesNear(player.x,player.y,600,8))add(p.x,p.y,p.n,POI_RU[p.t]||'место',0.5);}
  out.sort((a,b)=>(b.score-a.score)||(a.d-b.d));return out.slice(0,12);}
function fmtDist(m){return m<1000?Math.round(m/10)*10+' м':(m/1000).toFixed(1).replace('.',',')+' км';}
function fmtMin(sec){const m=Math.max(1,Math.round(sec/60));return m+' мин';}

const PLACES={list:null,loading:false};
function loadPlaces(){if(PLACES.list||PLACES.loading||!world||!world.meta.chunks)return;PLACES.loading=true;
  fetch('map/places.json?v='+(world.meta.v||'1')).then(r=>r.ok?r.json():null).then(j=>{PLACES.list=Array.isArray(j)?j:[];PLACES.loading=false;if(!$('#routeModal').hidden&&!rtDest)renderRouteModal();}).catch(()=>{PLACES.loading=false;});}
function openRouteModal(dest){loadPlaces();rtDest=dest||null;$('#routeModal').hidden=false;player.busy=true;$('#rtSearch').value='';renderRouteModal();setTimeout(()=>{if(!rtDest)$('#rtSearch').focus();},40);}
function closeRouteModal(){$('#routeModal').hidden=true;player.busy=false;}
$('#routeBtn').addEventListener('click',()=>openRouteModal());
$('#rtClose').addEventListener('click',closeRouteModal);
let rtSearchT=0;$('#rtSearch').addEventListener('input',()=>{rtDest=null;clearTimeout(rtSearchT);rtSearchT=setTimeout(renderRouteModal,200);});   // искать, когда перестали печатать: на каждую букву перебор всех улиц и мест
$('#rtSearch').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape')closeRouteModal();if(e.key==='Enter'){const c=destCandidates($('#rtSearch').value)[0];if(c){rtDest=c;renderRouteModal();}}});
$('#rtPick').addEventListener('click',()=>{closeRouteModal();pickingDest=true;setHint('Нажмите на карте, куда нужно попасть');canvas.style.cursor='crosshair';});
function pickDestAt(wx,wy){pickingDest=false;canvas.style.cursor='';const near=placesNear(wx,wy,40,1)[0];openRouteModal(near?{x:near.x,y:near.y,n:near.n,kind:POI_RU[near.t]||'место'}:{x:wx,y:wy,n:nearestRoadName(wx,wy)||'точка на карте',kind:'точка'});}

function pathLen(adj,ax,ay,bx,by,cost){const s=nearestNode(ax,ay,adj,150),g=nearestNode(bx,by,adj,150);if(s<0||g<0)return Infinity;const p=astar(adj,s,g,cost);if(!p||!p.length)return Infinity;let L=0;for(let i=0;i<p.length-1;i++){const a=world.nodes[p[i]],b=world.nodes[p[i+1]];L+=dist(a[0],a[1],b[0],b[1]);}return L+dist(ax,ay,world.nodes[s][0],world.nodes[s][1])+dist(bx,by,world.nodes[g][0],world.nodes[g][1]);}
function planBus(dest){let best=null;const candidates=[],fromWalk=new Map(),toWalk=new Map();
  // Общие остановки разных маршрутов проверяем один раз, только в рамках этого поиска.
  const walk=(q,from)=>{const cache=from?fromWalk:toWalk,key=q.p[0]+','+q.p[1];if(!cache.has(key))cache.set(key,from?
    pathLen(world.pedAdj,player.x,player.y,q.p[0],q.p[1],pedCost):pathLen(world.pedAdj,q.p[0],q.p[1],dest.x,dest.y,pedCost));return cache.get(key);};
  for(const r of world.routes){const pts=r.stops.map(st=>({st,p:routePoint(r,st.s)}));let b=null,bd=1e9,e=null,ed=1e9;
    for(const q of pts){const d1=dist(q.p[0],q.p[1],player.x,player.y);if(d1<bd){bd=d1;b=q;}const d2=dist(q.p[0],q.p[1],dest.x,dest.y);if(d2<ed){ed=d2;e=q;}}
    if(!b||!e||b===e||bd>500||ed>550)continue;const ride=Math.abs(e.st.s-b.st.s);if(ride<300)continue;const cost=(bd+ed)/WALK_SPEED+ride/8+60;
    candidates.push({route:r,from:b,to:e,walk1:bd,walk2:ed,ride,cost,dir:Math.sign(e.st.s-b.st.s)});}
  // Прямые расстояния — нижняя граница: более медленные кандидаты уже не требуют A*.
  candidates.sort((a,b)=>a.cost-b.cost);
  for(const c of candidates){if(best&&c.cost>=best.cost)break;const w1=walk(c.from,true);if(!Number.isFinite(w1))continue;
    if(best&&(w1+c.walk2)/WALK_SPEED+c.ride/8+60>=best.cost)continue;const w2=walk(c.to,false);if(!Number.isFinite(w2))continue;
    const cost=(w1+w2)/WALK_SPEED+c.ride/8+60;if(!best||cost<best.cost){c.walk1=w1;c.walk2=w2;c.cost=cost;
      c.nStops=c.route.stops.filter(st=>(st.s-c.from.st.s)*(c.to.st.s-c.from.st.s)>0&&Math.abs(st.s-c.from.st.s)<=c.ride+0.5).length;best=c;}}
  return best;}
function renderRouteModal(){const list=$('#rtList'),plans=$('#rtPlans');list.innerHTML='';plans.innerHTML='';
  if(!rtDest){$('#rtTitle').textContent='Куда поехать?';list.hidden=false;plans.hidden=true;$('#rtPick').hidden=false;
    const c=destCandidates($('#rtSearch').value);if(!c.length){const p=document.createElement('p');p.className='cp-empty';p.textContent='Ничего не нашлось. Попробуйте другое название или укажите точку на карте.';list.append(p);}
    for(const d of c){const b=document.createElement('button');b.className='cp-person';const t=document.createElement('b');t.textContent=d.n;const s=document.createElement('span');s.textContent=`${d.kind} · ${fmtDist(d.d)}`;b.append(t,s);b.addEventListener('click',()=>{rtDest=d;renderRouteModal();});list.append(b);}return;}
  $('#rtTitle').textContent=`Как добраться: ${rtDest.n}`;list.hidden=true;plans.hidden=false;$('#rtPick').hidden=true;const d=rtDest;
  const card=(icon,title,lines,btn,fn,dis)=>{const el=document.createElement('div');el.className='rt-card';const h=document.createElement('b');h.textContent=icon+' '+title;el.append(h);for(const l of lines){const s=document.createElement('span');s.textContent=l;el.append(s);}const bt=document.createElement('button');bt.className='btn primary';bt.textContent=btn;bt.disabled=!!dis;bt.addEventListener('click',fn);el.append(bt);plans.append(el);};
  if(player.vehicle){const v=player.vehicle;
    card(journeyIcon(v.kind),'Вы уже в транспорте',[v.kind==='taxi'?'Сначала завершите текущую поездку':`Продолжить на ${v.spec.word}`],v.kind==='taxi'?'Идёт поездка':'Ехать сюда',()=>{if(driveTo(d.x,d.y,true)){v.dest=journeyDest(d);closeRouteModal();updateTripBox();}},v.kind==='taxi');return;}
  if(player.bus){card('🚌','Вы уже в автобусе',['Сначала выйдите на остановке'],'Идёт поездка',()=>{},true);return;}
  if(scene!=='city'){card('🚪','Сначала выйдите на улицу',['Выбрать поездку можно снаружи'],'В помещении',()=>{},true);return;}
  const walkL=pathLen(world.pedAdj,player.x,player.y,d.x,d.y,pedCost),canWalk=Number.isFinite(walkL);
  card('🚶','Пешком',canWalk?[`${fmtDist(walkL)} · ≈ ${fmtMin(walkL/WALK_SPEED)}`,'Бесплатно. Ожидание на переходах может увеличить время']:['Маршрут пока не найден'],'Идти',()=>{closeRouteModal();startWalkNav(d);},!canWalk);
  let bp=planBus(d);if(bp&&bp.cost>walkL/WALK_SPEED*0.85)bp=null;
  if(bp)card(bp.route.type==='tram'?'🚋':bp.route.type==='trolleybus'?'🚎':'🚌',`${busWord(bp.route.type)} ${bp.route.ref}`,[`Пешком ${fmtDist(bp.walk1)} до «${bp.from.st.n}»`,`${bp.nStops} ост. до «${bp.to.st.n}», дальше ${fmtDist(bp.walk2)} пешком`,`≈ ${fmtMin(bp.cost)} · ${BUS_FARE} ₽`],'Поехать',()=>{closeRouteModal();startBusPlan(bp,d);},player.money<BUS_FARE);
  else card('🚌','Автобус',['Пешком тут быстрее, или подходящего маршрута рядом нет'],'—',()=>{},true);
  const carL=pathLen(world.carAdj,player.x,player.y,d.x,d.y,carCost);const fare=Math.round(TAXI.base+carL/1000*TAXI.km);
  card('🚕','Такси',Number.isFinite(carL)?[`${fmtDist(carL)} · ≈ ${fmtMin(carL/9+40)} с подачей`,`≈ ${fare} ₽ (${TAXI.base} ₽ подача + ${TAXI.km} ₽/км)`]:['Машине пока не найден путь'],'Вызвать',()=>{closeRouteModal();callTaxi(d);},!Number.isFinite(carL)||player.money<fare);
  journeyCards(card,d);
  const back=document.createElement('button');back.className='btn';back.textContent='← Другое место';back.addEventListener('click',()=>{rtDest=null;renderRouteModal();});plans.append(back);}

// ---------- автобус по плану ----------
function startBusPlan(bp,dest){cancelTrip(true);const r=bp.route;const sp=bp.from.p;let ws=null,wd=60;for(const s of world.stops){const dd=dist(s.x,s.y,sp[0],sp[1]);if(dd<wd){wd=dd;ws=s;}}
  const stopPt=ws?[ws.x,ws.y]:sp;if(!journeyAvailable()||player.money<BUS_FARE)return false;
  if(!walkTo(stopPt[0],stopPt[1],true)){setHint('До остановки не пройти. Выберите другой способ');updateTripBox();return false;}
  player.busPlan={route:r,dir:bp.dir,s1:bp.to.st.s,toName:bp.to.st.n,fromName:bp.from.st.n,dest,stopPt,stage:'walk'};
  followPlayer();addEvent(`Маршрут: ${busWord(r.type).toLowerCase()} ${r.ref} от «${bp.from.st.n}» до «${bp.to.st.n}»`);updateTripBox();return true;}
function busPlanOk(bus){const p=player.busPlan;return !p||(bus.route===p.route&&bus.dir===p.dir);}
function busPlanExit(bus,stop){const p=player.busPlan;return !!(p&&p.stage==='ride'&&Math.abs(stop.s-p.s1)<1);}
function busPlanArrived(){const p=player.busPlan;if(!p)return;player.busPlan=null;addEvent(`Вышли на «${p.toName}»`);journeyFinishFoot(p.dest);updateTripBox();}

// ---------- такси ----------
function callTaxi(dest){if(!journeyAvailable()||!journeyDest(dest)){setHint('Сначала завершите текущую поездку');return false;}
  const len=pathLen(world.carAdj,player.x,player.y,dest.x,dest.y,carCost);if(!Number.isFinite(len)||player.money<Math.round(TAXI.base+len/1000*TAXI.km)){setHint('Нет маршрута или не хватает денег на такси');return false;}
  cancelTrip(true);let car=null,bd=1e9;for(const c of cars){if(c.kind!=='taxi'||c.crashed||c.target!=null||c.taxiFor||c.state==='scene')continue;const d=dist(c.x,c.y,player.x,player.y);if(d<bd&&d<900){bd=d;car=c;}}
  if(!car){car=new Car('taxi',nodeNear(world.carNodes,[player.x,player.y],350));cars.push(car);bd=dist(car.x,car.y,player.x,player.y);}
  const pickup=nearestNode(player.x,player.y,world.carAdj,200);car.taxiFor=true;car.target=pickup;car.path=null;car.state='idle';car.ttl=0.05;car.vmax=14;
  taxiCall={car,dest,state:'coming',t:0};car.onScene=()=>{if(taxiCall&&taxiCall.car===car){taxiCall.state='here';addEvent('Такси подъехало');setHint('Такси ждёт: подойдите и нажмите E');updateTripBox();}};
  addEvent(`Вызвали такси: ${dest.n}. Подача ≈ ${fmtMin(bd/9+20)}`);updateTripBox();return true;}
function boardTaxi(){const tc=taxiCall;if(!tc||tc.state!=='here'||!journeyAvailable())return false;const c=tc.car;
  if(!c||c.remove||!cars.includes(c)){setHint('Машина уже уехала. Вызовите другую');cancelTrip(true);return false;}
  if(c.crashed||dist(c.x,c.y,player.x,player.y)>9){setHint('Машина ждёт у обочины — подойдите ближе');return false;}
  const route=vehiclePath({kind:'taxi',x:c.x,y:c.y},tc.dest.x,tc.dest.y,true);if(!route)return false;
  if(player.money<(tc.fixedFare==null?TAXI.base:tc.fixedFare)){setHint('Не хватает денег на посадку');return false;}
  const i=cars.indexOf(c);if(i>=0)cars.splice(i,1);taxiCall=null;cancelTrip(true);
  player.vehicle={kind:'taxi',x:c.x,y:c.y,hx:c.hx,hy:c.hy,speed:0,spec:VEH.taxi,startMin:clock.minutes,auto:null,damaged:0,color:'#F4C542',crashedLook:false,odo:0,dest:tc.dest};
  const v=player.vehicle;v.driver=tc.driver;v.fixedFare=tc.fixedFare==null?null:tc.fixedFare;
  journeyHint('boarding',c,player.x,player.y,c.x,c.y);player.x=c.x;player.y=c.y;
  if(tc.folkDriver&&typeof folkTaxiStart==='function')folkTaxiStart(tc.folkDriver,v);
  player.waypoints=null;player.waitingStop=null;player.vehicle.auto={wps:route,i:0};addEvent(`Едем на такси: ${tc.dest.n}`);updateTripBox();return true;}
function taxiExit(){const v=player.vehicle;const km=(v.odo||0)/1000;const fare=v.fixedFare!=null?v.fixedFare:Math.round(TAXI.base+km*TAXI.km);journeyCharge(fare,'Оплата такси');   // бомбила из своих людей — цена, о которой договорились
  addEvent(v.fixedFare!=null?`Бомбила ${v.driver||''}: ${km.toFixed(1).replace('.',',')} км, ${fare} ₽ — как договорились`:`Такси: ${km.toFixed(1).replace('.',',')} км, ${fare} ₽`);const c=new Car('taxi',nearestNode(v.x,v.y,world.carAdj,120));c.x=v.x;c.y=v.y;c.hx=v.hx;c.hy=v.hy;c.ttl=2;cars.push(c);if(Math.random()<0.15)startSit('forgot',{car:c});
  let ex=v.x-v.hy*1.8,ey=v.y+v.hx*1.8;if(inBuilding(ex,ey)){ex=v.x+v.hy*1.8;ey=v.y-v.hx*1.8;}player.x=ex;player.y=ey;const dest=v.dest;player.vehicle=null;
  journeyHint('exiting',v,v.x,v.y,player.x,player.y);if(typeof folkTaxiEnd==='function')folkTaxiEnd(v);
  if(dest)journeyFinishFoot(dest);updateTripBox();}
function cancelTrip(silent){JOURNEY.rental=null;JOURNEY.resume=null;if(!player.vehicle&&!player.bus)player.waypoints=null;if(taxiCall){const c=taxiCall.car;c.taxiFor=false;c.target=null;c.onScene=null;c.state='idle';c.ttl=0.5;taxiCall=null;if(!silent)addEvent('Такси отменено');}
  if(player.busPlan){player.busPlan=null;player.waitingStop=null;if(!silent)addEvent('Поездка на автобусе отменена');}
  if(player.navDest){player.navDest=null;player.navPaused=false;player.waypoints=null;if(!silent)addEvent('Маршрут отменён');}updateTripBox();}
function updateTransport(dt){const p=player.busPlan;
  if(p&&p.stage==='walk'&&!player.bus&&!player.vehicle&&!player.inside&&dist(player.x,player.y,p.stopPt[0],p.stopPt[1])<7){p.stage='wait';player.waypoints=null;player.waitingStop={x:p.stopPt[0],y:p.stopPt[1],n:p.fromName};setHint(`Ждём ${busWord(p.route.type).toLowerCase()} ${p.route.ref} на «${p.fromName}»`);updateTripBox();}
  if(p&&p.stage==='wait'&&player.bus){p.stage='ride';updateTripBox();}
  if(taxiCall){taxiCall.t+=dt;const c=taxiCall.car;if(c.crashed||c.remove||(taxiCall.state==='coming'&&taxiCall.t>150)){addEvent('Таксист не смог подъехать — вызовите ещё раз');cancelTrip(true);}}
  tripTimer-=dt;if(tripTimer<=0){tripTimer=0.5;journeyTick();navTick();updateTripBox();}}
let tripTimer=0;
// ---------- пешком на автопилоте: идёт сам; джойстик или WASD — пауза, идёте сами; «Продолжить» — снова ведёт ----------
function startWalkNav(d){if(!journeyAvailable())return false;cancelTrip(true);let target=journeyDest(d);if(!target)return false;
  if(inBuilding(target.x,target.y)){const q=toSidewalk(target.x,target.y);target.x=q[0];target.y=q[1];}
  player.navDest=target;player.navPaused=false;followPlayer();const ok=walkTo(target.x,target.y,true);if(!ok)player.navPaused=true;
  addEvent(`Идём пешком: ${d.n}. Джойстик — пойти самому`);updateTripBox();return ok;}
function navPause(){if(player.navDest&&!player.navPaused){player.navPaused=true;updateTripBox();}}
function navResume(){const d=player.navDest;if(!d)return;player.navPaused=false;followPlayer();walkTo(d.x,d.y,true);updateTripBox();}
function navTick(){const d=player.navDest;if(!d||player.navPaused)return;if(player.bus||player.vehicle||player.inside){player.navDest=null;updateTripBox();return;}
  if(dist(player.x,player.y,d.x,d.y)<14){player.navDest=null;player.waypoints=null;addEvent(`Пришли: ${d.n}`);setHint(`Вы на месте: ${d.n}`);updateTripBox();return;}
  if(!player.waypoints&&!player.crossWait){player.navPaused=true;updateTripBox();}}
function updateTripBox(){const b=$('#tripBox');let t=null;const p=player.busPlan;
  if(taxiCall)t=taxiCall.state==='here'?`🚕 Такси ждёт · ${fmtDist(dist(taxiCall.car.x,taxiCall.car.y,player.x,player.y))}`:`🚕 Такси едет к вам · ${fmtDist(dist(taxiCall.car.x,taxiCall.car.y,player.x,player.y))}`;
  else if(player.vehicle&&player.vehicle.kind==='taxi')t=`🚕 Едем: ${player.vehicle.dest.n} · ${fmtDist(dist(player.x,player.y,player.vehicle.dest.x,player.vehicle.dest.y))}`;
  else if(player.navDest)t=player.navPaused?`🚶 Пауза: ${player.navDest.n} · ${fmtDist(dist(player.x,player.y,player.navDest.x,player.navDest.y))}`:`🚶 Идём: ${player.navDest.n} · ${fmtDist(dist(player.x,player.y,player.navDest.x,player.navDest.y))}`;
  else if(p)t=p.stage==='walk'?`🚌 Идём к остановке «${p.fromName}» (${p.route.ref})`:p.stage==='wait'?`🚌 Ждём ${p.route.ref} на «${p.fromName}»`:`🚌 ${p.route.ref} · выходим на «${p.toName}»`;
  if(!t)t=journeyText();if(!t){b.hidden=true;return;}b.hidden=false;$('#tripLbl').textContent=t;$('#tripCancel').textContent=player.vehicle?'Выйти здесь':'Отменить';const rs=$('#tripResume');if(rs){rs.hidden=!(player.navDest&&player.navPaused)&&!JOURNEY.resume;rs.textContent=JOURNEY.resume?'Выбрать транспорт':'Продолжить';}}
$('#tripCancel').addEventListener('click',()=>{if(player.vehicle){player.vehicle.dest=null;exitVehicle();return;}cancelTrip();});
$('#tripResume').addEventListener('click',()=>{if(JOURNEY.resume)openRouteModal(JOURNEY.resume);else navResume();});
function routeOverlay(toS){const d=(player.vehicle&&player.vehicle.dest)||(taxiCall&&taxiCall.dest)||(player.busPlan&&player.busPlan.dest);if(!d)return;const [sx,sy]=toS(d.x,d.y);
  if(sx<0||sx>W||sy<0||sy>H)return;ctx.save();ctx.fillStyle='rgba(43,176,98,.95)';ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx-7,sy-14);ctx.arc(sx,sy-16,7,Math.PI*0.8,Math.PI*0.2);ctx.closePath();ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(sx,sy-16,2.8,0,TAU);ctx.fill();
  if(taxiCall){const [cx,cy]=toS(taxiCall.car.x,taxiCall.car.y);ctx.strokeStyle='#F4C542';ctx.lineWidth=3;ctx.beginPath();ctx.arc(cx,cy,10,0,TAU);ctx.stroke();}ctx.restore();}
