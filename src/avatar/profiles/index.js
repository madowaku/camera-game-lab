export const HUMAN = Object.freeze({ id: 'human', head: { yawScale: 1, pitchScale: 1, rollScale: 1 }, arms: { scale: 1 }, face: { mouth: true, blink: true }, style: { exaggeration: 1, spring: .1 } });
export const TOY = Object.freeze({ ...HUMAN, id: 'toy', style: { exaggeration: 1.4, spring: .4 } });
export const MONSTER = Object.freeze({ ...HUMAN, id: 'monster', style: { exaggeration: 2, spring: .2 } });
export const BIRD = Object.freeze({ ...HUMAN, id: 'bird', arms: { scale: 1.3 }, style: { exaggeration: 1.5, spring: .3 } });
export const PUPPET_PROFILES = Object.freeze({ HUMAN, TOY, MONSTER, BIRD });
