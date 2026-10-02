export const WIDTH = 360, HEIGHT = 440;
const bar = (x, y, w, h = 26, angle = 0) => ({ kind: "bar", x, y, w, h, angle });
export const STAGES = Object.freeze([
  { id: "bridge", name: "FALSE BRIDGE", prompt: ["MAKE A BRIDGE", "橋をつくろう"], parts: [bar(180, 244, 158)] },
  { id: "ladder", name: "BROKEN LADDER", prompt: ["MAKE A LADDER", "上までつなごう"], parts: [bar(213, 222, 152, 26, 90)] },
  { id: "moon", name: "THE MOON", prompt: ["BRING BACK THE MOON", "月を浮かべよう"], parts: [{ kind: "circle", x: 180, y: 148, w: 112, h: 112, angle: 0 }] },
  { id: "hat", name: "GIANT HAT", prompt: ["MAKE A GIANT HAT", "大きな帽子をかぶせよう"], parts: [{ kind: "hat", x: 180, y: 179, w: 128, h: 76, angle: 0 }] },
  { id: "two", name: "TWO PARTS", prompt: ["A BRIDGE. THEN A PILLAR.", "橋をつくって、柱を足そう"], parts: [bar(180, 219, 158, 24), bar(244, 282, 104, 26, 90)] },
]);
export function localPoint(shape, x, y) {
  const a = -shape.angle * Math.PI / 180, dx = x - shape.x, dy = y - shape.y;
  return { x: (dx * Math.cos(a) - dy * Math.sin(a)) / (shape.w / 2), y: (dx * Math.sin(a) + dy * Math.cos(a)) / (shape.h / 2) };
}
export function contains(shape, x, y, expansion = 1) {
  const p = localPoint(shape, x, y), nx = p.x / expansion, ny = p.y / expansion;
  if (shape.kind === "circle") return nx * nx + ny * ny <= 1;
  if (shape.kind === "hat") return Math.abs(ny) <= 1 && Math.abs(nx) <= .65 + .35 * (ny + 1) / 2;
  return Math.abs(nx) <= 1 && Math.abs(ny) <= 1;
}
// Shared geometry keeps the guide, scoring mask and frozen image registered.
export function traceShape(ctx, shape, expansion = 1) {
  const a = shape.angle * Math.PI / 180, w = shape.w / 2 * expansion, h = shape.h / 2 * expansion;
  const point = (x, y) => [shape.x + x * Math.cos(a) - y * Math.sin(a), shape.y + x * Math.sin(a) + y * Math.cos(a)];
  ctx.beginPath();
  if (shape.kind === "circle") ctx.ellipse(shape.x, shape.y, w, h, a, 0, Math.PI * 2);
  else {
    const top = shape.kind === "hat" ? w * .65 : w;
    ctx.moveTo(...point(-top, -h)); ctx.lineTo(...point(top, -h)); ctx.lineTo(...point(w, h)); ctx.lineTo(...point(-w, h)); ctx.closePath();
  }
}
export function coverCrop(sw, sh, dw = WIDTH, dh = HEIGHT) {
  const scale = Math.max(dw / sw, dh / sh);
  return { x: (sw - dw / scale) / 2, y: (sh - dh / scale) / 2, w: dw / scale, h: dh / scale };
}
