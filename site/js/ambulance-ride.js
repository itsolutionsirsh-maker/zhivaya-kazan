// Скорая: поездка с фельдшером, потом палата. Для ДТП игрока и если сбили пешехода.
(function(){
  function el(tag,css,text){const n=document.createElement(tag);if(css)n.style.cssText=css;if(text!=null)n.textContent=text;return n;}
  function bubble(log,mine,who,text){
    const row=el('div','display:flex;justify-content:'+(mine?'flex-end':'flex-start')+';margin:6px 0');
    const b=el('div','max-width:86%;padding:8px 10px;border-radius:12px;background:'+(mine?'#2F6B4F':'#24302a')+';color:#f4f1e8;font:14px/1.4 "IBM Plex Sans",system-ui');
    if(!mine&&who)b.append(el('div','font-size:11px;opacity:.7;margin-bottom:2px',who));
    b.append(document.createTextNode(text));
    row.append(b);log.append(row);log.scrollTop=log.scrollHeight;
  }
  function scene(o,done){
    const root=el('section','position:fixed;inset:0;z-index:160;background:#10161a;display:flex;align-items:center;justify-content:center;padding:16px');
    const box=el('div','width:min(460px,100%);max-height:min(92vh,760px);display:flex;flex-direction:column;background:#17211d;border-radius:16px;overflow:hidden;box-shadow:0 16px 40px rgba(0,0,0,.45)');
    const pic=el('img','width:100%;height:210px;object-fit:cover;object-position:center 30%;display:block');
    pic.src=o.gif||o.pic;pic.alt='';
    const head=el('div','padding:10px 14px 0');
    head.append(el('div','font:600 11px "IBM Plex Sans",system-ui;letter-spacing:.12em;color:#9bb0a6','ЖИВАЯ КАЗАНЬ · СКОРАЯ'));
    head.append(el('h2','margin:4px 0 8px;font:600 18px/1.3 "IBM Plex Sans",system-ui;color:#f4f1e8',o.title));
    const log=el('div','flex:1;overflow:auto;padding:4px 14px 8px;min-height:140px');
    const foot=el('div','display:flex;flex-direction:column;gap:8px;padding:10px 14px 14px');
    box.append(pic,head,log,foot);root.append(box);document.body.append(root);
    if(typeof player!=='undefined')player.busy=true;
    let i=0;
    function ask(){
      foot.innerHTML='';
      if(i>=o.steps.length){const b=el('button','padding:10px 12px;border:0;border-radius:10px;background:#2F9E6B;color:#fff;font:600 14px "IBM Plex Sans",system-ui;cursor:pointer',o.done||'Дальше');b.type='button';b.onclick=()=>{root.remove();done&&done();};foot.append(b);return;}
      const step=o.steps[i];
      setTimeout(()=>{bubble(log,false,step.who,step.q);step.replies.forEach(r=>{
        const b=el('button','text-align:left;padding:10px 12px;border:0;border-radius:10px;background:#2a3a34;color:#f4f1e8;font:14px "IBM Plex Sans",system-ui;cursor:pointer',r.t);
        b.type='button';b.onclick=()=>{foot.innerHTML='';bubble(log,true,'',r.say);if(r.then)setTimeout(()=>bubble(log,false,step.who,r.then),500);i++;setTimeout(ask,r.then?900:400);};
        foot.append(b);
      });},280);
    }
    ask();
  }
  function pack(o){
    const road=o.road?` на ${o.road}`:'';
    const name=o.name||'пешеход';
    const hosp=o.hospital||'больницу';
    if(o.mode==='ped')return {
      ride:{title:'Скорая. Едем в больницу',gif:'img/story/amb.gif',pic:'img/story/amb.jpg',done:'Мы у приёмного',steps:[
        {who:'Фельдшер',q:`Пострадавшего забрали${road}. Вы за рулём были?`,replies:[
          {t:'Да, это я сбил',say:`Да. Я ехал${road} и не успел затормозить. Это ${name}.`,then:'Понял. Дышит, в сознании. Везим на осмотр, не в реанимацию.'},
          {t:'Не заметил человека',say:`Человек вышел слишком близко. Зовут, кажется, ${name}.`,then:'Имя запишем. Скорость потом спросит ГИБДД, нам сейчас важно, как он.'}
        ]},
        {who:'Фельдшер',q:'Сами целы? Голова не кружится?',replies:[
          {t:'Я в порядке',say:'Меня не задело. Я поехал с вами, чтобы не бросать человека.',then:`Хорошо. До «${hosp}» минут десять. Сидите и не мешайте бригаде.`},
          {t:'Руки трясутся',say:'Физически цел, но руки до сих пор трясутся.',then:'Это нормально. В приёмном врач глянет и вас тоже, быстро.'}
        ]}
      ]},
      ward:{title:'Приёмный покой',gif:'img/story/ward.gif',pic:'img/story/ward.jpg',done:'Выйти на улицу',steps:[
        {who:'Врач',q:`${name} жив. Ушиб, не перелом. Вы водитель?`,replies:[
          {t:'Да, я был за рулём',say:'Да. Я готов рассказать, как это вышло.',then:'Следствию хватит протокола ГИБДД. От вас сейчас ничего не берём.'},
          {t:'Мне очень жаль',say:`Мне жаль. Я не хотел сбивать ${name}.`,then:'Слышу. Человека оставляем здесь. Вас выпускаем к больнице.'}
        ]},
        {who:'Врач',q:'Вам самому осмотр нужен или выйдете?',replies:[
          {t:'Я выйду',say:'Со мной всё нормально. Я выйду и подожду новостей снаружи.',then:'Хорошо. Карман не трогаем: вы не пациент.'},
          {t:'Гляньте быстро',say:'Гляньте, если можно. Вдруг я тоже стукнулся.',then:'Зрачки ровные, давления нет. Идите. Если закружится — вернётесь.'}
        ]}
      ]}
    };
    if(o.mode==='crash')return {
      ride:{title:'Скорая. После ДТП',gif:'img/story/amb.gif',pic:'img/story/amb.jpg',done:'Мы у больницы',steps:[
        {who:'Фельдшер',q:`Вас забрали с ДТП${road}. Голова кружится?`,replies:[
          {t:'Немного',say:'Немного мутит. Ударился о ремень, не о стекло.',then:'Ремень сработал — уже хорошо. До больницы полежите.'},
          {t:'Вроде цел',say:'Вроде цел. Просто испугался и не могу толком вдохнуть.',then:'Грудь проверим на месте. Сейчас не вставайте резко.'}
        ]},
        {who:'Фельдшер',q:'Другой водитель на месте остался?',replies:[
          {t:'Да, машины стоят',say:'Да. Обе машины на месте, ГИБДД уже вызвали.',then:'Тогда нам только вы. Страховая — их забота.'},
          {t:'Я плохо помню удар',say:'Удар помню плохо. Потом сразу ваша машина.',then:'Так и запишем. Врач спросит то же самое спокойнее.'}
        ]}
      ]},
      ward:{title:'Палата. Осмотр',gif:'img/story/ward.gif',pic:'img/story/ward.jpg',done:'Выйти на улицу',steps:[
        {who:'Врач',q:'Сотрясения нет. Ушиб грудной клетки от ремня. Лежать не будем.',replies:[
          {t:'Спасибо, я выйду',say:'Спасибо. Дышать уже легче, я выйду.',then:'Если к вечеру затошнит — возвращайтесь. Сейчас можете идти.'},
          {t:'А кости целы?',say:'Рентген не нужен? Боюсь, что треснуло.',then:'Целы. Синяк будет, перелома нет. Отдыхайте пару дней.'}
        ]}
      ]}
    };
    return {
      ride:{title:'Скорая. Вас везут',gif:'img/story/amb.gif',pic:'img/story/amb.jpg',done:'Мы в больнице',steps:[
        {who:'Фельдшер',q:'Слышите меня? Где болит?',replies:[
          {t:'Бок и нога',say:'Слышу. Бок и нога. Головой вроде не бился.',then:'Сознание ясное. Ногу зафиксируем, в больнице снимут.'},
          {t:'Голова кружится',say:'Голова кружится, и плечо ноет.',then:'Не спите, пока едем. Врач встретит у приёмного.'}
        ]},
        {who:'Фельдшер',q:`Что случилось${road}?`,replies:[
          {t:'Меня сбила машина',say:`Меня сбила машина${road}. Я шёл, она не успела остановиться.`,then:`Понял. До «${hosp}» близко. Дышите ровно.`},
          {t:'Не помню удар',say:'Помню дорогу, а сам удар — нет. Очнулся уже у вас.',then:'Бывает. Это важно для врача, я передам.'}
        ]}
      ]},
      ward:{title:'Палата',gif:'img/story/ward.gif',pic:'img/story/ward.jpg',done:'Выйти на улицу',steps:[
        {who:'Врач',q:'Осмотрели. Перелома нет, ушибы. Лежать не оставляем.',replies:[
          {t:'Болит, но идти могу',say:'Болит, но встать могу. Что дальше?',then:'Обработали. Оплата за приём небольшая, потом выйдете к больнице.'},
          {t:'Голова ещё шумит',say:'Голова ещё шумит. Это пройдёт?',then:'Пройдёт. Если вырвет или двоится — сразу назад. Сейчас отпускаем.'}
        ]},
        {who:'Врач',q:'Документы и деньги при вас были. Ничего не пропало.',replies:[
          {t:'Спасибо',say:'Спасибо. Я выйду и отдохну на улице.',then:'Идите медленно. Скорая своё сделала.'},
          {t:'Можно уже домой?',say:'Можно домой или лучше ещё посидеть?',then:'Домой можно. Резко не бегайте сегодня.'}
        ]}
      ]}
    };
  }
  function ambulanceRide(o,onDone){
    const p=pack(o||{});
    scene(p.ride,()=>scene(p.ward,onDone));
  }
  window.ambulanceRide=ambulanceRide;
})();
