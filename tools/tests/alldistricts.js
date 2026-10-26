// Старт в каждом районе, который попадает в карту центра: дом найден, игрок не в здании, рядом жители; ориентиры из landmarks.js на месте.
const {chromium} = require('playwright');
const {spawn} = require('child_process');
const DEV = process.argv[2], PORT = 8769;
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {cwd: DEV, stdio: 'ignore'});
  await sleep(800);
  const errors = [];
  const b = await chromium.launch();
  try {
    const pg = await b.newPage({viewport: {width: 1200, height: 800}});
    pg.on('pageerror', e => errors.push(`[pageerror] ${e}`));
    pg.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errors.push(`[error] ${m.text()}`); });
    await pg.goto(`http://127.0.0.1:${PORT}/index.html`);
    await pg.waitForFunction('document.querySelector("#loading").hidden === true', null, {timeout: 60000});
    await sleep(1000);
    await pg.fill('#pName', 'Тест'); await pg.click('#startBtn'); await sleep(400); await pg.click('#howtoClose');
    const ids = await pg.evaluate('homeDistricts().map(d=>d.id)');
    for (const id of ids) {
      const r = await pg.evaluate(`(async()=>{const d=homeDistricts().find(q=>q.id==='${id}');
        const sp=(window.cityHomeSpots||[]).filter(s=>s.district==='${id}');const used=sp.filter(s=>{const q=llToXY(s.ll);return dist(q[0],q[1],d.x,d.y)<2500;}).length;
        const res=await settleInDistrict('${id}');if(!res)return {id:'${id}',fail:true};
        return {id:'${id}',name:d.name,spots:sp.length,used,fromCenter:Math.round(dist(player.x,player.y,d.x,d.y)),home:player.home?Math.round(dist(player.home.cx,player.home.cy,player.x,player.y)):null,inB:!!inBuilding(player.x,player.y),near:walkers.filter(w=>dist(w.x,w.y,player.x,player.y)<400).length};})()`);
      console.log(JSON.stringify(r));
    }
    console.log('landmarks', await pg.evaluate(`(()=>{const L=window.cityLandmarks||[];const f=n=>L.find(x=>x.name===n);return {count:L.length,cum:f('ЦУМ')&&f('ЦУМ').ll,kul:!!f('Мечеть Кул-Шариф'),market:!!f('Колхозный рынок')};})()`));
  } finally { await b.close(); srv.kill(); }
  console.log(errors.length ? errors.join('\n') : 'no page errors');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
