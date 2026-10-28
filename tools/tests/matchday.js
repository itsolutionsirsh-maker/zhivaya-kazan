// День матча (fans.js + matchday.js): до начала у арены толпа в шарфах клуба и реплики из fans.js, подъезды стоят;
// во время игры тихо; после свистка — расходятся с репликами после матча; вне окна и вдали от арены — никого.
// Арены на тестовой карте центра нет — площадку «переносим» к Баумана, расписание и клубы настоящие.
// node tools/tests/matchday.js /tmp/zk-dev 8971
const {chromium} = require('playwright');
const {spawn} = require('child_process');
const assert = require('node:assert/strict');
const DEV = process.argv[2], PORT = +process.argv[3] || 8971;
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
    await pg.fill('#pName', 'Тест'); await pg.click('#startBtn'); await sleep(300); await pg.click('#howtoClose'); await sleep(2000);
    const closeCards = () => ev('(()=>{let k=0;while(SIT.card&&k++<6){const c=SIT.card;pickChoice(c,c.choices[c.choices.length-1]);}})()');
    await closeCards();
    // 1) данные
    const d = await ev(`(()=>{const fx=cityFixtures.filter(f=>f.kind==='match');return {clubs:cityFans.clubs.map(c=>c.id),venues:cityFans.venues.map(v=>v.id),matches:fx.length,covered:fx.filter(f=>matchClub(f)&&matchVenue(f)).length};})()`);
    console.log('1) данные:', JSON.stringify(d)); assert.equal(d.covered, d.matches);
    // площадка к Баумана, подъезд — улица Пушкина; первый футбольный матч «Рубина»
    const m = await ev(`(()=>{const v=cityFans.venues.find(v=>v.id==='akbars-arena');v.ll=[55.79190,49.11240];v.gather=[{name:'у Кота Казанского',ll:[55.79240,49.11180]}];v.approach=['улица Пушкина'];
      const f=cityFixtures.find(f=>f.kind==='match'&&matchVenue(f)===v&&matchClub(f).id==='rubin');window.__f=f;window.zkTestNow=matchKickoff(f)-60*60000;
      const q=llToXY(v.ll);const n=nearestNode(q[0]+20,q[1],world.pedAdj,200);const p=sidewalkPos(n);player.x=p[0];player.y=p[1];cam.x=p[0];cam.y=p[1];player.waypoints=null;
      return {title:f.title,date:f.date,time:f.time};})()`);
    console.log('   матч:', JSON.stringify(m));
    // 2) за час до начала: толпа, шарфы, реплики клуба, пробка
    await sleep(9000);
    const before = await ev(`(()=>{const r=MATCH.rallies;const ppl=r.flatMap(x=>x.people);const c=cityFans.clubs.find(c=>c.id==='rubin');
      return {phase:MATCH.phase,rallies:r.length,people:ppl.length,scarves:ppl.filter(w=>w.p.scarf).length,clubColors:ppl.filter(w=>c.colors.includes(w.p.scarf)).length,
        chants:r[0]&&r[0].chants===c.lines,jam:MATCH.jam.length,mark:SIT.marks.has('match'),feed:feed.filter(e=>/🏟/.test(e.text)).map(e=>e.text)};})()`);
    console.log('2) до начала:', JSON.stringify(before));
    if (process.argv[4]) { await ev('cam.zt=cam.z=5.5'); await sleep(600); await pg.screenshot({path: process.argv[4]}); }
    assert.equal(before.phase, 'before'); assert.ok(before.rallies >= 1); assert.ok(before.people >= 6, 'люди идут к арене');
    assert.ok(before.clubColors >= Math.floor(before.people * 0.6), 'шарфы цветов клуба'); assert.ok(before.chants);
    assert.ok(before.jam >= 1, 'подъезд стоит'); assert.equal(before.mark, false, 'рядом — подпись толпы, без второй метки'); assert.ok(before.feed.some(t => /болельщики идут на матч/.test(t)));
    // 3) игра: у арены тихо
    await ev('window.zkTestNow=matchKickoff(__f)+20*60000'); await sleep(2600);
    const game = await ev(`({phase:MATCH.phase,rallies:MATCH.rallies.length,feed:feed[0].text})`);
    console.log('3) игра:', JSON.stringify(game)); assert.equal(game.phase, 'game'); assert.equal(game.rallies, 0);
    // 4) после свистка: расходятся с репликами после матча
    await ev('window.zkTestNow=matchKickoff(__f)+(115+5)*60000'); await sleep(4000);
    const after = await ev(`(()=>{const c=cityFans.clubs.find(c=>c.id==='rubin'),o=matchOutcome(__f);return {phase:MATCH.phase,rallies:MATCH.rallies.length,outcome:o,afterLines:MATCH.rallies[0]&&MATCH.rallies[0].chants===c.after[o],feed:feed.filter(e=>/свисток/.test(e.text)).length};})()`);
    console.log('4) после:', JSON.stringify(after)); assert.equal(after.phase, 'after'); assert.ok(after.rallies >= 1); assert.ok(after.afterLines); assert.equal(after.feed, 1);
    // 5) окно закончилось: никого, пробки нет, метки нет
    await ev('window.zkTestNow=matchKickoff(__f)+(115+40)*60000'); await sleep(2600);
    const done = await ev(`({key:MATCH.key,rallies:MATCH.rallies.length,jam:world.roads.filter(r=>r.jam).length,mark:SIT.marks.has('match')})`);
    console.log('5) после окна:', JSON.stringify(done)); assert.equal(done.rallies, 0); assert.equal(done.jam, 0); assert.equal(done.mark, false);
    // 6) далеко от арены — толпы нет, пробка есть
    await ev(`(()=>{window.zkTestNow=matchKickoff(__f)-30*60000;const v=cityFans.venues.find(v=>v.id==='akbars-arena');v.ll=[55.8224,49.1627];})()`); await sleep(2600);
    const far = await ev(`({phase:MATCH.phase,rallies:MATCH.rallies.length})`);
    console.log('6) вдали от арены:', JSON.stringify(far)); assert.equal(far.phase, 'before'); assert.equal(far.rallies, 0);
    assert.equal(await ev(`SIT.marks.has('match')`), true, 'вдали — метка со стрелкой к арене');
  } finally { await b.close(); srv.kill(); }
  console.log(errors.length ? errors.join('\n') : 'no page errors');
  assert.deepEqual(errors, []);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
