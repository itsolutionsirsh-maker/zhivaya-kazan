// ===== Свои люди сами подходят к игроку: подвезти, продать, попросить поесть, снять на телефон, поспорить, позвать, пожаловаться =====
// Что умеет человек — поле do из folk3.js (второй программист). Раз в 1,5–2,5 минуты кто-то рядом подходит сам;
// первая реплика — от ИИ в его манере (если ИИ подключён), иначе — его фраза. Дальше — карточка с выбором.
// Каждый подходит не чаще раза в игровые сутки. Пока блогер снимает — w.filming (рисует render.js).
const FA={t:30,cool:{},s:null};
const FA_W={offer_ride:3,sell:2,ask_food:2.5,ask_change:1.5,film:3,challenge:1.5,drink_invite:1.5,complain:1.2,sing:2,gossip:0.8,tip:0.8,help_ask:1.2};
function faFolkOf(w){return w&&w.folk?FOLK.list.find(f=>f.id===w.folk):null;}
function faHour(){return gHour();}
// куда «поедем»: домой, если дом далеко, иначе в известное место за 1–5 км
function faDest(){if(player.home&&dist(player.home.cx,player.home.cy,player.x,player.y)>700)return {x:player.home.cx,y:player.home.bb[3]+3,n:'домой'};
  const L=(window.cityLandmarks||[]).map(l=>{const q=llToXY(l.ll);return {x:q[0],y:q[1],n:l.name,d:dist(q[0],q[1],player.x,player.y)};}).filter(q=>q.d>1000&&q.d<5000);
  return L.length?pick(L):null;}
function faFare(d){const km=dist(d.x,d.y,player.x,player.y)*1.3/1000;return Math.round((TAXI.base+km*TAXI.km)/10)*10;}
// что продаёт — по занятию
function faGoods(f){const j=(f.job||'')+' '+(f.bio||'');
  if(/ягод|клубн|малин|черник/i.test(j))return {n:'лоток ягод',price:150,food:10,mood:5};
  if(/чак-чак|сладост|медов/i.test(j))return {n:'чак-чак',price:200,food:15,mood:4};
  if(/эчпочмак|выпечк|пирож|самс|беляш|повар|кухн/i.test(j))return {n:'эчпочмак',price:90,food:25,mood:2};
  if(/кофе|барист|чай/i.test(j))return {n:'кофе с собой',price:160,energy:8,mood:3};
  if(/вяз|шапк|сувенир|магнит|открыт|рису/i.test(j))return {n:'сувенир на память',price:250,mood:6};
  if(/цвет/i.test(j))return {n:'букетик',price:300,mood:7};
  return {n:'что-нибудь к чаю',price:120,food:10,mood:2};}
// куда донести сумку: жилой дом в 60–250 м, вход с улицы
function faHelpTarget(seed){const c=[];const s=new Set();world.bgrid.query(player.x-250,player.y-250,player.x+250,player.y+250,b=>{if(s.has(b)||b.pass||!(b.t===''||b.t==='apartments'||b.t==='residential'||b.t==='house'))return;s.add(b);const d=dist(b.cx,b.cy,player.x,player.y);if(d>60&&d<250)c.push(b);});
  if(!c.length)return null;c.sort((u,v)=>u.i-v.i);const b=c[seed%c.length];for(const q of [[b.cx,b.bb[3]+3],[b.cx,b.bb[1]-3],[b.bb[0]-3,b.cy],[b.bb[2]+3,b.cy]])if(!inBuilding(q[0],q[1]))return {x:q[0],y:q[1]};return null;}
function faNearPoi(test,R){let best=null,bd=R||450;for(const p of world.pois){if(!p.n||!test(p))continue;const d=dist(p.x,p.y,player.x,player.y);if(d>40&&d<bd){bd=d;best=p;}}return best;}
// какие действия у человека уместны сейчас
function faActsFor(f){const h=faHour(),out=[];const at=f.at,day=h>=8&&h<22;
  for(const a of f.do||[]){
    if(a==='offer_ride'&&!(at==='work'&&/^(taxi|bombila)$/.test(f.type)&&(h>=6||h<2)))continue;
    if(a==='overcharge')continue;   // это не отдельное действие, а манера бомбилы при offer_ride
    if(a==='sell'&&!(at==='work'&&h>=8&&h<21))continue;
    if((a==='ask_food'||a==='ask_change'||a==='complain'||a==='help_ask'||a==='gossip'||a==='tip')&&!day)continue;
    if((a==='film'||a==='challenge')&&!(h>=10&&h<22))continue;
    if(a==='drink_invite'&&!((h>=17||h<1)&&(player.drunk||0)<45))continue;
    if(a==='sing'&&!(at==='work'&&h>=10&&h<22))continue;
    out.push(a);}
  return out;}
function faPickAct(acts){let s=0;for(const a of acts)s+=FA_W[a]||1;let r=Math.random()*s;for(const a of acts){r-=FA_W[a]||1;if(r<=0)return a;}return acts[0];}
function faCanStart(){return scene==='city'&&!player.busy&&!player.vehicle&&!player.bus&&!player.inside&&!SIT.card&&!cine&&player.state!=='hurt'&&!chatNpc&&!(typeof companion!=='undefined'&&companion)&&!player.navDest&&!player.waypoints&&sitCanAuto()&&!sitActive('folkAct');}
// реплика: ИИ в его манере под ситуацию, без ИИ — своя фраза или запасная
async function faLine(w,situation,fallback){const f=faFolkOf(w);
  if(typeof sampleFn==='function'&&sampleFn&&sampleFn.json){try{const ctx=contextForNpc(w).replace(' Отвечай на реплику ниже.','');
      const r=await Promise.race([sampleFn.json([{role:'user',content:`${ctx}\nСитуация: ${situation}\nСкажи одну короткую реплику (до 15 слов) в своей манере, обращаясь к собеседнику. Без мата, без политики. Ответ — JSON {"reply":"..."}.`}]),new Promise((_,j)=>setTimeout(()=>j('timeout'),4500))]);
      const t=r&&typeof r.reply==='string'?r.reply.trim().slice(0,160):'';if(t)return t;}catch(e){}}
  return fallback||(f&&f.lines?pick(f.lines):'Здравствуйте!');}
function faSay(s,situation,fallback){const w=s.w;const fb=fallback||pick(w.p.lines||['Здравствуйте!']);say(w,fb,6);
  if(typeof sampleFn==='function'&&sampleFn)faLine(w,situation,null).then(t=>{if(t&&!s.done&&t!==fb)say(w,t,6);});}

defSit('folkAct',{title:'Свои люди',quiet:true,
  start(s){const w=s.w,f=s.f;if(!w||!f)return false;takeActor(s,w,'sit');s.phase='come';s.mvT=0;FA.cool[f.id]=clock.day;s.t=0;return true;},
  update(s,dt){const w=s.w;if(!w||walkers.indexOf(w)<0){endSit(s);return;}const d=dist(w.x,w.y,player.x,player.y);
    if(s.phase==='come'){const spd=Math.min(WALK_SPEED,2.6+d*0.08);
      if(d<12){w.mv=null;const k=Math.min(spd*dt,Math.max(0,d-2.2))/(d||1);w.hx=(player.x-w.x)/(d||1);w.hy=(player.y-w.y)/(d||1);w.x+=(player.x-w.x)*k;w.y+=(player.y-w.y)*k;w.phase=(w.phase||0)+dt*7;}   // рядом — напрямую
      else{if(!w.mv||!s.tg||dist(s.tg[0],s.tg[1],player.x,player.y)>4){s.tg=[player.x,player.y];moveActor(w,player.x,player.y,spd);}if(w.mv)stepActor(w,dt);}
      if(d<2.6){w.mv=null;faceTo(w,player.x,player.y);s.phase='talk';faOpen(s);return;}
      if(d>45||s.t>40||player.vehicle||player.inside){say(w,'Ну ладно, в другой раз.',3);endSit(s);}return;}
    if(s.phase==='talk'){faceTo(w,player.x,player.y);if(chatNpc&&(chatNpc===w||(typeof folkId==='function'&&folkId(w)&&folkId(chatNpc)===folkId(w))))return;
      if(!w.companion&&w.state==='idle')w.state='sit';if(d>25&&!SIT.card)endSit(s);if(!SIT.card&&!s.wait)endSit(s);return;}
    if(s.phase==='race'){const r=s.race;r.left-=dt;if(dist(r.x,r.y,player.x,player.y)<25){faRaceEnd(s,true);return;}if(r.left<=0){faRaceEnd(s,false);return;}
      if(Math.floor(r.left)!==r.shown){r.shown=Math.floor(r.left);setHint(`Спор: до «${r.n}» — ${r.shown} с`);}return;}
    if(s.phase==='help'){const h=s.help;h.left-=dt;s.mvT-=dt;if(s.mvT<=0){s.mvT=0.7;const dd=dist(w.x,w.y,player.x,player.y);if(dd>2.2)moveActor(w,player.x,player.y,Math.min(WALK_SPEED*1.05,2+dd*0.5));}
      if(w.mv)stepActor(w,dt);if(dist(h.x,h.y,player.x,player.y)<15&&dist(w.x,w.y,player.x,player.y)<25){faHelpEnd(s,true);return;}if(h.left<=0||d>80){faHelpEnd(s,false);}return;}},
  end(s){const w=s.w;if(w){w.filming=false;releaseActor(w);const f=faFolkOf(w);if(f&&f.w===w&&typeof folkGo==='function'){f.away=true;folkGo(f,folkWant(f));}}unmark('fa:go');FA.s=null;FA.t=rnd(90,150);}});

function faCard(s,o){o.s=s;o.ttl=o.ttl==null?25:o.ttl;o.icon=o.icon||'💬';o.title=o.title||`${s.w.p.name}, ${s.w.p.job}`;o.onTimeout=o.onTimeout||(()=>endSit(s));sitCard(o);}
function faOpen(s){const w=s.w,f=s.f,a=s.act,nm=w.p.name;
  switch(a){
    case 'offer_ride':{const dst=faDest();if(!dst){endSit(s);return;}const fair=faFare(dst);const bomb=f.type==='bombila'&&(f.do||[]).includes('overcharge');
      const price=bomb?Math.round(fair*1.8/50)*50:fair;s.dst=dst;
      faSay(s,bomb?`ты бомбила у ${f.places[f.at]&&f.places[f.at].name||'дороги'}, зазываешь подвезти до «${dst.n}» за ${price} ₽ и уверяешь, что это дёшево`:`ты таксист, предлагаешь подвезти до «${dst.n}» по счётчику`,bomb?`До «${dst.n}»? ${price} — и поехали!`:`Подвезти до «${dst.n}»? По счётчику, честно.`);
      if(!bomb){faCard(s,{icon:'🚕',text:`Предлагает подвезти до «${dst.n}» по счётчику — около ${fmtMoney(fair)}.`,choices:[{t:'Поехать',primary:true,run:()=>faRide(s,dst,null)},{t:'Нет, спасибо',run:()=>endSit(s)}]});return;}
      const offer=(p,canBargain)=>faCard(s,{icon:'🚗',text:`Бомбила: до «${dst.n}» за ${fmtMoney(p)}. По счётчику в такси вышло бы около ${fmtMoney(fair)}.`,choices:[{t:`Поехать за ${fmtMoney(p)}`,primary:true,run:()=>faRide(s,dst,p)},...(canBargain?[{t:'Поторговаться',run:()=>{if(Math.random()<0.55){const p2=Math.round(fair*1.15/10)*10;say(w,pick(['Ладно, тебе — скидка.','Эх, уговорил. Только никому.','Ну хорошо, по-соседски.']),4);offer(p2,false);}else{say(w,pick(['Дешевле только пешком.','Бензин нынче дорогой, брат.','Не хочешь — автобус вон там.']),4);endSit(s);}}}]:[]),{t:'Нет',run:()=>endSit(s)}]});
      offer(price,true);return;}
    case 'sell':{const g=faGoods(f);faSay(s,`ты предлагаешь купить ${g.n} за ${g.price} ₽`,null);
      faCard(s,{icon:'🛒',text:`Предлагает: ${g.n} за ${fmtMoney(g.price)}.`,choices:[{t:`Купить · ${fmtMoney(g.price)}`,primary:true,run:()=>spend(g.price,()=>{if(g.food)player.food=clamp(player.food+g.food,0,100);if(g.energy)player.energy=clamp(player.energy+g.energy,0,100);sitMood(g.mood||2);addEvent(`Покупка: ${g.n} · ${nm}`,'say');say(w,pick(['Рәхмәт! Приходи ещё.','Спасибо, хорошего дня!','Носи на здоровье.']),4);endSit(s);})},{t:'Нет, спасибо',run:()=>endSit(s)}]});return;}
    case 'ask_food':case 'ask_change':{const food=a==='ask_food';faSay(s,food?'ты без дома, просишь угостить тебя едой, с достоинством, без жалоб':'просишь немного мелочи на дорогу',null);
      faCard(s,{icon:'🤲',text:food?`${nm} просит угостить чем-нибудь поесть.`:`${nm} просит немного мелочи.`,choices:[...(food?[{t:'Угостить эчпочмаком · 80 ₽',primary:true,run:()=>spend(80,()=>{sitRep(2,'угостили человека');sitMood(4);faThanks(s);})}]:[]),{t:'Дать мелочь · 50 ₽',primary:!food,run:()=>spend(50,()=>{sitRep(1,'помогли человеку');sitMood(2);faThanks(s);})},{t:'Пройти мимо',run:()=>endSit(s)}]});return;}
    case 'film':{w.filming=true;faSay(s,'ты снимаешь собеседника на телефон для своего канала и зовёшь сказать пару слов в камеру','Так, улыбаемся! Это в эфир!');
      faCard(s,{icon:'📱',text:`${nm} снимает вас на телефон для своего канала.`,choices:[{t:'Помахать в камеру',primary:true,run:()=>{faVideo(s,true);}},{t:'Сказать пару слов',run:()=>{w.filming=true;s.wait=true;faVideo(s,true,true);openChat(w);}},{t:'Не снимать, пожалуйста',run:()=>{w.filming=false;say(w,pick(['Окей, без лица. Только голуби.','Понял, удаляю. Почти.']),4);endSit(s);}}]});return;}
    case 'challenge':{const L=(window.cityLandmarks||[]).map(l=>{const q=llToXY(l.ll);return {x:q[0],y:q[1],n:l.name,d:dist(q[0],q[1],player.x,player.y)};}).filter(q=>q.d>300&&q.d<750);if(!L.length){endSit(s);return;}
      const t=pick(L);const sec=Math.round(t.d*1.3/WALK_SPEED+20);const prize=Math.round((150+t.d*0.3)/50)*50;w.filming=true;
      faSay(s,`зовёшь на спор для своего канала: дойти до «${t.n}» за ${sec} секунд, приз ${prize} ₽`,`Спорим, не успеешь до «${t.n}» за ${sec} секунд?`);
      faCard(s,{icon:'⏱',text:`Спор для канала: дойти до «${t.n}» за ${sec} с. Успеете — ${fmtMoney(prize)}.`,choices:[{t:'Спорим!',primary:true,run:()=>{s.phase='race';s.race={x:t.x,y:t.y,n:t.n,left:sec,prize,shown:-1};mark(s,'fa:go',t.x,t.y,'⏱',t.n,{arrow:true,color:'#E0A030'});addEvent(`⏱ Спор (${nm}): до «${t.n}» за ${sec} с`,'say');}},{t:'Нет',run:()=>{w.filming=false;endSit(s);}}]});return;}
    case 'drink_invite':{faSay(s,'зовёшь выпить по одной в баре рядом, но спокойно примешь отказ',null);
      faCard(s,{icon:'🍺',text:`${nm} зовёт выпить по одной.`,choices:[{t:'Выпить по одной · 150 ₽',run:()=>spend(150,()=>{if(typeof addDrink==='function')addDrink(12,'кружка за компанию');sitMood(4);say(w,pick(['Будем! Только понемногу.','Хорошо сидим. Ну, стоим.']),4);endSit(s);})},{t:'Отказаться',primary:true,run:()=>{say(w,pick(['И правильно. Я тоже, может, не буду.','Ну и ладно. Ты молодец.','Понимаю. Завтра на работу.']),4);endSit(s);}}]});return;}
    case 'complain':{faSay(s,'жалуешься на беспорядок во дворе или на улице и просишь передать в мэрию','Опять во дворе непорядок, сил нет!');
      faCard(s,{icon:'📝',text:`${nm} жалуется на порядок в районе и просит передать в мэрию.`,choices:[{t:'Пообещать передать',primary:true,run:()=>{const P=PROG.complaints||(PROG.complaints=[]);P.push({d:f.district||'',who:f.id,day:clock.day});if(P.length>50)P.shift();progSave();sitRep(1,'выслушали жалобу соседей');say(w,'Вот! Хоть кто-то слушает.',4);endSit(s);}},{t:'Посочувствовать',run:()=>{sitMood(1);say(w,'Спасибо, что выслушал.',4);endSit(s);}}]});return;}
    case 'sing':{faSay(s,'ты поёшь на улице и киваешь прохожему','♪ Ещё одну — для хороших людей ♪');
      faCard(s,{icon:'🎸',text:`${nm} поёт для прохожих.`,choices:[{t:'Кинуть монету · 50 ₽',primary:true,run:()=>spend(50,()=>{sitMood(5);sitRep(1,'поддержали музыканта');say(w,'Рәхмәт! Следующая — для вас.',4);endSit(s);})},{t:'Послушать',run:()=>{sitMood(2);endSit(s);}}]});return;}
    case 'tip':{const p=faNearPoi(q=>/^(cafe|sight|market|museum|theatre|library)$/.test(q.t),450);if(!p){s.act='gossip';faOpen(s);return;}
      faSay(s,`советуешь сходить в «${p.n}» неподалёку и коротко говоришь, чем там хорошо`,`Сходи в «${p.n}», не пожалеешь.`);mark(s,'fa:tip',p.x,p.y,'💡',p.n,{arrow:true,color:'#2BB062'});
      faCard(s,{icon:'💡',text:`${nm} советует «${p.n}» рядом — метка на карте.`,choices:[{t:'Спасибо',primary:true,run:()=>{const m=SIT.marks.get('fa:tip');if(m)m.s=null;setTimeout(()=>unmark('fa:tip'),180000);endSit(s);}}]});return;}
    case 'help_ask':{const b=faHelpTarget(hashStr(f.id+clock.day));if(!b){s.act='gossip';faOpen(s);return;}
      faSay(s,'просишь помочь донести тяжёлую сумку до подъезда тут недалеко','Не поможете донести до подъезда? Тут рядом.');
      faCard(s,{icon:'👜',text:`${nm} просит помочь донести сумку до подъезда — метров ${Math.round(dist(b.x,b.y,player.x,player.y)/10)*10}.`,choices:[{t:'Помочь',primary:true,run:()=>{s.phase='help';s.help={x:b.x,y:b.y,left:240};s.mvT=0;mark(s,'fa:go',b.x,b.y,'👜','Подъезд',{arrow:true,color:'#2BB062'});setHint('Идите к подъезду — сумку несёте вместе');}},{t:'Извините, спешу',run:()=>endSit(s)}]});return;}
    default:{faSay(s,'рассказываешь свежий слух района, коротко',null);
      faCard(s,{icon:'🗣',text:`${nm} делится новостью района.`,ttl:14,choices:[{t:'Интересно',primary:true,run:()=>{sitMood(1);endSit(s);}}]});}}}
function faThanks(s){const w=s.w;say(w,pick(['Рәхмәт, добрый человек.','Спасибо. Хорошему человеку — хороший день.','Спасибо. А на Кабане сегодня утки — сходи.']),5);endSit(s);}
function faVideo(s,ok,keep){const w=s.w;const views=Math.round(rnd(300,4000)/10)*10;const street=nearestRoadName(player.x,player.y)||'центр';
  PROG.fame=(PROG.fame||0)+1;progSave();sitMood(4);addEvent(`📱 ${w.p.name} выложил ролик с вами (${street}) — ${views} просмотров`,'say');
  if(window.cityPhone)try{window.cityPhone.push({from:w.p.name,text:`Новый ролик с вами — ${views} просмотров`,kind:'event'});}catch(e){}
  if(!keep){say(w,pick(['Огонь! В рекомендации!','Подписывайся, кстати.','Ты теперь знаменитость района.']),4);setTimeout(()=>{if(!s.done)endSit(s);},1500);}else{setTimeout(()=>{s.wait=false;},20000);}}
function faRaceEnd(s,win){const w=s.w,r=s.race;unmark('fa:go');w.filming=false;
  if(win){sitMoney(r.prize,`⏱ Выиграли спор (${w.p.name})`);sitMood(6);PROG.fame=(PROG.fame||0)+1;progSave();addEvent(`📱 ${w.p.name}: «Успел! Ролик со спором — в топе»`,'say');}
  else{sitMood(-2);addEvent(`📱 ${w.p.name}: «Не успел, но красиво бежал»`,'say');}
  endSit(s);}
function faHelpEnd(s,ok){const w=s.w;unmark('fa:go');
  if(ok){sitRep(2,'помогли соседям донести сумку');sitMood(5);player.food=clamp(player.food+8,0,100);say(w,pick(['Спасибо, улым! Вот, держи чак-чак.','Рәхмәт, кызым! Возьми конфетку.','Спасибо! Таких бы побольше.']),5);addEvent(`Помогли донести сумку до подъезда — ${w.p.name} ${w.p.female?'угостила':'угостил'} чак-чаком`,'say');}
  else say(w,'Ладно, дальше сам донесу.',4);
  endSit(s);}
// поездка: машина подъезжает сразу, дальше — обычное такси (у бомбилы цена своя и фиксированная)
function faRide(s,dst,fixed){const w=s.w;if(fixed&&player.money<fixed){setHint(`Не хватает: нужно ${fmtMoney(fixed)}`);endSit(s);return;}
  const n=nearestNode(player.x,player.y,world.carAdj,150);if(n<0){setHint('Сюда машине не подъехать');endSit(s);return;}
  const f=faFolkOf(w),c=new Car(fixed?'car':'taxi',n);if(fixed)c.color=w.p.clothes||'#5A6B8C';c.state='scene';c.speed=0;c.ttl=0;c.taxiFor=true;cars.push(c);
  taxiCall={car:c,dest:dst,state:'here',t:0,folkDriver:f&&f.id,driver:w.p.name,fixedFare:fixed||null};endSit(s);if(f&&f.w){f.w.state='folkStay';f.w.path=null;}
  if(boardTaxi())addEvent(fixed?`🚗 Бомбила ${w.p.name} везёт: ${dst.n}, договорились на ${fmtMoney(fixed)}`:`🚕 Таксист ${w.p.name} везёт: ${dst.n}, по счётчику`,'say');
  else if(taxiCall&&dist(player.x,player.y,c.x,c.y)>9){setHint('Машина у обочины — подойдите и нажмите E');updateTripBox();}}

// раз в 1,5–2,5 минуты кто-то из своих людей рядом подходит сам
defWatch(dt=>{if(!world||typeof FOLK==='undefined'||!FOLK.ready)return;FA.t-=dt;if(FA.t>0)return;FA.t=3;if(!faCanStart())return;
  const cand=[];for(const f of FOLK.list){const w=f.w;if(!w||!f.do||f.trip||FA.cool[f.id]===clock.day)continue;if(typeof folkBusy==='function'&&folkBusy(w))continue;const d=dist(w.x,w.y,player.x,player.y);if(d<4||d>32)continue;const acts=faActsFor(f);if(acts.length)cand.push([d,f,acts]);}
  if(!cand.length)return;cand.sort((a,b)=>a[0]-b[0]);const [,f,acts]=cand[Math.floor(Math.random()*Math.min(3,cand.length))];
  const s=startSit('folkAct',{w:f.w,f,act:faPickAct(acts)});if(s)FA.s=s;else FA.t=20;});
