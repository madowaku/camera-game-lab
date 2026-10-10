// World units are fractions of arena width; y uses the same scale as x.
export const CONFIG = Object.freeze({ winningScore: 5, serveDelay: .8, readyTime: 3,
  holdMs: 250, fadeMs: 180, radius: .014, speed: .34, maxSpeed: .64, minSpeed: .22,
  thresholds: [.07, .13, .18], margins: [.025, .019, .012, .007], goalInset: .1, goalDepth: .035 });
export const STATES = ['SLACK', 'NORMAL', 'TENSION', 'OVER'];
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export function tension(distance) { return CONFIG.thresholds.findIndex(t => distance < t) < 0 ? 3 : CONFIG.thresholds.findIndex(t => distance < t); }
export function geometry(thumb, index) {
  const center = { x: (thumb.x + index.x) / 2, y: (thumb.y + index.y) / 2 };
  const distance = Math.hypot(index.x - thumb.x, index.y - thumb.y);
  return { thumb, index, center, distance, angle: Math.atan2(index.y - thumb.y, index.x - thumb.x), state: tension(distance) };
}
export function goalBounds(height) { return { top: height * CONFIG.goalInset, bottom: height * (1 - CONFIG.goalInset), depth: CONFIG.goalDepth }; }
export function netResponse(net) {
  const opening = clamp((net.distance - .03) / .18, 0, 1);
  return { opening, speed: clamp(CONFIG.maxSpeed - opening * (CONFIG.maxSpeed - CONFIG.minSpeed), CONFIG.minSpeed, CONFIG.maxSpeed),
    hold: .028 + opening * .14, stretch: .01 + opening * .065, settle: .18 + opening * .48 };
}
// A wide membrane catches/deforms before releasing; recoil then settles over
// active-play time, so pausing does not skip the spring animation.
export function netDeflection(response, elapsed) {
  if (elapsed < 0) return 0;
  if (elapsed < response.hold) return Math.sin(Math.PI * elapsed / response.hold) * response.stretch;
  const phase = (elapsed - response.hold) / response.settle;
  return phase >= 1 ? 0 : -response.stretch * .42 * Math.sin(phase * Math.PI * 6) * Math.exp(-phase * 4);
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
  const speed = netResponse(net).speed;
  return { vx: direction * Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
}
export function createMatch(height = 9 / 16) {
  return { height, elapsed: 0, phase: 'playing', score: [0, 0],
    ball: { x: .5, y: height / 2, vx: -CONFIG.speed, vy: .035 },
    serve: 0, serveDirection: -1, locked: null, capture: null, hits: 0, rally: 0, bestRally: 0 };
}
// Rotation changes the visible arena, not the score, clock or ball speed.
export function resizeMatch(match, height) {
  if (!Number.isFinite(height) || height <= CONFIG.radius * 2 || height === match.height) return false;
  match.ball.y = clamp(match.ball.y / match.height * height, CONFIG.radius, height - CONFIG.radius);
  // Finish a catch before remapping: old contact geometry belongs to the old
  // camera projection and must never pull the puck after rotation.
  if (match.capture) { Object.assign(match.ball, match.capture.velocity); match.capture = null; }
  match.height = height;
  return true;
}
export function usableNet(net, height) {
  return Boolean(net?.active && net.distance > .015 &&
    [net.thumb, net.index].every(p => Number.isFinite(p.x) && Number.isFinite(p.y) &&
      p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= height));
}
// The whole fingertip segment must stay in its player's half. Touching the
// center line is allowed; a single endpoint across it disables that net.
export function netInOwnHalf(net, player) {
  return Boolean(net && [net.thumb, net.index].every(p => Number.isFinite(p?.x) &&
    (player === 0 ? p.x <= .5 : p.x >= .5)));
}
export function stepMatch(match, nets, seconds) {
  if (match.phase !== 'playing') return [];
  const events = [];
  let time = Math.max(0, seconds);
  // Small fixed substeps prevent a fast ball skipping a thin net.
  while (time > 1e-8) {
    const dt = Math.min(time, 1 / 240); time -= dt; match.elapsed += dt;
    if (match.serve > 0) {
      match.serve = Math.max(0, match.serve - dt);
      if (match.serve === 0) match.ball.vx = match.serveDirection * CONFIG.speed;
      continue;
    }
    const ball = match.ball;
    const at = match.elapsed;
    if (match.capture) {
      const capture = match.capture, net = nets[capture.player];
      if (!net?.active || !netInOwnHalf(net, capture.player)) {
        Object.assign(ball, capture.incoming); match.capture = null;
      } else {
        capture.elapsed = Math.min(capture.response.hold, capture.elapsed + dt);
        const stretch = netDeflection(capture.response, capture.elapsed);
        ball.x = clamp(capture.origin.x + capture.direction.x * stretch, CONFIG.goalDepth + CONFIG.radius, 1 - CONFIG.goalDepth - CONFIG.radius);
        ball.y = clamp(capture.origin.y + capture.direction.y * stretch, CONFIG.radius, match.height - CONFIG.radius);
        if (capture.elapsed >= capture.response.hold) {
          Object.assign(ball, capture.origin, capture.velocity); match.capture = null;
          events.push({ type: 'release', player: capture.player, state: capture.state, opening: capture.response.opening, at });
        }
        continue;
      }
    }
    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    if (ball.y < CONFIG.radius) {
      ball.y = 2 * CONFIG.radius - ball.y; ball.vy = Math.abs(ball.vy);
      events.push({ type: 'wall', wall: 'top', point: { x: ball.x, y: 0 } });
    }
    if (ball.y > match.height - CONFIG.radius) {
      ball.y = 2 * (match.height - CONFIG.radius) - ball.y; ball.vy = -Math.abs(ball.vy);
      events.push({ type: 'wall', wall: 'bottom', point: { x: ball.x, y: match.height } });
    }
    const goal = goalBounds(match.height);
    const inGoal = ball.y - CONFIG.radius >= goal.top && ball.y + CONFIG.radius <= goal.bottom;
    if (!inGoal && ball.x < goal.depth + CONFIG.radius) {
      ball.x = 2 * (goal.depth + CONFIG.radius) - ball.x; ball.vx = Math.abs(ball.vx);
      events.push({ type: 'wall', wall: 'left', point: { x: goal.depth, y: ball.y } });
    }
    if (!inGoal && ball.x > 1 - goal.depth - CONFIG.radius) {
      ball.x = 2 * (1 - goal.depth - CONFIG.radius) - ball.x; ball.vx = -Math.abs(ball.vx);
      events.push({ type: 'wall', wall: 'right', point: { x: 1 - goal.depth, y: ball.y } });
    }
    if (inGoal && (ball.x < goal.depth - CONFIG.radius || ball.x > 1 - goal.depth + CONFIG.radius)) {
      const winner = ball.x < .5 ? 1 : 0;
      match.score[winner]++; match.rally = 0; match.locked = null;
      events.push({ type: 'point', player: winner });
      if (match.score[winner] >= CONFIG.winningScore) {
        match.phase = 'result'; match.serve = 0; ball.vx = 0; ball.vy = 0;
        events.push({ type: 'end', player: winner }); break;
      }
      match.serveDirection = winner === 1 ? -1 : 1;
      match.ball = { x: .5, y: match.height / 2, vx: 0, vy: .035 };
      match.serve = CONFIG.serveDelay;
      continue;
    }
    if (match.locked !== null) {
      const net = nets[match.locked];
      if (!net || closest(ball, net.thumb, net.index).distance > CONFIG.radius + CONFIG.margins[net.state] + .025) match.locked = null;
    }
    for (let player = 0; player < 2; player++) {
      const net = nets[player];
      if (!net?.active || !netInOwnHalf(net, player) || match.locked === player || (player === 0 ? ball.vx >= 0 : ball.vx <= 0)) continue;
      const point = closest(ball, net.thumb, net.index);
      if (point.distance <= CONFIG.radius + CONFIG.margins[net.state]) {
        const response = netResponse(net), incoming = { vx: ball.vx, vy: ball.vy }, speed = Math.hypot(ball.vx, ball.vy);
        const direction = { x: ball.vx / speed, y: ball.vy / speed };
        match.capture = { player, state: net.state, response, incoming, direction, elapsed: 0,
          origin: { x: ball.x, y: ball.y }, velocity: reflection(net, player, point) };
        ball.vx = 0; ball.vy = 0;
        match.locked = player; match.hits++; match.rally++; match.bestRally = Math.max(match.bestRally, match.rally);
        events.push({ type: 'hit', player, point, state: net.state, response, direction, at }); break;
      }
    }
  }
  return events;
}
// Match both detections to previous positions globally, independent of result order.
// A lone hand fills only its nearest retained slot, never both players.
export function assignHands(previous, hands, now) {
  // Retain identity through a pause. Expired nets cannot collide, but their last
  // positions still distinguish the players when their hands return.
  const live = previous;
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
    const net = old?.active && now - old.seenAt <= CONFIG.holdMs ? geometry(smooth(old.thumb, hand.thumb), smooth(old.index, hand.index)) : hand;
    return { ...net, active: true, opacity: 1, seenAt: now };
  });
}
export function project(point, sourceWidth, sourceHeight, width, height) {
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  return { x: 1 - (point.x * sourceWidth * scale - (sourceWidth * scale - width) / 2) / width,
    y: (point.y * sourceHeight * scale - (sourceHeight * scale - height) / 2) / width };
}
