// node tools/tests/story-ui-browser.js <build> [port] [report.json]
const {chromium}=require('playwright'),{spawn}=require('node:child_process'),fs=require('node:fs');
const {checkStoryUI,stageStoryScene}=require('./story-ui-fixtures');
const dir=process.argv[2],port=+process.argv[3]||8797,report=[];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const srv=spawn(process.env.PYTHON||(process.platform==='win32'?'python':'python3'),['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:dir,stdio:'ignore',windowsHide:true});
  let browser,serverError;srv.on('error',e=>serverError=e);
  try{
    for(let i=0;i<40;i++){if(serverError)throw serverError;try{if((await fetch(`http://127.0.0.1:${port}/index.html`)).ok)break;}catch(_){}if(i===39)throw Error('server not ready');await wait(100);}
    browser=await chromium.launch();
    for(const [width,height] of [[360,640],[390,844],[844,390],[1280,800]]){
      const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(String(e)));await page.goto(`http://127.0.0.1:${port}/index.html`);
      await page.waitForFunction(()=>document.getElementById('loading').hidden,null,{timeout:90000});
      await page.fill('#pName','Тест');await page.click('#startBtn');await page.click('#howtoClose');
      await page.evaluate(()=>{window.requestAnimationFrame=(raf=>cb=>cb===frame?0:raf.call(window,cb))(window.requestAnimationFrame);});await wait(80);
      await page.evaluate(stageStoryScene,{kind:'bill'});const checks=await page.evaluate(checkStoryUI);
      await page.evaluate(()=>storyUI.demo('bill'));await page.locator('#storyDialog button').first().press('Shift+Tab');
      if(!await page.evaluate(()=>document.activeElement===document.querySelector('#storyDialog button:last-child')))throw Error('focus trap backwards');
      await page.locator('#storyDialog button').last().press('Tab');
      if(!await page.evaluate(()=>document.activeElement===document.querySelector('#storyDialog button')))throw Error('focus trap forwards');
      await page.locator('#storyDialog button').first().press('Enter');await page.waitForSelector('#storyDialog',{state:'detached'});
      if(errors.length)throw Error(errors.join('\n'));report.push({width,height,...checks,nativeKeyboard:true,pageErrors:errors});await context.close();
    }
    if(process.argv[4])fs.writeFileSync(process.argv[4],JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));console.log('no page errors');
  }finally{if(browser)await browser.close();srv.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
