// «Пара во дворе» (второй программист, 6069c39): Айзат и Данил из folk3 с do:['yard_ask'] — «сотку на район».
// Отдать 100 — минус 100, разошлись; не отдать или закрыть карточку — минус 300, настроение −6 (за отказ — репутация −1).
// Сам подходит только на работе с 14 до 23. Проверка — что карточка и деньги ровно такие, как задумано, и без ошибок.
// node tools/tests/yard-ask-browser.js <сборка> [порт, 8974]
const {chromium}=require('playwright');
const {spawn}=require('child_process');
const DEV=process.argv[2],PORT=+process.argv[3]||8974;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let fails=0;const check=(ok,msg)=>{console.log((ok?'OK  ':'FAIL')+' '+msg);if(!ok)fails++;};
(async()=>{
  const srv=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{cwd:DEV,stdio:'ignore'});await sleep(800);
  const b=await chromium.launch();const errors=[];
  try{
    const pg=await b.newPage({viewport:{width:390,height:844}});
    pg.on('pageerror',e=>errors.push(String(e)));pg.on('console',m=>{if(m.type()==='error'&&!/404|Failed to load resource/.test(m.text()))errors.push(m.text());});
    const ev=s=>pg.evaluate(s);
    await pg.goto(`http://127.0.0.1:${PORT}/index.html`);await pg.waitForFunction('document.querySelector("#loading").hidden===true',null,{timeout:60000});await sleep(500);
    await pg.fill('#pName','Тест');await pg.click('#startBtn');await sleep(500);await pg.click('#howtoClose');await sleep(1500);
    const closeCards=()=>ev(`(()=>{let k=0;while(SIT.card&&k++<8){const c=SIT.card;pickChoice(c,c.choices[c.choices.length-1]);}})()`);
    await ev(`window.zkNoStory=true;zkSetTime((clock.day-1)*1440+15*60);player.money=5000;FA.t=9999;SIT.timer=1e9;`);await closeCards();
    const data=await ev(`cityFolk3.filter(f=>(f.do||[]).includes('yard_ask')).map(f=>f.id+':'+f.district)`);
    check(data.length===2,'двое с yard_ask: '+data.join(', '));
    check(await ev(`(()=>{const f=cityFolk3.find(f=>f.id==='loc-vahitovsky-yard');const s=FOLK.list.find(q=>q.id===f.id);return !!f&&faActsFor(Object.assign({},s||f,{at:'work'})).includes('yard_ask');})()`),'в 15:00 на работе — может подойти');
    await ev(`zkSetTime((clock.day-1)*1440+12*60)`);
    check(await ev(`(()=>{const f=FOLK.list.find(q=>q.id==='loc-vahitovsky-yard')||cityFolk3.find(f=>f.id==='loc-vahitovsky-yard');return !faActsFor(Object.assign({},f,{at:'work'})).includes('yard_ask');})()`),'в 12:00 — не подходит');
    await ev(`zkSetTime((clock.day-1)*1440+15*60)`);
    // человек рядом с игроком (как в folkacts.js): игрок у места, дождаться появления, поставить в 7 м
    const ready=async id=>{await closeCards();await ev(`(()=>{const s=sitActive('folkAct');if(s)endSit(s);for(let i=0;i<30;i++)folkDistrictTick();})()`);
      const ok=await ev(`(()=>{const f=FOLK.list.find(q=>q.id==='${id}');if(!f)return false;FA.cool={};f.day=[[0,'work']];f.dayOff=[[0,'work']];if(f.at!=='work'){folkDrop(f);f.trip=null;f.at='work';}
        const pl=f.places&&f.places.work;if(!pl)return false;player.vehicle=null;player.waypoints=null;player.x=pl.x+6;player.y=pl.y;cam.x=player.x;cam.y=player.y;return true;})()`);
      if(!ok)return false;await sleep(1600);
      return ev(`(()=>{const f=FOLK.list.find(q=>q.id==='${id}');if(!f.w)return false;f.w.x=player.x+7;f.w.y=player.y;return true;})()`);};
    const go=async id=>{if(!await ready(id))return null;await ev(`(()=>{const f=FOLK.list.find(q=>q.id==='${id}');FA.s=startSit('folkAct',{w:f.w,f,act:'yard_ask'});})()`);
      await pg.waitForFunction(()=>{const a=sitActive('folkAct');return a&&SIT.card&&SIT.card.s===a;},null,{timeout:15000}).catch(()=>{});
      return ev(`(()=>({text:SIT.card&&SIT.card.text,choices:SIT.card&&SIT.card.choices.map(c=>c.t),money:player.money,mood:player.mood,rep:player.rep||0}))()`);};
    // Айзат: в Вахитовском (центр) — карта там уже загружена
    let c=await go('loc-vahitovsky-yard');
    check(c&&/просит 100 ₽ «на район»/.test(c.text)&&/забирает 300 ₽/.test(c.text),`карточка: ${c&&c.text}`);
    check(c&&c.choices[0]==='Отдать 100 ₽'&&c.choices[1]==='Не отдавать','кнопки: '+(c&&c.choices.join(' | ')));
    await ev(`pickChoice(SIT.card,SIT.card.choices[0])`);await sleep(300);
    const g=await ev(`({money:player.money,act:!!sitActive('folkAct')})`);check(c&&g.money===c.money-100&&!g.act,`отдал — −100 ₽ (${c&&c.money} → ${g.money}), разошлись`);
    c=await go('loc-vahitovsky-yard');
    await ev(`pickChoice(SIT.card,SIT.card.choices[1])`);await sleep(300);
    const r=await ev(`({money:player.money,mood:player.mood,rep:player.rep||0,act:!!sitActive('folkAct')})`);
    check(c&&r.money===c.money-300&&r.rep===c.rep-1&&!r.act,`не отдал — −300 ₽, репутация ${c&&c.rep} → ${r.rep}`);
    c=await go('loc-vahitovsky-yard');
    await ev(`(()=>{const o=SIT.card;closeSitCardObj(o);o.onTimeout&&o.onTimeout(true);})()`);await sleep(300);
    const t=await ev(`({money:player.money,act:!!sitActive('folkAct')})`);check(c&&t.money===c.money-300&&!t.act,'закрыл карточку — −300 ₽');
    // денег меньше трёхсот — остаток со вклада или в долг, как в sitMoney
    c=await go('loc-vahitovsky-yard');const owed0=await ev(`(player.money=120,ECON.dep=50,ECON.owed||0)`);await ev(`pickChoice(SIT.card,SIT.card.choices[1])`);await sleep(300);
    const d=await ev(`({money:player.money,dep:ECON.dep,owed:ECON.owed||0})`);check(d.money===0&&d.dep===0&&d.owed-owed0===130,`мало денег — 120 с карты, 50 со вклада, 130 в долг: ${JSON.stringify(d)}`);
    check(!errors.length,'без ошибок в консоли'+(errors.length?': '+errors.slice(0,3).join(' | '):''));
  }catch(e){console.log('FAIL',e.message);fails++;}
  finally{await b.close();srv.kill();}
  console.log(fails?`FAILED ${fails}`:'ALL OK');process.exit(fails?1:0);
})();
