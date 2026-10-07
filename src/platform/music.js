import { escapeHtml as esc } from "./copy.js";

export const tracks = Object.freeze({
  humanFish: { id: "humanFish", title: "aquarium", creator: "えだまめ88", url: "https://opentracks.com/bgm/detail/19143", volume: .22, load: () => import("../assets/music/humanFish.js") },
  handSpell: { id: "handSpell", title: "The maze of aqua", creator: "蒲鉾さちこ", url: "https://opentracks.com/bgm/detail/23061", volume: .22, load: () => import("../assets/music/handSpell.js") },
  blinkSpooky: { id: "blinkSpooky", title: "不穏ROOM", creator: "MAKOOTO", url: "https://opentracks.com/bgm/detail/9957", volume: .07, load: () => import("../assets/music/uneasyRoom.js") },
  airSlash: { id: "airSlash", title: "イケイケな気分", creator: "ハヤシユウ", url: "https://opentracks.com/bgm/detail/11555", volume: .2, load: () => import("../assets/music/airSlash.js") },
  humanClock: { id: "humanClock", title: "The Swing of Time", creator: "ザイオン (zion)", url: "https://opentracks.com/bgm/detail/22437", volume: .2, load: () => import("../assets/music/humanClock.js") },
  wipe: { id: "wipe", title: "お掃除しましょ", creator: "ゆうり (Yuli Audio Craft)", url: "https://opentracks.com/bgm/detail/12218", volume: .18, load: () => import("../assets/music/wipe.js") },
  poseWall: { id: "poseWall", title: "おもちゃの一日", creator: "いまたく", url: "https://opentracks.com/bgm/detail/7044", volume: .2, load: () => import("../assets/music/poseWall.js") },
  palmPong: { id: "palmPong", title: "パステルハウス", creator: "かずち", url: "https://opentracks.com/bgm/detail/1021", volume: .18, load: () => import("../assets/music/palmPong.js") },
  toyDrum: { id: "toyDrum", title: "おもちゃの一日", creator: "いまたく", url: "https://opentracks.com/bgm/detail/7044", volume: .22, load: () => import("../assets/music/toyDrum.js") },
  handy: { id: "handy", title: "ぷかぷか", creator: "ゆうり (Yuli Audio Craft)", url: "https://opentracks.com/bgm/detail/11821", volume: .25, load: () => import("../assets/music/handyPals.js") },
  stage: { id: "stage", title: "8-bit Stage1", creator: "もっぴーさうんど", url: "https://opentracks.com/bgm/detail/1982", volume: .16, load: () => import("../assets/music/stageOne.js") },
  cozy: { id: "cozy", title: "みるくぷりん", creator: "キュス", url: "https://opentracks.com/bgm/detail/16072", volume: .22, load: () => import("../assets/music/milkPudding.js") },
  spooky: { id: "spooky", title: "不穏ROOM", creator: "MAKOOTO", url: "https://opentracks.com/bgm/detail/9957", volume: .2, load: () => import("../assets/music/uneasyRoom.js") },
  finger: { id: "finger", title: "8-bit Aggressive1", creator: "もっぴーさうんど", url: "https://opentracks.com/bgm/detail/1978", volume: .22, load: () => import("../assets/music/fingerGunTheme.js") },
});
const themes = {
  "solo-human-fish": "humanFish",
  "duo-rock-paper-boom": "finger",
  "solo-hook": "handy",
  "solo-hand-spell": "handSpell",
  "solo-air-slash": "airSlash",
  "solo-dont-laugh": "toyDrum",
  "solo-tilt-turbo": "stage",
  "solo-counter-cam": "finger",
  "solo-human-clock": "humanClock",
  "solo-wipe": "wipe", "duo-wipe": "wipe",
  "solo-pose-wall": "poseWall",
  "duo-palm-pong": "palmPong",
  "solo-toy-drum": "toyDrum",
  "solo-body-wings": "stage",
  "solo-handy-pals": "handy",
  "solo-finger-gun": "finger", "solo-eat-dont-eat": "cozy", "solo-blink-horror": "blinkSpooky",
  "solo-pinch-world": "cozy", "solo-ghost-trail": "spooky", "voice-note-blaster": "stage",
  "duo-tiny-bot-duel": "stage", "guardian-spirit": "stage", "outcam-watermelon-guide": "stage",
  "outcam-false-bridge": "cozy", "outcam-frame-smuggler": "spooky", "solo-daitai-hero": "stage",
  "outcam-the-camera-is-it": "cozy", "solo-soft-serve": "cozy",
};
export function trackForGame(game, source) {
  // Singing must not hear the soundtrack through the microphone. HAND BEAT
  // already supplies its own timed beat; an unrelated tempo would mislead.
  if (game.requiresMicrophone && source !== "demo") return null;
  return tracks[themes[game.id]] ?? null;
}
export function musicAudible(snapshot, foreground = true) {
  return foreground && !snapshot?.paused && !snapshot?.musicSilent && ["playing", "locked", "review", "clear", "stage-clear"].includes(snapshot?.phase);
}
export function musicCreditMarkup(game, locale) {
  const track = tracks[themes[game.id]];
  if (!track) return "";
  const note = game.requiresMicrophone ? (locale === "ja" ? " · 練習のみ。歌うモードではBGMを止めます。" : " · Practice only. BGM stays silent while singing.") : "";
  return `<p class="game-music-credit">BGM: <a href="${track.url}" target="_blank" rel="noopener noreferrer">${esc(track.title)}</a> / ${esc(track.creator)} · OpenTracks${note}</p>`;
}

// One optional music owner for the active round. Created/resumed only by a
// player tap; importing this module or browsing the catalog never loads audio.
export class MusicBed {
  constructor({ enabled = true, contextFactory = () => {
    const Ctor = window.AudioContext ?? window.webkitAudioContext;
    return Ctor ? new Ctor() : null;
  }, fetchBytes = url => fetch(url).then(r => r.arrayBuffer()) } = {}) {
    this.enabled = enabled; this.contextFactory = contextFactory; this.fetchBytes = fetchBytes;
    this.cache = new Map(); this.token = 0; this.context = null; this.source = null;
    this.track = null; this.buffer = null; this.offset = 0; this.wanted = false; this.failed = false;
    this.rate = 1;
  }
  arm(track) {
    this.stop(); this.track = track; this.failed = false;
    if (this.enabled && track) this.prime();
  }
  prime() {
    if (!this.track || !this.enabled) return;
    try {
      this.context ??= this.contextFactory();
      if (!this.context) { this.failed = true; return; }
      void this.context.resume().catch(() => {});
      if (this.loading) return;
      if (this.buffer) { this.sync(); return; }
      const token = this.token, track = this.track, context = this.context;
      const cached = this.cache.get(track.id);
      this.loading = true;
      const decode = cached ? Promise.resolve(cached) : track.load()
        .then(({ default: url }) => this.fetchBytes(url))
        .then(bytes => token === this.token && context === this.context ? context.decodeAudioData(bytes) : null);
      void decode.then(buffer => {
        if (!buffer || token !== this.token || context !== this.context) return;
        // Keep one decoded track; four stereo buffers would cost ~75MB on a phone.
        this.cache.clear(); this.cache.set(track.id, buffer);
        this.loading = false; this.buffer = buffer; this.sync();
      }).catch(() => {
        if (token === this.token) { this.loading = false; this.failed = true; }
      });
    } catch { this.failed = true; }
  }
  update(snapshot, foreground = true) {
    this.filterHz = Math.max(80, Math.min(20000, Number(snapshot?.musicFilterHz) || 20000));
    if (this.filter) this.filter.frequency.setTargetAtTime(this.filterHz, this.context.currentTime, .1);
    const nextRate = Math.max(.5, Math.min(2, Number(snapshot?.musicRate) || 1));
    if (nextRate !== this.rate) { this.pause(); this.rate = nextRate; }
    this.wanted = musicAudible(snapshot, foreground);
    this.sync();
  }
  setEnabled(value) {
    this.enabled = value;
    if (value) this.prime();
    else this.pause();
    this.sync();
  }
  sync() {
    if (!this.enabled || !this.wanted || !this.buffer || !this.context || this.context.state !== "running") { this.pause(); return; }
    if (this.source) return;
    try {
      const node = this.context.createBufferSource(), gain = this.context.createGain();
      node.buffer = this.buffer; node.loop = true;
      if (node.playbackRate) node.playbackRate.value = this.rate;
      gain.gain.setValueAtTime(0, this.context.currentTime);
      gain.gain.linearRampToValueAtTime(this.track.volume, this.context.currentTime + .12);
      node.connect(gain);
      if (this.track.id === 'humanFish' && this.context.createBiquadFilter) {
        this.filter = this.context.createBiquadFilter(); this.filter.type = 'lowpass';
        this.filter.frequency.value = this.filterHz || 20000;
        gain.connect(this.filter); this.filter.connect(this.context.destination);
      } else gain.connect(this.context.destination);
      this.startedAt = this.context.currentTime;
      node.start(0, this.offset % this.buffer.duration);
      this.source = node; this.gain = gain;
    } catch { this.failed = true; }
  }
  pause() {
    if (!this.source) return;
    this.offset = (this.offset + Math.max(0, this.context.currentTime - this.startedAt) * this.rate) % this.buffer.duration;
    try { this.source.stop(); this.source.disconnect(); this.gain.disconnect(); } catch { /* Already stopped. */ }
    this.filter?.disconnect(); this.filter = null;
    this.source = null; this.gain = null;
  }
  stop() {
    ++this.token; this.pause();
    const context = this.context; this.context = null;
    if (context && context.state !== "closed") void context.close().catch(() => {});
    this.track = null; this.buffer = null; this.offset = 0; this.wanted = false; this.loading = false; this.rate = 1;
  }
}
