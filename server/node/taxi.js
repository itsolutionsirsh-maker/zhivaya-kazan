// Такси между игроками (данные и строки — site/js/roles.js второго программиста, запись taxi).
// Водитель за рулём своей машины или каршеринга подъезжает к игроку и предлагает подвезти. Пассажир выбирает, куда,
// водитель называет цену от 80 до 400 ₽, пассажир соглашается и садится. Водитель везёт; на месте (до 150 м от точки)
// высаживает — сервер переводит деньги с карты пассажира водителю, один раз на поездку (wallet.transfer).
// Где оба — сервер знает по их координатам: при посадке рядом, при высадке вместе и у цели, проехали не меньше 300 м
// и не быстрее машины. Пассажир вышел сам у цели — тоже оплата; раньше — поездка без денег.
// Кто может возить: вошёл в аккаунт, аккаунту больше суток. Пассажир — тоже с аккаунтом (платит с карты).
// Лимиты: 20 поездок в день у водителя, одному и тому же пассажиру — не чаще раза в час. На каждый шаг ответа ждём
// минуту, поездка — не дольше 30 минут. Кто-то отключился или зашёл в помещение — поездка отменяется без денег.
// Счётчики дня и «Таксист недели» — в DATA_DIR/taxi.json.
'use strict';
const crypto=require('crypto');
const LIM={min:80,max:400,perDay:20,pairGap:3600e3,ttl:60e3,rideMax:30*60e3,age:86400e3,near:30,together:60,arrive:150,minRide:300,speed:30,top:10,mapR:20000};
const CARS=new Set(['own','car']);
const mskDay=ms=>new Date(ms+3*3600e3).toISOString().slice(0,10);
function mskWeek(ms){const d=new Date(ms+3*3600e3);const dow=(d.getUTCDay()+6)%7;return new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()-dow)).toISOString().slice(0,10);}
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const fin=v=>typeof v==='number'&&Number.isFinite(v);

function Taxi(o){o=o||{};const now=o.now||(()=>Date.now()),L=Object.assign({},LIM,o.limits||{}),wallet=o.wallet,fs=o.fs,file=o.file;
  let st={day:'',week:'',rides:{},pair:{},week_:{}};
  try{if(fs&&file)st=Object.assign(st,JSON.parse(fs.readFileSync(file,'utf8')));}catch(e){}
  const save=()=>{if(!fs||!file)return;try{fs.writeFileSync(file+'.tmp',JSON.stringify(st));fs.renameSync(file+'.tmp',file);}catch(e){}};
  const rides=new Map();   // поездки в работе: от предложения до высадки
  function roll(){const t=now(),d=mskDay(t),w=mskWeek(t);if(st.day!==d){st.day=d;st.rides={};}if(st.week!==w){st.week=w;st.week_={};}
    for(const [k,at] of Object.entries(st.pair))if(t-at>=L.pairGap)delete st.pair[k];}
  const out=[];const send=(to,m)=>out.push({to,m:Object.assign({t:'taxi'},m)});const flush=()=>out.splice(0);
  const view=(r,extra)=>Object.assign({id:r.id,price:r.price||null,dest:r.dest?{name:r.dest.name,x:r.dest.x,y:r.dest.y}:null},extra||{});
  function cancel(r,why,by){if(!rides.delete(r.id))return;send(r.p,{k:'cancel',id:r.id,why,side:'passenger',by:by||null});send(r.d,{k:'cancel',id:r.id,why,side:'driver',by:by||null});}
  const busyWith=pid=>{for(const r of rides.values())if(r.d===pid||r.p===pid)return r;return null;};
  const inCity=p=>!p.room&&fin(p.x)&&fin(p.y);
  // p — игрок на сервере: {id, name, room, x, y, v (на чём едет), acc:{k, created (мс)}}
  function driveErr(p){if(!p||!p.acc)return 'account';if(!(now()-(p.acc.created||0)>=L.age))return 'young';if(!CARS.has(p.v))return 'car';if(!inCity(p))return 'place';return null;}
  function canDrive(p){return !driveErr(p);}

  // водитель предлагает подвезти игрока рядом
  function offer(d,p){roll();const err=e=>{send(d&&d.id,{k:'err',e});return flush();};
    if(!d)return flush();const e0=driveErr(d);if(e0)return err(e0);
    if(!p||!inCity(p))return err('gone');if(!p.acc)return err('p-account');
    if(p.id===d.id||p.acc.k===d.acc.k)return err('self');if(p.v)return err('p-car');
    if(dist(d,p)>L.near)return err('far');
    if(busyWith(d.id))return err('busy');if(busyWith(p.id)||[...rides.values()].some(r=>r.pk===p.acc.k||r.dk===d.acc.k))return err('p-busy');
    const open=[...rides.values()].filter(r=>r.dk===d.acc.k).length;
    if((st.rides[d.acc.k]||0)+open>=L.perDay)return err('limit-day');
    if(st.pair[d.acc.k+'|'+p.acc.k])return err('limit-pair');
    const gen=k=>wallet&&wallet.who?wallet.who(k):null;
    const id='taxi'+now().toString(36)+crypto.randomBytes(5).toString('hex');
    const r={id,d:d.id,p:p.id,dk:d.acc.k,pk:p.acc.k,dw:gen(d.acc.k),pw:gen(p.acc.k),dName:d.name||'Водитель',pName:p.name||'Пассажир',state:'offer',at:now(),price:0,dest:null,from:null,t0:0};
    rides.set(id,r);send(p.id,view(r,{k:'offer',from:{id:d.id,name:r.dName}}));send(d.id,view(r,{k:'wait',to:{id:p.id,name:r.pName}}));return flush();}
  // пассажир говорит, куда (или отказывается: dest=null)
  function dest(p,id,to){const r=rides.get(id);if(!r||r.p!==(p&&p.id)||r.state!=='offer')return flush();
    if(!to){cancel(r,'declined','passenger');return flush();}
    if(!fin(to.x)||!fin(to.y)||Math.abs(to.x)>L.mapR||Math.abs(to.y)>L.mapR){send(p.id,{k:'err',e:'dest'});return flush();}
    if(Math.hypot(to.x-p.x,to.y-p.y)<L.minRide){send(p.id,{k:'err',e:'short',min:L.minRide});return flush();}
    r.dest={x:to.x,y:to.y,name:String(to.name||'').replace(/[\u0000-\u001f]/g,'').slice(0,60)||'точка на карте'};r.state='dest';r.at=now();
    send(r.d,view(r,{k:'dest',name:r.pName,km:Math.round(Math.hypot(to.x-p.x,to.y-p.y)/100)/10,min:L.min,max:L.max}));send(r.p,view(r,{k:'asked'}));return flush();}
  // водитель называет цену (или отказывает: price=0)
  function price(d,id,amt){const r=rides.get(id);if(!r||r.d!==(d&&d.id)||r.state!=='dest')return flush();
    if(!amt){cancel(r,'declined','driver');return flush();}
    if(!Number.isInteger(amt)||amt<L.min||amt>L.max){send(d.id,{k:'err',e:'price',min:L.min,max:L.max});return flush();}
    r.price=amt;r.state='price';r.at=now();send(r.p,view(r,{k:'price',name:r.dName}));send(r.d,view(r,{k:'priced'}));return flush();}
  // пассажир садится (yes) или отказывается; оба ещё рядом, водитель ещё за рулём
  function board(p,d,id,yes){const r=rides.get(id);if(!r||r.p!==(p&&p.id)||r.state!=='price')return flush();
    if(!yes){cancel(r,'refused','passenger');return flush();}
    if(!d||d.id!==r.d||driveErr(d)||!inCity(p)||dist(d,p)>L.near){cancel(r,'far');return flush();}
    r.state='ride';r.at=now();r.t0=now();r.from={x:d.x,y:d.y};
    send(r.p,view(r,{k:'go',side:'passenger',to:{id:r.d,name:r.dName}}));send(r.d,view(r,{k:'go',side:'driver',to:{id:r.p,name:r.pName}}));return flush();}
  // конец поездки: высадил водитель (who='driver') или вышел пассажир (who='passenger')
  function finish(who,me,other,id){const r=rides.get(id);if(!r||r.state!=='ride')return flush();
    if(!me||(who==='driver'?r.d:r.p)!==me.id)return flush();
    const d=who==='driver'?me:other,p=who==='driver'?other:me;
    if(!d||!p||d.id!==r.d||p.id!==r.p||!inCity(d)||!inCity(p)){cancel(r,'left',who);return flush();}
    const there=Math.hypot(d.x-r.dest.x,d.y-r.dest.y)<=L.arrive,together=dist(d,p)<=L.together;
    const went=Math.hypot(d.x-r.from.x,d.y-r.from.y),fast=(now()-r.t0)/1000*L.speed<went;
    if(!there||!together||went<L.minRide||fast){
      // высадить можно и раньше — тогда без денег; пассажир вышел раньше — тоже
      cancel(r,!there?(who==='driver'?'early':'out'):!together?'far':went<L.minRide?'short':'fast',who);return flush();}
    roll();if((st.rides[r.dk]||0)>=L.perDay){cancel(r,'limit-day');return flush();}
    if(st.pair[r.dk+'|'+r.pk]){cancel(r,'limit-pair');return flush();}
    if(wallet&&wallet.who&&(wallet.who(r.pk)!==r.pw||wallet.who(r.dk)!==r.dw)){cancel(r,'reset');return flush();}
    const res=wallet?wallet.transfer(r.pk,r.dk,r.price,r.id,`Такси: ${r.dName} довёз до «${r.dest.name}»`,'taxi'):{err:'no_wallet'};
    if(!res||!res.ok){cancel(r,res&&res.err==='funds'?'funds':'wallet');return flush();}
    rides.delete(id);
    if(!res.dup){st.rides[r.dk]=(st.rides[r.dk]||0)+1;st.pair[r.dk+'|'+r.pk]=now();
      const s=st.week_[r.dk]||(st.week_[r.dk]={n:0,name:''});s.n++;s.name=r.dName;save();}
    const week=(st.week_[r.dk]||{}).n||0,today=st.rides[r.dk]||0;
    send(r.p,view(r,{k:'done',side:'passenger',name:r.dName,bal:res.bal}));send(r.d,view(r,{k:'done',side:'driver',name:r.pName,bal:res.to,today,max:L.perDay,week}));return flush();}
  // игрок зашёл в помещение, вышел из машины до посадки, отключился — его поездки отменяются
  function moved(p){if(!p)return flush();for(const r of [...rides.values()]){if(r.d!==p.id&&r.p!==p.id)continue;
    if(p.room)cancel(r,'left',r.d===p.id?'driver':'passenger');else if(r.d===p.id&&!CARS.has(p.v))cancel(r,'car','driver');}return flush();}
  function gone(pid){for(const r of [...rides.values()])if(r.d===pid||r.p===pid)cancel(r,'left',r.d===pid?'driver':'passenger');return flush();}
  // «Начать заново» или удаление аккаунта
  function reset(k){for(const r of [...rides.values()])if(r.dk===k||r.pk===k)cancel(r,'reset');return flush();}
  // раз в несколько секунд: шаг без ответа минуту или поездка дольше 30 минут — отмена
  function tick(){const t=now();for(const r of [...rides.values()]){if(r.state==='ride'?t-r.t0>=L.rideMax:t-r.at>=L.ttl)cancel(r,'timeout');}return flush();}
  function top(){roll();return Object.values(st.week_).filter(s=>s.n>0).sort((a,b)=>b.n-a.n).slice(0,L.top).map(s=>({name:s.name,n:s.n}));}
  const peek=id=>{const r=rides.get(id);return r?{d:r.d,p:r.p,state:r.state}:null;};
  const riding=pid=>{const r=busyWith(pid);return r&&r.state==='ride'?{id:r.id,side:r.d===pid?'driver':'passenger',with:r.d===pid?r.p:r.d}:null;};
  return {offer,dest,price,board,finish,moved,gone,reset,tick,top,peek,riding,canDrive,LIM:L,count:()=>rides.size};}
module.exports={Taxi,LIM,mskWeek};
