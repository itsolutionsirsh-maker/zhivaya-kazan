'use strict';
// Deterministic presentation fixtures only. Network tests use the real server separately.
async function stageTerritoryScene({kind='map'}={}){
  for(const m of document.querySelectorAll('.modal'))m.hidden=true;
  if(SIT.card)closeSitCard();player.busy=false;player.vehicle=null;player.bus=null;player.inside=false;scene='city';
  if(!window.cityTerritories){document.getElementById('menuBtn').click();return {supported:false,kind};}
  window.zkNoSave=true;const home='kirovsky',district='vahitovsky';
  if(!window.territoryFixtureFetch){window.territoryFixtureFetch=window.fetch.bind(window);window.territoryFixtureAcct=acct;}
  acct={token:'territory-visual-fixture-token'};Net.territories=true;Net.mode='http';Net.syncReady=true;
  const state={rev:1,member:kind==='neutral'?null:home,standing:3,switchAt:0,nextAt:0,history:[],requests:[],active:null};
  if(kind==='meeting')state.active={id:'visual-meeting',member:home,district,opponent:district,x:player.x,y:player.y,phase:'greeting',power:TerritoryRules.encounterPower(home,district),expires:Date.now()+300000};
  window.fetch=(url,options)=>{let body;try{body=JSON.parse(options&&options.body);}catch{}
    if(body&&body.a==='territory')return Promise.resolve({ok:true,json:async()=>({ok:1,state:JSON.parse(JSON.stringify(state))})});
    if(body&&body.a==='save')return Promise.resolve({ok:true,json:async()=>({ok:1})});
    return window.territoryFixtureFetch(url,options);
  };
  await cityTerritories.refresh();if(kind==='meeting')cityTerritories.openMeeting();else cityTerritories.open();
  return {supported:true,kind,polygons:TerritoryRules.data.districts.length};
}
module.exports={stageTerritoryScene};
