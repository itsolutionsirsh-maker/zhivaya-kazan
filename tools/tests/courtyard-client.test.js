const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),D=require('../../site/js/courtyard-data');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function setup(){
  class Element{constructor(){this.hidden=false;this.children=[];this.dataset={};}append(...n){this.children.push(...n);}replaceChildren(){this.children=[];}querySelectorAll(){return [];}focus(){}}
  const nodes={},el=id=>nodes[id]||(nodes[id]=new Element()),calls=[],providers=[];
  el('courtyardModal').hidden=true;el('menuModal').hidden=true;
  const meta={lon0:49,lat0:56,mlon:60000,mlat:111000},p=D.point(meta),ctx={CourtyardData:D,document:{getElementById:el,createElement:()=>new Element(),hidden:false},acct:{token:'account-one'},myCid:'a'.repeat(32),Net:{syncReady:true},world:{meta},scene:'city',player:{...p,state:'ok'},cam:p,dist:(a,b,c,d)=>Math.hypot(a-c,b-d),cityTerritories:{snapshot:()=>({story:{stage:'done',reunion:{}}})},cityObjectives:{register:p=>providers.push(p)},defWatch(){},crypto:require('node:crypto').webcrypto,AbortSignal,setTimeout,clearTimeout,Date,
    fetch(url,opt){return new Promise((resolve,reject)=>calls.push({body:opt.body?JSON.parse(opt.body):null,resolve:j=>resolve({ok:true,status:200,json:async()=>j}),reject}));}};
  ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../../site/js/courtyard.js'),'utf8'),ctx);
  const state=()=>({version:1,rev:0,epochs:[0,0,0],done:{},busy:[],contributors:[],me:{work:null,today:0,starts:0,limit:3},now:Date.now()});
  const find=(node,text)=>{if(node.textContent===text)return node;for(const c of node.children){const f=find(c,text);if(f)return f;}};
  const ready=async()=>{ctx.cityCourtyard.open();calls[0].resolve({ok:1,state:state()});await sleep(0);};
  return {ctx,nodes,calls,state,ready,providers,button:t=>find(el('courtyardContent'),t)};
}
test('client serializes a double click while a status response is pending',async()=>{
  const f=setup();await f.ready();const refresh=f.ctx.cityCourtyard.refresh();
  f.button('Подготовить доски').onclick();f.calls[1].resolve({ok:1,state:f.state()});await refresh;
  // Mutation still waits for its turn. The status finally must not clear its lock.
  f.button('Подготовить доски').onclick();await sleep(70);
  assert.equal(f.calls.filter(c=>c.body?.op==='start').length,1);
  f.calls[2].resolve({ok:1,state:f.state()});await sleep(0);
});
test('client retries an uncertain mutation with exactly the original request identity',async()=>{
  const f=setup();await f.ready();f.button('Подготовить доски').onclick();const original=f.calls[1].body;f.calls[1].reject(Error('lost response'));await sleep(0);
  assert.equal(f.nodes.courtyardRetry.hidden,false);f.nodes.courtyardRetry.onclick();assert.deepEqual(f.calls[2].body,original);
  f.calls[2].resolve({ok:1,state:f.state()});await sleep(0);assert.equal(f.nodes.courtyardRetry.hidden,true);
});
test('late response from the previous account cannot populate the next account',async()=>{
  const f=setup();await f.ready();const r=f.ctx.cityCourtyard.refresh();f.ctx.acct={token:'account-two'};
  f.calls[1].resolve({ok:1,state:f.state()});await r;assert.equal(f.ctx.cityCourtyard.snapshot(),null);
});
test('shared objective follows the story and uses the existing provider registry',async()=>{
  const f=setup();await f.ready();assert.equal(f.providers.length,1);assert.equal(f.providers[0].priority,40);assert.equal(f.providers[0].read().id,'shared-yard');
  f.ctx.cityTerritories.snapshot=()=>({story:{stage:'invite'}});assert.equal(f.providers[0].read(),null);
});
