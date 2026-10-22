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

  function agenda(t){
    const m=t.date.getUTCMonth()+1, d=t.date.getUTCDate(), wd=t.date.getUTCDay();
    const out=[];
    if(m===6&&d===21) out.push('Сабантуй. Днём площадь заполняется, вокруг полиция.');
    if(m===8&&d===30) out.push('День города. Площадь Свободы вечером перекрыта.');
    if(m===1&&d===1) out.push('Новый год. К полуночи все стекаются на площадь Свободы.');
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
  btn.type='button'; btn.textContent='Сегодня';
  btn.style.cssText='position:fixed;left:16px;top:78px;z-index:30;border:0;border-radius:999px;padding:8px 14px;background:#132019;color:#EEF3EE;border:1px solid rgba(255,255,255,.12);font:600 13px "IBM Plex Sans",system-ui;box-shadow:0 8px 24px rgba(0,0,0,.35);cursor:pointer';
  const panel=document.createElement('section');
  panel.hidden=true;
  panel.style.cssText='position:fixed;left:16px;top:118px;z-index:30;width:min(320px,calc(100vw - 24px));max-height:min(460px,70vh);overflow:auto;background:#f6f1e6;color:#1c241f;border-radius:18px;padding:14px 14px 12px;box-shadow:0 16px 40px rgba(0,0,0,.28);font:15px/1.4 "IBM Plex Sans",system-ui';
  function mount(){if(!document.body||btn.parentNode) return; document.body.append(btn,panel);}

  function draw(){
    const t=when(), L=life();
    const sky=typeof weather!=='undefined'?(weather.kind==='rain'?'дождь':weather.kind==='cloudy'?'пасмурно':'ясно'):'ясно';
    const head=t.date.getUTCDate()+' '+MONTH[t.date.getUTCMonth()+1]+', '+WD[t.date.getUTCDay()]+' · '+pad(t.h)+':'+pad(t.m);
    const rows=agenda(t).concat(personal(L));
    panel.innerHTML='<div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline"><strong>Казань сегодня</strong><span style="opacity:.6;font-size:13px">'+head+'</span></div>'
      +'<div style="margin:6px 0 10px;color:#3d5c4a">'+sky+'</div>'
      +'<div style="font-size:14px;margin-bottom:8px">'+memory(L)+'</div>'
      +rows.map(function(s){return '<div style="padding:7px 0;border-top:1px solid rgba(0,0,0,.08)">'+s+'</div>';}).join('');
  }
  btn.addEventListener('click',function(){panel.hidden=!panel.hidden; if(!panel.hidden) draw();});
  document.addEventListener('keydown',function(e){if(e.key==='Escape') panel.hidden=true;});

  function start(){mount(); draw();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
