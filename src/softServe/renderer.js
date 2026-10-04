import { clamp } from "../games/softServe.js";
const ellipse = (c,x,y,rx,ry) => { c.beginPath(); c.ellipse(x,y,rx,ry,0,0,Math.PI*2); c.fill(); };
function surface(canvas) {
  const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(2,window.devicePixelRatio||1);
  if(!w||!h)return null;
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  const c=canvas.getContext("2d");c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);return {c,w,h};
}
export function heroShape(amount=6) {
  return {amount,lean:-.035,melt:0,swirlHeight:.034,segments:Array.from({length:Math.ceil(amount*14)},(_,i)=>({level:(i+1)/14,x:Math.sin(i*.54)*Math.max(.028,.087-i/14*.007)}))};
}
// Every band is fitted to the recorded hand path, including its offset and spread.
export function drawFood(c,shape,{w,h,x,y,cone=true,fromLevel=0}) {
  const size=Math.min(w*.13,h*.17),sh=shape.swirlHeight*h;
  if(cone){
    c.fillStyle="#583a2d15";ellipse(c,x,y+size*1.87,size*.95,size*.13);
    c.save();c.beginPath();c.moveTo(x-size,y);c.quadraticCurveTo(x,y-size*.26,x+size,y);c.lineTo(x+size*.08,y+size*1.76);c.quadraticCurveTo(x,y+size*1.9,x-size*.08,y+size*1.76);c.closePath();
    const gold=c.createLinearGradient(x-size,y,x+size,y);[[0,"#9c5d2d"],[.18,"#c78e4a"],[.48,"#f3d091"],[.72,"#dbab64"],[1,"#a76a32"]].forEach(([p,v])=>gold.addColorStop(p,v));c.fillStyle=gold;c.fill();c.clip();
    for(let i=-8;i<9;i++)for(const direction of [-1,1]){
      c.beginPath();c.moveTo(x+i*size*.26,y-size*.1);c.lineTo(x+(i*.26+direction*1.7)*size,y+size*2);
      c.strokeStyle="#95602d80";c.lineWidth=size*.042;c.stroke();c.save();c.translate(-size*.026,-size*.026);c.strokeStyle="#ffe2a88c";c.lineWidth=size*.024;c.stroke();c.restore();
    }
    c.restore();c.fillStyle="#eac284";ellipse(c,x,y,size*1.015,size*.2);c.fillStyle="#a16c3b";ellipse(c,x,y,size*.91,size*.105);
  }
  for(let level=Math.floor(fromLevel);level<shape.amount;level++){
    if(level+1<=fromLevel)continue;
    const fraction=Math.min(1,shape.amount-level),band=shape.segments.filter(s=>s.level>=level&&s.level<level+fraction);
    const min=band.length?Math.min(...band.map(s=>s.x)):-.025,max=band.length?Math.max(...band.map(s=>s.x)):.025;
    const middle=band.length?band.reduce((n,s)=>n+s.x,0)/band.length:0;
    const width=clamp((max-min)*.8+.033,.035,.16)*w,cx=x+middle*w+shape.lean*level*.034*w,cy=y-(level+fraction*.65)*sh;
    const ry=Math.max(w*.027,sh*1.04),g=c.createLinearGradient(cx-width,cy-ry,cx+width,cy+ry);
    [[0,"#dbc8a9"],[.24,"#fff7e8"],[.48,"#fffef7"],[.72,"#f7ecd5"],[1,"#cdb996"]].forEach(([p,v])=>g.addColorStop(p,v));
    c.fillStyle=g;c.beginPath();c.moveTo(cx-width,cy);c.bezierCurveTo(cx-width*1.1,cy-ry,cx+width*.6,cy-ry*1.3,cx+width,cy-ry*.15);c.bezierCurveTo(cx+width*1.12,cy+ry*.7,cx-width*.65,cy+ry,cx-width,cy);c.fill();
    c.lineCap="round";c.strokeStyle="#fffef5c9";c.lineWidth=w*.007;c.beginPath();c.moveTo(cx-width*.75,cy-ry*.22);c.bezierCurveTo(cx-width*.4,cy-ry*.78,cx+width*.35,cy-ry*.8,cx+width*.68,cy-ry*.32);c.stroke();
    c.strokeStyle="#b9a38433";c.lineWidth=w*.004;c.beginPath();c.moveTo(cx-width*.6,cy+ry*.4);c.quadraticCurveTo(cx,cy+ry*.82,cx+width*.68,cy+ry*.17);c.stroke();
  }
  if(shape.amount>.2){
    const last=shape.segments.filter(s=>s.level<=shape.amount).slice(-12),offset=last.length?last.reduce((n,s)=>n+s.x,0)/last.length:0;
    const tx=x+offset*w+shape.lean*shape.amount*.034*w,ty=y-shape.amount*sh-.024*h;
    const g=c.createLinearGradient(tx-w*.022,ty,tx+w*.025,ty);g.addColorStop(0,"#ddcbae");g.addColorStop(.4,"#fffdf3");g.addColorStop(1,"#f1e4cc");c.fillStyle=g;
    c.beginPath();c.moveTo(tx-w*.026,ty+h*.027);c.bezierCurveTo(tx-w*.03,ty+h*.01,tx+w*.011,ty+h*.005,tx+w*.004,ty-h*.018);c.bezierCurveTo(tx+w*.038,ty,tx+w*.03,ty+h*.021,tx-w*.026,ty+h*.027);c.fill();
  }
}
export function drawPortrait(canvas,shape) {
  const s=surface(canvas);if(!s)return;const {c,w,h}=s;
  const vh=Math.min(h/(.034*shape.amount+.26),w*2.4),vw=Math.min(w*1.4,vh*.72);
  drawFood(c,shape,{w:vw,h:vh,x:w*.5,y:h*.86-Math.min(vw*.13,vh*.17)*1.85});
}
export function drawSoftServe(canvas,game,{demo=true,mouth=null,open=false,reducedMotion=false,locale="ja",animation=null,quietReaction=false}={}) {
  const s=surface(canvas);if(!s)return;const {c,w,h}=s,x=game.cone.x*w,y=game.cone.y*h;
  const serving=game.phase==="serve",ready=game.phase==="ready",eating=game.phase==="eat";
  if(demo){
    const bg=c.createLinearGradient(0,0,0,h);bg.addColorStop(0,"#eee1cd");bg.addColorStop(.6,"#fff8eb");bg.addColorStop(1,"#e8d0b0");c.fillStyle=bg;c.fillRect(0,0,w,h);
    c.fillStyle="#fffaf04d";for(let i=0;i<5;i++){c.beginPath();c.roundRect(i*w*.27-w*.15,h*.14,w*.18,h*.55,80);c.fill();}c.fillStyle="#d8b99a55";c.fillRect(0,h*.89,w,h*.11);
  }
  if(serving||ready){
    const radius=Math.max(.025,.105-game.amount*.007)*w;
    c.strokeStyle="#fffaf0c9";c.lineWidth=1.5;c.setLineDash([3,8]);c.beginPath();c.moveTo(w*.5-radius,h*.23);c.lineTo(w*.5-radius,h*.79);c.moveTo(w*.5+radius,h*.23);c.lineTo(w*.5+radius,h*.79);c.stroke();c.setLineDash([]);
    const steel=c.createLinearGradient(w*.36,0,w*.64,0);[[0,"#ae9386"],[.25,"#fff9ef"],[.7,"#e9d7c8"],[1,"#8d7366"]].forEach(([p,v])=>steel.addColorStop(p,v));c.fillStyle=steel;c.beginPath();c.roundRect(w*.405,-12,w*.19,h*.13,[0,0,16,16]);c.fill();c.fillStyle="#e9cabe";c.beginPath();c.roundRect(w*.454,h*.085,w*.092,h*.055,6);c.fill();c.fillStyle="#8b6c5e";ellipse(c,w*.5,h*.14,w*.039,h*.012);
    if(serving&&!game.paused){const end=game.catching?Math.max(h*.17,game.tip.y*h):h*.92,wave=reducedMotion?0:Math.sin(game.elapsedMs/120)*w*.004;c.lineCap="round";c.strokeStyle="#d2bfa2";c.lineWidth=w*.03;c.beginPath();c.moveTo(w*.5,h*.14);c.bezierCurveTo(w*.5+wave,end*.4,w*.5-wave,end*.7,w*.5,end);c.stroke();c.strokeStyle="#fff9e9";c.lineWidth=w*.021;c.stroke();}
  }
  c.save();
  if(ready)c.globalAlpha=game.paused?.18:.28+game.attachmentProgress*.55;
  drawFood(c,game.captureShape(),{w,h,x,y});
  c.restore();
  if(ready&&!game.paused){
    const radius=w*.105,cy=y-w*.06;
    c.strokeStyle="#76584955";c.lineWidth=4;c.beginPath();c.arc(x,cy,radius,0,Math.PI*2);c.stroke();
    c.strokeStyle="#a9404d";c.lineWidth=5;c.beginPath();c.arc(x,cy,radius,-Math.PI/2,-Math.PI/2+Math.PI*2*game.attachmentProgress);c.stroke();
    c.fillStyle="#583a2d";c.font="800 "+Math.max(13,w*.04)+"px 'Yu Gothic',sans-serif";c.textAlign="center";
    c.fillText(game.readyMs>0?"HOLD…":locale==="ja"?"✋ 中央へ":"✋ TO THE MIDDLE",x,cy-radius-14);
  }
  if(animation?.attachmentAge<650){
    c.save();c.globalAlpha=1-clamp((animation.attachmentAge-350)/300);
    c.fillStyle="#fffaf0";c.beginPath();c.roundRect(x-w*.18,y-h*.15,w*.36,h*.07,18);c.fill();
    c.fillStyle="#a9404d";c.textAlign="center";c.font="800 "+Math.max(15,w*.05)+"px 'Yu Gothic',sans-serif";
    c.fillText(locale==="ja"?"カチッ！🍦":"CLICK! 🍦",x,y-h*.105);c.restore();
  }
  if(game.melt>25&&game.amount>0){c.fillStyle="#fff5df";for(let i=0;i<3;i++){const dy=(game.elapsedMs/1700+i*.33)%1;ellipse(c,x+(i-1)*w*.068,y+dy*w*.14,w*.009,w*.018);}}
  if(eating){const tip=game.tip;c.strokeStyle="#fff9ed";c.lineWidth=2;c.setLineDash([3,6]);c.beginPath();c.arc(tip.x*w,tip.y*h,w*.072,0,Math.PI*2);c.stroke();c.setLineDash([]);if(mouth){c.strokeStyle=open?"#fff8eb":"#f57682";c.lineWidth=2.5;c.beginPath();c.ellipse(mouth.x*w,mouth.y*h,w*.032,open?w*.025:w*.006,0,0,Math.PI*2);c.stroke();}}
  const age=animation?.biteAge??Infinity,bite=animation?.bite;
  if(bite&&age<500){
    const pull=clamp((age-80)/140),fade=age<220?1:1-clamp((age-220)/220),tx=bite.tip.x*w,ty=bite.tip.y*h;
    c.save();c.globalAlpha=fade;c.translate(tx+(bite.mouth.x*w-tx)*pull,ty+(bite.mouth.y*h-ty)*pull);const scale=reducedMotion?1:1-pull*.7;c.scale(scale,age<80&&!reducedMotion ? .82 : scale);c.translate(-tx,-ty);drawFood(c,bite.before,{w,h,x:(bite.cone?.x??game.cone.x)*w,y:(bite.cone?.y??game.cone.y)*h,cone:false,fromLevel:bite.afterAmount});c.restore();
    if(age>100){c.save();c.globalAlpha=fade;c.fillStyle="#fffaf0";c.beginPath();c.roundRect(tx-w*.12,ty-h*.1,w*.24,h*.07,20);c.fill();c.fillStyle="#ad4350";c.font="800 "+Math.max(15,w*.05)+"px 'Yu Gothic',sans-serif";c.textAlign="center";c.fillText(locale==="ja"?"ぱくっ！":"YUM!",tx,ty-h*.052);c.restore();}
  }
  if(animation?.finishAt!==null&&animation?.outcome==="clean"&&(!quietReaction||animation.finishAge<650)){
    const age=animation.finishAge;c.save();c.globalAlpha=clamp(age/180);c.fillStyle="#fffaf0";c.beginPath();c.roundRect(w*.18,h*.33,w*.64,h*.16,32);c.fill();c.fillStyle="#a9404d";c.textAlign="center";c.font="800 "+w*.075+"px 'Yu Gothic',sans-serif";c.fillText(locale==="ja"?"ごちそうさま！":"ALL GONE!",w*.5,h*.425);
    if(!reducedMotion){c.fillStyle="#f57682";for(let i=0;i<8;i++){const a=i*Math.PI/4,r=w*(.18+clamp(age/750)*.15);ellipse(c,w*.5+Math.cos(a)*r,h*.4+Math.sin(a)*r,w*.008,w*.012);}}c.restore();
  }
}
