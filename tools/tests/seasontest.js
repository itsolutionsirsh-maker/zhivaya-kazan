// Сезон «Зима на Баумана»: до сезона — ничего, за 10 дней — анонс, в сезон — задания, опыт, уровни, вещи, вечера, Новый год, мебель дома.
// node seasontest.js <dev> <port> <shotsDir>
const {chromium} = require('playwright');
const {spawn} = require('child_process');
const [DEV, PORT, SHOTS] = [process.argv[2], +process.argv[3] || 8891, process.argv[4]];
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {cwd: DEV, stdio: 'ignore'});
  await sleep(800);
  const b = await chromium.launch(); const errors = [];
  try {
    const pg = await b.newPage({viewport: {width: 1100, height: 760}});
    pg.on('pageerror', e => errors.push(String(e)));
    pg.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errors.push('[console] ' + m.text()); });
    await pg.goto(`http://127.0.0.1:${PORT}/index.html`);
    await pg.waitForFunction('document.querySelector("#loading").hidden === true', null, {timeout: 120000});
    await sleep(600); await pg.fill('#pName', 'Тест'); await pg.click('#startBtn'); await sleep(300);
    try { await pg.click('#howtoClose', {timeout: 2000}); } catch (e) {}
    await sleep(1500);
    await pg.evaluate('PROG.tut={i:99,p:0,end:true,started:true};progSave();');
    const roll = d => pg.evaluate(`(()=>{window.zkTestDay=${d ? `'${d}'` : 'undefined'};PROG.q.day='';questsRoll();return questsToday().map(q=>q.id+(q.season?'❄':''));})()`);
    const card = () => pg.evaluate(`(()=>{openQuests();const t=$('#qSeason').innerText;closeQuests();return t.replace(/\\s+/g,' ').trim();})()`);
    console.log('1) сегодня (октябрь): задания', JSON.stringify(await roll(null)), '| карточка сезона:', JSON.stringify(await card()));
    console.log('2) 25 ноября: задания', JSON.stringify(await roll('2026-11-25')), '| анонс:', JSON.stringify(await card()));
    console.log('3) 3 декабря: задания', JSON.stringify(await roll('2026-12-03')), '| карточка:', JSON.stringify(await card()));
    // задание → опыт
    const q = await pg.evaluate(`(()=>{const m0=player.money;const q=questsToday().find(q=>q.season);questDone(q);const st=seasonState();return {q:q.id,xp:st.xp,lvl:st.lvl,feed:feed[0]&&feed[0].text,money:player.money-m0};})()`);
    console.log('4) сезонное задание выполнено:', JSON.stringify(q));
    // много опыта → уровни, награды, вещи надеты
    const lv = await pg.evaluate(`(()=>{const m0=player.money;seasonXP(1300,'проверка');const st=seasonState();return {lvl:st.lvl,xp:st.xp,money:player.money-m0,inv:invList(),wear:PROG.wear,look:myLook()};})()`);
    console.log('5) +1300 опыта:', JSON.stringify({lvl: lv.lvl, xp: lv.xp, money: lv.money, inv: lv.inv, wear: lv.wear, hat: lv.look.hat, scarf: lv.look.scarf}));
    const fd = await pg.evaluate(`feed.slice(0,4).map(f=>f.text)`); console.log('   лента:', JSON.stringify(fd));
    // окно сезона
    const win = await pg.evaluate(`(()=>{openSeason();const n=document.querySelectorAll('#seasonList .season-lvl').length,got=document.querySelectorAll('#seasonList .season-lvl.got').length;const wearBtns=[...document.querySelectorAll('#seasonList .wear-row .btn')].map(b=>b.textContent);return {title:$('#seasonTitle').textContent,sub:$('#seasonSub').textContent,levels:n,got,wearBtns};})()`);
    console.log('6) окно сезона:', JSON.stringify(win));
    if (SHOTS) await pg.screenshot({path: SHOTS + '/season_modal.png'});
    await pg.evaluate('closeSeason()');
    // надеть шарф с помпоном и очки, посмотреть человечка близко
    await pg.evaluate(`(()=>{invAdd(shopItem('glasses-frost'));wearPut('hat-pompon');wearPut('glasses-frost');invAdd(shopItem('frame-garland'));wearPut('frame-garland');invAdd(shopItem('backpack-ink'));wearPut('backpack-ink');cam.free=false;cam.z=cam.zt=9;})()`);
    await sleep(1200); if (SHOTS) await pg.screenshot({path: SHOTS + '/season_player.png'});
    console.log('7) надето:', JSON.stringify(await pg.evaluate('wornIds()')), '| в сеть уходит:', JSON.stringify(await pg.evaluate('(()=>{const p=buildPresence();return {c:p.c,w:p.w};})()')));
    // снять шапку
    await pg.evaluate(`wearOff('hat')`); console.log('   после «Снять» шапку:', JSON.stringify(await pg.evaluate('myLook().hat||null')));
    await pg.evaluate(`wearPut('hat-ushanka')`);
    // вечера: в понедельник (игровой день 3) в сезон — ёлка вместо обычного сбора на площади Свободы
    const ev = async (day, hour, today) => pg.evaluate(`(()=>{window.zkTestDay='${today}';clock.day=${day};clock.minutes=(${day}-1)*1440+${hour}*60+5;PROG.ev={};const top=feed[0];EVT.t=0;eventsTick(1);const out=[];for(const f of feed){if(f===top)break;out.push(f.text);}return {dow:gameDow(),started:out.filter(t=>/Начинается/.test(t))};})()`);
    console.log('8) 7 декабря, понедельник 20:05:', JSON.stringify(await ev(3, 20, '2026-12-07')));
    console.log('   26 октября, понедельник 20:05:', JSON.stringify(await ev(3, 20, '2026-10-26')));
    console.log('   31 декабря 23:05:', JSON.stringify(await ev(5, 23, '2026-12-31')));
    console.log('   30 декабря 23:05:', JSON.stringify(await ev(5, 23, '2026-12-30')));
    // вечер по точке (at) — далеко от игрока, кварталы там не загружены
    // часы общие и каждый кадр встают по настоящему времени — день недели считаем в том же вызове, где ставим день 3
    await pg.evaluate(`(()=>{clock.day=3;clock.minutes=(3-1)*1440+20*60;cityDaily.push({dow:gameDow(),hour:21,season:'2026-12',xp:60,kind:'meet',title:'Тест по точке',at:[55.81909,48.89666],text:'т',remind:'т',reward:{money:10}});})()`);
    const at = await pg.evaluate(`(()=>{window.zkTestDay='2026-12-07';clock.day=3;clock.minutes=(3-1)*1440+21*60+5;PROG.ev={};EVT.t=0;eventsTick(1);const k=Object.keys(PROG.ev).find(k=>PROG.ev[k].place&&PROG.ev[k].place[2]==='Тест по точке');const p=k&&PROG.ev[k].place;const q=llToXY([55.81909,48.89666]);return p?{x:Math.round(p[0]),y:Math.round(p[1]),ждём:[Math.round(q[0]),Math.round(q[1])]}:'не поставлен';})()`);
    console.log('9) вечер по точке:', JSON.stringify(at));
    // прийти на вечер — награда и опыт
    const came = await pg.evaluate(`(()=>{const k=Object.keys(PROG.ev).find(k=>PROG.ev[k].place&&PROG.ev[k].place[2]==='Тест по точке');const p=PROG.ev[k].place;player.x=p[0];player.y=p[1];const xp0=seasonState().xp,l0=seasonState().lvl;EVT.t=0;eventsTick(1);return {got:!!PROG.ev[k].got,feed:feed[0].text,xp:seasonState().xp-xp0,lvl:seasonState().lvl-l0};})()`);
    console.log('10) пришёл на вечер:', JSON.stringify(came));
    // мебель дома
    await pg.evaluate(`(()=>{invAdd(shopItem('furn-shelf'));invAdd(shopItem('furn-chair'));invAdd(shopItem('furn-lamp'));invAdd(shopItem('furn-rug'));invAdd(shopItem('furn-samovar'));const h=player.home;player.x=h.cx;player.y=h.bb[3]+3;enterInterior({kind:'home',name:'Ваша квартира',key:'home',x:player.x,y:player.y});})()`);
    await sleep(1200); if (SHOTS) await pg.screenshot({path: SHOTS + '/season_home.png'});
    console.log('11) мебель дома:', JSON.stringify(await pg.evaluate('interior.furn.filter(f=>f.own).map(f=>f.own)')));
    await pg.evaluate('exitInterior&&exitInterior()').catch(() => {});
    // краска машины
    console.log('12) краска машины:', JSON.stringify(await pg.evaluate(`(()=>{invAdd(shopItem('car-snow'));wearPut('car-snow');return {own:ownCar&&ownCar.color,item:shopItem('car-snow').color};})()`)));
    // сохранение и перезагрузка — вещи и уровень на месте
    await pg.evaluate('progSave();saveState&&saveState()'); await pg.reload();
    await pg.waitForFunction('document.querySelector("#loading").hidden === true', null, {timeout: 120000}); await sleep(2500);
    console.log('13) после перезагрузки:', JSON.stringify(await pg.evaluate(`({lvl:PROG.season&&PROG.season.lvl,inv:invList().length,wear:wornIds(),car:ownCar&&ownCar.color,look:!!myLook().hat})`)));
    // сезон кончился — опыта нет, вещи остаются
    console.log('14) 2 января:', JSON.stringify(await pg.evaluate(`(()=>{window.zkTestDay='2027-01-02';const n=seasonXP(100);return {xp:n,on:seasonOn(),inv:invList().length,hat:!!myLook().hat};})()`)));
  } finally { await b.close(); srv.kill(); }
  console.log(errors.length ? errors.join('\n') : 'no page errors');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
