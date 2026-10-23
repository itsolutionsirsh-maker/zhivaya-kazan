// Календарь города поверх rally.js. Старые файлы не трогает.
// Подключить одним тегом после situations.js и rally.js:
//   <script src="js/events.js"></script>
(function(){
  if(window.__cityEvents) return;
  function boot(){
    if(window.__cityEvents) return;
    if(typeof defSit!=='function'||typeof defWatch!=='function'||typeof startRally!=='function') return;
    window.__cityEvents=true;

    const life=cityBag();
    function note(text){life.notes.push({day:clock.day,text:String(text)});if(life.notes.length>24)life.notes.shift();life.save();}
    function hour(){return Math.floor((clock.minutes/60)%24);}
    function dateOf(day){const dt=new Date(Date.UTC(2026,5,20)+(day-1)*86400000);return {m:dt.getUTCMonth()+1,d:dt.getUTCDate(),wd:dt.getUTCDay()};}
    function today(){return dateOf(clock.day);}

    function squareFor(hints){
      const squares=world.squares||[], pois=world.pois||[];
      for(const h of hints){
        const p=pois.find(q=>(q.n||'').toLowerCase().includes(h));
        if(p&&squares.length){let best=squares[0],bd=1e9;for(const s of squares){const d=dist(s.x,s.y,p.x,p.y);if(d<bd){bd=d;best=s;}}return best;}
        const s=squares.find(q=>(q.n||'').toLowerCase().includes(h));
        if(s) return s;
      }
      return squares[0]||null;
    }

    const YEAR=[
      {id:'sabantuy', m:6, d:21, hour:12, kind:'meet', title:'Сабантуй', hints:['свобод','тысячелет','кремл'], line:'На площади накрывают Сабантуй: чай, борьба на поясах, толпа и полиция по кругу.'},
      {id:'cityday', m:8, d:30, hour:17, kind:'concert', title:'День города', hints:['свобод'], line:'День города. Площадь Свободы перекрыта, сцена уже греет.'},
      {id:'newyear', m:1, d:1, hour:23, kind:'concert', title:'Новый год', hints:['свобод'], line:'Новый год на площади Свободы. Улицы вокруг стоят.'},
      {id:'fair', m:9, d:5, hour:12, kind:'meet', title:'Ярмарка', hints:['свобод','бауман'], line:'Ярмарка на площади: мёд, чак-чак и не протолкнуться.'},
      {id:'womens', m:3, d:8, hour:12, kind:'meet', title:'8 марта', hints:['бауман'], line:'8 марта. На Баумана цветы, толпа и перекрытые ступеньки.'},
      {id:'maslenitsa', m:3, d:14, hour:14, kind:'meet', title:'Масленица', hints:['свобод'], line:'Прощёное воскресенье, 14 марта 2027. Блины на площади, потом город стихает к посту.'},
      {id:'uraza', m:3, d:9, hour:9, kind:'meet', title:'Ураза-байрам', hints:['кремл','мечет'], line:'Ураза-байрам, 9 марта 2027. У мечетей намаз, центр наряжен, кафе полные.'},
      {id:'victory', m:5, d:9, hour:10, kind:'meet', title:'9 мая', hints:['кремл','свобод'], line:'9 мая. Парад у Кремля, перекрытия, вечером площадь Свободы не проехать.'},
      {id:'kurban', m:5, d:16, hour:9, kind:'meet', title:'Курбан-байрам', hints:['кремл','мечет'], line:'Курбан-байрам, 16 мая 2027. Утром у мечетей, днём столы во дворах.'}
    ];

    function matchOf(dt){
      const football=dt.m>=4&&dt.m<=11;
      const hockey=dt.m>=9||dt.m<=4;
      if(dt.wd===6&&football) return {id:'rubin-'+clock.day, title:'Матч «Рубина»', hints:['ак барс','казань арен','стадион','свобод'], line:'Матч «Рубина». К арене не подъехать: толпа, полиция, перекрытые улицы.'};
      if(dt.wd===0&&hockey) return {id:'akbars-'+clock.day, title:'Матч «Ак Барса»', hints:['татнефть','ак барс','стадион','свобод'], line:'Матч «Ак Барса». Вечер, пробки и оцепление у арены.'};
      return null;
    }

    function begin(ev, kind){
      if(life.seen[ev.id]) return;
      const sq=squareFor(ev.hints);
      if(!sq||typeof rallyAt==='function'&&rallyAt(sq)) return;
      life.seen[ev.id]=clock.day; life.block=ev.id; life.save();
      startRally(sq, kind||ev.kind, ev.title, 'npc');
      addEvent(ev.line,'rally');
      note(ev.title+' · '+sq.n);
      sitCard({icon:'📣', tone:'good', title:ev.title, text:ev.line+' Площадь: '+sq.n+'.', ttl:14,
        choices:[{t:'Пойти туда', primary:true, run:()=>{if(typeof walkTo==='function')walkTo(sq.x,sq.y,true);}},{t:'Не сегодня', run:()=>{note('Пропустил: '+ev.title);}}]});
    }

    defWatch(function(){
      if(typeof world==='undefined'||!world.squares||!world.squares.length) return;
      const dt=today(), h=hour();
      for(const ev of YEAR){if(dt.m===ev.m&&dt.d===ev.d&&h===ev.hour) begin(ev);}
      const match=matchOf(dt);
      if(match&&h===19) begin(match,'meet');
      if(life.block&&player.vehicle&&Date.now()>(life.roadTill||0)){
        const id=life.block, sq=squareFor((YEAR.find(e=>e.id===id)||{hints:['свобод']}).hints);
        if(sq&&dist(player.x,player.y,sq.x,sq.y)<70&&!sitActive('roadblock')){
          life.roadTill=Date.now()+25000; life.save();
          startSit('roadblock',{sq:sq,title:id});
        }
      }
    });

    defSit('roadblock',{title:'Улица перекрыта', auto:false, quiet:true,
      start(s){const name=s.sq&&s.sq.n||'площадь';
        life.roadTill=Date.now()+25000; life.save();
        sitCard({s, icon:'🚧', tone:'alert', title:'Улица перекрыта', text:'Из-за события у «'+name+'» дальше на машине не пускают. Пешком или в объезд.', ttl:10,
          choices:[{t:'Оставить машину и пойти', primary:true, run:()=>endSit(s)},{t:'Разворачиваюсь', run:()=>endSit(s)}],
          onTimeout:()=>endSit(s)});
        return true;}});

    let told=clock.day;
    defWatch(function(){
      if(clock.day===told) return;
      told=clock.day; life.block=''; life.save();
      const dt=today();
      const bits=[];
      for(const ev of YEAR){if(ev.m===dt.m&&ev.d===dt.d) bits.push(ev.title);}
      const match=matchOf(dt); if(match) bits.push(match.title+' вечером');
      if(bits.length) addEvent('Сегодня в городе: '+bits.join('. '));
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
