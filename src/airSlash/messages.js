const ja = {
  tagline: 'その手で、空気を斬れ。', sub: 'シュッと振れば、手が刀に。15秒のフルーツ勝負。',
  steps: [['手を見せる', 'カメラに上半身と両手を入れよう。'], ['シュッと斬る', '速く振ってフルーツをスパッ！ 手の形は自由。'], ['爆弾はスルー', '斬ると −300点。両手を交差すると X-SLASH！']],
  practice: 'カメラなしで練習', howto: '遊び方', privacy: 'カメラと動画について', camera: 'LIVE CAMERA', demo: 'PRACTICE',
  cameraHint: '手の形は自由。フルーツを横切るように、素早く手を振ろう。', demoHint: 'ドラッグ／2本指で斬る。矢印キーは右手、W A S D は左手、X は両手。',
  show: '手をカメラに見せてね', ready: 'GET READY', loading: '手の認識を準備しています…', requesting: 'カメラの使用を許可してください。',
  error: 'カメラを使えません。アクセス許可や他のアプリを確認してください。カメラなしでも遊べます。', modelError: '認識の準備に失敗しました。通信を確認して再試行するか、練習モードで遊べます。',
  lost: '手をもう一度見せてね。認識が安定すると自動で再開します。', paused: '一時停止中。準備ができたら再開しよう。', pause: '一時停止', resume: '再開', retryCamera: 'カメラを再試行', exit: 'ゲームを戻る',
  soundOn: 'SE ON', soundOff: 'SE OFF', again: 'RETRY', next: 'NEXT', share: 'スコアをシェア', fruit: '斬ったフルーツ', combo: '最大コンボ', bombs: '爆弾',
  faceChoice: '動画での自分の映り方', original: 'そのまま', effect: '忍者エフェクト', hide: 'カメラ映像なし',
  creatorNotice: '撮れ高の最高の7秒を端末内に保存。保存するまでは端末メモリだけに残ります。',
  replay: 'もう一度見る', encode: '動画を作成', save: '動画を保存', videoShare: '動画をシェア', generating: '動画を作成中', clipUnsupported: 'このブラウザでは動画を作成できません。リプレイは再生できます。', clipFailed: '動画を作成できませんでした。再試行してください。', clipNotice: '7秒の動画は音声なし。カメラ映像の外部送信はありません。', clipReady: '動画の準備ができました。',
};
const en = {
  tagline: 'Your hands. Your blades.', sub: 'A quick wave. A clean cut. A 15-second fruit rush.',
  steps: [['Show your hands', 'Keep your upper body and both hands in view.'], ['Make a quick slash', 'Sweep through the fruit. Any hand shape works.'], ['Let the bombs fly', 'Bombs cost 300 points. Cross both blades for X-SLASH!']],
  practice: 'Camera-free practice', howto: 'How to play', privacy: 'Camera & clips', camera: 'LIVE CAMERA', demo: 'PRACTICE',
  cameraHint: 'Any hand shape. Sweep quickly through the fruit.', demoHint: 'Drag / use two fingers. Arrows: right blade. W A S D: left blade. X: both.',
  show: 'Show a hand to the camera', ready: 'GET READY', loading: 'Preparing hand tracking…', requesting: 'Allow camera access to play.',
  error: 'Camera unavailable. Check access or other apps, or play camera-free.', modelError: 'Tracking could not load. Check your connection, retry or play camera-free.',
  lost: 'Show your hands again. Play resumes when tracking is stable.', paused: 'Paused. Resume when you are ready.', pause: 'Pause', resume: 'Resume', retryCamera: 'Retry camera', exit: 'Back to game',
  soundOn: 'SE ON', soundOff: 'SE OFF', again: 'RETRY', next: 'NEXT', share: 'Share score', fruit: 'Fruit sliced', combo: 'Best combo', bombs: 'Bombs',
  faceChoice: 'How you appear in your clip', original: 'Live camera', effect: 'Ninja effect', hide: 'No camera image', creatorNotice: 'Your best seven seconds stay in device memory until you choose to save.',
  replay: 'Replay', encode: 'Make video', save: 'Save video', videoShare: 'Share video', generating: 'Creating video', clipUnsupported: 'Video creation is unavailable in this browser. Replay still works.', clipFailed: 'Could not create the clip. Try again.', clipNotice: 'Seven-second silent clip. Camera footage is never uploaded.', clipReady: 'Your clip is ready.',
};
export const copy = locale => locale === 'ja' ? ja : en;
