// Прокурор Бирэн абый: приёмная на карте, грузный прокурор за столом, жалоба на штраф, сюжет из пяти шагов, «ушёл сам».
// node tools/tests/prosecutor.js /tmp/zk-dev 8895 /tmp/zk-shots
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const {spawn} = require('child_process');
const DEV = process.argv[2], PORT = +process.argv[3] || 8895, OUT = process.argv[4] || '/tmp';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {cwd: DEV, stdio: 'ignore'});
  await sleep(800);
  const errors = [];
  const b = await chromium.launch();
  try {
    const pg = await b.newPage({viewport: {width: 1100, height: 760}});
    pg.on('pageerror', e => errors.push(String(e)));
    const ev = s => pg.evaluate(s);
    const ok = () => ev('(()=>{let k=0;while(SIT.card&&k++<6){const c=SIT.card;pickChoice(c,c.choices[0]);}return 1;})()');   // закрыть карточки первой кнопкой
    const to = async (x, y) => { await ev(`(()=>{const q=toSidewalk(${x},${y});player.x=q[0];player.y=q[1];cam.x=q[0];cam.y=q[1];})()`); await sleep(1600); };
    await pg.goto(`http://127.0.0.1:${PORT}/index.html`);
    await pg.waitForFunction('document.querySelector("#loading").hidden === true', null, {timeout: 60000});
    await pg.fill('#pName', 'Тест'); await pg.click('#startBtn'); await sleep(300); await pg.click('#howtoClose'); await sleep(1500);
    // будний день, полдень
    await ev(`(()=>{let d=clock.day+1;while(cityWeekday(d)===0||cityWeekday(d)===6)d++;zkSetTime((d-1)*1440+12*60);})()`); await sleep(1500);
    console.log('1) данные:', JSON.stringify(await ev(`(()=>{const D=prosData();return D&&{имя:D.P.name,вид:D.P.look,фраз:D.P.lines.length,шагов:D.T.expose.length,на_карте:world.pois.includes(PROS.poi),значок:POI_GLYPH.prosecutor};})()`)));
    const poi = await ev('[PROS.poi.x,PROS.poi.y]');
    await to(poi[0], poi[1]);
    console.log('2) у здания:', await ev('currentAction?currentAction.label:null'));
    await ev('cam.zt=cam.z=6'); await sleep(800); await pg.screenshot({path: `${OUT}/pros_map.png`});
    await ev(`sitMoney(-1000,'Штраф за безбилетный проезд')`); await ok();
    console.log('3) штраф записан:', JSON.stringify(await ev('prosFine()')));
    await ev('currentAction&&currentAction.run()'); await sleep(800);
    const npc = await ev(`(()=>{const n=interior&&interior.npcs.find(q=>q.role==='prosecutor');return {сцена:scene,вид:interior&&interior.kind,прокурор:n?{имя:n.p.name,сложение:n.p.build,костюм:n.p.clothes,часы:n.p.watch}:null};})()`);
    console.log('4) внутри:', JSON.stringify(npc));
    await ev('player.ix=interior.w/2;player.iy=3.1;cam.zt=cam.z=9'); await sleep(600);
    await pg.screenshot({path: `${OUT}/pros_inside.png`});
    console.log('5) у стола:', await ev('currentAction?currentAction.label:null'));
    await ok(); await ev('currentAction.run()'); await sleep(300);
    console.log('   карточка:', JSON.stringify(await ev('SIT.card&&{title:SIT.card.title,choices:SIT.card.choices.map(c=>c.t)}')));
    const m0 = await ev('player.money');
    await ev('(()=>{const r=Math.random;Math.random=()=>0.97;pickChoice(SIT.card,SIT.card.choices[0]);Math.random=r;})()'); await sleep(300);
    console.log('6) жалоба (повезло):', JSON.stringify(await ev('SIT.card&&{title:SIT.card.title,text:SIT.card.text}')), '| деньги', m0, '→', await ev('player.money'));
    await ok();
    // вторая жалоба — бумаги потерялись, завтра снова
    await ev(`sitMoney(-500,'Штраф за неправильную парковку')`); await ev('player.cool.appeal=0');
    await ev('(()=>{const r=Math.random;Math.random=()=>0.6;prosReception();pickChoice(SIT.card,SIT.card.choices[0]);Math.random=r;})()'); await sleep(200);
    console.log('7) жалоба (потеряли):', JSON.stringify(await ev('SIT.card&&SIT.card.title')), '| можно сейчас снова:', await ev('!!prosFine()'), '(ждём false)');
    await ok();
    await ev('player.iy=interior.h+1;moveInside(0,0.5)'); await sleep(1500);
    console.log('8) вышли, сюжет:', JSON.stringify(await ev('({сцена:scene,on:prosState().on,шаг:prosState().step,метка:SIT.marks.has("pros:go")&&SIT.marks.get("pros:go").label})')));
    await ok();
    // шаг 1: слухи на Баумана
    const bau = await ev(`prosBauPt()`); await to(bau[0], bau[1]);
    await ev(`(()=>{const w=walkers.find(q=>q.role==='resident'&&!q.bus&&!q.inside&&!q.temp);w.x=player.x+1.5;w.y=player.y;w.state='idle';w.ttl=60;})()`); await sleep(1200);
    console.log('9) на Баумана:', JSON.stringify(await ev('({на_улице:PROS.onBau,действие:currentAction&&currentAction.label})')));
    await ev('currentAction&&currentAction.run()'); await sleep(300); await ok(); await sleep(300); await ok();
    // шаг 2: кафе на Баумана, потом рынок
    const cafe = await ev(`(()=>{const c=world.pois.filter(p=>p.t==='cafe'&&p.n&&prosOnBauman(p.x,p.y,40));return c.length?[c[0].x,c[0].y,c[0].n]:null;})()`);
    console.log('10) шаг:', await ev('prosState().step'), '| кафе на Баумана:', cafe && cafe[2]);
    if (cafe) { await to(cafe[0], cafe[1]); await ev(`enterInterior({kind:'cafe',name:${JSON.stringify(cafe[2])},key:poiKey({x:${cafe[0]},y:${cafe[1]}}),x:player.x,y:player.y})`); await sleep(1200);
      console.log('    в кафе:', JSON.stringify(await ev('({фото:prosState().ev.cafe,карточка:SIT.card&&SIT.card.title,метка:SIT.marks.get("pros:go")&&SIT.marks.get("pros:go").label})'))); await ok(); await ev('exitInterior()'); }
    const mk = await ev(`prosLL('market','Колхозный рынок')`); await to(mk[0], mk[1]); await sleep(800);
    console.log('11) рынок:', JSON.stringify(await ev('SIT.card&&SIT.card.title')), '→ шаг', await ev('prosState().step')); await ok(); await sleep(300); await ok();
    // шаг 3: журналист на площади Свободы
    const sq = await ev(`prosLL('square','Площадь Свободы')`); await to(sq[0] + 60, sq[1]); await sleep(1200);
    const j = await ev('PROS.jour&&[PROS.jour.x,PROS.jour.y,PROS.jour.p.job]');
    console.log('12) журналист:', j && j[2]);
    if (j) { await ev(`(()=>{player.x=${j[0]}+1.2;player.y=${j[1]};})()`); await sleep(400); console.log('    действие:', await ev('currentAction&&currentAction.label')); await ev('currentAction&&currentAction.run()'); await sleep(300); await ok(); await sleep(300); await ok(); }
    console.log('    шаг:', await ev('prosState().step'), '(ждём 3 — проверка)');
    assert.equal(await ev('prosState().step'), 3, 'До проверки нужно действительно пройти журналиста');
    // жалоба при журналисте — удовлетворяют
    await ev(`sitMoney(-1500,'Штраф за неправильную парковку')`);
    await to(poi[0], poi[1]); await ev('currentAction&&currentAction.run()'); await sleep(1800);
    console.log('13) приёмная на шаге «проверка»:', JSON.stringify(await ev('({шаг:prosState().step,карточка:SIT.card&&SIT.card.title})')));
    assert.equal(await ev('prosState().step'), 3, 'Один вход не завершает проверку');
    await ev('zkSetTime(clock.minutes+61);player.ix=interior.w/2;player.iy=3.1;prosReception()');
    assert.equal(await ev('prosState().step'), 4, 'Проверка завершена у стола без подмены прогресса');
    await ev('pickChoice(SIT.card,SIT.card.choices[0])'); await sleep(350); // затем открывается настоящий приём
    assert.match(await ev('SIT.card.choices[0].t'), /Подать жалобу/);
    const m1 = await ev('player.money');
    await ev('(()=>{const r=Math.random;Math.random=()=>0.1;pickChoice(SIT.card,SIT.card.choices[0]);Math.random=r;})()'); await sleep(200);
    console.log('    жалоба при журналисте:', JSON.stringify(await ev('SIT.card&&SIT.card.title')), '| деньги', m1, '→', await ev('player.money'), '(при случайности 0,1 без журналиста было бы «отклонили»)');
    assert.equal(await ev('SIT.card.title'), 'Жалобу удовлетворили');
    assert.equal(await ev('player.money'), m1+1500);
    await ok(); await ev('exitInterior()'); await sleep(300);
    // шаг 5: лента на площади — ушёл по собственному желанию
    await to(sq[0], sq[1]); await sleep(1200);
    console.log('14) площадь:', JSON.stringify(await ev('({карточка:SIT.card&&SIT.card.title,шаг:prosState().step,нет_его:prosGone()})'))); await ok();
    assert.equal(await ev('prosState().step'), 5, 'Последний шаг завершается только на площади');
    assert.equal(await ev('prosGone()'), true);
    await to(poi[0], poi[1]); await ev('currentAction&&currentAction.run()'); await sleep(600);
    console.log('15) приёмная после ухода:', JSON.stringify(await ev(`({прокурор:!!interior.npcs.find(q=>q.role==='prosecutor'),действие:(player.ix=interior.w/2,player.iy=3.1,findActionInterior()||{}).label})`)));
    await ev('exitInterior()'); await ev('zkSetTime(clock.minutes+7*1440+60)'); await sleep(1600);
    console.log('16) через неделю:', JSON.stringify(await ev('({нет_его:prosGone(),лента:feed.slice(0,4).map(f=>f.text).filter(t=>/Бирэн/.test(t))})')));
    // разговор без ИИ — его собственные фразы
    await to(poi[0], poi[1]); await ev('currentAction&&currentAction.run()'); await sleep(600);
    await ev(`(()=>{const n=interior.npcs.find(q=>q.role==='prosecutor');openChat(n);document.querySelector('#chatInput').value='Можно решить вопрос?';})()`); await ev('sendChat()'); await sleep(900);
    console.log('17) разговор:', JSON.stringify(await ev(`[...document.querySelectorAll('#chatLog .m')].map(e=>e.textContent)`)), '| в подсказке для ИИ:', await ev(`(()=>{const n=interior.npcs.find(q=>q.role==='prosecutor');return /Бирэн абый, прокурор/.test(contextForNpc(n))&&/Никогда не называй сумм/.test(contextForNpc(n));})()`));
  } finally { await b.close(); srv.kill(); }
  console.log(errors.length ? errors.join('\n') : 'no page errors');
  assert.deepEqual(errors, [], 'Ошибок страницы быть не должно');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
