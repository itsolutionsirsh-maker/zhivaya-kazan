// Кадр поездки: пока едешь, виден салон или дорога. Такси отдельно — там водитель.
const RIDE_SHOT={
  bus:['img/rides/bus.jpg','Автобус'],
  tram:['img/rides/tram.jpg','Трамвай'],
  trolleybus:['img/rides/trolley.jpg','Троллейбус'],
  scooter:['img/rides/scooter.jpg','Самокат'],
  bike:['img/rides/bike.jpg','Велосипед'],
  car:['img/rides/car.jpg','Машина'],
  own:['img/rides/car.jpg','Своя машина']
};
(function(){const im=new Image();im.src='img/rides/metro.jpg';window.metroRideImg=im;})();
function rideNow(){if(typeof player==='undefined')return null;
  if(player.vehicle&&player.vehicle.kind==='taxi')return null;
  if(player.bus){const t=player.bus.route&&player.bus.route.type||'bus';const spec=RIDE_SHOT[t]||RIDE_SHOT.bus;const ref=player.bus.route&&player.bus.route.ref||'';return {src:spec[0],cap:spec[1]+(ref?' '+ref:'')};}
  if(player.vehicle){const spec=RIDE_SHOT[player.vehicle.kind]||RIDE_SHOT.car;return {src:spec[0],cap:spec[1]};}
  return null;}
let rideKey='';
function syncRideShot(){const r=rideNow();const key=r?r.src+'|'+r.cap:'';if(key===rideKey)return;rideKey=key;const el=$('#rideShot');if(!el)return;
  if(!r){el.hidden=true;return;}el.hidden=false;el.style.backgroundImage=`url("${r.src}")`;const n=$('#rideShotName');if(n)n.textContent=r.cap;}
if(typeof frame==='function'){const frame0=frame;frame=function(now){frame0(now);syncRideShot();};}
