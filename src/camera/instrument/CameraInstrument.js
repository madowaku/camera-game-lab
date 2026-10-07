import { createZone } from './InstrumentZone.js';
import { HitDetector } from './HitDetector.js';
import { banks, presetZones, presetBanks } from './InstrumentPresets.js';

export function createCameraInstrument(options) { return new CameraInstrument(options); }
export class CameraInstrument {
  constructor({ maxZones = 5, soundBank = 'pentatonic', audio = null } = {}) {
    if (!Number.isInteger(maxZones) || maxZones < 1) throw new TypeError('maxZones must be a positive integer.');
    if (!banks[soundBank]) throw new TypeError('Unknown sound bank.');
    this.maxZones = Math.min(5, Math.max(1, maxZones)); this.soundBank = soundBank; this.audio = audio;
    this.zones = []; this.detector = new HitDetector(); this.listeners = new Map(); this.sequence = 0;
    this.viewport = { width: 360, height: 640 }; this.hits = 0;
  }
  on(name, fn) { if (!this.listeners.has(name)) this.listeners.set(name, new Set()); this.listeners.get(name).add(fn); return () => this.listeners.get(name)?.delete(fn); }
  emit(name, event) { this.listeners.get(name)?.forEach(fn => fn(event)); }
  addZone(options) {
    if (this.zones.length >= this.maxZones) return null;
    const zone = createZone({ soundId: banks[this.soundBank]?.[this.zones.length] ?? 'C4', ...options }, `zone-${++this.sequence}`);
    this.zones.push(zone); this.emit('change', this.zones); return zone;
  }
  removeZone(id) { this.zones = this.zones.filter(z => z.id !== id); this.emit('change', this.zones); }
  clear() { this.zones = []; this.detector.reset(); this.emit('change', this.zones); }
  setPreset(name) { const zones = presetZones(name); this.clear(); this.soundBank = presetBanks[name]; for (const zone of zones) this.addZone(zone); }
  update(point, at, viewport = this.viewport) {
    this.viewport = viewport;
    const candidate = this.detector.update(this.zones, point, at, viewport);
    if (candidate) this.hit(candidate.zone.id, at, candidate.velocity, 'camera');
  }
  hit(id, at = performance.now(), velocity = 1, source = 'demo') {
    const zone = this.zones.find(z => z.id === id);
    if (!zone || at - zone.lastHit < zone.cooldownMs) return false;
    zone.lastHit = at; zone.armed = false; zone.state = 'HIT'; this.hits++;
    const event = { zoneId: id, soundId: zone.soundId, x: zone.x, y: zone.y, velocity: Math.max(.2, Math.min(1, velocity / 2)), at, source };
    // Audio dispatch precedes visual and game listeners.
    this.audio?.play(event.soundId, event.velocity);
    this.emit('hit', event); return true;
  }
  resetInput() { this.update(null, 0); }
  dispose() { this.clear(); this.listeners.clear(); this.audio?.dispose(); }
}
