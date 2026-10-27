// Одна законченная история соседки. Казанские места — из карты; Фидания и Рузиля — персонажи игры.
// PROG.neighbourStory хранит обещание, передачу и однократную благодарность. Никаких фоновых запросов к ИИ.
// Внешний API: neighbourStoryOpen() — журнал/маршрут, neighbourStoryContext(folkId) — факты для диалога.
const NEIGHBOUR_STORY={tick:0,mark:'neighbour:books'};
function neighbourStoryState(){
  const S=PROG.neighbourStory||(PROG.neighbourStory={stage:'new',rev:0});
  if(!['new','offered','declined','carrying','returning','done'].includes(S.stage))S.stage='new';
  return S;
}
function neighbourStoryFolk(){return typeof FOLK!=='undefined'?FOLK.list.find(f=>f.id==='fidania'):null;}
function neighbourStoryNear(){
  if(player.bus||player.vehicle||player.state==='hurt')return null;
  if(scene==='interior'&&interior){return interior.npcs.find(n=>(n.folk||(n.p&&n.p.folk))==='fidania'&&n.state!=='hurt'&&dist(n.x,n.y,player.ix,player.iy)<3.5)||null;}
  const f=neighbourStoryFolk(),w=f&&f.w;
  return scene==='city'&&w&&walkers.includes(w)&&!w.bus&&!w.inside&&!w.sitBy&&w.state!=='hurt'&&dist(w.x,w.y,player.x,player.y)<4?w:null;
}
function neighbourStorySave(){progSave();if(typeof saveState==='function')saveState();}
function neighbourStoryChange(stage){const S=neighbourStoryState();S.stage=stage;S.rev=(S.rev||0)+1;neighbourStorySave();neighbourStoryMark();return S;}
function neighbourStoryCard(o){
  // Повторное E не накапливает обещания в очереди карточек.
  if((SIT.card&&SIT.card.neighbourStory)||SIT.queue.some(c=>c.neighbourStory))return;
  const card=sitCard(Object.assign({icon:'📚',title:'Фидания и коробка книг',ttl:0,neighbourStory:true},o));
  if(SIT.card===card&&card.participant){const f=neighbourStoryFolk();
    // Пока читают карточку, житель не уходит по старому пути. Блокировка живёт в самой
    // активной карточке (folkPersonBusy), поэтому закрытие сразу отпускает человека.
    if(f&&neighbourStoryNear()===card.participant){if(f.w===card.participant)f.away=true;if(typeof folkCancelRoute==='function')folkCancelRoute(f);}}
  return card;
}
function neighbourStoryGuard(w,rev,stage){const S=neighbourStoryState();return S.rev===rev&&S.stage===stage&&neighbourStoryNear()===w;}
function neighbourStoryLibraryRank(name){
  if(/техническ|научн|железнодорож|ведомствен|университет|институт|колледж|школьн|академ/i.test(name))return 2;
  return /национальн|городск|районн|муниципальн|центральн|детск|филиал|общедоступн/i.test(name)?0:1;
}
function neighbourStoryDestination(){
  if(!world||!world.meta)return null;
  const candidates=(world.pois||[]).filter(p=>p.t==='library'&&p.n).map(p=>({x:p.x,y:p.y,n:p.n}));
  for(const l of window.cityLandmarks||[]){if(!/библиотек/i.test(l.name||'')||!Array.isArray(l.ll))continue;const p=llToXY(l.ll);candidates.push({x:p[0],y:p[1],n:l.name});}
  candidates.sort((a,b)=>neighbourStoryLibraryRank(a.n)-neighbourStoryLibraryRank(b.n)||dist(a.x,a.y,player.x,player.y)-dist(b.x,b.y,player.x,player.y));
  for(const d of candidates){
    if(!Number.isFinite(d.x)||!Number.isFinite(d.y))continue;
    // Точка встречи снаружи, на загруженной пешеходной сети, а не в центре здания.
    const node=nearestNode(d.x,d.y,world.pedAdj,140);if(node<0)continue;
    const q=sidewalkPos(node);if(!q||inBuilding(q[0],q[1])||dist(q[0],q[1],d.x,d.y)>140)continue;
    return {x:q[0],y:q[1],n:String(d.n).slice(0,100),kind:'встреча у библиотеки'};
  }
  return null;
}
function neighbourStoryWhere(){
  if(typeof folkWhere!=='function')return null;const f=folkWhere('fidania');
  return f&&Number.isFinite(f.x)&&Number.isFinite(f.y)?{x:f.x,y:f.y,n:'Фидания · '+(f.place||'соседка'),kind:'свой человек',text:f.text}:null;
}
function neighbourStoryRoute(to){
  if(scene!=='city'){setHint('Сначала выйдите на улицу, затем откройте маршрут истории.');return;}
  const S=neighbourStoryState(),d=to==='books'&&S.stage==='carrying'?S.dest:to==='fidania'?neighbourStoryWhere():null;
  if(!d){setHint('Место пока не найдено. Вернитесь к истории, когда загрузится район.');return;}
  openRouteModal({x:d.x,y:d.y,n:d.n,kind:d.kind});
}
function neighbourStoryMark(){
  const S=neighbourStoryState(),d=S.stage==='carrying'?S.dest:S.stage==='returning'?neighbourStoryWhere():null;
  if(d)mark(null,NEIGHBOUR_STORY.mark,d.x,d.y,'📚',S.stage==='carrying'?'Книги: '+d.n:'Рассказать Фидании',{arrow:true,color:'#796246'});
  else unmark(NEIGHBOUR_STORY.mark);
}
function neighbourStoryOpen(){
  const S=neighbourStoryState(),where=neighbourStoryWhere();let text;
  if(S.stage==='carrying')text=`Вы обещали Фидании передать коробку Рузиле у «${S.dest.n}». На метке подойдите пешком и нажмите E. Можно добраться любым способом. Срока нет. Чтобы отказаться от обещания, верните коробку Фидании лично.`;
  else if(S.stage==='returning')text='Книги уже у Рузили. Теперь лично расскажите Фидании, что всё получилось. Благодарность ждёт после встречи.';
  else if(S.stage==='done')text=S.reacted?'История завершена: книги читают новые соседи, Фидания запомнила вашу помощь.':'Вы сдержали обещание. В следующий игровой день при встрече Фидания расскажет, кому достались книги.';
  else text=(S.stage==='declined'?'В прошлый раз вы отказались. Фидания не обиделась — можно вернуться. ':'')+'У Фидании есть коробка татарских и русских сказок для знакомой. Найдите соседку и поговорите лично: E рядом с ней. Обычно она выходит во двор днём и вечером.';
  if(where&&S.stage!=='carrying')text+=' Сейчас: '+where.text+'.';
  neighbourStoryCard({text,choices:[...(S.stage==='carrying'?[{t:'Маршрут к библиотеке',primary:true,run:()=>neighbourStoryRoute('books')}]:[]),{t:'Найти Фиданию',primary:S.stage!=='carrying',run:()=>neighbourStoryRoute('fidania')},{t:'Закрыть',run:()=>{}}]});
}
function neighbourStoryMeet(w){
  if(neighbourStoryNear()!==w)return;
  const S=neighbourStoryState();if(typeof folkOnChat==='function')folkOnChat(w);
  if(!S.met){S.met=1;neighbourStorySave();}
  if(S.stage==='returning'){neighbourStoryThank(w);return;}
  if(S.stage==='done'){neighbourStoryReaction(w);return;}
  if(S.stage==='carrying'){
    const rev=S.rev;
    neighbourStoryCard({participant:w,text:`«Коробка у тебя. Рузиля встретит у «${S.dest.n}» — она собирает книги для соседского чтения. Не спеши, только потом расскажи, как добрались».`,choices:[
      {t:'Показать маршрут',primary:true,run:()=>neighbourStoryRoute('books')},
      {t:'Вернуть коробку: не получается',run:()=>{if(!neighbourStoryGuard(w,rev,'carrying'))return;S.cancelled=1;delete S.dest;neighbourStoryChange('declined');say(w,'Спасибо, что вернул. Лучше сказать честно. Передумаешь — подходи.',7);}},
      {t:'Ещё донесу',run:()=>{}}]});return;
  }
  if(S.stage!=='offered')neighbourStoryChange('offered');
  const rev=S.rev,dest=neighbourStoryDestination();
  if(!dest){neighbourStoryCard({participant:w,text:'«Хочу передать знакомой книги, но сначала надо уточнить место встречи. Зайди ещё, когда район загрузится».',choices:[{t:'Хорошо',primary:true,run:()=>{}}]});return;}
  neighbourStoryCard({participant:w,text:`«Познакомимся как следует: я Фидания, из твоего двора. Разбирала полку — сказки Тукая и русские сказки. Внуки выросли, а книги хорошие. Рузиля ждёт их у «${dest.n}» для соседского чтения. Передашь коробку? Потом расскажешь, как всё прошло».`,choices:[
    {t:'Обещаю передать',primary:true,run:()=>{if(!neighbourStoryGuard(w,rev,'offered'))return;S.dest=dest;S.promisedDay=clock.day;neighbourStoryChange('carrying');say(w,'Рәхмәт! Коробка лёгкая. Садись хоть на автобус, хоть пешком — как тебе удобно.',7);addEvent('📚 Обещание Фидании: передать книги у «'+dest.n+'». Маршрут — в «Истории соседки».','say');}},
    {t:'Сейчас не возьмусь',run:()=>{if(!neighbourStoryGuard(w,rev,'offered'))return;neighbourStoryChange('declined');say(w,'Ничего, у каждого свои дела. Книги подождут.',6);}},
    {t:'Просто поговорить',run:()=>{if(neighbourStoryGuard(w,rev,'offered'))openChat(w);}}]});
}
function neighbourStoryAtBooks(){const S=neighbourStoryState(),d=S.dest;return S.stage==='carrying'&&d&&scene==='city'&&!player.vehicle&&!player.bus&&!player.inside&&player.state!=='hurt'&&dist(player.x,player.y,d.x,d.y)<4;}
function neighbourStoryDeliver(){
  if(!neighbourStoryAtBooks())return;const S=neighbourStoryState(),rev=S.rev;
  neighbourStoryCard({title:'Коробка дошла',text:'У библиотеки Рузиля узнаёт коробку: «Это от Фидании? Давайте разложим: сказки на татарском сюда, на русском — рядом. Пусть дети сами выбирают». Помочь разложить книги: энергия −6.',choices:[
    {t:'Передать и помочь разложить',primary:true,run:()=>{
      if(S.rev!==rev||!neighbourStoryAtBooks())return;
      if(player.energy<6){setHint('Нужно немного отдохнуть: для помощи требуется 6 энергии. Книги остаются у вас.');return;}
      // Повторная/старая кнопка уже не соответствует этапу. Дорога сама по себе никогда не завершает поручение.
      S.deliveredDay=clock.day;S.stage='returning';S.rev++;player.energy=Math.max(0,player.energy-6);neighbourStorySave();neighbourStoryMark();
      addEvent('📚 Книги переданы Рузиле. Вернитесь к Фидании и расскажите.','say');
      neighbourStoryCard({text:'Рузиля бережно разглаживает старую закладку: «Скажи Фидании, её пометки мы сохраним. В воскресенье почитаем вслух во дворе». Теперь стоит рассказать соседке лично.',choices:[{t:'Найти Фиданию',primary:true,run:()=>neighbourStoryRoute('fidania')},{t:'Вернусь позже',run:()=>{}}]});
    }},{t:'Разложу чуть позже',run:()=>{}}]});
}
function neighbourStoryThank(w){
  const S=neighbourStoryState();if(S.stage!=='returning'||neighbourStoryNear()!==w)return;const rev=S.rev;
  neighbourStoryCard({participant:w,text:'«Дошли? И закладку оставили? Вот и хорошо — там внук рисовал, когда читать учился. Заходи потом на чай. А пока возьми выпечку, я всё равно на весь подъезд напекла».',choices:[
    {t:'Рассказать и принять угощение',primary:true,run:()=>{
      if(!neighbourStoryGuard(w,rev,'returning')||S.rewarded)return;
      S.rewarded=1;S.stage='done';S.rev++;S.completedDay=clock.day;
      player.pantry=(player.pantry||0)+1;sitMood(7);sitRep(1,'сдержали обещание соседке');neighbourStorySave();neighbourStoryMark();
      say(w,'Теперь знаю: на тебя можно положиться. Ещё увидимся во дворе!',7);
      addEvent('📚 История завершена. Угощение дома +1, настроение +7, репутация +1. Фидания запомнила помощь.','say');
    }},{t:'Расскажу чуть позже',run:()=>{}}]});
}
function neighbourStoryReaction(w){
  const S=neighbourStoryState();if(S.stage!=='done'||S.reacted||clock.day<=S.completedDay||neighbourStoryNear()!==w)return;
  S.reacted=1;neighbourStorySave();say(w,'Рузиля звонила: соседская девочка читала Тукая бабушке. Представляешь, наши книги снова вслух читают!',9);
  addEvent('📚 Фидания: книги пригодились соседям. Она помнит, кто их привёз.','say');
}
function neighbourStoryContext(id){
  if(id!=='fidania')return '';const S=neighbourStoryState();if(!S.met)return '';
  if(S.stage==='carrying')return ' Ты лично дала собеседнику коробку сказок для Рузили. Он обещал отвезти её к библиотеке, но пока не передал. Не благодарить за выполненное заранее.';
  if(S.stage==='returning')return ' Собеседник передал твои книги Рузиле, но ещё должен лично рассказать тебе об этом. Угощение ещё не получено.';
  if(S.stage==='done')return ' Собеседник сдержал обещание: отвёз твои книги Рузиле и рассказал тебе. Ты уже поблагодарила выпечкой, теперь считаешь его надёжным соседом.'+(S.reacted?' Ты уже рассказала ему, как соседская девочка читала эти сказки бабушке.':'');
  if(S.stage==='declined')return S.cancelled?' Собеседник честно вернул коробку, не выполнив поручение. Ты не обижаешься; может помочь в другой раз.':' Собеседник отказался отвезти книги. Ты спокойно приняла отказ, можно предложить снова.';
  return ' Вы познакомились. Ты предложила передать знакомой коробку сказок, но собеседник ещё ничего не обещал.';
}
function neighbourStoryAction(){
  if(player.busy||SIT.card)return null;const S=neighbourStoryState();
  if(neighbourStoryAtBooks())return {label:'Передать книги Рузиле у библиотеки',run:neighbourStoryDeliver};
  const w=neighbourStoryNear();if(!w||S.stage==='done')return null;
  return {label:S.stage==='returning'?'Рассказать Фидании о книгах':S.stage==='carrying'?'Фидания: обещание и коробка книг':'Фидания: история соседки',run:()=>neighbourStoryMeet(w)};
}
defSit('neighbourStory',{title:'История соседки',quiet:true,always:true,start(){return true;},action:neighbourStoryAction,actionInside:neighbourStoryAction});
defWatch(dt=>{
  NEIGHBOUR_STORY.tick-=dt;if(NEIGHBOUR_STORY.tick>0)return;NEIGHBOUR_STORY.tick=1;
  neighbourStoryMark();if(player.busy||SIT.card)return;const w=neighbourStoryNear();if(w)neighbourStoryReaction(w);
});
