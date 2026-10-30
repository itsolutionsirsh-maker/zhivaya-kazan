// ===== Свои люди живьём: 8 постоянных жителей ходят по распорядку, работают, помнят игрока =====
// Список и характеры — у второго программиста (people.js → window.cityFolk). Если его нет — запасной список ниже.
// Поля, которые берутся из window.cityFolk, если заполнены: bio, speech, age, day ([[час,'home'|'work'|'haunt'|'yard'|'shop'], …]).
const FOLK_FALLBACK=[
  {id:'alsu',name:'Алсу',female:true,job:'бармен на Баумана',ward:'bauman'},
  {id:'lenar',name:'Ленар',job:'уличный музыкант',ward:'bauman'},
  {id:'marat',name:'Марат',job:'таксист',ward:'yard'},
  {id:'gulnara',name:'Гульнара',female:true,job:'фармацевт',ward:'yard'},
  {id:'fidania',name:'Фидания',female:true,job:'соседка',ward:'yard'},
  {id:'ildar',name:'Ильдар',job:'фанат «Рубина»',ward:'stadium'},
  {id:'zulfiya',name:'Зульфия',female:true,job:'учительница',ward:'kremlin'},
  {id:'rinat',name:'Ринат',job:'повар',ward:'freedom'}];
// запасные характеры и распорядок по профессии (час начала → где)
const FOLK_DEF={
  alsu:{trait:'любит давать советы',age:27,bio:'Бармен в баре на Баумана, знает всех завсегдатаев, острая на язык, но добрая.',speech:'коротко, с иронией, называет посетителей «зай»',work:'bar',haunt:'cafe',day:[[0,'work'],[3,'home'],[13,'haunt'],[16,'work']]},
  lenar:{trait:'мечтатель',age:24,bio:'Играет на гитаре на Баумана, мечтает собрать группу, живёт скромно.',speech:'мечтательно, про музыку, «братан»',work:'busk',haunt:'bar',day:[[0,'home'],[12,'work'],[20,'haunt'],[23.5,'home']]},
  marat:{trait:'ворчливый, но добрый',age:52,bio:'Двадцать лет за рулём такси, знает каждый двор и каждую пробку.',speech:'по-свойски, ворчит на пробки и цены, вставляет татарские словечки',work:'taxi',haunt:'chai',day:[[0,'home'],[7,'work'],[20,'haunt'],[22,'home']]},
  gulnara:{trait:'очень вежливый',age:38,bio:'Фармацевт в аптеке у вашего дома, спокойная, всегда подскажет с лекарствами.',speech:'вежливо, обстоятельно, по-доброму',work:'pharmacy',haunt:'cafe',day:[[0,'home'],[8,'work'],[20,'haunt'],[21.5,'home']]},
  fidania:{trait:'сплетник, знает все новости района',age:69,bio:'Пенсионерка, ваша соседка по подъезду, печёт чак-чак, всё про всех знает.',speech:'ласково, «улым»/«кызым», любит рассказать новости двора',work:'yard',haunt:'shop',day:[[0,'home'],[10,'yard'],[12,'haunt'],[13,'home'],[17,'yard'],[20,'home']]},
  ildar:{trait:'весёлый и болтливый',age:31,bio:'С детства болеет за «Рубин», работает продавцом, вечером смотрит матчи в баре.',speech:'громко, про футбол, «наши сегодня…»',work:'shop',haunt:'bar',day:[[0,'home'],[10,'work'],[19,'haunt'],[23,'home']]},
  zulfiya:{trait:'обожает Казань и рассказывает о ней',age:45,bio:'Учительница русского и татарского, после уроков гуляет у Кремля.',speech:'грамотно, мягко, иногда поправляет речь собеседника',work:'school',haunt:'kremlin',day:[[0,'home'],[8,'work'],[15,'haunt'],[18,'home']],dayOff:[[0,'home'],[11,'haunt'],[15,'home']]},
  rinat:{trait:'философ',age:41,bio:'Повар в кафе у площади Свободы, гордится своим эчпочмаком.',speech:'неторопливо, про еду, угощает словами',work:'cafe',haunt:'bar',day:[[0,'home'],[10,'work'],[22,'haunt'],[23.5,'home']]}};
const FOLK={list:[],ready:false,t:0,save:{}};
function folkSrc(){const ext=Array.isArray(window.cityFolk)&&window.cityFolk.length?window.cityFolk:null;return (ext||FOLK_FALLBACK).map(f=>Object.assign({},FOLK_DEF[f.id]||{},f));}
function folkLoad(){if(window.__folkSaved&&typeof window.__folkSaved==='object'){FOLK.save=window.__folkSaved;return;}try{FOLK.save=JSON.parse(localStorage.getItem('zk.folk')||'{}')||{};}catch(e){FOLK.save={};}}
function folkDump(){if(!FOLK.ready)return window.__folkSaved;const o={};for(const f of FOLK.list){o[f.id]={met:f.met||0,last:f.last||0,greet:f.greet||0,mem:(f.p.memory||[]).slice(-12)};}return o;}
function folkStore(){if(window.zkNoSave)return;const o={};for(const f of FOLK.list){o[f.id]={met:f.met||0,last:f.last||0,greet:f.greet||0,mem:(f.p.memory||[]).slice(-12)};}try{localStorage.setItem('zk.folk',JSON.stringify(o));}catch(e){}}
// постоянная внешность по имени
function folkPersona(f){const r=seeded(hashStr('folk:'+f.id));const P=(a)=>a[Math.floor(r()*a.length)];
  const p={id:nextId++,name:f.name,job:f.job,trait:f.trait||P(TRAITS),mood:pick(MOODS),age:f.age||Math.floor(18+r()*50),clothes:P(CLOTHES),skin:P(SKINS),hair:P(HAIRS),female:!!f.female,role:'resident',memory:[],
    hairStyle:f.female?P([0,1,1,2]):((f.age||30)>55?3:P([0,0,2])),bag:r()<0.4?P(['#3A3A3A','#7A4A2A','#C24A3A','#2A4A7A']):null,pants:P(['#2B2F3A','#3C3C3C','#4A5A7A','#6B5A4A','#1F1F1F']),bio:f.bio||'',speech:f.speech||'',folk:f.id};
  if(f.id==='fidania'){p.hair='#B8B8B8';p.hairStyle=2;}
  // свои люди из folk3.js: типаж, фразы, одежда и предмет в руках (рисует render.js: p.item)
  if(f.type)p.type=f.type;if(Array.isArray(f.lines)&&f.lines.length)p.lines=f.lines;
  const lk=f.look;if(lk){if(/^#[0-9a-f]{6}$/i.test(lk.coat||''))p.clothes=lk.coat;if(lk.hat==='cap')p.hat={k:'cap',c:shade(p.clothes,0.7)};else if(lk.hat==='beanie')p.hat={k:'knit',c:P(['#5A6B8C','#8C3A32','#3F6B4A','#6E7378'])};if(lk.item&&lk.item!=='none')p.item=lk.item;}
  return p;}
// ---------- места ----------
function nearestPoi(x,y,test,maxD){let best=null,bd=maxD||1e9;for(const p of world.pois){const dx=p.x-x,dy=p.y-y;if(dx>bd||dx<-bd||dy>bd||dy<-bd||!test(p))continue;const d=Math.hypot(dx,dy);if(d<bd){bd=d;best=p;}}return best;}
function poiPlace(p,kind){return p?{x:p.x,y:p.y,inside:true,key:poiKey(p),poi:p,name:p.n||KIND_RU[p.t]||'',kind}:null;}
function spotPlace(x,y,name,kind){const n=nearestNode(x,y,world.pedAdj,150);if(n<0)return null;const sp=sidewalkPos(n);return {x:sp[0],y:sp[1],inside:false,node:n,name,kind};}
// опорные точки центра считаем один раз на карту (раньше — перебор тысяч мест на каждого жителя); вызывающие правят копию
let FOLK_ANCH=null;
function folkAnchors(){const key=world.roads.length+':'+world.pois.length;
  if(!FOLK_ANCH||FOLK_ANCH.w!==world||FOLK_ANCH.key!==key){const A={};
    const sq=(world.squares||[]).find(s=>/свобод/i.test(s.n));A.freedom=sq?[sq.x,sq.y]:[player.x,player.y];
    const kr=world.pois.find(p=>/кремл/i.test(p.n||''));A.kremlin=kr?[kr.x,kr.y]:[A.freedom[0]-1200,A.freedom[1]-250];
    // Баумана пешеходная — её нет в сетке «ближайшей улицы»; середина — по точкам самой улицы рядом с площадью Свободы
    let sx=0,sy=0,n=0;const F=A.freedom;roadsIn(F[0]-2000,F[1]-2000,F[0]+2000,F[1]+2000,r=>{if(!/Баумана/.test(r.n||'')||!r.p)return;for(const i of r.p){const q=world.nodes[i];if(!q||dist(q[0],q[1],F[0],F[1])>2000)continue;sx+=q[0];sy+=q[1];n++;}});
    A.bauman=n?[sx/n,sy/n]:[(A.freedom[0]+A.kremlin[0])/2,(A.freedom[1]+A.kremlin[1])/2];
    const sb=world.pois.find(p=>p.t==='bar'&&/спорт|sport|футбол|паб|pub/i.test(p.n||''));A.stadium=sb?[sb.x,sb.y]:A.freedom;
    FOLK_ANCH={w:world,key,A};}
  const A=Object.assign({},FOLK_ANCH.A);A.yard=player.home?[player.home.cx,player.home.cy]:[player.x,player.y];return A;}
function homeNear(x,y,r,seed){const s=new Set();world.bgrid.query(x-r,y-r,x+r,y+r,b=>{if((b.t===''||b.t==='apartments'||b.t==='residential')&&b.h>=3&&dist(b.cx,b.cy,x,y)<r)s.add(b);});   // по сетке, а не по всем домам города
  const c=[...s].sort((u,v)=>u.i-v.i);if(!c.length)return null;const b=c[seed%c.length];
  const pts=[[b.cx,b.bb[3]+3],[b.cx,b.bb[1]-3],[b.bb[0]-3,b.cy],[b.bb[2]+3,b.cy]];for(const q of pts){if(!inBuilding(q[0],q[1]))return {x:q[0],y:q[1],inside:true,key:'home:'+seed,name:'дом',kind:'home',b};}return {x:b.cx,y:b.bb[3]+3,inside:true,key:'home:'+seed,name:'дом',kind:'home',b};}
// описание места: строка из моих запасных ('bar','busk',…) или объект второго программиста {kind, hints, label}
const SPEC_STR={bar:{kind:'bar'},busk:{kind:'street'},pharmacy:{kind:'pharmacy'},school:{kind:'school'},cafe:{kind:'cafe'},shop:{kind:'shop'},yard:{kind:'yard'},taxi:{kind:'taxi'},chai:{kind:'cafe',hints:['чайхан']},kremlin:{kind:'street',hints:['кремл']}};
function normSpec(x){if(!x)return null;if(typeof x==='string')return Object.assign({hints:[]},SPEC_STR[x]||{kind:x});return {kind:x.kind,hints:(x.hints||[]).map(h=>String(h).toLowerCase()),label:x.label||''};}
function hintAnchor(hints,A,def){for(const h of hints){if(/бауман/.test(h))return A.bauman;if(/кремл/.test(h))return A.kremlin;if(/свобод/.test(h))return A.freedom;if(/ак барс|арен|стадион/.test(h))return A.stadium;}return def;}
const KIND_TEST={bar:p=>p.t==='bar',cafe:p=>p.t==='cafe',restaurant:p=>p.t==='cafe',pharmacy:p=>p.t==='pharmacy',office:p=>p.t==='office'&&!!p.n,school:p=>p.t==='school'||p.t==='university',shop:p=>p.t==='shop'};
// места под открытым небом (парк, площадь, набережная, вокзал, метро, улица): у них нет точки на карте — ищем по ориентиру
// из landmarks.js или по названию улицы рядом с районом, и ставим человека на тротуар неподалёку (не все в одну точку)
const OPEN_KIND=/^(park|square|embankment|station|metro|street)$/;
function folkOpenSpot(sp,f,c,role){const norm=s=>String(s||'').toLowerCase().replace(/ё/g,'е');const hs=(sp.hints||[]).map(norm).filter(Boolean);let at=null,label='';
  if(hs.length){let bs=0,bd=4500;for(const l of [...(window.cityLandmarks||[]),...(window.cityPlaces||[])]){if(!Array.isArray(l.ll))continue;const ns=l.nn||(l.nn=[l.name].concat(l.alias||[]).map(norm));   // ориентиры и места для праздников и постов (city-people.js)
    let sc=0;for(const h of hs)sc+=ns.some(n=>n===h)?2:ns.some(n=>n.includes(h))?1:0;if(!sc)continue;   // точное совпадение с названием важнее «вокзал» внутри «автовокзал»
    const q=llToXY(l.ll);const d=dist(q[0],q[1],c[0],c[1]);if(d>4500)continue;if(sc>bs||(sc===bs&&d<bd)){bs=sc;bd=d;at=q;label=l.name;}}
    if(!at){let bd2=3000;roadsIn(c[0]-3000,c[1]-3000,c[0]+3000,c[1]+3000,r=>{if(!r.n||!r.p)return;const rn=r.nl||(r.nl=norm(r.n));if(!hs.some(h=>rn.includes(h)))return;for(const i of r.p){const q=world.nodes[i];if(!q)continue;const d=dist(q[0],q[1],c[0],c[1]);if(d<bd2){bd2=d;at=[q[0],q[1]];label=r.n;}}});}}
  if(!at)return null;const sd=hashStr(f.id+role);const jx=((sd%41)-20),jy=(((sd>>>6)%41)-20);   // ±20 м, у каждого своё место
  const n=nearestNode(at[0]+jx,at[1]+jy,world.pedAdj,600);if(n<0)return null;const q=sidewalkPos(n);   // озеро или парк: ближайшая дорожка может быть далеко от центра
  return {x:q[0],y:q[1],inside:false,node:n,open:true,kind:sp.kind,name:label?(role==='work'&&/^(taxi|bombila)$/.test(f.type)?'у машины, '+label:label):'на улице'};}
function resolveSpec(sp,f,A,a,role,P){if(!sp)return null;const k=sp.kind;
  // таксист и бомбила из folk3 ждут пассажиров у своей машины (у вокзала, рынка, метро), а не сидят невидимыми в салоне
  if(k==='taxi'&&/^(taxi|bombila)$/.test(f.type||'')&&sp.hints.length){const pl=folkOpenSpot(sp,f,hintAnchor(sp.hints,A,a),role);if(pl)return pl;}
  if(OPEN_KIND.test(k)&&f.type&&sp.hints.length){const pl=folkOpenSpot(sp,f,hintAnchor(sp.hints,A,a),role);if(pl)return pl;}
  if(k==='taxi')return {x:a[0],y:a[1],inside:true,key:'taxi',name:'за рулём такси',kind:'taxi'};
  // водитель автобуса на перерыве — у ближайшей к его району остановки (folk3: work.kind 'bus')
  if(k==='bus'){const c=hintAnchor(sp.hints,A,a);let best=null,bd=2500;for(const s of world.stops||[]){const d=Math.hypot(s.x-c[0],s.y-c[1]);if(d<bd){bd=d;best=s;}}
    if(best)return spotPlace(best.x+3,best.y+2,sp.label||'на остановке','street');}
  if(k==='home')return role==='work'?P.home:P.yard;
  if(k==='yard')return P.yard;
  const c=hintAnchor(sp.hints,A,a);
  if(k==='street'){const s=nearestPoi(c[0],c[1],p=>p.t==='sight',350);const q=s?[s.x,s.y]:c;return spotPlace(q[0]+8,q[1]+6,sp.label||(sp.hints.some(h=>/бауман/.test(h))?'на Баумана':sp.hints.some(h=>/кремл/.test(h))?'у Кремля':'на улице'),'street');}
  let test=KIND_TEST[k]||(p=>p.t===k);if(k==='office'&&/школ|лицей|гимназ/i.test(sp.label))test=KIND_TEST.school;
  const taken=new Set(Object.values(P).filter(Boolean).map(q=>q.key));
  const use=FOLK.use||(FOLK.use={});const named=p=>!!p.n&&!taken.has(poiKey(p))&&(use[poiKey(p)]||0)<(role==='work'?1:2);   // на работе по одному, «своё место» — не больше двоих
  // кандидаты рядом с подсказкой: совпадение по названию или улице, иначе просто ближайшие
  const cand=[];for(const p of world.pois){const dx=p.x-c[0],dy=p.y-c[1];if(dx>900||dx<-900||dy>900||dy<-900||!test(p)||!named(p))continue;const d=Math.hypot(dx,dy);if(d<900)cand.push([d,p]);}
  cand.sort((u,v)=>u[0]-v[0]);
  const want=k==='restaurant'?/ресторан|чайхан|столов|кухн|кафе/i:null;
  const hit=(p)=>{if(!sp.hints.length)return true;const n=(p.n||'').toLowerCase();if(sp.hints.some(h=>n.includes(h)))return true;const r=p.rn!==undefined?p.rn:(p.rn=(nearestRoadName(p.x,p.y)||'').toLowerCase());return sp.hints.some(h=>r.includes(h))||dist(p.x,p.y,c[0],c[1])<160;};
  let best=null;for(const [d,p] of cand.slice(0,40)){if(want&&!want.test(p.n))continue;if(hit(p)){best=p;break;}}
  if(!best)for(const [d,p] of cand.slice(0,40)){if(hit(p)){best=p;break;}}
  if(!best&&cand.length)best=cand[0][1];
  if(!best)best=nearestPoi(c[0],c[1],p=>test(p)&&!!p.n);
  const pl=poiPlace(best,role);if(pl){use[pl.key]=(use[pl.key]||0)+(role==='work'?2:1);if(sp.label)pl.label=sp.label;}return pl;}
function folkPlaces(f,A){const a=A[f.ward]||A.freedom;const seed=hashStr(f.id);const P={};
  P.home=f.id==='fidania'&&player.home?{x:player.home.cx,y:player.home.bb[3]+3,inside:true,key:'home:player',name:'ваш дом',kind:'home'}:(homeNear(a[0]+((seed%7)-3)*60,a[1]+((seed%5)-2)*60,420,seed)||spotPlace(a[0],a[1],'дом','home'));
  {const s=hashStr(f.id+'yard');P.yard=spotPlace(A.yard[0]+6+((s%51)-25),A.yard[1]+8+(((s>>>6)%51)-25),'во дворе','yard');if(P.yard){P.yard.x+=((s>>>12)%5)-2;P.yard.y+=((s>>>15)%5)-2;}}   /* во дворе у каждого своё место: раньше весь район стоял в одной точке */
  P.work=resolveSpec(normSpec(f.work),f,A,a,'work',P);
  P.haunt=resolveSpec(normSpec(f.haunt),f,A,a,'haunt',P);
  for(const k of ['work','haunt'])if(!P[k])P[k]=P.home;return P;}
function folkInit(){if(FOLK.ready||!world||!player.home)return;FOLK.ready=true;folkLoad();const A=folkAnchors();
  for(const src of folkSrc()){const f=Object.assign({},src);f.p=folkPersona(f);const sv=FOLK.save[f.id]||{};f.met=sv.met||0;f.last=sv.last||0;f.greet=sv.greet||0;if(Array.isArray(sv.mem))f.p.memory=sv.mem.slice();
    f.places=folkPlaces(f,A);f.at=folkWant(f);f.w=null;f.trip=null;FOLK.list.push(f);}
  window.cityFolkWhere=folkWhere;window.cityFolkAll=()=>FOLK.list.map(f=>folkWhere(f.id));}
// игрок переехал (свой район в анкете или дом из сохранения догрузился): соседи по двору (ward 'yard') живут и работают у нового дома
function folkReanchor(){if(!FOLK.ready)return;const A=folkAnchors();for(const f of FOLK.list){if(f.ward!=='yard')continue;const held=folkPersonBusy(f);folkCancelRoute(f);f.retry=null;f.places=folkPlaces(f,A);if(held){f.away=true;continue;}folkDrop(f);f.at=folkWant(f);f.away=false;}}
// где должен быть по часам
function folkWant(f){const h=cityHour();const off=f.dayOff&&isWeekend();const D=(off?f.dayOff:f.day)||[[0,'home'],[9,'work'],[18,'haunt'],[22,'home']];let at=D[D.length-1][1];for(const [hh,k] of D){if(h>=hh)at=k;}
  // закрытое место — значит не там
  const pl=f.places[at];if(pl&&pl.poi&&at==='haunt'&&typeof poiOpen==='function'&&!poiOpen(pl.poi))return 'home';
  // дождь: кто стоит на улице без крыши, уходит домой. Как распогодится — расписание возвращает его назад.
  if(typeof weather!=='undefined'&&weather.kind==='rain'&&pl&&!pl.inside){
    const yard=(f.do||[]).includes('yard_ask');
    const broom=f.type==='janitor'||/дворник/.test(f.job||'');
    const tray=f.type==='seller'&&(pl.kind==='street'||pl.kind==='yard'||pl.kind==='market');
    if(yard||broom||tray)return 'home';}
  return at;}
function folkWhere(id){const f=FOLK.list.find(q=>q.id===id);if(!f)return null;const pl=f.trip?f.places[f.trip.to]:f.places[f.at];
  if(f.driving)return {id,name:f.name,at:'road',place:'за рулём такси',x:f.driving.x,y:f.driving.y,known:f.met>0,text:`${f.name} везёт пассажира`};
  return {id,name:f.name,at:f.trip?'road':f.at,place:pl?pl.name:'',x:(f.w?f.w.x:pl&&pl.x),y:(f.w?f.w.y:pl&&pl.y),known:f.met>0,text:f.trip?`${f.name} идёт ${f.trip.to==='home'?'домой':'в «'+(pl&&pl.name)+'»'}`:f.at==='home'?`${f.name} дома`:f.at==='work'?`${f.name} на работе${pl&&pl.inside&&pl.key!=='taxi'?' в «'+pl.name+'»':pl?' · '+pl.name:''}`:`${f.name} ${pl&&pl.inside?'в «'+pl.name+'»':pl?pl.name:''}`};}
// ---------- на улице ----------
function folkPos(f){if(f.w)return [f.w.x,f.w.y];const pl=f.places[f.at];return pl?[pl.x,pl.y]:[0,0];}
function folkSpawn(f,pl){const n=nearestNode(pl.x,pl.y,world.pedAdj,120);if(n<0)return null;const w=new Walker('resident',n);w.p=f.p;w.folk=f.id;w.spd=f.age>60?1.6:rnd(2.0,2.5);if(!pl.inside){w.x=pl.x;w.y=pl.y;}w.state='folkStay';
  w.recover=function(){this.state='folkStay';this.ttl=0;};const update=w.update;
  w.update=function(dt){if(!folkLeadStep(this,dt))update.call(this,dt);};walkers.push(w);f.w=w;return w;}
function folkId(w){return w&&(w.folk||(w.p&&w.p.folk)||(w.companionOf&&folkId(w.companionOf)));}
function folkOf(w){const id=folkId(w);return id?FOLK.list.find(f=>f.id===id):null;}
// Один человек может сейчас быть представлен интерьерным NPC, спутником или водителем, без f.w.
function folkPersonBusy(f){return !!(f.driving||folkBusy(f.w)||(chatNpc&&folkId(chatNpc)===f.id)||(typeof companion!=='undefined'&&companion&&folkId(companion.w)===f.id)||(typeof taxiCall!=='undefined'&&taxiCall&&taxiCall.folkDriver===f.id)||(typeof SIT!=='undefined'&&SIT.card&&SIT.card.neighbourStory&&folkId(SIT.card.participant)===f.id));}
function folkCancelRoute(f){f.routeGen=(f.routeGen||0)+1;f.trip=null;const w=f.w;if(w){w.folkLead=null;if(w.state==='walk'||w.state==='routing'){w.path=null;w.state='folkStay';}}}
function folkDrop(f){folkCancelRoute(f);if(!f.w)return;const i=walkers.indexOf(f.w);if(i>=0)walkers.splice(i,1);if(chatNpc===f.w&&typeof closeChat==='function')closeChat();f.w=null;}
function folkBusy(w){return w&&(w.sitBy!=null||w.rally||w.rallySlot||w.state==='hurt'||w===chatNpc||w.companion||w.bus);}
// Короткое соединение с новым маршрутом проходим физически: пересчёт не переносит к старому узлу.
function folkClearJoin(x0,y0,x1,y1){if(typeof wallBlocks==='function'&&wallBlocks(x0,y0,x1,y1))return false;const n=Math.max(1,Math.ceil(dist(x0,y0,x1,y1)/1.5));
  for(let i=1;i<=n;i++){const x=x0+(x1-x0)*i/n,y=y0+(y1-y0)*i/n;if(inBuilding(x,y)||(typeof inWater==='function'&&inWater(x,y)))return false;}return true;}
function folkLeadStep(w,dt){const l=w.folkLead;if(!l)return false;if(w.state!=='walk'||!l.valid()){w.folkLead=null;return true;}
  const d=dist(w.x,w.y,l.x,l.y);if(d<0.05){w.folkLead=null;if(l.done)l.done();return true;}
  const ux=(l.x-w.x)/d,uy=(l.y-w.y)/d,st=Math.min(d,w.spd*dt);const x=w.x+ux*st,y=w.y+uy*st;
  if(unsafeStep(w.x,w.y,x+ux*1.2,y+uy*1.2))return true;if(inBuilding(x,y)){l.fail();return true;}
  w.hx=ux;w.hy=uy;w.x=x;w.y=y;w.phase+=dt*7;if(st===d){w.folkLead=null;if(l.done)l.done();}return true;}
function folkGo(f,to){if(folkPersonBusy(f))return false;if(f.retry&&f.retry.to===to&&clock.minutes<f.retry.until)return false;
  const from=f.places[f.at],dst=f.places[to];folkCancelRoute(f);f.retry=null;
  const fail=()=>{f.trip=null;f.away=true;f.retry={to,until:clock.minutes+15};if(f.w){f.w.path=null;f.w.folkLead=null;f.w.state='folkStay';}return false;};
  if(!dst)return fail();
  const near=(pl)=>pl&&scene==='city'&&dist(pl.x,pl.y,player.x,player.y)<340;
  if((dst.kind==='taxi'&&dst.inside)||(!near(from)&&!near(dst)&&!f.w&&!f.away)){folkDrop(f);f.at=to;f.away=false;return true;}
  const w=f.w||folkSpawn(f,f.returnPos||(from&&!(from.kind==='taxi'&&from.inside)?from:dst));if(!w)return fail();f.returnPos=null;
  const start=nearestNode(w.x,w.y,world.pedAdj,120),goal=dst.node!=null?dst.node:nearestNode(dst.x,dst.y,world.pedAdj,120);if(start<0||goal<0)return fail();
  const trip=f.trip={to,t0:clock.minutes},gen=f.routeGen;const valid=()=>f.routeGen===gen&&f.w===w&&f.trip===trip&&!folkPersonBusy(f);
  w.node=start;w.state='routing';
  w.arrive=function(){if(!valid())return;this.path=null;this.folkLead=null;f.trip=null;f.at=to;f.away=false;f.retry=null;if(dst.inside){folkDrop(f);}else{this.x=dst.x;this.y=dst.y;this.state='folkStay';}};
  requestPath(w,world.pedAdj,start,goal,pedCost,path=>{if(!valid()||w.state!=='routing')return;
    if(!path||!path.length||path[0]!==start||path[path.length-1]!==goal){fail();return;}
    if(path.length===1){const d=dist(w.x,w.y,dst.x,dst.y);if(d<=8){w.arrive();return;}
      if(dst.inside||d>120||!clearLine(w.x,w.y,dst.x,dst.y)){fail();return;}w.state='walk';w.folkLead={x:dst.x,y:dst.y,valid,fail,done:()=>w.arrive()};return;}
    w.path=path;w.seg=0;const a=world.nodes[path[0]],b=world.nodes[path[1]],L=dist(a[0],a[1],b[0],b[1]);if(!L){fail();return;}
    const dx=(b[0]-a[0])/L,dy=(b[1]-a[1])/L,r=edgeRoad(world.pedAdj,path[0],path[1]);const want=r&&r.c<=8?r.hw+1.3:0,off=want?Math.min(safeSideOff(path[0],path[1],want+0.6),want+w.off):w.off;
    w.t=clamp((w.x-a[0])*dx+(w.y-a[1])*dy,0,L);const x=a[0]+dx*w.t-dy*off,y=a[1]+dy*w.t+dx*off;
    if(dist(w.x,w.y,x,y)>0.5){if(!folkClearJoin(w.x,w.y,x,y)){fail();return;}w.folkLead={x,y,valid,fail};}w.state='walk';});return true;}
function folkTaxiStart(fOrId,v){const f=typeof fOrId==='string'?FOLK.list.find(q=>q.id===fOrId):fOrId;if(!f||!v)return false;
  f.driving=v;v.folkDriver=f.id;f.away=true;f.retry=null;folkDrop(f);return true;}
function folkTaxiEnd(v){if(!v||!v.folkDriver)return;const f=FOLK.list.find(q=>q.id===v.folkDriver);delete v.folkDriver;if(!f||f.driving!==v)return;
  f.driving=null;f.away=true;f.retry=null;const p=toSidewalk(v.x,v.y);f.returnPos={x:p[0],y:p[1]};folkGo(f,folkWant(f));}
const FOLK_HI=['Привет, {n}!','О, {n}! Как сам?','{n}, здравствуй!','Салям, {n}!'];
const FOLK_HI_F={fidania:['Улым, здравствуй! Покушал сегодня?','Ой, сосед! Как дела?'],lenar:['{n}! Послушай, новую выучил ♪','Братан, привет!'],marat:['Э, {n}! Куда едем?','Салям, {n}! Опять пробки…'],alsu:['Зай, привет. Заходи вечером','{n}, живой? Привет'],zulfiya:['Здравствуйте, {n}!'],gulnara:['Здравствуйте, {n}. Как самочувствие?'],ildar:['{n}! Наши сегодня играют, ты в курсе?'],rinat:['{n}! Голодный? Заходи']};
const BUSK=['♪ Казан, Казан, син минем җаным… ♪','♪ (перебирает струны) ♪','♪ Ещё одну для хороших людей ♪','Спасибо, люди добрые!'];
// жители районов (folk2.js → window.cityFolk2): появляются, когда игрок впервые оказывается рядом с их районом (там уже подгружены дома и места)
function folkDistrictTick(){const t0=performance.now();const ext=[...(window.cityFolk2||[]),...(window.cityFolk3||[])];if(!ext.length||!FOLK.ready)return;let added=0;const have=new Set(FOLK.list.map(f=>f.id));const ds=window.cityDistricts||[];const m=world.meta;let A0=null;
  for(const src of ext){if(have.has(src.id))continue;const d=ds.find(x=>x.id===src.district);if(!d||!Array.isArray(d.center))continue;
    const c=[(d.center[1]-m.lon0)*m.mlon,-(d.center[0]-m.lat0)*m.mlat];if(dist(c[0],c[1],player.x,player.y)>2200)continue;
    A0=A0||folkAnchors();const A=src.district==='vahitovsky'?A0:{freedom:c,kremlin:c,bauman:c,stadium:c,yard:[c[0]+40,c[1]+30]};A[src.district]=c;
    const f=Object.assign({ward:src.district},src);f.ward=src.district;f.p=folkPersona(f);const sv=FOLK.save[f.id]||{};f.met=sv.met||0;f.last=sv.last||0;f.greet=sv.greet||0;if(Array.isArray(sv.mem))f.p.memory=sv.mem.slice();
    f.places=folkPlaces(f,A);f.at=folkWant(f);f.w=null;f.trip=null;FOLK.list.push(f);if(++added>=3||performance.now()-t0>3)break;}}   // до троих за раз и не дольше ~3 мс — не тормозить
function updateFolk(rdt){if(!world)return;if(!FOLK.ready){folkInit();if(!FOLK.ready)return;}
  FOLK.t-=rdt;if(FOLK.t>0)return;FOLK.t=0.5;FOLK.dt=(FOLK.dt||0)+1;if(FOLK.dt%10===0)folkDistrictTick();
  for(const f of FOLK.list){
    if(f.w&&walkers.indexOf(f.w)<0)f.w=null;           // убрали чужим кодом
    if(f.driving&&f.driving!==player.vehicle)folkTaxiEnd(f.driving);
    if(folkPersonBusy(f)){if(f.trip){folkCancelRoute(f);f.away=true;}if(f.w||f.driving)f.away=true;continue;}
    // сбился с пути (перебежал дорогу, постоял у ДТП) — идёт дальше
    if(f.w&&f.trip&&f.w.state!=='walk'&&f.w.state!=='routing'){const to=f.trip.to;f.trip=null;folkGo(f,to);}
    else if(f.w&&!f.trip&&f.w.state==='idle'){f.w.state='folkStay';}
    const want=folkWant(f);
    if((want!==f.at||f.away)&&!f.trip)folkGo(f,want);
    else if(f.trip&&want!==f.trip.to){f.trip=null;folkGo(f,want);}   // планы поменялись по дороге
    const pl=f.places[f.at];
    // снаружи (двор, Баумана, у Кремля): показываем, когда игрок рядом
    if(!f.trip&&!f.away&&pl&&!pl.inside){const d=dist(pl.x,pl.y,player.x,player.y);if(d<300&&scene==='city'&&!f.w){const w=folkSpawn(f,pl);if(w){w.x=pl.x+rnd(-1,1);w.y=pl.y+rnd(-1,1);}}else if(d>420&&f.w&&f.w!==chatNpc)folkDrop(f);}
    if(f.w&&!f.trip&&!f.away&&pl&&pl.inside&&f.w!==chatNpc)folkDrop(f);
    if(f.trip&&f.w&&dist(f.w.x,f.w.y,player.x,player.y)>460){f.at=f.trip.to;f.away=false;folkDrop(f);}
    const w=f.w;if(!w)continue;const d=dist(w.x,w.y,player.x,player.y);
    if(w.state==='folkStay'){if(d<10)faceTo(w,player.x,player.y);
      if(pl&&pl.kind==='street'&&f.at==='work'&&/музыкант/.test(f.job)&&d<40&&Math.random()<0.025)say(w,pick(BUSK),4);}
    // здоровается со знакомыми раз в день
    if(f.met>0&&f.greet!==clock.day&&d<7&&scene==='city'&&!player.vehicle){f.greet=clock.day;const L=FOLK_HI_F[f.id]&&Math.random()<0.6?FOLK_HI_F[f.id]:FOLK_HI;say(w,pick(L).replace('{n}',player.name));}}
  FOLK.st=(FOLK.st||0)+1;if(FOLK.st%20===0)folkStore();}
// разговор со своим человеком: знакомство и память
function folkOnChat(w){const id=w&&(w.folk||(w.p&&w.p.folk));if(!id)return;const f=FOLK.list.find(q=>q.id===id);if(!f)return;
  if(f.last!==clock.day){f.met=(f.met||0)+1;f.last=clock.day;if(f.met===1)addEvent(`Вы познакомились: ${f.name}, ${f.job}. Теперь узнаёт вас при встрече`,'say');}
  f.greet=clock.day;folkStore();}
function folkContext(w){const id=w&&(w.folk||(w.p&&w.p.folk));if(!id)return '';const f=FOLK.list.find(q=>q.id===id);if(!f)return '';
  const bio=f.bio?` О тебе: ${f.bio}`:'';const sp=f.speech?` Манера речи: ${String(f.speech).replace(/\.?$/,'.')}`:'';
  const rel=f.met>1?` Собеседник — ${player.name}, вы знакомы: виделись ${f.met} ${f.met<5?'раза':'раз'}, последний раз ${clock.day-f.last<=0?'сегодня':clock.day-f.last===1?'вчера':(clock.day-f.last)+' дн. назад'}. Общайся как со знакомым.`:f.met===1?` Собеседник — ${player.name}, вы только что познакомились.`:` Собеседника (${player.name}) ты раньше не встречал${f.female?'а':''}.`;
  const ex=Array.isArray(f.lines)&&f.lines.length?` Твои словечки, для примера (не повторяй дословно): «${f.lines[hashStr(f.id+clock.day)%f.lines.length]}», «${f.lines[(hashStr(f.id)+1)%f.lines.length]}».`:'';
  const TY={drinker:' Любишь выпить, но выпивку не хвалишь и отказ спокойно принимаешь; ты немного грустный и смешной.',homeless:' У тебя нет дома, но ты держишься с достоинством, знаешь все дворы и не жалуешься на жизнь.',bombila:' Подвозишь без лицензии и хитришь с ценой, но без угроз — можно и поторговаться.',blogger:' Ведёшь свой канал, всё снимаешь на телефон и зовёшь подписаться; шумный, но не злой.',granny:' Сидишь у подъезда, всё про всех знаешь и жалуешься на порядок во дворе.',activist:' Пишешь жалобы в мэрию и всех зовёшь подписать.'};
  return bio+sp+(TY[f.type]||'')+ex+rel+(typeof neighbourStoryContext==='function'?neighbourStoryContext(f.id):'');}
// внутри заведения: свой человек за стойкой или за столиком
function folkInterior(it){if(!FOLK.ready||!it)return;
  const held=n=>n===chatNpc||(n.companionOf&&typeof companion!=='undefined'&&companion&&companion.w===n.companionOf)||(typeof SIT!=='undefined'&&SIT.card&&SIT.card.neighbourStory&&SIT.card.participant===n);
  for(const n of it.npcs)if(n.origP&&!held(n)){n.p=n.origP;n.origP=null;n.folk=null;}
  it.npcs=it.npcs.filter(n=>!n.folkGuest||held(n));
  for(const f of FOLK.list){if(f.trip||f.away||folkPersonBusy(f))continue;const pl=f.places[f.at];if(!pl||!pl.inside||pl.key!==it.key)continue;
    if(f.at==='work'){const st=it.npcs.find(n=>n.role==='staff'&&!n.origP);if(st){st.origP=st.p;st.p=f.p;st.folk=f.id;continue;}}
    const tb=it.furn.find(q=>q.spot==='table'&&!q.taken);let x,y,hx=0,hy=1;if(tb){x=tb.x-1.05;y=tb.y;hx=1;hy=0;tb.taken=true;}else{x=1.5+Math.random()*(it.w-3);y=2.5+Math.random()*(it.h-5);}
    it.npcs.push({p:f.p,x,y,hx,hy,seated:!!tb,phase:Math.random()*6,role:'resident',isInterior:true,state:'idle',memory:f.p.memory,folk:f.id,folkGuest:true});}}
