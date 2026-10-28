// Real Node server test; loopback only. Run against an isolated DATA_DIR, never production.
// node tools/tests/shared-venues-net.js http://127.0.0.1:8971
'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),crypto=require('node:crypto');
const WebSocket=require('ws'),VenueRoom=require('../../site/js/venue-room');
const url=new URL(process.argv[2]||'http://127.0.0.1:8971');
if(url.hostname!=='127.0.0.1'||url.protocol!=='http:')throw new Error('Use an isolated loopback test server');
const room=VenueRoom.key('cafe',{x:100,y:200},'Тестовое кафе'),other=VenueRoom.key('cafe',{x:102,y:200},'Другое кафе');
const pose=(r=room,x=4,y=5)=>({x:101,y:201,hx:0,hy:1,b:1,room:r,ix:x,iy:y,ihx:0,ihy:-1});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label){for(let i=0;i<60;i++){if(fn())return;await sleep(100);}throw new Error('Timed out: '+label);}
const clients=[],checks=[];
async function connect(name,p,id=crypto.randomBytes(8).toString('hex')){
  const c={id,view:new Map(),all:[],pid:null,errors:[]};clients.push(c);
  c.ws=new WebSocket(new URL('/ws',url).href.replace('http:','ws:'));
  c.ws.on('error',e=>c.errors.push(String(e)));
  c.ws.on('message',raw=>{const d=JSON.parse(raw);c.all.push(d);if(d.t==='hist')c.pid=d.pid;
    if(d.t==='w'){for(const [sid,pid,m] of d.m||[])c.view.set(sid,{...c.view.get(sid),pid,m});
      for(const p of d.p||[]){const e=c.view.get(p[0]);if(e)e.p=p;}for(const sid of d.g||[])c.view.delete(sid);}});
  await until(()=>c.ws.readyState===1,'connect '+name);c.ws.send(JSON.stringify({t:'hello',id,p:{...p,n:name}}));await until(()=>c.pid,'hello '+name);return c;
}
const guest=(c,pid)=>[...c.view.values()].find(p=>p.pid===pid);
const send=(c,p)=>c.ws.send(JSON.stringify({t:'p',...p}));
function post(body){return new Promise((resolve,reject)=>{const req=http.request(new URL('/api.php',url),{method:'POST',headers:{'Content-Type':'application/json'}},res=>{let text='';res.on('data',d=>text+=d);res.on('end',()=>{try{resolve(JSON.parse(text));}catch(e){reject(e);}});});req.on('error',reject);req.end(JSON.stringify(body));});}
(async()=>{
  try{
    const a=await connect('Алия',pose()),b=await connect('Руслан',pose()),c=await connect('Другое кафе',pose(other)),street=await connect('Улица',{x:101,y:201,b:0});
    await until(()=>guest(a,b.pid)&&guest(b,a.pid),'mutual room visibility');await sleep(350);
    assert.equal(a.view.size,1);assert.equal(c.view.size,0);assert.equal(street.view.size,0);checks.push('two guests see each other; adjacent venue and street isolated');
    send(b,{...pose(room,7.25,8.5),ihx:1,ihy:0});await until(()=>guest(a,b.pid)?.p[7]===725,'indoor movement');assert.equal(guest(a,b.pid).p[8],850);checks.push('indoor position and facing delivered while outdoor position stays fixed');
    b.ws.send(JSON.stringify({t:'m',m:{sy:{t:'Привет из кафе',i:1,room}}}));await until(()=>guest(a,b.pid)?.m.sy?.t==='Привет из кафе','near speech');
    assert.ok(!c.all.some(d=>JSON.stringify(d).includes('Привет из кафе')));assert.ok(!street.all.some(d=>JSON.stringify(d).includes('Привет из кафе')));checks.push('near speech remains inside its venue');
    b.ws.send(JSON.stringify({t:'msg',to:a.pid,text:'Личное сообщение'}));await until(()=>a.all.some(d=>d.t==='msg'&&d.m.t==='Личное сообщение'),'direct message');
    assert.ok(!c.all.some(d=>d.t==='msg'&&d.m.t==='Личное сообщение'));checks.push('existing direct messages work for room guests');
    const hid=crypto.randomBytes(8).toString('hex');let h=await post({a:'sync',id:hid,p:{...pose(),n:'HTTP'},out:[],since:0});
    assert.deepEqual(new Set(h.players.map(p=>p.id)),new Set([a.pid,b.pid]));assert.equal(h.players.find(p=>p.id===b.pid).p.ix,7.25);
    await until(()=>guest(a,h.pid),'HTTP guest in WS room');checks.push('HTTP fallback and WebSocket share the same room membership');
    h=await post({a:'sync',id:hid,p:{...pose(other),n:'HTTP'},out:[],since:0});assert.deepEqual(h.players.map(p=>p.id),[c.pid]);
    await until(()=>!guest(a,h.pid),'HTTP guest leaves room');checks.push('HTTP room switch removes the old membership');
    send(b,{x:101,y:201,b:0,hx:1,hy:0});await until(()=>!guest(a,b.pid)&&guest(street,b.pid),'exit room');assert.equal(guest(street,b.pid).m.sy,null);checks.push('exit removes indoor avatar and clears old room speech');
    send(b,pose(other));await until(()=>guest(c,b.pid)&&!guest(street,b.pid),'another room');checks.push('entering another cafe does not leave a street ghost');
    b.ws.close();await until(()=>!guest(c,b.pid),'disconnect');const again=await connect('Руслан',pose(),b.id);await until(()=>guest(a,again.pid),'reconnect');
    assert.equal([...a.view.values()].filter(p=>p.pid===again.pid).length,1);checks.push('disconnect and reconnect leave exactly one avatar');
    send(again,{...pose(),ix:1e30});await until(()=>!guest(a,again.pid),'invalid pose');checks.push('malformed coordinates cannot enter the room index');
    const old=await connect('Старый клиент',{x:101,y:201,b:0,hx:0,hy:1});await until(()=>guest(street,old.pid),'old protocol');checks.push('legacy street clients remain compatible');
    for(const c of clients)assert.equal(c.errors.length,0,c.errors.join('\n'));
    console.log(JSON.stringify({ok:true,checks:checks.length,results:checks},null,2));
  }finally{for(const c of clients)c.ws.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
