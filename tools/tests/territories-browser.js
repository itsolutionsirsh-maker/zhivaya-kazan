// Local end-to-end test: real account, membership, relocation, encounter, reload, peace, neutral.
// Requires a disposable Node DATA_DIR and a built game, not a static Python server.
// node tools/tests/territories-browser.js http://127.0.0.1:8803 /tmp/territory-browser
'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const url=new URL(process.argv[2]||'http://127.0.0.1:8803'),out=process.argv[3];
if(url.protocol!=='http:'||url.hostname!=='127.0.0.1')throw Error('Disposable loopback server required');
// Встреча не начинается, пока открыта другая карточка («Неделя в Казани», день матча): игрок её бы закрыл — закрываем и мы.
async function waitMeeting(p){for(let k=0;k<45;k++){if(await p.evaluate(()=>{window.zkNoStory=true;let n=0;while(typeof SIT!=='undefined'&&SIT.card&&n++<8){const c=SIT.card;pickChoice(c,c.choices[c.choices.length-1]);}return !document.getElementById('territoryMeeting').hidden;}))return;await p.waitForTimeout(2000);}
  throw new Error('meeting did not start');}
async function openMap(p){await p.click('#menuBtn');await p.click('#territoryBtn');await p.waitForFunction(()=>!document.getElementById('territoryRefresh').disabled);}
async function bounds(p,selector){const result=await p.evaluate(selector=>({overflow:document.documentElement.scrollWidth>innerWidth+1,minTarget:innerWidth<=680?43:28,
  boxes:[...document.querySelectorAll(selector)].filter(el=>el.getClientRects().length).map(el=>{const r=el.getBoundingClientRect();return {text:el.textContent,onScreen:r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1,h:r.height};})}),selector);
  assert.equal(result.overflow,false);for(const box of result.boxes){assert.ok(box.onScreen,box.text);assert.ok(box.h>=result.minTarget,box.text);}return result;}
(async()=>{
  const browser=await chromium.launch(),errors=[],checks=[];if(out)fs.mkdirSync(out,{recursive:true});
  try{
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),p=await context.newPage();
    p.on('pageerror',e=>errors.push(String(e)));await p.goto(url.href);await p.waitForFunction(()=>document.getElementById('loading').hidden,null,{timeout:90000});
    await p.fill('#pName','Тест районов');await p.click('#startBtn');await p.click('#howtoClose');await p.click('#menuBtn');
    await p.waitForSelector('#acctBox:not([hidden])');await p.fill('#acctName','territory-'+Date.now().toString(36));await p.fill('#acctPin','763819');await p.click('#acctGo');await p.waitForSelector('#acctOut:not([hidden])');
    await p.click('#territoryBtn');await p.waitForFunction(()=>!document.getElementById('territoryJoin').disabled);assert.equal(await p.locator('#territoryList button').count(),7);
    checks.push('seven districts, signed-in neutral state');
    await p.click('#territoryJoin');await p.waitForFunction(()=>document.getElementById('territoryStatus').textContent.includes('Хади Такташ'));
    for(const [width,height] of [[360,640],[390,844],[1280,800]]){await p.setViewportSize({width,height});await p.waitForTimeout(400);await bounds(p,'#territoryModal .ui-sheet-close,#territoryModal .ui-sheet-foot button');if(out)await p.screenshot({path:out+'/map-'+width+'.png'});}
    checks.push('membership and map controls fit 360, 390, 1280');await p.setViewportSize({width:390,height:844});
    await p.click('#territoryClose');await p.click('#menuBtn');await p.click('#changeChar');await p.selectOption('#pDistrict',{label:'Адмиралтейская слобода'});await p.click('#startBtn');
    await waitMeeting(p);assert.match(await p.locator('#territoryMeetingTitle').textContent(),/Кировский/);
    assert.match(await p.locator('#territoryPower').textContent(),/70.*96/);checks.push('foreign encounter starts with frozen local advantage');
    const actors=await p.evaluate(()=>walkers.filter(w=>w.sitBy&&w.sitBy.def.id==='territoryActors').map(w=>({x:w.x,y:w.y,inBuilding:!!inBuilding(w.x,w.y)})));
    assert.equal(actors.length,2);assert.ok(actors.every(w=>!w.inBuilding));
    await bounds(p,'#territoryMeeting .ui-sheet-close,#territoryMeetingClose,#territoryChoices button');if(out)await p.screenshot({path:out+'/foreign-meeting.png'});
    await p.getByRole('button',{name:'Поговорить спокойно',exact:true}).click();await p.getByRole('button',{name:'Объяснить: я здесь по своим делам',exact:true}).waitFor();
    await p.reload();await p.getByRole('button',{name:'Объяснить: я здесь по своим делам',exact:true}).waitFor({timeout:90000});checks.push('reload resumes the saved dialogue phase');
    await p.getByRole('button',{name:'Объяснить: я здесь по своим делам',exact:true}).click();await p.waitForFunction(()=>document.getElementById('territoryMeetingText').textContent.includes('Уважение +1'));
    if(out)await p.screenshot({path:out+'/peace.png'});await p.click('#territoryMeetingClose');await openMap(p);
    assert.match(await p.locator('#territoryStatus').textContent(),/уважение 1/);assert.match(await p.locator('#territoryHistory').textContent(),/Уважение \+1/);checks.push('peaceful ending appears in persistent history once');
    await p.click('#territoryLeave');await p.waitForFunction(()=>document.getElementById('territoryStatus').textContent.includes('Нейтральный'));
    await p.click('#territoryClose');await p.reload();await p.waitForFunction(()=>document.getElementById('loading').hidden,null,{timeout:90000});
    await p.waitForFunction(()=>typeof Net!=='undefined'&&Net.syncReady,null,{timeout:90000});await openMap(p);assert.match(await p.locator('#territoryStatus').textContent(),/Нейтральный/);checks.push('leaving and neutral status survive reload');
    assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,checks,errors},null,2));await context.close();
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
