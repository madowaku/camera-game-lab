import { TensionDuel } from './duel.js';
import { usableNet } from './rules.js';

// Keep the prototype's rules and rendering; adapt only the shared lab lifecycle.
export class TensionDuelView extends TensionDuel {
  startCamera() { return this.start(); }
  get paused() {
    return this.phase === 'paused' || (this.phase === 'playing' &&
      (document.hidden || !this.nets.every(net => usableNet(net, this.height))));
  }
  snapshot() {
    const scores = [...this.match.score];
    return {
      phase: this.phase === 'ready' ? 'countdown' : this.phase,
      source: this.mode,
      paused: this.paused,
      result: this.phase === 'result' ? {
        outcome: 'won', score: Math.max(...scores), scored: false, scores,
        winner: scores[0] > scores[1] ? 1 : 2,
        hits: this.match.hits, bestRally: this.match.bestRally,
        durationMs: Math.round(this.match.elapsed * 1000),
      } : null,
    };
  }
  releaseInputs() {
    this.active = false;
    this.generation++;
    clearTimeout(this.timeout);
    cancelAnimationFrame(this.raf);
    this.input.stop();
    this.nets = [null, null];
    this.pointers.clear();
    this.advancing = false;
    this.audio.suspend();
    void this.releaseWakeLock();
    if (document.fullscreenElement === this.$('.tnd-shell')) {
      void document.exitFullscreen().catch(() => {});
    }
  }
}

export const createView = (root, locale, options) => new TensionDuelView(root, locale, options);
