// ===== Разговор вслух: игроки рядом и жители слышат =====
const HEAR_R=45;          // на каком расстоянии слышно (м)
let sayCounter=0,saySent=null;
function openSayBar(prefix){if(scene!=='city'&&scene!=='interior')return;$('#sayBar').hidden=false;const i=$('#sayInput');i.value=prefix||'';setTimeout(()=>{i.focus();i.setSelectionRange(i.value.length,i.value.length);},20);}
function closeSayBar(){$('#sayBar').hidden=true;$('#sayInput').blur();}
$('#sayBtn').addEventListener('click',()=>{if($('#sayBar').hidden)openSayBar();else closeSayBar();});
$('#saySend').addEventListener('click',sayAloud);
$('#sayInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();sayAloud();}if(e.key==='Escape'){e.preventDefault();closeSayBar();}e.stopPropagation();});
function pos(){return scene==='interior'&&interior?{x:interior.ret.x,y:interior.ret.y}:{x:player.x,y:player.y};}
function sayAloud(){const txt=$('#sayInput').value.trim().slice(0,140);if(!txt)return;$('#sayInput').value='';
  player.say={t:txt,ttl:6};saySent={t:txt,i:++sayCounter};addEvent(`${player.name}: ${txt}`,'say');
  // жители рядом слышат и один из них отвечает
  const p=pos();let npc=null,bd=7;
  if(scene==='interior'&&interior){for(const n of interior.npcs){const d=dist(n.x,n.y,player.ix,player.iy);if(d<3&&d<bd){bd=d;npc=n;}}}
  else for(const w of walkers){if(w.bus||w.state==='hurt'||w.rally||w.inside)continue;const d=dist(w.x,w.y,p.x,p.y);if(d<bd){bd=d;npc=w;}}
  if(npc)npcReply(npc,txt);
  closeSayBar();}
async function npcReply(w,txt){if(!w.isInterior&&!w.companion){w.state='idle';w.ttl=Math.max(w.ttl,12);w.path=null;const dx=player.x-w.x,dy=player.y-w.y,L=Math.hypot(dx,dy)||1;w.hx=dx/L;w.hy=dy/L;}
  w.p.memory.push({role:'user',content:txt});let reply=null;
  let act=null;if(sampleFn){w.say={t:'…',ttl:20};try{act=await npcThink(w,'Собеседник сказал это вслух на улице — ответь одной короткой фразой (до 12 слов).');reply=act.reply.replace(/^["«]|["»]$/g,'');}catch(e){if(e&&e.code==='not_granted')sampleFn=null;}}
  if(!reply){act=scriptedThink(w,txt);reply=act?act.reply:pick(SCRIPTED[w.role]||SCRIPTED.resident);}
  if(act){const note=applyNpcAction(w,act);if(note)addEvent(note,'say');}
  w.p.memory.push({role:'assistant',content:reply});if(w.p.memory.length>16)w.p.memory.splice(0,w.p.memory.length-16);
  w.say={t:reply.length>90?reply.slice(0,88)+'…':reply,ttl:7};addEvent(`${w.p.name}: ${reply}`,'say');}
// фразы других игроков (приходят через presence)
function onPeerSay(pr,s){if(!s||typeof s.t!=='string'||s.i===pr.sayI)return;pr.sayI=s.i;const t=s.t.slice(0,140);pr.say={t,ttl:6};
  const p=pos();if(dist(pr.x,pr.y,p.x,p.y)<HEAR_R)addEvent(`${pr.name}: ${t}`,'say');}
function updateSay(dt){if(player.say){player.say.ttl-=dt;if(player.say.ttl<=0)player.say=null;}
  for(const w of walkers){if(w.say&&!w.rally){w.say.ttl-=dt;if(w.say.ttl<=0)w.say=null;}}
  if(interior)for(const n of interior.npcs){if(n.say){n.say.ttl-=dt;if(n.say.ttl<=0)n.say=null;}}
  for(const pr of peerRender.values()){if(pr.say){pr.say.ttl-=dt;if(pr.say.ttl<=0)pr.say=null;}}}
function bubbleLines(text){ctx.font='600 12px "IBM Plex Sans",system-ui';const maxW=220;const words=text.split(' ');const lines=[];let cur='';for(const w of words){const t=cur?cur+' '+w:w;if(ctx.measureText(t).width>maxW&&cur){lines.push(cur);cur=w;}else cur=t;}if(cur)lines.push(cur);const L=lines.slice(0,3);return {L,w:Math.min(maxW,Math.max(...L.map(l=>ctx.measureText(l).width)))+16,h:L.length*15+8};}
function drawBubble(sx,sy,text,ttl,me,lay){const b=lay||bubbleLines(text);const x0=sx-b.w/2,y0=(b.y0!=null?b.y0:sy-b.h-10);ctx.save();ctx.font='600 12px "IBM Plex Sans",system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.globalAlpha=Math.min(1,ttl*1.5);ctx.fillStyle=me?'rgba(225,247,233,.97)':'rgba(255,255,255,.97)';rrect(ctx,x0,y0,b.w,b.h,9);ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,.25)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(sx,y0+b.h);ctx.lineTo(sx,sy-2);ctx.stroke();
  ctx.strokeStyle=me?'rgba(43,176,98,.6)':'rgba(0,0,0,.15)';rrect(ctx,x0,y0,b.w,b.h,9);ctx.stroke();
  ctx.fillStyle='#1E2A24';b.L.forEach((l,i)=>ctx.fillText(l,sx,y0+11+i*15));ctx.restore();}
function drawCityBubbles(toS,z){const lift=Math.max(1.6*z,12)+24;const items=[];
  for(const w of walkers){if(!w.say||w.rally||w.bus)continue;const [sx,sy]=toS(w.x,w.y);if(sx<-100||sx>W+100||sy<-60||sy>H+60)continue;items.push([sx,sy-Math.max(1.2*z,8),w.say,false]);}
  for(const pr of peerRender.values()){if(!pr.say||pr.b)continue;const [sx,sy]=toS(pr.x,pr.y);items.push([sx,sy-lift,pr.say,false]);}
  if(player.say&&!player.bus&&!player.inside){const [sx,sy]=toS(player.x,player.y);items.push([sx,sy-lift-(player.vehicle?12:0),player.say,true]);}
  // раскладка: облачка не налезают друг на друга
  const placed=[];items.sort((a,b)=>b[1]-a[1]);
  for(const it of items){const b=bubbleLines(it[2].t);let y0=it[1]-b.h-10;let moved=true;let guard=0;while(moved&&guard++<20){moved=false;for(const q of placed){if(Math.abs(q.x-it[0])<(q.w+b.w)/2+4&&y0<q.y0+q.h+4&&y0+b.h+4>q.y0){y0=q.y0-b.h-4;moved=true;}}}
    b.y0=y0;placed.push({x:it[0],y0,w:b.w,h:b.h});drawBubble(it[0],it[1],it[2].t,it[2].ttl,it[3],b);}}
function drawInteriorBubbles(it){for(const n of it.npcs){if(!n.say)continue;drawBubble(it.ox+n.x*it.iz,it.oy+n.y*it.iz-it.iz*0.5,n.say.t,n.say.ttl,false);}
  if(player.say)drawBubble(it.ox+player.ix*it.iz,it.oy+player.iy*it.iz-it.iz*0.5-26,player.say.t,player.say.ttl,true);}
