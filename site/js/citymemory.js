// Город помнит игрока: поступки по игровым дням → вечером «Вечерняя Казань» в ленте и в телефоне,
// на следующий день свои люди здороваются с намёком на вчерашнее, а разговор с ИИ знает, что о нём говорят.
// Тексты — второго программиста: paper.js (cityPaper.templates), gossip.js (cityGossip), weather-lines.js (cityWeatherLines).
// Пока их нет или в них нет нужного kind — короткие запасные тексты ниже. Хранится в PROG.memory (уходит в аккаунт).
// Список kind — задача 50 в docs/SYNC.md: helped carried fed bought tipped books crash hit fined drunk shift cold evicted moved prosecutor newcomer.
const MEM={ready:false,t:0,talk:0,wx:90,lastWx:'',hour:null,day:null};
// игрок уже начал (есть анкета) — до этого память не ведём
function memPlaying(){try{if(localStorage.getItem('zk.profile'))return true;}catch(e){}return !!(player.name&&player.name!=='Гость');}
const MEM_ORDER=['books','helped','thief','wallet','carried','fed','tipped','complaint','prosecutor','moved','shift','bought','rep','fined','crash','hit','drunk','cold','evicted','newcomer'];
const MEM_GOOD=new Set(['books','helped','thief','wallet','carried','fed','tipped','complaint','prosecutor','moved','shift','bought','newcomer']);
// причина из sitRep → поступок
const MEM_REP=[[/донести сумку/,'carried'],[/угостили/,'fed'],[/помогли человеку/,'fed'],[/поддержали музыканта/,'tipped'],[/обещание соседке/,'books'],
  [/прокурора/,'prosecutor'],[/скорую|пострадавш|ДТП/i,'helped'],[/карманника/,'thief'],[/вернули кошел|сдали найденный/,'wallet'],[/жалобу соседей/,'complaint']];
// У игрока нет пола в анкете — тексты без прошедшего времени при {name}: «спасибо, {name}», «отличился {name}» не пишем.
// {street} — в форме после «на»: «на улице Баумана».
const MEM_PAPER={
  helped:['Происшествие на {street}: пострадавшему помогли дождаться скорой. Врачи говорят — вовремя. Спасибо, {name}!','На {street} человеку стало плохо, но рядом нашёлся {name}: скорая приехала к живому разговору, а не к толпе.'],
  carried:['Сумку {who_g} донесли до самого подъезда — спасибо, {name}. Соседи такое запоминают.'],
  fed:['На {street} человека без дома сегодня угостили обедом — спасибо, {name}. Мелочь, а день у кого-то стал лучше.'],
  bought:['Уличная торговля жива: у продавца {who_g} сегодня купили {what}. Покупатель — {name}.'],
  tipped:['На {street} играла музыка {who_g}, и в футляр упала монета. Слушатель — {name}. Песня, говорят, стала громче.'],
  books:['Коробка сказок дошла до «{place}»: соседка Фидания и {name} собрали книги для соседского чтения.'],
  thief:['На {street} карманник не ушёл далеко — спасибо, {name}. Полиция благодарит.'],
  wallet:['Потерянный кошелёк вернулся к владельцу — спасибо, {name}. В Казани так бывает.'],
  complaint:['Жалоба жителей поедет в мэрию: передать её обещано, и обещание — за {name}. Двор ждёт.'],
  prosecutor:['Дело Бирэн абый: в приёмной снова движение. Источник редакции — горожанин {name}.'],
  moved:['Новосёл недели — {name}: новый адрес {address} ({district}). Соседи присматриваются.'],
  shift:['В «{place}» закрыта ещё одна смена ({job}). Новый сотрудник — {name}, начальство довольно.'],
  rep:['Город обсуждает горожанина {name}: «{why}».'],
  fined:['Штрафов за день стало на один больше: {what}, {sum}. Получатель — {name}.'],
  crash:['ДТП на {street}: участник — {name}. Обошлось без тяжёлых последствий, ждали ГИБДД.'],
  hit:['На {street} машина задела пешехода. Пострадавший — {name}, скорая приехала быстро.'],
  drunk:['Вечером на {street} было шумно: прохожим объясняли устройство мира. Говорят, это {name}. Устройство мира не возражало.'],
  cold:['Сезон простуд: под дождём промокли многие, в том числе {name}. Аптеки напоминают про зонты.'],
  evicted:['Квартирный вопрос: спор с хозяйкой закончился переездом. Новое жильё ищет {name}. Гостиницы рядом есть.'],
  newcomer:['В городе новый житель — {name} ({district}). Добро пожаловать в Казань.'],
  quiet:['В городе спокойно: пробки обычные, трамваи по расписанию.','День без происшествий. Даже голуби на Баумана вели себя прилично.','Тихий день: дворники успели больше, чем обещали.']
};
const MEM_GOSSIP={
  helped:['Это вы вчера у аварии остались до скорой?','Говорят, вы человеку на дороге помогли. Правда?','Про вас рассказывали — что не прошли мимо.'],
  carried:['Соседи говорят, вы сумку до подъезда донесли. Спасибо от всех!','Это вы вчера помогли донести сумку?'],
  fed:['Говорят, вы человека угостили. Доброе дело.','Слышал, вы не прошли мимо, когда просили поесть.'],
  bought:['Как вам покупка с лотка? Говорят, вчера у нас брали.','Видела вас у продавца с тележкой. Вкусно было?'],
  tipped:['Музыкант до сих пор вашу монету вспоминает.','Говорят, вы вчера музыканта поддержали.'],
  books:['Фидания всем рассказывает, как вы книги донесли!','Это вы сказки в библиотеку отнесли? Молодец.'],
  thief:['Это вы карманника догнали? Весь двор обсуждает.'],
  wallet:['Говорят, вы кошелёк хозяину вернули. Редкость!'],
  complaint:['Вы же обещали жалобу в мэрию передать? Мы ждём.'],
  prosecutor:['Слышали про Бирэн абый? Говорят, вы там отметились.'],
  moved:['Вы к нам переехали? Будем соседями.','Новосёл! Как квартира?'],
  shift:['Видел вас на работе. Как смена?','Говорят, вы теперь у нас работаете.'],
  rep:['Про вас говорят: «{why}». Правда?'],
  fined:['Штраф получили? Бывает, не расстраивайтесь.','Говорят, вас оштрафовали. Камеры тут злые.'],
  crash:['Вы вчера в аварию попали? Как вы, целы?','Видела вашу машину после ДТП. Обошлось?'],
  hit:['Это вас машина задела? Берегите себя.','Как здоровье после вчерашнего? Слышал про машину.'],
  drunk:['Ну вы вчера и веселились!','Как голова сегодня? Вчера вы были в ударе.'],
  cold:['Вы простыли? Чай с мёдом — первое дело.','Вчера под дождём вас видела. Не заболели?'],
  evicted:['Говорят, вам пришлось съехать. Держитесь.'],
  newcomer:['Вы новенький у нас? Добро пожаловать!','Недавно в городе? Спрашивайте, если что.']
};
function memState(){const S=PROG.memory||(PROG.memory={deeds:[],paper:0,told:{},seq:0,issues:[]});
  if(!Array.isArray(S.deeds))S.deeds=[];if(!S.told||typeof S.told!=='object')S.told={};if(!Array.isArray(S.issues))S.issues=[];if(!(S.seq>=0))S.seq=0;return S;}
function memStreet(){try{return world&&typeof nearestRoadName==='function'?(nearestRoadName(player.x,player.y)||''):'';}catch(e){return '';}}
// «улица Баумана» → «улице Баумана», «Кремлёвская улица» → «Кремлёвской улице», «Ленинский проспект» → «Ленинском проспекте»
const MEM_TYPES={'улица':['улице','f'],'площадь':['площади','f'],'набережная':['набережной','f'],'аллея':['аллее','f'],'дорога':['дороге','f'],
  'проспект':['проспекте','m'],'переулок':['переулке','m'],'бульвар':['бульваре','m'],'проезд':['проезде','m'],'тракт':['тракте','m'],'тупик':['тупике','m'],'спуск':['спуске','m'],'шоссе':['шоссе','n']};
function memOn(street){const w=String(street||'').split(' ');if(!w[0])return '';const i=w.findIndex(x=>MEM_TYPES[x.toLowerCase()]);if(i<0)return street;
  const [loc,g]=MEM_TYPES[w[i].toLowerCase()];w[i]=loc;
  if(i>0)for(let j=0;j<i;j++){const a=w[j];
    if(g==='f')w[j]=a.replace(/ая$/,'ой').replace(/яя$/,'ей');
    else if(g==='m')w[j]=a.replace(/[ыои]й$/,m=>m==='ий'&&/[гкхжшчщ]ий$/.test(a)?'ом':m==='ий'?'ем':'ом');}
  return w.join(' ');}
function memDistrict(){const ds=window.cityDistricts||[];const d=ds.find(x=>x.id===(typeof DIST!=='undefined'&&DIST.cur));return d?d.name:'';}
function memNote(kind,info){
  if(!kind||typeof clock==='undefined'||typeof PROG==='undefined')return null;const S=memState();info=info||{};
  const key=kind+'|'+(info.why||info.who||info.what||'');
  if(S.deeds.some(x=>x.day===clock.day&&x.key===key))return null;   // одно и то же за день — один раз
  const d={id:++S.seq,k:kind,key,day:clock.day,min:Math.round(clock.minutes),street:memStreet()};
  for(const [k,v] of Object.entries(info))if(v!=null&&v!=='')d[k]=typeof v==='string'?v.slice(0,90):v;
  S.deeds.push(d);S.deeds=S.deeds.filter(x=>clock.day-x.day<=10).slice(-40);
  for(const id of Object.keys(S.told)){S.told[id]=(S.told[id]||[]).filter(n=>S.deeds.some(x=>x.id===n));if(!S.told[id].length)delete S.told[id];}
  progSave();return d;}
// Имя своего человека по падежам: {who} — кто (Нина), {who_g} — у кого/для кого (Нины), {who_d} — кому (Нине),
// {who_v} — кого (Нину), {who_t} — с кем (Ниной). Женские имена на согласный (Гульназ, Ляйсан) не склоняются.
function memDecl(name,female,cs){
  if(!name)return ({g:'соседа',d:'соседу',v:'соседа',t:'соседом'})[cs]||'сосед';if(!cs)return name;const n=name;
  if(/ия$/.test(n)){const s=n.slice(0,-1);return ({g:s+'и',d:s+'и',v:s+'ю',t:s+'ей'})[cs];}
  if(/а$/.test(n)){const s=n.slice(0,-1);return ({g:s+(/[гкхжшщч]$/.test(s)?'и':'ы'),d:s+'е',v:s+'у',t:s+(/[жшщчц]$/.test(s)?'ей':'ой')})[cs];}
  if(/я$/.test(n)){const s=n.slice(0,-1);return ({g:s+'и',d:s+'е',v:s+'ю',t:s+'ей'})[cs];}
  if(female)return n;
  if(/[йь]$/.test(n)){const s=n.slice(0,-1);return ({g:s+'я',d:s+'ю',v:s+'я',t:s+'ем'})[cs];}
  if(/[бвгджзклмнпрстфхцчшщ]$/.test(n))return ({g:n+'а',d:n+'у',v:n+'а',t:n+(/[жшщчц]$/.test(n)?'ем':'ом')})[cs];
  return n;}
// просто {who} — только там, где нужен именительный: в начале фразы, после точки, тире, двоеточия, запятой или «и».
// Иначе текст пропускаем (до падежных {who_g}…), чтобы не вышло «сумку Нина донесли».
function memUsable(text){const t=String(text);let i=-1;while((i=t.indexOf('{who}',i+1))>=0){const before=t.slice(0,i);if(!/(^|[.!?:—–,]\s*|\s[иИ]\s+)$/.test(before))return false;}return true;}
function memFill(text,d){const name=(typeof player!=='undefined'&&player.name)||'горожанин';
  return String(text).replace(/\{(\w+)\}/g,(m,k)=>{const wc=/^who_([gdvt])$/.exec(k);const v=k==='name'?name:wc?memDecl(d&&d.who,d&&d.whoF,wc[1]):k==='street'?memOn(d&&d.street):k==='sum'?(d&&d.sum?fmtMoney(d.sum):''):k==='n'?String(2+Math.floor(Math.random()*2)):d&&d[k]!=null?String(d[k]):'';
    return v||({street:'одной из улиц города',who:'сосед',place:'центр города',what:'покупку',job:'работа',address:'новый адрес',district:'Казань',why:'сделали что-то хорошее'})[k]||'';}).replace(/\s+([,.!?])/g,'$1').trim().replace(/^./,c=>c.toUpperCase());}
function memPaperTexts(kind){const T=((window.cityPaper&&window.cityPaper.templates)||[]).filter(t=>t&&t.kind===kind&&t.text&&memUsable(t.text)).map(t=>t.text);return T.length?T:(MEM_PAPER[kind]||[]);}
function memGossipTexts(kind,type){const G=Array.isArray(window.cityGossip)?window.cityGossip:[];
  const own=type?G.filter(g=>g&&g.kind===kind&&g.type===type).flatMap(g=>g.lines||[]).filter(memUsable):[];if(own.length)return own;
  const all=G.filter(g=>g&&g.kind===kind&&!g.type).flatMap(g=>g.lines||[]).filter(memUsable);return all.length?all:(MEM_GOSSIP[kind]||[]);}
const memRank=k=>{const i=MEM_ORDER.indexOf(k);return i<0?99:i;};

// ---------- вечерняя газета ----------
function memCityFiller(){const out=[];const today=typeof mskDate==='function'?mskDate():'';
  const fx=(window.cityFixtures||[]).filter(f=>f.date===today);
  for(const f of fx.slice(0,1)){const T=memPaperTexts(f.kind==='match'?(/Ак Барс/.test(f.title)?'hockey':'match'):'event');
    out.push(T.length?memFill(pick(T),{place:f.title}):`Сегодня в городе: ${f.title}${f.time?' в '+f.time:''}.`);}
  const wk=weather.kind==='rain'?'rain':null;if(wk&&out.length<2){const T=memPaperTexts(wk);if(T.length)out.push(memFill(pick(T),{street:memStreet()}));}
  if(!out.length){const T=memPaperTexts('quiet');out.push(memFill(pick(T.length?T:MEM_PAPER.quiet),{}));}
  return out;}
function memPaperItems(day){const S=memState();const seen=new Set();const items=[];
  const ds=S.deeds.filter(x=>x.day===day).sort((a,b)=>memRank(a.k)-memRank(b.k));
  for(const d of ds){if(items.length>=3)break;if(seen.has(d.k))continue;const T=memPaperTexts(d.k);if(!T.length)continue;seen.add(d.k);items.push(memFill(pick(T),d));}
  if(items.length<2)for(const t of memCityFiller()){if(items.length>=3)break;items.push(t);}
  return items;}
function memPublish(day,late){const S=memState();if(S.paper>=day)return null;S.paper=day;const items=memPaperItems(day);if(!items.length){progSave();return null;}
  S.issues.push({day,items});S.issues=S.issues.slice(-7);progSave();
  const head=late==='вчера'?'📰 Вчерашняя «Вечерняя Казань»':late?'📰 Свежая «Вечерняя Казань» за прошлые дни':'📰 «Вечерняя Казань»';
  for(let i=items.length-1;i>=0;i--)addEvent(`${i?'📰':head+':'} ${items[i]}`,'paper');
  if(window.cityPhone)try{window.cityPhone.push({from:'Вечерняя Казань',text:items.join(' · '),kind:'paper'});}catch(e){}
  return items;}

// ---------- слухи: свои люди помнят вчерашнее ----------
function memFresh(fid){const S=memState();const told=S.told[fid]||[];
  return S.deeds.filter(x=>x.day<clock.day&&clock.day-x.day<=(x.k==='newcomer'?1:2)&&!told.includes(x.id))
    .sort((a,b)=>(b.day-a.day)||(memRank(a.k)-memRank(b.k)));}
function memGossip(f){const S=memState();const d=memFresh(f.id)[0];if(!d)return null;
  const L=memGossipTexts(d.k,f.type);if(!L.length)return null;const line=memFill(L[hashStr(f.id+':'+d.id)%L.length],d);
  (S.told[f.id]=S.told[f.id]||[]).push(d.id);progSave();return {line,d};}
function memSummary(d){const when=clock.day-d.day<=0?'сегодня':clock.day-d.day===1?'вчера':'на днях';
  const T={helped:'помог(ла) пострадавшему дождаться скорой',carried:'донёс(ла) соседке сумку',fed:'угостил(а) человека без дома',bought:'покупал(а) у уличного продавца',tipped:'поддержал(а) уличного музыканта',
    books:'отнёс(ла) книги Фидании в библиотеку',thief:'догнал(а) карманника',wallet:'вернул(а) потерянный кошелёк',complaint:'обещал(а) передать жалобу жителей в мэрию',prosecutor:'разбирался(ась) с прокурором Бирэн абый',
    moved:'переехал(а) в новую квартиру',shift:'отработал(а) смену',fined:'получил(а) штраф',crash:'попал(а) в ДТП за рулём',hit:'попал(а) под машину',drunk:'гулял(а) навеселе',cold:'простыл(а) под дождём',evicted:'съехал(а) после долга за квартиру',newcomer:'недавно в городе'};
  return `${when} ${d.k==='rep'?(d.why||'отличился'):(T[d.k]||d.k)}${d.street&&!/newcomer|cold|evicted|moved|shift/.test(d.k)?' ('+d.street+')':''}`;}
function memContext(){const S=memState();const ds=S.deeds.filter(x=>clock.day-x.day<=2).sort((a,b)=>memRank(a.k)-memRank(b.k)).slice(0,4);
  return ds.length?` Что в городе говорят о собеседнике: ${ds.map(memSummary).join('; ')}. Можешь мимоходом вспомнить, если к слову, но не допрашивай.`:'';}

// ---------- погода в репликах жителей (weather-lines.js) ----------
function memWeatherKind(){if(weather.real&&typeof rwWeatherKey==='function'){const k=rwWeatherKey();if(k==='snow'&&memFirstSnow())return 'firstsnow';return k;}
  const m=(typeof mskDate==='function'?Number(mskDate().slice(5,7)):0)||0;const winter=m===12||m<=2,cold=m===11||m===3;
  if(weather.kind==='rain')return cold||winter?'ice':'rain';if(winter)return weather.kind==='cloudy'?'snow':'frost';if(cold)return weather.kind==='cloudy'?'wind':'frost';
  if(m>=6&&m<=8&&weather.kind==='clear'&&cityHour()>11&&cityHour()<18)return 'heat';return weather.kind==='cloudy'?'wind':null;}
// первый снег за зиму — один раз на устройство и зиму
function memFirstSnow(){const d=typeof mskDate==='function'?mskDate():'';const y=+d.slice(0,4),m=+d.slice(5,7);const winter=String(m>=7?y:y-1);/* зима 2026/27 — «2026» */let seen='';try{seen=localStorage.getItem('zk.firstSnow')||'';}catch(e){}
  if(seen===winter)return false;try{localStorage.setItem('zk.firstSnow',winter);}catch(e){}return true;}
// фразы из weather-lines.js и realworld-lines.js (cityRealLines.weather) вместе; {t} — настоящая температура, без неё такие фразы не берём
function memWeatherLine(){const k=memWeatherKind();if(!k)return null;const W=(window.cityWeatherLines||[]).find(x=>x&&x.when===k);let L=W&&W.lines?W.lines.slice():[];
  const RL=window.cityRealLines&&window.cityRealLines.weather,rk=k==='firstsnow'?'firstSnow':k;if(RL&&Array.isArray(RL[rk]))L=L.concat(RL[rk]);
  const t=weather.t;L=L.filter(x=>!/\{t\}/.test(x)||t!=null).map(x=>x.replace('{t}',typeof rwT==='function'?rwT(t):String(t)));return L.length?pick(L):null;}

// ---------- подключение ----------
function memInit(){MEM.ready=true;
  wrap('sitRep',(r,a)=>{const n=a[0],why=a[1];if(!why)return;const m=MEM_REP.find(([re])=>re.test(why));const fa=typeof sitActive==='function'&&sitActive('folkAct'),who=fa&&fa.w&&fa.w.p?fa.w.p.name:'',whoF=fa&&fa.f&&fa.f.female?1:0;if(m)memNote(m[1],{why,who,whoF});else if(n)memNote('rep',{why,good:n>0?1:0});});
  wrap('playerCrash',()=>memNote('crash'));
  wrap('playerHitByCar',()=>memNote('hit'));
  wrap('prosNoteFine',(r,a)=>{const sum=Math.round(a[0]||0),what=String(a[1]||'штраф');if(sum>0&&!/владельцу/.test(what))memNote('fined',{sum,what:what.replace(/^[^А-Яа-яA-Za-z]+/,'')});});
  wrap('catchCold',()=>memNote('cold'));
  wrap('evictHome',()=>memNote('evicted'));
  wrap('housingMove',(r,a)=>{const f=a[0];if(r&&f)memNote('moved',{address:f.address,district:typeof housingDistrictName==='function'?housingDistrictName(f):''});});
  wrap('shiftEnd',(r,a)=>{const j=a[0];if(j&&j.len&&j.present/(j.len*60)>=0.7)memNote('shift',{job:j.t||'смена',place:j.name||''});});
  wrap('addEvent',(r,a)=>{const m=/^Покупка: (.+) · (.+)$/.exec(String(a[0]||''));if(m){const f=typeof FOLK!=='undefined'&&FOLK.list.find(q=>q.name===m[2]);memNote('bought',{what:m[1],who:m[2],whoF:f&&f.female?1:0});}});
  // контекст для ИИ дописываем к ответу folkContext (wrap не меняет возврат)
  const fc=window.folkContext;if(typeof fc==='function')window.folkContext=function(...a){const r=fc.apply(this,a);return r?r+memContext():r;};
  const S=memState();if(!S.started){S.started=1;const fresh=!PROG.c||!Object.keys(PROG.c).length;if(fresh)memNote('newcomer',{district:memDistrict()});progSave();}}
defWatch(dt=>{if(typeof player==='undefined'||!world||typeof clock==='undefined'||!memPlaying())return;if(!MEM.ready)memInit();
  MEM.t-=dt;MEM.talk-=dt;MEM.wx-=dt;if(MEM.t>0)return;MEM.t=1;const S=memState();
  // пьяным по улице — один раз за день
  if((player.drunk||0)>=45&&scene==='city'&&!player.inside&&!player.vehicle)memNote('drunk');
  // газета: когда при игроке наступает 19:00; пропустили вечер со своими поступками — вчерашний выпуск при входе
  const h=cityHour(),crossed=MEM.day===clock.day&&MEM.hour!==null&&MEM.hour<19&&h>=19;MEM.hour=h;MEM.day=clock.day;
  if(crossed&&S.paper<clock.day)memPublish(clock.day);
  else{const miss=S.deeds.filter(x=>x.day<clock.day&&x.day>S.paper&&clock.day-x.day<=3&&x.k!=='newcomer').reduce((m,x)=>Math.max(m,x.day),0);if(miss)memPublish(miss,clock.day-miss===1?'вчера':'недавно');}
  if(scene!=='city'||player.inside||player.vehicle||player.bus||SIT.card||typeof FOLK==='undefined'||!FOLK.ready)return;
  // слух: свой человек рядом, раз в 45 с, каждый — раз в игровой день
  if(MEM.talk<=0){for(const f of FOLK.list){const w=f.w;if(!w||f.memDay===clock.day||dist(w.x,w.y,player.x,player.y)>6||(typeof folkBusy==='function'&&folkBusy(w)))continue;
      f.memDay=clock.day;const g=memGossip(f);if(!g)continue;faceTo(w,player.x,player.y);say(w,g.line,6);addEvent(`💬 ${f.name}: «${g.line}»`,'say');MEM.talk=45;break;}}
  // погода: прохожий рядом говорит о настоящей погоде, не чаще раза в 2,5 минуты
  if(MEM.wx<=0){MEM.wx=150;const line=memWeatherLine();if(line&&line!==MEM.lastWx){let best=null,bd=14;for(const w of walkers){if(w.bus||w.inside||w.state==='hurt')continue;const d=dist(w.x,w.y,player.x,player.y);if(d<bd){bd=d;best=w;}}
      if(best){MEM.lastWx=line;say(best,line,5);}}}});
window.memPublish=memPublish;window.memNote=memNote;
