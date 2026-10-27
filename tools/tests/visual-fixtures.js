'use strict';

// These functions run only in disposable test pages. Keep them self-contained for evaluate().
function parkSnapshotTaxi(taxi, x, y) {
  if (!taxi) throw new Error('No car available for the transport screenshot');
  Object.assign(taxi, {x, y, hx:1, hy:0, kind:'taxi', color:'#F4C542', speed:0,
    state:'idle', ttl:60, path:null, wps:null, creep:null, target:null, sceneXY:null,
    flash:false, waitT:0, stuck:0});
}

function stageDetailedFolk() {
  const active = sitActive('folkAct'); if (active) endSit(active);
  const loc = llToXY([55.79242,49.11140]), node = nearestNode(loc[0],loc[1],world.pedAdj,200), q = sidewalkPos(node);
  player.x=q[0]; player.y=q[1]; player.vehicle=null; player.waypoints=null;
  cam.x=q[0]; cam.y=q[1]; cam.zt=cam.z=9.5;
  for (let i=0;i<50;i++) folkDistrictTick();
  const specs=[['karim','phone',-10,-10],['gazinur','cart',6,-10],['arslan','guitar',-10,7],['halil','broom',6,7]];
  const ids=new Set(specs.map(s=>s[0]));
  for (const w of walkers) if (!ids.has(w.folk)&&dist(w.x,w.y,q[0],q[1])<28) w.x+=80;
  const out=[];
  for (const [id,item,dx,dy] of specs) {
    const f=FOLK.list.find(f=>f.id===id);
    if (!f||f.p.item!==item) throw new Error('No detailed render fixture: '+id+' / '+item);
    if (!f.w) folkSpawn(f,{x:q[0],y:q[1]});
    const w=f.w; if (!w) throw new Error('Did not spawn render fixture: '+id);
    Object.assign(w,{x:q[0]+dx,y:q[1]+dy,hx:1,hy:0,phase:0,state:'folkStay',path:null,mv:null,walking:false,
      bus:null,inside:null,filming:item==='phone',sitBy:'visual-test',keep:true});
    // sitBy pins only these four fixtures; the game loop and the rest of the city keep updating.
    out.push({id,item,filming:w.filming});
  }
  weather.rain=[]; weather.kind='clear'; return out;
}

module.exports = {parkSnapshotTaxi,stageDetailedFolk};
