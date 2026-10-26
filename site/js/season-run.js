// ===== Сезон (season.js → citySeason) и свои вещи (shop.js → cityShop): опыт, уровни, награды, «Мои вещи» =====
// Данные пишет второй программист; здесь — учёт. Опыт идёт только в сезон (по датам from–to, по Москве), вещи остаются навсегда.
// Платная ветка выдаётся, только если сезон куплен (PROG.season.paid) — покупки пока нет, ветку не показываем (cityPlatform.canPay).
// Баланс (решение Иршата): активный игрок за день — около 380 опыта (3 задания, все три, вечер, день подряд) → 30 уровней к концу месяца.
const SEASON_XP={quest:40,allDay:100,evening:60,badge:50,district:20,day:30,streak:10};
const WEAR_SLOT={hat:'hat',scarf:'scarf',glasses:'glasses',bag:'bag',frame:'frame',top:'top','car-color':'car'};
const SLOT_RU={hat:'шапка',scarf:'шарф',glasses:'очки',bag:'сумка',frame:'рамка имени',top:'одежда',car:'краска машины',furniture:'для дома','car-model':'машина'};
// у старых вещей витрины нет цвета — свой по виду
const WEAR_DEF={'glasses-round':'#3A3A3A','glasses-sun':'#111111','glasses-half':'#6B5B4B','glasses-clear':'#9AA3AD','glasses-brow':'#5A3A22','bag-net':'#C8B88A',
  'frame-gold':'#D4AF37','frame-wood':'#8B5E3C','frame-ink':'#1C2430','frame-thread':'#E8E2D0','name-pin':'#2BB062'};
function shopItem(id){if(!id)return null;for(const s of window.cityShop||[])if(s.id===id)return s;return null;}
function itemColor(s){return s?(s.color||WEAR_DEF[s.id]||'#555'):null;}
function seasonData(){const S=window.citySeason;return S&&Array.isArray(S.levels)&&S.levels.length?S:null;}
function seasonOn(id){const S=seasonData();if(!S||(id&&id!==S.id))return false;const d=mskDate();return d>=S.from&&d<=S.to;}
function seasonSoon(){const S=seasonData();if(!S)return false;const d=mskDate();return d<S.from&&Date.parse(S.from)-Date.parse(d)<=10*86400e3;}
function seasonState(){const S=seasonData();const id=S?S.id:'';if(!PROG.season||PROG.season.id!==id)PROG.season={id,lvl:0,xp:0,paid:false};return PROG.season;}
function invList(){if(!Array.isArray(PROG.inv))PROG.inv=[];return PROG.inv;}
function wearState(){if(!PROG.wear||typeof PROG.wear!=='object')PROG.wear={};return PROG.wear;}
// опыт сезона; quiet — без своей строки в ленте (опыт допишет тот, кто вызвал). Возвращает, сколько начислено.
function seasonXP(n,why,quiet){const S=seasonData();if(!S||!seasonOn()||!(n>0))return 0;const st=seasonState();if(st.lvl>=S.levels.length)return 0;
  st.xp+=n;const up=[];while(st.lvl<S.levels.length&&st.xp>=(S.levels[st.lvl].xp||100)){st.xp-=S.levels[st.lvl].xp||100;up.push(S.levels[st.lvl]);st.lvl++;}
  if(st.lvl>=S.levels.length)st.xp=0;
  if(!quiet&&!up.length)addEvent(`❄️ +${n} опыта сезона${why?' — '+why:''}`,'say');
  for(const L of up)seasonReward(S,L);progSave();updateQuestBtn();return n;}
function seasonReward(S,L){const r=L.free||{};if(r.money)player.money+=r.money;const it=shopItem(r.item);const auto=it?invAdd(it):false;
  const pit=seasonState().paid&&L.paid?shopItem(L.paid.item):null;if(pit)invAdd(pit);
  const what=(r.money?` +${fmtMoney(r.money)}`:'')+(it?` и «${it.title}»`:'')+(pit?` и «${pit.title}»`:'');
  const tail=it?(auto?' — уже на вас':it.kind==='furniture'?' — стоит дома':' — надеть в «Мои вещи»'):'';
  addEvent(`❄️ ${S.title}: уровень ${L.lvl}!${what}${tail}`,'say');
  if(window.cityPhone)window.cityPhone.push({from:S.title,text:`Уровень ${L.lvl}:${what}${tail}`,kind:'season'});
  if(L.lvl===S.levels.length)setTimeout(()=>addEvent(`❄️ Все ${S.levels.length} уровней сезона пройдены. Вещи остаются с вами`,'say'),1500);}
// новая вещь; если это место пустое — сразу надеть (видно награду). Возвращает true, если надели.
function invAdd(it){const inv=invList();if(!inv.includes(it.id))inv.push(it.id);if(typeof interior!=='undefined'&&interior)homeItemsSync(interior);const slot=WEAR_SLOT[it.kind];if(!slot)return false;const w=wearState();if(w[slot])return false;w[slot]=it.id;wearApply();return true;}
function wearPut(id){const it=shopItem(id);if(!it||!invList().includes(id))return;const slot=WEAR_SLOT[it.kind];if(!slot)return;wearState()[slot]=id;wearApply();progSave();}
function wearOff(slot){delete wearState()[slot];wearApply();progSave();}
function wornItem(slot){const id=wearState()[slot];return id&&invList().includes(id)?shopItem(id):null;}
// машина и соседи узнают о смене сразу
function wearApply(){if(typeof ownCar!=='undefined'&&ownCar)ownCar.color=wornCarColor()||player.carColor;if(typeof pushPresence==='function')try{pushPresence();}catch(e){}}
function wornCarColor(){const c=wornItem('car');return c?itemColor(c):null;}
// вид шапки — по названию вещи
function hatStyle(id){return /ushanka|flap/.test(id)?'ush':/pompon/.test(id)?'pom':/tubeteika/.test(id)?'tub':/felt/.test(id)?'felt':/cap-flat/.test(id)?'cap':'knit';}
function frameStyle(id){return /pin/.test(id)?'pin':/flake/.test(id)?'flake':/garland/.test(id)?'garland':/thread/.test(id)?'thread':'line';}
function lookFromIds(w){const o={};const h=shopItem(w.h||w.hat);if(h&&h.kind==='hat')o.hat={c:itemColor(h),k:hatStyle(h.id)};
  const s=shopItem(w.s||w.scarf);if(s&&s.kind==='scarf')o.scarf=itemColor(s);const g=shopItem(w.g||w.glasses);if(g&&g.kind==='glasses')o.glasses=itemColor(g);
  const b=shopItem(w.b||w.bag);if(b&&b.kind==='bag'){o.bag=itemColor(b);o.backpack=/backpack/.test(b.id);}
  const f=shopItem(w.f||w.frame);if(f&&f.kind==='frame')o.frame={c:itemColor(f),k:frameStyle(f.id)};return o;}
function wornIds(){const o={};for(const [k,s] of [['h','hat'],['s','scarf'],['g','glasses'],['b','bag'],['f','frame']]){const it=wornItem(s);if(it)o[k]=it.id;}return o;}
// как выглядит игрок: одежда из профиля (или надетая из вещей) и вещи
const _look={k:'',v:null};   // каждый кадр — из запомненного, пересчёт только когда что-то сменили
function myLook(){const k=player.clothes+'|'+player.skin+'|'+player.hair+'|'+JSON.stringify(wearState())+'|'+invList().length;if(_look.k===k)return _look.v;const top=wornItem('top');
  _look.k=k;_look.v=Object.assign({clothes:top?itemColor(top):player.clothes,skin:player.skin,hair:player.hair,role:'player'},lookFromIds(wornIds()));return _look.v;}
function myClothes(){const top=wornItem('top');return top?itemColor(top):player.clothes;}

// ---------- мебель из вещей — в своей квартире ----------
const HOME_SPOT={'furn-shelf':{t:'own',x:0.45,y:4.0,w:0.6,h:1.8},'furn-chair':{t:'own',x:1.0,y:5.9,w:0.8,h:0.8},'furn-lamp':{t:'own',x:5.3,y:4.6,w:0.5,h:0.5},
  'furn-rug':{t:'rug',x:5.5,y:7.35,w:1.7,h:0.8},'furn-samovar':{t:'rug',x:8,y:3.8,w:0.5,h:0.5}};
function homeItemsSync(it){if(!it||it.kind!=='home')return;for(const id of invList()){const sp=HOME_SPOT[id];if(!sp||it.furn.some(f=>f.own===id))continue;it.furn.push(Object.assign({own:id},sp));}}
function drawOwnFurniture(f){const c=ctx,x=f.x-f.w/2,y=f.y-f.h/2;
  if(f.own==='furn-shelf'){c.fillStyle='rgba(0,0,0,.18)';c.fillRect(x+0.08,y+0.1,f.w,f.h);c.fillStyle='#8C6440';c.fillRect(x,y,f.w,f.h);const cols=['#B33A3A','#3B5A8C','#D9B44A','#2F6B4F','#7A4A3A'];for(let i=0;i<9;i++){c.fillStyle=cols[i%5];c.fillRect(x+0.1,y+0.1+i*0.18,f.w-0.2,0.12);}return;}
  if(f.own==='furn-chair'){c.fillStyle='rgba(0,0,0,.18)';rrect(c,x+0.08,y+0.1,f.w,f.h,0.2);c.fill();c.fillStyle='#7A4A3A';rrect(c,x,y,f.w,f.h,0.2);c.fill();c.fillStyle='#9C6A52';rrect(c,x+0.15,y+0.15,f.w-0.3,f.h-0.3,0.15);c.fill();return;}
  if(f.own==='furn-lamp'){c.fillStyle='rgba(255,214,120,.22)';c.beginPath();c.arc(f.x,f.y,1.2,0,TAU);c.fill();c.fillStyle='#3A3A3A';c.beginPath();c.arc(f.x,f.y,0.12,0,TAU);c.fill();c.fillStyle='#F2D38A';c.beginPath();c.arc(f.x,f.y,0.26,0,TAU);c.fill();c.strokeStyle='rgba(0,0,0,.25)';c.lineWidth=0.04;c.stroke();return;}
  if(f.own==='furn-rug'){c.fillStyle='#8C3A32';rrect(c,x,y,f.w,f.h,0.08);c.fill();c.strokeStyle='#E8D9B5';c.lineWidth=0.06;rrect(c,x+0.12,y+0.12,f.w-0.24,f.h-0.24,0.05);c.stroke();c.fillStyle='#2F6B4F';for(let i=0;i<3;i++){c.beginPath();c.arc(x+0.45+i*0.4,f.y,0.09,0,TAU);c.fill();}return;}
  if(f.own==='furn-samovar'){c.fillStyle='#C9A13B';c.beginPath();c.arc(f.x,f.y,0.22,0,TAU);c.fill();c.fillStyle='#8A6A1E';c.beginPath();c.arc(f.x,f.y,0.1,0,TAU);c.fill();c.fillStyle='#F4E6B0';c.beginPath();c.arc(f.x-0.07,f.y-0.07,0.05,0,TAU);c.fill();}}

// ---------- окно «Сезон и мои вещи» ----------
function seasonCard(box,noBtn){const S=seasonData();if(!S)return;const el=document.createElement('div');el.className='rt-card season-card';
  if(seasonOn()){const st=seasonState();const L=S.levels[st.lvl];const h=document.createElement('b');h.textContent=`❄️ ${S.title} · уровень ${st.lvl} из ${S.levels.length}`;
    const bar=document.createElement('div');bar.className='season-bar';const fill=document.createElement('i');fill.style.width=(L?Math.round(st.xp/(L.xp||100)*100):100)+'%';bar.append(fill);
    const t=document.createElement('span');t.textContent=L?`${st.xp} из ${L.xp} опыта до уровня ${L.lvl}: ${L.free&&L.free.money?fmtMoney(L.free.money):''}${shopItem(L.free&&L.free.item)?' и «'+shopItem(L.free.item).title+'»':''}`:'Все уровни пройдены';
    el.append(h,bar,t);if(!noBtn){const b=document.createElement('button');b.className='btn';b.textContent='Награды и мои вещи';b.addEventListener('click',()=>{closeQuests();openSeason();});el.append(b);}}
  else if(seasonSoon()){const h=document.createElement('b');h.textContent=`❄️ Скоро: ${S.title}`;const t=document.createElement('span');
    t.textContent=`С ${fmtDay(S.from)} по ${fmtDay(S.to)}: опыт за задания дня, вечерние события и дни подряд. ${S.levels.length} уровней — деньги, шапки, шарфы, рамки имени.`;el.append(h,t);}
  else return;box.append(el);}
function fmtDay(d){const m=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];const [y,mo,da]=d.split('-').map(Number);return da+' '+m[mo-1];}
function openSeason(){const S=seasonData();const box=$('#seasonList');box.innerHTML='';const on=seasonOn();const st=seasonState();
  $('#seasonTitle').textContent=S?`❄️ ${S.title}`:'Мои вещи';
  $('#seasonSub').textContent=!S?'':on?`До ${fmtDay(S.to)}. Уровень ${st.lvl} из ${S.levels.length}. Опыт — за задания дня, все три задания, вечерние события, дни подряд, новые районы и значки.`
    :seasonSoon()?`Начнётся ${fmtDay(S.from)}. Опыт — за задания дня, вечерние события и дни подряд.`:mskDate()>S.to?'Сезон закончился. Вещи остаются с вами.':`С ${fmtDay(S.from)} по ${fmtDay(S.to)}.`;
  if(on)seasonCard(box,true);
  // мои вещи — одной строкой: что это и кнопка
  const inv=invList().map(shopItem).filter(Boolean);const wh=document.createElement('h3');wh.className='sub';wh.textContent=`Мои вещи${inv.length?' ('+inv.length+')':''}`;box.append(wh);
  if(!inv.length){const p=document.createElement('p');p.className='hint';p.textContent=S?`Пока вещей нет. Они приходят за уровни сезона «${S.title}».`:'Пока вещей нет.';box.append(p);}
  const order=['hat','scarf','glasses','bag','frame','top','car','furniture','car-model'];inv.sort((a,b)=>order.indexOf(WEAR_SLOT[a.kind]||a.kind)-order.indexOf(WEAR_SLOT[b.kind]||b.kind));
  for(const it of inv){const slot=WEAR_SLOT[it.kind];const el=document.createElement('div');el.className='wear-row';const on2=slot&&wearState()[slot]===it.id;
    const sw=document.createElement('i');sw.style.background=itemColor(it)||'transparent';const tx=document.createElement('div');const h=document.createElement('b');h.textContent=(on2?'✅ ':'')+it.title;
    const t=document.createElement('span');t.textContent=(SLOT_RU[slot||it.kind]||'')+(it.kind==='furniture'?' · стоит в вашей квартире':'')+(it.kind==='car-model'?' · появится позже':'');tx.append(h,t);el.append(sw,tx);
    if(slot){const b=document.createElement('button');b.className='btn';b.textContent=on2?'Снять':'Надеть';b.addEventListener('click',()=>{if(on2)wearOff(slot);else wearPut(it.id);openSeason();});el.append(b);}
    box.append(el);}
  // уровни
  if(S){const lh=document.createElement('h3');lh.className='sub';lh.textContent=`Уровни (${S.levels.length})`;box.append(lh);
    const paid=PLATFORM.canPay||st.paid;
    for(const L of S.levels){const el=document.createElement('div');el.className='season-lvl'+(st.lvl>=L.lvl?' got':st.lvl+1===L.lvl?' next':'');const it=shopItem(L.free&&L.free.item);const pit=paid&&L.paid?shopItem(L.paid.item):null;
      el.textContent=`${st.lvl>=L.lvl?'✅ ':''}${L.lvl}. ${L.free&&L.free.money?fmtMoney(L.free.money):''}${it?' · '+it.title:''}${pit?' · платно: '+pit.title:''} — ${L.xp} опыта`;box.append(el);}}
  $('#seasonModal').hidden=false;player.busy=true;}
function closeSeason(){$('#seasonModal').hidden=true;player.busy=false;}
function seasonBind(){const c=$('#seasonClose');if(c)c.addEventListener('click',closeSeason);const b=$('#wearBtn');if(b)b.addEventListener('click',()=>{const m=$('#menuModal');if(m)m.hidden=true;openSeason();});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',seasonBind);else seasonBind();
