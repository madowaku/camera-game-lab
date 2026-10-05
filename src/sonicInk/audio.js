import { frequency, clamp } from './core.js';
export class SonicInkAudio {
  constructor(){this.context=null;this.enabled=true;this.voices=new Set();this.failed=false;}
  arm(){
    if(!this.context){const Ctor=globalThis.AudioContext??globalThis.webkitAudioContext;if(!Ctor){this.failed=true;return;}
      try{
        const c=this.context=new Ctor();this.master=c.createGain();this.master.gain.value=.32;
        this.compressor=c.createDynamicsCompressor();this.compressor.threshold.value=-15;this.compressor.ratio.value=5;
        this.analyser=c.createAnalyser();this.analyser.fftSize=256;
        this.master.connect(this.compressor);this.compressor.connect(this.analyser);this.analyser.connect(c.destination);
        this.delay=c.createDelay(.5);this.delay.delayTime.value=.17;this.wet=c.createGain();this.wet.gain.value=.16;
        this.feedback=c.createGain();this.feedback.gain.value=.16;this.master.connect(this.delay);this.delay.connect(this.wet);this.wet.connect(this.compressor);this.delay.connect(this.feedback);this.feedback.connect(this.delay);
      }catch{this.failed=true;this.dispose();return;}
    }
    const token=this.context;void token.resume().catch(()=>{if(this.context===token)this.failed=true;});
  }
  note(n){
    const c=this.context;if(!this.enabled||!c||c.state!=='running')return;
    while(this.voices.size>=10)this.stopVoice(this.voices.values().next().value);
    const at=c.currentTime+.008,speed=clamp(n.speed??.3,0,1.5)/1.5;
    const envelope=c.createGain(),filter=c.createBiquadFilter(),pan=c.createStereoPanner();
    filter.type='lowpass';filter.frequency.value=1600+(clamp(n.depth??0,-.5,.5)+.5)*1900+speed*1200;
    pan.pan.value=clamp(n.pan??0,-1,1);
    envelope.gain.setValueAtTime(.0001,at);envelope.gain.exponentialRampToValueAtTime(.12+speed*.1,at+.028-speed*.018);envelope.gain.exponentialRampToValueAtTime(.0001,at+.55);
    envelope.connect(filter);filter.connect(pan);pan.connect(this.master);
    const oscillators=[];
    for(const [ratio,volume]of [[1,1],[2,.18],[3,.055]]){
      const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=frequency(n.note)*ratio;g.gain.value=volume;o.connect(g);g.connect(envelope);o.start(at);o.stop(at+.58);oscillators.push({o,g});
    }
    if(n.spark){const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=frequency(n.note)*4;g.gain.setValueAtTime(.065,at);g.gain.exponentialRampToValueAtTime(.0001,at+.19);o.connect(g);g.connect(pan);o.start(at);o.stop(at+.22);oscillators.push({o,g});}
    const voice={oscillators,envelope,filter,pan};this.voices.add(voice);
    oscillators[0].o.onended=()=>this.stopVoice(voice);
  }
  stopVoice(voice){if(!this.voices.delete(voice))return;for(const {o,g}of voice.oscillators){o.onended=null;try{o.stop();}catch{}o.disconnect();g.disconnect();}voice.envelope.disconnect();voice.filter.disconnect();voice.pan.disconnect();}
  silence(){for(const v of [...this.voices])this.stopVoice(v);if(this.context){this.wet.gain.cancelScheduledValues(this.context.currentTime);this.wet.gain.setValueAtTime(0,this.context.currentTime);}}
  resume(){this.arm();if(this.context)this.wet.gain.setValueAtTime(.16,this.context.currentTime);}
  setEnabled(value){this.enabled=value;if(!value)this.silence();else this.resume();}
  dispose(){this.silence();const c=this.context;this.context=null;for(const key of ['master','compressor','analyser','delay','wet','feedback'])this[key]=null;if(c)void c.close().catch(()=>{});}
}
