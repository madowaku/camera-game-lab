// Persistent toy racers. The 20-second course scroll stays guided, while
// actual forward distance determines encounters, re-passes and finish order.
const NAMES = [
  ['ポピー', 'POPPY'], ['ミント', 'MINT'], ['ベリー', 'BERRY'],
  ['サニー', 'SUNNY'], ['ピコ', 'PICO'], ['ルナ', 'LUNA'],
];
export const PASS_TURBO_MS = 900;
export const METRES_PER_SCENE_MS = .075;

export function createRivals(course) {
  const pace = course.id === 'neon' ? 4 : course.id === 'seaside' ? 2 : 0;
  return course.traffic.map((spec, index) => {
    const seconds = spec.at / 1000;
    const speed = 55 + spec.speedRatio * 30 + pace;
    // A clean drive reaches the original encounter neighborhood. Bonks and
    // turbo can now move that encounter earlier/later or prevent it entirely.
    const idealDistance = 65 * seconds + (seconds <= 12 ? seconds ** 2 : 24 * seconds - 144) - 16;
    return {
      id: `rival-${index}`, ja: NAMES[index][0], en: NAMES[index][1],
      color: spec.color, offset: spec.offset, seed: spec.seed, speed,
      distance: Math.max(30, idealDistance - speed * seconds),
      rewarded: false, contact: false,
    };
  });
}

export const rivalLane = (rival, at) => rival.offset + Math.sin(at * .00065 + rival.seed) * .09;
export const rivalAhead = (rival, playerDistance) => (rival.distance - playerDistance) / METRES_PER_SCENE_MS;
export const racePosition = (distance, rivals) => 1 + rivals.filter(r => r.distance >= distance).length;

export function raceStandings(game) {
  const racers = [
    { id: 'player', player: true, ja: 'あなた', en: 'YOU', color: game.car.color, distance: game.distance },
    ...game.rivals.map(({ id, ja, en, color, distance }) => ({ id, player: false, ja, en, color, distance })),
  ];
  // On an exact tie the car in front retains the place; no rank flicker.
  return racers.sort((a, b) => b.distance - a.distance || Number(a.player) - Number(b.player))
    .map((racer, index) => ({ ...racer, position: index + 1, distance: Math.round(racer.distance) }));
}
