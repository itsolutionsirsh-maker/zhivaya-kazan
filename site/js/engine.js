// ===== Движок заданий, значков, вечерних событий и районов =====
// Данные пишет второй программист: quests.js (cityQuests, cityAchievements), daily.js (cityDaily), districts.js (cityDistricts).
// Здесь — только учёт: что игрок сделал (метро, автобус, кафе, разговор, помощь…), задания дня, значки, вечерние сборы, «вы в районе …».
// Учёт подключается обёртками вокруг уже существующих функций игры — чужие файлы не правим.
const PROG_KEY='zk.prog';
const PROG=(()=>{let s=null;try{s=JSON.parse(localStorage.getItem(PROG_KEY)||'null');}catch(e){}
  s=s&&typeof s==='object'?s:{};s.c=s.c||{};s.metroSt=s.metroSt||[];s.folk=s.folk||[];s.ach=s.ach||{};s.days=s.days||{last:'',streak:0,total:0};s.q=s.q||{day:'',ids:[],p:{},done:[]};s.ev=s.ev||{};s.seenD=s.seenD||[];s.seenA=s.seenA||[];return s;})();
function progSave(){try{localStorage.setItem(PROG_KEY,JSON.stringify(PROG));}catch(e){}}
function mskDate(){return typeof window.zkTestDay==='string'?window.zkTestDay:new Date(Date.now()+3*3600e3).toISOString().slice(0,10);}   // сутки — по Москве (zkTestDay — подставить дату для проверки из консоли)

// ---------- учёт ----------
function cityTrack(kind,info){info=info||{};const add=info.n||1;PROG.c[kind]=(PROG.c[kind]||0)+add;
  if(kind==='metro'&&info.to&&!PROG.metroSt.includes(info.to))PROG.metroSt.push(info.to);
  if(kind==='talk'&&info.folk&&!PROG.folk.includes(info.folk))PROG.folk.push(info.folk);
  tutOn(kind,info,add);questsOn(kind,info,add);achCheck();progSave();}
window.cityTrack=cityTrack;
function hintsMatch(hints,info){if(!hints||!hints.length)return true;const hay=((info.name||'')+' '+(info.street||'')+' '+(info.kind||'')).toLowerCase();return hints.some(h=>hay.includes(String(h).toLowerCase()));}
function targetOk(q,info){const t=q.target;if(!t)return true;if(t.to&&info.to!==t.to)return false;if(t.folk&&info.folk!==t.folk)return false;if(t.hints&&!hintsMatch(t.hints,info))return false;return true;}

// ---------- первые шаги (tutorial.js → cityTutorial): по одному шагу, пока новичок не освоится ----------
function tutList(){return (window.cityTutorial||[]).filter(t=>t&&t.id);}
function tutActive(){const L=tutList();if(!L.length)return false;PROG.tut=PROG.tut||{i:0,p:0,end:false};
  if(!PROG.tut.started&&(PROG.days.total||1)>2){PROG.tut.end=true;}   // давно играет — обучение не навязываем
  return !PROG.tut.end&&PROG.tut.i<L.length;}
function tutStep(){return tutActive()?tutList()[PROG.tut.i]:null;}
function tutShow(){if(window.cityObjectives)return;const t=tutStep();if(!t)return;PROG.tut.started=true;setHint(`👣 Шаг ${PROG.tut.i+1} из ${tutList().length}: ${t.title}. ${t.text||''}`);updateQuestBtn();}
function tutOn(kind,info,add){const t=tutStep();if(!t||t.check!==kind||!targetOk(t,info))return;PROG.tut.p+=add;if(PROG.tut.p<(t.n||1))return;
  player.money+=50;addEvent(`👣 Готово: «${t.title}» +${fmtMoney(50)}`,'say');tutNext();}
// шаг «вечер» ждёт, только если сбор уже идёт или начнётся в ближайший игровой час (≈15 минут);
// иначе вечера ждать часами — говорим, когда приходить, и идём дальше без награды за этот шаг
function tutEventCheck(){const t=tutStep();if(!t||t.check!=='event'||!world||typeof clock==='undefined')return;const L=eveningsToday();if(L.some(e=>e.t>=-1&&e.t<2&&(!PROG.ev[evKey(e.d)]||PROG.ev[evKey(e.d)].show&&!PROG.ev[evKey(e.d)].got)))return;
  const h=(clock.minutes/60)%24,next=L.filter(e=>e.d.hour>h).sort((a,b)=>a.d.hour-b.d.hour)[0];
  addEvent(next?`🌙 Вечер сегодня в ${next.d.hour}:00 — «${next.d.title}». Он в «Сегодня» наверху, приходите`:'🌙 Сегодняшние вечера уже прошли. Завтрашние появятся в «Сегодня» наверху','say');tutNext();}
function tutNext(){PROG.tut.i++;PROG.tut.p=0;progSave();
  if(PROG.tut.i>=tutList().length){PROG.tut.end=true;player.money+=300;addEvent(`🎉 Первые шаги пройдены, +${fmtMoney(300)}. Дальше — задания дня 🎯 и навигатор 🧭`,'say');updateQuestBtn();}
  else setTimeout(tutShow,1500);}

// ---------- задания дня: три в сутки, сложнее по мере игры ----------
function questLevel(){const d=PROG.days.total||1;return d<=2?1:d<=5?2:3;}
function questsRoll(){const day=mskDate();if(PROG.q.day===day)return;const list=(window.cityQuests||[]).filter(q=>q&&q.id);if(!list.length)return;
  const lvl=questLevel();let seed=0;for(const ch of day+(typeof myCid!=='undefined'?myCid:''))seed=(seed*31+ch.charCodeAt(0))>>>0;const rng=seeded(seed||1);
  const usable=list.filter(q=>(!q.season||seasonOn(q.season))&&(q.check!=='metro'||!q.target||!q.target.to||(typeof metroStation==='function'&&(metroInit(),metroStation(q.target.to)))));
  const pool=usable.filter(q=>(q.lvl||1)<=lvl);const top=pool.filter(q=>(q.lvl||1)===lvl);const pick3=[];
  const take=(arr,max)=>{const a=arr.slice();max=max||3;while(a.length&&pick3.length<max){const i=Math.floor(rng()*a.length);const q=a.splice(i,1)[0];if(!pick3.some(x=>x.check===q.check))pick3.push(q);}};
  take(pool.filter(q=>q.season),2);   // в сезон два задания из трёх — сезонные (за них опыт сезона), третье — обычное
  take(top);take(pool);take(usable);
  PROG.q={day,ids:pick3.map(q=>q.id),p:{},done:[]};progSave();}
function questsToday(){questsRoll();const byId=new Map((window.cityQuests||[]).map(q=>[q.id,q]));return PROG.q.ids.map(id=>byId.get(id)).filter(Boolean);}
function questsOn(kind,info,add){questsRoll();for(const q of questsToday()){if(q.check!==kind||PROG.q.done.includes(q.id))continue;if(!targetOk(q,info))continue;
    PROG.q.p[q.id]=(PROG.q.p[q.id]||0)+add;if(PROG.q.p[q.id]>=(q.n||1))questDone(q);}}
function questDone(q){PROG.q.done.push(q.id);const r=q.reward||{};if(r.money)player.money+=r.money;if(r.mood)player.mood=clamp(player.mood+r.mood,0,100);
  const xp=seasonXP(q.xp||SEASON_XP.quest,null,true);
  const what=(r.money?`+${fmtMoney(r.money)}`:'')+(r.mood?` · настроение +${r.mood}`:'')+(xp?` · ❄️ +${xp} опыта`:'');addEvent(`🎯 Задание выполнено: «${q.title}» ${what}`,'say');
  if(window.cityPhone)window.cityPhone.push({from:'Задания',text:`«${q.title}» — готово. ${what}`,kind:'quest'});
  if(PROG.q.done.length===PROG.q.ids.length)setTimeout(()=>{addEvent('🎯 Все задания на сегодня сделаны. Завтра будут новые','say');seasonXP(SEASON_XP.allDay,'все задания дня');},1200);
  updateQuestBtn();}

// ---------- значки ----------
function adminIds(){return new Set((window.cityDistricts||[]).filter(d=>d.kind==='admin').map(d=>d.id));}
function achValue(a){if(a.id==='metro-all')return PROG.metroSt.length;if(a.check==='districts'){const A=adminIds();return new Set(PROG.seenA.concat(PROG.seenD).filter(id=>A.has(id))).size;}if(a.check==='talk'&&/восем|все/i.test(a.title+a.text))return PROG.folk.length;
  if(a.check==='money')return Math.floor(player.money||0);if(a.check==='days')return PROG.days.streak||0;return PROG.c[a.check]||0;}
function achNeed(a){if(a.id==='metro-all')return typeof METRO_LINE!=='undefined'?METRO_LINE.filter(s=>s.ll).length:a.n||1;if(a.check==='districts'&&a.all)return adminIds().size||a.n||1;return a.n||1;}
function achCheck(){for(const a of window.cityAchievements||[]){if(PROG.ach[a.id])continue;if(achValue(a)>=achNeed(a)){PROG.ach[a.id]=Date.now();seasonXP(SEASON_XP.badge,'новый значок');
  addEvent(`${a.icon||'🏅'} Новый значок: «${a.title}»`,'say');if(window.cityPhone)window.cityPhone.push({from:'Значки',text:`${a.icon||'🏅'} «${a.title}» — ${a.text||''}`,kind:'badge'});}}}
window.cityAchievementsState=function(){const out={};for(const a of window.cityAchievements||[])out[a.id]={done:!!PROG.ach[a.id],n:Math.min(achValue(a),achNeed(a))};return out;};

// ---------- дни подряд ----------
function daysTick(){const d=mskDate();const D=PROG.days;if(D.last===d)return;const y=new Date(Date.parse(d)-86400e3).toISOString().slice(0,10);
  D.streak=D.last===y?(D.streak||0)+1:1;D.last=d;D.total=(D.total||0)+1;progSave();achCheck();
  setTimeout(()=>seasonXP(SEASON_XP.day+SEASON_XP.streak*Math.min(7,D.streak-1),D.streak>1?`${D.streak}-й день подряд`:'день в городе'),5000);}

// ---------- вечерние события (cityDaily): напоминание за час, сбор в месте по подсказкам, награда за приход ----------
function gameDow(){return new Date(Date.UTC(2026,5,20)+((clock.day||1)-1)*86400e3).getUTCDay();}   // тот же календарь, что в телефоне
function placeByHints(hints){if(!world)return null;const hs=(hints||[]).map(h=>String(h).toLowerCase());if(!hs.length)return null;
  if(hs.some(h=>'кремль'.includes(h)||h.includes('кремл'))&&world.kremlin)return {x:world.kremlin.x,y:world.kremlin.y+60,n:'Казанский Кремль'};
  for(const s of world.squares||[])if(hs.some(h=>s.n.toLowerCase().includes(h)))return {x:s.x,y:s.y,n:s.n,sq:s};
  for(const p of world.pois)if(p.n&&hs.some(h=>p.n.toLowerCase().includes(h)))return {x:p.x,y:p.y,n:p.n};
  let best=null;for(const r of world.roads){if(!r.n||!hs.some(h=>r.n.toLowerCase().includes(h)))continue;const q=world.nodes[r.p[r.p.length>>1]];const d=dist(q[0],q[1],player.x,player.y);if(!best||d<best.d)best={x:q[0],y:q[1],n:r.n,d};}
  return best;}
const EVT={t:0,cur:null};
function evKey(d){return (d.date?`d:${d.date}:${d.hour}`:`${clock.day}:${d.dow}:${d.hour}`)+':'+d.title;}
// вечера сегодня (сезонные — в сезон, разовые — в свой день): {d, t — сколько игровых часов прошло с начала, от −12 до 12}
function eveningsToday(){const dow=gameDow(),h=(clock.minutes/60)%24,today=mskDate(),out=[];
  for(const d of window.cityDaily||[]){if(d.season&&!seasonOn(d.season))continue;if(d.date?d.date!==today:d.dow!==dow)continue;let t=h-d.hour;if(t<-12)t+=24;out.push({d,t});}return out;}
function evPlace(d){if(Array.isArray(d.at)){const q=llToXY(d.at);return {x:q[0],y:q[1],n:d.place||d.title};}return placeByHints(d.hints);}
function eventsTick(dt){EVT.t-=dt;if(EVT.t>0||!world||typeof clock==='undefined')return;EVT.t=2;const list=window.cityDaily||[];if(!list.length)return;
  const dow=gameDow(),h=(clock.minutes/60)%24,today=mskDate(),key=evKey;
  // сезонные вечера — только в сезон; обычный вечер в тот же день и час в том же месте (общие подсказки) уступает сезонному;
  // разовый вечер (date) — в этот день по Москве, в свой час игрового времени, один раз.
  // Первый обычный вечер дня (общий, в центре), сезонные и разовые видны всем; районные — только тем, кто в 4 км от места.
  const seas=list.filter(d=>d.season&&seasonOn(d.season)&&d.dow===dow);let first=true;const live=new Set();
  for(const d of list){if(d.season&&!seasonOn(d.season))continue;if(d.date?d.date!==today:d.dow!==dow)continue;
    const plain=!d.season&&!d.date,main=!plain||first;if(plain)first=false;
    if(plain&&seas.some(s=>s.hour===d.hour&&(s.hints||[]).some(x=>(d.hints||[]).includes(x))))continue;
    const k=key(d);let t=h-d.hour;if(t<-12)t+=24;if(t<-1||t>=2)continue;live.add(k);const st=PROG.ev[k]||(PROG.ev[k]={});
    if(st.show===undefined){const pl=evPlace(d);st.place=pl?[pl.x,pl.y,pl.n]:'none';st.show=!!pl&&(main||dist(player.x,player.y,pl.x,pl.y)<4000);progSave();}
    if(!st.show)continue;
    if(!st.remind&&t<0){st.remind=1;addEvent(`🌙 ${d.remind||('Через час — '+d.title)}`,'say');if(window.cityPhone)window.cityPhone.push({from:'Вечер',text:d.remind||d.title,kind:'event'});progSave();}
    if(t<0)continue;
    if(!st.on){st.on=1;progSave();const p=st.place;mark(null,'event:'+k,p[0],p[1],'🌙',d.title,{arrow:true,color:'#7B61FF'});addEvent(`🌙 Начинается: ${d.title} — ${p[2]}`,'say');
      const pl=Array.isArray(d.at)?null:evPlace(d);if(pl&&pl.sq&&typeof startRally==='function'){const kind=d.kind==='concert'?'concert':'meet';try{startRally(pl.sq,kind,d.title,'city');}catch(e){}}}
    if(!st.got&&!player.inside&&dist(player.x,player.y,st.place[0],st.place[1])<60){st.got=1;const r=d.reward||{};if(r.money)player.money+=r.money;if(r.mood)player.mood=clamp(player.mood+r.mood,0,100);
      const xp=seasonXP(d.xp||SEASON_XP.evening,null,true);
      addEvent(`🌙 Вы на месте: ${d.title}. ${d.text||''} ${r.money?'+'+fmtMoney(r.money):''}${xp?' · ❄️ +'+xp+' опыта':''}`,'say');unmark('event:'+k);cityTrack('event',{name:d.title});progSave();}}
  // кончился (или сменились сутки) — убрать метку
  for(const k in PROG.ev){const st=PROG.ev[k];if(st.on&&!st.closed&&!live.has(k)){st.closed=1;unmark('event:'+k);progSave();}}
  const keep=Object.keys(PROG.ev).filter(k=>k.startsWith('d:')?k.slice(2,12)>=today:+k.split(':')[0]>=(clock.day||1)-2);if(keep.length<Object.keys(PROG.ev).length){const n={};for(const k of keep)n[k]=PROG.ev[k];PROG.ev=n;}}

// что сейчас в городе по данным игры — житель может упомянуть в разговоре: сезон, сегодняшние вечера, матчи и праздники
function cityNewsForNpc(){const out=[];const S=typeof seasonData==='function'?seasonData():null;if(S&&seasonOn())out.push(`в городе сезон «${S.title}»`);
  const dow=gameDow(),today=mskDate(),list=window.cityDaily||[];const plain=list.find(d=>!d.season&&!d.date&&d.dow===dow);
  const ev=list.filter(d=>(d.season&&seasonOn(d.season)&&(d.date?d.date===today:d.dow===dow))||(d.date&&!d.season&&d.date===today));if(plain)ev.push(plain);
  if(ev.length)out.push('сегодня вечером: '+ev.slice(0,3).map(d=>`${d.title} в ${d.hour}:00`).join(', '));
  const fx=(window.cityFixtures||[]).filter(f=>f.date===today);if(fx.length)out.push('сегодня: '+fx.slice(0,2).map(f=>f.title+(f.time?' в '+f.time:'')).join(', '));
  return out.join('; ');}

// ---------- районы: «Вы в районе …» и один факт (districts.js: жилые места с center, административные с kind:'admin') ----------
const DIST={t:0,cur:null,adm:null};
function llToXY(ll){const m=world.meta;return [(ll[1]-m.lon0)*m.mlon,-(ll[0]-m.lat0)*m.mlat];}
function districtsTick(dt){DIST.t-=dt;if(DIST.t>0||!world||player.inside||player.bus)return;DIST.t=4;const list=window.cityDistricts||[];if(!list.length)return;
  let found=null,bd=1e9;const exact=window.TerritoryRules?TerritoryRules.at(player.x,player.y,world.meta):null;const admin=exact?list.find(d=>d.id===exact.id):null;DIST.adm=admin?admin.id:null;
  if(admin&&!PROG.seenA.includes(admin.id)){PROG.seenA.push(admin.id);progSave();achCheck();}
  for(const d of list){if(!Array.isArray(d.center))continue;const [x,y]=llToXY(d.center);const dd=dist(x,y,player.x,player.y);
    if(d.kind!=='admin'&&(!d.parent||admin&&d.parent===admin.id)&&dd<(d.r||1200)&&dd<bd){bd=dd;found=d;}}
  if(!found){const street=(nearestRoadName(player.x,player.y)||'').toLowerCase();const near=placesNear(player.x,player.y,120,6).map(p=>p.n.toLowerCase()).join(' ');const hay=street+' '+near;
    for(const d of list){if(d.kind==='admin'||Array.isArray(d.center)||(d.parent&&(!admin||d.parent!==admin.id)))continue;if((d.hints||[]).some(h=>hay.includes(String(h).toLowerCase()))){found=d;break;}}}
  const cur=found||admin;if(!cur){DIST.cur=null;return;}if(cur.id===DIST.cur)return;DIST.cur=cur.id;
  const where=found?found.name+(admin&&admin!==found?' · '+admin.name:''):admin.name;
  if(!PROG.seenD.includes(cur.id)){PROG.seenD.push(cur.id);progSave();seasonXP(SEASON_XP.district,'новый район');const f=(cur.facts||[])[Math.floor(Math.random()*(cur.facts||[]).length)];
    addEvent(`📍 ${where}${f?'. '+f:''}`,'say');}
  else{const l=(cur.lines||[])[Math.floor(Math.random()*(cur.lines||[]).length)];setHint(`📍 ${where}${l?' — '+l:''}`);}}

// ---------- матчи и праздники (fixtures.js): в день события — в ленту «Сегодня» и в новости ----------
function fixturesTick(){const list=window.cityFixtures||[];if(!list.length)return;const today=mskDate();const tom=new Date(Date.parse(today)+86400e3).toISOString().slice(0,10);
  PROG.fx=PROG.fx||{};
  for(const f of list){if(f.date!==today&&f.date!==tom)continue;const k=f.date+f.title;if(PROG.fx[k])continue;PROG.fx[k]=1;
    const when=f.date===today?'Сегодня':'Завтра';const pl=f.kind==='match'&&world?placeByHints(f.hints):null;
    const text=`${when}${f.time?' в '+f.time:''}: ${f.title}${pl?' — '+pl.n:''}`;addEvent(`${f.kind==='match'?'⚽':'🎉'} ${text}`,'say');
    if(window.cityPhone)window.cityPhone.push({from:f.kind==='match'?'Матч':'Праздник',text,kind:'fixture'});}
  for(const k of Object.keys(PROG.fx))if(k.slice(0,10)<today)delete PROG.fx[k];progSave();}

// ---------- шаги пешком ----------
const WALK={x:null,y:null,acc:0,t:0};
function walkTick(dt){WALK.t-=dt;if(WALK.t>0)return;WALK.t=1;const onFoot=!player.vehicle&&!player.bus&&!player.inside&&player.state!=='hurt';
  if(WALK.x!=null&&onFoot){const d=dist(WALK.x,WALK.y,player.x,player.y);if(d>0.3&&d<12)WALK.acc+=d;}
  WALK.x=player.x;WALK.y=player.y;if(WALK.acc>=50){const n=Math.floor(WALK.acc);WALK.acc-=n;cityTrack('walk',{n});}
  // дошёл до Кремля пешком — это тоже «побывал у Кремля» (шаг обучения, задание дня), даже если ни в одно здание не зашёл
  if(onFoot&&world&&world.kremlin){const d=dist(world.kremlin.x,world.kremlin.y,player.x,player.y);if(d<350&&!WALK.kr){WALK.kr=1;cityTrack('visit',{name:'Казанский Кремль',kind:'landmark',street:'Кремль'});}else if(d>800)WALK.kr=0;}
  tutEventCheck();
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
  daysTick();questsRoll();updateQuestBtn();setTimeout(fixturesTick,4000);setTimeout(tutShow,6000);}
function engineTick(dt){walkTick(dt);eventsTick(dt);districtsTick(dt);}

// ---------- окно «Задания» ----------
function updateQuestBtn(){const b=$('#questBtn');if(!b)return;if(tutActive()){b.textContent='👣'+(PROG.tut.i+1);b.title='Первые шаги';return;}const n=PROG.q.ids.length-PROG.q.done.length;b.textContent=n>0?'🎯'+n:'🎯';b.title=n>0?`Задания на сегодня: осталось ${n}`:'Задания на сегодня сделаны';}
function openQuests(){questsRoll();const box=$('#qList');box.innerHTML='';const sb=$('#qSeason');if(sb){sb.innerHTML='';if(!tutActive())seasonCard(sb);}
  $('#qTitle').textContent=tutActive()?'Первые шаги':'Задания на сегодня';$('#qSub').textContent=tutActive()?`${tutList().length} коротких шагов, чтобы освоиться в городе. За каждый — немного денег.`:'Три задания в сутки (по Москве). Чем дольше играете, тем интереснее.';
  if(tutActive()){const L=tutList();L.forEach((t,i)=>{const el=document.createElement('div');el.className='rt-card';const h=document.createElement('b');h.textContent=(i<PROG.tut.i?'✅ ':i===PROG.tut.i?'👣 ':'· ')+t.title;const x=document.createElement('span');x.textContent=i===PROG.tut.i?(t.text||''):'';el.append(h,x);if(i>PROG.tut.i)el.style.opacity='.5';box.append(el);});
    const sk=document.createElement('button');sk.className='btn';sk.textContent='Пропустить обучение';sk.addEventListener('click',()=>{PROG.tut.end=true;progSave();updateQuestBtn();openQuests();});box.append(sk);
    $('#qAch').textContent='Пройдите первые шаги — потом каждый день будут три задания.';$('#questModal').hidden=false;player.busy=true;return;}
  for(const q of questsToday()){const done=PROG.q.done.includes(q.id);const n=Math.min(PROG.q.p[q.id]||0,q.n||1);const el=document.createElement('div');el.className='rt-card';
    const h=document.createElement('b');h.textContent=(done?'✅ ':'🎯 ')+q.title;const t=document.createElement('span');t.textContent=q.text||'';
    const p=document.createElement('span');const r=q.reward||{};p.textContent=(done?'Готово':`${q.check==='walk'?Math.round(n)+' из '+q.n+' м':n+' из '+(q.n||1)}`)+' · награда '+(r.money?fmtMoney(r.money):'')+(r.mood?' и настроение':'')+(seasonOn()?` · ❄️ ${q.xp||SEASON_XP.quest} опыта`:'');
    el.append(h,t,p);box.append(el);}
  if(!box.children.length){const p=document.createElement('p');p.className='hint';p.textContent='Заданий пока нет.';box.append(p);}
  const got=Object.keys(PROG.ach).length,all=(window.cityAchievements||[]).length;$('#qAch').textContent=all?`Значков: ${got} из ${all} — список в «Сегодня» → «Значки». Дней подряд: ${PROG.days.streak||1}.`:'';
  $('#questModal').hidden=false;player.busy=true;}
function closeQuests(){$('#questModal').hidden=true;player.busy=false;}
function questBind(){const b=$('#questBtn');if(b)b.addEventListener('click',openQuests);const c=$('#qClose');if(c)c.addEventListener('click',closeQuests);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',questBind);else questBind();
