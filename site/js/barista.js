// ===== Бариста между игроками (сервер — server/node/roles.js, данные роли — roles.js второго программиста) =====
// Игрок, у которого работа «Бариста» и уже была одна полная смена, в своём кафе стоит «за стойкой»: другие игроки
// в этом кафе (общая комната) подходят и заказывают чай или кофе. Бариста называет цену от 60 до 220 ₽, гость платит
// или отказывается. Деньги переводит сервер — с карты гостя на карту баристы, один раз за заказ; здесь деньги не
// трогаем (иначе кошелёк посчитал бы их ещё раз) — после ответа сразу сохраняемся, и карта встаёт по серверу.
// Только с аккаунтом и аккаунту больше суток (проверяет сервер). Лимиты: 40 чашек в день, 4 одному гостю.
const BAR={sock:null,tok:'',want:false,sent:null,on:false,told:{},card:null,cardId:null,max:40,min:60,maxPrice:220};
const BAR_ITEMS=['Чёрный чай','Чай с молоком','Американо','Капучино','Латте'];
const BAR_PRICES=[80,120,160,220];
function barLive(){return typeof wsSock!=='undefined'&&wsSock&&wsSock.readyState===1&&!!Net.roles;}
function barSendWs(m){if(!barLive())return false;try{wsSock.send(JSON.stringify(Object.assign({t:'bar'},m)));return true;}catch(e){return false;}}
function barRole(){return (window.cityRoles||[]).find(r=>r&&r.id==='barista')||null;}
function barOnce(k,text){if(BAR.told[k])return;BAR.told[k]=1;addEvent(text,'say');}
// за стойкой можно: работа «Бариста», одна полная смена позади, игрок в своём кафе, кафе — общая комната
function barShouldServe(){const j=player.job;return !!(j&&j.id==='barista'&&scene==='interior'&&interior&&interior.key===j.key&&interior.room);}
// своя карточка выбора поверх остальных; закрыть, если заказ отменили
function barCard(o,id){o.urgent=true;BAR.card=o;BAR.cardId=id||null;sitCard(o);}
function barDrop(id){const o=BAR.card;if(!o||(id&&BAR.cardId!==id))return;BAR.card=null;BAR.cardId=null;
  if(SIT.card===o)closeSitCardObj(o);else SIT.queue=SIT.queue.filter(x=>x!==o);}
// после перевода: карта по серверу (сохранение вернёт баланс); своя строка в ленте вместо общей «Списано по данным сервера»
// своя строка сразу; общая «Зачислено/Списано» той же суммы, когда сохранение вернёт баланс, — не нужна (WAL.note)
function barSync(d,text){addEvent(text,'say');if(typeof WAL!=='undefined')WAL.note={d,until:Date.now()+60e3};
  if(typeof acctSave==='function'){acctSave();setTimeout(()=>{if(typeof WAL!=='undefined'&&WAL.note)acctSave();},4000);}}

// ---------- сервер знает аккаунт этого соединения; смена у стойки ----------
if(typeof defWatch==='function')defWatch(()=>{
  if(!barLive()){BAR.sock=null;BAR.on=false;BAR.sent=null;return;}
  const tok=typeof acct!=='undefined'&&acct?acct.token:'';
  if(BAR.sock!==wsSock||BAR.tok!==tok){BAR.sock=wsSock;BAR.tok=tok;BAR.sent=null;try{wsSock.send(JSON.stringify({t:'auth',tok}));}catch(e){}}
  const serve=barShouldServe(),j=player.job;
  if(serve&&!tok){barOnce('acct','☕ Чтобы игроки могли заказывать у вас, войдите в аккаунт: деньги между игроками считает сервер');}
  else if(serve&&!((j.full||0)>=1)){barOnce('shift','☕ Отработайте одну полную смену баристы — тогда игроки в этом кафе смогут заказывать у вас чай и кофе');}
  const want=serve&&!!tok&&(j.full||0)>=1;
  if(want!==BAR.sent){BAR.sent=want;barSendWs({k:'duty',on:want});}});

// ---------- гость: подойти к игроку-баристе и заказать ----------
function barOrderCard(pr){
  barCard({icon:'☕',title:`Бариста ${pr.name}`,text:'Что заказать? Цену назовёт бариста, платить или нет — решите сами.',
    choices:BAR_ITEMS.map((n,i)=>({t:n,primary:i===3,run:()=>{BAR.card=null;if(barSendWs({k:'order',to:pr.key,item:i}))setHint('Заказ передан — бариста называет цену…');else setHint('Нет связи с сервером — заказать нельзя');}}))
      .concat([{t:'Не сейчас',run:()=>{BAR.card=null;}}])});}
function barPeerAction(pr){
  if(!pr||pr.rl!=='barista'||BAR.on||!Net.roles)return null;
  return {label:`☕ Заказать у баристы: ${pr.name}`,run:()=>{if(typeof acct==='undefined'||!acct){setHint('Заказать у игрока-баристы можно только с аккаунтом: деньги между игроками считает сервер');return;}barOrderCard(pr);}};}

// ---------- ответы сервера ----------
const BAR_ERR={account:'Заказать у игрока-баристы можно только с аккаунтом: деньги между игроками считает сервер','not-barista':'Этот игрок уже не за стойкой',
  self:'Себе продать нельзя',room:'Бариста в другом кафе',busy:'Прошлый заказ ещё в работе',queue:'У баристы очередь — попробуйте через минуту',
  'limit-day':'У баристы на сегодня всё: 40 чашек','limit-guest':'У этого баристы вы сегодня уже взяли 4 чашки',item:'Такого напитка нет',price:'Цена — от 60 до 220 ₽'};
const BAR_CANCEL={guest:{declined:'Бариста не взял заказ',refused:'Вы отказались от заказа',timeout:'Ответа нет минуту — заказ отменён',left:'Заказ отменён: кто-то вышел из кафе',
    funds:'Не хватает денег на карте — заказ отменён','limit-day':'У баристы на сегодня всё: 40 чашек',wallet:'Оплата не прошла — заказ отменён'},
  barista:{declined:'Вы отказали гостю',refused:'Гость отказался от заказа',timeout:'Ответа нет минуту — заказ отменён',left:'Заказ отменён: кто-то вышел из кафе',
    funds:'У гостя не хватило денег — заказ отменён','limit-day':'На сегодня всё: 40 чашек',wallet:'Оплата не прошла — заказ отменён'}};
function barApply(d){if(!d||typeof d!=='object')return;
  if(d.k==='duty'){const was=BAR.on;BAR.on=!!d.on;
    if(d.on){BAR.max=d.max||40;BAR.min=d.min||60;BAR.maxPrice=d.maxPrice||220;if(!was)addEvent(`☕ Вы за стойкой. Игроки в этом кафе могут заказать у вас чай и кофе: цену называете вы, от ${BAR.min} до ${BAR.maxPrice} ₽, деньги — вам на карту. Сегодня: ${d.cups||0} из ${BAR.max}`,'say');}
    else if(d.err==='young')barOnce('young','☕ Заказы от игроков откроются, когда вашему аккаунту будет больше суток');
    else if(d.err==='account')barOnce('acct','☕ Чтобы игроки могли заказывать у вас, войдите в аккаунт: деньги между игроками считает сервер');
    return;}
  if(d.k==='order'){setHint(`☕ ${d.from.name} просит: ${d.item}`);
    barCard({icon:'☕',title:`${d.from.name} просит: ${d.item}`,text:`Назовите цену. Гость сам решит, платить ли. Деньги — вам на карту.`,ttl:50,
      choices:BAR_PRICES.map((p,i)=>({t:`${p} ₽`,primary:i===1,run:()=>{BAR.card=null;barSendWs({k:'price',id:d.id,price:p});setHint('Цена названа — ждём, заплатит ли гость…');}}))
        .concat([{t:'Отказать',run:()=>{BAR.card=null;barSendWs({k:'price',id:d.id,price:0});}}]),
      onTimeout:()=>{BAR.card=null;barSendWs({k:'price',id:d.id,price:0});}},d.id);return;}
  if(d.k==='wait'){setHint(`Заказ у баристы ${d.to.name}: ${d.item}. Ждём цену…`);return;}
  if(d.k==='price'){
    barCard({icon:'☕',title:`${d.name}: «${d.item}» — ${fmtMoney(d.price)}`,text:'Оплата с карты, деньги уйдут баристе.',ttl:50,
      choices:[{t:`Оплатить ${fmtMoney(d.price)}`,primary:true,run:async()=>{BAR.card=null;setHint('Оплачиваем…');
          try{if(typeof acctSave==='function')await acctSave();}catch(e){}barSendWs({k:'pay',id:d.id,yes:true});}},   // сначала свои деньги — на сервер
        {t:'Отказаться',run:()=>{BAR.card=null;barSendWs({k:'pay',id:d.id,yes:false});}}],
      onTimeout:()=>{BAR.card=null;barSendWs({k:'pay',id:d.id,yes:false});}},d.id);return;}
  if(d.k==='priced')return;
  if(d.k==='done'){barDrop(d.id);
    if(d.side==='guest'){player.mood=clamp(player.mood+6,0,100);player.energy=clamp(player.energy+6,0,100);player.food=clamp((player.food||0)+4,0,100);
      barSync(-d.price,`☕ ${d.item} от баристы ${d.name}: −${fmtMoney(d.price)}. Настроение лучше`);setHint(`☕ ${d.item} готов — спасибо!`);}
    else{barSync(d.price,`☕ Гость ${d.name}: «${d.item}» оплачен, +${fmtMoney(d.price)}. Сегодня ${d.cups} из ${BAR.max}, за неделю ${d.week}`);
      const r=barRole(),L=r&&Array.isArray(r.lines)?r.lines.filter(s=>typeof s==='string'&&s):[];if(L.length&&typeof sayAloud==='function')sayAloud(pick(L));}
    return;}
  if(d.k==='cancel'){barDrop(d.id);const t=(BAR_CANCEL[d.side]||{})[d.why]||'Заказ отменён';if(!(d.side==='guest'&&d.why==='refused')&&!(d.side==='barista'&&d.why==='declined'))addEvent('☕ '+t);setHint(t);return;}
  if(d.k==='err'){setHint(BAR_ERR[d.e]||'Заказ не прошёл');return;}}
window.barApply=barApply;

// ---------- «Бариста недели» — в окне «Работа», у кого работа «Бариста» ----------
async function barTop(){try{const r=await fetch('api.php?a=ratings',{cache:'no-store'});if(!r.ok)return null;const j=await r.json();return j&&j.ok&&Array.isArray(j.coffeeWeek)?j.coffeeWeek:null;}catch(e){return null;}}
if(typeof renderJobs==='function'){const rj=renderJobs;window.renderJobs=renderJobs=function(){rj.apply(this,arguments);const j=player.job;if(!j||j.id!=='barista'||!Net.roles)return;
  const head=$('#jobsMine');if(!head)return;const c=document.createElement('div');c.className='rt-card';c.id='barTop';const b=document.createElement('b');b.textContent='☕ Бариста недели';
  const s=document.createElement('span');s.textContent=(j.full||0)>=1?'Игроки в вашем кафе могут заказать у вас чай и кофе, пока вы в нём. Цену называете вы, деньги — вам на карту.':'После первой полной смены игроки в вашем кафе смогут заказывать у вас чай и кофе.';
  const ol=document.createElement('ol');ol.className='bar-top';c.append(b,s,ol);head.append(c);
  barTop().then(list=>{if(!list)return;if(!list.length){const li=document.createElement('li');li.textContent='На этой неделе ещё никто не продал ни чашки';ol.append(li);return;}
    for(const x of list){const li=document.createElement('li');li.textContent=`${x.name} — ${x.n}`;ol.append(li);}});};}
