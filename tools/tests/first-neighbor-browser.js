// Real local server, guest choices + account save/load, reloads, phone layouts. Never uses production.
// node tools/tests/first-neighbor-browser.js <build> <output> [port=8997]
const {chromium}=require('playwright'),{spawn}=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const DEV=path.resolve(process.argv[2]),OUT=path.resolve(process.argv[3]),PORT=+process.argv[4]||8997,BASE=`http://127.0.0.1:${PORT}`,DATA=fs.mkdtempSync(path.join(os.tmpdir(),'first-neighbor-'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));fs.mkdirSync(OUT,{recursive:true});
(async()=>{let srv,b,logs='',errors=[];
  try{
    srv=spawn(process.execPath,[path.join(__dirname,'../../server/node/server.js')],{env:{...process.env,GAME_DIR:DEV,DATA_DIR:DATA,PORT:String(PORT),TG_BOT_TOKEN:'',LLM_API_KEY:'',RW_OFF:'1'},stdio:['ignore','pipe','pipe'],windowsHide:true});
    srv.on('error',e=>{logs+=e;});srv.stdout.on('data',d=>{logs+=d;});srv.stderr.on('data',d=>{logs+=d;});
    for(let i=0;i<60;i++){try{if((await fetch(BASE+'/api.php?a=ping')).ok)break;}catch(_){}if(i===59)throw Error(logs);await sleep(200);}
    b=await chromium.launch();
    const create=async(width,height,old=false)=>{
      const context=await b.newContext({viewport:{width,height}}),pg=await context.newPage();
      pg.on('pageerror',e=>errors.push(e.message));pg.on('console',m=>{if(m.type()==='error'&&m.text().startsWith('кадр:'))errors.push(m.text());});
      if(old)await context.addInitScript(()=>localStorage.setItem('zk.state',JSON.stringify({t:1})));
      await pg.goto(BASE);await pg.waitForFunction(()=>document.getElementById('loading').hidden,null,{timeout:90000});
      await pg.fill('#pName','Первый сосед');await pg.click('#startBtn');await pg.click('#howtoClose');
      return pg;
    };
    const at=async(pg,key)=>pg.evaluate(key=>{const p=cityFirstNeighbor.snapshot()[key];Object.assign(player,{x:p.x,y:p.y,waypoints:null,busy:false});Object.assign(cam,{x:p.x,y:p.y,z:7,zt:7});},key);
    const open=async pg=>{await pg.evaluate(()=>cityFirstNeighbor.open());await pg.waitForSelector('#sitCard:not([hidden])');};
    const click=async(pg,text)=>pg.locator('#scBtns button').filter({hasText:text}).click();
    const stage=async(pg,s)=>pg.waitForFunction(s=>cityFirstNeighbor.snapshot()?.stage===s,s);
    const layout=async pg=>{const bad=await pg.evaluate(()=>[...document.querySelectorAll('#scBtns button,#scX')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&(r.left<0||r.top<0||r.right>innerWidth+1||r.bottom>innerHeight+1);}).map(e=>e.textContent));assert.deepEqual(bad,[]);};
    for(const [width,height,choice] of [[360,640,'photos'],[390,844,'board'],[844,390,'skip'],[1280,800,'photos']]){
      const pg=await create(width,height);await stage(pg,'invite');
      assert.equal(await pg.evaluate(()=>cityObjectives.active()?.id),'first-neighbor-invite');
      assert.equal(await pg.evaluate(()=>{const s=cityFirstNeighbor.snapshot();return [s.home,s.photos,s.board].every(p=>!inBuilding(p.x,p.y));}),true);
      await pg.screenshot({path:path.join(OUT,`${width}-goal.png`)});
      await at(pg,'home');await open(pg);await layout(pg);await pg.screenshot({path:path.join(OUT,`${width}-choice.png`)});
      await click(pg,choice==='photos'?'Собрать снимки':choice==='board'?'Закрепить стенд':'Сейчас не могу');
      if(choice==='skip'){await stage(pg,'skipped');assert.equal(await pg.evaluate(()=>cityFirstNeighbor.active()),false);await pg.context().close();continue;}
      await stage(pg,choice);
      await pg.reload();await pg.waitForFunction(()=>document.getElementById('loading').hidden,null,{timeout:90000});await stage(pg,choice);
      // Actual pedestrian navigation, not just a transition fixture: walk the generated route.
      await pg.evaluate(choice=>{const p=cityFirstNeighbor.snapshot()[choice];startWalkNav({...p,n:'Помочь Амине'});},choice);
      await pg.waitForFunction(choice=>{const p=cityFirstNeighbor.snapshot()[choice];return dist(player.x,player.y,p.x,p.y)<14;},choice,{timeout:60000});
      await open(pg);await click(pg,choice==='photos'?'Собрать и отнести':'Натянуть шнур');await stage(pg,'return');
      await at(pg,'home');await open(pg);await layout(pg);await pg.screenshot({path:path.join(OUT,`${width}-result.png`)});
      await click(pg,'До встречи');await stage(pg,'done');
      assert.equal(await pg.evaluate(()=>cityFirstNeighbor.active()),false);
      assert.equal(await pg.evaluate(()=>cityFirstNeighbor.snapshot().reunion),undefined);
      await pg.evaluate(()=>{window.zkTestDay=new Date(Date.parse(cityFirstNeighbor.snapshot().day)+86400000).toISOString().slice(0,10);cityObjectives.refresh();});
      await open(pg);await layout(pg);await pg.screenshot({path:path.join(OUT,`${width}-reunion.png`)});
      await click(pg,'Лица нашего двора');assert.equal(await pg.evaluate(()=>cityFirstNeighbor.snapshot().reunion),'people');
      if(width===390){
        // Use existing API and complete account snapshot: no feature-specific server route required.
        const saved=await pg.evaluate(async()=>{const j=await acctCall('login',{name:'first-neighbor-test',pin:'792631'});acct={token:j.token,name:j.name};localStorage.setItem('zk.acct',JSON.stringify(acct));Net.syncReady=true;setRev(j.updated||0);await acctSave();return acctCall('load',{token:acct.token});});
        assert.equal(saved.state.prog.firstNeighbor.reunion,'people');assert.equal(saved.state.prog.firstNeighbor.choice,'board');
      }
      await pg.reload();await pg.waitForFunction(()=>document.getElementById('loading').hidden,null,{timeout:90000});
      assert.equal(await pg.evaluate(()=>cityFirstNeighbor.snapshot().reunion),'people');
      console.log(`PASS ${width}: ${choice}, walk route, reload, next-day memory, visible controls`);await pg.context().close();
    }
    const old=await create(390,844,true);await old.waitForFunction(()=>cityFirstNeighbor.snapshot()?.stage==='old');assert.equal(await old.evaluate(()=>cityFirstNeighbor.active()),false);await old.context().close();
    assert.deepEqual(errors,[]);console.log('PASS: existing save not interrupted; real account snapshot; zero page/frame errors');
  }finally{if(b)await b.close();if(srv){srv.kill();await Promise.race([new Promise(r=>srv.once('exit',r)),sleep(2000)]);}fs.rmSync(DATA,{recursive:true,force:true,maxRetries:5});}
})().catch(e=>{console.error(e);process.exitCode=1;});
