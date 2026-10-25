// ===== Подгрузка карты кусками 2×2 км: вокруг игрока (и вокруг камеры, если игрок смотрит в сторону) =====
// Всё, что нужно везде (крупные улицы, маршруты, остановки, вода, больницы и т. п.), лежит в base.json и есть сразу.
// Дома, дворы, тропинки, парки, магазины и кафе приходят кусками; далёкие куски выгружаются, чтобы телефону хватало памяти.
const CHUNKS={loadR:3600,dropR:6500,busy:0,max:4,t:0,state:new Map(),fail:new Map()};
function chunkSize(){return (world.meta.chunk||20000)/10;}
function chunkKeysNear(x,y,R){const C=chunkSize(),idx=world.meta.chunks||{};const out=[];
  for(let cx=Math.floor((x-R)/C);cx<=Math.floor((x+R)/C);cx++)for(let cy=Math.floor((y-R)/C);cy<=Math.floor((y+R)/C);cy++){const k=cx+'_'+cy;if(!idx[k])continue;
    const d=Math.hypot(Math.max(0,Math.abs(x-(cx+0.5)*C)-C/2),Math.max(0,Math.abs(y-(cy+0.5)*C)-C/2));if(d<=R)out.push([d,k]);}
  out.sort((a,b)=>a[0]-b[0]);return out.map(o=>o[1]);}
async function loadChunk(k){if(CHUNKS.state.has(k))return;CHUNKS.state.set(k,'loading');CHUNKS.busy++;
  try{const r=await fetch('map/c_'+k+'.json?v='+(world.meta.v||'1'));if(!r.ok)throw new Error(r.status);const d=await r.json();
    if(CHUNKS.state.get(k)!=='loading')return;const rec=addMapPart(d,k);CHUNKS.state.set(k,'ready');CHUNKS.fail.delete(k);onChunkAdded(rec);}
  catch(e){CHUNKS.state.delete(k);CHUNKS.fail.set(k,performance.now());}
  finally{CHUNKS.busy--;}}
function onChunkAdded(rec){if(typeof _sideOff!=='undefined')_sideOff.clear();if(typeof overviewAddPart==='function')overviewAddPart(rec);
  // свой дом из сохранения — в квартале, который ещё не был загружен
  if(player.homeAt&&typeof homeAt==='function'){const b=homeAt(player.homeAt[0],player.homeAt[1]);if(b){player.home=b;player.homeAt=null;if(typeof folkReanchor==='function')folkReanchor();}}}
// куски вокруг точек старта — до показа игры, чтобы город вокруг был сразу
async function loadChunksAround(points,R){const ks=new Set();for(const p of points)for(const k of chunkKeysNear(p[0],p[1],R))ks.add(k);
  const list=[...ks];let i=0;const worker=async()=>{while(i<list.length){const k=list[i++];await loadChunk(k);}};await Promise.all([worker(),worker(),worker(),worker()]);}
function chunkTick(dt){if(!world||!world.meta.chunks)return;CHUNKS.t-=dt;if(CHUNKS.t>0)return;CHUNKS.t=0.3;
  const focus=[[player.x,player.y]];if(cam.free&&cam.z>0.5)focus.push([cam.x,cam.y]);
  if(CHUNKS.busy<CHUNKS.max){const now=performance.now();
    for(const f of focus){for(const k of chunkKeysNear(f[0],f[1],CHUNKS.loadR)){if(CHUNKS.busy>=CHUNKS.max)break;if(CHUNKS.state.has(k))continue;const ft=CHUNKS.fail.get(k);if(ft&&now-ft<15000)continue;loadChunk(k);}}}
  // выгрузка далёких
  const C=chunkSize();for(const [k,st] of CHUNKS.state){if(st!=='ready')continue;const [cx,cy]=k.split('_').map(Number);const mx=(cx+0.5)*C,my=(cy+0.5)*C;
    let near=false;for(const f of focus){if(Math.abs(f[0]-mx)<CHUNKS.dropR&&Math.abs(f[1]-my)<CHUNKS.dropR){near=true;break;}}
    if(!near){CHUNKS.state.delete(k);removeMapPart(k);}}}
// сразу после переезда (старт в своём районе) — всех, кого можно, поближе, не дожидаясь populationFollow
function populationJump(px,py){
  for(const w of walkers){if(w.bus||w.inside||w.companion||w.keep||w.sitBy!=null||w.folk||w.rally||w.rallySlot||w.isInterior||w.temp)continue;
    if(w.role!=='resident'&&w.role!=='courier'&&w.role!=='police')continue;
    const n=nodeNear(world.pedNodes,[px,py],w.role==='police'?400:300);const q=sidewalkPos(n);
    w.node=n;w.x=q[0];w.y=q[1];w.path=null;w.goalPoi=null;w.goalStop=null;w.waitStop=null;w.state='idle';w.ttl=rnd(0,4);if(w.anchor)w.anchor=[px+rnd(-150,150),py+rnd(-150,150)];}
  for(const c of cars){if(c.kind!=='car'&&c.kind!=='taxi'&&c.kind!=='police')continue;if(c.crashed||c.taxiFor||c.target!=null||c.state==='scene'||c.remove)continue;
    const n=nodeNear(world.carNodes,[px,py],c.kind==='police'?700:600);const q=world.nodes[n];c.node=n;c.x=q[0];c.y=q[1];c.path=null;c.creep=null;c.speed=0;c.state='idle';c.ttl=rnd(0.2,2);}}
// ---------- город вокруг игрока: кто остался далеко позади, тихо «переезжает» поближе (за пределами экрана) ----------
// Иначе после поездки на такси или метро на другой конец Казани вокруг было бы пусто: все жители остались бы на Баумана.
const FOLLOW={t:0,walkR:1100,carR:1500};
function populationFollow(dt){FOLLOW.t-=dt;if(FOLLOW.t>0||!world)return;FOLLOW.t=1.5;if(player.inside)return;
  const px=player.x,py=player.y;const vw=(typeof W!=='undefined'?W:1200)/Math.max(0.3,cam.z)/2+40,vh=(typeof H!=='undefined'?H:800)/Math.max(0.3,cam.z)/2+40;
  const offscreen=(x,y)=>Math.abs(x-cam.x)>vw||Math.abs(y-cam.y)>vh;
  let moved=0;
  for(const w of walkers){if(moved>=8)break;if(w.bus||w.inside||w.companion||w.keep||w.sitBy!=null||w.folk||w.rallySlot||w.isInterior||w.temp)continue;
    if(w.role!=='resident'&&w.role!=='courier'&&w.role!=='police')continue;if(!/^(idle|walk|routing|wait)$/.test(w.state))continue;
    if(Math.abs(w.x-px)<FOLLOW.walkR&&Math.abs(w.y-py)<FOLLOW.walkR)continue;
    for(let k=0;k<6;k++){const an=Math.random()*TAU,R=rnd(260,650);const n=nearestNode(px+Math.cos(an)*R,py+Math.sin(an)*R,world.pedAdj,120);if(n<0)continue;const q=sidewalkPos(n);if(!offscreen(q[0],q[1]))continue;
      w.node=n;w.x=q[0];w.y=q[1];w.path=null;w.goalPoi=null;w.goalStop=null;w.waitStop=null;w.state='idle';w.ttl=rnd(0.5,6);if(w.anchor)w.anchor=[px+rnd(-150,150),py+rnd(-150,150)];moved++;break;}}
  moved=0;
  for(const c of cars){if(moved>=5)break;if(c.kind!=='car'&&c.kind!=='taxi')continue;if(c.crashed||c.taxiFor||c.target!=null||c.state==='scene'||c.remove)continue;
    if(Math.abs(c.x-px)<FOLLOW.carR&&Math.abs(c.y-py)<FOLLOW.carR)continue;
    for(let k=0;k<6;k++){const an=Math.random()*TAU,R=rnd(350,900);const n=nearestNode(px+Math.cos(an)*R,py+Math.sin(an)*R,world.carAdj,150);if(n<0||!world.carAdj[n].length)continue;const q=world.nodes[n];if(!offscreen(q[0],q[1]))continue;
      c.node=n;c.x=q[0];c.y=q[1];c.path=null;c.creep=null;c.speed=0;c.state='idle';c.ttl=rnd(0.2,2);moved++;break;}}}
