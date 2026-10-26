// ===== Договорились — делаем: житель идёт с игроком =====
let companion=null;   // {w, mode:'follow'|'go', dest:{x,y,n,poi}, arrived}

// места рядом, о которых житель может говорить (реальные названия)
function placesNear(x,y,R,max){const out=[];for(const p of world.pois){if(!p.n)continue;const d=dist(p.x,p.y,x,y);if(d<R)out.push([d,p]);}
  out.sort((a,b)=>a[0]-b[0]);const seen=new Set();const res=[];for(const [d,p] of out){if(seen.has(p.n))continue;seen.add(p.n);res.push(p);if(res.length>=max)break;}return res;}
const POI_RU={cafe:'кафе',bar:'бар',shop:'магазин',bank:'банк',office:'офис',theatre:'театр',museum:'музей',hotel:'гостиница',pharmacy:'аптека',hospital:'больница',university:'вуз',library:'библиотека',worship:'храм',police:'полиция',market:'рынок',school:'школа',sight:'достопримечательность',atm:'банкомат',fuel:'заправка'};
function placesText(x,y){return placesNear(x,y,700,12).map(p=>`${p.n} (${POI_RU[p.t]||p.t}, ${Math.round(dist(p.x,p.y,x,y))} м)`).join('; ');}
function norm(s){return String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[«»"'.,!?]/g,'').trim();}
function resolvePlace(name,x,y){const n=norm(name);if(!n)return null;let best=null,bs=0;
  for(const p of placesNear(x,y,1500,400)){const pn=norm(p.n);let s=0;if(pn===n)s=3;else if(pn.includes(n)||n.includes(pn))s=2;else{const a=new Set(pn.split(/\s+/)),b=n.split(/\s+/);const hit=b.filter(w=>w.length>2&&a.has(w)).length;if(hit)s=1+hit*0.1;}
    if(s>0){s-=dist(p.x,p.y,x,y)/5000;if(s>bs){bs=s;best=p;}}}
  if(!best){for(const s of world.squares){if(norm(s.n).includes(n)||n.includes(norm(s.n)))return {x:s.x,y:s.y,n:s.n};}
    if(world.kremlin&&/кремл/.test(n))return {x:world.kremlin.x,y:world.kremlin.y,n:'Казанский Кремль'};return null;}
  return {x:best.x,y:best.y,n:best.n,poi:best};}

function startCompanion(w,mode,place){if(w.isInterior){const cw=w.companionOf;if(cw)w=cw;else return;}
  if(companion&&companion.w!==w)stopCompanion(true);
  let dest=null;if(mode==='go'&&place){dest=resolvePlace(place,w.x,w.y);if(!dest)mode='follow';}
  companion={w,mode,dest,arrived:false,t:0};player.escort=mode==='go'&&!!dest;w.companion=true;w.state='companion';w.path=null;w.goalPoi=null;w.goalStop=null;w.waitStop=null;w.cwps=null;w.repath=0;
  addEvent(dest?`${w.p.name} идёт с вами в «${dest.n}»`:`${w.p.name} идёт с вами`,'say');updateCompBox();}
function stopCompanion(silent){if(!companion)return;player.escort=false;player.waypoints=null;const w=companion.w;w.companion=false;w.inside=false;if(w.state==='companion'){w.state='idle';w.ttl=rnd(2,6);w.node=nearestNode(w.x,w.y,world.pedAdj,120);if(w.node<0)w.node=pick(world.pedNodes);}
  if(interior){interior.npcs=interior.npcs.filter(n=>n.companionOf!==w);}
  if(!silent)addEvent(`${w.p.name} пошёл по своим делам`,'say');companion=null;updateCompBox();}
function updateCompBox(){const b=$('#compBox');if(!companion){b.hidden=true;return;}const c=companion;b.hidden=false;const going=c.mode==='go'&&c.dest&&!c.arrived;$('#compFollow').hidden=!going;$('#compFollow').textContent=player.escort?'Идти самому':'Идти за ним';$('#compBye').textContent=going?'Передумать':'Отпустить';
  $('#compLbl').textContent=c.dest&&!c.arrived?`🤝 ${c.w.p.name} ведёт вас в «${c.dest.n}» · ${Math.round(dist(c.w.x,c.w.y,c.dest.x,c.dest.y))} м`:`🤝 ${c.w.p.name} с вами`;}
$('#compTalk').addEventListener('click',()=>{if(!companion||player.busy)return;if(scene==='interior'){const n=compNpcInside();if(n)openChat(n);return;}openChat(companion.w);});
$('#compBye').addEventListener('click',()=>{if(!companion)return;const c=companion,w=c.w;if(c.mode==='go'&&c.dest&&!c.arrived){const t=pick(['Ну ладно, в другой раз!','Эх, жаль. Ну, бывай!','Хорошо, передумали так передумали.']);w.say={t,ttl:5};nearLine(w.p.name,t,false);w.p.memory.push({role:'user',content:'Слушай, я передумал, давай в другой раз.'},{role:'assistant',content:t});}stopCompanion();});
$('#compFollow').addEventListener('click',()=>{player.escort=!player.escort;player.waypoints=null;updateCompBox();});
// автопилот: игрок идёт за жителем, на дорогу выходит, только когда безопасно
function escortStep(dt){const c=companion;if(!c||c.mode!=='go'||c.arrived||c.w.inside){player.escort=false;updateCompBox();return false;}const w=c.w;
  const T=[w.x-w.hx*1.6,w.y-w.hy*1.6];const d=dist(player.x,player.y,T[0],T[1]);
  if(d<1.2){const dx=w.x-player.x,dy=w.y-player.y,L=Math.hypot(dx,dy)||1;player.hx=dx/L;player.hy=dy/L;player.waypoints=null;return true;}
  if(d<22&&clearLine(player.x,player.y,T[0],T[1])){player.waypoints=null;const sp=(d>4?WALK_SPEED*1.1:WALK_SPEED*0.9)*dt;const ux=(T[0]-player.x)/d,uy=(T[1]-player.y)/d;const st=Math.min(sp,d);const nx=player.x+ux*st,ny=player.y+uy*st;player.hx=ux;player.hy=uy;
    if(unsafeStep(player.x,player.y,nx+ux*1.2,ny+uy*1.2))return true;if(!inBuilding(nx,ny)){player.x=nx;player.y=ny;player.phase+=dt*12;}return true;}
  player.escortT=(player.escortT||0)-dt;if(!player.waypoints||player.escortT<=0){player.escortT=2;walkTo(w.x,w.y,true);}return false;}

function updateCompanion(dt){if(!companion)return;const c=companion,w=c.w;c.t+=dt;
  if(w.state==='hurt'||w.bus){stopCompanion(true);return;}
  if(player.inside||player.bus||(player.vehicle&&player.vehicle.kind!=='scooter')){w.inside=true;c.route=null;return;}
  if(w.inside){w.inside=false;const sp=[player.x-player.hx*1.5,player.y-player.hy*1.5];w.x=sp[0];w.y=sp[1];w.cwps=null;}
  // игрок уехал далеко (машина, автобус, самокат) — житель «догоняет»
  if(dist(w.x,w.y,player.x,player.y)>70){const n=nearestNode(player.x,player.y,world.pedAdj,120);if(n>=0){const sp=sidewalkPos(n);w.x=sp[0];w.y=sp[1];w.node=n;w.cwps=null;c.route=null;}}
  const look=()=>{const dx=player.x-w.x,dy=player.y-w.y,L=Math.hypot(dx,dy)||1;w.hx=dx/L;w.hy=dy/L;};
  let T,stop=1.8;const pd=dist(w.x,w.y,player.x,player.y);
  if(c.mode==='go'&&c.dest&&!c.arrived){
    // маршрут считаем один раз и идём по нему вперёд, не разворачиваясь
    if(!c.route){const s0=nearestNode(w.x,w.y,world.pedAdj,120),g0=nearestNode(c.dest.x,c.dest.y,world.pedAdj,150);const path=astar(world.pedAdj,s0,g0,pedCost);c.route=path?pathToWaypoints(path,world.pedAdj,'ped'):[];c.route.push([c.dest.x,c.dest.y]);c.ri=0;}
    const R=c.route;let best=c.ri,bd=dist(w.x,w.y,R[c.ri][0],R[c.ri][1]);for(let i=c.ri+1;i<Math.min(R.length,c.ri+6);i++){const d=dist(w.x,w.y,R[i][0],R[i][1]);if(d<bd){bd=d;best=i;}}c.ri=best;
    if(bd<1.5&&c.ri<R.length-1)c.ri++;
    if(pd>11){look();updateCompBox();return;}   // ждёт, пока игрок догонит
    stepTo(w,R[c.ri],pd>5?WALK_SPEED*1.1:WALK_SPEED*0.9,dt,true);   // ведёт в темпе игрока
    if(dist(w.x,w.y,c.dest.x,c.dest.y)<10&&pd<16){c.arrived=true;addEvent(`Вы с ${w.p.name} пришли: «${c.dest.n}». Заходите — ${w.p.female?'она зайдёт':'он зайдёт'} с вами`,'say');setHint(`Пришли в «${c.dest.n}». E у входа — зайти вместе`);}
    updateCompBox();return;}
  else{T=[player.x-player.hx*1.6,player.y-player.hy*1.6];if(pd<2.6)T=null;}
  if(!T||dist(w.x,w.y,T[0],T[1])<stop){look();updateCompBox();return;}
  const spd=pd>6?WALK_SPEED*1.15:WALK_SPEED*0.9;   // идёт следом и догоняет
  if(dist(w.x,w.y,T[0],T[1])<30&&clearLine(w.x,w.y,T[0],T[1])){w.cwps=null;stepTo(w,T,spd,dt);}
  else{w.repath-=dt;if(!w.cwps||w.repath<=0||w.wi>=w.cwps.length){w.repath=6;const s=nearestNode(w.x,w.y,world.pedAdj,120),g=nearestNode(T[0],T[1],world.pedAdj,120);const path=astar(world.pedAdj,s,g,pedCost);w.cwps=path?pathToWaypoints(path,world.pedAdj,'ped'):null;if(w.cwps){w.cwps.push(T);let bi=0,bd=1e9;for(let i=0;i<Math.min(6,w.cwps.length);i++){const d=dist(w.x,w.y,w.cwps[i][0],w.cwps[i][1]);if(d<bd){bd=d;bi=i;}}w.wi=bd<8?bi+1:bi;}else w.wi=0;}
    if(w.cwps&&w.wi<w.cwps.length){const q=w.cwps[w.wi];if(dist(w.x,w.y,q[0],q[1])<0.8)w.wi++;else stepTo(w,q,spd,dt,true);}else stepTo(w,T,spd,dt);}
  updateCompBox();}
function stepTo(w,T,spd,dt,force){const d=dist(w.x,w.y,T[0],T[1]);if(d<0.01)return;const st=Math.min(d,spd*dt);w.hx=(T[0]-w.x)/d;w.hy=(T[1]-w.y)/d;const nx=w.x+w.hx*st,ny=w.y+w.hy*st;if(unsafeStep(w.x,w.y,nx+w.hx*1.2,ny+w.hy*1.2))return;if(force||!inBuilding(nx,ny)){w.x=nx;w.y=ny;}else w.cwps=null;w.phase+=dt*8;}
// при входе в помещение спутник заходит следом и садится рядом
function companionEnter(it){if(!companion)return;const w=companion.w;if(it.npcs.some(n=>n.companionOf===w))return;
  let x=it.w/2+1,y=it.h-1.6;const free=it.furn.find(f=>f.spot==='table'&&!f.taken&&!f.comp);if(free){x=free.x+1.05;y=free.y;}
  const npc={p:w.p,x,y,hx:-1,hy:0,seated:!!free,phase:0,role:w.role,isInterior:true,state:'idle',memory:w.p.memory,companionOf:w,tableF:free||null};it.npcs.push(npc);if(free)free.comp=npc;
  const eat=free&&MENU[it.kind];addEvent(`${w.p.name} заходит с вами${eat?' и занимает столик — подходите, закажем':''}`,'say');
  if(eat){const t=pick(['Я тут столик заняла, иди сюда!','Садись, я место заняла.','Вот свободный столик, давай сюда!']);npc.say={t:w.p.female?t:t.replace('заняла','занял'),ttl:6};}}
function companionContext(w){const ww=w.companionOf||w;if(!companion||companion.w!==ww)return '';const c=companion;
  if(w.companionOf&&interior){const f=w.tableF;return ` Ты пришёл(ла) вместе с собеседником в «${interior.name}»${f?(f.ordered?` и вы сидите за одним столиком, заказали: ${f.ordered}`:' и занял(а) столик, ждёшь его'):''}.`;}
  return c.dest&&!c.arrived?` Ты сейчас идёшь вместе с собеседником в «${c.dest.n}».`:' Ты сейчас гуляешь вместе с собеседником.';}
function drawCompanionMark(toS,z){if(!companion||companion.w.inside||player.inside)return;const w=companion.w;const [sx,sy]=toS(w.x,w.y);
  ctx.save();ctx.strokeStyle='rgba(43,176,98,.9)';ctx.lineWidth=2;ctx.setLineDash([3,3]);ctx.beginPath();ctx.arc(sx,sy,Math.max(1.3*z,9),0,TAU);ctx.stroke();ctx.setLineDash([]);
  ctx.font='600 11px "IBM Plex Sans",system-ui';ctx.textAlign='center';ctx.fillStyle='rgba(20,30,26,.85)';const t='🤝 '+w.p.name;const tw=ctx.measureText(t).width+12;rrect(ctx,sx-tw/2,sy+Math.max(1.3*z,9)+4,tw,17,6);ctx.fill();ctx.fillStyle='#fff';ctx.fillText(t,sx,sy+Math.max(1.3*z,9)+13);
  const c=companion;if(c.dest&&!c.arrived){const [dx,dy]=toS(c.dest.x,c.dest.y);if(dx>0&&dx<W&&dy>0&&dy<H){ctx.fillStyle='rgba(43,176,98,.95)';ctx.beginPath();ctx.arc(dx,dy,7,0,TAU);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(dx,dy,3,0,TAU);ctx.fill();}
    else{const ax=dx-W/2,ay=dy-H/2,an=Math.atan2(ay,ax);ctx.translate(clamp(W/2+Math.cos(an)*(W/2-40),30,W-30),clamp(H/2+Math.sin(an)*(H/2-100),110,H-110));ctx.rotate(an);ctx.fillStyle='rgba(43,176,98,.95)';ctx.beginPath();ctx.moveTo(14,0);ctx.lineTo(-6,-8);ctx.lineTo(-6,8);ctx.closePath();ctx.fill();}}
  ctx.restore();}
// один вызов: реплика жителя + что он решил сделать
async function npcThink(w,extra){const base=w.isInterior&&interior?interior.ret:{x:w.x,y:w.y};
  const mem=w.p.memory.slice(-10);while(mem.length&&mem[0].role!=='user')mem.shift();
  const sys=contextForNpc(w)+companionContext(w)+`\nМеста рядом (называй только их, точными названиями): ${placesText(base.x,base.y)}.`+(extra?'\n'+extra:'')+
    '\nОтветь ТОЛЬКО JSON без пояснений: {"reply":"твоя живая реплика, 1–2 предложения","action":"none|follow|go|stop","place":"точное название места из списка или пустая строка"}.'+
    ' action=go — вы только что договорились вместе пойти в конкретное место из списка (ты идёшь рядом и показываешь дорогу); follow — ты согласился пойти с собеседником, куда он поведёт; stop — ты прощаешься или больше не идёшь вместе; иначе none. Соглашайся, только если это в твоём характере и у тебя есть время.';
  const turns=mem.map((m,i)=>i===mem.length-1?{role:'user',content:sys+'\n\nРеплика собеседника: '+m.content}:m);
  const res=await sampleFn.json(turns,{cache:false,modelTier:'quick'});
  const action=['follow','go','stop'].includes(res&&res.action)?res.action:'none';
  return {reply:String((res&&res.reply)||'').trim()||'…',action,place:String((res&&res.place)||'').slice(0,80)};}
function scriptedThink(w,text){const t=norm(text);if(/(пойд[её]м|идем|пошли|айда|проводи|покажи дорогу|давай со мной|за мной)/.test(t))return {reply:pick(['Пойдём, мне как раз по пути!','Давай, веди!','Айда!']),action:'follow',place:''};
  if(/(пока|до свидания|сау бул|мне пора)/.test(t))return {reply:'Сау бул! Ещё увидимся.',action:'stop',place:''};return null;}
function applyNpcAction(w,r){const real=w.companionOf||w;
  if(r.action==='follow'||r.action==='go'){
    if(w.isInterior&&!w.companionOf){const n=nearestNode(interior.ret.x,interior.ret.y,world.pedAdj,120);const nw=new Walker(w.role==='staff'?'resident':(w.role||'resident'),n>=0?n:pick(world.pedNodes));nw.p=w.p;nw.temp=true;nw.inside=true;walkers.push(nw);w.companionOf=nw;}
    startCompanion(w.companionOf||w,r.action,r.place);
    const c=companion;return c?(c.dest?`${w.p.name} идёт с вами в «${c.dest.n}»`:`${w.p.name} идёт с вами`):null;}
  if(r.action==='stop'&&companion&&companion.w===real){stopCompanion(true);return `${w.p.name} больше не идёт с вами`;}
  return null;}
