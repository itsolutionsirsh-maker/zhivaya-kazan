// Общие часы ×4: две вкладки показывают одно время, дела не перематывают часы, сон только вечером, повтор заработка — через игровые часы, смены без выговора за офлайн.
// node tools/tests/clock.js /tmp/zk-dev 8893
const {chromium} = require('playwright');
const {spawn} = require('child_process');
const DEV = process.argv[2], PORT = +process.argv[3] || 8893;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shown = pg => pg.waitForFunction('document.querySelector("#loading").hidden === true', null, {timeout: 60000});
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {cwd: DEV, stdio: 'ignore'});
  await sleep(800);
  const errors = [];
  const b = await chromium.launch();
  try {
    const open = async name => {
      const ctx = await b.newContext({viewport: {width: 1000, height: 700}});
      const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(name + ': ' + e));
      await pg.goto(`http://127.0.0.1:${PORT}/index.html`); await shown(pg); await sleep(500);
      await pg.fill('#pName', name); await pg.click('#startBtn'); await sleep(300); await pg.click('#howtoClose'); await sleep(800);
      return pg;
    };
    const a = await open('Первый'); await sleep(3000); const c = await open('Второй');
    const t = pg => pg.evaluate('({t:fmtTime(),m:Math.round(clock.minutes*10)/10,day:clock.day})');
    const [ta, tc] = [await t(a), await t(c)];
    console.log('1) две вкладки:', JSON.stringify(ta), JSON.stringify(tc), Math.abs(ta.m - tc.m) < 1 ? 'ОК — одно время' : 'РАЗНОЕ ВРЕМЯ');
    const m0 = (await t(a)).m; await sleep(5000); const m1 = (await t(a)).m;
    console.log('2) за 5 с реального времени прошло игровых минут:', Math.round((m1 - m0) * 10) / 10, '(ждём ≈ 0,33 — скорость ×4)');
    console.log('   кнопки скорости нет:', await a.evaluate('!document.querySelector("#speedBtn")'));
    // дела не двигают часы, но тратят силы
    const r = await a.evaluate(`(()=>{const m=clock.minutes,e=player.energy;spendTime(120);return {сдвиг:Math.round(clock.minutes-m),энергия:Math.round((e-player.energy)*10)/10};})()`);
    console.log('3) «два часа дела»:', JSON.stringify(r), '(ждём сдвиг 0, энергия −10,2)');
    // сон
    await a.evaluate('zkSetTime((clock.day-1)*1440+13*60);player.energy=60;'); await sleep(300);
    const s1 = await a.evaluate('sleep(8)');
    await a.evaluate('zkSetTime((clock.day-1)*1440+22*60);'); await sleep(300);
    const s2 = await a.evaluate('sleep(8)');
    await a.evaluate('zkSetTime((clock.day-1)*1440+14*60);player.energy=20;'); await sleep(300);
    const s3 = await a.evaluate('sleep(8)');
    console.log('4) сон: днём бодрым', s1, '| в 22:00', s2, '| днём без сил', s3, '(ждём false, true, true)');
    // повтор заработка
    const w = await a.evaluate(`(()=>{player.cool={};const x=busyFor('pc',180),y=busyFor('pc',180);return {первый:x,сразу:y};})()`);
    await a.evaluate('zkSetTime(clock.minutes+181)'); await sleep(300);
    console.log('5) работа за компьютером:', JSON.stringify(w), '| через 3 ч:', await a.evaluate(`busyFor('pc',180)`), '(ждём true, false, true)');
    // смены: 2 часа, без выговора, если игрока не было
    const job = await a.evaluate(`(()=>{const v={id:'barista',J:Object.assign({},WORK.barista),p:world.pois.find(p=>p.t==='cafe'&&p.n)};if(!v.p)return 'нет кафе';hire(v);const j=player.job;
      const out={длина:j.len};j.done=false;j.present=0;j.inGame=5;shiftEnd(j,true);out.офлайн_выговоров=j.strikes;
      j.done=false;j.present=0;j.inGame=100;shiftEnd(j,false);out.прогул_выговоров=j.strikes;return out;})()`);
    console.log('6) смена:', JSON.stringify(job), '(ждём длина 2, офлайн 0, прогул 1)');
    // сохранение не уносит часы
    await c.evaluate('saveState()'); await c.reload(); await shown(c); await sleep(1500);
    const [ta2, tc2] = [await t(a), await t(c)];
    await a.evaluate('clockOff=0'); await sleep(300);
    const [ta3, tc3] = [await t(a), await t(c)];
    console.log('7) после перезагрузки второй вкладки:', JSON.stringify(tc2), '| первая (без перевода часов):', JSON.stringify(ta3), Math.abs(ta3.m - tc2.m) < 2 ? 'ОК' : 'РАЗНОЕ ВРЕМЯ');
  } finally { await b.close(); srv.kill(); }
  console.log(errors.length ? errors.join('\n') : 'no page errors');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
