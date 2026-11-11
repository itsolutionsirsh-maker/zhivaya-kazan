// Кортежи начальства: утром в центр, вечером обратно. Мульт, не настоящий маршрут и не живые люди.
(function(){
  const ROLES=[
    {id:'mayor',title:'Мэр',gen:'мэра',dest:'kremlin'},
    {id:'rais',title:'Раис',gen:'раиса',dest:'kremlin'},
    {id:'pros',title:'Прокурор',gen:'прокурора',dest:'pros'},
    {id:'sovet',title:'Председатель Госсовета',gen:'председателя Госсовета',dest:'square'}
  ];
  const LINES=['Не мешайтесь!','Сойдите на тротуар!','Дорога перекрыта!','Сирена орёт — это вам.'];
  const SLOTS=[
    {id:'am',a:8,b:9.5,dir:'in'},
    {id:'pm',a:15,b:16.75,dir:'in'},
    {id:'ev',a:18,b:19.5,dir:'out'},
    {id:'late',a:20,b:20.75,dir:'out'}
  ];
  const GAP=11;
  let run=null,seen={},seenDay=-1,cool=1.2,barkT=0,nudgeT=0,nearTold=0;

  function hour(){return typeof cityHour==='function'?cityHour():12;}
  function day(){return (typeof clock!=='undefined'&&clock.day)||0;}
  function ensureDay(){const d=day();if(seenDay!==d){seen={};seenDay=d;}}

  function destXY(kind){
    if(kind==='kremlin'&&world.kremlin)return [world.kremlin.x,world.kremlin.y];
    if(kind==='square')return [701.3,-451.7];
    if(typeof llToXY==='function'){const p=llToXY([55.78902,49.12039]);if(p&&isFinite(p[0]))return [p[0],p[1]];}
    return [player.x+80,player.y-40];
  }

  let lastDest=[0,0],runWant='kremlin';

  function hop(from,tx,ty,n){
    const seq=[from]; let prev=-1, cur=from;
    for(let i=0;i<n;i++){
      const p=world.nodes[cur]; let best=-1, bs=-1e9;
      for(const e of adjList(world.carAdj,cur)){
        const v=e[0]; if(v===prev)continue;
        const q=world.nodes[v];
        const dx=q[0]-p[0],dy=q[1]-p[1],L=Math.hypot(dx,dy)||1;
        const score=dx/L*(tx-p[0])+dy/L*(ty-p[1]);
        if(score>bs){bs=score;best=v;}
      }
      if(best<0||bs<12)break;
      prev=cur; cur=best; seq.push(cur);
    }
    return seq;
  }
  function routeByWalk(spin,dir){
    if(!world||!world.carAdj||typeof nearestNode!=='function'||typeof adjList!=='function')return null;
    const mid=nearestNode(player.x,player.y,world.carAdj,180);
    if(mid<0)return null;
    let dx=lastDest[0]-player.x,dy=lastDest[1]-player.y,L=Math.hypot(dx,dy);
    if(L<40){const a=0.8+spin*1.2;dx=Math.cos(a);dy=Math.sin(a);L=1;}
    const j=(spin-2)*0.85, ux=(dx/L)*Math.cos(j)-(dy/L)*Math.sin(j), uy=(dx/L)*Math.sin(j)+(dy/L)*Math.cos(j);
    const back=hop(mid,player.x-ux*2000,player.y-uy*2000,16);
    const fore=hop(mid,player.x+ux*2000,player.y+uy*2000,12);
    if(back.length+fore.length<6)return null;
    const path=dir==='out'?fore.reverse().concat(back.slice(1)):back.reverse().concat(fore.slice(1));
    const wps=pathToWaypoints(path,world.carAdj,'car');
    if(!wps||wps.length<2)return null;
    const pts=[];
    for(const p of wps){const last=pts[pts.length-1];if(!last||Math.hypot(last[0]-p[0],last[1]-p[1])>2.2)pts.push([p[0],p[1]]);}
    if(pts.length<2)return null;
    const opp=[];
    for(let i=0;i<pts.length;i++){
      const a0=pts[Math.max(0,i-1)],b0=pts[Math.min(pts.length-1,i+1)];
      let dx=b0[0]-a0[0],dy=b0[1]-a0[1],L=Math.hypot(dx,dy)||1;dx/=L;dy/=L;
      const ns=nearestRoadSeg(pts[i][0],pts[i][1],24);
      const hw=ns&&ns.seg&&ns.seg.r?ns.seg.r.hw:3.2;
      const off=Math.max(1.2,hw*0.5);
      let x=pts[i][0]+dy*off*2,y=pts[i][1]-dx*off*2;
      if(typeof inBuilding==='function'&&inBuilding(x,y)){x=pts[i][0];y=pts[i][1];}
      const prev=opp[opp.length-1];
      if(!prev||Math.hypot(prev[0]-x,prev[1]-y)>1.4)opp.push([x,y]);
    }
    if(opp.length<2)return null;
    let len=0;const cum=[0];
    for(let i=1;i<opp.length;i++){len+=Math.hypot(opp[i][0]-opp[i-1][0],opp[i][1]-opp[i-1][1]);cum.push(len);}
    if(len<140||len>1600)return null;
    return {pts:opp,cum,len};
  }

  function nearS(route){
    let best=40,bd=1e9;
    for(let s=8;s<route.len;s+=10){
      const p=pointAt(route,s);if(!p)continue;
      const d=Math.hypot(p.x-player.x,p.y-player.y);
      if(d<bd){bd=d;best=s;}
    }
    return {s:best,d:bd};
  }

  function pointAt(route,s){
    if(s<1||s>route.len-0.4)return null;
    let i=0;const c=route.cum;
    while(i<c.length-2&&c[i+1]<s)i++;
    const seg=(c[i+1]-c[i])||1,t=(s-c[i])/seg;
    const a=route.pts[i],b=route.pts[Math.min(route.pts.length-1,i+1)];
    const dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy)||1;
    return {x:a[0]+dx*t,y:a[1]+dy*t,hx:dx/L,hy:dy/L};
  }

  const SPEC=[
    {kind:'police',L:4.6,W:1.9,color:'#F4F6F8'},
    {kind:'vip',L:5.5,W:2.05,color:'#141414'},
    {kind:'police',L:4.6,W:1.9,color:'#F7F7F5'},
    {kind:'vip',L:5.1,W:2.0,color:'#1c1c1c'}
  ];
  function placeCars(){
    if(!run)return [];
    const out=[];
    for(let i=0;i<SPEC.length;i++){
      const p=pointAt(run.route,run.s-GAP*i);
      if(!p)continue;
      out.push({x:p.x,y:p.y,hx:p.hx,hy:p.hy,i,kind:SPEC[i].kind,L:SPEC[i].L,W:SPEC[i].W,color:SPEC[i].color});
    }
    run.cars=out;
    return out;
  }

  function startOne(slot,role,spin){
    runWant=role.dest;lastDest=destXY(role.dest);
    const route=routeByWalk(spin,slot.dir);
    if(!route)return false;
    const hit=nearS(route);
    if(hit.d>110)return false;
    run={role,slot:slot.id,dir:slot.dir,route,s:Math.max(GAP*3+6,hit.s-75),t:0,speed:7.4,bark:'',barkTtl:0,cars:[]};
    placeCars();
    nearTold=0;barkT=1.2;
    addEvent((slot.dir==='in'?'В центр едет кортеж ':'Из центра едет кортеж ')+role.gen+'. ГАИ впереди, едут по встречке.');
    return true;
  }

  function pickNext(){
    ensureDay();
    const h=hour();
    const slot=SLOTS.find(s=>h>=s.a&&h<s.b);
    if(!slot||player.inside||scene!=='city')return;
    for(const role of ROLES){
      const k=seenDay+':'+slot.id+':'+role.id;
      if(seen[k])continue;
      for(let n=0;n<5;n++){if(startOne(slot,role,n)){seen[k]=1;return;}}
    }
  }

  function nearestCar(x,y,rad){
    if(!run||!run.cars)return null;
    let best=null,bd=rad;
    for(const c of run.cars){const d=dist(c.x,c.y,x,y);if(d<bd){bd=d;best=c;}}
    return best;
  }

  function updateCortege(dt){
    if(typeof player==='undefined'||!world)return;
    if(player.vehicle)player.vehicle.cortegeBrake=0;
    if(!run){
      if(scene!=='city'||player.inside)return;
      cool-=dt;if(cool<=0){pickNext();cool=run?0:6;}
      return;
    }
    run.t+=dt;run.s+=run.speed*dt;
    const convoy=placeCars();
    const tail=run.s-GAP*(SPEC.length-1);
    if(tail>run.route.len+6||run.t>160){
      addEvent('Кортеж проехал. Улица снова дышит.');
      run=null;cool=25;return;
    }
    if(!convoy.length||scene!=='city'||player.inside)return;
    let close=1e9;
    const vip=convoy.find(c=>c.kind==='vip')||convoy[0];
    for(const c of convoy)close=Math.min(close,dist(c.x,c.y,player.x,player.y));
    if(close<85&&!nearTold){
      nearTold=1;
      setHint(player.vehicle?'Кортеж: '+run.role.title+'. Такси притормозит и пропустит, само не выходите.':'Кортеж: '+run.role.title+'. Дорога перекрыта — на тротуар.');
      addEvent('Сирена. ГАИ кричит сойти на тротуар. '+run.role.title+' едет по встречке и смотрит в никуда.');
    }
    barkT-=dt;
    if(close<60&&barkT<=0){
      barkT=4.4;
      run.bark=LINES[Math.floor(run.t)%LINES.length];
      run.barkTtl=2.5;
    }
    if(run.barkTtl>0)run.barkTtl-=dt;
    const light=player.vehicle&&typeof isLightVehicle==='function'&&isLightVehicle(player.vehicle.kind);
    if(player.vehicle&&!light){
      if(close<7){
        player.vehicle.holdT=(player.vehicle.holdT||0)+dt;
        if(player.vehicle.kind==='taxi'&&player.vehicle.holdT>4){run.speed=Math.max(run.speed,13);player.vehicle.cortegeBrake=0;setHint('Кортеж проехал. Такси едет дальше.');}
        else{player.vehicle.cortegeBrake=2;player.vehicle.speed=0;setHint('Кортеж рядом. Несколько секунд стоим, потом едем.');}
      }
      else{if(close>=18)player.vehicle.holdT=0;if(close<18)player.vehicle.cortegeBrake=1;}
    }
    if(typeof cars!=='undefined'){
      for(const c of cars){
        if(!c||c.crashed||c.kind==='amb')continue;
        let hit=false;
        for(const k of convoy){if(dist(c.x,c.y,k.x,k.y)<26){hit=true;break;}}
        if(hit&&c.speed>1)c.speed=1;
      }
    }
    nudgeT-=dt;
    if(nudgeT<=0){
      nudgeT=0.55;
      const shove=(x,y)=>{
        if(typeof nearestRoadSeg!=='function'||typeof toSidewalk!=='function')return null;
        const ns=nearestRoadSeg(x,y,16);
        if(!ns||ns.d>ns.seg.r.hw+0.35)return null;
        return toSidewalk(x,y);
      };
      if(!player.vehicle&&!player.bus&&player.state!=='hurt'&&close<11){
        const p=shove(player.x,player.y);
        if(p){player.x=p[0];player.y=p[1];setHint('ГАИ машет на тротуар. Вас чуть подвинули — вы целы.');}
      }
      if(typeof walkers!=='undefined'){
        for(const w of walkers){
          if(!w||w.bus||w.state==='hurt'||w.inside)continue;
          if(dist(w.x,w.y,vip.x,vip.y)>18&&dist(w.x,w.y,convoy[0].x,convoy[0].y)>18)continue;
          const p=shove(w.x,w.y);
          if(!p)continue;
          w.x=p[0];w.y=p[1];w.path=null;
          if(typeof say==='function'&&Math.random()<0.4)say(w,'Отойду, отойду',2.2);
        }
      }
    }
  }

  function drawCortege(toS,z){
    if(!run||!run.cars||!run.cars.length||scene!=='city'||typeof drawCarSprite!=='function')return;
    const t=(typeof cityAnimT==='number'?cityAnimT:run.t);
    ctx.save();
    ctx.setTransform(DPR*z,0,0,DPR*z,DPR*(W/2-cam.x*z),DPR*(H/2-cam.y*z));
    for(const c of run.cars){
      drawCarSprite(c.x,c.y,c.hx,c.hy,c.L,c.W,c.color,c.kind==='police'?'police':'car',t,{flash:c.kind==='police',roll:run.speed});
      if(c.i===1){
        ctx.save();ctx.translate(c.x,c.y);ctx.rotate(Math.atan2(c.hy,c.hx));
        ctx.fillStyle='#E8C25A';ctx.beginPath();ctx.moveTo(-0.15,-c.W*0.15);ctx.lineTo(1.05,-c.W*0.72);ctx.lineTo(0.15,-c.W*0.05);ctx.closePath();ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
    const lead=run.cars[0];
    const [sx,sy]=toS(lead.x,lead.y);
    if(z>1.6&&sx>-80&&sx<W+80&&sy>-80&&sy<H+80){
      ctx.save();ctx.font='600 12px "IBM Plex Sans",system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
      const label='Кортеж · '+run.role.title;
      const tw=ctx.measureText(label).width+16;
      ctx.fillStyle='rgba(28,22,16,.88)';rrect(ctx,sx-tw/2,sy-34,tw,18,8);ctx.fill();
      ctx.fillStyle='#F6E7C1';ctx.fillText(label,sx,sy-25);
      if(run.bark&&run.barkTtl>0){
        ctx.font='600 13px "IBM Plex Sans",system-ui';
        const bw=ctx.measureText(run.bark).width+16;
        ctx.fillStyle='#fffaf2';rrect(ctx,sx-bw/2,sy-58,bw,20,8);ctx.fill();
        ctx.fillStyle='#1a120c';ctx.fillText(run.bark,sx,sy-48);
      }
      ctx.restore();
    }
  }

  function openBoss(){
    const title=run?run.role.title:'Чиновник';
    if(typeof openHallCard!=='function'){setHint(title+' сидит в машине и смотрит в никуда.');return;}
    openHallCard({
      title:'Кортеж · '+title,
      photo:'img/cortege/boss.jpg',
      clip:'img/cortege/boss.mp4',
      text:'Сидит и смотрит в никуда. Снаружи сирена, встречка и все стоят. Ему всё равно. Это рисунок, не камера и не живой человек.'
    });
  }

  function cortegeAction(){
    if(!run||scene!=='city'||player.inside||player.busy)return null;
    const hit=nearestCar(player.x,player.y,14);
    if(!hit)return null;
    return {d:dist(hit.x,hit.y,player.x,player.y),label:'Кортеж '+run.role.gen,run:openBoss};
  }

  function bindClick(){
    if(typeof canvas==='undefined'||canvas._cortege)return;
    canvas._cortege=1;
    let down=null;
    canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};},true);
    canvas.addEventListener('pointerup',e=>{
      if(!down)return;
      const moved=Math.hypot(e.clientX-down.x,e.clientY-down.y);down=null;
      if(moved>8||!run||scene!=='city'||player.inside||player.busy)return;
      const wx=cam.x+(e.clientX-innerWidth/2)/cam.z,wy=cam.y+(e.clientY-innerHeight/2)/cam.z;
      if(!nearestCar(wx,wy,Math.max(12,48/cam.z)))return;
      e.stopPropagation();e.preventDefault();
      openBoss();
    },true);
  }

  function mount(){
    bindClick();
    if(typeof updateCityBits==='function'&&!updateCityBits._cortege){
      const prev=updateCityBits;
      function wrapped(dt){prev(dt);try{updateCortege(dt);}catch(err){}}
      wrapped._cortege=1;updateCityBits=wrapped;window.updateCityBits=wrapped;
    }
    if(typeof drawCityBits==='function'&&!drawCityBits._cortege){
      const prev=drawCityBits;
      function wrapped(toS,z){prev(toS,z);try{drawCortege(toS,z);}catch(err){}}
      wrapped._cortege=1;drawCityBits=wrapped;window.drawCityBits=wrapped;
    }
    if(typeof findAction==='function'&&!findAction._cortege){
      const prev=findAction;
      function wrapped(){const mine=cortegeAction();const a=prev();if(mine&&(!a||mine.d<=(a.d==null?99:a.d)))return mine;return a||mine;}
      wrapped._cortege=1;findAction=wrapped;
    }
  }
  window.zkCortegeState=function(){
    if(!run||!run.cars||!run.cars.length)return null;
    const c=run.cars.find(x=>x.i===1)||run.cars[0];
    return {title:run.role.title,n:run.cars.length,x:+c.x.toFixed(1),y:+c.y.toFixed(1),s:Math.round(run.s),len:Math.round(run.route.len)};
  };
  window.zkCortegeForce=function(id){
    const role=ROLES.find(r=>r.id===id)||ROLES[0];
    const slot={id:'pm',a:15,b:16.75,dir:'in'};
    run=null;
    for(let n=0;n<5;n++)if(startOne(slot,role,n))return true;
    return false;
  };
  mount();
  setTimeout(mount,900);
})();
