import tickUrl from './assets/tick.ogg?inline';
export class ClockAudio {
  constructor() { this.context=null;this.enabled=true;this.buffer=null;this.token=0; }
  arm() {
    if(!this.enabled)return;
    try {
      const C=window.AudioContext??window.webkitAudioContext; if(!C)return;this.context??=new C();void this.context.resume().catch(()=>{});
      if(this.buffer||this.loading)return;this.loading=true;const context=this.context,token=this.token;
      void fetch(tickUrl).then(r=>r.arrayBuffer()).then(b=>context.decodeAudioData(b)).then(buffer=>{if(token===this.token){this.buffer=buffer;this.loading=false;}}).catch(()=>{if(token===this.token)this.loading=false;});
    } catch { /* Audio is optional. */ }
  }
  play(event) {
    const c=this.context;if(!this.enabled||c?.state!=='running')return;
    if(event.type==='correct'&&this.buffer){const source=c.createBufferSource(),gain=c.createGain();source.buffer=this.buffer;gain.gain.value=.7;source.connect(gain);gain.connect(c.destination);source.start();source.onended=()=>{source.disconnect();gain.disconnect();};}
    const notes=event.type==='correct'?(event.rushStarted?[660,880,1100,1320]:[660,990]):event.type==='finish'?[523,659,784]:[];
    notes.forEach((f,i)=>{const at=c.currentTime+i*.07,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(.07,at+.008);g.gain.exponentialRampToValueAtTime(.0001,at+.19);o.connect(g);g.connect(c.destination);o.start(at);o.stop(at+.2);o.onended=()=>{o.disconnect();g.disconnect();};});
  }
  stop() { ++this.token;const c=this.context;this.context=null;this.buffer=null;this.loading=false;if(c&&c.state!=='closed')void c.close().catch(()=>{}); }
}
