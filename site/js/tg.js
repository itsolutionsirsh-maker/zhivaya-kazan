// ===== Мини-приложение Телеги: та же игра, вход по аккаунту Телеги, прогресс на сервере =====
// Открыто из Телеги → в адресе есть tgWebAppData. Тогда грузим telegram-web-app.js, разворачиваем на весь экран,
// входим через initData (сервер проверяет подпись токеном бота), продолжаем с того же места на любом телефоне.
// Вне Телеги этот файл ничего не делает.
const TG={on:false,W:null,startParam:'',user:null,state:'off'};
const TG_BOT='zhivaya_kazan_bot',TG_APP='game';   // @бот и короткое имя мини-приложения (BotFather /newapp)
(function(){const h=location.hash+location.search;if(!/tgWebApp/.test(h))return;TG.on=true;window.zkTg=TG;document.documentElement.classList.add('tg');
  const sc=document.createElement('script');sc.src='https://telegram.org/js/telegram-web-app.js';sc.onload=tgBoot;sc.onerror=()=>{TG.state='noscript';};document.head.append(sc);})();
function tgBoot(){const W=window.Telegram&&window.Telegram.WebApp;if(!W)return;TG.W=W;
  try{W.ready();W.expand();}catch(e){}
  try{if(W.disableVerticalSwipes)W.disableVerticalSwipes();}catch(e){}         // свайп вниз не закрывает игру, когда тянешь карту
  try{W.setHeaderColor('#10161A');W.setBackgroundColor('#10161A');}catch(e){}
  const u=W.initDataUnsafe||{};TG.user=u.user||null;TG.startParam=u.start_param||'';
  try{W.BackButton.onClick(tgBack);}catch(e){}setInterval(()=>{tgBackSync();tgSwapHowto();},400);
  const ib=document.getElementById('inviteBtn');if(ib&&TG.user)ib.hidden=false;
  // имя из Телеги подставляем в анкету персонажа, если игрок ещё не создан
  const pn=document.getElementById('pName');if(pn&&!pn.value)pn.value=tgDefaultName();
  // свернули мини-приложение — сразу сохраняем на сервер
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&typeof acctSave==='function')acctSave();});
  tgLogin();}
// «Назад» Телеги закрывает открытое окно (как Esc)
function tgOpenThing(){return [...document.querySelectorAll('.modal')].some(m=>!m.hidden)||(document.body.classList.contains('chat-open'))||(typeof scene!=='undefined'&&scene==='interior');}
function tgBackSync(){const W=TG.W;if(!W||!W.BackButton)return;const need=tgOpenThing();if(need&&!W.BackButton.isVisible)W.BackButton.show();else if(!need&&W.BackButton.isVisible)W.BackButton.hide();}
function tgBack(){const ti=document.getElementById('tgIntro');if(ti&&!ti.hidden){tgIntroClose();return;}if([...document.querySelectorAll('.modal')].some(m=>!m.hidden)||document.body.classList.contains('chat-open')){window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));if(document.body.classList.contains('chat-open')&&typeof closeChatPanel==='function')closeChatPanel();return;}
  if(typeof scene!=='undefined'&&scene==='interior'&&typeof exitInterior==='function'&&!(typeof METRO!=='undefined'&&METRO.ride&&METRO.ride.phase==='go'))exitInterior();}
function tgDefaultName(){const u=TG.user;return u?[u.first_name,u.last_name].filter(Boolean).join(' ').slice(0,24):'';}
function tgMsg(t){const m=document.getElementById('acctMsg');if(m)m.textContent=t;}
async function tgLogin(){const W=TG.W;if(!W||!W.initData){TG.state='nodata';return;}TG.state='login';
  const uid=TG.user&&String(TG.user.id);
  try{
    // уже входили с этого телефона — пробуем сохранённый ключ, новый не выпускаем
    if(acct&&acct.tg&&acct.tgId===uid){const j=await acctCall('load',{token:acct.token});if(j&&j.ok){TG.state='ok';tgAfter(j);return;}}
    const j=await acctCall('tglogin',{initData:W.initData});
    if(j.err==='no_tg'){TG.state='no_tg';tgMsg('Вход через Телеграм ещё не настроен на сервере — прогресс пока хранится только в этом телефоне');return;}
    if(j.err){TG.state='err';tgMsg('Не получилось войти через Телеграм ('+j.err+')');return;}
    acct={token:j.token,name:j.name,tg:true,tgId:uid};try{localStorage.setItem('zk.acct',JSON.stringify(acct));}catch(e){}
    TG.state='ok';tgAfter(j);
  }catch(e){TG.state='net';}}
function tgAfter(j){if(typeof renderAcct==='function')renderAcct();
  // приглашения: запомним до перезагрузки, покажем после
  try{const q=JSON.parse(localStorage.getItem('zk.invq')||'[]');if(j.invitedBy)q.push(['invited',j.invitedBy]);for(const v of (j.invites||[]))q.push(['inviter',v.name]);localStorage.setItem('zk.invq',JSON.stringify(q.slice(-10)));}catch(e){}
  if(acctBootSync(j))return;   // на сервере новее (другое устройство) — загрузим и перезапустим; иначе своя игра и сразу на сервер (net.js)
  tgMsg(j.created?'Вы вошли через Телеграм. Прогресс сохраняется на сервере':'Вошли через Телеграм. Прогресс на сервере');
  setTimeout(tgInvites,4000);}
// показать приглашения: у второго программиста — window.cityOnInvite(kind,name) в people.js; без неё — короткая запись и чуть настроения
function tgInvites(){let q=[];try{q=JSON.parse(localStorage.getItem('zk.invq')||'[]');localStorage.removeItem('zk.invq');}catch(e){}
  for(const [kind,name] of q){if(typeof window.cityOnInvite==='function'){try{window.cityOnInvite(kind,name);continue;}catch(e){}}
    if(typeof addEvent!=='function')continue;if(kind==='invited')addEvent(`👋 Вас позвал в город ${name}. Найдите друг друга — вдвоём веселее`,'say');else addEvent(`👋 По вашей ссылке в город пришёл ${name}`,'say');
    if(typeof player!=='undefined')player.mood=Math.min(100,(player.mood||0)+5);}}
// «Позвать друга»: ссылка на мини-приложение с меткой ref_<мой id>
function tgInvite(){const W=TG.W;if(!W||!TG.user)return;const link=`https://t.me/${TG_BOT}/${TG_APP}?startapp=ref_${TG.user.id}`;
  const url=`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Заходи в «Живую Казань» — живой центр Казани прямо в Телеге. Встретимся на Баумана!')}`;
  try{W.openTelegramLink(url);}catch(e){window.open(url,'_blank');}}
// три коротких экрана при первом запуске в Телеге (вместо подсказок для клавиатуры)
const TG_INTRO=[['🚶','Ходить','Джойстик слева внизу — идти. Нажмите на карту — персонаж дойдёт сам. Двумя пальцами — приблизить.'],
  ['🟢','Кнопка внизу','Подойдите к кафе, человеку, метро «М» или самокату — внизу появится зелёная кнопка. Нажмите её.'],
  ['🏙','Город живёт сам','Утром пробки, ночью такси. 💼 — работа и жильё, «Сегодня» — что в городе, ☰ — всё остальное. Прогресс хранится в вашем Телеграме.']];
let tgIntroI=0;
function tgIntroShow(){tgIntroI=0;tgIntroDraw();document.getElementById('tgIntro').hidden=false;if(typeof player!=='undefined')player.busy=true;}
function tgIntroDraw(){const [ic,t,x]=TG_INTRO[tgIntroI];document.getElementById('tgIntroIc').textContent=ic;document.getElementById('tgIntroT').textContent=t;document.getElementById('tgIntroX').textContent=x;
  document.getElementById('tgIntroDots').textContent=TG_INTRO.map((_,i)=>i===tgIntroI?'●':'○').join('');document.getElementById('tgIntroNext').textContent=tgIntroI<TG_INTRO.length-1?'Дальше':'Играть';}
function tgIntroClose(){document.getElementById('tgIntro').hidden=true;if(typeof player!=='undefined')player.busy=false;try{localStorage.setItem('zk.tgintro','1');}catch(e){}}
(function(){const n=document.getElementById('tgIntroNext'),k=document.getElementById('tgIntroSkip');if(!n)return;
  n.addEventListener('click',()=>{if(tgIntroI<TG_INTRO.length-1){tgIntroI++;tgIntroDraw();}else tgIntroClose();});k.addEventListener('click',tgIntroClose);
  const ib=document.getElementById('inviteBtn');if(ib)ib.addEventListener('click',tgInvite);})();
// подсказки для клавиатуры в Телеге подменяем своими
function tgSwapHowto(){if(!TG.on)return;const h=document.getElementById('howtoModal');if(!h||h.hidden)return;let seen=false;try{seen=!!localStorage.getItem('zk.tgintro');}catch(e){}
  const c=document.getElementById('howtoClose');if(c)c.click();else h.hidden=true;if(!seen)tgIntroShow();}
// «у меня уже есть игрок на сайте»: имя + PIN — дальше Телега открывает его
async function tgLink(name,pin){if(!acct||!acct.tg)return;const j=await acctCall('tglink',{token:acct.token,name,pin}).catch(()=>({err:'net'}));
  const E={name:'Имя — от 2 букв',pin:'PIN — от 4 до 8 цифр',wrong_pin:'Неверный PIN',no_account:'Такого игрока на сайте нет',locked:'Слишком много попыток. Подождите 15 минут',rate_limited:'Слишком часто. Попробуйте через минуту',auth:'Сначала войдите через Телеграм',net:'Нет связи с сервером'};
  if(j.err){tgMsg(E[j.err]||'Не получилось');return;}
  acct={token:j.token,name:j.name,tg:true,tgId:acct.tgId};try{localStorage.setItem('zk.acct',JSON.stringify(acct));}catch(e){}
  if(j.state){acctApply(j);return;}tgMsg('Привязали. Теперь Телеграм открывает игрока «'+j.name+'»');renderAcct();}
