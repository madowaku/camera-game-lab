// World units are fractions of arena width; y uses the same scale as x.
export const CONFIG = Object.freeze({ duration: 15, serveDelay: .8, readyTime: 3,
  holdMs: 250, fadeMs: 180, radius: .014, speed: .34, maxSpeed: .64, minSpeed: .22,
  thresholds: [.07, .13, .18], power: [.7, 1, 1.2, 1.25], margins: [.025, .019, .012, .007] });
export const STATES = ['SLACK', 'NORMAL', 'TENSION', 'OVER'];
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export function tension(distance) { return CONFIG.thresholds.findIndex(t => distance < t) < 0 ? 3 : CONFIG.thresholds.findIndex(t => distance < t); }
export function geometry(thumb, index) {
  const center = { x: (thumb.x + index.x) / 2, y: (thumb.y + index.y) / 2 };
  const distance = Math.hypot(index.x - thumb.x, index.y - thumb.y);
  return { thumb, index, center, distance, angle: Math.atan2(index.y - thumb.y, index.x - thumb.x), state: tension(distance) };
}
export function closest(point, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  const x = a.x + t * dx, y = a.y + t * dy;
  return { x, y, t, distance: Math.hypot(point.x - x, point.y - y) };
}
export function reflection(net, player, contact) {
  // A vertical net returns straight. Fold orientation so swapping endpoints
  // cannot reverse the shot; arcade steering always points toward the opponent.
  let tilt = Math.atan2(net.index.x - net.thumb.x, net.index.y - net.thumb.y);
  if (tilt > Math.PI / 2) tilt -= Math.PI;
  if (tilt < -Math.PI / 2) tilt += Math.PI;
  const direction = player === 0 ? 1 : -1;
  const offset = (contact.y - net.center.y) / Math.max(.02, net.distance / 2);
  const angle = clamp(-tilt * direction * .85 + offset * .25, -.95, .95);
  const speed = clamp(CONFIG.speed * CONFIG.power[net.state], CONFIG.minSpeed, CONFIG.maxSpeed);
  return { vx: direction * Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
}
export function createMatch(height = 9 / 16) {
  return { height, remaining: CONFIG.duration, phase: 'playing', score: [0, 0],
    ball: { x: .5, y: height / 2, vx: -CONFIG.speed, vy: .035 },
    serve: 0, serveDirection: -1, locked: null, hits: 0, rally: 0, bestRally: 0 };
}
export function stepMatch(match, nets, seconds) {
  if (match.phase !== 'playing') return [];
  const events = [];
  let time = Math.min(Math.max(0, seconds), match.remaining);
  match.remaining = Math.max(0, match.remaining - time);
  // Small fixed substeps prevent a fast ball skipping a thin net.
  while (time > 1e-8) {
    const dt = Math.min(time, 1 / 240); time -= dt;
    if (match.serve > 0) {
      match.serve = Math.max(0, match.serve - dt);
      if (match.serve === 0) match.ball.vx = match.serveDirection * CONFIG.speed;
      continue;
    }
    const ball = match.ball;
    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    if (ball.y < CONFIG.radius) { ball.y = CONFIG.radius; ball.vy = Math.abs(ball.vy); }
    if (ball.y > match.height - CONFIG.radius) { ball.y = match.height - CONFIG.radius; ball.vy = -Math.abs(ball.vy); }
    if (match.locked !== null) {
      const net = nets[match.locked];
      if (!net || closest(ball, net.thumb, net.index).distance > CONFIG.radius + CONFIG.margins[net.state] + .025) match.locked = null;
    }
    for (let player = 0; player < 2; player++) {
      const net = nets[player];
      if (!net?.active || match.locked === player || (player === 0 ? ball.vx >= 0 : ball.vx <= 0)) continue;
      const point = closest(ball, net.thumb, net.index);
      if (point.distance <= CONFIG.radius + CONFIG.margins[net.state]) {
        Object.assign(ball, reflection(net, player, point));
        match.locked = player; match.hits++; match.rally++; match.bestRally = Math.max(match.bestRally, match.rally);
        events.push({ type: 'hit', player, point, state: net.state }); break;
      }
    }
    if (ball.x < -CONFIG.radius || ball.x > 1 + CONFIG.radius) {
      const winner = ball.x < 0 ? 1 : 0;
      match.score[winner]++; match.rally = 0; match.locked = null;
      match.serveDirection = winner === 1 ? -1 : 1;
      match.ball = { x: .5, y: match.height / 2, vx: 0, vy: .035 };
      match.serve = CONFIG.serveDelay;
      events.push({ type: 'point', player: winner });
    }
  }
  if (match.remaining <= 0) { match.phase = 'result'; events.push({ type: 'end' }); }
  return events;
}
// Match both detections to previous positions globally, independent of result order.
// A lone hand fills only its nearest retained slot, never both players.
export function assignHands(previous, hands, now) {
  const live = previous.map(n => n && now - n.seenAt <= CONFIG.holdMs + CONFIG.fadeMs ? n : null);
  if (!hands.length) return [null, null];
  const cost = (hand, player) => live[player] ? Math.hypot(hand.center.x - live[player].center.x, hand.center.y - live[player].center.y) : Math.abs(hand.center.x - (player ? .8 : .2));
  if (hands.length === 1) { const slot = cost(hands[0], 0) <= cost(hands[0], 1) ? 0 : 1; return slot ? [null, hands[0]] : [hands[0], null]; }
  const [a, b] = hands;
  return cost(a, 0) + cost(b, 1) <= cost(b, 0) + cost(a, 1) ? [a, b] : [b, a];
}
export function updateNets(previous, hands, now) {
  return assignHands(previous, hands, now).map((hand, player) => {
    const old = previous[player];
    if (!hand) {
      if (!old) return null;
      const age = now - old.seenAt;
      return { ...old, active: age <= CONFIG.holdMs, opacity: clamp(1 - (age - CONFIG.holdMs) / CONFIG.fadeMs, 0, 1) };
    }
    const smooth = (a, b) => ({ x: a.x + (b.x - a.x) * .55, y: a.y + (b.y - a.y) * .55 });
    const net = old?.active ? geometry(smooth(old.thumb, hand.thumb), smooth(old.index, hand.index)) : hand;
    return { ...net, active: true, opacity: 1, seenAt: now };
  });
}
export function project(point, sourceWidth, sourceHeight, width, height) {
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  return { x: 1 - (point.x * sourceWidth * scale - (sourceWidth * scale - width) / 2) / width,
    y: (point.y * sourceHeight * scale - (sourceHeight * scale - height) / 2) / width };
}
