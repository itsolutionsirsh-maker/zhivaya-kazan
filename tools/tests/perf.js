// Скорость на «слабом телефоне»: 390×844, плотность 3, процессор замедлен в 4 раза. День и вечер (окна горят), обычный и дальний масштаб.
// Одна папка — замер; две — «было» и «стало» подряд, чтобы сравнить (например, сборка main и сборка своей ветки).
// node tools/tests/perf.js /tmp/zk-main [/tmp/zk-branch]
const {chromium} = require('playwright');
const {spawn} = require('child_process');
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function measure(dir, port) {
  const srv = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {cwd: dir, stdio: 'ignore'});
  await sleep(800);
  const b = await chromium.launch();
  try {
    const ctx = await b.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 3, isMobile: true, hasTouch: true});
    const pg = await ctx.newPage(); const errors = []; pg.on('pageerror', e => errors.push(String(e)));
    await pg.goto(`http://127.0.0.1:${port}/index.html`);
    await pg.waitForFunction('document.querySelector("#loading").hidden === true', null, {timeout: 90000}); await sleep(800);
    await pg.fill('#pName', 'Тест'); await pg.click('#startBtn'); await sleep(300); await pg.click('#howtoClose'); await sleep(2500);
    const cdp = await ctx.newCDPSession(pg); await cdp.send('Emulation.setCPUThrottlingRate', {rate: 4});
    const out = {};
    for (const [label, hour, z] of [['день, обычный масштаб', 12, 5.5], ['вечер, окна горят', 21, 5.5], ['день, издалека', 12, 2.5]]) {
      await pg.evaluate(`zkSetTime((clock.day-1)*1440+${hour}*60);cam.zt=cam.z=${z};`); await sleep(1500);
      // кадры в секунду и худший кадр за 3 с + чистое время одного render() (среднее из 30)
      out[label] = await pg.evaluate(`new Promise(r=>{let n=0,worst=0,last=performance.now();const t0=last;function f(){const now=performance.now();worst=Math.max(worst,now-last);last=now;n++;
        if(now-t0>3000){let s=0;for(let i=0;i<30;i++){const a=performance.now();render();s+=performance.now()-a;}r({кадров_в_сек:Math.round(n/3),худший_кадр_мс:Math.round(worst),render_мс:Math.round(s/30*10)/10});}else requestAnimationFrame(f);}requestAnimationFrame(f);})`);
    }
    if (errors.length) out.ошибки = errors;
    return out;
  } finally { await b.close(); srv.kill(); }
}
(async () => {
  const dirs = process.argv.slice(2);
  if (!dirs.length) { console.log('node tools/tests/perf.js <папка сборки> [<вторая папка>]'); process.exit(1); }
  for (let i = 0; i < dirs.length; i++) console.log(dirs.length > 1 ? (i ? 'стало:' : 'было: ') : 'замер:', JSON.stringify(await measure(dirs[i], 8781 + i)));
})().catch(e => { console.error('FAIL', e); process.exit(1); });
