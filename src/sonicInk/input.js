import { HandLandmarker } from '@mediapipe/tasks-vision';
import { BodyInput } from '../input/bodyInput.js';
export class SonicInkInput extends BodyInput {
  constructor(video,options){super(video,options);this.trackingEnabled=true;this.lastInference=-Infinity;}
  createRecognizer(vision,delegate){return HandLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',delegate},runningMode:'VIDEO',numHands:1,minHandDetectionConfidence:.5,minHandPresenceConfidence:.5,minTrackingConfidence:.5});}
  inferFrame(at){if(!this.trackingEnabled||at-this.lastInference<40)return null;this.lastInference=at;return this.recognizer.detectForVideo(this.video,at);}
  processResult(result,at){if(result)this.onResult(result,at);}
  stop(){super.stop();this.lastInference=-Infinity;}
}
