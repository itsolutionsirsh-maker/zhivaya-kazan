// ===== Метро: первая линия Казанского метрополитена, на карте — Яшьлек, Козья слобода, Кремлёвская, Площадь Тукая, Суконная слобода, Аметьево =====
// Вход с улицы (знак «М»), турникет 46 ₽, платформа, поезд, объявление по-русски и по-татарски, выход на другой станции.
// Остальные станции линии за пределами карты — на схеме, но выйти на них нельзя.
const METRO_LINE=[
  {id:'avia',n:'Авиастроительная'},{id:'sever',n:'Северный вокзал'},{id:'yashlek',n:'Яшьлек',tat:'Яшьлек',ll:[[55.82865,49.08169],[55.82708,49.08332]]},
  {id:'koza',n:'Козья слобода',tat:'Кәҗә бистәсе',ll:[[55.81727,49.09721],[55.81579,49.10012]]},   // входы — из OSM (railway=subway_entrance)
  {id:'kreml',n:'Кремлёвская',tat:'Кремль',ll:[[55.7958,49.1078],[55.7952,49.1064]]},
  {id:'tukay',n:'Площадь Габдуллы Тукая',short:'Площадь Тукая',tat:'Габдулла Тукай мәйданы',ll:[[55.78699,49.1223],[55.78727,49.12175]]},
  {id:'sukon',n:'Суконная слобода',tat:'Суконная бистәсе',ll:[[55.77607,49.14303],[55.77608,49.14379]]},
  {id:'amet',n:'Аметьево',tat:'Әмәт',ll:[[55.7655,49.16515],[55.7649,49.16828]]},{id:'gorki',n:'Горки'},{id:'pobedy',n:'Проспект Победы'},{id:'dubrav',n:'Дубравная'}];
const METRO={fare:46,ready:false,st:[],ride:null,lastSign:0};
const RIDE_MIN={yashlek_koza:2.5,koza_kreml:2.5,kreml_tukay:2,tukay_sukon:2.5,sukon_amet:2};     // минуты в пути между соседними станциями центра
function metroInit(){if(METRO.ready||!world)return;METRO.ready=true;const m=world.meta;
  for(const s of METRO_LINE){if(!s.ll)continue;const ents=[];
    for(const [lat,lon] of s.ll){const x=(lon-m.lon0)*m.mlon,y=-(lat-m.lat0)*m.mlat;const n=nearestNode(x,y,world.pedAdj,120);if(n<0)continue;const p=sidewalkPos(n);ents.push({x:p[0],y:p[1],node:n});}
    if(ents.length)METRO.st.push(Object.assign({},s,{ents,idx:METRO_LINE.indexOf(s)}));}}
function metroStation(id){return METRO.st.find(s=>s.id===id);}
function stName(s){return s.short||s.n;}
function metroOpen(){const h=cityHour();return h>=6;}                          // с 6:00 до полуночи
function metroInterval(){const h=cityHour();return rushHour()?5:(h>=21||h<7)?12:8;}
function rideMinutes(a,b){const i=Math.min(a.idx,b.idx),j=Math.max(a.idx,b.idx);let t=0;for(let k=i;k<j;k++){const x=METRO_LINE[k].id,y=METRO_LINE[k+1].id;t+=RIDE_MIN[x+'_'+y]||2.5;}return t+(j-i-1)*0.5;}
function metroSpots(){metroInit();const out=[];for(const s of METRO.st)for(const e of s.ents)out.push({x:e.x,y:e.y,st:s});return out;}
// ---------- на улице ----------
function metroAction(){if(!world||player.vehicle||player.bus)return null;metroInit();let best=null,bd=7;
  for(const s of METRO.st)for(const e of s.ents){const d=dist(e.x,e.y,player.x,player.y);if(d<bd){bd=d;best={s,e};}}
  if(!best)return null;const s=best.s;const d=bd;
  if(!metroOpen())return {d,label:`Метро «${stName(s)}» закрыто · откроется в 6:00`,run:()=>setHint('Метро работает с 6:00 до полуночи. Ночью — такси')};
  return {d,label:`Спуститься в метро «${stName(s)}» · ${METRO.fare} ₽`,run:()=>{
    if(player.money<METRO.fare){setHint(`На проезд нужно ${METRO.fare} ₽`);return;}
    player.money-=METRO.fare;METRO.ride=null;METRO.at=s.id;METRO.ent=best.e;
    enterInterior({kind:'metro',name:`Станция «${stName(s)}»`,key:'metro:'+s.id,x:player.x,y:player.y});
    setHint(`Турникет: −${METRO.fare} ₽. Подойдите к краю платформы (E) и выберите станцию`);}};}
// знак «М» у входов
function drawMetroSigns(vx0,vy0,vx1,vy1,z,toS){if(!METRO.ready)metroInit();if(!METRO.ready||z<0.9)return;const sz=clamp(z*2.2,9,15);
  ctx.textAlign='center';ctx.textBaseline='middle';
  for(const s of METRO.st)for(const e of s.ents){if(e.x<vx0-20||e.x>vx1+20||e.y<vy0-20||e.y>vy1+20)continue;const [sx,sy]=toS(e.x,e.y);
    ctx.fillStyle='#D7263D';rrect(ctx,sx-sz,sy-sz,sz*2,sz*2,sz*0.45);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();
    ctx.fillStyle='#fff';ctx.font=`800 ${Math.round(sz*1.25)}px "IBM Plex Sans",system-ui`;ctx.fillText('М',sx,sy+0.5);
    if(z>2.6){ctx.font='600 11px "IBM Plex Sans",system-ui';ctx.lineWidth=3;ctx.strokeStyle='rgba(255,255,255,.85)';ctx.strokeText(stName(s),sx,sy+sz+10);ctx.fillStyle='#7A1020';ctx.fillText(stName(s),sx,sy+sz+10);}}}
// ---------- на платформе ----------
function metroCur(){return metroStation(METRO.at);}
function metroTrainAction(){const s=metroCur();if(!s)return null;const R=METRO.ride;
  if(!metroOpen())return {label:'Поездов нет до 6:00',run:()=>{}};
  if(!R)return {label:'Куда едем? Выбрать станцию',run:()=>startSit('metroPick')};
  if(R.phase==='wait')return {label:`Поезд до «${stName(metroStation(R.to))}» через ${Math.max(1,Math.ceil(R.waitMin))} мин…`,run:()=>{}};
  if(R.phase==='here')return {label:`Войти в поезд · до «${stName(metroStation(R.to))}»`,run:metroBoard};
  return null;}
if(typeof defSit==='function')defSit('metroPick',{title:'Метро',quiet:true,
  start(s){const cur=metroCur();if(!cur)return false;const others=METRO.st.filter(q=>q.id!==cur.id);
    const choices=others.slice(0,3).map(q=>({t:`«${stName(q)}» · ${Math.round(rideMinutes(cur,q))} мин`,primary:true,run:()=>{metroCall(q.id);endSit(s);}}));
    choices.push({t:'Схема линии',run:()=>{endSit(s);metroScheme();}});
    sitCard({s,icon:'🚇',title:`Станция «${stName(cur)}»`,text:`Интервал сейчас около ${metroInterval()} мин. Дальше по линии — за пределами центра: на север до «Авиастроительной», на юг до «Дубравной».`,ttl:0,choices});return true;}});
function metroScheme(){startSit('metroScheme');}
if(typeof defSit==='function')defSit('metroScheme',{title:'Схема',quiet:true,start(s){
  const txt=METRO_LINE.map(q=>{const here=METRO.at===q.id;const inMap=!!metroStation(q.id);return `${here?'● ':inMap?'○ ':'· '}${q.n}${q.tat&&q.tat!==q.n?' / '+q.tat:''}${inMap?'':' — вне карты'}`;}).join('\n')+'\n\nВторая линия строится, первые станции обещают к 2027 году.';
  sitCard({s,icon:'🗺',title:'Первая линия метро',text:txt,ttl:0,choices:[{t:'Понятно',primary:true,run:()=>endSit(s)}]});return true;}});
function metroCall(to){const w=1+Math.random()*(metroInterval()-1);METRO.ride={to,phase:'wait',waitMin:w,t:0,real:Math.min(6,1.5+w*0.8),train:0};}
function metroBoard(){const R=METRO.ride;if(!R||R.phase!=='here')return;R.phase='go';R.t=0;R.min=rideMinutes(metroCur(),metroStation(R.to));player.busy=true;}
function metroArrive(){const R=METRO.ride;const dst=metroStation(R.to);METRO.ride=null;player.busy=false;clock.minutes+=R.min;
  const e=dst.ents[Math.floor(Math.random()*dst.ents.length)];
  if(interior&&interior.kind==='metro')interior.ret={x:e.x,y:e.y,hx:0,hy:1};
  exitInterior();player.x=e.x;player.y=e.y;cam.x=e.x;cam.y=e.y;player.waypoints=null;
  if(typeof companion!=='undefined'&&companion&&companion.w){companion.w.x=e.x+1.2;companion.w.y=e.y+0.6;companion.w.path=null;}
  addEvent(`🚇 Вы вышли из метро на станции «${stName(dst)}»`,'say');METRO.at=null;}
function updateMetro(rdt){const R=METRO.ride;if(!R)return;R.t+=rdt;
  if(!interior||interior.kind!=='metro'){METRO.ride=null;player.busy=false;return;}
  if(R.phase==='wait'){R.waitMin=Math.max(0,R.waitMin-rdt*clock.scale/60);if(R.t>=R.real){clock.minutes+=R.waitMin;R.waitMin=0;R.phase='here';R.t=0;R.train=0;addEvent(`Поезд до «${stName(metroStation(R.to))}» прибыл. Двери открываются`);}}
  else if(R.phase==='here'){R.train=Math.min(1,R.train+rdt/1.6);if(R.t>18){R.phase='leave';R.t=0;addEvent('Двери закрылись — поезд ушёл. Следующий скоро');}}
  else if(R.phase==='leave'){R.train=1+Math.min(1,R.t/1.6);if(R.t>1.6)metroCall(R.to);}
  else if(R.phase==='go'){R.train=1;if(R.t>3.2)metroArrive();}}
// поезд на путях и «тоннель» по дороге
function drawMetroTrain(it,t){const R=METRO.ride;if(!R||(R.phase!=='here'&&R.phase!=='leave'&&R.phase!=='go'))return;
  const k=R.phase==='leave'?R.train:R.train;const e=k<=1?1-Math.pow(1-k,2):1+(k-1)*(k-1);const L=it.w+2;const x0=-L+e*(L+0.6);
  const y=0.35,h=1.5;ctx.save();ctx.beginPath();ctx.rect(0,0,it.w,2.5);ctx.clip();
  for(let c=0;c<4;c++){const cx=x0+c*(L/4);const cw=L/4-0.25;ctx.fillStyle='#2E6FB8';rrect(ctx,cx,y,cw,h,0.25);ctx.fill();ctx.fillStyle='#DDE6EE';ctx.fillRect(cx,y+h*0.62,cw,0.12);
    for(let wdw=0;wdw<4;wdw++){ctx.fillStyle=R.phase==='here'&&wdw%2===1?'#2A2A2A':'#BFD9F2';ctx.fillRect(cx+0.35+wdw*(cw-0.7)/4,y+0.2,(cw-0.7)/4-0.25,0.55);}}
  ctx.restore();}
function drawMetroOverlay(it){const R=METRO.ride;if(!R||R.phase!=='go')return;const dst=metroStation(R.to);const a=Math.min(1,R.t/0.4,(3.2-R.t)/0.4);
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.globalAlpha=Math.max(0,a);ctx.fillStyle='#07090C';ctx.fillRect(0,0,W,H);
  const tt=performance.now()/1000;for(let i=0;i<9;i++){const x=((i*170-tt*900)%(W+200)+W+200)%(W+200)-100;ctx.fillStyle='rgba(255,214,120,.55)';ctx.fillRect(x,H*0.42,60,3);ctx.fillRect(x+40,H*0.62,30,2);}
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#EEF3EE';ctx.font='700 20px "Unbounded",sans-serif';ctx.fillText(`Следующая станция — «${dst.n}»`,W/2,H*0.5-14);
  ctx.font='500 15px "IBM Plex Sans",system-ui';ctx.fillStyle='#9BB1A4';ctx.fillText(`Киләсе станция — «${dst.tat||dst.n}»`,W/2,H*0.5+16);ctx.globalAlpha=1;}
