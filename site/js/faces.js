// Портреты жителей: один и тот же человек всегда с одним лицом.
// Компания за столом: общий кадр из фото тех, кто сидит рядом.
const FACE_BANDS={
  f:[
    ['gen-f1','gen-f2','gen-f3','gen-f5','gen-f8','gen-f9','gen-f10','gen-f11','gen-f12','gen-f13','gen-f14','gen-f15','gen-f20','gen-f21','gen-f22','gen-f23','gen-f24','gen-f25','f-23','f-27','color/aliya','color/diana','color/leisan','color/camilla','color/mila','color/sofa','color/yulduz','color/zaynab','core/alsu'],
    ['gen-f4','gen-f6','gen-f16','gen-f17','gen-f26','f-36','f-44','color/sufiya','color/veronika','core/gulnara','core/zulfiya'],
    ['f-58','f-70','gen-f7','gen-f18','gen-f19','gen-f27','core/fidania']
  ],
  m:[
    ['gen-m1','gen-m2','gen-m3','gen-m6','gen-m7','gen-m8','gen-m9','gen-m10','gen-m14','gen-m15','gen-m16','gen-m17','m-23','m-29','color/mark','color/timur','color/nail','color/gleb','core/ildar','core/lenar'],
    ['gen-m4','gen-m5','gen-m11','gen-m12','gen-m18','m-37','m-46','color/farhad','color/hakim','color/iskander','color/robert','core/rinat','taxi-driver'],
    ['gen-m13','gen-m19','m-60','m-72','color/edgar','color/pavel','core/marat']
  ]
};
const faceImg={};
function faceHash(s){let h=2166136261;s=String(s||'');for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
const FACE_TEENS={
  f:['teen-f1','teen-f2','teen-f3','teen-f4','teen-f5','teen-f6','teen-f7','teen-f8'],
  m:['teen-m1','teen-m2','teen-m3','teen-m4','teen-m5','teen-m6','teen-m7','teen-m8']
};
function faceBand(age){age=+age||30;return age<32?0:age<52?1:2;}
function npcFaceId(p){if(!p)return null;const g=p.female?'f':'m';
  const teen=/школь/.test(String(p.job||''));
  const band=teen?FACE_TEENS[g]:FACE_BANDS[g][faceBand(p.age)];
  return band[faceHash((p.name||'')+'|'+g)%band.length];}
const FACE_OLD=/fidania|\/f-58|\/f-70|gen-f7|gen-f18|gen-f19|gen-f27|\/pavel|\/edgar|\/marat|\/m-60|\/m-72|gen-m13|gen-m19/;
function faceTooOld(url,age){return (+age||30)<45&&FACE_OLD.test(String(url||''));}
function npcFaceUrl(p){if(!p)return null;const age=+p.age||30;
  if(typeof p.photo==='string'&&p.photo&&!faceTooOld(p.photo,age))return p.photo;
  if(typeof p.look==='string'&&p.look&&!faceTooOld(p.look,age))return p.look;
  const id=npcFaceId(p);return id?'img/faces/'+id+'.jpg':null;}
function npcFaceImg(p){if(p&&p.lookImg&&p.lookImg.width&&!faceTooOld(p.lookImg.src||p.photo||'',p.age))return p.lookImg;const id=npcFaceId(p);return id&&faceImg[id]||null;}
(function loadFaces(){const ids=[].concat(...FACE_BANDS.f,...FACE_BANDS.m,...FACE_TEENS.f,...FACE_TEENS.m);for(const id of ids){const im=new Image();im.onload=()=>{faceImg[id]=im;};im.src='img/faces/'+id+'.jpg';}})();
function paintNpcFace(p){const f=$('#npcFace');if(!f||!p)return;const url=npcFaceUrl(p);
  if(url){f.style.backgroundImage=`url("${url}")`;f.style.backgroundSize='cover';f.style.backgroundPosition='center 18%';f.style.backgroundColor='#24302a';f.textContent='';f.classList.add('photo');}
  else{f.style.backgroundImage='';f.style.background=p.clothes||'#2F9E6B';f.textContent=(p.name||'?')[0];f.classList.remove('photo');}}
let tableFrame=null,tableFrameKey='';
function tableMates(){if(scene!=='interior'||!interior||typeof peerRender==='undefined')return null;
  const name=String(interior.name||'').toLowerCase();
  if(!/cafe|bar|restaurant|tea/.test(interior.kind||'')&&!/бар|кафе|ресторан|чай/.test(name))return null;
  const mates=[{name:player.name||'Вы',img:player.avatarImg,key:'me:'+(player.avatarImg?'1':'0')}];
  for(const pr of peerRender.values()){if(typeof sharedPeerHere==='function'&&!sharedPeerHere(pr))continue;
    if(Math.hypot((pr.ix||0)-player.ix,(pr.iy||0)-player.iy)>3.2)continue;
    mates.push({name:pr.name||'друг',img:pr.img,key:(pr.key||pr.name)+':'+(pr.img?'1':'0')});}
  return mates.length>1?mates:null;}
function tableFrameCanvas(){const mates=tableMates();if(!mates){const had=tableFrame;tableFrame=null;tableFrameKey='';if(had&&!$('#chatModal').hidden&&typeof placeChatLook==='function')placeChatLook();return null;}
  const bg=typeof shotImg!=='undefined'&&typeof shotKind==='function'?shotImg[shotKind(interior)]:null;
  const key=(interior.key||interior.name)+'|'+mates.map(m=>m.key).join(',')+'|'+(bg&&bg.width?1:0);
  if(tableFrame&&tableFrameKey===key)return tableFrame;
  const c=document.createElement('canvas');c.width=960;c.height=540;const g=c.getContext('2d');
  if(bg&&bg.width){const s=Math.max(960/bg.width,540/bg.height),dw=bg.width*s,dh=bg.height*s;g.drawImage(bg,(960-dw)/2,(540-dh)/2,dw,dh);}
  else{g.fillStyle='#1a2420';g.fillRect(0,0,960,540);}
  g.fillStyle='rgba(8,12,10,.22)';g.fillRect(0,0,960,540);
  g.fillStyle='#5c3b28';g.beginPath();g.ellipse(480,448,320,58,0,0,Math.PI*2);g.fill();
  g.fillStyle='#8a6244';g.beginPath();g.ellipse(480,432,270,36,0,0,Math.PI*2);g.fill();
  const n=mates.length;
  mates.forEach((m,i)=>{const x=480+(i-(n-1)/2)*Math.min(168,860/n),y=248,r=70;
    g.save();g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.clip();
    if(m.img&&m.img.width)g.drawImage(m.img,x-r,y-r-8,r*2,r*2);
    else{g.fillStyle='#24483a';g.fillRect(x-r,y-r,r*2,r*2);g.fillStyle='#fff';g.font='700 42px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText((m.name||'?')[0],x,y);}
    g.restore();g.strokeStyle='#fff';g.lineWidth=4;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.stroke();
    g.font='600 22px "IBM Plex Sans",sans-serif';g.fillStyle='#fff';g.textAlign='center';g.shadowColor='rgba(0,0,0,.7)';g.shadowBlur=6;g.fillText(m.name,x,y+r+28);g.shadowBlur=0;});
  tableFrame=c;tableFrameKey=key;if(!$('#chatModal').hidden&&typeof placeChatLook==='function')placeChatLook();return c;}
function lookUrl(im){if(!im)return '';if(im.src)return im.src;if(!im._url)im._url=im.toDataURL('image/jpeg',0.72);return im._url;}
