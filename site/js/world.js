// ===== Мир: дороги, граф, здания, переходы, деревья =====
const ROAD_W=[14,12,11,9,7.5,6,6,5,4,11,2,1.5,1.5];
const ROAD_SPEED=[20,17,14,12,11,9,8,6,5,0,0,0,0];
const SIDEWALK=2.4;
const K_H=0.42;              // 1 м высоты здания → 0.42 ед. на экране
const EXT=[0.22,-0.5];       // направление «выдавливания» крыш
const CAR_COLORS=['#C8CCD1','#2E3A46','#9AA3AD','#1F2A3A','#B33A3A','#3B5A8C','#DADDE0','#5A6B52','#7A4A3A','#E1E3E6','#8A6D3B','#4B4F55'];
let world=null;

// Карта приходит частями: base (крупные улицы, остановки, маршруты, вода, важные места) и куски 2×2 км (дома, дворы, тропинки,
// парки, магазины), которые подгружаются вокруг игрока (см. chunks.js). Старый цельный kazan.json — это тот же base, только со всем сразу.
const WALLS=['#EDE3CF','#F1E8D6','#E4D9C4','#EADFCB','#F3EBDD','#E7DCCB','#F0E4CE','#DFD3BE','#F2E6D2','#E9E0D4'];
const ROOFS=['#A9937A','#8F7B66','#6F8F7C','#8F5F52','#9C9C94','#7E8C78','#A08A72','#8B7355'];
function makeBuilding(b){const p=new Float32Array(b.p.length);let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9,cx=0,cy=0;for(let k=0;k<b.p.length;k+=2){const x=b.p[k]/10,y=b.p[k+1]/10;p[k]=x;p[k+1]=y;cx+=x;cy+=y;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
    const n=b.p.length/2;const t=b.t||'';const hsh=Math.imul((b.p[0]*73856093)^(b.p[1]*19349663)^(n*83492791),2654435761)>>>0;let wall,roof;  // цвет от координат: тот же дом — тот же цвет при любой подгрузке
    if(/church|cathedral|mosque|chapel|worship|temple|minaret/.test(t)){wall='#F3EBDD';roof='#5F8F7C';}
    else if(/commercial|retail|mall|supermarket|shop|office|kiosk/.test(t)){wall=['#E6E2DA','#DFDCD6','#E8E4DC'][hsh%3];roof=['#9A9A94','#8C9096','#A39E96'][(hsh>>>8)%3];}
    else if(/industrial|warehouse|garage|garages|service|hangar|shed/.test(t)){wall='#CDD0D3';roof='#8A8F94';}
    else if(/public|university|school|college|hospital|theatre|museum|government|civic|library|train_station|transportation/.test(t)){wall='#EADFC7';roof='#A08F78';}
    else{wall=WALLS[hsh%WALLS.length];roof=ROOFS[(hsh>>>8)%ROOFS.length];}
    const area=polyArea(p);const absA=Math.abs(area);let levels=b.h||(absA<60?1:2+(hsh>>>16)%4);if(absA<40)levels=1;
    const nm=b.n||'';let dome=null,minarets=0,spire=null,pass=false;
    if(/Кул-Шариф/.test(nm)){wall='#F3F2EE';roof='#CFE3E8';levels=Math.max(levels,8);dome='#2B9CB4';minarets=4;}
    else if(/Сююмбике/.test(nm)){wall='#B4543A';roof='#9A4430';levels=19;spire='#3F7A5A';}
    else if(/Благовещенский собор/.test(nm)){wall='#F6F4EE';roof='#B9C6D3';levels=Math.max(levels,5);dome='#2F6DB5';}
    else if(/Дворец раиса/.test(nm)){wall='#F0D59A';roof='#B79E6B';}
    else if(/башня/i.test(nm)||/castle_tower/.test(t)){wall='#F7F4EE';roof='#E5E0D6';levels=Math.max(levels,5);spire='#4F8A5B';pass=true;}
    else if(/church|cathedral|chapel/.test(t)||/собор|церковь|храм|колокольня/i.test(nm)){wall='#F6F2EA';roof='#C9CED3';dome=/Петропавлов/.test(nm)?'#5E9E6E':'#C9A13B';if(/колокольня/i.test(nm)){levels=Math.max(levels,14);spire='#C9A13B';dome=null;}}
    else if(/mosque/.test(t)||/мечеть/i.test(nm)){wall='#F4F1EA';roof='#D3E2DE';dome='#3FA39B';minarets=1;}
    else if(t==='place_of_worship'){wall='#F4F1EA';roof='#D8D6CC';dome='#3FA39B';}
    const hm=Math.min(levels,22)*3.1*K_H;
    return {p,h:levels,hm,n:b.n||'',t,bb:[x0,y0,x1,y1],cx:cx/n,cy:cy/n,i:world.bseq++,wall,roof,sgn:area>0?1:-1,area:absA,lit:(hsh>>>4)%10<7,dash:(hsh>>>12)%7*0.3,dome,minarets,spire,pass};}
function strHash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}

// ---------- граф улиц: компактно, в типизированных массивах ----------
// Раньше у каждого узла было три списка (пешком, машина, спецмашина) из маленьких массивов [сосед, длина, улица] — после объезда
// всей Казани ~300 МБ. Теперь на направление ребра одна запись: куда, длина, улица, следующее ребро того же узла и виды пути
// (1 — пешком, 2 — машина, 4 — спецмашина), 17 байт. world.pedAdj/carAdj/emAdj — только «какой вид пути» для поиска.
// У узла: первое ребро (eh) и виды путей, которые из него выходят (nm; 16 и 32 — уже в списке pedNodes/carNodes).
// Отрезки машинных улиц для поиска «ближайшей дороги» — тоже номера в массивах (sa, sb, sr), в сетке лежит номер отрезка.
const ADJ_PED={m:1},ADJ_CAR={m:2},ADJ_EM={m:4};
function newGraph(){return {eh:new Int32Array(0),nm:new Uint8Array(0),E:0,et:new Int32Array(0),en:new Int32Array(0),el:new Float32Array(0),er:new Int32Array(0),ef:new Uint8Array(0),
  S:0,sa:new Int32Array(0),sb:new Int32Array(0),sr:new Int32Array(0)};}
function growTo(a,n){if(a.length>=n)return a;const b=new a.constructor(Math.max(n,Math.ceil(a.length*1.5)+4096));b.set(a);return b;}
function graphNodes(g,n){if(g.eh.length<n){const k=g.eh.length;g.eh=growTo(g.eh,n);g.eh.fill(-1,k);g.nm=growTo(g.nm,g.eh.length);}}
function graphEdge(g,a,b,L,ri,f){if(g.E>=g.et.length){const n=g.E+1;g.et=growTo(g.et,n);g.en=growTo(g.en,n);g.el=growTo(g.el,n);g.er=growTo(g.er,n);g.ef=growTo(g.ef,n);}
  const e=g.E++;g.et[e]=b;g.el[e]=L;g.er[e]=ri;g.ef[e]=f;g.en[e]=g.eh[a];g.eh[a]=e;g.nm[a]|=f;}
function graphSeg(g,a,b,ri){if(g.S>=g.sa.length){const n=g.S+1;g.sa=growTo(g.sa,n);g.sb=growTo(g.sb,n);g.sr=growTo(g.sr,n);}const s=g.S++;g.sa[s]=a;g.sb[s]=b;g.sr[s]=ri;return s;}
// есть ли из узла путь этого вида (раньше adj[n].length)
function hasAdj(adj,n){return (world.g.nm[n]&adj.m)!==0;}
// улица ребра a→b этого вида пути (раньше adj[a].find(e=>e[0]===b) и roads[e[2]])
function edgeRoad(adj,a,b){const g=world.g;for(let e=g.eh[a];e>=0;e=g.en[e])if(g.et[e]===b&&(g.ef[e]&adj.m))return world.roads[g.er[e]];return null;}
// рёбра узла списком [сосед, длина, улица] — для редких мест; в горячих (A*) — обход по eh/en прямо
function adjList(adj,n){const g=world.g,out=[];for(let e=g.eh[n];e>=0;e=g.en[e])if(g.ef[e]&adj.m)out.push([g.et[e],g.el[e],g.er[e]]);return out;}
// улицы в прямоугольнике — через сетку улиц (без перебора всех улиц города), каждая один раз
let _rq=0;
function roadsIn(x0,y0,x1,y1,cb){const G=world.rdgrid,c=G.cell,q=++_rq;
  for(let cx=Math.floor(x0/c);cx<=Math.floor(x1/c);cx++)for(let cy=Math.floor(y0/c);cy<=Math.floor(y1/c);cy++){const a=G.m.get(G.key(cx,cy));if(!a)continue;
    for(const r of a){if(r.q===q)continue;r.q=q;if(r.bb[2]<x0||r.bb[0]>x1||r.bb[3]<y0||r.bb[1]>y1)continue;cb(r);}}}

function buildWorld(d){
  world={nodes:[],N:0,roads:[],g:newGraph(),pedAdj:ADJ_PED,carAdj:ADJ_CAR,emAdj:ADJ_EM,pedNodes:[],carNodes:[],buildings:[],bgrid:new Grid(80),areas:[],stops:[],pois:[],routes:[],
    ngrid:new Grid(60),rgrid:new Grid(60),rdgrid:new Grid(250),trees:[],tgrid:new Grid(100),bbox:d.meta.bbox.map(v=>v/10),meta:d.meta,crossings:[],cgrid:new Grid(40),
    lamps:[],lgrid:new Grid(120),bseq:0,pseq:0,parts:new Map()};
  addMapPart(d,null);world.baseN=world.nodes.length;
  world.stops=d.stops.map((s,i)=>({x:s.x/10,y:s.y/10,n:s.n,k:s.k,i}));
  world.routes=d.routes.map((r,i)=>{const pts=[];for(let k=0;k<r.p.length;k+=2)pts.push([r.p[k]/10,r.p[k+1]/10]);const cum=[0];for(let k=0;k<pts.length-1;k++)cum.push(cum[k]+dist(pts[k][0],pts[k][1],pts[k+1][0],pts[k+1][1]));
    return {ref:r.ref,name:r.name,type:r.type,pts,cum,len:cum[cum.length-1],stops:r.s.map(s=>({s:s[0],n:s[1]})),i};});
  // переходы: привязываем к ближайшей дороге
  for(const c of (d.crossings||[])){const x=c.x/10,y=c.y/10;const ns=nearestRoadSeg(x,y,9);if(!ns||ns.seg.r.c>8)continue;const s=ns.seg;const dx=(s.bx-s.ax)/s.L,dy=(s.by-s.ay)/s.L;
    let dup=false;world.cgrid.query(ns.px-3,ns.py-3,ns.px+3,ns.py+3,o=>{if(dist(o.x,o.y,ns.px,ns.py)<3){dup=true;return false;}});if(dup)continue;
    const o={x:ns.px,y:ns.py,dx,dy,w:s.r.w,hw:s.r.hw,sig:!!c.s,road:s.r};world.crossings.push(o);world.cgrid.add(o,o.x-12,o.y-12,o.x+12,o.y+12);}
  // фонари вдоль улиц каждые ~28 м
  for(const r of world.roads){if(r.c>7||r.c<1)continue;let acc=14;for(let i=0;i<r.p.length-1;i++){const a=world.nodes[r.p[i]],b=world.nodes[r.p[i+1]];const L=dist(a[0],a[1],b[0],b[1]);let s=acc;while(s<L){const t=s/L;const x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;const l=[x,y];world.lamps.push(l);world.lgrid.add(l,x,y,x,y);s+=28;}acc=s-L;}}
  initLandmarks(d);
  return world;
}
// добавить часть карты: узлы, дороги (граф для пешеходов, машин и скорой), дома, площади с деревьями и парковками, места.
// В кусках ссылка на узел < 0 — это узел base (-(i+1)), иначе — свой узел куска.
function addMapPart(d,key){const W=world,g=W.g;const off=W.nodes.length;
  // квартал грузят второй раз (после выгрузки): его узлы и улицы остались в городе — не добавляем их снова, только дома, площади, места
  const kept=key!==null&&W.keptRoads?W.keptRoads.get(key):null;
  if(kept)d={nodes:[],roads:[],buildings:d.buildings,areas:d.areas,pois:d.pois};
  for(const p of d.nodes){const i=W.nodes.length;const q=[p[0]/10,p[1]/10];W.nodes.push(q);W.ngrid.add(i,q[0],q[1],q[0],q[1]);}
  W.N=W.nodes.length;graphNodes(g,W.N);
  const rec={key,buildings:[],areas:[],pois:[],trees:[],roads:kept||[]};const touched=new Set();
  if(key!==null&&!kept)(W.keptRoads||(W.keptRoads=new Map())).set(key,rec.roads);
  for(const r0 of d.roads){const p=key===null?r0.p:r0.p.map(v=>v<0?-v-1:v+off);let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const n of p){const q=W.nodes[n];if(q[0]<x0)x0=q[0];if(q[0]>x1)x1=q[0];if(q[1]<y0)y0=q[1];if(q[1]>y1)y1=q[1];}
    const w=r0.l?Math.min(ROAD_W[r0.c]*1.4,r0.l*3.1+1):ROAD_W[r0.c];
    const r={c:r0.c,n:r0.n||'',o:r0.o||0,p,w,hw:w/2,bb:[x0-w,y0-w,x1+w,y1+w],i:W.roads.length,speed:(r0.s?Math.min(r0.s/3.6*0.9,20):ROAD_SPEED[r0.c])||0,lim:r0.s||60,lanes:r0.l||0,q:0};W.roads.push(r);rec.roads.push(r);W.rdgrid.add(r,r.bb[0],r.bb[1],r.bb[2],r.bb[3]);
    // виды пути по направлениям: пешком — по всем, кроме магистралей; машины — по улицам (одностороннее — только по ходу); спецмашины — по улицам в обе стороны
    const fab=(r.c>=2?1:0)|(r.c<=8?(r.o!==-1?6:4):0),fba=(r.c>=2?1:0)|(r.c<=8?(r.o!==1?6:4):0);
    for(let i=0;i<p.length-1;i++){const a=p[i],b=p[i+1];const pa=W.nodes[a],pb=W.nodes[b];const L=dist(pa[0],pa[1],pb[0],pb[1]);if(L<0.05)continue;touched.add(a);touched.add(b);
      graphEdge(g,a,b,L,r.i,fab);graphEdge(g,b,a,L,r.i,fba);
      if(r.c<=8){const s=graphSeg(g,a,b,r.i);W.rgrid.add(s,Math.min(pa[0],pb[0])-r.hw-1,Math.min(pa[1],pb[1])-r.hw-1,Math.max(pa[0],pb[0])+r.hw+1,Math.max(pa[1],pb[1])+r.hw+1);}}}
  for(const n of touched){const f=g.nm[n];if((f&17)===1){g.nm[n]|=16;W.pedNodes.push(n);}if((f&34)===2){g.nm[n]|=32;W.carNodes.push(n);}}
  for(const b of d.buildings||[]){const o=makeBuilding(b);W.buildings.push(o);rec.buildings.push(o);W.bgrid.add(o,o.bb[0],o.bb[1],o.bb[2],o.bb[3]);}
  const rng=seeded(key===null?7:strHash(key));
  for(const a0 of d.areas||[]){const p=new Float32Array(a0.p.length);let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(let k=0;k<a0.p.length;k+=2){p[k]=a0.p[k]/10;p[k+1]=a0.p[k+1]/10;if(p[k]<x0)x0=p[k];if(p[k]>x1)x1=p[k];if(p[k+1]<y0)y0=p[k+1];if(p[k+1]>y1)y1=p[k+1];}
    const a={k:a0.k,p,bb:[x0,y0,x1,y1]};W.areas.push(a);rec.areas.push(a);
    // деревья и припаркованные машины
    if(/park|forest|grass|cemetery/.test(a.k)){const A=Math.abs(polyArea(a.p));const dens=a.k==='forest'?60:a.k==='park'?150:a.k==='cemetery'?130:300;let n=Math.min(450,Math.floor(A/dens));const bb=a.bb;let tries=0;
      while(n>0&&tries<n*8+40){tries++;const x=bb[0]+rng()*(bb[2]-bb[0]),y=bb[1]+rng()*(bb[3]-bb[1]);if(!pointInPoly(a.p,x,y))continue;const r=a.k==='forest'?2.2+rng()*2.2:1.7+rng()*2.3;const t={x,y,r,c:Math.floor(rng()*3)};W.trees.push(t);rec.trees.push(t);W.tgrid.add(t,x-r,y-r,x+r,y+r);n--;}}
    if(a.k==='parking'){const A=Math.abs(polyArea(a.p));a.cars=[];if(A<140)continue;const n=Math.min(16,Math.floor(A/95));const bb=a.bb;let tries=0;const ang=(bb[2]-bb[0]>bb[3]-bb[1])?0:Math.PI/2;
      while(a.cars.length<n&&tries<300){tries++;const x=bb[0]+rng()*(bb[2]-bb[0]),y=bb[1]+rng()*(bb[3]-bb[1]);if(!pointInPoly(a.p,x,y))continue;if(a.cars.some(c=>dist(c.x,c.y,x,y)<3.4))continue;a.cars.push({x,y,ang,color:CAR_COLORS[Math.floor(rng()*CAR_COLORS.length)]});}}}
  for(const p0 of d.pois||[]){const o={x:p0.x/10,y:p0.y/10,t:p0.t,n:p0.n||'',st:p0.st||'',i:W.pseq++};W.pois.push(o);rec.pois.push(o);}
  W.parts.set(key===null?'base':key,rec);return rec;}
// выгрузить кусок: дома, площади, деревья и места уходят из памяти; узлы и дороги остаются (на них могут ехать машины и идти люди)
function removeMapPart(key){const W=world;const rec=W.parts.get(key);if(!rec||key==='base')return;W.parts.delete(key);
  const drop=(arr,list)=>{if(!list.length)return arr;const s=new Set(list);return arr.filter(o=>!s.has(o));};
  for(const o of rec.buildings)W.bgrid.remove(o,o.bb[0],o.bb[1],o.bb[2],o.bb[3]);W.buildings=drop(W.buildings,rec.buildings);
  for(const t of rec.trees)W.tgrid.remove(t,t.x-t.r,t.y-t.r,t.x+t.r,t.y+t.r);W.trees=drop(W.trees,rec.trees);
  W.areas=drop(W.areas,rec.areas);W.pois=drop(W.pois,rec.pois);}

// ближайший отрезок машинной улицы: {seg:{r,a,b,ax,ay,bx,by,L},d,t,px,py} — объект отрезка собирается только для найденного
function nearestRoadSeg(x,y,maxR){const g=world.g,P=world.nodes;let best=-1,bd=maxR,bt=0,bx=0,by=0;
  world.rgrid.query(x-maxR,y-maxR,x+maxR,y+maxR,s=>{const pa=P[g.sa[s]],pb=P[g.sb[s]];const vx=pb[0]-pa[0],vy=pb[1]-pa[1];let t=((x-pa[0])*vx+(y-pa[1])*vy)/(vx*vx+vy*vy);t=clamp(t,0,1);const px=pa[0]+vx*t,py=pa[1]+vy*t;const d=Math.hypot(px-x,py-y);if(d<bd){bd=d;best=s;bt=t;bx=px;by=py;}});
  if(best<0)return null;const a=g.sa[best],b=g.sb[best],pa=P[a],pb=P[b];
  return {seg:{r:world.roads[g.sr[best]],a,b,ax:pa[0],ay:pa[1],bx:pb[0],by:pb[1],L:dist(pa[0],pa[1],pb[0],pb[1])},d:bd,t:bt,px:bx,py:by};}
function nearestNode(x,y,adj,maxR){const R=maxR||120;let best=-1,bd=R*R;
  // кольцами по 60 м, последнее — ровно на весь радиус (раньше при 80 или 150 м искало только 60 или 120, промах кидал жителя в случайную точку города)
  const nm=world.g.nm,m=adj?adj.m:0;
  for(let r=Math.min(60,R);;r=Math.min(r+60,R)){world.ngrid.query(x-r,y-r,x+r,y+r,i=>{if(m&&!(nm[i]&m))return;const p=world.nodes[i];const d=(p[0]-x)**2+(p[1]-y)**2;if(d<bd){bd=d;best=i;}});if(best>=0||r>=R)break;}
  return best;}
function inBuilding(x,y){let hit=null;world.bgrid.query(x,y,x,y,b=>{if(b.pass)return;if(x<b.bb[0]||x>b.bb[2]||y<b.bb[1]||y>b.bb[3])return;if(pointInPoly(b.p,x,y)){hit=b;return false;}});return hit;}
function nearestRoadName(x,y){const ns=nearestRoadSeg(x,y,60);if(ns&&ns.seg.r.n)return ns.seg.r.n;let best='',bd=80*80;const g=world.g;world.rgrid.query(x-80,y-80,x+80,y+80,s=>{const r=world.roads[g.sr[s]];if(!r.n)return;const a=world.nodes[g.sa[s]];const d=(a[0]-x)**2+(a[1]-y)**2;if(d<bd){bd=d;best=r.n;}});return best;}
// если пешеходная дорожка попала внутрь проезжей части — сдвинуть на тротуар (переходы поперёк дороги не трогаем)
function pushOffRoad(x,y,dx,dy){const ns=nearestRoadSeg(x,y,12);if(!ns||ns.seg.r.c>8||ns.d>=ns.seg.r.hw+0.9)return null;const s=ns.seg;const ux=(s.bx-s.ax)/s.L,uy=(s.by-s.ay)/s.L;if(Math.abs(dx*ux+dy*uy)<0.55)return null;
  let nx=x-ns.px,ny=y-ns.py;const d=Math.hypot(nx,ny);if(d<0.05){nx=-uy;ny=ux;}else{nx/=d;ny/=d;}const off=s.r.hw+1.2;return [ns.px+nx*off,ns.py+ny*off];}
// сдвиг тротуара от оси дороги a→b (вправо по ходу), но так, чтобы не залезть в дом: в старом центре дома стоят вплотную к проезжей части,
// и полный сдвиг уводил пешеходов сквозь стены. Проверяем точки вдоль отрезка и берём самый большой сдвиг без домов. Считается один раз на ребро.
const _sideOff=new Map();
function safeSideOff(a,b,want){if(want<=0.05)return want;const k=a*4194304+b;let o=_sideOff.get(k);if(o!==undefined)return Math.min(o,want);
  const pa=world.nodes[a],pb=world.nodes[b];const L=dist(pa[0],pa[1],pb[0],pb[1])||1;const dx=(pb[0]-pa[0])/L,dy=(pb[1]-pa[1])/L;const n=Math.min(14,Math.max(2,Math.ceil(L/3)));
  const free=off=>{for(let i=0;i<=n;i++){const t=i/n*L;if(inBuilding(pa[0]+dx*t-dy*off,pa[1]+dy*t+dx*off))return false;}return true;};
  o=0;for(const f of [1,0.8,0.6,0.42,0.25]){if(free(want*f)){o=want*f;break;}}_sideOff.set(k,o);return o;}
// точка на тротуаре рядом с узлом (а не на оси дороги)
function sidewalkPos(node){const p=world.nodes[node];let best=null;for(const e of adjList(world.pedAdj,node)){const r=world.roads[e[2]];if(r.c>8)return [p[0],p[1]];if(!best||r.hw>best.r.hw)best={e,r};}
  if(!best)return [p[0],p[1]];const q=world.nodes[best.e[0]];const L=dist(p[0],p[1],q[0],q[1])||1;const dx=(q[0]-p[0])/L,dy=(q[1]-p[1])/L;const off=best.r.hw+SIDEWALK*0.55;const sgn=Math.random()<0.5?1:-1;
  let x=p[0]-dy*off*sgn+dx*Math.min(2,L/2),y=p[1]+dx*off*sgn+dy*Math.min(2,L/2);if(inBuilding(x,y)){x=p[0]+dy*off*sgn+dx*Math.min(2,L/2);y=p[1]-dx*off*sgn+dy*Math.min(2,L/2);}return [x,y];}
function nodeNear(list,center,R){const adj=list===world.carNodes?world.carAdj:world.pedAdj;const cx=center[0],cy=center[1];const c=[];world.ngrid.query(cx-R,cy-R,cx+R,cy+R,i=>{if(!hasAdj(adj,i))return;const p=world.nodes[i];if((p[0]-cx)**2+(p[1]-cy)**2<R*R)c.push(i);});return c.length?pick(c):pick(list);}

// ---------- A* ----------
let gArr,stampArr,cameArr,gen=0;
function astar(adj,start,goal,costFn){
  if(start<0||goal<0)return null;if(start===goal)return [start];
  if(!gArr||gArr.length<world.N){const n=Math.ceil(world.N*1.25)+1024;gArr=new Float64Array(n);stampArr=new Int32Array(n);cameArr=new Int32Array(n);gen=0;}   // узлов становится больше, когда подгружаются куски
  gen++;const nodes=world.nodes,gx=nodes[goal][0],gy=nodes[goal][1];const G=world.g,eh=G.eh,en=G.en,et=G.et,el=G.el,er=G.er,ef=G.ef,m=adj.m,roads=world.roads;
  const h=new Heap();gArr[start]=0;stampArr[start]=gen;cameArr[start]=-1;h.push(0,start);let iter=0;
  while(h.size){const [,u]=h.pop();if(u===goal){const path=[];let c=u;while(c!==-1){path.push(c);c=cameArr[c];}return path.reverse();}
    if(++iter>30000)return null;const gu=gArr[u];
    for(let e=eh[u];e>=0;e=en[e]){if(!(ef[e]&m))continue;const v=et[e];const ng=gu+el[e]*costFn(roads[er[e]]);if(stampArr[v]!==gen||ng<gArr[v]){stampArr[v]=gen;gArr[v]=ng;cameArr[v]=u;const p=nodes[v];h.push(ng+Math.hypot(p[0]-gx,p[1]-gy)*0.95,v);}}}
  return null;}
const pedCost=r=>r.c<=4?1.6:(r.c>=9?0.85:1);
const carCost=r=>(world.blockedRoads&&world.blockedRoads.has(r.i)?40:1)*(r.c<=4?0.8:(r.c>=7?1.5:1));
const pathQueue=[];
function requestPath(agent,adj,start,goal,costFn,cb){pathQueue.push({agent,adj,start,goal,costFn,cb});}
function processPaths(n){while(n-->0&&pathQueue.length){const q=pathQueue.shift();q.cb(astar(q.adj,q.start,q.goal,q.costFn));}}
// Путь по узлам → точки с учётом тротуара/полосы. side: 'ped' (тротуар справа) | 'car' (полоса справа)
function pathToWaypoints(path,adj,side){const wps=[];if(!path||path.length<2)return wps;
  for(let i=0;i<path.length-1;i++){const a=world.nodes[path[i]],b=world.nodes[path[i+1]];const L=dist(a[0],a[1],b[0],b[1])||1;const dx=(b[0]-a[0])/L,dy=(b[1]-a[1])/L;const r=edgeRoad(adj,path[i],path[i+1]);
    const off=side==='car'?(r?Math.max(1.2,r.hw*0.5):1.5):(r&&r.c<=8?safeSideOff(path[i],path[i+1],r.hw+1.3):0);
    let p1=[a[0]-dy*off,a[1]+dx*off],p2=[b[0]-dy*off,b[1]+dx*off];if(side==='ped'&&r&&r.c>8){p1=pushOffRoad(p1[0],p1[1],dx,dy)||p1;p2=pushOffRoad(p2[0],p2[1],dx,dy)||p2;}
    wps.push(p1);wps.push(p2);}
  return wps;}
