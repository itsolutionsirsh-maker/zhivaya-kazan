'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const VenueRoom=require('../../site/js/venue-room');
const room=VenueRoom.key('cafe',{x:100,y:200},'Кафе'),other=VenueRoom.key('cafe',{x:101,y:200},'Кафе');
const pose=(id=room,x=4,y=5)=>({x:101,y:201,b:1,room:id,ix:x,iy:y,ihx:0,ihy:-1});
function server(){
  let time=100;const timers=[],sent=[];
  const s={VenueRoom,Map,Set,Math,JSON,Number,now:()=>time,setInterval:fn=>{timers.push(fn);return {unref(){}};},
    VIEW_R:350,VIEW_K:80,VIEW_K_CROWD:50,NEAR_R:120,CELL:50,Mod:{clean:s=>s,name:s=>s},clean:(s,n)=>String(s).slice(0,n),modBlocked:()=>false,modMuted:()=>false,allow:()=>true,
    process:{hrtime:{bigint:()=>0n}},stats:{tickMs:0},wsSend:(p,m)=>sent.push({id:p.id,m:JSON.parse(JSON.stringify(m))})};
  vm.createContext(s);const source=read('server/node/server.js');
  vm.runInContext(source.slice(source.indexOf('const players=new Map()'),source.indexOf('// ---------- чат ----------')),s);
  vm.runInContext(source.slice(source.indexOf('let tick=0;const cand=[];'),source.indexOf('setInterval(()=>{for(const ws of wss.clients)')),s);
  const run=c=>vm.runInContext(c,s);
  return {s,run,sent,advance:n=>{time+=n;},tick:()=>timers[1](),add:(id,p)=>{const a=s.addPlayer(id,{readyState:1,close(){}});s.setPresence(a,p);return a;}};
}
function client(){
  let time=1000;const sent=[],heard=[];
  const s={VenueRoom,Map,Math,JSON,Number,scene:'interior',interior:{room,w:16,h:11},player:{x:101,y:201,ix:4,iy:5,ihx:0,ihy:-1,name:'Я',hx:0,hy:1,inside:true},peerRender:new Map(),HEAR_R:45,
    modIgnored:()=>false,modClean:s=>s,nearLine:(...a)=>heard.push(a),dist:Math.hypot,lerp:(a,b,k)=>a+(b-a)*k,performance:{now:()=>time},setNetStatus(){},syncPeers(list){s.lastPeers=list;},Net:{},
    myClothes:()=> '#123456',wornIds:()=>({}),saySent:null,outbox:[],sayCounter:0,pushPresence(){},playerLook:{}};
  s.dist=(x,y,a,b)=>Math.hypot(x-a,y-b);vm.createContext(s);
  vm.runInContext(read('site/js/shared-venues.js'),s);
  const net=read('site/js/net.js');vm.runInContext(net.slice(net.indexOf('function buildPresence()'),net.indexOf('function pushPresence()')),s);
  vm.runInContext("let wsSock={readyState:1,send:s=>sent.push(JSON.parse(s))},wsLastP=null,wsLastPush=0,wsLastMeta='';const wsPeers=new Map();",vm.createContext(Object.assign(s,{sent})));
  vm.runInContext(net.slice(net.indexOf('function wsPush()'),net.indexOf('function wsConnect()')),s);
  const talk=read('site/js/talk.js');vm.runInContext(talk.slice(talk.indexOf('function onPeerSay('),talk.indexOf('function updateSay(')),s);
  return {s,sent,heard,advance:n=>{time+=n;},run:c=>vm.runInContext(c,s)};
}
test('room identity uses venue coordinates and name, not player entrance or chunk index',()=>{
  assert.equal(room,VenueRoom.key('cafe',{x:100,y:200},' КАФЕ '));assert.notEqual(room,other);
  assert.notEqual(room,VenueRoom.key('cafe',{x:100,y:200},'Другое кафе'));
  assert.equal(VenueRoom.key('home',{x:100,y:200},'Квартира'),null);
  for(const kind of ['metro','prosecutor','constructor','__proto__'])assert.equal(VenueRoom.key(kind,{x:1,y:2},'x'),null);
});
test('untrusted room packets reject private rooms, oversized IDs, malformed and out-of-room coordinates',()=>{
  assert.ok(VenueRoom.read(pose()));
  for(const d of [{...pose(),b:0},{...pose(),room:'home'},{...pose(),room:'x'.repeat(100)},{...pose(),ix:NaN},{...pose(),iy:Infinity},{...pose(),ix:-1},{...pose(),ix:17},{...pose(),iy:13},{...pose(),ihx:'1'}])assert.equal(VenueRoom.read(d),null);
  assert.equal(VenueRoom.read({...pose(),ihx:500}).ihx,1);
});
test('same venue has its own nearby set; another cafe, street and private interiors stay out',()=>{
  const {s,add}=server(),a=add('a',pose()),b=add('b',pose()),c=add('c',pose(other)),street=add('s',{x:101,y:201,b:0}),home=add('h',{x:101,y:201,b:1});
  const out=[];s.nearest(a,350,80,out);assert.deepEqual(out.map(x=>x[1].id),['b']);
  s.nearest(street,350,80,out);assert.deepEqual(out.map(x=>x[1].id),['h']);
  assert.ok(b.room&&c.room);assert.equal(home.room,null);
});
test('room guests stay discoverable beyond the street radius, including large entrances',()=>{
  const {s,add}=server(),a=add('a',pose()),b=add('b',{...pose(),x:900,y:1000});const out=[];s.nearest(a,350,80,out);assert.equal(out[0][1],b);
});
test('moving between rooms, exiting and disconnecting remove memberships and empty indexes',()=>{
  const {s,run,add}=server(),a=add('a',pose()),b=add('b',pose());s.setPresence(b,pose(other));const out=[];
  s.nearest(a,350,80,out);assert.equal(out.length,0);s.setPresence(b,{x:101,y:201,b:0,room:null});assert.equal(b.room,null);
  s.delPlayer(a);s.delPlayer(b);assert.equal(run('venueMembers.size'),0);assert.equal(run('players.size'),0);assert.equal(run('coarse.size'),0);
});
test('stationary outdoor coordinates still broadcast indoor walking and turns',()=>{
  const {s,add,tick,sent}=server(),a=add('a',pose()),b=add('b',pose());tick();sent.length=0;
  s.setPresence(b,{...pose(room,6,7),ihx:1,ihy:0});tick();const m=sent.find(x=>x.id==='a').m;
  assert.equal(m.p[0][6],room);assert.deepEqual(m.p[0].slice(7),[600,700,100,0]);assert.ok(a.view.has(b.sid));
});
test('leaving the room emits gone and never exposes its old speech on the street',()=>{
  const {s,add,tick,sent}=server(),a=add('a',pose()),b=add('b',pose());
  s.setPresence(b,{sy:{t:'Внутри',i:1,room}});tick();sent.length=0;s.setPresence(b,{x:101,y:201,b:0});tick();
  assert.equal(sent.find(x=>x.id==='a').m.g[0],b.sid);assert.equal(s.visibleMeta(b).sy,null);
});
test('room speech is moderated, location-bound, rate-limited and expires for late arrivals',()=>{
  const {s,add,advance}=server(),a=add('a',pose());
  s.setPresence(a,{sy:{t:'Привет',i:1,room:other}});assert.equal(a.meta.sy,null);
  s.setPresence(a,{sy:{t:'Привет',i:2,room}});assert.equal(s.visibleMeta(a).sy.t,'Привет');advance(7);assert.equal(s.visibleMeta(a).sy,null);
  s.setPresence(a,{sy:{t:'Привет',i:2,room}});assert.equal(s.visibleMeta(a).sy,null);
  s.modMuted=()=>true;s.setPresence(a,{sy:{t:'x',i:3,room}});assert.equal(a.meta.sy,null);
  s.modMuted=()=>false;s.allow=()=>false;s.setPresence(a,{sy:{t:'x',i:4,room}});assert.equal(a.meta.sy,null);
});
test('an old client remains street-compatible and can leave a previously shared room',()=>{
  const {s,add}=server(),a=add('a',pose());s.setPresence(a,{x:200,y:300,b:0,hx:1,hy:0});assert.equal(a.room,null);
  const packet=s.positionPacket(a);assert.deepEqual(Array.from(packet.slice(1,6)),[2000,3000,100,0,0]);
});
test('crowds inside a room are bounded by the configured view limit',()=>{
  const {s,add}=server(),a=add('a',pose());for(let i=0;i<120;i++)add('b'+i,pose(room,1+i/20,2));
  const out=[];assert.equal(s.nearest(a,350,80,out),120);assert.equal(out.length,80);
});
test('client sends movement and speech without having to move outdoors',()=>{
  const {s,sent,advance}=client();s.wsPush();sent.length=0;advance(200);s.player.ix=6;s.wsPush();
  assert.equal(sent[0].t,'p');assert.equal(sent[0].ix,6);sent.length=0;advance(200);s.saySent={t:'Привет',i:1,room};s.wsPush();
  assert.equal(sent[0].t,'m');assert.equal(sent[0].m.sy.t,'Привет');
});
test('stationary clients keep the heartbeat, but do not send every frame',()=>{
  const {s,sent,advance}=client();s.wsPush();sent.length=0;advance(200);s.wsPush();assert.equal(sent.length,0);advance(3000);s.wsPush();assert.equal(sent[0].t,'p');
});
test('new and old wire packets decode; leaving resets the old room',()=>{
  const {s,run}=client();s.wsApply({m:[[1,'friend',{n:'Друг'}]],p:[[1,1000,2000,0,100,1,room,450,550,0,-100]]});
  assert.equal(s.lastPeers[0].presence.ix,4.5);assert.equal(s.lastPeers[0].presence.room,room);
  s.wsApply({p:[[1,1000,2000,0,100,0]]});assert.equal(s.lastPeers[0].presence.room,null);
  s.wsApply({g:[1]});assert.equal(s.lastPeers.length,0);assert.equal(run('wsPeers.size'),0);
});
test('interior interpolation resets on room changes and ignores invalid poses',()=>{
  const {s}=client(),pr={key:'friend'};s.syncSharedPeer(pr,pose());assert.equal(pr.ix,4);
  s.syncSharedPeer(pr,pose(room,5,6));s.tickSharedPeer(pr);assert.ok(pr.ix>4&&pr.ix<5);
  s.syncSharedPeer(pr,pose(other,10,7));assert.equal(pr.ix,10);assert.equal(s.sharedPeerHere(pr),false);
  s.syncSharedPeer(pr,{...pose(),ix:Infinity});assert.equal(pr.room,null);
});
test('nearby speech cannot cross rooms, the street, or private homes',()=>{
  const {s,heard}=client(),pr={key:'f',name:'Друг',room,b:1,x:101,y:201};
  s.onPeerSay(pr,{t:'Привет',i:1,room});assert.equal(heard.length,1);
  s.onPeerSay(pr,{t:'Повтор',i:1,room});assert.equal(heard.length,1);
  s.onPeerSay({...pr,room:other},{t:'Чужое кафе',i:2,room:other});assert.equal(heard.length,1);
  s.scene='city';s.onPeerSay(pr,{t:'Внутри',i:3,room});assert.equal(heard.length,1);
  s.onPeerSay({...pr,b:0,room:null},{t:'Улица',i:4,room:null});assert.equal(heard.length,2);
  s.scene='interior';s.interior.room=null;s.onPeerSay({...pr,b:0,room:null},{t:'За стеной',i:5,room:null});assert.equal(heard.length,2);
});
test('ignore and target selection apply only to visible guests in the same venue',()=>{
  const {s}=client();s.peerRender.set('a',{key:'a',room,ix:4,iy:5});s.peerRender.set('b',{key:'b',room:other,ix:4,iy:5});
  assert.equal(s.sharedPeerAt(4,5,1).key,'a');s.modIgnored=k=>k==='a';assert.equal(s.sharedPeerAt(4,5,1),null);
});
test('crowded phone labels are bounded, remain on screen, and do not cover each other',()=>{
  const {s}=client(),labels=[];s.W=390;s.clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  s.ctx={save(){},restore(){},measureText:n=>({width:n.length*7})};s.labelPlayer=(x,y,name)=>labels.push({x,y,w:name.length*7+18});
  for(let i=0;i<80;i++)s.peerRender.set('p'+i,{key:'p'+i,room,ix:1+(i%10)*1.4,iy:2+Math.floor(i/10),name:'Длинное имя игрока '+i});
  s.drawSharedLabels({ox:25,oy:250,iz:20});assert.ok(labels.length>0&&labels.length<=6);
  for(let i=0;i<labels.length;i++){const a=labels[i];assert.ok(a.x-a.w/2>=0&&a.x+a.w/2<=390);
    for(const b of labels.slice(i+1))assert.ok(Math.abs(a.x-b.x)>=(a.w+b.w)/2+3||Math.abs(a.y-b.y)>=29);}
});
