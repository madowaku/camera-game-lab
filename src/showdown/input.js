import { FingerGunInput } from '../input/fingerGunInput.js';
export class ShowdownInput extends FingerGunInput {
  processResult(result,at) {
    const hand=result?.hand?.landmarks?.[0];
    const width=this.video.clientWidth||this.video.videoWidth||1,height=this.video.clientHeight||this.video.videoHeight||1;
    const sourceWidth=this.video.videoWidth||width,sourceHeight=this.video.videoHeight||height;
    const renderedHeight=sourceHeight*Math.max(width/sourceWidth,height/sourceHeight);
    this.lowered=!!hand && (hand[0].y*renderedHeight-(renderedHeight-height)/2)/height>.78;
    const points=result?.face?.faceLandmarks?.[0];
    this.faceBox=points?.length?{x:Math.min(...points.map(p=>p.x)),y:Math.min(...points.map(p=>p.y)),w:Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x)),h:Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y))}:null;
    super.processResult(result,at);
  }
  stop() { this.lowered=false;this.faceBox=null; super.stop(); }
}
