// node --test tools/tests/bus-routing.test.js
// Production planBus/pathLen and production A* on a tiny pedestrian graph. No browser/API.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const points={P:[0,0],D:[1000,0],A:[10,0],Z:[990,0],G:[100,0],H:[900,0],B:[0,600],C:[1000,600],I:[10,10],J:[990,10]};
function route(name,from='A',to='Z',ride=1000){return {ref:name,stops:[{n:name+' start',s:0,p:points[from]},{n:name+' end',s:ride,p:points[to]}]};}
function game(links,routes){
  const context=vm.createContext({
    document:{querySelector:()=>({addEventListener(){}})},matchMedia:()=>({matches:false}),
    player:{x:0,y:0},WALK_SPEED:6,
    routePoint:(r,s)=>r.stops.find(st=>st.s===s).p,
    input:{points,links,routes},
  });
  const run=code=>vm.runInContext(code,context);
  for(const file of ['util.js','world.js','transport.js'])vm.runInContext(fs.readFileSync(path.join(root,'site/js',file),'utf8'),context,{filename:file});
  run(`
    globalThis.ids=Object.fromEntries(Object.keys(input.points).map((k,i)=>[k,i]));
    world={nodes:Object.values(input.points),N:Object.keys(ids).length,g:newGraph(),pedAdj:ADJ_PED,
      roads:[{c:10,hw:1}],ngrid:new Grid(100),routes:input.routes};
    graphNodes(world.g,world.N);
    globalThis.link=(a,b)=>{const i=ids[a],j=ids[b],L=dist(...world.nodes[i],...world.nodes[j]);graphEdge(world.g,i,j,L,0,1);graphEdge(world.g,j,i,L,0,1);};
    for(const [a,b] of input.links)link(a,b);
    world.nodes.forEach((p,i)=>world.ngrid.add(i,p[0],p[1],p[0],p[1]));
    globalThis.astarCalls=0;const realAstar=astar;astar=(...args)=>{astarCalls++;return realAstar(...args);};
  `);
  return {run,plan:()=>run('planBus({x:1000,y:0})')};
}

test('unreachable closest boarding stop does not hide another usable bus route',()=>{
  const g=game([['P','G'],['H','D'],['Z','D'],['A','I']],[route('blocked'),route('usable','G','H',800)]);
  const p=g.plan();
  assert.equal(p.route.ref,'usable');
  assert.equal(p.walk1,100);assert.equal(p.walk2,100);
  assert.equal(p.cost,200/6+800/8+60);
});

test('unreachable final pedestrian leg does not hide another usable bus route',()=>{
  const g=game([['P','A'],['P','G'],['H','D'],['Z','J']],[route('blocked-exit'),route('usable','G','H',800)]);
  assert.equal(g.plan().route.ref,'usable');
});

test('bus routes are ranked by actual walking detours rather than straight distance',()=>{
  const g=game([['P','B'],['B','A'],['Z','D'],['P','G'],['H','D']],[route('long-detour'),route('quick','G','H',800)]);
  const p=g.plan();
  assert.equal(p.route.ref,'quick');
  assert.equal(p.walk1,100);assert.equal(p.walk2,100);
});

test('reverse direction and intermediate stop count retain the existing plan contract',()=>{
  const r={ref:'reverse',stops:[{n:'Exit',s:0,p:points.H},{n:'Middle',s:500,p:[500,0]},{n:'Board',s:1000,p:points.G}]};
  const g=game([['P','G'],['H','D']],[r]);const p=g.plan();
  assert.equal(p.route,r);assert.equal(p.from.st.n,'Board');assert.equal(p.to.st.n,'Exit');
  assert.equal(p.dir,-1);assert.equal(p.nStops,2);assert.equal(p.ride,1000);
});

test('two hundred routes sharing stops perform only two pedestrian A* searches',()=>{
  const routes=Array.from({length:200},(_,i)=>route('route-'+i,'A','Z',1000+i));
  const g=game([['P','B'],['B','A'],['Z','C'],['C','D']],routes);
  assert.equal(g.plan().route.ref,'route-0');
  assert.equal(g.run('astarCalls'),2);
});

test('unreachable approaches are cached across shared stops as well',()=>{
  const routes=Array.from({length:200},(_,i)=>route('route-'+i));
  const g=game([['P','G'],['A','I'],['Z','D']],routes);
  assert.equal(g.plan(),null);assert.equal(g.run('astarCalls'),1);
});

test('walking cache is local to a search and respects newly connected map paths',()=>{
  const g=game([['P','G'],['A','I'],['Z','D']],[route('newly-reachable')]);
  assert.equal(g.plan(),null);
  g.run("link('P','A')");
  assert.equal(g.plan().route.ref,'newly-reachable');
  assert.equal(g.run('astarCalls'),3);
});

test('cheap distance screen rejects far boarding before pedestrian A*',()=>{
  const r={ref:'too-far',stops:[{s:0,p:[700,0]},{s:500,p:[1000,0]}]};
  const g=game([['P','G'],['H','D']],[r]);
  assert.equal(g.plan(),null);assert.equal(g.run('astarCalls'),0);
});

test('a slower lower-bound ETA avoids searching unrelated pedestrian approaches',()=>{
  const g=game([['P','G'],['H','D'],['A','I'],['Z','D']],[route('slow','A','Z',10000),route('quick','G','H',800)]);
  assert.equal(g.plan().route.ref,'quick');assert.equal(g.run('astarCalls'),2);
});
