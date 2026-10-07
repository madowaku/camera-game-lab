import Phaser from 'phaser';
import { GameFX } from './fx/GameFX.js';
import { CollisionHelper } from './physics/CollisionHelper.js';

export class CameraGameScene extends Phaser.Scene {
  constructor(key, { inputBridge, gameEvents, reducedMotion = false }) {
    super(key); this.inputBridge = inputBridge; this.gameEvents = gameEvents; this.reducedMotion = reducedMotion;
  }
  create() {
    this.fx = new GameFX(this, { reducedMotion: this.reducedMotion }); this.collisions = new CollisionHelper(this);
    this.cleanup = [];
    this.resourcesDisposed = false;
    this.events.once('shutdown', this.disposeResources, this);
    // Game.destroy skips SHUTDOWN for sleeping scenes and emits DESTROY only.
    this.events.once('destroy', this.disposeResources, this);
  }
  disposeResources() {
    if (this.resourcesDisposed) return;
    this.resourcesDisposed = true;
    for (const dispose of this.cleanup) dispose();
    this.cleanup = []; this.collisions.destroy(); this.fx.destroy();
  }
  listen(bus, type, listener) { const dispose = bus.on(type, listener); this.cleanup.push(dispose); return dispose; }
  startGame(data = {}) { this.gameEvents.emit('GAME_START', { timestamp: performance.now(), ...data }); }
  endGame(data = {}) { this.gameEvents.emit('GAME_END', { timestamp: performance.now(), ...data }); }
}
