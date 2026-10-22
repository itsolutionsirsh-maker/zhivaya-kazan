// Свои люди и память районов. Старые файлы не трогает.
// Подключить после situations.js:
//   <script src="js/people.js"></script>
(function(){
  if(window.__cityPeople) return;
  function boot(){
    if(window.__cityPeople) return;
    if(typeof defSit!=='function'||typeof defWatch!=='function') return;
    window.__cityPeople=true;

    const KEY='zk.citylife';
    const FOLK=[
      {id:'alsu', name:'Алсу', female:true, job:'бармен на Баумана', ward:'bauman', invite:'Алсу с Баумана зовёт на день рождения. «Ты тогда не прошёл мимо — приходи».'},
      {id:'lenar', name:'Ленар', job:'уличный музыкант', ward:'bauman', invite:'Ленар пишет: «Сегодня играю не один. Будет стол, приходи».'},
      {id:'marat', name:'Марат', job:'таксист', ward:'yard', invite:'Марат, таксист, зовёт на плов. «Ты нормальный пассажир, таких мало».'},
      {id:'gulnara', name:'Гульнара', female:true, job:'фармацевт', ward:'yard', invite:'Гульнара из аптеки: «Завтра у меня день рождения, чай после смены».'},
      {id:'fidania', name:'Фидания', female:true, job:'соседка', ward:'yard', invite:'Соседка Фидания стучит в дверь: «Не шумный ты. Приходи вечером, чак-чак пекла».'},
      {id:'ildar', name:'Ильдар', job:'фанат «Рубина»', ward:'stadium', invite:'Ильдар пишет перед матчем: «Если будешь у арены — наш ряд, без драки».'},
      {id:'zulfiya', name:'Зульфия', female:true, job:'учительница', ward:'kremlin', invite:'Зульфия зовёт на чай у Кремля. «Редкость сейчас — человек, который помогает».'},
      {id:'rinat', name:'Ринат', job:'повар', ward:'freedom', invite:'Ринат с площади Свободы: «После события останется стол. Приходи, пока горячее».'}
    ];
    const WARD_NAME={bauman:'Баумана', yard:'дворы', stadium:'арена', kremlin:'Кремль', freedom:'площадь Свободы'};

    function load(){try{return Object.assign({wards:{},notes:[],invited:false,recap:false,party:false,lastRep:null,met:{}},JSON.parse(localStorage.getItem(KEY)||'{}'));}catch(e){return {wards:{},notes:[],invited:false,recap:false,party:false,lastRep:null,met:{}};}}
    function save(o){try{const cur=JSON.parse(localStorage.getItem(KEY)||'{}')||{};localStorage.setItem(KEY,JSON.stringify(Object.assign(cur,o)));}catch(e){}}
    let life=load();
    function note(text){life.notes.push({day:clock.day,text});if(life.notes.length>24)life.notes.shift();save(life);}
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
    function bestWard(){let id='yard',v=-999;for(const k in life.wards){if(life.wards[k]>v){v=life.wards[k];id=k;}}return {id,v:life.wards[id]||0};}

    if(life.lastRep==null) life.lastRep=player.rep||0;
    defWatch(function(){
      const r=player.rep||0;
      if(r!==life.lastRep){
        const d=r-life.lastRep; life.lastRep=r;
        const w=wardAt(player.x,player.y);
        life.wards[w]=(life.wards[w]||0)+d;
        if(d>0) note((WARD_NAME[w]||w)+': о вас говорят лучше');
        save(life);
      }
    });

    function folkFor(){
      const b=bestWard();
      return FOLK.find(f=>f.ward===b.id&&!life.met[f.id])||FOLK.find(f=>!life.met[f.id])||FOLK[0];
    }

    defSit('birthday',{title:'Звонок', auto:true, weight:2, cool:800, quiet:true,
      when(){return clock.day>=3&&!life.invited&&onFoot()&&hour()>=16&&hour()<=21&&((player.rep||0)>=8||bestWard().v>=4);},
      start(s){const f=folkFor(); s.folk=f; life.invited=true; life.met[f.id]=clock.day; save(life);
        sitCard({s, icon:'🎂', tone:'good', title:f.name, text:f.invite, ttl:16,
          choices:[
            {t:'Приду', primary:true, run:()=>{life.party=clock.day+1; note('Обещал прийти к '+f.name); save(life); sitMood(6); endSit(s);}},
            {t:'Не смогу', run:()=>{note('Отказал '+f.name); sitMood(-2); endSit(s);}}
          ],
          onTimeout:()=>endSit(s)});
        return true;}});

    defSit('party',{title:'День рождения', auto:false,
      start(s){const f=s.folk; const w=typeof findWalker==='function'?findWalker(8,40):null;
        if(w){takeActor(s,w); w.p.name=f.name; w.p.female=!!f.female; w.p.job=f.job; s.w=w; faceTo(w,player.x,player.y); say(w,'Пришёл всё-таки. Садись, ты свой.'); remember(w,'Игрок пришёл к тебе в гости после того, как помог в городе');}
        sitRep(4,'пришли, когда звали'); sitMood(10); dossier('гость у '+f.name); note('Был у '+f.name);
        life.party=false; save(life); s.endIn=8; return true;},
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
        life.recap=clock.day; save(life);
        sitCard({s, icon:'🗓', title:'Неделя в Казани', text:text||'Тихая неделя. Город вас ещё не запомнил.', ttl:0,
          choices:[{t:'Дальше', primary:true, run:()=>endSit(s)}]});
        return true;}});

    defWatch(function(){
      if(clock.day<8||life.recap||hour()<8||sitActive('week')) return;
      startSit('week');
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
