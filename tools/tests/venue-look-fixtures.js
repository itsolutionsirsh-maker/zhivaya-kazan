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
if(typeof module!=='undefined')module.exports={venueScenes,stageVenueLook};
