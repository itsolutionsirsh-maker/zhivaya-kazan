// Парки рядом с игроком: бродячие собаки и квадроберы. Не дети и не квест «пропала собака».
(function(){
  const dogs=[],quads=[];
  const COATS=[{n:'Рыжик',c:'#C47A3A'},{n:'Шарик',c:'#E6D2A2'},{n:'Бобик',c:'#6B4632'},{n:'Серый',c:'#8E949B'}];
  const MASKS=[
    {talk:'cat',mask:'кот',c:'#E07A3D'},
    {talk:'dog',mask:'пёс',c:'#C9A227'},
    {talk:'fox',mask:'лис',c:'#E36B2C'}
  ];
  const TALK={
    cat:{title:'Квадробер · кот',text:'Мяу. Это моя тропа. Пошлина — 40 ₽. Миски нет, так что в карман маски.',
      choices:[
        {t:'Заплатить 40 ₽',primary:true,run:q=>{if(player.money<40){setHint('Сорока рублей нет. Кот вздыхает в маску.');return;}spend(40,()=>reply(q,'Печать ставлю лапой. Хвост не снимать: он на резинке, но принципиальный.','Мяу. Пускаю.',4));}},
        {t:'Мяукнуть',run:q=>reply(q,'Акцент как у гостя. Пускаю. Только не гавкайте: сосед и так обиделся.','Свои. Мяу.',6)},
        {t:'Я просто гуляю',run:q=>reply(q,'Гуляйте. Скамейка моя до заката. На ней я кот, не подушка.','Скамейка моя.',2)}
      ]},
    dog:{title:'Квадробер · пёс',text:'Гав. Я старший по скамейке. Настоящий пёс делает вид, что мы не знакомы.',
      choices:[
        {t:'Гавкнуть в ответ',primary:true,run:q=>reply(q,'В стаю. Кусты ваши, урна моя. Колбасу не носите: я на диете образа.','Гав. Свои.',5)},
        {t:'Встаньте, вы человек',run:q=>reply(q,'Встану у кассы. Здесь служба. Корм сам себя не купит, а лапой карту не приложить.','Потом встану.',2)},
        {t:'Позвать настоящего пса',run:q=>reply(q,dogs.length?'Он отвернулся. Карьера под вопросом, хвост при нём.':'Настоящий уже ушёл. Предательство породы засчитано.','Гав. Обидно.',3)}
      ]},
    fox:{title:'Квадробер · лис',text:'Я лис. Паспорт в хвосте. Хвост на резинке: дёрнете — и я без гражданства.',
      choices:[
        {t:'Хвост не трогаю',primary:true,run:q=>reply(q,'Верно. Резинка и так на честном слове. Вы не налоговая, проходите.','Хвост на месте.',3)},
        {t:'А где прописка?',run:q=>reply(q,'Куст номер три. Штамп ставил голубь, с юристами лучше не спорить.','Куст номер три.',4)},
        {t:'Это просто шапка',run:q=>reply(q,'Шапка не обижается. Я обижаюсь. Ухожу линять в кусты, не провожайте.','Я не шапка.',2)}
      ]}
  };
  function parkAt(){
    let best=null,bd=180;
    for(const l of window.cityLandmarks||[]){
      if(l.kind!=='park'||!Array.isArray(l.ll))continue;
      if(/набереж|кабан|ривьера/i.test(l.name||''))continue;
      if(typeof llToXY!=='function')continue;
      const p=llToXY(l.ll),d=dist(p[0],p[1],player.x,player.y);
      if(d<bd){bd=d;best={x:p[0],y:p[1],name:l.name};}
    }
    return best;
  }
  function spot(cx,cy){
    for(let i=0;i<8;i++){const a=Math.random()*TAU,R=16+Math.random()*50,x=cx+Math.cos(a)*R,y=cy+Math.sin(a)*R;if(typeof inBuilding!=='function'||!inBuilding(x,y))return [x,y];}
    return [cx+10,cy];
  }
  function wander(o,dt,spd){
    o.T=(o.T||0)-dt;
    if(o.T<=0){o.T=2+Math.random()*4;const q=spot(o.home[0],o.home[1]);o.tx=q[0];o.ty=q[1];}
    const dx=o.tx-o.x,dy=o.ty-o.y,dd=Math.hypot(dx,dy);
    if(dd>0.4){const st=Math.min(dd,spd*dt);const nx=o.x+dx/dd*st,ny=o.y+dy/dd*st;if(typeof inBuilding!=='function'||!inBuilding(nx,ny)){o.x=nx;o.y=ny;}o.hx=dx/dd;o.hy=dy/dd;o.moving=true;}
    else o.moving=false;
    o.ph=(o.ph||0)+dt*(o.moving?8:2);
  }
  function fill(p){
    while(dogs.length<3){const q=spot(p.x,p.y),c=COATS[dogs.length%COATS.length];dogs.push({x:q[0],y:q[1],tx:q[0],ty:q[1],hx:1,hy:0,ph:0,T:1,home:[p.x,p.y],name:c.n,c:c.c,pet:0});}
    while(quads.length<2){const used=new Set(quads.map(q=>q.talk));const pool=MASKS.filter(m=>!used.has(m.talk));const m=pool[Math.floor(Math.random()*pool.length)]||MASKS[0];const q=spot(p.x,p.y);quads.push({x:q[0],y:q[1],tx:q[0],ty:q[1],hx:1,hy:0,ph:0,T:1,home:[p.x,p.y],mask:m.mask,c:m.c,talk:m.talk,bubble:'',bubbleT:0});}
    for(const o of dogs.concat(quads))o.home=[p.x,p.y];
  }
  function updatePark(dt){
    if(typeof player==='undefined'||player.inside||scene!=='city')return;
    const p=parkAt();
    if(!p){dogs.length=0;quads.length=0;return;}
    fill(p);
    for(const d of dogs)wander(d,dt,1.15);
    for(const q of quads)wander(q,dt,0.85);
  }
  function nearest(list,r){
    let best=null,bd=r;
    for(const o of list){const d=dist(o.x,o.y,player.x,player.y);if(d<bd){bd=d;best=o;}}
    return best;
  }
  function parkAction(){
    if(scene!=='city'||player.inside)return null;
    const d=nearest(dogs,2.2);
    if(d)return {label:d.pet?'Пёс '+d.name+' уже доволен':'Погладить пса '+d.name,run:()=>{
      if(d.pet){setHint(d.name+' и так виляет хвостом');return;}
      d.pet=1;player.mood=typeof clamp==='function'?clamp(player.mood+3,0,100):player.mood+3;
      addEvent(d.name+' вильнул хвостом');setHint('Шерсть тёплая. Настроение +3');
    }};
    const q=nearest(quads,2.2);
    if(q)return {label:'Поговорить: квадробер · '+q.mask,run:()=>quadTalk(q)};
    return null;
  }
  function reply(q,text,bark,mood){
    q.bubble=bark;q.bubbleT=4;
    if(mood)player.mood=typeof clamp==='function'?clamp(player.mood+mood,0,100):Math.min(100,player.mood+mood);
    addEvent(text);
    if(typeof sitCard==='function')sitCard({icon:q.mask==='лис'?'🦊':q.mask==='пёс'?'🐕':'🐱',title:'Квадробер · '+q.mask,text:text,choices:[{t:'Ладно',primary:true,run:()=>{}}]});
    else setHint(text);
  }
  function quadTalk(q){
    const t=TALK[q.talk];if(!t)return;
    if(typeof sitCard!=='function'){setHint(t.text);return;}
    if(typeof SIT!=='undefined'&&SIT.card){setHint('Сначала договорите то, что уже на экране');return;}
    sitCard({icon:q.mask==='лис'?'🦊':q.mask==='пёс'?'🐕':'🐱',title:t.title,text:t.text,choices:t.choices.map(c=>({t:c.t,primary:!!c.primary,run:()=>c.run(q)}))});
  }
  function sayBubble(q){q.bubble=q.line;q.bubbleT=3.2;}
  function drawDog(o,toS,z){
    const [sx,sy]=toS(o.x,o.y);if(sx<-30||sx>W+30||sy<-30||sy>H+30)return;
    if(z<1.3){ctx.fillStyle=o.c;ctx.beginPath();ctx.arc(sx,sy,2.2,0,TAU);ctx.fill();return;}
    const k=z*0.36;ctx.save();ctx.translate(sx,sy);ctx.rotate(Math.atan2(o.hy,o.hx));
    ctx.fillStyle=o.c;ctx.beginPath();ctx.ellipse(0,0,0.7*k,0.32*k,0,0,TAU);ctx.fill();
    ctx.beginPath();ctx.arc(0.72*k,-0.05*k,0.26*k,0,TAU);ctx.fill();
    ctx.strokeStyle=o.c;ctx.lineWidth=0.12*k;ctx.beginPath();ctx.moveTo(-0.65*k,0);ctx.lineTo(-1*k,Math.sin(o.ph)*0.28*k);ctx.stroke();
    ctx.restore();
    if(z>2.2){ctx.font='600 10px "IBM Plex Sans",system-ui';ctx.textAlign='center';ctx.fillStyle='#243028';ctx.fillText('🐕 '+o.name,sx,sy-k*1.4-8);}
  }
  function drawQuad(o,toS,z){
    const [sx,sy]=toS(o.x,o.y);if(sx<-30||sx>W+30||sy<-30||sy>H+30)return;
    if(z<1.3){ctx.fillStyle=o.c;ctx.beginPath();ctx.arc(sx,sy,2.4,0,TAU);ctx.fill();return;}
    const k=z*0.4;ctx.save();ctx.translate(sx,sy);ctx.rotate(Math.atan2(o.hy,o.hx));
    ctx.strokeStyle='#3A2A22';ctx.lineWidth=0.16*k;ctx.lineCap='round';
    const bob=o.moving?Math.sin(o.ph)*0.12:0;
    ctx.beginPath();ctx.moveTo(-0.2*k,0.15*k);ctx.lineTo(-0.45*k,0.42*k+bob);ctx.moveTo(0.25*k,0.15*k);ctx.lineTo(0.5*k,0.42*k-bob);ctx.stroke();
    ctx.fillStyle=o.c;ctx.beginPath();ctx.ellipse(0.15*k,-0.05*k,0.55*k,0.28*k,0,0,TAU);ctx.fill();
    ctx.beginPath();ctx.arc(0.62*k,-0.12*k,0.24*k,0,TAU);ctx.fill();
    ctx.fillStyle='#2A211C';ctx.beginPath();ctx.moveTo(0.5*k,-0.28*k);ctx.lineTo(0.58*k,-0.48*k);ctx.lineTo(0.7*k,-0.26*k);ctx.fill();
    ctx.restore();
    if(z>2.2){ctx.font='600 10px "IBM Plex Sans",system-ui';ctx.textAlign='center';ctx.fillStyle='#243028';ctx.fillText('Квадробер · '+o.mask,sx,sy-k*1.5-8);
      if(o.bubbleT>0){ctx.fillStyle='rgba(20,30,26,.88)';const tw=Math.min(160,ctx.measureText(o.bubble).width+12);rrect(ctx,sx-tw/2,sy-k*1.5-28,tw,16,6);ctx.fill();ctx.fillStyle='#fff';ctx.fillText(o.bubble.slice(0,28),sx,sy-k*1.5-20);}}
  }
  function drawPark(toS,z){if(scene!=='city')return;for(const d of dogs)drawDog(d,toS,z);for(const q of quads){if(q.bubbleT>0)q.bubbleT-=0.016;drawQuad(q,toS,z);}}
  window.updatePark=updatePark;window.drawPark=drawPark;
  function boot(){
    if(typeof findAction==='function'&&!findAction._park){const prev=findAction;findAction=function(){const a=prev();return a||parkAction();};findAction._park=1;}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
