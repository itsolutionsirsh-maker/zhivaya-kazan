// Площадь Свободы: люди сходятся со районов. После ста — полиция просит разойтись.
// После тысячи открывается приёмная Госсовета: книга города и бумажные указы. Без драки.
(function(){
  const ADD={vahitovsky:160,privolzhsky:150,sovetsky:140,novosavinovsky:170,moskovsky:155,kirovsky:145,aviastroitelny:180};
  const COP=['Что вы тут делаете?','Расходитесь по домам.','Площадь не для такого сбора.','Кто вас собрал? Просьба разойтись.','Давайте без крика. По домам, граждане.'];
  const FOLK=['Мы с района приехали.','Никого не трогаем.','Чай ещё горячий.','Домой далеко.','Это наша площадь.','Сейчас, постою.'];
  const LAWS=[
    {id:'tea', t:'Чай на площади бесплатный', d:'У термоса на Свободы наливают всем, кто стоит.'},
    {id:'quiet', t:'После девяти в центре тише', d:'Гудки и крики стихают. На площади спокойнее.'},
    {id:'park', t:'Парки светятся до полуночи', d:'Фонари в парках не гасят. Вечерняя прогулка теплее.'},
    {id:'tram', t:'По воскресеньям трамвай за 1 ₽', d:'В ленте пишут: воскресный трамвай почти даром.'},
    {id:'ech', t:'День эчпочмака', d:'В кафе к эчпочмаку наливают чай от площади.'},
    {id:'bench', t:'На площади больше скамеек', d:'Люди садятся, а не только стоят с плакатами.'}
  ];
  const COATS=['#3E5C8A','#8E4458','#3F6B52','#C4A574','#5C5348','#7A4E2D','#2F4A44','#A85A42','#6E5A8A','#8A7048'];
  let doorXY=null, teaT=0, lawBox=null;

  function freedom(sq){return !!(sq&&/свобод/i.test(sq.n||''));}
  function massOn(r){return !!(r&&r.mass&&!r.ending);}
  function laws(){try{const a=JSON.parse(localStorage.getItem('zk.decrees')||'[]');return Array.isArray(a)?a.filter(id=>LAWS.some(l=>l.id===id)).slice(0,4):[];}catch(e){return [];}}
  function hasLaw(id){return laws().indexOf(id)>=0;}
  function govOpen(){try{return localStorage.getItem('zk.massGov')==='1';}catch(e){return false;}}
  function shortName(n){return String(n||'район').replace(/\s*район$/i,'');}

  function massSlot(r,i){
    const sq=r.sq;
    const grow=Math.min(1, (r.crowd||50)/1000);
    const R=Math.max(9, Math.min((sq.r||30)*(0.32+0.62*grow), 42));
    const an=i*2.399963229728653;
    let rr=R*Math.sqrt((i%140)+0.6)/Math.sqrt(140);
    let x=sq.x+Math.cos(an)*rr, y=sq.y+Math.sin(an)*rr*0.86;
    if((sq.poly&&!pointInPoly(sq.poly,x,y))||(typeof inBuilding==='function'&&inBuilding(x,y))){
      rr*=0.45; x=sq.x+Math.cos(an)*rr; y=sq.y+Math.sin(an)*rr*0.86;
    }
    return [x,y];
  }
  function reseat(r){
    let i=0;
    for(const w of r.people){
      const s=massSlot(r,i++);
      w.rallySlot=s;
      if(w.state==='rally'){w.x=s[0]; w.y=s[1]; w.path=null;}
    }
    r.slotN=Math.max(r.slotN||0, i);
  }
  function seed(r){
    const sq=r.sq; let guard=0;
    while(r.people.length<32&&walkers.length<640&&guard++<40){
      const s=massSlot(r, r.people.length);
      const node=nearestNode(sq.x,sq.y,world.pedAdj,90);
      if(node<0) break;
      const w=new Walker('resident', node);
      w.temp=true; w.x=s[0]; w.y=s[1]; w.state='rally'; w.rally=r; w.rallySlot=s;
      if(Math.random()<0.4&&typeof SIGN_COLORS!=='undefined') w.sign=pick(SIGN_COLORS);
      walkers.push(w); r.people.push(w);
    }
    r.joined=Math.max(r.joined||0, r.people.length);
    r.slotN=r.people.length;
  }
  function stripEarlyCops(r){
    for(const w of r.police||[]){
      w.rally=null; w.say=null;
      const i=walkers.indexOf(w); if(i>=0) walkers.splice(i,1);
    }
    r.police=[];
  }
  function queue(sq){
    const ds=(window.cityDistricts||[]).filter(d=>d.kind==='admin'&&Array.isArray(d.center));
    ds.sort((a,b)=>{const A=llToXY(a.center),B=llToXY(b.center);return dist(A[0],A[1],sq.x,sq.y)-dist(B[0],B[1],sq.x,sq.y);});
    return ds;
  }
  function upgrade(r){
    if(!r||r.mass||r.by==='peer'||r.ending) return;
    if(r.kind==='concert'||r.kind==='match'||!freedom(r.sq)) return;
    r.mass=true; r.dur=1e9;
    r.crowd=Math.max(r.people.length, r.joined||0, 48);
    r.peak=Math.round(r.crowd);
    r.phase='gather'; r.waveT=2.5; r.waves=queue(r.sq); r.slotN=r.people.length;
    r.copsIn=false; r.asked=false; r.askWait=false; r.opened=false; r.barkT=12; r.hold=0; r.finale=null; r.finT=0; r.finLaw=''; r.leaveWhy='';
    r.patrols=[]; r.footCops=[];
    r.chants=['Мы с района!','Казань — наш дом!','Никого не трогаем','Чай ещё есть','Вместе!','Слышите нас?'];
    if(r.crowd<100) stripEarlyCops(r);
    seed(r);
    r.target=r.joined;
    reseat(r);
    addEvent('К площади Свободы идут со всех районов. Пока здесь '+Math.round(r.crowd)+' человек.','rally');
  }
  function edge(sq,ll){
    const xy=llToXY(ll); let dx=xy[0]-sq.x, dy=xy[1]-sq.y; const L=Math.hypot(dx,dy)||1; dx/=L; dy/=L;
    const R=Math.max(sq.r||24,22)+28;
    const x=sq.x+dx*R, y=sq.y+dy*R;
    return typeof toSidewalk==='function'?toSidewalk(x,y):[x,y];
  }
  function plant(r,n,from){
    let added=0;
    while(added<n&&r.people.length<130&&walkers.length<640){
      const slot=massSlot(r,r.slotN++);
      const node=nearestNode(from[0],from[1],world.pedAdj,200);
      if(node<0) break;
      const w=new Walker('resident',node); w.temp=true; w.spd=rnd(2.8,3.5); walkers.push(w);
      sendTo(w,r,slot,false); added++;
    }
    return added;
  }
  function bark(r,line){
    const p=r.people.filter(w=>w.state==='rally');
    const w=p.length?p[(Math.random()*p.length)|0]:null;
    if(w) w.say={t:line||pick(FOLK),ttl:4};
    const cops=(r.patrols||[]).map(P=>P.cop).filter(Boolean).concat(r.footCops||[]);
    const c=cops.length?cops[(Math.random()*cops.length)|0]:null;
    if(c&&typeof say==='function') say(c,pick(COP),5);
    else if(c) c.say={t:pick(COP),ttl:5};
  }
  function police(r){
    if(r.copsIn) return;
    r.copsIn=true; r.phase='police';
    const sq=r.sq;
    for(let i=0;i<3;i++){
      const an=i/3*Math.PI*2+0.5, R=Math.min(sq.r||30,40)+14;
      const x=sq.x+Math.cos(an)*R, y=sq.y+Math.sin(an)*R;
      let P=null;
      try{
        if(typeof callPatrol==='function') P=callPatrol({x,y,target:()=>[x,y],say:pick(COP),onReach:(cop,PP)=>{if(PP)PP.leaveT=500; if(typeof say==='function')say(cop,pick(COP),6);}});
      }catch(e){}
      if(P){r.patrols.push(P); continue;}
      const node=nearestNode(x,y,world.pedAdj,180);
      if(node<0) continue;
      const w=new Walker('police',node); w.temp=true; w.keep=true; walkers.push(w); w.say={t:pick(COP),ttl:6}; r.footCops.push(w);
    }
    addEvent('На площадь Свободы приехала полиция: «Что вы тут делаете? Расходитесь по домам.»','rally');
    ask(r);
  }
  function ask(r){
    if(r.asked||typeof sitCard!=='function') return;
    if(dist(player.x,player.y,r.sq.x,r.sq.y)>150){r.askWait=true; return;}
    r.asked=true; r.askWait=false;
    sitCard({icon:'🚓', tone:'alert', title:'Полиция на площади',
      text:'Сотрудник, не повышая голоса: «Что вы тут делаете? Площадь не для такого сбора. Расходитесь по домам.» Люди с районов смотрят на вас.',
      ttl:20,
      choices:[
        {t:'Мы мирно стоим', primary:true, run:()=>{r.phase='stay'; addEvent('Вы ответили: сбор мирный, никого не трогаем. Полиция остаётся у края и снова просит разойтись.','rally'); bark(r,'Мы никого не трогаем.');}},
        {t:'Ладно, расходимся', run:()=>disperse(r)}
      ],
      onTimeout:()=>{r.phase='stay'; addEvent('Полиция повторяет: «По домам». Люди пока стоят.','rally');}});
  }
  function disperse(r){
    if(!r||r.finale==='leave'||r.ending) return;
    r.leaveWhy='asked';
    addEvent('Вы попросили разойтись. Люди нехотя тянутся по домам. Полиция кивает: «Ну вот и хорошо.»','rally');
    startLeave(r);
  }
  function beginFinale(r){
    if(r.finale||r.ending) return;
    const last=laws(); const law=LAWS.find(l=>l.id===last[last.length-1]);
    r.finLaw=law?law.t:(r.finLaw||'');
    r.finale='read'; r.finT=0;
    addEvent(r.finLaw
      ?'Все районы на месте. Со ступенек читают указ: «'+r.finLaw+'».'
      :'Все районы на месте. Со ступенек говорят: нас больше тысячи, а в приёмную так и не зашли.','rally');
    const p=r.people.filter(w=>w.state==='rally');
    if(p.length) p[(Math.random()*p.length)|0].say={t:r.finLaw||'Нас уже больше тысячи.',ttl:5};
    if(typeof sitCard!=='function'||dist(player.x,player.y,r.sq.x,r.sq.y)>240) return;
    sitCard({icon:'🏛', tone:'good', title:r.finLaw?'Указ прочитали':'Площадь полная',
      text:r.finLaw
        ?'Люди повторяют «'+r.finLaw+'». Полиция кивает: прочитали — и по домам. Сейчас сбор разойдётся.'
        :'Площадь полная, приёмная открыта, но записывать уже некому: люди устали и начинают расходиться. Указ можно вывесить в другой раз.',
      ttl:14,
      choices:[
        {t:'Смотреть, как расходятся', primary:true, run:()=>startLeave(r)},
        {t:'Успеть в приёмную', run:()=>{if(r.finale!=='leave'){r.finale=null; r.hold=-24;} const d=door(); if(typeof walkTo==='function')walkTo(d[0],d[1],true);}}
      ],
      onTimeout:()=>startLeave(r)});
  }
  function startLeave(r){
    if(!r||r.finale==='leave'||r.ending) return;
    r.finale='leave'; r.finT=0;
    if(r.leaveWhy!=='asked') addEvent('Люди потянулись с площади по домам. Полиция стоит, пока не станет пусто.','rally');
    const p=r.people.filter(w=>w.state==='rally');
    if(p.length) p[(Math.random()*p.length)|0].say={t:r.finLaw||'Ладно, по домам.',ttl:4};
  }
  function peel(r,n){
    let left=0;
    for(let i=r.people.length-1;i>=0&&left<n;i--){
      const w=r.people[i];
      r.people.splice(i,1);
      w.rally=null; w.rallySlot=null; w.sign=null; w.say=null;
      const an=Math.random()*6.2832, R=(r.sq.r||30)+36;
      const x=r.sq.x+Math.cos(an)*R, y=r.sq.y+Math.sin(an)*R;
      const from=nearestNode(w.x,w.y,world.pedAdj,80);
      const to=nearestNode(x,y,world.pedAdj,140);
      if(from>=0) w.node=from;
      if(to<0||typeof requestPath!=='function'){w.state='idle'; w.ttl=rnd(1,4); left++; continue;}
      w.state='routing';
      requestPath(w,world.pedAdj,w.node,to,typeof pedCost==='function'?pedCost:null,path=>{
        if(w.rally) return;
        if(!path||path.length<2){w.state='idle'; w.ttl=2; return;}
        w.path=path; w.seg=0; w.t=0; w.state='walk';
      });
      left++;
    }
  }
  function finishOut(r){
    if(!r||r.ending) return;
    const asked=r.leaveWhy==='asked', law=r.finLaw;
    const n=r.peak||Math.round(r.crowd)||0;
    const text=asked
      ?'Сбор закончился: вы попросили разойтись. На пике было '+n+' человек. Площадь пустая, полиция уехала.'
      :law
        ?'Сбор закончился. На пике было '+n+' человек. Указ «'+law+'» остался на площади, люди разошлись по районам, полиция уехала.'
        :'Сбор закончился сам. На пике было '+n+' человек. Полиция попросила разойтись, люди разошлись по домам. Приёмная открыта — указ можно записать позже.';
    addEvent(text,'rally');
    for(const P of r.patrols||[]){try{if(typeof finishPatrol==='function')finishPatrol(P,false);}catch(e){}}
    r.patrols=[];
    for(const w of r.footCops||[]){const i=walkers.indexOf(w); if(i>=0) walkers.splice(i,1);}
    r.footCops=[];
    if(typeof sitCard==='function'&&dist(player.x,player.y,r.sq.x,r.sq.y)<280){
      sitCard({icon:asked?'🚓':'🏛', tone:'good', title:'Чем закончилось', text:text, ttl:18,
        choices:[{t:'Понятно', primary:true, run:()=>{}}]});
    }
    endRally(r, true);
  }
  function full(r){
    if(r.opened) return;
    r.opened=true; r.phase='full';
    try{localStorage.setItem('zk.massGov','1');}catch(e){}
    addEvent('На площади больше тысячи. Люди заняли ступеньки Госсовета — приёмная открыта, можно записать свои правила.','rally');
    if(typeof sitCard==='function'&&dist(player.x,player.y,r.sq.x,r.sq.y)<240){
      sitCard({icon:'🏛', tone:'good', title:'Приёмная открыта',
        text:'Площадь полная. У Госсовета люди на ступеньках, двери приёмной открыты. Внутри книга города: можно вывесить свои правила. Снаружи полиция по-прежнему просит разойтись.',
        ttl:18,
        choices:[
          {t:'Иду в приёмную', primary:true, run:()=>{const d=door(); if(typeof walkTo==='function')walkTo(d[0],d[1],true);}},
          {t:'Пока на площади', run:()=>{}}
        ]});
    }
  }
  function wave(r){
    if(!r.waves||!r.waves.length) return;
    const d=r.waves.shift();
    const add=ADD[d.id]||140;
    r.crowd=Math.min(1400, r.crowd+add);
    r.peak=Math.max(r.peak||0, Math.round(r.crowd));
    plant(r,14,edge(r.sq,d.center));
    reseat(r);
    addEvent('Подошли из района «'+shortName(d.name)+'»: ещё '+add+'. На площади уже '+Math.round(r.crowd)+'.','rally');
    if(r.crowd>100&&!r.copsIn) police(r);
    if(r.crowd>1000) full(r);
  }
  function tick(dt){
    for(const r of rallies.slice()){
      if(!massOn(r)) continue;
      if(!r.copsIn&&r.crowd>100) police(r);
      if(!r.opened&&r.crowd>1000) full(r);
      if(r.askWait) ask(r);
      if(r.finale==='leave'){
        r.crowd=Math.max(0, r.crowd-dt*70);
        r.finT+=dt;
        if(r.finT>0.4){r.finT=0; peel(r,5);}
        if(r.crowd<=28||(!r.people.length&&r.crowd<80)){finishOut(r); continue;}
        continue;
      }
      if(r.finale==='read'){
        r.finT+=dt;
        if(r.finT>14) startLeave(r);
        continue;
      }
      if(r.waves&&r.waves.length){
        r.waveT-=dt;
        const near=dist(player.x,player.y,r.sq.x,r.sq.y)<700;
        if(r.waveT<=0){r.waveT=near?8:18; wave(r);}
      }else if(r.opened){
        if(player.inside&&interior&&interior.key==='mass-gov') r.hold=0;
        else{r.hold=(r.hold||0)+dt; if(r.hold>12) beginFinale(r);}
      }
      if(r.copsIn&&!r.opened&&!r.finale){
        r.barkT-=dt;
        if(r.barkT<=0){r.barkT=16; bark(r); r.crowd=Math.max(90, r.crowd-rnd(4,9));}
      }
    }
    if(hasLaw('tea')&&world&&world.squares){
      teaT-=dt;
      const sq=world.squares.find(s=>/свобод/i.test(s.n||''));
      if(sq&&teaT<=0&&dist(player.x,player.y,sq.x,sq.y)<Math.max(18,sq.r||20)&&scene==='city'){
        teaT=80; player.mood=clamp(player.mood+6,0,100); addEvent('На площади Свободы налили бесплатный чай. Настроение +6','rally');
      }
    }
  }
  function door(){
    if(doorXY) return doorXY;
    let b=null;
    if(world&&world.buildings){for(const q of world.buildings){if(/государственн/i.test(q.n||'')&&/совет/i.test(q.n||'')){b=q;break;}}}
    if(!b){if(!world||!world.buildings||!world.buildings.length) return [724.7,-520]; doorXY=[724.7,-520]; return doorXY;}
    let x=(b.bb[0]+b.bb[2])/2, y=b.bb[3]+6;
    if(typeof toSidewalk==='function'){const s=toSidewalk(x,y); if(s){x=s[0]; y=s[1];}}
    if(typeof inBuilding==='function'&&inBuilding(x,y)) y=b.bb[3]+10;
    doorXY=[x,y]; return doorXY;
  }
  function doorReady(){
    if(govOpen()) return true;
    return rallies.some(r=>massOn(r)&&r.crowd>1000);
  }
  function doorAction(){
    if(scene!=='city'||player.vehicle||player.bus||player.inside||!doorReady()) return null;
    const d=door(); if(dist(player.x,player.y,d[0],d[1])>16) return null;
    return {label:laws().length?'Приёмная Госсовета · ваши указы':'Занять приёмную Госсовета', run:enterGov};
  }
  function enterGov(){
    const d=door();
    try{localStorage.setItem('zk.massGov','1');}catch(e){}
    const r=rallies.find(massOn); if(r){r.captured=true; r.opened=true; r.phase='laws';}
    enterInterior({kind:'townhall', name:'Приёмная Госсовета', key:'mass-gov', x:d[0], y:d[1], venueAt:{x:d[0],y:d[1]}, place:'townhall', st:'government'});
    if(interior){const c=interior.npcs&&interior.npcs[0]; if(c) c.p.job='дежурный приёмной';}
    setHint('Стойка — книга города. E, чтобы вывесить указ.');
    addEvent('Вы в приёмной Госсовета. На столе книга города и печать. Снаружи по-прежнему просят разойтись.','rally');
  }
  function closeLaws(){if(!lawBox) return; lawBox.hidden=true; player.busy=false;}
  function putLaw(id){
    const have=laws(); if(have.indexOf(id)>=0||have.length>=4) return;
    have.push(id); try{localStorage.setItem('zk.decrees', JSON.stringify(have));}catch(e){}
    const law=LAWS.find(l=>l.id===id);
    player.mood=clamp(player.mood+8,0,100);
    addEvent('Указ вывешен: «'+law.t+'». Настроение +8','rally');
    const r=rallies.find(q=>q.mass);
    if(r){r.finLaw=law.t; r.chants=r.chants||[]; r.chants.push(law.t); const p=r.people.filter(w=>w.state==='rally'); if(p.length) p[(Math.random()*p.length)|0].say={t:law.t,ttl:5};}
    if(interior&&interior.npcs&&interior.npcs[0]&&typeof say==='function') say(interior.npcs[0],'Записали. Повесим на площади.',5);
    closeLaws();
  }
  function openLaws(){
    if(!lawBox){
      lawBox=document.createElement('div'); lawBox.className='modal'; lawBox.id='lawModal'; lawBox.hidden=true;
      lawBox.innerHTML='<div class="box"><h2>Книга города</h2><p id="lawLead"></p><div id="lawList"></div><div class="row"><button class="btn" id="lawClose" type="button">Закрыть</button></div></div>';
      document.body.appendChild(lawBox);
      lawBox.querySelector('#lawClose').onclick=closeLaws;
    }
    const have=laws();
    lawBox.querySelector('#lawLead').textContent=have.length>=4
      ?'В книге четыре указа. Они висят на площади, новые уже не влезают.'
      :'Печать чернильная. Выберите правило — его вывесят на площади.';
    const list=lawBox.querySelector('#lawList'); list.innerHTML='';
    for(const law of LAWS){
      const b=document.createElement('button'); b.type='button'; b.className='btn'; b.style.display='block'; b.style.width='100%'; b.style.margin='6px 0'; b.style.textAlign='left';
      b.textContent=(have.indexOf(law.id)>=0?'✓ ':'')+law.t+' — '+law.d;
      b.disabled=have.indexOf(law.id)>=0||have.length>=4;
      b.onclick=()=>putLaw(law.id);
      list.appendChild(b);
    }
    lawBox.hidden=false; player.busy=true;
  }

  if(typeof startRally==='function'){const prev=startRally; startRally=function(sq,kind,title,by){const r=prev(sq,kind,title,by); if(r) upgrade(r); return r;};}
  if(typeof updateRallies==='function'){const prev=updateRallies; updateRallies=function(dt){
    if(world&&world.squares){for(const r of rallies) upgrade(r);}
    prev(dt); tick(dt||0);
  };}
  if(typeof drawRallyWorld==='function'){const prev=drawRallyWorld; drawRallyWorld=function(z,t){
    prev(z,t);
    for(const r of rallies){
      if(!r.mass) continue;
      const sq=r.sq, R=Math.max(18,Math.min((sq.r||30)*0.95,48));
      const n=Math.min(520, Math.round((r.crowd||0)*0.45));
      for(let i=0;i<n;i++){
        const an=i*2.399963229728653, rr=R*Math.sqrt((i+2)/(n+1));
        const x=sq.x+Math.cos(an)*rr, y=sq.y+Math.sin(an)*rr*0.88;
        if(sq.poly&&!pointInPoly(sq.poly,x,y)) continue;
        if(typeof inBuilding==='function'&&inBuilding(x,y)) continue;
        ctx.fillStyle=COATS[i%COATS.length];
        ctx.beginPath(); ctx.ellipse(x,y,0.62,0.38,an*0.2,0,6.2832); ctx.fill();
        ctx.fillStyle='#F0D2B4'; ctx.beginPath(); ctx.arc(x+Math.cos(an)*0.05,y-0.28,0.2,0,6.2832); ctx.fill();
      }
    }
    if(doorReady()){
      const d=door(); ctx.strokeStyle='rgba(142,68,173,.85)'; ctx.lineWidth=0.6;
      ctx.beginPath(); ctx.arc(d[0],d[1],3.2+Math.sin((t||0)*2)*0.25,0,6.2832); ctx.stroke();
    }
  };}
  if(typeof drawRallyLabels==='function'){const prev=drawRallyLabels; drawRallyLabels=function(toS,z){
    prev(toS,z);
    if(world&&world.squares){
      for(const r of rallies){
        if(!r.mass||r.finale!=='leave') continue;
        const [sx,sy0]=toS(r.sq.x,r.sq.y); if(sx<-80||sx>W+80||sy0<-40||sy0>H+80) continue;
        const txt='Расходятся по домам';
        ctx.font='700 12px "IBM Plex Sans",system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle';
        const tw=ctx.measureText(txt).width+16, sy=sy0-52;
        ctx.fillStyle='rgba(47,109,181,.94)'; rrect(ctx,sx-tw/2,sy-11,tw,22,8); ctx.fill();
        ctx.fillStyle='#fff'; ctx.fillText(txt,sx,sy+1);
      }
    }
    const have=laws(); if(!have.length||!world||!world.squares) return;
    const sq=world.squares.find(s=>/свобод/i.test(s.n||'')); if(!sq) return;
    const law=LAWS.find(l=>l.id===have[have.length-1]); if(!law) return;
    const [sx,sy0]=toS(sq.x,sq.y); if(sx<-80||sx>W+80||sy0<-40||sy0>H+80) return;
    const txt='Указ: '+law.t;
    ctx.font='600 11px "IBM Plex Sans",system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle';
    const tw=ctx.measureText(txt).width+16, sy=sy0+36;
    ctx.fillStyle='rgba(122,62,43,.92)'; rrect(ctx,sx-tw/2,sy-10,tw,20,7); ctx.fill();
    ctx.fillStyle='#fff'; ctx.fillText(txt,sx,sy+1);
  };}
  if(typeof openSpeech==='function'){const prev=openSpeech; openSpeech=function(r){
    prev(r);
    if(r&&r.mass){const el=document.getElementById('speechTitle'); if(el) el.textContent=RALLY_KIND[r.kind].icon+' «'+r.title+'» · '+Math.round(r.crowd)+' человек на площади';}
  };}
  if(typeof findAction==='function'){const prev=findAction; findAction=function(){const mine=doorAction(); return mine||prev();};}
  if(typeof spotAction==='function'){const prev=spotAction; spotAction=function(f,it){
    if(it&&it.key==='mass-gov'&&f&&(f.spot==='counter'||f.t==='counter')) return {label:'Книга города: вывесить указ', run:openLaws};
    return prev(f,it);
  };}
})();
