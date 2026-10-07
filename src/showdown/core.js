export const POSITIONS = [[.18,.23],[.5,.2],[.82,.23],[.18,.43],[.82,.43],[.22,.64],[.78,.64]];
export class ShowdownGame {
  constructor(random = Math.random) { this.random = random; this.reset(); }
  reset() { Object.assign(this,{clock:0,phase:'ready',paused:false,ammo:6,score:0,combo:0,bestCombo:0,shots:0,hits:0,quick:0,final:false,enemies:[],events:[],next:0,id:0,lastPosition:-1,lastShot:-Infinity,reloadAge:0,reloadLatched:false,result:null}); }
  start() { if(this.phase !== 'ready') return; this.phase='normal'; this.spawn('enemy',0,4);this.next=1.5; }
  emit(type,data={}) { this.events.push({type,time:this.clock,...data}); }
  takeEvents() { return this.events.splice(0); }
  spawn(kind='enemy',position=null,life=null) {
    let p=position ?? Math.floor(this.random()*POSITIONS.length); if(p===this.lastPosition) p=(p+3)%POSITIONS.length; this.lastPosition=p;
    const [x,y]=kind==='boss'?[.5,.37]:POSITIONS[p];
    const easy=this.shots>=5&&this.hits/this.shots<.35;
    this.enemies.push({id:++this.id,kind,x,y,born:this.clock,activeAt:this.clock+.18,expires:this.clock+(life ?? ({quick:1,gold:.7,civilian:2,boss:3}[kind] ?? 2.1))*(easy&&life===null?1.15:1),radius:(kind==='boss'?.15:.085)*(easy?1.1:1),entrance:['window','door','crate','side','drop','duo'][this.id%6]});
  }
  step(dt) {
    if(this.paused || ['ready','result'].includes(this.phase)) return;
    const before=this.clock; this.clock=Math.min(30,this.clock+Math.max(0,dt));
    if(before<8&&this.clock>=8&&this.clock<23)this.spawn('gold');
    if(before<19&&this.clock>=19&&this.clock<23)this.spawn('gold');
    if(before<15 && this.clock>=15) { this.phase='rush'; this.emit('RUSH'); }
    if(before<23 && this.clock>=23) { this.phase='high-noon'; this.enemies=[]; for(let i=0;i<5;i++) {this.spawn('enemy',i,4); this.enemies.at(-1).activeAt=24;} this.emit('HIGH NOON'); }
    if(before<24 && this.clock>=24) this.emit('DRAW');
    if(before<27 && this.clock>=27) { this.phase='final'; this.enemies=[]; this.ammo=6; this.spawn('boss',0,3); this.emit('FINAL SHOT'); }
    for(const e of this.enemies.filter(e=>e.expires<=this.clock)) { if(e.kind!=='civilian') { this.combo=0; if(e.kind==='enemy') {this.score=Math.max(0,this.score-200); this.emit('ATTACK',e);} } }
    this.enemies=this.enemies.filter(e=>e.expires>this.clock);
    if(this.clock<23 && this.clock>=this.next) {
      const i=Math.floor(this.clock); const kind=i>7&&i%4===0?'civilian':i>15&&i%3===0?'quick':'enemy';
      this.spawn(kind); if(i>10&&i%3===0) this.spawn('enemy'); this.next=this.clock+(this.clock<10?1.5:this.clock<15?1.15:.85);
    }
    if(this.clock>=30) this.finish();
  }
  reload(lowered,dt) {
    if(!lowered) {this.reloadAge=0;this.reloadLatched=false;return;}
    if(this.paused || ['ready','result'].includes(this.phase) || this.reloadLatched) return;
    this.reloadAge+=dt; if(this.reloadAge>=.3) {this.reloadLatched=true;this.reloadAge=0;if(this.ammo<6) {this.ammo=6;this.emit('RELOAD');}}
  }
  shoot(aim) {
    if(this.paused || ['ready','result'].includes(this.phase) || this.clock-this.lastShot<.25 || this.phase==='high-noon'&&this.clock<24) return false;
    if(!this.ammo) {this.emit('EMPTY');return false;} this.lastShot=this.clock;this.ammo--;this.shots++;
    const assist=this.phase==='high-noon'?.055:.035;
    const candidates=this.enemies.filter(e=>this.clock>=e.activeAt&&Math.hypot((aim.x-e.x), (aim.y-e.y)*16/9)<=e.radius+assist).sort((a,b)=>Math.hypot(aim.x-a.x,aim.y-a.y)-Math.hypot(aim.x-b.x,aim.y-b.y));
    const e=candidates[0];this.emit('SHOT',{x:aim.x,y:aim.y});
    if(!e) {this.combo=0;this.emit('MISS');return true;} this.enemies=this.enemies.filter(v=>v!==e);
    if(e.kind==='civilian') {this.score=Math.max(0,this.score-500);this.combo=0;this.emit('CIVILIAN',{...e,points:-500});return true;}
    this.hits++;this.combo++;this.bestCombo=Math.max(this.combo,this.bestCombo);
    const reaction=this.clock-e.activeAt, label=reaction<.35?'LIGHTNING':reaction<.55?'QUICK DRAW':reaction<.85?'FAST':'HIT';
    if(reaction<.55)this.quick++;
    const bonus=reaction<.35?300:reaction<.55?150:reaction<.85?50:0;
    const base={enemy:100,quick:300,gold:1000,boss:1500}[e.kind];
    const multiplier=this.combo>=10?2:this.combo>=7?1.5:this.combo>=4?1.2:1;
    const points=Math.round((base+bonus)*multiplier);this.score+=points;
    if(e.kind==='boss')this.final=true;this.emit('HIT',{...e,points,label});return true;
  }
  finish() {this.phase='result';this.result={score:this.score,bestCombo:this.bestCombo,quick:this.quick,accuracy:this.shots?Math.round(this.hits/this.shots*100):0,final:this.final,elapsed:30,title:this.score>=6500?'OUTLAW LEGEND':this.score>=3500?'QUICK DRAW':this.score>=1500?'SHARPSHOOTER':'NEW HAND'};this.emit('COMPLETE');}
}
