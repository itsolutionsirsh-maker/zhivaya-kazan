// ===== Интерьеры: кафе, магазины, офисы, дом =====
let scene='city';let interior=null;const interiorCache=new Map();
const KIND_RU={cafe:'кафе',bar:'бар',shop:'магазин',bank:'банк',office:'офис',theatre:'театр',museum:'музей',hotel:'гостиница',pharmacy:'аптека',hospital:'клиника',university:'университет',library:'библиотека',worship:'храм',police:'отдел полиции',prosecutor:'приёмная прокурора',metro:'метро',market:'рынок',school:'школа',home:'ваш дом',default:'помещение'};
function makeInterior(kind,name,key,room){
  const rng=seeded(hashStr(room||key));const R=(a,b)=>a+rng()*(b-a);
  const sizes={cafe:[16,11],bar:[14,10],shop:[15,10],bank:[14,9],office:[18,12],theatre:[20,14],museum:[18,12],hotel:[14,10],pharmacy:[11,8],hospital:[14,10],university:[16,11],library:[16,11],worship:[16,12],police:[12,9],prosecutor:[13,9],metro:[22,10],market:[18,12],school:[16,11],home:[11,8],default:[12,9]};
  const [w,h]=sizes[kind]||sizes.default;
  const it={kind,name,key,w,h,furn:[],npcs:[],door:{x:w/2,y:h},floor:'wood'};
  const F=(t,x,y,fw,fh,extra)=>{const f=Object.assign({t,x,y,w:fw,h:fh},extra||{});it.furn.push(f);return f;};
  const NPC=(x,y,o)=>{const p=makePersona((o&&o.role)||'resident');if(o&&o.job)p.job=o.job;const n=Object.assign({p,x,y,hx:0,hy:1,seated:false,phase:rng()*6,role:'resident',isInterior:true,state:'idle',memory:p.memory},o||{});it.npcs.push(n);return n;};
  const plant=(x,y)=>F('plant',x,y,0.8,0.8);
  if(kind==='hospital'&&key==='story:ward'){
    it.floor='tiles';it.spawn={x:3,y:3,hx:0,hy:-1};
    for(const [x,y] of [[3,3],[10.8,3],[10.8,6.1]]){
      F('bed',x,y,2.6,1.4,{walkable:x===3});
      F('wardCabinet',x-1.55,y-1,.65,.65);
    }
    F('drip',4.5,2.2,.45,.5);F('window',7,.15,4,.3);
    const doctor=NPC(5.5,h-1.3,{role:'staff',job:'врач'});doctor.p.clothes='#E9F1E7';doctor.p.pants='#557D76';doctor.hx=0;doctor.hy=-1;
    return it;
  }
  const chairsAround=(x,y)=>{[[x,y-1.05],[x,y+1.05],[x-1.05,y],[x+1.05,y]].forEach(s=>F('chair',s[0],s[1],0.5,0.5,{ang:Math.atan2(y-s[1],x-s[0])}));};
  switch(kind){
    case 'cafe':case 'bar':{it.floor=kind==='bar'?'dark':'wood';F('counter',w/2,1.1,w-2,1.3,{spot:'counter'});F('board',w/2,0.25,4,0.4);F('machine',w/2+3,0.9,0.9,0.6);NPC(w/2-1,0.55,{role:'staff',job:kind==='bar'?'бармен':'бариста'});
      const cols=Math.floor((w-2)/3.2),rows=Math.floor((h-4.6)/3);for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const x=1.6+c*3.2+1.3,y=3.6+r*3+1;const tb=F('table',x,y,1.2,1.2,{spot:'table',round:true,taken:false});chairsAround(x,y);
        if(rng()<0.5){tb.taken=true;const n1=NPC(x-1.05,y,{seated:true});n1.hx=1;n1.hy=0;if(rng()<0.6){const n2=NPC(x+1.05,y,{seated:true});n2.hx=-1;n2.hy=0;}}}
      plant(0.8,h-0.9);plant(w-0.8,h-0.9);if(kind==='cafe')F('window',3,0.15,3,0.3);break;}
    case 'shop':case 'pharmacy':case 'market':{it.floor='tiles';const n=Math.floor((w-3.5)/2.6);for(let i=0;i<n;i++)F('shelf',2.2+i*2.6,1.4+(h-5)/2,0.9,h-5,{spot:'shelf',goods:i%3});F('counter',w-3.2,h-2.4,3.2,1,{spot:'cash'});NPC(w-3.2,h-3.1,{role:'staff',job:kind==='pharmacy'?'фармацевт':'продавец'});
      for(let i=0;i<2+Math.floor(rng()*2);i++)NPC(1.2+rng()*(w-2.4),2.5+rng()*(h-6),{wander:true});break;}
    case 'bank':{it.floor='marble';const cw=(w-3)/3;for(let i=0;i<3;i++){F('counter',1.5+i*cw+cw/2,1.1,cw-0.6,1.1,{spot:'counter'});NPC(1.5+i*cw+cw/2,0.5,{role:'staff',job:'операционист'});}
      for(let i=0;i<6;i++)F('chair',2.5+i*1.1,h-2.2,0.5,0.5,{ang:-Math.PI/2});F('atm',w-1.5,h-1.8,0.8,0.6,{spot:'atm'});NPC(1.2,h-1.4,{role:'guard',job:'охранник'});const q=NPC(3.6,h-2.2,{seated:true});q.hy=-1;break;}
    case 'office':{it.floor='carpet';const cols=Math.floor((w-2)/3),rows=Math.floor((h-3.2)/2.6);for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const x=1.5+c*3+1.1,y=1.6+r*2.6+0.5;const free=rng()<0.3;F('desk',x,y,1.6,0.8,{spot:free?'desk':null});F('chair',x,y+0.95,0.5,0.5,{ang:-Math.PI/2});if(!free){const n=NPC(x,y+0.95,{seated:true,job:pick(['менеджер','бухгалтер','аналитик','HR'])});n.hx=0;n.hy=-1;}}
      plant(w-0.9,0.9);F('printer',0.9,0.9,0.8,0.6);F('window',w/2,0.15,4,0.3);break;}
    case 'theatre':{it.floor='dark';F('stage',w/2,2.3,w-2,3,{});const per=Math.floor((w-3)/0.9);for(let r=0;r<5;r++)for(let i=0;i<per;i++){const x=1.9+i*0.9,y=5.2+r*1.3;F('seat',x,y,0.7,0.7,{spot:'seat',row:r});if(rng()<0.55){const n=NPC(x,y,{seated:true});n.hx=0;n.hy=-1;}}break;}
    case 'museum':{it.floor='marble';for(let i=0;i<6;i++)F('painting',1.6+i*(w-3.2)/5,0.35,1.6,0.4,{spot:'exhibit',c:i});for(let i=0;i<4;i++)F('pedestal',3+i*(w-6)/3,h/2,1,1,{spot:'exhibit',c:i+6});NPC(w-1.2,h-1.4,{role:'guard',job:'смотритель'});for(let i=0;i<3;i++)NPC(2+rng()*(w-4),2.5+rng()*(h-5),{wander:true});break;}
    case 'hotel':{it.floor='carpet';F('counter',w/2,1.1,6,1.2,{spot:'reception'});NPC(w/2,0.5,{role:'staff',job:'администратор'});F('sofa',3,h/2,3,1.2,{spot:'sofa'});F('sofa',w-3,h/2,3,1.2,{spot:'sofa'});plant(0.9,0.9);plant(w-0.9,0.9);const g=NPC(3,h/2,{seated:true});g.hy=-1;break;}
    case 'hospital':{it.floor='tiles';F('counter',w/2,1.1,6,1.1,{spot:'reception'});NPC(w/2,0.5,{role:'staff',job:'врач'});for(let i=0;i<6;i++)F('chair',2.2+i*1.2,h-2.2,0.5,0.5,{ang:-Math.PI/2});const q=NPC(3.4,h-2.2,{seated:true});q.hy=-1;F('bed',w-2.5,3.4,2.2,1.2,{});F('bed',w-2.5,5.4,2.2,1.2,{});break;}
    case 'university':case 'school':case 'library':{it.floor='wood';if(kind==='library'){for(let i=0;i<Math.floor((w-2)/2.2);i++)F('shelf',1.8+i*2.2,1.1,1.6,0.7,{spot:'books',goods:1,horiz:true});}else{F('board',w/2,0.25,5,0.4);F('desk',w/2,1.8,2,0.8,{});NPC(w/2,1.1,{role:'staff',job:kind==='school'?'учитель':'преподаватель'});}
      const cols=Math.floor((w-2)/2.6),rows=Math.floor((h-4)/1.8);for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const x=1.5+c*2.6+1.1,y=3.4+r*1.8;F('desk',x,y,1.8,0.7,{spot:'study'});F('chair',x-0.45,y+0.75,0.5,0.5,{ang:-Math.PI/2});F('chair',x+0.45,y+0.75,0.5,0.5,{ang:-Math.PI/2});if(rng()<0.45){const n=NPC(x-0.45,y+0.75,{seated:true,job:'студент'});n.hy=-1;n.hx=0;}}break;}
    case 'worship':{it.floor='rug';for(let r=0;r<5;r++)F('pew',w/2,3.2+r*1.8,w-4,0.6,{spot:'pew'});F('altar',w/2,1.1,3,1.2,{});const a=NPC(3.5,6.2,{seated:true});a.hy=-1;const b=NPC(w-3.5,8,{seated:true});b.hy=-1;break;}
    case 'police':{it.floor='tiles';F('desk',w/2,1.8,3,1,{spot:'duty'});NPC(w/2,1.05,{role:'police',job:'дежурный'});for(let i=0;i<4;i++)F('chair',1.6+i*1,h-2,0.5,0.5,{ang:-Math.PI/2});F('board',1.8,0.25,3,0.4);const q=NPC(2.6,h-2,{seated:true});q.hy=-1;break;}
    case 'prosecutor':{it.floor='carpet';F('window',w/2,0.15,4,0.3);F('desk',w/2,1.95,3.6,1.1,{});F('box',w/2+1.15,1.8,0.6,0.42,{});F('board',1.6,0.25,2.2,0.4);plant(0.9,h-0.9);plant(w-0.9,0.9);   // прокурор за столом — prosSeat (prosecutor.js)
      F('desk',2.1,4.3,1.6,0.8,{});const a=NPC(2.1,5.2,{role:'staff',seated:true,job:'помощник прокурора'});a.hy=-1;for(let i=0;i<4;i++)F('chair',w/2-1.5+i*1.1,h-2.1,0.5,0.5,{ang:-Math.PI/2});const q=NPC(w/2-1.5,h-2.1,{seated:true});q.hy=-1;break;}
    case 'home':{it.floor='wood';F('bed',2.3,1.9,2.4,1.7,{spot:'bed'});F('wardrobe',5.2,0.7,1.8,0.7,{spot:'wardrobe'});F('kitchen',w-2.6,0.8,4.4,0.9,{spot:'kitchen'});F('fridge',w-0.7,2.3,0.8,0.9,{});F('table',w-3,3.8,1.2,1.2,{spot:'table',round:true});F('chair',w-3,2.8,0.5,0.5,{ang:Math.PI/2});F('chair',w-3,4.8,0.5,0.5,{ang:-Math.PI/2});
      F('rug',3.2,h-2.6,3.6,2.2,{});F('sofa',3.2,h-1.9,2.8,1.1,{spot:'sofa'});F('tv',3.2,h-3.7,1.8,0.3,{});F('desk',w-2.4,h-1.6,1.8,0.8,{spot:'pc'});F('chair',w-2.4,h-2.5,0.5,0.5,{ang:Math.PI/2});plant(0.8,h-0.8);F('window',2.5,0.15,2.5,0.3);break;}
    case 'metro':{it.floor='granite';F('rails',w/2,1.2,w,2.4,{});F('edge',w/2,2.62,w-0.6,0.25,{spot:'train'});
      for(let i=0;i<4;i++){const x=2.8+i*(w-5.6)/3;F('pillar',x,5.4,0.9,0.9,{});}F('scheme',w-2.2,h-0.5,3,0.35,{spot:'scheme'});F('scheme',2.2,h-0.5,3,0.35,{spot:'scheme'});
      NPC(w/2+2.4,h-1.4,{role:'staff',job:'дежурная по станции'});for(let i=0;i<9;i++)NPC(1.5+rng()*(w-3),3.4+rng()*(h-5),{wander:true});break;}
    default:{it.floor='tiles';F('counter',w/2,1.1,5,1.1,{spot:'counter'});NPC(w/2,0.5,{role:'staff',job:'администратор'});for(let i=0;i<4;i++)F('chair',2.2+i*1.2,h-2.2,0.5,0.5,{ang:-Math.PI/2});NPC(3+rng()*(w-6),3+rng()*(h-6),{wander:true});}
  }
  return it;}
function enterInterior(src){insideShot(src);const key=src.key,room=sharedVenueKey(src),cacheKey=room||key;let it=interiorCache.get(cacheKey);if(!it){it=makeInterior(src.kind,src.name,key,room);interiorCache.set(cacheKey,it);}it.room=room;refreshCrowd(it);folkInterior(it);homeItemsSync(it);
  interior=it;scene='interior';player.inside=true;companionEnter(it);sitOnEnter(it);it.ret={x:player.x,y:player.y,hx:player.hx,hy:player.hy};player.ix=it.spawn?it.spawn.x:it.w/2;player.iy=it.spawn?it.spawn.y:it.h-1.1;player.ihx=it.spawn?it.spawn.hx:0;player.ihy=it.spawn?it.spawn.hy:-1;player.iwp=null;player.waypoints=null;player.talkTarget=null;sharedTransition();
  addEvent(`Вы зашли в ${qName(src.name)}`);if(!flags.enteredOnce){flags.enteredOnce=true;setHint('Внутри: подойдите к столику, стойке или человеку и нажмите E. Выход — внизу');}}
function exitInterior(){const it=interior;if(!it)return;for(const f of it.furn){f.comp=null;f.ordered=null;}it.npcs=it.npcs.filter(n=>!n.companionOf);if(orderCtx)closeOrder();scene='city';interior=null;player.inside=false;player.x=it.ret.x;player.y=it.ret.y;cam.x=player.x;cam.y=player.y;player.iwp=null;sharedTransition();}
function blockedInside(x,y,r){const it=interior;
  if(x<0.35+r||x>it.w-0.35-r||y<0.35+r){return true;}
  if(y>it.h-0.35-r){if(Math.abs(x-it.door.x)<0.85)return y>it.h+0.8;return true;}
  for(const f of it.furn){if(f.walkable||f.t==='rug'||f.t==='painting'||f.t==='board'||f.t==='scheme'||f.t==='tv'||f.t==='chair'||f.t==='window'||f.t==='seat'||f.t==='pew')continue;const hw=f.w/2+r,hh=f.h/2+r;if(Math.abs(x-f.x)<hw&&Math.abs(y-f.y)<hh)return true;}return false;}
function moveInside(dx,dy){const r=0.3;let ok=false;if(!blockedInside(player.ix+dx,player.iy+dy,r)){player.ix+=dx;player.iy+=dy;ok=true;}else if(!blockedInside(player.ix+dx,player.iy,r)){player.ix+=dx;ok=true;}else if(!blockedInside(player.ix,player.iy+dy,r)){player.iy+=dy;ok=true;}
  if(player.iy>interior.h+0.4){exitInterior();return false;}return ok;}
function updateInterior(dt){const it=interior;let mx=0,my=0;if(!player.busy){if(keys.w||keys['ц']||keys.ArrowUp)my-=1;if(keys.s||keys['ы']||keys.ArrowDown)my+=1;if(keys.a||keys['ф']||keys.ArrowLeft)mx-=1;if(keys.d||keys['в']||keys.ArrowRight)mx+=1;mx+=joyVec[0];my+=joyVec[1];}
  const m=Math.hypot(mx,my);
  if(m>0.05){player.iwp=null;mx/=m;my/=m;let dk=1;[mx,my,dk]=drunkSway(mx,my);const sp=3.6*dt*Math.min(1,m)*dk;moveInside(mx*sp,my*sp);if(interior!==it)return;player.ihx=mx;player.ihy=my;player.phase+=dt*7;}
  else if(player.iwp){const w=player.iwp;const d=dist(w[0],w[1],player.ix,player.iy);if(d<0.15)player.iwp=null;else{const dx=(w[0]-player.ix)/d,dy=(w[1]-player.iy)/d;const st=Math.min(3.6*dt,d);if(!moveInside(dx*st,dy*st))player.iwp=null;if(interior!==it)return;player.ihx=dx;player.ihy=dy;player.phase+=dt*7;}}
  for(const n of it.npcs){if(!n.wander||n===chatNpc)continue;n.t=(n.t||0)-dt;if(n.t<=0){n.t=rnd(3,9);n.tx=clamp(n.x+rnd(-3,3),1,it.w-1);n.ty=clamp(n.y+rnd(-3,3),2.2,it.h-1.4);}
    const d=dist(n.tx,n.ty,n.x,n.y);if(d>0.1){const dx=(n.tx-n.x)/d,dy=(n.ty-n.y)/d;const st=Math.min(0.8*dt,d);const nx=n.x+dx*st,ny=n.y+dy*st;if(!blockedInside(nx,ny,0.3)){n.x=nx;n.y=ny;n.hx=dx;n.hy=dy;n.phase+=dt*5;}else n.t=0;}}}
function findActionInterior(){{const sa=sitActionInterior();if(sa)return sa;}const it=interior;const px=player.ix,py=player.iy;let best=null,bd=1e9;
  const pa=sharedPeerAction();if(pa)return pa;
  if(it.kind==='metro'&&py<3.8&&typeof metroTrainAction==='function'){const ma=metroTrainAction();if(ma)return ma;}   // у края платформы — поезд важнее разговора
  for(const n of it.npcs){if(n.companionOf&&n.tableF&&!n.tableF.ordered)continue;const d=dist(n.x,n.y,px,py);if(d<1.6&&d<bd){bd=d;best=actTarget({label:`Поговорить: ${n.p.name}${n.companionOf?'':', '+n.p.job}`,run:()=>openChat(n)},n,'person');}}
  if(best)return best;
  for(const f of it.furn){if(!f.spot)continue;const d=Math.max(Math.abs(px-f.x)-f.w/2,Math.abs(py-f.y)-f.h/2);if(d<1.0&&d<bd){const a=spotAction(f,it);if(a){bd=d;best=actTarget(a,f,'spot');}}}
  if(best)return best;
  if(dist(px,py,it.door.x,it.door.y)<1.8)return {label:'Выйти на улицу',run:exitInterior};
  return null;}
function spotAction(f,it){const n=it.name;if(f.spot==='train')return metroTrainAction();if(f.spot==='scheme')return {label:'Схема линии метро',run:metroScheme};const price=it.kind==='bar'?500:350;
  switch(f.spot){
    case 'table':if(it.kind==='home')return {label:player.pantry>0?'Поесть (есть продукты)':'Поесть — продуктов нет, нужно купить',run:()=>{if(player.pantry>0){player.pantry--;player.food=clamp(player.food+35,0,100);spendTime(25);addEvent('Перекусили дома. Сытость +35');}else setHint('Холодильник пуст. Продукты — в магазине');}};
      if(f.comp&&!f.ordered)return {label:`Сесть за столик (там ${f.comp.p.name}) и заказать`,run:()=>openOrder(f,it)};
      if(f.comp&&f.ordered)return {label:`Поговорить за столиком: ${f.comp.p.name}`,run:()=>openChat(f.comp)};
      if(f.taken){return {label:'Столик занят — подсесть и поболтать',run:()=>{const nb=it.npcs.find(q=>dist(q.x,q.y,f.x,f.y)<1.3);if(nb)openChat(nb);}};}
      if(MENU[it.kind])return {label:'Сесть и заказать — меню',run:()=>openOrder(f,it)};
      return {label:`Сесть и заказать · ${price} ₽`,run:()=>spend(price,()=>{player.food=clamp(player.food+45,0,100);player.mood=clamp(player.mood+8,0,100);spendTime(35);addEvent(`Вы поели в «${n}». Сытость +45, настроение +8`);})};
    case 'counter':if(it.kind==='bank')return {label:'Окно банка: вклад, кредит, страховка',run:()=>openBank('bank')};if(/cafe|bar/.test(it.kind))return {label:'Взять кофе с собой · 180 ₽',run:()=>spend(180,()=>{player.energy=clamp(player.energy+12,0,100);player.mood=clamp(player.mood+3,0,100);setHint('Кофе с собой. Энергия +12');})};
      if(it.kind==='bank')return {label:'Снять наличные',run:()=>setHint('Выдали наличные. Баланс тот же')};return {label:'Спросить у администратора',run:()=>setHint('«Чем могу помочь?» — пока ничем')};
    case 'cash':return {label:'Спросить кассира',run:()=>setHint('«Берите с полок, оплата сразу»')};
    case 'shelf':{const cost=it.kind==='pharmacy'?250:it.kind==='market'?300:220;const lbl=it.kind==='pharmacy'?'Купить витамины':it.kind==='market'?'Купить чак-чак и фрукты':'Взять продукты';
      return {label:`${lbl} · ${cost} ₽`,run:()=>spend(cost,()=>{if(it.kind==='pharmacy'){player.energy=clamp(player.energy+10,0,100);addEvent('Витамины. Энергия +10');}else{player.food=clamp(player.food+20,0,100);player.pantry=(player.pantry||0)+1;addEvent(`Купили продукты в «${n}». Сытость +20, запас дома +1`);}})};}
    case 'atm':return {label:'Банкомат: карта и вклад',run:()=>openBank('atm')};
    case 'desk':return {label:'Поработать 2 часа · +1 200 ₽',run:()=>{if(player.energy<15){setHint('Слишком устали');return;}if(!busyFor('desk',120))return;player.money+=1200;player.energy=clamp(player.energy-22,0,100);player.food=clamp(player.food-12,0,100);addEvent(`Отработали 2 часа в «${n}»: +1 200 ₽`);}};
    case 'seat':return {label:'Смотреть спектакль · 1 200 ₽',run:()=>spend(1200,()=>{spendTime(150);player.mood=clamp(player.mood+30,0,100);addEvent(`Спектакль в «${n}» — зал аплодировал стоя. Настроение +30`);})};
    case 'exhibit':return {label:'Рассмотреть экспонат',run:()=>{if(!f.seen){f.seen=true;player.mood=clamp(player.mood+3,0,100);spendTime(8);setHint('Интересно. Настроение +3');}else setHint('Вы это уже видели');}};
    case 'reception':if(it.kind==='hotel')return {label:'Снять номер на ночь · 3 500 ₽',run:()=>{if(!canSleep()){sleep(8);return;}spend(3500,()=>sleep(8));}};if(it.kind==='hospital')return {label:'Пройти осмотр · 800 ₽',run:()=>spend(800,()=>{player.energy=100;addEvent('Осмотр пройден, энергия восстановлена');})};return null;
    case 'sofa':return {label:it.kind==='home'?'Посмотреть телевизор (1 ч)':'Посидеть на диване',run:()=>{const home=it.kind==='home';spendTime(home?60:15);player.mood=clamp(player.mood+(home?8:3),0,100);setHint('Настроение +'+(home?8:3));}};
    case 'study':return {label:it.kind==='library'?'Почитать час':'Послушать лекцию (1,5 ч)',run:()=>{spendTime(it.kind==='library'?60:90);player.mood=clamp(player.mood+4,0,100);player.energy=clamp(player.energy-6,0,100);setHint('Настроение +4');}};
    case 'books':return {label:'Полистать книги',run:()=>{spendTime(20);player.mood=clamp(player.mood+3,0,100);setHint('Настроение +3');}};
    case 'pew':return {label:'Посидеть в тишине',run:()=>{spendTime(20);player.mood=clamp(player.mood+6,0,100);setHint('Тишина и покой. Настроение +6');}};
    case 'duty':return {label:'Спросить о происшествиях',run:()=>setHint(accidents.length?`Дежурный: «Сейчас на выезде — ${accidents[0].kind==='ped'?'сбили пешехода':'ДТП'}${accidents[0].road?', '+accidents[0].road:''}»`:'Дежурный: «В городе спокойно»')};
    case 'bed':return {label:'Лечь спать до утра',run:()=>trySleep(8)};
    case 'wardrobe':return {label:'Переодеться / сменить фото',run:()=>showProfile()};
    case 'kitchen':if(player.noWater===clock.day)return {label:'Воды нет — мастер из УК придёт завтра',run:()=>setHint('Можно поесть в кафе или заказать доставку')};return {label:player.pantry>0?'Приготовить ужин (продукты есть)':'Приготовить ужин · 150 ₽ (доставка)',run:()=>{const fn=()=>{player.food=clamp(player.food+40,0,100);player.mood=clamp(player.mood+4,0,100);spendTime(40);addEvent('Приготовили ужин. Сытость +40');};if(player.pantry>0){player.pantry--;fn();}else spend(150,fn);}};
    case 'pc':return {label:'Поработать удалённо 3 ч · +2 000 ₽',run:()=>{if(player.energy<20){setHint('Слишком устали для работы');return;}if(!busyFor('pc',180))return;player.money+=2000;player.energy=clamp(player.energy-25,0,100);player.food=clamp(player.food-15,0,100);addEvent('Три часа удалёнки: +2 000 ₽');}};
    default:return null;}}

// ---------- отрисовка интерьера ----------
const FLOORS={granite:['#A39E94','#98938A'],wood:['#C9A77A','#BE9A6C'],dark:['#4A3B33','#43352E'],tiles:['#DDD9D0','#D3CFC6'],marble:['#E7E3DC','#DDD8CF'],carpet:['#8C9AA6','#86939F'],rug:['#A8433B','#9A3C35']};
// Только оформление. Восемь векторных узоров, без растров размером с комнату.
const interiorFloorPaths=new Map();
const ROOM_FINISH={
  warm:{wall:'#E2CFB1',trim:'#647C65',counter:'#657760',top:'#E0CEAC'},
  home:{wall:'#E6D9C5',trim:'#8B6851',counter:'#B69A76',top:'#E6DCC9'},
  public:{wall:'#D9E1DB',trim:'#527B78',counter:'#577E7B',top:'#D6E3DB'},
  night:{wall:'#A79480',trim:'#72594D',counter:'#68483F',top:'#AD8B66'},
  neutral:{wall:'#DDD7CA',trim:'#667B84',counter:'#667B84',top:'#D4D9D5'}
};
function interiorFinish(kind,name=''){
  if(typeof venueLook==='function')return venueLook({kind,name});
  if(kind==='home')return ROOM_FINISH.home;
  if(kind==='cafe'||kind==='library'||kind==='hotel')return ROOM_FINISH.warm;
  if(kind==='bar'||kind==='theatre')return ROOM_FINISH.night;
  if(kind==='metro'||kind==='bank'||kind==='hospital'||kind==='pharmacy')return ROOM_FINISH.public;
  return ROOM_FINISH.neutral;
}
function interiorFloorPath(it){
  const key=it.floor+':'+it.w+':'+it.h;let p=interiorFloorPaths.get(key);if(p)return p;
  p=new Path2D();
  if(it.floor==='wood'||it.floor==='dark'){
    for(let row=0;row*0.4<it.h;row++){const y=row*.4;p.rect(0,y,it.w,.035);for(let x=row%3*.7;x<it.w;x+=2.1)p.rect(x,y,.035,.4);}
  }else if(it.floor==='tiles'||it.floor==='marble'){
    for(let y=0;y<it.h;y++)for(let x=y%2?1:0;x<it.w;x+=2)p.rect(x,y,1,1);
  }else{for(let y=0;y<it.h;y+=.6)p.rect(0,y,it.w,.05);}
  if(interiorFloorPaths.size>=8)interiorFloorPaths.delete(interiorFloorPaths.keys().next().value);
  interiorFloorPaths.set(key,p);return p;
}
function drawInteriorFloor(it,night){
  const finish=interiorFinish(it.kind,it.name),fl=finish.floor||FLOORS[it.floor]||FLOORS.wood;
  ctx.fillStyle=fl[0];ctx.fillRect(0,0,it.w,it.h);
  ctx.save();ctx.beginPath();ctx.rect(0,0,it.w,it.h);ctx.clip();
  ctx.fillStyle=fl[1];ctx.fill(interiorFloorPath(it));
  // Цветная кромка и тень от стен под мебелью, без изменения проходимости.
  ctx.strokeStyle=finish.trim;ctx.lineWidth=.09;ctx.strokeRect(.28,.28,it.w-.56,it.h-.56);
  ctx.fillStyle='rgba(42,37,31,.12)';ctx.fillRect(0,0,it.w,.45);ctx.fillRect(0,.45,.22,it.h-.45);
  // Только существующие окна. Не больше четырёх пятен даже в будущих больших комнатах.
  ctx.fillStyle=`rgba(255,244,203,${.23*(1-night)})`;ctx.beginPath();let count=0;
  for(const f of it.furn){if(f.t!=='window')continue;if(count++>=4)break;
    const x=f.x-f.w/2,y=f.y+f.h/2,d=Math.min(3.6,it.h*.4),shift=.75;
    for(let pane=0;pane<2;pane++){const a=x+pane*f.w/2+.08,b=x+(pane+1)*f.w/2-.08;
      ctx.moveTo(a,y);ctx.lineTo(b,y);ctx.lineTo(b+shift,y+d);ctx.lineTo(a+shift,y+d);}}
  ctx.fill();
  if(night>.02){if(!lampSprite)makeLightSprites();ctx.globalAlpha=.25+.3*night;
    const size=Math.min(it.w,it.h)*1.1;ctx.drawImage(lampSprite,it.w/2-size/2,it.h*.55-size/2,size,size);
    ctx.globalAlpha=1;}
  ctx.restore();
}
function interiorView(it,width,height){
  if(venueHospitality(it)){
    // Видна вся комната вместе с поднятой стеной и выходом, включая телефон боком.
    const top=116,bottom=width>height?98:height<720?276:176,pad=venueLayerTop(it),available=Math.max(40,height-top-bottom);
    const iz=Math.max(2,Math.min((width-40)/(it.w+1),available/(it.h+pad+.9),46));
    return {iz,ox:(width-it.w*iz)/2,oy:top+pad*iz+Math.max(0,(available-(it.h+pad+.9)*iz)/2)};
  }
  const iz=Math.max(16,Math.min((width-40)/(it.w+1),(height-250)/(it.h+1.5),46));
  return {iz,ox:(width-it.w*iz)/2,oy:Math.max(124,(height-it.h*iz)/2-10)};
}
function renderInterior(){const it=interior;LOD=2;ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle='#10161A';ctx.fillRect(0,0,W,H);
  const {iz,ox,oy}=interiorView(it,W,H);it.iz=iz;it.ox=ox;it.oy=oy;
  ctx.setTransform(DPR*iz,0,0,DPR*iz,DPR*ox,DPR*oy);
  // пол
  const finish=interiorFinish(it.kind,it.name),fl=finish.floor||FLOORS[it.floor]||FLOORS.wood,night=nightAmount();drawInteriorFloor(it,night);
  // мебель
  const t=performance.now()/1000;
  const furnished=drawVenueLayer(it,iz,night);
  for(const f of it.furn)if(!furnished||f.own||(!VENUE_FURNITURE.has(f.t)&&!(venueHospitality(it)&&f.t==='window')))drawFurniture(f,it,t);
  if(it.kind==='metro'&&typeof drawMetroTrain==='function')drawMetroTrain(it,t);
  // стены
  ctx.strokeStyle=finish.trim;ctx.lineWidth=.4;ctx.strokeRect(0,0,it.w,it.h);
  ctx.fillStyle=finish.wall;ctx.fillRect(-.2,-.38,it.w+.4,.28);ctx.fillRect(-.2,-.1,.16,it.h+.3);ctx.fillRect(it.w+.04,-.1,.16,it.h+.3);
  ctx.fillStyle='rgba(255,248,224,.6)';ctx.fillRect(-.2,-.4,it.w+.4,.06);
  // дверь
  ctx.fillStyle=fl[0];ctx.fillRect(it.door.x-0.85,it.h-0.25,1.7,0.5);ctx.fillStyle='#6B5A4C';ctx.fillRect(it.door.x-0.85,it.h+0.2,1.7,0.08);ctx.fillStyle='rgba(255,255,255,.6)';ctx.font='0.4px "IBM Plex Sans",system-ui';ctx.textAlign='center';ctx.fillText('выход',it.door.x,it.h+0.65);
  // люди
  for(const n of it.npcs)drawPerson(n.x,n.y,n.hx,n.hy,n.p,n.phase,{scale:0.55,seated:n.seated});
  drawSharedPeople();
  drawPerson(player.ix,player.iy,player.ihx,player.ihy,myLook(),player.phase,{scale:0.55,ring:true,lying:it.key==='story:ward'&&it.spawn&&dist(player.ix,player.iy,it.spawn.x,it.spawn.y)<.55});
  if(player.iwp){ctx.strokeStyle='rgba(43,176,98,.9)';ctx.lineWidth=0.06;ctx.beginPath();ctx.arc(player.iwp[0],player.iwp[1],0.35+Math.sin(t*6)*0.06,0,TAU);ctx.stroke();}
  // подпись
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.textAlign='left';ctx.textBaseline='middle';ctx.font='700 15px "Unbounded",sans-serif';ctx.fillStyle='#EEF3EE';
  {const left=Math.max(12,ox),space=W-left-12;let title=String(it.name||'');while(title.length>1&&ctx.measureText(title).width>space)title=title.slice(0,-2)+'…';ctx.fillText(title,left,oy+it.h*iz+34);
    const nw=ctx.measureText(title).width,kr=it.kind==='worship'&&venueStyleId(it)==='mosque'?'мечеть':KIND_RU[it.kind]||KIND_RU.default;ctx.font='500 12px "IBM Plex Sans",system-ui';ctx.fillStyle='#9BB1A4';if(kr.toLowerCase()!==String(it.name).toLowerCase()){const inline=nw+12+ctx.measureText(kr).width<=space;ctx.fillText(kr,inline?left+nw+12:left,oy+it.h*iz+(inline?35:53));}}
  const [sx,sy]=[ox+player.ix*iz,oy+player.iy*iz];drawSitInterior(it);labelPlayer(sx,sy-iz*0.55,player.name,true,player.avatarImg,myLook().frame);drawSharedLabels(it);drawInteriorBubbles(it);if(it.kind==='metro'&&typeof drawMetroOverlay==='function')drawMetroOverlay(it);}
function drawFurniture(f,it,t){const x=f.x-f.w/2,y=f.y-f.h/2;
  if(f.t==='rails'){ctx.fillStyle='#2B2A28';ctx.fillRect(x,y,f.w,f.h);ctx.fillStyle='#4A4440';for(let i=0;i<f.w;i+=0.7)ctx.fillRect(x+i,y+0.55,0.32,1.3);ctx.fillStyle='#B8B4AE';ctx.fillRect(x,y+0.75,f.w,0.08);ctx.fillRect(x,y+1.55,f.w,0.08);return;}
  if(f.own){drawOwnFurniture(f);return;}
  if(f.t==='edge'){ctx.fillStyle='#E9C53A';ctx.fillRect(x,y,f.w,f.h);ctx.fillStyle='rgba(0,0,0,.25)';for(let i=0;i<f.w;i+=0.5)ctx.fillRect(x+i,y,0.25,f.h);return;}
  if(f.t==='pillar'){ctx.fillStyle='rgba(0,0,0,.2)';ctx.fillRect(x+0.1,y+0.12,f.w,f.h);ctx.fillStyle='#E7E1D3';rrect(ctx,x,y,f.w,f.h,0.1);ctx.fill();ctx.fillStyle='#2E7D5B';ctx.fillRect(x+0.15,y+0.15,f.w-0.3,0.12);return;}
  if(f.t==='scheme'){ctx.fillStyle='#F4F1EA';ctx.fillRect(x,y,f.w,f.h);ctx.fillStyle='#D7263D';ctx.fillRect(x+0.15,y+f.h/2-0.03,f.w-0.3,0.06);for(let i=0;i<11;i++){ctx.beginPath();ctx.arc(x+0.15+i*(f.w-0.3)/10,y+f.h/2,0.07,0,TAU);ctx.fill();}return;}
  switch(f.t){
    case 'table':ctx.fillStyle='rgba(0,0,0,.18)';ctx.beginPath();ctx.arc(f.x+0.1,f.y+0.12,f.w/2,0,TAU);ctx.fill();ctx.fillStyle=it.kind==='home'?'#E8DCC8':'#8B5E3C';ctx.beginPath();ctx.arc(f.x,f.y,f.w/2,0,TAU);ctx.fill();ctx.strokeStyle='rgba(0,0,0,.25)';ctx.lineWidth=0.05;ctx.stroke();
      if(f.taken){ctx.fillStyle='#F5F0E6';ctx.beginPath();ctx.arc(f.x-0.3,f.y,0.17,0,TAU);ctx.arc(f.x+0.3,f.y,0.17,0,TAU);ctx.fill();ctx.fillStyle='#C98B4B';ctx.beginPath();ctx.arc(f.x-0.3,f.y,0.1,0,TAU);ctx.fill();}else{ctx.fillStyle='#E6E1D7';ctx.beginPath();ctx.arc(f.x,f.y,0.12,0,TAU);ctx.fill();}break;
    case 'chair':ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.ang||0);ctx.fillStyle='rgba(0,0,0,.15)';ctx.fillRect(-0.2,-0.2,0.5,0.5);ctx.fillStyle=it.kind==='home'?'#D7C7B0':'#5B3A24';rrect(ctx,-0.25,-0.25,0.5,0.5,0.08);ctx.fill();ctx.fillStyle=it.kind==='home'?'#B9A68C':'#3E2616';ctx.fillRect(-0.3,-0.25,0.09,0.5);ctx.restore();break;
    case 'counter':{const finish=interiorFinish(it.kind);ctx.fillStyle='rgba(0,0,0,.2)';ctx.fillRect(x+0.08,y+0.1,f.w,f.h);ctx.fillStyle=finish.counter;rrect(ctx,x,y,f.w,f.h,0.12);ctx.fill();ctx.fillStyle=finish.top;ctx.fillRect(x+0.1,y+0.1,f.w-0.2,f.h-0.5);
      ctx.fillStyle='rgba(255,245,215,.45)';ctx.fillRect(x+.12,y+f.h-.18,f.w-.24,.06);}
      for(let i=0;i<f.w-1;i+=1.3){ctx.fillStyle='#F2EBDD';ctx.beginPath();ctx.arc(x+0.8+i,y+0.4,0.13,0,TAU);ctx.fill();}break;
    case 'machine':ctx.fillStyle='#2E2E2E';rrect(ctx,x,y,f.w,f.h,0.08);ctx.fill();ctx.fillStyle='#C0C0C0';ctx.fillRect(x+0.15,y+0.12,f.w-0.3,0.15);break;
    case 'board':ctx.fillStyle='#1E1E1E';ctx.fillRect(x,y,f.w,f.h);ctx.fillStyle='#E8E0C8';for(let i=0;i<3;i++)ctx.fillRect(x+0.3,y+0.08+i*0.1,f.w*0.5-i*0.6,0.04);break;
    case 'window':ctx.fillStyle='#EAE5D8';ctx.fillRect(x-.08,y-.06,f.w+.16,f.h+.12);ctx.fillStyle=isNight()?'#243A5A':'#A9D0F0';ctx.fillRect(x,y,f.w,f.h);ctx.fillStyle='#F3EDDF';ctx.fillRect(f.x-.04,y,.08,f.h);ctx.fillStyle='rgba(255,255,255,.4)';ctx.fillRect(x+.08,y+.04,f.w*.36,.06);break;
    case 'shelf':ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(x+0.08,y+0.1,f.w,f.h);ctx.fillStyle='#D8D2C4';ctx.fillRect(x,y,f.w,f.h);const cols=[['#D64545','#3E8ED0','#F4B400'],['#2F9E6B','#E07B39','#8E44AD'],['#C2185B','#00897B','#5D4037']][f.goods||0];
      if(f.horiz){for(let i=0;i<f.w;i+=0.35)ctx.fillStyle=cols[Math.floor(i/0.35)%3],ctx.fillRect(x+0.05+i,y+0.1,0.25,f.h-0.2);}else{for(let i=0;i<f.h-0.2;i+=0.35){ctx.fillStyle=cols[Math.floor(i/0.35)%3];ctx.fillRect(x+0.1,y+0.1+i,f.w-0.2,0.25);}}break;
    case 'desk':ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(x+0.08,y+0.1,f.w,f.h);ctx.fillStyle=it.kind==='home'?'#E0D2BC':'#C9B99A';rrect(ctx,x,y,f.w,f.h,0.06);ctx.fill();ctx.fillStyle='#1F2A33';ctx.fillRect(f.x-0.35,y+0.08,0.7,0.14);ctx.fillStyle='#D8D8D8';ctx.fillRect(f.x-0.3,y+0.42,0.6,0.16);break;
    case 'box':ctx.fillStyle='#C2185B';rrect(ctx,x,y,f.w,f.h,0.05);ctx.fill();ctx.fillStyle='#F2C14E';ctx.fillRect(f.x-0.04,y,0.08,f.h);ctx.fillRect(x,f.y-0.04,f.w,0.08);ctx.beginPath();ctx.arc(f.x-0.08,f.y,0.08,0,TAU);ctx.arc(f.x+0.08,f.y,0.08,0,TAU);ctx.fill();break;   // коробка чак-чака с бантом
    case 'printer':ctx.fillStyle='#CFCFCF';rrect(ctx,x,y,f.w,f.h,0.06);ctx.fill();break;
    case 'stage':ctx.fillStyle='#6B1E1E';ctx.fillRect(x,y,f.w,f.h);ctx.fillStyle='#8E2A2A';for(let i=0;i<f.w;i+=0.6)ctx.fillRect(x+i,y,0.3,0.6);ctx.fillStyle='#3B2416';ctx.fillRect(x,y+0.6,f.w,f.h-0.6);ctx.fillStyle='rgba(255,230,160,.35)';ctx.beginPath();ctx.ellipse(f.x,y+1.9,2.2,0.7,0,0,TAU);ctx.fill();break;
    case 'seat':ctx.fillStyle='#8E2A2A';rrect(ctx,x+0.05,y+0.05,f.w-0.1,f.h-0.1,0.1);ctx.fill();ctx.fillStyle='#6B1E1E';ctx.fillRect(x+0.05,y+0.05,f.w-0.1,0.15);break;
    case 'painting':ctx.fillStyle='#5B4B3F';ctx.fillRect(x-0.05,y-0.05,f.w+0.1,f.h+0.1);ctx.fillStyle=['#7FA7C9','#C98B4B','#8FA86B','#B36B7A','#6B7FB3','#D1B36B'][f.c%6];ctx.fillRect(x,y,f.w,f.h);break;
    case 'pedestal':ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(x+0.08,y+0.1,f.w,f.h);ctx.fillStyle='#EDE8DF';ctx.fillRect(x,y,f.w,f.h);ctx.fillStyle=['#8C6D3F','#4C6E8C','#8C4C4C','#5E8C5A'][f.c%4];ctx.beginPath();ctx.arc(f.x,f.y,0.3,0,TAU);ctx.fill();break;
    case 'sofa':ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(x+0.08,y+0.1,f.w,f.h);ctx.fillStyle='#4F6D8C';rrect(ctx,x,y,f.w,f.h,0.2);ctx.fill();ctx.fillStyle='#5F7E9E';for(let i=0;i<3;i++)rrect(ctx,x+0.15+i*(f.w-0.3)/3,y+0.3,(f.w-0.3)/3-0.1,f.h-0.4,0.1),ctx.fill();break;
    case 'tv':ctx.fillStyle='#111';ctx.fillRect(x,y,f.w,f.h);ctx.fillStyle=`hsl(${(t*40)%360},60%,55%)`;ctx.fillRect(x+0.08,y+0.05,f.w-0.16,f.h-0.1);break;
    case 'rug':ctx.fillStyle='#B98C6B';ctx.beginPath();ctx.ellipse(f.x,f.y,f.w/2,f.h/2,0,0,TAU);ctx.fill();ctx.strokeStyle='#E2C8A1';ctx.lineWidth=.07;ctx.beginPath();ctx.ellipse(f.x,f.y,f.w/2-.16,f.h/2-.16,0,0,TAU);ctx.stroke();ctx.strokeStyle='#885D47';ctx.beginPath();for(const u of [-.25,0,.25]){const a=f.x+f.w*u;ctx.moveTo(a,f.y-.26);ctx.lineTo(a+.22,f.y);ctx.lineTo(a,f.y+.26);ctx.lineTo(a-.22,f.y);ctx.lineTo(a,f.y-.26);}ctx.stroke();break;
    case 'bed':ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(x+0.08,y+0.1,f.w,f.h);ctx.fillStyle='#F2EDE4';rrect(ctx,x,y,f.w,f.h,0.1);ctx.fill();ctx.fillStyle='#5E7F9E';rrect(ctx,x+0.7,y+0.1,f.w-0.8,f.h-0.2,0.08);ctx.fill();ctx.fillStyle='#FFFFFF';rrect(ctx,x+0.1,y+0.2,0.5,f.h-0.4,0.1);ctx.fill();break;
    case 'wardrobe':ctx.fillStyle='#8C6440';ctx.fillRect(x,y,f.w,f.h);ctx.fillStyle='#6E4B2F';ctx.fillRect(f.x-0.02,y,0.04,f.h);break;
    case 'kitchen':ctx.fillStyle='#D9D4C8';ctx.fillRect(x,y,f.w,f.h);ctx.fillStyle='#8FA3B3';ctx.beginPath();ctx.arc(x+1,f.y,0.3,0,TAU);ctx.fill();ctx.fillStyle='#333';for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(x+f.w-1.2+(i%2)*0.5,f.y-0.2+Math.floor(i/2)*0.4,0.14,0,TAU);ctx.fill();}break;
    case 'fridge':ctx.fillStyle='#E4E6E8';rrect(ctx,x,y,f.w,f.h,0.06);ctx.fill();ctx.fillStyle='#999';ctx.fillRect(x+0.1,y+0.35,0.6,0.04);break;
    case 'plant':ctx.fillStyle='#8C5A3C';ctx.fillRect(f.x-0.25,f.y-0.15,0.5,0.4);ctx.fillStyle='#4E8F48';ctx.beginPath();ctx.arc(f.x,f.y-0.25,0.35,0,TAU);ctx.fill();ctx.fillStyle='#6BAE5F';ctx.beginPath();ctx.arc(f.x-0.15,f.y-0.35,0.2,0,TAU);ctx.fill();break;
    case 'atm':ctx.fillStyle='#2E8B57';rrect(ctx,x,y,f.w,f.h,0.06);ctx.fill();ctx.fillStyle='#CFE';ctx.fillRect(x+0.15,y+0.12,0.5,0.25);break;
    case 'pew':ctx.fillStyle='#8B5E3C';rrect(ctx,x,y,f.w,f.h,0.1);ctx.fill();ctx.fillStyle='#6E4B2F';ctx.fillRect(x,y,f.w,0.12);break;
    case 'altar':ctx.fillStyle='#D1B36B';rrect(ctx,x,y,f.w,f.h,0.1);ctx.fill();break;
    default:ctx.fillStyle='#999';ctx.fillRect(x,y,f.w,f.h);}}

// ===== Меню кафе и бара: поесть и выпить — одному или вместе со спутником (можно угостить) =====
const MENU={
  cafe:[{e:'🫖',n:'Чай с чак-чаком',p:220,food:15,mood:6,en:4,min:20},{e:'☕',n:'Капучино и десерт',p:350,food:20,mood:8,en:12,min:25},{e:'🥟',n:'Эчпочмак и айран',p:280,food:35,mood:5,en:5,min:20},{e:'🍲',n:'Обед: суп и горячее',p:550,food:60,mood:8,en:6,min:40}],
  bar:[{e:'🍋',n:'Домашний лимонад',p:250,food:5,mood:6,en:3,min:15},{e:'🍺',n:'Пиво',p:400,food:5,mood:12,en:-4,min:30,alc:24},{e:'🥃',n:'Облепиховая настойка',p:350,food:2,mood:14,en:-3,min:20,alc:30},{e:'🍗',n:'Крылышки и гренки',p:450,food:35,mood:8,en:2,min:30},{e:'🍔',n:'Бургер с картошкой',p:600,food:55,mood:10,en:4,min:35}]};
let orderCtx=null;
function compNpcInside(){return companion&&interior?interior.npcs.find(n=>n.companionOf===companion.w)||null:null;}
function openOrder(f,it){const cn=f.comp||(compNpcInside()&&!it.furn.some(t=>t.comp)?compNpcInside():null);orderCtx={f,it,cn};player.busy=true;
  $('#orderTitle').textContent=`«${it.name}» — меню`;
  $('#orderSub').textContent=cn?`За столиком вы и ${cn.p.name}. Можно угостить — заказ на двоих, ${cn.p.female?'ей':'ему'} будет приятно. Или каждый платит за себя.`:'Выберите, что заказать.';
  $('#orderTreatRow').hidden=!cn;if(cn){$('#orderTreatLbl').textContent='Я угощаю (заказ на двоих)';$('#orderTreat').checked=true;}
  renderOrder();$('#orderModal').hidden=false;}
function renderOrder(){if(!orderCtx)return;const {it,cn}=orderCtx;const treat=!!cn&&$('#orderTreat').checked;const list=$('#orderList');list.innerHTML='';
  for(const m of MENU[it.kind]||MENU.cafe){const cost=m.p*(treat?2:1);const b=document.createElement('button');b.className='order-item';b.disabled=player.money<cost;
    const l=document.createElement('span');l.textContent=`${m.e} ${m.n}`;const r=document.createElement('b');r.textContent=fmtMoney(cost);const d=document.createElement('i');d.textContent=`сытость +${m.food} · настроение +${m.mood+(cn?5:0)}`;
    const col=document.createElement('div');col.append(l,d);b.append(col,r);b.addEventListener('click',()=>placeOrder(m,treat));list.append(b);}
  $('#orderMoney').textContent=`У вас ${fmtMoney(player.money)}`;}
function closeOrder(){$('#orderModal').hidden=true;player.busy=false;orderCtx=null;}
const TREAT_THX=['Ой, спасибо! В следующий раз я угощаю.','Рәхмәт! Вот это по-нашему.','Спасибо, очень приятно!','Ну ты даёшь, спасибо! За встречу!'];
const SELF_LINES=['Мне то же самое, я сам(а) заплачу.','Отлично, давно тут не была... то есть не был. Возьму себе тоже.','Хороший выбор. Я себе тоже возьму.'];
function placeOrder(m,treat){if(!orderCtx)return;const {f,it,cn}=orderCtx;const cost=m.p*(treat?2:1);if(player.money<cost){setHint(`Не хватает денег: нужно ${fmtMoney(cost)}`);return;}
  player.money-=cost;if(m.alc)addDrink(m.alc,m.n);player.food=clamp(player.food+m.food,0,100);player.mood=clamp(player.mood+m.mood+(cn?5:0),0,100);player.energy=clamp(player.energy+m.en,0,100);spendTime(m.min);
  player.ix=f.x-1.05;player.iy=f.y;player.ihx=1;player.ihy=0;player.iwp=null;
  if(cn){f.comp=cn;f.ordered=(f.ordered?f.ordered+', ':'')+m.n;cn.tableF=f;cn.x=f.x+1.05;cn.y=f.y;cn.seated=true;cn.hx=-1;cn.hy=0;
    const w=companion?companion.w:null;const pp=cn.p;pp.mood=treat?'отличное':(pp.mood==='тревожное'||pp.mood==='уставшее'?'хорошее':pp.mood);pp.rel=(pp.rel||0)+(treat?10:4);
    const t=treat?pick(TREAT_THX):pick(SELF_LINES).replace('сам(а)',pp.female?'сама':'сам').replace('давно тут не была... то есть не был',pp.female?'давно тут не была':'давно тут не был');
    cn.say={t,ttl:6};nearLine(pp.name,t,false);pp.memory.push({role:'user',content:`[${player.name} ${treat?'угощает тебя':'сел(а) с тобой за столик, каждый платит за себя'}: ${m.n}, «${it.name}»]`});pp.memory.push({role:'assistant',content:t});
    addEvent(`«${it.name}», вы и ${pp.name}: ${m.n}${treat?' (вы угостили)':''}. Сытость +${m.food}, настроение +${m.mood+5}`,'say');
    closeOrder();setHint('Сидите вместе. E — поговорить');return;}
  addEvent(`«${it.name}»: ${m.n}. Сытость +${m.food}, настроение +${m.mood}`);closeOrder();}
$('#orderTreat').addEventListener('change',renderOrder);
$('#orderClose').addEventListener('click',closeOrder);
$('#chatOrder').addEventListener('click',()=>{const w=chatNpc;if(!w||!w.tableF||!interior)return;closeChat();openOrder(w.tableF,interior);});

// ===== Кадр на входе: короткое фото заведения (site/img/inside/*.jpg), потом обычная комната =====
// Нет файла — ничего не показываем. Клик или движение пропускают кадр. В то же место второй раз за минуту не повторяем.
const SHOT_KINDS=['cafe','bar','restaurant','shop','pharmacy','home'];const shotImg={};const shotSeen=new Map();let shotT=null;
// фото качаем, когда город уже на экране: при входе 600 КБ картинок мешали карте
(function shotLater(){const L=$('#loading');if(L&&!L.hidden){setTimeout(shotLater,700);return;}setTimeout(()=>{for(const k of SHOT_KINDS){const im=new Image();im.onload=()=>{shotImg[k]=im;};im.onerror=()=>{};im.src='img/inside/'+k+'.jpg';}},1500);})();
function shotKind(src){const n=String(src.name||'').toLowerCase();if(/ресторан|чайхан/.test(n))return 'restaurant';if(src.kind==='market')return 'shop';return SHOT_KINDS.includes(src.kind)?src.kind:null;}
function insideShot(src){const k=shotKind(src);const im=k&&shotImg[k];if(!im)return;const key=src.key||src.name;const now=performance.now();if(now-(shotSeen.get(key)||-1e9)<60000)return;shotSeen.set(key,now);
  const el=$('#insideShot');el.style.backgroundImage=`url("${im.src}")`;$('#insideShotName').textContent=src.name||'';el.hidden=false;el.classList.remove('out');void el.offsetWidth;el.classList.add('in');
  clearTimeout(shotT);shotT=setTimeout(hideShot,800);}
function hideShot(){const el=$('#insideShot');if(el.hidden)return;clearTimeout(shotT);el.classList.remove('in');el.classList.add('out');setTimeout(()=>{el.hidden=true;el.classList.remove('out');},280);}
$('#insideShot').addEventListener('pointerdown',hideShot);
window.addEventListener('keydown',e=>{if(!$('#insideShot').hidden&&/^(w|a|s|d|ц|ф|ы|в|Arrow\w+|Escape| )$/i.test(e.key))hideShot();},true);
