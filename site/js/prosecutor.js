// ===== Прокурор Бирэн абый: приёмная в центре, жалоба на штраф, сюжет «по собственному желанию» =====
// Данные — второго программиста: cityPeople (role:'prosecutor'), cityPlaces ('prosecutor-office'), cityTexts.prosecutor.
// Персонаж вымышленный, это городская сатира: намёки и шутки, без сумм и схем. Приёмная — обычный бизнес-центр, не настоящая прокуратура.
// Прогресс — PROG.pros (уходит в аккаунт вместе с PROG): штрафы для жалобы, шаг сюжета, сколько его не будет.
const PROS={poi:null,w:null,t:0,onBau:false,jour:null,bau:null,bauN:-1,visit:0};
const PROS_LL={bauman:[55.79242,49.11140],market:[55.78655,49.10838],square:[55.79686,49.12514]};   // если в ориентирах не найдётся
function prosData(){const P=(window.cityPeople||[]).find(p=>p.role==='prosecutor'),T=(window.cityTexts||{}).prosecutor,pl=(window.cityPlaces||[]).find(p=>p.id==='prosecutor-office');return P&&T&&pl?{P,T,pl}:null;}
function prosState(){const S=PROG.pros||(PROG.pros={fines:[],step:0,on:0,met:0,ev:{}});if(!Array.isArray(S.fines))S.fines=[];if(!S.ev)S.ev={};return S;}
function prosLL(id,name){const l=(window.cityLandmarks||[]).find(q=>q.name===name);return llToXY(l?l.ll:PROS_LL[id]);}
// улица Баумана пешеходная — её нет в сетке для «ближайшей улицы», поэтому держим её отрезки отдельно (пересчёт, когда подгрузились кварталы)
function prosBau(){if(PROS.bauW!==world||PROS.bauN!==world.roads.length){PROS.bauW=world;PROS.bauN=world.roads.length;PROS.bau=world.roads.filter(r=>r&&/Баумана/.test(r.n||'')&&r.p&&r.p.length>1);}return PROS.bau;}
function prosOnBauman(x,y,R){for(const r of prosBau())for(let i=0;i<r.p.length-1;i++){const a=world.nodes[r.p[i]],b=world.nodes[r.p[i+1]];if(!a||!b)continue;const vx=b[0]-a[0],vy=b[1]-a[1],L2=vx*vx+vy*vy||1;const t=clamp(((x-a[0])*vx+(y-a[1])*vy)/L2,0,1);if(Math.hypot(a[0]+vx*t-x,a[1]+vy*t-y)<R)return true;}return false;}
function prosBauPt(){const L=prosLL('bauman','Улица Баумана');let best=L,bd=400;for(const r of prosBau())for(const i of r.p){const n=world.nodes[i];if(!n)continue;const d=dist(n[0],n[1],L[0],L[1]);if(d<bd){bd=d;best=[n[0],n[1]];}}return best;}
function prosGone(){const S=prosState();return (S.gone||0)>clock.minutes;}

// ---------- штрафы: запоминаем, чтобы было что обжаловать (10 игровых дней) ----------
function prosNoteFine(sum,why){sum=Math.round(sum);why=String(why||'Штраф');if(!(sum>0)||/владельцу/.test(why))return;const S=prosState();
  S.fines.push({t:Math.round(clock.minutes),sum,why:why.slice(0,90)});if(S.fines.length>8)S.fines.shift();progSave();}
function prosFineActive(f){const now=clock.minutes;return !!f&&prosState().fines.includes(f)&&!f.done&&now-f.t<10*1440&&!((f.retry||0)>now);}
function prosFine(){const S=prosState();for(let i=S.fines.length-1;i>=0;i--){const f=S.fines[i];if(prosFineActive(f))return f;}return null;}

// ---------- приёмная на карте ----------
function prosPlace(){if(!world||!world.meta||!world.pois)return;const D=prosData();if(!D)return;
  if(!PROS.poi){const [x,y]=llToXY(D.pl.ll);PROS.poi={x,y,t:'prosecutor',n:D.pl.name||'Приёмная прокурора',st:'',i:0};}
  if(PROS.w!==world||!world.pois.includes(PROS.poi)){PROS.poi._b=undefined;world.pois.push(PROS.poi);PROS.w=world;}}
// сам прокурор за столом: грузный, тёмный костюм, часы; в кэше интерьера — сажаем или убираем при каждом входе
function prosSeat(it){const D=prosData();if(!D)return null;let n=it.npcs.find(q=>q.role==='prosecutor');
  if(prosGone()){if(n)it.npcs.splice(it.npcs.indexOf(n),1);return null;}if(n)return n;
  const P=D.P,lk=P.look||{};const p=makePersona('resident');Object.assign(p,{name:P.name,age:P.age||56,female:!!P.female,job:'прокурор',trait:P.speech||'говорит обтекаемо',mood:'довольное',clothes:lk.suit||'#3A3F4A',pants:'#2A2D35',build:lk.build||'heavy',watch:!!lk.watch,tie:'#8C2F39',hairStyle:3,bag:null,lines:P.lines,
    ctx:`Ты — ${P.name}, прокурор в этой игре. Персонаж вымышленный, это добрая городская комедия. ${P.bio||''} Как говоришь: ${P.speech||''}. Любишь: ${P.likes||''}. Не любишь: ${P.dislikes||''}. Ты грузный, в дорогом тёмном костюме, с заметными часами. Видно, что не очень честный: отвечаешь обтекаемо и намёками, обещаешь «решить вопрос», хвалишь подарки и чак-чак, боишься журналистов и проверок. Никогда не называй сумм, не объясняй, что и как передать, не предлагай схем — только шутки, играют и дети. Про жалобу на штраф скажи, что её кладут тебе на стол (на приёме).`});
  n={p,x:it.w/2,y:0.92,hx:0,hy:1,seated:true,phase:0,role:'prosecutor',isInterior:true,state:'idle',memory:p.memory};it.npcs.push(n);return n;}

// ---------- приём: жалоба на штраф или разговор ----------
function prosAtDesk(it,visit){return scene==='interior'&&interior===it&&it&&it.kind==='prosecutor'&&visit===PROS.visit&&Math.abs(player.ix-it.w/2)<=2.2&&player.iy<=3.6;}
function prosReception(){const D=prosData(),it=interior,visit=PROS.visit;if(!D||!prosAtDesk(it,visit))return;const S=prosState();const n=prosSeat(it);
  if(!n){sitCard({icon:'⚖️',title:'Приёмная прокурора',text:'Кресло пустое. Помощник разводит руками: «Бирэн абый ушёл по собственному желанию. Жалобы пока складываем в коробку».',ttl:14,choices:[{t:'Понятно',primary:true,run:()=>{}}]});return;}
  if(!S.met){S.met=1;progSave();}
  // Проверка требует дойти до стола. Вход и повторный вход в кэшированный интерьер не двигают сюжет.
  if(prosStep()&&prosStep().id==='check'){say(n,'Всё зарегистрировано. Теперь ждите городскую ленту.',6);prosDone('check');}
  say(n,pick(n.p.lines||['Вопрос-то решаемый…']),6);const f=prosFine();
  sitCard({icon:'⚖️',title:`${n.p.name}, прокурор`,text:f?`Ваш штраф: ${f.why} — ${fmtMoney(f.sum)}. Можно подать жалобу: бумагу кладут на стол, а там — как повезёт.`:'Штрафов, которые можно обжаловать, нет: жалобу принимают в течение 10 игровых дней.',ttl:0,
    choices:[...(f?[{t:`Подать жалобу · ${fmtMoney(f.sum)}`,primary:true,run:()=>prosAppeal(n,f,it,visit)}]:[]),{t:'Поговорить',primary:!f,run:()=>{if(prosAtDesk(it,visit)&&it.npcs.includes(n)&&!prosGone())openChat(n);}},{t:'Уйти',run:()=>{}}]});}
function prosAppeal(n,f,it=interior,visit=PROS.visit){const D=prosData();if(!D||!prosAtDesk(it,visit)||!it.npcs.includes(n)||prosGone())return;
  if(!prosFineActive(f)){setHint('Эта жалоба уже рассмотрена или пока недоступна. Обратитесь в приёмную снова.');return;}
  const S=prosState(),A=D.T.appeal||{};if(!busyFor('appeal',60))return;spendTime(20);
  const press=S.on&&(S.step===3||S.step===4);   // поддержка журналиста действует и после регистрации проверки; совместимо со старыми сохранениями
  const r=Math.random(),out=press?'granted':r<0.5?'refused':r<0.82?'lost':'granted';const line=pick(A[out]||['Жалоба рассмотрена.']);say(n,line,6);
  if(out==='granted'){f.done=1;let back=f.sum;if(typeof ECON!=='undefined'&&ECON.owed>0){const o=Math.min(ECON.owed,back);ECON.owed-=o;back-=o;}   // штраф ушёл в долг по суду — сначала гасим долг
    if(back>0)sitMoney(back,`⚖️ Штраф отменён по жалобе (${f.why})`);else addEvent(`⚖️ Штраф отменён по жалобе (${f.why}): долг по суду уменьшен на ${fmtMoney(f.sum)}`,'say');sitMood(5);}
  else if(out==='lost'){f.retry=Math.round(clock.minutes+1440);sitMood(-2);}
  else{f.done=1;sitMood(-3);}
  progSave();
  sitCard({icon:'⚖️',tone:out==='granted'?'':'alert',title:out==='granted'?'Жалобу удовлетворили':out==='lost'?'Бумаги потерялись':'Жалобу отклонили',text:line+(out==='lost'?' Можно прийти снова завтра.':''),ttl:12,choices:[{t:'Понятно',primary:true,run:()=>{}}]});}

// ---------- сюжет: слухи → улики → журналист → проверка → ушёл сам ----------
function prosStep(){const D=prosData(),S=prosState();return D&&S.on&&S.step<5?(D.T.expose||[])[S.step]||null:null;}
function prosMark(){for(const k of ['pros:go'])unmark(k);const st=prosStep();if(!st)return;const S=prosState();let at=null,icon='⚖️',label=st.title;
  switch(st.id){case 'rumors':at=prosBauPt();icon='🗣';label='Расспросить на Баумана';break;
    case 'evidence':if(!S.ev.cafe){at=prosBauPt();icon='☕';label='Кафе на Баумана';}else{at=prosLL('market','Колхозный рынок');icon='🧾';label='Чек — на Колхозном рынке';}break;
    case 'journalist':at=prosLL('square','Площадь Свободы');icon='📝';label='Журналист на площади Свободы';break;
    case 'check':at=PROS.poi?[PROS.poi.x,PROS.poi.y]:null;label='Приёмная прокурора';break;
    case 'resign':at=prosLL('square','Площадь Свободы');icon='📰';label='Городская лента';break;}
  if(at)mark(null,'pros:go',at[0],at[1],icon,label,{arrow:true,color:'#8C2F39'});}
function prosStart(){const S=prosState();if(S.on)return;S.on=1;S.step=0;S.ev={};progSave();prosAnnounce();}
function prosAnnounce(){const st=prosStep();if(!st)return;addEvent(`⚖️ ${st.title}: ${st.do}`,'say');if(window.cityPhone)try{window.cityPhone.push({from:'Слухи',text:`${st.title}: ${st.do}`,kind:'event'});}catch(e){}prosMark();}
function prosDone(expected){const st=prosStep();if(!st||(expected&&st.id!==expected))return;const S=prosState(),r=st.reward||{};S.step++;S.ev={};progSave();unmark('pros:go');
  if(r.money)sitMoney(r.money,`⚖️ ${st.title}`);if(r.mood)sitMood(r.mood);
  const last=S.step>=5;if(last){S.gone=Math.round(clock.minutes+7*1440);S.back=0;progSave();sitRep(2,'вывели прокурора на чистую воду');}
  sitCard({icon:last?'📰':'⚖️',title:st.title,text:st.text,ttl:16,choices:[{t:last?'Вот это новости':'Дальше',primary:true,run:()=>{if(!last)prosAnnounce();}}],onTimeout:()=>{if(!last)prosAnnounce();}});}
// журналист на площади — временный прохожий с блокнотом
function prosJournalist(){if(PROS.jour&&walkers.includes(PROS.jour))return PROS.jour;const [x,y]=prosLL('square','Площадь Свободы');const nd=nearestNode(x,y,world.pedAdj,120);if(nd<0)return null;
  const q=sidewalkPos(nd);const o=new Walker('resident',nd);o.temp=true;o.keep=true;o.x=q[0];o.y=q[1];o.state='sit';o.ttl=9e9;o.p.job='журналист городской газеты';o.p.bag='#6B4F2A';o.journalist=true;walkers.push(o);PROS.jour=o;return o;}
function prosDropJournalist(){const o=PROS.jour;PROS.jour=null;if(!o)return;const i=walkers.indexOf(o);if(i>=0)walkers.splice(i,1);}

defSit('prosecutor',{title:'Прокурор',quiet:true,always:true,
  start(){return true;},
  update(s,dt){PROS.t-=dt;if(PROS.t>0)return;PROS.t=1;prosPlace();const D=prosData();if(!D||!world)return;const S=prosState();
    // вернулся после «ухода»
    if(S.gone&&!S.back&&S.gone<=clock.minutes){S.back=1;progSave();addEvent('📰 '+(pick(D.T.back||[])||'Бирэн абый вернулся в приёмную. Говорит, желание прошло'),'say');}   // cityTexts.prosecutor.back — свои варианты, если второй программист добавит
    // новость дня — раз в игровые сутки, к обеду
    if(S.newsDay!==clock.day&&gHour()>=11&&gHour()<21){S.newsDay=clock.day;progSave();const L=(D.T.news||[]).filter(t=>prosGone()===/собственному/.test(t));if(L.length){const t=pick(L);addEvent('📰 '+t);if(window.cityPhone)try{window.cityPhone.push({from:'Городская газета',text:t,kind:'news'});}catch(e){}}}
    // сюжет начинается после первого приёма, когда игрок снова на улице
    if(S.met&&!S.on&&scene==='city'&&!SIT.card)prosStart();
    const st=prosStep();if(!st){prosDropJournalist();return;}
    if(!SIT.marks.has('pros:go'))prosMark();
    if(scene!=='city'||player.bus)return;
    PROS.onBau=st.id==='rumors'&&prosOnBauman(player.x,player.y,40);
    if(st.id==='evidence'&&S.ev.cafe){const [x,y]=prosLL('market','Колхозный рынок');if(dist(x,y,player.x,player.y)<70&&!SIT.card)prosDone();}
    if(st.id==='journalist'){const [x,y]=prosLL('square','Площадь Свободы');if(dist(x,y,player.x,player.y)<200)prosJournalist();}else prosDropJournalist();
    if(st.id==='resign'){const [x,y]=prosLL('square','Площадь Свободы');if(dist(x,y,player.x,player.y)<45&&!SIT.card)prosDone();}},
  action(s){const st=prosStep();if(!st||player.vehicle||player.bus)return null;
    if(st.id==='rumors'&&PROS.onBau){let w=null,bd=4;for(const q of walkers){if(q.bus||q.inside||q.role!=='resident'||q.temp||q.state==='hurt')continue;const d=dist(q.x,q.y,player.x,player.y);if(d<bd){bd=d;w=q;}}
      if(w)return {label:`Расспросить про Бирэн абый: ${w.p.name}`,run:()=>{const D=prosData();faceTo(w,player.x,player.y);say(w,pick(D.T.lines||['Говорят разное…']),6);prosDone();}};}
    if(st.id==='journalist'&&PROS.jour&&dist(PROS.jour.x,PROS.jour.y,player.x,player.y)<4)return {label:`Рассказать журналисту про фото и чек`,run:()=>{const o=PROS.jour;faceTo(o,player.x,player.y);say(o,'Фото, чек и курьер — этого хватит. Пишу!',5);prosDone();setTimeout(prosDropJournalist,8000);}};
    return null;},
  actionInside(s){if(!interior||interior.kind!=='prosecutor')return null;if(Math.abs(player.ix-interior.w/2)>2.2||player.iy>3.6)return null;
    return {label:prosGone()?'Кресло прокурора пустое':'Приём у прокурора: жалоба на штраф или разговор',run:prosReception};}});
defEnter(it=>{PROS.visit++;if(it.kind==='prosecutor'){prosSeat(it);return;}
  const st=prosStep(),S=prosState();
  if(st&&st.id==='evidence'&&!S.ev.cafe&&it.kind==='cafe'&&prosOnBauman(player.x,player.y,45)){S.ev.cafe=1;progSave();prosMark();
    setTimeout(()=>{if(interior!==it)return;sitCard({icon:'📷',title:'Фото у кафе',text:'Официант показывает фото на телефоне: Бирэн абый у входа, смотрит строго в другую сторону. Теперь бы чек — говорят, коробки покупали на Колхозном рынке.',ttl:14,choices:[{t:'На рынок',primary:true,run:()=>{}}]});},800);}});
