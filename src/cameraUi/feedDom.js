import './style.css';

// The camera never starts during mount. A real tap/keyboard action opts into it.
export function createFeedControls(root, locale = 'ja') {
  const ja = locale === 'ja';
  const panel = document.createElement('aside');
  panel.className = 'camera-ui';
  panel.setAttribute('aria-label', ja ? '指による画面操作' : 'Camera UI');
  const toggle = document.createElement('button');
  toggle.className = 'camera-ui-toggle';
  toggle.type = 'button';
  const nav = document.createElement('div');
  nav.className = 'camera-ui-nav'; nav.hidden = true;
  const up = document.createElement('button'), down = document.createElement('button');
  up.type = down.type = 'button'; up.textContent = '↑'; down.textContent = '↓';
  up.dataset.cameraUiAction = 'prev'; down.dataset.cameraUiAction = 'next';
  up.setAttribute('aria-label', ja ? '前のゲーム' : 'Previous game');
  down.setAttribute('aria-label', ja ? '次のゲーム' : 'Next game');
  nav.append(up, down);
  const hint = document.createElement('p');
  hint.className = 'camera-ui-hint'; hint.hidden = true;
  hint.textContent = ja ? 'ボタンに指を止めて決定 · 左端で上下にシュッ' : 'Hold on a button to select · Flick up/down at the left edge';
  const cursor = document.createElement('div');
  cursor.className = 'camera-ui-cursor'; cursor.hidden = true; cursor.setAttribute('aria-hidden','true');
  cursor.append(document.createElement('span'));
  const video = document.createElement('video');
  video.hidden = true; video.muted = true; video.playsInline = true; video.setAttribute('aria-hidden','true');
  const status = document.createElement('p');
  status.className = 'camera-ui-status'; status.setAttribute('role','status'); status.setAttribute('aria-live','polite');
  panel.append(toggle, nav, hint, cursor, video, status);
  root.append(panel);
  const setLabel = (enabled, starting = false) => {
    toggle.textContent = starting ? (ja ? 'カメラ準備中…' : 'STARTING CAMERA…')
      : enabled ? (ja ? '☝ 手で操作 ON' : '☝ HAND UI ON') : (ja ? '☝ 手で操作 OFF' : '☝ HAND UI OFF');
    toggle.setAttribute('aria-pressed', String(enabled));
  };
  const show = enabled => { nav.hidden = !enabled; hint.hidden = !enabled; cursor.hidden = true; };
  setLabel(false);
  return { panel, toggle, nav, hint, cursor, video, status, setLabel, show, ja };
}
