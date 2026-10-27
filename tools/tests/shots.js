// Одинаковые снимки «до/после» для работы над графикой: толпа, транспорт, вход, свои люди на Баумана (обычный масштаб и детали).
// Телефон 390×844 и компьютер 1280×800. Запустить на сборке main («до») и на сборке своей ветки («после») в разные папки.
// node tools/tests/shots.js /tmp/zk-dev 8790 /tmp/shots-before
const {chromium} = require('playwright');
const {spawn} = require('child_process');
const fs = require('fs');
const DEV = process.argv[2], PORT = +process.argv[3] || 8790, OUT = process.argv[4] || '/tmp/shots';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  fs.mkdirSync(OUT, {recursive: true});
  const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {cwd: DEV, stdio: 'ignore'});
  await sleep(800);
  const b = await chromium.launch();
  const errors = [];
  try {
    for (const [dev, vp] of [['phone', {viewport: {width: 390, height: 844}, deviceScaleFactor: 3, isMobile: true, hasTouch: true}], ['desktop', {viewport: {width: 1280, height: 800}}]]) {
      const ctx = await b.newContext(vp); const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(dev + ': ' + e));
      const ev = s => pg.evaluate(s);
      await pg.goto(`http://127.0.0.1:${PORT}/index.html`);
      await pg.waitForFunction('document.querySelector("#loading").hidden === true', null, {timeout: 90000}); await sleep(800);
      await pg.fill('#pName', 'Тест'); await pg.click('#startBtn'); await sleep(300); await pg.click('#howtoClose'); await sleep(2000);
      const closeCards = () => ev('(()=>{let k=0;while(SIT.card&&k++<6){const c=SIT.card;pickChoice(c,c.choices[c.choices.length-1]);}})()');
      // одно и то же место: середина улицы Баумана, люди вокруг игрока
      const crowd = `(()=>{const L=llToXY([55.79242,49.11140]);const n=nearestNode(L[0],L[1],world.pedAdj,200);const q=sidewalkPos(n);player.x=q[0];player.y=q[1];cam.x=q[0];cam.y=q[1];cam.zt=cam.z=5.5;
        let k=0;for(const w of walkers){if(w.bus||w.inside||w.temp||k>=14)continue;const a=k*0.45,r=3+(k%4)*1.6;w.x=q[0]+Math.cos(a)*r;w.y=q[1]+Math.sin(a)*r;w.state='idle';w.ttl=30;w.path=null;k++;}return k;})()`;
      await ev(`zkSetTime((clock.day-1)*1440+13*60)`); await ev(crowd); await sleep(1200); await closeCards();
      await pg.screenshot({path: `${OUT}/${dev}_01_player_day.png`});
      await ev(`zkSetTime(clock.day*1440+21*60+30)`); await ev(crowd); await sleep(1200); await closeCards();
      await pg.screenshot({path: `${OUT}/${dev}_02_player_night.png`});
      // транспорт рядом: каршеринг, самокат, своя машина, такси
      await ev(`zkSetTime(clock.day*1440+12*60)`);
      await ev(`(()=>{const q=[player.x,player.y];for(const w of walkers)if(!w.bus&&!w.inside&&dist(w.x,w.y,q[0],q[1])<12){w.x+=30;w.state='idle';w.ttl=30;w.path=null;}
        const put=(o,dx,dy)=>{if(!o)return;o.x=q[0]+dx;o.y=q[1]+dy;o.hx=1;o.hy=0;};
        put(rentals.find(r=>r.kind==='car'),7,-3);put(rentals.find(r=>r.kind==='scooter'),2.5,2);
        if(ownCar){ownCar.parked=true;put(ownCar,-7,-3);}
        const t=cars.find(c=>!c.crashed);if(t){put(t,0,-8);t.kind='taxi';t.color='#F4C542';t.speed=0;}
        cam.x=q[0];cam.y=q[1];cam.zt=cam.z=5.5;})()`);
      await sleep(250); await closeCards();
      await pg.screenshot({path: `${OUT}/${dev}_03_vehicles.png`});
      // вход в кафе и кнопка действия
      const cafe = await ev(`(()=>{const c=world.pois.filter(p=>p.t==='cafe'&&p.n&&poiBuilding(p)).sort((a,b)=>dist(a.x,a.y,player.x,player.y)-dist(b.x,b.y,player.x,player.y))[0];if(!c)return null;
        const q=toSidewalk(c.x,c.y);player.x=q[0];player.y=q[1];cam.x=q[0];cam.y=q[1];cam.zt=cam.z=6;
        for(const w of walkers)if(!w.bus&&!w.inside&&dist(w.x,w.y,q[0],q[1])<9){w.x+=25;w.y+=25;w.state='idle';w.ttl=30;w.path=null;}return c.n;})()`);   // прохожих — в сторону, чтобы E было про вход
      await sleep(1200); await closeCards();
      await pg.screenshot({path: `${OUT}/${dev}_04_entrance.png`});
      console.log(dev, '| кафе:', cafe, '| действие:', await ev('currentAction?currentAction.label+(currentAction.tk?" ["+currentAction.tk+"]":""):null'));
      // Свои люди на Баумана: реальные персоны из данных, одни и те же четыре человека в обеих сборках.
      // Последняя сцена: останавливаем кадры только в этой тестовой странице, чтобы расписание не увело людей.
      await closeCards();
      await ev('window.requestAnimationFrame=((raf)=>cb=>cb===frame?0:raf.call(window,cb))(window.requestAnimationFrame)');await sleep(100);
      const folk = await ev(`(()=>{
        const active=sitActive('folkAct');if(active)endSit(active);
        zkSetTime((clock.day-1)*1440+13*60);updateClock(0);
        const L=llToXY([55.79242,49.11140]),n=nearestNode(L[0],L[1],world.pedAdj,200),q=sidewalkPos(n);
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
          w.x=q[0]+dx;w.y=q[1]+dy;w.hx=1;w.hy=0;w.phase=0;w.state='folkStay';w.path=null;w.mv=null;w.walking=false;w.bus=null;w.inside=null;w.filming=item==='phone';
          out.push({id,item,filming:w.filming});}
        weather.rain=[];weather.kind='clear';currentAction=null;updateHud();currentAction=null;performance.now=()=>750;
        render();return out;
      })()`);
      await pg.screenshot({path: `${OUT}/${dev}_05_folk_bauman.png`});
      await ev('cam.zt=cam.z=9.5;render()');
      await pg.screenshot({path: `${OUT}/${dev}_06_folk_detail.png`});
      console.log(dev, '| свои люди на Баумана:', JSON.stringify(folk));
      await ctx.close();
    }
  } finally { await b.close(); srv.kill(); }
  console.log('снимки в', OUT);
  console.log(errors.length ? errors.join('\n') : 'no page errors');
  if(errors.length)process.exitCode=1;
})().catch(e => { console.error('FAIL', e); process.exit(1); });
