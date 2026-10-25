// ===== Где запущена игра и чем там можно платить =====
// tg — мини-приложение Телеги (звёзды через бота), yandex — Яндекс Игры (их SDK покупок), vk — VK Play / VK Mini Apps, web — просто сайт.
// Гость играет сразу везде: имя на старте, без бота и без регистрации. Вход через Телегу — только внутри Телеги.
// Покупки (витрина shop.js, платная ветка сезона) показываем только там, где платформа умеет платить; на сайте и до подключения SDK — скрыты.
const PLATFORM=(()=>{const q=new URLSearchParams(location.search);const forced=q.get('platform');
  let id='web';if(window.Telegram&&window.Telegram.WebApp&&window.Telegram.WebApp.initData)id='tg';
  else if(/yandex/i.test(document.referrer)||q.has('yandex')||window.YaGames)id='yandex';
  else if(q.has('vk_app_id')||/vk(play)?\.com/i.test(document.referrer))id='vk';
  if(forced&&/^(tg|yandex|vk|web)$/.test(forced))id=forced;
  return {id,
    // true, когда подключена оплата этой платформы: tg — счёт в звёздах от бота (сервер), yandex — ysdk.getPayments(), vk — VK Bridge
    canPay:false,
    async pay(item){return {ok:false,err:'no_payments',platform:id};}};})();
window.cityPlatform=PLATFORM;
