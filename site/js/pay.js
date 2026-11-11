// Пополнение карты: 1 настоящий рубль = 100 игровых. Platega, с сайта и из Телеги. На карту кладёт только сервер.
(function(){
  const RATE=100;
  const TOPS=[100,300,500,1000];
  function money(n){return (n||0).toLocaleString('ru-RU');}
  function ensure(){
    let m=document.getElementById('shopModal');if(m)return m;
    m=document.createElement('div');m.className='modal';m.id='shopModal';m.hidden=true;
    m.innerHTML='<div class="box"><h2>Пополнить карту</h2><p class="hint" id="shopBal"></p><div class="stack" id="shopTops"></div><div class="row"><button class="btn" id="shopClose" type="button">Закрыть</button></div></div>';
    document.body.append(m);m.querySelector('#shopClose').addEventListener('click',()=>{m.hidden=true;if(typeof player!=='undefined')player.busy=false;});
    return m;
  }
  function paint(){
    const m=ensure();const note=m.querySelector('#shopBal');
    const have=typeof player!=='undefined'&&player?player.money||0:0;
    note.textContent=acct
      ?'На карте '+money(have)+' ₽. Карта одна на аккаунт: в Телеграме это ваш Телеграм, на сайте — тот же вход. 1 ₽ = '+RATE+' в игре. Вывести нельзя.'
      :'Пополнить можно только после входа. Карта привязана к аккаунту: в Телеграме это ваш Телеграм, на сайте — тот же аккаунт. Без входа деньги остаются только в этом браузере.';
    const tops=m.querySelector('#shopTops');tops.innerHTML='';
    if(!acct){const b=document.createElement('button');b.className='btn primary';b.type='button';b.textContent='Войти';b.addEventListener('click',openLogin);tops.append(b);return;}
    if(typeof Net!=='undefined'&&!Net.pay){const p=document.createElement('p');p.className='hint';p.textContent='Вход есть. Оплата на сервере ещё не включена — суммы появятся, когда её включат.';tops.append(p);return;}
    for(const n of TOPS){const b=document.createElement('button');b.className='btn';b.type='button';b.textContent=money(n)+' ₽ → '+money(n*RATE);b.addEventListener('click',()=>topup(n,b));tops.append(b);}
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
  function openLogin(){
    const shop=document.getElementById('shopModal');if(shop)shop.hidden=true;
    const menu=document.getElementById('menuModal');if(menu)menu.hidden=false;
    const box=document.getElementById('acctBox');if(box)box.scrollIntoView({block:'center'});
    const n=document.getElementById('acctName');if(n)n.focus();
    if(typeof player!=='undefined')player.busy=true;
  }
  function openShop(){
    ensure();paint();
    const m=document.getElementById('shopModal');m.hidden=false;if(typeof player!=='undefined')player.busy=true;
    if(!acct)return;
    claim();
  }
  async function claim(){
    if(!acct||!Net.pay)return;
    for(let i=0;i<4;i++){
      let j;try{j=await acctCall('pay',{token:acct.token,check:1});}catch(e){return;}
      if(!j)return;
      const got=Array.isArray(j.got)?j.got:[];
      const sum=got.reduce((s,x)=>s+(x.game||0),0);
      if(sum){if(typeof acctSave==='function')await acctSave();setHint('На карту +'+money(sum)+' ₽');paint();return;}
      if(i<3)await new Promise(r=>setTimeout(r,2000));
    }
    if(/pay=back/.test(location.search)&&typeof acctSave==='function')await acctSave();
    const m=document.getElementById('shopModal');if(m&&!m.hidden)paint();
  }
  function paySync(){
    const on=!!(Net.pay&&window.cityPlatform&&(cityPlatform.id==='web'||cityPlatform.id==='tg'));
    if(window.cityPlatform)cityPlatform.canPay=on;
    const b=document.getElementById('shopBtn');if(b)b.hidden=false;
    if(on&&/pay=back/.test(location.search))claim();
  }
  function boot(){
    const wear=document.getElementById('wearBtn');if(!wear||document.getElementById('shopBtn'))return;
    const b=document.createElement('button');b.className='btn';b.id='shopBtn';b.type='button';b.textContent='Пополнить';
    b.addEventListener('click',()=>{const menu=document.getElementById('menuModal');if(menu)menu.hidden=true;openShop();});
    wear.after(b);paySync();
  }
  window.paySync=paySync;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
