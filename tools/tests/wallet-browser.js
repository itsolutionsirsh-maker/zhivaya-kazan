// Серверный кошелёк в игре (wallet.js + server/node/wallet.js) на своём локальном Node-сервере с чистой базой.
// Гость с деньгами создаёт аккаунт — деньги переносятся; смена — доходит до сервера; читерская сумма — сервер не засчитывает;
// потерянный ответ — повтор операции не начисляет второй раз; вклад — те же деньги; перезагрузка и второе устройство —
// деньги с сервера; начисление модератора приходит в игру; «Начать заново» — стартовые; устаревшая вкладка ничего не проводит.
// Сборка: python3 tools/dev_build.py /tmp/zk-dev && python3 -I tools/split_map.py site/kazan.json /tmp/zk-dev/map
// Тест:   node tools/tests/wallet-browser.js /tmp/zk-dev 8983
const {chromium} = require('playwright');
const {spawn} = require('child_process');
const assert = require('node:assert/strict');
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const DEV = path.resolve(process.argv[2] || '/tmp/zk-dev'), PORT = +process.argv[3] || 8983, BASE = `http://127.0.0.1:${PORT}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'zk-wallet-')), MOD = crypto.randomBytes(20).toString('hex');
const api = (a, body, head) => fetch(`${BASE}/api.php`, {method: 'POST', headers: Object.assign({'Content-Type': 'application/json'}, head || {}), body: JSON.stringify(Object.assign({a}, body))}).then(r => r.json());
(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '../../server/node/server.js')], {env: Object.assign({}, process.env, {GAME_DIR: DEV, DATA_DIR: DATA, PORT: String(PORT), MOD_TOKEN: MOD, TG_BOT_TOKEN: '', LLM_API_KEY: ''}), stdio: ['ignore', 'pipe', 'pipe']});
  let srvLog = ''; srv.stdout.on('data', d => { srvLog += d; }); srv.stderr.on('data', d => { srvLog += d; });
  for (let i = 0; i < 40; i++) { try { if ((await api('ping', {})).ok) break; } catch (e) {} await sleep(250); }
  const b = await chromium.launch(); const errors = [];
  const NAME = 'Кошелёк' + crypto.randomBytes(2).toString('hex'), PIN = '4321';
  const ready = pg => pg.waitForFunction('document.querySelector("#loading").hidden === true', null, {timeout: 90000});
  const open = async (label, fresh) => {
    const pg = await (await b.newContext({viewport: {width: 390, height: 844}})).newPage();
    pg.on('pageerror', e => errors.push(label + ' pageerror: ' + e.message)); pg.on('dialog', d => d.accept());
    await pg.goto(BASE + '/'); await ready(pg); await sleep(800);
    if (fresh) { await pg.fill('#pName', label); await pg.click('#startBtn'); await sleep(300); await pg.click('#howtoClose'); await sleep(1500); }
    await pg.evaluate(() => { let k = 0; while (SIT.card && k++ < 6) { const c = SIT.card; pickChoice(c, c.choices[c.choices.length - 1]); } });
    return pg;
  };
  const synced = pg => pg.waitForFunction('Net.syncReady && WAL.who && !WAL.busy', null, {timeout: 30000});
  const st = pg => pg.evaluate(() => ({money: player.money, dep: ECON.dep || 0, total: walletLocal(), bal: WAL.bal, pend: WAL.pend.length, feed: feed.slice(0, 4).map(e => e.text).filter(t => /🏦/.test(t))}));
  const server = async () => { const j = await api('mod', {do: 'wallet', name: NAME}, {'X-Mod-Token': MOD}); assert.ok(j.ok, JSON.stringify(j)); return j; };
  try {
    // 1) гость накопил 12 000 и создал аккаунт: деньги перенеслись на сервер
    const A = await open('Алсу', true);
    assert.equal(await A.evaluate('Net.wallet'), true, 'сервер с кошельком');
    await A.evaluate(([n, p]) => { player.money = 12000; saveState(); return acctLogin(n, p); }, [NAME, PIN]); await synced(A);
    let s = await st(A), w = await server();
    console.log('1) перенос:', JSON.stringify(s), 'сервер', w.bal); assert.equal(w.bal, 12000); assert.equal(s.total, 12000); assert.equal(w.ops[0].kind, 'init');
    // 2) смена: +2400 уходит операцией вместе с сохранением
    await A.evaluate(() => { sitMoney(2400, '💼 Смена: бариста'); return acctSave(); });
    s = await st(A); w = await server(); console.log('2) смена:', JSON.stringify(s), 'сервер', w.bal);
    assert.equal(w.bal, 14400); assert.equal(s.pend, 0); assert.equal(s.total, 14400);
    // 3) миллион из консоли: сервер засчитывает только остаток потолка за 10 минут (смена из п. 2 — уже в нём), карта поправляется
    await A.evaluate(() => { player.money += 1000000; return acctSave(); });
    s = await st(A); w = await server(); console.log('3) читерская сумма:', JSON.stringify(s), 'сервер', w.bal);
    assert.equal(w.bal, 12000 + 60000); assert.equal(s.total, w.bal); assert.ok(s.feed.some(t => /не засчитал/.test(t)));
    // 4) ответ потерялся: та же операция пришла трижды — проведена один раз
    const op = await A.evaluate(() => { player.money -= 700; walletStage(); return WAL.pend[0]; });
    const tok = await A.evaluate('acct.token'), who = await A.evaluate('WAL.who');
    await api('wallet', {token: tok, who, ops: [op]}); await api('wallet', {token: tok, who, ops: [op]});
    await A.evaluate(() => acctSave()); s = await st(A); w = await server(); console.log('4) повтор операции:', JSON.stringify(s), 'сервер', w.bal);
    assert.equal(w.bal, 72000 - 700); assert.equal(s.total, w.bal); assert.equal(s.pend, 0);
    // 4б) связи нет: пока операция ни разу не уходила, новые изменения дописываются в неё же
    const merged = await A.evaluate(() => { player.money += 100; walletStage(); player.money += 50; walletStage(); return WAL.pend.map(o => o.amt); });
    await A.evaluate(() => { player.money -= 150; return acctSave(); }); console.log('4б) без связи копится одна операция:', JSON.stringify(merged)); assert.deepEqual(merged, [150]);
    s = await st(A); w = await server(); assert.equal(w.bal, 71300); assert.equal(s.total, 71300);
    // 5) положили на вклад — денег столько же, операций нет
    await A.evaluate(() => { player.money -= 10000; ECON.dep = (ECON.dep || 0) + 10000; return acctSave(); });
    s = await st(A); w = await server(); console.log('5) вклад:', JSON.stringify(s)); assert.equal(s.dep, 10000); assert.equal(w.bal, 71300); assert.equal(s.total, 71300);
    // 6) потратили и сразу перезагрузили: операция ушла при закрытии (sendBeacon), после запуска повтор не начисляет второй раз
    await A.evaluate(() => { player.money -= 300; });
    await A.reload(); await ready(A); await sleep(1000); await A.evaluate(() => acctSave()); await synced(A);
    s = await st(A); w = await server(); console.log('6) после перезагрузки:', JSON.stringify(s), 'сервер', w.bal); assert.equal(w.bal, 71000); assert.equal(s.total, 71000); assert.equal(s.dep, 10000);
    // 7) второе устройство: вход по имени и PIN — деньги с сервера; трата там доходит до сервера
    const B = await open('Гость', true);
    await B.evaluate(([n, p]) => acctLogin(n, p), [NAME, PIN]).catch(() => {});   // загрузит игру с сервера и перезапустится
    await sleep(1500); await ready(B); await sleep(1000); await synced(B);
    s = await st(B); console.log('7) второе устройство:', JSON.stringify(s)); assert.equal(s.total, 71000);
    await B.evaluate(() => { sitMoney(-1000, 'Кофе'); return acctSave(); }); w = await server(); assert.equal(w.bal, 70000);
    // 8) модератор начислил — в игре строка «Зачислено»
    const g = await api('mod', {do: 'grant', name: NAME, amt: 777, why: 'компенсация', id: 'mtest0001'}, {'X-Mod-Token': MOD});
    await api('mod', {do: 'grant', name: NAME, amt: 777, why: 'компенсация', id: 'mtest0001'}, {'X-Mod-Token': MOD});
    await B.evaluate(() => acctSave()); s = await st(B); console.log('8) модератор:', g.bal, JSON.stringify(s));
    assert.equal(g.bal, 70777); assert.equal(s.total, 70777); assert.ok(s.feed.some(t => /Зачислено на карту: 777/.test(t.replace(/\s/g, ' '))));
    // 9) старая вкладка A: сохранение отвергнуто (на сервере новее) — её деньги не проводятся
    await A.evaluate(() => { player.money += 5000; return acctSave(); }); w = await server();
    console.log('9) устаревшая вкладка:', w.bal, await A.evaluate('Net.syncReady')); assert.equal(w.bal, 70777);
    // 10) «Начать заново» на втором устройстве — на сервере и в игре стартовые
    await B.evaluate(() => { const b = document.querySelector('#resetBtn'); b.click(); b.click(); });
    await sleep(1500); await ready(B); await sleep(800);
    await B.evaluate(() => { let k = 0; while (SIT.card && k++ < 6) { const c = SIT.card; pickChoice(c, c.choices[c.choices.length - 1]); } });
    if (await B.evaluate('!!document.querySelector("#startBtn") && !document.querySelector("#profileModal").hidden')) { await B.fill('#pName', 'Заново'); await B.click('#startBtn'); await sleep(300); await B.click('#howtoClose').catch(() => {}); }
    await B.evaluate(() => acctSave()); await synced(B); s = await st(B); w = await server();
    console.log('10) начать заново:', JSON.stringify(s), 'сервер', w.bal); assert.equal(w.bal, 3000); assert.equal(s.total, 3000);
  } finally { await b.close(); srv.kill(); fs.rmSync(DATA, {recursive: true, force: true}); }
  console.log(errors.length ? errors.join('\n') : 'no page errors');
  assert.deepEqual(errors, []);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
