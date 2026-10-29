// Роли между игроками (данные — site/js/roles.js второго программиста, cityRoles). Первая роль — бариста.
// Игрок-бариста стоит в своём кафе (общая комната), игрок-гость в той же комнате заказывает, бариста называет цену
// в вилке, гость платит или отказывается. Деньги переводит только сервер (wallet.transfer), один раз на номер заказа.
// Кто может быть баристой: вошёл в аккаунт, аккаунту больше суток, стоит в кафе. Что смена у него есть — проверяет игра:
// смены считает браузер, а сервер видит только аккаунт и комнату.
// Лимиты (roles.js): 40 чашек в день у баристы, 4 чашки одному гостю в день, себе нельзя. Ответа нет минуту, кто-то
// вышел из кафе или отключился — заказ отменяется. Счётчики дня и недели («Бариста недели») — в DATA_DIR/roles.json.
'use strict';
const crypto=require('crypto');
const ITEMS=['Чёрный чай','Чай с молоком','Американо','Капучино','Латте'];
const LIM={min:60,max:220,perDay:40,perGuest:4,ttl:60e3,age:86400e3,queue:3,top:10};
const mskDay=ms=>new Date(ms+3*3600e3).toISOString().slice(0,10);
// неделя по Москве с понедельника: дата её понедельника
function mskWeek(ms){const d=new Date(ms+3*3600e3);const dow=(d.getUTCDay()+6)%7;return new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()-dow)).toISOString().slice(0,10);}

function Roles(o){o=o||{};const now=o.now||(()=>Date.now()),L=Object.assign({},LIM,o.limits||{}),wallet=o.wallet,fs=o.fs,file=o.file;
  let st={day:'',week:'',cups:{},pair:{},sold:{}};
  try{if(fs&&file)st=Object.assign(st,JSON.parse(fs.readFileSync(file,'utf8')));}catch(e){}
  const save=()=>{if(!fs||!file)return;try{fs.writeFileSync(file+'.tmp',JSON.stringify(st));fs.renameSync(file+'.tmp',file);}catch(e){}};
  const orders=new Map(),onDuty=new Map();   // заказы в работе; кто сейчас бариста: id игрока → комната
  function roll(){const t=now(),d=mskDay(t),w=mskWeek(t);if(st.day!==d){st.day=d;st.cups={};st.pair={};}if(st.week!==w){st.week=w;st.sold={};}}
  // p — игрок на сервере: {id, name, room, acc:{k, created (мс)}}
  function serveErr(p){if(!p||!p.acc)return 'account';if(!(now()-(p.acc.created||0)>=L.age))return 'young';if(typeof p.room!=='string'||!p.room.startsWith('v1:cafe:'))return 'place';return null;}
  function onShift(p){return !!(p&&p.acc&&p.room&&onDuty.get(p.id)===p.room);}
  function view(o2,extra){return Object.assign({id:o2.id,item:ITEMS[o2.item],price:o2.price||null},extra||{});}
  const out=[];   // что разослать: [{to: id игрока, m: сообщение}]
  const send=(to,m)=>out.push({to,m:Object.assign({t:'bar'},m)});
  const flush=()=>out.splice(0);
  function cancel(o2,why){if(!orders.delete(o2.id))return;send(o2.g,{k:'cancel',id:o2.id,why,side:'guest'});send(o2.b,{k:'cancel',id:o2.id,why,side:'barista'});}

  // встать за стойку / уйти
  function duty(p,on){if(!on){onDuty.delete(p.id);for(const o2 of [...orders.values()])if(o2.b===p.id)cancel(o2,'left');send(p.id,{k:'duty',on:false});return flush();}
    const e=serveErr(p);if(e){onDuty.delete(p.id);send(p.id,{k:'duty',on:false,err:e});return flush();}
    onDuty.set(p.id,p.room);roll();send(p.id,{k:'duty',on:true,cups:st.cups[p.acc.k]||0,max:L.perDay,min:L.min,maxPrice:L.max});return flush();}
  // гость заказывает: g — гость, b — бариста (оба — игроки на сервере)
  function order(g,b,item){roll();const err=e=>{send(g.id,{k:'err',e});return flush();};
    if(!g.acc)return err('account');if(!b||!onShift(b))return err('not-barista');
    if(g.id===b.id||g.acc.k===b.acc.k)return err('self');if(!g.room||g.room!==b.room)return err('room');
    if(!Number.isInteger(item)||item<0||item>=ITEMS.length)return err('item');
    // один заказ за раз на аккаунт, а не на соединение: иначе с нескольких устройств лимит пары обходился
    for(const o2 of orders.values())if(o2.g===g.id||o2.gk===g.acc.k)return err('busy');
    const open=[...orders.values()].filter(o2=>o2.bk===b.acc.k);
    if(open.filter(o2=>o2.b===b.id).length>=L.queue)return err('queue');
    if((st.cups[b.acc.k]||0)+open.length>=L.perDay)return err('limit-day');   // заказы в работе — тоже в счёт
    if((st.pair[b.acc.k+'|'+g.acc.k]||0)>=L.perGuest)return err('limit-guest');
    const id='cof'+now().toString(36)+crypto.randomBytes(5).toString('hex');
    // поколение кошельков: после «Начать заново» у аккаунта новое — такой заказ не оплачивается
    const gen=k=>wallet&&wallet.who?wallet.who(k):null;
    const o2={id,g:g.id,b:b.id,gk:g.acc.k,bk:b.acc.k,gw:gen(g.acc.k),bw:gen(b.acc.k),gName:g.name||'Гость',bName:b.name||'Бариста',room:b.room,item,price:0,state:'new',at:now()};orders.set(id,o2);
    send(b.id,view(o2,{k:'order',from:{id:g.id,name:o2.gName}}));send(g.id,view(o2,{k:'wait',to:{id:b.id,name:o2.bName}}));return flush();}
  // бариста называет цену (или отказывает: price=0)
  function price(b,id,amt){const o2=orders.get(id);if(!o2||o2.b!==b.id||o2.state!=='new')return flush();
    if(!amt){cancel(o2,'declined');return flush();}
    if(!Number.isInteger(amt)||amt<L.min||amt>L.max){send(b.id,{k:'err',e:'price',min:L.min,max:L.max});return flush();}
    o2.price=amt;o2.state='price';o2.at=now();send(o2.g,view(o2,{k:'price',name:o2.bName}));send(o2.b,view(o2,{k:'priced'}));return flush();}
  // гость платит (yes) или отказывается; оба ещё в одном кафе, бариста ещё за стойкой
  function pay(g,b,id,yes){const o2=orders.get(id);if(!o2||o2.g!==g.id||o2.state!=='price')return flush();
    if(!yes){cancel(o2,'refused');return flush();}
    if(!b||!onShift(b)||b.room!==o2.room||g.room!==o2.room){cancel(o2,'left');return flush();}
    roll();if((st.cups[o2.bk]||0)>=L.perDay){cancel(o2,'limit-day');return flush();}
    if((st.pair[o2.bk+'|'+o2.gk]||0)>=L.perGuest){cancel(o2,'limit-guest');return flush();}   // ещё раз перед самим переводом
    if(wallet&&wallet.who&&(wallet.who(o2.gk)!==o2.gw||wallet.who(o2.bk)!==o2.bw)){cancel(o2,'reset');return flush();}
    const r=wallet?wallet.transfer(o2.gk,o2.bk,o2.price,o2.id,`${ITEMS[o2.item]} у баристы ${o2.bName}`,'coffee'):{err:'no_wallet'};
    if(!r||!r.ok){cancel(o2,r&&r.err==='funds'?'funds':'wallet');return flush();}
    orders.delete(id);
    if(!r.dup){st.cups[o2.bk]=(st.cups[o2.bk]||0)+1;const pk=o2.bk+'|'+o2.gk;st.pair[pk]=(st.pair[pk]||0)+1;
      const s=st.sold[o2.bk]||(st.sold[o2.bk]={n:0,name:''});s.n++;s.name=o2.bName;save();}
    const week=(st.sold[o2.bk]||{}).n||0,cups=st.cups[o2.bk]||0;
    send(o2.g,view(o2,{k:'done',side:'guest',name:o2.bName,bal:r.bal}));send(o2.b,view(o2,{k:'done',side:'barista',name:o2.gName,bal:r.to,cups,week}));return flush();}
  // игрок вышел из кафе, отключился или сменил комнату — его заказы отменяются, смена баристы кончается
  function moved(p){if(onDuty.has(p.id)&&onDuty.get(p.id)!==p.room){onDuty.delete(p.id);send(p.id,{k:'duty',on:false,err:'place'});}
    for(const o2 of [...orders.values()])if((o2.g===p.id||o2.b===p.id)&&p.room!==o2.room)cancel(o2,'left');return flush();}
  // «Начать заново» у аккаунта: его заказы — и как гостя, и как баристы — отменяются
  function reset(k){for(const o2 of [...orders.values()])if(o2.gk===k||o2.bk===k)cancel(o2,'reset');return flush();}
  function gone(pid){onDuty.delete(pid);for(const o2 of [...orders.values()])if(o2.g===pid||o2.b===pid)cancel(o2,'left');return flush();}
  // раз в несколько секунд: заказ без ответа минуту — отмена
  function tick(){const t=now();for(const o2 of [...orders.values()])if(t-o2.at>=L.ttl)cancel(o2,'timeout');return flush();}
  // «Бариста недели»: имя, которое игрок показывал в игре, и сколько чашек продал игрокам за неделю
  function top(){roll();return Object.values(st.sold).filter(s=>s.n>0).sort((a,b)=>b.n-a.n).slice(0,L.top).map(s=>({name:s.name,n:s.n}));}
  const peek=id=>{const o2=orders.get(id);return o2?{b:o2.b,g:o2.g}:null;};
  return {duty,order,price,pay,moved,gone,reset,tick,top,onShift,peek,ITEMS,LIM:L,count:()=>orders.size,onDuty:()=>onDuty.size};}
module.exports={Roles,ITEMS,LIM,mskWeek};
