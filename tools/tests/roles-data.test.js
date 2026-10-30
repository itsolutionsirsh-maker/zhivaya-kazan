// node --test tools/tests/roles-data.test.js
// Строки ролей между игроками (site/js/roles.js, данные второго программиста): их говорят вслух сами игроки,
// поэтому — коротко, на «вы», без цен и сумм (цену показывает игра), без названий улиц (их подставляет игра).
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path');
const w={};new Function('window',fs.readFileSync(path.join(__dirname,'../../site/js/roles.js'),'utf8'))(w);
const R=w.cityRoles,byId=id=>R.find(r=>r.id===id);
const STREET=/(улиц|проспект|бауман|пушкин|кремлёвск|петербургск|ямашев|победы|чистопольск|декабрист)/i;
const MONEY=/(\d|₽|руб)/i;
const ONE_GENDER=/(^|[^а-яё])(опоздал|пришёл|пришла|сел|села|забыл|забыла|устал|устала)([^а-яё]|$)/i;   // \b в JS не видит кириллицу

test('таксист: все наборы на месте и в нужном количестве',()=>{
  const t=byId('taxi');assert.ok(t,'нет роли taxi');
  const need={offer:[5,6],board:[5,6],lines:[10,15],arrive:[4,5],thanks:[4,5],cancel:[3,4]};
  for(const [k,[a,b]] of Object.entries(need)){assert.ok(Array.isArray(t[k]),'нет '+k);assert.ok(t[k].length>=a&&t[k].length<=b,k+': '+t[k].length);}
});

test('строки таксиста: до 90 знаков, без цен, улиц и угадывания пола',()=>{
  const t=byId('taxi');
  for(const k of ['offer','board','lines','arrive','thanks','cancel'])for(const s of t[k]){
    assert.ok(typeof s==='string'&&s.trim()===s&&s.length>0,k+': пустая или с пробелами');
    assert.ok(s.length<=90,k+': длиннее 90 — '+s);
    assert.ok(!MONEY.test(s),k+': цена или цифра — '+s);
    assert.ok(!STREET.test(s),k+': улица — '+s);
    assert.ok(!ONE_GENDER.test(s),k+': пол в прошедшем времени — '+s);
  }
  const all=['offer','board','lines','arrive','thanks','cancel'].flatMap(k=>t[k]);
  assert.equal(new Set(all).size,all.length,'повторы строк');
});

test('цена такси — вилка 80–400',()=>{
  const a=byId('taxi').actions.find(x=>x.id==='offer');assert.deepEqual(a.price,{min:80,max:400});
});
