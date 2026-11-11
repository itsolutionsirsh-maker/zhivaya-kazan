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

function startCompanion(w,mode,place,quiet){if(w.isInterior){const cw=w.companionOf;if(cw)w=cw;else return;}
  if(companion&&companion.w!==w)stopCompanion(true);
  const f=typeof folkOf==='function'?folkOf(w):null;if(f){folkCancelRoute(f);f.away=true;f.retry=null;f.w=w;w.folk=f.id;w.temp=false;}
  let dest=null;if(mode==='go'&&place){dest=resolvePlace(place,w.x,w.y);if(!dest)mode='follow';}
  companion={w,mode,dest,arrived:false,t:0};player.escort=mode==='go'&&!!dest;w.companion=true;w.state='companion';w.path=null;w.goalPoi=null;w.goalStop=null;w.waitStop=null;w.cwps=null;w.repath=0;
  if(!quiet)addEvent(dest?`${w.p.name} идёт с вами в ${qName(dest.n)}`:`${w.p.name} идёт с вами`,'say');updateCompBox();}
function stopCompanion(silent){if(!companion)return;player.escort=false;player.waypoints=null;const w=companion.w;w.companion=false;if(w.inside&&interior&&interior.ret){w.x=interior.ret.x;w.y=interior.ret.y;}w.inside=false;if(w.state==='companion'){w.state='idle';w.ttl=rnd(2,6);w.node=nearestNode(w.x,w.y,world.pedAdj,120);if(w.node<0)w.node=pick(world.pedNodes);}
  if(interior){interior.npcs=interior.npcs.filter(n=>n.companionOf!==w);}
  if(!silent)addEvent(`${w.p.name} пошёл по своим делам`,'say');companion=null;const f=typeof folkOf==='function'?folkOf(w):null;if(f){f.away=true;f.retry=null;folkGo(f,folkWant(f));}updateCompBox();}
function updateCompBox(){const b=$('#compBox');if(!companion){b.hidden=true;return;}const c=companion;b.hidden=false;const going=c.mode==='go'&&c.dest&&!c.arrived&&!c.dest.host;$('#compFollow').hidden=!going;$('#compFollow').textContent=player.escort?'Идти самому':(c.w.p.female?'Идти за ней':'Идти за ним');$('#compBye').textContent=going||(c.homeVisit&&!c.arrived)?'Передумать':'Отпустить';
  const left=c.dest&&!c.arrived?Math.round(dist((c.w.inside?player.x:c.w.x),(c.w.inside?player.y:c.w.y),c.dest.x,c.dest.y)):0;
  $('#compLbl').textContent=c.dest&&!c.arrived&&c.dest.host?`🏠 ${c.w.p.name} с вами домой · ${left} м`:c.dest&&!c.arrived?`🤝 ${c.w.p.name} ${c.dest.guest?'ведёт вас к себе в гости':'ведёт вас в '+qName(c.dest.n)} · ${Math.round(dist(c.w.x,c.w.y,c.dest.x,c.dest.y))} м`:c.dest&&c.dest.guest?`🏠 ${c.w.p.name} у своего подъезда · E — зайти в гости`:`🤝 ${c.w.p.name} с вами`;}
$('#compTalk').addEventListener('click',()=>{if(!companion||player.busy)return;if(scene==='interior'){const n=compNpcInside();if(n)openChat(n);return;}openChat(companion.w);});
$('#compBye').addEventListener('click',()=>{if(!companion)return;const c=companion,w=c.w;if(c.mode==='go'&&c.dest&&!c.arrived){const t=pick(['Ну ладно, в другой раз!','Эх, жаль. Ну, бывай!','Хорошо, передумали так передумали.']);w.say={t,ttl:5};nearLine(w.p.name,t,false);w.p.memory.push({role:'user',content:'Слушай, я передумал, давай в другой раз.'},{role:'assistant',content:t});}stopCompanion();});
$('#compFollow').addEventListener('click',()=>{player.escort=!player.escort;player.waypoints=null;updateCompBox();});
// автопилот: игрок идёт за жителем, на дорогу выходит, только когда безопасно
function escortStep(dt){const c=companion;if(!c||c.mode!=='go'||c.arrived||c.w.inside){player.escort=false;updateCompBox();return false;}const w=c.w;
  const T=[w.x-w.hx*1.6,w.y-w.hy*1.6];const d=dist(player.x,player.y,T[0],T[1]);
  if(d<1.2){const dx=w.x-player.x,dy=w.y-player.y,L=Math.hypot(dx,dy)||1;player.hx=dx/L;player.hy=dy/L;player.waypoints=null;return true;}
  if(d<22&&clearLine(player.x,player.y,T[0],T[1])){player.waypoints=null;const sp=(d>4?WALK_SPEED*1.1:WALK_SPEED*0.9)*dt;const ux=(T[0]-player.x)/d,uy=(T[1]-player.y)/d;const st=Math.min(sp,d);const nx=player.x+ux*st,ny=player.y+uy*st;player.hx=ux;player.hy=uy;
    if(unsafeStep(player.x,player.y,nx+ux*1.2,ny+uy*1.2))return true;if(!inBuilding(nx,ny)){player.x=nx;player.y=ny;player.stepping=true;player.phase+=dt*12;}return true;}
  player.escortT=(player.escortT||0)-dt;if(!player.waypoints||player.escortT<=0){player.escortT=2;walkTo(w.x,w.y,true);}return false;}

function updateCompanion(dt){if(!companion)return;const c=companion,w=c.w;c.t+=dt;
  if(w.state==='hurt'||w.bus){stopCompanion(true);return;}
  if(player.vehicle&&c.homeVisit&&typeof isLightVehicle==='function'&&isLightVehicle(player.vehicle.kind)){w.inside=false;w.x=player.x-player.hx*1.15+(-player.hy)*0.55;w.y=player.y-player.hy*1.15+player.hx*0.55;w.hx=player.hx;w.hy=player.hy;
    if(c.toldRide!==player.vehicle.kind){c.toldRide=player.vehicle.kind;addEvent(`${w.p.name} едет с вами на ${player.vehicle.spec.word}`,'say');}updateCompBox();return;}
  if(player.inside||player.bus||(player.vehicle&&player.vehicle.kind!=='scooter'&&player.vehicle.kind!=='bike')){if(c.homeVisit&&!w.inside&&(player.bus||player.vehicle))addEvent(`${w.p.name} едет с вами`,'say');w.inside=true;c.route=null;updateCompBox();return;}
  if(w.inside){if(c.staysInRoom&&!player.inside){updateCompBox();return;}w.inside=false;const sp=[player.x-player.hx*1.5,player.y-player.hy*1.5];w.x=sp[0];w.y=sp[1];w.cwps=null;}
  // игрок уехал далеко (машина, автобус, самокат) — житель «догоняет»
  if(dist(w.x,w.y,player.x,player.y)>70){const n=nearestNode(player.x,player.y,world.pedAdj,120);if(n>=0){const sp=sidewalkPos(n);w.x=sp[0];w.y=sp[1];w.node=n;w.cwps=null;c.route=null;}}
  const look=()=>{const dx=player.x-w.x,dy=player.y-w.y,L=Math.hypot(dx,dy)||1;w.hx=dx/L;w.hy=dy/L;};
  let T,stop=1.8;const pd=dist(w.x,w.y,player.x,player.y);
  if(c.mode==='go'&&c.dest&&!c.arrived){
    // маршрут считаем один раз и идём по нему вперёд, не разворачиваясь
    if(!c.route){const s0=nearestNode(w.x,w.y,world.pedAdj,120),g0=nearestNode(c.dest.x,c.dest.y,world.pedAdj,150);const path=astar(world.pedAdj,s0,g0,pedCost);c.route=path?pathToWaypoints(path,world.pedAdj,'ped'):[];c.route.push([c.dest.x,c.dest.y]);c.ri=0;}
    const R=c.route;let best=c.ri,bd=dist(w.x,w.y,R[c.ri][0],R[c.ri][1]);for(let i=c.ri+1;i<Math.min(R.length,c.ri+6);i++){const d=dist(w.x,w.y,R[i][0],R[i][1]);if(d<bd){bd=d;best=i;}}c.ri=best;
    if(bd<1.5&&c.ri<R.length-1)c.ri++;
    if(pd>11&&!c.autoIn){look();updateCompBox();return;}   // ждёт, пока игрок догонит
    stepTo(w,R[c.ri],pd>5?WALK_SPEED*1.1:WALK_SPEED*0.9,dt,true);   // ведёт в темпе игрока
    if(c.autoIn&&dist(w.x,w.y,c.dest.x,c.dest.y)<16&&pd<32){enterHangout();return;}
    if(!c.autoIn&&dist(w.x,w.y,c.dest.x,c.dest.y)<14&&pd<26){c.arrived=true;if(c.dest.host){addEvent(`Вы с ${w.p.name} у вашего подъезда. Заходите домой вместе`,'say');setHint('E — зайти домой');}else if(c.dest.guest){addEvent(`Вы с ${w.p.name} у ${w.p.female?'её':'его'} подъезда. Заходите — чай уже ждёт`,'say');setHint('E — зайти в гости');}else{addEvent(`Вы с ${w.p.name} пришли: ${qName(c.dest.n)}. Заходите — ${w.p.female?'она зайдёт':'он зайдёт'} с вами`,'say');setHint(`Пришли в ${qName(c.dest.n)}. E у входа — зайти вместе`);}}
    updateCompBox();return;}
  else{T=[player.x-player.hx*1.6,player.y-player.hy*1.6];if(pd<2.6)T=null;}
  if(!T||dist(w.x,w.y,T[0],T[1])<stop){look();updateCompBox();return;}
  const spd=pd>6?WALK_SPEED*1.15:WALK_SPEED*0.9;   // идёт следом и догоняет
  if(dist(w.x,w.y,T[0],T[1])<30&&clearLine(w.x,w.y,T[0],T[1])){w.cwps=null;stepTo(w,T,spd,dt);}
  else{w.repath-=dt;if(!w.cwps||w.repath<=0||w.wi>=w.cwps.length){w.repath=6;const s=nearestNode(w.x,w.y,world.pedAdj,120),g=nearestNode(T[0],T[1],world.pedAdj,120);const path=astar(world.pedAdj,s,g,pedCost);w.cwps=path?pathToWaypoints(path,world.pedAdj,'ped'):null;if(w.cwps){w.cwps.push(T);let bi=0,bd=1e9;for(let i=0;i<Math.min(6,w.cwps.length);i++){const d=dist(w.x,w.y,w.cwps[i][0],w.cwps[i][1]);if(d<bd){bd=d;bi=i;}}w.wi=bd<8?bi+1:bi;}else w.wi=0;}
    if(w.cwps&&w.wi<w.cwps.length){const q=w.cwps[w.wi];if(dist(w.x,w.y,q[0],q[1])<0.8)w.wi++;else stepTo(w,q,spd,dt,true);}else stepTo(w,T,spd,dt);}
  updateCompBox();}
function enterHangout(){const c=companion;if(!c||!c.dest||c.knock)return;c.knock=true;c.autoIn=false;player.escort=false;player.waypoints=null;
  const poi=c.dest.poi||{};const kind=poi.t==='cafe'?'cafe':'bar';
  const src={kind,name:c.dest.n,key:kind+':'+(poi.i!=null?poi.i:c.dest.n),x:c.dest.x,y:c.dest.y,together:true,st:poi.st||''};
  const p=wNear(c.dest.x,c.dest.y);player.x=p[0];player.y=p[1];c.w.x=p[0]+0.7;c.w.y=p[1];
  if(typeof enterInterior==='function')enterInterior(src);
  c.arrived=true;}
function wNear(x,y){if(typeof nearestNode==='function'&&world&&world.pedAdj){const n=nearestNode(x,y,world.pedAdj,60);if(n>=0&&typeof sidewalkPos==='function')return sidewalkPos(n);}return [x,y];}
function stepTo(w,T,spd,dt,force){const d=dist(w.x,w.y,T[0],T[1]);if(d<0.01)return;const st=Math.min(d,spd*dt);w.hx=(T[0]-w.x)/d;w.hy=(T[1]-w.y)/d;const nx=w.x+w.hx*st,ny=w.y+w.hy*st;if(unsafeStep(w.x,w.y,nx+w.hx*1.2,ny+w.hy*1.2))return;if(force||!inBuilding(nx,ny)){w.x=nx;w.y=ny;}else w.cwps=null;w.phase+=dt*8;}
// при входе в помещение спутник заходит следом и садится рядом
function companionEnter(it){if(!companion)return;const w=companion.w;if(it.npcs.some(n=>n.companionOf===w))return;
  let x=it.w/2+1,y=it.h-1.6;const free=it.furn.find(f=>f.spot==='table'&&!f.taken&&!f.comp);if(free){x=free.x+1.05;y=free.y;}
  const npc={p:w.p,x,y,hx:-1,hy:0,seated:!!free,phase:0,role:w.role,isInterior:true,state:'idle',memory:w.p.memory,companionOf:w,tableF:free||null};it.npcs.push(npc);if(free)free.comp=npc;
  const eat=free&&MENU[it.kind];addEvent(`${w.p.name} заходит с вами${eat?' и занимает столик — подходите, закажем':''}`,'say');
  if(eat){const t=pick(['Я тут столик заняла, иди сюда!','Садись, я место заняла.','Вот свободный столик, давай сюда!']);npc.say={t:w.p.female?t:t.replace('заняла','занял'),ttl:6};}}
function companionContext(w){const ww=w.companionOf||w;if(!companion||companion.w!==ww)return '';const c=companion;
  if(w.companionOf&&interior){const f=w.tableF;const why=w.p&&w.p.homeWhy;const coat=w.p&&w.p.coatOff?(w.p.female?' Куртку уже сняла, сидишь рядом в свитере.':' Куртку уже снял, сидишь рядом в свитере.'):'';const job=why==='repair'?' Вы дома на диване. Про кран можно вспомнить, но вы уже просто двое дома.':why==='tea'?' Вы дома на диване, чай и разговор.':' Вы дома на диване.';return ` Ты пришёл(ла) вместе с собеседником в «${interior.name}»${f?(f.ordered?` и вы сидите за одним столиком, заказали: ${f.ordered}`:' и занял(а) столик, ждёшь его'):''}.${job}${coat} Говори как живой человек. Если вам хорошо — можно тепло и с флиртом: комплимент, шутка, сесть ближе. Не суши разговор и не объявляй действия списком.`;}
  return c.dest&&!c.arrived?` Ты сейчас идёшь вместе с собеседником в ${qName(c.dest.n)}.`:' Ты сейчас гуляешь вместе с собеседником.';}
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
    (typeof guestHomeHint==='function'?guestHomeHint(w):'')+
    '\nОтветь ТОЛЬКО JSON без пояснений: {"reply":"твоя живая реплика, 1–2 предложения","action":"none|follow|go|stop'+(typeof guestHomeOk==='function'&&guestHomeOk(w)?'|home':'')+'","place":"точное название места из списка или пустая строка"}.'+
    ' Отвечай именно на последнюю реплику и на то, о чём уже договорились. Не меняй тему. Если спросили «куда» — назови место из договорённости или из списка рядом. Если звали пить пиво, кофе или есть — согласись или откажись и назови конкретное место из списка. Не говори про пробки, автобусы и салют, если об этом не спросили.'+
    ' action=go — вы только что договорились вместе пойти в конкретное место из списка (ты идёшь рядом и показываешь дорогу); follow — ты согласился пойти с собеседником, куда он поведёт, в том числе к нему домой; stop — ты прощаешься или больше не идёшь вместе; home — только если ТЫ зовёшь собеседника к себе, не наоборот. Соглашайся, только если это в твоём характере и у тебя есть время.';
  const turns=mem.map((m,i)=>i===mem.length-1?{role:'user',content:sys+'\n\nРеплика собеседника: '+m.content}:m);
  const res=await sampleFn.json(turns,{cache:false,modelTier:'quick'});
  const action=['follow','go','stop'].includes(res&&res.action)||(res&&res.action==='home'&&typeof guestHomeOk==='function'&&guestHomeOk(w))?res.action:'none';
  let reply=String((res&&res.reply)||'').trim()||'…';
  if(typeof tooMuchTatar==='function'&&tooMuchTatar(reply)){try{const fix=await sampleFn.json([{role:'user',content:'Перепиши реплику целиком по-русски. Смысл сохрани. Татарских слов не больше одного, и только короткое: рәхмәт, айда, яхшы, эчпочмак. Татарских предложений нельзя.\nРеплика: '+reply+'\nJSON: {"reply":"..."}'}],{cache:false,modelTier:'quick'});const n=String((fix&&fix.reply)||'').trim();reply=n&&!tooMuchTatar(n)?n:'Скажу проще: я тебя понял.';}catch(e){reply='Скажу проще: я тебя понял.';}}
  return {reply,action,place:String((res&&res.place)||'').slice(0,80)};}
function talkBlob(w){return norm(((w&&w.p&&w.p.memory)||[]).slice(-8).map(m=>m.content).join(' '));}
function spotKind(w,kinds){const base=w&&w.isInterior&&typeof interior!=='undefined'&&interior&&interior.ret?interior.ret:{x:(w&&w.x)||player.x,y:(w&&w.y)||player.y};
  if(typeof placesNear!=='function')return null;return placesNear(base.x,base.y,1600,50).find(p=>kinds.includes(p.t))||null;}
function sheOf(w){return !!(w&&w.p&&w.p.female);}
function beerAsk(t){return /пив|пивк|бухн|бар/.test(t);}
function cafeAsk(t){return /кофе|кафе|чай(?!к)/.test(t);}
function foodAsk(t){return /поесть|поешь|поешь|перекус|обед|ужин|шаурм|эчпочмак|голод/.test(t);}
function whereAsk(t){return /(^| )(куда|где)( |$)|в какое место|какое место|адрес/.test(t);}
function inviteAsk(t){return /пошл|пойд|идем|айда|давай|зайдем|зайдём|сходим|поехали|за мной|со мной/.test(t);}
function goSpot(w,place,why){if(!place)return null;const she=sheOf(w);return {reply:why+` Ближе всего «${place.n}». ${she?'Иду туда с тобой':'Иду туда с тобой'}.`,action:'go',place:place.n,sure:true};}
function beerPlan(w){if(w.p&&w.p.age<18)return {reply:'Пиво мне рано. Если хочешь — пошли в кафе, там чай.',action:'none',place:'',sure:true};
  if(/police|guard/.test(w.role||''))return {reply:'Я на службе, в бар отойти не могу.',action:'none',place:'',sure:true};
  const bar=spotKind(w,['bar'])||spotKind(w,['cafe']);
  if(!bar)return {reply:'По пиву я не против, но бара рядом не вижу. Назови место — и пойду.',action:'follow',place:'',sure:true};
  return goSpot(w,bar,'По пиву — да.');}
function cafePlan(w){const c=spotKind(w,['cafe'])||spotKind(w,['bar']);if(!c)return {reply:'Кафе рядом не вижу. Назови, какое — провожу.',action:'follow',place:'',sure:true};return goSpot(w,c,'Кофе — можно.');}
function foodPlan(w){const c=spotKind(w,['cafe'])||spotKind(w,['bar'])||spotKind(w,['market']);if(!c)return {reply:'Поесть я не против, но заведения рядом не вижу. Куда пойдём?',action:'none',place:'',sure:true};return goSpot(w,c,'Поесть — давай.');}
function answerWhere(w,t){const blob=talkBlob(w)+' '+t;
  if(beerAsk(blob))return beerPlan(w);
  if(cafeAsk(blob))return cafePlan(w);
  if(foodAsk(blob))return foodPlan(w);
  if(/домой|ко мне/.test(blob))return {reply:player.home?'Домой — так домой. Веди, я с тобой.':'Домой можно, только сначала покажи, где твой дом.',action:'follow',place:'',sure:true};
  if(typeof companion!=='undefined'&&companion&&companion.w&&(companion.w===w||companion.w===w.companionOf)&&companion.dest&&companion.dest.n)return {reply:'Мы идём в «'+companion.dest.n+'».',action:'none',place:'',sure:true};
  return {reply:'Куда именно? Скажи: бар, кафе, Кремль — и я отвечу, иду или нет.',action:'none',place:'',sure:true};}
function scriptedThink(w,text){const t=norm(text);if(!t)return null;const she=sheOf(w);const name=w.p&&w.p.name||'я';
  if(/(пока|до свидания|мне пора|бывай|прощай)/.test(t))return {reply:'Пока. Ещё увидимся.',action:'stop',place:'',sure:true};
  if(whereAsk(t))return answerWhere(w,t);
  if(beerAsk(t)&&(inviteAsk(t)||/хочу|давай|можно|по пив/.test(t)||t.length<40))return beerPlan(w);
  if(cafeAsk(t)&&inviteAsk(t))return cafePlan(w);
  if(foodAsk(t)&&(inviteAsk(t)||/хочу|давай|можно/.test(t)))return foodPlan(w);
  if(inviteAsk(t))return {reply:'Иду. Только скажи куда — сам не угадаю.',action:'follow',place:'',sure:true};
  if(/^(привет|здравств|здорово|салам|исенме|добрый|доброе|хай)( |$)/.test(t))return {reply:'Привет. Я '+name+', '+((w.p&&w.p.job)||'живу тут')+'.',action:'none',place:'',sure:true};
  if(/как дела|как ты|как сам|как сама|как жизнь|как настроен/.test(t))return {reply:'Нормально, настроение '+(w.p&&w.p.mood||'ровное')+'. А у тебя?',action:'none',place:'',sure:true};
  if(/как зовут|кто ты|ты кто|чем занима|кем работ|где учиш|студент/.test(t))return {reply:'Я '+name+', '+((w.p&&w.p.age)?w.p.age+' лет, ':'')+((w.p&&w.p.job)||'местный')+'.',action:'none',place:'',sure:true};
  if(/спасибо|благодар|рахмат|рәхмәт/.test(t))return {reply:'Не за что.',action:'none',place:'',sure:true};
  if(/погод|дожд|снег|холодн|жаркий|тепло/.test(t))return {reply:'Сейчас '+(typeof weatherText==='function'?weatherText():'как обычно')+'.',action:'none',place:'',sure:true};
  if(/^(да|ок|окей|хорошо|ладно|го|ага|угу|конечно)$/.test(t)){const blob=talkBlob(w);if(beerAsk(blob))return beerPlan(w);if(cafeAsk(blob))return cafePlan(w);if(foodAsk(blob))return foodPlan(w);return {reply:'Хорошо. Куда тогда?',action:'none',place:'',sure:true};}
  if(/почему|зачем/.test(t))return {reply:'Про что именно? Если про дорогу — скажи, куда идём.',action:'none',place:'',sure:true};
  if(/^(что|как|когда|кто|сколько|зачем|почему)( |$)/.test(t)||/\?/.test(String(text)))return {reply:'Уточни вопрос: куда идём, как дела или кто я. Так я отвечу по делу, а не мимо.',action:'none',place:'',sure:false};
  return {reply:'Слышу. Если зовёшь куда-то — скажи куда. Если просто разговор — я на связи.',action:'none',place:'',sure:false};}
function playerAskedHome(w){const mem=(w.p&&w.p.memory)||[];let t='';for(let i=mem.length-1;i>=0;i--)if(mem[i].role==='user'){t=norm(mem[i].content);break;}
  return /(ко мне|к себе домой|ко мне домой|домой ко мне|заходи ко мне|пошли ко мне|пойд[её]м ко мне|идем ко мне|идём ко мне|пошли домой|идем домой|идём домой|ко мне в гости|в гости ко мне|у меня дома)/.test(t);}
function homeBlob(w){return norm(((w&&w.p&&w.p.memory)||[]).slice(-8).map(m=>m.content).join(' '));}
function homeReason(w){const t=homeBlob(w);if(/(раковин|кран|теч|сифон|гайк|унитаз|батарей|розетк)/.test(t))return 'repair';if(/(чай|кофе|посидеть)/.test(t))return 'tea';return 'visit';}
function homeDeal(w,reply,act){if(w&&w.p&&w.p.age&&w.p.age<18)return false;if(w&&/police|guard/.test(w.role||''))return false;
  if(typeof hotelLastAsk==='function'&&hotelLastAsk(w))return false;
  const t=homeBlob(w);
  const about=/(раковин|кран|теч|сифон|гайк|унитаз|квартир|домой|ко мне|у меня|чай|посидеть|диван|посмотришь|глянь)/.test(t)||playerAskedHome(w);
  if(!about)return false;
  const said=norm(reply||'');
  if(/(не пойду|не могу|не сейчас|занят|не выйдет|не поеду|откажу)/.test(said))return false;
  const goes=/(пойд[её]м|пойду|подойду|приду|идем|гляну|посмотрю|зайду|подъеду|поехали)/.test(said);
  const actGo=act&&(act.action==='follow'||act.action==='go'||act.action==='home');
  return !!(goes||actGo||playerAskedHome(w));}
function syncChatGo(){const b=$('#chatGo');if(!b)return;const w=typeof chatNpc!=='undefined'?chatNpc:null;const on=!!(w&&w.p&&w.p.homeOffer&&!(player.inside&&interior&&(interior.kind==='home'||interior.kind==='hotelroom')));b.hidden=!on;if(on)b.textContent=player.home?'Поехать домой':'Указать дом';}
function noteHomeOffer(w,reply,act){if(!w||!w.p||!homeDeal(w,reply,act))return;if(companion&&companion.homeVisit)return;w.p.homeOffer=true;w.p.homeWhy=homeReason(w);syncChatGo();
  appendMsg('sys',player.home?'Договорились. Кнопка «Поехать домой» — потом пешком, самокат, такси или автобус.':'Договорились, но дома ещё нет. Нажми «Указать дом» и ткни жилой дом на карте — иначе ехать некуда. Потом сразу выберем дорогу.');}
function pressGoHome(){const w=typeof chatNpc!=='undefined'?chatNpc:null;if(!w)return;
  let who=w.companionOf||(!w.isInterior?w:null);
  if(!who&&w.isInterior&&typeof applyNpcAction==='function'){applyNpcAction(w,{action:'follow',place:''});who=w.companionOf;}
  if(!who&&companion&&(companion.w.p===w.p))who=companion.w;
  if(!who||who.isInterior){setHint('Сначала выйдите на улицу вместе');return;}
  if(!player.home){pendingHomeWho=who;if(typeof closeChat==='function')closeChat();pickingHome=true;if(typeof canvas!=='undefined')canvas.style.cursor='crosshair';setHint('Нажми на жилой дом — он станет твоим, и сразу поедете');addEvent(`${who.p.name} ждёт: укажи, где твой дом`,'say');return;}
  w.p.homeOffer=false;syncChatGo();walkHomeTogether(who);}
let pendingHomeWho=null;
function pendingHomeGo(){const who=pendingHomeWho;if(!who||!player.home)return;pendingHomeWho=null;if(who.p)who.p.homeOffer=false;setTimeout(()=>{if(player.home)walkHomeTogether(who);},350);}
function paintHomeTogether(it){if(!it||!companion)return;const bg=shotImg.homeSofa||shotImg.home;const who=companion.w;const cnv=document.createElement('canvas');cnv.width=1280;cnv.height=720;const g=cnv.getContext('2d');
  if(bg&&bg.complete&&bg.width){const s=Math.max(1280/bg.width,720/bg.height),dw=bg.width*s,dh=bg.height*s;g.drawImage(bg,(1280-dw)/2,(720-dh)/2,dw,dh);}
  else{g.fillStyle='#241c16';g.fillRect(0,0,1280,720);if(bg&&!bg._wait){bg._wait=1;bg.addEventListener('load',()=>paintHomeTogether(it),{once:true});}}
  g.fillStyle='rgba(12,10,8,.18)';g.fillRect(0,0,1280,720);
  const faces=[{name:player.name||'Вы',img:player.avatarImg},{name:who.p.name,img:typeof npcFaceImg==='function'?npcFaceImg(who.p):null}];
  faces.forEach((m,i)=>{const x=i?860:420,y=268,r=92;g.save();g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.clip();
    if(m.img&&m.img.width)g.drawImage(m.img,x-r,y-r-6,r*2,r*2);else{g.fillStyle=i?'#3a4a68':'#2c6a4e';g.fillRect(x-r,y-r,r*2,r*2);g.fillStyle='#fff';g.font='700 64px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText((m.name||'?')[0],x,y);}
    g.restore();g.strokeStyle='#fff';g.lineWidth=5;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.stroke();g.font='600 28px "IBM Plex Sans",sans-serif';g.fillStyle='#fff';g.textAlign='center';g.shadowColor='rgba(0,0,0,.75)';g.shadowBlur=8;g.fillText(m.name,x,y+r+36);g.shadowBlur=0;});
  it.photoImg=cnv;if(typeof placeChatLook==='function')placeChatLook();}
(function(){const im=new Image();im.onload=()=>{shotImg.homeSofa=im;};im.src='img/inside/room-sofa.jpg';})();
const chatGoBtn=$('#chatGo');if(chatGoBtn)chatGoBtn.addEventListener('click',pressGoHome);
function walkHomeTogether(who){if(!who||who.isInterior||!player.home)return null;startCompanion(who,'follow',null,true);const c=companion;if(!c||c.w!==who)return null;
  const b=player.home;let x=b.cx,y=b.cy;if(typeof inBuilding==='function'&&inBuilding(x,y)&&typeof toSidewalk==='function'){const q=toSidewalk(x,y);if(q){x=q[0];y=q[1];}}
  const street=typeof nearestRoadName==='function'?(nearestRoadName(b.cx,b.cy)||''):'';
  c.mode='follow';c.dest={x,y,n:street?('Дом · '+street):'Домой',host:true};c.homeVisit=true;c.route=null;c.arrived=false;c.toldRide=null;player.escort=false;
  if(typeof closeChat==='function'&&typeof chatNpc!=='undefined'&&chatNpc)closeChat();
  addEvent(`🏠 ${who.p.name} согласна зайти. Пункт — ваш дом${street?' · '+street:''}. Выберите, как добраться: ${who.p.female?'она поедет':'он поедет'} тем же способом`,'say');
  setHint('Пешком, самокат, такси или автобус — выбор за вами');
  if(typeof openRouteModal==='function')openRouteModal(c.dest);updateCompBox();
  return `${who.p.name} едет с вами домой`;}
function maybeEnterHomeTogether(){const c=companion;if(!c||!c.homeVisit||!player.home||player.inside||player.vehicle||player.bus)return false;
  const b=player.home,reach=Math.max(28,(b.bb&&b.bb[2]-b.bb[0])/2+12||0,(b.bb&&b.bb[3]-b.bb[1])/2+12||0);
  if(dist(player.x,player.y,b.cx,b.cy)>reach)return false;c.homeVisit=false;c.arrived=true;
  enterInterior({kind:'home',name:typeof housingHomeName==='function'?housingHomeName():'Ваша квартира',key:typeof housingHomeKey==='function'?housingHomeKey():'home',x:player.x,y:player.y,together:true});
  if(c.w.p)c.w.p.homeOffer=false;if(typeof paintHomeTogether==='function')paintHomeTogether(interior);if(typeof syncChatGo==='function')syncChatGo();return true;}
function applyNpcAction(w,r){const real=w.companionOf||w;
  const homeAsk=playerAskedHome(w)&&(r.action==='follow'||r.action==='home'||r.action==='go');
  if(homeAsk){if(!player.home){setHint('Своего дома ещё нет. Выберите его: меню → «Работа и жильё» или анкета района');return `${w.p.name} согласна зайти, но дома пока нет`;}}
  if(!homeAsk&&r.action==='home'&&typeof guestGo==='function')return guestGo(w);
  if(homeAsk&&player.home&&r.action==='home')r.action='follow';
  if(w.isInterior&&(!interior||!interior.ret||(interior.npcs&&!interior.npcs.includes(w))))return null;
  if(r.action==='follow'||r.action==='go'){
    if(w.isInterior&&!w.companionOf){const f=typeof folkOf==='function'?folkOf(w):null;if(f&&f.driving)return null;let nw;
      if(f){folkCancelRoute(f);nw=f.w||folkSpawn(f,interior.ret);if(!nw)return null;nw.x=interior.ret.x;nw.y=interior.ret.y;nw.folk=f.id;nw.temp=false;f.away=true;}
      else{const n=nearestNode(interior.ret.x,interior.ret.y,world.pedAdj,120);if(n<0)return null;nw=new Walker(w.role==='staff'?'resident':(w.role||'resident'),n);nw.p=w.p;nw.temp=true;walkers.push(nw);}
      nw.inside=true;w.companionOf=nw;}
    if(homeAsk)return walkHomeTogether(w.companionOf||(w.isInterior?null:w));
    startCompanion(w.companionOf||w,r.action,r.place);
    const c=companion;if(c&&c.dest&&c.dest.poi&&/^(bar|cafe|pub)$/.test(c.dest.poi.t||'')){c.autoIn=true;player.escort=true;if(typeof followPlayer==='function')followPlayer();if(typeof closeChat==='function'&&typeof chatNpc!=='undefined'&&chatNpc)closeChat();setHint('Идёте вдвоём. У двери зайдёте сами');addEvent(`${c.w.p.name} ведёт в ${qName(c.dest.n)}. Идёте вдвоём`,'say');}
    return c?(c.dest?`${w.p.name} идёт с вами в ${qName(c.dest.n)}`:`${w.p.name} идёт с вами`):null;}
  if(r.action==='stop'&&companion&&companion.w===real){stopCompanion(true);return `${w.p.name} больше не идёт с вами`;}
  return null;}
