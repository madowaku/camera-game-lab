import shotUrl from '../rockPaperBoom/assets/impact.ogg';
import reloadUrl from '../hook/assets/cast.ogg';
export class ShowdownAudio {
  constructor(){this.enabled=true;this.sounds=[new Audio(shotUrl),new Audio(reloadUrl)];this.sounds.forEach(a=>a.volume=.35);}
  arm(){const C=globalThis.AudioContext??globalThis.webkitAudioContext;if(C){this.context??=new C();void this.context.resume().catch(()=>{});}}
  tone(hz,duration=.12){if(!this.enabled||!this.context||this.context.state!=='running')return;const o=this.context.createOscillator(),gain=this.context.createGain(),now=this.context.currentTime;o.frequency.setValueAtTime(hz,now);gain.gain.setValueAtTime(.06,now);gain.gain.exponentialRampToValueAtTime(.001,now+duration);o.connect(gain);gain.connect(this.context.destination);o.start(now);o.stop(now+duration);}
  play(e){if(!this.enabled)return;if(['SHOT','RELOAD'].includes(e.type)){const a=this.sounds[e.type==='SHOT'?0:1];a.currentTime=0;void a.play().catch(()=>{});}if(e.type==='HIT'){this.tone(e.label==='LIGHTNING'?1100:780);if(e.kind==='boss'){this.tone(220,.6);this.tone(330,.6);this.tone(440,.6);}}if(e.type==='TICK')this.tone(420,.045);}
  stop(){this.sounds.forEach(a=>{a.pause();a.currentTime=0;});if(this.context?.state==='running')void this.context.suspend().catch(()=>{});}
}
