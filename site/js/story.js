// ===== Истории новичка: тарелочница и клофелинщики =====
// Один раз каждому игроку (новому — в первый же час игры): на улице подходит человек и зовёт «посидеть, познакомиться»
// в заведение рядом. Заведение-ловушка выдуманное — настоящие кафе с карты не трогаем, это был бы наговор на живой бизнес.
// Признаки обмана видны, уйти можно на каждом шаге. Попался — больница (тарелочница) или утро на лавке без денег
// (клофелинщики), дальше история возмездия: полиция, свидетель, прокурор — деньги возвращают, значок.
// Тексты — window.cityStories (stories.js, задача 51 второго программиста); где их нет — запасные ниже.
// Окна счёта, меню и пробуждения — window.storyUI (story-ui.js, пакет 6 Codex); нет — обычная карточка sitCard.
// Прогресс — PROG.story (уходит в аккаунт). Шаги — в воронку на сервере (a=story), цифры — в mod.html.
// Отказался — через 20 минут игры предложат другую историю, ещё раз отказался — больше не пристают.
const STORY={t:0,try:0,sent:{},cool:0};
const STORY_AFTER=['police','witness','prosecutor','bank','wait'];
const STORY_FB={
  plates:{
    names:['Алина','Диляра','Кристина','Эльвира','Карина','Регина','Ангелина','Лейсан','Милана','Камила'],
    venues:[{name:'Лаунж «Шафран»',kind:'cafe'},{name:'Ресторан «Изумруд»',kind:'cafe'},{name:'Кафе «Белая ночь»',kind:'cafe'},{name:'Бар-ресторан «Версаль»',kind:'cafe'},{name:'Лаунж «Амбер»',kind:'cafe'}],
    menu:[{name:'Устрицы «Морской бриз»',price:9800},{name:'Шампанское, бутылка',price:24000},{name:'Фирменный чай «Императорский»',price:3500},{name:'Фруктовая тарелка',price:6400},{name:'Кальян «Премиум»',price:7900},
      {name:'Салат с камчатским крабом',price:5600},{name:'Коктейль «Для дамы»',price:4200},{name:'Сырная тарелка',price:4800},{name:'Десерт «Золотой»',price:3900},{name:'Вода «Альпийская»',price:1200},{name:'Тартар из тунца',price:6900},{name:'Коньяк, 200 мл',price:11500}],
    approach:['Извините, вы не подскажете, как пройти к Кремлю? Я тут совсем запуталась…','Ой, привет! Мы с тобой нигде не виделись? Лицо очень знакомое.','Простите, у вас зажигалки нет? Ладно, неважно. Вы местный?','Привет! Ты так уверенно идёшь — сразу видно, город знаешь.'],
    invite:['Слушай, тут рядом есть очень уютное место. Посидим, познакомимся?','Я как раз хотела выпить кофе. Составишь компанию? Тут за углом хорошее кафе.','Пойдём посидим? Я угощаю… шучу, но место правда хорошее.'],
    refused:['Ну и ладно. Скучный ты какой-то.','Как хочешь. Другого найду.','Жаль. А я думала, мы подружимся.'],
    walk:['Тут недалеко, сейчас за угол.','Ты чем занимаешься? Наверное, что-то интересное.','Обожаю это место, там всегда живая музыка.','Не переживай, там недорого.'],
    table:['Какой ты интересный! Рассказывай, кем работаешь?','А у тебя есть машина? Просто интересно.','Здесь так уютно, правда? Я часто сюда хожу.','Ты не против, если я закажу что-нибудь вкусненькое?'],
    order:['Нам шампанского, пожалуйста. И фрукты.','Мне устриц — я так давно их не ела!','И кальян нам, самый лучший.','Ещё бутылочку, нам весело!'],
    waiterAsk:['Брат, у нас недорого, счёт в конце принесём.','Не переживай, брат, цены нормальные. Отдыхай.','Всё по-честному, брат. Счёт потом.','Меню? Да зачем тебе меню, брат, всё недорого.'],
    menuShown:['Ну смотри, брат. Раз так хочешь.','Вот, пожалуйста. Только быстро.','Держи. Цены, как везде.'],
    leaveEarly:['Ты что, уже уходишь? Мы же только пришли!','Обиделась. Вот так всегда.','Иди-иди. Я тут подругу подожду.'],
    bill:['Ваш счёт, брат. {sum}.','Пожалуйста, рассчитаемся. {sum}, наличными или картой?','Вот, всё по меню. {sum}.'],
    guard:['Слышь, платить будем или как?','Тут так не делают. Счёт надо закрыть.','Давай по-хорошему. Пока по-хорошему.','Выйдем, поговорим?'],
    paid:['Спасибо, приходите ещё!','Всего доброго, брат.','Рады были видеть.'],
    call:['Э, ты куда звонишь? Подожди, давай договоримся.','Всё-всё, брат, недоразумение вышло. Сейчас разберёмся.','Ладно, плати за свой чай и иди. Без обид.'],
    sms:['Ты где пропал? 😘 Давай ещё увидимся?','Привет! Классно вчера посидели. Повторим?','Скучаю 🙈 Может, сегодня вечером?'],
    doctor:['Очнулись? Вас привезли без документов и без денег. Сотрясение лёгкое, жить будете.','Тише, не вставайте резко. Вас нашли во дворе у кафе.','Деньги, говорите? При вас ничего не было. Идите в полицию.'],
    police:['Опять {place}? Это уже не первое заявление.','Пишите всё как было: кто подошёл, что заказывали, сколько вышло.','Таких ловушек в центре несколько. Нужен свидетель — тогда дело пойдёт.'],
    witness:['Я там официанткой работала. Девушки водят туда парней, им процент со счёта.','Меня там тоже развели в прошлом месяце. Я дам показания.','Счёт они пишут какой хотят. Меню с ценами прячут.'],
    prosecutor:['Так-так… {place}. Дело хорошее, доведём.','Материалов достаточно. Передаю в суд — пусть разбираются.','Молодец, что не махнули рукой. Таких дел у меня много, а дойти до конца решаются немногие.'],
    finale:['По вашему делу: {place} закрыт, владельцы оштрафованы. Деньги возвращены на карту.','Суд решил в вашу пользу: деньги вернули, {place} опечатан.']},
  clofelin:{
    names:['Руслан','Олег','Артур','Денис','Марат','Лиля','Оксана','Алсу','Руслан и Лиля','Вадим и Света'],
    venues:[{name:'Бар «Подвальчик»',kind:'bar'},{name:'Паб «Старый мост»',kind:'bar'},{name:'Бар «Полночь»',kind:'bar'},{name:'Рюмочная «У Петровича»',kind:'bar'},{name:'Бар «Причал»',kind:'bar'}],
    approach:['Земляк, выручи — у тебя зарядки нет? Ладно, не важно. Ты местный?','О, свои люди! Слушай, мы тут новенькие, город показать некому.','Привет! Ты не знаешь, где тут нормально посидеть?'],
    invite:['Пойдём по одной за знакомство? Тут бар рядом, я угощаю.','Давай посидим полчасика, расскажешь про город. Тут бар есть хороший.','Слушай, у меня сегодня праздник. Пойдём, отметим — тут рядом.'],
    refused:['Ну, как знаешь. Бывай.','Жаль. Хорошего вечера.','Ладно, найдём компанию.'],
    toast:['Ну, за знакомство! До дна!','Давай-давай, за Казань!','Я уже взял нам, держи стакан.','Обижаешь — за встречу надо!','Да что тебе будет с одной? Пей.','Третий тост — за дружбу!'],
    refusedDrink:['Да ладно тебе, одну всего.','Не уважаешь, что ли?','Ну хоть пригуби.','Как хочешь. Тогда сок?'],
    signs:['Стакан тебе принесли от стойки сами, бармену подать не дали.','Пока ты отвечаешь на вопрос, с твоего стакана не сводят глаз.','Новый знакомый отходит «позвонить» и оглядывается.','Сами они почти не пьют — только чокаются.'],
    bartender:['Ты с ними поаккуратнее. Они тут не первый раз.','Я бы на твоём месте свой стакан из рук не выпускал.','Если что — я ничего не говорил. Но лучше иди домой.'],
    blackout:['Голова вдруг становится тяжёлой. Голоса уплывают…','Свет в баре начинает двоиться. Ещё секунда — и темнота.'],
    wake:['Утро. Лавка в сквере, холодно. Карманы пустые, телефона нет.','Что вчера было?.. Бар, тост за знакомство — и больше ничего.','Прохожий: «Вам плохо? Может, скорую?»'],
    bank:['Карту блокируем. Ночью с неё сняли всё, что было — переводы на чужие номера.','Новую карту выпустим, заявление на оспаривание тоже примем.','Клофелинщики? Ох, у нас таких историй каждую неделю.'],
    phone:['Номер восстановим по паспорту, сим-карта — пятнадцать минут.'],
    police:['Клофелинщики. Они по барам ходят по пятницам, ищут одиноких.','Опишите их: имена, внешность, о чём говорили.','Нужен свидетель из бара — тогда найдём.'],
    witness:['Я их запомнил. Они тут уже не первый раз, я полиции всё расскажу.','Бармен я. Видел, как он что-то сыпал в стакан. Сразу не понял…','Камеры у нас есть. Записи отдам следователю.'],
    finale:['Полиция: компания из {place} задержана. Часть денег вернули на вашу карту.','Их взяли с поличным в другом баре. Вам возвращают деньги.']}};
// тексты: stories.js (lines, after), иначе запасные
function storyData(id){return (window.cityStories&&window.cityStories[id])||{};}
function storyList(id,key){const D=storyData(id);for(const src of [D.lines,D.after]){const L=src&&src[key];if(Array.isArray(L)&&L.filter(Boolean).length)return L.filter(Boolean);}
  const top=D[key];if(Array.isArray(top)&&top.length)return top;return (STORY_FB[id]&&STORY_FB[id][key])||[''];}
function storyFill(t,o){o=o||{};const P=PROG.story||{};const sub={name:player.name||'',place:o.place||(P.v&&P.v.n)||'',sum:o.sum!=null?fmtMoney(o.sum):'',street:o.street||''};
  return String(t||'').replace(/\{(\w+)\}/g,(m,k)=>sub[k]!=null?sub[k]:'');}
function storyLine(id,key,o){return storyFill(pick(storyList(id,key)),o);}
// воронка: каждый шаг — один раз с устройства, без имён
function storyStep(id,st){const k=id+':'+st;if(STORY.sent[k])return;STORY.sent[k]=1;PROG.storyF=PROG.storyF||{};if(PROG.storyF[k])return;PROG.storyF[k]=1;progSave();
  if(!/^https?:/.test(location.protocol)||typeof myCid==='undefined')return;
  try{fetch('api.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({a:'story',id:myCid,s:id,st}),keepalive:true}).catch(()=>{});}catch(e){}}
function storySave(o){PROG.story=Object.assign(PROG.story||{},o);progSave();if(typeof saveState==='function')saveState();}
// окно: story-ui.js, если есть, иначе карточка
function storyShow(ui,data,card){if(window.storyUI&&typeof window.storyUI[ui]==='function'){try{window.storyUI[ui](data);return;}catch(e){console.warn(e);}}sitCard(card);}
function storyCard(o){return Object.assign({icon:'💬',ttl:0},o,{onTimeout:o.dflt?()=>o.dflt():undefined});}
function storyFemale(n){return /[ая]$/i.test(n)&&!/^(Илья|Никита|Кузьма|Фома|Лука|Савва)$/i.test(n);}
function storyPersona(id,name){const p=makePersona('resident');p.name=name;p.female=storyFemale(name.split(' ')[0]);
  if(id==='plates'){p.age=Math.floor(rnd(22,29));p.clothes=pick(['#C2185B','#8E24AA','#D32F2F','#E91E63']);p.bag='#2A2A2A';p.story='charmer';p.hairStyle=pick([1,1,2]);}
  else{p.age=Math.floor(rnd(26,40));p.story='stranger';}
  p.job='';p.ctx=`Ты — ${name}. Вы только что познакомились с собеседником на улице, и ты зовёшь его посидеть в заведении рядом. Ты весёлый человек, делаешь комплименты, расспрашиваешь о работе. О ценах и о себе говоришь уклончиво.`;return p;}
// выдуманное заведение: тротуар у дома в 60–170 м, рядом нет настоящих заведений
function storyVenue(id){const V=storyList(id,'venues').filter(v=>v&&v.name);const v=pick(V.length?V:STORY_FB[id].venues);
  for(let k=0;k<30;k++){const q=spotNear(60,170);if(!q)continue;if(world.pois.some(p=>Math.abs(p.x-q[0])<30&&Math.abs(p.y-q[1])<30&&dist(p.x,p.y,q[0],q[1])<30))continue;if(!inBuildingNear(q[0],q[1]))continue;
    return {x:q[0],y:q[1],n:v.name,kind:v.kind==='bar'?'bar':'cafe'};}return null;}
function storyPick(){if(typeof cityHour!=='function')return null;const h=cityHour();if(h>=11&&h<18)return 'plates';if(h>=19||h<2)return 'clofelin';if(h>=18&&h<19)return Math.random()<0.5?'plates':'clofelin';return null;}
function storyFree(){return scene==='city'&&world&&world.meta&&!player.vehicle&&!player.bus&&!player.busy&&!player.inside&&!companion&&!SIT.card&&player.state==='ok'&&!player.waitingStop&&!sitActive('story')&&!window.zkNoStory;}

// ---------- сама история: подходит, зовёт, ведёт, внутри — выборы ----------
defSit('story',{title:'История новичка',quiet:true,
  start(s){const id=s.id;const name=pick(storyList(id,'names'));const q=spotNear(22,40);if(!q)return false;const n=nearestNode(q[0],q[1],world.pedAdj,60);if(n<0)return false;
    const w=new Walker('resident',n);w.temp=true;w.p=storyPersona(id,name);w.x=q[0];w.y=q[1];walkers.push(w);s.w=takeActor(s,w,'sit');moveActor(w,player.x,player.y,2.7);s.phase='come';s.rt=1;
    if(/ и /.test(name)){const w2=new Walker('resident',n);w2.temp=true;w2.p=storyPersona(id,name.split(' и ')[1]);w2.x=q[0]+1;w2.y=q[1]+0.6;walkers.push(w2);s.w2=takeActor(s,w2,'sit');moveActor(w2,player.x,player.y,2.7);}
    storyStep(id,'offer');return true;},
  update(s,dt){const w=s.w,id=s.id;if(!w)return endSit(s);
    if(s.w2&&s.phase!=='inside'&&s.phase!=='gone'){if(s.phase==='go'){s.w2.x+=(w.x-w.hx*1.2-s.w2.x)*Math.min(1,dt*3);s.w2.y+=(w.y-w.hy*1.2+0.8-s.w2.y)*Math.min(1,dt*3);s.w2.phase+=dt*8;}else stepActor(s.w2,dt);}
    if(s.phase==='come'){s.rt-=dt;if(s.rt<=0){s.rt=1;moveActor(w,player.x,player.y,2.7);}stepActor(w,dt);
      if(s.t>40||scene!=='city'||player.vehicle||player.bus){storyAbort(s);return;}   // не дождалась
      if(dist(w.x,w.y,player.x,player.y)<2.4&&!SIT.card){w.mv=null;faceTo(w,player.x,player.y);s.phase='ask';const a=storyLine(id,'approach'),b=storyLine(id,'invite');say(w,a,6);
        sitCard(storyCard({s,icon:id==='plates'?'💃':'🍻',title:w.p.name,text:`«${a}» — «${b}»`,choices:[{t:'Пойдём',primary:true,run:()=>storyGo(s)},{t:'В другой раз',run:()=>storyRefuse(s)}],dflt:()=>storyRefuse(s)}));}
      return;}
    if(s.phase==='leave'){stepActor(w,dt);s.lt-=dt;if(s.lt<=0)endSit(s);return;}
    if(s.phase==='go'){
      if(!companion||companion.w!==w){storyOut(s,'avoided','Вы передумали и ушли своей дорогой.');return;}
      s.wt=(s.wt||8)-dt;if(s.wt<=0&&dist(w.x,w.y,player.x,player.y)<8){s.wt=rnd(10,16);say(w,storyLine(id,'walk'),5);}
      if(scene==='interior'&&interior&&interior.key===s.key){s.phase='inside';s.it=interior;player.busy=true;storyStep(id,'inside');Object.assign(companion,{arrived:true,mode:'follow'});updateCompBox();
        if(s.w2){const c=interior.npcs.find(n2=>n2.companionOf===w);if(c)interior.npcs.push({p:s.w2.p,x:c.x-2.1,y:c.y,hx:1,hy:0,seated:true,phase:0,role:'resident',isInterior:true,state:'idle',memory:s.w2.p.memory,storyTwo:true});}
        setTimeout(()=>id==='plates'?platesTable(s):clofTable(s),1200);}
      return;}
    if(s.phase==='inside'&&scene!=='interior'&&!s.ending){storyOut(s,'avoided','Вы вышли на улицу. Новые знакомые остались внутри.');}},
  action(s){const v=s.v;if(s.phase!=='go'||!v||scene!=='city'||dist(v.x,v.y,player.x,player.y)>7)return null;
    return {label:`Зайти в «${v.n.replace(/^.*«|»$/g,'')||v.n}» (${s.w.p.name} с вами)`,run:()=>{unmark('sdoor');enterInterior({kind:v.kind,name:v.n,key:s.key,x:player.x,y:player.y});}};},
  end(s){player.busy=false;if(s.it)s.it.npcs=s.it.npcs.filter(n=>!n.storyTwo);if(companion&&companion.w===s.w)stopCompanion(true);unmark('sdoor');
    for(const w of [s.w,s.w2]){if(!w)continue;w.sitBy=null;const i=walkers.indexOf(w);if(i>=0)walkers.splice(i,1);}s.actors=[];}});   // ушли насовсем
function storyAbort(s){endSit(s);}   // не случилось (уехал, ушёл) — история придёт позже
function storyRefuse(s){const w=s.w;say(w,storyLine(s.id,'refused'),5);storyStep(s.id,'refused');
  const P=PROG.story;if(P&&P.out==='refused')storySave({st:'done'});else storySave({id:s.id,st:'later',out:'refused',at:Date.now()+20*60e3});
  const q=spotNear(40,70);if(q){moveActor(w,q[0],q[1],2.4);if(s.w2)moveActor(s.w2,q[0],q[1],2.4);}s.phase='leave';s.lt=6;}
function storyGo(s){const id=s.id,w=s.w;const v=storyVenue(id);if(!v){say(w,'Ой, а там сегодня закрыто… В другой раз!',5);s.phase='leave';s.lt=4;return;}
  s.v=v;s.key='story:'+id+':'+Math.round(v.x)+'_'+Math.round(v.y);w.sitBy=null;w.mv=null;if(s.w2){s.w2.mv=null;}
  startCompanion(w,'follow');if(!companion||companion.w!==w){endSit(s);return;}
  Object.assign(companion,{mode:'go',dest:{x:v.x,y:v.y,n:v.n},route:null,arrived:false});player.escort=false;updateCompBox();
  mark(s,'sdoor',v.x,v.y,v.kind==='bar'?'🍸':'🍽',v.n,{arrow:true,color:'#8E3B6B'});s.phase='go';s.wt=4;storyStep(id,'go');
  setHint(`${w.p.name} ведёт вас в ${qName(v.n)} — идите следом`);}
// исход: avoided — ушёл вовремя, caught — попался (дальше возмездие), called — вызвал полицию за столом
function storyOut(s,out,text,extra){if(s.ending)return;s.ending=true;const id=s.id;player.busy=false;if(text)addEvent(text,out==='caught'?'alert':'say');
  if(out==='avoided'){storyStep(id,'avoided');storySave({id,st:'done',out:'avoided',v:s.v});cityTrack('story_dodge');if(typeof sitRep==='function')sitRep(2,'не повелись на «знакомство»');}
  if(out==='called'){storyStep(id,'called');storySave({id,st:'done',out:'called',v:s.v});cityTrack('story_win');if(typeof memNote==='function')memNote(id+'_win',{place:s.v&&s.v.n});if(typeof sitRep==='function')sitRep(5,'вызвали полицию в кафе-ловушке');}
  if(out==='caught'){storyStep(id,'caught');storySave(Object.assign({id,st:id==='clofelin'?'bank':'police',out:'caught',v:s.v,day:clock.day},extra||{}));if(typeof memNote==='function')memNote(id,{place:s.v&&s.v.n});}
  if(scene==='interior'&&interior&&interior.key===s.key)exitInterior();
  endSit(s);if(out==='caught')storyAfterStart();}

// ---------- тарелочница: за столом ----------
function platesTable(s){if(s.ending)return;const id='plates',w=s.w;s.order=platesOrder();
  sitCard(storyCard({s,icon:'🍽',title:s.v.n,text:`${w.p.name}: «${storyLine(id,'table')}» Она подзывает официанта: «${storyLine(id,'order')}»`,
    choices:[{t:'Спросить, сколько это стоит',primary:true,run:()=>platesAsk(s)},{t:'Ладно, гуляем',run:()=>platesBill(s)},{t:'Мне пора',run:()=>platesLeave(s)}],dflt:()=>platesLeave(s)}));}
function platesOrder(){const M=storyList('plates','menu').filter(m=>m&&m.name&&m.price>0);const menu=(M.length>=5?M:STORY_FB.plates.menu).slice().sort(()=>Math.random()-0.5);
  const out=[];let sum=0;for(const m of menu){if(sum>=35000)break;if(sum+m.price>46000)continue;out.push({name:m.name,price:m.price});sum+=m.price;}return {items:out,sum,menu};}
function platesAsk(s){const id='plates';storyStep(id,'asked');
  sitCard(storyCard({s,icon:'🧾',title:'Официант',text:`«${storyLine(id,'waiterAsk')}»`,
    choices:[{t:'Настоять: меню с ценами',primary:true,run:()=>platesMenu(s)},{t:'Ну ладно',run:()=>platesBill(s)},{t:'Уйти',run:()=>platesLeave(s)}],dflt:()=>platesBill(s)}));}
function platesMenu(s){const id='plates';storyStep(id,'menu');const items=s.order.menu.slice(0,6);const line=storyLine(id,'menuShown');
  const choices=[{t:'Встать и уйти',primary:true,run:()=>platesLeave(s,true)},{t:'Остаться',run:()=>platesBill(s)}];
  storyShow('menu',{place:s.v.n,items,line,choices},storyCard({s,icon:'📋',title:'Меню',text:`Официант: «${line}» ${items.map(m=>`${m.name} — ${fmtMoney(m.price)}`).join(' · ')}`,choices,dflt:()=>platesLeave(s,true)}));}
function platesLeave(s,sawMenu){say(s.w,storyLine('plates','leaveEarly'),5);
  storyOut(s,'avoided',sawMenu?'Вы встали и ушли. С такими ценами «знакомство» вышло бы дороже квартиры.':'Вы ушли. Официант что-то крикнул вслед, но догонять не стал.');}
function platesBill(s){if(s.ending)return;const id='plates',w=s.w;const o=s.order;storyStep(id,'bill');
  const pre=`Проходит час. ${w.p.name} заказывает ещё: «${storyLine(id,'order')}» — и «на минутку отходит». Не возвращается.`;
  const line=storyLine(id,'bill',{sum:o.sum}),money=Math.max(0,Math.round(player.money||0));
  const choices=[money>=o.sum?{t:`Оплатить ${fmtMoney(o.sum)}`,run:()=>platesPay(s,o.sum)}:{t:`Отдать всё, что есть (${fmtMoney(money)})`,run:()=>platesPay(s,money)},
    {t:'Не буду платить',run:()=>platesGuard(s)},{t:'Позвонить 112',primary:true,run:()=>platesCall(s)}];
  sitCard(storyCard({s,icon:'🍽',title:s.v.n,text:pre,choices:[{t:'Дальше',primary:true,run:()=>storyShow('bill',{place:s.v.n,items:o.items,total:o.sum,line,choices},
    storyCard({s,icon:'🧾',title:'Счёт',text:`«${line}» ${o.items.map(m=>`${m.name} — ${fmtMoney(m.price)}`).join(' · ')}. Итого: ${fmtMoney(o.sum)}`,choices,dflt:()=>platesGuard(s)}))}],dflt:()=>platesBill2(s,choices,line)}));}
function platesBill2(s,choices,line){const o=s.order;storyShow('bill',{place:s.v.n,items:o.items,total:o.sum,line,choices},storyCard({s,icon:'🧾',title:'Счёт',text:`«${line}» Итого: ${fmtMoney(o.sum)}`,choices,dflt:()=>platesGuard(s)}));}
function platesPay(s,sum){const lost=Math.min(sum,Math.max(0,Math.round(player.money||0)));player.money-=lost;addEvent(`🧾 Счёт в ${qName(s.v.n)}: −${fmtMoney(lost)}`,'alert');
  storyOut(s,'caught',`Официант: «${storyLine('plates','paid')}» Её телефон больше не отвечает. Похоже, это была ловушка — с полицией дело ещё можно вернуть.`,{lost,how:'paid'});}
function platesGuard(s){const id='plates';storyStep(id,'guard');const money=Math.max(0,Math.round(player.money||0));
  sitCard(storyCard({s,icon:'🕴',title:'Охрана',text:`«${storyLine(id,'guard')}»`,tone:'alert',
    choices:[{t:money>=s.order.sum?`Ладно, заплачу ${fmtMoney(s.order.sum)}`:`Отдать всё, что есть (${fmtMoney(money)})`,run:()=>platesPay(s,Math.min(money,s.order.sum))},{t:'Позвонить 112',primary:true,run:()=>platesCall(s)},{t:'Не буду',run:()=>platesBeaten(s)}],dflt:()=>platesBeaten(s)}));}
function platesCall(s){const id='plates';const tea=Math.min(600,Math.max(0,Math.round(player.money||0)));
  sitCard(storyCard({s,icon:'📞',title:'112',text:`Охранник: «${storyLine(id,'call')}» Через десять минут у входа наряд. Официант вдруг вспоминает, что вы заказывали только чай: ${fmtMoney(tea)}.`,tone:'good',
    choices:[{t:'Заплатить за чай и дать показания',primary:true,run:()=>{if(tea)player.money-=tea;storyOut(s,'called',`👮 Полиция приняла показания на месте. ${qName(s.v.n)} проверят — вы заплатили только за свой чай.`);}}],dflt:()=>{if(tea)player.money-=tea;storyOut(s,'called','👮 Полиция приняла показания на месте.');}}));}
function platesBeaten(s){const id='plates';const lost=Math.max(0,Math.round(player.money||0));
  sitCard(storyCard({s,icon:'🌑',title:s.v.n,tone:'alert',text:'Охрана выводит вас во двор «поговорить». Дальше — темнота.',choices:[{t:'…',primary:true,run:()=>{
    player.money-=lost;storyOut(s,'caught',null,{lost,how:'beaten'});storyWard();}}],dflt:()=>{player.money-=lost;storyOut(s,'caught',null,{lost,how:'beaten'});storyWard();}}));}
// больница: игрок приходит в себя в палате ближайшей больницы
function storyWard(){const hs=world.pois.filter(p=>p.t==='hospital');let h=null,bd=1e9;for(const p of hs){const d=dist(p.x,p.y,player.x,player.y);if(d<bd){bd=d;h=p;}}
  if(h){const q=toSidewalk(h.x,h.y);player.x=q[0];player.y=q[1];cam.x=player.x;cam.y=player.y;}
  player.energy=Math.min(player.energy,25);player.mood=clamp(player.mood-25,0,100);
  enterInterior({kind:'hospital',name:h&&h.n?`Палата · ${h.n}`:'Палата',key:'story:ward',x:player.x,y:player.y});
  const lines=[storyLine('plates','doctor'),storyLine('plates','doctor')].filter((t,i,a)=>a.indexOf(t)===i);
  const done=()=>{addEvent(`🩺 ${lines[0]}`,'alert');setHint('Напишите заявление в полиции — отдел полиции отмечен на карте');storyAfterStart();};
  storyShow('wake',{kind:'hospital',lines,onDone:done},storyCard({icon:'🩺',title:'Врач',text:lines.join(' '),choices:[{t:'Встать',primary:true,run:done}],dflt:done}));}

// ---------- клофелинщики: в баре ----------
function clofTable(s){if(s.ending)return;const id='clofelin',w=s.w;
  sitCard(storyCard({s,icon:'🍻',title:s.v.n,text:`${w.p.name}: «${storyLine(id,'toast')}» (${storyLine(id,'signs')})`,
    choices:[{t:'Выпить за знакомство',run:()=>clofDrink(s)},{t:'Сказать, что не пьёшь',run:()=>clofNo(s)},{t:'Отойти к стойке',primary:true,run:()=>clofBar(s)}],dflt:()=>clofNo(s)}));}
function clofNo(s){const id='clofelin';storyStep(id,'nodrink');
  sitCard(storyCard({s,icon:'🍻',title:s.w.p.name,text:`«${storyLine(id,'refusedDrink')}» (${storyLine(id,'signs')})`,
    choices:[{t:'Уйти',primary:true,run:()=>storyOut(s,'avoided','Вы ушли из бара. Странная компания — и стакан этот…')},{t:'Ну ладно, одну',run:()=>clofDrink(s)}],dflt:()=>storyOut(s,'avoided','Вы ушли из бара.')}));}
function clofBar(s){const id='clofelin';storyStep(id,'bartender');
  sitCard(storyCard({s,icon:'🍸',title:'Бармен',text:`«${storyLine(id,'bartender')}»`,
    choices:[{t:'Уйти',primary:true,run:()=>storyOut(s,'avoided','Вы вышли через другую дверь. Бармен кивнул вслед.')},{t:'Вернуться за стол',run:()=>clofDrink(s)}],dflt:()=>storyOut(s,'avoided','Вы ушли из бара.')}));}
function clofDrink(s){const id='clofelin';storyStep(id,'drink');const lost=Math.max(0,Math.round(player.money||0));
  const go=()=>{player.money-=lost;storyOut(s,'caught',null,{lost,how:'robbed'});clofWake();};
  sitCard(storyCard({s,icon:'🌑',title:s.v.n,tone:'alert',text:storyLine(id,'blackout'),choices:[{t:'…',primary:true,run:go}],dflt:go}));}
function clofWake(){const id='clofelin';let q=null;const sq=(world.squares||[]).filter(x=>dist(x.x,x.y,player.x,player.y)<900).sort((a,b)=>dist(a.x,a.y,player.x,player.y)-dist(b.x,b.y,player.x,player.y))[0];
  if(sq)q=toSidewalk(sq.x,sq.y);if(!q)q=spotNear(150,400);if(q){player.x=q[0];player.y=q[1];cam.x=player.x;cam.y=player.y;}
  player.energy=Math.min(player.energy,30);player.mood=clamp(player.mood-30,0,100);
  const lines=[storyLine(id,'wake'),storyLine(id,'wake')].filter((t,i,a)=>a.indexOf(t)===i);
  const done=()=>{setHint('Заблокируйте карту в отделении банка — оно отмечено на карте');storyAfterStart();};
  storyShow('wake',{kind:'bench',lines,onDone:done},storyCard({icon:'🌅',title:'Утро',text:lines.join(' '),choices:[{t:'Встать',primary:true,run:done}],dflt:done}));}

// ---------- возмездие: банк (клофелин), полиция, свидетель, прокурор (тарелочница), решение ----------
function storyAfterStart(){if(!sitActive('storyafter'))startSit('storyafter');}
function storyNearest(t){let best=null,bd=1e9;for(const p of world.pois){if(p.t!==t)continue;const d=dist(p.x,p.y,player.x,player.y);if(d<bd){bd=d;best=p;}}return best;}
defSit('storyafter',{title:'Дело о мошенниках',quiet:true,multi:false,cool:1,
  start(s){const P=PROG.story;if(!P||!STORY_AFTER.includes(P.st))return false;s.id=P.id;storyAfterMarks(s);return true;},
  update(s,dt){const P=PROG.story;if(!P||!STORY_AFTER.includes(P.st)){endSit(s);return;}s.mt=(s.mt||0)-dt;if(s.mt<=0){s.mt=5;storyAfterMarks(s);}
    if(P.st==='witness'&&P.v&&scene==='city'){const d=dist(P.v.x,P.v.y,player.x,player.y);
      if(d<70&&!s.wit){const n=nearestNode(P.v.x,P.v.y,world.pedAdj,60);if(n>=0){const w=new Walker('resident',n);w.temp=true;const q=sidewalkPos(n);w.x=q[0];w.y=q[1];walkers.push(w);
        if(P.id==='plates'){w.p.female=true;w.p.name=pick(['Гульнара','Ирина','Аделя','Наталья']);w.p.job='бывшая официантка';}else{w.p.female=false;w.p.name=pick(['Тимур','Сергей','Ильдар']);w.p.job='бармен';}
        s.wit=takeActor(s,w,'sit');}}
      if(s.wit&&d>140){releaseActor(s.wit);s.actors=s.actors.filter(a=>a!==s.wit);s.wit=null;}}
    if(P.st==='wait'&&Date.now()>=(P.at||0))storyFinale();},
  action(s){const P=PROG.story;if(!P||P.st!=='witness'||!s.wit||scene!=='city'||dist(s.wit.x,s.wit.y,player.x,player.y)>3.5)return null;
    return {label:`Поговорить: ${s.wit.p.name} (${s.wit.p.job})`,run:()=>{faceTo(s.wit,player.x,player.y);const t=storyLine(P.id,'witness');say(s.wit,t,6);storyStep(P.id,'witness');
      const next=P.id==='plates'?'prosecutor':'wait';storySave({st:next,at:Date.now()+90e3});unmark('safter');
      sitCard(storyCard({icon:'🗣',title:s.wit.p.name,text:`«${t}»`,choices:[{t:'Спасибо',primary:true,run:()=>{}}]}));
      setHint(next==='prosecutor'?'Свидетель есть. Отнесите материалы в приёмную прокурора — она отмечена на карте':'Свидетель даст показания. Ждите новостей от полиции');storyAfterMarks(s);}};},
  actionInside(s){const P=PROG.story;if(!P||scene!=='interior'||!interior)return null;const k=interior.kind,place=P.v&&P.v.n||'';
    if(P.st==='bank'&&k==='bank')return {label:'Заблокировать карту и написать заявление',run:()=>{spendTime(20);const t=storyLine(P.id,'bank');storyStep(P.id,'bank');storySave({st:'police'});unmark('safter');
      sitCard(storyCard({icon:'🏦',title:'Банк',text:`«${t}» ${storyLine(P.id,'phone')}`,choices:[{t:'Дальше — в полицию',primary:true,run:()=>{}}]}));storyAfterMarks(s);}};
    if(P.st==='police'&&k==='police')return {label:`Заявление: ${qName(place)}`,run:()=>{spendTime(40);const t=storyLine(P.id,'police');storyStep(P.id,'police');storySave({st:'witness'});unmark('safter');
      sitCard(storyCard({icon:'👮',title:'Дежурный',text:`«${t}»`,choices:[{t:'Найти свидетеля',primary:true,run:()=>{}}]}));setHint(`Найдите свидетеля у ${qName(place)} — место отмечено на карте`);storyAfterMarks(s);}};
    if(P.st==='prosecutor'&&k==='prosecutor')return {label:`Передать материалы о ${qName(place)}`,run:()=>{spendTime(30);const t=storyLine(P.id,'prosecutor');storyStep(P.id,'prosecutor');storySave({st:'wait',at:Date.now()+90e3});unmark('safter');
      sitCard(storyCard({icon:'⚖️',title:'Прокурор',text:`«${t}»`,choices:[{t:'Ждать решения',primary:true,run:()=>{}}]}));setHint('Дело ушло в суд. Новости придут в телефон');}};
    return null;}});
function storyAfterMarks(s){const P=PROG.story;if(!P)return;let p=null,icon='📍',lbl='';
  if(P.st==='bank'){p=storyNearest('bank');icon='🏦';lbl=p&&p.n?`Банк: заблокировать карту`:'Банк';}
  else if(P.st==='police'){p=storyNearest('police');icon='🚓';lbl='Полиция: заявление';}
  else if(P.st==='witness'&&P.v){p=P.v;icon='🗣';lbl=`Свидетель у ${qName(P.v.n)}`;}
  else if(P.st==='prosecutor'){if(typeof prosPlace==='function')prosPlace();p=storyNearest('prosecutor');icon='⚖️';lbl='Приёмная прокурора';}
  if(p)mark(s,'safter',p.x,p.y,icon,lbl,{arrow:true,color:'#2D4A9E'});else unmark('safter');}
function storyFinale(){const P=PROG.story;if(!P||P.st!=='wait')return;const id=P.id;const text=storyLine(id,'finale',{place:P.v&&P.v.n});
  const back=Math.max(0,P.lost||0)+(P.how==='beaten'?5000:2000);storySave({st:'done',out:'won'});storyStep(id,'done');
  if(window.cityPhone&&typeof window.cityPhone.push==='function'){try{window.cityPhone.push({from:id==='plates'?'Прокуратура':'Полиция',text,kind:'story'});}catch(e){}}
  addEvent(`⚖️ ${text}`,'say');if(back)sitMoney(back,'Возврат по делу о мошенниках');cityTrack('story_win');if(typeof memNote==='function')memNote(id+'_win',{place:P.v&&P.v.n});
  if(typeof sitRep==='function')sitRep(5,'довели дело мошенников до конца');sitMood(15);}

// ---------- когда начинать ----------
defWatch(dt=>{const P=PROG.story;
  if(P&&STORY_AFTER.includes(P.st)){if(!sitActive('storyafter')&&world&&world.meta)storyAfterStart();
    if(P.id==='plates'&&P.st==='police'&&!P.sms&&Date.now()-(STORY.smsT||(STORY.smsT=Date.now()))>60000){storySave({sms:1});
      if(window.cityPhone&&typeof window.cityPhone.push==='function'){try{window.cityPhone.push({from:'Незнакомка',text:storyLine('plates','sms'),kind:'story'});}catch(e){}}}return;}
  if(P&&!(P.st==='later'&&Date.now()>=(P.at||0)))return;
  if(scene==='city'&&!player.busy)STORY.t+=dt||0;if(STORY.t<360)return;
  STORY.try-=dt||0;if(STORY.try>0)return;STORY.try=5;if(!storyFree())return;
  let id=storyPick();if(P&&P.st==='later'){const other=P.id==='plates'?'clofelin':'plates';const h=cityHour();id=other==='plates'?(h>=11&&h<19?'plates':null):(h>=18||h<2?'clofelin':null);}
  if(!id)return;if(Math.random()<0.5)return;startSit('story',{id});});
// значки
if(Array.isArray(window.cityAchievements))window.cityAchievements.push(
  {id:'story-dodge',icon:'🧠',title:'Меня не проведёшь',text:'Распознать «знакомство» с подвохом и уйти вовремя.',check:'story_dodge',n:1},
  {id:'story-win',icon:'⚖️',title:'Справедливость',text:'Довести дело мошенников до конца.',check:'story_win',n:1});
// память города: газета и слухи об этих историях (тексты второго программиста — paper.js и gossip.js, kind ниже)
if(typeof MEM_ORDER!=='undefined'){MEM_ORDER.unshift('plates_win','clofelin_win');MEM_ORDER.push('plates','clofelin');MEM_GOOD.add('plates_win');MEM_GOOD.add('clofelin_win');
  Object.assign(MEM_PAPER,{plates:['В центре снова «ужин знакомства» со счётом на десятки тысяч. Полиция просит: спрашивайте меню с ценами.'],
    plates_win:['Дело о кафе-ловушке {place} дошло до суда. Пострадавшему вернули деньги — {name} не махнул(а) рукой.'],
    clofelin:['Ночью в сквере нашли человека без денег и телефона: в баре подсыпали снотворное. Не пейте с незнакомцами.'],
    clofelin_win:['Клофелинщиков из {place} задержали. Помогли показания пострадавшего и бармена.']});
  Object.assign(MEM_GOSSIP,{plates:['Говорят, вас в кафе на счёт развели? Сочувствую…','Слышал про вчерашний ужин. Бывает, не вы первый.'],
    plates_win:['Это вы то кафе прикрыли? Уважаю!','Говорят, вы до прокурора дошли. Молодец!'],
    clofelin:['Слышал, вас в баре обобрали. Как вы сейчас?','Говорят, вы утром на лавке проснулись… Берегите себя.'],
    clofelin_win:['Это из-за вас тех клофелинщиков взяли? Спасибо!','Говорят, вы их нашли. Вот это характер.']});}
window.storyStart=id=>startSit('story',{id:id||storyPick()||'plates'});   // для проверок
