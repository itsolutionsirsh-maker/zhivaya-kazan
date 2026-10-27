const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const context=vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../../site/js/ui.js'),'utf8'),context);
const metrics=(...args)=>JSON.parse(JSON.stringify(context.uiViewportMetrics(...args)));
test('Telegram stable height anchors the HUD while the visual viewport fits the keyboard',()=>{
  assert.deepEqual(metrics(844,{height:520,offsetTop:12,scale:1},{viewportStableHeight:800},true),{stable:800,visible:520,top:12,keyboard:true});
});
test('ordinary browser and rotation use the current viewport',()=>{
  assert.deepEqual(metrics(390,{height:390,offsetTop:0,scale:1},null,false),{stable:390,visible:390,top:0,keyboard:false});
});
test('missing or invalid SDK height falls back to the browser',()=>{
  for(const value of [undefined,0,NaN,-1])assert.equal(metrics(640,null,{viewportStableHeight:value},false).stable,640);
});
test('a reduced viewport without text input is not treated as a keyboard',()=>{
  assert.equal(metrics(640,{height:400,scale:1},{viewportStableHeight:640},false).keyboard,false);
});
test('pinch zoom is not keyboard movement',()=>{
  assert.deepEqual(metrics(844,{height:422,offsetTop:20,scale:2},null,true),{stable:844,visible:844,top:0,keyboard:false});
});
test('only a deliberate downward drag closes a sheet',()=>{
  assert.equal(context.uiSwipeCloses(10,100),true);
  for(const [x,y] of [[0,30],[0,-100],[80,100],[40,72]])assert.equal(context.uiSwipeCloses(x,y),false);
});
test('rebuilding the feed does not restart the event lifetime',()=>{
  assert.equal(context.uiFeedRemaining(1000,1000),5500);
  assert.equal(context.uiFeedRemaining(1000,6000),500);
  assert.equal(context.uiFeedRemaining(1000,6500),0);
  assert.equal(context.uiFeedRemaining(1000,9000),0);
});
