// Real Node server, three independent accounts, public observer. No mocked game API.
// node tools/tests/courtyard-browser.js <build> [port=8993]
const {chromium}=require('playwright'),{spawn}=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const DEV=path.resolve(process.argv[2]),PORT=+process.argv[3]||8993,BASE=`http://127.0.0.1:${PORT}`,DATA=fs.mkdtempSync(path.join(os.tmpdir(),'yard-browser-')),MOD=crypto.randomBytes(16).toString('hex');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{let srv,b,logs='',errors=[];
  try{
    srv=spawn(process.execPath,[path.join(__dirname,'../../server/node/server.js')],{env:{...process.env,GAME_DIR:DEV,DATA_DIR:DATA,PORT:String(PORT),MOD_TOKEN:MOD,TG_BOT_TOKEN:'',LLM_API_KEY:'',RW_OFF:'1'},stdio:['ignore','pipe','pipe'],windowsHide:true});
    srv.on('error',e=>{logs+=e;});srv.stdout.on('data',d=>{logs+=d;});srv.stderr.on('data',d=>{logs+=d;});
    for(let i=0;i<60;i++){try{if((await fetch(BASE+'/api.php?a=ping')).ok)break;}catch(_){}if(i===59)throw Error(logs);await sleep(200);}
    b=await chromium.launch();const players=[];
    for(let i=0;i<4;i++){
      const pg=await(await b.newContext({viewport:{width:i===3?1280:390,height:i===3?800:844}})).newPage();pg.on('pageerror',e=>errors.push(e.message));
      await pg.goto(BASE);await pg.waitForFunction(()=>document.getElementById('loading').hidden,null,{timeout:90000});
      await pg.fill('#pName','Сосед '+i);await pg.click('#startBtn');await pg.click('#howtoClose');
      if(i<3){await pg.click('#menuBtn');await pg.fill('#acctName','yard-'+crypto.randomBytes(4).toString('hex'));await pg.fill('#acctPin','763819');await pg.click('#acctGo');await pg.waitForFunction(()=>Net.syncReady&&acct?.token);await pg.click('#menuClose');}
      await pg.evaluate(()=>{window.zkNoStory=true;SIT.card=null;SIT.queue=[];document.getElementById('sitCard').hidden=true;const p=cityCourtyard.point();Object.assign(player,{x:p.x,y:p.y,waypoints:null,busy:false});Object.assign(cam,{x:p.x,y:p.y});pushPresence();});
      await sleep(1200);await pg.evaluate(()=>cityCourtyard.open());players.push(pg);
    }
    for(const step of ['bench','light','mural']){
      await Promise.all(players.slice(0,3).map((pg,i)=>pg.locator(`[data-yard-task="${step}:${i}"]`).click()));
      await Promise.all(players.slice(0,3).map(pg=>pg.waitForFunction(()=>cityCourtyard.snapshot()?.me.work)));
      await Promise.all(players.slice(0,3).map(pg=>pg.getByRole('button',{name:'Закончить работу',exact:true}).click({timeout:15000})));
      await Promise.all(players.map(pg=>pg.waitForFunction(step=>[0,1,2].every(i=>cityCourtyard.snapshot()?.done[step+':'+i]),step,{timeout:15000})));
    }
    for(const pg of players.slice(0,3))assert.equal(await pg.evaluate(()=>cityCourtyard.snapshot().me.today),3);
    assert.equal(await players[3].evaluate(()=>Object.keys(cityCourtyard.snapshot().done).length),9);
    const mod=async body=>fetch(BASE+'/api.php',{method:'POST',headers:{'Content-Type':'application/json','X-Mod-Token':MOD},body:JSON.stringify({a:'courtyard',...body})}).then(r=>r.json());
    const s=await mod({op:'modStatus'});assert.equal((await mod({op:'rollback',stage:'light',rev:s.state.rev,reason:'Проверка отката',request:crypto.randomBytes(16).toString('hex')})).ok,1);
    await Promise.all(players.map(pg=>pg.waitForFunction(()=>Object.keys(cityCourtyard.snapshot().done).length===3,null,{timeout:15000})));
    for(const pg of players.slice(0,3))assert.equal(await pg.locator('[data-yard-task="light:0"]').isDisabled(),true);
    assert.deepEqual(errors,[]);console.log('PASS: 3 browser accounts + guest, 9 jobs, account caps, shared rollback, no page errors');
  }finally{if(b)await b.close();if(srv){srv.kill();await Promise.race([new Promise(r=>srv.once('exit',r)),sleep(3000)]);}fs.rmSync(DATA,{recursive:true,force:true,maxRetries:5});}
})().catch(e=>{console.error(e);process.exitCode=1;});
