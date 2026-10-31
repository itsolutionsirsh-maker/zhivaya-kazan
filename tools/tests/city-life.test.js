const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('fs'),os=require('os'),path=require('path');
const {skySlot}=require('../../site/js/sky-slot.js');
const {Benches}=require('../../server/node/benches.js');

test('дождь и снег одни на всех при тех же часах',()=>{
  assert.equal(skySlot(1000,7),skySlot(1000,7));
  assert.notEqual(skySlot(0,1),'rain');
  const winter=new Set();
  for(let s=0;s<40;s++)winter.add(skySlot(s*150,1));
  assert.equal(winter.has('snow'),true);
  const summer=new Set();
  for(let s=0;s<40;s++)summer.add(skySlot(s*150,7));
  assert.equal(summer.has('rain'),true);
  assert.equal(summer.has('snow'),false);
});
test('записка на лавочке видна другим и не двоится',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bench-'));
  const file=path.join(dir,'b.json');
  let t=1e12;
  const b=Benches({fs,file,now:()=>t,bad:s=>/дурак/i.test(s)});
  assert.equal(b.put('a','Ильдар','b:10:20','коротко').ok,1);
  assert.equal(b.put('a','Ильдар','b:10:20','ещё раз').err,'rate');
  t+=100e3;
  assert.equal(b.put('a','Ильдар','b:10:20','дурак').err,'mod');
  const put=b.put('b','Алсу','b:10:20','кефир в пакете');
  assert.equal(put.ok,1);
  assert.deepEqual(b.list(['b:10:20','нет']).map(n=>n.text),['кефир в пакете']);
  const again=Benches({fs,file,now:()=>t,bad:()=>false});
  assert.equal(again.list(['b:10:20'])[0].name,'Алсу');
});
