import Phaser from 'phaser';
export class ShowdownScene extends Phaser.Scene {
  constructor(view) { super('showdown'); this.view=view; }
  create() { this.paint=this.add.graphics(); this.labels=new Map(); }
  update(time) {
    const v=this.view;v.loop(time);if(!v.active)return;
    const g=v.game,{width:w,height:h}=this.scale, p=this.paint.clear();
    for(const [id,t] of this.labels)if(!g.enemies.some(e=>e.id===id)){t.destroy();this.labels.delete(id);}
    for(const e of g.enemies) {
      const enter=Math.min(1,(g.clock-e.born)/.18),motion=v.reducedMotion?0:1-enter,r=e.radius*w;
      const x=(e.x+(e.entrance==='side'?(e.x<.5?-.2:.2)*motion:e.entrance==='duo'?.08*motion:0))*w;
      const y=(e.y+(e.entrance==='drop'?-.15:e.entrance==='crate'?.10:e.entrance==='door'?.015:.035)*motion)*h;
      const color={enemy:0xef6350,quick:0xffc943,civilian:0x65dbeb,gold:0xffd875,boss:0x944fe1}[e.kind];
      p.fillStyle(0x342d30,.9).fillRoundedRect(x-r-6,y-r-8,r*2+12,r*2.3,8);
      p.lineStyle(4,color,1).strokeRoundedRect(x-r-6,y-r-8,r*2+12,r*2.3,8);
      p.fillStyle(color,1).fillCircle(x,y,r*.72);
      p.fillStyle(0xffedc2,1).fillCircle(x,y,r*.47);
      p.fillStyle(e.kind==='civilian'?0xffffff:0x473331,1).fillRoundedRect(x-r*.68,y-r*.66,r*1.36,r*.25,3).fillRoundedRect(x-r*.38,y-r,r*.76,r*.45,4);
      p.fillStyle(0x332d31,1).fillCircle(x-r*.17,y-r*.04,r*.055).fillCircle(x+r*.17,y-r*.04,r*.055);
      p.lineStyle(2,0x332d31,1).lineBetween(x-r*.13,y+r*.2,x+r*.13,y+r*.2);
      if(!this.labels.has(e.id))this.labels.set(e.id,this.add.text(0,0,'',{fontFamily:'sans-serif',fontSize:'12px',fontStyle:'bold',color:'#fff5d8',backgroundColor:'#342d30'}).setOrigin(.5));
      this.labels.get(e.id).setPosition(x,y+r*1.45).setText(e.kind==='civilian'?'SAFE ♥':e.kind==='boss'?'FINAL ★':e.kind==='gold'?'GOLD ★':e.kind==='quick'?'QUICK ⚡':'OUTLAW');
      if(g.clock>e.expires-.5&&e.kind==='enemy')p.lineStyle(3,0xffd875).strokeCircle(x,y,r*1.15);
    }
    const a=v.aim,age=(performance.now()-v.lastAim)/1000;
    if(v.source==='demo'||age<.8) {const x=a.x*w,y=a.y*h;p.lineStyle(2,0xffffff,age>.3&&v.source==='camera'?.35:1).strokeCircle(x,y,14).lineBetween(x-23,y,x-7,y).lineBetween(x+7,y,x+23,y).lineBetween(x,y-23,x,y-7).lineBetween(x,y+7,x,y+23);}
    for(const fx of v.effects) {
      const age=g.clock-fx.at;if(age>.5)continue;const alpha=1-age/.5;
      if(fx.type==='SHOT'){p.lineStyle(3,0xffef98,alpha).lineBetween(w*.5,h*.85,fx.x*w,fx.y*h);p.fillStyle(0xffffff,alpha*.5).fillCircle(w*.5,h*.85,18*alpha);}
      if(fx.type==='HIT'){p.lineStyle(4,0xffffff,alpha).strokeCircle(fx.x*w,fx.y*h,20+age*w*.12);if(!v.reducedMotion)for(let i=0;i<12;i++){const angle=i*Math.PI/6,d=age*w*.3;p.fillStyle(i%2?0xffd875:0x65dbeb,alpha).fillRect(fx.x*w+Math.cos(angle)*d,fx.y*h+Math.sin(angle)*d,5,5);}}
    }
  }
}
