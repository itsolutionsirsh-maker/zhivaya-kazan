// ===== Опьянение: пиво в баре → шатает, тянет поорать на прохожих → бармен выставляет → прохожие вызывают полицию → ночь в отделе =====
// player.drunk 0…100. 20+ навеселе, 45+ пьян (шатает, сам выкрикивает), 70+ в стельку (бредёт сам по себе).
const DRUNK_SHOUTS=['Вы все волки!','Чё смотришь? Иди сюда, поговорим!','Я тут всех знаю, понял?!','Братан, ты меня уважаешь?','Фраера, расступись — я иду!',
  'Кто тут главный? Я тут главный!','Начальник, я не пьяный, я уставший!','Слышь, эчпочмак есть? А если найду?','Казань — мой город, ясно?!','Чё ты лыбишься, а?',
  'Жизнь — боль, а вы все — волки!','Щас я вам всем всё объясню!','Ты кто по жизни вообще?','Ой, моро-о-оз, моро-о-оз… (поёт)','Ты на кого батон крошишь?',
  'Всем стоять, я ещё не всё сказал!','Э, слышь, ты с какого района?','Да я в девяностые… ик… ладно, проехали!','Где мой самокат?! Кто украл самокат?!','Я вас всех люблю! Нет. Не всех. Вы — волки!'];
const DRUNK_TIPSY=['Ик!','Хорошо сидим…','Ещё по одной?','Ик! Пардон.','Жизнь удалась!'];
const DRUNK_REACT=['Иди проспись!','Мужчина, успокойтесь!','Э, полегче!','Я сейчас полицию вызову!','Вот это ты набрался…','Не позорь Казань!','Тебе домой пора, друг.','Фу, перегаром несёт…'];
const BARMAN_OUT=['Всё, тебе хватит! На выход — проветрись.','Брат, ты уже хороший. Давай на улицу, не пугай гостей.','Всё-всё, бар закрыт для тебя на сегодня. На выход!'];
const COP_LINES=['Гражданин, вы пьяны. Пройдёмте в машину.','Так, нарушаем общественный порядок? Пройдёмте.','Документы есть? Нет? Тогда в отдел, там разберёмся.'];
const drunkSt={shoutT:6,heat:0,heatT:0,idleT:0,wanderT:0,kick:0,cop:null,car:null,called:false,arrestT:0,warned:false};

function drunkLevel(){const d=player.drunk||0;return d>=70?3:d>=45?2:d>=20?1:0;}
function drunkLabel(){return ['','навеселе','пьян','в стельку'][drunkLevel()];}
function addDrink(alc,what){player.drunk=clamp((player.drunk||0)+alc,0,100);const L=drunkLevel();
  if(L>=2&&!drunkSt.warned){drunkSt.warned=true;addEvent(`${player.name} заметно пьян. Аккуратнее: за руль нельзя, а буянить на улице — до первого патруля`,'alert');}
  else if(L===1)setHint('Вы навеселе. Ещё пара кружек — и начнёт шатать');}

// пьяная походка: направление «гуляет», скорость рывками
function drunkSway(mx,my){const d=player.drunk||0;if(d<20)return [mx,my,1];const t=performance.now()/1000;const k=(d-15)/85;
  const a=Math.sin(t*1.9)*0.55*k+Math.sin(t*4.7+1.3)*0.25*k;const c=Math.cos(a),s=Math.sin(a);return [mx*c-my*s,mx*s+my*c,1-0.3*k+0.15*k*Math.sin(t*3.1)];}
// пьяная речь в чате «Рядом»
function drunkify(txt){const d=player.drunk||0;if(d<45)return txt;let s=txt.replace(/([аеиоуыэюя])/gi,(m)=>Math.random()<0.12?m+m+m:m);if(Math.random()<0.6)s+=pick([' …ик!',' Ик!',' (икает)']);return s.slice(0,140);}

function drunkShout(t){player.say={t,ttl:4.5};saySent={t,i:++sayCounter};nearLine(player.name,t,true);pushPresence();}
function nearestListener(R){let best=null,bd=R;if(scene==='interior'&&interior){for(const n of interior.npcs){if(n.companionOf)continue;const d=dist(n.x,n.y,player.ix,player.iy);if(d<bd){bd=d;best=n;}}return best;}
  for(const w of walkers){if(w.bus||w.inside||w.state==='hurt'||w.companion||w.rally||w===drunkSt.cop)continue;const d=dist(w.x,w.y,player.x,player.y);if(d<bd){bd=d;best=w;}}return best;}

function updateDrunk(dt){
  const d=player.drunk||0;document.body.classList.toggle('drunk',d>=45);document.body.classList.toggle('wasted',d>=70);
  if(d>0)player.drunk=Math.max(0,d-dt*0.2);   // трезвеет: ~8 минут от «в стельку» до нуля
  if(drunkSt.cop||drunkSt.car)updateDrunkCop(dt);
  if(d<=0||player.drunk<=0)return;
  if(player.drunk<20&&d>=20){drunkSt.warned=false;addEvent('Хмель выветрился. Голова побаливает, но жить можно');}
  if(player.busy||player.state==='hurt'||player.bus||cine||drunkSt.arrestT>0)return;
  const L=drunkLevel();
  // сам выкрикивает
  drunkSt.shoutT-=dt;
  if(drunkSt.shoutT<=0){drunkSt.shoutT=L>=3?rnd(4,7):L===2?rnd(7,12):rnd(18,30);
    if(L>=2){drunkShout(pick(DRUNK_SHOUTS));const w=nearestListener(14);
      if(w){setTimeout(()=>{if(!w.say||w.say.ttl<1){const r=pick(DRUNK_REACT);w.say={t:r,ttl:4};nearLine(w.p.name,r,false);}},1100);
        if(!w.isInterior&&!w.companion&&w.state!=='drunkcop'){const ax=w.x-player.x,ay=w.y-player.y,al=Math.hypot(ax,ay)||1;w.hx=ax/al;w.hy=ay/al;}}
      if(scene==='city'&&w&&!w.isInterior)drunkSt.heat+=1;
      if(scene==='interior'&&interior&&/bar|cafe/.test(interior.kind))drunkSt.kick+=1;
      if(companion&&Math.random()<0.35){const cw=scene==='interior'?compNpcInside():companion.w;if(cw){const t=pick(['Тише ты, люди смотрят!','Ну всё, хватит на сегодня…','Пойдём я тебя домой отведу?','Эх, зря мы взяли четвёртую…']);setTimeout(()=>{cw.say={t,ttl:4};nearLine(cw.p.name,t,false);},2200);}}}
    else if(L===1&&Math.random()<0.6){player.say={t:pick(DRUNK_TIPSY),ttl:2.5};}}
  // бармен выставляет за дверь
  if(scene==='interior'&&interior&&/bar|cafe/.test(interior.kind)&&L>=2&&drunkSt.kick>=2&&!drunkSt.kicking){drunkSt.kicking=true;const bm=interior.npcs.find(n=>n.role==='staff')||interior.npcs[0];const t=pick(BARMAN_OUT);
    if(bm){bm.say={t,ttl:5};nearLine(`${bm.p.name} (${bm.p.job})`,t,false);}
    setTimeout(()=>{drunkSt.kicking=false;drunkSt.kick=0;if(scene==='interior'&&interior){const nm=interior.name;if(orderCtx)closeOrder();if(chatNpc)closeChat();exitInterior();addEvent(`Вас выставили из «${nm}». На улице свежо…`,'alert');drunkSt.shoutT=2;}},2600);}
  // в стельку и стоит без дела — бредёт сам куда глаза глядят
  if(L>=3&&scene==='city'&&!player.vehicle&&!player.escort){const idle=!(player.waypoints&&player.waypoints.length);drunkSt.idleT=idle?drunkSt.idleT+dt:0;
    if(drunkSt.idleT>3.5){drunkSt.idleT=0;const n=nodeNear(world.pedNodes,[player.x+rnd(-25,25),player.y+rnd(-25,25)],30);const q=sidewalkPos(n);if(dist(q[0],q[1],player.x,player.y)<45&&!inBuilding(q[0],q[1]))player.waypoints=[q];}}
  if(L>=3&&scene==='interior'&&interior&&!player.iwp&&Math.random()<dt*0.25){player.iwp=[clamp(player.ix+rnd(-2.5,2.5),1,interior.w-1),clamp(player.iy+rnd(-2,2),2.4,interior.h-1.2)];}
  // буянит на улице — кто-то из прохожих звонит в полицию
  if(scene==='city'){drunkSt.heatT+=dt;if(drunkSt.heatT>40){drunkSt.heatT=0;drunkSt.heat=Math.max(0,drunkSt.heat-1);}
    if(drunkSt.heat>=3&&!drunkSt.called&&L>=2)callCopsOnDrunk();}}

function callCopsOnDrunk(){drunkSt.called=true;drunkSt.heat=0;const caller=nearestListener(25);
  if(caller){const t='Алло, полиция? Тут пьяный буянит, на людей кидается!';caller.say={t,ttl:5};nearLine(caller.p.name,t,false);}
  addEvent(`Прохожий вызвал полицию: ${nearestRoadName(player.x,player.y)?'на '+nearestRoadName(player.x,player.y)+' ':''}буянит пьяный`,'alert');
  const tgt=nearestNode(player.x,player.y,world.carAdj,150);if(tgt<0){drunkSt.called=false;return;}
  let car=null,bd=1e9;for(const p of policeCars){if(p.state==='scene'||p.target!=null)continue;const dd=dist(p.x,p.y,player.x,player.y);if(dd<bd){bd=dd;car=p;}}
  const fake={x:player.x,y:player.y};
  if(!car||bd>260){const sn=emergencyStart(fake,tgt);const c=new Car('police',sn>=0?sn:nodeNear(world.carNodes,[player.x,player.y],300));c.vmax=16;cars.push(c);policeCars.push(c);c.tempPatrol=true;car=c;}
  car.creep=null;car.target=tgt;car.sceneXY=[player.x,player.y];car.path=null;car.state='idle';car.ttl=0.3;drunkSt.car=car;
  car.onScene=()=>{car.onScene=null;spawnDrunkCop(car);};}

function spawnDrunkCop(car){const sp=toSidewalk(car.x,car.y);const n=nearestNode(sp[0],sp[1],world.pedAdj,120);if(n<0){releaseCops();return;}
  const o=new Walker('police',n);o.temp=true;o.x=sp[0];o.y=sp[1];o.p.job='сотрудник ППС';o.state='drunkcop';o.ttl=9e9;walkers.push(o);drunkSt.cop=o;drunkSt.copT=0;
  const t='Так, где тут у нас нарушитель?';o.say={t,ttl:4};nearLine(o.p.name+' (полиция)',t,false);}

function updateDrunkCop(dt){const o=drunkSt.cop;const car=drunkSt.car;
  if(!o){if(car&&car.state==='scene'&&!car.onScene)spawnDrunkCop(car);return;}
  drunkSt.copT+=dt;
  // игрок ушёл в здание или уехал — патруль ждёт, потом уезжает
  if(scene==='interior'||player.bus||player.vehicle){if(drunkSt.copT>60){addEvent('Патруль не дождался и уехал');releaseCops();}return;}
  const dd=dist(o.x,o.y,player.x,player.y);
  if(drunkSt.arrestT>0){drunkSt.arrestT-=dt;if(drunkSt.arrestT<=0)nightInStation();return;}
  if(dd<1.8){
    if((player.drunk||0)<30){const t='Ладно, вроде трезвый. Иди домой и больше не буянь.';o.say={t,ttl:5};nearLine(o.p.name+' (полиция)',t,false);addEvent('Полиция ограничилась предупреждением');releaseCops();return;}
    const t=pick(COP_LINES);o.say={t,ttl:5};nearLine(o.p.name+' (полиция)',t,false);
    player.waypoints=null;player.escort=false;if(chatNpc)closeChat();if(orderCtx)closeOrder();player.busy=true;startCine('arrest','Вас задерживает полиция',3.2);cine.sub='Ночь в отделе полиции…';drunkSt.arrestT=3.2;return;}
  // идёт к игроку (чуть быстрее пьяного)
  const sp=3.4*dt;const ux=(player.x-o.x)/dd,uy=(player.y-o.y)/dd;const nx=o.x+ux*sp,ny=o.y+uy*sp;
  if(!inBuilding(nx,ny)){o.x=nx;o.y=ny;}else{const q=toSidewalk(o.x,o.y);o.x=lerp(o.x,q[0],0.2);o.y=lerp(o.y,q[1],0.2);}o.hx=ux;o.hy=uy;o.phase=(o.phase||0)+dt*8;
  if(drunkSt.copT>90){addEvent('Патруль потерял вас из виду');releaseCops();}}

function releaseCops(){const o=drunkSt.cop,car=drunkSt.car;if(o){const i=walkers.indexOf(o);if(i>=0)walkers.splice(i,1);}
  if(car){car.target=null;car.onScene=null;car.sceneXY=null;if(car.tempPatrol){car.remove=true;const j=policeCars.indexOf(car);if(j>=0)policeCars.splice(j,1);}else{car.state='idle';car.ttl=1;}}
  drunkSt.cop=null;drunkSt.car=null;drunkSt.called=false;drunkSt.heat=0;drunkSt.arrestT=0;}

function nightInStation(){releaseCops();player.busy=false;
  if(companion){const w=companion.w;const t='Ну ты дал… Ладно, я домой. Созвонимся.';nearLine(w.p.name,t,false);stopCompanion(true);}
  if(typeof cancelTrip==='function')cancelTrip(true);player.waitingStop=null;
  const fine=1000;player.money=Math.max(0,player.money-fine);player.drunk=0;drunkSt.warned=false;
  const day0=Math.floor(clock.minutes/1440);clock.minutes=(day0+1)*1440+7*60;player.energy=55;player.food=clamp(player.food-20,0,100);player.mood=clamp(player.mood-20,0,100);
  const st=world.pois.filter(p=>p.t==='police');let ps=null,bd=1e9;for(const p of st){const d=dist(p.x,p.y,player.x,player.y);if(d<bd){bd=d;ps=p;}}
  if(ps){const q=toSidewalk(ps.x,ps.y);player.x=q[0];player.y=q[1];cam.x=player.x;cam.y=player.y;enterInterior({kind:'police',name:ps.n||'Отдел полиции',key:'poi'+ps.i,x:player.x,y:player.y});
    const duty=interior&&interior.npcs.find(n=>n.role==='police');if(duty){const t='Проснулся? Протокол подпиши — и свободен. И больше так не делай.';duty.say={t,ttl:7};nearLine(duty.p.name+' (дежурный)',t,false);}}
  addEvent(`Утро в отделе полиции. Протокол по ст. 20.21 КоАП (появление в пьяном виде) — штраф ${fmtMoney(fine)}. Настроение −20`,'alert');
  setHint('Вас отпустили. Выход — внизу');}
