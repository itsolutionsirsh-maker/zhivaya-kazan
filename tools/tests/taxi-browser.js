// Такси между игроками: настоящие браузеры с аккаунтами на своём Node-сервере (чистая база).
// Ильдар за рулём своей машины подъезжает к Лиле и предлагает подвезти. Лиля выбирает место, Ильдар называет 150 ₽,
// Лиля садится (её больше не видно, едет вместе с машиной). Ильдар довозит и высаживает — сервер переводит деньги
// (журнал кошелька, kind taxi), у обоих деньги в игре по серверу. «Таксист недели», лимит «раз в час на пассажира».
// Марат садится и выходит раньше — без денег, его снова видно. Гузель отказывается — Ильдар говорит строку без обиды.
// node tools/tests/taxi-browser.js <сборка> [порт, 8996]
const {chromium}=require('playwright');
const {spawn}=require('child_process');
const fs=require('fs'),os=require('os'),path=require('path'),crypto=require('crypto');
const DEV=path.resolve(process.argv[2]||'/tmp/zk-dev'),PORT=+process.argv[3]||8996,BASE=`http://127.0.0.1:${PORT}`;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const DATA=fs.mkdtempSync(path.join(os.tmpdir(),'zk-taxi-')),MOD=crypto.randomBytes(20).toString('hex');
let fails=0;const check=(ok,msg)=>{console.log((ok?'OK  ':'FAIL')+' '+msg);if(!ok)fails++;};
const api=(a,body,head)=>fetch(`${BASE}/api.php`,{method:'POST',headers:Object.assign({'Content-Type':'application/json'},head||{}),body:JSON.stringify(Object.assign({a},body))}).then(r=>r.json());
const mod=body=>api('mod',body,{'x-mod-token':MOD});
(async()=>{
  // ROLE_AGE_MS=0: аккаунты в проверке свежие; «моложе суток» проверяет taxi.test.js
  const srv=spawn(process.execPath,[path.join(__dirname,'../../server/node/server.js')],{env:Object.assign({},process.env,{GAME_DIR:DEV,DATA_DIR:DATA,PORT:String(PORT),MOD_TOKEN:MOD,TG_BOT_TOKEN:'',LLM_API_KEY:'',RW_OFF:'1',ROLE_AGE_MS:'0'}),stdio:['ignore','pipe','pipe']});
  let srvLog='';srv.stdout.on('data',d=>{srvLog+=d;});srv.stderr.on('data',d=>{srvLog+=d;});
  for(let i=0;i<40;i++){try{if((await api('ping',{})).ok)break;}catch(e){}await sleep(250);}
  const b=await chromium.launch();const errors=[];const tag=crypto.randomBytes(2).toString('hex');
  const open=async(name,login)=>{
    const pg=await (await b.newContext({viewport:{width:390,height:844}})).newPage();
    pg.on('pageerror',e=>errors.push(name+': '+e.message));
    pg.on('console',m=>{if(m.type()==='error'&&!/404|Failed to load resource/.test(m.text()))errors.push(name+': '+m.text());});
    await pg.goto(BASE+'/');await pg.waitForFunction('document.querySelector("#loading").hidden===true',null,{timeout:90000});await sleep(500);
    await pg.fill('#pName',name);await pg.click('#startBtn');await sleep(300);await pg.click('#howtoClose');await sleep(1500);
    await pg.click('#menuBtn');await pg.fill('#acctName',login);await pg.fill('#acctPin','763819');await pg.click('#acctGo');await pg.waitForSelector('#acctOut:not([hidden])',{timeout:20000});await pg.click('#menuClose');
    await pg.waitForFunction('Net.syncReady&&WAL.who',null,{timeout:30000});
    await pg.evaluate(()=>{window.zkNoStory=true;zkSetTime((clock.day-1)*1440+13*60);SIT.timer=1e9;
      window.__ev=[];const ae=addEvent;addEvent=function(t){__ev.push(String(t));return ae.apply(this,arguments);};
      window.__say=[];const sa=sayAloud;sayAloud=function(t){__say.push(String(t));return sa.apply(this,arguments);};});
    return pg;};
  const clear=pg=>pg.evaluate(()=>{let k=0;while(SIT.card&&!/🚕/.test(SIT.card.icon||'')&&k++<8){const c=SIT.card;pickChoice(c,c.choices[c.choices.length-1]);}});
  const waitCard=(pg,re)=>pg.waitForFunction(re=>SIT.card&&new RegExp(re).test(SIT.card.title),re,{timeout:15000}).then(()=>true,()=>false);
  const pickCard=(pg,re,label)=>pg.evaluate(([re,label])=>{const c=SIT.card;if(!c||!new RegExp(re).test(c.title))return {err:'нет карточки',title:c&&c.title};
    const ch=c.choices.find(x=>new RegExp(label).test(x.t));if(!ch)return {err:'нет кнопки',opts:c.choices.map(x=>x.t)};pickChoice(c,ch);return {ok:1,title:c.title,opts:c.choices.map(x=>x.t)};},[re,label]);
  const evs=(pg,re)=>pg.evaluate(re=>__ev.filter(t=>new RegExp(re).test(t)),re);
  const act=pg=>pg.evaluate(()=>{updateHud();return currentAction?currentAction.label:null;});
  const runAct=pg=>pg.evaluate(()=>{updateHud();if(currentAction)currentAction.run();});
  try{
    const D=await open('Ильдар','tx-d-'+tag),P=await open('Лиля','tx-p-'+tag);
    check(await D.evaluate('Net.taxi&&Net.mode==="ws"'),'сервер умеет такси, игроки на WebSocket');
    // точка на улице у центра; машина Ильдара здесь, Лиля — в 10 м; цель Лили — в 450 м по прямой
    const S=await D.evaluate(()=>{const n=nearestNode(0,0,world.carAdj,800);const q=world.nodes[n];return {x:q[0],y:q[1]};});
    await D.evaluate(s=>{player.x=s.x;player.y=s.y;player.hasCar=true;ownCar={kind:'own',x:s.x,y:s.y,hx:1,hy:0,color:'#C62828',parked:true};enterVehicle(ownCar);pushPresence();},S);
    check(await D.evaluate('player.vehicle&&player.vehicle.kind==="own"'),'Ильдар за рулём своей машины');
    // сервер узнаёт, что игрок за рулём, со следующей отправкой «как выглядит» (не чаще раза в 140 мс) — подождать её
    await D.waitForFunction(()=>typeof wsLastMeta==='string'&&JSON.parse(wsLastMeta).v==='own',null,{timeout:5000}).catch(()=>{});await sleep(300);
    await P.evaluate(s=>{player.x=s.x+10;player.y=s.y;player.waypoints=null;player.navDest={x:s.x+450,y:s.y,n:'Тестовая точка'};pushPresence();},S);
    await D.waitForFunction(()=>[...peerRender.values()].some(p=>p.name==='Лиля'&&!p.b&&dist(p.x,p.y,player.x,player.y)<25),null,{timeout:15000}).catch(()=>{});
    await clear(D);await clear(P);
    // 1) предложить подвезти
    const a1=await act(D);check(/Предложить подвезти: Лиля/.test(a1||''),'E у водителя рядом с игроком: '+a1);
    await runAct(D);check((await D.evaluate('__say.length'))===1&&await D.evaluate(`tpLines('offer').includes(__say[0])`),'Ильдар говорит строку offer: '+await D.evaluate('__say[0]'));
    check(await waitCard(P,'Ильдар предлагает подвезти'),'Лиле пришло предложение');
    const opts=await P.evaluate('SIT.card.choices.map(c=>c.t)');check(opts.includes('Тестовая точка')&&opts.includes('Не надо, спасибо'),'куда: '+opts.join(' | '));
    check((await pickCard(P,'предлагает подвезти','^Тестовая точка$')).ok,'Лиля выбрала место');
    // 2) цена
    check(await waitCard(D,'Лиля: до «Тестовая точка», 0,4 км'),'Ильдару: куда и сколько километров');
    const pr=await pickCard(D,'Тестовая точка','^150');check(pr.ok&&pr.opts.join(',')==='80 ₽,150 ₽,250 ₽,400 ₽,Отказать','цены: '+(pr.opts||[]).join(' | '));
    check(await waitCard(P,'Ильдар: до «Тестовая точка» — 150'),'Лиле: цена 150 ₽');
    const balD0=(await mod({do:'wallet',name:'tx-d-'+tag})).bal,balP0=(await mod({do:'wallet',name:'tx-p-'+tag})).bal;
    const moneyD0=await D.evaluate('walletLocal()'),moneyP0=await P.evaluate('walletLocal()');
    check((await pickCard(P,'— 150','^Сесть за 150')).ok,'Лиля садится');
    // 3) посадка: подходит к машине, говорит board, её больше не видно
    await P.waitForFunction(()=>TP.ride&&player.bus&&player.bus===TP.car,null,{timeout:12000}).catch(()=>{});
    check(await P.evaluate('!!(TP.ride&&player.bus===TP.car)'),'Лиля в машине (едет вместе с ней)');
    check(await P.evaluate(`__say.some(s=>tpLines('board').includes(s))`),'Лиля говорит строку board: '+await P.evaluate('__say.slice(-1)[0]'));
    await D.waitForFunction(()=>[...peerRender.values()].some(p=>p.name==='Лиля'&&p.b),null,{timeout:8000}).catch(()=>{});
    check(await D.evaluate(`[...peerRender.values()].some(p=>p.name==='Лиля'&&p.b)`),'у Ильдара Лилю больше не видно отдельно');
    check(await D.evaluate('!!(TP.ride&&player.vehicle.dest&&/Тестовая точка/.test(player.vehicle.dest.n))'),'у Ильдара метка цели: '+await D.evaluate('player.vehicle.dest&&player.vehicle.dest.n'));
    const h1=await fetch(BASE+'/health').then(r=>r.json());check(h1.roles&&h1.roles.rides===1,'/health: поездок в работе '+JSON.stringify(h1.roles));
    // 4) едем: 450 м за 18 секунд, Лиля — вместе с машиной
    for(let i=1;i<=9;i++){await D.evaluate(([s,i])=>{const v=player.vehicle;v.auto=null;v.speed=0;v.x=s.x+i*50;v.y=s.y;player.x=v.x;player.y=v.y;pushPresence();},[S,i]);await sleep(2000);}
    const pp=await P.evaluate('({x:player.x,y:player.y})');check(Math.abs(pp.x-(S.x+450))<15,`Лиля приехала вместе с машиной: ${Math.round(pp.x-S.x)} м от старта`);
    const a2=await act(D);check(/Высадить пассажира: «Тестовая точка»/.test(a2||''),'E у цели: '+a2);
    await runAct(D);
    await P.waitForFunction(()=>!TP.ride,null,{timeout:10000}).catch(()=>{});
    const dp=await evs(P,'Доехали'),dd=await evs(D,'оплачена');
    check(dp.length===1&&/−150/.test(dp[0]),'Лиле: '+dp[0]);check(dd.length===1&&/\+150/.test(dd[0])&&/Пассажир — Лиля\. Сегодня 1 из 20, за неделю 1/.test(dd[0]),'Ильдару: '+dd[0]);
    check(await P.evaluate('!player.bus&&!TP.car'),'Лиля вышла из машины');
    check(await D.evaluate(`__say.some(s=>tpLines('arrive').includes(s))`)&&await P.evaluate(`__say.some(s=>tpLines('thanks').includes(s))`),'вслух: Ильдар — arrive, Лиля — thanks');
    const wd=await mod({do:'wallet',name:'tx-d-'+tag}),wp=await mod({do:'wallet',name:'tx-p-'+tag});
    check(wd.bal===balD0+150&&wp.bal===balP0-150,`кошельки: Ильдар ${balD0} → ${wd.bal}, Лиля ${balP0} → ${wp.bal}`);
    check(wp.ops[0]&&wp.ops[0].kind==='taxi'&&/Ильдар довёз до «Тестовая точка»/.test(wp.ops[0].why||''),'журнал: '+JSON.stringify(wp.ops[0]&&{kind:wp.ops[0].kind,why:wp.ops[0].why}));
    await D.waitForFunction(m=>walletLocal()===m+150,moneyD0,{timeout:20000}).catch(()=>{});await P.waitForFunction(m=>walletLocal()===m-150,moneyP0,{timeout:20000}).catch(()=>{});
    check(await D.evaluate(m=>walletLocal()===m+150,moneyD0)&&await P.evaluate(m=>walletLocal()===m-150,moneyP0),'деньги в игре: Ильдар +150, Лиля −150');
    const rt=await fetch(BASE+'/api.php?a=ratings').then(r=>r.json());check(JSON.stringify(rt.taxiWeek)===JSON.stringify([{name:'Ильдар',n:1}]),'«Таксист недели»: '+JSON.stringify(rt.taxiWeek));
    // 5) ту же Лилю — только через час
    await P.evaluate(()=>{player.x+=8;pushPresence();});await sleep(1200);await clear(D);
    await runAct(D);await sleep(1200);check(/уже возили/.test(await D.evaluate(`$('#hint').textContent`)),'Лилю снова — через час: '+await D.evaluate(`$('#hint').textContent`));
    // 6) Марат садится и выходит раньше — без денег
    const M=await open('Марат','tx-m-'+tag);
    await M.evaluate(s=>{player.x=s.x+460;player.y=s.y;player.waypoints=null;player.navDest={x:s.x+460,y:s.y+600,n:'Север'};pushPresence();},S);
    await P.evaluate(()=>{player.x+=300;pushPresence();});await D.waitForFunction(n=>[...peerRender.values()].every(p=>p.name!==n||dist(p.x,p.y,player.x,player.y)>100),'Лиля',{timeout:8000}).catch(()=>{});   // водитель должен увидеть, что Лиля ушла: иначе E предложит снова ей
    await D.waitForFunction(()=>[...peerRender.values()].some(p=>p.name==='Марат'&&!p.b&&dist(p.x,p.y,player.x,player.y)<25),null,{timeout:15000}).catch(()=>{});
    await D.evaluate(()=>{TP.wait=null;});await clear(M);
    {const a=await act(D);check(/Предложить подвезти: Марат/.test(a||''),'Ильдар у Марата: '+a+' '+await D.evaluate(()=>JSON.stringify([...peerRender.values()].map(p=>[p.name,p.b,!!p.veh,Math.round(dist(p.x,p.y,player.x,player.y))]))));}await runAct(D);
    check(await waitCard(M,'предлагает подвезти'),'Марату пришло предложение');await pickCard(M,'предлагает подвезти','^Север$');
    check(await waitCard(D,'Марат: до «Север»'),'Ильдару: Марат едет на «Север»');await pickCard(D,'Север','^250');
    check(await waitCard(M,'— 250'),'Марату: 250 ₽');const balM0=(await mod({do:'wallet',name:'tx-m-'+tag})).bal;await pickCard(M,'— 250','^Сесть');
    await M.waitForFunction(()=>TP.ride&&player.bus===TP.car,null,{timeout:12000}).catch(()=>{});
    await D.evaluate(s=>{const v=player.vehicle;v.speed=0;v.auto=null;v.y=s.y+100;player.y=v.y;pushPresence();},S);await sleep(2500);
    const a3=await act(M);check(/Выйти здесь — без оплаты/.test(a3||''),'у Марата E: '+a3);
    await runAct(M);await M.waitForFunction(()=>!TP.ride,null,{timeout:10000}).catch(()=>{});
    check((await evs(M,'Вы вышли раньше — денег не взяли')).length===1&&(await evs(D,'Пассажир вышел раньше')).length===1,'вышел раньше — обоим сказано, без денег');
    check(await M.evaluate('!player.bus')&&(await mod({do:'wallet',name:'tx-m-'+tag})).bal===balM0,'Марат снова пешком, деньги на месте');
    await D.waitForFunction(()=>[...peerRender.values()].some(p=>p.name==='Марат'&&!p.b),null,{timeout:8000}).catch(()=>{});
    check(await D.evaluate(`[...peerRender.values()].some(p=>p.name==='Марат'&&!p.b)`),'Марата снова видно');
    // 7) Гузель отказывается — Ильдар отвечает строкой без обиды
    const G=await open('Гузель','tx-g-'+tag);const dpos=await D.evaluate('({x:player.x,y:player.y})');
    await M.evaluate(()=>{player.x+=400;pushPresence();});await D.waitForFunction(n=>[...peerRender.values()].every(p=>p.name!==n||dist(p.x,p.y,player.x,player.y)>100),'Марат',{timeout:8000}).catch(()=>{});
    await G.evaluate(s=>{player.x=s.x+6;player.y=s.y;player.waypoints=null;pushPresence();},dpos);
    await D.waitForFunction(()=>[...peerRender.values()].some(p=>p.name==='Гузель'&&!p.b&&dist(p.x,p.y,player.x,player.y)<25),null,{timeout:15000}).catch(()=>{});await clear(G);
    await D.evaluate(()=>{TP.wait=null;__say.length=0;});await runAct(D);check(await waitCard(G,'предлагает подвезти'),'Гузели пришло предложение');
    await pickCard(G,'предлагает подвезти','^Не надо');await sleep(1500);
    check(/Пассажир не поехал/.test(await D.evaluate(`$('#hint').textContent`))&&await D.evaluate(`__say.some(s=>tpLines('cancel').includes(s))`),'отказ: подсказка и строка cancel — '+await D.evaluate('__say.slice(-1)[0]'));
    check(!errors.length,'без ошибок в консоли'+(errors.length?': '+errors.slice(0,3).join(' | '):''));
  }catch(e){console.log('FAIL',e.message);fails++;}
  finally{await b.close();srv.kill();try{fs.rmSync(DATA,{recursive:true,force:true});}catch(e){}}
  if(fails)console.log(srvLog.split('\n').slice(-15).join('\n'));
  console.log(fails?`FAILED ${fails}`:'ALL OK');process.exit(fails?1:0);
})();
