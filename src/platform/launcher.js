// Compatibility adapters own launch/lifecycle only. Game rules remain in src/games.
import { MotionDirector } from './motionDirector.js';
const startSelectors = { solo: "#play-button", duo: ".duo-start-button", watermelon: ".outcam-start-button", blaster: ".nb-start" };
const demoSelectors = { duo: ".duo-fallback-button", watermelon: ".outcam-demo-button", daitai: ".dh-tap-button", guardian: ".gs-demo", blaster: ".nb-demo" };

export function snapshotOf(instance, module) {
  const paused = !!(instance.game?.paused || instance.paused || instance.manualPause || instance.inputLost || instance.audioInterrupted || instance.unavailable);
  if (typeof instance.snapshot === "function") return { ...instance.snapshot(), paused };
  const phase = (module === "guardian" ? instance.game.phase : module === "daitai" ? instance.screen : instance.phase)?.toLowerCase();
  let result = null;
  if (phase === "result") {
    if (module === "duo") result = { ...instance.result, score: instance.result?.hits?.reduce((a, b) => a + b, 0) ?? 0 };
    else if (module === "watermelon") result = { score: instance.score, hits: instance.hits };
    else if (module === "daitai") result = instance.game.result();
    else result = instance.game.result;
  }
  const rawSource = instance.source ?? instance.mode ?? instance.control;
  const source = ["TAP", "fallback", "keyboard", "demo"].includes(rawSource) ? "demo" : rawSource === "FACE" ? "camera" : rawSource;
  return { phase, result, source, paused };
}

export function releaseResources(instance) {
  if (instance.releaseInputs) instance.releaseInputs();
  else { instance.input?.stop(); instance.voice?.stop(); instance.face?.stop(); }
}

// One cached controller per module avoids accumulating its existing global event
// listeners. Dormant controllers have no stream, model, timer or AudioContext.
export function createLauncher(cacheRoot, { onState, onExit, onPhotoError, onReplay }) {
  const cache = new Map();
  let generation = 0, current = null;
  function closeAudio(instance) {
    const owner = instance.audio;
    if (owner?.context) { void owner.context.close().catch(() => {}); owner.context = null; }
  }
  function stop() {
    ++generation;
    if (!current) return;
    const entry = current; current = null;
    entry.enabled = false;
    entry.autoStart = false;
    entry.motion.stop();
    entry.instance.deactivate(); releaseResources(entry.instance); closeAudio(entry.instance);
    entry.host.hidden = true;
  }
  async function prepare(game, locale) {
    stop();
    const request = generation;
    let entry = cache.get(game.module);
    if (!entry) {
      const factory = await game.load();
      if (request !== generation) return null;
      const host = document.createElement("section"); host.hidden = true; host.className = "platform-game-module";
      cacheRoot.append(host);
      let instance;
      try { instance = factory(host, locale, { onExit, onReplay: () => { if (current === entry && entry.enabled) onReplay?.(entry.game); } }); }
      catch (error) { host.remove(); throw error; }
      entry = { instance, host, enabled: false, autoStart: false, lastPhase: null, game };
      entry.motion = new MotionDirector(host);
      cache.set(game.module, entry);
      const observe = () => {
        if (current !== entry || !entry.enabled) return;
        const snapshot = snapshotOf(instance, game.module);
        entry.motion.update(instance, entry.game, snapshot);
        if (entry.lastPhase !== snapshot.phase) {
          entry.lastPhase = snapshot.phase;
          onState(snapshot, entry.game);
        }
        const start = host.querySelector(entry.game.startSelector ?? startSelectors[game.module] ?? ".no-auto-start");
        if (entry.autoStart && start && !start.disabled && !start.hidden && !["playing", "countdown", "result"].includes(snapshot.phase)) {
          entry.autoStart = false;
          const token = generation;
          queueMicrotask(() => { if (token === generation && requestActive(entry)) start.click(); });
        }
      };
      if (instance.subscribe) instance.subscribe(observe);
      if (typeof instance.render === 'function') {
        const render = instance.render.bind(instance);
        instance.render = (...args) => {
          const result = render(...args);
          if (instance.subscribe) {
            if (current === entry && entry.enabled) entry.motion.update(instance, entry.game, snapshotOf(instance, entry.game.module));
          } else observe();
          return result;
        };
      }
      if (game.module === "guardian") {
        const enterPhoto = instance.enterPhoto.bind(instance);
        instance.enterPhoto = async () => {
          const token = generation;
          try {
            if (instance.source === "camera" && !instance.input.running) await instance.input.start();
            if (current === entry && token === generation) enterPhoto();
          } catch (error) { if (token === generation && error.name !== "AbortError") onPhotoError?.(); }
        };
      }
    }
    if (request !== generation) return null;
    current = entry; entry.game = game; entry.lastPhase = null; entry.instance.setLocale(locale);
    return entry;
  }
  const requestActive = (entry) => current === entry && !entry.host.hidden;
  function begin(source = "camera", options = {}) {
    if (!current) return;
    const entry = current;
    entry.options = options; entry.instance.configure?.(options);
    entry.lastPhase = null; entry.host.hidden = false; entry.autoStart = true; entry.enabled = true;
    entry.motion.begin(entry.game);
    entry.instance.activate(entry.game.mode);
    if (source === "demo" && entry.instance.startDemo) entry.instance.startDemo();
    else if (source === "demo") entry.host.querySelector(entry.game.demoSelector ?? demoSelectors[entry.game.module])?.click();
    else if (entry.instance.enable) void entry.instance.enable();
    else void entry.instance.startCamera();
  }
  return {
    prepare, begin, stop,
    snapshot() { return current?.enabled ? snapshotOf(current.instance, current.game.module) : null; },
    setLocale(locale) { current?.instance.setLocale(locale); },
    releaseResult() { if (current) { current.autoStart = false; current.motion.stop(); releaseResources(current.instance); closeAudio(current.instance); } },
    retry(source) {
      if (!current) return;
      ++generation; current.autoStart = false; current.enabled = false; current.motion.stop(); current.instance.deactivate(); releaseResources(current.instance); closeAudio(current.instance); begin(source, current.options);
    },
  };
}
