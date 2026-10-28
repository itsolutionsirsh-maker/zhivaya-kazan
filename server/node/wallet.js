// Серверный кошелёк «Живой Казани»: деньги аккаунта (игровые рубли: карта + вклад) и журнал операций.
//
// Сервер — источник правды о балансе. Изменения денег устройство присылает вместе с сохранением (a=save):
// пачка операций, у каждой свой номер. Проводятся они только вместе с принятым сохранением — в одной транзакции
// с записью state. Сохранение отвергнуто (на сервере новее: другое устройство, «Начать заново») — не проводится
// ничего: деньги и прогресс, к которому они относятся, всегда вместе. Повтор номера второй раз не начисляет.
// Заработок одиночной игры (смены, находки, кредит) сервер подтвердить не может — он ограничен потолками
// за 10 минут и за сутки по Москве; что сверх, не засчитывается, устройство получает баланс и поправляет деньги.
// Траты в минус не уводят: денег меньше нуля в игре нет (долги — отдельно, в сохранении).
// Переводы между игроками (заказ у баристы, поездка, штраф) делает только сервер — transfer(): атомарно, один раз
// на номер, без ухода в минус. Модератор и будущие покупки — grant(), без потолков, тоже по номеру.
// Кошелёк заводится при первом сохранении после запуска кошелька. Деньги берутся из прежней серверной копии
// сохранения (не из той, что пришла сейчас), не больше LIM.migrate; без неё — стартовые. Разница пришедшего
// сохранения с прежним (у нового аккаунта — деньги гостя сверх стартовых) — как обычный заработок, под потолки.
// Старая версия игры (открыта во время обновления) кошелька не знает и сохраняет без поля wallet; устройство, которое
// ещё не получило отпечаток (первое сохранение после загрузки игры с сервера или после старой версии), шлёт wallet
// без who. Их деньги засчитываются разницей с прошлым принятым сохранением (проверка base: это та копия, которую
// устройство загрузило или сохранило последней), под потолки — утренний платёж по кредиту при запуске не теряется.
'use strict';
const crypto=require('crypto');
const LIM={start:3000,migrate:300000,win:600,winMax:60000,dayMax:300000,op:60000,batch:500,perHour:1500,keepDays:60};
const ID_RE=/^[A-Za-z0-9_-]{6,48}$/;
const mskDay=t=>new Date(t*1000+3*3600e3).toISOString().slice(0,10);
const int=v=>v===null||v===undefined||v===''||typeof v==='boolean'||!Number.isFinite(+v)?NaN:Math.trunc(+v);
const clean=(s,n)=>typeof s==='string'?s.replace(/[\x00-\x1F\x7F]/g,' ').trim().slice(0,n):'';
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
// деньги сохранения: карта + вклад; сохранения нет или деньги испорчены — null
function stateTotal(s){if(!s||typeof s!=='object')return null;const m=int(s.money);if(!Number.isFinite(m))return null;const d=int(s.econ&&s.econ.dep);return Math.max(0,m)+(d>0?d:0);}

// ---------- хранилища: SQLite (та же база game.db) или JSON-файл (Node без node:sqlite, тесты) ----------
function sqliteBackend(db){
  db.exec(`CREATE TABLE IF NOT EXISTS wallet(k TEXT PRIMARY KEY,bal INTEGER NOT NULL,gen INTEGER NOT NULL DEFAULT 0,day TEXT,day_in INTEGER NOT NULL DEFAULT 0,created REAL,updated REAL);
    CREATE TABLE IF NOT EXISTS wops(k TEXT NOT NULL,id TEXT NOT NULL,amt INTEGER NOT NULL,req INTEGER NOT NULL,kind TEXT,why TEXT,peer TEXT,bal INTEGER,t REAL,PRIMARY KEY(k,id)) WITHOUT ROWID;
    CREATE INDEX IF NOT EXISTS wops_t ON wops(k,t);CREATE INDEX IF NOT EXISTS wops_old ON wops(t);`);
  const q={get:db.prepare('SELECT k,bal,gen,day,day_in AS dayIn,created,updated FROM wallet WHERE k=?'),
    put:db.prepare('INSERT INTO wallet(k,bal,gen,day,day_in,created,updated) VALUES(?,?,?,?,?,?,?) ON CONFLICT(k) DO UPDATE SET bal=excluded.bal,gen=excluded.gen,day=excluded.day,day_in=excluded.day_in,updated=excluded.updated'),
    op:db.prepare('SELECT * FROM wops WHERE k=? AND id=?'),
    add:db.prepare('INSERT INTO wops(k,id,amt,req,kind,why,peer,bal,t) VALUES(?,?,?,?,?,?,?,?,?)'),
    ops:db.prepare('SELECT * FROM wops WHERE k=? ORDER BY t DESC LIMIT ?'),
    gained:db.prepare("SELECT COALESCE(SUM(amt),0) AS n FROM wops WHERE k=? AND kind='local' AND amt>0 AND t>?"),
    count:db.prepare("SELECT COUNT(*) AS n FROM wops WHERE k=? AND kind='local' AND t>?"),
    prune:db.prepare("DELETE FROM wops WHERE t<? AND kind='local'"),del:db.prepare('DELETE FROM wallet WHERE k=?'),
    sum:db.prepare('SELECT COUNT(*) AS n,COALESCE(SUM(bal),0) AS total FROM wallet')};
  let depth=0;
  return {kind:'sqlite',get:k=>q.get.get(k)||null,put:w=>q.put.run(w.k,w.bal,w.gen||0,w.day,w.dayIn,w.created,w.updated),op:(k,id)=>q.op.get(k,id)||null,
    add:o=>q.add.run(o.k,o.id,o.amt,o.req,o.kind,o.why,o.peer||null,o.bal,o.t),ops:(k,n)=>q.ops.all(k,n),gained:(k,since)=>q.gained.get(k,since).n,count:(k,since)=>q.count.get(k,since).n,
    prune:before=>Number(q.prune.run(before).changes),del:k=>q.del.run(k),summary:()=>q.sum.get(),flush:()=>{},
    // одна запись — одна транзакция: сохранение и его деньги, перевод — у обоих сразу; ошибка посреди — откат всего
    tx:fn=>{if(depth)return fn();depth++;db.exec('BEGIN IMMEDIATE');try{const r=fn();db.exec('COMMIT');return r;}catch(e){try{db.exec('ROLLBACK');}catch(_){}throw e;}finally{depth--;}}};}
// запасное хранилище: журнал по аккаунтам в порядке времени; чистится только по сроку (номера помнятся keepDays),
// на диск — раз в 3 с и при остановке сервера (flush)
function jsonBackend(file,fs){let S={w:{},ops:{}};if(file&&fs){try{S=JSON.parse(fs.readFileSync(file,'utf8'))||S;}catch(e){}}S.w=S.w||{};S.ops=S.ops||{};let dirty=false;
  const flush=()=>{if(!dirty||!file||!fs)return;dirty=false;try{fs.writeFileSync(file+'.tmp',JSON.stringify(S));fs.renameSync(file+'.tmp',file);}catch(e){}};
  if(file&&fs)setInterval(flush,3000).unref();
  const list=k=>S.ops[k]||(S.ops[k]=[]);
  return {kind:'json',get:k=>S.w[k]?Object.assign({},S.w[k]):null,put:w=>{const c=Object.assign({},w);delete c.migrated;S.w[w.k]=c;dirty=true;},
    op:(k,id)=>{const l=list(k);for(let i=l.length-1;i>=0;i--)if(l[i].id===id)return l[i];return null;},
    add:o=>{list(o.k).push(Object.assign({},o));dirty=true;},
    ops:(k,n)=>list(k).slice(-n).reverse(),
    gained:(k,since)=>{const l=list(k);let s=0;for(let i=l.length-1;i>=0&&l[i].t>since;i--)if(l[i].kind==='local'&&l[i].amt>0)s+=l[i].amt;return s;},
    count:(k,since)=>{const l=list(k);let n=0;for(let i=l.length-1;i>=0&&l[i].t>since;i--)if(l[i].kind==='local')n++;return n;},
    prune:before=>{let n=0;for(const k in S.ops){const l=S.ops[k],m=l.filter(o=>o.t>=before||o.kind!=='local');n+=l.length-m.length;S.ops[k]=m;}if(n)dirty=true;return n;},
    del:k=>{delete S.w[k];dirty=true;},summary:()=>{const v=Object.values(S.w);return {n:v.length,total:v.reduce((s,w)=>s+w.bal,0)};},tx:fn=>fn(),flush};}

// ---------- сам кошелёк ----------
// opt.now() — секунды (тесты подменяют); opt.limits — свои потолки
function Wallet(be,opt){opt=opt||{};const L=Object.assign({},LIM,opt.limits||{});const now=opt.now||(()=>Date.now()/1000);
  // отпечаток кошелька для устройства: аккаунт + поколение (растёт при «Начать заново»).
  // Операции, накопленные под другим аккаунтом или в прежней игре, по нему отсекаются
  const whoOf=(k,gen)=>sha('wallet:'+k+':'+(gen||0)).slice(0,16);
  const opId=p=>p+Math.round(now()*1000).toString(36)+crypto.randomBytes(4).toString('hex');
  function newDay(w,t){const d=mskDay(t);if(w.day!==d){w.day=d;w.dayIn=0;}}
  function journal(w,o,t){be.add({k:w.k,id:o.id,amt:o.amt,req:o.req??o.amt,kind:o.kind,why:clean(o.why||'',80),peer:o.peer||null,bal:w.bal,t});}
  // заработок/трата одиночной игры: плюс — под потолки, минус — не ниже нуля
  function local(w,id,req,t){let amt;if(req>0){amt=Math.min(req,Math.max(0,Math.min(L.op,L.winMax-be.gained(w.k,t-L.win),L.dayMax-w.dayIn)));w.dayIn+=amt;}
    else amt=Math.max(req,-w.bal);w.bal+=amt;w.updated=t;journal(w,{id,amt,req,kind:'local'},t);return amt;}
  function create(k,prior,incoming,t){const p=stateTotal(prior);const req=p==null?L.start:p;const amt=Math.max(0,Math.min(req,L.migrate));
    const w={k,bal:amt,gen:0,day:mskDay(t),dayIn:0,created:t,updated:t};journal(w,{id:opId('i:'),amt,req,kind:'init',why:p==null?'стартовые деньги':'перенос денег из сохранения'},t);
    const inc=stateTotal(incoming);let first=0;if(inc!=null&&inc!==req)first=local(w,opId('f:'),inc-req,t);
    be.put(w);w.migrated={amt,req,first,firstReq:inc!=null?inc-req:0};return w;}
  // новых операций (не повторов) — не больше perHour в час: честное устройство шлёт ~120 и одну пачку после долгого
  // офлайна; сверх — не проводим и не отвечаем, устройство пришлёт их позже (журнал не раздувается)
  function applyOps(w,ops,res,t){let room=L.perHour-be.count(w.k,t-3600);for(const o of ops.slice(0,L.batch)){
    const cid=o&&typeof o==='object'?String(o.id||''):'';if(!ID_RE.test(cid)){res.push({id:cid.slice(0,48),err:'bad'});continue;}
    const id='c:'+cid,old=be.op(w.k,id);if(old){res.push({id:cid,amt:old.amt,req:old.req,dup:1});continue;}
    const req=int(o.amt);if(!Number.isFinite(req)||Math.abs(req)>1e9){res.push({id:cid,err:'bad'});continue;}
    if(!req){res.push({id:cid,amt:0,req:0});continue;}
    if(room--<=0)continue;
    const amt=local(w,id,req,t);res.push(amt===req?{id:cid,amt,req}:{id:cid,amt,req,cut:req-amt});}}
  // сохранение принято: o = {prior: прежнее state на сервере, incoming: пришедшее state, wal: {who, ops}};
  // write() — запись сохранения, в той же транзакции. Ответ — баланс, отпечаток и итог по каждой операции
  function commit(k,o,write){o=o||{};return be.tx(()=>{const t=now();let w=be.get(k);const init=w?null:(w=create(k,o.prior,o.incoming,t)).migrated;
    newDay(w,t);const who=whoOf(k,w.gen);const res=[];let other=0;const wal=o.wal&&typeof o.wal==='object'?o.wal:null;
    const ops=wal&&Array.isArray(wal.ops)?wal.ops:[],hasWho=!!(wal&&typeof wal.who==='string'&&wal.who);
    if(hasWho){if(wal.who===who){if(ops.length)applyOps(w,ops,res,t);}else other=1;}   // чужой аккаунт или прежняя игра — не проводим
    else if(ops.length)other=1;   // операции без отпечатка эта версия не шлёт
    // старая версия игры или устройство без отпечатка: деньги разницей с прошлым принятым сохранением, под потолки
    else if(!init){const inc=stateTotal(o.incoming),pri=stateTotal(o.prior);if(inc!=null&&pri!=null&&inc!==pri){const req=inc-pri,amt=local(w,opId('o:'),req,t);res.push(amt===req?{id:'old',amt,req}:{id:'old',amt,req,cut:req-amt});}}
    if(write)write();be.put(w);return {bal:w.bal,who,res,init,other};});}
  // перевод между игроками — только по решению сервера (обе стороны согласились, поездка закончилась и т. п.).
  // Номер — у отправителя (x:), у получателя своя запись (y:…) — встречный перевод с тем же номером заказа не путается
  function transfer(from,to,amt,id,why,kind){amt=int(amt);if(!(amt>0)||amt>L.op)return {err:'amount'};if(!from||!to||from===to)return {err:'self'};if(!ID_RE.test(String(id||'')))return {err:'id'};
    return be.tx(()=>{const t=now(),out='x:'+id,inn='y:'+sha(from+'|'+id).slice(0,24);const old=be.op(from,out);if(old){const a=be.get(from);return {ok:1,dup:1,bal:a?a.bal:null};}
      const a=be.get(from),b=be.get(to);if(!a||!b)return {err:'no_wallet'};if(a.bal<amt)return {err:'funds',bal:a.bal};
      a.bal-=amt;b.bal+=amt;a.updated=b.updated=t;
      journal(a,{id:out,amt:-amt,kind:kind||'xfer',why,peer:to},t);journal(b,{id:inn,amt,kind:kind||'xfer',why,peer:from},t);be.put(a);be.put(b);
      return {ok:1,bal:a.bal,to:b.bal};});}
  // начисление или списание сервером: модератор, будущие покупки. Без потолков, в минус не уводит
  function grant(k,amt,id,why,kind){amt=int(amt);if(!Number.isFinite(amt)||!amt||Math.abs(amt)>1e7)return {err:'amount'};id=id||opId('');if(!ID_RE.test(String(id)))return {err:'id'};
    return be.tx(()=>{const t=now(),sid='g:'+id;const old=be.op(k,sid);if(old){const w=be.get(k);return {ok:1,dup:1,amt:old.amt,bal:w?w.bal:null};}
      const w=be.get(k);if(!w)return {err:'no_wallet'};const a=amt<0?Math.max(amt,-w.bal):amt;w.bal+=a;w.updated=t;journal(w,{id:sid,amt:a,req:amt,kind:kind||'grant',why},t);be.put(w);return {ok:1,amt:a,bal:w.bal};});}
  // «Начать заново»: стартовые деньги и новое поколение — операции прежней игры больше не проводятся.
  // write() — сброс сохранения, в той же транзакции. Кошелька ещё не было — его заведёт первое сохранение (стартовые)
  function reset(k,write,why){return be.tx(()=>{const t=now();const w=be.get(k);if(write)write();if(!w)return {ok:1,bal:null};const amt=L.start-w.bal;w.bal=L.start;w.gen=(w.gen||0)+1;w.dayIn=0;w.updated=t;
    journal(w,{id:opId('r:'),amt,kind:'reset',why:why||'начать заново'},t);be.put(w);return {ok:1,bal:w.bal};});}
  function info(k,n){const w=be.get(k);return {ok:1,bal:w?w.bal:null,day:w?w.day:null,dayIn:w?w.dayIn:0,gen:w?w.gen||0:0,
    ops:w?be.ops(k,Math.max(1,Math.min(200,n||30))).map(o=>({id:o.id,amt:o.amt,req:o.req,kind:o.kind,why:o.why,peer:o.peer,bal:o.bal,t:o.t})):[]};}
  // старые операции с устройств больше не нужны для повторов; начальные, переводы и начисления храним
  function prune(){return be.prune(now()-L.keepDays*86400);}
  return {commit,transfer,grant,reset,info,prune,who:k=>{const w=be.get(k);return w?whoOf(k,w.gen):null;},summary:()=>be.summary(),flush:()=>be.flush(),LIM:L};}

module.exports={Wallet,sqliteBackend,jsonBackend,LIM,mskDay,stateTotal};
