import { titleOf, subtitleOf } from './experiments.js';
import { copy, inputLabel, escapeHtml as esc } from './copy.js';
import { previewMarkup, activatePreview } from './preview.js';

// Keep the game-owned controls, datasets and option handlers. Only the entrance
// presentation is shared; gameplay and result renderers remain game-owned.
export function simplifyLaunch(panel, game, locale) {
  const entry = panel.firstElementChild;
  const controls = panel.querySelector('.launch-controls,.launch-actions');
  const status = panel.querySelector('.launch-status');
  if (!entry || !controls || !status) return;
  const ja = locale === 'ja';
  controls.remove(); status.remove();
  const optionSelector = 'button,input,select,textarea,label,fieldset,[role="group"]';
  const prune = element => {
    if (element.matches(optionSelector) || (element.hidden && element.querySelector(optionSelector))) return true;
    for (const child of [...element.childNodes]) {
      if (child.nodeType !== 1 || !prune(child)) child.remove();
    }
    return !!element.querySelector(optionSelector);
  };
  for (const child of [...entry.childNodes]) {
    if (child.nodeType !== 1 || !prune(child)) child.remove();
  }
  const settings = document.createElement('details');
  settings.className = 'launch-settings';
  const summary = document.createElement('summary');
  summary.textContent = ja ? 'キャラクター・あそびの設定' : 'Characters & play settings';
  const options = document.createElement('div'); options.className = 'launch-options';
  options.append(...entry.childNodes);
  settings.append(summary, options);
  entry.classList.add('launch-overview');
  entry.innerHTML = `<div class="launch-art preview-active" aria-hidden="true">${previewMarkup(game)}</div>
    <div class="launch-heading"><h1>${esc(titleOf(game, locale))}</h1><p>${esc(subtitleOf(game, locale))}</p></div>
    <p class="launch-facts">${game.input.map(i => esc(inputLabel(i, locale))).join(' + ')} · ${game.players}${copy(locale, 'players')} · ${game.untimed ? (ja ? '好きなだけ' : 'No time limit') : copy(locale, 'seconds', { n: game.duration })}</p>`;
  controls.className = 'launch-controls launch-main-actions';
  for (const [selector, label] of [
    ['.launch-camera', ja ? (game.requiresMicrophone ? 'カメラと声であそぶ' : 'カメラであそぶ') : 'PLAY WITH CAMERA'],
    ['.launch-demo', ja ? 'カメラなしで練習' : 'TRY WITHOUT CAMERA'],
    ['.launch-howto', ja ? 'あそび方' : 'HOW TO PLAY'],
  ]) {
    const button = controls.querySelector(selector);
    if (button) { button.textContent = label; button.setAttribute('aria-label', label); }
  }
  entry.append(controls, status);
  if (options.querySelector(optionSelector)) entry.append(settings);
  const notice = document.createElement('p'); notice.className = 'launch-camera-notice';
  notice.textContent = ja ? (game.requiresMicrophone ? 'カメラとマイクを操作に使います。' : 'カメラに映る動きを操作に使います。') : (game.requiresMicrophone ? 'Your camera and microphone control the game.' : 'Your movement on camera controls the game.');
  entry.append(notice);
  activatePreview(entry, true, matchMedia('(prefers-reduced-motion: reduce)').matches);
}
