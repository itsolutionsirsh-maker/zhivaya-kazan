'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../../site/js/interior.js'),'utf8');
function setup(){
  const paths=[],calls=[];
  const ctx=new Proxy({},{get:(o,k)=>k in o?o[k]:(...args)=>calls.push([k,...args])});
  const s={ctx,Path2D:class{constructor(){paths.push(this);this.rects=[];}rect(...r){this.rects.push(r);}},lampSprite:{},makeLightSprites:()=>assert.fail('should reuse light sprite')};
  vm.createContext(s);vm.runInContext(source.slice(source.indexOf('const FLOORS='),source.indexOf('function renderInterior()')),s);
  return {s,paths,calls,run:c=>vm.runInContext(c,s)};
}
const room=()=>({floor:'wood',kind:'home',w:11,h:8,furn:[{t:'window',x:2.5,y:.15,w:2.5,h:.3}]});
test('same-sized rooms share floor geometry; changing size or material rebuilds it',()=>{
  const {s,paths}=setup(),it=room(),p=s.interiorFloorPath(it);
  assert.equal(s.interiorFloorPath({...it}),p);assert.equal(paths.length,1);
  assert.notEqual(s.interiorFloorPath({...it,w:12}),p);assert.notEqual(s.interiorFloorPath({...it,floor:'tiles'}),p);
});
test('floor cache is bounded while travelling between many rooms',()=>{
  const {s,run}=setup();for(let i=0;i<100;i++)s.interiorFloorPath({...room(),w:11+i*.01});
  assert.equal(run('interiorFloorPaths.size'),8);
});
test('warm floor renders reuse paths and do not mutate room, furniture or collision geometry',()=>{
  const {s,paths,calls}=setup(),it=room();Object.freeze(it.furn[0]);Object.freeze(it.furn);Object.freeze(it);
  const saved=JSON.stringify(it);s.drawInteriorFloor(it,0);calls.length=0;
  for(let i=0;i<60;i++)s.drawInteriorFloor(it,0);
  assert.equal(paths.length,1);assert.equal(JSON.stringify(it),saved);
  assert.ok(calls.filter(c=>c[0]==='fillRect').length<=60*4);
  assert.equal(calls.filter(c=>c[0]==='save').length,calls.filter(c=>c[0]==='restore').length);
});
test('window light is bounded and stays below furniture; night reuses one small light sprite',()=>{
  const {s,calls}=setup(),it=room();it.furn=Array.from({length:100},()=>({...it.furn[0]}));
  s.drawInteriorFloor(it,0);assert.equal(calls.filter(c=>c[0]==='moveTo').length,8);assert.equal(calls.filter(c=>c[0]==='drawImage').length,0);
  calls.length=0;s.drawInteriorFloor(it,1);assert.equal(calls.filter(c=>c[0]==='drawImage').length,1);
});
