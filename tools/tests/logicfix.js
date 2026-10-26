// Исправления логики: долг вместо обнуления штрафа, аренда один раз, переезд из квартиры и из машины.
const {chromium} = require('playwright');
const {spawn} = require('child_process');
const DEV = process.argv[2], PORT = 8784;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shown = pg => pg.waitForFunction('document.querySelector("#loading").hidden === true', null, {timeout: 60000});
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {cwd: DEV, stdio: 'ignore'});
  await sleep(800);
  const errors = [];
  const b = await chromium.launch();
  try {
    const pg = await b.newPage({viewport: {width: 1200, height: 800}});
    pg.on('pageerror', e => errors.push(String(e)));
    await pg.goto(`http://127.0.0.1:${PORT}/index.html`); await shown(pg); await sleep(800);
    await pg.fill('#pName', 'Тест'); await pg.click('#startBtn'); await sleep(300); await pg.click('#howtoClose'); await sleep(1000);
    console.log('1) штраф при пустой карте:', await pg.evaluate(`(()=>{player.money=100;ECON.dep=1000;ECON.owed=0;sitMoney(-500,'Штраф');const a={money:player.money,dep:ECON.dep,owed:ECON.owed};sitMoney(-900,'Штраф');return {после_500:a,после_900:{money:player.money,dep:ECON.dep,owed:ECON.owed}};})()`));
    // аренда: день оплаты (день % 7 === 0), 10:30
    await pg.evaluate('player.money=20000;clock.day=7;clock.minutes=6*24*60+10*60+30;'); await sleep(1500);
    const m1 = await pg.evaluate('player.money'); await pg.evaluate('saveState()');
    await pg.reload(); await shown(pg); await sleep(2000);
    await pg.evaluate('clock.day=7;clock.minutes=6*24*60+10*60+40;'); await sleep(1500);
    console.log('2) аренда: после списания', m1, '| после перезагрузки в тот же день', await pg.evaluate('player.money'), '(ждём то же самое)');
    // переезд из квартиры
    await pg.evaluate('(()=>{const h=player.home;player.x=h.cx;player.y=h.bb[3]+3;})()'); await sleep(300);
    await pg.evaluate("enterInterior({kind:'home',name:'Ваша квартира',key:'home',x:player.x,y:player.y})"); await sleep(500);
    const inside = await pg.evaluate('scene');
    const r = await pg.evaluate(`(async()=>{const d=await settleInDistrict('ametevo');const a=homeDistricts().find(q=>q.id==='ametevo');return {d:!!d&&!d.busy,scene,fromCenter:Math.round(dist(player.x,player.y,a.x,a.y)),toHome:Math.round(dist(player.x,player.y,player.home.cx,player.home.cy))};})()`);
    console.log('3) переезд из квартиры: было', inside, '→', JSON.stringify(r), '(ждём city, у нового дома)');
    // за рулём — нельзя
    await pg.evaluate('(()=>{const r=rentals.find(r=>r.kind==="car");player.x=r.x+2;player.y=r.y;})()'); await sleep(400); await pg.keyboard.press('e'); await sleep(400);
    console.log('4) переезд за рулём:', JSON.stringify(await pg.evaluate(`(async()=>{const v=!!player.vehicle;const d=await settleInDistrict('koza');return {вМашине:v,ответ:d};})()`)), '(ждём busy)');
  } finally { await b.close(); srv.kill(); }
  console.log(errors.length ? errors.join('\n') : 'no page errors');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
