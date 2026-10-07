import { InstrumentSession } from '../../camera/instrument/InstrumentSession.js';
import { createCameraInstrument } from '../../camera/instrument/CameraInstrument.js';
import { banks } from '../../camera/instrument/InstrumentPresets.js';
import { projectCameraPoint, zoneDistance } from '../../camera/instrument/InstrumentZone.js';
import { instrumentDebug } from '../../camera/instrument/InstrumentDebugHUD.js';
import { InstrumentInput } from '../../input/cameraInstrumentInput.js';
import { InstrumentAudio } from '../../audio/instrument/InstrumentAudio.js';
import { InstrumentFX } from '../../visual/instrument/InstrumentFX.js';
import { MusicBed, tracks } from '../../platform/music.js';
import '../../camera/instrument/style.css';

export function createView(root, locale = 'ja') { return new PlaygroundView(root, locale); }
export class PlaygroundView extends InstrumentSession {
  constructor(root, locale) {
    super(root, locale); this.audio = new InstrumentAudio(); this.backing = new MusicBed(); this.backingEnabled = false;
    this.instrument = createCameraInstrument({ audio: this.audio });
    root.innerHTML = `<section class="cmi-view cmi-playground"><header class="cmi-toolbar"><span>WORLD / INSTRUMENT</span><button class="cmi-sound" type="button"></button><button class="cmi-pause" type="button"></button></header>
      <div class="cmi-stage" tabindex="0" role="group"><video muted playsinline></video><canvas aria-hidden="true"></canvas><div class="cmi-overlay" role="status" hidden></div><div class="cmi-guidance" role="status" aria-live="polite"></div><span class="cmi-mode-badge"></span></div>
      <div class="cmi-setup"><button class="cmi-add cmi-primary" type="button">＋ ADD SOUND</button><button class="cmi-edit" type="button"></button><button class="cmi-clear" type="button"></button></div>
      <div class="cmi-preset"><select class="cmi-bank" aria-label="Sound bank"><option value="pentatonic">MELODY · C D E G A</option><option value="drums">DRUM · KICK / SNARE</option><option value="toy">TOY · BELL / POP</option></select><button class="cmi-five" type="button"></button><button class="cmi-backing" type="button"></button></div>
      <p class="cmi-hint"></p><p class="cmi-credit">BGM: <a href="https://opentracks.com/bgm/detail/7044" target="_blank" rel="noopener noreferrer">おもちゃの一日</a> / いまたく · OpenTracks</p>
      <div class="cmi-recovery" hidden><button class="cmi-camera" type="button"></button><button class="cmi-demo" type="button"></button></div><button class="cmi-debug-toggle" type="button">DEBUG</button><pre class="cmi-debug" hidden></pre></section>`;
    this.stage = this.$('.cmi-stage'); this.video = this.$('video'); this.fx = new InstrumentFX(this.$('canvas'));
    this.instrument.on('hit', event => this.fx.hit(event));
    this.input = new InstrumentInput(this.video, { onFrame: (point, at) => { this.raw = point ? { point, at } : null; }, onStatus: (status, error) => { if (status === 'ERROR' && this.active && this.source === 'camera') this.fail(error); } });
    if (import.meta.env.DEV && this.debug) root.__cameraInstrument = this;
    this.reset(); this.render();
  }
  reset() { this.instrument.clear(); this.instrument.hits = 0; this.placing = true; this.editing = false; this.pointer = null; this.found = false; this.fx.effects = []; this.lastCue = ''; }
  resetTracking() { this.instrument.resetInput(); this.pointer = null; }
  viewport() { return { width: Math.max(1, this.stage.clientWidth), height: Math.max(1, this.stage.clientHeight) }; }
  addAt(point) {
    const sounds = banks[this.instrument.soundBank], n = this.instrument.zones.length;
    // First three spots make a C/E/G chord; spots four/five complete the scale.
    const order = this.instrument.soundBank === 'pentatonic' ? [0, 2, 3, 1, 4] : [0, 1, 2, 3, 4];
    const zone = this.instrument.addZone({ ...point, soundId: sounds[order[n]] });
    if (zone) { this.instrument.hit(zone.id, performance.now(), .7, 'setup'); this.placing = n < 2; }
    this.render();
  }
  bind() {
    const signal = this.bindCommon();
    this.stage.addEventListener('pointerdown', e => {
      if (this.phase !== 'playing' || this.paused || e.button > 0) return;
      e.preventDefault(); this.stage.focus({ preventScroll: true });
      const r = this.stage.getBoundingClientRect(), point = { x: Math.max(.03, Math.min(.97, (e.clientX - r.left) / r.width)), y: Math.max(.03, Math.min(.97, (e.clientY - r.top) / r.height)) };
      const zones = [...this.instrument.zones].sort((a, b) => zoneDistance(a, point, this.viewport()) - zoneDistance(b, point, this.viewport()));
      const selected = zones.find(z => zoneDistance(z, point, this.viewport()) <= z.radius);
      if (this.placing) { this.addAt(point); return; }
      if (this.editing && selected) { this.pointer = { id: e.pointerId, zone: selected, at: performance.now(), point, moved: false }; this.stage.setPointerCapture(e.pointerId); return; }
      if (this.source === 'demo' && selected) this.instrument.hit(selected.id);
    }, { signal });
    this.stage.addEventListener('pointermove', e => {
      if (this.pointer?.id !== e.pointerId || this.paused) return;
      const r = this.stage.getBoundingClientRect(), x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
      this.pointer.moved ||= Math.hypot(x - this.pointer.point.x, y - this.pointer.point.y) > .02;
      if (this.pointer.moved) { this.pointer.zone.x = x; this.pointer.zone.y = y; this.resetInputForDrag(); }
    }, { signal });
    this.stage.addEventListener('pointerup', () => { if (this.pointer && !this.pointer.moved) this.instrument.removeZone(this.pointer.zone.id); this.pointer = null; this.render(); }, { signal });
    this.stage.addEventListener('pointercancel', () => { this.pointer = null; }, { signal });
    this.$('.cmi-add').addEventListener('click', () => { this.placing = !this.placing; this.editing = false; this.render(); }, { signal });
    this.$('.cmi-edit').addEventListener('click', () => { this.editing = !this.editing; this.placing = false; this.resetTracking(); this.render(); }, { signal });
    this.$('.cmi-clear').addEventListener('click', () => { this.instrument.clear(); this.placing = true; this.editing = false; this.render(); }, { signal });
    this.$('.cmi-bank').addEventListener('change', e => {
      this.instrument.soundBank = e.target.value; const sounds = banks[e.target.value];
      this.instrument.zones.forEach((z, i) => { z.soundId = sounds[i]; z.label = sounds[i]; }); this.resetTracking(); this.render();
    }, { signal });
    this.$('.cmi-five').addEventListener('click', () => { this.instrument.setPreset({ pentatonic: 'toy-piano', drums: 'toy-drum', toy: 'toy-sounds' }[this.instrument.soundBank]); this.placing = false; this.editing = false; this.render(); }, { signal });
    this.$('.cmi-backing').addEventListener('click', () => {
      this.backingEnabled = !this.backingEnabled; if (this.backingEnabled) this.backing.arm(tracks.toyDrum); else this.backing.stop(); this.render();
    }, { signal });
    window.addEventListener('keydown', e => {
      if (!this.active || this.phase !== 'playing' || this.paused || this.source !== 'demo' || e.repeat || e.target.closest('input,select,textarea')) return;
      const index = Number(e.key) - 1;
      if (index >= 0 && index < 5) { e.preventDefault(); const zone = this.instrument.zones[index]; if (zone) this.instrument.hit(zone.id); }
    }, { signal });
  }
  resetInputForDrag() { this.instrument.resetInput(); }
  ready() { if (this.backingEnabled) this.backing.arm(tracks.toyDrum); }
  muteBacking() { this.backing.update({ phase: 'playing', paused: true }); }
  releaseBacking() { this.backing.stop(); }
  tick = at => {
    if (!this.active || this.phase !== 'playing') return;
    if (this.audio.context?.state !== 'running' && !this.paused) { this.paused = true; this.audio.silence(); this.muteBacking(); this.resetTracking(); this.notify(); }
    this.found = this.source === 'demo' || !!(this.raw && at - this.raw.at < 250);
    if (!this.paused && !this.placing && !this.editing && this.source === 'camera') {
      const point = this.found ? projectCameraPoint(this.raw.point, this.video.videoWidth, this.video.videoHeight, this.stage.clientWidth, this.stage.clientHeight) : null;
      this.instrument.update(point, this.found ? this.raw.at : at, this.viewport());
    }
    if (this.backing.enabled !== (this.backingEnabled && this.sound)) this.backing.setEnabled(this.backingEnabled && this.sound);
    this.backing.update({ phase: 'playing', paused: this.paused }, !document.hidden);
    this.fx.draw(this.instrument, at, this.debug); this.render(); this.raf = requestAnimationFrame(this.tick);
  };
  render() {
    if (!this.stage) return; this.renderCommon(); const ja = this.locale === 'ja';
    const count = this.instrument.zones.length;
    this.$('.cmi-add').disabled = count >= 5 || this.phase !== 'playing' || this.paused;
    this.$('.cmi-add').textContent = this.placing && count < 5 ? ja ? '画面で物を選ぼう' : 'TAP AN OBJECT' : `＋ ADD SOUND ${count}/5`;
    this.$('.cmi-add').setAttribute('aria-pressed', String(this.placing));
    this.$('.cmi-edit').textContent = this.editing ? ja ? '編集おわり' : 'DONE' : ja ? '位置・削除' : 'EDIT';
    this.$('.cmi-edit').setAttribute('aria-pressed', String(this.editing)); this.$('.cmi-clear').textContent = ja ? 'クリア' : 'CLEAR';
    this.$('.cmi-five').textContent = ja ? '5つ自動配置' : '5-SPOT PRESET'; this.$('.cmi-backing').textContent = this.backingEnabled ? ja ? '伴奏 ON' : 'BACKING ON' : ja ? '伴奏 OFF' : 'BACKING OFF'; this.$('.cmi-backing').setAttribute('aria-pressed', String(this.backingEnabled));
    const cue = this.placing ? ja ? `好きな物を${count < 3 ? 3 - count : 1}つ選ぼう` : `Pick ${count < 3 ? 3 - count : 1} object${count < 2 ? 's' : ''}` : this.editing ? ja ? 'ドラッグで移動。タップで削除。' : 'Drag to move. Tap to remove.' : !this.found && this.source === 'camera' ? ja ? '👆 手を映してみよう' : '👆 Bring your hand into view' : ja ? 'トントンしてみよう！' : 'Give it a little tap!';
    if (cue !== this.lastCue) { this.$('.cmi-guidance').textContent = cue; this.lastCue = cue; }
    this.$('.cmi-mode-badge').textContent = this.source === 'demo' ? ja ? 'カメラなしの練習' : 'CAMERA-FREE PRACTICE' : 'LIVE · REAR CAMERA';
    this.$('.cmi-hint').textContent = this.source === 'demo' ? ja ? '音スポットをタップ、または1〜5キーで演奏。' : 'Tap a sound spot or play keys 1–5.' : ja ? '物の手前から指をトン。次の音は一度離してね。スマホを固定すると遊びやすいよ。' : 'Tap toward the object. Lift your finger before the next note. Keep the phone steady.';
    if (this.debug) this.$('.cmi-debug').textContent = instrumentDebug(this.instrument, this.found);
    for (const selector of ['.cmi-edit', '.cmi-clear', '.cmi-bank', '.cmi-five', '.cmi-backing']) this.$(selector).disabled = this.phase !== 'playing' || this.paused;
  }
}
