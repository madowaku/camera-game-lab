import { DwellTarget, AirSwipe, projectHandCursor } from './core.js';
import { createCameraControls } from './dom.js';

const selectors = {
  feed: '.feed-card:not([inert]) button[data-action="play"],.feed-card:not([inert]) button[data-action="advance"],.feed-card:not([inert]) button[data-action="previous"]',
  launch: '.launch-camera,.launch-demo,.launch-howto,.game-back',
  result: '[data-result-action="retry"],[data-result-action="next"],[data-result-action="browse"],.game-back',
  'inline-result': '[data-inline-action="retry"],[data-inline-action="next"],.game-back',
};

// One opt-in per page visit. Menu inference is stopped before game inference,
// and reacquired only in FEED, preflight or results. Never load models on mount.
export function mountCameraUi(root, { locale = 'ja', loadInput = () => import('./input.js'), onEnabledChange } = {}) {
  const ui = createCameraControls(root), abort = new AbortController();
  const dwell = new DwellTarget({ holdMs: 650, tolerancePx: 22, maxGapMs: 160 }), swipe = new AirSwipe();
  let scene = 'off', enabled = false, starting = false, input = null, generation = 0, disposed = false;
  let target = null, locked = null, onNavigate, message = '', lastFrameAt = -Infinity;
  let external = false;
  const render = () => ui.render({ locale, enabled, starting, scene, message });
  const clear = () => {
    target?.classList.remove('camera-ui-hover'); target = null; locked = null;
    dwell.reset(); swipe.reset(); ui.cursor.hidden = true; ui.cursor.style.setProperty('--dwell', '0%');
  };
  const eligible = () => !!selectors[scene] && !document.hidden && document.hasFocus();
  const stop = () => { ++generation; starting = false; input?.stop(); input = null; clear(); };
  const pick = point => {
    const dialog = root.querySelector('dialog[open]');
    const element = document.elementFromPoint(point.x, point.y)?.closest(dialog ? '.sheet-close' : `${selectors[scene]},.camera-ui-toggle`);
    if (!element || !(dialog ?? root).contains(element) || element.disabled || element.closest('[inert]') || !element.getClientRects().length) return null;
    return element;
  };
  function onResult(result, at) {
    if (!enabled || (!external && !input?.running) || !eligible() || disposed) return;
    lastFrameAt = performance.now();
    const point = projectHandCursor(result, innerWidth, innerHeight);
    if (!point) { clear(); return; }
    ui.cursor.hidden = false; ui.cursor.style.left = `${point.x}px`; ui.cursor.style.top = `${point.y}px`;
    const next = pick(point);
    if (target !== next) {
      target?.classList.remove('camera-ui-hover'); dwell.reset(); target = next;
      if (locked !== next) locked = null;
      target?.classList.add('camera-ui-hover');
    }
    dwell.holdMs = target?.dataset.inlineAction === 'retry' ? 700 : 650;
    const fired = target && target !== locked && dwell.update(point, at, target.getBoundingClientRect());
    ui.cursor.style.setProperty('--dwell', `${Math.round(dwell.progress * 100)}%`);
    const direction = swipe.update(point, at, { width: innerWidth, height: innerHeight, blocked: scene !== 'feed' || !!target || !!root.querySelector('dialog[open]') });
    if (fired) { const selected = target; locked = selected; dwell.reset(); selected.click(); }
    else if (direction) {
      target?.classList.remove('camera-ui-hover'); target = null; locked = null; dwell.reset();
      ui.cursor.style.setProperty('--dwell', '0%'); onNavigate?.(direction);
    }
  }
  async function start() {
    if (external || !enabled || !eligible() || starting || input?.running || disposed) return;
    const token = ++generation; starting = true; message = ''; render();
    let candidate;
    try {
      const { CameraUiInput } = await loadInput();
      if (token !== generation || disposed) return;
      candidate = new CameraUiInput(ui.video, { onResult, onStatus(code) {
        if (token !== generation || disposed) return;
        if (code === 'ERROR') { stop(); enabled = false; onEnabledChange?.(false); message = locale === 'ja' ? 'カメラが止まりました。タッチで続けられます。' : 'Camera stopped. You can still use touch.'; render(); }
      } });
      input = candidate; await candidate.start();
      if (token !== generation || disposed) { candidate.stop(); return; }
      starting = false; clear(); render();
    } catch (error) {
      candidate?.stop();
      if (token !== generation || disposed) return;
      stop(); enabled = false; onEnabledChange?.(false);
      message = locale === 'ja' ? (error?.name === 'NotAllowedError' ? 'カメラの許可が必要です。タッチで続けられます。' : 'カメラを使えません。タッチで続けられます。') : 'Camera unavailable. You can still use touch.';
      render();
    }
  }
  ui.toggle.addEventListener('click', () => {
    enabled = !enabled; onEnabledChange?.(enabled); message = ''; stop(); render(); if (enabled) void start();
  }, { signal: abort.signal });
  // A stalled video must not leave a partially filled selection armed.
  const watchdog = setInterval(() => { if (performance.now() - lastFrameAt > 200) clear(); }, 120);
  document.addEventListener('visibilitychange', () => { stop(); render(); if (!document.hidden) void start(); }, { signal: abort.signal });
  window.addEventListener('blur', () => { stop(); render(); }, { signal: abort.signal });
  window.addEventListener('focus', () => { void start(); }, { signal: abort.signal });
  window.addEventListener('resize', clear, { signal: abort.signal });
  window.addEventListener('pagehide', stop, { signal: abort.signal });
  render();
  return {
    setScene(next, options = {}) { stop(); scene = next; external = !!options.external; onNavigate = options.onNavigate; message = ''; render(); void start(); },
    acceptFrame(frame, at) { if (external) onResult(frame, at); },
    get enabled() { return enabled; },
    setLocale(next) { locale = next; clear(); render(); },
    resetTargets: clear,
    destroy() { if (disposed) return; disposed = true; stop(); abort.abort(); clearInterval(watchdog); ui.panel.remove(); }
  };
}
