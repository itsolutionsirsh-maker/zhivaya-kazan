// Первая загрузка (30.10): что качается до экрана с городом и что — потом.
// 1) никаких внешних серверов при входе: шрифты свои (site/fonts), не Google;
// 2) base.json страница просит сразу, параллельно скриптам, и boot берёт этот же ответ (второго запроса нет);
// 3) фото «на входе» (img/inside) и жители районов (folk3.js) — только после показа города, но приходят;
// 4) выпадающие списки читаются: тёмная схема и тёмный фон пунктов (раньше белым по белому — выбор района).
// node tools/tests/boot-speed-browser.js <сборка> [порт, 8979]
const {chromium}=require('playwright');
const {spawn}=require('child_process');
const DEV=process.argv[2],PORT=+process.argv[3]||8979;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let fails=0;const check=(ok,msg)=>{console.log((ok?'OK  ':'FAIL')+' '+msg);if(!ok)fails++;};
(async()=>{
  const srv=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{cwd:DEV,stdio:'ignore'});await sleep(800);
  const b=await chromium.launch();const errors=[];
  try{
    const pg=await b.newPage({viewport:{width:390,height:844}});const reqs=[];const t0=Date.now();
    pg.on('request',r=>reqs.push({u:r.url(),t:Date.now()-t0}));
    // момент показа города — по часам страницы, чтобы сравнивать с Resource Timing без задержки опроса
    await pg.addInitScript(()=>{document.addEventListener('DOMContentLoaded',()=>{const L=document.querySelector('#loading');new MutationObserver(()=>{if(L.hidden&&!window.__shown)window.__shown=performance.now();}).observe(L,{attributes:true});});});
    pg.on('pageerror',e=>errors.push(String(e)));pg.on('console',m=>{if(m.type()==='error'&&!/404|Failed to load resource/.test(m.text()))errors.push(m.text());});
    await pg.goto(`http://127.0.0.1:${PORT}/index.html`);await pg.waitForFunction('document.querySelector("#loading").hidden===true',null,{timeout:60000});
    const shown=Date.now()-t0;await sleep(3500);
    const ext=reqs.filter(r=>!r.u.startsWith(`http://127.0.0.1:${PORT}/`));check(!ext.length,'внешних запросов нет'+(ext.length?': '+ext.map(r=>r.u).slice(0,3).join(', '):''));
    const base=reqs.filter(r=>/map\/base\.json/.test(r.u));
    check(base.length===1,'base.json запрошен один раз: '+base.length);
    // скрипты браузер начинает качать заранее (сканер страницы), поэтому сравниваем не с их запросом, а с концом их загрузки
    const B=await pg.evaluate(()=>{const r=performance.getEntriesByType('resource');const b=r.find(x=>/map\/base\.json/.test(x.name));const js=r.filter(x=>/\/js\/.*\.js/.test(x.name)&&!/folk3/.test(x.name));
      return {base:b&&Math.round(b.startTime),jsEnd:Math.round(Math.max(...js.map(x=>x.responseEnd))),dcl:Math.round(performance.getEntriesByType('navigation')[0].domContentLoadedEventStart)};});
    check(B.base!=null&&B.base<B.jsEnd&&B.base<B.dcl,`base.json качается параллельно скриптам: начало ${B.base} мс, скрипты докачаны к ${B.jsEnd} мс, страница готова к ${B.dcl} мс`);
    const R=await pg.evaluate(()=>({shown:Math.round(window.__shown),ph:performance.getEntriesByType('resource').filter(r=>/img\/inside\//.test(r.name)).map(r=>Math.round(r.startTime)),
      f3:performance.getEntriesByType('resource').filter(r=>/js\/folk3\.js/.test(r.name)).map(r=>Math.round(r.startTime)),n3:(window.cityFolk3||[]).length,
      chunksEnd:Math.round(Math.max(0,...performance.getEntriesByType('resource').filter(r=>/map\/c_/.test(r.name)&&r.startTime<window.__shown).map(r=>r.responseEnd)))}));
    check(R.ph.length>=6&&R.ph.every(x=>x>=R.shown),`фото «на входе» — после показа города (${R.shown} мс): ${R.ph.join(', ')}`);
    check(R.f3.length===1&&R.f3[0]>=R.chunksEnd&&R.n3>300,`жители районов — после города вокруг (кварталы к ${R.chunksEnd} мс, жители — с ${R.f3[0]} мс) и пришли: ${R.n3}`);
    const fonts=reqs.filter(r=>/\/fonts\/.*\.woff2/.test(r.u)).length;check(fonts>=2,'шрифты — свои, качаются: '+fonts);
    const sel=await pg.evaluate(()=>{const s=document.querySelector('#pDistrict');const o=s.querySelector('option');const cs=getComputedStyle(s),co=getComputedStyle(o);return {scheme:cs.colorScheme,bg:co.backgroundColor,fg:co.color};});
    check(/dark/.test(sel.scheme)&&sel.bg==='rgb(22, 33, 28)'&&sel.fg==='rgb(238, 243, 238)','список районов: тёмная схема и тёмный фон пунктов '+JSON.stringify(sel));
    check(!errors.length,'без ошибок в консоли'+(errors.length?': '+errors.slice(0,3).join(' | '):''));
  }catch(e){console.log('FAIL',e.message);fails++;}
  finally{await b.close();srv.kill();}
  console.log(fails?`FAILED ${fails}`:'ALL OK');process.exit(fails?1:0);
})();
