// Первые шаги (tutorial.js, 12 шагов) и движок: по шагу за раз, деньги за шаг, Кремль пешком, вечер «ждёт» только если он скоро,
// иначе подсказка и конец обучения; значки за административные районы (check:'districts'); старые игроки не возвращаются в обучение.
// node tools/tests/tutorial-browser.js <сборка> [порт, 8966]
const {chromium}=require('playwright');
const {spawn}=require('child_process');
const DEV=process.argv[2],PORT=+process.argv[3]||8966;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let fails=0;const check=(ok,msg)=>{console.log((ok?'OK  ':'FAIL')+' '+msg);if(!ok)fails++;};
(async()=>{
  const srv=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{cwd:DEV,stdio:'ignore'});await sleep(800);
  const b=await chromium.launch();const errors=[];
  try{
    const pg=await b.newPage({viewport:{width:1200,height:800}});
    pg.on('console',m=>{if(m.type()==='error'&&!/404|Failed to load resource/.test(m.text()))errors.push(m.text());});
    pg.on('pageerror',e=>errors.push(String(e)));
    const ev=s=>pg.evaluate(s);
    await pg.goto(`http://127.0.0.1:${PORT}/index.html`);
    await pg.waitForFunction('document.querySelector("#loading").hidden===true',null,{timeout:60000});await sleep(500);
    await pg.fill('#pName','Тест');await pg.click('#startBtn');await sleep(500);await pg.click('#howtoClose');await sleep(1500);
    // задания дня не мешают считать деньги за шаги
    await ev("window.zkNoStory=true;PROG.q={day:mskDate(),ids:[],p:{},done:[]};progSave();");
    const L=await ev('cityTutorial.length');
    check(L===12,`шагов в обучении: ${L}`);
    // шаг показывает карточка ближайшей цели (objectives.js), у гостя — первые шаги
    const goal=()=>ev(`(()=>{let k=0;while(SIT.card&&k++<6){const c=SIT.card;pickChoice(c,c.choices[c.choices.length-1]);}player.busy=false;cityObjectives.refresh();
      const b=document.querySelector('#nextGoal');return {shown:!b.hidden,ctx:document.querySelector('#goalContext').textContent,title:document.querySelector('#goalTitle').textContent,btn:document.querySelector('#questBtn').textContent};})()`);
    await ev('tutShow()');
    const g1=await goal();
    check(g1.shown&&g1.ctx==='Первые шаги · 1 из 12'&&g1.title==='Выйди на улицу'&&g1.btn==='👣1',`карточка цели: ${JSON.stringify(g1)}`);
    check(await ev('PROG.tut.started===true'),'обучение отмечено начатым (иначе на третий день выключится само)');
    await ev('openQuests()');await sleep(200);
    const modal=await ev('({cards:document.querySelectorAll("#qList .rt-card").length,sub:document.querySelector("#qSub").textContent,title:document.querySelector("#qTitle").textContent})');
    check(modal.cards===12&&/^12 коротких шагов/.test(modal.sub)&&modal.title==='Первые шаги',`окно «Первые шаги»: ${JSON.stringify(modal)}`);
    await ev('closeQuests()');
    // каждый шаг: сначала «чужое» действие не засчитывается, потом нужное — шаг дальше и +50
    const step=async(i,wrong,right,label)=>{
      const m0=await ev('player.money');
      if(wrong){await ev(wrong);check(await ev(`PROG.tut.i===${i}`),`${label}: чужое действие не засчитано`);}
      await ev(right);await sleep(100);
      const st=await ev('({i:PROG.tut.i,m:player.money})');
      check(st.i===i+1&&st.m-m0===50,`${label}: шаг ${i+1} пройден, +${st.m-m0}`);
    };
    await step(0,"cityTrack('eat')","cityTrack('walk',{n:200})",'пешком 200 м');
    await step(1,"cityTrack('visit',{name:'Аптека',kind:'pharmacy',street:'улица Пушкина'})","cityTrack('visit',{name:'Кафе «Тест»',kind:'cafe',street:''})",'кафе');
    await step(2,null,"cityTrack('eat')",'поесть');
    await step(3,null,"cityTrack('talk',{folk:'zulfiya'})",'разговор');
    await step(4,"cityTrack('metro',{to:'Кремлёвская'})","cityTrack('bus')",'остановка');
    await step(5,null,"cityTrack('visit',{name:'Аптека',kind:'pharmacy',street:''})",'магазин или аптека');
    await step(6,null,"cityTrack('atm')",'банкомат');
    await step(7,null,"cityTrack('walk',{n:400})",'ещё квартал');
    const g9=await goal();check(g9.ctx==='Первые шаги · 9 из 12'&&g9.title==='Под землю',`шаг 9 — «Под землю»: ${JSON.stringify(g9)}`);
    await step(8,"cityTrack('bus')","cityTrack('metro',{to:'Кремлёвская'})",'метро');
    // Кремль: здание далеко от Кремля не в счёт; дойти пешком до Кремля — в счёт
    const kr=await ev(`(()=>{const k=world.kremlin;if(!k)return null;loadChunksAround([[k.x,k.y]],1500);let best=-1,bd=1e9;
      for(let i=0;i<world.N;i++){if(!(world.g.nm[i]&1))continue;const p=world.nodes[i];const d=dist(p[0],p[1],k.x,k.y);if(d>200&&d<300&&d<bd){bd=d;best=i;}}
      return best>=0?{x:world.nodes[best][0],y:world.nodes[best][1],d:Math.round(bd)}:null;})()`);
    check(!!kr,`у Кремля есть пешая точка в 200–300 м: ${kr&&kr.d} м`);
    const m9=await ev('player.money');
    await ev("cityTrack('visit',{name:'Кафе',kind:'cafe',street:'улица Баумана'})");
    check(await ev('PROG.tut.i===9'),'Кремль: кафе на Баумана не засчитано');
    await ev(`(()=>{player.x=${kr.x}+0.3;player.y=${kr.y}+0.3;cam.x=player.x;cam.y=player.y;})()`);await sleep(1600);
    const k1=await ev('({i:PROG.tut.i,m:player.money,kr:WALK.kr})');
    check(k1.i===10&&k1.m-m9===50,`дошёл до Кремля пешком — шаг 10 пройден: ${JSON.stringify(k1)}`);
    // вечер скоро: шаг ждёт; пришёл на место — засчитан, обучение кончилось (+50 и +300)
    const day0=await ev('Math.floor(clock.minutes/1440)');
    await ev(`zkSetTime(${(day0+1)*1440+19*60+30})`);await sleep(300);
    await step(10,null,"cityTrack('taxi')",'такси');
    await sleep(2600);
    const w=await ev(`({i:PROG.tut.i,end:!!PROG.tut.end,list:eveningsToday().map(e=>e.d.hour+':'+e.d.title+':'+e.t.toFixed(2))})`);
    check(w.i===11&&!w.end,`вечер через полчаса игры — шаг ждёт: ${JSON.stringify(w)}`);
    await ev(`zkSetTime(${(day0+1)*1440+20*60+5})`);await sleep(2600);
    const place=await ev(`(()=>{for(const k in PROG.ev){const s=PROG.ev[k];if(s.on&&s.show&&!s.closed&&Array.isArray(s.place))return s.place;}return null;})()`);
    check(!!place,`вечер начался, есть место: ${place&&place[2]}`);
    const m11=await ev('player.money');
    if(place){await ev(`(()=>{player.x=${place[0]}+0.5;player.y=${place[1]}+0.5;cam.x=player.x;cam.y=player.y;})()`);await pg.waitForFunction('PROG.tut.end',null,{timeout:8000}).catch(()=>{});}
    const fin=await ev(`({i:PROG.tut.i,end:!!PROG.tut.end,m:player.money,btn:document.querySelector('#questBtn').textContent,log:[...document.querySelectorAll('#events *')].map(e=>e.textContent).join(' | ')})`);
    // за приход на вечер — его своя награда, плюс 50 за шаг и 300 за всё обучение
    check(fin.end&&fin.i===12&&fin.m-m11>=350,`пришёл на вечер — обучение пройдено: +${fin.m-m11}, кнопка ${fin.btn}`);
    check(/Первые шаги пройдены/.test(fin.log)||await ev(`[...document.querySelectorAll('body *')].some(e=>/Первые шаги пройдены/.test(e.textContent))`),'сообщение «Первые шаги пройдены»');
    check(/^🎯/.test(fin.btn),'после обучения — задания дня 🎯');
    // вечер нескоро (утро): шаг не держит — подсказка «Вечер сегодня в …», обучение кончается без 50 за этот шаг, но с 300
    await ev(`(()=>{PROG.tut={i:11,p:0,end:false,started:true};PROG.ev={};progSave();updateQuestBtn();})()`);
    const m12=await ev('player.money');
    await ev(`zkSetTime(${(day0+2)*1440+9*60})`);await sleep(1600);
    const sk=await ev(`({end:!!PROG.tut.end,i:PROG.tut.i,m:player.money,txt:document.body.innerText})`);
    check(sk.end&&sk.i===12&&sk.m-m12===300,`утром шаг «вечер» не держит: +${sk.m-m12}, конец обучения`);
    check(/Вечер сегодня в 2\d:00 — «/.test(sk.txt),'подсказка, во сколько вечер');
    // кто прошёл старые 8 шагов — обратно в обучение не попадает
    await ev(`(()=>{PROG.tut={i:8,p:0,end:true,started:true};progSave();updateQuestBtn();})()`);
    check(await ev('!tutActive()&&/^🎯/.test(document.querySelector("#questBtn").textContent)'),'прошедший старое обучение (8 шагов) — сразу задания дня');
    // значки за районы: check:'districts' — сколько административных районов города обошёл
    await ev(`cityAchievements.push({id:'t-2d',icon:'🧭',title:'Два района',text:'',check:'districts',n:2},{id:'t-all',icon:'🗺',title:'Весь город',text:'',check:'districts',all:true,n:99})`);
    const adm=await ev(`cityDistricts.filter(d=>d.kind==='admin').length`);
    const seen=[];
    for(const id of ['vahitovsky','novosavinovsky','moskovsky']){
      const ok=await ev(`(()=>{const d=cityDistricts.find(x=>x.id==='${id}');if(!d||!d.center)return false;const m=world.meta;player.inside=null;player.x=(d.center[1]-m.lon0)*m.mlon;player.y=-(d.center[0]-m.lat0)*m.mlat;cam.x=player.x;cam.y=player.y;return true;})()`);
      if(ok){await sleep(4600);seen.push(await ev('DIST.adm'));}
    }
    const ach=await ev(`({seenA:PROG.seenA.slice(),st:cityAchievementsState()['t-2d'],all:cityAchievementsState()['t-all'],need:achNeed(cityAchievements.find(a=>a.id==='t-all'))})`);
    check(ach.seenA.length>=2&&ach.st.done,`значок «два района»: обошёл ${JSON.stringify(ach.seenA)}, ${JSON.stringify(ach.st)}`);
    check(adm>0&&ach.need===adm&&!ach.all.done,`«весь город» — все ${adm} административных районов: нужно ${ach.need}, сейчас ${ach.all.n}`);
    check(!errors.length,'без ошибок в консоли'+(errors.length?': '+errors.slice(0,3).join(' | '):''));
  }finally{await b.close();srv.kill();}
  console.log(fails?`FAILED ${fails}`:'ALL OK');process.exit(fails?1:0);
})();
