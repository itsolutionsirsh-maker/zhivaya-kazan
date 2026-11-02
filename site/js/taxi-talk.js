// Поездка на такси: бомбила сам заговаривает. Сначала тяжёлая жизнь и чаевые,
// потом оказывается, что бизнесы есть, а баранку крутит для души.
const TAXI_PIC='img/faces/taxi-driver.jpg';
function taxiPick(a){return a[Math.floor(Math.random()*a.length)];}
function taxiMate(){const c=typeof companion!=='undefined'&&companion&&companion.w&&companion.w.p;return c?c.name:'';}
function taxiHard(w){const m=taxiMate();return taxiPick(m?[
  `О, ${player.name}, и ${m} с тобой. Жизнь тяжёлая. Бензин — космос, на Кольце стою по часу. Вам обоим расскажу, не обижайтесь.`,
  `Смена злая, а вас двое на заднем. С шести утра баранку кручу, спина деревенеет. ${m}, ты тоже слушай: чай в термосе остыл ещё у Кремля.`,
  `Эх, пробки, штрафы, резина лысая. ${player.name}, ${m}, таксую, потому что иначе совсем никак.`
]:[
  `Ой, ${player.name}, жизнь тяжёлая. Бензин — космос, на Кольце стою по часу, а дома ещё говорят, что опять без ужина.`,
  `Слушай, смена злая. С шести утра баранку кручу, спина деревенеет, чай в термосе остыл ещё у Кремля.`,
  `Эх. Пробки, штрафы, резина лысая. Таксую, потому что иначе совсем никак.`
]);}
function taxiAsk(){const m=taxiMate();return taxiPick(m?[
  `Слушай, ${player.name}, накинь на чай, а? ${m} не против, человеку на эчпочмак приятно.`,
  'Может, чаевые будут? Вас двое, а смена всё равно тяжёлая. Хоть чай с чебуреком.',
  `Накинь пару сотен, будь человеком. ${m}, ты подтверди: я сегодня ещё нормально не ел.`
]:[
  'Слушай, накинь на чай, а? Счётчик счётчиком, а человеку на эчпочмак приятно.',
  'Может, чаевые будут? Не обижайся. Смена тяжёлая, хоть чай с чебуреком.',
  'Накинь пару сотен, будь человеком. Я сегодня ещё нормально не ел.'
]);}
function taxiReveal(){const m=taxiMate();return taxiPick(m?[
  `Ладно, ${player.name}, и ты, ${m}, не смотрите так. Шашлычная и две точки с шаурмой — мои, люди там работают. А я за руль сажусь, когда в кабинете душно. Для души.`,
  'Шучу я про голод. Цех свой есть и машины в аренду. Таксую, чтоб не закиснуть. Вам двоим можно, секрет недорогой.',
  'Не жалейте меня. Бизнес уже кормит. Такси — это я для души выехал, город послушать. А вас двоих везти даже веселее.'
]:[
  'Ладно, не смотри так. У меня шашлычная и две точки с шаурмой, люди там работают. А я за руль сажусь, когда в кабинете душно. Для души.',
  'Шучу я про голод. Цех свой есть и машины в аренду. Таксую, чтоб не закиснуть. Дорогу люблю, вот и всё.',
  'Не жалей меня сильно. Бизнес уже кормит. Такси — это я для души выехал, город послушать.'
]);}
function taxiRideBegan(v){if(!v||v.talk)return;
  const names=['Ринат','Фарид','Марат','Ильдар','Равиль','Наиль','Рустем'];
  const name=v.driver||names[Math.floor(Math.random()*names.length)];
  const age=40+(typeof faceHash==='function'?faceHash(name)%14:6);
  const p={name,age,female:false,job:'бомбила',mood:'усталое',role:'staff',clothes:'#2A2E33',hair:'#3E2723',skin:'#E8C4A0',trait:'сначала жалуется на тяжёлую жизнь и просит чаевые, потом честно говорит, что свои бизнесы уже есть, а таксует для души',memory:[],lines:[]};
  const w={p,taxiRide:true,isInterior:true,x:player.x,y:player.y,seated:true,stage:0,tipped:0,closed:false};
  v.talk=w;v.driver=name;
  w.timers=[setTimeout(()=>taxiBeat(w,1),1400),setTimeout(()=>taxiBeat(w,2),9000),setTimeout(()=>taxiBeat(w,3),18000)];
  taxiRideCard(true);}
function taxiRideCard(on){const card=$('#taxiRide');if(card)card.hidden=!on;const b=$('#tripDriver');if(b)b.hidden=!on;if(on){const n=player.vehicle&&player.vehicle.talk&&player.vehicle.talk.p.name;if($('#taxiRideName'))$('#taxiRideName').textContent=n||'Водитель';}}
function taxiRideEnd(){const v=player.vehicle,w=v&&v.talk;if(w&&w.timers){w.timers.forEach(clearTimeout);w.timers=null;}
  taxiRideCard(false);const tip=$('#taxiTip');if(tip)tip.hidden=true;if(w&&chatNpc===w)closeChat();}
function taxiBeat(w,stage){const v=player.vehicle;if(!v||v.talk!==w||v.kind!=='taxi'||w.stage>=stage)return;w.stage=stage;
  const line=stage===1?taxiHard(w):stage===2?taxiAsk():taxiReveal();
  const reopen=stage===1||(stage===3&&!w.closed);
  taxiSay(w,line,reopen);}
function taxiSay(w,text,force){w.p.memory.push({role:'assistant',content:text});if(w.p.memory.length>16)w.p.memory.splice(0,w.p.memory.length-16);
  const open=chatNpc===w&&!$('#chatModal').hidden;
  if(open)appendMsg('npc',text);
  else if(force)openTaxiChat();
  else setHint(`${w.p.name} за рулём ещё говорит. Кнопка «Водитель»`);}
function openTaxiChat(){const v=player.vehicle;if(!v||v.kind!=='taxi'||!v.talk)return;const w=v.talk;w.closed=false;
  if(chatNpc!==w||$('#chatModal').hidden)openChat(w);
  const f=$('#npcFace');if(f){f.style.backgroundImage=`url("${TAXI_PIC}")`;f.style.backgroundSize='cover';f.style.backgroundPosition='center 22%';f.style.backgroundColor='#24302a';f.textContent='';f.classList.add('photo');}
  const tip=$('#taxiTip');if(tip)tip.hidden=false;if(typeof placeChatLook==='function')placeChatLook();}
function taxiTip(sum){const v=player.vehicle,w=v&&v.talk;if(!w)return;if(player.money<sum){setHint('На чай не хватает');return;}
  player.money-=sum;w.tipped=(w.tipped||0)+sum;const again=w.stage>=3;
  w.stage=3;const line=again?`Ещё ${sum} рублей? Ну ты даёшь. За такую душу я и катаю.`:`О, ${sum} рублей, красавчик. Скажу честно: шаурма моя, и точка на рынке тоже. Люди работают, а я сегодня за руль для души сел. Спасибо.`;
  taxiSay(w,line,true);addEvent(`Чаевые водителю: ${fmtMoney(sum)}`);}
function taxiReply(w,text){const t=norm(text);
  if(/(чай|чаевы|накин|держи|лови)/.test(t)&&player.money>=200){player.money-=200;w.tipped=(w.tipped||0)+200;w.stage=3;addEvent(`Чаевые водителю: ${fmtMoney(200)}`);return {reply:'О, 200 рублей, красавчик. Скажу честно: шаурма моя, и точка на рынке тоже. Люди работают, а я сегодня за руль для души сел. Спасибо.',action:''};}
  if(w.stage<2){w.stage=2;return {reply:taxiAsk(),action:''};}
  if(w.stage<3){w.stage=3;return {reply:taxiReveal(),action:''};}
  return {reply:taxiPick(['Дорогу люблю, вот и выехал. В кабинете душно.','Шаурма сама себя не проверит, а город — проверит. Я для души.','Пробка пробкой, а мне тут спокойнее, чем на планёрке.']),action:''};}
if(typeof boardTaxi==='function'){const board0=boardTaxi;boardTaxi=function(){const ok=board0.apply(this,arguments);if(ok&&player.vehicle&&player.vehicle.kind==='taxi')taxiRideBegan(player.vehicle);return ok;};}
if(typeof taxiExit==='function'){const exit0=taxiExit;taxiExit=function(){taxiRideEnd();return exit0.apply(this,arguments);};}
if(typeof placeChatLook==='function'){const look0=placeChatLook;placeChatLook=function(){look0.apply(this,arguments);if(!(chatNpc&&chatNpc.taxiRide))return;const box=$('#chatModal')&&$('#chatModal').querySelector('.box');if(!box)return;box.style.backgroundImage=`linear-gradient(rgba(12,16,14,.34),rgba(12,16,14,.7)),url("${TAXI_PIC}")`;box.style.backgroundSize='cover';box.style.backgroundPosition='center 30%';};}
if(typeof contextForNpc==='function'){const ctx0=contextForNpc;contextForNpc=function(w){const base=ctx0.apply(this,arguments);if(!w||!w.taxiRide)return base;const st=w.stage||0;const mate=typeof companion!=='undefined'&&companion&&companion.w&&companion.w.p?companion.w.p.name:'';return base+` Сейчас ты за рулём такси.${mate?` На заднем сиденье двое: ${player.name} и ${mate}. Болтай с обоими.`:' Пассажир на заднем сиденье.'} Ты казанский бомбила. Говори коротко, по-свойски, без мата. Сюжет такой и его нельзя ломать: сначала тяжёлая жизнь, потом просьба чаевых, и только после этого признание, что свои бизнесы уже есть (шаурма, шашлычная, аренда), а таксуешь для души. Сейчас этап ${st}: ${st<2?'ещё не проси бизнес, жалуйся и выйди на чаевые':st<3?'попроси чаевые, про бизнес пока намекни осторожно':'бизнес уже назван, не притворяйся бедным'}. Чаевые уже: ${w.tipped||0} ₽.`;};}
if(typeof scriptedThink==='function'){const think0=scriptedThink;scriptedThink=function(w,text){if(w&&w.taxiRide)return taxiReply(w,text);return think0.apply(this,arguments);};}
if(typeof closeChat==='function'){const close0=closeChat;closeChat=function(){const w=chatNpc;const r=close0.apply(this,arguments);if(w&&w.taxiRide){w.closed=true;const tip=$('#taxiTip');if(tip)tip.hidden=true;}return r;};}
if(typeof updateTripBox==='function'){const trip0=updateTripBox;updateTripBox=function(){trip0.apply(this,arguments);const on=!!(player.vehicle&&player.vehicle.kind==='taxi'&&player.vehicle.talk);taxiRideCard(on);};}
document.addEventListener('click',e=>{const t=e.target;if(t&&(t.id==='tripDriver'||t.id==='taxiRide'||t.closest&&t.closest('#taxiRide')))openTaxiChat();if(t&&t.id==='taxiTip')taxiTip(200);});
