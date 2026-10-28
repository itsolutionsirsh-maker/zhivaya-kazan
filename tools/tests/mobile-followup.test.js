// DOM reconciliation and keyboard/viewport regressions. Uses production functions.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=n=>fs.readFileSync(path.join(__dirname,'../../site/js',n),'utf8');
const main=read('main.js'),mobile=read('ui.js');
function part(s,a,b){const start=s.indexOf(a),end=s.indexOf(b,start);assert.ok(start>=0&&end>start);return s.slice(start,end);}
function viewport(h,v){const c=vm.createContext({h,v});vm.runInContext(mobile,c);const r=JSON.parse(vm.runInContext('JSON.stringify(uiViewportMetrics(h,v,null,false))',c));return {height:r.visible,top:r.top};}
test('viewport follows keyboard and offset without extending beyond the layout',()=>{
  assert.deepEqual(viewport(844,{height:450,offsetTop:32,scale:1}),{height:450,top:32});
  assert.deepEqual(viewport(844,{height:844,offsetTop:100,scale:1}),{height:744,top:100});
  assert.deepEqual(viewport(390,{height:280,offsetTop:-10,scale:1}),{height:280,top:0});
});
test('pinch zoom does not resize UI, unavailable and invalid viewports use layout height',()=>{
  for(const v of [null,{scale:2,height:200,offsetTop:20},{scale:1,height:NaN},{scale:1,height:0}])assert.deepEqual(viewport(844,v),{height:844,top:0});
  assert.deepEqual(viewport(0,null),{height:1,top:0});
});
function fixture(){
  let writes=0;
  class Element{
    constructor(){this.children=[];this.parentNode=null;this.events={};this.hidden=false;this.scrollTop=0;this.classList={add(){},remove(){}};}
    get firstChild(){return this.children[0]||null;}
    get nextSibling(){return this.parentNode?.children[this.parentNode.children.indexOf(this)+1]||null;}
    get childElementCount(){return this.children.length;}
    get scrollHeight(){return this.children.length*30;}
    insertBefore(node,next){assert.ok(next===null||this.children.includes(next));node.remove();const i=next?this.children.indexOf(next):this.children.length;this.children.splice(i,0,node);node.parentNode=this;writes++;}
    append(...nodes){for(const n of nodes)this.insertBefore(n,null);}
    remove(){if(this.parentNode){const p=this.parentNode;p.children.splice(p.children.indexOf(this),1);this.parentNode=null;writes++;}}
    addEventListener(k,fn){this.events[k]=fn;}
    click(){this.events.click?.();}
  }
  const nodes=new Map();const $=s=>{if(!nodes.has(s))nodes.set(s,new Element());return nodes.get(s);};
  $('#logModal').hidden=true;
  const c=vm.createContext({$,document:{createElement:()=>new Element()},performance:{now:()=>c.now},now:100,fmtTime:()=> '12:30',setInterval(){},player:{}});
  vm.runInContext(part(main,'const feedEl=','function fmtTime()'),c);
  return {$,run:s=>vm.runInContext(s,c),add:(text='Событие',kind)=>{c.msg=text;c.kind=kind;vm.runInContext('addEvent(msg,kind)',c);},advance:t=>{c.now+=t;vm.runInContext('renderFeed()',c);},reset:()=>{writes=0;},writes:()=>writes};
}
test('expiry tick preserves row identity and makes no child-list mutations',()=>{
  const f=fixture();f.add();const row=f.$('#feed').firstChild;f.reset();f.advance(1000);
  assert.equal(f.$('#feed').firstChild,row);assert.equal(f.writes(),0);
});
test('adding an event keeps the previous row and removes only the oldest preview',()=>{
  const f=fixture();f.add('A');const a=f.$('#feed').firstChild;f.add('B');const b=f.$('#feed').firstChild;
  assert.equal(f.$('#feed').children[1],a);f.add('C');assert.equal(f.$('#feed').children[1],b);assert.equal(a.parentNode,null);
});
test('preview expires while the journal keeps all events',()=>{
  const f=fixture();f.add();f.$('#logBtn').click();assert.equal(f.$('#logModal').hidden,false);f.advance(7000);
  assert.equal(f.$('#feed').hidden,true);assert.equal(f.$('#feed').children.length,0);assert.equal(f.$('#logList').children.length,1);
});
test('journal preserves reading position on ticks and prepend; explicit reopen starts at newest',()=>{
  const f=fixture();for(let i=0;i<20;i++)f.add(String(i));f.$('#logBtn').click();const list=f.$('#logList');list.scrollTop=120;
  f.advance(1000);assert.equal(list.scrollTop,120);f.add('new');assert.equal(list.scrollTop,150);
  f.$('#logClose').click();f.$('#logBtn').click();assert.equal(list.scrollTop,0);
});
test('journal is bounded to 40 rows, renders messages as text and shows the newest first',()=>{
  const f=fixture();f.$('#logBtn').click();for(let i=0;i<50;i++)f.add(String(i));const list=f.$('#logList');
  assert.equal(list.children.length,40);assert.equal(list.firstChild.children[1].textContent,'49');
  f.add('<img src=x onerror=alert(1)>','alert');assert.equal(list.firstChild.children[1].textContent,'<img src=x onerror=alert(1)>');assert.equal(list.firstChild.className,'ev alert');
});
function keyboard(dialog,tag){
  let handler,opened=0,prevented=0;
  const c=vm.createContext({window:{addEventListener:(name,fn)=>{handler=fn;}},document:{body:{classList:{contains:()=>dialog}}},keys:{},player:{busy:false},chatOpen:()=>false,openChatPanel:()=>opened++});
  vm.runInContext(part(main,"window.addEventListener('keydown'","window.addEventListener('keyup'"),c);
  return {press:key=>handler({key,code:key,target:{tagName:tag,closest:()=>tag==='BUTTON'},preventDefault:()=>prevented++}),result:()=>({opened,prevented,keys:Object.keys(c.keys)})};
}
test('Enter and Space on buttons keep native activation instead of opening chat or moving player',()=>{
  const k=keyboard(false,'BUTTON');k.press('Enter');k.press(' ');assert.deepEqual(k.result(),{opened:0,prevented:0,keys:[]});
});
test('open windows block gameplay shortcuts; Enter on the map still opens city chat',()=>{
  const modal=keyboard(true,'H2');modal.press('w');modal.press('Enter');assert.deepEqual(modal.result(),{opened:0,prevented:0,keys:[]});
  const map=keyboard(false,'CANVAS');map.press('Enter');assert.equal(map.result().opened,1);
});
