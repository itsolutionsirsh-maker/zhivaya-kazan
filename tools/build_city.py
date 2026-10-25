#!/usr/bin/env python3
"""Карта всей Казани кусками: site/map/base.json + site/map/c_<x>_<y>.json.
base — то, что нужно всегда: крупные улицы и пешеходные (граф для машин, автобусов, навигатора), остановки, маршруты,
переходы, площади, стены, большие площади (вода, леса) и важные места (больницы, полиция, музеи…).
Куски 2×2 км — дома, дворовые проезды и тропинки, парки, магазины и кафе: игра подгружает их вокруг игрока.
Координаты — локальные метры × 10 (дециметры), ось Y вниз (как на canvas). Начало координат то же, что у старой карты.
  python3 tools/build_city.py   (сырьё: raw/kazan_v5.json — центр, raw/city/*.json — остальной город)"""
import json, math, sys, collections, os, glob, hashlib

DSTDIR = sys.argv[1] if len(sys.argv) > 1 else 'site/map'
CHUNK = 2000.0   # метров

# bbox карты: юг, запад, север, восток (можно задать CITY="S,W,N,E")
S, W, N, E = (float(v) for v in os.environ.get('CITY', '55.66,48.86,55.93,49.33').split(','))
# начало координат фиксировано (центр первой версии карты), чтобы сохранения не сдвигались
lat0, lon0 = 55.793, 49.114
M_LAT = 111320.0
M_LON = 111320.0 * math.cos(math.radians(lat0))

def proj(lat, lon):
    return ((lon - lon0) * M_LON, -(lat - lat0) * M_LAT)

def q(v):
    return int(round(v * 10))

XMIN, YMIN = proj(N, W)
XMAX, YMAX = proj(S, E)
PAD = 150.0  # метров за границей bbox

def inside(x, y, pad=0.0):
    return XMIN - pad <= x <= XMAX + pad and YMIN - pad <= y <= YMAX + pad


ROAD_CLASSES = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified',
                'residential', 'living_street', 'service', 'pedestrian', 'footway', 'path', 'steps']
def road_class(hw):
    hw = hw.replace('_link', '')
    return ROAD_CLASSES.index(hw) if hw in ROAD_CLASSES else None

# ---------- дороги и граф ----------
node_index = {}
nodes = []
def node_id(nid, lat, lon):
    if nid not in node_index:
        x, y = proj(lat, lon)
        node_index[nid] = len(nodes)
        nodes.append([q(x), q(y)])
    return node_index[nid]


roads = []
plazas = []
buildings = []
# ---------- стыковка колец (вода, маршруты) ----------
def dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])

def stitch(ways, gap=60.0):
    """ways: список полилиний (списков [x,y]) в порядке relation. Возвращает список цепочек."""
    chains = []
    cur = []
    for w in ways:
        if not w:
            continue
        if not cur:
            cur = list(w)
            continue
        d0, d1 = dist(cur[-1], w[0]), dist(cur[-1], w[-1])
        if min(d0, d1) <= gap:
            seg = w if d0 <= d1 else list(reversed(w))
            cur.extend(seg[1:] if dist(cur[-1], seg[0]) < 1 else seg)
        else:
            # может быть, стыкуется к началу цепочки
            e0, e1 = dist(cur[0], w[0]), dist(cur[0], w[-1])
            if min(e0, e1) <= gap:
                seg = list(reversed(w)) if e0 <= e1 else w
                cur = seg + cur
            else:
                chains.append(cur)
                cur = list(w)
    if cur:
        chains.append(cur)
    return chains

def rings_from_members(members):
    """Собирает замкнутые кольца из набора путей (порядок произвольный)."""
    ways = [[list(proj(p['lat'], p['lon'])) for p in m['geometry']] for m in members if m.get('geometry')]
    rings = []
    pool = ways[:]
    while pool:
        ring = pool.pop(0)
        changed = True
        while changed and dist(ring[0], ring[-1]) > 2.0:
            changed = False
            for i, w in enumerate(pool):
                if dist(ring[-1], w[0]) <= 2.0:
                    ring.extend(w[1:]); pool.pop(i); changed = True; break
                if dist(ring[-1], w[-1]) <= 2.0:
                    ring.extend(list(reversed(w))[1:]); pool.pop(i); changed = True; break
        if len(ring) >= 4 and dist(ring[0], ring[-1]) <= 50.0:
            rings.append(ring)
    return rings

def clip_poly(poly, xmin, ymin, xmax, ymax):
    """Сазерленд–Ходжман: обрезка полигона прямоугольником."""
    def clip_edge(pts, inside_fn, inter_fn):
        out = []
        if not pts:
            return out
        prev = pts[-1]
        for cur in pts:
            if inside_fn(cur):
                if not inside_fn(prev):
                    out.append(inter_fn(prev, cur))
                out.append(cur)
            elif inside_fn(prev):
                out.append(inter_fn(prev, cur))
            prev = cur
        return out
    def ix(a, b, x):
        t = (x - a[0]) / (b[0] - a[0]) if b[0] != a[0] else 0
        return [x, a[1] + (b[1] - a[1]) * t]
    def iy(a, b, y):
        t = (y - a[1]) / (b[1] - a[1]) if b[1] != a[1] else 0
        return [a[0] + (b[0] - a[0]) * t, y]
    p = clip_edge(poly, lambda v: v[0] >= xmin, lambda a, b: ix(a, b, xmin))
    p = clip_edge(p, lambda v: v[0] <= xmax, lambda a, b: ix(a, b, xmax))
    p = clip_edge(p, lambda v: v[1] >= ymin, lambda a, b: iy(a, b, ymin))
    p = clip_edge(p, lambda v: v[1] <= ymax, lambda a, b: iy(a, b, ymax))
    return p

def poly_area(p):
    s = 0
    for i in range(len(p)):
        x1, y1 = p[i]; x2, y2 = p[(i + 1) % len(p)]
        s += x1 * y2 - x2 * y1
    return abs(s) / 2

areas = []
def add_area(kind, pts_m):
    pts_m = clip_poly(pts_m, XMIN - PAD, YMIN - PAD, XMAX + PAD, YMAX + PAD)
    if len(pts_m) < 3 or poly_area(pts_m) < 30:
        return
    areas.append({'k': kind, 'p': [q(v) for p in pts_m for v in p]})

squares = []
walls = []
crossings = []
stops = []
pois = []
POI_MAP = {
    'police': 'police', 'hospital': 'hospital', 'clinic': 'hospital', 'pharmacy': 'pharmacy',
    'cafe': 'cafe', 'restaurant': 'cafe', 'fast_food': 'cafe', 'bar': 'bar', 'pub': 'bar',
    'bank': 'bank', 'atm': 'atm', 'school': 'school', 'university': 'university', 'college': 'university',
    'theatre': 'theatre', 'cinema': 'theatre', 'fuel': 'fuel', 'library': 'library',
    'place_of_worship': 'worship', 'marketplace': 'market',
}
def centroid(geom):
    xs = [proj(p['lat'], p['lon']) for p in geom]
    return sum(p[0] for p in xs) / len(xs), sum(p[1] for p in xs) / len(xs)

route_rels = []

def process(els):
    for e in els:
        if e['type'] != 'way' or 'highway' not in e.get('tags', {}):
            continue
        t = e['tags']
        c = road_class(t['highway'])
        if c is None or 'geometry' not in e:
            continue
        if t.get('area') == 'yes' or (t['highway'] == 'pedestrian' and e['nodes'][0] == e['nodes'][-1]):
            plazas.append([q(v) for g in e['geometry'] for v in proj(g['lat'], g['lon'])])
            continue
        if t['highway'] == 'service' and t.get('service') in ('parking_aisle', 'driveway', 'drive-through'):
            continue
        if t.get('access') in ('private', 'no') and c >= 8:
            continue
        pts = [node_id(nid, g['lat'], g['lon']) for nid, g in zip(e['nodes'], e['geometry'])]
        if len(pts) < 2:
            continue
        ow = t.get('oneway', 'no')
        ow = 1 if ow in ('yes', 'true', '1') else (-1 if ow == '-1' else 0)
        if t['highway'] in ('motorway', 'motorway_link') and ow == 0:
            ow = 1
        lanes = None
        try:
            lanes = int(float(t.get('lanes', '').split(';')[0]))
        except Exception:
            pass
        ms = None
        try:
            ms = int(float(t.get('maxspeed', '').split()[0]))
        except Exception:
            pass
        r = {'c': c, 'p': pts}
        if t.get('name'):
            r['n'] = t['name']
        if ow:
            r['o'] = ow
        if lanes:
            r['l'] = lanes
        if ms:
            r['s'] = ms
        roads.append(r)
    for e in els:
        if e['type'] != 'way' or 'building' not in e.get('tags', {}) or 'geometry' not in e:
            continue
        if e['nodes'][0] != e['nodes'][-1] or len(e['geometry']) < 4:
            continue
        t = e['tags']
        g = e['geometry'][:-1]
        pts = [q(v) for p in g for v in proj(p['lat'], p['lon'])]
        b = {'p': pts}
        lv = t.get('building:levels')
        try:
            b['h'] = max(1, int(float(lv)))
        except Exception:
            pass
        name = t.get('name') or t.get('addr:housename')
        if name:
            b['n'] = name
        kind = t['building']
        if kind in ('yes',):
            kind = None
        if t.get('amenity'):
            kind = t['amenity']
        if t.get('shop'):
            kind = 'shop'
        if kind:
            b['t'] = kind
        buildings.append(b)
    for e in els:
        t = e.get('tags', {})
        if e['type'] == 'way' and 'geometry' in e and e['nodes'][0] == e['nodes'][-1]:
            pts = [list(proj(p['lat'], p['lon'])) for p in e['geometry'][:-1]]
            if t.get('natural') == 'water':
                add_area('water', pts)
            elif t.get('leisure') in ('park', 'garden'):
                add_area('park', pts)
            elif t.get('leisure') in ('playground', 'pitch', 'stadium'):
                add_area('pitch', pts)
            elif t.get('landuse') in ('grass', 'meadow'):
                add_area('grass', pts)
            elif t.get('landuse') == 'forest' or t.get('natural') == 'wood':
                add_area('forest', pts)
            elif t.get('landuse') == 'cemetery':
                add_area('cemetery', pts)
            elif t.get('amenity') == 'parking' and t.get('parking') not in ('underground', 'multi-storey', 'rooftop'):
                add_area('parking', pts)
        elif e['type'] == 'relation' and t.get('natural') == 'water':
            outers = [m for m in e.get('members', []) if m['type'] == 'way' and m.get('role') in ('outer', '')]
            inners = [m for m in e.get('members', []) if m['type'] == 'way' and m.get('role') == 'inner']
            for ring in rings_from_members(outers):
                add_area('water', ring)
            for ring in rings_from_members(inners):
                add_area('land', ring)
    for e in els:
        t = e.get('tags', {})
        is_sq = t.get('place') == 'square'
        is_ped = t.get('area:highway') == 'pedestrian' or (t.get('highway') == 'pedestrian' and (t.get('area') == 'yes' or e['type'] == 'relation'))
        if not (is_sq or is_ped):
            continue
        rings = []
        if e['type'] == 'way' and e.get('geometry') and e['nodes'][0] == e['nodes'][-1]:
            rings = [[list(proj(p['lat'], p['lon'])) for p in e['geometry'][:-1]]]
        elif e['type'] == 'relation':
            rings = rings_from_members([m for m in e.get('members', []) if m['type'] == 'way' and m.get('role') in ('outer', '')])
        for r in rings:
            r = clip_poly(r, XMIN - PAD, YMIN - PAD, XMAX + PAD, YMAX + PAD)
            if len(r) < 3 or poly_area(r) < 60:
                continue
            areas.append({'k': 'plaza', 'p': [q(v) for p in r for v in p]})
            if is_sq and t.get('name'):
                cx = sum(p[0] for p in r) / len(r); cy = sum(p[1] for p in r) / len(r)
                squares.append({'n': t['name'], 'x': q(cx), 'y': q(cy), 'a': round(poly_area(r))})
    for e in els:
        t = e.get('tags', {})
        if e['type'] != 'way' or not e.get('geometry'):
            continue
        if t.get('historic') == 'citywalls' or t.get('barrier') == 'city_wall':
            k = 'kremlin'
        elif t.get('barrier') == 'wall':
            k = 'wall'
        else:
            continue
        walls.append({'k': k, 'p': [q(v) for g in e['geometry'] for v in proj(g['lat'], g['lon'])]})
    for e in els:
        if e['type'] != 'node':
            continue
        t = e.get('tags', {})
        hw = t.get('highway')
        if hw == 'crossing' or (hw == 'traffic_signals' and t.get('crossing')) or t.get('crossing') in ('marked', 'zebra', 'traffic_signals', 'uncontrolled'):
            if t.get('crossing') == 'unmarked' or t.get('crossing') == 'no':
                continue
            x, y = proj(e['lat'], e['lon'])
            if not inside(x, y):
                continue
            sig = 1 if (hw == 'traffic_signals' or t.get('crossing') == 'traffic_signals') else 0
            crossings.append({'x': q(x), 'y': q(y), 's': sig})
    for e in els:
        t = e.get('tags', {})
        if not t:
            continue
        if e['type'] == 'node':
            x, y = proj(e['lat'], e['lon'])
        elif e['type'] == 'way' and 'geometry' in e:
            x, y = centroid(e['geometry'])
        else:
            continue
        if not inside(x, y):
            continue
        if e['type'] == 'node' and (t.get('highway') == 'bus_stop' or t.get('railway') == 'tram_stop'):
            stops.append({'x': q(x), 'y': q(y), 'n': t.get('name', 'Остановка'), 'id': e['id'],
                          'k': 'tram' if t.get('railway') == 'tram_stop' else 'bus'})
            continue
        kind = None
        if t.get('amenity') in POI_MAP:
            kind = POI_MAP[t['amenity']]
        elif t.get('shop'):
            kind = 'shop'
        elif t.get('tourism') == 'museum':
            kind = 'museum'
        elif t.get('tourism') == 'attraction':
            kind = 'sight'
        elif t.get('tourism') == 'hotel':
            kind = 'hotel'
        elif t.get('office'):
            kind = 'office'
        if not kind:
            continue
        name = t.get('name')
        if not name and kind in ('shop', 'office', 'cafe', 'bar', 'atm'):
            continue
        p = {'x': q(x), 'y': q(y), 't': kind}
        if name:
            p['n'] = name
        if t.get('shop'):
            p['st'] = t['shop']
        pois.append(p)
    for e in els:
        if e['type'] == 'relation' and e.get('tags', {}).get('route') in ('bus', 'trolleybus', 'tram'):
            route_rels.append(e)

# читаем кусками и сразу перерабатываем — чтобы на сервере с 1 ГБ памяти не держать весь город в сыром виде
seen = {'node': set(), 'way': set(), 'relation': set()}
files = (['raw/kazan_v5.json'] if os.path.exists('raw/kazan_v5.json') else []) + sorted(glob.glob('raw/city/*.json'))
total_els = 0
for f in files:
    d = json.load(open(f))
    els = d['elements'] if isinstance(d, dict) else d
    del d
    fresh = []
    for e in els:
        s = seen[e['type']]
        if e['id'] in s:
            continue
        s.add(e['id']); fresh.append(e)
    del els
    process(fresh)
    total_els += len(fresh)
    del fresh
print('элементов:', total_els, 'дорог:', len(roads), 'узлов:', len(nodes), 'зданий:', len(buildings))
del seen
for p in plazas:
    areas.append({'k': 'plaza', 'p': p})

order = {'water': 0, 'land': 1, 'forest': 2, 'cemetery': 2, 'park': 3, 'grass': 4, 'plaza': 5, 'pitch': 6, 'parking': 7}
areas.sort(key=lambda a: order.get(a['k'], 9))
print('площадей:', collections.Counter(a['k'] for a in areas), 'площади:', len(squares), 'стен:', len(walls), 'переходов:', len(crossings))
print('остановок:', len(stops), 'POI:', collections.Counter(p['t'] for p in pois))
# ---------- маршруты транспорта ----------
def dp_simplify(pts, eps):
    if len(pts) < 3:
        return pts
    def pdist(p, a, b):
        if a == b:
            return dist(p, a)
        t = ((p[0]-a[0])*(b[0]-a[0]) + (p[1]-a[1])*(b[1]-a[1])) / ((b[0]-a[0])**2 + (b[1]-a[1])**2)
        t = max(0, min(1, t))
        return dist(p, [a[0] + t*(b[0]-a[0]), a[1] + t*(b[1]-a[1])])
    stack = [(0, len(pts) - 1)]
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    while stack:
        i, j = stack.pop()
        if j <= i + 1:
            continue
        dmax, idx = 0, -1
        for k in range(i + 1, j):
            d = pdist(pts[k], pts[i], pts[j])
            if d > dmax:
                dmax, idx = d, k
        if dmax > eps:
            keep[idx] = True
            stack.append((i, idx)); stack.append((idx, j))
    return [p for p, k in zip(pts, keep) if k]

def project_on_line(pts, cum, p, maxd):
    best = (maxd, None)
    for i in range(len(pts) - 1):
        a, b = pts[i], pts[i + 1]
        L2 = (b[0]-a[0])**2 + (b[1]-a[1])**2
        if L2 == 0:
            continue
        t = ((p[0]-a[0])*(b[0]-a[0]) + (p[1]-a[1])*(b[1]-a[1])) / L2
        t = max(0, min(1, t))
        pp = [a[0] + t*(b[0]-a[0]), a[1] + t*(b[1]-a[1])]
        d = dist(p, pp)
        if d < best[0]:
            best = (d, cum[i] + t * math.sqrt(L2))
    return best[1]

routes = []
els = route_rels
for e in els:
    if e['type'] != 'relation':
        continue
    t = e.get('tags', {})
    rt = t.get('route')
    if rt not in ('bus', 'trolleybus', 'tram'):
        continue
    ways = []
    stop_pts = []
    for m in e.get('members', []):
        if m['type'] == 'way' and m.get('geometry') and m.get('role', '') in ('', 'forward', 'backward'):
            ways.append([list(proj(p['lat'], p['lon'])) for p in m['geometry']])
        elif m['type'] == 'node' and 'lat' in m and m.get('role', '').startswith(('stop', 'platform')):
            stop_pts.append((list(proj(m['lat'], m['lon'])), m['ref']))
    if not ways:
        continue
    chains = stitch(ways)
    # самый длинный непрерывный кусок внутри расширенного bbox
    best, best_len = None, 0
    for ch in chains:
        run = []
        for p in ch + [None]:
            if p is not None and inside(p[0], p[1], PAD):
                run.append(p)
            else:
                if len(run) > 1:
                    L = sum(dist(run[i], run[i+1]) for i in range(len(run)-1))
                    if L > best_len:
                        best, best_len = run, L
                run = []
    if not best or best_len < 900:
        continue
    pts = dp_simplify(best, 1.0)
    cum = [0.0]
    for i in range(len(pts) - 1):
        cum.append(cum[-1] + dist(pts[i], pts[i+1]))
    stop_names = {s['id']: s['n'] for s in stops}
    rs = []
    for p, ref in stop_pts:
        d = project_on_line(pts, cum, p, 35.0)
        if d is not None:
            rs.append([round(d, 1), stop_names.get(ref, 'Остановка')])
    rs.sort()
    dedup = []
    for d, n in rs:
        if not dedup or d - dedup[-1][0] > 60:
            dedup.append([d, n])
    routes.append({'ref': t.get('ref', '?'), 'name': t.get('name', ''), 'type': rt,
                   'p': [q(v) for p in pts for v in p], 's': dedup, 'len': round(best_len), 'rid': e['id']})

# выбираем разнообразные маршруты: один вариант на номер (машины всё равно ходят в обе стороны),
# немного автобусов, троллейбусов и трамваев — чтобы не грузить телефон
routes.sort(key=lambda r: -r['len'])
chosen, per_ref, per_type = [], collections.Counter(), collections.Counter()
limits = {'bus': 16, 'tram': 4, 'trolleybus': 7}
for r in routes:
    key = (r['type'], r['ref'])
    if per_ref[key] >= 1 or per_type[r['type']] >= limits[r['type']]:
        continue
    if len(r['s']) < 3:
        continue
    chosen.append(r); per_ref[key] += 1; per_type[r['type']] += 1
print('маршрутов всего:', len(routes), 'выбрано:', [(r['type'], r['ref'], r['len'], len(r['s'])) for r in chosen])


# ---------- раскладка по кускам ----------
CH = CHUNK * 10  # в дециметрах
def ck(x, y):
    return (math.floor(x / CH), math.floor(y / CH))
def base_road(c):
    return c <= 7 or c == 9          # машинные улицы и пешеходные (Баумана) — всегда; дворы, тропинки, лестницы — кусками
LANDMARK = {'police', 'hospital', 'museum', 'sight', 'theatre', 'university', 'worship', 'hotel', 'market', 'bank'}

base_nodes = set(); node_chunks = collections.defaultdict(set); road_chunk = []
for r in roads:
    if base_road(r['c']):
        base_nodes.update(r['p']); road_chunk.append(None); continue
    k = ck(*nodes[r['p'][len(r['p']) // 2]]); road_chunk.append(k)
    for n in r['p']:
        node_chunks[n].add(k)
for n, ks in node_chunks.items():
    if len(ks) > 1:
        base_nodes.add(n)
base_list = sorted(base_nodes); base_idx = {n: i for i, n in enumerate(base_list)}

chunks = collections.defaultdict(lambda: {'nodes': [], 'roads': [], 'buildings': [], 'areas': [], 'pois': []})
local_idx = {}
base_roads = []
for r, k in zip(roads, road_chunk):
    if k is None:
        r2 = dict(r); r2['p'] = [base_idx[n] for n in r['p']]; base_roads.append(r2); continue
    c = chunks[k]; li = local_idx.setdefault(k, {}); pp = []
    for n in r['p']:
        if n in base_idx:
            pp.append(-(base_idx[n] + 1))
        else:
            if n not in li:
                li[n] = len(c['nodes']); c['nodes'].append(nodes[n])
            pp.append(li[n])
    r2 = dict(r); r2['p'] = pp; c['roads'].append(r2)

for b in buildings:
    p = b['p']; n = len(p) // 2
    chunks[ck(sum(p[0::2]) / n, sum(p[1::2]) / n)]['buildings'].append(b)

base_areas = []
for a in areas:
    p = a['p']; x0, x1, y0, y1 = min(p[0::2]), max(p[0::2]), min(p[1::2]), max(p[1::2])
    if a['k'] in ('water', 'land', 'plaza') or math.hypot(x1 - x0, y1 - y0) > 15000:
        base_areas.append(a)
    else:
        chunks[ck((x0 + x1) / 2, (y0 + y1) / 2)]['areas'].append(a)

base_pois = []
for p in pois:
    if p['t'] in LANDMARK:
        base_pois.append(p)
    else:
        chunks[ck(p['x'], p['y'])]['pois'].append(p)

os.makedirs(DSTDIR, exist_ok=True)
for f in glob.glob(os.path.join(DSTDIR, 'c_*.json')):
    os.remove(f)
index = {}
total = 0
for (cx, cy), c in sorted(chunks.items()):
    if not (c['buildings'] or c['roads'] or c['areas'] or c['pois']):
        continue
    key = f'{cx}_{cy}'
    txt = json.dumps(c, ensure_ascii=False, separators=(',', ':'))
    open(os.path.join(DSTDIR, f'c_{key}.json'), 'w').write(txt)
    index[key] = [len(c['buildings']), len(txt) // 1024]
    total += len(txt)
# поиск в навигаторе по всему городу: все места с названиями из кусков (сами куски могут быть не загружены)
places = [[p['n'], p['t'], p['x'], p['y']] for c in chunks.values() for p in c['pois'] if p.get('n')]
json.dump(places, open(os.path.join(DSTDIR, 'places.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print('мест для поиска:', len(places), os.path.getsize(os.path.join(DSTDIR, 'places.json')) // 1024, 'КБ')
ver = hashlib.sha1(json.dumps(index, sort_keys=True).encode() + str(len(base_roads)).encode()).hexdigest()[:10]
out = {
    'meta': {'lat0': lat0, 'lon0': lon0, 'mlat': M_LAT, 'mlon': M_LON,
             'bbox': [q(XMIN), q(YMIN), q(XMAX), q(YMAX)], 'classes': ROAD_CLASSES,
             'chunk': CH, 'chunks': index, 'v': ver},
    'nodes': [nodes[n] for n in base_list], 'roads': base_roads, 'buildings': [], 'areas': base_areas,
    'stops': stops, 'pois': base_pois, 'routes': chosen, 'crossings': crossings, 'squares': squares, 'walls': walls,
}
bp = os.path.join(DSTDIR, 'base.json')
json.dump(out, open(bp, 'w'), ensure_ascii=False, separators=(',', ':'))
print(f'base: {os.path.getsize(bp) // 1024} КБ (узлов {len(base_list)}, улиц {len(base_roads)}, площадей {len(base_areas)}, мест {len(base_pois)})')
print(f'кусков: {len(index)}, всего {total // 1024} КБ, самый большой {max(v[1] for v in index.values())} КБ, версия {ver}')
