// Два настоящих браузера на локальном Node-сервере (не production): встречаются в одном кафе, видят друг друга
// внутри, слышат реплику; соседнее кафе и улица отделены; после выхода гость пропадает из комнаты.
// Сервер:  GAME_DIR=/tmp/zk-dev DATA_DIR=/tmp/zk-data PORT=8982 node server/node/server.js
// Тест:    node tools/tests/shared-venues-browser.js http://127.0.0.1:8982
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const BASE = process.argv[2] || 'http://127.0.0.1:8982';
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+\/?$/.test(BASE)) { console.error('только локальный сервер'); process.exit(2); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch(); const errors = [];
  const open = async name => {
    const pg = await (await b.newContext({viewport: {width: 390, height: 844}})).newPage();
    pg.on('pageerror', e => errors.push(name + ' pageerror: ' + e.message));
    await pg.goto(BASE.replace(/\/$/, '') + '/');
    await pg.waitForFunction('document.querySelector("#loading").hidden === true', null, {timeout: 90000}); await sleep(800);
    await pg.fill('#pName', name); await pg.click('#startBtn'); await sleep(300); await pg.click('#howtoClose'); await sleep(2500);
    await pg.evaluate(() => { let k = 0; while (SIT.card && k++ < 6) { const c = SIT.card; pickChoice(c, c.choices[c.choices.length - 1]); } zkSetTime((clock.day - 1) * 1440 + 13 * 60); });
    return pg;
  };
  try {
    const A = await open('Алина'), B = await open('Булат');
    const mode = await A.evaluate('Net.mode'); console.log('сеть:', mode);
    // одно открытое кафе в центре; оба входят через обычное действие у входа
    const cafe = await A.evaluate(`(()=>{const c=world.pois.filter(p=>p.t==='cafe'&&p.n&&(typeof poiOpen!=='function'||poiOpen(p))).sort((a,b)=>Math.hypot(a.x,a.y)-Math.hypot(b.x,b.y));return c.slice(0,2).map(p=>({x:p.x,y:p.y,n:p.n}));})()`);
    const enter = (pg, c) => pg.evaluate(c => { player.x = c.x + 3; player.y = c.y; player.waypoints = null; updateHud(); const a = currentAction; if (a && /Зайти/.test(a.label)) a.run(); return {scene, room: interior && interior.room, name: interior && interior.name}; }, c);
    const ra = await enter(A, cafe[0]); await sleep(300); const rb = await enter(B, cafe[0]);
    console.log('1) вошли:', JSON.stringify(ra), JSON.stringify(rb));
    assert.equal(ra.scene, 'interior'); assert.ok(ra.room); assert.equal(ra.room, rb.room, 'одна комната');
    await A.evaluate('player.ix=4;player.iy=4;pushPresence()'); await sleep(2500);
    const seen = await B.evaluate(`[...peerRender.values()].filter(sharedPeerHere).map(p=>({n:p.name||p.n||'',ix:Math.round(p.ix),iy:Math.round(p.iy)}))`);
    console.log('2) Булат видит в кафе:', JSON.stringify(seen)); assert.equal(seen.length, 1); assert.equal(seen[0].ix, 4);
    // реплика вслух — слышна в этом кафе
    await A.evaluate(`sayAloud('Привет из кафе!')`); await sleep(2500);
    const heard = await B.evaluate(`[...peerRender.values()].filter(sharedPeerHere).map(p=>p.say&&p.say.t)`);
    console.log('3) Булат слышит:', JSON.stringify(heard)); assert.ok(heard.some(t => /Привет из кафе/.test(t || '')));
    // Булат уходит в соседнее кафе — Алина его больше не видит
    await B.evaluate('exitInterior()'); await sleep(300); await enter(B, cafe[1]); await sleep(2500);
    const aSees = await A.evaluate(`[...peerRender.values()].filter(sharedPeerHere).length`);
    console.log('4) после перехода Булата в другое кафе Алина видит в своём:', aSees); assert.equal(aSees, 0);
    // Булат возвращается на улицу; Алина выходит — на улице видят друг друга как обычно
    await B.evaluate('exitInterior()'); await A.evaluate('exitInterior()'); await sleep(2500);
    const street = await A.evaluate(`[...peerRender.values()].length`);
    console.log('5) на улице игроков рядом:', street); assert.ok(street >= 1);
  } finally { await b.close(); }
  console.log(errors.length ? errors.join('\n') : 'no page errors');
  assert.deepEqual(errors, []);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
