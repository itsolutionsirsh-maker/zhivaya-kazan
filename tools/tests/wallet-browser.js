// Серверный кошелёк в игре (wallet.js + server/node/wallet.js) на своём локальном Node-сервере с чистой базой.
// 1 гость с деньгами создаёт аккаунт — деньги на сервере; 2 смена доходит; 3 читерская сумма не засчитана;
// 4 ответ на сохранение потерялся — после «Играть здесь» деньги не задвоены; 5 вклад — те же деньги;
// 6 потратили и закрыли вкладку — дошло; 7 второе устройство; 8 начисление модератора; 9 устаревшее устройство
// тратит и закрывается — не проводится; 10 оно же открывается снова — деньги с сервера; 11 кредит на устаревшем
// устройстве — ни денег, ни долга; 12 «Начать заново» на одном устройстве, а на другом висел заработок прежней игры;
// 13 старая версия игры сохраняет без кошелька — сервер считает разницу; 14 «Начать заново» без связи — ничего не стёрто.
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
  // PIN только из цифр (раньше проверка формата была закомментирована и аккаунт создавался с пустым PIN)
  for (const pin of ['', 'abcd', '12']) assert.equal((await api('login', {name: 'Пин' + crypto.randomBytes(2).toString('hex'), pin})).err, 'pin', 'PIN «' + pin + '»');
  const b = await chromium.launch(); const errors = [];
  const NAME = 'Кошелёк' + crypto.randomBytes(2).toString('hex'), PIN = '4321';
  const clearCards = pg => pg.evaluate(() => { let k = 0; while (typeof SIT !== 'undefined' && SIT.card && k++ < 6) { const c = SIT.card; pickChoice(c, c.choices[c.choices.length - 1]); } });
  // ждём, пока страница (в том числе после одной-двух перезагрузок) загрузится и получит баланс сервера
  const settle = async (pg, label) => {
    for (let i = 0; i < 240; i++) {
      let s = null; try { s = await pg.evaluate(() => { const l = document.querySelector('#loading'); if (!l || !l.hidden) return 'load'; if (!document.querySelector('#profileModal').hidden) return 'profile'; return Net.syncReady && WAL.bal !== null && !Net.saving ? 'ok' : 'wait'; }); } catch (e) {}
      if (s === 'profile') { await pg.fill('#pName', label).catch(() => {}); await pg.click('#startBtn').catch(() => {}); await sleep(300); await pg.click('#howtoClose').catch(() => {}); }
      if (s === 'ok') { await clearCards(pg); return; }
      await sleep(500);
    }
    throw new Error(label + ': не дождались синхронизации');
  };
  const open = async label => {
    const pg = await (await b.newContext({viewport: {width: 390, height: 844}})).newPage();
    pg.on('pageerror', e => errors.push(label + ' pageerror: ' + e.message)); pg.on('dialog', d => d.accept());
    await pg.goto(BASE + '/'); await pg.waitForFunction('document.querySelector("#loading").hidden === true', null, {timeout: 90000}); await sleep(800);
    await pg.fill('#pName', label); await pg.click('#startBtn'); await sleep(300); await pg.click('#howtoClose'); await sleep(1500); await clearCards(pg);
    return pg;
  };
  const login = async (pg, label) => { await pg.evaluate(([n, p]) => acctLogin(n, p), [NAME, PIN]).catch(() => {}); await sleep(1500); await settle(pg, label); };
  const st = pg => pg.evaluate(() => ({money: player.money, dep: ECON.dep || 0, total: walletLocal(), bal: WAL.bal, pend: WAL.pend.length, ready: Net.syncReady, loan: !!ECON.loan, feed: feed.slice(0, 4).map(e => e.text).filter(t => /🏦/.test(t))}));
  const server = async () => { const j = await api('mod', {do: 'wallet', name: NAME}, {'X-Mod-Token': MOD}); assert.ok(j.ok, JSON.stringify(j)); return j; };
  const save = pg => pg.evaluate(() => acctSave());
  try {
    // 1) гость накопил 12 000 и создал аккаунт: стартовые + деньги гостя (под потолок заработка)
    const A = await open('Алсу');
    assert.equal(await A.evaluate('Net.wallet'), true, 'сервер с кошельком');
    await A.evaluate(() => { player.money = 12000; saveState(); }); await login(A, 'Алсу');
    let s = await st(A), w = await server();
    console.log('1) аккаунт из гостя:', JSON.stringify(s), 'сервер', w.bal); assert.equal(w.bal, 12000); assert.equal(s.total, 12000);
    assert.deepEqual(w.ops.map(o => o.kind).sort(), ['init', 'local']);
    // 2) смена: +2400 уходит вместе с сохранением
    await A.evaluate(() => { sitMoney(2400, '💼 Смена: бариста'); }); await save(A);
    s = await st(A); w = await server(); console.log('2) смена:', JSON.stringify(s), 'сервер', w.bal); assert.equal(w.bal, 14400); assert.equal(s.pend, 0); assert.equal(s.total, 14400);
    // 3) миллион из консоли: засчитан только остаток потолка за 10 минут (деньги гостя и смена — уже в нём)
    await A.evaluate(() => { player.money += 1000000; }); await save(A);
    s = await st(A); w = await server(); console.log('3) читерская сумма:', JSON.stringify(s), 'сервер', w.bal);
    assert.equal(w.bal, 3000 + 60000); assert.equal(s.total, w.bal); assert.ok(s.feed.some(t => /не засчитал/.test(t)));
    // 4) ответ на сохранение потерялся: сервер провёл −700, устройство об этом не знает. Следующее сохранение — «на сервере новее»,
    // «Играть здесь» — игра с сервера, −700 ровно один раз
    await A.evaluate(() => { const real = acctCall; window.acctCall = async (a, body) => { const r = await real(a, body); if (a === 'save') { window.acctCall = real; throw new Error('ответ потерялся'); } return r; }; player.money -= 700; });
    await save(A); w = await server(); assert.equal(w.bal, 62300, 'сервер провёл');
    await save(A); assert.equal(await A.evaluate('Net.syncReady'), false, 'следующее — конфликт');
    await A.evaluate(() => document.querySelector('#otherDevGo').click()); await sleep(1500); await settle(A, 'Алсу');
    s = await st(A); w = await server(); console.log('4) потерянный ответ:', JSON.stringify(s), 'сервер', w.bal); assert.equal(w.bal, 62300); assert.equal(s.total, 62300);
    // 5) положили на вклад — денег столько же
    await A.evaluate(() => { player.money -= 10000; ECON.dep = (ECON.dep || 0) + 10000; }); await save(A);
    s = await st(A); w = await server(); console.log('5) вклад:', JSON.stringify(s)); assert.equal(s.dep, 10000); assert.equal(w.bal, 62300); assert.equal(s.total, 62300);
    // 6) потратили и сразу закрыли/перезагрузили: ушло с сохранением при закрытии (sendBeacon)
    await A.evaluate(() => { player.money -= 300; }); await A.reload(); await sleep(1500); await settle(A, 'Алсу');
    s = await st(A); w = await server(); console.log('6) закрытие вкладки:', JSON.stringify(s), 'сервер', w.bal); assert.equal(w.bal, 62000); assert.equal(s.total, 62000); assert.equal(s.dep, 10000);
    // 7) второе устройство: вход по имени и PIN — деньги с сервера; трата там доходит
    const B = await open('Гость'); await login(B, 'Гость');
    s = await st(B); console.log('7) второе устройство:', JSON.stringify(s)); assert.equal(s.total, 62000);
    await B.evaluate(() => { sitMoney(-1000, 'Кофе'); }); await save(B); w = await server(); assert.equal(w.bal, 61000);
    // 8) модератор начислил (двойной клик — один раз) — в игре «Зачислено»
    const g = await api('mod', {do: 'grant', name: NAME, amt: 777, why: 'компенсация', id: 'mtest0001'}, {'X-Mod-Token': MOD});
    await api('mod', {do: 'grant', name: NAME, amt: 777, why: 'компенсация', id: 'mtest0001'}, {'X-Mod-Token': MOD});
    await save(B); s = await st(B); console.log('8) модератор:', g.bal, JSON.stringify(s));
    assert.equal(g.bal, 61777); assert.equal(s.total, 61777); assert.ok(s.feed.some(t => /Зачислено на карту: 777/.test(t.replace(/\s/g, ' '))));
    // 9) устаревшее устройство A тратит 4000 и закрывается: его сохранение отвергнуто — и трата не проведена
    await A.evaluate(() => { player.money -= 4000; }); await A.goto('about:blank'); await sleep(1500);
    w = await server(); console.log('9) устаревшее устройство закрылось:', w.bal); assert.equal(w.bal, 61777);
    // 10) A открывается снова: игра и деньги — с сервера
    await A.goto(BASE + '/'); await settle(A, 'Алсу'); s = await st(A); console.log('10) A снова открыта:', JSON.stringify(s)); assert.equal(s.total, 61777);
    // 11) кредит на устаревшем устройстве B (A теперь новее): сохранение отвергнуто, следующий тик берёт игру с сервера — ни денег, ни долга
    await B.evaluate(() => { ECON.loan = {sum: 30000, left: 33000, daily: 1100, over: 0, day: clock.day}; player.money += 30000; }); await save(B);
    assert.equal(await B.evaluate('Net.syncReady'), false); await save(B).catch(() => {}); await sleep(1500); await settle(B, 'Гость');
    s = await st(B); w = await server(); console.log('11) кредит на устаревшем:', JSON.stringify(s), 'сервер', w.bal); assert.equal(w.bal, 61777); assert.equal(s.total, 61777); assert.equal(s.loan, false);
    // 12) на A висит заработок (сохранение отвергнуто: B новее), на B «Начать заново»; A — «Играть здесь»: стартовые, без старых денег
    await A.evaluate(() => { player.money += 20000; }); await save(A); assert.equal(await A.evaluate('Net.syncReady'), false);
    await B.evaluate(() => { const x = document.querySelector('#resetBtn'); x.click(); x.click(); }); await sleep(1500); await settle(B, 'Заново');
    await A.evaluate(() => document.querySelector('#otherDevGo').click()); await sleep(1500); await settle(A, 'Алсу');
    await save(A); s = await st(A); w = await server(); const sb = await st(B);
    console.log('12) начать заново:', JSON.stringify(s), JSON.stringify(sb), 'сервер', w.bal); assert.equal(w.bal, 3000); assert.equal(s.total, 3000); assert.equal(sb.total, 3000);
    // 13) старая версия игры (открыта во время обновления) сохраняет без поля wallet: её траты сервер считает сам — разницей
    await A.evaluate(() => { window.__wo = walletOut; window.walletOut = () => undefined; player.money -= 1000; }); await save(A);
    await A.evaluate(() => { window.walletOut = window.__wo; }); w = await server(); s = await st(A);
    console.log('13) старая версия:', w.bal, JSON.stringify(s)); assert.equal(w.bal, 2000); assert.equal(s.total, 2000);
    // 14) «Начать заново» без связи с сервером: здесь ничего не стёрто, игра идёт дальше
    await A.evaluate(() => { player.money -= 500; window.__ac = acctCall; window.acctCall = async (a, body) => a === 'reset' ? {err: 'busy'} : window.__ac(a, body); const x = document.querySelector('#resetBtn'); x.click(); x.click(); });
    await sleep(800); const rf = await A.evaluate(() => ({money: player.money, noSave: !!window.zkNoSave, state: !!localStorage.getItem('zk.state')})); await A.evaluate(() => { window.acctCall = window.__ac; });
    console.log('14) сброс без связи:', JSON.stringify(rf)); assert.equal(rf.noSave, false); assert.equal(rf.state, true); assert.equal(rf.money, 1500);
    await save(A); w = await server(); assert.equal(w.bal, 1500, 'игра продолжилась, трата дошла');
  } finally { await b.close(); srv.kill(); fs.rmSync(DATA, {recursive: true, force: true}); }
  const wl = srvLog.split('\n').filter(l => /кошел|ошибк/i.test(l)); if (wl.length) console.log(wl.join('\n'));
  console.log(errors.length ? errors.join('\n') : 'no page errors');
  assert.deepEqual(errors, []);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
