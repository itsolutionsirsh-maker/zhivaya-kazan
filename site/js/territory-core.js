// Shared geometry and rules. No random rolls, storage or DOM here.
(function(root){
  'use strict';
  const data=typeof module==='object'&&module.exports?require('./district-bounds.js'):root.DistrictBounds;
  const factions={
    aviastroitelny:{name:'Авиастроительный',color:'#b7a2ff'},
    vahitovsky:{name:'Хади Такташ',color:'#ffbf66'},
    kirovsky:{name:'Киноплёнка',color:'#63d4ce'},
    moskovsky:{name:'Московский',color:'#f393ba'},
    novosavinovsky:{name:'Ново-Савиновский',color:'#8dc6ff'},
    privolzhsky:{name:'Приволжский',color:'#b3d77b'},
    sovetsky:{name:'Советский',color:'#dbacff'}
  };
  const get=id=>data.districts.find(d=>d.id===id)||null;
  function segmentDistance(x,y,a,b,sx=1,sy=1){
    const dx=(b[0]-a[0])*sx,dy=(b[1]-a[1])*sy,px=(x-a[0])*sx,py=(y-a[1])*sy;
    const t=Math.max(0,Math.min(1,(px*dx+py*dy)/(dx*dx+dy*dy||1)));
    return Math.hypot(px-t*dx,py-t*dy);
  }
  // 0 outside, 1 inside, 2 exactly on an edge. Edge ties use dataset order.
  function inRing(x,y,ring){let inside=false;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const a=ring[j],b=ring[i];if(segmentDistance(x,y,a,b)<1e-10)return 2;
      if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
    }return inside?1:0;
  }
  function contains(d,lon,lat){const b=d.bbox;if(lon<b[0]||lat<b[1]||lon>b[2]||lat>b[3])return false;
    return d.outer.some(r=>inRing(lon,lat,r)>0)&&!d.inner.some(r=>inRing(lon,lat,r)>0);
  }
  function district(lon,lat){if(!Number.isFinite(lon)||!Number.isFinite(lat))return null;return data.districts.find(d=>contains(d,lon,lat))||null;}
  function lonLat(x,y,m){if(!m||![x,y,m.lon0,m.lat0,m.mlon,m.mlat].every(Number.isFinite)||m.mlon<=0||m.mlat<=0)return null;return [m.lon0+x/m.mlon,m.lat0-y/m.mlat];}
  function at(x,y,m){const p=lonLat(x,y,m);return p?district(...p):null;}
  function borderDistance(d,lon,lat){let best=Infinity;const sx=111320*Math.cos(lat*Math.PI/180);
    for(const r of d.outer.concat(d.inner))for(let i=1;i<r.length;i++)best=Math.min(best,segmentDistance(lon,lat,r[i-1],r[i],sx,111320));return best;
  }
  function multiplier(member,territory){return get(member)&&member===territory?1.2:1;}
  function encounterPower(member,territory,opponent=territory){const player=70*multiplier(member,territory),locals=2*40*multiplier(opponent,territory);return {player,locals,chance:player/(player+locals)};}
  const api={data,factions,get,inRing,contains,district,lonLat,at,borderDistance,multiplier,encounterPower};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.TerritoryRules=api;
})(globalThis);
