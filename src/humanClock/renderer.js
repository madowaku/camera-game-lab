import { W, H, HOLD_SECONDS, clockAngles, clamp } from './core.js';
import { videoRect } from './tracking.js';
const INK = '#142420', CREAM = '#f5efdd', MINT = '#98e4bb', CORAL = '#fb866b', YELLOW = '#f8d875';
const circle = (c, x, y, r) => { c.beginPath(); c.arc(x,y,r,0,Math.PI*2); };
const point = (center, angle, r) => ({ x: center.x + Math.cos(angle * Math.PI / 180) * r, y: center.y + Math.sin(angle * Math.PI / 180) * r });
export class ClockRenderer {
  constructor(canvas) { this.canvas = canvas; this.c = canvas.getContext('2d'); }
  draw(game, { sample, video, source, reducedMotion, feedback, locale, activeHand }) {
    const c = this.c, center = sample?.center ?? { x: W / 2, y: H * .56 }, r = Math.min(268, center.x - 24, W - center.x - 24, center.y - 160, H - center.y - 84);
    c.clearRect(0,0,W,H); c.fillStyle = INK; c.fillRect(0,0,W,H);
    if (source === 'camera' && video.readyState >= 2 && video.videoWidth) {
      const rect = videoRect(video.videoWidth / video.videoHeight);
      c.save(); c.translate(W,0); c.scale(-1,1); c.globalAlpha = .72; c.drawImage(video, rect.x,rect.y,rect.width,rect.height); c.restore();
      const shade = c.createLinearGradient(0,0,0,H); shade.addColorStop(0,'#142420dd'); shade.addColorStop(.35,'#14242005'); shade.addColorStop(1,'#142420aa'); c.fillStyle=shade; c.fillRect(0,0,W,H);
    } else {
      // A quiet graph keeps camera-free pointing directions readable.
      c.strokeStyle='#254039'; c.lineWidth=2;
      for(let x=0;x<=W;x+=48) { c.beginPath(); c.moveTo(x,190);c.lineTo(x,H);c.stroke(); }
      for(let y=190;y<=H;y+=48) { c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke(); }
    }
    c.save(); c.lineWidth=2; c.strokeStyle=game.rush ? YELLOW : '#f5efdd40'; circle(c,center.x,center.y,r);c.stroke();
    c.setLineDash([2,10]); c.strokeStyle='#f5efdd18';circle(c,center.x,center.y,r+15);c.stroke();c.setLineDash([]);
    for(let i=0;i<60;i++) {
      const angle=i*6-90,a=point(center,angle,r-(i%5===0?18:8)),b=point(center,angle,r);
      c.strokeStyle=game.rush ? YELLOW : i%5===0?'#f5efdd88':'#f5efdd35';c.lineWidth=i%5===0?3:1;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();
    }
    if (game.showNumbers) {
      c.font='500 26px "Cascadia Mono", Consolas, monospace';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#f5efddaa';
      for(let i=1;i<=12;i++) { const p=point(center,i*30-90,r-42);c.fillText(String(i),p.x,p.y); }
    }
    const angles=clockAngles(game.target.hour,game.target.minute);
    ['hour','minute'].forEach((side,i)=>{
      const hand=sample?.hands?.[side]; if(!hand?.present)return;
      const error=game.match?.errors[i]??Infinity,color=game.settling?MINT:error<=12?MINT:error<=35?YELLOW:CREAM;
      const end=point(center,hand.angle,i?r*.88:r*.62),base=hand.base??point(hand,hand.angle+180,60);
      c.save();c.strokeStyle=i?MINT:CORAL;c.lineWidth=i?2:3;c.lineCap='round';
      // A subtle centered clock echoes the measured finger direction. The bright
      // input marker follows the index finger itself, never center-to-tip position.
      c.globalAlpha=.22;c.setLineDash([5,9]);c.beginPath();c.moveTo(center.x,center.y);c.lineTo(end.x,end.y);c.stroke();c.setLineDash([]);c.globalAlpha=1;
      if(source==='demo'){
        c.save();c.translate(base.x,base.y);c.rotate(hand.angle*Math.PI/180);
        c.fillStyle='#d8c9ad';c.strokeStyle='#142420';c.lineWidth=3;
        c.beginPath();c.roundRect(-56,-25,57,50,18);c.fill();c.stroke();
        c.fillStyle=i?MINT:CORAL;c.beginPath();c.roundRect(-73,-21,23,42,5);c.fill();
        // Four folded fingers and one extended index, with an obvious fingertip.
        c.strokeStyle='#927f64';c.lineWidth=2;
        for(let n=0;n<3;n++){c.beginPath();c.moveTo(-43+n*12,-17);c.lineTo(-43+n*12,8);c.stroke();}
        c.fillStyle='#e9dbc1';c.beginPath();c.roundRect(-8,-10,Math.hypot(hand.x-base.x,hand.y-base.y)+16,20,10);c.fill();
        c.beginPath();c.roundRect(-20,4,30,15,7);c.fill();c.stroke();c.restore();
      }
      c.strokeStyle=color;c.lineWidth=i?7:11;c.shadowColor=color;c.shadowBlur=game.settling?28:14;
      c.beginPath();c.moveTo(base.x,base.y);c.lineTo(hand.x,hand.y);c.stroke();
      circle(c,hand.x,hand.y,8);c.fillStyle=color;c.fill();
      c.shadowBlur=0;c.fillStyle=i?MINT:CORAL;c.font='bold 16px "Cascadia Mono", Consolas, monospace';c.textAlign='center';c.textBaseline='middle';c.fillText(i?'M':'H',hand.x,hand.y-25);
      if(source==='demo'&&activeHand===side){circle(c,hand.x,hand.y,22);c.strokeStyle='#f5efdd77';c.lineWidth=1;c.stroke();}
      c.restore();
    });
    c.strokeStyle=game.hold>0?MINT:'#f5efdd25';c.lineWidth=5;circle(c,center.x,center.y,26);c.stroke();
    if(game.hold>0){c.strokeStyle=MINT;c.lineWidth=5;c.beginPath();c.arc(center.x,center.y,26,-Math.PI/2,-Math.PI/2+Math.PI*2*clamp(game.hold/HOLD_SECONDS,0,1));c.stroke();}
    c.fillStyle=game.rush?YELLOW:CREAM;circle(c,center.x,center.y,9);c.fill();
    if(game.settling) {
      c.strokeStyle=MINT;c.lineWidth=5;c.shadowColor=MINT;c.shadowBlur=reducedMotion?0:26;circle(c,center.x,center.y,r);c.stroke();c.shadowBlur=0;
      // The digital target folds into a miniature, mathematically exact clock.
      const fold={x:W/2,y:100}; c.fillStyle=INK;circle(c,fold.x,fold.y,57);c.fill();c.strokeStyle=CREAM;c.lineWidth=2;c.stroke();
      ['hour','minute'].forEach((side,i)=>{const p=point(fold,angles[side],i?43:29);c.strokeStyle=MINT;c.lineWidth=i?3:5;c.beginPath();c.moveTo(fold.x,fold.y);c.lineTo(p.x,p.y);c.stroke();});
      if(!reducedMotion)for(let i=0;i<12;i++){const p=point(center,i*30, r+10+(1-game.settle/.55)*40);c.fillStyle=i%2?YELLOW:MINT;circle(c,p.x,p.y,3);c.fill();}
    }
    // Viewfinder corners keep the stage distinct from the surrounding shell.
    c.strokeStyle='#f5efdd66';c.lineWidth=2;[[24,205,1,1],[W-24,205,-1,1],[24,H-24,1,-1],[W-24,H-24,-1,-1]].forEach(([x,y,dx,dy])=>{c.beginPath();c.moveTo(x+18*dx,y);c.lineTo(x,y);c.lineTo(x,y+18*dy);c.stroke();});
    c.restore();
  }
}
