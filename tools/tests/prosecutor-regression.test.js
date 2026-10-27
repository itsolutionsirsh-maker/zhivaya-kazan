// Pure Node regressions against the real scenario module; no server, browser or model calls.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../../site/js/prosecutor.js'), 'utf8');

function game(step = 0) {
  const hooks = [], timers = [], defs = {}, messages = [], effects = [];
  const npc = {role:'prosecutor', p:{name:'Бирэн абый', lines:['Проверка после обеда.']}};
  const room = {kind:'prosecutor', w:13, h:9, npcs:[npc]};
  const c = {
    PROG:{pros:{fines:[], step, on:1, met:1, ev:{}}},
    clock:{minutes:10000, day:7}, player:{ix:6.5, iy:3.1, money:0, mood:50, cool:{}, x:0, y:0},
    interior:room, scene:'interior', ECON:{owed:0}, walkers:[],
    SIT:{card:null, queue:[], marks:new Map()},
    world:{roads:[], nodes:[], pois:[], meta:{}},
    cityPeople:[{role:'prosecutor',name:'Бирэн абый'}],
    cityPlaces:[{id:'prosecutor-office',ll:[0,0]}],
    cityTexts:{prosecutor:{appeal:{granted:['Возвращаем штраф.'],lost:['Завтра.'],refused:['Отказ.']},
      expose:['rumors','evidence','journalist','check','resign'].map(id=>({id,title:id,text:id,reward:{}}))}},
    Math:Object.create(Math),
    defEnter:fn=>hooks.push(fn), defSit:(id,d)=>{defs[id]=d;},
    setTimeout:(fn,ms)=>{timers.push({fn,ms});},
    progSave:()=>{c.saved=JSON.parse(JSON.stringify(c.PROG));},
    sitCard:o=>{if(c.SIT.card)c.SIT.queue.push(o);else c.SIT.card=o;return o;},
    busyFor:(key,min)=>{if((c.player.cool[key]||0)-c.clock.minutes>1)return false;c.player.cool[key]=c.clock.minutes+min;return true;},
    spendTime:min=>effects.push(['time',min]),
    sitMoney:n=>{c.player.money+=n;effects.push(['money',n]);},
    sitMood:n=>{c.player.mood+=n;}, sitRep:()=>{},
    addEvent:()=>{}, setHint:s=>messages.push(s), say:()=>{}, openChat:()=>{},
    pick:a=>a[0], fmtMoney:String, dist:(x,y,a,b)=>Math.hypot(x-a,y-b),
    clamp:(n,a,b)=>Math.min(b,Math.max(a,n)), llToXY:q=>q,
    mark:(s,k,x,y,icon,label)=>c.SIT.marks.set(k,{x,y,icon,label}), unmark:k=>c.SIT.marks.delete(k)
  };
  c.window=c;
  vm.createContext(c);vm.runInContext(source,c,{filename:'prosecutor.js'});
  c.Math.random=()=>0.97;
  return {c,room,npc,hooks,timers,defs,messages,effects,
    fine(sum=1000){c.prosNoteFine(sum,'Штраф за проезд');return c.prosFine();},
    reception(){c.prosReception();return c.SIT.card;},
    clear(){c.SIT.card=null;c.SIT.queue.length=0;},
    enter(){c.interior=room;c.scene='interior';for(const h of hooks)h(room);},
    flush(){while(timers.length)timers.shift().fn();}
  };
}

test('a second queued reception cannot refund the same fine after cooldown',()=>{
  const g=game(),{c}=g,f=g.fine();
  const first=g.reception();c.prosReception();
  const stale=c.SIT.queue[0].choices[0];
  first.choices[0].run();assert.equal(c.player.money,1000);assert.equal(f.done,1);
  c.clock.minutes+=61;stale.run();
  assert.equal(c.player.money,1000);assert.equal(g.effects.filter(e=>e[0]==='time').length,1);
});

test('debt is repaid once and the remainder is refunded once',()=>{
  const g=game(),{c}=g,f=g.fine();c.ECON.owed=700;
  const run=g.reception().choices[0].run;run();c.clock.minutes+=61;run();
  assert.equal(c.ECON.owed,0);assert.equal(c.player.money,300);assert.equal(f.done,1);
});

for(const state of ['expired','removed','retry','refused'])test(`queued complaint revalidates ${state} fine before any side effects`,()=>{
  const g=game(),{c}=g,f=g.fine(),run=g.reception().choices[0].run;
  if(state==='expired')c.clock.minutes+=10*1440;
  if(state==='removed')c.PROG.pros.fines=[];
  if(state==='retry')f.retry=c.clock.minutes+1440;
  if(state==='refused')f.done=1;
  run();assert.equal(c.player.money,0);assert.equal(g.effects.length,0);assert.equal(c.player.cool.appeal,undefined);
});

test('lost papers can be appealed the following day through a new reception',()=>{
  const g=game(),{c}=g,f=g.fine();c.Math.random=()=>0.6;
  g.reception().choices[0].run();assert.equal(c.prosFine(),null);assert.ok(f.retry>c.clock.minutes);
  g.clear();c.clock.minutes+=1441;c.Math.random=()=>0.97;
  g.reception().choices[0].run();assert.equal(c.player.money,1000);
});

for(const move of ['outside','away from desk','new visit to cached room'])test(`an old reception action is rejected after ${move}`,()=>{
  const g=game(),{c}=g;g.enter();g.fine();const run=g.reception().choices[0].run;
  if(move==='outside'){c.scene='city';c.interior=null;}
  if(move==='away from desk')c.player.iy=7.9;
  if(move==='new visit to cached room'){c.scene='city';c.interior=null;g.enter();}
  run();assert.equal(c.player.money,0);assert.equal(g.effects.length,0);
});

test('reentering the same cached room and waiting never skips check or square',()=>{
  const g=game(3),{c}=g;
  g.enter();c.interior=null;c.scene='city';g.enter();g.flush();
  assert.equal(c.PROG.pros.step,3);assert.equal(c.PROG.pros.gone,undefined);
  c.player.iy=7.9;c.prosReception();assert.equal(c.PROG.pros.step,3);
  c.player.iy=3.1;c.prosReception();assert.equal(c.PROG.pros.step,4);
  c.prosReception();g.flush();assert.equal(c.PROG.pros.step,4);assert.equal(c.PROG.pros.gone,undefined);
});

test('journalist benefit survives the real desk transition, without resetting progress',()=>{
  const g=game(2),{c}=g;c.prosDone('journalist');g.clear();g.fine(1500);
  g.enter();g.flush();assert.equal(c.PROG.pros.step,3);
  c.prosReception();assert.equal(c.PROG.pros.step,4);
  const reception=c.SIT.queue.find(o=>o.choices.some(q=>/Подать жалобу/.test(q.t)));
  assert.ok(reception);c.Math.random=()=>0.1;reception.choices[0].run();
  assert.equal(c.player.money,1500);assert.equal(c.PROG.pros.step,4);
});

test('old saves at step four retain journalist benefit; after the ending it expires',()=>{
  const g=game(4),{c}=g;g.fine();c.Math.random=()=>0.1;g.reception().choices[0].run();
  assert.equal(c.player.money,1000);
  c.prosDone('resign');g.clear();c.clock.minutes+=7*1440+1;g.enter();g.fine(700);
  g.reception().choices[0].run();assert.equal(c.player.money,1000);
});

test('a stale expected step cannot advance the next step',()=>{
  const g=game(3),{c}=g;c.prosDone('check');c.prosDone('check');
  assert.equal(c.PROG.pros.step,4);assert.equal(c.PROG.pros.gone,undefined);
});
