// Снимки и поручение в серверном снимке: только короткие файлы, старый снимок без полей ничего не стирает.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../../site/js/net.js'),'utf8');
const a=src.indexOf('function acctPhotoList'),b=src.indexOf('function acctSnapshot');
assert.ok(a>=0&&b>a);
const c={localStorage:{getItem:()=>null,setItem(){},removeItem(){}}};
vm.runInContext(src.slice(a,b)+'\nthis.acctPhotoList=acctPhotoList;this.acctErrandPack=acctErrandPack;',vm.createContext(c));

test('photo list keeps file paths and drops drawn postcards and odd urls',()=>{
  const list=c.acctPhotoList([
    {src:'img/shots/babushka.gif',title:'Бабушка с пакетом',at:5},
    {src:'data:image/jpeg;base64,aaaa',title:'Открытка',at:6},
    {src:'https://evil.example/a.gif',title:'чужое',at:7},
    {src:'img/../shots/x.gif',title:'мимо',at:8}
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(list)),[{src:'img/shots/babushka.gif',title:'Бабушка с пакетом',at:5}]);
});

test('errand pack keeps the active job and refuses a huge blob',()=>{
  const job=c.acctErrandPack({active:{id:'honey-alsu',phase:'drop',pay:80,take:{kind:'shop'}},done:{a:1},day:3,count:1});
  assert.equal(job.active.id,'honey-alsu');
  assert.equal(job.active.phase,'drop');
  assert.equal(job.done.a,1);
  assert.equal(c.acctErrandPack({active:{id:'x',thanks:'y'.repeat(9000)},done:{},day:1,count:0}),null);
});

test('cloud apply restores file shots and the errand, and does not keep them inside zk.state',()=>{
  const apply=src.slice(src.indexOf('function acctApply(j)'),src.indexOf('// при запуске:'));
  const store=new Map();
  const g={
    localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
    journeyKeepLocal:()=>false,setRev(){},window:{},location:{reload(){g.reloaded=true;}},$:()=>({textContent:''})
  };
  vm.runInContext(src.slice(a,b)+apply,vm.createContext(g));
  g.acctApply({updated:9,state:{money:10,photos:[{src:'img/shots/golubi.gif',title:'Голуби',at:1},{src:'data:image/jpeg;base64,qq',title:'лист'}],errand:{active:{id:'honey-alsu',phase:'take',pay:40},done:{},day:2,count:0}},profile:{name:'А'},city:null});
  assert.equal(g.reloaded,true);
  assert.deepEqual(JSON.parse(store.get('zk.photos')),[{src:'img/shots/golubi.gif',title:'Голуби',at:1}]);
  assert.equal(JSON.parse(store.get('zk.errand')).active.id,'honey-alsu');
  const state=JSON.parse(store.get('zk.state'));
  assert.equal(state.money,10);
  assert.equal(state.photos,undefined);
  assert.equal(state.errand,undefined);
});

test('an old cloud save without these fields leaves the phone gallery and the errand alone',()=>{
  const apply=src.slice(src.indexOf('function acctApply(j)'),src.indexOf('// при запуске:'));
  const store=new Map([['zk.photos','[{"src":"img/shots/babushka.gif","title":"Бабушка","at":1}]'],['zk.errand','{"active":{"id":"local"},"done":{},"day":1,"count":0}']]);
  const g={
    localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
    journeyKeepLocal:()=>false,setRev(){},window:{},location:{reload(){}},$:()=>({textContent:''})
  };
  vm.runInContext(src.slice(a,b)+apply,vm.createContext(g));
  g.acctApply({updated:3,state:{money:20},profile:null,city:{day:1}});
  assert.equal(JSON.parse(store.get('zk.photos'))[0].src,'img/shots/babushka.gif');
  assert.equal(JSON.parse(store.get('zk.errand')).active.id,'local');
});
