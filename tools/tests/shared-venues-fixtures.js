'use strict';
// Identical disposable screenshot/perf fixture on main and the candidate branch.
function stageSharedVenue({crowd=false}={}){
  if(scene==='interior')exitInterior();
  const loc=llToXY([55.79190,49.11240]),p=world.pois.filter(p=>p.t==='cafe').sort((a,b)=>Math.hypot(a.x-loc[0],a.y-loc[1])-Math.hypot(b.x-loc[0],b.y-loc[1]))[0];
  if(!p)throw new Error('No cafe near Bauman');
  player.x=p.x;player.y=p.y;player.vehicle=null;player.bus=null;player.busy=false;player.waypoints=null;
  enterInterior({kind:'cafe',name:p.n||'Кафе',key:poiKey(p),venueAt:{x:p.x,y:p.y}});
  clearTimeout(shotT);document.querySelector('#insideShot').hidden=true;document.querySelector('#scX').click();
  zkSetTime((clock.day-1)*1440+13*60);weather.kind='clear';weather.rain=[];
  for(const n of interior.npcs){n.phase=0;n.wander=false;}
  player.ix=8;player.iy=9.8;player.ihx=0;player.ihy=-1;
  const positions=crowd?[]:[[4,8.8],[8,8],[12,8.8]];
  if(crowd)for(let y=8.8;y>2&&positions.length<12;y-=1.8)for(let x=1.4;x<15&&positions.length<12;x+=2.2)if(!blockedInside(x,y,.3))positions.push([x,y]);
  const names=['Алия','Руслан','Лейсан'];
  syncPeers(positions.map(([ix,iy],i)=>({peer:'snapshot-'+i,presence:{x:p.x,y:p.y,b:1,room:interior.room||'snapshot-room',ix,iy,ihx:0,ihy:1,n:names[i]||'Гость '+(i+1),c:['#508DA8','#C18054','#8C739D'][i%3],w:{}}})));
  if(!crowd){const pr=peerRender.get('snapshot-1');if(pr)pr.say={t:'Привет! Здесь свободно.',ttl:600};}
  updateHud();return {venue:interior.name,room:interior.room||null,guests:positions.length};
}
if(typeof module!=='undefined')module.exports={stageSharedVenue};
