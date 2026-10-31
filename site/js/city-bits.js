// Дворовые мелочи: бабушка, ночная шаурма, фотограф, кортеж, голуби.
(function(){
  let gran=null,kiosk=null,cameraman=null,wed=null,birds=[],shoulder=0,fed=0,stolen=0,carry=null;
  const still={x:0,y:0,t:0},bags=new Set();
  const NAMES=['Равиля','Насима','Зухра','Сания','Альфия'];
  function hour(){return typeof cityHour==='function'?cityHour():12;}
  function day(){return (typeof clock!=='undefined'&&clock.day)||1;}
  function mood(n){player.mood=typeof clamp==='function'?clamp(player.mood+n,0,100):Math.min(100,player.mood+n);}
  function card(icon,title,text,choices){
    if(typeof sitCard!=='function'){setHint(text);return;}
    if(typeof SIT!=='undefined'&&SIT.card){setHint('Сначала договорите то, что уже на экране');return;}
    sitCard({icon,title,text,choices});
  }
  function reply(icon,title,text,extra){addEvent(text);if(extra)extra();card(icon,title,text,[{t:'Ладно',primary:true,run:()=>{}}]);}
  function outside(x,y){return typeof inBuilding!=='function'||!inBuilding(x,y);}
  function spotOut(x,y){for(let i=0;i<8;i++){const a=Math.random()*TAU,r=4+Math.random()*6,nx=x+Math.cos(a)*r,ny=y+Math.sin(a)*r;if(outside(nx,ny))return [nx,ny];}return [x+3,y];}
  function nearestBuilding(){
    if(!world||!world.bgrid||player.inside)return null;
    let best=null,bd=24;
    world.bgrid.query(player.x-28,player.y-28,player.x+28,player.y+28,b=>{
      if(!b||b.pass||!b.bb)return;
      const w=b.bb[2]-b.bb[0],h=b.bb[3]-b.bb[1];if(w>75||h>75)return;
      const dx=Math.max(b.bb[0]-player.x,0,player.x-b.bb[2]),dy=Math.max(b.bb[1]-player.y,0,player.y-b.bb[3]);
      const d=Math.hypot(dx,dy);if(d<bd&&d>1.4){bd=d;best=b;}
    });
    return best;
  }
  function benchOf(b){
    const dx=player.x-b.cx,dy=player.y-b.cy,dd=Math.hypot(dx,dy)||1,ux=dx/dd,uy=dy/dd;
    let x=b.cx,y=b.cy;
    for(let i=0;i<14;i++){const nx=x+ux*2.2,ny=y+uy*2.2;if(outside(nx,ny)&&Math.hypot(nx-b.cx,ny-b.cy)>4)return [nx,ny];x=nx;y=ny;}
    return [player.x+2,player.y];
  }
  function doorOf(b,g){
    const dx=b.cx-g.x,dy=b.cy-g.y,dd=Math.hypot(dx,dy)||1;let x=g.x,y=g.y;
    for(let i=0;i<12;i++){const nx=x+dx/dd*1.6,ny=y+dy/dd*1.6;if(!outside(nx,ny))return [x,y];x=nx;y=ny;}
    return [x,y];
  }
  function hatOn(){try{const l=typeof myLook==='function'?myLook():null;return !!(l&&l.hat);}catch(e){return false;}}
  function granLine(){
    const cold=(weather&&(weather.kind==='snow'||(weather.t!=null&&weather.t<6)));
    if(!hatOn()&&cold)return 'Опять без шапки. Уши сами не отогреются, я проверяла.';
    if(weather&&weather.kind==='rain'&&!player.umbrella)return 'Дождь, а зонта нет. В мои годы я уже с сумкой в клеточку ходила.';
    return 'Куртка ничего. Спину ровнее: это подъезд, не парад.';
  }
  function talkGran(){
    const key=day()+':'+(gran.b&&gran.b.i!=null?gran.b.i:gran.name);
    const asked=bags.has(key)||!!carry;
    const choices=[{t:'Потом',run:()=>reply('👵',gran.name,granLine())}];
    if(!asked)choices.unshift({t:'Донести пакет',primary:true,run:()=>{
      bags.add(key);const d=doorOf(gran.b,gran);carry={x:d[0],y:d[1],name:gran.name};
      reply('👜',gran.name,'Там кефир и хлеб. До двери, не до соседа. Сосед и так всё видит.');
    }});
    card('👵',gran.name+' · лавочка',granLine()+(asked?'':' Донесите пакет до двери: спина уже не та.'),choices);
  }
  function giveBag(){
    const name=carry&&carry.name||'Бабушка';carry=null;
    player.money+=80;mood(6);
    reply('👵',name,'Вот на пирожок, 80 ₽. И шапку в следующий раз наденьте.',()=>{});
  }
  function shawarma(kind){
    const joke=kind==='hot'?'Если заплачу, это от лука. Не расспрашивайте.':'Котлета смотрит на Казань. Так и задумано.';
    spend(180,()=>{player.food=typeof clamp==='function'?clamp(player.food+22,0,100):Math.min(100,player.food+22);player.energy=typeof clamp==='function'?clamp(player.energy+6,0,100):Math.min(100,player.energy+6);mood(4);reply('🌯','Шаурма',joke);});
  }
  function bauman(){
    const l=(window.cityLandmarks||[]).find(q=>q&&q.name==='Улица Баумана'&&Array.isArray(q.ll));
    if(!l||typeof llToXY!=='function')return null;const p=llToXY(l.ll);return {x:p[0],y:p[1]};
  }
  function postcard(){
    const c=document.createElement('canvas');c.width=280;c.height=160;const g=c.getContext('2d');
    g.fillStyle='#E7D7B8';g.fillRect(0,0,280,160);
    g.fillStyle='#C9B48A';g.fillRect(0,108,280,52);
    g.fillStyle='#8C3A32';g.fillRect(18,78,16,30);g.fillRect(40,70,14,38);g.fillRect(210,64,22,44);g.fillRect(236,74,12,34);
    g.fillStyle='#6E8B74';g.beginPath();g.moveTo(120,96);g.lineTo(132,74);g.lineTo(144,96);g.fill();
    const col=(typeof myClothes==='function'?myClothes():player.clothes)||'#2F9E6B';
    g.fillStyle=col;g.fillRect(132,86,10,22);g.beginPath();g.arc(137,82,5,0,TAU);g.fill();
    g.fillStyle='#2A241C';g.font='600 13px sans-serif';g.fillText('Баумана',16,28);
    const when=(typeof fmtTime==='function'?fmtTime():'')+' · день '+day();
    g.font='12px sans-serif';g.fillText(when+' · '+(player.name||'гость'),16,48);
    g.font='11px sans-serif';g.fillStyle='#6B5B45';g.fillText('Живая Казань',16,146);
    try{return c.toDataURL('image/jpeg',0.72);}catch(e){return '';}
  }
  function takePhoto(){
    spend(100,()=>{
      const src=postcard();if(!src){setHint('Фотограф махнул рукой: плёнка кончилась');return;}
      let list=[];try{list=JSON.parse(localStorage.getItem('zk.photos')||'[]')||[];}catch(e){list=[];}
      list.push({src,title:'Баумана · день '+day(),at:Date.now()});if(list.length>8)list=list.slice(-8);
      try{localStorage.setItem('zk.photos',JSON.stringify(list));}catch(e){setHint('Снимок есть, но телефон его не сохранил');return;}
      if(window.cityPhone&&cityPhone.push)cityPhone.push({from:'Фотограф',text:'Снимок на Баумана у вас в телефоне. Вкладка «Снимки».',kind:'photo'});
      mood(5);reply('📷','Фотограф','Держите. В телефоне, вкладка «Снимки». Город вас запомнил, хотя бы на картоне.');
    });
  }
  function startWedding(){
    if(typeof nearestRoadSeg!=='function')return;
    const ns=nearestRoadSeg(player.x,player.y,40);if(!ns||!ns.seg||ns.seg.L<24)return;
    const s=ns.seg,ux=(s.bx-s.ax)/s.L,uy=(s.by-s.ay)/s.L;
    wed={day:day(),t:0,done:0,told:0,cars:[0,1,2].map(i=>({x:ns.px-ux*(16+i*8),y:ns.py-uy*(16+i*8),hx:ux,hy:uy}))};
    addEvent('Где-то рядом сигналят: свадебный кортеж выехал');
  }
  function yell(){mood(4);reply('💍','Кортеж','Молодожёны махнули. Кто-то уже ищет второй букет.');}
  function tipCar(){spend(50,()=>{mood(6);reply('💍','Кортеж','На капот легло 50 ₽. Им на счастье, вам на настроение.');});}
  function feedBirds(){
    spend(20,()=>{fed=1;stolen=0;still.t=0;mood(3);reply('🐦','Голуби','Сели ближе. Стойте смирно: у них тут комитет.');});
  }
  function updateCityBits(dt){
    if(typeof player==='undefined'||!world||scene!=='city')return;
    if(bags.day!==day()){bags.clear();bags.day=day();}
    if(player.inside){gran=null;kiosk=null;cameraman=null;birds=[];return;}
    const onFoot=!player.vehicle&&!player.bus;
    const b=onFoot?nearestBuilding():null;
    if(!b)gran=null;
    else if(!gran||gran.b!==b){const q=benchOf(b);gran={x:q[0],y:q[1],b,name:NAMES[(b.i||0)%NAMES.length],asked:null};}
    const h=hour();
    if(onFoot&&(h>=22||h<5)&&world.stops){
      let stop=null,sd=22;
      for(const s of world.stops){const d=dist(s.x,s.y,player.x,player.y);if(d<sd){sd=d;stop=s;}}
      if(stop){const q=spotOut(stop.x+3,stop.y+2);if(!kiosk||kiosk.stop!==stop)kiosk={x:q[0],y:q[1],stop,q1:{x:q[0]-1.4,y:q[1]+1.2},q2:{x:q[0]-2.4,y:q[1]+0.4}};}
      else kiosk=null;
    }else kiosk=null;
    const bm=onFoot?bauman():null;
    if(bm&&dist(bm.x,bm.y,player.x,player.y)<34){if(!cameraman){const q=spotOut(bm.x+5,bm.y);cameraman={x:q[0],y:q[1]};}}
    else cameraman=null;
    if((!wed||wed.day!==day())&&h>=18&&h<21&&!player.bus)startWedding();
    if(wed&&!wed.done){
      wed.t+=dt;const spd=3.4*dt;
      for(const c of wed.cars){const nx=c.x+c.hx*spd,ny=c.y+c.hy*spd;if(outside(nx,ny)){c.x=nx;c.y=ny;}}
      if(player.vehicle&&wed.cars[0]&&dist(wed.cars[0].x,wed.cars[0].y,player.x,player.y)<10&&player.vehicle.speed>1.2)player.vehicle.speed*=0.2;
      if(wed.t>58){wed.done=1;wed.cars=[];addEvent('Кортеж уехал. Улица снова обычная');}
    }
    const square=onFoot&&typeof nearSquare==='function'?nearSquare(player.x,player.y,28):null;
    if(!square){birds=[];fed=0;shoulder=0;}
    else{
      if(birds.length<6||birds.sq!==square){birds=[];birds.sq=square;for(let i=0;i<6;i++){const q=spotOut(square.x,square.y);birds.push({x:q[0],y:q[1],ph:Math.random()*6});}}
      const tx=fed?player.x+0.8:square.x,ty=fed?player.y:square.y;
      for(const p of birds){const dx=tx+(Math.sin(p.ph)*2)-p.x,dy=ty+(Math.cos(p.ph)*2)-p.y,dd=Math.hypot(dx,dy)||1;const st=Math.min(dd,(fed?2.2:0.6)*dt);if(outside(p.x+dx/dd*st,p.y+dy/dd*st)){p.x+=dx/dd*st;p.y+=dy/dd*st;}p.ph+=dt*3;}
      if(fed){shoulder=Math.min(8,shoulder+dt);if(Math.hypot(player.x-still.x,player.y-still.y)<0.35)still.t+=dt;else{still.x=player.x;still.y=player.y;still.t=0;}
        if(!stolen&&still.t>10&&player.food>12){stolen=1;player.food=typeof clamp==='function'?clamp(player.food-8,0,100):Math.max(0,player.food-8);shoulder=0;addEvent('Голубь унёс эчпочмак. Комитет распущен');setHint('Голубь унёс эчпочмак');}}
    }
  }
  function near(o,r){return o&&dist(o.x,o.y,player.x,player.y)<r;}
  function bitsAction(){
    if(scene!=='city'||player.inside||player.busy)return null;
    if(carry&&dist(carry.x,carry.y,player.x,player.y)<3)return {d:dist(carry.x,carry.y,player.x,player.y),label:'Отдать пакет '+carry.name,run:giveBag};
    if(near(gran,2.3)&&!player.vehicle)return {d:dist(gran.x,gran.y,player.x,player.y),label:'Поговорить: '+gran.name+', лавочка',run:talkGran};
    if(near(kiosk,2.4)&&!player.vehicle)return {d:dist(kiosk.x,kiosk.y,player.x,player.y),label:'Ночная шаурма · 180 ₽',run:()=>card('🌯','Шаурма у остановки','Ночь. Лаваш горячий. Лук спорит с жизнью, жизнь пока проигрывает.',[
      {t:'С курицей · 180 ₽',primary:true,run:()=>shawarma('chicken')},
      {t:'Острое · 180 ₽',run:()=>shawarma('hot')},
      {t:'Не надо',run:()=>{}}
    ])};
    if(near(cameraman,2.4)&&!player.vehicle)return {d:dist(cameraman.x,cameraman.y,player.x,player.y),label:'Фотограф · сняться за 100 ₽',run:()=>card('📷','Фотограф на Баумана','Чуть левее вывески. Подбородок выше. Баумана не любит, когда моргают.',[
      {t:'Сняться · 100 ₽',primary:true,run:takePhoto},{t:'Не сейчас',run:()=>{}}
    ])};
    if(wed&&!wed.done&&!wed.told&&wed.cars[0]&&dist(wed.cars[0].x,wed.cars[0].y,player.x,player.y)<14)return {d:9,label:'Свадебный кортеж',run:()=>{wed.told=1;card('💍','Кортеж','Минуту улица их: ленты, клаксон и никто никуда не спешит.',[
      {t:player.vehicle?'Посигналить':'Крикнуть «Горько!»',primary:true,run:yell},
      {t:'Кинуть 50 ₽ на капот',run:tipCar},
      {t:'Пропустить',run:()=>{}}
    ]);}};
    if(birds.length&&!fed&&!player.vehicle&&dist(birds[0].x,birds[0].y,player.x,player.y)<2.6)return {d:dist(birds[0].x,birds[0].y,player.x,player.y),label:'Бросить хлеб голубям · 20 ₽',run:feedBirds};
    return null;
  }
  function person(x,y,col,toS,z){
    const [sx,sy]=toS(x,y);if(sx<-20||sx>W+20||sy<-20||sy>H+20)return null;
    if(z<1.3){ctx.fillStyle=col;ctx.beginPath();ctx.arc(sx,sy,2.2,0,TAU);ctx.fill();return null;}
    ctx.fillStyle=col;ctx.fillRect(sx-3,sy-8,6,12);ctx.beginPath();ctx.arc(sx,sy-12,3.2,0,TAU);ctx.fill();return [sx,sy];
  }
  function label(sx,sy,text){ctx.font='600 10px "IBM Plex Sans",system-ui';ctx.textAlign='center';ctx.fillStyle='#243028';ctx.fillText(text,sx,sy-20);}
  function drawCityBits(toS,z){
    if(scene!=='city')return;
    if(gran){const p=person(gran.x,gran.y,'#6E4A6A',toS,z);if(p&&z>2.1)label(p[0],p[1],'👵 '+gran.name);}
    if(kiosk){const [sx,sy]=toS(kiosk.x,kiosk.y);if(sx>-40&&sx<W+40&&sy>-40&&sy<H+40){ctx.fillStyle='#C4512C';ctx.fillRect(sx-10,sy-8,20,14);ctx.fillStyle='#fff';ctx.font='700 8px sans-serif';ctx.textAlign='center';ctx.fillText('ШАУРМА',sx,sy+1);person(kiosk.q1.x,kiosk.q1.y,'#3E6B8A',toS,z);person(kiosk.q2.x,kiosk.q2.y,'#8A623E',toS,z);}}
    if(cameraman){const p=person(cameraman.x,cameraman.y,'#243044',toS,z);if(p&&z>2)label(p[0],p[1],'📷 фотограф');}
    if(wed&&!wed.done)for(const c of wed.cars){const [sx,sy]=toS(c.x,c.y);if(sx<-30||sx>W+30||sy<-30||sy>H+30)continue;ctx.save();ctx.translate(sx,sy);ctx.rotate(Math.atan2(c.hy,c.hx));ctx.fillStyle='#F4F1EA';ctx.fillRect(-8,-4,16,8);ctx.fillStyle='#E24B4B';ctx.fillRect(-2,-4,4,8);ctx.restore();}
    for(const p of birds){const [sx,sy]=toS(p.x,p.y);if(sx<-10||sx>W+10||sy<-10||sy>H+10)continue;ctx.fillStyle='#8E9398';ctx.beginPath();ctx.arc(sx,sy,z<1.4?1.6:2.4,0,TAU);ctx.fill();}
    if(shoulder>1&&!player.inside){const [sx,sy]=toS(player.x,player.y);ctx.fillStyle='#8E9398';ctx.beginPath();ctx.arc(sx+7,sy-16,2.6,0,TAU);ctx.fill();}
    if(carry){const [sx,sy]=toS(carry.x,carry.y);if(sx>-20&&sx<W+20&&sy>-20&&sy<H+20&&z>1.6){ctx.font='14px sans-serif';ctx.textAlign='center';ctx.fillText('🚪',sx,sy);}}
  }
  window.updateCityBits=updateCityBits;window.drawCityBits=drawCityBits;
  function boot(){
    if(typeof findAction==='function'&&!findAction._bits){const prev=findAction;function wrapped(){const mine=bitsAction();const a=prev();if(mine&&mine.d<2.5)return mine;return a||mine;}wrapped._bits=1;wrapped._park=findAction._park;findAction=wrapped;}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
