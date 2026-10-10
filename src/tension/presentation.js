import * as arcade from '../platform/gamePresentation.js';

const credits = locale => `<p class="tnd-credits">${locale === 'ja' ? '画像: OpenAI Imagegen。' : 'Artwork: OpenAI Imagegen.'} BGM: “Loop03” · <a href="https://otologic.jp/free/bgm/short-loop01.html" target="_blank" rel="noopener">OtoLogic</a> (<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>) · SE: <a href="https://kenney.nl/assets/impact-sounds" target="_blank" rel="noopener">Kenney Impact Sounds</a> / <a href="https://kenney.nl/assets/interface-sounds" target="_blank" rel="noopener">Interface Sounds</a> (CC0)</p>`;

export const launchMarkup = arcade.launchMarkup;
export const resultMarkup = arcade.resultMarkup;
export function howtoMarkup(game, locale) { return arcade.howtoMarkup(game, locale) + credits(locale); }
export function paint() {}
