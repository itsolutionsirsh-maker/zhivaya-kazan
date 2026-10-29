// Presentation-only arbiter. Providers return a current goal; progression stays in its engine.
(function(root){
  'use strict';
  function select(providers){return providers.map(p=>({p,g:p.read()})).filter(x=>x.g).sort((a,b)=>(b.p.priority||0)-(a.p.priority||0))[0]?.g||null;}
  if(typeof module==='object'&&module.exports){module.exports={select};return;}
  const providers=[],box=document.createElement('section');box.id='nextGoal';box.hidden=true;box.setAttribute('aria-label','Ближайшая цель');
  box.innerHTML='<div class="goal-copy"><small id="goalContext"></small><strong id="goalTitle"></strong><p id="goalText"></p></div><div class="goal-actions"><button class="btn primary" id="goalGo" type="button"></button><button class="btn" id="goalFold" type="button" aria-label="Свернуть цель" aria-expanded="true">−</button></div>';
  document.querySelector('#hud .mid').prepend(box);
  const el=id=>document.getElementById(id);let current=null,folded=false,identity=null,baseline=null,initialized=false,resumed=false,last='';
  function resetAccount(){const key=typeof acct!=='undefined'&&acct?acct.token:'';if(key===identity)return;identity=key;baseline=null;initialized=false;resumed=false;folded=false;last='';}
  function refresh(){
    resetAccount();current=select(providers);
    const visible=!!current&&scene==='city'&&!player.busy&&!player.inside&&player.state==='ok'&&!SIT.card;
    box.hidden=!visible;if(!visible)return;
    const key=JSON.stringify([current.id,current.title,current.text,current.label,current.context,current.disabled,folded]);if(key===last)return;last=key;
    el('goalContext').textContent=current.context||'Ближайшее дело';el('goalTitle').textContent=current.title;el('goalText').textContent=current.text;
    el('goalGo').textContent=current.label||'Продолжить';el('goalGo').disabled=!!current.disabled;
    box.dataset.folded=String(folded);el('goalFold').textContent=folded?'+':'−';el('goalFold').setAttribute('aria-expanded',String(!folded));el('goalFold').setAttribute('aria-label',folded?'Развернуть цель':'Свернуть цель');
  }
  el('goalFold').onclick=()=>{folded=!folded;refresh();};
  el('goalGo').onclick=()=>{refresh();if(!current||current.disabled)return;const run=current.run;resumed=true;run();refresh();};
  root.cityObjectives={register(p){providers.push(p);},refresh,active:()=>current};
  root.cityObjectives.register({priority:100,read(){
    if(!identity)return null;
    const loading={id:'loading',title:'Восстанавливаем вашу историю',text:'Проверяем сохранённый этап на сервере.',label:'Подключаемся…',disabled:true};
    if(!Net.syncReady)return loading;if(!Net.yardStory)return null;
    const state=cityTerritories.snapshot();if(!state)return loading;
    const s=state.story;
    if(!initialized){baseline=s&&s.stage;initialized=true;}
    const g=YardStory.objective(s);if(!g||(g.id==='reunion'&&!Net.yardReunion))return null;
    const connection=cityTerritories.connection(),returning=baseline&&baseline===s?.stage&&!resumed;
    return {...g,context:g.id==='reunion'?'Новое дело от знакомого':returning?'Продолжить историю':'Чужой двор',
      label:returning?'Продолжить историю':g.id==='invite'?'Прочитать сообщение':g.place&&!cityYardStory.near(g.place)?'Выбрать маршрут':'Поговорить',
      disabled:!connection.ready||connection.pending||connection.retry,
      text:!connection.ready?'Подключаемся, чтобы проверить сохранённый этап…':g.text,
      run(){cityYardStory.open(g.person||null);if(g.place&&!cityYardStory.near(g.place))cityYardStory.route();}};
  }});
  root.cityObjectives.register({priority:10,read(){
    const t=tutStep();return t?{id:t.id,title:t.title,text:t.text,context:`Первые шаги · ${PROG.tut.i+1} из ${tutList().length}`,label:'Посмотреть шаг',run:openQuests}:null;
  }});
  window.addEventListener('territorychange',refresh);
  setInterval(()=>{if(!document.hidden)refresh();},500);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
})(typeof globalThis==='object'?globalThis:this);
