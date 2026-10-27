// Real journey/transport/vehicle functions on a tiny disconnected/connected map.
// Node only: no browser, live API, timers or copied route/payment implementation.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=file=>fs.readFileSync(path.join(__dirname,'../../site/js',file),'utf8');
const main=read('main.js'),folk=read('folk.js');
function section(text,start,end){const a=text.indexOf(start),b=text.indexOf(end,a);assert.ok(a>=0&&b>a,`Missing source boundaries: ${start}`);return text.slice(a,b);}
const copy=value=>JSON.parse(JSON.stringify(value));
function element(){return {children:[],hidden:false,textContent:'',innerHTML:'',value:'',style:{},events:{},append(...n){this.children.push(...n);},addEventListener(k,fn){this.events[k]=fn;},focus(){}};}
function game(storage=new Map()){
  const nodes=[[0,0],[50,0],[500,0],[1000,0]],links=[[1],[0,2],[1,3],[2]];
  const ped={name:'ped',links},car={name:'car',links};
  const events=[],hints=[],calls=[],dom=new Map(),dropped=[],returned=[];
  const c={
    player:{x:0,y:0,hx:1,hy:0,money:5000,energy:100,mood:50,food:80,pantry:0,drunk:0,state:'ok',replans:0},
    clock:{minutes:100},scene:'city',world:{nodes,pedAdj:ped,carAdj:car,carNodes:[0,1,2,3],routes:[],stops:[],pois:[],squares:[],roads:[],meta:{},bbox:[-500,-500,3000,500]},
    WALK_SPEED:2,GAME_SCALE:4,ECON:{owed:0,carCond:100},cam:{x:0,y:0,z:6,zt:6},SIT:{dossier:[]},
    cars:[],buses:[],walkers:[],flags:{},keys:{},joyVec:[0,0],weather:{kind:'clear'},FOLK:{list:[]},
    performance:{now:()=>1000},Math:Object.create(Math),TAU:Math.PI*2,setTimeout:()=>0,clearTimeout:()=>{},
    $:s=>{if(!dom.has(s))dom.set(s,element());return dom.get(s);},document:{createElement:element},
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v))},
    addEvent:t=>events.push(t),setHint:t=>hints.push(t),dist:(x,y,a,b)=>Math.hypot(x-a,y-b),
    clamp:(n,a,b)=>Math.min(b,Math.max(a,n)),fmtMoney:n=>n+' ₽',pedCost:()=>1,carCost:()=>1,
    nearestNode:(x,y,adj,r=120)=>{let best=-1,bd=r;nodes.forEach((n,i)=>{const d=Math.hypot(n[0]-x,n[1]-y);if(d<=bd){bd=d;best=i;}});return best;},
    astar:(adj,s,g)=>{calls.push(['astar',adj.name,s,g]);if(s<0||g<0||adj.disconnected)return null;const q=[[s]],seen=new Set([s]);while(q.length){const p=q.shift(),i=p[p.length-1];if(i===g)return p;for(const n of adj.links[i]||[])if(!seen.has(n)){seen.add(n);q.push([...p,n]);}}return null;},
    pathToWaypoints:(p,adj,mode)=>{calls.push(['waypoints',adj.name,mode]);return p.map(i=>nodes[i].slice());},
    clearLine:()=>false,cutCorners:p=>p,inBuilding:()=>false,toSidewalk:(x,y)=>[x,y+2],sidewalkPos:i=>nodes[i].slice(),
    followPlayer:()=>{},actTarget:a=>a,parkingCheck:()=>{},nearestRoadSeg:()=>null,
    obstacleAhead:()=>Infinity,limitBySpace:v=>v,carSee:()=>{},angDiff:(a,b)=>b-a,
    nodeNear:()=>0,routePoint:(r,s)=>[s,0],busWord:()=> 'Автобус',startSit:()=>{},
    folkDrop:f=>{dropped.push(f.id);f.w=null;},folkGo:(f,to)=>returned.push([f.id,to]),folkWant:()=> 'work',
    econDump:()=>copy(c.ECON),econApply:o=>Object.assign(c.ECON,o),homeAt:()=>null,zMin:()=>0.1
  };
  c.window=c;c.Math.random=()=>0.9;
  c.Car=class {constructor(kind,node){Object.assign(this,{kind,node,x:nodes[node]?.[0]||0,y:0,hx:1,hy:0,state:'idle',speed:0});}};
  vm.createContext(c);
  for(const file of ['vehicles.js','journey.js','transport.js'])vm.runInContext(read(file),c,{filename:file});
  vm.runInContext(section(main,'function walkTo(','// по прямой можно пройти'),c,{filename:'main.js:walkTo'});
  vm.runInContext(section(main,'function saveState(','// ---------- ввод'),c,{filename:'main.js:save-load'});
  vm.runInContext(section(folk,'function folkTaxiStart(','const FOLK_HI='),c,{filename:'folk.js:taxi-lifecycle'});
  const run=s=>vm.runInContext(s,c);
  return {c,run,events,hints,calls,dom,storage,dropped,returned,
    dest:{x:1000,y:0,n:'Библиотека'},
    rental(kind='bike',x=50){const o={kind,x,y:0,hx:1,hy:0,color:'#123456'};c.object=o;run('rentals.push(object)');return o;},
    taxi(x=0,state='here',extra={}){const car=new c.Car('taxi',0);car.x=x;c.cars.push(car);c.testCall=Object.assign({car,dest:this.dest,state,t:0},extra);run('taxiCall=testCall');return car;},
    journey:()=>run('JOURNEY'),rentals:()=>run('rentals'),taxiCall:()=>run('taxiCall')
  };
}

test('missing pedestrian path returns false, clears stale waypoints and never reports arrival',()=>{
  const g=game();g.c.world.pedAdj.disconnected=true;g.c.player.waypoints=[[1,1]];
  assert.equal(g.c.walkTo(1000,0,true),false);assert.equal(g.c.player.waypoints,null);
  assert.equal(g.c.startWalkNav(g.dest),false);g.c.navTick();
  assert.equal(g.events.some(s=>/Пришли:|Вы на месте/.test(s)),false);assert.equal(g.c.player.money,5000);
});

test('an unavailable path has infinite quote and cannot start a rental or charge money',()=>{
  const g=game(),o=g.rental();g.c.world.pedAdj.disconnected=true;
  assert.equal(g.c.pathLen(g.c.world.pedAdj,0,0,1000,0,g.c.pedCost),Infinity);
  assert.equal(g.c.startRentalPlan(o,g.dest),false);assert.equal(g.journey().rental,null);
  assert.equal(g.c.player.money,5000);assert.ok(g.rentals().includes(o));
});

test('stale or too distant rental actions cannot board or charge',()=>{
  const g=game(),o=g.rental('bike',0);assert.equal(g.c.startRentalPlan(o,g.dest),true);
  const action=g.c.journeyAction();assert.ok(action);g.run('rentals.length=0');action.run();
  assert.equal(g.c.player.vehicle,undefined);assert.equal(g.c.player.money,5000);
  const far=g.rental('bike',50);assert.equal(g.c.enterVehicle(far),false);assert.equal(g.c.player.money,5000);
});

test('route disappearing between selection and boarding does not collect a start fee',()=>{
  const g=game(),o=g.rental('bike',0);assert.equal(g.c.startRentalPlan(o,g.dest),true);
  g.c.world.pedAdj.disconnected=true;assert.equal(g.c.enterVehicle(o),false);
  assert.equal(g.c.player.money,5000);assert.ok(g.rentals().includes(o));assert.equal(g.c.player.vehicle,undefined);
});

test('bike uses the pedestrian graph, moves in the real vehicle loop and bills game minutes',()=>{
  const g=game(),o=g.rental('bike',0);g.c.world.carAdj.disconnected=true;
  assert.equal(g.c.startRentalPlan(o,g.dest),true);assert.equal(g.c.enterVehicle(o),true);
  assert.equal(g.c.player.money,4980);assert.ok(g.c.player.vehicle.auto);
  assert.ok(g.calls.some(q=>q[0]==='waypoints'&&q[1]==='ped'&&q[2]==='ped'));
  for(let i=0;i<20;i++)g.c.updateVehicle(0.2);
  assert.ok(g.c.player.x>5,'bike must physically move, not just get an auto flag');
  assert.ok(g.c.player.vehicle.odo>5);g.c.clock.minutes+=4;g.c.player.vehicle.dest=null;g.c.exitVehicle();
  assert.equal(g.c.player.vehicle,null);assert.equal(g.c.player.money,4968);assert.equal(g.rentals().length,1);
});

test('cancel approach clears rental/nav/wait state without removing transport or charging',()=>{
  const g=game(),o=g.rental();assert.equal(g.c.startRentalPlan(o,g.dest),true);
  assert.ok(g.c.player.waypoints);g.c.cancelTrip();
  assert.equal(g.journey().rental,null);assert.equal(g.c.player.waypoints,null);
  assert.ok(g.rentals().includes(o));assert.equal(g.c.player.money,5000);assert.equal(g.c.journeyAction(),null);
});

test('a rental disappearing during approach cancels navigation',()=>{
  const g=game(),o=g.rental();g.c.startRentalPlan(o,g.dest);g.run('rentals.length=0');g.c.journeyTick();
  assert.equal(g.journey().rental,null);assert.equal(g.c.player.waypoints,null);assert.equal(g.c.player.money,5000);
});

test('taxi boarding returns false until here and close, with no driver side effect',()=>{
  const g=game(),f={id:'marat'};g.c.FOLK.list.push(f);const car=g.taxi(0,'coming',{folkDriver:f});
  assert.equal(g.c.boardTaxi(),false);assert.equal(g.c.player.vehicle,undefined);assert.equal(g.dropped.length,0);
  g.taxiCall().state='here';car.x=30;assert.equal(g.c.boardTaxi(),false);
  assert.equal(g.c.player.x,0);assert.equal(g.dropped.length,0);assert.ok(g.c.cars.includes(car));assert.equal(g.c.player.money,5000);
});

test('taxi cannot board a disconnected route',()=>{
  const g=game(),car=g.taxi();g.c.world.carAdj.disconnected=true;
  assert.equal(g.c.boardTaxi(),false);assert.ok(g.c.cars.includes(car));assert.equal(g.c.player.vehicle,undefined);assert.equal(g.c.player.money,5000);
});

for(const unavailable of ['removed','marked for removal'])test(`a taxi ${unavailable} after arrival cannot be boarded from a stale call`,()=>{
  const g=game(),car=g.taxi();if(unavailable==='removed')g.c.cars.length=0;else car.remove=true;
  assert.equal(g.c.boardTaxi(),false);assert.equal(g.c.player.vehicle,undefined);assert.equal(g.c.player.money,5000);
});

test('a taxi path that cannot produce drivable waypoints fails before committing the ride',()=>{
  const g=game(),f={id:'marat'};g.c.FOLK.list.push(f);const car=g.taxi(0,'here',{folkDriver:f});
  g.c.pathToWaypoints=()=>[];
  assert.equal(g.c.boardTaxi(),false);assert.ok(g.c.cars.includes(car));assert.equal(g.c.player.vehicle,undefined);
  assert.equal(g.dropped.length,0);assert.equal(g.c.player.money,5000);
});

test('successful taxi returns true, removes source car and ends the folk driver once',()=>{
  const g=game(),f={id:'marat',w:{x:0,y:0}};g.c.FOLK.list.push(f);const car=g.taxi(0,'here',{folkDriver:f,driver:'Марат',fixedFare:240});
  assert.equal(g.c.boardTaxi(),true);const v=g.c.player.vehicle;
  assert.equal(f.driving,v);assert.equal(v.folkDriver,'marat');assert.deepEqual(g.dropped,['marat']);assert.equal(g.c.cars.includes(car),false);
  v.dest=null;v.x=500;g.c.taxiExit();assert.equal(f.driving,null);assert.equal(g.returned.length,1);assert.equal(g.c.player.money,4760);
  g.c.folkTaxiEnd(v);assert.equal(g.returned.length,1);assert.equal(g.c.player.vehicle,null);
});

test('cancelled taxi approach cannot be resurrected by its late arrival callback',()=>{
  const g=game();g.c.callTaxi(g.dest);const car=g.taxiCall().car,late=car.onScene;
  g.c.cancelTrip();late();assert.equal(g.taxiCall(),null);assert.equal(car.taxiFor,false);assert.equal(car.onScene,null);
  assert.equal(g.c.player.money,5000);assert.equal(g.c.player.vehicle,undefined);
});

test('rental quote and bus approach ETA use actual WALK_SPEED',()=>{
  const g=game(),o=g.rental();const q=g.c.journeyRentalQuote(o,g.dest);
  assert.equal(q.sec,50/2+950/8);
  g.c.player.x=100;g.c.world.routes=[{type:'bus',ref:'10',stops:[{s:0,n:'А'},{s:1000,n:'Б'}]}];
  const plan=g.c.planBus({x:900,y:0,n:'Цель'});assert.ok(plan);assert.equal(plan.cost,200/2+1000/8+60);
});

test('unreachable bus approach does not create a waiting plan or take a fare',()=>{
  const g=game();g.c.world.pedAdj.disconnected=true;
  const route={ref:'10',type:'bus'},bp={route,from:{p:[500,0],st:{n:'А'}},to:{st:{s:1000,n:'Б'}},dir:1};
  assert.equal(g.c.startBusPlan(bp,g.dest),false);assert.ok(g.c.player.busPlan==null);
  assert.equal(g.c.player.money,5000);assert.equal(g.c.player.waypoints,null);
});

test('insufficient quote budget prevents rental approach before any start fee',()=>{
  const g=game(),o=g.rental();g.c.player.money=20;
  assert.equal(g.c.startRentalPlan(o,g.dest),false);assert.equal(g.c.player.money,20);assert.ok(g.rentals().includes(o));
});

test('walking choice displays ETA at actual WALK_SPEED',()=>{
  const g=game();g.c.openRouteModal(g.dest);
  const first=g.dom.get('#rtPlans').children[0];const text=first.children.map(n=>n.textContent).join(' ');
  assert.match(text,/8 мин/); // 1000 m / 2 m/s = 8.33 min, not the old hardcoded 3 m/s.
});

test('snapshot settles only captured game-time rent, never elapsed offline time',()=>{
  const g=game(),o=g.rental('bike',0);g.c.enterVehicle(o);g.c.clock.minutes+=4;g.c.saveState();
  const before=JSON.parse(g.storage.get('zk.state'));assert.equal(before.money,4980);assert.equal(before.journey.due,12);
  const fresh=game(g.storage);fresh.c.clock.minutes=100+30*1440;fresh.c.loadState();
  assert.equal(fresh.c.player.money,4968);assert.equal(fresh.c.player.vehicle,undefined);assert.equal(fresh.c.ECON.owed,0);
  fresh.c.saveState();const settled=JSON.parse(g.storage.get('zk.state'));assert.ok(!settled.journey||settled.journey.due===0);
  const again=game(g.storage);again.c.loadState();assert.equal(again.c.player.money,4968);
});

test('saved destination survives interruption without resurrecting a vehicle or a second bill',()=>{
  const g=game(),o=g.rental('bike',0);g.c.startRentalPlan(o,g.dest);g.c.enterVehicle(o);g.c.clock.minutes+=2;g.c.saveState();
  const fresh=game(g.storage);fresh.c.clock.minutes+=100000;fresh.c.loadState();
  assert.deepEqual(copy(fresh.journey().resume),g.dest);assert.equal(fresh.c.player.money,4974);assert.equal(fresh.c.player.vehicle,undefined);
  fresh.c.saveState();const again=game(g.storage);again.c.loadState();
  assert.deepEqual(copy(again.journey().resume),g.dest);assert.equal(again.c.player.money,4974);
});

test('restoring the same captured snapshot twice cannot settle its due twice',()=>{
  const g=game(),snapshot={v:1,dest:g.dest,mode:'bike',due:12,x:0,y:0};
  g.c.journeyRestore(snapshot);g.c.journeyRestore(snapshot);
  assert.equal(g.c.player.money,4988);assert.equal(g.c.ECON.owed,0);
});

test('bicycle final leg starts after dismount, and only reaching the goal reports completion',()=>{
  const g=game(),o=g.rental('bike',0);g.c.startRentalPlan(o,g.dest);g.c.enterVehicle(o);
  const v=g.c.player.vehicle;v.x=500;v.y=0;v.auto=null;g.c.player.x=500;
  assert.ok(g.c.player.navDest==null);g.c.exitVehicle();
  assert.equal(g.c.player.vehicle,null);assert.equal(g.c.player.navDest.n,g.dest.n);assert.ok(g.c.player.waypoints);
  assert.equal(g.events.some(s=>/Вы на месте:|Пришли:/.test(s)),false);
  g.c.player.x=1000;g.c.player.y=0;g.c.navTick();assert.equal(g.c.player.navDest,null);assert.ok(g.events.some(s=>/Пришли:/.test(s)));
});

test('taxi final leg begins after dismount and preserves the chosen destination',()=>{
  const g=game();g.taxi(0,'here',{fixedFare:200});g.c.boardTaxi();const v=g.c.player.vehicle;v.x=500;g.c.player.x=500;
  g.c.taxiExit();assert.equal(g.c.player.vehicle,null);assert.equal(g.c.player.navDest.n,g.dest.n);assert.equal(g.c.player.money,4800);
  assert.equal(g.events.some(s=>/Вы на месте:|Пришли:/.test(s)),false);
});

test('bus last leg remains a tracked journey after alighting',()=>{
  const g=game();g.c.player.x=500;g.c.player.busPlan={dest:g.dest,toName:'Площадь',stage:'ride'};
  g.c.busPlanArrived();assert.equal(g.c.player.busPlan,null);assert.ok(g.c.player.waypoints);
  assert.equal(g.c.player.navDest&&g.c.player.navDest.n,g.dest.n);
  assert.equal(g.events.some(s=>/Вы на месте:|Пришли:/.test(s)),false);
});

for(const reachable of [true,false])test(`real map pointer-up ${reachable?'updates the trip destination':'preserves the trip destination when rerouting fails'}`,()=>{
  const g=game(),o=g.rental('bike',0);g.c.startRentalPlan(o,g.dest);g.c.enterVehicle(o);
  g.c.canvas=element();g.c.ptrs=new Map();g.c.pinch=null;g.c.dragging=false;g.c.innerWidth=2000;g.c.innerHeight=1000;
  g.c.cam.x=0;g.c.cam.y=0;g.c.cam.z=1;g.c.pdown={x:1500,y:500};
  const oldAuto=g.c.player.vehicle.auto;
  vm.runInContext(section(main,"canvas.addEventListener('pointerup'",'function walkTo('),g.c,{filename:'main.js:map-pointer-up'});
  g.c.world.pedAdj.disconnected=!reachable;
  g.c.canvas.events.pointerup({pointerId:1,clientX:1500,clientY:500});
  assert.equal(g.c.player.vehicle.dest.x,reachable?500:1000);
  if(reachable){g.c.player.vehicle.x=500;g.c.player.x=500;g.c.exitVehicle();assert.ok(g.c.player.navDest==null);assert.ok(g.events.some(s=>/Вы на месте: Точка на карте/.test(s)));}
  else assert.equal(g.c.player.vehicle.auto,oldAuto);
});
