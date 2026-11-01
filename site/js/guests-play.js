// ===== «В гости»: свой житель зовёт к себе на чай (данные — guests.js второго программиста, window.cityGuests) =====
// После пары разговоров житель зовёт к себе (в разговоре — строка invite.line и кнопки «Пойти в гости» / «В другой раз»;
// ИИ тоже может позвать сам: action=home). Житель ведёт к своему подъезду, у двери E «Зайти в гости». Внутри — его
// квартира (kind 'guest', как дом, но без кровати и шкафа игрока), картинка home.pic на входе и приглушённым фоном
// под разговором, хозяин за столом, чай (treat: настроение и сытость). Разговор открывается сам: первая фраза —
// visits[n].opening, дальше ИИ знает, где вы и что хозяин рассказывает в этот раз (story). Во 2-м и 3-м визите хозяин
// просит (ask) — кнопки прямо в разговоре. После 3-го — развязка (ending[выбор во 2-м визите]): строка в ленту, реплика,
// effect один раз на игрока. Дальше — просто чай, ИИ помнит развязку (after). Ушли — хозяин остаётся дома.
// Один визит к одному жителю за игровые сутки. Прогресс — PROG.guest[id] = {v: сколько визитов, ch: выбор во 2-м,
// end: какая развязка, day: игровой день последнего визита, inv: день последнего приглашения}.
const GUEST={visit:null,invited:null};
// «у кого»: Фидания → Фидании, Гульнара → Гульнары, Марат → Марата, Алсу — так и остаётся
function guestOf(n){n=String(n||'');const l=n.slice(-1),p=n.slice(-2,-1);if(/[аеёиоуыэюя]/i.test(l)&&!/[ая]/.test(l))return n;
  if(l==='я')return n.slice(0,-1)+'и';if(l==='а')return n.slice(0,-1)+(/[гкхжшчщ]/.test(p)?'и':'ы');if(l==='й')return n.slice(0,-1)+'я';if(l==='ь')return n;return n+'а';}
function guestData(id){const g=(window.cityGuests||[]).find(x=>x&&x.id===id);return g&&Array.isArray(g.visits)&&g.visits.length?g:null;}
function guestState(id){PROG.guest=PROG.guest||{};return PROG.guest[id]||(PROG.guest[id]={v:0,ch:null,end:null,day:-1,inv:-1});}
function guestFolk(w){const ww=w&&(w.companionOf||w);return ww&&typeof folkOf==='function'?folkOf(ww):null;}
function guestHomeAt(f){const h=f&&f.places&&f.places.home;return h&&Number.isFinite(h.x)&&Number.isFinite(h.y)?h:null;}
// можно ли сейчас позвать: есть данные, знакомы достаточно, время подходящее, сегодня ещё не были, игрок на улице
function guestCan(f){const g=f&&guestData(f.id);if(!g||!guestHomeAt(f)||scene!=='city'||player.vehicle||player.bus)return false;
  const inv=g.invite||{},h=gHour(),hr=Array.isArray(inv.hours)?inv.hours:[10,21];
  return (f.met||0)>=(inv.met||2)&&h>=hr[0]&&h<hr[1]&&guestState(f.id).day!==clock.day;}
// для ИИ (companion.js, npcThink): можно позвать к себе — тогда есть action=home
function guestHomeOk(w){if(!w||w.isInterior)return false;const f=guestFolk(w);return !!(f&&guestCan(f));}
function guestHomeHint(w){if(!w||w.isInterior||GUEST.visit)return '';const f=guestFolk(w);if(!f)return '';
  if(guestCan(f))return ' Ты можешь позвать собеседника к себе домой на чай. action=home — вы прямо сейчас договорились пойти к тебе в гости (ты ведёшь к своему подъезду).';
  // житель, у которого есть свой дом в этой механике, но звать ещё рано (мало знакомы, не то время, сегодня уже были): не обещать того, чего игра не сделает
  return guestData(f.id)?' Сейчас к себе домой не зови и не говори «заходи» — в гости позовёшь в другой раз.':'';}

// ---------- приглашение в разговоре ----------
function guestInviteRow(w,f,g){const log=$('#chatLog');if(!log)return;const d=document.createElement('div');d.className='m sys guest-ask';
  const a=document.createElement('button');a.className='btn primary';a.textContent='🏠 Пойти в гости';a.onclick=()=>{d.remove();const note=guestGo(w);if(note)appendMsg('sys',note);};
  const b=document.createElement('button');b.className='btn';b.textContent='В другой раз';b.onclick=()=>{d.remove();const t=pick(['Ну, в другой раз так в другой раз.','Хорошо, заходи, как будет время.','Ладно, дверь всегда открыта.']);appendMsg('npc',t);w.p.memory.push({role:'assistant',content:t});};
  d.append(a,b);log.append(d);log.scrollTop=log.scrollHeight;}
if(typeof openChat==='function'){const oc0=openChat;window.openChat=openChat=function(w){const r=oc0.apply(this,arguments);try{guestOnChat(w);}catch(e){console.warn(e);}return r;};}
function guestOnChat(w){if(GUEST.visit&&GUEST.visit.npc===w){$('#chatOrder').hidden=true;return;}guestChatLook(false);   // кнопка «закрыть» в разговоре держит старый closeChat — фон снимаем здесь
  const f=guestFolk(w);if(!f||w.isInterior||!guestCan(f))return;const g=guestData(f.id),st=guestState(f.id);if(st.inv===clock.day)return;
  st.inv=clock.day;progSave();GUEST.invited=f.id;const line=String((g.invite&&g.invite.line)||'Заходи ко мне на чай, тут недалеко.').slice(0,160);
  appendMsg('npc',line);w.p.memory.push({role:'assistant',content:line});guestInviteRow(w,f,g);}
// без ИИ: «пошли», «давай», «зайду» после приглашения — идём в гости
if(typeof scriptedThink==='function'){const st0=scriptedThink;window.scriptedThink=scriptedThink=function(w,text){const f=guestFolk(w);
  if(f&&GUEST.invited===f.id&&guestCan(f)&&/(пойд[её]м|пошли|идем|идём|давай|зайду|айда|с удовольствием|конечно)/i.test(String(text||'')))return {reply:pick(['Пойдём, у меня чайник уже горячий!','Айда, тут рядом.','Вот и хорошо, пошли!']),action:'home',place:''};
  return st0.apply(this,arguments);};}

// ---------- ведёт к себе ----------
function guestGo(w){const f=guestFolk(w);if(!f||!guestCan(f))return null;const h=guestHomeAt(f),g=guestData(f.id);
  if(w.isInterior)return null;   // зовут только на улице
  const real=w.companionOf||w;if(chatNpc)closeChat();
  startCompanion(real,'follow');const c=companion;if(!c||c.w!==real)return null;
  c.mode='go';c.dest={x:h.x,y:h.y,n:'дом '+real.p.name,guest:f.id};c.route=null;c.arrived=false;player.escort=true;GUEST.invited=null;
  addEvent(`🏠 ${real.p.name} ведёт вас к себе на ${(g.treat&&g.treat.name)||'чай'}`,'say');setHint('Идите за хозяином — у подъезда E «Зайти в гости»');updateCompBox();
  return `${real.p.name} ведёт вас к себе в гости`;}
// E у подъезда
function guestAction(){if(scene!=='city'||!companion)return null;const c=companion;if(!c.dest||!c.dest.guest||player.vehicle||player.bus)return null;
  if(!c.arrived&&dist(player.x,player.y,c.dest.x,c.dest.y)>16)return null;
  return {label:`🏠 Зайти в гости: ${c.w.p.name}`,run:guestEnter};}
if(typeof findAction==='function'){const fa0=findAction;window.findAction=findAction=function(){return guestAction()||fa0.apply(this,arguments);};}

// ---------- в гостях ----------
function guestShot(pic,name){if(!pic)return;const el=$('#insideShot');if(!el)return;const im=new Image();
  im.onload=()=>{el.style.backgroundImage=`url("${pic}")`;$('#insideShotName').textContent=name||'';el.hidden=false;el.classList.remove('out');void el.offsetWidth;el.classList.add('in');setTimeout(()=>{if(typeof hideShot==='function')hideShot();},900);};im.src=pic;}
function guestEnter(){const c=companion;if(!c||!c.dest||!c.dest.guest)return;const id=c.dest.guest,f=FOLK.list.find(q=>q.id===id),g=guestData(id);if(!f||!g)return;
  const st=guestState(id);const story=st.v<g.visits.length;if(story)st.v++;st.day=clock.day;progSave();
  const n=Math.min(st.v,g.visits.length),beat=story?g.visits[n-1]:null,pic=g.home&&g.home.pic;
  const name=f.name,title=`Дома у ${guestOf(name)}`;guestShot(pic,title);
  enterInterior({kind:'guest',name:title,key:'guest:'+id,x:player.x,y:player.y,guest:id});
  const it=interior;if(!it)return;const npc=it.npcs.find(q=>q.companionOf===c.w);if(!npc)return;
  const t=g.treat||{};if(npc.tableF)npc.tableF.ordered=t.name||'чай';
  player.mood=clamp(player.mood+clamp(+t.mood||0,0,10),0,100);player.food=clamp((player.food||0)+clamp(+t.food||0,0,8),0,100);
  addEvent(`🫖 ${name} наливает ${t.name||'чай'}${t.mood?'. Настроение +'+clamp(+t.mood,0,10):''}`,'say');
  GUEST.visit={id,n,story,beat,npc,f,g,op:null,asked:!(beat&&beat.ask),pic};updateCompBox();
  if(typeof cityTrack==='function')cityTrack('guest',{name});
  setTimeout(()=>{if(!GUEST.visit||GUEST.visit.npc!==npc||interior!==it)return;openChat(npc);guestChatLook(true);
    const op=String((beat&&beat.opening)||(st.end?pick(['Проходи, садись, чай свежий.','О, заходи! Чайник только вскипел.','Садись, рассказывай, как сам.']):'Садись, чай свежий.')).slice(0,160);
    GUEST.visit.op=appendMsg('npc',op);npc.p.memory.push({role:'assistant',content:op});},1100);}
// фон разговора — картинка квартиры, приглушённая
function guestChatLook(on){const m=$('#chatModal');if(!m)return;const box=m.querySelector('.box')||m.firstElementChild;if(!box)return;const v=GUEST.visit;
  if(on&&v&&v.pic){box.style.backgroundImage=`linear-gradient(rgba(14,24,20,.86),rgba(14,24,20,.93)),url("${v.pic}")`;box.style.backgroundSize='cover';box.style.backgroundPosition='center';}
  else{box.style.backgroundImage='';box.style.backgroundSize='';box.style.backgroundPosition='';}}
if(typeof closeChat==='function'){const cc0=closeChat;window.closeChat=closeChat=function(){guestChatLook(false);return cc0.apply(this,arguments);};}
// ИИ знает, что вы у хозяина дома и что он рассказывает в этот раз
if(typeof companionContext==='function'){const cx0=companionContext;window.companionContext=companionContext=function(w){const v=GUEST.visit;
  if(v&&w===v.npc){const g=v.g,st=guestState(v.id),about=g.home&&g.home.about?` (${String(g.home.about).slice(0,240)})`:'',t=g.treat&&g.treat.name?g.treat.name:'чай';
    let s=` Собеседник у тебя в гостях, вы сидите у тебя дома${about} и пьёте ${t}. Ты хозяин: угощаешь, рассказываешь, расспрашиваешь.`;
    if(v.beat&&v.beat.story)s+=` В этот раз ты рассказываешь вот что (своими словами, по частям, не всё сразу): ${String(v.beat.story).slice(0,400)}`;
    const e=st.end&&g.ending&&g.ending[st.end];if(e&&e.after)s+=` Что уже было между вами: ${String(e.after).slice(0,200)}`;
    return s;}
  return cx0.apply(this,arguments);};}
// просьба хозяина — после пары реплик игрока; в последнем визите после ответа — развязка
setInterval(()=>{const v=GUEST.visit;if(!v||v.asked||chatNpc!==v.npc||typeof chatBusy!=='undefined'&&chatBusy)return;
  // сколько игрок сказал после первой фразы хозяина — по строкам разговора (память хозяина обрезается до 16 реплик, по ней не посчитать)
  let said=0;for(let e=v.op&&v.op.nextElementSibling;e;e=e.nextElementSibling)if(e.classList.contains('me'))said++;if(said<2)return;guestAsk(v);},700);
function guestAsk(v){const a=v.beat&&v.beat.ask;v.asked=true;if(!a||!Array.isArray(a.choices)||!a.choices.length)return;
  const log=$('#chatLog');const d=document.createElement('div');d.className='m sys guest-ask';const q=document.createElement('div');q.textContent=String(a.text||'').slice(0,200);d.append(q);
  for(const ch of a.choices.slice(0,3)){const b=document.createElement('button');b.className='btn';b.textContent=String(ch.t||'').slice(0,40);
    b.onclick=()=>{d.remove();guestChoose(v,ch);};d.append(b);}
  log.append(d);log.scrollTop=log.scrollHeight;}
function guestChoose(v,ch){const st=guestState(v.id),g=v.g;const line=String(ch.line||'').slice(0,160);
  v.npc.p.memory.push({role:'user',content:`[Вы выбрали: ${String(ch.t||'').slice(0,40)}]`});if(line){appendMsg('npc',line);v.npc.p.memory.push({role:'assistant',content:line});}
  if(v.n===2&&ch.id)st.ch=String(ch.id);
  if(v.n===g.visits.length&&!st.end)guestEnding(v);progSave();}
function guestEnding(v){const st=guestState(v.id),g=v.g,E=g.ending||{};const key=st.ch&&E[st.ch]?st.ch:Object.keys(E)[0];const e=key&&E[key];if(!e)return;
  st.end=key;progSave();const ef=e.effect||{};
  if(+ef.mood)player.mood=clamp(player.mood+clamp(+ef.mood,-5,10),0,100);
  if(+ef.rep&&typeof sitRep==='function')sitRep(clamp(Math.round(+ef.rep),-1,1),null);
  if(+ef.money>0&&typeof sitMoney==='function')sitMoney(clamp(Math.round(+ef.money),0,300),`Подарок: ${v.f.name}`);
  if(e.text)addEvent('🏠 '+String(e.text).slice(0,220),'say');
  if(e.line){const t=String(e.line).slice(0,160);setTimeout(()=>{if(chatNpc===v.npc){appendMsg('npc',t);v.npc.p.memory.push({role:'assistant',content:t});}},900);}}
// ушли — хозяин остаётся дома
if(typeof exitInterior==='function'){const ex0=exitInterior;window.exitInterior=exitInterior=function(){const v=GUEST.visit;const r=ex0.apply(this,arguments);
  if(v){GUEST.visit=null;guestChatLook(false);const f=v.f;if(companion&&f&&guestFolk(companion.w)===f)stopCompanion(true);
    if(f){if(typeof folkDrop==='function')folkDrop(f);f.trip=null;f.at='home';f.away=false;f.homeUntil=clock.minutes+60;}
    addEvent(`${v.f.name} остаётся дома. ${v.g.visits.length>v.n?'Зовёт заходить ещё':'Заходите на чай, когда будете рядом'}`,'say');}
  return r;};}
// в гостях хозяин не уходит из своего дома и не идёт с вами дальше — ИИ может ответить follow/stop, но здесь это ни к чему
if(typeof applyNpcAction==='function'){const ap0=applyNpcAction;window.applyNpcAction=applyNpcAction=function(w,r){if(GUEST.visit&&w===GUEST.visit.npc&&r&&r.action!=='none')return null;return ap0.apply(this,arguments);};}
// в гостях плашка спутника не нужна: «Отпустить» увело бы хозяина из его же дома
if(typeof updateCompBox==='function'){const ub0=updateCompBox;window.updateCompBox=updateCompBox=function(){const r=ub0.apply(this,arguments);if(GUEST.visit&&scene==='interior'){const b=$('#compBox');if(b)b.hidden=true;}return r;};}
window.cityGuestsState=()=>JSON.parse(JSON.stringify(PROG.guest||{}));
