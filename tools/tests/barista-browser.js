// Бариста между игроками: два настоящих браузера с аккаунтами на своём Node-сервере (чистая база).
// Алсу работает баристой, у неё была смена; в своём кафе она «за стойкой». Булат в том же кафе подходит, заказывает
// капучино, Алсу называет 120 ₽, Булат платит — сервер переводит деньги с карты на карту (журнал кошелька, kind coffee),
// у обоих карта по серверу без лишних «Списано/Зачислено». «Бариста недели». Отказ баристы, отказ гостя, выход из кафе.
// Без смены — подсказка, аккаунт моложе суток — подсказка. Ушла из кафе — у Булата заказа больше нет.
// node tools/tests/barista-browser.js <сборка> [порт, 8989]
const {chromium}=require('playwright');
const {spawn}=require('child_process');
const fs=require('fs'),os=require('os'),path=require('path'),crypto=require('crypto');
const DEV=path.resolve(process.argv[2]||'/tmp/zk-dev'),PORT=+process.argv[3]||8989,BASE=`http://127.0.0.1:${PORT}`;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const DATA=fs.mkdtempSync(path.join(os.tmpdir(),'zk-bar-')),MOD=crypto.randomBytes(20).toString('hex');
let fails=0;const check=(ok,msg)=>{console.log((ok?'OK  ':'FAIL')+' '+msg);if(!ok)fails++;};
const api=(a,body,head)=>fetch(`${BASE}/api.php`,{method:'POST',headers:Object.assign({'Content-Type':'application/json'},head||{}),body:JSON.stringify(Object.assign({a},body))}).then(r=>r.json());
const mod=body=>api('mod',body,{'x-mod-token':MOD});
(async()=>{
  // ROLE_AGE_MS=0: аккаунты в проверке свежие; «моложе суток» проверяет roles.test.js, здесь — только подсказка
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
    if(login){await pg.click('#menuBtn');await pg.fill('#acctName',login);await pg.fill('#acctPin','763819');await pg.click('#acctGo');await pg.waitForSelector('#acctOut:not([hidden])',{timeout:20000});await pg.click('#menuClose');
      await pg.waitForFunction('Net.syncReady&&WAL.who',null,{timeout:30000});}
    await pg.evaluate(()=>{window.zkNoStory=true;zkSetTime((clock.day-1)*1440+13*60);
      window.__ev=[];const ae=addEvent;addEvent=function(t){__ev.push(String(t));return ae.apply(this,arguments);};});
    return pg;};
  const cards=pg=>pg.evaluate(()=>{let k=0;while(SIT.card&&!/☕/.test(SIT.card.icon||'')&&k++<8){const c=SIT.card;pickChoice(c,c.choices[c.choices.length-1]);}});
  const pickCard=(pg,re,label)=>pg.evaluate(([re,label])=>{const c=SIT.card;if(!c||!new RegExp(re).test(c.title))return {err:'нет карточки',title:c&&c.title,queue:SIT.queue.map(q=>q.title)};
    const ch=c.choices.find(x=>x.t===label);if(!ch)return {err:'нет кнопки',opts:c.choices.map(x=>x.t)};pickChoice(c,ch);return {ok:1,title:c.title};},[re,label]);
  const waitCard=(pg,re)=>pg.waitForFunction(re=>SIT.card&&new RegExp(re).test(SIT.card.title),re,{timeout:15000}).then(()=>true,()=>false);
  const evs=(pg,re)=>pg.evaluate(re=>__ev.filter(t=>new RegExp(re).test(t)),re);
  try{
    const A=await open('Алсу','bar-a-'+tag),B=await open('Булат','bar-b-'+tag);
    check(await A.evaluate('Net.roles&&Net.mode==="ws"'),'сервер умеет роли, игроки на WebSocket');
    // кафе у центра; Алсу — бариста в нём
    const cafe=await A.evaluate(`(()=>{const c=world.pois.filter(p=>p.t==='cafe'&&p.n&&(typeof poiOpen!=='function'||poiOpen(p))).sort((a,b)=>Math.hypot(a.x,a.y)-Math.hypot(b.x,b.y))[0];return {x:c.x,y:c.y,n:c.n,t:c.t};})()`);
    const enter=(pg,c)=>pg.evaluate(c=>{const p=world.pois.find(q=>q.n===c.n&&Math.abs(q.x-c.x)<0.5&&Math.abs(q.y-c.y)<0.5);player.x=p.x;player.y=p.y;player.waypoints=null;
      enterInterior({kind:p.t,name:p.n,key:poiKey(p),x:player.x,y:player.y,venueAt:{x:p.x,y:p.y}});return {scene,room:interior&&interior.room,key:interior&&interior.key};},c);
    await A.evaluate(c=>{const p=world.pois.find(q=>q.n===c.n&&Math.abs(q.x-c.x)<0.5);hire({id:'barista',J:WORK.barista,p});},cafe);
    // 1) без полной смены — за стойку нельзя, подсказка
    const ra=await enter(A,cafe);await sleep(1500);
    check(ra.room&&ra.key===await A.evaluate('player.job.key'),`Алсу в своём кафе «${cafe.n}», общая комната`);
    check(!(await A.evaluate('BAR.on'))&&(await evs(A,'одну полную смену')).length===1,'без смены — не за стойкой, подсказка про смену');
    // подсказка «аккаунт моложе суток» (сервер в проверке разрешает сразу — ответ подставлен)
    await A.evaluate(`barApply({k:'duty',on:false,err:'young'})`);check((await evs(A,'больше суток')).length===1,'аккаунт моложе суток — подсказка');
    // 2) одна смена позади — за стойкой
    await A.evaluate('player.job.full=1');await A.waitForFunction('BAR.on',null,{timeout:10000}).catch(()=>{});
    check(await A.evaluate('BAR.on')&&(await evs(A,'Вы за стойкой')).length===1,'после смены — за стойкой: '+((await evs(A,'Вы за стойкой'))[0]||''));
    const h1=await fetch(BASE+'/health').then(r=>r.json());check(h1.roles&&h1.roles.baristas===1,`/health: ${JSON.stringify(h1.roles)}`);
    // 3) Булат в том же кафе видит баристу и заказывает капучино
    const rb=await enter(B,cafe);check(rb.room===ra.room,'Булат в той же комнате');
    await B.waitForFunction(()=>[...peerRender.values()].some(p=>sharedPeerHere(p)&&p.rl==='barista'),null,{timeout:10000}).catch(()=>{});
    const pos=await A.evaluate('({ix:player.ix,iy:player.iy})');
    const act=await B.evaluate(p=>{player.ix=p.ix+1;player.iy=p.iy;pushPresence();updateHud();return currentAction&&currentAction.label;},pos);
    check(/Заказать у баристы: Алсу/.test(act||''),`у Алсу — «${act}»`);
    const balA0=(await mod({do:'wallet',name:'bar-a-'+tag})).bal,balB0=(await mod({do:'wallet',name:'bar-b-'+tag})).bal;
    const moneyA0=await A.evaluate('walletLocal()'),moneyB0=await B.evaluate('walletLocal()');
    await cards(B);await B.evaluate('currentAction.run()');
    check((await pickCard(B,'^Бариста Алсу','Капучино')).ok,'Булат выбрал «Капучино»');
    check(await waitCard(A,'Булат просит: Капучино'),'Алсу видит заказ');
    check((await pickCard(A,'Булат просит','120 ₽')).ok,'Алсу назвала 120 ₽');
    check(await waitCard(B,'«Капучино» — 120'),'Булат видит цену');
    check((await pickCard(B,'«Капучино» — 120','Оплатить 120 ₽')).ok,'Булат платит');
    await B.waitForFunction(()=>__ev.some(t=>/Капучино от баристы Алсу/.test(t)),null,{timeout:15000}).catch(()=>{});
    await A.waitForFunction(()=>__ev.some(t=>/Булат: «Капучино» оплачен, \+120/.test(t)),null,{timeout:15000}).catch(()=>{});
    check((await evs(B,'Капучино от баристы Алсу: −120')).length===1,'у Булата в ленте: '+((await evs(B,'Капучино'))[0]||''));
    check((await evs(A,'оплачен, \\+120 ₽. Сегодня 1 из 40, за неделю 1')).length===1,'у Алсу в ленте: '+((await evs(A,'оплачен'))[0]||''));
    const wa=await mod({do:'wallet',name:'bar-a-'+tag}),wb=await mod({do:'wallet',name:'bar-b-'+tag});
    check(wa.bal-balA0===120&&balB0-wb.bal===120,`кошельки на сервере: Алсу +${wa.bal-balA0}, Булат −${balB0-wb.bal}`);
    check(wb.ops.some(o=>o.kind==='coffee'&&o.amt===-120&&/Капучино у баристы Алсу/.test(o.why))&&wa.ops.some(o=>o.kind==='coffee'&&o.amt===120),'в журнале кошелька — перевод за кофе');
    // карта у обоих — по серверу (сохранение вернуло баланс), без общей строки «Списано/Зачислено» на ту же сумму
    await A.waitForFunction(m=>walletLocal()===m+120,moneyA0,{timeout:20000}).catch(()=>{});await B.waitForFunction(m=>walletLocal()===m-120,moneyB0,{timeout:20000}).catch(()=>{});
    check(await A.evaluate(m=>walletLocal()===m+120,moneyA0)&&await B.evaluate(m=>walletLocal()===m-120,moneyB0),'деньги в игре: Алсу +120, Булат −120');
    check(!(await evs(A,'Зачислено на карту')).length&&!(await evs(B,'Списано по данным сервера')).length,'без лишних «Зачислено/Списано»');
    await B.waitForFunction(()=>{const p=[...peerRender.values()].find(p=>p.rl==='barista');return p&&p.say&&p.say.t;},null,{timeout:8000}).catch(()=>{});
    const said=await B.evaluate(()=>{const p=[...peerRender.values()].find(p=>p.rl==='barista');return p&&p.say?p.say.t:'';});
    check(await B.evaluate(t=>cityRoles.find(r=>r.id==='barista').lines.includes(t),said),`бариста вслух — строка второго программиста: «${said}»`);
    const top=await fetch(BASE+'/api.php?a=ratings').then(r=>r.json());check(top.ok&&top.coffeeWeek.length===1&&top.coffeeWeek[0].name==='Алсу'&&top.coffeeWeek[0].n===1,`«Бариста недели»: ${JSON.stringify(top.coffeeWeek)}`);
    // в окне «Работа» у Алсу — «Бариста недели»
    await A.evaluate('openJobs()');await A.waitForFunction(()=>document.querySelector('#barTop .bar-top li'),null,{timeout:10000}).catch(()=>{});
    check(/Алсу — 1/.test(await A.evaluate(`(document.querySelector('#barTop')||{}).textContent||''`)),'в окне «Работа» — «Бариста недели»');await A.evaluate('closeJobs()');
    // 4) бариста отказала
    await B.evaluate('updateHud();currentAction.run()');await pickCard(B,'^Бариста Алсу','Чёрный чай');await waitCard(A,'Булат просит: Чёрный чай');await pickCard(A,'Булат просит','Отказать');
    await B.waitForFunction(()=>__ev.some(t=>/Бариста не взял заказ/.test(t)),null,{timeout:10000}).catch(()=>{});check((await evs(B,'Бариста не взял заказ')).length===1,'бариста отказала — у гостя «не взял заказ»');
    // 5) гость отказался от цены
    await B.evaluate('updateHud();currentAction.run()');await pickCard(B,'^Бариста Алсу','Латте');await waitCard(A,'Булат просит: Латте');await pickCard(A,'Булат просит','220 ₽');
    await waitCard(B,'«Латте» — 220');await pickCard(B,'«Латте» — 220','Отказаться');
    await A.waitForFunction(()=>__ev.some(t=>/Гость отказался/.test(t)),null,{timeout:10000}).catch(()=>{});check((await evs(A,'Гость отказался')).length===1,'гость отказался — у баристы строка');
    // 6) гость вышел из кафе, пока ждали оплату — заказ отменён у обоих
    await B.evaluate('updateHud();currentAction.run()');await pickCard(B,'^Бариста Алсу','Американо');await waitCard(A,'Булат просит: Американо');await pickCard(A,'Булат просит','80 ₽');
    await waitCard(B,'«Американо» — 80');await B.evaluate('exitInterior()');
    await A.waitForFunction(()=>__ev.some(t=>/кто-то вышел из кафе/.test(t)),null,{timeout:10000}).catch(()=>{});
    const left={a:await evs(A,'вышел из кафе'),b:await evs(B,'вышел из кафе'),card:await B.evaluate('!!(SIT.card&&/Американо/.test(SIT.card.title))'),scene:await B.evaluate('scene')};
    check(left.a.length===1&&left.b.length===1&&!left.card,`гость вышел — заказ отменён у обоих, карточки цены больше нет: ${JSON.stringify(left)}`);
    const wb2=await mod({do:'wallet',name:'bar-b-'+tag});check(wb2.bal===wb.bal||wb2.bal>=wb.bal-0,'отказы и отмены денег не списали');
    // 7) бариста вышла из кафе — за стойкой её больше нет, у Булата заказать нельзя
    await enter(B,cafe);await A.evaluate('exitInterior()');await sleep(2500);
    const after=await B.evaluate(p=>{player.ix=p.ix+1;player.iy=p.iy;updateHud();return {act:currentAction&&currentAction.label,rl:[...peerRender.values()].filter(p=>p.rl==='barista').length};},pos);
    check(!(await A.evaluate('BAR.on'))&&after.rl===0&&!/Заказать/.test(after.act||''),`бариста ушла — заказа нет: ${JSON.stringify(after)}`);
    // 8) гость без аккаунта видит баристу, но заказать нельзя — подсказка
    await enter(A,cafe);await A.waitForFunction('BAR.on',null,{timeout:10000}).catch(()=>{});
    const C=await open('Камиль',null);await enter(C,cafe);
    await C.waitForFunction(()=>[...peerRender.values()].some(p=>sharedPeerHere(p)&&p.rl==='barista'),null,{timeout:10000}).catch(()=>{});
    const pos2=await A.evaluate('({ix:player.ix,iy:player.iy})');await B.evaluate(p=>{player.ix=p.ix>5?1.5:p.ix+6;player.iy=p.iy;pushPresence();},pos2);await sleep(1500);   // Булат отходит: E — к ближнему игроку
    const c1=await C.evaluate(p=>{player.ix=p.ix+0.8;player.iy=p.iy;updateHud();const a=currentAction;if(a&&/Заказать/.test(a.label))a.run();return {label:a&&a.label,hint:document.querySelector('#hint').textContent,card:!!SIT.card&&/Бариста/.test(SIT.card.title)};},pos2);
    check(/Заказать у баристы/.test(c1.label||'')&&/только с аккаунтом/.test(c1.hint)&&!c1.card,`гость без аккаунта — подсказка: ${JSON.stringify(c1)}`);
    check(!errors.length,'без ошибок в консоли'+(errors.length?': '+errors.slice(0,3).join(' | '):''));
  }catch(e){console.log('FAIL',e.message);fails++;}
  finally{await b.close();srv.kill();try{fs.rmSync(DATA,{recursive:true,force:true});}catch(e){}}
  if(fails)console.log(srvLog.split('\n').slice(-15).join('\n'));
  console.log(fails?`FAILED ${fails}`:'ALL OK');process.exit(fails?1:0);
})();
