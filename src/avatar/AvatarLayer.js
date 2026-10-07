import { MotionNormalizer } from './motion/MotionNormalizer.js';
import { MotionSmoother } from './motion/MotionSmoother.js';
import { idleMotionFrame } from './motion/MotionFrame.js';
import { TrackingRecovery } from './runtime/TrackingRecovery.js';
import { AdaptiveQuality } from './runtime/AdaptiveQuality.js';
import { CanvasPuppetDriver } from './drivers/CanvasPuppetDriver.js';
import { HUMAN } from './profiles/index.js';
const loaders = {
  simple: () => import('./drivers/SimplePuppetDriver.js').then(m => m.SimplePuppetDriver),
  mascot: () => import('./drivers/MascotPuppetDriver.js').then(m => m.MascotPuppetDriver),
  vrm: () => import('./drivers/VRMPuppetDriver.js').then(m => m.VRMPuppetDriver),
};
// No RAF, no camera, and no recognition here. The owning game calls ingest() at
// inference cadence and update() on its existing rendering loop.
export class AvatarLayer {
  constructor({ preset = 'GAME_NORMAL', quality = 'MEDIUM', onQualityChange = () => {}, onError = () => {} } = {}) {
    this.normalizer = new MotionNormalizer(); this.smoother = new MotionSmoother(preset); this.recovery = new TrackingRecovery();
    this.quality = new AdaptiveQuality(quality); Object.assign(this, { onQualityChange, onError }); this.generation = 0;
    this.normalized = null; this.frame = idleMotionFrame(); this.visible = true;
  }
  ingest(results, timestamp) {
    if (!Number.isFinite(timestamp) || (this.normalized && timestamp <= this.normalized.timestamp)) return false;
    this.normalized = this.normalizer.normalize(results, timestamp);
    this.rawDebug = { timestamp, facePoints: results.face?.faceLandmarks?.[0]?.length ?? 0, posePoints: results.pose?.landmarks?.[0]?.length ?? 0, hands: results.hands?.landmarks?.length ?? 0 };
    return true;
  }
  async load({ host, driver = 'simple', profile = HUMAN, cameraMode = 'MIRROR', ...options } = {}) {
    this.releaseRenderer(); this.host = host; this.config = { driver, profile, cameraMode, ...options }; const token = this.generation;
    if (driver === 'canvas') return this.fallback(token);
    let visual, puppet;
    try {
      const [module, Driver] = await Promise.all([import('../visual3d/createThreeVisualLayer.js'), (loaders[driver] ?? loaders.simple)()]);
      if (token !== this.generation) return;
      visual = module.createThreeVisualLayer({ host, cameraZ: 3.6, profile: { id: this.quality.level === 'HIGH' ? 'standard' : 'low', maxPixelRatio: this.quality.config.maxPixelRatio, antialias: false, particles: 24 }, onError: error => {
        this.onError(error); if (this.visual) { this.releaseRenderer(); void this.fallback(this.generation); }
      } });
      visual.camera.position.y = .1; visual.camera.lookAt(0, 0, 0);
      visual.scene.add(new visual.THREE.HemisphereLight(0xffffff, 0x536377, 3));
      const light = new visual.THREE.DirectionalLight(0xffffff, 2); light.position.set(2, 3, 4); visual.scene.add(light);
      this.pendingVisual = visual; puppet = new Driver(visual.scene); this.pendingDriver = puppet;
      await puppet.load(this.config);
      if (token !== this.generation) { puppet.dispose(); visual.dispose(); return; }
      if (visual.failed) throw new Error('WebGL became unavailable while loading the puppet.');
      puppet.update(this.frame, 0);
      this.pendingVisual = null; this.pendingDriver = null; this.driver = puppet; this.visual = visual; this.driver.setVisible(this.visible); this.canvas = visual.canvas; this.backend = 'three';
    } catch (error) {
      puppet?.dispose(); visual?.dispose(); if (token !== this.generation) return;
      this.pendingVisual = null; this.pendingDriver = null; this.onError(error); await this.fallback(token);
    }
  }
  async fallback(token) {
    const driver = new CanvasPuppetDriver(this.host); await driver.load(this.config);
    if (token !== this.generation) { driver.dispose(); return; }
    this.driver = driver; this.canvas = driver.canvas; this.driver.update(this.frame, 0); this.driver.setVisible(this.visible); this.backend = 'canvas';
  }
  update(now, dt = 1 / 30) {
    this.frame = this.smoother.update(this.recovery.sample(this.normalized, now), dt);
    if (this.driver) this.driver.reducedMotion = !!this.visual?.reducedMotion;
    this.driver?.update(this.frame, dt);
    try { this.visual?.render(now); } catch (error) { this.onError(error); this.releaseRenderer(); void this.fallback(this.generation); }
    const changed = this.quality.sample(dt); if (changed) this.onQualityChange(changed, this.quality.config);
    return this.frame;
  }
  setVisible(value) { this.visible = !!value; this.driver?.setVisible(this.visible); }
  reset() { this.normalizer.reset(); this.smoother.reset(); this.recovery.reset(); this.normalized = null; this.frame = idleMotionFrame(); this.driver?.reset(); this.quality.reset(); }
  releaseRenderer() { ++this.generation; this.pendingDriver?.dispose(); this.pendingDriver = null; this.pendingVisual?.dispose(); this.pendingVisual = null; this.driver?.dispose(); this.driver = null; this.visual?.dispose(); this.visual = null; this.canvas = null; }
  dispose() { this.releaseRenderer(); this.reset(); this.rawDebug = null; this.host = null; }
}
