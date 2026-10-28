// ===== Панель чата: Рядом · Город · Личные =====
const chatStore={near:[],city:[],dm:new Map()};   // dm: key → {name, msgs:[], unread}
const unread={near:0,city:0,dm:0};
let chatTab='near',dmTarget=null;
function fmtNow(){return fmtTime();}
function chatPush(tab,line){const arr=chatStore[tab];arr.push(line);if(arr.length>120)arr.shift();}
// входящее сообщение от игрока
function chatDeliver(fromKey,fromName,kind,text,quiet,toKey){
  if(fromKey!=='me'&&modIgnored(fromKey))return;   // скрытый игрок
  text=modClean(text);fromName=fromKey==='me'?fromName:modName(fromName);
  if(kind==='city'){chatPush('city',{who:fromName,me:fromKey==='me',k:fromKey,t:text,tm:fmtNow()});if(!quiet&&!(chatOpen()&&chatTab==='city')){unread.city++;}if(!quiet&&fromKey!=='me')addEvent(`💬 ${fromName}: ${text}`,'say',true);}
  else{const key=fromKey==='me'?toKey:fromKey;if(!key)return;let c=chatStore.dm.get(key);if(!c){c={name:fromKey==='me'?(peerName(key)||'Игрок'):fromName,msgs:[],unread:0};chatStore.dm.set(key,c);}if(fromKey!=='me')c.name=fromName;
    c.msgs.push({who:fromName,me:fromKey==='me',k:fromKey==='me'?null:fromKey,t:text,tm:fmtNow()});if(c.msgs.length>100)c.msgs.shift();
    if(!quiet&&fromKey!=='me'&&!(chatOpen()&&chatTab==='dm'&&dmTarget===key)){c.unread++;addEvent(`✉️ ${fromName} пишет вам: ${text}`,'say',true);}}
  renderChat();}
function nearLine(who,t,me,k){chatPush('near',{who,me,k:k||null,t,tm:fmtNow()});if(!(chatOpen()&&chatTab==='near')&&!me)unread.near++;renderChat();}
function peerName(key){for(const p of Net.peers)if(p.peer===key)return modName(p.presence.n);return null;}
function chatOpen(){return !$('#chatPanel').hidden;}
function openChatPanel(tab,target){$('#chatPanel').hidden=false;document.body.classList.add('chat-open');if(tab)chatTab=tab;if(target!==undefined)dmTarget=target;renderChat();setTimeout(()=>{const i=$('#cpInput');if(!i.disabled)i.focus();},30);}
function closeChatPanel(){$('#chatPanel').hidden=true;document.body.classList.remove('chat-open');$('#cpInput').blur();renderChat();}
$('#sayBtn').addEventListener('click',()=>chatOpen()?closeChatPanel():openChatPanel());
$('#cpClose').addEventListener('click',closeChatPanel);
document.querySelectorAll('#cpTabs button').forEach(b=>b.addEventListener('click',()=>{chatTab=b.dataset.t;if(chatTab!=='dm')dmTarget=null;renderChat();$('#cpInput').focus();}));
$('#cpSend').addEventListener('click',chatSend);
$('#cpInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();chatSend();}if(e.key==='Escape'){e.preventDefault();closeChatPanel();}e.stopPropagation();});
function chatSend(){const i=$('#cpInput');let t=i.value.trim().slice(0,240);if(!t)return;
  if(chatTab==='near'){i.value='';sayAloud(t);return;}
  t=modOutgoing(t);if(!t)return;   // мат и ссылки — звёздочками, повтор подряд — нельзя
  if(chatTab==='city'){if(!netSend(null,t)){setHint('Общий чат работает, когда в игре есть другие игроки');return;}i.value='';chatPush('city',{who:player.name,me:true,t,tm:fmtNow()});renderChat();return;}
  if(chatTab==='dm'&&dmTarget){if(!netSend(dmTarget,t)){setHint('Игрок не в сети');return;}i.value='';chatDeliver('me',player.name,'dm',t,true,dmTarget);}}
function lineEl(l,kind){const d=document.createElement('div');d.className='cl'+(l.me?' me':'');const w=document.createElement('b');w.textContent=l.who;
  if(!l.me&&l.k){w.className='who';w.title='Скрыть или пожаловаться';w.addEventListener('click',e=>{e.stopPropagation();modMenu(d,l.k,l.who,l.t,kind||'chat');});}const s=document.createElement('span');s.textContent=l.t;const tm=document.createElement('i');tm.textContent=l.tm;d.append(tm,w,s);return d;}
function renderChat(){
  let dmUnread=0;for(const c of chatStore.dm.values())dmUnread+=c.unread;unread.dm=dmUnread;
  if(chatOpen()){if(chatTab==='near')unread.near=0;if(chatTab==='city')unread.city=0;}
  const total=unread.near+unread.city+unread.dm;const sb=$('#sayBtn');sb.dataset.n=total>0?String(Math.min(99,total)):'';sb.classList.toggle('has',total>0);
  document.querySelectorAll('#cpTabs button').forEach(b=>{const n=unread[b.dataset.t];b.classList.toggle('on',b.dataset.t===chatTab);b.querySelector('em').textContent=n?String(n):'';});
  if(!chatOpen())return;
  const list=$('#cpList');const input=$('#cpInput');list.innerHTML='';$('#cpHead').hidden=true;
  const online=Net.mode!=='off';
  if(chatTab==='near'){input.placeholder=sharedRoomId()?'Сказать посетителям этого заведения':'Сказать вслух — услышат все рядом';input.disabled=false;
    if(!chatStore.near.length){const e=document.createElement('p');e.className='cp-empty';e.textContent='Здесь то, что говорят рядом с вами: игроки и жители. Напишите — фраза появится облачком над головой.';list.append(e);}
    chatStore.near.forEach(l=>list.append(lineEl(l,'near')));}
  else if(chatTab==='city'){input.placeholder=online?'Написать всем игрокам в городе':'Общий чат — когда в игре есть другие игроки';input.disabled=!online;
    if(!chatStore.city.length){const e=document.createElement('p');e.className='cp-empty';e.textContent=online?`Общий чат города. Сейчас в игре: ${Net.peers.length+1}.`:'Вы играете одни. Общий чат заработает, когда игру откроют другие люди.';list.append(e);}
    {const ru=document.createElement('p');ru.className='cp-rules';ru.textContent=MOD_RULES;list.prepend(ru);}
    chatStore.city.forEach(l=>list.append(lineEl(l,'city')));}
  else{if(dmTarget){const c=chatStore.dm.get(dmTarget);c&&(c.unread=0);const head=$('#cpHead');head.hidden=false;$('#cpHeadName').textContent=(c&&c.name)||peerName(dmTarget)||'Игрок';const on=!!peerName(dmTarget);$('#cpHeadSt').textContent=on?'в сети':'не в сети';
      input.placeholder='Личное сообщение';input.disabled=!on;
      {let mb=head.querySelector('.cp-mod');if(!mb){mb=document.createElement('span');mb.className='cp-mod';head.append(mb);}mb.innerHTML='';const tgt=dmTarget,nm=(c&&c.name)||peerName(dmTarget)||'Игрок';
       const b1=document.createElement('button');b1.textContent='🙈';b1.title='Скрыть игрока';b1.addEventListener('click',()=>{modIgnore(tgt,nm);dmTarget=null;renderChat();});
       const b2=document.createElement('button');b2.textContent='⚑';b2.title='Пожаловаться';b2.addEventListener('click',()=>{const last=c&&c.msgs.filter(x=>!x.me).slice(-3).map(x=>x.t).join(' / ');modReport(tgt,nm,last||'',"dm");});mb.append(b1,b2);}
      (c?c.msgs:[]).forEach(l=>list.append(lineEl(l,'dm')));
      if(!c||!c.msgs.length){const e=document.createElement('p');e.className='cp-empty';e.textContent=Net.mode==='room'?'Сообщение увидит только этот игрок.':'Сообщение увидит только этот игрок.';list.append(e);}}
    else{input.placeholder='Выберите, кому написать';input.disabled=true;const keys=new Set([...chatStore.dm.keys(),...Net.peers.map(p=>p.peer)].filter(k=>!modIgnored(k)));
      if(!keys.size){const e=document.createElement('p');e.className='cp-empty';e.textContent=online?'Других игроков пока нет.':'Вы играете одни. Личные сообщения — когда в игре есть другие люди.';list.append(e);}
      for(const k of keys){const c=chatStore.dm.get(k);const nm=(c&&c.name)||peerName(k)||'Игрок';const on=!!peerName(k);const pr=peerRender.get(k);const d=document.createElement('button');d.className='cp-person';
        const dist0=pr?Math.round(dist(pr.x,pr.y,player.x,player.y)):null;d.innerHTML='';const b=document.createElement('b');b.textContent=nm;const s=document.createElement('span');s.textContent=(on?'в сети':'не в сети')+(sharedPeerHere(pr||{})?' · в этом заведении':dist0!=null?` · ${dist0} м`:'')+(c&&c.unread?` · новых: ${c.unread}`:'');d.append(b,s);
        d.addEventListener('click',()=>{dmTarget=k;renderChat();$('#cpInput').focus();});list.append(d);}}}
  list.scrollTop=list.scrollHeight;}
$('#cpBack').addEventListener('click',()=>{dmTarget=null;renderChat();});
setInterval(()=>{if(chatOpen()&&chatTab==='dm'&&!dmTarget)renderChat();},2000);
