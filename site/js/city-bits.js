// Дворовые мелочи в каждом районе рядом с игроком: несколько лавочек, ночные киоски, фотографы, голуби, кортеж.
(function(){
  let grans=[],kiosks=[],cams=[],flocks=[],wed=null,carry=null,placeT=0;
  const still={x:0,y:0,t:0},bags=new Set();
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
    const choices=[{t:'Потом',run:()=>reply('👵',g.name,granLine())}];
    if(!asked)choices.unshift({t:'Донести пакет',primary:true,run:()=>{
      bags.add(key);const d=doorOf(g.b,g);carry={x:d[0],y:d[1],name:g.name};
      reply('👜',g.name,'Там кефир и хлеб. До двери, не до соседа. Сосед и так всё видит.');
    }});
    card('👵',g.name+' · лавочка',granLine()+(asked?'':' Донесите пакет до двери: спина уже не та.'),choices);
  }
  function giveBag(){
    const name=carry&&carry.name||'Бабушка';carry=null;player.money+=80;mood(6);
    reply('👵',name,'Вот на пирожок, 80 ₽. И шапку в следующий раз наденьте.');
  }
  function shawarma(kind){
    const joke=kind==='hot'?'Если заплачу, это от лука. Не расспрашивайте.':'Котлета смотрит на Казань. Так и задумано.';
    spend(180,()=>{player.food=typeof clamp==='function'?clamp(player.food+22,0,100):Math.min(100,player.food+22);player.energy=typeof clamp==='function'?clamp(player.energy+6,0,100):Math.min(100,player.energy+6);mood(4);reply('🌯','Шаурма',joke);});
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
  function takePhoto(cam){
    const place=cam.place||'Казань';
    spend(100,()=>{
      const src=postcard(place);if(!src){setHint('Фотограф махнул рукой: плёнка кончилась');return;}
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
  function yell(){mood(4);reply('💍','Кортеж','Молодожёны махнули. Кто-то уже ищет второй букет.');}
  function tipCar(){spend(50,()=>{mood(6);reply('💍','Кортеж','На капот легло 50 ₽. Им на счастье, вам на настроение.');});}
  function feedBirds(f){spend(20,()=>{f.fed=1;f.stolen=0;still.t=0;mood(3);reply('🐦','Голуби','Сели ближе. Стойте смирно: у них тут комитет.');});}
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
      if(!f){f={sq:s,fed:0,stolen:0,birds:[]};for(let i=0;i<5;i++){const q=spotOut(s.x,s.y,i);f.birds.push({x:q[0],y:q[1],ph:i});}}
      nf.push(f);
    }
    flocks=nf;
  }
  function updateCityBits(dt){
    if(typeof player==='undefined'||!world||scene!=='city')return;
    if(bags.day!==day()){bags.clear();bags.day=day();}
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
    for(const k of kiosks)k.ph+=dt;
    for(const c of cams)c.ph+=dt;
    for(const g of grans)g.ph+=dt;
    let anyFed=false;
    for(const f of flocks){
      const tx=f.fed?player.x+0.8:f.sq.x,ty=f.fed?player.y:f.sq.y;
      for(const p of f.birds){p.ph+=dt*6;const dx=tx+Math.sin(p.ph)*1.6-p.x,dy=ty+Math.cos(p.ph)*1.6-p.y,dd=Math.hypot(dx,dy)||1;const st=Math.min(dd,(f.fed?2.2:0.7)*dt);const nx=p.x+dx/dd*st,ny=p.y+dy/dd*st;if(outside(nx,ny)){p.x=nx;p.y=ny;}}
      if(f.fed)anyFed=true;
    }
    if(anyFed){
      if(Math.hypot(player.x-still.x,player.y-still.y)<0.35)still.t+=dt;else{still.x=player.x;still.y=player.y;still.t=0;}
      const f=flocks.find(q=>q.fed&&!q.stolen);
      if(f&&still.t>10&&player.food>12){f.stolen=1;player.food=typeof clamp==='function'?clamp(player.food-8,0,100):Math.max(0,player.food-8);addEvent('Голубь унёс эчпочмак. Комитет распущен');setHint('Голубь унёс эчпочмак');}
    }
  }
  function bitsAction(){
    if(scene!=='city'||player.inside||player.busy)return null;
    if(carry&&dist(carry.x,carry.y,player.x,player.y)<3)return {d:dist(carry.x,carry.y,player.x,player.y),label:'Отдать пакет '+carry.name,run:giveBag};
    const g=nearest(grans,2.3);if(g&&!player.vehicle)return {d:g._d,label:'Поговорить: '+g.name+', лавочка',run:()=>talkGran(g)};
    const k=nearest(kiosks,2.4);if(k&&!player.vehicle)return {d:k._d,label:'Ночная шаурма · 180 ₽',run:()=>card('🌯','Шаурма у остановки','Ночь. Лаваш горячий. Лук спорит с жизнью, жизнь пока проигрывает.',[
      {t:'С курицей · 180 ₽',primary:true,run:()=>shawarma('chicken')},{t:'Острое · 180 ₽',run:()=>shawarma('hot')},{t:'Не надо',run:()=>{}}])};
    const c=nearest(cams,2.4);if(c&&!player.vehicle)return {d:c._d,label:'Фотограф · сняться за 100 ₽',run:()=>card('📷','Фотограф · '+c.place,c.place==='Улица Баумана'?'Чуть левее вывески. Подбородок выше. Баумана не любит, когда моргают.':'У «'+c.place+'» свет нормальный. Подбородок выше и не моргайте.',[
      {t:'Сняться · 100 ₽',primary:true,run:()=>takePhoto(c)},{t:'Не сейчас',run:()=>{}}])};
    if(wed&&!wed.done&&!wed.told&&wed.cars[0]&&dist(wed.cars[0].x,wed.cars[0].y,player.x,player.y)<14)return {d:9,label:'Свадебный кортеж',run:()=>{wed.told=1;card('💍','Кортеж','Минуту улица их: ленты, клаксон и никто никуда не спешит.',[
      {t:player.vehicle?'Посигналить':'Крикнуть «Горько!»',primary:true,run:yell},{t:'Кинуть 50 ₽ на капот',run:tipCar},{t:'Пропустить',run:()=>{}}]);}};
    let flock=null,bd=2.8;
    for(const f of flocks){if(f.fed)continue;for(const p of f.birds){const d=dist(p.x,p.y,player.x,player.y);if(d<bd){bd=d;flock=f;}}}
    if(flock&&!player.vehicle)return {d:bd,label:'Бросить хлеб голубям · 20 ₽',run:()=>feedBirds(flock)};
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
      const bob=Math.sin(t*2+g.ph)*1.4;
      const p=person(g.x,g.y,'#6E4A6A',toS,z,bob);
      if(!p)continue;
      ctx.strokeStyle='#C4A574';ctx.lineWidth=Math.max(2,p[2]*2);ctx.beginPath();ctx.moveTo(p[0]-8*p[2],p[1]+4);ctx.lineTo(p[0]+8*p[2],p[1]+4);ctx.stroke();
      ctx.strokeStyle='#E7D2A8';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(p[0]+2*p[2],p[1]-2);ctx.lineTo(p[0]+7*p[2]+Math.sin(t*6+g.ph)*4,p[1]-6);ctx.stroke();
      if(z>2)label(p[0],p[1],'👵 '+g.name);
    }
    for(const k of kiosks){
      const [sx,sy]=toS(k.x,k.y);if(sx<-40||sx>W+40||sy<-40||sy>H+40)continue;
      ctx.fillStyle='#C4512C';ctx.fillRect(sx-12,sy-10,24,16);ctx.fillStyle='#fff';ctx.font='700 8px sans-serif';ctx.textAlign='center';ctx.fillText('ШАУРМА',sx,sy+1);
      ctx.fillStyle='rgba(230,230,230,.8)';
      for(let i=0;i<3;i++){const y=((t*28+i*10)%26);ctx.globalAlpha=1-y/26;ctx.beginPath();ctx.arc(sx-6+i*6,sy-12-y,2.2,0,TAU);ctx.fill();}
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
      if(f.fed&&!f.stolen)shoulder=true;
    }
    if(shoulder&&!player.inside){const [sx,sy]=toS(player.x,player.y);const flap=Math.sin(t*7)*3;ctx.fillStyle='#8E9398';ctx.beginPath();ctx.arc(sx+8,sy-18+Math.sin(t*3),3,0,TAU);ctx.fill();ctx.strokeStyle='#6E757C';ctx.beginPath();ctx.moveTo(sx+8,sy-18);ctx.lineTo(sx+3,sy-18-flap);ctx.moveTo(sx+8,sy-18);ctx.lineTo(sx+13,sy-18-flap);ctx.stroke();}
    if(carry){const [sx,sy]=toS(carry.x,carry.y);if(sx>-20&&sx<W+20&&sy>-20&&sy<H+20&&z>1.6){ctx.font='14px sans-serif';ctx.textAlign='center';ctx.fillText('🚪',sx,sy);}}
  }
  window.updateCityBits=updateCityBits;window.drawCityBits=drawCityBits;
  function boot(){
    if(typeof findAction==='function'&&!findAction._bits){const prev=findAction;function wrapped(){const mine=bitsAction();const a=prev();if(mine&&mine.d<2.5)return mine;return a||mine;}wrapped._bits=1;wrapped._park=findAction._park;findAction=wrapped;}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
