// Ферзь — один житель на чёрном Урусе, номера ХАН 999. Пробки не его.
// Статус игрока: player.ferzTill (мс). Покупка 1000 ₽/сутки откроется вместе с пополнением.
const FERZ={car:null,guest:null,cool:12,rideT:0};
function ferzOn(){return !!(player&&player.ferzTill&&player.ferzTill>Date.now());}
function ferzGrant(ms){player.ferzTill=Date.now()+Math.max(60000,ms||86400000);if(typeof saveState==='function')saveState();return player.ferzTill;}
function ferzMark(c){if(!c)return;ctx.save();ctx.translate(c.x,c.y);ctx.rotate(Math.atan2(c.hy||0,c.hx||1));
  ctx.fillStyle='#C6A15B';ctx.fillRect(-1.15,-(c.wid||2)/2-0.22,2.3,0.16);
  ctx.fillStyle='#F4C542';rrect(ctx,-1.35,-0.38,2.7,0.62,0.1);ctx.fill();
  ctx.fillStyle='#1A1408';ctx.font='700 0.38px "IBM Plex Sans",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(c.plate||'ХАН 999',0,-0.07);
  ctx.restore();
  ctx.save();ctx.translate(c.x,c.y);ctx.font='700 1.5px "IBM Plex Sans",sans-serif';ctx.textAlign='center';ctx.fillStyle='#F4C542';ctx.fillText(c.who||'Ферзь',0,-3.1);ctx.restore();}
function ferzBoot(){if(FERZ.car||typeof world==='undefined'||!world||!world.carNodes||!world.carNodes.length||typeof Car!=='function')return;
  const n=typeof nodeNear==='function'?nodeNear(world.carNodes,[player.x,player.y],500):world.carNodes[0];
  const c=new Car('car',n>=0?n:world.carNodes[0]);c.ferz=true;c.color='#141414';c.len=5.15;c.wid=2.15;c.vmax=18;c.plate='ХАН 999';c.who='Ферзь';c.ttl=0.4;cars.push(c);FERZ.car=c;}
function ferzSay(who,t){if(who)who.say={t,ttl:5};if(dist((who&&who.x)||FERZ.car.x,(who&&who.y)||FERZ.car.y,player.x,player.y)<80)addEvent(`${who&&who.p?who.p.name:'Ферзь'}: ${t}`,'say');}
function ferzWomen(){const c=FERZ.car;if(!c||typeof walkers==='undefined')return [];
  return walkers.filter(w=>w&&w.p&&w.p.female&&w.p.age>=21&&w.p.age<=36&&w.state!=='hurt'&&w.state!=='companion'&&!w.ferzRide&&dist(w.x,w.y,c.x,c.y)<22);}
function ferzBoard(w,fromHer){const c=FERZ.car;if(!c||!w)return;FERZ.guest=w;FERZ.rideT=0;w.ferzRide=true;w.state='companion';
  const spot=typeof nodeNear==='function'?nodeNear(world.carNodes,[c.x+rnd(-500,500),c.y+rnd(-500,500)],450):-1;
  if(spot>=0)c.newGoal(spot);
  if(fromHer)ferzSay(w,pick(['Ферзь, прокатишь? Я ненадолго.','Прокатишь? Только без кругов по дворам.']));
  if(dist(c.x,c.y,player.x,player.y)<120)addEvent(fromHer?'Ферзь: Садись. ХАН 999, пробки не мои.':`Ферзь: ${pick(['Садись, прокачу. Номера ХАН 999.','Девушка, Урус свободный. Садись.'])}`,'say');}
function ferzDrop(){const w=FERZ.guest,c=FERZ.car;FERZ.guest=null;FERZ.cool=rnd(40,80);if(!w)return;w.ferzRide=false;if(w.state==='companion')w.state='idle';w.ttl=rnd(2,5);
  if(c){w.x=c.x-(c.hy||0)*2.2;w.y=c.y+(c.hx||1)*2.2;}
  const t=pick(['Спасибо. Мимо пробок и правда едет.','Довёз. Ещё увидимся.','Красиво. Я выйду здесь.']);w.say={t,ttl:5};
  if(dist(w.x,w.y,player.x,player.y)<90)addEvent(`${w.p.name}: ${t}`,'say');}
function ferzPlayerAction(){if(!ferzOn()||!player.vehicle||player.vehicle.kind!=='own')return null;
  let best=null,bd=7;for(const w of walkers){if(!w.p||!w.p.female||w.p.age<21||w.p.age>36||w.ferzRide||w.state==='hurt')continue;const d=dist(w.x,w.y,player.x,player.y);if(d<bd){bd=d;best=w;}}
  if(!best)return null;const name=best.p.name.split(' ')[0];
  return {label:`Прокатить ${name}`,run:()=>{best.ferzRide=true;best.state='companion';FERZ.playerGuest=best;FERZ.playerT=0;addEvent(`${best.p.name} садится к вам. Номера ХАН 999.`,'say');}};}
setTimeout(()=>{if(typeof findAction==='function'&&!findAction.ferz){const ferzAct0=findAction;const wrapped=function(){return ferzPlayerAction()||ferzAct0.apply(this,arguments);};wrapped.ferz=1;findAction=wrapped;}},0);
function ferzPlayerRide(){const w=FERZ.playerGuest;if(!w)return;FERZ.playerT=(FERZ.playerT||0)+1;
  if(!player.vehicle||!ferzOn()||FERZ.playerT>40){w.ferzRide=false;if(w.state==='companion')w.state='idle';w.x=player.x+2;w.y=player.y;const t='Спасибо, что прокатил.';w.say={t,ttl:5};addEvent(`${w.p.name}: ${t}`,'say');FERZ.playerGuest=null;return;}
  w.x=player.x-(player.hy||0)*0.2;w.y=player.y+(player.hx||0)*0.2;w.state='companion';}
function ferzTick(){ferzPlayerRide();if(typeof scene!=='undefined'&&scene!=='city')return;if(!FERZ.car||FERZ.car.crashed||!cars.includes(FERZ.car)){FERZ.car=null;FERZ.guest=null;ferzBoot();return;}
  const c=FERZ.car;if(dist(c.x,c.y,player.x,player.y)>1600&&!FERZ.guest){const n=nodeNear(world.carNodes,[player.x,player.y],280);if(n>=0){c.node=n;const p=world.nodes[n];c.x=p[0];c.y=p[1];c.path=null;c.state='idle';c.ttl=0.2;}}
  if(FERZ.guest){FERZ.rideT+=1;const w=FERZ.guest;if(!w.p||w.state==='hurt'||FERZ.rideT>55||(c.state==='idle'&&FERZ.rideT>8)){ferzDrop();return;}
    w.x=c.x-(c.hy||0)*0.15;w.y=c.y+(c.hx||0)*0.15;w.hx=c.hx;w.hy=c.hy;w.state='companion';return;}
  FERZ.cool-=1;if(FERZ.cool>0)return;FERZ.cool=rnd(18,36);
  const list=ferzWomen();if(!list.length)return;const w=pick(list);ferzBoard(w,Math.random()<0.45);}
function ferzCard(){const on=ferzOn();const left=on?Math.max(1,Math.round((player.ferzTill-Date.now())/3600000))+' ч':'не куплен';
  const text=on?`Статус ваш ещё ${left}. Чёрный Урус, номера ХАН 999, пробки объезжаете. Девушки рядом могут попросить прокатить.`
    :'1 000 ₽ в сутки. Свой чёрный Урус, номера ХАН 999, пробки не ваши. Девушки сами просят прокатить — или вы зовёте. Оплата откроется вместе с пополнением баланса. Пока так ездит только Ферзь.';
  if(typeof sitCard==='function')sitCard({icon:'👑',title:'Статус Ферзя',text,ttl:0,choices:[{t:'Понятно',primary:true,run:()=>{}}]});
  else setHint(text);}
setInterval(()=>{try{ferzTick();}catch(e){}},1000);
if(typeof enterVehicle==='function'){const ferzIn0=enterVehicle;enterVehicle=function(obj){const r=ferzIn0.apply(this,arguments);
  if(player.vehicle&&player.vehicle.kind==='own'&&ferzOn()){player.vehicle.ferz=true;player.vehicle.color='#141414';player.vehicle.plate='ХАН 999';player.vehicle.spec=Object.assign({},player.vehicle.spec,{len:5.15,wid:2.15,vmax:20});addEvent('Вы за рулём Уруса. Номера ХАН 999. Пробки не ваши.');}
  return r;};}
document.getElementById('ferzBtn')&&document.getElementById('ferzBtn').addEventListener('click',()=>{const m=document.getElementById('menuModal');if(m)m.hidden=true;if(typeof player!=='undefined')player.busy=false;ferzCard();});
window.ferzOn=ferzOn;window.ferzGrant=ferzGrant;
