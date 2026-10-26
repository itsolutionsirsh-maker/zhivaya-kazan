// ===== Ситуации на улице: карманник, ссора, человеку плохо, кошелёк, собака, уличный музыкант =====
const onFootCity=()=>scene==='city'&&!player.vehicle&&!player.bus&&player.state!=='hurt'&&!player.inside;
function nearestPolice(){let ps=null,bd=1e9;for(const p of world.pois){if(p.t!=='police')continue;const d=dist(p.x,p.y,player.x,player.y);if(d<bd){bd=d;ps=p;}}return ps;}
function markPolice(s,key){const ps=nearestPolice();if(ps)mark(s,key,ps.x,ps.y,'🚓',ps.n||'Отдел полиции',{arrow:true,color:'#2D4A9E'});return ps;}
const inPolice=()=>scene==='interior'&&interior&&interior.kind==='police';

// ---------- карманник ----------
defSit('pickpocket',{title:'Карманник',auto:true,weight:3,cool:600,
  when(){return onFootCity()&&player.money>=400&&crowdAround(player.x,player.y,22)>=4;},
  start(s){const w=findWalker(2,14);if(!w)return false;takeActor(s,w);w.p.job='карманник';s.w=w;
    s.sum=clamp(Math.round(player.money*rnd(0.15,0.3)/50)*50,100,2500);player.money-=s.sum;s.phase='quiet';
    const q=awayPoint(w,60);moveActor(w,q[0],q[1],2.2);addEvent('Кто-то плотно прижался к вам в толпе…');
    s.cardT=1.4;return true;},
  update(s,dt){const w=s.w;
    if(s.cardT>0){s.cardT-=dt;if(s.cardT<=0){mark(s,'pp',w.x,w.y,'❗','',{color:'#D64545'});
      sitCard({s,icon:'👛',tone:'alert',title:'Карман полегчал!',text:`Из кошелька пропало ${fmtMoney(s.sum)}. Вон ${heShe(w,'парень','девушка')} в ${colorWord(w.p.clothes)} куртке быстро уходит.`,ttl:12,
        choices:[{t:'Догнать!',primary:true,run:()=>ppChase(s)},{t:'Заявить в полицию',run:()=>ppReport(s)},{t:'Махнуть рукой',run:()=>{sitMood(-8);endSit(s);}}],
        onTimeout:()=>{sitMood(-8);addEvent('Карманник растворился в толпе');endSit(s);}});}}
    if(s.phase==='quiet'||s.phase==='chase'){const m=SIT.marks.get('pp');if(m){m.x=w.x;m.y=w.y;}}
    if(s.phase==='quiet'){stepActor(w,dt);}
    else if(s.phase==='chase'){s.ct+=dt;if(stepActor(w,dt)){const q=awayPoint(w,120);moveActor(w,q[0],q[1],WALK_SPEED*1.33);}
      const d=dist(w.x,w.y,player.x,player.y);
      if(d<2.4&&!player.vehicle){s.phase='caught';s.chase=false;w.mv=null;faceTo(w,player.x,player.y);say(w,pick(['Всё-всё! На, забирай, только не бей!','Ладно, ладно! Держи свои деньги!','Ай! Отпусти, на, на!']));
        sitMoney(s.sum,'Вы догнали карманника и вернули деньги');sitRep(6,'поймали карманника');sitMood(12);unmark('pp');
        if(Math.random()<0.5){addEvent('Прохожие вызвали полицию — карманника задержат');callPatrol({x:w.x,y:w.y,target:()=>s.done?null:[w.x,w.y],say:'Так, кто тут у нас ворует?',onReach:(cop)=>{say(cop,'Попался, голубчик. Пройдёмте в машину.');s.endIn=3;},onFail:()=>{s.endIn=0.1;}});s.endIn=60;}
        else s.endIn=4;}
      else if(s.ct>35||d>95){s.phase='lost';s.chase=false;unmark('pp');releaseActor(w);s.actors=[];
        sitCard({s,icon:'🏃',title:'Ушёл дворами',text:'Карманник нырнул в подворотню и пропал. Можно написать заявление — иногда находят по камерам.',ttl:12,
          choices:[{t:'Заявить в полицию',primary:true,run:()=>ppReport(s)},{t:'Ладно, забыли',run:()=>{sitMood(-6);endSit(s);}}],onTimeout:()=>endSit(s)});}}
    else if(s.phase==='wait'){s.waitT-=dt;if(s.waitT<=0){if(s.found){const back=Math.round(s.sum*0.8/50)*50;sitMoney(back,'📞 Полиция: карманника задержали по камерам, деньги вернули');sitRep(2,'помогли полиции');}else addEvent('📞 Полиция: «По вашему заявлению пока никого не нашли. Ищем»');endSit(s);}}
    if(s.endIn!=null){s.endIn-=dt;if(s.endIn<=0)endSit(s);}},
  actionInside(s){if(s.phase==='report'&&inPolice())return {label:'Написать заявление о краже',run:()=>{spendTime(30);unmark('ppol');s.phase='wait';s.waitT=rnd(60,150);s.found=Math.random()<0.45;addEvent('Дежурный принял заявление: «Будем искать. Камеры на Баумана хорошие»');}};return null;},
  ctx(s,w){return s.phase==='caught'?'Ты карманник, тебя только что поймал за руку собеседник. Ты напуган и оправдываешься.':'Ты карманник и только что вытащил деньги у собеседника. Ты всё отрицаешь.';}});
function ppChase(s){s.phase='chase';s.chase=true;s.ct=0;const q=awayPoint(s.w,140);moveActor(s.w,q[0],q[1],WALK_SPEED*1.33);say(s.w,pick(['Чё надо?!','Отвали!']),2);setHint('Бегите за ним! Shift — бежать, догоните вплотную');}
function ppReport(s){s.phase='report';s.chase=false;unmark('pp');for(const w of s.actors)releaseActor(w);s.actors=[];const ps=markPolice(s,'ppol');s.maxT=s.t+900;setHint(ps?`Отдел полиции — ${Math.round(dist(ps.x,ps.y,player.x,player.y))} м. Зайдите и напишите заявление`:'Отдел полиции не найден');}

// ---------- ссора: толкнул на бегу / задели вас ----------
let bumpLast={x:0,y:0,cool:0};
defWatch(dt=>{const sp=dist(player.x,player.y,bumpLast.x,bumpLast.y)/Math.max(dt,0.001);bumpLast.x=player.x;bumpLast.y=player.y;bumpLast.cool-=dt;
  if(bumpLast.cool>0||!onFootCity()||sp<4.2||sp>12||sitActive('quarrel'))return;
  for(const w of walkers){if(w.bus||w.inside||w.sitBy||w.companion||w.rally||w.role!=='resident'||w.state==='hurt')continue;if(Math.abs(w.x-player.x)>1||Math.abs(w.y-player.y)>1)continue;if(dist(w.x,w.y,player.x,player.y)<0.95){bumpLast.cool=45;startSit('quarrel',{w,bump:true});return;}}});
defSit('quarrel',{title:'Ссора',auto:true,cool:420,get weight(){return (player.drunk||0)>=45?4:1;},
  when(){return onFootCity()&&crowdAround(player.x,player.y,15)>=2;},
  start(s){const w=s.w||findWalker(1,7);if(!w)return false;takeActor(s,w);s.w=w;faceTo(w,player.x,player.y);
    say(w,pick(s.bump?['Э, смотри куда прёшь!','Глаза разуй, а?','Ты чё толкаешься?!']:['Чё встал посреди дороги?!','Подвинься, а?','Ходят тут…']),5);
    sitCard({s,icon:'😠',tone:'alert',title:`${w.p.name} ${heShe(w,'недоволен','недовольна')}`,text:s.bump?'Вы толкнули прохожего на бегу.':`${w.p.name} задел${heShe(w,'','а')} вас плечом — и ещё возмущается.`,ttl:12,
      choices:[{t:s.bump?'Извиниться':'Спокойно ответить',primary:true,run:()=>{player.say={t:s.bump?'Извините, пожалуйста!':'Бывает, без проблем.',ttl:3};setTimeout(()=>{say(w,pick(['Ладно, бывает. Смотри под ноги.','Ну хорошо, проехали.','Ладно, и вы извините.']));sitRep(1);s.endIn=3;},900);}},
        {t:'Поговорить',run:()=>{s.talk=true;openChat(w);}},
        {t:'Ответить грубо',run:()=>qEscalate(s)}],
      onTimeout:()=>{say(w,pick(['Хамло!','Ну и иди.']));sitRep(-1);s.endIn=2;}});return true;},
  update(s,dt){if(s.talk&&chatNpc!==s.w){s.talk=false;s.endIn=2;}if(s.endIn!=null){s.endIn-=dt;if(s.endIn<=0)endSit(s);}},
  ctx(s,w){return s.fight?'Ты только что подрался с собеседником на улице, ты зол.':s.bump?'Собеседник только что толкнул тебя на бегу, ты раздражён. Если с тобой нормально поговорят — успокоишься.':'Ты только что толкнул собеседника плечом и огрызнулся. Ты не в духе, но можешь извиниться.';}});
function qEscalate(s){const w=s.w;player.say={t:pick(['Сам смотри!','Иди куда шёл!','Чё сказал?!']),ttl:3};
  setTimeout(()=>{if(s.done)return;if((player.drunk||0)>=45||Math.random()<0.55){s.fight=true;shake=0.9;say(w,'Ах ты…!',3);addEvent('Потасовка на улице! Прохожие звонят в полицию','alert');sitMood(-12);player.energy=clamp(player.energy-12,0,100);
      const x=player.x,y=player.y;setTimeout(()=>{if(!s.done){const q=awayPoint(w,60);moveActor(w,q[0],q[1],3.2);say(w,'Ещё встретимся!',3);}},2500);
      callPatrol({x,y,target:()=>scene==='city'&&!player.bus&&!player.vehicle?[player.x,player.y]:null,say:'Так, кто тут драку устроил?',
        onReach:(cop)=>{const fine=priorRecords()>=2?2000:1000;say(cop,`Мелкое хулиганство, статья 20.1. Штраф ${fine} рублей.`,6);sitMoney(-fine,'Штраф за мелкое хулиганство (ст. 20.1 КоАП)');dossier('драка на улице');sitRep(-6,'драка на улице');s.endIn=1;},
        onFail:()=>{addEvent('Полиция никого не нашла на месте драки');s.endIn=0.1;}});s.endIn=null;s.maxT=s.t+170;s.actorsUpdate=true;}
    else{say(w,'Да ну тебя, псих.');sitRep(-2);const q=awayPoint(w,50);moveActor(w,q[0],q[1],2.6);s.endIn=4;}},1200);}
SIT.defs.quarrel.update=function(s,dt){if(s.w&&s.w.mv)stepActor(s.w,dt);if(s.talk&&chatNpc!==s.w){s.talk=false;s.endIn=2;}if(s.endIn!=null){s.endIn-=dt;if(s.endIn<=0)endSit(s);}};

// ---------- человеку плохо ----------
defSit('sick',{title:'Человеку плохо',auto:true,weight:2,cool:700,
  when(){return onFootCity();},
  start(s){const w=findWalker(10,45);if(!w)return false;takeActor(s,w,'hurt');w.ttl=9999;s.w=w;
    mark(s,'sick',w.x,w.y,'🆘','Человеку плохо',{color:'#D64545',arrow:true});addEvent(`🆘 Прохожему плохо — ${placeName(w.x,w.y)}`,'alert');
    sitCard({s,icon:'🆘',tone:'alert',title:'Человеку плохо',text:`${w.p.name}, ${w.p.age} лет, упал${heShe(w,'','а')} на тротуаре ${placeName(w.x,w.y)} и не встаёт.`,ttl:15,
      choices:[{t:'Вызвать скорую (112)',primary:true,run:()=>sickCall(s,true)},{t:'Подбежать помочь',run:()=>{walkTo(w.x+0.8,w.y+0.8,true);setHint('Подойдите вплотную и нажмите E — первая помощь');}},{t:'Пройти мимо',run:()=>{sitRep(-3,'прошли мимо человека, которому плохо');s.autoT=20;}}],
      onTimeout:()=>{s.autoT=20;}});return true;},
  update(s,dt){const w=s.w;
    if(s.autoT!=null&&!s.ac&&!s.aided){s.autoT-=dt;if(s.autoT<=0){addEvent('Кто-то из прохожих вызвал скорую');sickCall(s,false);}}
    if(s.ac&&s.ac.amb&&s.ac.amb.state==='scene'&&s.byPlayer&&!s.waited&&dist(player.x,player.y,w.x,w.y)<25){s.waited=true;sitRep(4,'дождались скорую и помогли врачам');}
    if(w.state!=='hurt'&&!s.aided&&s.ac){s.endIn=s.endIn??3;}
    if(s.ac&&!accidents.includes(s.ac))s.endIn=s.endIn??1;
    if(s.endIn!=null){s.endIn-=dt;if(s.endIn<=0)endSit(s);}},
  action(s){const w=s.w;if(w.state==='hurt'&&!s.aided&&!s.aiding&&dist(w.x,w.y,player.x,player.y)<2.8)return {label:`Оказать первую помощь: ${w.p.name}`,run:()=>sickAid(s)};return null;},
  ctx(s,w){return 'Тебе только что стало плохо на улице, закружилась голова, ты слаб и говоришь тихо.';}});
function sickCall(s,byPlayer){if(s.ac)return;const w=s.w;s.ac=createAccident({x:w.x,y:w.y,kind:'ped',victim:w,medical:true,blocking:false,road:nearestRoadName(w.x,w.y)});s.byPlayer=byPlayer;
  if(byPlayer){sitRep(5,'вызвали скорую');sitMood(4);setHint('Скорая едет. Останьтесь рядом — так правильно');}unmark('sick');mark(s,'sick',w.x,w.y,'🚑','Ждут скорую',{color:'#D64545'});}
function sickAid(s){const w=s.w;s.aiding=true;player.busy=true;player.say={t:'Вы меня слышите? Дышите глубже…',ttl:3};
  setTimeout(()=>{player.busy=false;s.aiding=false;if(s.done)return;
    if(Math.random()<0.65){s.aided=true;w.state='sit';faceTo(w,player.x,player.y);say(w,pick(['Ох… голова закружилась. Спасибо вам!','Спасибо… давление, наверное. Уже лучше.']));sitRep(8,'помогли человеку на улице');sitMood(8);remember(w,'Тебе стало плохо на улице, игрок помог и привёл в чувство');unmark('sick');
      if(!s.ac)s.endIn=6;else{addEvent('Скорая всё равно осмотрит — так надёжнее');}}
    else{addEvent('Не приходит в себя — нужна скорая!','alert');sickCall(s,true);}},3000);}

// ---------- чужой кошелёк ----------
defSit('wallet',{title:'Кошелёк',auto:true,weight:2,cool:600,
  when(){return onFootCity();},
  start(s){const q=spotNear(10,28);if(!q)return false;s.item={x:q[0],y:q[1]};s.sum=Math.round(rnd(800,4200)/100)*100;const f=Math.random()<0.5;s.owner={n:pick(f?NAMES_F:NAMES_M)+' '+pick(f?['Галиева','Сафина','Иванова','Хасанова','Миннуллина']:['Галиев','Сафин','Иванов','Хасанов','Миннуллин']),f};
    s.phase='lying';mark(s,'wal',q[0],q[1],'👛','',{color:'#B07A3A'});setHint('Что-то блеснуло на тротуаре неподалёку…');s.maxT=420;return true;},
  update(s,dt){
    if(s.phase==='kept'){s.callIn-=dt;if(s.callIn<=0){s.phase='done';if(!s.caught){endSit(s);return;}
      sitCard({s,icon:'📞',tone:'call',urgent:true,title:'Звонит участковый',text:'«Кошелёк на тротуаре — ваших рук дело? Камера на доме всё сняла. Владелец написал заявление».',ttl:20,
        choices:[{t:'Признаться и вернуть',primary:true,run:()=>{sitMoney(-s.sum,'Вернули деньги владельцу');sitMoney(-1000,'Штраф');dossier('присвоил найденный кошелёк');endSit(s);}},
          {t:'Отпираться',run:()=>{sitMoney(-(s.sum+3000),'После разбирательства: деньги владельцу и штраф');dossier('присвоил найденный кошелёк, отпирался');sitRep(-5,'вранье участковому');endSit(s);}}],
        onTimeout:()=>{sitMoney(-(s.sum+1000),'Деньги владельцу и штраф (по повестке)');dossier('присвоил найденный кошелёк');endSit(s);}});}}
    if(s.phase==='police-wait'){s.waitT-=dt;if(s.waitT<=0){if(Math.random()<0.6)sitMoney(500,'📞 Владелец кошелька: «Спасибо! Перевёл вам немного»');endSit(s);}}
    if(s.endIn!=null){s.endIn-=dt;if(s.endIn<=0)endSit(s);}},
  action(s){if(s.phase==='lying'&&scene==='city'&&dist(s.item.x,s.item.y,player.x,player.y)<2.8)return {label:'Поднять кошелёк',run:()=>walletPick(s)};
    if(s.phase==='return'&&s.o&&dist(s.o.x,s.o.y,player.x,player.y)<3.2)return {label:`Отдать кошелёк: ${s.o.p.name}`,run:()=>walletGive(s)};return null;},
  actionInside(s){if(s.phase==='police'&&inPolice())return {label:'Сдать найденный кошелёк',run:()=>{spendTime(20);unmark('wpol');sitRep(6,'сдали находку в полицию');addEvent('Дежурный: «Спасибо. Владелец уже звонил — передадим»');s.phase='police-wait';s.waitT=rnd(60,120);}};return null;},
  draw(s,toS,z){if(s.phase!=='lying'||z<1.5)return;const [sx,sy]=toS(s.item.x,s.item.y);const k=Math.max(4,z*0.35);ctx.fillStyle='#7A4A2A';rrect(ctx,sx-k,sy-k*0.6,k*2,k*1.2,k*0.3);ctx.fill();ctx.fillStyle='rgba(255,240,180,'+(0.5+0.5*Math.sin(performance.now()/180))+')';ctx.beginPath();ctx.arc(sx+k*0.7,sy-k*0.7,k*0.35,0,TAU);ctx.fill();}});
function walletPick(s){s.phase='picked';unmark('wal');
  sitCard({s,icon:'👛',title:'Чужой кошелёк',text:`Внутри ${fmtMoney(s.sum)}, банковская карта и права на имя ${s.owner.n}.`,ttl:0,
    choices:[{t:'Найти владельца',primary:true,run:()=>walletOwner(s)},{t:'Отнести в полицию',run:()=>{s.phase='police';markPolice(s,'wpol');s.maxT=s.t+900;setHint('Зайдите в отдел полиции и сдайте находку');}},
      {t:'Оставить себе',run:()=>{sitMoney(s.sum,'Деньги из чужого кошелька');sitRep(-8,'присвоили чужой кошелёк');s.phase='kept';s.callIn=rnd(90,180);s.caught=Math.random()<0.4;s.maxT=s.t+400;}}]});}
function walletOwner(s){const o=findWalker(60,220);if(!o){s.phase='police';markPolice(s,'wpol');addEvent('Владельца в соцсетях не нашли — лучше отнести в полицию');return;}
  takeActor(s,o);s.o=o;o.p.name=s.owner.n.split(' ')[0];o.p.female=s.owner.f;s.phase='return';s.maxT=s.t+600;
  mark(s,'own',o.x,o.y,'🙋',o.p.name,{arrow:true,color:'#2BB062'});addEvent(`Нашли ${s.owner.f?'её':'его'} в соцсетях по фото с прав: ${o.p.name} ждёт ${placeName(o.x,o.y)}`);}
function walletGive(s){const o=s.o;const reward=Math.max(200,Math.round(s.sum*0.1/50)*50);faceTo(o,player.x,player.y);say(o,pick(['Вы меня спасли! Там же все документы. Возьмите, это вам!','Не может быть! Спасибо огромное, вот, возьмите.']));
  sitMoney(reward,'Вознаграждение за кошелёк');sitRep(10,'вернули кошелёк владельцу');sitMood(10);remember(o,'Игрок нашёл и вернул тебе потерянный кошелёк с деньгами и документами');unmark('own');s.phase='done';s.endIn=4;}

// ---------- потерялась собака ----------
const DOGS=[{n:'корги',c:'#D9883A'},{n:'шпиц',c:'#E8B04B'},{n:'лабрадор',c:'#E3C27A'},{n:'такса',c:'#7A4A2A'},{n:'хаски',c:'#9AA0A8'}];
defSit('dog',{title:'Пропала собака',auto:true,weight:1.5,cool:900,
  when(){return onFootCity();},
  start(s){const q=spotNear(80,180);if(!q)return false;const o=findWalker(60,220);if(!o)return false;takeActor(s,o);s.o=o;const b=pick(DOGS);
    s.dog={x:q[0],y:q[1],hx:1,hy:0,ph:0,tx:q[0],ty:q[1],home:q,T:0,name:pick(['Бублик','Чак-чак','Рыжик','Тузик','Сэм','Лаки']),breed:b.n,c:b.c};s.reward=pick([1000,1500,2000]);s.maxT=720;
    sitCard({s,icon:'🐕',title:`Пропала собака: ${s.dog.name}`,text:`Объявление на столбе: «Пропал ${b.n} ${s.dog.name}. Последний раз видели ${placeName(q[0],q[1])}. Вознаграждение ${fmtMoney(s.reward)}. Звонить: ${o.p.name}».`,ttl:16,
      choices:[{t:'Поискать',primary:true,run:()=>{mark(s,'dogarea',s.dog.home[0],s.dog.home[1],'🔍','Видели здесь',{arrow:true});setHint(`Ищите ${s.dog.name} рядом с меткой 🔍 и нажмите E`);}},{t:'Не до этого',run:()=>{}}]});return true;},
  update(s,dt){const d=s.dog;d.ph+=dt*8;let tx,ty,spd;
    if(s.follow){const tgt=s.give?[s.o.x+1,s.o.y]:[player.x,player.y];const dd=dist(d.x,d.y,tgt[0],tgt[1]);if(dd>1.6){tx=tgt[0];ty=tgt[1];spd=Math.min(WALK_SPEED*1.2,1.5+dd*0.8);}else{tx=d.x;ty=d.y;spd=0;}if(dd>60){d.x=tgt[0]+1;d.y=tgt[1];}}
    else{d.T-=dt;if(d.T<=0){d.T=rnd(2,5);const an=Math.random()*TAU,R=rnd(2,9);const nx=d.home[0]+Math.cos(an)*R,ny=d.home[1]+Math.sin(an)*R;if(!inBuilding(nx,ny)){d.tx=nx;d.ty=ny;}}tx=d.tx;ty=d.ty;spd=1.3;}
    const dd=dist(d.x,d.y,tx,ty);if(spd>0&&dd>0.2){const ux=(tx-d.x)/dd,uy=(ty-d.y)/dd;const st=Math.min(dd,spd*dt);const nx=d.x+ux*st,ny=d.y+uy*st;if(!inBuilding(nx,ny)){d.x=nx;d.y=ny;}d.hx=ux;d.hy=uy;d.moving=true;}else d.moving=false;
    if(s.follow&&!s.give){const m=SIT.marks.get('dogown');if(m){m.x=s.o.x;m.y=s.o.y;}}
    if(s.endIn!=null){s.endIn-=dt;if(s.endIn<=0)endSit(s);}},
  action(s){const d=s.dog;if(!s.follow&&scene==='city'&&dist(d.x,d.y,player.x,player.y)<3.5)return {label:`Позвать: «${d.name}, ко мне!»`,run:()=>{s.follow=true;unmark('dogarea');mark(s,'dogown',s.o.x,s.o.y,'🙋',`Хозяин${heShe(s.o,'','ка')}: ${s.o.p.name}`,{arrow:true,color:'#2BB062'});addEvent(`${d.name} радостно виляет хвостом и бежит за вами. Отведите к хозяину`);}};
    if(s.follow&&!s.give&&dist(s.o.x,s.o.y,player.x,player.y)<3.5)return {label:`Отдать ${d.name} хозяину`,run:()=>{s.give=true;faceTo(s.o,d.x,d.y);say(s.o,`${d.name}! Нашёлся! Спасибо вам огромное!`,6);sitMoney(s.reward,'Вознаграждение за собаку');sitRep(12,'вернули собаку хозяину');sitMood(15);remember(s.o,`Игрок нашёл и вернул тебе потерявшуюся собаку ${d.name}`);unmark('dogown');s.endIn=6;}};return null;},
  end(s){if(!s.give&&!s.follow)addEvent(`Объявление про ${s.dog.name} сняли — нашёлся`);},
  draw(s,toS,z){const d=s.dog;const [sx,sy]=toS(d.x,d.y);if(sx<-20||sx>W+20||sy<-20||sy>H+20)return;if(z<1.2){ctx.fillStyle=d.c;ctx.beginPath();ctx.arc(sx,sy,2.5,0,TAU);ctx.fill();return;}
    const k=z*0.42;ctx.save();ctx.translate(sx,sy);ctx.rotate(Math.atan2(d.hy,d.hx));const b=d.moving?Math.sin(d.ph)*0.12:0;
    ctx.fillStyle='rgba(0,0,0,.18)';ctx.beginPath();ctx.ellipse(0.1*k,0.35*k,0.9*k,0.45*k,0,0,TAU);ctx.fill();
    ctx.strokeStyle=d.c;ctx.lineWidth=0.18*k;ctx.lineCap='round';for(const [lx,ly] of [[0.45,0.28],[0.45,-0.28],[-0.45,0.28],[-0.45,-0.28]]){ctx.beginPath();ctx.moveTo(lx*k,ly*k);ctx.lineTo((lx+(lx>0?b:-b))*k,(ly*1.5)*k);ctx.stroke();}
    ctx.fillStyle=d.c;ctx.beginPath();ctx.ellipse(0,0,0.75*k,0.34*k,0,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(0.78*k,0,0.3*k,0,TAU);ctx.fill();
    ctx.beginPath();ctx.moveTo(-0.7*k,0);ctx.lineTo(-1.05*k,Math.sin(d.ph*1.6)*0.3*k);ctx.lineWidth=0.14*k;ctx.stroke();
    ctx.fillStyle='#2A1A10';ctx.beginPath();ctx.arc(1.04*k,0,0.08*k,0,TAU);ctx.fill();ctx.restore();
    if(!s.follow&&z>2){ctx.font='600 10px "IBM Plex Sans",system-ui';ctx.textAlign='center';ctx.fillStyle='rgba(20,30,26,.85)';const t=`🐕 ${d.name}`;const tw=ctx.measureText(t).width+10;rrect(ctx,sx-tw/2,sy-k*1.6-14,tw,15,5);ctx.fill();ctx.fillStyle='#fff';ctx.fillText(t,sx,sy-k*1.6-6);}}});

// ---------- уличный музыкант ----------
const BUSK_NOTES=['♪ ♫ ♪','♫ (играет Цоя) ♫','♪ (что-то татарское, душевное) ♪','♫ ♪ ♫','♪ (перебор на гитаре) ♪'];
defSit('busker',{title:'Уличный музыкант',auto:true,weight:2,cool:500,quiet:true,
  when(){const h=(clock.minutes/60)%24;return onFootCity()&&h>=10&&h<23&&weather.kind!=='rain';},
  start(s){const m=findWalker(15,70);if(!m)return false;takeActor(s,m);s.m=m;m.p.job='уличный музыкант, играет на гитаре';s.notesT=0;s.maxT=200;
    let k=0;for(const w of walkers){if(k>=6)break;if(w===m||w.bus||w.inside||w.sitBy||w.companion||w.rally||w.role!=='resident'||w.state==='hurt'||w===chatNpc)continue;if(w.state!=='walk'&&w.state!=='idle')continue;if(dist(w.x,w.y,m.x,m.y)>45)continue;
      takeActor(s,w);const an=Math.atan2(player.y-m.y,player.x-m.x)+(k-2.5)*0.45;const R=rnd(2.6,3.8);let tx=m.x+Math.cos(an)*R,ty=m.y+Math.sin(an)*R;if(inBuilding(tx,ty)){tx=m.x-Math.cos(an)*R;ty=m.y-Math.sin(an)*R;}moveActor(w,tx,ty,1.8);k++;}
    mark(s,'busk',m.x,m.y,'🎸','',{color:'#8E44AD'});addEvent(`🎸 ${placeName(m.x,m.y)} играет уличный музыкант — ${m.p.name}`);return true;},
  update(s,dt){const m=s.m;for(const w of s.actors){if(w===m)continue;if(stepActor(w,dt))faceTo(w,m.x,m.y);}
    s.notesT-=dt;if(s.notesT<=0){s.notesT=rnd(3.5,6);if(!s.busk)m.say={t:pick(BUSK_NOTES),ttl:3};}
    if(s.busk!=null){s.busk-=dt;s.bt=(s.bt||0)-dt;if(s.bt<=0){s.bt=2;player.say={t:pick(['♪ ♫ ♪','♫ ♪','♪ (поёте, как умеете) ♪']),ttl:1.8};}if(s.busk<=0){s.busk=null;buskEnd(s);}}
    if(s.endIn!=null){s.endIn-=dt;if(s.endIn<=0)endSit(s);}},
  action(s){const m=s.m;if(s.busk==null&&scene==='city'&&dist(m.x,m.y,player.x,player.y)<4.5)return {label:`Послушать: ${m.p.name} играет на гитаре`,run:()=>buskCard(s)};return null;},
  end(s){if(s.m)s.m.p.job='музыкант';},
  ctx(s,w){return w===s.m?'Ты уличный музыкант, играешь на гитаре на улице, перед тобой открытый чехол для денег.':'Ты остановился послушать уличного музыканта.';}});
function buskCard(s){const m=s.m;const drunk=(player.drunk||0)>=70;
  sitCard({s,icon:'🎸',title:`${m.p.name} играет на гитаре`,text:`${s.actors.length>1?'Вокруг собрались слушатели: '+(s.actors.length-1)+' чел':'Слушателей пока пара человек'}. Чехол от гитары открыт.`,ttl:0,
    choices:[{t:'Кинуть в чехол 100 ₽',primary:true,run:()=>{if(player.money<100){setHint('Нет мелочи');return;}sitMoney(-100);sitMood(6);say(m,'Спасибо, дружище!');}},
      {t:'Заказать песню · 300 ₽',run:()=>{if(player.money<300){setHint('Не хватает денег');return;}sitMoney(-300);sitMood(12);say(m,'♪ По заявке — для вас! ♪',5);}},
      ...(drunk?[]:[{t:'Попросить гитару и сыграть',run:()=>{say(m,'Ну давай, покажи класс!');player.busy=true;s.busk=12;s.bt=0;s.maxT=s.t+200;}}])]});}
function buskEnd(s){player.busy=false;const n=Math.max(0,s.actors.length-1)+Math.floor(crowdAround(player.x,player.y,14)/2);let earn=80+n*rnd(40,100)+((player.rep||0)>20?150:0)-((player.drunk||0)>=45?60:0);earn=Math.max(30,Math.round(earn/10)*10);
  const cut=Math.round(earn*0.3/10)*10;say(s.m,'Неплохо! Гитара моя — тридцать процентов мне, ха!',5);sitMoney(earn-cut,'Уличный концерт');sitMood(10);player.energy=clamp(player.energy-6,0,100);spendTime(40);sitRep(2);}
