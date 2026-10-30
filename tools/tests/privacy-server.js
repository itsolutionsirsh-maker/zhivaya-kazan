// Правила и конфиденциальность (site/privacy.html): страница по /privacy и /rules, ссылки на входе и в меню;
// бот: /support и /delete — команде, /reply — ответ игроку только от админа; удаление аккаунта модератором — с подтверждением,
// после него старый вход не работает, кошелька нет, имя свободно.
// Сам поднимает сервер с чистой базой. node tools/tests/privacy-server.js <сборка> [порт, 8976]
const {chromium}=require('playwright');
const {spawn}=require('child_process');
const fs=require('fs'),os=require('os'),path=require('path'),crypto=require('crypto');
const DEV=path.resolve(process.argv[2]||'/tmp/zk-dev'),PORT=+process.argv[3]||8976,BASE=`http://127.0.0.1:${PORT}`;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const DATA=fs.mkdtempSync(path.join(os.tmpdir(),'zk-priv-')),MOD=crypto.randomBytes(20).toString('hex'),TOKEN='123456:'+crypto.randomBytes(16).toString('hex'),ADMIN='5550001';
let fails=0;const check=(ok,msg)=>{console.log((ok?'OK  ':'FAIL')+' '+msg);if(!ok)fails++;};
const api=(a,body,head)=>fetch(`${BASE}/api.php`,{method:'POST',headers:Object.assign({'Content-Type':'application/json'},head||{}),body:JSON.stringify(Object.assign({a},body))}).then(r=>r.json());
const mod=body=>api('mod',body,{'x-mod-token':MOD});
const secret=crypto.createHash('sha256').update('wh:'+TOKEN).digest('hex').slice(0,40);
const tg=(text,from,chat)=>fetch(`${BASE}/api.php?a=tgwebhook`,{method:'POST',headers:{'Content-Type':'application/json','x-telegram-bot-api-secret-token':secret},
  body:JSON.stringify({update_id:1,message:{message_id:1,date:1,text,from:Object.assign({id:777,first_name:'Тест'},from||{}),chat:Object.assign({id:(from&&from.id)||777,type:'private'},chat||{})}})}).then(r=>r.json());
(async()=>{
  // PUBLIC_URL не задаём: сервер не ходит в api.telegram.org при запуске; сообщения админу просто не дойдут (сети нет)
  const srv=spawn(process.execPath,[path.join(__dirname,'../../server/node/server.js')],{env:Object.assign({},process.env,{GAME_DIR:DEV,DATA_DIR:DATA,PORT:String(PORT),MOD_TOKEN:MOD,TG_BOT_TOKEN:TOKEN,ADMIN_TG_ID:ADMIN,LLM_API_KEY:'',RW_OFF:'1',PUBLIC_URL:''}),stdio:['ignore','pipe','pipe']});
  let srvLog='';srv.stdout.on('data',d=>{srvLog+=d;});srv.stderr.on('data',d=>{srvLog+=d;});
  for(let i=0;i<40;i++){try{if((await api('ping',{})).ok)break;}catch(e){}await sleep(250);}
  // страница — из репозитория в сборку (в отладочной сборке её нет)
  fs.copyFileSync(path.join(__dirname,'../../site/privacy.html'),path.join(DEV,'privacy.html'));
  const b=await chromium.launch();const errors=[];
  try{
    for(const p of ['/privacy','/rules','/privacy.html']){const r=await fetch(BASE+p);const t=await r.text();check(r.ok&&/Правила и конфиденциальность/.test(t)&&/ЛайфГород/.test(t),`${p} → страница правил`);}
    const page=await fetch(BASE+'/privacy').then(r=>r.text());
    for(const s of ['id="rules"','id="privacy"','id="contact"','Anthropic','Telegram ID','/delete','/support','16 лет','OpenStreetMap'])check(page.includes(s),'на странице есть: '+s);
    // ссылки на входе и в меню
    const pg=await (await b.newContext({viewport:{width:390,height:844}})).newPage();pg.on('pageerror',e=>errors.push(e.message));
    await pg.goto(BASE+'/');await pg.waitForFunction('document.querySelector("#loading").hidden===true',null,{timeout:90000});
    const links=await pg.evaluate(()=>[...document.querySelectorAll('.legal a')].map(a=>({t:a.textContent,h:a.getAttribute('href'),vis:!!a.getClientRects().length})));
    check(links.some(l=>l.h==='privacy.html#rules'&&l.vis)&&links.some(l=>l.h==='privacy.html#privacy'),'на экране входа — «правилами» и «политикой конфиденциальности»: '+JSON.stringify(links.filter(l=>l.vis).map(l=>l.t)));
    check(links.some(l=>l.h==='privacy.html')&&links.some(l=>/t\.me\/zhivaya_kazan_bot/.test(l.h)),'в меню — правила и бот');
    // бот
    let r=await tg('/support Не могу войти');check(r.method==='sendMessage'&&r.chat_id===777&&/передали команде/.test(r.text),'/support — ответ игроку: '+(r.text||'').slice(0,50));
    r=await tg('/delete');check(/Удалим аккаунт/.test(r.text||''),'/delete — ответ игроку: '+(r.text||'').slice(0,50));
    r=await tg('/reply 777 Здравствуйте, удалили');check(!r.method,'/reply от обычного игрока — ничего');
    r=await tg('/reply 777 Здравствуйте, удалили',{id:+ADMIN},{id:+ADMIN});check(r.method==='sendMessage'&&r.chat_id===777&&/Здравствуйте, удалили/.test(r.text),'/reply от админа — сообщение игроку 777');
    let n=0;for(let i=0;i<6;i++){const x=await tg('/support '+i,{id:888},{id:888});if(/Слишком много/.test(x.text||''))n++;}check(n>=1,'не больше пяти обращений в час с одного чата');
    // удаление аккаунта
    const name='del-'+crypto.randomBytes(2).toString('hex'),pin='763819';
    const lg=await api('login',{name,pin});check(lg.ok&&lg.created,'аккаунт создан');
    await api('save',{token:lg.token,state:{t:Date.now(),money:5000},profile:{name:'Тест'},wallet:{ops:[],snap:5000}});
    let w=await mod({do:'wallet',name});check(w.ok&&w.bal!=null,'кошелёк есть: '+w.bal);
    let d=await mod({do:'delete',name});check(d.err==='confirm'&&d.k===name,'без подтверждения не удаляет: '+JSON.stringify(d));
    d=await mod({do:'delete',name,confirm:'чужой'});check(d.err==='confirm','с чужим подтверждением не удаляет');
    d=await mod({do:'delete',name,confirm:name});check(d.ok&&d.deleted===name,'удалён');
    const ld=await api('load',{token:lg.token});check(ld.err==='auth','старый вход больше не работает');
    w=await mod({do:'wallet',name});check(w.err==='no_account','аккаунта и кошелька нет');
    const again=await api('login',{name,pin:'111111'});check(again.ok&&again.created,'имя снова свободно (новый аккаунт с другим PIN)');
    const nod=await fetch(`${BASE}/api.php`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({a:'mod',do:'delete',name,confirm:name})}).then(r=>r.json());
    check(nod.err==='forbidden','без ключа модератора удалить нельзя');
    check(!errors.length,'без ошибок на странице'+(errors.length?': '+errors.slice(0,3).join(' | '):''));
  }catch(e){console.log('FAIL',e.message);fails++;}
  finally{await b.close();srv.kill();try{fs.rmSync(DATA,{recursive:true,force:true});}catch(e){}}
  if(fails)console.log(srvLog.split('\n').slice(-15).join('\n'));
  console.log(fails?`FAILED ${fails}`:'ALL OK');process.exit(fails?1:0);
})();
