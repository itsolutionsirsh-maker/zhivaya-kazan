// ===== Деньги, второй круг: банк (вклад, кредит, страховки), своя машина после ДТП, сводка в телефон =====
// Деньги игрока — player.money (это карта). Здесь: вклад под проценты, кредит с ежедневным платежом и просрочкой,
// ОСАГО/КАСКО, состояние своей машины (ремонт в автосервисе на АЗС), учёт доходов/расходов за день.
const ECON={owed:0,dep:0,loan:null,osagoTill:0,kaskoTill:0,carCond:100,claim:false,dIn:0,dOut:0,day:0,t:0,last:null};
const RATE={dep:16,loan:28,loanDays:30,osago:8500,kasko:32000,repair:180,franchise:15000,noOsago:800,tow:3000,pedHarm:30000};
function econDump(){const o={};for(const k of ['owed','dep','loan','osagoTill','kaskoTill','carCond','claim','dIn','dOut','day'])o[k]=ECON[k];return o;}
function econApply(o){if(o&&typeof o==='object')for(const k in o)if(k in ECON)ECON[k]=o[k];ECON.last=null;}
// сообщение в телефон (лента «Сегодня» второго программиста), если он подключён; иначе — в ленту событий
function phoneNote(from,text,kind,alsoFeed){let ok=false;if(window.cityPhone&&typeof window.cityPhone.push==='function'){try{window.cityPhone.push({from,text,kind});ok=true;}catch(e){}}
  if(alsoFeed||!ok)addEvent(`${from}: ${text}`,kind==='fine'||kind==='debt'?'alert':'say');}
// деньги, которые уже прошли через sitMoney: только отправить уведомление в телефон
function econNotify(d,why){if(!why)return;const w=String(why);
  if(d>0&&/Смена|смена/.test(w))phoneNote('Банк',`Зарплата +${fmtMoney(d)} · ${w.replace(/^💼\s*/,'')}`,'pay');
  else if(d<0&&/Штраф|штраф|КоАП/.test(w))phoneNote('Госуслуги',`${w}: ${fmtMoney(-d)}`,'fine');
  else if(d<0&&/Аренда|Коммунал|ЖКУ/.test(w))phoneNote(/Аренда/.test(w)?'Хозяйка квартиры':'ЖКХ',`${w}: оплачено ${fmtMoney(-d)}`,'bill');}
function insured(k){return (k==='kasko'?ECON.kaskoTill:ECON.osagoTill)>=clock.day;}
// ---------- учёт и утро ----------
function updateEcon(rdt){if(!world)return;ECON.t-=rdt;if(ECON.t>0)return;ECON.t=0.5;
  if(ECON.last==null)ECON.last=player.money;const d=player.money-ECON.last;ECON.last=player.money;
  if(Math.abs(d)<200000){if(d>0)ECON.dIn+=d;else if(d<0)ECON.dOut-=d;}
  if(clock.day!==ECON.day&&cityHour()>=7){const first=!ECON.day;ECON.day=clock.day;econMorning(first);}}
function econMorning(first){
  if(!first&&(ECON.dIn||ECON.dOut))phoneNote('Банк',`Вчера: доход +${fmtMoney(ECON.dIn)}, расходы −${fmtMoney(ECON.dOut)}. На карте ${fmtMoney(player.money)}${ECON.dep?`, на вкладе ${fmtMoney(ECON.dep)}`:''}`,'report');
  ECON.dIn=0;ECON.dOut=0;
  if(ECON.dep>0){const p=Math.round(ECON.dep*RATE.dep/100/365);ECON.dep+=p;}
  const L=ECON.loan;
  if(L){const pay=Math.min(L.left,L.daily);
    if(player.money>=pay){player.money-=pay;ECON.last=player.money;L.left-=pay;L.over=0;
      if(L.left<=0){ECON.loan=null;phoneNote('Банк','Кредит погашен полностью. Спасибо!','loan',true);if(typeof sitRep==='function')sitRep(1,'вовремя закрыли кредит');}
      else phoneNote('Банк',`Платёж по кредиту −${fmtMoney(pay)}. Осталось ${fmtMoney(L.left)}`,'loan');}
    else{L.over=(L.over||0)+1;const pen=Math.round(pay*0.2);L.left+=pen;phoneNote('Банк',`Не хватило на платёж по кредиту (${fmtMoney(pay)}). Просрочка ${L.over} дн., пени +${fmtMoney(pen)}`,'debt',true);
      if(L.over>=3&&typeof startSit==='function'&&!sitActive('collectors'))startSit('collectors');}}
  if(ECON.owed>0&&player.money>0){const take=Math.min(ECON.owed,Math.round(player.money*0.5));player.money-=take;ECON.last=player.money;ECON.owed-=take;phoneNote('ФССП',`Списано ${fmtMoney(take)} в счёт долга по суду. Осталось ${fmtMoney(ECON.owed)}`,'debt',true);}
  if(ECON.osagoTill&&ECON.osagoTill-clock.day===3)phoneNote('Страховая','Полис ОСАГО заканчивается через 3 дня. Продлить можно в отделении банка','ins');
  if(ECON.osagoTill&&ECON.osagoTill+1===clock.day)phoneNote('Страховая','Полис ОСАГО закончился. Ездить без него — штраф 800 ₽, а при ДТП платите сами','ins',true);}
// звонок из банка при просрочке
if(typeof defSit==='function')defSit('collectors',{title:'Звонок из банка',quiet:true,
  start(s){const L=ECON.loan;if(!L)return false;
    sitCard({s,icon:'📞',tone:'call',title:'Звонят из банка',text:`«${player.name}, у вас просрочка по кредиту ${L.over} дн. Долг ${fmtMoney(L.left)}. Когда внесёте платёж?»`,ttl:20,
      choices:[{t:`Внести ${fmtMoney(L.daily*2)} сейчас`,primary:true,run:()=>{const p=Math.min(L.daily*2,L.left);if(player.money<p){setHint('На карте не хватает');sitMood(-3);endSit(s);return;}player.money-=p;ECON.last=player.money;L.left-=p;L.over=0;phoneNote('Банк',`Внесено ${fmtMoney(p)}. Осталось ${fmtMoney(L.left)}`,'loan');if(L.left<=0)ECON.loan=null;endSit(s);}},
        {t:'Обещать до завтра',run:()=>{sitMood(-3);endSit(s);}},
        {t:'Бросить трубку',run:()=>{sitRep(-2,'бегаете от банка');sitMood(-5);endSit(s);}}],
      onTimeout:()=>endSit(s)});return true;}});
// ---------- окно банка ----------
let bankMode='bank';
function openBank(mode){bankMode=mode||'bank';renderBank();$('#bankModal').hidden=false;player.busy=true;}
function closeBank(){$('#bankModal').hidden=true;player.busy=false;}
function bankOp(fn){fn();ECON.last=player.money;renderBank();if(typeof saveState==='function')saveState();}
function loanDaily(sum){return Math.ceil(sum*(1+RATE.loan/100*RATE.loanDays/365)/RATE.loanDays/10)*10;}
function renderBank(){const box=$('#bankBody');box.innerHTML='';
  const card=(title,lines,btns)=>{const c=document.createElement('div');c.className='rt-card';const b=document.createElement('b');b.textContent=title;c.append(b);
    for(const l of lines){const s=document.createElement('span');s.textContent=l;c.append(s);}
    if(btns&&btns.length){const r=document.createElement('div');r.className='row';for(const [t,fn,primary,dis] of btns){const x=document.createElement('button');x.className='btn'+(primary?' primary':'');x.textContent=t;x.disabled=!!dis;x.addEventListener('click',()=>bankOp(fn));r.append(x);}c.append(r);}box.append(c);};
  card('💳 Карта',[`На карте ${fmtMoney(player.money)}`,`Сегодня: доход +${fmtMoney(ECON.dIn)}, расходы −${fmtMoney(ECON.dOut)}`]);
  if(ECON.owed>0)card('⚖️ Долг по суду',[`${fmtMoney(ECON.owed)} · приставы списывают половину денег на карте каждое утро`],[[`Погасить · ${fmtMoney(ECON.owed)}`,()=>{if(player.money<ECON.owed){setHint('На карте не хватает');return;}player.money-=ECON.owed;phoneNote('ФССП','Долг погашен, ограничения сняты','debt',true);ECON.owed=0;},true,player.money<ECON.owed]]);
  const put=n=>()=>{const v=Math.min(n,player.money);if(v<=0)return;player.money-=v;ECON.dep+=v;phoneNote('Банк',`На вклад +${fmtMoney(v)}. Всего ${fmtMoney(ECON.dep)}`,'dep');};
  card(`🏦 Вклад · ${RATE.dep}% годовых`,[ECON.dep?`На вкладе ${fmtMoney(ECON.dep)} · за день капает ≈ ${fmtMoney(Math.round(ECON.dep*RATE.dep/100/365))}`:'Пусто. Проценты начисляются каждое утро'],
    [['+1 000',put(1000),false,player.money<1],['+5 000',put(5000),false,player.money<1],['Всё с карты',put(player.money),false,player.money<1],['Снять всё',()=>{if(!ECON.dep)return;player.money+=ECON.dep;phoneNote('Банк',`С вклада на карту ${fmtMoney(ECON.dep)}`,'dep');ECON.dep=0;},true,!ECON.dep]]);
  if(bankMode==='atm'){const n=document.createElement('p');n.className='hint';n.textContent='Кредит и страховка — в отделении банка (в будни днём).';box.append(n);return;}
  const L=ECON.loan;
  if(L)card(`💸 Кредит · ${RATE.loan}% годовых`,[`Осталось ${fmtMoney(L.left)} · платёж ${fmtMoney(L.daily)} каждое утро${L.over?` · просрочка ${L.over} дн.`:''}`],
    [[`Погасить всё · ${fmtMoney(L.left)}`,()=>{if(player.money<L.left){setHint('На карте не хватает');return;}player.money-=L.left;ECON.loan=null;phoneNote('Банк','Кредит погашен досрочно','loan',true);},true,player.money<L.left]]);
  else{const bad=(player.rep||0)<-10||(player.debt||0)>0||ECON.owed>0;const take=sum=>()=>{if(bad)return;ECON.loan={sum,left:Math.round(loanDaily(sum)*RATE.loanDays),daily:loanDaily(sum),over:0,day:clock.day};player.money+=sum;phoneNote('Банк',`Кредит ${fmtMoney(sum)} зачислен. Платёж ${fmtMoney(loanDaily(sum))} каждое утро, ${RATE.loanDays} дней`,'loan',true);};
    card(`💸 Кредит наличными · ${RATE.loan}% годовых, ${RATE.loanDays} дней`,[bad?'Банк отказал: плохая репутация или долги':'Платёж списывается с карты каждое утро. Не хватит — пени и звонки'],
      [[`10 000 · по ${fmtMoney(loanDaily(10000))}/день`,take(10000),false,bad],[`30 000 · по ${fmtMoney(loanDaily(30000))}/день`,take(30000),false,bad]]);}
  if(player.hasCar){const os=insured('osago'),ks=insured('kasko');
    const buy=(k,price,days)=>()=>{if(player.money<price){setHint('На карте не хватает');return;}player.money-=price;ECON[k+'Till']=Math.max(ECON[k+'Till'],clock.day)+days;phoneNote('Страховая',`${k==='osago'?'ОСАГО':'КАСКО'} оформлено до дня ${ECON[k+'Till']}`,'ins',true);};
    card('🚗 Страховка машины',[`ОСАГО: ${os?'действует до дня '+ECON.osagoTill:'нет — без него штраф 800 ₽, а при ДТП по вашей вине платите сами'}`,`КАСКО: ${ks?'действует до дня '+ECON.kaskoTill:'нет — ремонт своей машины за ваш счёт'}`,`Машина: ${Math.round(ECON.carCond)}%${ECON.claim?' · ремонт оплатит страховая виновника':''}`],
      [[`ОСАГО на год · ${fmtMoney(RATE.osago)}`,buy('osago',RATE.osago,365),!os,player.money<RATE.osago],[`КАСКО на год · ${fmtMoney(RATE.kasko)}`,buy('kasko',RATE.kasko,365),false,player.money<RATE.kasko]]);}}
// ---------- своя машина ----------
// платёж, на который может не хватить: остаток — долг по суду, приставы списывают половину денег каждое утро
function econCharge(sum,what){const pay=Math.min(sum,player.money);if(pay>0)sitMoney(-pay,what);const rest=sum-pay;if(rest>0){ECON.owed+=rest;phoneNote('ФССП',`${what}: не хватило ${fmtMoney(rest)} — долг по суду. Приставы будут списывать половину денег на карте каждое утро`,'debt',true);}}
function repairCost(){return Math.round((100-ECON.carCond)*RATE.repair/100)*100;}
function repairFree(){return ECON.claim||insured('kasko');}
// ДТП с участием игрока за рулём (вызывается из vehicles.js)
function econCrash(v,fault,ped){
  if(v.kind==='car'&&fault){setTimeout(()=>{sitMoney(-RATE.franchise,'Каршеринг: франшиза за ДТП по вашей вине');phoneNote('Каршеринг',`Списана франшиза ${fmtMoney(RATE.franchise)} за повреждение машины`,'fine');},4000);return;}
  if(v.kind!=='own')return;
  ECON.carCond=Math.max(5,ECON.carCond-(ped?rnd(6,12):rnd(25,45)));
  setTimeout(()=>{
    if(fault||ped){
      if(insured('osago'))phoneNote('Страховая',`ОСАГО: ${ped?'лечение пострадавшего':'ремонт второй машины'} оплатим мы. Свою машину ${insured('kasko')?'починим по КАСКО':'чините за свой счёт'}`,'ins',true);
      else{const dmg=ped?RATE.pedHarm:Math.round(rnd(18,45))*1000;econCharge(dmg,ped?'Компенсация пострадавшему (нет ОСАГО)':'Ущерб второй машине (нет ОСАГО)');sitMoney(-RATE.noOsago,'Штраф: езда без ОСАГО (ст. 12.37 КоАП)');}}
    else{ECON.claim=true;phoneNote('Страховая','Виноват другой водитель — его ОСАГО оплатит ремонт вашей машины. Заезжайте в автосервис на АЗС ⛽','ins',true);}
    if(ECON.carCond<12)addEvent('🚗 Машина сильно разбита и не заводится. Эвакуатор и ремонт — рядом с машиной (E)','alert');
    else if(ECON.carCond<60)addEvent(`🚗 Машина побита: ${Math.round(ECON.carCond)}%. Едет хуже. Ремонт — автосервис на АЗС ⛽`);},5000);}
function repairAction(onFoot){const c=repairCost();const free=repairFree();
  return {label:onFoot?`Машина не заводится · эвакуатор и ремонт · ${free?fmtMoney(RATE.tow):fmtMoney(RATE.tow+c)}`:`Автосервис: ремонт ${Math.round(ECON.carCond)}% → 100% · ${free?'за счёт страховой':fmtMoney(c)}`,
    run:()=>{const sum=(free?0:c)+(onFoot?RATE.tow:0);if(player.money<sum){setHint(`Нужно ${fmtMoney(sum)}. Можно взять кредит в банке`);return;}
      player.money-=sum;ECON.carCond=100;ECON.claim=false;clock.minutes+=onFoot?180:90;
      addEvent(onFoot?`🚗 Эвакуатор увёз машину в сервис, вечером её пригнали обратно. ${free?'Ремонт оплатила страховая':'Ремонт '+fmtMoney(c)}`:`🔧 Машину отремонтировали${free?' за счёт страховой':': '+fmtMoney(c)}. Как новая`,'say');
      if(sum)phoneNote('Автосервис',`Ремонт машины: ${fmtMoney(sum)}`,'bill');}};}
function carSpeedMul(){return ECON.carCond<50?0.7+ECON.carCond/170:1;}
$('#bankClose').addEventListener('click',closeBank);
