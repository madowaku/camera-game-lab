export const noteEaterCreatorProfile = {
  brand: "NOTE EATER",
  FIRST_EAT: { kind: "perfect", label: "PAK!", duration: 700 },
  FAST_3_EATS: { kind: "perfect", label: "FEEL THE GROOVE", duration: 1100, slow: .5 },
  GROOVE_50: { kind: "perfect", label: "GROOVING!", duration: 900 },
  GROOVE_80: { kind: "perfect", label: "MUSIC IS YOU", duration: 1000 },
  BIG_NOTE: { kind: "perfect", label: "BIG BITE!", duration: 750 },
  FINAL_EAT: { kind: "finish", label: "YOUR MELODY", duration: 1000 },
  faceEffect(c, { x, y, width, eyeY, mouth, open }) {
    c.save(); c.fillStyle = "#efbb3d";
    for (const dx of [-.55, .55]) { c.beginPath(); c.arc(x + width * dx, eyeY, width * .1, 0, Math.PI * 2); c.fill(); }
    c.strokeStyle = "#e96f51"; c.lineWidth = 3; c.beginPath(); c.arc(x, y, width * .62, Math.PI, Math.PI * 2); c.stroke();
    if (open) { c.strokeStyle = "#efbb3d"; c.beginPath(); c.arc(mouth.x, mouth.y, width * .2, 0, Math.PI * 2); c.stroke(); }
    c.restore();
  },
};

// Replay's shared player uses the provided frames; feed it one continuous
// six-second window plus its one-second outro. Prefer three bites at groove 80.
export function selectNoteEaterHighlight(frames, events) {
  if (!frames.length) return { frames: [], events: [] };
  const chosen = events.filter(e => e.type === "FAST_3_EATS" && e.data.priority === 100).at(-1)
    ?? [...events].sort((a, b) => (b.data.priority ?? 0) - (a.data.priority ?? 0))[0];
  const first = frames[0].at, last = frames.at(-1).at;
  const start = Math.max(first, Math.min((chosen?.at ?? last) - 2000, last - 6000));
  return { frames: frames.filter(f => f.at >= start && f.at <= start + 6000), events: [] };
}
