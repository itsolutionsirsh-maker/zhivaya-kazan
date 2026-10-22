// ===== Жизненные ситуации: общий механизм =====
// Ситуация = когда случается (when) + участники (start) + выбор игрока (sitCard) + последствия (деньги, настроение, репутация, досье).
// Добавить свою:
//   defSit('id',{title:'…',auto:true,weight:2,cool:600,
//     when(){return scene==='city'&&…},          // можно ли запустить сейчас (для случайного запуска)
//     start(s){…; return true},                    // поставить участников, показать карточку; false — не получилось
//     update(s,dt){…},                             // каждый кадр; endSit(s) — закончить
//     action(s){return near?{label,run}:null},     // что делает E рядом (кошелёк, собака, человек на тротуаре)
//     draw(s,toS,z){…}});                          // своё рисование (по желанию)
// Запустить вручную: startSit('id').  Готовые помощники: sitCard, mark, takeActor, moveActor, say, callPatrol, sitMoney, sitRep, sitMood, dossier.
const SIT={defs:{},active:[],timer:45,cool:{},card:null,queue:[],marks:new Map(),patrols:[],dossier:[],speedMul:1,watchers:[]};
// наблюдатели: проверка каждый кадр (толкнул прохожего, превысил скорость у камеры…)
function defWatch(fn){SIT.watchers.push(fn);}

function defSit(id,o){o.id=id;SIT.defs[id]=o;}
function sitNow(){return performance.now()/1000;}
function sitActive(id){return SIT.active.find(s=>s.def.id===id&&!s.done)||null;}
function startSit(id,extra){const d=SIT.defs[id];if(!d)return null;if(!d.multi&&sitActive(id))return null;
  const s=Object.assign({def:d,t:0,done:false,actors:[]},extra||{});if(d.start&&d.start(s)===false){for(const w of s.actors)releaseActor(w);return null;}
  SIT.active.push(s);SIT.cool[id]=sitNow()+(d.cool||300);return s;}
function endSit(s){if(!s||s.done)return;s.done=true;if(s.def.end)s.def.end(s);
  for(const k of [...SIT.marks.keys()])if(SIT.marks.get(k).s===s)SIT.marks.delete(k);
  for(const w of s.actors)releaseActor(w);s.actors=[];closeSitCard(s);}

// ---------- последствия ----------
function sitMoney(d,why){d=Math.round(d);if(d<0)player.money=Math.max(0,player.money+d);else player.money+=d;if(why)addEvent(`${why}: ${d>0?'+':'−'}${fmtMoney(Math.abs(d))}`,d<0?'alert':'say');}
function sitRep(d,why){player.rep=clamp(Math.round((player.rep||0)+d),-100,100);if(why)addEvent(`${d>0?'⭐':'👎'} Репутация ${d>0?'+':''}${d}: ${why}`,d>0?'say':'alert');}
function sitMood(d){player.mood=clamp(player.mood+d,0,100);}
function dossier(t){SIT.dossier.push({day:clock.day,t});if(SIT.dossier.length>30)SIT.dossier.shift();}
function priorRecords(){return SIT.dossier.length;}
function remember(w,t){if(w&&w.p&&w.p.memory)w.p.memory.push({role:'user',content:`[${t}]`});}
function say(w,t,ttl){if(!w)return;w.say={t,ttl:ttl||5};if(dist(w.x||player.x,w.y||player.y,player.x,player.y)<45||w.isInterior)nearLine(w.p.name,t,false);}
function heShe(w,m,f){return w&&w.p&&w.p.female?f:m;}

// ---------- участники ----------
function takeActor(s,w,state){if(!w)return null;if(chatNpc===w)closeChat();w.sitBy=s;w.keep=true;w.state=state||'sit';w.path=null;w.goalPoi=null;w.goalStop=null;w.waitStop=null;w.mv=null;if(!s.actors.includes(w))s.actors.push(w);return w;}
function releaseActor(w){if(!w||w.sitBy==null)return;w.sitBy=null;w.keep=false;w.mv=null;if(w.temp){const i=walkers.indexOf(w);if(i>=0)walkers.splice(i,1);return;}
  if(w.state==='sit'||w.state==='hurt'){w.node=nearestNode(w.x,w.y,world.pedAdj,120);if(w.node<0)w.node=pick(world.pedNodes);w.state='idle';w.ttl=rnd(1,4);}}
function findWalker(minR,maxR,filter){const c=[];for(const w of walkers){if(w.bus||w.inside||w.rally||w.companion||w.sitBy||w.temp||w.role!=='resident'||w.state==='hurt'||w===chatNpc)continue;if(w.state!=='walk'&&w.state!=='idle'&&w.state!=='wait')continue;const d=dist(w.x,w.y,player.x,player.y);if(d<minR||d>maxR)continue;if(filter&&!filter(w))continue;c.push([d,w]);}
  if(!c.length)return null;c.sort((a,b)=>a[0]-b[0]);return c[Math.floor(Math.random()*Math.min(4,c.length))][1];}
function crowdAround(x,y,R){let n=0;for(const w of walkers){if(w.bus||w.inside)continue;if(Math.abs(w.x-x)<R&&Math.abs(w.y-y)<R&&dist(w.x,w.y,x,y)<R)n++;}return n;}
// путь по тротуарам до точки
function moveActor(w,tx,ty,spd){const s=nearestNode(w.x,w.y,world.pedAdj,120),g=nearestNode(tx,ty,world.pedAdj,120);if(s<0||g<0){w.mv=null;return false;}
  const path=astar(world.pedAdj,s,g,pedCost);const wps=path?pathToWaypoints(path,world.pedAdj,'ped'):[];wps.push([tx,ty]);w.mv={wps,i:0,spd:spd||2.4};return true;}
function stepActor(w,dt){const m=w.mv;if(!m)return true;let st=m.spd*dt;while(st>0&&m.i<m.wps.length){const p=m.wps[m.i];const d=dist(p[0],p[1],w.x,w.y);if(d<=st){w.x=p[0];w.y=p[1];st-=d;m.i++;}else{w.hx=(p[0]-w.x)/d;w.hy=(p[1]-w.y)/d;w.x+=w.hx*st;w.y+=w.hy*st;st=0;}}
  w.phase=(w.phase||0)+dt*7*(m.spd/2.4);if(m.i>=m.wps.length){w.mv=null;return true;}return false;}
function faceTo(w,x,y){const dx=x-w.x,dy=y-w.y,L=Math.hypot(dx,dy)||1;w.hx=dx/L;w.hy=dy/L;}
function nearPoi(x,y){let best=null,bd=120;for(const p of world.pois){if(!p.n)continue;const d=dist(p.x,p.y,x,y);if(d<bd){bd=d;best=p;}}return best;}
function placeName(x,y){const p=nearPoi(x,y);const r=nearestRoadName(x,y);return p?`у «${p.n}»`:r?`на ${r}`:'неподалёку';}
function spotNear(minR,maxR){for(let k=0;k<12;k++){const an=Math.random()*TAU,R=rnd(minR,maxR);const n=nearestNode(player.x+Math.cos(an)*R,player.y+Math.sin(an)*R,world.pedAdj,60);if(n<0)continue;const q=sidewalkPos(n);const d=dist(q[0],q[1],player.x,player.y);if(d>=minR*0.7&&d<=maxR*1.3&&!inBuilding(q[0],q[1]))return q;}return null;}

// ---------- карточка выбора ----------
// sitCard({s,icon,title,text,choices:[{t,run,primary}],ttl,onTimeout,tone:'alert'|'good'|'call'})
function sitCard(o){if(SIT.card&&SIT.card!==o){if(o.urgent){SIT.queue.unshift(SIT.card);}else{SIT.queue.push(o);return o;}}
  SIT.card=o;o.left=o.ttl||0;const el=$('#sitCard');el.hidden=false;el.className=o.tone||'';$('#scIcon').textContent=o.icon||'❗';$('#scTitle').textContent=o.title||'';$('#scText').textContent=o.text||'';
  const bx=$('#scBtns');bx.innerHTML='';(o.choices||[]).forEach((c,i)=>{const b=document.createElement('button');b.className='btn'+(c.primary?' primary':'');const k=document.createElement('kbd');k.textContent=String(i+1);b.append(k,document.createTextNode(c.t));b.addEventListener('click',()=>pickChoice(o,c));bx.append(b);});
  $('#scTimer').style.width=o.ttl?'100%':'0';return o;}
function pickChoice(o,c){if(SIT.card!==o)return;closeSitCardObj(o);c.run&&c.run();}
function closeSitCardObj(o){if(SIT.card!==o)return;SIT.card=null;$('#sitCard').hidden=true;const nx=SIT.queue.shift();if(nx)setTimeout(()=>sitCard(nx),250);}
function closeSitCard(s){if(SIT.card&&SIT.card.s===s)closeSitCardObj(SIT.card);SIT.queue=SIT.queue.filter(o=>o.s!==s);}
$('#scX').addEventListener('click',()=>{const o=SIT.card;if(!o)return;closeSitCardObj(o);o.onTimeout&&o.onTimeout(true);});
window.addEventListener('keydown',e=>{if(!SIT.card||e.target&&/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;const i=parseInt(e.key,10)-1;const c=SIT.card.choices&&SIT.card.choices[i];if(c){e.preventDefault();pickChoice(SIT.card,c);}});

// ---------- метки на карте ----------
// mark(s,key,x,y,'🙋','Хозяин',{arrow:true,color})
function mark(s,key,x,y,icon,label,o){SIT.marks.set(key,Object.assign({s,x,y,icon,label},o||{}));}
function unmark(key){SIT.marks.delete(key);}

// ---------- полиция по вызову ----------
// callPatrol({x,y,target:()=>[x,y]|null,say:'…',onReach(cop,P),onFail()})
function callPatrol(o){const tgt=nearestNode(o.x,o.y,world.carAdj,150);if(tgt<0)return null;
  let car=null,bd=1e9;for(const p of policeCars){if(p.state==='scene'||p.target!=null||p.busyPatrol)continue;const dd=dist(p.x,p.y,o.x,o.y);if(dd<bd){bd=dd;car=p;}}
  if(!car||bd>150){const sn=emergencyStart({x:o.x,y:o.y},tgt);car=new Car('police',sn>=0?sn:nodeNear(world.carNodes,[o.x,o.y],300));car.vmax=16;cars.push(car);policeCars.push(car);car.tempPatrol=true;}
  car.busyPatrol=true;car.creep=null;car.target=tgt;car.sceneXY=[o.x,o.y];car.path=null;car.state='idle';car.ttl=0.3;
  const P=Object.assign({car,cop:null,t:0,reached:false,leaveT:0},o);car.onScene=()=>{car.onScene=null;spawnPatrolCop(P);};SIT.patrols.push(P);return P;}
function spawnPatrolCop(P){const sp=toSidewalk(P.car.x,P.car.y);const n=nearestNode(sp[0],sp[1],world.pedAdj,120);if(n<0){finishPatrol(P,true);return;}
  const o=new Walker('police',n);o.temp=true;o.keep=true;o.x=sp[0];o.y=sp[1];o.p.job='сотрудник ППС';o.state='sit';walkers.push(o);P.cop=o;if(P.say)say(o,P.say,4);}
function updatePatrols(dt){for(let i=SIT.patrols.length-1;i>=0;i--){const P=SIT.patrols[i];P.t+=dt;
  if(P.leaveT>0){P.leaveT-=dt;if(P.leaveT<=0)finishPatrol(P,false);continue;}
  if(!P.cop){if(P.t>120)finishPatrol(P,true);continue;}
  const T=P.target?P.target():[P.x,P.y];if(!T){if(P.t>150)finishPatrol(P,true);continue;}
  const o=P.cop;const d=dist(o.x,o.y,T[0],T[1]);
  if(d<1.9){faceTo(o,T[0],T[1]);o.walking=false;if(!P.reached){P.reached=true;P.leaveT=9;P.onReach&&P.onReach(o,P);}continue;}
  const sp=3.4*dt;const ux=(T[0]-o.x)/d,uy=(T[1]-o.y)/d;const nx=o.x+ux*sp,ny=o.y+uy*sp;if(!inBuilding(nx,ny)){o.x=nx;o.y=ny;}else{const q=toSidewalk(o.x,o.y);o.x=lerp(o.x,q[0],0.2);o.y=lerp(o.y,q[1],0.2);}o.hx=ux;o.hy=uy;o.phase=(o.phase||0)+dt*8;o.walking=true;
  if(P.t>150){finishPatrol(P,true);}}}
function finishPatrol(P,failed){const i=SIT.patrols.indexOf(P);if(i>=0)SIT.patrols.splice(i,1);if(failed&&P.onFail)P.onFail();
  if(P.cop){const j=walkers.indexOf(P.cop);if(j>=0)walkers.splice(j,1);}
  const car=P.car;car.busyPatrol=false;car.target=null;car.onScene=null;car.sceneXY=null;if(car.tempPatrol){car.remove=true;const k=policeCars.indexOf(car);if(k>=0)policeCars.splice(k,1);}else{car.state='idle';car.ttl=1;}}

// ---------- цикл ----------
function sitCanAuto(){return scene==='city'&&!player.busy&&!player.bus&&!cine&&player.state!=='hurt'&&!SIT.card&&!(typeof drunkSt!=='undefined'&&(drunkSt.patrol||drunkSt.arrestT>0))&&SIT.active.filter(s=>!s.def.quiet).length<2;}
function updateSituations(rdt){const dt=rdt;
  for(const s of SIT.active){if(s.done)continue;s.t+=dt;if(s.def.update)s.def.update(s,dt);if(s.maxT&&s.t>s.maxT)endSit(s);}
  SIT.active=SIT.active.filter(s=>!s.done);
  updatePatrols(dt);
  for(const f of SIT.watchers){try{f(dt);}catch(e){console.warn(e);}}
  // таймер карточки
  const c=SIT.card;if(c&&c.ttl){c.left-=dt;$('#scTimer').style.width=Math.max(0,c.left/c.ttl*100)+'%';if(c.left<=0){closeSitCardObj(c);c.onTimeout&&c.onTimeout(false);}}
  // случайный запуск
  SIT.timer-=dt;if(SIT.timer<=0){SIT.timer=rnd(35,70);if(sitCanAuto()){const now=sitNow();const cand=[];let sum=0;
    for(const d of Object.values(SIT.defs)){if(!d.auto||(SIT.cool[d.id]||0)>now||sitActive(d.id))continue;let ok=false;try{ok=!d.when||d.when();}catch(e){ok=false;}if(!ok)continue;const wgt=d.weight||1;cand.push([wgt,d]);sum+=wgt;}
    if(cand.length){let r=Math.random()*sum;for(const [wgt,d] of cand){r-=wgt;if(r<=0){startSit(d.id);break;}}}}}
  SIT.speedMul=SIT.active.some(s=>s.chase)?1.35:1;}
// E рядом: ситуации важнее остальных действий
function sitAction(){for(const s of SIT.active){if(s.done||!s.def.action)continue;const a=s.def.action(s);if(a)return a;}return null;}
function sitActionInterior(){for(const s of SIT.active){if(s.done||!s.def.actionInside)continue;const a=s.def.actionInside(s);if(a)return a;}return null;}

// ---------- рисование ----------
function drawSituations(toS,z){for(const s of SIT.active)if(!s.done&&s.def.draw)s.def.draw(s,toS,z);
  ctx.save();ctx.font='600 11px "IBM Plex Sans",system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
  for(const m of SIT.marks.values()){const [sx,sy]=toS(m.x,m.y);const on=sx>10&&sx<W-10&&sy>10&&sy<H-10;
    if(on){const col=m.color||'#E0A030';ctx.fillStyle=col;ctx.beginPath();ctx.arc(sx,sy-26,13,0,TAU);ctx.fill();ctx.beginPath();ctx.moveTo(sx-6,sy-16);ctx.lineTo(sx+6,sy-16);ctx.lineTo(sx,sy-6);ctx.closePath();ctx.fill();
      ctx.font='14px system-ui';ctx.fillText(m.icon,sx,sy-26);if(m.label){ctx.font='600 11px "IBM Plex Sans",system-ui';const tw=ctx.measureText(m.label).width+12;ctx.fillStyle='rgba(20,30,26,.88)';rrect(ctx,sx-tw/2,sy-56,tw,17,6);ctx.fill();ctx.fillStyle='#fff';ctx.fillText(m.label,sx,sy-47.5);}}
    else if(m.arrow){const an=Math.atan2(sy-H/2,sx-W/2);const ex=clamp(W/2+Math.cos(an)*(W/2-44),34,W-34),ey=clamp(H/2+Math.sin(an)*(H/2-110),120,H-120);ctx.fillStyle=m.color||'#E0A030';ctx.beginPath();ctx.arc(ex,ey,14,0,TAU);ctx.fill();ctx.font='14px system-ui';ctx.fillText(m.icon,ex,ey);
      ctx.save();ctx.translate(ex,ey);ctx.rotate(an);ctx.beginPath();ctx.moveTo(24,0);ctx.lineTo(15,-6);ctx.lineTo(15,6);ctx.closePath();ctx.fill();ctx.restore();}}
  ctx.restore();}

// ---------- контекст для жителей с ИИ ----------
function sitContextFor(w){let t='';const r=player.rep||0;if(r>=20)t+=' У собеседника хорошая репутация в городе — о нём говорят как о добром и надёжном человеке.';else if(r<=-20)t+=' У собеседника дурная слава в городе.';
  if(w.sitBy&&w.sitBy.def.ctx)t+=' '+w.sitBy.def.ctx(w.sitBy,w);return t;}

// цвет одежды словами: «в красной куртке»
function colorWord(hex){const m=/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(hex||'');if(!m)return 'тёмной';const r=parseInt(m[1],16)/255,g=parseInt(m[2],16)/255,b=parseInt(m[3],16)/255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2,d=mx-mn;
  if(d<0.12)return l<0.25?'чёрной':l>0.8?'белой':'серой';let h=0;if(mx===r)h=((g-b)/d)%6;else if(mx===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360;
  if(l<0.3&&h>15&&h<50)return 'коричневой';if(h<15||h>=340)return 'красной';if(h<40)return 'оранжевой';if(h<70)return 'жёлтой';if(h<165)return 'зелёной';if(h<200)return 'бирюзовой';if(h<255)return 'синей';if(h<290)return 'фиолетовой';return 'розовой';}
function awayPoint(w,R){const dx=w.x-player.x,dy=w.y-player.y,L=Math.hypot(dx,dy)||1;for(let k=0;k<8;k++){const an=Math.atan2(dy,dx)+rnd(-0.9,0.9);const n=nearestNode(w.x+Math.cos(an)*R,w.y+Math.sin(an)*R,world.pedAdj,80);if(n>=0){const q=sidewalkPos(n);if(dist(q[0],q[1],player.x,player.y)>R*0.6)return q;}}return [w.x+dx/L*R,w.y+dy/L*R];}
