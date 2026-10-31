// Один кошелёк на аккаунт. Пополнение — Platega, с сайта и из Телеги. Покупки списываются с него.
(function(){
  const TOPS=[100,300,500,1000];
  let bal=0;
  function list(){return (window.cityShop||[]).filter(s=>s&&s.rub>0);}
  function ensure(){
    let m=document.getElementById('shopModal');if(m)return m;
    m=document.createElement('div');m.className='modal';m.id='shopModal';m.hidden=true;
    m.innerHTML='<div class="box"><h2>Кошелёк</h2><p class="hint" id="shopBal"></p><div class="row" id="shopTops"></div><h3 class="sub">Магазин</h3><div id="shopList" class="stack"></div><div class="row"><button class="btn" id="shopClose" type="button">Закрыть</button></div></div>';
    document.body.append(m);m.querySelector('#shopClose').addEventListener('click',()=>{m.hidden=true;if(typeof player!=='undefined')player.busy=false;});
    return m;
  }
  function paint(){
    const m=ensure();const note=m.querySelector('#shopBal');
    note.textContent='На счёте '+bal+' ₽. Один кошелёк и в Телеге, и на сайте. Игровые рубли это не пополняет.';
    const tops=m.querySelector('#shopTops');tops.innerHTML='';
    for(const n of TOPS){const b=document.createElement('button');b.className='btn';b.type='button';b.textContent=n+' ₽';b.addEventListener('click',()=>topup(n,b));tops.append(b);}
    const box=m.querySelector('#shopList');box.innerHTML='';
    for(const it of list()){
      const row=document.createElement('div');row.className='wear-row';
      const tx=document.createElement('div');const h=document.createElement('b');h.textContent=it.title;const s=document.createElement('span');s.textContent=it.rub+' ₽';tx.append(h,s);
      const b=document.createElement('button');b.className='btn';b.type='button';b.textContent='Купить';
      b.addEventListener('click',()=>buy(it,b));
      row.append(tx,b);box.append(row);
    }
  }
  function go(url){
    if(window.TG&&TG.W&&typeof TG.W.openLink==='function'){TG.W.openLink(url);setTimeout(claim,4000);return;}
    location.href=url;
  }
  async function topup(n,btn){
    btn.disabled=true;
    let j;try{j=await acctCall('pay',{token:acct.token,top:n});}catch(e){j={err:'net'};}
    btn.disabled=false;
    if(!j||!j.url){setHint(j&&j.err==='off'?'Оплата ещё не включена':'Не удалось открыть оплату');return;}
    go(j.url);
  }
  async function buy(it,btn){
    btn.disabled=true;
    let j;try{j=await acctCall('pay',{token:acct.token,item:it.id});}catch(e){j={err:'net'};}
    btn.disabled=false;
    if(j&&typeof j.bal==='number')bal=j.bal;
    if(j&&j.err==='owned'){setHint('Эта вещь уже у вас');return;}
    if(j&&j.err==='funds'){setHint('На кошельке '+bal+' ₽, нужно '+it.rub+' ₽. Пополните сверху.');paint();return;}
    if(!j||!j.ok){setHint('Не удалось купить');return;}
    const thing=typeof shopItem==='function'?shopItem(it.id):null;
    if(thing&&typeof invAdd==='function')invAdd(thing);
    if(typeof progSave==='function')progSave();
    if(typeof acctSave==='function')acctSave();
    setHint('Куплено. Вещь в «Мои вещи»');paint();
  }
  function openShop(){
    if(!acct){setHint('Сначала войдите: кошелёк привязан к аккаунту, а не к телефону');return;}
    ensure();paint();document.getElementById('shopModal').hidden=false;if(typeof player!=='undefined')player.busy=true;claim();
  }
  async function claim(){
    if(!acct||!Net.pay)return;
    let j;try{j=await acctCall('pay',{token:acct.token,check:1});}catch(e){return;}
    if(!j)return;
    if(typeof j.bal==='number')bal=j.bal;
    let got=false;
    for(const id of j.items||[]){const it=typeof shopItem==='function'?shopItem(id):null;if(it&&typeof invAdd==='function'){if(!(typeof invList==='function'&&invList().includes(id)))got=true;invAdd(it);}}
    if(got){if(typeof progSave==='function')progSave();if(typeof acctSave==='function')acctSave();setHint('Оплата прошла. Вещь в «Мои вещи»');}
    const m=document.getElementById('shopModal');if(m&&!m.hidden)paint();
  }
  function paySync(){
    const on=!!(Net.pay&&window.cityPlatform&&(cityPlatform.id==='web'||cityPlatform.id==='tg'));
    if(window.cityPlatform)cityPlatform.canPay=on;
    const b=document.getElementById('shopBtn');if(b)b.hidden=!on;
    if(on&&/pay=back/.test(location.search))claim();
  }
  function boot(){
    const wear=document.getElementById('wearBtn');if(!wear||document.getElementById('shopBtn'))return;
    const b=document.createElement('button');b.className='btn';b.id='shopBtn';b.type='button';b.hidden=true;b.textContent='Кошелёк';
    b.addEventListener('click',()=>{const menu=document.getElementById('menuModal');if(menu)menu.hidden=true;openShop();});
    wear.after(b);paySync();
  }
  window.paySync=paySync;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
