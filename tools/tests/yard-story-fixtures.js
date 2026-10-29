'use strict';
// Presentation-only snapshots. The separate network/browser suites use real account state.
async function stageYardStory({kind='choice'}={}){
  for(const m of document.querySelectorAll('.modal'))m.hidden=true;
  if(SIT.card)closeSitCard();player.busy=false;player.vehicle=null;player.bus=null;player.inside=false;player.state='ok';scene='city';
  if(!window.cityYardStory){document.getElementById('menuBtn').click();return {supported:false,kind};}
  window.zkNoSave=true;
  if(!window.territoryFixtureFetch)window.territoryFixtureFetch=window.fetch.bind(window);
  acct={token:'yard-visual-fixture-token'};Net.territories=true;Net.yardStory=true;Net.mode='http';Net.syncReady=true;
  const story=kind==='invite'?null:{version:1,stage:kind==='ending'?'done':'call',ending:kind==='ending'?'bridge':undefined,
    choices:{promise:'open',kit:'mix',welcome:'listen',repair:'net'},bonds:{timur:2,leysan:5,artur:3,ruslan:3},log:Array(5).fill({step:'fixture'}),visits:{}};
  const state={rev:1,member:null,standing:0,switchAt:0,nextAt:0,practiceAt:0,history:[],active:null,story};
  const point=YardStory.point('court',world.meta),node=nearestNode(point.x,point.y,world.pedAdj,75),q=node>=0?sidewalkPos(node):[point.x,point.y];
  player.x=q[0];player.y=q[1];cam.x=player.x;cam.y=player.y;
  window.fetch=(url,options)=>{let body;try{body=JSON.parse(options&&options.body);}catch{}
    if(body&&body.a==='territory')return Promise.resolve({ok:true,json:async()=>({ok:1,state:JSON.parse(JSON.stringify(state))})});
    if(body&&body.a==='save')return Promise.resolve({ok:true,json:async()=>({ok:1})});
    return window.territoryFixtureFetch(url,options);
  };
  await cityTerritories.refresh();cityYardStory.open();return {supported:true,kind};
}
module.exports={stageYardStory};
