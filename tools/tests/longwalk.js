// Дальний пеший маршрут: находится (раньше дальше ~8 км — «не найден»), ищется по частям без долгих кадров, отменяется джойстиком/клавишами.
// node tools/tests/longwalk.js <сборка> [порт, 8965]
const {chromium}=require('playwright');
const {spawn}=require('child_process');
const DEV=process.argv[2],PORT=+process.argv[3]||8965;
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
    await pg.waitForFunction('document.querySelector("#loading").hidden===true',null,{timeout:60000});await sleep(1000);
    await pg.fill('#pName','Тест');await pg.click('#startBtn');await sleep(500);await pg.click('#howtoClose');await sleep(1500);
    await ev('loadChunksAround([[0,0]],9000)');await sleep(500);
    // пара узлов: самые далёкие друг от друга связанные узлы в разных углах карты (BFS по пешим рёбрам от старта)
    const pair=await ev(`(()=>{const G=world.g,N=world.N;
      const near=(x,y)=>{let best=-1,bd=1e18;for(let i=0;i<N;i++){if(!(G.nm[i]&1))continue;const p=world.nodes[i];const d=(p[0]-x)**2+(p[1]-y)**2;if(d<bd){bd=d;best=i;}}return best;};
      const bb=world.bbox;let a=-1,seen=null;
      // старт — узел с большим связным куском вокруг
      for(const [fx,fy] of [[-5000,-5000],[-4000,4000],[4000,-4000],[-5500,0],[0,-5500]]){const s=near(fx,fy);const sn=new Uint8Array(N);const q=[s];sn[s]=1;let c=0;
        while(q.length){const u=q.pop();c++;for(let e=G.eh[u];e>=0;e=G.en[e]){if(!(G.ef[e]&1))continue;const v=G.et[e];if(!sn[v]){sn[v]=1;q.push(v);}}}
        if(c>20000){a=s;seen=sn;break;}}
      if(a<0)return null;const pa=world.nodes[a];let far=-1,fd=0,unreach=-1;
      for(let i=0;i<N;i++){if(!(G.nm[i]&1))continue;const p=world.nodes[i];const d=Math.hypot(p[0]-pa[0],p[1]-pa[1]);if(seen[i]&&d>fd&&d<14000){fd=d;far=i;}if(!seen[i]&&d>4000&&unreach<0&&G.eh[i]>=0)unreach=i;}
      const near2=(()=>{for(let i=0;i<N;i++){if(!seen[i])continue;const p=world.nodes[i];const d=Math.hypot(p[0]-pa[0],p[1]-pa[1]);if(d>900&&d<1500)return i;}return -1;})();
      return {a,far,fd:Math.round(fd),unreach,near:near2};})()`);
    check(pair&&pair.far>=0&&pair.fd>8500,`есть пара узлов дальше 8,5 км: ${pair&&pair.fd} м`);
    if(!pair)throw new Error('нет пары');
    // замер: самый долгий кусок поиска за кадр и самый долгий кадр
    await ev(`(()=>{const rt=routeTick;window.__rt={max:0,n:0};routeTick=function(){const t=performance.now();rt();const d=performance.now()-t;if(d>__rt.max)__rt.max=d;__rt.n++;};})()`);
    const put=`(()=>{const p=world.nodes[${pair.a}];player.x=p[0]+0.5;player.y=p[1]+0.5;player.waypoints=null;player.route=null;cam.x=player.x;cam.y=player.y;})()`;
    // 1) дальний маршрут
    await ev(put);
    const t0=Date.now();
    const st=await ev(`(()=>{const p=world.nodes[${pair.far}];const ok=walkTo(p[0],p[1],true);return {ok,route:!!player.route,wps:player.waypoints&&player.waypoints.length,hint:document.querySelector('#hint').textContent};})()`);
    check(st.ok&&st.route&&st.wps===0,`дальний маршрут ищется по частям: ${JSON.stringify(st)}`);
    check(/Прокладываем/.test(st.hint),'подсказка «Прокладываем маршрут…»');
    await pg.waitForFunction('!player.route',null,{timeout:20000}).catch(()=>{});
    const done=await ev(`(()=>{const w=player.waypoints;const p=world.nodes[${pair.far}];return {route:!!player.route,n:w?w.length:null,last:w&&w.length?Math.hypot(w[w.length-1][0]-p[0],w[w.length-1][1]-p[1]):null,rt:__rt,hint:document.querySelector('#hint').hidden?'':document.querySelector('#hint').textContent};})()`);
    console.log('  поиск:',Date.now()-t0,'мс, кадров с поиском:',done.rt.n,'самый долгий кусок:',done.rt.max.toFixed(1),'мс');
    check(!done.route&&done.n>20&&done.last<1,`маршрут построен: ${done.n} точек, конец у цели (${done.last})`);
    check(done.rt.max<12,`кусок поиска за кадр не больше ~4 мс (+ сборка пути): ${done.rt.max.toFixed(1)} мс`);
    check(!/не найден/.test(done.hint),'нет «маршрут не найден»');
    await sleep(1500);
    const moved=await ev(`Math.hypot(player.x-world.nodes[${pair.a}][0],player.y-world.nodes[${pair.a}][1])`);
    check(moved>2,`игрок пошёл: ${moved.toFixed(1)} м`);
    // 2) отмена: клавиша во время поиска
    await ev(put);
    await ev(`(()=>{const p=world.nodes[${pair.far}];walkTo(p[0],p[1],true);})()`);
    await pg.keyboard.down('w');await sleep(250);await pg.keyboard.up('w');await sleep(800);
    const cancel=await ev('({route:!!player.route,wps:player.waypoints})');
    check(!cancel.route&&cancel.wps===null,`клавиша отменила поиск: ${JSON.stringify(cancel)}`);
    // 3) навигатор пешком: пока ищем — не встаёт на паузу, потом идёт
    await ev(put);
    await ev(`(()=>{const p=world.nodes[${pair.far}];startWalkNav({x:p[0],y:p[1],n:'Дальняя точка'});})()`);
    await sleep(700);
    const nav1=await ev('({nav:!!player.navDest,paused:player.navPaused,route:!!player.route})');
    await pg.waitForFunction('!player.route',null,{timeout:20000}).catch(()=>{});await sleep(700);
    const nav2=await ev('({nav:!!player.navDest,paused:player.navPaused,wps:player.waypoints?player.waypoints.length:null})');
    check(nav1.nav&&!nav1.paused,`навигатор во время поиска не на паузе: ${JSON.stringify(nav1)}`);
    check(nav2.nav&&!nav2.paused&&nav2.wps>5,`навигатор ведёт: ${JSON.stringify(nav2)}`);
    await ev('cancelTrip(true)');
    // 4) недостижимая точка дальше 2,5 км — «не найден», игрок стоит
    if(pair.unreach>=0){
      await ev(put);
      await ev(`(()=>{const p=world.nodes[${pair.unreach}];walkTo(p[0],p[1],true);})()`);
      await pg.waitForFunction('!player.route',null,{timeout:30000}).catch(()=>{});
      const un=await ev(`({route:!!player.route,wps:player.waypoints,hint:document.querySelector('#hint').textContent,rt:__rt.max})`);
      check(!un.route&&un.wps===null&&/не найден/.test(un.hint),`недостижимая точка: ${JSON.stringify(un)}`);
    }else console.log('SKIP недостижимых узлов на карте нет');
    // 5) близкий маршрут — как раньше, сразу
    if(pair.near>=0){
      await ev(put);
      const nr=await ev(`(()=>{const p=world.nodes[${pair.near}];const ok=walkTo(p[0],p[1],true);return {ok,route:!!player.route,wps:player.waypoints?player.waypoints.length:null};})()`);
      check(nr.ok&&!nr.route&&nr.wps>1,`близкий маршрут строится сразу: ${JSON.stringify(nr)}`);
    }
    check(!errors.length,'без ошибок в консоли'+(errors.length?': '+errors.slice(0,3).join(' | '):''));
  }finally{await b.close();srv.kill();}
  console.log(fails?`FAILED ${fails}`:'ALL OK');process.exit(fails?1:0);
})();
