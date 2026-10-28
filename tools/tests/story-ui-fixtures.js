'use strict';
// Self-contained functions: run in Playwright or the authorised local browser tool.
function stageStoryScene({kind}){
  for(const m of document.querySelectorAll('.modal'))if(m.id!=='storyDialog')m.hidden=true;
  document.getElementById('zkTodayPanel').hidden=true;
  if(typeof hideShot==='function')hideShot();
  player.busy=false;player.waypoints=null;player.iwp=null;currentAction=null;
  PROG.tut={i:0,p:0,end:true,started:true};document.getElementById('hint').hidden=true;
  if(SIT.card)closeSitCardObj(SIT.card);SIT.queue=[];
  zkSetTime((clock.day-1)*1440+8*60);weather.kind='clear';weather.rain=[];
  const enhanced=!!window.storyUI;
  if(['bill','menu','wake'].includes(kind)){
    if(enhanced)storyUI.demo(kind);
    else sitCard({title:kind==='bill'?'Счёт на 40 000 ₽':kind==='menu'?'Меню «Лунный двор»':'Утро на скамейке',text:kind==='wake'?'Холодная скамейка. Город уже проснулся. Телефона нет. В карманах пусто.':'Салат — 4 800 ₽\nПаста — 9 200 ₽\nЛимонад — 12 000 ₽\nДесерт — 6 000 ₽\nСервис — 8 000 ₽',choices:kind==='bill'?[{t:'Оплатить',run(){}},{t:'Не буду платить',run(){}},{t:'Позвонить 112',run(){}}]:[{t:'Дальше',run(){}}]});
  }else if(kind==='ward'){
    if(enhanced)storyUI.demo('ward');else enterInterior({kind:'hospital',name:'Палата',key:'story:ward'});
  }else if(kind==='actors'){
    if(document.getElementById('storyDialog'))document.querySelector('#storyDialog button').click();
    enterInterior({kind:'cafe',name:'Участники истории',key:'story:cast'});
    interior.npcs=['charmer','guard','waiter','stranger'].map((story,i)=>({p:Object.assign(makePersona('resident'),{story,name:['Алия','Охранник','Официант','Новый знакомый'][i],clothes:'#648278',skin:'#D8AD8B',hair:'#493B32',hairStyle:1}),x:3+i*3.2,y:2.8,hx:0,hy:1,phase:0,seated:false,role:'resident',isInterior:true}));
    player.ix=8;player.iy=7.7;
  }else if(kind==='phone'){
    if(document.getElementById('storyDialog'))document.querySelector('#storyDialog button').click();
    const saved=localStorage.getItem('zk.citylife'),live=window.cityLife,oldInbox=live&&live.inbox;
    if(live)live.inbox=[];localStorage.setItem('zk.citylife',JSON.stringify({...JSON.parse(saved||'{}'),inbox:[]}));
    cityPhone.push({from:'Алия',text:'Сәлам! Давай вечером в «Лунном дворе»? Там тихо.',kind:'story'});
    cityPhone.push({from:'Алия',text:'Я уже у окна. Заходи, столик нашла.',kind:'story'});
    cityPhone.push({from:'Дежурная часть',text:'Заявление принято. Следующий шаг: поговорить со свидетелем.',kind:'story-status'});
    document.getElementById('zkToday').click();
    if(live)live.inbox=oldInbox;if(saved===null)localStorage.removeItem('zk.citylife');else localStorage.setItem('zk.citylife',saved);
  }
  feed.length=0;renderFeed();updateHud();
  if(scene==='interior')renderInterior();else render();
  return {enhanced,kind,room:scene==='interior'?{kind:interior.kind,key:interior.key,npcs:interior.npcs.length}:null};
}

function checkStoryUI(){
  const results=[],check=(name,fn)=>{fn();results.push(name);},ok=(value,msg)=>{if(!value)throw new Error(msg);};
  const choice=run=>({place:'Кафе',items:[{name:'Чай',price:40000}],total:40000,choices:[{t:'Продолжить',run}]});
  let n=0;
  check('one choice executes once; stale buttons cannot act',()=>{
    storyUI.bill(choice(()=>n++));const button=document.querySelector('#storyDialog button');button.click();button.click();ok(n===1,'double choice');
    storyUI.menu(choice(()=>n++));const old=document.querySelector('#storyDialog button');storyUI.bill(choice(()=>n+=10));old.click();ok(n===1,'stale choice');document.querySelector('#storyDialog button').click();ok(n===11,'new choice missing');
  });
  check('callback may immediately open next story screen',()=>{
    storyUI.bill(choice(()=>storyUI.menu(choice(()=>n++))));document.querySelector('#storyDialog button').click();ok(document.querySelector('.story-menu')&&document.body.classList.contains('story-open'),'chained screen lost');document.querySelector('#storyDialog button').click();
  });
  check('Escape and Telegram Back cannot bypass bill or leak to game',()=>{
    storyUI.bill(choice(()=>n++));const ix=player.ix;window.dispatchEvent(new KeyboardEvent('keydown',{key:'w',code:'KeyW'}));ok(!keys.w&&!keys.KeyW,'movement key leaked');
    window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));tgBack();ok(document.getElementById('storyDialog')&&player.ix===ix,'bill dismissed');document.querySelector('#storyDialog button').click();
  });
  check('focus and existing busy/inert state are restored',()=>{
    const focus=document.getElementById('menuBtn'),hud=document.getElementById('hud');focus.focus();player.busy=true;hud.inert=true;
    storyUI.bill(choice(()=>{}));document.querySelector('#storyDialog button').click();ok(player.busy&&hud.inert,'previous state lost');hud.inert=false;player.busy=false;
    focus.focus();storyUI.bill(choice(()=>{}));document.querySelector('#storyDialog button').click();ok(document.activeElement===focus&&!hud.inert&&!player.busy,'focus not restored');
  });
  check('wake lines advance individually and finish once',()=>{
    n=0;storyUI.wake({kind:'hospital',lines:['Первое','Второе'],onDone:()=>n++});const next=document.querySelector('#storyDialog button');
    next.click();ok(document.querySelector('.story-wake-line').textContent==='Первое','first line');next.click();ok(document.querySelector('.story-wake-line').textContent==='Второе','second line');next.click();next.click();ok(n===1&&!document.getElementById('storyDialog'),'wake ended twice');
  });
  check('replaced wake timer cannot complete the next scene',()=>{
    n=0;storyUI.wake({kind:'bench',lines:['Утро'],onDone:()=>n++});const old=document.querySelector('#storyDialog button');storyUI.bill(choice(()=>{}));old.click();old.click();ok(n===0&&document.querySelector('.story-bill'),'old wake fired');document.querySelector('#storyDialog button').click();
  });
  check('untrusted labels remain text, including phone messages',()=>{
    const text='<img src=x onerror="window.storyXss=1">';const o=choice(()=>{});o.place=text;o.items[0].name=text;o.choices[0].t=text;storyUI.bill(o);
    ok(!document.querySelector('#storyDialog img')&&document.querySelector('.story-place').textContent===text,'markup interpreted');document.querySelector('#storyDialog button').click();
    const feed=storyUI.inbox([{from:text,text,kind:'story'}]);ok(!feed.querySelector('img')&&feed.textContent.includes(text),'inbox markup interpreted');
  });
  check('phone threads keep sender identity, chronology and status card',()=>{
    const feed=storyUI.inbox([{from:'Алия',text:'Первое',kind:'story',at:1},{from:'Лейсан',text:'Привет',kind:'story',at:2},{from:'Алия',text:'Второе',kind:'story',at:3},{from:'Полиция',text:'Принято',kind:'story-status',at:4}]);
    ok(feed.querySelectorAll('.story-thread').length===2,'threads merged');ok(feed.querySelectorAll('.story-police-card').length===1,'missing status');
    ok([...feed.querySelectorAll('.story-thread')].some(t=>t.textContent.indexOf('Первое')<t.textContent.indexOf('Второе')&&t.textContent.includes('Второе')),'chronology lost');
  });
  check('phone bubbles remain readable under the existing mobile colour overrides',()=>{
    const feed=storyUI.inbox([{from:'Алия',text:'До встречи',kind:'story',at:1},{from:'Полиция',text:'Принято',kind:'story-status',at:1}]);
    const panel=document.getElementById('zkTodayPanel');panel.append(feed);
    try{
      ok(feed.firstElementChild.classList.contains('story-police-card'),'equal-time status lost priority');
      ok(getComputedStyle(feed.querySelector('.story-message p')).color==='rgb(46, 53, 43)','unreadable message colour');
      ok(getComputedStyle(feed.querySelector('.story-police-card p')).color==='rgb(46, 53, 43)','unreadable status colour');
    }finally{feed.remove();}
  });
  check('ward spawn is on a bed with a walkable path to the door',()=>{
    storyUI.demo('ward');ok(interior.furn.filter(f=>f.t==='bed').length===3,'beds missing');ok(venueStyleId(interior)==='ward','ward style');ok(player.ix===interior.spawn.x&&player.iy===interior.spawn.y,'spawn missing');
    for(let y=3;y<interior.h+.4;y+=.2){const x=y<7?3:interior.door.x;if(y<7)ok(!blockedInside(x,y,.3),'blocked beside bed');}
    for(let x=3;x<=7;x+=.2)ok(!blockedInside(x,7,.3),'blocked corridor');for(let y=7;y<10.3;y+=.2)ok(!blockedInside(7,y,.3),'blocked exit');
    ok(venueStyleId(makeInterior('hospital','Больница','normal'))==='pharmacy','ordinary hospital changed');exitInterior();
  });
  check('long receipt keeps actions inside viewport at least 44px',()=>{
    const o=choice(()=>{});o.items=Array.from({length:80},(_,i)=>({name:'Длинное название позиции '+i,price:500}));storyUI.bill(o);
    const body=document.querySelector('.story-body'),button=document.querySelector('#storyDialog button');body.scrollTop=500;
    const r=button.getBoundingClientRect();ok(r.height>=44&&r.left>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,'offscreen action');ok(body.scrollTop>0,'receipt does not scroll');button.click();
  });
  return {passed:results.length,checks:results};
}
if(typeof module==='object')module.exports={stageStoryScene,checkStoryUI};
