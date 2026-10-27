'use strict';

// Self-contained fixture for shots.js, perf.js and a local visual review page.
// Only call in disposable test pages. No production data or save-format changes.
function stageCityLook({kind='facade',hour=13,z=9.5}={}) {
  if(scene==='interior')exitInterior();
  const loc=llToXY([55.79190,49.11240]);
  const b=world.buildings.filter(b=>b.h>=2&&b.h<=6&&b.area>100&&!b.dome&&!b.spire)
    .sort((a,b)=>dist(a.cx,a.cy,loc[0],loc[1])-dist(b.cx,b.cy,loc[0],loc[1]))[0];
  if(!b)throw new Error('No facade fixture near Bauman');
  const q=toSidewalk(b.cx,b.bb[3]+2);
  player.x=q[0];player.y=q[1];player.vehicle=null;player.waypoints=null;player.bus=null;player.busy=false;
  cam.x=b.cx;cam.y=b.bb[3]-b.hm*.2;cam.zt=cam.z=z;
  zkSetTime((clock.day-1)*1440+hour*60);updateClock(0);weather.rain=[];weather.kind='clear';
  if(kind!=='facade'){
    const names={cafe:'Кофейня на Баумана',home:'Ваша квартира',shop:'Продукты',metro:'Станция метро'};
    enterInterior({kind,name:names[kind]||kind,key:'city-look:'+kind});
    // Photo of the venue is an intro overlay, not the room under review.
    clearTimeout(shotT);document.querySelector('#insideShot').hidden=true;
    for(const n of interior.npcs){n.phase=0;n.wander=false;}
  }
  document.querySelector('#scX').click();
  updateHud();
  return {kind,hour,z,building:{x:b.cx,y:b.cy,h:b.h},player:{x:player.x,y:player.y},room:interior?{w:interior.w,h:interior.h,floor:interior.floor}:null};
}

if(typeof module!=='undefined')module.exports={stageCityLook};
