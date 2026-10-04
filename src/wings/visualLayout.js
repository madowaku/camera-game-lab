// Presentation coordinates only. Both renderers land each ring at the same
// shoulder plane; BodyWingsGame remains the sole owner of ring grading.
export function projectFlightRing(ring) {
  const p = Math.max(0, Math.min(1, ring.progress));
  const scale = .13 + .87 * p ** 2;
  return {
    x: .5 + (ring.x - .5) * scale,
    y: .19 + .5 * p ** 1.6,
    radius: .018 + .165 * p ** 2,
    depth: .9 * (1 - p),
  };
}
