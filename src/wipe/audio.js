import wipe from "./assets/sfx/wipe.ogg";
import drop from "./assets/sfx/drop.ogg";
import shine from "./assets/sfx/shine.ogg";
const samples={wipe,drop,shine};
export class WipeAudio {
  constructor(){this.enabled=true;this.buffers={};this.nodes=new Set();this.last=-Infinity;this.generation=0;}
  arm(){
    if(!this.enabled)return;
    try{
      const C=window.AudioContext??window.webkitAudioContext;if(!C)return;
      this.context??=new C();void this.context.resume().catch(()=>{});
      const token=this.generation,context=this.context;
      if(!this.loading){this.loading=true;for(const [key,url] of Object.entries(samples))void fetch(url).then(r=>{if(!r.ok)throw Error("audio");return r.arrayBuffer();}).then(b=>context.decodeAudioData(b)).then(b=>{if(token===this.generation)this.buffers[key]=b;}).catch(()=>{});}
    }catch{}
  }
  sample(key,volume=.15,rate=1){
    if(!this.enabled||this.context?.state!=="running"||!this.buffers[key])return;
    const node=this.context.createBufferSource(),gain=this.context.createGain();node.buffer=this.buffers[key];node.playbackRate.value=rate;gain.gain.value=volume;
    node.connect(gain);gain.connect(this.context.destination);this.nodes.add(node);node.onended=()=>{this.nodes.delete(node);node.disconnect();gain.disconnect();};node.start();
  }
  tone(frequency,delay=0,duration=.18,volume=.045){
    if(!this.enabled||this.context?.state!=="running")return;
    const c=this.context,o=c.createOscillator(),g=c.createGain(),at=c.currentTime+delay;o.type="sine";o.frequency.setValueAtTime(frequency,at);o.frequency.exponentialRampToValueAtTime(frequency*1.12,at+duration);
    g.gain.setValueAtTime(volume,at);g.gain.exponentialRampToValueAtTime(.001,at+duration);o.connect(g);g.connect(c.destination);this.nodes.add(o);o.onended=()=>{this.nodes.delete(o);o.disconnect();g.disconnect();};o.start(at);o.stop(at+duration);
  }
  play(event){
    if(event.type==="wipe"&&event.at-this.last>140){this.last=event.at;this.sample("wipe",.1,1.25);}
    if(event.type==="splash"||event.type==="patch")this.sample("drop",event.type==="splash"?.32:.18,.8);
    if(event.type==="sparkle")this.sample("shine",.15,1.2);
    if(event.type==="ready")this.tone(440);
    if(event.type==="start")this.tone(660);
    if(event.type==="perfect"){this.sample("wipe",.22,1.8);[523.25,659.25,783.99,1046.5].forEach((f,i)=>this.tone(f,.10+i*.085,.6,.07));this.sample("shine",.3);}
    if(event.type==="time")this.tone(330,0,.3);
  }
  pause(){for(const node of this.nodes){try{node.stop();}catch{}}this.nodes.clear();}
  setEnabled(value){this.enabled=value;if(value)this.arm();else this.pause();}
  stop(){++this.generation;this.pause();const c=this.context;this.context=null;this.buffers={};this.loading=false;this.last=-Infinity;if(c&&c.state!=="closed")void c.close().catch(()=>{});}
}
