import { WIDTH, HEIGHT, contains } from "./shapes.js";
const clamp = (v) => Math.max(0, Math.min(1, v));
export function gradeFit(coverage, spill, angleFit = 1) {
  const fit = clamp(coverage * (1 - .4 * spill - .15 * (1 - angleFit)));
  return { fit, grade: fit >= .86 ? "PERFECT" : fit >= .5 ? "GREAT" : "GOOD" };
}
// Low-resolution RGB difference, with global exposure compensation. This is a
// permissive hint, not object recognition or a claim of scene registration.
export function compareFrames(reference, current, shape) {
  const empty = { coverage: 0, spill: 0, angleError: null, fit: 0, grade: "GOOD", reason: "unavailable" };
  if (!reference || !current || reference.width !== current.width || reference.height !== current.height) return empty;
  const { width, height, data } = current, ref = reference.data;
  let n = 0, light = 0; const offset = [0, 0, 0];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4; light += (data[i] + data[i + 1] + data[i + 2]) / 3;
    if (contains(shape, (x + .5) * WIDTH / width, (y + .5) * HEIGHT / height, 1.8)) continue;
    for (let c = 0; c < 3; c++) offset[c] += data[i + c] - ref[i + c];
    n++;
  }
  offset.forEach((v, c) => { offset[c] = v / Math.max(1, n); });
  let inside = 0, occupied = 0, halo = 0, outside = 0, far = 0, farChanged = 0;
  const points = [];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4, px = (x + .5) * WIDTH / width, py = (y + .5) * HEIGHT / height;
    const difference = (Math.abs(data[i] - ref[i] - offset[0]) + Math.abs(data[i + 1] - ref[i + 1] - offset[1]) + Math.abs(data[i + 2] - ref[i + 2] - offset[2])) / 3;
    const changed = difference > 25, inShape = contains(shape, px, py), inHalo = contains(shape, px, py, 1.65);
    if (inShape) { inside++; if (changed) occupied++; }
    else if (inHalo) { halo++; if (changed) outside++; }
    else { far++; if (changed) farChanged++; }
    if (changed && inHalo) points.push([px, py]);
  }
  let angleError = null, angleFit = 1;
  if (shape.kind === "bar" && points.length > 6) {
    const mx = points.reduce((s, p) => s + p[0], 0) / points.length, my = points.reduce((s, p) => s + p[1], 0) / points.length;
    let xx = 0, yy = 0, xy = 0;
    for (const [x, y] of points) { xx += (x - mx) ** 2; yy += (y - my) ** 2; xy += (x - mx) * (y - my); }
    const angle = Math.atan2(2 * xy, xx - yy) * 90 / Math.PI;
    const delta = Math.abs(angle - shape.angle) % 180; angleError = Math.min(delta, 180 - delta); angleFit = clamp(1 - angleError / 60);
  }
  const coverage = occupied / Math.max(1, inside), spill = outside / Math.max(1, halo);
  const reason = light / (width * height) < 28 ? "dark" : farChanged / Math.max(1, far) > .42 ? "motion" : coverage < .18 ? "uncertain" : null;
  return { coverage, spill, angleError, ...gradeFit(coverage, spill, angleFit), reason };
}
