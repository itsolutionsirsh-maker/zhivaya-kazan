// Journal, sidewalk actors and routes. All chapter transitions are validated by the server.
(function(){
  'use strict';
  const D=YardStory,$=id=>document.getElementById(id),modal=$('yardModal');
  let person=null,busyBefore=false,cast=null,castKey='',tick=0,identity='',seenStage=null,invited=false,lastRender='',lastPage='';
  const spots=new Map();let spotWorld=null;
  const snapshot=()=>cityTerritories.snapshot(),story=()=>{const s=snapshot();return s&&s.story;};
  function account(){return typeof acct!=='undefined'&&acct?acct.token:'';}
  function release(){if(cast)endSit(cast);cast=null;castKey='';}
  function syncAccount(){if(identity===account())return;identity=account();person=null;seenStage=null;invited=false;release();unmark('yard:target');if(!modal.hidden)close();}
  function target(){const s=story();return s&&s.stage==='done'?(person?D.people[person].place:null):D.step(s).place;}
  function sidewalk(place){
    if(!world||!world.pedAdj)return null;if(spotWorld!==world){spots.clear();spotWorld=world;}
    if(spots.has(place)){const q=spots.get(place);if(!inBuilding(q.x,q.y))return q;spots.delete(place);}
    const p=D.point(place,world.meta);if(!p)return null;
    const n=nearestNode(p.x,p.y,world.pedAdj,75);if(n<0)return null;
    const q=sidewalkPos(n);if(!q||inBuilding(q[0],q[1])||Math.hypot(q[0]-p.x,q[1]-p.y)>75)return null;
    const d=TerritoryRules.at(q[0],q[1],world.meta);if(!d||d.id!==D.places[place].district)return null;
    const result={x:q[0],y:q[1],node:n};spots.set(place,result);return result;
  }
  function near(place){const q=sidewalk(place);return !!(q&&scene==='city'&&!player.inside&&!player.vehicle&&!player.bus&&player.state==='ok'&&dist(player.x,player.y,q.x,q.y)<12);}
  function close(){modal.hidden=true;player.busy=busyBefore;}
  function open(id=null){
    syncAccount();person=id&&D.people[id]?id:null;
    if(!$('menuModal').hidden)$('menuClose').click();if(!$('territoryModal').hidden)$('territoryClose').click();
    if(modal.hidden){busyBefore=player.busy;player.busy=true;modal.hidden=false;}
    lastRender='';render();cityTerritories.refresh();
  }
  async function choose(choice){const s=story();await cityTerritories.story({step:s?s.stage:'invite',choice});}
  function button(label,fn,disabled=false){const b=document.createElement('button');b.type='button';b.className='btn';b.textContent=label;b.disabled=disabled;b.addEventListener('click',fn);return b;}
  function render(){
    if(modal.hidden)return;
    const state=snapshot(),s=state&&state.story,conn=cityTerritories.connection(),page=s&&s.stage==='done'?D.endings[s.ending]:D.step(s),place=target();
    const renderKey=JSON.stringify([state,person,conn,!!Net.yardStory,account(),place&&near(place),scene,place&&!!sidewalk(place)]);
    if(renderKey===lastRender)return;lastRender=renderKey;
    const ready=conn.ready&&Net.yardStory&&!!state&&!conn.pending&&!conn.retry;
    $('yardClose').textContent=s&&s.stage==='done'?'Вернуться в город':'Продолжить позже';
    $('yardTitle').textContent=s&&s.stage==='done'&&person?'После турнира · '+D.people[person].name:'Чужой двор · '+page.title;
    $('yardProgress').textContent=s&&s.stage==='done'?'Глава завершена · решение сохранено':s?'Шаг '+(s.log.length+1)+' из 7 · можно продолжить в другой день':'Глава 1 · два района, четыре знакомых, три развязки';
    $('yardSpeaker').textContent=s&&s.stage==='done'&&person?D.people[person].role:page.who?D.people[page.who].name+(page.remote?' · по телефону':''):'';
    $('yardText').textContent=s&&s.stage==='done'&&person?D.greeting(s,person):page.text;
    $('yardPlace').textContent=place?(near(place)?'Вы у места встречи.':D.places[place].name+'. '+(sidewalk(place)?'Доберитесь любым способом; к собеседнику подойдите пешком.':'Дорожка появится после загрузки района. Маршрут ведёт к месту встречи.')):'Историю можно начать здесь. Членство изменится только по вашему явному выбору.';
    const choices=$('yardChoices');choices.replaceChildren();
    if(!s||s.stage!=='done')for(const c of page.choices){
      const blocked=c.id==='join'&&s&&(state.member&&state.member!==D.endings[s.ending].district||!state.member&&Date.now()<state.switchAt);
      const label=c.id==='join'&&s?'Вступить в «'+TerritoryRules.factions[D.endings[s.ending].district].name+'» и завершить':c.label;
      choices.append(button(label,()=>choose(c.id),!ready||!!state.active||!!(place&&!near(place))||!!blocked));
    }
    if(s&&s.stage==='done'&&person&&!s.visits[person])choices.append(button('Поговорить после турнира',()=>cityTerritories.story({step:'visit',person}),!ready||!near(place)));
    if(s&&s.stage==='done'){
      $('yardPlace').textContent=person?$('yardPlace').textContent:'Знакомые остались в городе. Выберите человека ниже и вернитесь к нему: он помнит ваш выбор.';
      if(!person){const status=state.member?'Вы в «'+TerritoryRules.factions[state.member].name+'».':'Вы независимы.';$('yardText').textContent+='\n\n'+status+' Знакомство можно назвать в районной встрече: '+(s.ending==='bridge'?'в обоих районах.':D.places[D.endings[s.ending].place].name.split(' · ')[1]+'.');}
    }
    let message=conn.message;
    if(!account())message='Войдите в аккаунт через меню: история и отношения сохраняются на сервере.';
    else if(!Net.yardStory)message='Сервер ещё не поддерживает главу «Чужой двор». Нужна новая версия сервера.';
    else if(state&&state.active)message='Сначала завершите текущую районную встречу. Откройте её через «Районы и группировки».';
    else if(s&&s.stage==='finale'&&s.ending!=='bridge'&&(state.member&&state.member!==D.endings[s.ending].district||!state.member&&Date.now()<state.switchAt))message='Вступление пока недоступно: другая группировка или перерыв после выхода. Историю можно завершить гостем, сохранив статус.';
    $('yardNotice').textContent=message;$('yardRetry').hidden=!conn.retry;$('yardRetry').disabled=conn.pending;
    $('yardRoute').hidden=!place;$('yardRoute').disabled=conn.pending||scene!=='city';$('yardClose').disabled=conn.pending;
    const people=$('yardPeople');people.replaceChildren();
    for(const [id,p] of Object.entries(D.people)){
      const row=document.createElement('div');row.className='yard-person';row.style.setProperty('--person-color',p.color);
      const label=document.createElement('strong');label.textContent=p.name;
      const info=document.createElement('p');const n=s?s.bonds[id]:0;info.textContent=p.role+(s?' Отношение: '+(n>=4?'доверяет':n>=2?'теплеет':n<0?'обижен':'присматривается')+'.':'');
      row.append(label,info);if(s&&s.stage==='done')row.append(button('Найти: '+p.name,()=>{person=id;render();updateWorld();}));people.append(row);
    }
    const pageKey=(s?s.stage:'invite')+':'+(person||'');if(pageKey!==lastPage){lastPage=pageKey;const body=modal.querySelector('.ui-sheet-body');if(body)body.scrollTop=0;$('yardTitle').tabIndex=-1;$('yardTitle').focus({preventScroll:true});}
  }
  function route(){const place=target();if(!place||!world)return;const q=sidewalk(place)||D.point(place,world.meta);close();openRouteModal({...q,n:D.places[place].name,kind:'Чужой двор'});}
  function updateWorld(){
    const s=story();if(!s||!world||scene!=='city'){release();unmark('yard:target');return;}
    const place=target();if(place){const q=sidewalk(place)||D.point(place,world.meta);mark(null,'yard:target',q.x,q.y,'🏀',D.places[place].name,{arrow:true,color:'#e6ba77'});}else unmark('yard:target');
    let ids=[];
    if(s.stage==='done')ids=Object.keys(D.people).filter(id=>{const q=sidewalk(D.people[id].place);return q&&dist(player.x,player.y,q.x,q.y)<110;});
    else{const page=D.step(s),q=sidewalk(page.place);if(q&&dist(player.x,player.y,q.x,q.y)<110)ids=[page.remote?'ruslan':page.who];}
    const key=s.stage+':'+ids.join(',');if(key===castKey&&cast&&!cast.done)return;release();if(!ids.length)return;
    cast=startSit('yardCast',{ids,stage:s.stage});castKey=key;
  }
  defSit('yardCast',{start(s){for(const id of s.ids){const p=D.people[id],step=story(),place=step.stage==='done'?p.place:D.step(step).place,q=sidewalk(place);if(!q)continue;
      const w=new Walker('resident',q.node);w.temp=true;w.x=q.x;w.y=q.y;Object.assign(w.p,{name:p.name,job:'Чужой двор',female:p.female,clothes:p.color,item:p.item,hat:p.hat||null});w.yardPerson=id;
      walkers.push(w);takeActor(s,w);faceTo(w,player.x,player.y);
    }return s.actors.length>0;},action(s){if(player.busy||SIT.card||player.vehicle||player.bus||scene!=='city')return null;
      const w=s.actors.find(w=>dist(player.x,player.y,w.x,w.y)<5);return w?{label:'Чужой двор · '+w.p.name,at:w,run:()=>{const current=story();if(current)open(current.stage==='done'?w.yardPerson:null);}}:null;}});
  window.addEventListener('territorychange',()=>{
    syncAccount();const s=story();if(s&&seenStage&&seenStage!==s.stage)addEvent('🏀 Чужой двор: '+(s.stage==='done'?D.endings[s.ending].title:D.step(s).title),'say');
    seenStage=s?s.stage:null;render();updateWorld();
  });
  defWatch(dt=>{tick+=dt;if(tick<1)return;tick=0;syncAccount();updateWorld();
    if(!modal.hidden)render();
    if(!invited&&account()&&Net.yardStory&&snapshot()&&!story()&&scene==='city'&&!player.busy&&!SIT.card){invited=true;addEvent('🏀 Тимур зовёт собрать дворовый турнир. Откройте меню → «Чужой двор». Можно остаться независимым.','say');}
  });
  $('yardStoryBtn').addEventListener('click',()=>open());$('territoryStoryBtn').addEventListener('click',()=>open());
  $('yardClose').addEventListener('click',close);$('yardRoute').addEventListener('click',route);$('yardRetry').addEventListener('click',()=>cityTerritories.retry());
  window.cityYardStory={open,snapshot:()=>story()};
})();
