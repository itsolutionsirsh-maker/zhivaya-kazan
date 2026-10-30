// Shared progress belongs to the server, never to the local save or wallet.
(function(){
  'use strict';
  const D=CourtyardData,$=id=>document.getElementById(id),modal=$('courtyardModal');
  let state=null,identity='',pending=false,changing=false,retry=null,message='',available=null,elapsed=30,uiElapsed=0,offset=0,last='',busyBefore=false,worldKey,spot;
  const token=()=>typeof acct!=='undefined'&&acct?acct.token:'',now=()=>Date.now()+offset;
  const errors={auth:'Войдите в аккаунт через меню.',presence:'Подождите подключения к городу.',place:'Подойдите к двору пешком.',task:'Соседи уже сделали эту работу или она ещё не открыта.',changed:'Двор изменился. Выберите работу заново.',daily:'Спасибо за помощь! Сегодня вы сделали три работы. Новые — после полуночи по Москве.',starts:'На сегодня достаточно попыток. Приходите завтра.',occupied:'Этим уже занимается сосед. Выберите другую работу.',active:'Сначала завершите свою работу.',work:'Работа прервана: вы отошли, потеряли связь или двор изменился.',wait:'Нужно ещё немного времени.',request_reused:'Запрос уже использован. Откройте журнал заново.',rate_limited:'Слишком много запросов. Подождите немного.'};
  function sync(){if(identity===token())return;identity=token();state=null;retry=null;message='';last='';elapsed=30;}
  function point(){if(!world)return null;if(worldKey!==world){worldKey=world;spot=D.point(world.meta);}return spot;}
  function near(){const p=point();return !!(p&&scene==='city'&&!player.vehicle&&!player.bus&&!player.inside&&player.state==='ok'&&dist(player.x,player.y,p.x,p.y)<14);}
  const id=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
  async function request(op='status',extra={},repeat=false){
    sync();const who=identity;
    if(op==='status'&&pending)return;
    if(op!=='status'&&(changing||retry&&!repeat))return;
    if(op!=='status')changing=true;
    while(pending)await new Promise(r=>setTimeout(r,40));
    if(who!==token()){changing=false;sync();return;}
    const mutation=op!=='status',body=repeat&&retry?retry:{op,...extra,...(mutation?{request:id()}:{}),token:who,id:myCid};
    if(mutation&&!who){changing=false;message=errors.auth;render();return;}
    pending=true;if(mutation)retry=body;render();
    try{
      const publicRead=!who&&op==='status',r=await fetch(publicRead?'api.php?a=courtyard':'api.php',{method:publicRead?'GET':'POST',headers:{'Content-Type':'application/json'},cache:'no-store',signal:AbortSignal.timeout(12000),...(publicRead?{}:{body:JSON.stringify({a:'courtyard',...body})})});
      if(r.status===404){available=false;throw Error('unsupported');}
      const j=await r.json();if(r.status>=500)throw Error('write');
      if(who!==token())return;
      if(j.state){state=j.state;offset=state.now-Date.now();available=true;}
      if(mutation)retry=null;
      if(j.err)message=errors[j.err]||'Не удалось выполнить действие. Обновите журнал.';
      else if(mutation)message=op==='finish'?'Спасибо! Ваша помощь сохранена и видна всем.':op==='start'?'Работа началась. Оставайтесь во дворе.':'Работу можно продолжить позже.';
      else if(!retry)message='';
      return j;
    }catch(e){if(who===token())message=available===false?'Сервер ещё не поддерживает общий двор.':retry?'Связь прервалась. Повторите тот же запрос — работа не засчитается дважды.':'Нет связи. Обновим двор после подключения.';}
    finally{pending=false;if(mutation)changing=false;sync();render();}
  }
  function close(){if(modal.hidden)return;modal.hidden=true;player.busy=busyBefore;}
  function open(){sync();if(!$('menuModal').hidden)$('menuClose').click();if(modal.hidden){busyBefore=player.busy;player.busy=true;modal.hidden=false;}last='';render();request();}
  function route(){const p=point();if(!p)return;close();mark(null,'courtyard:yard',p.x,p.y,'🏡',D.yard.name,{arrow:true,color:'#83d1b1'});openRouteModal({...p,n:D.yard.name,kind:'Свой двор'});}
  function node(tag,text,cls){const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;}
  function button(text,fn,disabled){const b=node('button',text,'btn');b.type='button';b.disabled=!!disabled;b.onclick=fn;return b;}
  function render(){
    if(modal.hidden)return;const key=JSON.stringify([state&&{...state,now:0},message,changing,!!retry,token(),near(),Net.syncReady]);if(key===last)return;last=key;
    $('courtyardNotice').textContent=message||(!token()?'Войдите в аккаунт, чтобы помочь соседям.':!state?'Подключаемся…':'');
    $('courtyardRetry').hidden=!retry;$('courtyardRetry').disabled=pending;
    $('courtyardRoute').disabled=scene!=='city';const content=$('courtyardContent'),focused=document.activeElement?.dataset.yardTask;content.replaceChildren();if(!state)return;
    const work=state.me.work,blocked=changing||!!retry||!token()||!Net.syncReady||!near(),count=Object.keys(state.done).length;
    content.append(node('p',`Общее дело: ${count} из 9 работ. Ваша помощь сегодня: ${state.me.today} из ${state.me.limit}.`,'courtyard-summary'));
    content.append(node('p','До трёх работ в день на аккаунт, новые — в полночь по Москве. Каждая занимает 8 секунд. Денег не нужно: двор меняется для всех.','courtyard-hint'));
    let unlocked=true;
    for(let s=0;s<D.yard.steps.length;s++){
      const step=D.yard.steps[s],full=step.tasks.every((_,i)=>state.done[step.id+':'+i]),card=node('section',null,'courtyard-step'+(full?' complete':''));
      card.append(node('h3',step.icon+' '+step.name),node('p',full?step.line:unlocked?'Можно помочь вместе с соседями.':'Сначала закончим предыдущее улучшение.'));
      step.tasks.forEach((label,i)=>{
        const task=step.id+':'+i;if(state.done[task]){card.append(node('p','✓ '+label));return;}
        let b;if(work?.task===task){
          if(!work.here){card.append(node('p','Вы выполняете эту работу на другом устройстве.'));return;}
          b=button('Работаем…',()=>request('finish',{work:work.token}),true);b.dataset.ready=work.readyAt;b.dataset.blocked=String(blocked);card.append(b,button('Отложить работу',()=>request('cancel',{work:work.token}),changing||!!retry));
        }else{const other=state.busy.find(w=>w.task===task);b=button(other?label+' · помогает '+other.name:label,()=>request('start',{task,epoch:state.epochs[s]}),blocked||!unlocked||!!work||!!other||state.me.today>=state.me.limit||state.me.starts>=D.limits.starts);card.append(b);}
        b.dataset.yardTask=task;
      });content.append(card);if(!full)unlocked=false;
    }
    if(!near())content.append(node('p','Подойдите пешком к двору у Некрасова. Кнопка «Маршрут» покажет путь.','courtyard-hint'));
    content.append(node('h3','Двор сделали вместе'));
    if(!state.contributors.length)content.append(node('p','Первым помощником можете стать вы.'));
    for(const c of state.contributors)content.append(node('p',`${c.mine?'Вы':c.name} · работ: ${c.count}`));
    if(focused){const b=Array.from(content.querySelectorAll('[data-yard-task]')).find(n=>n.dataset.yardTask===focused);if(b&&!b.disabled)b.focus({preventScroll:true});}timers();
  }
  function timers(){if(modal.hidden)return;for(const b of modal.querySelectorAll('[data-ready]')){const seconds=Math.max(0,Math.ceil((Number(b.dataset.ready)-now())/1000));b.textContent=seconds?'Работаем · '+seconds+' с':'Закончить работу';b.disabled=seconds>0||b.dataset.blocked==='true'||!near();}}
  function action(){return available&&near()?{label:'Свой двор · помочь соседям',at:point(),tk:'spot',run:open}:null;}
  function draw(z,x0,y0,x1,y1,night,lights=false){
    const p=point();if(!state||!p||z<1.3||p.x<x0-10||p.x>x1+10||p.y<y0-10||p.y>y1+10||inBuilding(p.x,p.y))return;
    const full=id=>[0,1,2].every(i=>state.done[id+':'+i]);
    if(lights){if(full('light')&&lampSprite)ctx.drawImage(lampSprite,p.x+4-13,p.y-5-13,26,26);return;}
    ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle='#cec3a6';rrect(ctx,-6,-6,12,12,1);ctx.fill();ctx.strokeStyle='#82957b';ctx.lineWidth=.2;ctx.strokeRect(-5.4,-5.4,10.8,10.8);
    ctx.fillStyle='#514c43';ctx.fillRect(-4.8,-2.1,.35,2);ctx.fillRect(-1.5,-2.1,.35,2);
    ctx.fillStyle=full('bench')?'#b87842':'#7b7468';ctx.fillRect(-5,-2.3,full('bench')?4:1.5,.65);ctx.fillRect(-5,-1.35,full('bench')?4:1.8,.85);
    if(!full('bench')){ctx.save();ctx.translate(-2.5,-.8);ctx.rotate(.4);ctx.fillRect(0,0,2,.45);ctx.restore();}
    ctx.fillStyle='#424f4c';ctx.fillRect(3.85,-5,.3,4.5);ctx.fillRect(3.4,-.7,1.2,.4);
    if(full('light')){ctx.fillStyle='#ffdf8d';ctx.beginPath();ctx.arc(4,-5,.7,0,TAU);ctx.fill();ctx.fillStyle='#51665c';ctx.fillRect(3.1,-5.8,1.8,.25);}
    ctx.fillStyle='#6f6654';ctx.fillRect(-2.9,3,.25,2);ctx.fillRect(2.6,3,.25,2);ctx.fillStyle=full('mural')?'#203e50':'#c2bba8';ctx.fillRect(-3,1.5,6,2.7);
    if(full('mural')){ctx.fillStyle='#f2bc6e';ctx.beginPath();ctx.arc(1.7,2.3,.55,0,TAU);ctx.fill();ctx.fillStyle='#70c1a2';ctx.beginPath();ctx.moveTo(-3,4.2);ctx.lineTo(-1,2.1);ctx.lineTo(.7,4.2);ctx.fill();ctx.fillStyle='#d9e1c9';ctx.fillRect(-1.7,2.8,.5,1.4);ctx.fillRect(-.8,3.2,.7,1);}
    drawPerson(-3,.8,0,-1,{clothes:'#ba7252',skin:'#e2bd98',hair:'#504239'},0,{scale:1.2});
    if(full('bench'))drawPerson(-.6,.4,-1,0,{clothes:'#5c8190',skin:'#e9c6a5',hair:'#55463c'},0,{scale:1.2});
    if(z>4){ctx.fillStyle='#234b3f';ctx.font='600 1.1px system-ui';ctx.textAlign='center';ctx.fillText('СВОЙ ДВОР',0,-7);}ctx.restore();
  }
  $('courtyardBtn').onclick=open;$('courtyardClose').onclick=close;$('courtyardRoute').onclick=route;$('courtyardRetry').onclick=()=>request(retry.op,{},true);
  cityObjectives.register({priority:40,read(){sync();if(!identity||!state||!available||Object.keys(state.done).length===9)return null;const story=cityTerritories.snapshot()?.story;if(story?.stage!=='done'||!story.reunion)return null;return {id:'shared-yard',title:state.me.today>=state.me.limit?'Спасибо за помощь двору':'Сделаем свой двор уютнее',text:state.me.today>=state.me.limit?'Ваши работы видны всем. Соседи могут продолжить общее дело.':'Лавка, тёплый свет и панно — общее дело соседей у Некрасова.',context:'Общий двор',label:near()?'Помочь соседям':'Выбрать маршрут',run:near()?open:route};}});
  defWatch(dt=>{sync();elapsed+=dt;uiElapsed+=dt;const p=point(),interested=!modal.hidden||state?.me.work||p&&scene==='city'&&dist(cam.x,cam.y,p.x,p.y)<250;
    if(!document.hidden&&elapsed>=(interested?2:30)){elapsed=0;request();}if(uiElapsed>=.25){uiElapsed=0;render();timers();}});
  window.cityCourtyard={open,close,refresh:()=>request(),snapshot:()=>state?JSON.parse(JSON.stringify(state)):null,point,action,draw};
})();
