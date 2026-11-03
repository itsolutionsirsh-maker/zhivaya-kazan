// Пополнение карты через Platega. 1 настоящий рубль = 100 игровых, начисляет сервер после CONFIRMED.
// В кошелёк одежды эти деньги не кладутся и другому игроку не уходят. Вывести нельзя.
'use strict';
const crypto=require('crypto');
const API='https://app.platega.io';
const TOPS=[100,300,500,1000];
const RATE=100;

function same(a,b){a=String(a||'');b=String(b||'');if(a.length!==b.length||!a.length)return false;return crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));}
function readShop(text){
  const out=[];
  const re=/\{id:'([^']+)'[\s\S]*?title:'([^']*)'[\s\S]*?rub:(\d+)/g;
  let m;while((m=re.exec(text)))out.push({id:m[1],title:m[2],rub:+m[3]});
  return out;
}
function Platega(o){
  o=o||{};
  const now=o.now||Date.now,fs=o.fs,file=o.file,fetchFn=o.fetch||fetch;
  const merchant=String(o.merchantId||''),secret=String(o.secret||'');
  const shop=Array.isArray(o.shop)?o.shop:[];
  let db={orders:[],bal:{}};
  function load(){if(!file||!fs)return;try{const j=JSON.parse(fs.readFileSync(file,'utf8'));if(j&&Array.isArray(j.orders))db={orders:j.orders,bal:j.bal&&typeof j.bal==='object'?j.bal:{}};}catch(e){}}
  function flush(){if(!file||!fs)return;fs.writeFileSync(file+'.tmp',JSON.stringify(db));fs.renameSync(file+'.tmp',file);}
  load();
  function item(id){
    const m=/^top-(\d+)$/.exec(String(id||''));
    if(m){const rub=+m[1];return TOPS.includes(rub)?{id:'top-'+rub,title:rub+' ₽ = '+(rub*RATE)+' в игре',rub,top:true,game:rub*RATE}:null;}
    return shop.find(s=>s&&s.id===id&&s.rub>0)||null;
  }
  function order(id){return db.orders.find(x=>x.id===id)||null;}
  function byTx(tx){return db.orders.find(x=>x.tx===tx)||null;}
  function headers(){return {'X-MerchantId':merchant,'X-Secret':secret,'Content-Type':'application/json'};}
  async function remote(tx){
    const r=await fetchFn(API+'/transaction/'+encodeURIComponent(tx),{headers:headers(),signal:AbortSignal.timeout(12000)});
    if(!r.ok)throw new Error('status '+r.status);
    return r.json();
  }
  function balance(k){return db.bal&&db.bal[k]>0?db.bal[k]:0;}
  function owned(k){const ids=[];for(const x of db.orders)if(x.k===k&&x.status==='paid'&&x.kind!=='top'&&!/^top-/.test(x.item)&&!ids.includes(x.item))ids.push(x.item);return ids;}
  function taken(k){const ids=new Set();for(const x of db.orders)if(x.k===k&&x.status==='chargeback'&&x.kind!=='top')ids.add(x.item);return ids;}
  function apply(k,state){
    if(!state||typeof state!=='object')return state;
    const have=owned(k),drop=taken(k);if(!have.length&&!drop.size)return state;
    const prog=state.prog&&typeof state.prog==='object'?Object.assign({},state.prog):{};
    let inv=Array.isArray(prog.inv)?prog.inv.filter(id=>!drop.has(id)):[];
    let changed=inv.length!==(Array.isArray(state.prog&&state.prog.inv)?state.prog.inv.length:0);
    for(const id of have)if(!drop.has(id)&&!inv.includes(id)){inv.push(id);changed=true;}
    const wear=prog.wear&&typeof prog.wear==='object'?Object.assign({},prog.wear):null;
    if(wear)for(const slot of Object.keys(wear))if(drop.has(wear[slot])){delete wear[slot];changed=true;}
    if(!changed)return state;
    return Object.assign({},state,{prog:Object.assign({},prog,{inv,wear:wear||prog.wear})});
  }
  async function create(k,itemId,urls,ip){
    if(!merchant||!secret)return {err:'off'};
    const it=item(itemId);if(!it||!it.top)return {err:'no_top'};
    const fresh=db.orders.find(x=>x.k===k&&x.item===it.id&&x.status==='pending'&&x.url&&now()-x.at<12*60*1000);
    if(fresh)return {ok:1,url:fresh.url,id:fresh.id,bal:balance(k)};
    const id=crypto.randomUUID();
    const body={paymentDetails:{amount:it.rub,currency:'RUB'},description:String(it.title).slice(0,64),return:urls.ok,failedUrl:urls.fail,payload:id,
      metadata:{userId:crypto.createHash('sha256').update(k).digest('hex').slice(0,16),userName:'player',clientIp:ip||'0.0.0.0',user_email:'shop@kazan.lifegorod.com'}};
    const r=await fetchFn(API+'/v2/transaction/process',{method:'POST',headers:headers(),body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
    const j=await r.json().catch(()=>null);
    if(!r.ok||!j||!j.url||!j.transactionId)return {err:'platega'};
    db.orders.push({id,k,item:it.id,rub:it.rub,tx:String(j.transactionId),url:String(j.url),status:'pending',kind:'top',at:now()});
    if(db.orders.length>4000)db.orders=db.orders.slice(-4000);
    flush();
    return {ok:1,url:j.url,id,bal:balance(k)};
  }
  function credit(row){
    if(row.status==='paid')return false;
    row.status='paid';row.paidAt=now();
    if(row.kind==='top')row.game=row.rub*RATE;
    else db.bal[row.k]=(db.bal[row.k]||0)+row.rub;
    return true;
  }
  function spend(k,itemId){
    const it=item(itemId);if(!it||it.top)return {err:'no_item'};
    if(owned(k).includes(it.id))return {err:'owned',bal:balance(k)};
    if(balance(k)<it.rub)return {err:'funds',bal:balance(k),need:it.rub};
    db.bal[k]=balance(k)-it.rub;
    db.orders.push({id:crypto.randomUUID(),k,item:it.id,rub:it.rub,status:'paid',kind:'spend',at:now()});
    flush();
    return {ok:1,bal:balance(k),item:it.id};
  }
  async function callback(hdrs,body){
    hdrs=hdrs||{};body=body||{};
    if(!same(hdrs['x-merchantid']||hdrs['X-MerchantId'],merchant)||!same(hdrs['x-secret']||hdrs['X-Secret'],secret))return {err:'auth',code:401};
    const row=order(typeof body.payload==='string'?body.payload:'')||byTx(typeof body.id==='string'?body.id:'');
    if(!row)return {err:'unknown',code:200};
    let live;try{live=await remote(row.tx);}catch(e){return {err:'retry',code:500};}
    const amount=live&&live.paymentDetails?+live.paymentDetails.amount:NaN;
    const cur=live&&live.paymentDetails?live.paymentDetails.currency:'';
    if(live.payload&&live.payload!==row.id)return {err:'payload',code:200};
    if(live.status==='CONFIRMED'&&cur==='RUB'&&amount===row.rub){const fresh=credit(row);flush();return {ok:1,code:200,k:row.k,id:row.id,item:row.item,rub:row.rub,top:row.kind==='top',game:row.kind==='top'?row.rub*RATE:0,fresh:fresh?1:0,bal:balance(row.k)};}
    if(live.status==='CHARGEBACKED'&&row.kind==='top'&&row.status==='paid'){row.status='chargeback';flush();return {ok:1,code:200,k:row.k,id:row.id,rub:row.rub,back:1,game:row.game||row.rub*RATE,bal:balance(row.k)};}
    if(live.status==='CANCELED'&&row.status==='pending'){row.status='canceled';flush();}
    return {ok:1,code:200,status:live.status||'',bal:balance(row.k)};
  }
  async function pull(k){
    const due=db.orders.filter(x=>x.k===k&&x.kind==='top'&&x.status==='pending'&&x.tx).slice(-5);
    const fresh=[];let changed=false;
    for(const row of due){
      let live;try{live=await remote(row.tx);}catch(e){continue;}
      const amount=live&&live.paymentDetails?+live.paymentDetails.amount:NaN;
      const cur=live&&live.paymentDetails?live.paymentDetails.currency:'';
      if(live&&live.payload&&live.payload!==row.id)continue;
      if(live&&live.status==='CONFIRMED'&&cur==='RUB'&&amount===row.rub){if(credit(row)){fresh.push(row);changed=true;}}
      else if(live&&live.status==='CANCELED'&&row.status==='pending'){row.status='canceled';changed=true;}
    }
    if(changed)flush();
    return fresh;
  }
  return {on:()=>!!(merchant&&secret),item,owned,apply,create,spend,callback,pull,balance,tops:()=>TOPS.slice(),orders:()=>db.orders};
}
function opId(prefix,id){const s=(String(prefix||'')+String(id||'').replace(/[^A-Za-z0-9]/g,'')).slice(0,48);return s.length>=6?s:null;}
module.exports={Platega,readShop,TOPS,RATE,opId};
