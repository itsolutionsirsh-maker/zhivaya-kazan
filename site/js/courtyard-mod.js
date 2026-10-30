(function(){
  'use strict';
  const $=id=>document.getElementById(id);let state=null,pending=false,retry=null;
  async function send(body={op:'modStatus'}){
    if(pending)return;pending=true;render();
    if(body.op==='rollback')retry=body;
    try{const r=await fetch('api.php',{method:'POST',headers:{'Content-Type':'application/json','X-Mod-Token':$('tok').value.trim()},body:JSON.stringify({a:'courtyard',...body}),signal:AbortSignal.timeout(12000)});
      const j=await r.json();if(r.status>=500)throw Error('server');
      if(body.op==='rollback')retry=null;if(j.state)state=j.state;
      $('cyStatus').textContent=j.err?(j.err==='changed'?'Двор изменился. Проверьте состояние и повторите откат.':j.err==='forbidden'?'Нужен действующий ключ модератора.':'Ошибка: '+j.err):'Завершено работ: '+Object.keys(state.done).length+' из 9 · версия '+state.rev;
      if(j.audit){$('cyAudit').replaceChildren();for(const a of j.audit){const p=document.createElement('p');p.textContent=new Date(a.at).toLocaleString('ru-RU')+' · '+a.stage+' · снято '+a.removed+' · '+a.reason;$('cyAudit').append(p);}}
    }catch(e){$('cyStatus').textContent='Нет подтверждения сервера. '+(retry?'Повторите тот же запрос.':'Попробуйте обновить.');}finally{pending=false;render();}
  }
  function render(){$('cyRefresh').disabled=pending;$('cyRetry').hidden=!retry;$('cyRetry').disabled=pending;for(const b of document.querySelectorAll('[data-cy-stage]'))b.disabled=pending||!!retry||!state;}
  for(const b of document.querySelectorAll('[data-cy-stage]'))b.onclick=()=>{const reason=$('cyReason').value.trim();if(reason.length<3){$('cyStatus').textContent='Укажите причину отката (от 3 символов).';return;}
    if(!confirm('Снять это улучшение и следующие за ним? Текущие работы прервутся. Дневные лимиты сохранятся.'))return;
    send({op:'rollback',stage:b.dataset.cyStage,rev:state.rev,reason,request:Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('')});};
  $('cyRefresh').onclick=()=>send();$('cyRetry').onclick=()=>send(retry);render();
})();
