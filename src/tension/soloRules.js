import { CONFIG, clamp, geometry, closest, netResponse, netDeflection, reflection, usableNet, netInOwnHalf } from './rules.js';

export const SOLO = Object.freeze({ duration: 30, lives: 3, serveDelay: .7, readyTime: 1.5 });
export const LAYOUTS = Object.freeze(['first-boing', 'the-gap', 'corner-shot']);
// Only input/output crosses the mirror boundary. Simulation always has the net
// on the left, with world y expressed in fractions of court width like DUEL.
export const logicalX = (x, handSide) => handSide === 'right' ? 1 - x : x;
export const screenX = logicalX;
export function mirrorNet(net, handSide) {
  if (!net) return null;
  return { ...net, ...geometry({ ...net.thumb, x: logicalX(net.thumb.x, handSide) }, { ...net.index, x: logicalX(net.index.x, handSide) }) };
}
export function createBrickLayout(id = LAYOUTS[0]) {
  if (!LAYOUTS.includes(id)) id = LAYOUTS[0];
  const positions = id === 'the-gap'
    ? [.19, .34, .76].flatMap(y => [.7, .86].map(x => [x, y]))
    : (id === 'corner-shot' ? [.14, .78] : [.34, .59]).flatMap(y => [.64, .76, .88].map(x => [x, y]));
  return positions.map(([x, y], index) => ({ id: index, x, y, width: .07, height: .105, alive: true }));
}
export function brickRect(brick, height) { return { x: brick.x, y: brick.y * height, width: brick.width, height: brick.height * height }; }
export function soloNetUsable(net, height) { return usableNet(net, height) && netInOwnHalf(net, 0); }
export function updateSoloNet(previous, hands, now) {
  // Position continuity beats MediaPipe handedness labels, whose convention
  // depends on whether the inference image is mirrored. Never reject by label.
  const cost = h => previous ? Math.hypot(h.center.x - previous.center.x, h.center.y - previous.center.y) : Math.abs(h.center.x - .2);
  const hand = hands.reduce((best, h) => !best || cost(h) < cost(best) ? h : best, null);
  if (!hand) return previous ? { ...previous, active: now - previous.seenAt <= CONFIG.holdMs, opacity: clamp(1 - (now - previous.seenAt - CONFIG.holdMs) / CONFIG.fadeMs, 0, 1) } : null;
  const smooth = (a, b) => ({ x: a.x + (b.x - a.x) * .55, y: a.y + (b.y - a.y) * .55 });
  const net = previous?.active && now - previous.seenAt <= CONFIG.holdMs ? geometry(smooth(previous.thumb, hand.thumb), smooth(previous.index, hand.index)) : hand;
  return { ...net, active: true, opacity: 1, seenAt: now };
}
export function createSoloMatch({ height = 9 / 16, layoutId = LAYOUTS[0], handSide = 'right' } = {}) {
  return { height, layoutId: LAYOUTS.includes(layoutId) ? layoutId : LAYOUTS[0], handSide, elapsed: 0, phase: 'playing', reason: null, paused: false,
    score: 0, lives: SOLO.lives, hits: 0, bricks: createBrickLayout(layoutId), serve: SOLO.serveDelay,
    ball: { x: .43, y: height / 2, vx: 0, vy: 0 }, capture: null, locked: false };
}
export function changeSoloHand(match, handSide) {
  Object.assign(match, createSoloMatch({ height: match.height, layoutId: match.layoutId, handSide }));
  return match;
}
export function resizeSoloMatch(match, height) {
  if (!Number.isFinite(height) || height <= CONFIG.radius * 4 || height === match.height) return false;
  match.ball.y = clamp(match.ball.y / match.height * height, CONFIG.radius, height - CONFIG.radius);
  if (match.capture) { Object.assign(match.ball, match.capture.velocity); match.capture = null; }
  match.locked = false; match.height = height;
  return true;
}
function end(match, reason, events) {
  match.phase = 'result'; match.reason = reason; match.serve = 0; match.capture = null;
  match.ball.vx = match.ball.vy = 0; events.push({ type: 'end', reason });
}
// Swept circle vs rectangle (Minkowski expansion) avoids tunneling and chooses
// the entering face, including very thin bricks and corner contacts.
function sweepBrick(ball, dx, dy, rect) {
  const r = CONFIG.radius, axes = [
    { p: ball.x, d: dx, lo: rect.x - r, hi: rect.x + rect.width + r, axis: 'x' },
    { p: ball.y, d: dy, lo: rect.y - r, hi: rect.y + rect.height + r, axis: 'y' },
  ];
  let enter = -Infinity, exit = Infinity, face;
  for (const a of axes) {
    if (Math.abs(a.d) < 1e-12) { if (a.p < a.lo || a.p > a.hi) return null; continue; }
    const t1 = (a.lo - a.p) / a.d, t2 = (a.hi - a.p) / a.d;
    const near = Math.min(t1, t2), far = Math.max(t1, t2);
    if (near > enter) { enter = near; face = a.axis; }
    exit = Math.min(exit, far);
  }
  return enter >= -1e-9 && enter <= 1 && exit >= Math.max(0, enter) ? { time: Math.max(0, enter), face } : null;
}
export function stepSoloMatch(match, net, seconds) {
  const events = [];
  if (match.phase !== 'playing' || match.paused || !soloNetUsable(net, match.height) || !Number.isFinite(seconds)) return events;
  let remaining = Math.max(0, seconds);
  while (remaining > 1e-9 && match.phase === 'playing') {
    const dt = Math.min(remaining, 1 / 240, SOLO.duration - match.elapsed); remaining -= dt;
    match.elapsed = Math.min(SOLO.duration, match.elapsed + dt);
    if (match.elapsed >= SOLO.duration - 1e-9) { match.elapsed = SOLO.duration; end(match, 'time-up', events); break; }
    const ball = match.ball;
    if (match.serve > 0) {
      match.serve = Math.max(0, match.serve - dt);
      if (match.serve === 0) { ball.vx = -CONFIG.speed; ball.vy = .035; events.push({ type: 'serve' }); }
      continue;
    }
    if (match.capture) {
      const cap = match.capture;
      // Closing during the catch shortens the remaining hold and speeds up the
      // release. Keeping a wide C preserves DUEL's deeper/slower response.
      const response = netResponse(net); cap.elapsed += dt;
      const stretch = netDeflection(cap.response, Math.min(cap.elapsed, cap.response.hold));
      ball.x = cap.origin.x + cap.direction.x * stretch;
      ball.y = clamp(cap.origin.y + cap.direction.y * stretch, CONFIG.radius, match.height - CONFIG.radius);
      if (cap.elapsed >= Math.min(cap.response.hold, response.hold)) {
        const velocity = reflection(net, 0, cap.point);
        Object.assign(ball, cap.origin, velocity); match.capture = null;
        events.push({ type: 'release', opening: response.opening, state: net.state, at: match.elapsed });
      }
      continue;
    }
    const dx = ball.vx * dt, dy = ball.vy * dt;
    let target = null;
    for (const brick of match.bricks) {
      if (!brick.alive) continue;
      const hit = sweepBrick(ball, dx, dy, brickRect(brick, match.height));
      if (hit && (!target || hit.time < target.hit.time)) target = { brick, hit };
    }
    if (target) {
      ball.x += dx * target.hit.time; ball.y += dy * target.hit.time;
      ball[target.hit.face === 'x' ? 'vx' : 'vy'] *= -1;
      target.brick.alive = false; match.score += 100;
      events.push({ type: 'brick', id: target.brick.id, point: { x: ball.x, y: ball.y }, at: match.elapsed });
      if (match.bricks.every(b => !b.alive)) { end(match, 'clear', events); break; }
      ball.x += ball.vx * dt * (1 - target.hit.time); ball.y += ball.vy * dt * (1 - target.hit.time);
    } else { ball.x += dx; ball.y += dy; }
    if (ball.y < CONFIG.radius) { ball.y = 2 * CONFIG.radius - ball.y; ball.vy = Math.abs(ball.vy); events.push({ type: 'wall', point: { x: ball.x, y: 0 } }); }
    if (ball.y > match.height - CONFIG.radius) { ball.y = 2 * (match.height - CONFIG.radius) - ball.y; ball.vy = -Math.abs(ball.vy); events.push({ type: 'wall', point: { x: ball.x, y: match.height } }); }
    if (ball.x > 1 - CONFIG.radius) { ball.x = 2 * (1 - CONFIG.radius) - ball.x; ball.vx = -Math.abs(ball.vx); events.push({ type: 'wall', point: { x: 1, y: ball.y } }); }
    if (ball.x < -CONFIG.radius) {
      match.lives--; match.locked = false; events.push({ type: 'miss', at: match.elapsed });
      if (match.lives === 0) { end(match, 'game-over', events); break; }
      match.ball = { x: .43, y: match.height / 2, vx: 0, vy: 0 }; match.serve = SOLO.serveDelay; continue;
    }
    const point = closest(ball, net.thumb, net.index), margin = CONFIG.radius + CONFIG.margins[net.state];
    if (match.locked && point.distance > margin + .025) match.locked = false;
    if (!match.locked && ball.vx < 0 && point.distance <= margin) {
      const speed = Math.hypot(ball.vx, ball.vy), response = netResponse(net);
      match.capture = { origin: { x: ball.x, y: ball.y }, incoming: { vx: ball.vx, vy: ball.vy }, velocity: reflection(net, 0, point),
        direction: { x: ball.vx / speed, y: ball.vy / speed }, point, elapsed: 0, response };
      ball.vx = ball.vy = 0; match.locked = true; match.hits++;
      events.push({ type: 'hit', point, response, direction: match.capture.direction, state: net.state, at: match.elapsed });
    }
  }
  return events;
}
