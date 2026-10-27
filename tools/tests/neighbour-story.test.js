// State/interaction regressions for the real script; no browser, map download or paid API.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../../site/js/neighbour-story.js'),'utf8');
const folkSource=fs.readFileSync(path.join(__dirname,'../../site/js/folk.js'),'utf8');
const copy=o=>JSON.parse(JSON.stringify(o));

function game(saved){
  const hooks=[],defs={},events=[],routes=[],effects=[],resumed=[];
  const w={folk:'fidania',x:0,y:0,state:'folkStay',p:{folk:'fidania',name:'Фидания'}};
  const f={id:'fidania',name:'Фидания',w,at:'yard',met:0,places:{yard:{x:0,y:0,inside:false},home:{x:100,y:0,inside:true}}};
  const c={
    PROG:saved?copy(saved.prog):{},
    player:Object.assign({x:0,y:1,ix:1,iy:1,energy:60,mood:40,pantry:0,rep:0,state:'idle'},saved?copy(saved.player):{}),
    clock:{day:saved?saved.day:12},scene:'city',interior:null,walkers:[w],FOLK:{list:[f],ready:true,t:0},chatNpc:null,
    SIT:{card:null,queue:[],marks:new Map()},
    world:{meta:{},pois:[{t:'library',n:'Библиотека во дворе Казани',x:1000,y:0}],pedAdj:[]},cityLandmarks:[],
    defSit:(id,d)=>{defs[id]=d;},defWatch:fn=>hooks.push(fn),
    dist:(x,y,a,b)=>Math.hypot(x-a,y-b),llToXY:q=>q,
    nearestNode:(x,y)=>Number.isFinite(x)&&Number.isFinite(y)?0:-1,
    sidewalkPos:()=>[1000,0],inBuilding:()=>false,
    mark:(s,k,x,y,icon,label)=>c.SIT.marks.set(k,{x,y,icon,label}),unmark:k=>c.SIT.marks.delete(k),
    sitCard:o=>{if(c.SIT.card)c.SIT.queue.push(o);else c.SIT.card=o;return o;},
    progSave:()=>{c.savedProg=copy(c.PROG);},saveState:()=>{c.savedPlayer=copy(c.player);},
    sitMood:n=>{c.player.mood+=n;effects.push(['mood',n]);},sitRep:n=>{c.player.rep+=n;effects.push(['rep',n]);},
    say:(n,line)=>events.push(line),addEvent:line=>events.push(line),setHint:line=>events.push(line),
    openRouteModal:d=>routes.push(d),openChat:n=>events.push('chat:'+n.folk),
    folkOnChat:n=>{assert.equal(n.folk,'fidania');f.met++;f.greet=c.clock.day;},
    folkWant:()=>c.want||'yard',folkGo:(person,to)=>{resumed.push(to);person.trip={to};if(person.w)person.w.state='routing';},
    folkWhere:()=>({id:'fidania',x:w.x,y:w.y,place:'во дворе',text:'Фидания во дворе'})
  };
  c.window=c;vm.createContext(c);
  vm.runInContext(folkSource.slice(folkSource.indexOf('function folkId('),folkSource.indexOf('// Короткое соединение')),c,{filename:'folk.js:identity-reservation'});
  vm.runInContext(folkSource.slice(folkSource.indexOf('function updateFolk('),folkSource.indexOf('// разговор со своим человеком')),c,{filename:'folk.js:updateFolk'});
  vm.runInContext(folkSource.slice(folkSource.indexOf('function folkInterior(')),c,{filename:'folk.js:folkInterior'});
  vm.runInContext(source,c,{filename:'neighbour-story.js'});
  const g={c,w,f,hooks,defs,events,routes,effects,resumed,
    state:()=>c.neighbourStoryState(),
    clear(){c.SIT.card=null;c.SIT.queue.length=0;},
    choose(text){const o=c.SIT.card;assert.ok(o,'Expected a story card');const choice=o.choices.find(q=>q.t.includes(text));assert.ok(choice,'Missing choice: '+text);c.SIT.card=c.SIT.queue.shift()||null;choice.run();return choice;},
    meet(){c.neighbourStoryMeet(w);},
    accept(){this.meet();this.choose('Обещаю');assert.equal(this.state().stage,'carrying');},
    destination(){const d=this.state().dest;c.player.x=d.x;c.player.y=d.y;c.player.inside=false;c.player.vehicle=null;c.player.bus=null;c.scene='city';},
    home(){c.player.x=w.x;c.player.y=w.y;c.player.inside=false;c.player.vehicle=null;c.player.bus=null;c.scene='city';},
    deliver(){this.destination();c.neighbourStoryDeliver();this.choose('Передать и помочь');assert.equal(this.state().stage,'returning');this.clear();},
    finish(){this.home();this.meet();this.choose('Рассказать и принять');assert.equal(this.state().stage,'done');},
    tick(){for(const fn of hooks)fn(1.1);},
    reload(){return game({prog:c.savedProg||c.PROG,player:c.savedPlayer||c.player,day:c.clock.day});}
  };
  return g;
}

test('menu offers a route, never a remote promise or reward',()=>{
  const g=game(),{c}=g;c.player.x=600;c.neighbourStoryOpen();
  assert.equal(c.SIT.card.choices.some(q=>/Обещаю|принять/.test(q.t)),false);
  g.choose('Найти');assert.equal(g.routes.length,1);assert.equal(g.state().stage,'new');
  g.meet();assert.equal(g.state().met,undefined);assert.equal(g.effects.length,0);
});

test('refusal is remembered and a later personal visit can accept without penalty',()=>{
  const g=game();g.meet();g.choose('Сейчас не');
  assert.equal(g.state().stage,'declined');assert.match(g.c.neighbourStoryContext('fidania'),/отказался/);
  assert.equal(g.effects.length,0);g.accept();assert.equal(g.f.met,2);
});

test('no walkable library means no promise, inventory or fabricated destination',()=>{
  const g=game();g.c.nearestNode=()=>-1;g.meet();
  assert.equal(g.c.SIT.card.choices.some(q=>/Обещаю/.test(q.t)),false);
  assert.equal(g.state().dest,undefined);assert.equal(g.state().stage,'offered');
});

test('an existing library map point becomes a persistent destination and normal route',()=>{
  const g=game();g.accept();const d=copy(g.state().dest);
  assert.deepEqual(d,{x:1000,y:0,n:'Библиотека во дворе Казани',kind:'встреча у библиотеки'});
  g.c.neighbourStoryOpen();g.choose('Маршрут к библиотеке');
  assert.deepEqual(copy(g.routes[0]),d);assert.equal(g.state().stage,'carrying');
  const reloaded=g.reload();assert.deepEqual(copy(reloaded.state().dest),d);assert.equal(reloaded.state().stage,'carrying');
});

test('accepting an old offer after walking away does nothing',()=>{
  const g=game();g.meet();g.c.player.x=50;g.choose('Обещаю');
  assert.equal(g.state().stage,'offered');assert.equal(g.state().dest,undefined);
});

test('a superseded offer cannot accept after refusal and reopening the same stage',()=>{
  const g=game();g.meet();const old=g.c.SIT.card.choices[0];g.choose('Сейчас не');g.meet();old.run();
  assert.equal(g.state().stage,'offered');assert.equal(g.state().dest,undefined);
});

test('arrival alone, even exactly at the marker, never delivers the books',()=>{
  const g=game();g.accept();g.destination();g.tick();
  assert.equal(g.state().stage,'carrying');assert.equal(g.c.player.energy,60);
  assert.match(g.defs.neighbourStory.action().label,/Передать/);
});

for(const state of ['far','vehicle','bus','interior','hurt'])test(`delivery rejects ${state} on opening and rechecks it on confirmation`,()=>{
  const g=game();g.accept();g.destination();g.c.neighbourStoryDeliver();
  if(state==='far')g.c.player.x+=5;
  if(state==='vehicle')g.c.player.vehicle={kind:'taxi'};
  if(state==='bus')g.c.player.bus={};
  if(state==='interior'){g.c.scene='interior';g.c.player.inside=true;}
  if(state==='hurt')g.c.player.state='hurt';
  g.choose('Передать и помочь');assert.equal(g.state().stage,'carrying');assert.equal(g.c.player.energy,60);
  g.c.neighbourStoryDeliver();assert.equal(g.c.SIT.card,null);
});

test('low energy keeps the box and a later attempt works',()=>{
  const g=game();g.accept();g.destination();g.c.player.energy=5;
  g.c.neighbourStoryDeliver();g.choose('Передать и помочь');assert.equal(g.state().stage,'carrying');assert.equal(g.c.player.energy,5);
  g.c.player.energy=30;g.deliver();assert.equal(g.c.player.energy,24);
});

test('double confirmation cannot deliver twice or charge energy twice',()=>{
  const g=game();g.accept();g.destination();g.c.neighbourStoryDeliver();
  const choice=g.choose('Передать и помочь');choice.run();
  assert.equal(g.state().stage,'returning');assert.equal(g.c.player.energy,54);assert.equal(g.state().rewarded,undefined);
});

test('returning the box requires the neighbour physically present and permits restarting',()=>{
  const g=game();g.accept();g.meet();const old=g.c.SIT.card.choices.find(q=>q.t.includes('Вернуть коробку'));
  g.c.player.x=100;g.choose('Вернуть коробку');assert.equal(g.state().stage,'carrying');
  g.home();g.meet();g.choose('Вернуть коробку');assert.equal(g.state().stage,'declined');assert.equal(g.state().dest,undefined);
  assert.equal(g.c.player.rep,0);assert.match(g.c.neighbourStoryContext('fidania'),/вернул/);
  g.accept();old.run();assert.equal(g.state().stage,'carrying');
});

test('reload after delivery restores return objective, without giving a reward remotely',()=>{
  const g=game();g.accept();g.deliver();const r=g.reload();r.tick();
  assert.equal(r.state().stage,'returning');assert.equal(r.c.player.pantry,0);assert.equal(r.c.player.energy,54);
  assert.match(r.c.SIT.marks.get('neighbour:books').label,/Фидании/);
  r.c.neighbourStoryThank(r.w);assert.equal(r.c.SIT.card,null);
});

test('the complete story rewards once and remains complete after reload',()=>{
  const g=game();g.accept();g.deliver();g.home();g.meet();const choice=g.choose('Рассказать и принять');
  assert.equal(g.state().stage,'done');assert.equal(g.c.player.pantry,1);assert.equal(g.c.player.rep,1);assert.equal(g.c.player.mood,47);
  choice.run();g.meet();assert.equal(g.c.player.pantry,1);assert.equal(g.c.player.rep,1);
  const r=g.reload();r.home();r.meet();assert.equal(r.state().stage,'done');assert.equal(r.c.player.pantry,1);
  assert.equal(r.c.SIT.marks.has('neighbour:books'),false);assert.match(r.c.neighbourStoryContext('fidania'),/уже поблагодарила/);
});

test('thank-you confirmation rechecks proximity and does not reward after leaving',()=>{
  const g=game();g.accept();g.deliver();g.home();g.meet();g.c.player.x=100;g.choose('Рассказать и принять');
  assert.equal(g.state().stage,'returning');assert.equal(g.state().rewarded,undefined);assert.equal(g.c.player.pantry,0);
});

test('next-day reaction is personal, persisted and gives no second reward',()=>{
  const g=game();g.accept();g.deliver();g.finish();g.tick();assert.equal(g.state().reacted,undefined);
  g.c.clock.day++;g.c.player.x=100;g.tick();assert.equal(g.state().reacted,undefined);
  g.home();g.tick();assert.equal(g.state().reacted,1);const count=g.events.length;g.tick();assert.equal(g.events.length,count);
  assert.equal(g.c.player.pantry,1);assert.equal(g.c.player.rep,1);
  const r=g.reload();r.home();r.tick();assert.equal(r.events.length,0);assert.equal(r.state().reacted,1);
  assert.match(r.c.neighbourStoryContext('fidania'),/уже рассказала/);assert.equal(r.c.neighbourStoryContext('lenar'),'');
});

test('a genuine interior representation of Fidania works; a distant NPC does not',()=>{
  const g=game(),n={folk:'fidania',x:1,y:2,state:'idle',p:g.w.p};
  g.c.scene='interior';g.c.interior={npcs:[n]};g.c.player.inside=true;
  const action=g.defs.neighbourStory.actionInside();assert.ok(action);action.run();g.choose('Обещаю');
  assert.equal(g.state().stage,'carrying');g.c.interior.npcs=[];
  assert.equal(g.defs.neighbourStory.actionInside(),null);
});

test('repeated E does not accumulate story cards and long absence does not expire the promise',()=>{
  const g=game();g.meet();g.meet();g.meet();assert.equal(g.c.SIT.queue.length,0);
  g.choose('Обещаю');g.c.clock.day+=90;g.tick();assert.equal(g.state().stage,'carrying');
  g.deliver();g.finish();assert.equal(g.c.player.pantry,1);
});

test('reading an active personal card pauses a live route, and closing resumes the new schedule',()=>{
  const g=game();g.f.trip={to:'home'};g.w.state='walk';g.w.path=[0,1];g.w.folkLead={x:100,y:0};g.c.want='home';
  g.meet();assert.equal(g.c.SIT.card.participant,g.w);assert.equal(g.c.folkPersonBusy(g.f),true);
  assert.equal(g.f.trip,null);assert.equal(g.w.path,null);assert.equal(g.w.folkLead,null);assert.equal(g.w.state,'folkStay');
  g.c.updateFolk(1);assert.equal(g.resumed.length,0);assert.equal(g.w.keep,undefined);assert.equal(g.w.sitBy,undefined);
  g.choose('Обещаю');assert.equal(g.state().stage,'carrying');assert.equal(g.c.folkPersonBusy(g.f),false);
  g.c.updateFolk(1);assert.deepEqual(g.resumed,['home']);
});

test('closing the personal card without a choice also releases the resident',()=>{
  const g=game();g.meet();assert.equal(g.c.folkPersonBusy(g.f),true);
  g.clear();assert.equal(g.c.folkPersonBusy(g.f),false);g.c.updateFolk(1);assert.equal(g.resumed.length,1);
});

test('interior participant reserves the same persistent resident without requiring f.w',()=>{
  const g=game(),n={folk:'fidania',x:1,y:2,state:'idle',p:g.w.p};g.f.w=null;g.c.scene='interior';g.c.interior={npcs:[n]};g.c.player.inside=true;
  g.c.neighbourStoryMeet(n);assert.equal(g.c.SIT.card.participant,n);assert.equal(g.c.folkPersonBusy(g.f),true);
  g.c.want='yard';g.c.updateFolk(1);assert.equal(g.resumed.length,0);
  g.choose('Сейчас не');assert.equal(g.c.folkPersonBusy(g.f),false);
});

for(const role of ['guest','staff'])test(`interior refresh preserves the active story ${role} participant and its identity`,()=>{
  const g=game(),n={folk:'fidania',x:1,y:2,state:'idle',p:g.w.p,role};
  if(role==='guest')n.folkGuest=true;else n.origP={name:'Обычный сотрудник'};
  g.f.w=null;g.c.scene='interior';g.c.interior={npcs:[n],furn:[],key:'room',w:13,h:9};g.c.player.inside=true;
  g.c.neighbourStoryMeet(n);g.c.folkInterior(g.c.interior);
  assert.ok(g.c.interior.npcs.includes(n));assert.equal(n.folk,'fidania');assert.equal(n.p.name,'Фидания');
  g.choose('Обещаю');assert.equal(g.state().stage,'carrying');assert.equal(g.c.folkPersonBusy(g.f),false);
});

test('the remote journal and queued personal cards do not reserve a resident',()=>{
  const g=game();g.c.player.x=100;g.c.neighbourStoryOpen();assert.equal(g.c.folkPersonBusy(g.f),false);
  g.clear();g.home();g.c.SIT.card={title:'Другая ситуация'};g.meet();
  assert.equal(g.c.SIT.queue.length,1);assert.equal(g.c.folkPersonBusy(g.f),false);assert.equal(g.f.away,undefined);
});

test('public libraries outrank nearby technical collections while preserving their actual map names',()=>{
  const g=game();g.c.world.pois=[{t:'library',n:'Техническая железнодорожная библиотека',x:1000,y:0},{t:'library',n:'Детская городская библиотека №7',x:1040,y:0}];
  g.c.cityLandmarks=[{name:'Национальная библиотека',ll:[1100,0]}];g.accept();
  assert.equal(g.state().dest.n,'Детская городская библиотека №7');
});

test('a public-library landmark is preferred over a nearby technical collection',()=>{
  const g=game();g.c.world.pois=[{t:'library',n:'Техническая библиотека',x:1000,y:0}];g.c.cityLandmarks=[{name:'Национальная библиотека',ll:[1100,0]}];
  g.accept();assert.equal(g.state().dest.n,'Национальная библиотека');
});
