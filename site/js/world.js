// ===== Мир: дороги, граф, здания, переходы, деревья =====
const ROAD_W=[14,12,11,9,7.5,6,6,5,4,11,2,1.5,1.5];
const ROAD_SPEED=[20,17,14,12,11,9,8,6,5,0,0,0,0];
const SIDEWALK=2.4;
const K_H=0.42;              // 1 м высоты здания → 0.42 ед. на экране
const EXT=[0.22,-0.5];       // направление «выдавливания» крыш
const CAR_COLORS=['#C8CCD1','#2E3A46','#9AA3AD','#1F2A3A','#B33A3A','#3B5A8C','#DADDE0','#5A6B52','#7A4A3A','#E1E3E6','#8A6D3B','#4B4F55'];
let world=null;

function buildWorld(d){
  const nodes=d.nodes.map(p=>[p[0]/10,p[1]/10]);const N=nodes.length;
  const roads=d.roads.map((r,i)=>{let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const n of r.p){const p=nodes[n];if(p[0]<x0)x0=p[0];if(p[0]>x1)x1=p[0];if(p[1]<y0)y0=p[1];if(p[1]>y1)y1=p[1];}
    const w=r.l?Math.min(ROAD_W[r.c]*1.4,r.l*3.1+1):ROAD_W[r.c];
    return {c:r.c,n:r.n||'',o:r.o||0,p:r.p,w,hw:w/2,bb:[x0-w,y0-w,x1+w,y1+w],i,speed:(r.s?Math.min(r.s/3.6*0.9,20):ROAD_SPEED[r.c])||0,lanes:r.l||0};});
  const pedAdj=Array.from({length:N},()=>[]),carAdj=Array.from({length:N},()=>[]);
  const rgrid=new Grid(60);
  for(const r of roads){for(let i=0;i<r.p.length-1;i++){const a=r.p[i],b=r.p[i+1];const pa=nodes[a],pb=nodes[b];const L=dist(pa[0],pa[1],pb[0],pb[1]);if(L<0.05)continue;
    if(r.c>=2){pedAdj[a].push([b,L,r.i]);pedAdj[b].push([a,L,r.i]);}
    if(r.c<=8){if(r.o!==-1)carAdj[a].push([b,L,r.i]);if(r.o!==1)carAdj[b].push([a,L,r.i]);
      const seg={r,a,b,ax:pa[0],ay:pa[1],bx:pb[0],by:pb[1],L};rgrid.add(seg,Math.min(pa[0],pb[0])-r.hw-1,Math.min(pa[1],pb[1])-r.hw-1,Math.max(pa[0],pb[0])+r.hw+1,Math.max(pa[1],pb[1])+r.hw+1);}}}
  // здания
  const WALLS=['#EDE3CF','#F1E8D6','#E4D9C4','#EADFCB','#F3EBDD','#E7DCCB','#F0E4CE','#DFD3BE','#F2E6D2','#E9E0D4'];
  const ROOFS=['#A9937A','#8F7B66','#6F8F7C','#8F5F52','#9C9C94','#7E8C78','#A08A72','#8B7355'];
  const bgrid=new Grid(80);
  const buildings=d.buildings.map((b,i)=>{const p=new Float32Array(b.p.length);let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9,cx=0,cy=0;for(let k=0;k<b.p.length;k+=2){const x=b.p[k]/10,y=b.p[k+1]/10;p[k]=x;p[k+1]=y;cx+=x;cy+=y;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
    const n=b.p.length/2;const t=b.t||'';const hsh=Math.imul(i+1,2654435761)>>>0;let wall,roof;
    if(/church|cathedral|mosque|chapel|worship|temple|minaret/.test(t)){wall='#F3EBDD';roof='#5F8F7C';}
    else if(/commercial|retail|mall|supermarket|shop|office|kiosk/.test(t)){wall=['#E6E2DA','#DFDCD6','#E8E4DC'][hsh%3];roof=['#9A9A94','#8C9096','#A39E96'][(hsh>>>8)%3];}
    else if(/industrial|warehouse|garage|garages|service|hangar|shed/.test(t)){wall='#CDD0D3';roof='#8A8F94';}
    else if(/public|university|school|college|hospital|theatre|museum|government|civic|library|train_station|transportation/.test(t)){wall='#EADFC7';roof='#A08F78';}
    else{wall=WALLS[hsh%WALLS.length];roof=ROOFS[(hsh>>>8)%ROOFS.length];}
    const area=polyArea(p);const absA=Math.abs(area);let levels=b.h||(absA<60?1:2+(hsh>>>16)%4);if(absA<40)levels=1;
    const hm=Math.min(levels,22)*3.1*K_H;
    const o={p,h:levels,hm,n:b.n||'',t,bb:[x0,y0,x1,y1],cx:cx/n,cy:cy/n,i,wall,roof,sgn:area>0?1:-1,area:absA,lit:(hsh>>>4)%10<7,dash:(hsh>>>12)%7*0.3};bgrid.add(o,x0,y0,x1,y1);return o;});
  // площади
  const areas=d.areas.map(a=>{const p=new Float32Array(a.p.length);let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(let k=0;k<a.p.length;k+=2){p[k]=a.p[k]/10;p[k+1]=a.p[k+1]/10;if(p[k]<x0)x0=p[k];if(p[k]>x1)x1=p[k];if(p[k+1]<y0)y0=p[k+1];if(p[k+1]>y1)y1=p[k+1];}return {k:a.k,p,bb:[x0,y0,x1,y1]};});
  // деревья и припаркованные машины
  const rng=seeded(7);const trees=[];const tgrid=new Grid(100);
  for(const a of areas){
    if(/park|forest|grass|cemetery/.test(a.k)){const A=Math.abs(polyArea(a.p));const dens=a.k==='forest'?60:a.k==='park'?150:a.k==='cemetery'?130:300;let n=Math.min(450,Math.floor(A/dens));const bb=a.bb;let tries=0;
      while(n>0&&tries<n*8+40){tries++;const x=bb[0]+rng()*(bb[2]-bb[0]),y=bb[1]+rng()*(bb[3]-bb[1]);if(!pointInPoly(a.p,x,y))continue;const r=a.k==='forest'?2.2+rng()*2.2:1.7+rng()*2.3;const t={x,y,r,c:Math.floor(rng()*3)};trees.push(t);tgrid.add(t,x-r,y-r,x+r,y+r);n--;}}
    if(a.k==='parking'){const A=Math.abs(polyArea(a.p));a.cars=[];if(A<140)continue;const n=Math.min(16,Math.floor(A/95));const bb=a.bb;let tries=0;const ang=(bb[2]-bb[0]>bb[3]-bb[1])?0:Math.PI/2;
      while(a.cars.length<n&&tries<300){tries++;const x=bb[0]+rng()*(bb[2]-bb[0]),y=bb[1]+rng()*(bb[3]-bb[1]);if(!pointInPoly(a.p,x,y))continue;if(a.cars.some(c=>dist(c.x,c.y,x,y)<3.4))continue;a.cars.push({x,y,ang,color:CAR_COLORS[Math.floor(rng()*CAR_COLORS.length)]});}}}
  const stops=d.stops.map((s,i)=>({x:s.x/10,y:s.y/10,n:s.n,k:s.k,i}));
  const pois=d.pois.map((p,i)=>({x:p.x/10,y:p.y/10,t:p.t,n:p.n||'',st:p.st||'',i}));
  const routes=d.routes.map((r,i)=>{const pts=[];for(let k=0;k<r.p.length;k+=2)pts.push([r.p[k]/10,r.p[k+1]/10]);const cum=[0];for(let k=0;k<pts.length-1;k++)cum.push(cum[k]+dist(pts[k][0],pts[k][1],pts[k+1][0],pts[k+1][1]));
    return {ref:r.ref,name:r.name,type:r.type,pts,cum,len:cum[cum.length-1],stops:r.s.map(s=>({s:s[0],n:s[1]})),i};});
  const ngrid=new Grid(60);nodes.forEach((p,i)=>ngrid.add(i,p[0],p[1],p[0],p[1]));
  const bb=d.meta.bbox.map(v=>v/10);
  world={nodes,N,roads,pedAdj,carAdj,buildings,bgrid,areas,stops,pois,routes,ngrid,rgrid,trees,tgrid,bbox:bb,meta:d.meta,crossings:[],cgrid:new Grid(40)};
  // переходы: привязываем к ближайшей дороге
  for(const c of (d.crossings||[])){const x=c.x/10,y=c.y/10;const ns=nearestRoadSeg(x,y,9);if(!ns||ns.seg.r.c>8)continue;const s=ns.seg;const dx=(s.bx-s.ax)/s.L,dy=(s.by-s.ay)/s.L;
    if(world.crossings.some(o=>dist(o.x,o.y,ns.px,ns.py)<3))continue;
    const o={x:ns.px,y:ns.py,dx,dy,w:s.r.w,hw:s.r.hw,sig:!!c.s,road:s.r};world.crossings.push(o);world.cgrid.add(o,o.x-12,o.y-12,o.x+12,o.y+12);}
  // фонари вдоль улиц каждые ~28 м
  const lamps=[];const lgrid=new Grid(120);for(const r of roads){if(r.c>7||r.c<1)continue;let acc=14;for(let i=0;i<r.p.length-1;i++){const a=nodes[r.p[i]],b=nodes[r.p[i+1]];const L=dist(a[0],a[1],b[0],b[1]);let s=acc;while(s<L){const t=s/L;const x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;const l=[x,y];lamps.push(l);lgrid.add(l,x,y,x,y);s+=28;}acc=s-L;}}
  world.lamps=lamps;world.lgrid=lgrid;
  const pedNodes=[],carNodes=[];for(let i=0;i<N;i++){if(pedAdj[i].length)pedNodes.push(i);if(carAdj[i].length)carNodes.push(i);}
  world.pedNodes=pedNodes;world.carNodes=carNodes;
  return world;
}

function nearestRoadSeg(x,y,maxR){let best=null;world.rgrid.query(x-maxR,y-maxR,x+maxR,y+maxR,s=>{const vx=s.bx-s.ax,vy=s.by-s.ay;let t=((x-s.ax)*vx+(y-s.ay)*vy)/(s.L*s.L);t=clamp(t,0,1);const px=s.ax+vx*t,py=s.ay+vy*t;const d=Math.hypot(px-x,py-y);if(d<maxR&&(!best||d<best.d))best={seg:s,d,t,px,py};});return best;}
function nearestNode(x,y,adj,maxR){let best=-1,bd=(maxR||120)**2;
  for(let r=60;r<=(maxR||120);r+=60){world.ngrid.query(x-r,y-r,x+r,y+r,i=>{if(adj&&adj[i].length===0)return;const p=world.nodes[i];const d=(p[0]-x)**2+(p[1]-y)**2;if(d<bd){bd=d;best=i;}});if(best>=0)break;}
  return best;}
function inBuilding(x,y){let hit=null;world.bgrid.query(x,y,x,y,b=>{if(x<b.bb[0]||x>b.bb[2]||y<b.bb[1]||y>b.bb[3])return;if(pointInPoly(b.p,x,y)){hit=b;return false;}});return hit;}
function nearestRoadName(x,y){const ns=nearestRoadSeg(x,y,60);if(ns&&ns.seg.r.n)return ns.seg.r.n;let best='',bd=80*80;world.rgrid.query(x-80,y-80,x+80,y+80,s=>{if(!s.r.n)return;const d=(s.ax-x)**2+(s.ay-y)**2;if(d<bd){bd=d;best=s.r.n;}});return best;}
function nodeNear(list,center,R){for(let k=0;k<40;k++){const n=pick(list);const p=world.nodes[n];if(dist(p[0],p[1],center[0],center[1])<R)return n;}return pick(list);}

// ---------- A* ----------
let gArr,stampArr,cameArr,gen=0;
function astar(adj,start,goal,costFn){
  if(start<0||goal<0)return null;if(start===goal)return [start];
  if(!gArr){gArr=new Float64Array(world.N);stampArr=new Int32Array(world.N);cameArr=new Int32Array(world.N);}
  gen++;const nodes=world.nodes,gx=nodes[goal][0],gy=nodes[goal][1];
  const h=new Heap();gArr[start]=0;stampArr[start]=gen;cameArr[start]=-1;h.push(0,start);let iter=0;
  while(h.size){const [,u]=h.pop();if(u===goal){const path=[];let c=u;while(c!==-1){path.push(c);c=cameArr[c];}return path.reverse();}
    if(++iter>30000)return null;const gu=gArr[u];
    for(const [v,L,ri] of adj[u]){const ng=gu+L*costFn(world.roads[ri]);if(stampArr[v]!==gen||ng<gArr[v]){stampArr[v]=gen;gArr[v]=ng;cameArr[v]=u;const p=nodes[v];h.push(ng+Math.hypot(p[0]-gx,p[1]-gy)*0.95,v);}}}
  return null;}
const pedCost=r=>r.c<=4?1.6:(r.c>=9?0.85:1);
const carCost=r=>r.c<=4?0.8:(r.c>=7?1.5:1);
const pathQueue=[];
function requestPath(agent,adj,start,goal,costFn,cb){pathQueue.push({agent,adj,start,goal,costFn,cb});}
function processPaths(n){while(n-->0&&pathQueue.length){const q=pathQueue.shift();q.cb(astar(q.adj,q.start,q.goal,q.costFn));}}
// Путь по узлам → точки с учётом тротуара/полосы. side: 'ped' (тротуар справа) | 'car' (полоса справа)
function pathToWaypoints(path,adj,side){const wps=[];if(!path||path.length<2)return wps;
  for(let i=0;i<path.length-1;i++){const a=world.nodes[path[i]],b=world.nodes[path[i+1]];const L=dist(a[0],a[1],b[0],b[1])||1;const dx=(b[0]-a[0])/L,dy=(b[1]-a[1])/L;const e=adj[path[i]].find(q=>q[0]===path[i+1]);const r=e?world.roads[e[2]]:null;
    const off=side==='car'?(r?Math.max(1.2,r.hw*0.5):1.5):(r&&r.c<=8?r.hw+1.3:0);
    wps.push([a[0]-dy*off,a[1]+dx*off]);wps.push([b[0]-dy*off,b[1]+dx*off]);}
  return wps;}
