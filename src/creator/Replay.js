import { replayFrames } from "./HighlightEvent.js";
export class Replay {
  constructor(canvas,{frames,events,brand="",duration=7000}) {
    this.canvas=canvas;this.frames=replayFrames(frames,events);this.brand=brand;this.duration=duration;this.generation=0;
    canvas.width=270;canvas.height=480;
  }
  play() {
    this.stop();this.started=performance.now();this.index=-1;const token=this.generation;
    const tick=now=>{
      if(token!==this.generation)return;
      const elapsed=now-this.started;
      if(!this.frames.length||elapsed>=this.duration-1000){this.outro();}
      else if(this.frames.length){const index=Math.min(this.frames.length-1,Math.floor(elapsed/(this.duration-1000)*this.frames.length));if(index!==this.index){this.index=index;void this.paint(this.frames[index].blob,token,index);}}
      if(elapsed<this.duration)this.raf=requestAnimationFrame(tick);else this.raf=null;
    };
    this.raf=requestAnimationFrame(tick);
  }
  async paint(blob,token,index) {
    let bitmap,url;
    try {
      if(typeof createImageBitmap === "function") bitmap=await createImageBitmap(blob);
      else { url=URL.createObjectURL(blob);bitmap=new Image();bitmap.src=url;await bitmap.decode(); }
      if(token===this.generation&&index===this.index&&performance.now()-this.started<this.duration-1000){const c=this.canvas.getContext("2d");c.clearRect(0,0,270,480);c.drawImage(bitmap,0,0,270,480);}
    }
    catch { if(token===this.generation)this.outro(); }
    finally { bitmap?.close?.();if(url)URL.revokeObjectURL(url); }
  }
  outro() {
    const c=this.canvas.getContext("2d");c.fillStyle="#fff7eb";c.fillRect(0,0,270,480);c.textAlign="center";
    c.fillStyle="#a9404d";c.font="900 35px sans-serif";c.fillText(this.brand||"CREATOR",135,235);c.fillStyle="#583a2d";c.font="14px sans-serif";c.fillText("camera-game-lab",135,275);
  }
  stop() { ++this.generation;cancelAnimationFrame(this.raf);this.raf=null; }
  dispose() { this.stop();this.frames=[];this.canvas.width=0; }
}
