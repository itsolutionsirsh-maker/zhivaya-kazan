// ===== Транспорт игрока: самокаты, каршеринг, своя машина =====
const rentals=[];let ownCar=null;let cine=null;
const VEH={
  scooter:{vmax:6.5,acc:3.2,brake:6,turn:3.2,len:1.4,wid:0.7,start:50,perMin:6,label:'самокат',word:'самокате'},
  bike:{vmax:8,acc:2.5,brake:6,turn:3,len:1.8,wid:0.65,start:20,perMin:3,label:'велосипед',word:'велосипеде'},
  car:{vmax:16,acc:4.5,brake:9,turn:2.3,len:4.5,wid:1.9,start:200,perMin:10,label:'каршеринг',word:'каршеринге'},
  taxi:{vmax:14,acc:4,brake:9,turn:2.3,len:4.5,wid:1.9,start:0,perMin:0,label:'такси',word:'такси'},
  own:{vmax:18,acc:5,brake:9.5,turn:2.3,len:4.6,wid:1.9,start:0,perMin:0,label:'своя машина',word:'своей машине'}};
function curbSpot(node){const adj=adjList(world.carAdj,node);if(!adj.length)return null;const e=pick(adj);const r=world.roads[e[2]];if(r.c<5||r.c>8)return null;
  const pa=world.nodes[node],pb=world.nodes[e[0]];const L=dist(pa[0],pa[1],pb[0],pb[1]);if(L<10)return null;const dx=(pb[0]-pa[0])/L,dy=(pb[1]-pa[1])/L;const t=rnd(4,L-4);const off=r.hw+1.0;
  const x=pa[0]+dx*t-dy*off,y=pa[1]+dy*t+dx*off;if(inBuilding(x,y))return null;return {x,y,hx:dx,hy:dy};}
function addScooterAt(x,y,kind='scooter'){
  if(!Number.isFinite(x)||!Number.isFinite(y))return null;
  kind=kind==='bike'?'bike':'scooter';const spec=VEH[kind],hl=spec.len*.5+.15,hw=spec.wid*.5+.15;
  const ns=nearestRoadSeg(x,y,20),sg=ns&&ns.seg;let ux=1,uy=0;
  if(sg&&sg.L>0){ux=(sg.bx-sg.ax)/sg.L;uy=(sg.by-sg.ay)/sg.L;}
  // Отрезок стены в локальных координатах транспорта пересекает весь прямоугольный габарит.
  // Одних центра/колёс недостаточно: узкий угол здания может попасть между пробными точками.
  const crosses=(ax,ay,bx,by)=>{let lo=0,hi=1;const dx=bx-ax,dy=by-ay;
    if(Math.abs(dx)<1e-9){if(ax<-hl||ax>hl)return false;}else{let a=(-hl-ax)/dx,b=(hl-ax)/dx;if(a>b){const t=a;a=b;b=t;}lo=Math.max(lo,a);hi=Math.min(hi,b);if(lo>hi)return false;}
    if(Math.abs(dy)<1e-9){if(ay<-hw||ay>hw)return false;}else{let a=(-hw-ay)/dy,b=(hw-ay)/dy;if(a>b){const t=a;a=b;b=t;}lo=Math.max(lo,a);hi=Math.min(hi,b);if(lo>hi)return false;}
    return true;};
  const free=(cx,cy,hx,hy)=>{const rx=Math.abs(hx)*hl+Math.abs(hy)*hw,ry=Math.abs(hy)*hl+Math.abs(hx)*hw;let blocked=false;
    world.bgrid.query(cx-rx,cy-ry,cx+rx,cy+ry,b=>{if(blocked||b.pass||b.bb[2]<cx-rx||b.bb[0]>cx+rx||b.bb[3]<cy-ry||b.bb[1]>cy+ry)return;
      const p=b.p;if(pointInPoly(p,cx,cy)){blocked=true;return false;}
      let ox=p[p.length-2]-cx,oy=p[p.length-1]-cy,ax=ox*hx+oy*hy,ay=-ox*hy+oy*hx;
      for(let i=0;i<p.length;i+=2){ox=p[i]-cx;oy=p[i+1]-cy;const bx=ox*hx+oy*hy,by=-ox*hy+oy*hx;
        if(crosses(ax,ay,bx,by)){blocked=true;return false;}ax=bx;ay=by;}
    });return !blocked;};
  // Один поиск улицы, до 10 близких позиций и двух направлений; не создаём непригодный прокат.
  const offsets=[[rnd(-1.5,1.5),rnd(-1.5,1.5)],[0,0],[0,1.6],[0,-1.6],[1.6,0],[-1.6,0],[0,3.2],[0,-3.2],[3.2,0],[-3.2,0]];
  for(const [along,across] of offsets){const cx=x+ux*along-uy*across,cy=y+uy*along+ux*across;
    for(let turn=0;turn<2;turn++){const hx=turn?-uy:ux,hy=turn?ux:uy;if(!free(cx,cy,hx,hy))continue;
      const o={kind,x:cx,y:cy,hx,hy,color:kind==='bike'?'#1E806C':'#7B61FF'};rentals.push(o);return o;}}
  return null;
}
function addBikeAt(x,y){return addScooterAt(x,y,'bike');}
function addCarshareNear(cx,cy,R){for(let k=0;k<25;k++){const n=nodeNear(world.carNodes,[cx,cy],R);const s=curbSpot(n);if(!s)continue;if(rentals.some(r=>r.kind==='car'&&dist(r.x,r.y,s.x,s.y)<12))continue;rentals.push({kind:'car',x:s.x,y:s.y,hx:s.hx,hy:s.hy,color:pick(['#2E9BD6','#2E9BD6','#F2B134','#E24B6A'])});return true;}return false;}
function spawnRentals(cx,cy){
  for(const s of world.stops){if(dist(s.x,s.y,cx,cy)>700)continue;const n=1+Math.floor(Math.random()*3);for(let i=0;i<n;i++)addScooterAt(s.x,s.y);}
  for(const p of world.pois){if(dist(p.x,p.y,cx,cy)>600||!/university|museum|theatre|hotel/.test(p.t)||Math.random()<0.5)continue;addScooterAt(p.x,p.y);addScooterAt(p.x,p.y);}
  for(const s of world.stops.filter(s=>dist(s.x,s.y,cx,cy)<500).slice(0,6))addBikeAt(s.x+3,s.y+2);
  for(let i=0;i<14;i++)addCarshareNear(cx,cy,650);
  if(player.hasCar&&!ownCar){placeOwnCar();}}
function placeOwnCar(){if(!player.home)return;const n=nearestNode(player.home.cx,player.home.cy,world.carAdj,200);let s=n>=0?curbSpot(n):null;if(!s){const p=world.nodes[n>=0?n:pick(world.carNodes)];s={x:p[0],y:p[1],hx:1,hy:0};}ownCar={kind:'own',x:s.x,y:s.y,hx:s.hx,hy:s.hy,color:wornCarColor()||player.carColor||'#C62828',parked:true};}
let rentalTimer=0;
function updateRentals(dt){rentalTimer-=dt;if(rentalTimer>0)return;rentalTimer=2;const px=player.x,py=player.y;
  for(let i=rentals.length-1;i>=0;i--){const r=rentals[i];if(dist(r.x,r.y,px,py)>1100&&!(typeof JOURNEY!=='undefined'&&JOURNEY.rental&&JOURNEY.rental.object===r))rentals.splice(i,1);}
  const sc=rentals.filter(r=>r.kind==='scooter'&&dist(r.x,r.y,px,py)<700).length;if(sc<16){const near=world.stops.filter(s=>dist(s.x,s.y,px,py)<650);if(near.length){const s=pick(near);addScooterAt(s.x,s.y);}}
  const bikes=rentals.filter(r=>r.kind==='bike'&&dist(r.x,r.y,px,py)<700).length;if(bikes<6){const s=world.stops.find(s=>dist(s.x,s.y,px,py)<500);if(s)addBikeAt(s.x+3,s.y+2);}
  const cs=rentals.filter(r=>r.kind==='car'&&dist(r.x,r.y,px,py)<700).length;if(cs<9)addCarshareNear(px,py,600);}

function enterVehicle(obj){const kind=obj.kind;const spec=VEH[kind];const dr=player.drunk||0;
  if(!spec||!journeyAvailable()||!journeyPresent(obj)||dist(player.x,player.y,obj.x,obj.y)>5){setHint('Сначала подойдите к свободному транспорту');return false;}
  if((!isLightVehicle(kind)&&kind!=='taxi'&&dr>=20)||(isLightVehicle(kind)&&dr>=45)){setHint(isLightVehicle(kind)?'Вы выпили — сейчас лучше пешком или на такси 🧭':'Вы выпили — за руль нельзя (ст. 12.8 КоАП, лишение прав). Вызовите такси 🧭');return;}
  if(player.money<spec.start){setHint(`Нужно ${spec.start} ₽ на старт`);return;}
  if(kind==='own'&&typeof ECON!=='undefined'&&ECON.carCond<12){setHint('Машина не заводится — нужен эвакуатор и ремонт');return;}
  const jp=JOURNEY.rental,planned=jp&&jp.object===obj?vehiclePath(obj,jp.dest.x,jp.dest.y,true):null;
  if(jp&&jp.object===obj&&!planned)return false;
  cancelTrip(true);JOURNEY.rental=jp;
  if(kind!=='own'){const i=rentals.indexOf(obj);if(i>=0)rentals.splice(i,1);player.money-=spec.start;}else ownCar.parked=false;
  player.vehicle={kind,x:obj.x,y:obj.y,hx:obj.hx,hy:obj.hy,speed:0,spec,startMin:clock.minutes,auto:null,damaged:0,color:obj.color,crashedLook:false};
  journeyHint('boarding',obj,player.x,player.y,obj.x,obj.y);player.x=obj.x;player.y=obj.y;
  player.waypoints=null;player.waitingStop=null;player.talkTarget=null;player.navDest=null;
  if(kind!=='bike')addEvent(kind==='scooter'?`Взяли самокат: 50 ₽ + 6 ₽/мин. Клик по карте — поехать туда`:kind==='car'?`Каршеринг: 200 ₽ + 10 ₽/мин. Клик по карте — поедет сам, WASD — руль`:'Вы за рулём своей машины. Клик по карте — поедет сама, WASD — руль');
  if(kind==='bike')addEvent('Велосипед: 20 ₽ + 3 ₽/игр. мин. Клик по карте — поехать туда');
  if(!flags.droveOnce){flags.droveOnce=true;setHint('W — газ, S — тормоз, A/D — руль. Или клик по карте: приедет по правилам');}journeyOnBoard(player.vehicle,obj,planned);return true;}
function exitVehicle(){const v=player.vehicle;if(!v)return;if(v.kind==='taxi'){taxiExit();return;}const spec=v.spec;const mins=Math.max(1,clock.minutes-v.startMin);const cost=Math.round(mins*spec.perMin);
  if(spec.perMin)journeyCharge(cost,`Поездка на ${spec.word} · ${Math.round(mins)} игр. мин`);
  if(v.kind==='own'){ownCar.x=v.x;ownCar.y=v.y;ownCar.hx=v.hx;ownCar.hy=v.hy;ownCar.parked=true;}else rentals.push({kind:v.kind,x:v.x,y:v.y,hx:v.hx,hy:v.hy,color:v.color});
  if(!isLightVehicle(v.kind))parkingCheck(v.kind==='own'?ownCar:rentals[rentals.length-1],v.kind);
  let ex=v.x-v.hy*(isLightVehicle(v.kind)?1:1.8),ey=v.y+v.hx*(isLightVehicle(v.kind)?1:1.8);if(inBuilding(ex,ey)){ex=v.x+v.hy*1.8;ey=v.y-v.hx*1.8;}player.x=ex;player.y=ey;
  journeyHint('exiting',v,v.x,v.y,player.x,player.y);const dest=v.dest;player.vehicle=null;
  if(dest)journeyFinishFoot(dest);updateTripBox();}
function vehProxy(v){return {x:v.x,y:v.y,hx:v.hx,hy:v.hy,len:v.spec.len,wid:v.spec.wid,speed:Math.abs(v.speed),isPlayer:true,waitT:v.waitT||0};}
function vehiclePath(v,wx,wy,noFinal){const light=isLightVehicle(v.kind),adj=light?world.pedAdj:world.carAdj;const s=nearestNode(v.x,v.y,adj,150),g=nearestNode(wx,wy,adj,150);if(s<0||g<0){setHint('Туда не проехать');return null;}
  const path=astar(adj,s,g,light?pedCost:carCost);if(!path||!path.length){setHint('Маршрут не найден');return null;}
  let wps=pathToWaypoints(path,adj,light?'ped':'car');if(path.length===1||!wps.length){const n=world.nodes[g];if(dist(v.x,v.y,n[0],n[1])>10||!clearLine(v.x,v.y,n[0],n[1])){setHint('Маршрут не найден');return null;}wps=[[n[0],n[1]]];}
  if(!noFinal&&clearLine(wps[wps.length-1][0],wps[wps.length-1][1],wx,wy))wps.push([wx,wy]);return wps;}
function driveTo(wx,wy,noFinal){const v=player.vehicle;if(!v)return false;const wps=vehiclePath(v,wx,wy,noFinal);if(!wps)return false;
  v.auto={wps,i:0};setHint(isLightVehicle(v.kind)?`Едем на ${v.spec.word}`:v.kind==='taxi'?'Таксист везёт вас. E — выйти раньше':'Едем по маршруту. WASD — перехватить руль');return true;}
function updateVehicle(dt){const v=player.vehicle;if(!v)return;const s=v.spec;
  if(v.damaged>0){v.damaged-=dt;v.speed=0;return;}
  let thr=0,steer=0;if(!player.busy&&v.kind!=='taxi'){if(keys.w||keys['ц']||keys.ArrowUp)thr+=1;if(keys.s||keys['ы']||keys.ArrowDown)thr-=1;if(keys.d||keys['в']||keys.ArrowRight)steer+=1;if(keys.a||keys['ф']||keys.ArrowLeft)steer-=1;thr+=-joyVec[1];steer+=joyVec[0];}
  const manual=Math.abs(thr)>0.05||Math.abs(steer)>0.05;if(manual)v.auto=null;
  const ns=nearestRoadSeg(v.x,v.y,16);const onRoad=!!(ns&&ns.d<ns.seg.r.hw+1.8);let vmax=s.vmax;if(v.kind==='own'&&typeof carSpeedMul==='function')vmax*=carSpeedMul();
  const boost=(keys.shift||keys.ShiftLeft)&&!v.auto;   // Shift — «газ в пол»: можно превысить, а камеры это заметят
  if(!isLightVehicle(v.kind)){vmax=onRoad?(boost?Math.min(vmax*1.45,(ns.seg.r.speed||8)*1.75+3):Math.min(vmax,(ns.seg.r.speed||8)*1.3+2)):3.5;}else if(onRoad&&ns.seg.r.c<=4)vmax=5.5;
  if(weather.kind==='rain')vmax*=0.85;v.onRoad=onRoad;
  if(v.auto){const a=v.auto;const look=s.len>3?5:3;while(a.i<a.wps.length-1&&dist(a.wps[a.i][0],a.wps[a.i][1],v.x,v.y)<look)a.i++;
    const tp=a.wps[a.i];const dT=dist(tp[0],tp[1],v.x,v.y);
    if(a.i>=a.wps.length-1&&dT<2.5){v.auto=null;v.speed=0;if(v.kind==='taxi'){exitVehicle();return;}setHint('Приехали. E — выйти');}
    else{const want=Math.atan2(tp[1]-v.y,tp[0]-v.x);const cur=Math.atan2(v.hy,v.hx);const dd=angDiff(cur,want);steer=clamp(dd*2.2,-1,1);
      let lim=Math.min(vmax,Math.abs(dd)>0.8?3.2:Math.abs(dd)>0.35?6.5:vmax);const ahead=obstacleAhead(vehProxy(v),cars.concat(buses),carSee);lim=limitBySpace(lim,ahead);if(a.i>=a.wps.length-2)lim=Math.min(lim,1.5+dT*0.5);
      thr=v.speed<lim-0.3?1:v.speed>lim+0.3?-1:0;if(lim===0&&v.speed<0.2){thr=0;v.speed=0;v.waitT=(v.waitT||0)+dt;}else if(v.speed>1)v.waitT=0;}}
  if(thr>0)v.speed+=s.acc*dt*Math.min(1,thr);else if(thr<0)v.speed-=s.brake*dt*Math.min(1,-thr);else v.speed-=Math.sign(v.speed)*Math.min(Math.abs(v.speed),1.8*dt);
  v.speed=clamp(v.speed,-3.5,vmax);
  if(Math.abs(v.speed)>0.05){const ang=Math.atan2(v.hy,v.hx)+steer*s.turn*dt*Math.min(1,Math.abs(v.speed)/7)*Math.sign(v.speed);v.hx=Math.cos(ang);v.hy=Math.sin(ang);}
  const nx=v.x+v.hx*v.speed*dt,ny=v.y+v.hy*v.speed*dt;const L=s.len*0.5;
  if(inBuilding(nx+v.hx*L,ny+v.hy*L)||inBuilding(nx-v.hx*L,ny-v.hy*L)||inBuilding(nx,ny)){if(Math.abs(v.speed)>5){addEvent('Бум! Вы въехали в здание');player.mood=clamp(player.mood-3,0,100);shake=0.5;}v.speed=-v.speed*0.15;v.auto=null;return;}
  const bb=world.bbox;v.x=clamp(nx,bb[0]+5,bb[2]-5);v.y=clamp(ny,bb[1]+5,bb[3]-5);v.odo=(v.odo||0)+Math.abs(v.speed)*dt;player.x=v.x;player.y=v.y;player.hx=v.hx;player.hy=v.hy;
  if(Math.abs(v.speed)>1.5)checkVehicleCollisions(v);}
function checkVehicleCollisions(v){const s=v.spec;const sp=Math.abs(v.speed);
  for(const u of cars.concat(buses)){if(u.remove)continue;const d=dist(u.x,u.y,v.x,v.y);if(d>(s.len+(u.len||4))*0.5+1)continue;
    const inRect=(ax,ay,bx,by,bhx,bhy,bl,bw,m)=>{const ox=ax-bx,oy=ay-by;const f=Math.abs(ox*bhx+oy*bhy),q=Math.abs(-ox*bhy+oy*bhx);return f<bl*0.5+m&&q<bw*0.5+m;};
    let hit=false;const cs=[[v.x+v.hx*s.len*0.45,v.y+v.hy*s.len*0.45],[v.x-v.hx*s.len*0.45,v.y-v.hy*s.len*0.45],[v.x,v.y]];for(const c of cs){if(inRect(c[0],c[1],u.x,u.y,u.hx,u.hy,u.len||4,u.wid||2,s.wid*0.4)){hit=true;break;}}
    if(!hit){const us=[[u.x+u.hx*(u.len||4)*0.45,u.y+u.hy*(u.len||4)*0.45],[u.x-u.hx*(u.len||4)*0.45,u.y-u.hy*(u.len||4)*0.45]];for(const c of us){if(inRect(c[0],c[1],v.x,v.y,v.hx,v.hy,s.len,s.wid,(u.wid||2)*0.4)){hit=true;break;}}}
    if(hit){playerCrash(v,u,sp);return;}}
  if(isLightVehicle(v.kind))return;
  for(const w of walkers){if(w.bus||w.state==='hurt'||w.state==='onbus')continue;const ox=w.x-v.x,oy=w.y-v.y;if(Math.abs(ox)>4||Math.abs(oy)>4)continue;const f=ox*v.hx+oy*v.hy;const q=Math.abs(-ox*v.hy+oy*v.hx);if(Math.abs(f)<s.len*0.5+0.3&&q<s.wid*0.5+0.4){playerHitWalker(v,w);return;}}}
function playerCrash(v,u,sp){v.speed=0;v.auto=null;v.damaged=isLightVehicle(v.kind)?8:50;v.crashedLook=true;shake=1;
  if(isLightVehicle(v.kind)){player.energy=clamp(player.energy-15,0,100);player.mood=clamp(player.mood-10,0,100);startCine('crash',`Вы врезались на ${v.spec.word}`,1.6);addEvent(`Вы на ${v.spec.word} врезались в ${u.route?'автобус':'машину'}. Энергия −15`,'alert');return;}
  if(u.kind)crashCar(u);else{u.speed=0;u.dwell=60;}
  const fault=v.kind==='taxi'?false:Math.random()<0.55;const fine=fault?(v.kind==='car'?4000:3000):0;if(typeof econCrash==='function')econCrash(v,fault,false);
  const ac=createAccident({x:(v.x+u.x)/2,y:(v.y+u.y)/2,cars:[u,vehProxy(v)],playerCar:true,playerFine:fine,playerMood:fault?15:5,playerFineText:fault?`ГИБДД: виноваты вы. Штраф ${fine} ₽${v.kind==='car'?', каршеринг спишет ущерб':''}`:'ГИБДД: виноват другой водитель, страховая всё покроет'});
  startCine('crash','ДТП! Вы врезались',2.2);addEvent(`Вы попали в ДТП${ac.road?' — '+ac.road:''}. Ждём ГИБДД`,'alert');player.mood=clamp(player.mood-10,0,100);}
function playerHitWalker(v,w){w.hit();v.speed=0;v.auto=null;v.damaged=70;v.crashedLook=true;shake=1;if(typeof econCrash==='function')econCrash(v,true,true);
  const ac=createAccident({x:w.x,y:w.y,kind:'ped',cars:[vehProxy(v)],victim:w,playerCar:true,playerFine:5000,playerMood:30,playerFineText:'ГИБДД: вы сбили пешехода. Штраф 5 000 ₽, дело передано в суд'});
  startCine('hitped',`Вы сбили ${w.p.name}!`,3);addEvent(`Вы сбили пешехода${ac.road?' — '+ac.road:''}: ${w.p.name}, ${w.p.age}. Вызвана скорая`,'alert');player.mood=clamp(player.mood-20,0,100);}
function playerHitByCar(vehicle){if(player.state==='hurt'||cine)return;player.state='hurt';player.waypoints=null;player.talkTarget=null;player.hurtT=0;shake=1;
  if(player.vehicle){const v=player.vehicle;rentals.push({kind:v.kind,x:v.x+rnd(-2,2),y:v.y+rnd(-2,2),hx:v.hx,hy:v.hy,color:v.color});player.vehicle=null;}
  if(vehicle.kind)crashCar(vehicle);else{vehicle.speed=0;vehicle.dwell=45;}
  let zebra=false;world.cgrid.query(player.x-8,player.y-8,player.x+8,player.y+8,c=>{if(onZebra(c,player.x,player.y,1.5))zebra=true;});
  const ac=createAccident({x:player.x,y:player.y,kind:'ped',cars:vehicle.kind?[vehicle]:[],victim:'player',jaywalk:!zebra});
  startCine('hit',vehicle.kind?'Вас сбила машина!':'Вас сбил автобус!',3.4);addEvent(`Вас сбил${vehicle.kind?'а машина':' автобус'}${ac.road?' — '+ac.road:''}. Вызвана скорая`,'alert');
  player.energy=clamp(player.energy-35,0,100);player.mood=clamp(player.mood-30,0,100);}
function playerToHospital(hosp){if(player.state!=='hurt')return;const h=hosp||pick(world.pois.filter(p=>p.t==='hospital'));player.state='ok';
  if(h){const n=nearestNode(h.x,h.y,world.pedAdj,120);if(n>=0){const sp=sidewalkPos(n);player.x=sp[0];player.y=sp[1];}cam.x=player.x;cam.y=player.y;}
  const bill=Math.min(player.money,1500);player.money-=bill;spendTime(120);player.energy=Math.max(player.energy,45);
  addEvent(`Вас подлечили${h&&h.n?' в «'+h.n+'»':' в больнице'}: −${bill} ₽, два часа`);
  if(companion){const w=companion.w;w.x=player.x+1.5;w.y=player.y+1;w.cwps=null;companion.route=null;w.say={t:companion.dest&&!companion.arrived?`Ты как? Я приехал. Ну что, всё-таки идём в «${companion.dest.n}»?`:'Ты как? Я приехал за тобой.',ttl:7};nearLine(w.p.name,w.say.t,false);}}
function startCine(kind,text,dur){cine={kind,text,t:0,dur,zPrev:cam.zt};cam.zt=Math.max(cam.zt,7.5);}
function updateCine(dt){if(!cine)return;cine.t+=dt;if(cine.t>=cine.dur){cam.zt=cine.zPrev;cine=null;}}
