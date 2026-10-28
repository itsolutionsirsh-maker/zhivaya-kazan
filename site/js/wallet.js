// Деньги на сервере (server/node/wallet.js). У игрока с аккаунтом правда о деньгах — у сервера.
// Вместе с сохранением (раз в 30 секунд и при закрытии) устройство отправляет, на сколько изменились его деньги
// (карта + вклад), операцией с номером, и получает баланс сервера. Ответ потерялся или вкладка закрылась —
// операция остаётся в zk.wallet и уходит ещё раз с тем же номером: сервер второй раз её не проведёт.
// Сервер что-то не засчитал (потолок заработка) или прислал деньги сам (перевод, модератор) — поправляем карту.
// Без аккаунта или на сервере без кошелька (старый PHP-хостинг) — деньги только в этом браузере, как раньше.
// Инвариант: (деньги в zk.state) − base = изменения, ещё не ставшие операцией; поэтому base меняется только вместе
// с деньгами (walletStage перед saveState, ответ сервера, загрузка чужого сохранения — walletRebase).
const WAL={who:null,base:null,pend:[],bal:null,busy:false,off:false};
try{const s=JSON.parse(localStorage.getItem('zk.wallet')||'null');if(s&&typeof s==='object'){
  WAL.who=typeof s.who==='string'?s.who:null;WAL.base=Number.isFinite(s.base)?s.base:null;WAL.bal=Number.isFinite(s.bal)?s.bal:null;
  // недоставленные операции старше месяца не шлём: сервер помнит номера 60 дней
  WAL.pend=Array.isArray(s.pend)?s.pend.filter(o=>o&&typeof o.id==='string'&&Number.isFinite(o.amt)&&Date.now()-(o.t||0)<30*86400e3).slice(-300):[];}}catch(e){}
function walletPersist(){try{localStorage.setItem('zk.wallet',JSON.stringify({who:WAL.who,base:WAL.base,bal:WAL.bal,pend:WAL.pend}));}catch(e){}}
function walletLocal(){return Math.round((player.money||0)+(typeof ECON!=='undefined'&&ECON.dep>0?ECON.dep:0));}
function walletOn(){return !!(typeof acct!=='undefined'&&acct&&Net.wallet&&!WAL.off&&!window.zkNoSave);}
function walletId(){const a=new Uint8Array(9);crypto.getRandomValues(a);return 'w'+Date.now().toString(36)+Array.from(a,b=>b.toString(16).padStart(2,'0')).join('');}
// изменения денег с прошлой отправки — в операцию (сразу перед saveState: деньги и base записываются вместе).
// Последняя операция ещё ни разу не уходила (нет связи) — дописываем в неё: офлайн не копит сотни мелких операций.
function walletStage(){if(!walletOn()||WAL.who==null||WAL.base==null)return;const d=walletLocal()-WAL.base;if(!d)return;
  const last=WAL.pend[WAL.pend.length-1];if(last&&!last.s)last.amt+=d;else WAL.pend.push({id:walletId(),amt:d,t:Date.now()});WAL.base+=d;walletPersist();}
// операции уходят на сервер: с этого момента их сумму не меняем (сервер мог её уже провести)
function walletSending(){const ops=WAL.pend.slice(0,20);let ch=false;for(const o of ops)if(!o.s){o.s=1;ch=true;}if(ch)walletPersist();return ops.map(o=>({id:o.id,amt:o.amt}));}
// поставить деньги по серверу: total — сколько должно быть всего; разница — с карты, не хватает на карте — со вклада
function walletSetTotal(total){const d=Math.round(total)-walletLocal();if(!d)return 0;player.money=(player.money||0)+d;
  if(player.money<0&&typeof ECON!=='undefined'){ECON.dep=Math.max(0,(ECON.dep||0)+player.money);player.money=0;}if(player.money<0)player.money=0;
  if(typeof ECON!=='undefined')ECON.last=player.money;   // поправка — не доход и не расход дня в сводке банка
  return d;}
async function walletSync(){if(!walletOn()||WAL.busy)return;WAL.busy=true;
  try{const j=await acctCall('wallet',{token:acct.token,who:WAL.who||undefined,ops:walletSending()});
    if(!j||j.err){if(j&&j.err==='unknown_action')WAL.off=true;return;}
    if(!Net.syncReady||!walletOn())return;   // пока ждали ответ, игра ушла на другое устройство или перезапускается
    // это устройство впервые или помнит другой аккаунт: его операции не наши, деньги — как на сервере
    const fresh=!!j.other||WAL.who!==j.who;
    let cut=0;if(fresh)WAL.pend=[];else{const done=new Map((j.res||[]).map(x=>[x.id,x]));WAL.pend=WAL.pend.filter(o=>!done.has(o.id));for(const x of done.values())cut+=x.cut||0;}
    const pendSum=WAL.pend.reduce((s,o)=>s+o.amt,0),unstaged=fresh||WAL.base==null?0:walletLocal()-WAL.base;
    WAL.who=j.who;WAL.bal=j.bal;WAL.base=j.bal+pendSum;const d=walletSetTotal(j.bal+pendSum+unstaged);walletPersist();
    if(j.init&&j.init.req>j.init.amt)addEvent(`🏦 Деньги теперь хранятся на сервере. Перенесено ${fmtMoney(j.init.amt)} — больше за раз не переносится`,'alert');
    else if(cut>0)addEvent(`🏦 Сервер не засчитал ${fmtMoney(cut)}: столько за несколько минут не заработать`,'alert');
    else if(d>0&&!fresh)addEvent(`🏦 Зачислено на карту: ${fmtMoney(d)}`,'say');
    else if(d<0&&!fresh)addEvent(`🏦 Списано по данным сервера: ${fmtMoney(-d)}`,'alert');
    if(d&&typeof saveState==='function')saveState();}
  catch(e){}finally{WAL.busy=false;}}
// закрытие страницы: ответ не дождаться — операции остаются в zk.wallet, следующий запуск пришлёт их с теми же номерами
function walletBeacon(){if(!walletOn()||!WAL.pend.length||!navigator.sendBeacon)return;
  try{navigator.sendBeacon('api.php',new Blob([JSON.stringify({a:'wallet',token:acct.token,who:WAL.who||undefined,ops:walletSending()})],{type:'application/json'}));}catch(e){}}
// загружаем сохранение с сервера (другое устройство, вход): база — деньги этого сохранения; свои недоставленные операции остаются
function walletRebase(state){WAL.base=state&&Number.isFinite(+state.money)?Math.round(Math.max(0,+state.money)+(state.econ&&state.econ.dep>0?+state.econ.dep:0)):null;walletPersist();}
