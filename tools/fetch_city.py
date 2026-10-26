#!/usr/bin/env python3
"""Карта всей Казани: качаем OSM сеткой плиток ~2×2 км в raw/city/<ряд>_<столбец>.json.
Плитки, целиком лежащие в уже скачанном центре (raw/kazan_v5.json), пропускаем.
Каждая плитка — свой файл: при обрыве перезапуск докачивает только недостающие.
Сначала берём из OSM границу города и дополняем сетку плитками там, где город выходит за прямоугольник CITY
(raw/city_plan.json; сетка привязана к юго-западному углу CITY, имена уже скачанных плиток не меняются).
  python3 tools/fetch_city.py            — плитки домов/дорог/заведений
  python3 tools/fetch_city.py --routes   — маршруты автобусов/троллейбусов/трамваев по всему городу (кусками)
  python3 tools/fetch_city.py --extras   — площади, пешеходные зоны, стены Кремля
  python3 tools/fetch_city.py --all      — всё сразу
  python3 tools/fetch_city.py --plan     — только заново взять границу города и пересчитать плитки
"""
import fcntl, json, math, os, sys, time

# границы города (с запасом): юг, запад, север, восток
CITY = tuple(float(v) for v in os.environ.get('CITY', '55.66,48.86,55.93,49.33').split(','))
# уже скачанный центр (raw/kazan_v5.json); если его нет (например, на сервере) — качаем всё, включая центр
CORE = tuple(float(v) for v in os.environ.get('CORE', '55.752,49.050,55.838,49.190' if os.path.exists('raw/kazan_v5.json') else '0,0,0,0').split(','))
DLAT, DLON = 0.0225, 0.0336
OUTDIR = 'raw/city'
# план плиток по границе города; лежит не в raw/city — оттуда build_city.py берёт все файлы подряд
PLAN = 'raw/city_plan.json'
KREMLIN = (55.7988, 49.1052)
MARGIN = 0.003   # ~300 м за границей города, чтобы крайние дома и дороги не обрезались

def cell_bb(iy, ix):
    S, W = CITY[0], CITY[1]
    return (S + iy * DLAT, W + ix * DLON, S + (iy + 1) * DLAT, W + (ix + 1) * DLON)

def old_cells():
    S, W, N, E = CITY
    ny = round((N - S) / DLAT); nx = round((E - W) / DLON)
    return [(iy, ix) for iy in range(ny) for ix in range(nx)]

def load_plan():
    try:
        return json.load(open(PLAN))
    except Exception:
        return None

def tiles():
    plan = load_plan()
    for iy, ix in ([tuple(c) for c in plan['cells']] if plan else old_cells()):
        bb = cell_bb(iy, ix)
        inside = bb[0] >= CORE[0] and bb[1] >= CORE[1] and bb[2] <= CORE[2] and bb[3] <= CORE[3]
        if not inside:
            yield f'{iy:02d}_{ix:02d}', bb

def save(p, els):
    # сначала во временный файл: оборванная запись не должна выглядеть как готовая плитка
    json.dump(els, open(p + '.part', 'w')); os.replace(p + '.part', p)

# ---------- граница города ----------
def inside_poly(pt, segs):
    """Чёт-нечет по всем отрезкам границы: порядок кусков relation не важен, внутренние кольца — дыры."""
    y, x = pt; c = False
    for (y1, x1), (y2, x2) in segs:
        if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1):
            c = not c
    return c

def city_boundary(fetch):
    q = '[out:json][timeout:180];rel["boundary"="administrative"]["name"~"Казань"](55.40,48.50,56.10,49.80);out geom;'
    els = fetch(q, 'boundary', soft=True)
    if not els:
        return None
    best = None
    for e in els:
        if e['type'] != 'relation':
            continue
        segs = []
        for m in e.get('members', []):
            g = m.get('geometry')
            if m.get('type') != 'way' or not g or m.get('role') not in ('outer', 'inner', ''):
                continue
            pts = [(p['lat'], p['lon']) for p in g if p]
            segs += list(zip(pts, pts[1:]))
        if not segs or not inside_poly(KREMLIN, segs):
            continue
        lats = [p[0] for s in segs for p in s]; lons = [p[1] for s in segs for p in s]
        bb = (min(lats), min(lons), max(lats), max(lons))
        area = (bb[2] - bb[0]) * (bb[3] - bb[1])
        if area > 1.0:   # больше градуса на градус — это уже республика, не город
            continue
        if best is None or area > best['area']:
            t = e.get('tags', {})
            best = {'area': area, 'segs': segs, 'bb': bb, 'name': t.get('name'), 'admin_level': t.get('admin_level'), 'id': e['id']}
    return best

def make_plan(fetch):
    b = city_boundary(fetch)
    if not b:
        print('граница города: не вышло взять из OSM — качаем прежний прямоугольник', flush=True)
        return None
    S, W = CITY[0], CITY[1]
    cy = lambda lat: math.floor((lat - S) / DLAT)
    cx = lambda lon: math.floor((lon - W) / DLON)
    need = set()
    # клетки, через которые проходит граница (отрезки дробим, чтобы длинный прямой кусок не перескочил клетку)
    for (y1, x1), (y2, x2) in b['segs']:
        n = max(1, int(max(abs(y2 - y1) / 0.004, abs(x2 - x1) / 0.006)))
        for i in range(n + 1):
            y = y1 + (y2 - y1) * i / n; x = x1 + (x2 - x1) * i / n
            for dy in (-MARGIN, 0, MARGIN):
                for dx in (-MARGIN * 1.8, 0, MARGIN * 1.8):
                    need.add((cy(y + dy), cx(x + dx)))
    # клетки целиком внутри города: центр клетки внутри границы
    bb = b['bb']
    for iy in range(cy(bb[0]) - 1, cy(bb[2]) + 2):
        for ix in range(cx(bb[1]) - 1, cx(bb[3]) + 2):
            s, w, n, e = cell_bb(iy, ix)
            if (iy, ix) not in need and inside_poly(((s + n) / 2, (w + e) / 2), b['segs']):
                need.add((iy, ix))
    old = set(old_cells())
    cells = sorted(old | need)
    added = sorted(need - old)
    bbs = [cell_bb(*c) for c in cells]
    plan = {'v': 1, 'boundary': {'id': b['id'], 'name': b['name'], 'admin_level': b['admin_level'], 'bbox': [round(v, 5) for v in bb]},
            'cells': [list(c) for c in cells], 'added': [f'{iy:02d}_{ix:02d}' for iy, ix in added],
            'bbox': [round(min(x[0] for x in bbs), 5), round(min(x[1] for x in bbs), 5), round(max(x[2] for x in bbs), 5), round(max(x[3] for x in bbs), 5)]}
    json.dump(plan, open(PLAN + '.part', 'w')); os.replace(PLAN + '.part', PLAN)
    print(f'граница города: {b["name"]} (relation {b["id"]}), {bb[0]:.3f}–{bb[2]:.3f} с. ш., {bb[1]:.3f}–{bb[3]:.3f} в. д.; '
          f'плиток {len(cells)}, из них новых за прежним прямоугольником {len(added)}', flush=True)
    return plan

def main():
    # fetch_tiles.py при импорте сам начинает качать — поэтому берём из него только функции через exec до «os.makedirs»
    src = open(os.path.join(os.path.dirname(__file__), 'fetch_tiles.py'), encoding='utf8').read()
    src = src.split("os.makedirs('raw', exist_ok=True)")[0]
    g = {'__name__': 'ft'}; exec(src, g)
    g['MIRRORS'][:] = ["https://overpass-api.de/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
                       "https://overpass.kumi.systems/api/interpreter"]
    query, fetch = g['query'], g['fetch']
    os.makedirs(OUTDIR, exist_ok=True)
    # одна докачка за раз: её запускает и citymap.sh из консоли, и сам сервер (server.js, mapFetch)
    lock = open('raw/city_fetch.lock', 'w')
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        print('карту уже качает другой процесс — выхожу', flush=True); return
    plan = load_plan()
    if plan is None or '--plan' in sys.argv:
        plan = make_plan(fetch) or plan
    if '--plan' in sys.argv:
        return
    # маршруты транспорта и «особое» (площади, пешеходные зоны, стены Кремля) — крупными кусками 3×3
    # и полосами там, где город выходит за прежний прямоугольник
    def big(kind, mode):
        S, W, N, E = CITY
        pieces = [(f'{kind}_{iy}{ix}', (S + (N - S) * iy / 3, W + (E - W) * ix / 3, S + (N - S) * (iy + 1) / 3, W + (E - W) * (ix + 1) / 3))
                  for iy in range(3) for ix in range(3)]
        if plan:
            pS, pW, pN, pE = plan['bbox']
            strips = [('s', (pS, pW, S, pE)), ('n', (N, pW, pN, pE)), ('w', (S, pW, N, W)), ('e', (S, E, N, pE))]
            pieces += [(f'{kind}_{k}', bb) for k, bb in strips if bb[2] - bb[0] > 1e-6 and bb[3] - bb[1] > 1e-6]
        for r in range(6):
            left = 0
            for n, bb in pieces:
                p = f'{OUTDIR}/{n}.json'
                if os.path.exists(p): continue
                els = fetch(query(bb, mode), n, soft=True)
                if els is not None: save(p, els); print(f'  готово {n}: {len(els)}', flush=True)
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
    # плотный центр Overpass часто не отдаёт целиком (502/504) — со второго круга такую плитку качаем четвертинками
    def quarters(n, bb):
        S, W, N, E = bb; my, mx = (S + N) / 2, (W + E) / 2
        return [(f'{n}_a', (S, W, my, mx)), (f'{n}_b', (S, mx, my, E)), (f'{n}_c', (my, W, N, mx)), (f'{n}_d', (my, mx, N, E))]
    def done(n, bb):
        return os.path.exists(f'{OUTDIR}/{n}.json') or all(os.path.exists(f'{OUTDIR}/{q}.json') for q, _ in quarters(n, bb))
    for rnd_ in range(40):
        left = [(n, bb) for n, bb in all_t if not done(n, bb)]
        if not left: break
        print(f'круг {rnd_ + 1}: осталось {len(left)}', flush=True)
        for n, bb in left:
            parts = [(n, bb)] if rnd_ == 0 and not os.environ.get('QUARTERS') else [(q, qb) for q, qb in quarters(n, bb) if not os.path.exists(f'{OUTDIR}/{q}.json')]
            for pn, pbb in parts:
                els = fetch(query(pbb, False), pn, soft=True)
                if els is not None:
                    save(f'{OUTDIR}/{pn}.json', els)
                    print(f'  готово {pn}: {len(els)}', flush=True)
        time.sleep(30)
    left = [n for n, bb in all_t if not done(n, bb)]
    print('ОСТАЛОСЬ: ' + ','.join(left) if left else 'ВСЁ СКАЧАНО', flush=True)
    if left:
        sys.exit(1)

if __name__ == '__main__':
    main()
