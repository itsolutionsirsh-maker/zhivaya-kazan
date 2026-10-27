// node --test tools/tests/folk-routing.test.js — no server, browser or paid API.
// Production A*, path queue, Walker, folk, situations and companion functions run in a small VM city.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');

function city() {
  const elements = new Map();
  const element = key => {
    if (!elements.has(key)) elements.set(key, {style: {}, hidden: false, addEventListener() {}, append() {}, focus() {}, blur() {}});
    return elements.get(key);
  };
  const context = vm.createContext({
    console, document: {querySelector: element}, window: {addEventListener() {}}, navigator: {}, matchMedia: () => ({matches: false}),
    performance: {now: () => 0}, localStorage: {getItem: () => null, setItem() {}},
    player: {x: 0, y: 0, hx: 1, hy: 0, money: 1000, mood: 50, name: 'Игрок'},
    clock: {minutes: 600, day: 1}, scene: 'city', chatNpc: null, interior: null, cine: null,
    weather: {kind: 'sun'}, WALK_SPEED: 6, PROG: {}, taxiCall: null,
    nearLine() {}, addEvent() {}, setHint() {}, progSave() {}, updateTripBox() {},
    boardTaxi: () => false, closeChat() {}, nearestRoadName: () => '', inWater: () => false,
    clearLine: () => true, pushOffRoad: () => null, cityHour: () => 10, isWeekend: () => false,
    timers: [], setTimeout(fn, ms) { context.timers.push({fn, ms}); },
  });
  const run = code => vm.runInContext(code, context);
  for (const name of ['util', 'world', 'agents', 'folk', 'situations', 'companion', 'folk-acts']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'site/js', name + '.js'), 'utf8'), context, {filename: name + '.js'});
  }
  run(`
    world={nodes:[[0,0],[100,0],[200,0],[100,100],[400,0],[500,0]],N:6,
      g:newGraph(),pedAdj:ADJ_PED,carAdj:ADJ_CAR,pedNodes:[0,1,2,3,4,5],carNodes:[0,1,2,3,4,5],
      roads:[{c:10,hw:1,p:[0,1,2]}],pois:[],squares:[],areas:[],stops:[],
      ngrid:new Grid(100),bgrid:new Grid(100),rdgrid:new Grid(100),rgrid:new Grid(100),cgrid:new Grid(100)};
    graphNodes(world.g,world.N);
    for(const [a,b] of [[0,1],[1,2],[1,3],[4,5]]){const L=dist(...world.nodes[a],...world.nodes[b]);graphEdge(world.g,a,b,L,0,7);graphEdge(world.g,b,a,L,0,7);}
    world.nodes.forEach((p,i)=>world.ngrid.add(i,p[0],p[1],p[0],p[1]));
    unsafeStep=()=>false;
    FOLK.ready=true;
    globalThis.f={id:'resident',name:'Житель',age:30,job:'сосед',at:'home',trip:null,
      p:{folk:'resident',name:'Житель',memory:[],clothes:'#333333'},day:[[0,'work']],
      places:{home:{x:0,y:0,node:0,inside:false,kind:'home',name:'дом'},
        work:{x:100,y:0,node:1,inside:false,kind:'street',name:'работа'},
        haunt:{x:200,y:0,node:2,inside:false,kind:'street',name:'парк'}}};
    FOLK.list=[f];folkSpawn(f,f.places.home);f.w.off=0;f.w.spd=2;
    globalThis.advance=(seconds)=>{for(let i=0;i<seconds*10;i++)if(f.w)f.w.update(.1);};
  `);
  return {run, context};
}

test('normal route uses real A* and Walker movement before arrival', () => {
  const {run} = city();
  run("folkGo(f,'work');processPaths(1)");
  assert.equal(run('f.at'), 'home');
  run('advance(10)');
  assert.ok(run('f.w.x') > 19 && run('f.w.x') < 21);
  run('advance(50)');
  assert.equal(run('f.at'), 'work');
  assert.equal(run('f.trip'), null);
  assert.equal(run('f.w.x'), 100);
});

test('unreachable path preserves position and logical place, including indoor origin', () => {
  const {run} = city();
  run("f.places.home.inside=true;f.w.x=12;f.places.work={x:400,y:0,node:4,inside:false};folkGo(f,'work');processPaths(1);updateFolk(.6)");
  assert.equal(run('f.at'), 'home');
  assert.equal(run('f.w.x'), 12);
  assert.equal(run('f.trip'), null);
  assert.equal(run('f.retry.until'), 615);
  assert.equal(run('pathQueue.length'), 0);
});

test('failed route retries after fifteen game minutes, not every update', () => {
  const {run} = city();
  run("f.places.work={x:400,y:0,node:4,inside:false};folkGo(f,'work');processPaths(1);clock.minutes=614;updateFolk(.6)");
  assert.equal(run('pathQueue.length'), 0);
  run('clock.minutes=615;updateFolk(.6)');
  assert.equal(run('pathQueue.length'), 1);
});

test('changed destination is not blocked by another destination retry', () => {
  const {run} = city();
  run("f.places.work={x:400,y:0,node:4,inside:false};folkGo(f,'work');processPaths(1);f.day=[[0,'haunt']];updateFolk(.6)");
  assert.equal(run('f.trip.to'), 'haunt');
  assert.equal(run('pathQueue.length'), 1);
});

test('same graph node with a distant indoor destination does not claim arrival', () => {
  const {run} = city();
  run("f.places.work={x:35,y:0,node:0,inside:true};folkGo(f,'work');processPaths(1)");
  assert.equal(run('f.at'), 'home');
  assert.equal(run('f.w.x'), 0);
  assert.equal(run('f.trip'), null);
  assert.ok(run('f.retry'));
});

test('same graph node with a reachable outdoor target is walked, not teleported', () => {
  const {run} = city();
  run("f.places.work={x:35,y:0,node:0,inside:false};folkGo(f,'work');processPaths(1)");
  assert.equal(run('f.at'), 'home');
  assert.equal(run('f.w.x'), 0);
  run('advance(1)');
  assert.ok(run('f.w.x') > 1 && run('f.w.x') < 3);
  run('advance(20)');
  assert.equal(run('f.at'), 'work');
  assert.equal(run('f.w.x'), 35);
});

test('same-node arrival requires actual proximity', () => {
  const {run} = city();
  run("f.places.work={x:3,y:0,node:0,inside:false};folkGo(f,'work');processPaths(1)");
  assert.equal(run('f.at'), 'work');
});

test('stale path callback and stale arrival cannot overwrite a newer trip', () => {
  const {run} = city();
  run("folkGo(f,'work');globalThis.oldArrival=f.w.arrive;folkGo(f,'haunt');processPaths(1);oldArrival.call(f.w)");
  assert.equal(run('f.w.state'), 'routing');
  assert.equal(run('f.trip.to'), 'haunt');
  assert.equal(run('f.at'), 'home');
  run('processPaths(1);advance(110)');
  assert.equal(run('f.at'), 'haunt');
});

test('dropped walker callback cannot mutate or remove its replacement', () => {
  const {run} = city();
  run("folkGo(f,'work');globalThis.old=f.w;folkDrop(f);folkSpawn(f,f.places.home);processPaths(1)");
  assert.equal(run('f.at'), 'home');
  assert.equal(run('walkers.length'), 1);
  assert.equal(run('f.w===old'), false);
  assert.equal(run('f.w.state'), 'folkStay');
});

test('replanning a moving resident starts at its current segment position', () => {
  const {run} = city();
  run("f.w.x=40;folkGo(f,'haunt');processPaths(1);f.w.update(.1)");
  assert.ok(run('f.w.x') > 40 && run('f.w.x') < 41);
});

test('joining a new route from the side preserves position and walks the connection', () => {
  const {run} = city();
  run("f.w.x=40;f.w.y=10;folkGo(f,'haunt');processPaths(1)");
  assert.equal(run('f.w.y'), 10);
  run('f.w.update(.1)');
  assert.ok(run('f.w.y') > 9 && run('f.w.y') < 10);
  assert.equal(run('f.w.x'), 40);
});

test('blocked route connection does not cut through a building', () => {
  const {run} = city();
  run("f.w.x=40;f.w.y=10;inBuilding=(x,y)=>y<9;folkGo(f,'haunt');processPaths(1)");
  assert.equal(run('f.w.x'), 40);
  assert.equal(run('f.w.y'), 10);
  assert.equal(run('f.trip'), null);
});

test('interior chat reserves the stable resident ID even when f.w is absent', () => {
  const {run} = city();
  run("folkDrop(f);chatNpc={p:f.p,folk:f.id,isInterior:true};updateFolk(.6)");
  assert.equal(run('walkers.length'), 0);
  assert.equal(run('f.at'), 'home');
  assert.equal(run('f.trip'), null);
});

test('interior refresh preserves the person currently speaking', () => {
  const {run} = city();
  run("folkDrop(f);f.at='work';f.places.work.inside=true;f.places.work.key='cafe';chatNpc={p:f.p,folk:f.id,isInterior:true,role:'staff',origP:{name:'Другой'}};globalThis.it={key:'cafe',npcs:[chatNpc],furn:[]};folkInterior(it)");
  assert.equal(run('it.npcs.length'), 1);
  assert.equal(run('chatNpc.p===f.p'), true);
});

test('closing an indoor conversation leaves a resident at the same indoor place', () => {
  const {run} = city();
  run("folkDrop(f);f.at='work';f.places.work.inside=true;chatNpc={p:f.p,folk:f.id,isInterior:true};updateFolk(.6);chatNpc=null;updateFolk(.6)");
  assert.equal(run('walkers.length'), 0);
  assert.equal(run('f.trip'), null);
  assert.equal(run('pathQueue.length'), 0);
});

test('interior companion is the canonical walker and cannot duplicate on schedule change', () => {
  const {run} = city();
  run("folkDrop(f);f.at='work';f.places.work.inside=true;interior={ret:{x:100,y:0},npcs:[]};globalThis.iw={isInterior:true,folk:f.id,p:f.p,role:'staff'};interior.npcs.push(iw);applyNpcAction(iw,{action:'follow'});applyNpcAction(iw,{action:'follow'});scene='city';interior=null;f.day=[[0,'home']];updateFolk(.6)");
  assert.equal(run('walkers.length'), 1);
  assert.equal(run('f.w===companion.w'), true);
  assert.equal(run('f.w.temp'), false);
  assert.equal(run('f.trip'), null);
  run('stopCompanion(true);processPaths(5);advance(70)');
  assert.equal(run('f.at'), 'home');
  assert.equal(run('walkers.length'), 1);
});

test('stale interior action is ignored after exit or for a different interior', () => {
  const {run} = city();
  run("globalThis.iw={isInterior:true,folk:f.id,p:f.p};interior=null");
  assert.equal(run("applyNpcAction(iw,{action:'follow'})"), null);
  run('interior={ret:{x:0,y:0},npcs:[]}');
  assert.equal(run("applyNpcAction(iw,{action:'follow'})"), null);
  assert.equal(run('walkers.length'), 1);
});

test('taxi passenger owns the resident until exit, then resident returns from dropoff', () => {
  const {run} = city();
  run("f.at='work';f.places.work.kind='taxi';player.vehicle={kind:'taxi',x:120,y:0};globalThis.v=player.vehicle;folkTaxiStart(f,v);updateFolk(.6)");
  assert.equal(run('walkers.length'), 0);
  assert.equal(run('folkWhere(f.id).at'), 'road');
  run('player.vehicle=null;folkTaxiEnd(v)');
  assert.equal(run('f.driving'), null);
  assert.equal(run('walkers.length'), 1);
  assert.equal(run('f.w.x'), 120);
  assert.equal(run('v.folkDriver'), undefined);
});

test('unexpected vehicle removal releases its resident driver on the next tick', () => {
  const {run} = city();
  run("player.vehicle={kind:'taxi',x:100,y:0};folkTaxiStart(f,player.vehicle);player.vehicle=null;updateFolk(.6)");
  assert.equal(run('f.driving'), null);
  assert.equal(run('walkers.length'), 1);
});

test('street taxi offer reserves a visible waiting car and driver before boarding', () => {
  const {run} = city();
  run("player.x=30;f.at='work';globalThis.s=startSit('folkAct',{w:f.w,f,act:'offer_ride'});faRide(s,{x:200,y:0,n:'Парк'},250);updateFolk(.6)");
  assert.equal(run('taxiCall.folkDriver'), 'resident');
  assert.equal(run('taxiCall.fixedFare'), 250);
  assert.equal(run('taxiCall.car.state'), 'scene');
  assert.equal(run('cars.includes(taxiCall.car)'), true);
  assert.equal(run('walkers.length'), 1);
  assert.equal(run('f.trip'), null);
  run('advance(10)');
  assert.equal(run('f.w.state'), 'folkStay');
  run('taxiCall=null;updateFolk(.6)');
  assert.equal(run('f.trip.to'), 'work');
});

test('blogger timeout does not end the open chat or move the resident', () => {
  const {run, context} = city();
  run("f.at='work';f.w.x=90;player.x=90;globalThis.s=startSit('folkAct',{w:f.w,f,act:'film'});s.phase='talk';s.wait=true;chatNpc=f.w;chatNpc.state='idle';faVideo(s,true,true)");
  context.timers.find(t => t.ms === 20000).fn();
  run('SIT.defs.folkAct.update(s,.1);processPaths(5)');
  assert.equal(run('s.done'), false);
  assert.equal(run('f.w.x'), 90);
  assert.equal(run('f.trip'), null);
  run('chatNpc=null;SIT.defs.folkAct.update(s,.1);processPaths(5)');
  assert.equal(run('s.done'), true);
  assert.equal(run('f.w.x'), 90);
  run('advance(10)');
  assert.equal(run('f.w.x'), 100);
});

test('ending blogger interaction cannot steal a resident from an active companion', () => {
  const {run} = city();
  run("globalThis.s=startSit('folkAct',{w:f.w,f,act:'film'});s.phase='talk';startCompanion(f.w,'follow');endSit(s);updateFolk(.6)");
  assert.equal(run('f.w===companion.w'), true);
  assert.equal(run('f.w.state'), 'companion');
  assert.equal(run('f.trip'), null);
});

test('reanchoring a busy resident preserves its physical companion', () => {
  const {run} = city();
  run("f.ward='yard';f.w.x=35;startCompanion(f.w,'follow');folkAnchors=()=>({});folkPlaces=()=>({home:{x:100,y:0,node:1,inside:false},work:{x:200,y:0,node:2,inside:false}});folkReanchor()");
  assert.equal(run('f.w===companion.w'), true);
  assert.equal(run('f.w.x'), 35);
  assert.equal(run('f.at'), 'home');
  assert.equal(run('f.away'), true);
});

test('a companion stays visible when the player mounts a bicycle', () => {
  const {run} = city();
  run("startCompanion(f.w,'follow');player.vehicle={kind:'bike'};updateCompanion(.1)");
  assert.notEqual(run('f.w.inside'), true);
});

test('street offer boards and exits through the real transport lifecycle without duplicating its driver', () => {
  const {run, context} = city();
  for (const name of ['vehicles', 'journey', 'transport']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'site/js', name + '.js'), 'utf8'), context, {filename: name + '.js'});
  }
  run("globalThis.followPlayer=()=>{};globalThis.walkTo=()=>true;f.at='work';globalThis.s=startSit('folkAct',{w:f.w,f,act:'offer_ride'});faRide(s,{x:200,y:0,n:'Парк'},250);updateFolk(.6)");
  assert.equal(run('player.vehicle.folkDriver'), 'resident');
  assert.equal(run('player.vehicle.driver'), 'Житель');
  assert.equal(run('player.vehicle.fixedFare'), 250);
  assert.equal(run('walkers.length'), 0);
  run('player.vehicle.x=100;player.x=100;taxiExit();processPaths(10)');
  assert.equal(run('player.vehicle'), null);
  assert.equal(run('player.money'), 750);
  assert.equal(run('f.driving'), null);
  assert.equal(run('walkers.length'), 1);
});
