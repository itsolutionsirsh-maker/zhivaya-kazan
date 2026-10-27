// Оформление существующей мебели, без новых препятствий и действий.
// Казанские референсы и границы сходства: docs/INTERIOR-REFERENCES.md.
const VENUE_STYLES={
  coffee:{wall:'#D6C9B6',trim:'#514E44',counter:'#687C67',top:'#DCC7A6',wood:'#A88055',seat:'#687C67',accent:'#8C4E31',floor:['#C5AE8A','#B8A07D'],motif:'slats'},
  tatar:{wall:'#E6D9BE',trim:'#356955',counter:'#386A58',top:'#D5B384',wood:'#BE955F',seat:'#729884',accent:'#BC7646',floor:['#D6C19C','#C8B28D'],motif:'tulip'},
  bakery:{wall:'#EFE0C8',trim:'#9C7151',counter:'#A26D4D',top:'#EAD9BD',wood:'#C39969',seat:'#B99572',accent:'#B7653D',floor:['#DFCEB2','#D1BFA4'],motif:'tile'},
  bar:{wall:'#66514A',trim:'#3E4544',counter:'#4A5551',top:'#9B7954',wood:'#795A3E',seat:'#784C3E',accent:'#C6A468',floor:['#706051','#635447'],motif:'brick'},
  retail:{wall:'#E1E5DA',trim:'#527567',counter:'#486F60',top:'#DFDFD3',wood:'#B09B79',seat:'#60766C',accent:'#B96947',floor:['#D4D5C8','#C4C8BC'],motif:'tile'},
  pharmacy:{wall:'#E4EEEA',trim:'#4F8B83',counter:'#76A79B',top:'#F2F3E7',wood:'#CBD6CD',seat:'#71A59D',accent:'#397D75',floor:['#E3E6DE','#D5DFD8'],motif:'tile'},
  market:{wall:'#D4C3A4',trim:'#7D654B',counter:'#8C7151',top:'#D5BA8A',wood:'#9E7B4E',seat:'#757750',accent:'#50755A',floor:['#C7BEA9','#BBB19A'],motif:'brick'},
  hotel:{wall:'#E4DCCC',trim:'#8B795E',counter:'#777870',top:'#E7DCC6',wood:'#A78C66',seat:'#92958D',accent:'#BFA46C',floor:['#DED8C9','#CEC7B7'],motif:'panels'},
  museum:{wall:'#E3DFD1',trim:'#988C71',counter:'#7B786F',top:'#D7D2C4',wood:'#88744F',seat:'#7F8A85',accent:'#AA8B50',floor:['#DBD7CA','#CBC7BC'],motif:'panels'},
  office:{wall:'#DCE1DC',trim:'#687F7C',counter:'#6E8079',top:'#D7CCB4',wood:'#BAA783',seat:'#4F6865',accent:'#587C75',motif:'panels'},
  theatre:{wall:'#946A5E',trim:'#715A43',counter:'#6E5140',top:'#AD8B64',wood:'#997650',seat:'#9C4042',accent:'#D3AF65',floor:['#6C5146','#60463C'],motif:'panels'},
  home:{wall:'#E6D9C5',trim:'#8B6851',counter:'#B69A76',top:'#E6DCC9',wood:'#B38B61',seat:'#688080',accent:'#AD7954',motif:'panels'},
  mosque:{wall:'#E7E3D2',trim:'#658C87',counter:'#77918C',top:'#E7D9AB',wood:'#D3BB8D',seat:'#558A82',accent:'#B89B62',floor:['#648D83','#578075'],motif:'arch'},
  worship:{wall:'#E2D6BC',trim:'#8D7D58',counter:'#A78D58',top:'#E6D5A8',wood:'#9C7B4D',seat:'#8D6E48',accent:'#BC9B52',motif:'arch'},
  metro:{wall:'#D1DAD5',trim:'#6E8B7C',counter:'#678777',top:'#D9DCD1',wood:'#9A9A87',seat:'#7A9383',accent:'#BDAB76',motif:'tile'}
};
function venueStyleId(it){
  const k=it.kind,n=String(it.name||'').toLowerCase();
  if(k==='cafe'){
    if(/т[юүу]бет[еэ]й|tubat[aä]y|tubetey|кыстыбый|дом чая|ашхан/.test(n))return 'tatar';
    if(/пекар|добропек|жар.?свежар|булоч|кондитер|cinnabon/.test(n))return 'bakery';
    return 'coffee';
  }
  if(k==='worship'&&/мечет|кул.?шариф|нур[уы]лла|апанаев|галеев|закабан|иске таш/.test(n))return 'mosque';
  return ({shop:'retail',bank:'office',hospital:'pharmacy',university:'office',school:'office',library:'coffee',police:'office',prosecutor:'office',default:'office'})[k]||(VENUE_STYLES[k]?k:'office');
}
function venueLook(it){return VENUE_STYLES[venueStyleId(it)];}
const VENUE_FURNITURE=new Set(['table','chair','counter','machine','board','shelf','desk','stage','seat','painting','pedestal','sofa','bed','wardrobe','kitchen','fridge','plant','atm','pew','altar','printer','rug']);
// Один слой только для текущей комнаты. Картинки не входят в сохранения.
// Максимум 1536×1536 RGBA (9 MiB), обычный телефон ~700×550.
let venueLayer=null;
const VENUE_FIELDS=['t','x','y','w','h','ang','goods','horiz','c','row','spot'];
function venueLayerMatches(layer,it,scale){
  if(!layer||layer.it!==it||layer.scale!==scale||layer.kind!==it.kind||layer.name!==it.name||layer.w!==it.w||layer.h!==it.h||layer.floor!==it.floor||layer.furniture.length!==it.furn.length)return false;
  for(let i=0;i<it.furn.length;i++){const f=it.furn[i],old=layer.furniture[i];
    if(old.own!==!!f.own||old.taken!==!!f.taken||old.ordered!==!!f.ordered)return false;
    for(const field of VENUE_FIELDS)if(old[field]!==f[field])return false;
  }return true;
}
function drawVenueLayer(it,iz){
  const scale=Math.min(iz*DPR,72,1536/(it.w+1),1536/(it.h+2));
  if(!venueLayerMatches(venueLayer,it,scale)){
    const canvas=document.createElement('canvas');canvas.width=Math.ceil((it.w+1)*scale);canvas.height=Math.ceil((it.h+2)*scale);
    const c=canvas.getContext('2d');if(!c)return false;
    c.setTransform(scale,0,0,scale,.5*scale,1.5*scale);
    const look=venueLook(it);drawVenueArchitecture(c,it,look);
    // Собственная мебель и экраны рисуются живыми в interior.js.
    for(const f of it.furn)if(!f.own&&VENUE_FURNITURE.has(f.t))drawVenueFurniture(c,f,it,look);
    const furniture=it.furn.map(f=>{const old={own:!!f.own,taken:!!f.taken,ordered:!!f.ordered};for(const field of VENUE_FIELDS)old[field]=f[field];return old;});
    venueLayer={it,canvas,scale,kind:it.kind,name:it.name,w:it.w,h:it.h,floor:it.floor,furniture};
  }
  ctx.drawImage(venueLayer.canvas,-.5,-1.5,venueLayer.canvas.width/scale,venueLayer.canvas.height/scale);return true;
}
function venueBox(c,x,y,w,h,color,r=0){c.fillStyle=color;if(r){rrect(c,x,y,w,h,r);c.fill();}else c.fillRect(x,y,w,h);}
function venueDot(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
function venueLine(c,points,color,width=.035){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(...points[0]);for(let i=1;i<points.length;i++)c.lineTo(...points[i]);c.stroke();}
function venueText(c,text,x,y,size,color,maxWidth){c.fillStyle=color;c.font=`600 ${size}px system-ui,sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText(text,x,y,maxWidth);}
function venueTulip(c,x,y,s,color){
  c.strokeStyle=color;c.lineWidth=.045*s;c.beginPath();c.moveTo(x,y+.2*s);c.lineTo(x,y-.05*s);c.moveTo(x,y+.14*s);c.quadraticCurveTo(x-.25*s,y+.1*s,x-.2*s,y-.04*s);c.moveTo(x,y+.1*s);c.quadraticCurveTo(x+.25*s,y+.06*s,x+.2*s,y-.08*s);c.stroke();
  c.fillStyle=color;c.beginPath();c.moveTo(x,y-.05*s);c.bezierCurveTo(x-.25*s,y-.08*s,x-.19*s,y-.28*s,x-.17*s,y-.3*s);c.lineTo(x,y-.2*s);c.lineTo(x+.17*s,y-.3*s);c.bezierCurveTo(x+.19*s,y-.28*s,x+.25*s,y-.08*s,x,y-.05*s);c.fill();
}
function drawVenueArchitecture(c,it,p){
  const w=it.w,h=it.h,k=it.kind,id=venueStyleId(it);
  // Приподнятая задняя стена за игровой границей; не закрывает выход.
  const grad=c.createLinearGradient(0,-1.2,0,0);grad.addColorStop(0,p.wall);grad.addColorStop(1,p.top);
  venueBox(c,-.2,-1.2,w+.4,1.25,grad);venueBox(c,-.2,-1.24,w+.4,.08,p.trim);
  venueBox(c,0,-.18,w,.18,p.trim);venueBox(c,0,0,w,.15,'rgba(32,29,23,.18)');
  c.save();c.beginPath();c.rect(0,-1.15,w,.94);c.clip();
  if(p.motif==='brick'||p.motif==='tile'){
    c.strokeStyle=p.motif==='brick'?'#8B7665':'rgba(110,111,95,.25)';c.lineWidth=.025;c.beginPath();
    for(let j=0;j<3;j++){const y=-1.15+j*.32;c.moveTo(0,y);c.lineTo(w,y);for(let x=j%2*.4;x<w;x+=.8){c.moveTo(x,y);c.lineTo(x,y+.32);}}c.stroke();
  }else if(p.motif==='tulip'){for(let x=.6;x<w;x+=1.1)venueTulip(c,x,-.62,.8,p.trim);}
  else if(p.motif==='arch'){
    c.strokeStyle=p.accent;c.lineWidth=.055;c.beginPath();for(let x=1;x<w;x+=2){c.moveTo(x-.65,-.2);c.lineTo(x-.65,-.65);c.quadraticCurveTo(x-.65,-.95,x,-1.1);c.quadraticCurveTo(x+.65,-.95,x+.65,-.65);c.lineTo(x+.65,-.2);}c.stroke();
  }else{c.strokeStyle=p.trim;c.lineWidth=.025;c.beginPath();for(let x=.25;x<w;x+=p.motif==='slats'?.18:1.3){c.moveTo(x,-1.15);c.lineTo(x,-.2);}c.stroke();}
  c.restore();
  // Настенные бра; световой ореол остаётся на стене, ниже нет ложных препятствий.
  for(const x of [w*.12,w*.88]){const g=c.createRadialGradient(x,-.7,.02,x,-.7,.55);g.addColorStop(0,'rgba(255,236,171,.65)');g.addColorStop(1,'rgba(255,236,171,0)');venueBox(c,x-.55,-1.22,1.1,1.04,g);venueBox(c,x-.07,-.87,.14,.36,p.accent,.04);venueDot(c,x,-.72,.08,'#FFF2CC');}
  const sign=({cafe:id==='tatar'?'ЧАЙ · ВЫПЕЧКА':id==='bakery'?'СВЕЖАЯ ВЫПЕЧКА':'КОФЕ · ДЕСЕРТЫ',bar:'БАР · КУХНЯ',shop:'ПРОДУКТЫ',pharmacy:'АПТЕКА',market:'РЫНОК',bank:'ОБСЛУЖИВАНИЕ',hotel:'РЕГИСТРАЦИЯ',hospital:'РЕГИСТРАТУРА',museum:'ЭКСПОЗИЦИЯ',library:'ЧИТАЛЬНЫЙ ЗАЛ',school:'КЛАСС',university:'АУДИТОРИЯ',police:'ДЕЖУРНАЯ ЧАСТЬ',prosecutor:'ПРИЁМНАЯ',office:'ОФИС'})[k];
  if(sign){const sw=Math.min(w*.55,7.5);venueBox(c,w/2-sw/2,-.98,sw,.57,p.trim,.07);venueText(c,sign,w/2,-.68,.24,'#F7EEDC',sw-.3);}
  if(k==='hotel'||k==='library'){
    venueBox(c,w*.25,h*.3,w*.5,h*.48,k==='hotel'?'#B3AA95':'#A7987E',.12);
    c.strokeStyle=p.accent;c.lineWidth=.07;c.strokeRect(w*.25+.12,h*.3+.12,w*.5-.24,h*.48-.24);
  }
  if(k==='market'){for(let x=.35;x<w-.35;x+=1)venueBox(c,x,.22,.72,.28,Math.floor(x)%2?p.accent:'#F0D7AD');}
  if(k==='shop'||k==='pharmacy'||k==='bank'||k==='hospital'){
    venueBox(c,w*.42,h-1.4,w*.16,.45,p.trim,.04);venueText(c,'ВХОД',w*.5,h-1.17,.2,'#F3F3E5',w*.15);
  }
}
function venueTop(c,f,p,color){
  const x=f.x-f.w/2,y=f.y-f.h/2;
  venueBox(c,x+.07,y+.12,f.w,f.h,'rgba(38,31,22,.2)',.06);
  venueBox(c,x,y,f.w,f.h,p.trim,.06);venueBox(c,x+.035,y+.025,f.w-.07,Math.max(.08,f.h-.17),color||p.wood,.05);
  venueBox(c,x+.07,y+.055,f.w-.14,.025,'rgba(255,255,240,.35)');
}
function venueCup(c,x,y,r=.12){venueDot(c,x,y,r*1.28,'#F3ECDD');venueDot(c,x+r*.9,y,r*.4,'#E5DCCC');venueDot(c,x,y,r*.76,'#68482C');venueDot(c,x-.02,y-.02,r*.25,'#C39B68');}
function venuePastry(c,x,y,r=.14){c.fillStyle='#D9954D';c.beginPath();c.moveTo(x,y-r);c.lineTo(x+r,y+r*.7);c.lineTo(x-r,y+r*.7);c.closePath();c.fill();venueDot(c,x,y,.025,'#8B562E');}
function drawVenueFurniture(c,f,it,p){
  const x=f.x-f.w/2,y=f.y-f.h/2,k=it.kind,id=venueStyleId(it),tau=Math.PI*2;
  switch(f.t){
    case 'table':{
      venueDot(c,f.x+.07,f.y+.1,f.w/2,'rgba(37,27,18,.2)');venueDot(c,f.x,f.y,f.w/2,p.trim);venueDot(c,f.x,f.y-.035,f.w/2-.045,p.wood);
      c.strokeStyle='rgba(255,240,205,.28)';c.lineWidth=.025;c.beginPath();c.arc(f.x,f.y-.03,f.w/2-.09,Math.PI,Math.PI*1.85);c.stroke();
      if(id==='tatar'){venueBox(c,f.x-.15,y+.05,.3,f.h-.12,'#E7DDC5',.03);venueTulip(c,f.x,f.y,.42,p.trim);}
      if(f.taken||f.ordered){for(const dx of [-.3,.3]){venueDot(c,f.x+dx,f.y,.19,'#F5ECDB');venuePastry(c,f.x+dx,f.y,.12);}venueCup(c,f.x,f.y-.3,.09);}
      else{venueBox(c,f.x+.17,f.y-.19,.16,.26,'#E4D9BF',.01);venueLine(c,[[f.x+.2,f.y-.1],[f.x+.29,f.y-.1]],p.trim,.025);venueDot(c,f.x-.12,f.y,.08,p.trim);venueDot(c,f.x-.13,f.y-.04,.06,'#C2D09D');}break;
    }
    case 'chair':case 'seat':{
      c.save();c.translate(f.x,f.y);c.rotate(f.t==='seat'?-Math.PI/2:f.ang||0);const s=f.t==='seat'?.62:.48;
      venueBox(c,-s/2+.04,-s/2+.07,s,s,'rgba(30,24,18,.2)',.08);venueBox(c,-s/2,-s/2,s,s,p.trim,.08);venueBox(c,-s/2+.07,-s/2+.04,s-.1,s-.08,p.seat,.07);venueBox(c,-s/2-.035,-s/2-.025,.1,s+.05,p.wood,.035);c.restore();break;
    }
    case 'counter':{
      venueTop(c,f,p,p.top);c.strokeStyle=p.trim;c.lineWidth=.035;c.beginPath();for(let u=x+.2;u<x+f.w-.12;u+=.26){c.moveTo(u,y+f.h-.18);c.lineTo(u,y+f.h-.04);}c.stroke();
      if(k==='cafe'){
        // Стеклянная витрина, подносы с выпечкой, касса; внутри старой стойки.
        const cw=Math.min(3.4,f.w*.32);venueBox(c,x+.22,y+.08,cw,f.h-.36,'#88A6A0',.04);venueBox(c,x+.29,y+.13,cw-.14,f.h-.49,'#D9C8A5');
        for(let i=0;i<4;i++){const a=x+.6+i*(cw-.65)/4;venueDot(c,a,y+.4,.16,'#F4E9D0');venuePastry(c,a,y+.4,.13);}
        venueLine(c,[[x+.25,y+.12],[x+cw+.15,y+.12],[x+cw+.15,y+f.h-.32]],'#E7F1E7',.045);
        venueLine(c,[[x+.4,y+.17],[x+.75,y+f.h-.42]],'rgba(255,255,255,.65)',.06);
        for(let i=0;i<3;i++)venueCup(c,f.x-1+i*.42,y+.35,.12);
      }else if(k==='bar'){
        venueBox(c,x+.25,y+.13,2.5,.55,'#465E57',.06);
        for(let i=0;i<3;i++){const a=x+.65+i*.68;venueDot(c,a,y+.39,.14,'#C4C4A5');venueDot(c,a,y+.39,.1,['#D5A34B','#A8B86C','#B97658'][i]);}
        venueBox(c,f.x-.6,y+.17,.7,.48,'#56534A',.04);venueDot(c,f.x-.29,y+.4,.16,'#E1BE5B');venueLine(c,[[f.x-.29,y+.27],[f.x-.29,y+.53]],'#F1D37F',.03);
        venueBox(c,f.x+.45,y+.18,.22,.39,'#BAC9C2',.06);venueBox(c,f.x+.48,y+.13,.16,.12,'#E5E8DB',.03);
      }
      const px=x+f.w-.9;venueBox(c,px,y+.12,.55,.32,'#303F3D',.03);venueBox(c,px+.06,y+.15,.42,.17,'#93BBB1',.015);venueBox(c,px+.04,y+.47,.46,.15,'#4B514C',.02);
      if(k==='bank'){venueLine(c,[[x+.1,y+.08],[x+f.w-.1,y+.08]],'#83B8B5',.06);venueBox(c,x+.24,y+.2,.5,.38,'#EEE7D8');venueText(c,'01',f.x,y+.23,.19,p.trim,.5);}
      if(k==='hotel'){venueDot(c,f.x+.35,y+.39,.12,'#C9B078');venueDot(c,f.x+.35,y+.36,.065,'#F4DAA2');venueBox(c,f.x-.75,y+.22,.55,.35,'#F1E7D6');}
      if(k==='hospital')venueText(c,'+',f.x,y+.36,.46,p.accent,1);
      break;
    }
    case 'machine':{
      venueTop(c,f,p,'#BBC6C1');venueBox(c,x+.06,y+.05,f.w-.12,.2,'#344441',.03);for(const dx of [.24,.6]){venueDot(c,x+dx,y+.14,.055,'#DFE7DD');venueBox(c,x+dx-.03,y+.29,.06,.14,'#525C56');venueCup(c,x+dx,y+.45,.08);}
      if(k==='bar')for(const dx of [.24,.6])venueLine(c,[[x+dx,y+.4],[x+dx,y+.15],[x+dx+.12,y+.15]],'#E7EBDD',.065);break;
    }
    case 'board':{
      venueBox(c,x-.05,y-.04,f.w+.1,f.h+.08,p.wood,.035);venueBox(c,x,y,f.w,f.h,'#30473E');
      venueText(c,k==='cafe'?'ЧАЙ   КОФЕ   ВЫПЕЧКА':k==='bar'?'НАПИТКИ   КУХНЯ':k==='police'||k==='prosecutor'?'ИНФОРМАЦИЯ':'Аа  Бб  Вв    2 + 2 = 4',f.x,f.y,.18,'#F4EAD1',f.w-.18);break;
    }
    case 'shelf':{
      venueTop(c,f,p,k==='market'?'#94704A':'#D8DDD3');
      const horizontal=!!f.horiz,len=horizontal?f.w:f.h,steps=Math.min(18,Math.max(1,Math.floor((len-.12)/.34)));
      for(let i=0;i<steps;i++){
        const pos=.09+i*(len-.18)/steps,a=horizontal?x+pos:x+.08,b=horizontal?y+.08:y+pos;
        if(k==='market'){
          venueBox(c,a,b,horizontal?.26:f.w-.16,horizontal?f.h-.16:.27,'#694E32');
          for(let j=0;j<3;j++)venueDot(c,a+.1+j*.2,b+.11,.085,['#BD5940','#CFAC52','#7A9A51'][(f.goods||0)%3]);
        }else if(k==='library'){
          for(let j=0;j<2;j++)venueBox(c,a+j*.12,b,.095,f.h-.2,['#A85B4D','#788A72','#BFA064','#5D7D87'][(i+j)%4],.01);
        }else{
          for(let j=0;j<2;j++){
            const ax=a+(horizontal?0:j*(f.w-.2)/2),by=b+(horizontal?j*.22:0),color=k==='pharmacy'?['#E8F0E9','#A3CEC8','#EFEDE2'][(i+j)%3]:['#B95B43','#D8B963','#71966F','#77999E'][(i+j+(f.goods||0))%4];
            venueBox(c,ax,by,horizontal?.24:(f.w-.25)/2,horizontal?.18:.23,color,.02);venueBox(c,ax+.035,by+.07,horizontal?.14:.14,.055,'#F2F1E3');
          }
        }
        if(!horizontal)venueBox(c,x+.05,b+.27,f.w-.1,.035,'#B6BEB1');
      }
      // Ценники на торце не притворяются читаемыми ценами.
      venueBox(c,x+.1,y+f.h-.13,f.w-.2,.08,'#F1E8C5');break;
    }
    case 'desk':{
      venueTop(c,f,p,p.top);
      if(f.spot==='study'){
        venueBox(c,f.x-.3,y+.15,.58,.36,'#FAF0D8',.025);venueLine(c,[[f.x,y+.17],[f.x,y+.49]],'#BEAE8D',.018);venueLine(c,[[f.x+.4,y+.18],[f.x+.36,y+.45]],p.accent,.035);
      }else{
        venueBox(c,f.x-.34,y+.07,.68,.22,'#344340',.025);venueBox(c,f.x-.27,y+.1,.54,.11,'#81B0A3');venueBox(c,f.x-.3,y+f.h-.28,.6,.15,'#E1E3D6',.02);
        c.strokeStyle='#939E92';c.lineWidth=.018;c.beginPath();for(let a=f.x-.24;a<f.x+.27;a+=.08){c.moveTo(a,y+f.h-.26);c.lineTo(a,y+f.h-.15);}c.stroke();
        if(f.w>2){venueBox(c,x+.18,y+.17,.45,.5,'#EEE8D7',.02);venueCup(c,x+f.w-.22,y+.27,.1);}
      }break;
    }
    case 'stage':{
      venueTop(c,f,p,p.wood);venueBox(c,x,y,f.w,.45,'#9A3B3F');
      for(let i=0;i<Math.min(36,Math.ceil(f.w/.5));i++)venueBox(c,x+i*.5,y,.23,.7,'#732C35',.07);
      venueBox(c,x,y+.25,.65,f.h-.25,'#9B4242');venueBox(c,x+f.w-.65,y+.25,.65,f.h-.25,'#9B4242');
      const g=c.createRadialGradient(f.x,f.y+.4,.1,f.x,f.y+.4,2.7);g.addColorStop(0,'rgba(255,224,162,.45)');g.addColorStop(1,'rgba(255,224,162,0)');venueBox(c,x+.7,y+.7,f.w-1.4,f.h-.75,g);break;
    }
    case 'painting':{
      venueBox(c,x-.05,y-.05,f.w+.1,f.h+.1,p.accent,.025);venueBox(c,x,y,f.w,f.h,'#D8D1AC');venueBox(c,x+.07,y+.06,f.w-.14,f.h-.12,'#85A9A8');
      c.fillStyle=['#678568','#B38A63','#7C8D9B'][Math.abs(f.c||0)%3];c.beginPath();c.moveTo(x+.08,y+f.h-.05);c.lineTo(x+.4,y+.13);c.lineTo(x+.8,y+.24);c.lineTo(x+f.w-.08,y+.1);c.lineTo(x+f.w-.08,y+f.h-.05);c.fill();break;
    }
    case 'pedestal':{
      venueTop(c,f,p,'#D5D7CA');const n=Math.abs(f.c||0)%3;
      if(n===0){venueDot(c,f.x,f.y,.25,'#A67D50');venueDot(c,f.x,f.y-.17,.14,'#825E3D');venueDot(c,f.x,f.y-.17,.08,'#4F4636');}
      else if(n===1){venueBox(c,f.x-.25,f.y-.2,.5,.36,'#D2B889',.02);venueLine(c,[[f.x,f.y-.18],[f.x,f.y+.13]],'#9B865E',.025);}
      else{venueDot(c,f.x,f.y,.25,'#95ADAA');venueDot(c,f.x-.07,f.y-.06,.16,'#BECFC1');}
      venueBox(c,x+.08,y+f.h-.16,f.w-.16,.1,'#F3EEE0');c.strokeStyle='#B6D6CF';c.lineWidth=.035;c.strokeRect(x+.06,y+.05,f.w-.12,f.h-.1);venueLine(c,[[x+.13,y+.1],[x+.4,y+.38]],'rgba(255,255,255,.6)',.045);break;
    }
    case 'sofa':{
      venueTop(c,f,p,p.seat);venueBox(c,x+.04,y+.04,f.w-.08,.22,p.trim,.08);
      for(let i=0;i<3;i++){const a=x+.17+i*(f.w-.3)/3;venueBox(c,a,y+.31,(f.w-.3)/3-.07,f.h-.49,p.seat,.08);venueLine(c,[[a,y+.34],[a+(f.w-.3)/3-.1,y+.34]],'rgba(255,255,240,.25)',.025);}
      venueBox(c,x+.09,y+.31,.38,.4,p.accent,.07);venueBox(c,x+f.w-.47,y+.31,.36,.4,'#C8BDA3',.07);break;
    }
    case 'rug':{
      venueBox(c,x,y,f.w,f.h,'#AF8666',.12);c.strokeStyle='#E0CBA3';c.lineWidth=.07;c.strokeRect(x+.13,y+.13,f.w-.26,f.h-.26);
      for(const u of [-.25,0,.25]){const a=f.x+f.w*u;venueLine(c,[[a,f.y-.35],[a+.25,f.y],[a,f.y+.35],[a-.25,f.y],[a,f.y-.35]],'#754F3F',.055);}break;
    }
    case 'bed':{
      venueTop(c,f,p,'#E9E6D9');venueBox(c,x+.65,y+.1,f.w-.75,f.h-.28,k==='hospital'?'#98BFB2':p.seat,.06);
      for(let i=0;i<2;i++)venueBox(c,x+.12,y+.15+i*(f.h-.3)/2,.45,(f.h-.42)/2,'#FFF8E6',.08);
      venueBox(c,x+f.w-.45,y+.12,.27,f.h-.32,k==='hospital'?'#C6D9C8':p.accent,.02);break;
    }
    case 'wardrobe':case 'fridge':case 'printer':{
      venueTop(c,f,p,f.t==='wardrobe'?p.wood:'#DBE3D9');venueLine(c,[[f.x,y+.08],[f.x,y+f.h-.12]],p.trim,.025);
      venueBox(c,f.x+.1,f.y-.06,.06,.2,p.trim,.02);
      if(f.t==='printer'){venueBox(c,x+.12,y+.06,f.w-.24,.16,'#43514B');venueBox(c,x+.18,y+.15,f.w-.36,.24,'#F6F0DE');}break;
    }
    case 'kitchen':{
      venueTop(c,f,p,'#E1DECA');venueBox(c,x+.45,y+.15,.8,.45,'#8CABA5',.08);venueBox(c,x+.53,y+.21,.64,.33,'#6B8882',.06);venueLine(c,[[x+.86,y+.12],[x+.86,y+.32],[x+1,y+.32]],'#E9EEE4',.055);
      venueBox(c,x+f.w-1.7,y+.1,1.2,.57,'#3D4E47',.04);for(let i=0;i<4;i++){const a=x+f.w-1.43+(i%2)*.57,b=y+.26+Math.floor(i/2)*.24;venueDot(c,a,b,.11,'#7B8E80');venueDot(c,a,b,.07,'#33443B');}
      venueBox(c,x+1.55,y+.17,.7,.4,p.wood,.05);venueLine(c,[[x+1.7,y+.26],[x+2.06,y+.26]],'#DDDAC5',.055);break;
    }
    case 'plant':{
      venueDot(c,f.x+.04,f.y+.07,.31,'rgba(30,42,25,.2)');venueDot(c,f.x,f.y,.27,'#A88558');venueDot(c,f.x,f.y,.19,'#5B5940');
      for(let i=0;i<7;i++){const a=i*tau/7;c.fillStyle=i%2?'#6D9160':'#416E50';c.beginPath();c.ellipse(f.x+Math.cos(a)*.16,f.y+Math.sin(a)*.16,.22,.085,a,0,tau);c.fill();}break;
    }
    case 'atm':{
      venueTop(c,f,p,p.seat);venueBox(c,x+.13,y+.09,f.w-.26,.2,'#D6EFE1',.025);venueBox(c,x+.18,y+.35,f.w-.36,.08,'#263C35');venueDot(c,x+.13,y+.38,.025,'#7BDC96');break;
    }
    case 'pew':{
      if(id==='mosque'){venueBox(c,x,y,f.w,f.h,'#4F7C73',.02);for(let a=x+.2;a<x+f.w-.2;a+=.85){venueLine(c,[[a,y+f.h-.05],[a,y+.19],[a+.25,y+.06],[a+.5,y+.19],[a+.5,y+f.h-.05]],'#C9BB86',.025);}}
      else{venueTop(c,f,p,p.wood);venueBox(c,x+.03,y+.03,f.w-.06,.14,p.trim,.03);}break;
    }
    case 'altar':{
      venueTop(c,f,p,p.top);
      if(id==='mosque'){c.strokeStyle=p.accent;c.lineWidth=.08;c.beginPath();c.moveTo(f.x-.6,y+f.h-.15);c.lineTo(f.x-.6,y+.4);c.quadraticCurveTo(f.x-.6,y+.2,f.x,y+.1);c.quadraticCurveTo(f.x+.6,y+.2,f.x+.6,y+.4);c.lineTo(f.x+.6,y+f.h-.15);c.stroke();}
      else{venueBox(c,f.x-.35,f.y-.15,.7,.3,'#F3E9CA');venueDot(c,x+.35,f.y,.08,'#E6C16C');venueDot(c,x+f.w-.35,f.y,.08,'#E6C16C');}break;
    }
  }
}
