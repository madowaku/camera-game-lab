# EXP-025 FALSE BRIDGE — Prototype v0.1

実装・検証日: 2026-10-03。原仕様は [Prototype Spec v0.1](specs/EXP-025_FALSE_BRIDGE_SPEC_v0.1.md)。

## 実装した体験

`/#/game/outcam-false-bridge` または `/#false-bridge`。
Feed / Explore / CAMERAフィルターからも起動できる。
既存のVite / Vanilla JS構成を維持し、Canvas 2DとDOMで実装。依存パッケージ追加なし。

1. アウトカメラを明示的に起動。音声・物体認識・MediaPipeは使わない。
2. ガイドから物を外して「背景をセット」。1秒静止して基準画像を取得。
3. 位置・距離・角度を合わせる。白点線→黄色のALMOST→緑のLOCK READY。
4. 手動LOCKで、その瞬間の映像をガイド形状に切り抜いて画面内へ固定。
5. キャラクターが移動し、次のステージへ。最後は5/5の結果・RETRY・NEXT・SHARE。

| ステージ | 形状と完成後の反応 |
| --- | --- |
| 001 FALSE BRIDGE | 横棒。小さな旅人が左から右へ渡る |
| 002 BROKEN LADDER | 縦棒。高い足場へ登る |
| 003 THE MOON | 円。空に固定され、旅人が喜ぶ |
| 004 GIANT HAT | 台形。大きな顔に帽子が重なる |
| 005 TWO PARTS | 横の橋を固定→縦の柱。両方そろってから旅人が渡る |

5問目では1枚目の切り抜きを独立したCanvasに保持するため、素材を取り除いて
2枚目用の背景を撮影しても、最初の橋は残る。
画面座標への固定であり、空間の平面・深度や実世界のアンカー追跡は行わない。

## 採点とフォールバック

推奨案C「手動LOCK＋緩い自動採点」を、背景差分で補助する。
画面と同じ中央cover cropを180×220へ縮小し、RGB差分から以下を測る。

- ガイド内部の被覆率。
- ガイド周辺1.65倍領域でのはみ出し率。
- 棒状形状の差分点の主軸とガイド角度の差。

全体の明るさ変化を補正する。暗所、広い背景変化、弱い画像根拠、低い一致度では
自動合否を強制せずLOOK GOOD?へ移り、「いい感じ！」／「合わせ直す」を選べる。
採点値は操作中に表示しない。自動採点はGOOD / GREAT / PERFECT、自己確認はYOUR FIT!。
自己確認をPERFECTと偽って記録しない。

カメラの移動は位置合わせ操作として許容するが、差分方式は撮影位置の移動に不変ではない。
そのため移動後の広い差分は自己確認へ逃がし、背景の撮り直しも常に提供する。
複雑な背景の一部の動きや低コントラスト物体に対する精度は保証しない。

## UI / 入力 / ライフサイクル

- 日本語・英語。特定の物を指定しない目標文。
- カメラモードの補助ヒントは8秒経過後に表示。月では距離による見かけの大きさを案内。
- デモは素材をタッチ／マウスで動かし、角度・サイズのスライダーで合わせる。
  キーボードはフォーカスした盤面で矢印 / Q・E / −・+ / Space。
- 360×800のLOCK、自然な縦スクロール、短い画面・横向き、44px以上の主要操作。
- reduced motionで移動・粒子・LOCKフラッシュを抑える。
- カメラ拒否から再試行／デモへ復帰可能。背面カメラのない端末はデモを使う。
- 一時停止・バックグラウンド移行でカメラtrackを停止。明示的な続行で再接続し背景を再取得。
- 結果・離脱で全trackを停止。離脱後に届いた許可も即座に停止。
- 許可待ち中にバックグラウンドへ移っても読み込み画面で固まらず、続行ボタンを表示。
- 撮影画像はメモリ内のみ。離脱時に切り抜き・基準画像・描画Canvasを消去。
  localStorageには最後の50完走の数値だけを保存し、camera / demo / selfJudgedを区別する。

## ファイル構成

| ファイル | 責務 |
| --- | --- |
| `src/games/falseBridge.js` | ステージ、キャリブレーション、LOCK、自己確認、進行、結果 |
| `src/falseBridge/shapes.js` | 5ステージと共通マスク・描画形状・cover crop |
| `src/falseBridge/scoring.js` | 画像差分、被覆、はみ出し、主軸角度、信頼性 |
| `src/falseBridge/camera.js` | 背面カメラ取得、中断、遅延許可のキャンセル、解放 |
| `src/falseBridge/renderer.js` | 浮島、旅人、ガイド、デモ素材、独立した切り抜きの描画 |
| `src/falseBridge/view.js`, `messages.js`, `falseBridge.css` | DOM UI、JA/EN、入力とCanvas統合 |
| `src/platform/experiments.js`, `preview.js`, `copy.js`, `shell.js` | 遅延登録、プレビュー、CAMERAラベル、ゲーム別の起動・プライバシー説明 |
| `test/falseBridge.test.js` | 12件の画像・進行・取得／解放テスト |
| `scripts/qa/false-bridge*.js` | 開発版デモ、合成カメラ、本番版ブラウザーQA |

## 検証結果

- `npm test`: **187 / 187成功**（このEXPの追加12件を含む）。
- コミット対象を切り出した状態でも **150 / 150成功**。他の未コミット実験を含めず、ビルドも成功。
- `npm run build`: 成功。ゲームは動的importの別chunk。モデル・画像アセットの追加取得なし。
- `git diff --check`: 成功。既存のWindows行末変換警告のみ。
- デモQA: **78項目成功**。360×800 / 720×1280 / 1440×900で全5問、6つのLOCK、
  360幅のtouch入力、JA/EN、採点困難時のretry、RETRY、SHARE、pause/resume、カメラ要求ゼロ。
- 合成カメラQA: **35項目成功**。実際のCanvas MediaStreamをvideoへ入れ、1280×720のcover crop、
  1秒の基準取得、全5問、暗所自己確認、背景変更後も切り抜き画素が不変、2つ目の撮影後も
  1枚目が不変、結果と離脱でtrack解放、遅い許可、許可待ち中の中断と復帰。
- 本番版QA: **24項目成功**。360×500 / 800×360 / 360×800、自己確認ボタンの到達性、
  6パーツすべての自己確認完走、reduced motion、NEXT、カメラ要求ゼロ。
- いずれも未処理のpage errorなし。カメラQAの画素読み戻しに対するChromeの性能警告は
  テストが描画Canvasを繰り返し読むため。通常の採点Canvasは `willReadFrequently` を指定。
- 代表画像を目視確認。証跡は `output/playwright/false-bridge-*.png`（gitignore対象）。

再現（専用の破棄可能なブラウザープロフィールで実行）：

```powershell
npm run dev -- --host 127.0.0.1
npx --yes @playwright/cli -s=false-bridge open http://127.0.0.1:5173/#/game/outcam-false-bridge
npx --yes @playwright/cli -s=false-bridge run-code --filename=scripts/qa/false-bridge.js
npx --yes @playwright/cli -s=false-bridge run-code --filename=scripts/qa/false-bridge-camera.js

npm run build
npm run preview -- --host 127.0.0.1 --port 4173
npx --yes @playwright/cli -s=false-bridge-production open http://127.0.0.1:4173/#/game/outcam-false-bridge
npx --yes @playwright/cli -s=false-bridge-production run-code --filename=scripts/qa/false-bridge-production.js
```

dev / previewサーバーとQAコマンドは別ターミナルで実行する。

## 未完了の受け入れゲート

TASK-001〜013は実装済み。TASK-014は360×800のブラウザー確認までで、実機は未検証。
TASK-015は **0 / 5セッション、未実施**。
[Human Playtest記録表](FALSE_BRIDGE_PLAYTEST.md)を用意した。

物理スマホのSafari / Chrome、背面カメラの画角と左右、実物の輪郭・低照度・手ぶれ、
操作の楽しさ、発見、別解を試したくなるかは自動テストの成功から判断できない。
現時点では「プレイ可能なプロトタイプ」であり、EXPの面白さを検証済みとはしない。
本番サービスへのデプロイは行っていない。
