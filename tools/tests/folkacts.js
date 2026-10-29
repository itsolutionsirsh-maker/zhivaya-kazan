// Свои люди действуют сами (folk-acts.js): подходят к игроку, и у каждого действия свой выбор и последствия.
// node tools/tests/folkacts.js /tmp/zk-dev 8911
const {chromium} = require('playwright');
const {spawn} = require('child_process');
const DEV = process.argv[2], PORT = +process.argv[3] || 8911;
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {cwd: DEV, stdio: 'ignore'});
  await sleep(800);
  const b = await chromium.launch(); const errors = [];
  try {
    const pg = await b.newPage({viewport: {width: 1200, height: 800}}); pg.on('pageerror', e => errors.push(String(e)));
    const ev = s => pg.evaluate(s);
    await pg.goto(`http://127.0.0.1:${PORT}/index.html`); await pg.waitForFunction('document.querySelector("#loading").hidden === true', null, {timeout: 60000});
    await pg.fill('#pName', 'Тест'); await pg.click('#startBtn'); await sleep(300); await pg.click('#howtoClose'); await sleep(2000);
    const closeCards = () => ev('(()=>{let k=0;while(SIT.card&&k++<6){const c=SIT.card;pickChoice(c,c.choices[c.choices.length-1]);}})()');
    // история новичка (подходит сама после 6 минут в городе) может перебить карточку соседа; у неё свой набор story.js
    await ev(`window.zkNoStory=true;zkSetTime((clock.day-1)*1440+13*60);player.money=20000;FA.t=9999;SIT.timer=1e9;for(let i=0;i<30;i++)folkDistrictTick();`); await closeCards();
    console.log('1) места под открытым небом:', await ev(`(()=>{const ids=new Set(cityFolk3.map(f=>f.id));const L=FOLK.list.filter(f=>ids.has(f.id));const o={};for(const f of L){const pl=f.places.work;const k=pl&&pl.open?'на улице':pl&&pl.inside?'внутри':'?';o[k]=(o[k]||0)+1;}
      const ex=['gabbas','bari','hamit','sariya','arslan'].map(id=>{const f=L.find(q=>q.id===id);return f?id+': '+(f.places.work&&f.places.work.name):id+': нет';});return JSON.stringify({работа:o,пример:ex});})()`));
    // подготовить человека: игрок у его места, дождаться, пока появится, поставить в 8 м
    const ready = async id => { await closeCards(); await ev(`(()=>{const s=sitActive('folkAct');if(s)endSit(s);const f=FOLK.list.find(q=>q.id==='${id}');FA.cool={};f.day=[[0,'work']];f.dayOff=[[0,'work']];if(f.at!=='work'){folkDrop(f);f.trip=null;f.at='work';}const pl=f.places[f.at];player.vehicle=null;player.waypoints=null;player.x=pl.x+6;player.y=pl.y;cam.x=player.x;cam.y=player.y;})()`); await sleep(1600);
      return ev(`(()=>{const f=FOLK.list.find(q=>q.id==='${id}');if(!f.w)return false;f.w.x=player.x+7;f.w.y=player.y;return true;})()`); };
    const onlyAct = () => ev(`(()=>{const a=sitActive('folkAct');let k=0;while(SIT.card&&SIT.card.s!==a&&k++<6){const c=SIT.card;pickChoice(c,c.choices[c.choices.length-1]);}})()`);
    const go = async (id, act) => { if (!await ready(id)) return 'не появился'; await ev(`(()=>{const f=FOLK.list.find(q=>q.id==='${id}');FA.s=startSit('folkAct',{w:f.w,f,act:'${act}'});})()`); await sleep(3500); await onlyAct();
      return ev(`(()=>{const s=sitActive('folkAct');return {d:s&&Math.round(dist(s.w.x,s.w.y,player.x,player.y)*10)/10,t:s&&Math.round(s.t*10)/10,фаза:s&&s.phase,карточка:SIT.card&&SIT.card.text,кнопки:SIT.card&&SIT.card.choices.map(c=>c.t)};})()`); };
    const pickN = async (i, rnd) => { await onlyAct(); return ev(`(()=>{const r=Math.random;${rnd != null ? `Math.random=()=>${rnd};` : ''}pickChoice(SIT.card,SIT.card.choices[${i}]);Math.random=r;})()`); };
    // бомбила: дороже счётчика, торг, поездка за договорённую цену
    console.log('2) бомбила:', JSON.stringify(await go('hamit', 'offer_ride')));
    await pickN(1, 0.1); await sleep(200);
    console.log('   после торга:', JSON.stringify(await ev('SIT.card&&SIT.card.text')));
    const m0 = await ev('player.money'); await pickN(0); await sleep(500);
    console.log('   едем:', JSON.stringify(await ev('player.vehicle&&{kind:player.vehicle.kind,цена:player.vehicle.fixedFare,водитель:player.vehicle.driver,кнопка:currentAction&&currentAction.label}')));
    await ev('exitVehicle()'); await sleep(300); console.log('   вышли: заплатили', m0 - await ev('player.money'));
    // продавец
    console.log('3) продавец:', JSON.stringify(await go('gazinur', 'sell')));
    let st = await ev('({m:player.money,f:player.food})'); await pickN(0); await sleep(200);
    console.log('   купили: деньги', st.m, '→', await ev('player.money'), '| сытость', Math.round(st.f), '→', Math.round(await ev('player.food')));
    // бездомный
    console.log('4) бездомный:', JSON.stringify(await go('bari', 'ask_food')));
    st = await ev('player.rep||0'); await pickN(0); await sleep(200); console.log('   угостили: репутация', st, '→', await ev('player.rep'));
    // блогер: снимает, ролик
    console.log('5) блогер снимает:', JSON.stringify(await go('karim', 'film')), '| снимает:', await ev(`FOLK.list.find(q=>q.id==='karim').w.filming`));
    st = await ev('PROG.fame||0'); await pickN(0); await sleep(300); console.log('   помахали: известность', st, '→', await ev('PROG.fame'), '|', await ev('feed[0].text'));
    // блогер: спор на время
    console.log('6) спор:', JSON.stringify(await go('yana', 'challenge')));
    await pickN(0); await sleep(300); st = await ev('player.money');
    await ev(`(()=>{const r=sitActive('folkAct').race;player.x=r.x+3;player.y=r.y;})()`); await sleep(800);
    console.log('   дошли вовремя: деньги', st, '→', await ev('player.money'), '|', await ev('feed[0].text'));
    // позвать выпить — вечером; отказ
    await ev(`zkSetTime((clock.day-1)*1440+19*60)`);
    // в игровое воскресенье (events.js, сезон хоккея) в 19:00 приходит карточка «Матч «Ак Барса»» и занимает место карточки соседа — закрываем её до начала
    await sleep(800); await closeCards();
    console.log('7) любитель выпить:', JSON.stringify(await go('boris', 'drink_invite')));
    st = await ev('player.drunk||0'); await pickN(1); await sleep(200); console.log('   отказались: опьянение', st, '→', await ev('player.drunk||0'), '(ждём то же)');
    await ev(`zkSetTime(clock.day*1440+13*60)`);
    // жалоба
    console.log('8) бабушка:', JSON.stringify(await go('raisa', 'complain')));
    st = await ev('(PROG.complaints||[]).length'); await pickN(0); await sleep(200); console.log('   обещали передать: жалоб', st, '→', await ev('(PROG.complaints||[]).length'));
    // музыкант
    console.log('9) музыкант:', JSON.stringify(await go('arslan', 'sing')));
    st = await ev('player.money'); await pickN(0); await sleep(200); console.log('   монета: деньги', st, '→', await ev('player.money'));
    // совет — метка на карте
    console.log('10) совет:', JSON.stringify(await go('rashit', 'tip')), '| метка:', await ev(`SIT.marks.has('fa:tip')`));
    await pickN(0); await sleep(200);
    // помочь донести сумку
    console.log('11) помочь донести:', JSON.stringify(await go('nina', 'help_ask')));
    await pickN(0); await sleep(300); st = await ev('player.rep||0');
    await ev(`(()=>{const s=sitActive('folkAct');const h=s.help;player.x=h.x;player.y=h.y;s.w.x=h.x+2;s.w.y=h.y;})()`); await sleep(800);
    console.log('   донесли: репутация', st, '→', await ev('player.rep'), '|', await ev('feed[0].text'));
    // сами: кто-то рядом подходит без подсказки
    await closeCards(); await ev(`(()=>{const s=sitActive('folkAct');if(s)endSit(s);FA.cool={};FA.t=0;})()`);
    await ready('gazinur'); await ev('FA.t=0'); await sleep(4500);
    console.log('12) сам подошёл:', JSON.stringify(await ev(`(()=>{const s=sitActive('folkAct');return s?{кто:s.w.p.name,что:s.act,фаза:s.phase}:null;})()`)));
  } finally { await b.close(); srv.kill(); }
  console.log(errors.length ? errors.join('\n') : 'no page errors');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
