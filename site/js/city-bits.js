// Дворовые мелочи в каждом районе рядом с игроком: несколько лавочек, ночные киоски, фотографы, голуби, кортеж.
(function(){
  let grans=[],kiosks=[],cams=[],flocks=[],wed=null,carry=null,placeT=0,fair=null,noteT=0,seat=null;
  const notes=new Map();
  const still={x:0,y:0,t:0},bags=new Set(),sat=new Set();
  let introLeft=14,introDone=false;
  try{introDone=localStorage.getItem('zk.bitsIntro')==='1';}catch(e){}
  const NAMES=['Равиля','Насима','Зухра','Сания','Альфия','Фатыма','Гульсум'];
  function hour(){return typeof cityHour==='function'?cityHour():12;}
  function day(){return (typeof clock!=='undefined'&&clock.day)||1;}
  function mood(n){player.mood=typeof clamp==='function'?clamp(player.mood+n,0,100):Math.min(100,player.mood+n);}
  function card(icon,title,text,choices){
    if(typeof sitCard!=='function'){setHint(text);return;}
    if(typeof SIT!=='undefined'&&SIT.card){setHint('Сначала договорите то, что уже на экране');return;}
    sitCard({icon,title,text,choices});
  }
  function reply(icon,title,text){addEvent(text);card(icon,title,text,[{t:'Ладно',primary:true,run:()=>{}}]);}
  function outside(x,y){return typeof inBuilding!=='function'||!inBuilding(x,y);}
  function spotOut(x,y,a){
    const ang=a==null?Math.random()*TAU:a;
    for(let i=0;i<8;i++){const r=4+i*1.4,nx=x+Math.cos(ang+i)*r,ny=y+Math.sin(ang+i*0.7)*r;if(outside(nx,ny))return [nx,ny];}
    return [x+4,y];
  }
  function benchOf(b){
    const a=((b.i||1)%7)*0.9;
    let x=b.cx,y=b.cy,ux=Math.cos(a),uy=Math.sin(a);
    for(let i=0;i<14;i++){const nx=x+ux*2.2,ny=y+uy*2.2;if(outside(nx,ny)&&Math.hypot(nx-b.cx,ny-b.cy)>4)return [nx,ny];x=nx;y=ny;}
    return [b.cx+6,b.cy];
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
  function nearest(list,r){
    let best=null,bd=r;
    for(const o of list){const d=dist(o.x,o.y,player.x,player.y);if(d<bd){bd=d;best=o;best._d=d;}}
    return best;
  }
  function talkGran(g){
    const key=day()+':'+(g.b&&g.b.i!=null?g.b.i:g.name);
    const asked=bags.has(key)||!!carry;
    const note=notes.get(benchId(g));
    const choices=[{t:'Потом',run:()=>reply('👵',g.name,granLine())},{t:'Оставить записку',run:()=>askNote(g)}];
    if(!asked)choices.unshift({t:'Донести пакет',run:()=>{
      bags.add(key);const d=doorOf(g.b,g);carry={x:d[0],y:d[1],name:g.name};
      saveShot('Бабушка с пакетом');
      reply('👜',g.name,'Там кефир и хлеб. До двери, не до соседа. Сосед и так всё видит.');
    }});
    choices.unshift({t:'Сесть',primary:true,run:()=>sitDown(g)});
    const extra=note?' На лавочке записка'+(note.name?' от '+note.name:'')+': «'+note.text+'».':'';
    card('👵',g.name+' · лавочка',granLine()+(asked?'':' Донесите пакет до двери: спина уже не та.')+extra,choices);
  }
  function noteLine(g){
    const note=g&&notes.get(benchId(g));
    return note?'Перед вами записка'+(note.name?' от '+note.name:'')+': «'+note.text+'».':'Лавочка пустая. Можно оставить записку.';
  }
  function sitSpot(g){
    const dx=player.x-g.x,dy=player.y-g.y,L=Math.hypot(dx,dy)||1;
    const px=-dy/L,py=dx/L;
    let x=g.x+px*1.15,y=g.y+py*1.15;
    if(!outside(x,y)){x=g.x-px*1.15;y=g.y-py*1.15;}
    return [x,y];
  }
  function sitDown(g){
    if(!g)return;
    const q=sitSpot(g);
    player.waypoints=null;player.x=q[0];player.y=q[1];
    const dx=g.x-q[0],dy=g.y-q[1],L=Math.hypot(dx,dy)||1;
    player.hx=dx/L;player.hy=dy/L;
    seat={x:q[0],y:q[1],hx:player.hx,hy:player.hy,g};
    window.cityBenchSit=seat;
    const key=day()+':'+benchId(g);
    if(!sat.has(key)){sat.add(key);mood(4);}
    const rain=weather&&weather.kind==='rain';
    setHint(noteLine(g)+(rain?' '+g.name+' подвинулась под зонт.':''),12);
    if(rain)addEvent(g.name+' подвинулась под зонт. Зонт один на двоих');
  }
  function standBench(){
    if(!seat)return;
    const g=seat.g;seat=null;window.cityBenchSit=null;
    if(g){const dx=player.x-g.x,dy=player.y-g.y,L=Math.hypot(dx,dy)||1;const nx=player.x+dx/L*0.9,ny=player.y+dy/L*0.9;if(outside(nx,ny)){player.x=nx;player.y=ny;}}
  }
  window.cityBenchHold=function(go){
    if(!seat)return false;
    if(go||player.vehicle||player.inside||player.bus||player.state==='hurt'||scene!=='city'){standBench();return false;}
    player.x=seat.x;player.y=seat.y;player.hx=seat.hx;player.hy=seat.hy;player.waypoints=null;
    return true;
  };
  function benchCard(){
    const g=seat&&seat.g;
    card('🪑',(g?g.name+' · ':'')+'лавочка',noteLine(g),[
      {t:'Встать',primary:true,run:standBench},
      {t:'Оставить записку',run:()=>g&&askNote(g)}
    ]);
  }
  function giveBag(){
    const name=carry&&carry.name||'Бабушка';carry=null;player.money+=80;mood(6);
    reply('👵',name,'Вот на пирожок, 80 ₽. И шапку в следующий раз наденьте.');
  }
  function shawarma(kind){
    const joke=kind==='hot'?'Если заплачу, это от лука. Не расспрашивайте.':'Котлета смотрит на Казань. Так и задумано.';
    spend(180,()=>{player.food=typeof clamp==='function'?clamp(player.food+22,0,100):Math.min(100,player.food+22);player.energy=typeof clamp==='function'?clamp(player.energy+6,0,100):Math.min(100,player.energy+6);mood(4);saveShot('Ночная шаурма');reply('🌯','Шаурма',joke);});
  }
  function postcard(place){
    const c=document.createElement('canvas');c.width=280;c.height=160;const g=c.getContext('2d');
    g.fillStyle='#E7D7B8';g.fillRect(0,0,280,160);g.fillStyle='#C9B48A';g.fillRect(0,108,280,52);
    g.fillStyle='#8C3A32';g.fillRect(18,78,16,30);g.fillRect(40,70,14,38);g.fillRect(210,64,22,44);g.fillRect(236,74,12,34);
    g.fillStyle='#6E8B74';g.beginPath();g.moveTo(120,96);g.lineTo(132,74);g.lineTo(144,96);g.fill();
    const col=(typeof myClothes==='function'?myClothes():player.clothes)||'#2F9E6B';
    g.fillStyle=col;g.fillRect(132,86,10,22);g.beginPath();g.arc(137,82,5,0,TAU);g.fill();
    g.fillStyle='#2A241C';g.font='600 13px sans-serif';g.fillText(place||'Казань',16,28);
    g.font='12px sans-serif';g.fillText((typeof fmtTime==='function'?fmtTime():'')+' · день '+day()+' · '+(player.name||'гость'),16,48);
    g.font='11px sans-serif';g.fillStyle='#6B5B45';g.fillText('Живая Казань',16,146);
    try{return c.toDataURL('image/jpeg',0.72);}catch(e){return '';}
  }
  function wet(){return !!(weather&&(weather.kind==='rain'||weather.kind==='snow'||weather.ice));}
  const SHOT_FILE={
    'Бабушка с пакетом':'img/shots/babushka.gif',
    'Ночная шаурма':'img/shots/shaurma.gif',
    'Свадебный кортеж':'img/shots/kortezh.gif',
    'Голуби на площади':'img/shots/golubi.gif',
    'Ярмарка, эчпочмак':'img/shots/yarmarka.gif',
    'Вечерняя ярмарка':'img/shots/yarmarka.gif'
  };
  function saveShot(title){
    const src=SHOT_FILE[title]||postcard(title);if(!src)return;
    let list=[];try{list=JSON.parse(localStorage.getItem('zk.photos')||'[]')||[];}catch(e){list=[];}
    if(list.some(p=>p&&p.title===title&&Date.now()-(p.at||0)<120000))return;
    list.push({src,title,at:Date.now()});if(list.length>12)list=list.slice(-12);
    try{localStorage.setItem('zk.photos',JSON.stringify(list));}catch(e){return;}
    if(window.cityPhone&&cityPhone.push)cityPhone.push({from:'Телефон',text:'Снимок («'+title+'») во вкладке «Снимки».',kind:'photo'});
  }
  function benchId(g){return 'b:'+Math.round(g.x)+':'+Math.round(g.y);}
  async function pullNotes(){
    const ids=grans.map(benchId);if(!ids.length||typeof acctCall!=='function')return;
    let j;try{j=await acctCall('bench',{list:ids});}catch(e){return;}
    if(!j||!Array.isArray(j.notes))return;notes.clear();for(const n of j.notes)if(n&&n.id)notes.set(n.id,n);
  }
  function askNote(g){
    if(typeof acct==='undefined'||!acct||!acct.token){setHint('Записку видят другие, поэтому сначала войдите');return;}
    let m=document.getElementById('benchNote');
    if(!m){m=document.createElement('div');m.className='modal';m.id='benchNote';
      m.innerHTML='<div class="box"><h2>Записка на лавочке</h2><p class="hint">До 80 знаков. Её прочитают те, кто подойдёт. Мат и ссылки не проходят.</p><input id="benchText" maxlength="80" autocomplete="off"><div class="row"><button class="btn" id="benchOk" type="button">Оставить</button><button class="btn" id="benchNo" type="button">Отмена</button></div></div>';
      document.body.append(m);}
    m.hidden=false;player.busy=true;const inp=m.querySelector('#benchText');inp.value='';inp.focus();
    const close=()=>{m.hidden=true;player.busy=false;};
    m.querySelector('#benchNo').onclick=close;
    m.querySelector('#benchOk').onclick=async()=>{
      const text=inp.value.trim().slice(0,80);if(text.length<2){setHint('Слишком коротко');return;}
      let j;try{j=await acctCall('bench',{token:acct.token,id:benchId(g),text});}catch(e){j={err:'net'};}
      if(!j||!j.ok){setHint(j&&j.err==='mod'?'Так писать нельзя':j&&j.err==='rate'?'Не так часто. Подождите пару минут':j&&j.err==='auth'?'Сначала войдите':'Записка не сохранилась');return;}
      if(j.note)notes.set(j.note.id,j.note);close();setHint('Записка осталась на лавочке');
    };
  }
  function takePhoto(cam){
    const place=cam.place||'Казань';
    spend(100,()=>{
      const src='img/shots/fotograf.gif';if(!src){setHint('Фотограф махнул рукой: плёнка кончилась');return;}
      let list=[];try{list=JSON.parse(localStorage.getItem('zk.photos')||'[]')||[];}catch(e){list=[];}
      list.push({src,title:place+' · день '+day(),at:Date.now()});if(list.length>8)list=list.slice(-8);
      try{localStorage.setItem('zk.photos',JSON.stringify(list));}catch(e){setHint('Снимок есть, но телефон его не сохранил');return;}
      if(window.cityPhone&&cityPhone.push)cityPhone.push({from:'Фотограф',text:'Снимок («'+place+'») во вкладке «Снимки».',kind:'photo'});
      mood(5);reply('📷','Фотограф','Держите. В телефоне, вкладка «Снимки».');
    });
  }
  function districtHere(){
    let best=null,bd=4000;const list=window.cityDistricts||[];
    if(typeof llToXY!=='function')return 'город';
    for(const d of list){if(!Array.isArray(d.center))continue;if(!d.xy)d.xy=llToXY(d.center);const dd=dist(d.xy[0],d.xy[1],player.x,player.y);if(dd<bd){bd=dd;best=d.id||d.name;}}
    return best||'город';
  }
  function startWedding(did){
    if(typeof nearestRoadSeg!=='function')return;
    const ns=nearestRoadSeg(player.x,player.y,50);if(!ns||!ns.seg||ns.seg.L<24)return;
    const s=ns.seg,ux=(s.bx-s.ax)/s.L,uy=(s.by-s.ay)/s.L;
    wed={day:day(),did:did,t:0,done:0,told:0,ph:0,cars:[0,1,2].map(i=>({x:ns.px-ux*(16+i*8),y:ns.py-uy*(16+i*8),hx:ux,hy:uy}))};
    addEvent('В этом районе сигналят: свадебный кортеж выехал');
  }
  function yell(){mood(4);saveShot('Свадебный кортеж');reply('💍','Кортеж','Молодожёны махнули. Кто-то уже ищет второй букет.');}
  function tipCar(){spend(50,()=>{mood(6);reply('💍','Кортеж','На капот легло 50 ₽. Им на счастье, вам на настроение.');});}
  function feedBirds(f){if(wet()){reply('🐦','Голуби','В такую погоду они не садятся. Хлеб подождёт.');return;}spend(20,()=>{f.fed=1;f.stolen=0;still.t=0;mood(3);saveShot('Голуби на площади');reply('🐦','Голуби','Сели ближе. Стойте смирно: у них тут комитет.');});}
  function place(){
    const onFoot=!player.vehicle&&!player.bus;
    if(!onFoot||!world.bgrid){grans=[];kiosks=[];cams=[];flocks=[];return;}
    const found=[];
    world.bgrid.query(player.x-60,player.y-60,player.x+60,player.y+60,b=>{
      if(!b||b.pass||!b.bb)return;
      const w=b.bb[2]-b.bb[0],h=b.bb[3]-b.bb[1];if(w>75||h>75||w<7)return;
      const dx=Math.max(b.bb[0]-player.x,0,player.x-b.bb[2]),dy=Math.max(b.bb[1]-player.y,0,player.y-b.bb[3]);
      const d=Math.hypot(dx,dy);if(d<52&&d>1.4)found.push(b);
    });
    found.sort((a,b)=>(a.i||0)-(b.i||0));
    const next=[];
    for(const b of found){
      if(next.length>=3)break;
      if(next.some(g=>Math.hypot(g.b.cx-b.cx,g.b.cy-b.cy)<16))continue;
      const prev=grans.find(g=>g.b===b);
      if(prev)next.push(prev);
      else{const q=benchOf(b);next.push({x:q[0],y:q[1],b,name:NAMES[(b.i||next.length)%NAMES.length],ph:(b.i||0)%5});}
    }
    grans=next;
    const h=hour(),night=h>=22||h<5;
    const ks=[];
    if(night&&world.stops){
      const stops=world.stops.filter(s=>dist(s.x,s.y,player.x,player.y)<48).sort((a,b)=>dist(a.x,a.y,player.x,player.y)-dist(b.x,b.y,player.x,player.y)).slice(0,2);
      for(const s of stops){
        const prev=kiosks.find(k=>k.stop===s);
        if(prev)ks.push(prev);
        else{const q=spotOut(s.x,s.y,0.8);ks.push({x:q[0],y:q[1],stop:s,ph:0,q1:{x:q[0]-1.6,y:q[1]+1.3},q2:{x:q[0]-2.6,y:q[1]+0.2}});}
      }
    }
    kiosks=ks;
    const cm=[];
    if(typeof llToXY==='function'){
      for(const l of window.cityLandmarks||[]){
        if(!l||!Array.isArray(l.ll))continue;
        if(l.kind!=='sight'&&l.kind!=='park'&&l.kind!=='square')continue;
        if(/набереж|кабан|ривьера/i.test(l.name||''))continue;
        if(!l.xy)l.xy=llToXY(l.ll);
        if(dist(l.xy[0],l.xy[1],player.x,player.y)>55)continue;
        const prev=cams.find(c=>c.name===l.name);
        if(prev)cm.push(prev);
        else{const q=spotOut(l.xy[0],l.xy[1],1.2);cm.push({x:q[0],y:q[1],name:l.name,place:l.name,ph:0});}
        if(cm.length>=2)break;
      }
    }
    cams=cm;
    if(typeof nearSquare!=='function'||!world.squares){flocks=[];return;}
    const sqs=world.squares.filter(s=>dist(s.x,s.y,player.x,player.y)<46).slice(0,2);
    const nf=[];
    for(const s of sqs){
      let f=flocks.find(q=>q.sq===s);
      if(!f){f={sq:s,fed:0,stolen:0,birds:[]};const n=wet()?2:5;for(let i=0;i<n;i++){const q=spotOut(s.x,s.y,i);f.birds.push({x:q[0],y:q[1],ph:i});}}
      else if(wet()&&f.birds.length>2)f.birds.length=2;
      nf.push(f);
    }
    flocks=nf;
  }
  function fairKind(did){
    const h=hour();if(h<18||h>=21||!did||did==='город')return null;
    const month=new Date(Date.now()+3*3600e3).getUTCMonth()+1,winter=month===12||month<=2;
    let n=day()*13;for(const c of String(did))n=(Math.imul(n,33)+c.charCodeAt(0))>>>0;
    const k=n%4;if(winter&&k===0)return 'ice';
    return ['fair','music','kids','fair'][k];
  }
  function startFair(did,kind){
    const q=spotOut(player.x,player.y,1.4);
    fair={day:day(),did,kind,x:q[0],y:q[1],ph:0,told:0};
    const name={fair:'ярмарка с эчпочмаками',music:'гармонь',kids:'дети с шарами',ice:'ледяной городок'}[kind];
    addEvent('Вечер в районе: '+name);
  }
  function buyPie(){spend(90,()=>{player.food=typeof clamp==='function'?clamp(player.food+14,0,100):Math.min(100,player.food+14);mood(3);saveShot('Ярмарка, эчпочмак');reply('🥟','Ярмарка','Горячий. Руки потом в снег, если он есть.');});}
  function updateCityBits(dt){
    if(typeof player==='undefined')return;
    weatherSound();
    if(!world||scene!=='city'){if(seat){seat=null;window.cityBenchSit=null;}return;}
    if(bags.day!==day()){bags.clear();bags.day=day();sat.clear();}
    if(player.inside){grans=[];kiosks=[];cams=[];flocks=[];return;}
    placeT-=dt;if(placeT<=0){placeT=0.5;place();}
    const h=hour(),did=districtHere();
    if((!wed||wed.day!==day()||(wed.done&&wed.did!==did))&&h>=18&&h<21&&!player.bus){if(!wed||wed.did!==did||wed.day!==day())startWedding(did);}
    if(wed&&!wed.done){
      wed.t+=dt;wed.ph+=dt;const spd=3.4*dt;
      for(const c of wed.cars){const nx=c.x+c.hx*spd,ny=c.y+c.hy*spd;if(outside(nx,ny)){c.x=nx;c.y=ny;}}
      if(player.vehicle&&wed.cars[0]&&dist(wed.cars[0].x,wed.cars[0].y,player.x,player.y)<10&&player.vehicle.speed>1.2)player.vehicle.speed*=0.2;
      if(wed.t>58){wed.done=1;wed.cars=[];addEvent('Кортеж уехал. Улица снова обычная');}
    }
    const fk=fairKind(did);
    if(fk&&(!fair||fair.day!==day()||fair.did!==did))startFair(did,fk);
    if(fair&&(fair.day!==day()||hour()<18||hour()>=21))fair=null;
    noteT-=dt;if(noteT<=0){noteT=8;pullNotes();}
    if(seat&&(player.inside||player.vehicle||player.bus||scene!=='city'||dist(player.x,player.y,seat.x,seat.y)>6))standBench();
    if(!introDone&&!window.zkNoStory){introLeft-=dt;if(introLeft<=0&&hour()>=18&&scene==='city'&&!player.inside&&!player.busy&&!(typeof SIT!=='undefined'&&SIT.card)){
      introDone=true;try{localStorage.setItem('zk.bitsIntro','1');}catch(e){}
      const text='Первый вечер: после десяти у остановки — шаурма. На лавочке можно сесть и оставить записку. Снимки лежат в телефоне.';
      addEvent(text);setHint(text,14);
      if(window.cityPhone&&cityPhone.push)try{cityPhone.push({from:'Город',text:text,kind:'event'});}catch(e){}
    }}
    for(const k of kiosks)k.ph+=dt;
    for(const c of cams)c.ph+=dt;
    for(const g of grans)g.ph+=dt;
    let anyFed=false;
    for(const f of flocks){
      const tx=(f.fed&&!wet())?player.x+0.8:f.sq.x,ty=(f.fed&&!wet())?player.y:f.sq.y;
      for(const p of f.birds){p.ph+=dt*6;const dx=tx+Math.sin(p.ph)*1.6-p.x,dy=ty+Math.cos(p.ph)*1.6-p.y,dd=Math.hypot(dx,dy)||1;const st=Math.min(dd,(f.fed?2.2:0.7)*dt);const nx=p.x+dx/dd*st,ny=p.y+dy/dd*st;if(outside(nx,ny)){p.x=nx;p.y=ny;}}
      if(f.fed&&!wet())anyFed=true;
    }
    if(anyFed){
      if(Math.hypot(player.x-still.x,player.y-still.y)<0.35)still.t+=dt;else{still.x=player.x;still.y=player.y;still.t=0;}
      const f=flocks.find(q=>q.fed&&!q.stolen);
      if(f&&still.t>10&&player.food>12){f.stolen=1;player.food=typeof clamp==='function'?clamp(player.food-8,0,100):Math.max(0,player.food-8);addEvent('Голубь унёс эчпочмак. Комитет распущен');setHint('Голубь унёс эчпочмак');}
    }
  }
  function bitsAction(){
    if(scene!=='city'||player.inside||player.busy)return null;
    if(seat)return {d:0,label:'Лавочка',run:benchCard};
    if(carry&&dist(carry.x,carry.y,player.x,player.y)<3)return {d:dist(carry.x,carry.y,player.x,player.y),label:'Отдать пакет '+carry.name,run:giveBag};
    const g=nearest(grans,2.3);if(g&&!player.vehicle)return {d:g._d,label:'Поговорить: '+g.name+', лавочка',run:()=>talkGran(g)};
    if(fair&&!player.vehicle&&dist(fair.x,fair.y,player.x,player.y)<3.2){
      const titles={fair:'Ярмарка',music:'Гармонь',kids:'Шары',ice:'Ледяной городок'};
      const texts={fair:'Эчпочмаки с пылу. Очередь из двоих и один уже ест на ходу.',music:'Гармонь тянет не спеша. Кто хочет — подпевает.',kids:'Двое с шарами. Один уже почти улетел.',ice:'Горка из снега. Съезжать можно, вставать — как получится.'};
      return {d:dist(fair.x,fair.y,player.x,player.y),label:titles[fair.kind]||'Вечер',run:()=>card('🌆',titles[fair.kind],texts[fair.kind]||'',fair.kind==='fair'?[{t:'Эчпочмак · 90 ₽',primary:true,run:buyPie},{t:'Постоять',run:()=>{saveShot('Вечерняя ярмарка');}}]:[{t:'Посмотреть',primary:true,run:()=>saveShot(titles[fair.kind])},{t:'Дальше',run:()=>{}}])};
    }
    const k=nearest(kiosks,2.4);if(k&&!player.vehicle)return {d:k._d,label:'Ночная шаурма · 180 ₽',run:()=>card('🌯','Шаурма у остановки','Ночь. Лаваш горячий. Лук спорит с жизнью, жизнь пока проигрывает.',[
      {t:'С курицей · 180 ₽',primary:true,run:()=>shawarma('chicken')},{t:'Острое · 180 ₽',run:()=>shawarma('hot')},{t:'Не надо',run:()=>{}}])};
    const c=nearest(cams,2.4);if(c&&!player.vehicle)return {d:c._d,label:'Фотограф · сняться за 100 ₽',run:()=>card('📷','Фотограф · '+c.place,c.place==='Улица Баумана'?'Чуть левее вывески. Подбородок выше. Баумана не любит, когда моргают.':'У «'+c.place+'» свет нормальный. Подбородок выше и не моргайте.',[
      {t:'Сняться · 100 ₽',primary:true,run:()=>takePhoto(c)},{t:'Не сейчас',run:()=>{}}])};
    if(wed&&!wed.done&&!wed.told&&wed.cars[0]&&dist(wed.cars[0].x,wed.cars[0].y,player.x,player.y)<14)return {d:9,label:'Свадебный кортеж',run:()=>{wed.told=1;card('💍','Кортеж','Минуту улица их: ленты, клаксон и никто никуда не спешит.',[
      {t:player.vehicle?'Посигналить':'Крикнуть «Горько!»',primary:true,run:yell},{t:'Кинуть 50 ₽ на капот',run:tipCar},{t:'Пропустить',run:()=>{}}]);}};
    let flock=null,bd=2.8;
    for(const f of flocks){if(f.fed)continue;for(const p of f.birds){const d=dist(p.x,p.y,player.x,player.y);if(d<bd){bd=d;flock=f;}}}
    if(flock&&!player.vehicle)return {d:bd,label:wet()?'Голуби не садятся: мокро':'Бросить хлеб голубям · 20 ₽',run:()=>feedBirds(flock)};
    return null;
  }
  function person(x,y,col,toS,z,bob){
    const [sx,sy]=toS(x,y);if(sx<-30||sx>W+30||sy<-30||sy>H+30)return null;
    const k=Math.max(1,Math.min(z/4.5,2.2));
    if(z<1.3){ctx.fillStyle=col;ctx.beginPath();ctx.arc(sx,sy,2.2,0,TAU);ctx.fill();return null;}
    const yy=sy+(bob||0);
    ctx.fillStyle=col;ctx.fillRect(sx-3*k,yy-8*k,6*k,12*k);ctx.beginPath();ctx.arc(sx,yy-12*k,3.2*k,0,TAU);ctx.fill();
    return [sx,yy,k];
  }
  function label(sx,sy,text){ctx.font='600 11px "IBM Plex Sans",system-ui';ctx.textAlign='center';ctx.fillStyle='#243028';ctx.fillText(text,sx,sy-22);}
  function drawCityBits(toS,z){
    if(scene!=='city')return;
    const t=(typeof performance!=='undefined'?performance.now():0)/1000;
    for(const g of grans){
      const share=seat&&seat.g===g&&weather&&weather.kind==='rain';
      let gx=g.x,gy=g.y;
      if(share){const vx=player.x-g.x,vy=player.y-g.y,L=Math.hypot(vx,vy)||1;gx+=vx/L*0.85;gy+=vy/L*0.85;}
      const bob=Math.sin(t*2+g.ph)*1.4;
      const p=person(gx,gy,'#6E4A6A',toS,z,bob);
      if(!p)continue;
      ctx.strokeStyle='#C4A574';ctx.lineWidth=Math.max(2,p[2]*2);ctx.beginPath();ctx.moveTo(p[0]-8*p[2],p[1]+4);ctx.lineTo(p[0]+8*p[2],p[1]+4);ctx.stroke();
      ctx.strokeStyle='#E7D2A8';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(p[0]+2*p[2],p[1]-2);ctx.lineTo(p[0]+7*p[2]+Math.sin(t*6+g.ph)*4,p[1]-6);ctx.stroke();
      if(wet()){
        let ux=p[0],uw=9*p[2];
        if(share){const pl=toS(player.x,player.y);ux=(p[0]+pl[0])/2;uw=Math.max(14*p[2],Math.abs(pl[0]-p[0])/2+8*p[2]);}
        ctx.fillStyle='rgba(35,55,80,.9)';ctx.beginPath();ctx.ellipse(ux,p[1]-18*p[2],uw,3.2*p[2],0,Math.PI,0,true);ctx.fill();
      }
      const note=notes.get(benchId(g));
      if(z>2)label(p[0],p[1],(note?'📝 ':'')+'👵 '+g.name);
      if(seat&&seat.g===g&&z>1.4){
        const line=note?note.text:'можно оставить записку';
        ctx.font='12px "IBM Plex Sans",system-ui';ctx.textAlign='center';ctx.fillStyle='rgba(255,250,240,.94)';
        const tw=Math.min(220,ctx.measureText(line).width+16);
        ctx.fillRect(p[0]-tw/2,p[1]-46,tw,18);
        ctx.fillStyle='#243028';ctx.fillText(line.length>42?line.slice(0,41)+'…':line,p[0],p[1]-33);
      }
    }
    for(const k of kiosks){
      const [sx,sy]=toS(k.x,k.y);if(sx<-40||sx>W+40||sy<-40||sy>H+40)continue;
      ctx.fillStyle='#C4512C';ctx.fillRect(sx-12,sy-10,24,16);ctx.fillStyle='#fff';ctx.font='700 8px sans-serif';ctx.textAlign='center';ctx.fillText('ШАУРМА',sx,sy+1);
      ctx.fillStyle='rgba(230,230,230,.8)';
      const puffs=(hour()>=22||wet())?6:3;
      for(let i=0;i<puffs;i++){const y=((t*(wet()?40:28)+i*8)%30);ctx.globalAlpha=1-y/30;ctx.beginPath();ctx.arc(sx-8+(i%3)*8,sy-12-y,2.4,0,TAU);ctx.fill();}
      ctx.globalAlpha=1;
      const shift=Math.sin(t*1.4)*1.5;
      person(k.q1.x,k.q1.y+shift*0.05,'#3E6B8A',toS,z,shift);
      person(k.q2.x,k.q2.y,'#8A623E',toS,z,-shift);
    }
    for(const c of cams){
      const p=person(c.x,c.y,'#243044',toS,z,0);
      if(!p)continue;
      ctx.fillStyle='#111';ctx.fillRect(p[0]+4*p[2],p[1]-6,5*p[2],3*p[2]);
      if(Math.sin(t*2+c.ph)>0.86){ctx.fillStyle='rgba(255,255,230,.85)';ctx.beginPath();ctx.arc(p[0]+8*p[2],p[1]-5,6*p[2],0,TAU);ctx.fill();}
      if(z>2)label(p[0],p[1],'📷 фотограф');
    }
    if(wed&&!wed.done)for(const c of wed.cars){
      const [sx,sy]=toS(c.x,c.y);if(sx<-30||sx>W+30||sy<-30||sy>H+30)continue;
      ctx.save();ctx.translate(sx,sy+Math.sin(t*8)*0.6);ctx.rotate(Math.atan2(c.hy,c.hx));
      ctx.fillStyle='#F4F1EA';ctx.fillRect(-9,-5,18,10);ctx.fillStyle='#E24B4B';ctx.fillRect(-2,-5,4,10);
      ctx.fillStyle='#F2C14E';ctx.beginPath();ctx.arc(8,Math.sin(t*10)*2,1.6,0,TAU);ctx.fill();ctx.restore();
    }
    let shoulder=false;
    for(const f of flocks)for(const p of f.birds){
      const [sx,sy]=toS(p.x,p.y);if(sx<-12||sx>W+12||sy<-12||sy>H+12)continue;
      const flap=Math.sin(p.ph)*4;ctx.strokeStyle='#6E757C';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx-5,sy-flap);ctx.moveTo(sx,sy);ctx.lineTo(sx+5,sy-flap);ctx.stroke();
      ctx.fillStyle='#8E9398';ctx.beginPath();ctx.arc(sx,sy,z<1.4?1.8:2.8,0,TAU);ctx.fill();
      if(f.fed&&!f.stolen&&!wet())shoulder=true;
    }
    if(shoulder&&!player.inside){const [sx,sy]=toS(player.x,player.y);const flap=Math.sin(t*7)*3;ctx.fillStyle='#8E9398';ctx.beginPath();ctx.arc(sx+8,sy-18+Math.sin(t*3),3,0,TAU);ctx.fill();ctx.strokeStyle='#6E757C';ctx.beginPath();ctx.moveTo(sx+8,sy-18);ctx.lineTo(sx+3,sy-18-flap);ctx.moveTo(sx+8,sy-18);ctx.lineTo(sx+13,sy-18-flap);ctx.stroke();}
    if(carry){const [sx,sy]=toS(carry.x,carry.y);if(sx>-20&&sx<W+20&&sy>-20&&sy<H+20&&z>1.6){ctx.font='14px sans-serif';ctx.textAlign='center';ctx.fillText('🚪',sx,sy);}}
    if(fair){
      const [sx,sy]=toS(fair.x,fair.y);if(sx>-40&&sx<W+40&&sy>-40&&sy<H+40){
        if(fair.kind==='fair'){ctx.fillStyle='#8C4A2F';ctx.fillRect(sx-14,sy-8,28,14);ctx.fillStyle='#F2C14E';ctx.font='700 8px sans-serif';ctx.textAlign='center';ctx.fillText('ЭЧПОЧМАК',sx,sy+1);}
        else if(fair.kind==='music'){person(fair.x,fair.y,'#5C3A2E',toS,z,Math.sin(t*3)*1.2);ctx.fillStyle='#222';ctx.font='14px sans-serif';ctx.textAlign='center';ctx.fillText('🎵',sx+12,sy-10+Math.sin(t*4)*2);}
        else if(fair.kind==='kids'){person(fair.x-1.2,fair.y,'#3E6B8A',toS,z,0);person(fair.x+1.2,fair.y,'#C4512C',toS,z,0);ctx.fillStyle='#E24B4B';ctx.beginPath();ctx.arc(sx-8,sy-22+Math.sin(t*2)*2,4,0,TAU);ctx.fill();ctx.fillStyle='#3A7BD5';ctx.beginPath();ctx.arc(sx+10,sy-24+Math.cos(t*2)*2,4,0,TAU);ctx.fill();}
        else{ctx.fillStyle='rgba(230,240,248,.9)';ctx.beginPath();ctx.ellipse(sx,sy,16,8,0,0,TAU);ctx.fill();ctx.fillStyle='#9BB7C9';ctx.fillRect(sx-6,sy-10,12,8);}
      }
    }
  }
  let actx=null,sndGain=null,sndFilter=null,sndOn=false;
  function armSound(){
    if(sndOn)return;sndOn=true;
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
    try{
      actx=new AC();
      const len=actx.sampleRate*2,buf=actx.createBuffer(1,len,actx.sampleRate),data=buf.getChannelData(0);
      let b=0;for(let i=0;i<len;i++){const w=Math.random()*2-1;b=0.97*b+0.03*w;data[i]=b*3;}
      const src=actx.createBufferSource();src.buffer=buf;src.loop=true;
      sndFilter=actx.createBiquadFilter();sndFilter.type='lowpass';sndFilter.frequency.value=900;
      sndGain=actx.createGain();sndGain.gain.value=0;
      src.connect(sndFilter);sndFilter.connect(sndGain);sndGain.connect(actx.destination);src.start();
    }catch(e){actx=null;}
    weatherSound();
  }
  function weatherSound(){
    if(!sndGain||!actx||typeof weather==='undefined')return;
    if(actx.state==='suspended')actx.resume();
    const k=weather.kind,quiet=document.hidden||player.inside||scene!=='city';
    const v=quiet?0:(k==='rain'?0.15:k==='snow'?0.04:0);
    sndGain.gain.setTargetAtTime(v,actx.currentTime,0.35);
    sndFilter.frequency.setTargetAtTime(k==='snow'?420:1400,actx.currentTime,0.35);
  }
  document.addEventListener('pointerdown',armSound,{once:true});
  document.addEventListener('keydown',armSound,{once:true});
  document.addEventListener('visibilitychange',()=>weatherSound());
  window.updateCityBits=updateCityBits;window.drawCityBits=drawCityBits;
  function boot(){
    if(typeof findAction==='function'&&!findAction._bits){const prev=findAction;function wrapped(){const mine=bitsAction();const a=prev();if(mine&&mine.d<2.5)return mine;return a||mine;}wrapped._bits=1;wrapped._park=findAction._park;findAction=wrapped;}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
