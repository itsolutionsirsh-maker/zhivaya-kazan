// Магазин за рубли через Platega. Кнопка есть только если сервер принял ключи и это не каталог Яндекса или ВК.
(function(){
  function can(){return !!(window.cityPlatform&&cityPlatform.canPay&&Net.pay&&acct);}
  function list(){return (window.cityShop||[]).filter(s=>s&&s.rub>0);}
  function ensure(){
    let m=document.getElementById('shopModal');if(m)return m;
    m=document.createElement('div');m.className='modal';m.id='shopModal';m.hidden=true;
    m.innerHTML='<div class="box"><h2>Магазин</h2><p class="hint">Карта или СБП. Деньги принимает Platega и потом переводит нам. Вещь записывается в аккаунт, не в игровые рубли.</p><div id="shopList" class="stack"></div><div class="row"><button class="btn" id="shopClose" type="button">Закрыть</button></div></div>';
    document.body.append(m);m.querySelector('#shopClose').addEventListener('click',()=>{m.hidden=true;if(typeof player!=='undefined')player.busy=false;});
    return m;
  }
  function openShop(){
    if(!acct){setHint('Сначала войдите: вещь должна остаться на аккаунте, а не только в этом телефоне');return;}
    const m=ensure();const box=m.querySelector('#shopList');box.innerHTML='';
    for(const it of list()){
      const row=document.createElement('div');row.className='wear-row';
      const tx=document.createElement('div');const h=document.createElement('b');h.textContent=it.title;const s=document.createElement('span');s.textContent=(it.rub)+' ₽';tx.append(h,s);
      const b=document.createElement('button');b.className='btn';b.type='button';b.textContent='Купить';
      b.addEventListener('click',()=>buy(it,b));
      row.append(tx,b);box.append(row);
    }
    m.hidden=false;if(typeof player!=='undefined')player.busy=true;
  }
  async function buy(it,btn){
    btn.disabled=true;
    let j;try{j=await acctCall('pay',{token:acct.token,item:it.id});}catch(e){j={err:'net'};}
    btn.disabled=false;
    if(j&&j.err==='owned'){setHint('Эта вещь уже у вас');return;}
    if(!j||!j.url){setHint(j&&j.err==='off'?'Оплата ещё не включена':'Не удалось открыть оплату');return;}
    location.href=j.url;
  }
  async function claim(){
    if(!acct||!Net.pay)return;
    let j;try{j=await acctCall('pay',{token:acct.token,check:1});}catch(e){return;}
    if(!j||!Array.isArray(j.items))return;
    let got=false;
    for(const id of j.items){const it=typeof shopItem==='function'?shopItem(id):null;if(it&&typeof invAdd==='function'){if(!(typeof invList==='function'&&invList().includes(id)))got=true;invAdd(it);}}
    if(got){if(typeof progSave==='function')progSave();if(typeof acctSave==='function')acctSave();setHint('Оплата прошла. Вещь в «Мои вещи»');}
  }
  function paySync(){
    const on=!!(Net.pay&&window.cityPlatform&&(cityPlatform.id==='web'||cityPlatform.id==='tg'));
    if(window.cityPlatform)cityPlatform.canPay=on;
    const b=document.getElementById('shopBtn');if(b)b.hidden=!on;
    if(on&&/pay=back/.test(location.search))claim();
  }
  function boot(){
    const wear=document.getElementById('wearBtn');if(!wear||document.getElementById('shopBtn'))return;
    const b=document.createElement('button');b.className='btn';b.id='shopBtn';b.type='button';b.hidden=true;b.textContent='Магазин';
    b.addEventListener('click',()=>{const menu=document.getElementById('menuModal');if(menu)menu.hidden=true;openShop();});
    wear.after(b);paySync();
  }
  window.paySync=paySync;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
