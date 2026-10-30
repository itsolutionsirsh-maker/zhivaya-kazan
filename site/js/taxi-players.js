// ===== Такси между игроками (сервер — server/node/taxi.js, строки — roles.js второго программиста, запись taxi) =====
// Водитель за рулём своей машины или каршеринга подъезжает к игроку (до 25 м, почти стоя) и жмёт E «Предложить подвезти».
// Пассажир выбирает, куда: домой, куда шёл, к метро или к известному месту. Водитель называет цену от 80 до 400 ₽,
// пассажир соглашается — подходит к машине и садится: его персонажа больше не видно, он едет вместе с машиной водителя.
// На месте (до 150 м) водитель жмёт E «Высадить», или пассажир выходит сам. Деньги переводит сервер, здесь их не трогаем:
// после ответа сохраняемся, и карта встаёт по серверу (как у баристы). Выйти раньше можно — тогда без денег.
// Вслух: водитель — offer, lines в дороге, arrive, cancel; пассажир — board и thanks.
// Пассажир в дороге — как в автобусе: player.bus — машина водителя (поэтому его не видно, не идут уличные случаи и т. д.).
const TP={card:null,cardId:null,ride:null,wait:null,car:null,board:null,lineT:30,lostT:0,hintT:0};
const TP_PRICES=[80,150,250,400],TP_NEAR=25,TP_ARRIVE=150;
const TP_SIGHTS=['Казанский Кремль','Улица Баумана','Центр семьи «Казан»','ТРК «Кольцо»','Парк Горького','Чёрное озеро','Ак Барс Арена','Мечеть Кул-Шариф','Площадь Свободы','Парк Тысячелетия','Мега','Деревня Универсиады'];
function tpLive(){return typeof wsSock!=='undefined'&&wsSock&&wsSock.readyState===1&&!!Net.taxi;}
function tpSend(m){if(!tpLive())return false;try{wsSock.send(JSON.stringify(Object.assign({t:'taxi'},m)));return true;}catch(e){return false;}}
function tpLines(k){const r=(window.cityRoles||[]).find(x=>x&&x.id==='taxi'),L=r&&Array.isArray(r[k])?r[k]:[];return L.filter(s=>typeof s==='string'&&s);}
function tpSay(k){const L=tpLines(k);if(L.length&&typeof sayAloud==='function')sayAloud(pick(L));}
function tpCard(o,id){o.urgent=true;TP.card=o;TP.cardId=id||null;sitCard(o);}
function tpDrop(id){const o=TP.card;if(!o||(id&&TP.cardId!==id))return;TP.card=null;TP.cardId=null;if(SIT.card===o)closeSitCardObj(o);else SIT.queue=SIT.queue.filter(x=>x!==o);}
function tpSync(d,text){if(typeof barSync==='function')return barSync(d,text);addEvent(text,'say');if(typeof acctSave==='function')acctSave();}
function tpKm(m){return m<1000?Math.round(m/10)*10+' м':(Math.round(m/100)/10).toString().replace('.',',')+' км';}
function tpCanDrive(){const v=player.vehicle;return !!(v&&(v.kind==='own'||v.kind==='car')&&!(v.damaged>0));}
function tpPeer(){let best=null,bd=TP_NEAR;for(const [key,pr] of peerRender){if(pr.b||pr.veh)continue;const d=dist(pr.x,pr.y,player.x,player.y);if(d<bd){bd=d;best=pr;}}return best;}

// ---------- куда можно поехать: домой, куда шли, метро, известные места; ближе 350 м — пешком ----------
function tpDests(){const out=[],far=(x,y)=>Number.isFinite(x)&&Number.isFinite(y)&&dist(x,y,player.x,player.y)>=350,add=(n,x,y)=>{if(far(x,y)&&!out.some(o=>dist(o.x,o.y,x,y)<300))out.push({name:n,x,y});};
  if(player.home)add('Домой',player.home.cx,player.home.cy);
  const nd=player.navDest;if(nd)add(String(nd.n||'Куда шли').slice(0,60),nd.x,nd.y);
  {let m=null,bd=6000;for(const p of world.pois){if(p.t!=='metro'||!p.n)continue;const d=dist(p.x,p.y,player.x,player.y);if(d>=350&&d<bd){bd=d;m=p;}}if(m)add('Метро «'+String(m.n).replace(/^метро\s*/i,'')+'»',m.x,m.y);}
  const L=(window.cityLandmarks||[]).filter(l=>TP_SIGHTS.includes(l.name)&&Array.isArray(l.ll)).map(l=>{const q=llToXY(l.ll);return {name:l.name,x:q[0],y:q[1],d:dist(q[0],q[1],player.x,player.y)};})
    .filter(l=>l.d<9000).sort((a,b)=>a.d-b.d);
  for(const l of L){if(out.length>=4)break;add(l.name,l.x,l.y);}
  return out.slice(0,4);}

// ---------- E: предложить подвезти, высадить, выйти ----------
function tpAction(){if(scene!=='city'||!Net.taxi)return null;const r=TP.ride;
  if(r&&r.side==='passenger'){const there=r.dest&&dist(player.x,player.y,r.dest.x,r.dest.y)<=TP_ARRIVE;
    return {label:there?`🚕 Выйти: приехали, «${r.dest.name}»`:'🚕 Выйти здесь — без оплаты',run:()=>{if(!tpSend({k:'leave',id:r.id})){tpOut();setHint('Нет связи с сервером — вы вышли');}}};}
  if(r&&r.side==='driver'&&player.vehicle){const v=player.vehicle,there=dist(v.x,v.y,r.dest.x,r.dest.y)<=TP_ARRIVE;
    if(Math.abs(v.speed||0)>3)return {label:there?'🚕 Остановитесь, чтобы высадить':`🚕 Везёте пассажира: «${r.dest.name}» · ${tpKm(dist(v.x,v.y,r.dest.x,r.dest.y))}`,run:()=>{}};
    return {label:there?`🚕 Высадить пассажира: «${r.dest.name}»`:'🚕 Высадить пассажира здесь — без оплаты',run:()=>tpSend({k:'drop',id:r.id})};}
  if(TP.wait||!tpCanDrive()||Math.abs(player.vehicle.speed||0)>3)return null;
  const pr=tpPeer();if(!pr)return null;
  return {label:`🚕 Предложить подвезти: ${pr.name}`,run:()=>{if(typeof acct==='undefined'||!acct){setHint('Возить игроков можно только с аккаунтом: деньги между игроками считает сервер');return;}
    if(!tpSend({k:'offer',to:pr.key})){setHint('Нет связи с сервером');return;}TP.wait={key:pr.key,name:pr.name,at:performance.now()};tpSay('offer');setHint(`Ждём, скажет ли ${pr.name}, куда ехать…`);}};}
if(typeof findAction==='function'){const fa0=findAction;window.findAction=findAction=function(){return tpAction()||fa0.apply(this,arguments);};}

// ---------- пассажир едет вместе с машиной водителя ----------
function tpBoardNow(){const r=TP.ride;if(!r||r.side!=='passenger')return;TP.board=null;player.waypoints=null;player.navDest=null;
  const pr=peerRender.get(r.with);TP.car={x:pr?pr.x:player.x,y:pr?pr.y:player.y,hx:pr?pr.hx:0,hy:pr?pr.hy:1,tp:true,upcoming:()=>null};player.bus=TP.car;
  setHint(`Едем до «${r.dest.name}». E — выйти`);}
function tpOut(){const c=TP.car;if(c&&player.bus===c){player.bus=null;let ex=c.x-c.hy*2.2,ey=c.y+c.hx*2.2;if(typeof inBuilding==='function'&&inBuilding(ex,ey)){ex=c.x+c.hy*2.2;ey=c.y-c.hx*2.2;}player.x=ex;player.y=ey;}
  TP.car=null;TP.board=null;TP.ride=null;TP.lostT=0;}
// true — шаг игрока сделан здесь (идёт к машине), обычный не нужен
function tpFollow(dt){const r=TP.ride;if(!r||r.side!=='passenger')return false;const pr=peerRender.get(r.with);
  if(TP.board){const d=pr?dist(pr.x,pr.y,player.x,player.y):0;if(!pr||d<2.5||performance.now()>TP.board.until){tpBoardNow();return false;}
    const s=Math.min(d,WALK_SPEED*dt),ux=(pr.x-player.x)/d,uy=(pr.y-player.y)/d;player.x+=ux*s;player.y+=uy*s;player.hx=ux;player.hy=uy;player.phase=(player.phase||0)+dt*12;player.waypoints=null;return true;}
  if(!TP.car||player.bus!==TP.car)return false;
  if(pr){TP.car.x=pr.x;TP.car.y=pr.y;TP.car.hx=pr.hx;TP.car.hy=pr.hy;TP.lostT=0;}
  else if((TP.lostT+=dt)>15){tpSend({k:'leave',id:r.id});tpOut();addEvent('🚕 Связь с водителем пропала — вы вышли');}
  return false;}
if(typeof updatePlayer==='function'){const up0=updatePlayer;window.updatePlayer=updatePlayer=function(dt){if(TP.ride&&tpFollow(dt))return;return up0.apply(this,arguments);};}

// водитель: строки в дороге и метка цели (метка — та же, что у поездки по карте)
setInterval(()=>{const r=TP.ride;if(!r||r.side!=='driver')return;const v=player.vehicle;if(!v){return;}
  if(!v.dest)v.dest={x:r.dest.x,y:r.dest.y,n:'Пассажир: '+r.dest.name};
  if((TP.lineT-=1)<=0&&Math.abs(v.speed||0)>2){TP.lineT=35+Math.random()*25;tpSay('lines');}},1000);

// ---------- ответы сервера ----------
const TP_ERR={account:'Возить игроков можно только с аккаунтом: деньги между игроками считает сервер',young:'Возить игроков можно, когда аккаунту больше суток',
  car:'Возить можно на своей машине или каршеринге',place:'Сначала выйдите на улицу',gone:'Игрок ушёл',self:'Себя не подвезти',
  'p-account':'У этого игрока нет аккаунта — заплатить он не сможет','p-car':'Этот игрок сам за рулём',far:'Подъедьте ближе — до 25 метров',
  busy:'Вы уже договариваетесь с другим пассажиром','p-busy':'Этот игрок уже договаривается с другим водителем',
  'limit-day':'На сегодня всё: 20 поездок','limit-pair':'Этого пассажира вы уже возили — следующий раз через час',
  price:'Цена — от 80 до 400 ₽',dest:'Это место не подойдёт',short:'Слишком близко — ближе 300 метров не возят'};
const TP_CANCEL={
  passenger:{declined:{passenger:'Вы не поехали',driver:'Водитель не взял поездку'},refused:'Вы не сели',timeout:'Ответа нет — поездка отменена',
    left:'Поездка отменена: кто-то зашёл в помещение или отключился',car:'Водитель вышел из машины — поездка отменена',
    early:'Водитель высадил раньше — денег не взяли',out:'Вы вышли раньше — денег не взяли',far:'Вы были не в машине — поездка не засчитана',
    short:'Проехали меньше 300 метров — денег не взяли',fast:'Поездка не засчитана',funds:'Не хватило денег на карте — поездка без оплаты',
    'limit-day':'У водителя на сегодня всё — поездка без оплаты','limit-pair':'Этот водитель вас уже возил в этот час — поездка без оплаты',
    wallet:'Оплата не прошла',reset:'Игра начата заново — поездка отменена'},
  driver:{declined:{passenger:'Пассажир не поехал',driver:'Вы не взяли поездку'},refused:'Пассажир не сел',timeout:'Ответа нет — поездка отменена',
    left:'Поездка отменена: кто-то зашёл в помещение или отключился',car:'Вы вышли из машины — поездка отменена',
    early:'Вы высадили раньше — денег не взяли',out:'Пассажир вышел раньше — денег не взяли',far:'Пассажир был не в машине — поездка не засчитана',
    short:'Проехали меньше 300 метров — денег не взяли',fast:'Поездка не засчитана',funds:'У пассажира не хватило денег — поездка без оплаты',
    'limit-day':'На сегодня всё: 20 поездок','limit-pair':'Этого пассажира вы уже возили в этот час',wallet:'Оплата не прошла',reset:'Игру начали заново — поездка отменена'}};
function tpApply(d){if(!d||typeof d!=='object')return;
  if(d.k==='offer'){const ds=tpDests();
    tpCard({icon:'🚕',title:`${d.from.name} предлагает подвезти`,text:ds.length?'Скажите, куда. Цену назовёт водитель, от 80 до 400 ₽ — поедете, только если согласитесь. Платить, когда довезут.':'Отсюда ехать некуда — всё рядом.',ttl:50,
      choices:ds.map((q,i)=>({t:q.name,primary:i===0,run:()=>{TP.card=null;tpSend({k:'dest',id:d.id,to:q});setHint('Водитель называет цену…');}}))
        .concat([{t:'Не надо, спасибо',run:()=>{TP.card=null;tpSend({k:'dest',id:d.id,to:null});}}]),
      onTimeout:()=>{TP.card=null;tpSend({k:'dest',id:d.id,to:null});}},d.id);return;}
  if(d.k==='wait'){setHint(`Ждём, скажет ли ${d.to.name}, куда ехать…`);return;}
  if(d.k==='dest'){
    tpCard({icon:'🚕',title:`${d.name}: до «${d.dest.name}», ${String(d.km).replace('.',',')} км`,text:'Назовите цену. Пассажир сам решит, садиться ли. Деньги — вам на карту, когда довезёте.',ttl:50,
      choices:TP_PRICES.map((p,i)=>({t:fmtMoney(p),primary:i===1,run:()=>{TP.card=null;tpSend({k:'price',id:d.id,price:p});setHint('Цена названа — ждём, сядет ли пассажир…');}}))
        .concat([{t:'Отказать',run:()=>{TP.card=null;tpSend({k:'price',id:d.id,price:0});}}]),
      onTimeout:()=>{TP.card=null;tpSend({k:'price',id:d.id,price:0});}},d.id);return;}
  if(d.k==='asked'||d.k==='priced')return;
  if(d.k==='price'){
    tpCard({icon:'🚕',title:`${d.name}: до «${d.dest.name}» — ${fmtMoney(d.price)}`,text:'Оплата с карты, когда довезут. Выйдете раньше — без денег.',ttl:50,
      choices:[{t:`Сесть за ${fmtMoney(d.price)}`,primary:true,run:async()=>{TP.card=null;try{if(typeof acctSave==='function')await acctSave();}catch(e){}tpSend({k:'board',id:d.id,yes:true});}},   // сначала свои деньги — на сервер
        {t:'Отказаться',run:()=>{TP.card=null;tpSend({k:'board',id:d.id,yes:false});}}],
      onTimeout:()=>{TP.card=null;tpSend({k:'board',id:d.id,yes:false});}},d.id);return;}
  if(d.k==='go'){tpDrop(d.id);TP.wait=null;TP.ride={id:d.id,side:d.side,with:d.to.id,name:d.to.name,dest:d.dest,price:d.price};
    if(d.side==='passenger'){TP.board={until:performance.now()+4500};player.navDest=null;tpSay('board');addEvent(`🚕 Вы садитесь в машину: водитель — ${d.to.name}, до «${d.dest.name}» за ${fmtMoney(d.price)}. Платить, когда довезут`);}
    else{TP.lineT=25;const v=player.vehicle;if(v)v.dest={x:d.dest.x,y:d.dest.y,n:'Пассажир: '+d.dest.name};addEvent(`🚕 ${d.to.name} садится. Везите до «${d.dest.name}» — ${fmtMoney(d.price)}, когда довезёте. Руль — ваш, или поедем по маршруту`);
      setTimeout(()=>{const r=TP.ride,v2=player.vehicle;if(r&&r.id===d.id&&v2&&!v2.auto&&Math.abs(v2.speed||0)<1&&typeof driveTo==='function'&&driveTo(r.dest.x,r.dest.y,true))v2.dest={x:r.dest.x,y:r.dest.y,n:'Пассажир: '+r.dest.name};},3500);}
    return;}
  if(d.k==='done'){tpDrop(d.id);
    if(d.side==='passenger'){tpOut();player.mood=clamp(player.mood+4,0,100);tpSay('thanks');tpSync(-d.price,`🚕 Доехали до «${d.dest.name}»: −${fmtMoney(d.price)}. Водитель — ${d.name}`);setHint('Приехали');}
    else{TP.ride=null;const v=player.vehicle;if(v&&v.dest&&/^Пассажир: /.test(v.dest.n))v.dest=null;tpSay('arrive');
      tpSync(d.price,`🚕 Поездка до «${d.dest.name}» оплачена: +${fmtMoney(d.price)}. Пассажир — ${d.name}. Сегодня ${d.today} из ${d.max}, за неделю ${d.week}`);}
    return;}
  if(d.k==='cancel'){tpDrop(d.id);const wasRide=!!TP.ride,wasMine=!!(TP.wait||TP.ride);
    if(d.side==='passenger')tpOut();else{TP.ride=null;const v=player.vehicle;if(v&&v.dest&&/^Пассажир: /.test(v.dest.n))v.dest=null;}
    TP.wait=null;const m=(TP_CANCEL[d.side]||{})[d.why];const t=(m&&typeof m==='object'?m[d.by]:m)||'Поездка отменена';
    if(d.side==='driver'&&wasMine&&d.why!=='reset'&&d.why!=='left')tpSay('cancel');
    if(wasRide||!(d.why==='declined'&&d.by===d.side))addEvent('🚕 '+t);setHint(t);return;}
  if(d.k==='err'){TP.wait=null;setHint(TP_ERR[d.e]||'Не получилось');return;}}
window.tpApply=tpApply;
// ждали ответа пассажира, а сервер молчит (разрыв связи) — через полторы минуты снова можно предлагать
setInterval(()=>{if(TP.wait&&performance.now()-TP.wait.at>90e3)TP.wait=null;if(TP.ride&&!tpLive()&&TP.ride.side==='passenger'&&(TP.lostT+=1)>20){tpOut();addEvent('🚕 Связь пропала — вы вышли');}},1000);

// ---------- «Таксист недели» — в окне «Работа», у кого есть своя машина ----------
if(typeof renderJobs==='function'){const rj=renderJobs;window.renderJobs=renderJobs=function(){rj.apply(this,arguments);if(!Net.taxi||!(typeof ownCar!=='undefined'&&ownCar))return;
  const head=$('#jobsMine');if(!head)return;const c=document.createElement('div');c.className='rt-card';c.id='taxiTop';const b=document.createElement('b');b.textContent='🚕 Таксист недели';
  const s=document.createElement('span');s.textContent='На своей машине можно подвозить игроков: подъедьте к игроку и нажмите E. Цену называете вы, от 80 до 400 ₽, деньги — вам на карту, когда довезёте.';
  const ol=document.createElement('ol');ol.className='bar-top';c.append(b,s,ol);head.append(c);
  (async()=>{try{const r=await fetch('api.php?a=ratings',{cache:'no-store'});const j=r.ok?await r.json():null;const list=j&&j.ok&&Array.isArray(j.taxiWeek)?j.taxiWeek:null;if(!list)return;
    if(!list.length){const li=document.createElement('li');li.textContent='На этой неделе ещё никто никого не подвёз';ol.append(li);return;}
    for(const x of list){const li=document.createElement('li');li.textContent=`${x.name} — ${x.n}`;ol.append(li);}}catch(e){}})();};}
