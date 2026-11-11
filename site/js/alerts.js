// Временная воздушная тревога: беспилотники, потом розовые фламинго вместо ракет. ПВО берёт только часть, в воздухе.
const RAID={on:false,t:0,phase:'off',craft:[],shots:[],puffs:[],bats:[],down:0,downDrone:0,downBird:0,pass:0,seq:0};
function raidNormPhase(t){if(t<2.4)return 'siren';if(t<32)return 'drone';if(t<58)return 'bird';if(t<66)return 'clear';return 'off';}
function raidBanner(title,sub){
  let box=document.getElementById('raidBanner');
  if(!box){
    box=document.createElement('div');box.id='raidBanner';
    box.innerHTML='<b id="raidTitle"></b><span id="raidSub"></span><i id="raidCount"></i>';
    document.body.append(box);
  }
  const h=document.getElementById('raidTitle');if(h&&h.textContent!==title)h.textContent=title;
  const s=document.getElementById('raidSub');if(s&&s.textContent!==sub)s.textContent=sub;
  box.hidden=false;box.classList.toggle('allclear',RAID.phase==='clear');
}
function raidHideBanner(){const box=document.getElementById('raidBanner');if(box)box.hidden=true;}
function raidTally(){
  const el=document.getElementById('raidCount');if(!el||!RAID.on)return;
  const sky=RAID.craft.filter(c=>c.state==='fly').length;
  const want=typeof raidWant==='function'?raidWant():{drone:true,missile:true};
  const bits=[];
  if(want.drone)bits.push('беспилотники сбито '+RAID.downDrone);
  if(want.missile)bits.push('фламинго сбито '+RAID.downBird);
  bits.push('в небе '+sky);
  const txt=bits.join(' · ');
  if(el.textContent!==txt)el.textContent=txt;
}
function raidApplyPhase(next){
  if(next===RAID.phase)return;
  const prev=RAID.phase;RAID.phase=next;
  if(next==='siren'){raidBanner('ВОЗДУШНАЯ ТРЕВОГА','Сирена над Казанью. Сейчас в небе появятся беспилотники.');addEvent('Воздушная тревога.','alert');}
  else if(next==='drone'){raidBanner('БЕСПИЛОТНАЯ ОПАСНОСТЬ','Беспилотники над городом. ПВО берёт только часть.');if(prev!=='drone')raidSeed('drone',5);}
  else if(next==='bird'){
    for(const c of RAID.craft) if(c.state==='fly')RAID.pass++;
    RAID.craft=RAID.craft.filter(c=>c.state==='hit');
    raidBanner('РАКЕТНАЯ ОПАСНОСТЬ','Вместо ракет — розовые фламинго. ПВО встречает и их.');
    addEvent('Ракетная опасность: в небе розовые фламинго.','alert');
    raidSeed('flamingo',5);
  }else if(next==='clear'){raidBanner('ОТБОЙ ТРЕВОГИ','Небо над Казанью снова спокойное.');addEvent('Отбой воздушной тревоги.','alert');}
  else {raidHideBanner();RAID.on=false;RAID.craft=[];RAID.shots=[];RAID.puffs=[];const btn=document.getElementById('raidBtn');if(btn)btn.classList.remove('danger');}
}
function raidSpawn(kind,lane,spread){
  lane=lane==null?RAID.seq++:lane;
  const y=72+(lane%2)*36;
  const speed=kind==='flamingo'?46:54;
  const fromLeft=lane%2===0;
  const x=fromLeft?-80:W+80;
  return {kind,x,y,baseY:y,vx:(fromLeft?1:-1)*speed,vy:0,state:'fly',fall:0,spin:Math.random()<0.5?-1:1,flap:lane*1.3,size:kind==='flamingo'?0.72:0.62,style:'wing',lucky:false,wobble:lane};
}
function raidSeed(kind,n){for(let i=0;i<n;i++)RAID.craft.push(raidSpawn(kind,i,true));}
function raidStart(){}
function raidDropButton(){const b=document.getElementById('raidBtn');if(b)b.remove();}
function raidSyncBats(){
  if(!RAID.bats.length)RAID.bats.push({cool:2.4,aim:-Math.PI/2});
  RAID.bats.length=1;
  RAID.bats[0].x=W*0.5;RAID.bats[0].y=Math.min(H*0.72,H-120);
}
function raidShoot(dt){
  raidSyncBats();
  const live=RAID.craft.filter(c=>c.state==='fly'&&c.x>20&&c.x<W-20&&c.y>24&&c.y<H*0.5);
  for(const b of RAID.bats){
    b.cool-=dt;
    let tgt=null,bd=1e9;
    for(const c of live){const d=Math.hypot(c.x-b.x,c.y-b.y);if(d<bd){bd=d;tgt=c;}}
    if(tgt)b.aim=Math.atan2(tgt.y-b.y,tgt.x-b.x);
    else b.aim=b.aim*0.9+(-Math.PI/2)*0.1;
    if(!tgt||b.cool>0)continue;
    b.cool=7+Math.random()*4;
    const hit=Math.random()<0.7;
    const muzzle=18;
    RAID.shots.push({x0:b.x+Math.cos(b.aim)*muzzle,y0:b.y+Math.sin(b.aim)*muzzle,x1:tgt.x,y1:tgt.y,t:0,dur:0.9,tgt,hit,resolved:false});
  }
}
function raidPuff(x,y,kind){
  const bits=[];
  const n=kind==='flamingo'?9:6;
  for(let i=0;i<n;i++){
    const a=Math.random()*6.28,sp=12+Math.random()*28;
    bits.push({x:Math.cos(a)*sp,y:Math.sin(a)*sp*0.65,r:Math.random()*3,c:kind==='flamingo'?['#ff8eab','#ffd0dc','#f4a3b8','#fff'][i%4]:'#9aa3ab'});
  }
  RAID.puffs.push({x,y,kind,life:0,max:kind==='miss'?0.55:2.1,bits});
}
function raidWant(){
  const list=(typeof RW!=='undefined'&&RW.snap&&RW.snap.alerts)||[];
  let drone=false,missile=false;const titles=[];
  for(const a of list){
    const k=String(a.kind||''),ti=String(a.title||'');
    if(k==='drone'||/беспилот/i.test(ti)){drone=true;if(ti&&titles.indexOf(ti)<0)titles.push(ti);}
    else if(k==='missile'||/ракет/i.test(ti)){missile=true;if(ti&&titles.indexOf(ti)<0)titles.push(ti);}
  }
  return {drone,missile,on:drone||missile,title:titles.join(' · ')};
}
function raidStop(){RAID.on=false;RAID.phase='off';RAID.craft=[];RAID.shots=[];RAID.puffs=[];raidHideBanner();}
function raidTick(dt){
  const want=raidWant();
  if(!want.on){if(RAID.on)raidStop();return;}
  if(typeof scene!=='undefined'&&scene!=='city')return;
  if(!RAID.on){
    RAID.on=true;RAID.t=0;RAID.phase='live';RAID.craft=[];RAID.shots=[];RAID.puffs=[];
    RAID.down=0;RAID.downDrone=0;RAID.downBird=0;RAID.pass=0;RAID.seq=0;RAID.bats=[];RAID.acc={};
    if(want.drone)raidSeed('drone',1);
    if(want.missile)raidSeed('flamingo',1);
  }
  RAID.t+=dt;
  if(want.drone&&!RAID.craft.some(c=>c.kind==='drone'&&c.state==='fly'))raidSeed('drone',1);
  if(want.missile&&!RAID.craft.some(c=>c.kind==='flamingo'&&c.state==='fly'))raidSeed('flamingo',1);
  if(!want.drone)RAID.craft=RAID.craft.filter(c=>c.kind!=='drone'||c.state==='hit');
  if(!want.missile)RAID.craft=RAID.craft.filter(c=>c.kind!=='flamingo'||c.state==='hit');
  RAID.acc=RAID.acc||{};
  const keep=(kind,every,cap)=>{
    RAID.acc[kind]=(RAID.acc[kind]||0)+dt;
    const flying=RAID.craft.filter(c=>c.kind===kind&&c.state==='fly').length;
    if(RAID.acc[kind]>every&&flying<cap){RAID.acc[kind]=0;RAID.craft.push(raidSpawn(kind));}
  };
  if(want.drone)keep('drone',16,2);
  if(want.missile)keep('flamingo',22,1);
  if(RAID.craft.some(c=>c.state==='fly'))raidShoot(dt);
  const sky=0.55+0.45*Math.sin(RAID.t*1.3);
  for(const c of RAID.craft){
    if(c.state==='fly'){
      c.x+=c.vx*dt;
      c.baseY+=Math.sin(RAID.t*0.7+c.wobble)*dt*4;
      c.y=c.baseY+Math.sin(RAID.t*2.1+c.flap)*10*sky;
      if((c.vx>0&&c.x>W+120)||(c.vx<0&&c.x<-120)){c.state='gone';RAID.pass++;}
    }else if(c.state==='hit'){
      c.fall+=dt;c.y+=72*dt;c.x+=c.vx*0.22*dt;
      if(c.fall>2.15)c.state='gone';
    }
  }
  RAID.craft=RAID.craft.filter(c=>c.state!=='gone');
  for(const s of RAID.shots){
    s.t+=dt;const k=Math.min(1,s.t/s.dur);
    s.x=s.x0+(s.x1-s.x0)*k;s.y=s.y0+(s.y1-s.y0)*k;
    if(k>=1&&!s.resolved){s.resolved=true;const tgt=s.tgt;
      if(tgt&&tgt.state==='fly'){if(s.hit){tgt.state='hit';tgt.fall=0;raidPuff(tgt.x,tgt.y,tgt.kind);RAID.down++;if(tgt.kind==='flamingo')RAID.downBird++;else RAID.downDrone++;}
        else raidPuff(s.x1,s.y1-10,'miss');}}}
  RAID.shots=RAID.shots.filter(s=>s.t<s.dur+0.08);
  for(const p of RAID.puffs)p.life+=dt;
  RAID.puffs=RAID.puffs.filter(p=>p.life<p.max);
  const bits=[];
  if(want.drone)bits.push('беспилотники');
  if(want.missile)bits.push('вместо ракет — розовые фламинго');
  raidBanner(want.title||'Оповещение МЧС','В небе: '+bits.join(' · ')+'. Это рисунок по оповещению МЧС, не замена сообщения.');
  raidTally();
}
function raidDrawDrone(c,t){
  ctx.save();ctx.translate(c.x,c.y);
  const dir=c.vx>=0?1:-1;ctx.scale(dir*c.size,c.size);
  if(c.state==='hit'){ctx.globalAlpha=Math.max(0,1-c.fall/1.6);ctx.rotate(c.fall*c.spin);}
  ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(0,10,16,3,0,0,6.3);ctx.fill();
  ctx.fillStyle='#3a424c';ctx.beginPath();ctx.moveTo(22,0);ctx.lineTo(-18,-7);ctx.lineTo(-26,-2);ctx.lineTo(-18,0);ctx.lineTo(-26,2);ctx.lineTo(-18,7);ctx.closePath();ctx.fill();
  ctx.fillStyle='#5c6772';ctx.beginPath();ctx.moveTo(8,0);ctx.lineTo(-6,-16);ctx.lineTo(-10,-14);ctx.lineTo(-2,0);ctx.lineTo(-10,14);ctx.lineTo(-6,16);ctx.closePath();ctx.fill();
  ctx.fillStyle='#d5dde6';ctx.fillRect(16,-1.1,5,2.2);
  ctx.fillStyle='#c23b3b';ctx.fillRect(-4,-1,3,2);
  ctx.restore();
}
function raidDrawFlamingo(c,t){
  ctx.save();ctx.translate(c.x,c.y);
  const dir=c.vx>=0?1:-1;ctx.scale(dir*c.size,c.size);
  if(c.state==='hit'){ctx.globalAlpha=Math.max(0,1-c.fall/2);ctx.rotate(c.fall*c.spin*1.7);}
  const flap=Math.sin(t*8+c.flap);
  ctx.fillStyle='rgba(0,0,0,.22)';ctx.beginPath();ctx.ellipse(0,18,16,3.5,0,0,6.3);ctx.fill();
  ctx.fillStyle='#f7a8bd';ctx.beginPath();ctx.ellipse(-8,1+flap*2,24,6.5,flap*0.55,0,6.3);ctx.fill();
  ctx.fillStyle='#2b2428';ctx.beginPath();ctx.ellipse(-28,1+flap*6,8,3.2,flap*0.4,0,6.3);ctx.fill();
  ctx.fillStyle='#ff8eab';ctx.beginPath();ctx.ellipse(8,0,16,7.2,0.1,0,6.3);ctx.fill();
  ctx.fillStyle='#ffd6e0';ctx.beginPath();ctx.ellipse(6,2,8,3,0,0,6.3);ctx.fill();
  ctx.strokeStyle='#ffb4c6';ctx.lineWidth=3.4;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(18,-1);ctx.quadraticCurveTo(28,-6,34,-20);ctx.stroke();
  ctx.fillStyle='#ff8eab';ctx.beginPath();ctx.arc(34,-22,4.4,0,6.3);ctx.fill();
  ctx.fillStyle='#f2c14e';ctx.beginPath();ctx.moveTo(37,-22);ctx.lineTo(50,-19.5);ctx.lineTo(37,-17.5);ctx.closePath();ctx.fill();
  ctx.fillStyle='#2a2118';ctx.fillRect(44,-20.2,4,1.6);
  ctx.fillStyle='#1a120e';ctx.beginPath();ctx.arc(35,-23.2,0.9,0,6.3);ctx.fill();
  ctx.strokeStyle='#e7b14a';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(4,6);ctx.lineTo(-2,16);ctx.moveTo(9,6);ctx.lineTo(5,16);ctx.stroke();
  ctx.restore();
}
function raidDrawBattery(b,t){
  ctx.save();ctx.translate(b.x,b.y);
  ctx.fillStyle='rgba(0,0,0,.22)';ctx.beginPath();ctx.ellipse(0,14,18,5,0,0,6.3);ctx.fill();
  ctx.fillStyle='#2c3a32';ctx.fillRect(-14,-4,28,12);
  ctx.fillStyle='#3e5144';ctx.fillRect(-10,-1,20,6);
  ctx.save();ctx.rotate(b.aim);
  ctx.fillStyle='#c5cbb8';ctx.fillRect(2,-1.6,16,3.2);ctx.fillRect(2,2.2,14,2.4);
  ctx.fillStyle='#f2f0e6';ctx.fillRect(16,-1.2,3,2.2);
  ctx.restore();
  ctx.fillStyle='#8ea394';ctx.beginPath();ctx.arc(-4,-8,4.5,0,6.3);ctx.stroke();
  ctx.restore();
}
function raidDraw(){
  if(!RAID.on||typeof scene==='undefined'||scene!=='city'||typeof ctx==='undefined'||!W||!H)return;
  const t=RAID.t;
  ctx.save();
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.globalCompositeOperation='source-over';
  const pulse=0.5+0.5*Math.sin(t*(RAID.phase==='clear'?2:7));
  if(RAID.phase!=='clear'){
    const g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,`rgba(120,16,28,${0.16+pulse*0.08})`);
    g.addColorStop(0.45,'rgba(120,16,28,0)');
    g.addColorStop(1,`rgba(80,10,16,${0.05+pulse*0.04})`);
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    ctx.strokeStyle=`rgba(226,48,62,${0.28+pulse*0.45})`;ctx.lineWidth=5;ctx.strokeRect(3,3,W-6,H-6);
  }
  raidSyncBats();
  for(const b of RAID.bats)raidDrawBattery(b,t);
  for(const c of RAID.craft){if(c.kind==='flamingo')raidDrawFlamingo(c,t);else raidDrawDrone(c,t);}
  for(const s of RAID.shots){
    const k=Math.min(1,(s.t||0)/(s.dur||1));
    const x=s.x!=null?s.x:s.x0+(s.x1-s.x0)*k,y=s.y!=null?s.y:s.y0+(s.y1-s.y0)*k;
    const dx=s.x1-s.x0,dy=s.y1-s.y0,len=Math.hypot(dx,dy)||1;
    ctx.strokeStyle='rgba(255,214,140,.95)';ctx.lineWidth=2;ctx.beginPath();
    ctx.moveTo(x-dx/len*16,y-dy/len*16);ctx.lineTo(x,y);ctx.stroke();
    ctx.fillStyle='#fff6d8';ctx.beginPath();ctx.arc(x,y,2.2,0,6.3);ctx.fill();
  }
  for(const p of RAID.puffs){
    const k=p.life/p.max,fade=1-k;
    ctx.globalAlpha=fade;
    if(p.kind==='miss'){ctx.strokeStyle='rgba(220,220,220,.7)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(p.x,p.y,6+k*10,0,6.3);ctx.stroke();}
    else {ctx.fillStyle='rgba(255,150,60,'+(0.7*fade)+')';ctx.beginPath();ctx.arc(p.x,p.y,4+k*6,0,6.3);ctx.fill();ctx.fillStyle='rgba(40,42,44,'+(0.45*fade)+')';ctx.beginPath();ctx.arc(p.x,p.y-2,8+k*18,0,6.3);ctx.fill();}
    ctx.globalAlpha=1;
  }
  ctx.restore();
}
function mountRaidButton(){
  if(document.getElementById('raidBtn'))return;
  const host=document.getElementById('bathBtn')||document.getElementById('bazaarBtn')||document.getElementById('showBtn')||document.getElementById('clubBtn');
  if(!host||!host.parentElement)return;
  const b=document.createElement('button');b.className='btn';b.id='raidBtn';b.type='button';b.title='Воздушная тревога';b.textContent='🚨';b.style.fontSize='16px';
  b.onclick=()=>raidStart();
  host.parentElement.insertBefore(b,host);
}
if(!document.getElementById('raidCss')){
  const s=document.createElement('style');s.id='raidCss';
  s.textContent='#raidBanner{position:fixed;z-index:28;left:50%;bottom:calc(92px + env(safe-area-inset-bottom,0px));top:auto;transform:translateX(-50%);width:max-content;max-width:min(92vw,560px);box-sizing:border-box;pointer-events:none;text-align:center;padding:8px 16px 10px;border-radius:14px;background:rgba(48,10,16,.92);border:1px solid rgba(255,140,140,.75);box-shadow:0 12px 32px rgba(0,0,0,.35);color:#fff}#raidBanner b{display:block;font-family:Unbounded,sans-serif;font-size:13px;letter-spacing:.04em}#raidBanner span{display:block;margin-top:3px;font-size:12.5px;line-height:1.35;color:#ffe4e2}#raidBanner i{display:block;margin-top:4px;font-style:normal;font-family:"JetBrains Mono",ui-monospace,monospace;font-size:12px;letter-spacing:.01em;color:#fff}#raidBanner.allclear{background:rgba(12,36,24,.92);border-color:rgba(120,220,160,.7)}#raidBanner.allclear span,#raidBanner.allclear i{color:#dff6e8}';
  document.head.appendChild(s);
}
if(typeof frameBody==='function'){const raidFrame0=frameBody;let raidLast=performance.now();frameBody=function(now){const dt=Math.min(0.05,(now-raidLast)/1000);raidLast=now;raidTick(dt);return raidFrame0(now);};}
if(typeof render==='function'){const raidRender0=render;render=function(){raidRender0();try{raidDraw();}catch(e){if(!raidDraw.bad){raidDraw.bad=1;console.error(e);}}};}
raidDropButton();
