// node --test tools/tests/shared-events.test.js
// Общие события рядом (server/node/shared-events.js): ДТП с участием игрока — проверки сервера, слияние, срок, модератор.
const test=require('node:test');
const assert=require('node:assert/strict');
const {SharedEvents}=require('../../server/node/shared-events.js');
const mk=()=>{let t=1_000_000;const S=SharedEvents({now:()=>t});return {S,tick:ms=>{t+=ms;}};};
const P=(id,x,y,room)=>({id,x,y,room:room||null});

test('сообщение принято, если игрок у места; в списке — без того, кто сообщил',()=>{
  const {S,tick}=mk();
  const r=S.report(P('a',100,200),{k:'incident',x:120,y:210,ped:true});
  assert.ok(r.ok);assert.ok(!r.merged);
  tick(30e3);const L=S.snapshot();
  assert.equal(L.length,1);
  assert.deepEqual(Object.keys(L[0]).sort(),['age','id','k','left','ped','x','y']);
  assert.equal(L[0].age,30);assert.equal(L[0].left,570);assert.equal(L[0].ped,true);assert.equal(L[0].x,120);
});

test('далеко от своего места, в помещении, без координат, чужой вид или мусор вместо чисел — отказ',()=>{
  const {S}=mk();
  assert.equal(S.report(P('a',0,0),{k:'incident',x:151,y:0}).err,'far');
  assert.equal(S.report(P('a',0,0,'v1:cafe:1:2:x'),{k:'incident',x:1,y:1}).err,'far');
  assert.equal(S.report({id:'a'},{k:'incident',x:1,y:1}).err,'far');
  assert.equal(S.report(P('a',0,0),{k:'match',x:1,y:1}).err,'kind');
  assert.equal(S.report(P('a',0,0),{k:'incident',x:'abc',y:1}).err,'xy');
  assert.equal(S.report(P('a',0,0),{k:'incident',x:1e9,y:1}).err,'xy');
  assert.equal(S.report(P('a',0,0),null).err,'kind');
  assert.equal(S.count(),0);
});

test('один игрок — не чаще раза в 10 минут; другой рядом — сливается в ту же аварию',()=>{
  const {S,tick}=mk();
  assert.ok(S.report(P('a',0,0),{k:'incident',x:0,y:0}).ok);
  tick(60e3);
  assert.equal(S.report(P('a',3000,0),{k:'incident',x:3000,y:0}).err,'often');
  const r=S.report(P('b',50,0),{k:'incident',x:60,y:0});
  assert.ok(r.ok&&r.merged);assert.equal(S.count(),1);
  // слияние продлевает срок
  assert.equal(S.snapshot()[0].left,600);
  tick(10*60e3);
  assert.ok(S.report(P('a',3000,0),{k:'incident',x:3000,y:0}).ok,'через 10 минут снова можно');
});

test('старая авария рядом (старше 5 минут) — уже новая; далеко — новая',()=>{
  const {S,tick}=mk();
  S.report(P('a',0,0),{k:'incident',x:0,y:0});
  tick(6*60e3);
  assert.ok(!S.report(P('b',20,0),{k:'incident',x:20,y:0}).merged);
  assert.ok(!S.report(P('c',2000,0),{k:'incident',x:2000,y:0}).merged);
  assert.equal(S.count(),3);
});

test('живёт 10 минут; больше 30 сразу — отказ',()=>{
  const {S,tick}=mk();
  for(let i=0;i<30;i++)assert.ok(S.report(P('p'+i,i*500,0),{k:'incident',x:i*500,y:0}).ok);
  assert.equal(S.report(P('q',99999>>2,0),{k:'incident',x:99999>>2,y:0}).err,'full');
  tick(10*60e3);
  assert.equal(S.count(),0);assert.deepEqual(S.snapshot(),[]);
});

test('модератор снимает одну аварию или все',()=>{
  const {S}=mk();
  S.report(P('a',0,0),{k:'incident',x:0,y:0});S.report(P('b',5000,0),{k:'incident',x:5000,y:0});
  const id=S.snapshot()[0].id;
  assert.equal(S.clear(id),1);assert.equal(S.count(),1);
  assert.equal(S.clear('нет-такой'),0);
  assert.equal(S.clear(),1);assert.equal(S.count(),0);
});
