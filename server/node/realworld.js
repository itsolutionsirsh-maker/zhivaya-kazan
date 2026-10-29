'use strict';
// Настоящая Казань в игре: погода (MET Norway) и оповещения ГУ МЧС России по Республике Татарстан.
//
// Погода: api.met.no, бесплатно и для коммерческих проектов, лицензия CC BY 4.0 — подпись «Погода: MET Norway» в игре обязательна.
//   Требования сервиса: User-Agent с адресом сайта, координаты не точнее 4 знаков, не чаще Expires, If-Modified-Since.
// Тревоги: официальный канал ГУ МЧС по РТ в мессенджере MAX (@mchs_tatarstan). На max.ru посты без входа не видны,
//   поэтому читаем открытое зеркало каталога каналов (listmax.ru) — там тексты постов канала слово в слово, со временем.
//   Берём только короткие официальные сообщения «Внимание! … ВВЕДЁН режим «…опасность»» и «режим … снят / отбой».
//   Ничего не придумываем: в игре показывается текст МЧС как есть, с источником и временем.
//   Отбой в канал приходит не всегда (часто — только в приложение «МЧС России»), поэтому тревога без отбоя гаснет
//   через ALERT_MAX_MS, а модератор может снять её или включить вручную (mod.html).

const KAZAN={lat:55.7963,lon:49.1088};
const WEATHER_URL=`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${KAZAN.lat}&lon=${KAZAN.lon}`;
const ALERT_URL='https://listmax.ru/channels/detail/mchs_tatarstan';
const SOURCE={name:'ГУ МЧС России по Республике Татарстан',channel:'https://max.ru/mchs_tatarstan'};
const UA='ZhivayaKazan/1.0 (+https://kazan.lifegorod.com)';
const ALERT_MAX_MS=3*3600e3;      // тревога без отбоя дольше трёх часов — гаснет
const ENDED_SHOW_MS=30*60e3;      // «отбой» показываем ещё полчаса
const WEATHER_STALE_MS=3*3600e3;  // погода старше трёх часов — игра возвращается к своей
const TITLES={drone:'Беспилотная опасность',missile:'Ракетная опасность'};

// ---------- погода ----------
function weatherFromMet(j,now){
  const ts=j&&j.properties&&j.properties.timeseries;if(!Array.isArray(ts)||!ts.length)return null;
  let cur=ts[0];for(const e of ts){const t=Date.parse(e.time);if(t<=now)cur=e;else break;}   // прогноз почасовой: запись на текущий час
  const d=cur.data||{},inst=(d.instant&&d.instant.details)||{},n1=d.next_1_hours||d.next_6_hours||{};
  const sym=String((n1.summary&&n1.summary.symbol_code)||'');
  const t=Number.isFinite(+inst.air_temperature)&&inst.air_temperature!==null?+inst.air_temperature:null;
  let kind='clear';
  if(/snow/.test(sym))kind='snow';
  else if(/sleet/.test(sym))kind=t!==null&&t<=0?'snow':'rain';
  else if(/rain|drizzle|shower/.test(sym))kind='rain';
  else if(/fog/.test(sym))kind='fog';
  else if(/^cloudy/.test(sym))kind='cloudy';
  else if(/partlycloudy/.test(sym))kind=(+inst.cloud_area_fraction||0)>60?'cloudy':'clear';
  const ice=t!==null&&t>-5&&t<1&&/sleet|rain|drizzle/.test(sym);   // дождь или мокрый снег около нуля — гололёд
  return {kind,t:t===null?null:Math.round(t),wind:Number.isFinite(+inst.wind_speed)?Math.round(+inst.wind_speed):null,
    sym,ice,thunder:/thunder/.test(sym),at:now};
}

// ---------- тревоги ----------
const MONTHS={января:0,февраля:1,марта:2,апреля:3,мая:4,июня:5,июля:6,августа:7,сентября:8,октября:9,ноября:10,декабря:11};
// «29 октября 2026 г. в 04:29» — московское время
function parseRuTime(s){const m=/(\d{1,2})\s+([а-яё]+)\s+(\d{4})\s*г?\.?\s*в\s*(\d{1,2}):(\d{2})/i.exec(String(s||''));if(!m)return null;
  const mo=MONTHS[m[2].toLowerCase()];if(mo===undefined)return null;return Date.UTC(+m[3],mo,+m[1],+m[4]-3,+m[5]);}
function decode(s){return String(s).replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/&quot;/g,'"').replace(/&#x27;|&#39;/g,"'")
  .replace(/&laquo;/g,'«').replace(/&raquo;/g,'»').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/[‎‏]/g,'').replace(/[ \t]+/g,' ').trim();}
function parsePosts(html){const out=[];const re=/<article\b[\s\S]*?<\/article>/gi;let m;
  while((m=re.exec(String(html||'')))){const a=m[0];const tm=/<time\b[^>]*>([^<]+)<\/time>/i.exec(a);const p=/<p\b[^>]*whitespace-pre-wrap[^>]*>([\s\S]*?)<\/p>/i.exec(a);
    if(!tm||!p)continue;const at=parseRuTime(decode(tm[1]));if(!at)continue;out.push({at,text:decode(p[1]).slice(0,600)});}
  return out;}
// только короткие официальные сообщения о режиме, не памятки «что делать при…»
function classify(text){const t=String(text||'').replace(/ё/g,'е').replace(/Ё/g,'Е');if(t.length>400||!/татарстан/i.test(t))return null;
  const kind=/ракетн\S*\s+опасн/i.test(t)?'missile':/беспилотн\S*\s+опасн/i.test(t)?'drone':null;if(!kind)return null;
  if(/опасность[»"]?\s+(снят|отмен)|режим\S*\s+[^.]{0,40}(снят|отменен)|отбой/i.test(t))return {kind,on:false};
  if(/(введен|объявлен)\s+режим|режим[^.]{0,40}\s(введен|объявлен)\b/i.test(t))return {kind,on:true};
  return null;}
function alertsFrom(posts,now,override){
  // posts — новые сверху; при равном времени (минуты) берётся тот, что выше на странице
  const last={};for(const p of posts){const c=classify(p.text);if(!c)continue;const cur=last[c.kind];if(!cur||p.at>cur.at)last[c.kind]={at:p.at,on:c.on,text:p.text};}
  const alerts=[],ended=[];
  for(const kind of ['missile','drone']){const b=last[kind];if(!b)continue;
    if(override&&override.mode==='off'&&b.at<=override.at)continue;                 // модератор снял — до нового сообщения МЧС
    if(b.on&&now-b.at<ALERT_MAX_MS)alerts.push({kind,title:TITLES[kind],text:b.text,at:b.at,src:SOURCE.name});
    else if(!b.on&&now-b.at<ENDED_SHOW_MS)ended.push({kind,title:TITLES[kind],text:b.text,at:b.at,src:SOURCE.name});}
  if(override&&override.mode==='on'&&now<override.until&&!alerts.some(a=>a.kind===override.kind))
    alerts.push({kind:override.kind,title:TITLES[override.kind],text:override.text,at:override.at,src:SOURCE.name+' (вручную)'});
  return {alerts,ended};}

function RealWorld(o={}){
  const fetchFn=o.fetch||globalThis.fetch,now=o.now||Date.now,log=o.log||(()=>{}),fs=o.fs,file=o.file;
  const wURL=o.weatherUrl||WEATHER_URL,aURL=o.alertUrl||ALERT_URL;
  let st={weather:null,wMod:'',posts:[],override:null,aOk:0,aErr:0,wErr:0};
  try{if(fs&&file)st=Object.assign(st,JSON.parse(fs.readFileSync(file,'utf8')));}catch(e){}
  let ver=1,lastKey='',timers=[],nextW=0,onChange=o.onChange||(()=>{});
  const save=()=>{if(!fs||!file)return;try{fs.writeFileSync(file+'.tmp',JSON.stringify({weather:st.weather,wMod:st.wMod,posts:st.posts.slice(0,20),override:st.override}));fs.renameSync(file+'.tmp',file);}catch(e){}};
  function snapshot(){const t=now();const w=st.weather&&t-st.weather.at<WEATHER_STALE_MS?Object.assign({src:'MET Norway'},st.weather):null;
    const a=alertsFrom(st.posts,t,st.override);return {ok:1,v:ver,weather:w,alerts:a.alerts,ended:a.ended,source:SOURCE.channel,at:t};}
  function changed(){const s=snapshot();const key=JSON.stringify([s.weather&&[s.weather.kind,s.weather.t,s.weather.ice],s.alerts.map(a=>[a.kind,a.at]),s.ended.map(a=>[a.kind,a.at])]);
    if(key!==lastKey){lastKey=key;ver++;onChange(snapshot());}}
  async function pullWeather(){const t=now();if(t<nextW)return;
    try{const h={'User-Agent':UA,Accept:'application/json'};if(st.wMod)h['If-Modified-Since']=st.wMod;
      const r=await fetchFn(wURL,{headers:h,signal:AbortSignal.timeout(15000)});
      const exp=Date.parse(r.headers.get('expires')||'');nextW=Math.min(t+3600e3,Math.max(t+10*60e3,Number.isFinite(exp)?exp:0));
      if(r.status===304){if(st.weather)st.weather.at=t;st.wErr=0;save();changed();return;}
      if(!r.ok)throw new Error('HTTP '+r.status);
      const w=weatherFromMet(await r.json(),t);if(!w)throw new Error('нет данных');st.weather=w;st.wMod=r.headers.get('last-modified')||'';st.wErr=0;save();changed();}
    catch(e){nextW=t+10*60e3;if(!st.wErr++)log('погода: не получил',e.message);}}
  async function pullAlerts(){const t=now();
    try{const r=await fetchFn(aURL,{headers:{'User-Agent':UA,Accept:'text/html'},signal:AbortSignal.timeout(15000)});if(!r.ok)throw new Error('HTTP '+r.status);
      const posts=parsePosts(await r.text());if(!posts.length)throw new Error('посты не разобрались');
      // порядок страницы (новые сверху) главнее: у постов только минуты, тревога и отбой могут прийти в одну минуту
      const fresh=new Set(posts.map(p=>p.at+'|'+p.text));st.posts=posts.concat(st.posts.filter(p=>!fresh.has(p.at+'|'+p.text)));
      st.posts.sort((a,b)=>b.at-a.at);/* сортировка устойчивая: при равном времени остаётся порядок страницы */st.posts=st.posts.slice(0,30);st.aOk=t;if(st.aErr)log('тревоги МЧС: источник снова отвечает');st.aErr=0;save();changed();}
    catch(e){if(!st.aErr++)log('тревоги МЧС: не получил',e.message);changed();}}
  // модератор: off — снять текущие до нового сообщения МЧС; on — включить вручную (текст МЧС слово в слово); auto — вернуть как есть
  function moderate(b){const t=now();const mode=String(b.mode||'');
    if(mode==='off')st.override={mode:'off',at:t};
    else if(mode==='on'){const kind=b.kind==='missile'?'missile':'drone';const text=String(b.text||'').trim().slice(0,400);if(!text)return {err:'text'};
      st.override={mode:'on',kind,text,at:t,until:t+ALERT_MAX_MS};}
    else if(mode==='auto')st.override=null;else return {err:'mode'};
    save();changed();return Object.assign(status(),snapshot(),{ok:1});}
  function status(){const t=now();return {override:st.override,alertSourceOk:st.aOk?Math.round((t-st.aOk)/1000)+' с назад':'нет',alertErrors:st.aErr,weatherAt:st.weather?Math.round((t-st.weather.at)/60000)+' мин назад':'нет',posts:st.posts.slice(0,5).map(p=>({at:p.at,text:p.text.slice(0,140),kind:classify(p.text)}))};}
  function start(){if(o.off)return;const jit=()=>Math.round(Math.random()*20e3);
    setTimeout(pullWeather,2000).unref?.();setTimeout(pullAlerts,4000).unref?.();
    const every=o.alertEvery||90e3;timers.push(setInterval(pullWeather,60e3),setInterval(()=>o.alertEvery?pullAlerts():setTimeout(pullAlerts,jit()),every),setInterval(changed,60e3));
    for(const x of timers)x.unref?.();}
  function stop(){for(const x of timers)clearInterval(x);timers=[];}
  return {start,stop,snapshot,moderate,status,pullWeather,pullAlerts,set onChange(f){onChange=f;}};
}
module.exports={RealWorld,weatherFromMet,parsePosts,parseRuTime,classify,alertsFrom,WEATHER_URL,ALERT_URL,SOURCE,ALERT_MAX_MS,TITLES};
