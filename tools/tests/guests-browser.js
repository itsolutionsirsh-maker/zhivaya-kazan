// «В гости» (guests-play.js): Фидания зовёт на чай, ведёт к своему подъезду, у двери E «Зайти в гости», внутри — её квартира,
// чай (настроение), разговор открывается её первой фразой, ИИ знает, где вы и что она рассказывает; во 2-м визите просьба
// с выбором, в 3-м — развязка по этому выбору (один раз); дальше — просто чай; ушли — она остаётся дома; один визит в день.
// Данные — проверочные (свои guests.js пишет второй программист). Без ИИ: сценарные ответы.
// node tools/tests/guests-browser.js <сборка> [порт, 8981]
const {chromium}=require('playwright');
const {spawn}=require('child_process');
const DEV=process.argv[2],PORT=+process.argv[3]||8981;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let fails=0;const check=(ok,msg)=>{console.log((ok?'OK  ':'FAIL')+' '+msg);if(!ok)fails++;};
const FIX=[{id:'fidania',invite:{met:1,hours:[0,24],line:'Заходи ко мне на чай, улым, чак-чак свежий!'},
  home:{pic:'img/inside/home.jpg',about:'однушка на втором этаже: ковёр на стене, сервант с хрусталём, кот Мурзик'},
  treat:{name:'чай с чак-чаком',mood:6,food:5},
  visits:[{opening:'Садись, садись! Чай с чабрецом.',story:'Фидания рассказывает, что во дворе хотят спилить старый тополь.',ask:null},
    {opening:'Опять ты! Проходи.',story:'Фидания говорит, что соседи собирают подписи за тополь.',ask:{text:'Фидания просит подписать письмо в управляющую компанию',choices:[{id:'a',t:'Подписать',line:'Вот спасибо, улым!'},{id:'b',t:'Не буду',line:'Ну, дело твоё.'}]}},
    {opening:'Новости у меня!',story:'Фидания рассказывает, чем кончилось с тополем.',ask:{text:'Фидания предлагает отметить',choices:[{id:'ok',t:'С радостью',line:'Вот и славно.'},{id:'no',t:'В другой раз',line:'Ну ладно.'}]}}],
  ending:{a:{text:'Тополь отстояли — Фидания всем во дворе рассказывает, кто помог',line:'Без тебя бы не справились!',effect:{mood:8,rep:1},after:'игрок помог отстоять тополь'},
          b:{text:'Тополь спилили, Фидания вздыхает, но зла не держит',line:'Что поделаешь.',effect:{mood:-2},after:'игрок не стал подписывать'}}}];
(async()=>{
  const srv=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{cwd:DEV,stdio:'ignore'});await sleep(800);
  const b=await chromium.launch();const errors=[];
  try{
    const pg=await b.newPage({viewport:{width:1200,height:860}});
    pg.on('pageerror',e=>errors.push(String(e.stack||e).slice(0,400)));pg.on('console',m=>{if(m.type()==='error'&&!/404|Failed to load resource/.test(m.text()))errors.push(m.text());});
    const ev=s=>pg.evaluate(s);
    await pg.goto(`http://127.0.0.1:${PORT}/index.html`);await pg.waitForFunction('document.querySelector("#loading").hidden===true',null,{timeout:60000});await sleep(500);
    await pg.fill('#pName','Хан');await pg.click('#startBtn');await sleep(400);await pg.click('#howtoClose');await sleep(1500);
    // настоящие данные guests.js проверены отдельно (поля и длины); здесь — проверочные, чтобы сценарий не зависел от их текста
    check(await ev('Array.isArray(window.cityGuests)&&cityGuests.length===8'),'guests.js: восемь своих');
    await pg.evaluate(f=>{window.cityGuests=f;},FIX);
    await ev(`window.zkNoStory=true;SIT.timer=1e9;let k=0;while(SIT.card&&k++<8){const c=SIT.card;pickChoice(c,c.choices[c.choices.length-1]);}`);
    // Фидания во дворе рядом с игроком
    const meet=async()=>{await ev(`(()=>{const f=FOLK.list.find(q=>q.id==='fidania');f.day=[[0,'yard']];f.dayOff=[[0,'yard']];if(f.at!=='yard'){folkDrop(f);f.trip=null;f.at='yard';f.away=false;}
        const p=f.places.yard;player.x=p.x+5;player.y=p.y;player.waypoints=null;cam.x=player.x;cam.y=player.y;})()`);
      await pg.waitForFunction(()=>{const f=FOLK.list.find(q=>q.id==='fidania');return f&&f.w;},null,{timeout:15000}).catch(()=>{});
      return ev(`(()=>{const f=FOLK.list.find(q=>q.id==='fidania');if(!f.w)return false;f.w.x=player.x+2;f.w.y=player.y;openChat(f.w);return true;})()`);};
    const chatTexts=()=>ev(`[...document.querySelectorAll('#chatLog .m')].map(d=>d.textContent)`);
    const say=async t=>{await pg.fill('#chatInput',t);await ev('sendChat()');await pg.waitForFunction('!chatBusy',null,{timeout:10000});await sleep(300);};
    const go=async()=>{await ev(`(()=>{const b=[...document.querySelectorAll('#chatLog .guest-ask button')].find(x=>/Пойти в гости/.test(x.textContent));b&&b.click();})()`);await sleep(400);
      // дошли: оба у подъезда
      await ev(`(()=>{const c=companion,d=c.dest;c.w.x=d.x+1;c.w.y=d.y;player.x=d.x+2;player.y=d.y;player.escort=false;})()`);await sleep(800);
      await ev('updateHud()');const a=await ev('currentAction&&currentAction.label');await ev('currentAction&&currentAction.run()');await sleep(1600);return a;};
    // 1) приглашение
    check(await meet(),'Фидания рядом, разговор открыт');
    let T=await chatTexts();check(T.some(t=>/Заходи ко мне на чай/.test(t))&&await ev(`!!document.querySelector('#chatLog .guest-ask')`),'зовёт к себе: строка и кнопки «Пойти в гости» / «В другой раз»');
    const mood0=await ev('player.mood');
    // 2) ведёт к себе, у подъезда E
    await ev(`(()=>{const b=[...document.querySelectorAll('#chatLog .guest-ask button')].find(x=>/Пойти в гости/.test(x.textContent));b.click();})()`);await sleep(300);
    const c=await ev(`({g:companion&&companion.dest&&companion.dest.guest,mode:companion&&companion.mode,lbl:document.querySelector('#compLbl').textContent,chat:!document.querySelector('#chatModal').hidden})`);
    check(c.g==='fidania'&&c.mode==='go'&&/ведёт вас к себе в гости/.test(c.lbl)&&!c.chat,'ведёт к себе: '+c.lbl);
    await ev(`(()=>{const c=companion,d=c.dest;c.w.x=d.x+1;c.w.y=d.y;player.x=d.x+2;player.y=d.y;player.escort=false;})()`);await sleep(800);await ev('updateHud()');
    check(/Зайти в гости: Фидания/.test(await ev('currentAction&&currentAction.label')||''),'у подъезда E: '+await ev('currentAction&&currentAction.label'));
    await ev('currentAction.run()');await sleep(1600);
    // 3) внутри: её квартира, чай, разговор с её первой фразой, фон — картинка
    const it=await ev(`({scene,kind:interior&&interior.kind,name:interior&&interior.name,host:interior&&interior.npcs.some(n=>n.companionOf&&n.p.name==='Фидания'&&n.tableF),bed:interior&&interior.furn.some(f=>f.spot==='bed'||f.spot==='wardrobe'),chat:chatNpc&&chatNpc.p.name,bg:(document.querySelector('#chatModal .box')||document.querySelector('#chatModal').firstElementChild).style.backgroundImage})`);
    check(it.scene==='interior'&&it.kind==='guest'&&it.name==='Дома у Фидании'&&it.host&&!it.bed,'в гостях: '+JSON.stringify({kind:it.kind,name:it.name,host:it.host,bed:it.bed}));
    check(it.chat==='Фидания'&&(await chatTexts()).some(t=>/Садись, садись! Чай с чабрецом/.test(t)),'разговор открылся сам, первая фраза — opening визита 1');
    check(/home\.jpg/.test(it.bg),'фон разговора — картинка квартиры');
    check(await ev(`document.querySelector('#compBox').hidden`),'в гостях плашки «Отпустить» нет — хозяина из дома не увести');
    check((await ev('player.mood'))>=mood0+5&&(await ev(`__ev=window.__ev||[];[...document.querySelectorAll('#feedList li, #log li')].length>=0`)),'чай: настроение '+mood0+' → '+await ev('player.mood'));
    const ctx=await ev(`companionContext(chatNpc)`);check(/у тебя в гостях/.test(ctx)&&/ковёр на стене/.test(ctx)&&/спилить старый тополь/.test(ctx)&&/чай с чак-чаком/.test(ctx),'ИИ знает: в гостях, квартира, угощение, что рассказывает');
    await say('Как дела?');await say('Расскажи про двор');check(!(await ev(`!!document.querySelector('#chatLog .guest-ask')`)),'в первом визите просьбы нет');
    // 4) ушли — она дома, в тот же день второй раз не зовёт
    await ev('closeChat();exitInterior()');await sleep(500);
    const out=await ev(`({scene,comp:!!companion,at:FOLK.list.find(q=>q.id==='fidania').at,bg:(document.querySelector('#chatModal .box')||document.querySelector('#chatModal').firstElementChild).style.backgroundImage,st:cityGuestsState().fidania})`);
    check(out.scene==='city'&&!out.comp&&out.at==='home'&&!out.bg&&out.st.v===1,'ушли — она осталась дома, визитов 1: '+JSON.stringify(out));
    check(await ev(`!guestCan(FOLK.list.find(q=>q.id==='fidania'))`),'в тот же день второй раз не зовёт');
    check(/не зови/.test(await ev(`guestHomeHint({folk:'fidania',p:{}})`))&&!(await ev(`guestHomeOk({folk:'fidania',p:{}})`)),'ИИ в этот день не обещает «заходи», и action=home нет');
    // 5) второй визит — просьба с выбором
    await ev('zkSetTime(clock.day*1440+12*60)');await meet();await go();
    check((await chatTexts()).some(t=>/Опять ты! Проходи/.test(t)),'второй визит — его первая фраза');
    await say('Что нового?');await say('Рассказывай');await sleep(1000);
    check(await ev(`!!document.querySelector('#chatLog .guest-ask')`)&&(await chatTexts()).some(t=>/подписать письмо/.test(t)),'после пары реплик — просьба с кнопками');
    await ev(`[...document.querySelectorAll('#chatLog .guest-ask button')].find(x=>x.textContent==='Не буду').click()`);await sleep(300);
    check((await chatTexts()).some(t=>/Ну, дело твоё/.test(t))&&(await ev('cityGuestsState().fidania.ch'))==='b','выбор «Не буду» — её ответ, запомнили b');
    await ev('closeChat();exitInterior()');
    // 6) третий визит — развязка b, один раз
    await ev('zkSetTime(clock.day*1440+12*60)');await meet();await go();const m3=await ev('player.mood');
    await say('Привет');await say('Ну что там');await sleep(1000);
    await ev(`[...document.querySelectorAll('#chatLog .guest-ask button')].find(x=>x.textContent==='С радостью').click()`);await sleep(1300);
    const e3=await ev(`({st:cityGuestsState().fidania,last:[...document.querySelectorAll('#chatLog .m')].map(d=>d.textContent).slice(-2),mood:player.mood})`);
    const ev3=await ev(`[...document.querySelectorAll('#feed li,#feedList li,.feed li')].map(x=>x.textContent).join('|')`);
    check(e3.st.end==='b'&&e3.last.some(t=>/Что поделаешь/.test(t))&&Math.abs(e3.mood-(m3-2))<1.5,`развязка b: реплика, настроение ${m3.toFixed(1)} → ${e3.mood.toFixed(1)} (−2, само настроение за эти секунды чуть плывёт) — `+JSON.stringify(e3.st));
    await ev('closeChat();exitInterior()');
    // 7) четвёртый — просто чай, ИИ помнит развязку, визиты не растут
    await ev('zkSetTime(clock.day*1440+12*60)');await meet();await go();
    const v4=await ev(`({st:cityGuestsState().fidania,ctx:companionContext(chatNpc),ask:!!document.querySelector('#chatLog .guest-ask')})`);
    check(v4.st.v===3&&v4.st.end==='b'&&/не стал подписывать/.test(v4.ctx)&&!/тополем/.test(v4.ctx),'после развязки — просто чай, ИИ помнит: '+v4.ctx.slice(0,80));
    await ev('closeChat();exitInterior()');
    // 8) без данных о жителе — не зовёт
    await ev(`window.cityGuests=[];zkSetTime(clock.day*1440+12*60)`);await meet();check(!(await ev(`!!document.querySelector('#chatLog .guest-ask')`)),'нет данных — не зовёт');
    check(!errors.length,'без ошибок в консоли'+(errors.length?': '+errors.slice(0,3).join(' | '):''));
  }catch(e){console.log('FAIL',e.message);fails++;}
  finally{await b.close();srv.kill();}
  console.log(fails?`FAILED ${fails}`:'ALL OK');process.exit(fails?1:0);
})();
