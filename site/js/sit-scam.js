// ===== Мошенники: звонок «из банка», промоутер «бесплатной проверки» =====
const SCAM_CALLS=[
  {from:'+7 (495) 0…-…-27 · «Служба безопасности банка»',text:'«Здравствуйте! По вашей карте попытка перевода 48 000 ₽ в Новосибирск. Чтобы отменить, продиктуйте код из СМС».',give:'Продиктовать код из СМС',safe:'Сбросить и перезвонить в банк по номеру с карты',lose:[0.6,0.8]},
  {from:'+7 (843) 2…-…-11 · «Следователь»',text:'«Это следователь. Ваш родственник попал в ДТП, пострадал человек. Чтобы дело не завели, нужно срочно перевести деньги. Переведите прямо сейчас».',give:'Перевести деньги «следователю»',safe:'Сбросить и позвонить родственнику',lose:[0.5,0.7]},
  {from:'+7 (999) 3…-…-90 · «Госуслуги»',text:'«Ваш аккаунт на Госуслугах взломан. Для защиты продиктуйте код, который сейчас придёт, и мы переведём средства на защищённый счёт».',give:'Продиктовать код',safe:'Сбросить и зайти в Госуслуги самому',lose:[0.5,0.7]}];
defSit('scamcall',{title:'Звонок мошенников',auto:true,weight:2,cool:1100,quiet:true,
  when(){return !player.busy&&player.state!=='hurt'&&player.money>=1500&&!cine;},
  start(s){const c=pick(SCAM_CALLS);s.c=c;
    sitCard({s,icon:'📞',tone:'call',title:c.from,text:c.text,ttl:22,
      choices:[{t:c.give,run:()=>{const loss=Math.min(15000,Math.round(player.money*rnd(c.lose[0],c.lose[1])/100)*100);s.loss=loss;sitMoney(-loss,'Деньги ушли «на безопасный счёт»');sitMood(-25);s.phase='robbed';s.t2=4;}},
        {t:c.safe,primary:true,run:()=>{addEvent('Перезвонили сами: «Никаких операций не было. Это мошенники — вы молодец!»','say');sitMood(4);endSit(s);}},
        {t:'Просто сбросить',run:()=>endSit(s)}],
      onTimeout:()=>endSit(s)});return true;},
  update(s,dt){if(s.phase==='robbed'){s.t2-=dt;if(s.t2<=0){s.phase='after';
      sitCard({s,icon:'💸',tone:'alert',title:'Это были мошенники',text:`Банк и полиция никогда не просят коды из СМС и переводы «на безопасный счёт». Ушло ${fmtMoney(s.loss)}. Что делать?`,ttl:0,
        choices:[{t:'Позвонить в банк и заявить в полицию',primary:true,run:()=>{s.phase='report';markPolice(s,'scpol');setHint('Банк заблокировал карту. Заявление — в отделе полиции');}},{t:'Ничего уже не сделать',run:()=>{sitMood(-5);endSit(s);}}]});}}
    if(s.phase==='wait'){s.w-=dt;if(s.w<=0){if(s.back){const back=Math.round(s.loss*0.5/100)*100;sitMoney(back,'📞 Банк: часть перевода успели заморозить и вернули');}else addEvent('📞 Полиция: «Деньги ушли на карты подставных людей. Дело возбуждено, ищем»');endSit(s);}}},
  actionInside(s){if(s.phase==='report'&&inPolice())return {label:'Заявление о мошенничестве',run:()=>{clock.minutes+=40;unmark('scpol');s.phase='wait';s.w=rnd(80,160);s.back=Math.random()<0.3;addEvent('Заявление приняли. «Чем быстрее заявили — тем больше шансов»');}};return null;}});

defSit('promoter',{title:'Промоутер',auto:true,weight:1.5,cool:900,
  when(){const h=(clock.minutes/60)%24;return onFootCity()&&h>=10&&h<20;},
  start(s){const w=findWalker(10,30);if(!w)return false;takeActor(s,w);s.w=w;w.p.job='промоутер «медицинского центра»';s.phase='go';moveActor(w,player.x,player.y,2.8);return true;},
  update(s,dt){const w=s.w;
    if(s.phase==='go'){if(w.mv&&w.mv.wps.length){const last=w.mv.wps[w.mv.wps.length-1];last[0]=player.x;last[1]=player.y;}stepActor(w,dt);
      if(dist(w.x,w.y,player.x,player.y)<2.6){s.phase='talk';w.mv=null;faceTo(w,player.x,player.y);say(w,'Добрый день! У нас акция — бесплатная проверка зрения! Две минуты, пройдёмте!',6);
        sitCard({s,icon:'👓',title:'«Бесплатная проверка зрения»',text:`${heShe(w,'Улыбчивый парень','Улыбчивая девушка')} с планшетом зовёт в «медицинский центр» за углом. Говорит, это займёт две минуты.`,ttl:14,
          choices:[{t:'Нет, спасибо',primary:true,run:()=>{say(w,'Ну и зря! Такая акция!');promoLeave(s);}},{t:'Пойти на проверку',run:()=>promoSalon(s)}],
          onTimeout:()=>{say(w,'Ну, как хотите…');promoLeave(s);}});}
      else if(s.t>40)promoLeave(s);}
    if(s.phase==='leave'){if(stepActor(w,dt))endSit(s);}
    if(s.phase==='claim'){s.cw-=dt;if(s.cw<=0){if(Math.random()<0.6){sitMoney(3500,'Претензия сработала: договор расторгли, взнос вернули');sitMood(10);}else addEvent('Претензию отклонили. «Обращайтесь в суд». Кредит придётся гасить','alert');endSit(s);}}
    if(s.phase==='loan'){s.lw-=dt;if(s.lw<=0){s.phase='loan2';
      sitCard({s,icon:'📩',tone:'alert',title:'СМС из банка',text:'«Оформлен кредит на 34 500 ₽ по договору с ООО „Оптика-Плюс“». Очки, которые «всего 3 500», оказались в кредит. По закону можно потребовать расторжения — написать претензию.',ttl:0,
        choices:[{t:'Написать претензию',primary:true,run:()=>{s.phase='claim';s.cw=rnd(80,140);addEvent('Претензия отправлена. Ждём ответа');}},{t:'Смириться',run:()=>{sitMood(-10);endSit(s);}}]});}}},
  ctx(s,w){return 'Ты промоутер сомнительного «медицинского центра», зазываешь людей на «бесплатную проверку зрения», где им навязывают дорогие очки в кредит. Ты очень настойчив и улыбчив.';}});
function promoLeave(s){const w=s.w;s.phase='leave';const q=awayPoint(w,40);moveActor(w,q[0],q[1],2.4);}
function promoSalon(s){clock.minutes+=40;s.phase='salon';releaseActor(s.w);s.actors=[];addEvent('Сорок минут «проверки» в тесном кабинете…');
  sitCard({s,icon:'👓',tone:'alert',title:'«Серьёзные проблемы со зрением»',text:'«Доктор» качает головой: срочно нужны очки за 38 000 ₽. Но сегодня по акции — «всего» 3 500 ₽ первый взнос, подпишите тут и тут.',ttl:0,
    choices:[{t:'Отказаться и уйти',primary:true,run:()=>{sitMood(-3);addEvent('Вы ушли. Потеряли только время');endSit(s);}},{t:'Подписать договор',run:()=>{sitMoney(-Math.min(3500,player.money),'Первый взнос за очки');sitMood(-12);s.phase='loan';s.lw=rnd(60,120);}}]});}
