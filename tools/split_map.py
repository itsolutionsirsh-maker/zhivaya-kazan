#!/usr/bin/env python3
"""Режет старую цельную карту центра (site/kazan.json) на base.json + c_<x>_<y>.json по правилам tools/build_city.py —
чтобы локально проверить подгрузку кварталов. Использование: split_map.py kazan.json outdir"""
import json, math, os, sys, collections, hashlib

src, dst = sys.argv[1], sys.argv[2]
d = json.load(open(src))
CH = 2000 * 10  # дециметры
ck = lambda x, y: (math.floor(x / CH), math.floor(y / CH))
base_road = lambda c: c <= 7 or c == 9
LANDMARK = {'police', 'hospital', 'museum', 'sight', 'theatre', 'university', 'worship', 'hotel', 'market', 'bank'}
nodes = d['nodes']
base_nodes = set(); road_chunk = []; node_chunks = collections.defaultdict(set)
for r in d['roads']:
    if base_road(r['c']):
        base_nodes.update(r['p']); road_chunk.append(None); continue
    k = ck(*nodes[r['p'][len(r['p']) // 2]]); road_chunk.append(k)
    for n in r['p']:
        node_chunks[n].add(k)
for n, ks in node_chunks.items():
    if len(ks) > 1:
        base_nodes.add(n)   # узел на стыке кусков — в base
base_list = sorted(base_nodes); base_idx = {n: i for i, n in enumerate(base_list)}
chunks = collections.defaultdict(lambda: {'nodes': [], 'roads': [], 'buildings': [], 'areas': [], 'pois': []})
local_idx = {}
base_roads = []
for r, k in zip(d['roads'], road_chunk):
    if k is None:
        rr = dict(r); rr['p'] = [base_idx[n] for n in r['p']]; base_roads.append(rr); continue
    c = chunks[k]; li = local_idx.setdefault(k, {}); pp = []
    for n in r['p']:
        if n in base_idx: pp.append(-base_idx[n] - 1)
        else:
            if n not in li: li[n] = len(c['nodes']); c['nodes'].append(nodes[n])
            pp.append(li[n])
    rr = dict(r); rr['p'] = pp; c['roads'].append(rr)
for b in d['buildings']:
    p = b['p']; n = len(p) // 2
    chunks[ck(sum(p[0::2]) / n, sum(p[1::2]) / n)]['buildings'].append(b)
base_areas = []
for a in d['areas']:
    p = a['p']; xs, ys = p[0::2], p[1::2]
    if a['k'] in ('water', 'forest') or (max(xs) - min(xs)) * (max(ys) - min(ys)) > 4e8:
        base_areas.append(a)
    else:
        chunks[ck((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2)]['areas'].append(a)
base_pois = []
for p in d['pois']:
    (base_pois if p['t'] in LANDMARK else chunks[ck(p['x'], p['y'])]['pois']).append(p)
os.makedirs(dst, exist_ok=True)
index = {}
for (cx, cy), c in sorted(chunks.items()):
    key = f'{cx}_{cy}'; txt = json.dumps(c, ensure_ascii=False, separators=(',', ':'))
    open(os.path.join(dst, f'c_{key}.json'), 'w').write(txt); index[key] = [len(c['buildings']), len(txt) // 1024]
meta = dict(d['meta']); meta.update({'chunk': CH, 'chunks': index, 'v': hashlib.sha1(json.dumps(index).encode()).hexdigest()[:10]})
out = {k: d[k] for k in d if k not in ('nodes', 'roads', 'buildings', 'areas', 'pois', 'meta')}
out.update({'meta': meta, 'nodes': [nodes[n] for n in base_list], 'roads': base_roads, 'buildings': [], 'areas': base_areas, 'pois': base_pois})
json.dump(out, open(os.path.join(dst, 'base.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
places = [[p['n'], p['t'], p['x'], p['y']] for c in chunks.values() for p in c['pois'] if p.get('n')]
json.dump(places, open(os.path.join(dst, 'places.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print('кусков', len(index), 'base', os.path.getsize(os.path.join(dst, 'base.json')) // 1024, 'КБ; самые тяжёлые:',
      sorted(index.items(), key=lambda kv: -kv[1][1])[:4])
