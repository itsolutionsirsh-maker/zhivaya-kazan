// ===== Работа и быт: смены (опоздание, выговор, увольнение), курьер, аренда и ЖКУ, простуда и аптека, шумные соседи, прорвало трубу =====
const gHour=()=>(clock.minutes/60)%24;
const gMin=()=>clock.minutes%1440;
function fmtHM(h){const hh=Math.floor(h)%24,mm=Math.round((h-Math.floor(h))*60);return String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0');}
function interiorNear(pred,R){if(!interior)return null;let best=null,bd=R||1.1;for(const f of interior.furn){if(!pred(f))continue;const d=Math.max(Math.abs(player.ix-f.x)-f.w/2,Math.abs(player.iy-f.y)-f.h/2);if(d<bd){bd=d;best=f;}}return best;}
function staffNpc(){return interior?interior.npcs.find(n=>n.role==='staff')||interior.npcs.find(n=>!n.companionOf)||null:null;}

// ---------- вакансии ----------
const WORK={
  barista:{t:'Бариста',kinds:['cafe'],start:9,len:2,pay:2400,spot:f=>f.spot==='counter',verb:'Обслужить',orders:['Капучино, пожалуйста!','Мне латте с собой','Чай с чак-чаком, будьте добры','Американо без сахара','Эчпочмак и чай!']},
  bartender:{t:'Бармен',kinds:['bar'],start:18,len:2,pay:3000,spot:f=>f.spot==='counter',verb:'Налить',orders:['Светлое, пожалуйста!','Лимонад со льдом','Повторите нам!','Облепиховую, две']},
  seller:{t:'Продавец',kinds:['shop','market','pharmacy'],start:10,len:2,pay:2200,spot:f=>f.spot==='shelf'||f.spot==='cash',verb:'Работа',orders:['Выложить товар на полку','Пробить покупку на кассе','Помочь покупателю найти товар']},
  office:{t:'Офис-менеджер',kinds:['office','bank'],start:9,len:2,pay:3200,spot:f=>f.t==='desk'||f.spot==='counter',verb:'Работа',orders:['Ответить на письмо клиента','Свести табличку для начальника','Созвон с подрядчиком','Подготовить договор']},
  courier:{t:'Курьер доставки',courier:true,pay:0}};
function vacancies(){const out=[];const seen=new Set();const near=world.pois.filter(p=>p.n&&dist(p.x,p.y,player.x,player.y)<1100).sort(()=>Math.random()-0.5);
  for(const [id,J] of Object.entries(WORK)){if(J.courier)continue;const p=near.find(p=>J.kinds.includes(p.t)&&!seen.has(p.n));if(!p)continue;seen.add(p.n);out.push({id,J,p});}
  out.push({id:'courier',J:WORK.courier,p:null});return out;}
let vacCache={day:-1,list:[]};
function openJobs(){if(vacCache.day!==clock.day||!vacCache.list.length){vacCache={day:clock.day,list:vacancies()};}renderJobs();$('#jobsModal').hidden=false;player.busy=true;}
function closeJobs(){$('#jobsModal').hidden=true;player.busy=false;}
function renderJobs(){renderHome();const box=$('#jobsList');box.innerHTML='';const j=player.job;const head=$('#jobsMine');head.innerHTML='';
  if(j){const c=document.createElement('div');c.className='rt-card';const b=document.createElement('b');b.textContent=`${j.t}${j.courier?'':' · «'+j.name+'»'}`;const s1=document.createElement('span');
    s1.textContent=j.courier?`Оплата за каждый заказ. Сейчас: ${j.online?'на линии':'не на линии'}. Доставлено: ${j.delivered||0}`:`Смена ежедневно ${fmtHM(j.start)}–${fmtHM(j.start+j.len)} · ${fmtMoney(j.pay)} · выговоров: ${j.strikes}/3`;
    const row=document.createElement('div');row.className='row';
    if(j.courier){const on=document.createElement('button');on.className='btn primary';on.textContent=j.online?'Уйти с линии':'Выйти на линию';on.addEventListener('click',()=>{j.online=!j.online;j.offerT=3;addEvent(j.online?'🛵 Вы на линии — ждите заказы':'Вы ушли с линии');renderJobs();});row.append(on);}
    else{const go=document.createElement('button');go.className='btn';go.textContent='📍 Показать на карте';go.addEventListener('click',()=>{mark(null,'job',j.x,j.y,'💼',j.name,{arrow:true,color:'#2BB062'});closeJobs();});row.append(go);}
    const q=document.createElement('button');q.className='btn';q.textContent='Уволиться';q.addEventListener('click',()=>{quitJob('Вы уволились');renderJobs();});row.append(q);c.append(b,s1,row);head.append(c);}
  else{const p=document.createElement('p');p.textContent='Работы пока нет. Смена — в реальном времени игры: приходите вовремя и выполняйте задания на месте. Три выговора — увольнение.';head.append(p);}
  for(const v of vacCache.list){const J=v.J;const c=document.createElement('div');c.className='rt-card';const b=document.createElement('b');b.textContent=J.courier?'🛵 Курьер доставки':`${J.t} · «${v.p.n}»`;const s1=document.createElement('span');
    s1.textContent=J.courier?'Свободный график: выходите на линию, когда удобно. 180–350 ₽ за заказ + чаевые':`Ежедневно ${fmtHM(J.start)}–${fmtHM(J.start+J.len)} · ${fmtMoney(J.pay)} за смену · ${Math.round(dist(v.p.x,v.p.y,player.x,player.y))} м`;
    const btn=document.createElement('button');btn.className='btn primary';btn.textContent=j?'Сменить работу':'Устроиться';btn.addEventListener('click',()=>{hire(v);renderJobs();});c.append(b,s1,btn);box.append(c);}}
function hire(v){if(player.job)quitJob(null);const J=v.J;
  const j=player.job=J.courier?{id:'courier',t:J.t,courier:true,online:true,offerT:4,delivered:0,rating:5}:{id:v.id,t:J.t,key:poiKey(v.p),name:v.p.n,kind:v.p.t,x:v.p.x,y:v.p.y,start:J.start,len:J.len,pay:J.pay,strikes:0};
  if(!j.courier){Object.assign(j,{day:clock.day,done:gMin()>=j.start*60,present:0,late:false,entered:false,remind:false,taskT:rnd(10,20),task:null,tasksDone:0,missed:0});mark(null,'job',j.x,j.y,'💼',j.name,{arrow:true,color:'#2BB062'});}
  addEvent(j.courier?'🛵 Вы курьер доставки. Вы на линии — заказы будут приходить сами':`💼 Вы устроились: ${j.t} в «${j.name}». Смена каждый день ${fmtHM(j.start)}–${fmtHM(j.start+j.len)}${j.done?' (сегодняшняя уже идёт — начинаете завтра)':''}`,'say');
  startSit('job');}
function quitJob(msg){const s=sitActive('job');player.job=null;unmark('job');if(s)endSit(s);if(msg)addEvent(msg);}
function strike(j,why){j.strikes++;const b=staffNpc();const lines={'опоздание':'Опаздываешь! Ещё раз — и до свидания.','прогул':'Смену прогулял? Это выговор.','недовольные гости':'Гости жалуются. Соберись!'};
  if(b&&scene==='interior'){say(b,lines[why]||'Выговор!');}addEvent(`💼 Выговор (${why}): ${j.strikes}/3`,'alert');sitMood(-6);
  if(j.strikes>=3){sitCard({icon:'💼',tone:'alert',title:'Вас уволили',text:`«${j.name}»: три выговора — расчёт. Новую работу ищите в 💼.`,ttl:0,choices:[{t:'Понятно',primary:true,run:()=>{}}]});quitJob(null);}}

defSit('job',{title:'Работа',quiet:true,
  start(s){return !!player.job;},
  update(s,dt){const j=player.job;if(!j){endSit(s);return;}
    if(j.courier){courierTick(s,j,dt);return;}
    if(WORK[j.id]&&j.len!==WORK[j.id].len)j.len=WORK[j.id].len;   // старые сохранения: смена была 4 часа
    const gm=gMin(),day=clock.day,st=j.start*60,en=st+j.len*60;
    if(j.day!==day){if(!j.done&&j.day!=null&&day>j.day)shiftEnd(j,true);j.day=day;j.present=0;j.late=false;j.entered=false;j.done=false;j.remind=false;j.taskT=rnd(10,20);j.task=null;j.tasksDone=0;j.missed=0;j.seenAt=null;j.inGame=0;}
    if(!j.done&&gm>=st&&gm<en){if(j.seenAt==null)j.seenAt=gm;j.inGame=(j.inGame||0)+dt*clock.scale/60;}   // часы общие: смена идёт и без игрока, выговор — только если он был в игре
    if(!j.remind&&gm>=st-60&&gm<st){j.remind=true;addEvent(`⏰ Через час смена: ${j.t} в «${j.name}»`,'alert');mark(null,'job',j.x,j.y,'💼',j.name,{arrow:true,color:'#2BB062'});}
    const atWork=scene==='interior'&&interior&&interior.key===j.key;
    if(!j.done&&gm>=st&&gm<en&&atWork){
      if(!j.entered){j.entered=true;unmark('job');if(gm>st+15&&j.seenAt!=null&&j.seenAt>st+10){const b=staffNpc();if(b)say(b,'Пришёл? Становись — заплатим за отработанное.');addEvent(`💼 Вы зашли посреди смены: оплата за отработанное, до ${fmtHM(j.start+j.len)}`);}else if(gm>st+15){j.late=true;strike(j,'опоздание');}else{const b=staffNpc();if(b)say(b,'О, вовремя! Становись на место.');addEvent(`💼 Смена началась: до ${fmtHM(j.start+j.len)}`);}}
      j.present+=dt*clock.scale/60;
      if(!j.task){j.taskT-=dt;if(j.taskT<=0){const J=WORK[j.id];const fs=interior.furn.filter(J.spot);if(fs.length){j.task={f:pick(fs),text:pick(J.orders),t:45};const cl=interior.npcs.find(n=>n.role!=='staff'&&!n.companionOf);if(cl&&/barista|bartender/.test(j.id))say(cl,j.task.text,4);else setHint(`Задание: ${j.task.text}`);}}}
      else{j.task.t-=dt;if(j.task.t<=0){j.task=null;j.taskT=rnd(15,30);j.missed++;addEvent('Не успели — гость ушёл недовольный');if(j.missed===3)strike(j,'недовольные гости');}}}
    if(!j.done&&gm>=en)shiftEnd(j,false);},
  actionInside(s){const j=player.job;if(!j||j.courier||!j.task||!interior||interior.key!==j.key)return null;const f=j.task.f;const d=Math.max(Math.abs(player.ix-f.x)-f.w/2,Math.abs(player.iy-f.y)-f.h/2);if(d>1.1)return null;
    return {label:`${WORK[j.id].verb}: ${j.task.text.replace(/[!.]$/,'')}`,run:()=>{const tip=/barista|bartender/.test(j.id)&&Math.random()<0.6?Math.round(rnd(30,120)/10)*10:0;j.tasksDone++;j.task=null;j.taskT=rnd(15,35);player.energy=clamp(player.energy-2,0,100);if(tip){player.money+=tip;setHint(`Готово! Чаевые +${tip} ₽`);}else setHint('Готово!');}};},
  drawInside(s,it){const j=player.job;if(!j||!j.task||it.key!==j.key)return;const f=j.task.f;const p=0.5+0.5*Math.sin(performance.now()/200);ctx.strokeStyle=`rgba(43,176,98,${0.5+0.5*p})`;ctx.lineWidth=3;rrect(ctx,it.ox+(f.x-f.w/2-0.15)*it.iz,it.oy+(f.y-f.h/2-0.15)*it.iz,(f.w+0.3)*it.iz,(f.h+0.3)*it.iz,6);ctx.stroke();}});
function shiftEnd(j,missedDay){j.done=true;unmark('job');const need=j.len*60;const frac=Math.min(1,j.present/need);
  if(frac>=0.7){const bonus=(j.tasksDone||0)*50;sitMoney(j.pay+bonus,`💼 Смена в «${j.name}» закрыта${bonus?' (премия за работу '+bonus+' ₽)':''}`);sitMood(4);sitRep(1);}
  else if(frac>=0.25){sitMoney(Math.round(j.pay*frac/10)*10,`💼 Неполная смена в «${j.name}»`);}
  else if((j.inGame||0)>=need*0.5){addEvent(`💼 Вы не вышли на смену в «${j.name}»`,'alert');strike(j,'прогул');}
  else if(!missedDay)addEvent(`💼 Смена в «${j.name}» прошла без вас — вас почти не было в игре, выговора нет`);}

// ---------- курьер ----------
function courierTick(s,j,dt){if(!j.online)return;const o=j.order;
  if(!o){if(SIT.card)return;j.offerT=(j.offerT||5)-dt;if(j.offerT>0)return;j.offerT=rnd(15,30);
    const from=pick(world.pois.filter(p=>(p.t==='cafe'||p.t==='bar'||p.t==='shop')&&p.n&&dist(p.x,p.y,player.x,player.y)<450));if(!from)return;
    const cand=[];world.bgrid.query(from.x-700,from.y-700,from.x+700,from.y+700,b=>{if(b.pass||b.spire)return;const d=dist(b.cx,b.cy,from.x,from.y);if(d>=180&&d<=700&&cand.length<400&&!cand.includes(b))cand.push(b);});
    let to=null;for(let k=0;k<12&&!to&&cand.length;k++){const b=pick(cand);const q=toSidewalk(b.cx,b.bb[3]+2);if(inBuilding(q[0],q[1]))continue;to={x:q[0],y:q[1],n:nearestRoadName(q[0],q[1])};}
    if(!to)return;const d1=dist(from.x,from.y,player.x,player.y),d2=dist(from.x,from.y,to.x,to.y);const pay=Math.round((150+d2*0.25)/10)*10;
    sitCard({s,icon:'🛵',title:'Новый заказ',text:`Забрать в «${from.n}» (${Math.round(d1)} м) → отнести ${to.n?'на '+to.n:'по адресу'} (${Math.round(d2)} м). Оплата ${fmtMoney(pay)}.`,ttl:15,
      choices:[{t:'Принять',primary:true,run:()=>{j.order={from,to,pay,stage:'pickup',limit:clock.minutes+Math.round(15+(d1+d2)/40)};mark(s,'cfrom',from.x,from.y,'🥡',`Забрать: ${from.n}`,{arrow:true,color:'#E0A030'});setHint('Едьте в заведение — заказ заберётся сам, когда подойдёте');}},{t:'Пропустить',run:()=>{}}],onTimeout:()=>{}});return;}
  const px=player.vehicle?player.vehicle.x:player.x,py=player.vehicle?player.vehicle.y:player.y;
  if(o.stage==='pickup'&&scene==='city'&&dist(o.from.x,o.from.y,px,py)<12){o.stage='deliver';unmark('cfrom');mark(s,'cto',o.to.x,o.to.y,'📦','Клиент',{arrow:true,color:'#2BB062'});addEvent(`🥡 Заказ забран в «${o.from.n}». Несите клиенту — до ${fmtHM(o.limit/60)}`);}
  else if(o.stage==='deliver'&&scene==='city'&&dist(o.to.x,o.to.y,px,py)<12){unmark('cto');const late=clock.minutes>o.limit;let pay=late?Math.round(o.pay*0.7/10)*10:o.pay;const tip=!late&&Math.random()<0.5?Math.round(rnd(50,150)/10)*10:0;
    j.delivered=(j.delivered||0)+1;j.rating=clamp((j.rating||5)+(late?-0.3:0.05),1,5);sitMoney(pay+tip,`📦 Заказ доставлен${late?' с опозданием':''}${tip?' + чаевые '+tip+' ₽':''}`);player.energy=clamp(player.energy-3,0,100);j.order=null;j.offerT=rnd(10,25);
    if(j.rating<3.2){addEvent('Рейтинг курьера упал ниже 3,2 — сервис отключил вас от заказов','alert');quitJob(null);}}}

// ---------- аренда и коммуналка ----------
const RENT=7000,UTIL=1800;
const bills={lastDay:clock.day,remind:{}};
// последний день недели dow с часом h, который уже наступил (часы общие, дни те же у всех)
function lastDue(dow,h){let d=clock.day-((clock.day%7-dow+7)%7);if((d-1)*1440+h*60>clock.minutes)d-=7;return d;}
defWatch(()=>{if(bills.era!==2){bills.era=2;bills.rent=lastDue(0,10);bills.util=lastDue(3,12);}   // переход на общие часы: старые дни были свои у каждого — считаем, что за эту неделю заплачено
  if(!player.home)return;const d=clock.day,h=gHour();
  if(d%7===6&&h>=20&&bills.remind[d]!=='r'){bills.remind[d]='r';addEvent(`📅 Завтра платить за квартиру: ${fmtMoney(RENT)}`);}
  const r=lastDue(0,10),u=lastDue(3,12);   // пропустили несколько недель — списываем один раз
  if(!(bills.rent>=r)){bills.rent=r;payBill(RENT,'Аренда квартиры за неделю');}
  if(!(bills.util>=u)){bills.util=u;payBill(UTIL,'Коммуналка (ЖКУ)');}
  if((player.debt||0)>0&&h>=11&&bills.call!==d&&d%7!==0){bills.call=d;startSit('landlord');}});
function payBill(sum,what){if(player.money>=sum)sitMoney(-sum,what);else{const part=player.money;player.money=0;player.debt=(player.debt||0)+sum-part;addEvent(`${what}: не хватило ${fmtMoney(sum-part)} — долг ${fmtMoney(player.debt)}`,'alert');sitMood(-10);}}
defSit('landlord',{title:'Хозяйка квартиры',quiet:true,
  start(s){const d=player.debt||0;if(!d)return false;const evict=d>=RENT*2;
    sitCard({s,icon:'📞',tone:'call',title:'Звонит хозяйка квартиры',text:evict?`«${player.name}, долг уже ${fmtMoney(d)}. Не заплатите до конца недели — съезжайте».`:`«${player.name}, добрый день. Когда будут деньги за квартиру? Долг ${fmtMoney(d)}».`,ttl:20,
      choices:[...(player.money>0?[{t:`Заплатить ${fmtMoney(Math.min(d,player.money))}`,primary:true,run:()=>{const p=Math.min(d,player.money);player.money-=p;player.debt=d-p;addEvent(player.debt?`Отдали ${fmtMoney(p)}, осталось ${fmtMoney(player.debt)}`:'Долг за квартиру закрыт','say');endSit(s);}}]:[]),
        {t:'Попросить отсрочку',run:()=>{if(!player.delayAsked){player.delayAsked=true;addEvent('Хозяйка: «Ладно, неделю подожду. Но не больше»');}else{addEvent('Хозяйка: «Сколько можно? Я уже давала отсрочку»','alert');sitMood(-6);if(evict)evictHome();}endSit(s);}},
        {t:'Сбросить',run:()=>{sitMood(-4);if(evict&&Math.random()<0.5)evictHome();endSit(s);}}],onTimeout:()=>endSit(s)});return true;}});
function evictHome(){addEvent('🏠 Хозяйка сменила замки: вас выселили. Новое жильё — в 💼 «Работа и жильё», переночевать можно в гостинице','alert');player.home=null;player.debt=0;player.delayAsked=false;sitMood(-20);}
function rentNewHome(){const homes=world.buildings.filter(b=>(b.t===''||b.t==='apartments'||b.t==='residential')&&b.h>=3&&dist(b.cx,b.cy,player.x,player.y)<500);if(!homes.length){setHint('Рядом нет квартир в аренду');return;}
  if(player.money<RENT){setHint(`Нужно ${fmtMoney(RENT)} за первую неделю`);return;}player.money-=RENT;player.home=pick(homes);bills.rent=Math.max(lastDue(0,10),clock.day);mark(null,'home',player.home.cx,player.home.cy,'🏠','Новая квартира',{arrow:true,color:'#2BB062'});addEvent(`🏠 Вы сняли квартиру за ${fmtMoney(RENT)} в неделю`,'say');}

// ---------- простуда, зонт, аптека ----------
let wetT=0;
defWatch(dt=>{const out=scene==='city'&&!player.vehicle&&!player.bus&&!player.inside;
  if(weather.kind==='rain'&&out&&!player.umbrella){wetT+=dt;if(wetT>90&&!player.cold){wetT=0;if(Math.random()<0.5)catchCold();else setHint('Промокли до нитки. Ещё немного — и простынете. Зонт продаётся в магазинах');}}else wetT=Math.max(0,wetT-dt*0.3);
  if(player.cold){player.energy=clamp(player.energy-dt*0.03,0,100);SIT.sneeze=(SIT.sneeze||rnd(15,30))-dt;if(SIT.sneeze<=0){SIT.sneeze=rnd(20,45);player.say={t:pick(['Апчхи!','Апчхи! Пардон…','Кхе-кхе…']),ttl:2};}}});
function catchCold(){player.cold=true;sitMood(-8);sitCard({icon:'🤧',tone:'alert',title:'Вы простыли',text:'Промокли под дождём — знобит и чихаете. Энергия тратится быстрее. Лекарство — в аптеке, ещё помогает хороший сон.',ttl:12,choices:[{t:'Понятно',primary:true,run:()=>{}}]});}
defSit('lifeShops',{title:'Покупки для жизни',quiet:true,always:true,
  start(){return true;},
  actionInside(s){if(!interior)return null;const k=interior.kind;
    if(player.cold&&k==='pharmacy'&&interiorNear(f=>f.spot==='shelf'||f.spot==='cash'))return {label:'Купить лекарство от простуды · 450 ₽',run:()=>spend(450,()=>{player.cold=false;player.energy=clamp(player.energy+10,0,100);addEvent('Лекарство помогло — простуда отступает. Энергия +10','say');})};
    if(!player.umbrella&&(k==='shop'||k==='market')&&interiorNear(f=>f.spot==='cash'))return {label:'Купить зонт · 600 ₽',run:()=>spend(600,()=>{player.umbrella=true;addEvent('☂️ Купили зонт — дождь теперь не страшен','say');})};
    if(!player.home&&k==='hotel'&&interiorNear(f=>f.spot==='reception'))return null;
    return null;}});

// ---------- сон дома: соседи шумят ----------
function trySleep(h){if(!canSleep()){sleep(h);return;}const night=gHour()>=21||gHour()<6;const home=interior&&interior.kind==='home';if(home&&night&&Math.random()<0.3&&(SIT.cool.neighbors||0)<sitNow()){startSit('neighbors',{h});return;}sleep(h);if(player.cold&&Math.random()<0.6){player.cold=false;addEvent('Выспались — простуда прошла','say');}}
defSit('neighbors',{title:'Шумные соседи',quiet:true,cool:900,
  start(s){sitCard({s,icon:'🔊',tone:'alert',title:'Соседи сверху шумят',text:`${fmtTime()}. Сверху грохочет музыка и кто-то топает. Уснуть невозможно.`,ttl:0,
    choices:[{t:'Постучать по батарее',primary:true,run:()=>{if(Math.random()<0.5){addEvent('Музыку сделали тише');nbSleep(s,1);}else{addEvent('Не помогло — до трёх ночи «тынц-тынц»');nbSleep(s,0.7,-8);}}},
      {t:'Подняться и поговорить',run:()=>{if(Math.random()<0.7){addEvent('Сосед: «Ой, простите, у меня день рождения. Сделаю тише!»');sitRep(1);nbSleep(s,1);}else{addEvent('Сосед хлопнул дверью перед носом','alert');nbSleep(s,0.7,-10);}}},
      {t:'Вызвать полицию',run:()=>{addEvent('Участковый приехал через сорок минут — стало тихо (ст. «Закона о тишине» РТ)');nbSleep(s,0.85,-3);}},
      {t:'Терпеть',run:()=>{nbSleep(s,0.65,-10);}}]});return true;}});
function nbSleep(s,q,m){if(!sleep(s.h)){endSit(s);return;}player.energy=Math.round(100*q);if(m)sitMood(m);if(player.cold&&q>=0.85&&Math.random()<0.5){player.cold=false;addEvent('Простуда прошла','say');}endSit(s);}

// ---------- прорвало трубу ----------
defEnter(it=>{if(it.kind!=='home'||sitActive('pipe')||(SIT.cool.pipe||0)>sitNow()||Math.random()>0.12)return;setTimeout(()=>{if(interior===it)startSit('pipe');},1500);});
defSit('pipe',{title:'Прорвало трубу',quiet:true,cool:1500,
  start(s){s.it=interior;sitCard({s,icon:'💧',tone:'alert',urgent:true,title:'Прорвало трубу!',text:'Из-под раковины хлещет вода, на полу растёт лужа. Ещё немного — и зальёт соседей снизу.',ttl:20,
    choices:[{t:'Перекрыть воду и вызвать сантехника · 1 800 ₽',primary:true,run:()=>{sitMoney(-1800,'Сантехник поменял трубу');spendTime(60);s.fixedAt=s.t+8;}},
      {t:'Чинить самому',run:()=>{spendTime(40);if(Math.random()<0.55){addEvent('Изолента, хомут и мат — течь остановлена! Настроение +6','say');sitMood(6);s.fixedAt=s.t+3;}else pipeFlood(s);}},
      {t:'Звонить в управляющую компанию',run:()=>{addEvent('УК: «Мастер придёт завтра. Воду в квартире пока перекроем»');player.noWater=clock.day;sitMood(-5);s.fixedAt=s.t+3;}}],
    onTimeout:()=>pipeFlood(s)});return true;},
  update(s,dt){if(s.fixedAt!=null&&s.t>=s.fixedAt)endSit(s);},
  drawInside(s,it){if(it!==s.it)return;const f=it.furn.find(f=>f.spot==='kitchen');if(!f)return;const r=Math.min(2.6,0.6+s.t*0.08);ctx.fillStyle='rgba(80,150,230,.45)';ctx.beginPath();ctx.ellipse(it.ox+f.x*it.iz,it.oy+(f.y+1.2)*it.iz,r*it.iz,r*0.55*it.iz,0,0,TAU);ctx.fill();}});
function pipeFlood(s){sitMoney(-6000,'Залили соседей снизу — ремонт их потолка');sitMood(-15);addEvent('Соседка снизу: «У меня с люстры течёт!»','alert');s.fixedAt=s.t+4;}

// ---------- подсказки жителям с ИИ ----------
const _sitCtxBase=sitContextFor;
sitContextFor=function(w){let t=_sitCtxBase(w);if(player.cold)t+=' Собеседник простужен и чихает.';if(player.job&&!player.job.courier)t+=` Собеседник работает: ${player.job.t.toLowerCase()} в «${player.job.name}».`;else if(player.job&&player.job.courier)t+=' Собеседник работает курьером доставки.';return t;};

function renderHome(){const box=$('#jobsHome');box.innerHTML='';const c=document.createElement('div');c.className='rt-card';const b=document.createElement('b');const sp=document.createElement('span');const row=document.createElement('div');row.className='row';
  if(player.home){b.textContent='🏠 Съёмная квартира';const left=7-(clock.day%7||7);sp.textContent=`Аренда ${fmtMoney(RENT)} раз в неделю (${left?'через '+left+' дн.':'сегодня'}), ЖКУ ${fmtMoney(UTIL)}.${player.debt?' Долг: '+fmtMoney(player.debt):' Долгов нет.'}`;
    const show=document.createElement('button');show.className='btn';show.textContent='📍 Показать дом';show.addEventListener('click',()=>{mark(null,'home',player.home.cx,player.home.cy,'🏠','Дом',{arrow:true,color:'#2BB062'});closeJobs();});row.append(show);
    if(player.debt){const pay=document.createElement('button');pay.className='btn primary';pay.textContent='Погасить долг';pay.addEventListener('click',()=>{const p=Math.min(player.debt,player.money);player.money-=p;player.debt-=p;addEvent(player.debt?`Погасили ${fmtMoney(p)}`:'Долг за квартиру закрыт','say');renderJobs();});row.append(pay);}}
  else{b.textContent='🏠 Жилья нет';sp.textContent=`Можно снять квартиру рядом: ${fmtMoney(RENT)} в неделю. Переночевать — в гостинице.`;const r=document.createElement('button');r.className='btn primary';r.textContent=`Снять квартиру · ${fmtMoney(RENT)}`;r.addEventListener('click',()=>{rentNewHome();renderJobs();});row.append(r);}
  c.append(b,sp,row);box.append(c);}
$('#jobsBtn').addEventListener('click',()=>$('#jobsModal').hidden?openJobs():closeJobs());
$('#jobsClose').addEventListener('click',closeJobs);
