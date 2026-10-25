// Карманная лента «сегодня». Не чат и не квесты: что город уже делает без вас.
// <script src="js/phone.js"></script> — после events.js и people.js.
(function(){
  if(window.__cityPhone) return;
  window.__cityPhone=true;
  const epoch=Date.UTC(2026,5,20);
  const WD=['вс','пн','вт','ср','чт','пт','сб'];
  const MONTH=['','января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  const WARD={bauman:'На Баумана',yard:'Во дворах',stadium:'У арены',kremlin:'У Кремля',freedom:'На площади Свободы'};

  function when(){
    if(typeof clock==='undefined') return {day:1,h:12,m:0,date:new Date(epoch)};
    const day=clock.day||1, mins=clock.minutes||0;
    const date=new Date(epoch+(day-1)*86400000);
    return {day,h:Math.floor((mins/60)%24),m:Math.floor(mins%60),date};
  }
  function pad(n){return (n<10?'0':'')+n;}
  function life(){try{return JSON.parse(localStorage.getItem('zk.citylife')||'{}')||{};}catch(e){return {};}}

  let seenInbox=0;
  function pushInbox(msg){
    const from=String(msg&&msg.from||'Город').slice(0,40);
    const text=String(msg&&msg.text||'').slice(0,240);
    const kind=String(msg&&msg.kind||'note').slice(0,24);
    if(!text) return null;
    const item={from:from, text:text, kind:kind, day:(typeof clock!=='undefined'&&clock.day)||1, at:Date.now()};
    const live=window.cityLife;
    if(live&&typeof live.save==='function'){
      if(!Array.isArray(live.inbox)) live.inbox=[];
      live.inbox.push(item);
      if(live.inbox.length>30) live.inbox.splice(0, live.inbox.length-30);
      live.save();
    }else{
      const raw=life();
      if(!Array.isArray(raw.inbox)) raw.inbox=[];
      raw.inbox.push(item);
      if(raw.inbox.length>30) raw.inbox=raw.inbox.slice(-30);
      try{localStorage.setItem('zk.citylife', JSON.stringify(raw));}catch(e){}
    }
    if(panel.hidden) btn.textContent='Сегодня · '+Math.max(1,(life().inbox||[]).length-seenInbox);
    else draw();
    return item;
  }
  window.cityPhone={push:pushInbox};

  function agenda(t){
    const m=t.date.getUTCMonth()+1, d=t.date.getUTCDate(), wd=t.date.getUTCDay();
    const out=[];
    if(m===6&&d===21) out.push('Сабантуй. Днём площадь заполняется, вокруг полиция.');
    if(m===8&&d===30) out.push('День города. Площадь Свободы вечером перекрыта.');
    if(m===1&&d===1) out.push('Новый год. К полуночи все стекаются на площадь Свободы.');
    if(m===9&&d===5) out.push('Ярмарка на площади. Лучше пешком.');
    if(m===3&&d===8) out.push('8 марта. На Баумана не протолкнуться.');
    if(m===3&&d===9) out.push('Ураза-байрам. Утром у мечетей, центр полный.');
    if(m===3&&d===14) out.push('Масленица, прощёное воскресенье. Блины на площади.');
    if(m===5&&d===9) out.push('9 мая. Парад и перекрытия у Кремля.');
    if(m===5&&d===16) out.push('Курбан-байрам. Утром намаз, днём столы во дворах.');
    if(wd===6&&m>=4&&m<=11) out.push('Вечером матч «Рубина». К арене лучше пешком.');
    if(wd===0&&(m>=9||m<=4)) out.push('Вечером «Ак Барс». Оцепление и пробки у арены.');
    if(!out.length){
      if(t.h<7) out.push('Центр ещё спит. Дворы тише Баумана.');
      else if(t.h<10) out.push('Утренний час. Автобусы полные, в кафе очередь за кофе.');
      else if(t.h<17) out.push('Обычный день. На Баумана туристы, во дворах свои.');
      else if(t.h<22) out.push('Вечер. Город вышел. В толпе легче и потеряться, и встретить своего.');
      else out.push('Ночь. Баумана ещё светится, дворы уже нет.');
    }
    return out;
  }
  function memory(L){
    const wards=L.wards||{};
    let id='', v=-999;
    for(const k in wards){if(wards[k]>v){v=wards[k]; id=k;}}
    if(!id||v<=0) return 'Пока вас нигде толком не запомнили. Один хороший поступок — и район начинает узнавать.';
    return (WARD[id]||'В городе')+' о вас уже говорят'+(v>=8?' как о своём.':'.');
  }
  function personal(L){
    const notes=(L.notes||[]).slice(-3).reverse();
    if(notes.length) return notes.map(function(n){return n.text;});
    return ['Телефон молчит. Так и бывает, пока город вас не знает.'];
  }

  const btn=document.createElement('button');
  btn.type='button'; btn.id='zkToday'; btn.textContent='Сегодня';
  btn.style.cssText='position:fixed;left:16px;top:78px;z-index:19;border:0;border-radius:999px;padding:12px 16px;min-height:44px;min-width:44px;background:#132019;color:#EEF3EE;border:1px solid rgba(255,255,255,.12);font:600 14px/1.2 "IBM Plex Sans",system-ui;box-shadow:0 8px 24px rgba(0,0,0,.35);cursor:pointer';
  const panel=document.createElement('section');
  panel.id='zkTodayPanel';
  panel.hidden=true;
  panel.style.cssText='position:fixed;left:16px;top:130px;z-index:19;width:min(320px,calc(100vw - 32px));max-height:60vh;overflow:auto;overflow-wrap:anywhere;word-break:break-word;background:#f6f1e6;color:#1c241f;border-radius:18px;padding:14px 14px 12px;box-shadow:0 16px 40px rgba(0,0,0,.28);font:15px/1.45 "IBM Plex Sans",system-ui';
  const fit=document.createElement('style');
  fit.textContent='@media (max-width:640px){#zkToday{top:148px!important}#zkTodayPanel{top:204px!important}}';
  let tab='feed';
  function mount(){if(!document.body||btn.parentNode) return; document.head.append(fit); document.body.append(btn,panel);}
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&','<':'<','>':'>','"':'"'}[c];});}
  function tabBtn(id,label){
    const on=tab===id;
    return '<button type="button" data-tab="'+id+'" style="min-height:44px;min-width:44px;padding:10px 14px;border-radius:999px;border:1px solid rgba(0,0,0,.12);font:600 14px/1.2 inherit;cursor:pointer;background:'+(on?'#132019':'transparent')+';color:'+(on?'#f6f1e6':'#1c241f')+'">'+label+'</button>';
  }

  function draw(){
    const t=when(), L=life();
    const sky=typeof weather!=='undefined'?(weather.kind==='rain'?'дождь':weather.kind==='cloudy'?'пасмурно':'ясно'):'ясно';
    const head=t.date.getUTCDate()+' '+MONTH[t.date.getUTCMonth()+1]+', '+WD[t.date.getUTCDay()]+' · '+pad(t.h)+':'+pad(t.m);
    const inbox=(L.inbox||[]).slice(-6).reverse().map(function(m){return (m.from?m.from+': ':'')+m.text;});
    let folk=[];
    if(typeof cityFolkAll==='function'){
      try{folk=cityFolkAll().filter(function(f){return f&&f.known&&f.text;}).slice(0,4).map(function(f){return f.text;});}catch(e){folk=[];}
    }
    const rows=inbox.concat(folk).concat(agenda(t)).concat(personal(L));
    seenInbox=(L.inbox||[]).length;
    btn.textContent='Сегодня';
    const badges=badgeHtml();
    const body=tab==='badges'?badges:rows.map(function(s){return '<div style="padding:8px 0;border-top:1px solid rgba(0,0,0,.08);font-size:15px">'+esc(s)+'</div>';}).join('');
    panel.innerHTML='<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px">'+tabBtn('feed','Сегодня')+tabBtn('badges','Значки')+'</div>'
      +'<div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;align-items:baseline"><strong>Казань сегодня</strong><span style="opacity:.6;font-size:14px">'+esc(head)+'</span></div>'
      +'<div style="margin:6px 0 10px;color:#3d5c4a;font-size:15px">'+esc(sky)+'</div>'
      +(tab==='badges'?'':('<div style="font-size:15px;margin-bottom:8px">'+esc(memory(L))+'</div>'))
      +body;
    panel.querySelectorAll('[data-tab]').forEach(function(b){
      b.addEventListener('click',function(){tab=b.getAttribute('data-tab'); draw();});
    });
  }
  function badgeHtml(){
    const list=window.cityAchievements;
    if(!Array.isArray(list)||!list.length) return '<div style="padding:8px 0;font-size:15px">Значки появятся, когда подключится список.</div>';
    let st={};
    if(typeof window.cityAchievementsState==='function'){try{st=window.cityAchievementsState()||{};}catch(e){st={};}}
    return list.map(function(a){
      const s=st[a.id]||{};
      const done=!!s.done;
      const n=s.n||0;
      const need=a.n||1;
      return '<div style="padding:8px 0;border-top:1px solid rgba(0,0,0,.08);font-size:15px;opacity:'+(done?'1':'.55')+'"><b>'+esc((a.icon?a.icon+' ':'')+a.title)+'</b> '+(done?'· есть':'· нет, '+n+'/'+need)+'<div style="opacity:.75">'+esc(a.text||'')+'</div></div>';
    }).join('');
  }
  btn.addEventListener('click',function(){panel.hidden=!panel.hidden; if(!panel.hidden) draw();});
  document.addEventListener('keydown',function(e){if(e.key==='Escape') panel.hidden=true;});

  function start(){mount(); draw();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
