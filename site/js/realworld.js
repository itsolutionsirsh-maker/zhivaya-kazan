// ===== Настоящая Казань: погода и оповещения МЧС с сервера (server/node/realworld.js) =====
// Погода у всех одна, настоящая (MET Norway, подпись обязательна). Пока сервера нет или данные старые — своя случайная, как раньше.
// Тревога — текст ГУ МЧС России по РТ слово в слово, с источником и временем. Игра ничего не придумывает и оповещение не заменяет:
// плашка сверху, жители уходят с улиц, машин меньше. Реплики людей — из realworld-lines.js второго программиста (cityRealLines), если есть.
const RW={snap:null,t:0,min:false,key:'',endKey:'',sayT:0,credited:false};
const RW_TITLE={drone:'Беспилотная опасность',missile:'Ракетная опасность'};
function rwT(t){return t==null?'':(t>0?'+':t<0?'−':'')+Math.abs(t)+'°';}
function rwTime(at){const d=new Date(at+3*3600e3);return String(d.getUTCHours()).padStart(2,'0')+':'+String(d.getUTCMinutes()).padStart(2,'0');}   // по Москве
function rwAlertOn(){const s=RW.snap;return !!(s&&s.alerts&&s.alerts.length);}
function rwLines(path){let o=window.cityRealLines;for(const k of path){if(!o)return null;o=o[k];}return Array.isArray(o)&&o.length?o:(typeof o==='string'&&o?[o]:null);}
// погода для реплик и ленты: гололёд, мороз, жара, ветер — от настоящей температуры и ветра
function rwWeatherKey(){if(!weather.real)return null;const t=weather.t;
  if(weather.ice)return 'ice';if(weather.kind==='snow')return 'snow';if(weather.kind==='fog')return 'fog';if(t!=null&&t<=-15)return 'frost';
  if(t!=null&&t>=28)return 'heat';if(weather.kind==='rain')return 'rain';if((weather.wind||0)>=10)return 'wind';return null;}
const RW_FEED={rain:'Пошёл дождь{t}',snow:'Пошёл снег{t}',ice:'На улицах гололёд{t} — осторожнее',frost:'Мороз{t}',heat:'Жара{t}',fog:'Город в тумане{t}',clear:'Распогодилось{t}',cloudy:'Небо затянуло{t}'};
function rwWeather(w){
  if(!w){if(weather.real){weather.real=false;weather.t=null;weather.ice=false;weather.wind=null;weather.ttl=rnd(120,300);}return;}
  const first=!weather.real,was=weather.kind,wasKey=rwWeatherKey();
  weather.real=true;weather.t=w.t;weather.ice=!!w.ice;weather.wind=w.wind;weather.thunder=!!w.thunder;weather.kind=w.kind;weather.at=w.at;
  if(!RW.credited){RW.credited=true;const bs=$('#brandSub');if(bs&&!/MET Norway/.test(bs.textContent))bs.textContent+=' · погода: MET Norway';}
  const key=rwWeatherKey();if(first){RW.firstPending=true;rwFirst();return;}
  if(was===w.kind&&wasKey===key)return;
  const k=key&&RW_FEED[key]?key:w.kind;const own=rwLines(['feed',k]);
  const text=(own?pick(own):(RW_FEED[k]||'')).replace('{t}',w.t!=null?(own?rwT(w.t):', '+rwT(w.t)):'');
  if(text)addEvent(text);}
// «погода сейчас» — когда игрок уже в городе, а не под анкетой
function rwFirst(){const pm=$('#profileModal');if(!RW.firstPending||!weather.real||scene!=='city'||(pm&&!pm.hidden))return;RW.firstPending=false;addEvent('Погода в Казани сейчас: '+weatherLabel().replace(/^\S+\s/,''));}
function rwSay(path){const L=rwLines(path);if(!L)return;let best=null,bd=30;
  for(const w of walkers){if(w.bus||w.inside||w.state==='hurt'||w.sitBy||w===chatNpc)continue;const d=dist(w.x,w.y,player.x,player.y);if(d<bd){bd=d;best=w;}}
  if(best)say(best,pick(L),6);}
function rwAlerts(j){const list=j.alerts||[];const key=list.map(a=>a.kind+':'+a.at).join('|');
  if(key!==RW.key){const had=!!RW.key;RW.key=key;
    if(list.length){RW.min=false;const a=list[0];addEvent(`⚠️ ${a.title}. Сообщение: ${a.src}, ${rwTime(a.at)} по Москве`,'alert');rwSay(['alert','start']);}
    else if(had&&!(j.ended||[]).length)addEvent('Плашка тревоги снята: новых сообщений МЧС нет. Проверьте приложение «МЧС России»');}
  const end=(j.ended||[]).filter(e=>!list.some(a=>a.kind===e.kind));const ek=end.map(e=>e.kind+':'+e.at).join('|');
  if(ek&&ek!==RW.endKey){RW.endKey=ek;addEvent(`✅ ${end[0].title}: отбой. ${end[0].src}, ${rwTime(end[0].at)} по Москве`);rwSay(['alert','end']);}
  rwRender();}
function rwRender(){const bar=$('#alertBar');if(!bar)return;const list=(RW.snap&&RW.snap.alerts)||[];
  document.body.classList.toggle('rw-alert',list.length>0);if(!list.length){bar.hidden=true;return;}
  bar.hidden=false;bar.classList.toggle('min',RW.min);const a=list[0];
  $('#alertTitle').textContent='⚠️ '+list.map(x=>x.title).join(' · ');
  $('#alertText').textContent=list.map(x=>x.text).join('\n');
  $('#alertSrc').textContent=`${a.src}, ${rwTime(a.at)} по Москве. Это настоящее оповещение, игра его не заменяет: следите за приложением «МЧС России» и сигналами в городе.`;
  $('#alertMin').textContent=RW.min?'Подробнее':'Свернуть';$('#alertMin').setAttribute('aria-expanded',String(!RW.min));}
function rwApply(j){if(!j||!j.ok)return;RW.snap=j;RW.t=Date.now();rwWeather(j.weather);rwAlerts(j);}
async function rwPoll(){try{const r=await fetch('api.php?a=city',{cache:'no-store'});if(!r.ok)return;rwApply(await r.json());}catch(e){}}
// скорость машин: погода и пробки по модели — час пик на больших улицах, снег и гололёд сильнее (настоящих данных о пробках нет)
function roadSlow(r){let k=1;const w=weather.kind;
  if(weather.ice)k*=0.6;else if(w==='snow')k*=0.7;else if(w==='rain')k*=0.85;else if(w==='fog')k*=0.8;
  if(r&&r.c<=5&&typeof rushHour==='function'&&rushHour())k*=(w==='snow'||weather.ice)?0.5:0.65;
  return k;}
$('#alertMin')&&$('#alertMin').addEventListener('click',()=>{RW.min=!RW.min;rwRender();});
$('#alertTitle')&&$('#alertTitle').addEventListener('click',()=>{if(RW.min){RW.min=false;rwRender();}});
if(/^https?:/.test(location.protocol)){setTimeout(rwPoll,3000);setInterval(rwPoll,120000);}
// во время тревоги прохожие рядом время от времени говорят спокойные фразы (если они есть в данных)
if(typeof defWatch==='function')defWatch(dt=>{rwFirst();if(!rwAlertOn()||scene!=='city')return;RW.sayT-=dt||0;if(RW.sayT>0)return;RW.sayT=rnd(40,80);rwSay(['alert','during']);});
