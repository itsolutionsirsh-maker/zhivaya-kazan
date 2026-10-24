// «Живая Казань» — сервер для VPS.
// Раздаёт игру (deploy/kazan), держит онлайн по WebSocket (/ws), общий и личный чат,
// аккаунты «имя + PIN» с сохранением прогресса (SQLite), прокси к ИИ с лимитами (ключ только в /etc/zhivaya-kazan.env).
// Совместим с api.php: тот же /api.php?a=ping|sync|llm — старый клиент работает и здесь.
//
// Масштаб: каждому игроку уходят только соседи — сетка 50 м, радиус 350 м, не больше VIEW_K ближайших;
// имя/одежда/аватар — один раз при появлении, дальше только координаты тех, кто сдвинулся;
// остальная толпа — счётчиками по клеткам 10 м (клиент рисует её точками). Поэтому трафик растёт
// с числом соседей, а не с числом игроков на сервере.
'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const {WebSocketServer}=require('ws');

const ENV=process.env;
const PORT=+ENV.PORT||8080;
const ROOT=path.resolve(ENV.GAME_DIR||path.join(__dirname,'../../deploy/kazan'));
const DATA=path.resolve(ENV.DATA_DIR||path.join(__dirname,'data'));
const LLM={key:ENV.LLM_API_KEY||'',base:(ENV.LLM_API_BASE||'https://api.openai.com/v1').replace(/\/+$/,''),model:ENV.LLM_MODEL||'gpt-4o-mini',
  maxTokens:+ENV.LLM_MAX_TOKENS||160,perPlayerDay:+ENV.LLM_PER_PLAYER_DAY||60,perDay:+ENV.LLM_DAILY_LIMIT||20000};
const VIEW_R=+ENV.VIEW_RADIUS||350, VIEW_K=+ENV.VIEW_K||80, VIEW_K_CROWD=+ENV.VIEW_K_CROWD||50, NEAR_R=120, CELL=50;
fs.mkdirSync(DATA,{recursive:true});

const clean=(s,n)=>typeof s==='string'?s.replace(/[\x00-\x1F\x7F]/g,' ').trim().slice(0,n):'';
// фильтр мата, ссылок и телефонов — тот же файл, что в игре
const Mod=(()=>{try{return require(path.join(__dirname,'../../site/js/modcore.js'));}catch(e){return {clean:s=>s,name:(n,f)=>n||f,bad:()=>false};}})();
const idstr=s=>typeof s==='string'?s.toLowerCase().replace(/[^a-f0-9]/g,'').slice(0,32):'';
const now=()=>Date.now()/1000;
const log=(...a)=>console.log(new Date().toISOString(),...a);
const day=()=>new Date().toISOString().slice(0,10);

// ---------- ограничение частоты ----------
const buckets=new Map();
function allow(key,limit,windowSec){const t=now();let b=buckets.get(key);if(!b){b=[];buckets.set(key,b);}while(b.length&&t-b[0]>windowSec)b.shift();if(b.length>=limit)return false;b.push(t);return true;}
setInterval(()=>{const t=now();for(const [k,b] of buckets){if(!b.length||t-b[b.length-1]>600)buckets.delete(k);}},60000).unref();

// ---------- хранилище аккаунтов: SQLite (Node 22+), иначе JSON ----------
const store=(()=>{let sqlite=null;try{process.removeAllListeners('warning');sqlite=require('node:sqlite');}catch(e){}
  if(sqlite){const db=new sqlite.DatabaseSync(path.join(DATA,'game.db'));db.exec('PRAGMA journal_mode=WAL;PRAGMA synchronous=NORMAL;');
    db.exec('CREATE TABLE IF NOT EXISTS accounts(k TEXT PRIMARY KEY,name TEXT,salt TEXT,pin TEXT,tok TEXT,state TEXT,profile TEXT,created REAL,updated REAL,fails INTEGER DEFAULT 0,lock_until REAL DEFAULT 0);CREATE INDEX IF NOT EXISTS acc_tok ON accounts(tok);CREATE TABLE IF NOT EXISTS tokens(tok TEXT PRIMARY KEY,k TEXT,t REAL);CREATE TABLE IF NOT EXISTS tgmap(id TEXT PRIMARY KEY,k TEXT);');
    for(const c of ['tg TEXT','city TEXT','refBy TEXT','invites TEXT'])try{db.exec('ALTER TABLE accounts ADD COLUMN '+c);}catch(e){}
    const q={get:db.prepare('SELECT * FROM accounts WHERE k=?'),byTok:db.prepare('SELECT * FROM accounts WHERE tok=?'),ins:db.prepare('INSERT INTO accounts(k,name,salt,pin,tok,created,updated) VALUES(?,?,?,?,?,?,0)'),
      tok:db.prepare('UPDATE accounts SET tok=?,fails=0 WHERE k=?'),fail:db.prepare('UPDATE accounts SET fails=?,lock_until=? WHERE k=?'),save:db.prepare('UPDATE accounts SET state=?,profile=?,city=?,updated=? WHERE k=?'),count:db.prepare('SELECT COUNT(*) n FROM accounts'),
      tokIns:db.prepare('INSERT OR REPLACE INTO tokens(tok,k,t) VALUES(?,?,?)'),tokGet:db.prepare('SELECT k FROM tokens WHERE tok=?'),tokOld:db.prepare('DELETE FROM tokens WHERE k=? AND tok NOT IN (SELECT tok FROM tokens WHERE k=? ORDER BY t DESC LIMIT 8)'),
      tgGet:db.prepare('SELECT k FROM tgmap WHERE id=?'),tgSet:db.prepare('INSERT OR REPLACE INTO tgmap(id,k) VALUES(?,?)'),setTg:db.prepare('UPDATE accounts SET tg=? WHERE k=?'),setRef:db.prepare('UPDATE accounts SET refBy=? WHERE k=?'),setInv:db.prepare('UPDATE accounts SET invites=? WHERE k=?'),insTg:db.prepare('INSERT INTO accounts(k,name,salt,pin,tok,created,updated,tg) VALUES(?,?,\'\',\'\',\'\',?,0,?)')};
    const row=r=>r&&Object.assign({},r,{state:r.state?JSON.parse(r.state):null,profile:r.profile?JSON.parse(r.profile):null,city:r.city?JSON.parse(r.city):null,invites:r.invites?JSON.parse(r.invites):[]});
    return {kind:'sqlite',get:k=>row(q.get.get(k)),byTok:t=>{const m=q.tokGet.get(t);return m?row(q.get.get(m.k)):row(q.byTok.get(t));},
      addTok:(k,t)=>{q.tokIns.run(t,k,now());q.tokOld.run(k,k);},tgGet:id=>{const m=q.tgGet.get(id);return m?m.k:null;},tgSet:(id,k)=>{q.tgSet.run(id,k);q.setTg.run(id,k);},setRef:(k,r)=>q.setRef.run(r,k),setInvites:(k,l)=>q.setInv.run(JSON.stringify(l||[]),k),createTg:(k,name,id)=>q.insTg.run(k,name,now(),id),create:(k,name,salt,pin,tok)=>q.ins.run(k,name,salt,pin,tok,now()),setTok:(k,t)=>q.tok.run(t,k),
      setFail:(k,f,l)=>q.fail.run(f,l,k),save:(k,s,p,c)=>q.save.run(JSON.stringify(s),JSON.stringify(p),JSON.stringify(c??null),now(),k),count:()=>q.count.get().n};}
  const F=path.join(DATA,'accounts.json');let acc={};try{acc=JSON.parse(fs.readFileSync(F,'utf8'));}catch(e){}let dirty=false;
  setInterval(()=>{if(!dirty)return;dirty=false;fs.writeFileSync(F+'.tmp',JSON.stringify(acc));fs.renameSync(F+'.tmp',F);},3000).unref();
  return {kind:'json',get:k=>acc[k]||null,byTok:t=>Object.values(acc).find(a=>a.tok===t||(a.toks||[]).includes(t))||null,
    addTok:(k,t)=>{const a=acc[k];a.toks=[t].concat(a.toks||[]).slice(0,8);dirty=true;},tgGet:id=>{const a=Object.values(acc).find(x=>x.tg===id&&x.k!=='tg:'+id)||acc['tg:'+id];return a?a.k:null;},tgSet:(id,k)=>{acc[k].tg=id;dirty=true;},setRef:(k,r)=>{acc[k].refBy=r;dirty=true;},setInvites:(k,l)=>{acc[k].invites=l||[];dirty=true;},
    createTg:(k,name,id)=>{acc[k]={k,name,salt:'',pin:'',tok:'',tg:id,state:null,profile:null,city:null,created:now(),updated:0,fails:0,lock_until:0};dirty=true;},create:(k,name,salt,pin,tok)=>{acc[k]={k,name,salt,pin,tok,state:null,profile:null,created:now(),updated:0,fails:0,lock_until:0};dirty=true;},
    setTok:(k,t)=>{acc[k].tok=t;acc[k].fails=0;dirty=true;},setFail:(k,f,l)=>{acc[k].fails=f;acc[k].lock_until=l;dirty=true;},save:(k,s,p,c)=>{acc[k].state=s;acc[k].profile=p;acc[k].city=c??null;acc[k].updated=now();dirty=true;},count:()=>Object.keys(acc).length};})();
const hashPin=(pin,salt)=>crypto.scryptSync(pin,salt,32).toString('hex');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
function login(name,pin,ip){name=clean(name,24);pin=String(pin||'');if(name.length<2)return {err:'name'};if(!/^\d{4,8}$/.test(pin))return {err:'pin'};
  if(!allow('login:'+ip,10,60))return {err:'rate_limited'};const k=name.toLowerCase();let a=store.get(k);let created=false;const token=crypto.randomBytes(24).toString('hex');
  if(!a){if(!allow('create:'+ip,5,3600))return {err:'rate_limited'};const salt=crypto.randomBytes(16).toString('hex');store.create(k,name,salt,hashPin(pin,salt),sha(token));store.addTok(k,sha(token));return {ok:1,token,name,created:true,state:null,profile:null};}
  if(a.lock_until&&a.lock_until>now())return {err:'locked'};
  if(!crypto.timingSafeEqual(Buffer.from(hashPin(pin,a.salt),'hex'),Buffer.from(a.pin,'hex'))){const f=(a.fails||0)+1;store.setFail(k,f>=8?0:f,f>=8?now()+900:0);return {err:'wrong_pin'};}
  store.addTok(k,sha(token));return {ok:1,token,name:a.name,created,state:a.state,profile:a.profile,city:a.city,updated:a.updated};}
function accByToken(token){return typeof token==='string'&&token.length>=20?store.byTok(sha(token)):null;}
function saveFor(token,state,profile,city){const a=accByToken(token);if(!a)return {err:'auth'};const s=JSON.stringify(state||null),p=JSON.stringify(profile||null),c=JSON.stringify(city||null);if(s.length>150000||p.length>12000||c.length>60000)return {err:'too_big'};
  if(!allow('save:'+a.k,30,60))return {err:'rate_limited'};store.save(a.k,state||a.state,profile||a.profile,city||a.city);return {ok:1};}
function accOut(a,extra){return Object.assign({ok:1,name:a.name,tg:!!a.tg,state:a.state,profile:a.profile,city:a.city||null,updated:a.updated},extra||{});}
// мини-приложение Телеги: initData подписан ботом, проверяем HMAC-SHA256 (ключ — HMAC «WebAppData» от токена бота)
const TG_TOKEN=ENV.TG_BOT_TOKEN||'';
function tgVerify(initData){if(typeof initData!=='string'||initData.length>4096||!TG_TOKEN)return null;let sp;try{sp=new URLSearchParams(initData);}catch(e){return null;}
  const hash=sp.get('hash');if(!hash)return null;const pairs=[];for(const [k,v] of sp)if(k!=='hash')pairs.push([k,v]);
  const secret=crypto.createHmac('sha256','WebAppData').update(TG_TOKEN).digest();
  const ok=[pairs,pairs.filter(([k])=>k!=='signature')].some(set=>{const dcs=set.slice().sort((x,y)=>x[0]<y[0]?-1:x[0]>y[0]?1:0).map(([k,v])=>k+'='+v).join('\n');const h=crypto.createHmac('sha256',secret).update(dcs).digest('hex');return h.length===hash.length&&crypto.timingSafeEqual(Buffer.from(h),Buffer.from(hash.toLowerCase()));});
  if(!ok)return null;if(now()-(+sp.get('auth_date')||0)>86400)return null;let u=null;try{u=JSON.parse(sp.get('user')||'');}catch(e){}if(!u||!u.id)return null;
  return {id:String(Math.trunc(+u.id)),name:clean(((u.first_name||'')+' '+(u.last_name||'')).trim(),24)||'Игрок',start:clean(sp.get('start_param')||'',64)};}
function tgLogin(initData,ip){if(!TG_TOKEN)return {err:'no_tg'};if(!allow('tg:'+ip,30,60))return {err:'rate_limited'};const u=tgVerify(initData);if(!u)return {err:'tg_bad'};
  let k=store.tgGet(u.id)||('tg:'+u.id);let a=store.get(k);let created=false,invitedBy=null;
  if(!a){store.createTg(k,u.name,u.id);created=true;
    // новый игрок пришёл по ссылке друга: ref_<id Телеги друга>
    const m=/^ref_(\d{3,15})$/.exec(u.start);
    if(m&&m[1]!==u.id){const ik=store.tgGet(m[1])||('tg:'+m[1]);const inv=store.get(ik);
      if(inv){store.setRef(k,ik);invitedBy=inv.name;store.setInvites(ik,(inv.invites||[]).concat([{name:u.name,t:Math.floor(now())}]).slice(-20));}}
    a=store.get(k);}
  const invites=a.invites||[];if(invites.length&&!created)store.setInvites(k,[]);   // кто пришёл по ссылке этого игрока, пока он не заходил
  const token=crypto.randomBytes(24).toString('hex');store.addTok(k,sha(token));return accOut(a,{token,created,tgName:u.name,start:u.start,invitedBy,invites});}
// бот: на /start отвечаем прямо в ответе на вебхук — серверу не нужно самому ходить в api.telegram.org
const PUBLIC_URL=ENV.PUBLIC_URL?ENV.PUBLIC_URL.replace(/\/*$/,'/'):'';
const tgSecret=()=>sha('wh:'+TG_TOKEN).slice(0,40);
function tgWebhook(req,body){const got=String(req.headers['x-telegram-bot-api-secret-token']||''),want=tgSecret();
  if(!TG_TOKEN||got.length!==want.length||!crypto.timingSafeEqual(Buffer.from(got),Buffer.from(want)))return [403,{err:'forbidden'}];
  const msg=body&&body.message;const text=msg&&typeof msg.text==='string'?msg.text:'';
  if(!msg||!msg.chat||msg.chat.id==null||!/^\/(start|play|help)\b/.test(text))return [200,{ok:1}];
  const url=PUBLIC_URL||('https://'+String(req.headers.host||'').replace(/[^a-z0-9.:-]/gi,'')+'/');const name=clean((msg.from&&msg.from.first_name)||'',40);
  return [200,{method:'sendMessage',chat_id:msg.chat.id,
    text:(name?name+', добро':'Добро')+' пожаловать в «Живую Казань»!\n\nНастоящий центр Казани: Баумана, Кремль, метро, кафе. Жители живут своей жизнью, вы — своей: работа, квартира, банк, знакомства. Все игроки — в одном городе.\n\nЖмите «Играть» 👇',
    reply_markup:{inline_keyboard:[[{text:'▶️ Играть',web_app:{url}}]]}}];}
// при запуске: вебхук на этот сервер и кнопка меню бота на эту игру; не вышло — повтор через 10 минут
async function tgSetup(){if(!TG_TOKEN||!PUBLIC_URL)return;
  const call=(m,p)=>fetch(`https://api.telegram.org/bot${TG_TOKEN}/${m}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p),signal:AbortSignal.timeout(10000)}).then(r=>r.json());
  try{const w=await call('setWebhook',{url:PUBLIC_URL+'api.php?a=tgwebhook',secret_token:tgSecret(),allowed_updates:['message'],drop_pending_updates:true});
    if(w&&w.ok){await call('setChatMenuButton',{menu_button:{type:'web_app',text:'Играть',web_app:{url:PUBLIC_URL}}}).catch(()=>null);log('Телега: вебхук и кнопка меню →',PUBLIC_URL);return;}
    log('Телега: вебхук не поставился:',w&&w.description);}catch(e){log('Телега: нет связи с api.telegram.org:',e.message);}
  setTimeout(tgSetup,600000).unref();}
function tgLink(token,name,pin,ip){const cur=accByToken(token);if(!cur||!cur.tg)return {err:'auth'};name=clean(name,24);const k=name.toLowerCase();const a=store.get(k);if(!a)return {err:'no_account'};
  const r=login(name,pin,ip);if(r.err)return r;store.tgSet(cur.tg,k);return Object.assign(r,{linked:true});}
function resetFor(token){const a=accByToken(token);if(!a)return {err:'auth'};store.save(a.k,null,a.profile,null);return {ok:1};}

// ---------- игроки онлайн ----------
// p = {sid,id,x,y,hx,hy,b,meta,metaV,ws,t,cell,view:Map(sid→{v,x,y}),http}
const players=new Map();let nextSid=1;const bySid=new Map();
// две сетки: крупная (50 м) — быстро понять, сколько людей вокруг; мелкая (10 м) — найти ближайших в толпе и посчитать её по клеткам
const CF=10;const coarse=new Map(),fine=new Map();const gkey=(cx,cy)=>(cx+5000)*20000+(cy+5000);
function gridMove(p){const ck=gkey(Math.floor(p.x/CELL),Math.floor(p.y/CELL)),fk=gkey(Math.floor(p.x/CF),Math.floor(p.y/CF));if(p.cell===ck&&p.fcell===fk)return;gridDel(p);
  p.cell=ck;p.fcell=fk;let c=coarse.get(ck);if(!c){c={set:new Set(),fine:new Map()};coarse.set(ck,c);}c.set.add(p);c.fine.set(fk,(c.fine.get(fk)||0)+1);
  let f=fine.get(fk);if(!f){f=new Set();fine.set(fk,f);}f.add(p);}
function gridDel(p){if(p.cell==null)return;const c=coarse.get(p.cell);if(c){c.set.delete(p);const n=(c.fine.get(p.fcell)||1)-1;if(n>0)c.fine.set(p.fcell,n);else c.fine.delete(p.fcell);if(!c.set.size)coarse.delete(p.cell);}
  const f=fine.get(p.fcell);if(f){f.delete(p);if(!f.size)fine.delete(p.fcell);}p.cell=null;p.fcell=null;}
function around(x,y,R,cb){const c0=Math.floor((x-R)/CELL),c1=Math.floor((x+R)/CELL),r0=Math.floor((y-R)/CELL),r1=Math.floor((y+R)/CELL);for(let cx=c0;cx<=c1;cx++)for(let cy=r0;cy<=r1;cy++){const c=coarse.get(gkey(cx,cy));if(c)for(const p of c.set)cb(p);}}
// ближайшие соседи: в редком месте — все в радиусе; в толпе — по кольцам мелкой сетки, пока не наберётся K
function nearest(p,R,K,out){out.length=0;const c0=Math.floor((p.x-R)/CELL),c1=Math.floor((p.x+R)/CELL),r0=Math.floor((p.y-R)/CELL),r1=Math.floor((p.y+R)/CELL);let total=0;
  for(let cx=c0;cx<=c1;cx++)for(let cy=r0;cy<=r1;cy++){const c=coarse.get(gkey(cx,cy));if(c)total+=c.set.size;}
  const add=o=>{if(o===p)return;const d=Math.hypot(o.x-p.x,o.y-p.y);if(d<=R)out.push([d,o]);};
  if(total<=K*2){around(p.x,p.y,R,add);}
  else{const fx=Math.floor(p.x/CF),fy=Math.floor(p.y/CF),maxR=Math.ceil(R/CF);
    for(let r=0;r<=maxR;r++){for(let dx=-r;dx<=r;dx++){const st=(Math.abs(dx)===r)?1:2*r;for(let dy=-r;dy<=r;dy+=st){const f=fine.get(gkey(fx+dx,fy+dy));if(f)for(const o of f)add(o);}}if(out.length>=K)break;}}
  if(out.length>K){out.sort((a,b)=>a[0]-b[0]);out.length=K;}return total;}
// толпа: сколько людей в каждой клетке 10 м в радиусе R (клиент сам вычтет тех, кого видит)
function crowdCells(p,R){const res=[];const c0=Math.floor((p.x-R)/CELL),c1=Math.floor((p.x+R)/CELL),r0=Math.floor((p.y-R)/CELL),r1=Math.floor((p.y+R)/CELL);
  for(let cx=c0;cx<=c1;cx++)for(let cy=r0;cy<=r1;cy++){const c=coarse.get(gkey(cx,cy));if(!c)continue;for(const [fk,n] of c.fine){res.push([Math.floor(fk/20000)-5000,fk%20000-5000,n]);if(res.length>=800)return res;}}return res;}
const META_KEYS=['n','r','c','v','vc','sy','g','a'];
function setPresence(p,d){if(!d||typeof d!=='object')return;
  if(typeof d.x==='number'&&typeof d.y==='number'&&isFinite(d.x)&&isFinite(d.y)){p.x=Math.max(-5000,Math.min(5000,d.x));p.y=Math.max(-5000,Math.min(5000,d.y));p.hx=+d.hx||0;p.hy=+d.hy||0;p.b=d.b?1:0;gridMove(p);}
  const m={};let has=false;for(const k of META_KEYS)if(k in d){m[k]=d[k];has=true;}
  if(has){if(typeof m.n==='string')m.n=Mod.name(clean(m.n,24),'Игрок');
    if(m.sy&&typeof m.sy==='object'){if(modBlocked(p))m.sy=null;else if(typeof m.sy.t==='string')m.sy={t:Mod.clean(clean(m.sy.t,140)),i:+m.sy.i||0};}
    if(m.g&&typeof m.g==='object'&&typeof m.g.t==='string')m.g=Object.assign({},m.g,{t:Mod.clean(clean(m.g.t,60))});if(typeof m.a==='string'&&(m.a.length>2600||!m.a.startsWith('data:image/')))delete m.a;const s=JSON.stringify(m);if(s.length<=4000&&s!==p.metaS){p.meta=Object.assign(p.meta||{},m);p.metaS=s;p.metaV++;}}
  p.t=now();}
function addPlayer(id,ws){let p=players.get(id);if(p){if(p.ws&&ws&&p.ws!==ws)try{p.ws.close(4000,'replaced');}catch(e){}p.ws=ws||p.ws;return p;}
  p={sid:nextSid++,id,x:0,y:0,hx:0,hy:1,b:0,meta:{n:'Игрок'},metaS:'',metaV:1,ws,t:now(),cell:null,view:new Map(),crowdT:0};players.set(id,p);bySid.set(p.sid,p);return p;}
function delPlayer(p){players.delete(p.id);bySid.delete(p.sid);gridDel(p);}
setInterval(()=>{const t=now();for(const p of players.values())if(!p.ws&&t-p.t>15)delPlayer(p);},5000).unref();

// ---------- чат ----------
const msgs=[];let seq=0;let cityRate=[];
function addMsg(from,n,to,t,x,y){seq++;const m={i:seq,from,n,to:to||null,t,ts:Math.floor(now()),x,y};msgs.push(m);if(msgs.length>400)msgs.shift();return m;}
function cityLimited(){const t=now();cityRate=cityRate.filter(x=>t-x<1);if(cityRate.length>=8)return true;cityRate.push(t);return false;}
// при большом онлайне «Город» слышат в радиусе 1,5 км (район), иначе — все
function deliver(m){const big=players.size>1000;const out={t:'msg',m:{i:m.i,from:m.from,n:m.n,to:m.to,t:m.t,ts:m.ts}};const s=JSON.stringify(out);
  if(m.to){for(const id of [m.to,m.from]){const p=players.get(id);if(p&&p.ws&&p.ws.readyState===1)p.ws.send(s);}return;}
  for(const p of players.values()){if(!p.ws||p.ws.readyState!==1)continue;if(big&&p.id!==m.from&&Math.hypot(p.x-m.x,p.y-m.y)>1500)continue;p.ws.send(s);}}
function postMsg(p,toRaw,textRaw){if(!allow('msg:'+p.id,6,10))return 'rate';if(modBlocked(p))return 'banned';const text=Mod.clean(clean(textRaw,240));if(!text)return null;const to=toRaw?idstr(toRaw):null;
  if(!to&&modMuted(p))return 'muted';if(text===p.lastMsg&&now()-(p.lastMsgT||0)<20)return 'dup';p.lastMsg=text;p.lastMsgT=now();
  if(!to&&players.size>300&&!allow('city:'+p.id,1,3))return 'rate';if(!to&&cityLimited())return 'busy';deliver(addMsg(p.id,(p.meta&&p.meta.n)||'Игрок',to,text,p.x,p.y));return null;}

// ---------- модерация: жалобы, временное отключение чата, баны ----------
// Жалобы пишутся в DATA/reports.jsonl. Три жалобы от разных игроков за час — общий чат нарушителю отключается на час.
// Модератор (Иршат) — через a=mod с ключом MOD_TOKEN из /etc/zhivaya-kazan.env: список жалоб, бан и снятие бана.
const MODF=path.join(DATA,'mod.json');let modState={bans:{},ipbans:{}};try{modState=Object.assign(modState,JSON.parse(fs.readFileSync(MODF,'utf8')));}catch(e){}
const mutes=new Map(),repRecent=new Map();
function modSave(){try{fs.writeFileSync(MODF+'.tmp',JSON.stringify(modState));fs.renameSync(MODF+'.tmp',MODF);}catch(e){}}
function modBlocked(p){const t=now();const b=modState.bans[p.id];if(b&&(!b.until||b.until>t))return true;const ib=p.ip&&modState.ipbans[p.ip];return !!(ib&&(!ib.until||ib.until>t));}
function modMuted(p){const u=mutes.get(p.id);if(u&&u>now())return true;if(u)mutes.delete(p.id);return false;}
function modReport(body,ip){const from=idstr(body.id),target=idstr(body.target);if(target.length<8||from===target)return {err:'bad_target'};if(!allow('rep:'+ip,10,3600))return {err:'rate_limited'};
  const tp=players.get(target);const rec={t:Math.floor(now()),from,ip,target,targetIp:tp&&tp.ip||null,name:clean(body.name,24),kind:clean(body.kind,10)||'chat',text:clean(body.text,240)};
  try{fs.appendFileSync(path.join(DATA,'reports.jsonl'),JSON.stringify(rec)+'\n');}catch(e){}
  const t=now();const list=(repRecent.get(target)||[]).filter(r=>t-r.t<3600);if(!list.some(r=>r.from===from||r.ip===ip))list.push({from,ip,t});repRecent.set(target,list);
  if(list.length>=3&&!modMuted({id:target})){mutes.set(target,t+3600);log('Модерация: общий чат отключён на час для',target,rec.name);}
  return {ok:1};}
function modAdmin(req,body){const key=String(ENV.MOD_TOKEN||'');const got=String(req.headers['x-mod-token']||body.token||'');
  if(key.length<16||got.length!==key.length||!crypto.timingSafeEqual(Buffer.from(got),Buffer.from(key)))return {err:'forbidden'};
  const t=now();const target=idstr(body.target||'');const act=String(body.do||'list');
  if(act==='ban'&&target.length>=8){const h=Math.max(0,+body.hours||0);const until=h?t+h*3600:0;const pl=players.get(target);modState.bans[target]={until,why:clean(body.why,120),t:Math.floor(t)};
    if(pl&&pl.ip&&body.ip!==false)modState.ipbans[pl.ip]={until,id:target};modSave();return {ok:1,banned:target,until};}
  if(act==='unban'&&target.length>=8){delete modState.bans[target];for(const [ip,b] of Object.entries(modState.ipbans))if(b.id===target)delete modState.ipbans[ip];mutes.delete(target);modSave();return {ok:1};}
  if(act==='mute'&&target.length>=8){mutes.set(target,t+Math.max(1,+body.minutes||60)*60);return {ok:1};}
  let reports=[];try{reports=fs.readFileSync(path.join(DATA,'reports.jsonl'),'utf8').trim().split('\n').slice(-100).map(l=>{try{return JSON.parse(l);}catch(e){return null;}}).filter(Boolean).reverse();}catch(e){}
  const online=[...players.values()].map(p=>({id:p.id,n:(p.meta&&p.meta.n)||'Игрок'}));
  return {ok:1,reports,bans:modState.bans,ipbans:Object.keys(modState.ipbans).length,mutes:[...mutes].filter(([,u])=>u>t).map(([id,u])=>({id,until:Math.floor(u)})),online};}

// ---------- совместимость с api.php (опрос раз в 0,8 с — для старых клиентов и малого онлайна) ----------
function apiSync(body,ip){const id=idstr(body.id);if(id.length<8)return {err:'bad_id'};const p=addPlayer(id,null);p.http=true;p.ip=ip;setPresence(p,body.p);
  for(const m of (Array.isArray(body.out)?body.out:[]).slice(0,6))postMsg(p,m&&m.to,m&&m.t);
  const since=parseInt(body.since,10)||0;let mine=msgs.filter(m=>m.i>since&&(m.to===null||m.to===id||m.from===id)).map(m=>({i:m.i,from:m.from,n:m.n,to:m.to,t:m.t,ts:m.ts}));if(since===0)mine=mine.slice(-30);
  const list=[];around(p.x,p.y,VIEW_R,o=>{if(o!==p&&list.length<VIEW_K)list.push({id:o.id,p:Object.assign({},o.meta,{x:o.x,y:o.y,hx:o.hx,hy:o.hy,b:o.b})});});
  return {players:list,msgs:mine,seq,online:players.size};}

// ---------- ИИ: лимит на игрока в день и общий лимит в день ----------
const llmDay={d:day(),total:0,per:new Map()};
function llmQuota(who){const d=day();if(llmDay.d!==d){llmDay.d=d;llmDay.total=0;llmDay.per.clear();}if(llmDay.total>=LLM.perDay)return 'budget';const n=llmDay.per.get(who)||0;if(n>=LLM.perPlayerDay)return 'quota';llmDay.per.set(who,n+1);llmDay.total++;return null;}
async function apiLlm(body,ip){if(!LLM.key)return {err:'no_llm'};if(!allow('llm:'+ip,30,60))return {err:'rate_limited'};const who=idstr(body.id)||ip;const q=llmQuota(who);if(q)return {err:q};
  const ms=[];for(const m of (Array.isArray(body.messages)?body.messages:[]).slice(-12)){const c=clean(m&&m.content,4000);if(c)ms.push({role:m.role==='assistant'?'assistant':'user',content:c});}if(!ms.length)return {err:'empty'};
  const req={model:LLM.model,messages:ms,max_tokens:LLM.maxTokens,temperature:0.8};if(body.json)req.response_format={type:'json_object'};
  const call=()=>{const ctl=new AbortController();const to=setTimeout(()=>ctl.abort(),30000);return fetch(LLM.base+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+LLM.key},body:JSON.stringify(req),signal:ctl.signal}).finally(()=>clearTimeout(to));};
  try{let r=await call();if(!r.ok&&body.json&&r.status===400){delete req.response_format;r=await call();}
    const j=await r.json().catch(()=>null);const text=j&&j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content;
    if(!r.ok||typeof text!=='string')return {err:'upstream_error',code:r.status};return {text:text.trim()};}catch(e){return {err:'upstream_error'};}}

// ---------- HTTP ----------
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.webp':'image/webp','.txt':'text/plain; charset=utf-8'};
function send(res,code,obj){const b=JSON.stringify(obj);res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(b);}
function readBody(req,max){return new Promise((ok,bad)=>{let n=0;const ch=[];req.on('data',c=>{n+=c.length;if(n>max){bad(new Error('too_big'));req.destroy();}else ch.push(c);});req.on('end',()=>{try{ok(ch.length?JSON.parse(Buffer.concat(ch).toString('utf8')):{});}catch(e){ok({});}});req.on('error',bad);});}
function ipOf(req){return String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'x').split(',')[0].trim();}
const stats={bytesOut:0,msgsOut:0,tickMs:0,since:now()};
const server=http.createServer(async(req,res)=>{
  const u=new URL(req.url,'http://x');const ip=ipOf(req);
  if(u.pathname==='/api.php'||u.pathname==='/api'){
    let body={};if(req.method==='POST'){try{body=await readBody(req,200000);}catch(e){return send(res,413,{err:'too_big'});}}
    const a=u.searchParams.get('a')||body.a||'';
    if(a==='ping')return send(res,200,{ok:1,llm:!!LLM.key,ws:true,acct:true,tg:!!TG_TOKEN,online:players.size});
    if(a==='sync')return send(res,200,apiSync(body,ip));
    if(a==='report')return send(res,200,modReport(body,ip));
    if(a==='mod')return send(res,200,modAdmin(req,body));
    if(a==='llm')return send(res,200,await apiLlm(body,ip));
    if(a==='login')return send(res,200,login(body.name,body.pin,ip));
    if(a==='save')return send(res,200,saveFor(body.token,body.state,body.profile,body.city));
    if(a==='load'){const acc=accByToken(body.token);if(!acc)return send(res,200,{err:'auth'});const inv=acc.invites||[];if(inv.length)store.setInvites(acc.k,[]);return send(res,200,accOut(acc,{invites:inv}));}
    if(a==='tgwebhook'){const [code,obj]=tgWebhook(req,body);return send(res,code,obj);}
    if(a==='reset')return send(res,200,resetFor(body.token));
    if(a==='tglogin')return send(res,200,tgLogin(body.initData,ip));
    if(a==='tglink')return send(res,200,tgLink(body.token,body.name,body.pin,ip));
    return send(res,404,{err:'unknown_action'});}
  if(u.pathname==='/health'){const dt=Math.max(1,now()-stats.since);return send(res,200,{ok:1,online:players.size,accounts:store.count(),store:store.kind,outKBs:Math.round(stats.bytesOut/dt/1024),msgsPerS:Math.round(stats.msgsOut/dt),tickMs:+stats.tickMs.toFixed(2),llmToday:llmDay.total,uptime:Math.round(process.uptime())});}
  let rel;try{rel=decodeURIComponent(u.pathname);}catch(e){return send(res,400,{err:'bad_path'});}if(rel.endsWith('/'))rel+='index.html';
  const file=path.join(ROOT,path.normalize(rel).replace(/^([/\\])+/,''));
  if(!file.startsWith(ROOT+path.sep))return send(res,403,{err:'forbidden'});
  const ext=path.extname(file).toLowerCase();if(ext==='.php'||file.includes(path.sep+'data'+path.sep))return send(res,404,{err:'not_found'});
  fs.stat(file,(err,st)=>{if(err||!st.isFile()){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});return res.end('Не найдено');}
    const cache=ext==='.html'?'no-cache':(ext==='.json'?'public, max-age=3600':'public, max-age=300');
    res.writeHead(200,{'Content-Type':MIME[ext]||'application/octet-stream','Content-Length':st.size,'Cache-Control':cache,'X-Content-Type-Options':'nosniff'});
    if(req.method==='HEAD')return res.end();fs.createReadStream(file).pipe(res);});});

// ---------- WebSocket ----------
const wss=new WebSocketServer({server,path:'/ws',maxPayload:16*1024,perMessageDeflate:false});
function wsSend(p,obj){const ws=p.ws;if(!ws||ws.readyState!==1||ws.bufferedAmount>256*1024)return;const s=JSON.stringify(obj);stats.bytesOut+=s.length;stats.msgsOut++;ws.send(s);}
wss.on('connection',(ws,req)=>{const ip=ipOf(req);let me=null;ws.isAlive=true;ws.on('pong',()=>{ws.isAlive=true;});
  if(!allow('wsconn:'+ip,ENV.WS_CONN_PER_MIN?+ENV.WS_CONN_PER_MIN:20,60)){ws.close(1008,'rate');return;}
  ws.on('message',raw=>{let d;try{d=JSON.parse(raw);}catch(e){return;}if(!d||typeof d!=='object')return;
    if(d.t==='hello'){const id=idstr(d.id);if(id.length<8)return ws.close(1008,'bad_id');me=addPlayer(id,ws);me.ip=ip;me.view.clear();setPresence(me,d.p);
      wsSend(me,{t:'hist',msgs:msgs.filter(m=>m.to===id||m.from===id||(m.to===null&&(players.size<=1000||Math.hypot(me.x-m.x,me.y-m.y)<1500))).slice(-30).map(m=>({i:m.i,from:m.from,n:m.n,to:m.to,t:m.t})),seq,you:me.sid});return;}
    if(!me)return;
    if(d.t==='p'){setPresence(me,d);return;}           // координаты: {t:'p',x,y,hx,hy,b} — часто
    if(d.t==='m'){setPresence(me,d.m);return;}         // имя, одежда, фраза, аватар — только когда изменились
    if(d.t==='msg'){const e=postMsg(me,d.to,d.text);if(e)wsSend(me,{t:'err',e});return;}});
  ws.on('close',()=>{if(me&&me.ws===ws){me.ws=null;delPlayer(me);}});});

// рассылка мира: каждые 200 мс; ближние (до 120 м) — каждый раз, дальние — через раз; только сдвинувшиеся
let tick=0;const cand=[];
setInterval(()=>{const t0=process.hrtime.bigint();tick++;
  for(const p of players.values()){if(!p.ws||p.ws.readyState!==1)continue;
    // в плотной толпе — меньше соседей и вдвое реже (2,5 раза в секунду): иначе площадь на тысячи человек съест процессор
    if(p.dense&&(tick+p.sid)%2)continue;
    const total=nearest(p,VIEW_R,p.dense?VIEW_K_CROWD:VIEW_K,cand);p.dense=total>VIEW_K*3;const shown=new Set();const pos=[],meta=[],gone=[];
    for(const [d,o] of cand){shown.add(o.sid);const v=p.view.get(o.sid);
      if(!v||v.v!==o.metaV)meta.push([o.sid,o.id,o.meta]);
      const far=d>NEAR_R;if(!v||Math.abs(v.x-o.x)>0.05||Math.abs(v.y-o.y)>0.05||v.b!==o.b){if(!v||!far||tick%2===0){pos.push([o.sid,Math.round(o.x*10),Math.round(o.y*10),Math.round(o.hx*100),Math.round(o.hy*100),o.b]);p.view.set(o.sid,{v:o.metaV,x:o.x,y:o.y,b:o.b});continue;}}
      if(!v||v.v!==o.metaV)p.view.set(o.sid,Object.assign(v||{x:NaN,y:NaN,b:-1},{v:o.metaV}));}
    for(const sid of p.view.keys())if(!shown.has(sid)){gone.push(sid);p.view.delete(sid);}
    const msg={t:'w'};let any=false;if(pos.length){msg.p=pos;any=true;}if(meta.length){msg.m=meta;any=true;}if(gone.length){msg.g=gone;any=true;}
    if(tick%10===p.sid%10){msg.n=players.size;any=true;if(total>VIEW_K){msg.c=crowdCells(p,200);}else if(p.hadCrowd){msg.c=[];}p.hadCrowd=total>VIEW_K;}
    if(any)wsSend(p,msg);}
  stats.tickMs=stats.tickMs*0.9+Number(process.hrtime.bigint()-t0)/1e6*0.1;},200).unref();
setInterval(()=>{for(const ws of wss.clients){if(!ws.isAlive){ws.terminate();continue;}ws.isAlive=false;try{ws.ping();}catch(e){}}},30000).unref();
setInterval(()=>{stats.bytesOut=0;stats.msgsOut=0;stats.since=now();},60000).unref();

server.listen(PORT,()=>{log(`Живая Казань: http://localhost:${PORT} · игра из ${ROOT} · аккаунты: ${store.kind} · ИИ: ${LLM.key?LLM.model+' (лимит '+LLM.perPlayerDay+'/игрок/день, '+LLM.perDay+'/день)':'выключен'} · Телега: ${TG_TOKEN?'да':'нет'}`);tgSetup();});
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>process.exit(0));
