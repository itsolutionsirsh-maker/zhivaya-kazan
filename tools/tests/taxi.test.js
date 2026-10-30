// node --test tools/tests/taxi.test.js
// Такси между игроками (server/node/taxi.js): кто может возить, предложение → куда → цена → посадка → высадка,
// деньги один раз за поездку, лимиты, отмены, «Таксист недели». Кошелёк — заглушка с той же формой, что у wallet.transfer.
const test=require('node:test');
const assert=require('node:assert/strict');
const {Taxi}=require('../../server/node/taxi.js');
const DAY=86400e3;
function fakeWallet(bal){const ops=new Set(),calls=[],gen={};return {bal,calls,gen,who:k=>k+':'+(gen[k]||0),transfer(from,to,amt,id,why,kind){calls.push({from,to,amt,id,why,kind});
  if(ops.has(id))return {ok:1,dup:1,bal:bal[from]};if((bal[from]||0)<amt)return {err:'funds',bal:bal[from]};ops.add(id);bal[from]-=amt;bal[to]=(bal[to]||0)+amt;return {ok:1,bal:bal[from],to:bal[to]};}};}
function setup(o={}){let t=Date.UTC(2026,9,30,9,0);const files={};
  const fsFake={readFileSync:f=>{if(!(f in files))throw new Error('ENOENT');return files[f];},writeFileSync:(f,s)=>{files[f]=s;},renameSync:(a,b)=>{files[b]=files[a];delete files[a];}};
  const w=fakeWallet(Object.assign({dk:1000,pk:1000,p2k:1000,poor:50},o.bal||{}));
  const mk=()=>Taxi({now:()=>t,wallet:w,fs:fsFake,file:'taxi.json'});let T=mk();
  // игрок: id, ключ аккаунта, где стоит, на чём едет
  const P=(id,k,x=0,y=0,v=null,o2={})=>Object.assign({id,name:id==='d'?'Ильдар':id==='p'?'Лиля':id,room:null,x,y,v,acc:k?{k,created:t-(o2.age||2*DAY)}:null},o2);
  return {get T(){return T;},w,tick:ms=>{t+=ms;},P,reload:()=>{T=mk();},files};}
const last=(ev,to,k)=>ev.filter(e=>e.to===to&&(!k||e.m.k===k)).map(e=>e.m).pop();
// поездка до посадки: водитель d у пассажира p, едут на 1 км на восток за 400 ₽
function ride(f,price=250){const d=f.P('d','dk',0,0,'own'),p=f.P('p','pk',8,0);
  const id=last(f.T.offer(d,p),'p','offer').id;f.T.dest(p,id,{x:1000,y:0,name:'Кремль'});f.T.price(d,id,price);
  const ev=f.T.board(p,d,id,true);assert.ok(last(ev,'p','go'),'сели');return {d,p,id};}

test('возить: только с аккаунтом старше суток, за рулём своей машины или каршеринга, на улице',()=>{
  const f=setup();const p=f.P('p','pk',5,0);
  assert.equal(last(f.T.offer(f.P('d',null,0,0,'own'),p),'d','err').e,'account');
  assert.equal(last(f.T.offer(f.P('d','dk',0,0,'own',{age:DAY-60e3}),p),'d','err').e,'young');
  assert.equal(last(f.T.offer(f.P('d','dk',0,0,null),p),'d','err').e,'car','пешком не возят');
  assert.equal(last(f.T.offer(f.P('d','dk',0,0,'scooter'),p),'d','err').e,'car','на самокате не возят');
  assert.equal(last(f.T.offer(f.P('d','dk',0,0,'taxi'),p),'d','err').e,'car','сам едет пассажиром');
  assert.equal(last(f.T.offer(f.P('d','dk',0,0,'own',{room:'v1:cafe:1:2:3'}),p),'d','err').e,'place');
  assert.equal(last(f.T.offer(f.P('d','dk',0,0,'own'),f.P('p',null,5,0)),'d','err').e,'p-account','пассажир платит с карты — нужен аккаунт');
  assert.equal(last(f.T.offer(f.P('d','dk',0,0,'own'),f.P('p','pk',5,0,'car')),'d','err').e,'p-car','пассажир сам за рулём');
  assert.equal(last(f.T.offer(f.P('d','dk',0,0,'own'),f.P('p','pk',31,0)),'d','err').e,'far');
  assert.equal(last(f.T.offer(f.P('d','dk',0,0,'own'),f.P('p2','dk',5,0)),'d','err').e,'self','со своего же аккаунта');
  assert.ok(last(f.T.offer(f.P('d','dk',0,0,'car'),p),'p','offer'),'каршеринг — можно');
});

test('предложение → куда → цена → посадка → высадка у цели: деньги один раз, счётчики, «Таксист недели»',()=>{
  const f=setup();const d=f.P('d','dk',0,0,'own'),p=f.P('p','pk',8,0);
  let ev=f.T.offer(d,p);const of=last(ev,'p','offer');assert.equal(of.from.name,'Ильдар');assert.equal(last(ev,'d','wait').to.name,'Лиля');
  ev=f.T.dest(p,of.id,{x:200,y:0,name:'Рядом'});assert.equal(last(ev,'p','err').e,'short','ближе 300 м не везут');
  ev=f.T.dest(d,of.id,{x:1000,y:0,name:'Кремль'});assert.equal(ev.length,0,'куда — говорит пассажир');
  ev=f.T.dest(p,of.id,{x:1000,y:0,name:'Кремль'});const ds=last(ev,'d','dest');assert.equal(ds.dest.name,'Кремль');assert.equal(ds.km,1);assert.equal(ds.min,80);assert.equal(ds.max,400);
  ev=f.T.price(p,of.id,200);assert.equal(ev.length,0,'цену называет водитель');
  assert.equal(last(f.T.price(d,of.id,79),'d','err').e,'price');assert.equal(last(f.T.price(d,of.id,401),'d','err').e,'price');
  ev=f.T.price(d,of.id,250);assert.equal(last(ev,'p','price').price,250);assert.equal(last(ev,'p','price').name,'Ильдар');
  ev=f.T.board(p,d,of.id,true);assert.equal(last(ev,'p','go').to.name,'Ильдар');assert.equal(last(ev,'d','go').dest.name,'Кремль');
  assert.deepEqual(f.T.riding('p'),{id:of.id,side:'passenger',with:'d'});
  // едут: через 2 минуты оба у Кремля
  f.tick(120e3);d.x=990;p.x=992;
  ev=f.T.finish('driver',d,p,of.id);const dp=last(ev,'p','done'),dd=last(ev,'d','done');
  assert.equal(dp.price,250);assert.equal(dp.bal,750);assert.equal(dd.bal,1250);assert.equal(dd.today,1);assert.equal(dd.max,20);assert.equal(dd.week,1);assert.equal(dd.name,'Лиля');
  assert.deepEqual(f.w.calls.map(c=>[c.from,c.to,c.amt,c.kind]),[['pk','dk',250,'taxi']]);assert.match(f.w.calls[0].why,/Ильдар довёз до «Кремль»/);
  assert.equal(f.T.finish('driver',d,p,of.id).length,0,'второй раз ту же поездку не оплатить');assert.equal(f.w.calls.length,1);
  assert.deepEqual(f.T.top(),[{name:'Ильдар',n:1}]);f.reload();assert.deepEqual(f.T.top(),[{name:'Ильдар',n:1}],'счётчики — в файле');
});

test('пассажир вышел сам у цели — оплата; раньше — без денег; водитель высадил не там — без денег',()=>{
  let f=setup();let r=ride(f);f.tick(120e3);r.d.x=900;r.p.x=905;
  let ev=f.T.finish('passenger',r.p,r.d,r.id);assert.ok(last(ev,'d','done'),'вышел у цели — заплатил');assert.equal(f.w.calls.length,1);
  f=setup();r=ride(f);f.tick(60e3);r.d.x=500;r.p.x=502;
  ev=f.T.finish('passenger',r.p,r.d,r.id);assert.equal(last(ev,'d','cancel').why,'out');assert.equal(last(ev,'p','cancel').by,'passenger');assert.equal(f.w.calls.length,0);
  f=setup();r=ride(f);f.tick(60e3);r.d.x=500;r.p.x=502;
  ev=f.T.finish('driver',r.d,r.p,r.id);assert.equal(last(ev,'p','cancel').why,'early');assert.equal(f.w.calls.length,0);
});

test('нечестная высадка: телепорт, пассажир далеко, проехали мало',()=>{
  let f=setup();let r=ride(f);f.tick(5e3);r.d.x=1000;r.p.x=1000;   // километр за 5 секунд
  assert.equal(last(f.T.finish('driver',r.d,r.p,r.id),'d','cancel').why,'fast');
  f=setup();r=ride(f);f.tick(120e3);r.d.x=1000;r.p.x=700;
  assert.equal(last(f.T.finish('driver',r.d,r.p,r.id),'d','cancel').why,'far','пассажир не в машине');
  f=setup();const d=f.P('d','dk',0,0,'own'),p=f.P('p','pk',8,0);const id=last(f.T.offer(d,p),'p','offer').id;
  f.T.dest(p,id,{x:400,y:0,name:'Близко'});f.T.price(d,id,80);f.T.board(p,d,id,true);f.tick(60e3);d.x=260;p.x=260;   // у цели (до 150 м), но проехали 260
  assert.equal(last(f.T.finish('driver',d,p,id),'d','cancel').why,'short');assert.equal(f.w.calls.length,0);
});

test('лимиты: одному пассажиру — раз в час, у водителя — 20 в день; деньги кончились — отмена',()=>{
  const f=setup();let r=ride(f);f.tick(120e3);r.d.x=1000;r.p.x=1000;f.T.finish('driver',r.d,r.p,r.id);
  const d=f.P('d','dk',0,0,'own'),p=f.P('p','pk',8,0);
  assert.equal(last(f.T.offer(d,p),'d','err').e,'limit-pair');
  f.tick(3600e3);assert.ok(last(f.T.offer(d,p),'p','offer'),'через час — снова можно');
  const g=setup({bal:{poor:50}});const d2=g.P('d','dk',0,0,'own'),pp=g.P('pp','poor',8,0);const id=last(g.T.offer(d2,pp),'pp','offer').id;
  g.T.dest(pp,id,{x:1000,y:0,name:'Кремль'});g.T.price(d2,id,250);g.T.board(pp,d2,id,true);g.tick(120e3);d2.x=1000;pp.x=1000;
  assert.equal(last(g.T.finish('driver',d2,pp,id),'pp','cancel').why,'funds');
  const h=setup();const T=h.T;const dr=h.P('d','dk',0,0,'own');
  for(let i=0;i<20;i++){const k='pk'+i;h.w.bal[k]=1000;const pi=h.P('p'+i,k,8,0);const id2=last(T.offer(dr,pi),'p'+i,'offer').id;T.dest(pi,id2,{x:1000,y:0,name:'Кремль'});T.price(dr,id2,80);T.board(pi,dr,id2,true);
    h.tick(120e3);dr.x=1000;pi.x=1000;assert.ok(last(T.finish('driver',dr,pi,id2),'d','done'),'поездка '+i);dr.x=0;}
  h.w.bal.pk21=1000;assert.equal(last(T.offer(dr,h.P('p21','pk21',8,0)),'d','err').e,'limit-day');
});

test('отмены: отказ, минута без ответа, полчаса в дороге, зашёл в помещение, вышел из машины, отключился, «Начать заново»',()=>{
  let f=setup();let d=f.P('d','dk',0,0,'own'),p=f.P('p','pk',8,0);let id=last(f.T.offer(d,p),'p','offer').id;
  assert.equal(last(f.T.dest(p,id,null),'d','cancel').why,'declined');
  id=last(f.T.offer(d,p),'p','offer').id;f.tick(61e3);assert.equal(last(f.T.tick(),'d','cancel').why,'timeout');
  let r=ride(setup());f=setup();r=ride(f);f.tick(29*60e3);assert.equal(f.T.tick().length,0,'в дороге минута — не срок');f.tick(61e3);assert.equal(last(f.T.tick(),'p','cancel').why,'timeout');
  f=setup();r=ride(f);r.p.room='v1:cafe:1:2:3';assert.equal(last(f.T.moved(r.p),'d','cancel').why,'left');
  f=setup();r=ride(f);r.d.v=null;assert.equal(last(f.T.moved(r.d),'p','cancel').why,'car');
  f=setup();r=ride(f);assert.equal(last(f.T.gone('d'),'p','cancel').why,'left');
  f=setup();r=ride(f);assert.equal(last(f.T.reset('pk'),'d','cancel').why,'reset');
  f=setup();r=ride(f);f.w.gen.pk=1;f.tick(120e3);r.d.x=1000;r.p.x=1000;assert.equal(last(f.T.finish('driver',r.d,r.p,r.id),'d','cancel').why,'reset','кошелёк начат заново — не платим');
});

test('пока одна поездка не кончилась, вторую не взять ни водителю, ни пассажиру',()=>{
  const f=setup();const d=f.P('d','dk',0,0,'own'),p=f.P('p','pk',8,0),p2=f.P('p2','p2k',6,0),d2=f.P('d2','d2k',3,0,'car');
  f.T.offer(d,p);assert.equal(last(f.T.offer(d,p2),'d','err').e,'busy');assert.equal(last(f.T.offer(d2,p),'d2','err').e,'p-busy');
  const ok=last(f.T.board(p,d,'nope',true),'p');assert.equal(ok,undefined,'чужой номер поездки — тишина');
});
