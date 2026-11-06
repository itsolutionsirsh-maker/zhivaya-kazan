// Счётчик живых открытий. Числа отдаются только с пропуском автора.
(function(){
  const KEY='zk.visitOpen';
  const TICKET='zk.adminTicket';
  function api(){
    const m=location.pathname.match(/^(\/hds-[a-z0-9]+-\d+-[a-z0-9]+)/i);
    return (m?m[1]:'')+'/api/city-visits';
  }
  function token(){
    try{
      let id=localStorage.getItem('zk.cid');
      if(!id||!/^[a-f0-9]{16}$/.test(id)){
        id=Array.from(crypto.getRandomValues(new Uint8Array(8))).map(b=>b.toString(16).padStart(2,'0')).join('');
        localStorage.setItem('zk.cid',id);
      }
      return id;
    }catch(e){return null;}
  }
  function ticket(){try{return sessionStorage.getItem(TICKET)||'';}catch(e){return '';}}
  function src(){try{return typeof netSrc==='function'?netSrc():'web';}catch(e){return 'web';}}
  async function ping(open){
    const t=token();if(!t)return;
    const r=await fetch(api(),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token:t,open:!!open,src:src()})});
    if(!r.ok)throw new Error('ping');
  }
  async function load(){
    const r=await fetch(api(),{cache:'no-store',headers:{'x-zk-ticket':ticket()}});
    if(r.status===404){try{sessionStorage.removeItem(TICKET);}catch(e){}throw new Error('locked');}
    if(!r.ok)throw new Error('load');
    const j=await r.json();
    if(!j||!j.ok)throw new Error('load');
    return j;
  }
  function n(v){return (Number(v)||0).toLocaleString('ru-RU');}
  function mskStamp(offset){
    const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'});
    return fmt.format(new Date(Date.now()+offset*86400000));
  }
  function dayLabel(iso){
    const p=String(iso).slice(0,10).split('-');
    if(p.length<3)return iso;
    const dt=new Date(Date.UTC(+p[0],+p[1]-1,+p[2]));
    return dt.toLocaleDateString('ru-RU',{day:'numeric',month:'short',timeZone:'UTC'}).replace('.','');
  }
  function tile(label,value){
    const d=document.createElement('div');
    const b=document.createElement('b');b.textContent=value;
    const s=document.createElement('span');s.textContent=label;
    d.append(b,s);return d;
  }
  function showLock(){
    const lock=$('#adminLock'),body=$('#adminBody'),refresh=$('#adminRefresh');
    if(lock)lock.hidden=false;
    if(body)body.hidden=true;
    if(refresh)refresh.hidden=true;
  }
  function showStats(){
    const lock=$('#adminLock'),body=$('#adminBody'),refresh=$('#adminRefresh');
    if(lock)lock.hidden=true;
    if(body)body.hidden=false;
    if(refresh)refresh.hidden=false;
  }
  function paint(d){
    const nums=$('#adminNums'),days=$('#adminDays'),note=$('#adminNote');
    if(!nums)return;
    nums.replaceChildren(
      tile('Сейчас открыто',n(d.online)),
      tile('Сегодня людей',n(d.todayPeople)),
      tile('Открытий сегодня',n(d.todayOpens)),
      tile('Людей за 7 дней',n(d.weekPeople)),
      tile('Людей всего',n(d.allPeople)),
      tile('Пришли снова',n(d.returned))
    );
    const by=new Map((d.days||[]).map(x=>[String(x.day).slice(0,10),x]));
    const list=[];
    for(let i=0;i<=13;i++){
      const day=mskStamp(-i);
      const row=by.get(day)||{people:0,opens:0};
      list.push({day,people:Number(row.people)||0,opens:Number(row.opens)||0});
    }
    const max=Math.max(1,...list.map(x=>x.people));
    if(days){
      days.replaceChildren();
      for(const row of list){
        const line=document.createElement('div');line.className='d';
        const lab=document.createElement('span');lab.textContent=dayLabel(row.day);
        const bar=document.createElement('i');
        bar.style.width=Math.max(row.people?4:0,Math.round(row.people/max*100))+'%';
        const wrap=document.createElement('span');wrap.append(bar);
        const em=document.createElement('em');em.textContent=String(row.people);
        line.append(lab,wrap,em);days.append(line);
      }
    }
    const bits=[];
    if(d.fromTg)bits.push('из Телеграма '+n(d.fromTg));
    if(d.fromRef)bits.push('по ссылке друга '+n(d.fromRef));
    if(note){
      note.textContent='«Сейчас» — кто не закрыл игру последние три минуты, вы тоже в этом числе. Один браузер — один человек, имя не пишется. Жители на улицах сюда не входят.'
        +(bits.length?' Откуда заходили: '+bits.join(', ')+'.':'')
        +' В предпросмотре счётчик временный. У опубликованной игры он общий и остаётся.';
    }
  }
  async function draw(){
    const note=$('#adminNote');
    if(note)note.textContent='Считаем…';
    try{await ping(false);paint(await load());showStats();}
    catch(e){
      if(e&&e.message==='locked'){showLock();const msg=$('#adminLockMsg');if(msg)msg.textContent='Код снова нужен.';return;}
      showStats();
      if(note)note.textContent='Счётчик не ответил.';
    }
  }
  function openAdmin(){
    const m=$('#adminModal');if(!m)return;
    m.hidden=false;
    if(typeof player!=='undefined'&&player)player.busy=true;
    const msg=$('#adminLockMsg');if(msg)msg.textContent='';
    if(ticket())draw();else showLock();
    const input=$('#adminCode');
    if(input&&!ticket())setTimeout(()=>input.focus(),50);
  }
  function closeAdmin(){
    const m=$('#adminModal');if(m)m.hidden=true;
    const menu=$('#menuModal');
    if(typeof player!=='undefined'&&player&&(!menu||menu.hidden))player.busy=false;
  }
  async function enter(){
    const input=$('#adminCode'),msg=$('#adminLockMsg');
    const code=input?String(input.value||'').trim():'';
    if(!code){if(msg)msg.textContent='Введите код.';return;}
    if(msg)msg.textContent='Проверяем…';
    try{
      const r=await fetch(api(),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({a:'enter',code})});
      const j=await r.json().catch(()=>null);
      if(r.status===429){if(msg)msg.textContent='Слишком много попыток. Подождите.';return;}
      if(!r.ok||!j||!j.ticket){if(msg)msg.textContent='Не тот код.';if(input)input.select();return;}
      try{sessionStorage.setItem(TICKET,j.ticket);}catch(e){}
      if(input)input.value='';
      if(msg)msg.textContent='';
      draw();
    }catch(e){if(msg)msg.textContent='Не вышло проверить код.';}
  }
  function boot(){
    let open=false;
    try{if(!sessionStorage.getItem(KEY)){sessionStorage.setItem(KEY,'1');open=true;}}catch(e){open=true;}
    ping(open).catch(()=>{});
    setInterval(()=>{if(document.visibilityState!=='hidden')ping(false).catch(()=>{});},45000);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')ping(false).catch(()=>{});});
    const close=$('#adminClose');if(close)close.addEventListener('click',closeAdmin);
    const ref=$('#adminRefresh');if(ref)ref.addEventListener('click',draw);
    const go=$('#adminEnter');if(go)go.addEventListener('click',enter);
    const input=$('#adminCode');
    if(input)input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();enter();}});
    const btn=$('#adminBtn');if(btn)btn.addEventListener('click',openAdmin);
    const hud=$('#analyticsBtn');if(hud)hud.addEventListener('click',openAdmin);
    window.addEventListener('keydown',e=>{
      if(e.key!=='Escape')return;
      const m=$('#adminModal');
      if(!m||m.hidden)return;
      closeAdmin();
      e.stopPropagation();
    },true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
