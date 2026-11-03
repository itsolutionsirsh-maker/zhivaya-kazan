const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('fs'),os=require('os'),path=require('path');
const {Platega,readShop,opId,RATE}=require('../../server/node/platega.js');
const {Wallet,jsonBackend,LIM}=require('../../server/node/wallet.js');

test('витрина читает id, название и рубли',()=>{
  const items=readShop("{id:'cap-wool', kind:'hat', title:'Вязаная шапка', stars:15, rub:30, text:'На ночной остановке.'}");
  assert.deepEqual(items,[{id:'cap-wool',title:'Вязаная шапка',rub:30}]);
});
test('пополнение даёт игровые 1 к 100, повтор колбэка не удваивает, одежду с этого счёта не покупают',async()=>{
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
  const done=await pay.callback({'x-merchantid':'merch','x-secret':'sekret'},{id:'tx-1',payload});
  assert.equal(done.game,10000);assert.equal(done.fresh,1);assert.equal(done.rub,100);assert.equal(pay.balance('acc1'),0);
  const again=await pay.callback({'x-merchantid':'merch','x-secret':'sekret'},{id:'tx-1',payload});
  assert.equal(again.game,10000);assert.equal(again.fresh,0);assert.equal(pay.balance('acc1'),0);
  assert.equal(pay.spend('acc1','cap-wool').err,'funds');
  assert.equal((await pay.pull('acc1')).length,0);
});
test('чужая сумма не зачисляется, без денег вещь не отдаём',async()=>{
  const pay=Platega({merchantId:'m',secret:'s',shop:[{id:'coat',title:'Пальто',rub:160}],fetch:async(url)=>({ok:true,json:async()=>String(url).includes('process')?{transactionId:'tx',url:'https://pay.platega.io/x'}:{id:'tx',status:'CONFIRMED',paymentDetails:{amount:10,currency:'RUB'}}}),now:()=>1});
  const made=await pay.create('a','top-100',{ok:'https://a',fail:'https://b'});
  const r=await pay.callback({'x-merchantid':'m','x-secret':'s'},{payload:made.id,id:'tx'});
  assert.equal(r.ok,1);assert.equal(pay.balance('a'),0);
  assert.equal(pay.spend('a','coat').err,'funds');
  assert.equal((await pay.create('a','top-50',{ok:'https://a',fail:'https://b'})).err,'no_top');
});
test('возврат на сайт сам дожимает оплату и только один раз',async()=>{
  let payload='',status='PENDING';
  const fetch=async(url)=>{
    if(String(url).includes('/v2/transaction/process'))return {ok:true,json:async()=>({transactionId:'tx-2',url:'https://pay.platega.io/x',status:'PENDING'})};
    return {ok:true,json:async()=>({id:'tx-2',status,paymentDetails:{amount:1000,currency:'RUB'},payload})};
  };
  const pay=Platega({merchantId:'m',secret:'s',shop:[],fetch,now:()=>1});
  const made=await pay.create('acc','top-1000',{ok:'https://a/?pay=back',fail:'https://a/?pay=fail'});
  payload=made.id;
  assert.equal((await pay.pull('acc')).length,0);
  status='CONFIRMED';
  const rows=await pay.pull('acc');
  assert.equal(rows.length,1);assert.equal(rows[0].game,100000);assert.equal(rows[0].rub,1000);
  assert.equal((await pay.pull('acc')).length,0);
});
test('на карту падает 1 к 100 и вторая такая же плата не удваивает',()=>{
  const w=Wallet(jsonBackend(null,null),{now:()=>1});
  w.commit('p',{});
  const id=opId('pay','550e8400-e29b-41d4-a716-446655440000');
  const g=w.grant('p',1000*RATE,id,'Пополнение 1000 ₽','pay');
  assert.equal(g.amt,100000);assert.equal(g.bal,LIM.start+100000);
  assert.equal(w.grant('p',100000,id,'ещё','pay').dup,1);
  assert.equal(w.info('p').bal,LIM.start+100000);
  const back=w.grant('p',-100000,opId('cb','550e8400-e29b-41d4-a716-446655440000'),'Возврат 1000 ₽','pay');
  assert.equal(back.bal,LIM.start);
});
