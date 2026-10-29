// node --test tools/tests/realworld.test.js
// Настоящая Казань: погода MET Norway и тревоги ГУ МЧС по РТ (server/node/realworld.js) — разбор, правила, расписание. Без сети.
const test=require('node:test');
const assert=require('node:assert/strict');
const RW=require('../../server/node/realworld.js');

// как на странице зеркала канала: article → time «29 октября 2026 г. в 04:29» → p.whitespace-pre-wrap
const post=(time,text)=>`<article class="rounded-lg border"><div><p class="truncate">ГУ МЧС России по Республике Татарстан</p><time class="mt-[5px] block md:hidden">${time}</time></div><time class="hidden md:block">${time}</time><div><p class="text-sm leading-5 text-gray-900 whitespace-pre-wrap break-words">${text}</p></div></article>`;
const page=(...posts)=>`<html><body><div class="space-y-3">${posts.join('')}</div></body></html>`;
const T=(h,m,d=29)=>Date.UTC(2026,9,d,h-3,m);   // московское время → UTC

test('время поста: московское, с «г. в»',()=>{
  assert.equal(RW.parseRuTime('29 октября 2026 г. в 04:29'),T(4,29));
  assert.equal(RW.parseRuTime('1 января 2027 г. в 00:05'),Date.UTC(2026,11,31,21,5));
  assert.equal(RW.parseRuTime('вчера'),null);
});

test('разбор страницы: посты, текст без разметки и сущностей',()=>{
  const p=RW.parsePosts(page(post('29 октября 2026 г. в 04:29','Внимание! На территории Республики Татарстан ВВЕДЁН режим &laquo;Ракетная опасность&raquo;. Необходимо принять меры безопасности'),
    post('28 октября 2026 г. в 12:11','Туман местами ожидается<br>на территории Республики Татарстан')));
  assert.equal(p.length,2);assert.equal(p[0].at,T(4,29));assert.match(p[0].text,/«Ракетная опасность»/);assert.match(p[1].text,/ожидается\nна территории/);
});

test('классификация: введён, объявлен, снят, отбой; памятки и другие регионы — нет',()=>{
  const c=RW.classify;
  assert.deepEqual(c('Внимание! На территории Республики Татарстан ВВЕДЁН режим «Беспилотная опасность».'),{kind:'drone',on:true});
  assert.deepEqual(c('Внимание! На территории Республики Татарстан ВВЕДЁН режим «Ракетная опасность». Необходимо принять меры безопасности'),{kind:'missile',on:true});
  assert.deepEqual(c('Внимание! На территории Республики Татарстан объявлен режим „Беспилотная опасность“'),{kind:'drone',on:true});
  assert.deepEqual(c('Внимание! На территории Республики Татарстан режим «Беспилотная опасность» снят.'),{kind:'drone',on:false});
  assert.deepEqual(c('На территории Татарстана режим «Ракетная опасность» отменён.'),{kind:'missile',on:false});
  assert.deepEqual(c('Отбой режима «Беспилотная опасность» в Республике Татарстан.'),{kind:'drone',on:false});
  assert.equal(c('Что делать при объявлении режима «Беспилотная опасность» в Татарстане: спуститесь в подвал…'),null);
  assert.equal(c('Внимание! В Самарской области введён режим «Беспилотная опасность».'),null);
  assert.equal(c('Туман местами ожидается на территории Республики Татарстан'),null);
  assert.equal(c('Внимание! На территории Республики Татарстан ВВЕДЁН режим «Беспилотная опасность». '+'Подробнее. '.repeat(50)),null);
});

test('состояние: последняя запись по виду решает; без отбоя гаснет через 3 часа; отбой виден полчаса',()=>{
  const on=(h,m,k)=>({at:T(h,m),text:`Внимание! На территории Республики Татарстан ВВЕДЁН режим «${k}».`});
  const off=(h,m,k)=>({at:T(h,m),text:`Внимание! На территории Республики Татарстан режим «${k}» снят.`});
  let s=RW.alertsFrom([on(3,36,'Беспилотная опасность'),on(4,29,'Ракетная опасность')],T(4,40));
  assert.deepEqual(s.alerts.map(a=>a.kind),['missile','drone']);assert.match(s.alerts[0].text,/Ракетная/);assert.equal(s.alerts[0].src,RW.SOURCE.name);
  s=RW.alertsFrom([on(3,36,'Беспилотная опасность'),on(4,29,'Ракетная опасность'),off(4,58,'Ракетная опасность')],T(5,0));
  assert.deepEqual(s.alerts.map(a=>a.kind),['drone']);assert.deepEqual(s.ended.map(a=>a.kind),['missile']);
  s=RW.alertsFrom([on(3,36,'Беспилотная опасность'),off(4,58,'Ракетная опасность')],T(5,40));assert.deepEqual(s.ended,[]);   // отбой старше получаса
  s=RW.alertsFrom([on(3,36,'Беспилотная опасность')],T(6,37));assert.deepEqual(s.alerts,[]);   // три часа без отбоя
  s=RW.alertsFrom([off(3,0,'Беспилотная опасность'),on(3,36,'Беспилотная опасность')],T(3,40));assert.deepEqual(s.alerts.map(a=>a.kind),['drone']);   // новое введение после старого отбоя
  s=RW.alertsFrom([off(3,36,'Беспилотная опасность'),on(3,36,'Беспилотная опасность')],T(3,40));assert.deepEqual(s.alerts,[]);   // одна минута: выше на странице — отбой
});

test('модератор: снять до нового сообщения, включить вручную, вернуть авто',()=>{
  const on=(h,m)=>({at:T(h,m),text:'Внимание! На территории Республики Татарстан ВВЕДЁН режим «Беспилотная опасность».'});
  let s=RW.alertsFrom([on(3,36)],T(3,50),{mode:'off',at:T(3,45)});assert.deepEqual(s.alerts,[]);
  s=RW.alertsFrom([on(3,36),on(4,10)],T(4,12),{mode:'off',at:T(3,45)});assert.equal(s.alerts.length,1);   // новое введение снова показывается
  s=RW.alertsFrom([],T(4,0),{mode:'on',kind:'missile',text:'Внимание! ВВЕДЁН режим «Ракетная опасность».',at:T(3,59),until:T(6,59)});
  assert.equal(s.alerts[0].kind,'missile');assert.match(s.alerts[0].src,/вручную/);
  s=RW.alertsFrom([],T(7,0),{mode:'on',kind:'missile',text:'…',at:T(3,59),until:T(6,59)});assert.deepEqual(s.alerts,[]);
});

const met=(sym,t,extra={})=>({properties:{timeseries:[
  {time:'2026-10-29T02:00:00Z',data:{instant:{details:{air_temperature:9,wind_speed:1}},next_1_hours:{summary:{symbol_code:'clearsky_night'}}}},
  {time:'2026-10-29T03:00:00Z',data:{instant:{details:Object.assign({air_temperature:t,wind_speed:4.6,cloud_area_fraction:80},extra)},next_1_hours:{summary:{symbol_code:sym},details:{precipitation_amount:0.4}}}},
  {time:'2026-10-29T04:00:00Z',data:{instant:{details:{air_temperature:20,wind_speed:9}},next_1_hours:{summary:{symbol_code:'heavyrain'}}}}]}});
test('погода MET Norway → вид в игре: снег, мокрый снег, дождь, туман, облачно, гололёд, гроза',()=>{
  const now=Date.UTC(2026,9,29,3,20),w=(s,t,e)=>RW.weatherFromMet(met(s,t,e),now);
  assert.deepEqual([w('snow',-6).kind,w('snow',-6).t,w('snow',-6).wind],['snow',-6,5]);
  assert.equal(w('lightsleet',-1).kind,'snow');assert.equal(w('sleet',2).kind,'rain');
  assert.equal(w('rainshowers_day',4).kind,'rain');assert.equal(w('lightrain',0).ice,true);assert.equal(w('lightrain',4).ice,false);
  assert.equal(w('fog',3).kind,'fog');assert.equal(w('cloudy',3).kind,'cloudy');assert.equal(w('partlycloudy_day',3).kind,'cloudy');
  assert.equal(w('partlycloudy_day',3,{cloud_area_fraction:30}).kind,'clear');assert.equal(w('clearsky_day',15).kind,'clear');
  assert.equal(w('rainandthunder',18).thunder,true);assert.equal(RW.weatherFromMet({},now),null);
});

// заглушка fetch: ответы по адресу, заголовки как у fetch
function fakeFetch(routes,calls){return async(url,opt)=>{calls.push({url,opt});const r=routes[url];if(!r)throw new Error('нет сети');const v=typeof r==='function'?r(opt):r;
  return {ok:v.status===200,status:v.status,headers:{get:k=>(v.headers||{})[k.toLowerCase()]||null},json:async()=>v.body,text:async()=>v.body};};}
test('сервис: User-Agent и If-Modified-Since, разбор и изменения, сбои не роняют, состояние в файле',async()=>{
  let t=Date.UTC(2026,9,29,3,20);const calls=[],changes=[],files={};
  const fsFake={readFileSync:f=>{if(!(f in files))throw new Error('ENOENT');return files[f];},writeFileSync:(f,s)=>{files[f]=s;},renameSync:(a,b)=>{files[b]=files[a];delete files[a];}};
  const routes={W:o=>o.headers['If-Modified-Since']?{status:304,headers:{expires:new Date(t+30*60e3).toUTCString()}}:{status:200,body:met('snow',-6),headers:{'last-modified':'Thu, 29 Oct 2026 03:00:00 GMT',expires:new Date(t+20*60e3).toUTCString()}},
    A:{status:200,body:page(post('29 октября 2026 г. в 06:10','Внимание! На территории Республики Татарстан ВВЕДЁН режим «Беспилотная опасность».'))}};
  const rw=RW.RealWorld({fetch:fakeFetch(routes,calls),now:()=>t,weatherUrl:'W',alertUrl:'A',fs:fsFake,file:'rw.json',onChange:s=>changes.push(s)});
  await rw.pullWeather();assert.match(calls[0].opt.headers['User-Agent'],/^ZhivayaKazan\/1\.0 \(\+https:\/\/kazan\.lifegorod\.com\)$/);
  let s=rw.snapshot();assert.equal(s.weather.kind,'snow');assert.equal(s.weather.t,-6);assert.equal(s.weather.src,'MET Norway');
  t+=5*60e3;await rw.pullWeather();assert.equal(calls.length,1,'до Expires и 10 минут повторно не спрашиваем');
  t+=20*60e3;await rw.pullWeather();assert.equal(calls[1].opt.headers['If-Modified-Since'],'Thu, 29 Oct 2026 03:00:00 GMT');assert.equal(rw.snapshot().weather.kind,'snow');
  t=Date.UTC(2026,9,29,3,20);await rw.pullAlerts();s=rw.snapshot();assert.equal(s.alerts.length,1);assert.equal(s.alerts[0].title,'Беспилотная опасность');
  assert.ok(changes.length>=2&&changes[changes.length-1].alerts.length===1);
  // отбой в ту же минуту, выше на странице, — тревога снята; потом снова введена
  routes.A={status:200,body:page(post('29 октября 2026 г. в 06:10','Внимание! На территории Республики Татарстан режим «Беспилотная опасность» снят.'),post('29 октября 2026 г. в 06:10','Внимание! На территории Республики Татарстан ВВЕДЁН режим «Беспилотная опасность».'))};
  await rw.pullAlerts();assert.equal(rw.snapshot().alerts.length,0);assert.equal(rw.snapshot().ended.length,1);
  routes.A={status:200,body:page(post('29 октября 2026 г. в 06:11','Внимание! На территории Республики Татарстан ВВЕДЁН режим «Беспилотная опасность».'))};await rw.pullAlerts();assert.equal(rw.snapshot().alerts.length,1);
  routes.A={status:500};await rw.pullAlerts();assert.equal(rw.snapshot().alerts.length,1,'сбой источника не снимает тревогу');
  assert.equal(rw.moderate({mode:'off'}).ok,1);assert.equal(rw.snapshot().alerts.length,0);
  assert.equal(rw.moderate({mode:'on',kind:'missile',text:''}).err,'text');
  const again=RW.RealWorld({fetch:fakeFetch({},[]),now:()=>t,fs:fsFake,file:'rw.json'});   // после перезапуска — из файла
  assert.equal(again.snapshot().weather.kind,'snow');assert.equal(again.snapshot().alerts.length,0);
  rw.moderate({mode:'auto'});assert.equal(rw.snapshot().alerts.length,1);
  t+=4*3600e3;assert.equal(rw.snapshot().weather,null,'погода старше трёх часов не отдаётся');
});
