import './style.css';

export function createCameraControls(root) {
  const panel = document.createElement('aside'); panel.className = 'camera-ui';
  panel.innerHTML = `<div class="camera-ui-bar"><button class="camera-ui-toggle" type="button" aria-pressed="false"></button><p class="camera-ui-hint" role="status"></p></div><p class="camera-ui-status" role="status" aria-live="polite"></p><div class="camera-ui-cursor" hidden aria-hidden="true"><span></span></div><video hidden muted playsinline aria-hidden="true"></video>`;
  root.querySelector('.platform-header').after(panel);
  const ui = {
    panel, toggle: panel.querySelector('button'), hint: panel.querySelector('.camera-ui-hint'),
    status: panel.querySelector('.camera-ui-status'), cursor: panel.querySelector('.camera-ui-cursor'), video: panel.querySelector('video'),
    render({ locale, enabled, starting, scene, message = '' }) {
      const ja = locale === 'ja';
      panel.dataset.scene = scene;
      panel.hidden = !['feed', 'launch', 'result', 'inline-result'].includes(scene);
      ui.toggle.textContent = starting ? (ja ? '手の操作を準備中…' : 'Starting hand control…') : (ja ? `☝ 手で操作 ${enabled ? 'ON' : 'OFF'}` : `☝ Hand control ${enabled ? 'ON' : 'OFF'}`);
      ui.toggle.setAttribute('aria-pressed', String(enabled));
      ui.toggle.setAttribute('aria-busy', String(starting));
      ui.hint.textContent = enabled ? (ja ? (scene === 'feed' ? '指で決定 · 左側で上下に動かす' : '指を合わせて、光がたまると決定') : (scene === 'feed' ? 'Point to select · Swipe on the left' : 'Point and hold until the ring fills')) : (ja ? 'タッチでも、手でも' : 'Touch or use your hand');
      ui.status.textContent = message;
    }
  };
  ui.video.muted = true; ui.video.playsInline = true;
  return ui;
}
