// ===== Подгрузка карты кусками 2×2 км: вокруг игрока (и вокруг камеры, если игрок смотрит в сторону) =====
// Всё, что нужно везде (крупные улицы, маршруты, остановки, вода, больницы и т. п.), лежит в base.json и есть сразу.
// Дома, дворы, тропинки, парки, магазины и кафе приходят кусками; далёкие куски выгружаются, чтобы телефону хватало памяти.
const CHUNKS={loadR:3600,dropR:6500,busy:0,max:2,t:0,state:new Map(),fail:new Map()};
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
function onChunkAdded(rec){if(typeof _sideOff!=='undefined')_sideOff.clear();if(typeof overviewAddPart==='function')overviewAddPart(rec);}
// куски вокруг точек старта — до показа игры, чтобы город вокруг был сразу
async function loadChunksAround(points,R){const ks=new Set();for(const p of points)for(const k of chunkKeysNear(p[0],p[1],R))ks.add(k);
  const list=[...ks];let i=0;const worker=async()=>{while(i<list.length){const k=list[i++];await loadChunk(k);}};await Promise.all([worker(),worker(),worker(),worker()]);}
function chunkTick(dt){if(!world||!world.meta.chunks)return;CHUNKS.t-=dt;if(CHUNKS.t>0)return;CHUNKS.t=0.6;
  const focus=[[player.x,player.y]];if(cam.free&&cam.z>0.5)focus.push([cam.x,cam.y]);
  if(CHUNKS.busy<CHUNKS.max){const now=performance.now();
    for(const f of focus){for(const k of chunkKeysNear(f[0],f[1],CHUNKS.loadR)){if(CHUNKS.busy>=CHUNKS.max)break;if(CHUNKS.state.has(k))continue;const ft=CHUNKS.fail.get(k);if(ft&&now-ft<15000)continue;loadChunk(k);}}}
  // выгрузка далёких
  const C=chunkSize();for(const [k,st] of CHUNKS.state){if(st!=='ready')continue;const [cx,cy]=k.split('_').map(Number);const mx=(cx+0.5)*C,my=(cy+0.5)*C;
    let near=false;for(const f of focus){if(Math.abs(f[0]-mx)<CHUNKS.dropR&&Math.abs(f[1]-my)<CHUNKS.dropR){near=true;break;}}
    if(!near){CHUNKS.state.delete(k);removeMapPart(k);}}}
