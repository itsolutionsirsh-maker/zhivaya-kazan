// Общие события рядом: три настоящих браузера на своём Node-сервере (чистая база, без интернета).
// Алину сбивает машина → сервер принимает её сообщение → Булат в 400 м видит ту же аварию (метка, машина, строка
// по стадии), Камиль в 3 км — только знает о ней, без метки и строки; у Алины второй аварии нет.
// Подделки: Камиль сообщает о чужом месте, Алина — второй раз сразу — сервер не принимает. Опрос a=city несёт список.
// Матч и праздник рядом — строки второго программиста по стадии. Модератор снимает аварию — метка у Булата пропадает.
// node tools/tests/shared-events-browser.js <сборка> [порт, 8987]
const {chromium}=require('playwright');
const {spawn}=require('child_process');
const fs=require('fs'),os=require('os'),path=require('path'),crypto=require('crypto');
const DEV=path.resolve(process.argv[2]||'/tmp/zk-dev'),PORT=+process.argv[3]||8987,BASE=`http://127.0.0.1:${PORT}`;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const DATA=fs.mkdtempSync(path.join(os.tmpdir(),'zk-sev-')),MOD=crypto.randomBytes(20).toString('hex');
let fails=0;const check=(ok,msg)=>{console.log((ok?'OK  ':'FAIL')+' '+msg);if(!ok)fails++;};
const health=()=>fetch(BASE+'/health').then(r=>r.json());
(async()=>{
  const srv=spawn(process.execPath,[path.join(__dirname,'../../server/node/server.js')],{env:Object.assign({},process.env,{GAME_DIR:DEV,DATA_DIR:DATA,PORT:String(PORT),MOD_TOKEN:MOD,TG_BOT_TOKEN:'',LLM_API_KEY:'',RW_OFF:'1',SEV_PER_IP:'20'}),stdio:['ignore','pipe','pipe']});
  let srvLog='';srv.stdout.on('data',d=>{srvLog+=d;});srv.stderr.on('data',d=>{srvLog+=d;});
  for(let i=0;i<40;i++){try{if((await health()).ok)break;}catch(e){}await sleep(250);}
  const b=await chromium.launch();const errors=[];
  const open=async name=>{
    const pg=await (await b.newContext({viewport:{width:390,height:844}})).newPage();
    pg.on('pageerror',e=>errors.push(name+': '+e.message));
    pg.on('console',m=>{if(m.type()==='error'&&!/404|Failed to load resource/.test(m.text()))errors.push(name+': '+m.text());});
    await pg.goto(BASE+'/');
    await pg.waitForFunction('document.querySelector("#loading").hidden===true',null,{timeout:90000});await sleep(500);
    await pg.fill('#pName',name);await pg.click('#startBtn');await sleep(300);await pg.click('#howtoClose');await sleep(2000);
    await pg.evaluate(()=>{window.zkNoStory=true;let k=0;while(SIT.card&&k++<6){const c=SIT.card;pickChoice(c,c.choices[c.choices.length-1]);}
      window.__ev=[];const ae=addEvent;addEvent=function(t){__ev.push(String(t));return ae.apply(this,arguments);};});
    return pg;
  };
  const put=(pg,x,y)=>pg.evaluate(([x,y])=>{player.inside=null;player.x=x;player.y=y;player.waypoints=null;cam.x=x;cam.y=y;},[x,y]);
  try{
    const A=await open('Алина'),B=await open('Булат'),C=await open('Камиль');
    check(await A.evaluate('Net.mode')==='ws','игроки на WebSocket');
    // место: дорога для машин у центра; Булату — пешая точка в 350–450 м, Камилю — в 2,5–3,5 км
    const spot=await A.evaluate(`(()=>{loadChunksAround([[0,0]],4500);const n=nearestNode(0,0,world.carAdj,800);const p=world.nodes[n];
      const ped=(lo,hi)=>{for(let i=0;i<world.N;i++){if(!(world.g.nm[i]&1))continue;const q=world.nodes[i];const d=Math.hypot(q[0]-p[0],q[1]-p[1]);if(d>lo&&d<hi)return [q[0],q[1]];}return null;};
      return {p:[p[0],p[1]],b:ped(350,450),c:ped(2500,3500),road:nearestRoadName(p[0],p[1])};})()`);
    check(spot.b&&spot.c,`место у дороги «${spot.road}», Булат и Камиль на своих местах`);
    for(const pg of [B,C])await pg.evaluate('loadChunksAround([[0,0]],4500)');
    await put(A,spot.p[0],spot.p[1]);await put(B,spot.b[0],spot.b[1]);await put(C,spot.c[0],spot.c[1]);await sleep(1500);
    // 1) Алину сбивает машина
    await A.evaluate('playerHitByCar({speed:5})');
    await sleep(3500);
    const h1=await health();
    check(h1.city&&h1.city.incidents===1,`сервер принял аварию: ${JSON.stringify(h1.city)}`);
    const sb=await B.evaluate(`({n:SEV.list.length,marks:[...SIT.marks.keys()].filter(k=>k.startsWith('sev:')),label:[...SIT.marks.entries()].filter(([k])=>k.startsWith('sev:')).map(([k,m])=>m.label)[0],
      staged:accidents.filter(a=>a.shared).length,cars:accidents.filter(a=>a.shared).map(a=>a.cars.length)[0],near:accidents.filter(a=>a.shared).map(a=>Math.round(dist(a.x,a.y,${spot.p[0]},${spot.p[1]})))[0],ev:__ev.filter(t=>t.startsWith('🚨'))})`);
    check(sb.n===1&&sb.marks.length===1,`Булат (400 м) видит метку: ${sb.label}`);
    check(sb.staged===1&&sb.cars===1&&sb.near<60,`у Булата та же авария на той же улице (сбили человека — одна машина): машин ${sb.cars}, от места ${sb.near} м`);
    check(sb.ev.length===1&&/Скорая уже на месте/.test(sb.ev[0]),`строка первой стадии: ${sb.ev[0]}`);
    const sc=await C.evaluate(`({n:SEV.list.length,marks:[...SIT.marks.keys()].filter(k=>k.startsWith('sev:')).length,staged:accidents.filter(a=>a.shared).length,ev:__ev.filter(t=>t.startsWith('🚨')).length})`);
    check(sc.n===1&&!sc.marks&&!sc.staged&&!sc.ev,`Камиль (3 км) знает, но без метки, аварии и строки: ${JSON.stringify(sc)}`);
    const sa=await A.evaluate(`({mine:SEV.mine.length,staged:accidents.filter(a=>a.shared).length,own:accidents.filter(a=>a.victim==='player').length,marks:[...SIT.marks.keys()].filter(k=>k.startsWith('sev:')).length})`);
    check(sa.mine===1&&sa.staged===0&&sa.own===1&&!sa.marks,`у Алины своя авария одна, второй с сервера нет: ${JSON.stringify(sa)}`);
    // 2) подделки: Камиль сообщает о месте в 3 км от себя; Алина отошла на 2 км и сразу вторая авария
    await C.evaluate(`wsSock.send(JSON.stringify({t:'sev',k:'incident',x:${spot.p[0]},y:${spot.p[1]}+300}))`);
    await put(A,spot.c[0],spot.c[1]);await sleep(800);
    await A.evaluate(`createAccident({x:player.x,y:player.y,cars:[],playerCar:true})`);await sleep(2500);
    const h2=await health();
    check(h2.city.incidents===1,`чужое место и вторая авария подряд не приняты: ${h2.city.incidents}`);
    // 3) опрос a=city — тот же список, без того, кто сообщил
    const poll=await B.evaluate(`fetch('api.php?a=city',{cache:'no-store'}).then(r=>r.json()).then(j=>j.sev)`);
    check(Array.isArray(poll)&&poll.length===1&&!('by' in poll[0])&&poll[0].left>500,`опрос a=city: ${JSON.stringify(poll)}`);
    // 4) прошла четверть срока — следующая строка
    await B.evaluate('SEV.list[0].at=performance.now()-3*60e3;SEV.list[0].until=SEV.list[0].at+10*60e3');await sleep(1500);
    const ev2=await B.evaluate(`__ev.filter(t=>t.startsWith('🚨'))`);
    check(ev2.length===2&&/Полиция отгородила/.test(ev2[1]),`через 3 минуты — вторая строка: ${ev2[1]}`);
    // 5) модератор в /mod.html видит аварию и снимает её — метка у Булата пропадает
    const M=await (await b.newContext({viewport:{width:1100,height:900}})).newPage();M.on('pageerror',e=>errors.push('mod: '+e.message));
    // в отладочной сборке mod.html нет — отдаём его из репозитория, запросы к api.php идут на наш сервер
    await M.route('**/mod.html',r=>r.fulfill({path:path.join(__dirname,'../../site/mod.html'),contentType:'text/html; charset=utf-8'}));
    await M.goto(BASE+'/mod.html');await M.fill('#tok',MOD);await M.click('#sRefresh');await sleep(800);
    const mtxt=await M.textContent('#sOut');
    check(/Сбили человека/.test(mtxt)&&/ещё (9|10) мин/.test(mtxt),`модератор видит: ${mtxt.trim()}`);
    await M.click('#sOut button');await sleep(1800);
    const mtxt2=await M.textContent('#sOut');
    const sb2=await B.evaluate(`({n:SEV.list.length,marks:[...SIT.marks.keys()].filter(k=>k.startsWith('sev:')).length})`);
    check(/Аварий сейчас нет/.test(mtxt2)&&sb2.n===0&&sb2.marks===0,`модератор снял: «${mtxt2.trim()}», у Булата ${JSON.stringify(sb2)}`);
    // столкновение двух машин (Камиль за рулём рядом с Булатом) — у Булата две разбитые машины
    await put(C,spot.b[0]+120,spot.b[1]);await sleep(1500);
    await C.evaluate('createAccident({x:player.x,y:player.y,cars:[],playerCar:true})');await sleep(3000);
    const s2=await B.evaluate(`({n:SEV.list.length,cars:accidents.filter(a=>a.shared).slice(-1).map(a=>a.cars.length)[0],ped:SEV.list[0]&&SEV.list[0].ped})`);
    check(s2.n===1&&s2.cars===2&&s2.ped===false,`столкновение у Камиля — у Булата две машины: ${JSON.stringify(s2)}`);
    await fetch(BASE+'/api.php',{method:'POST',headers:{'Content-Type':'application/json','x-mod-token':MOD},body:JSON.stringify({a:'mod',do:'sev',clear:1})});
    const nomod=await fetch(BASE+'/api.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({a:'mod',do:'sev',clear:1})}).then(r=>r.json());
    check(nomod.err==='forbidden','без ключа модератора снять нельзя');
    // 6) матч: Булат у арены — строки по стадии (за полтора часа — толпа, игра — тихо)
    const mt=await B.evaluate(`(()=>{for(const f of cityFixtures){if(f.kind!=='match')continue;const c=matchClub(f),v=matchVenue(f);if(c&&v&&Array.isArray(v.ll)){const [x,y]=llToXY(v.ll);return {k:matchKickoff(f),x,y,t:f.title};}}return null;})()`);
    check(!!mt,`есть матч: ${mt&&mt.t}`);
    if(mt){await B.evaluate(`loadChunksAround([[${mt.x},${mt.y}]],2500)`);await put(B,mt.x+500,mt.y);
      await B.evaluate(`window.zkTestNow=${mt.k-90*60000}`);await sleep(2600);
      await B.evaluate(`window.zkTestNow=${mt.k+10*60000}`);await sleep(2600);
      const em=await B.evaluate(`__ev.filter(t=>t.startsWith('🏟 ')&&!/:/.test(t.slice(0,40)))`);
      check(em.some(t=>/толпа/.test(t))&&em.some(t=>/у входа тихо/.test(t)),`у арены — строки по стадии: ${JSON.stringify(em)}`);
      await put(C,mt.x+4000,mt.y);await C.evaluate(`window.zkTestNow=${mt.k-90*60000}`);await sleep(2600);
      check(!(await C.evaluate(`__ev.some(t=>/толпа/.test(t))`)),'далеко от арены — без строки');}
    // 7) праздник 4 ноября у Кремля, 13:30 по Москве — строка второй стадии
    await B.evaluate(`window.zkTestNow=Date.parse('2026-11-04T13:30:00+03:00')`);
    const kr=await B.evaluate('world.kremlin&&[world.kremlin.x,world.kremlin.y]');
    await put(B,kr[0]+400,kr[1]);await sleep(2600);
    const eh=await B.evaluate(`__ev.filter(t=>t.startsWith('🎉'))`);
    check(eh.length===1&&/День народного единства\. Улицу перекрыли/.test(eh[0]),`праздник у Кремля: ${eh[0]}`);
    check(!errors.length,'без ошибок в консоли'+(errors.length?': '+errors.slice(0,3).join(' | '):''));
  }catch(e){console.log('FAIL',e.message);fails++;}
  finally{await b.close();srv.kill();try{fs.rmSync(DATA,{recursive:true,force:true});}catch(e){}}
  if(fails)console.log(srvLog.split('\n').slice(-15).join('\n'));
  console.log(fails?`FAILED ${fails}`:'ALL OK');process.exit(fails?1:0);
})();
