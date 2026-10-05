import { escapeHtml as esc } from '../platform/copy.js';
import { howtoMarkup as sharedHowto } from '../platform/gamePresentation.js';
import './title.css';

export function launchMarkup(game, locale) {
  const ja = locale === 'ja';
  return `<section class="si-entry"><div class="si-title-edition"><span>EXP—057 / SOUND TOY</span><span>DRAW = COMPOSE</span></div>
    <div class="si-title-card"><img class="si-title-art" src="/artwork/sonic-ink-title-v1.webp" width="864" height="1535" alt="${ja ? 'パステルの光でできた立体のハート、お花、音符' : 'A floating heart, flower and musical notes made of pastel glass light'}" fetchpriority="high" decoding="async">
      <div class="si-title-heading"><p>A LITTLE MAGIC IN THE AIR</p><h1>SONIC INK<span aria-hidden="true">✦</span></h1><p class="si-title-tagline">${ja ? 'その線が、メロディになる。' : 'Your doodle. Your melody.'}</p></div>
      <div class="si-title-bottom"><p class="si-title-rules">${ja ? '15秒 · 3本の線 · きみだけの音楽' : '15 seconds · 3 strokes · Your own music'}</p>
        <div class="launch-controls si-title-controls"><button class="launch-camera" type="button" disabled aria-label="${ja ? 'カメラでSONIC INKをはじめる' : 'Play SONIC INK with your camera'}"><span>PLAY<small>${ja ? 'カメラでお絵描き' : 'DRAW WITH YOUR CAMERA'}</small></span><b aria-hidden="true">↗</b></button><button class="launch-demo" type="button" disabled>${ja ? 'カメラなしで練習' : 'TRY WITHOUT CAMERA'} <span aria-hidden="true">→</span></button><button class="launch-howto" type="button">${ja ? '遊び方' : 'HOW TO PLAY'} <span aria-hidden="true">＋</span></button></div>
      </div>
    </div><p class="launch-status si-title-status" role="status"></p>
    <details class="si-title-privacy"><summary>${ja ? 'カメラのこと' : 'ABOUT YOUR CAMERA'}</summary><p>${esc(game[ja ? 'privacyJa' : 'privacyEn'])}</p></details></section>`;
}
export function howtoMarkup(game, locale) { return sharedHowto(game, locale); }
export function paint() {}
