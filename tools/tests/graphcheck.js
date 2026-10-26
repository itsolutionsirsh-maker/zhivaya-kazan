// Граф улиц: одинаковые ли ответы до и после переделки хранения. Работает с обеими версиями (старые массивы и новые типизированные).
// node graphcheck.js <dev> <port> <out.json>
const {chromium} = require('playwright');
const {spawn} = require('child_process');
const fs = require('fs');
const [DEV, PORT, OUT] = [process.argv[2], +process.argv[3] || 8861, process.argv[4]];
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {cwd: DEV, stdio: 'ignore'});
  await sleep(800);
  const b = await chromium.launch();
  const errors = [];
  try {
    const pg = await b.newPage({viewport: {width: 1200, height: 800}});
    pg.on('pageerror', e => errors.push(String(e)));
    await pg.goto(`http://127.0.0.1:${PORT}/index.html`);
    await pg.waitForFunction('document.querySelector("#loading").hidden === true', null, {timeout: 120000});
    await sleep(500);
    const res = await pg.evaluate(() => {
      let s = 12345; const rnd = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
      const W = world; const nb = (adj, i) => typeof adjList === 'function' ? adjList(adj, i) : adj[i];
      const has = (adj, i) => typeof hasAdj === 'function' ? hasAdj(adj, i) : adj[i].length > 0;
      const out = {N: W.N, roads: W.roads.length, ped: W.pedNodes.length, car: W.carNodes.length, edges: {}, has: {}};
      for (const [k, adj] of [['ped', W.pedAdj], ['car', W.carAdj], ['em', W.emAdj]]) {
        let e = 0, h = 0, sumL = 0; for (let i = 0; i < W.N; i++) { const l = nb(adj, i); e += l.length; for (const q of l) sumL += q[1]; if (has(adj, i)) h++; }
        out.edges[k] = [e, Math.round(sumL)]; out.has[k] = h; }
      const bb = W.bbox; const pt = () => [bb[0] + rnd() * (bb[2] - bb[0]), bb[1] + rnd() * (bb[3] - bb[1])];
      const P = W.nodes; const xy = i => i < 0 ? null : [Math.round(P[i][0] * 10), Math.round(P[i][1] * 10)];
      out.near = []; for (let k = 0; k < 400; k++) { const p = pt(); out.near.push([xy(nearestNode(p[0], p[1], W.pedAdj, 150)), xy(nearestNode(p[0], p[1], W.carAdj, 150)), xy(nearestNode(p[0], p[1], null, 60))]); }
      out.seg = []; for (let k = 0; k < 400; k++) { const p = pt(); const ns = nearestRoadSeg(p[0], p[1], 40); out.seg.push(ns ? [ns.seg.r.i, +ns.d.toFixed(3), +ns.px.toFixed(2), +ns.seg.L.toFixed(2), ns.seg.a, ns.seg.b] : null); }
      out.names = []; for (let k = 0; k < 200; k++) { const p = pt(); out.names.push(nearestRoadName(p[0], p[1])); }
      const cost = (adj, path, fn) => { let c = 0, L = 0; for (let i = 0; i < path.length - 1; i++) { const e = nb(adj, path[i]).filter(q => q[0] === path[i + 1]).reduce((m, q) => !m || q[1] * fn(W.roads[q[2]]) < m[1] * fn(W.roads[m[2]]) ? q : m, null); c += e[1] * fn(W.roads[e[2]]); L += e[1]; } return [+c.toFixed(1), +L.toFixed(1)]; };
      out.paths = [];
      for (const [k, adj, list, fn] of [['ped', W.pedAdj, W.pedNodes, pedCost], ['car', W.carAdj, W.carNodes, carCost], ['em', W.emAdj, W.carNodes, carCost]]) {
        for (let q = 0; q < 120; q++) { const a = list[Math.floor(rnd() * list.length)]; const p = P[a]; const r = 300 + rnd() * 2500, an = rnd() * 6.283;
          const g = nearestNode(p[0] + Math.cos(an) * r, p[1] + Math.sin(an) * r, adj, 300); if (g < 0) { out.paths.push([k, 'nogoal']); continue; }
          const t0 = performance.now(); const path = astar(adj, a, g, fn); const ms = performance.now() - t0;
          out.paths.push([k, path ? cost(adj, path, fn) : null, path ? path.length : 0]); out.ms = (out.ms || 0) + ms; } }
      out.ms = Math.round(out.ms);
      out.wps = []; for (let q = 0; q < 40; q++) { const a = W.pedNodes[Math.floor(rnd() * W.pedNodes.length)]; const p = P[a]; const g = nearestNode(p[0] + 400, p[1] + 200, W.pedAdj, 300); const path = astar(W.pedAdj, a, g, pedCost); const w = pathToWaypoints(path, W.pedAdj, 'ped'); out.wps.push(w.length ? [w.length, w[0].map(v => +v.toFixed(1)), w[w.length - 1].map(v => +v.toFixed(1))] : 0);
        const pc = astar(W.carAdj, nearestNode(p[0], p[1], W.carAdj, 200), nearestNode(p[0] + 600, p[1] - 300, W.carAdj, 300), carCost); const wc = pathToWaypoints(pc, W.carAdj, 'car'); out.wps.push(wc.length ? [wc.length, wc[0].map(v => +v.toFixed(1)), wc[wc.length - 1].map(v => +v.toFixed(1))] : 0); }
      return out;
    });
    res.heapMB = Math.round((await pg.evaluate('performance.memory?performance.memory.usedJSHeapSize:0')) / 1e6);
    fs.writeFileSync(OUT, JSON.stringify(res));
    console.log('N', res.N, 'roads', res.roads, 'ped', res.ped, 'car', res.car, 'edges', JSON.stringify(res.edges), 'has', JSON.stringify(res.has), 'astar ms', res.ms, 'heap', res.heapMB);
  } finally { await b.close(); srv.kill(); }
  console.log(errors.length ? errors.join('\n') : 'no page errors');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
