// Fictional shared meeting place, on the open pedestrian space by Nekrasova.
(function(root){
  'use strict';
  const yard={id:'nekrasova-v1',name:'Свой двор · у Некрасова',lon:49.13004924845088,lat:55.78951724757456,steps:[
    {id:'bench',icon:'🪑',name:'Лавка для соседей',tasks:['Подготовить доски','Отшлифовать сиденье','Собрать лавку'],line:'Теперь есть где присесть. Соседи уже спорят, кто принесёт чай.'},
    {id:'light',icon:'💡',name:'Тёплый свет',tasks:['Расчистить место','Собрать плафон на земле','Помочь мастеру с проверкой'],line:'Мастер подключил свет. Вечером здесь можно встречаться.'},
    {id:'mural',icon:'🎨',name:'Панно нашего двора',tasks:['Подготовить стенд','Нанести рисунок','Покрыть рисунок лаком'],line:'Лавка, свет и рисунок готовы. Приходите с друзьями!'}
  ]};
  const limits={daily:3,starts:12,workMs:8000,leaseMs:120000,radius:30};
  const point=m=>m&&Number.isFinite(m.mlon)&&Number.isFinite(m.mlat)?{x:(yard.lon-m.lon0)*m.mlon,y:(m.lat0-yard.lat)*m.mlat}:null;
  const api={yard,limits,point};if(typeof module==='object'&&module.exports)module.exports=api;else root.CourtyardData=api;
})(typeof globalThis==='object'?globalThis:this);
