// Серверный кошелёк (server/node/wallet.js): заведение при первом сохранении (перенос из прежней серверной копии с потолком,
// разница пришедшего сохранения — под потолки), операции только с принятым сохранением и в одной транзакции с ним,
// повтор без второго начисления, чужой аккаунт и прежняя игра отсекаются, потолки заработка, траты не в минус,
// переводы между игроками, начисления модератора, сброс, чистка старых операций.
// Оба хранилища: SQLite (как на сервере) и JSON (запасное). node --test tools/tests/wallet.test.js
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {Wallet,sqliteBackend,jsonBackend,LIM}=require(path.join(__dirname,'../../server/node/wallet.js'));
let sqlite=null;try{process.removeAllListeners('warning');sqlite=require('node:sqlite');}catch(e){}

const backends={json:()=>({be:jsonBackend(null,null)})};
if(sqlite)backends.sqlite=()=>{const db=new sqlite.DatabaseSync(':memory:');return {be:sqliteBackend(db),db};};

for(const [name,mk] of Object.entries(backends)){
  const setup=()=>{const clock={t:Date.UTC(2026,9,28,9,0)/1000};const {be,db}=mk();const w=Wallet(be,{now:()=>clock.t});
    // сохранение с операциями устройства; who берём из первого ответа, как клиент
    const save=(k,ops,o={})=>w.commit(k,Object.assign({wal:{who:o.who===undefined?w.who(k):o.who,ops}},o));
    return {w,clock,db,save};};

  test(`${name}: кошелёк заводится при первом сохранении — из прежней серверной копии, с потолком; разница — под потолки`,()=>{
    const {w}=setup();
    // аккаунт был до кошелька: прежняя копия 12 000 + вклад 3 000, пришло на 500 больше
    let r=w.commit('old',{prior:{money:12000,econ:{dep:3000}},incoming:{money:12500,econ:{dep:3000}},wal:{ops:[]}});
    assert.equal(r.bal,15500);assert.deepEqual([r.init.amt,r.init.req,r.init.first],[15000,15000,500]);assert.equal(r.other,0);
    assert.equal(w.commit('old',{prior:{money:1},incoming:{money:1},wal:{who:w.who('old'),ops:[]}}).init,null,'заводится один раз');
    // очень богатое старое сохранение — потолок переноса
    r=w.commit('rich',{prior:{money:900000,econ:{dep:50000}},incoming:{money:950000}});assert.equal(r.bal,LIM.migrate);assert.deepEqual([r.init.amt,r.init.req],[LIM.migrate,950000]);
    // новый аккаунт: прежней копии нет — стартовые; деньги гостя сверх стартовых — заработком, под потолок
    r=w.commit('guest',{prior:null,incoming:{money:12000}});assert.equal(r.bal,12000);assert.equal(r.init.first,9000);
    r=w.commit('cheat',{prior:null,incoming:{money:9999999}});assert.equal(r.bal,LIM.start+LIM.winMax,'поддельное сохранение нового аккаунта — только под потолок');
    r=w.commit('poor',{prior:null,incoming:{money:500}});assert.equal(r.bal,500);
    assert.equal(w.commit('bad',{prior:{money:'много'},incoming:null}).bal,LIM.start,'испорченное сохранение — стартовые');
    assert.deepEqual(w.info('old').ops.map(o=>o.kind).sort(),['init','local']);});

  test(`${name}: старая версия игры (без поля wallet) — деньги разницей с прошлым принятым сохранением, под потолки`,()=>{
    const {w,clock}=setup();w.commit('p',{prior:{money:10000},incoming:{money:10000},wal:{ops:[]}});
    let r=w.commit('p',{prior:{money:10000},incoming:{money:30000}});assert.equal(r.bal,30000);assert.equal(r.res[0].id,'old');
    r=w.commit('p',{prior:{money:30000},incoming:{money:29000}});assert.equal(r.bal,29000);
    r=w.commit('p',{prior:{money:29000},incoming:{money:9e9}});assert.equal(r.bal,29000+LIM.winMax-20000,'под потолок за 10 минут');assert.ok(r.res[0].cut>0);
    r=w.commit('p',{prior:{money:1},incoming:null});assert.deepEqual(r.res,[],'без state — ничего');
    clock.t+=1;r=w.commit('p',{prior:{money:500},incoming:{money:500},wal:{who:w.who('p'),ops:[]}});assert.deepEqual(r.res,[],'новая версия с пустыми операциями — разницу не считаем');});

  test(`${name}: устройство без отпечатка (загрузило игру с сервера) — изменения при запуске засчитываются разницей`,()=>{
    const {w}=setup();w.commit('p',{prior:{money:10000},incoming:{money:10000},wal:{ops:[]}});
    // утренний платёж по кредиту при запуске: −1100 до первого ответа сервера
    let r=w.commit('p',{prior:{money:10000},incoming:{money:8900},wal:{ops:[]}});assert.equal(r.bal,8900);assert.equal(r.res[0].id,'old');assert.equal(r.other,0);
    r=w.commit('p',{prior:{money:8900},incoming:{money:9e9},wal:{ops:[]}});assert.equal(r.bal,8900+LIM.winMax,'под потолки');
    r=w.commit('p',{prior:{money:1},incoming:{money:5},wal:{who:'чужой-отпечаток',ops:[]}});assert.equal(r.other,1);assert.deepEqual(r.res,[],'чужой отпечаток — разницу не считаем');});

  test(`${name}: новых операций — не больше perHour в час, остальные ждут`,()=>{
    const {w,clock,save}=setup();w.commit('p',{});const mk=(p,n)=>Array.from({length:n},(_,i)=>({id:'op-'+p+String(i).padStart(4,'0'),amt:1}));
    for(let i=0;i<3;i++)assert.equal(save('p',mk('a'+i+'-',500)).res.length,500);
    let r=save('p',mk('b-',500));assert.equal(r.res.length,0,'час исчерпан — не проводим и не отвечаем');
    assert.equal(save('p',mk('a0-',10)).res.filter(x=>x.dup).length,10,'повторы — отвечаем всегда');
    clock.t+=3601;r=save('p',mk('b-',500));assert.equal(r.res.length,500,'через час — проводим');});

  test(`${name}: операция с тем же номером не начисляет второй раз`,()=>{
    const {w,save}=setup();w.commit('p',{});
    let a=save('p',[{id:'op-aaaa01',amt:2400},{id:'op-aaaa02',amt:-500}]);assert.equal(a.bal,LIM.start+1900);assert.deepEqual(a.res.map(x=>x.amt),[2400,-500]);
    a=save('p',[{id:'op-aaaa01',amt:2400},{id:'op-aaaa02',amt:-500},{id:'op-aaaa03',amt:100}]);
    assert.equal(a.bal,LIM.start+2000);assert.equal(a.res[0].dup,1);assert.equal(a.res[1].dup,1);assert.equal(a.res[2].amt,100);
    w.commit('q',{});assert.equal(save('q',[{id:'op-aaaa01',amt:2400}]).bal,LIM.start+2400,'тот же номер у другого аккаунта — своя операция');});

  test(`${name}: чужой аккаунт и прежняя игра (после «Начать заново») — операции не проводятся`,()=>{
    const {w,save}=setup();w.commit('a',{});w.commit('b',{});
    let r=save('b',[{id:'op-from-a1',amt:5000}],{who:w.who('a')});assert.equal(r.other,1);assert.equal(r.bal,LIM.start);assert.deepEqual(r.res,[]);
    r=save('b',[{id:'op-nowho1',amt:5000}],{who:null});assert.equal(r.other,1,'без отпечатка — тоже нет');
    const oldWho=w.who('a');save('a',[{id:'op-before',amt:7000}]);assert.equal(w.reset('a').bal,LIM.start);
    assert.notEqual(w.who('a'),oldWho);r=save('a',[{id:'op-stale1',amt:20000}],{who:oldWho});assert.equal(r.other,1);assert.equal(r.bal,LIM.start);
    r=w.commit('a',{wal:{ops:[]}});assert.equal(r.other,0,'новое устройство без операций — просто баланс');});

  if(name==='sqlite')test(`${name}: запись сохранения упала — деньги тоже не проведены (одна транзакция)`,()=>{
    const {w,db}=setup();db.exec('CREATE TABLE st(k TEXT PRIMARY KEY,v TEXT)');const put=db.prepare('INSERT INTO st(k,v) VALUES(?,?)');
    w.commit('p',{},()=>put.run('p','1'));
    assert.throws(()=>w.commit('p',{wal:{who:w.who('p'),ops:[{id:'op-fail01',amt:900}]}},()=>put.run('p','2')));
    assert.equal(w.info('p').bal,LIM.start);assert.equal(w.info('p').ops.length,1);
    assert.equal(w.commit('p',{wal:{who:w.who('p'),ops:[{id:'op-fail01',amt:900}]}}).res[0].amt,900,'после отката тот же номер проводится');});

  test(`${name}: плохие операции не проходят, остальные — да`,()=>{
    const {w,save}=setup();w.commit('p',{});
    const r=save('p',[{id:'x',amt:5},{id:'op-good01',amt:'12'},{id:'op-bad-02',amt:'abc'},{id:'op-bad-03',amt:1e12},null,{id:'op-zero1',amt:0},{id:'op-bool1',amt:true},{id:'op-null1',amt:null}]);
    assert.deepEqual(r.res.map(x=>x.err||x.amt),['bad',12,'bad','bad','bad',0,'bad','bad']);assert.equal(r.bal,LIM.start+12);
    assert.equal(save('p',Array.from({length:600},(_,i)=>({id:'op-many'+String(i).padStart(3,'0'),amt:1}))).res.length,LIM.batch,'за раз — не больше пачки (клиент копит не больше 500)');});

  test(`${name}: заработок упирается в потолки, траты — в ноль`,()=>{
    const {w,clock,save}=setup();w.commit('p',{});
    let r=save('p',[{id:'op-big-001',amt:1000000}]);assert.equal(r.res[0].amt,LIM.winMax);assert.equal(r.res[0].cut,1000000-LIM.winMax);
    r=save('p',[{id:'op-big-002',amt:5000}]);assert.equal(r.res[0].amt,0,'в те же 10 минут — уже ничего');
    clock.t+=LIM.win+1;r=save('p',[{id:'op-big-003',amt:5000}]);assert.equal(r.res[0].amt,5000,'через 10 минут — снова можно');
    for(let i=0;i<10;i++){clock.t+=LIM.win+1;save('p',[{id:'op-day-'+String(i).padStart(3,'0'),amt:LIM.winMax}]);}
    assert.equal(w.info('p').dayIn,LIM.dayMax,'за сутки по Москве — не больше дневного потолка');
    clock.t+=86400;r=save('p',[{id:'op-next-01',amt:1000}]);assert.equal(r.res[0].amt,1000,'новые сутки — новый потолок');
    const bal=r.bal;r=save('p',[{id:'op-spend1',amt:-(bal+999)}]);assert.equal(r.bal,0);assert.equal(r.res[0].amt,-bal);});

  test(`${name}: перевод между игроками — один раз, без ухода в минус; встречный с тем же номером — отдельный`,()=>{
    const {w,save}=setup();w.commit('a',{prior:{money:5000}});w.commit('b',{prior:{money:100}});
    assert.equal(w.transfer('a','b',6000,'trip-0001','поездка').err,'funds');
    let r=w.transfer('a','b',1200,'trip-0002','поездка');assert.deepEqual([r.ok,r.bal,r.to],[1,3800,1300]);
    r=w.transfer('a','b',1200,'trip-0002','поездка');assert.equal(r.dup,1);assert.equal(w.info('a').bal,3800);assert.equal(w.info('b').bal,1300);
    r=w.transfer('b','a',200,'trip-0002','возврат');assert.equal(r.ok,1);assert.equal(r.dup,undefined);assert.equal(w.info('a').bal,4000);
    w.commit('c',{prior:{money:900}});assert.equal(w.transfer('c','b',300,'trip-0002','другой заказ').ok,1,'тот же номер у другого отправителя — не ошибка');assert.equal(w.info('b').bal,1400);
    assert.equal(w.transfer('a','a',10,'trip-0003').err,'self');assert.equal(w.transfer('a','b',0,'trip-0004').err,'amount');assert.equal(w.transfer('a','b',10,'x').err,'id');
    assert.equal(w.transfer('a','nobody',10,'trip-0005').err,'no_wallet');
    // переводы не съедают потолок заработка в одиночной игре
    assert.equal(save('b',[{id:'op-after1',amt:LIM.winMax}]).res[0].amt,LIM.winMax);});

  test(`${name}: модератор начисляет и списывает по номеру; «начать заново» — стартовые`,()=>{
    const {w}=setup();w.commit('p',{prior:{money:10000}});
    assert.equal(w.grant('p',500,'mod-00001','компенсация').bal,10500);assert.equal(w.grant('p',500,'mod-00001','компенсация').dup,1);
    assert.equal(w.grant('p',-50000,'mod-00002','обман').bal,0);assert.equal(w.grant('p',0,'mod-00003').err,'amount');assert.equal(w.grant('nobody',5,'mod-00004').err,'no_wallet');
    w.grant('p',7000,'mod-00005','ещё');let wrote=0;assert.equal(w.reset('p',()=>{wrote++;}).bal,LIM.start);assert.equal(wrote,1);assert.equal(w.info('p').ops[0].kind,'reset');
    assert.equal(w.reset('nobody',()=>{wrote++;}).bal,null,'кошелька не было — не заводим, сохранение всё равно сбрасываем');assert.equal(wrote,2);});

  test(`${name}: старые операции устройств чистятся, начальные и переводы остаются; повтор помнится весь срок`,()=>{
    const {w,clock,save}=setup();w.commit('a',{prior:{money:5000}});w.commit('b',{});
    for(let i=0;i<700;i++)save('a',[{id:'op-n'+String(i).padStart(5,'0'),amt:1}]);
    assert.equal(save('a',[{id:'op-n00000',amt:1}]).res[0].dup,1,'номер из начала длинного журнала помнится');
    w.transfer('a','b',100,'tr-old-01');clock.t+=(LIM.keepDays+1)*86400;assert.equal(w.prune(),700);
    assert.deepEqual(w.info('a').ops.map(o=>o.kind).sort(),['init','xfer']);});
}
