import Phaser from 'phaser';
import { STANDARD, renderSize } from './performance/PerformanceTier.js';

// Loaded only by Phaser-backed game modules, never by the feed.
export class PhaserRuntime {
  constructor(host, scene, { width = 960, height = 540 } = {}) {
    this.host = host; this.scene = scene; this.destroyed = false;
    const dimensions = () => {
      const size = renderSize(host.clientWidth || width, host.clientHeight || height, globalThis.devicePixelRatio || 1);
      const fit = Math.min(1, width / size.width, height / size.height);
      return { width: Math.round(size.width * fit), height: Math.round(size.height * fit) };
    };
    this.game = new Phaser.Game({ type: Phaser.AUTO, parent: host, ...dimensions(), transparent: true,
      banner: false, audio: { noAudio: true }, input: { keyboard: false, mouse: false, touch: false, gamepad: false },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      fps: { target: STANDARD.targetFps, smoothStep: true },
      physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
      scene: [scene], callbacks: { postBoot: game => { game.canvas.classList.add('pp-canvas'); game.canvas.setAttribute('aria-hidden', 'true'); } } });
    this.observer = new ResizeObserver(() => {
      if (!this.destroyed && host.clientWidth && host.clientHeight) {
        const size = dimensions(); this.game.scale.setGameSize(size.width, size.height); this.game.scale.refresh();
      }
    }); this.observer.observe(host);
  }
  restart() {
    this.game.loop.wake();
    // Scene restart from a sleeping Result screen may skip its SHUTDOWN event.
    // Dispose explicitly before creating fresh game objects; shutdown remains an
    // idempotent fallback for normal transitions.
    if (this.scene.fx) this.scene.disposeResources();
    if (this.scene.sys.isActive()) this.scene.scene.restart(); else if (this.scene.sys.settings.status >= Phaser.Scenes.START) this.scene.scene.start();
  }
  sleep() { this.game.loop.sleep(); }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true; this.observer.disconnect();
    if (this.scene.fx) this.scene.disposeResources();
    // Game.destroy is deferred to the next frame; wake a result-sleeping loop.
    this.game.destroy(true); this.game.loop.wake();
  }
  get canvas() { return this.game.canvas; }
}
