export const counterCamCreatorProfile = { brand: 'COUNTER CAM' };
export function selectCounterHighlight(frames, events) {
  if (!frames.length) return { frames: [], events: [], duration: 7000 };
  const priorities = { KO: 5, 'MEGA PUNCH': 4, 'PERFECT COUNTER': 3, COUNTER: 2, 'JUST DODGE': 1 };
  const best = events.filter(e => priorities[e.type]).sort((a, b) => priorities[b.type] - priorities[a.type] || b.at - a.at)[0];
  const first = frames[0].at, last = frames.at(-1).at, start = Math.max(first, Math.min((best?.at ?? last) - 4200, last - 6000));
  return { frames: frames.filter(f => f.at >= start && f.at <= start + 6000), events: [], duration: 7000 };
}
