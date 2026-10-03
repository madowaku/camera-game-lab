# EXP-044 SOFT SERVE — playable v0.1

仕様: [EXP-044 Specification v0.1](specs/EXP-044_SOFT_SERVE_SPEC_v0.1.md)

`#/game/solo-soft-serve` / `#soft-serve`。Feed / Explore へ登録し、独立した
lazy module として起動。インカメラの片手でコーンを動かし、左右へ巻く。
好きな高さで横へ離すとノズルが止まり、口を開けて先端に近づくとひと口減る。
一度離す、または口を閉じてから再び接触すると次のひと口になる。

## 初見の導線

- 起動前: ソフトクリームの図と「左右に巻く → 好きな高さまで → 横へ離して食べる」。
  360×800、390×844では開始ボタンまで一画面内。長い画面や短い画面でもスクロール可能。
- READY: 片手を映し、ノズル下で0.9秒保持すると自動開始。
- SERVE: 左右の点線を目安に巻く。高いほどガイドが狭くなる。
  3巻き以降は「もう一巻き、いける？」と任意の終了方法を提示。
- EAT: 先端の接触円と実際の口の位置を表示。持続接触では連続して食べない。
- RESULT: CLEAN / SPLAT / MELTED、得点内訳、最大高さ、食べた割合。
  共通の RETRY / NEXT GAME / SHARE RESULT。カメラと練習の出自を維持。

## 実装

- `src/games/softServe.js`: DOM非依存の形成・安定・溶解・接触・得点ルール。
  1巻きあたり約14節を記録し、各段の幅と中心を描画へ反映。
  真下で停止すると細い塔になり、左右に穏やかに巻くと安定した形になる。
- `src/input/softServeInput.js`: 既存 BodyInput のカメラ所有権、開始キャンセル、GPU→CPU
  fallback と teardown を再利用。Hand Landmarker / Face Landmarker を同じ映像へ適用。
  二つの同期推論を最大20Hzに制限。手の中心は wrist / index_mcp / middle_mcp。
  口の開きは内側唇の距離÷口幅、映像比率補正と開閉ヒステリシスを使用。
- 位置投影は既存 `projectMouth`。鏡像かつ `object-fit:cover` の映像へ一致。
  コーンは画面端で切れない範囲へ制限。手の回転や深度は使わない。
- `src/softServe/`: Canvas 2.5D玩具表現、JA / EN、音のON / OFF、一時停止、練習操作。
  音はWeb Audioで生成し、ゲーム開始時のユーザー操作から有効化。外部音声素材なし。
- スコア: 食べた割合に応じた基本量×最大高さ倍率、成功時だけBEAUTY / CLEAN / PERFECT。
  3 / 5 / 7 / 9 / 10巻きで ×1 / 1.5 / 2 / 3 / 5。
- 調整用定数は `SOFT_SERVE_RULES`。巻くフェーズは最大20秒、ラウンドは最大39秒の
  active time。任意に早く終了可能。追跡喪失、手動pause、非表示・focus喪失中は時間停止。
  再追跡は0.45秒保持し、復帰時の位置移動で倒壊ペナルティを発生させない。
- カメラは明示操作まで開始しない。マイク不要。終了・離脱・遅い許可応答でtrackと両モデルを
  解放する。保存は `camera-game-lab-soft-serve-rounds` に最新50件の数値のみ。画像保存なし。
- 練習: マウス／ドラッグ／矢印キーで移動、横へ離すかボタンでEATへ。
  EAT中はクリック／タップ／Space／ひと口ボタン。ドラッグは食べるクリックと区別。

API参照: [MediaPipe Hand Landmarker Web](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js)、
[Face Landmarker Web](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js)。
追加の依存パッケージやプラグイン接続は不要。frontend-design / hiro-frontend-qa / playwright skillsを使用。

## 検証

- `npm test`: 201 / 201。SOFT SERVE追加14件は巻きと停止の差、左右への終了判定、追跡回復、
  開いた口と接触の両条件、持続接触抑制、得点、倒壊、溶解、デモの入力境界と投影を検証。
- `npm run build`: Vite / PWAビルド成功。ゲームはlazy chunk、モデルとカメラはプレビューで起動しない。
- `scripts/qa/soft-serve.js`: Chromeブラウザー27項目。390×844 / 360×800 / 1440×900、
  360×500のスクロール、JA / EN、Canvas画素、マウスの巻き、タッチ、keyboard、EAT、
  CLEAN、結果、RETRY、focus回復、カメラ未起動。
  Vite devとproduction preview (`127.0.0.1:4173`) の両方で成功。
- `scripts/qa/soft-serve-camera.js`: 合成landmark21項目。
  同一stream、二モデル、GPU部分失敗のcleanup、手・顔の喪失と復帰、二人の顔の拒否、
  口接触、食べきり、result / retry / exit cleanup、遅い許可の解放、permission拒否から練習へ。
  browser-owned MediaStreamTrackを使うが、映像デコードと推論は合成。実カメラ品質の証明ではない。
- スクリーンショット: `output/playwright/soft-serve-*.png`（gitignore対象）。

```powershell
npx --yes @playwright/cli -s=soft-serve open http://127.0.0.1:5173/#/game/solo-soft-serve
npx --yes @playwright/cli -s=soft-serve run-code --filename=scripts/qa/soft-serve.js
npx --yes @playwright/cli -s=soft-serve run-code --filename=scripts/qa/soft-serve-camera.js
```

## 実機・人による検証（未実施）

スマホを固定し、顔と片手が映る位置で5回程度プレイ。
Android Chrome / iOS Safariのfront camera、モデル初回load、低照度、入力遅延、口の個人差、
実際のsafe-area、Web Audioを確認する。実推論の処理速度と熱負荷は未計測。

各回で以下を記録する。3つ以上の発生で有望という仕様のEXP条件を、人の観察から判定する。
成功する合成入力やCLEAN数だけからGO判定しない。

| 回 | 何巻きで終了 | 自分からもう一巻き | 説明なしで巻く | 倒れてもう一回 | 自然に顔を動かす | 動きが見ていて面白い | メモ |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | | | | | | | |
| 2 | | | | | | | |
| 3 | | | | | | | |
| 4 | | | | | | | |
| 5 | | | | | | | |

最重要: 3巻きで安全に終えられるとわかった上で、自分から欲張るか。
本番へのデプロイはこの変更では実施していない。
