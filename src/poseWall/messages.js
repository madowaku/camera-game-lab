const ja = {
  tagline: 'カタチをまねて、スポッと抜けよう。', steps: [['穴のカタチを見る', '腕を上げる？ ひろげる？'], ['同じポーズで待つ', '壁が来るまで、そのまま！'], ['スポッ！ むぎゅっ！', 'ぶつかっても、次の壁へ。']],
  play: 'PLAY', practice: 'カメラなしで練習', howto: '遊び方', privacy: 'カメラについて',
  guide: '頭・肩・肘・手首が映るようにスマホを縦に置き、顔を点線へ。穴と同じ腕のカタチをつくろう。5枚、15秒のチャレンジ！',
  tip: '腕は画面の中に。ぴったりでなくても「むぎゅっ」と通れるよ。',
  demoHint: 'ポーズをタップ / 1〜5キー。0で腕を下ろす。肘・手首の丸も動かせるよ。', cameraHint: '穴と同じカタチに。壁が来るまで、そのまま！',
  demo: 'PRACTICE · カメラなし', camera: 'LIVE · 上半身でプレイ', canvas: 'ポーズの穴が開いた壁が近づくゲーム画面',
  loading: 'カメラの準備中', model: '初回はポーズ認識モデルを読み込みます。', permission: 'カメラへのアクセスを許可してください。',
  frame: '顔をここに合わせてね', frameHint: '顔と両肩を映してね。腕を上げる余白もつくろう。', farther: '少し離れてね', closer: '少し近づいてね',
  ready: 'READY!', pause: '一時停止', paused: 'ひとやすみ', resume: 'つづける', lost: '顔と両肩を画面へ', lostHint: '映ったら、自動でつづきから。',
  error: 'カメラを使えません', errorHint: 'ブラウザーのカメラ許可を確認して再接続するか、練習で遊べます。', retryCamera: 'カメラを再接続',
  leftHand: '← 左腕を画面へ', rightHand: '右腕を画面へ →', rest: '腕を下ろす', selected: '選択中', sfx: '効果音', hold: 'そのまま！', squeeze: 'むぎゅっ', crash: 'バゴン！',
  again: 'もう一回！', next: 'NEXT GAME', share: 'チャレンジを共有', average: '平均一致率', best: 'BEST WALL', combo: '最高コンボ', complete: '5枚の壁にチャレンジ！',
};
const en = {
  tagline: 'Make the shape. Slip through. Smile.', steps: [['Look at the hole', 'Arms up? Arms out?'], ['Make that shape', 'Hold it as the wall gets closer.'], ['POP! SQUEEZE! BANG!', 'Crash? The next wall is waiting.']],
  play: 'PLAY', practice: 'Camera-free practice', howto: 'How to play', privacy: 'About the camera',
  guide: 'Place your phone upright. Keep your head, shoulders, elbows and wrists in view, with your face in the dotted guide. Match the hole. Five walls, fifteen seconds!',
  tip: 'Keep your arms inside the frame. Almost there? Squeeze through!',
  demoHint: 'Tap a pose / keys 1–5. 0 lowers your arms. Drag the elbow and wrist dots too.', cameraHint: 'Make the shape of the hole. Hold it until the wall arrives!',
  demo: 'PRACTICE · No camera', camera: 'LIVE · Upper body', canvas: 'A game wall with a pose-shaped hole approaches you',
  loading: 'Getting ready', model: 'Downloading the pose model on first use.', permission: 'Allow camera access in your browser.',
  frame: 'Put your face here', frameHint: 'Show your face and both shoulders. Leave room to raise your arms.', farther: 'Move back a little', closer: 'Move a little closer',
  ready: 'READY!', pause: 'Pause', paused: 'Take a breather', resume: 'Continue', lost: 'Show your face and shoulders', lostHint: 'The game resumes when you are back in frame.',
  error: 'Camera unavailable', errorHint: 'Check camera permission and reconnect, or try camera-free practice.', retryCamera: 'Reconnect camera',
  leftHand: '← Left arm in frame', rightHand: 'Right arm in frame →', rest: 'Arms down', selected: 'Selected', sfx: 'SFX', hold: 'HOLD IT!', squeeze: 'SQUISH!', crash: 'BANG!',
  again: 'ONE MORE!', next: 'NEXT GAME', share: 'Share challenge', average: 'Average match', best: 'BEST WALL', combo: 'Best combo', complete: 'Five walls. Your shapes!',
};
export const copy = locale => locale === 'ja' ? ja : en;
