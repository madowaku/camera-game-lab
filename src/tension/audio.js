const FILES = { music: 'loop03', hit: 'hit', wall: 'wall', point: 'point', start: 'start' };

// Fetch/decode only after a player presses Start. Audio failures never block play.
export class DuelAudio {
  constructor({ Audio = globalThis.AudioContext || globalThis.webkitAudioContext, fetchAudio = url => globalThis.fetch(url) } = {}) {
    Object.assign(this, { Audio, fetchAudio, enabled: true, wanted: false, offset: 0 });
    this.buffers = new Map(); this.effects = new Set();
  }
  unlock() {
    if (!this.Audio) return Promise.resolve();
    try {
      this.context ??= new this.Audio();
      const resumed = this.context.resume().then(() => this.syncMusic()).catch(() => {});
      this.loading ??= Promise.all(Object.entries(FILES).map(async ([key, file]) => {
        try {
          const response = await this.fetchAudio(`/audio/tension-duel/${file}.mp3`);
          if (!response.ok) return;
          const buffer = await this.context.decodeAudioData(await response.arrayBuffer());
          this.buffers.set(key, buffer);
          if (key === 'music') this.syncMusic();
        } catch { /* Offline or unsupported audio keeps the game silent/playable. */ }
      }));
      return Promise.all([resumed, this.loading]);
    } catch { return Promise.resolve(); }
  }
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) { this.stopMusic(); this.stopEffects(); }
    else this.syncMusic();
  }
  setMusic(playing) { this.wanted = playing; this.syncMusic(); }
  syncMusic() {
    const buffer = this.buffers.get('music');
    if (!this.wanted || !this.enabled || this.context?.state !== 'running') { this.stopMusic(); return; }
    if (this.music || !buffer) return;
    const source = this.context.createBufferSource(), gain = this.context.createGain();
    source.buffer = buffer; source.loop = true; gain.gain.value = .14;
    source.connect(gain).connect(this.context.destination);
    this.offset %= buffer.duration; this.startedAt = this.context.currentTime;
    this.music = { source, gain }; source.start(0, this.offset);
  }
  stopMusic() {
    if (!this.music) return;
    const { source, gain } = this.music;
    this.offset = (this.offset + this.context.currentTime - this.startedAt) % source.buffer.duration;
    this.music = null; source.stop(); source.disconnect(); gain.disconnect();
  }
  effect(type, state = 1, opening = state / 3) {
    if (!this.enabled || this.context?.state !== 'running') return;
    const buffer = this.buffers.get(type === 'end' ? 'start' : type);
    const gain = this.context.createGain(), now = this.context.currentTime;
    let source, stopAt = now + .21;
    if (buffer) {
      source = this.context.createBufferSource(); source.buffer = buffer;
      source.playbackRate.value = type === 'hit' ? 1.3 - opening * .55 : type === 'end' ? .85 : 1;
      gain.gain.value = type === 'wall' ? .24 : type === 'hit' ? .2 : .42;
    } else if (type === 'release') {
      const duration = .12 + opening * .42, pitch = 620 - opening * 360;
      source = this.context.createOscillator(); source.type = 'triangle';
      source.frequency.setValueAtTime(pitch * 1.3, now);
      for (let beat = 1; beat <= 8; beat++) source.frequency.exponentialRampToValueAtTime(pitch * (1 + (beat % 2 ? -.2 : .16) * (1 - beat / 9)), now + duration * beat / 8);
      gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(.055 + opening * .035, now + .008);
      gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
      stopAt = now + duration + .01;
    } else {
      source = this.context.createOscillator(); source.type = 'sine';
      source.frequency.setValueAtTime(type === 'hit' ? [180, 300, 450, 510][state] : type === 'wall' ? 140 : 540, now);
      source.frequency.exponentialRampToValueAtTime(90, now + .15);
      gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(.055, now + .008);
      gain.gain.exponentialRampToValueAtTime(.0001, now + .2);
    }
    source.connect(gain).connect(this.context.destination);
    this.effects.add(source);
    source.onended = () => { this.effects.delete(source); source.disconnect(); gain.disconnect(); };
    source.start(); if (!buffer) source.stop(stopAt);
  }
  stopEffects() { for (const source of this.effects) source.stop(); this.effects.clear(); }
  reset() { this.wanted = false; this.stopMusic(); this.offset = 0; this.stopEffects(); }
  suspend() { this.reset(); this.context?.suspend().catch(() => {}); }
}
