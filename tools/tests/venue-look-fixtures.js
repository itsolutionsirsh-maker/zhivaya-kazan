'use strict';
// Disposable browser pages only. The same fixture runs against main and the branch.
const venueScenes=[
  ['coffee',{kind:'cafe',name:'Кофейня'}],['tatar',{kind:'cafe',name:'Тюбетей'}],
  ['tatar_night',{kind:'cafe',name:'Тюбетей',hour:23}],['bakery',{kind:'cafe',name:'Пекарня'}],
  ['bar',{kind:'bar',name:'Вечерний бар',hour:23}],['shop',{kind:'shop',name:'Продукты'}],
  ['market',{kind:'market',name:'Рынок'}],['pharmacy',{kind:'pharmacy',name:'Аптека'}],
  ['hotel',{kind:'hotel',name:'Ногай'}],['museum',{kind:'museum',name:'Музей'}],
  ['library',{kind:'library',name:'Библиотека'}],['school',{kind:'school',name:'Учебный класс'}],
  ['theatre',{kind:'theatre',name:'Театральный зал',hour:23}],
  ['mosque',{kind:'worship',name:'Мечеть'}],['home',{kind:'home',name:'Квартира'}]
];
function stageVenueLook({kind='cafe',name='Кофейня',hour=13}={}){
  stageCityLook({hour});
  const key='venue-look:'+kind+':'+name;interiorCache.delete(key);
  const random=Math.random;Math.random=seeded(hashStr(key));
  try{enterInterior({kind,name,key});}finally{Math.random=random;}
  clearTimeout(shotT);document.querySelector('#insideShot').hidden=true;
  for(const n of interior.npcs){n.phase=0;n.wander=false;}
  player.phase=0;player.iwp=null;currentAction=null;document.querySelector('#scX').click();updateHud();
  return {kind,name,hour,w:interior.w,h:interior.h,furniture:interior.furn.length,npcs:interior.npcs.length};
}
// Проверяет настоящие коллизии комнаты: от входа можно дойти к столам и стойке.
// Вызывать в одноразовой странице после stageVenueLook(), не в живой игре.
function checkVenueRoom(){
  const it=interior,step=.25,nx=Math.ceil(it.w/step)+1,ny=Math.ceil((it.h+.5)/step)+1;
  const seen=new Uint8Array(nx*ny),queue=[],points=[];
  const add=(x,y)=>{if(x<0||y<0||x>=nx||y>=ny)return;const k=y*nx+x;if(seen[k]||blockedInside(x*step,y*step,.3))return;seen[k]=1;queue.push([x,y]);};
  add(Math.round(it.door.x/step),Math.round((it.h-1)/step));
  for(let i=0;i<queue.length;i++){const [x,y]=queue[i];points.push([x*step,y*step]);for(const [a,b] of [[-1,0],[1,0],[0,-1],[0,1]])add(x+a,y+b);}
  const reachable=f=>points.some(([x,y])=>Math.hypot(Math.max(0,Math.abs(x-f.x)-f.w/2),Math.max(0,Math.abs(y-f.y)-f.h/2))<.8);
  const spots=it.furn.filter(f=>f.spot==='table'||f.spot==='counter'),missing=spots.filter(f=>!reachable(f)).map(f=>({t:f.t,x:f.x,y:f.y}));
  if(missing.length)throw new Error('Недоступная мебель: '+JSON.stringify(missing));
  if(!points.some(([x,y])=>Math.abs(x-it.door.x)<.3&&y>it.h+.25))throw new Error('Выход недоступен');
  const bounds={left:it.ox-.5*it.iz,right:it.ox+(it.w+.5)*it.iz,top:it.oy-venueLayerTop(it)*it.iz,bottom:it.oy+(it.h+.8)*it.iz};
  if(bounds.left<0||bounds.right>W||bounds.top<108||bounds.bottom>H)throw new Error('Комната выходит за видимую область');
  const hint=document.querySelector('#hint'),hr=hint.getBoundingClientRect();
  if(W<H&&!hint.hidden&&hr.height&&it.oy+it.h*it.iz+55>hr.top)throw new Error('Подсказка перекрывает подпись комнаты');
  return {viewport:[W,H],kind:it.kind,name:it.name,reachableSpots:spots.length,walkablePoints:points.length,bounds,cachePixels:venueLayer.canvas.width*venueLayer.canvas.height};
}
if(typeof module!=='undefined')module.exports={venueScenes,stageVenueLook,checkVenueRoom};
