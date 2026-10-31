// A personal first encounter. Saved with PROG (and the existing account snapshot), no wallet grants.
(function(root){
  'use strict';
  const ongoing=s=>!!s&&['invite','photos','board','return'].includes(s.stage);
  function advance(s,choice,day){
    if(!s)return s;
    if(s.stage==='invite'&&['photos','board','skip'].includes(choice))return {...s,stage:choice==='skip'?'skipped':choice,choice};
    if(['photos','board'].includes(s.stage)&&choice==='help')return {...s,stage:'return'};
    if(s.stage==='return'&&choice==='thanks')return {...s,stage:'done',day};
    if(s.stage==='done'&&day>s.day&&!s.reunion&&['people','places'].includes(choice))return {...s,reunion:choice};
    return s;
  }
  if(typeof module==='object'&&module.exports){module.exports={advance,ongoing};return;}
  // Existing saves must not acquire a new mandatory introduction after an update.
  let fresh=false;try{fresh=!localStorage.getItem('zk.state')&&!localStorage.getItem('zk.profile');}catch(_){}
  let elapsed=0,tick=0,cast=null,lastStage='',suspended=false;
  const state=()=>PROG.firstNeighbor;
  const ready=()=>!acct||Net.syncReady;
  const free=()=>world&&scene==='city'&&!player.inside&&!player.vehicle&&!player.bus&&!player.busy&&player.state==='ok'&&!cine&&!SIT.card&&!chatNpc&&!document.hidden;
  const active=()=>ready()&&ongoing(state())&&!suspended&&scene==='city'&&dist(player.x,player.y,state().home.x,state().home.y)<180;
  const due=()=>state()?.stage==='done'&&!state().reunion&&mskDate()>state().day;
  // Walk navigation finishes within 14 m. Do not send an arrived player back into the route picker.
  const near=p=>p&&scene==='city'&&!player.vehicle&&!player.bus&&!player.inside&&player.state==='ok'&&dist(player.x,player.y,p.x,p.y)<14;
  function save(s){PROG.firstNeighbor=s;progSave();if(acct&&Net.syncReady)acctSave();cityObjectives.refresh();}
  function target(){const s=state();return s&&(s.stage==='photos'?s.photos:s.stage==='board'?s.board:s.home);}
  function point(x,y,r){const n=nearestNode(x,y,world.pedAdj,r);if(n<0)return null;const q=sidewalkPos(n);return q&&!inBuilding(q[0],q[1])?{x:q[0],y:q[1],node:n}:null;}
  function locate(){
    const home=point(player.x,player.y,45);if(!home||dist(player.x,player.y,home.x,home.y)>50)return null;
    let photos=null,board=null;
    for(let i=0;i<16;i++){
      const a=i*Math.PI/8,q=point(home.x+Math.cos(a)*45,home.y+Math.sin(a)*45,30);
      if(!q)continue;const d=dist(home.x,home.y,q.x,q.y);
      if(d<18||d>80)continue;
      const path=astar(world.pedAdj,home.node,q.node,pedCost);
      if(!path||path.length<2)continue;
      let length=0;for(let k=1;k<path.length;k++){const p=world.nodes[path[k-1]],t=world.nodes[path[k]];length+=dist(p[0],p[1],t[0],t[1]);}
      if(length>130)continue;
      if(!photos)photos=q;
    }
    // Long street edges may have no second node within 80 m. Use a point along
    // the connected sidewalk instead of waiting forever for a dense intersection.
    if(!photos)for(const e of adjList(world.pedAdj,home.node)){
      const a=world.nodes[home.node],b=world.nodes[e[0]],length=dist(a[0],a[1],b[0],b[1]);
      if(length<30)continue;const reach=Math.min(35,length*.6),dx=(b[0]-a[0])/length,dy=(b[1]-a[1])/length;
      let clear=true;for(let d=0;d<=reach;d+=2)if(inBuilding(home.x+dx*d,home.y+dy*d)){clear=false;break;}
      if(clear){photos={x:home.x+dx*reach,y:home.y+dy*reach,node:home.node};break;}
    }
    // The stand stays beside Amina; the alternative route is a shorter practical task.
    for(let i=0;i<16&&!board;i++){const a=i*Math.PI/8,q=point(home.x+Math.cos(a)*12,home.y+Math.sin(a)*12,15);if(q&&dist(home.x,home.y,q.x,q.y)>=8&&dist(home.x,home.y,q.x,q.y)<=20&&astar(world.pedAdj,home.node,q.node,pedCost))board=q;}
    return photos?{home,photos,board:board||home}:null;
  }
  function release(){if(cast)endSit(cast);cast=null;unmark('first-neighbor');}
  function change(choice){
    if(!ready())return;const s=state();if(!s||(!near(target())&&choice!=='skip'))return;
    const next=advance(s,choice,mskDate());if(next===s)return;save(next);lastStage='';
    if(choice==='help')addEvent(s.choice==='photos'?'📷 Снимки собраны. Вернитесь к Амине — она ждёт у места знакомства.':'🪢 Стенд закреплён. Вернитесь к Амине — теперь фотографии не унесёт ветер.','say');
    if(choice==='thanks'){
      const text=s.choice==='photos'?'Спасибо за спасённые снимки! Завтра покажу, какие фотографии выбрали соседи.':'Спасибо за крепкий стенд! Завтра покажу, что на нём появилось.';
      cityPhone.push({from:'Амина · соседка',text:text+' Встречаемся на том же месте. Маршрут — в меню «Первое знакомство».',kind:'note'});
      addEvent('📷 Амина запомнила вашу помощь. Стенд остался у места знакомства.','say');
    }
    if(['people','places'].includes(choice))addEvent('📷 На стенде появился ваш выбор: '+(choice==='people'?'«Лица нашего двора».':'«Любимые места рядом».'),'say');
    updateWorld();
  }
  function route(){const p=target();if(!p)return;openRouteModal({...p,n:state().stage==='photos'?'Улетевшие снимки':state().stage==='board'?'Стенд для фотографий':'Амина · первое знакомство',kind:'Соседи'});}
  function open(){
    if(!ready()||player.busy||SIT.card||scene!=='city')return;
    const s=state();if(!s||s.stage==='skipped'||s.stage==='old')return;
    suspended=false;if(!near(target())){route();return;}updateWorld();
    const choices=[],c=(t,choice,primary=false)=>({t,primary,run:()=>change(choice)});
    let title='Амина · фотографии двора',text='';
    if(s.stage==='invite'){
      text='«Привет, я Амина, из соседнего дома. Собираю фотографии для дворового вечера, а ветер всё растрепал! Поможешь? Снимки улетели по тротуару, стенд тоже нужно закрепить. Возьмёшь что-то одно — я сделаю остальное». · Около двух минут.';
      choices.push(c('Собрать снимки','photos',true),c('Закрепить стенд','board'),c('Сейчас не могу','skip'));
    }else if(s.stage==='photos'){
      title='Снимки у тротуара';text='Под ногами — фотографии: снежный двор, сосед с собакой, дети у ворот. Бумага ещё цела. Можно собрать снимки и вернуть Амине.';
      choices.push(c('Собрать и отнести Амине','help',true));
    }else if(s.stage==='board'){
      title='Стенд качается на ветру';text='Шнур развязался, прищепки лежат рядом. Закрепите его, пока Амина собирает улетевшие фотографии.';
      choices.push(c('Натянуть шнур и закрепить','help',true));
    }else if(s.stage==='return'){
      title='Теперь здесь есть знакомый человек';text=s.choice==='photos'?'«Вот они! На этом снимке мой дедушка. Хорошо, что фотография не пропала. Стенд я уже закрепила. Завтра приходи посмотреть, что выберут соседи».':'«Держится! Я как раз собрала фотографии. Теперь ветер им не страшен. Завтра приходи — вместе решим, что ещё повесить».';
      choices.push(c('До встречи, Амина','thanks',true));
    }else if(due()){
      title='Амина вас помнит';text=(s.choice==='photos'?'«Те снимки, что удалось спасти, весь вечер разглядывали! ':'«Твой шнур выдержал ветер, фотографии остались на месте! ')+'Соседи принесли ещё. Что повесим дальше — портреты людей или любимые места района?»';
      choices.push(c('Лица нашего двора','people',true),c('Любимые места рядом','places'));
    }else{
      title='Наш стенд';text=s.reunion?'Амина: «'+(s.reunion==='people'?'На портретах теперь узнают друг друга. Соседи знакомятся!':'Тут и двор, и любимый сквер. Соседи спорят, где гулять вечером!')+' Спасибо, что помогли выбрать».':'Амина: «Стенд готов. Завтра, в следующий день по Москве, загляни сюда — покажу фотографии соседей». Маршрут к этому месту останется в меню.';
    }
    choices.push({t:ongoing(s)?'Продолжить позже':'Вернуться в город',run:()=>{suspended=true;cityObjectives.refresh();}});
    sitCard({s:cast,icon:'📷',title,text,choices,tone:'good first-neighbor-card'});
  }
  function updateWorld(){
    const s=state();if(!ready()||!s?.home||s.stage==='skipped'||scene!=='city'){release();return;}
    const close=dist(player.x,player.y,s.home.x,s.home.y)<180;
    if(!close){release();return;}
    // Resolve the sidewalk node again after a reload: chunk indices are not a persistent identity.
    if(!cast||cast.done){const p=point(s.home.x,s.home.y,20);if(!p)return;cast=startSit('firstNeighbor',{home:{...s.home,node:p.node}});}
    if(ongoing(s)&&!suspended){const p=target();mark(cast,'first-neighbor',p.x,p.y,'📷',s.stage==='photos'?'Собрать снимки':s.stage==='board'?'Закрепить стенд':'Амина',{arrow:true,color:'#e8bb76'});}else unmark('first-neighbor');
    if(cast&&lastStage!==s.stage){lastStage=s.stage;cast.actors[0].p.item=s.stage==='invite'?'bag':'phone';}
  }
  defSit('firstNeighbor',{quiet:true,start(s){
    const w=new Walker('resident',s.home.node);w.temp=true;w.x=s.home.x;w.y=s.home.y;
    Object.assign(w.p,{name:'Амина',job:'соседка · фотографии двора',female:true,clothes:'#d79850',item:'bag'});
    walkers.push(w);takeActor(s,w);faceTo(w,player.x,player.y);return true;
  },action(){const s=state();return ready()&&s&&near(target())&&!player.busy&&!SIT.card?{label:s.stage==='photos'?'Собрать снимки':s.stage==='board'?'Закрепить стенд':'Поговорить с Аминой',at:target(),tk:['photos','board'].includes(s.stage)?'spot':'person',run:open}:null;},
  draw(s,toS,z){
    const p=state();if(!p||z<1.5)return;
    if(p.stage==='photos'){const [a,b]=toS(p.photos.x,p.photos.y);ctx.save();ctx.translate(a,b);ctx.rotate(.2);ctx.fillStyle='#fff0d5';ctx.fillRect(-z,-z,2*z,1.5*z);ctx.fillRect(z,z,2*z,1.5*z);ctx.restore();}
    const [x,y]=toS(p.board.x,p.board.y);if(x<-80||y<-80||x>W+80||y>H+80)return;
    ctx.save();ctx.translate(x+2*z,y+2*z);ctx.scale(z,z);
    const done=['return','done'].includes(p.stage);
    ctx.strokeStyle='#765a40';ctx.lineWidth=.3;ctx.beginPath();ctx.moveTo(0,1);ctx.lineTo(0,-3);ctx.lineTo(5,-3);ctx.lineTo(5,1);ctx.stroke();
    ctx.strokeStyle=done?'#e5d4ab':'#877e6b';ctx.beginPath();ctx.moveTo(0,-2.7);ctx.lineTo(2.5,done?-2.7:-1);ctx.lineTo(5,-2.7);ctx.stroke();
    if(done)for(let i=0;i<3;i++){ctx.fillStyle='#f7ebd1';ctx.fillRect(.35+i*1.6,-2.4,1.2,1.5);ctx.fillStyle=p.reunion==='places'?'#6aa77e':p.reunion==='people'?'#d38c68':['#b6cddd','#c38862','#8caa78'][i];ctx.fillRect(.5+i*1.6,-2.2,.9,1);}
    ctx.restore();
  }});
  cityObjectives.register({priority:120,read(){
    const s=state();if(!ready()||!s?.home||(!ongoing(s)&&!due())||suspended)return null;
    const label=near(target())?(s.stage==='photos'?'Собрать снимки':s.stage==='board'?'Закрепить стенд':'Поговорить'):'Показать путь';
    return {id:'first-neighbor-'+s.stage,context:due()?'Знакомая соседка':'Первое знакомство · около двух минут',
      title:due()?'Амина ждёт у стенда':s.stage==='invite'?'Соседке нужна пара рук':s.stage==='photos'?'Соберите улетевшие снимки':s.stage==='board'?'Закрепите стенд':'Вернитесь к Амине',
      text:due()?'Она помнит вашу помощь. Вместе выберите новые фотографии.':s.stage==='invite'?'Амина рядом готовит фотографии двора. Можно помочь или пройти мимо.':s.stage==='return'?'Ваша помощь уже видна. Осталось попрощаться и договориться о встрече.':'Место отмечено значком 📷. Подойдите пешком и нажмите действие.',label,run:open};
  }});
  const menu=document.getElementById('neighbourStoryBtn'),button=document.createElement('button');
  button.id='firstNeighborBtn';button.className='btn';button.textContent='📷 Первое знакомство';button.hidden=true;menu.after(button);
  button.onclick=()=>{document.getElementById('menuClose').click();open();};
  defWatch(dt=>{
    tick+=dt;if(tick<.5)return;const delta=tick;tick=0;if(!ready())return;
    if(!state())save({stage:fresh?'pending':'old'});
    if(state().stage==='pending'){
      if(!free())return;elapsed+=delta;if(elapsed<8)return;
      const points=locate();if(!points)return;
      save({stage:'invite',...points});addEvent('📷 Амина, соседка: «Поможешь с фотографиями двора?»','say');
    }
    button.hidden=!state()?.home||state().stage==='skipped';updateWorld();
  });
  root.cityFirstNeighbor={open,active,snapshot:()=>state()?JSON.parse(JSON.stringify(state())):null};
})(typeof globalThis==='object'?globalThis:this);
