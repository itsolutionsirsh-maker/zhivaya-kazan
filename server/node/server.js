// «Живая Казань» — сервер для VPS.
// Раздаёт игру (deploy/kazan), держит онлайн по WebSocket (/ws), общий и личный чат,
// аккаунты «имя + PIN» с сохранением прогресса, прокси к ИИ (ключ только в /etc/zhivaya-kazan.env).
// Совместим с api.php: тот же /api.php?a=ping|sync|llm — старый клиент работает и здесь.
'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const {WebSocketServer}=require('ws');

const PORT=+process.env.PORT||8080;
const ROOT=path.resolve(process.env.GAME_DIR||path.join(__dirname,'../../deploy/kazan'));
const DATA=path.resolve(process.env.DATA_DIR||path.join(__dirname,'data'));
const LLM={key:process.env.LLM_API_KEY||'',base:(process.env.LLM_API_BASE||'https://api.openai.com/v1').replace(/\/+$/,''),model:process.env.LLM_MODEL||'gpt-4o-mini'};
fs.mkdirSync(DATA,{recursive:true});

const clean=(s,n)=>typeof s==='string'?s.replace(/[\x00-\x1F\x7F]/g,' ').trim().slice(0,n):'';
const idstr=s=>typeof s==='string'?s.toLowerCase().replace(/[^a-f0-9]/g,'').slice(0,32):'';
const now=()=>Date.now()/1000;
const log=(...a)=>console.log(new Date().toISOString(),...a);

// ---------- ограничение частоты ----------
const buckets=new Map();
function allow(key,limit,windowSec){const t=now();let b=buckets.get(key);if(!b){b=[];buckets.set(key,b);}while(b.length&&t-b[0]>windowSec)b.shift();if(b.length>=limit)return false;b.push(t);return true;}
setInterval(()=>{const t=now();for(const [k,b] of buckets){if(!b.length||t-b[b.length-1]>600)buckets.delete(k);}},60000).unref();

// ---------- аккаунты и сохранения ----------
const ACC_FILE=path.join(DATA,'accounts.json');
let accounts={};try{accounts=JSON.parse(fs.readFileSync(ACC_FILE,'utf8'));}catch(e){accounts={};}
let accDirty=false;
function flushAccounts(){if(!accDirty)return;accDirty=false;const tmp=ACC_FILE+'.tmp';fs.writeFileSync(tmp,JSON.stringify(accounts));fs.renameSync(tmp,ACC_FILE);}
setInterval(flushAccounts,3000).unref();
const hashPin=(pin,salt)=>crypto.scryptSync(pin,salt,32).toString('hex');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
function byToken(token){if(typeof token!=='string'||token.length<20)return null;const h=sha(token);for(const k in accounts)if(accounts[k].tok===h)return accounts[k];return null;}
function login(name,pin,ip){name=clean(name,24);pin=String(pin||'');if(name.length<2)return {err:'name'};if(!/^\d{4,8}$/.test(pin))return {err:'pin'};
  if(!allow('login:'+ip,10,60))return {err:'rate_limited'};const key=name.toLowerCase();let a=accounts[key];let created=false;
  if(!a){if(!allow('create:'+ip,5,3600))return {err:'rate_limited'};const salt=crypto.randomBytes(16).toString('hex');a=accounts[key]={name,salt,pin:hashPin(pin,salt),tok:'',state:null,profile:null,created:now(),updated:0,fails:0};created=true;}
  else{if(a.lockUntil&&a.lockUntil>now())return {err:'locked'};
    const ok=crypto.timingSafeEqual(Buffer.from(hashPin(pin,a.salt),'hex'),Buffer.from(a.pin,'hex'));
    if(!ok){a.fails=(a.fails||0)+1;if(a.fails>=8){a.lockUntil=now()+900;a.fails=0;}accDirty=true;return {err:'wrong_pin'};}a.fails=0;}
  const token=crypto.randomBytes(24).toString('hex');a.tok=sha(token);accDirty=true;return {ok:1,token,name:a.name,created,state:a.state,profile:a.profile,updated:a.updated};}
function saveFor(token,state,profile){const a=byToken(token);if(!a)return {err:'auth'};const s=JSON.stringify(state||null),p=JSON.stringify(profile||null);if(s.length>60000||p.length>12000)return {err:'too_big'};
  a.state=state||a.state;a.profile=profile||a.profile;a.updated=now();accDirty=true;return {ok:1,updated:a.updated};}

// ---------- онлайн (HTTP-опрос как в api.php и WebSocket) ----------
const players=new Map();   // id → {p, t, ws}
const msgs=[];let seq=0;
function addMsg(from,n,to,t){seq++;const m={i:seq,from,n,to:to||null,t,ts:Math.floor(now())};msgs.push(m);if(msgs.length>400)msgs.shift();return m;}
function cleanPresence(p){if(!p||typeof p!=='object')return null;if(JSON.stringify(p).length>6000)return null;const q=Object.assign({},p);q.n=clean(q.n||'Игрок',24)||'Игрок';delete q.m;return typeof q.x==='number'&&typeof q.y==='number'?q:null;}
setInterval(()=>{const t=now();for(const [id,v] of players)if(!v.ws&&t-v.t>15)players.delete(id);},5000).unref();

function apiSync(body){const id=idstr(body.id);if(id.length<8)return {err:'bad_id'};const p=cleanPresence(body.p);const t=now();
  const cur=players.get(id)||{};players.set(id,Object.assign(cur,{p:p||cur.p,t}));
  for(const m of (Array.isArray(body.out)?body.out:[]).slice(0,6)){if(!allow('msg:'+id,6,10))break;const text=clean(m&&m.t,240);if(!text)continue;const to=m.to?idstr(m.to):null;const n=p?p.n:'Игрок';const mm=addMsg(id,n,to,text);wsDeliver(mm);}
  const since=parseInt(body.since,10)||0;let mine=msgs.filter(m=>m.i>since&&(m.to===null||m.to===id||m.from===id));if(since===0)mine=mine.slice(-30);
  const list=[];for(const [k,v] of players)if(k!==id&&v.p)list.push({id:k,p:v.p});return {players:list,msgs:mine,seq};}

// ---------- ИИ ----------
async function apiLlm(body,ip){if(!LLM.key)return {err:'no_llm'};if(!allow('llm:'+ip,30,60))return {err:'rate_limited'};
  const ms=[];for(const m of (Array.isArray(body.messages)?body.messages:[]).slice(-16)){const c=clean(m&&m.content,6000);if(c)ms.push({role:m.role==='assistant'?'assistant':'user',content:c});}if(!ms.length)return {err:'empty'};
  const req={model:LLM.model,messages:ms,max_tokens:300,temperature:0.8};if(body.json)req.response_format={type:'json_object'};
  try{const ctl=new AbortController();const to=setTimeout(()=>ctl.abort(),40000);
    let r=await fetch(LLM.base+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+LLM.key},body:JSON.stringify(req),signal:ctl.signal});
    if(!r.ok&&body.json&&r.status===400){delete req.response_format;r=await fetch(LLM.base+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+LLM.key},body:JSON.stringify(req),signal:ctl.signal});}
    clearTimeout(to);const j=await r.json().catch(()=>null);const text=j&&j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content;
    if(!r.ok||typeof text!=='string')return {err:'upstream_error',code:r.status};return {text:text.trim()};}catch(e){return {err:'upstream_error'};}}

// ---------- HTTP ----------
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.webp':'image/webp','.txt':'text/plain; charset=utf-8'};
function send(res,code,obj){const b=JSON.stringify(obj);res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(b);}
function readBody(req,max){return new Promise((ok,bad)=>{let n=0;const ch=[];req.on('data',c=>{n+=c.length;if(n>max){bad(new Error('too_big'));req.destroy();}else ch.push(c);});req.on('end',()=>{try{ok(ch.length?JSON.parse(Buffer.concat(ch).toString('utf8')):{});}catch(e){ok({});}});req.on('error',bad);});}
function ipOf(req){return String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'x').split(',')[0].trim();}
const server=http.createServer(async(req,res)=>{
  const u=new URL(req.url,'http://x');const ip=ipOf(req);
  if(u.pathname==='/api.php'||u.pathname==='/api'){
    let body={};if(req.method==='POST'){try{body=await readBody(req,200000);}catch(e){return send(res,413,{err:'too_big'});}}
    const a=u.searchParams.get('a')||body.a||'';
    if(a==='ping')return send(res,200,{ok:1,llm:!!LLM.key,ws:true,acct:true,online:players.size});
    if(a==='sync')return send(res,200,apiSync(body));
    if(a==='llm')return send(res,200,await apiLlm(body,ip));
    if(a==='login')return send(res,200,login(body.name,body.pin,ip));
    if(a==='save')return send(res,200,saveFor(body.token,body.state,body.profile));
    if(a==='load'){const acc=byToken(body.token);return send(res,200,acc?{ok:1,name:acc.name,state:acc.state,profile:acc.profile,updated:acc.updated}:{err:'auth'});}
    return send(res,404,{err:'unknown_action'});}
  if(u.pathname==='/health')return send(res,200,{ok:1,online:players.size,uptime:Math.round(process.uptime())});
  // статика игры
  let rel=decodeURIComponent(u.pathname);if(rel.endsWith('/'))rel+='index.html';
  const file=path.join(ROOT,path.normalize(rel).replace(/^([/\\])+/,''));
  if(!file.startsWith(ROOT+path.sep)&&file!==ROOT)return send(res,403,{err:'forbidden'});
  const ext=path.extname(file).toLowerCase();if(ext==='.php'||file.includes(path.sep+'data'+path.sep))return send(res,404,{err:'not_found'});
  fs.stat(file,(err,st)=>{if(err||!st.isFile()){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});return res.end('Не найдено');}
    const cache=ext==='.html'?'no-cache':(ext==='.json'?'public, max-age=3600':'public, max-age=300');
    res.writeHead(200,{'Content-Type':MIME[ext]||'application/octet-stream','Content-Length':st.size,'Cache-Control':cache,'X-Content-Type-Options':'nosniff'});
    if(req.method==='HEAD')return res.end();fs.createReadStream(file).pipe(res);});});

// ---------- WebSocket ----------
const wss=new WebSocketServer({server,path:'/ws',maxPayload:16*1024});
function wsSend(ws,obj){if(ws&&ws.readyState===1)ws.send(JSON.stringify(obj));}
function wsDeliver(m){for(const [id,v] of players){if(!v.ws)continue;if(m.to===null||m.to===id||m.from===id)wsSend(v.ws,{t:'msg',m});}}
wss.on('connection',(ws,req)=>{const ip=ipOf(req);let me=null;ws.isAlive=true;ws.on('pong',()=>{ws.isAlive=true;});
  if(!allow('wsconn:'+ip,20,60)){ws.close(1008,'rate');return;}
  ws.on('message',raw=>{let d;try{d=JSON.parse(raw);}catch(e){return;}if(!d||typeof d!=='object')return;
    if(d.t==='hello'){const id=idstr(d.id);if(id.length<8)return ws.close(1008,'bad_id');me=id;const old=players.get(id);if(old&&old.ws&&old.ws!==ws)try{old.ws.close(4000,'replaced');}catch(e){}
      players.set(id,{p:cleanPresence(d.p),t:now(),ws});wsSend(ws,{t:'hist',msgs:msgs.filter(m=>m.to===null||m.to===id||m.from===id).slice(-30),seq});return;}
    if(!me)return;const v=players.get(me);if(!v)return;
    if(d.t==='p'){const p=cleanPresence(d.p);if(p){v.p=p;v.t=now();}return;}
    if(d.t==='msg'){if(!allow('msg:'+me,6,10))return wsSend(ws,{t:'err',e:'rate'});const text=clean(d.text,240);if(!text)return;const to=d.to?idstr(d.to):null;wsDeliver(addMsg(me,(v.p&&v.p.n)||'Игрок',to,text));return;}});
  ws.on('close',()=>{if(me){const v=players.get(me);if(v&&v.ws===ws)players.delete(me);}});});
// рассылка присутствия: соседей (до 800 м) 5 раз в секунду, остальных — раз в секунду
let tick=0;
setInterval(()=>{tick++;const all=[...players.entries()].filter(([,v])=>v.p);
  for(const [id,v] of players){if(!v.ws||v.ws.readyState!==1)continue;const me=v.p;const list=[];
    for(const [k,o] of all){if(k===id)continue;const near=!me||Math.abs(o.p.x-me.x)<800&&Math.abs(o.p.y-me.y)<800;if(near||tick%5===0)list.push({id:k,p:o.p});}
    if(list.length||tick%5===0)wsSend(v.ws,{t:'peers',list,full:tick%5===0});}},200).unref();
setInterval(()=>{for(const ws of wss.clients){if(!ws.isAlive){ws.terminate();continue;}ws.isAlive=false;try{ws.ping();}catch(e){}}},30000).unref();

server.listen(PORT,()=>log(`Живая Казань: http://localhost:${PORT} · игра из ${ROOT} · ИИ: ${LLM.key?LLM.model:'выключен'}`));
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>{flushAccounts();process.exit(0);});
