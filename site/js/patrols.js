// Посты ДПС, передвижные камеры, пешие ППС и Росгвардия.
// Мульт города: посты переезжают по улицам, камера шлёт штраф как обычная. Не настоящие адреса и не инструкция, как их объехать.
(function(){
  const GAP=11;
  let units=[],booted=0,cool=2;
  const LOOK={
    gai:{clothes:'#3C7DFF',skin:'#F1D3B5',hair:'#2B1B12',role:'police'},
    pps:{clothes:'#2E5BD6',skin:'#E8C4A8',hair:'#1A1A1A',role:'police'},
    rg:{clothes:'#2A3142',skin:'#E8C4A8',hair:'#111',role:'police'}
  };

  function hour(){return typeof cityHour==='function'?cityHour():12;}
  function curbAt(x,y){
    if(typeof nearestRoadSeg!=='function')return null;
    const ns=nearestRoadSeg(x,y,36);if(!ns||!ns.seg||!ns.seg.L)return null;
    const s=ns.seg,L=s.L||1,ux=(s.bx-s.ax)/L,uy=(s.by-s.ay)/L;
    let nx=-uy,ny=ux,off=(s.r&&s.r.hw?s.r.hw:3)+1.7;
    let px=ns.px+nx*off,py=ns.py+ny*off;
    if(typeof inBuilding==='function'&&inBuilding(px,py)){px=ns.px-nx*off;py=ns.py-ny*off;nx=-nx;ny=-ny;}
    if(typeof inBuilding==='function'&&inBuilding(px,py))return null;
    return {x:px,y:py,hx:ux,hy:uy,nx,ny,road:(s.r&&s.r.n)||'улица',lim:(s.r&&s.r.lim)||60,ax:s.ax,ay:s.ay,bx:s.bx,by:s.by};
  }
  function spot(minR,maxR,spin){
    if(!world||!world.carAdj)return null;
    const ang=spin*1.35+(spin%3)*0.4;
    const R=minR+(maxR-minR)*((spin%4)/3);
    const n=nearestNode(player.x+Math.cos(ang)*R,player.y+Math.sin(ang)*R,world.carAdj,160);
    if(n<0)return null;
    const p=world.nodes[n];
    const c=curbAt(p[0],p[1]);
    if(!c)return null;
    const d=Math.hypot(c.x-player.x,c.y-player.y);
    if(d<40)return null;
    if(units.some(u=>Math.hypot(u.x-c.x,u.y-c.y)<75))return null;
    return c;
  }
  function hopPath(x,y,spin){
    const n0=nearestNode(x,y,world.carAdj,80);if(n0<0||typeof adjList!=='function')return null;
    const ang=spin*1.9;
    const tx=x+Math.cos(ang)*900,ty=y+Math.sin(ang)*900;
    const seq=[n0];let prev=-1,cur=n0;
    for(let i=0;i<9;i++){
      const p=world.nodes[cur];let best=-1,bs=-1e9;
      for(const e of adjList(world.carAdj,cur)){
        const v=e[0];if(v===prev)continue;
        const q=world.nodes[v];
        const dx=q[0]-p[0],dy=q[1]-p[1],L=Math.hypot(dx,dy)||1;
        const score=dx/L*(tx-p[0])+dy/L*(ty-p[1]);
        if(score>bs){bs=score;best=v;}
      }
      if(best<0||bs<8)break;
      prev=cur;cur=best;seq.push(cur);
    }
    if(seq.length<3)return null;
    const wps=pathToWaypoints(seq,world.carAdj,'car');
    const pts=[];
    for(const p of wps){const last=pts[pts.length-1];if(!last||Math.hypot(last[0]-p[0],last[1]-p[1])>3)pts.push(p);}
    if(pts.length<2)return null;
    let len=0;const cum=[0];
    for(let i=1;i<pts.length;i++){len+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);cum.push(len);}
    if(len<50)return null;
    return {pts,cum,len};
  }
  function pointAt(route,s){
    s=Math.max(1,Math.min(route.len-0.5,s));
    let i=0;const c=route.cum;
    while(i<c.length-2&&c[i+1]<s)i++;
    const seg=(c[i+1]-c[i])||1,t=(s-c[i])/seg;
    const a=route.pts[i],b=route.pts[Math.min(route.pts.length-1,i+1)];
    const dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy)||1;
    return {x:a[0]+dx*(t),y:a[1]+dy*(t),hx:dx/L,hy:dy/L};
  }
  function park(u,c){
    u.x=c.x;u.y=c.y;u.hx=c.hx;u.hy=c.hy;u.nx=c.nx;u.ny=c.ny;
    u.road=c.road;u.lim=c.lim;u.ax=c.ax;u.ay=c.ay;u.bx=c.bx;u.by=c.by;
    u.state='post';u.route=null;u.s=0;u.wx=null;u.wy=null;
    u.hold=u.kind==='cam'?rnd(100,160):u.kind==='rg'?rnd(80,130):rnd(70,120);
  }
  function boot(){
    if(booted||!world||!world.carAdj||typeof player==='undefined')return;
    units=[];
    const bands=[[80,240],[200,480],[420,860]];
    function addKind(kind,title,n){
      for(let i=0;i<n;i++){
        const band=bands[i<3?0:i<7?1:2];
        let c=null;
        for(let k=0;k<12&&!c;k++)c=spot(band[0],band[1],i*0.62+k*0.51+kind.length);
        if(!c)for(let k=0;k<8&&!c;k++)c=spot(90,500,i*1.3+k);
        if(!c)continue;
        const u={id:kind+i,kind,title,state:'post',hold:rnd(40,90),fined:-1e9,hinted:0,wave:0,flash:0,ph:Math.random()*6};
        park(u,c);u.hold=rnd(50,140);
        units.push(u);
      }
    }
    addKind('gai','Пост ДПС',10);
    addKind('pps','ППС',10);
    addKind('cam','Камера',2);
    addKind('rg','Росгвардия',2);
    booted=units.length?1:0;
    if(booted)addEvent('По городу дежурят 10 постов ДПС и 10 патрулей ППС. Камеры и Росгвардия тоже на улицах. Посты переезжают.');
  }
  let toldAt=0;
  function note(text,x,y){
    if(dist(x,y,player.x,player.y)>340)return;
    const now=performance.now();
    if(now-toldAt<9000)return;
    toldAt=now;addEvent(text);
  }
  function beginMove(u){
    if(dist(u.x,u.y,player.x,player.y)>1500){
      const c=spot(160,720,u.ph+hour());
      if(c){park(u,c);return;}
    }
    const route=hopPath(u.x,u.y,u.ph+hour());
    if(!route){
      const c=spot(120,520,u.ph+3);
      if(c){park(u,c);note(u.title+' теперь на '+(c.road||'другой улице')+'.',c.x,c.y);}
      else u.hold=20;
      return;
    }
    u.state='move';u.route=route;u.s=8;u.hx=1;u.hy=0;u.wx=null;u.wy=null;
  }
  function finishMove(u){
    const c=curbAt(u.x,u.y)||spot(80,240,u.ph);
    if(!c){u.hold=15;u.state='post';u.route=null;return;}
    park(u,c);
    if(dist(u.x,u.y,player.x,player.y)<320){
      const where=u.road||'улице';
      if(u.kind==='gai')note('Пост ДПС переехал: теперь на '+where+'.',u.x,u.y);
      else if(u.kind==='cam')note('Камера переехала на '+where+'. Лимит '+u.lim+'.',u.x,u.y);
      else if(u.kind==='pps')note('Патруль ППС вышел на '+where+'.',u.x,u.y);
      else note('Росгвардия дежурит на '+where+'.',u.x,u.y);
    }
  }
  function kmh(){return player.vehicle?Math.abs(player.vehicle.speed||0)*3.6:0;}
  function fineCam(u){
    const v=player.vehicle;if(!v||player.inside||scene!=='city')return;
    if(typeof isLightVehicle==='function'&&isLightVehicle(v.kind))return;
    if(v.kind==='taxi')return;
    const d=dist(player.x,player.y,u.x,u.y);
    const now=typeof sitNow==='function'?sitNow():performance.now()/1000;
    if(d>16||now-u.fined<28)return;
    const speed=kmh();
    if(d<22&&!u.hinted){u.hinted=1;setHint((u.kind==='cam'?'Камера':'Пост ДПС')+' · лимит '+u.lim+' км/ч');}
    if(speed<=u.lim+12)return;
    u.fined=now;u.flash=1;u.wave=3;u.stop=u.kind==='gai'?2.4:0.4;
    if(typeof camFlash!=='undefined')camFlash=1;
    const over=speed-u.lim,fine=over>40?1500:500;
    v.cortegeBrake=u.kind==='gai'?2:1;
    const road=u.road||'улица';
    if(u.kind==='gai'&&typeof startSit==='function'&&SIT.defs.gaipost){
      startSit('gaipost',{kmh:Math.round(speed),lim:u.lim,road,fine,car:v.kind});
    }else if(typeof startSit==='function'){
      startSit('camfine',{kmh:Math.round(speed),lim:u.lim,road,fine,car:v.kind});
    }
  }
  function step(u,dt){
    if(u.stop>0){u.stop-=dt;if(player.vehicle)player.vehicle.cortegeBrake=u.kind==='gai'?2:1;}
    if(u.wave>0)u.wave-=dt;
    if(u.flash>0)u.flash-=dt;
    if(u.state==='move'&&u.route){
      u.s+= (u.kind==='pps'?2.2:7.2)*dt;
      const p=pointAt(u.route,u.s);
      if(p){u.x=p.x;u.y=p.y;u.hx=p.hx;u.hy=p.hy;}
      if(u.s>=u.route.len-2)finishMove(u);
      return;
    }
    u.hold-=dt;
    if(u.hold<=0){beginMove(u);return;}
    if(u.kind==='pps'||u.kind==='rg'){
      u.ph+=dt*(u.kind==='pps'?0.55:0.22);
      const t=(Math.sin(u.ph)+1)/2, span=u.kind==='pps'?16:6;
      u.wx=u.x+(u.hx||1)* (t-0.5)*span;
      u.wy=u.y+(u.hy||0)* (t-0.5)*span;
    }
    if((u.kind==='gai'||u.kind==='cam')&&u.state==='post')fineCam(u);
  }
  function updatePatrols(dt){
    if(typeof player==='undefined'||!world)return;
    if(!booted){cool-=dt;if(cool<=0){boot();cool=3;}return;}
    if(scene!=='city')return;
    for(const u of units){try{step(u,dt);}catch(e){}}
    // далеко уехавшие посты не висят в другом конце города: на следующем переезде их и так переставят, а если игрок ушёл на километр — переставить сейчас
    for(const u of units){
      if(u.state!=='post')continue;
      if(dist(u.x,u.y,player.x,player.y)>1500)u.hold=Math.min(u.hold,4);
    }
  }
  function people(u){
    const hx=u.hx||1,hy=u.hy||0,nx=u.nx||-hy,ny=u.ny||hx;
    if(u.kind==='gai')return [{x:u.x+nx*1.3,y:u.y+ny*1.3,hx,hy,look:LOOK.gai}];
    if(u.kind==='pps'){
      const x=u.wx!=null?u.wx:u.x,y=u.wy!=null?u.wy:u.y;
      return [{x,y,hx,hy,look:LOOK.pps},{x:x+nx*1.1,y:y+ny*1.1,hx,hy,look:LOOK.pps}];
    }
    if(u.kind==='rg'){
      const x=u.wx!=null?u.wx:u.x,y=u.wy!=null?u.wy:u.y;
      return [{x:x-hx*2.2+nx*0.8,y:y-hy*2.2+ny*0.8,hx,hy,look:LOOK.rg},{x:x-hx*2.2-nx*0.8,y:y-hy*2.2-ny*0.8,hx,hy,look:LOOK.rg}];
    }
    return [];
  }
  function drawPatrols(){
    if(!booted||scene!=='city'||typeof ctx==='undefined')return;
    const z=cam.z||4;
    ctx.save();
    ctx.setTransform(DPR*z,0,0,DPR*z,DPR*(W/2-cam.x*z),DPR*(H/2-cam.y*z));
    const t=performance.now()/1000;
    for(const u of units){
      if(Math.abs(u.x-cam.x)>W/z+30||Math.abs(u.y-cam.y)>H/z+30)continue;
      if(u.kind==='gai'||u.kind==='rg'){
        const col=u.kind==='rg'?'#1E2433':'#F4F6F8';
        const len=u.kind==='rg'?5.4:4.6;
        if(typeof drawCarSprite==='function')drawCarSprite(u.x,u.y,u.hx||1,u.hy||0,len,u.kind==='rg'?2.15:1.9,col,u.kind==='gai'?'police':'car',t,{flash:u.kind==='gai'&&u.wave>0,roll:u.state==='move'?7:0});
        if(u.kind==='gai'&&u.state==='post'){
          ctx.fillStyle='#F28C28';
          for(const s of [-1,1]){ctx.beginPath();ctx.moveTo(u.x+(u.hx||1)*6*s,u.y+(u.hy||0)*6*s);ctx.lineTo(u.x+(u.hx||1)*6*s+(u.nx||0)*0.7,u.y+(u.hy||0)*6*s+(u.ny||0)*0.7);ctx.lineTo(u.x+(u.hx||1)*7.2*s,u.y+(u.hy||0)*7.2*s);ctx.fill();}
        }
      }
      if(u.kind==='cam'){
        ctx.save();ctx.translate(u.x,u.y);
        ctx.fillStyle='#E6B325';ctx.fillRect(-0.28,-2.6,0.56,2.6);
        ctx.fillStyle='#F7F3EA';ctx.fillRect(-1.05,-2.85,2.1,0.85);
        ctx.fillStyle=u.flash>0?'#fff':'#E23B3B';ctx.beginPath();ctx.arc(0.35,-2.42,0.28,0,TAU);ctx.fill();
        ctx.restore();
      }
      if(typeof drawPerson==='function'){
        for(const p of people(u))drawPerson(p.x,p.y,p.hx,p.hy,p.look,u.ph||0,{moving:u.kind==='pps'||u.state==='move',scale:1.15});
      }
    }
    ctx.restore();
    ctx.save();
    ctx.font='700 11px "IBM Plex Sans",system-ui';ctx.textAlign='center';
    for(const u of units){
      const sx=(u.x-cam.x)*z+W/2,sy=(u.y-cam.y)*z+H/2;
      if(sx<-40||sx>W+40||sy<-40||sy>H+40||z<2.2)continue;
      const label=u.state==='move'?(u.title+' едет'):(u.kind==='cam'?('Камера '+u.lim):u.title);
      const w=ctx.measureText(label).width+12;
      ctx.fillStyle='rgba(16,22,28,.88)';ctx.fillRect(sx-w/2,sy-26,w,16);
      ctx.fillStyle=u.kind==='rg'?'#D5D8E0':u.kind==='cam'?'#F2D56B':'#E7F0FF';
      ctx.fillText(label,sx,sy-14);
      if(u.wave>0&&u.kind==='gai'){ctx.fillStyle='#fff';ctx.fillText('Снизьте скорость',sx,sy-40);}
    }
    ctx.restore();
  }
  function nearestUnit(rad){
    let best=null,bd=rad;
    for(const u of units){const d=dist(u.x,u.y,player.x,player.y);if(d<bd){bd=d;best=u;}}
    return best?{u:best,d:bd}:null;
  }
  function talk(u){
    if(u.kind==='gai'){setHint('Пост ДПС. Лимит '+u.lim+' км/ч. Едете спокойно — вас не останавливают.');addEvent('Инспектор: «Пост на '+(u.road||'улице')+'. Лимит '+u.lim+'. Не гоните.»');return;}
    if(u.kind==='cam'){setHint('Камера фиксирует скорость. Лимит '+u.lim+' км/ч. Штраф приходит, если быстрее.');addEvent('Камера на '+(u.road||'улице')+': лимит '+u.lim+' км/ч.');return;}
    if(u.kind==='pps'){setHint('Патруль ППС дежурит по улице.');addEvent('ППС: «Дежурим по району. Если что случилось — скажите, мы на месте.»');return;}
    setHint('Росгвардия дежурит. Проходите.');addEvent('Росгвардия: «Дежурство. Площадь и улица под присмотром. Проходите спокойно.»');
  }
  function patrolAction(){
    if(!booted||scene!=='city'||player.inside||player.busy)return null;
    const hit=nearestUnit(player.vehicle?16:8);
    if(!hit)return null;
    const label=hit.u.kind==='cam'?('Камера · '+hit.u.lim):hit.u.title;
    return {d:hit.d,label,run:()=>talk(hit.u)};
  }
  if(typeof defSit==='function'){
    defSit('gaipost',{title:'Пост ДПС',quiet:true,multi:true,
      start(s){s.d=1.2;return true;},
      update(s,dt){if(s.d!=null){s.d-=dt;if(s.d>0)return;s.d=null;const half=Math.round(s.fine/2);
        sitCard({s,icon:'🚔',tone:'alert',title:'Пост ДПС',text:'Инспектор на '+(s.road||'улице')+': '+s.kmh+' км/ч при знаке '+s.lim+'. Штраф '+fmtMoney(s.fine)+'. Если оплатить сразу — скидка, как с камеры. Это городская игра, не настоящий протокол.',ttl:0,
          choices:[
            {t:'Оплатить со скидкой · '+fmtMoney(half),primary:true,run:()=>{sitMoney(-half,'Штраф поста ДПС (со скидкой)');if(typeof phoneNote==='function')phoneNote('Госуслуги','Пост ДПС: штраф со скидкой '+fmtMoney(half),'fine');endSit(s);}},
            {t:'Потом',run:()=>{s.late=rnd(40,70);}}
          ]});}
        if(s.late!=null){s.late-=dt;if(s.late<=0){sitMoney(-s.fine,'Штраф поста ДПС списали без скидки');endSit(s);}}}
    });
  }
  function mount(){
    if(typeof updateCityBits==='function'&&!updateCityBits._patrol){
      const prev=updateCityBits;
      function wrapped(dt){prev(dt);try{updatePatrols(dt);}catch(e){}}
      wrapped._patrol=1;wrapped._cortege=updateCityBits._cortege;updateCityBits=wrapped;window.updateCityBits=wrapped;
    }
    if(typeof drawCityBits==='function'&&!drawCityBits._patrol){
      const prev=drawCityBits;
      function wrapped(toS,z){prev(toS,z);try{drawPatrols();}catch(e){}}
      wrapped._patrol=1;drawCityBits=wrapped;window.drawCityBits=wrapped;
    }
    if(typeof findAction==='function'&&!findAction._patrol){
      const prev=findAction;
      function wrapped(){const mine=patrolAction();const a=prev();if(mine&&(!a||mine.d<=(a.d==null?99:a.d)))return mine;return a||mine;}
      wrapped._patrol=1;findAction=wrapped;
    }
  }
  window.zkPatrolState=function(){return units.map(u=>({id:u.id,kind:u.kind,state:u.state,road:u.road,x:Math.round(u.x),y:Math.round(u.y)}));};
  mount();
  setTimeout(mount,700);
})();
