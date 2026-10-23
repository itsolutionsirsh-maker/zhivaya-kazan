// ===== Мини-приложение Телеги: та же игра, вход по аккаунту Телеги, прогресс на сервере =====
// Открыто из Телеги → в адресе есть tgWebAppData. Тогда грузим telegram-web-app.js, разворачиваем на весь экран,
// входим через initData (сервер проверяет подпись токеном бота), продолжаем с того же места на любом телефоне.
// Вне Телеги этот файл ничего не делает.
const TG={on:false,W:null,startParam:'',user:null,state:'off'};
(function(){const h=location.hash+location.search;if(!/tgWebApp/.test(h))return;TG.on=true;window.zkTg=TG;document.documentElement.classList.add('tg');
  const sc=document.createElement('script');sc.src='https://telegram.org/js/telegram-web-app.js';sc.onload=tgBoot;sc.onerror=()=>{TG.state='noscript';};document.head.append(sc);})();
function tgBoot(){const W=window.Telegram&&window.Telegram.WebApp;if(!W)return;TG.W=W;
  try{W.ready();W.expand();}catch(e){}
  try{if(W.disableVerticalSwipes)W.disableVerticalSwipes();}catch(e){}         // свайп вниз не закрывает игру, когда тянешь карту
  try{W.setHeaderColor('#10161A');W.setBackgroundColor('#10161A');}catch(e){}
  const u=W.initDataUnsafe||{};TG.user=u.user||null;TG.startParam=u.start_param||'';
  try{W.BackButton.onClick(tgBack);}catch(e){}setInterval(tgBackSync,400);
  // имя из Телеги подставляем в анкету персонажа, если игрок ещё не создан
  const pn=document.getElementById('pName');if(pn&&!pn.value)pn.value=tgDefaultName();
  // свернули мини-приложение — сразу сохраняем на сервер
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&typeof acctSave==='function')acctSave();});
  tgLogin();}
// «Назад» Телеги закрывает открытое окно (как Esc)
function tgOpenThing(){return [...document.querySelectorAll('.modal')].some(m=>!m.hidden)||(document.body.classList.contains('chat-open'))||(typeof scene!=='undefined'&&scene==='interior');}
function tgBackSync(){const W=TG.W;if(!W||!W.BackButton)return;const need=tgOpenThing();if(need&&!W.BackButton.isVisible)W.BackButton.show();else if(!need&&W.BackButton.isVisible)W.BackButton.hide();}
function tgBack(){if([...document.querySelectorAll('.modal')].some(m=>!m.hidden)||document.body.classList.contains('chat-open')){window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));if(document.body.classList.contains('chat-open')&&typeof closeChatPanel==='function')closeChatPanel();return;}
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
  let local=null;try{local=JSON.parse(localStorage.getItem('zk.state')||'null');}catch(e){}
  if(j.state&&(j.state.t||0)>((local&&local.t)||0)+5000){acctApply(j);return;}   // на сервере свежее — загрузим и перезапустим
  if(!j.state&&typeof acctSave==='function')acctSave();                           // новый игрок: сразу положим то, что есть
  tgMsg(j.created?'Вы вошли через Телеграм. Прогресс сохраняется на сервере':'Вошли через Телеграм. Прогресс на сервере');}
// «у меня уже есть игрок на сайте»: имя + PIN — дальше Телега открывает его
async function tgLink(name,pin){if(!acct||!acct.tg)return;const j=await acctCall('tglink',{token:acct.token,name,pin}).catch(()=>({err:'net'}));
  const E={name:'Имя — от 2 букв',pin:'PIN — от 4 до 8 цифр',wrong_pin:'Неверный PIN',no_account:'Такого игрока на сайте нет',locked:'Слишком много попыток. Подождите 15 минут',rate_limited:'Слишком часто. Попробуйте через минуту',auth:'Сначала войдите через Телеграм',net:'Нет связи с сервером'};
  if(j.err){tgMsg(E[j.err]||'Не получилось');return;}
  acct={token:j.token,name:j.name,tg:true,tgId:acct.tgId};try{localStorage.setItem('zk.acct',JSON.stringify(acct));}catch(e){}
  if(j.state){acctApply(j);return;}tgMsg('Привязали. Теперь Телеграм открывает игрока «'+j.name+'»');renderAcct();}
