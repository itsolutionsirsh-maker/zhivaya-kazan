// Жизнь там, куда смотрят, и путь напрямик через парк
const {chromium}=require('playwright');const {spawn}=require('child_process');const [DEV,PORT,SHOT]=[process.argv[2],+process.argv[3],process.argv[4]];const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const srv=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{cwd:DEV,stdio:'ignore'});await sleep(800);const b=await chromium.launch();const errors=[];
try{const pg=await b.newPage({viewport:{width:900,height:700}});pg.on('pageerror',e=>errors.push(String(e)));
 await pg.goto(`http://127.0.0.1:${PORT}/index.html`);await pg.waitForFunction('document.querySelector("#loading").hidden === true',null,{timeout:120000});
 await pg.fill('#pName','Тест');await pg.click('#startBtn');await sleep(300);try{await pg.click('#howtoClose',{timeout:2000});}catch(e){}await sleep(2000);
 const view=()=>pg.evaluate(`(()=>{const hw=W/cam.z/2,hh=H/cam.z/2;const iv=o=>Math.abs(o.x-cam.x)<hw&&Math.abs(o.y-cam.y)<hh;return {z:+cam.z.toFixed(2),walkersInView:walkers.filter(iv).length,carsInView:cars.filter(iv).length,walking:walkers.filter(w=>iv(w)&&w.state==='walk').length,nearPlayer:walkers.filter(w=>Math.hypot(w.x-player.x,w.y-player.y)<400).length};})()`);
 console.log('у игрока:',JSON.stringify(await view()));
 for(const [dx,dy] of [[2500,-1500],[-1800,1500],[1200,2200]]){await pg.evaluate(([dx,dy])=>{cam.free=true;cam.x=player.x+dx;cam.y=player.y+dy;cam.z=cam.zt=2;},[dx,dy]);for(const t of [3,8]){await sleep(t===3?3000:5000);
  console.log('камера в',dx,dy,t+'с',dx,dy,':',JSON.stringify(await view()));}}
 if(SHOT)await pg.screenshot({path:SHOT});
 await pg.evaluate('(()=>{cam.free=false;})()');await sleep(5000);console.log('камера вернулась к игроку:',JSON.stringify(await view()));
 // путь: 200 случайных целей 80–400 м, где по прямой свободно; длина по-старому и по-новому
 const r=await pg.evaluate(`(()=>{let s=7;const rnd=()=>{s=(s*16807)%2147483647;return s/2147483647;};let n=0,sumOld=0,sumNew=0,direct=0,cut=0,bad=0;const P=world.nodes;
  for(let k=0;k<400&&n<120;k++){const a=world.pedNodes[Math.floor(rnd()*world.pedNodes.length)];const q=sidewalkPos(a);const an=rnd()*6.28,R=80+rnd()*320;const wx=q[0]+Math.cos(an)*R,wy=q[1]+Math.sin(an)*R;if(inBuilding(wx,wy))continue;
   player.x=q[0];player.y=q[1];const s0=nearestNode(player.x,player.y,world.pedAdj,120),g=nearestNode(wx,wy,world.pedAdj,120);if(s0<0||g<0)continue;const old=pathToWaypoints(astar(world.pedAdj,s0,g,pedCost),world.pedAdj,'ped');old.push([wx,wy]);
   player.replans=0;walkTo(wx,wy);const nw=player.waypoints||[];const len=(L)=>{let t=0,x=player.x,y=player.y;for(const p of L){t+=Math.hypot(p[0]-x,p[1]-y);x=p[0];y=p[1];}return t;};
   if(!nw.length)continue;n++;const lo=len(old),ln=len(nw);sumOld+=lo;sumNew+=ln;if(nw.length===1)direct++;else if(nw.length<old.length)cut++;
   const cross=L=>{let x=player.x,y=player.y,c=0;for(const p of L){const D=Math.hypot(p[0]-x,p[1]-y);for(let i=1;i<=D/1.5;i++){const t=i*1.5/D;if(inBuilding(x+(p[0]-x)*t,y+(p[1]-y)*t)){c++;break;}}x=p[0];y=p[1];}return c;};const co=cross(old),cn=cross(nw);if(cn>co)bad++;}
  player.waypoints=null;return {маршрутов:n,напрямик:direct,срезан_крюк:cut,новых_сквозь_дом:bad,длина_было:Math.round(sumOld/n),длина_стало:Math.round(sumNew/n)};})()`);
 console.log('пешие пути:',JSON.stringify(r));
}finally{await b.close();srv.kill();}console.log(errors.length?errors.join('\n'):'no page errors');})();
