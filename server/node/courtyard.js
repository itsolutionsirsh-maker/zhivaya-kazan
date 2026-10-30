'use strict';
const crypto=require('node:crypto'),D=require('../../site/js/courtyard-data');
const copy=x=>JSON.parse(JSON.stringify(x)),day=t=>new Date(t+10800000).toISOString().slice(0,10);
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const fresh=()=>({rev:0,epochs:[0,0,0],done:{},claims:{},accounts:{},moderator:[],audit:[]});
function sqliteBackend(db){
  db.exec('CREATE TABLE IF NOT EXISTS courtyard(id INTEGER PRIMARY KEY CHECK(id=1),state TEXT NOT NULL)');
  const get=db.prepare('SELECT state FROM courtyard WHERE id=1'),put=db.prepare('INSERT INTO courtyard VALUES(1,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state');
  return {load:()=>{const r=get.get();return r?JSON.parse(r.state):fresh();},save:s=>put.run(JSON.stringify(s)),tx:fn=>{
    db.exec('BEGIN IMMEDIATE');try{const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}
  }};
}
function jsonBackend(file,fs){
  let state=fs&&file&&fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):fresh();
  return {load:()=>copy(state),save:s=>{if(file&&fs){fs.writeFileSync(file+'.tmp',JSON.stringify(s));if(fs.existsSync(file))fs.copyFileSync(file,file+'.bak');fs.renameSync(file+'.tmp',file);}state=copy(s);},tx:fn=>fn()};
}
function Courtyard(be,opt={}){
  const now=opt.now||Date.now,L={...D.limits,...opt.limits},key=k=>hash('courtyard:'+k),stageOf=t=>D.yard.steps.findIndex(s=>s.tasks.some((_,i)=>s.id+':'+i===t));
  const pose=(cid,ip)=>{const p=opt.presence(cid);return p&&p.priv===cid&&p.ip===ip&&!opt.blocked(p)&&Number.isFinite(p.positionAt)&&now()-p.positionAt*1000<15000?p:null;};
  function near(p){const q=D.point(opt.meta());return !!(q&&p&&!p.b&&!p.room&&!p.meta?.v&&Math.hypot(p.x-q.x,p.y-q.y)<=L.radius);}
  function prune(s){for(const [k,w] of Object.entries(s.claims))if(w.until<=now()||!near(pose(w.cid,w.ip)))delete s.claims[k];}
  function account(s,k){const a=s.accounts[k]||(s.accounts[k]={day:'',count:0,starts:0,requests:[]});if(a.day!==day(now())){a.day=day(now());a.count=0;a.starts=0;}return a;}
  function snapshot(s,k,cid){
    const a=k&&s.accounts[k],w=k&&s.claims[k],contributors={};
    for(const d of Object.values(s.done)){const c=contributors[d.by]||(contributors[d.by]={name:d.name,count:0,mine:d.by===k});c.count++;}
    return {version:1,rev:s.rev,epochs:s.epochs,done:Object.fromEntries(Object.entries(s.done).map(([t,d])=>[t,{at:d.at}])),
      busy:Object.entries(s.claims).map(([who,c])=>({task:c.task,name:c.name,mine:who===k})),contributors:Object.values(contributors),
      me:{work:w?{task:w.task,token:w.token,readyAt:w.readyAt,until:w.until,here:w.cid===cid}:null,
        today:a&&a.day===day(now())?a.count:0,starts:a&&a.day===day(now())?a.starts:0,limit:L.daily},now:now()};
  }
  function read(k,cid){const s=be.load();prune(s);return snapshot(s,k?key(k):null,cid);}
  function act(acc,cid,ip,b){return be.tx(()=>{
    const s=be.load(),k=key(acc.k);prune(s);const a=account(s,k),reply=err=>({ok:err?0:1,...(err?{err}:{}),state:snapshot(s,k,cid)});
    if(!/^[a-f0-9]{24,40}$/.test(b.request||''))return reply('request');
    const sig=hash(JSON.stringify([b.op,b.task??null,b.epoch??null,b.work??null]));
    const old=a.requests.find(r=>r.id===b.request);if(old)return old.sig===sig?{...reply(),replayed:true}:reply('request_reused');
    if(!['start','finish','cancel'].includes(b.op))return reply('op');
    const p=pose(cid,ip);if(!p||p.acc&&p.acc.k!==acc.k)return reply('presence');
    const w=s.claims[k];
    if(b.op==='cancel'){
      if(w&&(w.cid!==cid||w.token!==b.work))return reply('work');if(w)delete s.claims[k];
    }else if(!near(p))return reply('place');
    else if(b.op==='start'){
      const stage=stageOf(b.task),next=D.yard.steps.findIndex(st=>st.tasks.some((_,i)=>!s.done[st.id+':'+i]));
      if(stage<0||stage!==next||s.done[b.task])return reply('task');
      if(b.epoch!==s.epochs[stage])return reply('changed');
      if(a.count>=L.daily)return reply('daily');if(a.starts>=L.starts)return reply('starts');
      if(w)return reply('active');if(Object.values(s.claims).some(c=>c.task===b.task))return reply('occupied');
      a.starts++;s.claims[k]={task:b.task,epoch:b.epoch,token:crypto.randomBytes(16).toString('hex'),cid,ip,name:opt.name(acc,p),readyAt:now()+L.workMs,until:now()+L.leaseMs};
    }else{
      if(!w||w.token!==b.work||w.cid!==cid)return reply('work');
      if(now()<w.readyAt)return reply('wait');if(a.count>=L.daily)return reply('daily');
      if(s.done[w.task]||w.epoch!==s.epochs[stageOf(w.task)])return reply('changed');
      s.done[w.task]={at:now(),by:k,name:w.name};a.count++;delete s.claims[k];
    }
    s.rev++;a.requests.push({id:b.request,sig});a.requests=a.requests.slice(-64);be.save(s);return reply();
  });}
  function moderate(b){return be.tx(()=>{
    const s=be.load();prune(s);const reply=err=>({ok:err?0:1,...(err?{err}:{}),state:snapshot(s),audit:s.audit});
    if(b.op==='modStatus')return reply();
    if(b.op!=='rollback'||!/^[a-f0-9]{24,40}$/.test(b.request||''))return reply('request');
    const reason=typeof b.reason==='string'?b.reason.trim().slice(0,160):'',i=D.yard.steps.findIndex(st=>st.id===b.stage);
    const sig=hash(JSON.stringify([b.stage,b.rev,reason])),old=s.moderator.find(r=>r.id===b.request);
    if(old)return old.sig===sig?{...reply(),replayed:true}:reply('request_reused');
    if(i<0||reason.length<3)return reply('reason');if(b.rev!==s.rev)return reply('changed');
    let removed=0;for(let j=i;j<D.yard.steps.length;j++){s.epochs[j]++;for(let n=0;n<3;n++){const task=D.yard.steps[j].id+':'+n;if(s.done[task]){delete s.done[task];removed++;}}}
    // All active work is invalidated; old finish tokens cannot restore a rollback.
    s.claims={};s.rev++;s.audit.unshift({at:now(),stage:b.stage,reason,removed});s.audit=s.audit.slice(0,30);
    s.moderator.push({id:b.request,sig});s.moderator=s.moderator.slice(-64);be.save(s);return reply();
  });}
  // аккаунт удалён по просьбе игрока (privacy.html): его вклад остаётся во дворе, но без имени и без связи с аккаунтом
  function forget(k){return be.tx(()=>{const s=be.load(),h=key(k);let n=0;if(s.accounts[h]){delete s.accounts[h];n++;}if(s.claims[h]){delete s.claims[h];n++;}
    for(const d of Object.values(s.done))if(d.by===h){d.by='deleted';d.name='Сосед';n++;}if(n){s.rev++;be.save(s);}return n;});}
  function restart(){be.tx(()=>{const s=be.load();if(Object.keys(s.claims).length){s.claims={};s.rev++;be.save(s);}});}
  return {read,act,moderate,restart,forget};
}
// HTTP/auth/rate limiting stay here; server.js only supplies existing dependencies and routes.
function create(o){
  const yard=Courtyard(o.db?sqliteBackend(o.db):jsonBackend(o.file,o.fs),o);yard.restart();
  function handle(req,b,ip){
    if(req.method!=='POST'&&req.method!=='GET')return [405,{err:'method'}];
    if(!o.allow('courtyard-ip:'+ip,180,60))return [429,{err:'rate_limited'}];
    try{
      if(req.method==='GET')return [200,{ok:1,state:yard.read()}];
      if(b.op==='modStatus'||b.op==='rollback'){
        const got=String(req.headers['x-mod-token']||''),want=o.modToken();
        const x=Buffer.from(got),y=Buffer.from(want||'');if(!want||x.length!==y.length||!crypto.timingSafeEqual(x,y))return [403,{err:'forbidden'}];
        return [200,yard.moderate(b)];
      }
      const a=o.auth(b.token);if(!a)return [401,{err:'auth'}];
      if(!o.allow('courtyard:'+a.k,60,60))return [429,{err:'rate_limited'}];
      const cid=typeof b.id==='string'&&/^[a-f0-9]{8,32}$/.test(b.id)?b.id:'';
      if(b.op==='status')return [200,{ok:1,state:yard.read(a.k,cid)}];
      return [200,yard.act(a,cid,ip,b)];
    }catch(e){o.log('общий двор: запись не выполнена',e.message);return [503,{err:'busy'}];}
  }
  return {handle,forget:k=>yard.forget(k)};
}
module.exports={Courtyard,sqliteBackend,jsonBackend,create};
