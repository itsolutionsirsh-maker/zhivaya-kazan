// Жильё получше и с видом (flats.js + housing.js): список в «Работа и жильё», аренда, дом по входу из OSM,
// аренда раз в неделю по цене квартиры, интерьер и вид из окна, сохранение, дальний район, возврат в обычную.
// node tools/tests/housing.js /tmp/zk-dev 8951
const {chromium} = require('playwright');
const {spawn} = require('child_process');
const assert = require('node:assert/strict');
const DEV = process.argv[2], PORT = +process.argv[3] || 8951;
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {cwd: DEV, stdio: 'ignore'});
  await sleep(800);
  const b = await chromium.launch(); const errors = [];
  try {
    const pg = await (await b.newContext({viewport: {width: 390, height: 844}})).newPage();
    pg.on('pageerror', e => errors.push('pageerror: ' + e.message));
    const ev = s => pg.evaluate(s);
    const boot = async first => {
      await pg.waitForFunction('document.querySelector("#loading").hidden === true', null, {timeout: 90000}); await sleep(800);
      if (first) { await pg.fill('#pName', 'Тест'); await pg.click('#startBtn'); await sleep(300); await pg.click('#howtoClose'); }
      await sleep(1500);
    };
    const closeCards = () => ev('(()=>{let k=0;while(SIT.card&&k++<6){const c=SIT.card;pickChoice(c,c.choices[c.choices.length-1]);}})()');
    await pg.goto(`http://127.0.0.1:${PORT}/index.html`); await boot(true); await closeCards();
    // 1) данные и окно
    const d = await ev(`({n:cityFlats.length,tiers:cityFlats.reduce((o,f)=>(o[f.tier]=(o[f.tier]||0)+1,o),{}),canPay:cityPlatform.canPay})`);
    console.log('1) данные:', JSON.stringify(d)); assert.equal(d.n, 30);
    await ev('player.money=60000;openJobs();HOUSING.open=true;renderJobs()'); await sleep(300);
    const ui = await ev(`(()=>{const t=[...document.querySelectorAll('#jobsHome .rt-card b')].map(e=>e.textContent);const btn=[...document.querySelectorAll('#jobsHome button')].map(e=>e.textContent);return {cards:t.length,top:cityFlats.filter(f=>f.tier==='top').some(f=>t.some(x=>x.includes(f.title))),buy:btn.some(x=>/Купить/.test(x)),rent:btn.filter(x=>/^Снять ·/.test(x)).length};})()`);
    console.log('   окно:', JSON.stringify(ui));
    assert.equal(ui.top, false, 'без оплаты квартиры «только купить» не показываем'); assert.equal(ui.buy, false); assert.equal(ui.rent, 24);
    await ev('closeJobs()');
    // 2) снять квартиру с видом на Кремль (Лево-Булачная — в центре, карта загружена)
    const m0 = await ev('player.money');
    const r = await ev(`(()=>{const f=flatById('kremlin-bulachnaya');const ok=housingMove(f,'rent');return {ok,flat:player.flat,home:!!player.home,tag:player.home&&player.home._flat,rentNow:rentNow()};})()`);
    console.log('2) сняли:', JSON.stringify(r), '| деньги', m0, '→', await ev('player.money'));
    assert.equal(r.ok, true); assert.equal(r.home, true); assert.equal(r.tag, 'kremlin-bulachnaya'); assert.equal(r.rentNow, 27000);
    assert.equal(await ev('player.money'), m0 - 27000);
    const near = await ev(`(()=>{const q=llToXY(flatById('kremlin-bulachnaya').ll),h=player.home;const inside=pointInPoly(h.p,q[0],q[1]);let d=1e9;for(let i=0;i<h.p.length;i+=2){const j=(i+2)%h.p.length;const ax=h.p[i],ay=h.p[i+1],dx=h.p[j]-ax,dy=h.p[j+1]-ay;const u=clamp(((q[0]-ax)*dx+(q[1]-ay)*dy)/(dx*dx+dy*dy||1),0,1);d=Math.min(d,Math.hypot(ax+u*dx-q[0],ay+u*dy-q[1]));}return {inside,edge:+d.toFixed(2),levels:h.lv||h.h};})()`);
    console.log('   дом по входу:', JSON.stringify(near)); assert.ok(near.inside || near.edge < 6);
    // 3) неделя аренды списывается по цене квартиры
    const m1 = await ev('player.money=50000');
    await ev('bills.rent=lastDue(0,10)-7'); await sleep(1200);
    console.log('3) неделя:', m1, '→', await ev('player.money'), '| ждём минус 27 000');
    assert.equal(await ev('player.money'), 50000 - 27000);
    // 4) домой: интерьер квартиры, пол по ремонту, вид из окна
    await closeCards();
    await ev(`(()=>{const h=player.home;const q=sidewalkPos(nearestNode(h.cx,h.cy,world.pedAdj,200));player.x=q[0];player.y=q[1];player.waypoints=null;})()`); await sleep(500);
    const act = await ev('currentAction&&currentAction.label'); console.log('4) действие у дома:', act); assert.equal(act, 'Зайти домой');
    await ev('SIT.cool.pipe=sitNow()+99999;HOUSING.lookDay=-1;enterInterior({kind:"home",name:housingHomeName(),key:housingHomeKey(),x:player.x,y:player.y})'); await sleep(1500);
    const it = await ev('({key:interior.key,name:interior.name,floor:interior.floor,card:SIT.card&&SIT.card.title,text:SIT.card&&SIT.card.text})');
    console.log('   внутри:', JSON.stringify(it));
    assert.equal(it.key, 'home:kremlin-bulachnaya'); assert.equal(it.card, 'Вид из окна');
    await closeCards(); await ev('exitInterior()'); await sleep(300);
    // 5) сохранение и перезагрузка
    await ev('saveState()'); await pg.reload(); await boot(false); await closeCards();
    const after = await ev('({flat:player.flat,home:!!player.home,tag:player.home&&player.home._flat,rent:rentNow()})');
    console.log('5) после перезагрузки:', JSON.stringify(after));
    assert.equal(after.flat, 'kremlin-bulachnaya'); assert.equal(after.rent, 27000);
    await sleep(1500); assert.equal(await ev('player.home&&player.home._flat'), 'kremlin-bulachnaya');
    // 6) дальний район: дом ещё не подгружен — точка входа держится, ошибок нет, «Показать дом» работает
    const far = await ev(`(()=>{player.money=60000;const f=cityFlats.find(f=>f.tier==='good'&&f.district!=='koza'&&(()=>{const q=llToXY(f.ll);return Math.hypot(q[0]-player.x,q[1]-player.y)>6000;})());const ok=housingMove(f,'rent');return {id:f.id,ok,home:!!player.home,homeAt:!!player.homeAt,rent:rentNow(),want:f.rentWeek};})()`);
    console.log('6) дальний район:', JSON.stringify(far)); assert.equal(far.ok, true); assert.equal(far.rent, far.want);
    assert.ok(far.home || far.homeAt);
    await ev('saveState()'); assert.equal(await ev('JSON.parse(localStorage.getItem("zk.state")).homeless'), false);
    // 7) назад в обычную квартиру рядом
    const back = await ev(`(()=>{player.flat=null;player.home=null;player.homeAt=null;rentNewHome();return {flat:player.flat,home:!!player.home,rent:rentNow()};})()`);
    console.log('7) обычная:', JSON.stringify(back)); assert.equal(back.flat, null); assert.equal(back.rent, 7000);
    // 8) выселение сбрасывает квартиру
    await ev(`(()=>{housingMove(flatById('oldtown-pushkina'),'rent');evictHome();})()`);
    assert.equal(await ev('player.flat'), null); console.log('8) выселение: квартира сброшена');
  } finally { await b.close(); srv.kill(); }
  console.log(errors.length ? errors.join('\n') : 'no page errors');
  assert.deepEqual(errors, []);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
