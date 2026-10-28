// День матча. Данные — второго программиста: fans.js (клубы, реплики, площадки), fixtures.js (расписание).
// Время матча настоящее (московское). За два часа до начала у арены и на месте сбора — болельщики в шарфах своего
// клуба (через rally.js, вид 'match'), их реплики из fans.js, полиция; подъезды из approach стоят (agents.js: road.jam).
// Во время игры — тихо, люди внутри. После финального свистка полчаса расходятся с репликами после матча.
// Толпа появляется, только когда игрок рядом (2,2 км) — иначе лишние люди не нужны.
const MATCH={t:0,key:null,phase:null,rallies:[],jam:[],noted:{}};
function matchNowMs(){return Number.isFinite(window.zkTestNow)?window.zkTestNow:Date.now();}
function matchKickoff(f){const t=/^\d{1,2}:\d{2}$/.test(f.time||'')?f.time.padStart(5,'0'):'19:00';return Date.parse(`${f.date}T${t}:00+03:00`);}
function matchVenue(f){const V=(window.cityFans&&window.cityFans.venues)||[];let best=null,bs=0;
  for(const v of V){const s=(v.hints||[]).filter(h=>(f.hints||[]).includes(h)).length;if(s>bs){bs=s;best=v;}}return best;}
function matchClub(f){const C=(window.cityFans&&window.cityFans.clubs)||[];return C.find(c=>c.name&&String(f.title||'').startsWith(c.name))||C.find(c=>c.name&&String(f.title||'').includes(c.name))||null;}
function matchGuest(){const C=(window.cityFans&&window.cityFans.clubs)||[];return C.find(c=>c.id==='guest')||null;}
function matchLen(c){return c&&c.sport==='hockey'?150:115;}   // минут от начала до финального свистка
// какой матч сейчас важен: за 2 ч до начала — 'before', игра — 'game', 30 мин после — 'after'
function matchCurrent(){const now=matchNowMs();
  for(const f of (window.cityFixtures||[])){if(f.kind!=='match')continue;const c=matchClub(f),v=matchVenue(f);if(!c||!v||!Array.isArray(v.ll))continue;
    const k=matchKickoff(f);if(!Number.isFinite(k))continue;const end=k+matchLen(c)*60000;
    const phase=now>=k-120*60000&&now<k?'before':now>=k&&now<end?'game':now>=end&&now<end+30*60000?'after':null;
    if(phase)return {f,c,v,phase,k,end,key:f.date+'|'+f.title};}
  return null;}
// исход матча не знаем — берём один на матч, чтобы все болельщики говорили одно и то же
function matchOutcome(f){return ['win','draw','lose'][hashStr(f.date+f.title)%3];}
function matchLines(m){const g=matchGuest();
  if(m.phase==='after'){const o=matchOutcome(m.f),og={win:'lose',lose:'win',draw:'draw'}[o];
    return {home:(m.c.after&&m.c.after[o])||m.c.lines,guest:(g&&g.after&&g.after[og])||null};}
  return {home:m.c.lines||[],guest:g?g.lines:null};}
function matchJam(m,on){for(const r of MATCH.jam)r.jam=false;MATCH.jam=[];if(!on||!world||!world.roads)return;
  const names=(m.v.approach||[]).map(s=>String(s).toLowerCase());const [gx,gy]=llToXY(m.v.ll);
  for(const r of world.roads){if(!r||!r.n||!r.p||!names.includes(String(r.n).toLowerCase()))continue;
    if(r.p.some(i=>{const q=world.nodes[i];return q&&dist(q[0],q[1],gx,gy)<1800;})){r.jam=true;MATCH.jam.push(r);}}}
function matchEnd(){for(const r of MATCH.rallies)if(rallies.includes(r))endRally(r,true);MATCH.rallies=[];unmark('match');}
function matchStart(m){matchEnd();const [gx,gy]=llToXY(m.v.ll);const L=matchLines(m),title=m.f.title+(m.f.time?' · '+m.f.time:'');
  const spots=[{x:gx,y:gy,n:m.v.name,r:16,size:m.phase==='after'?[30,45]:[40,60],main:true}];
  const near=(m.v.gather||[]).filter(g=>Array.isArray(g.ll)).map(g=>{const q=llToXY(g.ll);return {x:q[0],y:q[1],n:g.name,r:10,size:[14,22],d:dist(q[0],q[1],player.x,player.y)};}).sort((a,b)=>a.d-b.d);
  if(near[0])spots.push(near[0]);
  for(const sq of spots){const r=startRally(sq,'match',sq.main?title:'болельщики собираются','quiet');if(!r)continue;
    r.target=Math.round(rnd(sq.size[0],sq.size[1]));r.chants=L.home;r.guestChants=L.guest;r.club=m.c;MATCH.rallies.push(r);}
}
// шарфы: болельщики хозяев в цветах клуба, примерно каждый седьмой — гость
function matchDress(){for(const r of MATCH.rallies){const c=r.club;if(!c||!Array.isArray(c.colors)||!c.colors.length)continue;const g=matchGuest();
  for(const w of r.people){if(w.matchDressed)continue;w.matchDressed=true;const guest=(w.p.id||0)%7===0;
    if(guest){w.p.scarf=g&&g.colors&&g.colors.length?pick(g.colors):'#5A6470';if(r.guestChants&&r.guestChants.length)w.chants=r.guestChants;}
    else w.p.scarf=c.colors[(w.p.id||0)%c.colors.length];}}}
defWatch(dt=>{MATCH.t-=dt;if(MATCH.t>0||!world||!world.meta||typeof player==='undefined')return;MATCH.t=2;
  const m=matchCurrent();
  if(!m){if(MATCH.key){matchEnd();matchJam(null,false);MATCH.key=null;MATCH.phase=null;}return;}
  const [gx,gy]=llToXY(m.v.ll),near=scene==='city'&&dist(player.x,player.y,gx,gy)<2200;
  if(m.key!==MATCH.key||m.phase!==MATCH.phase){MATCH.key=m.key;MATCH.phase=m.phase;matchEnd();matchJam(m,true);
    const nk=m.key+'|'+m.phase;if(!MATCH.noted[nk]){MATCH.noted[nk]=1;
      if(m.phase==='before')addEvent(`🏟 ${m.f.title}${m.f.time?' в '+m.f.time:''}: болельщики идут на матч (${m.v.name}).${(m.v.approach||[]).length?' Пробки: '+m.v.approach.join(', ')+'.':''}`,'rally');
      else if(m.phase==='game')addEvent(`🏟 ${m.f.title}: игра идёт — у арены тихо, все на трибунах.`,'rally');
      else addEvent(`🏟 ${m.f.title}: финальный свисток, болельщики расходятся (${m.v.name}).`,'rally');}}
  if(m.phase==='game'){if(MATCH.rallies.length)matchEnd();unmark('match');return;}
  if(near&&!MATCH.rallies.length)matchStart(m);else if(!near&&MATCH.rallies.length)matchEnd();
  // метка со стрелкой — пока игрок далеко; рядом подпись толпы и так видна
  if(MATCH.rallies.length)unmark('match');else mark(null,'match',gx,gy,'🏟',`${m.f.title} · ${m.v.name}`,{arrow:true,color:'#1F6F3A'});
  if(MATCH.rallies.length)matchDress();});
window.matchCurrent=matchCurrent;
