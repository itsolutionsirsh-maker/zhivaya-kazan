// Nearby decoration, remembered greetings and a two-player recreational court.
(function(){
 'use strict';
 let repairAt=0,story=null,game=null,busy=false,priorBusy=false,identity='',held=false,startAt=0,raf=0,lastSeen=0,retry=null;
 const $=id=>document.getElementById(id),modal=document.createElement('div');modal.id='courtModal';modal.className='modal';modal.hidden=true;
 modal.innerHTML=`<div class="box" style="max-width:480px"><h2>Три броска во дворе</h2><p id="courtNotice">Подойдите к площадке Руслана. Можно сыграть одному или с другом.</p><div id="courtScene" aria-hidden="true"><span class="court-backboard">▣</span><span class="court-hoop"></span><span id="courtBall">🏀</span></div><p id="courtScore"></p><p id="courtReaction"></p><div class="court-meter"><i id="courtNeedle"></i><span></span></div><button class="btn primary" id="courtThrow">Удерживайте и отпустите в зелёной зоне</button><div class="court-controls"><button class="btn" id="courtCreate">Начать · 3 броска</button><label id="courtCodeLabel">Код друга <input id="courtCode" maxlength="8" autocomplete="off" placeholder="8 символов"></label><button class="btn" id="courtJoin">Присоединиться</button><button class="btn" id="courtCopy">Скопировать приглашение</button><button class="btn" id="courtSolo">Друг ушёл · продолжить одному</button><button class="btn" id="courtRetry" hidden>Повторить запрос</button><button class="btn" id="courtLeave">Закончить игру</button><button class="btn" id="courtRoute">Маршрут к площадке</button><button class="btn" id="courtClose">Вернуться в город</button></div></div>`;
 document.body.append(modal);
 const token=()=>typeof acct!=='undefined'&&acct?acct.token:'';
 const freshId=()=>Array.from(crypto.getRandomValues(new Uint8Array(12)),b=>b.toString(16).padStart(2,'0')).join('');
 let plotWorld=null,plotRoads=-1,plotValue=null;
 function plot(){
  if(!world)return null;if(plotWorld===world&&plotRoads===world.roads.length)return plotValue;
  plotWorld=world;plotRoads=world.roads.length;plotValue=null;const origin=YardStory.point('court',world.meta);
  for(let radius=10;radius<=55;radius+=5)for(let a=0;a<16;a++){
   const x=origin.x+Math.cos(a*Math.PI/8)*radius,y=origin.y+Math.sin(a*Math.PI/8)*radius;
   let free=true;for(const dx of [-6,0,8])for(const dy of [-8,-2,5]){const px=x+dx,py=y+dy,n=nearestRoadSeg(px,py,30);if(inBuilding(px,py)||(n&&n.seg.r.c<=8&&n.d<n.seg.r.hw+2))free=false;}
   if(!free)continue;const node=nearestNode(x,y,world.pedAdj,35);if(node<0)continue;
   const p=world.nodes[node];for(let t=0;t<=1;t+=.1)if(inBuilding(p[0]+(x-p[0])*t,p[1]+(y-p[1])*t))free=false;
   if(free){plotValue={x,y,node};return plotValue;}
  }return null;
 }
 function point(){return plot()||(world&&YardStory.point('court',world.meta));}
 const errors={auth:'Войдите в аккаунт через меню.',place:'Подойдите пешком к площадке Руслана.',missing:'Игра закончилась или код не найден. Создайте новую.',started:'Игра уже началась или оба места заняты.',turn:'Сейчас очередь друга.',changed:'Состояние обновилось. Проверьте очередь и повторите действие.',wait:'Подождите 30 секунд без действий друга.',rate_limited:'Слишком частые запросы. Подождите немного.',charging:'Бросок уже готовится.',charge:'Удержите кнопку заново.'};
 function render(){
  $('courtScore').textContent=game?'Код '+game.code+' · '+game.players.map(p=>p.name+(p.mine?' (вы)':'')+': '+p.score+'/3, попыток '+p.shots).join(' · '):'По три попытки. Промах не мешает истории.';
  const last=game&&game.last;
  $('courtReaction').textContent=game&&game.done?'Игра закончена. Руслан: «Хорошо собрались. Заходите ещё!»':last?last.name+': '+(last.hit?'попадание! Ильдар: «Вот это бросок!»':'мимо. Руслан: «Ничего, попробуй мягче».'):game&&!game.myTurn?'Очередь друга. При отключении можно продолжить одному.':'Руслан: «Не торопись. Поймай момент». ';
  $('courtThrow').disabled=busy||!!retry||!game||!game.myTurn||game.done;
  for(const id of ['courtCreate','courtJoin','courtCodeLabel'])$(id).hidden=!!game;
  for(const id of ['courtCopy','courtSolo','courtLeave'])$(id).hidden=!game;
  $('courtSolo').hidden=!game||game.players.length<2||game.done;$('courtCopy').hidden=!game||game.players.some(p=>p.shots>0);
  for(const id of ['courtCreate','courtJoin','courtSolo','courtLeave'])$(id).disabled=busy||!!retry;
  $('courtRetry').hidden=!retry;$('courtRetry').disabled=busy;
  if(last&&last.at!==lastSeen){lastSeen=last.at;$('courtBall').classList.remove('court-flight');void $('courtBall').offsetWidth;$('courtBall').classList.add('court-flight');}
 }
 async function request(op,repeat=false){
  if(busy)return null;const who=token();if(!who){$('courtNotice').textContent=errors.auth;return null;}
  if(!Net.courtGame){$('courtNotice').textContent='Сервер ещё не поддерживает игру во дворе.';return null;}
  const payload=repeat?retry:{op,code:$('courtCode').value.trim(),version:game&&game.version,request:freshId()};if(!payload)return null;
  busy=true;render();
  try{const response=await fetch('api.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({a:'court',token:who,id:myCid,...payload}),signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('http');const data=await response.json();if(token()!==who)return null;
   retry=null;if(Object.hasOwn(data,'game'))game=data.game;
   $('courtNotice').textContent=data.ok?'Площадка Руслана. Пригласите друга до первого броска.':errors[data.err]||'Не удалось выполнить действие.';return data;
  }catch(e){if(token()===who){if(payload.op!=='status')retry=payload;$('courtNotice').textContent='Связь прервалась. Повторите запрос: попытка не спишется дважды.';}return null;}
  finally{busy=false;render();}
 }
 function open(){if(identity!==token()){identity=token();game=null;retry=null;}priorBusy=player.busy;player.busy=true;modal.hidden=false;request('status');}
 function close(){held=false;cancelAnimationFrame(raf);if(!busy&&game&&game.charged&&!retry)request('cancel');modal.hidden=true;player.busy=priorBusy;}
 function animate(){if(!held||modal.hidden)return;const power=((performance.now()-startAt)%1600)/1600;$('courtNeedle').style.left=(power*100)+'%';raf=requestAnimationFrame(animate);}
 async function press(e){if(e.type==='keydown'&&![' ','Enter'].includes(e.key))return;if(e.repeat||held||$('courtThrow').disabled)return;e.preventDefault();held=true;const sent=performance.now();const result=await request('begin');if(!result||!result.ok){held=false;return;}startAt=performance.now()-(result.game.chargeAge||0)-(performance.now()-sent)/2;if(!held){request('cancel');return;}animate();}
 function release(e){if(e&&e.type==='keyup'&&![' ','Enter'].includes(e.key))return;if(!held)return;held=false;cancelAnimationFrame(raf);if(!busy)request('throw');}
 $('courtThrow').addEventListener('pointerdown',press);window.addEventListener('pointerup',release);$('courtThrow').addEventListener('keydown',press);window.addEventListener('keyup',release);
 function cancel(){held=false;cancelAnimationFrame(raf);if(!busy&&game&&game.charged&&!retry)request('cancel');}
 window.addEventListener('pointercancel',cancel);window.addEventListener('blur',cancel);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});
 $('courtCreate').onclick=()=>request('create');$('courtJoin').onclick=()=>request('join');$('courtSolo').onclick=()=>request('continue');$('courtLeave').onclick=()=>request('leave');$('courtRetry').onclick=async()=>{await request(null,true);if(!held&&game&&game.charged&&!retry)request('cancel');};$('courtClose').onclick=close;
 $('courtCopy').onclick=async()=>{if(!game)return;try{await navigator.clipboard.writeText('Живая Казань: приходи на площадку Руслана. Меню → Три броска. Код игры: '+game.code);$('courtNotice').textContent='Приглашение скопировано. Отправьте другу.';}catch(e){$('courtNotice').textContent='Передайте другу код '+game.code;}};
 $('courtRoute').onclick=()=>{const q=point();if(!q)return;close();openRouteModal({...q,n:'Площадка Руслана',kind:'Три броска'});};
 const menu=$('yardStoryBtn'),entry=document.createElement('button');entry.className='btn';entry.textContent='🏀 Три броска · с другом';entry.onclick=()=>{$('menuClose').click();open();};menu.after(entry);
 window.cityCourt={open,spot:plot};
 function sync(){const next=cityYardStory.snapshot();if(next?.choices?.repair==='net'&&story?.choices?.repair!=='net')repairAt=performance.now();story=next;}
 window.addEventListener('territorychange',sync);
 setInterval(()=>{if(document.hidden)return;if(identity!==token()){identity=token();game=null;retry=null;held=false;if(!modal.hidden)close();sync();}if(!modal.hidden&&!busy&&!held&&!retry)request('status');},1500);
 // Only nearby court geometry is drawn; no textures, scene graph or additional canvas.
 defSit('livingCourt',{always:true,quiet:true,start(){return true;},action(){if(story&&story.stage!=='done')return null;if(walkers.some(w=>w.yardPerson&&dist(player.x,player.y,w.x,w.y)<5))return null;const q=point();return q&&scene==='city'&&!player.busy&&!player.vehicle&&!player.bus&&dist(player.x,player.y,q.x,q.y)<12?{label:'Три броска в кольцо',at:q,run:open}:null;},draw(s,toS,z){
  const q=plot();if(!q||scene!=='city'||dist(player.x,player.y,q.x,q.y)>150||z<1)return;
  const [x,y]=toS(q.x,q.y),scale=Math.min(z,7),fixed=story?.choices?.repair==='net';
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.strokeStyle='#e5d5a5';ctx.lineWidth=.22;ctx.fillStyle='#34564d';ctx.strokeRect(-5,-3,10,7);ctx.beginPath();ctx.arc(0,2,2,Math.PI,0);ctx.stroke();
  ctx.strokeStyle='#919b9a';ctx.lineWidth=.4;ctx.beginPath();ctx.moveTo(0,-3);ctx.lineTo(0,-7);ctx.stroke();ctx.fillStyle='#f1e7cf';ctx.fillRect(-1.8,-8,3.6,2);ctx.strokeStyle='#cf774b';ctx.lineWidth=.25;ctx.beginPath();ctx.ellipse(0,-5.8,1,.4,0,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#f3e8d0';ctx.lineWidth=.13;
  const settle=fixed?Math.min(1,(performance.now()-repairAt)/900):0;
  for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(i*.4,-5.8);ctx.lineTo(i*.27+.5*(1-settle),(-5+Math.abs(i)*.15)*(1-settle)-4.4*settle);ctx.stroke();}if(fixed){ctx.beginPath();ctx.moveTo(-.7,-4.8);ctx.lineTo(.7,-4.8);ctx.stroke();}
  ctx.fillStyle='#8f7050';ctx.fillRect(5,-1,3,.65);ctx.restore();
 }});
 // Greeting cooldown is local presentation only; server chapter remains the source of memory.
 let greetTimer=0,nextGreeting=0;const greeted=new Map();
 function greetingAt(key){if(greeted.has(key))return greeted.get(key);try{return +sessionStorage.getItem('zk.greet.'+hashStr(key))||0;}catch(e){return 0;}}
 defWatch(dt=>{greetTimer+=dt;if(greetTimer<1)return;greetTimer=0;if(!story||player.busy||scene!=='city'||SIT.card||Date.now()<nextGreeting)return;
  for(const w of walkers){if(!w.yardPerson||dist(player.x,player.y,w.x,w.y)>12)continue;const id=w.yardPerson,key=identity+':'+id+':'+(story.choices.repair||'before');if(Date.now()-greetingAt(key)<1800000)continue;
   if(story.stage!=='done'&&id!=='ruslan')continue;
   const line=story.stage==='done'?YardStory.greeting(story,id):story.choices.repair==='net'?'Сетка держится! Ильдар уже зовёт ребят.':story.choices.repair?'Ильдар больше не стоит в стороне. Спасибо!':'Сетка порвана. Поможешь нам подготовить площадку?';
   w.courtWaveUntil=performance.now()+1800;say(w,line,6);faceTo(w,player.x,player.y);greeted.set(key,Date.now());try{sessionStorage.setItem('zk.greet.'+hashStr(key),String(Date.now()));}catch(e){}nextGreeting=Date.now()+60000;break;
  }
 });
})();
