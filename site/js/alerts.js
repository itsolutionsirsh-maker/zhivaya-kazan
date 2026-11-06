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
  const y=186+(lane%4)*48;
  const speed=kind==='flamingo'?70+(lane%3)*6:62+(lane%4)*8;
  const fromLeft=lane%2===0;
  const x=spread?(110+(lane%5)*Math.max(150,(W-260)/4)):(fromLeft?-100:W+100);
  return {kind,x,y,baseY:y,vx:(fromLeft?1:-1)*speed,vy:0,state:'fly',fall:0,spin:Math.random()<0.5?-1:1,flap:lane*1.3,size:kind==='flamingo'?1.65:1.45,style:lane%3===0?'quad':'wing',lucky:lane%3===1,wobble:lane};
}
function raidSeed(kind,n){for(let i=0;i<n;i++)RAID.craft.push(raidSpawn(kind,i,true));}
function raidStart(){}
function raidDropButton(){const b=document.getElementById('raidBtn');if(b)b.remove();}
function raidSyncBats(){
  const spec=[[0.14,0.60],[0.5,0.64],[0.86,0.60]];
  while(RAID.bats.length<3)RAID.bats.push({cool:1.4+RAID.bats.length*0.7,aim:-Math.PI/2});
  for(let i=0;i<3;i++){RAID.bats[i].x=W*spec[i][0];RAID.bats[i].y=H*spec[i][1];}
}
function raidShoot(dt){
  raidSyncBats();
  const live=RAID.craft.filter(c=>c.state==='fly'&&!c.lucky&&c.x>-40&&c.x<W+40&&c.y>40&&c.y<H*0.58);
  for(const b of RAID.bats){
    b.cool-=dt;
    let tgt=null,bd=1e9;
    for(const c of live){const d=Math.hypot(c.x-b.x,c.y-b.y);if(d<bd){bd=d;tgt=c;}}
    if(tgt)b.aim=Math.atan2(tgt.y-b.y,tgt.x-b.x);
    else b.aim=b.aim*0.92+(-Math.PI/2)*0.08;
    if(!tgt||b.cool>0||bd>Math.min(W,H)*0.78)continue;
    b.cool=2.35+Math.random()*0.7;
    const hit=Math.random()<0.6;
    const ox=hit?0:(Math.random()<0.5?-26:26),oy=hit?0:-18;
  RAID.shots.push({x0:b.x+Math.cos(b.aim)*26,y0:b.y+Math.sin(b.aim)*26,x1:tgt.x+ox,y1:tgt.y+oy,life:0.42,max:0.42});
    if(hit){tgt.state='hit';tgt.fall=0;raidPuff(tgt.x,tgt.y,tgt.kind);RAID.down++;if(tgt.kind==='flamingo')RAID.downBird++;else RAID.downDrone++;}
    else raidPuff(tgt.x+ox,tgt.y+oy,'miss');
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
    if(want.drone)raidSeed('drone',4);
    if(want.missile)raidSeed('flamingo',4);
  }
  RAID.t+=dt;
  if(want.drone&&!RAID.craft.some(c=>c.kind==='drone'))raidSeed('drone',4);
  if(want.missile&&!RAID.craft.some(c=>c.kind==='flamingo'))raidSeed('flamingo',4);
  if(!want.drone)RAID.craft=RAID.craft.filter(c=>c.kind!=='drone'||c.state==='hit');
  if(!want.missile)RAID.craft=RAID.craft.filter(c=>c.kind!=='flamingo'||c.state==='hit');
  RAID.acc=RAID.acc||{};
  const keep=(kind,every,cap)=>{
    RAID.acc[kind]=(RAID.acc[kind]||0)+dt;
    const flying=RAID.craft.filter(c=>c.kind===kind&&c.state==='fly').length;
    if(RAID.acc[kind]>every&&flying<cap){RAID.acc[kind]=0;RAID.craft.push(raidSpawn(kind));}
  };
  if(want.drone)keep('drone',1.55,6);
  if(want.missile)keep('flamingo',1.85,5);
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
  for(const s of RAID.shots)s.life-=dt;
  RAID.shots=RAID.shots.filter(s=>s.life>0);
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
  ctx.fillStyle='rgba(8,12,16,.78)';ctx.beginPath();ctx.arc(0,0,34,0,6.3);ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=2.5;ctx.stroke();
  const dir=c.vx>=0?1:-1;ctx.scale(dir*c.size,c.size);
  if(c.state==='hit'){ctx.globalAlpha=Math.max(0,1-c.fall/2);ctx.rotate(c.fall*c.spin*1.6);}
  ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(0,16,18,4,0,0,6.3);ctx.fill();
  if(c.style==='quad'){
    ctx.strokeStyle='#14181d';ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(-16,-10);ctx.lineTo(16,10);ctx.moveTo(-16,10);ctx.lineTo(16,-10);ctx.stroke();
    ctx.fillStyle='#2a3138';ctx.beginPath();ctx.ellipse(0,0,11,7,0,0,6.3);ctx.fill();
    ctx.strokeStyle='rgba(210,220,230,.7)';ctx.lineWidth=1.6;
    const spin=t*18;
    for(const [x,y] of [[-16,-10],[16,10],[-16,10],[16,-10]]){ctx.beginPath();ctx.ellipse(x,y,8,2.4,spin+x,0,6.3);ctx.stroke();}
    ctx.fillStyle=Math.sin(t*10+c.wobble)>0?'#ff4d5a':'#8dffc0';ctx.beginPath();ctx.arc(0,0,2.4,0,6.3);ctx.fill();
  }else{
    ctx.fillStyle='#2e353d';ctx.beginPath();ctx.moveTo(26,0);ctx.quadraticCurveTo(2,-10,-34,-18);ctx.lineTo(-20,-2);ctx.lineTo(-34,18);ctx.quadraticCurveTo(2,10,26,0);ctx.closePath();ctx.fill();
    ctx.strokeStyle='rgba(232,238,242,.45)';ctx.lineWidth=1.1;ctx.stroke();
    ctx.fillStyle='#68717b';ctx.beginPath();ctx.ellipse(8,0,7,3.4,0,0,6.3);ctx.fill();
    ctx.fillStyle=Math.sin(t*7+c.wobble)>0?'#ff4458':'#1a1e22';ctx.fillRect(-2,-1.5,4,3);
    ctx.fillStyle='#d5dde4';ctx.fillRect(20,-1.2,4,2.4);
  }
  ctx.restore();
}
function raidDrawFlamingo(c,t){
  ctx.save();ctx.translate(c.x,c.y);
  ctx.fillStyle='rgba(255,236,242,.92)';ctx.beginPath();ctx.arc(0,0,38,0,6.3);ctx.fill();
  ctx.strokeStyle='rgba(214,48,96,.95)';ctx.lineWidth=2.5;ctx.stroke();
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
  ctx.save();ctx.translate(b.x,b.y);ctx.scale(1.45,1.45);
  ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(0,16,22,6,0,0,6.3);ctx.fill();
  ctx.fillStyle='#1d3a2c';if(typeof rrect==='function'){rrect(ctx,-16,-6,32,16,4);ctx.fill();}else ctx.fillRect(-16,-6,32,16);
  ctx.fillStyle='#2f6b4f';ctx.fillRect(-12,-2,24,8);
  ctx.save();ctx.rotate(b.aim);ctx.fillStyle='#d7dece';ctx.fillRect(0,-2.2,18,4.4);ctx.fillStyle='#f4f7ef';ctx.fillRect(16,-1.4,4,2.8);ctx.restore();
  ctx.strokeStyle='rgba(186,255,214,.85)';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(-6,-10,7,-2.4,-0.7);ctx.stroke();
  const sweep=(t*1.6)%6.28;ctx.strokeStyle='rgba(186,255,214,.35)';ctx.beginPath();ctx.moveTo(-6,-10);ctx.lineTo(-6+Math.cos(sweep)*11,-10+Math.sin(sweep)*7);ctx.stroke();
  ctx.fillStyle='#f4fff6';ctx.font='600 11px "IBM Plex Sans",system-ui';ctx.textAlign='center';ctx.textBaseline='top';ctx.fillText('ПВО',0,14);
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
    const a=Math.max(0,s.life/s.max);
    ctx.strokeStyle=`rgba(255,236,170,${a})`;ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(s.x0,s.y0);ctx.lineTo(s.x1,s.y1);ctx.stroke();
    ctx.fillStyle=`rgba(255,250,220,${a})`;ctx.beginPath();ctx.arc(s.x1,s.y1,3.5,0,6.3);ctx.fill();
  }
  for(const p of RAID.puffs){
    const k=p.life/p.max,fade=1-k;
    ctx.globalAlpha=fade;
    if(p.kind==='miss'){ctx.strokeStyle='rgba(255,220,140,.8)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(p.x,p.y,8+k*16,0,6.3);ctx.stroke();}
    else if(p.kind==='flamingo'){for(const f of p.bits){ctx.fillStyle=f.c;ctx.beginPath();ctx.ellipse(p.x+f.x*k*1.4,p.y+f.y*k*1.4,7,2.4,f.r+k*2,0,6.3);ctx.fill();}}
    else {ctx.fillStyle='rgba(255,196,90,'+(0.8*fade)+')';ctx.beginPath();ctx.arc(p.x,p.y,5+k*8,0,6.3);ctx.fill();ctx.fillStyle='rgba(70,74,78,'+(0.55*fade)+')';ctx.beginPath();ctx.arc(p.x,p.y-4,10+k*26,0,6.3);ctx.fill();}
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
