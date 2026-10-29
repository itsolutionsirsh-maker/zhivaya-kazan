// Real UI + real API on disposable localhost. Movement is a fixture; dialogue/state are not mocked.
// node tools/tests/yard-story-browser.js http://127.0.0.1:8807 /tmp/yard-browser
'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const url=new URL(process.argv[2]||'http://127.0.0.1:8807'),out=process.argv[3];
if(url.protocol!=='http:'||url.hostname!=='127.0.0.1')throw Error('Disposable loopback DATA_DIR required');
async function open(p){await p.waitForFunction(()=>typeof Net!=='undefined'&&Net.syncReady&&!player.busy,null,{timeout:90000});await p.click('#menuBtn');await p.click('#yardStoryBtn');await p.waitForFunction(()=>!cityTerritories.connection().pending&&cityTerritories.snapshot());}
async function move(p,person){
  const place=await p.evaluate(person=>{const s=cityYardStory.snapshot(),id=person?YardStory.people[person].place:YardStory.step(s).place,q=YardStory.point(id,world.meta);
    Object.assign(player,q,{waypoints:null,vehicle:null,bus:null,inside:false,state:'ok',waitingStop:null});cam.x=q.x;cam.y=q.y;return id;},person);
  await p.waitForFunction(id=>{const q=YardStory.point(id,world.meta);return nearestNode(q.x,q.y,world.pedAdj,75)>=0;},place);
  await p.evaluate(async id=>{const q=YardStory.point(id,world.meta),n=nearestNode(q.x,q.y,world.pedAdj,75),w=walkers.find(w=>w.sitBy&&w.sitBy.def.id==='yardCast'&&dist(w.x,w.y,q.x,q.y)<80);player.x=w?w.x:q.x;player.y=w?w.y:q.y;saveState();pushPresence();
    await fetch('api.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({a:'sync',id:myCid,p:buildPresence()})});},place);
}
async function fit(p){return p.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,controls:[...document.querySelectorAll('#yardModal .ui-sheet-close,#yardModal .ui-sheet-foot button')].filter(e=>e.getClientRects().length).map(e=>{const r=e.getBoundingClientRect();return {text:e.textContent,h:r.height,inside:r.x>=-1&&r.y>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1};})}));}
(async()=>{
  const b=await chromium.launch(),checks=[];if(out)fs.mkdirSync(out,{recursive:true});
  try{for(const ending of ['home','away','bridge']){
    const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(String(e)));
    await p.goto(url.href);await p.waitForSelector('#loading',{state:'hidden',timeout:90000});await p.fill('#pName','Тест двора');await p.click('#startBtn');await p.click('#howtoClose');
    await p.click('#menuBtn');await p.fill('#acctName','yard-ui-'+ending+'-'+Date.now().toString(36));await p.fill('#acctPin','763819');await p.click('#acctGo');await p.waitForSelector('#acctOut:not([hidden])');
    await p.click('#yardStoryBtn');await p.getByRole('button',{name:'Откликнуться и найти Тимура',exact:true}).click();
    await p.waitForFunction(()=>cityYardStory.snapshot()?.stage==='promise');
    assert.equal(await p.getByRole('button',{name:'Помогу турниру. Сторону пока не выбираю',exact:true}).isEnabled(),false,'must visit location');
    for(const label of ['Помогу турниру. Сторону пока не выбираю','Смешать опытных с новичками','Выслушать и самому помочь с площадкой','Помочь Руслану закрепить сетку']){
      await move(p);const stage=await p.evaluate(()=>cityYardStory.snapshot().stage);await p.getByRole('button',{name:label,exact:true}).click();await p.waitForFunction(stage=>cityYardStory.snapshot()?.stage!==stage,stage);
    }
    await p.reload();await p.waitForSelector('#loading',{state:'hidden',timeout:90000});await open(p);assert.match(await p.textContent('#yardTitle'),/Ты теперь с ними/);
    for(const [width,height] of [[360,640],[390,844],[844,390],[1280,800]]){await p.setViewportSize({width,height});await p.waitForTimeout(400);const g=await fit(p);assert.equal(g.overflow,false);assert.ok(g.controls.every(c=>c.inside&&c.h>=43),JSON.stringify(g));if(out)await p.screenshot({path:out+'/'+ending+'-choice-'+width+'.png'});}
    await p.getByRole('button',{name:{home:'Вернуться и выступить за двор Тимура',away:'Остаться и выступить с Артуром',bridge:'Собрать общую игру как независимый организатор'}[ending],exact:true}).click();
    await p.waitForFunction(()=>cityYardStory.snapshot()?.stage==='finale');await move(p);
    const label=ending==='bridge'?'Завершить независимо · выйти из группировки, если состою':ending==='home'?'Вступить в «Хади Такташ» и завершить':'Вступить в «Киноплёнка» и завершить';
    await p.getByRole('button',{name:label,exact:true}).click();await p.waitForFunction(()=>cityYardStory.snapshot()?.stage==='done');
    assert.equal(await p.evaluate(()=>cityYardStory.snapshot().ending),ending);if(out)await p.screenshot({path:out+'/'+ending+'-ending.png'});
    await p.locator('#yardContacts summary').click();await p.getByRole('button',{name:'Найти: Руслан',exact:true}).click();await move(p,'ruslan');
    await p.getByRole('button',{name:'Поговорить после турнира',exact:true}).click();await p.waitForFunction(()=>cityYardStory.snapshot()?.visits.ruslan);
    await p.reload();await p.waitForSelector('#loading',{state:'hidden',timeout:90000});await open(p);assert.ok(await p.evaluate(()=>cityYardStory.snapshot().visits.ruslan));
    assert.deepEqual(errors,[]);checks.push(ending+': UI choices, reload, four viewport sizes, ending, reunion');await ctx.close();
  }}finally{await b.close();}
  console.log(JSON.stringify({checks,ok:true},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
