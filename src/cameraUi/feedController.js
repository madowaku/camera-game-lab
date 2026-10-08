import { DwellTarget, AirSwipe } from './core.js';
import { CameraUiInput, projectHandCursor } from './input.js';
import { createFeedControls } from './feedDom.js';

// FEED-only: opt-in camera, explicit target allowlist, no artificial pointer events.
// Both menu mode and its video/model are fully released before launching a game.
export function mountCameraUi(root, { locale = 'ja', onNavigate } = {}) {
  const ui = createFeedControls(root, locale);
  const { panel, toggle, nav, cursor, video, status } = ui;
  const abort = new AbortController();
  const dwell = new DwellTarget({ holdMs: 650, tolerancePx: 22, maxGapMs: 160 });
  const swipe = new AirSwipe();
  let active = false, starting = false, disposed = false, target = null, locked = null;

  const clear = () => {
    dwell.reset(); swipe.reset();
    target?.classList.remove('camera-ui-hover');
    target = null; locked = null; cursor.hidden = true;
  };
  const pick = point => {
    const found = document.elementFromPoint(point.x, point.y)?.closest?.(
      'button[data-camera-ui-action],button[data-action="play"],button[data-action="advance"],button[data-action="favorite"]'
    );
    if (!found || !root.contains(found) || found.disabled || found.closest('[inert]')) return null;
    return found.hidden || !found.getClientRects().length ? null : found;
  };
  const onResult = (result, at) => {
    if (!active || disposed || document.hidden) return;
    const point = projectHandCursor(result, window.innerWidth, window.innerHeight);
    if (!point) { target?.classList.remove('camera-ui-hover'); target = null; dwell.reset(); swipe.reset(); cursor.hidden = true; return; }
    cursor.hidden = false;
    cursor.style.left = point.x + 'px'; cursor.style.top = point.y + 'px';
    const next = pick(point);
    if (next !== target) {
      target?.classList.remove('camera-ui-hover'); dwell.reset(); target = next;
      if (locked !== next) locked = null;
      target?.classList.add('camera-ui-hover');
    }
    const fired = target && target !== locked && dwell.update(point, at, target.getBoundingClientRect());
    cursor.style.setProperty('--dwell', Math.round(dwell.progress * 100) + '%');
    const direction = swipe.update(point, at, { width: window.innerWidth, height: window.innerHeight, blocked: !!target });
    if (fired) {
      locked = target;
      const action = target.dataset.cameraUiAction;
      if (action) onNavigate?.(action === 'next' ? 1 : -1);
      else target.click();
      dwell.reset(); cursor.style.setProperty('--dwell', '0%');
    } else if (direction) {
      target?.classList.remove('camera-ui-hover'); target = null; locked = null; dwell.reset();
      onNavigate?.(direction);
    }
  };
  const input = new CameraUiInput(video, {
    onResult,
    onStatus(code) {
      if (disposed) return;
      if (code === 'ERROR') stop(ui.ja ? 'カメラ接続が終了しました' : 'Camera connection ended');
      if (code === 'READY') status.textContent = '';
    }
  });
  function stop(message = '') {
    active = false; starting = false; input.stop(); clear();
    ui.show(false); ui.setLabel(false); status.textContent = message;
  }
  toggle.addEventListener('click', async () => {
    if (starting || disposed) return;
    if (active) { stop(); return; }
    starting = true; ui.setLabel(false, true); status.textContent = '';
    try {
      await input.start();
      if (disposed || !starting) { input.stop(); return; }
      starting = false; active = true; clear(); ui.show(true); ui.setLabel(true);
    } catch (error) {
      if (disposed) return;
      stop(error?.name === 'NotAllowedError'
        ? (ui.ja ? 'カメラの許可が必要です' : 'Camera permission needed')
        : (ui.ja ? 'カメラを開始できません。タッチ操作は利用できます' : 'Camera unavailable. Touch controls still work.'));
    }
  }, { signal: abort.signal });
  nav.addEventListener('click', event => {
    const action = event.target.closest('[data-camera-ui-action]')?.dataset.cameraUiAction;
    if (action) onNavigate?.(action === 'next' ? 1 : -1);
  }, { signal: abort.signal });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); }, { signal: abort.signal });
  window.addEventListener('pagehide', () => stop(), { signal: abort.signal });
  window.addEventListener('blur', () => { if (active) clear(); }, { signal: abort.signal });
  window.addEventListener('resize', clear, { signal: abort.signal });
  return { stop, destroy() { if (disposed) return; disposed = true; abort.abort(); stop(); panel.remove(); } };
}
