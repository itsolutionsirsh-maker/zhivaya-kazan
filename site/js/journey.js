// Общая поездка: выбор транспорта, подход, посадка и последний пеший участок.
// Маршруты считает движок. ИИ и отдельные таймеры здесь не нужны.
const JOURNEY={rental:null,resume:null,restored:new WeakSet(),settled:[]};
window.journeyVisualHints=[];
function isLightVehicle(kind){return kind==='scooter'||kind==='bike';}
function journeyIcon(kind){return {bike:'🚲',scooter:'🛴',car:'🚙',own:'🚗',taxi:'🚕',bus:'🚌'}[kind]||'🚶';}
function journeyHint(kind,vehicle,fromX,fromY,toX,toY){
  const now=performance.now(),a=window.journeyVisualHints;
  while(a.length&&(a.length>=8||now-a[0].startedAt>600))a.shift();
  a.push({kind,x:vehicle.x,y:vehicle.y,fromX,fromY,toX,toY,startedAt:now,durationMs:450});
}
function journeyDest(d){return d&&Number.isFinite(d.x)&&Number.isFinite(d.y)?{x:d.x,y:d.y,n:String(d.n||'Место').slice(0,100)}:null;}
function journeyAvailable(){return scene==='city'&&!player.inside&&!player.bus&&!player.vehicle&&player.state!=='hurt';}
function journeyRental(kind){
  if(kind==='own')return ownCar&&ownCar.parked?ownCar:null;
  let best=null,bd=650;for(const r of rentals){if(r.kind!==kind)continue;const d=dist(player.x,player.y,r.x,r.y);if(d<bd){bd=d;best=r;}}return best;
}
function journeyPresent(o){return o&&(o.kind==='own'?o===ownCar&&o.parked:rentals.includes(o));}
function journeyRentalQuote(o,d){
  const spec=VEH[o.kind],light=isLightVehicle(o.kind);
  const walk=pathLen(world.pedAdj,player.x,player.y,o.x,o.y,pedCost);
  const ride=pathLen(light?world.pedAdj:world.carAdj,o.x,o.y,d.x,d.y,light?pedCost:carCost);
  const sec=walk/WALK_SPEED+ride/(light?spec.vmax:9);
  const cost=spec.start+Math.round(Math.max(1,ride/(light?spec.vmax:9)/60*GAME_SCALE)*spec.perMin);
  return {walk,ride,sec,cost};
}
function journeyCards(card,d){
  for(const kind of ['scooter','bike','car','own']){
    const spec=VEH[kind],o=journeyRental(kind),title=spec.label[0].toUpperCase()+spec.label.slice(1);
    if(!o){card(journeyIcon(kind),title,[kind==='own'?'Своя машина сейчас недоступна':'Рядом нет свободного транспорта'],'Недоступно',()=>{},true);continue;}
    const q=journeyRentalQuote(o,d),ok=Number.isFinite(q.sec);
    card(journeyIcon(kind),title,ok?[`${fmtDist(q.walk)} до транспорта · ≈ ${fmtMin(q.sec)} всего`,spec.perMin?`≈ ${fmtMoney(q.cost)} · ${spec.start} ₽ старт + ${spec.perMin} ₽/игр. мин`:'Без аренды · расходы своей машины сохраняются']:
      ['Подходящий маршрут пока не найден'],ok?'Подойти и поехать':'Нет маршрута',()=>{if(startRentalPlan(o,d))closeRouteModal();},!ok||player.money<q.cost||!journeyAvailable());
  }
}
function startRentalPlan(o,d){
  if(!journeyAvailable()||!journeyPresent(o)){setHint('Транспорт уже недоступен. Выберите другой');return false;}
  const q=journeyRentalQuote(o,d);if(!Number.isFinite(q.sec)){setHint('Не нашли путь к месту или транспорту');return false;}
  if(player.money<q.cost){setHint('Не хватает денег на поездку по этому маршруту');return false;}
  cancelTrip(true);JOURNEY.rental={object:o,dest:journeyDest(d),stage:'walk'};followPlayer();
  if(dist(player.x,player.y,o.x,o.y)>4&&!walkTo(o.x,o.y,true)){JOURNEY.rental=null;return false;}
  addEvent(`${journeyIcon(o.kind)} Идём к транспорту: ${VEH[o.kind].label}`);updateTripBox();return true;
}
function journeyAction(){
  const p=JOURNEY.rental;if(!p||!journeyAvailable()||!journeyPresent(p.object)||dist(player.x,player.y,p.object.x,p.object.y)>4.5)return null;
  const o=p.object;return actTarget({label:`Поехать: ${VEH[o.kind].label} · до «${p.dest.n}»`,run:()=>enterVehicle(o)},o,o.kind==='car'?'share':o.kind);
}
function journeyOnBoard(v,o,route){
  const p=JOURNEY.rental;if(!p||p.object!==o){JOURNEY.rental=null;return;}
  JOURNEY.rental=null;v.dest=p.dest;
  if(route)v.auto={wps:route,i:0};else if(!driveTo(p.dest.x,p.dest.y,true))setHint('Маршрут изменился. Можно выйти или выбрать другое место');
  updateTripBox();
}
function journeyFinishFoot(d){
  if(!d)return;if(dist(player.x,player.y,d.x,d.y)<14){addEvent(`Вы на месте: ${d.n}`);setHint(`Вы на месте: ${d.n}`);return;}
  startWalkNav(d);
}
function journeyTick(){
  const p=JOURNEY.rental;if(!p)return;
  if(!journeyPresent(p.object)){JOURNEY.rental=null;player.waypoints=null;setHint('Транспорт больше недоступен. Выберите другой');return;}
  if(!journeyAvailable()){JOURNEY.rental=null;return;}
  if(dist(player.x,player.y,p.object.x,p.object.y)<4.5){p.stage='board';player.waypoints=null;}
}
function journeyText(){
  const p=JOURNEY.rental;if(p)return `${journeyIcon(p.object.kind)} ${p.stage==='board'?'Транспорт рядом · нажмите E':'Идём к транспорту'} · ${p.dest.n}`;
  const v=player.vehicle;if(v&&v.dest)return `${journeyIcon(v.kind)} ${v.auto?'Едем':'Остановились'}: ${v.dest.n} · ${fmtDist(dist(player.x,player.y,v.dest.x,v.dest.y))}`;
  if(JOURNEY.resume)return `🚶 Поездка прервана · ${JOURNEY.resume.n}`;return null;
}
function journeyBill(v){if(!v)return 0;return v.kind==='taxi'?(v.fixedFare!=null?v.fixedFare:Math.round(TAXI.base+(v.odo||0)/1000*TAXI.km)):Math.round(Math.max(1,clock.minutes-v.startMin)*v.spec.perMin);}
function journeyCharge(amount,label){
  const paid=Math.min(player.money,Math.max(0,amount));player.money-=paid;
  const owed=Math.max(0,amount-paid);if(owed&&typeof ECON!=='undefined')ECON.owed=(ECON.owed||0)+owed;
  if(amount)addEvent(`${label}: ${fmtMoney(amount)}${owed?' · часть суммы записана в долг':''}`);
}
function journeyDump(){
  const v=player.vehicle,d=(v&&v.dest)||(taxiCall&&taxiCall.dest)||(player.busPlan&&player.busPlan.dest)||(JOURNEY.rental&&JOURNEY.rental.dest)||player.navDest||JOURNEY.resume;
  if(!v&&!d&&!player.bus)return null;
  return {v:1,dest:journeyDest(d),mode:v?v.kind:player.bus?'bus':'walk',due:v?journeyBill(v):0,x:player.x,y:player.y};
}
// Квитанция относится к целому исходному снимку, а не только к цене поездки.
// Не используем отдельный ключ localStorage: баланс и закрытый счёт пишутся атомарно.
function journeyReceiptKey(state){
  const s=state&&state.journey;
  if(!s||s.v!==1||!Number.isFinite(state.t)||!Number.isFinite(s.due)||s.due<=0||s.due>=1000000)return null;
  const d=s.dest||{};
  const key=JSON.stringify([state.t,state.minutes,state.money,state.econ&&state.econ.owed||0,s.v,s.mode,s.due,s.x,s.y,d.x,d.y,d.n]);
  return key.length<=2048?key:null;
}
function journeyReceipts(state){return Array.isArray(state&&state.journeySettled)?state.journeySettled.filter(k=>typeof k==='string'&&k.length<=2048).slice(-16):[];}
function journeyKeepLocal(incoming){
  const key=journeyReceiptKey(incoming);if(!key)return false;
  try{return journeyReceipts(JSON.parse(localStorage.getItem('zk.state')||'null')).includes(key);}catch(e){return false;}
}
function journeyCheckpoint(state){
  if(!state||window.zkNoSave)return;
  const key=journeyReceiptKey(state);
  if(key)JOURNEY.settled=[...JOURNEY.settled.filter(k=>k!==key),key].slice(-16);
  // loadState ещё не закончил запуск мира: saveState здесь мог бы пересобрать
  // незагруженные подсистемы. Сохраняем исходный снимок, меняя только расчёт поездки.
  const next=Object.assign({},state,{t:Date.now(),x:player.x,y:player.y,money:player.money,
    econ:Object.assign({},state.econ,{owed:ECON.owed}),journey:journeyDump(),journeySettled:JOURNEY.settled});
  try{localStorage.setItem('zk.state',JSON.stringify(next));}
  catch(e){setHint('Не удалось сохранить оплату поездки. Освободите место в хранилище браузера');}
}
// После загрузки не восстанавливаем устаревшие ссылки на автобус/машину. Сохраняем цель,
// закрываем счёт на момент сохранения и даём выбрать свежий транспорт без платы за офлайн.
function journeyRestore(s,state){
  if(!s||s.v!==1||JOURNEY.restored.has(s))return;JOURNEY.restored.add(s);JOURNEY.rental=null;JOURNEY.resume=journeyDest(s.dest);
  if(Number.isFinite(s.due)&&s.due>0&&s.due<1000000)journeyCharge(s.due,'Прерванная поездка');
  if(s.mode!=='walk'){const q=toSidewalk(player.x,player.y);if(q&&!inBuilding(q[0],q[1])){player.x=q[0];player.y=q[1];cam.x=q[0];cam.y=q[1];}}
  if(Number.isFinite(s.due)&&s.due>0&&s.due<1000000)journeyCheckpoint(state);
  updateTripBox();
}
