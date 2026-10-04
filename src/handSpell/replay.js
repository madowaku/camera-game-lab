// Seven seconds: memory cue 2s + actual input 2s + release/charge 1s + cast/reaction 2s.
// Only CREATOR records. At 135×240×12fps this caps raw frame memory below 24MB.
export class SpellReplay {
  constructor() { this.frames = []; this.lastAt = -Infinity; }
  capture(canvas, time, scene) {
    if (time - this.lastAt < 1000 / 12 || this.frames.length >= 182) return;
    const frame = document.createElement('canvas'); frame.width = 135; frame.height = 240;
    frame.getContext('2d').drawImage(canvas, 0, 0, 135, 240);
    this.frames.push({ canvas: frame, time, scene }); this.lastAt = time;
  }
  snapshot(faceMode, source) { return { frames: [...this.frames], faceMode, source, duration: 7000, windows: [[2000, 4000, 2000], [4000, 8000, 2000], [8000, 9850, 1000], [9850, 15000, 2000]] }; }
  dispose() { this.frames = []; this.lastAt = -Infinity; }
}
export function replayFrame(replay, elapsed) {
  let offset = 0, time = 15000;
  for (const [a, b, duration] of replay.windows) { if (elapsed < offset + duration) { time = a + (b - a) * Math.max(0, elapsed - offset) / duration; break; } offset += duration; }
  return replay.frames.findLast(f => f.time <= time) ?? replay.frames[0];
}
