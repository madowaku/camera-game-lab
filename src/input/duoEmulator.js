const MAPPINGS = [
  { left: ["KeyA"], right: ["KeyD"], fire: ["KeyW", "Space"] },
  { left: ["ArrowLeft"], right: ["ArrowRight"], fire: ["ArrowUp", "Enter"] }
];

export class DuoEmulator {
  constructor() {
    this.keys = new Set();
    this.pointers = new Map();
    this.events = [];
    this.mouth = [false, false];
    this.inputEvents = [0, 0];
  }

  accepts(code) { return MAPPINGS.some((map) => Object.values(map).flat().includes(code)); }
  key(code, down) {
    if (!this.accepts(code)) return false;
    if (down) this.keys.add(code); else this.keys.delete(code);
    this.updateEdges();
    return true;
  }
  pointer(pointerId, playerId, action, down) {
    if (down) this.pointers.set(pointerId, { playerId, action }); else this.pointers.delete(pointerId);
    this.updateEdges();
  }
  active(index, action) {
    return MAPPINGS[index][action].some((code) => this.keys.has(code)) ||
      [...this.pointers.values()].some((p) => p.playerId === index + 1 && p.action === action);
  }
  updateEdges() {
    for (let index = 0; index < 2; index += 1) {
      const open = this.active(index, "fire");
      if (open === this.mouth[index]) continue;
      this.mouth[index] = open;
      this.inputEvents[index] += 1;
      this.events.push({ type: open ? "MOUTH_OPEN_START" : "MOUTH_OPEN_END", playerId: index + 1 });
    }
  }
  clear() {
    this.keys.clear(); this.pointers.clear(); this.events = []; this.mouth = [false, false];
  }
  sample() {
    return {
      ready: true, calibrationProgress: 1,
      players: [0, 1].map((index) => ({
        id: index + 1, trackId: index + 1, present: true, lost: false, lostMs: 0, calibrated: true,
        faceX: Number(this.active(index, "right")) - Number(this.active(index, "left")),
        faceY: 0, faceScale: 1, tilt: 0, mouthOpen: this.mouth[index], mouthValue: Number(this.mouth[index]),
        eyesClosed: false, confidence: 1, center: null, box: null, neutral: null
      })),
      events: this.events.splice(0),
      metrics: { playerLossCount: 0, identitySwapSuspicionCount: 0, inputEvents: [...this.inputEvents], averageInferenceFps: 0 }
    };
  }
}
