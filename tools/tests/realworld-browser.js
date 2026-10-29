// Настоящая Казань в браузере: погода и тревога МЧС приходят с сервера игры. Источники подменены своей заглушкой — без интернета.
// Сам поднимает заглушку (MET Norway и зеркало канала МЧС) и игровой Node-сервер с отдельной папкой данных.
// node tools/tests/realworld-browser.js <сборка> [порт игры, 8986] [папка для снимков]
'use strict';
const {chromium}=require('playwright'),http=require('node:http'),{spawn}=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const DEV=process.argv[2],PORT=+process.argv[3]||8986,OUT=process.argv[4],FIX=PORT+1,TOKEN='realworld-test-token-123456';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let fails=0;const check=(ok,msg)=>{console.log((ok?'OK  ':'FAIL')+' '+msg);if(!ok)fails++;};
// заглушка: погода — снег −6, канал МЧС — посты, которые тест меняет по ходу
const MON=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const msk=t=>{const d=new Date(t+3*3600e3);return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()} г. в ${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`;};
let posts=[{at:Date.now()-3600e3,text:'Туман местами ожидается на территории Республики Татарстан и в городе Казани ночью'}];
const page=()=>'<html><body>'+posts.map(p=>`<article><time class="block">${msk(p.at)}</time><div><p class="text-sm whitespace-pre-wrap break-words">${p.text}</p></div></article>`).join('')+'</body></html>';
const met={properties:{timeseries:[{time:new Date(Date.now()-600e3).toISOString(),data:{instant:{details:{air_temperature:-6.2,wind_speed:4,cloud_area_fraction:95}},next_1_hours:{summary:{symbol_code:'snow'},details:{precipitation_amount:0.6}}}}]}};
let uaSeen='';
const fix=http.createServer((q,r)=>{if(q.url==='/met'){uaSeen=q.headers['user-agent']||'';r.writeHead(200,{'Content-Type':'application/json','Expires':new Date(Date.now()+3600e3).toUTCString()});r.end(JSON.stringify(met));}
  else if(q.url==='/mchs'){r.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});r.end(page());}else{r.writeHead(404);r.end();}}).listen(FIX,'127.0.0.1');
(async()=>{
  const data=fs.mkdtempSync(path.join(os.tmpdir(),'zk-rw-'));
  const srv=spawn(process.execPath,[path.join(__dirname,'../../server/node/server.js')],{env:Object.assign({},process.env,{GAME_DIR:DEV,DATA_DIR:data,PORT:String(PORT),MOD_TOKEN:TOKEN,
    RW_WEATHER_URL:`http://127.0.0.1:${FIX}/met`,RW_ALERT_URL:`http://127.0.0.1:${FIX}/mchs`,RW_ALERT_EVERY_MS:'1500'}),stdio:'ignore'});
  for(let i=0;i<60;i++){try{const r=await fetch(`http://127.0.0.1:${PORT}/health`);if(r.ok)break;}catch(e){}await sleep(500);}
  const b=await chromium.launch();const errors=[];
  try{
    const pg=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    pg.on('console',m=>{if(m.type()==='error'&&!/404|Failed to load resource/.test(m.text()))errors.push(m.text());});pg.on('pageerror',e=>errors.push(String(e)));
    const ev=s=>pg.evaluate(s);
    await pg.goto(`http://127.0.0.1:${PORT}/`);await pg.waitForFunction('document.querySelector("#loading").hidden===true',null,{timeout:90000});await sleep(800);
    await pg.fill('#pName','Тест');await pg.click('#startBtn');await sleep(300);await pg.click('#howtoClose');
    await ev('window.zkNoStory=true');
    // 1) погода
    await pg.waitForFunction('weather.real===true',null,{timeout:20000}).catch(()=>{});
    await pg.waitForFunction(()=>feed.some(f=>/Погода в Казани сейчас/.test(f.text)),null,{timeout:8000}).catch(()=>{});
    await pg.waitForFunction(()=>/−6°/.test(document.querySelector('#weatherLbl').textContent),null,{timeout:8000}).catch(()=>{});   // шапка обновляется раз в 5 кадров
    const w=await ev(`({real:weather.real,kind:weather.kind,t:weather.t,label:document.querySelector('#weatherLbl').textContent,title:document.querySelector('#weatherLbl').title,brand:(document.querySelector('#brandSub')||{}).textContent||'',feed:feed.map(f=>f.text)})`);
    check(w.real&&w.kind==='snow'&&w.t===-6,`настоящая погода: ${w.kind}, ${w.t}°`);
    check(/❄️ снег −6°/.test(w.label)&&/MET Norway/.test(w.title),`в шапке: «${w.label}», подсказка про MET Norway`);
    check(/MET Norway/.test(w.brand),'подпись источника погоды на экране загрузки/в меню');
    check(w.feed.some(t=>/Погода в Казани сейчас: снег −6°/.test(t)),'в ленте: погода сейчас');
    check(/^ZhivayaKazan\/1\.0 \(\+https:\/\/kazan\.lifegorod\.com\)$/.test(uaSeen),'сервер представляется MET Norway по правилам: '+uaSeen);
    await sleep(1500);const snowOn=await ev('weather.rain.length>0&&weather.flakes===true');check(snowOn,'идёт снег (хлопья на экране)');
    const ped0=await ev('pedFactor()');
    // 2) тревога: пост МЧС появился — плашка у игрока сама, через WebSocket, без перезагрузки
    const t0=Date.now();posts.unshift({at:t0-180e3,text:'Внимание! На территории Республики Татарстан ВВЕДЁН режим &laquo;Беспилотная опасность&raquo;.'});
    await pg.waitForSelector('#alertBar:not([hidden])',{timeout:15000}).catch(()=>{});
    const a=await ev(`({shown:!document.querySelector('#alertBar').hidden,title:document.querySelector('#alertTitle').textContent,text:document.querySelector('#alertText').textContent,src:document.querySelector('#alertSrc').textContent,feed:feed.slice(0,4).map(f=>f.text),ped:pedFactor(),on:rwAlertOn()})`);
    check(a.shown&&Date.now()-t0<15000,`плашка тревоги за ${Math.round((Date.now()-t0)/1000)} с`);
    check(a.title==='⚠️ Беспилотная опасность','заголовок: '+a.title);
    check(a.text==='Внимание! На территории Республики Татарстан ВВЕДЁН режим «Беспилотная опасность».','текст МЧС слово в слово');
    check(/ГУ МЧС России по Республике Татарстан, \d\d:\d\d по Москве/.test(a.src)&&/игра его не заменяет/.test(a.src),'источник, время и оговорка');
    check(a.feed.some(t=>/⚠️ Беспилотная опасность/.test(t)),'в ленте событий');
    check(a.on&&a.ped<ped0*0.2,`людей на улицах меньше: ${ped0.toFixed(2)} → ${a.ped.toFixed(2)}`);
    const box=await ev(`(()=>{const r=document.querySelector('#alertBar').getBoundingClientRect();return {l:r.left,r:r.right,t:r.top,b:r.bottom,w:innerWidth,h:innerHeight};})()`);
    check(box.l>=0&&box.r<=box.w&&box.t>=0&&box.b<box.h*0.5,'плашка на экране телефона, не больше половины высоты');
    if(OUT){fs.mkdirSync(OUT,{recursive:true});await pg.screenshot({path:path.join(OUT,'alert-phone.png')});}
    await pg.click('#alertMin');const mini=await ev(`({min:document.querySelector('#alertBar').classList.contains('min'),h:document.querySelector('#alertBar').getBoundingClientRect().height})`);
    check(mini.min&&mini.h<60,'сворачивается в плашку: '+Math.round(mini.h)+' px');if(OUT)await pg.screenshot({path:path.join(OUT,'alert-min.png')});
    // 2б) связь пропала: через 10 минут без ответа — «нет связи» на плашке; тревога и погода старше трёх часов — убираются;
    // сервер снова ответил — всё как было
    await pg.click('#alertMin');
    const lost=await ev(`(()=>{RW.t=Date.now()-11*60e3;rwCheckStale();const b=document.querySelector('#alertBar');return {shown:!b.hidden,stale:b.classList.contains('stale'),title:document.querySelector('#alertTitle').textContent,src:document.querySelector('#alertSrc').textContent,real:weather.real};})()`);
    check(lost.shown&&lost.stale&&/нет связи/.test(lost.title)&&/Связи с сервером игры нет с \d\d:\d\d/.test(lost.src)&&lost.real,`10 минут без связи — плашка с пометкой: «${lost.title}»`);
    const old=await ev(`(()=>{RW.t=Date.now()-3.1*3600e3;rwCheckStale();return {hidden:document.querySelector('#alertBar').hidden,on:rwAlertOn(),real:weather.real,feed:feed.slice(0,3).map(f=>f.text)};})()`);
    check(old.hidden&&!old.on&&!old.real&&old.feed.some(t=>/Связи с сервером игры нет больше трёх часов/.test(t)),`три часа без связи — старая тревога и погода убраны: ${JSON.stringify(old)}`);
    await ev('rwPoll()');await sleep(500);
    const back=await ev(`({shown:!document.querySelector('#alertBar').hidden,stale:document.querySelector('#alertBar').classList.contains('stale'),real:weather.real,lost:RW.lost})`);
    check(back.shown&&!back.stale&&back.real&&!back.lost,`связь вернулась — тревога и погода снова с сервера: ${JSON.stringify(back)}`);
    // 3) отбой
    posts.unshift({at:Date.now()-10e3,text:'Внимание! На территории Республики Татарстан режим «Беспилотная опасность» снят.'});
    await pg.waitForSelector('#alertBar',{state:'hidden',timeout:15000}).catch(()=>{});
    const e=await ev(`({hidden:document.querySelector('#alertBar').hidden,on:rwAlertOn(),feed:feed.slice(0,4).map(f=>f.text)})`);
    check(e.hidden&&!e.on,'отбой — плашка ушла');check(e.feed.some(t=>/✅ Беспилотная опасность: отбой/.test(t)),'в ленте: отбой');
    // 4) модератор: включить вручную и снять
    const mod=body=>fetch(`http://127.0.0.1:${PORT}/api.php?a=mod`,{method:'POST',headers:{'Content-Type':'application/json','X-Mod-Token':TOKEN},body:JSON.stringify(Object.assign({a:'mod',do:'city'},body))}).then(r=>r.json());
    let m=await mod({mode:'on',kind:'missile',text:'Внимание! На территории Республики Татарстан ВВЕДЁН режим «Ракетная опасность».'});check(m.ok===1&&m.alerts.some(x=>x.kind==='missile'),'модератор включил вручную');
    await pg.waitForSelector('#alertBar:not([hidden])',{timeout:10000}).catch(()=>{});
    check(/Ракетная опасность/.test(await ev("document.querySelector('#alertTitle').textContent"))&&/вручную/.test(await ev("document.querySelector('#alertSrc').textContent")),'у игрока — «вручную» в источнике');
    m=await mod({mode:'off'});check(m.ok===1&&!m.alerts.length,'модератор снял');
    await pg.waitForSelector('#alertBar',{state:'hidden',timeout:10000}).catch(()=>{});check(await ev("document.querySelector('#alertBar').hidden"),'плашка ушла у игрока');
    m=await mod({mode:'auto'});check(m.ok===1,'вернули автоматику');
    const bad=await fetch(`http://127.0.0.1:${PORT}/api.php?a=mod`,{method:'POST',headers:{'Content-Type':'application/json','X-Mod-Token':'wrong-token-wrong-token'},body:JSON.stringify({a:'mod',do:'city',mode:'off'})}).then(r=>r.json());
    check(bad.err==='forbidden','без ключа модератора тревогу не снять');
    check(!errors.length,'без ошибок в консоли'+(errors.length?': '+errors.slice(0,3).join(' | '):''));
  }finally{await b.close();srv.kill();fix.close();try{fs.rmSync(data,{recursive:true,force:true});}catch(e){}}
  console.log(fails?`FAILED ${fails}`:'ALL OK');process.exit(fails?1:0);
})();
