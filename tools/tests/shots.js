// Одинаковые снимки «до/после» для работы над графикой: толпа, транспорт, вход, свои люди на Баумана (обычный масштаб и детали).
// Телефон 390×844 и компьютер 1280×800. Запустить на сборке main («до») и на сборке своей ветки («после») в разные папки.
// node tools/tests/shots.js /tmp/zk-dev 8790 /tmp/shots-before
const {chromium} = require('playwright');
const {spawn} = require('child_process');
const {parkSnapshotTaxi} = require('./visual-fixtures');
const fs = require('fs');
const DEV = process.argv[2], PORT = +process.argv[3] || 8790, OUT = process.argv[4] || '/tmp/shots';
const sleep = ms => new Promise(r => setTimeout(r, ms));
// Один сценарий применяется к обеим сборкам. Проверки нового UI включаются только там,
// где есть ui.js; базовая сборка также получает все снимки для честного сравнения.
async function phoneUIShots(browser){
  const report=[];
  for(const [name,width,height,mobile] of [['small',360,640,true],['phone',390,844,true],['large',412,915,true],['landscape',844,390,true],['desktop',1280,800,false]]){
    const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile});
    const pg=await ctx.newPage(),errors=[];pg.on('pageerror',e=>errors.push(String(e)));
    try{
      await pg.goto(`http://127.0.0.1:${PORT}/index.html`);
      await pg.waitForFunction('document.querySelector("#loading").hidden === true',null,{timeout:90000});
      await pg.fill('#pName','Тест');await pg.click('#startBtn');await pg.click('#howtoClose');
      await sleep(6500); // стартовые fixturesTick/seasonXP/tutShow уже завершились и не вмешаются в проверку срока ленты
      await pg.evaluate(()=>{window.requestAnimationFrame=((raf)=>cb=>cb===frame?0:raf.call(window,cb))(window.requestAnimationFrame);});await sleep(80);
      const enhanced=await pg.evaluate(()=>typeof window.uiUpdateHud==='function');
      const snapshot=async scene=>{
        await sleep(220); // лист уже закончил входную анимацию в обеих сборках
        const geometry=await pg.evaluate(()=>{
          const ids=['needsPanel','joy','actBtn','hint','zkToday','cpInput','cpSend'];
          const visible=el=>el&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden';
          const box=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
          const controls={};for(const id of ids){const el=document.getElementById(id);if(visible(el))controls[id]=box(el);}
          const zoom=document.querySelector('.zoom');if(visible(zoom))controls.zoom=box(zoom);
          const modal=[...document.querySelectorAll('.modal')].find(el=>!el.hidden);
          const close=modal&&modal.querySelector('.ui-sheet-close');
          if(visible(close))controls.sheetClose=box(close);
          return {width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth+1,controls,
            sheet:modal?{id:modal.id,...box(modal.querySelector('.box'))}:null,
            feed:[...document.querySelectorAll('#feed .ev')].filter(visible).map(box)};
        });
        report.push({name,scene,enhanced,...geometry});
        if(enhanced&&mobile){
          if(geometry.overflow)throw new Error(name+'/'+scene+': horizontal overflow');
          const c=geometry.controls,overlap=(a,b)=>a&&b&&Math.min(a.right,b.right)>Math.max(a.x,b.x)+1&&Math.min(a.bottom,b.bottom)>Math.max(a.y,b.y)+1;
          for(const [a,b] of [['joy','actBtn'],['hint','zoom'],['hint','actBtn'],['zkToday','zoom'],['zkToday','joy']])if(overlap(c[a],c[b]))throw new Error(name+'/'+scene+': overlap '+a+'/'+b);
          for(const [id,r] of Object.entries(c))if(r.x< -1||r.right>geometry.width+1||r.y< -1||r.bottom>geometry.height+1)throw new Error(name+'/'+scene+': offscreen '+id);
          for(const id of ['actBtn','sheetClose','cpSend'])if(c[id]&&c[id].h<44)throw new Error(name+'/'+scene+': small button '+id);
          if(scene==='day_feed'&&c.needsPanel.h>52)throw new Error(name+': status is not one row');
        }
        await pg.screenshot({path:`${OUT}/ui_${name}_${scene}.png`});
      };
      await pg.evaluate(()=>{
        const active=sitActive('folkAct');if(active)endSit(active);if(SIT.card)$('#scX').click();
        PROG.tut={i:0,p:0,end:true,started:true};zkSetTime((clock.day-1)*1440+13*60);
        player.drunk=25;ECON.owed=1250;player.debt=900;updateHud();$('#hint').hidden=true;
        $('#actBtn').hidden=false;$('#actBtn').innerHTML='<kbd>E</kbd>Поговорить';
        feed.length=0;addEvent('У библиотеки начинается встреча соседей','say');addEvent('Звонок: Фидания ждёт у дома','call');addEvent('Штраф за нарушение: 500 ₽','alert');render();
      });
      await snapshot('day_feed');
      if(enhanced&&name==='small'){
        await pg.click('#needsPanel');
        if(await pg.getAttribute('#needsPanel','aria-expanded')!=='true')throw new Error('Status details did not open');
        await pg.click('#needsPanel');await sleep(5600);
        if(await pg.locator('#feed .ev:visible').count())throw new Error('Phone feed did not expire after 5.5 seconds');
        await pg.click('#logBtn');
        if(await pg.locator('#logList .ev').count()<3)throw new Error('Expired events lost from journal');
        await pg.click('#logClose');
      }
      await pg.click('#jobsBtn');await pg.evaluate(()=>{HOUSING.open=true;renderJobs();});
      await pg.evaluate(()=>document.getElementById('jobsHome').scrollIntoView({block:'start'}));
      await snapshot('housing');
      if(enhanced&&mobile){
        const grip=await pg.locator('#jobsModal .ui-sheet-grip').boundingBox();
        await pg.mouse.move(grip.x+grip.width/2,grip.y+2);await pg.mouse.down();await pg.mouse.move(grip.x+grip.width/2,grip.y+100,{steps:8});await pg.mouse.up();
        await pg.waitForFunction('document.getElementById("jobsModal").hidden&&!player.busy');
      }else await pg.click('#jobsClose');
      await pg.click('#sayBtn');await pg.fill('#cpInput','Привет, Казань!');
      if(mobile){
        // Только имитация клавиатуры и Telegram insets, без авторизации/запросов Telegram.
        await pg.evaluate(h=>{window.Telegram={WebApp:{viewportStableHeight:h,safeAreaInset:{top:0,bottom:16},contentSafeAreaInset:{top:24},onEvent(){}}};document.documentElement.classList.add('tg');},height);
        await pg.setViewportSize({width,height:Math.max(280,height-280)});await sleep(100);
      }
      await snapshot('chat_keyboard_emulated');
      await pg.click('#cpClose');
      if(mobile){await pg.evaluate(()=>{delete window.Telegram;document.documentElement.classList.remove('tg');});await pg.setViewportSize({width,height});}
      await pg.evaluate(()=>{PROG.tut={i:0,p:0,end:false,started:true};tutShow();updateHud();$('#actBtn').hidden=false;$('#actBtn').innerHTML='<kbd>E</kbd>Поговорить';});
      await snapshot('tutorial');
      if(errors.length)throw new Error(errors.join('\n'));
    }finally{await ctx.close();}
  }
  fs.writeFileSync(`${OUT}/ui-layout.json`,JSON.stringify(report,null,2));
}
(async () => {
  fs.mkdirSync(OUT, {recursive: true});
  const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
  const srv = spawn(python, ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {cwd: DEV, stdio: 'ignore', windowsHide:true});
  let serverError=null,b;srv.on('error',e=>{serverError=e;});
  const errors = [];
  try {
    await sleep(800);if(serverError)throw serverError;if(srv.exitCode!==null)throw new Error('HTTP server exited: '+srv.exitCode);
    b=await chromium.launch();
    for (const [dev, vp] of [['phone', {viewport: {width: 390, height: 844}, deviceScaleFactor: 3, isMobile: true, hasTouch: true}], ['desktop', {viewport: {width: 1280, height: 800}}]]) {
      const ctx = await b.newContext(vp); const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(dev + ': ' + e));
      const ev = s => pg.evaluate(s);
      await pg.goto(`http://127.0.0.1:${PORT}/index.html`);
      await pg.waitForFunction('document.querySelector("#loading").hidden === true', null, {timeout: 90000}); await sleep(800);
      await pg.fill('#pName', 'Тест'); await pg.click('#startBtn'); await sleep(300); await pg.click('#howtoClose'); await sleep(2000);
      const day=await ev('clock.day-1');
      const closeCards = () => ev('(()=>{let k=0;while(SIT.card&&k++<6){const c=SIT.card;pickChoice(c,c.choices[c.choices.length-1]);}})()');
      // одно и то же место у Профсоюзной, люди вокруг игрока
      const crowd = `(()=>{const L=llToXY([55.79242,49.11140]);const n=nearestNode(L[0],L[1],world.pedAdj,200);const q=sidewalkPos(n);player.x=q[0];player.y=q[1];cam.x=q[0];cam.y=q[1];cam.zt=cam.z=5.5;
        let k=0;for(const w of walkers){if(w.bus||w.inside||w.temp||k>=14)continue;const a=k*0.45,r=3+(k%4)*1.6;w.x=q[0]+Math.cos(a)*r;w.y=q[1]+Math.sin(a)*r;w.state='idle';w.ttl=30;w.path=null;k++;}return k;})()`;
      await ev(`zkSetTime(${day}*1440+13*60)`); await ev(crowd); await sleep(1200); await closeCards();
      await pg.screenshot({path: `${OUT}/${dev}_01_player_day.png`});
      await ev(`zkSetTime(${day}*1440+21*60+30)`); await ev(crowd); await sleep(1200); await closeCards();
      await pg.screenshot({path: `${OUT}/${dev}_02_player_night.png`});
      // транспорт рядом: каршеринг, самокат, своя машина, такси
      await ev(`zkSetTime(${day}*1440+12*60)`);
      await ev(`(()=>{const q=[player.x,player.y];for(const w of walkers)if(!w.bus&&!w.inside&&dist(w.x,w.y,q[0],q[1])<12){w.x+=30;w.state='idle';w.ttl=30;w.path=null;}
        const put=(o,dx,dy)=>{if(!o)return;o.x=q[0]+dx;o.y=q[1]+dy;o.hx=1;o.hy=0;};
        put(rentals.find(r=>r.kind==='car'),7,-3);put(rentals.find(r=>r.kind==='scooter'),2.5,2);
        put(rentals.find(r=>r.kind==='bike'),-2.5,2);
        if(ownCar){ownCar.parked=true;put(ownCar,-7,-3);}
        cam.x=q[0];cam.y=q[1];cam.zt=cam.z=5.5;})()`);
      await ev(`(${parkSnapshotTaxi.toString()})(cars.find(c=>!c.crashed&&c.target==null&&c.kind!=='amb'&&c.kind!=='police'),player.x,player.y-8)`);
      await sleep(250); await closeCards();
      await pg.screenshot({path: `${OUT}/${dev}_03_vehicles.png`});
      // вход в кафе и кнопка действия
      const cafe = await ev(`(()=>{const c=world.pois.filter(p=>p.t==='cafe'&&p.n&&poiBuilding(p)).sort((a,b)=>dist(a.x,a.y,player.x,player.y)-dist(b.x,b.y,player.x,player.y))[0];if(!c)return null;
        const q=toSidewalk(c.x,c.y);player.x=q[0];player.y=q[1];cam.x=q[0];cam.y=q[1];cam.zt=cam.z=6;
        for(const w of walkers)if(!w.bus&&!w.inside&&dist(w.x,w.y,q[0],q[1])<9){w.x+=25;w.y+=25;w.state='idle';w.ttl=30;w.path=null;}return c.n;})()`);   // прохожих — в сторону, чтобы E было про вход
      await sleep(1200); await closeCards();
      await pg.screenshot({path: `${OUT}/${dev}_04_entrance.png`});
      console.log(dev, '| кафе:', cafe, '| действие:', await ev('currentAction?currentAction.label+(currentAction.tk?" ["+currentAction.tk+"]":""):null'));
      await ev('cam.zt=cam.z=9.5');await sleep(250);
      await pg.screenshot({path: `${OUT}/${dev}_04b_entrance_detail.png`});
      // Свои люди на Баумана: реальные персоны из данных, одни и те же четыре человека в обеих сборках.
      // Последняя сцена: останавливаем кадры только в этой тестовой странице, чтобы расписание не увело людей.
      await closeCards();
      await ev('window.requestAnimationFrame=((raf)=>cb=>cb===frame?0:raf.call(window,cb))(window.requestAnimationFrame)');await sleep(100);
      const folk = await ev(`(()=>{
        const active=sitActive('folkAct');if(active)endSit(active);
        zkSetTime(${day}*1440+13*60);updateClock(0);
        // На Баумана редкие узлы: nearestNode может перескочить на Профсоюзную.
        // Берём точки через sidewalkPos вдоль самой пешеходной улицы, с шагом до 5 м.
        const candidates=[];
        for(const r of world.roads){if(r.c!==9||!/Баумана/i.test(r.n||''))continue;
          for(let i=1;i<r.p.length;i++){const a=sidewalkPos(r.p[i-1]),b=sidewalkPos(r.p[i]),steps=Math.max(1,Math.ceil(dist(...a,...b)/5));
            for(let k=0;k<=steps;k++){const t=k/steps;candidates.push({node:r.p[t<0.5?i-1:i],q:[lerp(a[0],b[0],t),lerp(a[1],b[1],t)]});}}}
        const spots=candidates.filter(s=>{
          const [x,y]=s.q,road=nearestRoadSeg(x,y,15);
          return !inBuilding(x,y)&&(!road||road.d>road.seg.r.hw+2);
        }),used=[];
        const placeNear=(x,y)=>{
          const s=spots.filter(s=>used.every(p=>dist(p.q[0],p.q[1],s.q[0],s.q[1])>=4))
            .sort((a,b)=>dist(a.q[0],a.q[1],x,y)-dist(b.q[0],b.q[1],x,y))[0];
          if(!s||dist(s.q[0],s.q[1],x,y)>30)throw new Error('Нет свободной пешеходной точки на Баумана');
          used.push(s);return s;
        };
        const L=llToXY([55.79190,49.11240]),q=placeNear(L[0],L[1]).q;
        player.x=q[0];player.y=q[1];player.vehicle=null;player.waypoints=null;cam.x=q[0];cam.y=q[1];cam.zt=cam.z=5.5;
        for(let i=0;i<50;i++)folkDistrictTick();
        const specs=[['karim','phone',-10,-10],['gazinur','cart',6,-10],['arslan','guitar',-10,7],['halil','broom',6,7]];
        const ids=new Set(specs.map(s=>s[0]));
        for(const w of walkers)if(!ids.has(w.folk)&&dist(w.x,w.y,q[0],q[1])<28)w.x+=80;
        for(const [id,item] of specs){const f=FOLK.list.find(f=>f.id===id);
          if(!f||f.p.item!==item)throw new Error('Нет персоны для снимка: '+id+' / '+item);
          if(!f.w)folkSpawn(f,{x:q[0],y:q[1]});}
        const own=walkers.filter(w=>w.folk),out=[];
        for(const [id,item,dx,dy] of specs){const w=own.find(w=>w.folk===id);
          if(!w)throw new Error('Не появился для снимка: '+id);
          const spot=placeNear(q[0]+dx,q[1]+dy);
          w.node=spot.node;w.x=spot.q[0];w.y=spot.q[1];w.hx=1;w.hy=0;w.phase=0;w.state='folkStay';w.path=null;w.mv=null;w.walking=false;w.bus=null;w.inside=null;w.filming=item==='phone';
          out.push({id,item,filming:w.filming,x:w.x,y:w.y});}
        weather.rain=[];weather.kind='clear';currentAction=null;updateHud();currentAction=null;performance.now=()=>750;
        render();return out;
      })()`);
      await pg.screenshot({path: `${OUT}/${dev}_05_folk_bauman.png`});
      await ev('cam.zt=cam.z=9.5;render()');
      await pg.screenshot({path: `${OUT}/${dev}_06_folk_detail.png`});
      console.log(dev, '| свои люди на Баумана:', JSON.stringify(folk));
      const stop=await ev(`(()=>{const s=world.stops.slice().sort((a,b)=>dist(a.x,a.y,player.x,player.y)-dist(b.x,b.y,player.x,player.y))[0];if(!s)throw new Error('Нет остановки для снимка');
        const q=toSidewalk(s.x,s.y);player.x=q[0];player.y=q[1];cam.x=s.x;cam.y=s.y;cam.zt=cam.z=9.5;currentAction=null;render();return s.n;})()`);
      await pg.screenshot({path: `${OUT}/${dev}_07_stop_detail.png`});console.log(dev,'| остановка:',stop);
      await ctx.close();
    }
    await phoneUIShots(b);
  } finally { if(b)await b.close(); srv.kill(); }
  console.log('снимки в', OUT);
  console.log(errors.length ? errors.join('\n') : 'no page errors');
  if(errors.length)process.exitCode=1;
})().catch(e => { console.error('FAIL', e); process.exit(1); });
