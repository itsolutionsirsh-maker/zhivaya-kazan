// ===== Модерация в игре: фильтр мата и ссылок, «скрыть игрока», «пожаловаться» =====
// Фильтр (ModCore) тот же, что на сервере. Здесь — всё, что видит и делает игрок.
const MOD={ignore:new Map(),lastSent:'',lastT:0,reported:new Map()};
try{for(const [k,v] of JSON.parse(localStorage.getItem('zk.ignore')||'[]'))MOD.ignore.set(k,v);}catch(e){}
function modSaveIgnore(){try{localStorage.setItem('zk.ignore',JSON.stringify([...MOD.ignore].slice(-200)));}catch(e){}}
function modClean(t){t=String(t==null?'':t);return window.ModCore?ModCore.clean(t):t;}
function modName(n){n=String(n==null?'':n).slice(0,24);return window.ModCore?ModCore.name(n,'Игрок'):(n||'Игрок');}
function modIgnored(k){return !!k&&k!=='me'&&MOD.ignore.has(k);}
function modIgnore(k,name){if(!k||k==='me')return;MOD.ignore.set(k,modName(name));modSaveIgnore();addEvent(`Игрок «${modName(name)}» скрыт: его сообщения и реплики вам больше не видны. Вернуть — в меню ☰ → «Скрытые игроки»`);if(typeof renderChat==='function')renderChat();}
function modUnignore(k){MOD.ignore.delete(k);modSaveIgnore();if(typeof renderChat==='function')renderChat();}
// своё сообщение: чистим и не даём слать одно и то же подряд
function modOutgoing(t){t=modClean(String(t||'').trim()).slice(0,240);if(!t)return null;const now=Date.now();
  if(t===MOD.lastSent&&now-MOD.lastT<20000){setHint('Это сообщение вы только что отправили');return null;}MOD.lastSent=t;MOD.lastT=now;return t;}
// жалоба уходит на сервер: там несколько жалоб от разных людей на час отключают нарушителю общий чат, а модератор видит список
async function modReport(k,name,text,kind){if(!k||k==='me')return;const t=MOD.reported.get(k)||0;if(Date.now()-t<10*60000){setHint('Жалоба на этого игрока уже отправлена');return;}MOD.reported.set(k,Date.now());
  try{await fetch('api.php?a=report',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',
    body:JSON.stringify({a:'report',id:(typeof myCid!=='undefined'?myCid:''),target:k,name:modName(name),text:String(text||'').slice(0,240),kind:kind||'chat'})});}catch(e){}
  addEvent(`Жалоба на «${modName(name)}» отправлена. Спасибо — модератор посмотрит`);}
// меню у имени в чате: скрыть или пожаловаться
function modMenu(anchor,k,name,text,kind){document.querySelectorAll('.mod-menu').forEach(m=>m.remove());if(!k||k==='me')return;
  const m=document.createElement('div');m.className='mod-menu';
  const b1=document.createElement('button');b1.textContent='🙈 Скрыть игрока';b1.addEventListener('click',e=>{e.stopPropagation();m.remove();modIgnore(k,name);});
  const b2=document.createElement('button');b2.textContent='⚑ Пожаловаться';b2.addEventListener('click',e=>{e.stopPropagation();m.remove();modReport(k,name,text,kind);});
  m.append(b1,b2);anchor.after(m);setTimeout(()=>document.addEventListener('click',()=>m.remove(),{once:true}),0);}
const MOD_RULES='Без мата, оскорблений, рекламы, ссылок и призывов к насилию. Нажмите на имя — можно скрыть игрока или пожаловаться.';
// список скрытых — в меню ☰
function modIgnoredList(){const box=document.createElement('div');box.className='mod-ign';
  if(!MOD.ignore.size){box.textContent='Скрытых игроков нет';return box;}
  for(const [k,n] of MOD.ignore){const row=document.createElement('div');const s=document.createElement('span');s.textContent=n;const b=document.createElement('button');b.className='btn';b.textContent='Вернуть';
    b.addEventListener('click',()=>{modUnignore(k);row.remove();});row.append(s,b);box.append(row);}
  return box;}
