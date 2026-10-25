#!/usr/bin/env python3
"""Карта всей Казани: качаем OSM сеткой плиток ~2×2 км в raw/city/<ряд>_<столбец>.json.
Плитки, целиком лежащие в уже скачанном центре (raw/kazan_v5.json), пропускаем.
Каждая плитка — свой файл: при обрыве перезапуск докачивает только недостающие.
  python3 tools/fetch_city.py            — плитки домов/дорог/заведений
  python3 tools/fetch_city.py --routes   — маршруты автобусов/троллейбусов/трамваев по всему городу (кусками)
  python3 tools/fetch_city.py --extras   — площади, пешеходные зоны, стены Кремля
  python3 tools/fetch_city.py --all      — всё сразу
"""
import json, os, sys, time

# границы города (с запасом): юг, запад, север, восток
CITY = tuple(float(v) for v in os.environ.get('CITY', '55.66,48.86,55.93,49.33').split(','))
# уже скачанный центр (raw/kazan_v5.json); если его нет (например, на сервере) — качаем всё, включая центр
CORE = tuple(float(v) for v in os.environ.get('CORE', '55.752,49.050,55.838,49.190' if os.path.exists('raw/kazan_v5.json') else '0,0,0,0').split(','))
DLAT, DLON = 0.0225, 0.0336
OUTDIR = 'raw/city'

def tiles():
    S, W, N, E = CITY
    ny = round((N - S) / DLAT); nx = round((E - W) / DLON)
    for iy in range(ny):
        for ix in range(nx):
            bb = (S + iy * DLAT, W + ix * DLON, S + (iy + 1) * DLAT, W + (ix + 1) * DLON)
            inside = bb[0] >= CORE[0] and bb[1] >= CORE[1] and bb[2] <= CORE[2] and bb[3] <= CORE[3]
            if not inside:
                yield f'{iy:02d}_{ix:02d}', bb

def main():
    # fetch_tiles.py при импорте сам начинает качать — поэтому берём из него только функции через exec до «os.makedirs»
    src = open(os.path.join(os.path.dirname(__file__), 'fetch_tiles.py'), encoding='utf8').read()
    src = src.split("os.makedirs('raw', exist_ok=True)")[0]
    g = {'__name__': 'ft'}; exec(src, g)
    g['MIRRORS'][:] = ["https://overpass-api.de/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
                       "https://overpass.kumi.systems/api/interpreter"]
    query, fetch = g['query'], g['fetch']
    os.makedirs(OUTDIR, exist_ok=True)
    # маршруты транспорта и «особое» (площади, пешеходные зоны, стены Кремля) — крупными кусками 3×3
    def big(kind, mode):
        S, W, N, E = CITY
        for r in range(6):
            left = 0
            for iy in range(3):
                for ix in range(3):
                    n = f'{kind}_{iy}{ix}'; p = f'{OUTDIR}/{n}.json'
                    if os.path.exists(p): continue
                    bb = (S + (N - S) * iy / 3, W + (E - W) * ix / 3, S + (N - S) * (iy + 1) / 3, W + (E - W) * (ix + 1) / 3)
                    els = fetch(query(bb, mode), n, soft=True)
                    if els is not None: json.dump(els, open(p, 'w')); print(f'  готово {n}: {len(els)}', flush=True)
                    else: left += 1
            if not left: return
            time.sleep(30)
    if '--routes' in sys.argv or '--all' in sys.argv:
        big('routes', True)
    if '--extras' in sys.argv or '--all' in sys.argv:
        big('extras', 'extras')
    if '--routes' in sys.argv or '--extras' in sys.argv:
        return
    all_t = list(tiles())
    print(f'плиток всего {len(all_t)}', flush=True)
    for rnd_ in range(40):
        left = [(n, bb) for n, bb in all_t if not os.path.exists(f'{OUTDIR}/{n}.json')]
        if not left: break
        print(f'круг {rnd_ + 1}: осталось {len(left)}', flush=True)
        for n, bb in left:
            els = fetch(query(bb, False), n, soft=True)
            if els is not None:
                json.dump(els, open(f'{OUTDIR}/{n}.json', 'w'))
                print(f'  готово {n}: {len(els)}', flush=True)
        time.sleep(30)
    left = [n for n, bb in all_t if not os.path.exists(f'{OUTDIR}/{n}.json')]
    print('ОСТАЛОСЬ: ' + ','.join(left) if left else 'ВСЁ СКАЧАНО', flush=True)
    if left:
        sys.exit(1)

if __name__ == '__main__':
    main()
