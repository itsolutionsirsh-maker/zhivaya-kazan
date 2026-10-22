// ===== Интерьеры: кафе, магазины, офисы, дом =====
let scene='city';let interior=null;const interiorCache=new Map();
const KIND_RU={cafe:'кафе',bar:'бар',shop:'магазин',bank:'банк',office:'офис',theatre:'театр',museum:'музей',hotel:'гостиница',pharmacy:'аптека',hospital:'клиника',university:'университет',library:'библиотека',worship:'храм',police:'отдел полиции',market:'рынок',school:'школа',home:'ваш дом',default:'помещение'};
function makeInterior(kind,name,key){
  const rng=seeded(hashStr(key));const R=(a,b)=>a+rng()*(b-a);
  const sizes={cafe:[16,11],bar:[14,10],shop:[15,10],bank:[14,9],office:[18,12],theatre:[20,14],museum:[18,12],hotel:[14,10],pharmacy:[11,8],hospital:[14,10],university:[16,11],library:[16,11],worship:[16,12],police:[12,9],market:[18,12],school:[16,11],home:[11,8],default:[12,9]};
  const [w,h]=sizes[kind]||sizes.default;
  const it={kind,name,key,w,h,furn:[],npcs:[],door:{x:w/2,y:h},floor:'wood'};
  const F=(t,x,y,fw,fh,extra)=>{const f=Object.assign({t,x,y,w:fw,h:fh},extra||{});it.furn.push(f);return f;};
  const NPC=(x,y,o)=>{const p=makePersona((o&&o.role)||'resident');if(o&&o.job)p.job=o.job;const n=Object.assign({p,x,y,hx:0,hy:1,seated:false,phase:rng()*6,role:'resident',isInterior:true,state:'idle',memory:p.memory},o||{});it.npcs.push(n);return n;};
  const plant=(x,y)=>F('plant',x,y,0.8,0.8);
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
    case 'home':{it.floor='wood';F('bed',2.3,1.9,2.4,1.7,{spot:'bed'});F('wardrobe',5.2,0.7,1.8,0.7,{spot:'wardrobe'});F('kitchen',w-2.6,0.8,4.4,0.9,{spot:'kitchen'});F('fridge',w-0.7,2.3,0.8,0.9,{});F('table',w-3,3.8,1.2,1.2,{spot:'table',round:true});F('chair',w-3,2.8,0.5,0.5,{ang:Math.PI/2});F('chair',w-3,4.8,0.5,0.5,{ang:-Math.PI/2});
      F('rug',3.2,h-2.6,3.6,2.2,{});F('sofa',3.2,h-1.9,2.8,1.1,{spot:'sofa'});F('tv',3.2,h-3.7,1.8,0.3,{});F('desk',w-2.4,h-1.6,1.8,0.8,{spot:'pc'});F('chair',w-2.4,h-2.5,0.5,0.5,{ang:Math.PI/2});plant(0.8,h-0.8);F('window',2.5,0.15,2.5,0.3);break;}
    default:{it.floor='tiles';F('counter',w/2,1.1,5,1.1,{spot:'counter'});NPC(w/2,0.5,{role:'staff',job:'администратор'});for(let i=0;i<4;i++)F('chair',2.2+i*1.2,h-2.2,0.5,0.5,{ang:-Math.PI/2});NPC(3+rng()*(w-6),3+rng()*(h-6),{wander:true});}
  }
  return it;}
function enterInterior(src){const key=src.key;let it=interiorCache.get(key);if(!it){it=makeInterior(src.kind,src.name,key);interiorCache.set(key,it);}
  interior=it;scene='interior';player.inside=true;companionEnter(it);sitOnEnter(it);it.ret={x:player.x,y:player.y,hx:player.hx,hy:player.hy};player.ix=it.w/2;player.iy=it.h-1.1;player.ihx=0;player.ihy=-1;player.iwp=null;player.waypoints=null;player.talkTarget=null;
  addEvent(`Вы зашли в «${src.name}»`);if(!flags.enteredOnce){flags.enteredOnce=true;setHint('Внутри: подойдите к столику, стойке или человеку и нажмите E. Выход — внизу');}}
function exitInterior(){const it=interior;for(const f of it.furn){f.comp=null;f.ordered=null;}it.npcs=it.npcs.filter(n=>!n.companionOf);if(orderCtx)closeOrder();scene='city';interior=null;player.inside=false;player.x=it.ret.x;player.y=it.ret.y;cam.x=player.x;cam.y=player.y;player.iwp=null;}
function blockedInside(x,y,r){const it=interior;
  if(x<0.35+r||x>it.w-0.35-r||y<0.35+r){return true;}
  if(y>it.h-0.35-r){if(Math.abs(x-it.door.x)<0.85)return y>it.h+0.8;return true;}
  for(const f of it.furn){if(f.t==='rug'||f.t==='painting'||f.t==='board'||f.t==='tv'||f.t==='chair'||f.t==='window'||f.t==='seat'||f.t==='pew')continue;const hw=f.w/2+r,hh=f.h/2+r;if(Math.abs(x-f.x)<hw&&Math.abs(y-f.y)<hh)return true;}return false;}
function moveInside(dx,dy){const r=0.3;let ok=false;if(!blockedInside(player.ix+dx,player.iy+dy,r)){player.ix+=dx;player.iy+=dy;ok=true;}else if(!blockedInside(player.ix+dx,player.iy,r)){player.ix+=dx;ok=true;}else if(!blockedInside(player.ix,player.iy+dy,r)){player.iy+=dy;ok=true;}
  if(player.iy>interior.h+0.4){exitInterior();return false;}return ok;}
function updateInterior(dt){const it=interior;let mx=0,my=0;if(!player.busy){if(keys.w||keys['ц']||keys.ArrowUp)my-=1;if(keys.s||keys['ы']||keys.ArrowDown)my+=1;if(keys.a||keys['ф']||keys.ArrowLeft)mx-=1;if(keys.d||keys['в']||keys.ArrowRight)mx+=1;mx+=joyVec[0];my+=joyVec[1];}
  const m=Math.hypot(mx,my);
  if(m>0.05){player.iwp=null;mx/=m;my/=m;let dk=1;[mx,my,dk]=drunkSway(mx,my);const sp=2.6*dt*Math.min(1,m)*dk;moveInside(mx*sp,my*sp);player.ihx=mx;player.ihy=my;player.phase+=dt*7;}
  else if(player.iwp){const w=player.iwp;const d=dist(w[0],w[1],player.ix,player.iy);if(d<0.15)player.iwp=null;else{const dx=(w[0]-player.ix)/d,dy=(w[1]-player.iy)/d;const st=Math.min(2.6*dt,d);if(!moveInside(dx*st,dy*st))player.iwp=null;player.ihx=dx;player.ihy=dy;player.phase+=dt*7;}}
  for(const n of it.npcs){if(!n.wander||n===chatNpc)continue;n.t=(n.t||0)-dt;if(n.t<=0){n.t=rnd(3,9);n.tx=clamp(n.x+rnd(-3,3),1,it.w-1);n.ty=clamp(n.y+rnd(-3,3),2.2,it.h-1.4);}
    const d=dist(n.tx,n.ty,n.x,n.y);if(d>0.1){const dx=(n.tx-n.x)/d,dy=(n.ty-n.y)/d;const st=Math.min(0.8*dt,d);const nx=n.x+dx*st,ny=n.y+dy*st;if(!blockedInside(nx,ny,0.3)){n.x=nx;n.y=ny;n.hx=dx;n.hy=dy;n.phase+=dt*5;}else n.t=0;}}}
function findActionInterior(){{const sa=sitActionInterior();if(sa)return sa;}const it=interior;const px=player.ix,py=player.iy;let best=null,bd=1e9;
  for(const n of it.npcs){if(n.companionOf&&n.tableF&&!n.tableF.ordered)continue;const d=dist(n.x,n.y,px,py);if(d<1.6&&d<bd){bd=d;best={label:`Поговорить: ${n.p.name}${n.companionOf?'':', '+n.p.job}`,run:()=>openChat(n)};}}
  if(best)return best;
  for(const f of it.furn){if(!f.spot)continue;const d=Math.max(Math.abs(px-f.x)-f.w/2,Math.abs(py-f.y)-f.h/2);if(d<1.0&&d<bd){const a=spotAction(f,it);if(a){bd=d;best=a;}}}
  if(best)return best;
  if(dist(px,py,it.door.x,it.door.y)<1.8)return {label:'Выйти на улицу',run:exitInterior};
  return null;}
function spotAction(f,it){const n=it.name;const price=it.kind==='bar'?500:350;
  switch(f.spot){
    case 'table':if(it.kind==='home')return {label:player.pantry>0?'Поесть (есть продукты)':'Поесть — продуктов нет, нужно купить',run:()=>{if(player.pantry>0){player.pantry--;player.food=clamp(player.food+35,0,100);clock.minutes+=25;addEvent('Перекусили дома. Сытость +35');}else setHint('Холодильник пуст. Продукты — в магазине');}};
      if(f.comp&&!f.ordered)return {label:`Сесть за столик (там ${f.comp.p.name}) и заказать`,run:()=>openOrder(f,it)};
      if(f.comp&&f.ordered)return {label:`Поговорить за столиком: ${f.comp.p.name}`,run:()=>openChat(f.comp)};
      if(f.taken){return {label:'Столик занят — подсесть и поболтать',run:()=>{const nb=it.npcs.find(q=>dist(q.x,q.y,f.x,f.y)<1.3);if(nb)openChat(nb);}};}
      if(MENU[it.kind])return {label:'Сесть и заказать — меню',run:()=>openOrder(f,it)};
      return {label:`Сесть и заказать · ${price} ₽`,run:()=>spend(price,()=>{player.food=clamp(player.food+45,0,100);player.mood=clamp(player.mood+8,0,100);clock.minutes+=35;addEvent(`Вы поели в «${n}». Сытость +45, настроение +8`);})};
    case 'counter':if(/cafe|bar/.test(it.kind))return {label:'Взять кофе с собой · 180 ₽',run:()=>spend(180,()=>{player.energy=clamp(player.energy+12,0,100);player.mood=clamp(player.mood+3,0,100);setHint('Кофе с собой. Энергия +12');})};
      if(it.kind==='bank')return {label:'Снять наличные',run:()=>setHint('Выдали наличные. Баланс тот же')};return {label:'Спросить у администратора',run:()=>setHint('«Чем могу помочь?» — пока ничем')};
    case 'cash':return {label:'Спросить кассира',run:()=>setHint('«Берите с полок, оплата сразу»')};
    case 'shelf':{const cost=it.kind==='pharmacy'?250:it.kind==='market'?300:220;const lbl=it.kind==='pharmacy'?'Купить витамины':it.kind==='market'?'Купить чак-чак и фрукты':'Взять продукты';
      return {label:`${lbl} · ${cost} ₽`,run:()=>spend(cost,()=>{if(it.kind==='pharmacy'){player.energy=clamp(player.energy+10,0,100);addEvent('Витамины. Энергия +10');}else{player.food=clamp(player.food+20,0,100);player.pantry=(player.pantry||0)+1;addEvent(`Купили продукты в «${n}». Сытость +20, запас дома +1`);}})};}
    case 'atm':return {label:'Снять наличные в банкомате',run:()=>setHint('Выдали наличные')};
    case 'desk':return {label:'Поработать 2 часа · +1 200 ₽',run:()=>{if(player.energy<15){setHint('Слишком устали');return;}clock.minutes+=120;player.money+=1200;player.energy=clamp(player.energy-22,0,100);player.food=clamp(player.food-12,0,100);addEvent(`Отработали 2 часа в «${n}»: +1 200 ₽`);}};
    case 'seat':return {label:'Смотреть спектакль · 1 200 ₽',run:()=>spend(1200,()=>{clock.minutes+=150;player.mood=clamp(player.mood+30,0,100);addEvent(`Спектакль в «${n}» — зал аплодировал стоя. Настроение +30`);})};
    case 'exhibit':return {label:'Рассмотреть экспонат',run:()=>{if(!f.seen){f.seen=true;player.mood=clamp(player.mood+3,0,100);clock.minutes+=8;setHint('Интересно. Настроение +3');}else setHint('Вы это уже видели');}};
    case 'reception':if(it.kind==='hotel')return {label:'Снять номер на ночь · 3 500 ₽',run:()=>spend(3500,()=>sleep(8))};if(it.kind==='hospital')return {label:'Пройти осмотр · 800 ₽',run:()=>spend(800,()=>{player.energy=100;addEvent('Осмотр пройден, энергия восстановлена');})};return null;
    case 'sofa':return {label:it.kind==='home'?'Посмотреть телевизор (1 ч)':'Посидеть на диване',run:()=>{const home=it.kind==='home';clock.minutes+=home?60:15;player.mood=clamp(player.mood+(home?8:3),0,100);setHint('Настроение +'+(home?8:3));}};
    case 'study':return {label:it.kind==='library'?'Почитать час':'Послушать лекцию (1,5 ч)',run:()=>{clock.minutes+=it.kind==='library'?60:90;player.mood=clamp(player.mood+4,0,100);player.energy=clamp(player.energy-6,0,100);setHint('Настроение +4');}};
    case 'books':return {label:'Полистать книги',run:()=>{clock.minutes+=20;player.mood=clamp(player.mood+3,0,100);setHint('Настроение +3');}};
    case 'pew':return {label:'Посидеть в тишине',run:()=>{clock.minutes+=20;player.mood=clamp(player.mood+6,0,100);setHint('Тишина и покой. Настроение +6');}};
    case 'duty':return {label:'Спросить о происшествиях',run:()=>setHint(accidents.length?`Дежурный: «Сейчас на выезде — ${accidents[0].kind==='ped'?'сбили пешехода':'ДТП'}${accidents[0].road?', '+accidents[0].road:''}»`:'Дежурный: «В городе спокойно»')};
    case 'bed':return {label:'Лечь спать до утра',run:()=>trySleep(8)};
    case 'wardrobe':return {label:'Переодеться / сменить фото',run:()=>showProfile()};
    case 'kitchen':if(player.noWater===clock.day)return {label:'Воды нет — мастер из УК придёт завтра',run:()=>setHint('Можно поесть в кафе или заказать доставку')};return {label:player.pantry>0?'Приготовить ужин (продукты есть)':'Приготовить ужин · 150 ₽ (доставка)',run:()=>{const fn=()=>{player.food=clamp(player.food+40,0,100);player.mood=clamp(player.mood+4,0,100);clock.minutes+=40;addEvent('Приготовили ужин. Сытость +40');};if(player.pantry>0){player.pantry--;fn();}else spend(150,fn);}};
    case 'pc':return {label:'Поработать удалённо 3 ч · +2 000 ₽',run:()=>{if(player.energy<20){setHint('Слишком устали для работы');return;}clock.minutes+=180;player.money+=2000;player.energy=clamp(player.energy-25,0,100);player.food=clamp(player.food-15,0,100);addEvent('Три часа удалёнки: +2 000 ₽');}};
    default:return null;}}

// ---------- отрисовка интерьера ----------
const FLOORS={wood:['#C9A77A','#BE9A6C'],dark:['#4A3B33','#43352E'],tiles:['#DDD9D0','#D3CFC6'],marble:['#E7E3DC','#DDD8CF'],carpet:['#8C9AA6','#86939F'],rug:['#A8433B','#9A3C35']};
function renderInterior(){const it=interior;LOD=2;ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle='#10161A';ctx.fillRect(0,0,W,H);
  const iz=clamp(Math.min((W-40)/(it.w+1),(H-250)/(it.h+1.5)),16,46);const ox=(W-it.w*iz)/2,oy=Math.max(124,(H-it.h*iz)/2-10);it.iz=iz;it.ox=ox;it.oy=oy;
  ctx.setTransform(DPR*iz,0,0,DPR*iz,DPR*ox,DPR*oy);
  // пол
  const fl=FLOORS[it.floor]||FLOORS.wood;ctx.fillStyle=fl[0];ctx.fillRect(0,0,it.w,it.h);ctx.fillStyle=fl[1];ctx.save();ctx.beginPath();ctx.rect(0,0,it.w,it.h);ctx.clip();
  if(it.floor==='wood'||it.floor==='dark'){for(let y=0;y<it.h;y+=0.4){ctx.fillRect(0,y,it.w,0.035);const off=((y/0.4)|0)%3*0.7;for(let x=off;x<it.w;x+=2.1)ctx.fillRect(x,y,0.035,0.4);}}
  else if(it.floor==='tiles'||it.floor==='marble'){for(let y=0;y<it.h;y+=1)for(let x=((y)|0)%2?1:0;x<it.w;x+=2)ctx.fillRect(x,y,1,1);}
  else{for(let y=0;y<it.h;y+=0.6)ctx.fillRect(0,y,it.w,0.05);}ctx.restore();
  // мебель
  const t=performance.now()/1000;
  for(const f of it.furn)drawFurniture(f,it,t);
  // стены
  ctx.strokeStyle='#5B4B3F';ctx.lineWidth=0.4;ctx.strokeRect(0,0,it.w,it.h);ctx.fillStyle='#7A6756';ctx.fillRect(-0.2,-0.2,it.w+0.4,0.2);
  // дверь
  ctx.fillStyle=fl[0];ctx.fillRect(it.door.x-0.85,it.h-0.25,1.7,0.5);ctx.fillStyle='#6B5A4C';ctx.fillRect(it.door.x-0.85,it.h+0.2,1.7,0.08);ctx.fillStyle='rgba(255,255,255,.6)';ctx.font='0.4px "IBM Plex Sans",system-ui';ctx.textAlign='center';ctx.fillText('выход',it.door.x,it.h+0.65);
  // люди
  for(const n of it.npcs)drawPerson(n.x,n.y,n.hx,n.hy,n.p,n.phase,{scale:0.55,seated:n.seated});
  drawPerson(player.ix,player.iy,player.ihx,player.ihy,{clothes:player.clothes,skin:player.skin,hair:player.hair,role:'player'},player.phase,{scale:0.55,ring:true});
  if(player.iwp){ctx.strokeStyle='rgba(43,176,98,.9)';ctx.lineWidth=0.06;ctx.beginPath();ctx.arc(player.iwp[0],player.iwp[1],0.35+Math.sin(t*6)*0.06,0,TAU);ctx.stroke();}
  // подпись
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.textAlign='left';ctx.textBaseline='middle';ctx.font='700 15px "Unbounded",sans-serif';ctx.fillStyle='#EEF3EE';ctx.fillText(it.name,ox,oy+it.h*iz+34);ctx.font='500 12px "IBM Plex Sans",system-ui';ctx.fillStyle='#9BB1A4';ctx.fillText(KIND_RU[it.kind]||KIND_RU.default,ox+ctx.measureText(it.name).width*1.45+12,oy+it.h*iz+35);
  const [sx,sy]=[ox+player.ix*iz,oy+player.iy*iz];drawSitInterior(it);labelPlayer(sx,sy-iz*0.55,player.name,true,player.avatarImg);drawInteriorBubbles(it);}
function drawFurniture(f,it,t){const x=f.x-f.w/2,y=f.y-f.h/2;
  switch(f.t){
    case 'table':ctx.fillStyle='rgba(0,0,0,.18)';ctx.beginPath();ctx.arc(f.x+0.1,f.y+0.12,f.w/2,0,TAU);ctx.fill();ctx.fillStyle=it.kind==='home'?'#E8DCC8':'#8B5E3C';ctx.beginPath();ctx.arc(f.x,f.y,f.w/2,0,TAU);ctx.fill();ctx.strokeStyle='rgba(0,0,0,.25)';ctx.lineWidth=0.05;ctx.stroke();
      if(f.taken){ctx.fillStyle='#F5F0E6';ctx.beginPath();ctx.arc(f.x-0.3,f.y,0.17,0,TAU);ctx.arc(f.x+0.3,f.y,0.17,0,TAU);ctx.fill();ctx.fillStyle='#C98B4B';ctx.beginPath();ctx.arc(f.x-0.3,f.y,0.1,0,TAU);ctx.fill();}else{ctx.fillStyle='#E6E1D7';ctx.beginPath();ctx.arc(f.x,f.y,0.12,0,TAU);ctx.fill();}break;
    case 'chair':ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.ang||0);ctx.fillStyle='rgba(0,0,0,.15)';ctx.fillRect(-0.2,-0.2,0.5,0.5);ctx.fillStyle=it.kind==='home'?'#D7C7B0':'#5B3A24';rrect(ctx,-0.25,-0.25,0.5,0.5,0.08);ctx.fill();ctx.fillStyle=it.kind==='home'?'#B9A68C':'#3E2616';ctx.fillRect(-0.3,-0.25,0.09,0.5);ctx.restore();break;
    case 'counter':ctx.fillStyle='rgba(0,0,0,.2)';ctx.fillRect(x+0.08,y+0.1,f.w,f.h);ctx.fillStyle='#6E4B2F';rrect(ctx,x,y,f.w,f.h,0.12);ctx.fill();ctx.fillStyle='#8C6440';ctx.fillRect(x+0.1,y+0.1,f.w-0.2,f.h-0.5);
      for(let i=0;i<f.w-1;i+=1.3){ctx.fillStyle='#F2EBDD';ctx.beginPath();ctx.arc(x+0.8+i,y+0.4,0.13,0,TAU);ctx.fill();}break;
    case 'machine':ctx.fillStyle='#2E2E2E';rrect(ctx,x,y,f.w,f.h,0.08);ctx.fill();ctx.fillStyle='#C0C0C0';ctx.fillRect(x+0.15,y+0.12,f.w-0.3,0.15);break;
    case 'board':ctx.fillStyle='#1E1E1E';ctx.fillRect(x,y,f.w,f.h);ctx.fillStyle='#E8E0C8';for(let i=0;i<3;i++)ctx.fillRect(x+0.3,y+0.08+i*0.1,f.w*0.5-i*0.6,0.04);break;
    case 'window':ctx.fillStyle=isNight()?'#243A5A':'#A9D0F0';ctx.fillRect(x,y,f.w,f.h);ctx.fillStyle='rgba(255,255,255,.5)';ctx.fillRect(x+f.w/2-0.03,y,0.06,f.h);break;
    case 'shelf':ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(x+0.08,y+0.1,f.w,f.h);ctx.fillStyle='#D8D2C4';ctx.fillRect(x,y,f.w,f.h);const cols=[['#D64545','#3E8ED0','#F4B400'],['#2F9E6B','#E07B39','#8E44AD'],['#C2185B','#00897B','#5D4037']][f.goods||0];
      if(f.horiz){for(let i=0;i<f.w;i+=0.35)ctx.fillStyle=cols[Math.floor(i/0.35)%3],ctx.fillRect(x+0.05+i,y+0.1,0.25,f.h-0.2);}else{for(let i=0;i<f.h-0.2;i+=0.35){ctx.fillStyle=cols[Math.floor(i/0.35)%3];ctx.fillRect(x+0.1,y+0.1+i,f.w-0.2,0.25);}}break;
    case 'desk':ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(x+0.08,y+0.1,f.w,f.h);ctx.fillStyle=it.kind==='home'?'#E0D2BC':'#C9B99A';rrect(ctx,x,y,f.w,f.h,0.06);ctx.fill();ctx.fillStyle='#1F2A33';ctx.fillRect(f.x-0.35,y+0.08,0.7,0.14);ctx.fillStyle='#D8D8D8';ctx.fillRect(f.x-0.3,y+0.42,0.6,0.16);break;
    case 'printer':ctx.fillStyle='#CFCFCF';rrect(ctx,x,y,f.w,f.h,0.06);ctx.fill();break;
    case 'stage':ctx.fillStyle='#6B1E1E';ctx.fillRect(x,y,f.w,f.h);ctx.fillStyle='#8E2A2A';for(let i=0;i<f.w;i+=0.6)ctx.fillRect(x+i,y,0.3,0.6);ctx.fillStyle='#3B2416';ctx.fillRect(x,y+0.6,f.w,f.h-0.6);ctx.fillStyle='rgba(255,230,160,.35)';ctx.beginPath();ctx.ellipse(f.x,y+1.9,2.2,0.7,0,0,TAU);ctx.fill();break;
    case 'seat':ctx.fillStyle='#8E2A2A';rrect(ctx,x+0.05,y+0.05,f.w-0.1,f.h-0.1,0.1);ctx.fill();ctx.fillStyle='#6B1E1E';ctx.fillRect(x+0.05,y+0.05,f.w-0.1,0.15);break;
    case 'painting':ctx.fillStyle='#5B4B3F';ctx.fillRect(x-0.05,y-0.05,f.w+0.1,f.h+0.1);ctx.fillStyle=['#7FA7C9','#C98B4B','#8FA86B','#B36B7A','#6B7FB3','#D1B36B'][f.c%6];ctx.fillRect(x,y,f.w,f.h);break;
    case 'pedestal':ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(x+0.08,y+0.1,f.w,f.h);ctx.fillStyle='#EDE8DF';ctx.fillRect(x,y,f.w,f.h);ctx.fillStyle=['#8C6D3F','#4C6E8C','#8C4C4C','#5E8C5A'][f.c%4];ctx.beginPath();ctx.arc(f.x,f.y,0.3,0,TAU);ctx.fill();break;
    case 'sofa':ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(x+0.08,y+0.1,f.w,f.h);ctx.fillStyle='#4F6D8C';rrect(ctx,x,y,f.w,f.h,0.2);ctx.fill();ctx.fillStyle='#5F7E9E';for(let i=0;i<3;i++)rrect(ctx,x+0.15+i*(f.w-0.3)/3,y+0.3,(f.w-0.3)/3-0.1,f.h-0.4,0.1),ctx.fill();break;
    case 'tv':ctx.fillStyle='#111';ctx.fillRect(x,y,f.w,f.h);ctx.fillStyle=`hsl(${(t*40)%360},60%,55%)`;ctx.fillRect(x+0.08,y+0.05,f.w-0.16,f.h-0.1);break;
    case 'rug':ctx.fillStyle='#B98C6B';ctx.beginPath();ctx.ellipse(f.x,f.y,f.w/2,f.h/2,0,0,TAU);ctx.fill();ctx.strokeStyle='#A07555';ctx.lineWidth=0.08;ctx.stroke();break;
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
  player.money-=cost;if(m.alc)addDrink(m.alc,m.n);player.food=clamp(player.food+m.food,0,100);player.mood=clamp(player.mood+m.mood+(cn?5:0),0,100);player.energy=clamp(player.energy+m.en,0,100);clock.minutes+=m.min;
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
