'use strict';
const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const {measureCompletedFrames}=require('./render-metrics');
const {parkSnapshotTaxi}=require('./visual-fixtures');
const root=path.join(__dirname,'../..'), source=fs.readFileSync(path.join(root,'site/js/render.js'),'utf8');

function drawingContext(calls) {
  const state={globalAlpha:1}, stack=[];
  return new Proxy(state,{get(target,key){
    if(key in target)return target[key];
    if(key==='save')return ()=>{stack.push({...target});calls.push(['save']);};
    if(key==='restore')return ()=>{Object.assign(target,stack.pop());calls.push(['restore']);};
    if(key==='measureText')return text=>({width:String(text).length*6});
    return (...args)=>{calls.push([key,...args]);};
  }});
}
function setup() {
  const calls=[],created=[],paths=[],ctx=drawingContext(calls),map={style:{},getContext:()=>ctx},mini={getContext:()=>ctx};
  const s={console,Math,innerWidth:390,innerHeight:844,LOD:2,TAU:Math.PI*2,EXT:[-.3,-.5],reduceMotion:false,
    performance:{now:()=>1000},clamp:(v,lo,hi)=>Math.max(lo,Math.min(hi,v)),shade:c=>c,
    Path2D:class {constructor(){paths.push(this);}rect(...r){this.rectArgs=r;}},
    $:id=>id==='#map'?map:mini,document:{createElement(){const c={getContext:()=>drawingContext([])};created.push(c);return c;}},
    player:{x:195,y:422,hx:1,hy:0},scene:'city',currentAction:null,cam:{z:9.5},rentals:[],cars:[],ownCar:null,
    rrect:(g,...args)=>calls.push(['rrect',...args]),poiBuilding:p=>p._b};
  s.window=s;s.addEventListener=()=>{};s.devicePixelRatio=2;
  vm.createContext(s);vm.runInContext(source,s);calls.length=0;
  return {s,calls,created,paths,ctx,run:code=>vm.runInContext(code,s)};
}
const building=()=>({p:[0,0,20,0,20,20,0,20],sgn:1,hm:10,h:0,wall:'#aaa',roof:'#ddd',i:2,dash:0});

test('E stays inside all four viewport edges, with and without a distant player name',()=>{
  const {s,calls}=setup();
  for(const [x,y] of [[1,422],[389,422],[195,1],[195,843],[1,1],[389,843]])for(const nameBox of [null,{x:160,y:370,w:70,h:30}]){
    calls.length=0;s.currentAction={tk:'person',at:{x,y}};s.drawActionTarget((x,y)=>[x,y],5.5,nameBox);
    const e=calls.find(c=>c[0]==='fillText'&&c[1]==='E');assert.ok(e);
    assert.ok(e[2]>=12&&e[2]<=378,JSON.stringify(e));assert.ok(e[3]>=12&&e[3]<=832.5,JSON.stringify(e));
  }
});
test('clamping E also rechecks collision with the player name',()=>{
  const {s,calls}=setup();s.player.x=350;
  const n={x:325,y:394,w:50,h:30};s.currentAction={tk:'person',at:{x:372,y:422}};
  s.drawActionTarget((x,y)=>[x,y],5.5,n);
  const e=calls.find(c=>c[0]==='fillText'&&c[1]==='E'),x=e[2],y=e[3]-.5;
  assert.ok(x>=12&&x<=378&&y>=12&&y<=832);assert.equal(x+13>n.x&&x-13<n.x+n.w&&y+13>n.y&&y-13<n.y+n.h,false);
});
test('bicycle rider uses the bicycle and person, with no car renderer',()=>{
  const {s}=setup();let bikes=0,people=0;
  s.drawBicycle=()=>bikes++;s.drawPerson=()=>people++;s.drawCarSprite=()=>assert.fail('bicycle drawn as car');
  s.drawPlayerWorld(0,0,1,0,{kind:'bike'},{},0,true);assert.equal(bikes,1);assert.equal(people,1);
});
test('bicycle has a cheaper far silhouette and no per-sprite raster allocation',()=>{
  const {s,calls,created}=setup();s.LOD=0;s.drawBicycle(0,0,1,0);const low=calls.length;
  calls.length=0;s.LOD=2;s.drawBicycle(0,0,1,0);assert.ok(calls.length>low);assert.equal(created.length,0);
});
test('transport glyph cache includes bike, stays fixed, and is reused',()=>{
  const {s,created}=setup();s.rentals=[{kind:'bike',x:0,y:0}];
  s.drawTransportMarks((x,y)=>[x,y],9.5,-10,-10,10,10);assert.equal(created.length,5);
  assert.equal(created.reduce((sum,c)=>sum+c.width*c.height*4,0),32000);
  s.drawTransportMarks((x,y)=>[x,y],9.5,-10,-10,10,10);assert.equal(created.length,5);
});
test('facade detail has both a per-building and a per-frame cap, and no distant work',()=>{
  const {s,run}=setup();let details=0;s.drawFacadeDetail=()=>details++;
  const b=building();b.p=[];for(let i=0;i<20;i++)b.p.push(i%2?20:0,i*2);
  s.drawBuilding(b,9.5,0);assert.equal(details,1);
  for(let i=0;i<60;i++)s.drawBuilding(b,9.5,0);assert.equal(details,16);
  run('facadeWallsLeft=16');s.LOD=0;s.drawBuilding(b,2.5,0);assert.equal(details,16);
});

test('facade ornament uses one stroke and doors reuse four vector paths without changing their geometry',()=>{
  const {s,calls,paths,created}=setup(),b=building(),p={t:'cafe',x:8,y:8,_b:b};
  s.drawFacadeDetail(0,0,20,0,-3,-5,2);assert.equal(calls.filter(c=>c[0]==='stroke').length,1);
  calls.length=0;s.drawCafeEntrances([p]);assert.equal(paths.length,4);assert.equal(calls.length,7);
  const e=s.cafeEntry(p,b),tr=calls.find(c=>c[0]==='transform');
  [e.ux,e.uy,-.9,-1.5,e.x,e.y].forEach((v,i)=>assert.ok(Math.abs(tr[i+1]-v)<1e-10));
  assert.deepEqual(paths.map(p=>p.rectArgs),[[-.75,0,1.5,.85],[-.54,.15,1.08,.55],[-1.25,.84,2.5,.26],[-1.25,.84,2.5,.07]]);
  for(let i=0;i<100;i++)s.drawCafeEntrances([p]);assert.equal(paths.length,4);assert.equal(created.length,0);
});
test('cafe geometry is bounded; cold frames resolve no more than two entrances',()=>{
  const {s,run,created}=setup();let lookups=0;const b=building();
  s.poiBuilding=p=>{lookups++;return p._b=b;};
  const pois=Array.from({length:20},(_,i)=>({t:'cafe',x:8+i/100,y:8}));
  s.drawCafeEntrances(pois);assert.equal(lookups,2);s.drawCafeEntrances(pois);assert.equal(lookups,4);
  s.drawCafeEntrances(pois);assert.equal(lookups,6);s.drawCafeEntrances(pois);assert.equal(lookups,6);
  for(let i=0;i<200;i++)s.cafeEntry({x:10,y:10},b);assert.equal(run('cafeEntryCache.size'),96);
  s.LOD=0;s.drawCafeEntrances([{t:'cafe',x:2,y:2}]);assert.equal(lookups,6);assert.equal(created.length,0);
});
test('stops retain the old distant silhouette; extra roof and bench only at LOD2',()=>{
  const {s,calls}=setup();s.LOD=0;s.drawStop({x:1,y:1,k:'bus'});assert.equal(calls.filter(c=>c[0]==='fillRect').length,1);
  calls.length=0;s.LOD=2;s.drawStop({x:1,y:1,k:'bus'});assert.equal(calls.filter(c=>c[0]==='fillRect').length,3);assert.ok(calls.length<40);
});
test('cafes without buildings do not consume the cold-cache quota forever',()=>{
  const {s}=setup(),b=building();let lookups=0;
  s.poiBuilding=p=>{lookups++;return p._b=p.missing?null:b;};
  const pois=[{t:'cafe',x:0,y:0,missing:true},{t:'cafe',x:1,y:0,missing:true},{t:'cafe',x:8,y:8}];
  s.drawCafeEntrances(pois);assert.equal(lookups,2);s.drawCafeEntrances(pois);assert.equal(lookups,3);
  s.drawCafeEntrances(pois);assert.equal(lookups,3);
});
test('the selected cafe uses its drawn door for E instead of another nearest wall',()=>{
  const {s,calls}=setup(),b=building(),p={t:'cafe',x:8,y:8,_b:b};
  s.drawCafeEntrances([p]);const entry=s.cafeEntry(p,b);assert.equal(entry.missing,undefined);
  s.player.x=entry.x-4;s.player.y=entry.y-5;   // снаружи, ближайшая стена в 4–5 м, нарисованная дверь в 6,4 м — метка у двери
  s.currentAction={tk:'poi',at:p,bld:b};calls.length=0;s.drawActionTarget((x,y)=>[100+x*5,100+y*5],9.5,null);
  const dx=entry.x-s.player.x,dy=entry.y-s.player.y,L=Math.hypot(dx,dy),e=calls.find(c=>c[0]==='fillText'&&c[1]==='E');
  assert.ok(Math.abs(e[2]-(100+entry.x*5+dx/L*20))<.00001);assert.ok(Math.abs(e[3]-(100+entry.y*5+dy/L*20+.5))<.00001);
});
test('a drawn door farther than 10 m does not pull E away from the wall next to the player',()=>{
  const {s,calls}=setup(),b=building(),p={t:'cafe',x:8,y:8,_b:b};
  s.player.x=-6;s.player.y=8;s.drawCafeEntrances([p]);const entry=s.cafeEntry(p,b);assert.equal(entry.missing,undefined);
  assert.ok(Math.hypot(entry.x-s.player.x,entry.y-s.player.y)>10);
  s.currentAction={tk:'poi',at:p,bld:b};calls.length=0;s.drawActionTarget((x,y)=>[100+x*5,100+y*5],9.5,null);
  const e=calls.find(c=>c[0]==='fillText'&&c[1]==='E');
  assert.ok(Math.abs(e[2]-(100+0*5+20))<.00001);assert.ok(Math.abs(e[3]-(100+8*5+.5))<.00001);
});
test('journey hints draw at most eight short real transitions without modifying them',()=>{
  const {s,calls,ctx}=setup();const hint={kind:'boarding',fromX:0,fromY:0,toX:2,toY:1,x:2,y:1,startedAt:900,durationMs:450};
  s.journeyVisualHints=Array.from({length:12},()=>({...hint}));const original=JSON.stringify(s.journeyVisualHints);
  s.drawJourneyHints(1000,-10,-10,10,10);assert.equal(calls.filter(c=>c[0]==='ellipse').length,24);
  assert.equal(JSON.stringify(s.journeyVisualHints),original);assert.equal(ctx.globalAlpha,1);
  calls.length=0;s.drawJourneyHints(1400,-10,-10,10,10);assert.equal(calls.length,0);
});
test('journey hints skip invisible, invalid and long transitions; reduced motion stays static',()=>{
  const {s,calls}=setup();const h={kind:'exiting',fromX:0,fromY:0,toX:2,toY:1,startedAt:900,durationMs:450};
  s.journeyVisualHints=[{...h,toX:NaN},{...h,fromX:100,toX:101},{...h,toX:100}];s.drawJourneyHints(1000,-10,-10,10,10);assert.equal(calls.length,0);
  s.journeyVisualHints=[h];s.reduceMotion=true;s.drawJourneyHints(1000,-10,-10,10,10);const first=calls.filter(c=>c[0]==='ellipse');
  calls.length=0;s.drawJourneyHints(1200,-10,-10,10,10);assert.deepEqual(calls.filter(c=>c[0]==='ellipse'),first);assert.equal(first.length,1);
});

function metricSetup() {
  let now=0,finish;const s={performance:{now:()=>now},setTimeout:cb=>{finish=cb;},render(){now+=2;return 'rendered';},renderInterior(){now+=3;}};
  s.window=s;vm.createContext(s);vm.runInContext('this.measure='+measureCompletedFrames.toString(),s);
  return {s,setNow:v=>{now=v;},finish:()=>finish()};
}
test('120 Hz scheduling with 60 completed renders reports 60 FPS and completed-frame p95',async()=>{
  const {s,setNow,finish}=metricSetup(),original=s.render,p=s.measure({durationMs:1000,maxSamples:8});
  for(let tick=1;tick<=120;tick++){setNow(tick*1000/120);if(tick%2===0)assert.equal(s.render(),'rendered');}
  setNow(1000);finish();const m=await p;assert.equal(m.completed_frames,60);assert.equal(m.fps,60);
  assert.equal(m.completed_interval_p95_ms,16.7);assert.equal(m.render_p95_ms,2);assert.equal(m.render_samples,8);assert.equal(m.interval_samples,8);assert.equal(s.render,original);
});
test('completed render metrics remain bounded and restore both renderers',async()=>{
  const {s,setNow,finish}=metricSetup(),interior=s.renderInterior,p=s.measure({durationMs:5000,maxSamples:100000});
  for(let i=0;i<1000;i++){setNow(i*5);if(i%2)s.render();else s.renderInterior();}setNow(5000);finish();const m=await p;
  assert.equal(m.render_samples,600);assert.equal(m.interval_samples,600);assert.equal(m.sample_limit,600);assert.equal(s.renderInterior,interior);
});
test('a thrown renderer is not counted as a completed frame; idle periods lower FPS',async()=>{
  const {s,setNow,finish}=metricSetup();s.render=()=>{throw new Error('render failed');};const original=s.render,p=s.measure({durationMs:1000});
  assert.throws(()=>s.render(),/render failed/);setNow(100);s.renderInterior();setNow(1000);finish();const m=await p;
  assert.equal(m.completed_frames,1);assert.equal(m.fps,1);assert.equal(m.completed_interval_p95_ms,null);assert.equal(s.render,original);
});
test('snapshot taxi remains parked after real Car.update and a late routing callback',()=>{
  let pending;const source=fs.readFileSync(path.join(root,'site/js/agents.js'),'utf8');
  const s={world:{nodes:[[1000,1000],[1100,1000]],carAdj:{},emAdj:{},carNodes:[0,1]},rnd:()=>10,pick:a=>a[0],CAR_COLORS:['#fff'],carCost:()=>0,
    requestPath:(owner,adj,from,to,cost,cb)=>{pending=cb;}};
  vm.createContext(s);vm.runInContext(source.slice(source.indexOf('class Car{'),source.indexOf('class Bus{'))+';this.Car=Car;',s);
  const taxi=new s.Car('car',0);taxi.newGoal(1);parkSnapshotTaxi(taxi,0,-8);pending([0,1]);
  taxi.update(.25,[]);assert.equal(taxi.x,0);assert.equal(taxi.y,-8);assert.equal(taxi.path,null);assert.equal(taxi.state,'idle');
});
