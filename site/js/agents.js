// ===== Жители, машины, транспорт, происшествия =====
const NAMES_M=['Айрат','Ильдар','Марат','Рустем','Данил','Тимур','Артур','Руслан','Камиль','Булат','Ильнур','Наиль','Эмиль','Радик','Ринат','Саша','Дима','Антон','Фарид','Ленар','Ильяс','Ravil'.replace('Ravil','Равиль')];
const NAMES_F=['Гузель','Алсу','Ляйсан','Диляра','Аня','Карина','Эльвира','Регина','Зиля','Дина','Алина','Лейсан','Лиля','Милана','Ирина','Кристина','Айгуль','Чулпан','Полина','Наташа','Алия','Рамиля'];
const JOBS=['студент КФУ','бариста в кофейне на Баумана','курьер','бухгалтер','таксист','учитель математики','программист','продавец в «Бахетле»','пенсионер, бывший инженер КАПО','экскурсовод по Кремлю','врач в РКБ','дизайнер','официант','мама в декрете','маркетолог','сантехник','юрист','повар, делает лучшие эчпочмаки','журналист','музыкант','риелтор','водитель трамвая','фотограф','парикмахер'];
const TRAITS=['весёлый и болтливый','вечно спешит','ворчливый, но добрый','мечтатель','очень вежливый','любит давать советы','немного стеснительный','обожает Казань и рассказывает о ней','скептик','спортивный, бегает по набережной','сплетник, знает все новости района','философ'];
const MOODS=['хорошее','отличное','так себе','задумчивое','уставшее','праздничное','тревожное'];
const CLOTHES=['#D64545','#E07B39','#3E8ED0','#2F9E6B','#8E44AD','#C2185B','#1E88E5','#F4B400','#5D4037','#00897B','#37474F','#6D4C41','#283593','#AD1457','#ECEFF1','#212121','#7CB342','#546E7A','#B0BEC5','#4E342E'];
const SKINS=['#F1D3B5','#E8C4A0','#D9A986','#C58B63','#F4DCC4'];
const HAIRS=['#2B1B12','#4A2E1C','#6B4A2E','#9A7B52','#C9A86A','#1A1A1A','#8C8C8C','#3E2723'];
let nextId=1;
function makePersona(role){const f=Math.random()<0.5;const name=pick(f?NAMES_F:NAMES_M);let job=pick(JOBS);
  if(role==='police')job='сотрудник полиции, патрульно-постовая служба';if(role==='guard')job='охранник';if(role==='courier')job='курьер на самокате';
  const clothes=role==='police'?'#2B3F8C':role==='guard'?'#1E1E1E':role==='courier'?'#F4B400':pick(CLOTHES);
  const age=Math.floor(rnd(18,72));const hairStyle=role==='police'?4:(f?pick([0,1,1,1,2]):(age>55&&Math.random()<0.4?3:pick([0,0,0,2])));
  return {id:nextId++,name,job,trait:pick(TRAITS),mood:pick(MOODS),age,clothes,skin:pick(SKINS),hair:pick(HAIRS),female:f,role,memory:[],hairStyle,bag:Math.random()<0.35?pick(['#3A3A3A','#7A4A2A','#C24A3A','#2A4A7A']):null,pants:pick(['#2B2F3A','#3C3C3C','#4A5A7A','#6B5A4A','#1F1F1F','#5A6B8C'])};}

const walkers=[],cars=[],buses=[],accidents=[],policeCars=[];
let roadPeds=[];          // пешеходы на проезжей части (этот кадр)
let activeCrossings=[];   // переходы, где сейчас есть пешеход
let carSee=16;            // дальность, с которой водители замечают пешехода

class Walker{
  constructor(role,node){this.role=role;this.p=makePersona(role);this.node=node;const n=sidewalkPos(node);this.x=n[0];this.y=n[1];this.path=null;this.seg=0;this.t=0;this.spd=role==='courier'?3.4:rnd(2.0,2.9);this.state='idle';this.ttl=rnd(0,3);this.off=rnd(-0.6,0.6);this.hx=1;this.hy=0;this.phase=rnd(0,6);this.waitStop=null;this.bus=null;this.anchor=null;this.gatherTtl=0;this.road=null;}
  newGoal(){let goal=-1;
    if(this.role==='guard'){this.state='idle';this.ttl=rnd(3,8);return;}
    if(this.role==='police'&&this.anchor){const a=this.anchor;goal=nearestNode(a[0]+rnd(-220,220),a[1]+rnd(-220,220),world.pedAdj,200);}
    else{const r=Math.random();const R=350;
      const rush=typeof rushHour==='function'&&rushHour();const pPoi=rush?0.35:0.45,pStop=rush?0.68:0.6;
      if(r<pPoi&&world.pois.length){let poi=null;for(let k=0;k<12;k++){const c=pick(world.pois);if(dist(c.x,c.y,this.x,this.y)<R&&(typeof poiOpen!=='function'||poiOpen(c))){poi=c;break;}}if(poi){goal=nearestNode(poi.x,poi.y,world.pedAdj,120);this.goalPoi=poi;}}
      else if(r<pStop&&world.stops.length){let s=null;for(let k=0;k<12;k++){const c=pick(world.stops);if(dist(c.x,c.y,this.x,this.y)<R*1.5){s=c;break;}}if(s){goal=nearestNode(s.x,s.y,world.pedAdj,100);this.goalStop=s;}}
      if(goal<0)goal=nodeNear(world.pedNodes,[this.x,this.y],R);}
    if(goal<0){this.state='idle';this.ttl=2;return;}
    this.state='routing';requestPath(this,world.pedAdj,this.node,goal,pedCost,path=>{if(this.state!=='routing')return;if(!path||path.length<2){this.state='idle';this.ttl=rnd(1,5);this.goalPoi=null;this.goalStop=null;return;}this.path=path;this.seg=0;this.t=0;this.state='walk';});}
  update(dt){
    if(this.bus)return;
    switch(this.state){
      case 'idle':this.ttl-=dt;if(this.role==='guard'){const k=performance.now()/1000;this.x=this.gx+Math.sin(k*0.7+this.p.id)*0.5;this.y=this.gy+Math.cos(k*0.5+this.p.id)*0.4;}if(this.ttl<=0)this.newGoal();return;
      case 'companion':return;
      case 'rally':rallyFace(this);this.phase+=dt*0.6;return;
      case 'gather':this.gatherTtl-=dt;if(this.gatherTtl<=0){this.state='idle';this.ttl=1;}return;
      case 'wait':this.ttl-=dt;if(this.ttl<=0){this.waitStop=null;this.state='idle';this.ttl=1;}return;
      case 'hurt':this.ttl-=dt;if(this.ttl<=0)this.recover();return;
      case 'cross':{const d=dist(this.x,this.y,this.tx,this.ty);const st=this.crossSpd*dt;if(d<=st){this.x=this.tx;this.y=this.ty;this.node=nearestNode(this.x,this.y,world.pedAdj,80);if(this.node<0)this.node=pick(world.pedNodes);this.state='idle';this.ttl=0.5;return;}this.hx=(this.tx-this.x)/d;this.hy=(this.ty-this.y)/d;this.x+=this.hx*st;this.y+=this.hy*st;this.phase+=dt*6;return;}
      case 'approach':{const sl=this.rallySlot;if(!sl){this.state='idle';this.ttl=1;return;}const d=dist(this.x,this.y,sl[0],sl[1]);const st=this.spd*dt;if(d<=st){this.x=sl[0];this.y=sl[1];this.state='rally';rallyFace(this);return;}this.hx=(sl[0]-this.x)/d;this.hy=(sl[1]-this.y)/d;this.x+=this.hx*st;this.y+=this.hy*st;this.phase+=dt*8;return;}
      case 'walk':if(this.rallySlot){this.losT=(this.losT||0)-dt;if(this.losT<=0){this.losT=0.6;const sl=this.rallySlot;const d=dist(this.x,this.y,sl[0],sl[1]);if(d<35||(d<110&&clearLine(this.x,this.y,sl[0],sl[1]))){this.path=null;this.state='approach';return;}}}break;
      default:return;}
    let step=this.spd*dt*(weather.kind==='rain'?1.2:1);this.phase+=dt*7*(this.spd/2.4);
    while(step>0){const a=this.path[this.seg],b=this.path[this.seg+1];const pa=world.nodes[a],pb=world.nodes[b];const L=dist(pa[0],pa[1],pb[0],pb[1]);
      if(this.t+step>=L){step-=L-this.t;this.seg++;this.t=0;this.node=b;if(this.seg>=this.path.length-1){this.arrive();return;}}else{this.t+=step;step=0;}}
    const a=this.path[this.seg],b=this.path[this.seg+1];const pa=world.nodes[a],pb=world.nodes[b];const L=dist(pa[0],pa[1],pb[0],pb[1])||1;const dx=(pb[0]-pa[0])/L,dy=(pb[1]-pa[1])/L;
    const edge=world.pedAdj[a].find(e=>e[0]===b);const r=edge?world.roads[edge[2]]:null;this.road=r;const want=r&&r.c<=8?r.hw+1.3:0;const off=want?Math.min(safeSideOff(a,b,want+0.6),want+this.off):this.off;
    this.x=pa[0]+dx*this.t-dy*off;this.y=pa[1]+dy*this.t+dx*off;this.hx=dx;this.hy=dy;
    if(r&&r.c>8&&Math.abs(this.x-player.x)<450&&Math.abs(this.y-player.y)<450){const q=pushOffRoad(this.x,this.y,dx,dy);if(q){this.x=q[0];this.y=q[1];}}}
  arrive(){this.path=null;if(this.rallySlot){this.x=this.rallySlot[0];this.y=this.rallySlot[1];this.state='rally';rallyFace(this);return;}if(this.goalStop){const s=this.goalStop;this.goalStop=null;this.waitStop=s;this.state='wait';this.ttl=rnd(60,140);this.x=s.x+rnd(-2,2);this.y=s.y+rnd(-2,2);return;}
    if(this.goalPoi){const poi=this.goalPoi;this.goalPoi=null;this.x=poi.x+rnd(-1.5,1.5);this.y=poi.y+rnd(-1.5,1.5);if(inBuilding(this.x,this.y)){const q=toSidewalk(this.x,this.y);if(!inBuilding(q[0],q[1])){this.x=q[0]+rnd(-0.8,0.8);this.y=q[1]+rnd(-0.8,0.8);}}}
    this.state='idle';this.ttl=rnd(6,45);}
  // перебежать дорогу не по переходу
  startCross(){if(this.state!=='walk'||!this.path)return false;const a=this.path[this.seg],b=this.path[this.seg+1];const e=world.pedAdj[a].find(q=>q[0]===b);if(!e)return false;const r=world.roads[e[2]];if(r.c>7||r.c<2||r.w<6)return false;
    const pa=world.nodes[a],pb=world.nodes[b];const L=dist(pa[0],pa[1],pb[0],pb[1])||1;const dx=(pb[0]-pa[0])/L,dy=(pb[1]-pa[1])/L;const off=r.hw+1.3+this.off;
    this.tx=this.x+dy*2*off;this.ty=this.y-dx*2*off;if(inBuilding(this.tx,this.ty))return false;
    this.path=null;this.goalPoi=null;this.goalStop=null;this.state='cross';this.crossSpd=rnd(1.3,2.1);this.road=r;return true;}
  hit(){this.state='hurt';this.ttl=160;this.path=null;this.goalPoi=null;this.goalStop=null;this.waitStop=null;}
  recover(){const n=nodeNear(world.pedNodes,[player.x,player.y],500);this.node=n;const p=sidewalkPos(n);this.x=p[0];this.y=p[1];this.p=makePersona(this.role);this.state='idle';this.ttl=rnd(1,4);}
}

// Общая проверка препятствий впереди: машины, аварии, пешеходы на дороге, занятые переходы
function obstacleAhead(self,vehicles,see){let ahead=1e9;self.acBlock=null;const hx=self.hx,hy=self.hy;const siren=(self.kind==='amb'||self.kind==='police')&&self.target!=null;const pushy=(self.waitT||0)>(siren?1.5:6);
  if(!siren)for(const v of vehicles){if(v===self)continue;const ox=v.x-self.x,oy=v.y-self.y;const f=ox*hx+oy*hy;if(f<=0||f>26)continue;const s=Math.abs(-ox*hy+oy*hx);if(s<(v.wid||2)*0.5+self.wid*0.5+0.4){const g=f-(v.len||4)*0.5-self.len*0.5;if(g<ahead)ahead=g;}}
  if(!siren)for(const ac of accidents){if(ac.blocking===false)continue;const ox=ac.x-self.x,oy=ac.y-self.y;const f=ox*hx+oy*hy;if(f>0&&f<26&&Math.abs(-ox*hy+oy*hx)<4.5&&f-6<ahead){ahead=f-6;self.acBlock=ac;}}
  for(const p of roadPeds){const ox=p.x-self.x,oy=p.y-self.y;const f=ox*hx+oy*hy;if(f<=0||f>see)continue;const s=Math.abs(-ox*hy+oy*hx);if(s<self.wid*0.5+0.9){const g=f-self.len*0.5-(pushy?0.2:0.7);if(g<ahead)ahead=g;}}
  if(!pushy)for(const c of activeCrossings){const ox=c.x-self.x,oy=c.y-self.y;const f=ox*hx+oy*hy;if(f<=0||f>30)continue;const s=Math.abs(-ox*hy+oy*hx);if(s<c.hw+1){const g=f-self.len*0.5-2.2;if(g<ahead)ahead=g;}}
  return ahead;}
function limitBySpace(vlim,ahead){if(ahead<2.5)return 0;if(ahead<13)return Math.min(vlim,ahead*0.75);return vlim;}
// Наезд на пешехода (после движения)
function checkPedHits(self){if(self.speed<2.2)return;for(const p of roadPeds){if(p.hurt)continue;const ox=p.x-self.x,oy=p.y-self.y;const f=ox*self.hx+oy*self.hy;const s=Math.abs(-ox*self.hy+oy*self.hx);if(Math.abs(f)<self.len*0.5+0.3&&s<self.wid*0.5+0.45){onPedHit(self,p);return;}}}

class Car{
  constructor(kind,node){this.kind=kind;this.node=node;const n=world.nodes[node];this.x=n[0];this.y=n[1];this.hx=1;this.hy=0;this.path=null;this.seg=0;this.t=0;this.speed=0;this.vmax=rnd(9,15);this.color=kind==='police'?'#F2F4F7':kind==='amb'?'#FFFFFF':kind==='taxi'?'#F4C542':pick(CAR_COLORS);this.state='idle';this.ttl=0;this.crashed=false;this.flash=kind==='police'||kind==='amb';this.len=kind==='amb'?5.6:4.5;this.wid=kind==='amb'?2.2:1.85;this.target=null;this.stuck=0;this.wps=null;}
  siren(){return (this.kind==='amb'||this.kind==='police')&&this.target!=null;}
  newGoal(goalNode){let goal=goalNode;const cr=this.creep;this.creep=null;if(cr&&cr.t>0.5)this.node=cr.b;if(goal==null||goal<0)goal=nodeNear(world.carNodes,[this.x,this.y],900);
    this.state='routing';requestPath(this,this.siren()?world.emAdj:world.carAdj,this.node,goal,carCost,path=>{if(this.crashed||this.state!=='routing')return;if(!path||path.length<2){if(this.target!=null&&path&&path.length===1){this.path=null;this.onArrive();return;}this.state='idle';this.ttl=1;if(this.target==null)this.node=this.pickNode();return;}if(cr&&cr.t>0.5&&path[0]===cr.b){if(path[1]===cr.a){this.path=path;this.t=Math.max(0,cr.L-cr.t);}else{this.path=[cr.a,...path];this.t=cr.t;}this.seg=0;this.state='drive';return;}this.path=path;this.seg=0;this.t=0;this.state='drive';});}
  pickNode(){const n=pick(world.carNodes);const p=world.nodes[n];this.x=p[0];this.y=p[1];return n;}
  update(dt,vehicles){
    if(this.crashed)return;if(this.state==='scene'){if(this.creep)this.creepStep(dt);return;}
    if(this.state==='idle'){this.ttl-=dt;if(this.ttl<=0)this.newGoal(this.target);return;}
    if(this.state!=='drive')return;
    const a=this.path[this.seg],b=this.path[this.seg+1];const pa=world.nodes[a],pb=world.nodes[b];const L=dist(pa[0],pa[1],pb[0],pb[1])||1;const dx=(pb[0]-pa[0])/L,dy=(pb[1]-pa[1])/L;
    const edge=(this.siren()?world.emAdj:world.carAdj)[a].find(e=>e[0]===b);const r=edge?world.roads[edge[2]]:null;
    let vlim=Math.min(this.vmax,r?r.speed||6:6);if(this.siren())vlim=Math.max(vlim*1.45,11);if(weather.kind==='rain')vlim*=0.85;
    const rem=L-this.t;if(rem<14&&this.seg+2<this.path.length){const pc=world.nodes[this.path[this.seg+2]];const L2=dist(pb[0],pb[1],pc[0],pc[1])||1;const d2x=(pc[0]-pb[0])/L2,d2y=(pc[1]-pb[1])/L2;const cos=dx*d2x+dy*d2y;if(cos<0.85)vlim=Math.min(vlim,(this.siren()?6.5:4)+cos*3);}
    // спецмашина у места ДТП: встаёт рядом, даже если впереди зеваки или сам пострадавший
    if(this.siren()&&this.sceneXY&&dist(this.x,this.y,this.sceneXY[0],this.sceneXY[1])<16){this.speed=0;this.path=null;this.onArrive();return;}
    const ahead=obstacleAhead(this,vehicles,carSee);vlim=limitBySpace(vlim,ahead);
    this.waitT=(vlim===0&&this.speed<0.1)?(this.waitT||0)+dt:0;
    // улицу перекрыло ДТП — разворачиваемся и едем в объезд (маршрут обходит перекрытую улицу)
    if(this.acBlock&&this.waitT>5&&this.target==null&&!this.siren()&&this.kind!=='tow'&&this.path){const a0=this.path[this.seg],b0=this.path[this.seg+1];const q1=world.nodes[a0],q2=world.nodes[b0];const L0=dist(q1[0],q1[1],q2[0],q2[1]);this.path=[b0,a0];this.seg=0;this.t=Math.max(0,L0-this.t);this.waitT=0;this.hx=-this.hx;this.hy=-this.hy;const ac=this.acBlock;if(!ac.detourMsg&&dist(ac.x,ac.y,player.x,player.y)<350){ac.detourMsg=true;addEvent(`ДТП перекрыло ${ac.road||'улицу'} — машины разворачиваются и едут в объезд`);}return;}
    if(vlim===0&&this.speed<0.1){this.stuck+=dt;if(this.stuck>25&&(this.kind==='car'||this.kind==='taxi')){this.stuck=0;this.state='idle';this.ttl=0.1;this.node=this.pickNode();return;}}else this.stuck=0;
    this.speed+=clamp(vlim-this.speed,-9*dt,4*dt);if(this.speed<0)this.speed=0;
    let step=this.speed*dt;
    while(step>0){const a2=this.path[this.seg],b2=this.path[this.seg+1];const p1=world.nodes[a2],p2=world.nodes[b2];const L3=dist(p1[0],p1[1],p2[0],p2[1]);
      if(this.t+step>=L3){step-=L3-this.t;this.seg++;this.t=0;this.node=b2;if(this.seg>=this.path.length-1){this.path=null;this.onArrive();return;}}else{this.t+=step;step=0;}}
    const a3=this.path[this.seg],b3=this.path[this.seg+1];const q1=world.nodes[a3],q2=world.nodes[b3];const L4=dist(q1[0],q1[1],q2[0],q2[1])||1;const ex=(q2[0]-q1[0])/L4,ey=(q2[1]-q1[1])/L4;const e2=world.carAdj[a3].find(e=>e[0]===b3);const rr2=e2?world.roads[e2[2]]:null;const off=rr2?Math.max(1.2,rr2.hw*0.5):1.5;
    this.x=q1[0]+ex*this.t-ey*off;this.y=q1[1]+ey*this.t+ex*off;this.hx=lerp(this.hx,ex,0.4);this.hy=lerp(this.hy,ey,0.4);const hl=Math.hypot(this.hx,this.hy)||1;this.hx/=hl;this.hy/=hl;
    checkPedHits(this);}
  // от последнего перекрёстка спецмашина медленно подъезжает по той же улице к самому месту ДТП
  planCreep(){const sc=this.sceneXY;if(!sc)return;const N=this.node;const a=world.nodes[N];let best=null;
    for(const e of world.emAdj[N]){const M=e[0];const b=world.nodes[M];const L=dist(a[0],a[1],b[0],b[1]);if(L<2)continue;const ux=(b[0]-a[0])/L,uy=(b[1]-a[1])/L;const t=(sc[0]-a[0])*ux+(sc[1]-a[1])*uy;const sd=Math.abs(-(sc[0]-a[0])*uy+(sc[1]-a[1])*ux);
      if(t>4&&t<L+4&&sd<12&&(!best||sd<best.sd))best={M,L,ri:e[2],sd,to:clamp(t-6,0,L-1)};}
    if(best&&best.to>2)this.creep={a:N,b:best.M,L:best.L,ri:best.ri,t:0,to:best.to};}
  creepStep(dt){const c=this.creep;if(c.t>=c.to){this.speed=0;return;}this.speed=Math.min(5,(c.to-c.t)*1.5+0.5);c.t=Math.min(c.to,c.t+this.speed*dt);
    const p1=world.nodes[c.a],p2=world.nodes[c.b];const ex=(p2[0]-p1[0])/c.L,ey=(p2[1]-p1[1])/c.L;const r=world.roads[c.ri];const off=r?Math.max(1.2,r.hw*0.5):1.5;
    this.x=p1[0]+ex*c.t-ey*off;this.y=p1[1]+ey*c.t+ex*off;this.hx=lerp(this.hx,ex,0.3);this.hy=lerp(this.hy,ey,0.3);const hl=Math.hypot(this.hx,this.hy)||1;this.hx/=hl;this.hy/=hl;}
  onArrive(){if(this.target!=null){this.target=null;this.state='scene';this.speed=0;this.planCreep();this.onScene&&this.onScene();return;}if(this.kind==='amb'&&this.goHome){this.remove=true;return;}this.state='idle';this.ttl=this.kind==='police'?0.2:rnd(0,3);}
}

class Bus{
  constructor(route,s,dir){this.route=route;this.s=s;this.dir=dir;this.speed=0;this.dwell=0;this.nextStop=null;this.x=0;this.y=0;this.hx=1;this.hy=0;this.len=route.type==='tram'?15:11;this.wid=2.5;this.passengers=[];this.lastStop=null;this.color=route.type==='bus'?'#D8323C':route.type==='tram'?'#8E3478':'#2BB062';this.place();}
  place(){const r=this.route;let i=0;const cum=r.cum;while(i<cum.length-2&&cum[i+1]<this.s)i++;const L=cum[i+1]-cum[i]||1;const t=(this.s-cum[i])/L;const a=r.pts[i],b=r.pts[i+1];const dx=(b[0]-a[0])/L,dy=(b[1]-a[1])/L;const sg=this.dir;const px=a[0]+(b[0]-a[0])*t,py=a[1]+(b[1]-a[1])*t;const off=2.6;this.x=px-dy*sg*off;this.y=py+dx*sg*off;this.hx=lerp(this.hx,dx*sg,0.3);this.hy=lerp(this.hy,dy*sg,0.3);const hl=Math.hypot(this.hx,this.hy)||1;this.hx/=hl;this.hy/=hl;}
  upcoming(){const st=this.route.stops;if(this.dir>0){for(const s of st)if(s.s>this.s+0.5)return s;}else{for(let i=st.length-1;i>=0;i--)if(st[i].s<this.s-0.5)return st[i];}return null;}
  update(dt,vehicles){
    if(this.dwell>0){this.dwell-=dt;if(this.dwell<=0){this.lastStop=this.nextStop;}return;}
    const ns=this.upcoming();let vlim=this.route.type==='tram'?10:9.5;
    if(ns){const d=Math.abs(ns.s-this.s);if(d<25)vlim=Math.min(vlim,2+d*0.35);if(d<0.6){this.s=ns.s;this.nextStop=ns;this.dwell=rnd(5,9);this.speed=0;this.atStop(ns);this.place();return;}}
    else{const d=this.dir>0?this.route.len-this.s:this.s;if(d<30)vlim=Math.min(vlim,1.5+d*0.3);if(d<0.6){this.dir*=-1;this.dwell=rnd(20,40);this.speed=0;this.nextStop=null;return;}}
    const ahead=obstacleAhead(this,vehicles,carSee+4);vlim=limitBySpace(vlim,ahead);
    this.speed+=clamp(vlim-this.speed,-6*dt,2.2*dt);if(this.speed<0)this.speed=0;
    this.s=clamp(this.s+this.speed*dt*this.dir,0,this.route.len);this.place();checkPedHits(this);}
  atStop(stop){
    this.passengers=this.passengers.filter(w=>{w.ride--;if(w.ride<=0){w.bus=null;w.x=this.x+rnd(-3,3);w.y=this.y+rnd(-3,3);w.node=nearestNode(w.x,w.y,world.pedAdj,100);w.state='idle';w.ttl=rnd(1,4);return false;}return true;});
    for(const w of walkers){if(w.state==='wait'&&dist(w.x,w.y,this.x,this.y)<16&&this.passengers.length<12){w.bus=this;w.ride=Math.floor(rnd(1,5));w.state='onbus';w.waitStop=null;this.passengers.push(w);}}
    if(player.waitingStop&&!player.bus&&dist(player.x,player.y,this.x,this.y)<18&&busPlanOk(this)){boardBus(this,stop);}
    if(player.bus===this){if(player.exitNext||busPlanExit(this,stop)){const planned=busPlanExit(this,stop);leaveBus(stop);if(planned)busPlanArrived();}else{const nx=this.upcoming();setHint(`${busWord(this.route.type)} ${this.route.ref} · «${stop.n}»${nx?' · следующая «'+nx.n+'»':''}`);}}
  }
}
function clearLine(x0,y0,x1,y1){const d=dist(x0,y0,x1,y1);const n=Math.ceil(d/2.5);for(let i=1;i<n;i++){const t=i/n;if(inBuilding(x0+(x1-x0)*t,y0+(y1-y0)*t))return false;}return true;}
// безопасный переход: стоим на тротуаре, пока к точке на проезжей части едет машина
// человек реально на полосах зебры (а не на тротуаре у её края)
function onZebra(c,x,y,extra){const ox=x-c.x,oy=y-c.y;const along=Math.abs(ox*c.dx+oy*c.dy),across=Math.abs(-ox*c.dy+oy*c.dx);return along<2.2&&across<c.hw-0.1+(extra||0);}
function onCarriageway(x,y){const ns=nearestRoadSeg(x,y,14);return !!(ns&&ns.d<ns.seg.r.hw+0.2);}
function carComing(x,y){for(const v of cars.concat(buses)){if(v.crashed||v.speed<1.2||v.remove)continue;const ox=x-v.x,oy=y-v.y;if(Math.abs(ox)>50||Math.abs(oy)>50)continue;const f=ox*v.hx+oy*v.hy;if(f<-(v.len||4)*0.5)continue;const s=Math.abs(-ox*v.hy+oy*v.hx);if(s>(v.wid||2)*0.5+2.4)continue;if(f/Math.max(v.speed,0.1)<4.5)return true;}return false;}
function unsafeStep(x0,y0,x1,y1){return !onCarriageway(x0,y0)&&onCarriageway(x1,y1)&&carComing(x1,y1);}
function busWord(t){return t==='tram'?'Трамвай':t==='trolleybus'?'Троллейбус':'Автобус';}

// ---------- население ----------
function spawnPopulation(spawn){
  // сколько народу и машин держит город: меньше — легче телефону и серверу (было 420 / 130 / до 3 машин на маршрут)
  for(let i=0;i<POP.walkers;i++){const role=i<4?'police':i<14?'courier':'resident';const w=new Walker(role,nodeNear(world.pedNodes,spawn,i<POP.walkers*0.6?160:300));if(role==='police')w.anchor=[spawn[0]+rnd(-150,150),spawn[1]+rnd(-150,150)];walkers.push(w);}
  const guardSpots=world.pois.filter(p=>p.t==='bank'||p.t==='market'||p.t==='museum');for(const g of guardSpots.slice(0,16)){const n=nearestNode(g.x,g.y,world.pedAdj,80);if(n<0)continue;const w=new Walker('guard',n);w.x=g.x+rnd(-2,2);w.y=g.y+rnd(-2,2);if(inBuilding(w.x,w.y)){const q=toSidewalk(w.x,w.y);if(!inBuilding(q[0],q[1])){w.x=q[0];w.y=q[1];}}w.gx=w.x;w.gy=w.y;w.state='idle';w.ttl=9e9;walkers.push(w);}
  for(let i=0;i<POP.cars;i++){const c=new Car(i<8?'taxi':'car',nodeNear(world.carNodes,spawn,i<POP.cars*0.55?300:600));c.ttl=rnd(0,2);cars.push(c);}
  for(let i=0;i<3;i++){const c=new Car('police',nodeNear(world.carNodes,spawn,700));c.vmax=16;c.ttl=rnd(0,2);cars.push(c);policeCars.push(c);}
  for(const r of world.routes){const n=clamp(Math.round(r.len/POP.busEvery),1,POP.busMax);for(let i=0;i<n;i++){buses.push(new Bus(r,r.len*(i+0.3)/n,i%2?-1:1));}}
}
// на слабом телефоне — ещё меньше (мало ядер или памяти)
const POP=(()=>{const weak=(navigator.hardwareConcurrency||8)<=4||(navigator.deviceMemory||8)<=3;return weak?{walkers:200,cars:60,busEvery:2600,busMax:2}:{walkers:280,cars:85,busEvery:2600,busMax:2};})();
let bubbleTimer=0,jaywalkTimer=rnd(40,80);
function updatePopulation(dt){
  bubbleTimer-=dt;if(bubbleTimer<=0){bubbleTimer=0.4;const px=player.x,py=player.y;let moved=0;
    for(const w of walkers){if(moved>=5)break;if(w.role==='guard'||w.role==='police'||w.bus||w===chatNpc||w.state==='hurt'||w.rally||w.temp||w.companion||w.keep||w.folk)continue;if(dist(w.x,w.y,px,py)<360)continue;const n=nodeNear(world.pedNodes,[px,py],250);const p=world.nodes[n];if(dist(p[0],p[1],px,py)<60)continue;w.node=n;const sp=sidewalkPos(n);w.x=sp[0];w.y=sp[1];w.path=null;w.goalPoi=null;w.goalStop=null;w.waitStop=null;w.state='idle';w.ttl=rnd(0,2);w.p=makePersona(w.role);moved++;}
    moved=0;for(const c of cars){if(moved>=2)break;if(c.kind!=='car'&&c.kind!=='taxi')continue;if(c.crashed||c.state==='scene'||dist(c.x,c.y,px,py)<720)continue;const n=nodeNear(world.carNodes,[px,py],450);const p=world.nodes[n];if(dist(p[0],p[1],px,py)<110)continue;c.node=n;c.x=p[0];c.y=p[1];c.path=null;c.speed=0;c.state='idle';c.ttl=rnd(0,1);moved++;}}
  jaywalkTimer-=dt;if(jaywalkTimer<=0){jaywalkTimer=rnd(45,100);const cand=walkers.filter(w=>w.state==='walk'&&w.role==='resident'&&!w.rally&&!w.folk&&dist(w.x,w.y,player.x,player.y)<260);for(let k=0;k<6&&cand.length;k++){const w=pick(cand);if(w.startCross()){if(Math.random()<0.5)addEvent(`${w.p.name} перебегает ${w.road.n||'дорогу'} не по переходу`);break;}}}
}
// пешеходы на дороге и занятые переходы — пересчёт каждый кадр
function updateRoadPeds(){roadPeds=[];activeCrossings=[];
  const onFoot=!player.inside&&player.state!=='hurt'&&(!player.vehicle||player.vehicle.kind==='scooter')&&!player.bus;
  const vehOnRoad=player.vehicle&&player.vehicle.kind!=='scooter';
  if(onFoot||player.state==='hurt'&&!player.inside){const ns=nearestRoadSeg(player.x,player.y,16);const onRoad=ns&&ns.d<ns.seg.r.hw+0.3;if(onRoad||player.state==='hurt')roadPeds.push({x:player.x,y:player.y,ref:'player',hurt:player.state==='hurt'});
    // переходы рядом с игроком
    world.cgrid.query(player.x-8,player.y-8,player.x+8,player.y+8,c=>{if(onZebra(c,player.x,player.y,1.2))activeCrossings.push(c);});}
  if(typeof companion!=='undefined'&&companion&&!companion.w.inside&&onCarriageway(companion.w.x,companion.w.y))roadPeds.push({x:companion.w.x,y:companion.w.y,ref:companion.w});
  for(const w of walkers){if(w.bus)continue;if(w.state==='cross'||w.state==='hurt'){roadPeds.push({x:w.x,y:w.y,ref:w,hurt:w.state==='hurt'});}
    else if(w.state==='walk'&&dist(w.x,w.y,player.x,player.y)<320){world.cgrid.query(w.x-5,w.y-5,w.x+5,w.y+5,c=>{if(onZebra(c,w.x,w.y)&&!activeCrossings.includes(c))activeCrossings.push(c);});}}
  const h=(clock.minutes/60)%24;carSee=(h<6||h>=21)?11:16;if(weather.kind==='rain')carSee-=3;}

// ---------- происшествия ----------
let accidentTimer=rnd(40,80);
// спецмашина выезжает из-за угла в 130–230 м по короткому маршруту — чтобы её было видно и ждать недолго
function emergencyStart(ac,tgt){const ring=[];world.ngrid.query(ac.x-230,ac.y-230,ac.x+230,ac.y+230,i=>{if(!world.carAdj[i].length)return;const d=dist(world.nodes[i][0],world.nodes[i][1],ac.x,ac.y);if(d>130&&d<230)ring.push(i);});
  let sn=-1,bestL=1e9;for(let k=0;k<6&&ring.length;k++){const c=ring.splice(Math.floor(Math.random()*ring.length),1)[0];const p=astar(world.emAdj,c,tgt,carCost);if(!p)continue;let L=0;for(let i=0;i<p.length-1;i++){const a=world.nodes[p[i]],b=world.nodes[p[i+1]];L+=dist(a[0],a[1],b[0],b[1]);}if(L>=120&&L<bestL){bestL=L;sn=c;}}
  return sn;}
function dispatchPolice(ac){let best=null,bd=1e9;for(const p of policeCars){if(p.state==='scene'||p.target!=null)continue;const d=dist(p.x,p.y,ac.x,ac.y);if(d<bd){bd=d;best=p;}}
  if(!best)return;const n=nearestNode(ac.x,ac.y,world.carAdj,150);if(n<0)return;
  // далёкий экипаж (вне экрана) «выезжает» с ближайшего поста
  if(bd>260&&dist(best.x,best.y,player.x,player.y)>220&&!best.creep){const sn=emergencyStart(ac,n);if(sn>=0){best.node=sn;best.x=world.nodes[sn][0];best.y=world.nodes[sn][1];}}
  best.creep=null;best.target=n;best.sceneXY=[ac.x,ac.y];ac.police=best;best.path=null;best.state='idle';best.ttl=0.05;
  best.onScene=()=>{addEvent(`Полиция прибыла на место${ac.road?' ('+ac.road+')':''}`);if(ac.playerFine){player.money=Math.max(0,player.money-ac.playerFine);player.mood=clamp(player.mood-ac.playerMood,0,100);addEvent(ac.playerFineText);if(typeof phoneNote==='function')phoneNote('Госуслуги',ac.playerFineText.replace(/^ГИБДД:\s*/,''),'fine');ac.playerFine=0;}if(ac.playerCar&&player.vehicle)player.vehicle.damaged=Math.min(player.vehicle.damaged,3);policeAtScene(ac,best);};}
function dispatchAmbulance(ac){const hosp=world.pois.filter(p=>p.t==='hospital');if(!hosp.length)return;let hb=hosp[0],hd=1e9;for(const h of hosp){const d=dist(h.x,h.y,ac.x,ac.y);if(d<hd){hd=d;hb=h;}}const hn=nearestNode(hb.x,hb.y,world.carAdj,200);if(hn<0)return;
  const tgt=nearestNode(ac.x,ac.y,world.carAdj,150);let sn=emergencyStart(ac,tgt);
  if(sn<0)sn=nodeNear(world.carNodes,[ac.x,ac.y],320);const amb=new Car('amb',sn);amb.vmax=17;amb.target=tgt;amb.sceneXY=[ac.x,ac.y];amb.homeNode=hn;amb.hospital=hb;amb.state='idle';amb.ttl=rnd(0.5,1.5);
  amb.onScene=()=>{addEvent(ac.victim==='player'?'Скорая приехала за вами':'Скорая на месте, помогают пострадавшим');amb.sceneTtl=ac.victim==='player'?6:30;};cars.push(amb);ac.amb=amb;}
function createAccident(o){const ac=Object.assign({t:0,cars:[],victim:null,kind:'cars',police:null,amb:null,cleared:false,reported:false,road:nearestRoadName(o.x,o.y)},o);accidents.push(ac);if(!ac.medical)dispatchPolice(ac);dispatchAmbulance(ac);
  // зеваки
  for(const w of walkers){if(w.role==='guard'||w.bus||w.rally||w.companion||w.sitBy||w.folk||w.state!=='walk'&&w.state!=='idle')continue;if(dist(w.x,w.y,ac.x,ac.y)<70&&Math.random()<0.5){const n=nearestNode(ac.x,ac.y,world.pedAdj,120);if(n<0)continue;w.goalPoi=null;w.goalStop=null;w.state='routing';requestPath(w,world.pedAdj,w.node,n,pedCost,path=>{if(w.state!=='routing')return;if(!path||path.length<2){w.state='idle';w.ttl=2;return;}w.path=path;w.seg=0;w.t=0;w.state='walk';w.arrive=function(){this.path=null;this.state='gather';this.gatherTtl=rnd(25,60);const an=rnd(0,TAU);this.x=ac.x+Math.cos(an)*rnd(6,11);this.y=ac.y+Math.sin(an)*rnd(6,11);delete this.arrive;};});}}
  return ac;}
function spawnRandomAccident(){
  let moving=cars.filter(c=>c.state==='drive'&&!c.crashed&&c.kind!=='police'&&c.kind!=='amb'&&c.speed>3&&dist(c.x,c.y,player.x,player.y)<450);
  if(!moving.length)moving=cars.filter(c=>c.state==='drive'&&!c.crashed&&c.kind!=='police'&&c.kind!=='amb'&&c.speed>3);if(!moving.length)return;
  const a=pick(moving);crashCar(a);
  let b=cars.find(c=>c!==a&&!c.crashed&&c.kind!=='police'&&c.kind!=='amb'&&dist(c.x,c.y,a.x,a.y)<22);
  if(!b){b=new Car('car',a.node);cars.push(b);b.x=a.x+a.hx*5.2;b.y=a.y+a.hy*5.2;const an=rnd(0.4,0.9)*(Math.random()<0.5?1:-1);b.hx=a.hx*Math.cos(an)-a.hy*Math.sin(an);b.hy=a.hx*Math.sin(an)+a.hy*Math.cos(an);}
  crashCar(b);const an=rnd(0.25,0.5);const hx=a.hx*Math.cos(an)-a.hy*Math.sin(an),hy=a.hx*Math.sin(an)+a.hy*Math.cos(an);a.hx=hx;a.hy=hy;
  const ac=createAccident({x:(a.x+b.x)/2,y:(a.y+b.y)/2,cars:[a,b]});addEvent(`ДТП${ac.road?' — '+ac.road:''}: столкнулись две машины`,'alert');}
function crashCar(c){c.crashed=true;c.speed=0;c.path=null;c.state='crashed';c.target=null;}
function onPedHit(vehicle,ped){
  if(ped.ref==='player'){playerHitByCar(vehicle);return;}
  const w=ped.ref;w.hit();if(vehicle.kind)crashCar(vehicle);
  let zebra=false;world.cgrid.query(w.x-8,w.y-8,w.x+8,w.y+8,c=>{if(onZebra(c,w.x,w.y,1.5))zebra=true;});
  const ac=createAccident({x:w.x,y:w.y,kind:'ped',cars:vehicle.kind?[vehicle]:[],victim:w,jaywalk:!zebra});
  addEvent(`${vehicle.kind?'Машина':'Автобус'} сбил${vehicle.kind?'а':''} пешехода${ac.road?' — '+ac.road:''}: ${w.p.name}, ${w.p.age}`,'alert');}
// на месте ДТП: пострадавших — на тротуар, разбитые машины — к обочине, инспектор разбирается
function toSidewalk(x,y){const ns=nearestRoadSeg(x,y,16);if(!ns)return [x,y];const sg=ns.seg;const ux=(sg.bx-sg.ax)/sg.L,uy=(sg.by-sg.ay)/sg.L;let nx=-uy,ny=ux;if((x-ns.px)*nx+(y-ns.py)*ny<0){nx=-nx;ny=-ny;}
  // ближайшая точка тротуара, которая не на проезжей части другой улицы (у перекрёстков) и не в доме
  let best=null,bd=1e9;for(const side of [1,-1])for(const ex of [1.3,2.6,4])for(const al of [0,-6,6,-12,12,-20,20]){const px=ns.px+nx*side*(sg.r.hw+ex)+ux*al,py=ns.py+ny*side*(sg.r.hw+ex)+uy*al;if(onCarriageway(px,py)||inBuilding(px,py))continue;const d=dist(px,py,x,y)+(side<0?3:0);if(d<bd){bd=d;best=[px,py];}}
  return best||[ns.px+nx*(sg.r.hw+1.3),ns.py+ny*(sg.r.hw+1.3)];}
function toCurb(c){const ns=nearestRoadSeg(c.x,c.y,16);if(!ns)return;const s=ns.seg;const ux=(s.bx-s.ax)/s.L,uy=(s.by-s.ay)/s.L;let nx=-uy,ny=ux;if((c.x-ns.px)*nx+(c.y-ns.py)*ny<0){nx=-nx;ny=-ny;}const off=Math.max(0,s.r.hw-1.1);c.x=ns.px+nx*off;c.y=ns.py+ny*off;const sg=Math.sign(c.hx*ux+c.hy*uy)||1;c.hx=ux*sg;c.hy=uy*sg;}
const DPS_JAY=['Эй, кутак баш, зачем тут переходишь? Тут нельзя же!','Переход вон там, а ты через дорогу бежишь. Протокол составляем.','Ну что, торопыга, живой? Штраф всё равно выпишу.'];
function policeAtScene(ac,car){
  if(ac.kind==='ped'){
    if(ac.victim==='player'&&player.state==='hurt'){const p=toSidewalk(player.x,player.y);player.x=p[0];player.y=p[1];}
    else if(ac.victim&&ac.victim!=='player'&&ac.victim.state==='hurt'){const p=toSidewalk(ac.victim.x,ac.victim.y);ac.victim.x=p[0];ac.victim.y=p[1];}
    ac.blocking=false;}
  for(const c of ac.cars)if(c.kind)toCurb(c);
  // инспектор выходит к пострадавшему
  const vx=ac.victim==='player'?player.x:(ac.victim?ac.victim.x:ac.x),vy=ac.victim==='player'?player.y:(ac.victim?ac.victim.y:ac.y);
  const sp=toSidewalk(vx+rnd(-2,2),vy+rnd(-2,2));const n=nearestNode(sp[0],sp[1],world.pedAdj,120);if(n<0)return;
  const o=new Walker('police',n);o.temp=true;o.x=sp[0]+1.2;o.y=sp[1]+0.6;o.p.job='инспектор ДПС, оформляет ДТП';o.state='idle';o.ttl=110;walkers.push(o);ac.officer=o;
  const dx=vx-o.x,dy=vy-o.y,L=Math.hypot(dx,dy)||1;o.hx=dx/L;o.hy=dy/L;
  if(ac.victim==='player'){
    if(ac.jaywalk){const t=pick(DPS_JAY);o.say={t,ttl:8};nearLine(o.p.name+' (ДПС)',t,false);o.p.memory.push({role:'assistant',content:t});player.money=Math.max(0,player.money-500);addEvent('ГИБДД: переход в неположенном месте — штраф 500 ₽ (ст. 12.29 КоАП)','alert');}
    else{const t='Вы на переходе были, водитель не пропустил. Он и виноват — страховая заплатит.';o.say={t,ttl:8};nearLine(o.p.name+' (ДПС)',t,false);o.p.memory.push({role:'assistant',content:t});player.money+=5000;addEvent('ГИБДД: виноват водитель. Выплата по ОСАГО: +5 000 ₽','alert');}}
  else if(ac.kind==='ped'&&ac.victim&&ac.jaywalk!==undefined){o.say={t:ac.jaywalk?'Опять не по переходу бежал…':'Водитель, документы! Пешехода на зебре сбили.',ttl:6};}}
// скорая на месте: чаще всего обрабатывают и отпускают, при серьёзных травмах — в больницу
function treatVictim(ac){const v=ac.victim;if(!v)return;const serious=Math.random()<0.25;
  if(v==='player'){if(player.state!=='hurt')return;if(serious){addEvent('Врачи скорой: нужен рентген — везём в больницу','alert');playerToHospital(ac.amb&&ac.amb.hospital);return;}
    player.state='ok';player.hurtT=0;const p=toSidewalk(player.x,player.y);player.x=p[0];player.y=p[1];player.energy=Math.max(player.energy,35);player.mood=clamp(player.mood+5,0,100);
    addEvent('Скорая обработала ушибы на месте — можно идти дальше');setHint('Вас подлатали. Аккуратнее на дороге!');
    if(companion){const w=companion.w;w.say={t:'Фух, напугал! Ну что, идём дальше?',ttl:6};nearLine(w.p.name,w.say.t,false);companion.route=null;}return;}
  if(v.state!=='hurt')return;if(serious){v.recover();return;}const p=toSidewalk(v.x,v.y);v.x=p[0];v.y=p[1];v.node=nearestNode(v.x,v.y,world.pedAdj,120);if(v.node<0)v.node=pick(world.pedNodes);v.state='idle';v.ttl=rnd(3,8);v.say={t:pick(['Спасибо, доктор…','Всё, я в порядке','Больше не побегу через дорогу']),ttl:5};}
function sendAmbHome(amb){amb.target=null;amb.goHome=true;amb.onScene=null;amb.state='idle';amb.newGoal(amb.homeNode);}
function updateAccidents(dt){
  for(let i=accidents.length-1;i>=0;i--){const ac=accidents[i];ac.t+=dt;
    if(ac.amb&&ac.amb.state==='scene'){ac.amb.sceneTtl-=dt;if(ac.amb.sceneTtl<=0){treatVictim(ac);sendAmbHome(ac.amb);ac.amb=null;ac.victim=null;}}
    const done=ac.t>(ac.kind==='ped'?150:110);
    if(done&&!ac.cleared){ac.cleared=true;if(ac.kind!=='ped')addEvent(`Эвакуатор убрал машины${ac.road?' ('+ac.road+')':''}, движение восстановлено`);
      for(const c of ac.cars){if(!c.kind)continue;c.crashed=false;c.state='idle';c.ttl=rnd(1,3);c.node=c.pickNode();}
      if(ac.police){ac.police.state='idle';ac.police.ttl=1;ac.police.target=null;ac.police.onScene=null;}
      if(ac.amb){if(ac.amb.state==='scene'){treatVictim(ac);sendAmbHome(ac.amb);}else{ac.amb.target=null;ac.amb.goHome=true;}ac.amb=null;}
      if(ac.victim==='player'&&player.state==='hurt')playerToHospital(null);else if(ac.victim&&ac.victim!=='player'&&ac.victim.state==='hurt')ac.victim.recover();
      accidents.splice(i,1);}}
}
