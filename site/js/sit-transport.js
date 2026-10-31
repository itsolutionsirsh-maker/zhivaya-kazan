// ===== Транспорт: оплата проезда и контролёры, вещи в такси, эвакуатор и штрафстоянка, камеры скорости, объезд ДТП =====

// ---------- проезд в автобусе ----------
defSit('fare',{title:'Оплата проезда',quiet:true,multi:false,
  start(s){if(typeof errandCityRide==='function'&&errandCityRide('bus')){player.fare='paid';sitCard({s,icon:'🎫',tone:'good',title:'Проезд',text:'По поручению проезд оплатил город.',ttl:4,choices:[{t:'Ок',primary:true,run:()=>endSit(s)}],onTimeout:()=>endSit(s)});return true;}
    if(player.money<BUS_FARE){player.fare='hare';setHint('На проезд не хватает — едете зайцем');return false;}
    sitCard({s,icon:'🎫',title:`Проезд ${BUS_FARE} ₽`,text:'Приложить карту к валидатору?',ttl:8,
      choices:[{t:`Оплатить ${BUS_FARE} ₽`,primary:true,run:()=>{if(player.money>=BUS_FARE){player.money-=BUS_FARE;player.fare='paid';}else player.fare='hare';endSit(s);}},{t:'Проехать зайцем',run:()=>{player.fare='hare';endSit(s);}}],
      onTimeout:()=>{if(player.money>=BUS_FARE){player.money-=BUS_FARE;player.fare='paid';}else player.fare='hare';endSit(s);}});return true;}});
const busRide={bus:null,stops:0,last:null,checked:false};
defWatch(()=>{const b=player.bus;if(!b){busRide.bus=null;return;}
  if(busRide.bus!==b){busRide.bus=b;busRide.stops=0;busRide.last=b.nextStop;busRide.checked=false;return;}
  if(b.nextStop!==busRide.last){busRide.last=b.nextStop;busRide.stops++;if(!busRide.checked&&player.fare&&busRide.stops>=1&&Math.random()<0.3){busRide.checked=true;startSit('controller',{bus:b});}}});
defSit('controller',{title:'Контролёры',quiet:true,cool:60,
  start(s){if(!player.bus||!player.fare)return false;
    if(player.fare!=='hare'){sitCard({s,icon:'🎫',tone:'good',title:'Контролёры',text:'«Предъявите оплату проезда». Вы прикладываете карту — валидатор пищит зелёным. Всё в порядке.',ttl:5,choices:[{t:'Ок',primary:true,run:()=>endSit(s)}],onTimeout:()=>endSit(s)});return true;}
    sitCard({s,icon:'🎫',tone:'alert',title:'Контролёры!',text:'На остановке в салон зашли двое в жилетах: «Граждане, оплачиваем проезд, предъявляем карты». У вас оплаты нет.',ttl:14,
      choices:[{t:'Заплатить штраф 1 000 ₽',primary:true,run:()=>{sitMoney(-1000,'Штраф за безбилетный проезд');player.fare='paid';endSit(s);}},
        {t:'«Я карту забыл, можно оплатить сейчас?»',run:()=>{if(Math.random()<0.3&&player.money>=BUS_FARE){player.money-=BUS_FARE;player.fare='paid';addEvent('Контролёр смягчился: «Ладно, оплачивайте». −40 ₽');}else{sitMoney(-1000,'«Все так говорят». Штраф за безбилетный проезд');player.fare='paid';}endSit(s);}},
        {t:'Выскочить на следующей',run:()=>{if(Math.random()<0.5){player.exitNext=true;sitRep(-1);addEvent('Вы протиснулись к двери и выскочили на следующей');}else{sitMoney(-1000,'Контролёр перекрыл дверь. Штраф за безбилетный проезд');sitMood(-6);player.fare='paid';}endSit(s);}}],
      onTimeout:()=>{sitMoney(-1000,'Штраф за безбилетный проезд');player.fare='paid';endSit(s);}});return true;}});

// ---------- забыли вещи в такси ----------
defSit('forgot',{title:'Вещи в такси',quiet:true,cool:600,
  start(s){s.t1=rnd(5,9);return true;},
  update(s,dt){if(s.t1!=null){s.t1-=dt;if(s.t1<=0){s.t1=null;const what=pick(['пакет с продуктами','зонтик','пакет с покупками']);s.what=what;
      sitCard({s,icon:'🚕',tone:'alert',title:'Забыли в такси!',text:`Хватились — а ${what} остался на заднем сиденье.`,ttl:15,
        choices:[{t:'Позвонить в службу такси',primary:true,run:()=>forgotCall(s)},{t:'Махнуть рукой',run:()=>{forgotLose(s);endSit(s);}}],onTimeout:()=>{forgotLose(s);endSit(s);}});}}
    if(s.phase==='coming'){const c=s.car;if(!c||!cars.includes(c)){s.phase='courier';s.cw=rnd(50,90);addEvent('Служба такси: «Водитель уже на другом заказе, привезём курьером»');}
      else if(c.state==='scene'&&!s.here){s.here=true;mark(s,'fcar',c.x,c.y,'🚕','Ваш таксист',{color:'#F4C542',arrow:true});addEvent('Таксист вернулся с вашими вещами — подойдите к машине');}}
    if(s.phase==='courier'){s.cw-=dt;if(s.cw<=0){sitMoney(-150,`Курьер привёз ${s.what} — оплата доставки`);endSit(s);}}},
  action(s){const c=s.car;if(s.phase==='coming'&&s.here&&c&&dist(c.x,c.y,player.x,player.y)<7&&!player.vehicle)return {label:`Забрать ${s.what} у таксиста`,run:()=>{unmark('fcar');
    sitCard({s,icon:'🚕',tone:'good',title:'Таксист вернул вещи',text:'«Держите, в следующий раз проверяйте сиденье!»',ttl:10,choices:[{t:'Дать на чай 100 ₽',primary:true,run:()=>{sitMoney(-100);sitRep(1);forgotDone(s);}},{t:'Спасибо!',run:()=>forgotDone(s)}],onTimeout:()=>forgotDone(s)});}};return null;},
  end(s){const c=s.car;if(c&&cars.includes(c)){c.target=null;c.onScene=null;c.taxiFor=false;if(c.state==='scene'){c.state='idle';c.ttl=1;}}}});
function forgotCall(s){const c=s.car;if(!c||!cars.includes(c)||c.crashed){s.phase='courier';s.cw=rnd(50,90);addEvent('Служба такси: «Привезём курьером, 150 ₽»');return;}
  const n=nearestNode(player.x,player.y,world.carAdj,200);if(n<0){s.phase='courier';s.cw=60;return;}
  // таксист уже далеко уехал — по карте «разворачивается» ближайший к вам маршрут (та же машина для игрока)
  if(dist(c.x,c.y,player.x,player.y)>120){const sn=emergencyStart({x:player.x,y:player.y},n);if(sn>=0){const p=world.nodes[sn];c.node=sn;c.x=p[0];c.y=p[1];c.path=null;}}
  c.taxiFor=true;c.creep=null;c.target=n;c.path=null;c.state='idle';c.ttl=0.3;c.onScene=()=>{};s.phase='coming';addEvent('Служба такси: «Водитель развернулся и едет к вам»');}
function forgotLose(s){if(/продукт/.test(s.what||'')&&player.pantry>0)player.pantry--;sitMood(-6);addEvent(`${s.what||'Вещи'} уехал${/зонтик/.test(s.what||'')?'':'и'} с таксистом`);}
function forgotDone(s){if(/продукт/.test(s.what))player.pantry=(player.pantry||0);sitMood(4);endSit(s);}

// ---------- парковка: эвакуатор и штрафстоянка ----------
function parkingBad(x,y){
  for(const a of world.areas){if(a.k!=='parking')continue;if(x<a.bb[0]||x>a.bb[2]||y<a.bb[1]||y>a.bb[3])continue;if(pointInPoly(a.p,x,y))return null;}
  const ns=nearestRoadSeg(x,y,14);if(!ns)return 'не на дороге';const r=ns.seg.r;
  if(r.c>=9)return 'на пешеходной улице';
  if(ns.d>r.hw+0.6)return 'на тротуаре';
  for(const c of world.crossings){if(Math.abs(c.x-x)<9&&Math.abs(c.y-y)<9&&dist(c.x,c.y,x,y)<8)return 'у пешеходного перехода';}
  if(r.c<=4)return 'на проезжей части большой улицы';
  return null;}
function parkingCheck(obj,kind){if(!obj)return;const why=parkingBad(obj.x,obj.y);if(!why)return;setHint(`⚠️ Здесь стоять нельзя (${why}) — могут эвакуировать`);startSit('tow',{obj,kind,why});}
defSit('tow',{title:'Эвакуатор',quiet:true,multi:true,cool:0,
  start(s){s.wait=rnd(45,90);s.phase='parked';s.maxT=600;return true;},
  update(s,dt){const o=s.obj;
    // уехал сам — ситуация закончилась
    if(s.phase!=='gone'&&((s.kind==='own'&&(!ownCar.parked||ownCar.x!==o.x||ownCar.y!==o.y))||(s.kind!=='own'&&!rentals.includes(o)))){if(s.truck)towTruckAway(s);endSit(s);return;}
    if(s.phase==='parked'){s.wait-=dt;if(s.wait<=0){s.phase='truck';const tgt=nearestNode(o.x,o.y,world.carAdj,150);const sn=emergencyStart({x:o.x,y:o.y},tgt);const tr=new Car('tow',sn>=0?sn:nodeNear(world.carNodes,[o.x,o.y],300));tr.color='#F2C230';tr.len=7.2;tr.wid=2.3;tr.vmax=12;tr.target=tgt;tr.sceneXY=[o.x,o.y];tr.state='idle';tr.ttl=0.3;tr.onScene=()=>{s.phase='loading';s.load=12;};cars.push(tr);s.truck=tr;
      if(dist(o.x,o.y,player.x,player.y)<60)addEvent('🚚 К вашей машине подъезжает эвакуатор!','alert');}}
    if(s.phase==='loading'){s.load-=dt;const near=dist(o.x,o.y,player.x,player.y)<12&&!player.vehicle;
      if(near&&!s.asked){s.asked=true;sitCard({s,icon:'🚚',tone:'alert',title:'Эвакуатор грузит вашу машину',text:'Пока машину не увезли, эвакуацию можно остановить — но штраф всё равно выпишут.',ttl:10,
        choices:[{t:'Остановить: штраф 1 500 ₽',primary:true,run:()=>{sitMoney(-1500,'Штраф за неправильную парковку');s.saved=true;towTruckAway(s);endSit(s);}},{t:'Пусть забирают',run:()=>{}}]});}
      if(s.load<=0&&!s.saved)towTake(s);}},
  draw(s,toS,z){if(s.phase!=='loading'||!s.truck)return;const [sx,sy]=toS(s.obj.x,s.obj.y);ctx.strokeStyle='rgba(242,194,48,.9)';ctx.lineWidth=2;ctx.setLineDash([4,3]);ctx.beginPath();ctx.arc(sx,sy,Math.max(9,z*3),0,TAU);ctx.stroke();ctx.setLineDash([]);}});
function towTake(s){const o=s.obj;s.phase='gone';closeSitCard(s);
  if(s.kind==='own'){ownCar.parked=false;ownCar.towed=true;const lot=towLot();ownCar.lot=lot;startSit('impound',{lot});}
  else{const i=rentals.indexOf(o);if(i>=0)rentals.splice(i,1);sitMoney(-5000,`Каршеринг: машину эвакуировали (${s.why}) — штраф и эвакуация за ваш счёт`);}
  towTruckAway(s);endSit(s);}
function towTruckAway(s){const tr=s.truck;if(!tr)return;tr.target=null;tr.onScene=null;tr.sceneXY=null;tr.creep=null;tr.state='idle';tr.ttl=0.5;tr.goHome=true;setTimeout(()=>{tr.remove=true;},40000);s.truck=null;}
function towLot(){let best=null,bd=0;for(const a of world.areas){if(a.k!=='parking')continue;const cx=(a.bb[0]+a.bb[2])/2,cy=(a.bb[1]+a.bb[3])/2;const d=dist(cx,cy,player.x,player.y);if(d>500&&d<1600&&(a.bb[2]-a.bb[0])*(a.bb[3]-a.bb[1])>900){if(!best||Math.abs(d-900)<Math.abs(bd-900)){best={x:cx,y:cy};bd=d;}}}
  if(!best){const n=nodeNear(world.carNodes,[player.x+700,player.y],400);const p=world.nodes[n];best={x:p[0],y:p[1]};}return best;}
defSit('impound',{title:'Штрафстоянка',quiet:true,
  start(s){mark(s,'lot',s.lot.x,s.lot.y,'🅿️','Штрафстоянка',{arrow:true,color:'#2D4A9E'});
    sitCard({s,icon:'🚚',tone:'alert',title:'Машину эвакуировали',text:`Вашу машину увезли на штрафстоянку ${placeName(s.lot.x,s.lot.y)}. Забрать: штраф 1 500 ₽ + эвакуация 2 600 ₽.`,ttl:0,choices:[{t:'Понятно',primary:true,run:()=>{}}]});return true;},
  action(s){if(scene==='city'&&!player.vehicle&&dist(s.lot.x,s.lot.y,player.x,player.y)<22)return {label:'Забрать машину со штрафстоянки · 4 100 ₽',run:()=>{if(player.money<4100){setHint('Не хватает денег: нужно 4 100 ₽');return;}
    sitMoney(-4100,'Штрафстоянка: штраф и эвакуация');dossier('эвакуация за неправильную парковку');const n=nearestNode(s.lot.x,s.lot.y,world.carAdj,150);const p=n>=0?world.nodes[n]:[s.lot.x,s.lot.y];ownCar.x=s.lot.x;ownCar.y=s.lot.y;if(inBuilding(ownCar.x,ownCar.y)){ownCar.x=p[0];ownCar.y=p[1];}ownCar.parked=true;ownCar.towed=false;endSit(s);addEvent('Машина снова ваша. Стоит рядом');}};return null;}});

// ---------- камеры скорости ----------
let speedCams=[];
function initSpeedCams(){speedCams=[];const cand=world.roads.filter(r=>r.c<=5&&r.p.length>=2);for(let k=0;k<400&&speedCams.length<16;k++){const r=pick(cand);const i=Math.floor(Math.random()*(r.p.length-1));const a=world.nodes[r.p[i]],b=world.nodes[r.p[i+1]];const L=dist(a[0],a[1],b[0],b[1]);if(L<40)continue;
  const x=(a[0]+b[0])/2,y=(a[1]+b[1])/2;if(speedCams.some(c=>dist(c.x,c.y,x,y)<300))continue;const dx=(b[0]-a[0])/L,dy=(b[1]-a[1])/L;speedCams.push({x,y,px:x-dy*(r.hw+1.2),py:y+dx*(r.hw+1.2),lim:r.lim||60,road:r.n||'улица',last:-1e9});}}
let camsInit=false;
defWatch(()=>{if(!camsInit&&world){camsInit=true;initSpeedCams();}const v=player.vehicle;if(!v||v.kind==='taxi'||isLightVehicle(v.kind)||!speedCams.length)return;const kmh=Math.abs(v.speed)*3.6;const now=sitNow();
  for(const c of speedCams){if(Math.abs(c.x-v.x)>20||Math.abs(c.y-v.y)>20||dist(c.x,c.y,v.x,v.y)>16||now-c.last<20)continue;c.last=now;camFlash=1;
    if(kmh>c.lim+20){const over=kmh-c.lim;const fine=over>40?1500:500;startSit('camfine',{kmh:Math.round(kmh),lim:c.lim,road:c.road,fine,car:v.kind});}}});
let camFlash=0;
defSit('camfine',{title:'Штраф с камеры',quiet:true,multi:true,
  start(s){s.d=rnd(50,100);return true;},
  update(s,dt){if(s.d!=null){s.d-=dt;if(s.d<=0){s.d=null;const half=Math.round(s.fine/2);
      sitCard({s,icon:'📩',tone:'alert',title:'Госуслуги: новый штраф',text:`Камера на ${s.road}: ${s.kmh} км/ч при ограничении ${s.lim}. Штраф ${fmtMoney(s.fine)}${s.car==='car'?' (каршеринг перевыставит с комиссией 300 ₽)':''}. Если оплатить сразу — скидка 50%.`,ttl:0,
        choices:[{t:`Оплатить со скидкой · ${fmtMoney(half+(s.car==='car'?300:0))}`,primary:true,run:()=>{sitMoney(-(half+(s.car==='car'?300:0)),'Штраф за превышение скорости (со скидкой)');endSit(s);}},{t:'Потом',run:()=>{s.late=rnd(200,320);}}]});}}
    if(s.late!=null){s.late-=dt;if(s.late<=0){sitMoney(-(s.fine+(s.car==='car'?300:0)),'Штраф с камеры списали без скидки');endSit(s);}}}});
function drawSpeedCams(toS,z){if(z<1.6)return;for(const c of speedCams){const [sx,sy]=toS(c.px,c.py);if(sx<-20||sx>W+20||sy<-20||sy>H+20)continue;ctx.fillStyle='#3A3F47';ctx.fillRect(sx-1,sy-Math.max(6,z*2.2),2,Math.max(6,z*2.2));
  ctx.fillStyle='#F2F4F7';rrect(ctx,sx-6,sy-Math.max(6,z*2.2)-7,12,8,2);ctx.fill();ctx.fillStyle='#D64545';ctx.beginPath();ctx.arc(sx,sy-Math.max(6,z*2.2)-3,1.8,0,TAU);ctx.fill();
  if(z>3){ctx.font='700 9px "IBM Plex Sans",system-ui';ctx.textAlign='center';ctx.fillStyle='#fff';ctx.strokeStyle='#D64545';ctx.lineWidth=2;ctx.beginPath();ctx.arc(sx+12,sy-Math.max(6,z*2.2)-3,7,0,TAU);ctx.fill();ctx.stroke();ctx.fillStyle='#222';ctx.fillText(String(c.lim),sx+12,sy-Math.max(6,z*2.2)-2.5);}}
  if(camFlash>0){ctx.fillStyle=`rgba(255,255,255,${camFlash*0.55})`;ctx.fillRect(0,0,W,H);camFlash=Math.max(0,camFlash-0.08);}}

// ---------- объезд ДТП: перекрытые улицы дороже для маршрутов, застрявшие машины разворачиваются ----------
function updateBlockedRoads(){const s=new Set();for(const ac of accidents){if(ac.blocking===false||ac.cleared||ac.medical)continue;const ns=nearestRoadSeg(ac.x,ac.y,12);if(ns)s.add(ns.seg.r.i);ac.roadI=ns?ns.seg.r.i:null;}world.blockedRoads=s;}
defWatch(dt=>{SIT.brT=(SIT.brT||0)-dt;if(SIT.brT<=0){SIT.brT=1;updateBlockedRoads();}});
