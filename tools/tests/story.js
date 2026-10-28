// Истории новичка (story.js): тарелочница и клофелинщики — все развилки и история возмездия до конца.
// A тарелочница: не заплатил — охрана, палата, полиция, свидетель, прокурор, решение и деньги назад, значок.
// B настоял на меню и ушёл — значок «Меня не проведёшь». C позвонил 112 за столом — только чай.
// D клофелинщики: выпил — утро на лавке без денег, банк, полиция, свидетель (бармен), решение.
// E отказался — через 20 минут предложат другую историю.
// node tools/tests/story.js /tmp/zk-dev 8973 [папка для снимков]
const {chromium} = require('playwright');
const {spawn} = require('child_process');
const assert = require('node:assert/strict');
const DEV = process.argv[2], PORT = +process.argv[3] || 8973, SHOTS = process.argv[4];
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {cwd: DEV, stdio: 'ignore'});
  await sleep(800);
  const b = await chromium.launch(); const errors = [];
  try {
    const pg = await (await b.newContext({viewport: {width: 390, height: 844}})).newPage();
    pg.on('pageerror', e => errors.push('pageerror: ' + e.message));
    const ev = (f, a) => pg.evaluate(f, a);
    await pg.goto(`http://127.0.0.1:${PORT}/index.html`);
    await pg.waitForFunction('document.querySelector("#loading").hidden === true', null, {timeout: 90000}); await sleep(800);
    await pg.fill('#pName', 'Тест'); await pg.click('#startBtn'); await sleep(300); await pg.click('#howtoClose'); await sleep(2000);
    await ev(() => { window.zkNoStory = true; let k = 0; while (SIT.card && k++ < 8) { const c = SIT.card; pickChoice(c, c.choices[c.choices.length - 1]); } });
    // выбрать вариант в текущей карточке по тексту кнопки
    const choose = async re => { for (let i = 0; i < 40; i++) { const t = await ev(r => { const c = SIT.card; if (!c) return null; const x = (c.choices || []).find(o => new RegExp(r).test(o.t)); if (!x) return 'нет: ' + c.choices.map(o => o.t).join(' | '); pickChoice(c, x); return x.t; }, re); if (t && !/^нет: /.test(t)) return t; if (i === 39) throw new Error('нет кнопки ' + re + ' — ' + t); await sleep(250); } };
    const card = () => ev(() => SIT.card && {title: SIT.card.title, text: SIT.card.text, choices: SIT.card.choices.map(c => c.t)});
    const at = h => ev(h => { zkSetTime((clock.day - 1) * 1440 + h * 60); }, h);
    // начать историю: человек подходит (подтягиваем поближе), карточка-приглашение, «Пойдём», дошли, зашли
    const begin = async id => {
      await ev(id => { delete PROG.story; const n = nearestNode(0, 0, world.pedAdj, 400); const q = sidewalkPos(n); player.x = q[0]; player.y = q[1]; cam.x = q[0]; cam.y = q[1]; player.money = 10000; storyStart(id); const s = sitActive('story'); s.w.x = player.x + 3; s.w.y = player.y; }, id);
      for (let i = 0; i < 40 && !(await ev(() => !!SIT.card)); i++) await sleep(250);
      const c = await card(); console.log(`  ${id}: подходит —`, JSON.stringify(c).slice(0, 220)); assert.ok(c && /Пойдём/.test(c.choices.join()));
      return c;
    };
    const goInside = async () => {
      await choose('Пойдём');
      if (SHOTS) { await ev(() => { cam.zt = cam.z = 6; }); await sleep(1500); await pg.screenshot({path: SHOTS + '/story_walk.png'}); }
      const v = await ev(() => { const s = sitActive('story'); const v = s.v; player.x = v.x + 2; player.y = v.y; s.w.x = v.x + 3; s.w.y = v.y; companion.arrived = true; const a = SIT.defs.story.action(s); a.run(); return {n: v.n, label: a.label, scene, key: interior && interior.key}; });
      console.log('  зашли:', JSON.stringify(v)); assert.equal(v.scene, 'interior'); assert.ok(/^story:/.test(v.key));
      assert.ok(!(await ev(() => world.pois.some(p => p.n === sitActive('story').v.n))), 'заведение-ловушка выдуманное, на карте его нет');
      for (let i = 0; i < 20 && !(await ev(() => !!SIT.card)); i++) await sleep(250);
      return v;
    };
    const st = () => ev(() => ({st: PROG.story && PROG.story.st, out: PROG.story && PROG.story.out, lost: PROG.story && PROG.story.lost, money: Math.round(player.money), scene, key: interior && interior.key, ach: Object.keys(PROG.ach).filter(k => /^story/.test(k)), feed: feed.slice(0, 3).map(e => e.text)}));
    // после попался: полиция → свидетель → (прокурор) → решение
    const revenge = async id => {
      if (id === 'clofelin') {
        await ev(() => { const p = world.pois.filter(p => p.t === 'bank').sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y))[0]; enterInterior({kind: 'bank', name: p.n || 'Банк', key: poiKey(p), x: player.x, y: player.y}); });
        let a = await ev(() => { const a = sitActionInterior(); a.run(); return a.label; }); console.log('  банк:', a); await choose('полицию'); assert.equal((await st()).st, 'police'); await ev(() => exitInterior());
      }
      await ev(() => { const p = world.pois.filter(p => p.t === 'police').sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y))[0]; enterInterior({kind: 'police', name: p.n || 'Отдел полиции', key: poiKey(p), x: player.x, y: player.y}); });
      let a = await ev(() => { const a = sitActionInterior(); a.run(); return a.label; }); console.log('  полиция:', a, '—', JSON.stringify(await card()).slice(0, 160)); await choose('свидетеля');
      assert.equal((await st()).st, 'witness'); await ev(() => exitInterior());
      await ev(() => { const v = PROG.story.v; player.x = v.x + 1; player.y = v.y; });
      for (let i = 0; i < 20 && !(await ev(() => { const s = sitActive('storyafter'); return !!(s && s.wit); })); i++) await sleep(250);
      a = await ev(() => { const s = sitActive('storyafter'); player.x = s.wit.x + 1; player.y = s.wit.y; const a = SIT.defs.storyafter.action(s); a.run(); return a.label; });
      console.log('  свидетель:', a, '—', JSON.stringify(await card()).slice(0, 160)); await choose('Спасибо');
      if (id === 'plates') {
        assert.equal((await st()).st, 'prosecutor');
        await ev(() => { prosPlace(); const p = world.pois.find(p => p.t === 'prosecutor'); enterInterior({kind: 'prosecutor', name: p.n, key: poiKey(p), x: player.x, y: player.y}); });
        a = await ev(() => { const a = sitActionInterior(); a.run(); return a.label; }); console.log('  прокурор:', a, '—', JSON.stringify(await card()).slice(0, 160)); await choose('решения'); await ev(() => exitInterior());
      }
      assert.equal((await st()).st, 'wait');
      const before = await ev(() => Math.round(player.money)); await ev(() => { PROG.story.at = Date.now(); }); await sleep(1500);
      const s = await st(); console.log('  решение:', JSON.stringify(s)); assert.equal(s.st, 'done'); assert.equal(s.out, 'won');
      assert.ok(s.money - before >= s.lost + 2000, 'деньги вернули с компенсацией'); assert.ok(s.ach.includes('story-win'));
    };

    // A) тарелочница: не платит — охрана, палата, возмездие
    await at(13); console.log('A) тарелочница, отказ платить');
    await begin('plates'); await goInside();
    let c = await card(); console.log('  за столом:', JSON.stringify(c).slice(0, 220)); assert.ok(/Спросить/.test(c.choices.join()));
    if (SHOTS) await pg.screenshot({path: SHOTS + '/story_table.png'});
    await choose('гуляем'); await choose('Дальше');
    if (SHOTS) await pg.screenshot({path: SHOTS + '/story_bill.png'});
    c = await card(); console.log('  счёт:', JSON.stringify(c).slice(0, 260)); assert.ok(/Итого/.test(c.text)); const sum = +c.text.match(/Итого: ([\d\s ]+)/)[1].replace(/\D/g, ''); assert.ok(sum >= 35000 && sum <= 46000, 'счёт 35–46 тыс.: ' + sum);
    await choose('Не буду платить'); await choose('^Не буду$'); await choose('…');
    let s = await st(); console.log('  очнулся:', JSON.stringify(s)); assert.equal(s.key, 'story:ward'); assert.equal(s.money, 0); assert.equal(s.lost, 10000); assert.equal(s.st, 'police');
    await choose('Встать'); await ev(() => exitInterior());
    await revenge('plates');

    // B) настоял на меню и ушёл
    console.log('B) тарелочница, меню с ценами');
    await begin('plates'); await goInside(); await choose('сколько'); c = await card(); console.log('  официант:', c.text); assert.ok(c.text.length > 5);
    await choose('Настоять'); c = await card(); console.log('  меню:', c.text.slice(0, 160)); assert.ok(/₽/.test(c.text)); await choose('уйти');
    s = await st(); console.log('  ушёл:', JSON.stringify(s)); assert.equal(s.out, 'avoided'); assert.equal(s.money, 10000); assert.ok(s.ach.includes('story-dodge')); assert.equal(s.scene, 'city');

    // C) позвонил 112 за столом
    console.log('C) тарелочница, звонок 112');
    await begin('plates'); await goInside(); await choose('гуляем'); await choose('Дальше'); await choose('112'); await choose('чай');
    s = await st(); console.log('  112:', JSON.stringify(s)); assert.equal(s.out, 'called'); assert.equal(s.money, 9400); assert.equal(s.scene, 'city');

    // D) клофелинщики: выпил — лавка, банк, полиция, свидетель, решение
    await at(21); console.log('D) клофелинщики');
    await begin('clofelin'); const v = await goInside(); assert.ok(/бар|паб|рюмочн/i.test(v.n), 'бар: ' + v.n);
    c = await card(); console.log('  тост:', JSON.stringify(c).slice(0, 220)); await choose('Выпить'); await choose('…');
    s = await st(); console.log('  утро:', JSON.stringify(s)); assert.equal(s.scene, 'city'); assert.equal(s.money, 0); assert.equal(s.st, 'bank'); await choose('Встать');
    await revenge('clofelin');

    // E) отказался — позже другая история
    await at(13); console.log('E) отказ');
    await begin('plates'); await choose('другой раз'); s = await ev(() => ({st: PROG.story.st, out: PROG.story.out, later: Math.round((PROG.story.at - Date.now()) / 60000)}));
    console.log('  отказ:', JSON.stringify(s)); assert.equal(s.st, 'later'); assert.ok(s.later >= 19);
    await sleep(6500); assert.equal(await ev(() => !!sitActive('story')), false, 'ушла');
    // официант: «брат» или «сестра» — по имени игрока
    const bro = await ev(() => { const n = player.name; const a = storySub({}).bro; player.name = 'Алия Хасанова'; const b = storySub({}).bro; player.name = n; return [a, b, storyFill('{Bro}, у нас недорого.', storySub({}))]; });
    console.log('  обращение:', JSON.stringify(bro)); assert.deepEqual(bro, ['брат', 'сестра', 'Брат, у нас недорого.']);
  } finally { await b.close(); srv.kill(); }
  console.log(errors.length ? errors.join('\n') : 'no page errors');
  assert.deepEqual(errors, []);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
