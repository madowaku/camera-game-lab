export const ROUND_MS = 15000;
export const MAX_STROKES = 3;
export const MAX_POINTS = 640;
export const PLAY_SPEED = .46; // normalized screen distance per second
export const W = 540, H = 960;
export const NOTES = ['C4','D4','E4','G4','A4','C5','D5','E5','G5','A5'];
export const MIDI = [60,62,64,67,69,72,74,76,79,81];
export const INKS = ['#ff8dbd','#ffd784','#8ee8d0','#aabaff','#d0a7ff'];
export const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
export const distance = (a,b) => Math.hypot((a.x-b.x)*W/H,a.y-b.y,(a.z-b.z)*.12);
export const noteAt = y => clamp(Math.floor((1-y)*10),0,9);
export const frequency = note => 440*2**((MIDI[note]-69)/12);

export function sampleStroke(stroke, at) {
  const points = stroke.points;
  if (!points.length) return null;
  at = clamp(at,0,stroke.length);
  let lo=0, hi=points.length-1;
  while(lo<hi){const mid=Math.floor((lo+hi)/2);if(points[mid].distance<at)lo=mid+1;else hi=mid;}
  const b=points[lo],a=points[Math.max(0,lo-1)],t=b.distance===a.distance?0:(at-a.distance)/(b.distance-a.distance);
  return { x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t,note:b.note,speed:b.speed,curve:b.curve };
}
export function isClosed(stroke) {
  // Depth is deliberately not a loop-scoring condition on a monocular camera.
  if(stroke.points.length<12||stroke.length<.45)return false;
  const a=stroke.points[0],b=stroke.points.at(-1);
  const xs=stroke.points.map(p=>p.x),ys=stroke.points.map(p=>p.y);
  return Math.hypot((a.x-b.x)*W/H,a.y-b.y)<.065 && Math.max(...xs)-Math.min(...xs)>.12 && Math.max(...ys)-Math.min(...ys)>.12;
}

export class SonicInkGame {
  constructor(){this.phase='ready';this.elapsed=0;this.strokes=[];this.current=null;this.events=[];this.playback=null;this.paused=false;this.serial=0;this.sparkCount=0;}
  get remaining(){return Math.max(0,ROUND_MS-this.elapsed);}
  get cursor(){const p=this.playback;return p?{...sampleStroke(p.strokes[p.index],p.distance),stroke:p.strokes[p.index],progress:p.distance/Math.max(.001,p.strokes[p.index].length)}:null;}
  emit(type,detail={}){this.events.push({type,...detail});}
  drain(){const events=this.events;this.events=[];return events;}
  add(position,at){
    if(this.paused||this.phase==='review'||!position||!Number.isFinite(at)||!['x','y','z'].every(k=>Number.isFinite(position[k]))||position.x<0||position.x>1||position.y<0||position.y>1)return false;
    if(!this.current){
      if(this.strokes.length>=MAX_STROKES)return false;
      this.phase='playing';this.stopPlayback();
      this.current={id:++this.serial,points:[],notes:[],length:0,closed:false,complete:false,lastNoteAt:-Infinity,lastSparkAt:-Infinity};
      this.strokes.push(this.current);this.emit('start',{stroke:this.current});
    }
    const s=this.current,prev=s.points.at(-1),p={x:position.x,y:position.y,z:clamp(position.z,-.5,.5)};
    const moved=prev?distance(p,prev):0;
    if(prev&&moved<.004)return false;
    if(prev&&moved>.19){this.end('jump');return false;}
    if(s.points.length>=MAX_POINTS){this.end('capacity');return false;}
    let note=noteAt(p.y);
    if(prev&&note!==prev.note&&p.y>(1-(prev.note+1)/10)-.012&&p.y<(1-prev.note/10)+.012)note=prev.note;
    const speed=prev?clamp(moved/Math.max(.012,(at-prev.at)/1000),0,2):.3;
    const before=s.points.at(-2);
    let curve=0;
    if(before&&moved>.006){const ax=(prev.x-before.x)*W/H,ay=prev.y-before.y,bx=(p.x-prev.x)*W/H,by=p.y-prev.y;const norm=Math.hypot(ax,ay)*Math.hypot(bx,by);curve=norm>.00001?Math.acos(clamp((ax*bx+ay*by)/norm,-1,1))/Math.PI:0;}
    s.length+=moved;
    const point={...p,at,t:this.elapsed,distance:s.length,note,speed,curve};s.points.push(point);
    const spark=curve>.24&&at-s.lastSparkAt>=220;
    if(!prev||spark||at-s.lastNoteAt>=(note!==prev.note?125:240)){
      if(spark){s.lastSparkAt=at;this.sparkCount++;}
      const event={note,pan:clamp(p.x*2-1,-1,1),depth:p.z,speed,curve,spark,distance:s.length,t:this.elapsed};
      s.notes.push(event);s.lastNoteAt=at;this.emit('note',{...event,source:'draw',position:point});
    }
    return true;
  }
  end(reason='release'){
    const s=this.current;if(!s)return null;this.current=null;
    if(s.points.length<2||s.length<.015){this.strokes.pop();this.emit('discard');return null;}
    s.complete=true;s.closed=isClosed(s);
    this.emit('finish-stroke',{stroke:s,reason});
    if(s.closed)this.emit('loop',{stroke:s});
    if(this.strokes.length>=MAX_STROKES)this.finish();else this.play([s],s.closed);
    return s;
  }
  finish(){
    if(this.phase==='review')return;
    if(this.current){const s=this.current;this.current=null;if(s.points.length>=2&&s.length>=.015){s.complete=true;s.closed=isClosed(s);this.emit('finish-stroke',{stroke:s,reason:'time'});if(s.closed)this.emit('loop',{stroke:s});}else this.strokes.pop();}
    this.phase='review';this.emit('review');this.play(this.strokes,this.strokes.some(s=>s.closed));
  }
  play(strokes=this.strokes,repeat=strokes.some(s=>s.closed)){
    this.stopPlayback();if(!strokes.length)return;
    this.playback={strokes:[...strokes],index:0,distance:0,noteIndex:0,repeat,pass:0};
    this.emit('playback');this.playNotes();
  }
  stopPlayback(){if(this.playback)this.emit('silence');this.playback=null;}
  playNotes(){
    const p=this.playback;if(!p)return;const s=p.strokes[p.index];
    while(p.noteIndex<s.notes.length&&s.notes[p.noteIndex].distance<=p.distance+.00001){const n=s.notes[p.noteIndex++];this.emit('note',{...n,source:'playback',position:sampleStroke(s,n.distance)});}
  }
  tick(dt){
    if(this.paused)return;dt=clamp(Number(dt)||0,0,ROUND_MS);
    if(this.phase==='playing'){this.elapsed=Math.min(ROUND_MS,this.elapsed+dt);if(this.elapsed>=ROUND_MS)this.finish();}
    const p=this.playback;if(!p)return;
    let travel=PLAY_SPEED*dt/1000;
    while(this.playback&&travel>0){
      const s=p.strokes[p.index],step=Math.min(travel,s.length-p.distance);p.distance+=step;travel-=step;this.playNotes();
      if(p.distance>=s.length-.000001){
        if(++p.index>=p.strokes.length){if(!p.repeat){this.playback=null;this.emit('playback-end');break;}p.index=0;p.pass++;}
        p.distance=0;p.noteIndex=0;this.playNotes();
      }
    }
  }
  undo(){this.current=null;this.stopPlayback();const s=this.strokes.pop();if(s)this.emit('undo',{stroke:s});}
  clear(){this.current=null;this.stopPlayback();this.strokes=[];this.emit('clear');}
  pause(){this.paused=true;this.emit('silence');}
  resume(){this.paused=false;}
}
