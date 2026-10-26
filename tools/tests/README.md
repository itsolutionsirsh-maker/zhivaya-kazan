# Проверки в браузере без экрана

Каждая проверка сама поднимает `python3 -m http.server` на своей папке сборки (кроме `life.js`, которой нужен настоящий сервер), открывает игру в Chromium через Playwright и печатает, что видит. Ошибки страницы — в конце (`no page errors` — чисто).

## Подготовка (один раз)

```bash
npm i playwright            # в любой папке выше tools/tests, или глобально
npx playwright install chromium
```

## Сборка для проверки

```bash
python3 tools/dev_build.py /tmp/zk-dev                       # игра + карта центра одним файлом (site/kazan.json)
python3 -I tools/split_map.py site/kazan.json /tmp/zk-dev/map # та же карта кусками, как на сервере (base.json + c_x_y.json)
```

`dev_build.py` каждый раз стирает `map/` в папке сборки — после него снова `split_map.py`, если нужны куски.

## Что запускать

| Файл | Что проверяет | Запуск |
|---|---|---|
| `smoke.js` | загрузка, обучение 👣, жители и машины, данные второго программиста | `node tools/tests/smoke.js /tmp/zk-dev 8771` |
| `fullsmoke.js` | анкета, ночь, самокат, каршеринг, ДТП, наезд, кафе, дом, магазин, кадры в секунду | `node tools/tests/fullsmoke.js /tmp/zk-dev 8772` |
| `logicfix.js` | долг вместо обнулённого штрафа, аренда раз в срок, переезд из квартиры и из-за руля | `node tools/tests/logicfix.js /tmp/zk-dev` |
| `alldistricts.js` | старт в каждом районе карты центра, ориентиры | `node tools/tests/alldistricts.js /tmp/zk-dev` |
| `seasontest.js` | сезон «Зима на Баумана» с подставленной датой: задания, опыт, уровни, вещи, вечера, Новый год, мебель, перезагрузка | `node tools/tests/seasontest.js /tmp/zk-dev 8891 /tmp/shots` |
| `camlife.js` | жители и машины там, куда отвели камеру; пешие пути напрямик (длина до/после, сквозь дома) | `node tools/tests/camlife.js /tmp/zk-dev 8897 /tmp/shot.png` |
| `graphcheck.js` | граф улиц: маршруты, ближайшие узлы и улицы — записать ответы до правки и сравнить после | `node tools/tests/graphcheck.js /tmp/zk-dev 8861 /tmp/g_before.json` |
| `life.js` | «есть ли жизнь» на настоящем сервере (WebSocket, карта кусками) | сначала сервер (ниже), потом `node tools/tests/life.js http://127.0.0.1:8810/` |

Известное: в `fullsmoke.js` шаг «дом» иногда находит рядом свою машину вместо подъезда и дальше падает на `exitInterior` — это тест, не игра.

## Настоящий сервер локально

```bash
cd server/node && npm ci && cd ../..
python3 tools/build_deploy.py                                  # → deploy/kazan
mkdir -p /tmp/zk-data /tmp/zk-map && python3 -I tools/split_map.py site/kazan.json /tmp/zk-map
PORT=8810 GAME_DIR=$PWD/deploy/kazan DATA_DIR=/tmp/zk-data MAP_DIR=/tmp/zk-map node server/node/server.js
```

Без ключей сервер работает: онлайн, чат, аккаунты; без бота Телеги и без ИИ (жители отвечают готовыми фразами).
