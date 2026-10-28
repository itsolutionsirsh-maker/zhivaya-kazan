'use strict';
// ===== Утилиты =====
const $=s=>document.querySelector(s);
const rnd=(a,b)=>a+Math.random()*(b-a);
const pick=a=>a[Math.floor(Math.random()*a.length)];
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const dist=(ax,ay,bx,by)=>Math.hypot(ax-bx,ay-by);
const lerp=(a,b,t)=>a+(b-a)*t;
const TAU=Math.PI*2;
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
function seeded(seed){let s=(seed>>>0)||123456789;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function angDiff(a,b){let d=b-a;while(d>Math.PI)d-=TAU;while(d<-Math.PI)d+=TAU;return d;}
function fmtMoney(v){return Math.round(v).toLocaleString('ru-RU')+' ₽';}

// постоянный ключ места (кафе, работа, отдел полиции): по координатам — номер p.i зависит от порядка загрузки кварталов и после перезагрузки другой
// название в кавычках: «Кафе» — но не «Кафе «Пеликан»» (у некоторых названий кавычки уже внутри)
function qName(n){n=String(n||'');return /[«"]/.test(n)?n:`«${n}»`;}
function poiKey(p){return 'p'+Math.round(p.x)+'_'+Math.round(p.y);}
class Grid{
  constructor(cell){this.cell=cell;this.m=new Map();}
  key(cx,cy){return (cx+8192)*16384+(cy+8192);}
  add(item,x0,y0,x1,y1){const c=this.cell;for(let cx=Math.floor(x0/c);cx<=Math.floor(x1/c);cx++)for(let cy=Math.floor(y0/c);cy<=Math.floor(y1/c);cy++){const k=this.key(cx,cy);let a=this.m.get(k);if(!a){a=[];this.m.set(k,a);}a.push(item);}}
  remove(item,x0,y0,x1,y1){const c=this.cell;for(let cx=Math.floor(x0/c);cx<=Math.floor(x1/c);cx++)for(let cy=Math.floor(y0/c);cy<=Math.floor(y1/c);cy++){const k=this.key(cx,cy);const a=this.m.get(k);if(!a)continue;const i=a.indexOf(item);if(i>=0){a.splice(i,1);if(!a.length)this.m.delete(k);}}}
  query(x0,y0,x1,y1,cb){const c=this.cell,seen=new Set();for(let cx=Math.floor(x0/c);cx<=Math.floor(x1/c);cx++)for(let cy=Math.floor(y0/c);cy<=Math.floor(y1/c);cy++){const a=this.m.get(this.key(cx,cy));if(!a)continue;for(const it of a){if(seen.has(it))continue;seen.add(it);if(cb(it)===false)return;}}}
}
class Heap{
  constructor(){this.a=[];}
  push(f,v){const a=this.a;a.push([f,v]);let i=a.length-1;while(i>0){const p=(i-1)>>1;if(a[p][0]<=a[i][0])break;[a[p],a[i]]=[a[i],a[p]];i=p;}}
  pop(){const a=this.a;const top=a[0];const last=a.pop();if(a.length){a[0]=last;let i=0;for(;;){const l=2*i+1,r=l+1;let m=i;if(l<a.length&&a[l][0]<a[m][0])m=l;if(r<a.length&&a[r][0]<a[m][0])m=r;if(m===i)break;[a[m],a[i]]=[a[i],a[m]];i=m;}}return top;}
  get size(){return this.a.length;}
}
function pointInPoly(p,x,y){let inside=false;const n=p.length;for(let i=0,j=n-2;i<n;j=i,i+=2){const xi=p[i],yi=p[i+1],xj=p[j],yj=p[j+1];if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))inside=!inside;}return inside;}
function polyArea(p){let s=0;const n=p.length;for(let i=0;i<n;i+=2){const j=(i+2)%n;s+=p[i]*p[j+1]-p[j]*p[i+1];}return s/2;}
const colorCache=new Map();
function shade(hex,k){const key=hex+'|'+Math.round(k*50);let v=colorCache.get(key);if(v)return v;const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);v=`rgb(${clamp(Math.round(r*k),0,255)},${clamp(Math.round(g*k),0,255)},${clamp(Math.round(b*k),0,255)})`;colorCache.set(key,v);return v;}
function rrect(c,x,y,w,h,r){c.beginPath();if(c.roundRect)c.roundRect(x,y,w,h,r);else c.rect(x,y,w,h);}
