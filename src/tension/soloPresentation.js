import * as arcade from '../platform/gamePresentation.js';
export const launchMarkup = arcade.launchMarkup;
export function resultMarkup(game, result, locale) {
  return arcade.resultMarkup(game, result, locale).replace('<button type="button" data-result-action="next">NEXT GAME →</button>', `<button type="button" data-result-action="change-layout">${locale === 'ja' ? '配置を変える' : 'CHANGE LAYOUT'}</button><button type="button" data-result-action="browse">${locale === 'ja' ? '戻る' : 'BACK'}</button>`);
}
export function howtoMarkup(game, locale) {
  return arcade.howtoMarkup(game, locale) + `<p>Artwork: OpenAI Imagegen · BGM: “Loop03” · <a href="https://otologic.jp/free/bgm/short-loop01.html">OtoLogic</a> (<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>) · SE: <a href="https://kenney.nl/assets/impact-sounds">Kenney Impact / Interface Sounds</a> (CC0)</p><p><a href="#/game/duo-tension-duel">TENSION DUEL · 1 VS 1 →</a></p>`;
}
export function paint() {}
