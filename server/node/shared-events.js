// Общие события рядом: что видят все игроки в радиусе.
// Сейчас — ДТП с участием игрока. Его браузер сообщает место, сервер проверяет и раздаёт всем, клиент сам рисует аварию у того, кто рядом.
// Проверки: игрок сам стоит у места (по координатам, которые он шлёт через WebSocket), не в помещении, не чаще раза в 10 минут;
// аварии рядом друг с другом (150 м, до 5 минут) сливаются в одну; всего не больше 30 сразу; живёт 10 минут.
// Текст от игрока не принимается вовсе: название улицы клиент берёт из своей карты, реплики — из shared-events.js.
// Матчи и праздники сюда не входят: у всех одни и те же fixtures.js и fans.js, время — московское.
'use strict';
function SharedEvents(o){o=o||{};const now=o.now||(()=>Date.now());
  const L=Object.assign({ttl:10*60e3,near:150,perPlayer:10*60e3,max:30,merge:150,mergeAge:5*60e3,bound:60000},o.limits||{});
  const list=[],last=new Map();let seq=0;
  function prune(){const t=now();for(let i=list.length-1;i>=0;i--)if(list[i].until<=t)list.splice(i,1);
    for(const [k,v] of last)if(t-v>=L.perPlayer)last.delete(k);}
  // p — игрок на сервере {id,x,y,room}; d — сообщение {t:'sev',k:'incident',x,y,ped}
  function report(p,d){prune();const t=now();if(!d||d.k!=='incident')return {err:'kind'};
    const x=+d.x,y=+d.y;if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>L.bound||Math.abs(y)>L.bound)return {err:'xy'};
    if(!p||!p.id||p.room||!Number.isFinite(p.x)||!Number.isFinite(p.y)||Math.hypot(p.x-x,p.y-y)>L.near)return {err:'far'};
    const lt=last.get(p.id);if(lt!==undefined&&t-lt<L.perPlayer)return {err:'often'};
    const same=list.find(e=>Math.hypot(e.x-x,e.y-y)<L.merge&&t-e.at<L.mergeAge);
    if(same){last.set(p.id,t);same.until=Math.max(same.until,t+L.ttl);same.n++;return {ok:1,e:same,merged:1};}
    if(list.length>=L.max)return {err:'full'};
    last.set(p.id,t);const e={id:'i'+(++seq).toString(36)+'-'+(t%2176782336).toString(36),k:'incident',x:Math.round(x*10)/10,y:Math.round(y*10)/10,ped:!!d.ped,at:t,until:t+L.ttl,n:1,by:p.id};
    list.push(e);return {ok:1,e};}
  // игрокам: без того, кто сообщил; время — сколько секунд прошло и сколько осталось (часы у всех разные)
  function snapshot(){prune();const t=now();return list.map(e=>({id:e.id,k:e.k,x:e.x,y:e.y,ped:e.ped,age:Math.round((t-e.at)/1000),left:Math.round((e.until-t)/1000)}));}
  // модератору: снять одну аварию или все
  function clear(id){const n=list.length;for(let i=list.length-1;i>=0;i--)if(!id||list[i].id===id)list.splice(i,1);return n-list.length;}
  return {report,snapshot,clear,count:()=>{prune();return list.length;},LIM:L};}
module.exports={SharedEvents};
