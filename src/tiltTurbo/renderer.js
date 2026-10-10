import carUrl from './assets/car-v1.webp';
import { roadCenter, OBSTACLES, ROAD_HALF } from './core.js';
import { drawFaceMode } from '../creator/FaceMode.js';
export const W = 360, H = 640;
const colors = { ink: '#183c3c', cream: '#fff7df', mint: '#bad5b1', orange: '#f16b39', teal: '#2d7770' };
const poly = (c, points, fill) => { c.fillStyle = fill; c.beginPath(); points.forEach(([x,y],i) => i ? c.lineTo(x,y) : c.moveTo(x,y)); c.closePath(); c.fill(); };
const round = (c, x,y,w,h,r,fill) => { c.fillStyle=fill; c.beginPath(); c.roundRect(x,y,w,h,r); c.fill(); };
function toyCar(c, x, y, size, paint) {
  c.save();c.translate(x,y);
  const scale=size/108;c.scale(scale,scale);
  round(c,-43,-48,20,88,7,'#1d2b37');round(c,23,-48,20,88,7,'#1d2b37');
  round(c,-36,-54,72,108,19,paint);
  round(c,-27,-21,54,42,10,'#20445e');
  round(c,-24,-49,48,15,6,'#fff6de');
  round(c,-22,34,44,12,5,'#fff6de');
  round(c,-4,-50,8,95,4,'#ffffff77');
  c.restore();
}
export class TiltTurboRenderer {
  constructor(canvas) { this.canvas = canvas; this.c = canvas.getContext('2d'); this.car = new Image(); this.car.src = carUrl; }
  text(label,x,y,size=16,color=colors.cream,align='center') { const c=this.c; c.textAlign=align; c.fillStyle=color; c.font=`${size >= 26 ? '900' : '700'} ${size}px ${size >= 26 ? 'Impact' : 'Trebuchet MS'}, sans-serif`; c.fillText(label,x,y); }
  project(world, ahead, horizon) { const depth=Math.max(0,1-ahead/2600), scale=.10+.90*depth*depth; return { x:W/2+(world-this.pan)*W*.44*scale, y:horizon+(600-horizon)*depth*depth, scale }; }
  draw(g, { video, face, motion={}, source, drive='head', faceMode='ORIGINAL', phase, prep=0, countdown=0, ending=0, reducedMotion=false, locale='ja', creator=false }={}) {
    const c=this.c, time=g.elapsed; this.pan=g.x*.30;
    const sceneTime=time>=18500&&time<19800&&!reducedMotion?time-200*Math.sin((time-18500)/1300*Math.PI):time;
    c.clearRect(0,0,W,H); c.fillStyle=g.course.sky; c.fillRect(0,0,W,H);
    round(c,12,12,336,52,13,colors.ink);
    this.text('TILT TURBO',25,36,20,colors.cream,'left'); this.text(String(Math.floor(g.distance*4)+Math.floor(g.cleanMs/20)+g.near*100+Math.floor(g.driftMs/15)+g.overtakes*150).padStart(4,'0'),25,54,12,'#bcdcc5','left');
    this.text(`${Math.max(0,(20000-time)/1000).toFixed(1)}`,332,43,31,colors.cream,'right');
    const panel=creator ? { x:12,y:72,w:336,h:153 } : { x:126,y:76,w:108,h:100 };
    c.save(); c.beginPath(); c.roundRect(panel.x,panel.y,panel.w,panel.h,12); c.clip(); c.fillStyle='#d4e2cf'; c.fillRect(panel.x,panel.y,panel.w,panel.h);
    if(drive==='hands') {
      if(source==='camera' && video?.readyState>=2 && faceMode!=='HIDE') {
        c.save();c.translate(panel.x+panel.w,panel.y);c.scale(-1,1);c.drawImage(video,0,0,panel.w,panel.h);c.restore();
        if(faceMode==='EFFECT')round(c,panel.x,panel.y,panel.w,panel.h,0,'#79e2e144');
      }
      c.save();c.translate(panel.x+panel.w/2,panel.y+panel.h/2);
      c.rotate((motion.roll??0)*Math.PI/180);
      const radius=creator?39:30;
      c.strokeStyle=colors.ink;c.lineWidth=creator?8:6;
      c.beginPath();c.arc(0,0,radius,0,Math.PI*2);c.stroke();
      c.beginPath();c.moveTo(-radius+7,0);c.lineTo(radius-7,0);c.moveTo(0,0);c.lineTo(0,radius-6);c.stroke();
      c.fillStyle=colors.orange;c.beginPath();c.arc(0,0,7,0,Math.PI*2);c.fill();c.restore();
    } else if (source==='camera' && video?.readyState>=2 && faceMode !== 'HIDE') {
      c.save(); c.translate(panel.x,panel.y);
      drawFaceMode(c,video,faceMode,face,{width:panel.w,height:panel.h,effect:(ctx,{x,y,width,eyeY})=> { round(ctx,x-width*.5,eyeY-8,width,18,6,colors.ink); }}); c.restore();
    } else {
      c.save(); c.translate(panel.x+panel.w/2,panel.y+panel.h/2); c.rotate((motion.roll??0)*Math.PI/180);
      c.fillStyle=colors.orange; c.beginPath(); c.ellipse(0,0,29,34,0,0,Math.PI*2); c.fill();
      round(c,-24,-13,48,14,5,colors.ink); c.strokeStyle=colors.ink; c.lineWidth=3; c.beginPath(); c.arc(0,7,11,.15,Math.PI-.15); c.stroke(); c.restore();
    }
    c.restore();
    if (!creator) { this.text(drive==='hands'?'✋':'↙',62,123,drive==='hands'?26:36,colors.teal); this.text(drive==='hands'?'✋':'↘',298,123,drive==='hands'?26:36,colors.teal); }
    const roll=Math.round(motion.roll??0), meterY=creator?235:187;
    round(c,130,meterY,100,5,3,'#d2d7bf'); round(c,173,meterY-4,14,13,5,colors.orange);
    const marker=180+Math.max(-25,Math.min(25,roll))*2; round(c,marker-3,meterY-3,6,11,3,colors.ink);
    this.text(`${roll>0?'+':''}${roll}°`,creator?317:269,meterY+6,12,colors.ink);
    if (source==='camera' && !motion.tracked) this.text(drive==='hands'?'👐 BOTH HANDS':'🙂 FACE HERE',180,creator?218:166,12,colors.ink);
    const horizon=creator?268:232;
    c.fillStyle=g.course.ground; c.fillRect(0,horizon-24,W,H-horizon+24);
    poly(c,[[0,horizon+10],[0,horizon-21],[55,horizon-45],[103,horizon-14],[180,horizon-38],[239,horizon],[W,horizon-42],[W,horizon+10]],g.course.id==='neon'?'#57439d':'#9fc6a1');
    c.fillStyle='#efb969'; c.beginPath(); c.arc(301,horizon-27,18,0,Math.PI*2); c.fill();
    // Draw far-to-near trapezoids; course position is shared with collisions.
    for(let i=35;i>0;i--) {
      const a=i/35*2600,b=(i-1)/35*2600, pa=this.project(roadCenter(sceneTime+a,g.course.path),a,horizon),pb=this.project(roadCenter(sceneTime+b,g.course.path),b,horizon);
      const aw=ROAD_HALF*W*.44*pa.scale,bw=ROAD_HALF*W*.44*pb.scale;
      poly(c,[[pa.x-aw-11*pa.scale,pa.y],[pa.x+aw+11*pa.scale,pa.y],[pb.x+bw+11*pb.scale,pb.y],[pb.x-bw-11*pb.scale,pb.y]],Math.floor((sceneTime/100+a/100))%2?'#f16b39':colors.cream);
      poly(c,[[pa.x-aw,pa.y],[pa.x+aw,pa.y],[pb.x+bw,pb.y],[pb.x-bw,pb.y]],i%2?g.course.road:'#385652');
      if (Math.floor((sceneTime/100+a/100))%4<2) poly(c,[[pa.x-2*pa.scale,pa.y],[pa.x+2*pa.scale,pa.y],[pb.x+2*pb.scale,pb.y],[pb.x-2*pb.scale,pb.y]],'#e9e4cf');
    }
    for(let i=8;i>0;i--) {
      const ahead=((i*410-time*.4)%3300+3300)%3300;if(ahead>2600)continue;
      const side=i%2?1:-1,p=this.project(roadCenter(time+ahead,g.course.path)+side*1.3,ahead,horizon);
      round(c,p.x-3*p.scale,p.y-40*p.scale,6*p.scale,40*p.scale,1,'#a5825b');
      c.fillStyle=i%3?'#438c72':'#6c9a6c'; c.beginPath(); c.ellipse(p.x,p.y-50*p.scale,22*p.scale,35*p.scale,0,0,Math.PI*2); c.fill();
    }
    for(const ob of [...g.course.cones].reverse()) {
      const ahead=ob.at-time;if(ahead< -120||ahead>2600)continue;
      const p=this.project(roadCenter(ob.at,g.course.path)+ob.offset,ahead,horizon),s=p.scale;
      c.fillStyle='#183c3c55';c.beginPath();c.ellipse(p.x,p.y,18*s,5*s,0,0,Math.PI*2);c.fill();
      poly(c,[[p.x,p.y-34*s],[p.x-15*s,p.y],[p.x+15*s,p.y]],colors.orange);
      poly(c,[[p.x-6*s,p.y-20*s],[p.x+6*s,p.y-20*s],[p.x+10*s,p.y-12*s],[p.x-10*s,p.y-12*s]],colors.cream);
    }
    // Traffic has an independent forward speed. Relative separation shrinks
    // as it approaches the player: avoid or overtake it near rival.at.
    for(const rival of [...g.course.traffic].reverse()) {
      const ahead=(rival.at-time)*(1-rival.speedRatio);
      if(ahead< -100||ahead>2600)continue;
      const x=roadCenter(time+ahead,g.course.path)+rival.offset+Math.sin((time-rival.at)*.0011+rival.seed)*.06;
      const p=this.project(x,ahead,horizon);
      toyCar(c,p.x,p.y-54*p.scale,104*p.scale,rival.color);
    }
    if(time>16300&&time<18800) {
      const p=this.project(0,18500-time,horizon),s=p.scale;
      poly(c,[[p.x-80*s,p.y],[p.x+80*s,p.y],[p.x+65*s,p.y-45*s],[p.x-65*s,p.y-45*s]],'#d5ae65');
      this.text('↑ ↑ ↑',p.x,p.y-15*s,Math.max(8,18*s),colors.ink);
    }
    if(time>17400) {
      const p=this.project(0,20000-time,horizon),s=p.scale;
      for(let x=-5;x<5;x++) for(let y=0;y<2;y++) round(c,p.x+x*26*s,p.y-y*18*s,26*s,18*s,0,(x+y)%2?colors.cream:colors.ink);
    }
    let carX=W/2+(g.x-this.pan)*W*.44, carY=533;
    const jump= time>=18500 && time<19800 ? Math.sin((time-18500)/1300*Math.PI) : 0;
    const scale=1+jump*.38;
    c.fillStyle='#142b2855'; c.beginPath(); c.ellipse(carX,582,43*(1-jump*.25),10,0,0,Math.PI*2);c.fill();
    if(Math.abs(g.steering)>.45&&!jump) {
      c.strokeStyle='#1f3533aa';c.lineWidth=5;c.beginPath();c.moveTo(carX-24,582);c.lineTo(carX-30-g.steering*20,610);c.moveTo(carX+24,582);c.lineTo(carX+30-g.steering*20,610);c.stroke();
      if(!reducedMotion) { c.fillStyle='#fff7dfaa';for(let i=0;i<3;i++){c.beginPath();c.arc(carX+g.steering*35+i*8,585+i*8,5+i*3,0,Math.PI*2);c.fill();} }
    }
    c.save();c.translate(carX,carY-jump*90);c.rotate(ending && !reducedMotion ? Math.min(1,ending/900)*Math.PI*2 : g.steering*.13);c.scale(scale,scale);
    if(g.car.id==='roadster'&&this.car.complete&&this.car.naturalWidth) c.drawImage(this.car,-54,-56,108,108);
    else toyCar(c,0,0,g.car.id==='kart'?96:115,g.car.color);
    c.restore();
    const event=g.flash,age=event?time-event.at:Infinity;
    if(event&&age<700&&!['MAX TILT','FACE LOST','FINISH!'].includes(event.type)) {
      round(c,94,horizon+38,172,48,9,event.type==='BONK!'?colors.orange:colors.cream);
      this.text(event.type,180,horizon+73,31,colors.ink);
      if(event.data.score)this.text(`+${event.data.score}`,180,horizon+108,20,colors.cream);
    }
    if (phase==='calibration') {
      this.text(motion.ready?(drive==='hands'?'↶ 👐 ↷':'← 🙂 →'):(drive==='hands'?'👐':'🙂'),180,horizon+60,28,colors.cream);
      this.text(motion.ready?(drive==='hands'?'TURN THE WHEEL':'TILT YOUR HEAD'):drive==='hands'?(locale==='ja'?'両手を見せてね':'SHOW BOTH HANDS'):(locale==='ja'?'正面を見てね':'LOOK STRAIGHT'),180,horizon+88,drive==='hands'?19:25,colors.cream);
      round(c,130,horizon+102,100,5,3,'#ffffff55');round(c,130,horizon+102,100*(motion.ready?Math.min(1,prep/1350):motion.progress??0),5,3,colors.orange);
    }
    if(phase==='countdown') this.text(String(Math.max(1,3-Math.floor(countdown/300))),180,horizon+105,96,colors.cream);
    if(phase==='ending'||phase==='result') {
      this.text('FINISH!',180,330,55,colors.cream);
      this.text('20.00 SEC',180,356,16,colors.cream);
      if(!reducedMotion)for(let i=0;i<40;i++){c.fillStyle=[colors.orange,colors.cream,'#efc761','#83c9be'][i%4];c.save();c.translate((i*73)%W,80+((ending*.21+i*43)%480));c.rotate(i+ending/400);c.fillRect(-3,-5,6,10);c.restore();}
    }
  }
}
