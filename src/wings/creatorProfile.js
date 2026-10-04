export const bodyWingsCreatorProfile = {
  brand: "BODY WINGS",
  WINGS_ON: { kind: "perfect", label: "WINGS ON!", duration: 650 },
  TUTORIAL_PASS: { kind: "perfect", label: "READY TO FLY", duration: 650 },
  PERFECT: { kind: "perfect", label: "PERFECT!", duration: 550 },
  GOOD: { kind: "perfect", label: "SHING!", duration: 400 },
  BOOST: { kind: "perfect", label: "BOOST!", duration: 900 },
  MISS: { kind: "fail", label: "WHOOSH!", duration: 450 },
  FINISH: { kind: "finish", label: "YOUR FLIGHT", duration: 800 },
};
export function selectFlightHighlight(frames, events) {
  if (!frames.length) return { frames: [], events: [], duration: 7000 };
  const best = [...events].sort((a, b) => (b.data.priority ?? 0) - (a.data.priority ?? 0) || b.at - a.at)[0];
  const first = frames[0].at, last = frames.at(-1).at;
  const start = Math.max(first, Math.min((best?.at ?? last) - 2500, last - 6000));
  return { frames: frames.filter(f => f.at >= start && f.at <= start + 6000), events: [], duration: 7000 };
}
