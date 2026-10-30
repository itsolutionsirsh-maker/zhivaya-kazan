// Выход из помещения пешком через дверь (джойстик, клавиши, нажатие ниже двери), пока внутри ходят люди.
// Раньше: шаг за дверь закрывал помещение, а в том же кадре жители ещё двигались по уже закрытой комнате — ошибка,
// и весь цикл игры вставал: экран замирал на комнате, E «Выйти на улицу» не работала (жалоба Иршата, 30.10, «Кряшен»).
// Проверка: вышли — город, кадры идут, ошибок нет; и что любая ошибка в кадре больше не останавливает игру.
// node tools/tests/interior-exit-browser.js <сборка> [порт, 8978]
const {chromium}=require('playwright');
const {spawn}=require('child_process');
const DEV=process.argv[2],PORT=+process.argv[3]||8978;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let fails=0;const check=(ok,msg)=>{console.log((ok?'OK  ':'FAIL')+' '+msg);if(!ok)fails++;};
(async()=>{
  const srv=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{cwd:DEV,stdio:'ignore'});await sleep(800);
  const b=await chromium.launch();const errors=[];
  try{
    const pg=await b.newPage({viewport:{width:1200,height:860}});
    pg.on('pageerror',e=>errors.push(String(e)));pg.on('console',m=>{if(m.type()==='error'&&!/404|Failed to load resource/.test(m.text()))errors.push(m.text());});
    const ev=s=>pg.evaluate(s);
    await pg.goto(`http://127.0.0.1:${PORT}/index.html`);await pg.waitForFunction('document.querySelector("#loading").hidden===true',null,{timeout:60000});await sleep(500);
    await pg.fill('#pName','Тест');await pg.click('#startBtn');await sleep(400);await pg.click('#howtoClose');await sleep(1500);
    await ev(`window.zkNoStory=true;let k=0;while(SIT.card&&k++<8){const c=SIT.card;pickChoice(c,c.choices[c.choices.length-1]);}SIT.timer=1e9;`);
    // любое здание с названием рядом со стартом: встать у него и зайти
    const enter=()=>pg.evaluate(()=>{const bs=world.buildings.filter(b=>b.n).sort((a,c)=>dist(a.cx,a.cy,player.x,player.y)-dist(c.cx,c.cy,player.x,player.y));
      for(const b of bs.slice(0,40)){for(let a=0;a<32;a++){const an=a/32*Math.PI*2;for(let R=4;R<80;R+=2){const x=b.cx+Math.cos(an)*R,y=b.cy+Math.sin(an)*R;if(inBuilding(x,y))continue;
        player.x=x;player.y=y;updateHud();if(currentAction&&/^Зайти в «/.test(currentAction.label)){currentAction.run();return {name:interior&&interior.name,npcs:interior&&interior.npcs.length};}break;}}}return null;});
    const crowd=()=>ev(`(()=>{const it=interior;let n=0;for(const q of it.npcs){q.wander=true;q.t=0;n++;}if(!n){const w=new Walker('resident',nearestNode(player.x,player.y,world.pedAdj,200));it.npcs.push({p:w.p,x:it.w/2,y:it.h/2,hx:0,hy:1,phase:0,role:'resident',isInterior:true,state:'idle',memory:[],wander:true,t:0});}return it.npcs.length;})()`);
    const alive=async()=>{const a=await ev('clock.minutes');await sleep(1200);return (await ev('clock.minutes'))>a;};
    // 1) клавиша «вниз» через дверь
    let r=await enter();check(r&&r.name,'зашли: '+JSON.stringify(r));await crowd();
    await ev(`player.ix=interior.door.x;player.iy=interior.h-0.8;player.iwp=null;`);await pg.keyboard.down('s');await sleep(900);await pg.keyboard.up('s');
    check(await ev('scene')==='city','вниз через дверь — на улице');check(await alive(),'игра идёт дальше (время в игре бежит)');
    // 2) нажатие ниже двери — идёт сам и выходит
    r=await enter();await crowd();
    await ev(`player.ix=interior.door.x;player.iy=interior.h-1.2;player.iwp=[interior.door.x,interior.h+1.2];`);await sleep(1500);
    check(await ev('scene')==='city','нажали ниже двери — вышли');check(await alive(),'игра идёт дальше');
    // 3) E у двери
    r=await enter();await crowd();await ev(`player.ix=interior.door.x;player.iy=interior.h-0.6;updateHud();`);
    check(/Выйти на улицу/.test(await ev('currentAction&&currentAction.label')||''),'у двери — «Выйти на улицу»');
    await pg.keyboard.press('e');await sleep(600);check(await ev('scene')==='city','E — на улице');
    await ev('exitInterior()');check(await alive(),'лишний выход на улице ничего не ломает');
    check(!errors.length,'без ошибок'+(errors.length?': '+errors.slice(0,3).join(' | '):''));
    // 4) если в кадре всё же упадёт ошибка — игра не замирает
    await ev(`(()=>{const o=updateClock;let n=0;window.updateClock=updateClock=function(){if(n++<3)throw new Error('проверка');return o.apply(this,arguments);};})()`);
    check(await alive(),'ошибка в кадре не останавливает игру');
  }catch(e){console.log('FAIL',e.message);fails++;}
  finally{await b.close();srv.kill();}
  console.log(fails?`FAILED ${fails}`:'ALL OK');process.exit(fails?1:0);
})();
