// ===== Движок заданий, значков, вечерних событий и районов =====
// Данные пишет второй программист: quests.js (cityQuests, cityAchievements), daily.js (cityDaily), districts.js (cityDistricts).
// Здесь — только учёт: что игрок сделал (метро, автобус, кафе, разговор, помощь…), задания дня, значки, вечерние сборы, «вы в районе …».
// Учёт подключается обёртками вокруг уже существующих функций игры — чужие файлы не правим.
const PROG_KEY='zk.prog';
const PROG=(()=>{let s=null;try{s=JSON.parse(localStorage.getItem(PROG_KEY)||'null');}catch(e){}
  s=s&&typeof s==='object'?s:{};s.c=s.c||{};s.metroSt=s.metroSt||[];s.folk=s.folk||[];s.ach=s.ach||{};s.days=s.days||{last:'',streak:0,total:0};s.q=s.q||{day:'',ids:[],p:{},done:[]};s.ev=s.ev||{};s.seenD=s.seenD||[];return s;})();
function progSave(){try{localStorage.setItem(PROG_KEY,JSON.stringify(PROG));}catch(e){}}
function mskDate(){return new Date(Date.now()+3*3600e3).toISOString().slice(0,10);}   // сутки — по Москве

// ---------- учёт ----------
function cityTrack(kind,info){info=info||{};const add=info.n||1;PROG.c[kind]=(PROG.c[kind]||0)+add;
  if(kind==='metro'&&info.to&&!PROG.metroSt.includes(info.to))PROG.metroSt.push(info.to);
  if(kind==='talk'&&info.folk&&!PROG.folk.includes(info.folk))PROG.folk.push(info.folk);
  questsOn(kind,info,add);achCheck();progSave();}
window.cityTrack=cityTrack;
function hintsMatch(hints,info){if(!hints||!hints.length)return true;const hay=((info.name||'')+' '+(info.street||'')+' '+(info.kind||'')).toLowerCase();return hints.some(h=>hay.includes(String(h).toLowerCase()));}
function targetOk(q,info){const t=q.target;if(!t)return true;if(t.to&&info.to!==t.to)return false;if(t.folk&&info.folk!==t.folk)return false;if(t.hints&&!hintsMatch(t.hints,info))return false;return true;}

// ---------- задания дня: три в сутки, сложнее по мере игры ----------
function questLevel(){const d=PROG.days.total||1;return d<=2?1:d<=5?2:3;}
function questsRoll(){const day=mskDate();if(PROG.q.day===day)return;const list=(window.cityQuests||[]).filter(q=>q&&q.id);if(!list.length)return;
  const lvl=questLevel();let seed=0;for(const ch of day+(typeof myCid!=='undefined'?myCid:''))seed=(seed*31+ch.charCodeAt(0))>>>0;const rng=seeded(seed||1);
  const usable=list.filter(q=>q.check!=='metro'||!q.target||!q.target.to||(typeof metroStation==='function'&&(metroInit(),metroStation(q.target.to))));
  const pool=usable.filter(q=>(q.lvl||1)<=lvl);const top=pool.filter(q=>(q.lvl||1)===lvl);const pick3=[];
  const take=arr=>{const a=arr.slice();while(a.length&&pick3.length<3){const i=Math.floor(rng()*a.length);const q=a.splice(i,1)[0];if(!pick3.some(x=>x.check===q.check))pick3.push(q);}};
  take(top);take(pool);take(usable);
  PROG.q={day,ids:pick3.map(q=>q.id),p:{},done:[]};progSave();}
function questsToday(){questsRoll();const byId=new Map((window.cityQuests||[]).map(q=>[q.id,q]));return PROG.q.ids.map(id=>byId.get(id)).filter(Boolean);}
function questsOn(kind,info,add){questsRoll();for(const q of questsToday()){if(q.check!==kind||PROG.q.done.includes(q.id))continue;if(!targetOk(q,info))continue;
    PROG.q.p[q.id]=(PROG.q.p[q.id]||0)+add;if(PROG.q.p[q.id]>=(q.n||1))questDone(q);}}
function questDone(q){PROG.q.done.push(q.id);const r=q.reward||{};if(r.money)player.money+=r.money;if(r.mood)player.mood=clamp(player.mood+r.mood,0,100);
  const what=(r.money?`+${fmtMoney(r.money)}`:'')+(r.mood?` · настроение +${r.mood}`:'');addEvent(`🎯 Задание выполнено: «${q.title}» ${what}`,'say');
  if(window.cityPhone)window.cityPhone.push({from:'Задания',text:`«${q.title}» — готово. ${what}`,kind:'quest'});
  if(PROG.q.done.length===PROG.q.ids.length)setTimeout(()=>addEvent('🎯 Все задания на сегодня сделаны. Завтра будут новые','say'),1200);
  updateQuestBtn();}

// ---------- значки ----------
function achValue(a){if(a.id==='metro-all')return PROG.metroSt.length;if(a.check==='talk'&&/восем|все/i.test(a.title+a.text))return PROG.folk.length;
  if(a.check==='money')return Math.floor(player.money||0);if(a.check==='days')return PROG.days.streak||0;return PROG.c[a.check]||0;}
function achNeed(a){if(a.id==='metro-all')return typeof METRO_LINE!=='undefined'?METRO_LINE.filter(s=>s.ll).length:a.n||1;return a.n||1;}
function achCheck(){for(const a of window.cityAchievements||[]){if(PROG.ach[a.id])continue;if(achValue(a)>=achNeed(a)){PROG.ach[a.id]=Date.now();
  addEvent(`${a.icon||'🏅'} Новый значок: «${a.title}»`,'say');if(window.cityPhone)window.cityPhone.push({from:'Значки',text:`${a.icon||'🏅'} «${a.title}» — ${a.text||''}`,kind:'badge'});}}}
window.cityAchievementsState=function(){const out={};for(const a of window.cityAchievements||[])out[a.id]={done:!!PROG.ach[a.id],n:Math.min(achValue(a),achNeed(a))};return out;};

// ---------- дни подряд ----------
function daysTick(){const d=mskDate();const D=PROG.days;if(D.last===d)return;const y=new Date(Date.parse(d)-86400e3).toISOString().slice(0,10);
  D.streak=D.last===y?(D.streak||0)+1:1;D.last=d;D.total=(D.total||0)+1;progSave();achCheck();}

// ---------- вечерние события (cityDaily): напоминание за час, сбор в месте по подсказкам, награда за приход ----------
function gameDow(){return new Date(Date.UTC(2026,5,20)+((clock.day||1)-1)*86400e3).getUTCDay();}   // тот же календарь, что в телефоне
function placeByHints(hints){if(!world)return null;const hs=(hints||[]).map(h=>String(h).toLowerCase());if(!hs.length)return null;
  if(hs.some(h=>'кремль'.includes(h)||h.includes('кремл'))&&world.kremlin)return {x:world.kremlin.x,y:world.kremlin.y+60,n:'Казанский Кремль'};
  for(const s of world.squares||[])if(hs.some(h=>s.n.toLowerCase().includes(h)))return {x:s.x,y:s.y,n:s.n,sq:s};
  for(const p of world.pois)if(p.n&&hs.some(h=>p.n.toLowerCase().includes(h)))return {x:p.x,y:p.y,n:p.n};
  let best=null;for(const r of world.roads){if(!r.n||!hs.some(h=>r.n.toLowerCase().includes(h)))continue;const q=world.nodes[r.p[r.p.length>>1]];const d=dist(q[0],q[1],player.x,player.y);if(!best||d<best.d)best={x:q[0],y:q[1],n:r.n,d};}
  return best;}
const EVT={t:0,cur:null};
function eventsTick(dt){EVT.t-=dt;if(EVT.t>0||!world||typeof clock==='undefined')return;EVT.t=2;const list=window.cityDaily||[];if(!list.length)return;
  const dow=gameDow(),h=(clock.minutes/60)%24,key=d=>`${clock.day}:${d.dow}:${d.hour}`;
  for(const d of list){if(d.dow!==dow)continue;const k=key(d);const st=PROG.ev[k]||(PROG.ev[k]={});
    if(!st.remind&&h>=d.hour-1&&h<d.hour){st.remind=1;addEvent(`🌙 ${d.remind||('Через час — '+d.title)}`,'say');if(window.cityPhone)window.cityPhone.push({from:'Вечер',text:d.remind||d.title,kind:'event'});progSave();}
    if(h>=d.hour&&h<d.hour+2){if(!st.place){const pl=placeByHints(d.hints);if(!pl){st.place='none';continue;}st.place=[pl.x,pl.y,pl.n];progSave();
        mark(null,'event:'+k,pl.x,pl.y,'🌙',d.title,{arrow:true,color:'#7B61FF'});addEvent(`🌙 Начинается: ${d.title} — ${pl.n}`,'say');
        if(pl.sq&&typeof startRally==='function'){const kind=d.kind==='concert'?'concert':'meet';try{startRally(pl.sq,kind,d.title,'city');}catch(e){}}}
      if(Array.isArray(st.place)&&!st.got&&!player.inside&&dist(player.x,player.y,st.place[0],st.place[1])<60){st.got=1;const r=d.reward||{};if(r.money)player.money+=r.money;if(r.mood)player.mood=clamp(player.mood+r.mood,0,100);
        addEvent(`🌙 Вы на месте: ${d.title}. ${d.text||''} ${r.money?'+'+fmtMoney(r.money):''}`,'say');unmark('event:'+k);cityTrack('event',{name:d.title});}}
    if(h>=d.hour+2&&Array.isArray(st.place)&&!st.closed){st.closed=1;unmark('event:'+k);progSave();}}
  const keep=Object.keys(PROG.ev).filter(k=>+k.split(':')[0]>=(clock.day||1)-2);if(keep.length<Object.keys(PROG.ev).length){const n={};for(const k of keep)n[k]=PROG.ev[k];PROG.ev=n;}}

// ---------- районы: «Вы в районе …» и один факт ----------
const DIST={t:0,cur:null};
function districtsTick(dt){DIST.t-=dt;if(DIST.t>0||!world||player.inside||player.bus)return;DIST.t=4;const list=window.cityDistricts||[];if(!list.length)return;
  let found=null,bd=1e9;
  for(const d of list){if(Array.isArray(d.center)){const m=world.meta;const x=(d.center[1]-m.lon0)*m.mlon,y=-(d.center[0]-m.lat0)*m.mlat;const r=d.r||900;const dd=dist(x,y,player.x,player.y);if(dd<r&&dd<bd){bd=dd;found=d;}}}
  if(!found){const street=(nearestRoadName(player.x,player.y)||'').toLowerCase();const near=placesNear(player.x,player.y,120,6).map(p=>p.n.toLowerCase()).join(' ');const hay=street+' '+near;
    for(const d of list){if(Array.isArray(d.center))continue;if((d.hints||[]).some(h=>hay.includes(String(h).toLowerCase()))){found=d;break;}}}
  if(!found||found.id===DIST.cur)return;DIST.cur=found.id;
  if(!PROG.seenD.includes(found.id)){PROG.seenD.push(found.id);progSave();const f=(found.facts||[])[Math.floor(Math.random()*(found.facts||[]).length)];
    addEvent(`📍 ${found.name}${f?'. '+f:''}`,'say');}
  else{const l=(found.lines||[])[Math.floor(Math.random()*(found.lines||[]).length)];setHint(`📍 ${found.name}${l?' — '+l:''}`);}}

// ---------- шаги пешком ----------
const WALK={x:null,y:null,acc:0,t:0};
function walkTick(dt){WALK.t-=dt;if(WALK.t>0)return;WALK.t=1;const onFoot=!player.vehicle&&!player.bus&&!player.inside&&player.state!=='hurt';
  if(WALK.x!=null&&onFoot){const d=dist(WALK.x,WALK.y,player.x,player.y);if(d>0.3&&d<12)WALK.acc+=d;}
  WALK.x=player.x;WALK.y=player.y;if(WALK.acc>=50){const n=Math.floor(WALK.acc);WALK.acc-=n;cityTrack('walk',{n});}
  if((player.money||0)>=1000&&PROG.lastMoney!==Math.floor(player.money/1000)){PROG.lastMoney=Math.floor(player.money/1000);achCheck();}}

// ---------- обёртки вокруг игровых функций ----------
const ENG={quiet:false};
function wrap(name,after,before){const f=window[name];if(typeof f!=='function')return;window[name]=function(...a){const pre=before?before.apply(this,a):undefined;const r=f.apply(this,a);try{after&&after.call(this,r,a,pre);}catch(e){console.warn('engine',name,e);}return r;};}
// где игрок: улица, площади в 300 м и места рядом — по этому ищутся подсказки заданий («у площади Свободы», «на Баумана»)
function placeInfo(name,kind){if(!world)return {name:name||'',kind:kind||'',street:''};const x=player.x,y=player.y;const parts=[nearestRoadName(x,y)||''];
  for(const s of world.squares||[])if(dist(s.x,s.y,x,y)<300)parts.push(s.n);
  if(world.kremlin&&dist(world.kremlin.x,world.kremlin.y,x,y)<500)parts.push('Кремль');
  for(const p of placesNear(x,y,120,6))parts.push(p.n);return {name:name||'',kind:kind||'',street:parts.join(' ')};}
function engineInit(){
  wrap('metroArrive',(r,a,pre)=>{if(pre)cityTrack('metro',{to:pre});},()=>METRO.ride&&METRO.ride.to);
  wrap('boardBus',()=>cityTrack('bus'));
  wrap('taxiExit',()=>cityTrack('taxi'));
  wrap('placeOrder',(r,a,pre)=>{if(pre&&player.money<pre.m)cityTrack('eat',placeInfo(pre.n,pre.k));},()=>orderCtx?{m:player.money,n:orderCtx.it.name,k:orderCtx.it.kind}:null);
  wrap('enterInterior',(r,a)=>{const s=a[0]||{};if(s.kind!=='metro'&&s.kind!=='home')cityTrack('visit',placeInfo(s.name,s.kind));});
  wrap('openBank',(r,a)=>{if(a[0]==='atm')cityTrack('atm');});
  wrap('openChat',(r,a)=>{const w=a[0];if(w&&w.folk)cityTrack('talk',{folk:w.folk});});
  wrap('sitRep',(r,a)=>{if(a[0]>0&&!ENG.quiet)cityTrack('help');});
  wrap('netSend',(r,a)=>{if(r)cityTrack('chat',{to:a[0]||''});});
  wrap('shiftEnd',(r,a)=>{ENG.quiet=false;const j=a[0];if(j&&j.len&&j.present/(j.len*60)>=0.7)cityTrack('work');},()=>{ENG.quiet=true;});   // репутация за смену — не «помощь»
  if(typeof window.cityOnInvite==='function')wrap('cityOnInvite',(r,a)=>{if(a[0]==='invited')cityTrack('friends');});
  daysTick();questsRoll();updateQuestBtn();}
function engineTick(dt){walkTick(dt);eventsTick(dt);districtsTick(dt);}

// ---------- окно «Задания» ----------
function updateQuestBtn(){const b=$('#questBtn');if(!b)return;const n=PROG.q.ids.length-PROG.q.done.length;b.textContent=n>0?'🎯'+n:'🎯';b.title=n>0?`Задания на сегодня: осталось ${n}`:'Задания на сегодня сделаны';}
function openQuests(){questsRoll();const box=$('#qList');box.innerHTML='';
  for(const q of questsToday()){const done=PROG.q.done.includes(q.id);const n=Math.min(PROG.q.p[q.id]||0,q.n||1);const el=document.createElement('div');el.className='rt-card';
    const h=document.createElement('b');h.textContent=(done?'✅ ':'🎯 ')+q.title;const t=document.createElement('span');t.textContent=q.text||'';
    const p=document.createElement('span');const r=q.reward||{};p.textContent=(done?'Готово':`${q.check==='walk'?Math.round(n)+' из '+q.n+' м':n+' из '+(q.n||1)}`)+' · награда '+(r.money?fmtMoney(r.money):'')+(r.mood?' и настроение':'');
    el.append(h,t,p);box.append(el);}
  if(!box.children.length){const p=document.createElement('p');p.className='hint';p.textContent='Заданий пока нет.';box.append(p);}
  const got=Object.keys(PROG.ach).length,all=(window.cityAchievements||[]).length;$('#qAch').textContent=all?`Значков: ${got} из ${all} — список в «Сегодня» → «Значки». Дней подряд: ${PROG.days.streak||1}.`:'';
  $('#questModal').hidden=false;player.busy=true;}
function closeQuests(){$('#questModal').hidden=true;player.busy=false;}
function questBind(){const b=$('#questBtn');if(b)b.addEventListener('click',openQuests);const c=$('#qClose');if(c)c.addEventListener('click',closeQuests);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',questBind);else questBind();
