// ===== Кремль, площади, сборы, митинги, концерты =====
const rallies=[];let rallyTimer=rnd(150,280);
const RALLY_KIND={rally:{word:'Митинг',icon:'📢',color:'#8E44AD',size:[45,70],dur:200},meet:{word:'Сбор',icon:'🙋',color:'#2F6DB5',size:[20,35],dur:150},concert:{word:'Концерт',icon:'🎵',color:'#E07B39',size:[70,100],dur:260}};
const NPC_RALLIES=[['rally','Сохраним старую Казань'],['rally','За чистый Булак'],['rally','Больше велодорожек в центре'],['rally','Против точечной застройки'],['rally','За парк вместо парковки'],['meet','Субботник: убираем площадь'],['meet','Встреча клуба любителей татарской кухни'],['meet','Флешмоб: танцуем на площади'],['meet','Сбор волонтёров'],['concert','Уличный концерт: казанские группы'],['concert','Джаз под открытым небом'],['concert','Вечер татарской эстрады']];
const CHANTS={rally:['Мы за!','Да!','Слышите нас?','Вместе!','Казань — наш дом!'],meet:['Привет всем!','О, и ты тут!','Начинаем?','Классно собрались','Фоткаемся!'],concert:['Ура!','Браво!','Ещё!','Огонь!','🎶']};
const SIGN_COLORS=['#FFFFFF','#FFF3C4','#D7ECFF','#FFD9D9','#E3F7D4'];

function initLandmarks(d){
  world.squares=(d.squares||[]).map((s,i)=>{const o={i,n:s.n,x:s.x/10,y:s.y/10,a:s.a,r:Math.min(60,Math.sqrt(s.a/Math.PI)),poly:null};
    for(const a of world.areas){if(a.k!=='plaza')continue;if(o.x<a.bb[0]||o.x>a.bb[2]||o.y<a.bb[1]||o.y>a.bb[3])continue;if(pointInPoly(a.p,o.x,o.y)){o.poly=a.p;break;}}return o;});
  world.walls=(d.walls||[]).map(w=>{const p=new Float32Array(w.p.length);let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(let k=0;k<w.p.length;k+=2){p[k]=w.p[k]/10;p[k+1]=w.p[k+1]/10;x0=Math.min(x0,p[k]);x1=Math.max(x1,p[k]);y0=Math.min(y0,p[k+1]);y1=Math.max(y1,p[k+1]);}return {k:w.k,p,bb:[x0,y0,x1,y1]};});
  const kw=world.walls.filter(w=>w.k==='kremlin');
  if(kw.length){let sx=0,sy=0,n=0;const pts=[];for(const w of kw)for(let k=0;k<w.p.length;k+=2){sx+=w.p[k];sy+=w.p[k+1];n++;pts.push([w.p[k],w.p[k+1]]);}world.kremlin={x:sx/n,y:sy/n};
    for(const b of world.buildings){if(b.spire&&dist(b.cx,b.cy,sx/n,sy/n)<420){for(let k=0;k<b.p.length;k+=2)pts.push([b.p[k],b.p[k+1]]);}}
    world.kremlin.hull=convexHull(pts);
    // ворота: где пешеходные дорожки пересекают стену
    world.gates=[];for(const w of kw){for(let k=0;k<w.p.length-2;k+=2){const ax=w.p[k],ay=w.p[k+1],bx=w.p[k+2],by=w.p[k+3];
      for(const r of world.roads){if(r.bb[2]<Math.min(ax,bx)||r.bb[0]>Math.max(ax,bx)||r.bb[3]<Math.min(ay,by)||r.bb[1]>Math.max(ay,by))continue;
        for(let i=0;i<r.p.length-1;i++){const c=world.nodes[r.p[i]],e=world.nodes[r.p[i+1]];const X=segX(ax,ay,bx,by,c[0],c[1],e[0],e[1]);if(X)world.gates.push(X);}}}}}
  else{world.kremlin=null;world.gates=[];}
}
function convexHull(P){P=P.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);const lo=[],up=[];for(const p of P){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p);}for(let i=P.length-1;i>=0;i--){const p=P[i];while(up.length>=2&&cr(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p);}up.pop();lo.pop();return lo.concat(up);}
function segX(ax,ay,bx,by,cx,cy,dx,dy){const d=(bx-ax)*(dy-cy)-(by-ay)*(dx-cx);if(Math.abs(d)<1e-9)return null;const t=((cx-ax)*(dy-cy)-(cy-ay)*(dx-cx))/d,u=((cx-ax)*(by-ay)-(cy-ay)*(bx-ax))/d;if(t<0||t>1||u<0||u>1)return null;return [ax+(bx-ax)*t,ay+(by-ay)*t];}
// Стены Кремля непроходимы, кроме ворот
function wallBlocks(x0,y0,x1,y1){if(!world.walls)return false;
  for(const w of world.walls){if(w.k!=='kremlin')continue;if(Math.max(x0,x1)<w.bb[0]-1||Math.min(x0,x1)>w.bb[2]+1||Math.max(y0,y1)<w.bb[1]-1||Math.min(y0,y1)>w.bb[3]+1)continue;
    for(let k=0;k<w.p.length-2;k+=2){const ax=w.p[k],ay=w.p[k+1],bx=w.p[k+2],by=w.p[k+3];
      // отодвигаем конечную точку на 0.6 м вперёд, чтобы не прилипать к стене
      const L=Math.hypot(x1-x0,y1-y0)||1;const X=segX(ax,ay,bx,by,x0,y0,x1+(x1-x0)/L*0.6,y1+(y1-y0)/L*0.6);if(!X)continue;
      if(world.gates.some(g=>dist(g[0],g[1],X[0],X[1])<4.5))continue;return true;}}return false;}

function squareAt(x,y){for(const s of world.squares){if(s.poly?pointInPoly(s.poly,x,y):dist(s.x,s.y,x,y)<s.r)return s;}return null;}
function nearSquare(x,y,R){let best=null,bd=R;for(const s of world.squares){const d=dist(s.x,s.y,x,y)-(s.r*0.6);if(d<bd){bd=d;best=s;}}return best||squareAt(x,y);}
function rallyAt(s){return rallies.find(r=>r.sq===s&&!r.ending);}

function slotFor(r,i){const sq=r.sq;const off=r.kind==='concert'?7:3.2;
  for(let k=0;k<30;k++){const j=i+k*0.37;const rr=off+Math.sqrt(j)*1.25;const an=j*2.39996+(r.kind==='concert'?Math.PI/2:0);
    let x=sq.x+Math.cos(an)*rr,y=sq.y+Math.sin(an)*rr*(r.kind==='concert'?0.6:1)+(r.kind==='concert'?rr*0.5:0);
    if(sq.poly&&!pointInPoly(sq.poly,x,y))continue;if(inBuilding(x,y))continue;return [x+rnd(-0.3,0.3),y+rnd(-0.3,0.3)];}
  const an=rnd(0,TAU),rr=off+rnd(0,8);return [sq.x+Math.cos(an)*rr,sq.y+Math.sin(an)*rr];}

function startRally(sq,kind,title,by){if(rallyAt(sq))return null;const K=RALLY_KIND[kind];
  const r={sq,kind,title:String(title||K.word).slice(0,60),by,t:0,dur:K.dur,target:Math.round(rnd(K.size[0],K.size[1])),joined:0,people:[],police:[],ending:false,recruitT:0,x:sq.x,y:sq.y};rallies.push(r);
  addEvent(`${K.icon} ${K.word} · ${sq.n}: «${r.title}»${by==='player'?' — вы организатор':''}`,'rally');
  // полиция встаёт по периметру
  const pn=kind==='concert'?3:kind==='rally'?4:2;for(let i=0;i<pn;i++){const an=i/pn*TAU+0.4;const rr=Math.min(sq.r,18)+4;const x=sq.x+Math.cos(an)*rr,y=sq.y+Math.sin(an)*rr;const n=nearestNode(x,y,world.pedAdj,120);if(n<0)continue;
    const w=new Walker('police',nodeNear(world.pedNodes,[x,y],160));w.temp=true;walkers.push(w);r.police.push(w);sendTo(w,r,[x,y],true);}
  return r;}
function sendTo(w,r,slot,isPolice){const n=nearestNode(slot[0],slot[1],world.pedAdj,140);if(n<0)return;w.rally=r;w.rallySlot=slot;w.goalPoi=null;w.goalStop=null;w.waitStop=null;
  if(dist(w.x,w.y,slot[0],slot[1])<6){w.x=slot[0];w.y=slot[1];w.state='rally';return;}
  w.state='routing';requestPath(w,world.pedAdj,w.node,n,pedCost,path=>{if(w.state!=='routing'||w.rally!==r)return;if(!path||path.length<2){w.x=slot[0];w.y=slot[1];w.state='rally';return;}w.path=path;w.seg=0;w.t=0;w.state='walk';});
  if(!isPolice){r.people.push(w);if(Math.random()<(r.kind==='rally'?0.55:r.kind==='meet'?0.2:0.05))w.sign=pick(SIGN_COLORS);}}
function recruit(r,n){const sq=r.sq;const cand=[];for(const w of walkers){if(w.rally||w.bus||w.role!=='resident'||w===chatNpc||w.companion)continue;if(w.state!=='walk'&&w.state!=='idle'&&w.state!=='wait')continue;const d=dist(w.x,w.y,sq.x,sq.y);if(d<160)cand.push([d,w]);}
  cand.sort((a,b)=>a[0]-b[0]);let added=0;
  for(const [,w] of cand){if(added>=Math.ceil(n/2))break;sendTo(w,r,slotFor(r,r.joined++));w.spd=Math.max(w.spd,3.2);added++;}
  while(added<n&&walkers.length<620){const R0=Math.max(30,sq.r*0.9)+10;let node=nodeNear(world.pedNodes,[sq.x,sq.y],R0+30);for(let k=0;k<6&&dist(world.nodes[node][0],world.nodes[node][1],sq.x,sq.y)<R0-5;k++)node=nodeNear(world.pedNodes,[sq.x,sq.y],R0+30);const w=new Walker('resident',node);w.spd=rnd(3,3.6);w.temp=true;walkers.push(w);sendTo(w,r,slotFor(r,r.joined++));added++;}}
function endRally(r,silent){r.ending=true;if(!silent){const K=RALLY_KIND[r.kind];addEvent(`${K.word} «${r.title}» (${r.sq.n}) закончился. Пришло ${r.people.length} человек`,'rally');}
  for(const w of r.people.concat(r.police)){w.rally=null;w.rallySlot=null;w.sign=null;w.say=null;if(w.state==='rally'||w.state==='routing'||w.state==='walk'||w.state==='approach'){w.path=null;w.node=nearestNode(w.x,w.y,world.pedAdj,120);if(w.node<0)w.node=pick(world.pedNodes);w.state='idle';w.ttl=rnd(0.5,8);}}
  rallies.splice(rallies.indexOf(r),1);
  if(player.rally===r)player.rally=null;}
function updateRallies(dt){
  for(const r of rallies.slice()){r.t+=dt;r.recruitT-=dt;
    if(r.recruitT<=0&&r.joined<r.target&&r.t<r.dur*0.7){r.recruitT=1.2;recruit(r,Math.min(4,r.target-r.joined));}
    for(const w of r.people){if(w.state==='rally'&&!w.say&&Math.random()<dt*(r.kind==='concert'?0.06:0.03))w.say={t:pick(CHANTS[r.kind]),ttl:2.5};if(w.say){w.say.ttl-=dt;if(w.say.ttl<=0)w.say=null;}}
    if(r.by==='peer'&&r.seen&&performance.now()-r.seen>8000)endRally(r,true);
    else if(r.t>=r.dur&&r.by!=='player')endRally(r);
    else if(r.by==='player'&&r.t>=r.dur*1.6)endRally(r);}
  // временные жители, которые далеко от игрока и ничем не заняты, уходят
  if(Math.random()<dt*0.5){for(let i=walkers.length-1;i>=0;i--){const w=walkers[i];if(w.temp&&!w.rally&&!w.companion&&w!==chatNpc&&dist(w.x,w.y,player.x,player.y)>450){walkers.splice(i,1);}}}
  rallyTimer-=dt;if(rallyTimer<=0){rallyTimer=rnd(260,480);if(rallies.filter(r=>r.by==='npc').length<1&&world.squares.length){const near=world.squares.filter(s=>dist(s.x,s.y,player.x,player.y)<1100&&!rallyAt(s));const sq=near.length?pick(near):null;if(sq){const [k,t]=pick(NPC_RALLIES);startRally(sq,k,t,'npc');}}}}
// стоящие на площади смотрят на центр
function rallyFace(w){const r=w.rally;if(!r)return;const dx=r.sq.x-w.x,dy=r.sq.y-w.y;const L=Math.hypot(dx,dy)||1;
  if(r.kind==='concert'){w.hx=0;w.hy=-1;}else{w.hx=dx/L;w.hy=dy/L;}}

// ---------- действия игрока ----------
function rallyAction(){if(!world.squares||player.vehicle||player.bus)return null;const sq=nearSquare(player.x,player.y,25);if(!sq)return null;const r=rallyAt(sq);
  if(r){if(dist(player.x,player.y,sq.x,sq.y)<Math.max(10,sq.r*0.6))return {label:r.kind==='concert'?`Слушать концерт «${r.title}»`:`Выступить перед людьми: «${r.title}»`,run:()=>r.kind==='concert'?enjoyConcert(r):openSpeech(r)};
    return null;}
  return {label:`Собрать людей здесь · ${sq.n}`,run:()=>openRallyModal(sq)};}
function enjoyConcert(r){player.mood=clamp(player.mood+10,0,100);clock.minutes+=30;addEvent(`Вы послушали «${r.title}». Настроение +10`);}
let rallySq=null;
function openRallyModal(sq){rallySq=sq;$('#rallyWhere').textContent=sq.n;$('#rallyTitle').value='';document.querySelectorAll('#rallyKind button').forEach(b=>b.classList.toggle('on',b.dataset.k==='rally'));$('#rallyModal').hidden=false;player.busy=true;setTimeout(()=>$('#rallyTitle').focus(),50);}
function closeRallyModal(){$('#rallyModal').hidden=true;player.busy=false;}
document.querySelectorAll('#rallyKind button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('#rallyKind button').forEach(q=>q.classList.remove('on'));b.classList.add('on');}));
$('#rallyCancel').addEventListener('click',closeRallyModal);
$('#rallyGo').addEventListener('click',()=>{const k=(document.querySelector('#rallyKind button.on')||{}).dataset?.k||'rally';const t=modClean($('#rallyTitle').value.trim()).slice(0,60)||RALLY_KIND[k].word+' на площади';closeRallyModal();const r=startRally(rallySq,k,t,'player');if(r){player.rally=r;setHint('Люди подтягиваются. Встаньте в центр и нажмите E — выступить');}});
$('#rallyTitle').addEventListener('keydown',e=>{if(e.key==='Enter')$('#rallyGo').click();});
let speechRally=null;
function openSpeech(r){speechRally=r;$('#speechTitle').textContent=`${RALLY_KIND[r.kind].icon} «${r.title}» · ${r.people.filter(w=>w.state==='rally').length} человек слушают`;$('#speechText').value='';$('#speechLog').innerHTML='';$('#speechModal').hidden=false;player.busy=true;setTimeout(()=>$('#speechText').focus(),50);}
function closeSpeech(){$('#speechModal').hidden=true;player.busy=false;speechRally=null;}
$('#speechClose').addEventListener('click',closeSpeech);
$('#speechSay').addEventListener('click',sayToCrowd);$('#speechText').addEventListener('keydown',e=>{if(e.key==='Enter')sayToCrowd();});
let speechBusy=false;
async function sayToCrowd(){const r=speechRally;const txt=modClean($('#speechText').value.trim());if(!r||!txt||speechBusy)return;speechBusy=true;$('#speechText').value='';
  const log=$('#speechLog');const me=document.createElement('div');me.className='m me';me.textContent=txt;log.append(me);
  const crowd=r.people.filter(w=>w.state==='rally');let lines=null;
  if(sampleFn&&crowd.length){const sample=crowd.slice(0,4).map(w=>`${w.p.name}, ${w.p.age}, ${w.p.job}, характер: ${w.p.trait}`).join('\n');
    try{const res=await sampleFn.json(`Городская игра про Казань. На «${r.sq.n}» идёт ${RALLY_KIND[r.kind].word.toLowerCase()} «${r.title}». Организатор ${player.name} говорит в микрофон: «${txt}».\nВ толпе:\n${sample}\nВерни JSON-массив из 4 коротких реплик (до 8 слов) этих людей в ответ — живые, разные, можно несогласие и татарские словечки. Формат: [{"name":"…","text":"…"}]`,{modelTier:'quick',cache:false});
      if(Array.isArray(res))lines=res.filter(x=>x&&x.text).slice(0,4).map(x=>({name:String(x.name||'').slice(0,20),text:String(x.text).slice(0,80)}));}catch(e){if(e&&e.code==='not_granted')sampleFn=null;}}
  if(!lines)lines=crowd.slice(0,3).map(w=>({name:w.p.name,text:pick(['Правильно говоришь!','Поддерживаю!','А конкретнее?','Ура!','Дело говорит','Рәхмәт!','Ну не знаю…'])}));
  for(const l of lines){const w=crowd.find(q=>q.p.name===l.name)||pick(crowd);if(w)w.say={t:l.text,ttl:5};const d=document.createElement('div');d.className='m npc';d.textContent=(l.name?l.name+': ':'')+l.text;log.append(d);}
  log.scrollTop=log.scrollHeight;for(const w of crowd)if(Math.random()<0.4&&!w.say)w.say={t:pick(['Да!','👏','Верно!','Ура!']),ttl:2};
  player.mood=clamp(player.mood+6,0,100);addEvent(`Вы выступили (${r.sq.n}): «${txt.slice(0,50)}»`,'rally');speechBusy=false;}

// ---------- отрисовка ----------
function drawWalls(z,vx0,vy0,vx1,vy1){if(!world.walls)return;
  for(const w of world.walls){if(w.bb[2]<vx0||w.bb[0]>vx1||w.bb[3]<vy0||w.bb[1]>vy1)continue;const p=w.p;
    if(w.k!=='kremlin'){if(z<1.6)continue;ctx.strokeStyle='#B8AE9C';ctx.lineWidth=0.5;ctx.beginPath();ctx.moveTo(p[0],p[1]);for(let i=2;i<p.length;i+=2)ctx.lineTo(p[i],p[i+1]);ctx.stroke();continue;}
    const h=9*K_H,ex=EXT[0]*h,ey=EXT[1]*h;
    ctx.strokeStyle='rgba(50,40,25,.25)';ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(p[0]+0.4*h,p[1]+0.3*h);for(let i=2;i<p.length;i+=2)ctx.lineTo(p[i]+0.4*h,p[i+1]+0.3*h);ctx.stroke();
    ctx.fillStyle='#CFC4B0';for(let i=0;i<p.length-2;i+=2){ctx.beginPath();ctx.moveTo(p[i],p[i+1]);ctx.lineTo(p[i+2],p[i+3]);ctx.lineTo(p[i+2]+ex,p[i+3]+ey);ctx.lineTo(p[i]+ex,p[i+1]+ey);ctx.closePath();ctx.fill();}
    ctx.lineCap='butt';ctx.beginPath();ctx.moveTo(p[0]+ex,p[1]+ey);for(let i=2;i<p.length;i+=2)ctx.lineTo(p[i]+ex,p[i+1]+ey);ctx.strokeStyle='#9E927C';ctx.lineWidth=3.0;ctx.stroke();ctx.strokeStyle='#FFFFFF';ctx.lineWidth=2.4;ctx.stroke();
    if(z>2.5){ctx.strokeStyle='#D8CFBE';ctx.lineWidth=0.8;ctx.setLineDash([0.7,0.7]);ctx.stroke();ctx.setLineDash([]);}
    ctx.lineCap='round';}}
function drawKremlinGround(vx0,vy0,vx1,vy1){const k=world.kremlin;if(!k||!k.hull||k.hull.length<3)return;ctx.fillStyle='#ECE5D6';ctx.beginPath();ctx.moveTo(k.hull[0][0],k.hull[0][1]);for(const p of k.hull)ctx.lineTo(p[0],p[1]);ctx.closePath();ctx.fill();}
function drawLandmarks(bvis,z){const ex0=EXT[0],ey0=EXT[1];
  for(const b of bvis){if(!b.dome&&!b.minarets&&!b.spire)continue;const ex=ex0*b.hm,ey=ey0*b.hm;const cx=b.cx+ex,cy=b.cy+ey;
    if(b.dome){const rr=clamp(Math.sqrt(b.area)*0.2,1.2,9);ctx.fillStyle='rgba(0,0,0,.15)';ctx.beginPath();ctx.arc(cx+rr*0.25,cy+rr*0.2,rr,0,TAU);ctx.fill();ctx.fillStyle=b.dome;ctx.beginPath();ctx.arc(cx,cy,rr,0,TAU);ctx.fill();ctx.fillStyle='rgba(255,255,255,.35)';ctx.beginPath();ctx.arc(cx-rr*0.32,cy-rr*0.32,rr*0.45,0,TAU);ctx.fill();ctx.strokeStyle='rgba(0,0,0,.25)';ctx.lineWidth=0.2;ctx.beginPath();ctx.arc(cx,cy,rr,0,TAU);ctx.stroke();ctx.fillStyle='#E8C25A';ctx.beginPath();ctx.arc(cx,cy,Math.max(0.35,rr*0.12),0,TAU);ctx.fill();}
    if(b.spire){const rr=clamp(Math.sqrt(b.area)*0.32,1,5);const ax=cx+ex0*rr*1.6,ay=cy+ey0*rr*1.6;ctx.fillStyle=b.spire;ctx.beginPath();ctx.moveTo(cx-rr,cy);ctx.lineTo(ax,ay);ctx.lineTo(cx+rr,cy);ctx.lineTo(cx+rr*0.2,cy+rr*0.9);ctx.closePath();ctx.fill();ctx.fillStyle=shade(b.spire,1.25);ctx.beginPath();ctx.moveTo(cx-rr,cy);ctx.lineTo(ax,ay);ctx.lineTo(cx-rr*0.1,cy+rr*0.8);ctx.closePath();ctx.fill();ctx.fillStyle='#E8C25A';ctx.beginPath();ctx.arc(ax,ay,0.4,0,TAU);ctx.fill();}
    if(b.minarets){const p=b.p;const pts=[];const dirs=b.minarets===4?[[1,1],[1,-1],[-1,1],[-1,-1]]:[[1,-1]];for(const d of dirs){let bi=0,bv=-1e9;for(let i=0;i<p.length;i+=2){const v=p[i]*d[0]+p[i+1]*d[1];if(v>bv){bv=v;bi=i;}}pts.push([p[bi],p[bi+1]]);}
      const mh=(b.minarets===4?57:28)*K_H,mx=ex0*mh,my=ey0*mh;for(const q of pts){ctx.strokeStyle='rgba(0,0,0,.18)';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(q[0],q[1]);ctx.lineTo(q[0]+0.4*mh,q[1]+0.3*mh);ctx.stroke();ctx.lineCap='round';ctx.strokeStyle='#E9E6DD';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(q[0],q[1]);ctx.lineTo(q[0]+mx,q[1]+my);ctx.stroke();ctx.strokeStyle='#FFFFFF';ctx.lineWidth=0.8;ctx.stroke();
        ctx.fillStyle=b.dome||'#2B9CB4';ctx.beginPath();ctx.arc(q[0]+mx,q[1]+my,0.95,0,TAU);ctx.fill();ctx.fillStyle='#E8C25A';ctx.beginPath();ctx.arc(q[0]+mx*1.03,q[1]+my*1.03,0.3,0,TAU);ctx.fill();}}}}
function drawRallyWorld(z,t){for(const r of rallies){const sq=r.sq;
  if(r.kind==='concert'){ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(sq.x-6+0.6,sq.y-4+0.6,12,4.5);ctx.fillStyle='#2B2B2B';ctx.fillRect(sq.x-6,sq.y-4,12,4.5);ctx.fillStyle='#E07B39';ctx.fillRect(sq.x-6,sq.y-4,12,0.6);
    if(!reduceMotion){for(let i=0;i<4;i++){ctx.fillStyle=`hsla(${(t*80+i*90)%360},90%,60%,.35)`;ctx.beginPath();ctx.moveTo(sq.x-4.5+i*3,sq.y-3.4);ctx.lineTo(sq.x-7+i*3+Math.sin(t*2+i)*3,sq.y+9);ctx.lineTo(sq.x-2+i*3+Math.sin(t*2+i)*3,sq.y+9);ctx.closePath();ctx.fill();}}}
  else{ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.arc(sq.x+0.3,sq.y+0.3,1.6,0,TAU);ctx.fill();ctx.fillStyle=RALLY_KIND[r.kind].color;ctx.beginPath();ctx.arc(sq.x,sq.y,1.6,0,TAU);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(sq.x,sq.y,0.6,0,TAU);ctx.fill();}
  if(z>2.2)for(const w of r.people){if(!w.sign||w.state!=='rally')continue;ctx.save();ctx.translate(w.x+w.hx*0.9,w.y+w.hy*0.9);ctx.rotate(Math.atan2(w.hy,w.hx)+Math.PI/2);const sw=Math.sin(t*2+w.p.id)*0.08;ctx.rotate(sw);ctx.fillStyle='rgba(0,0,0,.2)';ctx.fillRect(-0.85,-0.3,1.8,0.7);ctx.fillStyle=w.sign;ctx.fillRect(-0.9,-0.4,1.8,0.7);ctx.fillStyle=RALLY_KIND[r.kind].color;ctx.fillRect(-0.7,-0.2,1.4,0.12);ctx.fillRect(-0.7,0.02,1.0,0.1);ctx.restore();}}}
function drawRallyLabels(toS,z){
  if(world.kremlin&&z<9){const [sx,sy]=toS(world.kremlin.x,world.kremlin.y);if(sx>-100&&sx<W+100&&sy>-40&&sy<H+40){ctx.font='700 '+(z<2?16:14)+'px "Unbounded",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=5;ctx.strokeStyle='rgba(255,255,255,.9)';ctx.strokeText('Казанский Кремль',sx,sy);ctx.fillStyle='#7A3E2B';ctx.fillText('Казанский Кремль',sx,sy);}}
  ctx.textAlign='center';ctx.textBaseline='middle';
  for(const s of world.squares){if(rallyAt(s))continue;const [sx,sy]=toS(s.x,s.y);if(sx<-80||sx>W+80||sy<-20||sy>H+20)continue;ctx.font='600 12px "IBM Plex Sans",system-ui';ctx.lineWidth=3;ctx.strokeStyle='rgba(255,255,255,.85)';ctx.strokeText(s.n,sx,sy);ctx.fillStyle='#6B4F2E';ctx.fillText(s.n,sx,sy);}
  for(const r of rallies){const K=RALLY_KIND[r.kind];const [sx,sy0]=toS(r.sq.x,r.sq.y);const sy=sy0-Math.max(30,22*z*0.25);const txt=`${K.icon} ${K.word}: ${r.title}`;ctx.font='700 12px "IBM Plex Sans",system-ui';const tw=ctx.measureText(txt).width+18;
    const cnt=r.people.filter(w=>w.state==='rally').length;
    if(sx>-tw&&sx<W+tw&&sy0>-40&&sy0<H+40){ctx.fillStyle=K.color;rrect(ctx,sx-tw/2,sy-12,tw,24,8);ctx.fill();ctx.fillStyle='#fff';ctx.fillText(txt,sx,sy+0.5);ctx.font='600 10px "IBM Plex Sans",system-ui';ctx.fillStyle='rgba(20,20,20,.75)';rrect(ctx,sx-26,sy+14,52,15,6);ctx.fill();ctx.fillStyle='#fff';ctx.fillText(cnt+' чел.',sx,sy+22);}
    else{const dx=sx-W/2,dy=sy0-H/2;const an=Math.atan2(dy,dx);const rx=W/2+Math.cos(an)*Math.min(W/2-30,Math.abs(dx)),ry=H/2+Math.sin(an)*Math.min(H/2-90,Math.abs(dy));ctx.save();ctx.translate(clamp(rx,30,W-30),clamp(ry,110,H-110));ctx.rotate(an);ctx.fillStyle=K.color;ctx.beginPath();ctx.moveTo(14,0);ctx.lineTo(-6,-8);ctx.lineTo(-6,8);ctx.closePath();ctx.fill();ctx.restore();}}
  if(z>3){ctx.font='600 11px "IBM Plex Sans",system-ui';for(const r of rallies)for(const w of r.people){if(!w.say)continue;const [sx,sy]=toS(w.x,w.y);if(sx<0||sx>W||sy<0||sy>H)continue;const tw=ctx.measureText(w.say.t).width+12;const a=Math.min(1,w.say.ttl);ctx.globalAlpha=a;ctx.fillStyle='rgba(255,255,255,.95)';rrect(ctx,sx-tw/2,sy-34,tw,18,7);ctx.fill();ctx.fillStyle='#222';ctx.fillText(w.say.t,sx,sy-24.5);ctx.globalAlpha=1;}}}
function contextRallies(x,y){const r=rallies.filter(r=>dist(r.sq.x,r.sq.y,x,y)<900);return r.map(r=>`(${r.sq.n}) сейчас ${RALLY_KIND[r.kind].word.toLowerCase()} «${r.title}»`).join('; ');}
