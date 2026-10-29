// Тексты второго программиста в игре (задачи 52 и 53): названия и голоса группировок (gangs.js), реплики про погоду, пробки и тревоги (realworld-lines.js).
// Без сервера: статическая сборка. node tools/tests/gangs-lines-browser.js <сборка> [порт, 8988]
'use strict';
const {chromium}=require('playwright'),{spawn}=require('node:child_process');
const DEV=process.argv[2],PORT=+process.argv[3]||8988;const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let fails=0;const check=(ok,msg)=>{console.log((ok?'OK  ':'FAIL')+' '+msg);if(!ok)fails++;};
(async()=>{
  const srv=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{cwd:DEV,stdio:'ignore'});await sleep(800);
  const b=await chromium.launch();const errors=[];
  try{
    const pg=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    pg.on('console',m=>{if(m.type()==='error'&&!/404|Failed to load resource/.test(m.text()))errors.push(m.text());});pg.on('pageerror',e=>errors.push(String(e)));
    const ev=s=>pg.evaluate(s);
    await pg.goto(`http://127.0.0.1:${PORT}/index.html`);await pg.waitForFunction('document.querySelector("#loading").hidden===true',null,{timeout:90000});await sleep(800);
    await ev('window.zkNoStory=true;window.zkRecruitDwell=4');
    await pg.fill('#pName','Тест');await pg.click('#startBtn');await sleep(300);await pg.click('#howtoClose');await sleep(1500);
    // 52: названия
    const f=await ev('({v:TerritoryRules.factions.vahitovsky.name,k:TerritoryRules.factions.kirovsky.name,a:TerritoryRules.factions.aviastroitelny.name,s:TerritoryRules.factions.sovetsky.name})');
    check(f.v==='Хади Такташ'&&f.k==='Киноплёнка','Вахитовский и Кировский — по слову Иршата: '+f.v+', '+f.k);
    check(f.a==='Северный ангар'&&f.s==='Азинский подъезд','остальные — из gangs.js: '+f.a+', '+f.s);
    await pg.click('#menuBtn');await pg.click('#territoryBtn');await sleep(800);
    const m=await ev(`({sel:document.querySelector('#territorySelected').textContent,about:document.querySelector('#territoryAbout').textContent,hidden:document.querySelector('#territoryAbout').hidden,join:document.querySelector('#territoryJoin').textContent})`);
    check(!m.hidden&&m.about===window_about(m.sel),'о группировке на карте: '+m.about);
    check(/Вступить: /.test(m.join),'кнопка: '+m.join);
    await pg.click('#territoryClose');await sleep(300);
    // зовут вступить: нейтральному, пешком, в районе
    await ev(`(()=>{let k=0;while(SIT.card&&k++<8){const c=SIT.card;pickChoice(c,c.choices[c.choices.length-1]);}})()`);
    await pg.waitForFunction(()=>feed.some(x=>/зовут к себе/.test(x.text)),null,{timeout:30000}).catch(()=>{});
    const r=await ev(`({feed:feed.map(x=>x.text).filter(t=>/зовут к себе/.test(t)),said:walkers.some(w=>w.say&&cityGangs.lines.recruit.includes(w.say.t))})`);
    check(r.feed.length===1&&/«Хади Такташ» зовут к себе/.test(r.feed[0]),'в ленте: '+r.feed[0]);
    check(r.said,'прохожий сказал реплику recruit из gangs.js');
    // 53: погода — реплики из обоих файлов, {t} подставлен
    const w=await ev(`(()=>{weather.real=true;weather.kind='clear';weather.t=-17;weather.ice=false;const out=new Set();for(let i=0;i<300;i++)out.add(memWeatherLine());return {kind:memWeatherKind(),lines:[...out]};})()`);
    check(w.kind==='frost','мороз −17 → frost');
    check(w.lines.some(x=>cityRealLines_has(x))&&w.lines.every(x=>x&&!/\{t\}/.test(x)),'фразы из realworld-lines.js с подставленной температурой: '+w.lines.find(x=>/−17°/.test(x)));
    const w2=await ev(`(()=>{weather.kind='snow';weather.t=-3;const out=new Set();for(let i=0;i<400;i++)out.add(memWeatherLine());const L=[...out];return {n:L.length,old:L.some(x=>(window.cityWeatherLines||[]).some(W=>W.when==='snow'&&W.lines.includes(x))),fresh:L.some(x=>cityRealLines.weather.snow.includes(x))};})()`);
    check(w2.old&&w2.fresh,`снег: фразы и старые (weather-lines.js), и новые (realworld-lines.js): ${w2.n}`);
    // пробки: таксист в час пик, строка ленты
    const day=await ev(`(()=>{for(let d=clock.day;d<clock.day+7;d++){if(!isWeekend(d))return d;}return clock.day;})()`);
    await ev(`zkSetTime((${day}-1)*1440+8*60);weather.kind='clear';weather.t=5;`);await sleep(500);
    check(await ev('rushHour()'),'будний день, 8:00 — час пик');
    await ev(`player.vehicle={kind:'taxi',driver:'Марат',x:player.x,y:player.y,hx:1,hy:0,speed:0,len:4.5,wid:1.9,startMin:clock.minutes,spec:Object.assign({},VEH.taxi||VEH.car,{label:'такси'}),dest:{n:'Тест',x:player.x,y:player.y},auto:null};RW.tT=0;RW.rush=false;`);await sleep(1500);
    const t=await ev(`({near:chatStore.near.slice(-3).map(l=>l.who+': '+l.t),jamFeed:feed.some(x=>cityRealLines.feed.jam===x.text)})`);
    await ev('player.vehicle=null');
    check(t.near.some(x=>/^Марат: /.test(x)&&cityRealLines_taxi(x)),'таксист в пробке: '+t.near[t.near.length-1]);
    check(t.jamFeed,'в ленте — начало часа пик');
    // тревога: спокойная реплика и правка «Окна на месте»
    check(!(await ev(`cityRealLines.alert.end.some(x=>/Окна/.test(x))`)),'в отбое нет «окон на месте»');
    check(!errors.length,'без ошибок в консоли'+(errors.length?': '+errors.slice(0,3).join(' | '):''));
  }finally{await b.close();srv.kill();}
  console.log(fails?`FAILED ${fails}`:'ALL OK');process.exit(fails?1:0);
})();
// помощники, которые выполняются в Node: тексты из файлов данных
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ctx={window:{}};vm.createContext(ctx);for(const f of ['gangs.js','realworld-lines.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../site/js',f),'utf8'),ctx);
function window_about(sel){const G=ctx.window.cityGangs;const id=Object.keys(G.factions).find(k=>sel.includes('«'+G.factions[k].name+'»'));return id?G.factions[id].about:null;}
function cityRealLines_has(x){const W=ctx.window.cityRealLines.weather;return Object.values(W).some(L=>L.some(l=>l.replace('{t}','−17°')===x));}
function cityRealLines_taxi(x){return ctx.window.cityRealLines.taxi.jam.some(l=>x.endsWith(l));}
