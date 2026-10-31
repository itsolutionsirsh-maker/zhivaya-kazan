// Записки на лавочках. Одна на скамейку, 80 знаков, неделя, без мата и ссылок.
'use strict';
function Benches(o){
  o=o||{};
  const fs=o.fs, file=o.file, now=o.now||Date.now, bad=o.bad||(()=>false);
  const last=new Map();
  let db={notes:[]};
  function load(){if(!file||!fs)return;try{const j=JSON.parse(fs.readFileSync(file,'utf8'));if(j&&Array.isArray(j.notes))db=j;}catch(e){}}
  function flush(){if(!file||!fs)return;fs.writeFileSync(file+'.tmp',JSON.stringify(db));fs.renameSync(file+'.tmp',file);}
  load();
  function fresh(){const cut=now()-7*86400e3;const n=db.notes.filter(x=>x&&x.at>cut);if(n.length!==db.notes.length){db.notes=n;flush();}}
  function list(ids){
    fresh();
    const want=Array.isArray(ids)?ids.filter(id=>/^b:-?\d+:-?\d+$/.test(String(id))).slice(0,12):[];
    const set=new Set(want);
    return db.notes.filter(x=>set.has(x.id)).map(x=>({id:x.id,text:x.text,name:x.name,at:x.at}));
  }
  function put(k,name,id,text){
    id=String(id||'');text=String(text||'').replace(/[\x00-\x1F\x7F]/g,' ').trim().slice(0,80);name=String(name||'Кто-то').replace(/[\x00-\x1F\x7F]/g,' ').trim().slice(0,24)||'Кто-то';
    if(!k||!/^b:-?\d+:-?\d+$/.test(id))return {err:'bad'};
    if(text.length<2)return {err:'short'};
    if(bad(text))return {err:'mod'};
    const day=new Date(now()).toISOString().slice(0,10);
    const b=last.get(k)||{t:0,n:0,day};
    if(b.day!==day){b.n=0;b.day=day;}
    if(now()-b.t<90e3)return {err:'rate'};
    if(b.n>=20)return {err:'rate'};
    fresh();
    const row={id,text,name,at:now(),k};
    const i=db.notes.findIndex(x=>x.id===id);
    if(i>=0)db.notes[i]=row;else db.notes.push(row);
    if(db.notes.length>800)db.notes=db.notes.slice(-800);
    b.t=now();b.n++;last.set(k,b);flush();
    return {ok:1,note:{id,text,name,at:row.at}};
  }
  return {list,put};
}
module.exports={Benches};
