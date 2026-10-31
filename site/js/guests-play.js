// «В гости»: кнопка в разговоре и карточка визита. Данные — guests.js.
(function(){
  const KEY='zk.guests';
  let S={};
  function load(){try{S=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(e){S={};}}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}
  function day(){return (typeof clock!=='undefined'&&clock.day)||1;}
  function hour(){return typeof cityHour==='function'?cityHour():12;}
  function guestOf(id){return (window.cityGuests||[]).find(function(g){return g.id===id;})||null;}
  function folkId(w){return w&&(w.folk||(w.p&&w.p.folk))||'';}
  function st(id){return S[id]||(S[id]={n:0,choice:'',ended:0,last:0});}
  function canGo(id){
    const g=guestOf(id);if(!g||typeof FOLK==='undefined')return false;
    const f=FOLK.list.find(function(q){return q.id===id;});if(!f)return false;
    const s=st(id);if(s.ended||(s.n||0)>=3)return false;
    if((f.met||0)<((g.invite&&g.invite.met)||2))return false;
    if(s.last===day())return false;
    const hr=(g.invite&&g.invite.hours)||[0,24],h=hour();
    return h>=hr[0]&&h<hr[1];
  }
  function context(id){
    const g=guestOf(id);if(!g)return '';
    const s=S[id];if(!s)return '';
    if(s.ended){const e=g.ending&&g.ending[s.choice||'a'];return e&&e.after?(' В гости уже ходили. Дальше: '+e.after):'';}
    const v=g.visits&&g.visits[s.n||0];
    return v&&v.story?(' Сейчас, если позовёшь в гости: '+v.story):'';
  }
  const card=document.createElement('section');
  card.hidden=true;
  card.style.cssText='position:fixed;inset:0;z-index:40;background:rgba(8,14,12,.72);align-items:center;justify-content:center;padding:16px';
  const box=document.createElement('div');
  box.style.cssText='width:min(640px,100%);max-height:86vh;overflow:auto;background:#f6f1e6;color:#1c241f;border-radius:18px;padding:14px;font:15px/1.45 "IBM Plex Sans",system-ui';
  card.append(box);
  function showCard(on){card.hidden=!on;card.style.display=on?'flex':'none';}
  function btn(label,fn){
    const b=document.createElement('button');
    b.type='button';b.textContent=label;
    b.style.cssText='min-height:44px;margin:8px 8px 0 0;padding:8px 14px;border:0;border-radius:999px;background:#132019;color:#f6f1e6;font:600 14px inherit;cursor:pointer';
    b.addEventListener('click',fn);return b;
  }
  function apply(eff){
    if(!eff||typeof player==='undefined')return;
    if(eff.mood)player.mood=typeof clamp==='function'?clamp(player.mood+eff.mood,0,100):player.mood+eff.mood;
    if(eff.food)player.food=typeof clamp==='function'?clamp((player.food||0)+eff.food,0,100):(player.food||0)+eff.food;
    if(eff.rep)player.rep=(player.rep||0)+eff.rep;
  }
  function finishStep(id,choiceId){
    const g=guestOf(id),s=st(id),v=g.visits[s.n||0];
    if(choiceId==='a'||choiceId==='b')s.choice=choiceId;
    if(g.treat)apply({mood:g.treat.mood,food:g.treat.food});
    s.n=(s.n||0)+1;s.last=day();
    if(s.n>=3){
      s.ended=1;
      const e=g.ending&&g.ending[s.choice||'a'];
      if(e){apply(e.effect);if(typeof addEvent==='function')addEvent(e.text||e.line,'say');}
    }else if(typeof addEvent==='function'&&v)addEvent(g.home&&g.home.about?g.home.about:'Вы были в гостях','say');
    save();showCard(false);if(typeof player!=='undefined')player.busy=false;
  }
  function openVisit(id){
    const g=guestOf(id),s=st(id),v=g&&g.visits&&g.visits[s.n||0];
    if(!v)return;
    if(typeof closeChat==='function')closeChat();
    if(typeof player!=='undefined')player.busy=true;
    box.textContent='';
    if(g.home&&g.home.pic){
      const im=document.createElement('img');
      im.src=g.home.pic;im.alt='';
      im.style.cssText='width:100%;height:180px;object-fit:cover;border-radius:12px;background:#ddd';
      box.append(im);
    }
    const h=document.createElement('h2');h.style.margin='10px 0 6px';h.textContent='В гостях';box.append(h);
    const p=document.createElement('p');p.textContent=v.opening||'';box.append(p);
    if(v.ask&&v.ask.choices){
      const q=document.createElement('p');q.textContent=v.ask.text||'';box.append(q);
      v.ask.choices.forEach(function(c){box.append(btn(c.t,function(){if(typeof addEvent==='function'&&c.line)addEvent(c.line,'say');finishStep(id,c.id);}));});
    }else box.append(btn('Дальше',function(){finishStep(id);}));
    box.append(btn('Не сейчас',function(){showCard(false);if(typeof player!=='undefined')player.busy=false;}));
    showCard(true);
  }
  function offer(w){
    const id=folkId(w);
    let b=document.getElementById('guestGo');
    if(!canGo(id)){if(b)b.hidden=true;return;}
    const close=document.getElementById('chatClose');
    if(!b&&close){
      b=document.createElement('button');
      b.id='guestGo';b.className='btn';b.type='button';b.textContent='Зайти в гости';
      close.before(b);
      b.addEventListener('click',function(){const cur=chatNpc&&folkId(chatNpc);if(cur)openVisit(cur);});
    }
    if(b)b.hidden=false;
  }
  function boot(){
    load();
    if(document.body)document.body.append(card);
    if(typeof folkOnChat==='function'&&!folkOnChat._guest){
      const prev=folkOnChat;
      folkOnChat=function(w){prev(w);offer(w);};
      folkOnChat._guest=1;
    }
    if(typeof folkContext==='function'&&!folkContext._guest){
      const prev=folkContext;
      folkContext=function(w){return prev(w)+context(folkId(w));};
      folkContext._guest=1;
    }
    if(typeof closeChat==='function'&&!closeChat._guest){
      const prev=closeChat;
      closeChat=function(){const b=document.getElementById('guestGo');if(b)b.hidden=true;return prev();};
      closeChat._guest=1;
    }
    const how=document.getElementById('howtoClose');
    if(how)how.addEventListener('click',function(){
      try{if(localStorage.getItem('zk.acctHint'))return;if(typeof acct!=='undefined'&&acct)return;localStorage.setItem('zk.acctHint','1');}catch(e){return;}
      setTimeout(function(){if(typeof setHint==='function')setHint('Деньги этого телефона на другом не откроются, пока не войдёте: меню, внизу «Войти»');},700);
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
