// Shared reversible lifecycle for the two instrument experiences.
export class InstrumentSession {
  constructor(root, locale) { this.root = root; this.locale = locale; this.phase = 'idle'; this.active = false; this.source = 'demo'; this.generation = 0; this.listeners = new Set(); this.sound = true; this.paused = false; this.debug = new URLSearchParams(location.search).get('debug') === '1'; this.$ = s => root.querySelector(s); }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  notify() { this.listeners.forEach(fn => fn(this.snapshot())); }
  snapshot() { return { phase: this.phase, source: this.source, paused: this.paused, musicSilent: true, result: null }; }
  setLocale(locale) { this.locale = locale; this.render(); }
  activate() { this.active = true; this.phase = 'idle'; this.render(); }
  startCamera() { return this.start('camera'); }
  startDemo() { return this.start('demo'); }
  async start(source) {
    this.releaseInputs(); this.active = true; this.source = source; this.phase = 'loading'; this.paused = false; this.raw = null; this.lastError = null;
    this.reset(); this.bind(); this.render(); this.notify();
    const token = this.generation;
    try {
      this.audio.setEnabled(this.sound);
      const audio = this.audio.enable(); // same user gesture, before camera/model awaits
      const camera = source === 'camera' ? this.input.start() : Promise.resolve();
      const [enabled] = await Promise.all([audio, camera]);
      if (!enabled || token !== this.generation || !this.active) return;
      this.phase = 'playing'; this.lastTick = performance.now(); this.clock = 0;
      this.ready?.(); this.render(); this.notify(); this.raf = requestAnimationFrame(this.tick);
    } catch (error) { if (token === this.generation && error.name !== 'AbortError') this.fail(error); }
  }
  bindCommon() {
    this.abort = new AbortController(); const signal = this.abort.signal;
    this.$('.cmi-pause').addEventListener('click', () => void this.togglePause(), { signal });
    this.$('.cmi-sound').addEventListener('click', () => { this.sound = !this.sound; this.audio.setEnabled(this.sound); if (!this.sound) this.audio.silence(); this.render(); }, { signal });
    this.$('.cmi-camera').addEventListener('click', () => void this.startCamera(), { signal });
    this.$('.cmi-demo').addEventListener('click', () => void this.startDemo(), { signal });
    this.$('.cmi-debug-toggle').addEventListener('click', () => { this.debug = !this.debug; this.render(); }, { signal });
    const background = () => { if (this.phase === 'playing') { this.paused = true; this.resetTracking(); this.audio.silence(); this.muteBacking?.(); this.render(); this.notify(); } };
    document.addEventListener('visibilitychange', () => { if (document.hidden) background(); }, { signal });
    window.addEventListener('blur', background, { signal });
    return signal;
  }
  async togglePause() {
    if (this.phase !== 'playing') return;
    if (!this.paused) { this.paused = true; this.audio.silence(); this.muteBacking?.(); }
    else {
      const token = this.generation;
      try { await this.audio.resume(); if (!this.active || token !== this.generation) return; this.paused = false; this.lastTick = performance.now(); }
      catch (error) { this.fail(error); return; }
    }
    this.resetTracking(); this.render(); this.notify();
  }
  fail(error) { this.lastError = error; this.releaseInputs(); this.phase = 'error'; this.bind(); this.render(); this.notify(); }
  releaseInputs() {
    ++this.generation; this.abort?.abort(); this.abort = null;
    cancelAnimationFrame(this.raf); this.raf = null; this.input?.stop(); this.audio?.dispose(); this.releaseBacking?.(); this.raw = null;
  }
  deactivate() { this.active = false; this.releaseInputs(); this.phase = 'idle'; this.resetTracking(); }
  renderCommon() {
    const ja = this.locale === 'ja';
    this.$('.cmi-pause').textContent = this.paused ? ja ? 'つづける' : 'RESUME' : ja ? '一時停止' : 'PAUSE';
    this.$('.cmi-pause').disabled = this.phase !== 'playing';
    this.$('.cmi-sound').textContent = this.sound ? '♪ ON' : '♪ OFF'; this.$('.cmi-sound').setAttribute('aria-pressed', String(this.sound));
    this.$('.cmi-camera').textContent = ja ? 'カメラを再試行' : 'RETRY CAMERA'; this.$('.cmi-demo').textContent = ja ? '練習で遊ぶ' : 'PLAY PRACTICE';
    this.$('.cmi-recovery').hidden = this.phase !== 'error';
    this.$('.cmi-debug').hidden = !this.debug; this.$('.cmi-debug-toggle').setAttribute('aria-expanded', String(this.debug));
    this.stage.classList.toggle('cmi-practice', this.source === 'demo');
    const overlay = this.$('.cmi-overlay'); overlay.hidden = this.phase === 'playing' && !this.paused;
    overlay.textContent = this.phase === 'error' ? ja ? 'カメラか音を開始できませんでした。練習でも遊べます。' : 'Camera or audio could not start. You can play practice.' : this.paused ? ja ? '一時停止中' : 'PAUSED' : ja ? '音とカメラを準備中…' : 'Getting sound and camera ready…';
  }
}
