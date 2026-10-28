'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'../..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
function setup(){
  const created=[],calls=[];
  const context=()=>new Proxy({},{get(o,k){
    if(k in o)return o[k];
    if(k==='createLinearGradient'||k==='createRadialGradient')return ()=>({addColorStop(){}});
    return (...args)=>{assert.ok(args.filter(a=>typeof a==='number').every(Number.isFinite),k+' must be finite');calls.push([k,...args]);};
  }});
  const s={ctx:context(),DPR:2,Math,rrect(c,x,y,w,h,r){assert.ok(w>=0&&h>=0&&r>=0);c.rect(x,y,w,h);},
    seeded:()=>()=>.4,hashStr:()=>123,makePersona:()=>({memory:[]}),pick:a=>a[0],
    document:{createElement(tag){assert.equal(tag,'canvas');const c={getContext:()=>context()};created.push(c);return c;}}};
  vm.createContext(s);const interior=read('site/js/interior.js');vm.runInContext(interior.slice(0,interior.indexOf('function enterInterior(')),s);
  vm.runInContext(read('site/js/interior-look.js'),s);
  return {s,created,calls,run:code=>vm.runInContext(code,s)};
}
test('all generated venue types draw finite geometry without mutating rooms or furniture',()=>{
  const {s,run}=setup();const kinds=run('Object.keys(KIND_RU)');
  for(const kind of kinds){const it=s.makeInterior(kind,'Заведение',kind),before=JSON.stringify(it);for(const f of it.furn)Object.freeze(f);Object.freeze(it.furn);Object.freeze(it);
    assert.equal(s.drawVenueLayer(it,46),true);assert.equal(JSON.stringify(it),before,kind);
  }
});
test('warm frames reuse one layer; table orders, occupancy, furniture and viewport invalidate it',()=>{
  const {s,created}=setup(),it=s.makeInterior('cafe','Тюбетей','cafe');s.drawVenueLayer(it,20);
  for(let i=0;i<120;i++)s.drawVenueLayer(it,20);assert.equal(created.length,1);
  const table=it.furn.find(f=>f.t==='table');table.taken=!table.taken;s.drawVenueLayer(it,20);assert.equal(created.length,2);
  table.ordered='Чай';s.drawVenueLayer(it,20);assert.equal(created.length,3);
  table.x+=.1;s.drawVenueLayer(it,20);assert.equal(created.length,4);
  it.furn.push({...table,x:5});s.drawVenueLayer(it,20);assert.equal(created.length,5);
  s.DPR=1;s.drawVenueLayer(it,20);assert.equal(created.length,6);s.drawVenueLayer(it,22);assert.equal(created.length,7);
});
test('travelling retains only the current layer and caps its pixel allocation',()=>{
  const {s,run,created}=setup();let current;
  for(let i=0;i<30;i++){current=s.makeInterior('theatre','Зал '+i,'theatre'+i);s.drawVenueLayer(current,200);}
  assert.equal(run('venueLayer.it'),current);assert.equal(run('venueLayer.canvas'),created.at(-1));
  assert.ok(created.every(c=>c.width<=1536&&c.height<=1536));
});
test('walking NPCs, clock and owned furniture contents do not rebuild static furniture',()=>{
  const {s,created}=setup(),it=s.makeInterior('home','Квартира','home');it.furn[0].own='custom-bed';s.drawVenueLayer(it,20);
  for(let i=0;i<60;i++){it.npcs.push({x:i,y:1});it.furn[0].color=i%2?'red':'blue';s.drawVenueLayer(it,20);}
  assert.equal(created.length,1);
  it.furn[0].own=null;s.drawVenueLayer(it,20);assert.equal(created.length,2);
});
test('named food profiles do not affect unrelated venues; homes keep housing floor materials',()=>{
  const {s}=setup();assert.equal(s.venueStyleId({kind:'cafe',name:'Тюбетей'}),'tatar');assert.equal(s.venueStyleId({kind:'cafe',name:'Пекарня'}),'bakery');
  assert.equal(s.venueStyleId({kind:'shop',name:'Тюбетей'}),'retail');assert.equal(s.venueStyleId({kind:'worship',name:'Кул-Шариф'}),'mosque');
  assert.equal(s.venueStyleId({kind:'worship',name:'Благовещенский собор'}),'worship');assert.equal(s.venueLook({kind:'home'}).floor,undefined);
});
test('cached home furnishings keep rugs below sofas, and skip owned furniture and animated TV',()=>{
  const {s,run}=setup(),it=s.makeInterior('home','Квартира','home'),order=[];
  s.drawVenueFurniture=(c,f)=>order.push(f.t);it.furn.find(f=>f.t==='bed').own='bed';s.drawVenueLayer(it,20);
  assert.ok(order.indexOf('rug')<order.indexOf('sofa'));assert.ok(order.includes('rug'));assert.ok(!order.includes('bed'));assert.ok(!order.includes('tv'));
  assert.equal(run('VENUE_FURNITURE.has("tv")'),false);
});

test('only story:ward receives beds, spawn, drip and doctor; its static layer is reused',()=>{
  const {s,created}=setup(),ward=s.makeInterior('hospital','Палата','story:ward'),ordinary=s.makeInterior('hospital','Больница','hospital');
  assert.equal(s.venueStyleId(ward),'ward');assert.equal(s.venueStyleId(ordinary),'pharmacy');assert.equal(ordinary.spawn,undefined);
  assert.equal(ward.furn.filter(f=>f.t==='bed').length,3);assert.equal(ward.furn.filter(f=>f.t==='wardCabinet').length,3);
  assert.ok(ward.furn.some(f=>f.t==='drip'));assert.ok(ward.furn.some(f=>f.t==='window'));assert.ok(ward.npcs.some(n=>n.p.job==='врач'&&n.y>7));
  assert.ok(ward.furn.some(f=>f.t==='bed'&&f.walkable&&f.x===ward.spawn.x&&f.y===ward.spawn.y));
  const before=JSON.stringify(ward);for(let i=0;i<120;i++)assert.equal(s.drawVenueLayer(ward,30),true);
  assert.equal(created.length,1);assert.equal(JSON.stringify(ward),before);
});
