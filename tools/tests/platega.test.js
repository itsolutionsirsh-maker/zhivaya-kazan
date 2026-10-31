const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('fs'),os=require('os'),path=require('path');
const {Platega,readShop}=require('../../server/node/platega.js');

test('витрина читает id, название и рубли',()=>{
  const items=readShop("{id:'cap-wool', kind:'hat', title:'Вязаная шапка', stars:15, rub:30, text:'На ночной остановке.'}");
  assert.deepEqual(items,[{id:'cap-wool',title:'Вязаная шапка',rub:30}]);
});
test('вещь выдаётся только после подтверждённой суммы, чужой колбэк не проходит',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'platega-'));
  const file=path.join(dir,'p.json');
  let calls=0;
  const fetch=async(url,opt)=>{
    calls++;
    if(String(url).includes('/v2/transaction/process'))return {ok:true,json:async()=>({transactionId:'tx-1',url:'https://pay.platega.io/?id=tx-1',status:'PENDING'})};
    return {ok:true,json:async()=>({id:'tx-1',status:'CONFIRMED',paymentDetails:{amount:30,currency:'RUB'},payload:JSON.parse(opt&&opt.body||'{}').payload||dbPayload})};
  };
  let dbPayload='';
  const pay=Platega({merchantId:'merch',secret:'sekret',shop:[{id:'cap-wool',title:'Шапка',rub:30}],file,fs,fetch,now:()=>1000});
  const made=await pay.create('acc1','cap-wool',{ok:'https://kazan.lifegorod.com/?pay=back',fail:'https://kazan.lifegorod.com/?pay=fail'},'1.2.3.4');
  assert.equal(made.ok,1);assert.match(made.url,/pay\.platega\.io/);
  dbPayload=made.id;
  const denied=await pay.callback({'x-merchantid':'merch','x-secret':'no'},{id:'tx-1',payload:made.id,status:'CONFIRMED',amount:1});
  assert.equal(denied.code,401);assert.deepEqual(pay.owned('acc1'),[]);
  const ok=await pay.callback({'x-merchantid':'merch','x-secret':'sekret'},{id:'tx-1',payload:made.id,status:'CONFIRMED',amount:9999});
  assert.equal(ok.code,200);assert.deepEqual(pay.owned('acc1'),['cap-wool']);
  const again=await pay.create('acc1','cap-wool',{ok:'x',fail:'y'});
  assert.equal(again.err,'owned');
  const state=pay.apply('acc1',{money:10,prog:{inv:['old'],wear:{}}});
  assert.deepEqual(state.prog.inv,['old','cap-wool']);assert.equal(state.money,10);
  assert.equal(pay.apply('acc1',state),state);
  assert.ok(calls>=2);
});
test('сумма в ответе Platega не совпала — вещь не выдаём',async()=>{
  const pay=Platega({merchantId:'m',secret:'s',shop:[{id:'coat',title:'Пальто',rub:160}],fetch:async(url)=>({ok:true,json:async()=>String(url).includes('process')?{transactionId:'tx',url:'https://pay.platega.io/x'}:{id:'tx',status:'CONFIRMED',paymentDetails:{amount:10,currency:'RUB'}}}),now:()=>1});
  const made=await pay.create('a','coat',{ok:'https://a',fail:'https://b'});
  const r=await pay.callback({'x-merchantid':'m','x-secret':'s'},{payload:made.id,id:'tx'});
  assert.equal(r.ok,1);assert.deepEqual(pay.owned('a'),[]);
});
