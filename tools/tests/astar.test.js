// node --test tools/tests/astar.test.js
// Поиск пути (world.js): обычный A* и он же по частям — на решётке с разной ценой улиц; без браузера.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../..');

// решётка W×H узлов с шагом 10 м; часть улиц «большие» (c=3, пешком дороже), часть — тропинки (c=10, дешевле)
function grid(W,H,seed=1){
  const ctx=vm.createContext({document:{querySelector:()=>({addEventListener(){}})},matchMedia:()=>({matches:false}),input:{W,H,seed}});
  for(const f of ['util.js','world.js'])vm.runInContext(fs.readFileSync(path.join(root,'site/js',f),'utf8'),ctx,{filename:f});
  const run=code=>vm.runInContext(code,ctx);
  run(`
    let s=input.seed;const rr=()=>(s=(s*16807)%2147483647)/2147483647;
    world={nodes:[],N:0,g:newGraph(),pedAdj:ADJ_PED,roads:[{c:3,i:0},{c:6,i:1},{c:10,i:2}]};
    for(let y=0;y<input.H;y++)for(let x=0;x<input.W;x++)world.nodes.push([x*10,y*10]);
    world.N=world.nodes.length;graphNodes(world.g,world.N);
    globalThis.id=(x,y)=>y*input.W+x;
    globalThis.link=(a,b,r)=>{const L=dist(...world.nodes[a],...world.nodes[b]);graphEdge(world.g,a,b,L,r,1);graphEdge(world.g,b,a,L,r,1);};
    for(let y=0;y<input.H;y++)for(let x=0;x<input.W;x++){
      if(x+1<input.W&&rr()>0.08)link(id(x,y),id(x+1,y),Math.floor(rr()*3));
      if(y+1<input.H&&rr()>0.08)link(id(x,y),id(x,y+1),Math.floor(rr()*3));}
    // Дейкстра без предела — эталон цены пути
    globalThis.dijkstra=(a,b)=>{const N=world.N,d=new Float64Array(N).fill(Infinity),done=new Uint8Array(N);d[a]=0;
      for(;;){let u=-1,best=Infinity;for(let i=0;i<N;i++)if(!done[i]&&d[i]<best){best=d[i];u=i;}if(u<0)return null;if(u===b)return d[b];done[u]=1;
        for(let e=world.g.eh[u];e>=0;e=world.g.en[e]){const v=world.g.et[e];const nd=d[u]+world.g.el[e]*pedCost(world.roads[world.g.er[e]]);if(nd<d[v])d[v]=nd;}}};
    globalThis.cost=p=>{let c=0;for(let i=1;i<p.length;i++){let best=Infinity;for(let e=world.g.eh[p[i-1]];e>=0;e=world.g.en[e])if(world.g.et[e]===p[i])best=Math.min(best,world.g.el[e]*pedCost(world.roads[world.g.er[e]]));c+=best;}return c;};
  `);
  return run;
}

test('A* находит путь почти по цене Дейкстры, по существующим рёбрам',()=>{
  const run=grid(40,40,7);
  const r=run(`(()=>{const out=[];for(const [a,b] of [[id(0,0),id(39,39)],[id(5,30),id(35,2)],[id(20,0),id(20,39)],[id(0,39),id(39,0)]]){
    const ref=dijkstra(a,b);const p=astar(world.pedAdj,a,b,pedCost);out.push({ref,got:p?cost(p):null,first:p&&p[0]===a,last:p&&p[p.length-1]===b});}return out;})()`);
  for(const o of r){
    if(o.ref===null){assert.equal(o.got,null);continue;}
    assert.ok(o.first&&o.last);
    assert.ok(o.got<=o.ref*1.12+1e-6,`путь ${o.got} против лучшего ${o.ref}`);
  }
});

test('по частям — тот же путь, что и сразу целиком',()=>{
  const run=grid(50,50,3);
  const r=run(`(()=>{const a=id(1,1),b=id(48,47);const whole=astar(world.pedAdj,a,b,pedCost,1e6);
    const job=new Search();job.begin(world.pedAdj,a,b,pedCost,1e6);let res,parts=0;do{res=job.run(50);parts++;}while(res===undefined);
    return {whole:whole.join(','),part:res&&res.join(','),parts};})()`);
  assert.ok(r.parts>5,'поиск должен был пройти в несколько частей');
  assert.equal(r.part,r.whole);
});

test('между частями обычный поиск (жители) не портит дальний',()=>{
  const run=grid(50,50,5);
  const r=run(`(()=>{const a=id(0,0),b=id(49,49);const whole=astar(world.pedAdj,a,b,pedCost,1e6).join(',');
    const job=new Search();job.begin(world.pedAdj,a,b,pedCost,1e6);let res;do{res=job.run(40);astar(world.pedAdj,id(10,40),id(40,10),pedCost);}while(res===undefined);
    return {whole,part:res&&res.join(',')};})()`);
  assert.equal(r.part,r.whole);
});

test('город подгрузил кусок посреди поиска: массивы дорастают, путь находится',()=>{
  const run=grid(30,30,9);
  const r=run(`(()=>{const a=id(0,0),b=id(29,29);const job=new Search();job.begin(world.pedAdj,a,b,pedCost,1e6);let res=job.run(30);
    // новый кусок: 5000 узлов цепочкой от угла (далеко от цели), граф вырос — как addMapPart
    const k=world.N;for(let i=0;i<5000;i++)world.nodes.push([-10-i,0]);world.N=world.nodes.length;graphNodes(world.g,world.N);
    link(a,k,2);for(let i=1;i<5000;i++)link(k+i-1,k+i,2);
    do{res=job.run(30);}while(res===undefined);return {ok:!!res,last:res&&res[res.length-1]===b,len:job.g.length>=world.N};})()`);
  assert.ok(r.ok&&r.last&&r.len);
});

test('предел шагов: null вместо бесконечного поиска; больший предел — находит',()=>{
  const run=grid(60,60,11);
  const r=run(`(()=>{const a=id(0,0),b=id(59,59);return {small:astar(world.pedAdj,a,b,pedCost,50),big:!!astar(world.pedAdj,a,b,pedCost,1e6)};})()`);
  assert.equal(r.small,null);assert.equal(r.big,true);
});

test('нет пути — null; старт и цель совпали — [старт]; нет узла — null',()=>{
  const run=grid(10,10,2);
  const r=run(`(()=>{const k=world.N;world.nodes.push([500,500]);world.N++;graphNodes(world.g,world.N);
    return {none:astar(world.pedAdj,id(0,0),k,pedCost),same:astar(world.pedAdj,3,3,pedCost),bad:astar(world.pedAdj,-1,3,pedCost)};})()`);
  assert.equal(r.none,null);assert.deepEqual([...r.same],[3]);assert.equal(r.bad,null);
});
