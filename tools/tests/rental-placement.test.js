'use strict';
// Real spawn, spatial grid, polygon test and vehicle update; no browser/network.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=name=>fs.readFileSync(path.join(__dirname,'../../site/js',name),'utf8');
function building(p,pass=false){const xs=[],ys=[];for(let i=0;i<p.length;i+=2){xs.push(p[i]);ys.push(p[i+1]);}return {p,pass,bb:[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]};}
const rect=(x0,y0,x1,y1,pass=false)=>building([x0,y0,x1,y0,x1,y1,x0,y1],pass);
const road=(hx=1,hy=0)=>({d:2,px:0,py:0,seg:{ax:-20*hx,ay:-20*hy,bx:20*hx,by:20*hy,L:40,r:{hw:2,c:6}}});
function game(buildings=[],nearest=road(),random=.5){
  let lookups=0,queries=0;const c={Math:Object.create(Math),document:{querySelector:()=>null},matchMedia:()=>({matches:false}),
    world:{bbox:[-1000,-1000,1000,1000]},player:{busy:false,mood:50},keys:{},joyVec:[0,0],weather:{kind:'clear'},cars:[],buses:[],
    nearestRoadSeg:()=>{lookups++;return nearest;},isLightVehicle:k=>k==='bike'||k==='scooter',
    obstacleAhead:()=>Infinity,limitBySpace:v=>v,carSee:()=>{},setHint:()=>{},addEvent:()=>{},shake:0};
  c.Math.random=()=>random;vm.createContext(c);vm.runInContext(read('util.js'),c);
  vm.runInContext('world.bgrid=new Grid(20)',c);for(const b of buildings)c.world.bgrid.add(b,...b.bb);
  const query=c.world.bgrid.query.bind(c.world.bgrid);c.world.bgrid.query=(...a)=>{queries++;return query(...a);};
  vm.runInContext(read('world.js').match(/^function inBuilding\(x,y\).*$/m)[0],c);
  vm.runInContext(read('vehicles.js'),c);
  return {c,run:s=>vm.runInContext(s,c),lookups:()=>lookups,queries:()=>queries};
}
function assertFootprintClear(g,o){
  const s=g.run('VEH')[o.kind];
  for(let a=-10;a<=10;a++)for(let b=-6;b<=6;b++){
    const f=a/10*s.len*.5,q=b/6*s.wid*.5;
    assert.equal(!!g.c.inBuilding(o.x+o.hx*f-o.hy*q,o.y+o.hy*f+o.hx*q),false,'blocked vehicle footprint');
  }
}
function mount(g,o){
  const spec=g.run('VEH')[o.kind];g.c.player.vehicle={...o,spec,speed:0,damaged:0,auto:{wps:[[o.x+o.hx*20,o.y+o.hy*20]],i:0}};
  return g.c.player.vehicle;
}

test('open parking aligns to the street and adds exactly one correct rental',()=>{
  const g=game([],road(0,1)),o=g.c.addBikeAt(0,0);
  assert.equal(o.kind,'bike');assert.equal(o.color,'#1E806C');assert.equal(o.hx,0);assert.equal(o.hy,1);
  assert.equal(g.run('rentals.length'),1);assert.equal(g.lookups(),1);assert.equal(g.queries(),1);assertFootprintClear(g,o);
});
test('a free center with the front wheel in a wall uses the alternate safe direction',()=>{
  const g=game([rect(.8,-20,20,20)]);assert.equal(!!g.c.inBuilding(0,0),false);assert.ok(g.c.inBuilding(.9,0));
  const o=g.c.addBikeAt(0,0);assert.equal(o.x,0);assert.equal(o.y,0);assert.equal(Math.abs(o.hx),0);assert.equal(o.hy,1);assertFootprintClear(g,o);
});
test('bike length is checked before creation, independently of the shorter scooter',()=>{
  const g=game([rect(.9,-20,20,20)]),s=g.c.addScooterAt(0,0),b=g.c.addBikeAt(0,0);
  assert.equal(s.hx,1);assert.equal(Math.abs(b.hx),0);assert.equal(b.hy,1);assert.equal(g.run('rentals.length'),2);
  assertFootprintClear(g,s);assertFootprintClear(g,b);
});
test('scooter parking also protects its full footprint',()=>{
  const g=game([rect(.55,-20,20,20)]),o=g.c.addScooterAt(0,0);
  assert.equal(o.kind,'scooter');assert.equal(o.hy,1);assertFootprintClear(g,o);
});
test('a thin wall crossing between center, wheel and corner samples is detected',()=>{
  const g=game([rect(.2,-10,.21,10)]);
  for(const [x,y] of [[0,0],[-.9,0],[.9,0],[-1.05,-.475],[1.05,.475]])assert.equal(!!g.c.inBuilding(x,y),false);
  const o=g.c.addBikeAt(0,0);assert.ok(o);assert.ok(Math.hypot(o.x,o.y)>0);assertFootprintClear(g,o);
});
test('a tiny building entirely inside the footprint is detected without a center hit',()=>{
  const g=game([rect(.2,.2,.21,.21)]),o=g.c.addBikeAt(0,0);
  assert.ok(o);assert.ok(Math.hypot(o.x,o.y)>0);assertFootprintClear(g,o);
});
test('rotated street alignment uses the same full rectangle collision geometry',()=>{
  const h=Math.SQRT1_2,g=game([rect(.5,.5,.7,.7)],road(h,h)),o=g.c.addBikeAt(0,0);
  assert.ok(o);assert.ok(o.hx<0&&o.hy>0);assertFootprintClear(g,o);
});
test('blocked random offset falls back nearby instead of spawning inside a house',()=>{
  const g=game([rect(.9,.9,2,2)],road(),.9),o=g.c.addBikeAt(0,0);
  assert.equal(o.x,0);assert.equal(o.y,0);assertFootprintClear(g,o);
});
test('impossible parking returns null within 20 geometry checks and leaves rentals untouched',()=>{
  const g=game([rect(-20,-20,20,20)]);
  assert.equal(g.c.addBikeAt(0,0),null);assert.equal(g.run('rentals.length'),0);assert.equal(g.lookups(),1);assert.equal(g.queries(),20);
});
test('pass-through buildings follow the existing collision rule; no road is also supported',()=>{
  const g=game([rect(-20,-20,20,20,true)],null),o=g.c.addBikeAt(0,0);
  assert.ok(o);assert.equal(o.hx,1);assert.equal(o.hy,0);assertFootprintClear(g,o);
});
test('invalid coordinates never create rentals or query geometry',()=>{
  const g=game();assert.equal(g.c.addBikeAt(NaN,0),null);assert.equal(g.c.addScooterAt(0,Infinity),null);
  assert.equal(g.run('rentals.length'),0);assert.equal(g.lookups(),0);assert.equal(g.queries(),0);
});
test('real updateVehicle cancels the old nose-in-wall pose but drives from the new parking',()=>{
  const g=game([rect(.8,-20,20,20)]);
  const bad=mount(g,{kind:'bike',x:0,y:0,hx:1,hy:0});g.c.updateVehicle(.016);assert.equal(bad.auto,null);
  const o=g.c.addBikeAt(0,0),v=mount(g,o);
  for(let i=0;i<20;i++)g.c.updateVehicle(.016);
  assert.ok(v.auto);assert.ok(v.speed>0);assert.ok(v.y>o.y);assertFootprintClear(g,v);
});
