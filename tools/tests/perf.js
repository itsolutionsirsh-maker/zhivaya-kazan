// Rendering benchmark: phone viewport, DPR 3 (the game caps it at 2), CPU throttle ×4.
// This is desktop Chromium emulation, not a measured physical phone.
// node tools/tests/perf.js <built main> [<built branch>]
const {chromium} = require('playwright');
const {spawn} = require('child_process');
const {measureCompletedFrames} = require('./render-metrics');
const {stageDetailedFolk} = require('./visual-fixtures');
const {stageCityLook} = require('./city-look-fixtures');
const {stageVenueLook} = require('./venue-look-fixtures');
const {stageSharedVenue} = require('./shared-venues-fixtures');
const {stageTerritoryScene} = require('./territory-fixtures');
const {stageYardStory} = require('./yard-story-fixtures');
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function measure(dir, port) {
  const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
  const srv = spawn(python, ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {cwd:dir, stdio:'ignore', windowsHide:true});
  let serverError=null, b;
  srv.on('error', error => { serverError=error; });
  try {
    for (let i=0;i<40;i++) {
      if (serverError) throw serverError;
      if (srv.exitCode!==null) throw new Error('HTTP server exited: '+srv.exitCode);
      try { const response=await fetch(`http://127.0.0.1:${port}/index.html`); if(response.ok) break; } catch (_) {}
      if (i===39) throw new Error('HTTP server did not become ready');
      await sleep(100);
    }
    b=await chromium.launch();
    const ctx = await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
    const pg = await ctx.newPage(), errors=[]; pg.on('pageerror', e => errors.push(String(e)));
    await pg.goto(`http://127.0.0.1:${port}/index.html`);
    await pg.waitForFunction('document.querySelector("#loading").hidden === true', null, {timeout:90000}); await sleep(800);
    await pg.fill('#pName','Тест'); await pg.click('#startBtn'); await sleep(300); await pg.click('#howtoClose'); await sleep(2500);
    const cdp=await ctx.newCDPSession(pg); await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
    const day=await pg.evaluate('clock.day-1'), out={environment:'Chromium, 390×844, DPR 3 / game cap 2, CPU ×4',scenes:{}};
    for (const [label,hour,z] of [['день, обычный масштаб',12,5.5],['вечер, окна горят',21,5.5],['день, издалека',12,2.5],['детали, четыре жителя с предметами',13,9.5]]) {
      await pg.evaluate(({day,hour,z}) => {zkSetTime(day*1440+hour*60);cam.zt=cam.z=z;weather.rain=[];weather.kind='clear';},{day,hour,z});
      const fixtures=z>8?await pg.evaluate(stageDetailedFolk):null;
      await sleep(1500);
      const result=await pg.evaluate(measureCompletedFrames,{durationMs:5000,maxSamples:600});
      if (result.completed_frames<2) throw new Error('No completed game frames: '+label);
      out.scenes[label]={...result,...(fixtures?{fixtures}:{} )};
    }
    for(const [label,options] of [['фасад, день',{hour:13}],['фасад, ночь',{hour:23}],['кафе, день',{kind:'cafe',hour:13}],['квартира, ночь',{kind:'home',hour:23}],['метро',{kind:'metro',hour:23}]]){
      const fixtures=await pg.evaluate(stageCityLook,options);await sleep(1500);
      const result=await pg.evaluate(measureCompletedFrames,{durationMs:5000,maxSamples:600});
      if(result.completed_frames<2)throw new Error('No completed game frames: '+label);
      out.scenes[label]={...result,fixtures};
    }
    await pg.addScriptTag({content:stageCityLook.toString()});
    for(const [label,options] of [['татарское кафе',{kind:'cafe',name:'Тюбетей'}],['пекарня',{kind:'cafe',name:'Пекарня'}],['вечерний бар',{kind:'bar',name:'Вечерний бар',hour:23}],['рынок',{kind:'market',name:'Рынок'}],['аптека',{kind:'pharmacy',name:'Аптека'}],['театр',{kind:'theatre',name:'Театр',hour:23}]]){
      const fixtures=await pg.evaluate(stageVenueLook,options);await sleep(1500);
      const result=await pg.evaluate(measureCompletedFrames,{durationMs:5000,maxSamples:600});
      if(result.completed_frames<2)throw new Error('No completed game frames: '+label);
      out.scenes[label]={...result,fixtures};
    }
    for(const crowd of [false,true]){
      const fixtures=await pg.evaluate(stageSharedVenue,{crowd});await sleep(1500);
      const result=await pg.evaluate(measureCompletedFrames,{durationMs:5000,maxSamples:600});
      if(result.completed_frames<2)throw new Error('No completed shared-room frames');
      out.scenes[crowd?'кафе, 12 игроков':'кафе, 3 игрока']={...result,fixtures};
    }
    for(const kind of ['map','meeting']){
      const fixtures=await pg.evaluate(stageTerritoryScene,{kind});await sleep(1500);
      const result=await pg.evaluate(measureCompletedFrames,{durationMs:5000,maxSamples:600});
      if(result.completed_frames<2)throw new Error('No completed territory frames');
      out.scenes['районы, '+kind]={...result,fixtures};
    }
    for(const kind of ['choice','ending']){
      const fixtures=await pg.evaluate(stageYardStory,{kind});await sleep(1500);
      const result=await pg.evaluate(measureCompletedFrames,{durationMs:5000,maxSamples:600});
      if(result.completed_frames<2)throw new Error('No completed chapter frames');
      out.scenes['чужой двор, '+kind]={...result,fixtures};
    }
    if (errors.length) throw new Error(errors.join('\n'));
    return out;
  } finally { if(b)await b.close(); srv.kill(); }
}
(async () => {
  const dirs=process.argv.slice(2);
  if (!dirs.length) throw new Error('node tools/tests/perf.js <папка сборки> [<вторая папка>]');
  for(let i=0;i<dirs.length;i++) console.log(dirs.length>1?(i?'стало:':'было:'):'замер:',JSON.stringify(await measure(dirs[i],8781+i)));
})().catch(e=>{console.error('FAIL',e);process.exitCode=1;});
