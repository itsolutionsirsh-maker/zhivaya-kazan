// Полный прогон, как tools/smoke_test.py: анкета, город, ночь, самокат, каршеринг, ДТП, наезд, кафе, дом, магазин, fps, телефон.
const {chromium} = require('playwright');
const {spawn} = require('child_process');
const DEV = process.argv[2], OUT = process.argv[3], PORT = 8772;
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {cwd: DEV, stdio: 'ignore'});
  await sleep(800);
  const errors = [];
  const b = await chromium.launch();
  try {
    const pg = await b.newPage({viewport: {width: 1400, height: 800}});
    pg.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/404/.test(m.text())) errors.push(`[${m.type()}] ${m.text()}`); });
    pg.on('pageerror', e => errors.push(`[pageerror] ${e}`));
    const ev = s => pg.evaluate(s);
    const key = async k => { await pg.keyboard.press(k); };
    await pg.goto(`http://127.0.0.1:${PORT}/index.html`);
    await pg.waitForFunction('document.querySelector("#loading").hidden === true', null, {timeout: 60000});
    await sleep(1500);
    await pg.fill('#pName', 'Тест'); await pg.click('#startBtn'); await sleep(500); await pg.click('#howtoClose'); await sleep(3000);
    console.log('stats', await ev('({walkers:walkers.length,cars:cars.length,buses:buses.length,rentals:rentals.length,own:!!ownCar,cross:world.crossings.length,home:!!player.home})'));
    await ev('zkSetTime((clock.day-1)*1440+23*60)'); await sleep(1000); await pg.screenshot({path: `${OUT}/f04_night.png`});
    await ev('zkSetTime(clock.day*1440+12*60+30)'); await ev('cam.zt = 7.5'); await sleep(1200); await ev('cam.zt = 4.5');
    // самокат
    await ev('(()=>{const r=rentals.find(r=>r.kind==="scooter");if(r){player.x=r.x+1;player.y=r.y;}})()'); await sleep(600);
    console.log('action near scooter:', await ev('currentAction?currentAction.label:null'));
    await key('e'); await sleep(500);
    await ev('(()=>{const n=world.carNodes[Math.floor(world.carNodes.length/2)];const p=world.nodes[n];driveTo(p[0],p[1]);})()'); await sleep(4000);
    console.log('vehicle:', JSON.stringify(await ev('player.vehicle?{kind:player.vehicle.kind,speed:Math.round(player.vehicle.speed),auto:!!player.vehicle.auto}:null')));
    await key('e'); await sleep(300);
    // каршеринг
    await ev('(()=>{const r=rentals.find(r=>r.kind==="car");if(r){player.x=r.x+2;player.y=r.y;}})()'); await sleep(500);
    console.log('action near car:', await ev('currentAction?currentAction.label:null'));
    await key('e'); await sleep(300); await pg.keyboard.down('w'); await sleep(2500); await pg.keyboard.up('w');
    console.log('vehicle:', JSON.stringify(await ev('player.vehicle?{kind:player.vehicle.kind,speed:Math.round(player.vehicle.speed),onRoad:player.vehicle.onRoad}:null')));
    // ДТП
    await ev('(()=>{const v=player.vehicle;if(!v)return;const c=cars.find(c=>c.kind==="car"&&!c.crashed);c.x=v.x+v.hx*6;c.y=v.y+v.hy*6;c.hx=v.hx;c.hy=v.hy;c.state="idle";c.ttl=99;c.speed=0;c.path=null;v.speed=8;v.auto=null;})()');
    await pg.keyboard.down('w'); await sleep(1500); await pg.keyboard.up('w');
    console.log('after crash:', JSON.stringify(await ev('({cine:!!cine,damaged:player.vehicle?player.vehicle.damaged:null,acc:accidents.length})')));
    await ev('if(player.vehicle){player.vehicle.damaged=0;}'); await sleep(300); await key('e'); await sleep(300);
    // наезд на игрока
    await ev('(()=>{cine=null;player.state="ok";const c=cars.find(c=>c.kind==="car"&&!c.crashed&&c.state==="drive"&&c.speed>4)||cars.find(c=>c.kind==="car"&&!c.crashed);player.x=c.x+c.hx*5;player.y=c.y+c.hy*5;c.speed=10;c.state="drive";})()');
    await sleep(1500);
    console.log('player hit:', JSON.stringify(await ev('({state:player.state,acc:accidents.map(a=>a.kind)})')));
    await ev('player.state="ok";cine=null;cam.zt=4.5');
    // кафе
    await ev('(()=>{const poi=world.pois.find(p=>p.t==="cafe"&&p.n&&poiOpen(p));player.x=poi.x+3;player.y=poi.y;})()'); await sleep(500);
    console.log('action near cafe:', await ev('currentAction?currentAction.label:null'));
    await key('e'); await sleep(1000);
    console.log('interior:', JSON.stringify(await ev('interior?{kind:interior.kind,name:interior.name,npcs:interior.npcs.length}:null')));
    await ev('(()=>{const t=interior.furn.find(f=>f.spot==="table"&&!f.taken);player.ix=t.x;player.iy=t.y+1.5;})()'); await sleep(500);
    console.log('action at table:', await ev('currentAction?currentAction.label:null'));
    await key('e'); await sleep(400);
    console.log('menu:', await ev('[...document.querySelectorAll("#orderList .order-item")].length'));
    const money0 = await ev('player.money');
    await ev('(()=>{const it=[...document.querySelectorAll("#orderList .order-item")].filter(e=>!e.disabled&&!e.classList.contains("off"));if(it.length)it[it.length-1].click();})()'); await sleep(300);
    console.log('paid in cafe:', money0 - await ev('player.money'));
    await ev('player.ix=interior.door.x;player.iy=interior.door.y-0.5'); await sleep(500);
    await key('e'); await sleep(500);
    console.log('scene:', await ev('scene'));
    // дом
    await ev('player.x=player.home.cx;player.y=player.home.cy+(player.home.bb[3]-player.home.cy)+3'); await sleep(500);
    console.log('action near home:', await ev('currentAction?currentAction.label:null'));
    await key('e'); await sleep(800);
    console.log('interior:', await ev('interior?interior.kind:null'));
    // магазин
    await ev('exitInterior();const poi=world.pois.find(p=>p.t==="shop"&&p.n&&poiOpen(p));player.x=poi.x+3;player.y=poi.y;'); await sleep(500);
    await key('e'); await sleep(800);
    console.log('interior:', await ev('interior?interior.kind:null'));
    await ev('exitInterior()');
    const fps = await ev('new Promise(r=>{let n=0;const t0=performance.now();function f(){n++;if(performance.now()-t0>2000)r(n/2);else requestAnimationFrame(f);}requestAnimationFrame(f);})');
    console.log('fps ~', Math.round(fps));
    await pg.setViewportSize({width: 400, height: 760}); await sleep(1000); await pg.screenshot({path: `${OUT}/f13_phone.png`});
    // анкета на телефоне: поле района видно и выбирается
    await ev('showProfile()'); await sleep(300);
    console.log('phone profile: district select visible', await pg.isVisible('#pDistrict'), 'options', await ev('document.querySelectorAll("#pDistrict option").length'));
    await pg.screenshot({path: `${OUT}/f14_phone_profile.png`, fullPage: false});
  } finally { await b.close(); srv.kill(); }
  console.log(errors.length ? errors.join('\n') : 'no console errors (кроме 404 без сервера)');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
