// ===== Отрисовка города =====
let W=0,H=0,DPR=1;
const canvas=$('#map'),ctx=canvas.getContext('2d');
const mini=$('#mini'),mctx=mini.getContext('2d');
function resize(){DPR=Math.min(2,window.devicePixelRatio||1);W=innerWidth;H=innerHeight;canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);canvas.style.width=W+'px';canvas.style.height=H+'px';}
window.addEventListener('resize',resize);resize();
const GROUND='#E4DFD3';
const AREA_FILL={water:'#9CC3DF',land:GROUND,park:'#B9D49C',grass:'#CBDDB2',forest:'#9FC086',cemetery:'#C3CFB0',pitch:'#A9CD93',plaza:'#DDD6C8',parking:'#CFCCC4'};
const ASPHALT=['#A6A5A0','#A6A5A0','#ABAAA5','#B0AFAA','#B4B3AE','#B9B8B2','#B9B8B2','#BEBDB7','#C6C5BF'];
const TREE_C=['#5F8E4B','#6C9B55','#7CA960'];const TREE_HI=['#7CAA66','#86B36F','#94BF7A'];
const POI_PRIO={police:0,prosecutor:1,hospital:0,theatre:1,museum:1,sight:1,university:1,worship:1,market:1,school:2,library:2,bank:2,hotel:2,pharmacy:3,fuel:3,bar:4,cafe:4,shop:5,atm:6,office:6};
const POI_GLYPH={cafe:'☕',bar:'🍺',shop:'🛍',police:'👮',hospital:'🏥',pharmacy:'💊',bank:'🏦',atm:'🏧',school:'🎒',university:'🎓',theatre:'🎭',museum:'🏛',worship:'🕌',fuel:'⛽',market:'🧺',hotel:'🏨',library:'📚',office:'🏢',sight:'⭐',prosecutor:'⚖️'};
let shake=0;const winDark=[],winLit=[];
let lampSprite=null,beamSprite=null;
function makeLightSprites(){lampSprite=document.createElement('canvas');lampSprite.width=lampSprite.height=128;let g=lampSprite.getContext('2d');let gr=g.createRadialGradient(64,64,2,64,64,64);gr.addColorStop(0,'rgba(255,214,140,.75)');gr.addColorStop(0.35,'rgba(255,200,120,.32)');gr.addColorStop(1,'rgba(255,190,100,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);
  beamSprite=document.createElement('canvas');beamSprite.width=160;beamSprite.height=96;g=beamSprite.getContext('2d');gr=g.createLinearGradient(0,0,160,0);gr.addColorStop(0,'rgba(255,245,210,.55)');gr.addColorStop(1,'rgba(255,245,210,0)');g.fillStyle=gr;g.beginPath();g.moveTo(0,40);g.lineTo(160,0);g.lineTo(160,96);g.lineTo(0,56);g.closePath();g.fill();}
function visiblePois(x0,y0,x1,y1,z){const out=[];const minPrio=z>4.5?6:z>3.2?5:z>2.4?3:2;for(const p of world.pois){const pr=POI_PRIO[p.t]??6;if(pr>minPrio||p.x<x0||p.x>x1||p.y<y0||p.y>y1)continue;out.push(p);}out.sort((a,b)=>(POI_PRIO[a.t]??6)-(POI_PRIO[b.t]??6));return out;}
function isNight(){const h=(clock.minutes/60)%24;return h<6||h>=21;}
function nightAmount(){const h=(clock.minutes/60)%24;if(h>=7&&h<18)return 0;if(h>=22||h<5)return 1;if(h>=18&&h<22)return (h-18)/4;return 1-(h-5)/2;}

// Один расчёт на кадр. Издалека остаются прежние тени и освещение стен.
function citySun(minutes,night){
  const h=((minutes/60)%24+24)%24,a=clamp((h-6)/14,0,1)*Math.PI;
  const x=-.55*Math.cos(a),y=.26+.12*Math.abs(Math.cos(a)),L=Math.hypot(x,y);
  return {x,y,nx:-x/L,ny:-y/L,alpha:.2-.165*night};
}
let facadeSun=null;

function render(){
  const z=cam.z;LOD=z>8?2:z>3?1:0;const t=performance.now()/1000;const night=nightAmount();
  facadeSun=z>=3?citySun(clock.minutes,night):null;
  let shx=0,shy=0;if(shake>0){shake-=0.016;shx=(Math.random()-0.5)*shake*14;shy=(Math.random()-0.5)*shake*14;}
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle=GROUND;ctx.fillRect(0,0,W,H);
  const vx0=cam.x-W/2/z-20,vy0=cam.y-H/2/z-40,vx1=cam.x+W/2/z+20,vy1=cam.y+H/2/z+20;
  const toS=(x,y)=>[(x-cam.x)*z+W/2+shx,(y-cam.y)*z+H/2+shy];
  const setWorld=()=>ctx.setTransform(DPR*z,0,0,DPR*z,DPR*(W/2-cam.x*z+shx),DPR*(H/2-cam.y*z+shy));
  setWorld();
  if(z<0.75){renderOverview(z,t,toS,vx0,vy0,vx1,vy1,night);return;}
  const pois=z>1.5?visiblePois(vx0,vy0,vx1,vy1,z):[]; // один список для входов и подписей
  // ---- площади
  for(const a of world.areas){if(a.bb[2]<vx0||a.bb[0]>vx1||a.bb[3]<vy0||a.bb[1]>vy1)continue;ctx.fillStyle=AREA_FILL[a.k]||'#ddd';poly(a.p);ctx.fill();
    if(a.k==='water'&&z>1.2){ctx.strokeStyle='rgba(255,255,255,.35)';ctx.lineWidth=0.6;ctx.stroke();}}
  drawKremlinGround(vx0,vy0,vx1,vy1);
  // ---- дороги (батчами по ширине)
  // только улицы на экране — через сетку улиц (раньше каждый кадр перебирались все улицы, когда-либо загруженные: после объезда города — 40% времени кадра)
  const gm=new Map();const vis=[];
  roadsIn(vx0,vy0,vx1,vy1,r=>{vis.push(r);const k=r.c*100+Math.round(r.w*2);let g=gm.get(k);if(!g){g={c:r.c,w:r.w,list:[]};gm.set(k,g);}g.list.push(r);});
  // крупные улицы — поверх мелких, в одном порядке на любом кадре (иначе перекрёстки мигали бы при сдвиге камеры)
  const groups=[...gm.values()].sort((a,b)=>b.c-a.c||a.w-b.w);vis.sort((a,b)=>a.i-b.i);   // подписи улиц — на тех же отрезках, что раньше, и не прыгают при сдвиге
  const pathGroup=g=>{ctx.beginPath();for(const r of g.list){const p0=world.nodes[r.p[0]];ctx.moveTo(p0[0],p0[1]);for(let i=1;i<r.p.length;i++){const p=world.nodes[r.p[i]];ctx.lineTo(p[0],p[1]);}}};
  ctx.lineCap='round';ctx.lineJoin='round';
  for(const g of groups){if(g.c<=8){pathGroup(g);ctx.strokeStyle='#B9B3A5';ctx.lineWidth=g.w+2*SIDEWALK+0.5;ctx.stroke();ctx.strokeStyle='#D4CFC3';ctx.lineWidth=g.w+2*SIDEWALK;ctx.stroke();}else if(g.c===9){pathGroup(g);ctx.strokeStyle='#D7D1C2';ctx.lineWidth=g.w+1;ctx.stroke();}}
  if(z>1.3)for(const g of groups){if(g.c<10)continue;pathGroup(g);ctx.strokeStyle='#CBC5B5';ctx.lineWidth=g.c===12?1.5:1.3;if(g.c===12)ctx.setLineDash([0.7,0.7]);ctx.stroke();ctx.setLineDash([]);}
  for(const g of groups){if(g.c>8)continue;pathGroup(g);ctx.strokeStyle='#8F8E89';ctx.lineWidth=g.w+0.9;ctx.stroke();}
  for(const g of groups){if(g.c>8)continue;pathGroup(g);if(g.c<=4&&z>1.4){ctx.strokeStyle='#E9E6DC';ctx.lineWidth=g.w;ctx.stroke();ctx.strokeStyle=ASPHALT[g.c];ctx.lineWidth=g.w-0.7;ctx.stroke();}else{ctx.strokeStyle=ASPHALT[g.c];ctx.lineWidth=g.w;ctx.stroke();}}
  if(z>1.6){for(const g of groups){if(g.c>8||g.w<6.2)continue;const two=g.list.filter(r=>!r.o);if(!two.length)continue;ctx.beginPath();for(const r of two){const p0=world.nodes[r.p[0]];ctx.moveTo(p0[0],p0[1]);for(let i=1;i<r.p.length;i++){const p=world.nodes[r.p[i]];ctx.lineTo(p[0],p[1]);}}ctx.strokeStyle='#ECE9DF';ctx.lineWidth=0.22;if(g.c>=5)ctx.setLineDash([2.5,2.5]);ctx.stroke();ctx.setLineDash([]);}}
  // ---- зебры
  if(z>1.4){ctx.fillStyle='#F1EFE7';world.cgrid.query(vx0,vy0,vx1,vy1,c=>{if(c.x<vx0||c.x>vx1||c.y<vy0||c.y>vy1)return;ctx.save();ctx.translate(c.x,c.y);ctx.rotate(Math.atan2(c.dy,c.dx));for(let u=-c.hw+0.5;u<c.hw-0.2;u+=1.0)ctx.fillRect(-1.4,u-0.25,2.8,0.5);ctx.restore();});}
  // ---- парковки: машины
  if(z>1.6)for(const a of world.areas){if(a.k!=='parking'||!a.cars||a.bb[2]<vx0||a.bb[0]>vx1||a.bb[3]<vy0||a.bb[1]>vy1)continue;for(const c of a.cars)drawCarSprite(c.x,c.y,Math.cos(c.ang),Math.sin(c.ang),4.3,1.8,c.color,'car',t,null);}
  // ---- тени зданий
  const bvis=[];world.bgrid.query(vx0,vy0,vx1,vy1,b=>{if(b.bb[2]<vx0||b.bb[0]>vx1||b.bb[3]<vy0||b.bb[1]>vy1)return;bvis.push(b);});
  if(z>1.4){const sun=facadeSun;ctx.fillStyle=sun?`rgba(45,47,57,${sun.alpha})`:'rgba(50,40,25,.2)';ctx.beginPath();for(const b of bvis){const p=b.p;const sx=(sun?sun.x:.38)*b.hm,sy=(sun?sun.y:.3)*b.hm;ctx.moveTo(p[0]+sx,p[1]+sy);for(let i=2;i<p.length;i+=2)ctx.lineTo(p[i]+sx,p[i+1]+sy);}ctx.fill();}
  // ---- деревья
  if(z>0.9){const tv=[];world.tgrid.query(vx0,vy0,vx1,vy1,tr=>{if(tr.x<vx0||tr.x>vx1||tr.y<vy0||tr.y>vy1)return;tv.push(tr);});
    if(z>1.4){const sun=facadeSun;ctx.fillStyle=sun?`rgba(40,50,35,${sun.alpha})`:'rgba(40,50,25,.22)';ctx.beginPath();for(const tr of tv){const sx=tr.r*(sun?sun.x:.4),sy=tr.r*(sun?sun.y:.35);ctx.moveTo(tr.x+sx+tr.r,tr.y+sy);ctx.arc(tr.x+sx,tr.y+sy,tr.r,0,TAU);}ctx.fill();}
    for(let c=0;c<3;c++){ctx.fillStyle=TREE_C[c];ctx.beginPath();for(const tr of tv){if(tr.c!==c)continue;ctx.moveTo(tr.x+tr.r,tr.y);ctx.arc(tr.x,tr.y,tr.r,0,TAU);}ctx.fill();
      if(z>2.2){ctx.fillStyle=TREE_HI[c];ctx.beginPath();for(const tr of tv){if(tr.c!==c)continue;const r2=tr.r*0.55;ctx.moveTo(tr.x-tr.r*0.2+r2,tr.y-tr.r*0.25);ctx.arc(tr.x-tr.r*0.2,tr.y-tr.r*0.25,r2,0,TAU);}ctx.fill();}}}
  drawWalls(z,vx0,vy0,vx1,vy1);
  // ---- здания
  bvis.sort((a,b)=>a.bb[3]-b.bb[3]);
  winDark.length=0;winLit.length=0;facadeWallsLeft=16;
  for(const b of bvis)drawBuilding(b,z,night);
  if(z>1.1)drawLandmarks(bvis,z);
  // окна и тени — одним путём без closePath: fill() замыкает каждую фигуру сам, а closePath в длинном пути в Chrome стоит квадратично (на телефоне было ~10 кадров в секунду)
  if(winDark.length){ctx.fillStyle='rgba(40,52,75,.42)';ctx.beginPath();for(const q of winDark){ctx.moveTo(q[0],q[1]);ctx.lineTo(q[2],q[3]);ctx.lineTo(q[4],q[5]);ctx.lineTo(q[6],q[7]);}ctx.fill();}
  if(winLit.length&&night<=0.3){ctx.fillStyle='rgba(40,52,75,.42)';ctx.beginPath();for(const q of winLit){ctx.moveTo(q[0],q[1]);ctx.lineTo(q[2],q[3]);ctx.lineTo(q[4],q[5]);ctx.lineTo(q[6],q[7]);}ctx.fill();}
  if(LOD>=2)drawCafeEntrances(pois);
  // ---- остановки
  if(z>1.2)for(const s of world.stops){if(s.x<vx0||s.x>vx1||s.y<vy0||s.y>vy1)continue;drawStop(s);}
  // ---- прокат и своя машина
  for(const r of rentals){if(r.x<vx0||r.x>vx1||r.y<vy0||r.y>vy1)continue;if(r.kind==='scooter')drawScooter(r.x,r.y,r.hx,r.hy);else if(r.kind==='bike')drawBicycle(r.x,r.y,r.hx,r.hy);else drawCarSprite(r.x,r.y,r.hx,r.hy,4.5,1.9,r.color,'share',t,null);}
  if(ownCar&&ownCar.parked&&ownCar.x>vx0&&ownCar.x<vx1&&ownCar.y>vy0&&ownCar.y<vy1)drawCarSprite(ownCar.x,ownCar.y,ownCar.hx,ownCar.hy,4.6,1.9,ownCar.color,'own',t,null);
  // ---- происшествия: обломки, конусы
  for(const ac of accidents){if(ac.medical)continue;ctx.fillStyle='rgba(40,30,20,.5)';for(let i=0;i<6;i++){ctx.beginPath();ctx.arc(ac.x+Math.cos(i*1.3)*(1+i*0.5),ac.y+Math.sin(i*1.7)*(1+i*0.4),0.3,0,TAU);ctx.fill();}if(ac.police&&ac.police.state==='scene'){ctx.fillStyle='#F2651F';for(let i=0;i<4;i++){const an=i*1.57+0.7;ctx.beginPath();ctx.arc(ac.x+Math.cos(an)*7,ac.y+Math.sin(an)*7,0.5,0,TAU);ctx.fill();}}}
  // ---- машины и транспорт
  for(const c of cars){if(c.x<vx0-10||c.x>vx1+10||c.y<vy0-10||c.y>vy1+10)continue;drawCarSprite(c.x,c.y,c.hx,c.hy,c.len,c.wid,c.color,c.kind,t,{crashed:c.crashed,flash:c.flash&&!c.crashed&&(c.target!=null||c.state==='scene')});}
  for(const b of buses){if(b.x<vx0-20||b.x>vx1+20||b.y<vy0-20||b.y>vy1+20)continue;drawBusSprite(b);}
  drawRallyWorld(z,t);
  // ---- люди
  if(z>1.5){for(const w of walkers){if(w.bus||w.inside||w.x<vx0-5||w.x>vx1+5||w.y<vy0-5||w.y>vy1+5)continue;if(w.state==='hurt')continue;drawPerson(w.x,w.y,w.hx,w.hy,w.p,w.phase,{moving:w.state==='walk'||w.state==='cross'||!!w.mv||!!w.walking,scale:1.5,filming:w.filming,time:t});}
    for(const w of walkers){if(w.state==='hurt'&&w.x>vx0&&w.x<vx1&&w.y>vy0&&w.y<vy1)drawPerson(w.x,w.y,w.hx,w.hy,w.p,0,{lying:true,scale:1.5});}}
  // ---- игрок и другие игроки
  for(const pr of peerRender.values()){if(pr.b)continue;drawPlayerWorld(pr.x,pr.y,pr.hx,pr.hy,pr.veh,Object.assign({clothes:pr.c||'#4A90E2',skin:'#F1D3B5',hair:'#2B1B12',role:'player'},pr.look),t,false);}
  if(!player.bus&&!player.inside)drawPlayerWorld(player.x,player.y,player.hx,player.hy,player.vehicle?{kind:player.vehicle.kind,color:player.vehicle.color,crashed:player.vehicle.crashedLook,onRoad:player.vehicle.onRoad}:null,myLook(),t,true);
  if(z>=3)drawJourneyHints(t*1000,vx0,vy0,vx1,vy1);
  // линия навигатора: оставшийся путь пешком или на машине
  {const wl=player.vehicle?(player.vehicle.auto&&player.vehicle.auto.wps):(!player.bus&&player.waypoints);if(wl&&wl.length){ctx.save();ctx.strokeStyle='rgba(43,176,98,.75)';ctx.lineWidth=Math.max(0.8,2.2/z);ctx.lineCap='round';ctx.lineJoin='round';ctx.setLineDash([Math.max(1.2,4/z),Math.max(1,3/z)]);ctx.beginPath();ctx.moveTo(player.x,player.y);for(let i=(player.vehicle?player.vehicle.auto.i||0:0);i<wl.length;i++)ctx.lineTo(wl[i][0],wl[i][1]);ctx.stroke();ctx.restore();}}
  if(player.waypoints&&!player.vehicle){const w=player.waypoints[player.waypoints.length-1];ctx.strokeStyle='rgba(43,176,98,.9)';ctx.lineWidth=0.3;ctx.beginPath();ctx.arc(w[0],w[1],1.6+Math.sin(t*6)*0.3,0,TAU);ctx.stroke();}
  if(player.vehicle&&player.vehicle.auto){const a=player.vehicle.auto;const w=a.wps[a.wps.length-1];ctx.strokeStyle='rgba(43,176,98,.9)';ctx.lineWidth=0.35;ctx.beginPath();ctx.arc(w[0],w[1],2+Math.sin(t*6)*0.3,0,TAU);ctx.stroke();ctx.setLineDash([2,2]);ctx.lineWidth=0.3;ctx.strokeStyle='rgba(43,176,98,.5)';ctx.beginPath();ctx.moveTo(player.x,player.y);for(let i=a.i;i<a.wps.length;i++)ctx.lineTo(a.wps[i][0],a.wps[i][1]);ctx.stroke();ctx.setLineDash([]);}
  if(player.home&&z>1.1){const hx=player.home.cx,hy=player.home.cy;ctx.fillStyle='rgba(43,176,98,.9)';ctx.beginPath();ctx.moveTo(hx,hy-3.2);ctx.lineTo(hx+2.4,hy-0.8);ctx.lineTo(hx-2.4,hy-0.8);ctx.closePath();ctx.fill();ctx.fillRect(hx-1.6,hy-0.8,3.2,2.6);}
  // ---- ночь
  if(night>0.02){if(!lampSprite)makeLightSprites();ctx.setTransform(DPR,0,0,DPR,0,0);ctx.globalCompositeOperation='multiply';ctx.fillStyle=`rgba(${Math.round(255-175*night)},${Math.round(255-160*night)},${Math.round(255-95*night)},1)`;ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation='screen';setWorld();ctx.globalAlpha=night;
    world.lgrid.query(vx0,vy0,vx1,vy1,l=>{if(l[0]<vx0||l[0]>vx1||l[1]<vy0||l[1]>vy1)return;ctx.drawImage(lampSprite,l[0]-13,l[1]-13,26,26);});
    const allv=cars.concat(buses);if(player.vehicle)allv.push(vehProxy(player.vehicle));for(const v of allv){if(v.crashed||v.x<vx0||v.x>vx1||v.y<vy0||v.y>vy1)continue;ctx.save();ctx.translate(v.x+v.hx*(v.len/2-0.5),v.y+v.hy*(v.len/2-0.5));ctx.rotate(Math.atan2(v.hy,v.hx));ctx.drawImage(beamSprite,0,-6,20,12);ctx.restore();}
    ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
    if(winLit.length&&night>0.3){ctx.fillStyle=`rgba(255,214,130,${0.5+0.45*night})`;ctx.beginPath();for(const q of winLit){ctx.moveTo(q[0],q[1]);ctx.lineTo(q[2],q[3]);ctx.lineTo(q[4],q[5]);ctx.lineTo(q[6],q[7]);}ctx.fill();}}
  // ---- подписи
  ctx.setTransform(DPR,0,0,DPR,0,0);
  if(z>2.1){ctx.font='500 11px "IBM Plex Sans",system-ui';ctx.textAlign='center';ctx.textBaseline='middle';const done=new Set();
    for(const r of vis){if(!r.n||r.c>8||done.has(r.n))continue;let bi=0,bl=0;for(let i=0;i<r.p.length-1;i++){const a=world.nodes[r.p[i]],b=world.nodes[r.p[i+1]];const L=dist(a[0],a[1],b[0],b[1]);if(L>bl){bl=L;bi=i;}}
      const a=world.nodes[r.p[bi]],b=world.nodes[r.p[bi+1]];const tw=ctx.measureText(r.n).width;if(bl*z<tw+14)continue;const [sx,sy]=toS((a[0]+b[0])/2,(a[1]+b[1])/2);if(sx<-50||sx>W+50||sy<-20||sy>H+20)continue;let an=Math.atan2(b[1]-a[1],b[0]-a[0]);if(an>Math.PI/2)an-=Math.PI;if(an<-Math.PI/2)an+=Math.PI;done.add(r.n);
      ctx.save();ctx.translate(sx,sy);ctx.rotate(an);ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=3;ctx.strokeText(r.n,0,0);ctx.fillStyle='#3F3830';ctx.fillText(r.n,0,0);ctx.restore();}}
  if(z>1.5){ctx.textAlign='center';ctx.textBaseline='middle';const occ=new Set();const cell=z>4?26:34;const shown=[];
    for(const p of pois){const [sx,sy]=toS(p.x,p.y);const k=Math.floor(sx/cell)*4096+Math.floor(sy/cell);if(occ.has(k))continue;occ.add(k);shown.push([p,sx,sy]);}
    for(const [p,sx,sy] of shown){ctx.fillStyle='rgba(255,255,255,.92)';ctx.beginPath();ctx.arc(sx,sy,9,0,TAU);ctx.fill();ctx.font='11px system-ui';ctx.fillStyle='#000';ctx.fillText(POI_GLYPH[p.t]||'•',sx,sy+0.5);}
    if(z>4.2){ctx.font='500 10px "IBM Plex Sans",system-ui';for(const [p,sx,sy] of shown){if(!p.n)continue;ctx.lineWidth=3;ctx.strokeStyle='rgba(255,255,255,.8)';ctx.strokeText(p.n,sx,sy+17);ctx.fillStyle='#3A3128';ctx.fillText(p.n,sx,sy+17);}}}
  if(z>2.6){ctx.font='600 10px "IBM Plex Sans",system-ui';ctx.textAlign='center';for(const s of world.stops){if(s.x<vx0||s.x>vx1||s.y<vy0||s.y>vy1)continue;const [sx,sy]=toS(s.x,s.y);ctx.lineWidth=3;ctx.strokeStyle='rgba(255,255,255,.8)';ctx.strokeText(s.n,sx,sy-12);ctx.fillStyle='#24476F';ctx.fillText(s.n,sx,sy-12);}}
  ctx.font='700 11px "JetBrains Mono",monospace';ctx.textAlign='center';ctx.textBaseline='middle';
  for(const b of buses){if(b.x<vx0||b.x>vx1||b.y<vy0||b.y>vy1)continue;const [sx,sy0]=toS(b.x,b.y);const sy=sy0-2.2*z-10;ctx.fillStyle=b.color;rrect(ctx,sx-14,sy-8,28,16,4);ctx.fill();ctx.fillStyle='#fff';ctx.fillText(b.route.ref,sx,sy+0.5);}
  {// в толпе подписываем только ближайших, иначе имена слипаются в кашу
    const arr=[...peerRender.values()];if(arr.length>12)arr.sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y));
    for(let i=0;i<arr.length;i++){const pr=arr[i];if(i>=12&&!pr.say)continue;const [sx,sy]=toS(pr.x,pr.y);if(sx<-60||sx>W+60||sy<-60||sy>H+60)continue;labelPlayer(sx,sy-Math.max(1.2*z,8),pr.name,false,pr.img,pr.look&&pr.look.frame);}}
  let playerNameBox=null;
  if(!player.bus&&!player.inside){const [sx,sy]=toS(player.x,player.y);playerNameBox=labelPlayer(sx,sy-Math.max((player.vehicle?2.2:1.2)*z,9),player.name,true,player.avatarImg,myLook().frame);}
  drawRallyLabels(toS,z);
  drawCrowd(toS,z);drawSpeedCams(toS,z);drawCityBubbles(toS,z);
  drawCompanionMark(toS,z);drawSituations(toS,z);
  routeOverlay(toS);
  ctx.font='700 11px "IBM Plex Sans",system-ui';ctx.textAlign='center';for(const ac of accidents){if(ac.medical)continue;const [sx,sy]=toS(ac.x,ac.y);ctx.fillStyle='rgba(220,58,68,.95)';rrect(ctx,sx-22,sy-30,44,18,5);ctx.fill();ctx.fillStyle='#fff';ctx.fillText('ДТП',sx,sy-21);}
  for(const w of walkers){if(w.state!=='cross'||z<2.5)continue;const [sx,sy]=toS(w.x,w.y);ctx.fillStyle='rgba(235,187,75,.95)';rrect(ctx,sx-8,sy-22,16,14,4);ctx.fill();ctx.fillStyle='#2B2200';ctx.fillText('!',sx,sy-15);}
  if(typeof drawMetroSigns==='function')drawMetroSigns(vx0,vy0,vx1,vy1,z,toS);
  // Навигационные метки поверх ночного затемнения. Издалека — прежнее рисование без новых проходов.
  if(z>=3){drawTransportMarks(toS,z,vx0,vy0,vx1,vy1);drawPlayerBeacon(toS,z);drawActionTarget(toS,z,playerNameBox);}
  // свои люди: имя над головой у тех, с кем уже знакомы
  if(z>2.2&&typeof FOLK!=='undefined'){ctx.font='600 11px "IBM Plex Sans",system-ui';ctx.textAlign='center';ctx.textBaseline='middle';for(const f of FOLK.list){const w=f.w;if(!w||!f.met||w.x<vx0-5||w.x>vx1+5||w.y<vy0-5||w.y>vy1+5)continue;const [sx,sy]=toS(w.x,w.y);const t='★ '+f.name;const tw=ctx.measureText(t).width+12;ctx.fillStyle='rgba(20,60,40,.85)';rrect(ctx,sx-tw/2,sy-46*Math.min(1.6,z/4)-9,tw,18,9);ctx.fill();ctx.fillStyle='#E9FFF1';ctx.fillText(t,sx,sy-46*Math.min(1.6,z/4));}}
  if(weather.rain.length){ctx.strokeStyle='rgba(120,150,190,.45)';ctx.lineWidth=1;ctx.beginPath();for(const r of weather.rain){const x=r[0]*W,y=r[1]*H;ctx.moveTo(x,y);ctx.lineTo(x-2,y+9*r[2]);}ctx.stroke();ctx.fillStyle='rgba(60,80,110,.12)';ctx.fillRect(0,0,W,H);}
  for(const ac of accidents){const [sx,sy]=toS(ac.x,ac.y);if(sx>0&&sx<W&&sy>0&&sy<H)continue;const dx=sx-W/2,dy=sy-H/2;const an=Math.atan2(dy,dx);const rx=W/2+Math.cos(an)*Math.min(W/2-30,Math.abs(dx)),ry=H/2+Math.sin(an)*Math.min(H/2-90,Math.abs(dy));ctx.save();ctx.translate(clamp(rx,30,W-30),clamp(ry,110,H-110));ctx.rotate(an);ctx.fillStyle='rgba(220,58,68,.9)';ctx.beginPath();ctx.moveTo(14,0);ctx.lineTo(-6,-8);ctx.lineTo(-6,8);ctx.closePath();ctx.fill();ctx.restore();}
  // ---- кинематографичный момент
  if(cine){const k=cine.t/cine.dur;const a=k<0.15?k/0.15:k>0.8?(1-k)/0.2:1;ctx.fillStyle=cine.kind==='arrest'?`rgba(${Math.sin(t*9)>0?'200,20,20':'20,60,200'},${0.3*a})`:`rgba(120,0,0,${0.35*a*(0.6+0.4*Math.sin(t*12))})`;ctx.fillRect(0,0,W,H);const g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.2,W/2,H/2,Math.max(W,H)*0.7);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,`rgba(0,0,0,${0.75*a})`);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 '+Math.round(22+8*a)+'px "Unbounded",sans-serif';ctx.fillStyle=`rgba(255,255,255,${a})`;ctx.fillText(cine.text,W/2,H*0.78);ctx.font='500 13px "IBM Plex Sans",system-ui';ctx.fillStyle=`rgba(255,255,255,${0.8*a})`;ctx.fillText(cine.sub?cine.sub:cine.kind==='hit'?'Скорая уже едет…':cine.kind==='hitped'?'Вызвана скорая и ГИБДД':'Ждём ГИБДД',W/2,H*0.78+28);}
  renderMini();
}
function poly(p){ctx.beginPath();ctx.moveTo(p[0],p[1]);for(let i=2;i<p.length;i+=2)ctx.lineTo(p[i],p[i+1]);ctx.closePath();}

// Пять маленьких векторных значков; максимум 5 × 40 × 40 × 4 = 32 000 байт при DPR 2.
// Растрируем один раз при смене DPR, чтобы не строить пути для каждой машины каждый кадр.
let transportMarks=null,transportMarksDPR=0;
function makeTransportMarks(){
  transportMarks={};transportMarksDPR=DPR;
  for(const kind of ['taxi','share','own','scooter','bike']){
    const c=document.createElement('canvas');c.width=c.height=20*DPR;const g=c.getContext('2d');g.scale(DPR,DPR);
    g.fillStyle='#142B27';rrect(g,0,0,20,20,6);g.fill();
    g.fillStyle=kind==='taxi'?'#FFDB60':kind==='share'?'#8EE5F0':kind==='scooter'?'#D3C2FF':kind==='bike'?'#B9E6C3':'#FFFFFF';rrect(g,1.5,1.5,17,17,4.5);g.fill();
    g.strokeStyle=g.fillStyle='#142B27';g.lineWidth=1.7;g.lineCap='round';g.lineJoin='round';
    if(kind==='taxi'){for(let y=0;y<2;y++)for(let x=0;x<3;x++)if((x+y)%2===0)g.fillRect(4+x*4,6+y*4,4,4);}
    else if(kind==='share'){g.beginPath();g.moveTo(5,7);g.lineTo(15,7);g.lineTo(12,4);g.moveTo(15,13);g.lineTo(5,13);g.lineTo(8,16);g.stroke();}
    else if(kind==='own'){g.beginPath();g.arc(7,7,2.5,0,TAU);g.moveTo(9,9);g.lineTo(15,15);g.moveTo(12,12);g.lineTo(14,10);g.moveTo(14,14);g.lineTo(16,12);g.stroke();}
    else if(kind==='bike'){g.beginPath();g.arc(5,13,3,0,TAU);g.moveTo(18,13);g.arc(15,13,3,0,TAU);g.moveTo(5,13);g.lineTo(8,7);g.lineTo(11,13);g.lineTo(5,13);g.moveTo(8,7);g.lineTo(13,7);g.lineTo(15,13);g.moveTo(13,7);g.lineTo(12,4);g.lineTo(15,4);g.stroke();}
    else{g.beginPath();g.arc(5,14,1.5,0,TAU);g.moveTo(16.5,14);g.arc(15,14,1.5,0,TAU);g.moveTo(5,12);g.lineTo(12,12);g.lineTo(14,5);g.lineTo(11,5);g.stroke();}
    transportMarks[kind]=c;
  }
}
function drawTransportMarks(toS,z,x0,y0,x1,y1){
  if(!transportMarks||transportMarksDPR!==DPR)makeTransportMarks();
  const mark=(v,kind)=>{if(v.x<x0||v.x>x1||v.y<y0||v.y>y1)return;
    // У выбранного транспорта вместо второго значка будет одна метка E.
    if(currentAction&&currentAction.at===v)return;
    const [sx,sy]=toS(v.x,v.y);ctx.drawImage(transportMarks[kind],sx-8,sy-Math.max(13,1.5*z)-16,16,16);
  };
  for(const r of rentals)mark(r,r.kind==='scooter'?'scooter':r.kind==='bike'?'bike':'share');
  if(ownCar&&ownCar.parked)mark(ownCar,'own');
  for(const c of cars)if(c.kind==='taxi')mark(c,'taxi');
}
function drawPlayerBeacon(toS,z){
  if(player.bus||player.inside)return;
  const [sx,sy]=toS(player.x,player.y),v=player.vehicle;
  const r=Math.max(11,(v&&v.kind!=='scooter'&&v.kind!=='bike'?3.1:1.7)*z);
  ctx.save();ctx.translate(sx,sy);ctx.beginPath();ctx.arc(0,0,r,0,TAU);
  ctx.strokeStyle='#102E28';ctx.lineWidth=6;ctx.stroke();ctx.strokeStyle='#FFFFFF';ctx.lineWidth=4;ctx.stroke();ctx.strokeStyle='#35D69B';ctx.lineWidth=2;ctx.stroke();
  ctx.rotate(Math.atan2(player.hy,player.hx));ctx.beginPath();ctx.moveTo(r+7,0);ctx.lineTo(r+1,-4);ctx.lineTo(r+1,4);ctx.closePath();
  ctx.strokeStyle='#102E28';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#FFFFFF';ctx.fill();ctx.restore();
}
function drawActionTarget(toS,z,nameBox){
  const a=currentAction;
  if(scene==='interior'||!a||!a.at||!a.tk||!Number.isFinite(a.at.x)||!Number.isFinite(a.at.y))return;
  ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
  // Скобки и контур тоже могут проходить под именем: оставляем всю подпись читаемой.
  if(nameBox){ctx.beginPath();ctx.rect(0,0,W,H);ctx.rect(nameBox.x,nameBox.y,nameBox.w,nameBox.h);ctx.clip('evenodd');}
  let x=a.at.x,y=a.at.y,r=12;
  const b=a.bld;
  if(b&&b.p&&b.p.length>=6&&(a.tk==='poi'||a.tk==='home'||a.tk==='building')){
    // Контур выбранного здания и ближайшая к игроку точка стены; POI может быть глубоко внутри дома.
    const p=b.p,ex=z>1.4?EXT[0]*(b.hm||0):0,ey=z>1.4?EXT[1]*(b.hm||0):0;let best=Infinity;
    ctx.beginPath();
    for(let i=0;i<p.length;i+=2){const j=(i+2)%p.length,dx=p[j]-p[i],dy=p[j+1]-p[i+1];
      const u=clamp(((player.x-p[i])*dx+(player.y-p[i+1])*dy)/(dx*dx+dy*dy||1),0,1);
      const qx=p[i]+u*dx,qy=p[i+1]+u*dy,d=(qx-player.x)**2+(qy-player.y)**2;
      if(d<best){best=d;x=qx;y=qy;}
      const [sx,sy]=toS(p[i]+ex,p[i+1]+ey);if(i)ctx.lineTo(sx,sy);else ctx.moveTo(sx,sy);
    }
    ctx.closePath();ctx.strokeStyle='rgba(20,35,30,.85)';ctx.lineWidth=5;ctx.stroke();ctx.strokeStyle='#FFDA69';ctx.lineWidth=2;ctx.stroke();r=7;
    // Если вход уже нарисован рядом с игроком, метка указывает на него, а не на другую стену того же кафе.
    // Дверь дальше 10 м — только рисунок: войти можно с любой стены, метка остаётся у ближайшей.
    const entry=LOD>=2&&a.tk==='poi'&&cafeEntryCache.get(a.at);
    if(entry&&!entry.missing&&entry.b===b&&entry.polygon===b.p&&Math.hypot(entry.x-player.x,entry.y-player.y)<10){x=entry.x;y=entry.y;}
  }else if(a.tk==='taxi'||a.tk==='share'||a.tk==='own')r=Math.max(15,2.8*z);
  else if(a.tk==='stop'||a.tk==='metro'||a.tk==='accident')r=16;
  const [sx,sy]=toS(x,y);
  if(sx<-r-30||sx>W+r+30||sy<-r-30||sy>H+r+30){ctx.restore();return;}
  // Скобки отличаются от круглой метки игрока и не закрывают самого человека или машину.
  ctx.beginPath();for(const dx of [-1,1])for(const dy of [-1,1]){
    ctx.moveTo(sx+dx*(r-5),sy+dy*r);ctx.lineTo(sx+dx*r,sy+dy*r);ctx.lineTo(sx+dx*r,sy+dy*(r-5));
  }
  ctx.strokeStyle='#142B27';ctx.lineWidth=5;ctx.stroke();ctx.strokeStyle='#FFDA69';ctx.lineWidth=2.5;ctx.stroke();
  // Значок с внешней стороны цели, дальше от игрока. Координаты читаем с живого at, без таймеров и пульсации.
  const dx=x-player.x,dy=y-player.y,L=Math.hypot(dx,dy);
  // Ограничиваем всегда, в том числе когда имя далеко и не было столкновения с ним.
  let bx=clamp(sx+(L>0.01?dx/L:0)*(r+13),12,W-12),by=clamp(sy+(L>0.01?dy/L:-1)*(r+13),12,H-12);
  // Уже измеренная рамка имени, включая аватар и украшение; без повторного measureText.
  if(nameBox){const n=nameBox,hit=(x,y)=>x+13>n.x&&x-13<n.x+n.w&&y+13>n.y&&y-13<n.y+n.h;
    if(hit(bx,by)){
      const gap=r+13,candidates=[[sx+gap,sy],[sx-gap,sy],[sx,sy+gap],[sx,sy-gap],
        [bx,n.y-13],[bx,n.y+n.h+13],[n.x-13,by],[n.x+n.w+13,by]];
      let best=Infinity,nx=bx,ny=by;
      for(const q of candidates){const x=clamp(q[0],12,W-12),y=clamp(q[1],12,H-12);if(hit(x,y))continue;
        const d=(x-bx)**2+(y-by)**2;if(d<best){best=d;nx=x;ny=y;}}
      bx=nx;by=ny;
    }
  }
  ctx.fillStyle='#142B27';rrect(ctx,bx-11,by-11,22,22,6);ctx.fill();ctx.fillStyle='#FFDA69';rrect(ctx,bx-9,by-9,18,18,4);ctx.fill();
  ctx.fillStyle='#142B27';ctx.font='700 12px "IBM Plex Sans",system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('E',bx,by+0.5);ctx.restore();
}
let facadeWallsLeft=16;
function facadeSeed(b){return Math.imul(Math.round(b.p[0]*10),73856093)^Math.imul(Math.round(b.p[1]*10),19349663);}
function facadeKind(b){
  if(/industrial|warehouse|garage|hangar|shed/.test(b.t||''))return 3;
  if(/commercial|retail|office/.test(b.t||'')||b.h>=7)return 1;
  if(/public|school|museum|theatre|university|civic/.test(b.t||''))return 2;
  return (facadeSeed(b)>>>0)%2?0:2;
}
function drawBuilding(b,z,night){const p=b.p;const n=p.length;let detailedWalls=0;
  if(z<=1.4||b.hm<0.5){ctx.fillStyle=b.roof;poly(p);ctx.fill();if(z>1)ctx.strokeStyle='rgba(60,50,40,.35)',ctx.lineWidth=0.25,ctx.stroke();return;}
  const ex=EXT[0]*b.hm,ey=EXT[1]*b.hm;const win=z>4.2&&b.h>=1;const lit=night>0.3&&b.lit;
  for(let i=0;i<n;i+=2){const j=(i+2)%n;const ax=p[i],ay=p[i+1],bx=p[j],by=p[j+1];const dx=bx-ax,dy=by-ay;const L=Math.hypot(dx,dy)||1;const nx=b.sgn*dy/L,ny=-b.sgn*dx/L;
    if(nx*EXT[0]+ny*EXT[1]>=0)continue;const sun=facadeSun,light=sun ? .68+.32*(1-night)*Math.max(0,nx*sun.nx+ny*sun.ny) : .62+.38*Math.max(0,nx*-.62+ny*-.78);
    ctx.fillStyle=shade(b.wall,light);ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.lineTo(bx+ex,by+ey);ctx.lineTo(ax+ex,ay+ey);ctx.closePath();ctx.fill();
    // Один фасад на дом, 16 на кадр. Карниз, цоколь или пилястры — только на близком плане.
    if(LOD>=2&&L>5&&b.hm>2&&detailedWalls<1&&facadeWallsLeft>0){drawFacadeDetail(ax,ay,bx,by,ex,ey,facadeKind(b));detailedWalls++;facadeWallsLeft--;}
    if(win&&L>3.2){const lv=Math.min(b.h,14);const ux=dx/L,uy=dy/L;const cols=Math.floor((L-1.2)/2.4);const gap=(L-1.2-cols*2.4)/2+0.6+0.7;const ws=(b.dash%1.5);for(let k=0;k<lv;k++){const v0=(k+0.3)/lv,v1=(k+0.72)/lv;const list=(lit&&((k*7+b.i)%5!==0))?winLit:winDark;for(let c=0;c<cols;c++){const s0=gap+c*2.4+ws,s1=s0+1.0;list.push([ax+ux*s0+ex*v0,ay+uy*s0+ey*v0,ax+ux*s1+ex*v0,ay+uy*s1+ey*v0,ax+ux*s1+ex*v1,ay+uy*s1+ey*v1,ax+ux*s0+ex*v1,ay+uy*s0+ey*v1]);}}}}
  ctx.fillStyle=b.roof;ctx.beginPath();ctx.moveTo(p[0]+ex,p[1]+ey);for(let i=2;i<n;i+=2)ctx.lineTo(p[i]+ex,p[i+1]+ey);ctx.closePath();ctx.fill();ctx.strokeStyle='rgba(50,40,30,.4)';ctx.lineWidth=0.25;ctx.stroke();
  if(z>4.5&&b.n&&b.area>400){ctx.save();ctx.font='500 1.6px "IBM Plex Sans",system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='rgba(40,30,20,.6)';ctx.fillText(b.n,b.cx+ex,b.cy+ey);ctx.restore();}}
function drawFacadeDetail(ax,ay,bx,by,ex,ey,kind){
  // Четыре отделки, не больше 12 отрезков и одного stroke на стену.
  // Геометрия в плоскости стены: не превращает крышу или проход в новое препятствие.
  const dx=bx-ax,dy=by-ay;
  ctx.strokeStyle=kind===1?'rgba(207,231,230,.65)':'rgba(255,239,205,.72)';ctx.lineWidth=.25;ctx.beginPath();
  const line=(u,v,U,V)=>{ctx.moveTo(ax+dx*u+ex*v,ay+dy*u+ey*v);ctx.lineTo(ax+dx*U+ex*V,ay+dy*U+ey*V);};
  line(0,.91,1,.91);line(0,.08,1,.08);
  if(kind===0){line(0,.81,1,.81);line(0,.48,1,.48);for(const u of [.05,.95])line(u,.08,u,.91);}
  else if(kind===1){for(const u of [.2,.4,.6,.8])line(u,.08,u,.91);line(0,.48,1,.48);}
  else if(kind===2){line(0,.83,1,.83);for(const u of [.09,.14,.86,.91])line(u,.08,u,.83);line(.07,.18,.16,.18);line(.84,.18,.93,.18);}
  else{for(const u of [.16,.32,.48,.64,.8])line(u,.08,u,.91);}
  ctx.stroke();
}
// Только геометрия, без новых растров. Не более 96 небольших записей и двух новых расчётов за кадр.
const cafeEntryCache=new Map();
function cafeEntry(p,b){
  const poly=b&&b.p,old=cafeEntryCache.get(p);if(old&&old.b===b&&old.polygon===poly)return old;
  let best=Infinity,out=null;
  for(let i=0;poly&&b.hm>=1&&i<Math.min(poly.length,128);i+=2){const j=(i+2)%poly.length,ax=poly[i],ay=poly[i+1],dx=poly[j]-ax,dy=poly[j+1]-ay,L=Math.hypot(dx,dy);
    if(L<3.2||(b.sgn*dy/L)*EXT[0]+(-b.sgn*dx/L)*EXT[1]>=0)continue;
    const u=clamp(((p.x-ax)*dx+(p.y-ay)*dy)/(L*L),1.3/L,1-1.3/L),x=ax+u*dx,y=ay+u*dy,d=(x-p.x)**2+(y-p.y)**2;
    if(d<best){best=d;out={b,polygon:poly,x,y,ux:dx/L,uy:dy/L};}
  }
  if(!out)out={b,polygon:poly,missing:true};
  if(cafeEntryCache.size>=96)cafeEntryCache.delete(cafeEntryCache.keys().next().value);
  cafeEntryCache.set(p,out);return out;
}
// Четыре общих векторных шаблона: без новых путей/замыканий/растров каждый кадр.
let cafeDoorPaths=null;
function cafeDoorTemplates(){
  if(!cafeDoorPaths)cafeDoorPaths=[[-.75,0,1.5,.85],[-.54,.15,1.08,.55],[-1.25,.84,2.5,.26],[-1.25,.84,2.5,.07]].map(r=>{const p=new Path2D();p.rect(...r);return p;});
  return cafeDoorPaths;
}
function drawCafeEntrances(pois){
  if(LOD<2)return;let considered=0,created=0;
  for(const p of pois){if(p.t!=='cafe'&&p.t!=='bar')continue;if(considered++>=6)break;
    let e=cafeEntryCache.get(p);const known=p._b;
    if(!e||known!==undefined&&e.b!==known||e.b&&e.polygon!==e.b.p){if(created>=2)continue;created++;
      e=cafeEntry(p,poiBuilding(p));}
    if(e.missing)continue;
    const ex=EXT[0]*Math.min(3,e.b.hm),ey=EXT[1]*Math.min(3,e.b.hm);
    const paths=cafeDoorTemplates();ctx.save();ctx.transform(e.ux,e.uy,ex,ey,e.x,e.y);
    ctx.fillStyle='#355753';ctx.fill(paths[0]);ctx.fillStyle='#A8C9C1';ctx.fill(paths[1]);
    ctx.fillStyle=p.t==='bar'?'#9C634D':'#467D69';ctx.fill(paths[2]);
    ctx.fillStyle='#EDE0BA';ctx.fill(paths[3]);ctx.restore();
  }
}
function drawStop(s){
  ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(s.x-1.4,s.y-.5,3,1.5);ctx.fillStyle=s.k==='tram'?'#C9B3D9':'#B9CCE3';rrect(ctx,s.x-1.5,s.y-.7,3,1.4,.2);ctx.fill();
  if(LOD>=2){ // крыша, скамейка и стойки: постоянное число штрихов, без пассажиров-декораций
    ctx.fillStyle='#607789';ctx.fillRect(s.x-1.55,s.y-.95,3.1,.36);ctx.fillStyle='#A87950';ctx.fillRect(s.x-1.05,s.y+.05,1.6,.25);
    ctx.strokeStyle='#56616A';ctx.lineWidth=.12;ctx.beginPath();ctx.moveTo(s.x-1.25,s.y-.65);ctx.lineTo(s.x-1.25,s.y+.5);ctx.moveTo(s.x+.65,s.y-.65);ctx.lineTo(s.x+.65,s.y+.5);ctx.stroke();
  }
  ctx.fillStyle=s.k==='tram'?'#8E3478':'#2F6DB5';ctx.beginPath();ctx.arc(s.x+1.1,s.y-.4,.45,0,TAU);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(s.x+1.1,s.y-.4,.2,0,TAU);ctx.fill();
}
function drawJourneyHints(now,x0,y0,x1,y1){
  const hints=window.journeyVisualHints;if(!Array.isArray(hints))return;
  for(let i=0;i<Math.min(8,hints.length);i++){const h=hints[i];if(!h||(h.kind!=='boarding'&&h.kind!=='exiting'))continue;
    const age=now-h.startedAt,duration=Math.min(700,h.durationMs||450);
    if(!Number.isFinite(age)||age<0||age>=duration||!Number.isFinite(h.fromX)||!Number.isFinite(h.fromY)||!Number.isFinite(h.toX)||!Number.isFinite(h.toY))continue;
    if(Math.max(h.fromX,h.toX)<x0||Math.min(h.fromX,h.toX)>x1||Math.max(h.fromY,h.toY)<y0||Math.min(h.fromY,h.toY)>y1)continue;
    const dx=h.toX-h.fromX,dy=h.toY-h.fromY,L=Math.hypot(dx,dy);if(L>30)continue; // переходы метро не рисуем как шаг через город
    const phase=age/duration;ctx.save();ctx.fillStyle='#F6F0D2';ctx.strokeStyle='#24483F';ctx.lineWidth=.1;ctx.globalAlpha=reduceMotion?.75:(1-phase)*.9;
    const count=reduceMotion?1:3;
    for(let j=0;j<count;j++){const u=reduceMotion?1:clamp(phase*1.35-j*.16,0,1),side=j%2?-.18:.18;
      ctx.beginPath();ctx.ellipse(h.fromX+dx*u+(L?dy/L*side:0),h.fromY+dy*u-(L?dx/L*side:0),.34,.16,Math.atan2(dy,dx),0,TAU);ctx.fill();ctx.stroke();}
    ctx.restore();
  }
}
// ---------- спрайты ----------
function drawPerson(x,y,hx,hy,p,phase,o){
  if(LOD>0&&p.story&&p.story!=='stranger'&&!(o&&o.lying))return drawStoryPerson(x,y,hx,hy,p,phase,o);
  o=o||{};const S=o.scale||1;const hi=LOD>=2&&!o.lying;ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(hy,hx)+(o.lying?Math.PI/2:0));ctx.scale(S,S);
  const hv=p.build==='heavy',bw=hv?0.54:0.42,bl=hv?0.78:0.56,ha=hv?0.88:0.66;   // грузный: шире плечи и живот
  ctx.fillStyle='rgba(0,0,0,.22)';ctx.beginPath();ctx.ellipse(0.1,0.15,o.lying?1.1:hv?0.95:0.75,hv?0.75:0.55,0,0,TAU);ctx.fill();
  if(o.ring){ctx.strokeStyle='rgba(43,176,98,.9)';ctx.lineWidth=0.12;ctx.beginPath();ctx.arc(0,0,0.82,0,TAU);ctx.stroke();}
  const still=o.moving===false||o.seated||o.lying;const sw=still?0:Math.sin(phase)*0.3;
  const filming=LOD>0&&!o.lying&&p.item==='phone'&&o.filming;
  const handX=filming?0.9:sw,handY=filming?-ha*0.8:-ha;
  if(hi&&!o.seated){ctx.fillStyle=p.pants||'#2B2F3A';ctx.beginPath();ctx.ellipse(sw*1.1,-0.22,0.22,0.13,0,0,TAU);ctx.ellipse(-sw*1.1,0.22,0.22,0.13,0,0,TAU);ctx.fill();}
  if(hi||filming){ctx.strokeStyle=p.clothes;ctx.lineWidth=hv?0.26:0.2;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-0.05,-bl+0.06);ctx.lineTo(handX,handY);ctx.moveTo(-0.05,bl-0.06);ctx.lineTo(-sw,ha);ctx.stroke();}
  ctx.fillStyle=p.skin;ctx.beginPath();ctx.arc(handX,handY,0.16,0,TAU);ctx.arc(-sw,ha,0.16,0,TAU);ctx.fill();
  if(p.watch){ctx.fillStyle='#E8B830';ctx.beginPath();ctx.arc(handX-0.14,handY+0.02,0.09,0,TAU);ctx.fill();if(hi){ctx.fillStyle='#FFF3C4';ctx.beginPath();ctx.arc(handX-0.16,handY,0.035,0,TAU);ctx.fill();}}   // часы на руке — видно издалека
  ctx.fillStyle=p.clothes;rrect(ctx,-bw,-bl,bw*2,bl*2,hv?0.55:0.4);ctx.fill();
  if(hv){ctx.fillStyle=p.clothes;ctx.beginPath();ctx.ellipse(0.32,0,0.44,0.6,0,0,TAU);ctx.fill();ctx.fillStyle=shade(p.clothes,1.3);ctx.beginPath();ctx.ellipse(0.4,0,0.3,0.42,0,0,TAU);ctx.fill();}   // живот вперёд, как у начальника
  if(p.tie){ctx.fillStyle='#F2F2EE';ctx.beginPath();ctx.ellipse(0.46,0,0.28,0.13,0,0,TAU);ctx.fill();ctx.fillStyle=p.tie;rrect(ctx,0.3,-0.06,hv?0.46:0.34,0.12,0.04);ctx.fill();}
  if(hi){ctx.fillStyle='rgba(255,255,255,.14)';rrect(ctx,-0.1,-bl+0.06,bw+0.04,bl*2-0.12,0.3);ctx.fill();ctx.strokeStyle='rgba(0,0,0,.3)';ctx.lineWidth=0.05;rrect(ctx,-bw,-bl,bw*2,bl*2,hv?0.55:0.4);ctx.stroke();
    if(p.bag){ctx.fillStyle=p.bag;if(p.backpack)rrect(ctx,-0.62,-0.3,0.3,0.6,0.08);else rrect(ctx,-0.3,0.45,0.42,0.3,0.06);ctx.fill();}}
  if(p.role==='courier'){ctx.fillStyle='#2B2B2B';rrect(ctx,-0.52,-0.3,0.32,0.6,0.06);ctx.fill();}
  if(p.scarf){ctx.fillStyle=p.scarf;ctx.beginPath();ctx.ellipse(0.02,0,0.26,0.46,0,0,TAU);ctx.fill();if(hi){rrect(ctx,-0.46,0.14,0.36,0.14,0.05);ctx.fill();}}
  ctx.fillStyle=p.skin;ctx.beginPath();ctx.arc(0.05,0,hv?0.37:0.34,0,TAU);ctx.fill();
  const hs=p.hairStyle||0;
  if(hs===4){ctx.fillStyle='#1E3480';ctx.beginPath();ctx.arc(0,0,0.36,0,TAU);ctx.fill();ctx.fillStyle='#E53935';ctx.fillRect(-0.05,-0.36,0.1,0.72);ctx.fillStyle='#0F1E55';ctx.beginPath();ctx.arc(0.22,0,0.2,0,TAU);ctx.fill();}
  else if(hs===3){ctx.fillStyle=shade(p.skin,0.92);ctx.beginPath();ctx.arc(-0.1,0,0.25,0,TAU);ctx.fill();}
  else if(hs===1){ctx.fillStyle=p.hair;ctx.beginPath();ctx.ellipse(-0.22,0,0.34,0.38,0,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(-0.05,0,0.3,0,TAU);ctx.fill();}
  else if(hs===2){ctx.fillStyle=p.hair;ctx.beginPath();ctx.arc(-0.1,0,0.3,0,TAU);ctx.fill();}
  else{ctx.fillStyle=p.hair;ctx.beginPath();ctx.arc(-0.13,0,0.27,0,TAU);ctx.fill();}
  if(hi&&hs!==4){ctx.fillStyle='rgba(255,255,255,.25)';ctx.beginPath();ctx.arc(-0.12,-0.1,0.1,0,TAU);ctx.fill();}
  if(p.role==='guard'){ctx.fillStyle='#111';ctx.beginPath();ctx.arc(0,0,0.32,0,TAU);ctx.fill();}
  if(p.hat)drawHat(p.hat,hi);
  if(p.glasses&&hi){ctx.strokeStyle=p.glasses;ctx.lineWidth=0.05;ctx.beginPath();ctx.arc(0.3,-0.12,0.07,0,TAU);ctx.moveTo(0.37,0.12);ctx.arc(0.3,0.12,0.07,0,TAU);ctx.moveTo(0.3,-0.05);ctx.lineTo(0.3,0.05);ctx.stroke();}
  // Предмет в свободной руке: сезонная сумка p.bag остаётся на другой стороне.
  // LOD 0 и лежащий человек — прежнее рисование, без предметов и вспышки.
  if(LOD>0&&p.item&&!o.lying)drawPersonItem(p.item,hi,handX,handY,filming,o.time);
  ctx.restore();}
// Обычная толпа проходит прежнее рисование; подготовленный костюм есть только у сюжетных людей.
const storyPersonLooks=new WeakMap();
function drawStoryPerson(x,y,hx,hy,p,phase,o){
  o=o||{};const story=p.story,guard=story==='guard';
  let cached=storyPersonLooks.get(p);
  if(!cached||cached.story!==story){
    const look=Object.create(p),props={story:{value:null},clothes:{value:story==='charmer'?'#B73861':guard?'#20282B':story==='waiter'?'#EEE8D8':p.clothes}};
    if(guard)props.build={value:'heavy'};
    Object.defineProperties(look,props);cached={story,look};storyPersonLooks.set(p,cached);
  }
  ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(hy,hx));ctx.scale(o.scale||1,o.scale||1);
  ctx.save();
  // Руки обычного спрайта скрыты за плечами; сложенные руки добавляются поверх тела.
  if(guard){ctx.beginPath();ctx.rect(-1,-.78,2,1.56);ctx.clip();}
  drawPerson(0,0,1,0,cached.look,guard?0:phase,{...o,scale:1});ctx.restore();
  if(LOD>=2)drawStoryCostume(story,p);ctx.restore();
}
function drawStoryCostume(story,p){
  if(story==='charmer'){
    ctx.fillStyle='#D78A9E';ctx.fillRect(.23,-.49,.07,.98);
    ctx.fillStyle='#65364A';rrect(ctx,-.24,.52,.45,.31,.06);ctx.fill();
    ctx.strokeStyle='#E2C790';ctx.lineWidth=.035;ctx.beginPath();ctx.arc(-.02,.55,.14,Math.PI,TAU);ctx.stroke();
    ctx.fillStyle='#E2C790';ctx.fillRect(-.06,.63,.1,.045);
  }else if(story==='guard'){
    ctx.strokeStyle='#111C20';ctx.lineWidth=.24;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(.05,-.65);ctx.lineTo(.65,.38);ctx.moveTo(.05,.65);ctx.lineTo(.6,-.38);ctx.stroke();
    ctx.fillStyle=p.skin;ctx.beginPath();ctx.arc(.6,-.38,.12,0,TAU);ctx.arc(.65,.38,.12,0,TAU);ctx.fill();
  }else if(story==='waiter'){
    ctx.fillStyle='#273B38';ctx.fillRect(-.35,-.42,.16,.84);
    ctx.fillStyle='#FAF5E7';rrect(ctx,-.16,-.86,.45,.31,.04);ctx.fill();
    ctx.strokeStyle='#B6AA91';ctx.lineWidth=.025;ctx.beginPath();ctx.moveTo(-.1,-.63);ctx.lineTo(.24,-.63);ctx.stroke();
  }
}
let phoneFlashSprite=null;
function drawPersonItem(item,hi,handX,handY,filming,time){
  if(item==='keys'&&!hi)return;
  ctx.save();ctx.translate(handX,handY);ctx.lineJoin='round';ctx.lineCap='round';ctx.lineWidth=0.12;ctx.strokeStyle='#34413F';
  switch(item){
    case 'phone':{
      ctx.translate(0.2,-0.22);
      // Один плавный цикл за 3 секунды; при уменьшении анимации — постоянный свет.
      if(filming){if(!phoneFlashSprite){phoneFlashSprite=document.createElement('canvas');phoneFlashSprite.width=phoneFlashSprite.height=64;
          const g=phoneFlashSprite.getContext('2d'),gr=g.createRadialGradient(32,32,2,32,32,32);gr.addColorStop(0,'rgba(255,250,223,.8)');gr.addColorStop(0.35,'rgba(255,242,196,.35)');gr.addColorStop(1,'rgba(255,242,196,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);}
        const pulse=reduceMotion?0.45:0.5+0.5*Math.sin((time||0)*TAU/3),alpha=ctx.globalAlpha;
        ctx.globalAlpha=alpha*(0.35+0.45*pulse);ctx.drawImage(phoneFlashSprite,-0.7,-0.95,1.9,1.9);ctx.globalAlpha=alpha;}
      ctx.fillStyle='#24313D';ctx.strokeStyle='#E6EAE6';rrect(ctx,-0.24,-0.43,0.56,0.86,0.1);ctx.fill();ctx.stroke();
      ctx.fillStyle=filming?'#FFF5D5':'#80C8DE';ctx.fillRect(-0.12,-0.28,0.29,filming?0.22:0.52);
      if(hi){ctx.fillStyle='#10232B';ctx.beginPath();ctx.arc(0.04,-0.17,0.06,0,TAU);ctx.fill();ctx.fillStyle='#C4E5ED';ctx.fillRect(-0.09,0.27,0.23,0.04);}
      break;}
    case 'cart':{
      // Тележка перед человеком: ручка, корзина и два колеса читаются уже при z≈5,5.
      const cy=-handY;
      ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0.7,cy-0.65);ctx.lineTo(0.7,cy+0.65);ctx.lineTo(-handX,cy*2);ctx.stroke();
      ctx.fillStyle='#34413F';ctx.fillRect(1.05,cy-1.02,0.45,0.25);ctx.fillRect(1.05,cy+0.77,0.45,0.25);
      ctx.fillStyle='#B6573F';rrect(ctx,0.85,cy-0.78,1.45,1.56,0.16);ctx.fill();ctx.stroke();
      ctx.fillStyle='#E4C18B';ctx.fillRect(1.02,cy-0.6,1.08,1.2);
      if(hi){ctx.strokeStyle='#A77C4D';ctx.lineWidth=0.06;ctx.beginPath();ctx.moveTo(1.56,cy-0.6);ctx.lineTo(1.56,cy+0.6);ctx.moveTo(1.02,cy);ctx.lineTo(2.1,cy);ctx.stroke();
        ctx.fillStyle='#8A3C42';ctx.beginPath();ctx.arc(1.3,cy-0.32,0.2,0,TAU);ctx.arc(1.8,cy+0.3,0.23,0,TAU);ctx.fill();}
      break;}
    case 'guitar':
      ctx.translate(0.4,-0.27);ctx.fillStyle='#795133';ctx.fillRect(0.4,-0.13,1.35,0.26);ctx.fillRect(1.65,-0.2,0.36,0.4);
      ctx.fillStyle='#E4A656';ctx.beginPath();ctx.moveTo(-0.55,0);
      ctx.bezierCurveTo(-0.55,-0.66,0.1,-0.65,0.22,-0.34);ctx.bezierCurveTo(0.7,-0.6,0.97,-0.32,0.97,0);
      ctx.bezierCurveTo(0.97,0.32,0.7,0.6,0.22,0.34);ctx.bezierCurveTo(0.1,0.65,-0.55,0.66,-0.55,0);ctx.closePath();ctx.fill();ctx.stroke();
      if(hi){ctx.fillStyle='#493127';ctx.beginPath();ctx.arc(0.4,0,0.16,0,TAU);ctx.fill();ctx.fillRect(-0.2,-0.19,0.1,0.38);
        ctx.strokeStyle='#F7E7BA';ctx.lineWidth=0.035;ctx.beginPath();ctx.moveTo(-0.15,-0.06);ctx.lineTo(1.8,-0.06);ctx.moveTo(-0.15,0.06);ctx.lineTo(1.8,0.06);ctx.stroke();}
      break;
    case 'broom':
      ctx.strokeStyle='#735338';ctx.lineWidth=0.16;ctx.beginPath();ctx.moveTo(-0.28,0);ctx.lineTo(1.8,0);ctx.stroke();
      ctx.fillStyle='#D5AE63';ctx.strokeStyle='#735338';ctx.lineWidth=0.1;ctx.beginPath();ctx.moveTo(1.55,-0.18);ctx.lineTo(2.2,-0.55);ctx.lineTo(2.2,0.55);ctx.lineTo(1.55,0.18);ctx.closePath();ctx.fill();ctx.stroke();
      if(hi){ctx.beginPath();for(let j=-1;j<=1;j++){ctx.moveTo(1.66,j*0.1);ctx.lineTo(2.14,j*0.35);}ctx.stroke();ctx.fillStyle='#785C43';ctx.fillRect(1.55,-0.2,0.16,0.4);}
      break;
    case 'bag':
      ctx.strokeStyle='#43595B';ctx.beginPath();ctx.ellipse(0.15,-0.19,0.23,0.21,0,0,TAU);ctx.stroke();
      ctx.fillStyle='#719B95';rrect(ctx,-0.38,-0.88,1.05,0.65,0.12);ctx.fill();ctx.stroke();
      if(hi){ctx.fillStyle='#B9D3C5';ctx.fillRect(-0.24,-0.76,0.16,0.4);ctx.fillRect(0.32,-0.76,0.16,0.4);}
      break;
    case 'bottle':
      // Только непрозрачный бумажный пакет: ни горлышка, ни этикетки.
      ctx.fillStyle='#C8995D';ctx.strokeStyle='#715435';ctx.beginPath();ctx.moveTo(-0.2,0.03);ctx.lineTo(-0.31,-0.91);ctx.lineTo(0.34,-0.91);ctx.lineTo(0.26,0.03);ctx.closePath();ctx.fill();ctx.stroke();
      if(hi){ctx.fillStyle='#E6C48D';ctx.fillRect(-0.22,-0.85,0.47,0.15);ctx.strokeStyle='#AB7B47';ctx.lineWidth=0.06;ctx.beginPath();ctx.moveTo(0.13,-0.63);ctx.lineTo(0.16,-0.12);ctx.stroke();}
      break;
    case 'fishing':
      ctx.strokeStyle='#35535B';ctx.lineWidth=0.1;ctx.beginPath();ctx.moveTo(-0.25,0.06);ctx.quadraticCurveTo(1.1,-0.05,2.55,-0.65);ctx.stroke();
      if(hi){ctx.fillStyle='#A88C58';ctx.fillRect(-0.3,-0.08,0.6,0.17);ctx.fillStyle='#D8DCDC';ctx.beginPath();ctx.arc(0.25,0.16,0.16,0,TAU);ctx.fill();
        ctx.strokeStyle='#96A8A5';ctx.lineWidth=0.035;ctx.beginPath();ctx.moveTo(2.55,-0.65);ctx.quadraticCurveTo(2.8,-0.3,2.4,0.65);ctx.stroke();ctx.fillStyle='#C8583F';ctx.fillRect(2.34,0.54,0.12,0.22);}
      break;
    case 'keys':
      ctx.strokeStyle='#DAB652';ctx.lineWidth=0.09;ctx.beginPath();ctx.arc(0.16,-0.17,0.16,0,TAU);ctx.moveTo(0.31,-0.17);ctx.lineTo(0.7,-0.17);ctx.lineTo(0.7,-0.32);ctx.moveTo(0.53,-0.17);ctx.lineTo(0.53,-0.3);ctx.moveTo(0.24,-0.3);ctx.lineTo(0.54,-0.6);ctx.lineTo(0.65,-0.5);ctx.stroke();
      break;
  }
  ctx.restore();
}
// шапка сверху на голове (человек смотрит вдоль +x): вязаная, с помпоном, ушанка, тюбетейка, шляпа, кепка
function drawHat(h,hi){const c=h.c;if(h.k==='felt'){ctx.fillStyle=shade(c,0.82);ctx.beginPath();ctx.arc(0,0,0.46,0,TAU);ctx.fill();ctx.fillStyle=c;ctx.beginPath();ctx.arc(-0.02,0,0.27,0,TAU);ctx.fill();return;}
  if(h.k==='tub'){ctx.fillStyle=c;ctx.beginPath();ctx.arc(-0.06,0,0.23,0,TAU);ctx.fill();if(hi){ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=0.03;ctx.beginPath();ctx.arc(-0.06,0,0.15,0,TAU);ctx.stroke();}return;}
  if(h.k==='ush'){ctx.fillStyle=shade(c,0.8);ctx.beginPath();ctx.ellipse(0.04,-0.31,0.16,0.1,0,0,TAU);ctx.ellipse(0.04,0.31,0.16,0.1,0,0,TAU);ctx.fill();}
  ctx.fillStyle=c;ctx.beginPath();ctx.arc(-0.03,0,0.32,0,TAU);ctx.fill();
  if(h.k==='cap'){ctx.fillStyle=shade(c,0.75);ctx.beginPath();ctx.ellipse(0.3,0,0.14,0.22,0,0,TAU);ctx.fill();}
  if(hi){ctx.fillStyle='rgba(255,255,255,.18)';ctx.beginPath();ctx.arc(-0.1,-0.1,0.1,0,TAU);ctx.fill();}
  if(h.k==='pom'){ctx.fillStyle=shade(c,1.25);ctx.beginPath();ctx.arc(-0.14,0,0.11,0,TAU);ctx.fill();}}
function drawCarSprite(x,y,hx,hy,L,Wd,color,kind,t,ex){ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(hy,hx));const hi=LOD>=2;
  ctx.fillStyle='rgba(0,0,0,.25)';rrect(ctx,-L/2+0.25,-Wd/2+0.3,L,Wd,0.5);ctx.fill();
  if(hi){ctx.fillStyle='#1A1A1A';for(const sx of [-L*0.3,L*0.3]){rrect(ctx,sx-0.36,-Wd/2-0.06,0.72,0.3,0.08);ctx.fill();rrect(ctx,sx-0.36,Wd/2-0.24,0.72,0.3,0.08);ctx.fill();}}
  const body=ex&&ex.crashed?shade(color,0.72):color;ctx.fillStyle=body;rrect(ctx,-L/2,-Wd/2,L,Wd,0.45);ctx.fill();
  if(hi){ctx.fillStyle='rgba(255,255,255,.16)';rrect(ctx,-L/2+0.5,-0.32,L-1,0.64,0.3);ctx.fill();ctx.strokeStyle='rgba(0,0,0,.35)';ctx.lineWidth=0.06;rrect(ctx,-L/2,-Wd/2,L,Wd,0.45);ctx.stroke();
    ctx.strokeStyle='rgba(0,0,0,.25)';ctx.lineWidth=0.05;ctx.beginPath();ctx.moveTo(L*0.3,-Wd/2);ctx.lineTo(L*0.3,Wd/2);ctx.moveTo(-L*0.02,-Wd/2);ctx.lineTo(-L*0.02,-Wd/2+0.3);ctx.moveTo(-L*0.02,Wd/2);ctx.lineTo(-L*0.02,Wd/2-0.3);ctx.stroke();
    ctx.fillStyle=shade(color,0.8);rrect(ctx,L*0.12,-Wd/2-0.16,0.32,0.18,0.05);ctx.fill();rrect(ctx,L*0.12,Wd/2-0.02,0.32,0.18,0.05);ctx.fill();}
  ctx.fillStyle=shade(color,0.86);rrect(ctx,-L*0.18,-Wd/2+0.22,L*0.46,Wd-0.44,0.3);ctx.fill();
  ctx.fillStyle='rgba(30,40,55,.78)';rrect(ctx,L*0.27,-Wd/2+0.22,L*0.14,Wd-0.44,0.15);ctx.fill();rrect(ctx,-L*0.3,-Wd/2+0.25,L*0.1,Wd-0.5,0.1);ctx.fill();
  if(hi){ctx.fillStyle='rgba(255,255,255,.3)';ctx.beginPath();ctx.moveTo(L*0.29,-Wd/2+0.26);ctx.lineTo(L*0.38,-Wd/2+0.26);ctx.lineTo(L*0.31,Wd/2-0.3);ctx.lineTo(L*0.29,Wd/2-0.3);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(30,40,55,.6)';ctx.fillRect(-L*0.16,-Wd/2+0.08,L*0.42,0.12);ctx.fillRect(-L*0.16,Wd/2-0.2,L*0.42,0.12);
    ctx.fillStyle='#F4F4F4';ctx.fillRect(-L/2+0.08,-0.26,0.14,0.52);ctx.fillStyle='#F4F4F4';ctx.fillRect(L/2-0.22,-0.26,0.14,0.52);}
  ctx.fillStyle='#FFF6D0';ctx.fillRect(L/2-0.35,-Wd/2+0.15,0.3,0.35);ctx.fillRect(L/2-0.35,Wd/2-0.5,0.3,0.35);
  ctx.fillStyle='#E53935';ctx.fillRect(-L/2+0.05,-Wd/2+0.15,0.25,0.35);ctx.fillRect(-L/2+0.05,Wd/2-0.5,0.25,0.35);
  if(kind==='police'){ctx.fillStyle='#2D4A9E';ctx.fillRect(-L/2+0.6,-Wd/2,L-1.2,0.32);ctx.fillRect(-L/2+0.6,Wd/2-0.32,L-1.2,0.32);if(ex&&ex.flash&&!reduceMotion){const on=Math.floor(t*6)%2===0;ctx.fillStyle=on?'#2F6BFF':'#FF3B3B';ctx.fillRect(-0.35,-0.65,0.7,0.5);ctx.fillStyle=on?'#FF3B3B':'#2F6BFF';ctx.fillRect(-0.35,0.15,0.7,0.5);}else{ctx.fillStyle='#2D4A9E';ctx.fillRect(-0.35,-0.65,0.7,1.3);}}
  if(kind==='amb'){ctx.fillStyle='#D8323C';ctx.fillRect(-0.3,-0.8,0.6,1.6);ctx.fillRect(-0.9,-0.3,1.8,0.6);ctx.fillRect(-L/2+0.5,-Wd/2,L-1,0.25);ctx.fillRect(-L/2+0.5,Wd/2-0.25,L-1,0.25);if(ex&&ex.flash&&!reduceMotion){const on=Math.floor(t*6)%2===0;ctx.fillStyle=on?'#2F6BFF':'#8CB4FF';ctx.fillRect(L*0.28,-0.7,0.5,0.45);ctx.fillRect(L*0.28,0.25,0.5,0.45);}}
  if(kind==='taxi'){ctx.fillStyle='#222';for(let i=0;i<4;i++){ctx.fillRect(-L/2+0.4+i*0.9,-Wd/2,0.45,0.22);ctx.fillRect(-L/2+0.85+i*0.9,Wd/2-0.22,0.45,0.22);}ctx.fillStyle='#FFD54F';ctx.fillRect(-0.4,-0.35,0.8,0.7);}
  if(kind==='share'){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-L*0.05,0,0.38,0,TAU);ctx.fill();ctx.fillStyle=color;ctx.beginPath();ctx.arc(-L*0.05,0,0.2,0,TAU);ctx.fill();}
  if(ex&&ex.crashed){if(!reduceMotion&&Math.floor(t*2)%2===0){ctx.fillStyle='#FFB400';ctx.fillRect(L/2-0.4,-Wd/2,0.4,0.4);ctx.fillRect(L/2-0.4,Wd/2-0.4,0.4,0.4);ctx.fillRect(-L/2,-Wd/2,0.4,0.4);ctx.fillRect(-L/2,Wd/2-0.4,0.4,0.4);}ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(L/2-0.9,-Wd/2+0.2,0.6,Wd-0.4);}
  ctx.restore();}
function drawBusSprite(b){ctx.save();ctx.translate(b.x,b.y);ctx.rotate(Math.atan2(b.hy,b.hx));const L=b.len,Wd=b.wid;const hi=LOD>=2;
  ctx.fillStyle='rgba(0,0,0,.28)';rrect(ctx,-L/2+0.35,-Wd/2+0.4,L,Wd,0.5);ctx.fill();
  if(hi){ctx.fillStyle='#1A1A1A';for(const sx of [-L*0.3,L*0.32]){rrect(ctx,sx-0.45,-Wd/2-0.06,0.9,0.3,0.08);ctx.fill();rrect(ctx,sx-0.45,Wd/2-0.24,0.9,0.3,0.08);ctx.fill();}}
  ctx.fillStyle=b.color;rrect(ctx,-L/2,-Wd/2,L,Wd,0.5);ctx.fill();ctx.fillStyle=shade(b.color,1.12);rrect(ctx,-L/2+0.4,-Wd/2+0.45,L-0.8,Wd-0.9,0.3);ctx.fill();
  if(hi){ctx.fillStyle=shade(b.color,0.95);rrect(ctx,-L*0.2,-0.5,1.6,1,0.1);ctx.fill();rrect(ctx,L*0.1,-0.5,1.6,1,0.1);ctx.fill();ctx.strokeStyle='rgba(0,0,0,.35)';ctx.lineWidth=0.06;rrect(ctx,-L/2,-Wd/2,L,Wd,0.5);ctx.stroke();}
  ctx.fillStyle='rgba(30,40,55,.7)';const n=Math.floor((L-2)/1.2);for(let i=0;i<n;i++){const x=-L/2+1+i*1.2;ctx.fillRect(x,-Wd/2+0.08,0.9,0.3);ctx.fillRect(x,Wd/2-0.38,0.9,0.3);}ctx.fillRect(L/2-0.7,-Wd/2+0.25,0.5,Wd-0.5);
  if(hi){ctx.strokeStyle='rgba(255,255,255,.35)';ctx.lineWidth=0.04;for(let i=0;i<n;i++){const x=-L/2+1+i*1.2;ctx.strokeRect(x,Wd/2-0.38,0.9,0.3);ctx.strokeRect(x,-Wd/2+0.08,0.9,0.3);}
    ctx.strokeStyle='rgba(0,0,0,.45)';ctx.lineWidth=0.06;for(const dx of [L*0.3,-L*0.1,-L*0.4]){ctx.beginPath();ctx.moveTo(dx,Wd/2-0.42);ctx.lineTo(dx,Wd/2);ctx.moveTo(dx+0.7,Wd/2-0.42);ctx.lineTo(dx+0.7,Wd/2);ctx.stroke();}
    ctx.fillStyle='#FFE082';ctx.fillRect(L/2-0.72,-0.6,0.12,1.2);}
  ctx.fillStyle='#FFF6D0';ctx.fillRect(L/2-0.3,-Wd/2+0.15,0.25,0.4);ctx.fillRect(L/2-0.3,Wd/2-0.55,0.25,0.4);
  if(b.route.type==='tram'){ctx.strokeStyle='rgba(0,0,0,.5)';ctx.lineWidth=0.12;ctx.beginPath();ctx.moveTo(-1,-0.9);ctx.lineTo(1,0.9);ctx.stroke();}
  if(b.route.type==='trolleybus'){ctx.strokeStyle='rgba(0,0,0,.5)';ctx.lineWidth=0.1;ctx.beginPath();ctx.moveTo(-1,-0.4);ctx.lineTo(-4,-0.6);ctx.moveTo(-1,0.4);ctx.lineTo(-4,0.6);ctx.stroke();}
  ctx.restore();}
function drawScooter(x,y,hx,hy){ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(hy,hx));ctx.fillStyle='rgba(0,0,0,.2)';ctx.fillRect(-0.6,-0.05,1.3,0.35);
  // На обычном масштабе читается Т-образный силуэт; мелкие ручки и фонарь остаются только в LOD 2.
  if(LOD>=1){ctx.strokeStyle='#F5F0FF';ctx.lineWidth=0.65;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-0.65,0);ctx.lineTo(0.55,0);ctx.moveTo(0.55,-0.55);ctx.lineTo(0.55,0.55);ctx.stroke();}
  ctx.fillStyle='#2B2B2B';rrect(ctx,-0.65,-0.17,1.2,0.34,0.1);ctx.fill();ctx.fillStyle='#111';ctx.beginPath();ctx.arc(-0.6,0,0.17,0,TAU);ctx.arc(0.6,0,0.17,0,TAU);ctx.fill();ctx.fillStyle='#7B61FF';ctx.fillRect(-0.3,-0.12,0.6,0.24);ctx.strokeStyle='#333';ctx.lineWidth=LOD>=1?0.2:0.09;ctx.beginPath();ctx.moveTo(0.55,LOD>=1?-0.55:-0.38);ctx.lineTo(0.55,LOD>=1?0.55:0.38);ctx.stroke();if(LOD>=2){ctx.fillStyle='#444';ctx.beginPath();ctx.arc(0.55,-0.55,0.07,0,TAU);ctx.arc(0.55,0.55,0.07,0,TAU);ctx.fill();ctx.fillStyle='#FFF';ctx.fillRect(0.62,-0.06,0.08,0.12);}ctx.restore();}
function drawBicycle(x,y,hx,hy){ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(hy,hx));
  ctx.strokeStyle='#263733';ctx.lineWidth=LOD>=1?.2:.16;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-1.05,0);ctx.lineTo(-.48,0);ctx.moveTo(.48,0);ctx.lineTo(1.05,0);ctx.stroke();
  ctx.strokeStyle=LOD>=1?'#E4F3DA':'#367952';ctx.lineWidth=LOD>=1?.56:.3;ctx.beginPath();ctx.moveTo(-.75,0);ctx.lineTo(.75,0);ctx.moveTo(.65,-.5);ctx.lineTo(.65,.5);ctx.stroke();
  if(LOD>=1){ctx.strokeStyle='#367952';ctx.lineWidth=.22;ctx.beginPath();ctx.moveTo(-.75,0);ctx.lineTo(.65,0);ctx.moveTo(.65,-.5);ctx.lineTo(.65,.5);ctx.stroke();ctx.fillStyle='#27342C';ctx.fillRect(-.45,-.28,.38,.56);}
  if(LOD>=2){ctx.strokeStyle='#A2AAA0';ctx.lineWidth=.07;ctx.strokeRect(-1.05,-.12,.57,.24);ctx.strokeRect(.48,-.12,.57,.24);ctx.fillStyle='#EED788';ctx.fillRect(.83,-.1,.12,.2);}
  ctx.restore();}
function drawPlayerWorld(x,y,hx,hy,veh,persona,t,me){
  if(veh){if(veh.kind==='scooter'){drawScooter(x,y,hx,hy);drawPerson(x-hx*0.1,y-hy*0.1,hx,hy,persona,0,{moving:false,ring:me,scale:1.3});}
    else if(veh.kind==='bike'){drawBicycle(x,y,hx,hy);drawPerson(x-hx*.15,y-hy*.15,hx,hy,persona,0,{moving:false,ring:me,scale:1.15});}
    else drawCarSprite(x,y,hx,hy,veh.kind==='own'?4.6:4.5,1.9,veh.kind==='taxi'?'#F4C542':(veh.color||'#C62828'),veh.kind==='own'?'own':veh.kind==='taxi'?'taxi':'share',t,{crashed:veh.crashed});
    if(me){ctx.strokeStyle='rgba(43,176,98,.9)';ctx.lineWidth=0.25;ctx.beginPath();ctx.arc(x,y,veh.kind==='scooter'||veh.kind==='bike'?1.3:3.1,0,TAU);ctx.stroke();}return;}
  if(player.state==='hurt'&&me){drawPerson(x,y,hx,hy,persona,0,{lying:true,scale:1.5});return;}
  drawPerson(x,y,hx,hy,persona,player.phase,{moving:true,ring:me,scale:1.8});}
function labelPlayer(sx,sy,name,me,img,frame){ctx.save();ctx.font='600 12px "IBM Plex Sans",system-ui';ctx.textAlign='left';ctx.textBaseline='middle';const tw=ctx.measureText(name).width;const aw=img?22:0;const w=tw+14+aw;const x0=sx-w/2,y0=sy-26;
  ctx.fillStyle=me?'rgba(43,176,98,.95)':'rgba(20,30,26,.85)';rrect(ctx,x0,y0,w,22,8);ctx.fill();
  if(frame)drawNameFrame(frame,x0,y0,w);
  if(img){ctx.save();ctx.beginPath();ctx.arc(x0+12,y0+11,9,0,TAU);ctx.clip();ctx.drawImage(img,x0+3,y0+2,18,18);ctx.restore();}
  ctx.fillStyle=me?'#0B2B17':'#fff';ctx.fillText(name,x0+7+aw,y0+11.5);ctx.restore();
  if(me&&cam.z>=3)return {x:x0-3,y:y0-4,w:w+(frame?17:6),h:30};}
// рамка имени из вещей: обводка; «значок» — точка у имени, «снежинка» — ❄ сбоку, «гирлянда» — огоньки по верху
function drawNameFrame(f,x0,y0,w){ctx.save();if(f.k!=='pin'){ctx.strokeStyle=f.c;ctx.lineWidth=f.k==='thread'?1:2.2;rrect(ctx,x0-1.5,y0-1.5,w+3,25,9.5);ctx.stroke();}
  if(f.k==='pin'){ctx.fillStyle=f.c;ctx.beginPath();ctx.arc(x0+w+5,y0+11,4,0,TAU);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1.2;ctx.stroke();}
  if(f.k==='flake'){ctx.fillStyle=f.c;ctx.font='13px system-ui';ctx.textAlign='center';ctx.fillText('❄',x0+w+8,y0+11.5);}
  if(f.k==='garland'){const cols=['#F2C14E','#E24B6A','#2E9BD6','#6BCB77'];for(let i=0,n=Math.max(3,Math.floor(w/12));i<n;i++){ctx.fillStyle=cols[i%4];ctx.beginPath();ctx.arc(x0+6+i*(w-12)/(n-1),y0-1.5,2,0,TAU);ctx.fill();}}
  ctx.restore();}
let miniBg=null;
function renderMini(){const tn=performance.now();if(!renderMini.t||tn-renderMini.t>500){renderMini.t=tn;renderMini.vis=mini.offsetParent!==null;}if(!renderMini.vis)return;/* видимость — раз в полсекунды: offsetParent каждый кадр пересчитывал раскладку страницы */const mw=mini.width,mh=mini.height;const bb=world.bbox;const sx=mw/(bb[2]-bb[0]),sy=mh/(bb[3]-bb[1]);const s=Math.min(sx,sy);const ox=(mw-(bb[2]-bb[0])*s)/2,oy=(mh-(bb[3]-bb[1])*s)/2;
  if(!miniBg){miniBg=document.createElement('canvas');miniBg.width=mw;miniBg.height=mh;const m=miniBg.getContext('2d');m.fillStyle='#DAD5C7';m.fillRect(0,0,mw,mh);m.setTransform(s,0,0,s,ox-bb[0]*s,oy-bb[1]*s);for(const a of world.areas){if(a.k!=='water'&&a.k!=='park'&&a.k!=='forest')continue;m.fillStyle=AREA_FILL[a.k];m.beginPath();m.moveTo(a.p[0],a.p[1]);for(let i=2;i<a.p.length;i+=2)m.lineTo(a.p[i],a.p[i+1]);m.closePath();m.fill();}
    for(const w of world.walls||[]){if(w.k!=='kremlin')continue;m.strokeStyle='#C9B79A';m.lineWidth=14;m.beginPath();m.moveTo(w.p[0],w.p[1]);for(let i=2;i<w.p.length;i+=2)m.lineTo(w.p[i],w.p[i+1]);m.stroke();}
    m.lineCap='round';for(const r of world.roads){if(r.c>7)continue;m.strokeStyle=r.c<=4?'#fff':'#EFEBE2';m.lineWidth=r.c<=4?10:5;m.beginPath();const p0=world.nodes[r.p[0]];m.moveTo(p0[0],p0[1]);for(let i=1;i<r.p.length;i++){const p=world.nodes[r.p[i]];m.lineTo(p[0],p[1]);}m.stroke();}}
  mctx.setTransform(1,0,0,1,0,0);mctx.drawImage(miniBg,0,0);mctx.setTransform(s,0,0,s,ox-bb[0]*s,oy-bb[1]*s);
  for(const b of buses){mctx.fillStyle=b.color;mctx.beginPath();mctx.arc(b.x,b.y,9,0,TAU);mctx.fill();}
  for(const r of rallies){mctx.fillStyle=RALLY_KIND[r.kind].color;mctx.beginPath();mctx.arc(r.sq.x,r.sq.y,22,0,TAU);mctx.fill();}
  for(const ac of accidents){mctx.fillStyle='#DC3A44';mctx.beginPath();mctx.arc(ac.x,ac.y,16,0,TAU);mctx.fill();}
  for(const pr of peerRender.values()){mctx.fillStyle='#4A90E2';mctx.beginPath();mctx.arc(pr.x,pr.y,12,0,TAU);mctx.fill();}
  mctx.fillStyle='#2BB062';mctx.beginPath();mctx.arc(player.x,player.y,14,0,TAU);mctx.fill();mctx.strokeStyle='#fff';mctx.lineWidth=5;mctx.stroke();
  const z=cam.z;mctx.strokeStyle='rgba(20,30,26,.5)';mctx.lineWidth=4;mctx.strokeRect(cam.x-W/2/z,cam.y-H/2/z,W/z,H/z);}

// ---------- мелкий масштаб: готовая картинка города + движущиеся точки ----------
let overview=null;let OV_S=0.75;
// обзорная картинка всей карты: не больше ~9 млн точек (iOS не держит холст больше ~16 млн, а память телефона не резиновая)
function buildOverview(){const bb=world.bbox;const px=matchMedia('(pointer:coarse)').matches||(navigator.deviceMemory||8)<=4?4e6:9e6;   // на телефоне — 4 млн точек: вдвое быстрее строится и меньше памяти, чёткость дают плитки
  OV_S=Math.min(0.75,Math.sqrt(px/((bb[2]-bb[0])*(bb[3]-bb[1]))));const w=Math.ceil((bb[2]-bb[0])*OV_S),h=Math.ceil((bb[3]-bb[1])*OV_S);const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');
  g.fillStyle=GROUND;g.fillRect(0,0,w,h);g.setTransform(OV_S,0,0,OV_S,-bb[0]*OV_S,-bb[1]*OV_S);
  const pl=p=>{g.beginPath();g.moveTo(p[0],p[1]);for(let i=2;i<p.length;i+=2)g.lineTo(p[i],p[i+1]);g.closePath();};
  for(const a of world.areas){g.fillStyle=AREA_FILL[a.k]||'#ddd';pl(a.p);g.fill();}
  if(world.kremlin&&world.kremlin.hull){g.fillStyle='#ECE5D6';g.beginPath();world.kremlin.hull.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.closePath();g.fill();}
  g.lineCap='round';g.lineJoin='round';const byC=[[],[],[],[],[],[],[],[],[],[],[],[],[]];for(const r of world.roads)byC[r.c].push(r);
  const strokeC=(list,color,wd)=>{g.strokeStyle=color;g.lineWidth=wd;g.beginPath();for(const r of list){const p0=world.nodes[r.p[0]];g.moveTo(p0[0],p0[1]);for(let i=1;i<r.p.length;i++){const q=world.nodes[r.p[i]];g.lineTo(q[0],q[1]);}}g.stroke();};
  for(let c=10;c<=12;c++)strokeC(byC[c],'#D2CCBC',2.2);
  strokeC(byC[9],'#DAD3C3',9);
  for(let c=8;c>=0;c--)strokeC(byC[c],'#9C9A94',ROAD_W[c]+3.5);
  for(let c=8;c>=0;c--)strokeC(byC[c],c<=4?'#FFFFFF':'#F1EFEA',ROAD_W[c]+1.5);
  for(const b of world.buildings){g.fillStyle=b.roof;pl(b.p);g.fill();}
  g.strokeStyle='rgba(60,50,40,.35)';g.lineWidth=0.8;for(const b of world.buildings){if(b.area<300)continue;pl(b.p);g.stroke();}
  for(const w of world.walls||[]){if(w.k!=='kremlin')continue;g.strokeStyle='#FFFFFF';g.lineWidth=5;g.beginPath();g.moveTo(w.p[0],w.p[1]);for(let i=2;i<w.p.length;i+=2)g.lineTo(w.p[i],w.p[i+1]);g.stroke();}
  overview=c;}
// подгруженный кусок дорисовываем на обзорную картинку (выгруженные остаются на ней — как память о виденном)
function overviewAddPart(rec){
  if(rec.key&&typeof chunkSize==='function'){const C=chunkSize();const [cx,cy]=rec.key.split('_').map(Number);ovtDrop(cx*C-60,cy*C-60,(cx+1)*C+60,(cy+1)*C+60);}
  if(!overview)return;const g=overview.getContext('2d');const bb=world.bbox;g.setTransform(OV_S,0,0,OV_S,-bb[0]*OV_S,-bb[1]*OV_S);
  const pl=p=>{g.beginPath();g.moveTo(p[0],p[1]);for(let i=2;i<p.length;i+=2)g.lineTo(p[i],p[i+1]);g.closePath();};
  for(const a of rec.areas){g.fillStyle=AREA_FILL[a.k]||'#ddd';pl(a.p);g.fill();}
  g.lineCap='round';g.lineJoin='round';g.strokeStyle='#D2CCBC';g.lineWidth=2.2;g.beginPath();for(const r of rec.roads){if(r.c<10)continue;const p0=world.nodes[r.p[0]];g.moveTo(p0[0],p0[1]);for(let i=1;i<r.p.length;i++){const q=world.nodes[r.p[i]];g.lineTo(q[0],q[1]);}}g.stroke();
  for(const r of rec.roads){if(r.c!==8)continue;g.strokeStyle='#9C9A94';g.lineWidth=ROAD_W[8]+3.5;g.beginPath();const p0=world.nodes[r.p[0]];g.moveTo(p0[0],p0[1]);for(let i=1;i<r.p.length;i++){const q=world.nodes[r.p[i]];g.lineTo(q[0],q[1]);}g.stroke();g.strokeStyle='#F1EFEA';g.lineWidth=ROAD_W[8]+1.5;g.stroke();}
  for(const b of rec.buildings){g.fillStyle=b.roof;pl(b.p);g.fill();}
  g.strokeStyle='rgba(60,50,40,.35)';g.lineWidth=0.8;for(const b of rec.buildings){if(b.area<300)continue;pl(b.p);g.stroke();}}
// ---------- обзор плитками: чётко на любом отдалении ----------
// Одна картинка на всю Казань — около 0,1 точки на метр (больше не влезает в память телефона), на среднем масштабе она мутная.
// Поверх неё — плитки 512×512 в разрешении текущего масштаба из тех же данных: не больше ~8 мс рисования за кадр, готовые хранятся,
// подгруженный квартал стирает плитки на своём месте — они перерисуются уже с домами. Пока плитки нет, видна общая картинка.
const OVT={px:512,tiles:new Map(),max:32};
function ovtScale(z){const r=z*DPR/OV_S;if(r<1.3)return 0;return Math.min(1.6,OV_S*Math.pow(2,Math.ceil(Math.log2(r))));}
function ovtDraw(s,tx,ty){const T=OVT.px/s,x0=tx*T,y0=ty*T,x1=x0+T,y1=y0+T;const c=document.createElement('canvas');c.width=c.height=OVT.px;const g=c.getContext('2d');
  g.fillStyle=GROUND;g.fillRect(0,0,OVT.px,OVT.px);g.setTransform(s,0,0,s,-x0*s,-y0*s);
  const pl=p=>{g.beginPath();g.moveTo(p[0],p[1]);for(let i=2;i<p.length;i+=2)g.lineTo(p[i],p[i+1]);g.closePath();};
  const hit=bb=>bb[2]>=x0&&bb[0]<=x1&&bb[3]>=y0&&bb[1]<=y1;
  for(const a of world.areas){if(!hit(a.bb))continue;g.fillStyle=AREA_FILL[a.k]||'#ddd';pl(a.p);g.fill();}
  if(world.kremlin&&world.kremlin.hull){g.fillStyle='#ECE5D6';g.beginPath();world.kremlin.hull.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.closePath();g.fill();}
  g.lineCap='round';g.lineJoin='round';const byC=[[],[],[],[],[],[],[],[],[],[],[],[],[]];roadsIn(x0,y0,x1,y1,r=>byC[r.c].push(r));
  const strokeC=(list,color,wd)=>{if(!list.length)return;g.strokeStyle=color;g.lineWidth=wd;g.beginPath();for(const r of list){const p0=world.nodes[r.p[0]];g.moveTo(p0[0],p0[1]);for(let i=1;i<r.p.length;i++){const q=world.nodes[r.p[i]];g.lineTo(q[0],q[1]);}}g.stroke();};
  for(let k=10;k<=12;k++)strokeC(byC[k],'#D2CCBC',2.2);
  strokeC(byC[9],'#DAD3C3',9);
  for(let k=8;k>=0;k--)strokeC(byC[k],'#9C9A94',ROAD_W[k]+3.5);
  for(let k=8;k>=0;k--)strokeC(byC[k],k<=4?'#FFFFFF':'#F1EFEA',ROAD_W[k]+1.5);
  const bs=[];world.bgrid.query(x0,y0,x1,y1,b=>{bs.push(b);});
  for(const b of bs){g.fillStyle=b.roof;pl(b.p);g.fill();}
  g.strokeStyle='rgba(60,50,40,.35)';g.lineWidth=0.8;for(const b of bs){if(b.area<300)continue;pl(b.p);g.stroke();}
  for(const w of world.walls||[]){if(w.k!=='kremlin'||!hit(w.bb))continue;g.strokeStyle='#FFFFFF';g.lineWidth=5;g.beginPath();g.moveTo(w.p[0],w.p[1]);for(let i=2;i<w.p.length;i+=2)g.lineTo(w.p[i],w.p[i+1]);g.stroke();}
  return c;}
function ovtRender(z,vx0,vy0,vx1,vy1){const s=ovtScale(z);if(!s)return;const T=OVT.px/s,o=0.6/z;
  // хранить вдвое больше, чем видно (большой экран), и считать время только на рисование новых плиток — хотя бы одна за кадр
  const tx0=Math.floor(vx0/T),tx1=Math.floor(vx1/T),ty0=Math.floor(vy0/T),ty1=Math.floor(vy1/T);OVT.max=Math.max(32,2*(tx1-tx0+1)*(ty1-ty0+1));let spent=0,drew=0;
  for(let tx=tx0;tx<=tx1;tx++)for(let ty=ty0;ty<=ty1;ty++){const k=s+':'+tx+':'+ty;let c=OVT.tiles.get(k);
    if(c){OVT.tiles.delete(k);OVT.tiles.set(k,c);}
    else{if(drew&&spent>8)continue;const t1=performance.now();c=ovtDraw(s,tx,ty);spent+=performance.now()-t1;drew++;OVT.tiles.set(k,c);if(OVT.tiles.size>OVT.max)OVT.tiles.delete(OVT.tiles.keys().next().value);}
    ctx.drawImage(c,tx*T,ty*T,T+o,T+o);}}
function ovtDrop(x0,y0,x1,y1){for(const k of [...OVT.tiles.keys()]){const [s,tx,ty]=k.split(':').map(Number);const T=OVT.px/s;if(tx*T<=x1&&(tx+1)*T>=x0&&ty*T<=y1&&(ty+1)*T>=y0)OVT.tiles.delete(k);}}
function renderOverview(z,t,toS,vx0,vy0,vx1,vy1,night){if(!overview)buildOverview();const bb=world.bbox;
  ctx.imageSmoothingEnabled=true;ctx.drawImage(overview,bb[0],bb[1],bb[2]-bb[0],bb[3]-bb[1]);ovtRender(z,vx0,vy0,vx1,vy1);
  if(night>0.02){ctx.setTransform(DPR,0,0,DPR,0,0);ctx.globalCompositeOperation='multiply';ctx.fillStyle=`rgba(${Math.round(255-175*night)},${Math.round(255-160*night)},${Math.round(255-95*night)},1)`;ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation='source-over';}
  ctx.setTransform(DPR,0,0,DPR,0,0);
  const dot=(x,y,r,c)=>{const [sx,sy]=toS(x,y);if(sx<-5||sx>W+5||sy<-5||sy>H+5)return;ctx.fillStyle=c;ctx.beginPath();ctx.arc(sx,sy,r,0,TAU);ctx.fill();};
  if(z>0.4)for(const w of walkers){if(w.bus||w.inside)continue;dot(w.x,w.y,1.2,w.p.clothes);}
  for(const c of cars)dot(c.x,c.y,1.8,c.kind==='police'?'#2D4A9E':c.kind==='amb'?'#D8323C':c.color);
  ctx.font='700 9px "JetBrains Mono",monospace';ctx.textAlign='center';ctx.textBaseline='middle';
  for(const b of buses){const [sx,sy]=toS(b.x,b.y);if(sx<-10||sx>W+10||sy<-10||sy>H+10)continue;ctx.fillStyle=b.color;rrect(ctx,sx-9,sy-6,18,12,3);ctx.fill();ctx.fillStyle='#fff';ctx.fillText(b.route.ref,sx,sy+0.5);}
  for(const pr of peerRender.values()){const [sx,sy]=toS(pr.x,pr.y);ctx.fillStyle='#4A90E2';ctx.beginPath();ctx.arc(sx,sy,6,0,TAU);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();}
  if(companion&&!companion.w.inside)dot(companion.w.x,companion.w.y,4,'#2BB062');
  {const [sx,sy]=toS(player.x,player.y);ctx.fillStyle='#2BB062';ctx.beginPath();ctx.arc(sx,sy,7,0,TAU);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2.5;ctx.stroke();}
  if(typeof routeOverlay==='function')routeOverlay(toS);
  drawRallyLabels(toS,z);drawCompanionMark(toS,z);drawSituations(toS,z);
  ctx.font='700 11px "IBM Plex Sans",system-ui';ctx.textAlign='center';for(const ac of accidents){if(ac.medical)continue;const [sx,sy]=toS(ac.x,ac.y);ctx.fillStyle='rgba(220,58,68,.95)';rrect(ctx,sx-22,sy-26,44,18,5);ctx.fill();ctx.fillStyle='#fff';ctx.fillText('ДТП',sx,sy-17);}
  {const [sx,sy]=toS(player.x,player.y);labelPlayer(sx,sy-10,player.name,true,player.avatarImg,myLook().frame);}
  renderMini();}
