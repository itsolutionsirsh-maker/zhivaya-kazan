// Доска поручений жителей. Заказы между игроками здесь не проводятся: их деньги считает сервер.
(function(){
  const KEY='zk.errand';
  const ST={active:null,done:{},day:0,count:0};
  function rules(){return window.cityErrandRules||{board:6,perDay:8,handMeters:40};}
  function list(){return Array.isArray(window.cityErrands)?window.cityErrands:[];}
  function day(){return (typeof clock!=='undefined'&&clock.day)||1;}
  function hour(){return typeof cityHour==='function'?cityHour():12;}
  function save(){try{localStorage.setItem(KEY,JSON.stringify({active:ST.active,done:ST.done,day:ST.day,count:ST.count}));}catch(e){}}
  function load(){try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(!s)return;ST.active=s.active||null;ST.done=s.done||{};ST.day=s.day||0;ST.count=s.count||0;}catch(e){}}
  function rollDay(){const d=day();if(ST.day!==d){ST.day=d;ST.done={};ST.count=0;save();}}
  function norm(s){return String(s||'').toLowerCase().replace(/ё/g,'е');}
  function hintHit(hints,text){const h=norm(text);return (hints||[]).some(function(x){return h.indexOf(norm(x))>=0;});}
  function roadAt(x,y){return typeof nearestRoadName==='function'?(nearestRoadName(x,y)||''):'';}
  function poiOk(spec,p){
    const k=spec.kind;
    const hay=(p.n||'')+' '+roadAt(p.x,p.y);
    if(k==='street'||k==='yard')return hintHit(spec.hints,hay);
    if(k==='cafe'||k==='restaurant'){if(p.t!=='cafe'&&p.t!=='bar')return false;}
    else if(k==='shop'){if(p.t!=='shop'&&p.t!=='market')return false;}
    else if(k==='pharmacy'||k==='bar'){if(p.t!==k)return false;}
    else return false;
    if(!spec.hints||!spec.hints.length)return true;
    return hintHit(spec.hints,hay);
  }
  function findSpot(spec){
    if(!spec||typeof player==='undefined'||typeof world==='undefined'||!world)return null;
    if(spec.who&&typeof cityFolkWhere==='function'){const f=cityFolkWhere(spec.who);if(f&&isFinite(f.x))return {x:f.x,y:f.y,n:spec.label};}
    if(spec.kind==='yard'&&player.home)return {x:player.home.cx,y:player.home.cy,n:spec.label};
    let best=null,bd=1e15;
    const pois=world.pois||[];
    for(let i=0;i<pois.length;i++){const p=pois[i];if(!poiOk(spec,p))continue;const d=Math.hypot(p.x-player.x,p.y-player.y);if(d<bd){bd=d;best={x:p.x,y:p.y,n:spec.label||p.n||'место'};}}
    if(best)return best;
    const ds=window.cityDistricts||[],m=world.meta;
    if(!m)return null;
    for(let i=0;i<ds.length;i++){const d=ds[i];const blob=norm((d.hints||[]).join(' ')+' '+d.name);if(!(spec.hints||[]).some(function(h){return blob.indexOf(norm(h))>=0;}))continue;if(!d.center)continue;
      return {x:(d.center[1]-m.lon0)*m.mlon,y:-(d.center[0]-m.lat0)*m.mlat,n:spec.label||d.name};}
    return null;
  }
  function nearSpec(spec){
    if(!spec||typeof player==='undefined')return false;
    const hand=(rules().handMeters)||40;
    if(spec.who&&typeof cityFolkWhere==='function'){const f=cityFolkWhere(spec.who);if(f&&isFinite(f.x)&&dist(f.x,f.y,player.x,player.y)<hand)return true;}
    if((spec.kind==='yard'||spec.kind==='street')&&hintHit(spec.hints,roadAt(player.x,player.y)))return true;
    if(spec.kind==='yard'&&player.home&&dist(player.home.cx,player.home.cy,player.x,player.y)<hand){
      if(!spec.hints||!spec.hints.length||spec.who)return true;
    }
    if(typeof world==='undefined'||!world||!world.pois)return false;
    for(let i=0;i<world.pois.length;i++){const p=world.pois[i];if(Math.abs(p.x-player.x)>50||Math.abs(p.y-player.y)>50)continue;if(!poiOk(spec,p))continue;if(dist(p.x,p.y,player.x,player.y)<24)return true;}
    const spot=findSpot(spec);
    return !!(spot&&dist(spot.x,spot.y,player.x,player.y)<28);
  }
  function errandCityRide(kind){
    const a=ST.active;if(!a)return false;
    if(kind==='bus'||kind==='metro')return true;
    if(kind==='taxi')return !(a.taxis>=1);
    return false;
  }
  function errandUsedTaxi(){if(ST.active){ST.active.taxis=1;save();}}
  window.errandCityRide=errandCityRide;
  window.errandUsedTaxi=errandUsedTaxi;
  function guide(spec){
    const s=findSpot(spec);
    if(s&&typeof startWalkNav==='function')startWalkNav(s);
    else if(typeof setHint==='function')setHint(spec&&spec.label?spec.label:'Едьте к месту на карточке');
  }
  function take(job){
    rollDay();
    if(ST.active){setHint('Сначала сдайте то, что уже в руках');return;}
    if((ST.count||0)>=(rules().perDay||8)){setHint('На сегодня хватит: восемь поручений');return;}
    if(ST.done[job.id]===ST.day){setHint('Это поручение уже сдано сегодня');return;}
    const pay=job.pay.min+Math.floor(Math.random()*((job.pay.max-job.pay.min)+1));
    ST.active={id:job.id,title:job.title,what:job.what,who:job.who||'',pay:pay,phase:'take',taxis:0,
      take:job.take,drop:job.drop,pickup:job.pickup,thanks:job.thanks};
    save();
    if(typeof addEvent==='function')addEvent('Взяли поручение: '+job.title+' · '+pay+' ₽','say');
    guide(job.take);
    draw();
  }
  function cancel(){
    const a=ST.active;if(!a||a.phase!=='take')return;
    ST.active=null;save();
    if(typeof addEvent==='function')addEvent('Поручение снова на доске','say');
    draw();
  }
  function pickup(){
    const a=ST.active;if(!a||a.phase!=='take'||!nearSpec(a.take))return;
    a.phase='drop';save();
    if(typeof addEvent==='function')addEvent(a.pickup||'Заказ у вас','say');
    guide(a.drop);
    draw();
  }
  function finish(){
    const a=ST.active;if(!a||a.phase!=='drop'||!nearSpec(a.drop))return;
    const pay=a.pay|0;
    player.money=(player.money||0)+pay;
    if(typeof WAL!=='undefined')WAL.note={d:pay,until:Date.now()+60000};
    ST.done[a.id]=ST.day;ST.count=(ST.count||0)+1;ST.active=null;save();
    if(typeof addEvent==='function')addEvent((a.thanks?a.thanks+' ':'')+'На карту '+pay+' ₽','say');
    if(typeof setHint==='function')setHint('Поручение сдано');
    draw();
  }
  function errandAction(){
    const a=ST.active;if(!a||typeof player==='undefined'||player.busy)return null;
    if(a.phase==='take'&&nearSpec(a.take))return {label:'Забрать: '+a.what,run:pickup};
    if(a.phase==='drop'&&nearSpec(a.drop))return {label:'Отдать: '+a.what+' · '+a.pay+' ₽',run:finish};
    return null;
  }
  function openNow(job){const h=hour(),hr=job.hours||[0,24];return h>=hr[0]&&h<hr[1];}
  const btn=document.getElementById('errandBtn')||document.createElement('button');
  if(!btn.id){btn.type='button';btn.id='errandBtn';btn.className='btn';btn.title='Поручения';btn.textContent='📦';const q=document.getElementById('questBtn');if(q)q.after(btn);}
  const panel=document.createElement('section');
  panel.hidden=true;
  panel.style.cssText='position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:30;width:min(360px,calc(100vw - 24px));max-height:70vh;overflow:auto;background:#f6f1e6;color:#1c241f;border-radius:18px;padding:14px;box-shadow:0 16px 40px rgba(0,0,0,.28);font:15px/1.4 "IBM Plex Sans",system-ui';
  function row(title,text){const d=document.createElement('div');d.style.cssText='padding:8px 0;border-top:1px solid rgba(0,0,0,.08)';const b=document.createElement('b');b.textContent=title;d.append(b);if(text){const s=document.createElement('div');s.textContent=text;s.style.opacity='.8';d.append(s);}return d;}
  function actBtn(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='min-height:44px;margin:6px 6px 0 0;padding:8px 12px;border-radius:999px;border:0;background:#132019;color:#f6f1e6;font:600 14px inherit;cursor:pointer';b.addEventListener('click',fn);return b;}
  function draw(){
    rollDay();panel.textContent='';
    const h=document.createElement('strong');h.textContent='Поручения';panel.append(h);
    const note=document.createElement('div');note.style.cssText='opacity:.7;margin:4px 0 8px';note.textContent='Пока заказ в руках, автобус, метро и одно такси платит город.';panel.append(note);
    const a=ST.active;
    if(a){const box=row(a.title,(a.phase==='take'?'Сначала забрать: ':'Отвезти: ')+(a.phase==='take'?a.take.label:a.drop.label)+' · '+a.pay+' ₽');if(a.phase==='take')box.append(actBtn('Отказаться',cancel));panel.append(box);}
    let shown=0;
    list().forEach(function(job){
      if(ST.active&&ST.active.id===job.id)return;
      if(!openNow(job)||ST.done[job.id]===ST.day)return;
      if(shown>=(rules().board||6))return;
      shown++;
      const box=row(job.title,job.ask+' · '+job.pay.min+'–'+job.pay.max+' ₽');
      box.append(actBtn('Беру',function(){take(job);}));
      panel.append(box);
    });
    if(!shown&&!a){const empty=document.createElement('div');empty.textContent='Сейчас на доске пусто. Загляните в другие часы.';panel.append(empty);}
  }
  btn.addEventListener('click',function(){panel.hidden=!panel.hidden;if(!panel.hidden)draw();});
  function boot(){
    load();rollDay();
    if(!document.body)return;
    document.body.append(panel);
    if(typeof findAction==='function'&&!findAction._errand){
      const prev=findAction;
      findAction=function(){const ea=errandAction();return ea||prev();};
      findAction._errand=1;
    }
    if(typeof metroAction==='function'&&!metroAction._errand){
      const prev=metroAction;
      metroAction=function(){
        const a=prev();
        if(!a||!a.run||!errandCityRide('metro'))return a;
        const run=a.run;
        a.label=String(a.label).replace(/ · \d+ ₽/,' · город платит');
        a.run=function(){const had=player.money;player.money=Math.max(had,METRO.fare);run();player.money=had;};
        return a;
      };
      metroAction._errand=1;
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
