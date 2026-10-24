// ===== Модерация текста: мат, ссылки, телефоны. Один файл и для браузера, и для сервера (server/node) =====
// В браузере: window.ModCore.clean(text), ModCore.bad(text), ModCore.name(n). На сервере: require('../../site/js/modcore.js').
(function(root){
  'use strict';
  // похожие латинские буквы и цифры → русские («xyй», «6ля», «3аебал»)
  const LOOK={a:'а',b:'в',c:'с',e:'е',k:'к',m:'м',o:'о',p:'р',t:'т',x:'х',y:'у',h:'н',u:'и','3':'з','0':'о','6':'б','@':'а','ё':'е'};
  function norm(w){let s='';for(const ch of w.toLowerCase()){s+=LOOK[ch]||ch;}return s.replace(/(.)\1+/g,'$1');}   // «хууууй» → «хуй»
  // приставки, с которых начинаются ругательства («заебал», «охуеть», «долбоёб»); «с» — только «съ», чтобы не ловить «себе»
  const P='(?:на|по|за|от|отъ|вы|до|об|объ|о|у|при|раз|разъ|рас|пере|недо|съ|под|подъ|про|въ|из|изъ|ни|долбо|долба|а)?';
  const RU=[new RegExp('^'+P+'ху[йеяию]'),/пизд/,new RegExp('^'+P+'еб'),/^бля/,/^сук(а|и|е|у|ой|ам|ами|ах)$/,/^сучк/,/^суча?р/,
    /^муда[кчц]/,/^мудил/,/^мудоз/,/^п[еи]д[ао]р/,/^пидр/,/^г[ао]ндон/,/залуп/,/шлюх/,/^манд(а|ы|е|у|ой|ам|ами|ах)$/,/^мандав/,
    /^(?:вы|за|по|на|от|под)?дроч/,/^ебл/,/^уеб/];
  const EN=[/^f+u+c+k/,/^cunt/,/^bitch/,/^nigg/,/^whore/,/^motherf/];
  function badWord(w){if(w.length<3)return false;const n=norm(w);if(RU.some(r=>r.test(n)))return true;const l=w.toLowerCase();return EN.some(r=>r.test(l));}
  function mask(w){return w[0]+'*'.repeat(Math.max(2,w.length-1));}
  const LINK=/(?:https?:\/\/|www\.)\S+|\bt\.me\/\S+|\b[a-z0-9][a-z0-9-]{1,40}\.(?:ru|com|net|org|su|io|me|info|xyz|online|site|club|pro|ua|by|kz|gg|cc|top|shop|store|link|рф)\b(?:\/\S*)?|(?:^|\s)@[a-z0-9_]{4,32}\b/gi;
  const LINK1=new RegExp(LINK.source,'i');   // для проверки без /g (у /g свой lastIndex)
  const PHONE=/(?:\+|\b)\d[\d\s().-]{8,16}\d\b/g;
  function clean(text){if(typeof text!=='string')return '';let t=text;
    t=t.replace(LINK,m=>(/^\s/.test(m)?' ':'')+'[ссылка скрыта]').replace(PHONE,'[номер скрыт]');
    t=t.replace(/[\p{L}\p{N}@]+/gu,w=>badWord(w)?mask(w):w);
    // КРИК ЗАГЛАВНЫМИ — в обычный регистр
    const letters=t.replace(/[^\p{L}]/gu,'');if(letters.length>=12&&letters===letters.toUpperCase()&&letters!==letters.toLowerCase())t=t.toLowerCase();
    return t;}
  function bad(text){if(typeof text!=='string')return false;let hit=false;text.replace(/[\p{L}\p{N}@]+/gu,w=>{if(badWord(w))hit=true;return w;});return hit||LINK1.test(text);}
  // имя игрока с матом или ссылкой показываем как «Игрок»
  function name(n,fallback){n=typeof n==='string'?n:'';if(!n.trim()||bad(n))return fallback||'Игрок';return n;}
  const api={clean,bad,name,badWord,norm};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ModCore=api;
})(typeof window!=='undefined'?window:this);
