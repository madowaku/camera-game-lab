export const CREATOR_SIZE = Object.freeze({ width: 270, height: 480 });
export function cameraPoint(point, videoWidth, videoHeight, width, height) {
  if (!point || !videoWidth || !videoHeight) return null;
  const scale=Math.max(width/videoWidth,height/videoHeight);
  return {x:1-(point.x*videoWidth*scale-(videoWidth*scale-width)/2)/width,
    y:(point.y*videoHeight*scale-(videoHeight*scale-height)/2)/height};
}
export function drawCamera(ctx,video,width,height) {
  if(video.readyState<2||!video.videoWidth||!video.videoHeight)return;
  const scale=Math.max(width/video.videoWidth,height/video.videoHeight),vw=video.videoWidth*scale,vh=video.videoHeight*scale;
  ctx.save();ctx.translate(width,0);ctx.scale(-1,1);
  try { ctx.drawImage(video,(width-vw)/2,(height-vh)/2,vw,vh); } catch { /* A newly granted camera may not have decoded its first frame yet. */ }
  finally { ctx.restore(); }
}
