import { W,H,COLS,ROWS,CELL,clamp } from "./core.js";
import { drawCamera } from "../creator/CameraLayout.js";
import cleanUrl from "./assets/clean-v1.webp";
const ellipse=(c,x,y,rx,ry)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);};
export function star(c,x,y,r,color="#fff9c8") { c.save();c.translate(x,y);c.fillStyle=color;c.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4-Math.PI/2,rr=i%2?r*.23:r;c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}c.closePath();c.fill();c.restore(); }
export class WipeRenderer {
  constructor(canvas){
    this.canvas=canvas;canvas.width=W;canvas.height=H;
    this.mask=document.createElement("canvas");this.mask.width=COLS;this.mask.height=ROWS;this.data=this.mask.getContext("2d").createImageData(COLS,ROWS);
    this.dirt=document.createElement("canvas");this.dirt.width=W;this.dirt.height=H;
    this.background=new Image();this.background.src=cleanUrl;this.particles=[];this.trails=[];this.revision=-1;
  }
  reset(){this.revision=-1;this.particles=[];this.trails=[];}
  event(e,reduced=false){
    if(e.type==="wipe"){
      this.trails.push({...e.point,r:e.radius,age:0,side:e.side});if(this.trails.length>18)this.trails.shift();
      if(!reduced)for(let i=0;i<Math.min(6,1+e.changed/12);i++)this.particles.push({x:e.point.x+(Math.random()-.5)*e.radius*2,y:e.point.y+(Math.random()-.5)*e.radius*2,vx:(Math.random()-.5)*170,vy:-50-Math.random()*80,life:350+Math.random()*250,age:0,kind:"dust",side:e.side});
    }
    if(!reduced&&(e.type==="splash"||e.type==="patch"))for(let i=0;i<14;i++)this.particles.push({x:e.point.x,y:e.point.y,vx:(i%2?1:-1)*(80+Math.random()*160),vy:-100-Math.random()*240,life:650,age:0,kind:"drop",side:e.side});
    if(e.type==="sparkle"||e.type==="perfect")for(let i=0;i<(reduced?3:e.type==="perfect"?36:8);i++)this.particles.push({x:Math.random()*W,y:Math.random()*H,vx:0,vy:-25,life:900,age:0,kind:"star",side:e.side});
    if(this.particles.length>180)this.particles.splice(0,this.particles.length-180);
  }
  syncMask(g){
    if(this.revision===g.revision)return;this.revision=g.revision;
    for(let i=0;i<g.cells.length;i++){const j=i*4;this.data.data[j]=this.data.data[j+1]=this.data.data[j+2]=255;this.data.data[j+3]=Math.round(255*g.cells[i]/g.strength[i]);}
    this.mask.getContext("2d").putImageData(this.data,0,0);
    const c=this.dirt.getContext("2d");c.clearRect(0,0,W,H);
    const gradient=c.createLinearGradient(0,0,W,H);gradient.addColorStop(0,"#e7f4f4");gradient.addColorStop(.5,"#f5faf7");gradient.addColorStop(1,"#c8e3e4");c.fillStyle=gradient;c.fillRect(0,0,W,H);
    // Condensation texture is deterministic and remains attached to the pane.
    c.fillStyle="rgba(255,255,255,.45)";for(let i=0;i<190;i++){const x=(i*137.5)%W,y=(i*173.1)%H;ellipse(c,x,y,1+i%3,2+i%4);c.fill();}
    for(const p of g.patches)if(!p.cleared)for(const s of p.shapes){
      if(p.type==="hand"){c.fillStyle="rgba(120,167,175,.27)";ellipse(c,s.x,s.y,s.r,s.r*1.12);c.fill();continue;}
      const bubble=p.type==="foam"||p.type==="big";
      const gradient=c.createRadialGradient(s.x-s.r*.3,s.y-s.r*.4,0,s.x,s.y,s.r*1.3);
      gradient.addColorStop(0,"rgba(255,255,255,.95)");gradient.addColorStop(.4,bubble?"rgba(222,249,243,.55)":"rgba(137,205,221,.65)");gradient.addColorStop(1,"rgba(255,255,255,.1)");
      c.fillStyle=gradient;c.strokeStyle=p.type==="big"?"#eab260":"rgba(130,181,191,.5)";c.lineWidth=p.type==="big"?4:2;
      ellipse(c,s.x,s.y,s.r,s.r*(bubble?1:1.5));c.fill();c.stroke();
      c.strokeStyle="rgba(255,255,255,.92)";c.lineWidth=4;c.beginPath();c.arc(s.x,s.y,s.r*.72,Math.PI*1.08,Math.PI*1.65);c.stroke();
      if(p.type==="big"){c.fillStyle="#6c846f";c.textAlign="center";c.font="900 12px 'Trebuchet MS',sans-serif";c.fillText("BIG",s.x,s.y+4);}
    }
    c.globalCompositeOperation="destination-in";c.imageSmoothingEnabled=true;c.filter="blur(7px)";c.drawImage(this.mask,0,0,W,H);c.filter="none";c.globalCompositeOperation="source-over";
  }
  draw(g,{video,source,faceMode="ORIGINAL",dt=16,reducedMotion=false,locale="ja"}={}){
    const c=this.canvas.getContext("2d"),perfect=g.result?.reason==="perfect";c.clearRect(0,0,W,H);c.fillStyle="#f6e6c4";c.fillRect(0,0,W,H);
    c.save();if(perfect)c.filter="brightness(1.12) saturate(1.08)";
    if(source==="camera"&&faceMode!=="HIDE"&&video?.readyState>=2){
      if(faceMode==="EFFECT")c.filter=(perfect?"brightness(1.12) ":"")+"saturate(1.7) contrast(1.16) sepia(.18)";
      drawCamera(c,video,W,H);
      if(faceMode==="EFFECT"){c.fillStyle="rgba(252,222,123,.12)";c.fillRect(0,0,W,H);}
    }else if(this.background.complete&&this.background.naturalWidth)c.drawImage(this.background,0,0,W,H);
    c.restore();
    this.syncMask(g);if(!perfect){c.globalAlpha=.97;c.drawImage(this.dirt,0,0);c.globalAlpha=1;}
    if(g.mode==="duo"){
      c.setLineDash([8,10]);c.strokeStyle="#ffffffbb";c.lineWidth=3;c.beginPath();c.moveTo(W/2,0);c.lineTo(W/2,H);c.stroke();c.setLineDash([]);
      c.fillStyle="#70cdb5";c.fillRect(0,H-7,W/2,7);c.fillStyle="#ef9385";c.fillRect(W/2,H-7,W/2,7);
    }
    if(!perfect&&g.phase==="playing")for(let side=0;side<g.players;side++)if(g.percent(side)>=90){
      const age=g.elapsed/200;let count=0;
      for(let i=0;i<g.cells.length;i++)if(g.cells[i]&&g.sideFor(i)===side&&count++%6===0){star(c,(i%COLS+.5)*CELL,(Math.floor(i/COLS)+.5)*CELL,reducedMotion?5:4+Math.sin(age+i)*2,"#eabd55");}
    }
    for(const t of this.trails){t.age+=dt;c.globalAlpha=Math.max(0,1-t.age/360)*.22;c.strokeStyle=t.side===1?"#f5afa1":"#fffdf4";c.lineWidth=3;ellipse(c,t.x,t.y,t.r,t.r);c.stroke();}c.globalAlpha=1;this.trails=this.trails.filter(t=>t.age<360);
    for(const p of this.particles){p.age+=dt;p.x+=p.vx*dt/1000;p.y+=p.vy*dt/1000;p.vy+=dt*.16;c.globalAlpha=Math.max(0,1-p.age/p.life);if(p.kind==="star")star(c,p.x,p.y,8,"#ffdb73");else{c.fillStyle=p.kind==="drop"?"#93d6e4":"#ffffff";ellipse(c,p.x,p.y,p.kind==="drop"?4:2,p.kind==="drop"?7:2);c.fill();}}c.globalAlpha=1;this.particles=this.particles.filter(p=>p.age<p.life);
    if(!["finish","result"].includes(g.phase)&&!g.paused)for(const p of g.palms)this.sponge(c,p,g);
    if(g.phase==="finish"){
      const label=perfect?g.mode==="duo"?(g.result.winner?`P${g.result.winner} WINS!`:"DOUBLE PERFECT!"):"PERFECT!":"TIME!";
      c.fillStyle="#fff9e7ed";c.beginPath();c.roundRect(40,H*.39,W-80,160,24);c.fill();
      c.textAlign="center";c.fillStyle="#305a50";c.font="900 64px Impact,'Arial Narrow',sans-serif";c.fillText(label,W/2,H*.49,440);c.font="700 17px 'Trebuchet MS',sans-serif";c.fillText(perfect?"PERFECT WINDOW!":locale==="ja"?"窓がこんなにきれいに！":"LOOK AT THAT SHINE!",W/2,H*.54);
      star(c,75,H*.415,14,"#efb950");star(c,W-75,H*.55,14,"#efb950");
    }
  }
  sponge(c,p,g){
    const radius=clamp(p.radius??(g.players===1?.135:.095),g.players===1?.1:.065,g.players===1?.19:.13)*W;
    c.save();c.translate(clamp(p.x)*W,clamp(p.y)*H);c.rotate(Math.sin(g.elapsed/250)*.10-.12);
    c.shadowColor="#38584933";c.shadowBlur=12;c.shadowOffsetY=5;c.fillStyle=g.mode==="duo"&&p.x>=.5?"#ecad8f":"#f2ca67";
    c.beginPath();c.roundRect(-radius*.55,-radius*.4,radius*1.1,radius*.8,14);c.fill();c.shadowBlur=0;c.shadowOffsetY=0;
    c.fillStyle="#a7853e40";for(let i=0;i<13;i++){ellipse(c,((i*23)%80/80-.5)*radius*.9,((i*31)%80/80-.5)*radius*.6,2+(i%3),2);c.fill();}
    c.strokeStyle="#fff5cbb0";c.lineWidth=3;c.beginPath();c.moveTo(-radius*.4,-radius*.27);c.lineTo(radius*.4,-radius*.27);c.stroke();c.restore();
  }
  dispose(){this.particles=[];this.trails=[];this.dirt.width=0;this.mask.width=0;}
}
