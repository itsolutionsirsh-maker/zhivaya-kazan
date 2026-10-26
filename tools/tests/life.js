// Есть ли жизнь: жители, машины, движение — как на сервере (WS, карта кусками)
const {chromium}=require('playwright');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const URL=process.argv[2]||'http://127.0.0.1:8810/';
(async()=>{const b=await chromium.launch();const errors=[];try{
 const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,isMobile:true});const pg=await ctx.newPage();
 pg.on('pageerror',e=>errors.push('pageerror: '+String(e)+' '+(e.stack||'').split('\n').slice(0,3).join(' | ')));pg.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errors.push('['+m.type()+'] '+m.text().slice(0,300));});
 await pg.goto(URL);await pg.waitForFunction('document.querySelector("#loading").hidden === true',null,{timeout:120000});await sleep(1500);
 const vis=await pg.evaluate('({start:!document.querySelector("#startModal")||!document.querySelector("#startModal").hidden})').catch(()=>({}));
 try{await pg.fill('#pName','Тест',{timeout:3000});await pg.click('#startBtn');await sleep(300);await pg.click('#howtoClose',{timeout:2000});}catch(e){console.log('start form:',String(e).slice(0,80));}
 const snap=()=>pg.evaluate(`({w:walkers.length,c:cars.length,b:buses.length,mv:walkers.filter(w=>w.state==='walk').length,cx:cars.slice(0,5).map(c=>Math.round(c.x)+','+Math.round(c.y)).join(' '),net:Net.mode,busy:player.busy,scene,paused:typeof paused!=='undefined'?paused:null,mods:[...document.querySelectorAll('.modal')].filter(m=>!m.hidden).map(m=>m.id)})`);
 console.log('t0',JSON.stringify(await snap()));await sleep(6000);console.log('t6',JSON.stringify(await snap()));await sleep(8000);console.log('t14',JSON.stringify(await snap()));
}finally{await b.close();}console.log(errors.length?errors.slice(0,12).join('\n'):'no page errors');})();
