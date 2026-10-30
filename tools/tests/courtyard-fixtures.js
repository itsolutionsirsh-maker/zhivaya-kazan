// Screenshot/benchmark fixture only. Runtime has no public setter for shared progress.
async function stageCourtyard({complete=false,night=false,journal=false}={}){
  window.zkNoStory=true;window.zkNoSave=true;
  for(const m of document.querySelectorAll('.modal'))m.hidden=true;
  if(window.cityCourtyard)cityCourtyard.close();
  SIT.card=null;SIT.queue=[];document.getElementById('sitCard').hidden=true;
  scene='city';player.inside=false;player.vehicle=null;player.bus=null;player.busy=false;player.state='ok';player.waypoints=null;
  const p={x:(49.13004924845088-world.meta.lon0)*world.meta.mlon,y:(world.meta.lat0-55.78951724757456)*world.meta.mlat};
  Object.assign(player,{x:p.x+1,y:p.y-1});Object.assign(cam,{x:p.x,y:p.y,z:12,zt:12,free:false});
  zkSetTime((clock.day-1)*1440+(night?23:13)*60);weather.kind='clear';weather.rain=[];
  if(window.cityCourtyard){
    const done={};if(complete)for(const s of CourtyardData.yard.steps)for(let i=0;i<3;i++)done[s.id+':'+i]={at:1};
    const response={ok:1,state:{version:1,rev:complete?18:0,epochs:[0,0,0],done,busy:[],contributors:complete?[{name:'Алсу',count:3},{name:'Булат',count:3},{name:'Карим',count:3}]:[],me:{work:null,today:0,starts:0,limit:3},now:Date.now()}};
    if(!window.__courtyardFetch)window.__courtyardFetch=window.fetch;
    window.fetch=(url,opt)=>{let b;try{b=JSON.parse(opt?.body||'{}');}catch(_){}return String(url).includes('a=courtyard')||b?.a==='courtyard'?Promise.resolve(new Response(JSON.stringify(response),{status:200,headers:{'Content-Type':'application/json'}})):window.__courtyardFetch(url,opt);};
    await cityCourtyard.refresh();if(journal)cityCourtyard.open();
  }
  updateHud();render();return {p,complete,night,journal,supported:!!window.cityCourtyard};
}
module.exports={stageCourtyard};
