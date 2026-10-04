import stepUrl from "./assets/step.ogg?inline";
import openUrl from "./assets/door-open.ogg?inline";
import closeUrl from "./assets/door-close.ogg?inline";

// Kenney CC0 samples plus original synthesized impacts/breathing. BGM is owned
// by the platform and goes silent in the locker so the passing steps are clear.
export class HorrorAudio {
  start() {
    if (this.context) return;
    const Context = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!Context) return;
    try {
      this.context = new Context(); this.master = this.context.createGain(); this.master.gain.value = this.muted ? 0 : .4; this.master.connect(this.context.destination);
      this.pulse = this.voice(64, "sine"); this.hum = this.voice(45, "sine");
      this.breath = this.context.createBufferSource(); const noise = this.context.createBuffer(1, this.context.sampleRate * 2, this.context.sampleRate);
      const data = noise.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const filter = this.context.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 480;
      this.breathGain = this.context.createGain(); this.breathGain.gain.value = 0;
      this.breath.buffer = noise; this.breath.loop = true; this.breath.connect(filter); filter.connect(this.breathGain); this.breathGain.connect(this.master); this.breath.start();
      this.samples = {}; this.nodes = new Set(); this.lastStep = -Infinity; this.lastMonsterStep = -Infinity; this.lastMonster = 0; this.lastStage = "RUN";
      const context = this.context;
      for (const [name, url] of [["step", stepUrl], ["open", openUrl], ["close", closeUrl]]) void fetch(url).then(r => r.arrayBuffer()).then(bytes => context.decodeAudioData(bytes)).then(buffer => { if (this.context === context) this.samples[name] = buffer; }).catch(() => {});
      void context.resume().catch(() => {});
    } catch { this.close(); }
  }
  voice(frequency, type) {
    const oscillator = this.context.createOscillator(), gain = this.context.createGain(); oscillator.frequency.value = frequency; oscillator.type = type; gain.gain.value = 0;
    oscillator.connect(gain); gain.connect(this.master); oscillator.start(); return { oscillator, gain };
  }
  setMuted(value) { this.muted = value; if (this.context) this.master.gain.setTargetAtTime(value ? 0 : .4, this.context.currentTime, .03); }
  sample(name, volume = .18, pan = 0, rate = 1) {
    if (!this.context || !this.samples?.[name]) return;
    const context = this.context, source = context.createBufferSource(), gain = context.createGain();
    source.buffer = this.samples[name]; source.playbackRate.value = rate; gain.gain.value = volume; source.connect(gain);
    const panner = context.createStereoPanner?.(); if (panner) { panner.pan.value = pan; gain.connect(panner); panner.connect(this.master); } else gain.connect(this.master);
    this.nodes.add(source); source.onended = () => { this.nodes.delete(source); source.disconnect(); gain.disconnect(); panner?.disconnect(); }; source.start();
  }
  tone(frequency, end, gainValue = .14, duration = .22) {
    if (!this.context) return;
    const now = this.context.currentTime, { oscillator, gain } = this.pulse;
    oscillator.frequency.setValueAtTime(frequency, now); oscillator.frequency.exponentialRampToValueAtTime(end, now + duration);
    gain.gain.cancelScheduledValues(now); gain.gain.setValueAtTime(gainValue, now); gain.gain.exponentialRampToValueAtTime(.001, now + duration);
  }
  update(game) {
    if (!this.context) return;
    const now = this.context.currentTime, active = game.phase === "playing" && !game.paused;
    this.hum.gain.gain.setTargetAtTime(active && game.monster ? .008 + game.monster * .005 : 0, now, .1);
    const breathing = Math.pow((Math.sin(game.elapsedMs / 600) + 1) / 2, 3);
    this.breathGain.gain.setTargetAtTime(active && game.monster >= 2 ? breathing * (game.monster === 3 ? .07 : .018) : 0, now, .1);
    if (!active) { this.pulse.gain.gain.setTargetAtTime(0, now, .03); for (const node of this.nodes) { try { node.stop(); } catch {} } return; }
    if (game.monster > this.lastMonster) { this.tone(88, 34, .24, .28); this.lastMonster = game.monster; }
    if (game.stage !== this.lastStage) {
      this.lastStage = game.stage;
      if (game.stage === "HIDE") this.sample("close", .22);
      if (game.stage === "GO") { this.sample("open", .22); this.tone(350, 620, .07, .15); }
      this.lastStep = -Infinity;
    }
    if (game.stage === "DONT_LOOK" && game.elapsedMs - this.lastStep >= 600) {
      this.lastStep = game.elapsedMs; const fraction = game.stageMs / game.rules.passMs;
      this.sample("step", .13 + Math.sin(fraction * Math.PI) * .22, -1 + fraction * 2, .7);
    } else if (game.stage === "RUN" && game.lastEye === "EYES_OPEN" && game.elapsedMs - this.lastStep >= 380) {
      this.lastStep = game.elapsedMs; this.sample("step", .10, Math.sin(game.elapsedMs / 380) * .25, 1.1);
    }
    if (game.stage === "RUN" && game.monster === 1 && game.elapsedMs - this.lastMonsterStep >= 1100) {
      this.lastMonsterStep = game.elapsedMs; this.sample("step", .04, -.55, .65);
    }
  }
  finish(won) {
    if (!this.context) return;
    const now = this.context.currentTime;
    this.hum.gain.gain.setTargetAtTime(0, now, .03); this.breathGain.gain.setTargetAtTime(0, now, .03);
    for (const node of this.nodes) { try { node.stop(); } catch {} }
    if (won) { this.sample("open", .2); this.doorTimer = setTimeout(() => this.sample("close", .25), 650); }
    else this.tone(115, 30, .3, .25);
  }
  peek() { this.tone(100, 48, .06, .12); }
  close() {
    clearTimeout(this.doorTimer); if (!this.context) return;
    for (const voice of [this.hum, this.pulse]) { try { voice?.oscillator.stop(); } catch {} voice?.oscillator.disconnect(); voice?.gain.disconnect(); }
    try { this.breath?.stop(); } catch {} this.breath?.disconnect(); this.breathGain?.disconnect();
    for (const node of this.nodes ?? []) { try { node.stop(); } catch {} } this.nodes?.clear();
    void this.context.close().catch(() => {}); this.context = null; this.samples = {};
  }
}
