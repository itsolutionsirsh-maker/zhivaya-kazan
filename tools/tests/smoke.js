// Прогон в headless Chromium (node-версия tools/smoke_test.py): ошибки консоли, обучение 👣, жители районов, вечера.
const {chromium} = require('playwright');
const {spawn} = require('child_process');
const DEV = process.argv[2], OUT = process.argv[3], PORT = 8766;
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {cwd: DEV, stdio: 'ignore'});
  await sleep(800);
  const errors = [];
  const b = await chromium.launch();
  try {
    const pg = await b.newPage({viewport: {width: 1400, height: 800}});
    pg.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
    pg.on('pageerror', e => errors.push(`[pageerror] ${e}`));
    await pg.goto(`http://127.0.0.1:${PORT}/index.html`);
    await pg.waitForFunction('document.querySelector("#loading").hidden === true', null, {timeout: 60000});
    await sleep(1500);
    await pg.fill('#pName', 'Тест');
    await pg.click('#startBtn');
    await sleep(500);
    await pg.click('#howtoClose');
    await sleep(3000);
    await pg.screenshot({path: `${OUT}/03_city.png`});
    console.log('stats', await pg.evaluate('({walkers:walkers.length,cars:cars.length,buses:buses.length,cross:world.crossings.length})'));
    console.log('data', await pg.evaluate('({tutorial:(window.cityTutorial||[]).length,folk2:(window.cityFolk2||[]).length,daily:(window.cityDaily||[]).length})'));
    console.log('quest button', await pg.evaluate('document.querySelector("#questBtn").textContent'), '| hint:', await pg.evaluate('(document.querySelector("#hint")||{}).textContent||""'));
    await pg.evaluate('openQuests()');
    await sleep(400);
    await pg.screenshot({path: `${OUT}/04_tutorial.png`});
    const skip = pg.locator('button', {hasText: 'Пропустить обучение'});
    console.log('skip button', await skip.count());
    if (await skip.count()) { await skip.first().click(); await sleep(300); }
    console.log('after skip', await pg.evaluate('({btn:document.querySelector("#questBtn").textContent,end:PROG.tut.end})'));
    // жители районов: встать в центр района из folk2 (в старой карте центра есть vahitovsky, novosavinovsky, moskovsky)
    const before = await pg.evaluate('FOLK.list.length');
    for (const id of ['vahitovsky', 'novosavinovsky', 'moskovsky']) {
      await pg.evaluate(`(()=>{const d=cityDistricts.find(x=>x.id==='${id}');const m=world.meta;player.x=(d.center[1]-m.lon0)*m.mlon;player.y=-(d.center[0]-m.lat0)*m.mlat;})()`);
      await sleep(2500);
    }
    console.log('folk', before, '→', await pg.evaluate('FOLK.list.length'), await pg.evaluate('FOLK.list.filter(f=>(window.cityFolk2||[]).some(x=>x.id===f.id)).map(f=>f.name+"@"+f.district).join(", ")'));
    await pg.screenshot({path: `${OUT}/05_district.png`});
  } finally { await b.close(); srv.kill(); }
  console.log(errors.length ? errors.join('\n') : 'no console errors');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
