// Свои люди и память районов. Старые файлы не трогает.
// Подключить после situations.js:
//   <script src="js/people.js"></script>
(function(){
  if(window.__cityPeople) return;
  function boot(){
    if(window.__cityPeople) return;
    if(typeof defSit!=='function'||typeof defWatch!=='function') return;
    window.__cityPeople=true;

    const life=cityBag();
    const FOLK=[
      {id:'alsu', name:'Алсу', female:true, job:'бармен на Баумана', ward:'bauman',
        invite:'Алсу с Баумана зовёт на день рождения. «Ты тогда не прошёл мимо — приходи».',
        bio:'Держит бар на Баумана. Помнит, кто пил и кто просто сидел. Днём спит, к вечеру уже за стойкой.',
        speech:'Коротко, на «ты», без сюсюканья. Может поддеть, но стакан не забудет.',
        trait:'острая на язык', age:27,
        dayOff:[[0,'home'],[17,'work'],[23,'home']],
        day:[[0,'home'],[16,'work'],[23,'home']],
        work:{kind:'bar', hints:['бауман']},
        haunt:{kind:'bar', hints:['бауман']}},
      {id:'lenar', name:'Ленар', job:'уличный музыкант', ward:'bauman',
        invite:'Ленар пишет: «Сегодня играю не один. Будет стол, приходи».',
        bio:'Играет на Баумана, пока люди идут. Чехол открыт, репертуар под толпу. Зимой уходит в кафе погреться.',
        speech:'Говорит тихо и чуть в сторону. Шутит в полголоса, длинных речей не любит.',
        trait:'мечтатель', age:24,
        dayOff:[[0,'home'],[12,'work'],[21,'haunt']],
        day:[[0,'home'],[14,'work'],[22,'haunt']],
        work:{kind:'street', hints:['бауман']},
        haunt:{kind:'cafe', hints:['бауман']}},
      {id:'marat', name:'Марат', job:'таксист', ward:'yard',
        invite:'Марат, таксист, зовёт на плов. «Ты нормальный пассажир, таких мало».',
        bio:'Возит смену по всему центру. Знает, где пробка, раньше навигатора. После смены ест плов и молчит.',
        speech:'Деловито, как по рации. «Садись», «приехали», «не суетись».',
        trait:'ворчит, но довезёт', age:52,
        dayOff:[[0,'home'],[10,'work'],[20,'haunt'],[23,'home']],
        day:[[6,'work'],[15,'home'],[16,'work'],[21,'haunt'],[23,'home']],
        work:{kind:'taxi', hints:['бауман','свобод']},
        haunt:{kind:'cafe', hints:['свобод']}},
      {id:'gulnara', name:'Гульнара', female:true, job:'фармацевт', ward:'yard',
        invite:'Гульнара из аптеки: «Завтра у меня день рождения, чай после смены».',
        bio:'Стоит за первым столом в аптеке у дворов. Объясняет дозировку дважды. После смены пьёт чай, не вино.',
        speech:'Спокойно и точно. Сначала дело, потом «как вы сами».',
        trait:'вежливая и точная', age:38,
        dayOff:[[0,'home'],[13,'haunt'],[18,'home']],
        day:[[8,'home'],[9,'work'],[18,'haunt'],[21,'home']],
        work:{kind:'pharmacy', hints:['аптек']},
        haunt:{kind:'cafe', hints:['бауман']}},
      {id:'fidania', name:'Фидания', female:true, job:'соседка', ward:'yard',
        invite:'Соседка Фидания стучит в дверь: «Не шумный ты. Приходи вечером, чак-чак пекла».',
        bio:'Живёт в том же дворе. Видит, кто во сколько пришёл. Печёт больше, чем съедает одна.',
        speech:'По-соседски, чуть громче, чем надо. Называет по делу и сразу зовёт чай.',
        trait:'знает весь двор', age:69,
        day:[[0,'home'],[10,'yard'],[13,'home'],[17,'yard'],[21,'home']],
        dayOff:[[0,'home'],[10,'yard'],[13,'home'],[16,'yard'],[21,'home']],
        work:{kind:'home', hints:[]},
        haunt:{kind:'home', hints:[]}},
      {id:'ildar', name:'Ильдар', job:'фанат «Рубина»', ward:'stadium',
        invite:'Ильдар пишет перед матчем: «Если будешь у арены — наш ряд, без драки».',
        bio:'В будни стоит за прилавком. В день матча уже у арены, шарф в кармане, пока не стемнеет.',
        speech:'Быстро, спортивными обрывками. Про игру может говорить долго, про остальное — нет.',
        trait:'болеет громко', age:31,
        day:[[0,'home'],[9,'work'],[18,'home'],[19,'haunt'],[23,'home']],
        dayOff:[[0,'home'],[13,'haunt'],[23,'home']],
        work:{kind:'shop', hints:['бауман'], label:'магазин'},
        haunt:{kind:'cafe', hints:['ак барс','казань арен','стадион']}},
      {id:'zulfiya', name:'Зульфия', female:true, job:'учительница', ward:'kremlin',
        invite:'Зульфия зовёт на чай у Кремля. «Редкость сейчас — человек, который помогает».',
        bio:'Ведёт уроки у Кремля. После звонка идёт пешком, не через толпу туристов. Чай для неё — разговор, не угощение.',
        speech:'Ровно, как в классе. Не повышает голос и не прощает пустой болтовни.',
        trait:'поправляет, но мягко', age:45,
        dayOff:[[0,'home'],[11,'haunt'],[16,'home']],
        day:[[7,'home'],[8,'work'],[16,'haunt'],[20,'home']],
        work:{kind:'office', hints:['кремл'], label:'школа у Кремля'},
        haunt:{kind:'cafe', hints:['кремл']}},
      {id:'rinat', name:'Ринат', job:'повар', ward:'freedom',
        invite:'Ринат с площади Свободы: «После события останется стол. Приходи, пока горячее».',
        bio:'Готовит у площади Свободы. В праздник кормит площадь, в обычный день — смену. Уходит последним, когда плита остыла.',
        speech:'Коротко и тепло. Говорит про еду конкретнее, чем про людей.',
        trait:'кормит раньше, чем спрашивает', age:41,
        dayOff:[[0,'home'],[11,'work'],[21,'home']],
        day:[[8,'home'],[10,'work'],[20,'haunt'],[23,'home']],
        work:{kind:'restaurant', hints:['свобод']},
        haunt:{kind:'cafe', hints:['свобод']}}
    ];
    window.cityFolk=FOLK;
    const WARD_NAME={bauman:'Баумана', yard:'дворы', stadium:'арена', kremlin:'Кремль', freedom:'площадь Свободы'};

    function note(text){life.notes.push({day:clock.day,text:String(text)});if(life.notes.length>24)life.notes.shift();life.save();}
    function hour(){return Math.floor((clock.minutes/60)%24);}
    function onFoot(){return scene==='city'&&!player.vehicle&&!player.bus&&player.state!=='hurt';}

    function wardAt(x,y){
      const road=typeof nearestRoadName==='function'?(nearestRoadName(x,y)||''):'';
      const place=typeof placeName==='function'?placeName(x,y):'';
      const n=(road+' '+place).toLowerCase();
      if(/бауман/.test(n)) return 'bauman';
      if(/ак барс|казань арен|татнефть|стадион/.test(n)) return 'stadium';
      if(/кремл/.test(n)) return 'kremlin';
      if(/свобод/.test(n)) return 'freedom';
      return 'yard';
    }
    function bestWard(){let id='yard',v=-999;for(const k in life.wards){if(k==='save')continue;if((life.wards[k]||0)>v){v=life.wards[k];id=k;}}return {id,v:life.wards[id]||0};}

    if(life.lastRep==null) life.lastRep=player.rep||0;
    defWatch(function(){
      const r=player.rep||0;
      if(r!==life.lastRep){
        const d=r-life.lastRep; life.lastRep=r;
        const w=wardAt(player.x,player.y);
        life.wards[w]=(life.wards[w]||0)+d;
        if(d>0) note((WARD_NAME[w]||w)+': о вас говорят лучше');
        else life.save();
      }
    });

    function folkFor(){
      const b=bestWard();
      return FOLK.find(f=>f.ward===b.id&&!life.met[f.id])||FOLK.find(f=>!life.met[f.id])||FOLK[0];
    }

    defSit('birthday',{title:'Звонок', auto:true, weight:2, cool:800, quiet:true,
      when(){return clock.day>=3&&!life.invited&&onFoot()&&hour()>=16&&hour()<=21&&((player.rep||0)>=8||bestWard().v>=4);},
      start(s){const f=folkFor(); s.folk=f; life.invited=true; life.met[f.id]=clock.day; life.save();
        sitCard({s, icon:'🎂', tone:'good', title:f.name, text:f.invite, ttl:16,
          choices:[
            {t:'Приду', primary:true, run:()=>{life.party=clock.day+1; note('Обещал прийти к '+f.name); sitMood(6); endSit(s);}},
            {t:'Не смогу', run:()=>{note('Отказал '+f.name); sitMood(-2); endSit(s);}}
          ],
          onTimeout:()=>endSit(s)});
        return true;}});

    defSit('party',{title:'День рождения', auto:false,
      start(s){const f=s.folk; const w=typeof findWalker==='function'?findWalker(8,40):null;
        if(w){takeActor(s,w); w.p.name=f.name; w.p.female=!!f.female; w.p.job=f.job; s.w=w; faceTo(w,player.x,player.y); say(w,'Пришёл всё-таки. Садись, ты свой.'); remember(w,'Игрок пришёл к тебе в гости после того, как помог в городе');}
        sitRep(4,'пришли, когда звали'); sitMood(10); note('Был у '+f.name);
        life.party=false; life.save(); s.endIn=8; return true;},
      update(s,dt){if(s.endIn!=null){s.endIn-=dt;if(s.endIn<=0)endSit(s);}}});

    defWatch(function(){
      if(!life.party||typeof life.party!=='number') return;
      if(clock.day<life.party||hour()<18||hour()>22||!onFoot()||sitActive('party')) return;
      const f=FOLK.find(x=>life.met[x.id])||FOLK[0];
      startSit('party',{folk:f});
    });

    defSit('week',{title:'Неделя', auto:false, quiet:true,
      start(s){const b=bestWard();
        const lines=life.notes.slice(-6).map(n=>'· '+n.text);
        const where=b.v?('Сильнее всего вас помнят: '+WARD_NAME[b.id]+' ('+(b.v>0?'+':'')+b.v+').'):'Город пока почти не различает вас.';
        const missed=life.notes.filter(n=>/^Пропустил/.test(n.text)).slice(-2).map(n=>n.text);
        const text=[where].concat(lines).concat(missed.length?['Мимо прошло: '+missed.join('; ')]:[]).join('\n');
        life.recap=clock.day; life.save();
        sitCard({s, icon:'🗓', title:'Неделя в Казани', text:text||'Тихая неделя. Город вас ещё не запомнил.', ttl:0,
          choices:[{t:'Дальше', primary:true, run:()=>endSit(s)}]});
        return true;}});

    defWatch(function(){
      if(clock.day<8||life.recap||hour()<8||sitActive('week')) return;
      startSit('week');
    });
  }
  function cityBag(){
    if(window.cityLife&&window.cityLife.save) return window.cityLife;
    let raw={}; try{raw=JSON.parse(localStorage.getItem('zk.citylife')||'{}')||{};}catch(e){}
    const o=Object.assign({seen:{},notes:[],block:'',wards:{},invited:false,recap:false,party:false,lastRep:null,met:{},roadTill:0}, raw);
    o.save=function(){const dump={}; for(const k in o) if(k!=='save') dump[k]=o[k]; try{localStorage.setItem('zk.citylife',JSON.stringify(dump));}catch(e){}};
    window.cityLife=o; return o;
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
