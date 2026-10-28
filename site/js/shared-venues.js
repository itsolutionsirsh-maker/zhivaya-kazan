// Public rooms share player presence and conversation. NPCs, orders and money remain local.
function sharedRoomId(){return scene==='interior'&&interior&&interior.room||null;}
function sharedVenueKey(src){
  let at=src.venueAt;
  // poiKey is coordinate-based and remains stable when chunks load in a different order.
  if(!at){const m=/^p(-?\d+)_(-?\d+)$/.exec(src.key||'');if(m)at={x:+m[1],y:+m[2]};}
  return VenueRoom.key(src.kind,at,src.name);
}
function sharedPeerHere(pr){return !!(sharedRoomId()&&pr.room===sharedRoomId()&&!modIgnored(pr.key));}
function sharedPresence(p){
  p.room=sharedRoomId();p.ix=p.iy=p.ihx=p.ihy=0;
  if(p.room){p.ix=Math.round(player.ix*100)/100;p.iy=Math.round(player.iy*100)/100;p.ihx=Math.round(player.ihx*100)/100;p.ihy=Math.round(player.ihy*100)/100;}
}
function sharedTransition(){
  saySent=null;player.say=null;for(const pr of peerRender.values())pr.say=null;
  // Entry/exit must not wait for the stationary-player heartbeat.
  wsLastP=null;wsLastPush=0;pushPresence();
}
function syncSharedPeer(pr,p){
  const r=VenueRoom.read(p),old=pr.room;pr.room=r?r.room:null;
  if(r){pr.itx=r.ix;pr.ity=r.iy;pr.ihx=r.ihx;pr.ihy=r.ihy;
    if(old!==r.room||!Number.isFinite(pr.ix)||Math.hypot(pr.ix-r.ix,pr.iy-r.iy)>4){pr.ix=r.ix;pr.iy=r.iy;}}
  if(old!==pr.room)pr.say=null;
}
function tickSharedPeer(pr){
  if(!pr.room)return;const d=Math.hypot(pr.itx-pr.ix,pr.ity-pr.iy);
  pr.ix=lerp(pr.ix,pr.itx,.35);pr.iy=lerp(pr.iy,pr.ity,.35);
  if(d>.01)pr.iphase=(pr.iphase||0)+.23;
}
function sharedPeerAt(x,y,r){
  let best=null,bd=r;for(const pr of peerRender.values()){if(!sharedPeerHere(pr))continue;const d=Math.hypot(pr.ix-x,pr.iy-y);if(d<bd){best=pr;bd=d;}}return best;
}
function sharedPeerAction(){
  const pr=sharedPeerAt(player.ix,player.iy,1.8);if(!pr)return null;
  return {label:`Написать игроку: ${pr.name}`,run:()=>{if(sharedPeerHere(pr))openChatPanel('dm',pr.key);}};
}
function drawSharedPeople(){
  for(const pr of peerRender.values()){if(!sharedPeerHere(pr))continue;
    drawPerson(pr.ix,pr.iy,pr.ihx,pr.ihy,Object.assign({clothes:pr.c,skin:'#F1D3B5',hair:'#2B1B12',role:'player'},pr.look),pr.iphase||0,{scale:.55});}
}
function drawSharedLabels(it){
  // In a crowd keep the closest names readable; every avatar remains selectable.
  ctx.save();ctx.font='600 12px "IBM Plex Sans",system-ui';
  const box=(x,y,name,img)=>({x,y:y-15,w:ctx.measureText(name).width+18+(img?22:0),h:26});
  const placed=[box(it.ox+player.ix*it.iz,it.oy+(player.iy-.55)*it.iz,player.name,player.avatarImg)];
  const nearby=[...peerRender.values()].filter(sharedPeerHere).sort((a,b)=>Math.hypot(a.ix-player.ix,a.iy-player.iy)-Math.hypot(b.ix-player.ix,b.iy-player.iy));
  let count=0;for(const pr of nearby){if(count>=(W<=600?6:12))break;
    const name=pr.name.length>20?pr.name.slice(0,19)+'…':pr.name,sy=it.oy+(pr.iy-.55)*it.iz;
    const b=box(it.ox+pr.ix*it.iz,sy,name,pr.img);b.x=clamp(b.x,b.w/2+4,W-b.w/2-4);
    if(placed.some(a=>Math.abs(a.x-b.x)<(a.w+b.w)/2+3&&Math.abs(a.y-b.y)<(a.h+b.h)/2+3))continue;
    placed.push(b);count++;labelPlayer(b.x,sy,name,false,pr.img,pr.look&&pr.look.frame);
  }ctx.restore();
}
function sharedCanHear(pr,s){
  if(scene==='interior')return sharedPeerHere(pr)&&s.room===sharedRoomId();
  return !pr.b&&!pr.room&&!s.room&&dist(pr.x,pr.y,player.x,player.y)<HEAR_R;
}
