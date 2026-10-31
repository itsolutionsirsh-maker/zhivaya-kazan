// Одна и та же погода у всех, пока нет настоящей с сервера. Слот — 2,5 игровых часа, месяц — по Москве.
function skySlot(minutes, month){
  const m=+month||1, winter=m===12||m<=2, late=m===11||m===3;
  const slot=Math.floor((+minutes||0)/150);
  let h=Math.imul((slot+m*17)|0, 0x9e3779b1);
  h=Math.imul(h^(h>>>16), 0x85ebca77);
  const r=((h^(h>>>13))>>>0)%100;
  if(winter)return r<32?'snow':r<55?'cloudy':'clear';
  if(late)return r<14?'snow':r<36?'rain':r<60?'cloudy':'clear';
  return r<22?'rain':r<50?'cloudy':'clear';
}
if(typeof window!=='undefined')window.skySlot=skySlot;
if(typeof module!=='undefined'&&module.exports)module.exports={skySlot};
