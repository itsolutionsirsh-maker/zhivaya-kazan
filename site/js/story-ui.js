// Представление историй. Последствия, деньги и сохранения принадлежат story.js.
(function(){
  'use strict';
  let active=null,serial=0;
  const money=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2});
  const rub=n=>money.format(Number.isFinite(Number(n))?Number(n):0)+' ₽';
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=String(text);return n;};
  function clearInput(){
    if(typeof keys!=='undefined')for(const k of Object.keys(keys))delete keys[k];
    if(typeof joyVec!=='undefined')joyVec=[0,0];
    if(typeof joyId!=='undefined'&&joyId!==null){if(joy.hasPointerCapture(joyId))joy.releasePointerCapture(joyId);joyId=null;joyOrigin=null;joyKnob.style.transform='';}
  }
  function finish(s,run){
    if(active!==s||s.done)return;
    s.done=true;active=null;for(const t of s.timers)clearTimeout(t);
    s.root.remove();document.body.classList.remove('story-open');
    for(const [n,was] of s.inert)if(n.isConnected)n.inert=was;
    if(typeof player!=='undefined')player.busy=s.busy;
    clearInput();
    if(s.previous&&s.previous.isConnected)s.previous.focus({preventScroll:true});
    if(typeof run==='function')run();
  }
  function open(kind,title){
    if(active)finish(active); // устаревшие кнопки и таймеры больше не могут завершить новую сцену
    const root=el('section','modal story-modal story-'+kind);root.id='storyDialog';root.tabIndex=-1;
    root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','story-title');
    const shell=el('div','story-shell'),head=el('header','story-head'),titleEl=el('h2','',title);titleEl.id='story-title';
    head.append(el('span','story-eyebrow','ЖИВАЯ КАЗАНЬ · ИСТОРИЯ'),titleEl);
    const body=el('div','story-body'),foot=el('footer','story-actions');shell.append(head,body,foot);root.append(shell);
    const s={id:++serial,root,shell,body,foot,timers:[],done:false,previous:document.activeElement,inert:[],busy:typeof player!=='undefined'?player.busy:false};
    for(const n of document.body.children)if(n instanceof HTMLElement&&!/^(SCRIPT|STYLE|LINK)$/.test(n.tagName)){s.inert.push([n,n.inert]);n.inert=true;}
    active=s;clearInput();if(typeof player!=='undefined')player.busy=true;
    document.body.append(root);document.body.classList.add('story-open');return s;
  }
  function buttons(s,choices){
    choices.forEach(c=>{const b=el('button','story-button'+(c.primary?' is-primary':'')+(c.tone==='alert'?' is-alert':''),c.t);b.type='button';b.addEventListener('click',()=>finish(s,c.run));s.foot.append(b);});
    s.foot.querySelector('button').focus({preventScroll:true});
  }
  function documentView(kind,o){
    if(!o||!Array.isArray(o.choices)||!o.choices.length)throw new TypeError('storyUI: choices must contain a story action');
    const bill=kind==='bill',s=open(kind,bill?'Счёт принесли.':'Посмотрите на цены.');
    const paper=el('article','story-paper');paper.append(el('div','story-paper-kicker',bill?'СЧЁТ ЗА СТОЛ':'МЕНЮ'),el('h3','story-place',o.place||'Кафе'),el('p','story-paper-note',bill?'Ваш вечер в цифрах':'Цены за одну порцию'));
    const list=el('dl','story-items');
    for(const item of o.items||[]){const row=el('div','story-item');row.append(el('dt','',item.name),el('dd','',rub(item.price)));list.append(row);}
    paper.append(list);
    if(bill){const total=el('div','story-total');total.append(el('span','','ИТОГО'),el('strong','',rub(o.total)));paper.append(total,el('p','story-paper-note','Проверьте позиции перед оплатой.'));}
    else paper.append(el('p','story-menu-note','Официант ждёт вашего решения.'));
    if(o.line)s.body.append(el('p','story-say','«'+o.line+'»'));   // слова официанта (story.js)
    s.body.append(paper);buttons(s,o.choices);return s.root;
  }
  // Две небольшие векторные сцены; никаких изображений, сети или покадрового JS.
  function wakeArt(kind){
    const box=el('div','story-wake-art');box.setAttribute('aria-hidden','true');
    const hospital=kind==='hospital';
    const scene=hospital?
      '<rect width="640" height="380" fill="#263f41"/><path d="M0 245H640V380H0Z" fill="#1b3032"/><path d="M420 40H590V220H420Z" fill="#92aaa2"/><path d="M505 40V220M420 130H590" stroke="#456965" stroke-width="9"/><path d="M427 45L440 228M582 45L566 228" stroke="#d5dbcb" stroke-width="27"/><path d="M75 280L170 183H345L410 305Z" fill="#698e89"/><path d="M90 272L174 194H330L392 293Z" fill="#c9d5ca"/><path d="M130 247L170 203H228L204 247Z" fill="#eef0df"/><path d="M208 251L245 202H330L392 293H183Z" fill="#629b96"/><path d="M74 283V337M410 305V353M72 283H410M69 264V288M410 284V313" stroke="#93a9a1" stroke-width="8"/><path d="M365 112V278M340 278H390M365 112H391" stroke="#bbc8bd" stroke-width="5"/><rect x="380" y="120" width="23" height="42" rx="5" fill="#d3e5d9"/><path d="M390 161Q414 221 362 256" fill="none" stroke="#bccfc6" stroke-width="3"/>':
      '<rect width="640" height="380" fill="#293e44"/><path d="M0 180L80 120L145 164L242 102L335 173L420 118L540 167L640 112V310H0Z" fill="#455d5a"/><path d="M0 273L640 245V380H0Z" fill="#7b8378"/><path d="M0 317L640 289" stroke="#a3a494" stroke-width="3"/><path d="M70 0L90 280M505 0L523 267" stroke="#223b3a" stroke-width="21"/><path d="M81 94L142 32M512 88L450 34" stroke="#223b3a" stroke-width="12"/><path d="M165 204L443 189M163 228L447 213M154 266L463 250" stroke="#ba9164" stroke-width="18"/><path d="M173 193L180 321M436 180L449 307M164 277L451 263" stroke="#243d3e" stroke-width="8"/><path d="M161 263L176 233M454 250L442 219" stroke="#243d3e" stroke-width="7"/><path d="M565 183V268M551 183H580" stroke="#b4b89f" stroke-width="5"/>';
    box.innerHTML='<svg viewBox="0 0 640 380" focusable="false" xmlns="http://www.w3.org/2000/svg">'+scene+'</svg>';
    return box;
  }
  function wake(o={}){
    const hospital=o.kind==='hospital',s=open('wake',hospital?'Палата. Утро.':'Утро на скамейке.');
    s.shell.prepend(wakeArt(o.kind));s.shell.append(el('div','story-wake-dark'));
    const lines=Array.isArray(o.lines)?o.lines.filter(x=>x!=null).map(String):[];
    const text=el('p','story-wake-line'),progress=el('span','story-wake-progress');text.setAttribute('aria-live','polite');text.setAttribute('aria-atomic','true');s.body.append(text,progress);
    const next=el('button','story-button is-primary','Открыть глаза');next.type='button';s.foot.append(next);
    let i=-1;
    const advance=()=>{if(active!==s)return;s.root.classList.add('is-awake');if(++i>=lines.length){finish(s,o.onDone);return;}text.textContent=lines[i];progress.textContent=(i+1)+' / '+lines.length;next.textContent=i===lines.length-1?'Подняться':'Дальше';};
    next.addEventListener('click',advance);s.advance=advance;
    // Первый абзац появляется после короткого пробуждения. Ранний тап пропускает ожидание.
    s.timers.push(setTimeout(()=>{if(active===s&&i<0)advance();},matchMedia('(prefers-reduced-motion: reduce)').matches?0:2600));
    s.root.addEventListener('click',e=>{if(!e.target.closest('button'))advance();});next.focus({preventScroll:true});return s.root;
  }
  window.addEventListener('keydown',e=>{
    const s=active;if(!s)return;
    e.stopImmediatePropagation();
    if(e.key==='Tab'){
      const items=[...s.foot.querySelectorAll('button')],first=items[0],last=items[items.length-1];
      if(e.shiftKey&&(document.activeElement===first||!s.root.contains(document.activeElement))){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&(document.activeElement===last||!s.root.contains(document.activeElement))){e.preventDefault();first.focus();}
    }else if(e.key==='Escape'){e.preventDefault();} // обязательный выбор; Telegram Back не обходит движок
    else if((e.key==='Enter'||e.key===' ')&&s.root.contains(document.activeElement)&&document.activeElement.tagName==='BUTTON'){if(e.repeat)e.preventDefault();}
    else e.preventDefault();
  },true);
  function inbox(messages){
    const root=el('div','story-inbox'),threads=new Map(),entries=[];let order=0;
    for(const m of (messages||[]).slice(-30)){
      order++;
      if(m.kind==='story'){
        const from=String(m.from||'Сообщения');let t=threads.get(from);
        if(!t){t={from,messages:[]};threads.set(from,t);entries.push(t);}t.messages.push(m);t.at=m.at||0;t.order=order;
      }else entries.push({message:m,at:m.at||0,order});
    }
    entries.sort((a,b)=>b.at-a.at||b.order-a.order);
    for(const entry of entries){
      if(entry.messages){
        const thread=el('details','story-thread');thread.open=true;
        const head=el('summary','story-thread-head'),avatar=el('span','story-avatar',entry.from.slice(0,1));avatar.setAttribute('aria-hidden','true');
        head.append(avatar,el('strong','',entry.from),el('span','story-thread-count',entry.messages.length));thread.append(head);
        const list=el('ol','story-messages');for(const m of entry.messages){const row=el('li','story-message');row.append(el('p','',m.text),el('small','','День '+(m.day||1)));list.append(row);}thread.append(list);root.append(thread);
      }else{
        const m=entry.message,status=['story-status','police-status','police'].includes(m.kind),card=el('article',status?'story-police-card':'story-phone-note');
        if(status)card.append(el('span','story-status-label','ЗАЯВЛЕНИЕ · СТАТУС'));
        card.append(el('strong','',m.from||'Город'),el('p','',m.text));root.append(card);
      }
    }
    return root;
  }
  function demo(kind){
    if(kind==='ward'){if(active)finish(active);enterInterior({kind:'hospital',name:'Палата',key:'story:ward'});renderInterior();return interior;}
    if(kind==='wake')return wake({kind:'bench',lines:['Холодная скамейка. Город уже проснулся.','Телефона нет. В карманах пусто.','Нужно вспомнить, что было вчера.'],onDone(){}});
    const o={place:'Лунный двор',items:[{name:'Салат «Первое впечатление»',price:4800},{name:'Паста от шефа',price:9200},{name:'Авторский лимонад, 2 бокала',price:12000},{name:'Десерт «Особенный вечер»',price:6000},{name:'Сервис стола',price:8000}],total:40000,
      choices:kind==='menu'?[{t:'Заказать',run(){},primary:true},{t:'Уйти из кафе',run(){}}]:[{t:'Оплатить 40 000 ₽',run(){},primary:true},{t:'Не буду платить',run(){},tone:'alert'},{t:'Позвонить 112',run(){}}]};
    if(kind==='bill'||kind==='menu')return documentView(kind,o);
    throw new TypeError('Unknown storyUI demo: '+kind);
  }
  window.storyUI={bill:o=>documentView('bill',o),menu:o=>documentView('menu',o),wake,inbox,demo};
})();
