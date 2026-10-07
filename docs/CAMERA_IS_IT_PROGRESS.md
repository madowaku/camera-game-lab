現在の10面構成と高速リトライは [Stage Pack v0.2](CAMERA_IS_IT_STAGE_PACK_V02.md) を参照。以下はv0.1時点の記録。

# EXP-043 THE CAMERA IS IT — v0.1

実装日: 2026-10-03。仕様: [Prototype Spec v0.1](specs/EXP-043_THE_CAMERA_IS_IT_SPEC_v0.1.md)。

## 起動・操作

Feed / Explore → THE CAMERA IS IT、または `#/game/outcam-the-camera-is-it`。
スマホのカメラ開始ボタンからアウトカメラと姿勢センサーを取得する。
基準の向きから小さく左右・上下に向けると、仮想視野が移動する。
左右約30度、上下約25度で必要な範囲を探索できる。向きの合わせ直しも可能。
PC・許可不可の端末ではデモを選び、ドラッグまたは矢印キーで視野だけを動かす。

キャラクターは自動歩行し、存在する着地点へ自動ジャンプする。キャラクター入力はない。
次の着地点が存在しない場合、そのまま足場端から落ちる。足場の衝突面は表示範囲と10%の
外周マージンで存在判定し、240msの消滅猶予とフェードを持つ。復帰時は衝突を即座に戻し、
描画は粒子とともに再構築する。キャラクターが外周外に1.25秒出続けると失敗。

5ステージは LOOK AHEAD / DON'T FORGET BEHIND / LOOK UP / TWO WORLDS / THE CAMERA IS IT。
各ステージ15〜30秒。CLEARからNEXT STAGE。失敗後の共通RETRYは失敗したステージから
再開し、5ステージ完了後のRETRYは最初から。共通NEXT GAME / SHARE / JA・ENに対応。
スコアは表示しない。

## 入力・ライフサイクル

- 世界は3000×1800、視野は800×1000。センサーはW3CのZ-X-Y回転からアウトカメラの
  向きと画面方向を算出する。alphaの境界と縦持ち時のEuler角問題を避ける。
- iOS等の`requestPermission()`は開始クリックの同期部分で呼ぶ。モデル・推論・追加依存なし。
- 無効な姿勢値、センサー未対応、許可拒否、6秒間データなしは説明と再試行／デモ導線を表示。
- 姿勢データが1.5秒途切れる、タブを隠す、フォーカスを失う場合はゲームを一時停止。
  再開は明示的に操作し、端末の現在の向きを基準に合わせ直す。
- 結果・ゲーム切替・離脱はRAF、入力リスナー、センサーリスナー、カメラtrackを停止する。
  離脱後に到着したカメラ許可もtrackを停止する。カメラtrackの中断は回復導線に戻る。
- 実写背景ON/OFFはゲーム中に変更可能。OFFでもセンサー操作と同じゲームルールを維持。
  映像の録画・アップロードなし。直近50回の結果は`camera-game-lab-camera-is-it-rounds`に
  保存し、source、完了ステージ、時間、各ステージ完了時の背景状態を記録する。

主なファイル: `src/games/cameraIsIt.js`（純粋な世界・衝突・進行）、`src/camera/stages.js`、
`src/input/cameraOrientation.js`、`src/camera/view.js` / `renderer.js` / `camera.css`。
Registryの入力にORIENTATIONを追加し、Feedのプレビューは軽量なSVG。

## 検証

`node --test test/cameraIsIt.test.js`で12チェック: 存在マージン、猶予と復元、viewport制限、
静止・見失いの失敗、5ステージ15〜30秒クリア、一時停止、第4ステージで単純追尾が失敗、
縦／横向きと角度境界、姿勢許可拒否、遅いカメラ許可の解放。

`npm test`: 187/187成功。`npm run build`と`git diff --check`も成功。
コミット対象だけを抽出したスナップショットでも150/150テストとビルドが成功。
Windows Chromeで360×800と1440×900を確認し、スクリーンショットを目視確認した。
実際のタッチ・キーイベントで全5ステージをクリアし、第2ステージ失敗後に第2ステージから
RETRYできることを確認。デモ18項目、合成カメラ／姿勢19項目、本番ビルド11項目が成功。
合成入力では姿勢中断、背景切替、許可拒否からデモへの復帰、結果・離脱・遅い許可時の
track解放を確認。各スクリプトの未処理page errorは0件。

ブラウザ再現:

```powershell
npm run dev -- --host 127.0.0.1
npx --yes @playwright/cli -s=camera043 open http://127.0.0.1:5173/
npx --yes @playwright/cli -s=camera043 run-code --filename=scripts/qa/camera-is-it.js
npx --yes @playwright/cli -s=camera043 run-code --filename=scripts/qa/camera-is-it-camera.js
# 本番ビルドの確認は別のセッションで行う
npm run build
npm run preview -- --host 127.0.0.1 --port 4183
npx --yes @playwright/cli -s=camera043prod open http://127.0.0.1:4183/
npx --yes @playwright/cli -s=camera043prod run-code --filename=scripts/qa/camera-is-it-production.js
```

スクリーンショットは`output/playwright/camera-is-it-*.png`（gitignore）。
ブラウザQAと合成センサーは実機・人間による体験評価の代わりにはしない。
初版はDevice Orientationのルール検証用MVPであり、AR空間固定・画像によるパン推定は行わない。

API根拠: [W3C Device Orientation and Motion](https://www.w3.org/TR/orientation-event/)、
[MDN requestPermission](https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent/requestPermission_static)。

## Human Playtest Gate — 未実施

Android Chrome 360×800、iOS SafariでHTTPSから確認する。5セッションとも結果を記録する。
各回、実写ONとOFFを同じステージで比較する。ON/OFFの順は交互にする。

| Session | 端末 / 背景順 | 先を見ると現在地を失ったか | 構図を工夫したか | Stage 004で両方映すと気づいたか | 世界を操作している感覚 | 理不尽さ / 疲労 | 判定 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 未実施 / ON→OFF | — | — | — | — | — | PENDING |
| 2 | 未実施 / OFF→ON | — | — | — | — | — | PENDING |
| 3 | 未実施 / ON→OFF | — | — | — | — | — | PENDING |
| 4 | 未実施 / OFF→ON | — | — | — | — | — | PENDING |
| 5 | 未実施 / ON→OFF | — | — | — | — | — | PENDING |

別途、ルール理解、スマホを動かす操作への反応、もう少し複雑な問題を遊びたいかを観察。
実写の体験差がなければジャイロゲームとして評価し、カメラゲームとしての成功を自動判定しない。
