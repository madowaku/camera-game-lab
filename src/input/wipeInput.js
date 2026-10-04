import { HandLandmarker } from "@mediapipe/tasks-vision";
import { BodyInput } from "./bodyInput.js";
import { WipeTracker } from "../wipe/tracking.js";
export class WipeInput extends BodyInput {
  constructor(video,options={}){super(video,options);this.tracker=new WipeTracker();}
  createRecognizer(vision,delegate){return HandLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:"https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",delegate},runningMode:"VIDEO",numHands:2,minHandDetectionConfidence:.45,minHandPresenceConfidence:.45,minTrackingConfidence:.45});}
  inferFrame(timestamp){return this.recognizer.detectForVideo(this.video,timestamp);}
  processResult(result,at){this.tracker.update(result,at,this.video.videoWidth,this.video.videoHeight);}
  stop(){super.stop();this.tracker.reset();}
}
