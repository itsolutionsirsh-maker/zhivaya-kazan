// Деньги на сервере (server/node/wallet.js). У игрока с аккаунтом правда о деньгах — у сервера.
// Каждое сохранение на сервер (раз в 30 секунд и при закрытии) несёт изменения денег (карта + вклад) с прошлого раза —
// операциями с номерами. Сервер проводит их только вместе с принятым сохранением: отвергнуто (на сервере новее —
// другое устройство, «Начать заново») — не проводится ничего, и здесь операции выбрасываются вместе с тем прогрессом.
// Ответ потерялся — операции остаются и уходят снова с теми же номерами: второй раз сервер их не проведёт.
// После ответа карта ставится по балансу сервера (потолок заработка, перевод, модератор).
// Без аккаунта — деньги только в этом браузере, как раньше. Поле wallet уходит с каждым сохранением аккаунта:
// по нему сервер отличает эту версию от старой (та кошелька не знает — её деньги сервер считает сам, разницей).
// Сервер без кошелька поле не знает и не отвечает кошельком: who не появится, операций не будет.
// Состояние кошелька (who, base, pend) лежит в zk.state рядом с деньгами — одним снимком: вкладки одного браузера
// и перезагрузки не разводят деньги и базу. На сервер оно не уходит (acctSnapshot убирает wal).
// Инвариант: (карта + вклад) − base = изменения, ещё не ставшие операцией.
const WAL={who:null,base:null,pend:[],bal:null};
function walletLocal(){return Math.round((player.money||0)+(typeof ECON!=='undefined'&&ECON.dep>0?ECON.dep:0));}
function walletOn(){return !!(typeof acct!=='undefined'&&acct&&!window.zkNoSave);}
function walletDump(){return WAL.who||WAL.pend.length?{who:WAL.who,base:WAL.base,pend:WAL.pend}:undefined;}
// из сохранения (loadState): нет — устройство начнёт с баланса сервера. Операции не выбрасываем: их суммы уже в base
function walletLoad(w){WAL.who=null;WAL.base=null;WAL.pend=[];if(!w||typeof w!=='object')return;
  WAL.who=typeof w.who==='string'?w.who:null;WAL.base=Number.isFinite(w.base)?w.base:null;
  WAL.pend=Array.isArray(w.pend)?w.pend.filter(o=>o&&typeof o.id==='string'&&Number.isFinite(o.amt)):[];}
function walletId(){const a=new Uint8Array(9);crypto.getRandomValues(a);return 'w'+Date.now().toString(36)+Array.from(a,b=>b.toString(16).padStart(2,'0')).join('');}
// перед сохранением на сервер (acctSnapshot, до saveState): изменения с прошлого раза — в операцию; уходят все недоставленные
// (сервер проводит их все вместе с принятым сохранением — после конфликта выбрасывать их безопасно).
// Отправленную операцию не меняем: сервер мог её уже провести с этой суммой. Исключение — 500 операций без единого
// принятого сохранения (часы без связи): тогда дописываем в последнюю, иначе запрос растёт без конца
function walletOut(){if(!walletOn())return undefined;
  if(WAL.who!=null&&WAL.base!=null){const d=walletLocal()-WAL.base;if(d){if(WAL.pend.length>=500)WAL.pend[WAL.pend.length-1].amt+=d;else WAL.pend.push({id:walletId(),amt:d,t:Date.now()});WAL.base+=d;}}
  return {who:WAL.who||undefined,ops:WAL.pend.map(o=>({id:o.id,amt:o.amt})),snap:walletLocal()};}
// поставить деньги по серверу: total — сколько должно быть всего; разница — с карты, не хватает на карте — со вклада
function walletSetTotal(total){const d=Math.round(total)-walletLocal();if(!d)return 0;player.money=(player.money||0)+d;
  if(player.money<0&&typeof ECON!=='undefined'){ECON.dep=Math.max(0,(ECON.dep||0)+player.money);player.money=0;}if(player.money<0)player.money=0;
  if(typeof ECON!=='undefined')ECON.last=player.money;   // поправка — не доход и не расход дня в сводке банка
  return walletLocal()-(Math.round(total)-d);}
// сохранение принято: r — ответ кошелька, snap — деньги на момент снимка (что изменилось за время запроса — сверху)
function walletAfter(r,snap){if(!r||!walletOn()||typeof r.who!=='string')return;
  // это устройство впервые, помнит другой аккаунт или прежнюю игру («Начать заново»): деньги — как на сервере
  const fresh=!!r.other||WAL.who!==r.who;let cut=0;
  if(fresh)WAL.pend=[];else{const done=new Map((r.res||[]).map(x=>[x.id,x]));WAL.pend=WAL.pend.filter(o=>!done.has(o.id));for(const x of done.values())cut+=x.cut||0;}
  if(r.init)cut+=Math.max(0,(r.init.firstReq||0)-(r.init.first||0));
  const pendSum=WAL.pend.reduce((s,o)=>s+o.amt,0),unstaged=Number.isFinite(snap)?walletLocal()-snap:0;
  WAL.who=r.who;WAL.bal=r.bal;const d=walletSetTotal(r.bal+pendSum+unstaged);WAL.base=walletLocal()-unstaged;
  if(r.init&&r.init.req>r.init.amt)addEvent(`🏦 Деньги теперь хранятся на сервере. Перенесено ${fmtMoney(r.init.amt)} — больше за раз не переносится`,'alert');
  else if(cut>0)addEvent(`🏦 Сервер не засчитал ${fmtMoney(cut)}: столько за несколько минут не заработать`,'alert');
  else if(d>0&&!fresh)addEvent(`🏦 Зачислено на карту: ${fmtMoney(d)}`,'say');
  else if(d<0&&!fresh)addEvent(`🏦 Списано по данным сервера: ${fmtMoney(-d)}`,'alert');
  if(typeof saveState==='function')saveState();}
// сохранение отвергнуто: этот прогресс не будет принят — и его деньги тоже; новые операции — только после загрузки с сервера
function walletDrop(){WAL.pend=[];WAL.base=null;}
