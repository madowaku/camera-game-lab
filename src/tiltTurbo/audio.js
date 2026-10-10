import bonkUrl from './assets/bonk.ogg';
export class TiltTurboAudio {
  constructor(){this.enabled=true;this.context=null;this.buffers={};this.generation=0;}
  arm() {
    try {
      const C=window.AudioContext??window.webkitAudioContext;if(!this.enabled||!C)return;
      this.context??=new C();void this.context.resume().catch(()=>{});
      if(!this.loading){this.loading=true;const c=this.context,token=this.generation;
        void fetch(bonkUrl).then(r=>r.arrayBuffer()).then(b=>c.decodeAudioData(b)).then(b=>{if(token===this.generation)this.buffers.bonk=b;}).catch(()=>{});}
    } catch { /* Optional audio. */ }
  }
  tone(a,b,duration,volume,type='sine',delay=0){
    const c=this.context;if(!this.enabled||c?.state!=='running')return;
    const o=c.createOscillator(),g=c.createGain(),at=c.currentTime+delay;o.type=type;o.frequency.setValueAtTime(a,at);o.frequency.exponentialRampToValueAtTime(b,at+duration);
    g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(volume,at+.008);g.gain.exponentialRampToValueAtTime(.0001,at+duration);o.connect(g);g.connect(c.destination);o.start(at);o.stop(at+duration+.01);o.onended=()=>{o.disconnect();g.disconnect();};
  }
  stop(){++this.generation;const c=this.context;this.context=null;this.buffers={};this.loading=false;if(c&&c.state!=='closed')void c.close().catch(()=>{});}
  play(event) {
    const c=this.context;if(!this.enabled||c?.state!=='running')return;
    if(event.type==='BONK!') { const b=this.buffers.bonk;if(b){const s=c.createBufferSource(),g=c.createGain();s.buffer=b;g.gain.value=.25;s.connect(g);g.connect(c.destination);s.start();s.onended=()=>{s.disconnect();g.disconnect();};}this.tone(120,45,.18,.06,'triangle'); }
    if(event.type==='SKRRRT!')this.tone(440,95,.20,.025,'sawtooth');
    if(event.type==='NICE!'){this.tone(880,1320,.12,.055);this.tone(1320,1760,.15,.04,'sine',.08);}
    if(['PASS!','CLOSE PASS!','REPASS!'].includes(event.type)){
      this.tone(660,990,.13,.045,'triangle');this.tone(990,1485,.20,.035,'triangle',.10);
    }
    if(event.type==='JUMP!')this.tone(240,1200,.6,.045,'triangle');
    if(['GO!','FINISH!'].includes(event.type))[523,659,784,1047].forEach((f,i)=>this.tone(f,f,.2,.04,'triangle',i*.08));
    if(['LEFT!','RIGHT!'].includes(event.type))this.tone(600,600,.09,.035,'triangle');
  }
}
