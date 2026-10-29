// District map and the first NPC territorial encounter. Account state lives on the server.
(function(){
  'use strict';
  const R=TerritoryRules,$id=id=>document.getElementById(id),modal=$id('territoryModal'),meeting=$id('territoryMeeting');
  let state=null,identity='',pending=false,selected='vahitovsky',local=null,timer=0,poll=0,dwell=0,lastDistrict=null;
  let actorSit=null,meetingId=null,busyBefore=false,mapBuilt=false,retry=null,lastHistory=null;
  const messages={auth:'Войдите в аккаунт через меню, чтобы вступить и сохранить членство.',conflict:'Состояние изменилось на другом устройстве. Проверьте выбор ещё раз.',
    visit_home:'Для вступления нужно прийти пешком в выбранный район.',street_only:'Встреча доступна пешком на улице.',home:'Это ваш район — чужого патруля здесь нет.',
    switch_cooldown:'После выхода или вступления сменить группировку можно через 30 минут.',encounter_cooldown:'Следующая встреча будет позже.',border:'Отойдите от границы района хотя бы на 20 метров.',
    return_to_meeting:'Вернитесь к месту встречи или выберите «Уйти».',busy:'Сервер не смог сохранить действие. Повторите его.',rate_limited:'Слишком много действий. Подождите минуту.',
    encounter:'Встреча уже завершена. Состояние обновлено.',active:'У вас уже есть незаконченная встреча.',neutral:'Нейтрального игрока районные встречи не затрагивают.',story_place:'Подойдите пешком к отмеченному месту встречи.',story_stage:'Шаг истории уже изменился. Показано сохранённое состояние.',story_membership:'Вы уже в другой группировке. Можно сыграть гостем, сохранив свой статус.',story_visited:'Знакомый уже помнит ваше возвращение.'};
  const endings={vouched:'Вы назвали знакомого с турнира. Местные узнали историю: «К нему? Проходи». Встреча завершилась мирно, уважение не меняется.',peace:'Вы объяснили, что идёте по своим делам. Местные уступили дорогу: «Ладно, проходи. Без шума». Уважение +1.',
    won:'Вы приняли вызов и выстояли. Местные прекращают стычку и дают пройти. Уважение +2.',
    lost:'Местные оказались сильнее. Вы отступили: уважение −1, минимум 0. Деньги и вещи остались при вас.',
    left:'Вы ушли без конфликта. Членство сохранилось, деньги и вещи при вас.',expired:'Разговор так и не состоялся. Местные разошлись; наказания нет.'};
  const ending=h=>h.training?({won:'В учебном спарринге вы выстояли против двоих гостей. Дома ваша сила 84 вместо 70. Уважение не меняется.',lost:'В учебном спарринге гости оказались сильнее. Домашний бонус не гарантирует победу. Уважение не меняется.',peace:'Вы обсудили правила и разошлись без спарринга.',left:'Тренировку отменили. Никаких потерь.',expired:'Время тренировки вышло. Никаких потерь.'}[h.result]):endings[h.result];
  const token=()=>typeof acct!=='undefined'&&acct?acct.token:'';
  const available=()=>!!(token()&&Net.territories&&Net.syncReady&&(Net.mode==='ws'||Net.mode==='http'));
  function emit(){window.dispatchEvent(new Event('territorychange'));}
  function notice(text){$id('territoryNotice').textContent=text;$id('territoryMeetingNotice').textContent=text;emit();}
  function changedAccount(){const current=token();if(current===identity)return false;identity=current;state=null;retry=null;lastHistory=null;dwell=0;poll=0;closeMeeting();emit();return true;}
  function requestId(){return Array.from(crypto.getRandomValues(new Uint8Array(12)),b=>b.toString(16).padStart(2,'0')).join('');}
  async function request(op='status',extra={},repeat=false){
    changedAccount();if(pending)return null;if(!available()){notice(token()?'Подключаемся к серверу города…':messages.auth);renderMap();return null;}
    const who=identity,payload=repeat&&retry?retry:{op,rev:state?state.rev:0,...extra,...(op==='status'?{}:{request:requestId()})};
    pending=true;if(op!=='status')retry=payload;renderButtons();notice('');
    try{
      const response=await fetch('api.php',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',
        body:JSON.stringify({a:'territory',token:who,id:myCid,...payload}),signal:AbortSignal.timeout(12000)});
      if(!response.ok)throw Error('http');const result=await response.json();
      if(token()!==who){changedAccount();return null;}
      retry=null;
      if(result.state){state=result.state;poll=0;
        const h=state.history[0];if(h&&lastHistory&&h.id!==lastHistory)addEvent('Районы: '+ending(h),'say');lastHistory=h?h.id:'none';}
      if(!result.ok)notice(messages[result.err]||'Действие не выполнено. Обновите состояние и попробуйте снова.');
      if(!meeting.hidden)renderMeeting();renderMap();return result;
    }catch(e){if(token()===who)notice('Связь прервалась. '+(retry?'Нажмите «Повторить действие» — результат не начислится дважды.':'Карта доступна; членство обновится после подключения.'));return null;
    }finally{pending=false;renderButtons();emit();}
  }
  function updateLocal(){local=world&&R.at(player.x,player.y,world.meta);}
  const projection=(()=>{const ds=R.data.districts,x0=Math.min(...ds.map(d=>d.bbox[0])),y0=Math.min(...ds.map(d=>d.bbox[1])),x1=Math.max(...ds.map(d=>d.bbox[2])),y1=Math.max(...ds.map(d=>d.bbox[3]));
    const scale=Math.min(792/((x1-x0)*.56),572/(y1-y0));return (lon,lat)=>[24+(lon-x0)*.56*scale,596-(lat-y0)*scale];})();
  function svgNode(tag,attrs){const el=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);return el;}
  function buildMap(){if(mapBuilt)return;mapBuilt=true;const svg=$id('territoryMap'),list=$id('territoryList');
    for(const d of R.data.districts){const path=svgNode('path',{d:d.outer.concat(d.inner).map(r=>r.map((p,i)=>(i?'L':'M')+projection(...p).map(n=>n.toFixed(2)).join(',')).join('')+'Z').join(' '),
      fill:R.factions[d.id].color,'fill-rule':'evenodd','data-district':d.id,stroke:'#172738','stroke-width':2});
      const title=svgNode('title',{});title.textContent=d.name+' · '+R.factions[d.id].name;path.append(title);path.addEventListener('click',()=>{selected=d.id;renderMap();});svg.append(path);
      const btn=document.createElement('button');btn.type='button';btn.className='btn territory-pick';btn.dataset.district=d.id;
      const dot=document.createElement('span');dot.className='territory-dot';dot.style.backgroundColor=R.factions[d.id].color;btn.append(dot,document.createTextNode(d.name.replace(' район','')));
      btn.addEventListener('click',()=>{selected=d.id;renderMap();});list.append(btn);
    }
    const pin=svgNode('g',{id:'territoryPin','pointer-events':'none'});pin.append(svgNode('circle',{r:10,fill:'#fff',stroke:'#111827','stroke-width':4}),svgNode('circle',{r:3,fill:'#111827'}));svg.append(pin);
  }
  function renderButtons(){
    const online=available(),d=R.get(selected);$id('territoryJoin').disabled=pending||!online||!state||!!state.member||!local||local.id!==selected||Date.now()<state.switchAt||!!player.vehicle||!!player.bus||player.inside;
    $id('territoryJoin').textContent='Вступить: '+R.factions[d.id].name;
    $id('territoryLeave').hidden=!(state&&state.member);$id('territoryLeave').disabled=pending;
    $id('territoryTrain').hidden=!(state&&state.member&&local&&state.member===local.id);$id('territoryTrain').disabled=pending||!online||!!(state&&state.active)||!!(state&&Date.now()<state.practiceAt)||!!player.vehicle||!!player.bus||player.inside;
    $id('territoryResume').hidden=!(state&&state.active);$id('territoryResume').disabled=pending;
    for(const id of ['territoryRetry','territoryMeetingRetry']){$id(id).hidden=!retry;$id(id).disabled=pending;}
    for(const b of $id('territoryChoices').querySelectorAll('button'))b.disabled=pending;
    $id('territoryMeetingClose').disabled=pending;$id('territoryRefresh').disabled=pending;
  }
  function renderMap(){buildMap();updateLocal();const d=R.get(selected),member=state&&state.member;
    for(const el of modal.querySelectorAll('[data-district]')){const isSelected=el.dataset.district===selected;el.classList.toggle('selected',isSelected);el.classList.toggle('home',el.dataset.district===member);if(el.tagName==='BUTTON')el.setAttribute('aria-pressed',String(isSelected));}
    $id('territoryLocation').textContent=local?'Вы сейчас: '+local.name:'Вы за пределами районов Казани';
    $id('territoryStatus').textContent=!token()?'Нейтральный гость':!state?'Загружаем членство…':member?'Вы в «'+R.factions[member].name+'» · уважение '+state.standing+' / 100':'Нейтральный: районные конфликты вас не затрагивают';
    $id('territorySelected').textContent=d.name+' · «'+R.factions[selected].name+'»';
    $id('territoryDetail').textContent=member===selected?'Ваша территория. Сила в районных стычках +20%.':member?'Чужая территория: ваша сила обычная, у местных +20%. Здесь возможна встреча; всегда можно уйти.':'Чтобы вступить, придите пешком в этот район. Вступление добровольное; выйти можно в любое время.';
    $id('territoryCooldown').textContent=state?[[state.switchAt,'Смена группировки'],[state.nextAt,'Следующая встреча'],[state.practiceAt,'Следующая тренировка']].filter(([at])=>Date.now()<at).map(([at,label])=>label+' — через '+Math.ceil((at-Date.now())/60000)+' мин.').join(' '):'';
    const h=state&&state.history[0];$id('territoryHistory').textContent=h?'Последняя встреча · '+R.get(h.district).name+': '+ending(h):'';
    const ll=world&&R.lonLat(player.x,player.y,world.meta),pin=$id('territoryPin');pin.style.display=local?'':'none';if(ll)pin.setAttribute('transform','translate('+projection(...ll).join(' ')+')');
    if(!available()&&!pending)notice(token()?'Для вступления нужен сервер города. Карта работает и без связи.':messages.auth);renderButtons();
  }
  function openMap(){changedAccount();if(!$id('menuModal').hidden)$id('menuClose').click();busyBefore=player.busy;player.busy=true;modal.hidden=false;updateLocal();selected=local?local.id:'vahitovsky';renderMap();request();}
  function closeMap(){modal.hidden=true;player.busy=busyBefore;}
  function closeMeeting(){meeting.hidden=true;if(meetingId){player.busy=busyBefore;meetingId=null;}if(actorSit){endSit(actorSit);actorSit=null;}}
  function renderMeeting(){
    const e=state&&state.active,choices=$id('territoryChoices');choices.replaceChildren();
    $id('territoryMeetingClose').textContent=e?'Уйти без конфликта':'Продолжить прогулку';
    if(!e){const h=state&&state.history[0];$id('territoryMeetingText').textContent=h?ending(h):'Встреча завершена.';$id('territoryPower').textContent='';renderButtons();return;}
    $id('territoryMeetingTitle').textContent=(e.training?'Спарринг дома · ':'Чужой двор · ')+R.get(e.district).name;
    $id('territoryMeetingText').textContent=e.training?'Во дворе согласились на учебный спарринг с двумя гостями из «'+R.factions[e.opponent].name+'». Здесь вы лучше знаете место: сила +20%. Это тренировка, без потери вещей и уважения.':e.phase==='greeting'?'Двое местных заметили, что вы из «'+R.factions[e.member].name+'». Глеб останавливается: «Ты к кому? Здесь наши дворы».':'«Если по делу — скажи спокойно. Или хочешь что-то доказать?» За спиной Глеба второй парень молча ждёт вашего ответа.';
    $id('territoryPower').textContent='Ваша сила: '+e.power.player+' · двое соперников: '+e.power.locals+(e.training?' (домашний бонус +20% у вас).':' (домашний бонус +20% у местных).')+' Шанс выстоять: '+Math.round(e.power.chance*100)+'%. Бонус закреплён до конца встречи.';
    const friend=!e.training&&typeof YardStory!=='undefined'&&YardStory.passage(state.story,e.district);
    if(friend){const b=document.createElement('button');b.type='button';b.className='btn primary';b.textContent='Назвать знакомого с турнира · пройти мирно';b.addEventListener('click',()=>request('choice',{encounter:e.id,choice:'friend'}));choices.append(b);}
    for(const [choice,label] of (e.training?[['stand','Начать учебный спарринг']]:e.phase==='greeting'?[['talk','Поговорить спокойно'],['stand','Принять вызов · риск потерять уважение']]:[['pass','Объяснить: я здесь по своим делам'],['stand','Всё же принять вызов']])){
      const b=document.createElement('button');b.type='button';b.className='btn';b.textContent=label;b.addEventListener('click',()=>request('choice',{encounter:e.id,choice}));choices.append(b);
    }renderButtons();
  }
  function showMeeting(){if(!state||!state.active||!meeting.hidden)return;
    if(!modal.hidden)closeMap();busyBefore=player.busy;meetingId=state.active.id;player.busy=true;meeting.hidden=false;notice('');renderMeeting();
    actorSit=startSit('territoryActors',{encounter:state.active});
  }
  // площадь или парк без дорожек рядом: ставим местных просто в паре шагов, где нет дома (иначе встреча шла без людей)
  function nearFree(i){for(let k=0;k<8;k++){const a=i*2.4+k*0.8,x=player.x+Math.cos(a)*4,y=player.y+Math.sin(a)*4;if(!inBuilding(x,y))return [x,y];}return null;}
  defSit('territoryActors',{start(s){const e=s.encounter;for(let i=0;i<2;i++){
      const q=spotNear(3,14)||spotNear(8,40)||nearFree(i);if(!q)continue;const n=nearestNode(q[0],q[1],world.pedAdj,300);if(n<0)continue;
      const w=new Walker('resident',n);w.temp=true;w.x=q[0];w.y=q[1];w.p.name=i?'Денис':'Глеб';w.p.female=false;w.p.job=R.factions[e.opponent].name;w.p.clothes=R.factions[e.opponent].color;
      walkers.push(w);takeActor(s,w);faceTo(w,player.x,player.y);
    }return true;}});
  $id('territoryBtn').addEventListener('click',openMap);$id('territoryClose').addEventListener('click',closeMap);
  $id('territoryRefresh').addEventListener('click',()=>request());
  $id('territoryJoin').addEventListener('click',()=>request('join',{member:selected}));
  $id('territoryLeave').addEventListener('click',()=>request('leave'));
  $id('territoryTrain').addEventListener('click',async()=>{const r=await request('start',{mode:'training'});if(r&&r.ok)showMeeting();});
  $id('territoryResume').addEventListener('click',showMeeting);
  $id('territoryMeetingClose').addEventListener('click',async()=>{const e=state&&state.active;if(e){const result=await request('choice',{encounter:e.id,choice:'leave'});if(!result||!result.ok)return;}closeMeeting();});
  for(const id of ['territoryRetry','territoryMeetingRetry'])$id(id).addEventListener('click',()=>request(retry?retry.op:'status',{},true));
  defWatch(dt=>{timer+=dt;if(timer<2)return;const elapsed=timer;timer=0;changedAccount();updateLocal();poll+=elapsed;
    if(!modal.hidden)renderMap();if(!available()||pending)return;
    if(!state||poll>60){request();return;}
    const district=local&&local.id;if(district!==lastDistrict){lastDistrict=district;dwell=0;}
    const free=scene==='city'&&!player.busy&&!player.inside&&!player.vehicle&&!player.bus&&player.state==='ok'&&!SIT.card;
    if(!free){dwell=0;return;}
    if(state.active){showMeeting();return;}
    if((state.story&&state.story.stage!=='done')||!state.member||!local||local.id===state.member||Date.now()<state.nextAt){dwell=0;return;}
    dwell+=elapsed;if(dwell<12)return;dwell=0;
    const ll=R.lonLat(player.x,player.y,world.meta);if(R.borderDistance(local,...ll)<20)return;
    request('start').then(result=>{if(result&&result.ok&&state&&state.active&&!player.busy&&scene==='city')showMeeting();});
  });
  // Snapshot reads and validated chapter requests. No client state setter.
  window.cityTerritories={open:openMap,refresh:()=>request(),snapshot:()=>state?JSON.parse(JSON.stringify(state)):null,openMeeting:showMeeting,story:extra=>request('story',extra),retry:()=>request(retry?retry.op:'status',{},true),connection:()=>({pending,ready:available(),retry:!!retry,message:$id('territoryNotice').textContent})};
})();
