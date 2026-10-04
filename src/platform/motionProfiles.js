// Read-only presentation adapters. Counters come from actual game decisions,
// never from elapsed time, input attempts, DOM text or an invented score.
import { DRUMS, BIG_DRUM } from '../games/toyDrum.js';
const profile = (family, stage, label, every = 5) => Object.freeze({ family, stage, label, every });
export const motionProfiles = Object.freeze({
  'solo-hand-spell': profile('orbit', '.hs-stage', 'LOCKED!', 3),
  'solo-hand-beat': profile('rhythm', '#stage', 'ON BEAT!'),
  'solo-finger-gun': profile('impact', '#stage', 'HIT!'),
  'solo-eat-dont-eat': profile('pop', '#stage', 'NICE!'),
  'solo-blink-horror': profile('echo', '.bh-stage', 'SAFE'),
  'solo-pinch-world': profile('orbit', '.pw-stage', 'PLACED!', 3),
  'solo-ghost-trail': profile('echo', '.gt-stage', 'CLOSE CALL!'),
  'solo-note-eater': profile('rhythm', '.ne-stage', 'GROOVE!'),
  'voice-note-blaster': profile('rhythm', '.nb-stage', 'HIT!'),
  'duo-tiny-bot-duel': profile('impact', '.duo-stage', 'HIT!'),
  'guardian-spirit': profile('impact', '.guardian-stage', 'STRIKE!'),
  'outcam-watermelon-guide': profile('slash', '.outcam-stage', 'SMASH!', 3),
  'outcam-false-bridge': profile('orbit', '.fb-scene', 'LOCKED!', 3),
  'outcam-frame-smuggler': profile('echo', '.fs-stage', 'CLEAR!', 2),
  'solo-daitai-hero': profile('pop', '.dh-arena', 'CORRECT!'),
  'outcam-the-camera-is-it': profile('orbit', '.ci-stage', 'PATH CLEAR!', 3),
  'solo-soft-serve': profile('swirl', '.ss-stage', 'YUM!'),
  'solo-handy-pals': profile('pop', '.hp-stage', 'TOGETHER!'),
  'solo-body-wings': profile('speed', '.bw-stage', 'THROUGH!'),
  'duo-palm-pong': profile('orbit', '.pp-court', 'RALLY!'),
  'solo-toy-drum': profile('rhythm', '.td-stage', 'POP!'),
  'solo-pose-wall': profile('pop', '.pw-stage', 'CLEAR!', 3),
  'solo-wipe': profile('swirl', '.wipe-stage', 'CLEAN!'),
  'duo-wipe': profile('swirl', '.wipe-stage', 'CLEAN!'),
  'solo-human-clock': profile('orbit', '.hc-stage', 'TICK!'),
  'solo-counter-cam': profile('impact', '.cc-stage', 'PUNCH!'),
  'solo-tilt-turbo': profile('speed', '.tt-stage', 'NICE!'),
  'solo-air-slash': profile('slash', '.as-stage', 'SLASH!'),
  'solo-dont-laugh': profile('pop', '.dl-stage', '?!'),
});

const sum = (values = []) => values.reduce((a, b) => a + (Number(b) || 0), 0);
const specials = Object.freeze({
  BOOST: 'BOOST!', 'MEGA PUNCH': 'MEGA PUNCH!', COUNTER: 'COUNTER!',
  'JUST DODGE': 'JUST DODGE!', 'SPECIAL READY': 'POWER READY!',
  'SKRRRT!': 'SKRRRT!', 'JUMP!': 'JUMP!', 'LAST SPURT!': 'LAST SPURT!',
  swirl: 'SWIRL!', serve: 'SERVE!', highFive: 'HIGH FIVE!', hug: 'HUG!',
});
export function motionSampleOf(instance, game, snapshot) {
  const g = instance.game ?? {}, module = game.module;
  let success = 0, combo = g.combo ?? 0, point = null, special = null;
  switch (module) {
    case 'handSpell':
      success = g.log?.filter(e => e.type === 'lock').length ?? 0;
      break;
    case 'solo': success = snapshot.motion?.hits ?? 0; point = snapshot.motion?.point; break;
    case 'blink': success = g.safeBlinks ?? 0; if (g.stage === 'GO') special = { key: `go:${g.hides}`, label: 'GO!' }; break;
    case 'pinch': success = g.completed ?? 0; break;
    case 'ghost': success = g.nearMisses ?? 0; point = g.player; break;
    case 'noteEater': success = g.eaten ?? 0; point = g.mouth; combo = Math.floor((g.groove ?? 0) / 20); break;
    case 'blaster': success = g.hits ?? 0; break;
    case 'duo': success = sum(g.bots?.map(b => b.hits)); break;
    case 'guardian': success = g.defeated ?? 0; break;
    case 'watermelon': success = instance.hits ?? 0; point = instance.target; break;
    case 'falseBridge': success = (g.stages?.reduce((n, s) => n + s.parts.length, 0) ?? 0) + (g.parts?.length ?? 0); break;
    case 'smuggler': success = g.cleared ?? 0; break;
    case 'daitai': success = g.logs?.filter(a => a.correct).length ?? 0; break;
    case 'camera-is-it': success = g.completed ?? 0; break;
    case 'softServe': success = g.bites ?? 0; point = g.cone; break;
    case 'handyPals': success = (g.highFives ?? 0) + (g.hugs ?? 0); break;
    case 'bodyWings': success = g.rings ?? 0; point = { x: g.x, y: .62 }; break;
    case 'palmPong': success = combo = g.rally ?? 0; point = g.ball && instance.canvas ? { x: g.ball.x / instance.canvas.width, y: g.ball.y / instance.canvas.height } : null; break;
    case 'toyDrum': {
      success = g.hits ?? 0;
      if (g.hitAt) { const i = g.hitAt.indexOf(Math.max(...g.hitAt)); point = [...DRUMS, BIG_DRUM][i]; }
      break;
    }
    case 'poseWall': success = g.walls?.filter(w => w.rank !== 'CRASH').length ?? 0; break;
    case 'wipe': success = g.patches?.filter(p => p.cleared).length ?? 0; break;
    case 'humanClock': success = g.score ?? 0; break;
    case 'counterCam': success = g.hits ?? 0; break;
    case 'tiltTurbo': success = g.near ?? 0; break;
    case 'airSlash': {
      success = g.sliced ?? 0;
      const fruit = g.events?.findLast(e => e.type === 'slice')?.fruit;
      if (fruit) point = { x: fruit.x / 540, y: fruit.y / 960 };
      if (g.xSlashes) special = { key: `x:${g.xSlashes}`, label: 'X-SLASH!' };
      break;
    }
    // These are attack arrivals, deliberately presented as punctuation, not wins.
    case 'dontLaugh': success = g.nextAttack ?? 0; break;
  }
  const effect = module === 'tiltTurbo' ? g.flash : module === 'handyPals' ? g.interaction : g.effect;
  if (effect && specials[effect.type]) special = { key: `${effect.type}:${effect.at}`, label: specials[effect.type] };
  if (module === 'toyDrum' && g.phase === 'fever') special = { key: 'fever', label: 'FEVER!' };
  if (module === 'humanClock' && g.rush) special = { key: `rush:${g.rushUntil}`, label: 'TIME RUSH!' };
  if (module === 'noteEater' && combo > 0) special = { key: `groove:${combo}`, label: 'GROOVE UP!' };
  // Only normalized coordinates are used. Pixel-based worlds use a safe center.
  point = point && [point.x, point.y].every(n => Number.isFinite(n) && n >= 0 && n <= 1) ? point : { x: .5, y: .62 };
  return { success, combo, point, special, phase: snapshot.phase, paused: !!snapshot.paused };
}

export function motionCue(previous, current, profile) {
  if (!previous || current.paused) return null;
  if (current.special && current.special.key !== previous.special?.key) return { kind: 'special', label: current.special.label };
  const milestone = Math.floor(current.combo / profile.every);
  if (milestone > Math.floor(previous.combo / profile.every)) return { kind: 'combo', label: `${current.combo} COMBO!` };
  if (current.success > previous.success) return { kind: 'hit', label: profile.label };
  return null;
}
