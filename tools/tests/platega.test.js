const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('fs'),os=require('os'),path=require('path');
const {Platega,readShop}=require('../../server/node/platega.js');

test('витрина читает id, название и рубли',()=>{
  const items=readShop("{id:'cap-wool', kind:'hat', title:'Вязаная шапка', stars:15, rub:30, text:'На ночной остановке.'}");
  assert.deepEqual(items,[{id:'cap-wool',title:'Вязаная шапка',rub:30}]);
});
test('пополнение одно на сайт и Телегу, повтор колбэка не удваивает, покупка списывает',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'platega-'));
  const file=path.join(dir,'p.json');
  let payload='';
  const fetch=async(url)=>{
    if(String(url).includes('/v2/transaction/process'))return {ok:true,json:async()=>({transactionId:'tx-1',url:'https://pay.platega.io/?id=tx-1',status:'PENDING'})};
    return {ok:true,json:async()=>({id:'tx-1',status:'CONFIRMED',paymentDetails:{amount:100,currency:'RUB'},payload})};
  };
  const pay=Platega({merchantId:'merch',secret:'sekret',shop:[{id:'cap-wool',title:'Шапка',rub:30}],file,fs,fetch,now:()=>1000});
  const made=await pay.create('acc1','top-100',{ok:'https://kazan.lifegorod.com/?pay=back',fail:'https://kazan.lifegorod.com/?pay=fail'},'1.2.3.4');
  assert.equal(made.ok,1);payload=made.id;
  assert.equal((await pay.callback({'x-merchantid':'merch','x-secret':'no'},{id:'tx-1',payload,status:'CONFIRMED',amount:1})).code,401);
  assert.equal(pay.balance('acc1'),0);
  assert.equal((await pay.callback({'x-merchantid':'merch','x-secret':'sekret'},{id:'tx-1',payload})).bal,100);
  assert.equal((await pay.callback({'x-merchantid':'merch','x-secret':'sekret'},{id:'tx-1',payload})).bal,100);
  assert.equal((await pay.create('acc1','cap-wool',{ok:'x',fail:'y'})).err,'no_top');
  const spent=pay.spend('acc1','cap-wool');
  assert.equal(spent.ok,1);assert.equal(spent.bal,70);assert.deepEqual(pay.owned('acc1'),['cap-wool']);
  assert.equal(pay.spend('acc1','cap-wool').err,'owned');
  const state=pay.apply('acc1',{money:10,prog:{inv:[]}});
  assert.deepEqual(state.prog.inv,['cap-wool']);assert.equal(state.money,10);
});
test('чужая сумма не зачисляется, без денег вещь не отдаём',async()=>{
  const pay=Platega({merchantId:'m',secret:'s',shop:[{id:'coat',title:'Пальто',rub:160}],fetch:async(url)=>({ok:true,json:async()=>String(url).includes('process')?{transactionId:'tx',url:'https://pay.platega.io/x'}:{id:'tx',status:'CONFIRMED',paymentDetails:{amount:10,currency:'RUB'}}}),now:()=>1});
  const made=await pay.create('a','top-100',{ok:'https://a',fail:'https://b'});
  const r=await pay.callback({'x-merchantid':'m','x-secret':'s'},{payload:made.id,id:'tx'});
  assert.equal(r.ok,1);assert.equal(pay.balance('a'),0);
  assert.equal(pay.spend('a','coat').err,'funds');
  assert.equal((await pay.create('a','top-50',{ok:'https://a',fail:'https://b'})).err,'no_top');
});
