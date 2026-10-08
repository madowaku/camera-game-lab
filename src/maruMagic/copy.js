export const SPIRITS = [
  { ja: 'じゃがいも精霊', en: 'Potato spirit', rankJa: 'いびつ召喚', rankEn: 'WONKY SUMMON', quoteJa: '「うむ。完璧な魔法陣であった。」', quoteEn: '“Yes. A flawless magic circle.”', color: '#edba7d', band: '0–49' },
  { ja: 'カエル精霊', en: 'Frog spirit', rankJa: 'ふつう召喚', rankEn: 'HAPPY SUMMON', quoteJa: '「ちょっとゆがんでても、けろっ！」', quoteEn: '“A little wonky? Still hoppy!”', color: '#a3e4b5', band: '50–79' },
  { ja: '星の精霊', en: 'Star spirit', rankJa: '上級召喚', rankEn: 'STELLAR SUMMON', quoteJa: '「いいまる！きらきらをあげる。」', quoteEn: '“Lovely circle. Have a little starlight.”', color: '#ffd477', band: '80–94' },
  { ja: '光の精霊', en: 'Light spirit', rankJa: '伝説召喚', rankEn: 'LEGENDARY SUMMON', quoteJa: '「あなたのまるに、光あれ。」', quoteEn: '“Let there be light in your circle.”', color: '#fff0c4', band: '95–100' },
];
export const HINTS = {
  line: ['ぐるっと一周してみよう。', 'Try one whole loop.'], small: ['もう少し大きなまるを描こう。', 'Make your circle a little bigger.'],
  open: ['始めた場所まで、もう少し！', 'Go all the way back to where you started.'], reverse: ['途中で戻らず、同じ方向へ。', 'Keep going in one direction.'], multiple: ['まるは一周でOK！', 'One loop is all you need!'],
  tracking: ['指を見失いました。点数は付けずに、もう一度。', 'Lost your finger. No score — try again.'], pause: ['描きかけはリセット。いつでも次のまるへ。', 'The unfinished stroke was reset. A fresh circle awaits.'],
};
export function resultHint(r, locale) {
  if (r.reason) return HINTS[r.reason][locale === 'ja' ? 0 : 1];
  if (r.parts.roundness < 80) return locale === 'ja' ? '縦と横を同じくらいにすると、もっとまるくなる。' : 'Try giving your circle the same height and width.';
  if (r.parts.closure < 85) return locale === 'ja' ? '最後を始めた場所に近づけてみよう。' : 'Finish a little closer to your starting point.';
  return locale === 'ja' ? 'いいまる！次は、どんな精霊が生まれる？' : 'Lovely circle! Who will you summon next?';
}
