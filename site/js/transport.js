// ===== Поездки: куда поехать — пешком, автобусом, на такси =====
const TAXI={base:99,km:22};const BUS_FARE=40;
let rtDest=null,pickingDest=false,taxiCall=null;

function destCandidates(q){const n=norm(q);const out=[];const seen=new Set();
  const add=(x,y,name,kind,score)=>{const k=name+'|'+Math.round(x/40)+'|'+Math.round(y/40);if(seen.has(k))return;seen.add(k);out.push({x,y,n:name,kind,score,d:dist(x,y,player.x,player.y)});};
  if(player.home&&(!n||'дом'.includes(n)||n.includes('дом')))add(player.home.cx,player.home.cy,'Дом','дом',3);
  if(world.kremlin&&(!n||'казанский кремль'.includes(n)||norm('Казанский Кремль').includes(n)))add(world.kremlin.x,world.kremlin.y,'Казанский Кремль','достопримечательность',2.5);
  for(const s of world.squares){const sn=norm(s.n);if(!n||sn.includes(n))add(s.x,s.y,s.n,'площадь',sn.startsWith(n)?2:1.5);}
  if(n.length>=2)for(const p of world.pois){if(!p.n)continue;const pn=norm(p.n);if(!pn.includes(n))continue;add(p.x,p.y,p.n,POI_RU[p.t]||'место',pn.startsWith(n)?2:1);}
  if(n.length>=3){const best=new Map();for(const r of world.roads){if(!r.n||r.c>8)continue;const rn=norm(r.n);if(!rn.includes(n))continue;const mid=world.nodes[r.p[r.p.length>>1]];const d=dist(mid[0],mid[1],player.x,player.y);const o=best.get(r.n);if(!o||d<o.d)best.set(r.n,{x:mid[0],y:mid[1],d});}
    for(const [name,o] of best){const sc=norm(name).startsWith(n)?1.8:1.2;add(o.x,o.y,name,'улица',sc);if(out.length>40)break;}}
  else if(!n){for(const p of placesNear(player.x,player.y,600,8))add(p.x,p.y,p.n,POI_RU[p.t]||'место',0.5);}
  out.sort((a,b)=>(b.score-a.score)||(a.d-b.d));return out.slice(0,12);}
function fmtDist(m){return m<1000?Math.round(m/10)*10+' м':(m/1000).toFixed(1).replace('.',',')+' км';}
function fmtMin(sec){const m=Math.max(1,Math.round(sec/60));return m+' мин';}

function openRouteModal(dest){rtDest=dest||null;$('#routeModal').hidden=false;player.busy=true;$('#rtSearch').value='';renderRouteModal();setTimeout(()=>{if(!rtDest)$('#rtSearch').focus();},40);}
function closeRouteModal(){$('#routeModal').hidden=true;player.busy=false;}
$('#routeBtn').addEventListener('click',()=>openRouteModal());
$('#rtClose').addEventListener('click',closeRouteModal);
$('#rtSearch').addEventListener('input',()=>{rtDest=null;renderRouteModal();});
$('#rtSearch').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape')closeRouteModal();if(e.key==='Enter'){const c=destCandidates($('#rtSearch').value)[0];if(c){rtDest=c;renderRouteModal();}}});
$('#rtPick').addEventListener('click',()=>{closeRouteModal();pickingDest=true;setHint('Нажмите на карте, куда нужно попасть');canvas.style.cursor='crosshair';});
function pickDestAt(wx,wy){pickingDest=false;canvas.style.cursor='';const near=placesNear(wx,wy,40,1)[0];openRouteModal(near?{x:near.x,y:near.y,n:near.n,kind:POI_RU[near.t]||'место'}:{x:wx,y:wy,n:nearestRoadName(wx,wy)||'точка на карте',kind:'точка'});}

function pathLen(adj,ax,ay,bx,by,cost){const s=nearestNode(ax,ay,adj,150),g=nearestNode(bx,by,adj,150);const p=astar(adj,s,g,cost);if(!p)return dist(ax,ay,bx,by)*1.4;let L=0;for(let i=0;i<p.length-1;i++){const a=world.nodes[p[i]],b=world.nodes[p[i+1]];L+=dist(a[0],a[1],b[0],b[1]);}return L+dist(ax,ay,world.nodes[s][0],world.nodes[s][1])+dist(bx,by,world.nodes[g][0],world.nodes[g][1]);}
function planBus(dest){let best=null;
  for(const r of world.routes){const pts=r.stops.map(st=>({st,p:routePoint(r,st.s)}));let b=null,bd=1e9,e=null,ed=1e9;
    for(const q of pts){const d1=dist(q.p[0],q.p[1],player.x,player.y);if(d1<bd){bd=d1;b=q;}const d2=dist(q.p[0],q.p[1],dest.x,dest.y);if(d2<ed){ed=d2;e=q;}}
    if(!b||!e||b===e||bd>500||ed>550)continue;const ride=Math.abs(e.st.s-b.st.s);if(ride<300)continue;const cost=(bd+ed)/3+ride/8+60;
    if(!best||cost<best.cost){const nStops=r.stops.filter(st=>(st.s-b.st.s)*(e.st.s-b.st.s)>0&&Math.abs(st.s-b.st.s)<=ride+0.5).length;best={route:r,from:b,to:e,walk1:bd,walk2:ed,ride,cost,dir:Math.sign(e.st.s-b.st.s),nStops};}}
  return best;}
function renderRouteModal(){const list=$('#rtList'),plans=$('#rtPlans');list.innerHTML='';plans.innerHTML='';
  if(!rtDest){$('#rtTitle').textContent='Куда поехать?';list.hidden=false;plans.hidden=true;$('#rtPick').hidden=false;
    const c=destCandidates($('#rtSearch').value);if(!c.length){const p=document.createElement('p');p.className='cp-empty';p.textContent='Ничего не нашлось. Попробуйте другое название или укажите точку на карте.';list.append(p);}
    for(const d of c){const b=document.createElement('button');b.className='cp-person';const t=document.createElement('b');t.textContent=d.n;const s=document.createElement('span');s.textContent=`${d.kind} · ${fmtDist(d.d)}`;b.append(t,s);b.addEventListener('click',()=>{rtDest=d;renderRouteModal();});list.append(b);}return;}
  $('#rtTitle').textContent=`Как добраться: ${rtDest.n}`;list.hidden=true;plans.hidden=false;$('#rtPick').hidden=true;const d=rtDest;
  const card=(icon,title,lines,btn,fn,dis)=>{const el=document.createElement('div');el.className='rt-card';const h=document.createElement('b');h.textContent=icon+' '+title;el.append(h);for(const l of lines){const s=document.createElement('span');s.textContent=l;el.append(s);}const bt=document.createElement('button');bt.className='btn primary';bt.textContent=btn;bt.disabled=!!dis;bt.addEventListener('click',fn);el.append(bt);plans.append(el);};
  const walkL=pathLen(world.pedAdj,player.x,player.y,d.x,d.y,pedCost);
  card('🚶','Пешком',[`${fmtDist(walkL)} · ≈ ${fmtMin(walkL/3)}`,'Бесплатно. Персонаж пойдёт сам и подождёт машины перед переходом'],'Идти',()=>{closeRouteModal();startWalkNav(d);});
  let bp=planBus(d);if(bp&&bp.cost>walkL/3*0.85)bp=null;
  if(bp)card(bp.route.type==='tram'?'🚋':bp.route.type==='trolleybus'?'🚎':'🚌',`${busWord(bp.route.type)} ${bp.route.ref}`,[`Пешком ${fmtDist(bp.walk1)} до «${bp.from.st.n}»`,`${bp.nStops} ост. до «${bp.to.st.n}», дальше ${fmtDist(bp.walk2)} пешком`,`≈ ${fmtMin(bp.cost)} · ${BUS_FARE} ₽`],'Поехать',()=>{closeRouteModal();startBusPlan(bp,d);},player.money<BUS_FARE);
  else card('🚌','Автобус',['Пешком тут быстрее, или подходящего маршрута рядом нет'],'—',()=>{},true);
  const carL=pathLen(world.carAdj,player.x,player.y,d.x,d.y,carCost);const fare=Math.round(TAXI.base+carL/1000*TAXI.km);
  card('🚕','Такси',[`${fmtDist(carL)} · ≈ ${fmtMin(carL/9+40)} с подачей`,`≈ ${fare} ₽ (${TAXI.base} ₽ подача + ${TAXI.km} ₽/км)`],'Вызвать',()=>{closeRouteModal();callTaxi(d);},player.money<fare);
  const back=document.createElement('button');back.className='btn';back.textContent='← Другое место';back.addEventListener('click',()=>{rtDest=null;renderRouteModal();});plans.append(back);}

// ---------- автобус по плану ----------
function startBusPlan(bp,dest){cancelTrip(true);const r=bp.route;const sp=bp.from.p;let ws=null,wd=60;for(const s of world.stops){const dd=dist(s.x,s.y,sp[0],sp[1]);if(dd<wd){wd=dd;ws=s;}}
  const stopPt=ws?[ws.x,ws.y]:sp;player.busPlan={route:r,dir:bp.dir,s1:bp.to.st.s,toName:bp.to.st.n,fromName:bp.from.st.n,dest,stopPt,stage:'walk'};
  followPlayer();walkTo(stopPt[0],stopPt[1],true);addEvent(`Маршрут: ${busWord(r.type).toLowerCase()} ${r.ref} от «${bp.from.st.n}» до «${bp.to.st.n}»`);updateTripBox();}
function busPlanOk(bus){const p=player.busPlan;return !p||(bus.route===p.route&&bus.dir===p.dir);}
function busPlanExit(bus,stop){const p=player.busPlan;return !!(p&&p.stage==='ride'&&Math.abs(stop.s-p.s1)<1);}
function busPlanArrived(){const p=player.busPlan;if(!p)return;player.busPlan=null;addEvent(`Вышли на «${p.toName}»`);if(dist(player.x,player.y,p.dest.x,p.dest.y)>12){walkTo(p.dest.x,p.dest.y,true);setHint(`Дальше пешком: ${p.dest.n}`);}updateTripBox();}

// ---------- такси ----------
function callTaxi(dest){cancelTrip(true);let car=null,bd=1e9;for(const c of cars){if(c.kind!=='taxi'||c.crashed||c.target!=null||c.taxiFor||c.state==='scene')continue;const d=dist(c.x,c.y,player.x,player.y);if(d<bd&&d<900){bd=d;car=c;}}
  if(!car){car=new Car('taxi',nodeNear(world.carNodes,[player.x,player.y],350));cars.push(car);bd=dist(car.x,car.y,player.x,player.y);}
  const pickup=nearestNode(player.x,player.y,world.carAdj,200);car.taxiFor=true;car.target=pickup;car.path=null;car.state='idle';car.ttl=0.05;car.vmax=14;
  taxiCall={car,dest,state:'coming',t:0};car.onScene=()=>{if(taxiCall&&taxiCall.car===car){taxiCall.state='here';addEvent('Такси подъехало');setHint('Такси ждёт: подойдите и нажмите E');updateTripBox();}};
  addEvent(`Вызвали такси: ${dest.n}. Подача ≈ ${fmtMin(bd/9+20)}`);updateTripBox();}
function boardTaxi(){const tc=taxiCall;if(!tc)return;const c=tc.car;const i=cars.indexOf(c);if(i>=0)cars.splice(i,1);taxiCall=null;
  player.vehicle={kind:'taxi',x:c.x,y:c.y,hx:c.hx,hy:c.hy,speed:0,spec:VEH.taxi,startMin:clock.minutes,auto:null,damaged:0,color:'#F4C542',crashedLook:false,odo:0,dest:tc.dest};
  player.waypoints=null;driveTo(tc.dest.x,tc.dest.y,true);addEvent(`Едем на такси: ${tc.dest.n}`);updateTripBox();}
function taxiExit(){const v=player.vehicle;const km=(v.odo||0)/1000;const fare=Math.round(TAXI.base+km*TAXI.km);player.money=Math.max(0,player.money-fare);
  addEvent(`Такси: ${km.toFixed(1).replace('.',',')} км, ${fare} ₽`);const c=new Car('taxi',nearestNode(v.x,v.y,world.carAdj,120));c.x=v.x;c.y=v.y;c.hx=v.hx;c.hy=v.hy;c.ttl=2;cars.push(c);if(Math.random()<0.15)startSit('forgot',{car:c});
  let ex=v.x-v.hy*1.8,ey=v.y+v.hx*1.8;if(inBuilding(ex,ey)){ex=v.x+v.hy*1.8;ey=v.y-v.hx*1.8;}player.x=ex;player.y=ey;const dest=v.dest;player.vehicle=null;
  if(dest&&dist(player.x,player.y,dest.x,dest.y)>12)walkTo(dest.x,dest.y,true);updateTripBox();}
function cancelTrip(silent){if(taxiCall){const c=taxiCall.car;c.taxiFor=false;c.target=null;c.onScene=null;c.state='idle';c.ttl=0.5;taxiCall=null;if(!silent)addEvent('Такси отменено');}
  if(player.busPlan){player.busPlan=null;player.waitingStop=null;if(!silent)addEvent('Поездка на автобусе отменена');}
  if(player.navDest){player.navDest=null;player.navPaused=false;player.waypoints=null;if(!silent)addEvent('Маршрут отменён');}updateTripBox();}
function updateTransport(dt){const p=player.busPlan;
  if(p&&p.stage==='walk'&&!player.bus&&dist(player.x,player.y,p.stopPt[0],p.stopPt[1])<7){p.stage='wait';player.waypoints=null;player.waitingStop={x:p.stopPt[0],y:p.stopPt[1],n:p.fromName};setHint(`Ждём ${busWord(p.route.type).toLowerCase()} ${p.route.ref} на «${p.fromName}»`);updateTripBox();}
  if(p&&p.stage==='wait'&&player.bus){p.stage='ride';updateTripBox();}
  if(taxiCall){taxiCall.t+=dt;const c=taxiCall.car;if(c.crashed||c.remove||(taxiCall.state==='coming'&&taxiCall.t>150)){addEvent('Таксист не смог подъехать — вызовите ещё раз');cancelTrip(true);}}
  tripTimer-=dt;if(tripTimer<=0){tripTimer=0.5;navTick();updateTripBox();}}
let tripTimer=0;
// ---------- пешком на автопилоте: идёт сам; джойстик или WASD — пауза, идёте сами; «Продолжить» — снова ведёт ----------
function startWalkNav(d){cancelTrip(true);player.navDest={x:d.x,y:d.y,n:d.n};player.navPaused=false;followPlayer();walkTo(d.x,d.y,true);addEvent(`Идём пешком: ${d.n}. Джойстик — пойти самому`);updateTripBox();}
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
  if(!t){b.hidden=true;return;}b.hidden=false;$('#tripLbl').textContent=t;const inTaxi=!!(player.vehicle&&player.vehicle.kind==='taxi');$('#tripCancel').textContent=inTaxi?'Выйти здесь':'Отменить';const rs=$('#tripResume');if(rs)rs.hidden=!(player.navDest&&player.navPaused);}
$('#tripCancel').addEventListener('click',()=>{if(player.vehicle&&player.vehicle.kind==='taxi'){exitVehicle();return;}cancelTrip();});
$('#tripResume').addEventListener('click',navResume);
function routeOverlay(toS){const d=(player.vehicle&&player.vehicle.dest)||(taxiCall&&taxiCall.dest)||(player.busPlan&&player.busPlan.dest);if(!d)return;const [sx,sy]=toS(d.x,d.y);
  if(sx<0||sx>W||sy<0||sy>H)return;ctx.save();ctx.fillStyle='rgba(43,176,98,.95)';ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx-7,sy-14);ctx.arc(sx,sy-16,7,Math.PI*0.8,Math.PI*0.2);ctx.closePath();ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(sx,sy-16,2.8,0,TAU);ctx.fill();
  if(taxiCall){const [cx,cy]=toS(taxiCall.car.x,taxiCall.car.y);ctx.strokeStyle='#F4C542';ctx.lineWidth=3;ctx.beginPath();ctx.arc(cx,cy,10,0,TAU);ctx.stroke();}ctx.restore();}
