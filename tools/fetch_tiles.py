#!/usr/bin/env python3
"""Загрузка OSM по плиткам (большой bbox не пролезает в таймаут Overpass) и склейка без дублей."""
import json, subprocess, sys, time, os
# bbox карты: юг, запад, север, восток (тот же, что в build_map.py; можно задать BBOX="S,W,N,E")
S, W, N, E = (float(v) for v in os.environ.get('BBOX', '55.774,49.079,55.812,49.149').split(','))
NX, NY = 3, 3
OUT = next((a for a in sys.argv[1:] if not a.startswith('--')), 'raw/kazan_osm.json')
MIRRORS = ["https://overpass.kumi.systems/api/interpreter",
           "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
           "https://overpass-api.de/api/interpreter"]

def query(bb, routes):
    B = f"({bb[0]:.5f},{bb[1]:.5f},{bb[2]:.5f},{bb[3]:.5f})"
    if routes == 'extras':
        parts = [f'way["place"="square"]{B};', f'relation["place"="square"]{B};',
                 f'way["highway"="pedestrian"]["area"="yes"]{B};', f'relation["highway"="pedestrian"]{B};',
                 f'way["area:highway"="pedestrian"]{B};',
                 f'way["historic"="citywalls"]{B};', f'way["barrier"="city_wall"]{B};',
                 f'way["barrier"="wall"](55.7960,49.1020,55.8020,49.1100);',
                 f'way["man_made"="tower"]["tower:type"="defensive"]{B};', f'way["building"="tower"](55.7960,49.1020,55.8020,49.1100);']
    elif routes:
        parts = [f'relation["route"~"^(bus|trolleybus|tram)$"]{B};']
    else:
        parts = [
            f'way["highway"~"^(motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|unclassified|residential|living_street|service|pedestrian|footway|path|steps)$"]{B};',
            f'way["building"]{B};', f'way["natural"="water"]{B};', f'relation["natural"="water"]{B};',
            f'way["leisure"~"^(park|garden|playground|pitch|stadium)$"]{B};',
            f'way["landuse"~"^(grass|forest|cemetery|meadow)$"]{B};', f'way["natural"="wood"]{B};',
            f'node["highway"="bus_stop"]{B};', f'node["highway"~"^(crossing|traffic_signals)$"]{B};',
            f'way["amenity"="parking"]{B};', f'node["railway"="tram_stop"]{B};',
            f'node["amenity"~"^(police|hospital|clinic|cafe|restaurant|fast_food|bar|pub|bank|atm|pharmacy|school|university|college|theatre|cinema|fuel|library|place_of_worship|marketplace)$"]{B};',
            f'way["amenity"~"^(police|hospital|clinic|school|university|college|theatre|cinema|fuel|place_of_worship|marketplace)$"]{B};',
            f'node["shop"]{B};', f'node["tourism"~"^(attraction|museum|hotel)$"]{B};',
            f'way["tourism"~"^(attraction|museum|hotel)$"]{B};', f'node["office"]{B};',
            f'node["railway"="subway_entrance"]{B};']
    return "[out:json][timeout:180][maxsize:536870912];(" + "".join(parts) + ");out geom;"

def fetch(q, tag, soft=False):
    tmp = f'raw/tile_{tag}.json'
    for attempt in range(2 if soft else 5):
        for url in MIRRORS:
            host = url.split('/')[2]
            r = subprocess.run(['curl', '-sS', '-m', '240', '-o', tmp, '-w', '%{http_code}', url,
                                '--data-urlencode', 'data=' + q], capture_output=True, text=True)
            code = r.stdout.strip()
            if code == '200':
                try:
                    d = json.load(open(tmp))
                    if 'elements' in d:
                        print(f'  {tag}: {len(d["elements"])} эл. ({host})', flush=True)
                        os.remove(tmp)
                        return d['elements']
                except Exception:
                    pass
            print(f'  {tag}: {host} → {code or "err"}', flush=True)
            time.sleep(5)
    if soft:
        print(f'  {tag}: пока не вышло, вернёмся позже', flush=True)
        return None
    raise SystemExit(f'FAIL {tag}')

os.makedirs('raw', exist_ok=True)
seen = {}
if '--extras' in sys.argv:
    base = json.load(open(OUT))['elements']
    for e in base: seen[(e['type'], e['id'])] = e
    for e in fetch(query((S, W, N, E), 'extras'), 'extras'): seen[(e['type'], e['id'])] = e
    json.dump({'elements': list(seen.values())}, open(OUT, 'w'))
    print(f'OK: {len(seen)} элементов → {OUT}', flush=True); sys.exit(0)
# --ring S,W,N,E: карта расширяется — старый bbox уже скачан в OUT, докачиваем только полосы вокруг него
ring = next((a.split('=', 1)[1] for a in sys.argv[1:] if a.startswith('--ring=')), None)
if ring:
    oS, oW, oN, oE = (float(v) for v in ring.split(','))
    for e in json.load(open(OUT))['elements']:
        seen[(e['type'], e['id'])] = e
    def split(a0, a1, b0, b1, n, along_lon):
        out = []
        for k in range(n):
            if along_lon: out.append((a0, b0 + (b1 - b0) * k / n, a1, b0 + (b1 - b0) * (k + 1) / n))
            else: out.append((a0 + (a1 - a0) * k / n, b0, a0 + (a1 - a0) * (k + 1) / n, b1))
        return out
    # мелкие плитки (~1 км): серверы Overpass часто отвечают 504 на большие запросы
    tiles = []
    if N > oN: tiles += [('n%d' % k, bb) for k, bb in enumerate(split(oN, N, W, E, 6, True))]
    if S < oS: tiles += [('s%d' % k, bb) for k, bb in enumerate(split(S, oS, W, E, 5, True))]
    if W < oW: tiles += [('w%d' % k, bb) for k, bb in enumerate(split(oS, oN, W, oW, 3, False))]
    if E > oE: tiles += [('e%d' % k, bb) for k, bb in enumerate(split(oS, oN, oE, E, 3, False))]
    # каждая плитка — в свой файл: при обрыве перезапуск докачает только недостающие
    os.makedirs('raw/ring', exist_ok=True)
    skip = {t for a in sys.argv[1:] if a.startswith('--skip=') for t in a.split('=', 1)[1].split(',')}
    for rnd_ in range(12):
        left = [(n, bb) for n, bb in tiles if n not in skip and not os.path.exists(f'raw/ring/{n}.json')]
        if not left: break
        print(f'круг {rnd_ + 1}: осталось плиток {len(left)}', flush=True)
        for n, bb in left:
            els = fetch(query(bb, False), n, soft=True)
            if els is not None:
                json.dump(els, open(f'raw/ring/{n}.json', 'w'))
        time.sleep(20)
    left = [n for n, bb in tiles if n not in skip and not os.path.exists(f'raw/ring/{n}.json')]
    if left: raise SystemExit('FAIL плитки: ' + ','.join(left))
    for n, bb in tiles:
        if os.path.exists(f'raw/ring/{n}.json'):
            for e in json.load(open(f'raw/ring/{n}.json')):
                seen[(e['type'], e['id'])] = e
else:
  dy, dx = (N - S) / NY, (E - W) / NX
  for iy in range(NY):
    for ix in range(NX):
        bb = (S + iy * dy, W + ix * dx, S + (iy + 1) * dy, W + (ix + 1) * dx)
        for e in fetch(query(bb, False), f'{iy}{ix}'):
            seen[(e['type'], e['id'])] = e
for e in fetch(query((S, W, N, E), True), 'routes'):
    seen[(e['type'], e['id'])] = e
for e in fetch(query((S, W, N, E), 'extras'), 'extras'):
    seen[(e['type'], e['id'])] = e
json.dump({'elements': list(seen.values())}, open(OUT, 'w'))
print(f'OK: {len(seen)} элементов → {OUT}', flush=True)
