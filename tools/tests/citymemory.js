// Город помнит игрока (citymemory.js): поступки за день → «Вечерняя Казань» в 19:00, на следующий день свой человек
// рядом вспоминает вчерашнее, разговор с ИИ знает, что о игроке говорят; прохожие говорят о погоде.
// node tools/tests/citymemory.js /tmp/zk-dev 8961
const {chromium} = require('playwright');
const {spawn} = require('child_process');
const assert = require('node:assert/strict');
const DEV = process.argv[2], PORT = +process.argv[3] || 8961;
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {cwd: DEV, stdio: 'ignore'});
  await sleep(800);
  const b = await chromium.launch(); const errors = [];
  try {
    const pg = await (await b.newContext({viewport: {width: 390, height: 844}})).newPage();
    pg.on('pageerror', e => errors.push('pageerror: ' + e.message));
    const ev = s => pg.evaluate(s);
    await pg.goto(`http://127.0.0.1:${PORT}/index.html`);
    await pg.waitForFunction('document.querySelector("#loading").hidden === true', null, {timeout: 90000}); await sleep(800);
    await pg.fill('#pName', 'Тест'); await pg.click('#startBtn'); await sleep(300); await pg.click('#howtoClose'); await sleep(2500);
    const closeCards = () => ev('(()=>{let k=0;while(SIT.card&&k++<6){const c=SIT.card;pickChoice(c,c.choices[c.choices.length-1]);}})()');
    await closeCards();
    // 1) новичок записан
    await ev('zkSetTime((clock.day-1)*1440+13*60);updateClock(0)'); await sleep(1200);
    const m0 = await ev('({ready:MEM.ready,deeds:memState().deeds.map(d=>d.k)})');
    console.log('1) старт:', JSON.stringify(m0)); assert.equal(m0.ready, true); assert.ok(m0.deeds.includes('newcomer'));
    // 2) поступки за день
    await ev(`(()=>{sitRep(2,'помогли соседям донести сумку');prosNoteFine(500,'Штраф за безбилетный проезд');catchCold();addEvent('Покупка: лоток ягод · Газинур','say');sitRep(5,'вызвали скорую');})()`);
    await closeCards();
    const kinds = await ev('memState().deeds.map(d=>d.k)');
    console.log('2) поступки:', JSON.stringify(kinds));
    for (const k of ['carried', 'fined', 'cold', 'bought', 'helped']) assert.ok(kinds.includes(k), 'нет ' + k);
    // повтор того же за день не копится
    await ev(`sitRep(2,'помогли соседям донести сумку')`); assert.equal(await ev(`memState().deeds.filter(d=>d.k==='carried').length`), 1);
    // 3) вечер: газета
    await ev('zkSetTime((clock.day-1)*1440+19*60+5);updateClock(0)'); await sleep(1800); await closeCards();
    const paper = await ev(`({day:clock.day,paper:memState().paper,issue:memState().issues.slice(-1)[0],feed:feed.filter(f=>/📰/.test(f.text)).map(f=>f.text)})`);
    console.log('3) газета:', JSON.stringify(paper.feed));
    assert.equal(paper.paper, paper.day); assert.ok(paper.issue && paper.issue.items.length >= 2);
    assert.ok(paper.feed.some(t => /«Вечерняя Казань»/.test(t)));
    assert.ok(paper.feed.some(t => /Тест/.test(t)), 'в выпуске есть игрок');
    // второй раз в тот же вечер не выходит
    await sleep(1500); assert.equal(await ev('memState().issues.length'), 1);
    // 4) следующий день: свой человек рядом вспоминает
    await ev('zkSetTime(clock.day*1440+10*60);updateClock(0)'); await sleep(800); await closeCards();
    const who = await ev(`(()=>{const L=llToXY([55.79190,49.11240]);const n=nearestNode(L[0],L[1],world.pedAdj,200);const q=sidewalkPos(n);player.x=q[0];player.y=q[1];player.waypoints=null;cam.x=q[0];cam.y=q[1];
      for(let i=0;i<40;i++)folkDistrictTick();const f=FOLK.list.find(f=>f.id==='gazinur')||FOLK.list.find(f=>f.type);if(!f.w)folkSpawn(f,{x:q[0]+2,y:q[1]});f.w.x=q[0]+2;f.w.y=q[1];f.memDay=0;MEM.talk=0;
      for(const g of FOLK.list)if(g!==f&&g.w&&dist(g.w.x,g.w.y,q[0],q[1])<8)g.memDay=clock.day;return {id:f.id,name:f.name,type:f.type};})()`);
    await sleep(1800);
    const said = await ev(`(()=>{const f=FOLK.list.find(f=>f.id==='${who.id}');return {say:f.w&&f.w.say&&f.w.say.t,feed:feed.slice(0,4).map(e=>e.text),told:(memState().told['${who.id}']||[]).length};})()`);
    console.log('4) слух:', who.name, '|', JSON.stringify(said));
    assert.ok(said.told >= 1, 'свой человек вспомнил вчерашнее'); assert.ok(said.feed.some(t => t.startsWith('💬 ' + who.name)));
    // тот же человек в тот же день повторно не вспоминает
    await ev(`MEM.talk=0`); await sleep(1500); assert.equal(await ev(`(memState().told['${who.id}']||[]).length`), said.told);
    // 5) разговор с ИИ знает, что о игроке говорят
    const ctx = await ev(`folkContext(FOLK.list.find(f=>f.id==='${who.id}').w)`);
    console.log('5) контекст:', ctx.slice(ctx.indexOf('Что в городе')).slice(0, 200));
    assert.match(ctx, /Что в городе говорят о собеседнике/);
    // 6) пропустили вечер — вчерашний выпуск при входе
    await ev(`(()=>{const S=memState();sitRep(1,'поддержали музыканта');})()`);
    await ev('zkSetTime(clock.day*1440+9*60);updateClock(0)'); await sleep(1800); await closeCards();
    const late = await ev(`feed.filter(f=>/Вчерашняя «Вечерняя Казань»/.test(f.text)).length`);
    console.log('6) вчерашний выпуск при входе:', late); assert.ok(late >= 1);
    // улица в форме после «на»
    const on = await ev(`[memOn('улица Баумана'),memOn('Кремлёвская улица'),memOn('Ленинский проспект'),memOn('Большая Красная улица'),memOn('площадь Свободы')].join(' | ')`);
    console.log('   «на …»:', on); assert.equal(on, 'улице Баумана | Кремлёвской улице | Ленинском проспекте | Большой Красной улице | площади Свободы');
    // 7) погода: строка из weather-lines.js для текущего вида
    const wx = await ev(`(()=>{weather.kind='rain';return {kind:memWeatherKind(),line:memWeatherLine()};})()`);
    console.log('7) погода:', JSON.stringify(wx)); assert.ok(wx.kind && wx.line);
    // 8) сохранение: память живёт в PROG
    await ev('progSave()'); assert.ok(await ev(`JSON.parse(localStorage.getItem('zk.prog')).memory.deeds.length>0`));
  } finally { await b.close(); srv.kill(); }
  console.log(errors.length ? errors.join('\n') : 'no page errors');
  assert.deepEqual(errors, []);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
