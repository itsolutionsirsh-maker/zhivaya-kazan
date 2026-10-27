// Только представление: размеры, состояние панелей, лента и жест закрытия.
// Счета, события, пауза и диалоги остаются в своих игровых обработчиках.
function uiViewportMetrics(height,viewport,telegram,editing){
  const stable=telegram&&Number.isFinite(telegram.viewportStableHeight)&&telegram.viewportStableHeight>0?telegram.viewportStableHeight:height;
  const visual=viewport&&viewport.scale===1&&viewport.height>0?viewport:null;
  const visible=Math.min(stable,visual?visual.height:height);
  return {stable,visible,top:visual?Math.max(0,visual.offsetTop||0):0,keyboard:!!editing&&stable-visible>100};
}
function uiSwipeCloses(dx,dy){return dy>=72&&Math.abs(dx)<Math.min(50,dy/2);}
function uiFeedRemaining(at,now){return Math.max(0,5500-(now-at));}

(function(){
  if(typeof document==='undefined')return;
  const root=document.documentElement,phone=matchMedia('(max-width:640px), (pointer:coarse) and (max-height:500px)');
  const needs=document.getElementById('needsPanel'),money=document.getElementById('moneyLbl'),debt=document.getElementById('debtLbl');
  const compactMoney=new Intl.NumberFormat('ru-RU',{notation:'compact',maximumFractionDigits:1});
  const text=(el,s)=>{if(el&&el.textContent!==s)el.textContent=s;};
  const moneyText=(n,compact)=>compact&&Math.abs(n)>=100000?compactMoney.format(n)+' ₽':fmtMoney(n);
  const setExpanded=on=>{needs.setAttribute('aria-expanded',String(on));window.uiUpdateHud();};
  window.uiUpdateHud=function(){
    const expanded=needs.getAttribute('aria-expanded')==='true',compact=phone.matches&&!expanded;
    const owed=(player.debt||0)+(typeof ECON!=='undefined'?(ECON.owed||0)+(ECON.loan?ECON.loan.left||0:0):0);
    text(money,moneyText(player.money,compact));money.title=fmtMoney(player.money);
    debt.hidden=owed<=0;text(debt,(compact?'⚖ ':'Долг: ')+moneyText(owed,compact));debt.title='Долг за жильё, по суду и кредиту: '+fmtMoney(owed);
    if(phone.matches)needs.setAttribute('aria-label',`Состояние: энергия ${Math.round(player.energy)}%, сытость ${Math.round(player.food)}%, настроение ${Math.round(player.mood)}%. Деньги ${fmtMoney(player.money)}${owed>0?', долг '+fmtMoney(owed):''}. Нажмите для подробностей`);
  };
  needs.addEventListener('click',()=>{if(phone.matches)setExpanded(needs.getAttribute('aria-expanded')!=='true');});
  needs.addEventListener('keydown',e=>{if(phone.matches&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopPropagation();setExpanded(needs.getAttribute('aria-expanded')!=='true');}});
  document.addEventListener('pointerdown',e=>{if(phone.matches&&!needs.contains(e.target))setExpanded(false);},{passive:true});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')setExpanded(false);});
  // Один общий контейнер для статуса поездки, спутника и скорости, без переноса кнопки E.
  const trips=document.createElement('div');trips.className='ui-trip-stack';
  document.getElementById('tripBox').before(trips);
  for(const id of ['tripBox','compBox','vehBox'])trips.append(document.getElementById(id));
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>{
    root.style.setProperty('--ui-trip-space',(phone.matches&&trips.offsetHeight?trips.offsetHeight+8:0)+'px');
  }).observe(trips);

  let boundTelegram=null;
  function syncViewport(){
    const telegram=root.classList.contains('tg')&&window.Telegram&&window.Telegram.WebApp;
    const active=document.activeElement,editing=active&&/^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName);
    const v=uiViewportMetrics(innerHeight,window.visualViewport,telegram,editing);
    root.style.setProperty('--ui-height',v.stable+'px');root.style.setProperty('--ui-visible-height',v.visible+'px');root.style.setProperty('--ui-visible-top',v.top+'px');
    root.classList.toggle('ui-keyboard',phone.matches&&v.keyboard);
    for(const side of ['top','bottom','left','right'])for(const [key,field] of [['tg','safeAreaInset'],['content','contentSafeAreaInset']]){
      const n=telegram&&telegram[field]&&telegram[field][side];root.style.setProperty('--ui-'+key+'-'+side,Math.max(0,Number(n)||0)+'px');
    }
    if(telegram&&telegram!==boundTelegram&&telegram.onEvent){
      boundTelegram=telegram;
      for(const event of ['viewportChanged','safeAreaChanged','contentSafeAreaChanged'])telegram.onEvent(event,syncViewport);
    }
  }
  window.addEventListener('resize',syncViewport,{passive:true});
  if(window.visualViewport){visualViewport.addEventListener('resize',syncViewport,{passive:true});visualViewport.addEventListener('scroll',syncViewport,{passive:true});}
  document.addEventListener('focusin',syncViewport);document.addEventListener('focusout',()=>setTimeout(syncViewport,0));
  // SDK Telegram загружается асинхронно в tg.js. Не добавляем опрос и не меняем вход в аккаунт.
  document.addEventListener('load',e=>{if(e.target.tagName==='SCRIPT')syncViewport();},true);

  const feedBox=document.getElementById('feed');let feedTimer;
  function syncFeed(){
    clearTimeout(feedTimer);let next=Infinity;
    [...feedBox.children].forEach((el,i)=>{
      const event=typeof feed!=='undefined'&&feed[i];
      const left=event?uiFeedRemaining(event.at,performance.now()):0;
      el.hidden=phone.matches&&left<=0;
      el.classList.toggle('call',!!event&&event.kind==='call');
      if(phone.matches&&left>0)next=Math.min(next,left);
    });
    if(Number.isFinite(next))feedTimer=setTimeout(syncFeed,next+1);
  }
  new MutationObserver(syncFeed).observe(feedBox,{childList:true});
  function layout(){
    needs.setAttribute('role',phone.matches?'button':'group');needs.tabIndex=phone.matches?0:-1;
    needs.setAttribute('aria-label',phone.matches?'Состояние и деньги. Нажмите для подробностей':'Состояние и деньги');
    setExpanded(false);syncViewport();syncFeed();
  }
  phone.addEventListener('change',layout);

  function enhanceToday(){
    const panel=document.getElementById('zkTodayPanel'),button=document.getElementById('zkToday');if(!panel||!button)return;
    const addClose=()=>{
      if(panel.querySelector('.ui-today-close'))return;
      const close=document.createElement('button');close.type='button';close.className='btn ui-today-close';close.textContent='×';close.setAttribute('aria-label','Закрыть Сегодня');
      close.addEventListener('click',()=>{if(!panel.hidden)button.click();button.focus({preventScroll:true});});panel.prepend(close);
    };
    new MutationObserver(addClose).observe(panel,{childList:true});addClose();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhanceToday,{once:true});else enhanceToday();

  // Не закрываем обязательную анкету и конфликт двух устройств без их штатного действия.
  const closes={howtoModal:'howtoClose',rallyModal:'rallyCancel',speechModal:'speechClose',questModal:'qClose',seasonModal:'seasonClose',routeModal:'rtClose',orderModal:'orderClose',jobsModal:'jobsClose',bankModal:'bankClose',logModal:'logClose',chatModal:'chatClose',menuModal:'menuClose',tgIntro:'tgIntroSkip'};
  const modals=[...document.querySelectorAll('.modal')];
  for(const modal of modals){
    const box=modal.querySelector('.box');if(!box)continue;
    const title=box.querySelector('h2,.persona'),head=document.createElement('div');head.className='ui-sheet-head';
    const grip=document.createElement('span');grip.className='ui-sheet-grip';grip.setAttribute('aria-hidden','true');head.append(grip);
    box.prepend(head);if(title){head.append(title);if(!title.id)title.id=modal.id+'Title';modal.setAttribute('aria-labelledby',title.id);}
    modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
    const original=document.getElementById(closes[modal.id]);let close=null,start=null,previous=null;
    grip.hidden=!original;
    if(original){
      close=document.createElement('button');close.type='button';close.className='btn ui-sheet-close';close.textContent='×';close.setAttribute('aria-label','Закрыть окно');head.append(close);
      close.addEventListener('click',()=>{if(!original.disabled)original.click();});
      head.addEventListener('pointerdown',e=>{
        if(!phone.matches||e.button!==0||e.target.closest('button,input,a,select,textarea'))return;
        start={id:e.pointerId,x:e.clientX,y:e.clientY};head.setPointerCapture(e.pointerId);
      });
      head.addEventListener('pointermove',e=>{if(start&&e.pointerId===start.id){const dy=Math.max(0,e.clientY-start.y);box.style.translate='0 '+Math.min(dy,160)+'px';}});
      const finish=e=>{if(!start||e.pointerId!==start.id)return;const go=e.type==='pointerup'&&uiSwipeCloses(e.clientX-start.x,e.clientY-start.y);start=null;box.style.translate='';if(go&&!original.disabled)original.click();};
      head.addEventListener('pointerup',finish);head.addEventListener('pointercancel',finish);
      head.addEventListener('lostpointercapture',()=>{start=null;box.style.translate='';});
    }
    new MutationObserver(()=>{
      if(!modal.hidden){previous=document.activeElement;box.scrollTop=0;if(phone.matches&&close)close.focus({preventScroll:true});setExpanded(false);}
      else{start=null;box.style.translate='';if(previous&&previous.isConnected&&!modals.some(m=>!m.hidden))previous.focus({preventScroll:true});}
    }).observe(modal,{attributes:true,attributeFilter:['hidden']});
  }
  document.addEventListener('keydown',e=>{
    if(e.key!=='Tab'||!phone.matches)return;
    const modal=modals.find(m=>!m.hidden);if(!modal)return;
    const focusable=[...modal.querySelectorAll('button,input,textarea,select,a[href],[tabindex="0"]')].filter(el=>!el.disabled&&el.getClientRects().length);
    if(!focusable.length)return;const first=focusable[0],last=focusable[focusable.length-1];
    if(e.shiftKey&&(document.activeElement===first||!modal.contains(document.activeElement))){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&(document.activeElement===last||!modal.contains(document.activeElement))){e.preventDefault();first.focus();}
  });
  layout();
})();
