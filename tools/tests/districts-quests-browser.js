// Задания «Освоил район» и значки районов (quests.js второго программиста, 58112e1) и дождь для жителей (folk.js, 17cb5f3).
// 1) у каждого из семи заданий на карте есть хотя бы три места, куда можно зайти и которые засчитаются;
// 2) задание засчитывается за три захода с подсказкой района и не засчитывается за чужой район;
// 3) значки «Три района» и «Весь город» — по административным районам;
// 4) в дождь дворник, лоток на улице и пара во дворе уходят домой, кто под крышей — остаётся; без дождя — по расписанию.
// node tools/tests/districts-quests-browser.js <сборка> [порт, 8975]
const {chromium}=require('playwright');
const {spawn}=require('child_process');
const DEV=process.argv[2],PORT=+process.argv[3]||8975;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let fails=0;const check=(ok,msg)=>{console.log((ok?'OK  ':'FAIL')+' '+msg);if(!ok)fails++;};
(async()=>{
  const srv=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{cwd:DEV,stdio:'ignore'});await sleep(800);
  const b=await chromium.launch();const errors=[];
  try{
    const pg=await b.newPage({viewport:{width:1200,height:800}});
    pg.on('pageerror',e=>errors.push(String(e)));pg.on('console',m=>{if(m.type()==='error'&&!/404|Failed to load resource/.test(m.text()))errors.push(m.text());});
    const ev=s=>pg.evaluate(s);
    await pg.goto(`http://127.0.0.1:${PORT}/index.html`);await pg.waitForFunction('document.querySelector("#loading").hidden===true',null,{timeout:60000});await sleep(500);
    await pg.fill('#pName','Тест');await pg.click('#startBtn');await sleep(500);await pg.click('#howtoClose');await sleep(1500);
    await ev(`window.zkNoStory=true;let k=0;while(SIT.card&&k++<8){const c=SIT.card;pickChoice(c,c.choices[c.choices.length-1]);}`);
    // 1) места на карте: по центрам районов подгружаем кварталы, считаем места с подсказкой в названии или на ближней улице
    const Q=await ev(`cityQuests.filter(q=>/^district-/.test(q.id)).map(q=>({id:q.id,hints:q.target.hints,n:q.n,admin:q.id.slice(9)}))`);
    check(Q.length===7,'заданий «Освоил район»: '+Q.length);
    for(const q of Q){
      const r=await pg.evaluate(async q=>{const d=cityDistricts.find(x=>x.id===q.admin);const pts=[];if(d&&Array.isArray(d.center))pts.push(llToXY(d.center));
        for(const s of cityDistricts.filter(x=>x.parent===q.admin&&Array.isArray(x.center)))pts.push(llToXY(s.center));
        for(const p of pts)loadChunksAround([p],2500);await new Promise(r=>setTimeout(r,2500));
        const hit=[];for(const p of world.pois){if(!p.n||!ENTERABLE.test(p.t)||p.t==='metro')continue;const hay=(p.n+' '+(nearestRoadName(p.x,p.y)||'')).toLowerCase();
          if(q.hints.some(h=>hay.includes(h))){hit.push(p.n);if(hit.length>=12)break;}}
        return {places:hit.length,ex:hit.slice(0,3)};},q);
      check(r.places>=q.n,`${q.id}: мест, которые засчитаются, ${r.places>=12?'12+':r.places} (${r.ex.join(', ')})`);
    }
    // 2) засчитывается за три захода в своём районе, чужой — нет
    const done=await ev(`(()=>{const q=cityQuests.find(q=>q.id==='district-sovetsky');PROG.q={day:mskDate(),ids:[q.id],p:{},done:[]};const m0=player.money;
      cityTrack('visit',{name:'Аптека',kind:'pharmacy',street:'улица Баумана'});const p0=PROG.q.p[q.id]||0;
      for(let i=0;i<3;i++)cityTrack('visit',{name:'Кафе',kind:'cafe',street:'улица Рихарда Зорге'});
      return {chuzhoy:p0,done:PROG.q.done.includes(q.id),dm:player.money-m0};})()`);
    check(done.chuzhoy===0&&done.done&&done.dm===110,`«Освоил Советский»: чужая улица не в счёт, три захода на Зорге — готово, +${done.dm}`);
    // 3) значки по районам
    const ach=await ev(`(()=>{const a=n=>cityAchievements.find(x=>x.id===n);PROG.seenA=['vahitovsky','sovetsky'];PROG.ach={};achCheck();const s1=cityAchievementsState();
      PROG.seenA.push('kirovsky');achCheck();const s2=cityAchievementsState();return {three1:s1['district-three'].done,three2:s2['district-three'].done,all:s2['district-all'],need:achNeed(a('district-all')),week:!!a('event-week')};})()`);
    check(!ach.three1&&ach.three2&&!ach.all.done&&ach.need===7&&ach.week,`значки: «Три района» после третьего, «Весь город» — из 7 (${ach.all.n}/${ach.need}), «Неделя вечеров» есть`);
    // 4) дождь: кто на улице без крыши — домой
    await ev(`(()=>{for(let i=0;i<40;i++)folkDistrictTick();})()`);await sleep(500);
    const rain=await ev(`(()=>{const at=f=>{const w=weather.kind;return folkWant(f);};
      const L=FOLK.list.filter(f=>f.places&&f.places.work);const pick=fn=>L.find(fn);
      const jan=pick(f=>(f.type==='janitor'||/дворник/.test(f.job||''))&&!f.places.work.inside);
      const yard=pick(f=>(f.do||[]).includes('yard_ask'));
      const roof=pick(f=>f.places.work.inside&&f.places.work.key!=='taxi');
      const res={};const set=h=>zkSetTime((clock.day-1)*1440+h*60);
      for(const [k,f,h] of [['дворник',jan,10],['пара во дворе',yard,16],['под крышей',roof,12]]){if(!f){res[k]='нет';continue;}
        const D=[[0,'work']];const sv=[f.day,f.dayOff];f.day=D;f.dayOff=D;set(h);
        weather.kind='clear';const dry=folkWant(f);weather.kind='rain';const wet=folkWant(f);weather.kind='clear';f.day=sv[0];f.dayOff=sv[1];res[k]=dry+' → '+wet;}
      return res;})()`);
    check(rain['дворник']==='work → home','дворник в дождь — домой: '+rain['дворник']);
    check(rain['пара во дворе']==='work → home','пара во дворе в дождь — домой: '+rain['пара во дворе']);
    check(rain['под крышей']==='work → work','под крышей — остаётся: '+rain['под крышей']);
    check(!errors.length,'без ошибок в консоли'+(errors.length?': '+errors.slice(0,3).join(' | '):''));
  }catch(e){console.log('FAIL',e.message);fails++;}
  finally{await b.close();srv.kill();}
  console.log(fails?`FAILED ${fails}`:'ALL OK');process.exit(fails?1:0);
})();
