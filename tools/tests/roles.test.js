// node --test tools/tests/roles.test.js
// Роль «бариста» между игроками (server/node/roles.js): кто может встать за стойку, заказ, цена, оплата через кошелёк,
// лимиты, отмены, «Бариста недели». Кошелёк — заглушка с той же формой ответа, что у wallet.transfer.
const test=require('node:test');
const assert=require('node:assert/strict');
const {Roles,mskWeek}=require('../../server/node/roles.js');
const DAY=86400e3,CAFE='v1:cafe:100:200:0badc0de',CAFE2='v1:cafe:900:200:0badc0df';
function fakeWallet(bal){const ops=new Set(),calls=[];return {bal,calls,transfer(from,to,amt,id,why,kind){calls.push({from,to,amt,id,why,kind});
  if(ops.has(id))return {ok:1,dup:1,bal:bal[from]};if((bal[from]||0)<amt)return {err:'funds',bal:bal[from]};ops.add(id);bal[from]-=amt;bal[to]=(bal[to]||0)+amt;return {ok:1,bal:bal[from],to:bal[to]};}};}
function setup(o={}){let t=Date.UTC(2026,9,29,12,0);const files={};
  const fsFake={readFileSync:f=>{if(!(f in files))throw new Error('ENOENT');return files[f];},writeFileSync:(f,s)=>{files[f]=s;},renameSync:(a,b)=>{files[b]=files[a];delete files[a];}};
  const w=fakeWallet(Object.assign({bk:1000,gk:1000,g2k:50},o.bal||{}));
  const mk=()=>Roles({now:()=>t,wallet:w,fs:fsFake,file:'roles.json'});let R=mk();
  const P=(id,k,room,age=2*DAY,name)=>({id,name:name||id,room,acc:k?{k,created:t-age}:null});
  return {get R(){return R;},w,tick:ms=>{t+=ms;},now:()=>t,P,reload:()=>{R=mk();},files};}
const last=(ev,to,k)=>ev.filter(e=>e.to===to&&(!k||e.m.k===k)).map(e=>e.m).pop();

test('за стойку: только с аккаунтом старше суток и в кафе',()=>{
  const f=setup();
  assert.equal(last(f.R.duty(f.P('a',null,CAFE),true),'a').err,'account');
  assert.equal(last(f.R.duty(f.P('a','ak',CAFE,DAY-60e3),true),'a').err,'young');
  assert.equal(last(f.R.duty(f.P('a','ak','v1:bar:1:2:0badc0de'),true),'a').err,'place');
  assert.equal(last(f.R.duty(f.P('a','ak',null),true),'a').err,'place');
  const ok=last(f.R.duty(f.P('a','ak',CAFE),true),'a');assert.equal(ok.on,true);assert.equal(ok.max,40);assert.equal(ok.min,60);assert.equal(ok.maxPrice,220);
  assert.ok(f.R.onShift(f.P('a','ak',CAFE)));assert.ok(!f.R.onShift(f.P('a','ak',CAFE2)),'в другом кафе — не за стойкой');
});

test('заказ → цена → оплата: деньги переводит кошелёк один раз, счётчики и «Бариста недели»',()=>{
  const f=setup();const b=f.P('b','bk',CAFE,2*DAY,'Алсу'),g=f.P('g','gk',CAFE,2*DAY,'Булат');f.R.duty(b,true);
  let ev=f.R.order(g,b,3);const o=last(ev,'b','order');assert.equal(o.item,'Капучино');assert.equal(o.from.name,'Булат');assert.equal(last(ev,'g','wait').to.name,'Алсу');
  ev=f.R.price(g,o.id,120);assert.equal(ev.length,0,'цену называет только бариста');
  ev=f.R.price(b,o.id,50);assert.equal(last(ev,'b','err').e,'price');
  ev=f.R.price(b,o.id,221);assert.equal(last(ev,'b','err').e,'price');
  ev=f.R.price(b,o.id,120);assert.equal(last(ev,'g','price').price,120);assert.equal(last(ev,'g','price').name,'Алсу');
  ev=f.R.pay(g,b,o.id,true);const dg=last(ev,'g','done'),db=last(ev,'b','done');
  assert.equal(dg.price,120);assert.equal(dg.bal,880);assert.equal(db.bal,1120);assert.equal(db.cups,1);assert.equal(db.week,1);assert.equal(db.name,'Булат');
  assert.deepEqual(f.w.calls.map(c=>[c.from,c.to,c.amt,c.kind]),[['gk','bk',120,'coffee']]);assert.match(f.w.calls[0].why,/Капучино у баристы Алсу/);
  assert.equal(f.R.pay(g,b,o.id,true).length,0,'второй раз тот же заказ не оплатить');assert.equal(f.w.calls.length,1);
  assert.deepEqual(f.R.top(),[{name:'Алсу',n:1}]);
  f.reload();assert.deepEqual(f.R.top(),[{name:'Алсу',n:1}],'счётчики — в файле, после перезапуска');
});

test('нельзя: без аккаунта, себе, из другого кафе, не баристе, второй заказ подряд, неизвестный напиток',()=>{
  const f=setup();const b=f.P('b','bk',CAFE),g=f.P('g','gk',CAFE);f.R.duty(b,true);
  assert.equal(last(f.R.order(f.P('x',null,CAFE),b,0),'x','err').e,'account');
  assert.equal(last(f.R.order(f.P('b2','bk',CAFE),b,0),'b2','err').e,'self','тот же аккаунт с другого устройства');
  assert.equal(last(f.R.order(f.P('g','gk',CAFE2),b,0),'g','err').e,'room');
  assert.equal(last(f.R.order(g,f.P('n','nk',CAFE),0),'g','err').e,'not-barista');
  assert.equal(last(f.R.order(g,b,9),'g','err').e,'item');
  f.R.order(g,b,0);assert.equal(last(f.R.order(g,b,1),'g','err').e,'busy');
});

test('отмены: бариста отказал, гость отказался, минута без ответа, кто-то вышел, не хватает денег',()=>{
  const f=setup();const b=f.P('b','bk',CAFE),g=f.P('g','gk',CAFE),g2=f.P('g2','g2k',CAFE);f.R.duty(b,true);
  let o=last(f.R.order(g,b,0),'b','order');let ev=f.R.price(b,o.id,0);assert.equal(last(ev,'g','cancel').why,'declined');
  o=last(f.R.order(g,b,0),'b','order');f.R.price(b,o.id,100);ev=f.R.pay(g,b,o.id,false);assert.equal(last(ev,'b','cancel').why,'refused');
  o=last(f.R.order(g,b,0),'b','order');f.tick(59e3);assert.equal(f.R.tick().length,0);f.tick(2e3);ev=f.R.tick();assert.equal(last(ev,'g','cancel').why,'timeout');assert.equal(last(ev,'b','cancel').why,'timeout');
  o=last(f.R.order(g,b,0),'b','order');f.R.price(b,o.id,100);ev=f.R.moved(f.P('g','gk',null));assert.equal(last(ev,'b','cancel').why,'left');
  o=last(f.R.order(g,b,0),'b','order');f.R.price(b,o.id,100);ev=f.R.pay(g,f.P('b','bk',CAFE2),o.id,true);assert.equal(last(ev,'g','cancel').why,'left','бариста ушёл в другое кафе');
  f.R.duty(b,true);o=last(f.R.order(g2,b,0),'b','order');f.R.price(b,o.id,100);ev=f.R.pay(g2,b,o.id,true);assert.equal(last(ev,'g2','cancel').why,'funds');
  o=last(f.R.order(g,b,0),'b','order');ev=f.R.gone('b');assert.equal(last(ev,'g','cancel').why,'left');assert.ok(!f.R.onShift(b),'отключился — не за стойкой');
  f.R.duty(b,true);ev=f.R.moved(f.P('b','bk',null));assert.equal(last(ev,'b','duty').on,false);assert.ok(!f.R.onShift(f.P('b','bk',CAFE)),'вышел из кафе — смена у стойки кончилась');
  assert.equal(f.w.calls.filter(c=>!c.dup).length,1,'перевод пытался только для заказа без денег — не прошёл');
});

test('лимиты: 4 чашки одному гостю в день, 40 у баристы; новый день — снова можно',()=>{
  const f=setup({bal:{gk:1e6}});const b=f.P('b','bk',CAFE),g=f.P('g','gk',CAFE);f.R.duty(b,true);
  const buy=gg=>{const o=last(f.R.order(gg,b,0),'b','order');if(!o)return null;f.R.price(b,o.id,60);return last(f.R.pay(gg,b,o.id,true),gg.id,'done');};
  for(let i=0;i<4;i++)assert.ok(buy(g));assert.equal(last(f.R.order(g,b,0),'g','err').e,'limit-guest');
  for(let i=0;i<36;i++){const gi=f.P('g'+i,'k'+i,CAFE);f.w.bal['k'+i]=100;assert.ok(buy(gi),'гость '+i);}
  const gx=f.P('gx','kx',CAFE);f.w.bal.kx=100;assert.equal(last(f.R.order(gx,b,0),'gx','err').e,'limit-day');
  assert.equal(f.R.top()[0].n,40);
  f.tick(DAY);assert.ok(buy(gx),'на следующий день по Москве — снова');assert.ok(buy(g));
});

test('неделя — с понедельника по Москве; «Бариста недели» обнуляется',()=>{
  assert.equal(mskWeek(Date.UTC(2026,9,29,12)),'2026-10-26');            // четверг → понедельник
  assert.equal(mskWeek(Date.UTC(2026,10,1,20,59)),'2026-10-26');         // воскресенье 23:59 по Москве
  assert.equal(mskWeek(Date.UTC(2026,10,1,21,0)),'2026-11-02');          // понедельник 00:00 по Москве
  const f=setup();const b=f.P('b','bk',CAFE,2*DAY,'Алсу'),g=f.P('g','gk',CAFE);f.R.duty(b,true);
  const o=last(f.R.order(g,b,0),'b','order');f.R.price(b,o.id,60);f.R.pay(g,b,o.id,true);assert.equal(f.R.top().length,1);
  f.tick(7*DAY);assert.deepEqual(f.R.top(),[]);
});
