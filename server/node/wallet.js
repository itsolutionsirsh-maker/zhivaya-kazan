// Серверный кошелёк «Живой Казани»: деньги аккаунта (игровые рубли: карта + вклад) и журнал операций.
//
// Сервер — источник правды о балансе. Клиент присылает изменения своих денег пачкой операций: у каждой свой номер,
// повтор того же номера ничего не начисляет второй раз (ответ потерялся, вкладка закрылась — клиент шлёт ещё раз).
// Заработок одиночной игры (смены, находки, кредит) сервер подтвердить не может — он ограничен потолками
// за 10 минут и за сутки по Москве; что сверх, не засчитывается, клиент получает баланс сервера и поправляет деньги.
// Траты в минус не уводят: денег меньше нуля в игре нет (долги — отдельно, в сохранении).
// Переводы между игроками (заказ у баристы, поездка, штраф) делает только сервер — transfer(): атомарно, один раз
// на номер, без ухода в минус. Модератор и будущие покупки — grant(), без потолков, тоже по номеру.
// Перенос старых денег — один раз, при первом обращении: карта + вклад из последнего сохранения аккаунта,
// не больше LIM.migrate (старые сохранения писал клиент, верить им без предела нельзя). Без сохранения — стартовые.
'use strict';
const crypto=require('crypto');
const LIM={start:3000,migrate:300000,win:600,winMax:60000,dayMax:300000,op:60000,batch:20,keepDays:60};
const ID_RE=/^[A-Za-z0-9_-]{6,48}$/;
const mskDay=t=>new Date(t*1000+3*3600e3).toISOString().slice(0,10);
const int=v=>v===null||v===''||typeof v==='boolean'||!Number.isFinite(+v)?NaN:Math.trunc(+v);
const clean=(s,n)=>typeof s==='string'?s.replace(/[\x00-\x1F\x7F]/g,' ').trim().slice(0,n):'';

// ---------- хранилища: SQLite (та же база game.db) или JSON-файл (Node без node:sqlite, тесты) ----------
function sqliteBackend(db){
  db.exec(`CREATE TABLE IF NOT EXISTS wallet(k TEXT PRIMARY KEY,bal INTEGER NOT NULL,day TEXT,day_in INTEGER NOT NULL DEFAULT 0,created REAL,updated REAL);
    CREATE TABLE IF NOT EXISTS wops(k TEXT NOT NULL,id TEXT NOT NULL,amt INTEGER NOT NULL,req INTEGER NOT NULL,kind TEXT,why TEXT,peer TEXT,bal INTEGER,t REAL,PRIMARY KEY(k,id)) WITHOUT ROWID;
    CREATE INDEX IF NOT EXISTS wops_t ON wops(k,t);CREATE INDEX IF NOT EXISTS wops_old ON wops(t);`);
  const q={get:db.prepare('SELECT k,bal,day,day_in AS dayIn,created,updated FROM wallet WHERE k=?'),
    put:db.prepare('INSERT INTO wallet(k,bal,day,day_in,created,updated) VALUES(?,?,?,?,?,?) ON CONFLICT(k) DO UPDATE SET bal=excluded.bal,day=excluded.day,day_in=excluded.day_in,updated=excluded.updated'),
    op:db.prepare('SELECT * FROM wops WHERE k=? AND id=?'),
    add:db.prepare('INSERT INTO wops(k,id,amt,req,kind,why,peer,bal,t) VALUES(?,?,?,?,?,?,?,?,?)'),
    ops:db.prepare('SELECT * FROM wops WHERE k=? ORDER BY t DESC LIMIT ?'),
    gained:db.prepare("SELECT COALESCE(SUM(amt),0) AS n FROM wops WHERE k=? AND kind='local' AND amt>0 AND t>?"),
    prune:db.prepare("DELETE FROM wops WHERE t<? AND kind='local'"),
    sum:db.prepare('SELECT COUNT(*) AS n,COALESCE(SUM(bal),0) AS total FROM wallet')};
  let depth=0;
  return {kind:'sqlite',get:k=>q.get.get(k)||null,put:w=>q.put.run(w.k,w.bal,w.day,w.dayIn,w.created,w.updated),op:(k,id)=>q.op.get(k,id)||null,
    add:o=>q.add.run(o.k,o.id,o.amt,o.req,o.kind,o.why,o.peer||null,o.bal,o.t),ops:(k,n)=>q.ops.all(k,n),gained:(k,since)=>q.gained.get(k,since).n,
    prune:before=>Number(q.prune.run(before).changes),summary:()=>q.sum.get(),
    // одна операция — одна транзакция: сбой посреди перевода не оставляет деньги только у одного из двоих
    tx:fn=>{if(depth)return fn();depth++;db.exec('BEGIN IMMEDIATE');try{const r=fn();db.exec('COMMIT');return r;}catch(e){try{db.exec('ROLLBACK');}catch(_){}throw e;}finally{depth--;}}};}
function jsonBackend(file,fs){let S={w:{},ops:{}};if(file&&fs){try{S=JSON.parse(fs.readFileSync(file,'utf8'))||S;}catch(e){}}S.w=S.w||{};S.ops=S.ops||{};let dirty=false;
  const flush=()=>{if(!dirty||!file||!fs)return;dirty=false;try{fs.writeFileSync(file+'.tmp',JSON.stringify(S));fs.renameSync(file+'.tmp',file);}catch(e){}};
  if(file&&fs)setInterval(flush,3000).unref();
  const list=k=>S.ops[k]||(S.ops[k]=[]);
  return {kind:'json',get:k=>S.w[k]?Object.assign({},S.w[k]):null,put:w=>{const c=Object.assign({},w);delete c.migrated;S.w[w.k]=c;dirty=true;},
    op:(k,id)=>list(k).find(o=>o.id===id)||null,
    add:o=>{const l=list(o.k);l.push(Object.assign({},o));if(l.length>600)l.splice(0,l.length-600);dirty=true;},
    ops:(k,n)=>list(k).slice(-n).reverse(),gained:(k,since)=>list(k).reduce((s,o)=>s+(o.kind==='local'&&o.amt>0&&o.t>since?o.amt:0),0),
    prune:before=>{let n=0;for(const k in S.ops){const l=S.ops[k],m=l.filter(o=>o.t>=before||o.kind!=='local');n+=l.length-m.length;S.ops[k]=m;}if(n)dirty=true;return n;},
    summary:()=>{const v=Object.values(S.w);return {n:v.length,total:v.reduce((s,w)=>s+w.bal,0)};},tx:fn=>fn(),flush};}

// ---------- сам кошелёк ----------
// opt.seedOf(k) — последнее сохранение аккаунта (state) для переноса; opt.now() — секунды (тесты подменяют); opt.limits — свои потолки
function Wallet(be,opt){opt=opt||{};const L=Object.assign({},LIM,opt.limits||{});const now=opt.now||(()=>Date.now()/1000);const seedOf=opt.seedOf||(()=>null);
  // отпечаток аккаунта для устройства: операции, накопленные под одним аккаунтом, не уйдут в другой
  const whoOf=k=>crypto.createHash('sha256').update('wallet:'+k).digest('hex').slice(0,16);
  const opId=p=>p+Math.round(now()*1000).toString(36)+crypto.randomBytes(4).toString('hex');
  function newDay(w,t){const d=mskDay(t);if(w.day!==d){w.day=d;w.dayIn=0;}}
  function journal(w,o,t){be.add({k:w.k,id:o.id,amt:o.amt,req:o.req??o.amt,kind:o.kind,why:clean(o.why||'',80),peer:o.peer||null,bal:w.bal,t});}
  function ensure(k){let w=be.get(k);if(w)return w;const t=now();const s=seedOf(k);let req=L.start,why='стартовые деньги';
    if(s&&typeof s==='object'&&Number.isFinite(int(s.money))){const m=int(s.money),d=int(s.econ&&s.econ.dep);req=Math.max(0,m)+(d>0?d:0);why='перенос денег из сохранения';}
    const amt=Math.max(0,Math.min(req,L.migrate));w={k,bal:amt,day:mskDay(t),dayIn:0,created:t,updated:t};be.put(w);journal(w,{id:'init',amt,req,kind:'init',why},t);
    w.migrated={amt,req};return w;}
  // пачка изменений с устройства: [{id, amt}], amt — на сколько изменились деньги (карта + вклад) с прошлой отправки
  function apply(k,ops){return be.tx(()=>{const t=now();const w=ensure(k);const init=w.migrated||null;newDay(w,t);const res=[];
    for(const o of (Array.isArray(ops)?ops:[]).slice(0,L.batch)){
      const cid=o&&typeof o==='object'?String(o.id||''):'';if(!ID_RE.test(cid)){res.push({id:cid.slice(0,48),err:'bad'});continue;}
      const id='c:'+cid,old=be.op(k,id);if(old){res.push({id:cid,amt:old.amt,req:old.req,dup:1});continue;}
      const req=int(o.amt);if(!Number.isFinite(req)||Math.abs(req)>1e9){res.push({id:cid,err:'bad'});continue;}
      if(!req){res.push({id:cid,amt:0,req:0});continue;}
      let amt;if(req>0){amt=Math.min(req,Math.max(0,Math.min(L.op,L.winMax-be.gained(k,t-L.win),L.dayMax-w.dayIn)));w.dayIn+=amt;}
      else amt=Math.max(req,-w.bal);
      w.bal+=amt;w.updated=t;journal(w,{id,amt,req,kind:'local'},t);res.push(amt===req?{id:cid,amt,req}:{id:cid,amt,req,cut:req-amt});}
    be.put(w);return {bal:w.bal,who:whoOf(k),res,init};});}
  // перевод между игроками — только по решению сервера (обе стороны согласились, поездка закончилась и т. п.)
  function transfer(from,to,amt,id,why,kind){amt=int(amt);if(!(amt>0)||amt>L.op)return {err:'amount'};if(!from||!to||from===to)return {err:'self'};if(!ID_RE.test(String(id||'')))return {err:'id'};
    return be.tx(()=>{const t=now(),sid='x:'+id;const old=be.op(from,sid);if(old)return {ok:1,dup:1,bal:be.get(from).bal};
      const a=ensure(from),b=ensure(to);if(a.bal<amt)return {err:'funds',bal:a.bal};
      a.bal-=amt;b.bal+=amt;a.updated=b.updated=t;
      journal(a,{id:sid,amt:-amt,kind:kind||'xfer',why,peer:to},t);journal(b,{id:sid,amt,kind:kind||'xfer',why,peer:from},t);be.put(a);be.put(b);
      return {ok:1,bal:a.bal,to:b.bal};});}
  // начисление или списание сервером: модератор, будущие покупки. Без потолков, в минус не уводит
  function grant(k,amt,id,why,kind){amt=int(amt);if(!Number.isFinite(amt)||!amt||Math.abs(amt)>1e7)return {err:'amount'};id=id||opId('');if(!ID_RE.test(String(id)))return {err:'id'};
    return be.tx(()=>{const t=now(),sid='g:'+id;const old=be.op(k,sid);if(old)return {ok:1,dup:1,amt:old.amt,bal:be.get(k).bal};
      const w=ensure(k);const a=amt<0?Math.max(amt,-w.bal):amt;w.bal+=a;w.updated=t;journal(w,{id:sid,amt:a,req:amt,kind:kind||'grant',why},t);be.put(w);return {ok:1,amt:a,bal:w.bal};});}
  // «Начать заново»: стартовые деньги; кошелька ещё не было — его заведёт первое обращение (сохранения уже нет — тоже стартовые)
  function reset(k,why){return be.tx(()=>{const t=now();const w=be.get(k);if(!w)return {ok:1,bal:null};const amt=L.start-w.bal;w.bal=L.start;w.dayIn=0;w.updated=t;
    journal(w,{id:opId('r:'),amt,kind:'reset',why:why||'начать заново'},t);be.put(w);return {ok:1,bal:w.bal};});}
  function info(k,n){const w=be.get(k);return {ok:1,bal:w?w.bal:null,day:w?w.day:null,dayIn:w?w.dayIn:0,
    ops:w?be.ops(k,Math.max(1,Math.min(200,n||30))).map(o=>({id:o.id,amt:o.amt,req:o.req,kind:o.kind,why:o.why,peer:o.peer,bal:o.bal,t:o.t})):[]};}
  // старые операции с устройств больше не нужны для повторов; начальные, переводы и начисления храним
  function prune(){return be.prune(now()-L.keepDays*86400);}
  return {apply,transfer,grant,reset,info,prune,whoOf,ensure:k=>be.tx(()=>{const w=ensure(k);return {bal:w.bal,init:w.migrated||null};}),summary:()=>be.summary(),LIM:L};}

module.exports={Wallet,sqliteBackend,jsonBackend,LIM,mskDay};
