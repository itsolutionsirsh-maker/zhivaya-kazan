// Вызов 112: УАЗ по дороге в отдел, потом дежурка. Вопросы в чате, ответы кнопками.
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
    const head=el('div','padding:10px 14px 0','');
    head.append(el('div','font:600 11px "IBM Plex Sans",system-ui;letter-spacing:.12em;color:#9bb0a6','ЖИВАЯ КАЗАНЬ · ПОЛИЦИЯ'));
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
  function policeRide(o){
    o=o||{};const place=o.place||'кафе',who=o.who||'незнакомка',sum=o.sum>0?(typeof fmtMoney==='function'?fmtMoney(o.sum):o.sum+' ₽'):'десятки тысяч';
    scene({title:'УАЗ. Едем в отдел',gif:'img/story/uaz.gif',pic:'img/story/uaz.jpg',done:'Мы на месте',steps:[
      {who:'Сержант',q:'Так, что случилось? Вызывали вы?',replies:[
        {t:'Меня разводили на счёт',say:'Да, я. Подошла на улице, познакомились, позвала перекусить. Счёт огромный, а сама ушла.',then:'Понял. Имя хоть сказала?'},
        {t:'Охрана не выпускала',say:'Охрана стояла у двери: пока не заплачу, выводили во двор.',then:'Ясно. Это уже не «посидеть». Как её звали?'}
      ]},
      {who:'Сержант',q:'Как выглядела? Имя настоящее, как думаете?',replies:[
        {t:`Представилась: ${who}`,say:`Сказала, что её зовут ${who}. Яркая, сама подошла. Имя, скорее всего, ненастоящее.`,then:'Так они часто. Запомним.'},
        {t:'Имя вряд ли настоящее',say:'Молодая, нарядная, говорила легко: привет, как дела, я проголодалась. Имени я бы не верил.',then:'Ладно. Внешность в протокол пойдёт.'}
      ]},
      {who:'Сержант',q:'Сколько насчитали?',replies:[
        {t:`Около ${sum}`,say:`По счёту вышло ${sum}. Меню сначала прятали.`,then:'Сорок-пятьдесят — их обычный вечер. В отделе запишем дословно.'},
        {t:'Меню не показывали',say:'Цен не было, пока я сам не попросил. Потом цифры как за ресторан на набережной.',then:'Это важно. Дежурный спросит ещё раз, своими словами.'}
      ]}
    ]},()=>scene({title:'Отдел. Дежурная часть',gif:'img/story/desk.gif',pic:'img/story/desk.jpg',done:'Подписать и выйти',steps:[
      {who:'Дежурный',q:`Садитесь. Где это было? ${place}?`,replies:[
        {t:`Да, ${place}`,say:`Да. Заведение называлось ${place}. На улице она сказала, что кафе рядом.`,then:'Запишем название. Настоящее оно или вывеска — проверим.'},
        {t:'Она сама туда вела',say:'Я адреса не знал. Она шла впереди и говорила, что просто перекусим и познакомимся.',then:'Так и напишем: привели, меню не показали.'}
      ]},
      {who:'Дежурный',q:'Кто ещё был? Официант, охрана?',replies:[
        {t:'Официант и охранник',say:'Официант твердил, что недорого. Охранник стоял у двери и спрашивал, будем платить или нет.',then:'Охрана в таких историях всегда «просто разговаривает». Отмечу.'},
        {t:'Она заказала и ушла',say:`${who} заказывала сама: шампанское, устрицы. Потом «на минутку» и не вернулась.`,then:'Классика. Её ищем, с вас — только то, что вы сами заказали. Сейчас ничего не берём.'}
      ]},
      {who:'Дежурный',q:'Подпишете заявление?',replies:[
        {t:'Подпишу',say:'Подпишу. Пусть проверят заведение и её, не меня.',then:'Принято. КУСП заведём. Вас высадим у отделения.'},
        {t:'Подпишу, и пусть ищут её',say:'Да. Я пришёл познакомиться и перекусить, а не закрывать чужой счёт.',then:'Хорошо. Бумага уйдёт дальше. Если найдётся свидетель из зала — дело крепче.'}
      ]}
    ]},o.onDone));
  }
  window.policeRide=policeRide;
})();
