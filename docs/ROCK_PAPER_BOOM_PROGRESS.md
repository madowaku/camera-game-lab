# EXP-061 ROCK PAPER BOOM! — MVP v0.1

入口: `#/game/duo-rock-paper-boom` / `#rock-paper-boom`。縦9:16、二人、
通常は約6秒でAGAINへ。元仕様は [保存した仕様書](specs/EXP-061_ROCK_PAPER_BOOM_SPEC_v0.1.md)。

## 実装

- アウトカメラを明示要求。インカメラに無言で切り替えない。映像は左右反転せず、
  全体をcontain表示する。横長映像でも二人の端が切れず、手座標も同じcontain変換を使う。
- MediaPipe GestureRecognizerのClosed_Fist / Victory / Open_Palmを使用。
  4手まで検出し、左右のHAND ZONE内で手が1つだけの場合に割り当てる。
  同じゾーンに複数の手、中央の手、未対応ジェスチャー、低信頼度は判定しない。
- 300msの窓、最低4推論・220msの期間・75%一致・信頼度0.65以上。
  最新の手も多数決と一致すること。120ms以上古い情報や150ms以上の推論間隔は無効。
  描画フレームを推論数として水増ししない。
- 3・2・1は各650ms。SHOOT時にそれまでの手履歴を破棄し、350ms以降に
  二人の手が同時に安定した場合だけ確定する。片方を先に保存しない。
  1.6秒で確定しなければSHOW YOUR HAND / もう一回。手が戻れば自動再カウント。
- 実カメラ映像を端末内Canvasに一度だけ静止し、0.5秒の予告＋無音。
  2.2秒のBOOM、0.8秒の勝敗発表、その場でAGAIN。再戦は同じstreamとPhaser Gameを使う。
- METEOR FIST / DIMENSION CUT / GIANT PALMを勝者側から発動。左右反転を含む6勝利。
  3あいこはDOUBLE K.O. / TOO SHARP!! / MAXIMUM HIGH FIVE!!。
  斬撃では実際の静止映像も斜めに二分割する。
- Imagegenの透過武器atlasと入口アート。Kenney CC0の衝撃／斬撃とWeb Audioのカウント。
  OpenTracksの既取得BGMを共通MusicBedで利用。FREEZEは無音、BGM・SE独立ミュート。
- 練習はP1 A/S/D・P2 J/K/Lまたは画面ボタン。全9通りを実際のカウントと同じ判定で遊べる。
  日英、一時停止、タブ非表示／重い処理時の停止、カメラ拒否時の再試行・練習への復帰。
  HUDボタンでCamera Input Debug HUD v0.1（両者の手・信頼度・検出数・FPS・状態）。

判定と時計は `src/rockPaperBoom/core.js`、画面座標変換は `tracking.js`、
カメラ寿命は既存BodyInputを継承した `src/input/rockPaperBoomInput.js`。
Phaser Sceneは描画だけを担当し、DOMが許可・テキスト・操作を担当する。
共通MotionDirectorの追加演出を重ねず、静→爆発の対比を専用Sceneに任せる。

素材の条件・取得元・ハッシュは [asset manifest](rock-paper-boom-assets.json)。
OpenTracksの曲・作者条件・ライセンス・サイト規約を2026-10-06に再確認。

## 検証

`npm test` 537件成功。全9勝敗、左右反転、古い手・疎な手・未知・低信頼度・
手の切り替え、SHOOT前の履歴破棄、二人同時ロック、認識失敗、休止、ゾーンの曖昧性、
横長contain座標と共通platform/musicを検証。爆発SEは描画と同じ衝突時刻に一度だけ発生。
Production build成功（共有エンジン・音楽の既存chunk-size警告あり）。

ブラウザ検証: `scripts/qa/rock-paper-boom.js`、
カメラ寿命／合成推論: `scripts/qa/rock-paper-boom-camera.js`。
スクリーンショット: `output/playwright/rock-paper-boom-*.png`。
Chromiumでは34項目成功。360×800／390×844、全9通りの実ラウンドと連続再戦、
静止映像の斜め分割、休止／再開、日英切り替え、独立SEミュート、動的reduced motion、
退出時のPhaser／カメラ／SE解放を確認。合成カメラ9項目も成功：背面指定・マイク無効、
許可拒否のモデル解放、同一streamでの再戦、片手消失のやり直し、同じゾーンの追加手、
手が戻った際の自動再カウント、退出時のtrack停止。合成カメラは認識器の出力を模擬している。

`scripts/qa/rock-paper-boom-production.js` は配布ビルドで14項目成功。
3必殺技の実ラウンド、静止時間、描画と同じ650ms／850msのIMPACTイベント、
イベントの一度だけの発生、単一Canvas再利用、入口でのモデル未起動を確認した。
`scripts/qa/rock-paper-boom-model.js` は実際のMediaPipeモデルをGPUで読み込み、
空白フレームで手を誤検出せず、推論後にモデルを解放できた。カメラは要求していない。

2026-10-07のコミット前に、他の未コミット変更を分離した内容で再検証。
最新mainとの組み合わせで `npm test` 564件とProduction buildが成功。
分離した配布ビルドでも上記Productionブラウザ検証14項目がすべて成功した。

## 実機で残る確認

Androidのアウトカメラで二人の実際の手を5〜10戦。明るさ、距離、左右の入れ替わり、
チョキの認識、同じ人の両手、認識速度とGPU負荷を確認する。
合成カメラやブラウザ練習の成功を実手の精度保証とはしない。
自然にもう一回遊びたくなるか、第三者が映像だけで勝敗を理解できるかも人で確認する。

CREATORの顔フィルター・AUTO DIRECTOR・録画保存・直接共有、ランキングや追加ゲームルールは
元仕様のMVP対象外として未実装。現在はマイク・録画・カメラ映像アップロードなし。
