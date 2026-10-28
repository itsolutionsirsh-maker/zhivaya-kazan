// Серверный кошелёк (server/node/wallet.js): перенос старых денег с потолком, повтор операции без второго начисления,
// потолки заработка за 10 минут и за сутки, траты не в минус, переводы между игроками, начисления модератора, сброс.
// Оба хранилища: SQLite (как на сервере) и JSON (запасное). node --test tools/tests/wallet.test.js
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {Wallet,sqliteBackend,jsonBackend,LIM}=require(path.join(__dirname,'../../server/node/wallet.js'));
let sqlite=null;try{process.removeAllListeners('warning');sqlite=require('node:sqlite');}catch(e){}

const backends={json:()=>jsonBackend(null,null)};
if(sqlite)backends.sqlite=()=>sqliteBackend(new sqlite.DatabaseSync(':memory:'));

for(const [name,mk] of Object.entries(backends)){
  const setup=(states={})=>{const clock={t:Date.UTC(2026,9,28,9,0)/1000};const w=Wallet(mk(),{now:()=>clock.t,seedOf:k=>states[k]||null});return {w,clock};};

  test(`${name}: новый аккаунт без сохранения — стартовые; со старым сохранением — карта + вклад, не больше потолка`,()=>{
    const {w}=setup({rich:{money:900000,econ:{dep:50000}},mid:{money:12000,econ:{dep:3000}},bad:{money:'много'}});
    assert.equal(w.apply('fresh',[]).bal,LIM.start);
    const m=w.apply('mid',[]);assert.equal(m.bal,15000);assert.deepEqual(m.init,{amt:15000,req:15000});
    const r=w.apply('rich',[]);assert.equal(r.bal,LIM.migrate);assert.deepEqual(r.init,{amt:LIM.migrate,req:950000});
    assert.equal(w.apply('rich',[]).init,null,'перенос — один раз');
    assert.equal(w.apply('bad',[]).bal,LIM.start,'испорченное сохранение — стартовые');
    assert.equal(w.info('rich').ops[0].kind,'init');});

  test(`${name}: операция с тем же номером не начисляет второй раз`,()=>{
    const {w}=setup();const a=w.apply('p',[{id:'op-aaaa01',amt:2400},{id:'op-aaaa02',amt:-500}]);
    assert.equal(a.bal,LIM.start+1900);assert.deepEqual(a.res.map(x=>x.amt),[2400,-500]);
    const b=w.apply('p',[{id:'op-aaaa01',amt:2400},{id:'op-aaaa02',amt:-500},{id:'op-aaaa03',amt:100}]);
    assert.equal(b.bal,LIM.start+2000);assert.equal(b.res[0].dup,1);assert.equal(b.res[1].dup,1);assert.equal(b.res[2].amt,100);
    // тот же номер у другого аккаунта — своя операция
    assert.equal(w.apply('q',[{id:'op-aaaa01',amt:2400}]).bal,LIM.start+2400);});

  test(`${name}: плохие операции не проходят, остальные — да`,()=>{
    const {w}=setup();const r=w.apply('p',[{id:'x',amt:5},{id:'op-good01',amt:'12'},{id:'op-bad-02',amt:'abc'},{id:'op-bad-03',amt:1e12},null,{id:'op-zero1',amt:0},{id:'op-bool1',amt:true}]);
    assert.deepEqual(r.res.map(x=>x.err||x.amt),['bad',12,'bad','bad','bad',0,'bad']);assert.equal(r.bal,LIM.start+12);
    assert.equal(w.apply('p',Array.from({length:50},(_,i)=>({id:'op-many'+String(i).padStart(3,'0'),amt:1}))).res.length,LIM.batch,'за раз — не больше пачки');});

  test(`${name}: заработок упирается в потолки, траты — в ноль`,()=>{
    const {w,clock}=setup();
    let r=w.apply('p',[{id:'op-big-001',amt:1000000}]);assert.equal(r.res[0].amt,LIM.winMax);assert.equal(r.res[0].cut,1000000-LIM.winMax);
    r=w.apply('p',[{id:'op-big-002',amt:5000}]);assert.equal(r.res[0].amt,0,'в те же 10 минут — уже ничего');
    clock.t+=LIM.win+1;r=w.apply('p',[{id:'op-big-003',amt:5000}]);assert.equal(r.res[0].amt,5000,'через 10 минут — снова можно');
    for(let i=0;i<10;i++){clock.t+=LIM.win+1;w.apply('p',[{id:'op-day-'+String(i).padStart(3,'0'),amt:LIM.winMax}]);}
    const day=w.info('p');assert.equal(day.dayIn,LIM.dayMax,'за сутки по Москве — не больше дневного потолка');
    clock.t+=86400;r=w.apply('p',[{id:'op-next-01',amt:1000}]);assert.equal(r.res[0].amt,1000,'новые сутки — новый потолок');
    const bal=r.bal;r=w.apply('p',[{id:'op-spend1',amt:-(bal+999)}]);assert.equal(r.bal,0);assert.equal(r.res[0].amt,-bal);});

  test(`${name}: перевод между игроками — один раз, без ухода в минус`,()=>{
    const {w}=setup({a:{money:5000},b:{money:100}});
    assert.equal(w.transfer('a','b',6000,'trip-0001','поездка').err,'funds');
    let r=w.transfer('a','b',1200,'trip-0002','поездка');assert.deepEqual([r.ok,r.bal,r.to],[1,3800,1300]);
    r=w.transfer('a','b',1200,'trip-0002','поездка');assert.equal(r.dup,1);assert.equal(w.info('a').bal,3800);assert.equal(w.info('b').bal,1300);
    assert.equal(w.transfer('a','a',10,'trip-0003').err,'self');assert.equal(w.transfer('a','b',0,'trip-0004').err,'amount');assert.equal(w.transfer('a','b',10,'x').err,'id');
    const ib=w.info('b').ops[0];assert.equal(ib.peer,'a');assert.equal(ib.amt,1200);
    // переводы не съедают потолок заработка в одиночной игре
    assert.equal(w.apply('b',[{id:'op-after1',amt:LIM.winMax}]).res[0].amt,LIM.winMax);});

  test(`${name}: модератор начисляет и списывает по номеру; «начать заново» — стартовые`,()=>{
    const {w}=setup({p:{money:10000}});
    assert.equal(w.grant('p',500,'mod-00001','компенсация').bal,10500);assert.equal(w.grant('p',500,'mod-00001','компенсация').dup,1);
    assert.equal(w.grant('p',-50000,'mod-00002','обман').bal,0);assert.equal(w.grant('p',0,'mod-00003').err,'amount');
    w.grant('p',7000,'mod-00004','ещё');assert.equal(w.reset('p').bal,LIM.start);assert.equal(w.info('p').ops[0].kind,'reset');
    assert.equal(w.reset('nobody').bal,null,'кошелька не было — не заводим');});

  test(`${name}: старые операции устройств чистятся, начальные и переводы остаются`,()=>{
    const {w,clock}=setup({a:{money:5000}});w.apply('a',[{id:'op-old-001',amt:10}]);w.transfer('a','b',100,'tr-old-01');
    clock.t+=(LIM.keepDays+1)*86400;assert.equal(w.prune(),1);const kinds=w.info('a').ops.map(o=>o.kind).sort();assert.deepEqual(kinds,['init','xfer']);});
}
